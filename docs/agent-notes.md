# Agent Notes

Compact handoff state for future Codex sessions. Keep this short and update it during long tasks.

## Project facts
- CoraFit is a pnpm workspace monorepo.
- Workspaces detected: `apps/web`, `apps/api`, `packages/db`, `packages/shared`.
- Root `.env` supplies Supabase/Postgres and local app settings.
- `documentacion/` contains extensive product, architecture, API contract, and Linear backlog docs.
- Tests currently detected in `apps/api/src/**/*.spec.ts`.

## Architecture decisions
- pnpm workspaces are required.
- Turborepo is optional and not currently required.
- `packages/db` owns Prisma schema, migrations, seed, and Prisma client wrapper.
- `packages/shared` is for shared types/constants/validators and must not depend on Next.js or NestJS.

## Current task state
- Admin beta base on 2026-07-07: `admin_saas` can use `GET /auth/me` without active organization membership or subscription; normal coaches keep the existing profile shape. Added AdminModule endpoints `GET /admin/organizations` and `GET /admin/organizations/:organizationId` behind existing `PlatformAdminGuard`, returning only organization operational summary, basic owner info, subscription status, plan id/code/name/clientLimit, and non-archived `clientsUsed`. Web auth types/provider now tolerate `organization/member/subscription: null` only for admin profiles, legacy API config stores `organizationId: null`, and admin without organization is routed away from coach screens to `/admin/exercises`. Verification passed with `pnpm --config.verify-deps-before-run=false --filter api typecheck`, `api lint`, API test command (script ran all 24 API spec files / 313 tests), `web typecheck`, and `web lint`. No migrations, seeds, deploy, or data mutations.
- COR-1203 security/permissions review: audited coach auth guards, organization/role checks, cross-org resource scoping for clients/plans/assigned plans, client portal session isolation, progress privacy, exercises/media ownership, billing/admin exposure, and sensitive output/logging searches. Fixed billing current subscription access to owner-only with `OrganizationGuard + RoleGuard + @Roles(owner)` and added controller coverage. No P0/P1 remain from code audit. API typecheck/lint/test passed. Limitations: no Supabase/Render/Vercel dashboard or storage policy console review.
- COR-147 deploy/domain alignment: official beta/construction deploy remains Vercel web (`https://corafit-web.vercel.app`) + temporary Render API (`https://corafit-api.onrender.com`) + Supabase auth/db/storage. Railway is future/non-active. Verified `/health` 200 with expected body, allowed Vercel CORS origin with matching `Access-Control-Allow-Origin`, non-reflection of `https://evil.example.com`, and public web bundle containing `https://corafit-api.onrender.com`. Custom domains `app.corafit.mx` / `api.corafit.mx` remain future unless configured.
- COR-150/COR-151 beta UX fixes: assigned plan editor aligned closely with current training plan editor layout (header actions, metrics, sticky structure tree, main exercise table, plan/session info in menus/drawers); client portal home no longer shows repetitive full-page "Cargando portal" when lighter loading is possible. Web typecheck/lint passed. Manual smoke: not run in this session yet.
- COR-1206 deploy/env audit started on `master` after COR-144 was integrated at `0974ace`.
- COR-1206 inventory: web is Vercel project `corafit-web`; latest production deployment `dpl_46AqZoZAH7iv6WdN6pKZTUFKzo29` from `master` commit `0974ace041cf8c61e02da9d3131398ff56fe1e36`; public domains include `https://corafit-web.vercel.app`.
- COR-1206 inventory: current API is Render, not Railway, per README; public URL `https://corafit-api.onrender.com`; `/health` returned 200 with `{"status":"ok","service":"corafit-api"}`.
- COR-1206 env evidence: deployed web bundle points to `https://corafit-api.onrender.com` and Supabase project `hlrfvvpuvqblpzyagffk`; no localhost API URL found in fetched home page chunks.
- COR-1206 CORS evidence: API allows `Origin: https://corafit-web.vercel.app` with matching `Access-Control-Allow-Origin` and credentials; it does not echo `https://evil.example.com`.
- COR-1206 not fully verified: Render env/log console, Vercel env values, Supabase dashboard/buckets, production coach login, and portal cookie flow need dashboard access plus test credentials/PIN link. Do not record secrets in this file.
- COR-148 smoke test production: Coach login OK; Supabase Auth OK; `/auth/me` OK; dashboard `/dashboard/coach` OK; test client `Cliente Smoke Test COR-148` exists; portal access generation/regeneration OK; wrong PIN shows clear error; correct PIN OK; cookie `corafit_client_session` OK (`HttpOnly`, `Secure`, `SameSite=None`, `Path=/`, approx 7 days); portal refresh persistence OK; portal logout invalidates cookie. No P0/P1 found in the smoke. Do not record portal token, PIN, password, or bearer tokens.
- COR-144 audit branch started from `origin/master`: `balamsilva26/cor-144-cor-000-auditoria-total-del-repositorio-antes-de-beta`.
- Base verification passed on 2026-07-04: api typecheck/lint/test, web typecheck/lint, db typecheck/lint.
- COR-144 findings: no P0; dashboard validated; `COR-145` and `COR-146` created for legacy `corafit_api_config` in plans/exercises.
- COR-144 small fixes: billing `usedClients` excludes archived clients; portal PIN lockout copy tells clients to ask coach for regenerated access if they forgot the PIN.
- COR-144 report was posted as a Linear comment on `COR-144`; next recommended ticket remains `COR-1206`.
- COR-700 backend base implemented for weight logs and body measurements.
- Prisma schema now has `ProgressRecordActor`, `WeightLog`, and `BodyMeasurementLog` plus migration `20260605000000_add_progress_weight_measurements`.
- API routes added under `/progress/clients/:clientId/...` for coach/owner and `/client-portal/:token/progress/...` for client portal.
- Verification passed: `pnpm --filter db generate`, `pnpm --filter api test -- progress.service.spec.ts`, `pnpm --filter api typecheck`, and `pnpm --filter api lint`.
- COR-145 plans auth cleanup: `useTrainingPlans` and `useTrainingPlanEditor` migrated from legacy `corafit_api_config` to `useAuth` + `authenticatedRequest`; `apps/web/hooks/use-training-plans.ts` no longer reads bearer/organization from localStorage. Web typecheck/lint passed. Manual plan list/create/editor smoke: not verified; no local credentials/session were available in this run.
- COR-145 final cleanup: removed remaining training-plan flow dependency on legacy `corafit_api_config` from `/training-plans` assign modal and assigned-plan editor hook. Plan flows now use `useAuth` + `authenticatedRequest`. Web typecheck/lint passed. Manual smoke: not verified; no local credentials/session were available in this run.
- COR-146 exercises auth cleanup: `useExercises`, `useExerciseMediaActions`, and `useExerciseActions` migrated from legacy `corafit_api_config` to `useAuth` + `authenticatedRequest`; `apps/web/hooks/use-exercises.ts` no longer reads bearer/organization from localStorage. Web typecheck/lint passed. Manual exercise search/create/media smoke: not verified; no local credentials/session were available in this run.
- COR-1205 operational beta check on 2026-07-06: Vercel `corafit-web` production alias `https://corafit-web.vercel.app` is READY on master at deploy `dpl_4msbyXUqUvgCC9SwnRUqqqzGyXEj` / commit `b0d165f7c65617af4a8b3b06b72f7b09f8320e2e`; public build points to `https://corafit-api.onrender.com` and Supabase project `hlrfvvpuvqblpzyagffk` with non-placeholder publishable anon key. Web home/login return 200. API `/health` returns 200 with expected body and CORS preflight allows `https://corafit-web.vercel.app`. Supabase project `corafit` is `ACTIVE_HEALTHY`; DB counts: 4 orgs, 4 users, 7 clients, 33 exercises, 35 training plans, 6 client accesses, 1 progress photo. Storage: `exercise-media` public, 2 MB, WebP, 40 objects; `progress-photos` private, 1 object, signed URLs implemented in API, 8 MB/WebP enforced in API code but bucket metadata has no size/mime limits. Vercel runtime errors: none in last 24h. Supabase auth mostly 200s with one expired JWT event; Postgres only observed error was this audit's bad `profiles` query. Not verified: Render dashboard/env/log stream/quotas, Vercel env dashboard/quotas, Supabase quotas/dashboard auth settings, full productive coach smoke, real upload/delete media smoke. Section 8 backups/rollback intentionally ignored per user.
- COR-1201 beta seed cleanup: added canonical global exercise export script and `packages/db/prisma/seeds/global-exercises.seed.json` with 29 production global active image exercises. `seed.ts` now reads/validates that JSON, refuses template exercises outside it, keeps global exercises image-backed, and transactionally cleans non-canonical global active exercises by first deleting old seed-org template trees that reference them, then deleting only unreferenced non-canonical global rows. The seed recreates only the two canonical seed-org templates (`Principiante Full Body 3 días`, `Intermedio Hipertrofia Dividido`) and leaves real organization exercises/plans, including Wendolin/Balam content, outside cleanup scope. Verification passed: `pnpm --config.verify-deps-before-run=false --filter db exec node --import tsx --test prisma/seed-canonical-exercises.spec.ts`, `pnpm --config.verify-deps-before-run=false --filter db typecheck`, `pnpm --config.verify-deps-before-run=false --filter db lint`. Production seed execution intentionally not run in this session to avoid mutating production data.

## Last tooling setup
- Added Codex guidance, compact notes, architecture map, testing notes, local AGENTS files, and safe ignore updates.

## Recently touched files
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/20260605000000_add_progress_weight_measurements/migration.sql`
- `packages/db/src/index.ts`
- `packages/db/src/generated/prisma/*`
- `apps/api/src/modules/progress/*`
- `apps/api/src/modules/client-portal/client-portal.controller.ts`
- `apps/api/src/modules/client-portal/client-portal.module.ts`
- `docs/agent-notes.md`

## Known failures
- `bash` is not available in this Windows environment; use PowerShell equivalents.
- No current COR-700 verification failures known.

## Next steps
- Keep this file updated during long-running tasks with current state and next action.
- When working from a Linear/COR ticket, search `documentacion/20_linear_backlog_real.md` and live Linear before deciding scope.

## Do not repeat / ignored areas
- Do not scan `node_modules`, `.next`, `dist`, `build`, `coverage`, `.turbo`, `.cache`, `playwright-report`, `test-results`, or logs.
- Do not inspect `packages/db/src/generated` unless debugging generated Prisma output.
- Do not read all of `documentacion/` or large docs without targeted search first.
