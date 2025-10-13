declare module 'vitest' {
  namespace expect {
    function arrayContaining<T>(expected: readonly T[]): unknown;
    function stringContaining(expected: string): unknown;
    function objectContaining<T extends Record<string, unknown>>(expected: T): unknown;
  }
}
