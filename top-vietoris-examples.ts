// top-vietoris-examples.ts
// Adapters for Kl(H): Kleisli category of the lower Vietoris monad on Top.
// Kolmogorov products exist here via the infinite product topology.
// Caveat: Kl(H) is NOT causal, so Hewitt–Savage does NOT apply.

// NOTE: These are scaffolds. They show expected signatures and where to
// delegate into existing oracles once you have concrete encodings for:
//  - product spaces X_J and finite marginals π_F,
//  - continuous "statistics" s : X_J -> {0,1} (constant/tail-like),
//  - continuous actions σ̂ : X_J -> X_J for finite permutations (if ever causal).

import { type FinMarkov } from "./markov-category";
import { MarkovOracles } from "./markov-oracles";
import type { KolmogorovFiniteMarginal } from "./markov-zero-one";

// Minimal structural types to keep parity with BorelStoch helpers:
export type TopSpace = unknown; // placeholder for your space encoding
export type ClosedSubset = unknown; // representing HY points if needed

// Continuous map encodings (replace with your actual representation)
export type Cont<X, Y> = (x: X) => Y;

// (Kolmogorov) — valid in Kl(H)
export function buildTopVietorisKolmogorovWitness<A, XJ, XF, T = 0 | 1>(
  p: FinMarkov<A, XJ>,
  s: FinMarkov<XJ, T>,
  finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<XJ, XF>>,
  label = "Top/Vietoris Kolmogorov",
) {
  return MarkovOracles.zeroOne.kolmogorov.witness(p, s, finiteMarginals, { label });
}

export function checkTopVietorisKolmogorov<A, XJ, T = 0 | 1>(
  witness: ReturnType<typeof buildTopVietorisKolmogorovWitness<A, XJ, T>>,
  opts?: { tolerance?: number },
) {
  return MarkovOracles.zeroOne.kolmogorov.check(witness, opts);
}

// (Hewitt–Savage) — NOT valid in Kl(H) (non-causal). Keep as explicit error.
export function buildTopVietorisHewittSavageWitness(): never {
  throw new Error(
    "Kl(H) is not causal, so Hewitt–Savage zero–one witnesses are intentionally unavailable. See LAWS.md Top/Vietoris entry.",
  );
}

export function checkTopVietorisHewittSavage(): never {
  throw new Error(
    "Kl(H) is not causal; no Hewitt–Savage witness/check available. See LAWS.md Top/Vietoris entry.",
  );
}

// Convenience factory stubs you can fill later once you encode X_J explicitly.
export function makeProductPrior<A, XJ>(
  _mkXJ: () => XJ,
): FinMarkov<A, XJ> {
  throw new Error("TODO: encode I -> X_J prior in Kl(H) adapter.");
}

export function makeDeterministicStatistic<XJ, T = 0 | 1>(
  _s: Cont<XJ, T>,
): FinMarkov<XJ, T> {
  throw new Error("TODO: encode X_J -> {0,1} deterministic map in Kl(H) adapter.");
}
