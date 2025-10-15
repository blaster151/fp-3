// markov-determinism-lemma.ts — Executable determinism oracle
// Detects determinism of s ∘ p under p-almost-sure conditional independence X ⟂ T ∥ A.

import { FinMarkov, pair, tensorObj, idK, type Pair } from "./markov-category";
import { Prob } from "./semiring-utils";
import { fromLegacy } from "./dist";
import { isDeterministic, isDeterministicKernel } from "./markov-laws";
import { buildMarkovComonoidWitness, type MarkovComonoidWitness } from "./markov-comonoid-structure";
import {
  buildMarkovConditionalWitness,
  checkConditionalIndependence,
  type MarkovConditionalReport,
} from "./markov-conditional-independence";

const DEFAULT_TOLERANCE = 1e-9;

export interface DeterminismLemmaWitness<A, X, T> {
  readonly prior: FinMarkov<A, X>;
  readonly stat: FinMarkov<X, T>;
  readonly label?: string;
}

export interface DeterminismLemmaReport<A, X, T> {
  readonly holds: boolean;
  readonly witness: DeterminismLemmaWitness<A, X, T>;
  readonly composite: FinMarkov<A, T>;
  readonly deterministic: boolean;
  readonly ciVerified: boolean;
  readonly tolerance: number;
  readonly independence: MarkovConditionalReport<A>;
  readonly details: string;
}

export interface DeterminismLemmaOptions {
  readonly tolerance?: number;
}

export function buildDeterminismLemmaWitness<A, X, T>(
  p: FinMarkov<A, X>,
  s: FinMarkov<X, T>,
  options: { label?: string } = {},
): DeterminismLemmaWitness<A, X, T> {
  if (p.Y !== s.X) {
    throw new Error("Determinism lemma witness requires compatible codomain/domain.");
  }
  return {
    prior: p,
    stat: s,
    ...(options.label !== undefined ? { label: options.label } : {}),
  };
}

function buildJoint<A, X, T>(prior: FinMarkov<A, X>, stat: FinMarkov<X, T>): FinMarkov<A, Pair<X, T>> {
  const codomain = tensorObj(prior.Y, stat.Y);
  const stateJoint = new FinMarkov(prior.Y, codomain, pair(idK(prior.Y).k, stat.k));
  return prior.then(stateJoint);
}

export function checkDeterminismLemma<A, X, T>(
  witness: DeterminismLemmaWitness<A, X, T>,
  options: DeterminismLemmaOptions = {},
): DeterminismLemmaReport<A, X, T> {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const composite = witness.prior.then(witness.stat);

  const domainLabel = witness.label ? `${witness.label} domain` : undefined;
  const xLabel = witness.label ? `${witness.label} X` : undefined;
  const tLabel = witness.label ? `${witness.label} T` : undefined;
  const domain = buildMarkovComonoidWitness(
    witness.prior.X,
    domainLabel !== undefined ? { label: domainLabel } : undefined,
  );
  const xWitness = buildMarkovComonoidWitness(
    witness.prior.Y,
    xLabel !== undefined ? { label: xLabel } : undefined,
  );
  const tWitness = buildMarkovComonoidWitness(
    witness.stat.Y,
    tLabel !== undefined ? { label: tLabel } : undefined,
  );

  const joint = buildJoint(witness.prior, witness.stat);
  const conditional = buildMarkovConditionalWitness(
    domain,
    [xWitness, tWitness] as ReadonlyArray<MarkovComonoidWitness<unknown>>,
    joint as unknown as FinMarkov<A, unknown>,
    {
      label: witness.label ? `${witness.label} joint` : "determinism lemma joint",
    },
  );
  const independence = checkConditionalIndependence(conditional);
  const ciVerified = independence.holds;

  const deterministicReport = isDeterministic(Prob, (a: A) => fromLegacy(Prob, composite.k(a)), witness.prior.X.elems);
  let deterministic = deterministicReport.det;
  if (deterministic) {
    deterministic = isDeterministicKernel(witness.prior.X, composite.k, tolerance);
  }

  const holds = ciVerified && deterministic;
  const descriptor = witness.label ?? "determinism lemma";
  const pieces: string[] = [];
  if (!ciVerified) pieces.push("conditional independence failed");
  if (!deterministic) pieces.push("composite is not deterministic");
  const details = holds
    ? `${descriptor}: composite s ∘ p is deterministic under verified hypotheses.`
    : `${descriptor}: ${pieces.join("; ") || "hypotheses were not satisfied"}.`;

  return {
    holds,
    witness,
    composite,
    deterministic,
    ciVerified,
    tolerance,
    independence,
    details,
  };
}
