import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import type { Arbitrary } from 'fast-check'
import {
  Some, None, Ok, Err, isOk, isSome, mapO, mapR,
  EitherEndo, ResultK1, TraversableEitherK1,
  TraversableOptionK1, TraversableNEAK1,
  PairEndo, TraversablePairK1,
  ConstEndo, TraversableConstK1,
  distributePromiseK1, PromiseApp,
  makeTraversableRegistryK1, makeSmartGetTraversableK1,
  SumEndoM, ProdEndoM, CompEndoM, PairEndoM, ConstEndoM,
  inL, inR, prod
} from '../allTS'
import type { SimpleApplicativeK1, EndofunctorK1, NEA, Result, TraversableK1 } from '../allTS'

const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const toNEA = <A>(xs: readonly A[]): readonly [A, ...A[]] => {
  if (xs.length === 0) {
    throw new Error('Expected non-empty array for NEA')
  }
  const [head, ...tail] = xs
  return [head, ...tail] as readonly [A, ...A[]]
}

// Identity applicative for laws
type IdBox<A> = { readonly _id: A }

const Id: SimpleApplicativeK1<'Id'> = {
  of:  <A>(a: A): IdBox<A> => ({ _id: a }),
  map: <A, B>(f: (a: A) => B) => (x: IdBox<A>): IdBox<B> => ({ _id: f(x._id) }),
  ap:  <A, B>(ff: IdBox<(a: A) => B>) => (fa: IdBox<A>): IdBox<B> => ({ _id: ff._id(fa._id) }),
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
      const T: TraversableK1<['Either', 'e']> = TraversableEitherK1<'e'>()
      const traverseEither: <A, B>(
        f: (a: A) => IdBox<B>
      ) => (e: Result<'e', A>) => IdBox<Result<'e', B>> = T.traverse(Id)
      const applyTraverse = traverseEither((x: number) => Id.of(x))

      const integerArb: Arbitrary<number> = fc.integer()
      if (integerArb.map === undefined) {
        throw new Error('fast-check Arbitrary.map should always be available')
      }
      const okArb = integerArb.map((n) => Ok(n) as Result<'e', number>)
      const eitherArb = fc.oneof(okArb, fc.constant(Err<'e'>('e') as Result<'e', number>))

      fc.assert(
        fc.property(eitherArb, (e) => {
          const lhs = applyTraverse(e)
          const rhs = Id.of(e)
          return eq(lhs, rhs)
        })
      )
    })

  it('NEA: identity & Promise composition', async () => {
    fc.assert(fc.property(fc.array(fc.integer(), { minLength: 1 }), (xs) => {
      const nea = toNEA(xs)
      const lhs = TraversableNEAK1.traverse(Id)<number, number>(x => Id.of(x))(nea)
      const rhs = Id.of(nea)
      return eq(lhs, rhs)
    }))

    await fc.assert(fc.asyncProperty(fc.array(fc.integer(), { minLength: 1 }), async (xs) => {
      const nea = toNEA(xs)
      const [head, ...tail] = nea
      const promises = [
        Promise.resolve(head + 1),
        ...tail.map((n) => Promise.resolve(n + 1)),
      ] as NEA<Promise<number>>
      const seq = distributePromiseK1(TraversableNEAK1)
      const out = await seq.app(promises)
      expect(eq(out, nea.map((n) => n + 1))).toBe(true)
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
    const out = await seq.app([7 as const, Promise.resolve(9)] as const)
    expect(eq(out, [7, 9])).toBe(true)
  })

  it('Const<C,_>: traverse ignores f', () => {
    const T = TraversableConstK1<'unit'>()
    const cx = 'unit' as const // Const<'unit', A> is just 'unit'
    const lhs = T.traverse(Id)<number, string>(() => { throw new Error('should not be called') })(cx)
    expect(eq(lhs, Id.of(cx))).toBe(true)
  })

  it('Smart registry: auto-derive Sum/Prod/Comp traversables', async () => {
    const R = makeTraversableRegistryK1()
    const getTrav = makeSmartGetTraversableK1(R)
    const meta = R.metadata
    
    // Register base traversables
    const OptionF: EndofunctorK1<'Option'> = { map: mapO }
    const ResultF: ReturnType<typeof ResultK1<string>> = ResultK1<string>()
    R.register(OptionF, TraversableOptionK1)
    R.register(ResultF, TraversableEitherK1<string>())
    
    // Build composite with meta (auto-derivable)
    const SumM = SumEndoM(meta)(OptionF, ResultF)
    const ProdM = ProdEndoM(meta)(OptionF, ResultF)
    const CompM = CompEndoM(meta)(OptionF, ResultF) // Option ∘ Result
    
    // Smart lookup should derive and cache
    const TSumM = getTrav(SumM)
    const TProdM = getTrav(ProdM)
    const TCompM = getTrav(CompM)
    
    expect(TSumM).toBeDefined()
    expect(TProdM).toBeDefined()
    expect(TCompM).toBeDefined()
    
    // Test that they work with Promise distribution
    const sumVal = inL<'Option', ['Either', string], Promise<number>>(Some(Promise.resolve(42)))
    const sumSeq = distributePromiseK1(TSumM!)
    const sumResult = await sumSeq.app(sumVal)
    expect(eq(sumResult, inL<'Option', ['Either', string], number>(Some(42)))).toBe(true)

    const prodVal = prod<'Option', ['Either', string], Promise<number>>(Some(Promise.resolve(10)), ResultF.of(Promise.resolve(20)))
    const prodSeq = distributePromiseK1(TProdM!)
    const prodResult = await prodSeq.app(prodVal)
    expect(eq(prodResult.left, Some(10))).toBe(true)
    expect(eq(prodResult.right, Ok(20))).toBe(true)

    // Comp: Option<Result<string, Promise<number>>> -> Promise<Option<Result<string, number>>>
    const compVal = Some(ResultF.of(Promise.resolve(5)))
    const compSeq = distributePromiseK1(TCompM!)
    const compResult = await compSeq.app(compVal)
    expect(eq(compResult, Some(Ok(5)))).toBe(true)
  })

  it('Smart registry: Pair and Const auto-derivation', () => {
    const R = makeTraversableRegistryK1()
    const getTrav = makeSmartGetTraversableK1(R)
    const meta = R.metadata

    // Build with meta
    const PairM = PairEndoM(meta)<'tag'>('tag')
    const ConstM = ConstEndoM(meta)<'value'>('value')
    
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