// borelstoch-examples.ts — adapters for BorelStoch-style zero–one witnesses
// Converts samplers and indicator predicates into Kolmogorov zero–one witnesses.

import {
  detK,
  FinMarkov,
  fromWeights,
  IFin,
  mkFin,
  probabilityFromFinite,
  measurableFromFin,
  type Fin,
  type I,
  type ProbabilityMeasure,
  type MeasurableSpace,
} from "./markov-category";
import {
  buildKolmogorovZeroOneWitness,
  checkKolmogorovZeroOne,
  buildHewittSavageWitness,
  checkHewittSavageZeroOne,
  type HewittSavageReport,
  type HewittSavageWitness,
  type KolmogorovFiniteMarginal,
  type KolmogorovZeroOneOptions,
  type KolmogorovZeroOneReport,
  type KolmogorovZeroOneWitness,
} from "./markov-zero-one";
import type { FiniteSymmetryKind } from "./markov-permutation";

export type Sampler<Ω> = () => Ω;
export type MeasurableMap<A, B> = (a: A) => B;
export type Indicator<XJ, T = 0 | 1> = (xj: XJ) => T;

interface BorelOmegaSupport<Ω> {
  readonly omegaSupport: ReadonlyArray<readonly [Ω, number]>;
  readonly omegaSpace?: MeasurableSpace<Ω>;
}

interface BorelOmegaMeasure<Ω> {
  readonly omegaMeasure: ProbabilityMeasure<Ω>;
}

type BorelOmegaOptions<Ω> = BorelOmegaSupport<Ω> | BorelOmegaMeasure<Ω>;

interface BorelWitnessBaseOptions<Ω, XJ> extends BorelOmegaOptions<Ω> {
  readonly label?: string;
  readonly productSpace: Fin<XJ>;
}

export interface BorelKolmogorovOptions<Ω, XJ, T> extends BorelWitnessBaseOptions<Ω, XJ> {
  readonly tailSpace?: Fin<T>;
}

export interface BorelHewittSavageOptions<Ω, XJ, T>
  extends BorelWitnessBaseOptions<Ω, XJ> {
  readonly tailSpace?: Fin<T>;
}

export interface BorelPermutation<XJ> {
  readonly name: string;
  readonly sigmaHat: (xj: XJ) => XJ;
  readonly kind?: FiniteSymmetryKind;
}

function canonicalElement<X>(fin: Fin<X>, value: X, context: string): X {
  for (const candidate of fin.elems) {
    if (fin.eq(candidate, value)) return candidate;
  }
  throw new Error(`${context}: value is not contained in the provided Fin carrier.`);
}

const hasOmegaMeasure = <Ω>(options: BorelOmegaOptions<Ω>): options is BorelOmegaMeasure<Ω> =>
  (options as Partial<BorelOmegaMeasure<Ω>>).omegaMeasure !== undefined;

function ensureOmegaMeasure<Ω>(
  options: BorelOmegaOptions<Ω>,
  context: string,
): ProbabilityMeasure<Ω> {
  if (hasOmegaMeasure(options)) {
    return options.omegaMeasure;
  }

  if (options.omegaSupport.length === 0) {
    throw new Error(`${context} requires a non-empty support for Ω.`);
  }

  const omegaSpace = options.omegaSpace ?? ({
    label: `${context} Ω`,
    isMeasurable: () => true,
  } satisfies MeasurableSpace<Ω>);

  const dist = fromWeights([...options.omegaSupport], true);
  return probabilityFromFinite(omegaSpace, dist);
}

function probabilityOnFiniteCarrier<X>(
  space: Fin<X>,
  measure: ProbabilityMeasure<X>,
  context: string,
): Map<X, number> {
  const weights = new Map<X, number>();
  let total = 0;
  for (const element of space.elems) {
    const weight = measure.measure((candidate) => space.eq(candidate, element));
    if (weight < -1e-9) {
      throw new Error(`${context} produced a negative probability mass.`);
    }
    if (weight > 0) {
      weights.set(element, weight);
    }
    total += weight;
  }

  if (Math.abs(total - 1) > 1e-6) {
    if (total <= 0) {
      throw new Error(`${context} constructed a prior with zero total mass.`);
    }
    for (const element of space.elems) {
      const weight = weights.get(element) ?? 0;
      const renormalized = weight / total;
      if (renormalized > 0) {
        weights.set(element, renormalized);
      }
    }
  }

  return weights;
}

function buildBorelPrior<Ω, Coord, XJ>(
  coords: ReadonlyArray<MeasurableMap<Ω, Coord>>,
  product: (vals: ReadonlyArray<Coord>) => XJ,
  options: BorelWitnessBaseOptions<Ω, XJ>,
  context: string,
): {
  prior: FinMarkov<I, XJ>;
  canonicalize: (value: XJ, reason: string) => XJ;
  giryPrior: ProbabilityMeasure<XJ>;
} {
  const productSpace = options.productSpace;
  const productMeasurable = measurableFromFin(productSpace, `${context} product`);
  const canonicalize = (value: XJ, reason: string) => canonicalElement(productSpace, value, reason);

  const omegaMeasure = ensureOmegaMeasure(options, context);

  const pushforward = {
    space: productMeasurable,
    measure: (set: (value: XJ) => boolean) =>
      omegaMeasure.measure((omega) =>
        set(canonicalize(product(coords.map((f) => f(omega))), `${context} ω`)),
      ),
    expect: (g: (value: XJ) => number) =>
      omegaMeasure.expect((omega) => g(canonicalize(product(coords.map((f) => f(omega))), `${context} ω`))),
  } satisfies ProbabilityMeasure<XJ>;

  const weights = probabilityOnFiniteCarrier(productSpace, pushforward, context);
  const baseEntries = [...weights.entries()];
  const prior = new FinMarkov(IFin, productSpace, () => new Map(baseEntries));

  return { prior, canonicalize, giryPrior: pushforward };
}

export function buildBorelKolmogorovWitness<Ω, Coord, XJ, XF = unknown, T = 0 | 1>(
  _omega: Sampler<Ω>,
  coords: ReadonlyArray<MeasurableMap<Ω, Coord>>,
  product: (vals: ReadonlyArray<Coord>) => XJ,
  finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>,
  tail: Indicator<XJ, T>,
  options: BorelKolmogorovOptions<Ω, XJ, T>,
): KolmogorovZeroOneWitness<I, XJ, T, XF> {
  const descriptor = options.label ?? "Borel Kolmogorov witness";
  const { prior } = buildBorelPrior(coords, product, options, descriptor);
  const productSpace = options.productSpace;
  const tailSpace = options.tailSpace ?? mkFin<T>([0 as T, 1 as T], (a, b) => Object.is(a, b));

  const canonicalTail = (xj: XJ): T => {
    const value = tail(xj);
    return canonicalElement(tailSpace, value, `${descriptor} tail predicate`);
  };
  const stat = detK(productSpace, tailSpace, canonicalTail);

  return buildKolmogorovZeroOneWitness(
    prior,
    stat,
    finiteMarginals,
    options.label !== undefined ? { label: options.label } : undefined,
  );
}

export function checkBorelKolmogorovZeroOne<XJ, T = 0 | 1, XF = unknown>(
  witness: KolmogorovZeroOneWitness<I, XJ, T, XF>,
  options?: KolmogorovZeroOneOptions,
): KolmogorovZeroOneReport<I, XJ, T, XF> {
  return checkKolmogorovZeroOne(witness, options);
}

export function buildBorelHewittSavageWitness<Ω, Coord, XJ, XF = unknown, T = 0 | 1>(
  _omega: Sampler<Ω>,
  coords: ReadonlyArray<MeasurableMap<Ω, Coord>>,
  product: (vals: ReadonlyArray<Coord>) => XJ,
  finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>,
  permutations: ReadonlyArray<BorelPermutation<XJ>>,
  sInv: Indicator<XJ, T>,
  options: BorelHewittSavageOptions<Ω, XJ, T>,
): HewittSavageWitness<I, XJ, T, XF> {
  const descriptor = options.label ?? "Borel Hewitt–Savage witness";
  const { prior, canonicalize } = buildBorelPrior(coords, product, options, descriptor);
  const productSpace = options.productSpace;
  const tailSpace = options.tailSpace ?? mkFin<T>([0 as T, 1 as T], (a, b) => Object.is(a, b));

  const canonicalStatistic = (xj: XJ): T => {
    const value = sInv(xj);
    return canonicalElement(tailSpace, value, `${descriptor} statistic`);
  };
  const stat = detK(productSpace, tailSpace, canonicalStatistic);

  const finiteSymmetries = permutations.map(({ name, sigmaHat, kind }) => ({
    name,
    kind,
    sigmaHat: detK(productSpace, productSpace, (xj: XJ) =>
      canonicalize(sigmaHat(xj), `${descriptor} permutation ${name}`),
    ),
  }));

  return buildHewittSavageWitness(
    prior,
    stat,
    finiteMarginals,
    finiteSymmetries,
    options.label !== undefined ? { label: options.label } : undefined,
  );
}

export function checkBorelHewittSavageZeroOne<XJ, T = 0 | 1, XF = unknown>(
  witness: HewittSavageWitness<I, XJ, T, XF>,
  options?: KolmogorovZeroOneOptions,
): HewittSavageReport<I, XJ, T, XF> {
  return checkHewittSavageZeroOne(witness, options);
}
