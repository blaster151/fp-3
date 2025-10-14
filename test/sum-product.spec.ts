import { describe, it, expect } from 'vitest'
import {
  Some, None, Err, isOk, isSome, mapO,
  ResultK1,
  SumEndo, inL, inR, strengthEnvFromSum, matchSum,
  ProdEndo, prod, strengthEnvFromProd,
  strengthEnvOption, strengthEnvResult,
} from '../allTS'
import type {
  EndofunctorK1,
  SumVal,
  ProdVal,
  Env,
  Result
} from '../allTS'

type OptionTag = 'Option'
type ResultTag = ['Either', string]
type ResultValue<A> = Result<string, A>

const extractSumLeft = <F, G, A>(value: SumVal<F, G, A>) => {
  if (value._sum !== 'L') {
    throw new Error('Expected left sum value during test execution')
  }
  return value.left
}

const extractSumRight = <F, G, A>(value: SumVal<F, G, A>) => {
  if (value._sum !== 'R') {
    throw new Error('Expected right sum value during test execution')
  }
  return value.right
}

describe('Sum Endofunctor (F ⊕ G)', () => {
  const OptionF: EndofunctorK1<OptionTag> = { map: mapO as any }
  const ResultF = ResultK1<string>()
  const SumFG = SumEndo(OptionF, ResultF)

  describe('construction', () => {
    it('should create left values with inL', () => {
      const leftVal = inL<OptionTag, ResultTag, number>(Some(42))
      
      expect(leftVal._sum).toBe('L')
      expect(extractSumLeft(leftVal)).toEqual({ _tag: 'Some', value: 42 })
    })

    it('should create right values with inR', () => {
      const rightVal = inR<OptionTag, ResultTag, number>(ResultF.of(24))
      
      expect(rightVal._sum).toBe('R')
      expect(extractSumRight(rightVal)).toEqual({ _tag: 'Ok', value: 24 })
    })
  })

  describe('functor laws', () => {
    const leftVal: SumVal<OptionTag, ResultTag, number> = inL<OptionTag, ResultTag, number>(Some(10))
    const rightVal: SumVal<OptionTag, ResultTag, number> = inR<OptionTag, ResultTag, number>(ResultF.of(20))

    it('should satisfy identity law', () => {
      const id = <A>(a: A) => a
      
      expect(SumFG.map(id)(leftVal)).toEqual(leftVal)
      expect(SumFG.map(id)(rightVal)).toEqual(rightVal)
    })

    it('should satisfy composition law', () => {
      const f = (n: number) => n + 1
      const g = (n: number) => n * 2
      const composed = (n: number) => g(f(n))

      const leftMapped1 = SumFG.map(composed)(leftVal)
      const leftMapped2 = SumFG.map(g)(SumFG.map(f)(leftVal))
      expect(leftMapped1).toEqual(leftMapped2)

      const rightMapped1 = SumFG.map(composed)(rightVal)
      const rightMapped2 = SumFG.map(g)(SumFG.map(f)(rightVal))
      expect(rightMapped1).toEqual(rightMapped2)
    })

    it('should map over left branch correctly', () => {
      const mapped = SumFG.map((n: number) => n * 2)(leftVal)
      
      expect(mapped._sum).toBe('L')
      expect(extractSumLeft(mapped)).toEqual({ _tag: 'Some', value: 20 })
    })

    it('should map over right branch correctly', () => {
      const mapped = SumFG.map((n: number) => n + 5)(rightVal)
      
      expect(mapped._sum).toBe('R')
      expect(extractSumRight(mapped)).toEqual({ _tag: 'Ok', value: 25 })
    })
  })

  describe('matchSum case analysis', () => {
    const leftVal: SumVal<OptionTag, ResultTag, number> = inL<OptionTag, ResultTag, number>(Some(42))
    const rightVal: SumVal<OptionTag, ResultTag, number> = inR<OptionTag, ResultTag, number>(ResultF.of(24))
    const rightErr: SumVal<OptionTag, ResultTag, number> = inR<OptionTag, ResultTag, number>(Err<string>('error'))

    const analyze = matchSum<OptionTag, ResultTag, number, string>(
      (optVal) => isSome(optVal) ? `Option: ${optVal.value}` : 'Option: None',
      (resVal) => {
        const result = resVal as ResultValue<number>
        return isOk(result) ? `Result: ${result.value}` : `Error: ${result.error}`
      }
    )

    it('should handle left values', () => {
      expect(analyze(leftVal)).toBe('Option: 42')
    })

    it('should handle right success values', () => {
      expect(analyze(rightVal)).toBe('Result: 24')
    })

    it('should handle right error values', () => {
      expect(analyze(rightErr)).toBe('Error: error')
    })
  })

  describe('strength operations', () => {
    const sOption = strengthEnvOption<string>()
    const sResult = strengthEnvResult<string, string>('default-env')
    const sSum = strengthEnvFromSum<string>()(sOption, sResult)

    it('should push environment through left branch', () => {
      const envSum: SumVal<OptionTag, ResultTag, Env<string, number>> = inL<OptionTag, ResultTag, Env<string, number>>(
        Some(['test-env', 100] as const)
      )

      const [env, sumVal] = sSum.st<number>(envSum)

      expect(env).toBe('test-env')
      expect(sumVal._sum).toBe('L')
      expect(extractSumLeft(sumVal)).toEqual({ _tag: 'Some', value: 100 })
    })

    it('should push environment through right branch', () => {
      const envSum: SumVal<OptionTag, ResultTag, Env<string, number>> = inR<OptionTag, ResultTag, Env<string, number>>(
        ResultF.of(['context', 200] as const)
      )

      const [env, sumVal] = sSum.st<number>(envSum)

      expect(env).toBe('context')
      expect(sumVal._sum).toBe('R')
      expect(extractSumRight(sumVal)).toEqual({ _tag: 'Ok', value: 200 })
    })
  })
})

describe('Product Endofunctor (F ⊗ G)', () => {
  const OptionF: EndofunctorK1<OptionTag> = { map: mapO as any }
  const ResultF = ResultK1<string>()
  const ProdFG = ProdEndo(OptionF, ResultF)

  describe('construction', () => {
    it('should create product values with prod', () => {
    const productVal = prod<OptionTag, ResultTag, number>(Some(10), ResultF.of(20))
      
      expect(productVal.left).toEqual({ _tag: 'Some', value: 10 })
      expect(productVal.right).toEqual({ _tag: 'Ok', value: 20 })
    })
  })

  describe('functor laws', () => {
    const productVal = prod<OptionTag, ResultTag, number>(Some(5), ResultF.of(15))

    it('should satisfy identity law', () => {
      const id = <A>(a: A) => a
      
      expect(ProdFG.map(id)(productVal)).toEqual(productVal)
    })

    it('should satisfy composition law', () => {
      const f = (n: number) => n + 1
      const g = (n: number) => n * 2
      const composed = (n: number) => g(f(n))

      const mapped1 = ProdFG.map(composed)(productVal)
      const mapped2 = ProdFG.map(g)(ProdFG.map(f)(productVal))
      
      expect(mapped1).toEqual(mapped2)
    })

    it('should map over both components', () => {
      const mapped = ProdFG.map((n: number) => n * 3)(productVal)
      
      expect(mapped.left).toEqual({ _tag: 'Some', value: 15 })
      expect(mapped.right).toEqual({ _tag: 'Ok', value: 45 })
    })
  })

  describe('strength operations', () => {
    const sOption = strengthEnvOption<string>()
    const sResult = strengthEnvResult<string, string>('default-env')
    const sProd = strengthEnvFromProd<string>()(sOption, sResult)

    it('should push environment through product components', () => {
      const envProd = prod<OptionTag, ResultTag, Env<string, number>>(
        Some(['shared-env', 50] as const),
        ResultF.of(['shared-env', 75] as const)
      )

      const [env, prodVal] = sProd.st<number>(envProd)
      
      // Takes environment from left component (by design)
      expect(env).toBe('shared-env')
      expect(prodVal.left).toEqual({ _tag: 'Some', value: 50 })
      expect(prodVal.right).toEqual({ _tag: 'Ok', value: 75 })
    })

    it('should handle None in left component', () => {
      const envProd = prod<OptionTag, ResultTag, Env<string, number>>(
        None,
        ResultF.of(['context', 100] as const)
      )

      const [env, prodVal] = sProd.st<number>(envProd)
      
      // Note: strengthEnvOption returns undefined for None, but we cast it
      expect(prodVal.left).toEqual({ _tag: 'None' })
      expect(prodVal.right).toEqual({ _tag: 'Ok', value: 100 })
    })

    it('should handle error in right component', () => {
      const envProd = prod<OptionTag, ResultTag, Env<string, number>>(
        Some(['env1', 25] as const),
        Err('test-error')
      )

      const [env, prodVal] = sProd.st<number>(envProd)
      
      expect(env).toBe('env1')
      expect(prodVal.left).toEqual({ _tag: 'Some', value: 25 })
      expect(prodVal.right).toEqual({ _tag: 'Err', error: 'test-error' })
    })
  })
})

describe('Sum and Product Integration', () => {
  it('should work together in complex scenarios', () => {
    const OptionF: EndofunctorK1<OptionTag> = { map: mapO as any }
    const ResultF = ResultK1<string>()

    // Create a Sum of Products: (Option ⊗ Result) ⊕ (Option ⊗ Result)
    const ProdFG = ProdEndo(OptionF, ResultF)
    const SumOfProds = SumEndo(ProdFG, ProdFG)

    const leftProd = prod<OptionTag, ResultTag, number>(Some(10), ResultF.of(20))
    const rightProd = prod<OptionTag, ResultTag, number>(None, Err('error'))

    const sumLeftValue = inL<typeof ProdFG, typeof ProdFG, number>(leftProd)
    const sumRightValue = inR<typeof ProdFG, typeof ProdFG, number>(rightProd)

    // Map over the complex structure
    const mappedLeft = SumOfProds.map((n: number) => n + 100)(sumLeftValue)
    const mappedRight = SumOfProds.map((n: number) => n + 100)(sumRightValue)

    expect(mappedLeft._sum).toBe('L')
    const mappedLeftProd = extractSumLeft(mappedLeft) as ProdVal<OptionTag, ResultTag, number>
    expect(mappedLeftProd.left).toEqual({ _tag: 'Some', value: 110 })
    expect(mappedLeftProd.right).toEqual({ _tag: 'Ok', value: 120 })

    expect(mappedRight._sum).toBe('R')
    const mappedRightProd = extractSumRight(mappedRight) as ProdVal<OptionTag, ResultTag, number>
    expect(mappedRightProd.left).toEqual({ _tag: 'None' })
    expect(mappedRightProd.right).toEqual({ _tag: 'Err', error: 'error' })
  })
})