import { defineConfig } from 'vitest/config'
import path from 'path'

// Standalone config so Vitest's bundled Vite types don't clash with the
// project's Vite 8 (rolldown) build types in vite.config.ts. Vitest transforms
// TS/TSX with esbuild, so the React plugin isn't needed for tests.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
