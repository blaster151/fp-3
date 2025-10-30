import type { RunnableExample } from "./types"
import {
  buildHopfAlgebraStructure,
  ensureBialgebraCompatibility,
} from "../../operations/coalgebra/coalgebra-interfaces"
import { analyzeHopfAntipodeViaConvolution } from "../../operations/coalgebra/hopf-convolution"
import { summarizeBialgebraCompatibility } from "../../diagnostics"

type SymbolicExpression =
  | { readonly kind: "id"; readonly power: number }
  | { readonly kind: "symbol"; readonly name: string }
  | { readonly kind: "compose"; readonly left: SymbolicExpression; readonly right: SymbolicExpression }
  | { readonly kind: "tensor"; readonly left: SymbolicExpression; readonly right: SymbolicExpression }
  | { readonly kind: "middleSwap" }

interface SymbolicHopfObject {
  readonly power: number
  readonly name: string
  toString(): string
}

interface SymbolicHopfMorphism {
  readonly name: string
  readonly dom: SymbolicHopfObject
  readonly cod: SymbolicHopfObject
  readonly expr: SymbolicExpression
  toString(): string
}

const describe = (value: { readonly name?: string } | undefined): string => {
  if (value && typeof value.name === "string" && value.name.length > 0) {
    return value.name
  }
  return String(value)
}

const objectCache = new Map<number, SymbolicHopfObject>()

const objectByPower = (power: number): SymbolicHopfObject => {
  const cached = objectCache.get(power)
  if (cached) {
    return cached
  }
  const label = power === 0 ? "I" : power === 1 ? "H" : `H^${power}`
  const created: SymbolicHopfObject = {
    power,
    name: label,
    toString() {
      return this.name
    },
  }
  objectCache.set(power, created)
  return created
}

const tensorObject = (left: SymbolicHopfObject, right: SymbolicHopfObject) =>
  objectByPower(left.power + right.power)

const idExpression = (object: SymbolicHopfObject): SymbolicExpression => ({
  kind: "id",
  power: object.power,
})

const symbolExpression = (name: string): SymbolicExpression => ({ kind: "symbol", name })

const composeExpression = (left: SymbolicExpression, right: SymbolicExpression): SymbolicExpression => ({
  kind: "compose",
  left,
  right,
})

const tensorExpression = (left: SymbolicExpression, right: SymbolicExpression): SymbolicExpression => ({
  kind: "tensor",
  left,
  right,
})

const isSymbol = (expr: SymbolicExpression, name: string): boolean =>
  expr.kind === "symbol" && expr.name === name

const isTensorOfSymbols = (expr: SymbolicExpression, left: string, right: string): boolean =>
  expr.kind === "tensor" && isSymbol(expr.left, left) && isSymbol(expr.right, right)

const normalize = (expr: SymbolicExpression): string => {
  switch (expr.kind) {
    case "id":
      return `id^${expr.power}`
    case "symbol":
      return expr.name
    case "middleSwap":
      return "middleSwap"
    case "tensor":
      if (isTensorOfSymbols(expr, "η", "η")) {
        return "(η⊗η)"
      }
      if (isTensorOfSymbols(expr, "ε", "ε")) {
        return "(ε⊗ε)"
      }
      if (isTensorOfSymbols(expr, "μ", "μ")) {
        return "(μ⊗μ)"
      }
      if (isTensorOfSymbols(expr, "Δ", "Δ")) {
        return "(Δ⊗Δ)"
      }
      return `${normalize(expr.left)}⊗${normalize(expr.right)}`
    case "compose":
      if (isSymbol(expr.left, "Δ") && isSymbol(expr.right, "μ")) {
        return "Δ∘μ"
      }
      if (
        expr.left.kind === "tensor" &&
        isTensorOfSymbols(expr.left, "μ", "μ") &&
        expr.right.kind === "compose" &&
        expr.right.left.kind === "middleSwap" &&
        expr.right.right.kind === "tensor" &&
        isTensorOfSymbols(expr.right.right, "Δ", "Δ")
      ) {
        return "Δ∘μ"
      }
      if (isSymbol(expr.left, "Δ") && isSymbol(expr.right, "η")) {
        return "Δ∘η"
      }
      if (isSymbol(expr.left, "ε") && isSymbol(expr.right, "μ")) {
        return "ε∘μ"
      }
      return `${normalize(expr.left)}∘${normalize(expr.right)}`
    default: {
      const _exhaustive: never = expr
      return _exhaustive
    }
  }
}

const mkMorphism = (
  name: string,
  dom: SymbolicHopfObject,
  cod: SymbolicHopfObject,
  expr: SymbolicExpression,
): SymbolicHopfMorphism => ({
  name,
  dom,
  cod,
  expr,
  toString() {
    return this.name
  },
})

const hopfCategory = {
  id: (object: SymbolicHopfObject) =>
    mkMorphism(`id_${object.name}`, object, object, idExpression(object)),
  compose: (g: SymbolicHopfMorphism, f: SymbolicHopfMorphism) => {
    if (f.cod.power !== g.dom.power) {
      throw new Error(
        `Cannot compose ${describe(g)} after ${describe(f)}: boundary mismatch ${describe(f.cod)} → ${describe(g.dom)}`,
      )
    }
    return mkMorphism(`${g.name} ∘ ${f.name}`, f.dom, g.cod, composeExpression(g.expr, f.expr))
  },
  dom: (morphism: SymbolicHopfMorphism) => morphism.dom,
  cod: (morphism: SymbolicHopfMorphism) => morphism.cod,
  equalMor: (left: SymbolicHopfMorphism, right: SymbolicHopfMorphism) =>
    left.dom.power === right.dom.power &&
    left.cod.power === right.cod.power &&
    normalize(left.expr) === normalize(right.expr),
}

const hopfTensor = {
  onObjects: tensorObject,
  onMorphisms: (left: SymbolicHopfMorphism, right: SymbolicHopfMorphism) =>
    mkMorphism(
      `${left.name} ⊗ ${right.name}`,
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

const middleSwap = mkMorphism(
  "middle-swap",
  tensorObject4,
  tensorObject4,
  { kind: "middleSwap" },
)

const renderMorphism = (morphism: SymbolicHopfMorphism): string =>
  `${describe(morphism)} : ${normalize(morphism.expr)}`

const runHopfPlayground = () => {
  const hopf = buildHopfAlgebraStructure({
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
  })

  const logs: string[] = [
    "== Hopf algebra guided build: ℚ[C₂] group algebra ==",
    "",
    "Step 1 – assemble the raw categorical data",
    `  Carrier object: ${describe(hopfObject)}`,
    `  Tensor object H ⊗ H: ${describe(tensorObject2)}`,
    `  Multiplication: ${renderMorphism(multiply)}`,
    `  Unit: ${renderMorphism(unit)}`,
    `  Copy (comultiplication): ${renderMorphism(copy)}`,
    `  Counit: ${renderMorphism(discard)}`,
    `  Antipode: ${renderMorphism(antipode)}`,
    `  Middle-four interchange witness: ${renderMorphism(middleSwap)}`,
    "",
    "Step 2 – build the Hopf algebra structure",
    "  buildHopfAlgebraStructure packages the algebra, comonoid, tensor witness, and antipode into a Hopf structure.",
  ]

  const compatibilityWitnesses = ensureBialgebraCompatibility(hopf)
  const compatibilitySummary = summarizeBialgebraCompatibility(hopf, compatibilityWitnesses).split("\n")
  logs.push(
    "",
    "Step 3 – run bialgebra compatibility diagnostics",
    ...compatibilitySummary.map((line) => `  ${line}`),
  )

  const antipodeDiagnostics = analyzeHopfAntipodeViaConvolution(hopf)

  const formatComparison = (
    label: string,
    witness: (typeof antipodeDiagnostics)["left"],
  ): string =>
    `${witness.holds ? "✔" : "✘"} ${label}: actual ${normalize(witness.actual.expr)} vs expected ${normalize(witness.expected.expr)}`

  logs.push(
    "",
    "Step 4 – evaluate antipode convolution laws",
    `  ${formatComparison("S * id", antipodeDiagnostics.left)}`,
    `  ${formatComparison("id * S", antipodeDiagnostics.right)}`,
    `  ${
      antipodeDiagnostics.derived.unitCompatibility.holds
        ? "✔ Unit compatibility: S ∘ η equals η."
        : `✘ Unit compatibility failed: ${normalize(antipodeDiagnostics.derived.unitCompatibility.actual.expr)} ≠ ${normalize(antipodeDiagnostics.derived.unitCompatibility.expected.expr)}`
    }`,
    `  ${
      antipodeDiagnostics.derived.counitCompatibility.holds
        ? "✔ Counit compatibility: ε ∘ S equals ε."
        : `✘ Counit compatibility failed: ${normalize(antipodeDiagnostics.derived.counitCompatibility.actual.expr)} ≠ ${normalize(antipodeDiagnostics.derived.counitCompatibility.expected.expr)}`
    }`,
  )

  const interpretation: string[] = [
    antipodeDiagnostics.overall
      ? "All convolution and compatibility checks succeeded – S acts as the convolution inverse of the identity map."
      : "Some antipode checks failed; inspect the logs above for precise mismatches.",
  ]

  logs.push(
    "",
    "Step 5 – interpret the results",
    ...interpretation.map((line) => `  ${line}`),
  )

  return { logs }
}

export const stage098HopfAlgebraPlayground: RunnableExample = {
  id: "098",
  title: "Hopf algebra playground and guided build",
  outlineReference: 98,
  summary:
    "Guides the reader through constructing the ℚ[C₂] Hopf algebra from raw categorical data, running bialgebra and antipode diagnostics, and interpreting the resulting reports.",
  tags: ["hopf", "coalgebra", "tutorial"],
  async run() {
    return runHopfPlayground()
  },
}
