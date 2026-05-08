# TransitionIQ

**Workforce Health Transition Navigator**

[![CI](https://github.com/PSR94/TransitionIQ/actions/workflows/ci.yml/badge.svg)](https://github.com/PSR94/TransitionIQ/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D20-0f766e)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D10-f59e0b)
![License](https://img.shields.io/badge/license-MIT-334155)

TransitionIQ is a local-first demo application for HR and benefits teams managing employee health coverage transitions. It gives employers, departing employees, consultants, and platform admins a shared workflow for estimating COBRA exposure, comparing demo coverage options, planning stipends, detecting coverage gaps, reviewing recommendations, and preserving audit history.

The project is intentionally portable: clone it, configure PostgreSQL, seed synthetic data, and run the web app plus API with standard `pnpm` commands.

![Employer dashboard screenshot](screenshots/02-employer-dashboard.png)

## Contents

- [What It Does](#what-it-does)
- [Product Boundaries](#product-boundaries)
- [Demo Tour](#demo-tour)
- [Local Quickstart](#local-quickstart)
- [Demo Accounts](#demo-accounts)
- [Architecture](#architecture)
- [Data And Safety](#data-and-safety)
- [API Surface](#api-surface)
- [Repository Map](#repository-map)
- [Quality Gates](#quality-gates)
- [Packaging](#packaging)
- [Known Limits](#known-limits)

## What It Does

TransitionIQ models a practical coverage-transition workflow:

- Employers can review transition cases, analytics, stipend policies, and ROI scenarios.
- Employees can complete an intake, review estimated plan options, track checklist items, and view stipend support.
- Consultants can review warnings, assumptions, and ranked options before releasing guidance.
- Admins can inspect audit logs, knowledge documents, recommendation settings, and evaluation runs.
- The API stores deterministic demo data in PostgreSQL through Drizzle and exposes a documented OpenAPI contract.

This is a serious local demo, not a production benefits platform. The value is in the end-to-end workflow, seeded data model, API contract, and reviewable implementation.

## Product Boundaries

All data in this repository is synthetic. Demo plan samples are not official Marketplace records and are not suitable for enrollment decisions.

TransitionIQ is not:

- a broker replacement
- an enrollment platform
- a medical, legal, or tax advice product
- a benefits guarantee engine
- a compliance-certified production system

Coverage estimates require licensed benefits review and verification against official plan documents.

## Demo Tour

The screenshots below are real captures from the seeded local demo workflow.

| Login and employer workflow | Employee workflow |
|---|---|
| ![Login screenshot](screenshots/01-login.png) | ![Employee dashboard screenshot](screenshots/04-employee-dashboard.png) |
| ![Employer dashboard screenshot](screenshots/02-employer-dashboard.png) | ![Employee intake screenshot](screenshots/05-employee-intake.png) |
| ![ROI simulator screenshot](screenshots/03-roi-simulator.png) | ![Plan recommendations screenshot](screenshots/06-plan-recommendations.png) |
| ![Stipend planning screenshot](screenshots/09-stipend-planning.png) | ![Coverage guide screenshot](screenshots/07-coverage-guide.png) |

| Review and administration |
|---|
| ![Employee checklist screenshot](screenshots/08-employee-checklist.png) |
| ![Consultant dashboard screenshot](screenshots/10-consultant-dashboard.png) |
| ![Admin dashboard screenshot](screenshots/11-admin-dashboard.png) |

## Local Quickstart

Prerequisites:

- Node.js 20 or newer
- pnpm 10 or newer
- PostgreSQL 14 or newer

```bash
git clone https://github.com/PSR94/TransitionIQ.git
cd TransitionIQ
cp .env.example .env
createdb transitioniq
pnpm install
pnpm seed
pnpm dev
```

Default local URLs:

| Service | URL |
|---|---|
| Web app | `http://localhost:5173` |
| API | `http://localhost:3001` |
| Health check | `http://localhost:3001/api/healthz` |

If your PostgreSQL user, password, host, or port differs, update `DATABASE_URL` in `.env`.

## Environment Variables

| Variable | Required | Default/example | Notes |
|---|---:|---|---|
| `DATABASE_URL` | Yes | `postgresql://postgres:password@localhost:5432/transitioniq` | PostgreSQL connection string |
| `SESSION_SECRET` | Recommended | `change_me...` | JWT signing secret |
| `PORT` | No | `3001` | API server port |
| `WEB_PORT` | No | `5173` | Vite dev server port |
| `VITE_API_TARGET` | No | `http://localhost:3001` | Web dev proxy target |
| `OPENAI_API_KEY` | No | unset | Optional Coverage Guide adapter |
| `OPENAI_BASE_URL` | No | unset | Optional OpenAI-compatible endpoint |
| `RESEND_API_KEY` | No | unset | Optional email delivery; otherwise notifications are logged |

## Demo Accounts

All demo accounts use `demo1234`.

| Role | Email | Areas |
|---|---|---|
| Employer | `hr.demo@acmecorp.com` | Dashboard, cases, analytics, stipends, ROI |
| Employee | `james.chen@demo.com` | Dashboard, intake, options, checklist, stipend, guide |
| Consultant | `consultant.demo@transitioniq.com` | Review queue and review detail |
| Admin | `admin@transitioniq.com` | Audit logs, knowledge base, evaluations, settings |

## Architecture

![Architecture diagram](docs/architecture.svg)

TransitionIQ is a pnpm workspace with a Vite React frontend, Express API, Drizzle/PostgreSQL data layer, OpenAPI contract, generated API clients, seed utilities, smoke tests, and packaging scripts.

| Layer | Location | Responsibility |
|---|---|---|
| Web app | `artifacts/transitioniq` | Role-based React UI and dashboard workflows |
| API server | `artifacts/api-server` | Auth, dashboards, intake, recommendations, reviews, audit, admin routes |
| Database package | `lib/db` | Drizzle schema, database client, typed tables |
| API contract | `lib/api-spec/openapi.yaml` | Source OpenAPI contract |
| Generated clients | `lib/api-client-react`, `lib/api-zod` | Orval-generated React Query and Zod helpers |
| Seed tooling | `scripts/src/seed.ts` | Synthetic employers, users, cases, plans, recommendations, audit records |
| Verification | `tests`, `tools` | Smoke tests, provenance audit, empty-folder check, archive packaging |

Additional docs:

- [Project brief](docs/project_brief.md)
- [Local runbook](docs/local_runbook.md)
- [Transition journey](docs/transition_journey.svg)
- [Coverage option flow](docs/coverage_option_flow.svg)
- [Review workflow](docs/review_workflow.svg)

## Data And Safety

The seeded schema covers:

- `users` and `employers`
- `transition_cases`
- `health_intakes`
- `health_plans`
- `recommendations` and `recommendation_items`
- `consultant_reviews`
- `stipend_policies`
- `checklist_items`
- `audit_logs`
- `knowledge_documents` and `knowledge_chunks`
- `evaluation_runs` and `evaluation_results`

Supporting data notices live in `data/`. The seed script is deterministic so demos, tests, screenshots, and API smoke checks stay aligned.

## API Surface

All API routes are mounted under `/api`.

| Area | Examples |
|---|---|
| Health | `GET /api/healthz` |
| Auth | `POST /api/auth/login`, `POST /api/auth/demo-login`, `GET /api/auth/session` |
| Employer | `GET /api/employer/dashboard`, `GET /api/employer/cases`, `POST /api/employer/roi-simulation` |
| Employee | `GET /api/employee/dashboard`, `POST /api/employee/intake`, `POST /api/employee/recommendations/generate` |
| Consultant | `GET /api/consultant/reviews`, `GET /api/consultant/reviews/:caseId`, `POST /api/recommendations/:recommendationId/review` |
| Admin | `GET /api/admin/audit-logs`, `GET /api/admin/evaluations`, `POST /api/admin/evaluations/run` |
| Optional guide | `POST /api/assistant/chat` |

The OpenAPI source is `lib/api-spec/openapi.yaml`. Generated Orval files are checked in because the app imports them directly.

## Repository Map

```text
.
  artifacts/
    api-server/        Express API service
    transitioniq/      React + Vite web app
  data/                Synthetic data notices
  docs/                Architecture docs, diagrams, and runbook
  lib/
    api-client-react/  Generated React Query client
    api-spec/          OpenAPI contract and generation config
    api-zod/           Generated Zod schemas
    db/                Drizzle schema and database client
  screenshots/         Real local demo captures used by the README
  scripts/             Seed utilities
  tests/               API smoke coverage
  tools/               Audit and packaging scripts
```

## Quality Gates

Use the same commands locally that CI runs:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm audit:repo
```

The smoke test suite covers:

- health endpoint
- demo login for all roles
- seeded employer case loading
- employer analytics loading
- employee intake validation path
- deterministic recommendation generation
- ROI calculation
- consultant review action
- audit log retrieval

Run `pnpm seed` first when you want DB-backed tests to exercise the full seeded workflow. If PostgreSQL is unavailable, DB-backed smoke tests are skipped and the health endpoint still runs.

## Packaging

```bash
pnpm package
```

This creates:

- `dist/transitioniq-complete.zip`
- `dist/transitioniq-complete.tar.gz`
- `dist/archive_manifest.txt`

The package script excludes local databases, dependencies, build caches, raw source screenshot drop folders, logs, and generated archives.

## Known Limits

- The app expects local PostgreSQL; it does not ship an embedded database.
- Demo plan samples are not official Marketplace data.
- The Coverage Guide returns deterministic fallback responses unless `OPENAI_API_KEY` is configured.
- Email delivery is optional and logs previews unless `RESEND_API_KEY` is configured.
- Screenshots should be refreshed when UI flows change materially.
- The demo is not hardened for regulated data or compliance use.

## Archive Quickstart

```bash
mkdir transitioniq
tar -xzf transitioniq-complete.tar.gz -C transitioniq
cd transitioniq
cp .env.example .env
createdb transitioniq
pnpm install
pnpm seed
pnpm dev
```

For the ZIP archive:

```bash
unzip transitioniq-complete.zip -d transitioniq
cd transitioniq
cp .env.example .env
createdb transitioniq
pnpm install
pnpm seed
pnpm dev
```
