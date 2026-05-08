# Project Brief

## Purpose

TransitionIQ demonstrates how an HR benefits team could coordinate coverage transitions for departing employees without treating COBRA as the only default path. The demo brings employer cost exposure, employee intake, estimated plan comparisons, stipend planning, consultant review, and audit logging into one local workflow.

## Primary Users

| User | Goal |
|---|---|
| Employer HR lead | Track transition cases, understand COBRA exposure, configure stipend policy, and monitor outcomes |
| Departing employee | Complete intake, compare estimated options, follow next steps, and understand stipend support |
| Benefits consultant | Review risk flags, assumptions, and recommendation rationale before release |
| Platform admin | Inspect audit logs, evaluation runs, knowledge content, and recommendation settings |

## Demo Workflow

1. Employer creates or reviews a transition case.
2. Employee completes intake with household, coverage, budget, provider, and timing details.
3. Recommendation logic ranks demo plan samples against the intake and COBRA estimate.
4. Consultant reviews flags and releases, rejects, or requests regeneration.
5. Employee receives reviewed guidance and checklist items.
6. Employer dashboards and ROI calculations update from seeded case values.
7. Admin audit logs preserve workflow events.

## Implementation Principles

- Local-first by default.
- Synthetic data only.
- Deterministic calculations where possible.
- Optional external adapters must degrade to local demo behavior.
- Recommendations are estimates for review, not enrollment advice.
- Generated API clients remain documented and reproducible from the OpenAPI contract.

## Current Scope

In scope:

- Role-based demo login.
- Employer dashboards, case tracking, analytics, stipends, and ROI.
- Employee intake, recommendations, coverage guide, checklist, and stipend view.
- Consultant review queue and review actions.
- Admin audit, knowledge, evaluation, and settings screens.
- PostgreSQL schema and deterministic seed data.
- Smoke tests, repository audit scripts, and archive packaging.

Out of scope:

- Real employee records.
- Official plan imports.
- Enrollment submission.
- Claims adjudication.
- Compliance certification.
- Production identity management.
