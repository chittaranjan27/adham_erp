import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { GRN } from '@/lib/types';

export function useGRNList(params?: { limit?: number }) {
  const queryString = new URLSearchParams();
  if (params?.limit) queryString.set('limit', String(params.limit));

  return useQuery<GRN[]>({
    queryKey: ['grn', params],
    queryFn: async () => {
      const data = await api.get<any>(`/api/grn?${queryString.toString()}`);
      return Array.isArray(data) ? data : data.items || [];
    },
    staleTime: 30 * 1000,
  });
}

export function useCreateGRN() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      poId?: number;
      warehouseId: number;
      totalItemsReceived: number;
      shortageQty?: number;
      damageQty?: number;
      qualityInspection?: {
        surfaceCondition?: string;
        edgeCondition?: string;
        warping?: string;
        shadeMatch?: string;
      };
    }) => api.post('/api/grn', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grn'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

export function useReleaseGRN() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, verifiedBy }: { id: number; verifiedBy: string }) =>
      api.patch(`/api/grn/${id}`, { status: 'accepted', isReleased: true, verifiedBy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grn'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
