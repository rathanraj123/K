import { api } from '@/lib/api';

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
    const data = await api.get<NewsArticle[]>('/agriculture/news');
    if (data && data.length > 0) {
      return data;
    }
    return MOCK_NEWS;
  } catch (error) {
    console.error('Error fetching news from proxy:', error);
    return MOCK_NEWS;
  }
};
