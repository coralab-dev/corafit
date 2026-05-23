# apps/api Agent Guide

NestJS API. Work module-by-module and prefer nearby specs.

## Commands
- Dev: `pnpm --filter api dev`
- Lint: `pnpm --filter api lint`
- Typecheck: `pnpm --filter api typecheck`
- Full tests: `pnpm --filter api test`
- Targeted test: `pnpm --filter api test -- <spec-path-or-name>`

## Local map
- Modules: `src/modules/`
- Shared auth/prisma code: `src/common/`
- Config validation: `src/config/`
- Entry point: `src/main.ts`

## Rules
- Avoid `dist`, logs, and generated output.
- API ESLint forbids explicit `any`.
- Keep DTO/controller/service edits aligned within the same module.
- Mock external services in tests; do not require live Supabase unless the task explicitly needs it.

## Verification
- Prefer the nearest `*.spec.ts` for the module touched.
- Run `pnpm --filter api typecheck` for cross-module type changes.
- Use full `pnpm --filter api test` only when shared behavior or multiple modules changed.
