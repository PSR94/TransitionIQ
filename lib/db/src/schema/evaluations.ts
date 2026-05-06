import { pgTable, serial, text, timestamp, integer, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const evalCategoryEnum = pgEnum("eval_category", ["recommendation", "assistant", "privacy", "safety"]);

export const evaluationRunsTable = pgTable("evaluation_runs", {
  id: serial("id").primaryKey(),
  totalTests: integer("total_tests").notNull(),
  passed: integer("passed").notNull(),
  failed: integer("failed").notNull(),
  passRate: numeric("pass_rate", { precision: 5, scale: 2 }).notNull(),
  runAt: timestamp("run_at").defaultNow().notNull(),
});

export const evaluationResultsTable = pgTable("evaluation_results", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull(),
  testName: text("test_name").notNull(),
  category: evalCategoryEnum("category").notNull(),
  passed: boolean("passed").notNull(),
  score: numeric("score", { precision: 5, scale: 2 }),
  details: text("details"),
  input: text("input"),
  expectedOutput: text("expected_output"),
  actualOutput: text("actual_output"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recommendationSettingsTable = pgTable("recommendation_settings", {
  id: serial("id").primaryKey(),
  premiumWeight: numeric("premium_weight", { precision: 5, scale: 2 }).notNull().default("0.25"),
  deductibleWeight: numeric("deductible_weight", { precision: 5, scale: 2 }).notNull().default("0.15"),
  outOfPocketMaxWeight: numeric("out_of_pocket_max_weight", { precision: 5, scale: 2 }).notNull().default("0.15"),
  estimatedAnnualCostWeight: numeric("estimated_annual_cost_weight", { precision: 5, scale: 2 }).notNull().default("0.20"),
  budgetMatchWeight: numeric("budget_match_weight", { precision: 5, scale: 2 }).notNull().default("0.10"),
  metalLevelWeight: numeric("metal_level_weight", { precision: 5, scale: 2 }).notNull().default("0.05"),
  prescriptionWeight: numeric("prescription_weight", { precision: 5, scale: 2 }).notNull().default("0.05"),
  doctorNetworkWeight: numeric("doctor_network_weight", { precision: 5, scale: 2 }).notNull().default("0.03"),
  qualityRatingWeight: numeric("quality_rating_weight", { precision: 5, scale: 2 }).notNull().default("0.02"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const surveyResponsesTable = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  satisfactionScore: integer("satisfaction_score").notNull(),
  easeOfUseScore: integer("ease_of_use_score").notNull(),
  recommendationHelpfulness: integer("recommendation_helpfulness").notNull(),
  assistantHelpfulness: integer("assistant_helpfulness").notNull(),
  comments: text("comments"),
  selectedPlanType: text("selected_plan_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const supportRequestsTable = pgTable("support_requests", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  message: text("message").notNull(),
  requestType: text("request_type").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const consultantReviewsTable = pgTable("consultant_reviews", {
  id: serial("id").primaryKey(),
  recommendationId: integer("recommendation_id").notNull(),
  reviewerId: integer("reviewer_id").notNull(),
  action: text("action").notNull(),
  notes: text("notes"),
  reviewedAt: timestamp("reviewed_at").defaultNow().notNull(),
});

export const insertEvalRunSchema = createInsertSchema(evaluationRunsTable).omit({ id: true, runAt: true });
export const insertEvalResultSchema = createInsertSchema(evaluationResultsTable).omit({ id: true, createdAt: true });
export const insertSettingsSchema = createInsertSchema(recommendationSettingsTable).omit({ id: true });
export const insertSurveySchema = createInsertSchema(surveyResponsesTable).omit({ id: true, createdAt: true });
export const insertSupportRequestSchema = createInsertSchema(supportRequestsTable).omit({ id: true, createdAt: true });
export const insertConsultantReviewSchema = createInsertSchema(consultantReviewsTable).omit({ id: true, reviewedAt: true });
export type EvaluationRun = typeof evaluationRunsTable.$inferSelect;
export type EvaluationResult = typeof evaluationResultsTable.$inferSelect;
export type RecommendationSettings = typeof recommendationSettingsTable.$inferSelect;
export type SurveyResponse = typeof surveyResponsesTable.$inferSelect;
export type SupportRequest = typeof supportRequestsTable.$inferSelect;
export type ConsultantReview = typeof consultantReviewsTable.$inferSelect;
