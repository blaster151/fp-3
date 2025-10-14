import { describe, expect, it } from "vitest";
import type { GroupHomomorphism, Rational } from "../../../../kinds/group-automorphism";
import {
  IntegerAdditionGroup,
  RationalAdditionGroup,
  identityAutomorphismZ,
  negationAutomorphismZ,
  rational,
  rationalSamples,
  integerSamples,
  scalingAutomorphismQ,
} from "../../../../kinds/group-automorphism";
import {
  isEpimorphism,
  isIsomorphism,
  isMonomorphism,
  makeIsomorphismEquivalence,
  type GroupIsomorphismWitness,
} from "../morphismProperties";

describe("group morphism properties", () => {
  const identityHom: GroupHomomorphism<bigint, bigint> = identityAutomorphismZ;
  const identityInverse: GroupHomomorphism<bigint, bigint> = {
    source: IntegerAdditionGroup,
    target: IntegerAdditionGroup,
    map: identityAutomorphismZ.inverseMap,
  };

  const negationHom: GroupHomomorphism<bigint, bigint> = negationAutomorphismZ;
  const negationInverse: GroupHomomorphism<bigint, bigint> = {
    source: IntegerAdditionGroup,
    target: IntegerAdditionGroup,
    map: negationAutomorphismZ.inverseMap,
  };

  it("recognises isomorphisms via mutual inverses", () => {
    expect(
      isIsomorphism(identityHom, identityInverse, {
        domainSamples: integerSamples,
        codomainSamples: integerSamples,
      }),
    ).toBe(true);

    const wrongInverse: GroupHomomorphism<bigint, bigint> = {
      source: IntegerAdditionGroup,
      target: IntegerAdditionGroup,
      map: () => 0n,
    };

    expect(
      isIsomorphism(identityHom, wrongInverse, {
        domainSamples: integerSamples,
        codomainSamples: integerSamples,
      }),
    ).toBe(false);
  });

  it("builds an equivalence witness for isomorphism data", () => {
    const witnessId: GroupIsomorphismWitness<bigint, bigint> = {
      forward: identityHom,
      backward: identityInverse,
    };
    const witnessNeg: GroupIsomorphismWitness<bigint, bigint> = {
      forward: negationHom,
      backward: negationInverse,
    };
    const eqWitness = makeIsomorphismEquivalence<bigint, bigint>({
      domainSamples: integerSamples,
      codomainSamples: integerSamples,
    });

    expect(eqWitness.reflexive(witnessId)).toBe(true);
    expect(eqWitness.symmetric(witnessId, witnessNeg)).toBe(true);
    expect(eqWitness.transitive(witnessId, witnessNeg, witnessId)).toBe(true);
  });

  it("detects monomorphisms by cancellation", () => {
    expect(isMonomorphism(identityHom, integerSamples)).toBe(true);
    expect(isMonomorphism(negationHom, integerSamples)).toBe(true);

    const constantHom: GroupHomomorphism<bigint, bigint> = {
      source: IntegerAdditionGroup,
      target: IntegerAdditionGroup,
      map: () => 0n,
    };

    expect(isMonomorphism(constantHom, integerSamples)).toBe(false);
  });

  it("detects epimorphisms via surjectivity on samples", () => {
    expect(isEpimorphism(identityHom, integerSamples, integerSamples)).toBe(true);

    const scale = rational(2n, 1n);
    const scaling = scalingAutomorphismQ(scale);
    const scalingHom: GroupHomomorphism<Rational, Rational> = scaling;
    const scalingInverse: GroupHomomorphism<Rational, Rational> = {
      source: RationalAdditionGroup,
      target: RationalAdditionGroup,
      map: scaling.inverseMap,
    };

    expect(
      isIsomorphism(scalingHom, scalingInverse, {
        domainSamples: rationalSamples,
        codomainSamples: rationalSamples,
      }),
    ).toBe(true);

    const constantHom: GroupHomomorphism<bigint, bigint> = {
      source: IntegerAdditionGroup,
      target: IntegerAdditionGroup,
      map: () => 0n,
    };

    expect(isEpimorphism(constantHom, integerSamples, integerSamples)).toBe(false);
  });
});
