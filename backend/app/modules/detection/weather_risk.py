"""
Weather-disease correlation intelligence service.
Integrates OpenWeather data with disease-specific risk analysis.
Includes in-memory caching to minimize API calls.
"""
import logging
import time
from typing import Dict, Any, Optional
from app.modules.agriculture.service import agriculture_service

logger = logging.getLogger(__name__)

# ─── Disease-Weather Knowledge Base ──────────────────────────────
# Maps disease categories to their weather sensitivity profiles
DISEASE_WEATHER_PROFILES: Dict[str, Dict[str, Any]] = {
    "fungal": {
        "humidity_threshold": 75,
        "temp_range_c": (18, 32),
        "rain_sensitivity": "high",
        "description": "Fungal pathogens thrive in warm, humid environments with frequent rainfall."
    },
    "bacterial": {
        "humidity_threshold": 70,
        "temp_range_c": (22, 35),
        "rain_sensitivity": "medium",
        "description": "Bacterial infections spread through water splashing and high moisture on leaf surfaces."
    },
    "viral": {
        "humidity_threshold": 50,
        "temp_range_c": (20, 30),
        "rain_sensitivity": "low",
        "description": "Viral diseases spread primarily through insect vectors; weather affects vector activity."
    },
    "pest": {
        "humidity_threshold": 60,
        "temp_range_c": (25, 38),
        "rain_sensitivity": "low",
        "description": "Pest populations increase in warm, dry conditions. Rain can reduce pest pressure."
    },
}

# Map known diseases to categories
DISEASE_CATEGORY_MAP: Dict[str, str] = {
    "bacterial_leaf_blight": "bacterial",
    "bacterial_leaf_streak": "bacterial",
    "bacterial_panicle_blight": "bacterial",
    "blast": "fungal",
    "brown_spot": "fungal",
    "dead_heart": "pest",
    "downy_mildew": "fungal",
    "hispa": "pest",
    "normal": "none",
    "tungro": "viral",
}


class WeatherCache:
    """Simple TTL-based in-memory cache for weather data."""

    def __init__(self, ttl_seconds: int = 600):  # 10-minute default TTL
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._timestamps: Dict[str, float] = {}
        self.ttl = ttl_seconds

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        if key in self._cache:
            if time.time() - self._timestamps[key] < self.ttl:
                return self._cache[key]
            else:
                del self._cache[key]
                del self._timestamps[key]
        return None

    def set(self, key: str, value: Dict[str, Any]) -> None:
        self._cache[key] = value
        self._timestamps[key] = time.time()


class WeatherRiskService:
    """Computes weather-aware disease risk intelligence."""

    def __init__(self):
        self._cache = WeatherCache(ttl_seconds=600)

    async def get_weather_risk(
        self, disease_name: str, lat: float, lon: float
    ) -> Dict[str, Any]:
        """
        Fetch weather data and correlate with disease risk.
        Returns structured weather risk intelligence.
        """
        try:
            # Cache key based on rounded coordinates (1 decimal = ~11km precision)
            cache_key = f"{round(lat, 1)}_{round(lon, 1)}"
            weather_data = self._cache.get(cache_key)

            if not weather_data:
                weather_data = await agriculture_service.get_weather_intelligence(lat, lon)
                if weather_data and weather_data.get("status") != "error":
                    self._cache.set(cache_key, weather_data)

            if not weather_data or weather_data.get("status") == "error":
                return self._unavailable_result(weather_data)

            # Determine disease category
            category = DISEASE_CATEGORY_MAP.get(disease_name.lower(), "fungal")
            if category == "none":
                return self._healthy_result(weather_data)

            profile = DISEASE_WEATHER_PROFILES.get(category, DISEASE_WEATHER_PROFILES["fungal"])

            # Extract weather metrics
            humidity = weather_data.get("humidity_percent", 0)
            temp = weather_data.get("temperature_c", 25)
            rainfall = weather_data.get("rainfall_mm", 0)
            description = weather_data.get("description", "")
            city = weather_data.get("city", "Unknown")
            agri_warnings = weather_data.get("agri_warnings", [])

            # Compute risk scores
            fungal_spread_risk = self._compute_fungal_risk(humidity, temp, rainfall, category)
            risk_level = self._risk_level(fungal_spread_risk)
            correlations = self._generate_correlations(
                disease_name, category, humidity, temp, rainfall, profile
            )

            return {
                "available": True,
                "location": city,
                "coordinates": {"lat": lat, "lon": lon},
                "current_conditions": {
                    "temperature_c": round(temp, 1),
                    "humidity_pct": humidity,
                    "rainfall_mm": round(rainfall, 1),
                    "description": description,
                },
                "disease_risk": {
                    "fungal_spread_risk_pct": round(fungal_spread_risk, 1),
                    "risk_level": risk_level,
                    "disease_category": category,
                },
                "correlations": correlations,
                "agri_warnings": agri_warnings,
            }

        except Exception as e:
            logger.error(f"Weather risk analysis failed: {e}")
            return {"available": False, "error": str(e)}

    def _compute_fungal_risk(
        self, humidity: float, temp: float, rainfall: float, category: str
    ) -> float:
        """
        Compute fungal/disease spread risk as a percentage (0-100).
        Uses weighted factors based on disease category.
        """
        profile = DISEASE_WEATHER_PROFILES.get(category, DISEASE_WEATHER_PROFILES["fungal"])
        risk = 0.0

        # Humidity factor (biggest contributor for fungal)
        humidity_threshold = profile["humidity_threshold"]
        if humidity >= humidity_threshold:
            excess = (humidity - humidity_threshold) / (100 - humidity_threshold)
            risk += excess * 50  # Up to 50 points from humidity
        else:
            risk += max(0, (humidity / humidity_threshold) * 15)

        # Temperature factor
        temp_low, temp_high = profile["temp_range_c"]
        if temp_low <= temp <= temp_high:
            # In optimal range for pathogen
            temp_midpoint = (temp_low + temp_high) / 2
            temp_score = 1 - abs(temp - temp_midpoint) / (temp_high - temp_low)
            risk += temp_score * 25  # Up to 25 points
        else:
            risk += 5  # Low but not zero outside range

        # Rainfall factor
        rain_weight = {"high": 1.0, "medium": 0.6, "low": 0.2}.get(
            profile["rain_sensitivity"], 0.5
        )
        if rainfall > 0:
            rain_score = min(rainfall / 10.0, 1.0)  # Caps at 10mm
            risk += rain_score * 25 * rain_weight

        return min(max(risk, 0), 100)

    def _risk_level(self, risk_pct: float) -> str:
        if risk_pct >= 75:
            return "critical"
        elif risk_pct >= 50:
            return "high"
        elif risk_pct >= 25:
            return "moderate"
        else:
            return "low"

    def _generate_correlations(
        self,
        disease_name: str,
        category: str,
        humidity: float,
        temp: float,
        rainfall: float,
        profile: Dict[str, Any],
    ) -> list:
        """Generate human-readable weather-disease correlation insights."""
        correlations = []
        disease_display = disease_name.replace("_", " ").title()

        if humidity >= profile["humidity_threshold"]:
            correlations.append(
                f"Current humidity ({humidity}%) exceeds the {profile['humidity_threshold']}% threshold "
                f"for {category} pathogen proliferation. {disease_display} spread probability is elevated."
            )

        temp_low, temp_high = profile["temp_range_c"]
        if temp_low <= temp <= temp_high:
            correlations.append(
                f"Temperature ({temp:.1f}°C) is within the optimal {temp_low}-{temp_high}°C range "
                f"for {category} disease development."
            )
        elif temp > temp_high:
            correlations.append(
                f"Temperature ({temp:.1f}°C) exceeds optimal range. Heat stress may compound "
                f"plant vulnerability to {disease_display}."
            )

        if rainfall > 2 and profile["rain_sensitivity"] in ("high", "medium"):
            correlations.append(
                f"Recent rainfall ({rainfall:.1f}mm) creates moisture conditions favourable "
                f"for {category} spore germination and splash dispersal."
            )

        if not correlations:
            correlations.append(
                f"Current weather conditions present moderate risk for {disease_display}. "
                f"Continue regular monitoring."
            )

        return correlations

    def _unavailable_result(self, raw: Optional[Dict]) -> Dict[str, Any]:
        return {
            "available": False,
            "error": raw.get("message", "Weather data unavailable") if raw else "No weather data",
        }

    def _healthy_result(self, weather_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "available": True,
            "location": weather_data.get("city", "Unknown"),
            "current_conditions": {
                "temperature_c": weather_data.get("temperature_c", 0),
                "humidity_pct": weather_data.get("humidity_percent", 0),
                "rainfall_mm": weather_data.get("rainfall_mm", 0),
                "description": weather_data.get("description", ""),
            },
            "disease_risk": {
                "fungal_spread_risk_pct": 0,
                "risk_level": "none",
                "disease_category": "none",
            },
            "correlations": ["Plant appears healthy. No weather-related disease risk detected."],
            "agri_warnings": weather_data.get("agri_warnings", []),
        }


weather_risk_service = WeatherRiskService()
