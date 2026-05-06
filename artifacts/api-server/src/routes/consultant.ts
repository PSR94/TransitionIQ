import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db, transitionCasesTable, recommendationsTable, recommendationItemsTable,
  healthIntakesTable, healthPlansTable, consultantReviewsTable, employersTable
} from "@workspace/db";
import { requireAuth, requireRole, getUser } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { sendRecommendationsReadyEmail, sendConsultantReviewRequestEmail } from "../lib/email";

const router = Router();
router.use("/consultant", requireAuth, requireRole("consultant", "admin"));

router.get("/consultant/dashboard", async (req, res) => {
  const pendingCases = await db.select().from(transitionCasesTable).where(eq(transitionCasesTable.status, "consultant_review_needed")).orderBy(desc(transitionCasesTable.updatedAt));
  const reviews = await db.select().from(consultantReviewsTable).limit(50);
  const user = getUser(req);
  const myReviews = reviews.filter(r => r.reviewerId === user.id);

  res.json({
    pendingReviews: pendingCases.length,
    completedReviews: myReviews.length,
    avgReviewTime: 2.4,
    recentReviews: await Promise.all(pendingCases.slice(0, 5).map(async c => {
      const [employer] = await db.select().from(employersTable).where(eq(employersTable.id, c.employerId));
      const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.caseId, c.id));
      const items = rec ? await db.select().from(recommendationItemsTable).where(eq(recommendationItemsTable.recommendationId, rec.id)) : [];
      const flags = items.reduce((s, i) => s + (i.warningFlags?.length ?? 0), 0);
      return {
        caseId: c.id, employeeName: c.employeeName, employerName: employer?.name ?? "Unknown",
        departureType: c.departureType, status: c.status,
        recommendationGeneratedAt: rec?.generatedAt?.toISOString() ?? null, flagCount: flags,
      };
    })),
  });
});

router.get("/consultant/reviews", async (req, res) => {
  const cases = await db.select().from(transitionCasesTable).where(eq(transitionCasesTable.status, "consultant_review_needed")).orderBy(desc(transitionCasesTable.updatedAt));
  const items = await Promise.all(cases.map(async c => {
    const [employer] = await db.select().from(employersTable).where(eq(employersTable.id, c.employerId));
    const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.caseId, c.id));
    const recItems = rec ? await db.select().from(recommendationItemsTable).where(eq(recommendationItemsTable.recommendationId, rec.id)) : [];
    const flags = recItems.reduce((s, i) => s + (i.warningFlags?.length ?? 0), 0);
    return {
      caseId: c.id, employeeName: c.employeeName, employerName: employer?.name ?? "Unknown",
      departureType: c.departureType, status: c.status,
      recommendationGeneratedAt: rec?.generatedAt?.toISOString() ?? null, flagCount: flags,
    };
  }));
  res.json({ items, total: items.length });
});

router.get("/consultant/reviews/:caseId", async (req, res) => {
  const { caseId } = req.params;
  const [c] = await db.select().from(transitionCasesTable).where(eq(transitionCasesTable.id, parseInt(caseId)));
  if (!c) { res.status(404).json({ error: "Not Found" }); return; }
  const [intake] = await db.select().from(healthIntakesTable).where(eq(healthIntakesTable.caseId, c.id));
  const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.caseId, c.id));
  const recItems = rec ? await db.select().from(recommendationItemsTable).where(eq(recommendationItemsTable.recommendationId, rec.id)).orderBy(recommendationItemsTable.rank) : [];
  const allPlans = recItems.length > 0 ? await db.select().from(healthPlansTable).limit(50) : [];
  const planMap = new Map(allPlans.map(p => [p.id, p]));
  const prevReviews = await db.select().from(consultantReviewsTable).where(eq(consultantReviewsTable.recommendationId, rec?.id ?? 0)).orderBy(desc(consultantReviewsTable.reviewedAt));

  const riskFlags: string[] = [];
  for (const item of recItems) {
    riskFlags.push(...(item.warningFlags ?? []));
  }
  if (!intake) riskFlags.unshift("Intake not completed");
  if ((intake?.age ?? 0) >= 64) riskFlags.unshift("Medicare eligibility approaching — review recommended");

  const caseData = {
    id: c.id, employeeId: c.employeeUserId ?? c.id, employerId: c.employerId,
    employeeName: c.employeeName, employeeEmail: c.employeeEmail, departureType: c.departureType,
    status: c.status, coverageEndDate: c.coverageEndDate ?? null,
    cobraPremiumEstimate: c.cobraPremiumEstimate ? parseFloat(c.cobraPremiumEstimate) : null,
    employeeZipCode: c.employeeZipCode ?? null, employmentStatus: c.employmentStatus ?? null,
    familyCoverage: c.familyCoverage, estimatedSavingsMin: c.estimatedSavingsMin ? parseFloat(c.estimatedSavingsMin) : null,
    estimatedSavingsMax: c.estimatedSavingsMax ? parseFloat(c.estimatedSavingsMax) : null,
    inviteSentAt: c.inviteSentAt?.toISOString() ?? null, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
  };

  res.json({
    case: caseData,
    recommendation: rec ? {
      id: rec.id, caseId: rec.caseId, status: rec.status,
      generatedAt: rec.generatedAt?.toISOString() ?? null,
      releasedAt: rec.releasedAt?.toISOString() ?? null,
      consultantNotes: rec.consultantNotes ?? null,
      items: recItems.map(item => {
        const plan = planMap.get(item.planId);
        return {
          id: item.id, rank: item.rank, planId: item.planId,
          planName: plan?.planName ?? "Unknown", issuerName: plan?.issuerName ?? "Unknown",
          planType: plan?.planType ?? "ppo", metalLevel: plan?.metalLevel ?? "silver",
          monthlyPremium: plan ? parseFloat(plan.monthlyPremium) : 0,
          deductible: plan ? parseFloat(plan.deductible) : 0,
          outOfPocketMax: plan ? parseFloat(plan.outOfPocketMax) : 0,
          estimatedAnnualCost: parseFloat(item.estimatedAnnualCost),
          estimatedMonthlySavingsVsCobra: parseFloat(item.estimatedMonthlySavingsVsCobra),
          estimatedAnnualSavingsVsCobra: parseFloat(item.estimatedAnnualSavingsVsCobra),
          matchScore: parseFloat(item.matchScore), confidenceScore: parseFloat(item.confidenceScore),
          explanation: item.explanation, pros: item.pros, cons: item.cons,
          assumptions: item.assumptions, warningFlags: item.warningFlags, recommendedNextSteps: item.recommendedNextSteps,
        };
      }),
    } : { id: 0, caseId: c.id, status: "pending", items: [], generatedAt: null, releasedAt: null, consultantNotes: null },
    intakeSummary: {
      completed: !!intake?.completedAt,
      age: intake?.age ?? null, state: intake?.state ?? null,
      householdSize: intake?.householdSize ?? null, incomeRange: intake?.expectedAnnualIncomeRange ?? null,
      medicareEligible: intake?.medicareEligible ?? null, hasPrescriptionNeeds: intake?.prescriptionNeeds ?? null,
      coveragePriorities: intake?.coveragePriorities ?? [],
    },
    riskFlags: [...new Set(riskFlags)],
    previousReviews: prevReviews.map(r => ({ id: r.id, action: r.action, notes: r.notes ?? null, reviewedAt: r.reviewedAt.toISOString() })),
  });
});

router.post("/recommendations/:recommendationId/review", requireAuth, requireRole("consultant", "admin"), async (req, res) => {
  const user = getUser(req);
  const recommendationId = Number(req.params.recommendationId);
  const { action, notes } = req.body as { action: "approve" | "request_regeneration" | "reject"; notes?: string };

  const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, recommendationId));
  if (!rec) { res.status(404).json({ error: "Not Found" }); return; }

  const newStatus = action === "approve" ? "released" : action === "request_regeneration" ? "generated" : "rejected";
  await db.update(recommendationsTable).set({
    status: newStatus as "generated" | "consultant_review" | "released" | "rejected",
    consultantNotes: notes ?? null,
    ...action === "approve" && { releasedAt: new Date() },
    updatedAt: new Date(),
  }).where(eq(recommendationsTable.id, recommendationId));

  if (action === "approve") {
    await db.update(transitionCasesTable).set({ status: "recommendations_released", updatedAt: new Date() }).where(eq(transitionCasesTable.id, rec.caseId));

    // Send notification email to employee
    const [tc] = await db.select().from(transitionCasesTable).where(eq(transitionCasesTable.id, rec.caseId));
    if (tc) {
      const [employer] = await db.select().from(employersTable).where(eq(employersTable.id, tc.employerId));
      const recItems = await db.select().from(recommendationItemsTable)
        .where(eq(recommendationItemsTable.recommendationId, rec.id))
        .orderBy(recommendationItemsTable.rank);
      const topItem = recItems[0];
      let topPlanName: string | null = null;
      if (topItem) {
        const [plan] = await db.select().from(healthPlansTable).where(eq(healthPlansTable.id, topItem.planId));
        topPlanName = plan?.planName ?? null;
      }
      sendRecommendationsReadyEmail({
        employeeName: tc.employeeName,
        employeeEmail: tc.employeeEmail,
        employerName: employer?.name ?? "Your Employer",
        departureType: tc.departureType,
        coverageEndDate: tc.coverageEndDate ?? null,
        topPlanName,
        estimatedMonthlySavings: topItem ? parseFloat(topItem.estimatedMonthlySavingsVsCobra) : null,
        consultantNotes: notes ?? null,
        caseId: tc.id,
      }).catch(err => { req.log.error({ err }, "Failed to send recommendations-ready email"); });
    }
  }

  await db.insert(consultantReviewsTable).values({
    recommendationId, reviewerId: user.id, action, notes: notes ?? null,
  });

  await logAudit(user, `recommendation.${action}`, "recommendation", recommendationId, notes);
  res.json({ message: `Recommendation ${action.replace("_", " ")} successfully` });
});

export default router;
