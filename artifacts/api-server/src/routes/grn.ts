import { Router } from "express";
import { db } from "@workspace/db";
import { grnTable, purchaseOrdersTable, warehousesTable, inventoryTable, activitiesTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";

const router = Router();

function formatGrn(grn: any, po?: any, warehouse?: any) {
  return {
    id: grn.id,
    grnNumber: grn.grnNumber,
    poId: grn.poId,
    poNumber: po?.poNumber ?? null,
    supplierName: po?.supplierName ?? null,
    warehouseId: grn.warehouseId,
    warehouseName: warehouse?.name ?? null,
    inventoryId: grn.inventoryId,
    receivedDate: grn.receivedDate.toISOString(),
    totalItemsReceived: grn.totalItemsReceived,
    shortageQty: grn.shortageQty,
    damageQty: grn.damageQty,
    shortageNotes: grn.shortageNotes,
    damageNotes: grn.damageNotes,
    status: grn.status,
    verifiedBy: grn.verifiedBy,
    createdBy: grn.createdBy,
    isReleased: grn.isReleased,
    createdAt: grn.createdAt.toISOString(),
    updatedAt: grn.updatedAt.toISOString(),
  };
}

// GET all GRNs
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;

    const [rows, [totalResult]] = await Promise.all([
      db.select({ grn: grnTable, po: purchaseOrdersTable, warehouse: warehousesTable })
        .from(grnTable)
        .leftJoin(purchaseOrdersTable, eq(grnTable.poId, purchaseOrdersTable.id))
        .leftJoin(warehousesTable, eq(grnTable.warehouseId, warehousesTable.id))
        .orderBy(desc(grnTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(grnTable),
    ]);

    res.json({
      items: rows.map(({ grn, po, warehouse }) => formatGrn(grn, po, warehouse)),
      total: Number(totalResult?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch GRNs" });
  }
});

// POST create GRN (auto-called when inventory received)
router.post("/", async (req, res) => {
  try {
    const {
      poId, warehouseId, inventoryId, totalItemsReceived,
      shortageQty, damageQty, shortageNotes, damageNotes, createdBy,
    } = req.body;

    if (!warehouseId || !totalItemsReceived) {
      return res.status(400).json({ error: "warehouseId and totalItemsReceived are required" });
    }

    const grnNumber = `GRN-${Date.now().toString().slice(-8)}`;

    const [grn] = await db.insert(grnTable).values({
      grnNumber,
      poId: poId ? Number(poId) : undefined,
      warehouseId: Number(warehouseId),
      inventoryId: inventoryId ? Number(inventoryId) : undefined,
      totalItemsReceived: Number(totalItemsReceived),
      shortageQty: shortageQty ? Number(shortageQty) : 0,
      damageQty: damageQty ? Number(damageQty) : 0,
      shortageNotes,
      damageNotes,
      status: "pending",
      createdBy: createdBy ?? "system",
      isReleased: false,
    }).returning();

    await db.insert(activitiesTable).values({
      type: "grn",
      description: `GRN ${grnNumber} created — ${totalItemsReceived} items received`,
      user: createdBy ?? "Warehouse Team",
      status: "completed",
    });

    const po = poId ? await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, Number(poId))).then(r => r[0]) : undefined;
    const warehouse = await db.select().from(warehousesTable).where(eq(warehousesTable.id, Number(warehouseId))).then(r => r[0]);

    res.status(201).json(formatGrn(grn, po, warehouse));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create GRN" });
  }
});

// PATCH update GRN (verify / release)
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, verifiedBy, isReleased } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (verifiedBy !== undefined) updates.verifiedBy = verifiedBy;
    if (isReleased !== undefined) updates.isReleased = isReleased;

    const [grn] = await db.update(grnTable).set(updates).where(eq(grnTable.id, id)).returning();
    if (!grn) return res.status(404).json({ error: "Not found" });

    // If releasing GRN, update inventory item's isGrnReleased flag and saleable quantity
    if (isReleased && grn.inventoryId) {
      const inv = await db.select().from(inventoryTable).where(eq(inventoryTable.id, grn.inventoryId)).then(r => r[0]);
      if (inv) {
        await db.update(inventoryTable).set({
          isGrnReleased: true,
          saleableQuantity: inv.quantity - (inv.reservedQuantity ?? 0),
          status: "available",
          updatedAt: new Date(),
        }).where(eq(inventoryTable.id, grn.inventoryId));
      }

      await db.insert(activitiesTable).values({
        type: "grn",
        description: `GRN ${grn.grnNumber} released — stock now available for sale`,
        user: verifiedBy ?? "Warehouse Manager",
        status: "completed",
      });
    }

    const po = grn.poId ? await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, grn.poId)).then(r => r[0]) : undefined;
    const warehouse = await db.select().from(warehousesTable).where(eq(warehousesTable.id, grn.warehouseId)).then(r => r[0]);

    res.json(formatGrn(grn, po, warehouse));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update GRN" });
  }
});

export default router;
