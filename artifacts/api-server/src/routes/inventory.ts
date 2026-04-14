import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryTable, productsTable, warehousesTable, activitiesTable, grnTable } from "@workspace/db";
import { eq, and, sql, count, gte } from "drizzle-orm";
import { releaseExpiredReservations } from "../lib/releaseExpiredReservations";

const router = Router();

function formatItem(item: any, product?: any, warehouse?: any) {
  return {
    ...item,
    productName: product?.name ?? item.productName ?? "",
    category: product?.category ?? item.category ?? "",
    warehouseName: warehouse?.name ?? item.warehouseName ?? "",
    unitPrice: Number(item.unitPrice),
    landingCost: item.landingCost ? Number(item.landingCost) : null,
    sellingPrice: item.sellingPrice ? Number(item.sellingPrice) : null,
    totalValue: Number(item.unitPrice) * item.quantity,
    saleableValue: Number(item.unitPrice) * (item.saleableQuantity ?? item.quantity),
    isReserved: item.reservedQuantity > 0,
    reservedUntil: item.reservedUntil ? new Date(item.reservedUntil).toISOString() : null,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
    updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
  };
}

// GET all inventory (with optional saleable-only filter)
router.get("/", async (req, res) => {
  // Auto-release expired reservations on every inventory read.
  // The UPDATE is a no-op when nothing has expired, so this adds negligible overhead.
  releaseExpiredReservations().catch((err) => req.log?.warn(err, "releaseExpiredReservations failed silently"));

  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : undefined;
    const saleableOnly = req.query.saleable === "true";

    let query = db
      .select({
        id: inventoryTable.id,
        barcode: inventoryTable.barcode,
        productId: inventoryTable.productId,
        productName: productsTable.name,
        category: productsTable.category,
        warehouseId: inventoryTable.warehouseId,
        warehouseName: warehousesTable.name,
        locationId: inventoryTable.locationId,
        binLocation: inventoryTable.binLocation,
        status: inventoryTable.status,
        quantity: inventoryTable.quantity,
        saleableQuantity: inventoryTable.saleableQuantity,
        reservedQuantity: inventoryTable.reservedQuantity,
        reservedUntil: inventoryTable.reservedUntil,
        unitPrice: inventoryTable.unitPrice,
        landingCost: inventoryTable.landingCost,
        sellingPrice: inventoryTable.sellingPrice,
        grnId: inventoryTable.grnId,
        grnNumber: inventoryTable.grnNumber,
        isGrnReleased: inventoryTable.isGrnReleased,
        hsnCode: inventoryTable.hsnCode,
        qcStatus: inventoryTable.qcStatus,
        createdAt: inventoryTable.createdAt,
        updatedAt: inventoryTable.updatedAt,
      })
      .from(inventoryTable)
      .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
      .leftJoin(warehousesTable, eq(inventoryTable.warehouseId, warehousesTable.id));

    const conditions: any[] = [];
    if (status) conditions.push(eq(inventoryTable.status, status));
    if (warehouseId) conditions.push(eq(inventoryTable.warehouseId, warehouseId));
    if (saleableOnly) {
      conditions.push(eq(inventoryTable.status, "available"));
      conditions.push(eq(inventoryTable.isGrnReleased, true));
    }

    if (conditions.length > 0) query = query.where(and(...conditions)) as any;

    const [items, [totalResult]] = await Promise.all([
      query.limit(limit).offset(offset),
      db.select({ count: count() }).from(inventoryTable),
    ]);

    res.json({
      items: items.map(item => formatItem(item)),
      total: Number(totalResult?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// POST create inventory item — auto-generates GRN
router.post("/", async (req, res) => {
  try {
    const { productId, warehouseId, quantity, unitPrice, hsnCode, grossWeight, locationId, landingCost, sellingPrice, createGrn, poId, shortageQty, damageQty } = req.body;
    const barcode = `ADH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Auto-generate GRN number
    const grnNumber = `GRN-${Date.now().toString().slice(-8)}`;

    const [item] = await db.insert(inventoryTable).values({
      barcode,
      productId: Number(productId),
      warehouseId: Number(warehouseId),
      locationId: locationId ? Number(locationId) : undefined,
      quantity: Number(quantity),
      saleableQuantity: Number(quantity), // initially all saleable
      reservedQuantity: 0,
      unitPrice: String(unitPrice),
      landingCost: landingCost ? String(landingCost) : undefined,
      sellingPrice: sellingPrice ? String(sellingPrice) : undefined,
      hsnCode,
      grossWeight: grossWeight ? String(grossWeight) : undefined,
      status: "available",
      grnNumber,
      isGrnReleased: true, // auto-released unless PO-linked
    }).returning();

    // Create linked GRN record
    const [grn] = await db.insert(grnTable).values({
      grnNumber,
      poId: poId ? Number(poId) : undefined,
      warehouseId: Number(warehouseId),
      inventoryId: item.id,
      totalItemsReceived: Number(quantity),
      shortageQty: shortageQty ? Number(shortageQty) : 0,
      damageQty: damageQty ? Number(damageQty) : 0,
      status: "accepted",
      createdBy: "system",
      isReleased: true,
    }).returning();

    // Update GRN reference on inventory
    await db.update(inventoryTable).set({ grnId: grn.id }).where(eq(inventoryTable.id, item.id));

    await db.insert(activitiesTable).values({
      type: "inward",
      description: `New inventory received — GRN ${grnNumber} | Barcode: ${barcode}`,
      user: "Warehouse Team",
      status: "completed",
    });

    const product = await db.select().from(productsTable).where(eq(productsTable.id, Number(productId))).then(r => r[0]);
    const warehouse = await db.select().from(warehousesTable).where(eq(warehousesTable.id, Number(warehouseId))).then(r => r[0]);

    res.status(201).json({
      ...formatItem({ ...item, grnId: grn.id }, product, warehouse),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create inventory item" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [item] = await db
      .select({
        id: inventoryTable.id,
        barcode: inventoryTable.barcode,
        productId: inventoryTable.productId,
        productName: productsTable.name,
        category: productsTable.category,
        warehouseId: inventoryTable.warehouseId,
        warehouseName: warehousesTable.name,
        binLocation: inventoryTable.binLocation,
        status: inventoryTable.status,
        quantity: inventoryTable.quantity,
        saleableQuantity: inventoryTable.saleableQuantity,
        reservedQuantity: inventoryTable.reservedQuantity,
        reservedUntil: inventoryTable.reservedUntil,
        unitPrice: inventoryTable.unitPrice,
        landingCost: inventoryTable.landingCost,
        sellingPrice: inventoryTable.sellingPrice,
        grnId: inventoryTable.grnId,
        grnNumber: inventoryTable.grnNumber,
        isGrnReleased: inventoryTable.isGrnReleased,
        hsnCode: inventoryTable.hsnCode,
        qcStatus: inventoryTable.qcStatus,
        qcRejectionReason: inventoryTable.qcRejectionReason,
        qcNotes: inventoryTable.qcNotes,
        createdAt: inventoryTable.createdAt,
        updatedAt: inventoryTable.updatedAt,
      })
      .from(inventoryTable)
      .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
      .leftJoin(warehousesTable, eq(inventoryTable.warehouseId, warehousesTable.id))
      .where(eq(inventoryTable.id, id));

    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(formatItem(item));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch inventory item" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, binLocation, quantity, locationId } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (binLocation !== undefined) updates.binLocation = binLocation;
    if (quantity !== undefined) updates.quantity = quantity;
    if (locationId !== undefined) updates.locationId = locationId;

    const [item] = await db.update(inventoryTable).set(updates).where(eq(inventoryTable.id, id)).returning();
    if (!item) return res.status(404).json({ error: "Not found" });

    const product = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).then(r => r[0]);
    const warehouse = await db.select().from(warehousesTable).where(eq(warehousesTable.id, item.warehouseId)).then(r => r[0]);

    res.json(formatItem(item, product, warehouse));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update inventory item" });
  }
});

// POST reserve stock for an order
router.post("/:id/reserve", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { orderId, reserveQty } = req.body;

    const [item] = await db.select().from(inventoryTable).where(eq(inventoryTable.id, id));
    if (!item) return res.status(404).json({ error: "Not found" });

    const qty = Number(reserveQty);
    if (item.saleableQuantity < qty) {
      return res.status(400).json({ error: `Insufficient saleable stock. Available: ${item.saleableQuantity}` });
    }

    const reservedUntil = new Date();
    reservedUntil.setDate(reservedUntil.getDate() + 7); // 7-day lock

    const [updated] = await db.update(inventoryTable).set({
      reservedQuantity: (item.reservedQuantity ?? 0) + qty,
      saleableQuantity: item.saleableQuantity - qty,
      reservedUntil,
      orderId: orderId ? Number(orderId) : undefined,
      status: item.saleableQuantity - qty === 0 ? "reserved" : "available",
      updatedAt: new Date(),
    }).where(eq(inventoryTable.id, id)).returning();

    res.json({ success: true, reservedUntil: reservedUntil.toISOString(), item: formatItem(updated) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to reserve stock" });
  }
});

// Release expired reservations — on-demand trigger (also fires automatically on GET /)
router.post("/release-expired", async (req, res) => {
  try {
    const released = await releaseExpiredReservations();
    res.json({ released });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to release expired reservations" });
  }
});

router.post("/qc/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { decision, rejectionReason, notes } = req.body;
    const newStatus = decision === "accept" ? "available" : "quarantined";

    const [item] = await db
      .update(inventoryTable)
      .set({
        status: newStatus,
        qcStatus: decision,
        qcRejectionReason: rejectionReason,
        qcNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(inventoryTable.id, id))
      .returning();

    if (!item) return res.status(404).json({ error: "Not found" });

    await db.insert(activitiesTable).values({
      type: "qc",
      description: `QC ${decision === "accept" ? "approved" : "rejected"} for item ${item.barcode}${rejectionReason ? ` — ${rejectionReason}` : ""}`,
      user: "QC Team",
      status: decision === "accept" ? "completed" : "rejected",
    });

    const product = await db.select().from(productsTable).where(eq(productsTable.id, item.productId)).then(r => r[0]);
    const warehouse = await db.select().from(warehousesTable).where(eq(warehousesTable.id, item.warehouseId)).then(r => r[0]);

    res.json(formatItem(item, product, warehouse));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to process QC" });
  }
});

export default router;
