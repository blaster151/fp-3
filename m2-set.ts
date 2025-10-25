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

const findIndexWith = <A>(values: readonly A[], value: A, eq: Equality<A>): number => {
  for (let index = 0; index < values.length; index++) {
    if (eq(values[index]!, value)) {
      return index;
    }
  }
  return -1;
};

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

const normaliseElement = <A>(object: M2Object<A>, value: A): A => {
  for (const candidate of object.carrier) {
    if (object.eq(candidate, value)) {
      return candidate;
    }
  }
  throw new Error('M2.exponential: encountered value outside the declared carrier');
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

const signatureFromOutputs = <B>(codomain: M2Object<B>, outputs: readonly B[]): string =>
  outputs
    .map((value) => {
      const index = findIndexWith(codomain.carrier, value, codomain.eq);
      if (index < 0) {
        throw new Error('M2.exponential: output not recognised in the codomain carrier');
      }
      return String(index);
    })
    .join('|');

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

interface M2FunctionRecord<B, C> {
  readonly morphism: M2Morphism<B, C>;
  readonly table: readonly C[];
  readonly signature: string;
}

export interface M2ExponentialWitness<B, C> {
  readonly base: M2Object<B>;
  readonly codomain: M2Object<C>;
  readonly object: M2Object<M2Morphism<B, C>>;
  readonly product: M2ProductWitness<M2Morphism<B, C>, B>;
  readonly evaluation: M2Morphism<M2Pair<M2Morphism<B, C>, B>, C>;
  readonly curry: <A>(input: {
    readonly domain: M2Object<A>;
    readonly product: M2ProductWitness<A, B>;
    readonly arrow: M2Morphism<M2Pair<A, B>, C>;
  }) => M2Morphism<A, M2Morphism<B, C>>;
}

export interface M2ExponentialComparison<B, C> {
  readonly leftToRight: M2Morphism<M2Morphism<B, C>, M2Morphism<B, C>>;
  readonly rightToLeft: M2Morphism<M2Morphism<B, C>, M2Morphism<B, C>>;
}

const enumerateEquivariantMaps = <B, C>(
  base: M2Object<B>,
  codomain: M2Object<C>,
): M2FunctionRecord<B, C>[] => {
  const records: M2FunctionRecord<B, C>[] = [];
  const buffer: C[] = new Array(base.carrier.length);

  const explore = (index: number) => {
    if (index === base.carrier.length) {
      const table = buffer.slice();
      const map = (value: B): C => {
        const position = findIndexWith(base.carrier, value, base.eq);
        if (position < 0) {
          throw new Error('M2.exponential: unrecognised argument in the base carrier');
        }
        return table[position]!;
      };

      try {
        const morphism = makeM2Morphism({ dom: base, cod: codomain, map });
        const signature = signatureFromOutputs(codomain, table);
        if (!records.some((record) => equalM2Morphisms(record.morphism, morphism))) {
          records.push({ morphism, table, signature });
        }
      } catch {
        // Ignore non-equivariant assignments
      }
      return;
    }

    for (const candidate of codomain.carrier) {
      buffer[index] = candidate;
      explore(index + 1);
    }
  };

  explore(0);
  return records;
};

const buildM2Exponential = <B, C>(input: {
  readonly base: M2Object<B>;
  readonly codomain: M2Object<C>;
}): M2ExponentialWitness<B, C> => {
  const { base, codomain } = input;

  const records = enumerateEquivariantMaps(base, codomain);
  if (records.length === 0) {
    throw new Error('M2.exponential: no equivariant maps exist between the supplied objects');
  }
  const lookupBySignature = new Map<string, M2Morphism<B, C>>();
  const tableByMorphism = new Map<M2Morphism<B, C>, readonly C[]>();

  for (const record of records) {
    lookupBySignature.set(record.signature, record.morphism);
    tableByMorphism.set(record.morphism, record.table);
  }

  const object = makeM2Object<M2Morphism<B, C>>({
    carrier: records.map((record) => record.morphism),
    endo: (func) => {
      const table = tableByMorphism.get(func);
      if (!table) {
        throw new Error('M2.exponential: encountered an untracked function element');
      }
      const transported = table.map((value) => normaliseElement(codomain, codomain.endo(value)));
      const signature = signatureFromOutputs(codomain, transported);
      const image = lookupBySignature.get(signature);
      if (!image) {
        throw new Error('M2.exponential: endomorphism does not preserve the exponential carrier');
      }
      return image;
    },
    eq: equalM2Morphisms,
  });

  const product = productM2({ left: object, right: base });

  const evaluation = makeM2Morphism({
    dom: product.object,
    cod: codomain,
    map: ([func, argument]) => func.map(argument),
  });

  const curry = <A>(inputCurry: {
    readonly domain: M2Object<A>;
    readonly product: M2ProductWitness<A, B>;
    readonly arrow: M2Morphism<M2Pair<A, B>, C>;
  }): M2Morphism<A, M2Morphism<B, C>> => {
    const { domain, product: domainProduct, arrow } = inputCurry;
    if (arrow.dom !== domainProduct.object) {
      throw new Error('M2.exponential.curry: arrow domain must be the supplied product');
    }
    if (arrow.cod !== codomain) {
      throw new Error('M2.exponential.curry: arrow codomain must be the exponential codomain');
    }
    if (domainProduct.projections[0]?.cod !== domain) {
      throw new Error('M2.exponential.curry: product must project to the supplied domain');
    }
    if (domainProduct.projections[1]?.cod !== base) {
      throw new Error('M2.exponential.curry: product must project to the exponential base');
    }
    if (!isM2Morphism(arrow)) {
      throw new Error('M2.exponential.curry: arrow must be an equivariant morphism');
    }

    const assignments = new Map<A, M2Morphism<B, C>>();

    for (const rawElement of domain.carrier) {
      const element = normaliseElement(domain, rawElement);
      const outputs = base.carrier.map((argument) => {
        const pair: M2Pair<A, B> = [element, argument];
        if (!domainProduct.object.contains(pair)) {
          throw new Error('M2.exponential.curry: product carrier missing expected pair');
        }
        const image = arrow.map(pair);
        return normaliseElement(codomain, image);
      });

      const signature = signatureFromOutputs(codomain, outputs);
      const witness = lookupBySignature.get(signature);
      if (!witness) {
        throw new Error('M2.exponential.curry: assignment does not yield an equivariant map');
      }
      const canonicalWitness = normaliseElement(object, witness);
      assignments.set(element, canonicalWitness);
    }

    return makeM2Morphism({
      dom: domain,
      cod: object,
      map: (value) => {
        const canonical = normaliseElement(domain, value);
        const func = assignments.get(canonical);
        if (!func) {
          throw new Error('M2.exponential.curry: mediator undefined on the provided element');
        }
        const stabilised = object.endo(func);
        return normaliseElement(object, stabilised);
      },
    });
  };

  return {
    base,
    codomain,
    object,
    product,
    evaluation,
    curry: <A>(inputCurry: {
      readonly domain: M2Object<A>;
      readonly product: M2ProductWitness<A, B>;
      readonly arrow: M2Morphism<M2Pair<A, B>, C>;
    }): M2Morphism<A, M2Morphism<B, C>> => {
      const mediator = curry(inputCurry);

      const domainProduct = inputCurry.product;
      const lambdaTimesId = product.tuple(domainProduct.object, [
        composeM2(mediator, domainProduct.projections[0]!),
        domainProduct.projections[1]!,
      ]);
      const recovered = composeM2(evaluation, lambdaTimesId);
      if (!equalM2Morphisms(recovered, inputCurry.arrow)) {
        throw new Error('M2.exponential.curry: evaluation must recover the supplied arrow');
      }

      return mediator;
    },
  };
};

export const makeM2Exponential = buildM2Exponential;

export const exponentialM2 = buildM2Exponential;

export const curryM2Exponential = <A, B, C>(input: {
  readonly exponential: M2ExponentialWitness<B, C>;
  readonly domain: M2Object<A>;
  readonly product: M2ProductWitness<A, B>;
  readonly arrow: M2Morphism<M2Pair<A, B>, C>;
}): M2Morphism<A, M2Morphism<B, C>> =>
  input.exponential.curry({
    domain: input.domain,
    product: input.product,
    arrow: input.arrow,
  });

export const m2ExponentialComparison = <B, C>(input: {
  readonly base: M2Object<B>;
  readonly codomain: M2Object<C>;
  readonly left: M2ExponentialWitness<B, C>;
  readonly right: M2ExponentialWitness<B, C>;
}): M2ExponentialComparison<B, C> => {
  const { base, codomain, left, right } = input;

  const ensureWitness = (label: string, witness: M2ExponentialWitness<B, C>) => {
    if (witness.base !== base) {
      throw new Error(`M2.exponentialComparison: ${label} witness is not parameterised by the supplied base object`);
    }
    if (witness.codomain !== codomain) {
      throw new Error(`M2.exponentialComparison: ${label} witness does not evaluate into the supplied codomain`);
    }
    const [projectionToFunctions, projectionToBase] = witness.product.projections;
    if (projectionToBase.cod !== base) {
      throw new Error(`M2.exponentialComparison: ${label} witness is not parameterised by the supplied base object`);
    }
    if (projectionToFunctions.cod !== witness.object) {
      throw new Error(`M2.exponentialComparison: ${label} witness exposes an unexpected function object`);
    }
    if (witness.evaluation.dom !== witness.product.object) {
      throw new Error(`M2.exponentialComparison: ${label} witness has an evaluation arrow with a mismatched domain`);
    }
    if (witness.evaluation.cod !== witness.codomain) {
      throw new Error(`M2.exponentialComparison: ${label} witness does not evaluate into its declared codomain`);
    }
  };

  ensureWitness('left', left);
  ensureWitness('right', right);

  const leftToRight = right.curry({
    domain: left.object,
    product: left.product,
    arrow: left.evaluation,
  });
  const rightToLeft = left.curry({
    domain: right.object,
    product: right.product,
    arrow: right.evaluation,
  });

  if (!isM2Morphism(leftToRight)) {
    throw new Error('M2.exponentialComparison: mediator from left to right fails equivariance');
  }
  if (!isM2Morphism(rightToLeft)) {
    throw new Error('M2.exponentialComparison: mediator from right to left fails equivariance');
  }

  for (const func of left.object.carrier) {
    const image = leftToRight.map(func);
    if (!right.object.contains(image)) {
      throw new Error('M2.exponentialComparison: mediator from left to right leaves the right function object');
    }
    for (const argument of base.carrier) {
      const leftPair: M2Pair<M2Morphism<B, C>, B> = [func, argument];
      if (!left.product.object.contains(leftPair)) {
        throw new Error('M2.exponentialComparison: encountered a pair outside the left evaluation domain');
      }
      const rightPair: M2Pair<M2Morphism<B, C>, B> = [image, argument];
      if (!right.product.object.contains(rightPair)) {
        throw new Error('M2.exponentialComparison: encountered a pair outside the right evaluation domain');
      }
      const leftValue = left.evaluation.map(leftPair);
      const rightValue = right.evaluation.map(rightPair);
      if (!codomain.eq(leftValue, rightValue)) {
        throw new Error('M2.exponentialComparison: factoring the left evaluation through the right witness failed');
      }
    }
  }

  for (const func of right.object.carrier) {
    const image = rightToLeft.map(func);
    if (!left.object.contains(image)) {
      throw new Error('M2.exponentialComparison: mediator from right to left leaves the left function object');
    }
    for (const argument of base.carrier) {
      const rightPair: M2Pair<M2Morphism<B, C>, B> = [func, argument];
      if (!right.product.object.contains(rightPair)) {
        throw new Error('M2.exponentialComparison: encountered a pair outside the right evaluation domain');
      }
      const leftPair: M2Pair<M2Morphism<B, C>, B> = [image, argument];
      if (!left.product.object.contains(leftPair)) {
        throw new Error('M2.exponentialComparison: encountered a pair outside the left evaluation domain');
      }
      const rightValue = right.evaluation.map(rightPair);
      const leftValue = left.evaluation.map(leftPair);
      if (!codomain.eq(rightValue, leftValue)) {
        throw new Error('M2.exponentialComparison: factoring the right evaluation through the left witness failed');
      }
    }
  }

  for (const func of left.object.carrier) {
    const roundTrip = rightToLeft.map(leftToRight.map(func));
    if (!left.object.eq(roundTrip, func)) {
      throw new Error('M2.exponentialComparison: mediators do not reduce to the identity on the left witness');
    }
  }

  for (const func of right.object.carrier) {
    const roundTrip = leftToRight.map(rightToLeft.map(func));
    if (!right.object.eq(roundTrip, func)) {
      throw new Error('M2.exponentialComparison: mediators do not reduce to the identity on the right witness');
    }
  }

  return { leftToRight, rightToLeft };
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
