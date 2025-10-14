import type { GroupHomomorphism } from "../../../kinds/group-automorphism";

type Equality<A> = (x: A, y: A) => boolean;

const uniqueWith = <A>(values: ReadonlyArray<A>, eq: Equality<A>): A[] => {
  const result: A[] = [];
  for (const value of values) {
    if (!result.some((existing) => eq(existing, value))) {
      result.push(value);
    }
  }
  return result;
};

export interface InverseWitness<A, B> {
  readonly f: GroupHomomorphism<A, B>;
  readonly g: GroupHomomorphism<B, A>;
  readonly leftIdentity: boolean;
  readonly rightIdentity: boolean;
}

export function makeInverseWitness<A, B>(
  f: GroupHomomorphism<A, B>,
  g: GroupHomomorphism<B, A>,
  elemsA: ReadonlyArray<A>,
  elemsB: ReadonlyArray<B>,
): InverseWitness<A, B> {
  if (f.source !== g.target || f.target !== g.source) {
    return { f, g, leftIdentity: false, rightIdentity: false };
  }

  const eqA = f.source.eq as Equality<A>;
  const eqB = f.target.eq as Equality<B>;
  const domain = uniqueWith([f.source.identity, ...elemsA], eqA);
  const codomain = uniqueWith([f.target.identity, ...elemsB], eqB);

  const leftIdentity = domain.every((a) => eqA(g.map(f.map(a)), a));
  const rightIdentity = codomain.every((b) => eqB(f.map(g.map(b)), b));

  return { f, g, leftIdentity, rightIdentity };
}

export function isIsomorphismByInverse<A, B>(witness: InverseWitness<A, B>): boolean {
  return witness.leftIdentity && witness.rightIdentity;
}

export function checkIsInverse<A, B>(
  f: GroupHomomorphism<A, B>,
  g: GroupHomomorphism<B, A>,
  elemsA: ReadonlyArray<A>,
  elemsB: ReadonlyArray<B>,
): boolean {
  if (f.source !== g.target || f.target !== g.source) {
    return false;
  }

  const eqA = f.source.eq as Equality<A>;
  const eqB = f.target.eq as Equality<B>;
  const domain = uniqueWith([f.source.identity, ...elemsA], eqA);
  const codomain = uniqueWith([f.target.identity, ...elemsB], eqB);

  if (!eqA(g.map(f.target.identity), f.source.identity)) {
    return false;
  }

  for (const x of codomain) {
    for (const y of codomain) {
      const lhs = g.map(f.target.combine(x, y));
      const rhs = f.source.combine(g.map(x), g.map(y));
      if (!eqA(lhs, rhs)) {
        return false;
      }
    }
  }

  const leftIdentity = domain.every((a) => eqA(g.map(f.map(a)), a));
  if (!leftIdentity) {
    return false;
  }
  const rightIdentity = codomain.every((b) => eqB(f.map(g.map(b)), b));
  if (!rightIdentity) {
    return false;
  }

  return true;
}

export function tryBuildInverse<A, B>(
  f: GroupHomomorphism<A, B>,
  elemsA: ReadonlyArray<A>,
  elemsB: ReadonlyArray<B>,
): GroupHomomorphism<B, A> | null {
  const eqA = f.source.eq as Equality<A>;
  const eqB = f.target.eq as Equality<B>;
  const domain = uniqueWith([f.source.identity, ...elemsA], eqA);
  const codomain = uniqueWith([f.target.identity, ...elemsB], eqB);

  const pairs: Array<{ b: B; a: A }> = [];

  for (const a of domain) {
    const image = f.map(a);
    const existing = pairs.find((entry) => eqB(entry.b, image));
    if (existing) {
      if (!eqA(existing.a, a)) {
        return null;
      }
    } else {
      pairs.push({ b: image, a });
    }
  }

  for (const value of codomain) {
    if (!pairs.some((entry) => eqB(entry.b, value))) {
      return null;
    }
  }

  const candidate: GroupHomomorphism<B, A> = {
    source: f.target,
    target: f.source,
    map: (value: B) => {
      const entry = pairs.find((pair) => eqB(pair.b, value));
      if (!entry) {
        throw new Error("tryBuildInverse: value not covered by enumeration");
      }
      return entry.a;
    },
  };

  return checkIsInverse(f, candidate, domain, codomain) ? candidate : null;
}
