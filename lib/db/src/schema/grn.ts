import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const grnTable = pgTable("grn", {
  id: serial("id").primaryKey(),
  grnNumber: text("grn_number").notNull().unique(),
  poId: integer("po_id"), // nullable — can be direct inward without PO
  warehouseId: integer("warehouse_id").notNull(),
  inventoryId: integer("inventory_id"), // linked inventory item created
  receivedDate: timestamp("received_date").notNull().defaultNow(),
  totalItemsReceived: integer("total_items_received").notNull().default(0),
  shortageQty: integer("shortage_qty").default(0),
  damageQty: integer("damage_qty").default(0),
  shortageNotes: text("shortage_notes"),
  damageNotes: text("damage_notes"),
  status: text("status").notNull().default("pending"), // pending | verified | accepted | rejected
  verifiedBy: text("verified_by"),
  createdBy: text("created_by").default("system"),
  isReleased: boolean("is_released").notNull().default(false), // only after release, stock is added to available
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertGrnSchema = createInsertSchema(grnTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGrn = z.infer<typeof insertGrnSchema>;
export type Grn = typeof grnTable.$inferSelect;
