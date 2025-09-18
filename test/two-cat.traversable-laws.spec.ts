import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  // core
  SimpleApplicativeK1,
  // data + traversables
  Some, None, Ok, Err, isOk, isSome, mapO, mapR,
  EitherEndo, ResultK1, TraversableEitherK1,
  TraversableOptionK1, TraversableNEAK1, NEA,
  PairEndo, TraversablePairK1, Pair,
  ConstEndo, TraversableConstK1, Const,
  // helpers
  distributePromiseK1, TraversableArrayK1, PromiseApp,
  // smart registry
  makeTraversableRegistryK1, makeSmartGetTraversableK1,
  SumEndoM, ProdEndoM, CompEndoM, PairEndoM, ConstEndoM,
  inL, inR, prod
} from '../allTS'

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// Identity applicative for laws
const Id: SimpleApplicativeK1<'Id'> = {
  of:  <A>(a: A) => ({ _id: a }),
  map: <A, B>(f: (a: A) => B) => (x: any) => ({ _id: f(x._id) }),
  ap:  <A, B>(ff: any) => (fa: any) => ({ _id: ff._id(fa._id) }),
}

describe('Traversable laws', () => {
  it('Option: identity & composition', async () => {
    fc.assert(fc.property(fc.option(fc.integer()), (m) => {
      const oa = m === null ? None : Some(m)
      const lhs = TraversableOptionK1.traverse(Id)<number, number>(x => Id.of(x))(oa)
      const rhs = Id.of(oa)
      return eq(lhs, rhs)
    }))

    // simpler Promise composition
    await fc.assert(fc.asyncProperty(fc.option(fc.integer()), async (m) => {
      const oa = m === null ? None : Some(m)
      const result = await TraversableOptionK1.traverse(PromiseApp)<number, number>(x => Promise.resolve(x + 1))(oa)
      const expected = oa._tag === 'Some' ? Some(oa.value + 1) : None
      return eq(result, expected)
    }))
  })

  it('Either<L,_>: identity', () => {
    const T = TraversableEitherK1<'e'>()
    fc.assert(fc.property(fc.oneof(fc.integer().map(Ok), fc.constant(Err<'e'>('e'))), (e) => {
      const lhs = T.traverse(Id)<number, number>(x => Id.of(x))(e as any)
      const rhs = Id.of(e)
      return eq(lhs, rhs)
    }))
  })

  it('NEA: identity & Promise composition', async () => {
    fc.assert(fc.property(fc.array(fc.integer(), { minLength: 1 }), (xs) => {
      const nea = xs as readonly [number, ...number[]]
      const lhs = TraversableNEAK1.traverse(Id)<number, number>(x => Id.of(x))(nea)
      const rhs = Id.of(nea)
      return eq(lhs, rhs)
    }))

    await fc.assert(fc.asyncProperty(fc.array(fc.integer(), { minLength: 1 }), async (xs) => {
      const nea = xs as readonly [number, ...number[]]
      const seq = distributePromiseK1(TraversableNEAK1)
      const out = await seq.app(nea.map(n => Promise.resolve(n + 1)) as any)
      expect(eq(out, nea.map(n => n + 1))).toBe(true)
    }))
  })

  it('Pair<C,_>: identity & Promise composition', async () => {
    const T7 = TraversablePairK1<7>()
    fc.assert(fc.property(fc.integer(), (n) => {
      const p = [7 as const, n] as const
      const lhs = T7.traverse(Id)<number, number>(x => Id.of(x))(p)
      const rhs = Id.of(p)
      return eq(lhs, rhs)
    }))

    const seq = distributePromiseK1(TraversablePairK1<7>())
    const out = await seq.app([7 as const, Promise.resolve(9)] as any)
    expect(eq(out, [7, 9])).toBe(true)
  })

  it('Const<C,_>: traverse ignores f', () => {
    const T = TraversableConstK1<'unit'>()
    const cx = 'unit' as any // Const<'unit', A> is just 'unit'
    const lhs = T.traverse(Id)<number, string>(() => { throw new Error('should not be called') })(cx)
    expect(eq(lhs, Id.of(cx))).toBe(true)
  })

  it('Smart registry: auto-derive Sum/Prod/Comp traversables', async () => {
    const R = makeTraversableRegistryK1()
    const getTrav = makeSmartGetTraversableK1(R)
    
    // Register base traversables
    const OptionF: EndofunctorK1<'Option'> = { map: mapO as any }
    const ResultF = ResultK1<string>()
    R.register(OptionF as any, TraversableOptionK1 as any)
    R.register(ResultF as any, TraversableEitherK1<string>() as any)
    
    // Build composite with meta (auto-derivable)
    const SumM = SumEndoM(OptionF, ResultF)
    const ProdM = ProdEndoM(OptionF, ResultF)
    const CompM = CompEndoM(OptionF, ResultF) // Option ∘ Result
    
    // Smart lookup should derive and cache
    const TSumM = getTrav(SumM)
    const TProdM = getTrav(ProdM)
    const TCompM = getTrav(CompM)
    
    expect(TSumM).toBeDefined()
    expect(TProdM).toBeDefined()
    expect(TCompM).toBeDefined()
    
    // Test that they work with Promise distribution
    const sumVal = inL<'Option', ['Result', 'string'], number>(Some(Promise.resolve(42)))
    const sumSeq = distributePromiseK1(TSumM!)
    const sumResult = await sumSeq.app(sumVal)
    expect(eq(sumResult, inL<'Option', ['Result', 'string'], number>(Some(42)))).toBe(true)
    
    const prodVal = prod<'Option', ['Result', 'string'], number>(Some(Promise.resolve(10)), Ok(Promise.resolve(20)))
    const prodSeq = distributePromiseK1(TProdM!)
    const prodResult = await prodSeq.app(prodVal)
    expect(eq((prodResult as any).left, Some(10))).toBe(true)
    expect(eq((prodResult as any).right, Ok(20))).toBe(true)
    
    // Comp: Option<Result<string, Promise<number>>> -> Promise<Option<Result<string, number>>>
    const compVal = Some(Ok(Promise.resolve(5)))
    const compSeq = distributePromiseK1(TCompM!)
    const compResult = await compSeq.app(compVal)
    expect(eq(compResult, Some(Ok(5)))).toBe(true)
  })

  it('Smart registry: Pair and Const auto-derivation', () => {
    const R = makeTraversableRegistryK1()
    const getTrav = makeSmartGetTraversableK1(R)
    
    // Build with meta
    const PairM = PairEndoM<'tag'>('tag')
    const ConstM = ConstEndoM<'value'>('value')
    
    // Should auto-derive
    const TPairM = getTrav(PairM)
    const TConstM = getTrav(ConstM)
    
    expect(TPairM).toBeDefined()
    expect(TConstM).toBeDefined()
    
    // Test Pair traversal
    const pairVal = ['tag' as const, 42] as const
    const pairResult = TPairM!.traverse(Id)<number, number>(x => Id.of(x + 1))(pairVal)
    expect(eq(pairResult, Id.of(['tag', 43] as const))).toBe(true)
    
    // Test Const traversal (should ignore function)
    const constVal = 'value'
    const constResult = TConstM!.traverse(Id)<number, string>(() => { throw new Error('should not call') })(constVal)
    expect(eq(constResult, Id.of('value'))).toBe(true)
  })
})