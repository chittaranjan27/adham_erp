import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, inventoryTable, productsTable, dealersTable } from "@workspace/db";
import { eq, sql, sum, count, and, desc } from "drizzle-orm";

const router = Router();

router.get("/reports", async (req, res) => {
  try {
    const period = (req.query.period as string) ?? "monthly";

    // Calculate interval based on period
    const intervalMap: Record<string, string> = {
      monthly: "30 days",
      quarterly: "90 days",
      yearly: "365 days",
    };
    const interval = intervalMap[period] ?? "30 days";

    // Total revenue from all delivered/dispatched orders in period
    const [revenueResult] = await db
      .select({ total: sql<number>`coalesce(sum(cast(${ordersTable.totalAmount} as numeric)), 0)` })
      .from(ordersTable)
      .where(sql`${ordersTable.status} IN ('delivered', 'dispatched') AND ${ordersTable.createdAt} >= NOW() - INTERVAL '${sql.raw(interval)}'`);

    // Total cost from inventory (purchase value of available stock)
    const [costResult] = await db
      .select({ total: sql<number>`coalesce(sum(cast(${inventoryTable.unitPrice} as numeric) * ${inventoryTable.quantity}), 0)` })
      .from(inventoryTable);

    const totalRevenue = Number(revenueResult?.total ?? 0);
    const totalCost = Number(costResult?.total ?? 0);
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // Order stats
    const [orderStats] = await db
      .select({ count: count(), avgValue: sql<number>`coalesce(avg(cast(${ordersTable.totalAmount} as numeric)), 0)` })
      .from(ordersTable)
      .where(sql`${ordersTable.createdAt} >= NOW() - INTERVAL '${sql.raw(interval)}'`);

    // Outstanding receivables — sum of balance due on non-cancelled orders
    const [receivablesResult] = await db
      .select({
        total: sql<number>`coalesce(sum(cast(${ordersTable.totalAmount} as numeric) - cast(${ordersTable.advancePaid} as numeric)), 0)`,
      })
      .from(ordersTable)
      .where(sql`${ordersTable.status} NOT IN ('cancelled', 'delivered')`);

    // Top products by revenue (from order items JSON)
    const allOrders = await db
      .select({ items: ordersTable.items, totalAmount: ordersTable.totalAmount })
      .from(ordersTable)
      .where(sql`${ordersTable.status} IN ('delivered', 'dispatched', 'reserved', 'confirmed') AND ${ordersTable.createdAt} >= NOW() - INTERVAL '${sql.raw(interval)}'`);

    const productRevenue: Record<string, { name: string; revenue: number; units: number }> = {};
    for (const order of allOrders) {
      const items = (order.items as any[]) ?? [];
      for (const item of items) {
        const key = item.productName || `Product #${item.productId}`;
        if (!productRevenue[key]) productRevenue[key] = { name: key, revenue: 0, units: 0 };
        productRevenue[key].revenue += Number(item.unitPrice) * Number(item.quantity);
        productRevenue[key].units += Number(item.quantity);
      }
    }
    const topProducts = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Dealer-based channel breakdown
    const dealerOrders = await db
      .select({
        state: dealersTable.state,
        revenue: sql<number>`sum(cast(${ordersTable.totalAmount} as numeric))`,
      })
      .from(ordersTable)
      .leftJoin(dealersTable, eq(ordersTable.dealerId, dealersTable.id))
      .where(sql`${ordersTable.status} NOT IN ('cancelled')`)
      .groupBy(dealersTable.state);

    const totalChannelRev = dealerOrders.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    const channelBreakdown = dealerOrders.map((r) => ({
      channel: r.state ?? "Unknown",
      revenue: Number(r.revenue ?? 0),
      percentage: totalChannelRev > 0 ? Number(((Number(r.revenue ?? 0) / totalChannelRev) * 100).toFixed(1)) : 0,
    }));

    res.json({
      period,
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
      totalOrders: Number(orderStats?.count ?? 0),
      averageOrderValue: Math.round(Number(orderStats?.avgValue ?? 0)),
      outstandingReceivables: Number(receivablesResult?.total ?? 0),
      topProducts,
      channelBreakdown,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to generate finance report" });
  }
});

export default router;
