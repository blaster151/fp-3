// semiring-dist.ts — DR monad (generalized distributions over a numeric semiring R)

import { Dist, Fin, Pair, I, tensorObj, Kernel, dirac } from "./markov-category";
import { DistLikeMonadSpec, makeKleisli } from "./probability-monads";

// ---- Numeric semiring -------------------------------------------------------

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

export function DRMonad(R: NumSemiring): DistLikeMonadSpec {
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

// Ready-made semirings (all with no zero divisors)

export const RPlus: NumSemiring = {
  add: (a,b)=>a+b, mul: (a,b)=>a*b, zero: 0, one: 1, eq: defaultEq, noZeroDivisors: true,
};

export const BoolRig: NumSemiring = {
  add: (a,b)=> (a||b ? 1 : 0), mul: (a,b)=> (a&&b ? 1 : 0), zero: 0, one: 1,
  eq: (a,b)=> (a?1:0) === (b?1:0), noZeroDivisors: true,
};

export const TropicalMaxPlus: NumSemiring = {
  add: (a,b)=>Math.max(a,b), mul: (a,b)=>a+b, zero: -Infinity, one: 0,
  eq: (a,b) => Math.abs(a - b) <= 1e-12 || (a === -Infinity && b === -Infinity), noZeroDivisors: true,
};

export const LogProb: NumSemiring = {
  // Work in log-space: ⊕ = logsumexp, ⊗ = +, 0_R = -∞, 1_R = 0
  add: (a,b)=> {
    if (a===-Infinity) return b; if (b===-Infinity) return a;
    const m = Math.max(a,b); return m + Math.log(Math.exp(a-m)+Math.exp(b-m));
  },
  mul: (a,b)=>a+b, zero: -Infinity, one: 0, 
  eq: (a,b) => Math.abs(a - b) <= 1e-12 || (a === -Infinity && b === -Infinity), 
  noZeroDivisors: true,
};

// Convenience builders

export const KleisliDR = (R: NumSemiring) => makeKleisli(DRMonad(R));

// Builders for distributions in each semiring (ensure "sum = 1_R")

export function mkRDist<T>(R: NumSemiring, pairs: Array<[T, number]>): Dist<T> {
  const m = new Map<T, number>();
  for (const [x, w] of pairs) {
    const current = m.get(x) ?? R.zero;
    m.set(x, R.add(current, w)); // use semiring addition
  }
  return m;
}

// Normalizers (optional convenience)
//  - For ℝ₊: divide by Σ
//  - For LogProb: subtract log-sum-exp to make sum=0
//  - For Tropical: subtract max so "sum" (max) = 0
export function normalizeR<T>(R: NumSemiring, d: Dist<T>): Dist<T> {
  if (R === RPlus) {
    let s = 0; for (const v of d.values()) s += v; if (s===0) return d;
    const out = new Map<T, number>(); for (const [k,v] of d) out.set(k, v/s); return out;
  }
  if (R === LogProb) {
    let m = -Infinity; for (const v of d.values()) m = Math.max(m, v);
    let lse = 0; for (const v of d.values()) lse += Math.exp(v - m);
    const logZ = m + Math.log(lse);
    const out = new Map<T, number>(); for (const [k,v] of d) out.set(k, v - logZ); return out;
  }
  if (R === TropicalMaxPlus) {
    let mx = -Infinity; for (const v of d.values()) mx = Math.max(mx, v);
    const out = new Map<T, number>(); for (const [k,v] of d) out.set(k, v - mx); return out;
  }
  // Bool doesn't need normalization (require at least one 1)
  return d;
}

// Quick predicates
export function isDirac<T>(R: NumSemiring, d: Dist<T>): boolean {
  let count = 0;
  for (const w of d.values()) if (!(R.eq ?? defaultEq)(w, R.zero)) count++;
  return count === 1;
}