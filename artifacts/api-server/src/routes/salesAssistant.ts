import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryTable, productsTable, warehousesTable } from "@workspace/db";
import { eq, and, sql, count, sum } from "drizzle-orm";

const router = Router();

// ─── Low Stock Items ─────────────────────────────────────────────────────────
// Returns products whose total saleable quantity is below a threshold (50 units)
router.get("/low-stock", async (req, res) => {
  try {
    const threshold = Number(req.query.threshold ?? 50);

    const rows = await db
      .select({
        productId: inventoryTable.productId,
        productName: productsTable.name,
        sku: productsTable.masterBarcode,
        category: productsTable.category,
        totalQuantity: sql<number>`sum(${inventoryTable.quantity})`,
        totalSaleable: sql<number>`sum(${inventoryTable.saleableQuantity})`,
        totalReserved: sql<number>`sum(${inventoryTable.reservedQuantity})`,
        warehouseCount: sql<number>`count(distinct ${inventoryTable.warehouseId})`,
        avgUnitPrice: sql<number>`avg(cast(${inventoryTable.unitPrice} as numeric))`,
      })
      .from(inventoryTable)
      .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
      .where(
        and(
          eq(inventoryTable.status, "available"),
          eq(inventoryTable.isGrnReleased, true)
        )
      )
      .groupBy(inventoryTable.productId, productsTable.name, productsTable.masterBarcode, productsTable.category)
      .having(sql`sum(${inventoryTable.saleableQuantity}) < ${threshold}`)
      .orderBy(sql`sum(${inventoryTable.saleableQuantity}) ASC`);

    res.json({
      items: rows.map((r) => ({
        productId: r.productId,
        productName: r.productName ?? "Unknown",
        sku: r.sku ?? "—",
        category: r.category ?? "—",
        totalQuantity: Number(r.totalQuantity ?? 0),
        totalSaleable: Number(r.totalSaleable ?? 0),
        totalReserved: Number(r.totalReserved ?? 0),
        warehouseCount: Number(r.warehouseCount ?? 0),
        avgUnitPrice: Math.round(Number(r.avgUnitPrice ?? 0) * 100) / 100,
      })),
      count: rows.length,
      threshold,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch low stock items" });
  }
});

// ─── Warehouse Summary ───────────────────────────────────────────────────────
// Returns per-warehouse aggregated stock overview
router.get("/warehouse-summary", async (req, res) => {
  try {
    const warehouses = await db
      .select()
      .from(warehousesTable)
      .where(eq(warehousesTable.isActive, true));

    const results = await Promise.all(
      warehouses.map(async (w) => {
        const [stockResult] = await db
          .select({
            totalItems: count(),
            totalQuantity: sql<number>`coalesce(sum(${inventoryTable.quantity}), 0)`,
            totalSaleable: sql<number>`coalesce(sum(${inventoryTable.saleableQuantity}), 0)`,
            totalReserved: sql<number>`coalesce(sum(${inventoryTable.reservedQuantity}), 0)`,
            totalValue: sql<number>`coalesce(sum(cast(${inventoryTable.unitPrice} as numeric) * ${inventoryTable.quantity}), 0)`,
            uniqueProducts: sql<number>`count(distinct ${inventoryTable.productId})`,
          })
          .from(inventoryTable)
          .where(eq(inventoryTable.warehouseId, w.id));

        const [pendingQC] = await db
          .select({ count: count() })
          .from(inventoryTable)
          .where(
            and(
              eq(inventoryTable.warehouseId, w.id),
              eq(inventoryTable.status, "pending_qc")
            )
          );

        return {
          warehouseId: w.id,
          warehouseName: w.name,
          warehouseCode: w.code,
          location: w.location ?? "—",
          capacity: w.capacity ?? 0,
          usedCapacity: w.usedCapacity ?? 0,
          utilization: w.capacity
            ? Math.round(((w.usedCapacity ?? 0) / w.capacity) * 100)
            : 0,
          totalItems: Number(stockResult?.totalItems ?? 0),
          totalQuantity: Number(stockResult?.totalQuantity ?? 0),
          totalSaleable: Number(stockResult?.totalSaleable ?? 0),
          totalReserved: Number(stockResult?.totalReserved ?? 0),
          totalValue: Math.round(Number(stockResult?.totalValue ?? 0) * 100) / 100,
          uniqueProducts: Number(stockResult?.uniqueProducts ?? 0),
          pendingQC: Number(pendingQC?.count ?? 0),
        };
      })
    );

    res.json({
      warehouses: results,
      count: results.length,
      totals: {
        totalQuantity: results.reduce((s, r) => s + r.totalQuantity, 0),
        totalSaleable: results.reduce((s, r) => s + r.totalSaleable, 0),
        totalValue: Math.round(results.reduce((s, r) => s + r.totalValue, 0) * 100) / 100,
        totalPendingQC: results.reduce((s, r) => s + r.pendingQC, 0),
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch warehouse summary" });
  }
});

// ─── Available Stock ─────────────────────────────────────────────────────────
// Returns all available, GRN-released products grouped by product
router.get("/available-stock", async (req, res) => {
  try {
    const rows = await db
      .select({
        productId: inventoryTable.productId,
        productName: productsTable.name,
        sku: productsTable.masterBarcode,
        category: productsTable.category,
        totalQuantity: sql<number>`sum(${inventoryTable.quantity})`,
        totalSaleable: sql<number>`sum(${inventoryTable.saleableQuantity})`,
        totalReserved: sql<number>`sum(${inventoryTable.reservedQuantity})`,
        totalValue: sql<number>`sum(cast(${inventoryTable.unitPrice} as numeric) * ${inventoryTable.quantity})`,
        warehouseCount: sql<number>`count(distinct ${inventoryTable.warehouseId})`,
        avgUnitPrice: sql<number>`avg(cast(${inventoryTable.unitPrice} as numeric))`,
      })
      .from(inventoryTable)
      .leftJoin(productsTable, eq(inventoryTable.productId, productsTable.id))
      .where(
        and(
          eq(inventoryTable.status, "available"),
          eq(inventoryTable.isGrnReleased, true)
        )
      )
      .groupBy(inventoryTable.productId, productsTable.name, productsTable.masterBarcode, productsTable.category)
      .orderBy(sql`sum(${inventoryTable.saleableQuantity}) DESC`);

    const totalSaleable = rows.reduce((s, r) => s + Number(r.totalSaleable ?? 0), 0);
    const totalValue = rows.reduce((s, r) => s + Number(r.totalValue ?? 0), 0);

    res.json({
      items: rows.map((r) => ({
        productId: r.productId,
        productName: r.productName ?? "Unknown",
        sku: r.sku ?? "—",
        category: r.category ?? "—",
        totalQuantity: Number(r.totalQuantity ?? 0),
        totalSaleable: Number(r.totalSaleable ?? 0),
        totalReserved: Number(r.totalReserved ?? 0),
        totalValue: Math.round(Number(r.totalValue ?? 0) * 100) / 100,
        warehouseCount: Number(r.warehouseCount ?? 0),
        avgUnitPrice: Math.round(Number(r.avgUnitPrice ?? 0) * 100) / 100,
      })),
      count: rows.length,
      summary: {
        totalSaleableUnits: totalSaleable,
        totalStockValue: Math.round(totalValue * 100) / 100,
        totalProducts: rows.length,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch available stock" });
  }
});

export default router;
