type Reporter = 'text' | 'json' | 'html' | string

interface CoverageOptions {
  readonly enabled: boolean
  readonly provider: string
  readonly reporter: ReadonlyArray<Reporter>
  readonly reportsDirectory: string
  readonly exclude?: ReadonlyArray<string>
}

interface TestOptions {
  readonly globals?: boolean
  readonly environment?: string
  readonly include?: ReadonlyArray<string>
  readonly exclude?: ReadonlyArray<string>
  readonly testTimeout?: number
  readonly hookTimeout?: number
  readonly coverage?: CoverageOptions
}

interface ResolveOptions {
  readonly alias?: Record<string, string>
}

interface VitestConfig {
  readonly test: TestOptions
  readonly resolve?: ResolveOptions
}

const coverageEnabled = (() => {
  if (typeof globalThis !== 'object' || globalThis === null) {
    return false
  }
  const env = (globalThis as {
    process?: { env?: Record<string, string | undefined> }
  }).process?.env
  return env?.['VITEST_COVERAGE'] === 'true'
})()

const config = {
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],
    // Property-based testing configuration
    testTimeout: 30000, // Allow longer timeouts for property tests
    hookTimeout: 30000,
    coverage: {
      enabled: coverageEnabled,
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
} satisfies VitestConfig

export default config
