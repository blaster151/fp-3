// experiments.ts — Experiment layer (families of measures with priors)
// Based on the theorem specification for experimental design and information theory
import { 
  Fin, Dist, Kernel, FinMarkov, mkFin, fromWeights, normalize, prune, mass,
  bayesPosterior, jointFromPriorLike, marginalY
} from './markov-category';

// ===== Core Types ===============================================================

// An experiment is a Markov kernel Θ → Obs (parameter space to observations)
export type Experiment<Θ, Obs> = Kernel<Θ, Obs>;

// Prior distribution over parameters
export type Prior<Θ> = Dist<Θ>;

// Posterior kernel: Obs → Θ (Bayes' theorem)
export type Posterior<Θ, Obs> = Kernel<Obs, Θ>;

// Blackwell measure: distribution over posterior distributions
export type BlackwellMeasure<Θ> = Dist<Dist<Θ>>;

// ===== Core Experiment Operations ===============================================

/**
 * Compute posterior kernel from prior and experiment using Bayes' theorem
 * P(θ|o) ∝ m(θ) f_θ(o)
 */
export function posterior<Θ, Obs>(
  prior: Prior<Θ>, 
  exp: Experiment<Θ, Obs>
): Posterior<Θ, Obs> {
  return (obs: Obs) => {
    const numer: Array<[Θ, number]> = [];
    for (const [θ, pθ] of prior) {
      if (pθ <= 0) continue;
      const po = exp(θ).get(obs) ?? 0;
      if (po > 0) numer.push([θ, pθ * po]);
    }
    return normalize(new Map(numer));
  };
}

/**
 * Compute Blackwell measure: pushes observation marginal to posterior distribution
 * Returns distribution over posterior points in Δ(Θ)
 */
export function blackwellMeasure<Θ, Obs>(
  Θf: Fin<Θ>,
  Obsf: Fin<Obs>, 
  prior: Prior<Θ>,
  exp: Experiment<Θ, Obs>
): BlackwellMeasure<Θ> {
  // Build joint distribution P(Θ, Obs)
  const joint = jointFromPriorLike(Θf, Obsf, prior, exp);
  
  // Marginalize over observations to get P(Obs)
  const obsMarginal = marginalY(joint);
  
  // For each observation, compute posterior and weight by P(obs)
  const blackwell: BlackwellMeasure<Θ> = new Map();
  
  for (const [obs, pobs] of obsMarginal) {
    if (pobs <= 0) continue;
    const post = posterior(prior, exp)(obs);
    blackwell.set(post, (blackwell.get(post) ?? 0) + pobs);
  }
  
  return prune(blackwell);
}

/**
 * Compute Bayes risk for a given loss function
 * R(m, exp, loss) = E[loss(θ, a*)] where a* is Bayes optimal action
 */
export function bayesRisk<Θ, Obs, A>(
  prior: Prior<Θ>,
  exp: Experiment<Θ, Obs>,
  loss: (θ: Θ, action: A) => number,
  optimalAction: (posterior: Dist<Θ>) => A
): number {
  const Θf = mkFin<Θ>([...prior.keys()], (a, b) => a === b);
  const Obsf = mkFin<Obs>([...new Set(
    [...prior.keys()].flatMap(θ => [...exp(θ).keys()])
  )], (a, b) => a === b);
  
  const blackwell = blackwellMeasure(Θf, Obsf, prior, exp);
  
  let totalRisk = 0;
  for (const [post, p] of blackwell) {
    const action = optimalAction(post);
    let expectedLoss = 0;
    for (const [θ, pθ] of post) {
      expectedLoss += pθ * loss(θ, action);
    }
    totalRisk += p * expectedLoss;
  }
  
  return totalRisk;
}

// ===== Experiment Construction Helpers =========================================

/**
 * Create a deterministic experiment (noiseless observation)
 */
export function deterministicExperiment<Θ, Obs>(
  Θf: Fin<Θ>,
  Obsf: Fin<Obs>,
  obsFunc: (θ: Θ) => Obs
): Experiment<Θ, Obs> {
  return (θ: Θ) => {
    const obs = obsFunc(θ);
    return new Map([[obs, 1]]);
  };
}

/**
 * Create a noisy experiment with observation noise
 */
export function noisyExperiment<Θ, Obs>(
  Θf: Fin<Θ>,
  Obsf: Fin<Obs>,
  obsFunc: (θ: Θ) => Obs,
  noiseLevel: number
): Experiment<Θ, Obs> {
  return (θ: Θ) => {
    const trueObs = obsFunc(θ);
    const out: Dist<Obs> = new Map();
    
    // Add noise: with probability (1-noiseLevel) get true observation,
    // otherwise uniform over all observations
    for (const obs of Obsf.elems) {
      if (obs === trueObs) {
        out.set(obs, (out.get(obs) ?? 0) + (1 - noiseLevel));
      }
      out.set(obs, (out.get(obs) ?? 0) + noiseLevel / Obsf.elems.length);
    }
    
    return normalize(out);
  };
}

/**
 * Create a binary experiment (success/failure)
 */
export function binaryExperiment<Θ>(
  Θf: Fin<Θ>,
  successProb: (θ: Θ) => number
): Experiment<Θ, boolean> {
  return (θ: Θ) => {
    const p = successProb(θ);
    return new Map([
      [true, p],
      [false, 1 - p]
    ]);
  };
}

// ===== Experiment Analysis =====================================================

/**
 * Check if two experiments are equivalent (same Blackwell measure)
 */
export function equivalentExperiments<Θ, Obs1, Obs2>(
  Θf: Fin<Θ>,
  exp1: Experiment<Θ, Obs1>,
  exp2: Experiment<Θ, Obs2>,
  prior: Prior<Θ>
): boolean {
  const Obs1f = mkFin<Obs1>([...new Set(
    [...prior.keys()].flatMap(θ => [...exp1(θ).keys()])
  )], (a, b) => a === b);
  
  const Obs2f = mkFin<Obs2>([...new Set(
    [...prior.keys()].flatMap(θ => [...exp2(θ).keys()])
  )], (a, b) => a === b);
  
  const μ1 = blackwellMeasure(Θf, Obs1f, prior, exp1);
  const μ2 = blackwellMeasure(Θf, Obs2f, prior, exp2);
  
  // Compare Blackwell measures up to support relabeling
  // This is a simplified check - in practice you'd need more sophisticated comparison
  return mass(μ1) === mass(μ2) && μ1.size === μ2.size;
}

/**
 * Compute experiment informativeness (entropy reduction)
 */
export function experimentInformativeness<Θ, Obs>(
  Θf: Fin<Θ>,
  Obsf: Fin<Obs>,
  prior: Prior<Θ>,
  exp: Experiment<Θ, Obs>
): number {
  const blackwell = blackwellMeasure(Θf, Obsf, prior, exp);
  
  // Compute entropy of Blackwell measure
  let entropy = 0;
  for (const [post, p] of blackwell) {
    if (p > 0) {
      // Compute entropy of this posterior
      let postEntropy = 0;
      for (const [, pθ] of post) {
        if (pθ > 0) postEntropy -= pθ * Math.log(pθ);
      }
      entropy += p * postEntropy;
    }
  }
  
  return entropy;
}

// ===== Convenience Re-exports ==================================================

export const Experiments = {
  posterior,
  blackwellMeasure,
  bayesRisk,
  deterministicExperiment,
  noisyExperiment,
  binaryExperiment,
  equivalentExperiments,
  experimentInformativeness,
};