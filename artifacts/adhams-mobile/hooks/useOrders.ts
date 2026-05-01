import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { Order } from '@/lib/types';

interface OrdersResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export function useOrders(params?: { limit?: number; page?: number; status?: string }) {
  const queryString = new URLSearchParams();
  if (params?.limit) queryString.set('limit', String(params.limit));
  if (params?.page) queryString.set('page', String(params.page));
  if (params?.status) queryString.set('status', params.status);

  return useQuery<OrdersResponse>({
    queryKey: ['orders', params],
    queryFn: async () => {
      const data = await api.get<any>(`/api/orders?${queryString.toString()}`);
      // API might return array directly or wrapped
      if (Array.isArray(data)) return { orders: data, total: data.length, page: 1, limit: 50 };
      
      // Backend returns { items: [...] }, map it to orders
      if (data && data.items) {
        return { ...data, orders: data.items };
      }
      
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useOrder(id: number) {
  return useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: () => api.get(`/api/orders/${id}`),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      dealerId: number;
      items: { productId: number; quantity: number; unitPrice: string }[];
      gstRate?: string;
      supplyType?: string;
      discountAmount?: string;
      shippingAmount?: string;
      advancePaid?: string;
      notes?: string;
    }) => api.post('/api/orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: string; [key: string]: any }) =>
      api.patch(`/api/orders/${id}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
