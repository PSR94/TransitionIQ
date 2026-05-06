import { pgTable, serial, text, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "pending", "generated", "consultant_review", "released", "rejected"
]);

export const recommendationsTable = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  status: recommendationStatusEnum("status").notNull().default("pending"),
  consultantNotes: text("consultant_notes"),
  generatedAt: timestamp("generated_at"),
  releasedAt: timestamp("released_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recommendationItemsTable = pgTable("recommendation_items", {
  id: serial("id").primaryKey(),
  recommendationId: integer("recommendation_id").notNull(),
  planId: integer("plan_id").notNull(),
  rank: integer("rank").notNull(),
  matchScore: numeric("match_score", { precision: 5, scale: 2 }).notNull(),
  confidenceScore: numeric("confidence_score", { precision: 5, scale: 2 }).notNull(),
  estimatedAnnualCost: numeric("estimated_annual_cost", { precision: 10, scale: 2 }).notNull(),
  estimatedMonthlySavingsVsCobra: numeric("estimated_monthly_savings_vs_cobra", { precision: 10, scale: 2 }).notNull(),
  estimatedAnnualSavingsVsCobra: numeric("estimated_annual_savings_vs_cobra", { precision: 10, scale: 2 }).notNull(),
  explanation: text("explanation").notNull(),
  pros: text("pros").array().notNull(),
  cons: text("cons").array().notNull(),
  assumptions: text("assumptions").array().notNull(),
  warningFlags: text("warning_flags").array().notNull(),
  recommendedNextSteps: text("recommended_next_steps").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRecommendationSchema = createInsertSchema(recommendationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRecommendationItemSchema = createInsertSchema(recommendationItemsTable).omit({ id: true, createdAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type InsertRecommendationItem = z.infer<typeof insertRecommendationItemSchema>;
export type Recommendation = typeof recommendationsTable.$inferSelect;
export type RecommendationItem = typeof recommendationItemsTable.$inferSelect;
