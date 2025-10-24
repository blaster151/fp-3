import type { FunctorWithWitness } from "./functor";
import {
  composeFunctors,
  constructFunctorWithWitness,
  identityFunctorWithWitness,
  type FunctorCheckSamples,
} from "./functor";
import type { SimpleCat } from "./simple-cat";
import type { IsoWitness } from "./kinds/iso";
import { areIsomorphic } from "./kinds/iso";
import type { FiniteCategory } from "./finite-cat";
import {
  constructNaturalTransformationWithWitness,
  type NaturalTransformationWithWitness,
} from "./natural-transformation";
import {
  constructAdjunctionWithWitness,
  type AdjunctionWithWitness,
} from "./adjunction";

interface FiniteLikeCategory<Obj, Arr> extends SimpleCat<Obj, Arr> {
  readonly objects?: ReadonlyArray<Obj>;
  readonly arrows?: ReadonlyArray<Arr>;
  readonly eq?: (left: Arr, right: Arr) => boolean;
}

type HomSetEnumerator<Obj, Arr> = (source: Obj, target: Obj) => ReadonlyArray<Arr>;

type IsoSearch<Obj, Arr> = (left: Obj, right: Obj) => IsoWitness<Arr> | null;

const ensureArrowEquality = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  supplied?: (left: Arr, right: Arr) => boolean,
): ((left: Arr, right: Arr) => boolean) => {
  if (supplied) {
    return supplied;
  }
  const candidate = category as FiniteLikeCategory<Obj, Arr>;
  if (typeof candidate.eq === "function") {
    return candidate.eq.bind(candidate);
  }
  return (left, right) => Object.is(left, right);
};

const ensureHomEnumerator = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  supplied?: HomSetEnumerator<Obj, Arr>,
): HomSetEnumerator<Obj, Arr> => {
  if (supplied) {
    return supplied;
  }
  const candidate = category as FiniteLikeCategory<Obj, Arr>;
  if (Array.isArray(candidate.arrows)) {
    return (source, target) =>
      candidate.arrows!.filter(
        (arrow) =>
          Object.is(category.src(arrow), source) &&
          Object.is(category.dst(arrow), target),
      );
  }
  throw new Error(
    "Functor equivalence checks require explicit hom-set enumeration; provide a custom enumerator via options.",
  );
};

const ensureIsoSearch = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  supplied?: IsoSearch<Obj, Arr>,
): IsoSearch<Obj, Arr> => {
  if (supplied) {
    return supplied;
  }
  const candidate = category as Partial<FiniteCategory<Obj, Arr>>;
  if (Array.isArray(candidate?.arrows) && typeof candidate?.eq === "function") {
    const finite = candidate as FiniteCategory<Obj, Arr>;
    return (left, right) => areIsomorphic(finite, left, right);
  }
  return () => null;
};

type ObjectPair<Obj> = { readonly source: Obj; readonly target: Obj };

type ObjectListOptions<Obj> = {
  readonly explicit?: ReadonlyArray<Obj>;
  readonly fallback?: ReadonlyArray<Obj>;
};

const collectObjects = <Obj>(options: ObjectListOptions<Obj>): ReadonlyArray<Obj> => {
  const set = new Set<Obj>();
  for (const collection of [options.explicit, options.fallback]) {
    if (!collection) continue;
    for (const object of collection) {
      set.add(object);
    }
  }
  return Array.from(set);
};

const collectObjectPairs = <Obj>(
  generators: ReadonlyArray<Obj>,
  explicit?: ReadonlyArray<ObjectPair<Obj>>,
): ReadonlyArray<ObjectPair<Obj>> => {
  const pairs: ObjectPair<Obj>[] = [];
  const record = (source: Obj, target: Obj) => {
    if (
      !pairs.some(
        (pair) => Object.is(pair.source, source) && Object.is(pair.target, target),
      )
    ) {
      pairs.push({ source, target });
    }
  };
  for (const pair of explicit ?? []) {
    record(pair.source, pair.target);
  }
  for (const source of generators) {
    for (const target of generators) {
      record(source, target);
    }
  }
  return pairs;
};

const collectTargetObjects = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  explicit?: ReadonlyArray<TgtObj>,
): ReadonlyArray<TgtObj> => {
  const targetCategory = functor.witness.target as FiniteLikeCategory<TgtObj, TgtArr>;
  const fallbackObjects: TgtObj[] = [];
  if (Array.isArray(targetCategory.objects)) {
    fallbackObjects.push(...targetCategory.objects);
  }
  for (const object of functor.witness.objectGenerators) {
    fallbackObjects.push(functor.functor.F0(object));
  }
  const options: ObjectListOptions<TgtObj> = { fallback: fallbackObjects };
  if (explicit) {
    options.explicit = explicit;
  }
  return collectObjects(options);
};

const collectSourceObjects = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  explicit?: ReadonlyArray<SrcObj>,
): ReadonlyArray<SrcObj> => {
  const options: ObjectListOptions<SrcObj> = {
    fallback: functor.witness.objectGenerators,
  };
  if (explicit) {
    options.explicit = explicit;
  }
  return collectObjects(options);
};

export interface FaithfulnessFailure<SrcObj, SrcArr, TgtArr> {
  readonly source: SrcObj;
  readonly target: SrcObj;
  readonly first: SrcArr;
  readonly second: SrcArr;
  readonly imageFirst: TgtArr;
  readonly imageSecond: TgtArr;
  readonly reason: string;
}

export interface FaithfulnessReport<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<FaithfulnessFailure<SrcObj, SrcArr, TgtArr>>;
  readonly checkedHomSets: number;
  readonly details: ReadonlyArray<string>;
}

export interface FaithfulnessOptions<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly objectPairs?: ReadonlyArray<ObjectPair<SrcObj>>;
  readonly sourceHom?: HomSetEnumerator<SrcObj, SrcArr>;
  readonly sourceEquals?: (left: SrcArr, right: SrcArr) => boolean;
  readonly targetEquals?: (left: TgtArr, right: TgtArr) => boolean;
}

export const checkFaithfulFunctor = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: FaithfulnessOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
): FaithfulnessReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const sourceEq = options.sourceEquals ?? ((left: SrcArr, right: SrcArr) => Object.is(left, right));
  const targetEq = ensureArrowEquality(functor.witness.target, options.targetEquals);
  const enumerateSourceHom = ensureHomEnumerator(functor.witness.source, options.sourceHom);
  const pairs = collectObjectPairs(functor.witness.objectGenerators, options.objectPairs);

  const failures: FaithfulnessFailure<SrcObj, SrcArr, TgtArr>[] = [];
  let checkedHomSets = 0;

  for (const pair of pairs) {
    const arrows = enumerateSourceHom(pair.source, pair.target);
    if (arrows.length <= 1) {
      checkedHomSets += arrows.length > 0 ? 1 : 0;
      continue;
    }
    checkedHomSets += 1;
    for (let i = 0; i < arrows.length; i += 1) {
      for (let j = i + 1; j < arrows.length; j += 1) {
        const first = arrows[i]!;
        const second = arrows[j]!;
        if (sourceEq(first, second)) {
          continue;
        }
        const imageFirst = functor.functor.F1(first);
        const imageSecond = functor.functor.F1(second);
        if (targetEq(imageFirst, imageSecond)) {
          failures.push({
            source: pair.source,
            target: pair.target,
            first,
            second,
            imageFirst,
            imageSecond,
            reason: "Distinct source arrows mapped to the same target arrow.",
          });
        }
      }
    }
  }

  const holds = failures.length === 0;
  const details: string[] = [];
  details.push(
    `Checked ${checkedHomSets} hom-set${checkedHomSets === 1 ? "" : "s"} for injectivity across ${pairs.length} sampled object pair${pairs.length === 1 ? "" : "s"}.`,
  );
  details.push(
    holds
      ? "All sampled arrow pairs remained distinct after applying the functor."
      : `${failures.length} arrow pair${failures.length === 1 ? "" : "s"} collapsed under the functor.`,
  );

  return { holds, failures, checkedHomSets, details };
};

export interface FullnessFailure<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly source: SrcObj;
  readonly target: SrcObj;
  readonly imageSource: TgtObj;
  readonly imageTarget: TgtObj;
  readonly arrow: TgtArr;
  readonly reason: string;
}

export interface FullnessWitness<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<FullnessFailure<SrcObj, SrcArr, TgtObj, TgtArr>>;
  readonly checkedArrows: number;
  readonly details: ReadonlyArray<string>;
  readonly lift: (
    source: SrcObj,
    target: SrcObj,
    arrow: TgtArr,
  ) => SrcArr | null;
}

export interface FullnessOptions<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly objectPairs?: ReadonlyArray<ObjectPair<SrcObj>>;
  readonly sourceHom?: HomSetEnumerator<SrcObj, SrcArr>;
  readonly targetHom?: HomSetEnumerator<TgtObj, TgtArr>;
  readonly targetEquals?: (left: TgtArr, right: TgtArr) => boolean;
}

export const checkFullFunctor = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: FullnessOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
): FullnessWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const targetEq = ensureArrowEquality(functor.witness.target, options.targetEquals);
  const enumerateSourceHom = ensureHomEnumerator(functor.witness.source, options.sourceHom);
  const enumerateTargetHom = ensureHomEnumerator(functor.witness.target, options.targetHom);
  const pairs = collectObjectPairs(functor.witness.objectGenerators, options.objectPairs);

  const lift = (source: SrcObj, target: SrcObj, arrow: TgtArr): SrcArr | null => {
    const candidates = enumerateSourceHom(source, target);
    for (const candidate of candidates) {
      const image = functor.functor.F1(candidate);
      if (targetEq(image, arrow)) {
        return candidate;
      }
    }
    return null;
  };

  const failures: FullnessFailure<SrcObj, SrcArr, TgtObj, TgtArr>[] = [];
  let checkedArrows = 0;

  for (const pair of pairs) {
    const imageSource = functor.functor.F0(pair.source);
    const imageTarget = functor.functor.F0(pair.target);
    const targetArrows = enumerateTargetHom(imageSource, imageTarget);
    for (const arrow of targetArrows) {
      checkedArrows += 1;
      if (!lift(pair.source, pair.target, arrow)) {
        failures.push({
          source: pair.source,
          target: pair.target,
          imageSource,
          imageTarget,
          arrow,
          reason: "No preimage arrow maps to the supplied target arrow.",
        });
      }
    }
  }

  const holds = failures.length === 0;
  const details: string[] = [];
  details.push(
    `Inspected ${checkedArrows} arrow${checkedArrows === 1 ? "" : "s"} across ${pairs.length} sampled hom-set${pairs.length === 1 ? "" : "s"}.`,
  );
  details.push(
    holds
      ? "Every sampled target arrow admitted a preimage in the source hom-set."
      : `${failures.length} target arrow${failures.length === 1 ? "" : "s"} failed to lift through the functor.`,
  );

  return { holds, failures, checkedArrows, details, lift };
};

export interface EssentialInjectivityFailure<SrcObj, TgtObj, TgtArr> {
  readonly left: SrcObj;
  readonly right: SrcObj;
  readonly imageLeft: TgtObj;
  readonly imageRight: TgtObj;
  readonly witness: IsoWitness<TgtArr>;
  readonly reason: string;
}

export interface EssentialInjectivityReport<SrcObj, TgtObj, TgtArr> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<EssentialInjectivityFailure<SrcObj, TgtObj, TgtArr>>;
  readonly inspectedPairs: number;
  readonly details: ReadonlyArray<string>;
}

export interface EssentialInjectivityOptions<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly objectPairs?: ReadonlyArray<ObjectPair<SrcObj>>;
  readonly sourceIsoSearch?: IsoSearch<SrcObj, SrcArr>;
  readonly targetIsoSearch?: IsoSearch<TgtObj, TgtArr>;
}

export interface EssentialInjectivityFromFullFaithfulnessOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly objectPairs?: ReadonlyArray<ObjectPair<SrcObj>>;
  readonly targetIsoSearch?: IsoSearch<TgtObj, TgtArr>;
  readonly targetEquals?: (left: TgtArr, right: TgtArr) => boolean;
}

export const checkEssentialInjectivityOnObjects = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: EssentialInjectivityOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
): EssentialInjectivityReport<SrcObj, TgtObj, TgtArr> => {
  const targetIsoSearch = ensureIsoSearch(functor.witness.target, options.targetIsoSearch);
  const sourceIsoSearch = ensureIsoSearch(functor.witness.source, options.sourceIsoSearch);
  const pairs = collectObjectPairs(functor.witness.objectGenerators, options.objectPairs);

  const failures: EssentialInjectivityFailure<SrcObj, TgtObj, TgtArr>[] = [];
  let inspectedPairs = 0;

  for (const pair of pairs) {
    const imageLeft = functor.functor.F0(pair.source);
    const imageRight = functor.functor.F0(pair.target);
    const targetIso = targetIsoSearch(imageLeft, imageRight);
    if (!targetIso) {
      continue;
    }
    inspectedPairs += 1;
    const sourceIso = sourceIsoSearch(pair.source, pair.target);
    if (!sourceIso) {
      failures.push({
        left: pair.source,
        right: pair.target,
        imageLeft,
        imageRight,
        witness: targetIso,
        reason: "Image objects are isomorphic but the source objects lack a matching isomorphism.",
      });
    }
  }

  const holds = failures.length === 0;
  const details: string[] = [];
  details.push(
    `Surveyed ${pairs.length} pair${pairs.length === 1 ? "" : "s"} of source objects for essential injectivity.`,
  );
  details.push(
    inspectedPairs === 0
      ? "No isomorphic image pairs appeared among the samples."
      : holds
      ? `Recovered source isomorphisms for all ${inspectedPairs} image-iso pair${inspectedPairs === 1 ? "" : "s"}.`
      : `${failures.length} image-iso pair${failures.length === 1 ? "" : "s"} lacked source isomorphisms.`,
  );

  return { holds, failures, inspectedPairs, details };
};

export const essentialInjectiveFromFullyFaithful = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  prerequisites: {
    readonly faithfulness: FaithfulnessReport<SrcObj, SrcArr, TgtObj, TgtArr>;
    readonly fullness: FullnessWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  },
  options: EssentialInjectivityFromFullFaithfulnessOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
): EssentialInjectivityReport<SrcObj, TgtObj, TgtArr> => {
  const details: string[] = [];

  if (!prerequisites.faithfulness.holds || !prerequisites.fullness.holds) {
    details.push(
      "Cannot certify essential injectivity via Theorem 138 because the functor is not fully faithful on the supplied diagnostics.",
    );
    return {
      holds: false,
      failures: [],
      inspectedPairs: 0,
      details,
    };
  }

  const targetIsoSearch = ensureIsoSearch(functor.witness.target, options.targetIsoSearch);
  const targetEquals = ensureArrowEquality(functor.witness.target, options.targetEquals);
  const pairs = collectObjectPairs(functor.witness.objectGenerators, options.objectPairs);

  const failures: EssentialInjectivityFailure<SrcObj, TgtObj, TgtArr>[] = [];
  let inspectedPairs = 0;
  let successfulPairs = 0;

  for (const pair of pairs) {
    const imageLeft = functor.functor.F0(pair.source);
    const imageRight = functor.functor.F0(pair.target);
    const iso = targetIsoSearch(imageLeft, imageRight);
    if (!iso) {
      continue;
    }
    inspectedPairs += 1;
    const forwardLift = prerequisites.fullness.lift(pair.source, pair.target, iso.forward);
    const inverseLift = prerequisites.fullness.lift(pair.target, pair.source, iso.inverse);
    if (!forwardLift || !inverseLift) {
      failures.push({
        left: pair.source,
        right: pair.target,
        imageLeft,
        imageRight,
        witness: iso,
        reason: "Fullness witness failed to lift the target isomorphism to source arrows.",
      });
      continue;
    }

    const forwardImage = functor.functor.F1(forwardLift);
    const inverseImage = functor.functor.F1(inverseLift);
    const compositeRight = functor.witness.target.compose(forwardImage, inverseImage);
    const compositeLeft = functor.witness.target.compose(inverseImage, forwardImage);
    const identityRight = functor.witness.target.id(imageRight);
    const identityLeft = functor.witness.target.id(imageLeft);

    if (
      !targetEquals(compositeRight, identityRight) ||
      !targetEquals(compositeLeft, identityLeft)
    ) {
      failures.push({
        left: pair.source,
        right: pair.target,
        imageLeft,
        imageRight,
        witness: iso,
        reason:
          "Lifted arrows failed to compose to identities after applying the functor; faithfulness would be contradicted if they were inverses.",
      });
      continue;
    }

    successfulPairs += 1;
  }

  const holds = failures.length === 0;
  details.push(
    `Surveyed ${pairs.length} pair${pairs.length === 1 ? "" : "s"} of source objects while deriving essential injectivity from full faithfulness.`,
  );
  details.push(
    inspectedPairs === 0
      ? "No isomorphic image pairs were encountered among the supplied samples."
      : `Constructed source witnesses for ${successfulPairs} of ${inspectedPairs} image isomorphism pair${inspectedPairs === 1 ? "" : "s"}.`,
  );
  details.push(
    holds
      ? "Fullness and faithfulness lifted every image isomorphism to a source isomorphism, realising Theorem 138."
      : "Some image isomorphisms failed to lift to mutually inverse source arrows despite the full-faithfulness diagnostics.",
  );

  return { holds, failures, inspectedPairs, details };
};

export interface EssentialSurjectivityAssignment<SrcObj, TgtObj, TgtArr> {
  readonly targetObject: TgtObj;
  readonly sourceObject: SrcObj;
  readonly iso: IsoWitness<TgtArr>;
}

export interface EssentialSurjectivityFailure<SrcObj, TgtObj> {
  readonly targetObject: TgtObj;
  readonly attemptedSources: ReadonlyArray<SrcObj>;
  readonly reason: string;
}

export interface EssentialSurjectivityReport<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly holds: boolean;
  readonly assignments: ReadonlyArray<EssentialSurjectivityAssignment<SrcObj, TgtObj, TgtArr>>;
  readonly failures: ReadonlyArray<EssentialSurjectivityFailure<SrcObj, TgtObj>>;
  readonly details: ReadonlyArray<string>;
}

export interface EssentialSurjectivityOptions<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly targetObjects?: ReadonlyArray<TgtObj>;
  readonly sourceCandidates?: ReadonlyArray<SrcObj>;
  readonly targetIsoSearch?: IsoSearch<TgtObj, TgtArr>;
}

export const isEssentiallySurjective = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: EssentialSurjectivityOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
): EssentialSurjectivityReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const targetIsoSearch = ensureIsoSearch(functor.witness.target, options.targetIsoSearch);
  const targetObjects = collectTargetObjects(functor, options.targetObjects);
  const sourceCandidates = collectSourceObjects(functor, options.sourceCandidates);

  const assignments: EssentialSurjectivityAssignment<SrcObj, TgtObj, TgtArr>[] = [];
  const failures: EssentialSurjectivityFailure<SrcObj, TgtObj>[] = [];

  for (const targetObject of targetObjects) {
    let assigned: EssentialSurjectivityAssignment<SrcObj, TgtObj, TgtArr> | null = null;
    for (const source of sourceCandidates) {
      const imageObject = functor.functor.F0(source);
      const iso = targetIsoSearch(imageObject, targetObject);
      if (iso) {
        assigned = { targetObject, sourceObject: source, iso };
        break;
      }
    }
    if (assigned) {
      assignments.push(assigned);
    } else {
      failures.push({
        targetObject,
        attemptedSources: sourceCandidates,
        reason: "No source object mapped to an isomorphic target representative.",
      });
    }
  }

  const holds = failures.length === 0;
  const details: string[] = [];
  details.push(
    `Considered ${targetObjects.length} target object${targetObjects.length === 1 ? "" : "s"} for essential surjectivity.`,
  );
  details.push(
    holds
      ? "Every target object admitted an isomorphism from the image of some source object."
      : `${failures.length} target object${failures.length === 1 ? "" : "s"} lacked an isomorphic image representative.`,
  );

  return { holds, assignments, failures, details };
};

export interface EquivalencePrerequisites<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly faithfulness: FaithfulnessReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly fullness: FullnessWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly essentialSurjectivity: EssentialSurjectivityReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly essentialInjectivity?: EssentialInjectivityReport<SrcObj, TgtObj, TgtArr>;
}

export interface EquivalenceConstructionOptions<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly targetHom?: HomSetEnumerator<TgtObj, TgtArr>;
  readonly targetEquals?: (left: TgtArr, right: TgtArr) => boolean;
  readonly sourceEquals?: (left: SrcArr, right: SrcArr) => boolean;
  readonly metadata?: ReadonlyArray<string>;
  readonly functorSamples?: FunctorCheckSamples<TgtObj, TgtArr>;
  readonly essentialInjectivityOptions?: EssentialInjectivityFromFullFaithfulnessOptions<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr
  >;
}

export interface FunctorEquivalenceWitness<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly quasiInverse: FunctorWithWitness<TgtObj, TgtArr, SrcObj, SrcArr>;
  readonly unit: NaturalTransformationWithWitness<SrcObj, SrcArr, SrcObj, SrcArr>;
  readonly counit: NaturalTransformationWithWitness<TgtObj, TgtArr, TgtObj, TgtArr>;
  readonly adjunction: AdjunctionWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly metadata?: ReadonlyArray<string>;
  readonly essentialInjectivity?: EssentialInjectivityReport<SrcObj, TgtObj, TgtArr>;
}

const collectTargetArrowSamples = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  supplied?: HomSetEnumerator<Obj, Arr>,
): ReadonlyArray<Arr> => {
  const candidate = category as FiniteLikeCategory<Obj, Arr>;
  if (Array.isArray(candidate.arrows)) {
    return candidate.arrows;
  }
  if (supplied) {
    const objects = collectObjects({ fallback: (candidate.objects as ReadonlyArray<Obj>) ?? [] });
    const arrows: Arr[] = [];
    for (const source of objects) {
      for (const target of objects) {
        arrows.push(...supplied(source, target));
      }
    }
    return arrows;
  }
  return [];
};

export const buildEquivalenceWitness = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  prerequisites: EquivalencePrerequisites<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: EquivalenceConstructionOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
): FunctorEquivalenceWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  if (!prerequisites.faithfulness.holds) {
    throw new Error("Cannot build an equivalence witness: functor is not faithful on supplied samples.");
  }
  if (!prerequisites.fullness.holds) {
    throw new Error("Cannot build an equivalence witness: functor is not full on supplied samples.");
  }
  if (!prerequisites.essentialSurjectivity.holds) {
    throw new Error(
      "Cannot build an equivalence witness: functor is not essentially surjective on supplied objects.",
    );
  }

  const essentialInjectivityReport =
    prerequisites.essentialInjectivity ??
    essentialInjectiveFromFullyFaithful(
      functor,
      {
        faithfulness: prerequisites.faithfulness,
        fullness: prerequisites.fullness,
      },
      options.essentialInjectivityOptions ?? {},
    );

  const assignmentMap = new Map<
    TgtObj,
    { readonly sourceObject: SrcObj; readonly iso: IsoWitness<TgtArr> }
  >();
  for (const assignment of prerequisites.essentialSurjectivity.assignments) {
    assignmentMap.set(assignment.targetObject, {
      sourceObject: assignment.sourceObject,
      iso: assignment.iso,
    });
  }

  const targetEq = ensureArrowEquality(functor.witness.target, options.targetEquals);
  const targetHom = ensureHomEnumerator(functor.witness.target, options.targetHom);
  const quasiInverseFunctor = {
    F0: (object: TgtObj): SrcObj => {
      const assignment = assignmentMap.get(object);
      if (!assignment) {
        throw new Error("Essential surjectivity assignment missing for target object.");
      }
      return assignment.sourceObject;
    },
    F1: (arrow: TgtArr): SrcArr => {
      const sourceObject = functor.witness.target.src(arrow);
      const targetObject = functor.witness.target.dst(arrow);
      const sourceAssignment = assignmentMap.get(sourceObject);
      const targetAssignment = assignmentMap.get(targetObject);
      if (!sourceAssignment || !targetAssignment) {
        throw new Error("Essential surjectivity assignments must cover every target object.");
      }
      const transported = functor.witness.target.compose(
        targetAssignment.iso.inverse,
        functor.witness.target.compose(arrow, sourceAssignment.iso.forward),
      );
      const lifted = prerequisites.fullness.lift(
        sourceAssignment.sourceObject,
        targetAssignment.sourceObject,
        transported,
      );
      if (!lifted) {
        throw new Error("Fullness witness failed to lift transported arrow during quasi-inverse construction.");
      }
      return lifted;
    },
  };

  const arrowSamples = collectTargetArrowSamples(functor.witness.target, targetHom);
  const objectSamples = collectTargetObjects(functor, prerequisites.essentialSurjectivity.assignments.map((a) => a.targetObject));
  const functorSamples: FunctorCheckSamples<TgtObj, TgtArr> = options.functorSamples ?? {
    objects: objectSamples,
    arrows: arrowSamples,
  };

  const quasiInverse = constructFunctorWithWitness(
    functor.witness.target,
    functor.witness.source,
    quasiInverseFunctor,
    functorSamples,
    options.metadata,
  );

  const identityOnTarget = identityFunctorWithWitness(functor.witness.target, {
    objects: objectSamples,
    arrows: arrowSamples,
  });
  const compositeFG = composeFunctors(functor, quasiInverse, {
    metadata: ["Composite functor for counit component."],
    samples: functorSamples,
  });

  const counitEqualMor = ensureArrowEquality(functor.witness.target, options.targetEquals);
  const counit = constructNaturalTransformationWithWitness(
    compositeFG,
    identityOnTarget,
    (object) => {
      const assignment = assignmentMap.get(object);
      if (!assignment) {
        throw new Error("Missing essential surjectivity assignment while building counit.");
      }
      return assignment.iso.forward;
    },
    {
      samples: {
        objects: objectSamples,
        arrows: arrowSamples,
      },
      equalMor: counitEqualMor,
      metadata: [
        "Counit components reuse the essential-surjectivity isomorphisms F(G(B)) → B.",
      ],
    },
  );

  const identityOnSource = identityFunctorWithWitness(functor.witness.source, {
    objects: functor.witness.objectGenerators,
    arrows: prerequisites.faithfulness.checkedHomSets > 0
      ? functor.witness.arrowGenerators
      : [],
  });
  const compositeGF = composeFunctors(quasiInverse, functor, {
    metadata: ["Composite functor for unit component."],
  });

  const unitEqualMor = ensureArrowEquality(functor.witness.source, options.sourceEquals);
  const unit = constructNaturalTransformationWithWitness(
    identityOnSource,
    compositeGF,
    (object) => {
      const imageObject = functor.functor.F0(object);
      const assignment = assignmentMap.get(imageObject);
      if (!assignment) {
        throw new Error("Missing essential surjectivity assignment for image object while building unit.");
      }
      const lifted = prerequisites.fullness.lift(
        object,
        assignment.sourceObject,
        assignment.iso.inverse,
      );
      if (!lifted) {
        throw new Error(
          "Fullness witness failed to lift the inverse essential-surjectivity component while building the unit.",
        );
      }
      return lifted;
    },
    {
      samples: {
        objects: functor.witness.objectGenerators,
        arrows: functor.witness.arrowGenerators,
      },
      equalMor: unitEqualMor,
      metadata: [
        "Unit components lift the inverse essential-surjectivity arrows via fullness.",
      ],
    },
  );

  const adjunction = constructAdjunctionWithWitness(functor, quasiInverse, unit, counit, {
    metadata: ["Adjunction witness underlying the equivalence."],
  });

  const metadata: string[] = [
    ...(options.metadata ?? []),
    "Equivalence witness packages quasi-inverse, unit, and counit built from fullness, faithfulness, and essential surjectivity.",
  ];
  if (essentialInjectivityReport) {
    metadata.push(
      essentialInjectivityReport.holds
        ? "Essential injectivity diagnostics confirmed the quasi-inverse choices are unique up to isomorphism."
        : "Essential injectivity diagnostics reported counterexamples; quasi-inverse choices may not be unique.",
    );
  } else {
    metadata.push("Essential injectivity diagnostics were unavailable; skipped Theorem 138 short-circuit.");
  }

  return {
    functor,
    quasiInverse,
    unit,
    counit,
    adjunction,
    metadata,
    essentialInjectivity: essentialInjectivityReport,
  };
};
