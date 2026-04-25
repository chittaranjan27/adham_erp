import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "./AuthContext";

export type AppRole =
  | "super_admin"
  | "admin"
  | "inventory_manager"
  | "finance_head"
  | "logistics_coordinator"
  | "sales_manager"
  | "warehouse_manager"
  | "accounts_team"
  | "distribution_head"
  | "business_analyst"
  | "transport_coordinator";

export interface RolePermissions {
  modules: string[];
  canCreate: string[];
  label: string;
  initials: string;
  name: string;
  email: string;
}

// Module path → permission key mapping
const ALL_MODULES = [
  "/", "/inventory", "/products", "/orders", "/warehouses",
  "/dealers", "/logistics", "/finance", "/users",
  "/purchase-orders", "/grn", "/import-workflow",
];

export const ROLE_CONFIG: Record<AppRole, RolePermissions> = {
  super_admin: {
    label: "Super Admin",
    initials: "SA",
    name: "Adhams Admin",
    email: "superadmin@adhams.com",
    modules: ALL_MODULES,
    canCreate: ["inventory", "products", "orders", "dealers", "users", "warehouses", "dispatches", "purchase_orders", "grn", "approve", "edit", "create"],
  },
  admin: {
    label: "Admin",
    initials: "AD",
    name: "Platform Admin",
    email: "admin@adhams.com",
    modules: ALL_MODULES,
    canCreate: ["inventory", "products", "orders", "dealers", "users", "warehouses", "dispatches", "purchase_orders", "grn", "approve", "edit", "create"],
  },
  inventory_manager: {
    label: "Inventory Manager",
    initials: "IM",
    name: "Murali G",
    email: "murali@adhams.com",
    modules: ["/", "/inventory", "/products", "/warehouses", "/grn", "/purchase-orders"],
    canCreate: ["inventory", "products", "grn", "create", "edit"],
  },
  finance_head: {
    label: "Finance Head",
    initials: "FH",
    name: "Ravi Patil",
    email: "ravi.p@adhams.com",
    modules: ["/", "/finance", "/orders", "/dealers", "/purchase-orders"],
    canCreate: ["edit"],
  },
  logistics_coordinator: {
    label: "Logistics Coordinator",
    initials: "LC",
    name: "Satheeshan K",
    email: "satheeshan@adhams.com",
    modules: ["/", "/logistics", "/inventory", "/warehouses", "/orders", "/grn"],
    canCreate: ["dispatches", "edit"],
  },
  sales_manager: {
    label: "Sales Manager",
    initials: "SM",
    name: "Vijay P",
    email: "vijay.p@adhams.com",
    modules: ["/", "/orders", "/dealers", "/products", "/inventory/saleable"],
    canCreate: ["orders", "dealers", "create", "edit"],
  },
  warehouse_manager: {
    label: "Warehouse Manager",
    initials: "WM",
    name: "Warehouse Head",
    email: "wh@adhams.com",
    modules: ["/", "/inventory", "/warehouses", "/grn", "/purchase-orders"],
    canCreate: ["inventory", "grn", "approve", "edit", "create"],
  },
  accounts_team: {
    label: "Accounts Team",
    initials: "AT",
    name: "Accounts Staff",
    email: "accounts@adhams.com",
    modules: ["/", "/finance", "/orders", "/purchase-orders"],
    canCreate: [],
  },
  distribution_head: {
    label: "Distribution Head",
    initials: "DH",
    name: "Distribution Head",
    email: "dist@adhams.com",
    modules: ["/", "/logistics", "/orders", "/inventory", "/warehouses", "/grn"],
    canCreate: ["dispatches", "approve", "edit"],
  },
  business_analyst: {
    label: "Business Analyst",
    initials: "BA",
    name: "Business Analyst",
    email: "ba@adhams.com",
    modules: ["/", "/finance", "/orders", "/inventory", "/products", "/purchase-orders"],
    canCreate: [],
  },
  transport_coordinator: {
    label: "Transport Coordinator",
    initials: "TC",
    name: "Transport Coord",
    email: "transport@adhams.com",
    modules: ["/", "/logistics", "/warehouses"],
    canCreate: ["dispatches", "edit"],
  },
};

interface RoleContextValue {
  role: AppRole;
  permissions: RolePermissions;
  can: (action: string) => boolean;
  hasModule: (path: string) => boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

/**
 * RoleProvider — derives the active role from the authenticated user.
 *
 * Instead of a client-side dropdown, the role now comes from the JWT-
 * authenticated user object in AuthContext. The ROLE_CONFIG lookup is
 * overridden with the actual user name/email from the auth session.
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Derive role from auth — fallback to super_admin only if no user (shouldn't happen,
  // since this provider is rendered inside the auth gate)
  const role: AppRole = (user?.role as AppRole) || "super_admin";

  // Build permissions from ROLE_CONFIG, but override name/email with actual auth user
  const basePermissions = ROLE_CONFIG[role] || ROLE_CONFIG.super_admin;
  const permissions: RolePermissions = {
    ...basePermissions,
    name: user?.name || basePermissions.name,
    email: user?.email || basePermissions.email,
    initials: user?.name
      ? user.name
          .split(" ")
          .map((w) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : basePermissions.initials,
  };

  const can = (action: string) => permissions.canCreate.includes(action);
  const hasModule = (path: string) => permissions.modules.includes(path);

  return (
    <RoleContext.Provider value={{ role, permissions, can, hasModule }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
