import { Resend } from "resend";
import { logger } from "./logger";

const FROM_ADDRESS = "TransitionIQ Health <notifications@transitioniq.health>";
const APP_URL = process.env.APP_URL ?? "https://transitioniq.health";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    logger.info({ to, subject, preview: html.replace(/<[^>]+>/g, "").slice(0, 200) }, "[EMAIL DEV MODE] Would send email (set RESEND_API_KEY to enable real sending)");
    return;
  }
  const { error } = await resend.emails.send({ from: FROM_ADDRESS, to, subject, html });
  if (error) {
    logger.error({ to, subject, error }, "Failed to send email via Resend");
  } else {
    logger.info({ to, subject }, "Email sent successfully");
  }
}

function baseTemplate(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#6366f1 100%);padding:32px 40px;text-align:center;">
              <table role="presentation" width="100%">
                <tr>
                  <td align="center">
                    <div style="display:inline-flex;align-items:center;gap:10px;">
                      <span style="font-size:28px;">🛡️</span>
                      <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">TransitionIQ Health</span>
                    </div>
                    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:0.5px;text-transform:uppercase;">${title}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#f8faff;border-top:1px solid #e8edf8;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">You're receiving this because you have a TransitionIQ Health account.</p>
              <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;">© ${new Date().getFullYear()} TransitionIQ Health. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#6366f1);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;margin-top:24px;">${label}</a>`;
}

function infoCard(rows: Array<{ label: string; value: string }>): string {
  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;color:#64748b;font-weight:500;width:45%;border-bottom:1px solid #f1f5f9;">${r.label}</td>
      <td style="padding:10px 16px;font-size:13px;color:#1e293b;font-weight:600;border-bottom:1px solid #f1f5f9;">${r.value}</td>
    </tr>`).join("");
  return `<table role="presentation" width="100%" style="background:#f8faff;border-radius:10px;border:1px solid #e2e8f0;border-collapse:collapse;margin:24px 0;">${rowsHtml}</table>`;
}

export async function sendRecommendationsReadyEmail(opts: {
  employeeName: string;
  employeeEmail: string;
  employerName: string;
  departureType: string;
  coverageEndDate: string | null;
  topPlanName: string | null;
  estimatedMonthlySavings: number | null;
  consultantNotes: string | null;
  caseId: number;
}): Promise<void> {
  const { employeeName, employeeEmail, employerName, coverageEndDate, topPlanName, estimatedMonthlySavings, consultantNotes, caseId } = opts;
  const firstName = employeeName.split(" ")[0];
  const dashboardUrl = `${APP_URL}/employee/recommendations`;

  const savings = estimatedMonthlySavings != null
    ? `$${Math.round(estimatedMonthlySavings).toLocaleString()}/mo vs COBRA`
    : "Available in your dashboard";

  const coverageStr = coverageEndDate
    ? new Date(coverageEndDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "See your dashboard";

  const cards = infoCard([
    { label: "Employer", value: employerName },
    { label: "Coverage Ends", value: coverageStr },
    { label: "Top Recommendation", value: topPlanName ?? "Multiple plans found" },
    { label: "Estimated Savings", value: savings },
  ]);

  const notesHtml = consultantNotes
    ? `<div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:12px;color:#16a34a;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Consultant Note</p>
        <p style="margin:0;font-size:14px;color:#15803d;line-height:1.6;">${consultantNotes}</p>
      </div>`
    : "";

  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1e293b;line-height:1.3;">Your coverage recommendations are ready, ${firstName}!</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#64748b;line-height:1.6;">A licensed benefits consultant has reviewed your health coverage options. Your personalized recommendations are ready to view.</p>

    <div style="background:linear-gradient(135deg,#f0f4ff,#e8edf8);border-radius:12px;padding:20px 24px;margin-bottom:24px;border:1px solid #c7d2fe;">
      <p style="margin:0 0 4px;font-size:12px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">⏰ Time Sensitive</p>
      <p style="margin:0;font-size:14px;color:#3730a3;line-height:1.5;">Health coverage elections must typically be made within 60 days of losing employer coverage. Review your options soon to avoid a coverage gap.</p>
    </div>

    ${cards}
    ${notesHtml}

    <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">Log in to compare plans side-by-side, review cost breakdowns, and complete your COBRA deadline checklist.</p>

    <div style="text-align:center;">
      ${button(dashboardUrl, "View My Recommendations →")}
    </div>

    <p style="margin:32px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">Need help? Reply to this email or reach out through your dashboard. Our team is here to guide you through every step of your transition.</p>
  `;

  await sendEmail(
    employeeEmail,
    `✅ Your health coverage recommendations are ready — ${firstName}, take action before ${coverageStr}`,
    baseTemplate("Recommendations Ready", `Your personalized coverage recommendations from ${employerName} are ready to view.`, body),
  );
}

export async function sendEmployeeInviteEmail(opts: {
  employeeName: string;
  employeeEmail: string;
  employerName: string;
  departureType: string;
  coverageEndDate: string | null;
  caseId: number;
}): Promise<void> {
  const { employeeName, employeeEmail, employerName, departureType, coverageEndDate, caseId } = opts;
  const firstName = employeeName.split(" ")[0];
  const dashboardUrl = `${APP_URL}/`;

  const departureLabels: Record<string, string> = {
    layoff: "Layoff / Reduction in Force",
    voluntary_separation: "Voluntary Separation",
    retirement: "Retirement",
    reduction_in_hours: "Reduction in Hours",
    leave_of_absence: "Leave of Absence",
    other: "Employment Transition",
  };

  const coverageStr = coverageEndDate
    ? new Date(coverageEndDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "To be confirmed";

  const cards = infoCard([
    { label: "Employer", value: employerName },
    { label: "Transition Type", value: departureLabels[departureType] ?? departureType },
    { label: "Coverage End Date", value: coverageStr },
    { label: "COBRA Deadline", value: coverageEndDate ? `60 days after ${coverageStr}` : "See your dashboard" },
  ]);

  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1e293b;line-height:1.3;">Hi ${firstName}, your health transition case is open</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#64748b;line-height:1.6;">${employerName} has enrolled you in TransitionIQ Health to help you navigate your health coverage options. You'll get personalized plan recommendations reviewed by a licensed benefits consultant — at no cost to you.</p>

    ${cards}

    <p style="margin:0 0 20px;font-size:14px;color:#1e293b;font-weight:600;">Here's what happens next:</p>
    <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#475569;line-height:2;">
      <li>Complete your <strong>health intake</strong> (takes about 5 minutes)</li>
      <li>Rule-assisted estimates produce <strong>coverage option comparisons</strong></li>
      <li>A licensed consultant <strong>reviews and approves</strong> your options</li>
      <li>You <strong>compare plans</strong> and make your coverage decision</li>
    </ol>

    <div style="text-align:center;">
      ${button(dashboardUrl, "Get Started →")}
    </div>

    <p style="margin:32px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">Use the credentials provided by your HR team, or sign in using your work email. Questions? Reply to this email.</p>
  `;

  await sendEmail(
    employeeEmail,
    `${employerName} has enrolled you in TransitionIQ Health — action required`,
    baseTemplate("You're Invited", `${employerName} has opened a health transition case for you in TransitionIQ Health.`, body),
  );
}

export async function sendConsultantReviewRequestEmail(opts: {
  consultantEmail: string;
  consultantName: string;
  employeeName: string;
  employerName: string;
  departureType: string;
  caseId: number;
  flagCount: number;
}): Promise<void> {
  const { consultantEmail, consultantName, employeeName, employerName, departureType, caseId, flagCount } = opts;
  const firstName = consultantName.split(" ")[0];
  const reviewUrl = `${APP_URL}/consultant/reviews/${caseId}`;

  const departureLabels: Record<string, string> = {
    layoff: "Layoff / RIF",
    voluntary_separation: "Voluntary Separation",
    retirement: "Retirement",
    reduction_in_hours: "Reduction in Hours",
    leave_of_absence: "Leave of Absence",
    other: "Other",
  };

  const flagWarning = flagCount > 0
    ? `<div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:0 8px 8px 0;padding:16px 20px;margin:24px 0;">
        <p style="margin:0 0 4px;font-size:12px;color:#ea580c;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">⚠️ ${flagCount} Risk Flag${flagCount > 1 ? "s" : ""} Detected</p>
        <p style="margin:0;font-size:14px;color:#9a3412;line-height:1.6;">The estimate rules identified ${flagCount} item${flagCount > 1 ? "s" : ""} requiring attention. Please review carefully before approving.</p>
      </div>`
    : "";

  const cards = infoCard([
    { label: "Employee", value: employeeName },
    { label: "Employer", value: employerName },
    { label: "Transition Type", value: departureLabels[departureType] ?? departureType },
    { label: "Risk Flags", value: flagCount > 0 ? `⚠️ ${flagCount} flag${flagCount > 1 ? "s" : ""}` : "✅ None detected" },
  ]);

  const body = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1e293b;line-height:1.3;">New case ready for your review, ${firstName}</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#64748b;line-height:1.6;">Rule-assisted coverage estimates are ready for consultant review and approval.</p>

    ${cards}
    ${flagWarning}

    <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">Open the case in your dashboard to review the full recommendation set, check risk flags, add notes, and approve or request changes.</p>

    <div style="text-align:center;">
      ${button(reviewUrl, "Review Case →")}
    </div>
  `;

  await sendEmail(
    consultantEmail,
    `New review needed: ${employeeName} (${employerName}) — ${flagCount > 0 ? `⚠️ ${flagCount} flag${flagCount > 1 ? "s" : ""}` : "ready to approve"}`,
    baseTemplate("Review Requested", `Coverage estimates for ${employeeName} are ready for your review.`, body),
  );
}
