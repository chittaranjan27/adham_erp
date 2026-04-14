import { Router } from "express";
import {
  checkTallyConnection,
  pushSalesVoucher,
  pushReceiptVoucher,
  getDealerOutstanding,
} from "../lib/tallyClient";
import { db } from "@workspace/db";
import { ordersTable, dealersTable, activitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// ─── GET /tally/health — Check if Tally Prime is running and reachable ────────
router.get("/health", async (req, res) => {
  try {
    const result = await checkTallyConnection();
    res.json({
      connected: result.success,
      message: result.message,
      tallyUrl: `http://${process.env.TALLY_HOST ?? "localhost"}:${process.env.TALLY_PORT ?? "9000"}`,
    });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ connected: false, message: err.message });
  }
});

// ─── POST /tally/sync-order/:id — Manually push a delivered order to Tally ────
router.post("/sync-order/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));

    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "delivered") {
      return res.status(400).json({
        error: `Order is "${order.status}" — only delivered orders can be synced to Tally`,
      });
    }

    const dealer = await db
      .select()
      .from(dealersTable)
      .where(eq(dealersTable.id, order.dealerId))
      .then((r) => r[0]);

    if (!dealer) return res.status(400).json({ error: "Dealer not found for this order" });

    const items = (order.items as any[]) ?? [];
    const result = await pushSalesVoucher({
      orderNumber: order.orderNumber,
      dealerName: dealer.name,
      totalAmount: Number(order.totalAmount),
      advancePaid: Number(order.advancePaid ?? 0),
      items: items.map((item: any) => ({
        productName: item.productName ?? `Product #${item.productId}`,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        hsnCode: item.hsnCode,
      })),
      date: order.deliveredAt ?? undefined,
    });

    // Log the sync attempt
    await db.insert(activitiesTable).values({
      type: "tally_sync",
      description: result.success
        ? `Tally sync successful for order #${order.orderNumber} — Sales Invoice pushed`
        : `Tally sync FAILED for order #${order.orderNumber} — ${result.message}`,
      user: "System",
      status: result.success ? "completed" : "rejected",
    });

    res.json({
      success: result.success,
      orderNumber: order.orderNumber,
      dealerName: dealer.name,
      message: result.message,
    });
  } catch (err: any) {
    req.log.error(err, "Tally sync-order failed");
    res.status(500).json({ error: "Failed to sync order to Tally" });
  }
});

// ─── POST /tally/sync-advance/:id — Push advance payment receipt to Tally ─────
router.post("/sync-advance/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));

    if (!order) return res.status(404).json({ error: "Order not found" });
    
    const advancePaid = Number(order.advancePaid ?? 0);
    if (advancePaid <= 0) {
      return res.status(400).json({ error: "No advance payment recorded for this order" });
    }

    const dealer = await db
      .select()
      .from(dealersTable)
      .where(eq(dealersTable.id, order.dealerId))
      .then((r) => r[0]);

    if (!dealer) return res.status(400).json({ error: "Dealer not found" });

    const result = await pushReceiptVoucher({
      orderNumber: order.orderNumber,
      dealerName: dealer.name,
      amount: advancePaid,
      paymentReference: order.orderNumber,
    });

    await db.insert(activitiesTable).values({
      type: "tally_sync",
      description: result.success
        ? `Tally receipt voucher created for advance ₹${advancePaid.toLocaleString("en-IN")} on order #${order.orderNumber}`
        : `Tally receipt sync FAILED for order #${order.orderNumber} — ${result.message}`,
      user: "System",
      status: result.success ? "completed" : "rejected",
    });

    res.json({
      success: result.success,
      orderNumber: order.orderNumber,
      amount: advancePaid,
      message: result.message,
    });
  } catch (err: any) {
    req.log.error(err, "Tally sync-advance failed");
    res.status(500).json({ error: "Failed to sync advance to Tally" });
  }
});

// ─── GET /tally/dealer-balance/:dealerId — Fetch outstanding from Tally ────────
router.get("/dealer-balance/:dealerId", async (req, res) => {
  try {
    const dealerId = Number(req.params.dealerId);
    const dealer = await db
      .select()
      .from(dealersTable)
      .where(eq(dealersTable.id, dealerId))
      .then((r) => r[0]);

    if (!dealer) return res.status(404).json({ error: "Dealer not found" });

    const result = await getDealerOutstanding(dealer.name);

    res.json({
      dealerId: dealer.id,
      dealerName: dealer.name,
      tallyBalance: result.balance ?? null,
      erpBalance: Number(dealer.outstandingBalance ?? 0),
      synced: result.success,
      message: result.message,
    });
  } catch (err: any) {
    req.log.error(err, "Tally dealer-balance failed");
    res.status(500).json({ error: "Failed to fetch dealer balance from Tally" });
  }
});

export default router;
