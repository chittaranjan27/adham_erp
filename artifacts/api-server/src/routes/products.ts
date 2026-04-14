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

router.post("/", async (req, res) => {
  try {
    const { name, category, subcategory, description, hsnCode, basePrice, unit, dimensions, weight, origin } = req.body;
    const masterBarcode = `ADH-PRD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

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
    }).returning();

    res.status(201).json({
      ...product,
      basePrice: Number(product.basePrice),
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

    const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json({
      ...product,
      basePrice: Number(product.basePrice),
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
