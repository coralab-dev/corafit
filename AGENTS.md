# CoraFit Agent Guide

Use this file first. Keep exploration narrow and update `docs/agent-notes.md` during long tasks.

## Project Map
- `apps/web`: Next.js 16 / React 19 app, App Router, UI components, hooks, layouts.
- `apps/api`: NestJS API with Vitest specs under `src/**/*.spec.ts`.
- `packages/db`: Prisma schema, migrations, seed, generated client wrapper.
- `packages/shared`: shared types/constants/validators; no Next.js or NestJS dependencies.
- `documentacion`: long product and backlog docs. Search before reading.
- `.agents`: local skills and references. Use only when the task calls for them.

## Commands
- Install: `pnpm install`
- Dev: `pnpm run dev`
- Local auth helper: `pnpm run dev:auth`
- Build all: `pnpm run build`
- Lint all: `pnpm run lint`
- Typecheck all: `pnpm run typecheck`
- API tests: `pnpm --filter api test`
- Smallest API test: `pnpm --filter api test -- <path-or-test-name>`

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
- For long tasks, update `docs/agent-notes.md` with current state and next steps.
- Avoid `node_modules`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.cache`, `playwright-report`, `test-results`, logs, and `packages/db/src/generated`.
- Do not open `documentacion/` files wholesale; use `rg` and small excerpts unless the task requires the full doc.
- Do not inspect `docs/*.png` or other binary assets unless the user asks about visuals.

## Editing Policy
- Make the smallest reversible change that satisfies the request.
- Do not touch unrelated dirty files or product code unless required.
- Do not add dependencies without explicit instruction.
- Do not change `model_reasoning_effort` or related reasoning settings.

## Verification Policy
- Run the smallest check that proves the touched area.
- API behavior: prefer a specific Vitest spec before `pnpm --filter api test`.
- Web changes: prefer `pnpm --filter web typecheck` and `pnpm --filter web lint`.
- DB schema changes: run `pnpm --filter db generate` only when Prisma changes.
- Escalate to root `lint`, `typecheck`, or `build` only when shared or cross-workspace behavior changes.
- Report skipped checks with the reason, especially when they need Supabase/Postgres or are expensive.

## Final Response Format
- Files changed.
- Verification run and result.
- Anything not verified or intentionally skipped.
- Recommended next steps, if useful.
