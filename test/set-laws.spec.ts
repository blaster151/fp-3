import { describe, expect, it } from "vitest";
import { SetCat } from "../set-cat";
import { SetLaws } from "../set-laws";

describe("Set basics (hom-set characterisations)", () => {
  const Empty = SetCat.obj<never>([]);
  const One = SetCat.obj([null]);
  const Two = SetCat.obj([0, 1]);
  const Three = SetCat.obj(["a", "b", "c"]);

  it("has a unique map from the empty set", () => {
    expect(SetLaws.uniqueFromEmpty(Empty).holds).toBe(true);
    expect(SetLaws.uniqueFromEmpty(One).holds).toBe(true);
    expect(SetLaws.uniqueFromEmpty(Two).holds).toBe(true);
    expect(SetLaws.uniqueFromEmpty(Three).holds).toBe(true);
  });

  it("characterises the empty set via hom-sets", () => {
    expect(SetLaws.emptyByHoms(Empty).holds).toBe(true);
    expect(SetLaws.emptyByHoms(One).holds).toBe(false);
  });

  it("characterises singletons via hom-sets", () => {
    const samples = [Empty, Two, Three];
    expect(SetLaws.singletonByHoms(One, samples).holds).toBe(true);
    expect(SetLaws.singletonByHoms(Two, samples).holds).toBe(false);
  });

  it("reminds that codomains matter beyond graphs", () => {
    const f = SetCat.hom(Two, Three, x => (x === 0 ? "a" : "b"));
    const sameGraphDifferentCod = SetCat.hom(Two, SetCat.obj(["a", "b"]), x => (x === 0 ? "a" : "b"));
    expect(f.cod.size).toBe(3);
    expect(sameGraphDifferentCod.cod.size).toBe(2);
  });
});
