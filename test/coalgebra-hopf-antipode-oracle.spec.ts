import { describe, expect, it } from "vitest"
import type {
  HopfAlgebraStructure,
  HopfAntipodeDiagnostics,
} from "../operations/coalgebra/coalgebra-interfaces"
import { checkHopfAntipode } from "../oracles/coalgebra/hopf-antipode-oracle"
import type { Category } from "../stdlib/category"
import type { ArrowFamilies } from "../stdlib/arrow-families"
import type { CategoryLimits } from "../stdlib/category-limits"

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

    const [leftDiagnostics, rightDiagnostics] = extract(report.diagnostics)
    expect(leftDiagnostics.actual).toBe(identity)
    expect(leftDiagnostics.expected).toBe(identity)
    expect(rightDiagnostics.actual).toBe(identity)
    expect(rightDiagnostics.expected).toBe(identity)

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
})
