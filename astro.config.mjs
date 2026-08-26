import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE_URL || 'https://kaseofer.github.io',
  base: '/fernando.garin.tejedor.github.io',
  output: 'static',
  build: { format: 'directory' },
});
