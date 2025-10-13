import type { RunnableExample } from "./types";

type Ring<A> = {
  readonly add: (x: A, y: A) => A;
  readonly zero: A;
  readonly mul: (x: A, y: A) => A;
  readonly one: A;
  readonly eq: (x: A, y: A) => boolean;
  readonly neg: (x: A) => A;
  readonly sub: (x: A, y: A) => A;
};

type CRingPlusObject<A> = {
  readonly ring: Ring<A>;
  readonly sample: ReadonlyArray<A>;
  readonly name: string;
  readonly format?: (value: A) => string;
};

type CRingPlusHom<A, B> = {
  readonly source: CRingPlusObject<A>;
  readonly target: CRingPlusObject<B>;
  readonly map: (value: A) => B;
  readonly label: string;
};

type HomCheck = { readonly description: string };

type BigintObject = CRingPlusObject<bigint>;
type BigintHom = CRingPlusHom<bigint, bigint>;

type SemicartesianSample = {
  readonly target: BigintObject;
  readonly candidate: BigintHom;
  readonly shouldHold: boolean;
  readonly label?: string;
};

type SemicartesianResult = {
  readonly holds: boolean;
  readonly details: string;
  readonly sampleResults: ReadonlyArray<{
    readonly label?: string;
    readonly target: BigintObject;
    readonly expected: boolean;
    readonly actual: boolean;
  }>;
  readonly failures: ReadonlyArray<{ readonly reason: string }>;
};

const normalizeMod = (value: bigint, modulus: bigint): bigint => {
  if (modulus === 0n) return value;
  const mod = value % modulus;
  return mod >= 0n ? mod : mod + modulus;
};

const ringIntegers: Ring<bigint> = {
  add: (a, b) => a + b,
  zero: 0n,
  mul: (a, b) => a * b,
  one: 1n,
  eq: (a, b) => a === b,
  neg: (a) => -a,
  sub: (a, b) => a - b,
};

const ringMod = (modulus: bigint): Ring<bigint> => ({
  add: (a, b) => normalizeMod(a + b, modulus),
  zero: normalizeMod(0n, modulus),
  mul: (a, b) => normalizeMod(a * b, modulus),
  one: normalizeMod(1n, modulus),
  eq: (a, b) => normalizeMod(a, modulus) === normalizeMod(b, modulus),
  neg: (a) => normalizeMod(-a, modulus),
  sub: (a, b) => normalizeMod(a - b, modulus),
});

const integerSamples: readonly bigint[] = Object.freeze([-2n, -1n, 0n, 1n, 2n]);

const IntegersObject: CRingPlusObject<bigint> = {
  ring: ringIntegers,
  sample: integerSamples,
  name: "ℤ",
  format: (value) => `${value}`,
};

const createModObject = (modulus: bigint): CRingPlusObject<bigint> => {
  if (modulus <= 1n) throw new Error("Modulus must exceed 1 to form a nontrivial ring");
  const ring = ringMod(modulus);
  const baseline = [0n, 1n, -1n, 2n, modulus - 1n];
  const sample = Array.from(new Set(baseline.map((value) => normalizeMod(value, modulus))));
  return {
    ring,
    sample,
    name: `ℤ/${modulus}ℤ`,
    format: (value) => `${normalizeMod(value, modulus)} (mod ${modulus})`,
  };
};

const identityHom = <A>(object: CRingPlusObject<A>): CRingPlusHom<A, A> => ({
  source: object,
  target: object,
  map: (value) => value,
  label: `id_${object.name}`,
});

const composeHom = <A, B, C>(
  g: CRingPlusHom<B, C>,
  f: CRingPlusHom<A, B>,
): CRingPlusHom<A, C> => {
  if (f.target !== g.source) {
    throw new Error("Cannot compose morphisms with mismatched domains/codomains");
  }
  return {
    source: f.source,
    target: g.target,
    map: (value) => g.map(f.map(value)),
    label: `${g.label} ∘ ${f.label}`,
  };
};

const integerAction = <A>(ring: Ring<A>, value: bigint): A => {
  if (value === 0n) return ring.zero;
  const positive = value < 0n ? -value : value;
  let acc = ring.zero;
  for (let i = 0n; i < positive; i += 1n) {
    acc = ring.add(acc, ring.one);
  }
  return value < 0n ? ring.neg(acc) : acc;
};

const canonicalInitialHom = <A>(target: CRingPlusObject<A>): CRingPlusHom<bigint, A> => ({
  source: IntegersObject,
  target,
  map: (value) => integerAction(target.ring, value),
  label: `ι_${target.name}`,
});

const equalHom = <A, B>(f: CRingPlusHom<A, B>, g: CRingPlusHom<A, B>): boolean => {
  if (f.source !== g.source || f.target !== g.target) return false;
  const eq = f.target.ring.eq;
  return f.source.sample.every((sample) => eq(f.map(sample), g.map(sample)));
};

const checkAdditiveUnitHom = <A, B>(hom: CRingPlusHom<A, B>): { holds: boolean; failures: ReadonlyArray<HomCheck>; details: string } => {
  const { source, target } = hom;
  const failures: HomCheck[] = [];

  if (!target.ring.eq(hom.map(source.ring.zero), target.ring.zero)) {
    failures.push({ description: "Does not send 0 to 0" });
  }

  if (!target.ring.eq(hom.map(source.ring.one), target.ring.one)) {
    failures.push({ description: "Does not send 1 to 1" });
  }

  source.sample.forEach((x) => {
    source.sample.forEach((y) => {
      const lhs = hom.map(source.ring.add(x, y));
      const rhs = target.ring.add(hom.map(x), hom.map(y));
      if (!target.ring.eq(lhs, rhs)) {
        failures.push({ description: `Addition mismatch on (${source.format?.(x) ?? x}, ${source.format?.(y) ?? y})` });
      }
    });
  });

  source.sample.forEach((x) => {
    const lhs = hom.map(source.ring.neg(x));
    const rhs = target.ring.neg(hom.map(x));
    if (!target.ring.eq(lhs, rhs)) {
      failures.push({ description: `Negation mismatch on ${source.format?.(x) ?? x}` });
    }
  });

  const holds = failures.length === 0;
  const details = holds
    ? `Homomorphism preserves additive structure across ${source.sample.length} samples.`
    : `${failures.length} additive/unit constraints violated.`;

  return { holds, failures, details };
};

const checkCRingPlusInitialSemicartesian = (
  targets: ReadonlyArray<BigintObject>,
  samples: ReadonlyArray<SemicartesianSample>,
): SemicartesianResult => {
  const failures: Array<{ reason: string }> = [];
  const sampleResults = samples.map((sample) => {
    const canonical = canonicalInitialHom(sample.target);
    const actual = equalHom(sample.candidate, canonical);
    if (actual !== sample.shouldHold) {
      const expectation = sample.shouldHold ? "canonical" : "non-canonical";
      failures.push({
        reason: `${sample.label ?? sample.candidate.label} expected to be ${expectation} but oracle returned ${actual}`,
      });
    }
    return {
      ...(sample.label !== undefined ? { label: sample.label } : {}),
      target: sample.target,
      expected: sample.shouldHold,
      actual,
    };
  });

  const holds = failures.length === 0;
  const details = holds
    ? `All ${targets.length} canonical maps satisfied semicartesian uniqueness.`
    : `${failures.length} semicartesian checks failed.`;

  return { holds, details, sampleResults, failures };
};

type HomFailure = ReturnType<typeof checkAdditiveUnitHom>["failures"][number];
type SemicartesianSampleResult = SemicartesianResult["sampleResults"][number];
type SemicartesianFailure = SemicartesianResult["failures"][number];

function renderHomCheck(label: string, result: ReturnType<typeof checkAdditiveUnitHom>): readonly string[] {
  const lines = [`${label}: ${result.holds ? "✔" : "✘"} ${result.details}`];
  if (!result.holds) {
    result.failures.forEach((failure: HomFailure) => lines.push(`  • ${failure.description}`));
  }
  return lines;
}

function renderSemicartesianResult(label: string, result: SemicartesianResult): readonly string[] {
  const lines = [`${label}: ${result.holds ? "✔" : "✘"} ${result.details}`];
  if (result.sampleResults.length > 0) {
    lines.push("  Sample checks:");
    result.sampleResults.forEach((sample: SemicartesianSampleResult) => {
      const prefix = sample.actual === sample.expected ? "    •" : "    ✘";
      const descriptor = sample.label ?? sample.target.name;
      lines.push(
        `${prefix} ${descriptor} ⇒ expected ${sample.expected ? "canonical" : "non-canonical"}, observed ${sample.actual ? "canonical" : "non-canonical"}`,
      );
    });
  }
  if (result.failures.length > 0) {
    lines.push("  Failures:");
    result.failures.forEach((failure: SemicartesianFailure) => {
      lines.push(`    • ${failure.reason}`);
    });
  }
  return lines;
}

function renderMediator(label: string, hom: BigintHom, values: readonly bigint[]): readonly string[] {
  const evaluations = values.map((value) => `${value} ↦ ${hom.map(value)}`);
  return [`${label}: ${evaluations.join(", ")}`];
}

function runCRingSemicartesianWitnesses() {
  const logs: string[] = [];

  const mod5 = createModObject(5n);
  const mod7 = createModObject(7n);

  const zToMod5 = canonicalInitialHom(mod5);
  const zToMod7 = canonicalInitialHom(mod7);
  const collapsed: BigintHom = {
    source: IntegersObject,
    target: mod5,
    map: () => 0n,
    label: "collapse",
  };

  logs.push(
    "== Additive/unit homomorphism checks ==",
    ...renderMediator("  ℤ → ℤ/5ℤ", zToMod5, [-2n, -1n, 0n, 1n, 2n]),
    ...renderMediator("  ℤ → ℤ/7ℤ", zToMod7, [-2n, -1n, 0n, 1n, 2n]),
    ...renderMediator("  collapsed map", collapsed, [-2n, -1n, 0n, 1n, 2n]),
    ...renderHomCheck("  canonical ι_{ℤ/5ℤ}", checkAdditiveUnitHom(zToMod5)),
    ...renderHomCheck("  canonical ι_{ℤ/7ℤ}", checkAdditiveUnitHom(zToMod7)),
    ...renderHomCheck("  collapsed map", checkAdditiveUnitHom(collapsed)),
  );

  const composed = composeHom(identityHom(mod5), zToMod5);
  logs.push("", ...renderMediator("== Composition retains canonicity ==", composed, [0n, 1n, 2n]));

  const samples: ReadonlyArray<SemicartesianSample> = [
    { target: mod5, candidate: zToMod5, shouldHold: true, label: "ι_{ℤ/5ℤ}" },
    { target: mod7, candidate: zToMod7, shouldHold: true, label: "ι_{ℤ/7ℤ}" },
    { target: mod5, candidate: collapsed, shouldHold: false, label: "collapsed map" },
  ];

  const semicartesianResult = checkCRingPlusInitialSemicartesian([IntegersObject, mod5, mod7], samples);
  logs.push("", ...renderSemicartesianResult("Semicartesian initial-unit oracle", semicartesianResult));

  return { logs };
}

export const stage036CRingSemicartesianWitnesses: RunnableExample = {
  id: "036",
  title: "CRing⊕ semicartesian witnesses",
  outlineReference: 36,
  summary:
    "Verifies canonical ℤ → A homomorphisms, highlights a collapsing failure, and reuses the semicartesian oracle for CRing⊕.",
  async run() {
    return runCRingSemicartesianWitnesses();
  },
};
