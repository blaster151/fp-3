// 🔮 BEGIN_MATH: MarkovDeterministicMorphism
// 📝 Brief: Relate deterministic kernels with comonoid homomorphisms inside Markov categories.
// 🏗️ Domain: Markov categories with designated copy/discard witnesses.
// 🔗 Integration: Builds on MarkovComonoidWitness data and Markov-category utilities.
// 📋 Plan:
//   1. Provide deterministic morphism witnesses tied to source/target comonoid data.
//   2. Extract deterministic base functions and compare against comonoid homomorphism checks.
//   3. Emit rich oracle reports exposing determinism diagnostics and constructive witnesses.

import type { Eq, Fin, Kernel, ComonoidHomReport, Pair, Show } from "./markov-category";
import {
  FinMarkov,
  ProbabilityWeightRig,
  approxEqualMatrix,
  checkComonoidHom,
  deterministic,
  tensorObj,
  fst,
  snd,
} from "./markov-category";
import { probabilityLegacyToRigged, probabilityRiggedToLegacy } from "./probability-monads";
import { buildMarkovComonoidWitness } from "./markov-comonoid-structure";
import type { MarkovComonoidWitness } from "./markov-comonoid-structure";
import type {
  DeterministicSetMultWitness,
  DeterministicSetMultResult,
  SetMulti,
  SetMultObj,
} from "./setmult-category";
import {
  isDeterministicSetMulti,
  kernelToSetMulti,
  setMultObjFromFin,
  setMultObjFromSet,
  setMultiToDeterministic,
} from "./setmult-category";
import type { MarkovConditionalReport, MarkovConditionalWitness } from "./markov-conditional-independence";
import { checkConditionalIndependence, conditionalMarginals } from "./markov-conditional-independence";
import type { SetObj } from "./set-cat";
import { isLazySet } from "./set-cat";
import { isDeterministic } from "./markov-laws";

export interface MarkovDeterministicWitness<X, Y> {
  readonly domain: MarkovComonoidWitness<X>;
  readonly codomain: MarkovComonoidWitness<Y>;
  readonly arrow: FinMarkov<X, Y>;
  readonly label?: string;
  readonly base?: (x: X) => Y;
}

export interface MarkovPositivityWitness<B, C> {
  readonly left: MarkovComonoidWitness<B>;
  readonly right: MarkovComonoidWitness<C>;
  readonly tensor: MarkovComonoidWitness<Pair<B, C>>;
  readonly projectLeft: FinMarkov<Pair<B, C>, B>;
  readonly projectRight: FinMarkov<Pair<B, C>, C>;
  readonly label?: string;
}

export interface DeterminismCounterexample<X, Y> {
  readonly input: X;
  readonly distribution: Map<Y, number>;
}

export type DeterministicFailureLaw = "determinism" | "copy" | "discard" | "equivalence";

export interface DeterministicFailure<X, Y> {
  readonly law: DeterministicFailureLaw;
  readonly message: string;
  readonly counterexample?: DeterminismCounterexample<X, Y>;
}

export interface MarkovDeterminismReport<X, Y> extends ComonoidHomReport {
  readonly holds: boolean;
  readonly deterministic: boolean;
  readonly comonoidHom: boolean;
  readonly equivalent: boolean;
  readonly witness: MarkovDeterministicWitness<X, Y>;
  readonly base?: (x: X) => Y;
  readonly details: string;
  readonly failures: ReadonlyArray<DeterministicFailure<X, Y>>;
}

export interface MarkovDeterministicWitnessOptions<X, Y> {
  readonly label?: string;
  readonly base?: (x: X) => Y;
}

export interface MarkovPositivityWitnessOptions<B, C> {
  readonly label?: string;
  readonly tensor?: MarkovComonoidWitness<Pair<B, C>>;
  readonly projectLeft?: FinMarkov<Pair<B, C>, B>;
  readonly projectRight?: FinMarkov<Pair<B, C>, C>;
}

export interface TensorMarginalDeterminismReport<A, B, C> {
  readonly holds: boolean;
  readonly equivalent: boolean;
  readonly tensor: MarkovDeterminismReport<A, Pair<B, C>>;
  readonly left: MarkovDeterminismReport<A, B>;
  readonly right: MarkovDeterminismReport<A, C>;
  readonly witness: {
    readonly domain: MarkovComonoidWitness<A>;
    readonly positivity: MarkovPositivityWitness<B, C>;
  };
  readonly details: string;
}

function describeObject<X>(witness: MarkovComonoidWitness<X>): string {
  const size = witness.object.elems.length;
  return witness.label ?? (size === 1 ? "terminal object" : `${size}-element object`);
}

function describeArrow<X, Y>(witness: MarkovDeterministicWitness<X, Y>): string {
  if (witness.label) return witness.label;
  const src = describeObject(witness.domain);
  const tgt = describeObject(witness.codomain);
  return `${src} → ${tgt}`;
}

function extractDeterministicBase<X, Y>(
  domain: Fin<X>,
  codomain: Fin<Y>,
  kernel: Kernel<X, Y>,
  tol = 1e-12,
):
  | { deterministic: true; base: (x: X) => Y }
  | { deterministic: false; counterexample: DeterminismCounterexample<X, Y> } {
  const samples = domain.elems;
  const riggedKernel = (x: X) => probabilityLegacyToRigged(kernel(x));
  const deterministic = isDeterministic(ProbabilityWeightRig, riggedKernel, samples);

  if (deterministic.det && deterministic.base !== undefined) {
    return { deterministic: true, base: deterministic.base };
  }

  for (const x of samples) {
    if (x === undefined) {
      throw new Error("Deterministic witnesses require total finite domains.");
    }
    const dist = riggedKernel(x);
    let support: Y | undefined;
    let nonZero = 0;
    let total = 0;
    for (const [y, weight] of dist.w.entries()) {
      total += weight;
      if (weight > tol) {
        nonZero += 1;
        if (support === undefined) {
          support = y;
        } else if (!codomain.eq(support, y)) {
          return {
            deterministic: false,
            counterexample: { input: x, distribution: probabilityRiggedToLegacy(dist) },
          };
        }
      }
    }
    if (support === undefined || nonZero !== 1 || Math.abs(total - 1) > tol) {
      return {
        deterministic: false,
        counterexample: { input: x, distribution: probabilityRiggedToLegacy(dist) },
      };
    }
  }

  const [first] = samples;
  if (first === undefined) {
    throw new Error("Deterministic witnesses require non-empty domains.");
  }
  return {
    deterministic: false,
    counterexample: { input: first, distribution: probabilityRiggedToLegacy(riggedKernel(first)) },
  };
}

export function buildMarkovDeterministicWitness<X, Y, Y0 extends Y>(
  domain: MarkovComonoidWitness<X>,
  codomain: MarkovComonoidWitness<Y0>,
  arrow: FinMarkov<X, Y>,
  options: MarkovDeterministicWitnessOptions<X, Y0> = {},
): MarkovDeterministicWitness<X, Y0> {
  const typedArrow = arrow as unknown as FinMarkov<X, Y0>;
  if (typedArrow.X !== domain.object) {
    throw new Error("Deterministic witness domain does not match the provided comonoid witness.");
  }
  if (typedArrow.Y !== codomain.object) {
    throw new Error("Deterministic witness codomain does not match the provided comonoid witness.");
  }
  return {
    domain,
    codomain,
    arrow: typedArrow,
    ...(options.label !== undefined ? { label: options.label } : {}),
    ...(options.base !== undefined ? { base: options.base } : {}),
  };
}

export function buildMarkovPositivityWitness<B, C>(
  left: MarkovComonoidWitness<B>,
  right: MarkovComonoidWitness<C>,
  options: MarkovPositivityWitnessOptions<B, C> = {},
): MarkovPositivityWitness<B, C> {
  const tensor =
    options.tensor ??
    buildMarkovComonoidWitness(
      tensorObj(left.object, right.object),
      options.label !== undefined ? { label: options.label } : undefined,
    );

  const defaultProjectLeft = new FinMarkov(tensor.object, left.object, fst<B, C>());
  const defaultProjectRight = new FinMarkov(tensor.object, right.object, snd<B, C>());

  const projectLeft = options.projectLeft ?? defaultProjectLeft;
  const projectRight = options.projectRight ?? defaultProjectRight;

  if (projectLeft.X !== tensor.object || projectRight.X !== tensor.object) {
    throw new Error("Positivity projections must originate from the tensor object.");
  }
  if (projectLeft.Y !== left.object) {
    throw new Error("Left projection does not land in the left witness object.");
  }
  if (projectRight.Y !== right.object) {
    throw new Error("Right projection does not land in the right witness object.");
  }

  return {
    left,
    right,
    tensor,
    projectLeft,
    projectRight,
    ...(options.label !== undefined ? { label: options.label } : {}),
  };
}

export function checkDeterministicComonoid<X, Y>(
  witness: MarkovDeterministicWitness<X, Y>,
): MarkovDeterminismReport<X, Y> {
  const { domain, codomain, arrow } = witness;
  const descriptor = describeArrow(witness);

  const detResult = extractDeterministicBase(domain.object, codomain.object, arrow.k);
  const deterministic = detResult.deterministic;
  const base = deterministic ? detResult.base : undefined;

  const hom = checkComonoidHom(domain.object, codomain.object, arrow.k);
  const comonoidHom = hom.preservesCopy && hom.preservesDiscard;
  const equivalent = deterministic === comonoidHom;
  const holds = deterministic && comonoidHom;

  const failures: DeterministicFailure<X, Y>[] = [];

  if (!deterministic) {
    const counterexample = (detResult as { counterexample?: DeterminismCounterexample<X, Y> }).counterexample;
    failures.push(
      counterexample !== undefined
        ? {
            law: "determinism",
            message: `Kernel ${descriptor} is not deterministic: found a non-Dirac output.`,
            counterexample,
          }
        : {
            law: "determinism",
            message: `Kernel ${descriptor} is not deterministic: found a non-Dirac output.`,
          },
    );
  }
  if (!hom.preservesCopy) {
    failures.push({ law: "copy", message: `Copy law failed for ${descriptor}.` });
  }
  if (!hom.preservesDiscard) {
    failures.push({ law: "discard", message: `Discard law failed for ${descriptor}.` });
  }
  if (!equivalent) {
    failures.push({ law: "equivalence", message: `Determinism and comonoid homomorphism disagreed for ${descriptor}.` });
  }

  const details = holds
    ? `Morphism ${descriptor} is deterministic and preserves copy/discard.`
    : `${failures.length} determinism check${failures.length === 1 ? "" : "s"} failed for ${descriptor}.`;

  return {
    ...hom,
    holds,
    deterministic,
    comonoidHom,
    equivalent,
    witness,
    details,
    failures,
    ...(base !== undefined ? { base } : {}),
  };
}

export function certifyDeterministicFunction<X, Y>(
  domain: MarkovComonoidWitness<X>,
  codomain: MarkovComonoidWitness<Y>,
  base: (x: X) => Y,
  options: MarkovDeterministicWitnessOptions<X, Y> = {},
): MarkovDeterministicWitness<X, Y> {
  const arrow = new FinMarkov(domain.object, codomain.object, deterministic(base));
  return buildMarkovDeterministicWitness(domain, codomain, arrow, { ...options, base });
}

export function checkDeterministicTensorViaMarginals<A, B, C>(
  domain: MarkovComonoidWitness<A>,
  positivity: MarkovPositivityWitness<B, C>,
  arrow: FinMarkov<A, Pair<B, C>>,
  options: MarkovDeterministicWitnessOptions<A, Pair<B, C>> = {},
): TensorMarginalDeterminismReport<A, B, C> {
  if (arrow.Y !== positivity.tensor.object) {
    throw new Error("Tensor arrow codomain does not match the positivity witness tensor object.");
  }

  const tensorWitness = buildMarkovDeterministicWitness(domain, positivity.tensor, arrow, options);
  const tensorReport = checkDeterministicComonoid(tensorWitness);

  const leftArrow = arrow.then(positivity.projectLeft);
  const rightArrow = arrow.then(positivity.projectRight);

  const leftWitness = buildMarkovDeterministicWitness(domain, positivity.left, leftArrow);
  const rightWitness = buildMarkovDeterministicWitness(domain, positivity.right, rightArrow);

  const leftReport = checkDeterministicComonoid(leftWitness);
  const rightReport = checkDeterministicComonoid(rightWitness);

  const marginalsDeterministic = leftReport.deterministic && rightReport.deterministic;
  const equivalent = tensorReport.deterministic === marginalsDeterministic;
  const holds = equivalent;

  const descriptor = tensorWitness.label ?? positivity.label ?? "tensor morphism";
  const details = holds
    ? `Determinism of ${descriptor} matches the determinism of both marginals.`
    : `Determinism of ${descriptor} disagrees with its marginals.`;

  return {
    holds,
    equivalent,
    tensor: tensorReport,
    left: leftReport,
    right: rightReport,
    witness: { domain, positivity },
    details,
  };
}

export interface DeterminismLemmaWitness<A, X, T> {
  readonly conditional: MarkovConditionalWitness<A>;
  readonly p: FinMarkov<A, X>;
  readonly deterministic: MarkovDeterministicWitness<X, T>;
  readonly xIndex?: number;
  readonly tIndex?: number;
  readonly label?: string;
}

export interface DeterminismLemmaOptions<A> {
  readonly permutations?: ReadonlyArray<ReadonlyArray<number>>;
  readonly tolerance?: number;
  readonly conditionalReport?: MarkovConditionalReport<A>;
}

export type DeterminismLemmaFailureLaw =
  | "conditionalIndependence"
  | "deterministicComponent"
  | "marginalMismatch"
  | "compositeDeterminism";

export interface DeterminismLemmaFailure {
  readonly law: DeterminismLemmaFailureLaw;
  readonly message: string;
}

export interface DeterminismLemmaReport<A, X, T> {
  readonly holds: boolean;
  readonly witness: {
    readonly conditional: MarkovConditionalWitness<A>;
    readonly p: FinMarkov<A, X>;
    readonly deterministic: MarkovDeterministicWitness<X, T>;
    readonly xIndex: number;
    readonly tIndex: number;
  };
  readonly conditional: MarkovConditionalReport<A>;
  readonly deterministic: MarkovDeterminismReport<X, T>;
  readonly composite: MarkovDeterminismReport<A, T>;
  readonly marginals: {
    readonly x: FinMarkov<A, X>;
    readonly t: FinMarkov<A, T>;
  };
  readonly compositeArrow: FinMarkov<A, T>;
  readonly failures: ReadonlyArray<DeterminismLemmaFailure>;
  readonly details: string;
}

export function checkDeterminismLemma<A, X, T>(
  witness: DeterminismLemmaWitness<A, X, T>,
  options: DeterminismLemmaOptions<A> = {},
): DeterminismLemmaReport<A, X, T> {
  const { conditional, p, deterministic } = witness;
  const xIndex = witness.xIndex ?? 0;
  const tIndex = witness.tIndex ?? 1;

  if (xIndex === tIndex) {
    throw new Error("Determinism lemma requires distinct indices for X and T marginals.");
  }

  if (xIndex < 0 || xIndex >= conditional.outputs.length) {
    throw new Error(`X marginal index ${xIndex} is outside the conditional witness outputs.`);
  }
  if (tIndex < 0 || tIndex >= conditional.outputs.length) {
    throw new Error(`T marginal index ${tIndex} is outside the conditional witness outputs.`);
  }

  if (p.X !== conditional.domain.object) {
    throw new Error("Kernel p must share the conditional witness domain.");
  }

  const xWitness = conditional.outputs[xIndex];
  const tWitness = conditional.outputs[tIndex];
  if (xWitness === undefined) {
    throw new Error("Conditional witness is missing the X marginal at the requested index.");
  }
  if (tWitness === undefined) {
    throw new Error("Conditional witness is missing the T marginal at the requested index.");
  }

  if (p.Y !== xWitness.object) {
    throw new Error("Kernel p must land in the X output of the conditional witness.");
  }
  if (deterministic.domain.object !== xWitness.object) {
    throw new Error("Deterministic arrow s must consume the X output object.");
  }
  if (deterministic.codomain.object !== tWitness.object) {
    throw new Error("Deterministic arrow s must land in the T output object.");
  }

  const tol = options.tolerance ?? 1e-9;
  const components = conditionalMarginals(conditional);
  const xMarginal = components[xIndex] as FinMarkov<A, X>;
  const tMarginal = components[tIndex] as FinMarkov<A, T>;

  const conditionalReport =
    options.conditionalReport ??
    checkConditionalIndependence(conditional, options.permutations ? { permutations: options.permutations } : {});

  const deterministicReport = checkDeterministicComonoid(deterministic);

  const compositeArrow = p.then(deterministic.arrow);
  const compositeLabel = witness.label ? `${witness.label} composite` : undefined;
  const compositeWitness = buildMarkovDeterministicWitness(
    conditional.domain,
    deterministic.codomain,
    compositeArrow,
    compositeLabel === undefined ? {} : { label: compositeLabel },
  );
  const compositeReport = checkDeterministicComonoid(compositeWitness);

  const failures: DeterminismLemmaFailure[] = [];

  const xMatches = approxEqualMatrix(xMarginal.matrix(), p.matrix(), tol);
  if (!xMatches) {
    failures.push({
      law: "marginalMismatch",
      message: "Conditional witness first marginal does not match the provided kernel p.",
    });
  }

  const tMatches = approxEqualMatrix(tMarginal.matrix(), compositeArrow.matrix(), tol);
  if (!tMatches) {
    failures.push({
      law: "marginalMismatch",
      message: "Conditional witness T marginal does not match the composite s ∘ p.",
    });
  }

  if (!deterministicReport.holds) {
    failures.push({
      law: "deterministicComponent",
      message: deterministicReport.details,
    });
  }

  if (!conditionalReport.holds) {
    failures.push({
      law: "conditionalIndependence",
      message: conditionalReport.details,
    });
  }

  if (!compositeReport.deterministic) {
    failures.push({
      law: "compositeDeterminism",
      message: compositeReport.details,
    });
  }

  const holds =
    failures.length === 0 &&
    conditionalReport.holds &&
    deterministicReport.deterministic &&
    compositeReport.deterministic;

  const compositeDescriptor = describeArrow(compositeWitness);
  const descriptor = witness.label ?? "determinism lemma";
  const details = holds
    ? `${descriptor}: composite ${compositeDescriptor} is deterministic under the conditional independence hypothesis.`
    : `${descriptor}: detected ${failures.length} issue${failures.length === 1 ? "" : "s"} while applying the determinism lemma.`;

  return {
    holds,
    witness: { conditional, p, deterministic, xIndex, tIndex },
    conditional: conditionalReport,
    deterministic: deterministicReport,
    composite: compositeReport,
    marginals: { x: xMarginal, t: tMarginal },
    compositeArrow,
    failures,
    details,
  };
}

const equalSet = <T>(eq: (a: T, b: T) => boolean, left: ReadonlySet<T>, right: ReadonlySet<T>): boolean => {
  if (left.size !== right.size) return false;
  for (const value of left) {
    let found = false;
    for (const candidate of right) {
      if (eq(candidate, value)) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
};

export interface SetMultDeterminismOptions<X, Y> {
  readonly label?: string;
  readonly arrow?: FinMarkov<X, Y>;
  readonly domainEq?: Eq<X>;
  readonly domainShow?: Show<X>;
  readonly codomainEq?: Eq<Y>;
  readonly codomainShow?: Show<Y>;
  readonly domainSamples?: ReadonlyArray<X>;
  readonly codomainSamples?: ReadonlyArray<Y>;
  readonly domainIncludeSamples?: boolean;
  readonly codomainIncludeSamples?: boolean;
}

export interface SetMultDeterminismWitness<X, Y> {
  readonly domain: Fin<X> | SetObj<X>;
  readonly codomain: Fin<Y> | SetObj<Y>;
  readonly morphism: SetMulti<X, Y>;
  readonly setWitness: DeterministicSetMultWitness<X, Y>;
  readonly arrow?: FinMarkov<X, Y>;
  readonly label?: string;
}

export interface SetMultDeterminismReport<X, Y> {
  readonly holds: boolean;
  readonly deterministic: DeterministicSetMultResult<X, Y>;
  readonly matchesKernel: boolean;
  readonly witness: SetMultDeterminismWitness<X, Y>;
  readonly base?: (a: X) => Y;
  readonly mismatches: ReadonlyArray<{ readonly input: X; readonly setMult: ReadonlySet<Y>; readonly kernel: ReadonlySet<Y> }>;
  readonly details: string;
}

const isFinCarrier = <T>(carrier: Fin<T> | SetObj<T>): carrier is Fin<T> =>
  !(carrier instanceof Set) && !isLazySet(carrier);

const enumerateCarrier = <T>(carrier: Fin<T> | SetObj<T>): ReadonlyArray<T> =>
  isFinCarrier(carrier) ? carrier.elems : Array.from(carrier);

const buildSetMultObj = <T>(
  carrier: Fin<T> | SetObj<T>,
  label: string | undefined,
  eq: Eq<T> | undefined,
  show: Show<T> | undefined,
  samples: ReadonlyArray<T> | undefined,
  includeSamples: boolean | undefined,
): SetMultObj<T> => {
  if (isFinCarrier(carrier)) {
    return setMultObjFromFin(carrier, label);
  }
  return setMultObjFromSet(carrier, {
    ...(eq !== undefined ? { eq } : {}),
    ...(show !== undefined ? { show } : {}),
    ...(label !== undefined ? { label } : {}),
    ...(samples !== undefined ? { samples } : {}),
    ...(includeSamples !== undefined ? { includeSamples } : {}),
  });
};

export function buildSetMultDeterminismWitness<X, Y>(
  domain: Fin<X> | SetObj<X>,
  codomain: Fin<Y> | SetObj<Y>,
  morphism: SetMulti<X, Y>,
  options: SetMultDeterminismOptions<X, Y> = {},
): SetMultDeterminismWitness<X, Y> {
  const domainLabel = options.label ? `${options.label} domain` : undefined;
  const codomainLabel = options.label ? `${options.label} codomain` : undefined;
  const setWitness: DeterministicSetMultWitness<X, Y> = {
    domain: buildSetMultObj(
      domain,
      domainLabel,
      options.domainEq,
      options.domainShow,
      options.domainSamples,
      options.domainIncludeSamples,
    ),
    codomain: buildSetMultObj(
      codomain,
      codomainLabel,
      options.codomainEq,
      options.codomainShow,
      options.codomainSamples,
      options.codomainIncludeSamples,
    ),
    morphism,
    ...(options.label !== undefined ? { label: options.label } : {}),
  };
  return {
    domain,
    codomain,
    morphism,
    setWitness,
    ...(options.arrow !== undefined ? { arrow: options.arrow } : {}),
    ...(options.label !== undefined ? { label: options.label } : {}),
  };
}

export function checkSetMultDeterminism<X, Y>(
  witness: SetMultDeterminismWitness<X, Y>,
): SetMultDeterminismReport<X, Y> {
  const samples =
    witness.setWitness.domain.samples ?? enumerateCarrier(witness.domain);
  const deterministic = isDeterministicSetMulti(witness.setWitness, { samples });
  const mismatches: Array<{ input: X; setMult: ReadonlySet<Y>; kernel: ReadonlySet<Y> }> = [];
  let matchesKernel = true;

  if (witness.arrow) {
    if (!isFinCarrier(witness.domain) || !isFinCarrier(witness.codomain)) {
      throw new Error("SetMult determinism witnesses with arrows require finite carriers");
    }
    const kernelMulti = kernelToSetMulti(witness.codomain, witness.arrow.k);
    const eq = witness.setWitness.codomain.eq;
    for (const input of witness.domain.elems) {
      const setMultFibre = witness.morphism(input);
      const kernelFibre = kernelMulti(input);
      if (!equalSet(eq, setMultFibre, kernelFibre)) {
        matchesKernel = false;
        mismatches.push({ input, setMult: setMultFibre, kernel: kernelFibre });
      }
    }
  }

  const holds = deterministic.deterministic && matchesKernel;
  const details = holds
    ? "SetMult morphism is deterministic and matches the kernel support"
    : matchesKernel
    ? "SetMult morphism is not deterministic"
    : deterministic.deterministic
    ? "SetMult morphism disagrees with the kernel support"
    : "SetMult morphism failed determinism and kernel compatibility";

  return {
    holds,
    deterministic,
    matchesKernel,
    witness,
    mismatches,
    details,
    ...(deterministic.deterministic ? { base: deterministic.base } : {}),
  };
}

// ✅ END_MATH: MarkovDeterministicMorphism
// 🔮 Oracles: checkDeterministicComonoid, checkDeterministicTensorViaMarginals, checkDeterminismLemma, checkSetMultDeterminism
// 🧪 Tests: law.MarkovCategory.spec.ts deterministic/comonoid suite
// 📊 Coverage: Finite Markov kernels; extendable to inverse-limit carriers via projective witnesses
