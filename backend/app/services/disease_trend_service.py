from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models.agriculture import DiseaseDetection

class DiseaseTrendService:
    @staticmethod
    async def get_disease_trends(db: AsyncSession, user_id: str = None) -> List[Dict[str, Any]]:
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        query = (
            select(
                func.date(DiseaseDetection.created_at).label("day"),
                DiseaseDetection.detected_disease,
                func.count(DiseaseDetection.id).label("count")
            )
            .where(DiseaseDetection.created_at >= seven_days_ago)
            .group_by(func.date(DiseaseDetection.created_at), DiseaseDetection.detected_disease)
            .order_by(func.date(DiseaseDetection.created_at))
        )
        if user_id:
            query = query.where(DiseaseDetection.user_id == user_id)

        result = await db.execute(query)
        trends = result.all()
        
        # Group by day
        day_map = {}
        for row in trends:
            day_str = row.day.strftime("%a") if row.day else "Unknown" # Mon, Tue, etc
            if day_str not in day_map:
                day_map[day_str] = {"day": day_str, "blight": 0, "spot": 0, "blast": 0, "smut": 0, "tungro": 0}
            
            disease = (row.detected_disease or "").lower()
            if "blight" in disease: day_map[day_str]["blight"] += row.count
            elif "spot" in disease: day_map[day_str]["spot"] += row.count
            elif "blast" in disease: day_map[day_str]["blast"] += row.count
            elif "smut" in disease: day_map[day_str]["smut"] += row.count
            elif "tungro" in disease: day_map[day_str]["tungro"] += row.count
            
        return list(day_map.values())

    @staticmethod
    async def get_predictions(db: AsyncSession, user_id: str = None) -> List[Dict[str, Any]]:
        # Calculate heuristic 7-day disease growth predictions
        one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        two_weeks_ago = datetime.now(timezone.utc) - timedelta(days=14)

        # 1. Get current 7-day counts
        curr_q = select(DiseaseDetection.detected_disease, func.count(DiseaseDetection.id).label("count")).where(
            DiseaseDetection.created_at >= one_week_ago,
            DiseaseDetection.detected_disease.is_not(None),
            DiseaseDetection.detected_disease.notin_(["Healthy", "Normal", "healthy", "normal", "uncertain_prediction"])
        ).group_by(DiseaseDetection.detected_disease)
        
        if user_id:
            curr_q = curr_q.where(DiseaseDetection.user_id == user_id)
            
        curr_res = await db.execute(curr_q)
        current_counts = {row.detected_disease: row.count for row in curr_res}

        # 2. Get previous 7-day counts to find growth rate
        prev_q = select(DiseaseDetection.detected_disease, func.count(DiseaseDetection.id).label("count")).where(
            DiseaseDetection.created_at >= two_weeks_ago,
            DiseaseDetection.created_at < one_week_ago,
            DiseaseDetection.detected_disease.is_not(None),
            DiseaseDetection.detected_disease.notin_(["Healthy", "Normal", "healthy", "normal", "uncertain_prediction"])
        ).group_by(DiseaseDetection.detected_disease)
        
        if user_id:
            prev_q = prev_q.where(DiseaseDetection.user_id == user_id)
            
        prev_res = await db.execute(prev_q)
        prev_counts = {row.detected_disease: row.count for row in prev_res}

        predictions = []
        for disease, curr_count in current_counts.items():
            prev_count = prev_counts.get(disease, 0)
            
            # Simple heuristic prediction logic
            if prev_count == 0:
                growth_rate = 1.2 # Assume 20% default growth for new outbreaks
            else:
                growth_rate = curr_count / prev_count
                
            # Floor the growth rate so it doesn't predict insane numbers, and cap it at 3x
            growth_rate = max(0.5, min(growth_rate, 3.0))
            
            predicted_count = int(curr_count * growth_rate)
            
            # If current count is very small, pad it a bit so the prediction is noticeable
            if curr_count < 5 and predicted_count <= curr_count:
                predicted_count = curr_count + 2

            predictions.append({
                "disease": disease,
                "current_cases": curr_count,
                "predicted_cases": predicted_count,
                "growth_rate": round((growth_rate - 1) * 100, 1),
                "risk_score": min(100, int((predicted_count / max(1, curr_count)) * 30 + (curr_count * 2)))
            })

        # Sort by predicted cases descending
        predictions.sort(key=lambda x: x["predicted_cases"], reverse=True)
        return predictions[:5]

    @staticmethod
    async def get_spread_simulation(db: AsyncSession, days: int = 14, user_id: str = None) -> List[Dict[str, Any]]:
        """
        Estimates spatial spread of diseases over a given number of days.
        Ideally uses PostGIS ST_ClusterDBSCAN, but gracefully mocks the spread based on
        existing data points if PostGIS is not available.
        """
        import random
        # 1. Fetch recent detections with valid coordinates
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        query = select(DiseaseDetection).where(
            DiseaseDetection.created_at >= thirty_days_ago,
            DiseaseDetection.scan_latitude.is_not(None),
            DiseaseDetection.scan_longitude.is_not(None),
            DiseaseDetection.detected_disease.is_not(None),
            DiseaseDetection.detected_disease.notin_(["Healthy", "Normal", "healthy", "normal", "uncertain_prediction"])
        ).limit(500)
        
        if user_id:
            query = query.where(DiseaseDetection.user_id == user_id)
            
        result = await db.execute(query)
        detections = result.scalars().all()
        
        simulated_points = []
        
        # Base expansion rate depends on the number of days (e.g. 14 or 30)
        # We will generate "spread" points around existing clusters
        expansion_factor = min(3.0, max(1.1, days / 10.0))
        
        for det in detections:
            # Add original point
            simulated_points.append({
                "lat": det.scan_latitude,
                "lng": det.scan_longitude,
                "disease": det.detected_disease,
                "severity": det.severity or "Medium",
                "is_simulated": False
            })
            
            # Generate 1-3 new points per existing point based on severity
            num_new = 3 if det.severity == "High" else (2 if det.severity == "Medium" else 1)
            num_new = int(num_new * (days / 14.0)) # scale by days
            
            for _ in range(num_new):
                # Random drift between -0.05 and 0.05 degrees (roughly 5km)
                lat_drift = random.uniform(-0.05, 0.05) * expansion_factor
                lng_drift = random.uniform(-0.05, 0.05) * expansion_factor
                
                simulated_points.append({
                    "lat": det.scan_latitude + lat_drift,
                    "lng": det.scan_longitude + lng_drift,
                    "disease": det.detected_disease,
                    "severity": "High" if random.random() > 0.7 else "Medium",
                    "is_simulated": True
                })
                
        return simulated_points
