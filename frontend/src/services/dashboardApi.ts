import { api } from '@/lib/api';

export interface DashboardOverview {
  total_scans_analyzed: number;
  average_confidence: number;
  high_risk_detections: number;
  reports_generated: number;
  total_scans_trend: string;
  confidence_trend: string;
  high_risk_trend: string;
  reports_trend: string;
}

export interface DiseaseTrend {
  day: string;
  blight: number;
  spot: number;
  blast: number;
  smut: number;
  tungro: number;
}

export interface RecentActivity {
  id: string;
  time: string;
  title: string;
  desc: string;
  type: 'anomaly' | 'report' | 'heatmap' | 'scan' | 'system';
}

export interface DiseaseDistribution {
  id: string;
  lat: number;
  lng: number;
  severity: 'low' | 'medium' | 'high';
  type: string;
}

export interface TopDisease {
  name: string;
  value: number;
  percentage: number;
}

export interface ScanInsight {
  label: string;
  value: string;
  type: string;
}

export interface AIInsight {
  tag: string;
  time: string;
  title: string;
  desc: string;
  severity: 'high' | 'medium' | 'low' | 'info';
}

export const dashboardApi = {
  getOverview: () => api.get<DashboardOverview>('/dashboard/overview'),
  getDiseaseTrends: () => api.get<DiseaseTrend[]>('/dashboard/trends'),
  getRecentActivity: () => api.get<RecentActivity[]>('/dashboard/recent-activity'),
  getHeatmapData: () => api.get<DiseaseDistribution[]>('/dashboard/heatmap'),
  getTopDiseases: () => api.get<TopDisease[]>('/dashboard/top-diseases'),
  getScanInsights: () => api.get<ScanInsight[]>('/dashboard/scan-insights'),
  getInsightFeed: async () => {
    const { data } = await api.get('/dashboard/insight-feed');
    return data;
  },
  
  getPredictions: async () => {
    const { data } = await api.get('/dashboard/predictions');
    return data;
  },
};
