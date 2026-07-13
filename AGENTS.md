# CoraFit Agent Guide

Use this file first. Keep exploration narrow and prefer the stable agent context in `docs/agent/`.

## Stable Context
- `docs/agent/README.md`: where project context belongs.
- `docs/agent/architecture.md`: stable monorepo and infrastructure map.
- `docs/agent/verification.md`: verification ladder and prohibited ordinary checks.

## Commands
- Install: `pnpm install`
- Dev: `pnpm run dev`
- Local auth helper: `pnpm run dev:auth`
- Build all: `pnpm run build`
- Lint all: `pnpm run lint`
- Typecheck all: `pnpm run typecheck`
- API tests: `pnpm --filter api test`
- Targeted API Vitest: `pnpm --filter api exec vitest run <spec>`

## Style Rules
- TypeScript is strict across app workspaces.
- API/db use typed ESLint configs; API forbids explicit `any`.
- Web uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`.
- Keep `packages/shared` framework-neutral.
- Prefer existing local patterns over broad refactors.

## Token/context rules
- Do not read the whole repository unless explicitly asked.
- Start with `git status --short`.
- Use targeted search before opening files.
- Prefer `rg`, `fd`, `git grep`, `head`, `sed`, and focused snippets.
- Do not inspect generated/build/cache folders.
- Before editing, list the specific files you plan to touch.
- If a file is large, inspect only relevant functions/classes first.
- Avoid `node_modules`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.cache`, `playwright-report`, `test-results`, logs, and `packages/db/src/generated`.
- Do not inspect `docs/*.png` or other binary assets unless the user asks about visuals.

## Editing Policy
- Make the smallest reversible change that satisfies the request.
- Do not touch unrelated dirty files or product code unless required.
- Do not add dependencies without explicit instruction.
- Do not change `model_reasoning_effort` or related reasoning settings.
- `dev:auth` may read local secrets from ignored env files, but do not run it
  during automated agent verification. Do not print, persist, or version
  passwords, JWTs, service keys, or database connection strings.

## Verification Policy
- Run the smallest check that proves the touched area.
- API behavior: prefer a specific Vitest spec before `pnpm --filter api test`; see `docs/agent/verification.md`.
- Web changes: prefer `pnpm --filter web typecheck` and `pnpm --filter web lint`.
- DB schema changes: run `pnpm --filter db generate` only when Prisma changes.
- Escalate to root `lint`, `typecheck`, or `build` only when shared or cross-workspace behavior changes.
- Report skipped checks with the reason, especially when they need Supabase/Postgres or are expensive.

## Final Response Format
- Files changed.
- Verification run and result.
- Anything not verified or intentionally skipped.
- Recommended next steps, if useful.
