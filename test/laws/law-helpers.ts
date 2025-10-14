/**
 * Law Test Helpers
 * 
 * Batteries-included test utilities for all algebraic structures.
 * Each instance gets the same comprehensive test suite.
 */

import * as fc from 'fast-check'

// ===============================================
// Generic Law Test Helpers
// ===============================================

export interface LawTestConfig<A> {
  name: string
  genA: () => fc.Arbitrary<A>
  eq: (a: A, b: A) => boolean
}

export interface FunctorConfig<F, A, B> {
  name: string
  genA: () => fc.Arbitrary<A>
  genFA: () => fc.Arbitrary<F>
  genF: () => fc.Arbitrary<(a: A) => B>
  genG: () => fc.Arbitrary<(b: B) => any>
  map: (f: (a: A) => B) => (fa: F) => F
  id: (a: A) => A
  eq: (left: F, right: F) => boolean | Promise<boolean>
}

export interface ApplicativeConfig<F, A, B> extends FunctorConfig<F, A, B> {
  genFFA: () => fc.Arbitrary<F> // F[A -> B]
  pure: (a: A) => F
  ap: (ff: F) => (fa: F) => F
}

export interface MonadConfig<F, A, B> extends ApplicativeConfig<F, A, B> {
  genK: () => fc.Arbitrary<(a: A) => F> // A -> F[B]
  chain: (k: (a: A) => F) => (fa: F) => F
}

export interface MonoidConfig<A> extends LawTestConfig<A> {
  empty: A
  concat: (a: A, b: A) => A
}

// ===============================================
// Functor Law Tests
// ===============================================

export interface FunctorLawResult {
  identity: () => void
  composition: () => void
}

export const testFunctorLaws = <F, A, B>(
  config: FunctorConfig<F, A, B>
): FunctorLawResult => {
  const { name, genA, genFA, genF, genG, map, id, eq } = config

  const ensureBoolean = (value: boolean | Promise<boolean>) =>
    typeof value === 'boolean' ? value : value.then(Boolean)

  return {
    identity: () => {
      fc.assert(
        fc.property(genFA(), (fa) => {
          const left = map(id)(fa)
          const right = fa
          return ensureBoolean(eq(left, right))
        }),
        { numRuns: 200 }
      )
    },

    composition: () => {
      fc.assert(
        fc.property(genFA(), genF(), genG(), (fa, f, g) => {
          const left = map((a: A) => g(f(a)))(fa)
          const right = map(g)(map(f)(fa))
          return ensureBoolean(eq(left, right))
        }),
        { numRuns: 200 }
      )
    }
  }
}

// ===============================================
// Applicative Law Tests
// ===============================================

export const testApplicativeLaws = <F, A, B>(config: ApplicativeConfig<F, A, B>) => {
  const { name, genA, genFA, genFFA, pure, ap, eq } = config

  return {
    identity: () => {
      fc.assert(
        fc.property(genFA(), (fa) => {
          const left = ap(pure(id))(fa)
          const right = fa
          return eq(left, right)
        }),
        { numRuns: 200 }
      )
    },

    homomorphism: () => {
      fc.assert(
        fc.property(genA(), genF(), (a, f) => {
          const left = ap(pure(f))(pure(a))
          const right = pure(f(a))
          return eq(left, right)
        }),
        { numRuns: 200 }
      )
    },

    interchange: () => {
      fc.assert(
        fc.property(genFFA(), genA(), (ff, a) => {
          const left = ap(ff)(pure(a))
          const right = ap(pure((f: (a: A) => B) => f(a)))(ff)
          return eq(left, right)
        }),
        { numRuns: 200 }
      )
    },

    composition: () => {
      fc.assert(
        fc.property(genFFA(), genFFA(), genFA(), (ff, gg, fa) => {
          const compose = (f: (a: A) => B, g: (b: B) => any) => (a: A) => g(f(a))
          const left = ap(ap(ap(pure(compose))(ff))(gg))(fa)
          const right = ap(ff)(ap(gg)(fa))
          return eq(left, right)
        }),
        { numRuns: 200 }
      )
    }
  }
}

// ===============================================
// Monad Law Tests
// ===============================================

export const testMonadLaws = <F, A, B>(config: MonadConfig<F, A, B>) => {
  const { name, genA, genFA, genK, pure, chain, eq } = config

  return {
    leftIdentity: () => {
      fc.assert(
        fc.property(genA(), genK(), (a, k) => {
          const left = chain(k)(pure(a))
          const right = k(a)
          return eq(left, right)
        }),
        { numRuns: 200 }
      )
    },

    rightIdentity: () => {
      fc.assert(
        fc.property(genFA(), (fa) => {
          const left = chain(pure)(fa)
          const right = fa
          return eq(left, right)
        }),
        { numRuns: 200 }
      )
    },

    associativity: () => {
      fc.assert(
        fc.property(genFA(), genK(), genK(), (fa, k1, k2) => {
          const left = chain(k2)(chain(k1)(fa))
          const right = chain((a: A) => chain(k2)(k1(a)))(fa)
          return eq(left, right)
        }),
        { numRuns: 200 }
      )
    }
  }
}

// ===============================================
// Monoid Law Tests
// ===============================================

export const testMonoidLaws = <A>(config: MonoidConfig<A>) => {
  const { name, genA, empty, concat, eq } = config

  return {
    leftIdentity: () => {
      fc.assert(
        fc.property(genA(), (a) => {
          const left = concat(empty, a)
          const right = a
          return eq(left, right)
        }),
        { numRuns: 200 }
      )
    },

    rightIdentity: () => {
      fc.assert(
        fc.property(genA(), (a) => {
          const left = concat(a, empty)
          const right = a
          return eq(left, right)
        }),
        { numRuns: 200 }
      )
    },

    associativity: () => {
      fc.assert(
        fc.property(genA(), genA(), genA(), (a, b, c) => {
          const left = concat(concat(a, b), c)
          const right = concat(a, concat(b, c))
          return eq(left, right)
        }),
        { numRuns: 200 }
      )
    }
  }
}

// ===============================================
// Common Generators
// ===============================================

export const commonGenerators = {
  // Numbers
  integer: () => fc.integer({ min: -100, max: 100 }),
  float: () => fc.float({ min: -100, max: 100 }),
  
  // Strings
  string: () => fc.string({ minLength: 0, maxLength: 10 }),
  
  // Functions
  fn: <A, B>(genB: () => fc.Arbitrary<B>) =>
    fc.func(genB()).map(fn => (a: A) => fn(a as unknown)) as fc.Arbitrary<(a: A) => B>,
  
  // Arrays
  array: <A>(genA: () => fc.Arbitrary<A>) => 
    fc.array(genA(), { minLength: 0, maxLength: 5 }),
  
  // Either-like
  either: <A, B>(genA: () => fc.Arbitrary<A>, genB: () => fc.Arbitrary<B>) =>
    fc.oneof(
      genA().map(a => ({ _tag: 'Left' as const, value: a })),
      genB().map(b => ({ _tag: 'Right' as const, value: b }))
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
  either: <A, B>(eqA: (a: A, b: A) => boolean, eqB: (a: B, b: B) => boolean) =>
    (ea: { _tag: 'Left'; value: A } | { _tag: 'Right'; value: B }, 
     eb: { _tag: 'Left'; value: A } | { _tag: 'Right'; value: B }) => {
      if (ea._tag !== eb._tag) return false
      return ea._tag === 'Left' ? eqA(ea.value, eb.value) : eqB(ea.value, eb.value)
    }
}
