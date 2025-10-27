import { describe, expect, it } from "vitest"
import {
  RingInteger,
  checkFlatModuleOnSamples,
  type Module,
  type ModuleHomomorphism,
  type ShortExactSequence,
  type FlatTensorStructures,
  type ShortExactSequenceSample,
  type BilinearMap,
} from "../allTS"
import { AlgebraOracles } from "../algebra-oracles"

const mod2 = (value: bigint): bigint => {
  const remainder = value % 2n
  return remainder >= 0n ? remainder : remainder + 2n
}

const buildZModule = (): Module<bigint, bigint> => ({
  ring: RingInteger,
  zero: 0n,
  add: (left, right) => left + right,
  neg: (value) => -value,
  scalar: (scalar, value) => scalar * value,
  eq: (left, right) => left === right,
  name: "ℤ",
})

const buildZMod2Module = (): Module<bigint, bigint> => ({
  ring: RingInteger,
  zero: 0n,
  add: (left, right) => mod2(left + right),
  neg: (value) => mod2(-value),
  scalar: (scalar, value) => mod2(scalar * value),
  eq: (left, right) => mod2(left) === mod2(right),
  name: "ℤ/2ℤ",
})

type SequenceData = {
  readonly sequence: ShortExactSequence<bigint, bigint, bigint, bigint>
  readonly integers: Module<bigint, bigint>
  readonly integersMod2: Module<bigint, bigint>
}

const buildSequence = (): SequenceData => {
  const integers = buildZModule()
  const integersMod2 = buildZMod2Module()

  const include: ModuleHomomorphism<bigint, bigint, bigint> = {
    source: integers,
    target: integers,
    map: (value) => 2n * value,
    label: "×2",
  }

  const project: ModuleHomomorphism<bigint, bigint, bigint> = {
    source: integers,
    target: integersMod2,
    map: (value) => mod2(value),
    label: "mod 2",
  }

  const sequence: ShortExactSequence<bigint, bigint, bigint, bigint> = {
    left: integers,
    middle: integers,
    right: integersMod2,
    include,
    project,
    witnesses: {
      kernelWitnesses: [
        { middle: 0n, preimage: 0n },
        { middle: 2n, preimage: 1n },
      ],
      surjectionWitnesses: [
        { right: 0n, lift: 0n },
        { right: 1n, lift: 1n },
      ],
      injectWitnesses: [0n],
    },
    label: "0 → ℤ → ℤ → ℤ/2ℤ → 0",
  }

  return { sequence, integers, integersMod2 }
}

const buildTensorStructures = (
  sequence: ShortExactSequence<bigint, bigint, bigint, bigint>,
  candidate: Module<bigint, bigint>,
): FlatTensorStructures<bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint> => {
  const labelBase = candidate.name ?? "M"

  const makeTensor = (source: Module<bigint, bigint>, label: string) => ({
    left: source,
    right: candidate,
    tensor: candidate,
    pureTensor: (left: bigint, right: bigint) => candidate.scalar(left, right),
    induce: <Codomain>(bilinear: BilinearMap<bigint, bigint, bigint, Codomain>): ModuleHomomorphism<
      bigint,
      bigint,
      Codomain
    > => ({
      source: candidate,
      target: bilinear.target,
      map: (value) => bilinear.map(1n, value),
      label: `${label}⊗${bilinear.label ?? "β"}`,
    }),
    label,
  })

  return {
    left: makeTensor(sequence.left, `${sequence.left.name ?? "L"}⊗${labelBase}`),
    middle: makeTensor(sequence.middle, `${sequence.middle.name ?? "M"}⊗${labelBase}`),
    right: makeTensor(sequence.right, `${sequence.right.name ?? "R"}⊗${labelBase}`),
  }
}

describe("flat module sampling", () => {
  const { sequence, integers, integersMod2 } = buildSequence()

  it("exposes the flatness oracle through the algebra registry", () => {
    expect(AlgebraOracles.ring.flatness).toBe(checkFlatModuleOnSamples)
  })

  it("certifies flat ℤ-module samples across a short exact sequence", () => {
    const tensors = buildTensorStructures(sequence, integers)
    const sequenceSamples: ReadonlyArray<ShortExactSequenceSample<bigint, bigint, bigint>> = [
      { kind: "kernel", middle: 2n, preimage: 1n },
      { kind: "surjection", right: 1n, lift: 1n },
    ]

    const result = checkFlatModuleOnSamples(
      { sequence, candidate: integers, tensors },
      {
        scalarSamples: [-1n, 0n, 1n, 2n],
        candidateSamples: [0n, 1n, 2n],
        leftSamples: [-1n, 0n, 1n],
        middleSamples: [-2n, 0n, 2n],
        rightSamples: [0n, 1n],
        sequenceSamples,
        witnessLimit: 4,
      },
    )

    expect(result.holds).toBe(true)
    expect(result.violations).toHaveLength(0)
    expect(result.witnesses.some(witness => witness.kind === "surjection")).toBe(true)
    expect(result.metadata.kernelWitnesses).toBeGreaterThanOrEqual(1)
    expect(result.metadata.surjectionWitnesses).toBeGreaterThanOrEqual(1)
    expect(result.metadata.bilinearIncludeHolds).toBe(true)
    expect(result.metadata.bilinearProjectHolds).toBe(true)
    expect(result.metadata.additionalKernelSamples).toBe(0)
  })

  it("detects non-flat ℤ/2ℤ samples via injectivity failure", () => {
    const tensors = buildTensorStructures(sequence, integersMod2)
    const sequenceSamples: ReadonlyArray<ShortExactSequenceSample<bigint, bigint, bigint>> = [
      { kind: "kernel", middle: 2n, preimage: 1n },
      { kind: "inject", left: 1n },
    ]

    const result = checkFlatModuleOnSamples(
      { sequence, candidate: integersMod2, tensors },
      {
        scalarSamples: [0n, 1n],
        candidateSamples: [0n, 1n],
        leftSamples: [0n, 1n],
        middleSamples: [0n, 2n],
        rightSamples: [0n, 1n],
        sequenceSamples,
      },
    )

    expect(result.holds).toBe(false)
    expect(result.violations.some(violation => violation.kind === "injectSample")).toBe(true)
    expect(result.metadata.injectSampleChecks).toBeGreaterThan(0)
    expect(result.metadata.bilinearIncludeHolds).toBe(true)
    expect(result.metadata.bilinearProjectHolds).toBe(true)
  })
})
