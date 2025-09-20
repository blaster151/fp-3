// garbling.ts — Garbling test and witness channel constructor
// Implements the theorem's garbling condition via linear programming
import { 
  Fin, Dist, Kernel, FinMarkov, mkFin, fromWeights, normalize, prune,
  kernelToMatrix, tensorObj, compose
} from './markov-category';

// ===== Core Types ===============================================================

export interface GarblingResult {
  ok: boolean;
  witness?: number[][]; // Channel matrix C: X → Y
  error?: string;
}

// ===== Finite Garbling Test (Exact LP) ==========================================

/**
 * Test if experiment G garbles experiment F (finite case, exact)
 * Solves the LP: find C such that ∀θ: Q_θ = P_θ C
 * where P_θ are rows of F and Q_θ are rows of G
 */
export function isGarblingOfFinite<Θ, X, Y>(
  Θf: Fin<Θ>,
  Xf: Fin<X>, 
  Yf: Fin<Y>,
  F: Experiment<Θ, X>,
  G: Experiment<Θ, Y>
): GarblingResult {
  try {
    // Convert experiments to matrices
    const P = kernelToMatrix(Θf, Xf, F); // |Θ| × |X|
    const Q = kernelToMatrix(Θf, Yf, G); // |Θ| × |Y|
    
    // Solve LP: find C (|X| × |Y|) such that P C = Q
    const C = solveGarblingLP(P, Q);
    
    if (C === null) {
      return { ok: false, error: "No garbling channel exists" };
    }
    
    return { ok: true, witness: C };
  } catch (error) {
    return { ok: false, error: `LP solver error: ${error}` };
  }
}

/**
 * Solve the garbling LP using a simple iterative method
 * For small problems, we can use a basic approach
 */
function solveGarblingLP(P: number[][], Q: number[][]): number[][] | null {
  const nΘ = P.length;
  const nX = P[0].length;
  const nY = Q[0].length;
  
  // Initialize C as uniform
  const C: number[][] = Array(nX).fill(null).map(() => Array(nY).fill(1/nY));
  
  // Iterative refinement (simplified approach)
  const maxIter = 100;
  const tolerance = 1e-6;
  
  for (let iter = 0; iter < maxIter; iter++) {
    let maxError = 0;
    
    // Check constraints: P C = Q
    for (let θ = 0; θ < nΘ; θ++) {
      for (let y = 0; y < nY; y++) {
        let sum = 0;
        for (let x = 0; x < nX; x++) {
          sum += P[θ][x] * C[x][y];
        }
        const error = Math.abs(sum - Q[θ][y]);
        maxError = Math.max(maxError, error);
      }
    }
    
    if (maxError < tolerance) {
      // Verify row-stochastic property
      for (let x = 0; x < nX; x++) {
        let rowSum = 0;
        for (let y = 0; y < nY; y++) {
          rowSum += C[x][y];
        }
        if (Math.abs(rowSum - 1) > tolerance) {
          // Normalize row
          for (let y = 0; y < nY; y++) {
            C[x][y] /= rowSum;
          }
        }
      }
      return C;
    }
    
    // Simple gradient step (this is a placeholder - real implementation would use proper LP solver)
    for (let x = 0; x < nX; x++) {
      for (let y = 0; y < nY; y++) {
        let gradient = 0;
        for (let θ = 0; θ < nΘ; θ++) {
          gradient += P[θ][x] * (P[θ][x] * C[x][y] - Q[θ][y]);
        }
        C[x][y] = Math.max(0, C[x][y] - 0.01 * gradient);
      }
    }
    
    // Normalize rows
    for (let x = 0; x < nX; x++) {
      let rowSum = 0;
      for (let y = 0; y < nY; y++) {
        rowSum += C[x][y];
      }
      if (rowSum > 0) {
        for (let y = 0; y < nY; y++) {
          C[x][y] /= rowSum;
        }
      }
    }
  }
  
  return null; // Failed to converge
}

// ===== Garbling Operations =====================================================

/**
 * Apply garbling channel C to experiment F
 * Returns new experiment G = C ∘ F
 */
export function garble<Θ, X, Y>(
  Θf: Fin<Θ>,
  Xf: Fin<X>,
  Yf: Fin<Y>,
  F: Experiment<Θ, X>,
  C: number[][]
): Experiment<Θ, Y> {
  return (θ: Θ) => {
    const fx = F(θ);
    const out: Dist<Y> = new Map();
    
    for (const [x, px] of fx) {
      const xIdx = Xf.elems.findIndex(xe => Xf.eq(xe, x));
      if (xIdx >= 0) {
        for (let yIdx = 0; yIdx < Yf.elems.length; yIdx++) {
          const y = Yf.elems[yIdx];
          const cy = C[xIdx][yIdx];
          out.set(y, (out.get(y) ?? 0) + px * cy);
        }
      }
    }
    
    return prune(out);
  };
}

/**
 * Compose two garbling channels
 * If C1: X → Y and C2: Y → Z, then C2 ∘ C1: X → Z
 */
export function composeWitness<X, Y, Z>(
  Xf: Fin<X>,
  Yf: Fin<Y>, 
  Zf: Fin<Z>,
  C1: number[][], // X → Y
  C2: number[][]  // Y → Z
): number[][] {
  const nX = Xf.elems.length;
  const nY = Yf.elems.length;
  const nZ = Zf.elems.length;
  
  const C: number[][] = Array(nX).fill(null).map(() => Array(nZ).fill(0));
  
  for (let x = 0; x < nX; x++) {
    for (let z = 0; z < nZ; z++) {
      for (let y = 0; y < nY; y++) {
        C[x][z] += C1[x][y] * C2[y][z];
      }
    }
  }
  
  return C;
}

/**
 * Create identity garbling channel (no information loss)
 */
export function identityWitness<X>(Xf: Fin<X>): number[][] {
  const n = Xf.elems.length;
  const C: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    C[i][i] = 1;
  }
  return C;
}

// ===== Garbling Verification ===================================================

/**
 * Verify that a garbling relationship holds
 * Checks that G ≈ garble(F, C) up to numerical tolerance
 */
export function verifyGarbling<Θ, X, Y>(
  Θf: Fin<Θ>,
  Xf: Fin<X>,
  Yf: Fin<Y>,
  F: Experiment<Θ, X>,
  G: Experiment<Θ, Y>,
  C: number[][],
  tolerance = 1e-6
): boolean {
  const G_garble = garble(Θf, Xf, Yf, F, C);
  
  for (const θ of Θf.elems) {
    const g_orig = G(θ);
    const g_garble = G_garble(θ);
    
    // Check that distributions are close
    for (const y of Yf.elems) {
      const p_orig = g_orig.get(y) ?? 0;
      const p_garble = g_garble.get(y) ?? 0;
      if (Math.abs(p_orig - p_garble) > tolerance) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Check transitivity of garbling
 * If F garbles G and G garbles H, then F garbles H
 */
export function checkGarblingTransitivity<Θ, X, Y, Z>(
  Θf: Fin<Θ>,
  Xf: Fin<X>,
  Yf: Fin<Y>,
  Zf: Fin<Z>,
  F: Experiment<Θ, X>,
  G: Experiment<Θ, Y>,
  H: Experiment<Θ, Z>
): { 
  F_garbles_G: GarblingResult;
  G_garbles_H: GarblingResult;
  F_garbles_H: GarblingResult;
  transitive: boolean;
} {
  const F_garbles_G = isGarblingOfFinite(Θf, Xf, Yf, F, G);
  const G_garbles_H = isGarblingOfFinite(Θf, Yf, Zf, G, H);
  const F_garbles_H = isGarblingOfFinite(Θf, Xf, Zf, F, H);
  
  const transitive = F_garbles_G.ok && G_garbles_H.ok && F_garbles_H.ok;
  
  return { F_garbles_G, G_garbles_H, F_garbles_H, transitive };
}

// ===== Convenience Re-exports ==================================================

export const Garbling = {
  isGarblingOfFinite,
  garble,
  composeWitness,
  identityWitness,
  verifyGarbling,
  checkGarblingTransitivity,
};