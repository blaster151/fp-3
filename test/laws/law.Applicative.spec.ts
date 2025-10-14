/**
 * LAW: Applicative laws
 * 
 * Mathematical forms:
 * - Identity: pure(id) <*> v = v
 * - Homomorphism: pure(f) <*> pure(x) = pure(f(x))
 * - Interchange: u <*> pure(y) = pure(λf.f(y)) <*> u
 * - Composition: pure(∘) <*> u <*> v <*> w = u <*> (v <*> w)
 * 
 * These laws ensure that applicative composition behaves correctly.
 * Note: Validation is Applicative-only, not Monad (error accumulation breaks associativity).
 */

import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import {
  Reader,
  ReaderTask,
  Task,
  Result,
  Validation,
  Ok,
  Err,
  isOk,
  isErr,
  VErr,
  VOk,
  isVErr,
  isVOk,
  concatArray
} from '../../allTS'
import type { ReaderTaskResult as ReaderTaskResultType } from '../../allTS'
import { testApplicativeLaws, commonGenerators } from './law-helpers'
import type { ApplicativeConfig } from './law-helpers'

describe("LAW: Applicative laws", () => {
  // Common generators
  const genInt = commonGenerators.integer
  const genString = commonGenerators.string
  const genFn = () => commonGenerators.fn(genInt)

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

  const isResultCandidate = (value: unknown): value is Result<unknown, unknown> => {
    if (typeof value !== 'object' || value === null) return false
    const tag = (value as { readonly _tag?: unknown })._tag
    return tag === 'Ok' || tag === 'Err'
  }

  const ensureResult = (value: unknown): Result<string, unknown> => {
    if (!isResultCandidate(value)) {
      throw new TypeError('Expected Result for applicative law test')
    }
    return value as Result<string, unknown>
  }

  const isValidationCandidate = (value: unknown): value is Validation<unknown, unknown> => {
    if (typeof value !== 'object' || value === null) return false
    const tag = (value as { readonly _tag?: unknown })._tag
    return tag === 'VOk' || tag === 'VErr'
  }

  const ensureValidation = (value: unknown): Validation<string, unknown> => {
    if (!isValidationCandidate(value)) {
      throw new TypeError('Expected Validation for applicative law test')
    }
    return value as Validation<string, unknown>
  }

  const ensureReaderTaskResult = (
    value: unknown
  ): ReaderTaskResultType<number, string, unknown> => {
    if (typeof value !== 'function') {
      throw new TypeError('Expected ReaderTaskResult for applicative law test')
    }
    return value as ReaderTaskResultType<number, string, unknown>
  }

  const readerTaskResultPure = (
    value: unknown
  ): ReaderTaskResultType<number, string, unknown> => async () => Ok(value)

  const readerTaskResultAp = (
    ff: ReaderTaskResultType<number, string, (a: unknown) => unknown>,
    fa: ReaderTaskResultType<number, string, unknown>
  ): ReaderTaskResultType<number, string, unknown> =>
    async (env) => {
      const [fab, arg] = await Promise.all([ff(env), fa(env)])
      if (isErr(fab)) return fab
      if (isErr(arg)) return arg
      const apply = fab.value as (a: unknown) => unknown
      return Ok(apply(arg.value))
    }

  describe("Result applicative", () => {
    const config = {
      name: "Result",
      genA: genInt,
      genFA: () => fc.oneof(
        mapArbitrary(genInt(), (value) => Ok(value)),
        mapArbitrary(genString(), (error) => Err(error))
      ),
      genFunc: genFn,
      genFFA: () => fc.oneof(
        mapArbitrary(genFn(), (f) => Ok(f)),
        mapArbitrary(genString(), (error) => Err(error))
      ),
      pure: (value: unknown) => Ok(value),
      ap: (ff: unknown) => (fa: unknown) => {
        const func = ensureResult(ff)
        const arg = ensureResult(fa)
        if (isOk(func) && isOk(arg)) {
          const apply = func.value as (a: unknown) => unknown
          return Ok(apply(arg.value))
        }
        if (isErr(func)) return func
        if (isErr(arg)) return arg
        return Err('unexpected result state')
      },
      eq: (a: unknown, b: unknown) => {
        const left = ensureResult(a)
        const right = ensureResult(b)
        if (isOk(left) && isOk(right)) return left.value === right.value
        if (isErr(left) && isErr(right)) return left.error === right.error
        return false
      }
    } satisfies ApplicativeConfig<number>

    const laws = testApplicativeLaws(config)

    it("Identity: pure(id) <*> v = v", () => {
      laws.identity()
    })

    it("Homomorphism: pure(f) <*> pure(x) = pure(f(x))", () => {
      laws.homomorphism()
    })

    it("Interchange: u <*> pure(y) = pure(λf.f(y)) <*> u", () => {
      laws.interchange()
    })

    it("Composition: pure(∘) <*> u <*> v <*> w = u <*> (v <*> w)", () => {
      laws.composition()
    })
  })

  describe("Reader applicative", () => {
    const config = {
      name: "Reader",
      genA: genInt,
      genFA: () => fc.func(fc.constant(genInt())),
      genFunc: genFn,
      genFFA: () => fc.func(fc.constant(genFn())),
      pure: (value: unknown) => Reader.of(value),
      ap: (ff: unknown) => (fa: unknown) =>
        Reader.ap(ff as Reader<number, (a: unknown) => unknown>)(fa as Reader<number, unknown>),
      eq: ((left, right) => {
        if (typeof left !== 'function' || typeof right !== 'function') {
          return false
        }
        const a = left as Reader<number, unknown>
        const b = right as Reader<number, unknown>
        for (let i = 0; i < 5; i++) {
          const env = Math.floor(Math.random() * 100)
          if (a(env) !== b(env)) return false
        }
        return true
      }) as ApplicativeConfig<number>['eq']
    } satisfies ApplicativeConfig<number>

    const laws = testApplicativeLaws(config)

    it("Identity: pure(id) <*> v = v", () => {
      laws.identity()
    })

    it("Homomorphism: pure(f) <*> pure(x) = pure(f(x))", () => {
      laws.homomorphism()
    })

    it("Interchange: u <*> pure(y) = pure(λf.f(y)) <*> u", () => {
      laws.interchange()
    })

    it("Composition: pure(∘) <*> u <*> v <*> w = u <*> (v <*> w)", () => {
      laws.composition()
    })
  })

  describe("Task applicative", () => {
    const config = {
      name: "Task",
      genA: genInt,
      genFA: () => fc.func(fc.constant(fc.constant(genInt()))),
      genFunc: genFn,
      genFFA: () => fc.func(fc.constant(fc.constant(genFn()))),
      pure: (value: unknown) => Task.of(value),
      ap: (ff: unknown) => (fa: unknown) =>
        Task.ap(ff as Task<(a: unknown) => unknown>)(fa as Task<unknown>),
      eq: (async (left, right) => {
        if (typeof left !== 'function' || typeof right !== 'function') {
          return false
        }
        const a = left as Task<unknown>
        const b = right as Task<unknown>
        const [resultA, resultB] = await Promise.all([a(), b()])
        return resultA === resultB
      }) as ApplicativeConfig<number>['eq']
    } satisfies ApplicativeConfig<number>

    const laws = testApplicativeLaws(config)

    it("Identity: pure(id) <*> v = v", async () => {
      await laws.identity()
    })

    it("Homomorphism: pure(f) <*> pure(x) = pure(f(x))", async () => {
      await laws.homomorphism()
    })

    it("Interchange: u <*> pure(y) = pure(λf.f(y)) <*> u", async () => {
      await laws.interchange()
    })

    it("Composition: pure(∘) <*> u <*> v <*> w = u <*> (v <*> w)", async () => {
      await laws.composition()
    })
  })

  describe("ReaderTask applicative", () => {
    const config = {
      name: "ReaderTask",
      genA: genInt,
      genFA: () => fc.func(fc.constant(fc.constant(genInt()))),
      genFunc: genFn,
      genFFA: () => fc.func(fc.constant(fc.constant(genFn()))),
      pure: (value: unknown) => ReaderTask.of(value),
      ap: (ff: unknown) => (fa: unknown) =>
        ReaderTask.ap(ff as ReaderTask<number, (a: unknown) => unknown>)(fa as ReaderTask<number, unknown>),
      eq: (async (left, right) => {
        if (typeof left !== 'function' || typeof right !== 'function') {
          return false
        }
        const a = left as ReaderTask<number, unknown>
        const b = right as ReaderTask<number, unknown>
        for (let i = 0; i < 3; i++) {
          const env = Math.floor(Math.random() * 100)
          const [resultA, resultB] = await Promise.all([a(env), b(env)])
          if (resultA !== resultB) return false
        }
        return true
      }) as ApplicativeConfig<number>['eq']
    } satisfies ApplicativeConfig<number>

    const laws = testApplicativeLaws(config)

    it("Identity: pure(id) <*> v = v", async () => {
      await laws.identity()
    })

    it("Homomorphism: pure(f) <*> pure(x) = pure(f(x))", async () => {
      await laws.homomorphism()
    })

    it("Interchange: u <*> pure(y) = pure(λf.f(y)) <*> u", async () => {
      await laws.interchange()
    })

    it("Composition: pure(∘) <*> u <*> v <*> w = u <*> (v <*> w)", async () => {
      await laws.composition()
    })
  })

  describe("ReaderTaskResult applicative", () => {
    const config = {
      name: "ReaderTaskResult",
      genA: genInt,
      genFA: () => fc.func(fc.constant(fc.constant(fc.oneof(
        mapArbitrary(genInt(), (value) => Ok(value)),
        mapArbitrary(genString(), (error) => Err(error))
      )))),
      genFunc: genFn,
      genFFA: () => fc.func(fc.constant(fc.constant(fc.oneof(
        mapArbitrary(genFn(), (f) => Ok(f)),
        mapArbitrary(genString(), (error) => Err(error))
      )))),
      pure: (value: unknown) => readerTaskResultPure(value),
      ap: (ff: unknown) => (fa: unknown) =>
        readerTaskResultAp(
          ensureReaderTaskResult(ff) as ReaderTaskResultType<number, string, (a: unknown) => unknown>,
          ensureReaderTaskResult(fa)
        ),
      eq: (async (left, right) => {
        const a = ensureReaderTaskResult(left)
        const b = ensureReaderTaskResult(right)
        for (let i = 0; i < 3; i++) {
          const env = Math.floor(Math.random() * 100)
          const [resultA, resultB] = await Promise.all([a(env), b(env)])
          if (isOk(resultA) && isOk(resultB)) {
            if (resultA.value !== resultB.value) return false
          } else if (isErr(resultA) && isErr(resultB)) {
            if (resultA.error !== resultB.error) return false
          } else {
            return false
          }
        }
        return true
      }) as ApplicativeConfig<number>['eq']
    } satisfies ApplicativeConfig<number>

    const laws = testApplicativeLaws(config)

    it("Identity: pure(id) <*> v = v", async () => {
      await laws.identity()
    })

    it("Homomorphism: pure(f) <*> pure(x) = pure(f(x))", async () => {
      await laws.homomorphism()
    })

    it("Interchange: u <*> pure(y) = pure(λf.f(y)) <*> u", async () => {
      await laws.interchange()
    })

    it("Composition: pure(∘) <*> u <*> v <*> w = u <*> (v <*> w)", async () => {
      await laws.composition()
    })
  })

  describe("Validation applicative", () => {
    const config = {
      name: "Validation",
      genA: genInt,
      genFA: () => fc.oneof(
        mapArbitrary(genInt(), (value) => VOk(value)),
        mapArbitrary(genString(), (error) => VErr(error))
      ),
      genFunc: genFn,
      genFFA: () => fc.oneof(
        mapArbitrary(genFn(), (f) => VOk(f)),
        mapArbitrary(genString(), (error) => VErr(error))
      ),
      pure: (value: unknown) => VOk(value),
      ap: (ff: unknown) => (fa: unknown) => {
        const func = ensureValidation(ff)
        const arg = ensureValidation(fa)
        if (isVOk(func) && isVOk(arg)) {
          const apply = func.value as (a: unknown) => unknown
          return VOk(apply(arg.value))
        }
        if (isVErr(func) && isVErr(arg)) {
          return VErr(...concatArray(func.errors, arg.errors))
        }
        if (isVErr(func)) return func
        return arg
      },
      eq: (a: unknown, b: unknown) => {
        const left = ensureValidation(a)
        const right = ensureValidation(b)
        if (isVOk(left) && isVOk(right)) return left.value === right.value
        if (isVErr(left) && isVErr(right)) {
          if (left.errors.length !== right.errors.length) return false
          return left.errors.every((error, index) => error === right.errors[index])
        }
        return false
      }
    } satisfies ApplicativeConfig<number>

    const laws = testApplicativeLaws(config)

    it("Identity: pure(id) <*> v = v", () => {
      laws.identity()
    })

    it("Homomorphism: pure(f) <*> pure(x) = pure(f(x))", () => {
      laws.homomorphism()
    })

    it("Interchange: u <*> pure(y) = pure(λf.f(y)) <*> u", () => {
      laws.interchange()
    })

    it("Composition: pure(∘) <*> u <*> v <*> w = u <*> (v <*> w)", () => {
      laws.composition()
    })
  })
})
