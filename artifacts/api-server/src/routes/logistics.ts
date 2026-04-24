import { Router } from "express";
import { db } from "@workspace/db";
import { dispatchesTable, activitiesTable, ordersTable, dealersTable, inventoryTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { pushSalesVoucher } from "../lib/tallyClient";
import type { OrderPricingData } from "../lib/tallyClient";
import { requirePermission } from "../middlewares/rbac";

const router = Router();

// ─── GET /dispatches — List all dispatches ────────────────────────────────────
router.get("/dispatches", async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    let query = db.select().from(dispatchesTable);
    if (status) query = query.where(eq(dispatchesTable.status, status)) as any;

    const [items, [totalResult]] = await Promise.all([
      query.limit(limit).offset(offset).orderBy(sql`${dispatchesTable.createdAt} DESC`),
      db.select({ count: count() }).from(dispatchesTable),
    ]);

    // Enrich each dispatch with its order number and dealer name
    const enriched = await Promise.all(
      items.map(async (d) => {
        let orderNumber = "";
        let dealerName = "";
        try {
          const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, d.orderId));
          if (order) {
            orderNumber = order.orderNumber;
            const [dealer] = await db.select().from(dealersTable).where(eq(dealersTable.id, order.dealerId));
            dealerName = dealer?.name ?? "";
          }
        } catch { /* non-fatal */ }

        return {
          ...d,
          orderNumber,
          dealerName,
          dispatchDate: d.dispatchDate?.toISOString(),
          deliveryDate: d.deliveryDate?.toISOString(),
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        };
      })
    );

    res.json({
      items: enriched,
      total: Number(totalResult?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dispatches" });
  }
});

// ─── GET /dispatches/validate-order/:orderId — Barcode validation ─────────────
// Checks that every item in the order has a matching inventory row with a barcode.
router.get("/dispatches/validate-order/:orderId", async (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
    if (!order) return res.status(404).json({ error: "Order not found" });

    const items = (order.items as any[]) ?? [];
    const missingBarcodes: string[] = [];

    for (const item of items) {
      const productId = Number(item.productId);
      // Check if there's at least one inventory row for this product with a non-empty barcode
      const invRows = await db.select().from(inventoryTable)
        .where(eq(inventoryTable.productId, productId));

      const hasBarcoded = invRows.some(row => row.barcode && row.barcode.trim() !== "");
      if (!hasBarcoded) {
        missingBarcodes.push(item.productName || `Product #${productId}`);
      }
    }

    res.json({
      valid: missingBarcodes.length === 0,
      missingBarcodes,
      totalItems: items.length,
      verifiedItems: items.length - missingBarcodes.length,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to validate order for dispatch" });
  }
});

// ─── GET /dispatches/:id — Single dispatch detail ─────────────────────────────
router.get("/dispatches/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [dispatch] = await db.select().from(dispatchesTable).where(eq(dispatchesTable.id, id));
    if (!dispatch) return res.status(404).json({ error: "Dispatch not found" });

    res.json({
      ...dispatch,
      dispatchDate: dispatch.dispatchDate?.toISOString(),
      deliveryDate: dispatch.deliveryDate?.toISOString(),
      createdAt: dispatch.createdAt.toISOString(),
      updatedAt: dispatch.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dispatch" });
  }
});

// ─── POST /dispatches — Create a new dispatch + update order to "dispatched" ──
router.post("/dispatches", async (req, res) => {
  try {
    const { orderId, vehicleNumber, driverName, driverPhone, routePlan, dispatchDate } = req.body;

    if (!orderId || !vehicleNumber || !driverName) {
      return res.status(400).json({ error: "orderId, vehicleNumber, and driverName are required" });
    }

    // Verify order exists and is in a dispatchable state
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(orderId)));
    if (!order) return res.status(404).json({ error: "Order not found" });

    const NON_DISPATCHABLE = ["dispatched", "delivered", "cancelled"];
    if (NON_DISPATCHABLE.includes(order.status)) {
      return res.status(400).json({ error: `Order is already "${order.status}" — cannot dispatch again` });
    }

    const dispatchNumber = `DSP-${Date.now().toString().slice(-8)}`;
    const eWayBillNumber = `EWB${Math.random().toString().slice(2, 14)}`;

    const [dispatch] = await db.insert(dispatchesTable).values({
      dispatchNumber,
      orderId: Number(orderId),
      vehicleNumber,
      driverName,
      driverPhone,
      routePlan,
      eWayBillNumber,
      status: "planned",
      dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
    }).returning();

    // Update the linked order to "dispatched"
    await db.update(ordersTable).set({
      status: "dispatched",
      updatedAt: new Date(),
    }).where(eq(ordersTable.id, Number(orderId)));

    await db.insert(activitiesTable).values({
      type: "dispatch",
      description: `Dispatch ${dispatchNumber} created for order #${order.orderNumber} — Vehicle: ${vehicleNumber}, Driver: ${driverName}`,
      user: "Transport Team",
      status: "completed",
    });

    res.status(201).json({
      ...dispatch,
      orderNumber: order.orderNumber,
      dispatchDate: dispatch.dispatchDate?.toISOString(),
      deliveryDate: dispatch.deliveryDate?.toISOString(),
      createdAt: dispatch.createdAt.toISOString(),
      updatedAt: dispatch.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create dispatch" });
  }
});

// ─── PATCH /dispatches/:id — Update dispatch status (including delivery) ──────
router.patch("/dispatches/:id", requirePermission("write_dispatch"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, proofOfDelivery } = req.body;

    const [existing] = await db.select().from(dispatchesTable).where(eq(dispatchesTable.id, id));
    if (!existing) return res.status(404).json({ error: "Dispatch not found" });

    const VALID_STATUSES = ["planned", "loading", "in_transit", "delivered", "failed"];
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (proofOfDelivery) updates.proofOfDelivery = proofOfDelivery;

    // If marking as delivered, set deliveryDate
    if (status === "delivered") {
      updates.deliveryDate = new Date();

      // Also update the linked order to "delivered"
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, existing.orderId));
      if (order) {
        await db.update(ordersTable).set({
          status: "delivered",
          deliveredAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(ordersTable.id, existing.orderId));

        // Fire-and-forget Tally Sales Invoice sync
        const dealer = await db.select().from(dealersTable)
          .where(eq(dealersTable.id, order.dealerId))
          .then(r => r[0]);

        if (dealer) {
          const items = (order.items as any[]) ?? [];
          const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
          const taxRate = Number(order.taxRate ?? 0);
          const grandTotal = Number(order.grandTotal ?? 0);

          let pricing: OrderPricingData | undefined;
          if (taxRate > 0 || grandTotal > 0) {
            pricing = {
              subtotal,
              discountAmount: Number(order.discountAmount ?? 0),
              taxRate,
              taxType: (order.taxType ?? "intra") as "intra" | "inter",
              cgstAmount: Number(order.cgstAmount ?? 0),
              sgstAmount: Number(order.sgstAmount ?? 0),
              igstAmount: Number(order.igstAmount ?? 0),
              shippingAmount: Number(order.shippingAmount ?? 0),
              grandTotal: grandTotal > 0 ? grandTotal : Number(order.totalAmount),
            };
          }

          pushSalesVoucher({
            orderNumber: order.orderNumber,
            dealerName: dealer.name,
            totalAmount: Number(order.totalAmount),
            advancePaid: Number(order.advancePaid ?? 0),
            pricing,
            items: items.map((item: any) => ({
              productName: item.productName ?? `Product #${item.productId}`,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              hsnCode: item.hsnCode,
            })),
            date: new Date(),
          })
            .then(async (result) => {
              await db.insert(activitiesTable).values({
                type: "tally_sync",
                description: result.success
                  ? `Tally Sales Invoice auto-pushed on delivery of dispatch ${existing.dispatchNumber} — order #${order.orderNumber}`
                  : `Tally sync FAILED on delivery of ${existing.dispatchNumber} — ${result.message}`,
                user: "System",
                status: result.success ? "completed" : "rejected",
              });
            })
            .catch(() => { /* non-fatal */ });
        }

        // Activity log for delivery
        await db.insert(activitiesTable).values({
          type: "delivery",
          description: `Order #${order.orderNumber} marked DELIVERED via dispatch ${existing.dispatchNumber}${proofOfDelivery ? " — POD attached" : ""}`,
          user: "Transport Team",
          status: "completed",
        });
      }
    } else {
      // Activity log for status change
      await db.insert(activitiesTable).values({
        type: "dispatch",
        description: `Dispatch ${existing.dispatchNumber} status updated to "${status}"`,
        user: "Transport Team",
        status: "completed",
      });
    }

    const [updated] = await db.update(dispatchesTable).set(updates).where(eq(dispatchesTable.id, id)).returning();

    res.json({
      ...updated,
      dispatchDate: updated.dispatchDate?.toISOString(),
      deliveryDate: updated.deliveryDate?.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update dispatch" });
  }
});

export default router;
