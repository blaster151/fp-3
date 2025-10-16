import { describe, expect, it } from "vitest";
import { SetCat } from "../set-cat";
import { SetOracles } from "../oracles/set-oracles";

describe("Set oracles", () => {
  const Empty = SetCat.obj<never>([]);
  const One = SetCat.obj([null]);
  const Two = SetCat.obj([0, 1]);
  const Three = SetCat.obj(["a", "b", "c"]);
  const Domain = SetCat.obj(["x", "y"]);
  const Codomain = SetCat.obj(["L0", "L1", "R_a", "R_b", "R_c"]);

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

  it("certifies the binary product universal property", () => {
    const toLeft = SetCat.hom(Domain, Two, (value) => (value === "x" ? 0 : 1));
    const toRight = SetCat.hom(Domain, Three, (value) =>
      value === "x" ? "a" : value === "y" ? "b" : "c",
    );
    const witness = SetOracles.product.witness(Two, Three, {
      mediators: [
        {
          domain: Domain,
          legs: [toLeft, toRight],
        },
      ],
      componentwise: [
        {
          targetLeft: Three,
          targetRight: Two,
          components: [
            SetCat.hom(Two, Three, (value) => (value === 0 ? "b" : "c")),
            SetCat.hom(Three, Two, (value) => (value === "a" ? 0 : 1)),
          ],
          domain: Domain,
          legs: [toLeft, toRight],
        },
      ],
    });

    const report = SetOracles.product.check(witness);
    expect(report.holds).toBe(true);
    expect(report.details.mediators[0]?.mediatorMatchesCanonical).toBe(true);
    expect(report.details.componentwise[0]?.collapseMatches).toBe(true);
  });

  it("detects incompatible product data", () => {
    const toLeft = SetCat.hom(Domain, Two, (value) => (value === "x" ? 0 : 1));
    const toRight = SetCat.hom(Domain, Three, (value) => (value === "x" ? "a" : "c"));
    const product = SetCat.product(Two, Three);
    const findPair = (left: number, right: string) => {
      for (const pair of product.object) {
        if (pair[0] === left && pair[1] === right) {
          return pair;
        }
      }
      throw new Error("pair not found");
    };
    const wrongMediator = SetCat.hom(Domain, product.object, (value) => {
      const right = toRight.map(value);
      return findPair(0, right);
    });
    const witness = SetOracles.product.witness(Two, Three, {
      mediators: [
        {
          domain: Domain,
          legs: [toLeft, toRight],
          mediator: wrongMediator,
        },
      ],
      componentwise: [
        {
          targetLeft: Two,
          targetRight: Two,
          components: [
            SetCat.hom(Two, Two, () => 0),
            SetCat.hom(Three, Two, () => 0),
          ],
          domain: Domain,
          legs: [toLeft, toRight],
        },
      ],
    });

    const report = SetOracles.product.check(witness);
    expect(report.holds).toBe(false);
    expect(report.details.mediators[0]?.leftProjectionPreserved).toBe(false);
    expect(report.details.componentwise[0]?.collapseMatches).toBe(false);
    expect(report.failures.some((message) => message.includes("componentwise"))).toBe(true);
  });

  it("certifies the binary coproduct universal property", () => {
    const leftLeg = SetCat.hom(Two, Codomain, (value) => (value === 0 ? "L0" : "L1"));
    const rightLeg = SetCat.hom(Three, Codomain, (value) => `R_${value}`);
    const witness = SetOracles.coproduct.witness(Two, Three, {
      mediators: [
        {
          codomain: Codomain,
          legs: [leftLeg, rightLeg],
        },
      ],
      componentwise: [
        {
          targetLeft: Three,
          targetRight: Two,
          components: [
            SetCat.hom(Two, Three, (value) => (value === 0 ? "a" : "c")),
            SetCat.hom(Three, Two, (value) => (value === "a" ? 0 : 1)),
          ],
        },
      ],
    });

    const report = SetOracles.coproduct.check(witness);
    expect(report.holds).toBe(true);
    expect(report.details.mediators[0]?.mediatorMatchesCanonical).toBe(true);
    expect(report.details.componentwise[0]?.compatibility).toBe(true);
  });

  it("detects incompatible coproduct data", () => {
    const leftLeg = SetCat.hom(Two, Codomain, (value) => (value === 0 ? "L0" : "L1"));
    const rightLeg = SetCat.hom(Three, Codomain, () => "R_a");
    const coproduct = SetCat.coproduct(Two, Three);
    const wrongMediator = SetCat.hom(coproduct.object, Codomain, (tagged) =>
      tagged.tag === "inl" ? "L0" : "L0",
    );
    const witness = SetOracles.coproduct.witness(Two, Three, {
      mediators: [
        {
          codomain: Codomain,
          legs: [leftLeg, rightLeg],
          mediator: wrongMediator,
        },
      ],
      componentwise: [
        {
          targetLeft: Three,
          targetRight: Two,
          components: [
            SetCat.hom(Two, Three, () => "a"),
            SetCat.hom(Three, Two, () => 0),
          ],
        },
      ],
    });

    const report = SetOracles.coproduct.check(witness);
    expect(report.holds).toBe(false);
    expect(report.details.mediators[0]?.rightInjectionRespected).toBe(false);
    expect(report.details.componentwise[0]?.compatibility).toBe(false);
    expect(report.failures.some((message) => message.includes("Coproduct componentwise"))).toBe(true);
  });
});
