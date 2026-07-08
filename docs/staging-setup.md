# CoraFit staging / preproducción

Estado inicial creado desde ChatGPT el 2026-07-08.

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

Vercel genera preview deployments para ramas no productivas. La rama `staging` debe usarse como preview/preproducción, apuntando a API staging en sus variables de entorno.

Variables esperadas para web staging:

```env
NEXT_PUBLIC_API_URL=https://<api-staging-url>
NEXT_PUBLIC_SUPABASE_URL=https://dzgmuiwuaglxbkiqulss.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-or-publishable-key-staging>
```

### Supabase staging

Se intentó crear una branch de Supabase sobre el proyecto productivo, pero Supabase devolvió que branching requiere plan Pro o superior.

Por eso se creó un proyecto separado:

- Project name: `corafit-staging`
- Project ref: `dzgmuiwuaglxbkiqulss`
- Region: `us-east-1`
- URL: `https://dzgmuiwuaglxbkiqulss.supabase.co`
- Cost reportado por Supabase para el proyecto: `$0 / mes` al momento de creación.

Public keys disponibles:

```txt
anon legacy key: configurar manualmente en entornos si se decide usar legacy anon.
publishable key: configurar manualmente en entornos si se decide usar publishable key.
```

No guardar secretos en este archivo.

### Backend API staging

Pendiente.

El backend actual parece estar desplegado en Railway según los checks de GitHub/Vercel observados. Este asistente no tiene conector directo de Railway/Render habilitado en este proyecto, así que no se pudo crear un servicio backend staging desde aquí.

Variables esperadas para API staging:

```env
NODE_ENV=production
PORT=4000
WEB_APP_URL=https://<web-staging-url>
CORS_ALLOWED_ORIGINS=https://<web-staging-url>
SUPABASE_URL=https://dzgmuiwuaglxbkiqulss.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-staging>
SUPABASE_ANON_KEY=<anon-or-publishable-key-staging>
DATABASE_URL=<postgres-connection-string-staging>
DIRECT_URL=<postgres-direct-connection-string-staging>
ADMIN_EMAIL=<admin-staging-email>
ADMIN_SUPABASE_USER_ID=<admin-auth-user-id-staging>
ADMIN_NAME=CoraFit Admin Staging
DEV_AUTH_EMAIL=<coach-demo-staging-email>
DEV_AUTH_PASSWORD=<coach-demo-staging-password>
DEV_AUTH_NAME=Coach Demo Staging
DEV_ORGANIZATION_NAME=CoraFit Staging Demo
```

## Pendiente para dejar staging operativo 100%

1. Configurar schema/base en Supabase staging.
   - Ejecutar Prisma migrations/db push contra el proyecto `corafit-staging`.
   - Ejecutar seeds mínimos.

2. Crear usuarios de staging.
   - Admin SaaS staging.
   - Coach demo staging.
   - Clientes fake.

3. Crear backend API staging.
   - Preferible duplicar el servicio actual del API en Railway/Render.
   - Apuntar variables al Supabase staging.
   - Ajustar CORS para permitir la URL de Vercel staging.

4. Configurar Vercel preview para rama `staging`.
   - `NEXT_PUBLIC_API_URL` debe apuntar al backend staging.
   - `NEXT_PUBLIC_SUPABASE_URL` debe apuntar a Supabase staging.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` debe usar key de staging.

5. Validar flujo mínimo.
   - Login admin staging.
   - Login coach staging.
   - Crear cliente.
   - Crear/editar plan.
   - Asignar plan.
   - Abrir portal cliente staging.

## Regla operativa

No conectar staging a la base de datos de producción.

No usar service-role key de producción en staging.

No usar datos reales para QA staging.

## Estado de cierre de esta fase

Hecho:

- Rama `staging` creada.
- Proyecto Supabase `corafit-staging` creado.
- Inventario de Vercel web documentado.
- Runbook de staging agregado a repo.

No hecho por falta de acceso/secretos directos desde herramientas disponibles:

- Crear/duplicar backend staging en Railway/Render.
- Configurar variables de Vercel/hosting.
- Obtener service role key o database password de Supabase staging.
- Ejecutar app completa end-to-end sobre staging.
