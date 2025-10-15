export type Rel<A, B> = ReadonlySet<readonly [A, B]>;

export function makeRel<A, B>(pairs: Iterable<readonly [A, B]>): Rel<A, B> {
  const bucket = new Map<A, Set<B>>();
  for (const [a, b] of pairs) {
    const bs = bucket.get(a);
    if (bs) {
      bs.add(b);
    } else {
      bucket.set(a, new Set([b]));
    }
  }
  const result = new Set<readonly [A, B]>();
  for (const [a, bs] of bucket) {
    for (const b of bs) {
      result.add([a, b]);
    }
  }
  return result;
}

function hasPair<A, B>(rel: Rel<A, B>, pair: readonly [A, B]): boolean {
  for (const candidate of rel) {
    if (candidate[0] === pair[0] && candidate[1] === pair[1]) {
      return true;
    }
  }
  return false;
}

export function relEquals<A, B>(left: Rel<A, B>, right: Rel<A, B>): boolean {
  if (left.size !== right.size) return false;
  for (const pair of left) {
    if (!hasPair(right, pair)) return false;
  }
  for (const pair of right) {
    if (!hasPair(left, pair)) return false;
  }
  return true;
}

export function emptyRelation<A, B>(): Rel<A, B> {
  return makeRel<A, B>([]);
}

export function initialRelation<B>(target: ReadonlyArray<B>): Rel<never, B> {
  void target;
  return emptyRelation<never, B>();
}

export function terminalRelation<A>(source: ReadonlyArray<A>): Rel<A, never> {
  void source;
  return emptyRelation<A, never>();
}

export function idRel<A>(carrier: Iterable<A>): Rel<A, A> {
  const seen = new Set<A>();
  const result = new Set<readonly [A, A]>();
  for (const a of carrier) {
    if (!seen.has(a)) {
      seen.add(a);
      result.add([a, a]);
    }
  }
  return result;
}

export function composeRel<A, B, C>(r: Rel<A, B>, s: Rel<B, C>): Rel<A, C> {
  const bucket = new Map<A, Set<C>>();
  for (const [a, b] of r) {
    for (const [b2, c] of s) {
      if (b === b2) {
        const cs = bucket.get(a);
        if (cs) {
          cs.add(c);
        } else {
          bucket.set(a, new Set([c]));
        }
      }
    }
  }
  const result = new Set<readonly [A, C]>();
  for (const [a, cs] of bucket) {
    for (const c of cs) {
      result.add([a, c]);
    }
  }
  return result;
}

export const RelCat = {
  obj: <A>(carrier: ReadonlyArray<A>): ReadonlyArray<A> => carrier,
  id: idRel,
  hom: <A, B>(dom: ReadonlyArray<A>, cod: ReadonlyArray<B>, pairs: ReadonlyArray<readonly [A, B]>) => {
    const domainSet = new Set(dom);
    const codomainSet = new Set(cod);
    for (const [a, b] of pairs) {
      if (!domainSet.has(a) || !codomainSet.has(b)) {
        throw new Error('Rel: morphism pairs must reference declared carriers');
      }
    }
    return makeRel(pairs);
  },
  compose: composeRel,
};
