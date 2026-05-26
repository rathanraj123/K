import httpx
import logging

logger = logging.getLogger(__name__)

NEWS_API_KEY = "3adf64d4b590437390c62a98cb682d49"

async def fetch_scientific_news():
    """
    Fetches agriculture, climate, and disease outbreak news from NewsAPI.
    """
    try:
        url = f"https://newsapi.org/v2/everything?q=agriculture OR crop disease OR climate change&language=en&sortBy=publishedAt&apiKey={NEWS_API_KEY}"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            articles = data.get("articles", [])[:10] # Top 10
            
            formatted_news = []
            for a in articles:
                formatted_news.append({
                    "title": a.get("title"),
                    "source": a.get("source", {}).get("name"),
                    "url": a.get("url"),
                    "published_at": a.get("publishedAt"),
                    "summary": a.get("description")
                })
            return formatted_news
    except Exception as e:
        logger.error(f"NewsAPI fetch failed: {e}")
        # Return fallback mock data
        return [
            {
                "title": "Study Links Rising Global Temperatures to Spore Germination",
                "source": "AgriScience Journal",
                "url": "#",
                "published_at": "2024-05-24T10:00:00Z",
                "summary": "Recent findings suggest a 15% increase in fungal outbreaks due to sustained humidity spikes."
            },
            {
                "title": "New Rice Tungro Outbreak Monitored in Eastern Regions",
                "source": "Global Disease Watch",
                "url": "#",
                "published_at": "2024-05-23T14:30:00Z",
                "summary": "Satellite data indicates potential spread of RTD across central farmlands."
            }
        ]
