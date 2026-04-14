import { Router } from "express";
import { db } from "@workspace/db";
import { warehouseLocationsTable, warehousesTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";

const router = Router();

function formatLocation(loc: any, warehouse?: any) {
  return {
    id: loc.id,
    warehouseId: loc.warehouseId,
    warehouseName: warehouse?.name ?? null,
    code: loc.code,
    name: loc.name,
    floor: loc.floor,
    section: loc.section,
    shelfNumber: loc.shelfNumber,
    capacity: loc.capacity,
    usedCapacity: loc.usedCapacity,
    utilizationPercent: loc.capacity ? Math.round(((loc.usedCapacity ?? 0) / loc.capacity) * 100) : 0,
    locationType: loc.locationType,
    isActive: loc.isActive,
    notes: loc.notes,
    createdAt: loc.createdAt.toISOString(),
  };
}

// GET locations — optionally filter by warehouse
router.get("/", async (req, res) => {
  try {
    const warehouseId = req.query.warehouse_id ? Number(req.query.warehouse_id) : undefined;

    let query = db
      .select({ loc: warehouseLocationsTable, warehouse: warehousesTable })
      .from(warehouseLocationsTable)
      .leftJoin(warehousesTable, eq(warehouseLocationsTable.warehouseId, warehousesTable.id))
      .orderBy(desc(warehouseLocationsTable.createdAt));

    if (warehouseId) query = query.where(eq(warehouseLocationsTable.warehouseId, warehouseId)) as any;

    const [rows, [totalResult]] = await Promise.all([
      query,
      db.select({ count: count() }).from(warehouseLocationsTable),
    ]);

    res.json({
      items: rows.map(({ loc, warehouse }) => formatLocation(loc, warehouse)),
      total: Number(totalResult?.count ?? 0),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch warehouse locations" });
  }
});

// POST create location
router.post("/", async (req, res) => {
  try {
    const { warehouseId, name, floor, section, shelfNumber, capacity, locationType, notes } = req.body;
    if (!warehouseId || !name) return res.status(400).json({ error: "warehouseId and name are required" });

    const code = [floor, section, shelfNumber].filter(Boolean).join("-") || `LOC-${Date.now().toString().slice(-4)}`;

    const [loc] = await db.insert(warehouseLocationsTable).values({
      warehouseId: Number(warehouseId),
      code,
      name,
      floor,
      section,
      shelfNumber,
      capacity: capacity ? Number(capacity) : 1000,
      usedCapacity: 0,
      locationType: locationType ?? "shelf",
      notes,
      isActive: true,
    }).returning();

    const warehouse = await db.select().from(warehousesTable).where(eq(warehousesTable.id, Number(warehouseId))).then(r => r[0]);

    res.status(201).json(formatLocation(loc, warehouse));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create warehouse location" });
  }
});

export default router;
