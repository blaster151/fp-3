/**
 * LAW: Functor laws
 *
 * Mathematical forms:
 * - Identity: fmap(id, a) = a
 * - Composition: fmap(g∘f, a) = fmap(g, fmap(f, a))
 *
 * These laws ensure that functorial mapping behaves correctly.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  Reader, ReaderTask, ReaderTaskResult, Task, Result, Validation,
  Ok, Err, isOk, isErr,
  VOk, VErr, isVOk, isVErr
} from '../../allTS'
import { testFunctorLaws, commonGenerators } from './law-helpers'
import type { FunctorConfig, FunctorLawResult } from './law-helpers'

describe("LAW: Functor laws", () => {
  // Common generators
  const genInt = commonGenerators.integer
  const genString = commonGenerators.string
  const genFn = () => commonGenerators.fn<number, number>(genInt)
  const mapArbitrary = <Input, Output>(
    arbitrary: fc.Arbitrary<Input>,
    mapper: (value: Input) => Output
  ): fc.Arbitrary<Output> => {
    const mapFn = (arbitrary as any).map
    if (typeof mapFn !== 'function') {
      throw new Error('fast-check arbitrary missing map implementation')
    }
    return mapFn.call(arbitrary, mapper) as fc.Arbitrary<Output>
  }

  const runFunctorLaws = (
    config: FunctorConfig<any, number, number>
  ): FunctorLawResult => testFunctorLaws<any, number, number>(config)

  describe("Result functor", () => {
    const okResult: fc.Arbitrary<Result<string, number>> = mapArbitrary(
      genInt(),
      (value) => Ok(value) as Result<string, number>
    )

    const errResult: fc.Arbitrary<Result<string, number>> = mapArbitrary(
      genString(),
      (error) => Err<string>(error) as Result<string, number>
    )

    const config = {
      name: "Result",
      genA: genInt,
      genFA: () => fc.oneof<Result<string, number>>(okResult, errResult),
      genF: genFn,
      genG: genFn,
      map: <A, B>(f: (a: A) => B) => (fa: Result<string, A>): Result<string, B> => {
        if (isOk(fa)) return Ok(f(fa.value))
        return fa
      },
      id: (a: number) => a,
      eq: (a: Result<string, any>, b: Result<string, any>) => {
        if (isOk(a) && isOk(b)) return a.value === b.value
        if (isErr(a) && isErr(b)) return a.error === b.error
        return false
      }
    }

    const laws: FunctorLawResult = runFunctorLaws(config)

    it("Identity: fmap(id, a) = a", () => {
      laws.identity()
    })

    it("Composition: fmap(g∘f, a) = fmap(g, fmap(f, a))", () => {
      laws.composition()
    })
  })

  describe("Reader functor", () => {
    const config = {
      name: "Reader",
      genA: genInt,
      genFA: () => genFn() as fc.Arbitrary<Reader<number, number>>,
      genF: genFn,
      genG: genFn,
      map: <A, B>(f: (a: A) => B) => (fa: Reader<number, A>): Reader<number, B> =>
        Reader.map(f)(fa),
      id: (a: number) => a,
      eq: (a: Reader<number, any>, b: Reader<number, any>) => {
        for (let i = 0; i < 5; i++) {
          const env = Math.floor(Math.random() * 100)
          if (a(env) !== b(env)) return false
        }
        return true
      }
    }

    const laws: FunctorLawResult = runFunctorLaws(config)

    it("Identity: fmap(id, a) = a", () => {
      laws.identity()
    })

    it("Composition: fmap(g∘f, a) = fmap(g, fmap(f, a))", () => {
      laws.composition()
    })
  })

  describe("Task functor", () => {
    const config = {
      name: "Task",
      genA: genInt,
      genFA: () =>
        mapArbitrary(genInt(), (value) => async () => value) as fc.Arbitrary<Task<number>>,
      genF: genFn,
      genG: genFn,
      map: <A, B>(f: (a: A) => B) => (fa: Task<A>): Task<B> =>
        Task.map(f)(fa),
      id: (a: number) => a,
      eq: async (a: Task<any>, b: Task<any>) => {
        const resultA = await a()
        const resultB = await b()
        return resultA === resultB
      }
    }

    const laws: FunctorLawResult = runFunctorLaws(config)

    it("Identity: fmap(id, a) = a", async () => {
      await laws.identity()
    })

    it("Composition: fmap(g∘f, a) = fmap(g, fmap(f, a))", async () => {
      await laws.composition()
    })
  })

  describe("ReaderTask functor", () => {
    const config = {
      name: "ReaderTask",
      genA: genInt,
      genFA: () =>
        mapArbitrary(
          genFn(),
          (fn) => async (env: number) => fn(env)
        ) as fc.Arbitrary<ReaderTask<number, number>>,
      genF: genFn,
      genG: genFn,
      map: <A, B>(f: (a: A) => B) => (fa: ReaderTask<number, A>): ReaderTask<number, B> =>
        ReaderTask.map(f)(fa),
      id: (a: number) => a,
      eq: async (a: ReaderTask<number, any>, b: ReaderTask<number, any>) => {
        for (let i = 0; i < 3; i++) {
          const env = Math.floor(Math.random() * 100)
          const resultA = await a(env)
          const resultB = await b(env)
          if (resultA !== resultB) return false
        }
        return true
      }
    }

    const laws: FunctorLawResult = runFunctorLaws(config)

    it("Identity: fmap(id, a) = a", async () => {
      await laws.identity()
    })

    it("Composition: fmap(g∘f, a) = fmap(g, fmap(f, a))", async () => {
      await laws.composition()
    })
  })

  describe("ReaderTaskResult functor", () => {
    const okResult: fc.Arbitrary<Result<string, number>> = mapArbitrary(
      genInt(),
      (value) => Ok(value) as Result<string, number>
    )

    const errResult: fc.Arbitrary<Result<string, number>> = mapArbitrary(
      genString(),
      (error) => Err<string>(error) as Result<string, number>
    )

    const resultArb = fc.oneof<Result<string, number>>(okResult, errResult)

    const readerResultArb = fc.func(resultArb) as fc.Arbitrary<
      (env: number) => Result<string, number>
    >

    const config = {
      name: "ReaderTaskResult",
      genA: genInt,
      genFA: () =>
        mapArbitrary(
          readerResultArb,
          (reader) => async (env: number) => reader(env)
        ) as fc.Arbitrary<ReaderTaskResult<number, string, number>>,
      genF: genFn,
      genG: genFn,
      map: <A, B>(f: (a: A) => B) =>
        (fa: ReaderTaskResult<number, string, A>): ReaderTaskResult<number, string, B> =>
          ReaderTaskResult.map<number, string, A, B>(f)(fa),
      id: (a: number) => a,
      eq: async (
        a: ReaderTaskResult<number, string, any>,
        b: ReaderTaskResult<number, string, any>
      ) => {
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

    const laws: FunctorLawResult = runFunctorLaws(config)

    it("Identity: fmap(id, a) = a", async () => {
      await laws.identity()
    })

    it("Composition: fmap(g∘f, a) = fmap(g, fmap(f, a))", async () => {
      await laws.composition()
    })
  })

  describe("Validation functor", () => {
    const okValidation: fc.Arbitrary<Validation<string, number>> = mapArbitrary(
      genInt(),
      (value) => VOk(value) as Validation<string, number>
    )

    const errValidation: fc.Arbitrary<Validation<string, number>> = mapArbitrary(
      genString(),
      (error) => VErr(error)
    )

    const config = {
      name: "Validation",
      genA: genInt,
      genFA: () => fc.oneof<Validation<string, number>>(okValidation, errValidation),
      genF: genFn,
      genG: genFn,
      map: <A, B>(f: (a: A) => B) => (fa: Validation<string, A>): Validation<string, B> => {
        if (isVOk(fa)) return VOk(f(fa.value))
        return fa
      },
      id: (a: number) => a,
      eq: (a: Validation<string, any>, b: Validation<string, any>) => {
        if (isVOk(a) && isVOk(b)) return a.value === b.value
        if (isVErr(a) && isVErr(b))
          return a.errors.length === b.errors.length && a.errors.every((e, i) => e === b.errors[i])
        return false
      }
    }

    const laws: FunctorLawResult = runFunctorLaws(config)

    it("Identity: fmap(id, a) = a", () => {
      laws.identity()
    })

    it("Composition: fmap(g∘f, a) = fmap(g, fmap(f, a))", () => {
      laws.composition()
    })
  })
})
