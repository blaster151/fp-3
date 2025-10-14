declare module 'vitest' {
  type TestImplementation = (...args: readonly unknown[]) => void | Promise<void>;

  interface ChainableSuite {
    (name: string, fn: TestImplementation): void;
    skip: ChainableSuite;
    only: ChainableSuite;
    todo: (name: string) => void;
    each: <T extends ReadonlyArray<readonly unknown[]>>(
      cases: T
    ) => (name: string, fn: (...args: T[number]) => void | Promise<void>) => void;
  }

  interface ChainableTest {
    (name: string, fn: TestImplementation): void;
    skip: ChainableTest;
    only: ChainableTest;
    todo: (name: string) => void;
    concurrent: ChainableTest;
    each: <T extends ReadonlyArray<readonly unknown[]>>(
      cases: T
    ) => (name: string, fn: (...args: T[number]) => void | Promise<void>) => void;
  }

  type MatcherResult = void | Promise<void>;
  type MatcherImplementation = (...args: readonly unknown[]) => MatcherResult;

  interface MatcherTree {
    readonly not: MatcherTree;
    readonly resolves: MatcherTree;
    readonly rejects: MatcherTree;
    toBe: MatcherImplementation;
    toEqual: MatcherImplementation;
    toBeDefined: MatcherImplementation;
    toBeUndefined: MatcherImplementation;
    toBeNull: MatcherImplementation;
    toBeTruthy: MatcherImplementation;
    toBeInstanceOf: MatcherImplementation;
    toContain: MatcherImplementation;
    toContainEqual: MatcherImplementation;
    toThrow: MatcherImplementation;
    toMatch: MatcherImplementation;
    toBeGreaterThan: MatcherImplementation;
    toBeGreaterThanOrEqual: MatcherImplementation;
    toBeLessThan: MatcherImplementation;
    toBeLessThanOrEqual: MatcherImplementation;
    toBeCloseTo: MatcherImplementation;
    toHaveLength: MatcherImplementation;
  }

  export const describe: ChainableSuite;
  export const test: ChainableTest;
  export const it: ChainableTest;
  export function expect(actual: unknown): MatcherTree;

  namespace expect {
    function arrayContaining<T>(expected: readonly T[]): unknown;
    function stringContaining(expected: string): unknown;
    function objectContaining<T extends Record<string, unknown>>(expected: T): unknown;
  }
}
