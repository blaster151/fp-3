// logprob-chains.ts
// Helpers for composing Markov kernels in log-space (numerically stable).
// Depends on: markov-category.ts, semiring-dist.ts, semiring-utils.ts

import type { Fin, Kernel, Dist } from "./markov-category";
import { LogProb, normalizeR } from "./semiring-dist";
import { fromLogits } from "./semiring-utils";

/** Compose two log-prob kernels: (g ∘ f)(x)(z) = logsumexp_y [ f(x)(y) + g(y)(z) ]. */
export function composeLogK<X, Y, Z>(f: Kernel<X, Y>, g: Kernel<Y, Z>): Kernel<X, Z> {
  return (x: X) => {
    // gather candidates per z
    const acc = new Map<Z, number>();
    const dy = f(x);
    // compute logsumexp in a streaming way
    const temp: Map<Z, { m: number; s: number }> = new Map();
    for (const [y, wy] of dy) {
      const dz = g(y);
      for (const [z, wz] of dz) {
        const val = wy + wz;
        const cur = temp.get(z);
        if (!cur) temp.set(z, { m: val, s: 1 });
        else {
          const m = Math.max(cur.m, val);
          const s = Math.exp(cur.m - m) * cur.s + Math.exp(val - m);
          temp.set(z, { m, s });
        }
      }
    }
    for (const [z, { m, s }] of temp) acc.set(z, m + Math.log(s));
    return normalizeR(LogProb, acc);
  };
}

/** n-step composition in log space starting from a log-initial distribution. */
export function nStepLog<X>(Xfin: Fin<X>, step: Kernel<X, X>, n: number, initLog: Array<[X, number]>) {
  let d: Dist<X> = fromLogits(initLog);
  for (let t = 0; t < n; t++) {
    // d_next(z) = logsumexp_x [ d(x) + step(x)(z) ]
    const temp: Map<X, { m: number; s: number }> = new Map();
    for (const [x, wx] of d) {
      const dz = step(x);
      for (const [z, wz] of dz) {
        const val = wx + wz;
        const cur = temp.get(z);
        if (!cur) temp.set(z, { m: val, s: 1 });
        else {
          const m = Math.max(cur.m, val);
          const s = Math.exp(cur.m - m) * cur.s + Math.exp(val - m);
          temp.set(z, { m, s });
        }
      }
    }
    const next = new Map<X, number>();
    for (const [z, { m, s }] of temp) next.set(z, m + Math.log(s));
    d = normalizeR(LogProb, next);
  }
  return d;
}