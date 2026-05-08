# Contributing

TransitionIQ is structured as a local-first pnpm workspace. Keep changes reviewable and honest: synthetic data stays synthetic, estimates stay labeled as estimates, and optional external adapters must have deterministic local fallbacks.

## Local Setup

```bash
cp .env.example .env
createdb transitioniq
pnpm install
pnpm seed
pnpm dev
```

## Before Opening A PR

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm audit:repo
```

Run `pnpm seed` before testing DB-backed flows.

## Change Guidelines

- Keep backend route changes aligned with `lib/api-spec/openapi.yaml`.
- Regenerate clients when the OpenAPI contract changes.
- Keep screenshots current when UI flows change materially.
- Do not introduce real employee, employer, medical, or plan data.
- Avoid unsupported claims about savings, compliance, or production readiness.
- Keep generated files documented rather than hand-edited.

## Commit Style

Use cohesive commits with concrete messages:

- `Add consultant review action smoke coverage`
- `Document local PostgreSQL setup`
- `Refine employee recommendation summary`

Avoid broad messages like `updates`, `fix stuff`, or `misc`.
