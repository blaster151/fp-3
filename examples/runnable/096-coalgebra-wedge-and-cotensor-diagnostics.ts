import type { RunnableExample } from "./types"

declare function require(id: string): any

type BooleanFixtures = typeof import("../../examples/coalgebra/boolean-fixtures")
type CoalgebraWedgeOracleReport<M> = import("../../oracles/coalgebra/cotensor-oracles").CoalgebraWedgeOracleReport<M>
type CotensorTowerOracleReport<O, M> = import("../../oracles/coalgebra/cotensor-oracles").CotensorTowerOracleReport<O, M>

type BooleanMorphism = BooleanFixtures["flippingMorphism"]
type BooleanObject = BooleanFixtures["identityCoalgebra"]["object"]

const describeWedgeReport = (
  label: string,
  report: CoalgebraWedgeOracleReport<BooleanMorphism>,
): string[] => {
  const lines = [
    `${label}: overall=${report.overall}`,
    `  Laws → counit=${report.laws.counit.holds}, coassociativity=${report.laws.coassociativity.holds}`,
    `  Morphisms → left=${report.morphisms.left.holds}, right=${report.morphisms.right.holds}, ambient=${report.morphisms.ambient.holds}`,
  ]

  const failingChecks = report.consistency.checks.filter((check) => !check.holds)
  if (failingChecks.length === 0) {
    lines.push("  Consistency checks all passed.")
  } else {
    lines.push("  Consistency failures:")
    failingChecks.slice(0, 3).forEach((check) => {
      lines.push(`    • ${check.label}`)
    })
    if (failingChecks.length > 3) {
      lines.push(`    • … ${failingChecks.length - 3} additional issue(s)`)
    }
  }

  if (report.consistency.details) {
    lines.push(`  Details: ${report.consistency.details}`)
  }

  return lines
}

const describeTowerReport = (
  label: string,
  report: CotensorTowerOracleReport<BooleanObject, BooleanMorphism>,
): string[] => {
  const lines = [
    `${label}: overall=${report.overall}`,
    `  Progress summary → ${report.progress.summary}`,
  ]

  report.stages.forEach((stage) => {
    lines.push(`  Stage ${stage.level}: passed=${stage.passed}`)
    if (!stage.passed && stage.details) {
      lines.push(`    details: ${stage.details}`)
    }
  })

  return lines
}

export const stage096CoalgebraWedgeAndCotensorDiagnostics: RunnableExample = {
  id: "096",
  title: "Coalgebra wedge and cotensor diagnostics",
  outlineReference: 96,
  tags: ["coalgebra", "oracles"],
  summary:
    "Builds the boolean identity coalgebra wedge and cotensor tower, then mutates their mediators to surface oracle diagnostics.",
  async run() {
    const fixtures: BooleanFixtures = require("../../examples/coalgebra/boolean-fixtures")
    const coalgebraOracles: typeof import("../../oracles/coalgebra/cotensor-oracles") = require(
      "../../oracles/coalgebra/cotensor-oracles",
    )

    const { checkCoalgebraWedgeProduct, checkCotensorTower } = coalgebraOracles

    const {
      buildBooleanWedge,
      withMediator,
      flippingMorphism,
      buildBooleanCotensorTower,
      describeBooleanMorphism,
    } = fixtures

    const { pullback, witness } = buildBooleanWedge()
    const wedgeReport = checkCoalgebraWedgeProduct(
      fixtures.identityComonad,
      fixtures.identityCoalgebra,
      fixtures.identitySubcoalgebra,
      fixtures.identitySubcoalgebra,
      witness,
      pullback,
    )

    const inconsistentPullback = withMediator(pullback, flippingMorphism)
    const inconsistentReport = checkCoalgebraWedgeProduct(
      fixtures.identityComonad,
      fixtures.identityCoalgebra,
      fixtures.identitySubcoalgebra,
      fixtures.identitySubcoalgebra,
      witness,
      inconsistentPullback,
    )

    const stableTower = buildBooleanCotensorTower(3)
    const stableTowerReport = checkCotensorTower(fixtures.identityComonad, stableTower)

    const mutatedTower = {
      ...stableTower,
      stages: stableTower.stages.map((stage, index) =>
        index === 0
          ? {
              ...stage,
              inclusion: { ...stage.inclusion, morphism: flippingMorphism },
            }
          : stage,
      ),
    }

    const mutatedTowerReport = checkCotensorTower(fixtures.identityComonad, mutatedTower)

    const logs: string[] = [
      "== Coalgebra wedge diagnostics ==",
      ...describeWedgeReport("Identity wedge", wedgeReport),
      "",
      `Mutated mediator → ${describeBooleanMorphism(flippingMorphism)}`,
      ...describeWedgeReport("Mediator-mismatched wedge", inconsistentReport),
      "",
      "== Cotensor tower diagnostics ==",
      ...describeTowerReport("Stabilizing tower", stableTowerReport),
      "",
      "Mutated stage 1 inclusion set to the flipping morphism.",
      ...describeTowerReport("Mutated tower", mutatedTowerReport),
    ]

    return { logs }
  },
}

