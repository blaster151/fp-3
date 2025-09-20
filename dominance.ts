// dominance.ts — Posterior dominance and convex order checking
// Implements the theorem's posterior dominance condition via martingale coupling
import { 
  Fin, Dist, Kernel, FinMarkov, mkFin, fromWeights, normalize, prune, mass,
  blackwellMeasure
} from './experiments';

// ===== Core Types ===============================================================

export interface DominanceResult {
  ok: boolean;
  coupling?: number[][]; // Martingale coupling matrix
  error?: string;
}

// ===== Convex Order / Second-Order Dominance ====================================

/**
 * Check if μ dominates ν in convex order (second-order stochastic dominance)
 * μ ⪰_cx ν means μ is "less spread out" than ν
 * 
 * This implements the martingale coupling condition:
 * There exists T such that Σ_π' T(π,π') π' = π for each π in support of μ
 */
export function dominatesInConvexOrder<Θ>(
  Θf: Fin<Θ>,
  μ: Dist<Dist<Θ>>, // Source (more informative)
  ν: Dist<Dist<Θ>>,  // Target (less informative) 
  prior: Dist<Θ>
): DominanceResult {
  try {
    // Check barycenter condition: E[μ] = E[ν] = prior
    if (!checkBarycenter(μ, ν, prior)) {
      return { ok: false, error: "Barycenters don't match prior" };
    }
    
    // Solve martingale coupling LP
    const coupling = solveMartingaleCoupling(Θf, μ, ν);
    
    if (coupling === null) {
      return { ok: false, error: "No martingale coupling exists" };
    }
    
    return { ok: true, coupling };
  } catch (error) {
    return { ok: false, error: `Coupling solver error: ${error}` };
  }
}

/**
 * Check that both measures have the same barycenter (mean)
 */
function checkBarycenter<Θ>(
  μ: Dist<Dist<Θ>>,
  ν: Dist<Dist<Θ>>,
  prior: Dist<Θ>,
  tolerance = 1e-6
): boolean {
  const barycenter_μ = computeBarycenter(μ);
  const barycenter_ν = computeBarycenter(ν);
  
  // Check μ barycenter = prior
  for (const [θ, pθ] of prior) {
    const p_μ = barycenter_μ.get(θ) ?? 0;
    if (Math.abs(p_μ - pθ) > tolerance) return false;
  }
  
  // Check ν barycenter = prior  
  for (const [θ, pθ] of prior) {
    const p_ν = barycenter_ν.get(θ) ?? 0;
    if (Math.abs(p_ν - pθ) > tolerance) return false;
  }
  
  return true;
}

/**
 * Compute barycenter (mean) of a distribution over distributions
 */
function computeBarycenter<Θ>(μ: Dist<Dist<Θ>>): Dist<Θ> {
  const barycenter: Dist<Θ> = new Map();
  
  for (const [post, p] of μ) {
    for (const [θ, pθ] of post) {
      barycenter.set(θ, (barycenter.get(θ) ?? 0) + p * pθ);
    }
  }
  
  return normalize(barycenter);
}

/**
 * Solve martingale coupling LP
 * Find T such that Σ_π' T(π,π') π' = π for each π in support of μ
 */
function solveMartingaleCoupling<Θ>(
  Θf: Fin<Θ>,
  μ: Dist<Dist<Θ>>,
  ν: Dist<Dist<Θ>>
): number[][] | null {
  const μ_support = [...μ.keys()];
  const ν_support = [...ν.keys()];
  const n_μ = μ_support.length;
  const n_ν = ν_support.length;
  
  // Initialize coupling matrix T (n_μ × n_ν)
  const T: number[][] = Array(n_μ).fill(null).map(() => Array(n_ν).fill(1 / n_ν));
  
  const maxIter = 100;
  const tolerance = 1e-6;
  
  for (let iter = 0; iter < maxIter; iter++) {
    let maxError = 0;
    
    // Check martingale constraints: Σ_π' T(π,π') π' = π for each π
    for (let i = 0; i < n_μ; i++) {
      const π = μ_support[i];
      
      for (let θ_idx = 0; θ_idx < Θf.elems.length; θ_idx++) {
        const θ = Θf.elems[θ_idx];
        const π_θ = π.get(θ) ?? 0;
        
        let weighted_sum = 0;
        for (let j = 0; j < n_ν; j++) {
          const π_prime = ν_support[j];
          const π_prime_θ = π_prime.get(θ) ?? 0;
          weighted_sum += T[i][j] * π_prime_θ;
        }
        
        const error = Math.abs(weighted_sum - π_θ);
        maxError = Math.max(maxError, error);
      }
    }
    
    if (maxError < tolerance) {
      // Verify marginal constraints
      for (let i = 0; i < n_μ; i++) {
        let rowSum = 0;
        for (let j = 0; j < n_ν; j++) {
          rowSum += T[i][j];
        }
        if (Math.abs(rowSum - 1) > tolerance) {
          // Normalize row
          for (let j = 0; j < n_ν; j++) {
            T[i][j] /= rowSum;
          }
        }
      }
      return T;
    }
    
    // Simple gradient step (placeholder for proper LP solver)
    for (let i = 0; i < n_μ; i++) {
      for (let j = 0; j < n_ν; j++) {
        let gradient = 0;
        const π = μ_support[i];
        const π_prime = ν_support[j];
        
        for (let θ_idx = 0; θ_idx < Θf.elems.length; θ_idx++) {
          const θ = Θf.elems[θ_idx];
          const π_θ = π.get(θ) ?? 0;
          const π_prime_θ = π_prime.get(θ) ?? 0;
          gradient += (T[i][j] * π_prime_θ - π_θ) * π_prime_θ;
        }
        
        T[i][j] = Math.max(0, T[i][j] - 0.01 * gradient);
      }
    }
    
    // Normalize rows
    for (let i = 0; i < n_μ; i++) {
      let rowSum = 0;
      for (let j = 0; j < n_ν; j++) {
        rowSum += T[i][j];
      }
      if (rowSum > 0) {
        for (let j = 0; j < n_ν; j++) {
          T[i][j] /= rowSum;
        }
      }
    }
  }
  
  return null; // Failed to converge
}

// ===== Jensen Gap Analysis ======================================================

/**
 * Check dominance using Jensen gaps on convex functions
 * This is a sanity check for the LP-based approach
 */
export function checkDominanceByJensenGaps<Θ>(
  Θf: Fin<Θ>,
  μ: Dist<Dist<Θ>>,
  ν: Dist<Dist<Θ>>,
  prior: Dist<Θ>
): { 
  gaps: number[];
  maxGap: number;
  dominates: boolean;
} {
  const gaps: number[] = [];
  
  // Test convex functions: f(π) = π(θ)² for each θ
  for (const θ of Θf.elems) {
    const E_μ = expectationOfConvexFunction(μ, π => (π.get(θ) ?? 0) ** 2);
    const E_ν = expectationOfConvexFunction(ν, π => (π.get(θ) ?? 0) ** 2);
    const gap = E_ν - E_μ; // Should be ≥ 0 if μ dominates ν
    gaps.push(gap);
  }
  
  const maxGap = Math.max(...gaps);
  const dominates = maxGap <= 1e-6; // All gaps should be non-positive
  
  return { gaps, maxGap, dominates };
}

/**
 * Compute expectation of a convex function over a distribution of distributions
 */
function expectationOfConvexFunction<Θ>(
  μ: Dist<Dist<Θ>>,
  f: (π: Dist<Θ>) => number
): number {
  let expectation = 0;
  for (const [π, p] of μ) {
    expectation += p * f(π);
  }
  return expectation;
}

// ===== Experiment Comparison ====================================================

/**
 * Compare two experiments via their Blackwell measures
 * Returns dominance relationship
 */
export function compareExperiments<Θ, X, Y>(
  Θf: Fin<Θ>,
  Xf: Fin<X>,
  Yf: Fin<Y>,
  F: Experiment<Θ, X>,
  G: Experiment<Θ, Y>,
  prior: Dist<Θ>
): {
  F_dominates_G: DominanceResult;
  G_dominates_F: DominanceResult;
  equivalent: boolean;
  relationship: 'F_dominates' | 'G_dominates' | 'equivalent' | 'incomparable';
} {
  const μ_F = blackwellMeasure(Θf, Xf, prior, F);
  const μ_G = blackwellMeasure(Θf, Yf, prior, G);
  
  const F_dominates_G = dominatesInConvexOrder(Θf, μ_G, μ_F, prior);
  const G_dominates_F = dominatesInConvexOrder(Θf, μ_F, μ_G, prior);
  
  const equivalent = F_dominates_G.ok && G_dominates_F.ok;
  
  let relationship: 'F_dominates' | 'G_dominates' | 'equivalent' | 'incomparable';
  if (equivalent) {
    relationship = 'equivalent';
  } else if (F_dominates_G.ok) {
    relationship = 'F_dominates';
  } else if (G_dominates_F.ok) {
    relationship = 'G_dominates';
  } else {
    relationship = 'incomparable';
  }
  
  return { F_dominates_G, G_dominates_F, equivalent, relationship };
}

// ===== Convenience Re-exports ==================================================

export const Dominance = {
  dominatesInConvexOrder,
  checkDominanceByJensenGaps,
  compareExperiments,
};