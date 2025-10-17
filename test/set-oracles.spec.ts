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
});
