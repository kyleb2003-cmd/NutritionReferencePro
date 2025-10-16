import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup-tests.ts'],
    globals: true,
    css: false,
    coverage: { provider: 'v8', reporter: ['text', 'html'], reportsDirectory: './coverage' },
    alias: {
      '@/': new URL('./', import.meta.url).pathname,
    },
    exclude: ['e2e/**/*'],
    include: ['test/**/*.spec.tsx'],
  },
})
