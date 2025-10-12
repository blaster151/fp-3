import { RunnableExample } from "./types";

type InitialObjectWitness<O, M> = {
  readonly object: O;
  readonly morphismTo: (target: O) => M;
  readonly isCanonical: (target: O, candidate: M) => boolean;
  readonly describe?: (target: O) => string;
};

type SemicartesianStructure<O, M> = {
  readonly unit: O;
  readonly globalElement: (target: O) => M;
};

type InitialUnitSemicartesianData<O, M> = {
  readonly unit: O;
  readonly witness: InitialObjectWitness<O, M>;
};

type InitialArrowSample<O, M> = {
  readonly target: O;
  readonly candidate: M;
  readonly shouldHold: boolean;
  readonly label?: string;
};

type InitialUnitSemicartesianResult<O, M> = {
  readonly holds: boolean;
  readonly witness: SemicartesianStructure<O, M>;
  readonly details: string;
  readonly failures: ReadonlyArray<{ readonly target: O; readonly reason: string }>;
  readonly sampleResults: ReadonlyArray<{
    readonly label?: string;
    readonly target: O;
    readonly expected: boolean;
    readonly actual: boolean;
  }>;
};

function deriveSemicartesianFromInitial<O, M>(
  data: InitialUnitSemicartesianData<O, M>,
): SemicartesianStructure<O, M> {
  const { unit, witness } = data;
  if (unit !== witness.object) {
    throw new Error("Initial witness must reference the tensor unit object");
  }
  return {
    unit,
    globalElement: witness.morphismTo,
  };
}

function checkInitialUnitSemicartesian<O, M>(
  data: InitialUnitSemicartesianData<O, M>,
  targets: ReadonlyArray<O>,
  samples: ReadonlyArray<InitialArrowSample<O, M>> = [],
): InitialUnitSemicartesianResult<O, M> {
  const structure = deriveSemicartesianFromInitial(data);
  const failures: Array<{ target: O; reason: string }> = [];
  const sampleResults: Array<{
    label?: string;
    target: O;
    expected: boolean;
    actual: boolean;
  }> = [];

  targets.forEach((target) => {
    const arrow = structure.globalElement(target);
    const canonical = data.witness.isCanonical(target, arrow);
    if (!canonical) {
      const description = data.witness.describe?.(target) ?? "canonical arrow";
      failures.push({ target, reason: `${description} failed uniqueness validation` });
    }
  });

  samples.forEach((sample) => {
    const actual = data.witness.isCanonical(sample.target, sample.candidate);
    sampleResults.push({
      ...(sample.label !== undefined ? { label: sample.label } : {}),
      target: sample.target,
      expected: sample.shouldHold,
      actual,
    });
    if (actual !== sample.shouldHold) {
      const description = sample.label ?? data.witness.describe?.(sample.target) ?? "sample";
      const expectation = sample.shouldHold ? "canonical" : "non-canonical";
      failures.push({
        target: sample.target,
        reason: `${description} expected to be ${expectation} but oracle returned ${actual}`,
      });
    }
  });

  const holds = failures.length === 0;
  const details = holds
    ? `All canonical arrows from the unit satisfied initial-object uniqueness across ${targets.length} targets.`
    : `${failures.length} semicartesian checks failed.`;

  return { holds, witness: structure, details, failures, sampleResults };
}

/**
 * Stage 035 rebuilds the semicartesian oracle demo by constructing an explicit
 * initial-object witness and contrasting a sound configuration with a
 * counterexample that violates uniqueness.
 */

type StageObject = "Unit" | "Stats" | "Controls" | "Archive";

type StageArrow = {
  readonly from: StageObject;
  readonly to: StageObject;
  readonly label: string;
};

const canonicalArrow = (target: StageObject): StageArrow => ({
  from: "Unit",
  to: target,
  label: `!_${target}`,
});

const canonicalWitness: InitialUnitSemicartesianData<StageObject, StageArrow> = {
  unit: "Unit",
  witness: {
    object: "Unit",
    morphismTo: canonicalArrow,
    isCanonical: (target: StageObject, candidate: StageArrow) =>
      candidate.from === "Unit" && candidate.to === target && candidate.label === `!_${target}`,
    describe: (target: StageObject) => `canonical arrow !_${target}`,
  },
};

const alternativeArrow = (target: StageObject): StageArrow => ({
  from: "Unit",
  to: target,
  label: `twist_${target}`,
});

function describeStructure(structure: SemicartesianStructure<StageObject, StageArrow>): readonly string[] {
  const sampleTargets: ReadonlyArray<StageObject> = ["Unit", "Stats", "Controls", "Archive"];
  return sampleTargets.map((target) => {
    const arrow = structure.globalElement(target);
    return `  global element to ${target}: ${arrow.label}`;
  });
}

type SampleResult = InitialUnitSemicartesianResult<StageObject, StageArrow>["sampleResults"][number];
type FailureResult = InitialUnitSemicartesianResult<StageObject, StageArrow>["failures"][number];

function renderResult(
  label: string,
  result: InitialUnitSemicartesianResult<StageObject, StageArrow>,
): readonly string[] {
  const lines: string[] = [`== ${label} ==`, result.holds ? `✔ ${result.details}` : `✘ ${result.details}`];

  if (result.sampleResults.length > 0) {
    lines.push("  Sample checks:");
    result.sampleResults.forEach((sample: SampleResult) => {
      const prefix = sample.actual === sample.expected ? "    •" : "    ✘";
      const descriptor = sample.label ?? `arrow to ${sample.target}`;
      lines.push(
        `${prefix} ${descriptor} ⇒ expected ${sample.expected ? "canonical" : "non-canonical"}, observed ${sample.actual ? "canonical" : "non-canonical"}`,
      );
    });
  }

  if (result.failures.length > 0) {
    lines.push("  Failures:");
    result.failures.forEach((failure: FailureResult) => {
      lines.push(`    • ${failure.reason}`);
    });
  }

  return lines;
}

function runSemicartesianInitialUnitOracles() {
  const logs: string[] = [];

  const structure = deriveSemicartesianFromInitial(canonicalWitness);
  logs.push("== Derived semicartesian structure ==", ...describeStructure(structure));

  const targets: ReadonlyArray<StageObject> = ["Unit", "Stats", "Controls", "Archive"];

  const soundSamples: ReadonlyArray<InitialArrowSample<StageObject, StageArrow>> = [
    { target: "Stats", candidate: canonicalArrow("Stats"), shouldHold: true, label: "canonical !_Stats" },
    { target: "Archive", candidate: alternativeArrow("Archive"), shouldHold: false, label: "constant twist" },
  ];

  const soundResult = checkInitialUnitSemicartesian(canonicalWitness, targets, soundSamples);
  logs.push("", ...renderResult("Sound initial-object witness", soundResult));

  const failingSamples: ReadonlyArray<InitialArrowSample<StageObject, StageArrow>> = [
    { target: "Controls", candidate: alternativeArrow("Controls"), shouldHold: true, label: "erroneous !_Controls" },
  ];

  const failingResult = checkInitialUnitSemicartesian(canonicalWitness, targets, failingSamples);
  logs.push("", ...renderResult("Counterexample diagnostics", failingResult));

  return { logs };
}

export const stage035SemicartesianInitialUnitOracles: RunnableExample = {
  id: "035",
  title: "Semicartesian initial-unit oracles",
  outlineReference: 35,
  summary:
    "Demonstrates the initial-unit semicartesian oracle by contrasting canonical global elements with an intentionally broken sample.",
  async run() {
    return runSemicartesianInitialUnitOracles();
  },
};
