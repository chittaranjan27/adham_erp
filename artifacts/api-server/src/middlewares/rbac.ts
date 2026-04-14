import { Request, Response, NextFunction } from "express";

// ─── Valid role names (mirrors frontend ROLE_CONFIG keys) ─────────────────────
const VALID_ROLES = new Set([
  "super_admin",
  "admin",
  "inventory_manager",
  "finance_head",
  "logistics_coordinator",
  "sales_manager",
  "warehouse_manager",
  "accounts_team",
  "distribution_head",
  "business_analyst",
  "transport_coordinator",
]);

// ─── Permission tags ──────────────────────────────────────────────────────────
// "read"             – authenticated read; every valid role has this
// "write_orders"     – create / modify orders
// "write_inventory"  – create / modify inventory records
// "approve_grn"      – release GRN stock
// "write_dispatch"   – create / modify logistics dispatches

const ROLE_PERMISSIONS: Record<string, ReadonlySet<string>> = {
  super_admin:           new Set(["read", "write_orders", "write_inventory", "approve_grn", "write_dispatch"]),
  admin:                 new Set(["read", "write_orders", "write_inventory", "approve_grn", "write_dispatch"]),
  inventory_manager:     new Set(["read", "write_inventory"]),
  finance_head:          new Set(["read"]),
  logistics_coordinator: new Set(["read", "write_orders", "write_dispatch"]),
  sales_manager:         new Set(["read", "write_orders"]),
  warehouse_manager:     new Set(["read", "write_inventory", "approve_grn"]),
  accounts_team:         new Set(["read"]),
  distribution_head:     new Set(["read", "write_dispatch", "approve_grn"]),
  business_analyst:      new Set(["read"]),
  transport_coordinator: new Set(["read", "write_dispatch"]),
};

// Extend Express Request so downstream handlers can read req.role
declare global {
  namespace Express {
    interface Request {
      role?: string;
    }
  }
}

/**
 * Middleware factory.
 *
 * Returns a middleware that:
 *  1. Reads the `X-Role` request header.
 *  2. Returns HTTP 401 if the header is missing or not a recognised role.
 *  3. Returns HTTP 403 if the role lacks the requested permission.
 *  4. Attaches `req.role` for downstream handlers and calls `next()` on success.
 *
 * Usage:
 *   router.post("/orders", requirePermission("write_orders"), ordersRouter);
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = (req.headers["x-role"] as string | undefined)?.trim().toLowerCase();

    if (!role || !VALID_ROLES.has(role)) {
      res.status(401).json({
        error: "Missing or invalid X-Role header",
        code: "UNAUTHENTICATED",
        hint: `Provide a valid role in the X-Role header. Valid roles: ${[...VALID_ROLES].join(", ")}`,
      });
      return;
    }

    const perms = ROLE_PERMISSIONS[role] ?? new Set<string>();
    if (!perms.has(permission)) {
      res.status(403).json({
        error: `Role '${role}' does not have '${permission}' permission`,
        code: "FORBIDDEN",
      });
      return;
    }

    req.role = role;
    next();
  };
}
