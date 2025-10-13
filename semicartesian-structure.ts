// 🔮 BEGIN_MATH: SemicartesianInitialUnit
// 📝 Brief: Capture semicartesian structure induced by an initial tensor unit
// 🏗️ Domain: Category theory / symmetric monoidal categories
// 🔗 Integration: Provides reusable interface/oracle for categories exposing initial tensor units
// 📋 Plan:
//   1. Define witnesses for initial objects tied to the tensor unit.
//   2. Package semicartesian structure derived from those witnesses.
//   3. Implement an oracle that validates uniqueness expectations with optional counterexamples.

export interface InitialObjectWitness<O, M> {
  readonly object: O;
  readonly morphismTo: (target: O) => M;
  readonly isCanonical: (target: O, candidate: M) => boolean;
  readonly describe?: (target: O) => string;
}

export interface SemicartesianStructure<O, M> {
  readonly unit: O;
  readonly globalElement: (target: O) => M;
}

export interface InitialUnitSemicartesianData<O, M> {
  readonly unit: O;
  readonly witness: InitialObjectWitness<O, M>;
}

export interface InitialArrowSample<O, M> {
  readonly target: O;
  readonly candidate: M;
  readonly shouldHold: boolean;
  readonly label?: string;
}

export interface InitialUnitSemicartesianResult<O, M> {
  readonly holds: boolean;
  readonly witness: SemicartesianStructure<O, M>;
  readonly details: string;
  readonly failures: ReadonlyArray<{ target: O; reason: string }>;
  readonly sampleResults: ReadonlyArray<{
    readonly label?: string;
    readonly target: O;
    readonly expected: boolean;
    readonly actual: boolean;
  }>;
}

export function deriveSemicartesianFromInitial<O, M>(
  data: InitialUnitSemicartesianData<O, M>
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

export function checkInitialUnitSemicartesian<O, M>(
  data: InitialUnitSemicartesianData<O, M>,
  targets: ReadonlyArray<O>,
  samples: ReadonlyArray<InitialArrowSample<O, M>> = []
): InitialUnitSemicartesianResult<O, M> {
  const structure = deriveSemicartesianFromInitial(data);
  const failures: Array<{ target: O; reason: string }> = [];
  const sampleResults: Array<{
    label?: string;
    target: O;
    expected: boolean;
    actual: boolean;
  }> = [];

  for (const target of targets) {
    const arrow = structure.globalElement(target);
    const canonical = data.witness.isCanonical(target, arrow);
    if (!canonical) {
      const description = data.witness.describe?.(target) ?? "canonical arrow";
      failures.push({ target, reason: `${description} failed uniqueness validation` });
    }
  }

  for (const sample of samples) {
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
  }

  const holds = failures.length === 0;
  const details = holds
    ? `All canonical arrows from the unit satisfied initial-object uniqueness across ${targets.length} targets.`
    : `${failures.length} semicartesian checks failed.`;

  return { holds, witness: structure, details, failures, sampleResults };
}

// ✅ END_MATH: SemicartesianInitialUnit
// 🔮 Oracles: checkInitialUnitSemicartesian
// 📜 Laws: Initial tensor unit induces semicartesian structure
// 🧪 Tests: Validated via dedicated law spec exercising canonical and non-canonical samples
// 📊 Coverage: Integration through reusable semicartesian witness builder
