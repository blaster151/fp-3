// dominance.ts — convex-order dominance checker
import { Fin } from "./markov-category";
import { Experiment, blackwellMeasure, BlackwellMeasure } from "./experiments";
import { isGarblingOfFinite } from "./garbling";

// Primary (exact in finite case) via the theorem's equivalence:
// ĝ_m second-order dominates f̂_m  iff  ∃ C with G = C ∘ F.
// We use the garbling witness as the test.
export function dominatesInConvexOrder_viaGarbling<Theta, X, Y>(
  ThetaFin: Fin<Theta>,
  XFin: Fin<X>,
  YFin: Fin<Y>,
  prior: Map<Theta,number>,
  F: Experiment<Theta,X>,
  G: Experiment<Theta,Y>,
  opts?: { tolEq?: number; tolRow?: number }
): { ok: boolean; reason: "garbling-equivalence"; } {
  const { ok } = isGarblingOfFinite(ThetaFin, XFin, YFin, F, G, { tolEq: opts?.tolEq ?? 1e-9, tolRow: opts?.tolRow ?? 1e-9 });
  return { ok, reason: "garbling-equivalence" };
}

// Optional: approximate convex-grid test (sufficient but not necessary).
// Checks E_ĝ[φ_k] ≥ E_f̂[φ_k] for a small family of convex φ_k on Δ(Θ).
// Here φ_v(π) = (⟨v, π⟩)^2 which is convex for every vector v.
export function dominatesInConvexOrder_grid<Theta, X>(
  ThetaFin: Fin<Theta>,
  prior: Map<Theta,number>,
  muG: BlackwellMeasure<Theta>,
  muF: BlackwellMeasure<Theta>,
  numTests = 64
): { probably: boolean; gaps: number[] } {
  const thetas = ThetaFin.elems;
  const dim = thetas.length;
  const rng = (seed = 7) => () => (seed = (seed*48271)%0x7fffffff)/0x7fffffff;
  const rnd = rng();

  const evalQuadratic = (mu: BlackwellMeasure<Theta>, v: number[]) => {
    // E[(v^T π)^2] under mu
    let s = 0;
    for (const { post, weight } of mu) {
      let dot = 0;
      for (let i=0;i<dim;i++) dot += (post.get(thetas[i]) ?? 0) * v[i];
      s += weight * dot * dot;
    }
    return s;
  };

  const gaps: number[] = [];
  for (let k=0;k<numTests;k++){
    const v = Array.from({length: dim}, () => rnd()*2 - 1); // random direction
    const g = evalQuadratic(muG, v) - evalQuadratic(muF, v);
    gaps.push(g);
  }
  // If all gaps ≥ 0, we have evidence (not proof) of dominance in this grid.
  const probably = gaps.every(g => g >= -1e-10);
  return { probably, gaps };
}