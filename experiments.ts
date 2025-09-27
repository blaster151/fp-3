// experiments.ts — families of measures + priors + risks
import type { Fin, Kernel } from "./markov-category";
import { normalize } from "./markov-category";
import type { LegacyDist as Dist } from "./dist";

export type Experiment<Theta, Obs> = Kernel<Theta, Obs>;
export type PosteriorSupport<Theta> = { post: Dist<Theta>, weight: number };  // Blackwell support point-list
export type BlackwellMeasure<Theta> = PosteriorSupport<Theta>[];

// Posterior kernel: o ↦ P(θ | o) built from prior m and experiment F: Θ→Obs
export function posteriorKernel<Theta, Obs>(
  ThetaFin: Fin<Theta>,
  ObsFin: Fin<Obs>,
  prior: Dist<Theta>,
  F: Experiment<Theta, Obs>
): Kernel<Obs, Theta> {
  // For each observation o, compute posterior over Θ
  return (o: Obs) => {
    const numer: Dist<Theta> = new Map();
    let evidence = 0;
    for (const theta of ThetaFin.elems) {
      const p_theta = prior.get(theta) ?? 0;
      if (p_theta <= 0) continue;
      const like = F(theta).get(o) ?? 0;
      const w = p_theta * like;
      if (w > 0) { numer.set(theta, (numer.get(theta) ?? 0) + w); evidence += w; }
    }
    return evidence > 0 ? normalize(numer) : new Map();
  };
}

// Blackwell measure: pushforward of P(o) along o↦posterior(o)
export function blackwellMeasure<Theta, Obs>(
  ThetaFin: Fin<Theta>,
  ObsFin: Fin<Obs>,
  prior: Dist<Theta>,
  F: Experiment<Theta, Obs>
): BlackwellMeasure<Theta> {
  const list: BlackwellMeasure<Theta> = [];
  // Compute marginal over observations
  const Pobs: Dist<Obs> = new Map();
  for (const theta of ThetaFin.elems) {
    const p_theta = prior.get(theta) ?? 0; if (p_theta<=0) continue;
    const d = F(theta);
    for (const [o, p] of d) Pobs.set(o, (Pobs.get(o) ?? 0) + p_theta * p);
  }
  // For each o with positive mass, attach posterior
  const postK = posteriorKernel(ThetaFin, ObsFin, prior, F);
  for (const [o, w] of Pobs) if (w>0) list.push({ post: postK(o), weight: w });
  // normalize weights to sum 1 (they should already)
  const Z = Array.from(Pobs.values()).reduce((a,b)=>a+b,0) || 1;
  for (const pt of list) pt.weight /= Z;
  return list;
}

// Bayes risk for finite action set A with loss L(θ,a)
export function bayesRisk<Theta, Obs, A>(
  ThetaFin: Fin<Theta>,
  ObsFin: Fin<Obs>,
  prior: Dist<Theta>,
  F: Experiment<Theta, Obs>,
  actions: A[],
  loss: (theta: Theta, a: A) => number
): number {
  // P(o)
  const Pobs: Dist<Obs> = new Map();
  for (const theta of ThetaFin.elems) {
    const p_theta = prior.get(theta) ?? 0; if (p_theta<=0) continue;
    const d = F(theta);
    for (const [o, p] of d) Pobs.set(o, (Pobs.get(o) ?? 0) + p_theta * p);
  }
  const postK = posteriorKernel(ThetaFin, ObsFin, prior, F);
  let risk = 0;
  for (const [o, po] of Pobs) if (po>0) {
    const post = postK(o);
    // choose a* minimizing E_post[L(θ,a)]
    let best = Infinity;
    for (const a of actions) {
      let e = 0;
      for (const [theta, p] of post) e += p * loss(theta, a);
      if (e < best) best = e;
    }
    risk += po * best;
  }
  return risk;
}