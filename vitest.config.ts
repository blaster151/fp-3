import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    // Property-based testing configuration
    testTimeout: 30000, // Allow longer timeouts for property tests
    hookTimeout: 30000,
    coverage: {
      enabled: process.env['VITEST_COVERAGE'] === 'true',
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage',
      exclude: ['test/**', 'dist/**', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': './',
    },
  },
})
