# Comunidad Evangélica La Cosecha — Sitio web y panel administrativo

Sitio público y panel administrativo en [Astro](https://astro.build) + [Supabase](https://supabase.com),
desplegado en Vercel. Juigalpa, Chontales, Nicaragua.

- Sitio público: `https://comunidadlacosecha.com`
- Panel: `https://admin.comunidadlacosecha.com` (en local: `http://localhost:4321/admin`)

## Desarrollo

```bash
npm install
astro dev --background   # http://localhost:4321
npm run build
npx astro check          # verificación de tipos
```

Sin variables de entorno el sitio usa los datos de `src/data/seed.ts` y el panel muestra «Panel no configurado».

## Puesta en marcha de Supabase

1. Copia `.env.example` a `.env` y completa `SUPABASE_URL` y `SUPABASE_ANON_KEY`
   (las mismas variables van en Vercel → Settings → Environment Variables).
2. En el SQL Editor de Supabase ejecuta, en orden:
   - `supabase/001_schema.sql` — tablas, RLS, peticiones de oración y purga a los 3 meses
   - `supabase/002_admin_panel.sql` — ajustes del sitio, células, métricas, bucket `media`
   - `supabase/003_seed.sql` — datos iniciales (horarios, ministerios, células, textos)
   Requiere la extensión **pg_cron** (Database → Extensions).
3. Crea las cuentas de administración en Authentication → Users → *Add user*
   (no hay registro público) y autorízalas:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'correo@ejemplo.com';
   ```
4. En Authentication → URL Configuration agrega `https://admin.comunidadlacosecha.com` como Site URL / Redirect URL.

## Estructura

- `src/pages/` — páginas públicas (renderizadas bajo demanda con ISR de 60 s) y `admin/` (SPA estática).
- `src/admin/` — panel: `main.ts` (sesión y rutas `#/…`), `resources.ts` (definición de cada módulo),
  `views/` (inicio, métricas, contenido, CRUD genérico, peticiones), `upload.ts` (Storage + WebP), `charts.ts`.
- `src/lib/content.ts` — lectura del contenido publicado desde Supabase (con respaldo local).
- `src/lib/supabase-client.ts` — formulario de oración y métricas anónimas del sitio público.
- `vercel.json` — subdominio `admin.` → `/admin`, y `noindex` para el panel.

Para agregar un nuevo módulo administrable basta con crear su tabla (con RLS) y añadir un objeto en `src/admin/resources.ts`.

## Seguridad

Toda la autorización la imponen Supabase Auth y las políticas RLS: los visitantes solo pueden leer contenido publicado
e insertar peticiones/métricas; solo los usuarios en `public.admins` pueden leer peticiones, ver métricas y modificar
contenido o archivos. Nunca uses la `service_role` key en este proyecto.
