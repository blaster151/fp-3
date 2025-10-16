import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  // functors & data
  Some, None, Ok, Err, isOk, isSome, mapO, mapR,
  EitherEndo, ResultK1,
  PairEndo,
  SumEndo, inL, inR,
  ProdEndo, prod,
  TraversableArrayK1, PromiseApp,
  // new registry glue
  makeTraversableRegistryK1,
  TraversableOptionK1, TraversableEitherK1,
  TraversablePairK1, TraversableConstK1,
  deriveTraversableSumK1, deriveTraversableProdK1, deriveTraversableCompK1,
  registerEitherTraversable, registerPairTraversable, registerConstTraversable,
  registerSumDerived, registerProdDerived, registerCompDerived,
  distributePromiseK1,
  // alignment
  buildNatForTerms, BaseT, SumT, ProdT, idNatK1,
  EndoTermAlignError
} from '../allTS'
import type {
  EndofunctorK1,
  EndofunctorValue,
  SimpleApplicativeK1,
  EndoDict,
  ProdVal
} from '../allTS'

// util: JSON equality
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// A tiny Identity applicative for Traversable laws
const IdApp: SimpleApplicativeK1<'Id'> = {
  of:  <A>(a: A) => ({ _id: a }),
  map: <A, B>(f: (a: A) => B) => (gx: { _id: A }) => ({ _id: f(gx._id) }),
  ap:  <A, B>(gf: { _id: (a: A) => B }) => (ga: { _id: A }) => ({ _id: gf._id(ga._id) }),
}

// Compose applicative (Composition of two applicatives)
const ComposeApp = <G, H>(G: SimpleApplicativeK1<G>, H: SimpleApplicativeK1<H>): SimpleApplicativeK1<['Compose', G, H]> => ({
  of:  <A>(a: A) => G.of(H.of(a)),
  map: <A, B>(f: (a: A) => B) => (gha: EndofunctorValue<['Compose', G, H], A>) => {
    const viewed = gha as EndofunctorValue<G, EndofunctorValue<H, A>>
    const mapped = G.map(H.map(f))(viewed)
    return mapped as unknown as EndofunctorValue<['Compose', G, H], B>
  },
  ap:  <A, B>(ghf: EndofunctorValue<['Compose', G, H], (a: A) => B>) =>
    (gha: EndofunctorValue<['Compose', G, H], A>) => {
      const viewedF = ghf as EndofunctorValue<G, EndofunctorValue<H, (a: A) => B>>
      const viewedA = gha as EndofunctorValue<G, EndofunctorValue<H, A>>
      const lifted = G.map((hf: EndofunctorValue<H, (a: A) => B>) => H.ap(hf))(viewedF)
      const applied = G.ap(lifted)(viewedA)
      return applied as unknown as EndofunctorValue<['Compose', G, H], B>
    },
})

describe('Traversable registry + laws', () => {
  it('registry lookup drives Promise-postcompose for Array & Option', async () => {
    const R = makeTraversableRegistryK1()
    // register core traversables
    const OptionF: EndofunctorK1<'Option'> = { map: mapO }
    R.register(OptionF, TraversableOptionK1)

    // shape: Promise< Array< Promise<Option<number>> > >
    const nested = Promise.resolve([Promise.resolve(Some(1)), Promise.resolve(Some(2))])

    // Sequence via distributive law explicitly:
    const seqArr = distributePromiseK1(TraversableArrayK1)
    const explicit = await seqArr.app(await nested)
    const isOptionArray = (value: unknown): value is ReadonlyArray<ReturnType<typeof Some>> =>
      Array.isArray(value) && value.every((opt) => typeof opt === 'object' && opt !== null && '_tag' in opt)

    if (!isOptionArray(explicit)) {
      throw new Error('Expected an array of Option values from distributePromiseK1(Array)')
    }

    // Check the result has the expected structure
    expect(explicit).toHaveLength(2)
    if (explicit.length < 2) {
      throw new Error('Expected two Option results')
    }
    const [first, second] = explicit as [ReturnType<typeof Some>, ReturnType<typeof Some>]
    expect(first._tag).toBe('Some')
    expect(second._tag).toBe('Some')
  })

  it('Option Traversable: identity law', () => {
    fc.assert(fc.property(fc.option(fc.integer()), (m) => {
      const oa = m === null ? None : Some(m)
      const left  = TraversableOptionK1.traverse(IdApp)<number, number>(x => IdApp.of(x))(oa)
      const right = IdApp.of(oa)
      return eq(left, right)
    }))
  })

  it('Option Traversable: simple composition with Promise', async () => {
    await fc.assert(fc.asyncProperty(fc.option(fc.integer()), async (m) => {
      const oa = m === null ? None : Some(m)
      const result = await TraversableOptionK1.traverse(PromiseApp)<number, number>((x) => Promise.resolve(x + 1))(oa)
      
      const expected = oa._tag === 'Some' ? Some(oa.value + 1) : None
      return eq(result, expected)
    }))
  })

  it('Derived Sum/Prod/Comp traversables obey traverse shapes', async () => {
    const OptionF: EndofunctorK1<'Option'> = { map: mapO }
    type EitherString = ['Either', string]
    const ResultF = ResultK1<string>()
    const TF = TraversableOptionK1
    const TG = TraversableEitherK1<string>()
    const TS = deriveTraversableSumK1(TF, TG)
    const TP = deriveTraversableProdK1(TF, TG)
    const TC = deriveTraversableCompK1(TF, TG)

    // Sum
    const sL = await TS.traverse(PromiseApp)<number, number>(n => Promise.resolve(n + 1))(
      inL<'Option', EitherString, number>(Some(1)),
    )
    const sR = await TS.traverse(PromiseApp)<number, number>(n => Promise.resolve(n + 1))(
      inR<'Option', EitherString, number>(ResultF.of<number>(2)),
    )
    expect(eq(sL, inL<'Option', EitherString, number>(Some(2)))).toBe(true)
    expect(eq(sR, inR<'Option', EitherString, number>(Ok(3)))).toBe(true)

    // Prod
    const p0 = prod<'Option', EitherString, number>(Some(4), ResultF.of<number>(5))
    const p1: ProdVal<'Option', EitherString, number> =
      await TP.traverse(PromiseApp)<number, number>((n) => Promise.resolve(n * 2))(p0)
    const { left, right } = p1
    expect(eq(left, Some(8))).toBe(true)
    expect(eq(right, Ok(10))).toBe(true)

    // Comp: Option∘Either (Option of Result)
    const compVal: EndofunctorValue<['Comp', 'Option', EitherString], number> = Some(Ok(7))
    const c1 = await TC.traverse(PromiseApp)<number, number>(n => Promise.resolve(n - 1))(compVal)
    expect(eq(c1, Some(Ok(6)))).toBe(true)
  })

  it('Registry: register parameterized & derived functors then use them', async () => {
    const R = makeTraversableRegistryK1()
    // base
    const OptionF: EndofunctorK1<'Option'> = { map: mapO }
    R.register(OptionF, TraversableOptionK1)
    const EitherE = registerEitherTraversable<string>(R)
    const Pair7   = registerPairTraversable<7>(R)

    // derived
    const SumEO   = registerSumDerived(R, EitherE, OptionF)
    const Prod7O  = registerProdDerived(R, Pair7, OptionF)
    const CompEO  = registerCompDerived(R, EitherE, OptionF)

    // check we can sequence Promise through each via registry lookups
    const seq = <F, A>(F: EndofunctorK1<F>, value: EndofunctorValue<['Comp', F, 'Promise'], A>) => {
      const traversable = R.get(F)
      if (!traversable) {
        throw new Error('Traversable instance not registered')
      }
      return distributePromiseK1(traversable).app(value)
    }

    // Sum<Either,Option>
    const sVal = inR<['Either', string], 'Option', Promise<number>>(Some(Promise.resolve(10)))
    const sOut = await seq(SumEO, sVal)
    expect(eq(sOut, inR<['Either', string], 'Option', number>(Some(10)))).toBe(true)

    // Prod<Pair7,Option>
    const pairPromise: EndofunctorValue<['Pair', 7], Promise<number>> =
      [7 as const, Promise.resolve(1)] as const
    const optionPromise: EndofunctorValue<'Option', Promise<number>> = Some(Promise.resolve(2))
    const pVal = prod<['Pair', 7], 'Option', Promise<number>>(pairPromise, optionPromise)
    const pOut = await seq(Prod7O, pVal)
    const { left: pairResult, right: optionResult } = pOut
    expect(eq(pairResult, [7, 1] as const)).toBe(true)
    expect(eq(optionResult, Some(2))).toBe(true)

    // Comp<Either,Option>  ~ Either<Option<_>>
    const cVal = Ok(Some(Promise.resolve(5)))
    const cOut = await seq(CompEO, cVal)
    expect(eq(cOut, Ok(Some(5)))).toBe(true)
  })

  it('buildNatForTerms: align matching structures', () => {
    type Bases = 'Option' | 'Either'
    const OptionF: EndofunctorK1<'Option'> = { map: mapO }
    const EitherF = EitherEndo<string>()
    
    const dict: EndoDict<Bases> = { 
      'Option': OptionF, 
      'Either': EitherF 
    }
    
    const baseId = (l: Bases, r: Bases) => (l === r ? idNatK1() : null)
    
    // Same structure: Option ⊕ Either
    const t1 = SumT(BaseT<Bases>('Option'), BaseT<Bases>('Either'))
    const t2 = SumT(BaseT<Bases>('Option'), BaseT<Bases>('Either'))
    
    const { from, to, nat } = buildNatForTerms(dict, dict, baseId)(t1, t2)
    
    expect(from).toBeDefined()
    expect(to).toBeDefined()
    expect(nat).toBeDefined()
    
    // Test the natural transformation works
    const testVal = inL<'Option', 'Either', number>(Some(42))
    const result = nat.app<number>(testVal)
    expect(eq(result, testVal)).toBe(true)
  })

  it('buildNatForTerms: throws on mismatched structures', () => {
    type Bases = 'Option'
    const OptionF: EndofunctorK1<'Option'> = { map: mapO }
    const dict: EndoDict<Bases> = { 'Option': OptionF }
    const baseId = (l: Bases, r: Bases) => idNatK1()
    
    const t1 = SumT(BaseT<Bases>('Option'), BaseT<Bases>('Option'))  // Sum
    const t2 = ProdT(BaseT<Bases>('Option'), BaseT<Bases>('Option')) // Prod
    
    expect(() => {
      buildNatForTerms(dict, dict, baseId)(t1, t2)
    }).toThrow(EndoTermAlignError)
  })
})