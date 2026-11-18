// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://comunidadlacosecha.com',
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
