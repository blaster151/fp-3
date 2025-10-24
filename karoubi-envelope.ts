import type { FiniteCategory } from "./finite-cat";
import type {
  FunctorCheckSamples,
  FunctorWithWitness,
} from "./functor";
import { constructFunctorWithWitness } from "./functor";
import {
  buildEquivalenceWitness,
  checkFaithfulFunctor,
  checkFullFunctor,
  isEssentiallySurjective,
  type EquivalencePrerequisites,
  type FunctorEquivalenceWitness,
  type FullnessWitness,
  type FaithfulnessReport,
  type EssentialSurjectivityReport,
} from "./functor-equivalence";
import type { IsoWitness } from "./kinds/iso";

interface HomSetEnumerator<Obj, Arr> {
  (source: Obj, target: Obj): ReadonlyArray<Arr>;
}

interface FiniteLikeCategory<Obj, Arr> extends FiniteCategory<Obj, Arr> {
  readonly objects?: ReadonlyArray<Obj>;
}

const ensureArrowEquality = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  supplied?: (left: Arr, right: Arr) => boolean,
): ((left: Arr, right: Arr) => boolean) => {
  if (supplied) {
    return supplied;
  }
  if (typeof category.eq === "function") {
    return category.eq.bind(category);
  }
  return (left, right) => Object.is(left, right);
};

const ensureHomEnumerator = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  supplied?: HomSetEnumerator<Obj, Arr>,
): HomSetEnumerator<Obj, Arr> | null => {
  if (supplied) {
    return supplied;
  }
  const candidate = category as FiniteLikeCategory<Obj, Arr>;
  if (Array.isArray(candidate.arrows)) {
    return (source, target) =>
      candidate.arrows.filter(
        (arrow) =>
          Object.is(category.src(arrow), source) &&
          Object.is(category.dst(arrow), target),
      );
  }
  return null;
};

const ensureObjectList = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  supplied?: ReadonlyArray<Obj>,
): ReadonlyArray<Obj> => {
  if (supplied) {
    return supplied;
  }
  const candidate = category as FiniteLikeCategory<Obj, Arr>;
  if (Array.isArray(candidate.objects)) {
    return candidate.objects;
  }
  throw new Error(
    "Idempotent search requires explicit object enumeration; provide options.objects when category lacks objects list.",
  );
};

export interface IdempotentClassification<Obj, Arr> {
  readonly arrow: Arr;
  readonly object?: Obj;
  readonly composite?: Arr;
  readonly holds: boolean;
  readonly reason?: string;
}

export interface IdempotentSearchReport<Obj, Arr> {
  readonly classifications: ReadonlyArray<IdempotentClassification<Obj, Arr>>;
  readonly idempotents: ReadonlyArray<IdempotentClassification<Obj, Arr>>;
  readonly failures: ReadonlyArray<IdempotentClassification<Obj, Arr>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface IdempotentSearchOptions<Obj, Arr> {
  readonly objects?: ReadonlyArray<Obj>;
  readonly arrows?: ReadonlyArray<Arr>;
  readonly homEnumerator?: HomSetEnumerator<Obj, Arr>;
  readonly equals?: (left: Arr, right: Arr) => boolean;
}

export const findIdempotents = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  options: IdempotentSearchOptions<Obj, Arr> = {},
): IdempotentSearchReport<Obj, Arr> => {
  const eq = ensureArrowEquality(category, options.equals);
  const homEnumerator = ensureHomEnumerator(category, options.homEnumerator);
  const diagnostics: string[] = [];
  if (!homEnumerator) {
    diagnostics.push(
      "Unable to enumerate hom-sets; supply options.homEnumerator or ensure category.arrows lists every arrow.",
    );
    return { classifications: [], idempotents: [], failures: [], diagnostics };
  }

  const objects = ensureObjectList(category, options.objects);
  const candidates: Arr[] = [];

  if (options.arrows) {
    candidates.push(...options.arrows);
  } else {
    for (const object of objects) {
      const endomorphisms = homEnumerator(object, object);
      for (const arrow of endomorphisms) {
        candidates.push(arrow);
      }
    }
  }

  const classifications: IdempotentClassification<Obj, Arr>[] = [];
  const idempotents: IdempotentClassification<Obj, Arr>[] = [];
  const failures: IdempotentClassification<Obj, Arr>[] = [];

  for (const arrow of candidates) {
    const source = category.src(arrow);
    const target = category.dst(arrow);
    if (!Object.is(source, target)) {
      const failure: IdempotentClassification<Obj, Arr> = {
        arrow,
        holds: false,
        reason: "Arrow is not an endomorphism; idempotents must share source and target.",
      };
      classifications.push(failure);
      failures.push(failure);
      continue;
    }
    const composite = category.compose(arrow, arrow);
    const holds = eq(composite, arrow);
    const classification: IdempotentClassification<Obj, Arr> = {
      arrow,
      object: source,
      composite,
      holds,
      reason: holds ? undefined : "Squaring the arrow did not reproduce the original arrow.",
    };
    classifications.push(classification);
    if (holds) {
      idempotents.push(classification);
    } else {
      failures.push(classification);
    }
  }

  diagnostics.push(
    `Classified ${classifications.length} candidate endomorphism${classifications.length === 1 ? "" : "s"}.`,
  );
  diagnostics.push(
    idempotents.length > 0
      ? `Detected ${idempotents.length} idempotent${idempotents.length === 1 ? "" : "s"}.`
      : "No idempotent endomorphisms satisfied the equality check.",
  );

  return { classifications, idempotents, failures, diagnostics };
};

export interface KaroubiObject<Obj, Arr> {
  readonly base: Obj;
  readonly idempotent: Arr;
  readonly label: string;
}

export interface KaroubiMorphism<Obj, Arr> {
  readonly underlying: Arr;
  readonly source: KaroubiObject<Obj, Arr>;
  readonly target: KaroubiObject<Obj, Arr>;
}

export interface KaroubiSplittingWitness<Obj, Arr> {
  readonly idempotent: IdempotentClassification<Obj, Arr>;
  readonly section: KaroubiMorphism<Obj, Arr>;
  readonly retraction: KaroubiMorphism<Obj, Arr>;
  readonly sectionAfterRetraction: KaroubiMorphism<Obj, Arr>;
  readonly retractionAfterSection: KaroubiMorphism<Obj, Arr>;
  readonly splitsIdempotent: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface KaroubiEnvelopeResult<Obj, Arr> {
  readonly baseCategory: FiniteCategory<Obj, Arr>;
  readonly envelope: FiniteCategory<KaroubiObject<Obj, Arr>, KaroubiMorphism<Obj, Arr>>;
  readonly idempotents: IdempotentSearchReport<Obj, Arr>;
  readonly inclusion: FunctorWithWitness<Obj, Arr, KaroubiObject<Obj, Arr>, KaroubiMorphism<Obj, Arr>>;
  readonly forgetful: FunctorWithWitness<
    KaroubiObject<Obj, Arr>,
    KaroubiMorphism<Obj, Arr>,
    Obj,
    Arr
  >;
  readonly splittings: ReadonlyArray<KaroubiSplittingWitness<Obj, Arr>>;
}

export interface KaroubiEnvelopeOptions<Obj, Arr> {
  readonly idempotents?: IdempotentSearchReport<Obj, Arr>;
  readonly objects?: ReadonlyArray<Obj>;
  readonly homEnumerator?: HomSetEnumerator<Obj, Arr>;
  readonly equals?: (left: Arr, right: Arr) => boolean;
  readonly functorSamples?: FunctorCheckSamples<Obj, Arr>;
}

const formatKaroubiLabel = <Obj>(object: Obj, index: number): string =>
  `⟨${String(object)} | e${index}⟩`;

const makeArrowCache = <Obj, Arr>() =>
  new Map<
    KaroubiObject<Obj, Arr>,
    Map<KaroubiObject<Obj, Arr>, Map<Arr, KaroubiMorphism<Obj, Arr>>>
  >();

const registerArrow = <Obj, Arr>(
  cache: Map<
    KaroubiObject<Obj, Arr>,
    Map<KaroubiObject<Obj, Arr>, Map<Arr, KaroubiMorphism<Obj, Arr>>>
  >,
  source: KaroubiObject<Obj, Arr>,
  target: KaroubiObject<Obj, Arr>,
  underlying: Arr,
  store: KaroubiMorphism<Obj, Arr>[],
): KaroubiMorphism<Obj, Arr> => {
  let byTarget = cache.get(source);
  if (!byTarget) {
    byTarget = new Map();
    cache.set(source, byTarget);
  }
  let byArrow = byTarget.get(target);
  if (!byArrow) {
    byArrow = new Map();
    byTarget.set(target, byArrow);
  }
  const existing = byArrow.get(underlying);
  if (existing) {
    return existing;
  }
  const morphism: KaroubiMorphism<Obj, Arr> = { underlying, source, target };
  byArrow.set(underlying, morphism);
  store.push(morphism);
  return morphism;
};

const lookupArrow = <Obj, Arr>(
  cache: Map<
    KaroubiObject<Obj, Arr>,
    Map<KaroubiObject<Obj, Arr>, Map<Arr, KaroubiMorphism<Obj, Arr>>>
  >,
  source: KaroubiObject<Obj, Arr>,
  target: KaroubiObject<Obj, Arr>,
  underlying: Arr,
): KaroubiMorphism<Obj, Arr> | null =>
  cache.get(source)?.get(target)?.get(underlying) ?? null;

export const karoubiEnvelope = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  options: KaroubiEnvelopeOptions<Obj, Arr> = {},
): KaroubiEnvelopeResult<Obj, Arr> => {
  const idempotentReport = options.idempotents ?? findIdempotents(category, options);
  const eq = ensureArrowEquality(category, options.equals);
  const homEnumerator = ensureHomEnumerator(category, options.homEnumerator);
  if (!homEnumerator) {
    throw new Error(
      "Karoubi envelope construction requires hom-set enumeration; reuse findIdempotents diagnostics before invoking karoubiEnvelope.",
    );
  }

  const objects = ensureObjectList(category, options.objects);
  const karoubiObjects: KaroubiObject<Obj, Arr>[] = [];
  const identityObjects = new Map<Obj, KaroubiObject<Obj, Arr>>();
  const idempotentObjects: KaroubiObject<Obj, Arr>[] = [];
  const idempotentMetadata = new Map<KaroubiObject<Obj, Arr>, IdempotentClassification<Obj, Arr>>();

  let index = 0;
  for (const object of objects) {
    const idArrow = category.id(object);
    const label = formatKaroubiLabel(object, index);
    index += 1;
    const karoubiObject: KaroubiObject<Obj, Arr> = {
      base: object,
      idempotent: idArrow,
      label,
    };
    karoubiObjects.push(karoubiObject);
    identityObjects.set(object, karoubiObject);
  }

  for (const classification of idempotentReport.idempotents) {
    if (!classification.object) {
      continue;
    }
    const label = formatKaroubiLabel(classification.object, index);
    index += 1;
    const karoubiObject: KaroubiObject<Obj, Arr> = {
      base: classification.object,
      idempotent: classification.arrow,
      label,
    };
    karoubiObjects.push(karoubiObject);
    idempotentObjects.push(karoubiObject);
    idempotentMetadata.set(karoubiObject, classification);
  }

  const arrowCache = makeArrowCache<Obj, Arr>();
  const arrows: KaroubiMorphism<Obj, Arr>[] = [];

  for (const source of karoubiObjects) {
    for (const target of karoubiObjects) {
      const candidates = homEnumerator(source.base, target.base);
      for (const candidate of candidates) {
        const leftComposite = category.compose(target.idempotent, candidate);
        const rightComposite = category.compose(candidate, source.idempotent);
        if (eq(candidate, leftComposite) && eq(candidate, rightComposite)) {
          registerArrow(arrowCache, source, target, candidate, arrows);
        }
      }
    }
  }

  const identity = (
    object: KaroubiObject<Obj, Arr>,
  ): KaroubiMorphism<Obj, Arr> => {
    const cached = lookupArrow(arrowCache, object, object, object.idempotent);
    if (!cached) {
      throw new Error("Karoubi envelope construction failed to register identity arrow.");
    }
    return cached;
  };

  const compose = (
    g: KaroubiMorphism<Obj, Arr>,
    f: KaroubiMorphism<Obj, Arr>,
  ): KaroubiMorphism<Obj, Arr> => {
    if (!Object.is(f.target, g.source)) {
      throw new Error("Attempted to compose non-composable Karoubi morphisms.");
    }
    const composite = category.compose(g.underlying, f.underlying);
    const cached = lookupArrow(arrowCache, f.source, g.target, composite);
    if (!cached) {
      throw new Error(
        "Composite arrow missing from Karoubi envelope; ensure hom-set enumeration covered all composites.",
      );
    }
    return cached;
  };

  const karoubiCategory: FiniteCategory<KaroubiObject<Obj, Arr>, KaroubiMorphism<Obj, Arr>> = {
    objects: karoubiObjects,
    arrows,
    id: identity,
    compose,
    src: (arrow) => arrow.source,
    dst: (arrow) => arrow.target,
    eq: (left, right) => Object.is(left, right),
  };

  const functorSamples: FunctorCheckSamples<Obj, Arr> =
    options.functorSamples ?? { objects, arrows: category.arrows };

  const inclusion = constructFunctorWithWitness(
    category,
    karoubiCategory,
    {
      F0: (object: Obj) => {
        const identityObject = identityObjects.get(object);
        if (!identityObject) {
          throw new Error("Missing identity object during inclusion functor construction.");
        }
        return identityObject;
      },
      F1: (arrow: Arr) => {
        const sourceObject = identityObjects.get(category.src(arrow));
        const targetObject = identityObjects.get(category.dst(arrow));
        if (!sourceObject || !targetObject) {
          throw new Error("Identity objects unavailable for inclusion functor arrow image.");
        }
        const cached = lookupArrow(arrowCache, sourceObject, targetObject, arrow);
        if (!cached) {
          throw new Error(
            "Inclusion functor encountered an arrow that fails the Karoubi conditions; this should not happen for identity objects.",
          );
        }
        return cached;
      },
    },
    functorSamples,
    ["Karoubi envelope inclusion functor"],
  );

  const forgetful = constructFunctorWithWitness(
    karoubiCategory,
    category,
    {
      F0: (object) => object.base,
      F1: (arrow) => arrow.underlying,
    },
    {
      objects: karoubiObjects,
      arrows,
    },
    ["Forgetful functor from Karoubi envelope"],
  );

  const splittings: KaroubiSplittingWitness<Obj, Arr>[] = [];
  for (const object of idempotentObjects) {
    const identityObject = identityObjects.get(object.base);
    if (!identityObject) {
      continue;
    }
    const section = lookupArrow(arrowCache, identityObject, object, object.idempotent);
    const retraction = lookupArrow(arrowCache, object, identityObject, object.idempotent);
    if (!section || !retraction) {
      continue;
    }
    const sectionAfterRetraction = compose(section, retraction);
    const retractionAfterSection = compose(retraction, section);
    const ambientIdempotent = lookupArrow(
      arrowCache,
      identityObject,
      identityObject,
      object.idempotent,
    );
    const details: string[] = [];
    const splitsIdempotent =
      Object.is(retractionAfterSection, identity(object)) &&
      (!!ambientIdempotent && Object.is(sectionAfterRetraction, ambientIdempotent));
    details.push(
      ambientIdempotent && Object.is(sectionAfterRetraction, ambientIdempotent)
        ? "Section ∘ retraction reproduces the original idempotent on the ambient object."
        : "Section ∘ retraction failed to recover the ambient idempotent.",
    );
    details.push(
      Object.is(retractionAfterSection, identity(object))
        ? "Retraction ∘ section recovers the Karoubi identity."
        : "Retraction ∘ section failed to match the Karoubi identity.",
    );
    const classification = idempotentMetadata.get(object);
    splittings.push({
      idempotent:
        classification ?? {
          arrow: object.idempotent,
          object: object.base,
          holds: true,
          composite: category.compose(object.idempotent, object.idempotent),
        },
      section,
      retraction,
      sectionAfterRetraction,
      retractionAfterSection,
      splitsIdempotent,
      details,
    });
  }

  return {
    baseCategory: category,
    envelope: karoubiCategory,
    idempotents: idempotentReport,
    inclusion,
    forgetful,
    splittings,
  };
};

export interface KaroubiEquivalenceAnalysis<Obj, Arr> {
  readonly inclusion: FunctorWithWitness<Obj, Arr, KaroubiObject<Obj, Arr>, KaroubiMorphism<Obj, Arr>>;
  readonly forgetful: FunctorWithWitness<
    KaroubiObject<Obj, Arr>,
    KaroubiMorphism<Obj, Arr>,
    Obj,
    Arr
  >;
  readonly faithfulness: FaithfulnessReport<Obj, Arr, KaroubiObject<Obj, Arr>, KaroubiMorphism<Obj, Arr>>;
  readonly fullness: FullnessWitness<Obj, Arr, KaroubiObject<Obj, Arr>, KaroubiMorphism<Obj, Arr>>;
  readonly essentialSurjectivity: EssentialSurjectivityReport<Obj, Arr, KaroubiObject<Obj, Arr>, KaroubiMorphism<Obj, Arr>>;
  readonly prerequisites: EquivalencePrerequisites<Obj, Arr, KaroubiObject<Obj, Arr>, KaroubiMorphism<Obj, Arr>>;
  readonly equivalence?: FunctorEquivalenceWitness<Obj, Arr, KaroubiObject<Obj, Arr>, KaroubiMorphism<Obj, Arr>>;
  readonly diagnostics: ReadonlyArray<string>;
}

export interface KaroubiEquivalenceOptions<Obj, Arr> {
  readonly targetObjects?: ReadonlyArray<KaroubiObject<Obj, Arr>>;
  readonly sourceObjects?: ReadonlyArray<Obj>;
  readonly targetIsoSearch?: (left: KaroubiObject<Obj, Arr>, right: KaroubiObject<Obj, Arr>) => IsoWitness<KaroubiMorphism<Obj, Arr>> | null;
}

export const analyzeKaroubiEquivalence = <Obj, Arr>(
  result: KaroubiEnvelopeResult<Obj, Arr>,
  options: KaroubiEquivalenceOptions<Obj, Arr> = {},
): KaroubiEquivalenceAnalysis<Obj, Arr> => {
  const faithfulness = checkFaithfulFunctor(result.inclusion);
  const fullness = checkFullFunctor(result.inclusion);
  const essentialSurjectivity = isEssentiallySurjective(result.inclusion, {
    targetObjects: options.targetObjects ?? result.envelope.objects,
    sourceCandidates: options.sourceObjects ?? result.baseCategory.objects,
    targetIsoSearch: options.targetIsoSearch,
  });

  const prerequisites: EquivalencePrerequisites<
    Obj,
    Arr,
    KaroubiObject<Obj, Arr>,
    KaroubiMorphism<Obj, Arr>
  > = {
    faithfulness,
    fullness,
    essentialSurjectivity,
  };

  const diagnostics: string[] = [];
  diagnostics.push(faithfulness.details.join(" "));
  diagnostics.push(fullness.details.join(" "));
  diagnostics.push(essentialSurjectivity.details.join(" "));

  let equivalence: FunctorEquivalenceWitness<Obj, Arr, KaroubiObject<Obj, Arr>, KaroubiMorphism<Obj, Arr>> | undefined;
  if (faithfulness.holds && fullness.holds && essentialSurjectivity.holds) {
    equivalence = buildEquivalenceWitness(result.inclusion, prerequisites, {
      metadata: ["Karoubi envelope equivalence witness"],
    });
  }

  return {
    inclusion: result.inclusion,
    forgetful: result.forgetful,
    faithfulness,
    fullness,
    essentialSurjectivity,
    prerequisites,
    equivalence,
    diagnostics,
  };
};
