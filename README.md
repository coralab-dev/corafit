# CoraFit

CoraFit is organized as a pnpm workspace monorepo so the frontend, backend, Prisma database package, and shared types can evolve together from the start.

## Structure

```text
apps/
  web/        # Next.js frontend application
  api/        # NestJS backend application
packages/
  db/         # Prisma schema, migrations, seed scripts, and shared database client
  shared/     # Shared types, constants, and validators without Next.js or NestJS dependencies
docs/         # Minimal technical notes needed to run, test, or deploy the project
```

## Commands

```bash
pnpm install
pnpm run dev
pnpm run dev:auth
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

## Local test auth

Protected web screens need a real Supabase access token and a local active
organization membership. After filling `.env`, run:

```bash
pnpm run dev:auth
```

The helper creates or reuses a Supabase Auth user, creates the local user,
organization, owner membership, and trial subscription, then prints the
`Supabase JWT` and `Organization ID` for the web `Conexion` dialog. It also
prints a `localStorage.setItem(...)` command you can paste in the browser
console to configure the web app directly.

Defaults are:

```text
DEV_AUTH_EMAIL=corafit.dev.coach@gmail.com
DEV_AUTH_PASSWORD=CoraFitDev123!
DEV_AUTH_NAME=Coach Demo
DEV_ORGANIZATION_NAME=CoraFit Demo
```

If the Supabase user already exists with another password, set
`DEV_AUTH_PASSWORD` to the real password or reset that user in Supabase.
If you already have a real Supabase access token, you can set `DEV_AUTH_JWT`
and the helper will only create or repair the local database profile and
membership.

The API reads root `.env` from `apps/api` and enables CORS for the comma-separated origins in `CORS_ALLOWED_ORIGINS`. The default example allows local Next.js and the current beta Vercel domain.

## Beta seed

The production beta seed uses canonical global exercises exported from the
target database. Set `DATABASE_URL` to the database you want to read or seed;
do not paste or document secrets in commits, docs, or Linear.

Export the canonical global exercises:

```bash
pnpm --filter db export:global-exercises
```

Review `packages/db/prisma/seeds/global-exercises.seed.json` before seeding.
The export includes only global active image exercises with a non-empty
`mediaUrl`; the seed does not invent image URLs and rejects exercises without
image media. During seeding, active global exercises outside that canonical JSON,
or active global exercises without image media, are cleaned up transactionally.
The seed first removes old seed-org template plan trees that reference them, then
physically deletes only unreferenced non-canonical global exercises. Cleanup is
limited to global exercise rows (`organizationId` null) and seed-org templates;
exercises and plans from real organizations are not touched.

Run the seed:

```bash
pnpm --filter db seed
```

## Documentation policy

CoraFit documentation policy:
Long-form product documentation, API contracts, architecture notes, decisions, roadmap, and scope live in the Notion workspace.
Linear is used for execution and issue tracking.
This repository contains source code and only the minimum technical documentation needed to run, test, and deploy the project.
Do not reintroduce long-form product docs into the repo.

The old markdown product docs were removed to avoid documentation drift.

## Deploy Base

Current construction/testing stack:

- Web: Vercel.
- API: Render Free, temporarily replacing Railway during construction/testing.
- Auth, Postgres, and Storage: Supabase.
- Railway: disconnected from GitHub auto-deploy for now, but kept as the future demo/beta API target.
- Custom domains `app.corafit.mx` and `api.corafit.mx`: future targets only; do not treat them as active until DNS/deploy settings are configured and verified.

Current beta web:

- URL: `https://corafit-web.vercel.app`

Temporary Render API:

- Base URL: `https://corafit-api.onrender.com`
- Healthcheck: `https://corafit-api.onrender.com/health`
- Expected health response: `{"status":"ok","service":"corafit-api"}`
- Render runtime setting: `NODE_VERSION=22`

Vercel web environment:

```text
NEXT_PUBLIC_API_URL=https://corafit-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=<Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase anon key>
```

Render API environment:

```text
NODE_ENV=production
NODE_VERSION=22
WEB_APP_URL=https://corafit-web.vercel.app
CORS_ALLOWED_ORIGINS=https://corafit-web.vercel.app
SUPABASE_URL=<Supabase project URL>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service role key>
SUPABASE_ANON_KEY=<Supabase anon key>
DATABASE_URL=<Supabase Postgres connection string>
```

`SUPABASE_SERVICE_KEY` is still accepted as the legacy service-role variable, but new deploys should prefer `SUPABASE_SERVICE_ROLE_KEY`. Render provides `PORT`; set it manually only if Render requires it for a specific service configuration.

CORS must allow the deployed Vercel origin in both `WEB_APP_URL` and `CORS_ALLOWED_ORIGINS`. If preview deployments need API access later, add those preview origins to `CORS_ALLOWED_ORIGINS` as a comma-separated list.

`apps/web/vercel.json` prepares the Next.js app for Vercel with pnpm workspace commands. `apps/api/railway.json` remains documented for the future Railway demo/beta deploy with a Nixpacks build and `/health` healthcheck, but Railway should not be treated as the active API deploy while Render is the temporary construction API.

UptimeRobot can be added later to keep an eye on the Render Free health endpoint, but it is optional and not required for the current construction setup.

## Workspace policy

pnpm workspaces are required for this repository. Turborepo can be added later if the project needs task orchestration or remote caching, but it is not required for the initial monorepo base.
