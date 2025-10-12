// semiring-dist.ts — DR monad (generalized distributions over a numeric semiring R)
// Keep probability/monad mechanics here; category-level interfaces in markov-category.ts

import { Fin, Pair, I, tensorObj, Kernel } from "./markov-category";
import { DistLikeMonadSpec, makeKleisli } from "./probability-monads";

// ===== Core Dist Type =====
export type Dist<X> = Map<X, number>; // stays numeric for now; parametrize by R later

// ===== Sampling & Representability Core =====
export type Samp<X> = (px: Dist<X>) => X;          // sampling map (total for finite tests)
export type Dirac<X> = (x: X) => Dist<X>;

export const delta = <X>(x: X): Dist<X> => new Map([[x, 1]]);

// Deterministic sampling via argmax (for property tests)
export const samp = <X>(px: Dist<X>): X => {
  let bestX: X | undefined;
  let bestWeight = -Infinity;
  
  for (const [x, weight] of px) {
    if (weight > bestWeight) {
      bestWeight = weight;
      bestX = x;
    }
  }
  
  if (bestX === undefined) {
    throw new Error("Cannot sample from empty distribution");
  }
  
  return bestX;
};

// Legacy alias
export const dirac = delta;

// ---- Numeric semiring -------------------------------------------------------
// Note: Using CSRig from semiring-utils.ts for the main interface

import type { CSRig } from "./semiring-utils";
import { Prob, LogProb, MaxPlus, BoolRig, RPlus, TropicalMaxPlus } from "./semiring-utils";

export { LogProb, BoolRig, RPlus, TropicalMaxPlus };

// Legacy interface for backward compatibility
export interface NumSemiring {
  add: (a: number, b: number) => number;     // ⊕
  mul: (a: number, b: number) => number;     // ⊗
  zero: number;                               // 0_R  (additive identity)
  one: number;                                // 1_R  (multiplicative identity)
  eq?: (a: number, b: number) => boolean;     // equality (default: === with small tol for reals)
  noZeroDivisors?: boolean;                   // true for ℝ₊, Bool, Tropical, LogProb
}

const defaultEq = (a: number, b: number) => Math.abs(a - b) <= 1e-12;

// ---- DR monad from a numeric semiring --------------------------------------

// Overloaded for both legacy NumSemiring and new CSRig
export function DRMonad(R: NumSemiring | CSRig<number>): DistLikeMonadSpec {
  const eq = R.eq ?? defaultEq;

  // η
  function of<T>(x: T): Dist<T> {
    return new Map([[x, R.one]]);
  }

  // fmap
  function map<A, B>(da: Dist<A>, f: (a: A) => B): Dist<B> {
    const m = new Map<B, number>();
    for (const [a, w] of da) {
      const b = f(a);
      m.set(b, R.add(m.get(b) ?? R.zero, w));
    }
    // no normalization needed; DR enforces Σ = 1_R by construction
    return m;
  }

  // bind (μ ∘ T f)
  function bind<A, B>(da: Dist<A>, k: (a: A) => Dist<B>): Dist<B> {
    const out = new Map<B, number>();
    for (const [a, wa] of da) {
      const db = k(a);
      for (const [b, wb] of db) {
        out.set(b, R.add(out.get(b) ?? R.zero, R.mul(wa, wb)));
      }
    }
    if (R === MaxPlus) {
      return normalizeR(R, out);
    }
    return out;
  }

  // product (Fubini): DR X × DR Y → DR (X×Y)
  function product<A, B>(da: Dist<A>, db: Dist<B>): Dist<[A, B]> {
    const out = new Map<[A, B], number>();
    for (const [a, wa] of da)
      for (const [b, wb] of db)
        out.set([a, b], R.add(out.get([a, b]) ?? R.zero, R.mul(wa, wb)));
    return out;
  }

  return { of, map, bind, product, isAffine1: true };
}

// Note: Semiring instances moved to semiring-utils.ts for centralization

// Convenience builders

export const KleisliDR = (R: NumSemiring | CSRig<number>) => makeKleisli(DRMonad(R));

// Builders for distributions in each semiring (ensure "sum = 1_R")

export function mkRDist<T>(R: NumSemiring | CSRig<number>, pairs: Array<[T, number]>): Dist<T> {
  const m = new Map<T, number>();
  for (const [x, w] of pairs) {
    const current = m.get(x) ?? R.zero;
    m.set(x, R.add(current, w)); // use semiring addition
  }
  const eq = R.eq ?? defaultEq;
  let hasSupport = false;
  for (const v of m.values()) {
    if (!eq(v, R.zero)) {
      hasSupport = true;
      break;
    }
  }
  if (!hasSupport && m.size > 0) {
    const iterator = m.entries();
    const first = iterator.next();
    if (!first.done) {
      m.set(first.value[0], R.one);
    }
  }
  if (R === MaxPlus) {
    return normalizeR(R, m);
  }
  return m;
}

// Normalizers (optional convenience)
//  - For ℝ₊: divide by Σ
//  - For LogProb: subtract log-sum-exp to make sum=0
//  - For Tropical: subtract max so "sum" (max) = 0
export function normalizeR<T>(R: NumSemiring | CSRig<number>, d: Dist<T>): Dist<T> {
  const eq = R.eq ?? defaultEq;
  const isUnitIntervalRig = R.zero === 0 && R.one === 1;
  const addOneToOne = R.add(R.one, R.one);
  const isTropicalLike = R.zero === -Infinity && R.one === 0 && eq(addOneToOne, R.one);
  const isLogProbLike = R.zero === -Infinity && R.one === 0;

  if (R === Prob || isUnitIntervalRig) {
    let s = 0;
    for (const v of d.values()) s += v;
    if (s <= 0) {
      if (d.size === 0) return d;
      const uniform = 1 / d.size;
      const out = new Map<T, number>();
      for (const [k] of d) out.set(k, uniform);
      return out;
    }
    const out = new Map<T, number>();
    for (const [k, v] of d) out.set(k, v / s);
    return out;
  }
  if (R === MaxPlus || isTropicalLike) {
    let mx = -Infinity;
    for (const v of d.values()) mx = Math.max(mx, v);
    if (mx === -Infinity) {
      if (d.size === 0) return d;
      const firstEntry = Array.from(d.entries())[0];
      if (!firstEntry) return d;
      const [firstKey] = firstEntry;
      const out = new Map<T, number>();
      out.set(firstKey, 0);
      for (const [k] of d) if (!Object.is(k, firstKey)) out.set(k, -Infinity);
      return out;
    }
    const out = new Map<T, number>();
    for (const [k, v] of d) out.set(k, v - mx);
    return out;
  }
  if (R === LogProb || isLogProbLike) {
    let m = -Infinity;
    for (const v of d.values()) m = Math.max(m, v);
    if (m === -Infinity) {
      if (d.size === 0) return d;
      const firstEntry = Array.from(d.entries())[0];
      if (!firstEntry) return d;
      const [firstKey] = firstEntry;
      const out = new Map<T, number>();
      out.set(firstKey, 0);
      for (const [k] of d) if (!Object.is(k, firstKey)) out.set(k, -Infinity);
      return out;
    }
    let lse = 0;
    for (const v of d.values()) lse += Math.exp(v - m);
    if (lse === 0) {
      if (d.size === 0) return d;
      const firstEntry = Array.from(d.entries())[0];
      if (!firstEntry) return d;
      const [firstKey] = firstEntry;
      const out = new Map<T, number>();
      out.set(firstKey, 0);
      for (const [k] of d) if (!Object.is(k, firstKey)) out.set(k, -Infinity);
      return out;
    }
    const logZ = m + Math.log(lse);
    const out = new Map<T, number>();
    for (const [k, v] of d) out.set(k, v - logZ);
    return out;
  }
  // Bool doesn't need normalization (require at least one 1)
  return d;
}

// Quick predicates
export function isDirac<T>(R: NumSemiring | CSRig<number>, d: Dist<T>): boolean {
  let count = 0;
  for (const w of d.values()) if (!(R.eq ?? defaultEq)(w, R.zero)) count++;
  return count === 1;
}