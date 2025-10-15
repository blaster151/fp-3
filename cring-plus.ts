// 🔮 BEGIN_MATH: CRingPlusSemicartesian
// 📝 Brief: Instantiate semicartesian structure for additive/unit maps between commutative rings
// 🏗️ Domain: Algebra / symmetric monoidal categories
// 🔗 Integration: Reuses semicartesian initial-object oracle for the CRing_⊕ category
// 📋 Plan:
//   1. Model CRing_⊕ objects and additive/unit-preserving morphisms.
//   2. Provide helpers for canonical maps from ℤ and equality checks.
//   3. Use the generic semicartesian oracle to certify the initial-object semicartesian witness.

import type { Ring } from "./ring";
import { RingInteger } from "./ring";
import {
  type InitialArrowSample,
  type InitialObjectWitness,
  type InitialUnitSemicartesianData,
  type InitialUnitSemicartesianResult,
  type SemicartesianStructure,
  checkInitialUnitSemicartesian,
  deriveSemicartesianFromInitial,
} from "./semicartesian-structure";

export interface CRingPlusObject<A> {
  readonly ring: Ring<A>;
  readonly sample: ReadonlyArray<A>;
  readonly name: string;
  readonly format?: (value: A) => string;
}

export interface CRingPlusHom<A, B> {
  readonly source: CRingPlusObject<A>;
  readonly target: CRingPlusObject<B>;
  readonly map: (value: A) => B;
  readonly label?: string;
}

export type CRingPlusObj = CRingPlusObject<unknown>;
export type CRingPlusMor = CRingPlusHom<unknown, unknown>;

type HomCheck = { description: string };

const normalizeMod = (value: bigint, modulus: bigint): bigint => {
  if (modulus === 0n) return value;
  const mod = value % modulus;
  return mod >= 0n ? mod : mod + modulus;
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

export const IntegersObject: CRingPlusObject<bigint> = {
  ring: RingInteger,
  sample: integerSamples,
  name: "ℤ",
  format: (value) => `${value}`,
};

export const createModObject = (modulus: bigint): CRingPlusObject<bigint> => {
  if (modulus <= 1n) throw new Error("Modulus must exceed 1 to form a nontrivial ring");
  const ring = ringMod(modulus);
  const baseline = [0n, 1n, -1n, 2n, modulus - 1n];
  const sample = Array.from(
    new Set(baseline.map((value) => normalizeMod(value, modulus)))
  );
  return {
    ring,
    sample,
    name: `ℤ/${modulus}ℤ`,
    format: (value) => `${normalizeMod(value, modulus)} (mod ${modulus})`,
  };
};

export const identityHom = <A>(object: CRingPlusObject<A>): CRingPlusHom<A, A> => ({
  source: object,
  target: object,
  map: (value) => value,
  label: `id_${object.name}`,
});

export const composeHom = <A, B, C>(
  g: CRingPlusHom<B, C>,
  f: CRingPlusHom<A, B>
): CRingPlusHom<A, C> => {
  if (f.target !== g.source) {
    throw new Error("Cannot compose morphisms with mismatched domains/codomains");
  }
  return {
    source: f.source,
    target: g.target,
    map: (value) => g.map(f.map(value)),
    ...(g.label !== undefined && f.label !== undefined
      ? { label: `${g.label} ∘ ${f.label}` }
      : {}),
  };
};

const integerAction = <A>(ring: Ring<A>, value: bigint): A => {
  if (value === 0n) return ring.zero;
  const positive = value < 0n ? -value : value;
  let acc = ring.zero;
  for (let i = 0n; i < positive; i++) {
    acc = ring.add(acc, ring.one);
  }
  return value < 0n ? ring.neg(acc) : acc;
};

export const canonicalInitialHom = <A>(
  target: CRingPlusObject<A>
): CRingPlusHom<bigint, A> => ({
  source: IntegersObject,
  target,
  map: (value) => integerAction(target.ring, value),
  label: `ι_${target.name}`,
});

const requireRingEq = <A>(object: CRingPlusObject<A>): ((left: A, right: A) => boolean) => {
  const { eq } = object.ring;
  if (!eq) {
    throw new Error(`CRingPlus object ${object.name} requires a ring equality`);
  }
  return eq;
};

export const equalHom = <A, B>(
  f: CRingPlusHom<A, B>,
  g: CRingPlusHom<A, B>
): boolean => {
  if (f.source !== g.source || f.target !== g.target) return false;
  const eq = requireRingEq(f.target);
  for (const sample of f.source.sample) {
    const fx = f.map(sample);
    const gx = g.map(sample);
    if (!eq(fx, gx)) return false;
  }
  return true;
};

export const checkAdditiveUnitHom = <A, B>(
  hom: CRingPlusHom<A, B>
): { holds: boolean; failures: ReadonlyArray<HomCheck>; details: string } => {
  const { source, target } = hom;
  const failures: HomCheck[] = [];

  const eq = requireRingEq(target);
  const zeroPreserved = eq(hom.map(source.ring.zero), target.ring.zero);
  if (!zeroPreserved) failures.push({ description: "Does not send 0 to 0" });

  const onePreserved = eq(hom.map(source.ring.one), target.ring.one);
  if (!onePreserved) failures.push({ description: "Does not send 1 to 1" });

  for (const x of source.sample) {
    for (const y of source.sample) {
      const lhs = hom.map(source.ring.add(x, y));
      const rhs = target.ring.add(hom.map(x), hom.map(y));
      if (!eq(lhs, rhs)) {
        failures.push({ description: `Addition mismatch on (${source.format?.(x) ?? x}, ${source.format?.(y) ?? y})` });
        break;
      }
    }
  }

  for (const x of source.sample) {
    const lhs = hom.map(source.ring.neg(x));
    const rhs = target.ring.neg(hom.map(x));
    if (!eq(lhs, rhs)) {
      failures.push({ description: `Negation mismatch on ${source.format?.(x) ?? x}` });
    }
  }

  const holds = failures.length === 0;
  const details = holds
    ? `Homomorphism preserves additive structure across ${source.sample.length} samples.`
    : `${failures.length} additive/unit constraints violated.`;

  return { holds, failures, details };
};

const CRingPlusInitialWitness: InitialObjectWitness<CRingPlusObj, CRingPlusMor> = {
  object: IntegersObject,
  morphismTo: (target) => canonicalInitialHom(target),
  isCanonical: (target, candidate) => {
    if (candidate.source !== IntegersObject) return false;
    if (candidate.target !== target) return false;
    return equalHom(candidate, canonicalInitialHom(target));
  },
  describe: (target) => `ℤ → ${target.name}`,
};

export const CRingPlusInitialData: InitialUnitSemicartesianData<CRingPlusObj, CRingPlusMor> = {
  unit: IntegersObject,
  witness: CRingPlusInitialWitness,
};

export const semicartesianStructureCRingPlus = (): SemicartesianStructure<CRingPlusObj, CRingPlusMor> =>
  deriveSemicartesianFromInitial(CRingPlusInitialData);

export const checkCRingPlusInitialSemicartesian = (
  targets: ReadonlyArray<CRingPlusObj>,
  samples: ReadonlyArray<InitialArrowSample<CRingPlusObj, CRingPlusMor>> = []
): InitialUnitSemicartesianResult<CRingPlusObj, CRingPlusMor> =>
  checkInitialUnitSemicartesian(CRingPlusInitialData, targets, samples);

// ✅ END_MATH: CRingPlusSemicartesian
// 🔮 Oracles: checkCRingPlusInitialSemicartesian
// 📜 Laws: ℤ as initial object induces semicartesian structure on CRing_⊕
// 🧪 Tests: Dedicated semicartesian law spec with additive/unit hom checks and counterexamples
// 📊 Coverage: CRing_⊕ objects plus reusable hom utilities and semicartesian witness

// 🔮 BEGIN_MATH: CRingPlusCausalityCounterexample
// 📝 Brief: Encode the causality counterexample showing CRing_⊕ violates the no-signalling principle.
// 🏗️ Domain: Commutative rigs with coproducts; additive/unit preserving morphisms.
// 🔗 Integration: Reuses CRing_⊕ hom utilities to package f, g, h₁, h₂ together with executable diagnostics.
// 📋 Plan:
//   1. Model ℤ[t] as a CRing_⊕ object with polynomial arithmetic over bigint coefficients.
//   2. Provide evaluation homs (p ↦ p(a)) and the shift hom (p ↦ p(t+1)) used in the paper.
//   3. Build and analyze the f, g, h₁, h₂ composite witnessing non-causality.

export type Polynomial = ReadonlyArray<bigint>;

const trimPolynomial = (coeffs: ReadonlyArray<bigint>): bigint[] => {
  let end = coeffs.length - 1;
  while (end >= 0) {
    const coeff = coeffs[end];
    if (coeff === undefined) {
      end -= 1;
      continue;
    }
    if (coeff !== 0n) break;
    end -= 1;
  }
  if (end < 0) return [];
  return coeffs.slice(0, end + 1);
};

const addPolynomial = (a: ReadonlyArray<bigint>, b: ReadonlyArray<bigint>): bigint[] => {
  const length = Math.max(a.length, b.length);
  const acc = new Array<bigint>(length).fill(0n);
  for (let i = 0; i < length; i += 1) {
    const ai = i < a.length ? a[i] : undefined;
    const bi = i < b.length ? b[i] : undefined;
    const aiValue = ai ?? 0n;
    const biValue = bi ?? 0n;
    acc[i] = aiValue + biValue;
  }
  return trimPolynomial(acc);
};

const negPolynomial = (poly: ReadonlyArray<bigint>): bigint[] =>
  poly.map((coeff) => -coeff);

const subPolynomial = (a: ReadonlyArray<bigint>, b: ReadonlyArray<bigint>): bigint[] =>
  addPolynomial(a, negPolynomial(b));

const mulPolynomial = (a: ReadonlyArray<bigint>, b: ReadonlyArray<bigint>): bigint[] => {
  if (a.length === 0 || b.length === 0) return [];
  const acc = new Array<bigint>(a.length + b.length - 1).fill(0n);
  for (let i = 0; i < a.length; i += 1) {
    const ai = a[i];
    if (ai === undefined) continue;
    for (let j = 0; j < b.length; j += 1) {
      const bj = b[j];
      if (bj === undefined) continue;
      const index = i + j;
      const current = acc[index] ?? 0n;
      acc[index] = current + ai * bj;
    }
  }
  return trimPolynomial(acc);
};

const eqPolynomial = (a: ReadonlyArray<bigint>, b: ReadonlyArray<bigint>): boolean => {
  const ta = trimPolynomial(a);
  const tb = trimPolynomial(b);
  if (ta.length !== tb.length) return false;
  for (let i = 0; i < ta.length; i += 1) {
    const coeffA = ta[i];
    const coeffB = tb[i];
    if (coeffA === undefined || coeffB === undefined) return false;
    if (coeffA !== coeffB) return false;
  }
  return true;
};

const constantPolynomial = (value: bigint): bigint[] =>
  value === 0n ? [] : [value];

const monomial = (degree: number): bigint[] => {
  if (degree < 0) throw new Error("Monomial degree must be nonnegative");
  const coeffs = new Array<bigint>(degree + 1).fill(0n);
  if (degree < coeffs.length) {
    coeffs[degree] = 1n;
  }
  return coeffs;
};

const polynomialSamples: ReadonlyArray<Polynomial> = Object.freeze([
  constantPolynomial(0n),
  constantPolynomial(1n),
  constantPolynomial(2n),
  monomial(1),
  addPolynomial(constantPolynomial(1n), monomial(1)),
  monomial(2),
  addPolynomial(constantPolynomial(-1n), monomial(3)),
]);

const evaluatePolynomial = (poly: ReadonlyArray<bigint>, point: bigint): bigint => {
  let result = 0n;
  for (let i = poly.length - 1; i >= 0; i -= 1) {
    const coeff = poly[i];
    if (coeff === undefined) continue;
    result = result * point + coeff;
  }
  return result;
};

const binomial = (n: number, k: number): bigint => {
  if (k < 0 || k > n) return 0n;
  if (k === 0 || k === n) return 1n;
  let result = 1n;
  for (let i = 1; i <= k; i += 1) {
    result = (result * BigInt(n - k + i)) / BigInt(i);
  }
  return result;
};

const shiftPolynomial = (poly: ReadonlyArray<bigint>): bigint[] => {
  let acc: bigint[] = [];
  for (let degree = 0; degree < poly.length; degree += 1) {
    const coeff = poly[degree];
    if (coeff === undefined || coeff === 0n) continue;
    const term = new Array<bigint>(degree + 1).fill(0n);
    for (let i = 0; i <= degree; i += 1) {
      term[i] = coeff * binomial(degree, i);
    }
    acc = addPolynomial(acc, term);
  }
  return acc;
};

const formatPolynomial = (poly: ReadonlyArray<bigint>): string => {
  const trimmed = trimPolynomial(poly);
  if (trimmed.length === 0) return "0";
  const pieces: string[] = [];
  for (let i = 0; i < trimmed.length; i += 1) {
    const coeff = trimmed[i];
    if (coeff === undefined) continue;
    if (coeff === 0n) continue;
    const magnitude = coeff.toString();
    if (i === 0) {
      pieces.push(magnitude);
    } else if (i === 1) {
      pieces.push(`${magnitude}·t`);
    } else {
      pieces.push(`${magnitude}·t^${i}`);
    }
  }
  return pieces.join(" + ") || "0";
};

export const PolynomialRing: Ring<Polynomial> = {
  add: addPolynomial,
  zero: [],
  mul: mulPolynomial,
  one: [1n],
  eq: eqPolynomial,
  neg: negPolynomial,
  sub: subPolynomial,
};

const polynomialRingEq = (() => {
  const eq = PolynomialRing.eq;
  if (!eq) {
    throw new Error("PolynomialRing must expose equality to compare morphism outputs");
  }
  return eq;
})();

export const PolynomialObject: CRingPlusObject<Polynomial> = {
  ring: PolynomialRing,
  sample: polynomialSamples,
  name: "ℤ[t]",
  format: formatPolynomial,
};

const evaluationHom = (value: bigint): CRingPlusHom<Polynomial, Polynomial> => ({
  source: PolynomialObject,
  target: PolynomialObject,
  map: (poly) => constantPolynomial(evaluatePolynomial(poly, value)),
  label: `ev_{t=${value.toString()}}`,
});

const shiftHom: CRingPlusHom<Polynomial, Polynomial> = {
  source: PolynomialObject,
  target: PolynomialObject,
  map: (poly) => shiftPolynomial(poly),
  label: "shift(t ↦ t+1)",
};

export interface CRingPlusCausalityScenario {
  readonly object: CRingPlusObject<Polynomial>;
  readonly observe: CRingPlusHom<Polynomial, Polynomial>;
  readonly future: CRingPlusHom<Polynomial, Polynomial>;
  readonly pastCanonical: CRingPlusHom<Polynomial, Polynomial>;
  readonly pastIdentity: CRingPlusHom<Polynomial, Polynomial>;
}

export const buildCRingPlusCausalityScenario = (): CRingPlusCausalityScenario => ({
  object: PolynomialObject,
  observe: evaluationHom(0n),
  future: shiftHom,
  pastCanonical: evaluationHom(1n),
  pastIdentity: identityHom(PolynomialObject),
});

export interface CRingPlusCausalityAnalysis {
  readonly holds: boolean;
  readonly equalAfterObservation: boolean;
  readonly equalBeforeObservation: boolean;
  readonly witness?: {
    readonly input: Polynomial;
    readonly before: Polynomial;
    readonly after: Polynomial;
  };
  readonly homChecks: {
    readonly observe: ReturnType<typeof checkAdditiveUnitHom>;
    readonly future: ReturnType<typeof checkAdditiveUnitHom>;
    readonly pastCanonical: ReturnType<typeof checkAdditiveUnitHom>;
    readonly pastIdentity: ReturnType<typeof checkAdditiveUnitHom>;
  };
  readonly details: string;
}

export const checkCRingPlusCausalityCounterexample = (
  scenario: CRingPlusCausalityScenario = buildCRingPlusCausalityScenario()
): CRingPlusCausalityAnalysis => {
  const { object, observe, future, pastCanonical, pastIdentity } = scenario;
  const futureAfterCanonical = composeHom(future, pastCanonical);
  const futureAfterIdentity = composeHom(future, pastIdentity);
  const observedCanonical = composeHom(observe, futureAfterCanonical);
  const observedIdentity = composeHom(observe, futureAfterIdentity);

  const equalObservation = equalHom(observedCanonical, observedIdentity);
  const equalFuture = equalHom(futureAfterCanonical, futureAfterIdentity);

  let witness: CRingPlusCausalityAnalysis["witness"] = undefined;
  if (!equalFuture) {
    for (const input of object.sample) {
      const lhs = futureAfterCanonical.map(input);
      const rhs = futureAfterIdentity.map(input);
      if (!polynomialRingEq(lhs, rhs)) {
        witness = { input, before: lhs, after: rhs };
        break;
      }
    }
  }

  const homChecks = {
    observe: checkAdditiveUnitHom(observe),
    future: checkAdditiveUnitHom(future),
    pastCanonical: checkAdditiveUnitHom(pastCanonical),
    pastIdentity: checkAdditiveUnitHom(pastIdentity),
  } as const;

  const holds = equalObservation && !equalFuture;
  const details = holds
    ? "CRing_⊕ morphisms satisfy the causal premise but violate its conclusion."
    : "Causality counterexample conditions not met.";

  return {
    holds,
    equalAfterObservation: equalObservation,
    equalBeforeObservation: equalFuture,
    homChecks,
    details,
    ...(witness && { witness }),
  };
};

export const polynomialEvaluate = (poly: Polynomial, point: bigint): bigint =>
  evaluatePolynomial(poly, point);

export const polynomialShift = (poly: Polynomial): Polynomial => shiftPolynomial(poly);

export const polynomialConstant = (value: bigint): Polynomial => constantPolynomial(value);

export const polynomialMonomial = (degree: number): Polynomial => monomial(degree);

export const polynomialFormat = (poly: Polynomial): string => formatPolynomial(poly);

// ✅ END_MATH: CRingPlusCausalityCounterexample
// 🔮 Oracles: checkCRingPlusCausalityCounterexample
// 📜 Laws: CRing_⊕ violates the causality axiom
// 🧪 Tests: law.CRingPlusCausalityCounterexample.spec.ts exercising equality after observation and inequality before
// 📊 Coverage: Polynomial ℤ[t] object, evaluation/shift homs, and counterexample diagnostics
