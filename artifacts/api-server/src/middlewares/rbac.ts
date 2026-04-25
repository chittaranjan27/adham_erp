import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "adhams-erp-jwt-secret-2026";

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

// Extend Express Request so downstream handlers can read req.role and req.userId
declare global {
  namespace Express {
    interface Request {
      role?: string;
      userId?: number;
      userName?: string;
    }
  }
}

/**
 * JWT authentication middleware.
 *
 * Verifies the `Authorization: Bearer <token>` header, extracts the user's
 * role and ID, and attaches them to the request object.
 *
 * Use this as a global middleware to gate all API routes behind authentication.
 * The `/auth/login` route should be mounted BEFORE this middleware.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authentication required",
      code: "UNAUTHENTICATED",
      hint: "Provide a valid JWT in the Authorization header as 'Bearer <token>'",
    });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      role: string;
      name: string;
      email: string;
    };

    if (!VALID_ROLES.has(decoded.role)) {
      res.status(403).json({
        error: `Invalid role '${decoded.role}' in token`,
        code: "FORBIDDEN",
      });
      return;
    }

    // Attach user info to request for downstream handlers
    req.role = decoded.role;
    req.userId = decoded.userId;
    req.userName = decoded.name;
    next();
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      res.status(401).json({
        error: "Session expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
      return;
    }
    res.status(401).json({
      error: "Invalid authentication token",
      code: "INVALID_TOKEN",
    });
  }
}

/**
 * Permission-based authorization middleware factory.
 *
 * Returns a middleware that checks whether the authenticated user's role
 * has the requested permission. Must be used AFTER `requireAuth`.
 *
 * Usage:
 *   router.post("/orders", requirePermission("write_orders"), handler);
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.role;

    if (!role || !VALID_ROLES.has(role)) {
      res.status(401).json({
        error: "Authentication required",
        code: "UNAUTHENTICATED",
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

    next();
  };
}
