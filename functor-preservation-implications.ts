import type { FunctorWithWitness } from "./functor";
import type { SimpleCat } from "./simple-cat";
import type {
  ArrowPropertySample,
  CategoryPropertyCheck,
  FunctorPropertyAnalysis,
} from "./functor-property-types";
import {
  evaluateFunctorProperty,
  makeEpimorphismPreservationOracle,
  makeMonomorphismPreservationOracle,
} from "./functor-property";
import { describeArrow } from "./functor-isomorphism";

export interface PullbackSpan<Arr> {
  readonly left: Arr;
  readonly right: Arr;
  readonly label?: string;
}

export interface PushoutCospan<Arr> {
  readonly left: Arr;
  readonly right: Arr;
  readonly label?: string;
}

export interface PullbackPreservationEvidence<SrcObj, SrcArr> {
  readonly spans?: ReadonlyArray<PullbackSpan<SrcArr>>;
  readonly details?: ReadonlyArray<string>;
  readonly source?: SimpleCat<SrcObj, SrcArr>;
}

export interface PushoutPreservationEvidence<SrcObj, SrcArr> {
  readonly cospans?: ReadonlyArray<PushoutCospan<SrcArr>>;
  readonly details?: ReadonlyArray<string>;
  readonly source?: SimpleCat<SrcObj, SrcArr>;
}

const spanSummary = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  span: PullbackSpan<Arr>,
): string => {
  const base = `${describeArrow(category, span.left)} ⟶ ${String(
    category.dst(span.left),
  )}`;
  const right = `${describeArrow(category, span.right)} ⟶ ${String(
    category.dst(span.right),
  )}`;
  const suffix = span.label ? ` (${span.label})` : "";
  return `Span ${base} ∧ ${right}${suffix}`;
};

const cospanSummary = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  cospan: PushoutCospan<Arr>,
): string => {
  const base = `${describeArrow(category, cospan.left)} ⟵ ${String(
    category.src(cospan.left),
  )}`;
  const right = `${describeArrow(category, cospan.right)} ⟵ ${String(
    category.src(cospan.right),
  )}`;
  const suffix = cospan.label ? ` (${cospan.label})` : "";
  return `Cospan ${base} ∧ ${right}${suffix}`;
};

export interface MonomorphismImplicationOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
> {
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly sourceEvaluate: (
    category: SimpleCat<SrcObj, SrcArr>,
    arrow: SrcArr,
  ) => CategoryPropertyCheck<SrcWitness>;
  readonly targetEvaluate: (
    category: SimpleCat<TgtObj, TgtArr>,
    arrow: TgtArr,
  ) => CategoryPropertyCheck<TgtWitness>;
  readonly evidence?: PullbackPreservationEvidence<SrcObj, SrcArr>;
  readonly samples?: ReadonlyArray<ArrowPropertySample<SrcArr>>;
}

export const preservesPullbacksImpliesMonomorphisms = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
>({
  functor,
  sourceEvaluate,
  targetEvaluate,
  evidence,
  samples,
}: MonomorphismImplicationOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness
>): FunctorPropertyAnalysis<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  "arrow",
  SrcWitness,
  TgtWitness
> => {
  const detailLines: string[] = [
    "Theorem 134: pullback preservation forces preservation of monomorphisms.",
  ];
  if (!evidence) {
    detailLines.push(
      "No pullback-preservation evidence supplied; monomorphism results are advisory only.",
    );
  } else {
    const spanCount = evidence.spans?.length ?? 0;
    detailLines.push(
      spanCount > 0
        ? `Pullback preservation witnessed on ${spanCount} span${spanCount === 1 ? "" : "s"}.`
        : "Pullback preservation witness provided without explicit spans.",
    );
    if (evidence.details) {
      detailLines.push(...evidence.details);
    }
    if (evidence.spans && evidence.source) {
      detailLines.push(
        ...evidence.spans.map((span) => spanSummary(evidence.source!, span)),
      );
    }
  }
  const oracle = makeMonomorphismPreservationOracle(
    sourceEvaluate,
    targetEvaluate,
    detailLines,
    samples,
  );
  return evaluateFunctorProperty(functor, oracle);
};

export interface EpimorphismImplicationOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
> {
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly sourceEvaluate: (
    category: SimpleCat<SrcObj, SrcArr>,
    arrow: SrcArr,
  ) => CategoryPropertyCheck<SrcWitness>;
  readonly targetEvaluate: (
    category: SimpleCat<TgtObj, TgtArr>,
    arrow: TgtArr,
  ) => CategoryPropertyCheck<TgtWitness>;
  readonly evidence?: PushoutPreservationEvidence<SrcObj, SrcArr>;
  readonly samples?: ReadonlyArray<ArrowPropertySample<SrcArr>>;
}

export const preservesPushoutsImpliesEpimorphisms = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness,
>({
  functor,
  sourceEvaluate,
  targetEvaluate,
  evidence,
  samples,
}: EpimorphismImplicationOptions<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  SrcWitness,
  TgtWitness
>): FunctorPropertyAnalysis<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  "arrow",
  SrcWitness,
  TgtWitness
> => {
  const detailLines: string[] = [
    "Theorem 134: pushout preservation forces preservation of epimorphisms.",
  ];
  if (!evidence) {
    detailLines.push(
      "No pushout-preservation evidence supplied; epimorphism results are advisory only.",
    );
  } else {
    const cospanCount = evidence.cospans?.length ?? 0;
    detailLines.push(
      cospanCount > 0
        ? `Pushout preservation witnessed on ${cospanCount} cospan${cospanCount === 1 ? "" : "s"}.`
        : "Pushout preservation witness provided without explicit cospans.",
    );
    if (evidence.details) {
      detailLines.push(...evidence.details);
    }
    if (evidence.cospans && evidence.source) {
      detailLines.push(
        ...evidence.cospans.map((cospan) => cospanSummary(evidence.source!, cospan)),
      );
    }
  }
  const oracle = makeEpimorphismPreservationOracle(
    sourceEvaluate,
    targetEvaluate,
    detailLines,
    samples,
  );
  return evaluateFunctorProperty(functor, oracle);
};

