import type { FunctorValue } from "./allTS"
import type { Store } from "./comonad-k1"
import type { Result } from "./result"

type NormalizeEndofunctor<F> =
  | F
  | (F extends EndofunctorK1<infer Tag> ? NormalizeEndofunctor<Tag> : never)
  | (F extends ['Sum', infer FL, infer FR] ? ['Sum', NormalizeEndofunctor<FL>, NormalizeEndofunctor<FR>] : never)
  | (F extends ['Prod', infer FL, infer FR] ? ['Prod', NormalizeEndofunctor<FL>, NormalizeEndofunctor<FR>] : never)
  | (F extends ['Comp', infer FL, infer FR] ? ['Comp', NormalizeEndofunctor<FL>, NormalizeEndofunctor<FR>] : never)

type ComposeValInternal<F, G, A> = EndofunctorValue<F, EndofunctorValue<G, A>>
type ProdValInternal<F, G, A> = {
  readonly left: EndofunctorValue<F, A>
  readonly right: EndofunctorValue<G, A>
}
type SumValInternal<F, G, A> =
  | { readonly _sum: 'L'; readonly left: EndofunctorValue<F, A> }
  | { readonly _sum: 'R'; readonly right: EndofunctorValue<G, A> }

export type ProdVal<F, G, A> = ProdValInternal<NormalizeEndofunctor<F>, NormalizeEndofunctor<G>, A>
export type SumVal<F, G, A> = SumValInternal<NormalizeEndofunctor<F>, NormalizeEndofunctor<G>, A>

type CanonicalEndofunctor<F> = Exclude<NormalizeEndofunctor<F>, EndofunctorK1<unknown>>

export type EndofunctorValue<F, A> =
  CanonicalEndofunctor<F> extends infer NF
    ? NF extends unknown
      ? NF extends EndofunctorK1<infer Tag> ? EndofunctorValue<Tag, A> :
        NF extends ['Sum', infer FL, infer FR] ? SumValInternal<FL, FR, A> :
        NF extends ['Prod', infer FL, infer FR] ? ProdValInternal<FL, FR, A> :
        NF extends ['Comp', infer FL, infer FR] ? ComposeValInternal<FL, FR, A> :
        NF extends ['Env', infer E] ? Env<E, A> :
        NF extends ['Pair', infer C] ? readonly [C, A] :
        NF extends ['Store', infer S] ? Store<S, A> :
        NF extends ['Either', infer L] ? Result<L, A> :
        NF extends ['Const', infer C] ? C :
        NF extends string ? FunctorValue<NF, A> :
        unknown
      : never
    : never

export type EndofunctorK1<F> = {
  readonly map: <A, B>(f: (a: A) => B) => (fa: EndofunctorValue<F, A>) => EndofunctorValue<F, B>
}

export const viewCompose = <F, G, A>(value: EndofunctorValue<['Comp', F, G], A>): EndofunctorValue<F, EndofunctorValue<G, A>> =>
  value as EndofunctorValue<F, EndofunctorValue<G, A>>

const packCompose = <F, G, A>(value: EndofunctorValue<F, EndofunctorValue<G, A>>): EndofunctorValue<['Comp', F, G], A> =>
  value as EndofunctorValue<['Comp', F, G], A>

export type NatK1<F, G> = {
  readonly app: <A>(fa: EndofunctorValue<F, A>) => EndofunctorValue<G, A>
}

export const idNatK1 = <F>(): NatK1<F, F> => ({
  app: <A>(fa: EndofunctorValue<F, A>) => fa
})

export const vcompNatK1 =
  <F, G, H>(alpha: NatK1<F, G>, beta: NatK1<G, H>): NatK1<F, H> => ({
    app: <A>(fa: EndofunctorValue<F, A>) => beta.app<A>(alpha.app<A>(fa))
  })

export const leftWhisker =
  <F>(F: EndofunctorK1<F>) =>
  <H, K>(beta: NatK1<H, K>): NatK1<['Comp', F, H], ['Comp', F, K]> => ({
    app: <A>(fha: EndofunctorValue<['Comp', F, H], A>) =>
      packCompose<F, K, A>(
        F.map<EndofunctorValue<H, A>, EndofunctorValue<K, A>>((ha) => beta.app<A>(ha))(
          viewCompose<F, H, A>(fha)
        )
      )
  }) as NatK1<['Comp', F, H], ['Comp', F, K]>

export const rightWhisker =
  <F, G>(alpha: NatK1<F, G>) =>
  <H>(): NatK1<['Comp', F, H], ['Comp', G, H]> => ({
    app: <A>(fha: EndofunctorValue<['Comp', F, H], A>) =>
      packCompose<G, H, A>(
        alpha.app<EndofunctorValue<H, A>>(viewCompose<F, H, A>(fha))
      )
  }) as NatK1<['Comp', F, H], ['Comp', G, H]>

export const hcompNatK1_component =
  <F, G>(F: EndofunctorK1<F>) =>
  <H, K>(alpha: NatK1<F, G>, beta: NatK1<H, K>): NatK1<['Comp', F, H], ['Comp', G, K]> => ({
    app: <A>(fha: EndofunctorValue<['Comp', F, H], A>) =>
      packCompose<G, K, A>(
        alpha.app<EndofunctorValue<K, A>>(
          F.map<EndofunctorValue<H, A>, EndofunctorValue<K, A>>((ha) => beta.app<A>(ha))(
            viewCompose<F, H, A>(fha)
          )
        )
      )
  }) as NatK1<['Comp', F, H], ['Comp', G, K]>

export const IdK1: EndofunctorK1<'IdK1'> = {
  map: <A, B>(f: (a: A) => B) => (a: A) => f(a)
}

export const composeEndoK1 =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>): EndofunctorK1<['Comp', F, G]> => ({
    map: <A, B>(f: (a: A) => B) =>
      (fga: EndofunctorValue<['Comp', F, G], A>) =>
        packCompose<F, G, B>(
          F.map<EndofunctorValue<G, A>, EndofunctorValue<G, B>>(G.map(f))(
            viewCompose<F, G, A>(fga)
          )
        )
  }) as EndofunctorK1<['Comp', F, G]>

type EndofunctorMapper = <FTag>(
  F: EndofunctorK1<FTag>
) => EndofunctorK1<unknown>

type MapperResult<M, FTag> =
  M extends (F: EndofunctorK1<FTag>) => infer Result ? Result : never

type TwoFunctorImage<M extends EndofunctorMapper, FTag> =
  MapperResult<M, FTag> extends EndofunctorK1<infer Target> ? Target : never

export interface TwoFunctorK1<M extends EndofunctorMapper = EndofunctorMapper> {
  on1: M
  on2: <F, G>(α: NatK1<F, G>) => NatK1<TwoFunctorImage<M, F>, TwoFunctorImage<M, G>>
}

export interface LaxTwoFunctorK1<M extends EndofunctorMapper = EndofunctorMapper> extends TwoFunctorK1<M> {
  mu: <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) => NatK1<
    ['Comp', TwoFunctorImage<M, F>, TwoFunctorImage<M, G>],
    TwoFunctorImage<M, ['Comp', F, G]>
  >
  eta: () => NatK1<'IdK1', TwoFunctorImage<M, 'IdK1'>>
}

export interface OplaxTwoFunctorK1<M extends EndofunctorMapper = EndofunctorMapper> extends TwoFunctorK1<M> {
  muOp: <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) => NatK1<
    TwoFunctorImage<M, ['Comp', F, G]>,
    ['Comp', TwoFunctorImage<M, F>, TwoFunctorImage<M, G>]
  >
  etaOp: () => NatK1<TwoFunctorImage<M, 'IdK1'>, 'IdK1'>
}

export type Reader<R, A> = (r: R) => A
export const Reader = {
  map:  <A, B>(f: (a: A) => B) => <R>(ra: Reader<R, A>): Reader<R, B> => (r) => f(ra(r)),
  of:   <R, A>(a: A): Reader<R, A> => (_: R) => a,
  chain: <A, B, R>(f: (a: A) => Reader<R, B>) => (ra: Reader<R, A>): Reader<R, B> => (r) => f(ra(r))(r),
  ap:   <R, A, B>(rfab: Reader<R, (a: A) => B>) => (rfa: Reader<R, A>): Reader<R, B> => (r) => rfab(r)(rfa(r)),
  ask:  <R>(): Reader<R, R> => (r: R) => r,
  asks: <R, A>(f: (r: R) => A): Reader<R, A> => (r) => f(r),
  local: <R, Q>(f: (q: Q) => R) => <A>(rq: Reader<R, A>): Reader<Q, A> => (q) => rq(f(q)),
}

export const runReader = <R, A>(ra: Reader<R, A>, r: R): A => ra(r)

export const PostcomposeReader2 = <R>() => {
  const H: EndofunctorK1<'Reader'> = {
    map: <A, B>(f: (a: A) => B) =>
      (ra: EndofunctorValue<'Reader', A>): EndofunctorValue<'Reader', B> =>
        Reader.map<A, B>(f)<R>(ra as Reader<R, A>)
  }

  const on1 = <F>(F: EndofunctorK1<F>) =>
    composeEndoK1(H, F)

  const on2 = <F, G>(α: NatK1<F, G>): NatK1<['Comp', 'Reader', F], ['Comp', 'Reader', G]> => ({
    app: <A>(rfa: EndofunctorValue<['Comp', 'Reader', F], A>) =>
      (r: R) => α.app<A>((viewCompose<'Reader', F, A>(rfa) as Reader<R, EndofunctorValue<F, A>>)(r))
  }) as NatK1<['Comp', 'Reader', F], ['Comp', 'Reader', G]>

  const eta = (): NatK1<'IdK1', ['Comp', 'Reader', 'IdK1']> => ({
    app: <A>(a: EndofunctorValue<'IdK1', A>) => Reader.of<R, A>(a)
  })

  const mu = <F, G>(FImpl: EndofunctorK1<F>, _G: EndofunctorK1<G>): NatK1<
    ['Comp', ['Comp', 'Reader', F], ['Comp', 'Reader', G]],
    ['Comp', 'Reader', ['Comp', F, G]]
  > => ({
    app: <A>(rf_rg: EndofunctorValue<['Comp', ['Comp', 'Reader', F], ['Comp', 'Reader', G]], A>) =>
      (r: R) => {
        const f_rg = (rf_rg as Reader<R, EndofunctorValue<F, Reader<R, EndofunctorValue<G, A>>>>)(r)
        return FImpl.map((rg: Reader<R, EndofunctorValue<G, A>>) => rg(r))(f_rg)
      }
  }) as NatK1<
    ['Comp', ['Comp', 'Reader', F], ['Comp', 'Reader', G]],
    ['Comp', 'Reader', ['Comp', F, G]]
  >

  const result: LaxTwoFunctorK1<typeof on1> = { on1, on2, eta, mu }
  return result
}

export const muPostReader =
  <R>() =>
  <F, G>(F: EndofunctorK1<F>): NatK1<
    ['Comp', ['Comp', 'Reader', F], ['Comp', 'Reader', G]],
    ['Comp', 'Reader', ['Comp', F, G]]
  > => ({
    app: <A>(rf_rg: EndofunctorValue<['Comp', ['Comp', 'Reader', F], ['Comp', 'Reader', G]], A>) =>
      (r: R) => F.map((rg: Reader<R, EndofunctorValue<G, A>>) => rg(r))(
        (rf_rg as Reader<R, EndofunctorValue<F, Reader<R, EndofunctorValue<G, A>>>>)(r)
      )
  }) as NatK1<
    ['Comp', ['Comp', 'Reader', F], ['Comp', 'Reader', G]],
    ['Comp', 'Reader', ['Comp', F, G]]
  >

export type Env<E, A> = readonly [E, A]
export const EnvEndo = <E>(): EndofunctorK1<['Env', E]> => ({
  map: <A, B>(f: (a: A) => B) => (ea: Env<E, A>): Env<E, B> => [ea[0], f(ea[1])] as const
})

export type StrengthEnv<F, E> = {
  st: <A>(fea: EndofunctorValue<F, Env<E, A>>) => Env<E, EndofunctorValue<F, A>>
}

export const PrecomposeEnv2 =
  <E>(strengthFor: <F>(F: EndofunctorK1<F>) => StrengthEnv<F, E>) => {

  const on1 = <F>(F: EndofunctorK1<F>) => composeEndoK1(F, EnvEndo<E>())

  const on2 = <F, G>(α: NatK1<F, G>): NatK1<['Comp', F, ['Env', E]], ['Comp', G, ['Env', E]]> => ({
    app: <A>(fea: EndofunctorValue<['Comp', F, ['Env', E]], A>) =>
      α.app<Env<E, A>>(viewCompose<F, ['Env', E], A>(fea))
  }) as NatK1<['Comp', F, ['Env', E]], ['Comp', G, ['Env', E]]>

  const etaOp = (): NatK1<TwoFunctorImage<typeof on1, 'IdK1'>, 'IdK1'> => ({
    app: <A>(ea: EndofunctorValue<TwoFunctorImage<typeof on1, 'IdK1'>, A>) => {
      const [, value] = ea as Env<E, A>
      return value
    }
  })

  const muOp = <F, G>(FImpl: EndofunctorK1<F>, GImpl: EndofunctorK1<G>): NatK1<
    TwoFunctorImage<typeof on1, ['Comp', F, G]>,
    ['Comp', TwoFunctorImage<typeof on1, F>, TwoFunctorImage<typeof on1, G>]
  > => ({
    app: <A>(fg_ea: EndofunctorValue<TwoFunctorImage<typeof on1, ['Comp', F, G]>, A>) => {
      const sG = strengthFor(GImpl).st
      const sF = strengthFor(FImpl).st
      const mapped = FImpl.map((g_ea: EndofunctorValue<G, Env<E, A>>) => sG<A>(g_ea))(
        fg_ea as EndofunctorValue<F, EndofunctorValue<G, Env<E, A>>>
      )
      return sF<EndofunctorValue<G, A>>(mapped)
    }
  })

  const result: OplaxTwoFunctorK1<typeof on1> = { on1, on2, etaOp, muOp }
  return result
}

export const strengthEnvOption = <E>(): StrengthEnv<'Option', E> => ({
  st: <A>(oea: EndofunctorValue<'Option', Env<E, A>>) => {
    const opt = oea as { _tag: 'Some'; value: readonly [E, A] } | { _tag: 'None' }
    return (opt && opt._tag === 'Some')
      ? [opt.value[0], { _tag: 'Some', value: opt.value[1] }] as const
      : [undefined as unknown as E, { _tag: 'None' }]
  }
})

export const strengthEnvResult = <E, E2>(defaultE: E): StrengthEnv<['Either', E2], E> => ({
  st: <A>(rea: EndofunctorValue<['Either', E2], Env<E, A>>) => {
    const res = rea as Result<E2, Env<E, A>>
    return (res && res._tag === 'Ok')
      ? [res.value[0], { _tag: 'Ok', value: res.value[1] }] as const
      : [defaultE, res]
  }
})

export const strengthEnvReader = <E, R>(): StrengthEnv<'Reader', E> => ({
  st: <A>(r_ea: EndofunctorValue<'Reader', Env<E, A>>) => {
    const sample = r_ea as (r: R) => readonly [E, A]
    return [undefined as unknown as E,
      ((r: R) => sample(r)[1])
    ] as const
  }
})

export const inL =
  <F, G, A>(fa: EndofunctorValue<F, A>): SumVal<F, G, A> =>
    ({ _sum: 'L', left: fa })

export const inR =
  <F, G, A>(ga: EndofunctorValue<G, A>): SumVal<F, G, A> =>
    ({ _sum: 'R', right: ga })

export const SumEndo =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>): EndofunctorK1<['Sum', F, G]> => ({
    map: <A, B>(f: (a: A) => B) => (v: SumVal<F, G, A>): SumVal<F, G, B> =>
      v._sum === 'L'
        ? { _sum: 'L', left:  F.map(f)(v.left) }
        : { _sum: 'R', right: G.map(f)(v.right) }
  })

export const strengthEnvFromSum =
  <E>() =>
  <F, G>(sF: StrengthEnv<F, E>, sG: StrengthEnv<G, E>): StrengthEnv<['Sum', F, G], E> => ({
    st: <A>(v: EndofunctorValue<['Sum', F, G], Env<E, A>>) => {
      const sum = v as SumVal<F, G, Env<E, A>>
      return sum._sum === 'L'
        ? (() => { const [e, fa] = sF.st<A>(sum.left);  return [e, inL<F, G, A>(fa)] as const })()
        : (() => { const [e, ga] = sG.st<A>(sum.right); return [e, inR<F, G, A>(ga)] as const })()
    }
  })

export const matchSum =
  <F, G, A, B>(onL: (fa: EndofunctorValue<F, A>) => B, onR: (ga: EndofunctorValue<G, A>) => B) =>
  (v: SumVal<F, G, A>): B =>
    v._sum === 'L' ? onL(v.left) : onR(v.right)

export const prod =
  <F, G, A>(fa: EndofunctorValue<F, A>, ga: EndofunctorValue<G, A>): ProdVal<F, G, A> =>
    ({ left: fa, right: ga })

export const ProdEndo =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>): EndofunctorK1<['Prod', F, G]> => ({
    map: <A, B>(f: (a: A) => B) => (p: ProdVal<F, G, A>): ProdVal<F, G, B> => ({
      left:  F.map(f)(p.left),
      right: G.map(f)(p.right),
    })
  })

export const strengthEnvFromProd =
  <E>() =>
  <F, G>(sF: StrengthEnv<F, E>, sG: StrengthEnv<G, E>): StrengthEnv<['Prod', F, G], E> => ({
    st: <A>(p: EndofunctorValue<['Prod', F, G], Env<E, A>>) => {
      const prodVal = p as ProdVal<F, G, Env<E, A>>
      const [e1, fa] = sF.st<A>(prodVal.left)
      const [_,  ga] = sG.st<A>(prodVal.right)
      return [e1, prod<F, G, A>(fa, ga)] as const
    }
  })
