import type { SimpleCat } from "./simple-cat";
import type { FunctorWithWitness } from "./functor";
import { evaluateFunctorProperties, makeObjectPropertyOracle } from "./functor-property";
import type {
  AnyFunctorPropertyAnalysis,
  AnyFunctorPropertyOracle,
  CategoryPropertyCheck,
  FunctorPropertyOracle,
  ObjectPropertySample,
} from "./functor-property-types";
import type { NaturalTransformationWithWitness } from "./natural-transformation";
import { CategoryLimits } from "./stdlib/category-limits";

interface SimpleCatWithEquality<Obj, Arr> extends SimpleCat<Obj, Arr> {
  readonly eq?: (left: Arr, right: Arr) => boolean;
  readonly equalMor?: (left: Arr, right: Arr) => boolean;
}

const arrowEquality = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): ((left: Arr, right: Arr) => boolean) | undefined => {
  const enriched = category as SimpleCatWithEquality<Obj, Arr>;
  if (typeof enriched.eq === "function") {
    return enriched.eq.bind(enriched);
  }
  if (typeof enriched.equalMor === "function") {
    return enriched.equalMor.bind(enriched);
  }
  return undefined;
};

const composeAndCompare = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  expected: Arr,
  actual: Arr,
): boolean => {
  const equality = arrowEquality(category);
  return equality ? equality(expected, actual) : Object.is(expected, actual);
};

export interface AdjunctionCheckSamples<SrcObj, TgtObj> {
  readonly sourceObjects?: ReadonlyArray<SrcObj>;
  readonly targetObjects?: ReadonlyArray<TgtObj>;
}

export interface UniversalMediationResult<Arr> {
  readonly factored: boolean;
  readonly mediator?: Arr;
  readonly reason?: string;
}

const readDiagramObject = <I, O, M>(
  diagram: CategoryLimits.Cone<I, O, M>["diagram"],
  index: I,
): { readonly ok: true; readonly object: O } | { readonly ok: false; readonly reason: string } => {
  const accessor = (diagram as { onObjects?: (idx: I) => O }).onObjects;
  if (typeof accessor === "function") {
    return { ok: true, object: accessor(index) };
  }
  return {
    ok: false,
    reason:
      "Adjunction preservation check requires diagram.onObjects to recover leg codomains for sampled limits.",
  };
};

const readCoconeDiagramObject = <I, O, M>(
  diagram: CategoryLimits.Cocone<I, O, M>["diagram"],
  index: I,
): { readonly ok: true; readonly object: O } | { readonly ok: false; readonly reason: string } => {
  const accessor = (diagram as { onObjects?: (idx: I) => O }).onObjects;
  if (typeof accessor === "function") {
    return { ok: true, object: accessor(index) };
  }
  return {
    ok: false,
    reason:
      "Adjunction preservation check requires diagram.onObjects to recover leg domains for sampled colimits.",
  };
};

export interface AdjunctionTriangleFailure<Obj, Arr> {
  readonly object: Obj;
  readonly expected: Arr;
  readonly actual: Arr;
  readonly reason: string;
}

export interface AdjunctionTriangleReport<Obj, Arr> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<AdjunctionTriangleFailure<Obj, Arr>>;
  readonly details: ReadonlyArray<string>;
}

export interface AdjunctionReport<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly leftTriangle: AdjunctionTriangleReport<SrcObj, TgtArr>;
  readonly rightTriangle: AdjunctionTriangleReport<TgtObj, SrcArr>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface AdjunctionLimitPreservationSample<I, SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly label?: string;
  readonly indices: ReadonlyArray<I>;
  readonly diagram: CategoryLimits.Cone<I, TgtObj, TgtArr>["diagram"];
  readonly limit: CategoryLimits.Cone<I, TgtObj, TgtArr>;
  readonly factor: (
    candidate: CategoryLimits.Cone<I, TgtObj, TgtArr>,
  ) => UniversalMediationResult<TgtArr>;
  readonly cones: ReadonlyArray<CategoryLimits.Cone<I, SrcObj, SrcArr>>;
  readonly sourceCones?: ReadonlyArray<CategoryLimits.Cone<I, TgtObj, TgtArr>>;
  readonly details?: ReadonlyArray<string>;
}

export interface AdjunctionColimitPreservationSample<I, SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly label?: string;
  readonly indices: ReadonlyArray<I>;
  readonly diagram: CategoryLimits.Cocone<I, SrcObj, SrcArr>["diagram"];
  readonly colimit: CategoryLimits.Cocone<I, SrcObj, SrcArr>;
  readonly factor: (
    candidate: CategoryLimits.Cocone<I, SrcObj, SrcArr>,
  ) => UniversalMediationResult<SrcArr>;
  readonly cocones: ReadonlyArray<CategoryLimits.Cocone<I, TgtObj, TgtArr>>;
  readonly sourceCocones?: ReadonlyArray<CategoryLimits.Cocone<I, SrcObj, SrcArr>>;
  readonly details?: ReadonlyArray<string>;
}

export interface RightAdjointLimitWitness<I, SrcObj, SrcArr, TgtArr> {
  readonly checkedCones: number;
  readonly indices: ReadonlyArray<I>;
  readonly mediators: ReadonlyArray<{
    readonly coneTip: SrcObj;
    readonly mediator: SrcArr;
    readonly adjunct: TgtArr;
  }>;
  readonly notes: ReadonlyArray<string>;
}

export interface LeftAdjointColimitWitness<I, SrcArr, TgtObj, TgtArr> {
  readonly checkedCocones: number;
  readonly indices: ReadonlyArray<I>;
  readonly mediators: ReadonlyArray<{
    readonly coconeTip: TgtObj;
    readonly mediator: TgtArr;
    readonly adjunct: SrcArr;
  }>;
  readonly notes: ReadonlyArray<string>;
}

export interface AdjunctionLimitPreservationAnalysis<
  I,
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly sample: AdjunctionLimitPreservationSample<I, SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly analysis: AnyFunctorPropertyAnalysis<TgtObj, TgtArr, SrcObj, SrcArr>;
}

export interface AdjunctionColimitPreservationAnalysis<
  I,
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly sample: AdjunctionColimitPreservationSample<I, SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly analysis: AnyFunctorPropertyAnalysis<SrcObj, SrcArr, TgtObj, TgtArr>;
}

export interface AdjunctionPreservationMetadata<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly rightPreservesLimits?: ReadonlyArray<
    AdjunctionLimitPreservationAnalysis<unknown, SrcObj, SrcArr, TgtObj, TgtArr>
  >;
  readonly leftPreservesColimits?: ReadonlyArray<
    AdjunctionColimitPreservationAnalysis<unknown, SrcObj, SrcArr, TgtObj, TgtArr>
  >;
}

export interface AdjunctionWithWitness<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly left: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly right: FunctorWithWitness<TgtObj, TgtArr, SrcObj, SrcArr>;
  readonly unit: NaturalTransformationWithWitness<SrcObj, SrcArr, SrcObj, SrcArr>;
  readonly counit: NaturalTransformationWithWitness<TgtObj, TgtArr, TgtObj, TgtArr>;
  readonly report: AdjunctionReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly metadata?: ReadonlyArray<string>;
  readonly preservation?: AdjunctionPreservationMetadata<SrcObj, SrcArr, TgtObj, TgtArr>;
}

interface AdjunctionConstructionOptions<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly samples?: AdjunctionCheckSamples<SrcObj, TgtObj>;
  readonly metadata?: ReadonlyArray<string>;
  readonly limitPreservation?: {
    readonly samples: ReadonlyArray<
      AdjunctionLimitPreservationSample<unknown, SrcObj, SrcArr, TgtObj, TgtArr>
    >;
  };
  readonly colimitPreservation?: {
    readonly samples: ReadonlyArray<
      AdjunctionColimitPreservationSample<unknown, SrcObj, SrcArr, TgtObj, TgtArr>
    >;
  };
}

const collectSourceObjects = <SrcObj, SrcArr, TgtObj, TgtArr>(
  left: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  unit: NaturalTransformationWithWitness<SrcObj, SrcArr, SrcObj, SrcArr>,
  samples?: AdjunctionCheckSamples<SrcObj, unknown>,
): ReadonlyArray<SrcObj> => {
  const set = new Set<SrcObj>();
  for (const object of unit.witness.objectSamples) {
    set.add(object);
  }
  for (const object of left.witness.objectGenerators) {
    set.add(object);
  }
  for (const object of samples?.sourceObjects ?? []) {
    set.add(object);
  }
  return Array.from(set);
};

const collectTargetObjects = <SrcObj, SrcArr, TgtObj, TgtArr>(
  right: FunctorWithWitness<TgtObj, TgtArr, SrcObj, SrcArr>,
  counit: NaturalTransformationWithWitness<TgtObj, TgtArr, TgtObj, TgtArr>,
  samples?: AdjunctionCheckSamples<unknown, TgtObj>,
): ReadonlyArray<TgtObj> => {
  const set = new Set<TgtObj>();
  for (const object of counit.witness.objectSamples) {
    set.add(object);
  }
  for (const object of right.witness.objectGenerators) {
    set.add(object);
  }
  for (const object of samples?.targetObjects ?? []) {
    set.add(object);
  }
  return Array.from(set);
};

const checkLeftTriangle = <SrcObj, SrcArr, TgtObj, TgtArr>(
  left: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  unit: NaturalTransformationWithWitness<SrcObj, SrcArr, SrcObj, SrcArr>,
  counit: NaturalTransformationWithWitness<TgtObj, TgtArr, TgtObj, TgtArr>,
  samples: ReadonlyArray<SrcObj>,
): AdjunctionTriangleReport<SrcObj, TgtArr> => {
  const category = left.witness.target;
  const failures: AdjunctionTriangleFailure<SrcObj, TgtArr>[] = [];

  for (const object of samples) {
    const FA = left.functor.F0(object);
    const eta = unit.transformation.component(object);
    const mappedEta = left.functor.F1(eta);
    const epsilon = counit.transformation.component(FA);
    const composite = category.compose(epsilon, mappedEta);
    const identity = category.id(FA);
    if (!composeAndCompare(category, identity, composite)) {
      failures.push({
        object,
        expected: identity,
        actual: composite,
        reason: "ε_{FA} ∘ Fη_A did not reduce to the identity on F A",
      });
    }
  }

  const holds = failures.length === 0;
  const details = holds
    ? [`Left triangle verified on ${samples.length} sampled object(s).`]
    : ["Left triangle failed on supplied sample(s)."];

  return { holds, failures, details };
};

const checkRightTriangle = <SrcObj, SrcArr, TgtObj, TgtArr>(
  right: FunctorWithWitness<TgtObj, TgtArr, SrcObj, SrcArr>,
  unit: NaturalTransformationWithWitness<SrcObj, SrcArr, SrcObj, SrcArr>,
  counit: NaturalTransformationWithWitness<TgtObj, TgtArr, TgtObj, TgtArr>,
  samples: ReadonlyArray<TgtObj>,
): AdjunctionTriangleReport<TgtObj, SrcArr> => {
  const category = right.witness.target;
  const failures: AdjunctionTriangleFailure<TgtObj, SrcArr>[] = [];

  for (const object of samples) {
    const epsilon = counit.transformation.component(object);
    const mappedEpsilon = right.functor.F1(epsilon);
    const UB = right.functor.F0(object);
    const eta = unit.transformation.component(UB);
    const composite = category.compose(mappedEpsilon, eta);
    const identity = category.id(UB);
    if (!composeAndCompare(category, identity, composite)) {
      failures.push({
        object,
        expected: identity,
        actual: composite,
        reason: "Uε_B ∘ η_{UB} did not reduce to the identity on U B",
      });
    }
  }

  const holds = failures.length === 0;
  const details = holds
    ? [`Right triangle verified on ${samples.length} sampled object(s).`]
    : ["Right triangle failed on supplied sample(s)."];

  return { holds, failures, details };
};

const checkLimitFactorization = <I, Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  equality: ((left: Arr, right: Arr) => boolean) | undefined,
  indices: ReadonlyArray<I>,
  limit: CategoryLimits.Cone<I, Obj, Arr>,
  candidate: CategoryLimits.Cone<I, Obj, Arr>,
  result: UniversalMediationResult<Arr>,
): { readonly ok: true; readonly mediator: Arr } | { readonly ok: false; readonly reason: string } => {
  if (!result.factored || !result.mediator) {
    return { ok: false, reason: result.reason ?? "Limit factorization did not provide a mediator." };
  }

  for (const index of indices) {
    const limitLeg = limit.legs(index);
    const candidateLeg = candidate.legs(index);
    const composite = category.compose(limitLeg, result.mediator);
    const matches = equality
      ? equality(candidateLeg, composite)
      : Object.is(candidateLeg, composite);
    if (!matches) {
      return {
        ok: false,
        reason: `Limit leg ${String(index)} failed to commute with the factored mediator.`,
      };
    }
  }

  return { ok: true, mediator: result.mediator };
};

const checkColimitFactorization = <I, Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  equality: ((left: Arr, right: Arr) => boolean) | undefined,
  indices: ReadonlyArray<I>,
  colimit: CategoryLimits.Cocone<I, Obj, Arr>,
  candidate: CategoryLimits.Cocone<I, Obj, Arr>,
  result: UniversalMediationResult<Arr>,
): { readonly ok: true; readonly mediator: Arr } | { readonly ok: false; readonly reason: string } => {
  if (!result.factored || !result.mediator) {
    return { ok: false, reason: result.reason ?? "Colimit factorization did not provide a mediator." };
  }

  for (const index of indices) {
    const colimitLeg = colimit.legs(index);
    const candidateLeg = candidate.legs(index);
    const composite = category.compose(result.mediator, colimitLeg);
    const matches = equality
      ? equality(candidateLeg, composite)
      : Object.is(candidateLeg, composite);
    if (!matches) {
      return {
        ok: false,
        reason: `Colimit leg ${String(index)} failed to commute with the factored mediator.`,
      };
    }
  }

  return { ok: true, mediator: result.mediator };
};

const evaluateSourceLimit = <I, Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  sample: AdjunctionLimitPreservationSample<I, unknown, unknown, Obj, Arr>,
): CategoryPropertyCheck<unknown> => {
  const equality = arrowEquality(category);
  if (!sample.sourceCones || sample.sourceCones.length === 0) {
    return {
      holds: true,
      details: "No additional cones supplied; assuming advertised limit witness is valid.",
    };
  }

  for (const candidate of sample.sourceCones) {
    const result = sample.factor(candidate);
    const verdict = checkLimitFactorization(category, equality, sample.indices, sample.limit, candidate, result);
    if (!verdict.ok) {
      return { holds: false, details: verdict.reason };
    }
  }

  return {
    holds: true,
    details: `Verified limit factorization on ${sample.sourceCones.length} sampled cone(s).`,
  };
};

const evaluateSourceColimit = <I, Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  sample: AdjunctionColimitPreservationSample<I, Obj, Arr, unknown, unknown>,
): CategoryPropertyCheck<unknown> => {
  const equality = arrowEquality(category);
  if (!sample.sourceCocones || sample.sourceCocones.length === 0) {
    return {
      holds: true,
      details: "No additional cocones supplied; assuming advertised colimit witness is valid.",
    };
  }

  for (const candidate of sample.sourceCocones) {
    const result = sample.factor(candidate);
    const verdict = checkColimitFactorization(category, equality, sample.indices, sample.colimit, candidate, result);
    if (!verdict.ok) {
      return { holds: false, details: verdict.reason };
    }
  }

  return {
    holds: true,
    details: `Verified colimit factorization on ${sample.sourceCocones.length} sampled cocone(s).`,
  };
};

const evaluateRightAdjointLimitPreservation = <
  I,
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  left: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  right: FunctorWithWitness<TgtObj, TgtArr, SrcObj, SrcArr>,
  unit: NaturalTransformationWithWitness<SrcObj, SrcArr, SrcObj, SrcArr>,
  counit: NaturalTransformationWithWitness<TgtObj, TgtArr, TgtObj, TgtArr>,
  sample: AdjunctionLimitPreservationSample<I, SrcObj, SrcArr, TgtObj, TgtArr>,
): CategoryPropertyCheck<RightAdjointLimitWitness<I, SrcObj, SrcArr, TgtArr>> => {
  const categoryC = right.witness.target;
  const categoryD = left.witness.target;
  const equalityC = arrowEquality(categoryC);
  const equalityD = arrowEquality(categoryD);

  if (sample.cones.length === 0) {
    return {
      holds: false,
      details: "No cones supplied for right adjoint preservation analysis.",
    };
  }

  const mediators: Array<{
    readonly coneTip: SrcObj;
    readonly mediator: SrcArr;
    readonly adjunct: TgtArr;
  }> = [];
  const notes: string[] = [];

  for (const cone of sample.cones) {
    const adjointLegs = new Map<I, TgtArr>();
    for (const index of sample.indices) {
      const diagramObject = readDiagramObject(sample.diagram, index);
      if (!diagramObject.ok) {
        return { holds: false, details: diagramObject.reason };
      }
      const mappedLeg = left.functor.F1(cone.legs(index));
      const counitAtObject = counit.transformation.component(diagramObject.object);
      const adjointLeg = categoryD.compose(counitAtObject, mappedLeg);
      adjointLegs.set(index, adjointLeg);
    }

    const adjointCone: CategoryLimits.Cone<I, TgtObj, TgtArr> = {
      tip: left.functor.F0(cone.tip),
      legs: (index) => {
        const leg = adjointLegs.get(index);
        if (!leg) {
          throw new Error("Adjunction limit preservation: missing adjoint leg during evaluation.");
        }
        return leg;
      },
      diagram: sample.diagram,
    };

    const factorResult = sample.factor(adjointCone);
    const verdict = checkLimitFactorization(
      categoryD,
      equalityD,
      sample.indices,
      sample.limit,
      adjointCone,
      factorResult,
    );
    if (!verdict.ok) {
      return { holds: false, details: verdict.reason };
    }

    const adjunctMediator = verdict.mediator;
    const mappedMediator = right.functor.F1(adjunctMediator);
    const unitAtTip = unit.transformation.component(cone.tip);
    const mediator = categoryC.compose(mappedMediator, unitAtTip);

    for (const index of sample.indices) {
      const preservedLeg = right.functor.F1(sample.limit.legs(index));
      const composite = categoryC.compose(preservedLeg, mediator);
      const expected = cone.legs(index);
      const matches = equalityC
        ? equalityC(expected, composite)
        : Object.is(expected, composite);
      if (!matches) {
        return {
          holds: false,
          details: `Cone ${String(cone.tip)} failed to factor through the preserved limit on index ${String(index)}.`,
        };
      }
    }

    mediators.push({ coneTip: cone.tip, mediator, adjunct: adjunctMediator });
  }

  notes.push(`Verified ${mediators.length} cone${mediators.length === 1 ? "" : "s"} via adjunction.`);
  if (sample.label) {
    notes.push(`Sample label: ${sample.label}.`);
  }
  if (sample.details) {
    notes.push(...sample.details);
  }

  return {
    holds: true,
    witness: {
      checkedCones: mediators.length,
      indices: sample.indices,
      mediators,
      notes,
    },
    details: notes.join(" "),
  };
};

const evaluateLeftAdjointColimitPreservation = <
  I,
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  left: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  right: FunctorWithWitness<TgtObj, TgtArr, SrcObj, SrcArr>,
  unit: NaturalTransformationWithWitness<SrcObj, SrcArr, SrcObj, SrcArr>,
  counit: NaturalTransformationWithWitness<TgtObj, TgtArr, TgtObj, TgtArr>,
  sample: AdjunctionColimitPreservationSample<I, SrcObj, SrcArr, TgtObj, TgtArr>,
): CategoryPropertyCheck<LeftAdjointColimitWitness<I, SrcArr, TgtObj, TgtArr>> => {
  const categoryC = right.witness.target;
  const categoryD = left.witness.target;
  const equalityC = arrowEquality(categoryC);
  const equalityD = arrowEquality(categoryD);

  if (sample.cocones.length === 0) {
    return {
      holds: false,
      details: "No cocones supplied for left adjoint preservation analysis.",
    };
  }

  const mediators: Array<{
    readonly coconeTip: TgtObj;
    readonly mediator: TgtArr;
    readonly adjunct: SrcArr;
  }> = [];
  const notes: string[] = [];

  for (const cocone of sample.cocones) {
    const adjointLegs = new Map<I, SrcArr>();
    for (const index of sample.indices) {
      const diagramObject = readCoconeDiagramObject(sample.diagram, index);
      if (!diagramObject.ok) {
        return { holds: false, details: diagramObject.reason };
      }
      const mappedLeg = right.functor.F1(cocone.legs(index));
      const unitAtObject = unit.transformation.component(diagramObject.object);
      const adjointLeg = categoryC.compose(mappedLeg, unitAtObject);
      adjointLegs.set(index, adjointLeg);
    }

    const adjointCocone: CategoryLimits.Cocone<I, SrcObj, SrcArr> = {
      coTip: right.functor.F0(cocone.coTip),
      legs: (index) => {
        const leg = adjointLegs.get(index);
        if (!leg) {
          throw new Error("Adjunction colimit preservation: missing adjoint leg during evaluation.");
        }
        return leg;
      },
      diagram: sample.diagram,
    };

    const factorResult = sample.factor(adjointCocone);
    const verdict = checkColimitFactorization(
      categoryC,
      equalityC,
      sample.indices,
      sample.colimit,
      adjointCocone,
      factorResult,
    );
    if (!verdict.ok) {
      return { holds: false, details: verdict.reason };
    }

    const adjunctMediator = verdict.mediator;
    const mappedMediator = left.functor.F1(adjunctMediator);
    const counitAtTip = counit.transformation.component(cocone.coTip);
    const mediator = categoryD.compose(counitAtTip, mappedMediator);

    for (const index of sample.indices) {
      const liftedLeg = left.functor.F1(sample.colimit.legs(index));
      const composite = categoryD.compose(mediator, liftedLeg);
      const expected = cocone.legs(index);
      const matches = equalityD
        ? equalityD(expected, composite)
        : Object.is(expected, composite);
      if (!matches) {
        return {
          holds: false,
          details: `Cocone ${String(cocone.coTip)} failed to factor through the preserved colimit on index ${String(index)}.`,
        };
      }
    }

    mediators.push({ coconeTip: cocone.coTip, mediator, adjunct: adjunctMediator });
  }

  notes.push(`Verified ${mediators.length} cocone${mediators.length === 1 ? "" : "s"} via adjunction.`);
  if (sample.label) {
    notes.push(`Sample label: ${sample.label}.`);
  }
  if (sample.details) {
    notes.push(...sample.details);
  }

  return {
    holds: true,
    witness: {
      checkedCocones: mediators.length,
      indices: sample.indices,
      mediators,
      notes,
    },
    details: notes.join(" "),
  };
};

export const constructAdjunctionWithWitness = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  left: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  right: FunctorWithWitness<TgtObj, TgtArr, SrcObj, SrcArr>,
  unit: NaturalTransformationWithWitness<SrcObj, SrcArr, SrcObj, SrcArr>,
  counit: NaturalTransformationWithWitness<TgtObj, TgtArr, TgtObj, TgtArr>,
  options: AdjunctionConstructionOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
): AdjunctionWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const sourceObjects = collectSourceObjects(left, unit, options.samples);
  const targetObjects = collectTargetObjects(right, counit, options.samples);

  const leftTriangle = checkLeftTriangle(left, unit, counit, sourceObjects);
  const rightTriangle = checkRightTriangle(right, unit, counit, targetObjects);

  const holds = leftTriangle.holds && rightTriangle.holds;
  const details: string[] = [];
  if (options.metadata) {
    details.push(...options.metadata);
  }
  if (holds) {
    details.push(
      `Adjunction triangles verified on ${sourceObjects.length} source and ${targetObjects.length} target sample(s).`,
    );
  } else {
    if (!leftTriangle.holds) {
      details.push(leftTriangle.details[0]!);
    }
    if (!rightTriangle.holds) {
      details.push(rightTriangle.details[0]!);
    }
  }

  const report: AdjunctionReport<SrcObj, SrcArr, TgtObj, TgtArr> = {
    leftTriangle,
    rightTriangle,
    holds,
    details,
  };
  const limitSamples = options.limitPreservation?.samples ?? [];
  const limitOracles: Array<
    AnyFunctorPropertyOracle<TgtObj, TgtArr, SrcObj, SrcArr>
  > = [];
  const trackedLimitSamples: AdjunctionLimitPreservationSample<unknown, SrcObj, SrcArr, TgtObj, TgtArr>[] = [];

  limitSamples.forEach((sample, index) => {
    const label = sample.label ?? `limit-sample-${index + 1}`;
    const objectSample: ObjectPropertySample<TgtObj> = {
      kind: "object",
      object: sample.limit.tip,
      label,
    };
    const detailLines = [
      "Adjunction-derived limit preservation via right adjoint.",
      `Indices checked: ${sample.indices.length}.`,
      ...(sample.details ?? []),
    ];
    const oracle = makeObjectPropertyOracle<
      TgtObj,
      TgtArr,
      SrcObj,
      SrcArr,
      unknown,
      RightAdjointLimitWitness<unknown, SrcObj, SrcArr, TgtArr>
    >({
      property: `limit-preservation(${label})`,
      mode: "preserves",
      sourceEvaluate: (category) => evaluateSourceLimit(category, sample),
      targetEvaluate: () =>
        evaluateRightAdjointLimitPreservation(left, right, unit, counit, sample),
      samples: [objectSample],
      details: detailLines,
    });
    limitOracles.push(oracle as AnyFunctorPropertyOracle<TgtObj, TgtArr, SrcObj, SrcArr>);
    trackedLimitSamples.push(sample);
  });

  const colimitSamples = options.colimitPreservation?.samples ?? [];
  const colimitOracles: Array<
    AnyFunctorPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr>
  > = [];
  const trackedColimitSamples: AdjunctionColimitPreservationSample<
    unknown,
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr
  >[] = [];

  colimitSamples.forEach((sample, index) => {
    const label = sample.label ?? `colimit-sample-${index + 1}`;
    const objectSample: ObjectPropertySample<SrcObj> = {
      kind: "object",
      object: sample.colimit.coTip,
      label,
    };
    const detailLines = [
      "Adjunction-derived colimit preservation via left adjoint.",
      `Indices checked: ${sample.indices.length}.`,
      ...(sample.details ?? []),
    ];
    const oracle = makeObjectPropertyOracle<
      SrcObj,
      SrcArr,
      TgtObj,
      TgtArr,
      unknown,
      LeftAdjointColimitWitness<unknown, SrcArr, TgtObj, TgtArr>
    >({
      property: `colimit-preservation(${label})`,
      mode: "preserves",
      sourceEvaluate: (category) => evaluateSourceColimit(category, sample),
      targetEvaluate: () =>
        evaluateLeftAdjointColimitPreservation(left, right, unit, counit, sample),
      samples: [objectSample],
      details: detailLines,
    });
    colimitOracles.push(oracle as AnyFunctorPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr>);
    trackedColimitSamples.push(sample);
  });

  const limitAnalyses =
    limitOracles.length > 0
      ? evaluateFunctorProperties(right, limitOracles)
      : [];
  const colimitAnalyses =
    colimitOracles.length > 0
      ? evaluateFunctorProperties(left, colimitOracles)
      : [];

  const enrichedRight =
    limitAnalyses.length > 0
      ? {
          ...right,
          properties: [...(right.properties ?? []), ...limitAnalyses],
        }
      : right;
  const enrichedLeft =
    colimitAnalyses.length > 0
      ? {
          ...left,
          properties: [...(left.properties ?? []), ...colimitAnalyses],
        }
      : left;

  let preservation: AdjunctionPreservationMetadata<SrcObj, SrcArr, TgtObj, TgtArr> | undefined;
  if (limitAnalyses.length > 0) {
    preservation = {
      rightPreservesLimits: limitAnalyses.map((analysis, idx) => ({
        sample: trackedLimitSamples[idx]!,
        analysis,
      })),
    };
  }
  if (colimitAnalyses.length > 0) {
    preservation = {
      ...(preservation ?? {}),
      leftPreservesColimits: colimitAnalyses.map((analysis, idx) => ({
        sample: trackedColimitSamples[idx]!,
        analysis,
      })),
    };
  }

  const base: AdjunctionWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> = preservation
    ? { left: enrichedLeft, right: enrichedRight, unit, counit, report, preservation }
    : { left: enrichedLeft, right: enrichedRight, unit, counit, report };

  return options.metadata ? { ...base, metadata: options.metadata } : base;
};

export type { AdjunctionReport as AdjunctionReportType };

