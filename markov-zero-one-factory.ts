import type { FinMarkov } from "./markov-category";
import {
  buildKolmogorovZeroOneWitness,
  checkKolmogorovZeroOne,
  type KolmogorovZeroOneReport,
  type KolmogorovZeroOneWitness,
} from "./markov-zero-one";
import {
  checkFinitePermutationInvariance,
  type FinitePermutationInvarianceReport,
  type FiniteSymmetry,
} from "./markov-permutation";

export interface ZeroOneSynthesisWitness<A, XJ, T> {
  readonly kolmogorov: KolmogorovZeroOneWitness<A, XJ, T>;
  readonly symmetries?: ReadonlyArray<FiniteSymmetry<XJ>>;
  readonly label?: string;
}

export interface ZeroOneSynthesisReport<A, XJ, T> {
  readonly holds: boolean;
  readonly kolmogorov: KolmogorovZeroOneReport<A, XJ, T>;
  readonly symmetryReport?: FinitePermutationInvarianceReport<A, XJ, T>;
}

export interface ZeroOneSynthesisInput<A, XJ, T> {
  readonly prior: FinMarkov<A, XJ>;
  readonly statistic: FinMarkov<XJ, T>;
  readonly finiteMarginals: KolmogorovZeroOneWitness<A, XJ, T>["finiteMarginals"];
  readonly symmetries?: ReadonlyArray<FiniteSymmetry<XJ>>;
  readonly label?: string;
}

export function buildZeroOneSynthesisWitness<A, XJ, T>(
  input: ZeroOneSynthesisInput<A, XJ, T>,
): ZeroOneSynthesisWitness<A, XJ, T> {
  const kolmogorov = buildKolmogorovZeroOneWitness(
    input.prior,
    input.statistic,
    input.finiteMarginals,
    { label: input.label },
  );
  return {
    kolmogorov,
    symmetries: input.symmetries,
    label: input.label,
  };
}

export function checkZeroOneSynthesis<A, XJ, T>(
  witness: ZeroOneSynthesisWitness<A, XJ, T>,
  options: { tolerance?: number } = {},
): ZeroOneSynthesisReport<A, XJ, T> {
  const kolmogorov = checkKolmogorovZeroOne(witness.kolmogorov, options);
  let symmetryReport: FinitePermutationInvarianceReport<A, XJ, T> | undefined;

  if (witness.symmetries && witness.symmetries.length > 0) {
    symmetryReport = checkFinitePermutationInvariance(
      witness.kolmogorov.prior,
      witness.kolmogorov.stat,
      witness.symmetries,
      options,
    );
  }

  const holds = kolmogorov.holds && (!symmetryReport || symmetryReport.holds);

  return {
    holds,
    kolmogorov,
    symmetryReport,
  };
}

export function makeZeroOneOracle<A, XJ, T>(
  input: ZeroOneSynthesisInput<A, XJ, T>,
): {
  readonly witness: ZeroOneSynthesisWitness<A, XJ, T>;
  readonly check: (options?: { tolerance?: number }) => ZeroOneSynthesisReport<A, XJ, T>;
} {
  const witness = buildZeroOneSynthesisWitness(input);
  return {
    witness,
    check: (options) => checkZeroOneSynthesis(witness, options),
  };
}
