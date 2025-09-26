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
});
