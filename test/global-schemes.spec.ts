import { describe, expect, it } from "vitest"
import {
  AffineSchemeExamples,
  checkSchemeFiberProduct,
  checkSchemeGluing,
  createModuloRing,
  normalizeMod,
  type AffineSchemeMorphism,
  type AffineSchemePullbackSquare,
  type PrimeSpectrum,
  type RingHomomorphism,
  type SchemeAtlas,
  type SchemeChart,
  type SchemeFiberProductDiagram,
} from "../allTS"

const cloneChart = <A>(chart: SchemeChart<A>, label: string): SchemeChart<A> => ({
  ...chart,
  label,
  spectrum: {
    ...chart.spectrum,
    points: chart.spectrum.points.map(point => ({ ...point })),
  },
  structureSheaf: {
    ...chart.structureSheaf,
    opens: chart.structureSheaf.opens.map(open => ({ ...open })),
    arrows: chart.structureSheaf.arrows.map(arrow => ({ ...arrow })),
    coverings: chart.structureSheaf.coverings.map(covering => ({ ...covering })),
  },
  ...(chart.options
    ? {
        options: {
          ...chart.options,
          ...(chart.options.spectrum ? { spectrum: { ...chart.options.spectrum } } : {}),
          ...(chart.options.structureSheaf
            ? { structureSheaf: { ...chart.options.structureSheaf } }
            : {}),
        },
      }
    : {}),
})

describe("global scheme infrastructure", () => {
  const specZSample = AffineSchemeExamples.specIntegers
  const specZChart = specZSample.chart as SchemeChart<bigint>

  const ringSamples = specZChart.options?.spectrum?.ringSamples ?? []

  const baseChart = cloneChart(specZChart, "Chart U")
  const secondChart = cloneChart(specZChart, "Chart V")

  const identity: RingHomomorphism<bigint, bigint> = {
    source: specZChart.spectrum.ring,
    target: specZChart.spectrum.ring,
    map: value => value,
    label: "id_ℤ",
  }

  const forward: AffineSchemeMorphism<bigint, bigint> = {
    ringMap: identity,
    domain: secondChart.spectrum,
    codomain: baseChart.spectrum,
    label: "Chart V → Chart U",
  }

  const backward: AffineSchemeMorphism<bigint, bigint> = {
    ringMap: identity,
    domain: baseChart.spectrum,
    codomain: secondChart.spectrum,
    label: "Chart U → Chart V",
  }

  const atlas: SchemeAtlas = {
    label: "Spec ℤ glued from two charts",
    charts: [baseChart, secondChart],
    gluings: [
      {
        leftChart: 0,
        rightChart: 1,
        forward,
        backward,
        forwardOptions: { codomainSamples: ringSamples, domainSamples: ringSamples },
        backwardOptions: { codomainSamples: ringSamples, domainSamples: ringSamples },
        compatibility: { leftSamples: ringSamples, rightSamples: ringSamples },
      },
    ],
  }

  it("validates the gluing of two affine charts for Spec ℤ", () => {
    const result = checkSchemeGluing(atlas, { witnessLimit: 6 })

    expect(result.holds).toBe(true)
    expect(result.metadata.chartCount).toBe(2)
    expect(result.metadata.quasiCompact).toBe(true)
    expect(result.metadata.separatedOnSamples).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it("detects when a gluing atlas omits the induced image prime", () => {
    const truncatedSpectrum: PrimeSpectrum<bigint> = {
      ...secondChart.spectrum,
      points: secondChart.spectrum.points.slice(0, 1),
    }

    const faultyChart: SchemeChart<bigint> = {
      ...secondChart,
      spectrum: truncatedSpectrum,
    }

    const faultyForward: AffineSchemeMorphism<bigint, bigint> = {
      ...forward,
      domain: truncatedSpectrum,
    }

    const faultyBackward: AffineSchemeMorphism<bigint, bigint> = {
      ...backward,
      codomain: truncatedSpectrum,
    }

    const baseGluing = atlas.gluings[0]
    if (!baseGluing) {
      throw new Error("Expected base gluing for atlas test")
    }

    const faultyAtlas: SchemeAtlas = {
      ...atlas,
      charts: [baseChart, faultyChart],
      gluings: [
        {
          leftChart: 0,
          rightChart: 1,
          forward: faultyForward,
          backward: faultyBackward,
          ...(baseGluing.forwardOptions ? { forwardOptions: baseGluing.forwardOptions } : {}),
          ...(baseGluing.backwardOptions ? { backwardOptions: baseGluing.backwardOptions } : {}),
          ...(baseGluing.compatibility ? { compatibility: baseGluing.compatibility } : {}),
        },
      ],
    }

    const result = checkSchemeGluing(faultyAtlas, { witnessLimit: 6 })

    expect(result.holds).toBe(false)
    expect(result.metadata.forwardFailures + result.metadata.inverseFailures).toBeGreaterThan(0)
    expect(result.violations.some(violation => violation.kind === "gluingFailure")).toBe(true)
  })

  const identitySquare: AffineSchemePullbackSquare<bigint, bigint, bigint, bigint> = {
    base: baseChart.spectrum,
    left: { spectrum: baseChart.spectrum, map: identity },
    right: { spectrum: baseChart.spectrum, map: identity },
    apex: { spectrum: baseChart.spectrum, leftMap: identity, rightMap: identity },
    label: "identity pullback",
  }

  const fiberDiagram: SchemeFiberProductDiagram = {
    label: "Identity fibre product",
    entries: [
      {
        square: identitySquare,
        options: {
          baseSamples: ringSamples,
          leftSamples: ringSamples,
          rightSamples: ringSamples,
          matchingPairs: [
            { leftIndex: 0, rightIndex: 0, apexIndex: 0 },
            { leftIndex: 1, rightIndex: 1, apexIndex: 1 },
          ],
        },
      },
    ],
  }

  it("confirms fibre-product squares assemble into a global diagram", () => {
    const result = checkSchemeFiberProduct(fiberDiagram)

    expect(result.holds).toBe(true)
    expect(result.metadata.entryCount).toBe(1)
    expect(result.metadata.failureCount).toBe(0)
  })

  it("exposes fibre-product mismatches across a diagram", () => {
    const mod2Ring = createModuloRing(2n)
    const mod2Ideal = {
      ring: mod2Ring,
      contains: (value: bigint) => mod2Ring.eq?.(value, mod2Ring.zero) ?? value === mod2Ring.zero,
      name: "(0)",
    }

    const mod2Spectrum: PrimeSpectrum<bigint> = {
      ring: mod2Ring,
      label: "Spec ℤ/2",
      points: [
        { ideal: mod2Ideal, label: "(0)", samples: [0n, 1n] },
      ],
    }

    const projection: RingHomomorphism<bigint, bigint> = {
      source: specZChart.spectrum.ring,
      target: mod2Ring,
      map: value => normalizeMod(value, 2n),
      label: "ℤ → ℤ/2",
    }

    const brokenSquare: AffineSchemePullbackSquare<bigint, bigint, bigint, bigint> = {
      base: baseChart.spectrum,
      left: { spectrum: baseChart.spectrum, map: identity },
      right: { spectrum: mod2Spectrum, map: projection },
      apex: { spectrum: mod2Spectrum, leftMap: projection, rightMap: projection },
      label: "broken pullback",
    }

    const brokenDiagram: SchemeFiberProductDiagram = {
      label: "Faulty fibre product",
      entries: [
        {
          square: brokenSquare,
          options: { matchingPairs: [{ leftIndex: 1, rightIndex: 0, apexIndex: 1 }] },
        },
      ],
    }

    const result = checkSchemeFiberProduct(brokenDiagram)

    expect(result.holds).toBe(false)
    expect(result.metadata.failureCount).toBe(1)
    expect(result.violations[0]?.kind).toBe("squareFailure")
  })
})
