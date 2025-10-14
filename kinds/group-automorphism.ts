export interface Group<Element> {
  readonly combine: (a: Element, b: Element) => Element;
  readonly identity: Element;
  readonly inverse: (a: Element) => Element;
  readonly eq: (a: Element, b: Element) => boolean;
}

export interface GroupHomomorphism<Domain, Codomain> {
  readonly source: Group<Domain>;
  readonly target: Group<Codomain>;
  readonly map: (value: Domain) => Codomain;
}

export interface GroupIsomorphism<Domain, Codomain> extends GroupHomomorphism<Domain, Codomain> {
  readonly inverseMap: (value: Codomain) => Domain;
}

/** An automorphism is an isomorphism from a group to itself. */
export type GroupAutomorphism<Element> = GroupIsomorphism<Element, Element>;

export const isGroupHomomorphism = <Domain, Codomain>(
  hom: GroupHomomorphism<Domain, Codomain>,
  samples: ReadonlyArray<Domain>,
): boolean => {
  const { source, target, map } = hom;
  if (!target.eq(map(source.identity), target.identity)) {
    return false;
  }
  for (const a of samples) {
    for (const b of samples) {
      const mappedProduct = map(source.combine(a, b));
      const productOfImages = target.combine(map(a), map(b));
      if (!target.eq(mappedProduct, productOfImages)) {
        return false;
      }
    }
  }
  return true;
};

export const isGroupIsomorphism = <Domain, Codomain>(
  iso: GroupIsomorphism<Domain, Codomain>,
  samplesDomain: ReadonlyArray<Domain>,
  samplesCodomain: ReadonlyArray<Codomain>,
): boolean => {
  if (!isGroupHomomorphism(iso, samplesDomain)) {
    return false;
  }
  const inverseHom: GroupHomomorphism<Codomain, Domain> = {
    source: iso.target,
    target: iso.source,
    map: iso.inverseMap,
  };
  if (!isGroupHomomorphism(inverseHom, samplesCodomain)) {
    return false;
  }
  for (const value of samplesDomain) {
    const roundTrip = iso.inverseMap(iso.map(value));
    if (!iso.source.eq(roundTrip, value)) {
      return false;
    }
  }
  for (const value of samplesCodomain) {
    const roundTrip = iso.map(iso.inverseMap(value));
    if (!iso.target.eq(roundTrip, value)) {
      return false;
    }
  }
  return true;
};

export const isGroupAutomorphism = <Element>(
  iso: GroupAutomorphism<Element>,
  samples: ReadonlyArray<Element>,
): boolean => isGroupIsomorphism(iso, samples, samples);

export interface Rational {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

const gcd = (a: bigint, b: bigint): bigint => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
};

const normalise = (numerator: bigint, denominator: bigint): Rational => {
  if (denominator === 0n) {
    throw new Error("Rational denominator cannot be zero");
  }
  if (numerator === 0n) {
    return { numerator: 0n, denominator: 1n };
  }
  const sign = denominator < 0n ? -1n : 1n;
  const factor = gcd(numerator, denominator);
  const num = (numerator / factor) * sign;
  const den = (denominator / factor) * sign;
  return { numerator: num, denominator: den };
};

export const rational = (numerator: bigint, denominator: bigint = 1n): Rational =>
  normalise(numerator, denominator);

const addRational = (a: Rational, b: Rational): Rational =>
  normalise(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);

const multiplyRational = (a: Rational, b: Rational): Rational =>
  normalise(a.numerator * b.numerator, a.denominator * b.denominator);

const reciprocalRational = (value: Rational): Rational => {
  if (value.numerator === 0n) {
    throw new Error("Zero has no multiplicative inverse");
  }
  return value.numerator > 0n
    ? { numerator: value.denominator, denominator: value.numerator }
    : { numerator: -value.denominator, denominator: -value.numerator };
};

const eqRational = (a: Rational, b: Rational): boolean =>
  a.numerator === b.numerator && a.denominator === b.denominator;

/** The additive group of integers (ℤ, +). */
export const IntegerAdditionGroup: Group<bigint> = {
  combine: (a, b) => a + b,
  identity: 0n,
  inverse: (a) => -a,
  eq: (a, b) => a === b,
};

/** The additive group of rationals (ℚ, +) represented as reduced fractions. */
export const RationalAdditionGroup: Group<Rational> = {
  combine: addRational,
  identity: rational(0n, 1n),
  inverse: (value) => ({ numerator: -value.numerator, denominator: value.denominator }),
  eq: eqRational,
};

export const integerSamples: ReadonlyArray<bigint> = Object.freeze([-2n, -1n, 0n, 1n, 2n]);

export const rationalSamples: ReadonlyArray<Rational> = Object.freeze([
  rational(0n, 1n),
  rational(1n, 2n),
  rational(-3n, 4n),
  rational(5n, 3n),
]);

/** Identity automorphism on the additive group of integers. */
export const identityAutomorphismZ: GroupAutomorphism<bigint> = {
  source: IntegerAdditionGroup,
  target: IntegerAdditionGroup,
  map: (x) => x,
  inverseMap: (x) => x,
};

/** Negation automorphism on the additive group of integers. */
export const negationAutomorphismZ: GroupAutomorphism<bigint> = {
  source: IntegerAdditionGroup,
  target: IntegerAdditionGroup,
  map: (x) => -x,
  inverseMap: (x) => -x,
};

/** Scaling by a nonzero rational gives an automorphism of (ℚ, +). */
export const scalingAutomorphismQ = (scale: Rational): GroupAutomorphism<Rational> => {
  if (scale.numerator === 0n) {
    throw new Error("Scaling by zero is not a group automorphism");
  }
  const inverseScale = reciprocalRational(scale);
  return {
    source: RationalAdditionGroup,
    target: RationalAdditionGroup,
    map: (value) => multiplyRational(scale, value),
    inverseMap: (value) => multiplyRational(inverseScale, value),
  };
};

export const verifyIntegerAutomorphisms = (): boolean =>
  isGroupAutomorphism(identityAutomorphismZ, integerSamples) &&
  isGroupAutomorphism(negationAutomorphismZ, integerSamples);

export const verifyScalingAutomorphism = (scale: Rational): boolean =>
  isGroupAutomorphism(scalingAutomorphismQ(scale), rationalSamples);
