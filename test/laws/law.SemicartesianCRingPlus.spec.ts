import { describe, expect, it } from "vitest";
import * as fc from "fast-check";

import {
  IntegersObject,
  createModObject,
  canonicalInitialHom,
  checkCRingPlusInitialSemicartesian,
  checkAdditiveUnitHom,
  equalHom,
  semicartesianStructureCRingPlus,
  type CRingPlusHom,
  type CRingPlusObject,
  type CRingPlusMor,
} from "../../cring-plus";

import type { InitialArrowSample } from "../../semicartesian-structure";

describe("LAW 2.3: ℤ initial object yields semicartesian structure in CRing_⊕", () => {
  const mod5 = createModObject(5n);
  const canonicalToMod5 = canonicalInitialHom(mod5);
  const canonicalToZ = canonicalInitialHom(IntegersObject);

  const narrowHom = <A, B>(
    hom: CRingPlusMor,
    source: CRingPlusObject<A>,
    target: CRingPlusObject<B>
  ): CRingPlusHom<A, B> => {
    if (hom.source !== source || hom.target !== target) {
      throw new Error("Hom object has unexpected domain or codomain");
    }
    return hom as CRingPlusHom<A, B>;
  };

  const shifted: CRingPlusHom<bigint, bigint> = {
    source: IntegersObject,
    target: mod5,
    map: (value) => mod5.ring.add(canonicalToMod5.map(value), mod5.ring.one),
    label: "shift+1",
  };

  const samples: InitialArrowSample<any, any>[] = [
    { target: mod5, candidate: canonicalToMod5, shouldHold: true, label: "canonical ℤ→ℤ/5ℤ" },
    { target: IntegersObject, candidate: canonicalToZ, shouldHold: true, label: "canonical ℤ→ℤ" },
    { target: mod5, candidate: shifted, shouldHold: false, label: "non-unital shift" },
  ];

  it("oracle validates semicartesian structure with witness reuse", () => {
    const result = checkCRingPlusInitialSemicartesian([IntegersObject, mod5], samples);
    expect(result.holds).toBe(true);
    expect(result.failures).toHaveLength(0);

    const witnessMap = result.witness.globalElement(mod5);
    expect(witnessMap.source).toBe(IntegersObject);
    expect(witnessMap.target).toBe(mod5);
    const canonicalWitness = narrowHom<bigint, bigint>(witnessMap, IntegersObject, mod5);
    expect(equalHom(canonicalWitness, canonicalToMod5)).toBe(true);
  });

  it("canonical hom is additive and unit-preserving", () => {
    const check = checkAdditiveUnitHom(canonicalToMod5);
    expect(check.holds).toBe(true);
    expect(check.failures).toHaveLength(0);
  });

  it("shifted hom fails additive/unit oracle", () => {
    const check = checkAdditiveUnitHom(shifted);
    expect(check.holds).toBe(false);
  });

  it("semicartesian witness composes with fast-check samples", () => {
    const structure = semicartesianStructureCRingPlus();
    const witnessMap = structure.globalElement(mod5);
    expect(witnessMap.source).toBe(IntegersObject);
    expect(witnessMap.target).toBe(mod5);
    const canonicalWitness = narrowHom<bigint, bigint>(witnessMap, IntegersObject, mod5);
    const eq = mod5.ring.eq;
    if (eq === undefined) {
      throw new Error("mod5 ring must provide equality");
    }

    fc.assert(
      fc.property(
        fc.constantFrom(-4n, -3n, -2n, -1n, 0n, 1n, 2n, 3n, 4n),
        fc.constantFrom(-4n, -3n, -2n, -1n, 0n, 1n, 2n, 3n, 4n),
        (a: bigint, b: bigint) => {
          const lhs = canonicalWitness.map(a + b);
          const rhs = mod5.ring.add(canonicalWitness.map(a), canonicalWitness.map(b));
          expect(eq(lhs, rhs)).toBe(true);
        }
      )
    );
  });
});
