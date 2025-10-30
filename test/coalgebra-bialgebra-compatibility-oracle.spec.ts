import { describe, expect, it } from "vitest"
import type {
  BialgebraStructure,
  BialgebraCompatibilityDiagnostics,
  SymmetricMonoidalWitnesses,
  MonoidalIsomorphismWitness,
} from "../operations/coalgebra/coalgebra-interfaces"
import {
  BIALGEBRA_COMPATIBILITY_COMPONENTS,
  deriveBialgebraTensorWitnessesFromSymmetricMonoidal,
} from "../operations/coalgebra/coalgebra-interfaces"
import {
  analyzeBialgebraCompatibilityComponent,
  ensureBialgebraCompatibilityComponent,
  withBialgebraCompatibility,
} from "../operations/coalgebra/coalgebra-interfaces"
import { checkBialgebraCompatibility } from "../oracles/coalgebra/bialgebra-compatibility-oracle"
import type { Category } from "../stdlib/category"
import type { ArrowFamilies } from "../stdlib/arrow-families"
import type { CategoryLimits } from "../stdlib/category-limits"
import { buildBialgebraCompatibilityComponentWitness } from "../operations/coalgebra/coalgebra-witnesses"

type BialgebraObject = "B"

type BialgebraMorphismTag = "id" | "bad-multiplication" | "bad-unit" | "bad-counit"

interface BialgebraMorphism {
  readonly tag: BialgebraMorphismTag
  readonly name: string
}

const canonicalByTag = {
  id: { tag: "id", name: "id_B" },
  "bad-multiplication": { tag: "bad-multiplication", name: "μ_bad" },
  "bad-unit": { tag: "bad-unit", name: "η_bad" },
  "bad-counit": { tag: "bad-counit", name: "ε_bad" },
} as const satisfies Record<BialgebraMorphismTag, BialgebraMorphism>

type CanonicalTag = keyof typeof canonicalByTag

const collapse = (morphism: BialgebraMorphism): BialgebraMorphism => canonicalByTag[morphism.tag as CanonicalTag]

const identity = canonicalByTag.id
const badMultiplication = canonicalByTag["bad-multiplication"]
const badUnit = canonicalByTag["bad-unit"]
const badCounit = canonicalByTag["bad-counit"]

const bialgebraObject: BialgebraObject = "B"

const bialgebraCategory: Category<BialgebraObject, BialgebraMorphism> &
  ArrowFamilies.HasDomCod<BialgebraObject, BialgebraMorphism> = {
    id: () => identity,
    compose: (g, f) => {
      if (g.tag !== "id") {
        return collapse(g)
      }
      if (f.tag !== "id") {
        return collapse(f)
      }
      return identity
    },
    dom: () => bialgebraObject,
    cod: () => bialgebraObject,
    equalMor: (left, right) => left.tag === right.tag,
  }

const bialgebraTensor: CategoryLimits.TensorProductStructure<BialgebraObject, BialgebraMorphism> = {
  onObjects: () => bialgebraObject,
  onMorphisms: () => identity,
}

const trivialIso = (): MonoidalIsomorphismWitness<BialgebraMorphism> => ({
  forward: identity,
  backward: identity,
})

const symmetricWitnesses: SymmetricMonoidalWitnesses<BialgebraObject, BialgebraMorphism> = {
  associator: () => trivialIso(),
  braiding: () => trivialIso(),
}

const baseBialgebra: BialgebraStructure<BialgebraObject, BialgebraMorphism> = {
  category: bialgebraCategory,
  tensor: bialgebraTensor,
  algebra: {
    object: bialgebraObject,
    multiply: identity,
    unit: identity,
  },
  comonoid: {
    object: bialgebraObject,
    copy: identity,
    discard: identity,
  },
  tensorWitnesses: deriveBialgebraTensorWitnessesFromSymmetricMonoidal(
    bialgebraCategory,
    bialgebraTensor,
    symmetricWitnesses,
    bialgebraObject,
  ),
}

const extract = <M>(
  diagnostics: BialgebraCompatibilityDiagnostics<M>,
): readonly [
  BialgebraCompatibilityDiagnostics<M>["multiplication"],
  BialgebraCompatibilityDiagnostics<M>["unit"],
  BialgebraCompatibilityDiagnostics<M>["counit"],
] => [diagnostics.multiplication, diagnostics.unit, diagnostics.counit]

describe("Bialgebra compatibility oracle", () => {
  it("reports success when all compatibility laws hold", () => {
    const report = checkBialgebraCompatibility(baseBialgebra)

    expect(report.overall).toBe(true)
    expect(report.multiplication.holds).toBe(true)
    expect(report.unit.holds).toBe(true)
    expect(report.counit.holds).toBe(true)
    expect(report.multiplication.details).toBeUndefined()
    expect(report.unit.details).toBeUndefined()
    expect(report.counit.details).toBeUndefined()
    expect(report.witness.overall).toBe(true)
    expect(report.witness.multiplication.holds).toBe(true)
    expect(report.witness.unit.holds).toBe(true)
    expect(report.witness.counit.holds).toBe(true)
    expect(report.failures).toEqual([])

    const expectedSummary = [
      "Bialgebra compatibility for B: all laws hold.",
      "- multiplication law holds: Δ ∘ μ = (μ ⊗ μ) ∘ (id ⊗ τ ⊗ id) ∘ (Δ ⊗ Δ) = id_B",
      "- unit law holds: Δ ∘ η = η ⊗ η = id_B",
      "- counit law holds: ε ∘ μ = ε ⊗ ε = id_B",
    ].join("\n")
    expect(report.summary).toBe(expectedSummary)

    expect(report.summaryDetails.headline).toBe("Bialgebra compatibility for B: all laws hold.")
    expect(report.summaryDetails.overall).toBe(true)
    expect(report.summaryDetails.components.map((component) => component.component)).toEqual([
      ...BIALGEBRA_COMPATIBILITY_COMPONENTS,
    ])
    for (const componentSummary of report.summaryDetails.components) {
      expect(report.summaryDetails.byComponent[componentSummary.component]).toBe(componentSummary)
    }
    for (const component of report.summaryDetails.components) {
      expect(component.holds).toBe(true)
      expect(component.actual.value).toBe(identity)
      expect(component.expected.value).toBe(identity)
      expect(component.actual.rendered).toBe("id_B")
      expect(component.expected.rendered).toBe("id_B")
    }

    const [multiplicationDiagnostics, unitDiagnostics, counitDiagnostics] = extract(report.diagnostics)
    expect(multiplicationDiagnostics.left).toBe(identity)
    expect(multiplicationDiagnostics.right).toBe(identity)
    expect(unitDiagnostics.left).toBe(identity)
    expect(unitDiagnostics.right).toBe(identity)
    expect(counitDiagnostics.left).toBe(identity)
    expect(counitDiagnostics.right).toBe(identity)
  })

  it("explains failures in the multiplication compatibility law", () => {
    const flawed: BialgebraStructure<BialgebraObject, BialgebraMorphism> = {
      ...baseBialgebra,
      algebra: { ...baseBialgebra.algebra, multiply: badMultiplication },
    }

    const report = checkBialgebraCompatibility(flawed)

    expect(report.overall).toBe(false)
    expect(report.multiplication.holds).toBe(false)
    expect(report.multiplication.details).toContain("Δ ∘ μ = μ_bad")
    expect(report.multiplication.details).toContain("(μ ⊗ μ) ∘ (id ⊗ τ ⊗ id) ∘ (Δ ⊗ Δ) = id_B")
    expect(report.unit.holds).toBe(true)
    expect(report.counit.holds).toBe(true)
    expect(report.witness.multiplication.holds).toBe(false)
    expect(report.witness.unit.holds).toBe(true)
    expect(report.witness.counit.holds).toBe(true)
    expect(report.summary).toContain("Bialgebra compatibility for B: violations detected.")
    expect(report.summary).toContain("Δ ∘ μ = μ_bad")
    expect(report.summary).toContain("(μ ⊗ μ) ∘ (id ⊗ τ ⊗ id) ∘ (Δ ⊗ Δ) = id_B")
    expect(report.failures).toHaveLength(1)
    expect(report.failures[0]?.component).toBe("multiplication")
    expect(report.failures[0]?.message).toContain("Δ ∘ μ = μ_bad")
    const multiplicationComponent = report.summaryDetails.byComponent.multiplication
    expect(multiplicationComponent?.holds).toBe(false)
    expect(multiplicationComponent?.actual.rendered).toBe("μ_bad")
    expect(multiplicationComponent?.expected.rendered).toBe("id_B")
  })

  it("explains failures in the unit compatibility law", () => {
    const flawed: BialgebraStructure<BialgebraObject, BialgebraMorphism> = {
      ...baseBialgebra,
      algebra: { ...baseBialgebra.algebra, unit: badUnit },
    }

    const report = checkBialgebraCompatibility(flawed)

    expect(report.overall).toBe(false)
    expect(report.unit.holds).toBe(false)
    expect(report.unit.details).toContain("Δ ∘ η = η_bad")
    expect(report.unit.details).toContain("η ⊗ η = id_B")
    expect(report.multiplication.holds).toBe(true)
    expect(report.counit.holds).toBe(true)
    expect(report.witness.unit.holds).toBe(false)
    expect(report.failures).toHaveLength(1)
    expect(report.failures[0]?.component).toBe("unit")
    expect(report.failures[0]?.message).toContain("Δ ∘ η = η_bad")
  })

  it("explains failures in the counit compatibility law", () => {
    const flawed: BialgebraStructure<BialgebraObject, BialgebraMorphism> = {
      ...baseBialgebra,
      comonoid: { ...baseBialgebra.comonoid, discard: badCounit },
    }

    const report = checkBialgebraCompatibility(flawed)

    expect(report.overall).toBe(false)
    expect(report.counit.holds).toBe(false)
    expect(report.counit.details).toContain("ε ∘ μ = ε_bad")
    expect(report.counit.details).toContain("ε ⊗ ε = id_B")
    expect(report.multiplication.holds).toBe(true)
    expect(report.unit.holds).toBe(true)
    expect(report.witness.counit.holds).toBe(false)
    expect(report.failures).toHaveLength(1)
    expect(report.failures[0]?.component).toBe("counit")
    expect(report.failures[0]?.message).toContain("ε ∘ μ = ε_bad")
  })

  it("reuses cached compatibility diagnostics when available on the structure", () => {
    const cachedDiagnostics: BialgebraCompatibilityDiagnostics<BialgebraMorphism> = {
      multiplication: { left: badMultiplication, right: identity, holds: false },
      unit: { left: identity, right: identity, holds: true },
      counit: { left: identity, right: identity, holds: true },
      overall: false,
    }

    const cached = withBialgebraCompatibility(baseBialgebra, cachedDiagnostics)

    const report = checkBialgebraCompatibility(cached)

    expect(report.diagnostics).toBe(cachedDiagnostics)
    expect(report.overall).toBe(false)
    expect(report.multiplication.holds).toBe(false)
    expect(report.multiplication.details).toContain("Δ ∘ μ = μ_bad")
    expect(report.witness.multiplication.holds).toBe(false)
    expect(report.failures).toHaveLength(1)
    expect(report.failures[0]?.component).toBe("multiplication")
  })

  it("analyzes compatibility components in isolation", () => {
    const multiplicationWitness = analyzeBialgebraCompatibilityComponent(baseBialgebra, "multiplication")
    expect(multiplicationWitness.holds).toBe(true)
    expect(multiplicationWitness.left).toBe(identity)
    expect(multiplicationWitness.right).toBe(identity)

    const flawed: BialgebraStructure<BialgebraObject, BialgebraMorphism> = {
      ...baseBialgebra,
      algebra: { ...baseBialgebra.algebra, multiply: badMultiplication },
    }

    const failingWitness = analyzeBialgebraCompatibilityComponent(flawed, "multiplication")
    expect(failingWitness.holds).toBe(false)
    expect(failingWitness.left).toBe(badMultiplication)
    expect(failingWitness.right).toBe(identity)
  })

  it("reuses cached component diagnostics when available", () => {
    const cachedDiagnostics: BialgebraCompatibilityDiagnostics<BialgebraMorphism> = {
      multiplication: { left: badMultiplication, right: identity, holds: false },
      unit: { left: identity, right: identity, holds: true },
      counit: { left: identity, right: identity, holds: true },
      overall: false,
    }

    const cached = withBialgebraCompatibility(baseBialgebra, cachedDiagnostics)
    const witness = ensureBialgebraCompatibilityComponent(cached, "multiplication")

    expect(witness).toBe(cachedDiagnostics.multiplication)
  })

  it("builds component witnesses without recomputing when diagnostics are supplied", () => {
    const cachedDiagnostics: BialgebraCompatibilityDiagnostics<BialgebraMorphism> = {
      multiplication: { left: identity, right: identity, holds: true },
      unit: { left: badUnit, right: identity, holds: false },
      counit: { left: identity, right: identity, holds: true },
      overall: false,
    }

    const witness = buildBialgebraCompatibilityComponentWitness(
      baseBialgebra,
      "unit",
      cachedDiagnostics,
    )

    expect(witness).toBe(cachedDiagnostics.unit)
  })
})
