import { describe, expect, it } from "vitest"
import type {
  Coalgebra,
  CoalgebraMorphism,
  ComonadStructure,
} from "../operations/coalgebra/coalgebra-interfaces"
import { mkCoalgebraMorphism } from "../operations/coalgebra/coalgebra-interfaces"
import type { Category } from "../stdlib/category"
import type { ArrowFamilies } from "../stdlib/arrow-families"
import { CategoryLimits } from "../stdlib/category-limits"
import {
  buildCoalgebraWedgeProduct,
  computeCoalgebraWedgePullback,
  type CoalgebraSubcoalgebra,
  type CoalgebraWedgePullbackWitness,
} from "../operations/coalgebra/wedge-product"
import {
  buildCotensorTower,
  analyzeCotensorTowerProgress,
  summarizeCotensorTowerProgress,
} from "../operations/coalgebra/cotensor"
import {
  checkCoalgebraWedgeProduct,
  checkCotensorTower,
} from "../oracles/coalgebra/cotensor-oracles"

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
const flippingMorphism = mkMorphism("flip", (input) => !input)

const booleanCategoryWithLimits: Category<BooleanObject, BooleanMorphism> &
  ArrowFamilies.HasDomCod<BooleanObject, BooleanMorphism> &
  CategoryLimits.HasFiniteProducts<BooleanObject, BooleanMorphism> &
  CategoryLimits.HasEqualizers<BooleanObject, BooleanMorphism> = {
    id: () => identityMorphism,
    compose: (g, f) => mkMorphism(`${g.name}∘${f.name}`, (input) => g.apply(f.apply(input))),
    dom: (morphism) => morphism.dom,
    cod: (morphism) => morphism.cod,
    equalMor: (left, right) => booleanDomain.every((value) => left.apply(value) === right.apply(value)),
    product: (objects) => ({
      obj: "𝟙",
      projections: objects.map(() => identityMorphism),
    }),
    equalizer: () => ({ obj: "𝟙", equalize: identityMorphism }),
  }

const identityComonad: ComonadStructure<BooleanObject, BooleanMorphism> = {
  category: booleanCategoryWithLimits,
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

const identityInclusion: CoalgebraMorphism<BooleanObject, BooleanMorphism> =
  mkCoalgebraMorphism(identityCoalgebra, identityCoalgebra, identityMorphism)

const identitySubcoalgebra: CoalgebraSubcoalgebra<BooleanObject, BooleanMorphism> = {
  coalgebra: identityCoalgebra,
  inclusion: identityInclusion,
}

const buildTower = (levels: number) =>
  buildCotensorTower(
    identityComonad,
    identityCoalgebra,
    identitySubcoalgebra,
    identitySubcoalgebra,
    {
      levels,
      wedgeOptions: () => ({ coaction: identityMorphism }),
    },
  )

const mutatePullbackMediator = (
  toAmbient: BooleanMorphism,
  pullback: CoalgebraWedgePullbackWitness<BooleanObject, BooleanMorphism>,
): CoalgebraWedgePullbackWitness<BooleanObject, BooleanMorphism> => ({
  ...pullback,
  toAmbient,
})

describe("Coalgebra wedge oracle", () => {
  it("accepts wedges built from consistent pullback data", () => {
    const pullback = computeCoalgebraWedgePullback(
      identityComonad,
      identityCoalgebra,
      identitySubcoalgebra,
      identitySubcoalgebra,
    )
    const wedge = buildCoalgebraWedgeProduct(
      identityComonad,
      identityCoalgebra,
      identitySubcoalgebra,
      identitySubcoalgebra,
      pullback,
      { coaction: identityMorphism },
    )

    const report = checkCoalgebraWedgeProduct(
      identityComonad,
      identityCoalgebra,
      identitySubcoalgebra,
      identitySubcoalgebra,
      wedge,
      pullback,
    )

    expect(report.overall).toBe(true)
    expect(report.morphisms.left.holds).toBe(true)
    expect(report.morphisms.right.holds).toBe(true)
    expect(report.morphisms.ambient.holds).toBe(true)
    expect(report.consistency.details).toBeUndefined()
  })

  it("detects mediator inconsistencies between pullback and ambient inclusions", () => {
    const pullback = computeCoalgebraWedgePullback(
      identityComonad,
      identityCoalgebra,
      identitySubcoalgebra,
      identitySubcoalgebra,
    )
    const wedge = buildCoalgebraWedgeProduct(
      identityComonad,
      identityCoalgebra,
      identitySubcoalgebra,
      identitySubcoalgebra,
      pullback,
      { coaction: identityMorphism },
    )

    const inconsistentPullback = mutatePullbackMediator(flippingMorphism, pullback)

    const report = checkCoalgebraWedgeProduct(
      identityComonad,
      identityCoalgebra,
      identitySubcoalgebra,
      identitySubcoalgebra,
      wedge,
      inconsistentPullback,
    )

    expect(report.overall).toBe(false)
    expect(report.consistency.details).toContain("Ambient inclusion agrees with pullback mediator")
  })
})

describe("Cotensor tower oracle", () => {
  it("validates every stage when the tower is constructed via the helper", () => {
    const tower = buildTower(2)
    const report = checkCotensorTower(identityComonad, tower)

    expect(report.overall).toBe(true)
    expect(report.stages).toHaveLength(2)
    expect(report.progress.stabilized).toBe(true)
    expect(report.progress.summary).toContain("level 1")
    report.stages.forEach((stage) => {
      expect(stage.passed).toBe(true)
      expect(stage.details).toBeUndefined()
    })
  })

  it("surfaces structural mismatches in the staged data", () => {
    const tower = buildTower(1)
    const mutatedTower = {
      ...tower,
      stages: tower.stages.map((stage, index) =>
        index === 0 ? { ...stage, level: stage.level + 1 } : stage,
      ),
    }

    const report = checkCotensorTower(identityComonad, mutatedTower)

    expect(report.overall).toBe(false)
    expect(report.stages[0].passed).toBe(false)
    expect(report.stages[0].details).toContain("level mismatch")
    expect(report.progress.summary).toContain("level 2")
  })
})

describe("Cotensor tower progress analyzer", () => {
  it("detects stabilization at the first stage for the identity cotensor tower", () => {
    const tower = buildTower(3)
    const progress = analyzeCotensorTowerProgress(identityComonad, tower)

    expect(progress.stabilized).toBe(true)
    expect(progress.stabilizedAt).toBe(1)
    expect(progress.stages).toHaveLength(3)

    const [firstStage, secondStage] = progress.stages
    expect(firstStage.matchesSeed).toBe(true)
    expect(firstStage.matchesPrevious).toBeUndefined()
    expect(firstStage.stabilized).toBe(true)
    expect(firstStage.stabilizationReason).toBe("seed")

    expect(secondStage.matchesPrevious).toBe(true)
    expect(secondStage.stabilized).toBe(true)
    expect(secondStage.stabilizationReason).toBe("previous")
  })
})

describe("Cotensor tower progress summarizer", () => {
  it("reports that the tower has no stages", () => {
    const summary = summarizeCotensorTowerProgress({ stabilized: false, stages: [] })

    expect(summary).toContain("no stages")
  })

  it("describes non-stabilized towers with their stage count", () => {
    const summary = summarizeCotensorTowerProgress({
      stabilized: false,
      stages: [
        {
          level: 1,
          matchesSeed: false,
          stabilized: false,
        },
        {
          level: 2,
          matchesSeed: false,
          matchesPrevious: false,
          stabilized: false,
        },
      ],
    })

    expect(summary).toContain("did not stabilize after 2 stages")
  })
})
