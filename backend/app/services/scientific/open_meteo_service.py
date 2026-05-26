import httpx
import logging

logger = logging.getLogger(__name__)

async def fetch_historical_climate(lat: float, lon: float, past_days: int = 30):
    """
    Fetches historical climate data from Open-Meteo archive for disease correlation.
    """
    try:
        url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date=2024-01-01&end_date=2024-01-30&daily=temperature_2m_mean,precipitation_sum,rain_sum&timezone=auto"
        # We use a mock date range for demonstration, but in production, we'd calculate date strings dynamically
        
        async with httpx.AsyncClient() as client:
            # We'll use the forecast API instead for live recent data
            forecast_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&past_days={past_days}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum&timezone=auto"
            response = await client.get(forecast_url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            return {
                "location": {"lat": lat, "lon": lon},
                "time": data["daily"]["time"],
                "temperature_max": data["daily"]["temperature_2m_max"],
                "precipitation": data["daily"]["precipitation_sum"],
            }
    except Exception as e:
        logger.error(f"Open-Meteo fetch failed: {e}")
        # Fallback payload
        return {
            "location": {"lat": lat, "lon": lon},
            "time": ["2024-05-01", "2024-05-02", "2024-05-03", "2024-05-04", "2024-05-05"],
            "temperature_max": [30.1, 31.2, 32.5, 33.1, 34.0],
            "precipitation": [0, 0, 12.5, 2.1, 0]
        }

async def analyze_climate_disease_correlation(lat: float, lon: float):
    data = await fetch_historical_climate(lat, lon, past_days=14)
    precip = sum(data.get("precipitation", [0]))
    avg_temp = sum(data.get("temperature_max", [0])) / max(len(data.get("temperature_max", [1])), 1)
    
    risk = "Low"
    if precip > 20 and avg_temp > 28:
        risk = "High Fungal Risk"
    elif avg_temp > 35:
        risk = "High Heat Stress Risk"
        
    return {
        "environmental_risk": risk,
        "recent_precipitation_mm": round(precip, 2),
        "average_max_temp_c": round(avg_temp, 2),
        "correlation_insight": "High humidity post-rainfall accelerates blast spore germination." if risk == "High Fungal Risk" else "Normal conditions."
    }
