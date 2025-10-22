import type { SimpleCat } from "./simple-cat";
import type { FunctorWithWitness } from "./functor";
import type { NaturalTransformationWithWitness } from "./natural-transformation";

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
}

interface AdjunctionConstructionOptions<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly samples?: AdjunctionCheckSamples<SrcObj, TgtObj>;
  readonly metadata?: ReadonlyArray<string>;
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

  return options.metadata
    ? { left, right, unit, counit, report, metadata: options.metadata }
    : { left, right, unit, counit, report };
};

export type { AdjunctionReport as AdjunctionReportType };

