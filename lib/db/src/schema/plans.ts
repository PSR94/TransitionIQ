import { pgTable, serial, text, timestamp, integer, boolean, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const metalLevelEnum = pgEnum("metal_level", ["bronze", "silver", "gold", "platinum", "catastrophic"]);
export const planTypeEnum = pgEnum("plan_type", ["hmo", "ppo", "epo", "pos"]);

export const healthPlansTable = pgTable("health_plans", {
  id: serial("id").primaryKey(),
  planId: text("plan_id").notNull(),
  issuerName: text("issuer_name").notNull(),
  planName: text("plan_name").notNull(),
  metalLevel: metalLevelEnum("metal_level").notNull(),
  planType: planTypeEnum("plan_type").notNull(),
  state: text("state").notNull(),
  county: text("county"),
  zipCode: text("zip_code"),
  ratingArea: text("rating_area"),
  monthlyPremium: numeric("monthly_premium", { precision: 10, scale: 2 }).notNull(),
  deductible: numeric("deductible", { precision: 10, scale: 2 }).notNull(),
  outOfPocketMax: numeric("out_of_pocket_max", { precision: 10, scale: 2 }).notNull(),
  primaryCareVisit: text("primary_care_visit"),
  specialistVisit: text("specialist_visit"),
  genericDrugCost: text("generic_drug_cost"),
  preferredBrandDrugCost: text("preferred_brand_drug_cost"),
  networkType: text("network_type"),
  telehealthAvailable: boolean("telehealth_available").notNull().default(false),
  hsaEligible: boolean("hsa_eligible").notNull().default(false),
  qualityRating: numeric("quality_rating", { precision: 3, scale: 1 }),
  source: text("source").notNull().default("demo"),
  coverageYear: integer("coverage_year").notNull().default(2025),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlanSchema = createInsertSchema(healthPlansTable).omit({ id: true, createdAt: true });
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type HealthPlan = typeof healthPlansTable.$inferSelect;
