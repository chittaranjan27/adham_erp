import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryTable, ordersTable, dispatchesTable, warehousesTable, dealersTable, activitiesTable, productsTable } from "@workspace/db";
import { eq, and, count, sum, sql } from "drizzle-orm";

const router = Router();

router.get("/summary", async (req, res) => {
  try {
    const [inventoryResult] = await db
      .select({ totalValue: sql<number>`sum(cast(${inventoryTable.unitPrice} as numeric) * ${inventoryTable.quantity})` })
      .from(inventoryTable)
      .where(eq(inventoryTable.status, "available"));

    const [ordersResult] = await db.select({ count: count() }).from(ordersTable);
    const [dispatchesResult] = await db
      .select({ count: count() })
      .from(dispatchesTable)
      .where(sql`${dispatchesTable.status} IN ('planned', 'loading', 'in_transit')`);
    const [warehousesResult] = await db
      .select({ count: count() })
      .from(warehousesTable)
      .where(eq(warehousesTable.isActive, true));
    const [dealersResult] = await db.select({ count: count() }).from(dealersTable);
    const [pendingQCResult] = await db
      .select({ count: count() })
      .from(inventoryTable)
      .where(eq(inventoryTable.status, "quarantined"));
    const [inTransitResult] = await db
      .select({ count: count() })
      .from(dispatchesTable)
      .where(eq(dispatchesTable.status, "in_transit"));

    const [monthlyRevenueResult] = await db
      .select({ total: sql<number>`sum(cast(${ordersTable.totalAmount} as numeric))` })
      .from(ordersTable)
      .where(sql`${ordersTable.createdAt} >= NOW() - INTERVAL '30 days'`);

    // Saleable stock: sum of saleable_quantity for GRN-released, available items
    const [saleableResult] = await db
      .select({ totalSaleable: sql<number>`coalesce(sum(${inventoryTable.saleableQuantity}), 0)` })
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.status, "available"),
        eq(inventoryTable.isGrnReleased, true)
      ));

    // Low stock: count products whose total saleable quantity is below threshold (50 units)
    const lowStockRows = await db
      .select({
        productId: inventoryTable.productId,
        total: sql<number>`sum(${inventoryTable.saleableQuantity})`,
      })
      .from(inventoryTable)
      .where(and(
        eq(inventoryTable.status, "available"),
        eq(inventoryTable.isGrnReleased, true)
      ))
      .groupBy(inventoryTable.productId)
      .having(sql`sum(${inventoryTable.saleableQuantity}) < 50`);

    res.json({
      totalInventoryValue: Number(inventoryResult?.totalValue ?? 0),
      totalOrders: Number(ordersResult?.count ?? 0),
      pendingDispatches: Number(dispatchesResult?.count ?? 0),
      activeWarehouses: Number(warehousesResult?.count ?? 0),
      totalDealers: Number(dealersResult?.count ?? 0),
      monthlyRevenue: Number(monthlyRevenueResult?.total ?? 0),
      inventoryTurnover: 4.2,
      pendingQC: Number(pendingQCResult?.count ?? 0),
      inTransitShipments: Number(inTransitResult?.count ?? 0),
      quarantinedItems: Number(pendingQCResult?.count ?? 0),
      totalSaleableQuantity: Number(saleableResult?.totalSaleable ?? 0),
      lowStockProductCount: lowStockRows.length,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

router.get("/inventory-trends", async (req, res) => {
  try {
    // Aggregate total inventory value per month from actual data
    const rows = await db
      .select({
        month: sql<string>`to_char(${inventoryTable.createdAt}, 'Mon')`,
        value: sql<number>`sum(cast(${inventoryTable.unitPrice} as numeric) * ${inventoryTable.quantity})`,
      })
      .from(inventoryTable)
      .groupBy(sql`to_char(${inventoryTable.createdAt}, 'Mon'), date_trunc('month', ${inventoryTable.createdAt})`)
      .orderBy(sql`date_trunc('month', ${inventoryTable.createdAt}) DESC`)
      .limit(6);

    const data = rows.reverse().map((r, i, arr) => ({
      month: r.month,
      value: Number(r.value ?? 0),
      previousValue: i > 0 ? Number(arr[i - 1].value ?? 0) : 0,
    }));

    res.json(data.length > 0 ? data : [
      { month: "No data", value: 0, previousValue: 0 },
    ]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch inventory trends" });
  }
});

router.get("/revenue-trends", async (req, res) => {
  try {
    // Aggregate order revenue per month from actual data
    const rows = await db
      .select({
        month: sql<string>`to_char(${ordersTable.createdAt}, 'Mon')`,
        value: sql<number>`sum(cast(${ordersTable.totalAmount} as numeric))`,
      })
      .from(ordersTable)
      .where(sql`${ordersTable.status} != 'cancelled'`)
      .groupBy(sql`to_char(${ordersTable.createdAt}, 'Mon'), date_trunc('month', ${ordersTable.createdAt})`)
      .orderBy(sql`date_trunc('month', ${ordersTable.createdAt}) DESC`)
      .limit(6);

    const data = rows.reverse().map((r, i, arr) => ({
      month: r.month,
      value: Number(r.value ?? 0),
      previousValue: i > 0 ? Number(arr[i - 1].value ?? 0) : 0,
    }));

    res.json(data.length > 0 ? data : [
      { month: "No data", value: 0, previousValue: 0 },
    ]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch revenue trends" });
  }
});

router.get("/warehouse-stock", async (req, res) => {
  try {
    const warehouses = await db.select().from(warehousesTable).where(eq(warehousesTable.isActive, true));
    const result = warehouses.map((w) => ({
      warehouse: w.name,
      code: w.code,
      stock: w.usedCapacity ?? 0,
      value: (w.usedCapacity ?? 0) * 1200,
      utilization: w.capacity ? Math.round(((w.usedCapacity ?? 0) / w.capacity) * 100) : 0,
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch warehouse stock" });
  }
});

router.get("/recent-activities", async (req, res) => {
  try {
    const activities = await db
      .select()
      .from(activitiesTable)
      .orderBy(sql`${activitiesTable.createdAt} DESC`)
      .limit(10);

    res.json(
      activities.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        user: a.user,
        timestamp: a.createdAt.toISOString(),
        status: a.status,
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

export default router;
