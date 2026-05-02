import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/apiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AssistantAction = 'low_stock' | 'warehouse_summary' | 'available_stock';

export interface LowStockItem {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  totalQuantity: number;
  totalSaleable: number;
  totalReserved: number;
  warehouseCount: number;
  avgUnitPrice: number;
}

export interface LowStockResponse {
  items: LowStockItem[];
  count: number;
  threshold: number;
}

export interface WarehouseSummaryItem {
  warehouseId: number;
  warehouseName: string;
  warehouseCode: string;
  location: string;
  capacity: number;
  usedCapacity: number;
  utilization: number;
  totalItems: number;
  totalQuantity: number;
  totalSaleable: number;
  totalReserved: number;
  totalValue: number;
  uniqueProducts: number;
  pendingQC: number;
}

export interface WarehouseSummaryResponse {
  warehouses: WarehouseSummaryItem[];
  count: number;
  totals: {
    totalQuantity: number;
    totalSaleable: number;
    totalValue: number;
    totalPendingQC: number;
  };
}

export interface AvailableStockItem {
  productId: number;
  productName: string;
  sku: string;
  category: string;
  totalQuantity: number;
  totalSaleable: number;
  totalReserved: number;
  totalValue: number;
  warehouseCount: number;
  avgUnitPrice: number;
}

export interface AvailableStockResponse {
  items: AvailableStockItem[];
  count: number;
  summary: {
    totalSaleableUnits: number;
    totalStockValue: number;
    totalProducts: number;
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useLowStock(enabled: boolean) {
  return useQuery<LowStockResponse>({
    queryKey: ['sales-assistant', 'low-stock'],
    queryFn: () => api.get('/api/sales-assistant/low-stock'),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useWarehouseSummary(enabled: boolean) {
  return useQuery<WarehouseSummaryResponse>({
    queryKey: ['sales-assistant', 'warehouse-summary'],
    queryFn: () => api.get('/api/sales-assistant/warehouse-summary'),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useAvailableStock(enabled: boolean) {
  return useQuery<AvailableStockResponse>({
    queryKey: ['sales-assistant', 'available-stock'],
    queryFn: () => api.get('/api/sales-assistant/available-stock'),
    enabled,
    staleTime: 30 * 1000,
  });
}

// ─── Voice Matching ──────────────────────────────────────────────────────────

const ACTION_KEYWORDS: Record<AssistantAction, string[]> = {
  low_stock: [
    'low stock', 'low inventory', 'shortage', 'running low', 'out of stock',
    'less stock', 'kam stock', 'stock kam', 'khatam', 'finish',
    'critical stock', 'reorder', 'minimum stock',
  ],
  warehouse_summary: [
    'warehouse', 'godown', 'storage', 'warehouse summary',
    'warehouse overview', 'all warehouses', 'godown summary',
    'capacity', 'utilization',
  ],
  available_stock: [
    'available', 'stock available', 'current stock', 'in stock',
    'what do we have', 'show stock', 'stock list', 'all stock',
    'kitna stock', 'total stock', 'inventory check',
  ],
};

export function matchVoiceToAction(transcript: string): AssistantAction | null {
  const text = transcript.toLowerCase().trim();

  // Score each action based on keyword matches
  let bestAction: AssistantAction | null = null;
  let bestScore = 0;

  for (const [action, keywords] of Object.entries(ACTION_KEYWORDS) as [AssistantAction, string[]][]) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        // Longer keyword matches get higher priority
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestAction = action;
    }
  }

  return bestAction;
}

export const ACTION_LABELS: Record<AssistantAction, { icon: string; title: string; description: string }> = {
  low_stock: {
    icon: '⚠️',
    title: 'Check Low Stock',
    description: 'Products running below safe levels',
  },
  warehouse_summary: {
    icon: '🏭',
    title: 'Warehouse Summary',
    description: 'Overview of all warehouses',
  },
  available_stock: {
    icon: '📦',
    title: 'Available Stock',
    description: 'All products currently in stock',
  },
};
