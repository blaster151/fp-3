import type { RunnableExample } from "./types"
import {
  buildGroupAlgebraHopfOperations,
  type GroupAlgebraElement,
  type GroupAlgebraLinearMap,
  type HopfDiagnostic,
} from "../../operations/coalgebra/group-algebra-hopf"
import { evaluateHopfAntipodeOnSamples } from "../../operations/coalgebra/coalgebra-interfaces"
import { summarizeHopfAntipodePropertySampling } from "../../diagnostics"

type BasisElement = "one" | "sigma"

const hopf = buildGroupAlgebraHopfOperations<BasisElement>({
  basis: ["one", "sigma"],
  identity: "one",
  multiply: (left, right) => {
    if (left === "one") {
      return right
    }
    if (right === "one") {
      return left
    }
    return "one"
  },
  inverse: (basis) => basis,
  describeBasis: (basis) => (basis === "one" ? "1" : "g"),
})

const sampleElements: ReadonlyArray<GroupAlgebraElement<BasisElement>> = [
  hopf.makeElement({}),
  hopf.makeElement({ one: 1 }),
  hopf.makeElement({ sigma: 1 }),
  hopf.makeElement({ one: 2, sigma: -1 }),
  hopf.makeElement({ one: -3, sigma: 4 }),
  hopf.makeElement({ one: 5, sigma: 5 }),
]

const renderDiagnostic = (diagnostic: HopfDiagnostic): ReadonlyArray<string> => {
  const header = `${diagnostic.holds ? "✔" : "✘"} ${diagnostic.label}`
  return diagnostic.details.length === 0 ? [header] : [header, ...diagnostic.details]
}

const runHopfAntipodeDiagnostics = () => {
  const identityMap: GroupAlgebraLinearMap<BasisElement> = (basis) =>
    hopf.elementFromBasis(basis)
  const antipodeMap: GroupAlgebraLinearMap<BasisElement> = (basis) =>
    hopf.elementFromBasis(hopf.inverseBasis(basis))
  const convolutionIdentityMap: GroupAlgebraLinearMap<BasisElement> = () =>
    hopf.unitElement()
  const buildConvolutionMap = (
    first: GroupAlgebraLinearMap<BasisElement>,
    second: GroupAlgebraLinearMap<BasisElement>,
  ): GroupAlgebraLinearMap<BasisElement> => (basis) =>
    hopf.convolution(first, second, hopf.elementFromBasis(basis))

  const propertySampling = hopf.buildAntipodePropertySampling({
    samples: sampleElements,
    metadata: ["hand-picked group algebra samples"],
    describeSample: hopf.describeElement,
  })

  const comparisons = {
    left: {
      actual: buildConvolutionMap(antipodeMap, identityMap),
      expected: convolutionIdentityMap,
    },
    right: {
      actual: buildConvolutionMap(identityMap, antipodeMap),
      expected: convolutionIdentityMap,
    },
  }

  const propertySamplingReport = evaluateHopfAntipodeOnSamples(
    comparisons,
    propertySampling,
  )
  const propertySamplingSummary = summarizeHopfAntipodePropertySampling(
    propertySamplingReport,
  )

  const diagnostics: ReadonlyArray<HopfDiagnostic> = [
    hopf.checkAssociativity(sampleElements),
    hopf.checkUnitLaw(sampleElements),
    hopf.checkCoassociativity(sampleElements),
    hopf.checkCounitLaws(sampleElements),
    hopf.checkBialgebraMultiplicationCompatibility(sampleElements),
    hopf.checkCounitMultiplicationCompatibility(sampleElements),
    hopf.checkCounitUnitCompatibility(),
    hopf.checkAntipode("Antipode satisfies S * id = η ∘ ε", antipodeMap, identityMap, sampleElements),
    hopf.checkAntipode("Antipode satisfies id * S = η ∘ ε", identityMap, antipodeMap, sampleElements),
  ]

  const logs = [
    "== Hopf algebra antipode diagnostics for the group algebra ℚ[C₂] ==",
    "Basis generators: 1 (identity), g with g² = 1",
    "",
    "== Property-based sample elements ==",
    ...sampleElements.map((element, index) => `  ${index + 1}. ${hopf.describeElement(element)}`),
    "",
    "== Property sampling summary ==",
    ...propertySamplingSummary.split("\n").map((line) => `  ${line}`),
    "",
    "== Law checks ==",
    ...diagnostics.flatMap(renderDiagnostic),
  ]

  return { logs }
}

export const stage097HopfAlgebraAntipodeDiagnostics: RunnableExample = {
  id: "097",
  title: "Hopf antipode diagnostics for finite group algebras",
  outlineReference: 97,
  summary:
    "Constructs the Hopf algebra of the order-two group algebra, enumerates property-based samples, and verifies the antipode's convolution identities alongside bialgebra laws.",
  async run() {
    return runHopfAntipodeDiagnostics()
  },
}
