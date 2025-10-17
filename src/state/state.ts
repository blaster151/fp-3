export type State<S, A> = (s: S) => readonly [A, S]

export const State = {
  of:
    <A>(a: A) =>
    <S>(): State<S, A> =>
    (s) => [a, s] as const,

  run: <S, A>(sa: State<S, A>, s: S) => sa(s),
  eval: <S, A>(sa: State<S, A>, s: S): A => sa(s)[0],
  exec: <S, A>(sa: State<S, A>, s: S): S => sa(s)[1],

  get: <S>(): State<S, S> => (s) => [s, s] as const,
  put: <S>(s: S): State<S, void> => () => [undefined, s] as const,
  modify:
    <S>(f: (s: S) => S): State<S, void> =>
    (s) => [undefined, f(s)] as const,

  map:
    <A, B>(f: (a: A) => B) =>
    <S>(sa: State<S, A>): State<S, B> =>
    (s0) => {
      const [a, s1] = sa(s0)
      return [f(a), s1] as const
    },

  chain:
    <A, B, S>(f: (a: A) => State<S, B>) =>
    (sa: State<S, A>): State<S, B> =>
    (s0) => {
      const [a, s1] = sa(s0)
      return f(a)(s1)
    },

  ap:
    <S, A, B>(sfab: State<S, (a: A) => B>) =>
    (sa: State<S, A>): State<S, B> =>
    (s0) => {
      const [fab, s1] = sfab(s0)
      const [a, s2] = sa(s1)
      return [fab(a), s2] as const
    },
}

export const sequenceState =
  <S, A>(xs: ReadonlyArray<State<S, A>>): State<S, ReadonlyArray<A>> =>
  (s0) => {
    const out: A[] = []
    let s = s0
    for (const st of xs) {
      const [a, s1] = st(s)
      out.push(a)
      s = s1
    }
    return [out, s] as const
  }

export const traverseState =
  <S, A, B>(xs: ReadonlyArray<A>, f: (a: A) => State<S, B>): State<S, ReadonlyArray<B>> =>
    sequenceState(xs.map(f))
