/**
 * Format a number as Indian Rupee currency
 */
export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num == null || isNaN(num)) return '₹0';

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number with Indian locale (no currency symbol)
 */
export function formatNumber(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num == null || isNaN(num)) return '0';

  return new Intl.NumberFormat('en-IN').format(num);
}

/**
 * Format a date as DD MMM YYYY (Indian format)
 */
export function formatDate(
  date: string | Date | null | undefined
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date as DD MMM YYYY, HH:mm
 */
export function formatDateTime(
  date: string | Date | null | undefined
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Relative time ago (e.g. "2 hours ago")
 */
export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Status label formatters
 */
export const statusLabels: Record<string, string> = {
  available: 'Available',
  reserved: 'Reserved',
  quarantined: 'Quarantined',
  pending_qc: 'Pending QC',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  planned: 'Planned',
  loading: 'Loading',
  cancelled: 'Cancelled',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  draft: 'Draft',
  approved: 'Approved',
  completed: 'Completed',
  partial: 'Partial',
};

export const statusColors: Record<string, string> = {
  available: '#10b981',
  reserved: '#3b82f6',
  quarantined: '#ef4444',
  pending_qc: '#8b5cf6',
  in_transit: '#f59e0b',
  delivered: '#10b981',
  planned: '#6b7280',
  loading: '#f59e0b',
  cancelled: '#ef4444',
  confirmed: '#3b82f6',
  processing: '#f59e0b',
  shipped: '#8b5cf6',
  pending: '#f59e0b',
  accepted: '#10b981',
  rejected: '#ef4444',
  draft: '#6b7280',
  approved: '#10b981',
  completed: '#10b981',
  partial: '#f59e0b',
};

export function getStatusLabel(status: string): string {
  return statusLabels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function getStatusColor(status: string): string {
  return statusColors[status] || '#6b7280';
}

/**
 * Role display labels
 */
export const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  inventory_manager: 'Inventory Manager',
  sales_manager: 'Sales Manager',
  warehouse_manager: 'Warehouse Manager',
  logistics_coordinator: 'Logistics Coordinator',
  finance_head: 'Finance Head',
  distribution_head: 'Distribution Head',
  accounts_team: 'Accounts Team',
  business_analyst: 'Business Analyst',
  transport_coordinator: 'Transport Coordinator',
};

export function getRoleLabel(role: string): string {
  return roleLabels[role] || role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Tier badge colors for dealers
 */
export const tierColors: Record<string, string> = {
  Platinum: '#94a3b8',
  Gold: '#f59e0b',
  Silver: '#9ca3af',
  Bronze: '#d97706',
};
