import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    // Online rooms: the Worker runs next to Vite with `wrangler dev` (see the root `dev` script).
    proxy: { '/api': { target: 'http://localhost:8787', ws: true } },
  },
});
