import { describe, expect, it } from "vitest"
import {
  RingInteger,
  type Module,
  type AscendingChain,
  checkNoetherianModule,
} from "../allTS"

describe("Noetherian module diagnostics", () => {
  const integerModule: Module<bigint, bigint> = {
    ring: RingInteger,
    zero: 0n,
    add: (left, right) => left + right,
    neg: (value) => -value,
    scalar: (scalar, value) => scalar * value,
    eq: (left, right) => left === right,
    name: "ℤ",
  }

  it("confirms stabilization once generators cover sampled vectors", () => {
    const chain: AscendingChain<bigint, bigint> = {
      module: integerModule,
      generatorSamples: [[2n], [2n, 1n], [2n, 1n, 3n]],
      label: "ℤ",
    }

    const result = checkNoetherianModule(chain, {
      vectorSamples: [0n, 1n, 2n],
      coefficientSamples: [-1n, 0n, 1n, 2n],
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.stabilized).toBe(true)
    expect(result.metadata.stagesTested).toBe(2)
    expect(result.metadata.stabilizationIndex).toBe(1)
    expect(result.details).toContain("stabilized")

    const finalStage = result.stages[result.stages.length - 1]
    if (!finalStage) {
      throw new Error("Expected terminal stage for stabilizing chain")
    }
    expect(finalStage.missingVectors).toHaveLength(0)
  })

  it("flags chains whose sampled generators never stabilize", () => {
    const chain: AscendingChain<bigint, bigint> = {
      module: integerModule,
      generatorSamples: [[2n], [3n], [5n]],
      label: "ℤ",
    }

    const result = checkNoetherianModule(chain, {
      vectorSamples: [2n, 3n, 5n],
      coefficientSamples: [-1n, 0n, 1n],
    })

    expect(result.holds).toBe(false)
    expect(result.metadata.stabilized).toBe(false)
    expect(result.metadata.exhaustedChain).toBe(true)
    expect(result.details).toContain("failed")
    expect(result.violations.some(violation => violation.kind === "chainDidNotStabilize")).toBe(true)

    const finalStage = result.stages[result.stages.length - 1]
    if (!finalStage) {
      throw new Error("Expected terminal stage for non-stabilizing chain")
    }
    expect(finalStage.missingVectors.length).toBeGreaterThan(0)
  })
})
