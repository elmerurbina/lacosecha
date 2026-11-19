# Comunidad Evangélica La Cosecha — Sitio web

Sitio público en [Astro](https://astro.build). Juigalpa, Chontales, Nicaragua.

## Desarrollo

```bash
npm install
astro dev --background   # http://localhost:4321
npm run build
```

## Estructura

- `src/pages/` — Inicio, Quiénes somos, Ministerios, Horarios, Eventos, Prédicas, Contacto, Privacidad.
- `src/components/` — Header (logo + menú adaptable), calendario, tarjetas de ministerio/prédica, formulario de oración, `SmartImage` (placeholder automático).
- `src/data/seed.ts` — Datos iniciales (respaldo cuando Supabase no está configurado).
- `src/lib/content.ts` — Lee el contenido publicado desde Supabase si existen las variables de `.env`.
- `supabase/schema.sql` — Tablas, políticas RLS, límite antispam y purga automática de peticiones (>3 meses).
- `public/images/` — Imágenes del sitio; ver `public/images/LEEME.md`. El logo va en `public/images/logo.png`.

## Supabase

Copia `.env.example` a `.env` y completa `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
Ejecuta `supabase/schema.sql` en el SQL Editor. Nunca uses la `service_role` key en este proyecto.
