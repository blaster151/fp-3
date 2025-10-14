/** Finite (normalized) probability distributions over a finite support. */
export type Prob = number;

export type Dist<X> = Array<{ x: X; p: Prob }>;

const EPS = 1e-9;

export function normalize<X>(xs: Dist<X>): Dist<X> {
  const mass = new Map<X, Prob>();
  for (const { x, p } of xs) {
    mass.set(x, (mass.get(x) ?? 0) + p);
  }
  const total = Array.from(mass.values()).reduce((acc, p) => acc + p, 0);
  if (Math.abs(total) < EPS) return [];
  return Array.from(mass.entries()).map(([x, p]) => ({ x, p: p / total }));
}

export function support<X>(d: Dist<X>): X[] {
  return d.map(({ x }) => x);
}

export function eqDist<X>(eq: (a: X, b: X) => boolean, A: Dist<X>, B: Dist<X>, eps = 1e-7): boolean {
  const n1 = normalize(A);
  const n2 = normalize(B);
  if (n1.length !== n2.length) return false;
  return n1.every(({ x, p }) => {
    const q = n2.find(({ x: y }) => eq(x, y))?.p ?? NaN;
    return Math.abs(p - q) < eps;
  });
}

export const DistMonad = {
  of<X>(x: X): Dist<X> {
    return [{ x, p: 1 }];
  },
  chain<A, B>(ma: Dist<A>, f: (a: A) => Dist<B>): Dist<B> {
    const out: Dist<B> = [];
    for (const { x: a, p } of ma) {
      for (const { x: b, p: pb } of f(a)) {
        out.push({ x: b, p: p * pb });
      }
    }
    return normalize(out);
  },
  map<A, B>(ma: Dist<A>, f: (a: A) => B): Dist<B> {
    return DistMonad.chain(ma, a => DistMonad.of(f(a)));
  },
  ap<A, B>(mf: Dist<(a: A) => B>, ma: Dist<A>): Dist<B> {
    return DistMonad.chain(mf, f => DistMonad.map(ma, f));
  }
};
