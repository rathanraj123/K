import httpx
from typing import Dict, Any, Optional
from app.core.config import settings

class AgricultureService:
    def __init__(self):
        self.weather_api_key = settings.OPENWEATHER_API_KEY
        self.base_url = "https://api.openweathermap.org/data/2.5/weather"
        
    async def get_weather_intelligence(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        if not self.weather_api_key:
            return {"status": "error", "message": "Weather API essentially disabled. Missing key."}
            
        params = {
            "lat": lat,
            "lon": lon,
            "appid": self.weather_api_key,
            "units": "metric"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.base_url, params=params, timeout=5)
                
                if response.status_code == 200:
                    data = response.json()
                    temp = data.get("main", {}).get("temp")
                    humidity = data.get("main", {}).get("humidity")
                    rain = data.get("rain", {}).get("1h", 0) # mm in last hour
                    weather_desc = data.get("weather", [{}])[0].get("description", "").capitalize()
                    
                    # Agri Intelligence Rules
                    warnings = []
                    if temp > 35:
                        warnings.append("Extreme Heat: Increase irrigation frequency.")
                    elif temp < 10:
                        warnings.append("Cold Stress: Protective covering recommended.")
                        
                    if humidity > 80:
                        warnings.append("High Humidity: Watch for blight/fungal signs.")
                    elif humidity < 30:
                        warnings.append("Low Humidity: Potential for transpiration stress.")
                        
                    if rain > 5:
                        warnings.append("Heavy Rain: Check drainage; delay chemical sprays.")

                    return {
                        "temperature_c": round(temp, 1) if temp is not None else 0,
                        "humidity_percent": humidity or 0,
                        "rainfall_mm": rain,
                        "description": weather_desc,
                        "agri_warnings": warnings,
                        "city": data.get("name", "Unknown")
                    }
                else:
                    return None
        except Exception as e:
            return {"status": "error", "message": str(e)}

agriculture_service = AgricultureService()
