import type { FunctorWithWitness } from "./functor";
import type {
  AnyFunctorPropertyAnalysis,
  AnyFunctorPropertyOracle,
  ArrowPropertySample,
  CategoryPropertyCheck,
  FunctorPropertyAnalysis,
  FunctorPropertyFailure,
  FunctorPropertyKind,
  FunctorPropertyMode,
  FunctorPropertyOracle,
  FunctorPropertySample,
  FunctorPropertyCounterexampleDetail,
  ObjectPropertySample,
} from "./functor-property-types";
import type { SimpleCat } from "./simple-cat";
import type { IsoWitness } from "./kinds/iso";
import {
  checkIsomorphism,
  describeArrow,
  type IsomorphismCheckers,
} from "./functor-isomorphism";

const describeSample = <SrcObj, SrcArr>(
  sample: FunctorPropertySample<SrcObj, SrcArr>,
): string => {
  if (sample.label) {
    return sample.label;
  }
  if (sample.kind === "object") {
    return `object ${String(sample.object)}`;
  }
  return `arrow ${String(sample.arrow)}`;
};

const defaultSamples = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  Kind extends FunctorPropertyKind,
>(
  witness: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>["witness"],
  kind: Kind,
): ReadonlyArray<FunctorPropertySample<SrcObj, SrcArr>> => {
  if (kind === "object") {
    return witness.objectGenerators.map<ObjectPropertySample<SrcObj>>((object) => ({
      kind: "object",
      object,
    }));
  }
  return witness.arrowGenerators.map<ArrowPropertySample<SrcArr>>((arrow) => ({
    kind: "arrow",
    arrow,
  }));
};

const normalizeDetails = (
  oracleDetails: ReadonlyArray<string> | undefined,
  summary: string,
): ReadonlyArray<string> =>
  oracleDetails && oracleDetails.length > 0
    ? [...oracleDetails, summary]
    : [summary];

const appendFailureDetails = <Witness>(
  label: string,
  result: CategoryPropertyCheck<Witness>,
): string | undefined => {
  const pieces: string[] = [];
  if (!result.holds) {
    pieces.push(`${label} fails`);
  }
  if (result.details) {
    pieces.push(result.details);
  }
  return pieces.length > 0 ? pieces.join(": ") : undefined;
};

const buildFailure = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  Kind extends FunctorPropertyKind,
  SrcWitness,
  TgtWitness,
>(
  property: string,
  mode: FunctorPropertyMode,
  sample: FunctorPropertySample<SrcObj, SrcArr>,
  sourceResult: CategoryPropertyCheck<SrcWitness>,
  targetResult: CategoryPropertyCheck<TgtWitness>,
  reasonPieces: ReadonlyArray<string>,
  counterexample?: FunctorPropertyCounterexampleDetail,
): FunctorPropertyFailure<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  Kind,
  SrcWitness,
  TgtWitness
> => ({
  kind: sample.kind as Kind,
  sample,
  sourceResult,
  targetResult,
  reason:
    reasonPieces.length > 0
      ? `${property} ${mode} check on ${describeSample(sample)}: ${reasonPieces.join(
          "; ",
        )}`
      : `${property} ${mode} check on ${describeSample(sample)} failed`,
  ...(counterexample ? { counterexample } : {}),
});

export const evaluateFunctorProperty = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  Kind extends FunctorPropertyKind,
  SrcWitness,
  TgtWitness,
>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  oracle: FunctorPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr, Kind, SrcWitness, TgtWitness>,
): FunctorPropertyAnalysis<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  Kind,
  SrcWitness,
  TgtWitness
> => {
  const samples = (
    oracle.samples ?? defaultSamples(functor.witness, oracle.kind)
  ).filter((sample) => sample.kind === oracle.kind) as ReadonlyArray<
    FunctorPropertySample<SrcObj, SrcArr>
  >;

  const preservationFailures: FunctorPropertyFailure<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr,
    Kind,
    SrcWitness,
    TgtWitness
  >[] = [];
  const reflectionFailures: FunctorPropertyFailure<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr,
    Kind,
    SrcWitness,
    TgtWitness
  >[] = [];

  const processSample = (
    sample: FunctorPropertySample<SrcObj, SrcArr>,
    sourceResult: CategoryPropertyCheck<SrcWitness>,
    targetResult: CategoryPropertyCheck<TgtWitness>,
  ) => {
    if (oracle.mode === "preserves" || oracle.mode === "both") {
      if (sourceResult.holds && !targetResult.holds) {
        const reasonPieces: string[] = [];
        const detail = appendFailureDetails("target property", targetResult);
        if (detail) {
          reasonPieces.push(detail);
        }
        const sourceDetail = appendFailureDetails("source property", sourceResult);
        if (sourceDetail) {
          reasonPieces.push(sourceDetail);
        }
        const counterexampleDetail = oracle.counterexample?.({
          functor,
          sample,
          sourceResult,
          targetResult,
          mode: "preserves",
        });
        preservationFailures.push(
          buildFailure(
            oracle.property,
            "preserves",
            sample,
            sourceResult,
            targetResult,
            reasonPieces,
            counterexampleDetail,
          ),
        );
      }
    }

    if (oracle.mode === "reflects" || oracle.mode === "both") {
      if (targetResult.holds && !sourceResult.holds) {
        const reasonPieces: string[] = [];
        const sourceDetail = appendFailureDetails("source property", sourceResult);
        if (sourceDetail) {
          reasonPieces.push(sourceDetail);
        }
        const targetDetail = appendFailureDetails("target property", targetResult);
        if (targetDetail) {
          reasonPieces.push(targetDetail);
        }
        const counterexampleDetail = oracle.counterexample?.({
          functor,
          sample,
          sourceResult,
          targetResult,
          mode: "reflects",
        });
        reflectionFailures.push(
          buildFailure(
            oracle.property,
            "reflects",
            sample,
            sourceResult,
            targetResult,
            reasonPieces,
            counterexampleDetail,
          ),
        );
      }
    }
  };

  if (oracle.kind === "object") {
    const objectSamples = samples as ReadonlyArray<ObjectPropertySample<SrcObj>>;
    for (const sample of objectSamples) {
      const sourceResult = oracle.source.evaluate(
        functor.witness.source,
        sample.object,
      );
      const targetResult = oracle.target.evaluate(
        functor.witness.target,
        functor.functor.F0(sample.object),
      );
      processSample(sample, sourceResult, targetResult);
    }
  } else {
    const arrowSamples = samples as ReadonlyArray<ArrowPropertySample<SrcArr>>;
    for (const sample of arrowSamples) {
      const sourceResult = oracle.source.evaluate(
        functor.witness.source,
        sample.arrow,
      );
      const targetResult = oracle.target.evaluate(
        functor.witness.target,
        functor.functor.F1(sample.arrow),
      );
      processSample(sample, sourceResult, targetResult);
    }
  }

  const summaries: string[] = [];
  summaries.push(
    `Analyzed ${samples.length} ${oracle.kind === "object" ? "objects" : "arrows"} for ${oracle.property} (${oracle.mode}).`,
  );

  if (oracle.mode === "preserves" || oracle.mode === "both") {
    summaries.push(
      preservationFailures.length === 0
        ? "Preservation held for all supplied samples."
        : `${preservationFailures.length} samples failed preservation.`,
    );
  }

  if (oracle.mode === "reflects" || oracle.mode === "both") {
    summaries.push(
      reflectionFailures.length === 0
        ? "Reflection held for all supplied samples."
        : `${reflectionFailures.length} samples failed reflection.`,
    );
  }

  const preservesOk =
    oracle.mode === "reflects" || preservationFailures.length === 0;
  const reflectsOk =
    oracle.mode === "preserves" || reflectionFailures.length === 0;

  return {
    property: oracle.property,
    kind: oracle.kind,
    mode: oracle.mode,
    preservationFailures,
    reflectionFailures,
    holds: preservesOk && reflectsOk,
    details: normalizeDetails(oracle.details, summaries.join(" ")),
  };
};

export const evaluateFunctorProperties = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  oracles: ReadonlyArray<
    AnyFunctorPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr>
  >,
): ReadonlyArray<AnyFunctorPropertyAnalysis<SrcObj, SrcArr, TgtObj, TgtArr>> =>
  oracles.map((oracle) => evaluateFunctorProperty(functor, oracle));

export const attachFunctorProperties = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  oracles: ReadonlyArray<
    AnyFunctorPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr>
  >,
): FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  if (oracles.length === 0) {
    return functor;
  }
  const analyses = evaluateFunctorProperties(functor, oracles);
  if (analyses.length === 0) {
    return functor;
  }
  return { ...functor, properties: analyses };
};

export interface ArrowPropertyOracleOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
> {
  readonly property: string;
  readonly mode: FunctorPropertyMode;
  readonly sourceEvaluate: (
    category: SimpleCat<SrcObj, SrcArr>,
    arrow: SrcArr,
  ) => CategoryPropertyCheck<SrcWitness>;
  readonly targetEvaluate: (
    category: SimpleCat<TgtObj, TgtArr>,
    arrow: TgtArr,
  ) => CategoryPropertyCheck<TgtWitness>;
  readonly samples?: ReadonlyArray<ArrowPropertySample<SrcArr>>;
  readonly details?: ReadonlyArray<string>;
  readonly counterexample?: FunctorPropertyOracle<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr,
    "arrow",
    SrcWitness,
    TgtWitness
  >["counterexample"];
}

export const makeArrowPropertyOracle = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
>({
  property,
  mode,
  sourceEvaluate,
  targetEvaluate,
  samples,
  details,
  counterexample,
}: ArrowPropertyOracleOptions<SrcObj, SrcArr, TgtObj, TgtArr, SrcWitness, TgtWitness>): FunctorPropertyOracle<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  "arrow",
  SrcWitness,
  TgtWitness
> => ({
  property,
  kind: "arrow",
  mode,
  source: {
    kind: "arrow",
    name: property,
    evaluate: sourceEvaluate,
  },
  target: {
    kind: "arrow",
    name: property,
    evaluate: targetEvaluate,
  },
  ...(samples ? { samples } : {}),
  ...(details ? { details } : {}),
  ...(counterexample ? { counterexample } : {}),
});

export interface ObjectPropertyOracleOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
> {
  readonly property: string;
  readonly mode: FunctorPropertyMode;
  readonly sourceEvaluate: (
    category: SimpleCat<SrcObj, SrcArr>,
    object: SrcObj,
  ) => CategoryPropertyCheck<SrcWitness>;
  readonly targetEvaluate: (
    category: SimpleCat<TgtObj, TgtArr>,
    object: TgtObj,
  ) => CategoryPropertyCheck<TgtWitness>;
  readonly samples?: ReadonlyArray<ObjectPropertySample<SrcObj>>;
  readonly details?: ReadonlyArray<string>;
  readonly counterexample?: FunctorPropertyOracle<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr,
    "object",
    SrcWitness,
    TgtWitness
  >["counterexample"];
}

export const makeObjectPropertyOracle = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
>({
  property,
  mode,
  sourceEvaluate,
  targetEvaluate,
  samples,
  details,
  counterexample,
}: ObjectPropertyOracleOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness
>): FunctorPropertyOracle<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  "object",
  SrcWitness,
  TgtWitness
> => ({
  property,
  kind: "object",
  mode,
  source: {
    kind: "object",
    name: property,
    evaluate: sourceEvaluate,
  },
  target: {
    kind: "object",
    name: property,
    evaluate: targetEvaluate,
  },
  ...(samples ? { samples } : {}),
  ...(details ? { details } : {}),
  ...(counterexample ? { counterexample } : {}),
});

export const makeMonomorphismPreservationOracle = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
>(
  sourceEvaluate: (
    category: SimpleCat<SrcObj, SrcArr>,
    arrow: SrcArr,
  ) => CategoryPropertyCheck<SrcWitness>,
  targetEvaluate: (
    category: SimpleCat<TgtObj, TgtArr>,
    arrow: TgtArr,
  ) => CategoryPropertyCheck<TgtWitness>,
  details?: ReadonlyArray<string>,
  samples?: ReadonlyArray<ArrowPropertySample<SrcArr>>,
) =>
  makeArrowPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr, SrcWitness, TgtWitness>({
    property: "monomorphism",
    mode: "preserves",
    sourceEvaluate,
    targetEvaluate,
    details,
    ...(samples ? { samples } : {}),
  });

export const makeEpimorphismReflectionOracle = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
>(
  sourceEvaluate: (
    category: SimpleCat<SrcObj, SrcArr>,
    arrow: SrcArr,
  ) => CategoryPropertyCheck<SrcWitness>,
  targetEvaluate: (
    category: SimpleCat<TgtObj, TgtArr>,
    arrow: TgtArr,
  ) => CategoryPropertyCheck<TgtWitness>,
  details?: ReadonlyArray<string>,
  samples?: ReadonlyArray<ArrowPropertySample<SrcArr>>,
) =>
  makeArrowPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr, SrcWitness, TgtWitness>({
    property: "epimorphism",
    mode: "reflects",
    sourceEvaluate,
    targetEvaluate,
    details,
    ...(samples ? { samples } : {}),
  });

export const makeEpimorphismPreservationOracle = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
>(
  sourceEvaluate: (
    category: SimpleCat<SrcObj, SrcArr>,
    arrow: SrcArr,
  ) => CategoryPropertyCheck<SrcWitness>,
  targetEvaluate: (
    category: SimpleCat<TgtObj, TgtArr>,
    arrow: TgtArr,
  ) => CategoryPropertyCheck<TgtWitness>,
  details?: ReadonlyArray<string>,
  samples?: ReadonlyArray<ArrowPropertySample<SrcArr>>,
) =>
  makeArrowPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr, SrcWitness, TgtWitness>({
    property: "epimorphism",
    mode: "preserves",
    sourceEvaluate,
    targetEvaluate,
    details,
    ...(samples ? { samples } : {}),
  });

export interface IsomorphismPreservationOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
> {
  readonly details?: ReadonlyArray<string>;
  readonly checkers?: IsomorphismCheckers<SrcObj, SrcArr, TgtObj, TgtArr>;
}

export const makeIsomorphismPreservationOracle = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  options: IsomorphismPreservationOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
) => {
  const sourceEvaluate =
    options.checkers?.source ??
    ((category: SimpleCat<SrcObj, SrcArr>, arrow: SrcArr) =>
      checkIsomorphism(category, arrow));
  const targetEvaluate =
    options.checkers?.target ??
    ((category: SimpleCat<TgtObj, TgtArr>, arrow: TgtArr) =>
      checkIsomorphism(category, arrow));
  const details = [
    "Every functor sends isomorphisms to isomorphisms; confirm the canonical inverse witness survives the mapping on sampled arrows.",
    ...(options.details ?? []),
  ];
  return makeArrowPropertyOracle<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr,
    IsoWitness<SrcArr>,
    IsoWitness<TgtArr>
  >({
    property: "isomorphism",
    mode: "preserves",
    sourceEvaluate,
    targetEvaluate,
    details,
    counterexample: ({ functor, sample, targetResult, sourceResult }) => {
      if (sample.kind !== "arrow") {
        return undefined;
      }
      const imageArrow = functor.functor.F1(sample.arrow);
      const notes: string[] = [];
      if (sourceResult.details) {
        notes.push(`Source check: ${sourceResult.details}`);
      }
      if (targetResult.details) {
        notes.push(`Target check: ${targetResult.details}`);
      }
      const summary = `${describeArrow(
        functor.witness.target,
        imageArrow,
      )} failed to remain an isomorphism.`;
      return {
        summary,
        data: {
          arrow: sample.arrow,
          image: imageArrow,
          sourceInverse: sourceResult.witness,
        },
        notes,
      };
    },
  });
};

export const makeTerminalObjectOracle = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
>(
  sourceEvaluate: (
    category: SimpleCat<SrcObj, SrcArr>,
    object: SrcObj,
  ) => CategoryPropertyCheck<SrcWitness>,
  targetEvaluate: (
    category: SimpleCat<TgtObj, TgtArr>,
    object: TgtObj,
  ) => CategoryPropertyCheck<TgtWitness>,
  mode: FunctorPropertyMode = "both",
  details?: ReadonlyArray<string>,
) =>
  makeObjectPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr, SrcWitness, TgtWitness>({
    property: "terminal object",
    mode,
    sourceEvaluate,
    targetEvaluate,
    details,
  });
