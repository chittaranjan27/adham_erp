import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  supplierName: text("supplier_name").notNull(),
  supplierGstin: text("supplier_gstin"),
  supplierCountry: text("supplier_country").default("India"),
  poType: text("po_type").notNull().default("local"), // local | import
  status: text("status").notNull().default("draft"), // draft | sent | confirmed | partial | completed | cancelled
  currency: text("currency").notNull().default("INR"),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).default("0"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).default("0"),
  shippingAmount: numeric("shipping_amount", { precision: 12, scale: 2 }).default("0"),
  attachmentUrl: text("attachment_url"),
  notes: text("notes"),
  expectedDeliveryDate: timestamp("expected_delivery_date"),
  warehouseId: integer("warehouse_id"),
  createdBy: text("created_by").default("system"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
