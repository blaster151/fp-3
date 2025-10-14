/**
 * Law Test Helpers
 * 
 * Batteries-included test utilities for all algebraic structures.
 * Each instance gets the same comprehensive test suite.
 */

import * as fc from 'fast-check'

type MaybePromiseBoolean = boolean | PromiseLike<boolean>

const mapArbitrary = <Input, Output>(
  arbitrary: fc.Arbitrary<Input>,
  mapper: (value: Input) => Output
): fc.Arbitrary<Output> => {
  const mapFn = (arbitrary as { map?: (fn: (value: Input) => Output) => fc.Arbitrary<Output> }).map
  if (typeof mapFn !== 'function') {
    throw new Error('fast-check arbitrary missing map implementation')
  }
  return mapFn.call(arbitrary, mapper) as fc.Arbitrary<Output>
}

const normalizeInteger = (value: number) => {
  const span = 201
  const modulo = ((value % span) + span) % span
  return modulo - 100
}

const truncateString = (value: string) => value.slice(0, 10)

// ===============================================
// Generic Law Test Helpers
// ===============================================

export interface LawTestConfig<A> {
  readonly name: string
  readonly genA: () => fc.Arbitrary<A>
  readonly eq: (a: A, b: A) => MaybePromiseBoolean
}

export interface FunctorConfig<F, A> {
  readonly name: string
  readonly genA: () => fc.Arbitrary<A>
  readonly genFA: () => fc.Arbitrary<F>
  readonly genF: () => fc.Arbitrary<(a: A) => unknown>
  readonly genG: () => fc.Arbitrary<(value: unknown) => unknown>
  readonly map: (f: (a: A) => unknown) => (fa: F) => F
  readonly id: (a: A) => A
  readonly eq: (left: F, right: F) => MaybePromiseBoolean
}

export interface ApplicativeConfig<A> {
  readonly name: string
  readonly genA: () => fc.Arbitrary<A>
  readonly genFA: () => fc.Arbitrary<unknown>
  readonly genFunc: () => fc.Arbitrary<(a: A) => A>
  readonly genFFA: () => fc.Arbitrary<unknown>
  readonly pure: (value: unknown) => unknown
  readonly ap: (ff: unknown) => (fa: unknown) => unknown
  readonly eq: (left: unknown, right: unknown) => MaybePromiseBoolean
}

export interface MonadConfig<F, A> {
  readonly name: string
  readonly genA: () => fc.Arbitrary<A>
  readonly genFA: () => fc.Arbitrary<F>
  readonly genK: () => fc.Arbitrary<(a: A) => F>
  readonly pure: <T>(value: T) => F
  readonly chain: (k: (a: A) => F) => (fa: F) => F
  readonly eq: (left: F, right: F) => MaybePromiseBoolean
}

export interface MonoidConfig<A> extends LawTestConfig<A> {
  readonly empty: A
  readonly concat: (a: A, b: A) => A
}

// ===============================================
// Functor Law Tests
// ===============================================

export interface FunctorLawResult {
  readonly identity: () => void | Promise<void>
  readonly composition: () => void | Promise<void>
}

const assertProperty = (property: fc.Property) => fc.assert(property)

export const testFunctorLaws = <F, A>(
  config: FunctorConfig<F, A>
): FunctorLawResult => {
  const { genFA, genF, genG, map, id, eq } = config

  return {
    identity: () =>
      assertProperty(
        fc.asyncProperty(genFA(), async (fa) => eq(map(id)(fa), fa))
      ),

    composition: () =>
      assertProperty(
        fc.asyncProperty(
          fc.tuple(genFA(), genF(), genG()),
          async ([fa, f, g]) => {
            const left = map((a: A) => g(f(a)))(fa)
            const right = map(g)(map(f)(fa))
            return eq(left, right)
          }
        )
      )
  }
}

// ===============================================
// Applicative Law Tests
// ===============================================

export const testApplicativeLaws = <A>(config: ApplicativeConfig<A>) => {
  const { genA, genFA, genFunc, genFFA, pure, ap, eq } = config

  const identityFn = (value: A) => value

  return {
    identity: () =>
      assertProperty(
        fc.asyncProperty(genFA(), async (fa) => eq(ap(pure(identityFn))(fa), fa))
      ),

    homomorphism: () =>
      assertProperty(
        fc.asyncProperty(
          fc.tuple(genA(), genFunc()),
          async ([a, f]) => {
            const left = ap(pure(f))(pure(a))
            const right = pure(f(a))
            return eq(left, right)
          }
        )
      ),

    interchange: () =>
      assertProperty(
        fc.asyncProperty(
          fc.tuple(genFFA(), genA()),
          async ([ff, a]) => {
            const applyTo = (fn: (value: A) => A) => fn(a)
            const left = ap(ff)(pure(a))
            const right = ap(pure(applyTo))(ff)
            return eq(left, right)
          }
        )
      ),

    composition: () =>
      assertProperty(
        fc.asyncProperty(
          fc.tuple(genFFA(), genFFA(), genFA()),
          async ([ff, gg, fa]) => {
            const compose = (f: (a: A) => A, g: (value: A) => A) => (a: A) => g(f(a))
            const left = ap(ap(ap(pure(compose))(ff))(gg))(fa)
            const right = ap(ff)(ap(gg)(fa))
            return eq(left, right)
          }
        )
      )
  }
}

// ===============================================
// Monad Law Tests
// ===============================================

export const testMonadLaws = <F, A>(config: MonadConfig<F, A>) => {
  const { genA, genFA, genK, pure, chain, eq } = config

  return {
    leftIdentity: () =>
      assertProperty(
        fc.asyncProperty(
          fc.tuple(genA(), genK()),
          async ([a, k]) => eq(chain(k)(pure(a)), k(a))
        )
      ),

    rightIdentity: () =>
      assertProperty(
        fc.asyncProperty(genFA(), async (fa) => eq(chain(pure)(fa), fa))
      ),

    associativity: () =>
      assertProperty(
        fc.asyncProperty(
          fc.tuple(genFA(), genK(), genK()),
          async ([fa, k1, k2]) => {
            const left = chain(k2)(chain(k1)(fa))
            const right = chain((a: A) => chain(k2)(k1(a)))(fa)
            return eq(left, right)
          }
        )
      )
  }
}

// ===============================================
// Monoid Law Tests
// ===============================================

export const testMonoidLaws = <A>(config: MonoidConfig<A>) => {
  const { genA, empty, concat, eq } = config

  return {
    leftIdentity: () =>
      assertProperty(
        fc.asyncProperty(genA(), async (a) => eq(concat(empty, a), a))
      ),

    rightIdentity: () =>
      assertProperty(
        fc.asyncProperty(genA(), async (a) => eq(concat(a, empty), a))
      ),

    associativity: () =>
      assertProperty(
        fc.asyncProperty(
          fc.tuple(genA(), genA(), genA()),
          async ([a, b, c]) => eq(concat(concat(a, b), c), concat(a, concat(b, c)))
        )
      )
  }
}

// ===============================================
// Common Generators
// ===============================================

export const commonGenerators = {
  // Numbers
  integer: () => mapArbitrary(fc.integer(), normalizeInteger),
  float: () => fc.float({ min: -100, max: 100 }),

  // Strings
  string: () => mapArbitrary(fc.string(), truncateString),

  // Functions
  fn: <A, B>(genB: () => fc.Arbitrary<B>) =>
    mapArbitrary(fc.func(genB()), (fn) => (a: A) => fn(a as unknown)) as fc.Arbitrary<(a: A) => B>,

  // Arrays
  array: <A>(genA: () => fc.Arbitrary<A>) =>
    fc.array(genA(), { minLength: 0, maxLength: 5 }),

  // Either-like
  either: <A, B>(genA: () => fc.Arbitrary<A>, genB: () => fc.Arbitrary<B>) =>
    fc.oneof(
      mapArbitrary(genA(), (value) => ({ _tag: 'Left' as const, value })),
      mapArbitrary(genB(), (value) => ({ _tag: 'Right' as const, value }))
    )
}

// ===============================================
// Common Equality Functions
// ===============================================

export const commonEquality = {
  // Primitive equality
  primitive: <A>(a: A, b: A) => a === b,
  
  // Array equality
  array: <A>(eq: (a: A, b: A) => boolean) => (as: A[], bs: A[]) => {
    if (as.length !== bs.length) return false
    for (let i = 0; i < as.length; i++) {
      const a = as[i]
      if (a === undefined) return false
      const b = bs[i]
      if (b === undefined) return false
      if (!eq(a, b)) return false
    }
    return true
  },
  
  // Either equality
  either: <A, B>(eqA: (left: A, right: A) => boolean, eqB: (left: B, right: B) => boolean) =>
    (ea: { readonly _tag: 'Left'; readonly value: A } | { readonly _tag: 'Right'; readonly value: B },
     eb: { readonly _tag: 'Left'; readonly value: A } | { readonly _tag: 'Right'; readonly value: B }) => {
      if (ea._tag === 'Left' && eb._tag === 'Left') {
        return eqA(ea.value, eb.value)
      }
      if (ea._tag === 'Right' && eb._tag === 'Right') {
        return eqB(ea.value, eb.value)
      }
      return false
    }
}
