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

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  Reader, ReaderTask, ReaderTaskResult, Task, Result, Validation,
  Ok, Err, isOk, isErr 
} from '../../allTS'
import { testApplicativeLaws, commonGenerators, commonEquality } from './law-helpers'

describe("LAW: Applicative laws", () => {
  // Common generators
  const genInt = commonGenerators.integer
  const genString = commonGenerators.string
  const genFn = () => commonGenerators.fn(genInt)

  const mapArbitrary = <Input, Output>(
    arbitrary: fc.Arbitrary<Input>,
    mapper: (value: Input) => Output
  ): fc.Arbitrary<Output> => {
    const mapFn = arbitrary.map as any
    if (typeof mapFn !== 'function') {
      throw new Error('fast-check arbitrary missing map implementation')
    }
    return mapFn.call(arbitrary, mapper) as fc.Arbitrary<Output>
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
      pure: Ok,
      ap: <A, B>(ff: Result<string, (a: A) => B>) => (fa: Result<string, A>): Result<string, B> => {
        if (isOk(ff) && isOk(fa)) return Ok(ff.value(fa.value))
        if (isErr(ff)) return ff
        if (isErr(fa)) return fa
        return Err("impossible" as string)
      },
      eq: (a: Result<string, any>, b: Result<string, any>) => {
        if (isOk(a) && isOk(b)) return a.value === b.value
        if (isErr(a) && isErr(b)) return a.error === b.error
        return false
      }
    }

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
      pure: <A>(a: A): Reader<number, A> => Reader.of(a),
      ap: <A, B>(ff: Reader<number, (a: A) => B>) => (fa: Reader<number, A>): Reader<number, B> => 
        Reader.ap(ff)(fa),
      eq: (a: Reader<number, any>, b: Reader<number, any>) => {
        // Test with a few random environments
        for (let i = 0; i < 5; i++) {
          const env = Math.floor(Math.random() * 100)
          if (a(env) !== b(env)) return false
        }
        return true
      }
    }

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
      pure: <A>(a: A): Task<A> => Task.of(a),
      ap: <A, B>(ff: Task<(a: A) => B>) => (fa: Task<A>): Task<B> => 
        Task.ap(ff)(fa),
      eq: async (a: Task<any>, b: Task<any>) => {
        const resultA = await a()
        const resultB = await b()
        return resultA === resultB
      }
    }

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
      pure: <A>(a: A): ReaderTask<number, A> => ReaderTask.of(a),
      ap: <A, B>(ff: ReaderTask<number, (a: A) => B>) => (fa: ReaderTask<number, A>): ReaderTask<number, B> => 
        ReaderTask.ap(ff)(fa),
      eq: async (a: ReaderTask<number, any>, b: ReaderTask<number, any>) => {
        // Test with a few random environments
        for (let i = 0; i < 3; i++) {
          const env = Math.floor(Math.random() * 100)
          const resultA = await a(env)
          const resultB = await b(env)
          if (resultA !== resultB) return false
        }
        return true
      }
    }

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
      pure: <A>(a: A): ReaderTaskResult<number, string, A> => ReaderTaskResult.of(a),
      ap: <A, B>(ff: ReaderTaskResult<number, string, (a: A) => B>) => (fa: ReaderTaskResult<number, string, A>): ReaderTaskResult<number, string, B> => 
        ReaderTaskResult.ap(ff)(fa),
      eq: async (a: ReaderTaskResult<number, string, any>, b: ReaderTaskResult<number, string, any>) => {
        // Test with a few random environments
        for (let i = 0; i < 3; i++) {
          const env = Math.floor(Math.random() * 100)
          const resultA = await a(env)
          const resultB = await b(env)
          if (isOk(resultA) && isOk(resultB)) {
            if (resultA.value !== resultB.value) return false
          } else if (isErr(resultA) && isErr(resultB)) {
            if (resultA.error !== resultB.error) return false
          } else {
            return false
          }
        }
        return true
      }
    }

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
        mapArbitrary(genInt(), (value) => Ok(value)),
        mapArbitrary(genString(), (error) => Err(error))
      ),
      genFunc: genFn,
      genFFA: () => fc.oneof(
        mapArbitrary(genFn(), (f) => Ok(f)),
        mapArbitrary(genString(), (error) => Err(error))
      ),
      pure: Ok,
      ap: <A, B>(ff: Validation<string, (a: A) => B>) => (fa: Validation<string, A>): Validation<string, B> => {
        if (isOk(ff) && isOk(fa)) return Ok(ff.value(fa.value))
        if (isErr(ff)) return ff
        if (isErr(fa)) return fa
        return Err("impossible" as string)
      },
      eq: (a: Validation<string, any>, b: Validation<string, any>) => {
        if (isOk(a) && isOk(b)) return a.value === b.value
        if (isErr(a) && isErr(b)) return a.error === b.error
        return false
      }
    }

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
