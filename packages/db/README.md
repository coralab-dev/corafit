# packages/db

Shared Prisma package for CoraFit.

## Local commands

```bash
pnpm --filter db generate
pnpm --filter db db:push
pnpm --filter db typecheck
```

## Seed (development)

To seed global exercises and system base templates for development (requires running `db:push` first):

```bash
cd packages/db
npx prisma db seed
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
3. Fill `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `SUPABASE_ANON_KEY`.
4. Run `pnpm --filter db generate`.
5. Run `pnpm --filter db db:push`.
6. In Supabase Storage, create a private bucket named `progress-photos`.
7. Add Storage policies after the auth and ownership model is finalized.

Do not commit `.env` or real Supabase credentials.
