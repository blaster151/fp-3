// two-cat.ts
// Tiny 2-category kit for endofunctors on Types, plus lax/oplax 2-functors.

// ---------- Core shapes ----------
export type EndofunctorK1<F = unknown> = {
  readonly map: <A, B>(f: (a: A) => B) => (fa: any /* F<A> */) => any /* F<B> */
}

export type NatK1<F = unknown, G = unknown> = {
  readonly app: <A>(fa: any /* F<A> */) => any /* G<A> */
}

// Identity endofunctor and composition
export const IdK1: EndofunctorK1<'IdK1'> = {
  map: <A, B>(f: (a: A) => B) => (a: A) => f(a),
}

export const composeEndoK1 =
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>): EndofunctorK1<['Comp', F, G]> => ({
    map: <A, B>(f: (a: A) => B) => (fga: any) => F.map(G.map(f))(fga),
  })

// 2-cell ops (handy for tests / coherence)
export const idNatK1 = <F>(): NatK1<F, F> => ({ app: <A>(fa: any) => fa })

export const vcompNatK1 =
  <F, G, H>(α: NatK1<F, G>, β: NatK1<G, H>): NatK1<F, H> => ({
    app: <A>(fa: any) => β.app<A>(α.app<A>(fa)),
  })

export const leftWhisker =
  <F>(F: EndofunctorK1<F>) =>
  <H, K>(β: NatK1<H, K>): NatK1<['Comp', F, H], ['Comp', F, K]> => ({
    app: <A>(fha: any) => F.map((ha: any) => β.app<A>(ha))(fha),
  })

export const rightWhisker =
  <F, G>(α: NatK1<F, G>) =>
  <H>(/* H only type-level */): NatK1<['Comp', F, H], ['Comp', G, H]> => ({
    app: <A>(fha: any) => α.app<any>(fha),
  })

export const hcompNatK1_component =
  <F, G>(F: EndofunctorK1<F>) =>
  <H, K>(α: NatK1<F, G>, β: NatK1<H, K>): NatK1<['Comp', F, H], ['Comp', G, K]> => ({
    app: <A>(fha: any) => α.app<any>(F.map((ha: any) => β.app<A>(ha))(fha)),
  })

// ---------- Lax / Oplax 2-functor interfaces ----------
export interface LaxTwoFunctorK1 {
  on1: <F>(F: EndofunctorK1<F>) => EndofunctorK1<any>
  on2: <F, G>(α: NatK1<F, G>) => NatK1<any, any>
  eta: () => NatK1<any, any> // Id ⇒ on1(Id)
  muFor: <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) => NatK1<any, any> // on1(F)∘on1(G) ⇒ on1(F∘G)
}

export interface OplaxTwoFunctorK1 {
  on1: <F>(F: EndofunctorK1<F>) => EndofunctorK1<any>
  on2: <F, G>(α: NatK1<F, G>) => NatK1<any, any>
  etaOp: () => NatK1<any, any> // on1(Id) ⇒ Id
  muOpFor: <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) => NatK1<any, any> // on1(F∘G) ⇒ on1(F)∘on1(G)
}

// ---------- Concrete LAX: post-compose with Reader<R,_> ----------
export type Reader<R, A> = (r: R) => A
export const ReaderEndo = <R>(): EndofunctorK1<['Reader', R]> => ({
  map: <A, B>(f: (a: A) => B) => (ra: Reader<R, A>): Reader<R, B> => (r) => f(ra(r)),
})
export const ReaderOf = <R, A>(a: A): Reader<R, A> => (_: R) => a

export const makePostcomposeReader2 = <R>(): LaxTwoFunctorK1 => {
  const H = ReaderEndo<R>() // post-compose by Reader<R,_>

  return {
    on1: <F>(F: EndofunctorK1<F>) => composeEndoK1(H, F),
    on2: <F, G>(α: NatK1<F, G>) => ({
      app: <A>(rfa: Reader<R, any>) => (r: R) => α.app<A>(rfa(r)),
    }),
    eta: () => ({
      app: <A>(a: A): Reader<R, A> => ReaderOf<R, A>(a),
    }),
    muFor: <F, G>(F: EndofunctorK1<F>, _G: EndofunctorK1<G>) => ({
      // Reader<R, F< Reader<R, G<A>> >>  →  Reader<R, F< G<A> >>
      app: <A>(rf_rg: Reader<R, any>) => (r: R) =>
        F.map((rg: Reader<R, any>) => rg(r))(rf_rg(r)),
    }),
  }
}

// ---------- Concrete OPLAX: pre-compose with Env<E,_> ----------
export type Env<E, A> = readonly [E, A]
export const EnvEndo = <E>(): EndofunctorK1<['Env', E]> => ({
  map: <A, B>(f: (a: A) => B) => (ea: Env<E, A>): Env<E, B> => [ea[0], f(ea[1])] as const,
})

// Strength wrt Env: st_F : F<[E,A]> -> [E, F<A>]
export type StrengthEnv<F, E> = { st: <A>(fea: any /* F<Env<E,A>> */) => Env<E, any /* F<A> */> }

export const makePrecomposeEnv2 =
  <E>(strengthFor: <F>(F: EndofunctorK1<F>) => StrengthEnv<F, E>): OplaxTwoFunctorK1 => ({
    on1: <F>(F: EndofunctorK1<F>) => composeEndoK1(F, EnvEndo<E>()),
    on2: <F, G>(α: NatK1<F, G>) => ({
      app: <A>(fea: any) => α.app<Env<E, A>>(fea),
    }),
    etaOp: () => ({
      app: <A>(ea: Env<E, A>): A => ea[1],
    }),
    muOpFor: <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>) => ({
      // F<G<Env<E,A>>> -> F<Env<E,G<A>>> -> Env<E,F<G<A>>>
      app: <A>(fg_ea: any) => {
        const sG = strengthFor(G).st
        const sF = strengthFor(F).st
        const f_env_gA = F.map((g_ea: any) => sG<any>(g_ea))(fg_ea)
        return sF<any>(f_env_gA)
      },
    }),
  })

// ---------- Derived strengths for common functors ----------

// Pair<C,_> (product functor)
export type Pair<C, A> = readonly [C, A]
export const PairEndo = <C>(): EndofunctorK1<['Pair', C]> => ({
  map: <A, B>(f: (a: A) => B) => (ca: Pair<C, A>): Pair<C, B> => [ca[0], f(ca[1])] as const,
})
export const strengthEnvFromPair =
  <E>() =>
  <C>(): StrengthEnv<['Pair', C], E> => ({
    st: <A>(c_ea: Pair<C, Env<E, A>>) => {
      const [c, ea] = c_ea
      return [ea[0], [c, ea[1]] as const] as const
    },
  })

// Option ~ 1 + A  (require a default E to supply when None)
export type None = { readonly _tag: 'None' }
export type Some<A> = { readonly _tag: 'Some'; readonly value: A }
export type Option<A> = None | Some<A>
export const None: None = { _tag: 'None' }
export const Some = <A>(a: A): Option<A> => ({ _tag: 'Some', value: a })
export const OptionEndo: EndofunctorK1<'Option'> = {
  map: <A, B>(f: (a: A) => B) => (oa: Option<A>): Option<B> =>
    oa._tag === 'Some' ? Some(f(oa.value)) : None,
}
export const strengthEnvFromOption =
  <E>(defaultE: E): StrengthEnv<'Option', E> => ({
    st: <A>(oea: Option<Env<E, A>>) =>
      oea._tag === 'Some'
        ? [oea.value[0], Some<A>(oea.value[1])] as const
        : [defaultE, None] as const,
  })

// Either<L,_> (sum functor)
export type Left<L>  = { readonly _tag: 'Left';  readonly left: L }
export type Right<A> = { readonly _tag: 'Right'; readonly right: A }
export type Either<L, A> = Left<L> | Right<A>
export const Left  = <L>(l: L): Either<L, never> => ({ _tag: 'Left', left: l })
export const Right = <A>(a: A): Either<never, A> => ({ _tag: 'Right', right: a })
export const EitherEndo = <L>(): EndofunctorK1<['Either', L]> => ({
  map: <A, B>(f: (a: A) => B) => (ea: Either<L, A>): Either<L, B> =>
    ea._tag === 'Right' ? Right(f(ea.right)) : ea,
})
export const strengthEnvFromEither =
  <E, L>(defaultE: E): StrengthEnv<['Either', L], E> => ({
    st: <A>(e_ea: Either<L, Env<E, A>>) =>
      e_ea._tag === 'Right'
        ? [e_ea.right[0], Right<A>(e_ea.right[1])] as const
        : [defaultE, e_ea] as const,
  })

// Const<C,_> (ignores A) — need a default E
export type Const<C, _A> = { readonly _tag: 'Const'; readonly value: C }
export const ConstEndo = <C>(): EndofunctorK1<['Const', C]> => ({
  map: <A, B>(_f: (a: A) => B) => (cx: Const<C, A>): Const<C, B> => cx as any,
})
export const strengthEnvFromConst =
  <E, C>(defaultE: E): StrengthEnv<['Const', C], E> => ({
    st: <A>(_c_ea: Const<C, Env<E, A>>) => [defaultE, _c_ea] as const,
  })

// Composition rule for strengths: F∘G inherits strength from G then F
export const strengthEnvCompose =
  <E>() =>
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>,
         sF: StrengthEnv<F, E>, sG: StrengthEnv<G, E>): StrengthEnv<['Comp', F, G], E> => ({
    st: <A>(fg_ea: any) => {
      const step = F.map((g_ea: any) => sG.st<A>(g_ea))(fg_ea) // F<Env<E,G<A>>>
      return sF.st<any>(step)                                  // Env<E, F<G<A>>>
    },
  })