# Agent Notes

Compact handoff state for future Codex sessions. Keep this short and update it during long tasks.

## Project facts
- CoraFit is a pnpm workspace monorepo.
- Workspaces detected: `apps/web`, `apps/api`, `packages/db`, `packages/shared`.
- Root `.env` supplies Supabase/Postgres and local app settings.
- `documentacion/` contains extensive product, architecture, API contract, and Linear backlog docs.
- Tests currently detected in `apps/api/src/**/*.spec.ts`.

## Architecture decisions
- pnpm workspaces are required.
- Turborepo is optional and not currently required.
- `packages/db` owns Prisma schema, migrations, seed, and Prisma client wrapper.
- `packages/shared` is for shared types/constants/validators and must not depend on Next.js or NestJS.

## Current task state
- COR-700 backend base implemented for weight logs and body measurements.
- Prisma schema now has `ProgressRecordActor`, `WeightLog`, and `BodyMeasurementLog` plus migration `20260605000000_add_progress_weight_measurements`.
- API routes added under `/progress/clients/:clientId/...` for coach/owner and `/client-portal/:token/progress/...` for client portal.
- Verification passed: `pnpm --filter db generate`, `pnpm --filter api test -- progress.service.spec.ts`, `pnpm --filter api typecheck`, and `pnpm --filter api lint`.

## Last tooling setup
- Added Codex guidance, compact notes, architecture map, testing notes, local AGENTS files, and safe ignore updates.

## Recently touched files
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260605000000_add_progress_weight_measurements/migration.sql`
- `packages/db/src/index.ts`
- `packages/db/src/generated/prisma/*`
- `apps/api/src/modules/progress/*`
- `apps/api/src/modules/client-portal/client-portal.controller.ts`
- `apps/api/src/modules/client-portal/client-portal.module.ts`
- `docs/agent-notes.md`

## Known failures
- `bash` is not available in this Windows environment; use PowerShell equivalents.
- No current COR-700 verification failures known.

## Next steps
- Keep this file updated during long-running tasks with current state and next action.
- When working from a Linear/COR ticket, search `documentacion/20_linear_backlog_real.md` and live Linear before deciding scope.

## Do not repeat / ignored areas
- Do not scan `node_modules`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.cache`, `playwright-report`, `test-results`, or logs.
- Do not inspect `packages/db/src/generated` unless debugging generated Prisma output.
- Do not read all of `documentacion/` or large docs without targeted search first.
