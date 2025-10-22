import type { SimpleCat } from "./simple-cat";
import type {
  Functor,
  FunctorCheckSamples,
  FunctorComposablePair,
  FunctorWithWitness,
} from "./functor";
import { composeFunctors, constructFunctorWithWitness } from "./functor";

export interface NaturalTransformation<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly source: Functor<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly target: Functor<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly component: (object: SrcObj) => TgtArr;
}

export interface NaturalTransformationCheckSamples<SrcObj, SrcArr> {
  readonly objects?: ReadonlyArray<SrcObj>;
  readonly arrows?: ReadonlyArray<SrcArr>;
}

export interface NaturalTransformationComponentFailure<SrcObj, TgtArr, TgtObj> {
  readonly object: SrcObj;
  readonly component: TgtArr;
  readonly expectedSource: TgtObj;
  readonly expectedTarget: TgtObj;
  readonly actualSource: TgtObj;
  readonly actualTarget: TgtObj;
  readonly reason: string;
}

export interface NaturalTransformationNaturalityFailure<SrcArr, TgtArr, TgtObj> {
  readonly arrow: SrcArr;
  readonly source: TgtObj;
  readonly target: TgtObj;
  readonly expected: TgtArr;
  readonly actual: TgtArr;
  readonly reason: string;
}

export interface NaturalTransformationLawReport<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly respectsComponents: boolean;
  readonly componentFailures: ReadonlyArray<
    NaturalTransformationComponentFailure<SrcObj, TgtArr, TgtObj>
  >;
  readonly satisfiesNaturality: boolean;
  readonly naturalityFailures: ReadonlyArray<
    NaturalTransformationNaturalityFailure<SrcArr, TgtArr, TgtObj>
  >;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface NaturalTransformationWitness<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly domain: SimpleCat<SrcObj, SrcArr>;
  readonly codomain: SimpleCat<TgtObj, TgtArr>;
  readonly source: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly target: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly transformation: NaturalTransformation<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly objectSamples: ReadonlyArray<SrcObj>;
  readonly arrowSamples: ReadonlyArray<SrcArr>;
  readonly equalMor?: (left: TgtArr, right: TgtArr) => boolean;
}

export interface NaturalTransformationWithWitness<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly transformation: NaturalTransformation<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly witness: NaturalTransformationWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly report: NaturalTransformationLawReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface NaturalTransformationConstructionOptions<SrcObj, SrcArr, TgtArr> {
  readonly samples?: NaturalTransformationCheckSamples<SrcObj, SrcArr>;
  readonly equalMor?: (left: TgtArr, right: TgtArr) => boolean;
  readonly metadata?: ReadonlyArray<string>;
}

type SimpleCatWithEquality<Obj, Arr> = SimpleCat<Obj, Arr> & {
  readonly eq?: (left: Arr, right: Arr) => boolean;
  readonly equalMor?: (left: Arr, right: Arr) => boolean;
};

const arrowEquality = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  supplied?: (left: Arr, right: Arr) => boolean,
): ((left: Arr, right: Arr) => boolean) | undefined => {
  if (supplied) {
    return supplied;
  }
  const candidate = category as SimpleCatWithEquality<Obj, Arr>;
  if (typeof candidate.eq === "function") {
    return candidate.eq.bind(candidate);
  }
  if (typeof candidate.equalMor === "function") {
    return candidate.equalMor.bind(candidate);
  }
  return undefined;
};

const normalizeSamples = <
  SrcObj,
  SrcArr,
  LeftObj,
  LeftArr,
  RightObj,
  RightArr,
>(
  domain: SimpleCat<SrcObj, SrcArr>,
  source: FunctorWithWitness<SrcObj, SrcArr, LeftObj, LeftArr>,
  target: FunctorWithWitness<SrcObj, SrcArr, RightObj, RightArr>,
  samples: NaturalTransformationCheckSamples<SrcObj, SrcArr> = {},
): {
  readonly objects: ReadonlyArray<SrcObj>;
  readonly arrows: ReadonlyArray<SrcArr>;
} => {
  const objectSet = new Set<SrcObj>();
  for (const object of samples.objects ?? []) {
    objectSet.add(object);
  }
  for (const object of source.witness.objectGenerators) {
    objectSet.add(object);
  }
  for (const object of target.witness.objectGenerators) {
    objectSet.add(object);
  }

  const arrowSet = new Set<SrcArr>();
  for (const arrow of samples.arrows ?? []) {
    arrowSet.add(arrow);
  }
  for (const arrow of source.witness.arrowGenerators) {
    arrowSet.add(arrow);
  }
  for (const arrow of target.witness.arrowGenerators) {
    arrowSet.add(arrow);
  }
  const collectPairs = (pairs: ReadonlyArray<FunctorComposablePair<SrcArr>>) => {
    for (const pair of pairs) {
      arrowSet.add(pair.f);
      arrowSet.add(pair.g);
    }
  };
  collectPairs(source.witness.composablePairs);
  collectPairs(target.witness.composablePairs);

  if (arrowSet.size === 0) {
    for (const object of objectSet) {
      arrowSet.add(domain.id(object));
    }
  }

  for (const arrow of Array.from(arrowSet)) {
    objectSet.add(domain.src(arrow));
    objectSet.add(domain.dst(arrow));
  }

  if (arrowSet.size === 0 && objectSet.size === 0) {
    const [firstSource] = source.witness.objectGenerators;
    if (firstSource !== undefined) {
      objectSet.add(firstSource);
      arrowSet.add(domain.id(firstSource));
    }
  }

  return {
    objects: Array.from(objectSet),
    arrows: Array.from(arrowSet),
  };
};

export const makeNaturalTransformationWitness = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  source: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  target: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  transformation: NaturalTransformation<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: NaturalTransformationConstructionOptions<SrcObj, SrcArr, TgtArr> = {},
): NaturalTransformationWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const domain = source.witness.source;
  const codomain = source.witness.target;
  const { objects, arrows } = normalizeSamples(domain, source, target, options.samples);
  const equalMor = arrowEquality(codomain, options.equalMor);
  return {
    domain,
    codomain,
    source,
    target,
    transformation,
    objectSamples: objects,
    arrowSamples: arrows,
    ...(equalMor ? { equalMor } : {}),
  };
};

export const isNaturalTransformation = <SrcObj, SrcArr, TgtObj, TgtArr>(
  witness: NaturalTransformationWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
): NaturalTransformationLawReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const {
    domain,
    codomain,
    source,
    target,
    transformation,
    objectSamples,
    arrowSamples,
    equalMor,
  } = witness;

  const componentFailures: NaturalTransformationComponentFailure<SrcObj, TgtArr, TgtObj>[] = [];
  for (const object of objectSamples) {
    const component = transformation.component(object);
    const expectedSource = source.functor.F0(object);
    const expectedTarget = target.functor.F0(object);
    const actualSource = codomain.src(component);
    const actualTarget = codomain.dst(component);
    const reasons: string[] = [];
    if (!Object.is(actualSource, expectedSource)) {
      reasons.push(
        `component has source ${String(actualSource)} but expected ${String(expectedSource)}`,
      );
    }
    if (!Object.is(actualTarget, expectedTarget)) {
      reasons.push(
        `component has target ${String(actualTarget)} but expected ${String(expectedTarget)}`,
      );
    }
    if (reasons.length > 0) {
      componentFailures.push({
        object,
        component,
        expectedSource,
        expectedTarget,
        actualSource,
        actualTarget,
        reason: reasons.join("; "),
      });
    }
  }

  const equality = arrowEquality(codomain, equalMor);
  const naturalityFailures: NaturalTransformationNaturalityFailure<SrcArr, TgtArr, TgtObj>[] = [];
  for (const arrow of arrowSamples) {
    const srcObj = domain.src(arrow);
    const dstObj = domain.dst(arrow);
    const left = codomain.compose(target.functor.F1(arrow), transformation.component(srcObj));
    const right = codomain.compose(
      transformation.component(dstObj),
      source.functor.F1(arrow),
    );
    const matches = equality ? equality(left, right) : Object.is(left, right);
    if (!matches) {
      naturalityFailures.push({
        arrow,
        source: codomain.src(left),
        target: codomain.dst(left),
        expected: left,
        actual: right,
        reason: "naturality square failed for sampled arrow",
      });
    }
  }

  const respectsComponents = componentFailures.length === 0;
  const satisfiesNaturality = naturalityFailures.length === 0;
  const holds = respectsComponents && satisfiesNaturality;

  const details: string[] = [];
  if (!respectsComponents) {
    const [failure] = componentFailures;
    if (failure) {
      details.push(
        `Component at object ${String(failure.object)} failed endpoint alignment: ${failure.reason}.`,
      );
    }
  }
  if (!satisfiesNaturality) {
    const [failure] = naturalityFailures;
    if (failure) {
      details.push(
        `Naturality failed on sampled arrow: ${failure.reason}.`,
      );
    }
  }

  if (holds) {
    details.push(
      `Natural transformation satisfied component alignment across ${objectSamples.length} object sample(s) and naturality across ${arrowSamples.length} arrow sample(s).`,
    );
  }

  return {
    respectsComponents,
    componentFailures,
    satisfiesNaturality,
    naturalityFailures,
    holds,
    details,
  };
};

export const constructNaturalTransformationWithWitness = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  source: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  target: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  component: (object: SrcObj) => TgtArr,
  options: NaturalTransformationConstructionOptions<SrcObj, SrcArr, TgtArr> = {},
): NaturalTransformationWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const transformation: NaturalTransformation<SrcObj, SrcArr, TgtObj, TgtArr> = {
    source: source.functor,
    target: target.functor,
    component,
  };
  const witness = makeNaturalTransformationWitness(source, target, transformation, options);
  const report = isNaturalTransformation(witness);
  return options.metadata && options.metadata.length > 0
    ? { transformation, witness, report, metadata: options.metadata }
    : { transformation, witness, report };
};

export const identityNaturalTransformation = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: NaturalTransformationConstructionOptions<SrcObj, SrcArr, TgtArr> = {},
): NaturalTransformationWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const codomain = functor.witness.target;
  const metadata = [
    ...(options.metadata ?? []),
    "Identity natural transformation maps each object to the codomain identity arrow.",
  ];
  return constructNaturalTransformationWithWitness(functor, functor, (object) => {
    const targetObject = functor.functor.F0(object);
    return codomain.id(targetObject);
  }, { ...options, metadata });
};

export const verticalCompositeNaturalTransformations = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  first: NaturalTransformationWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  second: NaturalTransformationWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: NaturalTransformationConstructionOptions<SrcObj, SrcArr, TgtArr> = {},
): NaturalTransformationWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const codomain = first.witness.codomain;
  const metadata = [
    ...(options.metadata ?? []),
    "Vertical composition applies the codomain composition to successive components.",
  ];
  const equalMor = options.equalMor ?? first.witness.equalMor ?? second.witness.equalMor;
  return constructNaturalTransformationWithWitness(
    first.witness.source,
    second.witness.target,
    (object) =>
      codomain.compose(
        second.transformation.component(object),
        first.transformation.component(object),
      ),
    {
      samples: {
        objects: [...first.witness.objectSamples, ...second.witness.objectSamples],
        arrows: [...first.witness.arrowSamples, ...second.witness.arrowSamples],
      },
      ...(equalMor ? { equalMor } : {}),
      metadata,
    },
  );
};

export const whiskerNaturalTransformationLeft = <
  SrcObj,
  SrcArr,
  MidObj,
  MidArr,
  TgtObj,
  TgtArr,
>(
  outer: FunctorWithWitness<MidObj, MidArr, TgtObj, TgtArr>,
  transformation: NaturalTransformationWithWitness<SrcObj, SrcArr, MidObj, MidArr>,
  options: NaturalTransformationConstructionOptions<SrcObj, SrcArr, TgtArr> = {},
): NaturalTransformationWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const metadata = [
    ...(options.metadata ?? []),
    "Left whiskering maps each component via the outer functor's arrow action.",
  ];
  const equalMor = options.equalMor;
  const composedSource = composeFunctors(outer, transformation.witness.source, {
    metadata: ["Composite functor for left whiskering source."],
  });
  const composedTarget = composeFunctors(outer, transformation.witness.target, {
    metadata: ["Composite functor for left whiskering target."],
  });
  return constructNaturalTransformationWithWitness(
    composedSource,
    composedTarget,
    (object) => outer.functor.F1(transformation.transformation.component(object)),
    {
      samples: {
        objects: transformation.witness.objectSamples,
        arrows: transformation.witness.arrowSamples,
      },
      ...(equalMor ? { equalMor } : {}),
      metadata,
    },
  );
};

export const whiskerNaturalTransformationRight = <
  SrcObj,
  SrcArr,
  MidObj,
  MidArr,
  TgtObj,
  TgtArr,
>(
  transformation: NaturalTransformationWithWitness<MidObj, MidArr, TgtObj, TgtArr>,
  inner: FunctorWithWitness<SrcObj, SrcArr, MidObj, MidArr>,
  options: NaturalTransformationConstructionOptions<SrcObj, SrcArr, TgtArr> = {},
): NaturalTransformationWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const metadata = [
    ...(options.metadata ?? []),
    "Right whiskering reindexes components along the inner functor's object action.",
  ];
  const equalMor = options.equalMor ?? transformation.witness.equalMor;
  const composedSource = composeFunctors(transformation.witness.source, inner, {
    metadata: ["Composite functor for right whiskering source."],
  });
  const composedTarget = composeFunctors(transformation.witness.target, inner, {
    metadata: ["Composite functor for right whiskering target."],
  });
  return constructNaturalTransformationWithWitness(
    composedSource,
    composedTarget,
    (object) => transformation.transformation.component(inner.functor.F0(object)),
    {
      samples: {
        objects: inner.witness.objectGenerators,
        arrows: inner.witness.arrowGenerators,
      },
      ...(equalMor ? { equalMor } : {}),
      metadata,
    },
  );
};

export const horizontalCompositeNaturalTransformations = <
  SrcObj,
  SrcArr,
  MidObj,
  MidArr,
  TgtObj,
  TgtArr,
>(
  alpha: NaturalTransformationWithWitness<SrcObj, SrcArr, MidObj, MidArr>,
  beta: NaturalTransformationWithWitness<MidObj, MidArr, TgtObj, TgtArr>,
  options: NaturalTransformationConstructionOptions<SrcObj, SrcArr, TgtArr> = {},
): NaturalTransformationWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const codomain = beta.witness.codomain;
  const metadata = [
    ...(options.metadata ?? []),
    "Horizontal composition follows β_{F₁(-)} ∘ G₂(α_-).",
  ];
  const equalMor = options.equalMor ?? beta.witness.equalMor;
  const composedSource = composeFunctors(beta.witness.source, alpha.witness.source, {
    metadata: ["Composite functor for horizontal composition source."],
  });
  const composedTarget = composeFunctors(beta.witness.target, alpha.witness.target, {
    metadata: ["Composite functor for horizontal composition target."],
  });
  return constructNaturalTransformationWithWitness(
    composedSource,
    composedTarget,
    (object) => {
      const lifted = beta.witness.target.functor.F1(
        alpha.transformation.component(object),
      );
      const mapped = beta.transformation.component(alpha.witness.source.functor.F0(object));
      return codomain.compose(lifted, mapped);
    },
    {
      samples: {
        objects: alpha.witness.objectSamples,
        arrows: alpha.witness.arrowSamples,
      },
      ...(equalMor ? { equalMor } : {}),
      metadata,
    },
  );
};

export const functorCategory = <SrcObj, SrcArr, TgtObj, TgtArr>(
  options: NaturalTransformationConstructionOptions<SrcObj, SrcArr, TgtArr> = {},
): SimpleCat<
  FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  NaturalTransformationWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>
> => ({
  id: (functor) => identityNaturalTransformation(functor, options),
  compose: (g, f) => verticalCompositeNaturalTransformations(f, g, options),
  src: (arrow) => arrow.witness.source,
  dst: (arrow) => arrow.witness.target,
});
