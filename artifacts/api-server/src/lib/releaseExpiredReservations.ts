import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Atomically releases all inventory reservations whose reserved_until has passed.
 *
 * Fixes two bugs in the original /release-expired endpoint:
 *  1. That endpoint only matched items with status='reserved', missing partially-reserved
 *     items whose status remained 'available' but still had reservedQuantity > 0.
 *  2. It never updated the linked order's isStockReserved flag.
 *
 * This function uses a single raw SQL UPDATE with RETURNING so there is no N+1 loop.
 * It is safe to call on every read request — when nothing is expired the UPDATE touches
 * zero rows and returns immediately.
 *
 * Returns the number of inventory rows whose reservation was released.
 */
export async function releaseExpiredReservations(): Promise<number> {
  // Step 1 — release expired inventory reservations.
  // Condition: reserved_until has passed AND there is actually reserved stock to release.
  // Regardless of whether status was 'reserved' or 'available' (partial reservation),
  // we restore saleable_quantity by adding back reserved_quantity and zero out the lock.
  const inventoryResult = await db.execute(sql`
    UPDATE inventory
    SET
      saleable_quantity = saleable_quantity + reserved_quantity,
      reserved_quantity = 0,
      reserved_until    = NULL,
      order_id          = NULL,
      status            = 'available',
      updated_at        = NOW()
    WHERE
      reserved_until IS NOT NULL
      AND reserved_until < NOW()
      AND reserved_quantity > 0
    RETURNING id, order_id
  `);

  const rows = inventoryResult.rows as Array<{ id: number; order_id: number | null }>;
  if (rows.length === 0) return 0;

  // Step 2 — update linked orders so they no longer show as stock-reserved.
  // Collect unique, non-null order IDs from the released inventory rows.
  const orderIds = [...new Set(
    rows.map(r => r.order_id).filter((id): id is number => id != null)
  )];

  if (orderIds.length > 0) {
    // Build a parameterised ARRAY literal so we avoid string interpolation of IDs.
    // e.g.  ANY(ARRAY[$1, $2, $3]::int[])
    const arrayLiteral = sql.join(
      orderIds.map(id => sql`${id}`),
      sql`, `
    );

    await db.execute(sql`
      UPDATE orders
      SET
        is_stock_reserved = false,
        status            = CASE
                              WHEN status = 'reserved' THEN 'pending'
                              ELSE status
                            END,
        updated_at        = NOW()
      WHERE
        id = ANY(ARRAY[${arrayLiteral}]::int[])
        AND is_stock_reserved = true
    `);
  }

  return rows.length;
}
