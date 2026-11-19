// @ts-check
import { defineConfig, envField } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://comunidadlacosecha.com',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

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
