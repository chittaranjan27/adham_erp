import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dispatchesTable = pgTable("dispatches", {
  id: serial("id").primaryKey(),
  dispatchNumber: text("dispatch_number").notNull().unique(),
  orderId: integer("order_id").notNull(),
  vehicleNumber: text("vehicle_number").notNull(),
  driverName: text("driver_name").notNull(),
  driverPhone: text("driver_phone").notNull(),
  status: text("status").notNull().default("planned"),
  routePlan: text("route_plan"),
  eWayBillNumber: text("e_way_bill_number"),
  dispatchDate: timestamp("dispatch_date"),
  deliveryDate: timestamp("delivery_date"),
  proofOfDelivery: text("proof_of_delivery"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDispatchSchema = createInsertSchema(dispatchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDispatch = z.infer<typeof insertDispatchSchema>;
export type Dispatch = typeof dispatchesTable.$inferSelect;
