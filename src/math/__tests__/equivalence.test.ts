import { describe, expect, it } from "vitest";
import { makeEquivalence } from "../Equivalence";

describe("makeEquivalence", () => {
  const equals = (a: number, b: number) => a === b;
  const witness = makeEquivalence(equals);

  it("provides reflexivity", () => {
    expect(witness.reflexive(1)).toBe(true);
    expect(witness.reflexive(5)).toBe(true);
  });

  it("provides symmetry", () => {
    expect(witness.symmetric(1, 1)).toBe(true);
    expect(witness.symmetric(1, 2)).toBe(true);
  });

  it("provides transitivity", () => {
    expect(witness.transitive(1, 1, 1)).toBe(true);
    expect(witness.transitive(1, 2, 3)).toBe(true);
  });
});
