import type {
  Coalgebra,
  CoalgebraLawDiagnostics,
  CoalgebraMorphismWitness,
  ComonadStructure,
} from "../../operations/coalgebra/coalgebra-interfaces"
import {
  analyzeCoalgebraLaws,
  analyzeCoalgebraMorphism,
} from "../../operations/coalgebra/coalgebra-interfaces"
import type {
  CoalgebraSubcoalgebra,
  CoalgebraWedgeProductWitness,
  CoalgebraWedgePullbackWitness,
} from "../../operations/coalgebra/wedge-product"
import { coalgebraMorphismEquality } from "../../operations/coalgebra/wedge-product"
import type {
  CotensorTower,
  CotensorTowerProgress,
  CotensorStageProgress,
} from "../../operations/coalgebra/cotensor"
import {
  analyzeCotensorTowerProgress,
  summarizeCotensorTowerProgress,
} from "../../operations/coalgebra/cotensor"
import type { CategoryWithLimits } from "../../operations/coalgebra/wedge-product"

interface ConsistencyCheck {
  readonly label: string
  readonly holds: boolean
}

export interface CoalgebraWedgeConsistencyReport {
  readonly checks: ReadonlyArray<ConsistencyCheck>
  readonly details?: string
}

export interface CoalgebraWedgeOracleReport<M> {
  readonly overall: boolean
  readonly laws: CoalgebraLawDiagnostics<M>
  readonly morphisms: {
    readonly left: CoalgebraMorphismWitness<M>
    readonly right: CoalgebraMorphismWitness<M>
    readonly ambient: CoalgebraMorphismWitness<M>
  }
  readonly consistency: CoalgebraWedgeConsistencyReport
}

const summarizeChecks = (checks: ReadonlyArray<ConsistencyCheck>): string | undefined => {
  const failures = checks.filter((check) => !check.holds).map((check) => check.label)
  return failures.length > 0 ? failures.join("\n") : undefined
}

export const checkCoalgebraWedgeProduct = <O, M>(
  comonad: ComonadStructure<O, M>,
  ambient: Coalgebra<O, M>,
  left: CoalgebraSubcoalgebra<O, M>,
  right: CoalgebraSubcoalgebra<O, M>,
  witness: CoalgebraWedgeProductWitness<O, M>,
  pullback: CoalgebraWedgePullbackWitness<O, M>,
): CoalgebraWedgeOracleReport<M> => {
  const laws = analyzeCoalgebraLaws(comonad, witness.wedge)
  const leftMorphism = analyzeCoalgebraMorphism(comonad, witness.inclusions.left)
  const rightMorphism = analyzeCoalgebraMorphism(comonad, witness.inclusions.right)
  const ambientMorphism = analyzeCoalgebraMorphism(comonad, witness.inclusions.ambient)
  const equality = coalgebraMorphismEquality(comonad.category)

  const checks: ConsistencyCheck[] = []
  const pushCheck = (label: string, holds: boolean) => {
    checks.push({ label, holds })
  }

  pushCheck("Left inclusion sources the wedge coalgebra", Object.is(witness.inclusions.left.source, witness.wedge))
  pushCheck("Right inclusion sources the wedge coalgebra", Object.is(witness.inclusions.right.source, witness.wedge))
  pushCheck(
    "Ambient inclusion sources the wedge coalgebra",
    Object.is(witness.inclusions.ambient.source, witness.wedge),
  )
  pushCheck("Left inclusion targets the left subcoalgebra", Object.is(witness.inclusions.left.target, left.coalgebra))
  pushCheck(
    "Right inclusion targets the right subcoalgebra",
    Object.is(witness.inclusions.right.target, right.coalgebra),
  )
  pushCheck(
    "Ambient inclusion targets the ambient coalgebra",
    Object.is(witness.inclusions.ambient.target, ambient),
  )
  pushCheck(
    "Pullback apex matches the wedge carrier object",
    Object.is(pullback.pullback.apex, witness.wedge.object),
  )
  pushCheck(
    "Pullback domain leg matches the left inclusion morphism",
    equality(pullback.pullback.toDomain, witness.inclusions.left.morphism),
  )
  pushCheck(
    "Pullback anchor leg matches the right inclusion morphism",
    equality(pullback.pullback.toAnchor, witness.inclusions.right.morphism),
  )
  pushCheck(
    "Ambient inclusion agrees with pullback mediator",
    equality(pullback.toAmbient, witness.inclusions.ambient.morphism),
  )

  const leftAmbient = comonad.category.compose(left.inclusion.morphism, witness.inclusions.left.morphism)
  const rightAmbient = comonad.category.compose(right.inclusion.morphism, witness.inclusions.right.morphism)

  pushCheck(
    "Left ambient path matches the pullback mediator",
    equality(leftAmbient, pullback.toAmbient),
  )
  pushCheck(
    "Right ambient path matches the pullback mediator",
    equality(rightAmbient, pullback.toAmbient),
  )
  pushCheck(
    "Ambient inclusion matches the left ambient path",
    equality(leftAmbient, witness.inclusions.ambient.morphism),
  )
  pushCheck(
    "Ambient inclusion matches the right ambient path",
    equality(rightAmbient, witness.inclusions.ambient.morphism),
  )

  const details = summarizeChecks(checks)
  const overall =
    laws.overall &&
    leftMorphism.holds &&
    rightMorphism.holds &&
    ambientMorphism.holds &&
    checks.every((check) => check.holds)

  return {
    overall,
    laws,
    morphisms: {
      left: leftMorphism,
      right: rightMorphism,
      ambient: ambientMorphism,
    },
    consistency: {
      checks,
      ...(details ? { details } : {}),
    },
  }
}

export interface CotensorStageOracleReport<M> {
  readonly level: number
  readonly wedge: CoalgebraWedgeOracleReport<M>
  readonly passed: boolean
  readonly details?: string
}

export interface CotensorTowerProgressOracleReport extends CotensorTowerProgress {
  readonly summary: string
  readonly stages: ReadonlyArray<CotensorStageProgress>
}

export interface CotensorTowerOracleReport<O, M> {
  readonly overall: boolean
  readonly stages: ReadonlyArray<CotensorStageOracleReport<M>>
  readonly progress: CotensorTowerProgressOracleReport
}

export const checkCotensorTower = <O, M>(
  comonad: ComonadStructure<O, M> & { readonly category: CategoryWithLimits<O, M> },
  tower: CotensorTower<O, M>,
): CotensorTowerOracleReport<O, M> => {
  const stageReports = tower.stages.map((stage, index) => {
    const left: CoalgebraSubcoalgebra<O, M> =
      index === 0
        ? tower.seed
        : (() => {
            const previousStage = tower.stages[index - 1]
            if (!previousStage) {
              throw new Error(`Cotensor tower stage ${index} is missing its predecessor`)
            }
            return {
              coalgebra: previousStage.witness.wedge,
              inclusion: previousStage.witness.inclusions.ambient,
            }
          })()

    const wedgeReport = checkCoalgebraWedgeProduct(
      comonad,
      tower.ambient,
      left,
      tower.partner,
      stage.witness,
      stage.pullback,
    )

    const discrepancies: string[] = []
    if (stage.level !== index + 1) {
      discrepancies.push(
        `Stage ${index + 1} level mismatch: expected ${index + 1} but received ${stage.level}.`,
      )
    }
    if (!Object.is(stage.coalgebra, stage.witness.wedge)) {
      discrepancies.push(
        `Stage ${index + 1} coalgebra does not match the stored wedge witness.`,
      )
    }
    if (!Object.is(stage.inclusion, stage.witness.inclusions.ambient)) {
      discrepancies.push(
        `Stage ${index + 1} inclusion does not match the wedge's ambient inclusion.`,
      )
    }
    if (!Object.is(stage.inclusion.target, tower.ambient)) {
      discrepancies.push(`Stage ${index + 1} inclusion must target the ambient coalgebra.`)
    }

    const combinedDetails = [
      ...discrepancies,
      ...(wedgeReport.consistency.details ? [wedgeReport.consistency.details] : []),
    ]

    const passed = wedgeReport.overall && discrepancies.length === 0

    return {
      level: stage.level,
      wedge: wedgeReport,
      passed,
      ...(combinedDetails.length > 0 ? { details: combinedDetails.join("\n") } : {}),
    }
  })

  const progress = analyzeCotensorTowerProgress(comonad, tower)

  return {
    overall: stageReports.every((stage) => stage.passed),
    stages: stageReports,
    progress: {
      ...progress,
      summary: summarizeCotensorTowerProgress(progress),
    },
  }
}
