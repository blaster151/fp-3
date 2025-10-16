/**
 * LAW: Monad laws
 * 
 * Mathematical forms:
 * - Left Identity: return(a) >>= f = f(a)
 * - Right Identity: m >>= return = m
 * - Associativity: (m >>= f) >>= g = m >>= (λx.f(x) >>= g)
 * 
 * These laws ensure that monadic composition behaves correctly.
 * Note: Validation is excluded (Applicative-only due to error accumulation).
 */

import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import {
  Reader, ReaderTask, ReaderTaskResult, ReaderTaskResultK, Task, Result,
  Ok, Err, isOk, isErr
} from '../../allTS'
import { testMonadLaws, commonGenerators, commonEquality } from './law-helpers'
import type { MonadConfig } from './law-helpers'

describe("LAW: Monad laws", () => {
  // Common generators
  const genInt = commonGenerators.integer
  const genString = commonGenerators.string
  const genFn = () => commonGenerators.fn<number, number>(genInt)

  const mapArbitrary = <Input, Output>(
    arbitrary: fc.Arbitrary<Input>,
    mapper: (value: Input) => Output
  ): fc.Arbitrary<Output> => {
    const mapFn = typeof arbitrary.map === 'function' ? arbitrary.map.bind(arbitrary) : undefined
    if (!mapFn) {
      throw new Error('fast-check arbitrary missing map implementation')
    }
    return mapFn((value: unknown) => mapper(value as Input)) as fc.Arbitrary<Output>
  }

  describe("Result monad", () => {
    const intArb = genInt()
    const strArb = genString()

    const genOk: fc.Arbitrary<Result<string, number>> =
      mapArbitrary(intArb, (value) => Ok(value) as Result<string, number>)

    const genErr: fc.Arbitrary<Result<string, number>> =
      mapArbitrary(strArb, (error: string) => Err<string>(error) as Result<string, number>)

    const genResult = (): fc.Arbitrary<Result<string, number>> =>
      fc.oneof(genOk, genErr)

    const genResultFn = (): fc.Arbitrary<(a: number) => Result<string, number>> =>
      fc.func(genResult()) as fc.Arbitrary<(a: number) => Result<string, number>>

    const config: MonadConfig<Result<string, number>, number> = {
      name: "Result",
      genA: genInt,
      genFA: () => genResult(),
      genK: () => genResultFn(),
      pure: (value: number): Result<string, number> => Ok(value),
      chain: <A, B>(k: (a: A) => Result<string, B>) =>
        (fa: Result<string, A>): Result<string, B> => {
          if (isErr(fa)) return fa
          return k(fa.value)
        },
      eq: (a: Result<string, any>, b: Result<string, any>) => {
        if (isOk(a) && isOk(b)) return a.value === b.value
        if (isErr(a) && isErr(b)) return a.error === b.error
        return false
      }
    }

    const { leftIdentity, rightIdentity, associativity } = testMonadLaws(config)

    it("Left Identity: return(a) >>= f = f(a)", () => {
      leftIdentity()
    })

    it("Right Identity: m >>= return = m", () => {
      rightIdentity()
    })

    it("Associativity: (m >>= f) >>= g = m >>= (λx.f(x) >>= g)", () => {
      associativity()
    })
  })

  describe("Reader monad", () => {
    const genReader = (): fc.Arbitrary<Reader<number, number>> =>
      fc.func(genInt()) as fc.Arbitrary<Reader<number, number>>

    const genReaderK = (): fc.Arbitrary<(a: number) => Reader<number, number>> =>
      fc.func(genReader()) as fc.Arbitrary<(a: number) => Reader<number, number>>

    const config: MonadConfig<Reader<number, number>, number> = {
      name: "Reader",
      genA: genInt,
      genFA: () => genReader(),
      genK: () => genReaderK(),
      pure: (value: number): Reader<number, number> => Reader.of(value),
      chain: <A, B>(k: (a: A) => Reader<number, B>) =>
        (fa: Reader<number, A>): Reader<number, B> =>
          Reader.chain(k)(fa),
      eq: (a: Reader<number, any>, b: Reader<number, any>) => {
        // Test with a few random environments
        for (let i = 0; i < 5; i++) {
          const env = Math.floor(Math.random() * 100)
          if (a(env) !== b(env)) return false
        }
        return true
      }
    }

    const { leftIdentity, rightIdentity, associativity } = testMonadLaws(config)

    it("Left Identity: return(a) >>= f = f(a)", () => {
      leftIdentity()
    })

    it("Right Identity: m >>= return = m", () => {
      rightIdentity()
    })

    it("Associativity: (m >>= f) >>= g = m >>= (λx.f(x) >>= g)", () => {
      associativity()
    })
  })

  describe("Task monad", () => {
    const genTask = (): fc.Arbitrary<Task<number>> =>
      mapArbitrary(genInt(), (value) => Task.of(value))

    const genTaskK = (): fc.Arbitrary<(a: number) => Task<number>> =>
      fc.func(genTask()) as fc.Arbitrary<(a: number) => Task<number>>

    const config: MonadConfig<Task<number>, number> = {
      name: "Task",
      genA: genInt,
      genFA: () => genTask(),
      genK: () => genTaskK(),
      pure: (value: number): Task<number> => Task.of(value),
      chain: <A, B>(k: (a: A) => Task<B>) =>
        (fa: Task<A>): Task<B> =>
          Task.chain(k)(fa),
      eq: async (a: Task<any>, b: Task<any>) => {
        const resultA = await a()
        const resultB = await b()
        return resultA === resultB
      },
      isAsync: true
    }

    const { leftIdentity, rightIdentity, associativity } = testMonadLaws(config)

    it("Left Identity: return(a) >>= f = f(a)", async () => {
      await leftIdentity()
    })

    it("Right Identity: m >>= return = m", async () => {
      await rightIdentity()
    })

    it("Associativity: (m >>= f) >>= g = m >>= (λx.f(x) >>= g)", async () => {
      await associativity()
    })
  })

  describe("ReaderTask monad", () => {
    const genReaderTask = (): fc.Arbitrary<ReaderTask<number, number>> => {
      const readerArb = fc.func(genInt()) as fc.Arbitrary<Reader<number, number>>
      return mapArbitrary(readerArb, (reader: Reader<number, number>) => async (env: number) => reader(env))
    }

    const genReaderTaskK = (): fc.Arbitrary<(a: number) => ReaderTask<number, number>> =>
      fc.func(genReaderTask()) as fc.Arbitrary<(a: number) => ReaderTask<number, number>>

    const config: MonadConfig<ReaderTask<number, number>, number> = {
      name: "ReaderTask",
      genA: genInt,
      genFA: () => genReaderTask(),
      genK: () => genReaderTaskK(),
      pure: (value: number): ReaderTask<number, number> => ReaderTask.of(value),
      chain: <A, B>(k: (a: A) => ReaderTask<number, B>) =>
        (fa: ReaderTask<number, A>): ReaderTask<number, B> =>
          ReaderTask.chain(k)(fa),
      eq: async (a: ReaderTask<number, any>, b: ReaderTask<number, any>) => {
        // Test with a few random environments
        for (let i = 0; i < 3; i++) {
          const env = Math.floor(Math.random() * 100)
          const resultA = await a(env)
          const resultB = await b(env)
          if (resultA !== resultB) return false
        }
        return true
      },
      isAsync: true
    }

    const { leftIdentity, rightIdentity, associativity } = testMonadLaws(config)

    it("Left Identity: return(a) >>= f = f(a)", async () => {
      await leftIdentity()
    })

    it("Right Identity: m >>= return = m", async () => {
      await rightIdentity()
    })

    it("Associativity: (m >>= f) >>= g = m >>= (λx.f(x) >>= g)", async () => {
      await associativity()
    })
  })

  describe("ReaderTaskResult monad", () => {
    const genResult = () =>
      fc.oneof<Result<string, number>>(
        mapArbitrary(genInt(), (value) => Ok(value) as Result<string, number>),
        mapArbitrary(genString(), (error) => Err<string>(error) as Result<string, number>)
      )

      const genReaderTaskResult = (): fc.Arbitrary<ReaderTaskResult<number, string, number>> => {
        const readerResultArb = fc.func(genResult()) as fc.Arbitrary<(env: number) => Result<string, number>>
        return mapArbitrary(
          readerResultArb,
          (reader: (env: number) => Result<string, number>) => async (env: number) => reader(env)
        )
      }

    const genReaderTaskResultK = (): fc.Arbitrary<(a: number) => ReaderTaskResult<number, string, number>> =>
      fc.func(genReaderTaskResult()) as fc.Arbitrary<(a: number) => ReaderTaskResult<number, string, number>>

    const readerTaskResultMonad = ReaderTaskResultK<number, string>()

    const config: MonadConfig<ReaderTaskResult<number, string, number>, number> = {
      name: "ReaderTaskResult",
      genA: genInt,
      genFA: () => genReaderTaskResult(),
      genK: () => genReaderTaskResultK(),
      pure: (value: number): ReaderTaskResult<number, string, number> => readerTaskResultMonad.of(value),
      chain: <A, B>(k: (a: A) => ReaderTaskResult<number, string, B>) =>
        (fa: ReaderTaskResult<number, string, A>): ReaderTaskResult<number, string, B> =>
          async (env: number) => {
            const current = await fa(env)
            if (isErr(current)) return current
            return k(current.value)(env)
          },
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
      },
      isAsync: true
    }

    const { leftIdentity, rightIdentity, associativity } = testMonadLaws(config)

    it("Left Identity: return(a) >>= f = f(a)", async () => {
      await leftIdentity()
    })

    it("Right Identity: m >>= return = m", async () => {
      await rightIdentity()
    })

    it("Associativity: (m >>= f) >>= g = m >>= (λx.f(x) >>= g)", async () => {
      await associativity()
    })
  })
})
