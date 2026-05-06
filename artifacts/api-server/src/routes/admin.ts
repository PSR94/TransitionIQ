import { Router } from "express";
import { desc } from "drizzle-orm";
import {
  db, usersTable, employersTable, transitionCasesTable, healthPlansTable,
  auditLogsTable, evaluationRunsTable, evaluationResultsTable, knowledgeDocumentsTable,
  knowledgeChunksTable, recommendationSettingsTable
} from "@workspace/db";
import { requireAuth, requireRole, getUser } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { runEvaluationSuite } from "../lib/evaluations";

const router = Router();
router.use("/admin", requireAuth, requireRole("admin"));

router.get("/admin/dashboard", async (req, res) => {
  const [employers, users, cases, plans, auditCount, evalRuns] = await Promise.all([
    db.select().from(employersTable),
    db.select().from(usersTable),
    db.select().from(transitionCasesTable),
    db.select().from(healthPlansTable),
    db.select().from(auditLogsTable).limit(1),
    db.select().from(evaluationRunsTable).orderBy(desc(evaluationRunsTable.runAt)).limit(1),
  ]);

  res.json({
    totalEmployers: employers.length,
    totalUsers: users.length,
    totalCases: cases.length,
    totalPlans: plans.length,
    activeAiEvals: evalRuns.length,
    recentAuditEvents: auditCount.length,
    systemHealth: "operational",
  });
});

router.get("/admin/employers", async (req, res) => {
  const employers = await db.select().from(employersTable).orderBy(desc(employersTable.createdAt));
  const cases = await db.select().from(transitionCasesTable);
  const result = employers.map(e => ({
    id: e.id, name: e.name, industry: e.industry ?? null,
    totalCases: cases.filter(c => c.employerId === e.id).length,
    activeCases: cases.filter(c => c.employerId === e.id && !["closed", "plan_selected"].includes(c.status)).length,
    createdAt: e.createdAt.toISOString(),
  }));
  res.json({ employers: result, total: result.length });
});

router.get("/admin/users", async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json({
    users: users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, employerId: u.employerId ?? null, createdAt: u.createdAt.toISOString() })),
    total: users.length,
  });
});

router.get("/admin/audit-logs", async (req, res) => {
  const { limit = "100", offset = "0" } = req.query as Record<string, string>;
  const logs = await db.select().from(auditLogsTable).orderBy(desc(auditLogsTable.createdAt)).limit(parseInt(limit)).offset(parseInt(offset));
  const [countResult] = await db.select().from(auditLogsTable);
  res.json({
    logs: logs.map(l => ({
      id: l.id, userId: l.userId ?? null, userEmail: l.userEmail ?? null, action: l.action,
      resourceType: l.resourceType ?? null, resourceId: l.resourceId ?? null, details: l.details ?? null,
      ipAddress: l.ipAddress ?? null, createdAt: l.createdAt.toISOString(),
    })),
    total: logs.length,
  });
});

router.get("/admin/evaluations", async (req, res) => {
  const runs = await db.select().from(evaluationRunsTable).orderBy(desc(evaluationRunsTable.runAt)).limit(10);
  const result = await Promise.all(runs.map(async run => {
    const results = await db.select().from(evaluationResultsTable);
    return {
      id: run.id, runAt: run.runAt.toISOString(), totalTests: run.totalTests,
      passed: run.passed, failed: run.failed, passRate: parseFloat(run.passRate),
      results: results.filter(r => r.runId === run.id).map(r => ({
        id: r.id, testName: r.testName, category: r.category, passed: r.passed,
        score: r.score ? parseFloat(r.score) : null, details: r.details ?? null,
        input: r.input ?? null, expectedOutput: r.expectedOutput ?? null, actualOutput: r.actualOutput ?? null,
      })),
    };
  }));
  res.json({ runs: result, total: result.length });
});

router.post("/admin/evaluations/run", async (req, res) => {
  const user = getUser(req);
  const run = await runEvaluationSuite();
  await logAudit(user, "evaluation.run", "evaluation", run.id);
  const results = await db.select().from(evaluationResultsTable);
  res.json({
    run: {
      id: run.id, runAt: run.runAt.toISOString(), totalTests: run.totalTests,
      passed: run.passed, failed: run.failed, passRate: parseFloat(run.passRate),
      results: results.filter(r => r.runId === run.id).map(r => ({
        id: r.id, testName: r.testName, category: r.category, passed: r.passed,
        score: r.score ? parseFloat(r.score) : null, details: r.details ?? null,
        input: r.input ?? null, expectedOutput: r.expectedOutput ?? null, actualOutput: r.actualOutput ?? null,
      })),
    },
    message: `Evaluation suite complete: ${run.passed}/${run.totalTests} tests passed`,
  });
});

router.get("/admin/knowledge-base", async (req, res) => {
  const docs = await db.select().from(knowledgeDocumentsTable).orderBy(desc(knowledgeDocumentsTable.createdAt));
  res.json({
    documents: docs.map(d => ({ id: d.id, title: d.title, category: d.category, chunkCount: d.chunkCount, createdAt: d.createdAt.toISOString() })),
    total: docs.length,
  });
});

router.get("/admin/recommendation-settings", async (req, res) => {
  let [settings] = await db.select().from(recommendationSettingsTable);
  if (!settings) {
    const [s] = await db.insert(recommendationSettingsTable).values({}).returning();
    settings = s;
  }
  res.json({
    premiumWeight: parseFloat(settings.premiumWeight),
    deductibleWeight: parseFloat(settings.deductibleWeight),
    outOfPocketMaxWeight: parseFloat(settings.outOfPocketMaxWeight),
    estimatedAnnualCostWeight: parseFloat(settings.estimatedAnnualCostWeight),
    budgetMatchWeight: parseFloat(settings.budgetMatchWeight),
    metalLevelWeight: parseFloat(settings.metalLevelWeight),
    prescriptionWeight: parseFloat(settings.prescriptionWeight),
    doctorNetworkWeight: parseFloat(settings.doctorNetworkWeight),
    qualityRatingWeight: parseFloat(settings.qualityRatingWeight),
    updatedAt: settings.updatedAt?.toISOString() ?? null,
  });
});

router.patch("/admin/recommendation-settings", async (req, res) => {
  const b = req.body;
  const [settings] = await db.select().from(recommendationSettingsTable);
  if (settings) {
    await db.update(recommendationSettingsTable).set({ ...Object.fromEntries(Object.entries(b).filter(([k]) => k !== "updatedAt").map(([k, v]) => [k, v?.toString()])), updatedAt: new Date() });
  } else {
    await db.insert(recommendationSettingsTable).values({ ...Object.fromEntries(Object.entries(b).filter(([k]) => k !== "updatedAt").map(([k, v]) => [k, v?.toString()])) });
  }
  const [updated] = await db.select().from(recommendationSettingsTable);
  res.json({ premiumWeight: parseFloat(updated.premiumWeight), deductibleWeight: parseFloat(updated.deductibleWeight), outOfPocketMaxWeight: parseFloat(updated.outOfPocketMaxWeight), estimatedAnnualCostWeight: parseFloat(updated.estimatedAnnualCostWeight), budgetMatchWeight: parseFloat(updated.budgetMatchWeight), metalLevelWeight: parseFloat(updated.metalLevelWeight), prescriptionWeight: parseFloat(updated.prescriptionWeight), doctorNetworkWeight: parseFloat(updated.doctorNetworkWeight), qualityRatingWeight: parseFloat(updated.qualityRatingWeight), updatedAt: updated.updatedAt?.toISOString() ?? null });
});

router.get("/admin/plan-data", async (req, res) => {
  const { state, metalLevel, limit = "50" } = req.query as Record<string, string>;
  let plans = await db.select().from(healthPlansTable).limit(parseInt(limit));
  if (state) plans = plans.filter(p => p.state === state);
  if (metalLevel) plans = plans.filter(p => p.metalLevel === metalLevel);
  res.json({ plans: plans.map(serializePlan), total: plans.length });
});

router.get("/plans", async (req, res) => {
  const { state, zipCode, metalLevel, planType, limit = "20" } = req.query as Record<string, string>;
  let plans = await db.select().from(healthPlansTable).limit(parseInt(limit));
  if (state) plans = plans.filter(p => p.state === state);
  if (zipCode) plans = plans.filter(p => !p.zipCode || p.zipCode === zipCode);
  if (metalLevel) plans = plans.filter(p => p.metalLevel === metalLevel);
  if (planType) plans = plans.filter(p => p.planType === planType);
  res.json({ plans: plans.map(serializePlan), total: plans.length });
});

function serializePlan(p: typeof healthPlansTable.$inferSelect) {
  return {
    id: p.id, planId: p.planId, issuerName: p.issuerName, planName: p.planName,
    metalLevel: p.metalLevel, planType: p.planType, state: p.state, county: p.county ?? null,
    zipCode: p.zipCode ?? null, monthlyPremium: parseFloat(p.monthlyPremium),
    deductible: parseFloat(p.deductible), outOfPocketMax: parseFloat(p.outOfPocketMax),
    primaryCareVisit: p.primaryCareVisit ?? null, specialistVisit: p.specialistVisit ?? null,
    genericDrugCost: p.genericDrugCost ?? null, networkType: p.networkType ?? null,
    telehealthAvailable: p.telehealthAvailable, hsaEligible: p.hsaEligible,
    qualityRating: p.qualityRating ? parseFloat(p.qualityRating) : null, source: p.source, coverageYear: p.coverageYear,
  };
}

export default router;
