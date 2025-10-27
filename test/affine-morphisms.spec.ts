import { describe, expect, it } from "vitest"
import {
  AffineSchemeExamples,
  RingDualNumbersOverZ,
  RingInteger,
  buildAffineFiberProduct,
  checkAffineSchemeMorphism,
  checkAffineSchemePullbackSquare,
  createModuloRing,
  dualNumber,
  normalizeMod,
  type AffineSchemeMorphism,
  type AffineSchemePullbackSquare,
  type DualNumber,
  type PrimeSpectrum,
  type RingIdeal,
  type RingHomomorphism,
} from "../allTS"

const principalIdeal = (ring: typeof RingInteger, generator: bigint, label: string): RingIdeal<bigint> => ({
  ring,
  contains: (value) => (generator === 0n ? value === 0n : value % generator === 0n),
  name: label,
})

const zeroIdeal = (ring: ReturnType<typeof createModuloRing>, label: string): RingIdeal<bigint> => ({
  ring,
  contains: (value) => ring.eq?.(value, ring.zero) ?? value === ring.zero,
  name: label,
})

describe("affine scheme morphism utilities", () => {
  const integerChart = AffineSchemeExamples.specIntegers.chart
  const ringSamples = integerChart.options?.spectrum?.ringSamples ?? [-6n, -4n, -3n, -2n, -1n, 0n, 1n, 2n, 3n, 4n, 5n, 6n]
  const spectrumZ = integerChart.spectrum

  const mod2Ring = createModuloRing(2n)
  const mod2Spectrum: PrimeSpectrum<bigint> = {
    ring: mod2Ring,
    label: "Spec ℤ/2",
    points: [
      { ideal: zeroIdeal(mod2Ring, "(0)"), label: "(0)", samples: [0n, 1n] },
    ],
  }

  const projection: RingHomomorphism<bigint, bigint> = {
    source: RingInteger,
    target: mod2Ring,
    map: (value) => normalizeMod(value, 2n),
    label: "ℤ → ℤ/2",
  }

  const morphism: AffineSchemeMorphism<bigint, bigint> = {
    ringMap: projection,
    domain: mod2Spectrum,
    codomain: spectrumZ,
    label: "Spec(ℤ/2) → Spec(ℤ)",
  }

  it("validates the morphism induced by ℤ → ℤ/2", () => {
    const result = checkAffineSchemeMorphism(morphism, {
      codomainSamples: ringSamples,
      principalGenerators: [2n, 3n],
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.imageMatches).toBe(1)
    expect(result.metadata.principalOpenFailures).toBe(0)
    expect(result.violations).toHaveLength(0)
  })

  it("detects when the codomain spectrum misses the induced prime", () => {
    const incomplete: PrimeSpectrum<bigint> = {
      ring: RingInteger,
      label: "Spec ℤ (0 only)",
      points: [{ ideal: principalIdeal(RingInteger, 0n, "(0)"), label: "(0)", samples: ringSamples }],
    }

    const result = checkAffineSchemeMorphism({ ...morphism, codomain: incomplete }, {
      codomainSamples: ringSamples,
    })

    expect(result.holds).toBe(false)
    expect(result.violations.some(violation => violation.kind === "missingImagePoint")).toBe(true)
  })

  const identity: RingHomomorphism<bigint, bigint> = {
    source: RingInteger,
    target: RingInteger,
    map: (value) => value,
    label: "id_ℤ",
  }

  const square: AffineSchemePullbackSquare<bigint, bigint, bigint, bigint> = {
    base: spectrumZ,
    left: { spectrum: spectrumZ, map: identity },
    right: { spectrum: spectrumZ, map: identity },
    apex: { spectrum: spectrumZ, leftMap: identity, rightMap: identity },
    label: "identity pullback",
  }

  it("verifies the identity pullback square on Spec ℤ", () => {
    const result = checkAffineSchemePullbackSquare(square, {
      baseSamples: ringSamples,
      leftSamples: ringSamples,
      rightSamples: ringSamples,
      matchingPairs: [
        { leftIndex: 0, rightIndex: 0, apexIndex: 0 },
        { leftIndex: 1, rightIndex: 1, apexIndex: 1 },
      ],
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.baseAgreementFailures).toBe(0)
    expect(result.metadata.matchingPairFailures).toBe(0)
  })

  it("flags missing apex primes for requested matching pairs", () => {
    const result = checkAffineSchemePullbackSquare(square, {
      matchingPairs: [{ leftIndex: 0, rightIndex: 1 }],
    })

    expect(result.holds).toBe(false)
    expect(result.violations.some(violation => violation.kind === "matchingPairMissing")).toBe(true)
  })

  it("builds a fiber product harness with spectrum-driven samples", () => {
    const runFiberProduct = buildAffineFiberProduct(square, { chart: integerChart })

    const defaultComputation = runFiberProduct()
    expect(defaultComputation.result.holds).toBe(true)
    expect(defaultComputation.result.metadata.baseSampleCandidates).toBe(ringSamples.length)
    expect(defaultComputation.result.metadata.leftSampleCandidates).toBe(ringSamples.length)
    expect(defaultComputation.result.metadata.rightSampleCandidates).toBe(ringSamples.length)
    expect(defaultComputation.chart.spectrum).toBe(integerChart.spectrum)
    expect(defaultComputation.chart.options?.spectrum?.ringSamples?.length).toBeGreaterThan(0)

    const augmented = runFiberProduct({ baseSamples: [...ringSamples, 12n] })
    expect(augmented.result.metadata.baseSampleCandidates).toBe(ringSamples.length + 1)
    expect(augmented.chart).toBe(defaultComputation.chart)
  })

  it("recognizes the fiber product Spec ℤ[ε]/(ε²) ×_{Spec ℤ} Spec ℤ", () => {
    const dualChart = AffineSchemeExamples.specDualNumbers.chart

    const inclusion: RingHomomorphism<bigint, DualNumber> = {
      source: RingInteger,
      target: RingDualNumbersOverZ,
      map: (value) => dualNumber(value, 0n),
      label: "ℤ → ℤ[ε]/(ε²)",
    }

    const dualIdentity: RingHomomorphism<DualNumber, DualNumber> = {
      source: RingDualNumbersOverZ,
      target: RingDualNumbersOverZ,
      map: (value) => value,
      label: "id_ℤ[ε]/(ε²)",
    }

    const fiberSquare: AffineSchemePullbackSquare<bigint, DualNumber, bigint, DualNumber> = {
      base: spectrumZ,
      left: { spectrum: dualChart.spectrum, map: inclusion },
      right: { spectrum: spectrumZ, map: identity },
      apex: { spectrum: dualChart.spectrum, leftMap: dualIdentity, rightMap: inclusion },
      label: "Spec ℤ[ε]/(ε²) ×_{Spec ℤ} Spec ℤ",
    }

    const computeFiberProduct = buildAffineFiberProduct(fiberSquare, { chart: dualChart })
    const computation = computeFiberProduct()

    expect(computation.result.holds).toBe(true)
    expect(computation.chart.label).toBe(dualChart.label)
    expect(computation.chart.spectrum).toBe(dualChart.spectrum)
    expect(computation.chart.options?.spectrum?.ringSamples?.length).toBeGreaterThan(0)
  })
})

