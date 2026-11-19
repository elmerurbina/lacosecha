// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://comunidadlacosecha.com',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  // Las páginas públicas con contenido editable usan `prerender = false` y se sirven con
  // ISR: Vercel guarda la página en caché y la regenera como máximo cada 60 s, así los
  // cambios del panel administrativo se reflejan sin volver a desplegar (RF-37).
  // El panel (/admin) y las páginas legales siguen siendo estáticas.
  adapter: vercel({
    isr: { expiration: 60 },
  }),

  // Variables de entorno tipadas (astro:env). Permiten usar nombres sin el prefijo PUBLIC_.
  // Ambas son públicas por diseño: la clave "anon" de Supabase está protegida por RLS.
  // NUNCA declarar aquí la service_role key con access: 'public'.
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: 'client', access: 'public', optional: true, url: true }),
      SUPABASE_ANON_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
