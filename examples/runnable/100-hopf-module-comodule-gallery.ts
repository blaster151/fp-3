import type { RunnableExample } from "./types"
import {
  analyzeHopfComoduleMorphism,
  analyzeHopfModuleMorphism,
  hopfComoduleInductionFunctorWithWitness,
  hopfModuleRestrictionFunctorWithWitness,
  induceHopfComoduleAlongMorphism,
  mkHopfComodule,
  mkHopfComoduleMorphism,
  mkHopfModule,
  mkHopfModuleMorphism,
  restrictHopfModuleAlongMorphism,
  type HopfAlgebraMorphism,
} from "../../operations/coalgebra/coalgebra-interfaces"
import {
  H,
  createSymbolicHopfStructure,
  generatorMorphism,
  hopfSymbolicCategory,
  serializeMorphism,
  tensorObject,
  type HopfSymbolicMorphism,
} from "./hopf-symbolic-fixture"

const renderWitness = (
  label: string,
  witness: { readonly holds: boolean; readonly left: HopfSymbolicMorphism; readonly right: HopfSymbolicMorphism },
): string[] => [
  `${witness.holds ? "✔" : "✘"} ${label}`,
  `    left : ${serializeMorphism(witness.left)}`,
  `    right: ${serializeMorphism(witness.right)}`,
]

const renderFunctorSummary = (label: string, holds: boolean, metadata: ReadonlyArray<string>): string[] => [
  `${holds ? "✔" : "✘"} ${label}`,
  ...metadata.map((line) => `    ${line}`),
]

const runHopfRepresentationGallery = () => {
  const hopf = createSymbolicHopfStructure()
  const phi = generatorMorphism("φ", H, H)
  const hopfMorphism: HopfAlgebraMorphism<string, HopfSymbolicMorphism> = {
    domain: hopf,
    codomain: hopf,
    arrow: phi,
  }

  const moduleObject = "M"
  const HM = tensorObject(H, moduleObject)
  const module = mkHopfModule(moduleObject, generatorMorphism("α", HM, moduleObject))
  const moduleVariant = mkHopfModule(moduleObject, generatorMorphism("α'", HM, moduleObject))

  const moduleIdentity = mkHopfModuleMorphism(
    module,
    module,
    hopfSymbolicCategory.id(moduleObject),
  )
  const moduleMismatch = mkHopfModuleMorphism(
    module,
    moduleVariant,
    hopfSymbolicCategory.id(moduleObject),
  )

  const moduleIdentityWitness = analyzeHopfModuleMorphism(hopf, moduleIdentity)
  const moduleMismatchWitness = analyzeHopfModuleMorphism(hopf, moduleMismatch)

  const restrictedModule = restrictHopfModuleAlongMorphism(hopfMorphism, module)
  const restriction = hopfModuleRestrictionFunctorWithWitness(hopfMorphism, {
    objects: [module, moduleVariant],
    arrows: [moduleIdentity],
  })
  const restrictionMetadata = restriction.metadata ?? []

  const comoduleObject = "V"
  const HV = tensorObject(H, comoduleObject)
  const comodule = mkHopfComodule(comoduleObject, generatorMorphism("ρ", comoduleObject, HV))
  const comoduleVariant = mkHopfComodule(
    comoduleObject,
    generatorMorphism("ρ'", comoduleObject, HV),
  )

  const comoduleIdentity = mkHopfComoduleMorphism(
    comodule,
    comodule,
    hopfSymbolicCategory.id(comoduleObject),
  )
  const comoduleMismatch = mkHopfComoduleMorphism(
    comodule,
    comoduleVariant,
    hopfSymbolicCategory.id(comoduleObject),
  )

  const comoduleIdentityWitness = analyzeHopfComoduleMorphism(hopf, comoduleIdentity)
  const comoduleMismatchWitness = analyzeHopfComoduleMorphism(hopf, comoduleMismatch)

  const inducedComodule = induceHopfComoduleAlongMorphism(hopfMorphism, comodule)
  const induction = hopfComoduleInductionFunctorWithWitness(hopfMorphism, {
    objects: [comodule, comoduleVariant],
    arrows: [comoduleIdentity],
  })
  const inductionMetadata = induction.metadata ?? []

  const logs = [
    "== Hopf module/comodule functor gallery ==",
    "The symbolic Hopf algebra provides generators μ, η, Δ, ε, and S together with a scalar map φ for transport.",
    "",
    "-- Module morphism diagnostics --",
    ...renderWitness("Identity action is preserved", moduleIdentityWitness),
    ...renderWitness("Action mismatch is detected", moduleMismatchWitness),
    "",
    "-- Module restriction along φ --",
    `✔ Restricted action: ${serializeMorphism(restrictedModule.action)}`,
    ...renderFunctorSummary(
      "Restriction functor satisfies the functor laws",
      restriction.report.holds,
      restrictionMetadata,
    ),
    "",
    "-- Comodule morphism diagnostics --",
    ...renderWitness("Identity coaction is preserved", comoduleIdentityWitness),
    ...renderWitness("Coaction mismatch is detected", comoduleMismatchWitness),
    "",
    "-- Comodule induction along φ --",
    `✔ Induced coaction: ${serializeMorphism(inducedComodule.coaction)}`,
    ...renderFunctorSummary(
      "Induction functor satisfies the functor laws",
      induction.report.holds,
      inductionMetadata,
    ),
  ]

  return { logs }
}

export const stage100HopfModuleComoduleGallery: RunnableExample = {
  id: "100",
  title: "Hopf module and comodule functor gallery",
  outlineReference: 100,
  summary:
    "Explores module/comodule diagnostics alongside restriction and induction functors driven by a symbolic Hopf morphism.",
  async run() {
    return runHopfRepresentationGallery()
  },
}
