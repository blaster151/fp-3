// standard-experiment.ts — Standard Experiment/Measure (Step 12)
// Finite, Prob-specific implementation for Bayesian decision theory

import type { Dist } from "./dist";
import { dirac as delta } from "./dist";

// ===== Equality for distributions over finite Θ =====

export function equalDistNum<X>(a: Dist<number, X>, b: Dist<number, X>, eps = 1e-12): boolean {
  const keys = new Set([...a.w.keys(), ...b.w.keys()]);
  for (const k of keys) {
    const va = a.w.get(k) ?? 0;
    const vb = b.w.get(k) ?? 0;
    if (Math.abs(va - vb) > eps) return false;
  }
  return true;
}

// ===== Bayes Posterior Computation =====

// Bayes posterior: posterior(θ | x) ∝ m(θ) * f(x | θ)
export function posterior<
  Θ extends string | number,
  X extends string | number
>(
  m: Dist<number, Θ>,
  f: (th: Θ) => Dist<number, X>,
  x: X
): Dist<number, Θ> {
  const w = new Map<Θ, number>();
  let z = 0;
  
  m.w.forEach((pθ, θ) => {
    const px_given_theta = f(θ).w.get(x) ?? 0;
    const num = pθ * px_given_theta;
    if (num > 0) {
      w.set(θ, num);
      z += num;
    }
  });
  
  if (z === 0) {
    // No support — return an arbitrary Dirac to keep type total (or throw)
    const first = [...m.w.keys()][0];
    return { 
      R: { 
        zero: 0, 
        one: 1, 
        add: (a, b) => a + b, 
        mul: (a, b) => a * b, 
        eq: (a, b) => Math.abs(a - b) <= 1e-12 
      }, 
      w: new Map([[first, 1]]) 
    };
  }
  
  // Normalize
  w.forEach((v, θ) => w.set(θ, v / z));
  return { 
    R: { 
      zero: 0, 
      one: 1, 
      add: (a, b) => a + b, 
      mul: (a, b) => a * b, 
      eq: (a, b) => Math.abs(a - b) <= 1e-12 
    }, 
    w 
  };
}

// ===== Standard Experiment Types =====

export type Posterior<Θ> = Dist<number, Θ>;
export type StandardMeasure<Θ> = Dist<number, Posterior<Θ>>;

// ===== Standard Measure Construction =====

/** f̂_m: distribution over posterior distributions on Θ */
export function standardMeasure<
  Θ extends string | number,
  X extends string | number
>(
  m: Dist<number, Θ>,
  f: (th: Θ) => Dist<number, X>,
  xVals: readonly X[]
): StandardMeasure<Θ> {
  // P(x) = Σ_θ m(θ) f(x|θ), weight mass on each posterior(x)
  const R = { 
    zero: 0, 
    one: 1, 
    add: (a: number, b: number) => a + b, 
    mul: (a: number, b: number) => a * b, 
    eq: (a: number, b: number) => Math.abs(a - b) <= 1e-12 
  };
  
  const w = new Map<Posterior<Θ>, number>();
  
  for (const x of xVals) {
    // Marginal P(x)
    let px = 0;
    m.w.forEach((pθ, θ) => { 
      px += pθ * (f(θ).w.get(x) ?? 0); 
    });
    
    if (px <= 0) continue;
    
    // Posterior for this x
    const post = posterior(m, f, x);
    
    // Accumulate weight on this posterior object
    w.set(post, (w.get(post) ?? 0) + px);
  }
  
  // Optionally normalize (should already sum to 1)
  return { R, w };
}

// ===== Enhanced Standard Experiment Utilities =====

/**
 * Compute the marginal likelihood P(x) for a given observation
 */
export function marginalLikelihood<Θ extends string | number, X extends string | number>(
  m: Dist<number, Θ>,
  f: (th: Θ) => Dist<number, X>,
  x: X
): number {
  let px = 0;
  m.w.forEach((pθ, θ) => {
    px += pθ * (f(θ).w.get(x) ?? 0);
  });
  return px;
}

/**
 * Compute all posteriors for a given prior and likelihood
 */
export function allPosteriors<Θ extends string | number, X extends string | number>(
  m: Dist<number, Θ>,
  f: (th: Θ) => Dist<number, X>,
  xVals: readonly X[]
): Map<X, Posterior<Θ>> {
  const posteriors = new Map<X, Posterior<Θ>>();
  
  for (const x of xVals) {
    const px = marginalLikelihood(m, f, x);
    if (px > 0) {
      posteriors.set(x, posterior(m, f, x));
    }
  }
  
  return posteriors;
}

/**
 * Verify that a standard measure is properly normalized
 */
export function verifyStandardMeasureNormalized<Θ>(
  sm: StandardMeasure<Θ>,
  eps = 1e-12
): boolean {
  let total = 0;
  sm.w.forEach(weight => total += weight);
  return Math.abs(total - 1) <= eps;
}

/**
 * Extract the support of a standard measure (all posteriors with positive weight)
 */
export function standardMeasureSupport<Θ>(
  sm: StandardMeasure<Θ>,
  eps = 1e-12
): Array<{ posterior: Posterior<Θ>; weight: number }> {
  const support: Array<{ posterior: Posterior<Θ>; weight: number }> = [];
  
  sm.w.forEach((weight, posterior) => {
    if (weight > eps) {
      support.push({ posterior, weight });
    }
  });
  
  return support;
}

// ===== Bayesian Decision Theory Utilities =====

/**
 * Compute expected utility under a posterior distribution
 */
export function expectedUtility<Θ extends string | number>(
  posterior: Posterior<Θ>,
  utility: (th: Θ) => number
): number {
  let expected = 0;
  posterior.w.forEach((prob, theta) => {
    expected += prob * utility(theta);
  });
  return expected;
}

/**
 * Find the optimal action under a standard measure
 */
export function optimalAction<Θ extends string | number, A>(
  sm: StandardMeasure<Θ>,
  actions: readonly A[],
  utility: (action: A, theta: Θ) => number
): { action: A; expectedUtility: number } {
  let bestAction = actions[0];
  let bestUtility = -Infinity;

  for (const action of actions) {
    let totalUtility = 0;

    sm.w.forEach((weight, posterior) => {
      const posteriorUtility = expectedUtility(posterior, (theta: Θ) => utility(action, theta));
      totalUtility += weight * posteriorUtility;
    });
    
    if (totalUtility > bestUtility) {
      bestUtility = totalUtility;
      bestAction = action;
    }
  }
  
  return { action: bestAction, expectedUtility: bestUtility };
}

// ===== Information Value Computation =====

/**
 * Compute the value of information by comparing expected utilities
 * with and without the experiment
 */
export function valueOfInformation<Θ extends string | number, X extends string | number, A>(
  m: Dist<number, Θ>,
  f: (th: Θ) => Dist<number, X>,
  xVals: readonly X[],
  actions: readonly A[],
  utility: (action: A, theta: Θ) => number
): {
  withInfo: number;
  withoutInfo: number;
  valueOfInfo: number;
} {
  // Expected utility without information (just use prior)
  const priorAsStandardMeasure: StandardMeasure<Θ> = {
    R: m.R,
    w: new Map<Posterior<Θ>, number>([[m, 1]])
  };
  const withoutInfo = optimalAction(
    priorAsStandardMeasure,
    actions,
    utility
  ).expectedUtility;

  // Expected utility with information (use standard measure)
  const sm = standardMeasure(m, f, xVals);
  const withInfo = optimalAction(sm, actions, utility).expectedUtility;
  
  return {
    withInfo,
    withoutInfo,
    valueOfInfo: withInfo - withoutInfo
  };
}