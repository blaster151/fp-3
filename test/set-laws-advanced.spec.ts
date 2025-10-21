import { describe, expect, it } from "vitest";
import { SetCat } from "../set-cat";
import { SetLaws } from "../set-laws";

describe("Advanced Set laws", () => {
  it("enumerates the power set with characteristic maps", () => {
    const source = SetCat.obj(["x", "y"]);
    const evidence = SetLaws.powerSetEvidence(source);
    expect(evidence.subsetCarrier.size).toBe(4);
    expect(evidence.characteristicCarrier.size).toBe(4);
    expect(evidence.subsets).toHaveLength(4);

    const ambientElements = Array.from(source);
    const characteristicSignatures = evidence.subsets.map(({ characteristic }) =>
      ambientElements
        .map(element => (characteristic.map(element) ? "1" : "0"))
        .join(""),
    );
    expect(new Set(characteristicSignatures)).toEqual(new Set(["00", "10", "01", "11"]));
  });

  it("constructs Cantor diagonal diagnoses", () => {
    const domain = SetCat.obj([0, 1, 2]);
    const mapping = (value: number) =>
      value === 0 ? SetCat.obj([0]) : value === 1 ? SetCat.obj([0, 1]) : SetCat.obj<number>([]);
    const evidence = SetLaws.cantorDiagonalEvidence(domain, mapping);
    expect(evidence.diagonal.subset.has(0)).toBe(false);
    expect(evidence.diagonal.subset.has(1)).toBe(false);
    expect(evidence.diagonal.subset.has(2)).toBe(true);
    evidence.diagnoses.forEach(({ element, diagonalValue, imageValue, imageWitness }) => {
      expect(diagonalValue).not.toBe(imageValue);
      expect(imageWitness.subset.has(element)).toBe(imageValue);
      expect(evidence.diagonal.characteristic.map(element)).toBe(diagonalValue);
    });
  });

  it("compares finite cardinalities", () => {
    const smaller = SetCat.obj([0, 1]);
    const larger = SetCat.obj(["a", "b", "c"]);
    const comparison = SetLaws.compareCardinalities(smaller, larger);
    expect(comparison.relation).toBe("less");
    expect(comparison.leftSize).toBe(2);
    expect(comparison.rightSize).toBe(3);
    expect(comparison.difference).toBe(1);
  });
});
