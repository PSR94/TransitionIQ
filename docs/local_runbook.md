# Local Runbook

This runbook is the operational path for running TransitionIQ on a local workstation. It assumes the checked-in synthetic data and local PostgreSQL setup.

## Prerequisites

- Node.js 20 or newer
- pnpm 10 or newer
- PostgreSQL 14 or newer

## Database

Create a local database named `transitioniq` and a user that matches `.env`.

```bash
createdb transitioniq
cp .env.example .env
```

Update `DATABASE_URL` in `.env` if your local PostgreSQL username or password differs.

To reset the local demo database, drop and recreate it, then seed again:

```bash
dropdb transitioniq
createdb transitioniq
pnpm seed
```

## Start

```bash
pnpm install
pnpm seed
pnpm dev
```

The API listens on `http://localhost:3001`. The web app listens on `http://localhost:5173` and proxies `/api` to the API server.

## Validate

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm audit:repo
pnpm package
```

DB-backed smoke tests expect seeded records. If PostgreSQL is not running, the suite skips those checks and still validates the health endpoint.

## Packaging

```bash
pnpm package
```

The archives are written to `dist/` and exclude dependencies, local environment files, build caches, raw screenshot drop folders, and existing archives.

## Demo Accounts

All demo accounts use `demo1234`.

- Employer: `hr.demo@acmecorp.com`
- Employee: `james.chen@demo.com`
- Consultant: `consultant.demo@transitioniq.com`
- Admin: `admin@transitioniq.com`

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL is not running or `DATABASE_URL` points to the wrong port | Start PostgreSQL and confirm `.env` |
| Web app loads but API calls fail | API server is not running or proxy target is wrong | Confirm `PORT` and `VITE_API_TARGET` |
| Login fails for demo accounts | Seed data has not been loaded | Run `pnpm seed` |
| Generated client types are stale | OpenAPI changed without regeneration | Run `pnpm --filter @workspace/api-spec codegen` |
