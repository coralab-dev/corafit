# Agent Architecture

Use this as stable orientation before editing. Keep reads targeted and prefer the nearest workspace `AGENTS.md` for local rules.

## Monorepo
- Root: pnpm workspace with `package.json` and `pnpm-workspace.yaml`.
- `apps/`: runnable applications.
- `packages/`: shared workspace packages.
- `docs/agent/`: stable, versioned agent context only.

## Workspaces
- `apps/web`: Next.js 16 / React 19 frontend using the App Router.
- `apps/api`: NestJS API with modules, guards, controllers, services, DTOs, and Vitest specs.
- `packages/db`: Prisma schema, migrations, seed scripts, generated client, and database wrapper exports.
- `packages/shared`: framework-neutral types, constants, and validators. It must not depend on Next.js, React, NestJS, Prisma runtime code, or app-specific modules.

## Locations
- Web routes and layouts: `apps/web/app/`.
- Web UI components: `apps/web/components/`.
- Web hooks: `apps/web/hooks/`.
- Web client utilities and API helpers: `apps/web/lib/`.
- API modules: `apps/api/src/modules/`.
- API shared auth and Prisma code: `apps/api/src/common/`.
- API config validation: `apps/api/src/config/`.
- API entry point: `apps/api/src/main.ts`.
- API specs: `apps/api/src/**/*.spec.ts`.
- Prisma schema: `packages/db/prisma/schema.prisma`.
- Prisma migrations: `packages/db/prisma/migrations/`.
- Prisma seed: `packages/db/prisma/seed.ts`.
- DB wrapper exports: `packages/db/src/`.
- Generated Prisma output: `packages/db/src/generated/`.

## Infrastructure
- Web runs on Vercel.
- API runs on Render.
- Auth, Postgres, and Storage use Supabase.
- Local `.env` files may contain Supabase, Postgres, and app settings. Never print, persist, or commit secrets.

Staging does not guarantee isolated data. Before any command can mutate data or depend on live services, verify the exact target and obtain explicit authorization for that target and operation.

## Sources Before Editing
- Root `AGENTS.md`.
- The nearest workspace `AGENTS.md`.
- This `docs/agent/` context.
- Relevant `package.json` scripts before documenting or running commands.
- Existing code patterns in the files and modules being changed.
