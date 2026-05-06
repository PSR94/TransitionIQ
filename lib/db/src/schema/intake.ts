import { pgTable, serial, text, timestamp, integer, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const healthIntakesTable = pgTable("health_intakes", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().unique(),
  age: integer("age"),
  zipCode: text("zip_code"),
  state: text("state"),
  county: text("county"),
  householdSize: integer("household_size"),
  expectedAnnualIncomeRange: text("expected_annual_income_range"),
  coverageEndDate: text("coverage_end_date"),
  cobraPremiumEstimate: numeric("cobra_premium_estimate", { precision: 10, scale: 2 }),
  monthlyHealthcareBudget: numeric("monthly_healthcare_budget", { precision: 10, scale: 2 }),
  currentPlanType: text("current_plan_type"),
  dependentCoverageNeeds: boolean("dependent_coverage_needs"),
  doctorPreference: boolean("doctor_preference"),
  prescriptionNeeds: boolean("prescription_needs"),
  preferredDeductibleRange: text("preferred_deductible_range"),
  expectedMedicalUsage: text("expected_medical_usage"),
  medicareEligible: boolean("medicare_eligible"),
  spouseCoveragePossibility: boolean("spouse_coverage_possibility"),
  coveragePriorities: text("coverage_priorities").array(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIntakeSchema = createInsertSchema(healthIntakesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIntake = z.infer<typeof insertIntakeSchema>;
export type HealthIntake = typeof healthIntakesTable.$inferSelect;
