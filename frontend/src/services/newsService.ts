const NEWS_API_KEY = '3adf64d4b590437390c62a98cb682d49';
const NEWS_API_URL = 'https://newsapi.org/v2/everything';

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  source: { name: string };
  category?: string;
}

const MOCK_NEWS: NewsArticle[] = [
  {
    title: "New AI Models Predicting Crop Diseases with 95% Accuracy",
    description: "Researchers have deployed a new pipeline for identifying fungal infections in rice and wheat, helping farmers prevent massive yield losses.",
    url: "#",
    urlToImage: "https://images.unsplash.com/photo-1592982537447-6f2a6a0c6c1d?w=800&q=80",
    publishedAt: new Date().toISOString(),
    source: { name: "AgriTech Daily" },
    category: "Technology"
  },
  {
    title: "Government Announces New Subsidy for Organic Fertilizers",
    description: "To promote sustainable farming, the ministry of agriculture has rolled out a 50% subsidy on certified organic inputs.",
    url: "#",
    urlToImage: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80",
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    source: { name: "Policy Update" },
    category: "Government"
  },
  {
    title: "Heavy Rainfall Alert for Southern Districts",
    description: "Farmers are advised to delay chemical spraying due to predicted unseasonal heavy rainfall over the next 48 hours.",
    url: "#",
    urlToImage: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&q=80",
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    source: { name: "Weather Monitor" },
    category: "Weather"
  }
];

export const fetchAgricultureNews = async (): Promise<NewsArticle[]> => {
  try {
    const query = encodeURIComponent('agriculture OR farming OR "crop disease" OR fertilizer OR irrigation');
    const response = await fetch(`${NEWS_API_URL}?q=${query}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`);
    
    if (!response.ok) {
      console.warn("NewsAPI failed, using fallback data.");
      return MOCK_NEWS;
    }

    const data = await response.json();
    if (data.articles && data.articles.length > 0) {
      return data.articles.filter((a: any) => a.title && a.urlToImage).map((a: any) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        urlToImage: a.urlToImage,
        publishedAt: a.publishedAt,
        source: { name: a.source?.name || 'Unknown Source' },
        category: determineCategory(a.title + " " + a.description)
      }));
    }
    
    return MOCK_NEWS;
  } catch (error) {
    console.error('Error fetching news:', error);
    return MOCK_NEWS;
  }
};

function determineCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('weather') || lower.includes('rain') || lower.includes('climate')) return 'Weather';
  if (lower.includes('disease') || lower.includes('pest') || lower.includes('fungus')) return 'Diseases';
  if (lower.includes('government') || lower.includes('subsidy') || lower.includes('policy')) return 'Government';
  if (lower.includes('tech') || lower.includes('ai ') || lower.includes('drone')) return 'Technology';
  if (lower.includes('market') || lower.includes('price') || lower.includes('export')) return 'Market';
  if (lower.includes('rice') || lower.includes('paddy')) return 'Rice';
  return 'Agriculture';
}
