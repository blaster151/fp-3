// hmm-viterbi.ts
// Production HMM utilities: Viterbi decode (tropical) and Forward (log-prob or prob)
//
// Depends on: markov-category.ts, semiring-dist.ts, semiring-utils.ts
//
import { Fin, Kernel, Dist } from "./markov-category";
import { TropicalMaxPlus, LogProb, RPlus, normalizeR } from "./semiring-dist";
import { fromScoresMax, fromLogits, fromProbs, argBestR } from "./semiring-utils";

/** HMM structure (weights depend on chosen flavor) */
export interface HMM<S, O> {
  // Transition kernel: S → Dist<S>
  trans: Kernel<S, S>;
  // Emission kernel: S → Dist<O>
  emit: Kernel<S, O>;
}

/** Utility: read emission weight log p(o|s) or score(o|s); default -∞ if missing. */
function wEmit<S, O>(emit: Kernel<S, O>, s: S, o: O, fallback = -Infinity): number {
  const d = emit(s);
  const w = d.get(o);
  return w === undefined ? fallback : w;
}

/** Viterbi decode under Tropical max-plus (scores=log-probs or any additive scores). */
export function viterbiDecode<S, O>(
  Sfin: Fin<S>,
  Ofin: Fin<O>,
  hmm: HMM<S, O>,
  obs: O[],
  priorScores: Array<[S, number]> // usually log-probs; any additive scores work
): { path: S[]; bestFinal: S; score: number; last: Dist<S> } {
  // Represent scores in Tropical; normalize so max=0 (optional but tidy)
  let cur: Dist<S> = fromScoresMax(priorScores);
  // backpointers[t][s_next] = s_prev
  const back: Array<Record<string, S>> = [];

  for (let t = 0; t < obs.length; t++) {
    const y = obs[t];
    // Add emission score for staying in s at time t
    const afterEmit = new Map<S, number>();
    for (const [s, ws] of cur) {
      const add = wEmit(hmm.emit, s, y);
      const val = ws + add;
      afterEmit.set(s, val);
    }
    const emitNorm = normalizeR(TropicalMaxPlus, afterEmit);

    // Transition: δ_next(s2) = max_s (δ_emit(s) + trans(s→s2))
    const next = new Map<S, number>();
    const bp: Record<string, S> = {};
    for (const s2 of Sfin.elems) {
      let best = -Infinity;
      let arg: S = Sfin.elems[0];
      for (const [s, ws] of emitNorm) {
        const wTrans = hmm.trans(s).get(s2) ?? -Infinity;
        const val = ws + wTrans;
        if (val > best) {
          best = val;
          arg = s;
        }
      }
      next.set(s2, best);
      bp[String(s2)] = arg;
    }
    back.push(bp);
    cur = normalizeR(TropicalMaxPlus, next);
  }

  const bestStates = argBestR(TropicalMaxPlus, cur);
  const bestFinal = bestStates[0];
  // reconstruct path
  const path: S[] = [];
  let s = bestFinal;
  for (let t = back.length - 1; t >= 0; t--) {
    path.unshift(s);
    s = back[t][String(s)];
  }
  return { path, bestFinal, score: cur.get(bestFinal) ?? -Infinity, last: cur };
}

/** Forward algorithm in LOG space (numerically stable). Returns log-likelihood and alphas by time. */
export function forwardLog<S, O>(
  Sfin: Fin<S>,
  Ofin: Fin<O>,
  hmm: HMM<S, O>,
  obs: O[],
  priorLog: Array<[S, number]>
): { logZ: number; alphas: Dist<S>[] } {
  let alpha: Dist<S> = fromLogits(priorLog); // log-weights
  const alphas: Dist<S>[] = [new Map(alpha)]; // t=0 before any obs

  for (const y of obs) {
    // add emission (log ⊗ = +)
    const afterEmit = new Map<S, number>();
    for (const [s, w] of alpha) afterEmit.set(s, w + (wEmit(hmm.emit, s, y)));
    // transition + logsumexp over predecessors
    const next = new Map<S, number>();
    for (const s2 of Sfin.elems) {
      // logsumexp_s( afterEmit[s] + logTrans(s→s2) )
      let m = -Infinity;
      for (const [s, ws] of afterEmit) {
        const val = ws + (hmm.trans(s).get(s2) ?? -Infinity);
        if (val > m) m = val;
      }
      let lse = 0;
      for (const [s, ws] of afterEmit) {
        const val = ws + (hmm.trans(s).get(s2) ?? -Infinity);
        lse += Math.exp(val - m);
      }
      next.set(s2, m + Math.log(lse));
    }
    alpha = next;
    alphas.push(new Map(alpha));
  }

  // logZ = logsumexp_s alpha_T(s)
  let m = -Infinity;
  for (const v of alpha.values()) m = Math.max(m, v);
  let Z = 0;
  for (const v of alpha.values()) Z += Math.exp(v - m);
  const logZ = m + Math.log(Z);
  return { logZ, alphas };
}

/** Forward algorithm in probability space (simple; may underflow for long sequences). */
export function forwardProb<S, O>(
  Sfin: Fin<S>,
  Ofin: Fin<O>,
  hmm: HMM<S, O>,
  obs: O[],
  priorProb: Array<[S, number]>
): { Z: number; alphas: Dist<S>[] } {
  let alpha: Dist<S> = fromProbs(priorProb); // probabilities sum to 1
  const alphas: Dist<S>[] = [new Map(alpha)]; // t=0

  for (const y of obs) {
    // multiply by emission
    const afterEmit = new Map<S, number>();
    for (const [s, w] of alpha) afterEmit.set(s, w * ((hmm.emit(s).get(y) ?? 0)));
    // transition and sum over predecessors
    const next = new Map<S, number>();
    for (const s2 of Sfin.elems) {
      let sum = 0;
      for (const [s, ws] of afterEmit) sum += ws * (hmm.trans(s).get(s2) ?? 0);
      next.set(s2, sum);
    }
    // normalize to avoid drift
    const total = Array.from(next.values()).reduce((a, b) => a + b, 0) || 1;
    for (const [k, v] of next) next.set(k, v / total);
    alpha = next;
    alphas.push(new Map(alpha));
  }

  const Z = 1; // alphas kept normalized; likelihood accumulation can be tracked if needed
  return { Z, alphas };
}