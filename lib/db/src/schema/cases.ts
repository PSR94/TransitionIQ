import { pgTable, serial, text, timestamp, integer, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const departureTypeEnum = pgEnum("departure_type", [
  "layoff", "voluntary", "retirement", "reduction_in_hours", "family_coverage_loss", "life_event"
]);

export const caseStatusEnum = pgEnum("case_status", [
  "draft", "invited", "invite_opened", "intake_started", "intake_completed",
  "recommendations_generated", "consultant_review_needed", "recommendations_released",
  "plan_selected", "closed"
]);

export const transitionCasesTable = pgTable("transition_cases", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id").notNull(),
  employeeUserId: integer("employee_user_id"),
  employeeName: text("employee_name").notNull(),
  employeeEmail: text("employee_email").notNull(),
  departureType: departureTypeEnum("departure_type").notNull(),
  status: caseStatusEnum("status").notNull().default("draft"),
  coverageEndDate: text("coverage_end_date"),
  cobraPremiumEstimate: numeric("cobra_premium_estimate", { precision: 10, scale: 2 }),
  employeeZipCode: text("employee_zip_code"),
  employmentStatus: text("employment_status"),
  familyCoverage: boolean("family_coverage").notNull().default(false),
  estimatedSavingsMin: numeric("estimated_savings_min", { precision: 10, scale: 2 }),
  estimatedSavingsMax: numeric("estimated_savings_max", { precision: 10, scale: 2 }),
  inviteToken: text("invite_token"),
  inviteSentAt: timestamp("invite_sent_at"),
  inviteOpenedAt: timestamp("invite_opened_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCaseSchema = createInsertSchema(transitionCasesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type TransitionCase = typeof transitionCasesTable.$inferSelect;
