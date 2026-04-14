import { pgTable, serial, text, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const warehousesTable = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  address: text("address"),
  manager: text("manager"),
  capacity: integer("capacity").default(10000),
  usedCapacity: integer("used_capacity").default(0),
  isActive: boolean("is_active").notNull().default(true),
  lat: real("lat"),
  lng: real("lng"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWarehouseSchema = createInsertSchema(warehousesTable).omit({ id: true, createdAt: true });
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Warehouse = typeof warehousesTable.$inferSelect;
