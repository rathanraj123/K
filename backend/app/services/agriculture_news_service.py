import httpx
import logging
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

MOCK_NEWS = [
    {
        "title": "New AI Models Predicting Crop Diseases with 95% Accuracy",
        "description": "Researchers have deployed a new pipeline for identifying fungal infections in rice and wheat, helping farmers prevent massive yield losses.",
        "url": "#",
        "urlToImage": "https://images.unsplash.com/photo-1592982537447-6f2a6a0c6c1d?w=800&q=80",
        "publishedAt": datetime.utcnow().isoformat() + "Z",
        "source": { "name": "AgriTech Daily" },
        "category": "Technology"
    },
    {
        "title": "Government Announces New Subsidy for Organic Fertilizers",
        "description": "To promote sustainable farming, the ministry of agriculture has rolled out a 50% subsidy on certified organic inputs.",
        "url": "#",
        "urlToImage": "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80",
        "publishedAt": datetime.utcnow().isoformat() + "Z",
        "source": { "name": "Policy Update" },
        "category": "Government"
    },
    {
        "title": "Heavy Rainfall Alert for Southern Districts",
        "description": "Farmers are advised to delay chemical spraying due to predicted unseasonal heavy rainfall over the next 48 hours.",
        "url": "#",
        "urlToImage": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&q=80",
        "publishedAt": datetime.utcnow().isoformat() + "Z",
        "source": { "name": "Weather Monitor" },
        "category": "Weather"
    }
]

def determine_category(title: str, description: str) -> str:
    text = f"{title} {description}".lower()
    if 'weather' in text or 'rain' in text or 'climate' in text:
        return 'Weather'
    if 'disease' in text or 'pest' in text or 'fungus' in text:
        return 'Diseases'
    if 'government' in text or 'subsidy' in text or 'policy' in text:
        return 'Government'
    if 'tech' in text or 'ai' in text or 'drone' in text:
        return 'Technology'
    if 'market' in text or 'price' in text or 'export' in text:
        return 'Market'
    if 'rice' in text or 'paddy' in text:
        return 'Rice'
    return 'Agriculture'

async def fetch_agriculture_news() -> list:
    """
    Fetches agriculture, farming, crop disease, and irrigation news from NewsAPI.
    """
    if not settings.NEWS_API_KEY:
        logger.warning("News API Key is missing. Using fallback mock news.")
        return MOCK_NEWS

    try:
        query = "agriculture OR farming OR \"crop disease\" OR fertilizer OR irrigation"
        url = f"https://newsapi.org/v2/everything?q={httpx.URLEscape(query)}&language=en&sortBy=publishedAt&pageSize=10&apiKey={settings.NEWS_API_KEY}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            if response.status_code == 200:
                data = response.json()
                articles = data.get("articles", [])
                formatted = []
                for a in articles:
                    title = a.get("title", "")
                    description = a.get("description", "")
                    url_to_image = a.get("urlToImage", "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=800&q=80")
                    if title and url_to_image:
                        formatted.append({
                            "title": title,
                            "description": description,
                            "url": a.get("url", "#"),
                            "urlToImage": url_to_image,
                            "publishedAt": a.get("publishedAt", datetime.utcnow().isoformat() + "Z"),
                            "source": { "name": a.get("source", {}).get("name", "Agri News") },
                            "category": determine_category(title, description)
                        })
                return formatted if formatted else MOCK_NEWS
            else:
                logger.warning(f"NewsAPI returned status code {response.status_code}. Using fallback.")
                return MOCK_NEWS
    except Exception as e:
        logger.error(f"NewsAPI fetch failed: {e}. Using fallback.")
        return MOCK_NEWS
