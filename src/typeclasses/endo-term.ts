import { None, Some } from "../../option"
import type { Option } from "../../option"
import { Err, Ok, isOk } from "../../result"
import type { Result } from "../../result"
import {
  IdK1,
  SumEndo,
  ProdEndo,
  composeEndoK1,
  hcompNatK1_component,
  idNatK1,
  inL,
  inR,
  strengthEnvFromSum,
  strengthEnvFromProd,
  type EndofunctorK1,
  type EndofunctorValue,
  type Env,
  type LaxTwoFunctorK1,
  type NatK1,
  type StrengthEnv,
  type SumVal,
  type ProdVal,
} from "../../endo-2category"
import {
  PairEndo,
  ConstEndo,
  strengthEnvFromPair,
  strengthEnvFromConst,
  strengthEnvCompose,
} from "../../comonad-k1"
import {
  makePostcomposePromise2,
  prodNat,
  sumNat,
  type SimpleApplicativeK1,
  type TraversableK1,
} from "../../catTransforms"
import { MonoidalFn, MonoidalKleisliRTE, ResultK1, type Pair } from "./hkt"

export type EndoTerm<Sym extends string> =
  | { tag: "Id" }
  | { tag: "Base"; name: Sym }
  | { tag: "Sum"; left: EndoTerm<Sym>; right: EndoTerm<Sym> }
  | { tag: "Prod"; left: EndoTerm<Sym>; right: EndoTerm<Sym> }
  | { tag: "Comp"; left: EndoTerm<Sym>; right: EndoTerm<Sym> }
  | { tag: "Pair"; C: unknown }
  | { tag: "Const"; C: unknown }

export const IdT = { tag: "Id" } as const
export const BaseT = <S extends string>(name: S): EndoTerm<S> => ({ tag: "Base", name })
export const SumT = <S extends string>(l: EndoTerm<S>, r: EndoTerm<S>): EndoTerm<S> => ({
  tag: "Sum",
  left: l,
  right: r,
})
export const ProdT = <S extends string>(l: EndoTerm<S>, r: EndoTerm<S>): EndoTerm<S> => ({
  tag: "Prod",
  left: l,
  right: r,
})
export const CompT = <S extends string>(l: EndoTerm<S>, r: EndoTerm<S>): EndoTerm<S> => ({
  tag: "Comp",
  left: l,
  right: r,
})
export const PairT = <S extends string>(C: unknown): EndoTerm<S> => ({ tag: "Pair", C })
export const ConstT = <S extends string>(C: unknown): EndoTerm<S> => ({ tag: "Const", C })

export type EndoDict<Sym extends string> = Record<Sym, EndofunctorK1<unknown>>
export type StrengthDict<Sym extends string, E> = Record<Sym, StrengthEnv<unknown, E>>
export type NatDict<SymFrom extends string, SymTo extends string> = (
  name: SymFrom,
) => { to: SymTo; nat: NatK1<unknown, unknown> }

export const evalEndo =
  <S extends string>(d: EndoDict<S>) =>
  (t: EndoTerm<S>): EndofunctorK1<unknown> => {
    switch (t.tag) {
      case "Id":
        return IdK1
      case "Base":
        return d[t.name]
      case "Sum":
        return SumEndo(evalEndo(d)(t.left), evalEndo(d)(t.right))
      case "Prod":
        return ProdEndo(evalEndo(d)(t.left), evalEndo(d)(t.right))
      case "Comp":
        return composeEndoK1(evalEndo(d)(t.left), evalEndo(d)(t.right))
      case "Pair":
        return PairEndo<unknown>()
      case "Const":
        return ConstEndo<unknown>()
    }
  }

export const deriveStrengthEnv =
  <S extends string, E>(d: EndoDict<S>, sd: StrengthDict<S, E>) =>
  (t: EndoTerm<S>): StrengthEnv<unknown, E> => {
    switch (t.tag) {
      case "Id":
        return {
          st: <A>(ea: unknown) => {
            const env = ea as Env<E, A>
            return [env[0], env[1]] as const
          },
        }
      case "Base":
        return sd[t.name]
      case "Sum":
        return strengthEnvFromSum<E>()(
          deriveStrengthEnv(d, sd)(t.left),
          deriveStrengthEnv(d, sd)(t.right),
        )
      case "Prod":
        return strengthEnvFromProd<E>()(
          deriveStrengthEnv(d, sd)(t.left),
          deriveStrengthEnv(d, sd)(t.right),
        )
      case "Comp":
        return strengthEnvCompose<E>()(
          evalEndo(d)(t.left),
          evalEndo(d)(t.right),
          deriveStrengthEnv(d, sd)(t.left),
          deriveStrengthEnv(d, sd)(t.right),
        )
      case "Pair":
        return strengthEnvFromPair<E>()<unknown>()
      case "Const":
        return strengthEnvFromConst<E, unknown>(undefined as unknown as E)
    }
  }

export const hoistEndo =
  <SFrom extends string, STo extends string>(dFrom: EndoDict<SFrom>, dTo: EndoDict<STo>) =>
  (mapBase: NatDict<SFrom, STo>) =>
  (t: EndoTerm<SFrom>): { endo: EndofunctorK1<unknown>; nat: NatK1<unknown, unknown>; term: EndoTerm<STo> } => {
    type Out = { endo: EndofunctorK1<unknown>; nat: NatK1<unknown, unknown>; term: EndoTerm<STo> }
    switch (t.tag) {
      case "Id": {
        return { endo: IdK1, nat: idNatK1(), term: IdT as EndoTerm<STo> } as Out
      }
      case "Base": {
        const { to, nat } = mapBase(t.name)
        return { endo: dTo[to], nat, term: BaseT(to) } as Out
      }
      case "Sum": {
        const L: Out = hoistEndo(dFrom, dTo)(mapBase)(t.left)
        const R: Out = hoistEndo(dFrom, dTo)(mapBase)(t.right)
        return {
          endo: SumEndo(L.endo, R.endo),
          nat: sumNat(L.nat, R.nat),
          term: SumT(L.term, R.term),
        } as Out
      }
      case "Prod": {
        const L: Out = hoistEndo(dFrom, dTo)(mapBase)(t.left)
        const R: Out = hoistEndo(dFrom, dTo)(mapBase)(t.right)
        return {
          endo: ProdEndo(L.endo, R.endo),
          nat: prodNat(L.nat, R.nat),
          term: ProdT(L.term, R.term),
        } as Out
      }
      case "Comp": {
        const L: Out = hoistEndo(dFrom, dTo)(mapBase)(t.left)
        const R: Out = hoistEndo(dFrom, dTo)(mapBase)(t.right)
        return {
          endo: composeEndoK1(L.endo, R.endo),
          nat: hcompNatK1_component(L.endo)(L.nat, R.nat),
          term: CompT(L.term, R.term),
        } as Out
      }
      case "Pair": {
        const endo = PairEndo<unknown>()
        return { endo, nat: idNatK1(), term: PairT<STo>(t.C) } as Out
      }
      case "Const": {
        const endo = ConstEndo<unknown>()
        return { endo, nat: idNatK1(), term: ConstT<STo>(t.C) } as Out
      }
    }
  }

export type AlignBuild<S1 extends string, S2 extends string> = {
  from: EndofunctorK1<unknown>
  to: EndofunctorK1<unknown>
  nat: NatK1<unknown, unknown>
  readonly symbols?: { readonly left: S1; readonly right: S2 }
}

export class EndoTermAlignError extends Error {
  constructor(msg: string) {
    super(`[EndoTerm align] ${msg}`)
  }
}

export const buildNatForTerms =
  <S1 extends string, S2 extends string>(
    d1: EndoDict<S1>,
    d2: EndoDict<S2>,
    pickBase: (nameL: S1, nameR: S2) => NatK1<unknown, unknown> | null,
  ) =>
  (t1: EndoTerm<S1>, t2: EndoTerm<S2>): AlignBuild<S1, S2> => {
    const go = (a: EndoTerm<S1>, b: EndoTerm<S2>): AlignBuild<S1, S2> => {
      if (a.tag !== b.tag) {
        throw new EndoTermAlignError(`shape mismatch: ${a.tag} vs ${b.tag}`)
      }

      switch (a.tag) {
        case "Id": {
          return { from: IdK1, to: IdK1, nat: idNatK1() }
        }
        case "Base": {
          const bBase = b as { tag: "Base"; name: S2 }
          const F = d1[a.name as S1]
          const G = d2[bBase.name]
          const nat = pickBase(a.name as S1, bBase.name)
          if (!nat) {
            throw new EndoTermAlignError(`no base NT for ${String(a.name)} ⇒ ${String(bBase.name)}`)
          }
          return { from: F, to: G, nat }
        }
        case "Sum": {
          const bSum = b as Extract<typeof b, { tag: "Sum" }>
          const L = go(a.left, bSum.left)
          const R = go(a.right, bSum.right)
          return { from: SumEndo(L.from, R.from), to: SumEndo(L.to, R.to), nat: sumNat(L.nat, R.nat) }
        }
        case "Prod": {
          const bProd = b as Extract<typeof b, { tag: "Prod" }>
          const L = go(a.left, bProd.left)
          const R = go(a.right, bProd.right)
          return { from: ProdEndo(L.from, R.from), to: ProdEndo(L.to, R.to), nat: prodNat(L.nat, R.nat) }
        }
        case "Comp": {
          const bComp = b as Extract<typeof b, { tag: "Comp" }>
          const L = go(a.left, bComp.left)
          const R = go(a.right, bComp.right)
          return {
            from: composeEndoK1(L.from, R.from),
            to: composeEndoK1(L.to, R.to),
            nat: hcompNatK1_component(L.from)(L.nat, R.nat),
          }
        }
        case "Pair": {
          const bPair = b as Extract<typeof b, { tag: "Pair"; C: unknown }>
          if (a.C !== bPair.C) {
            throw new EndoTermAlignError(`Pair constants differ: ${String(a.C)} vs ${String(bPair.C)}`)
          }
          const F = PairEndo<unknown>()
          return { from: F, to: F, nat: idNatK1() }
        }
        case "Const": {
          const bConst = b as Extract<typeof b, { tag: "Const"; C: unknown }>
          if (a.C !== bConst.C) {
            throw new EndoTermAlignError(`Const values differ: ${String(a.C)} vs ${String(bConst.C)}`)
          }
          const F = ConstEndo<unknown>()
          return { from: F, to: F, nat: idNatK1() }
        }
      }
    }

    return go(t1, t2)
  }

export type TraversableRegistryK1 = WeakMap<EndofunctorK1<unknown>, TraversableK1<unknown>>

export const makeTraversableRegistryK1 = () => {
  const reg: TraversableRegistryK1 = new WeakMap()
  const metadata = createEndoMetadataStore()
  const register = <F>(F: EndofunctorK1<F>, T: TraversableK1<F>): EndofunctorK1<F> => {
    reg.set(F as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
    return F
  }
  const get = <F>(F: EndofunctorK1<F>): TraversableK1<F> | null =>
    (reg.get(F as EndofunctorK1<unknown>) as TraversableK1<F> | undefined) ?? null
  return { reg, register, get, metadata }
}

export const TraversableOptionK1: TraversableK1<"Option"> = {
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
    (oa: Option<A>) =>
      oa._tag === "Some"
        ? G.map((b: B) => Some(b))(f(oa.value))
        : G.of<Option<B>>(None),
}

export const TraversableEitherK1 =
  <L>(): TraversableK1<["Either", L]> => ({
    traverse: <G>(G: SimpleApplicativeK1<G>) =>
      <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
      (eab: Result<L, A>) =>
        eab._tag === "Ok"
          ? G.map((b: B) => Ok<B>(b))(f(eab.value))
          : G.of<Result<L, B>>(Err<L>(eab.error)),
  })

export type NEA<A> = readonly [A, ...A[]]

export const TraversableNEAK1: TraversableK1<["NEA"]> = {
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
    (fa: EndofunctorValue<["NEA"], A>) => {
      const nea = fa as NEA<A>
      const [h, ...t] = nea
      let acc: EndofunctorValue<G, NEA<B>> = G.map((b: B) => [b] as NEA<B>)(f(h))
      for (const a of t) {
        const cons = G.map((xs: NEA<B>) => (b: B) => [...xs, b] as NEA<B>)(acc)
        acc = G.ap(cons)(f(a))
      }
      return acc as EndofunctorValue<G, EndofunctorValue<["NEA"], B>>
    },
}

export const TraversablePairK1 = <C>(): TraversableK1<["Pair", C]> => ({
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
    (ca: Pair<C, A>) => G.map((b: B) => [ca[0], b] as const)(f(ca[1])),
})

export const TraversableConstK1 = <C>(): TraversableK1<["Const", C]> => ({
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(_f: (a: A) => EndofunctorValue<G, B>) =>
    (cx: C) => G.of<C>(cx),
})

export const deriveTraversableSumK1 =
  <F, G>(TF: TraversableK1<F>, TG: TraversableK1<G>): TraversableK1<["Sum", F, G]> => ({
    traverse: <App>(App: SimpleApplicativeK1<App>) =>
      <A, B>(f: (a: A) => EndofunctorValue<App, B>) =>
      (v: SumVal<F, G, A>) =>
        v._sum === "L"
          ? App.map((fb: EndofunctorValue<F, B>) => inL<F, G, B>(fb))(TF.traverse(App)(f)(v.left))
          : App.map((gb: EndofunctorValue<G, B>) => inR<F, G, B>(gb))(TG.traverse(App)(f)(v.right)),
  })

export const deriveTraversableProdK1 =
  <F, G>(TF: TraversableK1<F>, TG: TraversableK1<G>): TraversableK1<["Prod", F, G]> => ({
    traverse: <App>(App: SimpleApplicativeK1<App>) =>
      <A, B>(f: (a: A) => EndofunctorValue<App, B>) =>
      (p: ProdVal<F, G, A>) => {
        const lf = TF.traverse(App)(f)(p.left)
        const rf = TG.traverse(App)(f)(p.right)
        return App.ap(
          App.map((leftB: EndofunctorValue<F, B>) =>
            (rightB: EndofunctorValue<G, B>) => ({ left: leftB, right: rightB } as ProdVal<F, G, B>),
          )(lf),
        )(rf)
      },
  })

export const deriveTraversableCompK1 =
  <F, G>(TF: TraversableK1<F>, TG: TraversableK1<G>): TraversableK1<["Comp", F, G]> => ({
    traverse: <App>(App: SimpleApplicativeK1<App>) =>
      <A, B>(f: (a: A) => EndofunctorValue<App, B>) =>
      (fga: EndofunctorValue<["Comp", F, G], A>) =>
        TF.traverse(App)((ga: EndofunctorValue<G, A>) => TG.traverse(App)(f)(ga))(fga),
  })

export const registerEitherTraversable =
  <E>(R: ReturnType<typeof makeTraversableRegistryK1>) => {
    const F: EndofunctorK1<["Either", E]> = ResultK1<E>()
    const T: TraversableK1<["Either", E]> = TraversableEitherK1<E>()
    return R.register(F, T)
  }

export const registerPairTraversable =
  <C>(R: ReturnType<typeof makeTraversableRegistryK1>) => {
    const F: EndofunctorK1<["Pair", C]> = PairEndo<C>()
    const T: TraversableK1<["Pair", C]> = TraversablePairK1<C>()
    return R.register(F, T)
  }

export const registerConstTraversable =
  <C>(R: ReturnType<typeof makeTraversableRegistryK1>) => {
    const F: EndofunctorK1<["Const", C]> = ConstEndo<C>()
    const T: TraversableK1<["Const", C]> = TraversableConstK1<C>()
    return R.register(F, T)
  }

export const registerSumDerived =
  <F, G>(R: ReturnType<typeof makeTraversableRegistryK1>, FEndo: EndofunctorK1<F>, GEndo: EndofunctorK1<G>) => {
    const TF = R.get(FEndo)
    const TG = R.get(GEndo)
    if (!TF || !TG) {
      throw new Error("registerSumDerived: missing component traversables")
    }
    const FE = SumEndoM(R.metadata)(FEndo, GEndo)
    const TT = deriveTraversableSumK1(TF, TG)
    return R.register(FE, TT)
  }

export const registerProdDerived =
  <F, G>(R: ReturnType<typeof makeTraversableRegistryK1>, FEndo: EndofunctorK1<F>, GEndo: EndofunctorK1<G>) => {
    const TF = R.get(FEndo)
    const TG = R.get(GEndo)
    if (!TF || !TG) {
      throw new Error("registerProdDerived: missing component traversables")
    }
    const FE = ProdEndoM(R.metadata)(FEndo, GEndo)
    const TT = deriveTraversableProdK1(TF, TG)
    return R.register(FE, TT)
  }

export const registerCompDerived =
  <F, G>(R: ReturnType<typeof makeTraversableRegistryK1>, FEndo: EndofunctorK1<F>, GEndo: EndofunctorK1<G>) => {
    const TF = R.get(FEndo)
    const TG = R.get(GEndo)
    if (!TF || !TG) {
      throw new Error("registerCompDerived: missing component traversables")
    }
    const FE = CompEndoM(R.metadata)(FEndo, GEndo)
    const TT = deriveTraversableCompK1(TF, TG)
    return R.register(FE, TT)
  }

export const makePostcomposePromise2WithRegistry = (R: TraversableRegistryK1): LaxTwoFunctorK1 =>
  makePostcomposePromise2(
    <F>(FEndo: EndofunctorK1<F>) =>
      (R.get(FEndo as EndofunctorK1<unknown>) as TraversableK1<F> | null) ?? null,
  )

type EndoMeta =
  | { tag: "Sum"; left: EndofunctorK1<unknown>; right: EndofunctorK1<unknown> }
  | { tag: "Prod"; left: EndofunctorK1<unknown>; right: EndofunctorK1<unknown> }
  | { tag: "Comp"; left: EndofunctorK1<unknown>; right: EndofunctorK1<unknown> }
  | { tag: "Pair"; C: unknown }
  | { tag: "Const"; C: unknown }

export type EndoMetadataStore = {
  readonly withMeta: <F>(e: EndofunctorK1<F>, m: EndoMeta) => EndofunctorK1<F>
  readonly lookup: <F>(e: EndofunctorK1<F>) => EndoMeta | undefined
}

export const createEndoMetadataStore = (): EndoMetadataStore => {
  const meta = new WeakMap<EndofunctorK1<unknown>, EndoMeta>()
  const withMeta = <F>(e: EndofunctorK1<F>, m: EndoMeta): EndofunctorK1<F> => {
    meta.set(e as EndofunctorK1<unknown>, m)
    return e
  }
  const lookup = <F>(e: EndofunctorK1<F>): EndoMeta | undefined =>
    meta.get(e as EndofunctorK1<unknown>)
  return { withMeta, lookup }
}

export const SumEndoM =
  (store: EndoMetadataStore) =>
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) =>
    store.withMeta(SumEndo(F, G), { tag: "Sum", left: F, right: G })

export const ProdEndoM =
  (store: EndoMetadataStore) =>
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) =>
    store.withMeta(ProdEndo(F, G), { tag: "Prod", left: F, right: G })

export const CompEndoM =
  (store: EndoMetadataStore) =>
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) =>
    store.withMeta(composeEndoK1(F, G), { tag: "Comp", left: F, right: G })

export const PairEndoM =
  (store: EndoMetadataStore) =>
  <C>(c: C) => store.withMeta(PairEndo<C>(), { tag: "Pair", C: c })

export const ConstEndoM =
  (store: EndoMetadataStore) =>
  <C>(c: C) => store.withMeta(ConstEndo<C>(), { tag: "Const", C: c })

export const makeSmartGetTraversableK1 =
  (R: ReturnType<typeof makeTraversableRegistryK1>) =>
  <F>(FEndo: EndofunctorK1<F>): TraversableK1<F> | null => {
    const hit = R.get(FEndo as EndofunctorK1<unknown>)
    if (hit) {
      return hit as TraversableK1<F>
    }
    const m = R.metadata.lookup(FEndo)
    if (!m) {
      return null
    }

    const need = makeSmartGetTraversableK1(R)

    switch (m.tag) {
      case "Sum": {
        const TL = need(m.left)
        const TR = need(m.right)
        if (!TL || !TR) {
          return null
        }
        const T = deriveTraversableSumK1(
          TL as TraversableK1<unknown>,
          TR as TraversableK1<unknown>,
        ) as TraversableK1<F>
        R.register(FEndo as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
        return T
      }
      case "Prod": {
        const TL = need(m.left)
        const TR = need(m.right)
        if (!TL || !TR) {
          return null
        }
        const T = deriveTraversableProdK1(
          TL as TraversableK1<unknown>,
          TR as TraversableK1<unknown>,
        ) as TraversableK1<F>
        R.register(FEndo as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
        return T
      }
      case "Comp": {
        const TL = need(m.left)
        const TR = need(m.right)
        if (!TL || !TR) {
          return null
        }
        const T = deriveTraversableCompK1(
          TL as TraversableK1<unknown>,
          TR as TraversableK1<unknown>,
        ) as TraversableK1<F>
        R.register(FEndo as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
        return T
      }
      case "Pair": {
        const T = TraversablePairK1<unknown>()
        R.register(FEndo as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
        return T as TraversableK1<F>
      }
      case "Const": {
        const T = TraversableConstK1<unknown>()
        R.register(FEndo as EndofunctorK1<unknown>, T as TraversableK1<unknown>)
        return T as TraversableK1<F>
      }
    }
  }

export const makePostcomposePromise2Smart =
  (R: ReturnType<typeof makeTraversableRegistryK1>): LaxTwoFunctorK1 =>
    makePostcomposePromise2(makeSmartGetTraversableK1(R))

export const makeTraversableResultK1 =
  <E>(
    isOkResult: <A>(r: Result<E, A>) => r is Ok<A>,
    getOk: <A>(ok: Ok<A>) => A,
    getErr: (err: Err<E>) => E,
    OkCtor: <A>(a: A) => Result<E, A>,
    ErrCtor: (e: E) => Result<E, never>,
  ): TraversableK1<["Result", E]> => ({
    traverse: <G>(G: SimpleApplicativeK1<G>) =>
      <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
      (fa: EndofunctorValue<["Result", E], A>) => {
        const r = fa as Result<E, A>
        return isOkResult(r)
          ? G.map((b: B) => OkCtor(b))(f(getOk(r)))
          : G.of(ErrCtor(getErr(r)) as Result<E, B>)
      },
  })

type MaybeProcess = { readonly env?: Record<string, string | undefined> }

const resolveNodeEnv = (): string | undefined => {
  const processLike = (globalThis as { readonly process?: MaybeProcess }).process
  const nodeEnv = processLike?.env?.["NODE_ENV"]
  return typeof nodeEnv === "string" ? nodeEnv : undefined
}

const __DEV__ = resolveNodeEnv() !== "production"

export const assertMonoidalFnCoherence = (): void => {
  if (!__DEV__) return

  const A = 42 as const
  const leftUnitor = MonoidalFn.leftUnitor<typeof A>()
  const original = [undefined, A] as const
  const transformed = leftUnitor.to(original)
  const back = leftUnitor.from(transformed)

  if (JSON.stringify(original) !== JSON.stringify(back)) {
    console.warn("monoidal left unitor coherence failed")
  }
}

export const assertMonoidalKleisliRTECoherence = async <R, E>(): Promise<void> => {
  if (!__DEV__) return

  const M = MonoidalKleisliRTE<R, E>()
  const testValue = 42 as const
  const leftUnitor = M.leftUnitor<typeof testValue>()

  try {
    const result = await leftUnitor.to([undefined, testValue] as const)({} as R)
    if (!isOk(result) || result.value !== testValue) {
      console.warn("monoidal left unitor (Kleisli RTE) failed")
    }
  } catch (error) {
    console.warn("monoidal left unitor (Kleisli RTE) failed with error:", error)
  }
}
