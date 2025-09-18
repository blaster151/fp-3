// two-cat.laws.ts
/* eslint-disable @typescript-eslint/no-floating-promises */
import fc from 'fast-check'
import {
  EndofunctorK1, NatK1, IdK1, composeEndoK1, idNatK1,
  makePostcomposeReader2, ReaderEndo, Reader,
  makePrecomposeEnv2, EnvEndo, Env,
  OptionEndo, Some, None, strengthEnvFromOption,
  EitherEndo, Left, Right, strengthEnvFromEither,
  PairEndo, strengthEnvFromPair, strengthEnvCompose,
} from './two-cat'

// ---------- helpers ----------
const eqJSON = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const ReaderOf = <R, A>(a: A): Reader<R, A> => (_: R) => a

// simple endofunctor instances for tests
const F_Option: EndofunctorK1<'Option'> = OptionEndo
const G_Either = <L extends string>(): EndofunctorK1<['Either', L]> => EitherEndo<L>()
const P_Pair = <C extends number>() => PairEndo<C>()

// identity NT for any endofunctor (structural)
const idNT = <F>(): NatK1<F, F> => ({ app: <A>(fa: any) => fa })

// ---------- LAX: PostcomposeReader laws ----------
async function testLaxPostcomposeReader() {
  type R = number
  const U = makePostcomposeReader2<R>()

  // Naturality of on2
  fc.assert(fc.property(
    fc.oneof(fc.constant(None), fc.integer().map(n => Some(n))),
    fc.func(fc.integer()),
    (oa, f) => {
      // α: Option ⇒ Option (map f)
      const α: NatK1<'Option', 'Option'> = { app: <A>(fa: any) => OptionEndo.map(f as any)(fa) }
      const rfa: Reader<R, any> = ReaderOf<R, any>(oa)
      const left  = U.on2(α).app<number>(rfa)(0)
      const right = α.app<number>(rfa(0))
      return eqJSON(left, right)
    }))

  // μ shape equals "evaluate inner Reader at same env"
  fc.assert(fc.property(
    fc.func(fc.oneof(fc.constant(None), fc.integer().map(n => Some(ReaderOf<R, number>(n))))),
    (mk) => {
      const rf_rg: Reader<R, any> = (r) => Some(ReaderOf<R, number>(r + 1)) // Reader<R, Option<Reader<R, number>>>
      const μ = U.muFor(F_Option, F_Option)
      const left  = μ.app<number>(rf_rg)(10)
      const right = OptionEndo.map((rg: Reader<R, number>) => rg(10))(rf_rg(10))
      return eqJSON(left, right)
    }))
}

// ---------- OPLAX: PrecomposeEnv laws ----------
async function testOplaxPrecomposeEnv() {
  type E = string
  const defaultE: E = '∅'
  const strengthFor = <F>(F: EndofunctorK1<F>) => {
    // derive via palette we have; fallbacks:
    switch (true) {
      case (F === OptionEndo): return strengthEnvFromOption<E>(defaultE) as any
      default: return strengthEnvFromEither<E, 'err'>(defaultE) as any
    }
  }
  const V = makePrecomposeEnv2<E>(strengthFor)

  // η^op drops Env
  fc.assert(fc.property(
    fc.tuple(fc.string(), fc.integer()),
    ([e, a]) => {
      const eta = V.etaOp()
      return eta.app<number>([e, a] as const) === a
    }))

  // μ^op agrees with "push Env through G then F"
  fc.assert(fc.property(
    fc.tuple(fc.string(), fc.integer()),
    (pair) => {
      const F = G_Either<'err'>()
      const G = OptionEndo
      const μop = V.muOpFor(F, G)
      const fg_ea = F.map((oa: any) => oa)(Right([pair[0], pair[1]] as const)) // Either<err, Option<[E,A]>>
      const left  = μop.app<number>(fg_ea) // Env<E, Either<err, Option<A>>>
      // manual:
      const sG = strengthEnvFromOption<E>(defaultE).st<number>
      const sF = strengthEnvFromEither<E, 'err'>(defaultE).st<any>
      const manual = sF(F.map((oea: any) => sG(oea))(fg_ea))
      return eqJSON(left, manual)
    }))
}

void (async () => {
  await testLaxPostcomposeReader()
  await testOplaxPrecomposeEnv()
  // minimal smoke for composed strength
  {
    type E = number
    const F = P_Pair<7>()
    const G = OptionEndo
    const s = strengthEnvCompose<E>()(F, G, strengthEnvFromPair<E>()<7>(), strengthEnvFromOption<E>(0))
    const out = s.st<number>([7 as const, Some<[E, number]>([5, 42] as const)] as const)
    console.log('compose strength example:', out) // => [5, [7, Some(42)]]
  }
  console.log('✓ two-cat lax/oplax basics checked')
})()