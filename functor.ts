import type { SimpleCat } from "./simple-cat";
import type {
  AnyFunctorPropertyAnalysis,
  AnyFunctorPropertyOracle,
} from "./functor-property-types";
import {
  attachFunctorProperties,
  makeIsomorphismPreservationOracle,
} from "./functor-property";

export interface Functor<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly F0: (object: SrcObj) => TgtObj;
  readonly F1: (arrow: SrcArr) => TgtArr;
}

export interface FunctorComposablePair<SrcArr> {
  readonly f: SrcArr;
  readonly g: SrcArr;
}

export interface FunctorCheckSamples<SrcObj, SrcArr> {
  readonly objects?: ReadonlyArray<SrcObj>;
  readonly arrows?: ReadonlyArray<SrcArr>;
  readonly composablePairs?: ReadonlyArray<FunctorComposablePair<SrcArr>>;
}

interface SimpleCatWithEquality<Obj, Arr> extends SimpleCat<Obj, Arr> {
  readonly eq: (left: Arr, right: Arr) => boolean;
}

const hasArrowEquality = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): category is SimpleCatWithEquality<Obj, Arr> =>
  typeof (category as Partial<SimpleCatWithEquality<Obj, Arr>>).eq === "function";

const equalityWitness = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
): ((left: Arr, right: Arr) => boolean) | undefined =>
  (hasArrowEquality(category) ? category.eq.bind(category) : undefined);

export interface FunctorIdentityFailure<SrcObj, TgtArr, TgtObj> {
  readonly object: SrcObj;
  readonly expectedIdentity: TgtArr;
  readonly mappedIdentity: TgtArr;
  readonly expectedSource: TgtObj;
  readonly expectedTarget: TgtObj;
  readonly mappedSource: TgtObj;
  readonly mappedTarget: TgtObj;
  readonly equalityConsidered: boolean;
  readonly reason: string;
}

export interface FunctorCompositionFailure<SrcArr, TgtArr, TgtObj> {
  readonly pair: FunctorComposablePair<SrcArr>;
  readonly expectedComposite: TgtArr;
  readonly mappedComposite: TgtArr;
  readonly expectedSource: TgtObj;
  readonly expectedTarget: TgtObj;
  readonly mappedSource: TgtObj;
  readonly mappedTarget: TgtObj;
  readonly equalityConsidered: boolean;
  readonly reason: string;
}

export interface FunctorCompositionIgnoredPair<SrcArr> {
  readonly pair: FunctorComposablePair<SrcArr>;
  readonly reason: string;
}

export interface FunctorEndpointFailure<SrcArr, TgtObj> {
  readonly arrow: SrcArr;
  readonly expectedSource: TgtObj;
  readonly expectedTarget: TgtObj;
  readonly mappedSource: TgtObj;
  readonly mappedTarget: TgtObj;
  readonly reason: string;
}

export interface FunctorIdentityCheckResult<SrcObj, TgtArr, TgtObj> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<FunctorIdentityFailure<SrcObj, TgtArr, TgtObj>>;
}

export interface FunctorCompositionCheckResult<SrcArr, TgtArr, TgtObj> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<FunctorCompositionFailure<SrcArr, TgtArr, TgtObj>>;
  readonly ignoredPairs: ReadonlyArray<FunctorCompositionIgnoredPair<SrcArr>>;
}

export interface FunctorEndpointCheckResult<SrcArr, TgtObj> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<FunctorEndpointFailure<SrcArr, TgtObj>>;
}

export interface FunctorWitness<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly source: SimpleCat<SrcObj, SrcArr>;
  readonly target: SimpleCat<TgtObj, TgtArr>;
  readonly functor: Functor<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly objectGenerators: ReadonlyArray<SrcObj>;
  readonly arrowGenerators: ReadonlyArray<SrcArr>;
  readonly composablePairs: ReadonlyArray<FunctorComposablePair<SrcArr>>;
}

export interface FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly functor: Functor<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly witness: FunctorWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly report: FunctorLawReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly metadata?: ReadonlyArray<string>;
  readonly properties?: ReadonlyArray<AnyFunctorPropertyAnalysis<SrcObj, SrcArr, TgtObj, TgtArr>>;
}

const normalizeSamples = <SrcObj, SrcArr>(
  samples: FunctorCheckSamples<SrcObj, SrcArr>,
): {
  readonly objects: ReadonlyArray<SrcObj>;
  readonly arrows: ReadonlyArray<SrcArr>;
  readonly composablePairs: ReadonlyArray<FunctorComposablePair<SrcArr>>;
} => ({
  objects: samples.objects ?? [],
  arrows: samples.arrows ?? [],
  composablePairs: samples.composablePairs ?? [],
});

export const makeFunctorWitness = <SrcObj, SrcArr, TgtObj, TgtArr>(
  source: SimpleCat<SrcObj, SrcArr>,
  target: SimpleCat<TgtObj, TgtArr>,
  functor: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  samples: FunctorCheckSamples<SrcObj, SrcArr> = {},
): FunctorWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const { objects, arrows, composablePairs } = normalizeSamples(samples);

  const arrowSet = new Set<SrcArr>();
  for (const arrow of arrows) {
    arrowSet.add(arrow);
  }
  for (const pair of composablePairs) {
    arrowSet.add(pair.f);
    arrowSet.add(pair.g);
  }
  if (arrowSet.size === 0) {
    for (const object of objects) {
      arrowSet.add(source.id(object));
    }
  }

  const arrowGenerators = Array.from(arrowSet);

  const objectSet = new Set<SrcObj>();
  for (const object of objects) {
    objectSet.add(object);
  }
  for (const arrow of arrowGenerators) {
    objectSet.add(source.src(arrow));
    objectSet.add(source.dst(arrow));
  }

  return {
    source,
    target,
    functor,
    objectGenerators: Array.from(objectSet),
    arrowGenerators,
    composablePairs,
  };
};

export const constructFunctorWithWitness = <SrcObj, SrcArr, TgtObj, TgtArr>(
  source: SimpleCat<SrcObj, SrcArr>,
  target: SimpleCat<TgtObj, TgtArr>,
  functor: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  samples: FunctorCheckSamples<SrcObj, SrcArr> = {},
  metadata?: ReadonlyArray<string>,
): FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const witness = makeFunctorWitness(source, target, functor, samples);
  const report = isFunctor(witness);
  const base: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> =
    metadata && metadata.length > 0
      ? { functor, witness, report, metadata }
      : { functor, witness, report };
  const isomorphismOracle =
    makeIsomorphismPreservationOracle<SrcObj, SrcArr, TgtObj, TgtArr>() as AnyFunctorPropertyOracle<
      SrcObj,
      SrcArr,
      TgtObj,
      TgtArr
    >;
  return attachFunctorProperties(base, [isomorphismOracle]);
};

export const identityFunctorWithWitness = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  samples: FunctorCheckSamples<Obj, Arr> = {},
): FunctorWithWitness<Obj, Arr, Obj, Arr> => {
  const functor: Functor<Obj, Arr, Obj, Arr> = {
    F0: (object) => object,
    F1: (arrow) => arrow,
  };
  return constructFunctorWithWitness(category, category, functor, samples);
};

export interface FunctorCompositionOptions<SrcObj, SrcArr> {
  readonly samples?: FunctorCheckSamples<SrcObj, SrcArr>;
  readonly metadata?: ReadonlyArray<string>;
}

const witnessSamples = <SrcObj, SrcArr, TgtObj, TgtArr>(
  witness: FunctorWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
): FunctorCheckSamples<SrcObj, SrcArr> => ({
  objects: witness.objectGenerators,
  arrows: witness.arrowGenerators,
  composablePairs: witness.composablePairs,
});

export const composeFunctors = <
  SrcObj,
  SrcArr,
  MidObj,
  MidArr,
  TgtObj,
  TgtArr,
>(
  outer: FunctorWithWitness<MidObj, MidArr, TgtObj, TgtArr>,
  inner: FunctorWithWitness<SrcObj, SrcArr, MidObj, MidArr>,
  options: FunctorCompositionOptions<SrcObj, SrcArr> = {},
): FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  if (inner.witness.target !== outer.witness.source) {
    throw new Error("composeFunctors requires matching middle categories");
  }
  const functor: Functor<SrcObj, SrcArr, TgtObj, TgtArr> = {
    F0: (object) => outer.functor.F0(inner.functor.F0(object)),
    F1: (arrow) => outer.functor.F1(inner.functor.F1(arrow)),
  };
  const samples = options.samples ?? witnessSamples(inner.witness);
  const metadata = [
    ...(options.metadata ?? []),
    "Composite functor witness replays Theorem 129 on supplied generators.",
  ];
  return constructFunctorWithWitness(
    inner.witness.source,
    outer.witness.target,
    functor,
    samples,
    metadata,
  );
};

export interface FunctorObjectMismatch<SrcObj, TgtObj> {
  readonly object: SrcObj;
  readonly leftImage: TgtObj;
  readonly rightImage: TgtObj;
  readonly reason: string;
}

export interface FunctorArrowMismatch<SrcArr, TgtArr, TgtObj> {
  readonly arrow: SrcArr;
  readonly leftImage: TgtArr;
  readonly rightImage: TgtArr;
  readonly leftSource: TgtObj;
  readonly leftTarget: TgtObj;
  readonly rightSource: TgtObj;
  readonly rightTarget: TgtObj;
  readonly reason: string;
  readonly equalityConsidered: boolean;
}

export interface FunctorComparisonReport<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly objectMismatches: ReadonlyArray<FunctorObjectMismatch<SrcObj, TgtObj>>;
  readonly arrowMismatches: ReadonlyArray<FunctorArrowMismatch<SrcArr, TgtArr, TgtObj>>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface FunctorComparisonOptions<SrcObj, SrcArr> {
  readonly samples?: FunctorCheckSamples<SrcObj, SrcArr>;
}

const gatherComparisonSamples = <SrcObj, SrcArr, LeftObj, LeftArr, RightObj, RightArr>(
  left: FunctorWitness<SrcObj, SrcArr, LeftObj, LeftArr>,
  right: FunctorWitness<SrcObj, SrcArr, RightObj, RightArr>,
  options: FunctorComparisonOptions<SrcObj, SrcArr>,
): { objects: ReadonlyArray<SrcObj>; arrows: ReadonlyArray<SrcArr> } => {
  const objectSet = new Set<SrcObj>();
  const arrowSet = new Set<SrcArr>();

  const recordSamples = (samples: FunctorCheckSamples<SrcObj, SrcArr>) => {
    for (const object of samples.objects ?? []) {
      objectSet.add(object);
    }
    for (const arrow of samples.arrows ?? []) {
      arrowSet.add(arrow);
    }
    for (const pair of samples.composablePairs ?? []) {
      arrowSet.add(pair.f);
      arrowSet.add(pair.g);
    }
  };

  recordSamples(options.samples ?? {});
  recordSamples(witnessSamples(left));
  recordSamples(witnessSamples(right));

  return { objects: Array.from(objectSet), arrows: Array.from(arrowSet) };
};

export const compareFunctors = <SrcObj, SrcArr, TgtObj, TgtArr>(
  left: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  right: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: FunctorComparisonOptions<SrcObj, SrcArr> = {},
): FunctorComparisonReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  if (left.witness.source !== right.witness.source) {
    throw new Error("compareFunctors requires the same source category");
  }
  if (left.witness.target !== right.witness.target) {
    throw new Error("compareFunctors requires the same target category");
  }

  const { objects, arrows } = gatherComparisonSamples(
    left.witness,
    right.witness,
    options,
  );

  const target = left.witness.target;
  const arrowEq = equalityWitness(target);

  const objectMismatches: FunctorObjectMismatch<SrcObj, TgtObj>[] = [];
  for (const object of objects) {
    const leftImage = left.functor.F0(object);
    const rightImage = right.functor.F0(object);
    if (!Object.is(leftImage, rightImage)) {
      objectMismatches.push({
        object,
        leftImage,
        rightImage,
        reason: `Object ${String(object)} maps to ${String(
          leftImage,
        )} on the left but ${String(rightImage)} on the right`,
      });
    }
  }

  const arrowMismatches: FunctorArrowMismatch<SrcArr, TgtArr, TgtObj>[] = [];
  for (const arrow of arrows) {
    const leftImage = left.functor.F1(arrow);
    const rightImage = right.functor.F1(arrow);

    const leftSource = target.src(leftImage);
    const leftTarget = target.dst(leftImage);
    const rightSource = target.src(rightImage);
    const rightTarget = target.dst(rightImage);

    const reasons: string[] = [];
    if (!Object.is(leftSource, rightSource)) {
      reasons.push(
        `source differs (${String(leftSource)} vs. ${String(rightSource)})`,
      );
    }
    if (!Object.is(leftTarget, rightTarget)) {
      reasons.push(
        `target differs (${String(leftTarget)} vs. ${String(rightTarget)})`,
      );
    }
    const arrowsEqual = arrowEq
      ? arrowEq(leftImage, rightImage)
      : Object.is(leftImage, rightImage);
    if (!arrowsEqual) {
      reasons.push("arrow images differ under equality check");
    }

    if (reasons.length > 0) {
      arrowMismatches.push({
        arrow,
        leftImage,
        rightImage,
        leftSource,
        leftTarget,
        rightSource,
        rightTarget,
        reason: reasons.join("; "),
        equalityConsidered: arrowEq !== undefined,
      });
    }
  }

  const details: string[] = [];
  const [objectMismatch] = objectMismatches;
  if (objectMismatch) {
    details.push(objectMismatch.reason);
  }
  const [arrowMismatch] = arrowMismatches;
  if (arrowMismatch) {
    details.push(
      `Arrow mismatch on ${String(arrowMismatch.arrow)}: ${arrowMismatch.reason}.`,
    );
  }

  return {
    objectMismatches,
    arrowMismatches,
    holds: objectMismatches.length === 0 && arrowMismatches.length === 0,
    details,
  };
};

export const checkFunctorLeftIdentity = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: FunctorComparisonOptions<SrcObj, SrcArr> = {},
): FunctorComparisonReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const identity = identityFunctorWithWitness(functor.witness.target);
  const composite = composeFunctors(identity, functor, {
    ...(options.samples ? { samples: options.samples } : {}),
    metadata: ["Id ∘ F uses Theorem 129 to recover F."],
  });
  return compareFunctors(composite, functor, options);
};

export const checkFunctorRightIdentity = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: FunctorComparisonOptions<SrcObj, SrcArr> = {},
): FunctorComparisonReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const identity = identityFunctorWithWitness(functor.witness.source);
  const composite = composeFunctors(functor, identity, {
    ...(options.samples ? { samples: options.samples } : {}),
    metadata: ["F ∘ Id_C replays the unit law on supplied generators."],
  });
  return compareFunctors(composite, functor, options);
};

export const checkFunctorAssociativity = <
  SrcObj,
  SrcArr,
  MidObj,
  MidArr,
  Mid2Obj,
  Mid2Arr,
  TgtObj,
  TgtArr,
>(
  h: FunctorWithWitness<Mid2Obj, Mid2Arr, TgtObj, TgtArr>,
  g: FunctorWithWitness<MidObj, MidArr, Mid2Obj, Mid2Arr>,
  f: FunctorWithWitness<SrcObj, SrcArr, MidObj, MidArr>,
  options: FunctorComparisonOptions<SrcObj, SrcArr> = {},
): FunctorComparisonReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  if (f.witness.target !== g.witness.source) {
    throw new Error("checkFunctorAssociativity requires g ∘ f to be defined");
  }
  if (g.witness.target !== h.witness.source) {
    throw new Error("checkFunctorAssociativity requires h ∘ g to be defined");
  }

  const gAfterF = composeFunctors(g, f, {
    ...(options.samples ? { samples: options.samples } : {}),
    metadata: ["G ∘ F as the inner composite for associativity."],
  });
  const left = composeFunctors(h, gAfterF, {
    ...(options.samples ? { samples: options.samples } : {}),
    metadata: ["H ∘ (G ∘ F) for associativity check."],
  });

  const hAfterG = composeFunctors(h, g, {
    metadata: ["(H ∘ G) as the alternative associativity grouping."],
  });
  const right = composeFunctors(hAfterG, f, {
    ...(options.samples ? { samples: options.samples } : {}),
    metadata: ["(H ∘ G) ∘ F for associativity check."],
  });

  return compareFunctors(left, right, options);
};

export const checkFunctorIdentity = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  objects: ReadonlyArray<SrcObj>,
): FunctorIdentityCheckResult<SrcObj, TgtArr, TgtObj> => {
  const eq = equalityWitness(D);
  const failures: FunctorIdentityFailure<SrcObj, TgtArr, TgtObj>[] = [];
  for (const object of objects) {
    const mappedIdentity = F.F1(C.id(object));
    const expectedIdentity = D.id(F.F0(object));
    const mappedSource = D.src(mappedIdentity);
    const mappedTarget = D.dst(mappedIdentity);
    const expectedSource = D.src(expectedIdentity);
    const expectedTarget = D.dst(expectedIdentity);

    const reasons: string[] = [];
    if (!Object.is(mappedSource, expectedSource)) {
      reasons.push(
        `mapped identity has source ${String(mappedSource)} instead of ${String(expectedSource)}`,
      );
    }
    if (!Object.is(mappedTarget, expectedTarget)) {
      reasons.push(
        `mapped identity has target ${String(mappedTarget)} instead of ${String(expectedTarget)}`,
      );
    }
    if (eq && !eq(mappedIdentity, expectedIdentity)) {
      reasons.push("mapped identity arrow differs from target identity under equality check");
    }
    if (reasons.length > 0) {
      failures.push({
        object,
        expectedIdentity,
        mappedIdentity,
        expectedSource,
        expectedTarget,
        mappedSource,
        mappedTarget,
        equalityConsidered: eq !== undefined,
        reason: reasons.join("; "),
      });
    }
  }
  return { holds: failures.length === 0, failures };
};

export const checkFunctorComposition = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  arrows: ReadonlyArray<FunctorComposablePair<SrcArr>>,
): FunctorCompositionCheckResult<SrcArr, TgtArr, TgtObj> => {
  const eq = equalityWitness(D);
  const failures: FunctorCompositionFailure<SrcArr, TgtArr, TgtObj>[] = [];
  const ignoredPairs: FunctorCompositionIgnoredPair<SrcArr>[] = [];
  for (const pair of arrows) {
    if (!Object.is(C.dst(pair.f), C.src(pair.g))) {
      ignoredPairs.push({
        pair,
        reason: "pair skipped: domain/codomain mismatch",
      });
      continue;
    }
    const mappedComposite = F.F1(C.compose(pair.g, pair.f));
    const expectedComposite = D.compose(F.F1(pair.g), F.F1(pair.f));
    const mappedSource = D.src(mappedComposite);
    const mappedTarget = D.dst(mappedComposite);
    const expectedSource = D.src(expectedComposite);
    const expectedTarget = D.dst(expectedComposite);

    const reasons: string[] = [];
    if (!Object.is(mappedSource, expectedSource)) {
      reasons.push(
        `mapped composite has source ${String(mappedSource)} instead of ${String(expectedSource)}`,
      );
    }
    if (!Object.is(mappedTarget, expectedTarget)) {
      reasons.push(
        `mapped composite has target ${String(mappedTarget)} instead of ${String(expectedTarget)}`,
      );
    }
    if (eq && !eq(mappedComposite, expectedComposite)) {
      reasons.push("mapped composite differs from composed images under equality check");
    }
    if (reasons.length > 0) {
      failures.push({
        pair,
        expectedComposite,
        mappedComposite,
        expectedSource,
        expectedTarget,
        mappedSource,
        mappedTarget,
        equalityConsidered: eq !== undefined,
        reason: reasons.join("; "),
      });
    }
  }
  return { holds: failures.length === 0, failures, ignoredPairs };
};

export const checkFunctorEndpointCompatibility = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  arrows: ReadonlyArray<SrcArr>,
): FunctorEndpointCheckResult<SrcArr, TgtObj> => {
  const failures: FunctorEndpointFailure<SrcArr, TgtObj>[] = [];
  for (const arrow of arrows) {
    const mapped = F.F1(arrow);
    const expectedSource = F.F0(C.src(arrow));
    const expectedTarget = F.F0(C.dst(arrow));
    const mappedSource = D.src(mapped);
    const mappedTarget = D.dst(mapped);

    const reasons: string[] = [];
    if (!Object.is(mappedSource, expectedSource)) {
      reasons.push(
        `mapped arrow has source ${String(mappedSource)} instead of ${String(expectedSource)}`,
      );
    }
    if (!Object.is(mappedTarget, expectedTarget)) {
      reasons.push(
        `mapped arrow has target ${String(mappedTarget)} instead of ${String(expectedTarget)}`,
      );
    }
    if (reasons.length > 0) {
      failures.push({
        arrow,
        expectedSource,
        expectedTarget,
        mappedSource,
        mappedTarget,
        reason: reasons.join("; "),
      });
    }
  }
  return { holds: failures.length === 0, failures };
};

export interface FunctorLawReport<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly preservesIdentities: boolean;
  readonly identityFailures: ReadonlyArray<
    FunctorIdentityFailure<SrcObj, TgtArr, TgtObj>
  >;
  readonly preservesComposition: boolean;
  readonly compositionFailures: ReadonlyArray<
    FunctorCompositionFailure<SrcArr, TgtArr, TgtObj>
  >;
  readonly ignoredCompositionPairs: ReadonlyArray<FunctorCompositionIgnoredPair<SrcArr>>;
  readonly respectsSourcesAndTargets: boolean;
  readonly endpointFailures: ReadonlyArray<FunctorEndpointFailure<SrcArr, TgtObj>>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export const isFunctor = <SrcObj, SrcArr, TgtObj, TgtArr>(
  witness: FunctorWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
): FunctorLawReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const { source, target, functor, objectGenerators, arrowGenerators, composablePairs } = witness;

  const arrowSet = new Set<SrcArr>();
  for (const arrow of arrowGenerators) {
    arrowSet.add(arrow);
  }
  for (const pair of composablePairs) {
    arrowSet.add(pair.f);
    arrowSet.add(pair.g);
  }
  if (arrowSet.size === 0) {
    for (const object of objectGenerators) {
      arrowSet.add(source.id(object));
    }
  }
  const arrowSamples = Array.from(arrowSet);

  const objectSet = new Set<SrcObj>();
  for (const object of objectGenerators) {
    objectSet.add(object);
  }
  for (const arrow of arrowSamples) {
    objectSet.add(source.src(arrow));
    objectSet.add(source.dst(arrow));
  }
  const identitySamples = Array.from(objectSet);

  const identityResult = checkFunctorIdentity(source, target, functor, identitySamples);
  const compositionResult = checkFunctorComposition(source, target, functor, composablePairs);
  const endpointResult = checkFunctorEndpointCompatibility(
    source,
    target,
    functor,
    arrowSamples,
  );

  const details: string[] = [];
  const [identityFailure] = identityResult.failures;
  if (!identityResult.holds && identityFailure) {
    details.push(
      `Functor failed to preserve identity at object ${String(
        identityFailure.object,
      )}: ${identityFailure.reason}.`,
    );
  }
  const [compositionFailure] = compositionResult.failures;
  if (!compositionResult.holds && compositionFailure) {
    details.push(
      `Functor failed to preserve composition on a sampled pair: ${compositionFailure.reason}.`,
    );
  }
  if (compositionResult.ignoredPairs.length > 0) {
    const firstIgnored = compositionResult.ignoredPairs[0]!;
    details.push(
      compositionResult.ignoredPairs.length === 1
        ? `Ignored a non-composable sample pair while checking composition: ${firstIgnored.reason}.`
        : `Ignored ${compositionResult.ignoredPairs.length} non-composable sample pairs while checking composition. First: ${firstIgnored.reason}.`,
    );
  }
  const [endpointFailure] = endpointResult.failures;
  if (!endpointResult.holds && endpointFailure) {
    details.push(
      `Functor mapped a sampled arrow to mismatched endpoints: ${endpointFailure.reason}.`,
    );
  }

  return {
    preservesIdentities: identityResult.holds,
    identityFailures: identityResult.failures,
    preservesComposition: compositionResult.holds,
    compositionFailures: compositionResult.failures,
    ignoredCompositionPairs: compositionResult.ignoredPairs,
    respectsSourcesAndTargets: endpointResult.holds,
    endpointFailures: endpointResult.failures,
    holds: identityResult.holds && compositionResult.holds && endpointResult.holds,
    details,
  };
};

export const preservesIdentity = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  objects: ReadonlyArray<SrcObj>,
): boolean => checkFunctorIdentity(C, D, F, objects).holds;

export const preservesComposition = <SrcObj, SrcArr, TgtObj, TgtArr>(
  C: SimpleCat<SrcObj, SrcArr>,
  D: SimpleCat<TgtObj, TgtArr>,
  F: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  arrows: ReadonlyArray<FunctorComposablePair<SrcArr>>,
): boolean => checkFunctorComposition(C, D, F, arrows).holds;
