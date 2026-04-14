import { Router } from "express";
import { db } from "@workspace/db";
import { warehousesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const warehouses = await db.select().from(warehousesTable);
    res.json(
      warehouses.map((w) => ({
        ...w,
        creditLimit: undefined,
        outstandingBalance: undefined,
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch warehouses" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { code, name, location, address, manager, capacity } = req.body;
    const [warehouse] = await db.insert(warehousesTable).values({
      code,
      name,
      location,
      address,
      manager,
      capacity: capacity ?? 10000,
    }).returning();

    res.status(201).json(warehouse);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create warehouse" });
  }
});

export default router;
