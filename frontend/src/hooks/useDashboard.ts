import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../services/dashboardApi';
import { useEffect } from 'react';
import { API_ORIGIN } from '@/config';

export const useDashboardOverview = () => {
  return useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.getOverview,
    staleTime: 1000 * 60 * 5,
  });
};

export const useDiseaseTrends = () => {
  return useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: dashboardApi.getDiseaseTrends,
    staleTime: 1000 * 60 * 5,
  });
};

export const useRecentActivity = () => {
  return useQuery({
    queryKey: ['dashboard', 'recentActivity'],
    queryFn: dashboardApi.getRecentActivity,
    staleTime: 1000 * 60 * 5,
  });
};

export const useHeatmapData = () => {
  return useQuery({
    queryKey: ['dashboard', 'heatmap'],
    queryFn: dashboardApi.getHeatmapData,
    staleTime: 1000 * 60 * 5,
  });
};

export const useTopDiseases = () => {
  return useQuery({
    queryKey: ['dashboard', 'topDiseases'],
    queryFn: dashboardApi.getTopDiseases,
    staleTime: 1000 * 60 * 5,
  });
};

export const useScanInsights = () => {
  return useQuery({
    queryKey: ['dashboard', 'scanInsights'],
    queryFn: dashboardApi.getScanInsights,
    staleTime: 1000 * 60 * 5,
  });
};

export const useInsightFeed = () => {
  return useQuery({
    queryKey: ['dashboard', 'insightFeed'],
    queryFn: dashboardApi.getInsightFeed,
    staleTime: 1000 * 60 * 5,
  });
};

export const usePredictions = () => {
  return useQuery({
    queryKey: ['dashboard', 'predictions'],
    queryFn: dashboardApi.getPredictions,
    staleTime: 1000 * 60 * 5,
  });
};

export const useLiveDashboard = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Determine the WS URL from the API Origin
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = API_ORIGIN.replace(/^https?:\/\//, '');
    if (!host) {
      host = window.location.host;
    }
    const wsUrl = `${protocol}//${host}/api/v1/dashboard/ws/dashboard`;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Dashboard WS message received:', data);
        // Invalidate all dashboard queries to refresh charts/data instantly
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('Dashboard WS error:', error);
    };

    return () => {
      ws.close();
    };
  }, [queryClient]);
};
