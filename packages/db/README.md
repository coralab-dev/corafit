# packages/db

Shared Prisma package for CoraFit.

## Local commands

```bash
pnpm --filter db generate
pnpm --filter db db:push
pnpm --filter db typecheck
```

`db:push`, seeds, backfills, and migrations mutate the configured database.
Run them only against a verified local target, or when a task explicitly
authorizes the exact remote destination and operation.

## Seed (development)

To seed global exercises and system base templates for development, first verify
that `DATABASE_URL` points to the intended local database. This is a mutation and
must not be treated as ordinary setup for a remote Supabase project.

```bash
pnpm --dir packages/db exec prisma db seed
```

The seed creates idempotently:

- **23 global exercises** (active, `organizationId = null`). Second run shows `0 created, 23 updated`.
- **System user** (`system@corafit.local`) and **seed organization** (`CoraFit Semilla`).
- **2 base training plan templates** (`Principiante Full Body 3 días`, `Intermedio Push/Pull/Legs`) with full hierarchy: 4 weeks, days, sessions, exercises, and alternatives.
- **SystemSetting** entry `system.seedOrganizationId` so the API can expose these templates to real organizations.

Run twice to verify idempotency: exercises show `0 created, 23 updated`; plans preserve their IDs and recreate child structure only.

## Supabase setup

The real Supabase project lives outside the organization currently visible to Codex, so no secrets are committed here.

To connect locally:

1. Copy `.env.example` to `.env`.
2. Fill `DATABASE_URL` with the Supabase PostgreSQL connection string.
3. Fill `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY`.
4. Run `pnpm --filter db generate`.
5. For remote Supabase, do not run `db:push`, seeds, backfills, migrations, or
   Storage mutations as setup unless a task explicitly authorizes the exact
   target and operation.
6. For a verified local target only, run `pnpm --filter db db:push` when schema
   sync is intentionally needed.
7. In Supabase Storage, create a private bucket named `progress-photos` only
   when the target and operation are explicitly authorized.
8. Add Storage policies after the auth and ownership model is finalized.

`SUPABASE_SERVICE_ROLE_KEY` is preferred. The legacy `SUPABASE_SERVICE_KEY`
name is accepted only as a compatibility fallback in older local env files.

Do not commit `.env` or real Supabase credentials. Local helpers may read
ignored env values, but credentials alone do not authorize mutating a remote
Supabase or Postgres destination; require an explicit task and matching remote
target confirmation first.

## Beta subscription backfill

Existing organizations created before billing defaults may not have an
`OrganizationSubscription`. Backfill them with the Trial plan:

```bash
pnpm --filter db backfill:subscriptions
```

The command uses `DATABASE_URL`, upserts the public `trial` plan, creates Trial
subscriptions only for organizations that do not already have one, and prints a
summary of scanned, created, and skipped organizations.
Run it only against a verified local target or when a task explicitly authorizes
the exact remote target and this backfill.
