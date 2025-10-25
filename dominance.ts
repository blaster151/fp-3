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

export function dominatesInConvexOrder_viaGarbling<Theta, X, Y>(
  ThetaFin: Fin<Theta>,
  XFin: Fin<X>,
  YFin: Fin<Y>,
  F: Experiment<Theta, X>,
  G: Experiment<Theta, Y>,
  opts?: { tolEq?: number; tolRow?: number },
): ConvexOrderWitness<X, Y> {
  const { tolEq = 2e-1, tolRow = 2e-1 } = opts ?? {};
  const thetaElems = ThetaFin.elems;
  const rawElems = XFin.elems;
  const coarseElems = YFin.elems;

  const thetaCount = thetaElems.length;

  const rawProfiles = new Map<X, number[]>();
  const coarseProfiles = new Map<Y, number[]>();

  thetaElems.forEach((theta, index) => {
    const fineDist = F(theta);
    const coarseDist = G(theta);

    rawElems.forEach((raw) => {
      const profile = rawProfiles.get(raw) ?? Array(thetaCount).fill(0);
      profile[index] = fineDist.get(raw) ?? 0;
      rawProfiles.set(raw, profile);
    });

    coarseElems.forEach((label) => {
      const profile = coarseProfiles.get(label) ?? Array(thetaCount).fill(0);
      profile[index] = coarseDist.get(label) ?? 0;
      coarseProfiles.set(label, profile);
    });
  });

  const candidates = generateAllFunctions(XFin.elems, YFin.elems);

  type CandidateAnalysis = {
    readonly candidate: (x: X) => Y;
    readonly maxDeviation: number;
    readonly maxRowDeviation: number;
    readonly score: number;
  };

  const better = (
    left: CandidateAnalysis | undefined,
    right: CandidateAnalysis,
  ): CandidateAnalysis => {
    if (!left) return right;
    if (right.maxDeviation < left.maxDeviation - 1e-12) return right;
    if (left.maxDeviation < right.maxDeviation - 1e-12) return left;
    if (right.maxRowDeviation < left.maxRowDeviation - 1e-12) return right;
    if (left.maxRowDeviation < right.maxRowDeviation - 1e-12) return left;
    return right.score > left.score ? right : left;
  };

  let bestValid: CandidateAnalysis | undefined;

  for (const candidate of candidates) {
    let maxDeviation = 0;
    let maxRowDeviation = 0;
    let valid = true;

    for (const theta of thetaElems) {
      const pushed = pushforward(F(theta), candidate);
      const target = G(theta);

      let pushedTotal = 0;
      let targetTotal = 0;

      pushed.forEach((value) => {
        pushedTotal += value;
      });
      target.forEach((value) => {
        targetTotal += value;
      });

      const rowDiff = Math.abs(pushedTotal - targetTotal);
      if (rowDiff > maxRowDeviation) maxRowDeviation = rowDiff;
      if (rowDiff > tolRow) valid = false;

      const support = new Set<Y>([...target.keys(), ...pushed.keys()]);
      for (const label of support) {
        const diff = Math.abs((pushed.get(label) ?? 0) - (target.get(label) ?? 0));
        if (diff > maxDeviation) maxDeviation = diff;
        if (diff > tolEq) valid = false;
      }
    }

    const score = rawElems.reduce((acc, raw) => {
      const rawProfile = rawProfiles.get(raw);
      const labelProfile = coarseProfiles.get(candidate(raw));
      if (!rawProfile || !labelProfile) return acc;
      const total = rawProfile.reduce(
        (sum, value, index) => sum + value * (labelProfile[index] ?? 0),
        0,
      );
      return acc + total;
    }, 0);

    const analysis: CandidateAnalysis = {
      candidate,
      maxDeviation,
      maxRowDeviation,
      score,
    };

    if (valid) {
      bestValid = better(bestValid, analysis);
    }
  }

  if (bestValid) {
    return { ok: true, reason: "garbling-equivalence", witness: bestValid.candidate };
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