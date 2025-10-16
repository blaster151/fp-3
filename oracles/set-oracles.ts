import type { AnySet, SetObj, SetHom, SetCoproductValue } from "../set-cat";
import { SetCat } from "../set-cat";
import {
  agreeUnderInjections,
  agreeUnderProjections,
  checkBinaryProductComponentwiseCollapse,
  coproductMediates,
  productMediates,
  type BinaryProductTuple,
  type CategoryWithCompose,
  type CategoryWithDomCod,
  type IndexedFamily,
} from "../category-limits-helpers";

type AnySetObj = AnySet<unknown>;
type AnySetHom = SetHom<unknown, unknown>;

export type OracleReport<TExtra = Record<string, unknown>> = {
  holds: boolean;
  failures: string[];
  details: TExtra;
};

const EMPTY = new Set<never>();
const ONE = new Set([null]);

const homCount = <X, Y>(domain: AnySet<X>, codomain: AnySet<Y>): number =>
  Math.pow(codomain.size, domain.size);

type BinaryIndex = 0 | 1;

const PRODUCT_INDICES: ReadonlyArray<BinaryIndex> = [0, 1];
const COPRODUCT_INDICES: ReadonlyArray<BinaryIndex> = [0, 1];

const toAnySetObj = <A>(obj: SetObj<A>): AnySetObj => obj as unknown as AnySetObj;
const toAnySetHom = <A, B>(hom: SetHom<A, B>): AnySetHom => hom as unknown as AnySetHom;

const equalAnySetHom = (f: AnySetHom, g: AnySetHom): boolean => {
  if (f.dom !== g.dom || f.cod !== g.cod) return false;
  for (const value of f.dom as AnySetObj) {
    const left = f.map(value as never);
    const right = g.map(value as never);
    if (!Object.is(left, right)) {
      return false;
    }
  }
  return true;
};

const equalSetHom = <A, B>(f: SetHom<A, B>, g: SetHom<A, B>): boolean =>
  equalAnySetHom(toAnySetHom(f), toAnySetHom(g));

const setCategoryWithDomCod: CategoryWithDomCod<AnySetObj, AnySetHom> = {
  compose: SetCat.compose as unknown as (g: AnySetHom, f: AnySetHom) => AnySetHom,
  dom: (hom) => toAnySetObj(hom.dom),
  cod: (hom) => toAnySetObj(hom.cod),
};

const setCategoryForCompose: CategoryWithCompose<AnySetHom> = {
  compose: SetCat.compose as unknown as (g: AnySetHom, f: AnySetHom) => AnySetHom,
};

const canonicalProductPair = <A, B>(
  product: AnySet<readonly [A, B]>,
  left: A,
  right: B,
): readonly [A, B] => {
  for (const pair of product) {
    if (pair[0] === left && pair[1] === right) {
      return pair;
    }
  }
  throw new Error("SetOracles: canonical product pair not found in carrier");
};

const tupleIntoProduct = <X, A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  product: SetObj<readonly [A, B]>,
  domain: SetObj<X>,
  legs: readonly [SetHom<X, A>, SetHom<X, B>],
): SetHom<X, readonly [A, B]> => {
  const [leftLeg, rightLeg] = legs;
  if (leftLeg.dom !== domain || rightLeg.dom !== domain) {
    throw new Error("SetOracles: tuple expects legs to share the declared domain");
  }
  if (leftLeg.cod !== left) {
    throw new Error("SetOracles: left leg must land in the left factor");
  }
  if (rightLeg.cod !== right) {
    throw new Error("SetOracles: right leg must land in the right factor");
  }

  return {
    dom: domain,
    cod: product,
    map: (value) => {
      if (!domain.has(value)) {
        throw new Error("SetOracles: tuple received element outside domain");
      }
      const leftImage = leftLeg.map(value);
      const rightImage = rightLeg.map(value);
      if (!left.has(leftImage)) {
        throw new Error("SetOracles: left leg escaped declared codomain");
      }
      if (!right.has(rightImage)) {
        throw new Error("SetOracles: right leg escaped declared codomain");
      }
      return canonicalProductPair(product, leftImage, rightImage);
    },
  };
};

export interface SetProductSampleSpec<X, A, B> {
  readonly label?: string;
  readonly domain: SetObj<X>;
  readonly legs: readonly [SetHom<X, A>, SetHom<X, B>];
  readonly mediator?: SetHom<X, readonly [A, B]>;
  readonly competitor?: SetHom<X, readonly [A, B]>;
}

interface SetProductSample<A, B> {
  readonly label: string;
  readonly domain: SetObj<unknown>;
  readonly legs: readonly [SetHom<unknown, A>, SetHom<unknown, B>];
  readonly mediator: SetHom<unknown, readonly [A, B]>;
  readonly canonical: SetHom<unknown, readonly [A, B]>;
  readonly competitor?: SetHom<unknown, readonly [A, B]>;
}

export interface SetProductWitness<A, B> {
  readonly left: SetObj<A>;
  readonly right: SetObj<B>;
  readonly product: SetObj<readonly [A, B]>;
  readonly projections: readonly [SetHom<readonly [A, B], A>, SetHom<readonly [A, B], B>];
  readonly tuple: <X>(
    domain: SetObj<X>,
    legs: readonly [SetHom<X, A>, SetHom<X, B>],
  ) => SetHom<X, readonly [A, B]>;
  readonly samples: ReadonlyArray<SetProductSample<A, B>>;
}

const asBinaryProductTuple = <A, B>(
  witness: SetProductWitness<A, B>,
): BinaryProductTuple<AnySetObj, AnySetHom> => ({
  object: toAnySetObj(witness.product),
  projections: [
    toAnySetHom(witness.projections[0]),
    toAnySetHom(witness.projections[1]),
  ],
  tuple: (domain, legs) =>
    toAnySetHom(
      witness.tuple(domain as SetObj<unknown>, [
        legs[0] as unknown as SetHom<unknown, A>,
        legs[1] as unknown as SetHom<unknown, B>,
      ]),
    ),
});

const sampleLegsAsMorphisms = <A, B>(
  sample: SetProductSample<A, B>,
): readonly [AnySetHom, AnySetHom] => [
  toAnySetHom(sample.legs[0]),
  toAnySetHom(sample.legs[1]),
] as const;

const productProjectionsAsMorphisms = <A, B>(
  witness: SetProductWitness<A, B>,
): readonly [AnySetHom, AnySetHom] => [
  toAnySetHom(witness.projections[0]),
  toAnySetHom(witness.projections[1]),
] as const;

const coproductInjectionsAsMorphisms = <A, B>(
  witness: SetCoproductWitness<A, B>,
): readonly [AnySetHom, AnySetHom] => [
  toAnySetHom(witness.injections[0]),
  toAnySetHom(witness.injections[1]),
] as const;

const sampleCotuplesAsMorphisms = <A, B>(
  sample: SetCoproductSample<A, B>,
): readonly [AnySetHom, AnySetHom] => [
  toAnySetHom(sample.legs[0]),
  toAnySetHom(sample.legs[1]),
] as const;

type ProductOracleSampleReport = {
  readonly label: string;
  readonly trianglesHold: boolean;
  readonly matchesCanonical: boolean;
  readonly projectionAgreement: boolean;
  readonly componentwiseCollapse: boolean;
  readonly competitor?: {
    readonly trianglesHold: boolean;
    readonly matchesCanonical: boolean;
    readonly projectionAgreement: boolean;
  };
};

export const productUniversalPropertyWitness = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  samples: ReadonlyArray<SetProductSampleSpec<any, A, B>> = [],
): SetProductWitness<A, B> => {
  const product = SetCat.product(left, right);
  const projection1 = SetCat.hom(product, left, (pair) => pair[0]!);
  const projection2 = SetCat.hom(product, right, (pair) => pair[1]!);
  const tuple = <X>(
    domain: SetObj<X>,
    legs: readonly [SetHom<X, A>, SetHom<X, B>],
  ): SetHom<X, readonly [A, B]> => tupleIntoProduct(left, right, product, domain, legs);

  const preparedSamples = samples.map((spec, index) => {
    const canonical = tuple(spec.domain, spec.legs);
    const mediator = spec.mediator ?? canonical;
    const competitor = spec.competitor
      ? (spec.competitor as SetHom<unknown, readonly [A, B]>)
      : undefined;
    return {
      label: spec.label ?? `sample-${index}`,
      domain: spec.domain as SetObj<unknown>,
      legs: [
        spec.legs[0] as unknown as SetHom<unknown, A>,
        spec.legs[1] as unknown as SetHom<unknown, B>,
      ] as const,
      mediator: mediator as SetHom<unknown, readonly [A, B]>,
      canonical: canonical as SetHom<unknown, readonly [A, B]>,
      ...(competitor ? { competitor } : {}),
    } satisfies SetProductSample<A, B>;
  });

  return {
    left,
    right,
    product,
    projections: [projection1, projection2],
    tuple,
    samples: preparedSamples,
  };
};

export const checkProductUniversalProperty = <A, B>(
  witness: SetProductWitness<A, B>,
): OracleReport<{ samples: ReadonlyArray<ProductOracleSampleReport> }> => {
  const failures: string[] = [];

  const binaryTuple = asBinaryProductTuple(witness);
  const projectionMorphisms = productProjectionsAsMorphisms(witness);
  const samples: ProductOracleSampleReport[] = witness.samples.map((sample) => {
    const projectionFamily: IndexedFamily<BinaryIndex, AnySetHom> = (index) =>
      projectionMorphisms[index]!;
    const legMorphisms = sampleLegsAsMorphisms(sample);
    const legsFamily: IndexedFamily<BinaryIndex, AnySetHom> = (index) =>
      legMorphisms[index]!;
    const mediatorHom = toAnySetHom(sample.mediator);
    const canonicalHom = toAnySetHom(sample.canonical);

    const trianglesHold = productMediates(
      setCategoryWithDomCod,
      equalAnySetHom,
      projectionFamily,
      mediatorHom,
      { tip: toAnySetObj(sample.domain), legs: legsFamily },
      PRODUCT_INDICES,
    );

    const matchesCanonical = equalAnySetHom(mediatorHom, canonicalHom);

    const projectionAgreement = agreeUnderProjections(
      setCategoryForCompose,
      equalAnySetHom,
      projectionFamily,
      mediatorHom,
      canonicalHom,
      PRODUCT_INDICES,
    );

    const componentwiseCollapse = checkBinaryProductComponentwiseCollapse({
      category: { compose: setCategoryWithDomCod.compose, eq: equalAnySetHom },
      source: binaryTuple,
      target: binaryTuple,
      componentwise: toAnySetHom(SetCat.id(witness.product)),
      components: [
        toAnySetHom(SetCat.id(witness.left)),
        toAnySetHom(SetCat.id(witness.right)),
      ],
      domain: toAnySetObj(sample.domain),
      legs: legMorphisms,
    });

    const sampleFailures: string[] = [];
    if (!trianglesHold) {
      sampleFailures.push(`${sample.label}: mediator fails product triangles`);
    }
    if (!matchesCanonical) {
      sampleFailures.push(`${sample.label}: mediator does not equal canonical pairing`);
    }

    let competitorReport: ProductOracleSampleReport["competitor"] | undefined;
    if (sample.competitor) {
      const competitorHom = toAnySetHom(sample.competitor);
      const competitorTriangles = productMediates(
        setCategoryWithDomCod,
        equalAnySetHom,
        projectionFamily,
        competitorHom,
        { tip: toAnySetObj(sample.domain), legs: legsFamily },
        PRODUCT_INDICES,
      );
      const competitorMatches = equalAnySetHom(competitorHom, canonicalHom);
      const competitorAgreement = agreeUnderProjections(
        setCategoryForCompose,
        equalAnySetHom,
        projectionFamily,
        competitorHom,
        canonicalHom,
        PRODUCT_INDICES,
      );

      competitorReport = {
        trianglesHold: competitorTriangles,
        matchesCanonical: competitorMatches,
        projectionAgreement: competitorAgreement,
      };

      if (competitorTriangles && !competitorMatches) {
        sampleFailures.push(`${sample.label}: competing mediator violates uniqueness`);
      }
    }

    failures.push(...sampleFailures);

    return {
      label: sample.label,
      trianglesHold,
      matchesCanonical,
      projectionAgreement,
      componentwiseCollapse,
      ...(competitorReport ? { competitor: competitorReport } : {}),
    } satisfies ProductOracleSampleReport;
  });

  return {
    holds: failures.length === 0,
    failures,
    details: { samples },
  };
};

export interface SetCoproductSampleSpec<X, A, B> {
  readonly label?: string;
  readonly codomain: SetObj<X>;
  readonly legs: readonly [SetHom<A, X>, SetHom<B, X>];
  readonly mediator?: SetHom<SetCoproductValue<A, B>, X>;
  readonly competitor?: SetHom<SetCoproductValue<A, B>, X>;
}

interface SetCoproductSample<A, B> {
  readonly label: string;
  readonly codomain: SetObj<unknown>;
  readonly legs: readonly [SetHom<A, unknown>, SetHom<B, unknown>];
  readonly mediator: SetHom<SetCoproductValue<A, B>, unknown>;
  readonly canonical: SetHom<SetCoproductValue<A, B>, unknown>;
  readonly competitor?: SetHom<SetCoproductValue<A, B>, unknown>;
}

export interface SetCoproductWitness<A, B> {
  readonly left: SetObj<A>;
  readonly right: SetObj<B>;
  readonly coproduct: SetObj<SetCoproductValue<A, B>>;
  readonly injections: readonly [SetHom<A, SetCoproductValue<A, B>>, SetHom<B, SetCoproductValue<A, B>>];
  readonly cotuple: <X>(
    codomain: SetObj<X>,
    legs: readonly [SetHom<A, X>, SetHom<B, X>],
  ) => SetHom<SetCoproductValue<A, B>, X>;
  readonly samples: ReadonlyArray<SetCoproductSample<A, B>>;
}

type CoproductOracleSampleReport = {
  readonly label: string;
  readonly trianglesHold: boolean;
  readonly matchesCanonical: boolean;
  readonly injectionAgreement: boolean;
  readonly competitor?: {
    readonly trianglesHold: boolean;
    readonly matchesCanonical: boolean;
    readonly injectionAgreement: boolean;
  };
};

export const coproductUniversalPropertyWitness = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  samples: ReadonlyArray<SetCoproductSampleSpec<any, A, B>> = [],
): SetCoproductWitness<A, B> => {
  const { object: coproduct, injections, cotuple } = SetCat.coproduct(left, right);

  const preparedSamples = samples.map((spec, index) => {
    const canonical = cotuple(spec.codomain, spec.legs);
    const mediator = spec.mediator ?? canonical;
    const competitor = spec.competitor
      ? (spec.competitor as SetHom<SetCoproductValue<A, B>, unknown>)
      : undefined;
    return {
      label: spec.label ?? `sample-${index}`,
      codomain: spec.codomain as SetObj<unknown>,
      legs: [
        spec.legs[0] as unknown as SetHom<A, unknown>,
        spec.legs[1] as unknown as SetHom<B, unknown>,
      ] as const,
      mediator: mediator as SetHom<SetCoproductValue<A, B>, unknown>,
      canonical: canonical as SetHom<SetCoproductValue<A, B>, unknown>,
      ...(competitor ? { competitor } : {}),
    } as SetCoproductSample<A, B>;
  });

  return {
    left,
    right,
    coproduct,
    injections,
    cotuple,
    samples: preparedSamples,
  };
};

export const checkCoproductUniversalProperty = <A, B>(
  witness: SetCoproductWitness<A, B>,
): OracleReport<{ samples: ReadonlyArray<CoproductOracleSampleReport> }> => {
  const failures: string[] = [];

  const injectionMorphisms = coproductInjectionsAsMorphisms(witness);
  const samples: CoproductOracleSampleReport[] = witness.samples.map((sample) => {
    const injectionFamily: IndexedFamily<BinaryIndex, AnySetHom> = (index) =>
      injectionMorphisms[index]!;
    const legMorphisms = sampleCotuplesAsMorphisms(sample);
    const legsFamily: IndexedFamily<BinaryIndex, AnySetHom> = (index) =>
      legMorphisms[index]!;
    const mediatorHom = toAnySetHom(sample.mediator);
    const canonicalHom = toAnySetHom(sample.canonical);

    const trianglesHold = coproductMediates(
      setCategoryWithDomCod,
      equalAnySetHom,
      injectionFamily,
      mediatorHom,
      { coTip: toAnySetObj(sample.codomain), legs: legsFamily },
      COPRODUCT_INDICES,
    );

    const matchesCanonical = equalAnySetHom(mediatorHom, canonicalHom);

    const injectionAgreement = agreeUnderInjections(
      setCategoryForCompose,
      equalAnySetHom,
      injectionFamily,
      mediatorHom,
      canonicalHom,
      COPRODUCT_INDICES,
    );

    const sampleFailures: string[] = [];
    if (!trianglesHold) {
      sampleFailures.push(`${sample.label}: mediator fails coproduct triangles`);
    }
    if (!matchesCanonical) {
      sampleFailures.push(`${sample.label}: mediator does not equal canonical cotuple`);
    }

    let competitorReport: CoproductOracleSampleReport["competitor"] | undefined;
    if (sample.competitor) {
      const competitorHom = toAnySetHom(sample.competitor);
      const competitorTriangles = coproductMediates(
        setCategoryWithDomCod,
        equalAnySetHom,
        injectionFamily,
        competitorHom,
        { coTip: toAnySetObj(sample.codomain), legs: legsFamily },
        COPRODUCT_INDICES,
      );
      const competitorMatches = equalAnySetHom(competitorHom, canonicalHom);
      const competitorAgreement = agreeUnderInjections(
        setCategoryForCompose,
        equalAnySetHom,
        injectionFamily,
        competitorHom,
        canonicalHom,
        COPRODUCT_INDICES,
      );

      competitorReport = {
        trianglesHold: competitorTriangles,
        matchesCanonical: competitorMatches,
        injectionAgreement: competitorAgreement,
      };

      if (competitorTriangles && !competitorMatches) {
        sampleFailures.push(`${sample.label}: competing cotuple violates uniqueness`);
      }
    }

    failures.push(...sampleFailures);

    return {
      label: sample.label,
      trianglesHold,
      matchesCanonical,
      injectionAgreement,
      ...(competitorReport ? { competitor: competitorReport } : {}),
    } satisfies CoproductOracleSampleReport;
  });

  return {
    holds: failures.length === 0,
    failures,
    details: { samples },
  };
};

// ---------- Unique map from ∅ ----------
export type UniqueFromEmptyWitness<Y> = { Y: AnySet<Y> };

export const uniqueFromEmptyWitness = <Y>(Y: AnySet<Y>): UniqueFromEmptyWitness<Y> => ({ Y });

export const checkUniqueFromEmpty = <Y>(
  witness: UniqueFromEmptyWitness<Y>,
): OracleReport<{ homCount: number }> => {
  const count = homCount(EMPTY, witness.Y);
  const holds = count === 1;
  return {
    holds,
    failures: holds ? [] : [`|Hom(∅,Y)| = ${count}`],
    details: { homCount: count },
  };
};

// ---------- Empty set characterisation ----------
export type EmptyByHomsWitness<E> = {
  E: AnySet<E>;
  nonemptySamples: ReadonlyArray<AnySet<unknown>>;
};

export const emptyByHomsWitness = <E>(
  E: AnySet<E>,
  nonemptySamples: ReadonlyArray<AnySet<unknown>> = [],
): EmptyByHomsWitness<E> => ({ E, nonemptySamples });

export const checkEmptyByHoms = <E>(
  witness: EmptyByHomsWitness<E>,
): OracleReport<{ backwardCounts: Array<{ domainSize: number; homSize: number }> }> => {
  const failures: string[] = [];
  const backwardCounts: Array<{ domainSize: number; homSize: number }> = [];

  if (witness.E.size !== 0) {
    failures.push(`|E| = ${witness.E.size}`);
  }

  witness.nonemptySamples.forEach(sample => {
    if (sample.size === 0) return;
    const homSize = homCount(sample, witness.E);
    backwardCounts.push({ domainSize: sample.size, homSize });
    if (homSize !== 0) {
      failures.push(`Found X with |Hom(X,E)| = ${homSize}`);
    }
  });

  return {
    holds: failures.length === 0,
    failures,
    details: { backwardCounts },
  };
};

// ---------- Singleton characterisation ----------
export type SingletonByHomsWitness<S> = {
  S: AnySet<S>;
  universeSamples: ReadonlyArray<AnySet<unknown>>;
};

export const singletonByHomsWitness = <S>(
  S: AnySet<S>,
  universeSamples: ReadonlyArray<AnySet<unknown>>,
): SingletonByHomsWitness<S> => ({ S, universeSamples });

export const checkSingletonByHoms = <S>(
  witness: SingletonByHomsWitness<S>,
): OracleReport<{ counts: Array<{ domainSize: number; homSize: number }> }> => {
  const failures: string[] = [];
  const counts: Array<{ domainSize: number; homSize: number }> = [];

  if (witness.S.size !== 1) {
    failures.push(`|S| = ${witness.S.size}`);
  }

  witness.universeSamples.forEach(sample => {
    const homSize = homCount(sample, witness.S);
    counts.push({ domainSize: sample.size, homSize });
    if (homSize !== 1) {
      failures.push(`Found X with |Hom(X,S)| = ${homSize}`);
    }
  });

  return {
    holds: failures.length === 0,
    failures,
    details: { counts },
  };
};

// ---------- Elements as arrows ----------
export type ElementsAsArrowsWitness<A> = { A: AnySet<A> };

export const elementsAsArrowsWitness = <A>(
  A: AnySet<A>,
): ElementsAsArrowsWitness<A> => ({ A });

export const checkElementsAsArrows = <A>(
  witness: ElementsAsArrowsWitness<A>,
): OracleReport<{ homCount: number; size: number }> => {
  const count = homCount(ONE, witness.A);
  const size = witness.A.size;
  const holds = count === size;

  return {
    holds,
    failures: holds ? [] : [`|Hom(1,A)| = ${count} but |A| = ${size}`],
    details: { homCount: count, size },
  };
};

export const SetOracles = {
  uniqueFromEmpty: {
    witness: uniqueFromEmptyWitness,
    check: checkUniqueFromEmpty,
  },
  emptyByHoms: {
    witness: emptyByHomsWitness,
    check: checkEmptyByHoms,
  },
  singletonByHoms: {
    witness: singletonByHomsWitness,
    check: checkSingletonByHoms,
  },
  elementsAsArrows: {
    witness: elementsAsArrowsWitness,
    check: checkElementsAsArrows,
  },
  product: {
    witness: productUniversalPropertyWitness,
    check: checkProductUniversalProperty,
  },
  coproduct: {
    witness: coproductUniversalPropertyWitness,
    check: checkCoproductUniversalProperty,
  },
};
