import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jaredmacshane.com',
  output: 'static',
  publicDir: './static',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
