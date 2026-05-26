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
- Optimized training plan editor mutations to avoid full `loadPlan()` refreshes after small edits.
- Frontend hook now patches local plan state for week/day/session/exercise/alternative add/delete/reorder.
- API now returns enriched session exercise payloads after create/update/duplicate and enriched alternatives after create.
- Verification passed: `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter api lint`, and `pnpm --filter api test -- src/modules/training-plans/training-plans.service.spec.ts`.

## Last tooling setup
- Added Codex guidance, compact notes, architecture map, testing notes, local AGENTS files, and safe ignore updates.

## Recently touched files
- `AGENTS.md`
- `docs/agent-notes.md`
- `docs/architecture-short.md`
- `docs/testing.md`
- `.gitignore`
- `apps/web/AGENTS.md`
- `apps/api/AGENTS.md`
- `packages/db/AGENTS.md`
- `packages/shared/AGENTS.md`

## Known failures
- `bash` is not available in this Windows environment; use PowerShell equivalents.
- Test suites were not run for this tooling-only task by instruction.

## Next steps
- Keep this file updated during long-running tasks with current state and next action.
- When working from a Linear/COR ticket, search `documentacion/20_linear_backlog_real.md` and live Linear before deciding scope.

## Do not repeat / ignored areas
- Do not scan `node_modules`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.cache`, `playwright-report`, `test-results`, or logs.
- Do not inspect `packages/db/src/generated` unless debugging generated Prisma output.
- Do not read all of `documentacion/` or large docs without targeted search first.
