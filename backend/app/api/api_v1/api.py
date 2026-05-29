from fastapi import APIRouter

from app.api.api_v1.endpoints import auth, chatbot, detection, agriculture, cosmetic, metrics, analytics, insights, export, notifications, admin, system_health, scientific, dashboard

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(admin.router, prefix="/admin", tags=["Enterprise Admin"])
api_router.include_router(system_health.router, prefix="/system", tags=["System Health"])

api_router.include_router(chatbot.router, prefix="/chatbot", tags=["AI Chatbot"])
api_router.include_router(detection.router, prefix="/detection", tags=["Disease Detection"])
api_router.include_router(agriculture.router, prefix="/agriculture", tags=["Agriculture Intelligence"])
api_router.include_router(cosmetic.router, prefix="/cosmetic", tags=["Cosmetic Intelligence"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Observability: System"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Data Analytics (SaaS)"])
api_router.include_router(scientific.router, prefix="/scientific", tags=["Scientific Intelligence"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Scientist Dashboard"])
api_router.include_router(insights.router, prefix="/ai", tags=["AI Insights"])
api_router.include_router(export.router, prefix="/export", tags=["Data Exports"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["System Notifications"])
