export interface Category<O, M> {
  readonly id: (object: O) => M;
  readonly compose: (g: M, f: M) => M;
}

export type Morphism<A, B> = (a: A) => B;

export interface InverseCheckOptions<A, B> {
  readonly eqA?: (x: A, y: A) => boolean;
  readonly eqB?: (x: B, y: B) => boolean;
}

const defaultEq = <T>(x: T, y: T): boolean => Object.is(x, y);

export function hasInverse<A, B>(
  f: Morphism<A, B>,
  g: Morphism<B, A>,
  elemsA: ReadonlyArray<A>,
  elemsB: ReadonlyArray<B>,
  options: InverseCheckOptions<A, B> = {},
): boolean {
  const eqA = options.eqA ?? defaultEq<A>;
  const eqB = options.eqB ?? defaultEq<B>;
  const left = elemsA.every((a) => eqA(g(f(a)), a));
  const right = elemsB.every((b) => eqB(f(g(b)), b));
  return left && right;
}
