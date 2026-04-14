import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dealersTable = pgTable("dealers", {
  id: serial("id").primaryKey(),
  dealerCode: text("dealer_code").notNull().unique(),
  name: text("name").notNull(),
  contactPerson: text("contact_person").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  gstNumber: text("gst_number"),
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).default("0"),
  outstandingBalance: numeric("outstanding_balance", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("is_active").notNull().default(true),
  commissionSlab: text("commission_slab"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDealerSchema = createInsertSchema(dealersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDealer = z.infer<typeof insertDealerSchema>;
export type Dealer = typeof dealersTable.$inferSelect;
