# Local Runbook

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

## Demo Accounts

All demo accounts use `demo1234`.

- Employer: `hr.demo@acmecorp.com`
- Employee: `james.chen@demo.com`
- Consultant: `consultant.demo@transitioniq.com`
- Admin: `admin@transitioniq.com`
