import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { InventoryItem, InventoryListResponse, Product, Warehouse } from '@/lib/types';

export function useInventory(params?: { status?: string; limit?: number; page?: number }) {
  const queryString = new URLSearchParams();
  if (params?.status) queryString.set('status', params.status);
  if (params?.limit) queryString.set('limit', String(params.limit));
  if (params?.page) queryString.set('page', String(params.page));

  return useQuery<InventoryListResponse>({
    queryKey: ['inventory', params],
    queryFn: () => api.get(`/api/inventory?${queryString.toString()}`),
    staleTime: 30 * 1000,
  });
}

export function useInventoryItem(id: number) {
  return useQuery<InventoryItem>({
    queryKey: ['inventory', id],
    queryFn: () => api.get(`/api/inventory/${id}`),
    enabled: !!id,
  });
}

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const data = await api.get<any>('/api/products?limit=200');
      return data.items || data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useWarehouses() {
  return useQuery<Warehouse[]>({
    queryKey: ['warehouses'],
    queryFn: () => api.get('/api/warehouses'),
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      productId: number;
      warehouseId: number;
      quantity: number;
      unitPrice: string;
      hsnCode?: string;
      grossWeight?: string;
    }) => api.post('/api/inventory', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useQCDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: {
      id: number;
      decision: 'accept' | 'reject';
      rejectionReason?: string;
      notes?: string;
    }) => api.post(`/api/inventory/qc/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}
