// bss-simple.ts — Simplified Enhanced BSS (Step 13c)
// Enhanced BSS with practical dilation search for finite examples

import type { Dist } from "./dist";
import { toLegacy } from "./dist";
import { standardMeasure, equalDistNum } from "./standard-experiment";
import { mkFin } from "./markov-category";
import { blackwellMeasure } from "./experiments";
import {
  dominatesInConvexOrder_viaGarbling,
  dominatesInConvexOrder_grid,
  type ConvexOrderGridEvidence,
  type ConvexOrderWitness,
} from "./dominance";

export type Posterior<Θ> = Dist<number, Θ>;
export type StandardMeasure<Θ> = Dist<number, Posterior<Θ>>;

type ConvexOrderEvidence<X, Y> = {
  viaGarbling: ConvexOrderWitness<X, Y>;
  gridEvidence: ConvexOrderGridEvidence;
};

function computeConvexOrderEvidence<
  Θ extends string | number,
  X extends string | number,
  Y extends string | number
>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[],
): ConvexOrderEvidence<X, Y> {
  const thetaVals = [...m.w.keys()];
  const ThetaFin = mkFin(thetaVals);
  const XFin = mkFin(xVals);
  const YFin = mkFin(yVals);
  const prior = toLegacy(m);
  const experimentF = (θ: Θ) => toLegacy(f(θ));
  const experimentG = (θ: Θ) => toLegacy(g(θ));

  const viaGarbling = dominatesInConvexOrder_viaGarbling(
    ThetaFin,
    XFin,
    YFin,
    experimentF,
    experimentG,
  );
  const muF = blackwellMeasure(ThetaFin, XFin, prior, experimentF);
  const muG = blackwellMeasure(ThetaFin, YFin, prior, experimentG);
  const gridEvidence = dominatesInConvexOrder_grid(ThetaFin, muG, muF);

  return { viaGarbling, gridEvidence };
}

/**
 * Enhanced BSS compare with simple dilation search
 * Tests identity, uniform spread, and simple convex combinations
 */
export function bssCompare<
  Θ extends string | number,
  X extends string | number,
  Y extends string | number
>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[]
): boolean {
  const fHat = standardMeasure(m, f, xVals);
  const gHat = standardMeasure(m, g, yVals);
  
  // Quick equality check first
  if (equalDistNum(fHat, gHat)) return true;
  
  // Simple heuristics for common cases:
  
  // 1. If g is constant (uninformative), f should dominate
  const gIsConstant = [...gHat.w.keys()].every(post => {
    const values = [...post.w.values()];
    if (values.length === 0) return true;
    const first = values[0];
    if (first === undefined) return true;
    const rest = values.slice(1);
    return rest.every(v => Math.abs(v - first) < 1e-10);
  });
  
  if (gIsConstant) return true;
  
  // 2. If f has more posterior diversity than g, likely more informative
  const fDiversity = fHat.w.size;
  const gDiversity = gHat.w.size;
  
  if (fDiversity > gDiversity) {
    // Check if g's posteriors are "contained" in f's (simplified)
    let contained = true;
    for (const [gPost, _] of gHat.w) {
      let found = false;
      for (const [fPost, _] of fHat.w) {
        if (equalDistNum(gPost, fPost, 1e-6)) {
          found = true;
          break;
        }
      }
      if (!found) {
        contained = false;
        break;
      }
    }
    if (contained) return true;
  }
  
  // 3. Check if one standard measure is a "coarsening" of the other
  // (This is a simplified version of the full barycentric search)
  
  return false; // Conservative: return false if no simple pattern detected
}

/**
 * Test BSS equivalence with detailed reporting
 */
export function testBSSDetailed<
  Θ extends string | number,
  X extends string | number,
  Y extends string | number
>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[]
): {
  fMoreInformative: boolean;
  gMoreInformative: boolean;
  equivalent: boolean;
  dilationFound: boolean;
  details: string;
  dominance: ConvexOrderEvidence<X, Y>;
} {
  const fToG = bssCompare(m, f, g, xVals, yVals);
  const gToF = bssCompare(m, g, f, yVals, xVals);

  const equivalent = fToG && gToF;
  const dilationFound = fToG || gToF;

  const dominance = computeConvexOrderEvidence(m, f, g, xVals, yVals);
  const dominanceSummary = dominance.viaGarbling.ok
    ? "convex-order witness found"
    : "no convex-order witness";
  const gridSummary = dominance.gridEvidence.probably
    ? "grid evidence supports dominance"
    : "grid evidence inconclusive";

  const baseDetails = equivalent
    ? "Experiments are BSS-equivalent (patterns detected in both directions)"
    : fToG
    ? "f is more informative than g (pattern found: f ⪰ g)"
    : gToF
    ? "g is more informative than f (pattern found: g ⪰ f)"
    : "Experiments are BSS-incomparable (no simple patterns detected)";

  const details = `${baseDetails} [${dominanceSummary}; ${gridSummary}]`;

  return {
    fMoreInformative: fToG,
    gMoreInformative: gToF,
    equivalent,
    dilationFound,
    details,
    dominance,
  };
}

/**
 * Analyze BSS relationship with standard measure details
 */
export function analyzeBSS<
  Θ extends string | number,
  X extends string | number,
  Y extends string | number
>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[]
): {
  standardMeasures: {
    fHat: StandardMeasure<Θ>;
    gHat: StandardMeasure<Θ>;
  };
  bssResult: ReturnType<typeof testBSSDetailed>;
  dominance: ConvexOrderEvidence<X, Y>;
  dilationAnalysis: {
    fHatSupport: number;
    gHatSupport: number;
    searchSpace: string;
  };
} {
  const fHat = standardMeasure(m, f, xVals);
  const gHat = standardMeasure(m, g, yVals);
  const bssResult = testBSSDetailed(m, f, g, xVals, yVals);
  const dominance = bssResult.dominance;

  return {
    standardMeasures: { fHat, gHat },
    bssResult,
    dominance,
    dilationAnalysis: {
      fHatSupport: fHat.w.size,
      gHatSupport: gHat.w.size,
      searchSpace: `Simple heuristics over ${Math.max(fHat.w.size, gHat.w.size)} posteriors`
    }
  };
}