import bcrypt from "bcryptjs";
import { db, pool } from "@workspace/db";
import * as schema from "@workspace/db/schema";

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function seed() {
  console.log("Seeding TransitionIQ database with synthetic demo data...");

  // Employers
  const [acme] = await db.insert(schema.employersTable).values({
    name: "Acme Corporation",
    industry: "Technology",
    contactEmail: "hr@acmecorp.com",
    contactName: "Sarah Mitchell",
    website: "https://acmecorp.com",
  }).returning().catch(() => db.select().from(schema.employersTable).limit(1));

  const [meridian] = await db.insert(schema.employersTable).values({
    name: "Meridian Health Systems",
    industry: "Healthcare",
    contactEmail: "benefits@meridian.health",
    contactName: "David Park",
    website: "https://meridian.health",
  }).returning().catch(() => db.select().from(schema.employersTable).limit(1));

  console.log(`Employers: ${acme.name}, ${meridian.name}`);

  // Users
  const [hrUser] = await db.insert(schema.usersTable).values({
    email: "hr.demo@acmecorp.com",
    passwordHash: await hash("demo1234"),
    name: "Sarah Mitchell",
    role: "employer",
    employerId: acme.id,
  }).returning().catch(async () => {
    const r = await db.select().from(schema.usersTable);
    return r.filter(u => u.email === "hr.demo@acmecorp.com");
  });

  const [empUser] = await db.insert(schema.usersTable).values({
    email: "james.chen@demo.com",
    passwordHash: await hash("demo1234"),
    name: "James Chen",
    role: "employee",
    employerId: acme.id,
  }).returning().catch(async () => {
    const r = await db.select().from(schema.usersTable);
    return r.filter(u => u.email === "james.chen@demo.com");
  });

  const [consultantUser] = await db.insert(schema.usersTable).values({
    email: "consultant.demo@transitioniq.com",
    passwordHash: await hash("demo1234"),
    name: "Maria Rodriguez",
    role: "consultant",
    employerId: 1,
  }).returning().catch(async () => {
    const r = await db.select().from(schema.usersTable);
    return r.filter(u => u.email === "consultant.demo@transitioniq.com");
  });

  const [adminUser] = await db.insert(schema.usersTable).values({
    email: "admin@transitioniq.com",
    passwordHash: await hash("demo1234"),
    name: "Alex Thompson",
    role: "admin",
    employerId: 1,
  }).returning().catch(async () => {
    const r = await db.select().from(schema.usersTable);
    return r.filter(u => u.email === "admin@transitioniq.com");
  });

  console.log("Users: employer, employee, consultant, admin");

  // Plans
  const planData = [
    { planId: "ACM001", issuerName: "BlueCross BlueShield", planName: "BlueCross Silver Select PPO", metalLevel: "silver" as const, planType: "ppo" as const, state: "CA", county: "Los Angeles", zipCode: "90210", monthlyPremium: "487.00", deductible: "2500.00", outOfPocketMax: "7500.00", primaryCareVisit: "$30 copay", specialistVisit: "$60 copay", genericDrugCost: "$15", preferredBrandDrugCost: "$45", networkType: "Broad", telehealthAvailable: true, hsaEligible: false, qualityRating: "4.0", source: "demo", coverageYear: 2025 },
    { planId: "ACM002", issuerName: "Aetna", planName: "Aetna Gold HMO Plus", metalLevel: "gold" as const, planType: "hmo" as const, state: "CA", county: "Los Angeles", zipCode: "90210", monthlyPremium: "612.00", deductible: "1500.00", outOfPocketMax: "5500.00", primaryCareVisit: "$20 copay", specialistVisit: "$40 copay", genericDrugCost: "$10", preferredBrandDrugCost: "$35", networkType: "HMO Network", telehealthAvailable: true, hsaEligible: false, qualityRating: "4.5", source: "demo", coverageYear: 2025 },
    { planId: "ACM003", issuerName: "Kaiser Permanente", planName: "Kaiser Bronze HSA", metalLevel: "bronze" as const, planType: "hmo" as const, state: "CA", county: "Los Angeles", zipCode: "90210", monthlyPremium: "298.00", deductible: "6500.00", outOfPocketMax: "8700.00", primaryCareVisit: "$60 copay after deductible", specialistVisit: "$90 copay after deductible", genericDrugCost: "$20 after deductible", networkType: "Kaiser Only", telehealthAvailable: true, hsaEligible: true, qualityRating: "4.2", source: "demo", coverageYear: 2025 },
    { planId: "ACM004", issuerName: "UnitedHealthcare", planName: "UHC Silver Advantage PPO", metalLevel: "silver" as const, planType: "ppo" as const, state: "CA", county: "Los Angeles", zipCode: "90210", monthlyPremium: "521.00", deductible: "2000.00", outOfPocketMax: "7000.00", primaryCareVisit: "$35 copay", specialistVisit: "$65 copay", genericDrugCost: "$15", preferredBrandDrugCost: "$40", networkType: "Broad National", telehealthAvailable: true, hsaEligible: false, qualityRating: "3.8", source: "demo", coverageYear: 2025 },
    { planId: "ACM005", issuerName: "Covered California", planName: "CC Catastrophic Plan", metalLevel: "catastrophic" as const, planType: "epo" as const, state: "CA", county: "Los Angeles", zipCode: "90210", monthlyPremium: "195.00", deductible: "9100.00", outOfPocketMax: "9100.00", primaryCareVisit: "3 free visits/year, then deductible", specialistVisit: "Full deductible", genericDrugCost: "Full deductible", networkType: "Select", telehealthAvailable: false, hsaEligible: false, qualityRating: "3.5", source: "demo", coverageYear: 2025 },
    { planId: "ACM006", issuerName: "Cigna", planName: "Cigna Gold Open Access Plus", metalLevel: "gold" as const, planType: "ppo" as const, state: "CA", county: "Los Angeles", zipCode: "90210", monthlyPremium: "698.00", deductible: "800.00", outOfPocketMax: "4500.00", primaryCareVisit: "$15 copay", specialistVisit: "$30 copay", genericDrugCost: "$10", preferredBrandDrugCost: "$30", networkType: "Open Access", telehealthAvailable: true, hsaEligible: false, qualityRating: "4.3", source: "demo", coverageYear: 2025 },
    { planId: "ACM007", issuerName: "Molina Healthcare", planName: "Molina Silver Marketplace", metalLevel: "silver" as const, planType: "hmo" as const, state: "CA", county: "Los Angeles", zipCode: "90210", monthlyPremium: "399.00", deductible: "3000.00", outOfPocketMax: "8000.00", primaryCareVisit: "$40 copay", specialistVisit: "$75 copay", genericDrugCost: "$20", networkType: "Managed Care", telehealthAvailable: true, hsaEligible: false, qualityRating: "3.6", source: "demo", coverageYear: 2025 },
    { planId: "ACM008", issuerName: "Sharp Health Plan", planName: "Sharp Silver HMO", metalLevel: "silver" as const, planType: "hmo" as const, state: "CA", county: "San Diego", zipCode: "92101", monthlyPremium: "445.00", deductible: "2200.00", outOfPocketMax: "7200.00", primaryCareVisit: "$30 copay", specialistVisit: "$55 copay", genericDrugCost: "$15", networkType: "Sharp Hospitals", telehealthAvailable: true, hsaEligible: false, qualityRating: "4.1", source: "demo", coverageYear: 2025 },
    { planId: "ACM009", issuerName: "Anthem", planName: "Anthem Platinum Choice PPO", metalLevel: "platinum" as const, planType: "ppo" as const, state: "CA", county: "Los Angeles", zipCode: "90210", monthlyPremium: "849.00", deductible: "500.00", outOfPocketMax: "3000.00", primaryCareVisit: "$10 copay", specialistVisit: "$25 copay", genericDrugCost: "$5", preferredBrandDrugCost: "$20", networkType: "PPO Broad", telehealthAvailable: true, hsaEligible: false, qualityRating: "4.7", source: "demo", coverageYear: 2025 },
    { planId: "TX001", issuerName: "BCBS Texas", planName: "BlueCross Silver Select TX", metalLevel: "silver" as const, planType: "ppo" as const, state: "TX", county: "Harris", zipCode: "77001", monthlyPremium: "412.00", deductible: "2800.00", outOfPocketMax: "7900.00", primaryCareVisit: "$35 copay", specialistVisit: "$65 copay", genericDrugCost: "$15", networkType: "TX Statewide", telehealthAvailable: true, hsaEligible: false, qualityRating: "3.9", source: "demo", coverageYear: 2025 },
    { planId: "TX002", issuerName: "Humana", planName: "Humana Gold TX", metalLevel: "gold" as const, planType: "hmo" as const, state: "TX", county: "Harris", zipCode: "77001", monthlyPremium: "578.00", deductible: "1200.00", outOfPocketMax: "5000.00", primaryCareVisit: "$25 copay", specialistVisit: "$45 copay", genericDrugCost: "$10", networkType: "Texas Network", telehealthAvailable: true, hsaEligible: false, qualityRating: "4.1", source: "demo", coverageYear: 2025 },
    { planId: "NY001", issuerName: "Empire BlueCross", planName: "Empire Silver PPO NY", metalLevel: "silver" as const, planType: "ppo" as const, state: "NY", county: "New York", zipCode: "10001", monthlyPremium: "598.00", deductible: "3000.00", outOfPocketMax: "8000.00", primaryCareVisit: "$40 copay", specialistVisit: "$70 copay", genericDrugCost: "$20", networkType: "NY Metro", telehealthAvailable: true, hsaEligible: false, qualityRating: "3.8", source: "demo", coverageYear: 2025 },
  ];

  for (const plan of planData) {
    await db.insert(schema.healthPlansTable).values(plan).catch(() => {});
  }
  console.log(`Health plans: ${planData.length} demo plan samples`);

  // Get plans for recommendation items
  const plans = await db.select().from(schema.healthPlansTable).limit(3);

  // Transition cases
  const [case1] = await db.insert(schema.transitionCasesTable).values({
    employerId: acme.id,
    employeeUserId: empUser.id,
    employeeName: "James Chen",
    employeeEmail: "james.chen@demo.com",
    departureType: "layoff",
    status: "recommendations_released",
    coverageEndDate: "2025-07-31",
    cobraPremiumEstimate: "847.00",
    employeeZipCode: "90210",
    employmentStatus: "unemployed",
    familyCoverage: false,
    estimatedSavingsMin: "2800.00",
    estimatedSavingsMax: "4200.00",
    inviteToken: "demo-token-james",
    inviteSentAt: new Date("2025-06-01"),
    inviteOpenedAt: new Date("2025-06-02"),
  }).returning().catch(async () => {
    const r = await db.select().from(schema.transitionCasesTable);
    return r.filter(c => c.employeeEmail === "james.chen@demo.com");
  });

  const [case2] = await db.insert(schema.transitionCasesTable).values({
    employerId: acme.id,
    employeeName: "Patricia Williams",
    employeeEmail: "p.williams@demo.com",
    departureType: "voluntary",
    status: "intake_completed",
    coverageEndDate: "2025-08-15",
    cobraPremiumEstimate: "1240.00",
    employeeZipCode: "90405",
    familyCoverage: true,
    inviteToken: "demo-token-pat",
    inviteSentAt: new Date("2025-06-10"),
  }).returning().catch(async () => {
    const r = await db.select().from(schema.transitionCasesTable);
    return r.filter(c => c.employeeEmail === "p.williams@demo.com");
  });

  const [case3] = await db.insert(schema.transitionCasesTable).values({
    employerId: acme.id,
    employeeName: "Robert Kim",
    employeeEmail: "r.kim@demo.com",
    departureType: "retirement",
    status: "consultant_review_needed",
    coverageEndDate: "2025-07-01",
    cobraPremiumEstimate: "985.00",
    employeeZipCode: "90034",
    employeeUserId: null,
    familyCoverage: false,
    estimatedSavingsMin: "1200.00",
    estimatedSavingsMax: "2100.00",
    inviteToken: "demo-token-robert",
    inviteSentAt: new Date("2025-06-05"),
  }).returning().catch(async () => {
    const r = await db.select().from(schema.transitionCasesTable);
    return r.filter(c => c.employeeEmail === "r.kim@demo.com");
  });

  const [case4] = await db.insert(schema.transitionCasesTable).values({
    employerId: acme.id,
    employeeName: "Linda Torres",
    employeeEmail: "l.torres@demo.com",
    departureType: "reduction_in_hours",
    status: "invited",
    coverageEndDate: "2025-09-01",
    cobraPremiumEstimate: "720.00",
    familyCoverage: false,
    inviteToken: "demo-token-linda",
    inviteSentAt: new Date("2025-06-20"),
  }).returning().catch(async () => {
    const r = await db.select().from(schema.transitionCasesTable);
    return r.filter(c => c.employeeEmail === "l.torres@demo.com");
  });

  const [case5] = await db.insert(schema.transitionCasesTable).values({
    employerId: meridian.id,
    employeeName: "Marcus Johnson",
    employeeEmail: "m.johnson@demo.com",
    departureType: "layoff",
    status: "plan_selected",
    coverageEndDate: "2025-06-30",
    cobraPremiumEstimate: "1100.00",
    familyCoverage: true,
    estimatedSavingsMin: "3600.00",
    estimatedSavingsMax: "5200.00",
    inviteToken: "demo-token-marcus",
    inviteSentAt: new Date("2025-05-15"),
    inviteOpenedAt: new Date("2025-05-16"),
  }).returning().catch(async () => {
    const r = await db.select().from(schema.transitionCasesTable);
    return r.filter(c => c.employeeEmail === "m.johnson@demo.com");
  });

  console.log("Transition cases: 5 synthetic cases");

  // Intake for James Chen
  await db.insert(schema.healthIntakesTable).values({
    caseId: case1.id,
    age: 38,
    zipCode: "90210",
    state: "CA",
    county: "Los Angeles",
    householdSize: 1,
    expectedAnnualIncomeRange: "50000-75000",
    coverageEndDate: "2025-07-31",
    cobraPremiumEstimate: "847.00",
    monthlyHealthcareBudget: "500.00",
    currentPlanType: "PPO",
    dependentCoverageNeeds: false,
    doctorPreference: true,
    prescriptionNeeds: false,
    preferredDeductibleRange: "2000-4000",
    expectedMedicalUsage: "low",
    medicareEligible: false,
    spouseCoveragePossibility: false,
    coveragePriorities: ["low_premium", "network_access", "telehealth"],
    completedAt: new Date("2025-06-03"),
  }).catch(() => {});

  // Intake for Patricia Williams (family)
  await db.insert(schema.healthIntakesTable).values({
    caseId: case2.id,
    age: 45,
    zipCode: "90405",
    state: "CA",
    county: "Los Angeles",
    householdSize: 4,
    expectedAnnualIncomeRange: "75000-100000",
    coverageEndDate: "2025-08-15",
    cobraPremiumEstimate: "1240.00",
    monthlyHealthcareBudget: "750.00",
    currentPlanType: "HMO",
    dependentCoverageNeeds: true,
    doctorPreference: true,
    prescriptionNeeds: true,
    preferredDeductibleRange: "1000-3000",
    expectedMedicalUsage: "medium",
    medicareEligible: false,
    spouseCoveragePossibility: false,
    coveragePriorities: ["family_coverage", "prescription", "network_access"],
    completedAt: new Date("2025-06-12"),
  }).catch(() => {});

  // Intake for Robert Kim (retirement)
  await db.insert(schema.healthIntakesTable).values({
    caseId: case3.id,
    age: 63,
    zipCode: "90034",
    state: "CA",
    county: "Los Angeles",
    householdSize: 2,
    expectedAnnualIncomeRange: "40000-60000",
    coverageEndDate: "2025-07-01",
    cobraPremiumEstimate: "985.00",
    monthlyHealthcareBudget: "600.00",
    currentPlanType: "PPO",
    dependentCoverageNeeds: true,
    doctorPreference: true,
    prescriptionNeeds: true,
    preferredDeductibleRange: "500-2000",
    expectedMedicalUsage: "high",
    medicareEligible: false,
    spouseCoveragePossibility: false,
    coveragePriorities: ["low_deductible", "prescription", "specialist_access"],
    completedAt: new Date("2025-06-08"),
  }).catch(() => {});

  console.log("✓ Health intakes for 3 cases");

  // Recommendations for James Chen
  if (plans.length >= 3) {
    const [rec1] = await db.insert(schema.recommendationsTable).values({
      caseId: case1.id,
      status: "released",
      generatedAt: new Date("2025-06-04"),
      releasedAt: new Date("2025-06-05"),
      consultantNotes: "Reviewed and approved. James is a good candidate for the BlueCross Silver PPO given his doctor network preference. Subsidy eligibility should be explored given his income range.",
    }).returning().catch(async () => {
      const r = await db.select().from(schema.recommendationsTable);
      return r.filter(rc => rc.caseId === case1.id);
    });

    for (let i = 0; i < Math.min(3, plans.length); i++) {
      const plan = plans[i];
      const cobraPremium = 847;
      const premium = parseFloat(plan.monthlyPremium);
      const monthlySavings = cobraPremium - premium;
      await db.insert(schema.recommendationItemsTable).values({
        recommendationId: rec1.id,
        planId: plan.id,
        rank: i + 1,
        matchScore: (88 - i * 8).toString(),
        confidenceScore: (0.85 - i * 0.05).toFixed(2),
        estimatedAnnualCost: (premium * 12 + parseFloat(plan.deductible) * 0.15).toFixed(2),
        estimatedMonthlySavingsVsCobra: monthlySavings.toFixed(2),
        estimatedAnnualSavingsVsCobra: (monthlySavings * 12).toFixed(2),
        explanation: `This ${plan.metalLevel} plan from ${plan.issuerName} aligns with your stated preference for low monthly premiums and telehealth access. Saving approximately $${Math.round(monthlySavings)}/month versus COBRA, this option represents a strong cost-value balance for your situation. Verify your primary care physician is in-network before enrolling.`,
        pros: [
          monthlySavings > 0 ? `Saves $${Math.round(monthlySavings)}/month vs. COBRA ($${Math.round(monthlySavings * 12)}/year)` : "Comprehensive coverage level",
          plan.telehealthAvailable ? "Telehealth visits included at no extra cost" : `${plan.planType.toUpperCase()} flexibility for specialists`,
          plan.hsaEligible ? "HSA-eligible — save pre-tax dollars" : `Quality rating: ${plan.qualityRating}/5.0`,
        ],
        cons: [
          i === 0 ? "Monthly premium exceeds stated ideal budget by $" + Math.round(premium - 500) : "In-network only for most services",
          "Doctor network not yet verified for your specific providers",
        ],
        assumptions: [
          "COBRA premium based on employer-provided estimate of $847/month",
          "Subsidy eligibility not included — verify at healthcare.gov based on actual 2025 income",
          "Based on low expected medical usage — adjust if health needs change",
          "Premium rates are estimated for 2025 coverage year",
        ],
        warningFlags: i === 2 ? [
          "High deductible — ensure you have savings to cover initial care costs",
          "Doctor network preference noted — verify in-network status before enrollment",
        ] : [
          "Doctor network preference noted — verify in-network status before enrollment",
        ],
        recommendedNextSteps: [
          "Call the plan's member services to verify your current doctors are in-network",
          "Check prescription formulary if applicable",
          "Use the plan's cost estimator tool for your expected services",
          "Contact healthcare.gov to check subsidy eligibility based on 2025 income",
        ],
      }).catch(() => {});
    }

    // Recommendation for Robert Kim (consultant review)
    const [rec3] = await db.insert(schema.recommendationsTable).values({
      caseId: case3.id,
      status: "consultant_review",
      generatedAt: new Date("2025-06-09"),
    }).returning().catch(async () => {
      const r = await db.select().from(schema.recommendationsTable);
      return r.filter(rc => rc.caseId === case3.id);
    });

    if (plans.length >= 2) {
      for (let i = 0; i < 2; i++) {
        const plan = plans[i];
        const premium = parseFloat(plan.monthlyPremium);
        const monthlySavings = 985 - premium;
        await db.insert(schema.recommendationItemsTable).values({
          recommendationId: rec3.id,
          planId: plan.id,
          rank: i + 1,
          matchScore: (82 - i * 6).toString(),
          confidenceScore: "0.75",
          estimatedAnnualCost: (premium * 12 + 1200).toFixed(2),
          estimatedMonthlySavingsVsCobra: monthlySavings.toFixed(2),
          estimatedAnnualSavingsVsCobra: (monthlySavings * 12).toFixed(2),
          explanation: `This ${plan.metalLevel} plan may suit Robert's needs, however consultant review is recommended given Medicare approaching eligibility at age 63.`,
          pros: [`Saves $${Math.round(monthlySavings)}/month vs. COBRA`, "Comprehensive prescription coverage"],
          cons: ["Medicare review strongly recommended for age 63", "Limited to bridge coverage before Medicare eligibility"],
          assumptions: ["Bridge coverage until Medicare eligibility", "Premium subsidy not calculated pending income verification"],
          warningFlags: ["Medicare eligibility approaching in 1-2 years — begin planning now", "Specialist and prescription needs suggest gold or platinum tier", "Confirm spouse coverage needs"],
          recommendedNextSteps: ["Consult a licensed Medicare advisor before enrollment", "Verify Medicare Parts A, B, D timeline", "Check income-based subsidy availability"],
        }).catch(() => {});
      }
    }
  }

  console.log("✓ Recommendations for demo cases");

  // Stipend policies
  await db.insert(schema.stipendPoliciesTable).values({
    employerId: acme.id,
    name: "Acme Transition Healthcare Stipend",
    monthlyAmount: "400.00",
    durationMonths: 6,
    eligibleDepartureTypes: ["layoff", "reduction_in_hours"],
    maxTotalContribution: "2400.00",
    reimbursementCategories: ["health_insurance_premium", "dental", "vision", "prescription_copay"],
    startDate: "2025-01-01",
  }).catch(() => {});

  await db.insert(schema.stipendPoliciesTable).values({
    employerId: meridian.id,
    name: "Meridian Enhanced Transition Package",
    monthlyAmount: "600.00",
    durationMonths: 12,
    eligibleDepartureTypes: ["layoff", "voluntary", "retirement"],
    maxTotalContribution: "7200.00",
    reimbursementCategories: ["health_insurance_premium", "dental", "vision", "prescription_copay", "mental_health", "telehealth"],
    startDate: "2025-01-01",
  }).catch(() => {});

  console.log("✓ Stipend policies");

  // Checklist for James Chen
  const checklistItems = [
    { caseId: case1.id, key: "cobra_notice", label: "Review COBRA Notice", description: "Review the COBRA continuation coverage notice provided by your employer", completed: true, dueDate: null, category: "documents", sortOrder: 1 },
    { caseId: case1.id, key: "coverage_end", label: "Confirm Coverage End Date", description: "Your coverage ends July 31, 2025", completed: true, dueDate: null, category: "documents", sortOrder: 2 },
    { caseId: case1.id, key: "complete_intake", label: "Complete Health Intake", description: "Fill out your health needs intake form", completed: true, dueDate: null, category: "intake", sortOrder: 3 },
    { caseId: case1.id, key: "compare_options", label: "Compare Coverage Options", description: "Review your personalized plan recommendations", completed: true, dueDate: null, category: "recommendations", sortOrder: 4 },
    { caseId: case1.id, key: "check_network", label: "Check Provider Network", description: "Verify that your current doctors are in-network for your preferred plan", completed: false, dueDate: "2025-07-15", category: "due_diligence", sortOrder: 5 },
    { caseId: case1.id, key: "check_subsidy", label: "Review Subsidy Eligibility", description: "Check your ACA premium tax credit eligibility at healthcare.gov", completed: false, dueDate: "2025-07-15", category: "due_diligence", sortOrder: 6 },
    { caseId: case1.id, key: "select_plan", label: "Select Your Plan", description: "Choose your coverage option before the SEP window closes", completed: false, dueDate: "2025-09-29", category: "decision", sortOrder: 7 },
    { caseId: case1.id, key: "save_documents", label: "Save Enrollment Documents", description: "Download and store all coverage confirmation documents", completed: false, dueDate: null, category: "documents", sortOrder: 8 },
  ];

  for (const item of checklistItems) {
    await db.insert(schema.checklistItemsTable).values(item).catch(() => {});
  }

  console.log("✓ Checklist items");

  // Knowledge base documents
  const knowledgeDocs = [
    {
      title: "COBRA Overview and Election Timeline",
      category: "cobra",
      content: `COBRA (Consolidated Omnibus Budget Reconciliation Act) allows employees and their families to continue group health coverage for a limited period after losing employer-sponsored coverage due to qualifying events.

Key Facts:
- You have 60 days from either the date coverage ends or the date you receive the COBRA election notice (whichever is later) to elect COBRA.
- COBRA coverage can last up to 18 months for most qualifying events (36 months in some cases, such as divorce or death of the covered employee).
- You will pay the full cost of the premium plus a 2% administrative fee — meaning what your employer was paying plus what you were paying, plus 2%.
- COBRA is often significantly more expensive than marketplace alternatives but provides immediate continuation of the exact same plan and network.
- There is no open enrollment restriction for COBRA — you elect it or you don't.

Qualifying Events for Employees:
- Voluntary or involuntary job loss (except for gross misconduct)
- Reduction in hours that causes loss of coverage
- Transition between jobs

Qualifying Events for Dependents:
- Employee loses coverage due to the above events
- Divorce or legal separation from covered employee
- Employee becomes entitled to Medicare
- Dependent child loses dependent status under plan rules

Important: Always verify COBRA specifics with your plan administrator or HR department, as details can vary.`,
    },
    {
      title: "ACA Marketplace Plans and Metal Tiers",
      category: "aca",
      content: `The Affordable Care Act (ACA) created a Health Insurance Marketplace where individuals can purchase coverage independently of employer-sponsored plans.

Metal Tiers:
- Bronze: Lowest monthly premiums, highest out-of-pocket costs. Best for healthy people who rarely need care. Covers ~60% of average healthcare costs.
- Silver: Mid-range premiums and costs. Required tier if you qualify for cost-sharing reductions (CSRs) based on income. Covers ~70% of costs.
- Gold: Higher premiums, lower out-of-pocket costs. Best for people who use healthcare regularly. Covers ~80% of costs.
- Platinum: Highest premiums, lowest out-of-pocket costs. Best for high healthcare users. Covers ~90% of costs.
- Catastrophic: Very low premiums, very high deductibles. Only available to people under 30 or those with hardship exemptions.

Premium Tax Credits (Subsidies):
- Available to individuals and families with incomes between 100% and 400% of the federal poverty level (FPL), with expanded access through 2025.
- The amount of the tax credit is based on income, family size, and the cost of the benchmark Silver plan in your area.
- Subsidies can significantly reduce the cost of marketplace plans.

Special Enrollment Periods (SEPs):
- Losing employer coverage is a qualifying life event that triggers a 60-day SEP.
- Other qualifying events include marriage, birth/adoption, moving to a new coverage area, and certain income changes.
- Outside of open enrollment and SEPs, you generally cannot enroll in a marketplace plan.

Important: Visit healthcare.gov or your state marketplace to check actual plan availability, pricing, and subsidy eligibility in your specific area.`,
    },
    {
      title: "Medicare and Bridge Coverage",
      category: "medicare",
      content: `Medicare is the federal health insurance program primarily for people age 65 or older, and for certain younger people with disabilities.

Parts of Medicare:
- Part A (Hospital Insurance): Covers inpatient hospital stays, skilled nursing facility care, hospice, and some home health care. Most people get Part A premium-free.
- Part B (Medical Insurance): Covers outpatient care, doctors' services, and preventive services. Monthly premium applies.
- Part C (Medicare Advantage): Private plans approved by Medicare that combine Parts A and B, often with Part D.
- Part D (Prescription Drug Coverage): Helps cover prescription drug costs.

Transition Planning for Those Nearing Age 65:
- Most people become eligible for Medicare on the first day of the month they turn 65.
- You have a 7-month Initial Enrollment Period (IEP): 3 months before your birthday month, your birthday month, and 3 months after.
- If you have employer coverage, you may be able to delay Part B without penalty — but this depends on employer size.
- Failing to enroll in Parts B and D when first eligible (without other qualifying coverage) can result in permanent late enrollment penalties.
- Gap coverage is often needed for those 62-64 who have lost employer coverage before Medicare eligibility.

Important: Medicare rules are complex. Always consult with a licensed Medicare specialist or your local State Health Insurance Assistance Program (SHIP) for personalized guidance.`,
    },
    {
      title: "Understanding Plan Costs: Premiums, Deductibles, and Out-of-Pocket Maximums",
      category: "plan_basics",
      content: `Understanding the cost structure of health insurance plans helps you make informed comparisons.

Key Cost Terms:
- Premium: The monthly amount you pay to have coverage, regardless of whether you use healthcare services.
- Deductible: The amount you pay for covered healthcare services before your insurance begins to pay. Example: $2,000 deductible means you pay the first $2,000 of covered services per year.
- Copay: A fixed amount you pay for specific services, like $30 for a primary care visit.
- Coinsurance: Your share of costs after meeting your deductible. Example: 20% coinsurance means you pay 20% and insurance pays 80%.
- Out-of-Pocket Maximum (OOPM): The most you'll pay for covered services in a plan year. After reaching this amount, the plan pays 100% of covered services.
- Network: The providers, hospitals, and facilities that have negotiated rates with your insurance plan. In-network care is usually much less expensive than out-of-network.

Estimating Annual Costs:
A common approach to compare plans: Annual Cost = (Monthly Premium × 12) + Expected Out-of-Pocket Costs
For healthy people with few claims, a high-deductible bronze plan may cost less overall even with higher deductibles, because the lower premiums outweigh the risk.
For people with regular prescriptions, specialists, or chronic conditions, a gold or silver plan's lower cost-sharing often saves money overall despite higher premiums.

HSA (Health Savings Account) Plans:
- Available only with High-Deductible Health Plans (HDHPs).
- Contributions are tax-deductible, grow tax-free, and can be withdrawn tax-free for qualified medical expenses.
- Unused funds roll over year to year — a significant long-term benefit.

Always read the plan's Summary of Benefits and Coverage (SBC) document for definitive cost-sharing details.`,
    },
    {
      title: "Healthcare Stipends and Employer Transition Assistance",
      category: "stipends",
      content: `Some employers offer transition assistance to help departing employees navigate healthcare coverage changes.

Types of Employer Transition Assistance:
- Healthcare Stipends: A fixed monthly allowance to help offset health insurance premiums or related expenses during transition.
- COBRA Subsidy: Employer temporarily pays part of the COBRA premium, reducing your cost for a period.
- HRA (Health Reimbursement Arrangement): Employer reimburses specific healthcare expenses directly, often through a formal program.
- Extended Coverage: Some employers offer to extend coverage for a period beyond employment end at no cost.

How Stipends Work:
- Typically provided as a monthly payment for a fixed number of months after departure.
- May cover premiums only, or a broader set of healthcare costs (prescriptions, dental, vision).
- Eligibility often depends on departure type (e.g., layoffs may qualify but voluntary resignations may not).
- Stipend amounts and categories are defined in the employer's stipend policy.

Tax Considerations:
- Healthcare stipends may be taxable income depending on how they are structured.
- COBRA subsidies paid directly by employers may not be taxable to employees.
- Always consult a tax advisor for guidance specific to your situation.

Reimbursement Categories (common examples):
- Monthly health insurance premiums (marketplace, COBRA, or individual plans)
- Dental and vision insurance premiums
- Prescription drug costs / copays
- Mental health services
- Telehealth subscription services

Note: Stipend programs vary widely by employer. Review your employer's specific policy for eligibility, amount, duration, and reimbursable categories.`,
    },
  ];

  for (const doc of knowledgeDocs) {
    const [inserted] = await db.insert(schema.knowledgeDocumentsTable).values({
      title: doc.title,
      category: doc.category,
      content: doc.content,
      chunkCount: 0,
    }).returning().catch(async () => {
      const r = await db.select().from(schema.knowledgeDocumentsTable);
      return r.filter(d => d.title === doc.title);
    });

    // Chunk the document
    const words = doc.content.split(" ");
    const chunkSize = 150;
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(" "));
    }

    for (let ci = 0; ci < chunks.length; ci++) {
      const keywords = chunks[ci].toLowerCase().split(/\W+/).filter(w => w.length > 4).slice(0, 10);
      await db.insert(schema.knowledgeChunksTable).values({
        documentId: inserted.id,
        chunkIndex: ci,
        content: chunks[ci],
        keywords,
      }).catch(() => {});
    }

    await db.update(schema.knowledgeDocumentsTable).set({ chunkCount: chunks.length }).where(
      (await import("drizzle-orm")).eq(schema.knowledgeDocumentsTable.id, inserted.id)
    );
  }

  console.log("✓ Knowledge base documents and chunks");

  // Survey responses
  await db.insert(schema.surveyResponsesTable).values({
    caseId: case1.id,
    satisfactionScore: 5,
    easeOfUseScore: 4,
    recommendationHelpfulness: 5,
    assistantHelpfulness: 4,
    comments: "The coverage comparison was incredibly helpful. I never knew there were so many options beyond COBRA. Saved me almost $400/month!",
    selectedPlanType: "silver",
  }).catch(() => {});

  await db.insert(schema.surveyResponsesTable).values({
    caseId: case5.id,
    satisfactionScore: 4,
    easeOfUseScore: 5,
    recommendationHelpfulness: 4,
    assistantHelpfulness: 3,
    comments: "Good tool overall. The Coverage Guide could use more specific plan details. The ROI simulator was useful for our HR team.",
    selectedPlanType: "gold",
  }).catch(() => {});

  console.log("✓ Survey responses");

  // Audit log entries
  const auditEntries = [
    { userId: hrUser.id, userEmail: hrUser.email, action: "user.login", resourceType: null, resourceId: null, details: "Demo employer login" },
    { userId: hrUser.id, userEmail: hrUser.email, action: "case.create", resourceType: "case", resourceId: case1.id, details: "Created case for James Chen" },
    { userId: hrUser.id, userEmail: hrUser.email, action: "case.invite_sent", resourceType: "case", resourceId: case1.id, details: "Invite sent to james.chen@demo.com" },
    { userId: empUser.id, userEmail: empUser.email, action: "user.login", resourceType: null, resourceId: null, details: "Employee demo login" },
    { userId: empUser.id, userEmail: empUser.email, action: "intake.submit", resourceType: "case", resourceId: case1.id, details: "Health intake submitted" },
    { userId: empUser.id, userEmail: empUser.email, action: "recommendation.generate", resourceType: "case", resourceId: case1.id, details: "Recommendations generated" },
    { userId: consultantUser.id, userEmail: consultantUser.email, action: "recommendation.approve", resourceType: "recommendation", resourceId: 1, details: "Approved recommendations for James Chen" },
    { userId: adminUser.id, userEmail: adminUser.email, action: "evaluation.run", resourceType: "evaluation", resourceId: 1, details: "Evaluation suite run" },
  ];

  for (const entry of auditEntries) {
    await db.insert(schema.auditLogsTable).values(entry).catch(() => {});
  }

  console.log("✓ Audit logs");

  // Recommendation settings
  await db.insert(schema.recommendationSettingsTable).values({}).catch(() => {});
  console.log("✓ Recommendation settings (defaults)");

  console.log("\n🎉 Seed complete!");
  console.log("\nDemo login credentials:");
  console.log("  Employer:    hr.demo@acmecorp.com      / demo1234");
  console.log("  Employee:    james.chen@demo.com        / demo1234");
  console.log("  Consultant:  consultant.demo@transitioniq.com / demo1234");
  console.log("  Admin:       admin@transitioniq.com     / demo1234");

  await pool.end();
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
