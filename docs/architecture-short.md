# Architecture Short Map

Short map for orientation. Use targeted search before opening large files.

## Structure
- `apps/`: runnable applications.
- `packages/`: shared workspace packages.
- `docs/`: compact operational docs for agents and project notes.
- `documentacion/`: long product, architecture, API, and backlog documentation.
- `.agents/`: local Codex skills and references.

## Apps and packages
- `apps/web`: Next.js App Router app with routes under `app/`, UI in `components/`, shared client hooks in `hooks/`, utilities in `lib/`.
- `apps/api`: NestJS API with modules, guards, controllers, services, DTOs, and Vitest specs under `src/`.
- `packages/db`: Prisma schema in `prisma/schema.prisma`, migrations in `prisma/migrations/`, seed in `prisma/seed.ts`, wrapper exports in `src/`.
- `packages/shared`: reserved for framework-neutral shared types, constants, and validators.

## Important routes and modules
- Web app routes live in `apps/web/app`.
- API modules live in `apps/api/src/modules`.
- API shared auth/prisma code lives in `apps/api/src/common`.
- Prisma database contract lives in `packages/db/prisma/schema.prisma`.

## Tests
- API unit tests live in `apps/api/src/**/*.spec.ts`.
- No web test script is currently defined.
- No db test script is currently defined.

## Configs
- Root workspace: `package.json`, `pnpm-workspace.yaml`.
- Web: `apps/web/package.json`, `apps/web/eslint.config.mjs`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/components.json`.
- API: `apps/api/package.json`, `apps/api/eslint.config.mjs`, `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `apps/api/tsconfig.eslint.json`.
- DB: `packages/db/package.json`, `packages/db/eslint.config.mjs`, `packages/db/tsconfig.json`, `packages/db/prisma.config.ts`.

## Avoid
- `node_modules`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.cache`, `playwright-report`, `test-results`, logs.
- `packages/db/src/generated` unless generated Prisma output is directly relevant.
- Whole-file reads of large `documentacion/` docs; search first.
