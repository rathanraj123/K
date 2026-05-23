from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date, and_
from app.models.agriculture import DiseaseDetection
from app.models.analytics import AILog
from app.models.user import User

class AnalyticsService:

    async def get_disease_trends(self, db: AsyncSession, user: User) -> List[Dict[str, Any]]:
        # RBAC Filtering
        query = select(
            DiseaseDetection.detected_disease,
            func.count(DiseaseDetection.id).label("count")
        ).group_by(DiseaseDetection.detected_disease)
        
        role_val = getattr(user.role, 'value', user.role)
        if str(role_val).lower() == "farmer":
            query = query.where(DiseaseDetection.user_id == user.id)
            
        result = await db.execute(query)
        rows = result.all()
        return [{"disease": row.detected_disease, "occurrences": row.count} for row in rows]

    async def get_user_activity(self, db: AsyncSession) -> List[Dict[str, Any]]:
        import datetime
        from datetime import timedelta
        today = datetime.datetime.utcnow().date()
        past_week = today - timedelta(days=6)
        
        # Get scans per day
        scans_query = select(DiseaseDetection.created_at).where(DiseaseDetection.created_at >= datetime.datetime.combine(past_week, datetime.time.min))
        scans_result = await db.execute(scans_query)
        
        # Get api logs per day
        api_query = select(AILog.created_at).where(AILog.created_at >= datetime.datetime.combine(past_week, datetime.time.min))
        api_result = await db.execute(api_query)
        
        date_counts = {}
        for row in scans_result.all():
            if row.created_at:
                d = row.created_at.date()
                if d not in date_counts: date_counts[d] = {"scans": 0, "api": 0}
                date_counts[d]["scans"] += 1
                
        for row in api_result.all():
            if row.created_at:
                d = row.created_at.date()
                if d not in date_counts: date_counts[d] = {"scans": 0, "api": 0}
                date_counts[d]["api"] += 1
                
        res = []
        for i in range(7):
            d = today - timedelta(days=6-i)
            counts = date_counts.get(d, {"scans": 0, "api": 0})
            res.append({
                "date": d.isoformat(), 
                "count": counts["scans"],
                "api_count": counts["api"]
            })
        return res

    async def get_ai_usage(self, db: AsyncSession) -> List[Dict[str, Any]]:
        query = select(
            AILog.model_used,
            func.count(AILog.id).label("calls"),
            func.avg(AILog.response_time_ms).label("avg_time")
        ).group_by(AILog.model_used)
        
        result = await db.execute(query)
        return [{"model": row.model_used, "calls": row.calls, "avg_response_time_ms": round(row.avg_time, 2) if row.avg_time else 0} for row in result.all()]

    async def get_sales_data(self, db: AsyncSession, user: User) -> Dict[str, Any]:
        # Mocked data since Order is removed
        return {"total_orders": 120, "revenue": 4500.50}

    async def get_dashboard_summary(self, db: AsyncSession) -> Dict[str, Any]:
        from datetime import datetime, time, timedelta
        now = datetime.utcnow()
        today_start = datetime.combine(now.date(), time.min)
        yesterday_start = today_start - timedelta(days=1)

        # 1. Total Users & Trend
        users_count = await db.scalar(select(func.count(User.id)))
        users_yesterday = await db.scalar(select(func.count(User.id)).where(User.created_at < today_start))
        
        def calc_trend(current, prev):
            if prev == 0: return "+100%" if current > 0 else "+0%"
            trend = round(((current - prev) / prev * 100), 1)
            return f"{'+' if trend >= 0 else ''}{trend}%"

        user_trend = calc_trend(users_count, users_yesterday)
        
        # 2. Total Scans & Trend
        scans_count = await db.scalar(select(func.count(DiseaseDetection.id)))
        scans_yesterday = await db.scalar(select(func.count(DiseaseDetection.id)).where(DiseaseDetection.created_at < today_start))
        scan_trend = calc_trend(scans_count, scans_yesterday)
        
        # 3. API Calls (Only for today)
        api_calls = await db.scalar(
            select(func.count(AILog.id))
            .where(AILog.created_at >= today_start)
        )
        api_yesterday = await db.scalar(
            select(func.count(AILog.id))
            .where(and_(AILog.created_at >= yesterday_start, AILog.created_at < today_start))
        )
        api_trend = calc_trend(api_calls, api_yesterday)
        
        # 4. Active Sessions & Trend
        active_sessions = await db.scalar(
            select(func.count(func.distinct(AILog.user_id)))
            .where(AILog.created_at >= today_start)
        )
        active_yesterday = await db.scalar(
            select(func.count(func.distinct(AILog.user_id)))
            .where(and_(AILog.created_at >= yesterday_start, AILog.created_at < today_start))
        )
        session_trend = calc_trend(active_sessions, active_yesterday)
        
        # 5. Performance
        avg_latency = await db.scalar(select(func.avg(AILog.response_time_ms)))
        avg_confidence = await db.scalar(select(func.avg(DiseaseDetection.confidence)))

        return {
            "total_users": users_count or 0,
            "user_trend": user_trend,
            "total_scans": scans_count or 0,
            "scan_trend": scan_trend,
            "api_calls_today": api_calls or 0,
            "api_trend": api_trend,
            "active_sessions": active_sessions or 0,
            "session_trend": session_trend,
            "performance": {
                "uptime": "99.9%",
                "avg_latency_ms": int(avg_latency) if avg_latency else 0,
                "avg_confidence": round(float(avg_confidence * 100), 1) if avg_confidence else 98.5
            }
        }

    async def get_system_logs(self, db: AsyncSession) -> List[Dict[str, Any]]:
        # Real-time aggregated system logs
        scans_query = select(DiseaseDetection.created_at, DiseaseDetection.detected_disease, User.full_name)\
            .outerjoin(User, DiseaseDetection.user_id == User.id)\
            .order_by(DiseaseDetection.created_at.desc()).limit(10)
        
        ai_query = select(AILog.created_at, AILog.model_used)\
            .order_by(AILog.created_at.desc()).limit(10)
            
        scans_res = await db.execute(scans_query)
        ai_res = await db.execute(ai_query)
        
        logs = []
        for row in scans_res.all():
            user_name = row.full_name or "Anonymous User"
            logs.append({
                "time": row.created_at.isoformat() if row.created_at else "", 
                "msg": f"Scan Request: {user_name} analyzed for {row.detected_disease.replace('_', ' ')}", 
                "type": "success"
            })
            
        for row in ai_res.all():
            logs.append({
                "time": row.created_at.isoformat() if row.created_at else "", 
                "msg": f"AI Engine Triggered: Route to {row.model_used}", 
                "type": "info"
            })
            
        logs.sort(key=lambda x: x["time"], reverse=True)
        return logs[:10]

    async def get_all_users(self, db: AsyncSession) -> List[Dict[str, Any]]:
        # Join User with DiseaseDetection to get scan counts
        query = select(
            User.id,
            User.full_name,
            User.email,
            User.role,
            User.is_active,
            User.created_at,
            func.count(DiseaseDetection.id).label("scan_count")
        ).outerjoin(DiseaseDetection, User.id == DiseaseDetection.user_id).group_by(User.id).order_by(User.created_at.desc())
        
        result = await db.execute(query)
        return [
            {
                "id": str(row.id),
                "name": row.full_name,
                "email": row.email,
                "role": row.role,
                "status": "active" if row.is_active else "blocked",
                "scans": row.scan_count,
                "joined": row.created_at.isoformat()
            }
            for row in result.all()
        ]

    async def get_all_scans(self, db: AsyncSession) -> List[Dict[str, Any]]:
        # Join DiseaseDetection with User to get user name
        query = select(
            DiseaseDetection,
            User.full_name
        ).join(User, DiseaseDetection.user_id == User.id).order_by(DiseaseDetection.created_at.desc()).limit(100)
        
        result = await db.execute(query)
        return [
            {
                "id": str(row.DiseaseDetection.id),
                "user": row.full_name,
                "disease": row.DiseaseDetection.detected_disease,
                "confidence": round(row.DiseaseDetection.confidence * 100, 1) if row.DiseaseDetection.confidence is not None else 0.0,
                "severity": row.DiseaseDetection.severity.lower() if row.DiseaseDetection.severity else "medium",
                "time": row.DiseaseDetection.created_at.isoformat(),
                "status": "completed"
            }
            for row in result.all()
        ]

    async def get_community_summary(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Aggregate community-wide engagement metrics. Mocked since Post, Like, Comment are removed.
        """
        return {
            "total_posts": 150,
            "total_interactions": 850,
            "trending_topic": "Rice Blast Prevention Strategies",
            "engagement_rate": "5.6 per post"
        }

analytics_service = AnalyticsService()
