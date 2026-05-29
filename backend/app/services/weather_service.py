import httpx
import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class WeatherService:
    @staticmethod
    async def get_weather_risk(lat: Optional[float], lng: Optional[float], disease_type: str = "Unknown") -> Dict[str, Any]:
        """
        Fetches weather data for coordinates and calculates a risk index.
        Gracefully degrades to mock data if API key is missing or request fails.
        """
        weather_data = {
            "temperature": 28.5,
            "humidity": 75,
            "precipitation": 0.0,
            "condition": "Cloudy"
        }
        
        # In a real scenario, use OPENWEATHER_API_KEY
        if lat and lng and settings.OPENWEATHER_API_KEY:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={settings.OPENWEATHER_API_KEY}&units=metric"
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, timeout=3.0)
                    if response.status_code == 200:
                        data = response.json()
                        weather_data = {
                            "temperature": data.get("main", {}).get("temp", 28.5),
                            "humidity": data.get("main", {}).get("humidity", 75),
                            "precipitation": data.get("rain", {}).get("1h", 0.0),
                            "condition": data.get("weather", [{}])[0].get("main", "Unknown")
                        }
            except Exception as e:
                logger.warning(f"Weather API failed, using fallback data: {e}")

        # Calculate Risk Index (0-100)
        # High humidity (>80%) + Warm Temp (25-30) usually increases fungal disease risk
        risk_index = 50
        
        if weather_data["humidity"] > 80:
            risk_index += 20
            
        if 25 <= weather_data["temperature"] <= 32:
            risk_index += 15
            
        if weather_data["precipitation"] > 0.5:
            risk_index += 10
            
        if "blight" in disease_type.lower() or "blast" in disease_type.lower():
            if weather_data["humidity"] > 85:
                risk_index += 20
                
        # Cap at 100
        risk_index = min(100, risk_index)

        return {
            "conditions": weather_data,
            "risk_index": risk_index,
            "correlations": f"High risk correlation due to {weather_data['humidity']}% humidity." if risk_index > 75 else "Normal environmental risk."
        }
