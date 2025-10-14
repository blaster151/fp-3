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

export interface ZeroOneSynthesisWitness<A, XJ, T, XF = unknown> {
  readonly kolmogorov: KolmogorovZeroOneWitness<A, XJ, T, XF>;
  readonly symmetries?: ReadonlyArray<FiniteSymmetry<XJ>>;
  readonly label?: string;
}

export interface ZeroOneSynthesisReport<A, XJ, T, XF = unknown> {
  readonly holds: boolean;
  readonly kolmogorov: KolmogorovZeroOneReport<A, XJ, T, XF>;
  readonly symmetryReport?: FinitePermutationInvarianceReport<A, XJ, T>;
}

export interface ZeroOneSynthesisInput<A, XJ, T, XF = unknown> {
  readonly prior: FinMarkov<A, XJ>;
  readonly statistic: FinMarkov<XJ, T>;
  readonly finiteMarginals: KolmogorovZeroOneWitness<A, XJ, T, XF>["finiteMarginals"];
  readonly symmetries?: ReadonlyArray<FiniteSymmetry<XJ>>;
  readonly label?: string;
}

export function buildZeroOneSynthesisWitness<A, XJ, T, XF = unknown>(
  input: ZeroOneSynthesisInput<A, XJ, T, XF>,
): ZeroOneSynthesisWitness<A, XJ, T, XF> {
  const kolmogorov = buildKolmogorovZeroOneWitness(
    input.prior,
    input.statistic,
    input.finiteMarginals,
    input.label === undefined ? undefined : { label: input.label },
  );
  return {
    kolmogorov,
    ...(input.symmetries === undefined ? {} : { symmetries: input.symmetries }),
    ...(input.label === undefined ? {} : { label: input.label }),
  };
}

export function checkZeroOneSynthesis<A, XJ, T, XF = unknown>(
  witness: ZeroOneSynthesisWitness<A, XJ, T, XF>,
  options: { tolerance?: number } = {},
): ZeroOneSynthesisReport<A, XJ, T, XF> {
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
    ...(symmetryReport === undefined ? {} : { symmetryReport }),
  };
}

export function makeZeroOneOracle<A, XJ, T, XF = unknown>(
  input: ZeroOneSynthesisInput<A, XJ, T, XF>,
): {
  readonly witness: ZeroOneSynthesisWitness<A, XJ, T, XF>;
  readonly check: (options?: { tolerance?: number }) => ZeroOneSynthesisReport<A, XJ, T, XF>;
} {
  const witness = buildZeroOneSynthesisWitness(input);
  return {
    witness,
    check: (options) => checkZeroOneSynthesis(witness, options),
  };
}
