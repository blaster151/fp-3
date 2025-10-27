import { describe, expect, it } from "vitest"
import {
  CommutativeRingSamples,
  buildZariskiSiteFromSpectrum,
  type PrimeSpectrum,
} from "../allTS"

describe("buildZariskiSiteFromSpectrum", () => {
  it("constructs canonical opens and inclusions for the integer spectrum", () => {
    const integerSample = CommutativeRingSamples.integers.ring
    const spectrum: PrimeSpectrum<bigint> = {
      ring: integerSample.ring,
      points: integerSample.primeSpectrum,
      label: integerSample.label,
    }

    const site = buildZariskiSiteFromSpectrum(spectrum)

    expect(site.label).toBe("Zariski site of ℤ")
    expect(site.opens.length).toBeGreaterThan(2)

    const specOpen = site.opens.find(open => open.id === "Spec")
    expect(specOpen).toBeDefined()

    const specCoverings = site.coverings(specOpen!)
    expect(specCoverings.length).toBe(2)
    expect(specCoverings[0]?.arrows.length).toBe(1)
    const canonicalCover = specCoverings[1]
    expect(canonicalCover?.arrows.length).toBeGreaterThan(0)
    expect(new Set(canonicalCover?.arrows.map(arrow => arrow.to.id))).toEqual(new Set([specOpen!.id]))
    expect(canonicalCover?.arrows.some(arrow => arrow.from.id === "∅")).toBe(true)

    const eq = integerSample.ring.eq ?? ((left: bigint, right: bigint) => left === right)
    const d2Open = site.opens.find(open => open.generators.some(generator => eq(generator, 2n)))
    expect(d2Open).toBeDefined()
    expect(d2Open?.points.length).toBe(3)

    const inclusion = site.inclusions.find(
      arrow => arrow.from.id === d2Open!.id && arrow.to.id === specOpen!.id,
    )
    expect(inclusion).toBeDefined()
    expect(canonicalCover?.arrows.some(arrow => arrow.id === inclusion!.id)).toBe(true)

    const emptyOpen = site.opens.find(open => open.id === "∅")
    expect(emptyOpen).toBeDefined()
    expect(emptyOpen?.generators.some(generator => eq(generator, 0n))).toBe(true)
    const emptyCoverings = site.coverings(emptyOpen!)
    expect(emptyCoverings.length).toBe(1)
    expect(emptyCoverings[0]?.arrows[0]?.from.id).toBe(emptyOpen!.id)
  })
})
