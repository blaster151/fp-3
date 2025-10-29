import { describe, expect, it } from "vitest"

import {
  RingCategory,
  checkRingCategory,
  sumIdeals,
  productIdeals,
  intersectIdeals,
  radicalIdeal,
  principalIdealInZ,
  RingInteger,
  createModuloRing,
  normalizeMod,
  CommutativeRingSamples,
  buildPrimeLocalizationScenario,
  analyzePrimeLocalization,
  checkSubmodule,
  type AnyRing,
  type AnyRingHom,
  type RingHomomorphism,
  type PrimeSpectrum,
  type Submodule,
} from "../allTS"

describe("ring category extensions", () => {
  it("validates ring category laws on integer samples", () => {
    const modulo5 = createModuloRing(5n)

    const identity = RingCategory.id(RingInteger) as AnyRingHom
    const identityAgain = RingCategory.id(RingInteger) as AnyRingHom

    expect(identity).toBe(identityAgain)
    expect(RingCategory.cacheSize()).toBeGreaterThan(0)
    expect(RingCategory.equalMor(identity, identityAgain)).toBe(true)

    const double: RingHomomorphism<bigint, bigint> = {
      source: RingInteger,
      target: RingInteger,
      map: (value) => value * 2n,
      label: "×2",
    }

    const mod5: RingHomomorphism<bigint, bigint> = {
      source: RingInteger,
      target: modulo5,
      map: (value) => normalizeMod(value, 5n),
      label: "mod5",
    }

    const doubleThenMod5: RingHomomorphism<bigint, bigint> = {
      source: RingInteger,
      target: modulo5,
      map: (value) => normalizeMod(value * 2n, 5n),
      label: "mod5 ∘ ×2",
    }

    const morphisms: AnyRingHom[] = [
      identity,
      double as AnyRingHom,
      mod5 as AnyRingHom,
      doubleThenMod5 as AnyRingHom,
    ]

    const result = checkRingCategory({
      morphisms,
      ringSamples: [
        { ring: RingInteger as AnyRing, samples: [-2n, -1n, 0n, 1n, 2n] },
        { ring: modulo5 as AnyRing, samples: [0n, 1n, 2n, 3n, 4n] },
      ],
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.ringsTested).toBeGreaterThanOrEqual(2)
    expect(result.metadata.identityChecks).toBeGreaterThan(0)
    expect(result.metadata.associativityChains).toBeGreaterThan(0)
    expect(result.violations).toHaveLength(0)
  })

  it("constructs composite ideals in ℤ", () => {
    const ideal2 = principalIdealInZ(2n, "(2)")
    const ideal3 = principalIdealInZ(3n, "(3)")
    const ideal4 = principalIdealInZ(4n, "(4)")

    const sum = sumIdeals(RingInteger, [ideal2, ideal3], {
      samples: [[0n, 2n, -2n], [0n, 3n, -3n]],
      name: "(2) + (3)",
    })
    expect(sum.contains(1n)).toBe(true)
    expect(sum.contains(5n)).toBe(true)
    expect(sum.sampleElements).toContain(0n)

    const product = productIdeals(RingInteger, [ideal2, ideal3], {
      samples: [[0n, 2n], [0n, 3n]],
      summandLimit: 4,
      name: "(2)(3)",
    })
    expect(product.contains(6n)).toBe(true)
    expect(product.contains(4n)).toBe(false)
    expect(product.sampleElements?.some((value) => value === 6n || value === -6n)).toBe(true)

    const intersection = intersectIdeals(RingInteger, [ideal2, ideal3], {
      samples: [[0n, 2n], [0n, 3n]],
      name: "(2) ∩ (3)",
    })
    expect(intersection.contains(6n)).toBe(true)
    expect(intersection.contains(4n)).toBe(false)

    const radical = radicalIdeal(ideal4, { name: "rad(4)" })
    expect(radical.contains(2n)).toBe(true)
    expect(radical.contains(4n)).toBe(true)
    expect(radical.contains(1n)).toBe(false)
  })

  it("analyzes localization scenarios derived from sample spectra", () => {
    const integerEntry = CommutativeRingSamples.integers
    const primeEntry = integerEntry.ring.primePoints.find((entry) => entry.point.label === "(5)")
    if (!primeEntry) {
      throw new Error("missing (5) prime sample")
    }

    const spectrum: PrimeSpectrum<bigint> = {
      ring: integerEntry.ring.ring,
      points: integerEntry.ring.primeSpectrum,
      label: integerEntry.ring.label,
    }

    const scenario = buildPrimeLocalizationScenario(spectrum, primeEntry.point)

    expect(scenario.multiplicativeSet.contains(1n)).toBe(true)
    expect(scenario.multiplicativeSet.contains(5n)).toBe(false)

    const analysis = analyzePrimeLocalization(scenario, {
      localization: {
        numeratorSamples: [-5n, -1n, 0n, 1n, 5n],
      },
    })

    expect(analysis.result.holds).toBe(true)
    expect(analysis.result.metadata.denominatorSamples).toBeGreaterThan(0)
    expect(analysis.result.metadata.numeratorSamples).toBeGreaterThan(0)
    expect(analysis.result.universalProperty.unitCheck.holds).toBe(true)
    expect(analysis.result.universalProperty.counitCheck.holds).toBe(true)
  })

  it("checks submodule closure properties", () => {
    const integerModuleEntry = CommutativeRingSamples.integers.modules.find((entry) => entry.label === "ℤ")
    if (!integerModuleEntry) {
      throw new Error("missing ℤ module sample")
    }

    const evenSubmodule: Submodule<bigint, bigint> = {
      module: integerModuleEntry.module,
      contains: (value) => value % 2n === 0n,
      name: "2ℤ",
      sampleElements: [0n, 2n, -2n, 4n],
    }

    const closureResult = checkSubmodule(evenSubmodule, {
      vectorSamples: integerModuleEntry.vectorSamples,
      scalarSamples: [-1n, 0n, 1n, 2n],
      requireMembership: true,
    })

    expect(closureResult.holds).toBe(true)
    expect(closureResult.metadata.checkedVectors).toBeGreaterThan(0)
    expect(closureResult.metadata.scalarSamples).toBeGreaterThan(0)

    const flawedSubmodule: Submodule<bigint, bigint> = {
      module: integerModuleEntry.module,
      contains: (value) => value % 2n === 0n,
      name: "2ℤ (flawed)",
      sampleElements: [0n, 2n],
    }

    const failure = checkSubmodule(flawedSubmodule, {
      vectorSamples: [1n, 2n],
      scalarSamples: [1n],
      requireMembership: true,
    })

    expect(failure.holds).toBe(false)
    expect(failure.violations.some((violation) => violation.kind === "membership")).toBe(true)
  })
})
