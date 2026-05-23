# apps/web Agent Guide

Next.js 16 / React 19 frontend. Keep reads focused on the route, hook, or component being changed.

## Commands
- Dev: `pnpm --filter web dev`
- Lint: `pnpm --filter web lint`
- Typecheck: `pnpm --filter web typecheck`
- Build: `pnpm --filter web build`

## Local map
- Routes and layouts: `app/`
- UI components: `components/`
- Hooks: `hooks/`
- Client utilities and API helpers: `lib/`

## Rules
- Avoid `.next`, build output, logs, and generated files.
- Inspect large components with targeted `rg` and snippets before opening the full file.
- Keep visual changes inside the named route/component scope.
- Use existing UI primitives and local patterns.
- Do not add dependencies unless explicitly requested.

## Verification
- For TS/UI logic changes, run `pnpm --filter web typecheck`.
- For style/lint-sensitive changes, run `pnpm --filter web lint`.
- For visual behavior, verify in browser only after a local target is available.
