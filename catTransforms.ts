import type {
  EndofunctorK1,
  EndofunctorValue,
  LaxTwoFunctorK1,
  NatK1,
  ProdVal,
  SumVal,
} from "./endo-2category"
import { composeEndoK1 } from "./endo-2category"
import type { Task } from "./task"

export const sumNat =
  <F, Fp, G, Gp>(alpha: NatK1<F, Fp>, beta: NatK1<G, Gp>): NatK1<['Sum', F, G], ['Sum', Fp, Gp]> => ({
    app: <A>(v: SumVal<F, G, A>): SumVal<Fp, Gp, A> =>
      v._sum === 'L'
        ? { _sum: 'L', left:  alpha.app<A>(v.left) }
        : { _sum: 'R', right: beta.app<A>(v.right) }
  })

export const sumNatL =
  <F, Fp, G>(alpha: NatK1<F, Fp>): NatK1<['Sum', F, G], ['Sum', Fp, G]> => ({
    app: <A>(v: SumVal<F, G, A>) =>
      v._sum === 'L' ? { _sum: 'L', left: alpha.app<A>(v.left) } : v
  })

export const sumNatR =
  <F, G, Gp>(beta: NatK1<G, Gp>): NatK1<['Sum', F, G], ['Sum', F, Gp]> => ({
    app: <A>(v: SumVal<F, G, A>) =>
      v._sum === 'R' ? { _sum: 'R', right: beta.app<A>(v.right) } : v
  })

export const prodNat =
  <F, Fp, G, Gp>(alpha: NatK1<F, Fp>, beta: NatK1<G, Gp>): NatK1<['Prod', F, G], ['Prod', Fp, Gp]> => ({
    app: <A>(p: ProdVal<F, G, A>): ProdVal<Fp, Gp, A> => ({
      left:  alpha.app<A>(p.left),
      right: beta.app<A>(p.right),
    })
  })

export const prodNatL =
  <F, Fp, G>(alpha: NatK1<F, Fp>): NatK1<['Prod', F, G], ['Prod', Fp, G]> => ({
    app: <A>(p: ProdVal<F, G, A>): ProdVal<Fp, G, A> => ({ left: alpha.app<A>(p.left), right: p.right })
  })

export const prodNatR =
  <F, G, Gp>(beta: NatK1<G, Gp>): NatK1<['Prod', F, G], ['Prod', F, Gp]> => ({
    app: <A>(p: ProdVal<F, G, A>): ProdVal<F, Gp, A> => ({ left: p.left, right: beta.app<A>(p.right) })
  })

export interface SimpleApplicativeK1<G> {
  readonly of:  <A>(a: A) => EndofunctorValue<G, A>
  readonly map: <A, B>(f: (a: A) => B) => (ga: EndofunctorValue<G, A>) => EndofunctorValue<G, B>
  readonly ap:  <A, B>(gf: EndofunctorValue<G, (a: A) => B>) => (ga: EndofunctorValue<G, A>) => EndofunctorValue<G, B>
}

export interface TraversableK1<F> {
  readonly traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
    (fa: EndofunctorValue<F, A>) => EndofunctorValue<G, EndofunctorValue<F, B>>
}

export const PromiseApp: SimpleApplicativeK1<'Promise'> = {
  of:  <A>(a: A) => Promise.resolve(a),
  map: <A, B>(f: (a: A) => B) => async (pa: Promise<A>) => f(await pa),
  ap:  <A, B>(pf: Promise<(a: A) => B>) => async (pa: Promise<A>) => {
    const f = await pf
    const a = await pa
    return f(a)
  },
}

export const distributePromiseK1 =
  <F>(T: TraversableK1<F>): NatK1<['Comp', F, 'Promise'], ['Comp', 'Promise', F]> => ({
    app: <A>(fpa: EndofunctorValue<['Comp', F, 'Promise'], A>) =>
      T.traverse(PromiseApp)<Promise<A>, A>((pa: Promise<A>) => pa)(fpa)
  })

export const sequencePromiseK1 = distributePromiseK1

export const TaskEndo: EndofunctorK1<'Task'> = {
  map: <A, B>(f: (a: A) => B) => (ta: Task<A>): Task<B> => async () => f(await ta())
}

export const TaskApp: SimpleApplicativeK1<'Task'> = {
  of:  <A>(a: A): Task<A> => () => Promise.resolve(a),
  map: <A, B>(f: (a: A) => B) => (ta: Task<A>): Task<B> => async () => f(await ta()),
  ap:  <A, B>(tf: Task<(a: A) => B>) => (ta: Task<A>): Task<B> =>
        async () => {
          const f = await tf()
          const a = await ta()
          return f(a)
        },
}

export const distributeTaskK1 =
  <F>(T: TraversableK1<F>): NatK1<['Comp', F, 'Task'], ['Comp', 'Task', F]> => ({
    app: <A>(fta: EndofunctorValue<['Comp', F, 'Task'], A>) =>
      T.traverse(TaskApp)<Task<A>, A>((ta: Task<A>) => ta)(fta)
  })

export const makePostcomposePromise2 = (
  getTrav: <F>(F: EndofunctorK1<F>) => TraversableK1<F> | null
) => {
  const H: EndofunctorK1<'Promise'> = { map: PromiseApp.map }

  const on1 = <F>(F: EndofunctorK1<F>) => composeEndoK1(H, F)

  const on2 = <F, G>(α: NatK1<F, G>): NatK1<['Comp', 'Promise', F], ['Comp', 'Promise', G]> => ({
    app: async <A>(pfa: EndofunctorValue<['Comp', 'Promise', F], A>) => {
      const fa = await (pfa as Promise<EndofunctorValue<F, A>>)
      return α.app<A>(fa)
    },
  })

  const eta = (): NatK1<'IdK1', ['Comp', 'Promise', 'IdK1']> => ({
    app: <A>(a: EndofunctorValue<'IdK1', A>) => Promise.resolve(a)
  })

  const mu = <F, G>(FImpl: EndofunctorK1<F>, _GImpl: EndofunctorK1<G>): NatK1<
    ['Comp', ['Comp', 'Promise', F], ['Comp', 'Promise', G]],
    ['Comp', 'Promise', ['Comp', F, G]]
  > => ({
    app: async <A>(p_fpg: EndofunctorValue<['Comp', ['Comp', 'Promise', F], ['Comp', 'Promise', G]], A>) => {
      const fpg = await (p_fpg as Promise<EndofunctorValue<F, Promise<EndofunctorValue<G, A>>>>)
      const T = getTrav(FImpl)
      if (!T) throw new Error('muFor(Promise): missing Traversable for left functor')
      return sequencePromiseK1(T).app<EndofunctorValue<G, A>>(fpg)
    }
  })

  const result: LaxTwoFunctorK1<typeof on1> = { on1, on2, eta, mu }
  return result
}

export const TraversableArrayK1: TraversableK1<'Array'> = {
  traverse: <G>(G: SimpleApplicativeK1<G>) =>
    <A, B>(f: (a: A) => EndofunctorValue<G, B>) =>
    (as: ReadonlyArray<A>) =>
      as.reduce(
      (acc: EndofunctorValue<G, ReadonlyArray<B>>, a: A) =>
        G.ap(G.map((xs: ReadonlyArray<B>) => (b: B) => [...xs, b])(acc))(f(a)),
      G.of<ReadonlyArray<B>>([])
    )
}
