import type { DynHom, DynSys } from './dynsys';
import { MSetCat } from './mset';
import type { MSet, MSetHom, Monoid } from './mset';

export type M2 = number;

const ensureNat = (n: number): number => {
  if (!Number.isInteger(n) || n < 0) throw new Error(`M2: expected non-negative integer, received ${n}`);
  return n;
};

const iterate = <X>(n: number, step: (x: X) => X, x: X): X => {
  let result = x;
  for (let i = 0; i < n; i++) {
    result = step(result);
  }
  return result;
};

export const M2Monoid: Monoid<M2> = {
  e: 0,
  op: (a, b) => ensureNat(a) + ensureNat(b),
  elements: [0, 1, 2],
};

export const dynToM2 = <X>(system: DynSys<X>): MSet<M2, X> => ({
  M: M2Monoid,
  carrier: system.carrier,
  act: (m, x) => iterate(ensureNat(m), system.step, x),
});

export const m2ToDyn = <X>(structure: MSet<M2, X>): DynSys<X> => ({
  carrier: structure.carrier,
  step: (x) => structure.act(1, x),
});

export const dynHomToM2 = <X, Y>(h: DynHom<X, Y>): MSetHom<M2, X, Y> => ({
  dom: dynToM2(h.dom),
  cod: dynToM2(h.cod),
  map: h.map,
});

export const m2HomToDyn = <X, Y>(h: MSetHom<M2, X, Y>): DynHom<X, Y> => ({
  dom: m2ToDyn(h.dom),
  cod: m2ToDyn(h.cod),
  map: h.map,
});

type Equality<A> = (left: A, right: A) => boolean;

const includesWith = <A>(values: readonly A[], value: A, eq: Equality<A>): boolean =>
  values.some((candidate) => eq(candidate, value));

export interface M2Object<A> {
  readonly carrier: readonly A[];
  readonly endo: (a: A) => A;
  readonly eq: Equality<A>;
  readonly contains: (value: A) => boolean;
}

export const makeM2Object = <A>(input: {
  readonly carrier: readonly A[];
  readonly endo: (a: A) => A;
  readonly eq?: Equality<A>;
}): M2Object<A> => {
  const { carrier, endo, eq = Object.is } = input;
  const contains = (value: A): boolean => includesWith(carrier, value, eq);
  for (const value of carrier) {
    const image = endo(value);
    if (!contains(image)) {
      throw new Error('makeM2Object: endomorphism must preserve the declared carrier');
    }
    const twice = endo(image);
    if (!eq(twice, image)) {
      throw new Error('makeM2Object: endomorphism must be idempotent');
    }
  }
  return {
    carrier,
    endo,
    eq,
    contains,
  };
};

export interface M2Morphism<A, B> {
  readonly dom: M2Object<A>;
  readonly cod: M2Object<B>;
  readonly map: (value: A) => B;
}

export const isM2Morphism = <A, B>(morphism: M2Morphism<A, B>): boolean => {
  const { dom, cod, map } = morphism;
  for (const value of dom.carrier) {
    const mapped = map(value);
    if (!cod.contains(mapped)) {
      return false;
    }
    const image = map(dom.endo(value));
    const transported = cod.endo(mapped);
    if (!cod.eq(image, transported)) {
      return false;
    }
  }
  return true;
};

export const makeM2Morphism = <A, B>(input: {
  readonly dom: M2Object<A>;
  readonly cod: M2Object<B>;
  readonly map: (value: A) => B;
}): M2Morphism<A, B> => {
  const morphism: M2Morphism<A, B> = {
    dom: input.dom,
    cod: input.cod,
    map: input.map,
  };
  if (!isM2Morphism(morphism)) {
    throw new Error('makeM2Morphism: map must land in codomain and respect equivariance');
  }
  return morphism;
};

export const composeM2 = <A, B, C>(
  g: M2Morphism<B, C>,
  f: M2Morphism<A, B>,
): M2Morphism<A, C> => {
  if (f.cod !== g.dom) {
    throw new Error('composeM2: codomain/domain mismatch');
  }
  return {
    dom: f.dom,
    cod: g.cod,
    map: (value: A) => g.map(f.map(value)),
  };
};

type M2Pair<A, B> = readonly [A, B];

const makePairEq = <A, B>(left: M2Object<A>, right: M2Object<B>): Equality<M2Pair<A, B>> =>
  ([a1, b1], [a2, b2]) => left.eq(a1, a2) && right.eq(b1, b2);

export interface M2ProductWitness<A, B> {
  readonly object: M2Object<M2Pair<A, B>>;
  readonly projections: readonly [M2Morphism<M2Pair<A, B>, A>, M2Morphism<M2Pair<A, B>, B>];
  readonly tuple: <Z>(
    domain: M2Object<Z>,
    legs: readonly [M2Morphism<Z, A>, M2Morphism<Z, B>],
  ) => M2Morphism<Z, M2Pair<A, B>>;
}

export interface M2ProductInput<A, B> {
  readonly left: M2Object<A>;
  readonly right: M2Object<B>;
  readonly equaliser?: (pair: M2Pair<A, B>) => boolean;
}

const buildSubset = <A, B>(
  left: M2Object<A>,
  right: M2Object<B>,
  equaliser: (pair: M2Pair<A, B>) => boolean,
  pairEq: Equality<M2Pair<A, B>>,
): M2Pair<A, B>[] => {
  const subset: M2Pair<A, B>[] = [];
  for (const a of left.carrier) {
    for (const b of right.carrier) {
      const candidate: M2Pair<A, B> = [a, b];
      if (!equaliser(candidate)) {
        continue;
      }
      if (!includesWith(subset, candidate, pairEq)) {
        subset.push(candidate);
      }
    }
  }
  return subset;
};

export const productM2 = <A, B>(input: M2ProductInput<A, B>): M2ProductWitness<A, B> => {
  const { left, right, equaliser = () => true } = input;
  const pairEq = makePairEq(left, right);
  const rawSubset = buildSubset(left, right, equaliser, pairEq);
  const endo = ([a, b]: M2Pair<A, B>): M2Pair<A, B> => [left.endo(a), right.endo(b)];
  const object = makeM2Object<M2Pair<A, B>>({
    carrier: rawSubset,
    endo,
    eq: pairEq,
  });

  for (const value of object.carrier) {
    const image = endo(value);
    if (!object.contains(image)) {
      throw new Error('productM2: subset must be closed under the induced idempotent');
    }
  }

  const projections: readonly [M2Morphism<M2Pair<A, B>, A>, M2Morphism<M2Pair<A, B>, B>] = [
    makeM2Morphism({
      dom: object,
      cod: left,
      map: (value) => value[0],
    }),
    makeM2Morphism({
      dom: object,
      cod: right,
      map: (value) => value[1],
    }),
  ];

  const tuple = <Z>(
    domain: M2Object<Z>,
    legs: readonly [M2Morphism<Z, A>, M2Morphism<Z, B>],
  ): M2Morphism<Z, M2Pair<A, B>> => {
    if (legs.length !== 2) {
      throw new Error(`productM2.tuple: expected 2 legs, received ${legs.length}`);
    }
    const [leftLeg, rightLeg] = legs;
    if (leftLeg.cod !== left || rightLeg.cod !== right) {
      throw new Error('productM2.tuple: legs must target the defining factors');
    }
    const map = (value: Z): M2Pair<A, B> => {
      const candidate: M2Pair<A, B> = [leftLeg.map(value), rightLeg.map(value)];
      if (!object.contains(candidate)) {
        throw new Error('productM2.tuple: mediating pair must satisfy the equaliser constraint');
      }
      return candidate;
    };
    const mediator: M2Morphism<Z, M2Pair<A, B>> = {
      dom: domain,
      cod: object,
      map,
    };
    if (!isM2Morphism(mediator)) {
      throw new Error('productM2.tuple: mediator must respect the induced idempotent');
    }
    return mediator;
  };

  return {
    object,
    projections,
    tuple,
  };
};

export interface M2BinaryProductCheckInput<A, B, Z> {
  readonly product: M2ProductWitness<A, B>;
  readonly domain: M2Object<Z>;
  readonly legs: readonly [M2Morphism<Z, A>, M2Morphism<Z, B>];
}

export interface M2BinaryProductCheckResult {
  readonly holds: boolean;
  readonly issues: readonly string[];
}

export const equalM2Morphisms = <A, B>(
  left: M2Morphism<A, B>,
  right: M2Morphism<A, B>,
): boolean => {
  if (left.dom !== right.dom || left.cod !== right.cod) {
    return false;
  }
  for (const value of left.dom.carrier) {
    const mappedLeft = left.map(value);
    const mappedRight = right.map(value);
    if (!left.cod.eq(mappedLeft, mappedRight)) {
      return false;
    }
  }
  return true;
};

export const checkM2BinaryProduct = <A, B, Z>(
  input: M2BinaryProductCheckInput<A, B, Z>,
): M2BinaryProductCheckResult => {
  const { product, domain, legs } = input;
  const issues: string[] = [];

  if (product.object.carrier.length === 0) {
    issues.push('product: carrier must be non-empty to witness the idempotent image');
  }

  for (const value of product.object.carrier) {
    const image = product.object.endo(value);
    if (!product.object.contains(image)) {
      issues.push('product: induced idempotent must preserve the chosen subset');
      break;
    }
    const twice = product.object.endo(image);
    if (!product.object.eq(twice, image)) {
      issues.push('product: induced idempotent must be idempotent');
      break;
    }
  }

  if (legs.length !== 2) {
    issues.push(`universal property: expected 2 legs, received ${legs.length}`);
    return { holds: false, issues };
  }

  const [leftLeg, rightLeg] = legs;
  if (!isM2Morphism(leftLeg)) {
    issues.push('universal property: left leg fails equivariance');
  }
  if (!isM2Morphism(rightLeg)) {
    issues.push('universal property: right leg fails equivariance');
  }

  if (issues.length > 0) {
    return { holds: false, issues };
  }

  const mediator = product.tuple(domain, legs);
  const [piLeft, piRight] = product.projections;
  const composedLeft = composeM2(piLeft, mediator);
  const composedRight = composeM2(piRight, mediator);

  if (!equalM2Morphisms(composedLeft, leftLeg)) {
    issues.push('universal property: left projection ∘ mediator must recover the left leg');
  }
  if (!equalM2Morphisms(composedRight, rightLeg)) {
    issues.push('universal property: right projection ∘ mediator must recover the right leg');
  }

  const induced = makeM2Morphism({
    dom: domain,
    cod: product.object,
    map: (value) => product.object.endo(mediator.map(value)),
  });
  const composed = makeM2Morphism({
    dom: domain,
    cod: product.object,
    map: (value) => mediator.map(domain.endo(value)),
  });

  if (!equalM2Morphisms(induced, composed)) {
    issues.push('equation (*): ⟨j, k⟩ ∘ s must equal (f × g) ∘ ⟨j, k⟩');
  }

  return {
    holds: issues.length === 0,
    issues,
  };
};

export const M2SetCat = MSetCat(M2Monoid);
