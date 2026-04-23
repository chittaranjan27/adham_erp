import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import { eq, count, like, ilike } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;
    const category = req.query.category as string | undefined;

    let query = db.select().from(productsTable);
    if (category) query = query.where(eq(productsTable.category, category)) as any;

    const [items, [totalResult]] = await Promise.all([
      query.limit(limit).offset(offset),
      db.select({ count: count() }).from(productsTable),
    ]);

    res.json({
      items: items.map((p) => ({
        ...p,
        basePrice: Number(p.basePrice),
        createdAt: p.createdAt.toISOString(),
      })),
      total: Number(totalResult?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// ─── Landing cost auto-calculation helper ──────────────────────────────────
function computeLandingCostFields(body: any) {
  const purchaseCost = body.purchaseCost !== undefined ? Number(body.purchaseCost) : undefined;
  const logisticsCost = body.logisticsCost !== undefined ? Number(body.logisticsCost) : undefined;
  const additionalCharges = body.additionalCharges !== undefined ? Number(body.additionalCharges) : undefined;
  const marginPercent = body.marginPercent !== undefined ? Number(body.marginPercent) : undefined;

  const result: Record<string, string | undefined> = {};

  if (purchaseCost !== undefined) result.purchaseCost = String(purchaseCost);
  if (logisticsCost !== undefined) result.logisticsCost = String(logisticsCost);
  if (additionalCharges !== undefined) result.additionalCharges = String(additionalCharges);
  if (marginPercent !== undefined) result.marginPercent = String(marginPercent);

  // Auto-compute landingCost when any cost component is provided
  const pc = purchaseCost ?? 0;
  const lc = logisticsCost ?? 0;
  const ac = additionalCharges ?? 0;
  if (purchaseCost !== undefined || logisticsCost !== undefined || additionalCharges !== undefined) {
    const landingCost = pc + lc + ac;
    result.landingCost = String(landingCost);

    // Auto-compute sellingPrice when margin is also known
    if (marginPercent !== undefined && marginPercent >= 0) {
      result.sellingPrice = String(Math.round(landingCost * (1 + marginPercent / 100) * 100) / 100);
    }
  } else if (marginPercent !== undefined && body.landingCost !== undefined) {
    // Just margin changed with explicit landing cost
    const lc2 = Number(body.landingCost);
    if (lc2 > 0 && marginPercent >= 0) {
      result.sellingPrice = String(Math.round(lc2 * (1 + marginPercent / 100) * 100) / 100);
    }
  }

  return result;
}

router.post("/", async (req, res) => {
  try {
    const { name, category, subcategory, description, hsnCode, basePrice, unit, dimensions, weight, origin } = req.body;
    const masterBarcode = `ADH-PRD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Compute landing cost fields
    const costFields = computeLandingCostFields(req.body);

    const [product] = await db.insert(productsTable).values({
      name,
      category,
      subcategory,
      description,
      masterBarcode,
      hsnCode,
      basePrice: String(basePrice),
      unit,
      dimensions,
      weight,
      origin,
      ...costFields,
    }).returning();

    res.status(201).json({
      ...product,
      basePrice: Number(product.basePrice),
      landingCost: product.landingCost ? Number(product.landingCost) : null,
      sellingPrice: product.sellingPrice ? Number(product.sellingPrice) : null,
      purchaseCost: product.purchaseCost ? Number(product.purchaseCost) : null,
      logisticsCost: product.logisticsCost ? Number(product.logisticsCost) : null,
      additionalCharges: product.additionalCharges ? Number(product.additionalCharges) : null,
      marginPercent: product.marginPercent ? Number(product.marginPercent) : null,
      createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// PATCH /products/:id — update product
router.patch("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, category, subcategory, description, hsnCode, basePrice, unit, dimensions, weight, origin } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (category !== undefined) updates.category = category;
    if (subcategory !== undefined) updates.subcategory = subcategory;
    if (description !== undefined) updates.description = description;
    if (hsnCode !== undefined) updates.hsnCode = hsnCode;
    if (basePrice !== undefined) updates.basePrice = String(basePrice);
    if (unit !== undefined) updates.unit = unit;
    if (dimensions !== undefined) updates.dimensions = dimensions;
    if (weight !== undefined) updates.weight = weight;
    if (origin !== undefined) updates.origin = origin;

    // Auto-compute landing cost + selling price when cost components change
    // For PATCH, we need existing values to handle partial updates
    if (req.body.purchaseCost !== undefined || req.body.logisticsCost !== undefined || req.body.additionalCharges !== undefined || req.body.marginPercent !== undefined) {
      const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id));
      if (existing) {
        const mergedBody = {
          purchaseCost: req.body.purchaseCost ?? (existing.purchaseCost ? Number(existing.purchaseCost) : undefined),
          logisticsCost: req.body.logisticsCost ?? (existing.logisticsCost ? Number(existing.logisticsCost) : undefined),
          additionalCharges: req.body.additionalCharges ?? (existing.additionalCharges ? Number(existing.additionalCharges) : undefined),
          marginPercent: req.body.marginPercent ?? (existing.marginPercent ? Number(existing.marginPercent) : undefined),
          landingCost: existing.landingCost ? Number(existing.landingCost) : undefined,
        };
        const costFields = computeLandingCostFields(mergedBody);
        Object.assign(updates, costFields);
      }
    }

    const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json({
      ...product,
      basePrice: Number(product.basePrice),
      landingCost: product.landingCost ? Number(product.landingCost) : null,
      sellingPrice: product.sellingPrice ? Number(product.sellingPrice) : null,
      purchaseCost: product.purchaseCost ? Number(product.purchaseCost) : null,
      logisticsCost: product.logisticsCost ? Number(product.logisticsCost) : null,
      additionalCharges: product.additionalCharges ? Number(product.additionalCharges) : null,
      marginPercent: product.marginPercent ? Number(product.marginPercent) : null,
      createdAt: product.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

// DELETE /products/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) return res.status(404).json({ error: "Product not found" });

    await db.delete(productsTable).where(eq(productsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
