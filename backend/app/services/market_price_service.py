import httpx
import logging
import random
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

MOCK_PRICES = [
    {
        "commodity": "Paddy(Dhan)(Common)",
        "state": "Telangana",
        "district": "Nizamabad",
        "market": "Nizamabad",
        "min_price": 2100.0,
        "max_price": 2350.0,
        "modal_price": 2200.0,
        "arrival_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "trend": "up",
        "trend_percentage": 4.5
    },
    {
        "commodity": "Wheat",
        "state": "Punjab",
        "district": "Ludhiana",
        "market": "Khanna",
        "min_price": 2275.0,
        "max_price": 2400.0,
        "modal_price": 2325.0,
        "arrival_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "trend": "stable",
        "trend_percentage": 0.5
    },
    {
        "commodity": "Tomato",
        "state": "Maharashtra",
        "district": "Pune",
        "market": "Pune(Moshi)",
        "min_price": 1500.0,
        "max_price": 2500.0,
        "modal_price": 1800.0,
        "arrival_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "trend": "down",
        "trend_percentage": -12.3
    },
    {
        "commodity": "Cotton",
        "state": "Gujarat",
        "district": "Rajkot",
        "market": "Rajkot",
        "min_price": 6800.0,
        "max_price": 7400.0,
        "modal_price": 7100.0,
        "arrival_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "trend": "up",
        "trend_percentage": 2.1
    }
]

async def fetch_market_prices() -> list:
    """
    Fetches mandi market prices from Data.gov.in API.
    """
    if not settings.DATA_GOV_API_KEY:
        logger.warning("Data.gov.in API key is missing. Using fallback mock prices.")
        return MOCK_PRICES

    resource_id = "9ef84268-d588-465a-a308-a864a43d0070"
    base_url = "https://api.data.gov.in/resource"
    
    try:
        url = f"{base_url}/{resource_id}?api-key={settings.DATA_GOV_API_KEY}&format=json&limit=50"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                records = data.get("records", [])
                formatted = []
                for r in records[:50]:
                    try:
                        min_p = float(r.get("min_price", 0))
                        max_p = float(r.get("max_price", 0))
                        modal_p = float(r.get("modal_price", 0))
                    except (ValueError, TypeError):
                        min_p, max_p, modal_p = 0.0, 0.0, 0.0

                    # Simulate a random trend as data.gov does not provide historical delta directly here
                    trend_val = random.choice(["up", "down", "stable"])
                    trend_pct = round(random.uniform(0.1, 5.0), 1)
                    if trend_val == "down":
                        trend_pct = -trend_pct
                    elif trend_val == "stable":
                        trend_pct = 0.0

                    formatted.append({
                        "commodity": r.get("commodity", "Unknown"),
                        "state": r.get("state", "Unknown"),
                        "district": r.get("district", "Unknown"),
                        "market": r.get("market", "Unknown"),
                        "min_price": min_p,
                        "max_price": max_p,
                        "modal_price": modal_p,
                        "arrival_date": r.get("arrival_date", datetime.utcnow().strftime("%Y-%m-%d")),
                        "trend": trend_val,
                        "trend_percentage": trend_pct
                    })
                return formatted if formatted else MOCK_PRICES
            else:
                logger.warning(f"Data.gov.in API returned status code {response.status_code}. Using fallback.")
                return MOCK_PRICES
    except Exception as e:
        logger.error(f"Data.gov.in market prices fetch failed: {e}. Using fallback.")
        return MOCK_PRICES
