// markov-regression-oracles.ts — Regression oracles for the FinMarkov refactor stage
// These helpers assert that the new semiring-bridged kernels behave like the
// legacy Map-based implementation for determinism, thunkability, and tensor
// strength. They are used to validate each stage of the staged Markov family
// refactor.

import type { Fin, FinMarkov, Pair } from "./markov-category";
import { ProbabilityWeightRig } from "./markov-category";
import type { Dist } from "./dist";
import { isDeterministic } from "./markov-laws";
import { checkThunkabilityRobust } from "./markov-thunkable";
import { independentProduct, equalDist } from "./markov-monoidal";
import { probabilityLegacyToRigged } from "./probability-monads";

const toRiggedKernel = <A, B>(arrow: FinMarkov<A, B>) =>
  (a: A): Dist<number, B> => probabilityLegacyToRigged(arrow.k(a));

const cartesianSamples = <A, B>(Xa: Fin<A>, Xb: Fin<B>): Array<Pair<A, B>> => {
  const pairs: Array<Pair<A, B>> = [];
  for (const a of Xa.elems) {
    if (a === undefined) continue;
    for (const b of Xb.elems) {
      if (b === undefined) continue;
      pairs.push([a, b]);
    }
  }
  return pairs;
};

export function checkFinMarkovDeterminism<A, B>(
  arrow: FinMarkov<A, B>,
  options?: { readonly domain?: ReadonlyArray<A> },
): {
  readonly det: boolean;
  readonly samples: number;
  readonly details: string;
  readonly base?: (a: A) => B;
} {
  const domain = options?.domain ?? arrow.X.elems;
  const kernel = toRiggedKernel(arrow);
  const determinism = isDeterministic(ProbabilityWeightRig, kernel, domain);
  const details = determinism.det
    ? `Deterministic across ${domain.length} inputs using Probability rig`
    : `Failed determinism probe across ${domain.length} inputs`;
  return {
    det: determinism.det,
    samples: domain.length,
    details,
    ...(determinism.base !== undefined && { base: determinism.base }),
  };
}

export function checkFinMarkovThunkability<A, B>(
  arrow: FinMarkov<A, B>,
  options?: { readonly domain?: ReadonlyArray<A> },
): {
  readonly thunkable: boolean;
  readonly deterministic: boolean;
  readonly agreement: boolean;
  readonly details: string;
} {
  const domain = options?.domain ?? arrow.X.elems;
  const kernel = toRiggedKernel(arrow);
  const thunk = checkThunkabilityRobust(ProbabilityWeightRig, kernel, domain);
  const determinism = isDeterministic(ProbabilityWeightRig, kernel, domain);
  const baseAgreement =
    thunk.base && determinism.base
      ? domain.every((a) => thunk.base?.(a) === determinism.base?.(a))
      : undefined;
  const parts = [thunk.details];
  if (!determinism.det) {
    parts.push("Determinism recognizer flagged a non-Dirac support");
  }
  if (baseAgreement === false) {
    parts.push("Base function witnesses diverge on supplied samples");
  }
  return {
    thunkable: thunk.thunkable,
    deterministic: determinism.det,
    agreement:
      thunk.thunkable === determinism.det && (baseAgreement ?? true),
    details: parts.join("; "),
  };
}

export function checkFinMarkovTensorStrength<A, B, C, D>(
  left: FinMarkov<A, B>,
  right: FinMarkov<C, D>,
  options?: { readonly samples?: ReadonlyArray<Pair<A, C>> },
): {
  readonly tensorMatchesIndependentProduct: boolean;
  readonly checked: number;
  readonly details: string;
} {
  const samplePairs = options?.samples ?? cartesianSamples(left.X, right.X);
  const leftKernel = toRiggedKernel(left);
  const rightKernel = toRiggedKernel(right);
  const tensored = left.tensor(right);
  const failures: Array<string> = [];
  for (const pair of samplePairs) {
    const [a, c] = pair;
    const tensorOut = probabilityLegacyToRigged(tensored.k(pair));
    const productOut = independentProduct(
      ProbabilityWeightRig,
      leftKernel(a),
      rightKernel(c),
    );
    if (!equalDist(ProbabilityWeightRig, tensorOut, productOut)) {
      failures.push(`tensor≠product at (${String(a)}, ${String(c)})`);
    }
  }
  const ok = failures.length === 0;
  return {
    tensorMatchesIndependentProduct: ok,
    checked: samplePairs.length,
    details: ok
      ? `Tensor agrees with independentProduct on ${samplePairs.length} samples`
      : failures.join("; "),
  };
}
