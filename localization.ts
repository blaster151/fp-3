import {
  compareFunctors,
  composeFunctors,
  constructFunctorWithWitness,
  type FunctorCheckSamples,
  type FunctorComposablePair,
  type FunctorComparisonReport,
  type FunctorWithWitness,
} from "./functor";
import type { FiniteCategory } from "./finite-cat";
import { checkIsomorphism } from "./functor-isomorphism";
import type { IsoWitness } from "./kinds/iso";
import type { SimpleCat } from "./simple-cat";

export interface CalculusOfFractionsData<Obj, Arr> {
  readonly category: FiniteCategory<Obj, Arr>;
  readonly denominators: ReadonlyArray<Arr>;
  readonly metadata?: ReadonlyArray<string>;
}

interface ArrowIndexing<Obj, Arr> {
  readonly arrows: ReadonlyArray<Arr>;
  readonly indexOf: (arrow: Arr) => number;
  readonly src: (index: number) => Obj;
  readonly dst: (index: number) => Obj;
  readonly arrowAt: (index: number, context?: string) => Arr;
}

const makeArrowIndexing = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): ArrowIndexing<Obj, Arr> => {
  const { arrows, eq, src, dst } = category;
  const indexMap = new Map<Arr, number>();
  for (let i = 0; i < arrows.length; i += 1) {
    const arrow = arrows[i];
    if (arrow === undefined) {
      throw new Error("Finite category witness listed an undefined arrow.");
    }
    indexMap.set(arrow, i);
  }

  const indexOf = (arrow: Arr): number => {
    const byReference = indexMap.get(arrow);
    if (byReference !== undefined) {
      return byReference;
    }
    for (let i = 0; i < arrows.length; i += 1) {
      const candidate = arrows[i];
      if (candidate !== undefined && eq(candidate, arrow)) {
        indexMap.set(arrow, i);
        return i;
      }
    }
    throw new Error("Encountered arrow that is not listed in the finite category witness.");
  };

  const arrowAt = (index: number, context = "arrow lookup"): Arr => {
    const arrow = arrows[index];
    if (arrow === undefined) {
      throw new Error(
        `Failed to resolve arrow at index ${index} during ${context}.`,
      );
    }
    return arrow;
  };

  return {
    arrows,
    indexOf,
    src: (index: number) => src(arrowAt(index, "source lookup")),
    dst: (index: number) => dst(arrowAt(index, "target lookup")),
    arrowAt,
  };
};

const uniqueDenominatorIndices = <Arr>(
  denominators: ReadonlyArray<Arr>,
  indexOf: (arrow: Arr) => number,
): number[] => {
  const seen = new Set<number>();
  const result: number[] = [];
  for (const arrow of denominators) {
    const index = indexOf(arrow);
    if (!seen.has(index)) {
      seen.add(index);
      result.push(index);
    }
  }
  return result;
};

const pairKey = (denominatorIndex: number, numeratorIndex: number): string =>
  `${denominatorIndex}→${numeratorIndex}`;

const comparePairs = (
  left: readonly [number, number],
  right: readonly [number, number],
): number => {
  if (left[0] !== right[0]) {
    return left[0] - right[0];
  }
  return left[1] - right[1];
};

const computeClosure = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  denominatorIndices: ReadonlyArray<number>,
  indexing: ArrowIndexing<Obj, Arr>,
  initialDenominator: number,
  initialNumerator: number,
): Array<readonly [number, number]> => {
  const results: Array<readonly [number, number]> = [];
  const pending: Array<readonly [number, number]> = [
    [initialDenominator, initialNumerator],
  ];
  const seen = new Set<string>();

  while (pending.length > 0) {
    const [denominator, numerator] = pending.pop()!;
    const key = pairKey(denominator, numerator);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    results.push([denominator, numerator]);

    const apex = category.src(indexing.arrowAt(denominator, "closure apex"));
    for (const candidate of denominatorIndices) {
      if (category.dst(indexing.arrowAt(candidate, "closure candidate")) !== apex) {
        continue;
      }
      const refinedDenominator = category.compose(
        indexing.arrowAt(denominator, "closure denominator"),
        indexing.arrowAt(candidate, "closure candidate denominator"),
      );
      const refinedNumerator = category.compose(
        indexing.arrowAt(numerator, "closure numerator"),
        indexing.arrowAt(candidate, "closure candidate numerator"),
      );
      const refinedDenominatorIndex = indexing.indexOf(refinedDenominator);
      const refinedNumeratorIndex = indexing.indexOf(refinedNumerator);
      pending.push([refinedDenominatorIndex, refinedNumeratorIndex]);
    }
  }

  return results;
};

const normalizePair = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  denominatorIndices: ReadonlyArray<number>,
  indexing: ArrowIndexing<Obj, Arr>,
  denominator: number,
  numerator: number,
): readonly [number, number] => {
  const closure = computeClosure(
    category,
    denominatorIndices,
    indexing,
    denominator,
    numerator,
  );
  const sorted = [...closure].sort(comparePairs);
  const canonical = sorted[0];
  if (!canonical) {
    throw new Error("Failed to normalize localization fraction pair.");
  }
  return canonical;
};

const requireArrow = <Arr>(
  arrows: ReadonlyArray<Arr>,
  index: number,
  context: string,
): Arr => {
  const arrow = arrows[index];
  if (arrow === undefined) {
    throw new Error(`Missing arrow at index ${index} during ${context}.`);
  }
  return arrow;
};

interface LocalizedArrowInternal<Obj, Arr> {
  readonly key: string;
  readonly source: Obj;
  readonly target: Obj;
  readonly apex: Obj;
  readonly numerator: Arr;
  readonly denominator: Arr;
  readonly numeratorIndex: number;
  readonly denominatorIndex: number;
}

export interface LocalizationArrow<Obj, Arr> {
  readonly key: string;
  readonly source: Obj;
  readonly target: Obj;
  readonly apex: Obj;
  readonly numerator: Arr;
  readonly denominator: Arr;
  readonly numeratorIndex: number;
  readonly denominatorIndex: number;
}

const toPublicArrow = <Obj, Arr>(
  arrow: LocalizedArrowInternal<Obj, Arr>,
): LocalizationArrow<Obj, Arr> => ({
  key: arrow.key,
  source: arrow.source,
  target: arrow.target,
  apex: arrow.apex,
  numerator: arrow.numerator,
  denominator: arrow.denominator,
  numeratorIndex: arrow.numeratorIndex,
  denominatorIndex: arrow.denominatorIndex,
});

const equalityWitness = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): ((left: Arr, right: Arr) => boolean) | undefined => {
  const enriched = category as SimpleCat<Obj, Arr> & {
    readonly eq?: (left: Arr, right: Arr) => boolean;
  };
  if (typeof enriched.eq === "function") {
    return enriched.eq.bind(enriched);
  }
  return undefined;
};

export interface CalculusOfFractionsDiagnostics<Obj, Arr> {
  readonly identityClosure: boolean;
  readonly missingIdentities: ReadonlyArray<Obj>;
  readonly compositionClosure: boolean;
  readonly compositionFailures: ReadonlyArray<{
    readonly left: Arr;
    readonly right: Arr;
    readonly composite: Arr;
    readonly reason: string;
  }>;
  readonly oreCondition: boolean;
  readonly oreFailures: ReadonlyArray<{
    readonly left: LocalizationArrow<Obj, Arr>;
    readonly right: LocalizationArrow<Obj, Arr>;
    readonly reason: string;
  }>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface LocalizationResult<Obj, Arr> {
  readonly baseCategory: FiniteCategory<Obj, Arr>;
  readonly localizedCategory: FiniteCategory<Obj, LocalizationArrow<Obj, Arr>>;
  readonly localizationFunctor: FunctorWithWitness<Obj, Arr, Obj, LocalizationArrow<Obj, Arr>>;
  readonly denominators: ReadonlyArray<Arr>;
  readonly diagnostics: CalculusOfFractionsDiagnostics<Obj, Arr>;
}

const gatherComposablePairs = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): ReadonlyArray<FunctorComposablePair<Arr>> => {
  const pairs: FunctorComposablePair<Arr>[] = [];
  for (const left of category.arrows) {
    for (const right of category.arrows) {
      if (category.dst(left) !== category.src(right)) {
        continue;
      }
      pairs.push({ f: left, g: right });
    }
  }
  return pairs;
};

const toLocalizationSamples = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): FunctorCheckSamples<Obj, Arr> => ({
  objects: category.objects,
  arrows: category.arrows,
  composablePairs: gatherComposablePairs(category),
});

const buildArrowRegistry = <Obj, Arr>(
  data: CalculusOfFractionsData<Obj, Arr>,
  indexing: ArrowIndexing<Obj, Arr>,
  denominatorIndices: ReadonlyArray<number>,
): {
  readonly arrows: LocalizationArrow<Obj, Arr>[];
  readonly closureByKey: Map<string, Array<readonly [number, number]>>;
  readonly pairByKey: Map<string, readonly [number, number]>;
} => {
  const { category } = data;
  const closureByKey = new Map<string, Array<readonly [number, number]>>();
  const pairByKey = new Map<string, readonly [number, number]>();
  const registry = new Map<string, LocalizedArrowInternal<Obj, Arr>>();

  for (const denominator of denominatorIndices) {
    const apex = indexing.src(denominator);
    for (let i = 0; i < category.arrows.length; i += 1) {
      const numeratorArrow = requireArrow(
        category.arrows,
        i,
        "localization numerator enumeration",
      );
      if (category.src(numeratorArrow) !== apex) {
        continue;
      }
      const canonical = normalizePair(
        category,
        denominatorIndices,
        indexing,
        denominator,
        i,
      );
      const key = pairKey(canonical[0], canonical[1]);
      if (!registry.has(key)) {
          const [canonicalDenominator, canonicalNumerator] = canonical;
          const denominatorArrow = indexing.arrowAt(
            canonicalDenominator,
            "registry denominator",
          );
          const numerator = indexing.arrowAt(
            canonicalNumerator,
            "registry numerator",
          );
          pairByKey.set(key, canonical);
          registry.set(key, {
            key,
            source: category.dst(denominatorArrow),
            target: category.dst(numerator),
            apex: category.src(denominatorArrow),
            numerator,
            denominator: denominatorArrow,
            numeratorIndex: canonicalNumerator,
            denominatorIndex: canonicalDenominator,
          });
        }
      }
  }

  for (const [key, canonical] of pairByKey.entries()) {
    const closure = computeClosure(
      category,
      denominatorIndices,
      indexing,
      canonical[0],
      canonical[1],
    );
    closureByKey.set(key, closure);
  }

  return {
    arrows: Array.from(registry.values()).map(toPublicArrow),
    closureByKey,
    pairByKey,
  };
};

const composeLocalized = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  denominatorIndices: ReadonlyArray<number>,
  indexing: ArrowIndexing<Obj, Arr>,
  registry: {
    readonly closureByKey: Map<string, Array<readonly [number, number]>>;
    readonly pairByKey: Map<string, readonly [number, number]>;
    readonly arrowsByKey: Map<string, LocalizationArrow<Obj, Arr>>;
  },
  right: LocalizationArrow<Obj, Arr>,
  left: LocalizationArrow<Obj, Arr>,
): LocalizationArrow<Obj, Arr> => {
  const leftClosure = registry.closureByKey.get(left.key);
  const rightClosure = registry.closureByKey.get(right.key);
  if (!leftClosure || !rightClosure) {
    throw new Error("Missing closure data for localization arrows.");
  }

  for (const [leftDenominator, leftNumerator] of leftClosure) {
    for (const [rightDenominator, rightNumerator] of rightClosure) {
      if (leftNumerator !== rightDenominator) {
        continue;
      }
      const canonical = normalizePair(
        category,
        denominatorIndices,
        indexing,
        leftDenominator,
        rightNumerator,
      );
      const [canonicalDenominator, canonicalNumerator] = canonical;
      const key = pairKey(canonicalDenominator, canonicalNumerator);
      const existing = registry.arrowsByKey.get(key);
      if (!existing) {
        throw new Error("Composite fraction not present in registry.");
      }
      return existing;
    }
  }

  throw new Error(
    `Ore condition failed to produce a composite for ${left.key} then ${right.key}.`,
  );
};

const analyzeOreFailures = <Obj, Arr>(
  localizedArrows: ReadonlyArray<LocalizationArrow<Obj, Arr>>,
  compose: (
    right: LocalizationArrow<Obj, Arr>,
    left: LocalizationArrow<Obj, Arr>,
  ) => LocalizationArrow<Obj, Arr>,
): ReadonlyArray<{
  readonly left: LocalizationArrow<Obj, Arr>;
  readonly right: LocalizationArrow<Obj, Arr>;
  readonly reason: string;
}> => {
  const failures: Array<{
    readonly left: LocalizationArrow<Obj, Arr>;
    readonly right: LocalizationArrow<Obj, Arr>;
    readonly reason: string;
  }> = [];
  for (const left of localizedArrows) {
    for (const right of localizedArrows) {
      if (left.target !== right.source) {
        continue;
      }
      try {
        compose(right, left);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Composition failed.";
        failures.push({ left, right, reason: message });
      }
    }
  }
  return failures;
};

export const localizeCategory = <Obj, Arr>(
  data: CalculusOfFractionsData<Obj, Arr>,
): LocalizationResult<Obj, Arr> => {
  const { category, denominators } = data;
  const indexing = makeArrowIndexing(category);
  const denominatorIndices = uniqueDenominatorIndices(denominators, indexing.indexOf);

  const identityFailures: Obj[] = [];
  for (const object of category.objects) {
    const identityIndex = indexing.indexOf(category.id(object));
    if (!denominatorIndices.includes(identityIndex)) {
      identityFailures.push(object);
    }
  }

  const compositionFailures: Array<{
    readonly left: Arr;
    readonly right: Arr;
    readonly composite: Arr;
    readonly reason: string;
  }> = [];
    for (const leftIndex of denominatorIndices) {
      for (const rightIndex of denominatorIndices) {
        const leftArrow = indexing.arrowAt(leftIndex, "denominator closure left");
        const rightArrow = indexing.arrowAt(rightIndex, "denominator closure right");
        if (category.dst(rightArrow) !== category.src(leftArrow)) {
          continue;
        }
      const composite = category.compose(leftArrow, rightArrow);
      const compositeIndex = indexing.indexOf(composite);
      if (!denominatorIndices.includes(compositeIndex)) {
        compositionFailures.push({
          left: leftArrow,
          right: rightArrow,
          composite,
          reason: "Denominator set must be closed under composition.",
        });
      }
    }
  }

  const { arrows, closureByKey, pairByKey } = buildArrowRegistry(
    data,
    indexing,
    denominatorIndices,
  );
  const arrowsByKey = new Map<string, LocalizationArrow<Obj, Arr>>();
  for (const arrow of arrows) {
    arrowsByKey.set(arrow.key, arrow);
  }

  const compose = (
    right: LocalizationArrow<Obj, Arr>,
    left: LocalizationArrow<Obj, Arr>,
  ): LocalizationArrow<Obj, Arr> =>
    composeLocalized(
      category,
      denominatorIndices,
      indexing,
      { closureByKey, pairByKey, arrowsByKey },
      right,
      left,
    );

  const oreFailures = analyzeOreFailures(arrows, compose);

  const localizedCategory: FiniteCategory<Obj, LocalizationArrow<Obj, Arr>> = {
    objects: category.objects,
    arrows,
    id: (object: Obj) => {
      const identity = category.id(object);
      const denominator = indexing.indexOf(identity);
      const numerator = indexing.indexOf(identity);
      const canonical = normalizePair(
        category,
        denominatorIndices,
        indexing,
        denominator,
        numerator,
      );
      const [canonicalDenominator, canonicalNumerator] = canonical;
      const key = pairKey(canonicalDenominator, canonicalNumerator);
      const arrow = arrowsByKey.get(key);
      if (!arrow) {
        throw new Error("Identity fraction missing from localization.");
      }
      return arrow;
    },
    compose: (right, left) => {
      if (left.target !== right.source) {
        throw new Error("Localization compose requires matching boundaries.");
      }
      return compose(right, left);
    },
    src: (arrow) => arrow.source,
    dst: (arrow) => arrow.target,
    eq: (left, right) => left.key === right.key,
  };

  const samples = toLocalizationSamples(category);
  const localizationFunctor = constructFunctorWithWitness(
    category,
    localizedCategory,
    {
      F0: (object: Obj) => object,
      F1: (arrow: Arr) => {
        const denominator = indexing.indexOf(category.id(category.src(arrow)));
        const numerator = indexing.indexOf(arrow);
        const canonical = normalizePair(
          category,
          denominatorIndices,
          indexing,
          denominator,
          numerator,
        );
        const [canonicalDenominator, canonicalNumerator] = canonical;
        const key = pairKey(canonicalDenominator, canonicalNumerator);
        const localized = arrowsByKey.get(key);
        if (!localized) {
          throw new Error("Failed to locate canonical fraction for arrow.");
        }
        return localized;
      },
    },
    samples,
    [
      "Canonical localization functor sends each morphism to its roof with identity denominator.",
      ...(data.metadata ?? []),
    ],
  );

  const diagnostics: CalculusOfFractionsDiagnostics<Obj, Arr> = {
    identityClosure: identityFailures.length === 0,
    missingIdentities: identityFailures,
    compositionClosure: compositionFailures.length === 0,
    compositionFailures,
    oreCondition: oreFailures.length === 0,
    oreFailures,
    holds:
      identityFailures.length === 0 &&
      compositionFailures.length === 0 &&
      oreFailures.length === 0,
    details: [
      identityFailures.length === 0
        ? "Denominator set contains the identity of every object."
        : "Denominator set is missing identity morphisms.",
      compositionFailures.length === 0
        ? "Denominator set is closed under composition on supplied data."
        : "Denominator set failed composition closure checks.",
      oreFailures.length === 0
        ? "Computed composite roofs for all sampled fractions."
        : "Some fraction composites could not be constructed, violating the Ore condition.",
    ],
  };

  return {
    baseCategory: category,
    localizedCategory,
    localizationFunctor,
    denominators,
    diagnostics,
  };
};

export interface LocalizationUniversalPropertyReport<
  Obj,
  Arr,
  LocArr,
  TgtObj,
  TgtArr,
> {
  readonly denominatorsInverted: boolean;
  readonly denominatorFailures: ReadonlyArray<{
    readonly arrow: Arr;
    readonly reason: string;
  }>;
  readonly factorization: FunctorComparisonReport<Obj, Arr, TgtObj, TgtArr>;
  readonly liftRespectsFractions: boolean;
  readonly fractionFailures: ReadonlyArray<{
    readonly arrow: LocArr;
    readonly expected: TgtArr;
    readonly actual: TgtArr;
    readonly reason: string;
  }>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

const asFiniteCategory = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): FiniteCategory<Obj, Arr> | null => {
  const candidate = category as SimpleCat<Obj, Arr> &
    Partial<FiniteCategory<Obj, Arr>>;
  if (
    Array.isArray((candidate as { readonly arrows?: unknown }).arrows) &&
    typeof candidate.eq === "function"
  ) {
    return candidate as FiniteCategory<Obj, Arr>;
  }
  return null;
};

const computeExpectedImage = <Obj, Arr, TgtObj, TgtArr>(
  result: LocalizationResult<Obj, Arr>,
  baseFunctor: FunctorWithWitness<Obj, Arr, TgtObj, TgtArr>,
  arrow: LocalizationArrow<Obj, Arr>,
  iso: IsoWitness<TgtArr>,
): TgtArr => {
  const target = baseFunctor.witness.target;
    const numerator = requireArrow(
      result.baseCategory.arrows,
      arrow.numeratorIndex,
      "localization numerator image",
    );
  const numeratorImage = baseFunctor.functor.F1(numerator);
  return target.compose(numeratorImage, iso.inverse);
};

export const localizationUniversalProperty = <
  Obj,
  Arr,
  TgtObj,
  TgtArr,
>(
  result: LocalizationResult<Obj, Arr>,
  baseFunctor: FunctorWithWitness<Obj, Arr, TgtObj, TgtArr>,
  liftedFunctor: FunctorWithWitness<Obj, LocalizationArrow<Obj, Arr>, TgtObj, TgtArr>,
): LocalizationUniversalPropertyReport<Obj, Arr, LocalizationArrow<Obj, Arr>, TgtObj, TgtArr> => {
  if (baseFunctor.witness.source !== result.baseCategory) {
    throw new Error("Base functor must originate from the localized category's source.");
  }
  if (liftedFunctor.witness.source !== result.localizedCategory) {
    throw new Error("Lifted functor must originate from the localization.");
  }
  if (liftedFunctor.witness.target !== baseFunctor.witness.target) {
    throw new Error("Lifted functor and base functor must share a target category.");
  }

  const target = baseFunctor.witness.target;
  const finiteTarget = asFiniteCategory(target);
  const eq = equalityWitness(target);

  const indexing = makeArrowIndexing(result.baseCategory);
  const denominatorFailures: Array<{ readonly arrow: Arr; readonly reason: string }> = [];
  const denominatorWitnesses = new Map<number, IsoWitness<TgtArr>>();
  for (const denominator of result.denominators) {
    const image = baseFunctor.functor.F1(denominator);
    const check = checkIsomorphism(target, image);
    if (!check.holds || !check.witness) {
      denominatorFailures.push({
        arrow: denominator,
        reason: check.details ?? "Denominator does not map to an isomorphism.",
      });
      continue;
    }
    const index = indexing.indexOf(denominator);
    denominatorWitnesses.set(index, check.witness);
  }

  const denominatorsInverted = denominatorFailures.length === 0;

  const factorization = compareFunctors(
    composeFunctors(liftedFunctor, result.localizationFunctor),
    baseFunctor,
  );

  const fractionFailures: Array<{
    readonly arrow: LocalizationArrow<Obj, Arr>;
    readonly expected: TgtArr;
    readonly actual: TgtArr;
    readonly reason: string;
  }> = [];

  if (finiteTarget) {
    for (const arrow of result.localizedCategory.arrows) {
        const iso = denominatorWitnesses.get(arrow.denominatorIndex);
        if (!iso) {
          fractionFailures.push({
            arrow,
            expected: liftedFunctor.functor.F1(arrow),
            actual: liftedFunctor.functor.F1(arrow),
            reason:
              "Missing isomorphism witness for denominator prevents reconstructing the expected image.",
          });
          continue;
        }
        const expected = computeExpectedImage(result, baseFunctor, arrow, iso);
        const actual = liftedFunctor.functor.F1(arrow);
      const matches = eq ? eq(actual, expected) : Object.is(actual, expected);
      if (!matches) {
        fractionFailures.push({
          arrow,
          expected,
          actual,
          reason: "Lifted functor disagrees with canonical fraction evaluation.",
        });
      }
    }
    } else if (result.localizedCategory.arrows.length > 0) {
      const representative = result.localizedCategory.arrows[0];
      if (!representative) {
        throw new Error("Localization produced arrows but representative was missing.");
      }
      const image = liftedFunctor.functor.F1(representative);
      fractionFailures.push({
        arrow: representative,
      expected: image,
      actual: image,
      reason:
        "Target category lacks a finite witness, preventing canonical fraction comparisons.",
    });
  }

  const liftRespectsFractions = fractionFailures.length === 0;

  const holds = denominatorsInverted && factorization.holds && liftRespectsFractions;

  const details: string[] = [];
  details.push(
    denominatorsInverted
      ? "Base functor sends denominators to isomorphisms."
      : "Base functor fails to invert the specified denominators.",
  );
  details.push(
    factorization.holds
      ? "Lift factors through the localization on supplied samples."
      : "Composite of lift with localization functor disagrees with the base functor.",
  );
  details.push(
    liftRespectsFractions
      ? "Lifted functor matches canonical roof evaluation on every localized arrow."
      : "Lifted functor disagrees with canonical roof evaluation.",
  );

  return {
    denominatorsInverted,
    denominatorFailures,
    factorization,
    liftRespectsFractions,
    fractionFailures,
    holds,
    details,
  };
};
