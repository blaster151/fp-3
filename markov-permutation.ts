// markov-permutation.ts — Finite permutation/injection invariance oracles for Markov kernels
// Provides reusable diagnostics for Hewitt–Savage style invariance assumptions.

import { FinMarkov, approxEqualMatrix } from "./markov-category";
import {
  buildMarkovAlmostSureWitness,
  checkAlmostSureEquality,
  type MarkovAlmostSureReport,
} from "./markov-almost-sure";

export type FiniteSymmetryKind = "permutation" | "injection";

export interface FiniteSymmetry<XJ> {
  readonly name: string;
  readonly sigmaHat: FinMarkov<XJ, XJ> | FinMarkov<any, any>;
  readonly kind?: FiniteSymmetryKind | undefined;
}

export type FinitePermutation<XJ> = FiniteSymmetry<XJ>;
export type FiniteInjection<XJ> = FiniteSymmetry<XJ>;

export interface FinitePermutationInvarianceOptions {
  readonly tolerance?: number;
}

export interface FinitePermutationInvarianceReport<A, XJ, T> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<string>;
  readonly tolerance: number;
  readonly symmetryReports: ReadonlyArray<{
    readonly name: string;
    readonly kind: FiniteSymmetryKind;
    readonly priorInvariant: boolean;
    readonly statReport: MarkovAlmostSureReport<A, XJ, T>;
  }>;
}

export function checkFinitePermutationInvariance<A, XJ, T>(
  p: FinMarkov<A, XJ>,
  s: FinMarkov<XJ, T>,
  perms: ReadonlyArray<FiniteSymmetry<XJ>>,
  options: FinitePermutationInvarianceOptions = {},
): FinitePermutationInvarianceReport<A, XJ, T> {
  const tolerance = options.tolerance ?? 1e-9;
  const failures: string[] = [];
  const symmetryReports: Array<{
    readonly name: string;
    readonly kind: FiniteSymmetryKind;
    readonly priorInvariant: boolean;
    readonly statReport: MarkovAlmostSureReport<A, XJ, T>;
  }> = [];

  for (const permutation of perms) {
    const sigmaHat = permutation.sigmaHat as FinMarkov<XJ, XJ>;
    if (sigmaHat.X !== p.Y || sigmaHat.Y !== p.Y) {
      throw new Error(
        `Permutation ${permutation.name} must act on the Kolmogorov object X_J.`,
      );
    }

    const permutedPrior = p.then(sigmaHat);
    const priorInvariant = approxEqualMatrix(p.matrix(), permutedPrior.matrix(), tolerance);
    if (!priorInvariant) {
      failures.push(`${permutation.name}: prior p broke invariance under σ̂.`);
    }

    const statWitness = buildMarkovAlmostSureWitness(
      p,
      s,
      sigmaHat.then(s),
      { label: `${permutation.name}: s∘σ̂` },
    );
    const statReport = checkAlmostSureEquality(statWitness, { tolerance });
    if (!statReport.holds) {
      failures.push(`${permutation.name}: statistic s was not invariant under σ̂ (p-a.s.).`);
    }

    symmetryReports.push({
      name: permutation.name,
      kind: permutation.kind ?? "permutation",
      priorInvariant,
      statReport,
    });
  }

  return {
    holds: failures.length === 0,
    failures,
    tolerance,
    symmetryReports,
  };
}
