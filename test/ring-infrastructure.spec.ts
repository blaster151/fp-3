import { describe, expect, it } from "vitest"
import {
  RingInteger,
  RingReal,
  createModuloRing,
  normalizeMod,
  checkSemiring,
  checkRing,
  checkRingHomomorphism,
  checkIdeal,
  checkPrimeIdeal,
  checkMultiplicativeSet,
  checkLocalizationRing,
  checkFinitelyGeneratedModule,
  checkBilinearMap,
  checkTensorProduct,
  checkModule,
  checkModuleHomomorphism,
  buildQuotientRing,
  checkQuotientRing,
  type RingHomomorphism,
  type Ring,
  type Semiring,
  type RingIdeal,
  type MultiplicativeSet,
  type LocalizationRingData,
  type LocalizationFraction,
  type Module,
  type FinitelyGeneratedModule,
  type BilinearMap,
  type TensorProductStructure,
  type ModuleHomomorphism,
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

  it("verifies that (5) is a prime ideal of ℤ", () => {
    const ideal: RingIdeal<bigint> = {
      ring: RingInteger,
      contains: (value) => value % 5n === 0n,
      name: "(5)",
    }

    const samples = [-10n, -5n, -1n, 0n, 1n, 2n, 3n, 4n, 5n, 6n]
    const result = checkPrimeIdeal(ideal, { ringSamples: samples })

    expect(result.holds).toBe(true)
    expect(result.metadata.distinctRingSamples).toBe(samples.length)
    expect(result.metadata.ringSampleCandidates).toBe(samples.length)
    expect(result.witnesses).toHaveLength(0)
  })

  it("confirms the 5-localization multiplicative set", () => {
    const multiplicativeSet: MultiplicativeSet<bigint> = {
      ring: RingInteger,
      contains: (value) => value === 1n || (value % 5n === 0n && value !== 0n),
      label: "S = {1, 5, 10, …}",
    }

    const samples = [1n, 5n, 10n, 25n]
    const result = checkMultiplicativeSet(multiplicativeSet, {
      ringSamples: samples,
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.distinctRingSamples).toBe(samples.length)
    expect(result.metadata.requireOne).toBe(true)
    expect(result.metadata.forbidZero).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it("detects closure failures in multiplicative sets", () => {
    const flawedSet: MultiplicativeSet<bigint> = {
      ring: RingInteger,
      contains: (value) => value === 1n || value === 2n,
      label: "{1, 2}",
    }

    const samples = [1n, 2n]
    const result = checkMultiplicativeSet(flawedSet, {
      ringSamples: samples,
      witnessLimit: 3,
    })

    expect(result.holds).toBe(false)
    expect(result.metadata.witnessLimit).toBe(3)
    expect(result.metadata.witnessesRecorded).toBeGreaterThan(0)
    expect(result.violations.some(violation => violation.kind === "notClosed")).toBe(true)
    expect(result.details).toContain("violations")
  })

  it("verifies localization ring laws for powers-of-5 denominators", () => {
    const multiplicativeSet: MultiplicativeSet<bigint> = {
      ring: RingInteger,
      contains: (value) => value === 1n || (value % 5n === 0n && value !== 0n),
      label: "S = {1, 5, 25, …}",
    }

    const data: LocalizationRingData<bigint> = {
      base: RingInteger,
      multiplicativeSet,
    }

    const fractionSamples: ReadonlyArray<LocalizationFraction<bigint>> = [
      { numerator: 1n, denominator: 5n },
      { numerator: 2n, denominator: 25n },
    ]

    const result = checkLocalizationRing(data, {
      numeratorSamples: [-2n, -1n, 0n, 1n, 2n],
      denominatorSamples: [1n, 5n, 25n],
      multiplierSamples: [5n, 25n],
      fractionSamples,
      witnessLimit: 6,
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.fractionSamples).toBeGreaterThan(fractionSamples.length)
    expect(result.witnesses.length).toBeGreaterThan(0)
  })

  it("detects localization denominators outside the multiplicative set", () => {
    const multiplicativeSet: MultiplicativeSet<bigint> = {
      ring: RingInteger,
      contains: (value) => value === 1n || (value % 5n === 0n && value !== 0n),
      label: "S = {1, 5, 25, …}",
    }

    const data: LocalizationRingData<bigint> = {
      base: RingInteger,
      multiplicativeSet,
    }

    const result = checkLocalizationRing(data, {
      numeratorSamples: [1n],
      denominatorSamples: [3n],
      multiplierSamples: [1n, 5n],
    })

    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "denominatorOutsideSet")).toBe(true)
    expect(result.metadata.denominatorSamples).toBe(1)
  })

  it("detects that (6) is not a prime ideal of ℤ", () => {
    const ideal: RingIdeal<bigint> = {
      ring: RingInteger,
      contains: (value) => value % 6n === 0n,
      name: "(6)",
    }

    const samples = [-6n, -3n, -2n, -1n, 0n, 1n, 2n, 3n, 4n, 6n]
    const result = checkPrimeIdeal(ideal, { ringSamples: samples, witnessLimit: 2 })

    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "absorbsProduct")).toBe(true)
    expect(result.witnesses.length).toBeGreaterThan(0)
    const witness = result.witnesses[0]
    expect(ideal.contains(witness.product)).toBe(true)
    expect(ideal.contains(witness.factors[0])).toBe(false)
    expect(ideal.contains(witness.factors[1])).toBe(false)
    expect(result.metadata.witnessLimit).toBe(2)
    expect(result.metadata.witnessesRecorded).toBeGreaterThan(0)
  })

  it("flags improper ideals when requireProper is true", () => {
    const improperIdeal: RingIdeal<bigint> = {
      ring: RingInteger,
      contains: () => true,
      name: "whole ring",
    }

    const result = checkPrimeIdeal(improperIdeal, {
      ringSamples: [0n, 1n, 2n],
      requireProper: true,
    })

    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "unit")).toBe(true)
    expect(result.metadata.distinctRingSamples).toBeGreaterThan(0)
    expect(result.metadata.requireProper).toBe(true)
  })

  it("validates ℤ as a ring", () => {
    const samples = [-2n, -1n, 0n, 1n, 2n]

    const result = checkRing(RingInteger, { samples })

    expect(result.holds).toBe(true)
    expect(result.metadata.sampleCount).toBe(samples.length)
    expect(result.violations).toHaveLength(0)
  })

  it("validates ℤ as a semiring", () => {
    const samples = [-2n, -1n, 0n, 1n, 2n]

    const result = checkSemiring(RingInteger, { samples })

    expect(result.holds).toBe(true)
    expect(result.metadata.sampleCount).toBe(samples.length)
    expect(result.violations).toHaveLength(0)
  })

  it("flags non-associative additions in rings", () => {
    const weirdAdd = (left: number, right: number): number =>
      left === 1 && right === 2 ? 10 : left + right

    const weirdRing: Ring<number> = {
      zero: 0,
      one: 1,
      add: weirdAdd,
      mul: (left, right) => left * right,
      neg: (value) => -value,
      sub: (left, right) => left - right,
      eq: (left, right) => left === right,
    }

    const result = checkRing(weirdRing, { samples: [0, 1, 2] })

    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "addAssociative")).toBe(true)
    expect(result.violations.some((violation) => violation.kind === "addCommutative")).toBe(true)
  })

  it("flags semiring identity failures", () => {
    const brokenSemiring: Semiring<number> = {
      zero: 0,
      one: 1,
      add: (left, right) => left + right,
      mul: (left, right) => (left === 1 && right === 1 ? 0 : left * right),
      eq: (left, right) => left === right,
    }

    const result = checkSemiring(brokenSemiring, { samples: [0, 1, 2] })

    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "mulIdentity")).toBe(true)
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

  it("diagnoses non-idempotent quotient reducers", () => {
    const modulus = 5n
    const construction: QuotientConstruction<bigint> = {
      base: RingInteger,
      ideal: {
        ring: RingInteger,
        contains: (value) => value % modulus === 0n,
        name: "(5)",
      },
      reduce: (value) => value + value / modulus,
      name: "skewed ℤ/5ℤ",
    }

    const quotient = buildQuotientRing(construction)
    const samples = [0n, 1n, 5n, 6n, 10n]
    const result = checkQuotientRing(quotient, { samples })

    expect(result.holds).toBe(false)
    expect(result.metadata.idempotenceChecks).toBe(samples.length)
    expect(result.metadata.cosetComparisons).toBeGreaterThan(0)
    expect(result.violations.some((violation) => violation.kind === "reductionIdempotence")).toBe(true)
    expect(result.violations.some((violation) => violation.kind === "cosetEquality")).toBe(true)
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

    const finitelyGenerated: FinitelyGeneratedModule<bigint, bigint> = {
      module,
      generators: [1n],
      label: "ℤ as ⟨1⟩",
    }

    const generationResult = checkFinitelyGeneratedModule(finitelyGenerated, {
      vectorSamples: [-2n, -1n, 0n, 1n, 2n],
      coefficientSamples: [-2n, -1n, 0n, 1n, 2n],
      witnessLimit: 2,
    })

    expect(generationResult.holds).toBe(true)
    expect(generationResult.metadata.generatorCount).toBe(1)
    expect(generationResult.metadata.distinctVectorSamples).toBe(5)
    expect(generationResult.metadata.combinationsTested).toBeGreaterThan(0)
    expect(generationResult.witnesses.length).toBeGreaterThan(0)
    expect(generationResult.witnesses[0].coefficients[0]).toBe(-2n)

    const result = checkModule(module, {
      scalarSamples: [-2n, -1n, 0n, 1n, 2n],
      vectorSamples: [-3n, -1n, 0n, 1n, 3n],
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.scalarSamples).toBe(5)
    expect(result.violations).toHaveLength(0)
  })

  it("detects failures of generating sets", () => {
    const module: Module<bigint, bigint> = {
      ring: RingInteger,
      zero: 0n,
      add: (left, right) => left + right,
      neg: (value) => -value,
      scalar: (scalar, value) => scalar * value,
      eq: (left, right) => left === right,
      name: "ℤ",
    }

    const finitelyGenerated: FinitelyGeneratedModule<bigint, bigint> = {
      module,
      generators: [2n],
      label: "2ℤ", 
    }

    const generationResult = checkFinitelyGeneratedModule(finitelyGenerated, {
      vectorSamples: [0n, 1n, 2n],
      coefficientSamples: [-1n, 0n, 1n],
      witnessLimit: 1,
    })

    expect(generationResult.holds).toBe(false)
    expect(generationResult.violations.some(violation => violation.kind === "notGenerated")).toBe(true)
    expect(generationResult.metadata.witnessesRecorded).toBe(0)
    expect(generationResult.metadata.combinationLimit).toBeGreaterThan(0)
    expect(generationResult.details).toContain("violations")
  })

  it("validates ℤ-bilinear multiplication", () => {
    const module: Module<bigint, bigint> = {
      ring: RingInteger,
      zero: 0n,
      add: (left, right) => left + right,
      neg: (value) => -value,
      scalar: (scalar, value) => scalar * value,
      eq: (left, right) => left === right,
      name: "ℤ",
    }

    const bilinear: BilinearMap<bigint, bigint, bigint, bigint> = {
      left: module,
      right: module,
      target: module,
      map: (left, right) => left * right,
      label: "multiplication",
    }

    const result = checkBilinearMap(bilinear, {
      leftSamples: [-2n, -1n, 0n, 1n, 2n],
      rightSamples: [-1n, 0n, 2n],
      scalarSamples: [-1n, 0n, 1n, 2n],
      witnessLimit: 2,
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.distinctLeftSamples).toBe(5)
    expect(result.metadata.distinctRightSamples).toBe(3)
    expect(result.metadata.distinctScalarSamples).toBe(4)
    expect(result.witnesses.length).toBeGreaterThan(0)
    expect(result.details).toContain("verified")
  })

  it("detects non-bilinear maps", () => {
    const module: Module<bigint, bigint> = {
      ring: RingInteger,
      zero: 0n,
      add: (left, right) => left + right,
      neg: (value) => -value,
      scalar: (scalar, value) => scalar * value,
      eq: (left, right) => left === right,
      name: "ℤ",
    }

    const failing: BilinearMap<bigint, bigint, bigint, bigint> = {
      left: module,
      right: module,
      target: module,
      map: (left, right) => left + right,
      label: "sum",
    }

    const result = checkBilinearMap(failing, {
      leftSamples: [0n, 1n, 2n],
      rightSamples: [0n, 1n],
      scalarSamples: [0n, 1n],
    })

    expect(result.holds).toBe(false)
    expect(result.violations.some(violation => violation.kind === "rightAdditive" || violation.kind === "leftAdditive")).toBe(true)
    expect(result.details).toContain("failed")
  })

  it("verifies the ℤ tensor product universal property", () => {
    const module: Module<bigint, bigint> = {
      ring: RingInteger,
      zero: 0n,
      add: (left, right) => left + right,
      neg: (value) => -value,
      scalar: (scalar, value) => scalar * value,
      eq: (left, right) => left === right,
      name: "ℤ",
    }

    const tensor: TensorProductStructure<bigint, bigint, bigint, bigint> = {
      left: module,
      right: module,
      tensor: module,
      pureTensor: (left, right) => left * right,
      induce: (bilinear) => {
        const generatorImage = bilinear.map(1n, 1n)
        return {
          source: module,
          target: bilinear.target,
          map: (value) => bilinear.target.scalar(value, generatorImage),
          label: `⟨${bilinear.label ?? "β"}⟩`,
        }
      },
      label: "ℤ ⊗ ℤ",
    }

    const bilinearMaps: ReadonlyArray<BilinearMap<bigint, bigint, bigint, bigint>> = [
      {
        left: module,
        right: module,
        target: module,
        map: (left, right) => left * right,
        label: "ab",
      },
      {
        left: module,
        right: module,
        target: module,
        map: (left, right) => 2n * left * right,
        label: "2ab",
      },
    ]

    const result = checkTensorProduct(tensor, {
      leftSamples: [-1n, 0n, 1n, 2n],
      rightSamples: [-1n, 0n, 2n],
      scalarSamples: [-1n, 0n, 1n, 2n],
      tensorSamples: [0n, 1n, 2n],
      bilinearMaps,
      witnessLimit: 3,
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.bilinearMapsChecked).toBe(2)
    expect(result.metadata.universalPairChecks).toBe(12)
    expect(result.witnesses.length).toBeGreaterThan(0)
    expect(result.details).toContain("verified")
  })

  it("detects tensor product universal property failures", () => {
    const module: Module<bigint, bigint> = {
      ring: RingInteger,
      zero: 0n,
      add: (left, right) => left + right,
      neg: (value) => -value,
      scalar: (scalar, value) => scalar * value,
      eq: (left, right) => left === right,
      name: "ℤ",
    }

    const flawed: TensorProductStructure<bigint, bigint, bigint, bigint> = {
      left: module,
      right: module,
      tensor: module,
      pureTensor: (left, right) => left * right,
      induce: (bilinear) => ({
        source: module,
        target: bilinear.target,
        map: () => bilinear.target.zero,
        label: `0∘${bilinear.label ?? "β"}`,
      }),
      label: "degenerate ℤ ⊗ ℤ",
    }

    const bilinear: BilinearMap<bigint, bigint, bigint, bigint> = {
      left: module,
      right: module,
      target: module,
      map: (left, right) => left * right,
      label: "ab",
    }

    const result = checkTensorProduct(flawed, {
      leftSamples: [0n, 1n, 2n],
      rightSamples: [0n, 1n],
      scalarSamples: [0n, 1n],
      bilinearMaps: [bilinear],
      tensorSamples: [0n, 1n, 2n],
    })

    expect(result.holds).toBe(false)
    expect(result.violations.some(violation => violation.kind === "universalMismatch")).toBe(true)
    expect(result.metadata.bilinearMapsChecked).toBe(1)
    expect(result.details).toContain("violations")
  })

  it("validates the identity module homomorphism on ℤ", () => {
    const module: Module<bigint, bigint> = {
      ring: RingInteger,
      zero: 0n,
      add: (left, right) => left + right,
      neg: (value) => -value,
      scalar: (scalar, value) => scalar * value,
      eq: (left, right) => left === right,
      name: "ℤ",
    }

    const hom: ModuleHomomorphism<bigint, bigint, bigint> = {
      source: module,
      target: module,
      map: (value) => value,
      label: "id",
    }

    const vectorSamples = [-2n, -1n, 0n, 1n, 2n] as const
    const scalarSamples = [-1n, 0n, 1n, 2n] as const

    const result = checkModuleHomomorphism(hom, {
      vectorSamples,
      scalarSamples,
    })

    expect(result.holds).toBe(true)
    expect(result.metadata.additivePairsChecked).toBe(vectorSamples.length ** 2)
    expect(result.metadata.scalarPairsChecked).toBe(scalarSamples.length * vectorSamples.length)
  })

  it("flags module homomorphisms that fail scalar preservation", () => {
    const module: Module<bigint, bigint> = {
      ring: RingInteger,
      zero: 0n,
      add: (left, right) => left + right,
      neg: (value) => -value,
      scalar: (scalar, value) => scalar * value,
      eq: (left, right) => left === right,
      name: "ℤ",
    }

    const failingHom: ModuleHomomorphism<bigint, bigint, bigint> = {
      source: module,
      target: module,
      map: (value) => value + 1n,
      label: "translate",
    }

    const vectorSamples = [-1n, 0n, 1n] as const
    const scalarSamples = [0n, 1n, 2n] as const

    const result = checkModuleHomomorphism(failingHom, {
      vectorSamples,
      scalarSamples,
    })

    expect(result.holds).toBe(false)
    expect(result.violations.some((violation) => violation.kind === "scalar")).toBe(true)
    expect(result.violations.some((violation) => violation.kind === "addition")).toBe(true)
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
