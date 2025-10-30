import type { HopfAlgebraStructure } from "../../operations/coalgebra/coalgebra-interfaces"
import type { ArrowFamilies } from "../../stdlib/arrow-families"
import type { Category } from "../../stdlib/category"
import type { CategoryLimits } from "../../stdlib/category-limits"

export type HopfSymbolicObject = string

export type HopfSymbolicExpression =
  | { readonly kind: "id"; readonly object: HopfSymbolicObject }
  | { readonly kind: "generator"; readonly name: string }
  | { readonly kind: "compose"; readonly left: HopfSymbolicExpression; readonly right: HopfSymbolicExpression }
  | { readonly kind: "tensor"; readonly left: HopfSymbolicExpression; readonly right: HopfSymbolicExpression }

export interface HopfSymbolicMorphism {
  readonly dom: HopfSymbolicObject
  readonly cod: HopfSymbolicObject
  readonly expr: HopfSymbolicExpression
}

export const tensorObject = (
  left: HopfSymbolicObject,
  right: HopfSymbolicObject,
): HopfSymbolicObject => `(${left}⊗${right})`

export const idExpression = (object: HopfSymbolicObject): HopfSymbolicExpression => ({
  kind: "id",
  object,
})

const isIdentityExpression = (
  expr: HopfSymbolicExpression,
): expr is { readonly kind: "id"; readonly object: HopfSymbolicObject } => expr.kind === "id"

export const composeExpressions = (
  left: HopfSymbolicExpression,
  right: HopfSymbolicExpression,
): HopfSymbolicExpression => {
  if (isIdentityExpression(left)) {
    return right
  }
  if (isIdentityExpression(right)) {
    return left
  }
  return { kind: "compose", left, right }
}

export const tensorExpressions = (
  left: HopfSymbolicExpression,
  right: HopfSymbolicExpression,
): HopfSymbolicExpression => {
  if (isIdentityExpression(left) && isIdentityExpression(right)) {
    return idExpression(tensorObject(left.object, right.object))
  }
  return { kind: "tensor", left, right }
}

export const serializeExpression = (expr: HopfSymbolicExpression): string => {
  switch (expr.kind) {
    case "id":
      return `id(${expr.object})`
    case "generator":
      return expr.name
    case "compose":
      return `(${serializeExpression(expr.left)}∘${serializeExpression(expr.right)})`
    case "tensor":
      return `(${serializeExpression(expr.left)}⊗${serializeExpression(expr.right)})`
    default: {
      const _exhaustive: never = expr
      return _exhaustive
    }
  }
}

export const mkMorphism = (
  dom: HopfSymbolicObject,
  cod: HopfSymbolicObject,
  expr: HopfSymbolicExpression,
): HopfSymbolicMorphism => ({ dom, cod, expr })

export const generatorMorphism = (
  name: string,
  dom: HopfSymbolicObject,
  cod: HopfSymbolicObject,
): HopfSymbolicMorphism => mkMorphism(dom, cod, { kind: "generator", name })

export const idMorphism = (object: HopfSymbolicObject): HopfSymbolicMorphism =>
  mkMorphism(object, object, idExpression(object))

export const hopfSymbolicCategory: Category<HopfSymbolicObject, HopfSymbolicMorphism> &
  ArrowFamilies.HasDomCod<HopfSymbolicObject, HopfSymbolicMorphism> = {
  id: idMorphism,
  compose: (g, f) => {
    if (f.cod !== g.dom) {
      throw new Error(
        `Cannot compose ${serializeExpression(g.expr)} after ${serializeExpression(f.expr)}`,
      )
    }
    return mkMorphism(f.dom, g.cod, composeExpressions(g.expr, f.expr))
  },
  dom: (morphism) => morphism.dom,
  cod: (morphism) => morphism.cod,
  equalMor: (left, right) =>
    left.dom === right.dom &&
    left.cod === right.cod &&
    serializeExpression(left.expr) === serializeExpression(right.expr),
}

export const hopfSymbolicTensor: CategoryLimits.TensorProductStructure<HopfSymbolicObject, HopfSymbolicMorphism> = {
  onObjects: tensorObject,
  onMorphisms: (left, right) =>
    mkMorphism(
      tensorObject(left.dom, right.dom),
      tensorObject(left.cod, right.cod),
      tensorExpressions(left.expr, right.expr),
    ),
}

export const H: HopfSymbolicObject = "H"
export const I: HopfSymbolicObject = "I"
export const HH: HopfSymbolicObject = tensorObject(H, H)
export const MIDDLE_SWAP_OBJECT: HopfSymbolicObject = tensorObject(HH, HH)

export interface SymbolicHopfOverrides {
  readonly multiplyLabel?: string
  readonly unitLabel?: string
  readonly copyLabel?: string
  readonly discardLabel?: string
  readonly antipodeLabel?: string
}

export const createSymbolicHopfStructure = (
  overrides: SymbolicHopfOverrides = {},
): HopfAlgebraStructure<HopfSymbolicObject, HopfSymbolicMorphism> => {
  const multiply = generatorMorphism(overrides.multiplyLabel ?? "μ", HH, H)
  const unit = generatorMorphism(overrides.unitLabel ?? "η", I, H)
  const copy = generatorMorphism(overrides.copyLabel ?? "Δ", H, HH)
  const discard = generatorMorphism(overrides.discardLabel ?? "ε", H, I)
  const antipode = generatorMorphism(overrides.antipodeLabel ?? "S", H, H)
  const middleSwap = generatorMorphism("middleSwap", MIDDLE_SWAP_OBJECT, MIDDLE_SWAP_OBJECT)
  return {
    category: hopfSymbolicCategory,
    tensor: hopfSymbolicTensor,
    algebra: { object: H, multiply, unit },
    comonoid: { object: H, copy, discard },
    antipode,
    tensorWitnesses: { middleSwap },
  }
}

export const serializeMorphism = (morphism: HopfSymbolicMorphism): string =>
  serializeExpression(morphism.expr)
