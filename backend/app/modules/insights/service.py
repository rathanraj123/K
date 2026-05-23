from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.agriculture import DiseaseDetection
from app.modules.agriculture.service import agriculture_service
from app.models.user import User
import datetime

class InsightsService:
    async def generate_insights(self, db: AsyncSession, user: User, lat: float, lon: float) -> List[Dict[str, Any]]:
        insights = []
        
        # 1. Fetch real historical disease frequencies for this user's area / global
        # We'll use global as an example of region trends if we had crop regions.
        query = select(
            DiseaseDetection.detected_disease, 
            func.count(DiseaseDetection.id).label("count")
        ).where(
            DiseaseDetection.created_at >= datetime.datetime.utcnow() - datetime.timedelta(days=30)
        ).group_by(DiseaseDetection.detected_disease).order_by(func.count(DiseaseDetection.id).desc()).limit(3)
        
        result = await db.execute(query)
        top_diseases = result.all()
        
        # 2. Fetch real weather data
        weather_data = await agriculture_service.get_weather_intelligence(lat, lon)
        
        # 3. Rule-based Combinatory Logic
        if weather_data and weather_data.get("status") != "error":
            humidity = weather_data.get("humidity_percent", 0)
            temp = weather_data.get("temperature_c", 0)
            
            # Insights rule: High humidity + historical fungal diseases
            fungal_risks = ["Tomato_Late_blight", "Apple_scab", "Potato_Early_blight"]
            
            for disease in top_diseases:
                if disease.detected_disease in fungal_risks and humidity > 80:
                    insights.append({
                        "type": "risk_prediction",
                        "severity": "High",
                        "message": f"Critical Action Required: High local humidity ({humidity}%) combined with a 30-day regional spike in {disease.detected_disease} ({disease.count} cases). Apply preventative fungicides immediately."
                    })
                elif temp > 35:
                     insights.append({
                        "type": "weather_alert",
                        "severity": "Medium",
                        "message": f"Heat stress possible. Temperature is {temp}°C. Increase irrigation for sensitive crops."
                    })
                     
        if not insights:
            # Baseline insight based purely on DB prevalence
            if top_diseases:
                top = top_diseases[0]
                insights.append({
                    "type": "regional_trend",
                    "severity": "Info",
                    "message": f"The most prevalent issue in the platform recently is {top.detected_disease} with {top.count} detections. Ensure preventative measures are in place."
                })
                
        return insights

insights_service = InsightsService()
