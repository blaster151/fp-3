import type { RunnableExample } from "./types";

declare function require(id: string): any;

type Fin<T> = { readonly elems: ReadonlyArray<T> };
type Kernel<X, Y> = (x: X) => Map<Y, number>;

type HmmModule = {
  readonly viterbiDecode: <S, O>(
    states: Fin<S>,
    observations: Fin<O>,
    hmm: HMM<S, O>,
    samples: ReadonlyArray<O>,
    priorScores: ReadonlyArray<[S, number]>,
  ) => {
    readonly path: ReadonlyArray<S>;
    readonly bestFinal: S;
    readonly score: number;
    readonly last: Map<S, number>;
  };
  readonly forwardLog: <S, O>(
    states: Fin<S>,
    observations: Fin<O>,
    hmm: HMM<S, O>,
    samples: ReadonlyArray<O>,
    priorLog: ReadonlyArray<[S, number]>,
  ) => { readonly logZ: number; readonly alphas: ReadonlyArray<Map<S, number>> };
  readonly forwardProb: <S, O>(
    states: Fin<S>,
    observations: Fin<O>,
    hmm: HMM<S, O>,
    samples: ReadonlyArray<O>,
    priorProb: ReadonlyArray<[S, number]>,
  ) => { readonly Z: number; readonly alphas: ReadonlyArray<Map<S, number>> };
};

type HMM<S, O> = {
  readonly trans: Kernel<S, S>;
  readonly emit: Kernel<S, O>;
};

type MarkovCategoryModule = {
  readonly mkFin: <T>(elems: ReadonlyArray<T>) => Fin<T>;
};

type SemiringUtilsModule = {
  readonly LogProb: unknown;
  readonly TropicalMaxPlus: unknown;
};

type SemiringDistModule = {
  readonly normalizeR: <T>(rig: unknown, dist: Map<T, number>) => Map<T, number>;
};

const markovCategory = require("../../markov-category") as MarkovCategoryModule;
const hmmModule = require("../../hmm-viterbi") as HmmModule;
const semiringUtils = require("../../semiring-utils") as SemiringUtilsModule;
const semiringDist = require("../../semiring-dist") as SemiringDistModule;

const { mkFin } = markovCategory;
const { LogProb, TropicalMaxPlus } = semiringUtils;
const { normalizeR } = semiringDist;
const { viterbiDecode, forwardLog, forwardProb } = hmmModule;

type State = "healthy" | "sick";
type Observation = "normal" | "fever" | "dizzy";

const States = mkFin<State>(["healthy", "sick"]);
const Observations = mkFin<Observation>(["normal", "fever", "dizzy"]);

const transitionProbabilities: Record<State, Record<State, number>> = {
  healthy: { healthy: 0.7, sick: 0.3 },
  sick: { healthy: 0.4, sick: 0.6 },
};

const emissionProbabilities: Record<State, Record<Observation, number>> = {
  healthy: { normal: 0.8, fever: 0.15, dizzy: 0.05 },
  sick: { normal: 0.3, fever: 0.55, dizzy: 0.15 },
};

const priorProbabilities: Record<State, number> = {
  healthy: 0.85,
  sick: 0.15,
};

function makeLogKernel<Row extends string, Col extends string>(
  domain: Fin<Row>,
  codomain: Fin<Col>,
  table: Record<Row, Record<Col, number>>,
  rig: unknown,
): Kernel<Row, Col> {
  return (row: Row) => {
    const base = new Map<Col, number>();
    codomain.elems.forEach((col) => {
      const probability = table[row][col] ?? 0;
      const value = probability <= 0 ? -Infinity : Math.log(probability);
      base.set(col, value);
    });
    return normalizeR(rig, base);
  };
}

function makeProbabilityKernel<Row extends string, Col extends string>(
  codomain: Fin<Col>,
  table: Record<Row, Record<Col, number>>,
): Kernel<Row, Col> {
  return (row: Row) => {
    const dist = new Map<Col, number>();
    codomain.elems.forEach((col) => {
      dist.set(col, table[row][col] ?? 0);
    });
    return dist;
  };
}

const logTransitionKernel = makeLogKernel(States, States, transitionProbabilities, LogProb);
const tropicalTransitionKernel = makeLogKernel(States, States, transitionProbabilities, TropicalMaxPlus);
const probTransitionKernel = makeProbabilityKernel(States, transitionProbabilities);

const logEmissionKernel = makeLogKernel(States, Observations, emissionProbabilities, LogProb);
const tropicalEmissionKernel = makeLogKernel(States, Observations, emissionProbabilities, TropicalMaxPlus);
const probEmissionKernel = makeProbabilityKernel(Observations, emissionProbabilities);

const hmmLog: HMM<State, Observation> = { trans: logTransitionKernel, emit: logEmissionKernel };
const hmmTropical: HMM<State, Observation> = { trans: tropicalTransitionKernel, emit: tropicalEmissionKernel };
const hmmProb: HMM<State, Observation> = { trans: probTransitionKernel, emit: probEmissionKernel };

const observationSequence: ReadonlyArray<Observation> = ["normal", "fever", "fever", "normal"];

const priorLog: ReadonlyArray<[State, number]> = States.elems.map((state) => [
  state,
  Math.log(priorProbabilities[state]),
]);

const priorScores: ReadonlyArray<[State, number]> = priorLog;

const priorProb: ReadonlyArray<[State, number]> = States.elems.map((state) => [
  state,
  priorProbabilities[state],
]);

const stateLabelWidth = Math.max(...States.elems.map((state) => String(state).length));

function formatLogDistribution<S>(order: ReadonlyArray<S>, dist: Map<S, number>): readonly string[] {
  return order.map((item) => {
    const logWeight = dist.get(item) ?? -Infinity;
    const logDisplay = logWeight === -Infinity ? "-∞" : logWeight.toFixed(3);
    const probability = logWeight === -Infinity ? 0 : Math.exp(logWeight);
    return `  ${String(item).padEnd(stateLabelWidth, " ")} log=${logDisplay} prob=${probability.toFixed(3)}`;
  });
}

function formatProbDistribution<S>(order: ReadonlyArray<S>, dist: Map<S, number>): readonly string[] {
  return order.map((item) => {
    const probability = dist.get(item) ?? 0;
    return `  ${String(item).padEnd(stateLabelWidth, " ")} prob=${probability.toFixed(3)}`;
  });
}

function reconstructLogLikelihood(path: ReadonlyArray<State>, samples: ReadonlyArray<Observation>): number {
  if (path.length === 0) return Number.NEGATIVE_INFINITY;
  let total = Math.log(priorProbabilities[path[0]!]);
  for (let index = 0; index < path.length; index += 1) {
    const state = path[index]!;
    const observation = samples[index]!;
    total += Math.log(emissionProbabilities[state][observation]);
    if (index < path.length - 1) {
      const nextState = path[index + 1]!;
      total += Math.log(transitionProbabilities[state][nextState]);
    }
  }
  return total;
}

function describeViterbi(): readonly string[] {
  const result = viterbiDecode(States, Observations, hmmTropical, observationSequence, priorScores);
  const logLikelihood = reconstructLogLikelihood(result.path, observationSequence);
  const probability = logLikelihood === -Infinity ? 0 : Math.exp(logLikelihood);
  return [
    "== Viterbi decoding (tropical max-plus)==",
    `Observations → ${observationSequence.join(", ")}`,
    `Best path → ${result.path.join(" → ")}`,
    `Terminal state → ${result.bestFinal}`,
    `Reconstructed log-likelihood → ${logLikelihood.toFixed(3)} (prob ${probability.toFixed(4)})`,
    "Final time-step distribution (max-normalised)",
    ...formatLogDistribution(States.elems, result.last),
  ];
}

function describeForwardLog(): readonly string[] {
  const result = forwardLog(States, Observations, hmmLog, observationSequence, priorLog);
  const sections = result.alphas.map((alpha, index) => {
    const label = index === 0 ? "prior" : `after ${observationSequence[index - 1]}`;
    return [`  ${label}:`, ...formatLogDistribution(States.elems, alpha)];
  });
  const flattened = sections.flatMap((section, index, array) =>
    index === array.length - 1 ? section : [...section, ""],
  );
  const likelihood = Math.exp(result.logZ);
  return [
    "== Forward algorithm (log space)==",
    ...flattened,
    `Log-likelihood logZ → ${result.logZ.toFixed(3)} (prob ${likelihood.toFixed(4)})`,
  ];
}

function describeForwardProb(): readonly string[] {
  const result = forwardProb(States, Observations, hmmProb, observationSequence, priorProb);
  const sections = result.alphas.map((alpha, index) => {
    const label = index === 0 ? "prior" : `after ${observationSequence[index - 1]}`;
    const rows = formatProbDistribution(States.elems, alpha);
    const mass = Array.from(alpha.values()).reduce((sum, value) => sum + value, 0);
    return [`  ${label}:`, ...rows, `  mass check Σp = ${mass.toFixed(3)}`];
  });
  const flattened = sections.flatMap((section, index, array) =>
    index === array.length - 1 ? section : [...section, ""],
  );
  return [
    "== Forward algorithm (probability space)==",
    ...flattened,
    `Normalisation factor Z → ${result.Z.toFixed(3)}`,
  ];
}

export const stage052HiddenMarkovModelInferenceAlgorithms: RunnableExample = {
  id: "052",
  title: "Hidden Markov model inference algorithms",
  outlineReference: 52,
  summary:
    "Decode the most likely health trajectory with Viterbi and compare log-space vs probability forward passes for a finite hidden Markov model.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      describeViterbi(),
      describeForwardLog(),
      describeForwardProb(),
    ];

    const logs = sections.flatMap((section, index, array) =>
      index === array.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
