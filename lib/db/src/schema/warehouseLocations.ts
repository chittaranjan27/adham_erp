import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// 3-level hierarchy: Warehouse → Location → Items
export const warehouseLocationsTable = pgTable("warehouse_locations", {
  id: serial("id").primaryKey(),
  warehouseId: integer("warehouse_id").notNull(), // references warehouses.id
  code: text("code").notNull(), // e.g., A-01-03 (Floor-Row-Shelf)
  name: text("name").notNull(), // e.g., Floor A, Row 1, Shelf 3
  floor: text("floor"), // e.g., "Ground Floor", "First Floor"
  section: text("section"), // e.g., "A", "B", "C"
  shelfNumber: text("shelf_number"), // e.g., "01", "02"
  capacity: integer("capacity").default(1000), // max units
  usedCapacity: integer("used_capacity").default(0),
  locationType: text("location_type").default("shelf"), // shelf | zone | rack | cold_storage | hazmat
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWarehouseLocationSchema = createInsertSchema(warehouseLocationsTable).omit({ id: true, createdAt: true });
export type InsertWarehouseLocation = z.infer<typeof insertWarehouseLocationSchema>;
export type WarehouseLocation = typeof warehouseLocationsTable.$inferSelect;
