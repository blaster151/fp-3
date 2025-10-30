import { describe, expect, it } from "vitest"

import {
  analyzeHopfComoduleMorphism,
  analyzeHopfModuleMorphism,
  hopfComoduleInductionFunctorWithWitness,
  hopfComoduleCategory,
  hopfComoduleDomCod,
  hopfModuleRestrictionFunctorWithWitness,
  hopfModuleCategory,
  hopfModuleDomCod,
  induceHopfComoduleAlongMorphism,
  induceHopfComoduleMorphismAlongMorphism,
  mkHopfComodule,
  mkHopfComoduleMorphism,
  mkHopfModule,
  mkHopfModuleMorphism,
  restrictHopfModuleAlongMorphism,
  restrictHopfModuleMorphismAlongMorphism,
  type HopfAlgebraMorphism,
  type HopfAlgebraStructure,
  type HopfComoduleMorphism,
  type HopfModuleMorphism,
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

const isIdentityExpression = (
  expr: Expression,
): expr is { readonly kind: "id"; readonly object: Obj } => expr.kind === "id"

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
  const middleSwap = generatorMorphism("middleSwap", tensorObject(HH, HH), tensorObject(HH, HH))
  return {
    category,
    tensor,
    algebra: { object: H, multiply, unit },
    comonoid: { object: H, copy, discard },
    antipode,
    tensorWitnesses: { middleSwap },
  }
}

describe("analyzeHopfModuleMorphism", () => {
  it("confirms the identity morphism preserves the action", () => {
    const hopf = createSymbolicHopf()
    const moduleObject = "M"
    const HM = tensorObject(H, moduleObject)
    const module = mkHopfModule(moduleObject, generatorMorphism("α", HM, moduleObject))
    const morphism: HopfModuleMorphism<Obj, Morphism> = mkHopfModuleMorphism(
      module,
      module,
      category.id(moduleObject),
    )
    const diagnostics = analyzeHopfModuleMorphism(hopf, morphism)
    expect(diagnostics.holds).toBe(true)
    expect(serializeExpression(diagnostics.left.expr)).toBe(serializeExpression(diagnostics.right.expr))
  })

  it("detects when the target action differs", () => {
    const hopf = createSymbolicHopf()
    const moduleObject = "M"
    const HM = tensorObject(H, moduleObject)
    const source = mkHopfModule(moduleObject, generatorMorphism("α", HM, moduleObject))
    const target = mkHopfModule(moduleObject, generatorMorphism("α'", HM, moduleObject))
    const morphism: HopfModuleMorphism<Obj, Morphism> = mkHopfModuleMorphism(
      source,
      target,
      category.id(moduleObject),
    )
    const diagnostics = analyzeHopfModuleMorphism(hopf, morphism)
    expect(diagnostics.holds).toBe(false)
    expect(serializeExpression(diagnostics.left.expr)).not.toBe(
      serializeExpression(diagnostics.right.expr),
    )
  })
})

describe("hopfModuleCategory", () => {
  it("composes module morphisms when carriers align", () => {
    const hopf = createSymbolicHopf()
    const M = mkHopfModule("M", generatorMorphism("α", tensorObject(H, "M"), "M"))
    const N = mkHopfModule("N", generatorMorphism("β", tensorObject(H, "N"), "N"))
    const P = mkHopfModule("P", generatorMorphism("γ", tensorObject(H, "P"), "P"))

    const f: HopfModuleMorphism<Obj, Morphism> = mkHopfModuleMorphism(
      M,
      N,
      generatorMorphism("f", "M", "N"),
    )
    const g: HopfModuleMorphism<Obj, Morphism> = mkHopfModuleMorphism(
      N,
      P,
      generatorMorphism("g", "N", "P"),
    )

    const moduleCategory = hopfModuleCategory(hopf)
    const composite = moduleCategory.compose(g, f)
    expect(composite.source).toBe(M)
    expect(composite.target).toBe(P)
    expect(serializeExpression(composite.morphism.expr)).toBe("(g∘f)")

    const domCod = hopfModuleDomCod<Obj, Morphism>()
    expect(domCod.dom(composite)).toBe(M)
    expect(domCod.cod(composite)).toBe(P)
  })

  it("throws when attempting to compose incompatible module morphisms", () => {
    const hopf = createSymbolicHopf()
    const M = mkHopfModule("M", generatorMorphism("α", tensorObject(H, "M"), "M"))
    const N = mkHopfModule("N", generatorMorphism("β", tensorObject(H, "N"), "N"))
    const P = mkHopfModule("P", generatorMorphism("γ", tensorObject(H, "P"), "P"))

    const f: HopfModuleMorphism<Obj, Morphism> = mkHopfModuleMorphism(
      M,
      N,
      generatorMorphism("f", "M", "N"),
    )
    const g: HopfModuleMorphism<Obj, Morphism> = mkHopfModuleMorphism(
      P,
      M,
      generatorMorphism("g", "P", "M"),
    )

    const compose = hopfModuleCategory(hopf).compose
    expect(() => compose(g, f)).toThrow(/target\/source objects do not align/)
  })
})

describe("restrictHopfModuleAlongMorphism", () => {
  it("precomposes the module action with the Hopf morphism arrow", () => {
    const hopf = createSymbolicHopf()
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain: hopf,
      codomain: hopf,
      arrow: generatorMorphism("φ", H, H),
    }
    const module = mkHopfModule(
      "M",
      generatorMorphism("α", tensorObject(H, "M"), "M"),
    )

    const restricted = restrictHopfModuleAlongMorphism(morphism, module)
    expect(serializeExpression(restricted.action.expr)).toBe("(α∘(φ⊗id(M)))")
  })

  it("throws when the Hopf morphism lacks shared monoidal data", () => {
    const hopf = createSymbolicHopf()
    const mismatched: HopfAlgebraStructure<Obj, Morphism> = {
      ...hopf,
      tensorWitnesses: {
        middleSwap: generatorMorphism("middleSwap'", tensorObject(HH, HH), tensorObject(HH, HH)),
      },
    }
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain: hopf,
      codomain: mismatched,
      arrow: category.id(H),
    }
    const module = mkHopfModule(
      "M",
      generatorMorphism("α", tensorObject(H, "M"), "M"),
    )

    expect(() => restrictHopfModuleAlongMorphism(morphism, module)).toThrow(/monoidal data mismatch/i)
  })
})

describe("hopfModuleRestrictionFunctorWithWitness", () => {
  it("restricts modules and morphisms while satisfying the functor laws", () => {
    const hopf = createSymbolicHopf()
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain: hopf,
      codomain: hopf,
      arrow: generatorMorphism("φ", H, H),
    }
    const M = mkHopfModule("M", generatorMorphism("α", tensorObject(H, "M"), "M"))
    const N = mkHopfModule("N", generatorMorphism("β", tensorObject(H, "N"), "N"))
    const P = mkHopfModule("P", generatorMorphism("γ", tensorObject(H, "P"), "P"))

    const f: HopfModuleMorphism<Obj, Morphism> = mkHopfModuleMorphism(
      M,
      N,
      generatorMorphism("f", "M", "N"),
    )
    const g: HopfModuleMorphism<Obj, Morphism> = mkHopfModuleMorphism(
      N,
      P,
      generatorMorphism("g", "N", "P"),
    )

    const restriction = hopfModuleRestrictionFunctorWithWitness(morphism, {
      objects: [M, N, P],
      arrows: [f, g],
      composablePairs: [{ f, g }],
    })

    const imageM = restriction.functor.F0(M)
    const imageN = restriction.functor.F0(N)
    expect(serializeExpression(imageM.action.expr)).toBe("(α∘(φ⊗id(M)))")
    expect(serializeExpression(imageN.action.expr)).toBe("(β∘(φ⊗id(N)))")

    const imageF = restriction.functor.F1(f)
    expect(serializeExpression(imageF.source.action.expr)).toBe("(α∘(φ⊗id(M)))")
    expect(serializeExpression(imageF.target.action.expr)).toBe("(β∘(φ⊗id(N)))")
    expect(serializeExpression(imageF.morphism.expr)).toBe("f")

    const imageG = restriction.functor.F1(g)
    expect(serializeExpression(imageG.source.action.expr)).toBe("(β∘(φ⊗id(N)))")
    expect(serializeExpression(imageG.target.action.expr)).toBe("(γ∘(φ⊗id(P)))")
    expect(serializeExpression(imageG.morphism.expr)).toBe("g")

    expect(restriction.report.holds).toBe(true)
    expect(restriction.metadata).toBeDefined()
    expect(restriction.metadata).toContain(
      "Restricts Hopf modules along the morphism by precomposing scalar actions.",
    )
  })
})

describe("analyzeHopfComoduleMorphism", () => {
  it("confirms the identity morphism preserves the coaction", () => {
    const hopf = createSymbolicHopf()
    const moduleObject = "M"
    const HM = tensorObject(H, moduleObject)
    const comodule = mkHopfComodule(moduleObject, generatorMorphism("δ", moduleObject, HM))
    const morphism: HopfComoduleMorphism<Obj, Morphism> = mkHopfComoduleMorphism(
      comodule,
      comodule,
      category.id(moduleObject),
    )
    const diagnostics = analyzeHopfComoduleMorphism(hopf, morphism)
    expect(diagnostics.holds).toBe(true)
    expect(serializeExpression(diagnostics.left.expr)).toBe(serializeExpression(diagnostics.right.expr))
  })

  it("detects when the target coaction differs", () => {
    const hopf = createSymbolicHopf()
    const moduleObject = "M"
    const HM = tensorObject(H, moduleObject)
    const source = mkHopfComodule(moduleObject, generatorMorphism("δ", moduleObject, HM))
    const target = mkHopfComodule(moduleObject, generatorMorphism("δ'", moduleObject, HM))
    const morphism: HopfComoduleMorphism<Obj, Morphism> = mkHopfComoduleMorphism(
      source,
      target,
      category.id(moduleObject),
    )
    const diagnostics = analyzeHopfComoduleMorphism(hopf, morphism)
    expect(diagnostics.holds).toBe(false)
    expect(serializeExpression(diagnostics.left.expr)).not.toBe(
      serializeExpression(diagnostics.right.expr),
    )
  })
})

describe("hopfComoduleCategory", () => {
  it("composes comodule morphisms when carriers align", () => {
    const hopf = createSymbolicHopf()
    const M = mkHopfComodule("M", generatorMorphism("δ", "M", tensorObject(H, "M")))
    const N = mkHopfComodule("N", generatorMorphism("ε", "N", tensorObject(H, "N")))
    const P = mkHopfComodule("P", generatorMorphism("ζ", "P", tensorObject(H, "P")))

    const f: HopfComoduleMorphism<Obj, Morphism> = mkHopfComoduleMorphism(
      M,
      N,
      generatorMorphism("f", "M", "N"),
    )
    const g: HopfComoduleMorphism<Obj, Morphism> = mkHopfComoduleMorphism(
      N,
      P,
      generatorMorphism("g", "N", "P"),
    )

    const comoduleCategory = hopfComoduleCategory(hopf)
    const composite = comoduleCategory.compose(g, f)
    expect(composite.source).toBe(M)
    expect(composite.target).toBe(P)
    expect(serializeExpression(composite.morphism.expr)).toBe("(g∘f)")

    const domCod = hopfComoduleDomCod<Obj, Morphism>()
    expect(domCod.dom(composite)).toBe(M)
    expect(domCod.cod(composite)).toBe(P)
  })

  it("throws when attempting to compose incompatible comodule morphisms", () => {
    const hopf = createSymbolicHopf()
    const M = mkHopfComodule("M", generatorMorphism("δ", "M", tensorObject(H, "M")))
    const N = mkHopfComodule("N", generatorMorphism("ε", "N", tensorObject(H, "N")))
    const P = mkHopfComodule("P", generatorMorphism("ζ", "P", tensorObject(H, "P")))

    const f: HopfComoduleMorphism<Obj, Morphism> = mkHopfComoduleMorphism(
      M,
      N,
      generatorMorphism("f", "M", "N"),
    )
    const g: HopfComoduleMorphism<Obj, Morphism> = mkHopfComoduleMorphism(
      P,
      M,
      generatorMorphism("g", "P", "M"),
    )

    const compose = hopfComoduleCategory(hopf).compose
    expect(() => compose(g, f)).toThrow(/target\/source objects do not align/)
  })
})

describe("induceHopfComoduleAlongMorphism", () => {
  it("postcomposes the coaction with the Hopf morphism arrow", () => {
    const hopf = createSymbolicHopf()
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain: hopf,
      codomain: hopf,
      arrow: generatorMorphism("φ", H, H),
    }
    const comodule = mkHopfComodule("M", generatorMorphism("ρ", "M", tensorObject(H, "M")))

    const induced = induceHopfComoduleAlongMorphism(morphism, comodule)
    expect(serializeExpression(induced.coaction.expr)).toBe("((φ⊗id(M))∘ρ)")
  })

  it("throws when the monoidal data differ", () => {
    const hopf = createSymbolicHopf()
    const mismatched: HopfAlgebraStructure<Obj, Morphism> = {
      ...hopf,
      tensorWitnesses: {
        middleSwap: generatorMorphism("middleSwap'", tensorObject(HH, HH), tensorObject(HH, HH)),
      },
    }
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain: hopf,
      codomain: mismatched,
      arrow: category.id(H),
    }
    const comodule = mkHopfComodule("M", generatorMorphism("ρ", "M", tensorObject(H, "M")))

    expect(() => induceHopfComoduleAlongMorphism(morphism, comodule)).toThrow(/monoidal data mismatch/i)
  })
})

describe("hopfComoduleInductionFunctorWithWitness", () => {
  it("induces comodules and morphisms while satisfying the functor laws", () => {
    const hopf = createSymbolicHopf()
    const morphism: HopfAlgebraMorphism<Obj, Morphism> = {
      domain: hopf,
      codomain: hopf,
      arrow: generatorMorphism("φ", H, H),
    }
    const M = mkHopfComodule("M", generatorMorphism("ρ", "M", tensorObject(H, "M")))
    const N = mkHopfComodule("N", generatorMorphism("σ", "N", tensorObject(H, "N")))
    const P = mkHopfComodule("P", generatorMorphism("τ", "P", tensorObject(H, "P")))

    const f: HopfComoduleMorphism<Obj, Morphism> = mkHopfComoduleMorphism(
      M,
      N,
      generatorMorphism("f", "M", "N"),
    )
    const g: HopfComoduleMorphism<Obj, Morphism> = mkHopfComoduleMorphism(
      N,
      P,
      generatorMorphism("g", "N", "P"),
    )

    const induction = hopfComoduleInductionFunctorWithWitness(morphism, {
      objects: [M, N, P],
      arrows: [f, g],
      composablePairs: [{ f, g }],
    })

    const imageM = induction.functor.F0(M)
    const imageN = induction.functor.F0(N)
    expect(serializeExpression(imageM.coaction.expr)).toBe("((φ⊗id(M))∘ρ)")
    expect(serializeExpression(imageN.coaction.expr)).toBe("((φ⊗id(N))∘σ)")

    const imageF = induction.functor.F1(f)
    expect(serializeExpression(imageF.source.coaction.expr)).toBe("((φ⊗id(M))∘ρ)")
    expect(serializeExpression(imageF.target.coaction.expr)).toBe("((φ⊗id(N))∘σ)")
    expect(serializeExpression(imageF.morphism.expr)).toBe("f")

    const imageG = induction.functor.F1(g)
    expect(serializeExpression(imageG.source.coaction.expr)).toBe("((φ⊗id(N))∘σ)")
    expect(serializeExpression(imageG.target.coaction.expr)).toBe("((φ⊗id(P))∘τ)")
    expect(serializeExpression(imageG.morphism.expr)).toBe("g")

    expect(induction.report.holds).toBe(true)
    expect(induction.metadata).toBeDefined()
    expect(induction.metadata).toContain(
      "Induces Hopf comodules along the morphism by postcomposing coactions with the scalar map.",
    )
  })
})
