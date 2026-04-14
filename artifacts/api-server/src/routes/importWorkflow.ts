import { Router } from "express";
import { db } from "@workspace/db";
import {
  importStagesTable, purchaseOrdersTable, activitiesTable,
  grnTable, inventoryTable, productsTable,
} from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { IMPORT_STAGES } from "@workspace/db";

const router = Router();

export const STAGE_LABELS: Record<string, string> = {
  proforma_invoice: "Proforma Invoice",
  advance_payment: "Advance Payment",
  container_loading: "Container Loading",
  remaining_payment: "Remaining Payment",
  unloading_qc: "Unloading & QC",
  stocking: "Stocking",
};

// ─── Per-stage validation rules ──────────────────────────────────────────────
interface FieldRule {
  field: string;
  label: string;
  required: boolean | ((body: any) => boolean);
  message?: string;
}

const STAGE_VALIDATION: Record<string, FieldRule[]> = {
  proforma_invoice: [
    { field: "completedBy", label: "Completed By", required: true },
    { field: "attachmentUrl", label: "PI Document URL", required: true, message: "Please attach the Proforma Invoice document URL" },
  ],
  advance_payment: [
    { field: "completedBy", label: "Completed By", required: true },
    { field: "attachmentUrl", label: "Payment Receipt URL", required: true, message: "Please attach proof of advance payment" },
    { field: "notes", label: "Payment Reference / Amount", required: true, message: "Enter the payment reference number and amount paid" },
  ],
  container_loading: [
    { field: "completedBy", label: "Completed By", required: true },
    { field: "attachmentUrl", label: "Bill of Lading / Loading Confirmation URL", required: true, message: "Please attach the Bill of Lading or container loading confirmation" },
    { field: "notes", label: "Container / BL Number", required: true, message: "Enter the container number or Bill of Lading number" },
  ],
  remaining_payment: [
    { field: "completedBy", label: "Completed By", required: true },
    { field: "attachmentUrl", label: "Payment Receipt URL", required: true, message: "Please attach proof of remaining payment" },
    { field: "notes", label: "Payment Reference / Amount", required: true, message: "Enter the payment reference number and amount paid" },
  ],
  unloading_qc: [
    { field: "completedBy", label: "Completed By", required: true },
    { field: "shortageQty", label: "Shortage Qty", required: true, message: "Enter shortage quantity (enter 0 if none)" },
    { field: "damageQty", label: "Damage Qty", required: true, message: "Enter damage quantity (enter 0 if none)" },
    {
      field: "damageReport",
      label: "Damage Report",
      required: (body: any) => Number(body.damageQty ?? -1) > 0,
      message: "A detailed damage report is mandatory when damage quantity > 0",
    },
  ],
  stocking: [
    { field: "completedBy", label: "Completed By", required: true },
    { field: "productId", label: "Product", required: true, message: "Select the product being stocked into inventory" },
    { field: "quantity", label: "Quantity Received", required: true, message: "Enter the number of units placed into the warehouse" },
    { field: "notes", label: "Stocking Notes / GRN Reference", required: true, message: "Enter any stocking notes or location reference" },
  ],
};

function validateStageFields(stage: string, body: any): string[] {
  const rules = STAGE_VALIDATION[stage] ?? [];
  const errors: string[] = [];
  for (const rule of rules) {
    const isRequired = typeof rule.required === "function" ? rule.required(body) : rule.required;
    if (!isRequired) continue;
    const val = body[rule.field];
    const isNumericField = ["shortageQty", "damageQty", "quantity"].includes(rule.field);
    const missing = isNumericField
      ? val === undefined || val === null || val === ""
      : !val || (typeof val === "string" && val.trim() === "");
    if (missing) errors.push(rule.message ?? `"${rule.label}" is required`);
  }
  return errors;
}

// ─── Helper: generate GRN number ────────────────────────────────────────────
function makeGrnNumber(poId: number): string {
  const suffix = Date.now().toString().slice(-6);
  return `GRN-IMP-${String(poId).padStart(4, "0")}-${suffix}`;
}

function makeBarcode(grnNumber: string): string {
  return `ADH-${grnNumber}`;
}

// ─── GET all stages for a PO ─────────────────────────────────────────────────
router.get("/:poId", async (req, res) => {
  try {
    const poId = Number(req.params.poId);
    const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, poId));
    if (!po) return res.status(404).json({ error: "Purchase order not found" });

    const stages = await db.select().from(importStagesTable)
      .where(eq(importStagesTable.poId, poId))
      .orderBy(asc(importStagesTable.stageIndex));

    const currentStageIndex = stages.findIndex(s => s.status === "in_progress");
    const completedCount = stages.filter(s => s.status === "completed").length;

    res.json({
      poId: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      supplierCountry: po.supplierCountry,
      totalAmount: Number(po.totalAmount ?? 0),
      currency: po.currency,
      status: po.status,
      warehouseId: po.warehouseId,
      stages: stages.map(s => ({
        ...s,
        label: STAGE_LABELS[s.stage] ?? s.stage,
        requiredFields: STAGE_VALIDATION[s.stage]?.map(r => ({
          field: r.field,
          label: r.label,
          message: r.message,
          isConditional: typeof r.required === "function",
        })) ?? [],
        completedAt: s.completedAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      currentStageIndex,
      completedCount,
      totalStages: IMPORT_STAGES.length,
      progressPercent: Math.round((completedCount / IMPORT_STAGES.length) * 100),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch import workflow" });
  }
});

// ─── PATCH advance a stage ────────────────────────────────────────────────────
router.patch("/:poId/stage/:stageId", async (req, res) => {
  try {
    const poId = Number(req.params.poId);
    const stageId = Number(req.params.stageId);
    const body = req.body;
    const { notes, attachmentUrl, completedBy, shortageQty, damageQty, damageReport } = body;

    const [stage] = await db.select().from(importStagesTable).where(eq(importStagesTable.id, stageId));
    if (!stage) return res.status(404).json({ error: "Stage not found" });
    if (stage.poId !== poId) return res.status(400).json({ error: "Stage does not belong to this PO" });
    if (stage.status === "completed") return res.status(400).json({ error: "This stage is already completed" });

    // Fetch PO for warehouseId
    const [po] = await db.select().from(purchaseOrdersTable).where(eq(purchaseOrdersTable.id, poId));
    if (!po) return res.status(404).json({ error: "Purchase order not found" });

    // Sequential enforcement
    const allStages = await db.select().from(importStagesTable).where(eq(importStagesTable.poId, poId));
    const blockers = allStages.filter(s => s.stageIndex < stage.stageIndex && s.status !== "completed");
    if (blockers.length > 0) {
      return res.status(400).json({
        error: `Cannot complete this stage — "${STAGE_LABELS[blockers[0].stage]}" must be completed first`,
        blockedBy: blockers.map(s => STAGE_LABELS[s.stage]),
      });
    }

    // Per-stage mandatory field validation
    const validationErrors = validateStageFields(stage.stage, body);
    if (validationErrors.length > 0) {
      return res.status(422).json({ error: "Required fields are missing", fields: validationErrors });
    }

    // Build update payload
    const updates: any = {
      status: "completed",
      completedAt: new Date(),
      completedBy: completedBy ?? "Operations Team",
      notes: notes ?? null,
      attachmentUrl: attachmentUrl ?? null,
      updatedAt: new Date(),
    };

    if (stage.stage === "unloading_qc") {
      updates.shortageQty = shortageQty !== undefined ? Number(shortageQty) : 0;
      updates.damageQty = damageQty !== undefined ? Number(damageQty) : 0;
      updates.damageReport = damageReport ?? null;
    }

    await db.update(importStagesTable).set(updates).where(eq(importStagesTable.id, stageId));

    // ── Stocking stage: auto-create GRN + inventory entry ─────────────────
    let autoGrn: any = null;
    let autoInventory: any = null;

    const isLastStage = !allStages.some(s => s.stageIndex === stage.stageIndex + 1);
    if (stage.stage === "stocking" && isLastStage) {
      const productId = Number(body.productId);
      const qty = Number(body.quantity);
      const warehouseId = Number(po.warehouseId ?? 1);

      // Pull QC data from unloading_qc stage
      const qcStage = allStages.find(s => s.stage === "unloading_qc");
      const qcShortage = Number(qcStage?.shortageQty ?? 0);
      const qcDamage = Number(qcStage?.damageQty ?? 0);
      const damageNotes = qcStage?.damageReport ?? null;

      // Lookup product for unit price and HSN
      const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));

      // Generate identifiers
      const grnNumber = makeGrnNumber(poId);
      const barcode = makeBarcode(grnNumber);

      // Create GRN — status: pending, isReleased: false (warehouse manager releases later)
      const [newGrn] = await db.insert(grnTable).values({
        grnNumber,
        poId,
        warehouseId,
        totalItemsReceived: qty,
        shortageQty: qcShortage,
        damageQty: qcDamage,
        shortageNotes: qcShortage > 0 ? `${qcShortage} units missing per QC report` : null,
        damageNotes,
        status: "pending",
        createdBy: completedBy ?? "Operations Team",
        isReleased: false,
        receivedDate: new Date(),
      }).returning();

      autoGrn = newGrn;

      // Create inventory item — pending_qc state, saleable=0 until GRN released
      const [newInventory] = await db.insert(inventoryTable).values({
        barcode,
        productId,
        warehouseId,
        quantity: qty,
        saleableQuantity: 0,
        reservedQuantity: 0,
        unitPrice: product?.basePrice ? String(product.basePrice) : "0",
        hsnCode: product?.hsnCode ?? null,
        status: "pending_qc",
        qcStatus: "pending",
        grnId: newGrn.id,
        grnNumber: newGrn.grnNumber,
        isGrnReleased: false,
        binLocation: body.binLocation ?? null,
      }).returning();

      autoInventory = newInventory;

      // Link GRN back to inventory
      await db.update(grnTable)
        .set({ inventoryId: newInventory.id, updatedAt: new Date() })
        .where(eq(grnTable.id, newGrn.id));

      // Mark PO as completed
      await db.update(purchaseOrdersTable)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(purchaseOrdersTable.id, poId));

      await db.insert(activitiesTable).values({
        type: "grn_auto",
        description: `GRN ${grnNumber} auto-created from import PO #${po.poNumber} — ${qty} units of ${product?.name ?? `Product #${productId}`} pending QC at warehouse`,
        user: completedBy ?? "Operations Team",
        status: "completed",
      });
    } else {
      // Unlock next stage
      const nextStage = allStages.find(s => s.stageIndex === stage.stageIndex + 1);
      if (nextStage) {
        await db.update(importStagesTable)
          .set({ status: "in_progress", updatedAt: new Date() })
          .where(eq(importStagesTable.id, nextStage.id));
      }
    }

    await db.insert(activitiesTable).values({
      type: "import_workflow",
      description: `Import stage "${STAGE_LABELS[stage.stage]}" completed for PO ${po.poNumber} by ${completedBy ?? "Operations Team"}`,
      user: completedBy ?? "Operations Team",
      status: "completed",
    });

    // Return updated stages
    const updatedStages = await db.select().from(importStagesTable)
      .where(eq(importStagesTable.poId, poId))
      .orderBy(asc(importStagesTable.stageIndex));

    const completedCount = updatedStages.filter(s => s.status === "completed").length;

    res.json({
      success: true,
      stageName: STAGE_LABELS[stage.stage],
      completedCount,
      totalStages: IMPORT_STAGES.length,
      progressPercent: Math.round((completedCount / IMPORT_STAGES.length) * 100),
      // Auto-created records (only for stocking stage)
      autoGrn: autoGrn
        ? {
            id: autoGrn.id,
            grnNumber: autoGrn.grnNumber,
            status: autoGrn.status,
            totalItemsReceived: autoGrn.totalItemsReceived,
            warehouseId: autoGrn.warehouseId,
          }
        : null,
      autoInventory: autoInventory
        ? {
            id: autoInventory.id,
            barcode: autoInventory.barcode,
            status: autoInventory.status,
            quantity: autoInventory.quantity,
          }
        : null,
      stages: updatedStages.map(s => ({
        ...s,
        label: STAGE_LABELS[s.stage] ?? s.stage,
        completedAt: s.completedAt?.toISOString() ?? null,
        requiredFields: STAGE_VALIDATION[s.stage]?.map(r => ({
          field: r.field,
          label: r.label,
          message: r.message,
          isConditional: typeof r.required === "function",
        })) ?? [],
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to advance import stage" });
  }
});

export default router;
