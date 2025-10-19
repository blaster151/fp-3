export type Eval<A> = EvalNow<A> | EvalDefer<A> | EvalFlatMap<A>

type EvalNow<A> = { readonly _tag: 'Now'; readonly value: A }
type EvalDefer<A> = { readonly _tag: 'Defer'; readonly thunk: () => Eval<A> }
type EvalFlatMap<A> = {
  readonly _tag: 'FlatMap'
  readonly source: Eval<unknown>
  readonly f: (value: unknown) => Eval<A>
}

export const evalNow = <A>(value: A): Eval<A> => ({ _tag: 'Now', value })

export const evalDefer = <A>(thunk: () => Eval<A>): Eval<A> => ({
  _tag: 'Defer',
  thunk
})

export const evalFlatMap = <A, B>(source: Eval<A>, f: (value: A) => Eval<B>): Eval<B> => ({
  _tag: 'FlatMap',
  source: source as Eval<unknown>,
  f: f as (value: unknown) => Eval<B>
})

export const evalMap = <A, B>(source: Eval<A>, f: (value: A) => B): Eval<B> =>
  evalFlatMap(source, (value) => evalNow(f(value)))

export const evaluate = <A>(initial: Eval<A>): A => {
  const stack: Array<(value: unknown) => Eval<unknown>> = []
  let current: Eval<unknown> = initial as Eval<unknown>

  for (;;) {
    switch (current._tag) {
      case 'Now': {
        const value = current.value
        const next = stack.pop()
        if (next === undefined) {
          return value as A
        }
        current = next(value)
        break
      }
      case 'Defer':
        current = current.thunk()
        break
      case 'FlatMap':
        stack.push(current.f)
        current = current.source
        break
    }
  }
}
