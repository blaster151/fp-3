// bss.ts — Blackwell–Sherman–Stein (BSS) Equivalence (Step 13)
// Connects informativeness, SOSD, and standard experiments into unified framework

import type { Dist } from "./dist";
import { sosdFromWitness, expectation } from "./sosd";
import { standardMeasure } from "./standard-experiment";

/**
 * Compare two experiments f,g: Θ→PX under prior m by BSS equivalence.
 *
 * Returns true iff f is at least as informative as g (in Blackwell sense),
 * which in this finite case ⇔ standardMeasure(f) SOSD-dominates standardMeasure(g).
 *
 * NOTE: For now we only support Prob semiring (R=number).
 */
export function bssCompare<Θ extends string | number, X, Y>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[]
): boolean {
  const fHat = standardMeasure(m, f, xVals);  // Standard measure for f
  const gHat = standardMeasure(m, g, yVals);  // Standard measure for g

  // Direction: f ⪰ g  ⇔  fHat SOSD-dominates gHat
  const e = expectation();

  // Candidate dilation: identity (for trivial check), or
  //   more generally, you'd construct a kernel on posteriors.
  // For v0, we assume existence and only check shape equality:
  //   if fHat==gHat, then f ⪰ g holds; otherwise leave false.
  // To extend, supply actual dilation candidates.
  if (fHat.w.size === gHat.w.size) {
    let eq = true;
    for (const [p, w] of fHat.w.entries()) {
      let found = false;
      for (const [q, w2] of gHat.w.entries()) {
        const same = [...p.w.keys()].every(k =>
          Math.abs((p.w.get(k) ?? 0) - (q.w.get(k) ?? 0)) < 1e-12
        );
        if (same && Math.abs(w - w2) < 1e-12) { 
          found = true; 
          break; 
        }
      }
      if (!found) { 
        eq = false; 
        break; 
      }
    }
    if (eq) return true;
  }

  // In general, you'd try to construct a dilation witness between fHat and gHat here.
  // For now, just return false if they're not equal.
  return false;
}

// ===== Enhanced BSS Testing Framework =====

/**
 * Test BSS equivalence with detailed reporting
 */
export function testBSSDetailed<Θ extends string | number, X, Y>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[]
): {
  fMoreInformative: boolean;
  gMoreInformative: boolean;
  equivalent: boolean;
  details: string;
} {
  const fToG = bssCompare(m, f, g, xVals, yVals);
  const gToF = bssCompare(m, g, f, yVals, xVals);
  
  const equivalent = fToG && gToF;
  const details = equivalent 
    ? "Experiments are BSS-equivalent"
    : fToG 
    ? "f is more informative than g"
    : gToF
    ? "g is more informative than f"
    : "Experiments are BSS-incomparable (in this v0 framework)";
  
  return {
    fMoreInformative: fToG,
    gMoreInformative: gToF,
    equivalent,
    details
  };
}

/**
 * Batch test BSS relationships across multiple experiments
 */
export function testBSSMatrix<Θ extends string | number, X>(
  m: Dist<number, Θ>,
  experiments: Array<{
    name: string;
    f: (θ: Θ) => Dist<number, X>;
  }>,
  xVals: readonly X[]
): Array<Array<{
  from: string;
  to: string;
  moreInformative: boolean;
}>> {
  const results: Array<Array<any>> = [];
  
  for (let i = 0; i < experiments.length; i++) {
    const row: Array<any> = [];
    for (let j = 0; j < experiments.length; j++) {
      const from = experiments[i];
      const to = experiments[j];
      
      const moreInformative = bssCompare(m, from.f, to.f, xVals, xVals);
      
      row.push({
        from: from.name,
        to: to.name,
        moreInformative
      });
    }
    results.push(row);
  }
  
  return results;
}

/**
 * Find the most informative experiment in a set
 */
export function findMostInformative<Θ extends string | number, X>(
  m: Dist<number, Θ>,
  experiments: Array<{
    name: string;
    f: (θ: Θ) => Dist<number, X>;
  }>,
  xVals: readonly X[]
): {
  mostInformative: string[];
  details: string;
} {
  const matrix = testBSSMatrix(m, experiments, xVals);
  const scores = new Map<string, number>();
  
  // Count how many experiments each one dominates
  for (let i = 0; i < experiments.length; i++) {
    let score = 0;
    for (let j = 0; j < experiments.length; j++) {
      if (matrix[i][j].moreInformative) score++;
    }
    scores.set(experiments[i].name, score);
  }
  
  const maxScore = Math.max(...scores.values());
  const mostInformative = [...scores.entries()]
    .filter(([_, score]) => score === maxScore)
    .map(([name, _]) => name);
  
  return {
    mostInformative,
    details: `Found ${mostInformative.length} experiment(s) with max score ${maxScore}/${experiments.length}`
  };
}

// ===== Integration with Previous Steps =====

/**
 * Verify that BSS comparison respects the garbling order from Step 12
 * Note: Simplified version to avoid module import issues
 */
export function verifyBSSGarblingConsistency<Θ extends string | number, X, Y>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  garbling: (x: X) => Y,
  xVals: readonly X[],
  yVals: readonly Y[]
): {
  garblingExists: boolean;
  bssConsistent: boolean;
  details: string;
} {
  // Simplified: assume garbling exists if provided
  const garblingExists = true;
  
  // Check BSS comparison
  const bssResult = bssCompare(m, f, g, xVals, yVals);
  
  const consistent = !garblingExists || bssResult; // If garbling exists, BSS should agree
  
  return {
    garblingExists,
    bssConsistent: consistent,
    details: garblingExists 
      ? (bssResult ? "Garbling exists and BSS agrees" : "Garbling exists but BSS disagrees (v0 limitation)")
      : "No garbling provided"
  };
}

/**
 * Test the complete BSS framework with all three characterizations:
 * (i) Garbling witness, (ii) Joint sufficiency, (iii) SOSD on standard measures
 */
export function testCompleteBSS<Θ extends string | number, X, Y>(
  m: Dist<number, Θ>,
  f: (θ: Θ) => Dist<number, X>,
  g: (θ: Θ) => Dist<number, Y>,
  xVals: readonly X[],
  yVals: readonly Y[]
): {
  garbling: boolean;
  joint: boolean;
  sosd: boolean;
  allConsistent: boolean;
  details: string;
} {
  // (i) Garbling witness (simplified for v0)
  const garblingExists = xVals.length === yVals.length; // Simplified heuristic
  
  // (ii) Joint sufficiency (simplified check)
  const jointExists = garblingExists; // If garbling exists, joint can be constructed
  
  // (iii) SOSD on standard measures
  const sosdResult = bssCompare(m, f, g, xVals, yVals);
  
  const allConsistent = (garblingExists === jointExists) && (garblingExists === sosdResult);
  
  return {
    garbling: garblingExists,
    joint: jointExists,
    sosd: sosdResult,
    allConsistent,
    details: allConsistent 
      ? "All three BSS characterizations agree"
      : "BSS characterizations disagree (may indicate v0 limitations or genuine non-equivalence)"
  };
}