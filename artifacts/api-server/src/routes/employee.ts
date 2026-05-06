import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import {
  db, transitionCasesTable, healthIntakesTable, recommendationsTable,
  recommendationItemsTable, healthPlansTable, checklistItemsTable,
  stipendPoliciesTable, supportRequestsTable, surveyResponsesTable,
  employersTable, usersTable
} from "@workspace/db";
import { requireAuth, requireRole, getUser } from "../lib/auth";
import { logAudit } from "../lib/audit";
import { generateCoverageRecommendations } from "../lib/recommendations";
import { sendConsultantReviewRequestEmail } from "../lib/email";

const router = Router();
router.use("/employee", requireAuth, requireRole("employee", "admin"));

async function getEmployeeCase(userId: number) {
  const [c] = await db.select().from(transitionCasesTable).where(eq(transitionCasesTable.employeeUserId, userId));
  return c;
}

router.get("/employee/dashboard", async (req, res) => {
  const user = getUser(req);
  const c = await getEmployeeCase(user.id);
  if (!c) {
    res.status(404).json({ error: "Not Found", message: "No transition case found for this account" });
    return;
  }

  const [employer] = await db.select().from(employersTable).where(eq(employersTable.id, c.employerId));
  const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.caseId, c.id));
  const checklist = await db.select().from(checklistItemsTable).where(eq(checklistItemsTable.caseId, c.id));
  const completed = checklist.filter(item => item.completed).length;

  const [stipend] = await db.select().from(stipendPoliciesTable).where(eq(stipendPoliciesTable.employerId, c.employerId));
  const isStipendEligible = stipend ? (stipend.eligibleDepartureTypes as string[]).includes(c.departureType) : false;

  let daysUntilEnd: number | null = null;
  let cobraDeadline: string | null = null;
  if (c.coverageEndDate) {
    const endDate = new Date(c.coverageEndDate);
    daysUntilEnd = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const cobraEnd = new Date(endDate);
    cobraEnd.setDate(cobraEnd.getDate() + 60);
    cobraDeadline = cobraEnd.toISOString().split("T")[0];
  }

  res.json({
    caseStatus: c.status,
    employerName: employer?.name ?? "Your Employer",
    departureType: c.departureType,
    coverageEndDate: c.coverageEndDate ?? null,
    cobraPremiumEstimate: c.cobraPremiumEstimate ? parseFloat(c.cobraPremiumEstimate) : null,
    intakeCompleted: ["intake_completed", "recommendations_generated", "consultant_review_needed", "recommendations_released", "plan_selected", "closed"].includes(c.status),
    recommendationsReady: !!rec && rec.status === "generated",
    recommendationsReleased: rec?.status === "released",
    stipendEligible: isStipendEligible,
    stipendMonthlyAmount: stipend && isStipendEligible ? parseFloat(stipend.monthlyAmount) : null,
    checklistProgress: completed,
    totalChecklistItems: checklist.length,
    daysUntilCoverageEnd: daysUntilEnd,
    cobraElectionDeadline: cobraDeadline,
    estimatedSavings: c.estimatedSavingsMin && c.estimatedSavingsMax
      ? (parseFloat(c.estimatedSavingsMin) + parseFloat(c.estimatedSavingsMax)) / 2
      : null,
  });
});

router.get("/employee/intake", async (req, res) => {
  const user = getUser(req);
  const c = await getEmployeeCase(user.id);
  if (!c) { res.status(404).json({ error: "Not Found" }); return; }
  const [intake] = await db.select().from(healthIntakesTable).where(eq(healthIntakesTable.caseId, c.id));
  if (!intake) {
    res.json({
      id: 0, caseId: c.id, coveragePriorities: [],
      age: null, zipCode: null, state: null, county: null, householdSize: null,
      expectedAnnualIncomeRange: null, coverageEndDate: c.coverageEndDate, cobraPremiumEstimate: c.cobraPremiumEstimate ? parseFloat(c.cobraPremiumEstimate) : null,
      monthlyHealthcareBudget: null, currentPlanType: null, dependentCoverageNeeds: null, doctorPreference: null,
      prescriptionNeeds: null, preferredDeductibleRange: null, expectedMedicalUsage: null,
      medicareEligible: null, spouseCoveragePossibility: null, completedAt: null,
    });
    return;
  }
  res.json(serializeIntake(intake));
});

router.post("/employee/intake", async (req, res) => {
  const user = getUser(req);
  const c = await getEmployeeCase(user.id);
  if (!c) { res.status(404).json({ error: "Not Found" }); return; }
  const body = req.body;

  const existing = await db.select().from(healthIntakesTable).where(eq(healthIntakesTable.caseId, c.id));
  const intakeData = {
    caseId: c.id,
    age: body.age ?? null,
    zipCode: body.zipCode ?? null,
    state: body.state ?? null,
    county: body.county ?? null,
    householdSize: body.householdSize ?? null,
    expectedAnnualIncomeRange: body.expectedAnnualIncomeRange ?? null,
    coverageEndDate: body.coverageEndDate ?? null,
    cobraPremiumEstimate: body.cobraPremiumEstimate?.toString() ?? null,
    monthlyHealthcareBudget: body.monthlyHealthcareBudget?.toString() ?? null,
    currentPlanType: body.currentPlanType ?? null,
    dependentCoverageNeeds: body.dependentCoverageNeeds ?? null,
    doctorPreference: body.doctorPreference ?? null,
    prescriptionNeeds: body.prescriptionNeeds ?? null,
    preferredDeductibleRange: body.preferredDeductibleRange ?? null,
    expectedMedicalUsage: body.expectedMedicalUsage ?? null,
    medicareEligible: body.medicareEligible ?? null,
    spouseCoveragePossibility: body.spouseCoveragePossibility ?? null,
    coveragePriorities: body.coveragePriorities ?? [],
    completedAt: new Date(),
    updatedAt: new Date(),
  };

  let intake;
  if (existing.length > 0) {
    const [u] = await db.update(healthIntakesTable).set(intakeData).where(eq(healthIntakesTable.caseId, c.id)).returning();
    intake = u;
  } else {
    const [i] = await db.insert(healthIntakesTable).values(intakeData).returning();
    intake = i;
  }

  await db.update(transitionCasesTable).set({ status: "intake_completed", updatedAt: new Date() }).where(eq(transitionCasesTable.id, c.id));
  await logAudit(user, "intake.submit", "case", c.id);
  res.json(serializeIntake(intake));
});

router.get("/employee/recommendations", async (req, res) => {
  const user = getUser(req);
  const c = await getEmployeeCase(user.id);
  if (!c) { res.status(404).json({ error: "Not Found" }); return; }
  const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.caseId, c.id));
  if (!rec) {
    res.json({ id: 0, caseId: c.id, status: "pending", items: [], generatedAt: null, releasedAt: null, consultantNotes: null });
    return;
  }
  res.json(await serializeRecommendation(rec));
});

router.post("/employee/recommendations/generate", async (req, res) => {
  const user = getUser(req);
  const c = await getEmployeeCase(user.id);
  if (!c) { res.status(404).json({ error: "Not Found" }); return; }

  const [intake] = await db.select().from(healthIntakesTable).where(eq(healthIntakesTable.caseId, c.id));
  if (!intake) { res.status(400).json({ error: "Bad Request", message: "Complete intake before generating recommendations" }); return; }

  const rec = await generateCoverageRecommendations(c, intake);
  await logAudit(user, "recommendation.generate", "case", c.id);

  // Notify all consultants that a case is ready for review (fire-and-forget)
  const [employer] = await db.select().from(employersTable).where(eq(employersTable.id, c.employerId));
  const consultants = await db.select().from(usersTable).where(eq(usersTable.role, "consultant"));
  const items = await db.select().from(recommendationItemsTable).where(eq(recommendationItemsTable.recommendationId, rec.id));
  const flagCount = items.reduce((s, i) => s + (i.warningFlags?.length ?? 0), 0);
  for (const consultant of consultants) {
    sendConsultantReviewRequestEmail({
      consultantEmail: consultant.email,
      consultantName: consultant.name,
      employeeName: c.employeeName,
      employerName: employer?.name ?? "Unknown Employer",
      departureType: c.departureType,
      caseId: c.id,
      flagCount,
    }).catch(err => { req.log.error({ err }, "Failed to send consultant review request email"); });
  }

  res.json(rec);
});

router.get("/employee/compare", async (req, res) => {
  const user = getUser(req);
  const c = await getEmployeeCase(user.id);
  const { planIds } = req.query as { planIds?: string };
  let plans;
  if (planIds) {
    const ids = planIds.split(",").map(Number).filter(Boolean);
    plans = ids.length > 0
      ? await db.select().from(healthPlansTable).where(inArray(healthPlansTable.id, ids)).limit(5)
      : await db.select().from(healthPlansTable).limit(5);
  } else {
    plans = await db.select().from(healthPlansTable).limit(4);
  }
  res.json({ plans: plans.map(serializePlan), cobraPremium: c?.cobraPremiumEstimate ? parseFloat(c.cobraPremiumEstimate) : null });
});

router.get("/employee/checklist", async (req, res) => {
  const user = getUser(req);
  const c = await getEmployeeCase(user.id);
  if (!c) { res.status(404).json({ error: "Not Found" }); return; }
  let items = await db.select().from(checklistItemsTable).where(eq(checklistItemsTable.caseId, c.id)).orderBy(checklistItemsTable.sortOrder);

  if (items.length === 0) {
    const defaultItems = getDefaultChecklist(c.id, c.coverageEndDate);
    const inserted = await db.insert(checklistItemsTable).values(defaultItems).returning();
    items = inserted;
  }

  let cobraDeadline: string | null = null;
  let sepEnd: string | null = null;
  if (c.coverageEndDate) {
    const end = new Date(c.coverageEndDate);
    const cobra = new Date(end); cobra.setDate(cobra.getDate() + 60);
    const sep = new Date(end); sep.setDate(sep.getDate() + 60);
    cobraDeadline = cobra.toISOString().split("T")[0];
    sepEnd = sep.toISOString().split("T")[0];
  }

  res.json({
    items: items.map(i => ({ id: i.id, key: i.key, label: i.label, description: i.description, completed: i.completed, dueDate: i.dueDate ?? null, category: i.category })),
    deadlines: { cobraElectionDeadline: cobraDeadline, sepWindowEnd: sepEnd, medicareReminderDate: null, coverageEndDate: c.coverageEndDate ?? null },
  });
});

router.patch("/employee/checklist", async (req, res) => {
  const user = getUser(req);
  const { itemId, completed } = req.body;
  await db.update(checklistItemsTable).set({ completed, updatedAt: new Date() }).where(eq(checklistItemsTable.id, itemId));
  res.json({ message: "Checklist item updated" });
});

router.post("/employee/support-request", async (req, res) => {
  const user = getUser(req);
  const c = await getEmployeeCase(user.id);
  if (!c) { res.status(404).json({ error: "Not Found" }); return; }
  await db.insert(supportRequestsTable).values({ caseId: c.id, message: req.body.message, requestType: req.body.requestType, status: "pending" });
  await db.update(transitionCasesTable).set({ status: "consultant_review_needed", updatedAt: new Date() }).where(eq(transitionCasesTable.id, c.id));
  await logAudit(user, "support.request", "case", c.id);
  res.status(201).json({ message: "Support request submitted. A consultant will review your case." });
});

router.post("/employee/survey", async (req, res) => {
  const user = getUser(req);
  const c = await getEmployeeCase(user.id);
  if (!c) { res.status(404).json({ error: "Not Found" }); return; }
  const b = req.body;
  await db.insert(surveyResponsesTable).values({
    caseId: c.id, satisfactionScore: b.satisfactionScore, easeOfUseScore: b.easeOfUseScore,
    recommendationHelpfulness: b.recommendationHelpfulness, assistantHelpfulness: b.assistantHelpfulness,
    comments: b.comments ?? null, selectedPlanType: b.selectedPlanType ?? null,
  });
  res.status(201).json({ message: "Thank you for your feedback." });
});

router.get("/employee/stipend", async (req, res) => {
  const user = getUser(req);
  const c = await getEmployeeCase(user.id);
  if (!c) { res.json({ eligible: false, reimbursementCategories: [] }); return; }
  const [stipend] = await db.select().from(stipendPoliciesTable).where(eq(stipendPoliciesTable.employerId, c.employerId));
  if (!stipend || !(stipend.eligibleDepartureTypes as string[]).includes(c.departureType)) {
    res.json({ eligible: false, reimbursementCategories: [] });
    return;
  }
  const totalAmount = parseFloat(stipend.monthlyAmount) * stipend.durationMonths;
  res.json({
    eligible: true,
    stipendName: stipend.name,
    monthlyAmount: parseFloat(stipend.monthlyAmount),
    durationMonths: stipend.durationMonths,
    totalAmount,
    remainingMonths: stipend.durationMonths,
    reimbursementCategories: stipend.reimbursementCategories,
  });
});

function serializeIntake(i: typeof healthIntakesTable.$inferSelect) {
  return {
    id: i.id, caseId: i.caseId, age: i.age, zipCode: i.zipCode, state: i.state, county: i.county,
    householdSize: i.householdSize, expectedAnnualIncomeRange: i.expectedAnnualIncomeRange,
    coverageEndDate: i.coverageEndDate, cobraPremiumEstimate: i.cobraPremiumEstimate ? parseFloat(i.cobraPremiumEstimate) : null,
    monthlyHealthcareBudget: i.monthlyHealthcareBudget ? parseFloat(i.monthlyHealthcareBudget) : null,
    currentPlanType: i.currentPlanType, dependentCoverageNeeds: i.dependentCoverageNeeds,
    doctorPreference: i.doctorPreference, prescriptionNeeds: i.prescriptionNeeds,
    preferredDeductibleRange: i.preferredDeductibleRange, expectedMedicalUsage: i.expectedMedicalUsage,
    medicareEligible: i.medicareEligible, spouseCoveragePossibility: i.spouseCoveragePossibility,
    coveragePriorities: i.coveragePriorities ?? [],
    completedAt: i.completedAt?.toISOString() ?? null,
  };
}

function serializePlan(p: typeof healthPlansTable.$inferSelect) {
  return {
    id: p.id, planId: p.planId, issuerName: p.issuerName, planName: p.planName,
    metalLevel: p.metalLevel, planType: p.planType, state: p.state, county: p.county ?? null,
    zipCode: p.zipCode ?? null, monthlyPremium: parseFloat(p.monthlyPremium),
    deductible: parseFloat(p.deductible), outOfPocketMax: parseFloat(p.outOfPocketMax),
    primaryCareVisit: p.primaryCareVisit ?? null, specialistVisit: p.specialistVisit ?? null,
    genericDrugCost: p.genericDrugCost ?? null, networkType: p.networkType ?? null,
    telehealthAvailable: p.telehealthAvailable, hsaEligible: p.hsaEligible,
    qualityRating: p.qualityRating ? parseFloat(p.qualityRating) : null,
    source: p.source, coverageYear: p.coverageYear,
  };
}

async function serializeRecommendation(rec: typeof recommendationsTable.$inferSelect) {
  const items = await db.select().from(recommendationItemsTable).where(eq(recommendationItemsTable.recommendationId, rec.id)).orderBy(recommendationItemsTable.rank);
  const planIds = items.map(i => i.planId);
  const plans = planIds.length > 0 ? await db.select().from(healthPlansTable) : [];
  const planMap = new Map(plans.map(p => [p.id, p]));

  return {
    id: rec.id, caseId: rec.caseId, status: rec.status,
    generatedAt: rec.generatedAt?.toISOString() ?? null,
    releasedAt: rec.releasedAt?.toISOString() ?? null,
    consultantNotes: rec.consultantNotes ?? null,
    items: items.map(item => {
      const plan = planMap.get(item.planId);
      return {
        id: item.id, rank: item.rank, planId: item.planId,
        planName: plan?.planName ?? "Unknown Plan", issuerName: plan?.issuerName ?? "Unknown",
        planType: plan?.planType ?? "ppo", metalLevel: plan?.metalLevel ?? "silver",
        monthlyPremium: plan ? parseFloat(plan.monthlyPremium) : 0,
        deductible: plan ? parseFloat(plan.deductible) : 0,
        outOfPocketMax: plan ? parseFloat(plan.outOfPocketMax) : 0,
        estimatedAnnualCost: parseFloat(item.estimatedAnnualCost),
        estimatedMonthlySavingsVsCobra: parseFloat(item.estimatedMonthlySavingsVsCobra),
        estimatedAnnualSavingsVsCobra: parseFloat(item.estimatedAnnualSavingsVsCobra),
        matchScore: parseFloat(item.matchScore),
        confidenceScore: parseFloat(item.confidenceScore),
        explanation: item.explanation, pros: item.pros, cons: item.cons,
        assumptions: item.assumptions, warningFlags: item.warningFlags,
        recommendedNextSteps: item.recommendedNextSteps,
      };
    }),
  };
}

function getDefaultChecklist(caseId: number, coverageEndDate: string | null) {
  const cobraDeadline = coverageEndDate
    ? new Date(new Date(coverageEndDate).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    : null;
  const sepDeadline = coverageEndDate
    ? new Date(new Date(coverageEndDate).getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    : null;

  return [
    { caseId, key: "cobra_notice", label: "Review COBRA Notice", description: "Review the COBRA continuation coverage notice provided by your employer", completed: false, dueDate: null, category: "documents", sortOrder: 1 },
    { caseId, key: "coverage_end", label: "Confirm Coverage End Date", description: "Verify the exact date your current employer coverage ends", completed: false, dueDate: null, category: "documents", sortOrder: 2 },
    { caseId, key: "complete_intake", label: "Complete Health Intake", description: "Fill out your health needs intake form to receive personalized recommendations", completed: false, dueDate: null, category: "intake", sortOrder: 3 },
    { caseId, key: "compare_options", label: "Compare Coverage Options", description: "Review and compare COBRA vs. ACA marketplace vs. other alternatives", completed: false, dueDate: null, category: "recommendations", sortOrder: 4 },
    { caseId, key: "check_network", label: "Check Provider Network", description: "Verify that your current doctors are in-network for your preferred plan", completed: false, dueDate: null, category: "due_diligence", sortOrder: 5 },
    { caseId, key: "check_prescriptions", label: "Check Prescription Coverage", description: "Confirm your prescriptions are covered under the plans you are considering", completed: false, dueDate: null, category: "due_diligence", sortOrder: 6 },
    { caseId, key: "check_subsidy", label: "Review Subsidy Eligibility", description: "Check if you qualify for ACA premium tax credits based on your income", completed: false, dueDate: null, category: "due_diligence", sortOrder: 7 },
    { caseId, key: "select_plan", label: "Select Next Step", description: "Choose which coverage option you will pursue and notify your transition counselor", completed: false, dueDate: cobraDeadline, category: "decision", sortOrder: 8 },
    { caseId, key: "save_documents", label: "Save Confirmation Documents", description: "Download and save all enrollment confirmations and coverage documents", completed: false, dueDate: null, category: "documents", sortOrder: 9 },
  ];
}

export default router;
