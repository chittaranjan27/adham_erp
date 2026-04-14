import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Sequential import workflow stages — no stage skipping allowed
export const IMPORT_STAGES = [
  "proforma_invoice",
  "advance_payment",
  "container_loading",
  "remaining_payment",
  "unloading_qc",
  "stocking",
] as const;

export type ImportStageType = (typeof IMPORT_STAGES)[number];

export const importStagesTable = pgTable("import_stages", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull(), // references purchase_orders.id
  stage: text("stage").notNull(), // one of IMPORT_STAGES
  stageIndex: integer("stage_index").notNull(), // 0-5 for ordering enforcement
  status: text("status").notNull().default("pending"), // pending | in_progress | completed | blocked
  completedAt: timestamp("completed_at"),
  completedBy: text("completed_by"),
  notes: text("notes"),
  attachmentUrl: text("attachment_url"),
  // Stage-specific data
  shortageQty: integer("shortage_qty"), // for unloading_qc stage
  damageQty: integer("damage_qty"), // for unloading_qc stage
  damageReport: text("damage_report"), // for unloading_qc stage — mandatory if damage
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertImportStageSchema = createInsertSchema(importStagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertImportStage = z.infer<typeof insertImportStageSchema>;
export type ImportStage = typeof importStagesTable.$inferSelect;
