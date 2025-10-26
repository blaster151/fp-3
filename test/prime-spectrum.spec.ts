import { describe, expect, it } from "vitest"
import {
  RingInteger,
  checkPrimeSpectrum,
  checkPrimeStalks,
  type PrimeSpectrum,
  type RingIdeal,
} from "../allTS"

const principalIdeal = (generator: bigint, label: string): RingIdeal<bigint> => ({
  ring: RingInteger,
  contains: (value) => (generator === 0n ? value === 0n : value % generator === 0n),
  name: label,
})

describe("prime spectrum infrastructure", () => {
  const ringSamples = [-6n, -4n, -2n, -1n, 0n, 1n, 2n, 3n, 4n, 5n, 6n]

  const spectrum: PrimeSpectrum<bigint> = {
    ring: RingInteger,
    label: "Spec ℤ",
    points: [
      { ideal: principalIdeal(0n, "(0)"), label: "(0)", samples: ringSamples },
      { ideal: principalIdeal(2n, "(2)"), label: "(2)", samples: ringSamples },
    ],
  }

  it("validates the spectrum of ℤ across {0, (2)}", () => {
    const result = checkPrimeSpectrum(spectrum, { ringSamples })

    expect(result.holds).toBe(true)
    expect(result.metadata.pointCount).toBe(2)
    expect(result.metadata.primeFailures).toBe(0)
    expect(result.violations).toHaveLength(0)
  })

  it("establishes localization stalks for the spectrum of ℤ", () => {
    const result = checkPrimeStalks(spectrum, {
      ringSamples,
      localization: {
        numeratorSamples: ringSamples,
        denominatorSamples: ringSamples,
        multiplierSamples: ringSamples,
      },
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.localizationChecks).toBe(2)
    expect(result.metadata.multiplicativeSetFailures).toBe(0)
  })

  it("detects non-prime ideals inside a proposed spectrum", () => {
    const flawed: PrimeSpectrum<bigint> = {
      ring: RingInteger,
      label: "Spec ℤ with (4)",
      points: [
        { ideal: principalIdeal(4n, "(4)"), label: "(4)", samples: ringSamples },
        { ideal: principalIdeal(2n, "(2)"), label: "(2)", samples: ringSamples },
      ],
    }

    const spectrumResult = checkPrimeSpectrum(flawed, { ringSamples })
    expect(spectrumResult.holds).toBe(false)
    expect(spectrumResult.metadata.primeFailures).toBe(1)
    expect(spectrumResult.violations[0]?.kind).toBe("idealNotPrime")

    const stalkResult = checkPrimeStalks(flawed, { ringSamples })
    expect(stalkResult.holds).toBe(false)
    expect(stalkResult.metadata.multiplicativeSetFailures).toBeGreaterThan(0)
  })
})
