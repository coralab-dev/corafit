# CoraFit staging / preproducción

Estado actualizado el 2026-07-08.

## Decisión de ramas

- `master`: producción.
- `staging`: preproducción.
- `feature/*` o `codex/*`: trabajo normal.

Flujo recomendado:

```txt
feature branch -> PR hacia staging -> QA en staging -> merge staging hacia master -> producción
```

## Estado actual

Staging está operativo como ambiente intermedio de web + API, pero comparte Supabase con producción por limitación del plan Free.

## GitHub

- Rama `staging` creada desde `master`.
- La rama `staging` debe ser la base de validación antes de mover cambios a producción.

## Vercel web staging

Proyecto actual:

- Team: `corafit's projects`
- Team ID: `team_N0qIVmW6cOjPnmaAen3LiW9F`
- Project: `corafit-web`
- Project ID: `prj_s0U1kxJaA1hrUTpJF4PD2VV8KsWt`

Producción actual se despliega desde `master`.

Vercel genera preview deployments para ramas no productivas. La rama `staging` se usa como preview/preproducción.

Alias staging:

```txt
corafit-web-git-staging-corafit-s-projects.vercel.app
```

Última verificación reportada:

- Vercel staging deploy: `dpl_BewKVGfyn1mjE4u9e4EYjWwcNoVX`.
- Estado: `READY`.
- Build confirmado con `NEXT_PUBLIC_API_URL=https://corafit-api-staging.onrender.com`.

Archivo de configuración:

```txt
apps/web/vercel.json
```

Variables públicas de web staging:

```env
NEXT_PUBLIC_API_URL=https://corafit-api-staging.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://hlrfvvpuvqblpzyagffk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-key-actual>
```

## Render API staging

Servicio creado:

```txt
Name: corafit-api-staging
URL: https://corafit-api-staging.onrender.com
Branch: staging
Type: Web Service
```

Build command usado en Render:

```txt
corepack prepare pnpm@10.15.1 --activate && pnpm install --frozen-lockfile && pnpm --filter db build && pnpm --filter api build
```

Motivo:

```txt
corepack enable falló en Render por filesystem read-only.
```

Start command:

```txt
pnpm --filter api start
```

Última verificación reportada:

- Render deploy: `dep-d96udqepuehc73f2rcvg`.
- Estado: `live`.
- Health check: `GET https://corafit-api-staging.onrender.com/health` -> `200`.
- Body: `{"status":"ok","service":"corafit-api"}`.
- CORS preflight desde `https://corafit-web-git-staging-corafit-s-projects.vercel.app` -> `204`.
- `Access-Control-Allow-Origin` correcto.

Variables esperadas del API staging:

```env
NODE_ENV=production
PORT=4000
WEB_APP_URL=https://corafit-web-git-staging-corafit-s-projects.vercel.app
CORS_ALLOWED_ORIGINS=https://corafit-web-git-staging-corafit-s-projects.vercel.app
SUPABASE_URL=https://hlrfvvpuvqblpzyagffk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-produccion-actual>
SUPABASE_ANON_KEY=<anon-or-publishable-key-actual>
DATABASE_URL=<database-url-produccion-actual>
DIRECT_URL=<direct-url-produccion-actual>
ADMIN_EMAIL=<admin-email-actual-o-admin-staging>
ADMIN_SUPABASE_USER_ID=<admin-supabase-user-id>
ADMIN_NAME=CoraFit Admin
DEV_AUTH_EMAIL=<coach-demo-email>
DEV_AUTH_PASSWORD=<coach-demo-password>
DEV_AUTH_NAME=Coach Demo
DEV_ORGANIZATION_NAME=CoraFit Demo
```

## Supabase

Por limitación del plan Free, CoraFit staging usa temporalmente el mismo proyecto Supabase que producción.

Proyecto usado:

- Project name: `corafit`.
- Project ref: `hlrfvvpuvqblpzyagffk`.
- URL: `https://hlrfvvpuvqblpzyagffk.supabase.co`.

Nota histórica:

- Se intentó crear una branch de Supabase, pero branching requiere plan Pro o superior.
- Se creó temporalmente `corafit-staging` (`dzgmuiwuaglxbkiqulss`), pero se pausó porque el plan Free solo permite dos proyectos activos y el usuario necesita conservar activos `corafit` y `sentiq`.

## Regla crítica mientras staging comparte Supabase con producción

Staging NO es un ambiente de datos aislado.

Permitido en staging:

- Validar UI.
- Validar navegación.
- Validar auth con cuentas de prueba controladas.
- Validar llamadas API no destructivas.
- Validar flujos usando registros demo/test claramente identificados.

No permitido en staging sin confirmación explícita:

- Ejecutar seeds destructivos.
- Ejecutar reset de base.
- Ejecutar migraciones automáticas.
- Ejecutar `prisma db push`.
- Ejecutar backfills.
- Borrar datos.
- Limpiar storage.
- Cambiar planes reales.
- Usar clientes reales para QA.

## Criterio de cierre

Staging queda aceptado cuando:

- La rama `staging` despliega web preview.
- Existe API staging separado.
- Web staging apunta al API staging.
- API staging responde desde Render.
- CORS permite la web staging.
- Staging no usa el API productivo.
- No se ejecutaron seeds/migraciones/resets/backfills.

## Estado de cierre

Hecho:

- Rama `staging` creada.
- Proyecto Supabase temporal `corafit-staging` pausado.
- Web staging en Vercel operativo.
- API staging en Render operativo.
- Web staging apunta al API staging.
- API staging usa Supabase actual de CoraFit.
- Health check del API staging validado.
- CORS staging validado.
- Runbook actualizado.

Pendiente recomendado:

- Probar login admin/coach desde la URL staging.
- Validar navegación básica sin tocar datos reales.
- En cuanto sea posible, separar Supabase staging en plan Pro o proyecto adicional.
