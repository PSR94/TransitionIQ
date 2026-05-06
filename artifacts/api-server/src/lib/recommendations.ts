import { db, healthPlansTable, recommendationsTable, recommendationItemsTable, transitionCasesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOpenAIClient } from "./openai";

interface IntakeData {
  age?: number | null;
  householdSize?: number | null;
  monthlyHealthcareBudget?: string | null;
  cobraPremiumEstimate?: string | null;
  expectedMedicalUsage?: string | null;
  medicareEligible?: boolean | null;
  prescriptionNeeds?: boolean | null;
  doctorPreference?: boolean | null;
  state?: string | null;
  coveragePriorities?: string[] | null;
}

interface CaseData {
  id: number;
  cobraPremiumEstimate?: string | null;
  employerId: number;
}

export async function generateCoverageRecommendations(caseData: CaseData, intake: IntakeData) {
  const plans = await db.select().from(healthPlansTable).limit(20);
  const cobraPremium = parseFloat((intake.cobraPremiumEstimate || caseData.cobraPremiumEstimate || "850").toString());
  const monthlyBudget = parseFloat((intake.monthlyHealthcareBudget || "600").toString());

  const scoredPlans = plans.map(plan => {
    const premium = parseFloat(plan.monthlyPremium);
    const deductible = parseFloat(plan.deductible);
    const oop = parseFloat(plan.outOfPocketMax);
    const estimatedAnnualUsageMultiplier = intake.expectedMedicalUsage === "high" ? 0.7 : intake.expectedMedicalUsage === "medium" ? 0.4 : 0.1;
    const estimatedAnnualCost = premium * 12 + deductible * estimatedAnnualUsageMultiplier;

    let score = 100;
    const premiumDiff = (cobraPremium - premium) / cobraPremium;
    score += premiumDiff * 30;
    const budgetFit = premium <= monthlyBudget ? 20 : -((premium - monthlyBudget) / monthlyBudget) * 20;
    score += budgetFit;
    const oopScore = Math.max(0, 20 - (oop / 1000));
    score += oopScore;
    if (plan.qualityRating) score += parseFloat(plan.qualityRating) * 2;
    if (plan.telehealthAvailable) score += 3;
    if (plan.hsaEligible) score += 2;
    const isAgeBronzeAppropriate = (intake.age || 35) < 40 && intake.expectedMedicalUsage === "low";
    if (isAgeBronzeAppropriate && plan.metalLevel === "bronze") score += 8;
    if ((intake.age || 35) > 55 && plan.metalLevel === "gold") score += 8;

    const monthlySavings = cobraPremium - premium;
    const annualSavings = monthlySavings * 12;
    const confidence = Math.min(95, Math.max(50, score * 0.6 + 50));

    const warnings: string[] = [];
    if (intake.doctorPreference) warnings.push("Doctor network not verified — confirm your providers are in-network");
    if (intake.prescriptionNeeds) warnings.push("Prescription coverage needs manual review for your specific medications");
    if ((intake.age || 35) >= 64) warnings.push("Medicare review recommended — you may be approaching eligibility");
    if (premium > monthlyBudget) warnings.push("Premium exceeds stated monthly budget");
    if (deductible > 3000) warnings.push("High deductible plan — ensure you have savings to cover initial costs");

    return { plan, score: Math.round(score), estimatedAnnualCost, monthlySavings, annualSavings, confidence, warnings };
  });

  scoredPlans.sort((a, b) => b.score - a.score);
  const top3 = scoredPlans.slice(0, 3);

  const existingRec = await db.select().from(recommendationsTable).where(eq(recommendationsTable.caseId, caseData.id));
  let recId: number;

  if (existingRec.length > 0) {
    await db.delete(recommendationItemsTable).where(eq(recommendationItemsTable.recommendationId, existingRec[0].id));
    const [updated] = await db.update(recommendationsTable).set({ status: "generated", generatedAt: new Date(), updatedAt: new Date() }).where(eq(recommendationsTable.caseId, caseData.id)).returning();
    recId = updated.id;
  } else {
    const [rec] = await db.insert(recommendationsTable).values({ caseId: caseData.id, status: "generated", generatedAt: new Date() }).returning();
    recId = rec.id;
  }

  for (let i = 0; i < top3.length; i++) {
    const { plan, score, estimatedAnnualCost, monthlySavings, annualSavings, confidence, warnings } = top3[i];
    const explanation = await generatePlanExplanation(plan, intake, score, monthlySavings);

    const pros = [
      monthlySavings > 0 ? `Saves approximately $${Math.round(monthlySavings)}/month vs. COBRA` : `Comprehensive ${plan.metalLevel} coverage`,
      plan.telehealthAvailable ? "Telehealth visits included" : `${plan.planType.toUpperCase()} network flexibility`,
      plan.hsaEligible ? "HSA-eligible — tax-advantaged savings" : `${plan.metalLevel} tier coverage level`,
    ];

    const cons = [
      monthlySavings < 0 ? `$${Math.abs(Math.round(monthlySavings))}/month more than COBRA` : plan.metalLevel === "bronze" ? "Higher out-of-pocket costs when you need care" : "Higher monthly premium than bronze plans",
      intake.doctorPreference ? "Network verification needed for your doctors" : "Limited to in-network providers",
    ];

    await db.insert(recommendationItemsTable).values({
      recommendationId: recId,
      planId: plan.id,
      rank: i + 1,
      matchScore: score.toString(),
      confidenceScore: confidence.toFixed(1),
      estimatedAnnualCost: estimatedAnnualCost.toFixed(2),
      estimatedMonthlySavingsVsCobra: monthlySavings.toFixed(2),
      estimatedAnnualSavingsVsCobra: annualSavings.toFixed(2),
      explanation,
      pros,
      cons,
      assumptions: [
        `Based on stated monthly budget of $${monthlyBudget}`,
        `COBRA premium estimated at $${cobraPremium}/month`,
        intake.expectedMedicalUsage ? `Expected medical usage: ${intake.expectedMedicalUsage}` : "Average medical usage assumed",
        "Premium tax credit eligibility not included — verify based on actual income",
      ],
      warningFlags: warnings,
      recommendedNextSteps: [
        "Verify your current doctors are in this plan's network",
        "Check your prescription formulary",
        "Compare your expected costs using the plan's Summary of Benefits",
        "Contact the plan directly to confirm enrollment availability",
      ],
    });
  }

  await db.update(transitionCasesTable).set({
    status: "recommendations_generated",
    estimatedSavingsMin: (top3[0].monthlySavings * 0.8).toFixed(2),
    estimatedSavingsMax: (top3[0].monthlySavings * 1.1).toFixed(2),
    updatedAt: new Date(),
  }).where(eq(transitionCasesTable.id, caseData.id));

  const items = await db.select().from(recommendationItemsTable).where(eq(recommendationItemsTable.recommendationId, recId)).orderBy(recommendationItemsTable.rank);
  const [rec] = await db.select().from(recommendationsTable).where(eq(recommendationsTable.id, recId));

  const planMap = new Map(top3.map(t => [t.plan.id, t.plan]));
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

async function generatePlanExplanation(plan: { planName: string; metalLevel: string; planType: string; monthlyPremium: string }, intake: IntakeData, score: number, monthlySavings: number): Promise<string> {
  try {
    const openai = getOpenAIClient();
    if (!openai) {
      return getDefaultExplanation(plan, monthlySavings);
    }

    const prompt = `You are a healthcare benefits educator helping a departing employee understand their coverage options. Write a 2-3 sentence plain-language explanation for this plan recommendation.

Plan: ${plan.planName} (${plan.metalLevel} ${plan.planType.toUpperCase()})
Monthly premium: $${plan.monthlyPremium}
Match score: ${score}/100
Monthly savings vs. COBRA: $${Math.round(monthlySavings)}
Employee medical usage: ${intake.expectedMedicalUsage || "moderate"}

Rules: Do not provide legal or medical advice. Do not guarantee eligibility. Always recommend verifying with official sources. Be concise, educational, and reassuring. Focus on the cost tradeoff and coverage level fit.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content ?? getDefaultExplanation(plan, monthlySavings);
  } catch {
    return getDefaultExplanation(plan, monthlySavings);
  }
}

function getDefaultExplanation(plan: { planName: string; metalLevel: string }, monthlySavings: number): string {
  const savingsText = monthlySavings > 0 ? `saving you approximately $${Math.round(monthlySavings)} per month compared to COBRA` : `with comprehensive ${plan.metalLevel} tier coverage`;
  return `This ${plan.metalLevel} plan matches your stated healthcare priorities, ${savingsText}. Based on your intake information, this option balances monthly cost and coverage level well for your situation. Verify plan details, provider network, and prescription formulary before enrolling — plan terms can vary and official plan documents are the authoritative source.`;
}
