import type { Dist } from "./dist";
import { bind, map } from "./dist";
import type { CSRig } from "./semiring-utils";
import {
  FinMarkov,
  tensorObj,
  pair,
  IFin,
  ProbabilityWeightRig,
} from "./markov-category";
import type { Fin } from "./markov-category";
import type {
  CountabilityWitness,
  InfObj,
  KernelR,
  CylinderSection,
  FiniteSubset,
  ProjectiveFamily,
  MeasurabilityWitness,
  DeterministicKolmogorovProductWitness,
  PositivityWitness,
  DeterministicKolmogorovFactorization,
  DeterministicComponent,
  DeterministicKolmogorovFactorizationFailure,
  DeterministicProductComponentInput,
  DeterministicMediatorCandidate,
  KolmogorovZeroOneLawWitness,
  HewittSavageZeroOneLawWitness,
} from "./markov-infinite";
import {
  applyPatch,
  checkKolmogorovConsistency,
  deterministicBooleanValue,
  equalDist,
  isCountableIndex,
  hasMeasurabilityWitness,
  isStandardBorelFamily,
  kolmogorovExtensionMeasure,
} from "./markov-infinite";
import {
  buildMarkovComonoidWitness,
  type MarkovComonoidWitness,
} from "./markov-comonoid-structure";
import {
  buildMarkovPositivityWitness,
  checkDeterministicTensorViaMarginals,
  checkDeterminismLemma,
  type TensorMarginalDeterminismReport,
  type DeterminismLemmaReport,
  type DeterminismLemmaOptions,
} from "./markov-deterministic-structure";
import {
  checkConditionalIndependence,
  type MarkovConditionalReport,
} from "./markov-conditional-independence";
import { probabilityLegacyToRigged } from "./probability-monads";

const sectionsEqual = <J, X>(
  left: CylinderSection<J, X>,
  right: CylinderSection<J, X>
): boolean => {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) {
    if (!right.has(key)) return false;
    if (right.get(key) !== value) return false;
  }
  return true;
};

const aggregateCylinderDist = <R, J, X>(
  R: CSRig<R>,
  dist: Dist<R, CylinderSection<J, X>>
): Dist<R, CylinderSection<J, X>> => {
  const entries: Array<{ section: CylinderSection<J, X>; weight: R }> = [];
  dist.w.forEach((weight, section) => {
    const existing = entries.find((candidate) => sectionsEqual(candidate.section, section));
    if (existing) {
      existing.weight = R.add(existing.weight, weight);
    } else {
      entries.push({ section, weight });
    }
  });

  const merged: Dist<R, CylinderSection<J, X>> = { R, w: new Map() };
  for (const entry of entries) {
    merged.w.set(entry.section, entry.weight);
  }
  return merged;
};

const defaultIsZero = <R>(R: CSRig<R>) => R.isZero ?? ((a: R) => R.eq(a, R.zero));

const terminalComonoidWitness = buildMarkovComonoidWitness(IFin, { label: "tensor unit" });

const describeSubset = <J>(subset: FiniteSubset<J>): string =>
  subset.length === 0 ? "∅" : subset.map((index) => String(index)).join(", ");

export interface TailInvarianceResult<J, Carrier> {
  readonly ok: boolean;
  readonly counterexamples: Array<{ original: Carrier; modified: Carrier }>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

export function checkTailEventInvariance<R, J, X, Carrier>(
  obj: InfObj<R, J, X, Carrier>,
  tailEvent: KernelR<R, Carrier, boolean>,
  samples: ReadonlyArray<Carrier>,
  patches: ReadonlyArray<CylinderSection<J, X>>
): TailInvarianceResult<J, Carrier> {
  const counterexamples: Array<{ original: Carrier; modified: Carrier }> = [];
  const { family } = obj;
  const R = family.semiring;

  for (const sample of samples) {
    const base = deterministicBooleanValue(R, tailEvent(sample));
    for (const patch of patches) {
      const modified = applyPatch(family, sample, patch);
      const value = deterministicBooleanValue(R, tailEvent(modified));
      if (value !== base) {
        counterexamples.push({ original: sample, modified });
      }
    }
  }

  return {
    ok: counterexamples.length === 0,
    counterexamples,
    countable: isCountableIndex(family),
    ...(family.countability && { witness: family.countability }),
    measurable: hasMeasurabilityWitness(family),
    ...(family.measurability && { measurability: family.measurability }),
    standardBorel: isStandardBorelFamily(family),
  };
}

export interface KolmogorovConsistencyResult<J> {
  readonly ok: boolean;
  readonly failures: ReadonlyArray<{ finite: FiniteSubset<J>; larger: FiniteSubset<J> }>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

export function runKolmogorovConsistency<R, J, X, Carrier>(
  family: ProjectiveFamily<R, J, X, Carrier>,
  tests: ReadonlyArray<{ finite: FiniteSubset<J>; larger: FiniteSubset<J> }>
): KolmogorovConsistencyResult<J> {
  const summary = checkKolmogorovConsistency(family, tests);
  return {
    ok: summary.ok,
    failures: summary.failures,
    countable: summary.countable,
    ...(summary.witness && { witness: summary.witness }),
    measurable: summary.measurable,
    ...(summary.measurability && { measurability: summary.measurability }),
    standardBorel: summary.standardBorel,
  };
}

export interface ZeroOneWitness<R, J> {
  readonly ok: boolean;
  readonly probability: R;
  readonly support: Dist<R, boolean>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

export interface TailSigmaSectionReport<R, J, X> {
  readonly section: CylinderSection<J, X>;
  readonly probability: R;
  readonly tailAndSection: R;
  readonly product: R;
  readonly ok: boolean;
}

export interface TailSigmaSubsetReport<R, J, X> {
  readonly subset: FiniteSubset<J>;
  readonly ok: boolean;
  readonly tailProbability: R;
  readonly sections: ReadonlyArray<TailSigmaSectionReport<R, J, X>>;
  readonly errors: ReadonlyArray<string>;
}

export interface TailSigmaIndependenceResult<R, J, X> {
  readonly ok: boolean;
  readonly tailProbability: R;
  readonly subsets: ReadonlyArray<TailSigmaSubsetReport<R, J, X>>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

const getOrCreateSectionReport = <R, J, X>(
  R: CSRig<R>,
  sections: Array<{ section: CylinderSection<J, X>; probability: R; tailAndSection: R }>,
  section: CylinderSection<J, X>
) => {
  const existing = sections.find((candidate) => sectionsEqual(candidate.section, section));
  if (existing) return existing;
  const fresh = {
    section,
    probability: R.zero,
    tailAndSection: R.zero,
  };
  sections.push(fresh);
  return fresh;
};

export function checkTailSigmaIndependence<R, J, X, Carrier>(
  obj: InfObj<R, J, X, Carrier>,
  measure: Dist<R, Carrier>,
  tailEvent: KernelR<R, Carrier, boolean>,
  subsets: ReadonlyArray<FiniteSubset<J>>
): TailSigmaIndependenceResult<R, J, X> {
  const R = obj.family.semiring;
  if (measure.R !== R) {
    throw new Error("Measure semiring does not match projective family semiring");
  }

  const isZero = defaultIsZero(R);
  const support = bind(measure, tailEvent);
  const tailProbability = support.w.get(true) ?? R.zero;

  const subsetReports = subsets.map((subset) => {
    const sectionReports: Array<{ section: CylinderSection<J, X>; probability: R; tailAndSection: R }> = [];
    const errors: string[] = [];

    measure.w.forEach((weight, carrier) => {
      if (isZero(weight)) return;

      let tailValue: boolean;
      try {
        tailValue = deterministicBooleanValue(R, tailEvent(carrier));
      } catch (error) {
        errors.push(
          `Tail event not deterministic on subset {${describeSubset(subset)}}: ${(error as Error).message}`
        );
        return;
      }

      const projection = aggregateCylinderDist(R, obj.projectKernel(subset)(carrier));
      let sawSupport = false;
      projection.w.forEach((sectionWeight, section) => {
        if (isZero(sectionWeight)) return;
        sawSupport = true;
        const entry = getOrCreateSectionReport(R, sectionReports, section);
        const contribution = R.mul(weight, sectionWeight);
        entry.probability = R.add(entry.probability, contribution);
        if (tailValue) {
          entry.tailAndSection = R.add(entry.tailAndSection, contribution);
        }
      });

      if (!sawSupport) {
        errors.push(`Projection onto subset {${describeSubset(subset)}} returned zero support.`);
      }
    });

    const sections: TailSigmaSectionReport<R, J, X>[] = sectionReports.map((entry) => {
      const product = R.mul(tailProbability, entry.probability);
      return {
        section: entry.section,
        probability: entry.probability,
        tailAndSection: entry.tailAndSection,
        product,
        ok: R.eq(entry.tailAndSection, product),
      };
    });

    const subsetOk = errors.length === 0 && sections.every((section) => section.ok);
    return {
      subset,
      ok: subsetOk,
      tailProbability,
      sections,
      errors,
    };
  });

  return {
    ok: subsetReports.every((report) => report.ok),
    tailProbability,
    subsets: subsetReports,
    countable: isCountableIndex(obj.family),
    ...(obj.family.countability && { witness: obj.family.countability }),
    measurable: hasMeasurabilityWitness(obj.family),
    ...(obj.family.measurability && { measurability: obj.family.measurability }),
    standardBorel: isStandardBorelFamily(obj.family),
  };
}

export function kolmogorovZeroOneWitness<R, J, X, Carrier>(
  obj: InfObj<R, J, X, Carrier>,
  measure: Dist<R, Carrier>,
  tailEvent: KernelR<R, Carrier, boolean>
): ZeroOneWitness<R, J> {
  const R = obj.family.semiring;
  if (measure.R !== R) {
    throw new Error("Measure semiring does not match projective family semiring");
  }

  const pushed = bind(measure, tailEvent);
  const probTrue = pushed.w.get(true) ?? R.zero;
  const probFalse = pushed.w.get(false) ?? R.zero;
  const isZero = defaultIsZero(R);
  const zeroOrOne = R.eq(probTrue, R.one) || isZero(probTrue) || R.eq(probFalse, R.one) || isZero(probFalse);

  return {
    ok: zeroOrOne,
    probability: probTrue,
    support: pushed,
    countable: isCountableIndex(obj.family),
    ...(obj.family.countability && { witness: obj.family.countability }),
    measurable: hasMeasurabilityWitness(obj.family),
    ...(obj.family.measurability && { measurability: obj.family.measurability }),
    standardBorel: isStandardBorelFamily(obj.family),
  };
}

export interface KolmogorovZeroOneLawOptions<A, J> {
  readonly subsets?: ReadonlyArray<FiniteSubset<J>>;
  readonly samples?: ReadonlyArray<A>;
  readonly independencePermutations?: ReadonlyArray<ReadonlyArray<number>>;
  readonly tailConditionalPermutations?: ReadonlyArray<ReadonlyArray<number>>;
  readonly lemma?: DeterminismLemmaOptions<A>;
  readonly universalSubset?: FiniteSubset<J>;
  readonly partitions?: ReadonlyArray<FiniteSubset<J>>;
  readonly candidateLabel?: string;
}

export interface KolmogorovZeroOneLawResult<R, A, J, X, Carrier, XDet, Tail> {
  readonly ok: boolean;
  readonly zeroOne: ZeroOneWitness<R, J>;
  readonly tail: TailSigmaIndependenceResult<R, J, X>;
  readonly independence?: MarkovConditionalReport<A>;
  readonly tailConditional?: MarkovConditionalReport<A>;
  readonly determinism?: DeterminismLemmaReport<A, XDet, Tail>;
  readonly universal?: DeterministicProductUniversalPropertyResult<R, A, J, X, Carrier>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

export function checkKolmogorovZeroOneLaw<R, A, J, X, Carrier, XDet = unknown, Tail = unknown>(
  witness: KolmogorovZeroOneLawWitness<R, A, J, X, Carrier, XDet, Tail>,
  options: KolmogorovZeroOneLawOptions<A, J> = {},
): KolmogorovZeroOneLawResult<R, A, J, X, Carrier, XDet, Tail> {
  const subsets = options.subsets ?? [];
  const tail = checkTailSigmaIndependence(witness.product.infObj, witness.measure, witness.tailEvent, subsets);
  const zeroOne = kolmogorovZeroOneWitness(witness.product.infObj, witness.measure, witness.tailEvent);

  const independence = witness.independence
    ? checkConditionalIndependence(
        witness.independence,
        options.independencePermutations ? { permutations: options.independencePermutations } : {},
      )
    : undefined;

  const tailConditional = witness.tailConditional
    ? checkConditionalIndependence(
        witness.tailConditional,
        options.tailConditionalPermutations ? { permutations: options.tailConditionalPermutations } : {},
      )
    : undefined;

  const determinism = witness.determinismLemma
    ? checkDeterminismLemma(witness.determinismLemma, options.lemma)
    : undefined;

  let universal: DeterministicProductUniversalPropertyResult<R, A, J, X, Carrier> | undefined;
  const components = witness.components ?? [];
  if (witness.mediator && components.length > 0) {
    const inferredSubset = components.map((component) => component.index) as FiniteSubset<J>;
    const subset = options.universalSubset ?? (inferredSubset.length > 0 ? inferredSubset : subsets[0] ?? ([] as FiniteSubset<J>));
    const universalOptions: DeterministicProductUniversalPropertyOptions<R, A, J, X, Carrier> = {
      domain: witness.domain,
      components,
      samples: options.samples ?? witness.domain.object.elems,
      ...(options.partitions && { partitions: options.partitions }),
      ...(options.candidateLabel && { label: options.candidateLabel }),
    };
    universal = checkDeterministicProductUniversalProperty(witness.product, witness.mediator, subset, universalOptions);
  }

  const ok =
    tail.ok &&
    zeroOne.ok &&
    (independence?.holds ?? true) &&
    (tailConditional?.holds ?? true) &&
    (determinism?.holds ?? true) &&
    (universal?.ok ?? true);

  return {
    ok,
    zeroOne,
    tail,
    ...(independence && { independence }),
    ...(tailConditional && { tailConditional }),
    ...(determinism && { determinism }),
    ...(universal && { universal }),
    countable: tail.countable,
    ...(tail.witness && { witness: tail.witness }),
    measurable: tail.measurable,
    ...(tail.measurability && { measurability: tail.measurability }),
    standardBorel: tail.standardBorel,
  };
}

export interface ExchangeabilityResult<R, J, Carrier> {
  readonly ok: boolean;
  readonly exchangeable: boolean;
  readonly invariant: boolean;
  readonly probability: R;
  readonly support: Dist<R, boolean>;
  readonly counterexamples: Array<{ original: Carrier; permuted: Carrier }>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

export type HewittSavageZeroOneLawOptions<A, J> = KolmogorovZeroOneLawOptions<A, J>;

export interface HewittSavageZeroOneLawResult<R, A, J, X, Carrier, XDet, Tail>
  extends KolmogorovZeroOneLawResult<R, A, J, X, Carrier, XDet, Tail> {
  readonly exchangeability: ExchangeabilityResult<R, J, Carrier>;
}

export function checkHewittSavageZeroOneLaw<R, A, J, X, Carrier, XDet = unknown, Tail = unknown>(
  witness: HewittSavageZeroOneLawWitness<R, A, J, X, Carrier, XDet, Tail>,
  options: HewittSavageZeroOneLawOptions<A, J> = {},
): HewittSavageZeroOneLawResult<R, A, J, X, Carrier, XDet, Tail> {
  const base = checkKolmogorovZeroOneLaw<R, A, J, X, Carrier, XDet, Tail>(witness, options);
  const exchangeability = hewittSavageZeroOneWitness(
    witness.product.infObj,
    witness.measure,
    witness.tailEvent,
    witness.permutations,
  );
  const ok = base.ok && exchangeability.ok;
  return { ...base, ok, exchangeability };
}

export interface FiniteReductionResult<R, J, X> {
  readonly ok: boolean;
  readonly expected: Dist<R, CylinderSection<J, X>>;
  readonly actual: Dist<R, CylinderSection<J, X>>;
}

export function checkFiniteProductReduction<R, J, X, Carrier>(
  obj: InfObj<R, J, X, Carrier>,
  measure: Dist<R, Carrier>,
  subset: FiniteSubset<J>
): FiniteReductionResult<R, J, X> {
  const R = obj.family.semiring;
  if (measure.R !== R) {
    throw new Error("Measure semiring does not match projective family semiring");
  }

  const expectedRaw = obj.family.marginal(subset);
  const actualRaw = bind(measure, obj.projectKernel(subset));
  const expected = aggregateCylinderDist(R, expectedRaw);
  const actual = aggregateCylinderDist(R, actualRaw);
  const ok = equalDist(R, expected, actual);

  return { ok, expected, actual };
}

export interface CopyDiscardFailure<R, J, X, Carrier> {
  readonly sample: Carrier;
  readonly subset: FiniteSubset<J>;
  readonly direct: Dist<R, CylinderSection<J, X>>;
  readonly viaCopy: Dist<R, CylinderSection<J, X>>;
}

export interface CopyDiscardCompatibilityResult<R, J, X, Carrier> {
  readonly ok: boolean;
  readonly failures: ReadonlyArray<CopyDiscardFailure<R, J, X, Carrier>>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

export function checkCopyDiscardCompatibility<R, J, X, Carrier>(
  obj: InfObj<R, J, X, Carrier>,
  subsets: ReadonlyArray<FiniteSubset<J>>,
  samples: ReadonlyArray<Carrier>
): CopyDiscardCompatibilityResult<R, J, X, Carrier> {
  const failures: Array<CopyDiscardFailure<R, J, X, Carrier>> = [];
  const R = obj.family.semiring;

  for (const sample of samples) {
    for (const subset of subsets) {
      const direct = obj.projectKernel(subset)(sample);
      const viaCopy = bind(obj.copy(sample), ([left, right]) =>
        bind(obj.discard(left), () => obj.projectKernel(subset)(right))
      );

      if (!equalDist(R, direct, viaCopy)) {
        failures.push({ sample, subset, direct, viaCopy });
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    countable: isCountableIndex(obj.family),
    ...(obj.family.countability && { witness: obj.family.countability }),
    measurable: hasMeasurabilityWitness(obj.family),
    ...(obj.family.measurability && { measurability: obj.family.measurability }),
    standardBorel: isStandardBorelFamily(obj.family),
  };
}

export interface DeterministicComponentDeterminismReport<A, J, X> {
  readonly index: J;
  readonly label?: string;
  readonly report: TensorMarginalDeterminismReport<A, X, {}>;
  readonly ok: boolean;
}

export interface DeterministicMediatorMismatch<A, J, X, Carrier> {
  readonly input: A;
  readonly subset: FiniteSubset<J>;
  readonly expected: { carrier: Carrier; section: CylinderSection<J, X> };
  readonly actual: { carrier: Carrier; section: CylinderSection<J, X> };
}

export interface DeterministicProductPartitionReport<R, A, J, X, Carrier> {
  readonly subset: FiniteSubset<J>;
  readonly factorization: DeterministicKolmogorovFactorization<R, A, J, X, Carrier>;
  readonly mismatches: ReadonlyArray<DeterministicMediatorMismatch<A, J, X, Carrier>>;
  readonly ok: boolean;
  readonly details: string;
}

export interface DeterministicProductUniversalPropertyOptions<R, A, J, X, Carrier> {
  readonly domain: MarkovComonoidWitness<A>;
  readonly components: ReadonlyArray<DeterministicProductComponentInput<A, J, X>>;
  readonly samples?: ReadonlyArray<A>;
  readonly alternate?: DeterministicMediatorCandidate<R, A, Carrier>;
  readonly partitions?: ReadonlyArray<FiniteSubset<J>>;
  readonly label?: string;
}

export interface DeterministicProductUniversalPropertyResult<R, A, J, X, Carrier> {
  readonly ok: boolean;
  readonly subset: FiniteSubset<J>;
  readonly components: ReadonlyArray<DeterministicComponentDeterminismReport<A, J, X>>;
  readonly factorization: DeterministicKolmogorovFactorization<R, A, J, X, Carrier>;
  readonly mediatorAgreement: boolean;
  readonly mismatches: ReadonlyArray<DeterministicMediatorMismatch<A, J, X, Carrier>>;
  readonly uniqueness?: {
    readonly ok: boolean;
    readonly mismatches: ReadonlyArray<DeterministicMediatorMismatch<A, J, X, Carrier>>;
    readonly label?: string;
  };
  readonly partitions?: ReadonlyArray<DeterministicProductPartitionReport<R, A, J, X, Carrier>>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
  readonly positive: boolean;
  readonly positivity?: PositivityWitness<J>;
  readonly details: string;
  readonly candidateLabel?: string;
}

const ensureDeterministicBase = <A, X>(arrow: FinMarkov<A, X>, label: string): ((input: A) => X) => {
  const codomain = arrow.Y;
  const isZero =
    ProbabilityWeightRig.isZero ?? ((weight: number) => ProbabilityWeightRig.eq(weight, ProbabilityWeightRig.zero));
  return (input: A) => {
    const legacy = arrow.k(input);
    const dist = probabilityLegacyToRigged(legacy);
    let support: X | undefined;
    dist.w.forEach((weight, outcome) => {
      if (isZero(weight)) {
        return;
      }
      if (support === undefined) {
        support = outcome;
        return;
      }
      if (!codomain.eq(support, outcome)) {
        throw new Error(
          `Deterministic base extraction for ${label} found multiple outcomes with non-zero support.`
        );
      }
    });
    if (support !== undefined) {
      return support;
    }
    const entries = Array.from(legacy.keys());
    if (entries.length === 1) {
      return entries[0]!;
    }
    throw new Error(`Deterministic base extraction for ${label} produced no support.`);
  };
};

export function checkDeterministicProductUniversalProperty<R, A, J, X, Carrier>(
  witness: DeterministicKolmogorovProductWitness<R, J, X, Carrier>,
  candidate: DeterministicMediatorCandidate<R, A, Carrier>,
  subset: FiniteSubset<J>,
  options: DeterministicProductUniversalPropertyOptions<R, A, J, X, Carrier>,
): DeterministicProductUniversalPropertyResult<R, A, J, X, Carrier> {
  const { infObj } = witness;
  const { family } = infObj;
  const { domain, components, samples: providedSamples, alternate, partitions } = options;

  if (!candidate.base) {
    throw new Error("Deterministic mediator candidate must supply a base function.");
  }

  const samples = providedSamples ?? domain.object.elems;
  const componentReports: DeterministicComponentDeterminismReport<A, J, X>[] = [];
  const componentBases = new Map<J, (input: A) => X>();
  const duplicateFailures: DeterministicKolmogorovFactorizationFailure<J>[] = [];

  for (const component of components) {
    if (component.arrow.X !== domain.object) {
      throw new Error("Component arrow domain does not match the provided domain witness object.");
    }
    if (component.arrow.Y !== component.witness.object) {
      throw new Error("Component arrow codomain must match the supplied comonoid witness object.");
    }

    const pairObject = tensorObj(component.witness.object, terminalComonoidWitness.object);
    const tensorWitness = buildMarkovPositivityWitness(component.witness, terminalComonoidWitness, {
      tensor: buildMarkovComonoidWitness(
        pairObject,
        component.label ? { label: `${component.label} ⊗ I` } : {},
      ),
      ...(component.label && { label: `${component.label} × terminal` }),
    });
    const pairedArrow = new FinMarkov(
      domain.object,
      pairObject,
      pair(component.arrow.k, domain.discard.k),
    );
    const determinismReport = checkDeterministicTensorViaMarginals(domain, tensorWitness, pairedArrow, {
      label: component.label ?? `component ${String(component.index)}`,
    });
    const deterministicMarginal = determinismReport.left.deterministic;
    const reportEntry: DeterministicComponentDeterminismReport<A, J, X> = {
      index: component.index,
      report: determinismReport,
      ok: deterministicMarginal,
      ...(component.label && { label: component.label }),
    };
    componentReports.push(reportEntry);

    if (componentBases.has(component.index)) {
      duplicateFailures.push({
        index: component.index,
        reason: `Duplicate deterministic component provided for index ${String(component.index)}.`,
      });
      continue;
    }

    const base =
      component.base ??
      ensureDeterministicBase(component.arrow, component.label ?? `component ${String(component.index)}`);
    componentBases.set(component.index, base);
  }

  const determinismFailures = componentReports
    .filter((entry) => !entry.ok)
    .map<DeterministicKolmogorovFactorizationFailure<J>>((entry) => ({
      index: entry.index,
      reason: entry.report.left.details,
    }));

  const missingIndices = subset.filter((index) => !componentBases.has(index));
  const missingFailures = missingIndices.map<DeterministicKolmogorovFactorizationFailure<J>>((index) => ({
    index,
    reason: `No deterministic component supplied for index ${String(index)}.`,
  }));

  const preflightFailures = [...determinismFailures, ...duplicateFailures, ...missingFailures];

  let factorization: DeterministicKolmogorovFactorization<R, A, J, X, Carrier>;
  if (preflightFailures.length === 0) {
    const factorInputs = subset.map((index) => ({ index, base: componentBases.get(index)! }));
    factorization = witness.factor(factorInputs);
  } else {
    factorization = {
      ok: false,
      subset,
      details: `${preflightFailures.length} component issue${preflightFailures.length === 1 ? "" : "s"} prevented deterministic factorization.`,
      failures: preflightFailures,
    };
  }

  const candidateBase = candidate.base;
  const mismatches: DeterministicMediatorMismatch<A, J, X, Carrier>[] = [];

  if (factorization.ok && factorization.base) {
    for (const input of samples) {
      const expectedCarrier = factorization.base(input);
      const actualCarrier = candidateBase(input);
      const expectedSection = family.project(expectedCarrier, subset);
      const actualSection = family.project(actualCarrier, subset);
      if (!sectionsEqual(expectedSection, actualSection)) {
        mismatches.push({
          input,
          subset: [...subset] as FiniteSubset<J>,
          expected: { carrier: expectedCarrier, section: expectedSection },
          actual: { carrier: actualCarrier, section: actualSection },
        });
      }
    }
  }

  const mediatorAgreement = factorization.ok && factorization.base !== undefined && mismatches.length === 0;

  let uniqueness:
    | DeterministicProductUniversalPropertyResult<R, A, J, X, Carrier>["uniqueness"]
    | undefined;

  if (alternate) {
    if (!alternate.base) {
      throw new Error("Alternate mediator candidate must supply a base function.");
    }
    const uniquenessMismatches: DeterministicMediatorMismatch<A, J, X, Carrier>[] = [];
    for (const input of samples) {
      const primaryCarrier = candidateBase(input);
      const alternateCarrier = alternate.base(input);
      const primarySection = family.project(primaryCarrier, subset);
      const alternateSection = family.project(alternateCarrier, subset);
      if (!sectionsEqual(primarySection, alternateSection)) {
        uniquenessMismatches.push({
          input,
          subset: [...subset] as FiniteSubset<J>,
          expected: { carrier: primaryCarrier, section: primarySection },
          actual: { carrier: alternateCarrier, section: alternateSection },
        });
      }
    }
    uniqueness = {
      ok: uniquenessMismatches.length === 0,
      mismatches: uniquenessMismatches,
      ...(alternate.label && { label: alternate.label }),
    };
  }

  const partitionReports: DeterministicProductPartitionReport<R, A, J, X, Carrier>[] = [];
  if (partitions) {
    for (const block of partitions) {
      const blockMissing = block.filter((index) => !componentBases.has(index));
      const blockFailures = blockMissing.map<DeterministicKolmogorovFactorizationFailure<J>>((index) => ({
        index,
        reason: `No deterministic component supplied for index ${String(index)} in partition subset.`,
      }));

      let blockWitness: DeterministicKolmogorovProductWitness<R, J, X, Carrier> | undefined;
      let blockFactorization: DeterministicKolmogorovFactorization<R, A, J, X, Carrier>;

      if (blockFailures.length === 0) {
        blockWitness = witness.restrict(block);
        const blockInputs = block.map((index) => ({ index, base: componentBases.get(index)! }));
        blockFactorization = blockWitness.factor(blockInputs);
      } else {
        blockFactorization = {
          ok: false,
          subset: block,
          details: `${blockFailures.length} component issue${blockFailures.length === 1 ? "" : "s"} prevented factorization on the partition subset.`,
          failures: blockFailures,
        };
      }

      const blockMismatches: DeterministicMediatorMismatch<A, J, X, Carrier>[] = [];
      if (blockFactorization.ok && blockFactorization.base && blockWitness) {
        for (const input of samples) {
          const expectedCarrier = blockFactorization.base(input);
          const actualCarrier = candidateBase(input);
          const expectedSection = blockWitness.infObj.family.project(expectedCarrier, block);
          const actualSection = blockWitness.infObj.family.project(actualCarrier, block);
          if (!sectionsEqual(expectedSection, actualSection)) {
            blockMismatches.push({
              input,
              subset: [...block] as FiniteSubset<J>,
              expected: { carrier: expectedCarrier, section: expectedSection },
              actual: { carrier: actualCarrier, section: actualSection },
            });
          }
        }
      }

      const blockOk = blockFactorization.ok && blockFactorization.base !== undefined && blockMismatches.length === 0;
      const blockDetails = blockFactorization.ok
        ? blockOk
          ? `Candidate agrees with deterministic mediator on subset {${describeSubset(block)}}.`
          : `${blockMismatches.length} mediator mismatch${blockMismatches.length === 1 ? "" : "es"} detected on subset {${describeSubset(block)}}.`
        : blockFactorization.details;

      partitionReports.push({
        subset: block,
        factorization: blockFactorization,
        mismatches: blockMismatches,
        ok: blockOk,
        details: blockDetails,
      });
    }
  }

  const componentsOk = componentReports.every((entry) => entry.ok);
  const factorOk = factorization.ok && factorization.base !== undefined;
  const uniquenessOk = uniqueness ? uniqueness.ok : true;
  const partitionsOk = partitionReports.every((report) => report.ok);

  const countable = isCountableIndex(family);
  const measurable = hasMeasurabilityWitness(family);
  const standardBorel = isStandardBorelFamily(family);
  const positivity = infObj.positivity ?? family.positivity;
  const positive = positivity?.kind === "positive";

  const ok = componentsOk && factorOk && mediatorAgreement && uniquenessOk && partitionsOk;

  const failureReasons: string[] = [];
  if (!componentsOk) {
    failureReasons.push(`${componentReports.filter((entry) => !entry.ok).length} component determinism check${componentReports.filter((entry) => !entry.ok).length === 1 ? "" : "s"} failed`);
  }
  if (!factorOk) {
    failureReasons.push("factorization did not produce a deterministic mediator");
  }
  if (factorOk && !mediatorAgreement) {
    failureReasons.push(`${mismatches.length} mediator mismatch${mismatches.length === 1 ? "" : "es"}`);
  }
  if (!uniquenessOk) {
    const count = uniqueness?.mismatches.length ?? 0;
    failureReasons.push(`${count} uniqueness mismatch${count === 1 ? "" : "es"}`);
  }
  if (!partitionsOk) {
    failureReasons.push(`${partitionReports.filter((report) => !report.ok).length} partition check${partitionReports.filter((report) => !report.ok).length === 1 ? "" : "s"} failed`);
  }

  const details = ok
    ? `Deterministic mediator ${candidate.label ?? "candidate"} factors uniquely through indices {${describeSubset(subset)}}.`
    : failureReasons.join("; ") || "Deterministic product universal property failed.";

  return {
    ok,
    subset,
    components: componentReports,
    factorization,
    mediatorAgreement,
    mismatches,
    ...(uniqueness && { uniqueness }),
    ...(partitions && { partitions: partitionReports }),
    countable,
    ...(family.countability && { witness: family.countability }),
    measurable,
    ...(family.measurability && { measurability: family.measurability }),
    standardBorel,
    positive,
    ...(positivity && { positivity }),
    details,
    ...(candidate.label && { candidateLabel: candidate.label }),
  };
}

export interface MarginalDeterminismFailure<R, J, X, Carrier> {
  readonly subset: FiniteSubset<J>;
  readonly sample: Carrier;
  readonly distribution: Dist<R, CylinderSection<J, X>>;
}

export interface KolmogorovProductResult<R, J, X, Carrier> {
  readonly ok: boolean;
  readonly deterministic: boolean;
  readonly determinismFailures: ReadonlyArray<MarginalDeterminismFailure<R, J, X, Carrier>>;
  readonly copyDiscard: CopyDiscardCompatibilityResult<R, J, X, Carrier>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

export function checkKolmogorovProduct<R, J, X, Carrier>(
  obj: InfObj<R, J, X, Carrier>,
  subsets: ReadonlyArray<FiniteSubset<J>>,
  samples: ReadonlyArray<Carrier>
): KolmogorovProductResult<R, J, X, Carrier> {
  const copyDiscard = checkCopyDiscardCompatibility(obj, subsets, samples);
  const failures: Array<MarginalDeterminismFailure<R, J, X, Carrier>> = [];
  const { semiring: R } = obj.family;
  const isZero = defaultIsZero(R);

  const positivity = obj.positivity ?? obj.family.positivity;
  const collectSingletons = (): ReadonlyArray<FiniteSubset<J>> => {
    const seen = new Set<J>();
    const ordered: J[] = [];
    const add = (index: J) => {
      if (!seen.has(index)) {
        seen.add(index);
        ordered.push(index);
      }
    };

    if (positivity?.indices) {
      for (const index of positivity.indices) add(index);
    }
    for (const subset of subsets) {
      for (const index of subset) add(index);
    }
    if (ordered.length === 0) {
      let count = 0;
      const POSITIVITY_INDEX_LIMIT = 256;
      for (const index of obj.family.index) {
        add(index);
        count += 1;
        if (count >= POSITIVITY_INDEX_LIMIT) break;
      }
    }
    return ordered.map((index) => [index]);
  };

  const deterministicSubsets =
    positivity?.kind === "positive" ? collectSingletons() : subsets;

  for (const sample of samples) {
    for (const subset of deterministicSubsets) {
      const projection = obj.projectKernel(subset)(sample);
      let support = 0;
      projection.w.forEach((weight) => {
        if (!isZero(weight)) {
          support += 1;
        }
      });
      if (support !== 1) {
        failures.push({
          subset,
          sample,
          distribution: aggregateCylinderDist(R, projection),
        });
      }
    }
  }

  const deterministic = failures.length === 0;

  return {
    ok: deterministic && copyDiscard.ok,
    deterministic,
    determinismFailures: failures,
    copyDiscard,
    countable: copyDiscard.countable,
    ...(copyDiscard.witness && { witness: copyDiscard.witness }),
    measurable: copyDiscard.measurable,
    ...(copyDiscard.measurability && { measurability: copyDiscard.measurability }),
    standardBorel: copyDiscard.standardBorel,
  };
}

export interface KolmogorovExtensionSuccess<R, J, X, Carrier> {
  readonly ok: true;
  readonly baseSubset: FiniteSubset<J>;
  readonly measure: Dist<R, Carrier>;
  readonly reductions: ReadonlyArray<FiniteReductionResult<R, J, X>>;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

export interface KolmogorovExtensionFailure<J> {
  readonly ok: false;
  readonly reason: string;
  readonly countable: boolean;
  readonly witness?: CountabilityWitness<J>;
  readonly measurable: boolean;
  readonly measurability?: MeasurabilityWitness<J>;
  readonly standardBorel: boolean;
}

export type KolmogorovExtensionResult<R, J, X, Carrier> =
  | KolmogorovExtensionSuccess<R, J, X, Carrier>
  | KolmogorovExtensionFailure<J>;

export function checkKolmogorovExtensionUniversalProperty<R, J, X, Carrier>(
  obj: InfObj<R, J, X, Carrier>,
  subsets: ReadonlyArray<FiniteSubset<J>>
): KolmogorovExtensionResult<R, J, X, Carrier> {
  const baseSubset = subsets.length === 0 ? [] : subsets.reduce<FiniteSubset<J>>((acc, subset) => {
    const seen = new Set(acc);
    const next: J[] = [...acc];
    for (const item of subset) {
      if (!seen.has(item)) {
        seen.add(item);
        next.push(item);
      }
    }
    return next;
  }, [] as J[]);

  const extension = kolmogorovExtensionMeasure(obj.family, subsets);
  const countable = isCountableIndex(obj.family);
  const measurable = hasMeasurabilityWitness(obj.family);
  const standardBorel = isStandardBorelFamily(obj.family);

  if (!extension.ok) {
    return {
      ok: false,
      reason: extension.reason,
      countable,
      ...(obj.family.countability && { witness: obj.family.countability }),
      measurable,
      ...(obj.family.measurability && { measurability: obj.family.measurability }),
      standardBorel,
    };
  }

  const { measure } = extension;
  const reductions = subsets.map((subset) => checkFiniteProductReduction(obj, measure, subset));
  const ok = reductions.every((result) => result.ok);

  if (!ok) {
    const failures = reductions.filter((result) => !result.ok).length;
    const reason =
      failures === 0
        ? "Kolmogorov extension reductions were inconclusive."
        : `${failures} reduction check${failures === 1 ? "" : "s"} failed to match the marginal.`;
    return {
      ok: false,
      reason,
      countable,
      ...(obj.family.countability && { witness: obj.family.countability }),
      measurable,
      ...(obj.family.measurability && { measurability: obj.family.measurability }),
      standardBorel,
    };
  }

  return {
    ok: true,
    baseSubset: extension.baseSubset,
    measure,
    reductions,
    countable,
    ...(obj.family.countability && { witness: obj.family.countability }),
    measurable,
    ...(obj.family.measurability && { measurability: obj.family.measurability }),
    standardBorel,
  };
}

export function hewittSavageZeroOneWitness<R, J, X, Carrier>(
  obj: InfObj<R, J, X, Carrier>,
  measure: Dist<R, Carrier>,
  tailEvent: KernelR<R, Carrier, boolean>,
  permutations: ReadonlyArray<(carrier: Carrier) => Carrier>
): ExchangeabilityResult<R, J, Carrier> {
  const R = obj.family.semiring;
  if (measure.R !== R) {
    throw new Error("Measure semiring does not match projective family semiring");
  }

  const isZero = defaultIsZero(R);
  let exchangeable = true;
  for (const perm of permutations) {
    const pushed = map(measure, perm);
    if (!equalDist(R, measure, pushed)) {
      exchangeable = false;
      break;
    }
  }

  const counterexamples: Array<{ original: Carrier; permuted: Carrier }> = [];
  let invariant = true;
  measure.w.forEach((_weight, carrier) => {
    const base = deterministicBooleanValue(R, tailEvent(carrier));
    for (const perm of permutations) {
      const permuted = perm(carrier);
      const value = deterministicBooleanValue(R, tailEvent(permuted));
      if (value !== base) {
        counterexamples.push({ original: carrier, permuted });
        invariant = false;
      }
    }
  });

  const support = bind(measure, tailEvent);
  const probTrue = support.w.get(true) ?? R.zero;
  const probFalse = support.w.get(false) ?? R.zero;
  const zeroOrOne = R.eq(probTrue, R.one) || isZero(probTrue) || R.eq(probFalse, R.one) || isZero(probFalse);

  return {
    ok: exchangeable && invariant && zeroOrOne,
    exchangeable,
    invariant,
    probability: probTrue,
    support,
    counterexamples,
    countable: isCountableIndex(obj.family),
    ...(obj.family.countability && { witness: obj.family.countability }),
    measurable: hasMeasurabilityWitness(obj.family),
    ...(obj.family.measurability && { measurability: obj.family.measurability }),
    standardBorel: isStandardBorelFamily(obj.family),
  };
}

const DEFAULT_FINSTOCH_SAMPLE_LIMIT = 512;
const DEFAULT_FINSTOCH_THRESHOLD = 32;
const MAX_FACTOR_SAMPLES = 16;

export type FinStochInfiniteTensorStatus = "ok" | "obstructed" | "likelyObstructed" | "inconclusive";

export interface FinStochFactorInfo<J> {
  readonly index: J;
  readonly label: string;
  readonly size: number;
}

export interface FinStochInfiniteTensorOptions<J> {
  readonly sampleLimit?: number;
  readonly threshold?: number;
  readonly describeIndex?: (index: J) => string;
  readonly countability?: CountabilityWitness<J>;
}

export interface FinStochInfiniteTensorResult<J> {
  readonly status: FinStochInfiniteTensorStatus;
  readonly details: string;
  readonly inspected: number;
  readonly sampleLimit: number;
  readonly exhausted: boolean;
  readonly truncated: boolean;
  readonly emptyFactors: ReadonlyArray<FinStochFactorInfo<J>>;
  readonly multiValuedFactors: ReadonlyArray<FinStochFactorInfo<J>>;
  readonly multiValuedCount: number;
  readonly countability?: CountabilityWitness<J>;
}

export function analyzeFinStochInfiniteTensor<J>(
  index: Iterable<J>,
  carrier: (index: J) => Fin<unknown>,
  options: FinStochInfiniteTensorOptions<J> = {}
): FinStochInfiniteTensorResult<J> {
  const sampleLimit = options.sampleLimit ?? DEFAULT_FINSTOCH_SAMPLE_LIMIT;
  const threshold = Math.max(1, Math.min(options.threshold ?? DEFAULT_FINSTOCH_THRESHOLD, sampleLimit));
  const describe = options.describeIndex ?? ((idx: J) => `${String(idx)}`);
  const enumeration = options.countability?.enumerate() ?? index;
  const iterator = enumeration[Symbol.iterator]();

  let inspected = 0;
  let exhausted = false;
  const emptyFactors: Array<FinStochFactorInfo<J>> = [];
  const multiValuedSamples: Array<FinStochFactorInfo<J>> = [];
  let multiValuedCount = 0;

  while (inspected < sampleLimit) {
    const next = iterator.next();
    if (next.done) {
      exhausted = true;
      break;
    }

    inspected += 1;
    const idx = next.value;
    const fin = carrier(idx);
    const size = fin.elems.length;
    const info: FinStochFactorInfo<J> = { index: idx, label: describe(idx), size };

    if (size === 0) {
      if (emptyFactors.length < MAX_FACTOR_SAMPLES) emptyFactors.push(info);
    } else if (size >= 2) {
      multiValuedCount += 1;
      if (multiValuedSamples.length < MAX_FACTOR_SAMPLES) multiValuedSamples.push(info);
    }
  }

  let truncated = !exhausted && inspected >= sampleLimit;
  if (truncated) {
    const peek = iterator.next();
    if (peek.done) {
      exhausted = true;
      truncated = false;
    } else {
      truncated = true;
    }
  }

  let status: FinStochInfiniteTensorStatus;
  let details: string;

  if (emptyFactors.length > 0) {
    status = "obstructed";
    details = `Encountered ${emptyFactors.length} empty factor${emptyFactors.length === 1 ? "" : "s"}; a FinStoch infinite tensor cannot exist with an empty component.`;
  } else if (truncated && multiValuedCount >= threshold) {
    status = "likelyObstructed";
    details = `Observed ${multiValuedCount} multi-valued factors without exhausting the index; Example 3.7 predicts no FinStoch tensor when infinitely many factors have size ≥ 2.`;
  } else if (truncated) {
    status = "inconclusive";
    details = `Inspected ${inspected} factors (limit ${sampleLimit}) without exhausting the index; insufficient evidence to certify the Example 3.7 obstruction.`;
  } else {
    status = "ok";
    details = `Enumeration exhausted after ${inspected} factors; only ${multiValuedCount} factor${multiValuedCount === 1 ? "" : "s"} had size ≥ 2, so the Example 3.7 obstruction does not apply.`;
  }

  return {
    status,
    details,
    inspected,
    sampleLimit,
    exhausted,
    truncated,
    emptyFactors,
    multiValuedFactors: multiValuedSamples,
    multiValuedCount,
    ...(options.countability && { countability: options.countability }),
  };
}
