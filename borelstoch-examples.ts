// borelstoch-examples.ts — adapters for BorelStoch-style zero–one witnesses
// Converts samplers and indicator predicates into Kolmogorov zero–one witnesses.

import { detK, FinMarkov, fromWeights, IFin, mkFin, type Fin, type I } from "./markov-category";
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

interface BorelWitnessBaseOptions<Ω, XJ> {
  readonly label?: string;
  readonly omegaSupport: ReadonlyArray<readonly [Ω, number]>;
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

function buildBorelPrior<Ω, Coord, XJ>(
  coords: ReadonlyArray<MeasurableMap<Ω, Coord>>,
  product: (vals: ReadonlyArray<Coord>) => XJ,
  options: BorelWitnessBaseOptions<Ω, XJ>,
  context: string,
): { prior: FinMarkov<I, XJ>; canonicalize: (value: XJ, reason: string) => XJ } {
  if (options.omegaSupport.length === 0) {
    throw new Error(`${context} requires a non-empty support for Ω.`);
  }

  const productSpace = options.productSpace;
  const canonicalize = (value: XJ, reason: string) => canonicalElement(productSpace, value, reason);

  const weights = new Map<XJ, number>();
  for (const [omegaPoint, weight] of options.omegaSupport) {
    if (weight < 0) {
      throw new Error(`${context} received a negative weight in ω-support.`);
    }
    const values = coords.map((f) => f(omegaPoint));
    const xj = product(values);
    const canonical = canonicalize(xj, `${context} support point`);
    weights.set(canonical, (weights.get(canonical) ?? 0) + weight);
  }

  const priorDistribution = fromWeights([...weights.entries()]);
  const baseEntries = [...priorDistribution.entries()];
  const prior = new FinMarkov(IFin, productSpace, () => new Map(baseEntries));

  return { prior, canonicalize };
}

export function buildBorelKolmogorovWitness<Ω, Coord, XJ, T = 0 | 1>(
  _omega: Sampler<Ω>,
  coords: ReadonlyArray<MeasurableMap<Ω, Coord>>,
  product: (vals: ReadonlyArray<Coord>) => XJ,
  finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ>>,
  tail: Indicator<XJ, T>,
  options: BorelKolmogorovOptions<Ω, XJ, T>,
): KolmogorovZeroOneWitness<I, XJ, T> {
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

export function checkBorelKolmogorovZeroOne<XJ, T = 0 | 1>(
  witness: KolmogorovZeroOneWitness<I, XJ, T>,
  options?: KolmogorovZeroOneOptions,
): KolmogorovZeroOneReport<I, XJ, T> {
  return checkKolmogorovZeroOne(witness, options);
}

export function buildBorelHewittSavageWitness<Ω, Coord, XJ, T = 0 | 1>(
  _omega: Sampler<Ω>,
  coords: ReadonlyArray<MeasurableMap<Ω, Coord>>,
  product: (vals: ReadonlyArray<Coord>) => XJ,
  finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ>>,
  permutations: ReadonlyArray<BorelPermutation<XJ>>,
  sInv: Indicator<XJ, T>,
  options: BorelHewittSavageOptions<Ω, XJ, T>,
): HewittSavageWitness<I, XJ, T> {
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

export function checkBorelHewittSavageZeroOne<XJ, T = 0 | 1>(
  witness: HewittSavageWitness<I, XJ, T>,
  options?: KolmogorovZeroOneOptions,
): HewittSavageReport<I, XJ, T> {
  return checkHewittSavageZeroOne(witness, options);
}
