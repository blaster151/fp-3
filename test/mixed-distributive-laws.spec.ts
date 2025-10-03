import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  MixedDistK1, liftMonadToGCoalgK1, liftComonadToTAlgK1,
  MixedDist_Result_Store, MixedDist_Task_Store,
  MonadK1, ComonadK1, StoreComonad, 
  Result, Store, Task, Ok, Err, isOk, isErr, mapR
} from '../allTS'

describe('Mixed Distributive Laws', () => {
  // Create a proper Result monad instance
  const ResultM = {
    map: mapR as any,
    of: Ok as any,
    chain: <A, B>(f: (a: A) => Result<any, B>) => (ra: Result<any, A>): Result<any, B> =>
      isOk(ra) ? f(ra.value) : ra as any
  }
  const StoreC = StoreComonad<number>()

  describe('Result × Store distributive law', () => {
    const defaultPos = 0
    const dist = MixedDist_Result_Store<number, string>(defaultPos)

    it('distributes Ok(store) correctly', () => {
      const store: Store<number, string> = {
        pos: 5,
        peek: (n: number) => `value-${n}`
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
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.string(),
        (pos, value) => {
          const ga: Store<number, string> = {
            pos,
            peek: (_n: number) => value
          }
          
          const left = dist.dist(ResultM.of(ga))
          const right: Store<number, Result<string, string>> = {
            pos: ga.pos,
            peek: (n: number) => Ok(ga.peek(n))
          }
          
          // Check positions match and peek values are equivalent
          return left.pos === right.pos &&
                 isOk(left.peek(pos)) && isOk(right.peek(pos)) &&
                 (left.peek(pos) as any).value === (right.peek(pos) as any).value
        }
      ))
    })

    it('satisfies counit law: C.extract(dist(tga)) = M.map(C.extract)(tga)', () => {
      fc.assert(fc.property(
        fc.oneof(
          fc.record({
            _tag: fc.constant('Ok' as const),
            value: fc.record({
              pos: fc.integer({ min: 0, max: 5 }),
              peek: fc.constant((n: number) => `test-${n}`)
            })
          }),
          fc.record({
            _tag: fc.constant('Err' as const),
            error: fc.string()
          })
        ),
        (tga: Result<string, Store<number, string>>) => {
          const result = dist.dist(tga)
          const left = StoreC.extract(result)
          const right = ResultM.map(StoreC.extract as any)(tga)
          
          if (isOk(tga) && isOk(right)) {
            return isOk(left) && left.value === right.value
          } else if (isErr(tga) && isErr(right)) {
            return isErr(left) && left.error === right.error
          }
          return false
        }
      ))
    })
  })

  describe('Task × Store distributive law', () => {
    const dist = MixedDist_Task_Store<string>()

    it('distributes Task<Store> to Store<Task> correctly', async () => {
      const store: Store<string, number> = {
        pos: 'current',
        peek: (s: string) => s.length
      }
      const task: Task<Store<string, number>> = () => Promise.resolve(store)
      
      const result = dist.dist(task)
      
      const task0 = result.peek('test')() // Tasks need to be called
      const task1 = result.peek('hello')()
      
      expect(await task0).toBe(4) // 'test'.length
      expect(await task1).toBe(5) // 'hello'.length
    })

    it('preserves Task semantics in each peek', async () => {
      let counter = 0
      const task: Task<Store<string, number>> = () => 
        Promise.resolve({
          pos: 'pos',
          peek: (_s: string) => ++counter
        })
      
      const result = dist.dist(task)
      
      // Each peek should create a new Task execution
      const val1 = await result.peek('a')() // Tasks need to be called
      const val2 = await result.peek('b')()
      
      expect(val1).toBe(1)
      expect(val2).toBe(2)
    })
  })

  describe('Lifting operations', () => {
    const defaultPos = 42
    const dist = MixedDist_Result_Store<number, string>(defaultPos)

    it('liftMonadToGCoalgK1 works correctly', () => {
      // γ : A -> Store<number, A> (constant store)
      const gamma = <A>(a: A): Store<number, A> => ({
        pos: 0,
        peek: (_n: number) => a
      })

      const lifted = liftMonadToGCoalgK1(ResultM, StoreC, dist)(gamma)
      
      const input: Result<string, string> = Ok('test')
      const result = lifted(input)
      
      expect(result.pos).toBe(0)
      expect(result.peek(0)).toEqual(Ok('test'))
    })

    it('liftComonadToTAlgK1 works correctly', () => {
      // α : Result<string, A> -> A (extract or throw)
      const alpha = <A>(ra: Result<string, A>): A => {
        if (isOk(ra)) return ra.value
        throw new Error(ra.error)
      }

      const lifted = liftComonadToTAlgK1(ResultM, StoreC, dist)(alpha)
      
      const store: Store<number, Result<string, number>> = {
        pos: 1,
        peek: (n: number) => Ok(n * 2)
      }
      const input: Result<string, Store<number, Result<string, number>>> = Ok(store)
      
      const result = lifted(input)
      
      expect(result.pos).toBe(1)
      // The result should be the extracted value, not wrapped in Ok
      expect(isOk(result.peek(5))).toBe(true)
      expect((result.peek(5) as any).value).toBe(10) // 5 * 2
    })
  })

  describe('Practical applications', () => {
    it('enables Store-based UI with Result error handling', () => {
      type UIState = { users: string[]; selectedIndex: number }
      type UIError = 'OUT_OF_BOUNDS' | 'EMPTY_LIST'
      
      const defaultState: UIState = { users: [], selectedIndex: 0 }
      const dist = MixedDist_Result_Store<UIState, UIError>(defaultState)
      
      // Simulate a computation that might fail
      const getSelectedUser = (state: UIState): Result<UIError, string> => {
        if (state.users.length === 0) return Err('EMPTY_LIST')
        if (state.selectedIndex >= state.users.length) return Err('OUT_OF_BOUNDS')
        return Ok(state.users[state.selectedIndex]!)
      }
      
      // Create a Store that computes selected user for each state
      const computation: Result<UIError, Store<UIState, string>> = Ok({
        pos: { users: ['Alice', 'Bob'], selectedIndex: 0 },
        peek: getSelectedUser
      })
      
      const distributedStore = dist.dist(computation)
      
      // Test different UI states
      const goodState: UIState = { users: ['Alice', 'Bob'], selectedIndex: 1 }
      const badState: UIState = { users: ['Alice'], selectedIndex: 5 }
      const emptyState: UIState = { users: [], selectedIndex: 0 }
      
      // The distributed store peek returns a Result<Error, Result<Error, Value>>
      expect(distributedStore.peek(goodState)).toEqual(Ok(Ok('Bob')))
      expect(distributedStore.peek(badState)).toEqual(Ok(Err('OUT_OF_BOUNDS')))
      expect(distributedStore.peek(emptyState)).toEqual(Ok(Err('EMPTY_LIST')))
    })

    it('enables async Store computations with Task', async () => {
      type Config = { apiUrl: string; timeout: number }
      
      const dist = MixedDist_Task_Store<Config>()
      
      // Simulate async computation that depends on config
      const fetchData = (config: Config): Promise<string> =>
        new Promise(resolve => 
          setTimeout(() => resolve(`Data from ${config.apiUrl}`), config.timeout)
        )
      
      const asyncStore: Task<Store<Config, string>> = () => Promise.resolve({
        pos: { apiUrl: 'https://api.example.com', timeout: 10 },
        peek: (config: Config) => `Sync data from ${config.apiUrl}`
      })
      
      const distributedStore = dist.dist(asyncStore)
      
      const config1: Config = { apiUrl: 'https://api1.com', timeout: 5 }
      const config2: Config = { apiUrl: 'https://api2.com', timeout: 15 }
      
      const result1 = await distributedStore.peek(config1)() // Call the Task
      const result2 = await distributedStore.peek(config2)()
      
      expect(result1).toBe('Sync data from https://api1.com')
      expect(result2).toBe('Sync data from https://api2.com')
    })
  })
})