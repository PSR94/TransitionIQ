import { pgTable, serial, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stipendPoliciesTable = pgTable("stipend_policies", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id").notNull(),
  name: text("name").notNull(),
  monthlyAmount: numeric("monthly_amount", { precision: 10, scale: 2 }).notNull(),
  durationMonths: integer("duration_months").notNull(),
  eligibleDepartureTypes: text("eligible_departure_types").array().notNull(),
  maxTotalContribution: numeric("max_total_contribution", { precision: 10, scale: 2 }),
  reimbursementCategories: text("reimbursement_categories").array().notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStipendSchema = createInsertSchema(stipendPoliciesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStipend = z.infer<typeof insertStipendSchema>;
export type StipendPolicy = typeof stipendPoliciesTable.$inferSelect;
