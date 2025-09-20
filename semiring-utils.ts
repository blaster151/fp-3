// semiring-utils.ts
import { Dist } from "./markov-category";
import { NumSemiring, RPlus, LogProb, TropicalMaxPlus, BoolRig, normalizeR } from "./semiring-dist";

// Generic constructor then normalize appropriately for the chosen semiring
export function fromPairsR<T>(R: NumSemiring, pairs: Array<[T, number]>): Dist<T> {
  const m = new Map<T, number>();
  for (const [x, w] of pairs) m.set(x, (m.get(x) ?? R.zero) + w);
  return normalizeR(R, m);
}

// Friendly wrappers
export const fromProbs   = <T>(pairs: Array<[T, number]>) => fromPairsR(RPlus, pairs);
export const fromLogits  = <T>(pairs: Array<[T, number]>) => fromPairsR(LogProb, pairs);          // weights are log-probs
export const fromScoresMax = <T>(pairs: Array<[T, number]>) => fromPairsR(TropicalMaxPlus, pairs); // weights are arbitrary scores
export function fromBoolSupport<T>(support: Iterable<T>): Dist<T> {
  const m = new Map<T, number>();
  for (const x of support) m.set(x, BoolRig.one);
  return m; // no normalization; require nonempty support at call sites
}

// Read off the "best" key(s) for a distribution under a semiring
export function argBestR<T>(R: NumSemiring, d: Dist<T>): T[] {
  if (R === RPlus) { // pick max probability
    let best = -Infinity, out: T[] = [];
    for (const [x, w] of d) {
      if (w > best) { best = w; out = [x]; }
      else if (w === best) out.push(x);
    }
    return out;
  }
  if (R === LogProb) { // higher log-prob is better
    let best = -Infinity, out: T[] = [];
    for (const [x, w] of d) {
      if (w > best) { best = w; out = [x]; }
      else if (w === best) out.push(x);
    }
    return out;
  }
  if (R === TropicalMaxPlus) { // max score (after normalizeR, the best weight is 0)
    let best = -Infinity, out: T[] = [];
    for (const [x, w] of d) {
      if (w > best) { best = w; out = [x]; }
      else if (w === best) out.push(x);
    }
    return out;
  }
  // Bool: everything with weight 1 is "reachable"
  const out: T[] = [];
  for (const [x, w] of d) if (w !== 0) out.push(x);
  return out;
}