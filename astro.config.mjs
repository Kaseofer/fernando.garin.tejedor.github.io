import { defineConfig } from 'astro/config';

// Para un sitio de usuario (usuario.github.io), dejá GITHUB_REPOSITORY vacío.
// Para un sitio de proyecto, Actions detecta el nombre y configura el base path.
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const isUserSite = repository?.endsWith('.github.io');

export default defineConfig({
  site: process.env.SITE_URL || 'https://fernandogarin.github.io',
  base: repository && !isUserSite ? `/${repository}` : '/',
  output: 'static',
  build: { format: 'directory' },
});
