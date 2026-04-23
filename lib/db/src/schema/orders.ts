import { pgTable, serial, text, integer, numeric, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  dealerId: integer("dealer_id").notNull(),
  status: text("status").notNull().default("pending"), // pending | confirmed | reserved | dispatched | delivered | cancelled
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  advancePaid: numeric("advance_paid", { precision: 12, scale: 2 }).default("0"),
  items: jsonb("items").notNull().default([]),
  notes: text("notes"),
  // ─── Pricing & Tax fields ─────────────────────────────────────────────────
  discountAmount: numeric("discount_amount", { precision: 12, scale: 2 }).default("0"),
  shippingAmount: numeric("shipping_amount", { precision: 12, scale: 2 }).default("0"),
  taxRate: numeric("tax_rate", { precision: 6, scale: 2 }).default("0"),     // GST % (e.g. 5, 12, 18, 28)
  cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2 }).default("0"),
  sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2 }).default("0"),
  igstAmount: numeric("igst_amount", { precision: 12, scale: 2 }).default("0"),
  taxType: text("tax_type").default("intra"),  // "intra" (CGST+SGST) or "inter" (IGST)
  grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).default("0"), // final payable amount
  // Stock reservation fields
  isStockReserved: boolean("is_stock_reserved").notNull().default(false),
  reservedUntil: timestamp("reserved_until"), // 7 days from order creation if advance paid
  reservedInventoryIds: jsonb("reserved_inventory_ids").default([]), // array of inventory IDs reserved
  // Delivery fields
  proofOfDelivery: text("proof_of_delivery"),
  deliveryOtp: text("delivery_otp"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
