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
  Ok, Err, isOk, isErr 
} from '../../allTS'
import { testFunctorLaws, commonGenerators, commonEquality } from './law-helpers'

describe("LAW: Functor laws", () => {
  // Common generators
  const genInt = commonGenerators.integer
  const genString = commonGenerators.string
  const genFn = () => commonGenerators.fn(genInt)

  describe("Result functor", () => {
    const config = {
      name: "Result",
      genA: genInt,
      genFA: () => fc.oneof(
        genInt().map(Ok),
        genString().map(Err)
      ),
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

    const laws = testFunctorLaws(config)

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
      genFA: () => fc.func(fc.constant(genInt())),
      genF: genFn,
      genG: genFn,
      map: <A, B>(f: (a: A) => B) => (fa: Reader<number, A>): Reader<number, B> => 
        Reader.map(f)(fa),
      id: (a: number) => a,
      eq: (a: Reader<number, any>, b: Reader<number, any>) => {
        // Test with a few random environments
        for (let i = 0; i < 5; i++) {
          const env = Math.floor(Math.random() * 100)
          if (a(env) !== b(env)) return false
        }
        return true
      }
    }

    const laws = testFunctorLaws(config)

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
      genFA: () => fc.func(fc.constant(fc.constant(genInt()))),
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

    const laws = testFunctorLaws(config)

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
      genFA: () => fc.func(fc.constant(fc.constant(genInt()))),
      genF: genFn,
      genG: genFn,
      map: <A, B>(f: (a: A) => B) => (fa: ReaderTask<number, A>): ReaderTask<number, B> => 
        ReaderTask.map(f)(fa),
      id: (a: number) => a,
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

    const laws = testFunctorLaws(config)

    it("Identity: fmap(id, a) = a", async () => {
      await laws.identity()
    })

    it("Composition: fmap(g∘f, a) = fmap(g, fmap(f, a))", async () => {
      await laws.composition()
    })
  })

  describe("ReaderTaskResult functor", () => {
    const config = {
      name: "ReaderTaskResult",
      genA: genInt,
      genFA: () => fc.func(fc.constant(fc.constant(fc.oneof(
        genInt().map(Ok),
        genString().map(Err)
      )))),
      genF: genFn,
      genG: genFn,
      map: <A, B>(f: (a: A) => B) => (fa: ReaderTaskResult<number, string, A>): ReaderTaskResult<number, string, B> => 
        ReaderTaskResult.map(f)(fa),
      id: (a: number) => a,
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

    const laws = testFunctorLaws(config)

    it("Identity: fmap(id, a) = a", async () => {
      await laws.identity()
    })

    it("Composition: fmap(g∘f, a) = fmap(g, fmap(f, a))", async () => {
      await laws.composition()
    })
  })

  describe("Validation functor", () => {
    const config = {
      name: "Validation",
      genA: genInt,
      genFA: () => fc.oneof(
        genInt().map(Ok),
        genString().map(Err)
      ),
      genF: genFn,
      genG: genFn,
      map: <A, B>(f: (a: A) => B) => (fa: Validation<string, A>): Validation<string, B> => {
        if (isOk(fa)) return Ok(f(fa.value))
        return fa
      },
      id: (a: number) => a,
      eq: (a: Validation<string, any>, b: Validation<string, any>) => {
        if (isOk(a) && isOk(b)) return a.value === b.value
        if (isErr(a) && isErr(b)) return a.error === b.error
        return false
      }
    }

    const laws = testFunctorLaws(config)

    it("Identity: fmap(id, a) = a", () => {
      laws.identity()
    })

    it("Composition: fmap(g∘f, a) = fmap(g, fmap(f, a))", () => {
      laws.composition()
    })
  })
})
