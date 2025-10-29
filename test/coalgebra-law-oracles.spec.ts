import { describe, expect, it } from "vitest"
import type {
  Coalgebra,
  CoalgebraMorphism,
  ComonadStructure,
} from "../operations/coalgebra/coalgebra-interfaces"
import {
  analyzeCoalgebraFamily,
  analyzeCoalgebraMorphisms,
  checkCoalgebraLaws,
  checkCoalgebraMorphism,
} from "../oracles/coalgebra/coalgebra-law-oracles"
import type { Category } from "../stdlib/category"
import type { ArrowFamilies } from "../stdlib/arrow-families"

type BooleanObject = "𝟙"

type BooleanMorphism = {
  readonly name: string
  readonly dom: BooleanObject
  readonly cod: BooleanObject
  readonly apply: (input: boolean) => boolean
}

const mkMorphism = (name: string, apply: (input: boolean) => boolean): BooleanMorphism => ({
  name,
  dom: "𝟙",
  cod: "𝟙",
  apply,
})

const booleanDomain: readonly boolean[] = [false, true]

const identityMorphism = mkMorphism("id_𝟙", (input) => input)

const booleanCategory: Category<BooleanObject, BooleanMorphism> &
  ArrowFamilies.HasDomCod<BooleanObject, BooleanMorphism> = {
    id: () => identityMorphism,
    compose: (g, f) => mkMorphism(`${g.name}∘${f.name}`, (input) => g.apply(f.apply(input))),
    dom: (morphism) => morphism.dom,
    cod: (morphism) => morphism.cod,
    equalMor: (left, right) => booleanDomain.every((value) => left.apply(value) === right.apply(value)),
  }

const identityComonad: ComonadStructure<BooleanObject, BooleanMorphism> = {
  category: booleanCategory,
  endofunctor: {
    onObjects: (object) => object,
    onMorphisms: (morphism) => morphism,
  },
  counit: () => mkMorphism("ε", (input) => input),
  comultiplication: () => mkMorphism("δ", (input) => input),
}

const identityCoalgebra: Coalgebra<BooleanObject, BooleanMorphism> = {
  object: "𝟙",
  coaction: identityMorphism,
}

const flippingCoalgebra: Coalgebra<BooleanObject, BooleanMorphism> = {
  object: "𝟙",
  coaction: mkMorphism("flip", (input) => !input),
}

const identityMorphismBetweenCoalgebras: CoalgebraMorphism<BooleanObject, BooleanMorphism> = {
  source: identityCoalgebra,
  target: identityCoalgebra,
  morphism: identityMorphism,
}

const identityIntoFlipping: CoalgebraMorphism<BooleanObject, BooleanMorphism> = {
  source: identityCoalgebra,
  target: flippingCoalgebra,
  morphism: identityMorphism,
}

describe("Coalgebra law oracle", () => {
  it("returns witnesses for valid coalgebras", () => {
    const report = checkCoalgebraLaws(identityComonad, identityCoalgebra)
    expect(report.overall).toBe(true)
    expect(report.counit.holds).toBe(true)
    expect(report.coassociativity.holds).toBe(true)
    expect(report.counit.witness.holds).toBe(true)
    expect(report.coassociativity.witness.holds).toBe(true)
    expect(report.witness.overall).toBe(true)
    expect(report.counit.details).toBeUndefined()
    expect(report.coassociativity.details).toBeUndefined()
  })

  it("reports counit and coassociativity failures", () => {
    const report = checkCoalgebraLaws(identityComonad, flippingCoalgebra)
    expect(report.overall).toBe(false)
    expect(report.counit.holds).toBe(false)
    expect(report.coassociativity.holds).toBe(false)
    expect(report.counit.details).toContain("Counit law failed")
    expect(report.coassociativity.details).toContain("Coassociativity failed")
    expect(report.witness.overall).toBe(false)
    expect(report.witness.counit.holds).toBe(false)
    expect(report.witness.coassociativity.holds).toBe(false)
  })
})

describe("Coalgebra morphism oracle", () => {
  it("accepts morphisms that preserve the coalgebra structure", () => {
    const report = checkCoalgebraMorphism(identityComonad, identityMorphismBetweenCoalgebras)
    expect(report.holds).toBe(true)
    expect(report.details).toBeUndefined()
    expect(report.witness.holds).toBe(true)
  })

  it("produces diagnostics for incoherent morphisms", () => {
    const report = checkCoalgebraMorphism(identityComonad, identityIntoFlipping)
    expect(report.holds).toBe(false)
    expect(report.witness.holds).toBe(false)
    expect(report.details).toContain("Coalgebra morphism coherence failed")
    expect(booleanDomain.every((value) => report.diagnostics.left.apply(value) === value)).toBe(true)
    expect(booleanDomain.every((value) => report.diagnostics.right.apply(value) === !value)).toBe(true)
  })
})

describe("Coalgebra batch analyzers", () => {
  it("summarises coalgebra law results with default labels", () => {
    const results = analyzeCoalgebraFamily(identityComonad, [identityCoalgebra, flippingCoalgebra])
    expect(results).toHaveLength(2)
    const [identityResult, flippingResult] = results
    expect(identityResult.label).toBe("𝟙")
    expect(identityResult.passed).toBe(true)
    expect(identityResult.report.overall).toBe(true)
    expect(identityResult.details).toBeUndefined()
    expect(flippingResult.label).toBe("𝟙")
    expect(flippingResult.passed).toBe(false)
    expect(flippingResult.details).toContain("Counit law failed")
    expect(flippingResult.details).toContain("Coassociativity failed")
  })

  it("supports custom labelling of coalgebra morphism reports", () => {
    const results = analyzeCoalgebraMorphisms(identityComonad, [
      identityMorphismBetweenCoalgebras,
      identityIntoFlipping,
    ], {
      describe: (morphism) => `f:${morphism.source.object}→${morphism.target.object}`,
    })

    expect(results).toHaveLength(2)
    const [coherent, incoherent] = results
    expect(coherent.label).toBe("f:𝟙→𝟙")
    expect(coherent.passed).toBe(true)
    expect(coherent.details).toBeUndefined()
    expect(incoherent.label).toBe("f:𝟙→𝟙")
    expect(incoherent.passed).toBe(false)
    expect(incoherent.details).toContain("Coalgebra morphism coherence failed")
  })
})

