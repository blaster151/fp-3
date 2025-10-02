// dist.ts — Parametric distributions with semiring context
// Step 2: Dist<R,X> + monad + strength σ

import type { CSRig } from "./semiring-utils";

// ===== Core Parametric Distribution Type =====
export type Dist<R, X> = { R: CSRig<R>; w: Map<X, R> };

// ===== Constructors =====

export const dirac = <R, X>(R: CSRig<R>) => (x: X): Dist<R, X> =>
  ({ R, w: new Map([[x, R.one]]) });

// ===== Functor & Monad Operations =====

export const map = <R, A, B>(d: Dist<R, A>, f: (a: A) => B): Dist<R, B> => {
  const { R } = d; 
  const w = new Map<B, R>();
  d.w.forEach((p, a) => {
    const b = f(a); 
    const current = w.get(b) ?? R.zero;
    const newWeight = R.add(current, p);
    // Prune zero weights
    if (!(R.isZero?.(newWeight) ?? R.eq(newWeight, R.zero))) {
      w.set(b, newWeight);
    }
  });
  return { R, w };
};

export const bind = <R, A, B>(d: Dist<R, A>, k: (a: A) => Dist<R, B>): Dist<R, B> => {
  const { R } = d; 
  const w = new Map<B, R>();
  d.w.forEach((pa, a) => {
    const db = k(a);
    db.w.forEach((pb, b) => {
      const cur = w.get(b) ?? R.zero;
      const newWeight = R.add(cur, R.mul(pa, pb));
      // Prune zero weights
      if (!(R.isZero?.(newWeight) ?? R.eq(newWeight, R.zero))) {
        w.set(b, newWeight);
      }
    });
  });
  return { R, w };
};

// ===== Utilities =====

// normalization check (affine law oracle helper)
export const mass = <R, X>(d: Dist<R, X>): R => {
  const { R } = d; 
  let s = R.zero;
  d.w.forEach(p => { s = R.add(s, p); });
  return s;
};

// ===== Canonical Maps =====

// δ (alias for dirac)
export const delta = dirac;

// Sampling function type
export type Samp<R, X> = (d: Dist<R, X>) => X;

// For tests on finite supports, argmax-by-weight samp is fine:
export const argmaxSamp = <R, X>(cmp: (a: R, b: R) => number) =>
  (d: Dist<R, X>): X => {
    let best: { x: X; p: R } | null = null;
    d.w.forEach((p, x) => {
      if (!best || cmp(p, best.p) > 0) best = { x, p };
    });
    if (!best) throw new Error("empty distribution");
    return best.x;
  };

// ===== Monoidal Structure =====

// strength σ: X ⊗ PY → P(X ⊗ Y)
export const strength = <R, X, Y>(R: CSRig<R>) =>
  (x: X, dy: Dist<R, Y>): Dist<R, [X, Y]> =>
    bind(dy, (y) => dirac(R)([x, y] as [X, Y]));

// ===== Legacy Compatibility =====

// For backward compatibility with existing code that expects Map<X, number>
export type LegacyDist<X> = Map<X, number>;

// Convert between parametric and legacy representations
export const toLegacy = <X>(d: Dist<number, X>): LegacyDist<X> => {
  const result = new Map<X, number>();
  d.w.forEach((weight, x) => {
    result.set(x, weight);
  });
  return result;
};

export const fromLegacy = <X>(R: CSRig<number>, legacy: LegacyDist<X>): Dist<number, X> => {
  const w = new Map<X, number>();
  legacy.forEach((weight, x) => {
    w.set(x, weight);
  });
  return { R, w };
};
