import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  barcode: text("barcode").notNull().unique(),
  productId: integer("product_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  locationId: integer("location_id"), // references warehouse_locations.id
  binLocation: text("bin_location"),
  status: text("status").notNull().default("available"), // available | reserved | quarantined | in_transit | pending_qc
  quantity: integer("quantity").notNull().default(0),
  saleableQuantity: integer("saleable_quantity").notNull().default(0), // available - reserved
  reservedQuantity: integer("reserved_quantity").notNull().default(0),
  reservedUntil: timestamp("reserved_until"), // 7-day lock on reservation
  orderId: integer("order_id"), // which order reserved this
  grnId: integer("grn_id"), // GRN reference
  grnNumber: text("grn_number"),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  landingCost: numeric("landing_cost", { precision: 12, scale: 2 }),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
  hsnCode: text("hsn_code"),
  grossWeight: numeric("gross_weight", { precision: 10, scale: 2 }),
  qcStatus: text("qc_status"), // pending | passed | failed
  qcRejectionReason: text("qc_rejection_reason"),
  qcNotes: text("qc_notes"),
  isGrnReleased: boolean("is_grn_released").notNull().default(false), // stock available only after GRN release
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInventorySchema = createInsertSchema(inventoryTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventoryTable.$inferSelect;
