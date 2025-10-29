import type { Coalgebra, CoalgebraMorphism, ComonadStructure } from "./coalgebra-interfaces"
import { analyzeCoalgebraMorphism } from "./coalgebra-interfaces"
import type {
  BuildCoalgebraWedgeProductOptions,
  CoalgebraSubcoalgebra,
  CoalgebraWedgeProductDiagnostics,
  CoalgebraWedgePullbackWitness,
  CategoryWithLimits,
  CoalgebraWedgeProductWitness,
} from "./wedge-product"
import {
  buildCoalgebraWedgeProduct,
  coalgebraMorphismEquality,
  computeCoalgebraWedgePullback,
} from "./wedge-product"

export interface CotensorStage<O, M> {
  readonly level: number
  readonly coalgebra: Coalgebra<O, M>
  readonly inclusion: CoalgebraMorphism<O, M>
  readonly diagnostics: CoalgebraWedgeProductDiagnostics<M>
  readonly pullback: CoalgebraWedgePullbackWitness<O, M>
  readonly witness: CoalgebraWedgeProductWitness<O, M>
}

export interface CotensorTower<O, M> {
  readonly ambient: Coalgebra<O, M>
  readonly seed: CoalgebraSubcoalgebra<O, M>
  readonly partner: CoalgebraSubcoalgebra<O, M>
  readonly stages: ReadonlyArray<CotensorStage<O, M>>
}

export interface CotensorStageProgress {
  readonly level: number
  readonly matchesSeed: boolean
  readonly matchesPrevious?: boolean
  readonly stabilized: boolean
  readonly stabilizationReason?: "seed" | "previous"
}

export interface CotensorTowerProgress {
  readonly stabilized: boolean
  readonly stabilizedAt?: number
  readonly stages: ReadonlyArray<CotensorStageProgress>
}

export const summarizeCotensorTowerProgress = (
  progress: CotensorTowerProgress,
): string => {
  if (progress.stages.length === 0) {
    return "Cotensor tower has no stages to analyze."
  }

  if (!progress.stabilized) {
    const stageCount = progress.stages.length
    const plural = stageCount === 1 ? "stage" : "stages"
    return `Cotensor tower did not stabilize after ${stageCount} ${plural}.`
  }

  const stabilizedStage = progress.stages.find((stage) => stage.stabilized)

  if (!stabilizedStage) {
    return "Cotensor tower stabilization status is inconsistent: flagged as stabilized but no stage reports stabilization."
  }

  if (stabilizedStage.stabilizationReason === "seed") {
    return `Cotensor tower stabilized at level ${stabilizedStage.level} by matching the seed coalgebra.`
  }

  if (stabilizedStage.stabilizationReason === "previous") {
    const previousLevel = stabilizedStage.level - 1
    return `Cotensor tower stabilized at level ${stabilizedStage.level} by repeating the data from level ${previousLevel}.`
  }

  return `Cotensor tower stabilized at level ${stabilizedStage.level}.`
}

export interface BuildCotensorTowerOptions<O, M> {
  readonly levels: number
  readonly wedgeOptions: (
    context: {
      readonly level: number
      readonly pullback: CoalgebraWedgePullbackWitness<O, M>
      readonly mediator: M
    },
  ) => BuildCoalgebraWedgeProductOptions<M>
  readonly enforceAmbientMorphism?: boolean
}

export const buildCotensorTower = <O, M>(
  comonad: ComonadStructure<O, M> & { readonly category: CategoryWithLimits<O, M> },
  ambient: Coalgebra<O, M>,
  seed: CoalgebraSubcoalgebra<O, M>,
  partner: CoalgebraSubcoalgebra<O, M>,
  options: BuildCotensorTowerOptions<O, M>,
): CotensorTower<O, M> => {
  const stages: CotensorStage<O, M>[] = []
  let current: CoalgebraSubcoalgebra<O, M> = seed

  for (let level = 0; level < options.levels; level += 1) {
    const pullback = computeCoalgebraWedgePullback(comonad, ambient, current, partner)
    const wedgeOptions = options.wedgeOptions({ level, pullback, mediator: pullback.toAmbient })
    const wedge = buildCoalgebraWedgeProduct(
      comonad,
      ambient,
      current,
      partner,
      pullback,
      wedgeOptions,
    )

    const inclusionWitness = analyzeCoalgebraMorphism(comonad, wedge.inclusions.ambient)
    if ((options.enforceAmbientMorphism ?? true) && !inclusionWitness.holds) {
      throw new Error(
        `buildCotensorTower: ambient inclusion at level ${level} is not a coalgebra morphism.`,
      )
    }

    stages.push({
      level: level + 1,
      coalgebra: wedge.wedge,
      inclusion: wedge.inclusions.ambient,
      diagnostics: wedge.diagnostics,
      pullback,
      witness: wedge,
    })

    current = {
      coalgebra: wedge.wedge,
      inclusion: wedge.inclusions.ambient,
    }
  }

  return { ambient, seed, partner, stages }
}

export const analyzeCotensorTowerProgress = <O, M>(
  comonad: ComonadStructure<O, M> & { readonly category: CategoryWithLimits<O, M> },
  tower: CotensorTower<O, M>,
): CotensorTowerProgress => {
  const equality = coalgebraMorphismEquality(comonad.category)

  const stageProgress = tower.stages.map((stage, index) => {
    const matchesSeed = equality(stage.inclusion.morphism, tower.seed.inclusion.morphism)
    const sameCarrierAsSeed = Object.is(stage.coalgebra.object, tower.seed.coalgebra.object)
    const sameCoactionAsSeed = equality(stage.coalgebra.coaction, tower.seed.coalgebra.coaction)

    if (index === 0) {
      const stabilized = matchesSeed && sameCarrierAsSeed && sameCoactionAsSeed
      return {
        level: stage.level,
        matchesSeed,
        stabilized,
        ...(stabilized ? { stabilizationReason: "seed" as const } : {}),
      }
    }

    const previous = tower.stages[index - 1]
    const matchesPrevious = equality(stage.inclusion.morphism, previous.inclusion.morphism)
    const sameCarrierAsPrevious = Object.is(stage.coalgebra.object, previous.coalgebra.object)
    const sameCoactionAsPrevious = equality(stage.coalgebra.coaction, previous.coalgebra.coaction)

    const stabilized = matchesPrevious && sameCarrierAsPrevious && sameCoactionAsPrevious

    return {
      level: stage.level,
      matchesSeed,
      matchesPrevious,
      stabilized,
      ...(stabilized ? { stabilizationReason: "previous" as const } : {}),
    }
  })

  const stabilizedStage = stageProgress.find((stage) => stage.stabilized)

  return {
    stabilized: stabilizedStage !== undefined,
    stabilizedAt: stabilizedStage?.level,
    stages: stageProgress,
  }
}
