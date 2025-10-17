// markov-zero-one.ts — Kolmogorov and Hewitt–Savage zero–one oracles
// Packages finite marginal witnesses, permutation invariance, and determinism diagnostics.

import { FinMarkov, pair, tensorObj, type Kernel, type Fin } from "./markov-category";
import { Prob } from "./semiring-utils";
import { fromLegacy } from "./dist";
import { isDeterministic, isDeterministicKernel } from "./markov-laws";
import { buildMarkovComonoidWitness, type MarkovComonoidWitness } from "./markov-comonoid-structure";
import {
  buildMarkovConditionalWitness,
  checkConditionalIndependence,
  type MarkovConditionalReport,
} from "./markov-conditional-independence";
import {
  checkFinitePermutationInvariance,
  type FiniteSymmetry,
  type FinitePermutationInvarianceReport,
} from "./markov-permutation";

const DEFAULT_TOLERANCE = 1e-9;

export interface KolmogorovFiniteMarginal<XJ, XF = unknown> {
  readonly F: string;
  readonly piF: FinMarkov<XJ, XF>;
}

export interface KolmogorovZeroOneWitnessMetadata {
  readonly heuristics?: ReadonlyArray<string>;
  readonly notes?: string;
}

export interface KolmogorovZeroOneWitness<A, XJ, T, XF = unknown> {
  readonly prior: FinMarkov<A, XJ>;
  readonly stat: FinMarkov<XJ, T>;
  readonly finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>;
  readonly label?: string;
  readonly metadata?: KolmogorovZeroOneWitnessMetadata;
}

export interface KolmogorovZeroOneReport<A, XJ, T, XF = unknown> {
  readonly holds: boolean;
  readonly witness: KolmogorovZeroOneWitness<A, XJ, T, XF>;
  readonly composite: FinMarkov<A, T>;
  readonly deterministic: boolean;
  readonly ciFamilyVerified: boolean;
  readonly failures: ReadonlyArray<{ F: string; reason: string }>;
  readonly tolerance: number;
  readonly globalIndependence?: MarkovConditionalReport<A>;
  readonly marginalChecks: ReadonlyArray<{ F: string; report: MarkovConditionalReport<A> }>;
  readonly details: string;
}

export interface KolmogorovZeroOneOptions {
  readonly tolerance?: number;
}

export function buildKolmogorovZeroOneWitness<A, XJ, T, XF = unknown>(
  p: FinMarkov<A, XJ>,
  s: FinMarkov<XJ, T>,
  finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>,
  options: { label?: string; metadata?: KolmogorovZeroOneWitnessMetadata } = {},
): KolmogorovZeroOneWitness<A, XJ, T, XF> {
  if (p.Y !== s.X) {
    throw new Error("Kolmogorov zero–one witness requires s to consume the prior codomain.");
  }
  finiteMarginals.forEach((entry, index) => {
    if (entry.piF.X !== s.X) {
      throw new Error(`Finite marginal ${index} does not consume X_J.`);
    }
  });
  return {
    prior: p,
    stat: s,
    finiteMarginals,
    ...(options.label !== undefined ? { label: options.label } : {}),
    ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
  };
}

const forgetComonoidWitness = <X>(witness: MarkovComonoidWitness<X>): MarkovComonoidWitness<unknown> =>
  witness as unknown as MarkovComonoidWitness<unknown>;

const forgetCodomain = <X, Y>(arrow: FinMarkov<X, Y>): FinMarkov<X, unknown> =>
  arrow as unknown as FinMarkov<X, unknown>;

const forgetStatistic = <A, XJ, XF, T>(
  witness: KolmogorovZeroOneWitness<A, XJ, T, XF>,
): KolmogorovZeroOneWitness<A, XJ, unknown, XF> => ({
  prior: witness.prior,
  stat: forgetCodomain(witness.stat),
  finiteMarginals: witness.finiteMarginals,
  ...(witness.label === undefined ? {} : { label: witness.label }),
  ...(witness.metadata === undefined ? {} : { metadata: witness.metadata }),
});

function combineStateProjections<XJ>(
  projections: ReadonlyArray<FinMarkov<XJ, unknown>>,
): FinMarkov<XJ, unknown> {
  const [first, ...rest] = projections;
  if (!first) {
    throw new Error("Kolmogorov zero–one witness requires at least one finite marginal.");
  }
  let kernel = first.k as Kernel<XJ, unknown>;
  let codomain = first.Y as unknown as Fin<unknown>;
  for (const projection of rest) {
    kernel = pair(kernel, projection.k) as Kernel<XJ, unknown>;
    codomain = tensorObj(codomain, projection.Y as unknown as Fin<unknown>) as Fin<unknown>;
  }
  return new FinMarkov<XJ, unknown>(first.X, codomain, kernel);
}

function marginalIndependenceChecks<A, XJ, T, XF>(
  witness: KolmogorovZeroOneWitness<A, XJ, T, XF>,
  composite: FinMarkov<A, T>,
): Array<{ F: string; report: MarkovConditionalReport<A> }> {
  const domainLabel = witness.label ? `${witness.label} domain` : undefined;
  const tLabel = witness.label ? `${witness.label} T` : undefined;
  const domain = buildMarkovComonoidWitness(
    witness.prior.X,
    domainLabel !== undefined ? { label: domainLabel } : undefined,
  );
  const tWitness = buildMarkovComonoidWitness(
    witness.stat.Y,
    tLabel !== undefined ? { label: tLabel } : undefined,
  );

  return witness.finiteMarginals.map((entry) => {
    const marginalWitness = buildMarkovComonoidWitness(entry.piF.Y, {
      label: `${witness.label ?? "Kolmogorov"} ${entry.F}`,
    });
    const stateJoint = new FinMarkov(
      witness.prior.Y,
      tensorObj(entry.piF.Y, witness.stat.Y),
      pair(entry.piF.k, witness.stat.k),
    );
    const joint = witness.prior.then(stateJoint);
    const outputs: ReadonlyArray<MarkovComonoidWitness<unknown>> = [
      forgetComonoidWitness(marginalWitness),
      forgetComonoidWitness(tWitness),
    ];
    const conditional = buildMarkovConditionalWitness(
      domain,
      outputs,
      forgetCodomain(joint),
      {
        label: `${witness.label ?? "Kolmogorov"} (${entry.F}, T)`,
      },
    );
    const report = checkConditionalIndependence(conditional);
    return { F: entry.F, report };
  });
}

function checkGlobalIndependence<A, XJ, XF>(
  witness: KolmogorovZeroOneWitness<A, XJ, unknown, XF>,
): MarkovConditionalReport<A> | undefined {
  if (witness.finiteMarginals.length === 0) {
    return undefined;
  }
  const domainLabel = witness.label ? `${witness.label} domain` : undefined;
  const domain = buildMarkovComonoidWitness(
    witness.prior.X,
    domainLabel !== undefined ? { label: domainLabel } : undefined,
  );
  const outputs = witness.finiteMarginals.map((entry) =>
    forgetComonoidWitness(
      buildMarkovComonoidWitness(entry.piF.Y, {
        label: `${witness.label ?? "Kolmogorov"} ${entry.F}`,
      }),
    ),
  );
  const stateCombined = combineStateProjections(
    witness.finiteMarginals.map((entry) => forgetCodomain(entry.piF)),
  );
  const combined = witness.prior.then(stateCombined);
  const conditional = buildMarkovConditionalWitness(domain, outputs, forgetCodomain(combined), {
    label: witness.label ? `${witness.label} finite marginals` : "Kolmogorov finite marginals",
  });
  return checkConditionalIndependence(conditional);
}

export function checkKolmogorovZeroOne<A, XJ, T, XF = unknown>(
  witness: KolmogorovZeroOneWitness<A, XJ, T, XF>,
  options: KolmogorovZeroOneOptions = {},
): KolmogorovZeroOneReport<A, XJ, T, XF> {
  const tolerance = options.tolerance ?? DEFAULT_TOLERANCE;
  const composite = witness.prior.then(witness.stat);

  const globalIndependence = checkGlobalIndependence(forgetStatistic(witness));
  const marginalReports = marginalIndependenceChecks(witness, composite);
  const ciFamilyVerified =
    (globalIndependence?.holds ?? true) && marginalReports.every((entry) => entry.report.holds);

  const deterministicReport = isDeterministic(Prob, (a: A) => fromLegacy(Prob, composite.k(a)), witness.prior.X.elems);
  let deterministic = deterministicReport.det;
  if (deterministic) {
    deterministic = isDeterministicKernel(witness.prior.X, composite.k, tolerance);
  }

  const failures: Array<{ F: string; reason: string }> = [];
  if (globalIndependence && !globalIndependence.holds) {
    failures.push({ F: "global", reason: globalIndependence.details });
  }
  for (const entry of marginalReports) {
    if (!entry.report.holds) {
      failures.push({ F: entry.F, reason: entry.report.details });
    }
  }
  if (!deterministic) {
    failures.push({ F: "determinism", reason: "Composite s ∘ p failed determinism check." });
  }

  const holds = ciFamilyVerified && deterministic;
  const descriptor = witness.label ?? "Kolmogorov zero–one";
  const details = holds
    ? `${descriptor}: all finite marginals verify X_F ⟂ T ∥ A and s ∘ p is deterministic.`
    : `${descriptor}: ${failures.length} obligation${failures.length === 1 ? "" : "s"} failed.`;

  return {
    holds,
    witness,
    composite,
    deterministic,
    ciFamilyVerified,
    failures,
    tolerance,
    ...(globalIndependence === undefined ? {} : { globalIndependence }),
    marginalChecks: marginalReports,
    details,
  };
}

export interface HewittSavageWitness<A, XJ, T, XF = unknown>
  extends KolmogorovZeroOneWitness<A, XJ, T, XF> {
  readonly permutations: ReadonlyArray<FiniteSymmetry<XJ>>;
}

export interface HewittSavageReport<A, XJ, T, XF = unknown>
  extends KolmogorovZeroOneReport<A, XJ, T, XF> {
  readonly permutationInvariant: boolean;
  readonly permutationFailures: ReadonlyArray<string>;
  readonly permutationReport?: FinitePermutationInvarianceReport<A, XJ, T>;
}

export function buildHewittSavageWitness<A, XJ, T, XF = unknown>(
  p: FinMarkov<A, XJ>,
  s: FinMarkov<XJ, T>,
  finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>,
  permutations: ReadonlyArray<FiniteSymmetry<XJ>>,
  options: { label?: string } = {},
): HewittSavageWitness<A, XJ, T, XF> {
  const base = buildKolmogorovZeroOneWitness(p, s, finiteMarginals, options);
  return { ...base, permutations };
}

export function checkHewittSavageZeroOne<A, XJ, T, XF = unknown>(
  witness: HewittSavageWitness<A, XJ, T, XF>,
  options: KolmogorovZeroOneOptions = {},
): HewittSavageReport<A, XJ, T, XF> {
  const base = checkKolmogorovZeroOne(witness, options);
  const permutationReport = checkFinitePermutationInvariance(
    witness.prior,
    witness.stat,
    witness.permutations,
    options.tolerance === undefined ? undefined : { tolerance: options.tolerance },
  );
  const permutationFailures = permutationReport.failures;
  const permutationInvariant = permutationReport.holds;

  const augmentedFailures = base.failures.slice();
  for (const failure of permutationFailures) {
    augmentedFailures.push({ F: failure, reason: failure });
  }

  const holds = base.holds && permutationInvariant;
  const descriptor = witness.label ?? "Hewitt–Savage zero–one";
  const details = holds
    ? `${descriptor}: Kolmogorov hypotheses and permutation invariance certify determinism.`
    : `${descriptor}: detected ${augmentedFailures.length} issue${augmentedFailures.length === 1 ? "" : "s"}.`;

  return {
    ...base,
    holds,
    failures: augmentedFailures,
    permutationInvariant,
    permutationFailures,
    ...(permutationReport === undefined ? {} : { permutationReport }),
    details,
  };
}
