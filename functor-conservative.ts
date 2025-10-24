import type { FunctorWithWitness } from "./functor";
import type { IsoWitness } from "./kinds/iso";
import type { SimpleCat } from "./simple-cat";
import type { ArrowPropertySample } from "./functor-property-types";
import { checkIsomorphism, describeArrow, type IsomorphismCheckers } from "./functor-isomorphism";

export interface ConservativityFailure<SrcObj, SrcArr, TgtArr> {
  readonly arrow: SrcArr;
  readonly image: TgtArr;
  readonly witness: IsoWitness<TgtArr>;
  readonly reason: string;
  readonly notes?: ReadonlyArray<string>;
}

export interface ConservativityReport<SrcObj, SrcArr, TgtArr> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<ConservativityFailure<SrcObj, SrcArr, TgtArr>>;
  readonly inspectedArrows: number;
  readonly details: ReadonlyArray<string>;
}

export interface ConservativityOptions<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly samples?: ReadonlyArray<ArrowPropertySample<SrcArr>>;
  readonly checkers?: IsomorphismCheckers<SrcObj, SrcArr, TgtObj, TgtArr>;
}

const ensureArrowSamples = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  samples?: ReadonlyArray<ArrowPropertySample<SrcArr>>,
): ReadonlyArray<ArrowPropertySample<SrcArr>> => {
  if (samples) return samples;
  return functor.witness.arrowGenerators.map<ArrowPropertySample<SrcArr>>((arrow) => ({
    kind: "arrow",
    arrow,
  }));
};

export const isConservativeFunctor = <SrcObj, SrcArr, TgtObj, TgtArr>(
  functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>,
  options: ConservativityOptions<SrcObj, SrcArr, TgtObj, TgtArr> = {},
): ConservativityReport<SrcObj, SrcArr, TgtArr> => {
  const sourceEvaluate =
    options.checkers?.source ??
    ((category: SimpleCat<SrcObj, SrcArr>, arrow: SrcArr) =>
      checkIsomorphism(category, arrow));
  const targetEvaluate =
    options.checkers?.target ??
    ((category: SimpleCat<TgtObj, TgtArr>, arrow: TgtArr) =>
      checkIsomorphism(category, arrow));

  const samples = ensureArrowSamples(functor, options.samples);
  const failures: ConservativityFailure<SrcObj, SrcArr, TgtArr>[] = [];
  let inspectedArrows = 0;

  for (const sample of samples) {
    if (sample.kind !== "arrow") {
      continue;
    }
    const targetResult = targetEvaluate(
      functor.witness.target,
      functor.functor.F1(sample.arrow),
    );
    if (!targetResult.holds || !targetResult.witness) {
      continue;
    }
    inspectedArrows += 1;
    const sourceResult = sourceEvaluate(functor.witness.source, sample.arrow);
    if (sourceResult.holds) {
      continue;
    }
    const notes: string[] = [];
    if (targetResult.details) {
      notes.push(`Target witness: ${targetResult.details}`);
    }
    if (sourceResult.details) {
      notes.push(`Source failure: ${sourceResult.details}`);
    }
    failures.push({
      arrow: sample.arrow,
      image: functor.functor.F1(sample.arrow),
      witness: targetResult.witness,
      reason: `${describeArrow(
        functor.witness.target,
        functor.functor.F1(sample.arrow),
      )} is invertible while ${describeArrow(
        functor.witness.source,
        sample.arrow,
      )} is not.`,
      ...(notes.length > 0 ? { notes } : {}),
    });
  }

  const holds = failures.length === 0;
  const details: string[] = [];
  details.push(
    `Surveyed ${samples.length} arrow sample${samples.length === 1 ? "" : "s"} for conservativity.`,
  );
  details.push(
    inspectedArrows === 0
      ? "No image arrows were certified as isomorphisms; conservativity could not be challenged."
      : holds
      ? `All ${inspectedArrows} image isomorphism${inspectedArrows === 1 ? "" : "s"} lifted to source isomorphisms.`
      : `${failures.length} image isomorphism${failures.length === 1 ? "" : "s"} lacked matching source inverses.`,
  );

  return { holds, failures, inspectedArrows, details };
};

