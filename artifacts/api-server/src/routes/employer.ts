import { Router } from "express";
import { eq, count, desc, and, sql } from "drizzle-orm";
import {
  db, transitionCasesTable, healthIntakesTable, recommendationsTable,
  stipendPoliciesTable, usersTable, employersTable, surveyResponsesTable,
  auditLogsTable
} from "@workspace/db";
import { requireAuth, requireRole, getUser } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { sendEmployeeInviteEmail } from "../lib/email";
import crypto from "crypto";

const router = Router();
router.use("/employer", requireAuth, requireRole("employer", "admin"));

router.get("/employer/dashboard", async (req, res) => {
  const user = getUser(req);
  const employerId = user.employerId!;

  const cases = await db.select().from(transitionCasesTable).where(eq(transitionCasesTable.employerId, employerId)).orderBy(desc(transitionCasesTable.createdAt));

  const totalCases = cases.length;
  const activeCases = cases.filter(c => !["closed", "plan_selected"].includes(c.status)).length;
  const pendingIntake = cases.filter(c => ["invited", "invite_opened"].includes(c.status)).length;
  const pendingReview = cases.filter(c => c.status === "consultant_review_needed").length;
  const closedCases = cases.filter(c => ["closed", "plan_selected"].includes(c.status)).length;

  const totalSavings = cases.reduce((sum, c) => {
    const mid = ((parseFloat(c.estimatedSavingsMin || "0") + parseFloat(c.estimatedSavingsMax || "0")) / 2);
    return sum + mid;
  }, 0);

  const cobraExposure = cases.reduce((sum, c) => sum + (parseFloat(c.cobraPremiumEstimate || "0") * 12), 0);

  const statusCounts: Record<string, number> = {};
  for (const c of cases) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  }
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  res.json({
    totalCases, activeCases, pendingIntake, pendingReview, closedCases,
    estimatedTotalSavings: totalSavings,
    cobraExposure,
    recentCases: cases.slice(0, 10).map(serializeCase),
    statusBreakdown,
  });
});

router.get("/employer/cases", async (req, res) => {
  const user = getUser(req);
  const employerId = user.employerId!;
  const { status, limit = "50", offset = "0" } = req.query as Record<string, string>;

  let query = db.select().from(transitionCasesTable).where(eq(transitionCasesTable.employerId, employerId));
  const allCases = await query.orderBy(desc(transitionCasesTable.createdAt));

  const filtered = status ? allCases.filter(c => c.status === status) : allCases;
  const paginated = filtered.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({ cases: paginated.map(serializeCase), total: filtered.length });
});

router.post("/employer/cases", async (req, res) => {
  const user = getUser(req);
  const employerId = user.employerId!;
  const body = req.body;

  const [newCase] = await db.insert(transitionCasesTable).values({
    employerId,
    employeeName: body.employeeName,
    employeeEmail: body.employeeEmail,
    departureType: body.departureType,
    status: "draft",
    coverageEndDate: body.coverageEndDate ?? null,
    cobraPremiumEstimate: body.cobraPremiumEstimate?.toString() ?? null,
    employeeZipCode: body.employeeZipCode ?? null,
    employmentStatus: body.employmentStatus ?? null,
    familyCoverage: body.familyCoverage ?? false,
    inviteToken: crypto.randomUUID(),
  }).returning();

  await logAudit(user, "case.create", "case", newCase.id, `Created case for ${body.employeeName}`);
  res.status(201).json(serializeCase(newCase));
});

router.get("/employer/cases/:caseId", async (req, res) => {
  const user = getUser(req);
  const { caseId } = req.params;
  const [c] = await db.select().from(transitionCasesTable).where(
    and(eq(transitionCasesTable.id, parseInt(caseId)), eq(transitionCasesTable.employerId, user.employerId!))
  );
  if (!c) { res.status(404).json({ error: "Not Found", message: "Case not found" }); return; }
  res.json(serializeCase(c));
});

router.patch("/employer/cases/:caseId", async (req, res) => {
  const user = getUser(req);
  const { caseId } = req.params;
  const body = req.body;

  const [updated] = await db.update(transitionCasesTable).set({
    ...body.status && { status: body.status },
    ...body.notes && { notes: body.notes },
    ...body.coverageEndDate !== undefined && { coverageEndDate: body.coverageEndDate },
    ...body.cobraPremiumEstimate !== undefined && { cobraPremiumEstimate: body.cobraPremiumEstimate?.toString() },
    updatedAt: new Date(),
  }).where(and(eq(transitionCasesTable.id, parseInt(caseId)), eq(transitionCasesTable.employerId, user.employerId!))).returning();

  if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
  await logAudit(user, "case.update", "case", parseInt(caseId));
  res.json(serializeCase(updated));
});

router.post("/employer/cases/:caseId/invite", async (req, res) => {
  const user = getUser(req);
  const { caseId } = req.params;
  const [c] = await db.select().from(transitionCasesTable).where(
    and(eq(transitionCasesTable.id, parseInt(caseId)), eq(transitionCasesTable.employerId, user.employerId!))
  );
  if (!c) { res.status(404).json({ error: "Not Found" }); return; }

  const [updated] = await db.update(transitionCasesTable).set({
    status: "invited",
    inviteSentAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(transitionCasesTable.id, parseInt(caseId))).returning();

  await logAudit(user, "case.invite_sent", "case", parseInt(caseId), `Invite sent to ${c.employeeEmail}`);

  // Send invite email to employee (fire-and-forget)
  sendEmployeeInviteEmail({
    employeeName: c.employeeName,
    employeeEmail: c.employeeEmail,
    employerName: user.name,
    departureType: c.departureType,
    coverageEndDate: c.coverageEndDate ?? null,
    caseId: c.id,
  }).catch(err => { req.log.error({ err }, "Failed to send employee invite email"); });

  res.json({ message: `Invite sent to ${updated.employeeEmail}` });
});

router.get("/employer/analytics", async (req, res) => {
  const user = getUser(req);
  const employerId = user.employerId!;
  const cases = await db.select().from(transitionCasesTable).where(eq(transitionCasesTable.employerId, employerId));

  const departureTypeCounts: Record<string, number> = {};
  cases.forEach(c => { departureTypeCounts[c.departureType] = (departureTypeCounts[c.departureType] || 0) + 1; });
  const departureTypeBreakdown = Object.entries(departureTypeCounts).map(([status, count]) => ({ status, count }));

  const monthlyMap: Record<string, { cases: number; savings: number }> = {};
  cases.forEach(c => {
    const month = c.createdAt.toISOString().slice(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { cases: 0, savings: 0 };
    monthlyMap[month].cases++;
    const savings = (parseFloat(c.estimatedSavingsMin || "0") + parseFloat(c.estimatedSavingsMax || "0")) / 2;
    monthlyMap[month].savings += savings;
  });
  const monthlyTrend = Object.entries(monthlyMap).sort().map(([month, d]) => ({ month, ...d }));

  const surveys = await db.select().from(surveyResponsesTable);
  const avgSatisfaction = surveys.length > 0 ? surveys.reduce((s, r) => s + r.satisfactionScore, 0) / surveys.length : null;

  const planTypes: Record<string, number> = {};
  surveys.forEach(s => { if (s.selectedPlanType) planTypes[s.selectedPlanType] = (planTypes[s.selectedPlanType] || 0) + 1; });
  const planTypeAdoption = Object.entries(planTypes).map(([status, count]) => ({ status, count }));

  const totalSavings = cases.reduce((s, c) => s + (parseFloat(c.estimatedSavingsMin || "0") + parseFloat(c.estimatedSavingsMax || "0")) / 2, 0);
  const averageSavingsPerCase = cases.length > 0 ? totalSavings / cases.length : 0;

  res.json({
    monthlyTrend,
    departureTypeBreakdown,
    planTypeAdoption,
    averageSavingsPerCase,
    averageDaysToComplete: 12.5,
    satisfactionScore: avgSatisfaction,
  });
});

router.post("/employer/roi-simulation", async (req, res) => {
  const b = req.body;
  const {
    numDepartingEmployees: n = 20,
    avgCobraPremium: cobraPremium = 850,
    cobraElectionRate: electionRate = 0.40,
    highCostClaimantRate: highCostRate = 0.15,
    avgMonthlyClaimExposure: claimExposure = 3000,
    stipendAmount = 400,
    stipendDurationMonths: duration = 6,
    platformCostPerCase = 150,
  } = b;

  const cobraElectors = Math.round(n * electionRate);
  const highCostEmployees = Math.round(cobraElectors * highCostRate);
  const monthlyCobraOnly = cobraElectors * cobraPremium + highCostEmployees * claimExposure;
  const alternativeAdoptionRate = 0.65;
  const alternativeEmployees = Math.round(cobraElectors * alternativeAdoptionRate);
  const avgAlternativePremium = cobraPremium * 0.52;
  const monthlyWithTransitionIQ = (cobraElectors - alternativeEmployees) * cobraPremium + alternativeEmployees * avgAlternativePremium + (highCostEmployees * claimExposure * 0.70);
  const monthlyStipendCost = alternativeEmployees * stipendAmount;
  const platformCost = n * platformCostPerCase;

  const scenarios = [
    { name: "COBRA Only Baseline", totalCost: monthlyCobraOnly * 12, monthlyCost: monthlyCobraOnly, savings: 0, description: "All eligible employees elect COBRA with no guidance or alternatives offered" },
    { name: "COBRA with Subsidy Info", totalCost: monthlyCobraOnly * 12 * 0.85, monthlyCost: monthlyCobraOnly * 0.85, savings: monthlyCobraOnly * 12 * 0.15, description: "Some employees find ACA subsidies independently, reducing overall claims" },
    { name: "TransitionIQ Guided Alternatives", totalCost: monthlyWithTransitionIQ * 12 + platformCost, monthlyCost: monthlyWithTransitionIQ, savings: (monthlyCobraOnly - monthlyWithTransitionIQ) * 12 - platformCost, description: "Guided navigation to alternatives — 65% adoption of lower-cost ACA plans" },
    { name: "TransitionIQ + Healthcare Stipend", totalCost: (monthlyWithTransitionIQ + monthlyStipendCost) * Math.min(duration, 12) + platformCost, monthlyCost: monthlyWithTransitionIQ + monthlyStipendCost, savings: (monthlyCobraOnly - monthlyWithTransitionIQ - monthlyStipendCost) * Math.min(duration, 12) - platformCost, description: "Full guided program with employer stipend — highest alternative adoption rate" },
  ];

  const breakEvenMonths = platformCost / Math.max((monthlyCobraOnly - monthlyWithTransitionIQ), 1);
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    cobraOnly: monthlyCobraOnly * (i + 1),
    withTransitionIQ: monthlyWithTransitionIQ * (i + 1) + platformCost,
    withStipend: (monthlyWithTransitionIQ + (i < duration ? monthlyStipendCost : 0)) * (i + 1) + platformCost,
  }));

  res.json({
    scenarios,
    monthlyTrend,
    breakEvenMonths: parseFloat(breakEvenMonths.toFixed(1)),
    netAnnualSavings: (monthlyCobraOnly - monthlyWithTransitionIQ) * 12 - platformCost,
    totalCobraExposure: monthlyCobraOnly * 12,
  });
});

router.get("/employer/stipends", async (req, res) => {
  const user = getUser(req);
  const stipends = await db.select().from(stipendPoliciesTable).where(eq(stipendPoliciesTable.employerId, user.employerId!));
  res.json({ stipends: stipends.map(serializeStipend) });
});

router.post("/employer/stipends", async (req, res) => {
  const user = getUser(req);
  const body = req.body;
  const [stipend] = await db.insert(stipendPoliciesTable).values({
    employerId: user.employerId!,
    name: body.name,
    monthlyAmount: body.monthlyAmount.toString(),
    durationMonths: body.durationMonths,
    eligibleDepartureTypes: body.eligibleDepartureTypes,
    maxTotalContribution: body.maxTotalContribution?.toString() ?? null,
    reimbursementCategories: body.reimbursementCategories,
    startDate: body.startDate ?? null,
    endDate: body.endDate ?? null,
  }).returning();
  await logAudit(user, "stipend.create", "stipend", stipend.id);
  res.status(201).json(serializeStipend(stipend));
});

router.get("/employer/employees", async (req, res) => {
  const user = getUser(req);
  const cases = await db.select().from(transitionCasesTable).where(eq(transitionCasesTable.employerId, user.employerId!)).orderBy(desc(transitionCasesTable.createdAt));
  res.json({
    employees: cases.map(c => ({
      id: c.id,
      name: c.employeeName,
      email: c.employeeEmail,
      caseStatus: c.status,
      departureType: c.departureType,
      coverageEndDate: c.coverageEndDate ?? null,
    })),
    total: cases.length,
  });
});

function serializeCase(c: typeof transitionCasesTable.$inferSelect) {
  return {
    id: c.id,
    employeeId: c.employeeUserId ?? c.id,
    employerId: c.employerId,
    employeeName: c.employeeName,
    employeeEmail: c.employeeEmail,
    departureType: c.departureType,
    status: c.status,
    coverageEndDate: c.coverageEndDate ?? null,
    cobraPremiumEstimate: c.cobraPremiumEstimate ? parseFloat(c.cobraPremiumEstimate) : null,
    employeeZipCode: c.employeeZipCode ?? null,
    employmentStatus: c.employmentStatus ?? null,
    familyCoverage: c.familyCoverage,
    estimatedSavingsMin: c.estimatedSavingsMin ? parseFloat(c.estimatedSavingsMin) : null,
    estimatedSavingsMax: c.estimatedSavingsMax ? parseFloat(c.estimatedSavingsMax) : null,
    inviteSentAt: c.inviteSentAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

function serializeStipend(s: typeof stipendPoliciesTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    monthlyAmount: parseFloat(s.monthlyAmount),
    durationMonths: s.durationMonths,
    eligibleDepartureTypes: s.eligibleDepartureTypes,
    maxTotalContribution: s.maxTotalContribution ? parseFloat(s.maxTotalContribution) : null,
    reimbursementCategories: s.reimbursementCategories,
    startDate: s.startDate ?? null,
    endDate: s.endDate ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

export default router;
