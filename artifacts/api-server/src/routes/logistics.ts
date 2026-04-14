import { Router } from "express";
import { db } from "@workspace/db";
import { dispatchesTable, activitiesTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

const router = Router();

router.get("/dispatches", async (req, res) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    let query = db.select().from(dispatchesTable);
    if (status) query = query.where(eq(dispatchesTable.status, status)) as any;

    const [items, [totalResult]] = await Promise.all([
      query.limit(limit).offset(offset).orderBy(sql`${dispatchesTable.createdAt} DESC`),
      db.select({ count: count() }).from(dispatchesTable),
    ]);

    res.json({
      items: items.map((d) => ({
        ...d,
        dispatchDate: d.dispatchDate?.toISOString(),
        deliveryDate: d.deliveryDate?.toISOString(),
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
      total: Number(totalResult?.count ?? 0),
      page,
      limit,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dispatches" });
  }
});

router.post("/dispatches", async (req, res) => {
  try {
    const { orderId, vehicleNumber, driverName, driverPhone, routePlan, dispatchDate } = req.body;
    const dispatchNumber = `DSP-${Date.now().toString().slice(-8)}`;
    const eWayBillNumber = `EWB${Math.random().toString().slice(2, 14)}`;

    const [dispatch] = await db.insert(dispatchesTable).values({
      dispatchNumber,
      orderId,
      vehicleNumber,
      driverName,
      driverPhone,
      routePlan,
      eWayBillNumber,
      status: "planned",
      dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
    }).returning();

    await db.insert(activitiesTable).values({
      type: "dispatch",
      description: `Dispatch ${dispatchNumber} created for vehicle ${vehicleNumber}`,
      user: "Transport Team",
      status: "completed",
    });

    res.status(201).json({
      ...dispatch,
      dispatchDate: dispatch.dispatchDate?.toISOString(),
      deliveryDate: dispatch.deliveryDate?.toISOString(),
      createdAt: dispatch.createdAt.toISOString(),
      updatedAt: dispatch.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create dispatch" });
  }
});

export default router;
