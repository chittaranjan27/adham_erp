import { pgTable, serial, text, numeric, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  description: text("description"),
  masterBarcode: text("master_barcode").notNull().unique(),
  hsnCode: text("hsn_code").notNull(),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  unit: text("unit").notNull().default("pcs"),
  dimensions: text("dimensions"),
  weight: real("weight"),
  origin: text("origin").notNull().default("manufactured"),
  // Landing cost components
  purchaseCost: numeric("purchase_cost", { precision: 12, scale: 2 }),
  logisticsCost: numeric("logistics_cost", { precision: 12, scale: 2 }),
  additionalCharges: numeric("additional_charges", { precision: 12, scale: 2 }),
  landingCost: numeric("landing_cost", { precision: 12, scale: 2 }),
  marginPercent: numeric("margin_percent", { precision: 6, scale: 2 }),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
