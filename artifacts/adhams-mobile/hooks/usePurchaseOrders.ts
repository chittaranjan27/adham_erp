import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';
import type { PurchaseOrder, ImportWorkflow } from '@/lib/types';

export function usePurchaseOrders() {
  return useQuery<PurchaseOrder[]>({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const data = await api.get<any>('/api/purchase-orders');
      return Array.isArray(data) ? data : data.purchaseOrders || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      type: 'local' | 'import';
      supplierName: string;
      gstin?: string;
      country?: string;
      currency?: string;
      totalAmount: string;
      taxAmount?: string;
      shippingAmount?: string;
      expectedDeliveryDate?: string;
      destinationWarehouseId?: number;
      attachmentUrl?: string;
    }) => api.post('/api/purchase-orders', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}

export function useImportWorkflow(poId: number) {
  return useQuery<ImportWorkflow>({
    queryKey: ['import-workflow', poId],
    queryFn: () => api.get(`/api/import-workflow/${poId}`),
    enabled: !!poId,
  });
}

export function useCompleteImportStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ poId, stageId, ...data }: {
      poId: number;
      stageId: number;
      notes?: string;
      [key: string]: any;
    }) => api.patch(`/api/import-workflow/${poId}/stage/${stageId}`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['import-workflow', variables.poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}
