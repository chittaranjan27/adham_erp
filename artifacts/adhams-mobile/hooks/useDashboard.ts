import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { DashboardSummary, Activity, RevenueTrend } from '@/lib/types';

export function useDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => api.get('/api/dashboard/summary'),
    staleTime: 60 * 1000,
  });
}

export function useRecentActivities() {
  return useQuery<Activity[]>({
    queryKey: ['dashboard', 'activities'],
    queryFn: () => api.get('/api/dashboard/recent-activities'),
    staleTime: 30 * 1000,
  });
}

export function useRevenueTrends() {
  return useQuery<RevenueTrend[]>({
    queryKey: ['dashboard', 'revenue-trends'],
    queryFn: () => api.get('/api/dashboard/revenue-trends'),
    staleTime: 5 * 60 * 1000,
  });
}
