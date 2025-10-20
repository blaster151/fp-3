import { describe, expect, it } from "vitest"
import {
  RingInteger,
  RingReal,
  createModuloRing,
  normalizeMod,
  checkRingHomomorphism,
  checkIdeal,
  checkModule,
  buildQuotientRing,
  checkQuotientRing,
  type RingHomomorphism,
  type RingIdeal,
  type Module,
  type QuotientConstruction,
} from "../allTS"

describe("ring infrastructure", () => {
  it("validates canonical quotient homomorphism", () => {
    const modulus = 5n
    const quotient = createModuloRing(modulus)
    const hom: RingHomomorphism<bigint, bigint> = {
      source: RingInteger,
      target: quotient,
      map: (value) => normalizeMod(value, modulus),
      label: "π₅",
    }

    const result = checkRingHomomorphism(hom, {
      samples: [-7n, -1n, 0n, 1n, 11n],
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.samplesTested).toBe(5)
  })

  it("certifies the principal ideal (5)", () => {
    const modulus = 5n
    const ideal: RingIdeal<bigint> = {
      ring: RingInteger,
      contains: (value) => value % modulus === 0n,
      name: "(5)",
    }

    const result = checkIdeal(ideal, {
      ringSamples: [-10n, -5n, -2n, -1n, 0n, 1n, 2n, 5n, 10n],
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.checkedRingElements).toBeGreaterThan(0)
  })

  it("builds the quotient ring ℤ/5ℤ", () => {
    const modulus = 5n
    const construction: QuotientConstruction<bigint> = {
      base: RingInteger,
      ideal: {
        ring: RingInteger,
        contains: (value) => value % modulus === 0n,
        name: "(5)",
      },
      reduce: (value) => normalizeMod(value, modulus),
      name: "ℤ/5ℤ",
    }

    const quotient = buildQuotientRing(construction)
    const samples = [-10n, -5n, -1n, 0n, 1n, 4n, 7n]
    const result = checkQuotientRing(quotient, { samples })

    expect(result.holds).toBe(true)
    const projectedTwo = quotient.project(2n)
    const projectedSeven = quotient.project(7n)
    const sum = quotient.ring.add(projectedTwo, projectedSeven)
    expect(quotient.representative(sum)).toBe(4n)
  })

  it("confirms ℤ as a module over itself", () => {
    const module: Module<bigint, bigint> = {
      ring: RingInteger,
      zero: 0n,
      add: (left, right) => left + right,
      neg: (value) => -value,
      scalar: (scalar, value) => scalar * value,
      eq: (left, right) => left === right,
      name: "ℤ",
    }

    const result = checkModule(module, {
      scalarSamples: [-2n, -1n, 0n, 1n, 2n],
      vectorSamples: [-3n, -1n, 0n, 1n, 3n],
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.scalarSamples).toBe(5)
    expect(result.violations).toHaveLength(0)
  })

  it("flags non-abelian module additions", () => {
    const add = (left: number, right: number): number => {
      if (left === 1 && right === 2) return 42
      if (left === 2 && right === 1) return 41
      if (left === 1 && right === 1) return 1
      return left + right
    }

    const module: Module<number, number> = {
      ring: RingReal,
      zero: 0,
      add,
      neg: (value) => -value,
      scalar: (scalar, value) => scalar * value,
      eq: (left, right) => left === right,
      name: "non-abelian toy module",
    }

    const result = checkModule(module, {
      scalarSamples: [0, 1],
      vectorSamples: [0, 1, 2],
    })

    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "addCommutative")).toBe(true)
    expect(result.violations.some((violation) => violation.kind === "addAssociative")).toBe(true)
  })
})
