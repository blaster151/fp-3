import { describe, expect, it } from "vitest";
import {
  IntegerAdditionGroup,
  RationalAdditionGroup,
  identityAutomorphismZ,
  integerSamples,
  isGroupAutomorphism,
  negationAutomorphismZ,
  rational,
  rationalSamples,
  scalingAutomorphismQ,
} from "../kinds/group-automorphism";

describe("Group automorphisms", () => {
  it("identity automorphism on (ℤ, +) preserves structure", () => {
    expect(isGroupAutomorphism(identityAutomorphismZ, integerSamples)).toBe(true);
  });

  it("negation on (ℤ, +) is an automorphism", () => {
    expect(isGroupAutomorphism(negationAutomorphismZ, integerSamples)).toBe(true);
  });

  it("scaling by a nonzero rational on (ℚ, +) is an automorphism", () => {
    const scale = rational(3n, 2n);
    const automorphism = scalingAutomorphismQ(scale);
    expect(isGroupAutomorphism(automorphism, rationalSamples)).toBe(true);
  });

  it("round-trip of scaling and its inverse recovers the original element", () => {
    const scale = rational(-5n, 4n);
    const automorphism = scalingAutomorphismQ(scale);
    for (const sample of rationalSamples) {
      const forward = automorphism.map(sample);
      const back = automorphism.inverseMap(forward);
      expect(RationalAdditionGroup.eq(back, sample)).toBe(true);
    }
  });

  it("identity automorphism acts trivially on ℤ samples", () => {
    for (const sample of integerSamples) {
      expect(identityAutomorphismZ.map(sample)).toBe(sample);
    }
  });

  it("negation squares to identity on ℤ", () => {
    for (const sample of integerSamples) {
      expect(IntegerAdditionGroup.eq(negationAutomorphismZ.inverseMap(negationAutomorphismZ.map(sample)), sample)).toBe(true);
    }
  });
});
