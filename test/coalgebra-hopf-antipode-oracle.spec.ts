import { describe, expect, it } from "vitest"
import type {
  HopfAlgebraStructure,
  HopfAntipodeDiagnostics,
  HopfAntipodePropertySampling,
  SymmetricMonoidalWitnesses,
  MonoidalIsomorphismWitness,
} from "../operations/coalgebra/coalgebra-interfaces"
import { checkHopfAntipode } from "../oracles/coalgebra/hopf-antipode-oracle"
import type { Category } from "../stdlib/category"
import type { ArrowFamilies } from "../stdlib/arrow-families"
import type { CategoryLimits } from "../stdlib/category-limits"
import { deriveBialgebraTensorWitnessesFromSymmetricMonoidal } from "../operations/coalgebra/coalgebra-interfaces"

type HopfObject = "H"

type HopfMorphismTag = "id" | "bad-left" | "bad-right"

interface HopfMorphism {
  readonly tag: HopfMorphismTag
  readonly name: string
}

const hopfObject: HopfObject = "H"

const canonicalByTag = {
  id: { tag: "id", name: "id_H" },
  "bad-left": { tag: "bad-left", name: "bad_left" },
  "bad-right": { tag: "bad-right", name: "bad_right" },
} as const satisfies Record<HopfMorphismTag, HopfMorphism>

type CanonicalTag = keyof typeof canonicalByTag

const collapse = (morphism: HopfMorphism): HopfMorphism =>
  canonicalByTag[morphism.tag as CanonicalTag]

const identity = canonicalByTag.id
const badLeft = canonicalByTag["bad-left"]
const badRight = canonicalByTag["bad-right"]

const hopfCategory: Category<HopfObject, HopfMorphism> &
  ArrowFamilies.HasDomCod<HopfObject, HopfMorphism> = {
    id: () => identity,
    compose: (g, f) => {
      if (f.tag !== "id") {
        return collapse(f)
      }
      if (g.tag !== "id") {
        return collapse(g)
      }
      return identity
    },
    dom: () => hopfObject,
    cod: () => hopfObject,
    equalMor: (left, right) => left.tag === right.tag,
  }

const hopfTensor: CategoryLimits.TensorProductStructure<HopfObject, HopfMorphism> = {
  onObjects: () => hopfObject,
  onMorphisms: (left, right) => {
    if (left.tag !== "id") {
      return collapse(left)
    }
    if (right.tag !== "id") {
      return collapse(right)
    }
    return identity
  },
}

const trivialHopfIso = (): MonoidalIsomorphismWitness<HopfMorphism> => ({
  forward: identity,
  backward: identity,
})

const hopfSymmetricWitnesses: SymmetricMonoidalWitnesses<HopfObject, HopfMorphism> = {
  associator: () => trivialHopfIso(),
  braiding: () => trivialHopfIso(),
}

const hopf: HopfAlgebraStructure<HopfObject, HopfMorphism> = {
  category: hopfCategory,
  tensor: hopfTensor,
  algebra: {
    object: hopfObject,
    multiply: { tag: "id", name: "μ" },
    unit: { tag: "id", name: "η" },
  },
  comonoid: {
    object: hopfObject,
    copy: { tag: "id", name: "Δ" },
    discard: { tag: "id", name: "ε" },
  },
  tensorWitnesses: deriveBialgebraTensorWitnessesFromSymmetricMonoidal(
    hopfCategory,
    hopfTensor,
    hopfSymmetricWitnesses,
    hopfObject,
  ),
  antipode: { tag: "id", name: "S" },
}

const extract = <M>(
  diagnostics: HopfAntipodeDiagnostics<M>,
): readonly [HopfAntipodeDiagnostics<M>["left"], HopfAntipodeDiagnostics<M>["right"]] => [
  diagnostics.left,
  diagnostics.right,
]

describe("Hopf antipode oracle", () => {
  it("verifies the convolution inverse laws for valid Hopf data", () => {
    const report = checkHopfAntipode(hopf)

    expect(report.overall).toBe(true)
    expect(report.left.holds).toBe(true)
    expect(report.left.details).toBeUndefined()
    expect(report.right.holds).toBe(true)
    expect(report.right.details).toBeUndefined()
    expect(report.witness.overall).toBe(true)
    expect(report.witness.left.holds).toBe(true)
    expect(report.witness.right.holds).toBe(true)
    expect(report.propertySampling).toBeUndefined()
    expect(report.propertySamplingSummary).toBeUndefined()

    const [leftDiagnostics, rightDiagnostics] = extract(report.diagnostics)
    expect(leftDiagnostics.actual).toBe(identity)
    expect(leftDiagnostics.expected).toBe(identity)
    expect(rightDiagnostics.actual).toBe(identity)
    expect(rightDiagnostics.expected).toBe(identity)

    expect(report.diagnostics.derived.unitCompatibility.holds).toBe(true)
    expect(report.diagnostics.derived.counitCompatibility.holds).toBe(true)
    expect(report.diagnostics.derived.involutivity).toBeUndefined()
    expect(report.diagnostics.derived.gradedTraces).toBeUndefined()
    expect(report.diagnostics.derived.overall).toBe(true)

    expect(report.comparisons.left.actual).toBe(identity)
    expect(report.comparisons.right.actual).toBe(identity)
  })

  it("reports detailed diagnostics when the left convolution fails", () => {
    const report = checkHopfAntipode(hopf, { leftPair: [badLeft, identity] })

    expect(report.overall).toBe(false)
    expect(report.left.holds).toBe(false)
    expect(report.left.details).toContain("Hopf antipode left convolution failed")
    expect(report.left.details).toContain("S * id = bad_left")
    expect(report.left.details).toContain("η ∘ ε = id_H")
    expect(report.right.holds).toBe(true)
    expect(report.witness.overall).toBe(false)
    expect(report.witness.left.holds).toBe(false)
    expect(report.witness.right.holds).toBe(true)

    const [leftDiagnostics, rightDiagnostics] = extract(report.diagnostics)
    expect(leftDiagnostics.actual).toBe(badLeft)
    expect(leftDiagnostics.expected).toBe(identity)
    expect(leftDiagnostics.holds).toBe(false)
    expect(rightDiagnostics.holds).toBe(true)
  })

  it("reports detailed diagnostics when the right convolution fails", () => {
    const report = checkHopfAntipode(hopf, { rightPair: [identity, badRight] })

    expect(report.overall).toBe(false)
    expect(report.right.holds).toBe(false)
    expect(report.right.details).toContain("Hopf antipode right convolution failed")
    expect(report.right.details).toContain("id * S = bad_right")
    expect(report.right.details).toContain("η ∘ ε = id_H")
    expect(report.left.holds).toBe(true)
    expect(report.witness.overall).toBe(false)
    expect(report.witness.left.holds).toBe(true)
    expect(report.witness.right.holds).toBe(false)

    const [leftDiagnostics, rightDiagnostics] = extract(report.diagnostics)
    expect(rightDiagnostics.actual).toBe(badRight)
    expect(rightDiagnostics.expected).toBe(identity)
    expect(rightDiagnostics.holds).toBe(false)
    expect(leftDiagnostics.holds).toBe(true)
  })

  it("supports overriding convolution witnesses when custom expectations are known", () => {
    const report = checkHopfAntipode(hopf, {
      expected: badLeft,
      leftPair: [badLeft, identity],
      rightPair: [badLeft, identity],
    })

    expect(report.overall).toBe(true)
    expect(report.left.holds).toBe(true)
    expect(report.right.holds).toBe(true)
    expect(report.witness.overall).toBe(true)

    const [leftDiagnostics, rightDiagnostics] = extract(report.diagnostics)
    expect(leftDiagnostics.actual).toBe(badLeft)
    expect(rightDiagnostics.actual).toBe(badLeft)
    expect(leftDiagnostics.expected).toBe(badLeft)
    expect(rightDiagnostics.expected).toBe(badLeft)
  })

  it("detects enforced antipode involutivity mismatches", () => {
    const report = checkHopfAntipode(hopf, {
      derived: { involutivity: { expected: badLeft, enforce: true } },
    })

    expect(report.overall).toBe(false)
    expect(report.left.holds).toBe(true)
    expect(report.right.holds).toBe(true)
    expect(report.diagnostics.derived.involutivity?.holds).toBe(false)
    expect(report.diagnostics.derived.overall).toBe(false)
  })

  it("records graded trace comparisons when provided", () => {
    const report = checkHopfAntipode(hopf, {
      derived: {
        gradedTrace: {
          grades: ["even", "odd"] as const,
          compute: (_hopf, grade) => (grade === "even" ? 1 : -1),
          expected: (grade) => (grade === "even" ? 1 : -1),
        },
      },
    })

    expect(report.overall).toBe(true)
    expect(report.diagnostics.derived.gradedTraces).toHaveLength(2)
    expect(report.diagnostics.derived.gradedTraces?.every((trace) => trace.holds !== false)).toBe(true)
  })

  it("enforces graded trace expectations when requested", () => {
    const report = checkHopfAntipode(hopf, {
      derived: {
        gradedTrace: {
          grades: ["g"] as const,
          compute: () => 1,
          expected: () => 2,
          enforce: true,
        },
      },
    })

    expect(report.overall).toBe(false)
    expect(report.diagnostics.derived.gradedTraces?.[0]?.holds).toBe(false)
    expect(report.diagnostics.derived.overall).toBe(false)
  })

  it("evaluates property-based samples when provided", () => {
    const sampling: HopfAntipodePropertySampling<HopfMorphism, string> = {
      samples: ["x", "y"],
      apply: (morphism, sample) =>
        morphism.tag === "id" ? sample : `${morphism.name}(${sample})`,
      equalElements: (left, right) => left === right,
      describe: (value) => value,
      metadata: ["synthetic basis elements"],
    }

    const report = checkHopfAntipode(hopf, {
      propertySampling: sampling,
    })

    expect(report.propertySampling?.holds).toBe(true)
    expect(report.propertySampling?.samples).toEqual(["x", "y"])
    expect(report.propertySampling?.samplesTested).toBe(2)
    expect(report.propertySampling?.successCount).toBe(2)
    expect(report.propertySampling?.failureCount).toBe(0)
    expect(report.propertySampling?.leftFailureCount).toBe(0)
    expect(report.propertySampling?.rightFailureCount).toBe(0)
    expect(report.propertySampling?.failures).toHaveLength(0)
    expect(report.propertySampling?.metadata).toEqual(["synthetic basis elements"])
    expect(report.propertySamplingSummary).toBe(
      [
        "Hopf antipode property sampling: 2 samples tested, all passed.",
        "Metadata: synthetic basis elements",
      ].join("\n"),
    )
  })

  it("records property-based failures alongside convolution mismatches", () => {
    const sampling: HopfAntipodePropertySampling<HopfMorphism, string> = {
      samples: ["x"],
      apply: (morphism, sample) =>
        morphism.tag === "id" ? sample : `${morphism.name}(${sample})`,
      equalElements: (left, right) => left === right,
      describe: (value) => value,
    }

    const report = checkHopfAntipode(hopf, {
      leftPair: [badLeft, identity],
      propertySampling: sampling,
    })

    expect(report.propertySampling?.holds).toBe(false)
    expect(report.propertySampling?.samplesTested).toBe(1)
    expect(report.propertySampling?.successCount).toBe(0)
    expect(report.propertySampling?.failureCount).toBe(1)
    expect(report.propertySampling?.leftFailureCount).toBe(1)
    expect(report.propertySampling?.rightFailureCount).toBe(0)
    expect(report.propertySampling?.failures).toHaveLength(1)
    const failure = report.propertySampling?.failures[0]
    expect(failure?.sampleDescription).toBe("x")
    expect(failure?.left?.actualDescription).toBe("bad_left(x)")
    expect(failure?.left?.expectedDescription).toBe("x")
    expect(failure?.right).toBeUndefined()
    expect(report.propertySamplingSummary).toBe(
      [
        "Hopf antipode property sampling: 1 of 1 samples failed (left failures: 1, right failures: 0).",
        "Successful samples: 0.",
        "- Sample x failed. Left mismatch: actual = bad_left(x), expected = x",
      ].join("\n"),
    )
  })
})
