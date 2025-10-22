import { describe, expect, it } from "vitest";

import { finiteDimensionalDualFunctorWithWitness } from "../functor-dual";
import { EnhancedVect } from "../stdlib/enhanced-vect";

describe("finite-dimensional dual functor toolkit", () => {
  const toolkit = finiteDimensionalDualFunctorWithWitness();
  const { contravariant, opposite, doubleDual, evaluation, coevaluation, objectOf, transposeOf } =
    toolkit;

  it("confirms the contravariant dual functor laws", () => {
    expect(contravariant.report.holds).toBe(true);
    expect(contravariant.report.preservesIdentities).toBe(true);
    expect(contravariant.report.preservesReversedComposition).toBe(true);
    expect(contravariant.report.respectsReversedEndpoints).toBe(true);
  });

  it("witnesses the opposite-category functor", () => {
    expect(opposite.report.holds).toBe(true);
    expect(opposite.report.preservesIdentities).toBe(true);
    expect(opposite.report.preservesComposition).toBe(true);
    expect(opposite.report.respectsSourcesAndTargets).toBe(true);
  });

  it("treats the double dual as the identity functor on EnhancedVect", () => {
    expect(doubleDual.report.holds).toBe(true);
    expect(doubleDual.report.preservesIdentities).toBe(true);
    expect(doubleDual.report.preservesComposition).toBe(true);
    expect(doubleDual.report.respectsSourcesAndTargets).toBe(true);

    const V2: EnhancedVect.VectObj = { dim: 2 };
    const swap: EnhancedVect.VectMor = {
      matrix: [
        [0, 1],
        [1, 0],
      ],
      from: V2,
      to: V2,
    };

    const mapped = doubleDual.functor.F1(swap);
    expect(EnhancedVect.Vect.equalMor!(mapped, swap)).toBe(true);
  });

  it("enumerates the dual objects and their transpose maps", () => {
    const V1: EnhancedVect.VectObj = { dim: 1 };
    const V2: EnhancedVect.VectObj = { dim: 2 };

    const dual1 = objectOf(V1);
    expect(dual1.dim).toBe(1);

    const bidual2 = objectOf(objectOf(V2));
    expect(bidual2).toBe(V2);

    const arrow: EnhancedVect.VectMor = {
      matrix: [
        [1, 2],
        [3, 4],
      ],
      from: V2,
      to: V2,
    };

    const transpose = transposeOf(arrow);
    expect(transpose.matrix).toEqual([
      [1, 3],
      [2, 4],
    ]);
    expect(transpose.from.dim).toBe(arrow.to.dim);
    expect(transpose.to.dim).toBe(arrow.from.dim);
  });

  it("packs the evaluation and coevaluation natural isomorphisms", () => {
    expect(evaluation.report.holds).toBe(true);
    expect(evaluation.report.satisfiesNaturality).toBe(true);
    expect(coevaluation.report.holds).toBe(true);
    expect(coevaluation.report.satisfiesNaturality).toBe(true);

    const V3: EnhancedVect.VectObj = { dim: 3 };
    const evalComponent = evaluation.transformation.component(V3);
    const coevalComponent = coevaluation.transformation.component(V3);

    expect(EnhancedVect.Vect.equalMor!(evalComponent, EnhancedVect.Vect.id(V3))).toBe(true);
    expect(EnhancedVect.Vect.equalMor!(coevalComponent, EnhancedVect.Vect.id(V3))).toBe(true);
  });
});
