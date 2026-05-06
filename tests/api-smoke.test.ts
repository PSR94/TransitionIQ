import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../artifacts/api-server/src/app";
import { pool } from "../lib/db/src/index";

const databaseAvailable = await pool
  .query("select 1")
  .then(() => true)
  .catch(() => false);

const dbIt = it.skipIf(!databaseAvailable);

async function demoToken(role: "employer" | "employee" | "consultant" | "admin") {
  const response = await request(app)
    .post("/api/auth/demo-login")
    .send({ role })
    .expect(200);

  expect(response.body.user.role).toBe(role);
  expect(response.body.token).toEqual(expect.any(String));
  return response.body.token as string;
}

describe("TransitionIQ API smoke flow", () => {
  it("returns health status", async () => {
    const response = await request(app).get("/api/healthz").expect(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  dbIt("supports demo login for all roles", async () => {
    await demoToken("employer");
    await demoToken("employee");
    await demoToken("consultant");
    await demoToken("admin");
  });

  dbIt("loads seeded employer cases and analytics", async () => {
    const token = await demoToken("employer");

    const cases = await request(app)
      .get("/api/employer/cases")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(cases.body.total).toBeGreaterThanOrEqual(1);
    expect(cases.body.cases[0].employeeEmail).toContain("@demo.com");

    const analytics = await request(app)
      .get("/api/employer/analytics")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(analytics.body.monthlyTrend.length).toBeGreaterThanOrEqual(1);
  });

  dbIt("validates employee intake and generates deterministic recommendation estimates", async () => {
    const token = await demoToken("employee");

    const intake = await request(app)
      .post("/api/employee/intake")
      .set("Authorization", `Bearer ${token}`)
      .send({
        age: 39,
        zipCode: "90210",
        state: "CA",
        householdSize: 1,
        cobraPremiumEstimate: 847,
        monthlyHealthcareBudget: 525,
        expectedMedicalUsage: "low",
        doctorPreference: true,
        prescriptionNeeds: false,
        medicareEligible: false,
        spouseCoveragePossibility: false,
        coveragePriorities: ["low_premium", "network_access"],
      })
      .expect(200);

    expect(intake.body.completedAt).toEqual(expect.any(String));

    const recommendations = await request(app)
      .post("/api/employee/recommendations/generate")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(200);

    expect(recommendations.body.items.length).toBeGreaterThanOrEqual(1);
    expect(recommendations.body.items[0].assumptions.join(" ")).toContain("COBRA");
  });

  dbIt("calculates ROI scenarios", async () => {
    const token = await demoToken("employer");

    const response = await request(app)
      .post("/api/employer/roi-simulation")
      .set("Authorization", `Bearer ${token}`)
      .send({
        numDepartingEmployees: 20,
        avgCobraPremium: 850,
        cobraElectionRate: 0.4,
        highCostClaimantRate: 0.15,
        avgMonthlyClaimExposure: 3000,
        stipendAmount: 400,
        stipendDurationMonths: 6,
        platformCostPerCase: 150,
      })
      .expect(200);

    expect(response.body.scenarios).toHaveLength(4);
    expect(response.body.netAnnualSavings).toEqual(expect.any(Number));
  });

  dbIt("records consultant review actions and audit logs", async () => {
    const consultantToken = await demoToken("consultant");
    const adminToken = await demoToken("admin");

    const queue = await request(app)
      .get("/api/consultant/reviews")
      .set("Authorization", `Bearer ${consultantToken}`)
      .expect(200);

    expect(queue.body.total).toBeGreaterThanOrEqual(1);

    const detail = await request(app)
      .get(`/api/consultant/reviews/${queue.body.items[0].caseId}`)
      .set("Authorization", `Bearer ${consultantToken}`)
      .expect(200);

    if (detail.body.recommendation.id) {
      await request(app)
        .post(`/api/recommendations/${detail.body.recommendation.id}/review`)
        .set("Authorization", `Bearer ${consultantToken}`)
        .send({ action: "approve", notes: "Demo review complete." })
        .expect(200);
    }

    const logs = await request(app)
      .get("/api/admin/audit-logs")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(logs.body.logs.length).toBeGreaterThanOrEqual(1);
  });
});
