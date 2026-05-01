import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { FinanceReport } from '@/lib/types';

export function useFinanceReport(period: 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
  return useQuery<FinanceReport>({
    queryKey: ['finance', 'reports', period],
    queryFn: () => api.get(`/api/finance/reports?period=${period}`),
    staleTime: 5 * 60 * 1000,
  });
}
