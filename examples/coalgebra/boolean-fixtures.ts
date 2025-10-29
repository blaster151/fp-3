import { mkCoalgebraMorphism } from "../../operations/coalgebra/coalgebra-interfaces"
import type {
  Coalgebra,
  CoalgebraMorphism,
  ComonadStructure,
} from "../../operations/coalgebra/coalgebra-interfaces"
import type {
  CoalgebraSubcoalgebra,
  CoalgebraWedgeProductWitness,
  CoalgebraWedgePullbackWitness,
  CategoryWithLimits,
  BuildCoalgebraWedgeProductOptions,
} from "../../operations/coalgebra/wedge-product"
import {
  computeCoalgebraWedgePullback,
  buildCoalgebraWedgeProduct,
} from "../../operations/coalgebra/wedge-product"
import type {
  BuildCotensorTowerOptions,
  CotensorTower,
} from "../../operations/coalgebra/cotensor"
import { buildCotensorTower } from "../../operations/coalgebra/cotensor"

export type BooleanObject = "𝟙"

export interface BooleanMorphism {
  readonly name: string
  readonly dom: BooleanObject
  readonly cod: BooleanObject
  readonly apply: (input: boolean) => boolean
}

export type BooleanCoalgebra = Coalgebra<BooleanObject, BooleanMorphism>
export type BooleanCoalgebraMorphism = CoalgebraMorphism<BooleanObject, BooleanMorphism>
export type BooleanSubcoalgebra = CoalgebraSubcoalgebra<BooleanObject, BooleanMorphism>
export type BooleanWedgeWitness = CoalgebraWedgeProductWitness<BooleanObject, BooleanMorphism>
export type BooleanPullbackWitness = CoalgebraWedgePullbackWitness<BooleanObject, BooleanMorphism>
export type BooleanCotensorTower = CotensorTower<BooleanObject, BooleanMorphism>

export const booleanDomain: readonly boolean[] = [false, true]

export const mkBooleanMorphism = (
  name: string,
  apply: (input: boolean) => boolean,
): BooleanMorphism => ({
  name,
  dom: "𝟙",
  cod: "𝟙",
  apply,
})

export const identityMorphism = mkBooleanMorphism("id_𝟙", (input) => input)

export const flippingMorphism = mkBooleanMorphism("flip", (input) => !input)

export const booleanCategoryWithLimits: CategoryWithLimits<BooleanObject, BooleanMorphism> = {
  id: () => identityMorphism,
  compose: (g, f) => mkBooleanMorphism(`${g.name}∘${f.name}`, (input) => g.apply(f.apply(input))),
  dom: (morphism) => morphism.dom,
  cod: (morphism) => morphism.cod,
  equalMor: (left, right) => booleanDomain.every((value) => left.apply(value) === right.apply(value)),
  product: (objects) => ({
    obj: "𝟙",
    projections: objects.map(() => identityMorphism),
  }),
  equalizer: () => ({ obj: "𝟙", equalize: identityMorphism }),
}

export const identityComonad: ComonadStructure<BooleanObject, BooleanMorphism> & {
  readonly category: CategoryWithLimits<BooleanObject, BooleanMorphism>
} = {
  category: booleanCategoryWithLimits,
  endofunctor: {
    onObjects: (object) => object,
    onMorphisms: (morphism) => morphism,
  },
  counit: () => mkBooleanMorphism("ε", (input) => input),
  comultiplication: () => mkBooleanMorphism("δ", (input) => input),
}

export const identityCoalgebra: BooleanCoalgebra = {
  object: "𝟙",
  coaction: identityMorphism,
}

export const identityInclusion: BooleanCoalgebraMorphism = mkCoalgebraMorphism(
  identityCoalgebra,
  identityCoalgebra,
  identityMorphism,
)

export const identitySubcoalgebra: BooleanSubcoalgebra = {
  coalgebra: identityCoalgebra,
  inclusion: identityInclusion,
}

export interface BuildBooleanWedgeOptions
  extends Partial<BuildCoalgebraWedgeProductOptions<BooleanMorphism>> {
  readonly coaction?: BooleanMorphism
}

const withWedgeOptions = (
  options: BuildBooleanWedgeOptions,
): BuildCoalgebraWedgeProductOptions<BooleanMorphism> => ({
  coaction: options.coaction ?? identityMorphism,
  ...(options.enforceLaws === undefined ? {} : { enforceLaws: options.enforceLaws }),
  ...(options.enforceMorphisms === undefined
    ? {}
    : { enforceMorphisms: options.enforceMorphisms }),
})

export const buildBooleanWedge = (
  options: BuildBooleanWedgeOptions = {},
): {
  readonly pullback: BooleanPullbackWitness
  readonly witness: BooleanWedgeWitness
} => {
  const pullback = computeCoalgebraWedgePullback(
    identityComonad,
    identityCoalgebra,
    identitySubcoalgebra,
    identitySubcoalgebra,
  )
  const witness = buildCoalgebraWedgeProduct(
    identityComonad,
    identityCoalgebra,
    identitySubcoalgebra,
    identitySubcoalgebra,
    pullback,
    withWedgeOptions(options),
  )
  return { pullback, witness }
}

export const withMediator = (
  pullback: BooleanPullbackWitness,
  mediator: BooleanMorphism,
): BooleanPullbackWitness => ({
  pullback: { ...pullback.pullback },
  toAmbient: mediator,
})

export interface BuildBooleanCotensorTowerOptions {
  readonly coactionForLevel?: (
    context: {
      readonly level: number
      readonly pullback: BooleanPullbackWitness
      readonly mediator: BooleanMorphism
    },
  ) => BooleanMorphism
  readonly enforceAmbientMorphism?: boolean
}

export const buildBooleanCotensorTower = (
  levels: number,
  options: BuildBooleanCotensorTowerOptions = {},
): BooleanCotensorTower => {
  const coactionForLevel =
    options.coactionForLevel ?? ((context: { readonly mediator: BooleanMorphism }) => context.mediator)

  const towerOptions: BuildCotensorTowerOptions<BooleanObject, BooleanMorphism> = {
    levels,
    wedgeOptions: (context) => ({
      coaction: coactionForLevel(context),
    }),
    ...(options.enforceAmbientMorphism === undefined
      ? {}
      : { enforceAmbientMorphism: options.enforceAmbientMorphism }),
  }

  return buildCotensorTower(
    identityComonad,
    identityCoalgebra,
    identitySubcoalgebra,
    identitySubcoalgebra,
    towerOptions,
  )
}

const formatBoolean = (value: boolean): string => (value ? "true" : "false")

export const describeBooleanMorphism = (morphism: BooleanMorphism): string => {
  const mapping = booleanDomain
    .map((value) => `${formatBoolean(value)}↦${formatBoolean(morphism.apply(value))}`)
    .join(", ")
  return `${morphism.name}: ${morphism.dom} → ${morphism.cod} [${mapping}]`
}

