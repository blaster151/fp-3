// semiring-utils.ts — Centralized semiring instances and utilities
// Production-ready module that centralizes semiring types and instances

// ---------- Core Semiring Interface ----------
export interface CSRig<R> {
  readonly zero: R;
  readonly one: R;
  add(a: R, b: R): R;
  mul(a: R, b: R): R;
  eq(a: R, b: R): boolean;

  // Optional helpers (used by tests / ergonomics)
  isZero?(a: R): boolean;         // defaults to eq(a, zero)
  isOne?(a: R): boolean;          // defaults to eq(a, one)
  toString?(a: R): string;        // pretty-print
  /** If provided, we can *prove* properties by exhaustive check. */
  enumerate?(): R[];
  /** If you *know* the algebraic fact, set this to avoid randomized checks. */
  entire?: boolean;               // "no zero divisors" flag
}

// Small helper
const mkIsZero = <R>(R: CSRig<R>) => (a: R) => R.eq(a, R.zero);
const mkIsOne  = <R>(R: CSRig<R>) => (a: R) => R.eq(a, R.one);

export function isNumericRig(R: CSRig<unknown>): R is CSRig<number> {
  return typeof R.one === "number" && typeof R.zero === "number";
}

export function isBooleanRig(R: CSRig<unknown>): R is CSRig<boolean> {
  return typeof R.one === "boolean" && typeof R.zero === "boolean";
}

// ---------- Number / Probability ( + , × ) ----------
export const Prob: CSRig<number> = {
  zero: 0,
  one: 1,
  add: (a, b) => a + b,
  mul: (a, b) => a * b,
  eq: (a, b) => Math.abs(a - b) <= 1e-12,
  isZero: a => Math.abs(a) <= 1e-12,
  isOne:  a => Math.abs(a - 1) <= 1e-12,
  toString: a => a.toString(),
  entire: true, // ℝ with usual × has no zero divisors
};

// ---------- Boolean (∨, ∧) ----------
export const BoolRig: CSRig<boolean> = {
  zero: false,
  one: true,
  add: (a, b) => a || b,
  mul: (a, b) => a && b,
  eq: (a, b) => a === b,
  toString: a => (a ? "⊤" : "⊥"),
  entire: true, // no a≠0, b≠0 with a∧b=0
};

// ---------- Max-Plus ( "tropical" ) ----------
export const MaxPlus: CSRig<number> = {
  zero: -Infinity, // additive identity for max
  one: 0,          // multiplicative identity for +
  add: (a, b) => Math.max(a, b),
  mul: (a, b) => a + b,
  eq: (a, b) => {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
    return Math.abs(a - b) <= 1e-12;
  },
  toString: a => (a === -Infinity ? "-∞" : `${a}`),
  // Entire: max-plus "multiplication" is +; a+b = -∞ only if one is -∞ (i.e., zero).
  entire: true,
};

// ---------- Min-Plus ----------
export const MinPlus: CSRig<number> = {
  zero: +Infinity, // additive identity for min
  one: 0,
  add: (a, b) => Math.min(a, b),
  mul: (a, b) => a + b,
  eq: (a, b) => a === b || (Number.isFinite(a) === false && Number.isFinite(b) === false && a === b),
  toString: a => (a === +Infinity ? "+∞" : `${a}`),
  entire: true,
};

// ---------- ε "Ghost" Semiring Rε = {0, ε, 1} ----------
export type Ghost = 0 | 1 | 2; // 0→0, 1→ε, 2→1
const G0: Ghost = 0, GE: Ghost = 1, G1: Ghost = 2;

// Addition table: 1+1=1, 1+ε=1, ε+ε=ε
const gAdd: Record<Ghost, Record<Ghost, Ghost>> = {
  [G0]: { [G0]: G0, [GE]: GE, [G1]: G1 },
  [GE]: { [G0]: GE, [GE]: GE, [G1]: G1 },
  [G1]: { [G0]: G1, [GE]: G1, [G1]: G1 },
};

// Multiplication: 0*x=0, 1*x=x, ε*ε=ε, ε*1=ε
const gMul: Record<Ghost, Record<Ghost, Ghost>> = {
  [G0]: { [G0]: G0, [GE]: G0, [G1]: G0 },
  [GE]: { [G0]: G0, [GE]: GE, [G1]: GE },
  [G1]: { [G0]: G0, [GE]: GE, [G1]: G1 },
};

export const GhostRig: CSRig<Ghost> = {
  zero: G0,
  one: G1,
  add: (a, b) => gAdd[a][b],
  mul: (a, b) => gMul[a][b],
  eq: (a, b) => a === b,
  isZero: a => a === G0,
  isOne: a => a === G1,
  toString: a => (a === G0 ? "0" : a === GE ? "ε" : "1"),
  enumerate: () => [G0, GE, G1],
  entire: true, // no nonzero a,b with a·b=0
};

// ---------- (Optional) Direct Sum R ⊕ R (counterexample playground) ----------
export type Pair<R> = readonly [R, R];
export const directSum = <R>(R: CSRig<R>): CSRig<Pair<R>> => ({
  zero: [R.zero, R.zero],
  one: [R.one, R.one],
  add: ([a1, a2], [b1, b2]) => [R.add(a1, b1), R.add(a2, b2)] as const,
  mul: ([a1, a2], [b1, b2]) => [R.mul(a1, b1), R.mul(a2, b2)] as const,
  eq: ([a1, a2], [b1, b2]) => R.eq(a1, b1) && R.eq(a2, b2),
  isZero: ([a1, a2]) => (R.isZero ?? mkIsZero(R))(a1) && (R.isZero ?? mkIsZero(R))(a2),
  isOne:  ([a1, a2]) => (R.isOne  ?? mkIsOne(R))(a1)  && (R.isOne  ?? mkIsOne(R))(a2),
  toString: ([a1, a2]) => `(${R.toString?.(a1) ?? String(a1)}, ${R.toString?.(a2) ?? String(a2)})`,
  // NOTE: R⊕R *does* have zero divisors if R has nontrivial zero (classic counterexample arena).
  entire: false,
});

// ---------- Utility: check "entire" (no zero divisors) ----------
/**
 * Returns true if R has no zero divisors: ∀a,b≠0, a·b ≠ 0.
 * Priority:
 *   1) Trust R.entire when provided.
 *   2) If R.enumerate provided, exhaustively check.
 *   3) Fallback: randomized probe (useful for numeric rigs).
 */
export function isEntire<R>(R: CSRig<R>, probes = 128): boolean {
  if (typeof R.entire === "boolean") return R.entire;

  const isZero = R.isZero ?? mkIsZero(R);

  if (R.enumerate) {
    const xs = R.enumerate();
    for (const a of xs) {
      if (isZero(a)) continue;
      for (const b of xs) {
        if (isZero(b)) continue;
        if (isZero(R.mul(a, b))) return false;
      }
    }
    return true;
  }

  // Fallback randomized check (only meaningful if you can sample R; for numbers we probe ± random)
  // Here we assume number-like; callers can override probes=0 to skip.
  if (!isNumericRig(R)) return true;

  const sample = (): R => (Math.random() * 2 - 1) as R; // crude
  for (let i = 0; i < probes; i++) {
    const a = sample();
    const b = sample();
    if (isZero(a) || isZero(b)) continue;
    if (isZero(R.mul(a, b))) return false;
  }
  return true;
}

// ===== Legacy Support & Compatibility =====

// Re-export core Dist type from semiring-dist for convenience
export type { Dist } from "./semiring-dist";

// Legacy aliases for backward compatibility
export const RPlus = Prob;
export const TropicalMaxPlus = MaxPlus;
export const Bool = BoolRig;
export const LogProb: CSRig<number> = {
  zero: -Infinity,
  one: 0,
  add: (a, b) => {
    if (a === -Infinity) return b;
    if (b === -Infinity) return a;
    const m = Math.max(a, b);
    return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
  },
  mul: (a, b) => a + b,
  eq: (a, b) => Math.abs(a - b) <= 1e-12 || (a === -Infinity && b === -Infinity),
  toString: a => (a === -Infinity ? "-∞" : `${a}`),
  entire: true,
};

// Generic constructor utilities (maintaining backward compatibility)
export function fromPairsR<R, T>(R: CSRig<R>, pairs: Array<[T, R]>): Map<T, R> {
  const m = new Map<T, R>();
  for (const [x, w] of pairs) {
    const current = m.get(x) ?? R.zero;
    m.set(x, R.add(current, w));
  }
  return m;
}

// Friendly wrappers
export const fromProbs = <T>(pairs: Array<[T, number]>) => fromPairsR(Prob, pairs);
export const fromLogits = <T>(pairs: Array<[T, number]>) => fromPairsR(LogProb, pairs);
export const fromScoresMax = <T>(pairs: Array<[T, number]>) => fromPairsR(MaxPlus, pairs);
export function fromBoolSupport<T>(support: Iterable<T>): Map<T, boolean> {
  const m = new Map<T, boolean>();
  for (const x of support) m.set(x, BoolRig.one);
  return m;
}

// Read off the "best" key(s) for a distribution under a semiring
export function argBestR<R, T>(R: CSRig<R>, d: Map<T, R>): T[] {
  if (isNumericRig(R)) {
    let best: number | null = null;
    let out: T[] = [];
    for (const [x, weight] of d) {
      if (typeof weight !== "number") {
        throw new Error("Numeric rig weights must be numbers");
      }
      if (best === null) {
        best = weight;
        out = [x];
        continue;
      }

      const currentBest = best;
      if (R.eq(weight, currentBest)) {
        out.push(x);
        continue;
      }

      if (weight > currentBest) {
        best = weight;
        out = [x];
      }
    }
    return out;
  }

  // Bool: everything with weight true is "reachable"
  const out: T[] = [];
  for (const [x, w] of d) {
    if (!(R.isZero?.(w) ?? R.eq(w, R.zero))) out.push(x);
  }
  return out;
}