# Testing Notes

Use the narrowest command that proves the change.

## Root commands
- Lint all workspaces: `pnpm run lint`
- Typecheck all workspaces: `pnpm run typecheck`
- Build all workspaces: `pnpm run build`

## API
- Full API test command: `pnpm --filter api test`
- Small targeted example: `pnpm --filter api test -- src/modules/clients/clients.service.spec.ts`
- For controller/service changes, prefer the nearest `*.spec.ts` first.
- API test script builds `db` first, then runs Vitest.

## Web
- No `test` script is currently defined.
- Typecheck: `pnpm --filter web typecheck`
- Lint: `pnpm --filter web lint`
- Build: `pnpm --filter web build`
- For visual/UI changes, use browser verification after typecheck/lint when a local server is available.

## DB
- No `test` script is currently defined.
- Typecheck: `pnpm --filter db typecheck`
- Lint: `pnpm --filter db lint`
- Generate Prisma client only when Prisma schema or generated client use changes: `pnpm --filter db generate`
- Commands that touch a real database require valid Supabase/Postgres settings in `.env`.

## Expensive or external checks
- Root `build`, root `lint`, and full API tests are broader than most local edits need.
- Supabase/Postgres dependent commands require configured secrets and reachable services.
- Do not run destructive Prisma migration/reset commands unless explicitly requested.

## Reporting results
- Report the exact command, exit result, and key failure lines if any.
- If a check is skipped, say why: too broad, needs external service, or not relevant to touched files.
