export type IR<I, O> =
  | { tag: 'Arr'; f: (i: I) => O }
  | { tag: 'Comp'; f: IR<I, unknown>; g: IR<unknown, O> }
  | { tag: 'First'; f: IR<unknown, unknown> }
  | { tag: 'Left'; f: IR<unknown, unknown> }
  | { tag: 'Par'; l: IR<unknown, unknown>; r: IR<unknown, unknown> }
  | { tag: 'Fanout'; l: IR<unknown, unknown>; r: IR<unknown, unknown> }
  | { tag: 'Zero' }
  | { tag: 'Alt'; l: IR<unknown, unknown>; r: IR<unknown, unknown> }
  | { tag: 'Loop'; f: IR<[unknown, unknown], [unknown, unknown]> }

export const denot = <I, O>(ir: IR<I, O>): (i: I) => O => {
  switch (ir.tag) {
    case 'Arr':
      return ir.f

    case 'Comp': {
      const f = denot(ir.f)
      const g = denot(ir.g)
      return (i: I) => g(f(i))
    }

    case 'First': {
      const f = denot(ir.f)
      return (([a, c]: readonly [unknown, unknown]) => [f(a), c] as const) as unknown as (i: I) => O
    }

    case 'Left': {
      const f = denot(ir.f)
      return ((
        e:
          | { _tag: 'Left'; value: unknown }
          | { _tag: 'Right'; value: unknown }
      ) => {
        if (e._tag === 'Left') return { _tag: 'Left' as const, value: f(e.value) }
        return e
      }) as unknown as (i: I) => O
    }

    case 'Par': {
      const l = denot(ir.l)
      const r = denot(ir.r)
      return (([a, c]: readonly [unknown, unknown]) => [l(a), r(c)] as const) as unknown as (i: I) => O
    }

    case 'Fanout': {
      const l = denot(ir.l)
      const r = denot(ir.r)
      return ((a: unknown) => [l(a), r(a)] as const) as unknown as (i: I) => O
    }

    case 'Zero':
      return () => { throw new Error('ArrowZero: no value') }

    case 'Alt': {
      const l = denot(ir.l)
      const r = denot(ir.r)
      return ((a: unknown) => {
        try { return l(a) } catch { return r(a) }
      }) as unknown as (i: I) => O
    }

    case 'Loop': {
      const f = denot(ir.f)
      return ((a: unknown) => {
        let [b, c] = f([a, undefined] as [unknown, unknown])
        while (c !== undefined) {
          [b, c] = f([a, c] as [unknown, unknown])
        }
        return b
      }) as unknown as (i: I) => O
    }
  }
}

export const arr = <I, O>(f: (i: I) => O): IR<I, O> => ({ tag: 'Arr', f })

export const comp = <I, M, O>(f: IR<I, M>, g: IR<M, O>): IR<I, O> =>
  ({ tag: 'Comp', f: f as IR<I, unknown>, g: g as IR<unknown, O> }) as IR<I, O>

export const first = <A, B, C>(f: IR<A, B>): IR<readonly [A, C], readonly [B, C]> =>
  ({ tag: 'First', f: f as IR<unknown, unknown> }) as IR<readonly [A, C], readonly [B, C]>

export const leftArrow = <A, B, C>(f: IR<A, B>): IR<
  { _tag: 'Left'; value: A } | { _tag: 'Right'; value: C },
  { _tag: 'Left'; value: B } | { _tag: 'Right'; value: C }
> => ({ tag: 'Left', f: f as IR<unknown, unknown> }) as IR<
  { _tag: 'Left'; value: A } | { _tag: 'Right'; value: C },
  { _tag: 'Left'; value: B } | { _tag: 'Right'; value: C }
>

export const par = <A, B, C, D>(f: IR<A, B>, g: IR<C, D>): IR<readonly [A, C], readonly [B, D]> =>
  ({ tag: 'Par', l: f as IR<unknown, unknown>, r: g as IR<unknown, unknown> }) as IR<readonly [A, C], readonly [B, D]>

export const fanout = <A, B, C>(f: IR<A, B>, g: IR<A, C>): IR<A, readonly [B, C]> =>
  ({ tag: 'Fanout', l: f as IR<unknown, unknown>, r: g as IR<unknown, unknown> }) as IR<A, readonly [B, C]>

export const zero = <A, B>(): IR<A, B> => ({ tag: 'Zero' })

export const alt = <A, B>(f: IR<A, B>, g: IR<A, B>): IR<A, B> =>
  ({
    tag: 'Alt',
    l: f as IR<unknown, unknown>,
    r: g as IR<unknown, unknown>
  }) as IR<A, B>

export const loop = <A, B>(f: IR<[A, B], [B, B]>): IR<A, B> =>
  ({ tag: 'Loop', f: f as IR<[unknown, unknown], [unknown, unknown]> }) as IR<A, B>

export const second = <A, B, C>(f: IR<B, C>): IR<readonly [A, B], readonly [A, C]> => {
  const swap = arr<readonly [A, B], readonly [B, A]>(([a, b]) => [b, a])
  const swapBack = arr<readonly [C, A], readonly [A, C]>(([c, a]) => [a, c])
  return comp(comp(swap, first(f)), swapBack)
}

type LeftValue<T> = { _tag: 'Left'; value: T }
type RightValue<T> = { _tag: 'Right'; value: T }
type EitherValue<L, R> = LeftValue<L> | RightValue<R>

const flipEither = <L, R>(): IR<EitherValue<L, R>, EitherValue<R, L>> =>
  arr<EitherValue<L, R>, EitherValue<R, L>>((e) =>
    e._tag === 'Left'
      ? { _tag: 'Right' as const, value: e.value }
      : { _tag: 'Left' as const, value: e.value }
  )

export const rightArrow = <A, B, C>(f: IR<A, B>): IR<EitherValue<C, A>, EitherValue<C, B>> => {
  const mirrorIn = flipEither<C, A>() as IR<EitherValue<C, A>, EitherValue<A, C>>
  const leftF = leftArrow(f) as IR<EitherValue<A, C>, EitherValue<B, C>>
  const mirrorOut = flipEither<B, C>() as IR<EitherValue<B, C>, EitherValue<C, B>>
  const mirroredLeft = comp(mirrorIn, leftF) as IR<EitherValue<C, A>, EitherValue<B, C>>
  return comp(mirroredLeft, mirrorOut) as IR<EitherValue<C, A>, EitherValue<C, B>>
}

export const plus = <A, B>(f: IR<A, B>, g: IR<A, B>): IR<A, B> => alt(f, g)

export interface RewriteStep {
  rule: string
  before: string
  after: string
  law: string
}

export interface RewritePlan<I = unknown, O = unknown> {
  plan: IR<I, O>
  steps: ReadonlyArray<RewriteStep>
}

export const normalize = <I, O>(ir: IR<I, O>): RewritePlan<I, O> => {
  const steps: RewriteStep[] = []
  let current = ir
  let changed = true

  while (changed) {
    changed = false
    const result = rewriteWithPlan(current)
    if (result.plan !== current) {
      current = result.plan
      steps.push(...result.steps)
      changed = true
    }
  }

  return { plan: current, steps } as RewritePlan<I, O>
}

const rewriteWithPlan = <I, O>(ir: IR<I, O>): RewritePlan<I, O> => {
  const steps: RewriteStep[] = []
  const result = rewrite(ir, steps)
  return { plan: result, steps }
}

const rewrite = <I, O>(ir: IR<I, O>, steps: RewriteStep[] = []): IR<I, O> => {
  switch (ir.tag) {
    case 'Comp': {
      const f = rewrite(ir.f, steps)
      const g = rewrite(ir.g, steps)

      if (f.tag === 'Comp') {
        const result = comp(f.f, comp(f.g, g))
        steps.push({
          rule: 'AssocComp',
          before: hashIR(ir),
          after: hashIR(result),
          law: 'Category.3 (Associativity)'
        })
        return result as IR<I, O>
      }

      if (f.tag === 'Arr' && f.f === idFn) {
        steps.push({
          rule: 'DropLeftId',
          before: hashIR(ir),
          after: hashIR(g),
          law: 'Category.1 (Left Identity)'
        })
        return g as IR<I, O>
      }

      if (g.tag === 'Arr' && g.f === idFn) {
        steps.push({
          rule: 'DropRightId',
          before: hashIR(ir),
          after: hashIR(f),
          law: 'Category.2 (Right Identity)'
        })
        return f as IR<I, O>
      }

      return { tag: 'Comp', f, g } as IR<I, O>
    }

    case 'First': {
      const f = rewrite(ir.f, steps)

      if (f.tag === 'Arr') {
        const result = arr((([a, c]: readonly [unknown, unknown]) => [f.f(a), c] as const)) as IR<I, O>
        steps.push({
          rule: 'CollapseFirstArr',
          before: hashIR(ir),
          after: hashIR(result),
          law: 'Arrow.1 (First on arr)'
        })
        return result
      }

      if (f.tag === 'Comp') {
        const result = comp(first(f.f), first(f.g)) as IR<I, O>
        steps.push({
          rule: 'PushFirstComp',
          before: hashIR(ir),
          after: hashIR(result),
          law: 'Arrow.4 (Exchange)'
        })
        return result
      }

      return { tag: 'First', f } as IR<I, O>
    }

    case 'Par': {
      const l = rewrite(ir.l, steps)
      const r = rewrite(ir.r, steps)

      if (l.tag === 'Arr' && r.tag === 'Arr') {
        const result = arr(([a, c]: readonly [unknown, unknown]) => [l.f(a), r.f(c)] as const) as IR<I, O>
        steps.push({
          rule: 'FuseParArr',
          before: hashIR(ir),
          after: hashIR(result),
          law: 'Arrow.5 (Product Functoriality)'
        })
        return result
      }

      return { tag: 'Par', l, r } as IR<I, O>
    }

    case 'Fanout': {
      const l = rewrite(ir.l, steps)
      const r = rewrite(ir.r, steps)

      if (l.tag === 'Arr' && r.tag === 'Arr') {
        const result = arr((a: I) => [l.f(a as unknown), r.f(a as unknown)] as const) as IR<I, O>
        steps.push({
          rule: 'FuseFanoutArr',
          before: hashIR(ir),
          after: hashIR(result),
          law: 'Arrow.6 (Fanout Functoriality)'
        })
        return result
      }

      return { tag: 'Fanout', l, r } as IR<I, O>
    }

    case 'Alt': {
      const l = rewrite(ir.l, steps)
      const r = rewrite(ir.r, steps)

      if (l.tag === 'Zero') {
        steps.push({
          rule: 'DropLeftZero',
          before: hashIR(ir),
          after: hashIR(r),
          law: 'ArrowPlus.1 (Left Identity)'
        })
        return r as IR<I, O>
      }

      if (r.tag === 'Zero') {
        steps.push({
          rule: 'DropRightZero',
          before: hashIR(ir),
          after: hashIR(l),
          law: 'ArrowPlus.2 (Right Identity)'
        })
        return l as IR<I, O>
      }

      if (l.tag === 'Alt') {
        const result = alt(l.l, alt(l.r, r))
        steps.push({
          rule: 'AssocAlt',
          before: hashIR(ir),
          after: hashIR(result),
          law: 'ArrowPlus.3 (Associativity)'
        })
        return result as IR<I, O>
      }

      return { tag: 'Alt', l, r } as IR<I, O>
    }

    case 'Left': {
      const f = rewrite(ir.f, steps)

      if (f.tag === 'Arr') {
        const result = arr((e: EitherValue<unknown, unknown>) => {
          if (e._tag === 'Left') return { _tag: 'Left' as const, value: f.f(e.value) }
          return e
        }) as IR<I, O>
        steps.push({
          rule: 'CollapseLeftArr',
          before: hashIR(ir),
          after: hashIR(result),
          law: 'ArrowChoice.1 (Left Identity)'
        })
        return result
      }

      if (f.tag === 'Comp') {
        const result = comp(leftArrow(f.f), leftArrow(f.g)) as IR<I, O>
        steps.push({
          rule: 'PushLeftComp',
          before: hashIR(ir),
          after: hashIR(result),
          law: 'ArrowChoice.2 (Left Exchange)'
        })
        return result
      }

      return { tag: 'Left', f } as IR<I, O>
    }

    case 'Loop':
      return { tag: 'Loop', f: rewrite(ir.f, steps) } as IR<I, O>

    default:
      return ir
  }
}

const idFn = <A>(a: A): A => a

const hashIR = <I, O>(ir: IR<I, O>): string => {
  return JSON.stringify(ir, (key, value) => {
    void key
    if (typeof value === 'function') return '<function>'
    return value
  }).slice(0, 50) + '...'
}

export const Arrow = {
  arr,
  comp,
  first,
  left: leftArrow,
  par,
  fanout,
  zero,
  alt,
  loop,
  second,
  right: rightArrow,
  plus,
  denot,
  normalize,
  then: comp,
  split: par,
  id: <A>(): IR<A, A> => arr(idFn)
}
