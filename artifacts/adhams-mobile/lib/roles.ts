/**
 * Role-based access control configuration.
 * Mirrors the RBAC middleware on the server.
 */

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'inventory_manager'
  | 'sales_manager'
  | 'warehouse_manager'
  | 'logistics_coordinator'
  | 'finance_head'
  | 'distribution_head'
  | 'accounts_team'
  | 'business_analyst'
  | 'transport_coordinator';

export type AppModule =
  | 'dashboard'
  | 'inventory'
  | 'orders'
  | 'grn'
  | 'dealers'
  | 'logistics'
  | 'purchase_orders'
  | 'finance'
  | 'profile';

export type Permission =
  | 'read'
  | 'write_orders'
  | 'write_inventory'
  | 'approve_grn'
  | 'write_dispatch';

const ROLE_MODULES: Record<UserRole, AppModule[]> = {
  super_admin: ['dashboard', 'inventory', 'orders', 'grn', 'dealers', 'logistics', 'purchase_orders', 'finance', 'profile'],
  admin: ['dashboard', 'inventory', 'orders', 'grn', 'dealers', 'logistics', 'purchase_orders', 'finance', 'profile'],
  inventory_manager: ['dashboard', 'inventory', 'grn', 'purchase_orders', 'profile'],
  sales_manager: ['dashboard', 'orders', 'dealers', 'inventory', 'profile'],
  warehouse_manager: ['dashboard', 'inventory', 'grn', 'purchase_orders', 'profile'],
  logistics_coordinator: ['dashboard', 'logistics', 'inventory', 'orders', 'grn', 'profile'],
  finance_head: ['dashboard', 'finance', 'orders', 'dealers', 'purchase_orders', 'profile'],
  distribution_head: ['dashboard', 'logistics', 'orders', 'inventory', 'grn', 'profile'],
  accounts_team: ['dashboard', 'finance', 'orders', 'purchase_orders', 'profile'],
  business_analyst: ['dashboard', 'finance', 'orders', 'inventory', 'profile'],
  transport_coordinator: ['dashboard', 'logistics', 'profile'],
};

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: ['read', 'write_orders', 'write_inventory', 'approve_grn', 'write_dispatch'],
  admin: ['read', 'write_orders', 'write_inventory', 'approve_grn', 'write_dispatch'],
  inventory_manager: ['read', 'write_inventory'],
  sales_manager: ['read', 'write_orders'],
  warehouse_manager: ['read', 'write_inventory', 'approve_grn'],
  logistics_coordinator: ['read', 'write_orders', 'write_dispatch'],
  finance_head: ['read'],
  distribution_head: ['read', 'write_dispatch', 'approve_grn'],
  accounts_team: ['read'],
  business_analyst: ['read'],
  transport_coordinator: ['read', 'write_dispatch'],
};

export function hasModuleAccess(role: string, module: AppModule): boolean {
  const modules = ROLE_MODULES[role as UserRole];
  if (!modules) return false;
  return modules.includes(module);
}

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role as UserRole];
  if (!perms) return false;
  return perms.includes(permission);
}

export function getAccessibleModules(role: string): AppModule[] {
  return ROLE_MODULES[role as UserRole] || [];
}

export function isReadOnly(role: string): boolean {
  const perms = ROLE_PERMISSIONS[role as UserRole] || [];
  return perms.length === 1 && perms[0] === 'read';
}
