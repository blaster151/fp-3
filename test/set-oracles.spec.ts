import { describe, expect, it } from "vitest";
import { SetCat } from "../set-cat";
import { SetOracles } from "../oracles/set-oracles";

describe("Set oracles", () => {
  const Empty = SetCat.obj<never>([]);
  const One = SetCat.obj([null]);
  const Two = SetCat.obj([0, 1]);
  const Three = SetCat.obj(["a", "b", "c"]);

  it("packages binary products with executable mediators", () => {
    const witness = SetOracles.product.witness(Two, Three);
    const domain = SetCat.obj(["x", "y", "z"]);
    const leftLeg = SetCat.hom(domain, Two, value => (value === "x" ? 0 : 1));
    const rightLeg = SetCat.hom(domain, Three, value => (value === "z" ? "c" : "a"));
    const mediator = witness.product.tuple(domain, [leftLeg, rightLeg]);

    const components = [SetCat.id(Two), SetCat.id(Three)] as const;
    const componentwise = witness.componentwise({
      source: witness.product,
      target: witness.product,
      components,
    });

    expect(
      witness.checkComponentwiseCollapse({
        source: witness.product,
        target: witness.product,
        componentwise,
        components,
        domain,
        legs: [leftLeg, rightLeg],
      }),
    ).toBe(true);

    const twistedRightLeg = SetCat.hom(domain, Three, () => "b");
    expect(
      witness.checkComponentwiseCollapse({
        source: witness.product,
        target: witness.product,
        componentwise,
        components,
        domain,
        legs: [leftLeg, twistedRightLeg],
      }),
    ).toBe(false);

    const restrictionDomain = SetCat.obj(["x", "y"]);
    const inclusion = SetCat.hom(restrictionDomain, domain, value => value);
    expect(
      witness.checkNaturality({
        product: witness.product,
        mediator,
        legs: [leftLeg, rightLeg],
        precomposition: {
          arrow: inclusion,
          source: restrictionDomain,
        },
      }),
    ).toBe(true);

    expect(
      witness.checkNaturality({
        product: witness.product,
        mediator,
        legs: [leftLeg, twistedRightLeg],
        precomposition: {
          arrow: inclusion,
          source: restrictionDomain,
        },
      }),
    ).toBe(false);
  });

  it("packages binary coproduct witnesses with copair collapse checks", () => {
    const witness = SetOracles.coproduct.witness(Two, Three);
    const target = SetCat.obj(["left", "right", "both"]);
    const fromLeft = SetCat.hom(Two, target, value => (value === 0 ? "left" : "both"));
    const fromRight = SetCat.hom(Three, target, value => (value === "c" ? "both" : "right"));
    const mediator = witness.copair(target, [fromLeft, fromRight]);

    const collapse = witness.checkCopairCollapse({
      target,
      mediator,
      legs: [fromLeft, fromRight],
    });
    expect(collapse.holds).toBe(true);

    const skewRight = SetCat.hom(Three, target, value => (value === "a" ? "left" : "right"));
    const failure = witness.checkCopairCollapse({
      target,
      mediator,
      legs: [fromLeft, skewRight],
    });
    expect(failure.holds).toBe(false);
    expect(failure.failures).toContain("copair collapse: mediator ∘ inr must recover the right leg");
  });

  it("verifies unique maps out of the empty set", () => {
    const witness = SetOracles.uniqueFromEmpty.witness(Three);
    const report = SetOracles.uniqueFromEmpty.check(witness);
    expect(report.holds).toBe(true);
    expect(report.details.homCount).toBe(1);
  });

  it("recognises the empty set via hom data", () => {
    const witness = SetOracles.emptyByHoms.witness(Empty, [One, Two, Three]);
    const report = SetOracles.emptyByHoms.check(witness);
    expect(report.holds).toBe(true);
  });

  it("rejects nonempty sets in the empty-set oracle", () => {
    const witness = SetOracles.emptyByHoms.witness(One, [Two]);
    const report = SetOracles.emptyByHoms.check(witness);
    expect(report.holds).toBe(false);
  });

  it("recognises singletons via hom data", () => {
    const witness = SetOracles.singletonByHoms.witness(One, [Empty, Two, Three]);
    const report = SetOracles.singletonByHoms.check(witness);
    expect(report.holds).toBe(true);
  });

  it("rejects larger sets in the singleton oracle", () => {
    const witness = SetOracles.singletonByHoms.witness(Two, [Empty, Two]);
    const report = SetOracles.singletonByHoms.check(witness);
    expect(report.holds).toBe(false);
  });

  it("treats elements as arrows out of the singleton", () => {
    const witness = SetOracles.elementsAsArrows.witness(Three);
    const report = SetOracles.elementsAsArrows.check(witness);
    expect(report.holds).toBe(true);
    expect(report.details.homCount).toBe(Three.size);
    expect(report.details.size).toBe(Three.size);
  });

  it("packages exponentials with executable currying diagnostics", () => {
    const base = SetCat.obj([0, 1]);
    const codomain = SetCat.obj(["a", "b", "c"]);
    const witness = SetOracles.exponential.witness(base, codomain);
    const domain = SetCat.obj(["x", "y"]);
    const product = SetCat.product(domain, base);
    const mediator = SetCat.hom(product.object, codomain, ([label, index]) => {
      if (label === "x" && index === 0) return "a";
      if (label === "y" && index === 1) return "c";
      return "b";
    });

    const triangle = witness.checkEvaluationTriangle({ domain, product, mediator });
    expect(triangle.holds).toBe(true);

    const transpose = witness.curry({ domain, product, mediator });
    const uniqueness = witness.checkCurryUniqueness({ domain, product, mediator, candidate: transpose });
    expect(uniqueness.holds).toBe(true);

    const roundTrip = witness.checkUncurryRoundTrip({ domain, product, mediator });
    expect(roundTrip.holds).toBe(true);

    const skewDomain = SetCat.obj(["z"]);
    const skewProduct = SetCat.product(skewDomain, base);
    expect(() => witness.curry({ domain: skewDomain, product: skewProduct, mediator })).toThrow();
  });

  it("verifies power-set enumerations with characteristic vectors", () => {
    const witness = SetOracles.powerSet.witness(Two);
    const report = SetOracles.powerSet.check(witness);
    expect(report.holds).toBe(true);
    expect(report.details.expectedSize).toBe(4);
    expect(report.details.actualSize).toBe(4);

    const tampered = { ...witness, subsets: witness.subsets.slice(1) };
    expect(SetOracles.powerSet.check(tampered as typeof witness).holds).toBe(false);
  });

  it("detects Cantor-diagonal separations from power-set images", () => {
    const domain = SetCat.obj([0, 1, 2]);
    const mapping = (value: number) =>
      value === 0 ? SetCat.obj([0]) : value === 1 ? SetCat.obj([0, 1]) : SetCat.obj([2]);
    const witness = SetOracles.cantorDiagonal.witness(domain, mapping);
    const report = SetOracles.cantorDiagonal.check(witness);
    expect(report.holds).toBe(true);
    expect(report.details.diagonalSize).toBe(domain.size);

    const skew = { ...witness, diagonal: new Set([...witness.diagonal, 99]) };
    expect(SetOracles.cantorDiagonal.check(skew as typeof witness).holds).toBe(false);
  });

  it("records finite cardinality comparisons", () => {
    const witness = SetOracles.compareCardinalities.witness(Two, Three);
    const report = SetOracles.compareCardinalities.check(witness);
    expect(report.holds).toBe(true);
    expect(report.details.relation).toBe("less");
    expect(report.details.difference).toBe(1);

    const skew = {
      ...witness,
      analysis: { ...witness.analysis, leftSize: witness.analysis.leftSize + 1 },
    };
    expect(SetOracles.compareCardinalities.check(skew as typeof witness).holds).toBe(false);
  });
});
