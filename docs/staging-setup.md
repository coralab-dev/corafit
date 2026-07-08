# CoraFit staging / preproducción

Estado actualizado desde ChatGPT el 2026-07-08.

## Decisión de ramas

- `master`: producción.
- `staging`: preproducción.
- `feature/*` o `codex/*`: trabajo normal.

Flujo recomendado:

```txt
feature branch -> PR hacia staging -> QA en staging -> merge staging hacia master -> producción
```

## Estado actual

### GitHub

- Rama `staging` creada desde `master`.
- La rama `staging` debe ser la base de validación antes de mover cambios a producción.

### Vercel web

Proyecto actual:

- Team: `corafit's projects`
- Team ID: `team_N0qIVmW6cOjPnmaAen3LiW9F`
- Project: `corafit-web`
- Project ID: `prj_s0U1kxJaA1hrUTpJF4PD2VV8KsWt`

Producción actual se despliega desde `master`.

Vercel genera preview deployments para ramas no productivas. La rama `staging` debe usarse como preview/preproducción.

Alias detectado para la rama staging:

```txt
corafit-web-git-staging-corafit-s-projects.vercel.app
```

Variables esperadas para web staging:

```env
NEXT_PUBLIC_API_URL=https://<api-staging-url>
NEXT_PUBLIC_SUPABASE_URL=https://hlrfvvpuvqblpzyagffk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-produccion-actual>
```

## Supabase

Por limitación del plan Free, CoraFit staging usará temporalmente el mismo proyecto Supabase que producción.

Proyecto usado:

- Project name: `corafit`
- Project ref: `hlrfvvpuvqblpzyagffk`
- URL: `https://hlrfvvpuvqblpzyagffk.supabase.co`

Nota histórica:

- Se intentó crear una branch de Supabase, pero branching requiere plan Pro o superior.
- Se creó temporalmente `corafit-staging` (`dzgmuiwuaglxbkiqulss`), pero se pausó porque el plan Free solo permite dos proyectos activos y el usuario necesita conservar activos `corafit` y `sentiq`.

## Regla crítica mientras staging comparte Supabase con producción

Staging NO debe considerarse un ambiente de datos aislado.

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
- Borrar datos.
- Limpiar storage.
- Cambiar planes reales.
- Usar clientes reales para QA.

## Backend API staging

Pendiente de crear en Render o Railway.

El backend staging debe usar la misma base Supabase actual por ahora, pero debe tener URL separada para que la web staging no apunte al API productivo.

Variables esperadas para API staging:

```env
NODE_ENV=production
PORT=4000
WEB_APP_URL=https://corafit-web-git-staging-corafit-s-projects.vercel.app
CORS_ALLOWED_ORIGINS=https://corafit-web-git-staging-corafit-s-projects.vercel.app
SUPABASE_URL=https://hlrfvvpuvqblpzyagffk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-produccion-actual>
SUPABASE_ANON_KEY=<anon-key-produccion-actual>
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

Importante:

- Si el API staging comparte la DB productiva, no debe ejecutar seeds automáticos.
- No debe correr `prisma db push` ni scripts de backfill desde el build/deploy.
- Cualquier cambio de schema sigue siendo cambio de producción.

## Render staging API — configuración sugerida

Crear un Web Service separado para el API:

```txt
Name: corafit-api-staging
Repository: coralab-dev/corafit
Branch: staging
Root directory: repo root
Runtime: Node
Node version: >=20.19.0
Build command: corepack enable && pnpm install --frozen-lockfile && pnpm --filter db build && pnpm --filter api build
Start command: pnpm --filter api start
Health check path: /health o endpoint equivalente si existe
Auto deploy: on para staging
```

Si Render no detecta pnpm automáticamente, usar `corepack enable` antes de instalar.

## Pendiente para dejar staging operativo

1. Crear backend API staging en Render/Railway.
2. Configurar variables del API staging.
3. Configurar variables Preview/branch `staging` en Vercel:
   - `NEXT_PUBLIC_API_URL` -> URL del API staging.
   - `NEXT_PUBLIC_SUPABASE_URL` -> Supabase actual.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> anon actual.
4. Validar login admin y coach con cuentas de prueba.
5. Validar navegación y flujos básicos sin tocar datos reales.

## Criterio de cierre

Staging queda aceptado cuando:

- La rama `staging` despliega web preview.
- Existe API staging separado.
- Web staging apunta al API staging.
- API staging responde desde Render/Railway.
- Staging no usa un API productivo.
- Se valida login y navegación básica.

## Estado de cierre de esta fase

Hecho:

- Rama `staging` creada.
- Proyecto Supabase temporal `corafit-staging` pausado.
- Runbook actualizado para usar el Supabase actual.
- Inventario de Vercel web documentado.

No hecho por falta de acceso/secretos directos desde herramientas disponibles:

- Crear/duplicar backend staging en Render/Railway.
- Configurar variables privadas de Vercel/hosting.
- Validar app completa end-to-end sobre staging.
