import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import inventoryRouter from "./inventory";
import productsRouter from "./products";
import ordersRouter from "./orders";
import warehousesRouter from "./warehouses";
import dealersRouter from "./dealers";
import logisticsRouter from "./logistics";
import financeRouter from "./finance";
import usersRouter from "./users";
import purchaseOrdersRouter from "./purchaseOrders";
import grnRouter from "./grn";
import importWorkflowRouter from "./importWorkflow";
import warehouseLocationsRouter from "./warehouseLocations";
import tallyRouter from "./tally";
import salesAssistantRouter from "./salesAssistant";
import { requireAuth, requirePermission } from "../middlewares/rbac";

const router: IRouter = Router();

// ─── Public routes (no auth required) ────────────────────────────────────────
router.use(healthRouter);
router.use("/auth", authRouter);

// ─── All routes below require JWT authentication ─────────────────────────────
router.use(requireAuth);

// ─── Read-access routes ──────────────────────────────────────────────────────
router.use("/dashboard", dashboardRouter);
router.use("/products", productsRouter);
router.use("/warehouses", warehousesRouter);
router.use("/dealers", dealersRouter);
router.use("/finance", financeRouter);
router.use("/users", usersRouter);
router.use("/warehouse-locations", warehouseLocationsRouter);
router.use("/tally", tallyRouter);
router.use("/sales-assistant", salesAssistantRouter);

// ─── Protected routes — write-permission gates for mutating operations ───────

// Orders — create & update require write_orders
router.post("/orders", requirePermission("write_orders"));
router.patch("/orders/:id", requirePermission("write_orders"));

// Inventory — receive inward, update, and QC decision require write_inventory.
// POST /inventory/qc/:id is three segments deep so it needs its own rule —
// it would NOT be caught by the two-segment /inventory/:id pattern above.
router.post("/inventory", requirePermission("write_inventory"));
router.patch("/inventory/:id", requirePermission("write_inventory"));
router.post("/inventory/qc/:id", requirePermission("write_inventory"));

// GRN — creating a manual GRN requires write_inventory;
//       releasing stock (the PATCH that sets isReleased) requires approve_grn
router.post("/grn", requirePermission("write_inventory"));
router.patch("/grn/:id", requirePermission("approve_grn"));

// Logistics dispatches — create requires write_dispatch
router.post("/logistics/dispatches", requirePermission("write_dispatch"));
// NOTE: PATCH /logistics/dispatches/:id permission is enforced inside the logistics router

// Purchase orders — creating requires write_inventory (procurement)
router.post("/purchase-orders", requirePermission("write_inventory"));
router.patch("/purchase-orders/:id", requirePermission("write_inventory"));

// Import workflow stage advance — requires write_inventory
router.patch("/import-workflow/:poId/stage/:stageId", requirePermission("write_inventory"));

// ─── Mount actual routers ─────────────────────────────────────────────────────
router.use("/inventory", inventoryRouter);
router.use("/orders", ordersRouter);
router.use("/grn", grnRouter);
router.use("/logistics", logisticsRouter);
router.use("/purchase-orders", purchaseOrdersRouter);
router.use("/import-workflow", importWorkflowRouter);

export default router;
