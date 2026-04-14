import { Router } from "express";
import { db } from "@workspace/db";
import { purchaseOrdersTable, warehousesTable, activitiesTable, importStagesTable, grnTable } from "@workspace/db";
import { eq, count, sql, desc } from "drizzle-orm";
import { IMPORT_STAGES } from "@workspace/db";

const router = Router();

function formatPO(po: any, warehouse?: any) {
  return {
    id: po.id,
    poNumber: po.poNumber,
    supplierName: po.supplierName,
    supplierGstin: po.supplierGstin,
    supplierCountry: po.supplierCountry,
    poType: po.poType,
    status: po.status,
    currency: po.currency,
    totalAmount: Number(po.totalAmount ?? 0),
    taxAmount: Number(po.taxAmount ?? 0),
    shippingAmount: Number(po.shippingAmount ?? 0),
    attachmentUrl: po.attachmentUrl,
    notes: po.notes,
    expectedDeliveryDate: po.expectedDeliveryDate?.toISOString() ?? null,
    warehouseId: po.warehouseId,
    warehouseName: warehouse?.name ?? null,
    createdBy: po.createdBy,
    isActive: po.isActive,
    createdAt: po.createdAt.toISOString(),
    updatedAt: po.updatedAt.toISOString(),
  };
}

// GET all POs
router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;
    const poType = req.query.type as string | undefined;

    let query = db
      .select({ po: purchaseOrdersTable, warehouse: warehousesTable })
      .from(purchaseOrdersTable)
      .leftJoin(warehousesTable, eq(purchaseOrdersTable.warehouseId, warehousesTable.id))
      .orderBy(desc(purchaseOrdersTable.createdAt));

    if (poType) query = query.where(eq(purchaseOrdersTable.poType, poType)) as any;

    const [rows, [totalResult]] = await Promise.all([
      query.limit(limit).offset(offset),
      db.select({ count: count() }).from(purchaseOrdersTable),
    ]);

    res.json({
      items: rows.map(({ po, warehouse }) => formatPO(po, warehouse)),
      total: Number(totalResult?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch purchase orders" });
  }
});

// POST create new PO
router.post("/", async (req, res) => {
  try {
    const {
      supplierName, supplierGstin, supplierCountry, poType, currency,
      totalAmount, taxAmount, shippingAmount, attachmentUrl, notes,
      expectedDeliveryDate, warehouseId, createdBy,
    } = req.body;

    if (!supplierName) return res.status(400).json({ error: "supplierName is required" });

    const poNumber = `PO-${poType?.toUpperCase() ?? "LCL"}-${Date.now().toString().slice(-8)}`;

    const [po] = await db.insert(purchaseOrdersTable).values({
      poNumber,
      supplierName,
      supplierGstin,
      supplierCountry: supplierCountry ?? "India",
      poType: poType ?? "local",
      currency: currency ?? "INR",
      totalAmount: totalAmount ? String(totalAmount) : "0",
      taxAmount: taxAmount ? String(taxAmount) : "0",
      shippingAmount: shippingAmount ? String(shippingAmount) : "0",
      attachmentUrl,
      notes,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      createdBy: createdBy ?? "system",
      status: "draft",
    }).returning();

    // For import POs, auto-create the 6 workflow stages
    if (poType === "import") {
      const stageRows = IMPORT_STAGES.map((stage, index) => ({
        poId: po.id,
        stage,
        stageIndex: index,
        status: index === 0 ? "in_progress" : "pending",
      }));
      await db.insert(importStagesTable).values(stageRows);
    }

    await db.insert(activitiesTable).values({
      type: "purchase",
      description: `Purchase Order ${poNumber} created from ${supplierName} (${poType ?? "local"})`,
      user: createdBy ?? "Purchase Team",
      status: "completed",
    });

    const warehouse = warehouseId
      ? await db.select().from(warehousesTable).where(eq(warehousesTable.id, Number(warehouseId))).then(r => r[0])
      : undefined;

    res.status(201).json(formatPO(po, warehouse));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create purchase order" });
  }
});

// GET single PO with stages
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db
      .select({ po: purchaseOrdersTable, warehouse: warehousesTable })
      .from(purchaseOrdersTable)
      .leftJoin(warehousesTable, eq(purchaseOrdersTable.warehouseId, warehousesTable.id))
      .where(eq(purchaseOrdersTable.id, id));

    if (!row) return res.status(404).json({ error: "Not found" });

    const stages = await db.select().from(importStagesTable).where(eq(importStagesTable.poId, id)).orderBy(importStagesTable.stageIndex);
    const grns = await db.select().from(grnTable).where(eq(grnTable.poId, id));

    res.json({ ...formatPO(row.po, row.warehouse), stages, grns });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch purchase order" });
  }
});

// PATCH update PO status/fields
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, attachmentUrl, notes, totalAmount } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (attachmentUrl !== undefined) updates.attachmentUrl = attachmentUrl;
    if (notes !== undefined) updates.notes = notes;
    if (totalAmount !== undefined) updates.totalAmount = String(totalAmount);

    const [po] = await db.update(purchaseOrdersTable).set(updates).where(eq(purchaseOrdersTable.id, id)).returning();
    if (!po) return res.status(404).json({ error: "Not found" });

    const warehouse = po.warehouseId
      ? await db.select().from(warehousesTable).where(eq(warehousesTable.id, po.warehouseId)).then(r => r[0])
      : undefined;

    res.json(formatPO(po, warehouse));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update purchase order" });
  }
});

// DELETE single PO
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    
    // Check if PO exists
    const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));
    if (!po) return res.status(404).json({ error: "Not found" });

    // Manually delete related stages and GRNs (if foreign key cascade is not present)
    await db.delete(importStagesTable).where(eq(importStagesTable.poId, id));
    await db.delete(grnTable).where(eq(grnTable.poId, id));
    
    // Delete PO
    await db.delete(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, id));

    await db.insert(activitiesTable).values({
      type: "purchase",
      description: `Purchase Order ${po.poNumber} deleted`,
      user: "Purchase Team",
      status: "completed",
    });

    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete purchase order" });
  }
});

export default router;
