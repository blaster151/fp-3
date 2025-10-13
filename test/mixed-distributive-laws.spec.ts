import { describe, expect, it } from 'vitest'
import {
  Err,
  MixedDist_Result_Store,
  MixedDist_Task_Store,
  Ok,
  ResultK1,
  StoreComonad,
  isErr,
  isOk,
  liftComonadToTAlgK1,
  liftMonadToGCoalgK1,
} from '../allTS'
import type {
  ComonadK1,
  HK,
  MixedDistK1,
  MonadK1,
  Result,
  Store,
  Task,
} from '../allTS'

declare module '../allTS' {
  namespace HK {
    interface Registry1<A> {
      Store: Store<number, A>
    }
  }
}

const ResultMonad = ResultK1<string>()
const ResultMonadHK = ResultMonad as unknown as MonadK1<'Result'>
const StoreC = StoreComonad<number>()
const StoreCHK = StoreC as unknown as ComonadK1<'Store'>

describe('Mixed Distributive Laws', () => {
  describe('Result × Store distributive law', () => {
    const defaultPos = 0
    const dist = MixedDist_Result_Store<number, string>(defaultPos)

    it('distributes Ok(store) correctly', () => {
      const store: Store<number, string> = {
        pos: 5,
        peek: (n: number) => `value-${n}`,
      }
      const input: Result<string, Store<number, string>> = Ok(store)

      const result = dist.dist(input)

      expect(result.pos).toBe(5)
      expect(result.peek(0)).toEqual(Ok('value-0'))
      expect(result.peek(5)).toEqual(Ok('value-5'))
      expect(result.peek(10)).toEqual(Ok('value-10'))
    })

    it('distributes Err correctly with default position', () => {
      const input: Result<string, Store<number, string>> = Err('error message')

      const result = dist.dist(input)

      expect(result.pos).toBe(defaultPos)
      expect(result.peek(0)).toEqual(Err('error message'))
      expect(result.peek(5)).toEqual(Err('error message'))
      expect(result.peek(10)).toEqual(Err('error message'))
    })

    it('satisfies unit law: dist(M.of(ga)) ≈ C.of(ga)', () => {
      const samples: ReadonlyArray<Store<number, string>> = [
        { pos: 0, peek: (n: number) => `value-${n}` },
        { pos: 3, peek: () => 'constant' },
        { pos: 7, peek: (n: number) => `square-${n * n}` },
      ]

      for (const ga of samples) {
        const left = dist.dist(ResultMonad.of(ga))
        const right: Store<number, Result<string, string>> = {
          pos: ga.pos,
          peek: (n: number) => Ok(ga.peek(n)),
        }

        expect(left.pos).toBe(right.pos)

        const leftAtPos = left.peek(ga.pos)
        const rightAtPos = right.peek(ga.pos)

        expect(isOk(leftAtPos)).toBe(true)
        expect(isOk(rightAtPos)).toBe(true)
        if (isOk(leftAtPos) && isOk(rightAtPos)) {
          expect(leftAtPos.value).toBe(rightAtPos.value)
        }
      }
    })

    it('satisfies counit law: C.extract(dist(tga)) = M.map(C.extract)(tga)', () => {
      const okStore: Store<number, string> = {
        pos: 2,
        peek: (n: number) => `ok-${n}`,
      }
      const samples: ReadonlyArray<Result<string, Store<number, string>>> = [
        Ok(okStore),
        Err('counit failure'),
      ]

      for (const tga of samples) {
        const result: Store<number, Result<string, string>> = dist.dist(tga)
        const left = StoreC.extract(result) as Result<string, string>
        const right: Result<string, string> = isOk(tga)
          ? Ok(StoreC.extract(tga.value))
          : Err(tga.error)

        if (isOk(tga)) {
          expect(isOk(left)).toBe(true)
          expect(isOk(right)).toBe(true)
          if (isOk(left) && isOk(right)) {
            expect(left.value).toBe(right.value)
          }
        } else {
          expect(isErr(left)).toBe(true)
          expect(isErr(right)).toBe(true)
          if (isErr(left) && isErr(right)) {
            expect(left.error).toBe(right.error)
          }
        }
      }
    })
  })

  describe('Task × Store distributive law', () => {
    const dist = MixedDist_Task_Store<string>()

    it('distributes Task<Store> to Store<Task> correctly', async () => {
      const store: Store<string, number> = {
        pos: 'current',
        peek: (s: string) => s.length,
      }
      const task: Task<Store<string, number>> = () => Promise.resolve(store)

      const result = dist.dist(task)

      const task0 = result.peek('test')()
      const task1 = result.peek('hello')()

      expect(await task0).toBe(4)
      expect(await task1).toBe(5)
    })

    it('preserves Task semantics in each peek', async () => {
      let counter = 0
      const task: Task<Store<string, number>> = () =>
        Promise.resolve({
          pos: 'pos',
          peek: () => ++counter,
        })

      const result = dist.dist(task)

      const val1 = await result.peek('a')()
      const val2 = await result.peek('b')()

      expect(val1).toBe(1)
      expect(val2).toBe(2)
    })
  })

  describe('Lifting operations', () => {
    const defaultPos = 42
    const dist = MixedDist_Result_Store<number, string>(defaultPos)
    const typedDist = dist as unknown as MixedDistK1<'Result', 'Store'>

    it('liftMonadToGCoalgK1 works correctly', () => {
      const gamma = <A>(a: A): Store<number, A> => ({
        pos: 0,
        peek: () => a,
      })

      const lifted = liftMonadToGCoalgK1<'Result', 'Store'>(
        ResultMonadHK,
        StoreCHK,
        typedDist
      )(gamma as unknown as (a: unknown) => HK.Kind1<'Store', unknown>)

      const input: Result<string, string> = Ok('test')
      const result = lifted(input as unknown as HK.Kind1<'Result', string>) as Store<number, Result<string, string>>

      expect(result.pos).toBe(0)
      const peekResult = result.peek(0)
      expect(isOk(peekResult)).toBe(true)
      if (isOk(peekResult)) {
        expect(peekResult.value).toBe('test')
      }
    })

    it('liftComonadToTAlgK1 works correctly', () => {
      const alpha = <A>(ra: Result<string, A>): A => {
        if (isOk(ra)) return ra.value
        throw new Error(ra.error)
      }

      const lifted = liftComonadToTAlgK1<'Result', 'Store'>(
        ResultMonadHK,
        StoreCHK,
        typedDist
      )(alpha as unknown as (ta: HK.Kind1<'Result', unknown>) => unknown)

      const store: Store<number, Result<string, number>> = {
        pos: 1,
        peek: (n: number) => Ok(n * 2),
      }
      const input: Result<string, Store<number, Result<string, number>>> = Ok(store)

      const result = lifted(
        input as unknown as HK.Kind1<'Result', HK.Kind1<'Store', number>>
      ) as Store<number, number>

      expect(result.pos).toBe(1)
      const peekResult = result.peek(5)
      expect(peekResult).toBe(10)
    })
  })

  describe('Practical applications', () => {
    it('enables Store-based UI with Result error handling', () => {
      type UIState = { users: string[]; selectedIndex: number }
      type UIError = 'OUT_OF_BOUNDS' | 'EMPTY_LIST'

      const defaultState: UIState = { users: [], selectedIndex: 0 }
      const dist = MixedDist_Result_Store<UIState, UIError>(defaultState)

      const getSelectedUser = (state: UIState): Result<UIError, string> => {
        if (state.users.length === 0) return Err('EMPTY_LIST')
        if (state.selectedIndex >= state.users.length) return Err('OUT_OF_BOUNDS')
        return Ok(state.users[state.selectedIndex]!)
      }

      const computation: Result<UIError, Store<UIState, string>> = Ok({
        pos: { users: ['Alice', 'Bob'], selectedIndex: 0 },
        peek: getSelectedUser,
      } as unknown as Store<UIState, string>) as Result<UIError, Store<UIState, string>>

      const distributedStore = dist.dist(computation)

      const goodState: UIState = { users: ['Alice', 'Bob'], selectedIndex: 1 }
      const badState: UIState = { users: ['Alice'], selectedIndex: 5 }
      const emptyState: UIState = { users: [], selectedIndex: 0 }

      expect(distributedStore.peek(goodState)).toEqual(Ok(Ok('Bob')))
      expect(distributedStore.peek(badState)).toEqual(Ok(Err('OUT_OF_BOUNDS')))
      expect(distributedStore.peek(emptyState)).toEqual(Ok(Err('EMPTY_LIST')))
    })

    it('enables async Store computations with Task', async () => {
      type Config = { apiUrl: string; timeout: number }

      const dist = MixedDist_Task_Store<Config>()

      const asyncStore: Task<Store<Config, string>> = () => Promise.resolve({
        pos: { apiUrl: 'https://api.example.com', timeout: 10 },
        peek: (config: Config) => `Sync data from ${config.apiUrl}`,
      })

      const distributedStore = dist.dist(asyncStore)

      const config1: Config = { apiUrl: 'https://api1.com', timeout: 5 }
      const config2: Config = { apiUrl: 'https://api2.com', timeout: 15 }

      const result1 = await distributedStore.peek(config1)()
      const result2 = await distributedStore.peek(config2)()

      expect(result1).toBe('Sync data from https://api1.com')
      expect(result2).toBe('Sync data from https://api2.com')
    })
  })
})