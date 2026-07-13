# packages/db Agent Guide

Prisma database package. Treat schema and migrations as the source of truth.

## Commands
- Generate client: `pnpm --filter db generate`
- Typecheck: `pnpm --filter db typecheck`
- Lint: `pnpm --filter db lint`
- Push schema locally: `pnpm --filter db db:push` (mutation; local verified
  target only unless explicitly authorized)

## Local map
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Seed: `prisma/seed.ts`
- Wrapper exports: `src/`
- Generated Prisma output: `src/generated/`

## Rules
- Do not inspect or edit `src/generated` unless debugging generated Prisma output.
- Do not run destructive migration/reset commands unless explicitly requested.
- After schema changes, run `pnpm --filter db generate`.
- Keep real credentials out of commits.
- Do not run `dev:auth`, seeds, backfills, migrations, `db:push`, Storage
  operations, or mutable Supabase/Postgres connections unless the task
  explicitly authorizes that exact target and operation.

## Verification
- Schema-only changes: `pnpm --filter db generate`, then `pnpm --filter db typecheck`.
- Wrapper code changes: `pnpm --filter db typecheck` and `pnpm --filter db lint`.
