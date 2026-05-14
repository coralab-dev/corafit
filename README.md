# CoraFit

CoraFit is organized as a pnpm workspace monorepo so the frontend, backend, Prisma database package, and shared types can evolve together from the start.

## Structure

```text
apps/
  web/        # Future frontend application
  api/        # Future backend application
packages/
  db/         # Prisma schema, migrations, seed scripts, and shared database client
  shared/     # Shared types, constants, and validators without Next.js or NestJS dependencies
docs/         # Product and technical documentation
```

## Commands

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run lint
pnpm run typecheck
```

`pnpm run dev` starts the Next.js web app and NestJS API through pnpm workspace filters. The root `build`, `lint`, and `typecheck` scripts run every workspace package that exposes the matching script.

## Local Setup

1. Copy `.env.example` to `.env` at the repository root.
2. Fill the Supabase and Postgres values used by `apps/api` and `packages/db`.
3. Keep `NEXT_PUBLIC_API_URL=http://localhost:4000` for local web requests.
4. Keep `WEB_APP_URL=http://localhost:3000` and include the same origin in `CORS_ALLOWED_ORIGINS`.
5. Run `pnpm install`, then `pnpm run dev`.

The API reads root `.env` from `apps/api` and enables CORS for the comma-separated origins in `CORS_ALLOWED_ORIGINS`. The default example allows local Next.js and the future Vercel domain.

## Deploy Base

- `apps/web/vercel.json` prepares the Next.js app for Vercel with pnpm workspace commands.
- `apps/api/railway.json` prepares the NestJS API for Railway with a Nixpacks build and `/health` healthcheck.
- Production deploys must set the same variables documented in `.env.example`, replacing local URLs with the deployed web and API domains.

## Workspace policy

pnpm workspaces are required for this repository. Turborepo can be added later if the project needs task orchestration or remote caching, but it is not required for the initial monorepo base.
