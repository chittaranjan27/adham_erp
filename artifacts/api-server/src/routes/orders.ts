import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, dealersTable, activitiesTable, inventoryTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { releaseExpiredReservations } from "../lib/releaseExpiredReservations";
import { pushSalesVoucher, pushSalesOrderVoucher, cancelTallyVoucher } from "../lib/tallyClient";

const router = Router();

// ─── Validation helpers ──────────────────────────────────────────────────────

function isPositiveInt(v: any): boolean {
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
}

function isPositiveNumber(v: any): boolean {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function isNonNegativeNumber(v: any): boolean {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

interface ValidationError { field: string; message: string }

function validateOrderPayload(body: any): ValidationError[] {
  const errors: ValidationError[] = [];

  // dealerId
  if (!body.dealerId && body.dealerId !== 0) {
    errors.push({ field: "dealerId", message: "Dealer is required" });
  } else if (!isPositiveInt(body.dealerId)) {
    errors.push({ field: "dealerId", message: "Please select a valid dealer" });
  }

  // items
  if (!Array.isArray(body.items)) {
    errors.push({ field: "items", message: "Order items are required" });
  } else if (body.items.length === 0) {
    errors.push({ field: "items", message: "Add at least one product to the order" });
  } else {
    body.items.forEach((item: any, idx: number) => {
      const pos = `Item ${idx + 1}`;
      if (!isPositiveInt(item.productId)) {
        errors.push({ field: `items[${idx}].productId`, message: `${pos}: Select a valid product` });
      }
      if (!isPositiveInt(item.quantity)) {
        errors.push({ field: `items[${idx}].quantity`, message: `${pos}: Quantity must be a positive whole number` });
      }
      if (!isPositiveNumber(item.unitPrice)) {
        errors.push({ field: `items[${idx}].unitPrice`, message: `${pos}: Unit price must be greater than 0` });
      }
    });
  }

  // advancePaid — optional but must be valid if provided
  if (body.advancePaid !== undefined && body.advancePaid !== "" && body.advancePaid !== null) {
    if (!isNonNegativeNumber(body.advancePaid)) {
      errors.push({ field: "advancePaid", message: "Advance paid must be a non-negative number" });
    }
  }

  return errors;
}

// ─── Format helper ───────────────────────────────────────────────────────────

function formatOrder(order: any, dealer: any) {
  const items = (order.items as any[]) ?? [];
  const totalAmount = Number(order.totalAmount);
  const advancePaid = Number(order.advancePaid ?? 0);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    dealerId: order.dealerId,
    dealerName: dealer?.name ?? "Unknown",
    status: order.status,
    totalAmount,
    advancePaid,
    balanceAmount: totalAmount - advancePaid,
    items: items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName ?? "",
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.unitPrice) * Number(item.quantity),
    })),
    isStockReserved: order.isStockReserved ?? false,
    reservedUntil: order.reservedUntil ? new Date(order.reservedUntil).toISOString() : null,
    proofOfDelivery: order.proofOfDelivery ?? null,
    deliveredAt: order.deliveredAt ? new Date(order.deliveredAt).toISOString() : null,
    notes: order.notes ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

// ─── GET /orders ──────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  // Auto-release expired stock reservations so callers always see fresh data.
  releaseExpiredReservations().catch((err) => req.log?.warn(err, "releaseExpiredReservations failed silently"));

  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const dealerId = req.query.dealer_id ? Number(req.query.dealer_id) : undefined;

    let query = db
      .select({ order: ordersTable, dealer: dealersTable })
      .from(ordersTable)
      .leftJoin(dealersTable, eq(ordersTable.dealerId, dealersTable.id));

    const conditions = [];
    if (status) conditions.push(eq(ordersTable.status, status));
    if (dealerId && isPositiveInt(dealerId)) conditions.push(eq(ordersTable.dealerId, dealerId));
    if (conditions.length > 0) query = query.where(conditions[0]) as any;

    const [rows, [totalResult]] = await Promise.all([
      query.limit(limit).offset(offset).orderBy(sql`${ordersTable.createdAt} DESC`),
      db.select({ count: count() }).from(ordersTable),
    ]);

    res.json({
      items: rows.map(({ order, dealer }) => formatOrder(order, dealer)),
      total: Number(totalResult?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ─── POST /orders ─────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const body = req.body ?? {};

    // 1. Validate request payload
    const validationErrors = validateOrderPayload(body);
    if (validationErrors.length > 0) {
      return res.status(422).json({
        error: "Invalid order data",
        fields: validationErrors.map(e => e.message),
        details: validationErrors,
      });
    }

    const dealerId = Number(body.dealerId);
    const items: any[] = body.items;
    const advance = isNonNegativeNumber(body.advancePaid) ? Number(body.advancePaid) : 0;

    // 2. Verify dealer exists
    const dealer = await db.select().from(dealersTable).where(eq(dealersTable.id, dealerId)).then(r => r[0]);
    if (!dealer) {
      return res.status(422).json({
        error: "Invalid order data",
        fields: ["Selected dealer does not exist"],
        details: [{ field: "dealerId", message: "Selected dealer does not exist" }],
      });
    }

    // 3. Compute total from validated items
    const sanitisedItems = items.map(item => ({
      productId: Number(item.productId),
      productName: item.productName ?? "",
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));

    const totalAmount = sanitisedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    if (!isPositiveNumber(totalAmount)) {
      return res.status(422).json({
        error: "Invalid order data",
        fields: ["Order total must be greater than 0"],
        details: [{ field: "totalAmount", message: "Order total must be greater than 0" }],
      });
    }

    if (advance > totalAmount) {
      return res.status(422).json({
        error: "Invalid order data",
        fields: [`Advance paid (₹${advance.toLocaleString("en-IN")}) cannot exceed total (₹${totalAmount.toLocaleString("en-IN")})`],
        details: [{ field: "advancePaid", message: "Advance paid cannot exceed total amount" }],
      });
    }

    // 4. Create order
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;
    const shouldReserve = advance > 0;
    const reservedUntil = shouldReserve ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : undefined;

    const [order] = await db.insert(ordersTable).values({
      orderNumber,
      dealerId,
      totalAmount: String(totalAmount),
      advancePaid: String(advance),
      items: JSON.parse(JSON.stringify(sanitisedItems)),
      status: shouldReserve ? "reserved" : "pending",
      isStockReserved: shouldReserve,
      reservedUntil,
      notes: body.notes ?? null,
    }).returning();

    // 5. Best-effort stock reservation when advance is paid
    if (shouldReserve) {
      for (const item of sanitisedItems) {
        try {
          const invItems = await db.select().from(inventoryTable)
            .where(eq(inventoryTable.productId, item.productId));

          let remaining = item.quantity;
          for (const inv of invItems) {
            if (remaining <= 0) break;
            if (inv.status !== "available" || !inv.isGrnReleased) continue;
            const toReserve = Math.min(remaining, inv.saleableQuantity ?? 0);
            if (toReserve <= 0) continue;

            await db.update(inventoryTable).set({
              reservedQuantity: (inv.reservedQuantity ?? 0) + toReserve,
              saleableQuantity: (inv.saleableQuantity ?? 0) - toReserve,
              reservedUntil,
              orderId: order.id,
              status: (inv.saleableQuantity ?? 0) - toReserve === 0 ? "reserved" : "available",
              updatedAt: new Date(),
            }).where(eq(inventoryTable.id, inv.id));

            remaining -= toReserve;
          }
        } catch (e) {
          req.log.warn({ productId: item.productId, err: e }, "Stock reservation failed for item (non-fatal)");
        }
      }
    }

    // 6. Activity log
    await db.insert(activitiesTable).values({
      type: "order",
      description: `New order ${orderNumber} from ${dealer.name} — ${sanitisedItems.length} item(s) · ₹${totalAmount.toLocaleString("en-IN")}${shouldReserve ? " — stock reserved 7 days" : ""}`,
      user: "Sales Team",
      status: "completed",
    });

    // 7. Simulate WhatsApp notification
    if (dealer.phone) {
      await db.insert(activitiesTable).values({
        type: "notification",
        description: `WhatsApp confirmation sent to ${dealer.name} (+91 ${dealer.phone}) for order ${orderNumber}`,
        user: "System",
        status: "completed",
      });
    }

    // 8. Auto-sync Sales Order to TallyPrime (fire-and-forget)
    pushSalesOrderVoucher({
      orderNumber,
      dealerName: dealer.name,
      totalAmount,
      advancePaid: advance,
      items: sanitisedItems.map(item => ({
        productName: item.productName || `Product #${item.productId}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      date: new Date(),
    })
      .then(async (result) => {
        await db.insert(activitiesTable).values({
          type: "tally_sync",
          description: result.success
            ? `Tally Sales Order created for ${orderNumber} — ${dealer.name}`
            : `Tally sync failed for ${orderNumber} — ${result.message}`,
          user: "System",
          status: result.success ? "completed" : "rejected",
        });
      })
      .catch((err) => {
        req.log.warn({ err, orderNumber }, "Tally Sales Order sync failed (non-fatal)");
      });

    res.status(201).json(formatOrder(order, dealer));
  } catch (err: any) {
    req.log.error({ err: err?.message, stack: err?.stack }, "Order creation failed");
    res.status(500).json({ error: "Failed to create order. Please try again." });
  }
});

// ─── GET /orders/:id ──────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isPositiveInt(id)) return res.status(400).json({ error: "Invalid order ID" });

    const [row] = await db
      .select({ order: ordersTable, dealer: dealersTable })
      .from(ordersTable)
      .leftJoin(dealersTable, eq(ordersTable.dealerId, dealersTable.id))
      .where(eq(ordersTable.id, id));

    if (!row) return res.status(404).json({ error: "Order not found" });
    res.json(formatOrder(row.order, row.dealer));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// ─── PATCH /orders/:id ────────────────────────────────────────────────────────
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isPositiveInt(id)) return res.status(400).json({ error: "Invalid order ID" });

    // Fetch the current order BEFORE applying any update so we can compare
    // the old advancePaid value against the new one to detect the payment transition.
    const [existingOrder] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existingOrder) return res.status(404).json({ error: "Order not found" });

    const { status, advancePaid, proofOfDelivery, deliveredAt } = req.body ?? {};
    const updates: any = { updatedAt: new Date() };

    const VALID_STATUSES = ["pending", "confirmed", "reserved", "dispatched", "delivered", "cancelled"];
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(422).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` });
      }
      updates.status = status;
    }
    if (advancePaid !== undefined) {
      if (!isNonNegativeNumber(advancePaid)) {
        return res.status(422).json({ error: "advancePaid must be a non-negative number" });
      }
      updates.advancePaid = String(Number(advancePaid));
    }
    if (proofOfDelivery !== undefined) updates.proofOfDelivery = proofOfDelivery;
    if (deliveredAt !== undefined) {
      const d = new Date(deliveredAt);
      if (isNaN(d.getTime())) return res.status(422).json({ error: "Invalid deliveredAt date" });
      updates.deliveredAt = d;
    }
    
    // Additional fields for editing incorrect data
    const { dealerId, notes, items } = req.body ?? {};
    if (dealerId !== undefined) {
      if (!isPositiveInt(dealerId)) return res.status(422).json({ error: "Invalid dealer ID" });
      updates.dealerId = Number(dealerId);
    }
    if (notes !== undefined) {
      updates.notes = notes;
    }
    if (items !== undefined && Array.isArray(items)) {
      updates.items = items;
      const newItemsTotal = items.reduce((sum: number, item: any) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
      updates.totalAmount = String(newItemsTotal);
    }

    const [order] = await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id)).returning();

    // ─── Helper: Sync current order state to Tally (fire-and-forget) ───────────
    // This function is called from EVERY code path to ensure Tally always
    // receives the latest data, regardless of whether it's a reservation,
    // delivery, cancellation, or a simple field edit.
    const syncOrderToTally = async (latestOrder: any) => {
      console.log(`[TallySync] Triggered for order ${latestOrder.orderNumber}, status=${latestOrder.status}, requestStatus=${status}`);
      const effectiveStatus = latestOrder.status ?? order.status;
      const isNewDelivery = status === "delivered" && existingOrder.status !== "delivered";
      const isNewCancel = status === "cancelled" && existingOrder.status !== "cancelled";

      // Cancellation → delete/reverse the voucher in Tally
      if (isNewCancel) {
        const tallyDealer = await db.select().from(dealersTable).where(eq(dealersTable.id, latestOrder.dealerId)).then(r => r[0]);
        cancelTallyVoucher({
          voucherNumber: latestOrder.orderNumber,
          voucherType: "Sales",
          dealerName: tallyDealer?.name ?? "Unknown",
          totalAmount: Number(latestOrder.totalAmount),
          reason: `Order ${latestOrder.orderNumber} cancelled from ERP`,
          date: new Date(),
        })
          .then(async (result) => {
            await db.insert(activitiesTable).values({
              type: "tally_sync",
              description: result.success
                ? `Tally: ${result.message}`
                : `Tally cancellation failed for ${latestOrder.orderNumber} — ${result.message}`,
              user: "System",
              status: result.success ? "completed" : "rejected",
            });
          })
          .catch((err) => {
            console.warn("Tally cancel sync failed (non-fatal)", err);
          });
        return;
      }

      const tallyDealer = await db.select().from(dealersTable).where(eq(dealersTable.id, latestOrder.dealerId)).then(r => r[0]);
      const orderItems = (latestOrder.items as any[]) ?? [];
      const voucherData = {
        orderNumber: latestOrder.orderNumber,
        dealerName: tallyDealer?.name ?? "Unknown",
        totalAmount: Number(latestOrder.totalAmount),
        advancePaid: Number(latestOrder.advancePaid ?? 0),
        items: orderItems.map((item: any) => ({
          productName: item.productName ?? `Product #${item.productId}`,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        date: latestOrder.deliveredAt ?? new Date(latestOrder.createdAt),
        // Use "Create" for brand-new status transitions, "Alter" for edits to existing vouchers
        action: isNewDelivery ? "Create" as const : "Alter" as const,
      };

      // Delivered orders → Sales Invoice; all others → Sales Order (Accounting voucher)
      if (effectiveStatus === "delivered") {
        pushSalesVoucher(voucherData)
          .then(async (result) => {
            await db.insert(activitiesTable).values({
              type: "tally_sync",
              description: result.success
                ? `Tally: Sales Invoice ${isNewDelivery ? "created" : "updated"} for #${latestOrder.orderNumber}`
                : `Tally sync failed for #${latestOrder.orderNumber} — ${result.message}`,
              user: "System",
              status: result.success ? "completed" : "rejected",
            });
          })
          .catch((err) => { console.error(`[TallySync] Sales Invoice push error for ${latestOrder.orderNumber}:`, err); });
      } else {
        pushSalesOrderVoucher(voucherData)
          .then(async (result) => {
            await db.insert(activitiesTable).values({
              type: "tally_sync",
              description: result.success
                ? `Tally: Sales Order updated for #${latestOrder.orderNumber}`
                : `Tally sync failed for #${latestOrder.orderNumber} — ${result.message}`,
              user: "System",
              status: result.success ? "completed" : "rejected",
            });
          })
          .catch((err) => { console.error(`[TallySync] Sales Order push error for ${latestOrder.orderNumber}:`, err); });
      }
    };

    // ─── Advance-paid-later reservation trigger ────────────────────────────────
    // Conditions that must ALL be true to fire:
    //   1. advancePaid is being changed in this request
    //   2. The old value was 0 (no advance was ever paid before)
    //   3. The new value is > 0 (a payment is now being recorded)
    //   4. Stock is not already reserved (prevents double-locking)
    //   5. The order is in a reservable status (not cancelled/dispatched/delivered)
    //   6. This PATCH is not simultaneously cancelling the order
    const oldAdvance = Number(existingOrder.advancePaid ?? 0);
    const newAdvance = advancePaid !== undefined ? Number(advancePaid) : oldAdvance;
    const TERMINAL_STATUSES = ["cancelled", "dispatched", "delivered"];
    const isOrderReservable = !TERMINAL_STATUSES.includes(existingOrder.status) &&
      status !== "cancelled";

    const shouldTriggerReservation =
      advancePaid !== undefined &&
      oldAdvance === 0 &&
      newAdvance > 0 &&
      !existingOrder.isStockReserved &&
      isOrderReservable;

    if (shouldTriggerReservation) {
      const reservedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const orderItems = (existingOrder.items as any[]) ?? [];
      let anyReserved = false;

      for (const item of orderItems) {
        try {
          const invItems = await db.select().from(inventoryTable)
            .where(eq(inventoryTable.productId, Number(item.productId)));

          let remaining = Number(item.quantity);
          for (const inv of invItems) {
            if (remaining <= 0) break;
            if (inv.status !== "available" || !inv.isGrnReleased) continue;
            const toReserve = Math.min(remaining, inv.saleableQuantity ?? 0);
            if (toReserve <= 0) continue;

            await db.update(inventoryTable).set({
              reservedQuantity: (inv.reservedQuantity ?? 0) + toReserve,
              saleableQuantity: (inv.saleableQuantity ?? 0) - toReserve,
              reservedUntil,
              orderId: id,
              status: (inv.saleableQuantity ?? 0) - toReserve === 0 ? "reserved" : "available",
              updatedAt: new Date(),
            }).where(eq(inventoryTable.id, inv.id));

            remaining -= toReserve;
            anyReserved = true;
          }
        } catch (e) {
          req.log.warn({ productId: item.productId, err: e }, "Advance-payment stock reservation failed for item (non-fatal)");
        }
      }

      // Update order fields to reflect the reservation
      await db.update(ordersTable).set({
        isStockReserved: true,
        reservedUntil,
        status: updates.status ?? "reserved",
        updatedAt: new Date(),
      }).where(eq(ordersTable.id, id));

      await db.insert(activitiesTable).values({
        type: "order",
        description: `Advance payment recorded for order ${order.orderNumber} — stock reserved for 7 days${!anyReserved ? " (no matching inventory found)" : ""}`,
        user: "Sales Team",
        status: "completed",
      });

      // Re-fetch the fully updated order and SYNC TO TALLY before returning
      const [refreshed] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
      syncOrderToTally(refreshed);
      const dealer = await db.select().from(dealersTable).where(eq(dealersTable.id, refreshed.dealerId)).then(r => r[0]);
      return res.json(formatOrder(refreshed, dealer));
    }

    // ─── Sync ALL other updates to Tally ───────────────────────────────────────
    syncOrderToTally(order);

    const dealer = await db.select().from(dealersTable).where(eq(dealersTable.id, order.dealerId)).then(r => r[0]);
    res.json(formatOrder(order, dealer));
  } catch (err: any) {
    req.log.error({ err: err?.message }, "Order update failed");
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;
