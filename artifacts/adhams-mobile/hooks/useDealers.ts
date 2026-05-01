import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { Dealer } from '@/lib/types';

export function useDealers(params?: { limit?: number }) {
  const queryString = new URLSearchParams();
  if (params?.limit) queryString.set('limit', String(params.limit));

  return useQuery<Dealer[]>({
    queryKey: ['dealers', params],
    queryFn: async () => {
      const data = await api.get<any>(`/api/dealers?${queryString.toString()}`);
      return Array.isArray(data) ? data : data.dealers || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreateDealer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      city?: string;
      state?: string;
      gstNumber?: string;
      creditLimit?: string;
      commissionTier?: string;
    }) => api.post('/api/dealers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealers'] });
    },
  });
}
