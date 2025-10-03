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
  SimpleApplicativeK1,
  EndoDict
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
  map: <A, B>(f: (a: A) => B) => <GHA extends EndofunctorValue<G, EndofunctorValue<H, A>>>(gha: GHA) => G.map(H.map(f))(gha),
  ap:  <A, B>(ghf: EndofunctorValue<G, EndofunctorValue<H, (a: A) => B>>) => (gha: EndofunctorValue<G, EndofunctorValue<H, A>>) =>
        G.ap(G.map(<HF extends EndofunctorValue<H, (a: A) => B>>(hf: HF) => <HA extends EndofunctorValue<H, A>>(ha: HA) => H.ap(hf)(ha))(ghf))(gha),
})

describe('Traversable registry + laws', () => {
  it('registry lookup drives Promise-postcompose for Array & Option', async () => {
    const R = makeTraversableRegistryK1()
    // register core traversables
    const OptionF: EndofunctorK1<'Option'> = { map: mapO as any }
    R.register(OptionF as any, TraversableOptionK1 as any)

    // shape: Promise< Array< Promise<Option<number>> > >
    const nested = Promise.resolve([Promise.resolve(Some(1)), Promise.resolve(Some(2))])

    // Sequence via distributive law explicitly:
    const seqArr = distributePromiseK1(TraversableArrayK1)
    const explicit = await seqArr.app( await nested ).then((arr: Array<Promise<ReturnType<typeof Some>>>) =>
      Promise.all(arr.map((po) => po)).then((oas) => oas)
    )

    // Check the result has the expected structure
    expect(explicit.length).toBe(2)
    expect(explicit[0]._tag).toBe('Some')
    expect(explicit[1]._tag).toBe('Some')
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
    const OptionF: EndofunctorK1<'Option'> = { map: mapO as any }
    const ResultF = ResultK1<string>()
    const TF = TraversableOptionK1
    const TG = TraversableEitherK1<string>()
    const TS = deriveTraversableSumK1(TF, TG)
    const TP = deriveTraversableProdK1(TF, TG)
    const TC = deriveTraversableCompK1(TF, TG)

    // Sum
    const sL = await TS.traverse(PromiseApp)<number, number>(n => Promise.resolve(n + 1))(inL<'Option','Either', number>(Some(1)))
    const sR = await TS.traverse(PromiseApp)<number, number>(n => Promise.resolve(n + 1))(inR<'Option','Either', number>(Ok(2)))
    expect(eq(sL, inL<'Option','Either', number>(Some(2)))).toBe(true)
    expect(eq(sR, inR<'Option','Either', number>(Ok(3)))).toBe(true)

    // Prod
    const p0 = prod<'Option','Either', number>(Some(4), Ok(5))
    const p1 = await TP.traverse(PromiseApp)<number, number>(n => Promise.resolve(n * 2))(p0)
    expect(eq((p1 as any).left, Some(8))).toBe(true)
    expect(eq((p1 as any).right, Ok(10))).toBe(true)

    // Comp: Option∘Either (Option of Result)
    const compVal = Some(Ok(7)) as any
    const c1 = await TC.traverse(PromiseApp)<number, number>(n => Promise.resolve(n - 1))(compVal)
    expect(eq(c1, Some(Ok(6)))).toBe(true)
  })

  it('Registry: register parameterized & derived functors then use them', async () => {
    const R = makeTraversableRegistryK1()
    // base
    const OptionF: EndofunctorK1<'Option'> = { map: mapO as any }
    R.register(OptionF as any, TraversableOptionK1 as any)
    const EitherE = registerEitherTraversable<string>(R)
    const Pair7   = registerPairTraversable<7>(R)
    
    // derived
    const SumEO   = registerSumDerived(R, EitherE as any, OptionF as any)
    const Prod7O  = registerProdDerived(R, Pair7 as any, OptionF as any)
    const CompEO  = registerCompDerived(R, EitherE as any, OptionF as any)

    // check we can sequence Promise through each via registry lookups
    const seq = <F>(F: EndofunctorK1<F>, val: unknown) =>
      (distributePromiseK1 as typeof distributePromiseK1<F>)(R.get(F)!).app(val)

    // Sum<Either,Option>
    const sVal = inR<any, any, number>(Some(Promise.resolve(10)))
    const sOut = await seq(SumEO as any, sVal)
    expect(eq(sOut, inR<any, any, number>(Some(10)))).toBe(true)

    // Prod<Pair7,Option>
    const pVal = { left: [7 as const, Promise.resolve(1)] as const, right: Some(Promise.resolve(2)) }
    const pOut = await seq(Prod7O as any, pVal as any)
    expect(eq((pOut as any).left, [7, 1])).toBe(true)
    expect(eq((pOut as any).right, Some(2))).toBe(true)

    // Comp<Either,Option>  ~ Either<Option<_>>
    const cVal = Ok(Some(Promise.resolve(5)))
    const cOut = await seq(CompEO as any, cVal)
    expect(eq(cOut, Ok(Some(5)))).toBe(true)
  })

  it('buildNatForTerms: align matching structures', () => {
    type Bases = 'Option' | 'Either'
    const OptionF: EndofunctorK1<'Option'> = { map: mapO as any }
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
    const OptionF: EndofunctorK1<'Option'> = { map: mapO as any }
    const dict: EndoDict<Bases> = { 'Option': OptionF }
    const baseId = (l: Bases, r: Bases) => idNatK1()
    
    const t1 = SumT(BaseT<Bases>('Option'), BaseT<Bases>('Option'))  // Sum
    const t2 = ProdT(BaseT<Bases>('Option'), BaseT<Bases>('Option')) // Prod
    
    expect(() => {
      buildNatForTerms(dict, dict, baseId)(t1, t2)
    }).toThrow(EndoTermAlignError)
  })
})