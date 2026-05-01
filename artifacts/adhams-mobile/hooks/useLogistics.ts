import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { Dispatch } from '@/lib/types';

export function useDispatches(params?: { limit?: number }) {
  const queryString = new URLSearchParams();
  if (params?.limit) queryString.set('limit', String(params.limit));

  return useQuery<Dispatch[]>({
    queryKey: ['dispatches', params],
    queryFn: async () => {
      const data = await api.get<any>(`/api/logistics/dispatches?${queryString.toString()}`);
      return Array.isArray(data) ? data : data.dispatches || [];
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      orderId: number;
      vehicleNumber: string;
      driverName: string;
      driverPhone?: string;
      routePlan?: string;
      dispatchDate?: string;
    }) => api.post('/api/logistics/dispatches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateDispatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: number;
      status?: string;
      proofOfDelivery?: string;
    }) => api.patch(`/api/logistics/dispatches/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
