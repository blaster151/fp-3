import type { SimpleCat } from "./simple-cat";
import {
  composeFunctors,
  identityFunctorWithWitness,
  type FunctorWithWitness,
} from "./functor";
import {
  constructNaturalTransformationWithWitness,
  type NaturalTransformationCheckSamples,
  type NaturalTransformationWithWitness,
} from "./natural-transformation";
import {
  constructAdjunctionWithWitness,
  type AdjunctionCheckSamples,
  type AdjunctionWithWitness,
} from "./adjunction";

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

const mergeSamples = <Item>(
  ...collections: ReadonlyArray<ReadonlyArray<Item> | undefined>
): ReadonlyArray<Item> => {
  const set = new Set<Item>();
  for (const collection of collections) {
    if (!collection) continue;
    for (const item of collection) {
      set.add(item);
    }
  }
  return Array.from(set);
};

export interface ReflectiveUnitComponentFailure<AmbientObj, AmbientArr> {
  readonly object: AmbientObj;
  readonly component: AmbientArr;
  readonly expectedSource: AmbientObj;
  readonly actualSource: AmbientObj;
  readonly expectedTarget: AmbientObj;
  readonly actualTarget: AmbientObj;
  readonly reason: string;
}

export interface ReflectiveUnitComponentReport<AmbientObj, AmbientArr> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<ReflectiveUnitComponentFailure<AmbientObj, AmbientArr>>;
  readonly details: ReadonlyArray<string>;
  readonly checkedObjects: number;
}

export interface ReflectiveCounitComponentFailure<SubObj, SubArr> {
  readonly object: SubObj;
  readonly component: SubArr;
  readonly expectedSource: SubObj;
  readonly actualSource: SubObj;
  readonly expectedTarget: SubObj;
  readonly actualTarget: SubObj;
  readonly reason: string;
}

export interface ReflectiveCounitImageFailure<AmbientArr, AmbientObj> {
  readonly object: AmbientObj;
  readonly expected: AmbientArr;
  readonly actual: AmbientArr;
  readonly reason: string;
  readonly equalityConsidered: boolean;
}

export interface ReflectiveCounitComponentReport<
  AmbientObj,
  AmbientArr,
  SubObj,
  SubArr,
> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<ReflectiveCounitComponentFailure<SubObj, SubArr>>;
  readonly imageFailures: ReadonlyArray<ReflectiveCounitImageFailure<AmbientArr, SubObj>>;
  readonly details: ReadonlyArray<string>;
  readonly checkedObjects: number;
}

export interface ReflectiveSubcategoryReport<
  AmbientObj,
  AmbientArr,
  SubObj,
  SubArr,
> {
  readonly adjunction: AdjunctionWithWitness<AmbientObj, AmbientArr, SubObj, SubArr>["report"];
  readonly unitComponents: ReflectiveUnitComponentReport<AmbientObj, AmbientArr>;
  readonly counitComponents: ReflectiveCounitComponentReport<AmbientObj, AmbientArr, SubObj, SubArr>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface ReflectiveSubcategoryWitness<
  AmbientObj,
  AmbientArr,
  SubObj,
  SubArr,
> {
  readonly inclusion: FunctorWithWitness<SubObj, SubArr, AmbientObj, AmbientArr>;
  readonly reflector: FunctorWithWitness<AmbientObj, AmbientArr, SubObj, SubArr>;
  readonly unit: NaturalTransformationWithWitness<AmbientObj, AmbientArr, AmbientObj, AmbientArr>;
  readonly counit: NaturalTransformationWithWitness<SubObj, SubArr, SubObj, SubArr>;
  readonly adjunction: AdjunctionWithWitness<AmbientObj, AmbientArr, SubObj, SubArr>;
  readonly report: ReflectiveSubcategoryReport<AmbientObj, AmbientArr, SubObj, SubArr>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface ReflectiveSubcategoryConstructionOptions<
  AmbientObj,
  AmbientArr,
  SubObj,
  SubArr,
> {
  readonly unitSamples?: NaturalTransformationCheckSamples<AmbientObj, AmbientArr>;
  readonly counitSamples?: NaturalTransformationCheckSamples<SubObj, SubArr>;
  readonly adjunctionSamples?: AdjunctionCheckSamples<AmbientObj, SubObj>;
  readonly metadata?: ReadonlyArray<string>;
}

const analyzeReflectiveUnit = <AmbientObj, AmbientArr, SubObj, SubArr>(
  inclusion: FunctorWithWitness<SubObj, SubArr, AmbientObj, AmbientArr>,
  reflector: FunctorWithWitness<AmbientObj, AmbientArr, SubObj, SubArr>,
  unit: NaturalTransformationWithWitness<AmbientObj, AmbientArr, AmbientObj, AmbientArr>,
): ReflectiveUnitComponentReport<AmbientObj, AmbientArr> => {
  const ambient = inclusion.witness.target;
  const failures: ReflectiveUnitComponentFailure<AmbientObj, AmbientArr>[] = [];

  for (const object of unit.witness.objectSamples) {
    const component = unit.transformation.component(object);
    const actualSource = ambient.src(component);
    const actualTarget = ambient.dst(component);
    const expectedSource = object;
    const expectedTarget = inclusion.functor.F0(reflector.functor.F0(object));

    if (!Object.is(actualSource, expectedSource)) {
      failures.push({
        object,
        component,
        expectedSource,
        actualSource,
        expectedTarget,
        actualTarget,
        reason: "Reflective unit must start at the ambient object.",
      });
      continue;
    }

    if (!Object.is(actualTarget, expectedTarget)) {
      failures.push({
        object,
        component,
        expectedSource,
        actualSource,
        expectedTarget,
        actualTarget,
        reason: "Reflective unit must land in the inclusion of the reflector image.",
      });
    }
  }

  const holds = failures.length === 0;
  const details = holds
    ? [`Reflective unit components aligned with J ∘ L on ${unit.witness.objectSamples.length} object(s).`]
    : [
        "Reflective unit components failed to align with the inclusion of the reflector image on supplied sample(s).",
      ];

  return {
    holds,
    failures,
    details,
    checkedObjects: unit.witness.objectSamples.length,
  };
};

const analyzeReflectiveCounit = <AmbientObj, AmbientArr, SubObj, SubArr>(
  inclusion: FunctorWithWitness<SubObj, SubArr, AmbientObj, AmbientArr>,
  reflector: FunctorWithWitness<AmbientObj, AmbientArr, SubObj, SubArr>,
  counit: NaturalTransformationWithWitness<SubObj, SubArr, SubObj, SubArr>,
): ReflectiveCounitComponentReport<AmbientObj, AmbientArr, SubObj, SubArr> => {
  const subcategory = inclusion.witness.source;
  const ambient = inclusion.witness.target;
  const equality = arrowEquality(ambient);

  const failures: ReflectiveCounitComponentFailure<SubObj, SubArr>[] = [];
  const imageFailures: ReflectiveCounitImageFailure<AmbientArr, SubObj>[] = [];

  for (const object of counit.witness.objectSamples) {
    const component = counit.transformation.component(object);
    const actualSource = subcategory.src(component);
    const actualTarget = subcategory.dst(component);
    const expectedSource = reflector.functor.F0(inclusion.functor.F0(object));
    const expectedTarget = object;

    if (!Object.is(actualSource, expectedSource) || !Object.is(actualTarget, expectedTarget)) {
      failures.push({
        object,
        component,
        expectedSource,
        actualSource,
        expectedTarget,
        actualTarget,
        reason: "Reflective counit must retract the reflector of the inclusion back to the subcategory object.",
      });
    }

    const mapped = inclusion.functor.F1(component);
    const expectedMappedSource = inclusion.functor.F0(expectedSource);
    const expectedMappedTarget = inclusion.functor.F0(expectedTarget);
    const actualMappedSource = ambient.src(mapped);
    const actualMappedTarget = ambient.dst(mapped);

    if (!Object.is(actualMappedSource, expectedMappedSource) || !Object.is(actualMappedTarget, expectedMappedTarget)) {
      failures.push({
        object,
        component,
        expectedSource,
        actualSource,
        expectedTarget,
        actualTarget,
        reason: "Inclusion of the counit component must respect the ambient endpoints.",
      });
    } else if (equality) {
      const identity = ambient.id(expectedMappedTarget);
      if (!equality(mapped, identity)) {
        imageFailures.push({
          object,
          expected: identity,
          actual: mapped,
          reason: "Inclusion of the reflective counit should collapse to the ambient identity by fullness.",
          equalityConsidered: true,
        });
      }
    }
  }

  const holds = failures.length === 0 && imageFailures.length === 0;
  const details = holds
    ? [`Reflective counit components respected the inclusion on ${counit.witness.objectSamples.length} object(s).`]
    : ["Reflective counit components failed ambient compatibility checks on supplied sample(s)."];

  return {
    holds,
    failures,
    imageFailures,
    details,
    checkedObjects: counit.witness.objectSamples.length,
  };
};

export const buildReflectiveSubcategoryWitness = <
  AmbientObj,
  AmbientArr,
  SubObj,
  SubArr,
>(
  inclusion: FunctorWithWitness<SubObj, SubArr, AmbientObj, AmbientArr>,
  reflector: FunctorWithWitness<AmbientObj, AmbientArr, SubObj, SubArr>,
  unitComponent: (object: AmbientObj) => AmbientArr,
  counitComponent: (object: SubObj) => SubArr,
  options: ReflectiveSubcategoryConstructionOptions<AmbientObj, AmbientArr, SubObj, SubArr> = {},
): ReflectiveSubcategoryWitness<AmbientObj, AmbientArr, SubObj, SubArr> => {
  const ambientObjects = mergeSamples(
    reflector.witness.objectGenerators,
    inclusion.witness.objectGenerators.map((object) => inclusion.functor.F0(object)),
    options.unitSamples?.objects,
    options.adjunctionSamples?.sourceObjects,
  );
  const subcategoryObjects = mergeSamples(
    inclusion.witness.objectGenerators,
    reflector.witness.objectGenerators.map((object) => reflector.functor.F0(object)),
    options.counitSamples?.objects,
    options.adjunctionSamples?.targetObjects,
  );

  const identityAmbient = identityFunctorWithWitness(inclusion.witness.target, {
    objects: ambientObjects,
  });
  const identitySubcategory = identityFunctorWithWitness(inclusion.witness.source, {
    objects: subcategoryObjects,
  });

  const inclusionAfterReflector = composeFunctors(inclusion, reflector, {
    metadata: ["Inclusion after reflector composite for reflective unit target."],
  });
  const reflectorAfterInclusion = composeFunctors(reflector, inclusion, {
    metadata: ["Reflector after inclusion composite for reflective counit source."],
  });

  const unit = constructNaturalTransformationWithWitness(
    identityAmbient,
    inclusionAfterReflector,
    unitComponent,
    {
      samples: options.unitSamples ?? { objects: ambientObjects },
      metadata: [
        ...(options.metadata ?? []),
        "Reflective unit η: Id_C ⇒ J ∘ L from Section 27.5.",
      ],
    },
  );

  const counit = constructNaturalTransformationWithWitness(
    reflectorAfterInclusion,
    identitySubcategory,
    counitComponent,
    {
      samples: options.counitSamples ?? { objects: subcategoryObjects },
      metadata: [
        ...(options.metadata ?? []),
        "Reflective counit ε: L ∘ J ⇒ Id_A collapsing inclusions back to the subcategory.",
      ],
    },
  );

    const adjunctionOptions = {
      metadata: [
        ...(options.metadata ?? []),
        "Reflective subcategory adjunction L ⊣ J verified against supplied samples.",
      ],
      ...(options.adjunctionSamples
        ? { samples: options.adjunctionSamples }
        : {}),
    };

    const adjunction = constructAdjunctionWithWitness(
      reflector,
      inclusion,
      unit,
      counit,
      adjunctionOptions,
    );

  const unitReport = analyzeReflectiveUnit(inclusion, reflector, unit);
  const counitReport = analyzeReflectiveCounit(inclusion, reflector, counit);

  const holds = adjunction.report.holds && unitReport.holds && counitReport.holds;
  const details = [
    ...(options.metadata ?? []),
    ...adjunction.report.details,
    ...unitReport.details,
    ...counitReport.details,
  ];

  const report: ReflectiveSubcategoryReport<AmbientObj, AmbientArr, SubObj, SubArr> = {
    adjunction: adjunction.report,
    unitComponents: unitReport,
    counitComponents: counitReport,
    holds,
    details,
  };

  return options.metadata?.length
    ? { inclusion, reflector, unit, counit, adjunction, report, metadata: options.metadata }
    : { inclusion, reflector, unit, counit, adjunction, report };
};

export interface CoreflectiveUnitComponentFailure<SubObj, SubArr> {
  readonly object: SubObj;
  readonly component: SubArr;
  readonly expectedSource: SubObj;
  readonly actualSource: SubObj;
  readonly expectedTarget: SubObj;
  readonly actualTarget: SubObj;
  readonly reason: string;
}

export interface CoreflectiveUnitComponentReport<SubObj, SubArr> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<CoreflectiveUnitComponentFailure<SubObj, SubArr>>;
  readonly details: ReadonlyArray<string>;
  readonly checkedObjects: number;
}

export interface CoreflectiveCounitComponentFailure<AmbientObj, AmbientArr> {
  readonly object: AmbientObj;
  readonly component: AmbientArr;
  readonly expectedSource: AmbientObj;
  readonly actualSource: AmbientObj;
  readonly expectedTarget: AmbientObj;
  readonly actualTarget: AmbientObj;
  readonly reason: string;
}

export interface CoreflectiveCounitImageFailure<SubArr, SubObj, AmbientObj> {
  readonly object: AmbientObj;
  readonly expected: SubArr;
  readonly actual: SubArr;
  readonly reason: string;
  readonly equalityConsidered: boolean;
}

export interface CoreflectiveCounitComponentReport<
  AmbientObj,
  AmbientArr,
  SubObj,
  SubArr,
> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<CoreflectiveCounitComponentFailure<AmbientObj, AmbientArr>>;
  readonly imageFailures: ReadonlyArray<CoreflectiveCounitImageFailure<SubArr, SubObj, AmbientObj>>;
  readonly details: ReadonlyArray<string>;
  readonly checkedObjects: number;
}

export interface CoreflectiveSubcategoryReport<
  AmbientObj,
  AmbientArr,
  SubObj,
  SubArr,
> {
  readonly adjunction: AdjunctionWithWitness<SubObj, SubArr, AmbientObj, AmbientArr>["report"];
  readonly unitComponents: CoreflectiveUnitComponentReport<SubObj, SubArr>;
  readonly counitComponents: CoreflectiveCounitComponentReport<AmbientObj, AmbientArr, SubObj, SubArr>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface CoreflectiveSubcategoryWitness<
  AmbientObj,
  AmbientArr,
  SubObj,
  SubArr,
> {
  readonly inclusion: FunctorWithWitness<SubObj, SubArr, AmbientObj, AmbientArr>;
  readonly coreflector: FunctorWithWitness<AmbientObj, AmbientArr, SubObj, SubArr>;
  readonly unit: NaturalTransformationWithWitness<SubObj, SubArr, SubObj, SubArr>;
  readonly counit: NaturalTransformationWithWitness<AmbientObj, AmbientArr, AmbientObj, AmbientArr>;
  readonly adjunction: AdjunctionWithWitness<SubObj, SubArr, AmbientObj, AmbientArr>;
  readonly report: CoreflectiveSubcategoryReport<AmbientObj, AmbientArr, SubObj, SubArr>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface CoreflectiveSubcategoryConstructionOptions<
  AmbientObj,
  AmbientArr,
  SubObj,
  SubArr,
> {
  readonly unitSamples?: NaturalTransformationCheckSamples<SubObj, SubArr>;
  readonly counitSamples?: NaturalTransformationCheckSamples<AmbientObj, AmbientArr>;
  readonly adjunctionSamples?: AdjunctionCheckSamples<SubObj, AmbientObj>;
  readonly metadata?: ReadonlyArray<string>;
}

const analyzeCoreflectiveUnit = <AmbientObj, AmbientArr, SubObj, SubArr>(
  inclusion: FunctorWithWitness<SubObj, SubArr, AmbientObj, AmbientArr>,
  coreflector: FunctorWithWitness<AmbientObj, AmbientArr, SubObj, SubArr>,
  unit: NaturalTransformationWithWitness<SubObj, SubArr, SubObj, SubArr>,
): CoreflectiveUnitComponentReport<SubObj, SubArr> => {
  const subcategory = inclusion.witness.source;
  const failures: CoreflectiveUnitComponentFailure<SubObj, SubArr>[] = [];

  for (const object of unit.witness.objectSamples) {
    const component = unit.transformation.component(object);
    const actualSource = subcategory.src(component);
    const actualTarget = subcategory.dst(component);
    const expectedSource = object;
    const expectedTarget = coreflector.functor.F0(inclusion.functor.F0(object));

    if (!Object.is(actualSource, expectedSource)) {
      failures.push({
        object,
        component,
        expectedSource,
        actualSource,
        expectedTarget,
        actualTarget,
        reason: "Coreflective unit must start at the subcategory object.",
      });
      continue;
    }

    if (!Object.is(actualTarget, expectedTarget)) {
      failures.push({
        object,
        component,
        expectedSource,
        actualSource,
        expectedTarget,
        actualTarget,
        reason: "Coreflective unit must land in the coreflector of the inclusion.",
      });
    }
  }

  const holds = failures.length === 0;
  const details = holds
    ? [`Coreflective unit components aligned with R ∘ J on ${unit.witness.objectSamples.length} object(s).`]
    : ["Coreflective unit components failed to align with the coreflector image on supplied sample(s)."];

  return {
    holds,
    failures,
    details,
    checkedObjects: unit.witness.objectSamples.length,
  };
};

const analyzeCoreflectiveCounit = <AmbientObj, AmbientArr, SubObj, SubArr>(
  inclusion: FunctorWithWitness<SubObj, SubArr, AmbientObj, AmbientArr>,
  coreflector: FunctorWithWitness<AmbientObj, AmbientArr, SubObj, SubArr>,
  counit: NaturalTransformationWithWitness<AmbientObj, AmbientArr, AmbientObj, AmbientArr>,
): CoreflectiveCounitComponentReport<AmbientObj, AmbientArr, SubObj, SubArr> => {
  const ambient = inclusion.witness.target;
  const subcategory = inclusion.witness.source;
  const equality = arrowEquality(subcategory);

  const failures: CoreflectiveCounitComponentFailure<AmbientObj, AmbientArr>[] = [];
  const imageFailures: CoreflectiveCounitImageFailure<SubArr, SubObj, AmbientObj>[] = [];

  for (const object of counit.witness.objectSamples) {
    const component = counit.transformation.component(object);
    const actualSource = ambient.src(component);
    const actualTarget = ambient.dst(component);
    const expectedSource = inclusion.functor.F0(coreflector.functor.F0(object));
    const expectedTarget = object;

    if (!Object.is(actualSource, expectedSource) || !Object.is(actualTarget, expectedTarget)) {
      failures.push({
        object,
        component,
        expectedSource,
        actualSource,
        expectedTarget,
        actualTarget,
        reason: "Coreflective counit must collapse the inclusion of the coreflector back to the ambient object.",
      });
    }

    const mapped = coreflector.functor.F1(component);
    const expectedMappedSource = coreflector.functor.F0(actualSource);
    const expectedMappedTarget = coreflector.functor.F0(actualTarget);
    const actualMappedSource = subcategory.src(mapped);
    const actualMappedTarget = subcategory.dst(mapped);

    if (!Object.is(actualMappedSource, expectedMappedSource) || !Object.is(actualMappedTarget, expectedMappedTarget)) {
      failures.push({
        object,
        component,
        expectedSource,
        actualSource,
        expectedTarget,
        actualTarget,
        reason: "Coreflector image of the counit must respect subcategory endpoints.",
      });
    } else if (equality) {
      const identity = subcategory.id(expectedMappedTarget);
      if (!equality(mapped, identity)) {
        imageFailures.push({
          object,
          expected: identity,
          actual: mapped,
          reason: "Coreflector image of the counit should reduce to the subcategory identity by fullness.",
          equalityConsidered: true,
        });
      }
    }
  }

  const holds = failures.length === 0 && imageFailures.length === 0;
  const details = holds
    ? [`Coreflective counit components respected the ambient collapse on ${counit.witness.objectSamples.length} object(s).`]
    : ["Coreflective counit components failed compatibility checks on supplied sample(s)."];

  return {
    holds,
    failures,
    imageFailures,
    details,
    checkedObjects: counit.witness.objectSamples.length,
  };
};

export const buildCoreflectiveSubcategoryWitness = <
  AmbientObj,
  AmbientArr,
  SubObj,
  SubArr,
>(
  inclusion: FunctorWithWitness<SubObj, SubArr, AmbientObj, AmbientArr>,
  coreflector: FunctorWithWitness<AmbientObj, AmbientArr, SubObj, SubArr>,
  unitComponent: (object: SubObj) => SubArr,
  counitComponent: (object: AmbientObj) => AmbientArr,
  options: CoreflectiveSubcategoryConstructionOptions<AmbientObj, AmbientArr, SubObj, SubArr> = {},
): CoreflectiveSubcategoryWitness<AmbientObj, AmbientArr, SubObj, SubArr> => {
  const ambientObjects = mergeSamples(
    inclusion.witness.objectGenerators.map((object) => inclusion.functor.F0(object)),
    coreflector.witness.objectGenerators,
    options.counitSamples?.objects,
    options.adjunctionSamples?.targetObjects,
  );
  const subcategoryObjects = mergeSamples(
    inclusion.witness.objectGenerators,
    coreflector.witness.objectGenerators.map((object) => coreflector.functor.F0(object)),
    options.unitSamples?.objects,
    options.adjunctionSamples?.sourceObjects,
  );

  const identityAmbient = identityFunctorWithWitness(inclusion.witness.target, {
    objects: ambientObjects,
  });
  const identitySubcategory = identityFunctorWithWitness(inclusion.witness.source, {
    objects: subcategoryObjects,
  });

  const inclusionAfterCoreflector = composeFunctors(inclusion, coreflector, {
    metadata: ["Inclusion after coreflector composite for coreflective counit source."],
  });
  const coreflectorAfterInclusion = composeFunctors(coreflector, inclusion, {
    metadata: ["Coreflector after inclusion composite for coreflective unit target."],
  });

  const unit = constructNaturalTransformationWithWitness(
    identitySubcategory,
    coreflectorAfterInclusion,
    unitComponent,
    {
      samples: options.unitSamples ?? { objects: subcategoryObjects },
      metadata: [
        ...(options.metadata ?? []),
        "Coreflective unit η: Id_A ⇒ R ∘ J witnessing the inclusion of the coreflector.",
      ],
    },
  );

  const counit = constructNaturalTransformationWithWitness(
    inclusionAfterCoreflector,
    identityAmbient,
    counitComponent,
    {
      samples: options.counitSamples ?? { objects: ambientObjects },
      metadata: [
        ...(options.metadata ?? []),
        "Coreflective counit ε: J ∘ R ⇒ Id_C collapsing objects back into the ambient category.",
      ],
    },
  );

    const adjunctionOptions = {
      metadata: [
        ...(options.metadata ?? []),
        "Coreflective subcategory adjunction J ⊣ R verified against supplied samples.",
      ],
      ...(options.adjunctionSamples
        ? { samples: options.adjunctionSamples }
        : {}),
    };

    const adjunction = constructAdjunctionWithWitness(
      inclusion,
      coreflector,
      unit,
      counit,
      adjunctionOptions,
    );

  const unitReport = analyzeCoreflectiveUnit(inclusion, coreflector, unit);
  const counitReport = analyzeCoreflectiveCounit(inclusion, coreflector, counit);

  const holds = adjunction.report.holds && unitReport.holds && counitReport.holds;
  const details = [
    ...(options.metadata ?? []),
    ...adjunction.report.details,
    ...unitReport.details,
    ...counitReport.details,
  ];

  const report: CoreflectiveSubcategoryReport<AmbientObj, AmbientArr, SubObj, SubArr> = {
    adjunction: adjunction.report,
    unitComponents: unitReport,
    counitComponents: counitReport,
    holds,
    details,
  };

  return options.metadata?.length
    ? { inclusion, coreflector, unit, counit, adjunction, report, metadata: options.metadata }
    : { inclusion, coreflector, unit, counit, adjunction, report };
};
