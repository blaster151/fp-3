import { describe, expect, it } from "vitest"
import {
  sampleExtFromTensor,
  sampleTorFromFlat,
  type CechCohomologyResult,
  type FlatModuleCheckResult,
  type TensorProductCheckResult,
} from "../allTS"

type DummyCechResult = CechCohomologyResult<unknown, unknown>

type DummyFlatResult = FlatModuleCheckResult<number, number, number, number>

type DummyTensorResult = TensorProductCheckResult<number, number, number>

const buildCech = (
  ranks: ReadonlyArray<{ readonly degree: number; readonly rank: number }>,
): DummyCechResult => ({
  holds: true,
  complex: { levels: [], differentials: [], label: "stub" },
  chainCheck: {
    holds: true,
    violations: [],
    witnesses: [],
    details: "stub",
    metadata: {
      differentials: 0,
      levels: 0,
      samplesTested: 0,
      compositionChecks: 0,
      witnessLimit: 0,
      witnessesRecorded: 0,
    },
  },
  cohomology: {
    groups: ranks.map(({ degree, rank }) => ({
      degree,
      kernel: [],
      image: [],
      representatives: [],
      kernelSize: 0,
      imageSize: 0,
      rank,
      details: "stub",
    })),
    details: "stub",
    metadata: {
      degrees: ranks.map(({ degree }) => degree),
      totalKernelElements: 0,
      totalImageElements: 0,
    },
  },
  details: "stub",
})

const buildFlat = (overrides?: Partial<DummyFlatResult>): DummyFlatResult => ({
  holds: true,
  violations: [],
  witnesses: [],
  details: "stub",
  metadata: {
    candidateSampleCandidates: 0,
    distinctCandidateSamples: 0,
    leftSamples: 0,
    middleSamples: 0,
    rightSamples: 0,
    kernelWitnesses: 0,
    surjectionWitnesses: 0,
    injectWitnesses: 0,
    additionalKernelSamples: 0,
    additionalSurjectionSamples: 0,
    additionalInjectSamples: 0,
    kernelSampleChecks: 0,
    surjectionSampleChecks: 0,
    injectSampleChecks: 0,
    witnessLimit: 0,
    witnessesRecorded: 0,
    bilinearIncludeHolds: true,
    bilinearProjectHolds: true,
    tensorLeftHolds: true,
    tensorMiddleHolds: true,
    tensorRightHolds: true,
  },
  ...overrides,
})

const buildTensor = (overrides?: Partial<DummyTensorResult>): DummyTensorResult => ({
  holds: true,
  violations: [],
  witnesses: [],
  details: "stub",
  metadata: {
    leftSampleCandidates: 0,
    distinctLeftSamples: 0,
    rightSampleCandidates: 0,
    distinctRightSamples: 0,
    scalarSampleCandidates: 0,
    distinctScalarSamples: 0,
    tensorSampleCandidates: 0,
    distinctTensorSamples: 0,
    bilinearMapsChecked: 0,
    universalPairChecks: 0,
    witnessLimit: 0,
    witnessesRecorded: 0,
  },
  ...overrides,
})

describe("Ext/Tor samplers", () => {
  it("confirms Tor samples align with Čech ranks when witnesses are present", () => {
    const cech = buildCech([
      { degree: 0, rank: 1 },
      { degree: 1, rank: 1 },
    ])

    const flat = buildFlat({
      witnesses: [
        { kind: "surjection", candidate: 1, middle: 2, right: 3 },
        { kind: "composition", candidate: 1, left: 4 },
        { kind: "kernel", candidate: 1, middle: 5, left: 6 },
      ],
    })

    const result = sampleTorFromFlat({ cech, flat })

    expect(result.matches).toBe(true)
    expect(result.comparisons).toHaveLength(2)
    expect(result.comparisons[1]?.witnessCount).toBe(1)
    expect(result.details).toContain("reconciled Čech cohomology")
  })

  it("flags Tor mismatch when Čech rank vanishes but tensor violations persist", () => {
    const cech = buildCech([{ degree: 1, rank: 0 }])

    const flat = buildFlat({
      violations: [
        { kind: "kernelSample", candidate: 1, middle: 2 },
      ],
    })

    const result = sampleTorFromFlat({
      cech,
      flat,
      options: { degrees: [{ torDegree: 1, witnessKinds: ["kernel"] }] },
    })

    expect(result.matches).toBe(false)
    expect(result.comparisons[0]?.violationCount).toBe(1)
    expect(result.details).toContain("discrepancies")
  })

  it("aligns Ext samples with labelled tensor witnesses", () => {
    const cech = buildCech([{ degree: 2, rank: 1 }])

    const tensor = buildTensor({
      witnesses: [
        { mapLabel: "α", left: 1, right: 2, tensor: 3, value: 4 },
      ],
    })

    const result = sampleExtFromTensor({
      cech,
      tensor,
      options: { degrees: [{ extDegree: 2, mapLabels: ["α"] }] },
    })

    expect(result.matches).toBe(true)
    expect(result.comparisons[0]?.witnessCount).toBe(1)
    expect(result.details).toContain("reconciled Čech cohomology")
  })

  it("detects Ext mismatch when only labelled violations remain", () => {
    const cech = buildCech([{ degree: 0, rank: 0 }])

    const tensor = buildTensor({
      violations: [
        {
          kind: "universalMismatch",
          mapLabel: "β",
          left: 1,
          right: 2,
          tensor: 3,
          expected: 4,
          actual: 5,
        },
      ],
    })

    const result = sampleExtFromTensor({
      cech,
      tensor,
      options: { degrees: [{ extDegree: 0, mapLabels: ["β"] }] },
    })

    expect(result.matches).toBe(false)
    expect(result.comparisons[0]?.violationCount).toBe(1)
    expect(result.details).toContain("discrepancies")
  })
})

