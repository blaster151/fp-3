import type { Category } from "../../stdlib/category"
import type { PullbackData } from "../../pullback"
import { makePullbackFromProductsAndEqualizers } from "../../pullback"
import type { Coalgebra, CoalgebraMorphism, ComonadStructure } from "./coalgebra-interfaces"
import {
  analyzeCoalgebraLaws,
  analyzeCoalgebraMorphism,
  mkCoalgebraMorphism,
} from "./coalgebra-interfaces"
import { ArrowFamilies } from "../../stdlib/arrow-families"
import { CategoryLimits } from "../../stdlib/category-limits"
import type { CoalgebraLawDiagnostics, CoalgebraMorphismWitness } from "./coalgebra-interfaces"

export interface CoalgebraSubcoalgebra<O, M> {
  readonly coalgebra: Coalgebra<O, M>
  readonly inclusion: CoalgebraMorphism<O, M>
}

const assertCoalgebraMatchesInclusion = <O, M>(
  subcoalgebra: CoalgebraSubcoalgebra<O, M>,
  label: string,
): void => {
  if (!Object.is(subcoalgebra.inclusion.source, subcoalgebra.coalgebra)) {
    throw new Error(
      `Coalgebra inclusion for ${label} must reference the supplied subcoalgebra as its source.`,
    )
  }
}

const assertTargetsAmbient = <O, M>(
  ambient: Coalgebra<O, M>,
  subcoalgebra: CoalgebraSubcoalgebra<O, M>,
  label: string,
): void => {
  const { target } = subcoalgebra.inclusion
  if (target.object !== ambient.object || target.coaction !== ambient.coaction) {
    throw new Error(
      `Coalgebra inclusion for ${label} must target the ambient coalgebra.`,
    )
  }
}

export const coalgebraMorphismEquality = <O, M>(category: Category<O, M>) => {
  if (typeof category.equalMor === "function") {
    return (left: M, right: M) => category.equalMor!(left, right)
  }
  if (typeof category.eq === "function") {
    return (left: M, right: M) => category.eq!(left, right)
  }
  return (left: M, right: M) => Object.is(left, right)
}

export interface CoalgebraWedgePullbackWitness<O, M> {
  readonly pullback: PullbackData<O, M>
  readonly toAmbient: M
}

export type CategoryWithLimits<O, M> = Category<O, M> &
  ArrowFamilies.HasDomCod<O, M> &
  CategoryLimits.HasFiniteProducts<O, M> &
  CategoryLimits.HasEqualizers<O, M>

export const computeCoalgebraWedgePullback = <O, M>(
  comonad: ComonadStructure<O, M> & { readonly category: CategoryWithLimits<O, M> },
  ambient: Coalgebra<O, M>,
  left: CoalgebraSubcoalgebra<O, M>,
  right: CoalgebraSubcoalgebra<O, M>,
): CoalgebraWedgePullbackWitness<O, M> => {
  assertCoalgebraMatchesInclusion(left, "left leg")
  assertCoalgebraMatchesInclusion(right, "right leg")
  assertTargetsAmbient(ambient, left, "left leg")
  assertTargetsAmbient(ambient, right, "right leg")

  const witness = makePullbackFromProductsAndEqualizers(
    comonad.category,
    left.inclusion.morphism,
    right.inclusion.morphism,
  )

  const equality = coalgebraMorphismEquality(comonad.category)
  const leftMediator = comonad.category.compose(left.inclusion.morphism, witness.pullback.toDomain)
  const rightMediator = comonad.category.compose(right.inclusion.morphism, witness.pullback.toAnchor)

  if (!equality(leftMediator, rightMediator)) {
    throw new Error(
      "computeCoalgebraWedgePullback: induced mediators to the ambient coalgebra do not agree.",
    )
  }

  return {
    pullback: witness.pullback,
    toAmbient: leftMediator,
  }
}

export interface CoalgebraWedgeProductDiagnostics<M> {
  readonly laws: CoalgebraLawDiagnostics<M>
  readonly inclusions: {
    readonly left: CoalgebraMorphismWitness<M>
    readonly right: CoalgebraMorphismWitness<M>
    readonly ambient: CoalgebraMorphismWitness<M>
  }
}

export interface CoalgebraWedgeProductWitness<O, M> {
  readonly wedge: Coalgebra<O, M>
  readonly inclusions: {
    readonly left: CoalgebraMorphism<O, M>
    readonly right: CoalgebraMorphism<O, M>
    readonly ambient: CoalgebraMorphism<O, M>
  }
  readonly pullback: PullbackData<O, M>
  readonly diagnostics: CoalgebraWedgeProductDiagnostics<M>
}

export interface BuildCoalgebraWedgeProductOptions<M> {
  readonly coaction: M
  readonly enforceLaws?: boolean
  readonly enforceMorphisms?: boolean
}

export const buildCoalgebraWedgeProduct = <O, M>(
  comonad: ComonadStructure<O, M>,
  ambient: Coalgebra<O, M>,
  left: CoalgebraSubcoalgebra<O, M>,
  right: CoalgebraSubcoalgebra<O, M>,
  pullback: CoalgebraWedgePullbackWitness<O, M>,
  options: BuildCoalgebraWedgeProductOptions<M>,
): CoalgebraWedgeProductWitness<O, M> => {
  assertCoalgebraMatchesInclusion(left, "left leg")
  assertCoalgebraMatchesInclusion(right, "right leg")
  assertTargetsAmbient(ambient, left, "left leg")
  assertTargetsAmbient(ambient, right, "right leg")

  const wedge: Coalgebra<O, M> = {
    object: pullback.pullback.apex,
    coaction: options.coaction,
  }

  const inclusionLeft = mkCoalgebraMorphism(wedge, left.coalgebra, pullback.pullback.toDomain)
  const inclusionRight = mkCoalgebraMorphism(wedge, right.coalgebra, pullback.pullback.toAnchor)
  const inclusionAmbient = mkCoalgebraMorphism(wedge, ambient, pullback.toAmbient)

  const laws = analyzeCoalgebraLaws(comonad, wedge)
  const inclusions = {
    left: analyzeCoalgebraMorphism(comonad, inclusionLeft),
    right: analyzeCoalgebraMorphism(comonad, inclusionRight),
    ambient: analyzeCoalgebraMorphism(comonad, inclusionAmbient),
  }

  if ((options.enforceLaws ?? true) && !laws.overall) {
    throw new Error("buildCoalgebraWedgeProduct: supplied coaction does not satisfy the coalgebra laws.")
  }

  if (options.enforceMorphisms ?? true) {
    if (!inclusions.left.holds) {
      throw new Error("buildCoalgebraWedgeProduct: left inclusion fails the coalgebra morphism condition.")
    }
    if (!inclusions.right.holds) {
      throw new Error("buildCoalgebraWedgeProduct: right inclusion fails the coalgebra morphism condition.")
    }
    if (!inclusions.ambient.holds) {
      throw new Error("buildCoalgebraWedgeProduct: ambient inclusion fails the coalgebra morphism condition.")
    }
  }

  return {
    wedge,
    inclusions: {
      left: inclusionLeft,
      right: inclusionRight,
      ambient: inclusionAmbient,
    },
    pullback: pullback.pullback,
    diagnostics: { laws, inclusions },
  }
}
