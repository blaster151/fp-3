// semiring-law-tests.ts
import { mkFin } from "./markov-category";
import { DRMonad, RPlus, BoolRig, TropicalMaxPlus, LogProb } from "./semiring-dist";
import { fromPairsR } from "./semiring-utils";
import { checkFubini as checkFubiniGeneric } from "./markov-laws"; // the one that takes a DistLikeMonadSpec
import { pullbackSquareHolds, checkPullbackRandom } from "./pullback-check";

export function runSemiringLawSuite() {
  const Θ = mkFin(["t1","t2","t3"] as const, (a,b)=>a===b);

  const specs = [
    { name: "RPlus (probabilities)",     R: RPlus,           M: DRMonad(RPlus) },
    { name: "LogProb (log-space)",       R: LogProb,         M: DRMonad(LogProb) },
    { name: "Tropical max-plus (Viterbi)", R: TropicalMaxPlus, M: DRMonad(TropicalMaxPlus) },
    { name: "Bool (nondeterminism)",     R: BoolRig,         M: DRMonad(BoolRig) },
  ] as const;

  const results = specs.map(({ name, R, M }) => {
    // random-ish finite dists
    const da = fromPairsR(R, [["t1", 0.3], ["t2", 1.1], ["t3", 0.7]]);
    const db = fromPairsR(R, [["t1", 2.0], ["t2", 0.2], ["t3", 0.5]]);

    const fubini = checkFubiniGeneric(M, da as any, db as any); // uses M.product vs bind/map route
    const pullback = pullbackSquareHolds(R, Θ) && checkPullbackRandom(R, Θ, 64);

    return { semiring: name, fubini, pullback };
  });

  if (typeof console !== "undefined") {
    for (const r of results) console.log(`[${r.semiring}] Fubini=${r.fubini} Pullback=${r.pullback}`);
  }
  return results;
}