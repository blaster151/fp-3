// nfa-reachability.ts
// Production nondeterminism helpers over the Bool semiring.
// Depends on: markov-category.ts, semiring-dist.ts, semiring-utils.ts

import type { Fin, Kernel, Dist } from "./markov-category";
import { BoolRig } from "./semiring-dist";
import { fromBoolSupport } from "./semiring-utils";

export interface NFA<Q, Σ> {
  states: Fin<Q>;
  alphabet: Fin<Σ>;
  step: (a: Σ) => Kernel<Q, Q>;   // kernel in Bool semiring: q ↦ {q' : reachable on 'a'}
  start: Q[];
  accept: Set<Q>;
}

/** One step of ε-free NFA on symbol a, from a set of states. */
export function stepNFA<Q, Σ>(nfa: NFA<Q, Σ>, a: Σ, cur: Set<Q>): Set<Q> {
  const out = new Set<Q>();
  for (const q of cur) {
    const dq = nfa.step(a)(q);
    for (const [q2, b] of dq) if (b !== 0) out.add(q2);
  }
  return out;
}

/** Run NFA on a word; return the reachable set after consuming all symbols. */
export function reachable<Q, Σ>(nfa: NFA<Q, Σ>, word: Σ[]): Set<Q> {
  let cur = new Set<Q>(nfa.start);
  for (const a of word) cur = stepNFA(nfa, a, cur);
  return cur;
}

/** Decide acceptance for a word. */
export function accepts<Q, Σ>(nfa: NFA<Q, Σ>, word: Σ[]): boolean {
  const R = reachable(nfa, word);
  for (const q of R) if (nfa.accept.has(q)) return true;
  return false;
}

/** Build a Bool-kernel step from a transition relation. */
export function buildStepKernel<Q, Σ>(
  states: Fin<Q>,
  delta: (q: Q, a: Σ) => Iterable<Q>
): (a: Σ) => Kernel<Q, Q> {
  return (a: Σ) => (q: Q) => {
    const out: Dist<Q> = new Map();
    for (const q2 of delta(q, a)) out.set(q2, 1);
    return out;
  };
}