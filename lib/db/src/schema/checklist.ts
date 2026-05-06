import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const checklistItemsTable = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  completed: boolean("completed").notNull().default(false),
  dueDate: text("due_date"),
  category: text("category").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChecklistItemSchema = createInsertSchema(checklistItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChecklistItem = z.infer<typeof insertChecklistItemSchema>;
export type ChecklistItem = typeof checklistItemsTable.$inferSelect;
