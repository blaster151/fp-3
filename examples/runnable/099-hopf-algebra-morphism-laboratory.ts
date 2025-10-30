import type { RunnableExample } from "./types"
import {
  analyzeHopfAlgebraMorphism,
  type HopfAlgebraMorphism,
} from "../../operations/coalgebra/coalgebra-interfaces"
import {
  H,
  createSymbolicHopfStructure,
  hopfSymbolicCategory,
  serializeMorphism,
  type HopfSymbolicMorphism,
} from "./hopf-symbolic-fixture"

const renderWitness = (label: string, holds: boolean, left: string, right: string): string[] => {
  const prefix = holds ? "✔" : "✘"
  return [
    `${prefix} ${label}`,
    `    left : ${left}`,
    `    right: ${right}`,
  ]
}

const summarizeDiagnostics = (
  title: string,
  morphism: HopfAlgebraMorphism<string, HopfSymbolicMorphism>,
): string[] => {
  const diagnostics = analyzeHopfAlgebraMorphism(morphism)
  const lines = [
    `${diagnostics.overall ? "✔" : "✘"} ${title}`,
    ...renderWitness(
      "Multiplication preserved",
      diagnostics.algebra.multiplication.holds,
      serializeMorphism(diagnostics.algebra.multiplication.left),
      serializeMorphism(diagnostics.algebra.multiplication.right),
    ),
    ...renderWitness(
      "Unit preserved",
      diagnostics.algebra.unit.holds,
      serializeMorphism(diagnostics.algebra.unit.left),
      serializeMorphism(diagnostics.algebra.unit.right),
    ),
    ...renderWitness(
      "Comultiplication preserved",
      diagnostics.comonoid.copy.holds,
      serializeMorphism(diagnostics.comonoid.copy.left),
      serializeMorphism(diagnostics.comonoid.copy.right),
    ),
    ...renderWitness(
      "Counit preserved",
      diagnostics.comonoid.discard.holds,
      serializeMorphism(diagnostics.comonoid.discard.left),
      serializeMorphism(diagnostics.comonoid.discard.right),
    ),
    ...renderWitness(
      "Antipode preserved",
      diagnostics.antipode.holds,
      serializeMorphism(diagnostics.antipode.left),
      serializeMorphism(diagnostics.antipode.right),
    ),
  ]
  return lines
}

const runHopfMorphismLaboratory = () => {
  const baseHopf = createSymbolicHopfStructure()
  const identityMorphism: HopfAlgebraMorphism<string, HopfSymbolicMorphism> = {
    domain: baseHopf,
    codomain: baseHopf,
    arrow: hopfSymbolicCategory.id(H),
  }

  const twistedMultiplication = createSymbolicHopfStructure({ multiplyLabel: "μ'" })
  const renamedAntipode = createSymbolicHopfStructure({ antipodeLabel: "S'" })

  const mismatchedMultiplication: HopfAlgebraMorphism<string, HopfSymbolicMorphism> = {
    domain: baseHopf,
    codomain: twistedMultiplication,
    arrow: hopfSymbolicCategory.id(H),
  }

  const mismatchedAntipode: HopfAlgebraMorphism<string, HopfSymbolicMorphism> = {
    domain: baseHopf,
    codomain: renamedAntipode,
    arrow: hopfSymbolicCategory.id(H),
  }

  const logs = [
    "== Hopf morphism laboratory ==",
    "We reuse the symbolic Hopf algebra with generators μ, η, Δ, ε, and S.",
    "Each diagnostic compares the domain's structure with the codomain's along a proposed arrow.",
    "",
    "-- Identity morphism diagnostics --",
    ...summarizeDiagnostics("Identity is a Hopf algebra morphism", identityMorphism),
    "",
    "-- Mismatched multiplication (fails) --",
    ...summarizeDiagnostics(
      "Renaming μ in the codomain breaks Hopf compatibility",
      mismatchedMultiplication,
    ),
    "",
    "-- Mismatched antipode (fails) --",
    ...summarizeDiagnostics(
      "Renaming S in the codomain breaks Hopf compatibility",
      mismatchedAntipode,
    ),
  ]

  return { logs }
}

export const stage099HopfAlgebraMorphismLaboratory: RunnableExample = {
  id: "099",
  title: "Hopf morphism diagnostics laboratory",
  outlineReference: 99,
  summary:
    "Audits Hopf algebra morphisms by comparing symbolic generators, highlighting how renaming μ or S violates preservation while the identity arrow succeeds.",
  async run() {
    return runHopfMorphismLaboratory()
  },
}
