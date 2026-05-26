import { api } from '@/lib/api';

export interface MarketPrice {
  commodity: string;
  state: string;
  district: string;
  market: string;
  min_price: number;
  max_price: number;
  modal_price: number;
  arrival_date: string;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
}

const MOCK_PRICES: MarketPrice[] = [
  {
    commodity: "Paddy(Dhan)(Common)",
    state: "Telangana",
    district: "Nizamabad",
    market: "Nizamabad",
    min_price: 2100,
    max_price: 2350,
    modal_price: 2200,
    arrival_date: new Date().toISOString().split('T')[0],
    trend: 'up',
    trend_percentage: 4.5
  },
  {
    commodity: "Wheat",
    state: "Punjab",
    district: "Ludhiana",
    market: "Khanna",
    min_price: 2275,
    max_price: 2400,
    modal_price: 2325,
    arrival_date: new Date().toISOString().split('T')[0],
    trend: 'stable',
    trend_percentage: 0.5
  },
  {
    commodity: "Tomato",
    state: "Maharashtra",
    district: "Pune",
    market: "Pune(Moshi)",
    min_price: 1500,
    max_price: 2500,
    modal_price: 1800,
    arrival_date: new Date().toISOString().split('T')[0],
    trend: 'down',
    trend_percentage: -12.3
  },
  {
    commodity: "Cotton",
    state: "Gujarat",
    district: "Rajkot",
    market: "Rajkot",
    min_price: 6800,
    max_price: 7400,
    modal_price: 7100,
    arrival_date: new Date().toISOString().split('T')[0],
    trend: 'up',
    trend_percentage: 2.1
  }
];

export const fetchMarketPrices = async (): Promise<MarketPrice[]> => {
  try {
    const data = await api.get<MarketPrice[]>('/agriculture/market-prices');
    if (data && data.length > 0) {
      return data;
    }
    return MOCK_PRICES;
  } catch (error) {
    console.error('Error fetching market prices from proxy:', error);
    return MOCK_PRICES;
  }
};
