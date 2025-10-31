import { describe, expect, it } from "vitest";

import {
  analyzePromonoidalKernel,
  makeTwoObjectPromonoidalKernel,
  type PromonoidalKernel,
} from "../promonoidal-structure";
import { TwoObjectCategory, nonIdentity, type TwoObject, type TwoArrow } from "../two-object-cat";

describe("Promonoidal structure helpers", () => {
  it("exposes the two-object kernel evaluation", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const { profunctor } = kernel.tensor;

    const atDot = profunctor.evaluate("•", "•", "•");
    expect(atDot).toEqual([
      { arrow: TwoObjectCategory.id("•"), domain: "•", codomain: "•" },
    ]);

    const toStar = profunctor.evaluate("•", "•", "★");
    expect(toStar).toEqual([
      { arrow: nonIdentity, domain: "•", codomain: "★" },
    ]);

    const unitValues = kernel.unit.profunctor.evaluate("★");
    expect(unitValues).toEqual([
      { arrow: nonIdentity, domain: "•", codomain: "★" },
    ]);
  });

  it("reports successful diagnostics for the bundled kernel", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const diagnostics = analyzePromonoidalKernel(kernel);

    expect(diagnostics.tensor.leftRight.holds).toBe(true);
    expect(diagnostics.tensor.output.holds).toBe(true);
    expect(diagnostics.unit.coend.holds).toBe(true);
    expect(diagnostics.unit.end.compatibleCandidates).toBe(2);
  });

  it("flags output transport failures", () => {
    const kernel = makeTwoObjectPromonoidalKernel();
    const broken: PromonoidalKernel<TwoObject, TwoArrow> = {
      ...kernel,
      tensor: {
        ...kernel.tensor,
        profunctor: {
          ...kernel.tensor.profunctor,
          actOnOutput: (left, right, arrow, value) => ({
            ...value,
            codomain: kernel.base.src(arrow),
          }),
        },
      },
    };

    const diagnostics = analyzePromonoidalKernel(broken);
    expect(diagnostics.tensor.leftRight.holds).toBe(true);
    expect(diagnostics.tensor.output.holds).toBe(false);
    expect(diagnostics.tensor.output.missingDiagonalWitnesses).not.toHaveLength(0);
  });
});

