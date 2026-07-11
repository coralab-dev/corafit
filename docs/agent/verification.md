# Agent Verification

Use the narrowest command that proves the touched area. Separate automatic checks, manual verification, and execution against real services in the final report.

## Verification Ladder
- Metadata or docs only: run documentation checks requested by the task; do not run builds, tests, lint, or typecheck unless requested.
- API module behavior: run the nearest Vitest spec first with `pnpm --filter api exec vitest run <spec>`.
- API cross-module or type changes: run `pnpm --filter api typecheck`, then `pnpm --filter api lint` when lint-sensitive files changed.
- Full API regression: run `pnpm --filter api test` only when shared API behavior or multiple modules changed.
- Web TypeScript or UI logic: run `pnpm --filter web typecheck`.
- Web lint-sensitive changes: run `pnpm --filter web lint`.
- Web production behavior: run `pnpm --filter web build` when routing, Next.js config, server/client boundaries, or production-only behavior changed.
- DB wrapper code: run `pnpm --filter db typecheck` and `pnpm --filter db lint`.
- DB schema or generated-client use: run `pnpm --filter db generate` before typecheck. If an API test imports the DB package after schema or generated-client changes, build the DB package first with `pnpm --filter db build` or use `pnpm --filter api test`, whose script builds DB before running Vitest.
- Shared package changes: because `packages/shared` has no package-local scripts, use root `pnpm run typecheck` and `pnpm run lint` when shared code participates in workspace checks.
- Cross-workspace changes: escalate to root `pnpm run typecheck`, `pnpm run lint`, or `pnpm run build` only when the change crosses workspace contracts or build behavior.

## Commands
- Root lint: `pnpm run lint`.
- Root typecheck: `pnpm run typecheck`.
- Root build: `pnpm run build`.
- API targeted Vitest: `pnpm --filter api exec vitest run <spec>`.
- API full tests: `pnpm --filter api test`.
- API typecheck: `pnpm --filter api typecheck`.
- API lint: `pnpm --filter api lint`.
- Web typecheck: `pnpm --filter web typecheck`.
- Web lint: `pnpm --filter web lint`.
- Web build: `pnpm --filter web build`.
- DB generate: `pnpm --filter db generate`.
- DB build: `pnpm --filter db build`.
- DB typecheck: `pnpm --filter db typecheck`.
- DB lint: `pnpm --filter db lint`.

## Boundaries
Automatic verification is local and repeatable. Manual verification is browser or operator-driven and must be reported separately. Execution against real services is neither automatic nor ordinary verification.

Do not use seeds, backfills, migrations, `db:push`, `dev:auth`, Storage operations, mutable Supabase/Postgres connections, or remote services as ordinary verification. Run them only when the task explicitly authorizes the exact target and operation.

Report the exact command, exit result, exact number of files changed, and exact number of tests run when test output provides a count. If a check is skipped, say why.
