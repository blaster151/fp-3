import { describe, expect, it } from "vitest";

import { TwoObjectCategory } from "../../two-object-cat";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import {
  analyzeRelativeKleisliUniversalProperty,
  analyzeRelativeEilenbergMooreUniversalProperty,
  describeTrivialRelativeEilenbergMoore,
  describeTrivialRelativeKleisli,
} from "../../relative/relative-algebras";
import { describeTrivialRelativeMonad } from "../../relative/relative-monads";
import {
  enumerateRelativeAlgebraOracles,
  RelativeAlgebraOracles,
} from "../../relative/relative-algebra-oracles";

const makeTrivialPresentations = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  const monad = describeTrivialRelativeMonad(equipment, "•");
  const kleisli = describeTrivialRelativeKleisli(monad);
  const em = describeTrivialRelativeEilenbergMoore(monad);
  return { monad, kleisli, em } as const;
};

describe("Relative Kleisli universal property analyzer", () => {
  it("accepts the trivial opalgebra", () => {
    const { kleisli } = makeTrivialPresentations();
    const report = analyzeRelativeKleisliUniversalProperty(kleisli);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags incorrect left boundary", () => {
    const { kleisli, monad } = makeTrivialPresentations();
    const broken = {
      ...kleisli,
      opalgebra: {
        ...kleisli.opalgebra,
        action: {
          ...kleisli.opalgebra.action,
          boundaries: {
            ...kleisli.opalgebra.action.boundaries,
            left: monad.carrier,
          },
        },
      },
    };
    const report = analyzeRelativeKleisliUniversalProperty(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative opalgebra action left boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Relative Eilenberg–Moore universal property analyzer", () => {
  it("accepts the trivial algebra", () => {
    const { em } = makeTrivialPresentations();
    const report = analyzeRelativeEilenbergMooreUniversalProperty(em);
    expect(report.holds).toBe(true);
    expect(report.issues).toHaveLength(0);
  });

  it("flags incorrect right boundary", () => {
    const { em, monad } = makeTrivialPresentations();
    const broken = {
      ...em,
      algebra: {
        ...em.algebra,
        action: {
          ...em.algebra.action,
          boundaries: {
            ...em.algebra.action.boundaries,
            right: monad.root,
          },
        },
      },
    };
    const report = analyzeRelativeEilenbergMooreUniversalProperty(broken);
    expect(report.holds).toBe(false);
    expect(report.issues).toContain(
      "Relative algebra action right boundary must reuse the specified tight boundary.",
    );
  });
});

describe("Relative algebra oracles", () => {
  it("summarises Kleisli and Eilenberg–Moore reports", () => {
    const { kleisli, em } = makeTrivialPresentations();
    const kleisliOracle = RelativeAlgebraOracles.kleisliUniversalProperty(kleisli);
    expect(kleisliOracle.pending).toBe(false);
    expect(kleisliOracle.holds).toBe(true);
    const emOracle = RelativeAlgebraOracles.eilenbergMooreUniversalProperty(em);
    expect(emOracle.pending).toBe(false);
    expect(emOracle.holds).toBe(true);
  });

  it("enumerates the oracle catalogue", () => {
    const { kleisli, em } = makeTrivialPresentations();
    const results = enumerateRelativeAlgebraOracles(kleisli, em);
    expect(results).toHaveLength(3);
    expect(results[2].pending).toBe(true);
  });
});
