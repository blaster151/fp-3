import type { FiniteCategory } from "./finite-cat";
import type {
  FunctorCheckSamples,
  FunctorWithWitness,
} from "./functor";
import { composeFunctors, constructFunctorWithWitness } from "./functor";
import type { IsoWitness } from "./kinds/iso";
import { areIsomorphic } from "./kinds/iso";
import {
  buildEquivalenceWitness,
  checkEssentialInjectivityOnObjects,
  checkFaithfulFunctor,
  checkFullFunctor,
  type EquivalencePrerequisites,
  type EssentialInjectivityReport,
  type EssentialSurjectivityReport,
  type FaithfulnessReport,
  type FullnessWitness,
  type FunctorEquivalenceWitness,
  isEssentiallySurjective,
} from "./functor-equivalence";
import type { SimpleCat } from "./simple-cat";

export type IsoSearch<Obj, Arr> = (left: Obj, right: Obj) => IsoWitness<Arr> | null;

const ensureObjectList = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  explicit?: ReadonlyArray<Obj>,
): ReadonlyArray<Obj> => {
  if (explicit) {
    return explicit;
  }
  if (Array.isArray(category.objects)) {
    return category.objects;
  }
  throw new Error("computeSkeleton requires explicit object enumeration when category lacks objects list.");
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
    return (left, right) => areIsomorphic(candidate as FiniteCategory<Obj, Arr>, left, right);
  }
  return () => null;
};

const invertIso = <Arr>(witness: IsoWitness<Arr>): IsoWitness<Arr> => ({
  forward: witness.inverse,
  inverse: witness.forward,
});

export interface SkeletonAssignment<Obj, Arr> {
  readonly object: Obj;
  readonly representative: Obj;
  readonly witness: IsoWitness<Arr>;
}

export interface SkeletonClass<Obj, Arr> {
  readonly representative: Obj;
  readonly members: ReadonlyArray<SkeletonAssignment<Obj, Arr>>;
}

export interface SkeletonComputationOptions<Obj, Arr> {
  readonly objects?: ReadonlyArray<Obj>;
  readonly isoSearch?: IsoSearch<Obj, Arr>;
  readonly functorSamples?: FunctorCheckSamples<Obj, Arr>;
}

export interface SkeletonComputationResult<Obj, Arr> {
  readonly category: FiniteCategory<Obj, Arr>;
  readonly skeleton: FiniteCategory<Obj, Arr>;
  readonly inclusion: FunctorWithWitness<Obj, Arr, Obj, Arr>;
  readonly essentialSurjectivity: EssentialSurjectivityReport<Obj, Arr, Obj, Arr>;
  readonly faithfulness: FaithfulnessReport<Obj, Arr, Obj, Arr>;
  readonly fullness: FullnessWitness<Obj, Arr, Obj, Arr>;
  readonly essentialInjectivity: EssentialInjectivityReport<Obj, Obj, Arr>;
  readonly classes: ReadonlyArray<SkeletonClass<Obj, Arr>>;
  readonly assignments: ReadonlyArray<SkeletonAssignment<Obj, Arr>>;
  readonly representativeMap: ReadonlyMap<Obj, SkeletonAssignment<Obj, Arr>>;
}

const makeIdentityWitness = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  object: Obj,
): IsoWitness<Arr> => {
  const id = category.id(object);
  return { forward: id, inverse: id };
};

export const computeSkeleton = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  options: SkeletonComputationOptions<Obj, Arr> = {},
): SkeletonComputationResult<Obj, Arr> => {
  const objects = ensureObjectList(category, options.objects);
  const isoSearch = ensureIsoSearch(category, options.isoSearch);

  const classes: SkeletonClass<Obj, Arr>[] = [];
  const classMembers = new Map<Obj, SkeletonAssignment<Obj, Arr>[]>() as Map<
    Obj,
    SkeletonAssignment<Obj, Arr>[]
  >;
  const representativeOrder: Obj[] = [];

  const representativeForObject = new Map<Obj, SkeletonAssignment<Obj, Arr>>();

  for (const object of objects) {
    let assigned: SkeletonAssignment<Obj, Arr> | null = null;
    for (const representative of representativeOrder) {
      const direct = isoSearch(representative, object);
      const witness =
        direct ??
        (() => {
          const reverse = isoSearch(object, representative);
          return reverse ? invertIso(reverse) : null;
        })();
      if (witness) {
        const assignment: SkeletonAssignment<Obj, Arr> = {
          object,
          representative,
          witness,
        };
        classMembers.get(representative)!.push(assignment);
        representativeForObject.set(object, assignment);
        assigned = assignment;
        break;
      }
    }
    if (!assigned) {
      const identityWitness = makeIdentityWitness(category, object);
      const assignment: SkeletonAssignment<Obj, Arr> = {
        object,
        representative: object,
        witness: identityWitness,
      };
      classMembers.set(object, [assignment]);
      representativeOrder.push(object);
      representativeForObject.set(object, assignment);
      classes.push({ representative: object, members: classMembers.get(object)! });
    }
  }

  const skeletonObjects = representativeOrder;
  const skeletonObjectSet = new Set(skeletonObjects);
  const skeletonArrows = category.arrows.filter(
    (arrow) => skeletonObjectSet.has(category.src(arrow)) && skeletonObjectSet.has(category.dst(arrow)),
  );
  const skeleton: FiniteCategory<Obj, Arr> = {
    ...category,
    objects: skeletonObjects,
    arrows: skeletonArrows,
  };

  const samples: FunctorCheckSamples<Obj, Arr> =
    options.functorSamples ?? {
      objects: skeletonObjects,
      arrows: skeletonArrows,
    };

  const inclusion = constructFunctorWithWitness(
    skeleton,
    category,
    {
      F0: (object) => object,
      F1: (arrow) => arrow,
    },
    samples,
    ["Skeleton inclusion functor carries representatives into the ambient category."],
  );

  const isoAssignmentMap = new Map<Obj, SkeletonAssignment<Obj, Arr>>(representativeForObject);

  const essentialSurjectivity = isEssentiallySurjective(inclusion, {
    targetObjects: objects,
    sourceCandidates: skeletonObjects,
    targetIsoSearch: (left, right) => {
      const assignment = isoAssignmentMap.get(right);
      if (assignment && Object.is(assignment.representative, left)) {
        return assignment.witness;
      }
      return isoSearch(left, right);
    },
  });

  const faithfulness = checkFaithfulFunctor(inclusion);
  const fullness = checkFullFunctor(inclusion);
  const essentialInjectivity = checkEssentialInjectivityOnObjects(inclusion);

  const finalizedClasses: SkeletonClass<Obj, Arr>[] = classes.map((entry) => ({
    representative: entry.representative,
    members: [...entry.members],
  }));

  const assignments = objects
    .map((object) => isoAssignmentMap.get(object))
    .filter((assignment): assignment is SkeletonAssignment<Obj, Arr> => assignment != null);

  return {
    category,
    skeleton,
    inclusion,
    essentialSurjectivity,
    faithfulness,
    fullness,
    essentialInjectivity,
    classes: finalizedClasses,
    assignments,
    representativeMap: isoAssignmentMap,
  };
};

export interface SkeletonEquivalenceResult<Obj, Arr> {
  readonly computation: SkeletonComputationResult<Obj, Arr>;
  readonly prerequisites: EquivalencePrerequisites<Obj, Arr, Obj, Arr>;
  readonly equivalence: FunctorEquivalenceWitness<Obj, Arr, Obj, Arr>;
}

export const skeletonEquivalenceWitness = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  options: SkeletonComputationOptions<Obj, Arr> = {},
): SkeletonEquivalenceResult<Obj, Arr> => {
  const computation = computeSkeleton(category, options);
  const prerequisites: EquivalencePrerequisites<Obj, Arr, Obj, Arr> = {
    faithfulness: computation.faithfulness,
    fullness: computation.fullness,
    essentialSurjectivity: computation.essentialSurjectivity,
    essentialInjectivity: computation.essentialInjectivity,
  };
  const equivalence = buildEquivalenceWitness(computation.inclusion, prerequisites, {
    metadata: ["Skeleton inclusion equivalence captures the canonical skeleton adjoint pair."],
  });
  return { computation, prerequisites, equivalence };
};

export interface RestrictFunctorOptions<Obj, Arr> {
  readonly samples?: FunctorCheckSamples<Obj, Arr>;
  readonly metadata?: ReadonlyArray<string>;
}

export const restrictFunctorToSkeleton = <Obj, Arr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<Obj, Arr, TgtObj, TgtArr>,
  skeleton: SkeletonComputationResult<Obj, Arr>,
  options: RestrictFunctorOptions<Obj, Arr> = {},
): FunctorWithWitness<Obj, Arr, TgtObj, TgtArr> => {
  const samples = options.samples ?? {
    objects: skeleton.skeleton.objects,
    arrows: skeleton.skeleton.arrows,
  };
  return constructFunctorWithWitness(
    skeleton.skeleton,
    functor.witness.target,
    {
      F0: (object) => functor.functor.F0(object),
      F1: (arrow) => functor.functor.F1(arrow),
    },
    samples,
    options.metadata,
  );
};

const ensureArrowEquality = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  supplied?: (left: Arr, right: Arr) => boolean,
): ((left: Arr, right: Arr) => boolean) => {
  if (supplied) {
    return supplied;
  }
  const candidate = category as Partial<FiniteCategory<Obj, Arr>>;
  if (typeof candidate?.eq === "function") {
    return candidate.eq.bind(candidate);
  }
  return (left, right) => Object.is(left, right);
};

export interface SkeletonNaturalIsomorphism<Obj, TgtObj, TgtArr> {
  readonly object: Obj;
  readonly firstImage: TgtObj;
  readonly secondImage: TgtObj;
  readonly witness: IsoWitness<TgtArr>;
}

export interface SkeletonNaturalIsomorphismFailure<Obj, Arr, TgtObj, TgtArr> {
  readonly object: Obj;
  readonly firstImage: TgtObj;
  readonly secondImage: TgtObj;
  readonly reason: string;
  readonly arrowFailure?: {
    readonly arrow: Arr;
    readonly lhs: TgtArr;
    readonly rhs: TgtArr;
  };
}

export interface SkeletonFunctorComparisonOptions<Obj, Arr, TgtObj, TgtArr> {
  readonly targetIsoSearch?: IsoSearch<TgtObj, TgtArr>;
  readonly targetArrowEquals?: (left: TgtArr, right: TgtArr) => boolean;
}

export interface SkeletonFunctorComparisonResult<Obj, Arr, TgtObj, TgtArr> {
  readonly restrictedFirst: FunctorWithWitness<Obj, Arr, TgtObj, TgtArr>;
  readonly restrictedSecond: FunctorWithWitness<Obj, Arr, TgtObj, TgtArr>;
  readonly assignments: ReadonlyArray<SkeletonNaturalIsomorphism<Obj, TgtObj, TgtArr>>;
  readonly failures: ReadonlyArray<SkeletonNaturalIsomorphismFailure<Obj, Arr, TgtObj, TgtArr>>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export const compareFunctorsModuloSkeleton = <Obj, Arr, TgtObj, TgtArr>(
  skeleton: SkeletonComputationResult<Obj, Arr>,
  first: FunctorWithWitness<Obj, Arr, TgtObj, TgtArr>,
  second: FunctorWithWitness<Obj, Arr, TgtObj, TgtArr>,
  options: SkeletonFunctorComparisonOptions<Obj, Arr, TgtObj, TgtArr> = {},
): SkeletonFunctorComparisonResult<Obj, Arr, TgtObj, TgtArr> => {
  const restrictedFirst = restrictFunctorToSkeleton(first, skeleton);
  const restrictedSecond = restrictFunctorToSkeleton(second, skeleton);
  const targetIsoSearch = ensureIsoSearch(restrictedFirst.witness.target, options.targetIsoSearch);
  const equals = ensureArrowEquality(restrictedFirst.witness.target, options.targetArrowEquals);

  const assignments: SkeletonNaturalIsomorphism<Obj, TgtObj, TgtArr>[] = [];
  const failures: SkeletonNaturalIsomorphismFailure<Obj, Arr, TgtObj, TgtArr>[] = [];
  const assignmentMap = new Map<Obj, SkeletonNaturalIsomorphism<Obj, TgtObj, TgtArr>>();

  for (const object of skeleton.skeleton.objects) {
    const firstImage = restrictedFirst.functor.F0(object);
    const secondImage = restrictedSecond.functor.F0(object);
    const witness = targetIsoSearch(firstImage, secondImage);
    if (!witness) {
      failures.push({
        object,
        firstImage,
        secondImage,
        reason: "No isomorphism witnesses the object-level images.",
      });
      continue;
    }
    const record = { object, firstImage, secondImage, witness };
    assignments.push(record);
    assignmentMap.set(object, record);
  }

  for (const arrow of skeleton.skeleton.arrows) {
    const source = skeleton.skeleton.src(arrow);
    const target = skeleton.skeleton.dst(arrow);
    const sourceAssignment = assignmentMap.get(source);
    const targetAssignment = assignmentMap.get(target);
    if (!sourceAssignment || !targetAssignment) {
      continue;
    }
    const firstArrow = restrictedFirst.functor.F1(arrow);
    const secondArrow = restrictedSecond.functor.F1(arrow);
    const lhs = restrictedFirst.witness.target.compose(
      secondArrow,
      sourceAssignment.witness.forward,
    );
    const rhs = restrictedFirst.witness.target.compose(
      targetAssignment.witness.forward,
      firstArrow,
    );
    if (!equals(lhs, rhs)) {
      failures.push({
        object: source,
        firstImage: sourceAssignment.firstImage,
        secondImage: sourceAssignment.secondImage,
        reason: "Naturality condition failed for the supplied isomorphism witnesses.",
        arrowFailure: { arrow, lhs, rhs },
      });
    }
  }

  const holds = failures.length === 0;
  const details: string[] = [];
  details.push(
    `Checked ${skeleton.skeleton.objects.length} skeleton object${skeleton.skeleton.objects.length === 1 ? "" : "s"} for objectwise isomorphisms.`,
  );
  details.push(
    holds
      ? "All restricted functor images agreed up to a natural isomorphism on the skeleton."
      : `${failures.length} naturality or object-level comparison${failures.length === 1 ? "" : "s"} failed on the skeleton.`,
  );

  return { restrictedFirst, restrictedSecond, assignments, failures, holds, details };
};

export interface EssentialInjectivitySkeletonClassification<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly leftSource: SrcObj;
  readonly rightSource: SrcObj;
  readonly leftImage: TgtObj;
  readonly rightImage: TgtObj;
  readonly witness: IsoWitness<TgtArr>;
  readonly sharesSkeletonRepresentative: boolean;
  readonly representative: TgtObj | null;
}

export interface EssentialInjectivitySkeletonAnalysis<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly original: EssentialInjectivityReport<SrcObj, TgtObj, TgtArr>;
  readonly projected: EssentialInjectivityReport<SrcObj, TgtObj, TgtArr>;
  readonly classifications: ReadonlyArray<EssentialInjectivitySkeletonClassification<SrcObj, SrcArr, TgtObj, TgtArr>>;
  readonly resolvedFailures: ReadonlyArray<EssentialInjectivitySkeletonClassification<SrcObj, SrcArr, TgtObj, TgtArr>>;
  readonly details: ReadonlyArray<string>;
}

export interface EssentialInjectivitySkeletonOptions<SrcObj, SrcArr> {
  readonly originalPairs?: ReadonlyArray<{ readonly source: SrcObj; readonly target: SrcObj }>;
  readonly projectedPairs?: ReadonlyArray<{ readonly source: SrcObj; readonly target: SrcObj }>;
}

const classifyEssentialInjectivityFailures = <SrcObj, SrcArr, TgtObj, TgtArr>(
  failures: ReadonlyArray<{
    readonly left: SrcObj;
    readonly right: SrcObj;
    readonly imageLeft: TgtObj;
    readonly imageRight: TgtObj;
    readonly witness: IsoWitness<TgtArr>;
  }>,
  targetAssignments: ReadonlyMap<TgtObj, SkeletonAssignment<TgtObj, TgtArr>>,
): EssentialInjectivitySkeletonClassification<SrcObj, SrcArr, TgtObj, TgtArr>[] =>
  failures.map((failure) => {
    const leftAssignment = targetAssignments.get(failure.imageLeft);
    const rightAssignment = targetAssignments.get(failure.imageRight);
    const representative =
      leftAssignment && rightAssignment && Object.is(leftAssignment.representative, rightAssignment.representative)
        ? leftAssignment.representative
        : null;
    return {
      leftSource: failure.left,
      rightSource: failure.right,
      leftImage: failure.imageLeft,
      rightImage: failure.imageRight,
      witness: failure.witness,
      sharesSkeletonRepresentative: representative != null,
      representative,
    };
  });

const failureKey = <SrcObj>(left: SrcObj, right: SrcObj): string => `${String(left)}→${String(right)}`;

export const analyzeEssentialInjectivityModuloTargetSkeleton = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  targetSkeleton: SkeletonEquivalenceResult<TgtObj, TgtArr>,
  options: EssentialInjectivitySkeletonOptions<SrcObj, SrcArr> = {},
): EssentialInjectivitySkeletonAnalysis<SrcObj, SrcArr, TgtObj, TgtArr> => {
    const original = checkEssentialInjectivityOnObjects(functor, {
      ...(options.originalPairs ? { objectPairs: options.originalPairs } : {}),
    });
  const projectedFunctor = composeFunctors(targetSkeleton.equivalence.quasiInverse, functor, {
    metadata: ["Projected onto codomain skeleton for essential-injectivity diagnostics."],
  });
    const projectedPairs = options.projectedPairs ?? options.originalPairs;
    const projected = checkEssentialInjectivityOnObjects(projectedFunctor, {
      ...(projectedPairs ? { objectPairs: projectedPairs } : {}),
    });

  const assignments = targetSkeleton.computation.representativeMap;
  const classifications = classifyEssentialInjectivityFailures(original.failures, assignments);

  const projectedFailureKeys = new Set(
    projected.failures.map((failure) => failureKey(failure.left, failure.right)),
  );
  const resolvedFailures = classifications.filter(
    (classification) => !projectedFailureKeys.has(failureKey(classification.leftSource, classification.rightSource)),
  );

  const details: string[] = [];
  details.push(
    original.holds
      ? "Original functor passed essential-injectivity checks."
      : `${original.failures.length} original failure${original.failures.length === 1 ? "" : "s"} detected before skeleton projection.`,
  );
  details.push(
    projected.holds
      ? "No essential-injectivity failures remained after projecting through the codomain skeleton."
      : `${projected.failures.length} failure${projected.failures.length === 1 ? "" : "s"} persisted after skeleton projection.`,
  );
  details.push(
    resolvedFailures.length === 0
      ? "No failures were resolved by factoring through the skeleton."
      : `${resolvedFailures.length} failure${resolvedFailures.length === 1 ? "" : "s"} disappeared after factoring through the skeleton, indicating redundancy among codomain isomorphism classes.`,
  );

  return {
    original,
    projected,
    classifications,
    resolvedFailures,
    details,
  };
};

export const projectFunctorThroughSkeleton = <Obj, Arr>(
  skeleton: SkeletonEquivalenceResult<Obj, Arr>,
): FunctorWithWitness<Obj, Arr, Obj, Arr> =>
  composeFunctors(skeleton.equivalence.quasiInverse, skeleton.computation.inclusion, {
    metadata: ["Skeleton projector collapses a category onto its chosen representatives."],
  });
