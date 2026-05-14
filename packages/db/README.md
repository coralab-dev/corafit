# packages/db

Shared Prisma package for CoraFit.

## Local commands

```bash
pnpm --filter db generate
pnpm --filter db db:push
pnpm --filter db typecheck
```

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
