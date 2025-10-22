import type { SimpleCat } from "./simple-cat";
import {
  constructFunctorWithWitness,
  type Functor,
  type FunctorCheckSamples,
  type FunctorComposablePair,
  type FunctorCompositionFailure,
  type FunctorCompositionIgnoredPair,
  type FunctorEndpointFailure,
  type FunctorIdentityFailure,
  type FunctorLawReport,
  type FunctorCompositionOptions,
  type FunctorWithWitness,
} from "./functor";
import { Dual } from "./dual-cat";
import { SetCat, type ExponentialData, type SetHom, type SetObj } from "./set-cat";
import { setSimpleCategory } from "./set-simple-category";

export type ContravariantFunctor<SrcObj, SrcArr, TgtObj, TgtArr> = Functor<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr
>;

const swapComposablePairs = <SrcArr>(
  pairs: ReadonlyArray<FunctorComposablePair<SrcArr>>,
): ReadonlyArray<FunctorComposablePair<SrcArr>> =>
  pairs.map((pair) => ({ f: pair.g, g: pair.f }));

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

export interface ContravariantFunctorWitness<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly source: SimpleCat<SrcObj, SrcArr>;
  readonly target: SimpleCat<TgtObj, TgtArr>;
  readonly functor: ContravariantFunctor<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly objectGenerators: ReadonlyArray<SrcObj>;
  readonly arrowGenerators: ReadonlyArray<SrcArr>;
  readonly composablePairs: ReadonlyArray<FunctorComposablePair<SrcArr>>;
  readonly oppositeWitness: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
}

export interface ContravariantCompositionFailure<SrcArr, TgtArr, TgtObj>
  extends FunctorCompositionFailure<SrcArr, TgtArr, TgtObj> {
  readonly pair: FunctorComposablePair<SrcArr>;
}

export interface ContravariantEndpointFailure<SrcArr, TgtObj>
  extends FunctorEndpointFailure<SrcArr, TgtObj> {}

export interface ContravariantLawReport<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly preservesIdentities: boolean;
  readonly identityFailures: ReadonlyArray<
    FunctorIdentityFailure<SrcObj, TgtArr, TgtObj>
  >;
  readonly preservesReversedComposition: boolean;
  readonly compositionFailures: ReadonlyArray<
    ContravariantCompositionFailure<SrcArr, TgtArr, TgtObj>
  >;
  readonly ignoredCompositionPairs: ReadonlyArray<FunctorComposablePair<SrcArr>>;
  readonly respectsReversedEndpoints: boolean;
  readonly endpointFailures: ReadonlyArray<ContravariantEndpointFailure<SrcArr, TgtObj>>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface ContravariantFunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly functor: ContravariantFunctor<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly witness: ContravariantFunctorWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly report: ContravariantLawReport<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly metadata?: ReadonlyArray<string>;
}

const functorReportToContravariant = <SrcObj, SrcArr, TgtObj, TgtArr>(
  report: FunctorLawReport<SrcObj, SrcArr, TgtObj, TgtArr>,
): ContravariantLawReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const compositionFailures: ContravariantCompositionFailure<SrcArr, TgtArr, TgtObj>[] =
    report.compositionFailures.map((failure) => ({
      ...failure,
      pair: { f: failure.pair.g, g: failure.pair.f },
    }));

  const ignoredCompositionPairs = report.ignoredCompositionPairs.map((entry) => ({
    f: entry.pair.g,
    g: entry.pair.f,
  }));

  return {
    preservesIdentities: report.preservesIdentities,
    identityFailures: report.identityFailures,
    preservesReversedComposition: report.preservesComposition,
    compositionFailures,
    ignoredCompositionPairs,
    respectsReversedEndpoints: report.respectsSourcesAndTargets,
    endpointFailures: report.endpointFailures,
    holds: report.holds,
    details: report.details,
  };
};

export const makeContravariantFunctorWitness = <SrcObj, SrcArr, TgtObj, TgtArr>(
  source: SimpleCat<SrcObj, SrcArr>,
  target: SimpleCat<TgtObj, TgtArr>,
  functor: ContravariantFunctor<SrcObj, SrcArr, TgtObj, TgtArr>,
  samples: FunctorCheckSamples<SrcObj, SrcArr> = {},
): ContravariantFunctorWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const { objects, arrows, composablePairs } = normalizeSamples(samples);
  const swappedSamples: FunctorCheckSamples<SrcObj, SrcArr> = {
    objects,
    arrows,
    composablePairs: swapComposablePairs(composablePairs),
  };
  const oppositeWitness = constructFunctorWithWitness(
    Dual(source),
    target,
    functor,
    swappedSamples,
  );
  const contravariantPairs = oppositeWitness.witness.composablePairs.map((pair) => ({
    f: pair.g,
    g: pair.f,
  }));
  return {
    source,
    target,
    functor,
    objectGenerators: oppositeWitness.witness.objectGenerators,
    arrowGenerators: oppositeWitness.witness.arrowGenerators,
    composablePairs: contravariantPairs,
    oppositeWitness,
  };
};

export const constructContravariantFunctorWithWitness = <SrcObj, SrcArr, TgtObj, TgtArr>(
  source: SimpleCat<SrcObj, SrcArr>,
  target: SimpleCat<TgtObj, TgtArr>,
  functor: ContravariantFunctor<SrcObj, SrcArr, TgtObj, TgtArr>,
  samples: FunctorCheckSamples<SrcObj, SrcArr> = {},
  metadata?: ReadonlyArray<string>,
): ContravariantFunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const witness = makeContravariantFunctorWitness(source, target, functor, samples);
  const report = functorReportToContravariant(witness.oppositeWitness.report);
  if (metadata && metadata.length > 0) {
    return { functor, witness, report, metadata };
  }
  return { functor, witness, report };
};

export interface ContravariantCompositionOptions<SrcObj, SrcArr> {
  readonly samples?: FunctorCheckSamples<SrcObj, SrcArr>;
  readonly metadata?: ReadonlyArray<string>;
}

const contravariantWitnessSamples = <SrcObj, SrcArr>(
  witness: ContravariantFunctorWitness<SrcObj, SrcArr, unknown, unknown>,
): FunctorCheckSamples<SrcObj, SrcArr> => ({
  objects: witness.objectGenerators,
  arrows: witness.arrowGenerators,
  composablePairs: witness.composablePairs,
});

export const composeCovariantContravariant = <
  SrcObj,
  SrcArr,
  MidObj,
  MidArr,
  TgtObj,
  TgtArr,
>(
  outer: FunctorWithWitness<MidObj, MidArr, TgtObj, TgtArr>,
  inner: ContravariantFunctorWithWitness<SrcObj, SrcArr, MidObj, MidArr>,
  options: ContravariantCompositionOptions<SrcObj, SrcArr> = {},
): ContravariantFunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  if (inner.witness.target !== outer.witness.source) {
    throw new Error("composeCovariantContravariant requires matching boundary categories");
  }
  const functor: ContravariantFunctor<SrcObj, SrcArr, TgtObj, TgtArr> = {
    F0: (object) => outer.functor.F0(inner.functor.F0(object)),
    F1: (arrow) => outer.functor.F1(inner.functor.F1(arrow)),
  };
  const samples = options.samples ?? contravariantWitnessSamples(inner.witness);
  const metadata = [
    ...(options.metadata ?? []),
    "Covariant ∘ contravariant flips variance once and remains contravariant.",
  ];
  return constructContravariantFunctorWithWitness(
    inner.witness.source,
    outer.witness.target,
    functor,
    samples,
    metadata,
  );
};

export const composeContravariantContravariant = <
  SrcObj,
  SrcArr,
  MidObj,
  MidArr,
  TgtObj,
  TgtArr,
>(
  outer: ContravariantFunctorWithWitness<MidObj, MidArr, TgtObj, TgtArr>,
  inner: ContravariantFunctorWithWitness<SrcObj, SrcArr, MidObj, MidArr>,
  options: FunctorCompositionOptions<SrcObj, SrcArr> = {},
): FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  if (inner.witness.target !== outer.witness.source) {
    throw new Error("composeContravariantContravariant requires matching middle categories");
  }
  const functor: Functor<SrcObj, SrcArr, TgtObj, TgtArr> = {
    F0: (object) => outer.functor.F0(inner.functor.F0(object)),
    F1: (arrow) => outer.functor.F1(inner.functor.F1(arrow)),
  };
  const samples = options.samples ?? contravariantWitnessSamples(inner.witness);
  const metadata = [
    ...(options.metadata ?? []),
    "Contravariant ∘ contravariant realises the variance flip of Theorem 130.",
  ];
  return constructFunctorWithWitness(
    inner.witness.source,
    outer.witness.target,
    functor,
    samples,
    metadata,
  );
};

export const contravariantToOppositeFunctor = <SrcObj, SrcArr, TgtObj, TgtArr>(
  contravariant: ContravariantFunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
): FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => contravariant.witness.oppositeWitness;

export const oppositeFunctorToContravariant = <SrcObj, SrcArr, TgtObj, TgtArr>(
  source: SimpleCat<SrcObj, SrcArr>,
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  metadata?: ReadonlyArray<string>,
): ContravariantFunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const samples: FunctorCheckSamples<SrcObj, SrcArr> = {
    objects: functor.witness.objectGenerators,
    arrows: functor.witness.arrowGenerators,
    composablePairs: functor.witness.composablePairs.map((pair) => ({
      f: pair.g,
      g: pair.f,
    })),
  };
  return constructContravariantFunctorWithWitness(
    source,
    functor.witness.target,
    functor.functor,
    samples,
    metadata,
  );
};

export interface HomContravariantOptions {
  readonly samples?: FunctorCheckSamples<SetObj<unknown>, SetHom<unknown, unknown>>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface HomContravariantToolkit {
  readonly functor: ContravariantFunctorWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly register: (
    base: SetObj<unknown>,
    assignment: (value: unknown) => unknown,
  ) => (value: unknown) => unknown;
}

const defaultHomContravariantSamples = (): FunctorCheckSamples<
  SetObj<unknown>,
  SetHom<unknown, unknown>
> => {
  const numbers = SetCat.obj([0, 1]) as SetObj<unknown>;
  const booleans = SetCat.obj([false, true]) as SetObj<unknown>;
  const strings = SetCat.obj(["a", "b"]) as SetObj<unknown>;

  const arrows: SetHom<unknown, unknown>[] = [
    SetCat.hom(numbers, numbers, (value: number) => (value + 1) % 2) as SetHom<unknown, unknown>,
    SetCat.hom(booleans, booleans, (flag: boolean) => !flag) as SetHom<unknown, unknown>,
    SetCat.hom(numbers, booleans, (value: number) => value === 0) as SetHom<unknown, unknown>,
    SetCat.hom(strings, numbers, (value: string) => (value === "a" ? 0 : 1)) as SetHom<unknown, unknown>,
  ];

  const objects: ReadonlyArray<SetObj<unknown>> = [numbers, booleans, strings];

  const composablePairs: FunctorComposablePair<SetHom<unknown, unknown>>[] = [];
  for (const f of arrows) {
    for (const g of arrows) {
      if (Object.is(f.cod, g.dom)) {
        composablePairs.push({ f, g });
      }
    }
  }

  return { objects, arrows, composablePairs };
};

type UnknownExponential = ExponentialData<unknown, unknown>;

export const homSetContravariantFunctorWithWitness = (
  target: SetObj<unknown>,
  options: HomContravariantOptions = {},
): HomContravariantToolkit => {
  const exponentialCache = new WeakMap<SetObj<unknown>, UnknownExponential>();

  const exponentialFor = (
    base: SetObj<unknown>,
  ): UnknownExponential => {
    const cached = exponentialCache.get(base);
    if (cached) {
      return cached;
    }
    const data = SetCat.exponential(base, target as SetObj<unknown>);
    exponentialCache.set(base, data as UnknownExponential);
    return data as UnknownExponential;
  };

  const functor: ContravariantFunctor<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  > = {
    F0: (object) => exponentialFor(object).object as SetObj<unknown>,
    F1: (arrow) => {
      const domain = exponentialFor(arrow.cod as SetObj<unknown>);
      const codomain = exponentialFor(arrow.dom as SetObj<unknown>);
      return SetCat.hom(
        domain.object as SetObj<unknown>,
        codomain.object as SetObj<unknown>,
        (map: (value: unknown) => unknown) =>
          codomain.register((input: unknown) => map(arrow.map(input))),
      ) as SetHom<unknown, unknown>;
    },
  };

  const samples = options.samples ?? defaultHomContravariantSamples();
  const metadata =
    options.metadata ?? ["Hom(-, X) contravariant functor sends a set to the function set into X."];

  const functorWithWitness = constructContravariantFunctorWithWitness(
    setSimpleCategory,
    setSimpleCategory,
    functor,
    samples,
    metadata,
  );

  const register = (
    base: SetObj<unknown>,
    assignment: (value: unknown) => unknown,
  ): ((value: unknown) => unknown) => exponentialFor(base).register(assignment);

  return { functor: functorWithWitness, register };
};

export const Contra = <CO, CA, DO, DA>(
  C: SimpleCat<CO, CA>,
  D: SimpleCat<DO, DA>,
  F0: (object: CO) => DO,
  F1op: (arrow: CA) => DA,
): Functor<CO, CA, DO, DA> => {
  return {
    F0,
    F1: F1op,
  };
};

export const isContravariant = <CO, CA, DO, DA>(
  C: SimpleCat<CO, CA>,
  D: SimpleCat<DO, DA>,
  F: Functor<CO, CA, DO, DA>,
  sampleObjects: ReadonlyArray<CO>,
  sampleArrows: ReadonlyArray<CA>,
): boolean => {
  const composablePairs: FunctorComposablePair<CA>[] = [];
  for (const f of sampleArrows) {
    for (const g of sampleArrows) {
      composablePairs.push({ f, g });
    }
  }
  const witness = constructContravariantFunctorWithWitness(
    C,
    D,
    F,
    { objects: sampleObjects, arrows: sampleArrows, composablePairs },
  );
  return witness.report.holds;
};
