# TransitionIQ

## Workforce Health Transition Navigator

TransitionIQ is a local-first demo application for HR and benefits teams supporting employees through health coverage transitions. It combines synthetic transition cases, COBRA estimate comparison, Marketplace-style demo plan samples, stipend planning, coverage gap detection, consultant review, employee checklists, and audit logs.

This repository is designed to run outside hosted IDEs with normal local commands.

## Important Notice

All data in this project is synthetic. Demo plan rows are labeled and stored as demo samples; they are not official Marketplace data. TransitionIQ is not a broker replacement, enrollment platform, medical advice product, legal advice product, benefits guarantee engine, or production compliance system. Coverage estimates require review by licensed benefits professionals and verification against official plan documents.

## What Works Today

- Demo login for employer, employee, consultant, and admin roles
- Employer dashboard, case list, analytics, stipend policies, and ROI simulator
- Employee dashboard, intake, recommendation/options page, checklist, stipend view, and optional Coverage Guide chat
- Consultant dashboard, review queue, review detail, approve/reject/regeneration workflow
- Admin dashboard, audit logs, knowledge base, evaluation runner, and recommendation settings
- PostgreSQL schema managed by Drizzle
- Synthetic seed data for employers, users, cases, plan samples, recommendations, checklists, surveys, knowledge docs, and audit logs
- API smoke tests for login, health, seeded cases, intake, recommendation estimates, ROI, review actions, and audit logs
- Repository audit and archive packaging scripts

## Local Setup

Prerequisites:

- Node.js 20 or newer
- pnpm 10 or newer
- PostgreSQL 14 or newer

Create a local database and configure environment variables:

```bash
createdb transitioniq
cp .env.example .env
```

Edit `.env` if your PostgreSQL username, password, host, or port differs.

Install, seed, and run:

```bash
pnpm install
pnpm seed
pnpm dev
```

Default local URLs:

- Web app: `http://localhost:5173`
- API: `http://localhost:3001`
- Health check: `http://localhost:3001/api/healthz`

## Environment Variables

| Variable | Required | Default/example | Notes |
|---|---:|---|---|
| `DATABASE_URL` | Yes | `postgresql://postgres:password@localhost:5432/transitioniq` | PostgreSQL connection string |
| `SESSION_SECRET` | Recommended | `change_me...` | JWT signing secret |
| `PORT` | No | `3001` | API server port |
| `WEB_PORT` | No | `5173` | Vite dev server port |
| `VITE_API_TARGET` | No | `http://localhost:3001` | Web dev proxy target |
| `OPENAI_API_KEY` | No | unset | Optional Coverage Guide chat and richer explanation adapter |
| `OPENAI_BASE_URL` | No | unset | Optional custom OpenAI-compatible endpoint |
| `RESEND_API_KEY` | No | unset | Optional real email delivery; otherwise email logs are previewed |

## Demo Logins

All demo accounts use `demo1234`.

| Role | Email | Main Areas |
|---|---|---|
| Employer | `hr.demo@acmecorp.com` | Dashboard, cases, analytics, stipends, ROI |
| Employee | `james.chen@demo.com` | Dashboard, intake, options, checklist, stipend |
| Consultant | `consultant.demo@transitioniq.com` | Review queue and review detail |
| Admin | `admin@transitioniq.com` | Audit logs, knowledge base, evaluations, settings |

## Core Workflows

1. Employer opens or reviews a synthetic transition case.
2. Employee completes health transition intake.
3. The backend generates deterministic coverage option estimates from seeded demo plan samples.
4. Consultant reviews warning flags, notes, assumptions, and ranked options.
5. Approved options are released to the employee dashboard.
6. Audit logs record login, intake, recommendation, review, and admin actions.
7. Employer analytics and ROI simulator use seeded case values and deterministic calculations.

## Architecture

![Architecture diagram](docs/architecture.svg)

Additional diagrams:

- [Transition journey](docs/transition_journey.svg)
- [Coverage option flow](docs/coverage_option_flow.svg)
- [Review workflow](docs/review_workflow.svg)
- [Local runbook](docs/local_runbook.md)

## Data Model Overview

The Drizzle schema in `lib/db/src/schema` includes:

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

Seeded data lives in `scripts/src/seed.ts`. Supporting notices are in `data/`.

## Demo Output Screenshots

The original export did not include raster screenshot files. To keep the demo output visible in the README, this repository includes preserved SVG previews based on the implemented screens. Replace these with captured `screenshots/*.png` files after running the seeded local app if you want browser-captured images.

![Login demo output preview](docs/previews/01-login.svg)
![Employer dashboard demo output preview](docs/previews/02-employer-dashboard.svg)
![Employee intake demo output preview](docs/previews/03-employee-intake.svg)
![Recommendation options demo output preview](docs/previews/04-recommendations.svg)
![Consultant review demo output preview](docs/previews/05-consultant-review.svg)
![Admin audit demo output preview](docs/previews/06-admin-audit.svg)

## API Overview

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

The OpenAPI source is `lib/api-spec/openapi.yaml`. Generated Orval clients are kept under `lib/api-client-react/src/generated` and `lib/api-zod/src/generated`.

## Folder Structure

```text
.
  artifacts/
    api-server/        Express API
    transitioniq/      React + Vite web app
  data/                Synthetic data notices
  docs/                Diagrams, previews, and local runbook
  lib/
    api-client-react/  Orval-generated React Query client
    api-spec/          OpenAPI spec and Orval config
    api-zod/           Orval-generated Zod schemas
    db/                Drizzle schema and database client
  scripts/             Seed utilities
  tests/               API smoke tests
  tools/               Audit and packaging scripts
```

## Commands

```bash
pnpm install
pnpm seed
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm audit:repo
pnpm package
```

`pnpm package` creates:

- `dist/transitioniq-complete.zip`
- `dist/transitioniq-complete.tar.gz`
- `dist/archive_manifest.txt`

## Tests And Validation

The Vitest suite in `tests/api-smoke.test.ts` covers:

- health endpoint
- demo login for all roles
- seeded employer case loading
- analytics loading
- employee intake validation path
- deterministic recommendation/option estimate generation
- ROI simulator calculation
- consultant review action
- audit log retrieval

Run tests after `pnpm seed` so the synthetic database records exist. If PostgreSQL is not reachable, the DB-backed smoke tests are skipped and the health endpoint test still runs.

## Known Limitations

- The app uses local PostgreSQL, not an embedded database.
- Demo plan samples are not official Marketplace data.
- The Coverage Guide chat is optional and returns a local fallback unless `OPENAI_API_KEY` is configured.
- Email delivery is optional and logs previews unless `RESEND_API_KEY` is configured.
- Demo output previews are SVG assets, not browser-captured PNG screenshots.
- This demo is not production hardened for regulated data or compliance use.

## Unpack And Run An Archive

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
