# packages/shared Agent Guide

Framework-neutral shared package for types, constants, and validators.

## Commands
- No package-local scripts are currently defined.
- Use root checks if this package gains code that participates in workspace builds: `pnpm run typecheck` and `pnpm run lint`.

## Rules
- Do not import Next.js, React, NestJS, Prisma runtime code, or app-specific modules.
- Keep shared contracts small and stable.
- Avoid adding dependencies unless explicitly requested.

## Verification
- For metadata-only changes, no test is required.
- If scripts are added later, document the smallest package-local check here.
