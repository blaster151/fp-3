export type Stream<A> = ReadonlyArray<A>

export type StreamProc<A, B> = (stream: Stream<A>) => Stream<B>

export const StreamArrow = {
  arr: <A, B>(f: (a: A) => B): StreamProc<A, B> =>
    (stream: Stream<A>) => stream.map(f),

  then: <A, B, C>(g: StreamProc<B, C>) => (f: StreamProc<A, B>): StreamProc<A, C> =>
    (stream: Stream<A>) => g(f(stream)),

  first: <A, B, C>(f: StreamProc<A, B>): StreamProc<readonly [A, C], readonly [B, C]> =>
    (stream: Stream<readonly [A, C]>) => stream.map(([a, c]) => [f([a])[0]!, c] as const),

  second: <A, B, C>(f: StreamProc<B, C>): StreamProc<readonly [A, B], readonly [A, C]> =>
    (stream: Stream<readonly [A, B]>) => stream.map(([a, b]) => [a, f([b])[0]!] as const),

  split: <A, B, C, D>(f: StreamProc<A, B>, g: StreamProc<C, D>): StreamProc<readonly [A, C], readonly [B, D]> =>
    (stream: Stream<readonly [A, C]>) => stream.map(([a, c]) => [f([a])[0]!, g([c])[0]!] as const),

  fanout: <A, B, C>(f: StreamProc<A, B>, g: StreamProc<A, C>): StreamProc<A, readonly [B, C]> =>
    (stream: Stream<A>) => stream.map((a) => [f([a])[0]!, g([a])[0]!] as const),

  left: <A, B, C>(f: StreamProc<A, B>): StreamProc<{ _tag: 'Left'; value: A } | { _tag: 'Right'; value: C }, { _tag: 'Left'; value: B } | { _tag: 'Right'; value: C }> =>
    (stream: Stream<{ _tag: 'Left'; value: A } | { _tag: 'Right'; value: C }>) =>
      stream.map((e) => (e._tag === 'Left' ? { _tag: 'Left' as const, value: f([e.value])[0]! } : e)),

  right: <A, B, C>(f: StreamProc<B, C>): StreamProc<{ _tag: 'Left'; value: A } | { _tag: 'Right'; value: B }, { _tag: 'Left'; value: A } | { _tag: 'Right'; value: C }> =>
    (stream: Stream<{ _tag: 'Left'; value: A } | { _tag: 'Right'; value: B }>) =>
      stream.map((e) => (e._tag === 'Right' ? { _tag: 'Right' as const, value: f([e.value])[0]! } : e)),

  zero: <A, B>(): StreamProc<A, B> => () => [],

  alt: <A, B>(f: StreamProc<A, B>, g: StreamProc<A, B>): StreamProc<A, B> =>
    (stream: Stream<A>) => {
      const resultF = f(stream)
      const resultG = g(stream)
      return resultF.length > 0 ? resultF : resultG
    },

  loop: <A, B, C>(f: StreamProc<readonly [A, C], readonly [B, C]>): StreamProc<A, B> =>
    (stream: Stream<A>) => {
      const result: B[] = []
      let feedback: C[] = []

      for (const a of stream) {
        const input: readonly [A, C][] = [[a, feedback[0] ?? ({} as C)]]
        const output = f(input)
        if (output.length > 0) {
          const [b, c] = output[0]!
          result.push(b)
          feedback = [c]
        }
      }

      return result
    }
}

export const StreamFusion = {
  fusePureInto: <A, B, C>(sigma: StreamProc<B, C>, f: (a: A) => B): StreamProc<A, C> =>
    (stream: Stream<A>) => sigma(stream.map(f)),

  fuseProcInto: <A, B, C>(sigma: StreamProc<B, C>, tau: StreamProc<A, B>): StreamProc<A, C> =>
    (stream: Stream<A>) => sigma(tau(stream)),

  fusePureOut: <A, B, C>(sigma: StreamProc<A, B>, g: (b: B) => C): StreamProc<A, C> =>
    (stream: Stream<A>) => sigma(stream).map(g)
}

export const isIndependent = <A, B, C>(
  f: StreamProc<A, B>,
  g: StreamProc<A, C>
): boolean => {
  void f
  void g
  return true
}
