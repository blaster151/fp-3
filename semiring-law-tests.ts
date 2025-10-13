// semiring-law-tests.ts
import type { Dist } from "./dist";
import { mkFin } from "./markov-category";
import { DRMonad } from "./semiring-dist";
import { Prob, LogProb, MaxPlus, fromPairsR } from "./semiring-utils";
import { checkFubini as checkFubiniGeneric } from "./markov-laws"; // the one that takes a DistLikeMonadSpec
import { pullbackSquareHolds, checkPullbackRandom } from "./pullback-check";

export function runSemiringLawSuite() {
  const Θ = mkFin(["t1","t2","t3"] as const, (a,b)=>a===b);

  const specs = [
    { name: "Prob (probabilities)",     R: Prob,           M: DRMonad(Prob) },
    { name: "LogProb (log-space)",       R: LogProb,         M: DRMonad(LogProb) },
    { name: "MaxPlus (Viterbi)", R: MaxPlus, M: DRMonad(MaxPlus) },
  ] as const;

  const results = specs.map(({ name, R, M }) => {
    // random-ish finite dists
    const da = fromPairsR(R, [["t1", 0.3], ["t2", 1.1], ["t3", 0.7]]);
    const db = fromPairsR(R, [["t1", 2.0], ["t2", 0.2], ["t3", 0.5]]);

    const samples: Array<Dist<number, string>> = [
      { R, w: da },
      { R, w: db },
    ];

    const fubini = checkFubiniGeneric(M, da, db); // uses M.product vs bind/map route
    const pullback = pullbackSquareHolds(R, samples) && checkPullbackRandom(R, Θ, 64);

    return { semiring: name, fubini, pullback };
  });

  if (typeof console !== "undefined") {
    for (const r of results) console.log(`[${r.semiring}] Fubini=${r.fubini} Pullback=${r.pullback}`);
  }
  return results;
}