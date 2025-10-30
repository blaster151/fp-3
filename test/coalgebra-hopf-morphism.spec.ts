import { describe, expect, it } from "vitest"

import {
  analyzeHopfAlgebraMorphism,
  type HopfAlgebraMorphism,
  type HopfAlgebraStructure,
} from "../operations/coalgebra/coalgebra-interfaces"
import type { ArrowFamilies } from "../stdlib/arrow-families"
import type { Category } from "../stdlib/category"
import type { CategoryLimits } from "../stdlib/category-limits"

type Obj = string

interface Morphism {
  readonly dom: Obj
  readonly cod: Obj
  readonly expr: Expression
}

type Expression =
  | { readonly kind: "id"; readonly object: Obj }
  | { readonly kind: "generator"; readonly name: string }
  | { readonly kind: "compose"; readonly left: Expression; readonly right: Expression }
  | { readonly kind: "tensor"; readonly left: Expression; readonly right: Expression }

const tensorObject = (left: Obj, right: Obj): Obj => `(${left}⊗${right})`

const idExpression = (object: Obj): Expression => ({ kind: "id", object })

const isIdentityExpression = (expr: Expression): expr is { readonly kind: "id"; readonly object: Obj } =>
  expr.kind === "id"

const composeExpressions = (left: Expression, right: Expression): Expression => {
  if (isIdentityExpression(left)) {
    return right
  }
  if (isIdentityExpression(right)) {
    return left
  }
  return { kind: "compose", left, right }
}

const tensorExpressions = (left: Expression, right: Expression): Expression => {
  if (isIdentityExpression(left) && isIdentityExpression(right)) {
    return idExpression(tensorObject(left.object, right.object))
  }
  return { kind: "tensor", left, right }
}

const serializeExpression = (expr: Expression): string => {
  switch (expr.kind) {
    case "id":
      return `id(${expr.object})`
    case "generator":
      return expr.name
    case "compose":
      return `(${serializeExpression(expr.left)}∘${serializeExpression(expr.right)})`
    case "tensor":
      return `(${serializeExpression(expr.left)}⊗${serializeExpression(expr.right)})`
  }
}

const mkMorphism = (dom: Obj, cod: Obj, expr: Expression): Morphism => ({ dom, cod, expr })

const generatorMorphism = (name: string, dom: Obj, cod: Obj): Morphism =>
  mkMorphism(dom, cod, { kind: "generator", name })

const idMorphism = (object: Obj): Morphism => mkMorphism(object, object, idExpression(object))

const category: Category<Obj, Morphism> & ArrowFamilies.HasDomCod<Obj, Morphism> = {
  id: idMorphism,
  compose: (g, f) => {
    if (f.cod !== g.dom) {
      throw new Error(`Cannot compose ${serializeExpression(g.expr)} after ${serializeExpression(f.expr)}`)
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

const tensor: CategoryLimits.TensorProductStructure<Obj, Morphism> = {
  onObjects: tensorObject,
  onMorphisms: (left, right) =>
    mkMorphism(
      tensorObject(left.dom, right.dom),
      tensorObject(left.cod, right.cod),
      tensorExpressions(left.expr, right.expr),
    ),
}

const H = "H"
const I = "I"
const HH = tensorObject(H, H)
const MIDDLE_SWAP_OBJECT = tensorObject(HH, HH)

interface SymbolicHopfOverrides {
  readonly multiplyLabel?: string
  readonly unitLabel?: string
  readonly copyLabel?: string
  readonly discardLabel?: string
  readonly antipodeLabel?: string
}

const createSymbolicHopf = (
  overrides: SymbolicHopfOverrides = {},
): HopfAlgebraStructure<Obj, Morphism> => {
  const multiply = generatorMorphism(overrides.multiplyLabel ?? "μ", HH, H)
  const unit = generatorMorphism(overrides.unitLabel ?? "η", I, H)
  const copy = generatorMorphism(overrides.copyLabel ?? "Δ", H, HH)
  const discard = generatorMorphism(overrides.discardLabel ?? "ε", H, I)
  const antipode = generatorMorphism(overrides.antipodeLabel ?? "S", H, H)
  const middleSwap = generatorMorphism("middleSwap", MIDDLE_SWAP_OBJECT, MIDDLE_SWAP_OBJECT)
  return {
    category,
    tensor,
    algebra: { object: H, multiply, unit },
    comonoid: { object: H, copy, discard },
    antipode,
    tensorWitnesses: { middleSwap },
  }
}

describe("analyzeHopfAlgebraMorphism", () => {
  it("confirms the identity is a Hopf algebra morphism", () => {
    const hopf = createSymbolicHopf()
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain: hopf,
      codomain: hopf,
      arrow: category.id(H),
    }
    const diagnostics = analyzeHopfAlgebraMorphism(morphism)
    expect(diagnostics.algebra.multiplication.holds).toBe(true)
    expect(diagnostics.algebra.unit.holds).toBe(true)
    expect(diagnostics.comonoid.copy.holds).toBe(true)
    expect(diagnostics.comonoid.discard.holds).toBe(true)
    expect(diagnostics.antipode.holds).toBe(true)
    expect(diagnostics.overall).toBe(true)
  })

  it("detects when multiplication preservation fails", () => {
    const domain = createSymbolicHopf()
    const codomain = createSymbolicHopf({ multiplyLabel: "μ'" })
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain,
      codomain,
      arrow: category.id(H),
    }
    const diagnostics = analyzeHopfAlgebraMorphism(morphism)
    expect(diagnostics.algebra.multiplication.holds).toBe(false)
    expect(diagnostics.algebra.unit.holds).toBe(true)
    expect(diagnostics.comonoid.copy.holds).toBe(true)
    expect(diagnostics.comonoid.discard.holds).toBe(true)
    expect(diagnostics.antipode.holds).toBe(true)
    expect(diagnostics.overall).toBe(false)
  })

  it("flags comonoid preservation issues", () => {
    const domain = createSymbolicHopf()
    const codomain = createSymbolicHopf({ copyLabel: "Δ'" })
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain,
      codomain,
      arrow: category.id(H),
    }
    const diagnostics = analyzeHopfAlgebraMorphism(morphism)
    expect(diagnostics.algebra.multiplication.holds).toBe(true)
    expect(diagnostics.algebra.unit.holds).toBe(true)
    expect(diagnostics.comonoid.copy.holds).toBe(false)
    expect(diagnostics.comonoid.discard.holds).toBe(true)
    expect(diagnostics.antipode.holds).toBe(true)
    expect(diagnostics.overall).toBe(false)
  })

  it("identifies antipode mismatches", () => {
    const domain = createSymbolicHopf()
    const codomain = createSymbolicHopf({ antipodeLabel: "S'" })
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain,
      codomain,
      arrow: category.id(H),
    }
    const diagnostics = analyzeHopfAlgebraMorphism(morphism)
    expect(diagnostics.algebra.multiplication.holds).toBe(true)
    expect(diagnostics.algebra.unit.holds).toBe(true)
    expect(diagnostics.comonoid.copy.holds).toBe(true)
    expect(diagnostics.comonoid.discard.holds).toBe(true)
    expect(diagnostics.antipode.holds).toBe(false)
    expect(diagnostics.overall).toBe(false)
  })

  it("rejects arrows that do not preserve Hopf structure", () => {
    const hopf = createSymbolicHopf()
    const nonPreserving = generatorMorphism("φ", H, H)
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain: hopf,
      codomain: hopf,
      arrow: nonPreserving,
    }
    const diagnostics = analyzeHopfAlgebraMorphism(morphism)
    expect(diagnostics.algebra.multiplication.holds).toBe(false)
    expect(diagnostics.algebra.unit.holds).toBe(false)
    expect(diagnostics.comonoid.copy.holds).toBe(false)
    expect(diagnostics.comonoid.discard.holds).toBe(false)
    expect(diagnostics.antipode.holds).toBe(false)
    expect(diagnostics.overall).toBe(false)
  })
})
