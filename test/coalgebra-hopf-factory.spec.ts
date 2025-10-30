import { describe, expect, it } from "vitest"
import {
  buildHopfAlgebraStructure,
  type HopfAlgebraFactoryInput,
} from "../operations/coalgebra/coalgebra-interfaces"
import {
  buildGroupAlgebraHopfOperations,
  type GroupAlgebraElement,
} from "../operations/coalgebra/group-algebra-hopf"
import type { Category } from "../stdlib/category"
import type { ArrowFamilies } from "../stdlib/arrow-families"
import type { CategoryLimits } from "../stdlib/category-limits"

interface GroupHopfObject {
  readonly power: number
  readonly label: string
}

const objectCache = new Map<number, GroupHopfObject>()

const objectByPower = (power: number): GroupHopfObject => {
  const cached = objectCache.get(power)
  if (cached) {
    return cached
  }
  const label = power === 0 ? "I" : power === 1 ? "H" : `H^${power}`
  const object: GroupHopfObject = { power, label }
  objectCache.set(power, object)
  return object
}

const tensorObject = (left: GroupHopfObject, right: GroupHopfObject): GroupHopfObject =>
  objectByPower(left.power + right.power)

type Expression =
  | { readonly kind: "id"; readonly power: number }
  | { readonly kind: "symbol"; readonly name: string }
  | { readonly kind: "compose"; readonly left: Expression; readonly right: Expression }
  | { readonly kind: "tensor"; readonly left: Expression; readonly right: Expression }
  | { readonly kind: "middleSwap" }

const idExpression = (object: GroupHopfObject): Expression => ({ kind: "id", power: object.power })

const symbolExpression = (name: string): Expression => ({ kind: "symbol", name })

const composeExpression = (left: Expression, right: Expression): Expression => ({
  kind: "compose",
  left,
  right,
})

const tensorExpression = (left: Expression, right: Expression): Expression => ({
  kind: "tensor",
  left,
  right,
})

interface GroupHopfMorphism {
  readonly label: string
  readonly dom: GroupHopfObject
  readonly cod: GroupHopfObject
  readonly expr: Expression
}

const mkMorphism = (
  label: string,
  dom: GroupHopfObject,
  cod: GroupHopfObject,
  expr: Expression,
): GroupHopfMorphism => ({ label, dom, cod, expr })

const isSymbol = (expr: Expression, name: string): boolean => expr.kind === "symbol" && expr.name === name

const isTensorOfSymbols = (expr: Expression, left: string, right: string): boolean =>
  expr.kind === "tensor" && isSymbol(expr.left, left) && isSymbol(expr.right, right)

const normalize = (expr: Expression): string => {
  switch (expr.kind) {
    case "id":
      return `id^${expr.power}`
    case "symbol":
      return expr.name
    case "middleSwap":
      return "middleSwap"
    case "tensor": {
      if (isTensorOfSymbols(expr, "η", "η")) {
        return "delta-after-eta"
      }
      if (isTensorOfSymbols(expr, "ε", "ε")) {
        return "epsilon-after-mu"
      }
      if (isTensorOfSymbols(expr, "μ", "μ")) {
        return "μ⊗μ"
      }
      if (isTensorOfSymbols(expr, "Δ", "Δ")) {
        return "Δ⊗Δ"
      }
      return `${normalize(expr.left)}⊗${normalize(expr.right)}`
    }
    case "compose": {
      if (isSymbol(expr.left, "Δ") && isSymbol(expr.right, "μ")) {
        return "delta-after-mu"
      }
      if (
        expr.left.kind === "tensor" &&
        isTensorOfSymbols(expr.left, "μ", "μ") &&
        expr.right.kind === "compose" &&
        expr.right.left.kind === "middleSwap" &&
        expr.right.right.kind === "tensor" &&
        isTensorOfSymbols(expr.right.right, "Δ", "Δ")
      ) {
        return "delta-after-mu"
      }
      if (isSymbol(expr.left, "Δ") && isSymbol(expr.right, "η")) {
        return "delta-after-eta"
      }
      if (isSymbol(expr.left, "ε") && isSymbol(expr.right, "μ")) {
        return "epsilon-after-mu"
      }
      return `${normalize(expr.left)}∘${normalize(expr.right)}`
    }
    default: {
      const _exhaustive: never = expr
      return _exhaustive
    }
  }
}

const hopfCategory: Category<GroupHopfObject, GroupHopfMorphism> &
  ArrowFamilies.HasDomCod<GroupHopfObject, GroupHopfMorphism> = {
    id: (object) => mkMorphism(`id_${object.label}`, object, object, idExpression(object)),
    compose: (g, f) => {
      if (f.cod.power !== g.dom.power) {
        throw new Error(
          `compose(${g.label}, ${f.label}) has incompatible boundary objects: ${f.cod.label} → ${g.dom.label}`,
        )
      }
      return mkMorphism(`${g.label}∘${f.label}`, f.dom, g.cod, composeExpression(g.expr, f.expr))
    },
    dom: (morphism) => morphism.dom,
    cod: (morphism) => morphism.cod,
    equalMor: (left, right) =>
      left.dom.power === right.dom.power &&
      left.cod.power === right.cod.power &&
      normalize(left.expr) === normalize(right.expr),
  }

const hopfTensor: CategoryLimits.TensorProductStructure<GroupHopfObject, GroupHopfMorphism> = {
  onObjects: tensorObject,
  onMorphisms: (left, right) =>
    mkMorphism(
      `${left.label}⊗${right.label}`,
      tensorObject(left.dom, right.dom),
      tensorObject(left.cod, right.cod),
      tensorExpression(left.expr, right.expr),
    ),
}

const hopfObject = objectByPower(1)
const tensorObject2 = objectByPower(2)
const tensorObject4 = objectByPower(4)
const unitObject = objectByPower(0)

const multiply = mkMorphism("μ_QC2", tensorObject2, hopfObject, symbolExpression("μ"))
const unit = mkMorphism("η_QC2", unitObject, hopfObject, symbolExpression("η"))
const copy = mkMorphism("Δ_QC2", hopfObject, tensorObject2, symbolExpression("Δ"))
const discard = mkMorphism("ε_QC2", hopfObject, unitObject, symbolExpression("ε"))
const antipode = mkMorphism("S_QC2", hopfObject, hopfObject, symbolExpression("S"))

const middleSwap = mkMorphism("middle-swap", tensorObject4, tensorObject4, { kind: "middleSwap" })

const qc2HopfInput: HopfAlgebraFactoryInput<GroupHopfObject, GroupHopfMorphism> = {
  category: hopfCategory,
  tensor: hopfTensor,
  algebra: {
    object: hopfObject,
    multiply,
    unit,
  },
  comonoid: {
    object: hopfObject,
    copy,
    discard,
  },
  tensorWitnesses: {
    middleSwap,
  },
  antipode,
}

describe("Hopf algebra factory", () => {
  it("reconstructs the ℚ[C₂] Hopf structure with derived compatibility witnesses", () => {
    const structure = buildHopfAlgebraStructure(qc2HopfInput)

    expect(structure.algebra.multiply).toBe(multiply)
    expect(structure.comonoid.copy).toBe(copy)
    expect(structure.antipode).toBe(antipode)
    expect(structure.tensorWitnesses.middleSwap).toBe(middleSwap)

    const compatibility = structure.compatibility
    expect(compatibility).toBeDefined()
    expect(compatibility?.overall).toBe(true)

    if (!compatibility) {
      throw new Error("Expected compatibility diagnostics to be populated")
    }

    expect(normalize(compatibility.multiplication.left.expr)).toBe("delta-after-mu")
    expect(normalize(compatibility.multiplication.right.expr)).toBe("delta-after-mu")
    expect(normalize(compatibility.unit.left.expr)).toBe("delta-after-eta")
    expect(normalize(compatibility.unit.right.expr)).toBe("delta-after-eta")
    expect(normalize(compatibility.counit.left.expr)).toBe("epsilon-after-mu")
    expect(normalize(compatibility.counit.right.expr)).toBe("epsilon-after-mu")
  })

  it("flags malformed tensor witnesses that break bialgebra compatibility", () => {
    const brokenSwap = mkMorphism(
      "broken-middle-swap",
      tensorObject4,
      tensorObject4,
      symbolExpression("τ_bad"),
    )

    const structure = buildHopfAlgebraStructure({
      ...qc2HopfInput,
      tensorWitnesses: { middleSwap: brokenSwap },
    })

    const compatibility = structure.compatibility
    expect(compatibility).toBeDefined()
    expect(compatibility?.overall).toBe(false)

    if (!compatibility) {
      throw new Error("Expected compatibility diagnostics to be populated")
    }

    expect(compatibility.multiplication.holds).toBe(false)
    expect(normalize(compatibility.multiplication.left.expr)).toBe("delta-after-mu")
    expect(normalize(compatibility.multiplication.right.expr)).toContain("τ_bad")
  })
})

describe("Group algebra Hopf property sampling", () => {
  it("builds property sampling plans that integrate with the antipode oracle", () => {
    const operations = buildGroupAlgebraHopfOperations<"one">({
      basis: ["one"],
      identity: "one",
      multiply: () => "one",
      inverse: () => "one",
      describeBasis: (basis) => basis,
    })

    const unit = operations.unitElement()
    const double = operations.makeElement({ one: 2 })

    const sampling = operations.buildAntipodePropertySampling({
      samples: [unit],
      sampleCount: 3,
      generator: () => double,
      metadata: ["group algebra sampler"],
      describeSample: (element: GroupAlgebraElement<"one">) => `coeff=${element.one}`,
    })

    expect(sampling.samples).toEqual([unit])
    expect(sampling.sampleCount).toBe(3)
    expect(sampling.metadata).toEqual(["group algebra sampler"])
    expect(sampling.describe?.(double)).toBe("coeff=2")

    const generated = sampling.resample?.(2) ?? []
    expect(generated).toHaveLength(2)
    generated.forEach((element) => {
      expect(element.one).toBe(2)
    })

    const identityMap = (basis: "one") => operations.elementFromBasis(basis)
    expect(sampling.apply(identityMap, double)).toEqual(double)
    expect(sampling.equalElements(double, double)).toBe(true)
  })
})
