// dominance.ts — convex-order dominance checker
import type { Fin } from "./markov-category";
import type { Experiment, BlackwellMeasure } from "./experiments";
import { generateAllFunctions } from "./garbling";

export type ConvexOrderWitness<X, Y> = {
  ok: boolean;
  reason: "garbling-equivalence";
  witness?: (x: X) => Y;
};

export type ConvexOrderGridEvidence = {
  probably: boolean;
  gaps: number[];
};

// Primary (exact in finite case) via the theorem's equivalence:
// ĝ_m second-order dominates f̂_m  iff  ∃ C with G = C ∘ F.
// We use the garbling witness as the test.
const pushforward = <X, Y>(
  kernel: Map<X, number>,
  map: (x: X) => Y,
): Map<Y, number> => {
  const result = new Map<Y, number>();
  kernel.forEach((weight, x) => {
    const image = map(x);
    const current = result.get(image) ?? 0;
    result.set(image, current + weight);
  });
  return result;
};

const measuresClose = <Y>(
  left: Map<Y, number>,
  right: Map<Y, number>,
  tolEq: number,
  tolRow: number,
): boolean => {
  const support = new Set<Y>([...left.keys(), ...right.keys()]);
  let leftTotal = 0;
  let rightTotal = 0;
  for (const key of support) {
    const l = left.get(key) ?? 0;
    const r = right.get(key) ?? 0;
    leftTotal += l;
    rightTotal += r;
    if (Math.abs(l - r) > tolEq) return false;
  }
  return Math.abs(leftTotal - rightTotal) <= tolRow;
};

export function dominatesInConvexOrder_viaGarbling<Theta, X, Y>(
  ThetaFin: Fin<Theta>,
  XFin: Fin<X>,
  YFin: Fin<Y>,
  F: Experiment<Theta,X>,
  G: Experiment<Theta,Y>,
  opts?: { tolEq?: number; tolRow?: number }
): ConvexOrderWitness<X, Y> {
  const { tolEq = 1e-9, tolRow = 1e-9 } = opts ?? {};
  const candidates = generateAllFunctions(XFin.elems, YFin.elems);

  for (const candidate of candidates) {
    let matches = true;
    for (const theta of ThetaFin.elems) {
      const pushed = pushforward(F(theta), candidate);
      if (!measuresClose(pushed, G(theta), tolEq, tolRow)) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return { ok: true, reason: "garbling-equivalence", witness: candidate };
    }
  }

  return { ok: false, reason: "garbling-equivalence" };
}

// Optional: approximate convex-grid test (sufficient but not necessary).
// Checks E_ĝ[φ_k] ≥ E_f̂[φ_k] for a small family of convex φ_k on Δ(Θ).
// Here φ_v(π) = (⟨v, π⟩)^2 which is convex for every vector v.
export function dominatesInConvexOrder_grid<Theta, X>(
  ThetaFin: Fin<Theta>,
  muG: BlackwellMeasure<Theta>,
  muF: BlackwellMeasure<Theta>,
  numTests = 64
): ConvexOrderGridEvidence {
  const thetas = ThetaFin.elems;
  const dim = thetas.length;
  const rng = (seed = 7) => () => (seed = (seed*48271)%0x7fffffff)/0x7fffffff;
  const rnd = rng();

  const evalQuadratic = (mu: BlackwellMeasure<Theta>, v: number[]) => {
    // E[(v^T π)^2] under mu
    let s = 0;
    for (const { post, weight } of mu) {
      let dot = 0;
      thetas.forEach((theta, index) => {
        const direction = v[index];
        if (direction === undefined) return;
        dot += (post.get(theta) ?? 0) * direction;
      });
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