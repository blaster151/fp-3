import type {
  Module,
  ModuleHomomorphism,
  ShortExactSequence,
  ShortExactSequenceSample,
  FlatTensorStructures,
  FlatModuleCheckResult,
  BilinearMap,
} from "../../allTS";
import { AlgebraOracles } from "../../algebra-oracles";
import {
  CommutativeRingSamples,
  type ModuleSample,
  type DualNumber,
} from "./092-commutative-ring-sample-library";
import type { RunnableExample } from "./types";

const mod2 = (value: bigint): bigint => {
  const remainder = value % 2n;
  return remainder >= 0n ? remainder : remainder + 2n;
};

const describeBoolean = (value: boolean): string => (value ? "yes" : "no");

const renderLines = (label: string, lines: ReadonlyArray<string>): readonly string[] => [
  `== ${label} ==`,
  ...lines,
];

const describeLocalRingChecks = (): readonly string[] => {
  const integerSamples = CommutativeRingSamples.integers;
  const primeSample = integerSamples.ring.primePoints.find((entry) => entry.point.label === "(2)");
  if (!primeSample) {
    return ["No (2) prime ideal sample found in ℤ spectrum library."];
  }

  const { point } = primeSample;
  const multiplicativeSet = primeSample.complement;
  const localizationOptions = primeSample.localization?.options;

  const failureSet = {
    ...primeSample.complement,
    contains: (value: bigint) => value !== 0n && value % 2n === 0n,
    label: "S' = even multiples",
  };

  const sharedOptions = {
    ringSamples: integerSamples.ring.ringSamples,
    ...(localizationOptions ? { localization: localizationOptions } : {}),
  } as const;

  const success = AlgebraOracles.ring.localRing(point, multiplicativeSet, sharedOptions);

  const failure = AlgebraOracles.ring.localRing(point, failureSet, sharedOptions);

  const summarize = (heading: string, result: typeof success): readonly string[] => {
    const status = result.holds ? "✅" : "❌";
    const multiplicativeSummary = result.multiplicativeSet
      ? `multiplicative set checks: ${describeBoolean(result.multiplicativeSet.holds)}`
      : "multiplicative set checks: skipped";
    const localizationSummary = result.localization
      ? `localization checks: ${describeBoolean(result.localization.holds)}`
      : "localization checks: skipped";

    return [
      `${status} ${heading}: ${result.details}`,
      `  ring sample candidates: ${result.metadata.ringSampleCandidates}`,
      `  prime validated? ${describeBoolean(result.metadata.primeChecked)}`,
      `  multiplicative set validated? ${describeBoolean(result.metadata.multiplicativeSetChecked)}`,
      `  localization validated? ${describeBoolean(result.metadata.localizationChecked)}`,
      `  ${multiplicativeSummary}`,
      `  ${localizationSummary}`,
    ];
  };

  return [
    ...summarize("ℤ_(2) localization", success),
    "",
    ...summarize("Even complement fails", failure),
  ];
};

const describeNoetherianSampling = (): readonly string[] => {
  const integerModuleSample = CommutativeRingSamples.integers.modules[0];
  if (!integerModuleSample) {
    return ["ℤ module samples unavailable."];
  }
  const chain = integerModuleSample.ascendingChains?.[0];
  if (!chain) {
    return ["ℤ module chain samples unavailable."];
  }

  const success = AlgebraOracles.ring.noetherianModule(chain, {
    vectorSamples: integerModuleSample.vectorSamples,
  });

  const failureChain = {
    module: chain.module,
    generatorSamples: [[0n], [2n], [4n], [8n]],
    label: "Even multiples never generate ℤ",
  };

  const failure = AlgebraOracles.ring.noetherianModule(failureChain, {
    vectorSamples: integerModuleSample.vectorSamples,
  });

  const summarize = (heading: string, result: typeof success): readonly string[] => {
    const status = result.holds ? "✅" : "❌";
    const stabilization = result.metadata.stabilizationIndex;
    const stabilizationSummary =
      stabilization !== undefined
        ? `stabilization index: ${stabilization}`
        : `stabilized? ${describeBoolean(result.metadata.stabilized)}`;
    return [
      `${status} ${heading}: ${result.details}`,
      `  stages tested: ${result.metadata.stagesTested}`,
      `  generator samples: ${result.metadata.generatorSamples}`,
      `  exhausted provided chain? ${describeBoolean(result.metadata.exhaustedChain)}`,
      `  reached stage limit? ${describeBoolean(result.metadata.reachedLimit)}`,
      `  ${stabilizationSummary}`,
      ...(result.violations.length > 0
        ? result.violations.map((violation) =>
            violation.kind === "chainDidNotStabilize"
              ? `  violation: chain stalled at stage ${violation.stageIndex}`
              : `  violation: missing vectors after stage ${violation.stageIndex}`,
          )
        : []),
    ];
  };

  return [
    ...summarize("Stabilizing principal ideals", success),
    "",
    ...summarize("Non-stabilizing even tower", failure),
  ];
};

const buildZMod2Module = (ringModule: Module<bigint, bigint>): Module<bigint, bigint> => ({
  ring: ringModule.ring,
  zero: 0n,
  add: (left, right) => mod2(left + right),
  neg: (value) => mod2(-value),
  scalar: (scalar, value) => mod2(scalar * value),
  eq: (left, right) => mod2(left) === mod2(right),
  name: "ℤ/2ℤ",
});

const buildShortExactSequence = (
  integers: Module<bigint, bigint>,
  integersMod2: Module<bigint, bigint>,
) => {
  const include: ModuleHomomorphism<bigint, bigint, bigint> = {
    source: integers,
    target: integers,
    map: (value) => 2n * value,
    label: "×2",
  };

  const project: ModuleHomomorphism<bigint, bigint, bigint> = {
    source: integers,
    target: integersMod2,
    map: (value) => mod2(value),
    label: "mod 2",
  };

  const sequence: ShortExactSequence<bigint, bigint, bigint, bigint> = {
    left: integers,
    middle: integers,
    right: integersMod2,
    include,
    project,
    witnesses: {
      kernelWitnesses: [
        { middle: 0n, preimage: 0n },
        { middle: 2n, preimage: 1n },
      ],
      surjectionWitnesses: [
        { right: 0n, lift: 0n },
        { right: 1n, lift: 1n },
      ],
      injectWitnesses: [0n],
    },
    label: "0 → ℤ → ℤ → ℤ/2ℤ → 0",
  };

  return sequence;
};

const buildTensorStructures = <Candidate>(
  sequence: ShortExactSequence<bigint, bigint, bigint, bigint>,
  candidate: Module<bigint, Candidate>,
): FlatTensorStructures<bigint, bigint, bigint, bigint, Candidate, Candidate, Candidate, Candidate> => {
  const labelBase = candidate.name ?? "M";

  const makeTensor = (source: Module<bigint, bigint>, label: string) => ({
    left: source,
    right: candidate,
    tensor: candidate,
    pureTensor: (left: bigint, right: Candidate) => candidate.scalar(left, right),
    induce: <Codomain>(bilinear: BilinearMap<bigint, bigint, Candidate, Codomain>): ModuleHomomorphism<
      bigint,
      Candidate,
      Codomain
    > => ({
      source: candidate,
      target: bilinear.target,
      map: (value) => bilinear.map(1n, value),
      label: `${label}⊗${bilinear.label ?? "β"}`,
    }),
    label,
  });

  return {
    left: makeTensor(sequence.left, `${sequence.left.name ?? "L"}⊗${labelBase}`),
    middle: makeTensor(sequence.middle, `${sequence.middle.name ?? "M"}⊗${labelBase}`),
    right: makeTensor(sequence.right, `${sequence.right.name ?? "R"}⊗${labelBase}`),
  };
};

const findDualNumberZModule = (): ModuleSample<bigint, DualNumber> | undefined =>
  CommutativeRingSamples.dualNumbersOverZ.modules.find(
    (sample): sample is ModuleSample<bigint, DualNumber> => sample.module.ring === CommutativeRingSamples.integers.ring.ring,
  );

const describeFlatnessSampling = (): readonly string[] => {
  const integerModuleSample = CommutativeRingSamples.integers.modules[0];
  if (!integerModuleSample) {
    return ["ℤ module samples unavailable."];
  }
  const integers = integerModuleSample.module;
  const integersMod2 = buildZMod2Module(integers);
  const dualModuleSample = findDualNumberZModule();
  if (!dualModuleSample) {
    return ["Dual-number ℤ-module sample unavailable."];
  }
  const dualModule = dualModuleSample.module;

  const sequence = buildShortExactSequence(integers, integersMod2);

  const tensorForIntegers = buildTensorStructures(sequence, integers);
  const tensorForDuals = buildTensorStructures(sequence, dualModule);
  const tensorForMod2 = buildTensorStructures(sequence, integersMod2);

  const sequenceSamples: ReadonlyArray<ShortExactSequenceSample<bigint, bigint, bigint>> = [
    { kind: "kernel", middle: 2n, preimage: 1n },
    { kind: "surjection", right: 1n, lift: 1n },
    { kind: "inject", left: 1n },
  ];

  const flatIntegers = AlgebraOracles.ring.flatness(
    { sequence, candidate: integers, tensors: tensorForIntegers },
    {
      scalarSamples: [-1n, 0n, 1n, 2n],
      candidateSamples: integerModuleSample.vectorSamples,
      leftSamples: [-1n, 0n, 1n],
      middleSamples: [-2n, 0n, 2n],
      rightSamples: [0n, 1n],
      sequenceSamples,
      witnessLimit: 4,
    },
  );

  const flatDuals = AlgebraOracles.ring.flatness(
    { sequence, candidate: dualModule, tensors: tensorForDuals },
    {
      scalarSamples: [-1n, 0n, 1n],
      candidateSamples: dualModuleSample.vectorSamples,
      leftSamples: [-1n, 0n, 1n],
      middleSamples: [-2n, 0n, 2n],
      rightSamples: [0n, 1n],
      sequenceSamples,
      witnessLimit: 4,
    },
  );

  const nonFlat = AlgebraOracles.ring.flatness(
    { sequence, candidate: integersMod2, tensors: tensorForMod2 },
    {
      scalarSamples: [0n, 1n],
      candidateSamples: [0n, 1n],
      leftSamples: [0n, 1n],
      middleSamples: [0n, 2n],
      rightSamples: [0n, 1n],
      sequenceSamples,
    },
  );

  const summarize = (
    heading: string,
    result: FlatModuleCheckResult<bigint, bigint, bigint, unknown>,
  ): readonly string[] => {
    const status = result.holds ? "✅" : "❌";
    return [
      `${status} ${heading}: ${result.details}`,
      `  witnesses recorded: ${result.metadata.witnessesRecorded}`,
      `  kernel witness count: ${result.metadata.kernelWitnesses}`,
      `  surjection witness count: ${result.metadata.surjectionWitnesses}`,
      `  inject witness count: ${result.metadata.injectWitnesses}`,
      `  tensor checks (L/M/R): ${describeBoolean(result.metadata.tensorLeftHolds)}/${describeBoolean(
        result.metadata.tensorMiddleHolds,
      )}/${describeBoolean(result.metadata.tensorRightHolds)}`,
      ...(result.violations.length > 0
        ? result.violations.map((violation) => `  violation: ${violation.kind}`)
        : []),
    ];
  };

  return [
    ...summarize("ℤ is flat over itself", flatIntegers),
    "",
    ...summarize("Dual numbers remain flat over ℤ", flatDuals),
    "",
    ...summarize("ℤ/2ℤ fails flatness", nonFlat),
  ];
};

const runCommutativeRingOracleSamples = () => {
  const logs = [
    ...renderLines("Local ring diagnostics", describeLocalRingChecks()),
    "",
    ...renderLines("Noetherian sampling", describeNoetherianSampling()),
    "",
    ...renderLines("Flatness witnesses", describeFlatnessSampling()),
  ];

  return { logs };
};

export const stage091CommutativeRingOracleSamples: RunnableExample = {
  id: "091",
  title: "Commutative ring oracle samples",
  outlineReference: 89,
  summary:
    "Runs localization, Noetherian, and flatness diagnostics on reusable ℤ, ℤ[ε]/(ε²), and ℤ/2ℤ samples from the ring library.",
  async run() {
    return runCommutativeRingOracleSamples();
  },
};
