import { describe, expect, it } from "vitest";
import { SetCat } from "../set-cat";
import { SetOracles } from "../oracles/set-oracles";

describe("Set oracles", () => {
  const Empty = SetCat.obj<never>([]);
  const One = SetCat.obj([null]);
  const Two = SetCat.obj([0, 1]);
  const Three = SetCat.obj(["a", "b", "c"]);

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

  it("certifies binary products via universal-property witnesses", () => {
    const Domain = SetCat.obj([0, 1, 2]);
    const leftLeg = SetCat.hom(Domain, Two, (n) => (n % 2 === 0 ? 0 : 1));
    const rightLeg = SetCat.hom(Domain, Three, (n) => (n === 0 ? "a" : n === 1 ? "b" : "c"));
    const witness = SetOracles.product.witness(Two, Three, [
      { label: "domain legs", domain: Domain, legs: [leftLeg, rightLeg] },
    ]);

    const report = SetOracles.product.check(witness);
    expect(report.holds).toBe(true);
    expect(report.details.samples[0]?.trianglesHold).toBe(true);
    expect(report.details.samples[0]?.componentwiseCollapse).toBe(true);
  });

  it("flags product mediators that fail the universal property", () => {
    const Domain = SetCat.obj([0, 1, 2]);
    const leftLeg = SetCat.hom(Domain, Two, (n) => (n % 2 === 0 ? 0 : 1));
    const rightLeg = SetCat.hom(Domain, Three, (n) => (n === 0 ? "a" : n === 1 ? "b" : "c"));
    const witness = SetOracles.product.witness(Two, Three, [
      { label: "bad mediator", domain: Domain, legs: [leftLeg, rightLeg] },
    ]);
    const canonicalSample = witness.samples[0]!;
    const wrongPair = Array.from(witness.product)[0]!;
    const wrongMediator = SetCat.hom(canonicalSample.domain, witness.product, () => wrongPair);
    const brokenWitness = {
      ...witness,
      samples: [
        {
          ...canonicalSample,
          mediator: wrongMediator,
        },
      ],
    } as typeof witness;

    const report = SetOracles.product.check(brokenWitness);
    expect(report.holds).toBe(false);
    expect(report.failures[0]).toContain("fails product triangles");
  });

  it("certifies binary coproducts via universal-property witnesses", () => {
    const Codomain = SetCat.obj(["left", "right", "other"]);
    const leftLeg = SetCat.hom(Two, Codomain, (n) => (n === 0 ? "left" : "other"));
    const rightLeg = SetCat.hom(Three, Codomain, (c) => (c === "a" ? "left" : c === "b" ? "right" : "other"));
    const witness = SetOracles.coproduct.witness(Two, Three, [
      { label: "cotuple", codomain: Codomain, legs: [leftLeg, rightLeg] },
    ]);

    const report = SetOracles.coproduct.check(witness);
    expect(report.holds).toBe(true);
    expect(report.details.samples[0]?.trianglesHold).toBe(true);
  });

  it("flags coproduct mediators that break the universal property", () => {
    const Codomain = SetCat.obj(["left", "right", "other"]);
    const leftLeg = SetCat.hom(Two, Codomain, () => "left");
    const rightLeg = SetCat.hom(Three, Codomain, () => "right");
    const witness = SetOracles.coproduct.witness(Two, Three, [
      { label: "bad cotuple", codomain: Codomain, legs: [leftLeg, rightLeg] },
    ]);
    const canonicalSample = witness.samples[0]!;
    const wrongMediator = SetCat.hom(witness.coproduct, Codomain, () => "other");
    const brokenWitness = {
      ...witness,
      samples: [
        {
          ...canonicalSample,
          mediator: wrongMediator,
        },
      ],
    } as typeof witness;

    const report = SetOracles.coproduct.check(brokenWitness);
    expect(report.holds).toBe(false);
    expect(report.failures[0]).toContain("fails coproduct triangles");
  });
});
