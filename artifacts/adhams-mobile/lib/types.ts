export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface DashboardSummary {
  totalInventoryValue: number;
  totalOrders: number;
  pendingDispatches: number;
  activeWarehouses: number;
  totalDealers: number;
  monthlyRevenue: number;
  inventoryTurnover: number;
  pendingQC: number;
  inTransitShipments: number;
  quarantinedItems: number;
  totalSaleableQuantity: number;
  lowStockProductCount: number;
}

export interface Activity {
  id: number;
  type: string;
  description: string;
  user: string;
  timestamp: string;
  status: string;
}

export interface RevenueTrend {
  month: string;
  value: number;
  previousValue: number;
}

export interface InventoryItem {
  id: number;
  barcode: string;
  productId: number;
  productName: string;
  category: string;
  warehouseId: number;
  warehouseName: string;
  locationId?: number;
  binLocation?: string;
  status: string;
  quantity: number;
  saleableQuantity: number;
  reservedQuantity: number;
  reservedUntil?: string;
  unitPrice: number;
  landingCost?: number;
  sellingPrice?: number;
  grnId?: number;
  grnNumber?: string;
  isGrnReleased: boolean;
  hsnCode?: string;
  qcStatus?: string;
  qcRejectionReason?: string;
  qcNotes?: string;
  totalValue: number;
  saleableValue: number;
  isReserved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  brand?: string;
  unit?: string;
  hsnCode?: string;
  basePrice?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
  location?: string;
  capacity?: number;
  usedCapacity?: number;
  isActive: boolean;
}

export interface Order {
  id: number;
  orderNumber: string;
  dealerId: number;
  dealerName?: string;
  status: string;
  items: OrderItem[];
  subtotal?: string;
  discountAmount?: string;
  shippingAmount?: string;
  gstRate?: string;
  supplyType?: string;
  cgst?: string;
  sgst?: string;
  igst?: string;
  totalAmount?: string;
  grandTotal?: string;
  advancePaid?: string;
  balanceAmount?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id?: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: string;
  total?: string;
}

export interface Dealer {
  id: number;
  name: string;
  dealerCode: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  creditLimit?: string;
  outstandingBalance?: string;
  commissionTier?: string;
  createdAt: string;
}

export interface GRN {
  id: number;
  grnNumber: string;
  poId?: number;
  warehouseId: number;
  warehouseName?: string;
  inventoryId?: number;
  supplierName?: string;
  totalItemsReceived: number;
  shortageQty: number;
  damageQty: number;
  status: string;
  isReleased: boolean;
  createdBy: string;
  verifiedBy?: string;
  qualityInspection?: {
    surfaceCondition?: string;
    edgeCondition?: string;
    warping?: string;
    shadeMatch?: string;
  };
  createdAt: string;
}

export interface Dispatch {
  id: number;
  dispatchNumber: string;
  orderId: number;
  orderNumber?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  routePlan?: string;
  status: string;
  dispatchDate?: string;
  deliveredDate?: string;
  proofOfDelivery?: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierName: string;
  type: 'local' | 'import';
  status: string;
  gstin?: string;
  country?: string;
  currency?: string;
  totalAmount?: string;
  taxAmount?: string;
  shippingAmount?: string;
  expectedDeliveryDate?: string;
  destinationWarehouseId?: number;
  attachmentUrl?: string;
  createdAt: string;
}

export interface ImportWorkflow {
  id: number;
  poId: number;
  stages: ImportStage[];
  currentStage: number;
  totalStages: number;
  status: string;
}

export interface ImportStage {
  id: number;
  stageNumber: number;
  name: string;
  status: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  data?: Record<string, unknown>;
}

export interface FinanceReport {
  grossRevenue: number;
  totalCost: number;
  grossMarginPercent: number;
  receivables: number;
  revenueByChannel: { channel: string; value: number }[];
  topProducts: { name: string; revenue: number; units: number }[];
}
