from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models.agriculture import DiseaseDetection, InsightFeed
from app.core.cache import cache_with_ttl
from app.services.disease_trend_service import DiseaseTrendService

class DashboardService:
    @staticmethod
    @cache_with_ttl(ttl_seconds=300, key_prefix="dash:overview")
    async def get_overview(db: AsyncSession, user_id: str = None) -> Dict[str, Any]:
        now = datetime.utcnow()
        one_week_ago = now - timedelta(days=7)
        two_weeks_ago = one_week_ago - timedelta(days=7)

        def _user_filter(query):
            """Apply user_id filter if provided."""
            if user_id:
                return query.where(DiseaseDetection.user_id == user_id)
            return query

        # Scans Current Week
        curr_scans_q = _user_filter(
            select(func.count(DiseaseDetection.id)).where(DiseaseDetection.created_at >= one_week_ago)
        )
        curr_scans = (await db.execute(curr_scans_q)).scalar() or 0

        # Scans Prev Week
        prev_scans_q = _user_filter(
            select(func.count(DiseaseDetection.id)).where((DiseaseDetection.created_at >= two_weeks_ago) & (DiseaseDetection.created_at < one_week_ago))
        )
        prev_scans = (await db.execute(prev_scans_q)).scalar() or 0
        
        # High Risk Current
        curr_high_q = _user_filter(
            select(func.count(DiseaseDetection.id)).where((DiseaseDetection.created_at >= one_week_ago) & (DiseaseDetection.severity == "High"))
        )
        curr_high = (await db.execute(curr_high_q)).scalar() or 0

        # High Risk Prev
        prev_high_q = _user_filter(
            select(func.count(DiseaseDetection.id)).where((DiseaseDetection.created_at >= two_weeks_ago) & (DiseaseDetection.created_at < one_week_ago) & (DiseaseDetection.severity == "High"))
        )
        prev_high = (await db.execute(prev_high_q)).scalar() or 0

        # Conf Current
        curr_conf_q = _user_filter(
            select(func.avg(DiseaseDetection.confidence)).where(DiseaseDetection.created_at >= one_week_ago)
        )
        curr_conf = (await db.execute(curr_conf_q)).scalar() or 0.0

        # Conf Prev
        prev_conf_q = _user_filter(
            select(func.avg(DiseaseDetection.confidence)).where((DiseaseDetection.created_at >= two_weeks_ago) & (DiseaseDetection.created_at < one_week_ago))
        )
        prev_conf = (await db.execute(prev_conf_q)).scalar() or 0.0

        # Total values (filtered by user)
        total_scans_query = _user_filter(select(func.count(DiseaseDetection.id)))
        total_scans = (await db.execute(total_scans_query)).scalar() or 0

        high_risk_query = _user_filter(
            select(func.count(DiseaseDetection.id)).where(DiseaseDetection.severity == "High")
        )
        high_risk = (await db.execute(high_risk_query)).scalar() or 0

        avg_conf_query = _user_filter(select(func.avg(DiseaseDetection.confidence)))
        avg_conf = (await db.execute(avg_conf_query)).scalar() or 0.0

        # Fallback to avoid division by zero
        def get_trend(curr, prev):
            if prev == 0 and curr > 0: return "+100%"
            if prev == 0 and curr == 0: return "0%"
            diff = ((curr - prev) / prev) * 100
            sign = "+" if diff > 0 else ""
            return f"{sign}{round(diff, 1)}%"

        # Reports (Using InsightFeed as a proxy — InsightFeed is not user-scoped, so keep global)
        curr_reports_q = select(func.count(InsightFeed.id)).where(InsightFeed.created_at >= one_week_ago)
        curr_reports = (await db.execute(curr_reports_q)).scalar() or 0

        prev_reports_q = select(func.count(InsightFeed.id)).where((InsightFeed.created_at >= two_weeks_ago) & (InsightFeed.created_at < one_week_ago))
        prev_reports = (await db.execute(prev_reports_q)).scalar() or 0

        total_reports_q = select(func.count(InsightFeed.id))
        total_reports = (await db.execute(total_reports_q)).scalar() or 0

        return {
            "total_scans_analyzed": total_scans,
            "average_confidence": round(avg_conf * 100) if avg_conf else 0,
            "high_risk_detections": high_risk,
            "reports_generated": total_reports,
            "total_scans_trend": get_trend(curr_scans, prev_scans),
            "confidence_trend": get_trend(curr_conf * 100, prev_conf * 100),
            "high_risk_trend": get_trend(curr_high, prev_high),
            "reports_trend": get_trend(curr_reports, prev_reports)
        }

    @staticmethod
    @cache_with_ttl(ttl_seconds=300, key_prefix="dash:trends")
    async def get_disease_trends(db: AsyncSession, user_id: str = None) -> List[Dict[str, Any]]:
        return await DiseaseTrendService.get_disease_trends(db, user_id)

    @staticmethod
    async def get_recent_activity(db: AsyncSession, user_id: str = None, limit: int = 4) -> List[Dict[str, Any]]:
        query = select(DiseaseDetection).order_by(desc(DiseaseDetection.created_at)).limit(limit)
        if user_id:
            query = query.where(DiseaseDetection.user_id == user_id)

        result = await db.execute(query)
        detections = result.scalars().all()
        
        return [
            {
                "id": det.id,
                "time": "Just now", # You'd normally format a relative time string here
                "title": f"Scan Analyzed: {det.detected_disease or 'Unknown'}",
                "desc": f"Confidence: {round(det.confidence or 0, 1)}%. District: {det.district or 'N/A'}",
                "type": "scan" if det.severity != "High" else "anomaly"
            }
            for det in detections
        ]

    @staticmethod
    @cache_with_ttl(ttl_seconds=300, key_prefix="dash:heatmap")
    async def get_heatmap_data(db: AsyncSession, user_id: str = None) -> List[Dict[str, Any]]:
        query = select(DiseaseDetection).where(
            DiseaseDetection.scan_latitude.is_not(None),
            DiseaseDetection.scan_longitude.is_not(None)
        ).limit(1000)
        if user_id:
            query = query.where(DiseaseDetection.user_id == user_id)
        
        result = await db.execute(query)
        detections = result.scalars().all()
        
        return [
            {
                "id": det.id,
                "lat": det.scan_latitude,
                "lng": det.scan_longitude,
                "severity": det.severity.lower() if det.severity else 'low',
                "type": det.detected_disease or 'unknown',
                "confidence": float(det.confidence or 0.0)
            }
            for det in detections
        ]

    @staticmethod
    @cache_with_ttl(ttl_seconds=300, key_prefix="dash:top_diseases")
    async def get_top_diseases(db: AsyncSession, user_id: str = None) -> List[Dict[str, Any]]:
        query = (
            select(
                DiseaseDetection.detected_disease,
                func.count(DiseaseDetection.id).label("count")
            )
            .where(DiseaseDetection.detected_disease.is_not(None))
            .group_by(DiseaseDetection.detected_disease)
            .order_by(desc("count"))
            .limit(4)
        )
        if user_id:
            query = query.where(DiseaseDetection.user_id == user_id)

        result = await db.execute(query)
        top = result.all()
        
        return [
            {"name": row.detected_disease or "Unknown", "value": row.count}
            for row in top
        ]

    @staticmethod
    async def get_scan_insights(db: AsyncSession, user_id: str = None) -> List[Dict[str, Any]]:
        def _user_filter(query):
            if user_id:
                return query.where(DiseaseDetection.user_id == user_id)
            return query

        # Avg Confidence
        avg_conf_query = _user_filter(select(func.avg(DiseaseDetection.confidence)))
        avg_conf = (await db.execute(avg_conf_query)).scalar() or 0.0

        # Most Affected Disease
        disease_query = _user_filter(
            select(DiseaseDetection.detected_disease, func.count(DiseaseDetection.id).label("c"))
            .where(DiseaseDetection.detected_disease.is_not(None))
            .group_by(DiseaseDetection.detected_disease)
            .order_by(desc("c"))
            .limit(1)
        )
        top_disease = (await db.execute(disease_query)).first()
        most_affected = top_disease[0] if top_disease else "Unknown"

        # High Risk District
        district_query = _user_filter(
            select(DiseaseDetection.district, func.count(DiseaseDetection.id).label("c"))
            .where(DiseaseDetection.district.is_not(None), DiseaseDetection.severity == "High")
            .group_by(DiseaseDetection.district)
            .order_by(desc("c"))
            .limit(1)
        )
        top_district = (await db.execute(district_query)).first()
        high_risk_district = top_district[0] if top_district else "Unknown"

        return [
            {"label": "Average Confidence", "value": f"{round(avg_conf * 100)}%", "type": "severity"},
            {"label": "Most Affected Crop/Disease", "value": most_affected, "type": "crop"},
            {"label": "High Risk District", "value": high_risk_district, "type": "location"},
            {"label": "System Status", "value": "Live Syncing", "type": "time"},
        ]

    @staticmethod
    async def get_insight_feed(db: AsyncSession, limit: int = 4) -> List[Dict[str, Any]]:
        query = select(InsightFeed).order_by(desc(InsightFeed.created_at)).limit(limit)
        result = await db.execute(query)
        feeds = result.scalars().all()
        
        return [
            {
                "tag": feed.category or "SYSTEM",
                "time": "Recent",
                "title": feed.title,
                "desc": feed.description or "",
                "severity": feed.severity_color or "info"
            }
            for feed in feeds
        ]

    @staticmethod
    @cache_with_ttl(ttl_seconds=300, key_prefix="dash:predictions")
    async def get_predictions(db: AsyncSession, user_id: str = None) -> List[Dict[str, Any]]:
        return await DiseaseTrendService.get_predictions(db, user_id)
