import { describe, expect, it } from "vitest";
import type { GroupHomomorphism, Rational } from "../../../../kinds/group-automorphism";
import {
  IntegerAdditionGroup,
  RationalAdditionGroup,
  identityAutomorphismZ,
  negationAutomorphismZ,
  scalingAutomorphismQ,
  rational,
  integerSamples,
  rationalSamples,
} from "../../../../kinds/group-automorphism";
import {
  checkIsInverse,
  isIsomorphismByInverse,
  makeInverseWitness,
  tryBuildInverse,
} from "../inverseWitness";

describe("group inverse witnesses", () => {
  it("builds witnesses for integer automorphisms", () => {
    const identityHom: GroupHomomorphism<bigint, bigint> = identityAutomorphismZ;
    const identityInverse: GroupHomomorphism<bigint, bigint> = {
      source: IntegerAdditionGroup,
      target: IntegerAdditionGroup,
      map: identityAutomorphismZ.inverseMap,
    };

    const witness = makeInverseWitness(
      identityHom,
      identityInverse,
      integerSamples,
      integerSamples,
    );

    expect(witness.leftIdentity).toBe(true);
    expect(witness.rightIdentity).toBe(true);
    expect(isIsomorphismByInverse(witness)).toBe(true);

    const wrongInverse: GroupHomomorphism<bigint, bigint> = {
      source: IntegerAdditionGroup,
      target: IntegerAdditionGroup,
      map: () => 0n,
    };

    const badWitness = makeInverseWitness(
      identityHom,
      wrongInverse,
      integerSamples,
      integerSamples,
    );

    expect(badWitness.leftIdentity).toBe(false);
    expect(badWitness.rightIdentity).toBe(false);
    expect(isIsomorphismByInverse(badWitness)).toBe(false);
  });

  it("handles negation as its own inverse", () => {
    const negHom: GroupHomomorphism<bigint, bigint> = negationAutomorphismZ;
    const negInverse: GroupHomomorphism<bigint, bigint> = {
      source: IntegerAdditionGroup,
      target: IntegerAdditionGroup,
      map: negationAutomorphismZ.inverseMap,
    };

    const witness = makeInverseWitness(
      negHom,
      negInverse,
      integerSamples,
      integerSamples,
    );

    expect(witness.leftIdentity).toBe(true);
    expect(witness.rightIdentity).toBe(true);
  });

  it("confirms rational scaling automorphisms via witnesses", () => {
    const scale = rational(3n, 2n);
    const scaling = scalingAutomorphismQ(scale);
    const scalingHom: GroupHomomorphism<Rational, Rational> = scaling;
    const scalingInverse: GroupHomomorphism<Rational, Rational> = {
      source: RationalAdditionGroup,
      target: RationalAdditionGroup,
      map: scaling.inverseMap,
    };

    const witness = makeInverseWitness(
      scalingHom,
      scalingInverse,
      rationalSamples,
      rationalSamples,
    );

    expect(witness.leftIdentity).toBe(true);
    expect(witness.rightIdentity).toBe(true);
  });

  it("checks inverse data by verifying homomorphism and round-trips", () => {
    const identityHom: GroupHomomorphism<bigint, bigint> = identityAutomorphismZ;
    const identityInverse: GroupHomomorphism<bigint, bigint> = {
      source: IntegerAdditionGroup,
      target: IntegerAdditionGroup,
      map: identityAutomorphismZ.inverseMap,
    };

    expect(
      checkIsInverse(identityHom, identityInverse, integerSamples, integerSamples),
    ).toBe(true);

    const constantInverse: GroupHomomorphism<bigint, bigint> = {
      source: IntegerAdditionGroup,
      target: IntegerAdditionGroup,
      map: () => 0n,
    };

    expect(
      checkIsInverse(identityHom, constantInverse, integerSamples, integerSamples),
    ).toBe(false);
  });

  it("constructs inverse candidates from finite enumerations", () => {
    const identityHom: GroupHomomorphism<bigint, bigint> = identityAutomorphismZ;
    const built = tryBuildInverse(identityHom, integerSamples, integerSamples);

    expect(built).not.toBeNull();
    if (!built) {
      return;
    }

    expect(
      checkIsInverse(identityHom, built, integerSamples, integerSamples),
    ).toBe(true);

    const collapseHom: GroupHomomorphism<bigint, bigint> = {
      source: IntegerAdditionGroup,
      target: IntegerAdditionGroup,
      map: () => 0n,
    };

    expect(tryBuildInverse(collapseHom, integerSamples, integerSamples)).toBeNull();
  });
});
