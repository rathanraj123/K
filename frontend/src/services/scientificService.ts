import { api } from '@/lib/api';

export const scientificService = {
  getNews: () => api.get('/scientific/news'),
  getHistoricalClimate: (lat: number = 21.0, lon: number = 78.0) => 
    api.get(`/scientific/climate/historical?lat=${lat}&lon=${lon}`),
  getClimateRisk: (lat: number = 21.0, lon: number = 78.0) => 
    api.get(`/scientific/climate/risk?lat=${lat}&lon=${lon}`),
  getNasaAnomalies: (lat: number = 21.0, lon: number = 78.0) => 
    api.get(`/scientific/nasa/anomalies?lat=${lat}&lon=${lon}`),
  getNasaRegionalTrend: (region: string = "Central India") => 
    api.get(`/scientific/nasa/regional-trend?region=${region}`),
  getRegionalStats: () => api.get('/scientific/regional/stats'),
  getOutbreakHeatmaps: () => api.get('/scientific/outbreaks/heatmaps'),
};
