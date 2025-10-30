import {
  constructFunctorWithWitness,
  type Functor,
  type FunctorCheckSamples,
  type FunctorWithWitness,
} from "../../functor"
import type { SimpleCat } from "../../simple-cat"
import type { Category } from "../../stdlib/category"
import type { ArrowFamilies } from "../../stdlib/arrow-families"
import { CategoryLimits } from "../../stdlib/category-limits"

/**
 * Endofunctor on a base category. Used to package the object/morphism actions
 * of a comonad without committing to a specific implementation strategy.
 */
export interface EndofunctorOn<O, M> {
  readonly onObjects: (object: O) => O
  readonly onMorphisms: (morphism: M) => M
}

/**
 * Comonad data on a category. The underlying endofunctor is paired with the
 * usual counit/comultiplication structure maps.
 */
export interface ComonadStructure<O, M> {
  readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
  readonly endofunctor: EndofunctorOn<O, M>
  /** ε_X : W X → X */
  readonly counit: (object: O) => M
  /** δ_X : W X → W (W X) */
  readonly comultiplication: (object: O) => M
}

const morphismEquality = <O, M>(category: Category<O, M>) => {
  if (typeof category.equalMor === "function") {
    return (left: M, right: M) => category.equalMor!(left, right)
  }
  if (typeof category.eq === "function") {
    return (left: M, right: M) => category.eq!(left, right)
  }
  return (left: M, right: M) => Object.is(left, right)
}

/**
 * Coalgebra object for a comonad. The coaction is a morphism α : A → W A.
 */
export interface Coalgebra<O, M> {
  readonly object: O
  readonly coaction: M
}

/**
 * Morphism of coalgebras. The underlying arrow must make the usual square
 * commute: W f ∘ α = β ∘ f.
 */
export interface CoalgebraMorphism<O, M> {
  readonly source: Coalgebra<O, M>
  readonly target: Coalgebra<O, M>
  readonly morphism: M
}

/** Equality predicate for comparing coalgebra carriers. */
export type CoalgebraEquality<O, M> = (left: Coalgebra<O, M>, right: Coalgebra<O, M>) => boolean

/** Simple constructor helper for coalgebras. */
export const mkCoalgebra = <O, M>(object: O, coaction: M): Coalgebra<O, M> => ({ object, coaction })

/** Simple constructor helper for coalgebra morphisms. */
export const mkCoalgebraMorphism = <O, M>(
  source: Coalgebra<O, M>,
  target: Coalgebra<O, M>,
  morphism: M,
): CoalgebraMorphism<O, M> => ({ source, target, morphism })

/** Identity morphism inside the coalgebra category. */
export const idCoalgebra = <O, M>(category: Category<O, M>) =>
  (coalgebra: Coalgebra<O, M>): CoalgebraMorphism<O, M> => ({
    source: coalgebra,
    target: coalgebra,
    morphism: category.id(coalgebra.object),
  })

/**
 * Compose coalgebra morphisms. A runtime guard defends against shape
 * mismatches, making debugging less painful.
 */
export const composeCoalgebraMorphisms = <O, M>(
  category: Category<O, M>,
  sameUnderlying: CoalgebraEquality<O, M> = (left, right) => Object.is(left.object, right.object),
) =>
  (g: CoalgebraMorphism<O, M>, f: CoalgebraMorphism<O, M>): CoalgebraMorphism<O, M> => {
    if (!sameUnderlying(f.target, g.source)) {
      throw new Error(
        "composeCoalgebraMorphisms: target/source objects do not align; " +
          "did you forget to ensure compatibility?",
      )
    }
    return {
      source: f.source,
      target: g.target,
      morphism: category.compose(g.morphism, f.morphism),
    }
  }

/** Category structure on coalgebras for a fixed comonad. */
export const coalgebraCategory = <O, M>(
  category: Category<O, M>,
  sameUnderlying: CoalgebraEquality<O, M> = (left, right) => Object.is(left.object, right.object),
): Category<Coalgebra<O, M>, CoalgebraMorphism<O, M>> => {
  const eq = category.equalMor ?? category.eq
  const id = (coalgebra: Coalgebra<O, M>) => idCoalgebra(category)(coalgebra)
  const compose = (g: CoalgebraMorphism<O, M>, f: CoalgebraMorphism<O, M>) =>
    composeCoalgebraMorphisms(category, sameUnderlying)(g, f)
  if (eq) {
    return {
      id,
      compose,
      eq: (left, right) => eq(left.morphism, right.morphism),
    }
  }
  return { id, compose }
}

/** Domain/codomain adapters so coalgebras inherit arrow family utilities. */
export const coalgebraDomCod = <O, M>(): ArrowFamilies.HasDomCod<Coalgebra<O, M>, CoalgebraMorphism<O, M>> => ({
  dom: (morphism) => morphism.source,
  cod: (morphism) => morphism.target,
})

const coalgebraCounitComposite = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
) =>
  comonad.category.compose(
    comonad.counit(coalgebra.object),
    coalgebra.coaction,
  )

const coalgebraCoassociativeLeft = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
) =>
  comonad.category.compose(
    comonad.comultiplication(coalgebra.object),
    coalgebra.coaction,
  )

const coalgebraCoassociativeRight = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
) =>
  comonad.category.compose(
    comonad.endofunctor.onMorphisms(coalgebra.coaction),
    coalgebra.coaction,
  )

/** Diagnostics for the canonical coalgebra laws attached to a comonad. */
export interface CoalgebraLawDiagnostics<M> {
  readonly counit: {
    readonly holds: boolean
    readonly actual: M
    readonly expected: M
  }
  readonly coassociativity: {
    readonly holds: boolean
    readonly left: M
    readonly right: M
  }
  readonly overall: boolean
}

/**
 * Check the standard counit/coassociativity laws for a coalgebra. The report
 * exposes both sides of each equation so downstream oracles can surface
 * precise counterexamples.
 */
export const analyzeCoalgebraLaws = <O, M>(
  comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
): CoalgebraLawDiagnostics<M> => {
  const equality = morphismEquality(comonad.category)
  const counitActual = coalgebraCounitComposite(comonad, coalgebra)
  const counitExpected = comonad.category.id(coalgebra.object)
  const coassocLeft = coalgebraCoassociativeLeft(comonad, coalgebra)
  const coassocRight = coalgebraCoassociativeRight(comonad, coalgebra)
  const counitHolds = equality(counitActual, counitExpected)
  const coassociativityHolds = equality(coassocLeft, coassocRight)
  return {
    counit: {
      holds: counitHolds,
      actual: counitActual,
      expected: counitExpected,
    },
    coassociativity: {
      holds: coassociativityHolds,
      left: coassocLeft,
      right: coassocRight,
    },
    overall: counitHolds && coassociativityHolds,
  }
}

/**
 * Bare-bones comonoid structure witness. The copy/discard maps are intentionally
 * opaque so higher-level modules can refine them for particular categories.
 */
export interface ComonoidStructure<O, M> {
  readonly object: O
  readonly copy: M
  readonly discard: M
}

/**
 * Morphism of comonoids. These will later feed the executable oracles and
 * witness factories.
 */
export interface ComonoidMorphism<O, M> {
  readonly domain: ComonoidStructure<O, M>
  readonly codomain: ComonoidStructure<O, M>
  readonly arrow: M
}

/** Forget the discard map and view a comonoid as a coalgebra via its copy. */
export const comonoidAsCoalgebra = <O, M>(comonoid: ComonoidStructure<O, M>): Coalgebra<O, M> => ({
  object: comonoid.object,
  coaction: comonoid.copy,
})

/** Lift a coalgebra morphism to a comonoid morphism when shapes align. */
export const coalgebraMorphismAsComonoid = <O, M>(
  source: ComonoidStructure<O, M>,
  target: ComonoidStructure<O, M>,
  morphism: CoalgebraMorphism<O, M>,
): ComonoidMorphism<O, M> => ({
  domain: source,
  codomain: target,
  arrow: morphism.morphism,
})

/**
 * Compare the two composite morphisms associated to the coalgebra morphism
 * condition W f ∘ α = β ∘ f.
 */
export interface CoalgebraMorphismWitness<M> {
  readonly left: M
  readonly right: M
  readonly holds: boolean
}

/** Execute the coalgebra morphism coherence check inside the base category. */
export const analyzeCoalgebraMorphism = <O, M>(
  comonad: ComonadStructure<O, M>,
  morphism: CoalgebraMorphism<O, M>,
): CoalgebraMorphismWitness<M> => {
  const equality = morphismEquality(comonad.category)
  const left = comonad.category.compose(
    comonad.endofunctor.onMorphisms(morphism.morphism),
    morphism.source.coaction,
  )
  const right = comonad.category.compose(
    morphism.target.coaction,
    morphism.morphism,
  )
  return {
    left,
    right,
    holds: equality(left, right),
  }
}

/**
 * Algebra object structure. Mirrors the comonoid helper above but for
 * multiplication/unit data so we can package bialgebras and Hopf algebras.
 */
export interface AlgebraStructure<O, M> {
  readonly object: O
  readonly multiply: M
  readonly unit: M
}

/** Morphism of algebras preserving multiplication/unit data. */
export interface AlgebraMorphism<O, M> {
  readonly domain: AlgebraStructure<O, M>
  readonly codomain: AlgebraStructure<O, M>
  readonly arrow: M
}

export interface BialgebraCompatibilityWitness<M> {
  readonly left: M
  readonly right: M
  readonly holds: boolean
}

export interface BialgebraCompatibilityDiagnostics<M> {
  readonly multiplication: BialgebraCompatibilityWitness<M>
  readonly unit: BialgebraCompatibilityWitness<M>
  readonly counit: BialgebraCompatibilityWitness<M>
  readonly overall: boolean
}

export const BIALGEBRA_COMPATIBILITY_COMPONENTS = [
  "multiplication",
  "unit",
  "counit",
] as const

export type BialgebraCompatibilityComponent = typeof BIALGEBRA_COMPATIBILITY_COMPONENTS[number]

/**
 * Helper morphisms exposed by a bialgebra's ambient tensor structure. The
 * `middleSwap` arrow realizes id ⊗ τ ⊗ id on (A ⊗ A) ⊗ (A ⊗ A), ensuring the
 * multiplication/comultiplication compatibility law is phrased with the
 * canonical braiding witness when available.
 */
export interface BialgebraTensorWitnesses<M> {
  readonly middleSwap: M
}

export interface MonoidalIsomorphismWitness<M> {
  readonly forward: M
  readonly backward: M
}

export interface SymmetricMonoidalWitnesses<O, M> {
  readonly associator: (
    left: O,
    middle: O,
    right: O,
  ) => MonoidalIsomorphismWitness<M>
  readonly braiding: (
    left: O,
    right: O,
  ) => MonoidalIsomorphismWitness<M>
}

export interface HopfQuasitriangularStructure<M> {
  readonly rMatrix: M
  readonly inverse?: M
}

export interface BraidedHopfAlgebraStructure<O, M> extends HopfAlgebraStructure<O, M> {
  readonly symmetricMonoidalWitnesses: SymmetricMonoidalWitnesses<O, M>
  readonly quasitriangular?: HopfQuasitriangularStructure<M>
}

export interface BraidedHopfAlgebraFactoryInput<O, M> extends HopfAlgebraFactoryInput<O, M> {
  readonly symmetricMonoidalWitnesses: SymmetricMonoidalWitnesses<O, M>
  readonly quasitriangular?: HopfQuasitriangularStructure<M>
}

/** Bundled algebra and comonoid data on the same carrier object. */
export interface BialgebraStructure<O, M> {
  readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
  readonly tensor: CategoryLimits.TensorProductStructure<O, M>
  readonly algebra: AlgebraStructure<O, M>
  readonly comonoid: ComonoidStructure<O, M>
  readonly tensorWitnesses: BialgebraTensorWitnesses<M>
  readonly compatibility?: BialgebraCompatibilityDiagnostics<M>
}

export type BareBialgebraStructure<O, M> = Omit<BialgebraStructure<O, M>, "compatibility">

/** Hopf algebra obtained by adjoining an antipode to a bialgebra. */
export interface HopfAlgebraStructure<O, M> extends BialgebraStructure<O, M> {
  readonly antipode: M
}

/** Hopf algebra data prior to attaching the bialgebra compatibility report. */
export type BareHopfAlgebraStructure<O, M> = BareBialgebraStructure<O, M> & {
  readonly antipode: M
}

/** Input for the Hopf algebra factory helper with optional cached diagnostics. */
export interface HopfAlgebraFactoryInput<O, M> extends BareHopfAlgebraStructure<O, M> {
  readonly compatibility?: BialgebraCompatibilityDiagnostics<M>
}

export interface AlgebraMorphismDiagnostics<M> {
  readonly multiplication: BialgebraCompatibilityWitness<M>
  readonly unit: BialgebraCompatibilityWitness<M>
  readonly overall: boolean
}

export interface ComonoidMorphismDiagnostics<M> {
  readonly copy: BialgebraCompatibilityWitness<M>
  readonly discard: BialgebraCompatibilityWitness<M>
  readonly overall: boolean
}

export interface HopfAlgebraMorphism<O, M> {
  readonly domain: HopfAlgebraStructure<O, M>
  readonly codomain: HopfAlgebraStructure<O, M>
  readonly arrow: M
}

export interface HopfAlgebraMorphismDiagnostics<M> {
  readonly algebra: AlgebraMorphismDiagnostics<M>
  readonly comonoid: ComonoidMorphismDiagnostics<M>
  readonly antipode: BialgebraCompatibilityWitness<M>
  readonly overall: boolean
}

export const hopfAlgebraMorphismAsAlgebra = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
): AlgebraMorphism<O, M> => ({
  domain: morphism.domain.algebra,
  codomain: morphism.codomain.algebra,
  arrow: morphism.arrow,
})

export const hopfAlgebraMorphismAsComonoid = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
): ComonoidMorphism<O, M> => ({
  domain: morphism.domain.comonoid,
  codomain: morphism.codomain.comonoid,
  arrow: morphism.arrow,
})

export const analyzeAlgebraMorphism = <O, M>(
  category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  tensor: CategoryLimits.TensorProductStructure<O, M>,
  morphism: AlgebraMorphism<O, M>,
): AlgebraMorphismDiagnostics<M> => {
  const equality = morphismEquality(category)
  const multiplicationLeft = category.compose(morphism.arrow, morphism.domain.multiply)
  const multiplicationRight = category.compose(
    morphism.codomain.multiply,
    tensor.onMorphisms(morphism.arrow, morphism.arrow),
  )
  const multiplication: BialgebraCompatibilityWitness<M> = {
    left: multiplicationLeft,
    right: multiplicationRight,
    holds: equality(multiplicationLeft, multiplicationRight),
  }
  const unitLeft = category.compose(morphism.arrow, morphism.domain.unit)
  const unit: BialgebraCompatibilityWitness<M> = {
    left: unitLeft,
    right: morphism.codomain.unit,
    holds: equality(unitLeft, morphism.codomain.unit),
  }
  return {
    multiplication,
    unit,
    overall: multiplication.holds && unit.holds,
  }
}

export const analyzeComonoidMorphism = <O, M>(
  category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  tensor: CategoryLimits.TensorProductStructure<O, M>,
  morphism: ComonoidMorphism<O, M>,
): ComonoidMorphismDiagnostics<M> => {
  const equality = morphismEquality(category)
  const copyLeft = category.compose(morphism.codomain.copy, morphism.arrow)
  const copyRight = category.compose(
    tensor.onMorphisms(morphism.arrow, morphism.arrow),
    morphism.domain.copy,
  )
  const copy: BialgebraCompatibilityWitness<M> = {
    left: copyLeft,
    right: copyRight,
    holds: equality(copyLeft, copyRight),
  }
  const discardLeft = category.compose(morphism.codomain.discard, morphism.arrow)
  const discard: BialgebraCompatibilityWitness<M> = {
    left: discardLeft,
    right: morphism.domain.discard,
    holds: equality(discardLeft, morphism.domain.discard),
  }
  return {
    copy,
    discard,
    overall: copy.holds && discard.holds,
  }
}

export const analyzeHopfAlgebraMorphism = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
): HopfAlgebraMorphismDiagnostics<M> => {
  const algebra = analyzeAlgebraMorphism(
    morphism.domain.category,
    morphism.domain.tensor,
    hopfAlgebraMorphismAsAlgebra(morphism),
  )
  const comonoid = analyzeComonoidMorphism(
    morphism.domain.category,
    morphism.domain.tensor,
    hopfAlgebraMorphismAsComonoid(morphism),
  )
  const equality = morphismEquality(morphism.domain.category)
  const antipodeLeft = morphism.domain.category.compose(
    morphism.arrow,
    morphism.domain.antipode,
  )
  const antipodeRight = morphism.domain.category.compose(
    morphism.codomain.antipode,
    morphism.arrow,
  )
  const antipode: BialgebraCompatibilityWitness<M> = {
    left: antipodeLeft,
    right: antipodeRight,
    holds: equality(antipodeLeft, antipodeRight),
  }
  return {
    algebra,
    comonoid,
    antipode,
    overall: algebra.overall && comonoid.overall && antipode.holds,
  }
}

const ensureSharedMonoidalInfrastructure = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
): void => {
  const mismatches: string[] = []
  if (!Object.is(morphism.domain.category, morphism.codomain.category)) {
    mismatches.push("underlying category")
  }
  if (!Object.is(morphism.domain.tensor, morphism.codomain.tensor)) {
    mismatches.push("tensor product structure")
  }
  const equality = morphismEquality(morphism.domain.category)
  if (
    !equality(
      morphism.domain.tensorWitnesses.middleSwap,
      morphism.codomain.tensorWitnesses.middleSwap,
    )
  ) {
    mismatches.push("middle-four interchange witness")
  }
  if (mismatches.length > 0) {
    throw new Error(
      "Hopf morphism monoidal data mismatch: " +
        mismatches.join(", ") +
        ". Ensure the domain and codomain share the same symmetric monoidal infrastructure.",
    )
  }
}

const tensorObject = <O, M>(
  tensor: CategoryLimits.TensorProductStructure<O, M>,
  left: O,
  right: O,
): O => tensor.onObjects(left, right)

const tensorMorphism = <O, M>(
  tensor: CategoryLimits.TensorProductStructure<O, M>,
  left: M,
  right: M,
): M => tensor.onMorphisms(left, right)

const tensorWithIdentityOnLeft = <O, M>(
  category: Category<O, M>,
  tensor: CategoryLimits.TensorProductStructure<O, M>,
  left: O,
  rightArrow: M,
): M => CategoryLimits.tensorIdentityOnLeft({
  category,
  tensor,
  left,
  morphism: rightArrow,
})

const tensorWithIdentityOnRight = <O, M>(
  category: Category<O, M>,
  tensor: CategoryLimits.TensorProductStructure<O, M>,
  right: O,
  leftArrow: M,
): M => CategoryLimits.tensorIdentityOnRight({
  category,
  tensor,
  right,
  morphism: leftArrow,
})

export const buildMiddleFourInterchange = <O, M>(
  category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  tensor: CategoryLimits.TensorProductStructure<O, M>,
  witnesses: SymmetricMonoidalWitnesses<O, M>,
  left: O,
  middle: O,
  right: O,
  fourth: O,
): M => {
  const rightTensorFourth = tensorObject(tensor, right, fourth)
  const middleTensorFourth = tensorObject(tensor, middle, fourth)

  const step1 = witnesses.associator(left, middle, rightTensorFourth).forward
  const step2 = tensorWithIdentityOnLeft(
    category,
    tensor,
    left,
    witnesses.associator(middle, right, fourth).backward,
  )
  const swappedInner = tensorWithIdentityOnRight(
    category,
    tensor,
    fourth,
    witnesses.braiding(middle, right).forward,
  )
  const step3 = tensorWithIdentityOnLeft(category, tensor, left, swappedInner)
  const step4 = tensorWithIdentityOnLeft(
    category,
    tensor,
    left,
    witnesses.associator(right, middle, fourth).forward,
  )
  const step5 = witnesses.associator(left, right, middleTensorFourth).backward

  return category.compose(
    step5,
    category.compose(
      step4,
      category.compose(step3, category.compose(step2, step1)),
    ),
  )
}

export const deriveBialgebraTensorWitnessesFromSymmetricMonoidal = <O, M>(
  category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  tensor: CategoryLimits.TensorProductStructure<O, M>,
  witnesses: SymmetricMonoidalWitnesses<O, M>,
  object: O,
): BialgebraTensorWitnesses<M> => ({
  middleSwap: buildMiddleFourInterchange(
    category,
    tensor,
    witnesses,
    object,
    object,
    object,
    object,
  ),
})

export interface HopfModuleStructure<O, M> {
  readonly object: O
  readonly action: M
}

export interface HopfModuleMorphism<O, M> {
  readonly source: HopfModuleStructure<O, M>
  readonly target: HopfModuleStructure<O, M>
  readonly morphism: M
}

export type HopfModuleEquality<O, M> = (
  left: HopfModuleStructure<O, M>,
  right: HopfModuleStructure<O, M>,
) => boolean

export const mkHopfModule = <O, M>(object: O, action: M): HopfModuleStructure<O, M> => ({
  object,
  action,
})

export const mkHopfModuleMorphism = <O, M>(
  source: HopfModuleStructure<O, M>,
  target: HopfModuleStructure<O, M>,
  morphism: M,
): HopfModuleMorphism<O, M> => ({
  source,
  target,
  morphism,
})

export interface HopfModuleMorphismWitness<M> {
  readonly left: M
  readonly right: M
  readonly holds: boolean
}

export const analyzeHopfModuleMorphism = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  morphism: HopfModuleMorphism<O, M>,
): HopfModuleMorphismWitness<M> => {
  const equality = morphismEquality(hopf.category)
  const left = hopf.category.compose(
    morphism.target.action,
    CategoryLimits.tensorIdentityOnLeft({
      category: hopf.category,
      tensor: hopf.tensor,
      left: hopf.algebra.object,
      morphism: morphism.morphism,
    }),
  )
  const right = hopf.category.compose(morphism.morphism, morphism.source.action)
  return { left, right, holds: equality(left, right) }
}

export const idHopfModule = <O, M>(hopf: HopfAlgebraStructure<O, M>) =>
  (module: HopfModuleStructure<O, M>): HopfModuleMorphism<O, M> => ({
    source: module,
    target: module,
    morphism: hopf.category.id(module.object),
  })

export const composeHopfModuleMorphisms = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  sameUnderlying: HopfModuleEquality<O, M> = (left, right) => Object.is(left.object, right.object),
) =>
  (g: HopfModuleMorphism<O, M>, f: HopfModuleMorphism<O, M>): HopfModuleMorphism<O, M> => {
    if (!sameUnderlying(f.target, g.source)) {
      throw new Error(
        "composeHopfModuleMorphisms: target/source objects do not align; " +
          "did you forget to ensure compatibility?",
      )
    }
    return {
      source: f.source,
      target: g.target,
      morphism: hopf.category.compose(g.morphism, f.morphism),
    }
  }

export const hopfModuleCategory = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  sameUnderlying: HopfModuleEquality<O, M> = (left, right) => Object.is(left.object, right.object),
): Category<HopfModuleStructure<O, M>, HopfModuleMorphism<O, M>> => {
  const eq = hopf.category.equalMor ?? hopf.category.eq
  const id = (module: HopfModuleStructure<O, M>) => idHopfModule(hopf)(module)
  const compose = (g: HopfModuleMorphism<O, M>, f: HopfModuleMorphism<O, M>) =>
    composeHopfModuleMorphisms(hopf, sameUnderlying)(g, f)
  if (eq) {
    return {
      id,
      compose,
      eq: (left, right) => eq(left.morphism, right.morphism),
    }
  }
  return { id, compose }
}

export const hopfModuleDomCod = <O, M>(): ArrowFamilies.HasDomCod<HopfModuleStructure<O, M>, HopfModuleMorphism<O, M>> => ({
  dom: (morphism) => morphism.source,
  cod: (morphism) => morphism.target,
})

const hopfModuleSimpleCategory = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  sameUnderlying: HopfModuleEquality<O, M> = (left, right) => Object.is(left.object, right.object),
): (Category<HopfModuleStructure<O, M>, HopfModuleMorphism<O, M>> &
  SimpleCat<HopfModuleStructure<O, M>, HopfModuleMorphism<O, M>>) => {
  const base = hopfModuleCategory(hopf, sameUnderlying)
  const domCod = hopfModuleDomCod<O, M>()
  return {
    ...base,
    src: domCod.dom,
    dst: domCod.cod,
  }
}

const restrictHopfModuleInternal = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
  module: HopfModuleStructure<O, M>,
): HopfModuleStructure<O, M> => {
  const scalarLift = CategoryLimits.tensorIdentityOnRight({
    category: morphism.domain.category,
    tensor: morphism.domain.tensor,
    right: module.object,
    morphism: morphism.arrow,
  })
  const action = morphism.domain.category.compose(module.action, scalarLift)
  return mkHopfModule(module.object, action)
}

const restrictHopfModuleMorphismInternal = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
  moduleMorphism: HopfModuleMorphism<O, M>,
): HopfModuleMorphism<O, M> =>
  mkHopfModuleMorphism(
    restrictHopfModuleInternal(morphism, moduleMorphism.source),
    restrictHopfModuleInternal(morphism, moduleMorphism.target),
    moduleMorphism.morphism,
  )

export const restrictHopfModuleAlongMorphism = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
  module: HopfModuleStructure<O, M>,
): HopfModuleStructure<O, M> => {
  ensureSharedMonoidalInfrastructure(morphism)
  return restrictHopfModuleInternal(morphism, module)
}

export const restrictHopfModuleMorphismAlongMorphism = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
  moduleMorphism: HopfModuleMorphism<O, M>,
): HopfModuleMorphism<O, M> => {
  ensureSharedMonoidalInfrastructure(morphism)
  return restrictHopfModuleMorphismInternal(morphism, moduleMorphism)
}

export const hopfModuleRestrictionFunctorWithWitness = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
  samples: FunctorCheckSamples<HopfModuleStructure<O, M>, HopfModuleMorphism<O, M>> = {},
  metadata: ReadonlyArray<string> = [],
): FunctorWithWitness<
  HopfModuleStructure<O, M>,
  HopfModuleMorphism<O, M>,
  HopfModuleStructure<O, M>,
  HopfModuleMorphism<O, M>
> => {
  ensureSharedMonoidalInfrastructure(morphism)
  const source = hopfModuleSimpleCategory(morphism.codomain)
  const target = hopfModuleSimpleCategory(morphism.domain)
  const functor: Functor<
    HopfModuleStructure<O, M>,
    HopfModuleMorphism<O, M>,
    HopfModuleStructure<O, M>,
    HopfModuleMorphism<O, M>
  > = {
    F0: (module) => restrictHopfModuleInternal(morphism, module),
    F1: (moduleMorphism) => restrictHopfModuleMorphismInternal(morphism, moduleMorphism),
  }
  const baseMetadata = [
    "Restricts Hopf modules along the morphism by precomposing scalar actions.",
  ] as const
  const combinedMetadata =
    metadata.length > 0 ? [...baseMetadata, ...metadata] : [...baseMetadata]
  return constructFunctorWithWitness(source, target, functor, samples, combinedMetadata)
}

export interface HopfComoduleStructure<O, M> {
  readonly object: O
  readonly coaction: M
}

export interface HopfComoduleMorphism<O, M> {
  readonly source: HopfComoduleStructure<O, M>
  readonly target: HopfComoduleStructure<O, M>
  readonly morphism: M
}

export type HopfComoduleEquality<O, M> = (
  left: HopfComoduleStructure<O, M>,
  right: HopfComoduleStructure<O, M>,
) => boolean

export const mkHopfComodule = <O, M>(object: O, coaction: M): HopfComoduleStructure<O, M> => ({
  object,
  coaction,
})

export const mkHopfComoduleMorphism = <O, M>(
  source: HopfComoduleStructure<O, M>,
  target: HopfComoduleStructure<O, M>,
  morphism: M,
): HopfComoduleMorphism<O, M> => ({
  source,
  target,
  morphism,
})

export interface HopfComoduleMorphismWitness<M> {
  readonly left: M
  readonly right: M
  readonly holds: boolean
}

export const analyzeHopfComoduleMorphism = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  morphism: HopfComoduleMorphism<O, M>,
): HopfComoduleMorphismWitness<M> => {
  const equality = morphismEquality(hopf.category)
  const left = hopf.category.compose(
    CategoryLimits.tensorIdentityOnLeft({
      category: hopf.category,
      tensor: hopf.tensor,
      left: hopf.comonoid.object,
      morphism: morphism.morphism,
    }),
    morphism.source.coaction,
  )
  const right = hopf.category.compose(morphism.target.coaction, morphism.morphism)
  return { left, right, holds: equality(left, right) }
}

export const idHopfComodule = <O, M>(hopf: HopfAlgebraStructure<O, M>) =>
  (comodule: HopfComoduleStructure<O, M>): HopfComoduleMorphism<O, M> => ({
    source: comodule,
    target: comodule,
    morphism: hopf.category.id(comodule.object),
  })

export const composeHopfComoduleMorphisms = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  sameUnderlying: HopfComoduleEquality<O, M> = (left, right) => Object.is(left.object, right.object),
) =>
  (g: HopfComoduleMorphism<O, M>, f: HopfComoduleMorphism<O, M>): HopfComoduleMorphism<O, M> => {
    if (!sameUnderlying(f.target, g.source)) {
      throw new Error(
        "composeHopfComoduleMorphisms: target/source objects do not align; " +
          "did you forget to ensure compatibility?",
      )
    }
    return {
      source: f.source,
      target: g.target,
      morphism: hopf.category.compose(g.morphism, f.morphism),
    }
  }

export const hopfComoduleCategory = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  sameUnderlying: HopfComoduleEquality<O, M> = (left, right) => Object.is(left.object, right.object),
): Category<HopfComoduleStructure<O, M>, HopfComoduleMorphism<O, M>> => {
  const eq = hopf.category.equalMor ?? hopf.category.eq
  const id = (comodule: HopfComoduleStructure<O, M>) => idHopfComodule(hopf)(comodule)
  const compose = (g: HopfComoduleMorphism<O, M>, f: HopfComoduleMorphism<O, M>) =>
    composeHopfComoduleMorphisms(hopf, sameUnderlying)(g, f)
  if (eq) {
    return {
      id,
      compose,
      eq: (left, right) => eq(left.morphism, right.morphism),
    }
  }
  return { id, compose }
}

export const hopfComoduleDomCod = <O, M>(): ArrowFamilies.HasDomCod<HopfComoduleStructure<O, M>, HopfComoduleMorphism<O, M>> => ({
  dom: (morphism) => morphism.source,
  cod: (morphism) => morphism.target,
})

const hopfComoduleSimpleCategory = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  sameUnderlying: HopfComoduleEquality<O, M> = (left, right) => Object.is(left.object, right.object),
): (Category<HopfComoduleStructure<O, M>, HopfComoduleMorphism<O, M>> &
  SimpleCat<HopfComoduleStructure<O, M>, HopfComoduleMorphism<O, M>>) => {
  const base = hopfComoduleCategory(hopf, sameUnderlying)
  const domCod = hopfComoduleDomCod<O, M>()
  return {
    ...base,
    src: domCod.dom,
    dst: domCod.cod,
  }
}

const induceHopfComoduleInternal = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
  comodule: HopfComoduleStructure<O, M>,
): HopfComoduleStructure<O, M> => {
  const lifted = CategoryLimits.tensorIdentityOnRight({
    category: morphism.domain.category,
    tensor: morphism.domain.tensor,
    right: comodule.object,
    morphism: morphism.arrow,
  })
  const coaction = morphism.domain.category.compose(lifted, comodule.coaction)
  return mkHopfComodule(comodule.object, coaction)
}

const induceHopfComoduleMorphismInternal = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
  comoduleMorphism: HopfComoduleMorphism<O, M>,
): HopfComoduleMorphism<O, M> =>
  mkHopfComoduleMorphism(
    induceHopfComoduleInternal(morphism, comoduleMorphism.source),
    induceHopfComoduleInternal(morphism, comoduleMorphism.target),
    comoduleMorphism.morphism,
  )

export const induceHopfComoduleAlongMorphism = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
  comodule: HopfComoduleStructure<O, M>,
): HopfComoduleStructure<O, M> => {
  ensureSharedMonoidalInfrastructure(morphism)
  return induceHopfComoduleInternal(morphism, comodule)
}

export const induceHopfComoduleMorphismAlongMorphism = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
  comoduleMorphism: HopfComoduleMorphism<O, M>,
): HopfComoduleMorphism<O, M> => {
  ensureSharedMonoidalInfrastructure(morphism)
  return induceHopfComoduleMorphismInternal(morphism, comoduleMorphism)
}

export const hopfComoduleInductionFunctorWithWitness = <O, M>(
  morphism: HopfAlgebraMorphism<O, M>,
  samples: FunctorCheckSamples<HopfComoduleStructure<O, M>, HopfComoduleMorphism<O, M>> = {},
  metadata: ReadonlyArray<string> = [],
): FunctorWithWitness<
  HopfComoduleStructure<O, M>,
  HopfComoduleMorphism<O, M>,
  HopfComoduleStructure<O, M>,
  HopfComoduleMorphism<O, M>
> => {
  ensureSharedMonoidalInfrastructure(morphism)
  const source = hopfComoduleSimpleCategory(morphism.domain)
  const target = hopfComoduleSimpleCategory(morphism.codomain)
  const functor: Functor<
    HopfComoduleStructure<O, M>,
    HopfComoduleMorphism<O, M>,
    HopfComoduleStructure<O, M>,
    HopfComoduleMorphism<O, M>
  > = {
    F0: (comodule) => induceHopfComoduleInternal(morphism, comodule),
    F1: (comoduleMorphism) => induceHopfComoduleMorphismInternal(morphism, comoduleMorphism),
  }
  const baseMetadata = [
    "Induces Hopf comodules along the morphism by postcomposing coactions with the scalar map.",
  ] as const
  const combinedMetadata =
    metadata.length > 0 ? [...baseMetadata, ...metadata] : [...baseMetadata]
  return constructFunctorWithWitness(source, target, functor, samples, combinedMetadata)
}

/**
 * Raw convolution data needed to check the antipode axioms. The `actual`
 * morphisms will typically be populated via convolution products once the
 * tensor helpers are wired in a later pass, while `expected` records the
 * counit/unit composite acting as the convolution identity.
 */
export interface HopfAntipodeConvolutionComparison<M> {
  readonly actual: M
  readonly expected: M
}

export interface HopfAntipodeConvolutionComparisons<M> {
  readonly left: HopfAntipodeConvolutionComparison<M>
  readonly right: HopfAntipodeConvolutionComparison<M>
}

export interface HopfAntipodeConvolutionDiagnostics<M> extends HopfAntipodeConvolutionComparison<M> {
  readonly holds: boolean
}

export interface HopfAntipodeCompatibilityDiagnostics<M> {
  readonly holds: boolean
  readonly actual: M
  readonly expected: M
}

export interface HopfAntipodeInvolutivityDiagnostics<M> {
  readonly holds: boolean
  readonly composite: M
  readonly expected: M
}

export interface HopfAntipodeGradedTraceDiagnostics<Grade, Trace> {
  readonly grade: Grade
  readonly actual: Trace
  readonly expected?: Trace
  readonly holds?: boolean
}

export interface HopfAntipodeDerivedDiagnostics<M, Grade = unknown, Trace = unknown> {
  readonly unitCompatibility: HopfAntipodeCompatibilityDiagnostics<M>
  readonly counitCompatibility: HopfAntipodeCompatibilityDiagnostics<M>
  readonly involutivity?: HopfAntipodeInvolutivityDiagnostics<M>
  readonly gradedTraces?: readonly HopfAntipodeGradedTraceDiagnostics<Grade, Trace>[]
  readonly overall: boolean
}

export interface HopfAntipodeInvolutivityOptions<M> {
  readonly expected?: M
  readonly enforce?: boolean
}

export interface HopfAntipodeGradedTraceSpec<O, M, Grade, Trace> {
  readonly grades: readonly Grade[]
  readonly compute: (hopf: HopfAlgebraStructure<O, M>, grade: Grade) => Trace
  readonly expected?: (grade: Grade) => Trace
  readonly compare?: (
    actual: Trace,
    expected: Trace,
    context: { readonly hopf: HopfAlgebraStructure<O, M>; readonly grade: Grade },
  ) => boolean
  readonly enforce?: boolean
}

export interface HopfAntipodeDerivedOptions<O, M, Grade = unknown, Trace = unknown> {
  readonly involutivity?: HopfAntipodeInvolutivityOptions<M>
  readonly gradedTrace?: HopfAntipodeGradedTraceSpec<O, M, Grade, Trace>
}

export interface HopfAntipodePropertySampling<M, Element> {
  readonly samples?: ReadonlyArray<Element>
  readonly sampleCount?: number
  readonly resample?: (count: number) => ReadonlyArray<Element>
  readonly apply: (morphism: M, sample: Element) => Element
  readonly equalElements: (left: Element, right: Element) => boolean
  readonly describe?: (element: Element) => string
  readonly metadata?: ReadonlyArray<string>
}

export interface HopfAntipodePropertySampleFailure<Element> {
  readonly sample: Element
  readonly sampleDescription?: string
  readonly left?: {
    readonly actual: Element
    readonly expected: Element
    readonly actualDescription?: string
    readonly expectedDescription?: string
  }
  readonly right?: {
    readonly actual: Element
    readonly expected: Element
    readonly actualDescription?: string
    readonly expectedDescription?: string
  }
}

export interface HopfAntipodePropertySamplingReport<Element> {
  readonly holds: boolean
  readonly samples: ReadonlyArray<Element>
  readonly samplesTested: number
  readonly successCount: number
  readonly failureCount: number
  readonly leftFailureCount: number
  readonly rightFailureCount: number
  readonly failures: ReadonlyArray<HopfAntipodePropertySampleFailure<Element>>
  readonly metadata?: ReadonlyArray<string>
}

/** Equality-focused diagnostics for both sides of the antipode equations. */
export interface HopfAntipodeDiagnostics<M, Grade = unknown, Trace = unknown> {
  readonly left: HopfAntipodeConvolutionDiagnostics<M>
  readonly right: HopfAntipodeConvolutionDiagnostics<M>
  readonly derived: HopfAntipodeDerivedDiagnostics<M, Grade, Trace>
  readonly overall: boolean
}

/**
 * Compare the convolution composites S * id and id * S against the
 * convolution identity η ∘ ε. Later passes will supply the actual
 * convolution data via the `comparisons` argument.
 */
export const analyzeHopfAntipode = <O, M, Grade = unknown, Trace = unknown>(
  hopf: HopfAlgebraStructure<O, M>,
  comparisons: HopfAntipodeConvolutionComparisons<M>,
  derivedOptions: HopfAntipodeDerivedOptions<O, M, Grade, Trace> = {},
): HopfAntipodeDiagnostics<M, Grade, Trace> => {
  const equality = morphismEquality(hopf.category)
  const leftHolds = equality(comparisons.left.actual, comparisons.left.expected)
  const rightHolds = equality(comparisons.right.actual, comparisons.right.expected)
  const unitActual = hopf.category.compose(hopf.antipode, hopf.algebra.unit)
  const unitExpected = hopf.algebra.unit
  const unitHolds = equality(unitActual, unitExpected)

  const counitActual = hopf.category.compose(hopf.comonoid.discard, hopf.antipode)
  const counitExpected = hopf.comonoid.discard
  const counitHolds = equality(counitActual, counitExpected)

  const involutivityConfig = derivedOptions.involutivity
  let involutivitySatisfied = true
  let involutivity: HopfAntipodeInvolutivityDiagnostics<M> | undefined
  if (involutivityConfig) {
    const expected =
      involutivityConfig.expected ?? hopf.category.id(hopf.algebra.object)
    const composite = hopf.category.compose(hopf.antipode, hopf.antipode)
    const holds = equality(composite, expected)
    involutivity = { composite, expected, holds }
    if (involutivityConfig.enforce === true) {
      involutivitySatisfied = holds
    }
  }

  const gradedSpec = derivedOptions.gradedTrace
  let gradedSatisfied = true
  let gradedTraces: HopfAntipodeDerivedDiagnostics<M, Grade, Trace>["gradedTraces"]
  if (gradedSpec) {
    gradedTraces = gradedSpec.grades.map((grade) => {
      const actual = gradedSpec.compute(hopf, grade)
      const expected = gradedSpec.expected?.(grade)
      if (expected === undefined) {
        return { grade, actual }
      }
      const holds = gradedSpec.compare
        ? gradedSpec.compare(actual, expected, { hopf, grade })
        : Object.is(actual, expected)
      if (gradedSpec.enforce === true && holds === false) {
        gradedSatisfied = false
      }
      return {
        grade,
        actual,
        expected,
        ...(holds === undefined ? {} : { holds }),
      }
    })
    if (gradedSpec.enforce === true && gradedTraces.some((trace) => trace.holds === false)) {
      gradedSatisfied = false
    }
  }

  const derivedOverall = unitHolds && counitHolds && involutivitySatisfied && gradedSatisfied

  return {
    left: { ...comparisons.left, holds: leftHolds },
    right: { ...comparisons.right, holds: rightHolds },
    derived: {
      unitCompatibility: { holds: unitHolds, actual: unitActual, expected: unitExpected },
      counitCompatibility: { holds: counitHolds, actual: counitActual, expected: counitExpected },
      ...(involutivity ? { involutivity } : {}),
      ...(gradedTraces ? { gradedTraces } : {}),
      overall: derivedOverall,
    },
    overall: leftHolds && rightHolds && derivedOverall,
  }
}

const materializePropertySamples = <M, Element>(
  sampling: HopfAntipodePropertySampling<M, Element>,
): ReadonlyArray<Element> => {
  const provided = sampling.samples ?? []
  const desired = sampling.sampleCount ?? provided.length
  if (sampling.resample === undefined || desired <= provided.length) {
    return desired === provided.length ? provided : provided.slice(0, desired)
  }
  const needed = Math.max(0, desired - provided.length)
  const generated = sampling.resample(needed)
  if (generated.length >= needed) {
    return [...provided, ...generated.slice(0, needed)]
  }
  return [...provided, ...generated]
}

const describePropertyElement = <M, Element>(
  sampling: HopfAntipodePropertySampling<M, Element>,
  element: Element,
): string => {
  if (sampling.describe) {
    return sampling.describe(element)
  }
  try {
    return JSON.stringify(element)
  } catch {
    return String(element)
  }
}

export const evaluateHopfAntipodeOnSamples = <M, Element>(
  comparisons: HopfAntipodeConvolutionComparisons<M>,
  sampling: HopfAntipodePropertySampling<M, Element>,
): HopfAntipodePropertySamplingReport<Element> => {
  const samples = materializePropertySamples(sampling)
  const failures: Array<HopfAntipodePropertySampleFailure<Element>> = []
  let leftFailureCount = 0
  let rightFailureCount = 0

  samples.forEach((sample) => {
    const leftActual = sampling.apply(comparisons.left.actual, sample)
    const leftExpected = sampling.apply(comparisons.left.expected, sample)
    const leftHolds = sampling.equalElements(leftActual, leftExpected)

    const rightActual = sampling.apply(comparisons.right.actual, sample)
    const rightExpected = sampling.apply(comparisons.right.expected, sample)
    const rightHolds = sampling.equalElements(rightActual, rightExpected)

    if (!leftHolds) {
      leftFailureCount += 1
    }
    if (!rightHolds) {
      rightFailureCount += 1
    }

    if (leftHolds && rightHolds) {
      return
    }

    const sampleDescription = describePropertyElement(sampling, sample)
    const failure: HopfAntipodePropertySampleFailure<Element> = {
      sample,
      sampleDescription,
      ...(leftHolds
        ? {}
        : {
            left: {
              actual: leftActual,
              expected: leftExpected,
              actualDescription: describePropertyElement(sampling, leftActual),
              expectedDescription: describePropertyElement(sampling, leftExpected),
            },
          }),
      ...(rightHolds
        ? {}
        : {
            right: {
              actual: rightActual,
              expected: rightExpected,
              actualDescription: describePropertyElement(sampling, rightActual),
              expectedDescription: describePropertyElement(sampling, rightExpected),
            },
          }),
    }
    failures.push(failure)
  })

  return {
    holds: failures.length === 0,
    samples,
    samplesTested: samples.length,
    successCount: samples.length - failures.length,
    failureCount: failures.length,
    leftFailureCount,
    rightFailureCount,
    failures,
    ...(sampling.metadata ? { metadata: sampling.metadata } : {}),
  }
}

const bialgebraMultiplyCompatibilityLeft = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
) => bialgebra.category.compose(bialgebra.comonoid.copy, bialgebra.algebra.multiply)

const bialgebraMultiplyCompatibilityRight = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
) => {
  const deltaTensorDelta = bialgebra.tensor.onMorphisms(
    bialgebra.comonoid.copy,
    bialgebra.comonoid.copy,
  )
  const swapped = bialgebra.category.compose(
    bialgebra.tensorWitnesses.middleSwap,
    deltaTensorDelta,
  )
  const muTensorMu = bialgebra.tensor.onMorphisms(
    bialgebra.algebra.multiply,
    bialgebra.algebra.multiply,
  )
  return bialgebra.category.compose(muTensorMu, swapped)
}

const bialgebraUnitCompatibilityLeft = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
) => bialgebra.category.compose(bialgebra.comonoid.copy, bialgebra.algebra.unit)

const bialgebraUnitCompatibilityRight = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
) => bialgebra.tensor.onMorphisms(bialgebra.algebra.unit, bialgebra.algebra.unit)

const bialgebraCounitCompatibilityLeft = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
) => bialgebra.category.compose(bialgebra.comonoid.discard, bialgebra.algebra.multiply)

const bialgebraCounitCompatibilityRight = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
) => bialgebra.tensor.onMorphisms(bialgebra.comonoid.discard, bialgebra.comonoid.discard)

const compatibilityWitness = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  left: M,
  right: M,
): BialgebraCompatibilityWitness<M> => ({
  left,
  right,
  holds: morphismEquality(bialgebra.category)(left, right),
})

const compatibilityComposites = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  component: BialgebraCompatibilityComponent,
): readonly [M, M] => {
  switch (component) {
    case "multiplication":
      return [
        bialgebraMultiplyCompatibilityLeft(bialgebra),
        bialgebraMultiplyCompatibilityRight(bialgebra),
      ]
    case "unit":
      return [
        bialgebraUnitCompatibilityLeft(bialgebra),
        bialgebraUnitCompatibilityRight(bialgebra),
      ]
    case "counit":
      return [
        bialgebraCounitCompatibilityLeft(bialgebra),
        bialgebraCounitCompatibilityRight(bialgebra),
      ]
    default: {
      const _exhaustiveCheck: never = component
      throw new Error(`Unknown bialgebra compatibility component: ${_exhaustiveCheck}`)
    }
  }
}

export const analyzeBialgebraCompatibilityComponent = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  component: BialgebraCompatibilityComponent,
): BialgebraCompatibilityWitness<M> => {
  const [left, right] = compatibilityComposites(bialgebra, component)
  return compatibilityWitness(bialgebra, left, right)
}

export const analyzeBialgebraCompatibility = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
): BialgebraCompatibilityDiagnostics<M> => {
  const components: Partial<Record<BialgebraCompatibilityComponent, BialgebraCompatibilityWitness<M>>> = {}
  for (const component of BIALGEBRA_COMPATIBILITY_COMPONENTS) {
    components[component] = analyzeBialgebraCompatibilityComponent(bialgebra, component)
  }
  const witnesses = components as Record<BialgebraCompatibilityComponent, BialgebraCompatibilityWitness<M>>
  const overall = BIALGEBRA_COMPATIBILITY_COMPONENTS.every((component) => witnesses[component].holds)

  return {
    ...witnesses,
    overall,
  }
}

export const ensureBialgebraCompatibility = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
): BialgebraCompatibilityDiagnostics<M> =>
  bialgebra.compatibility ?? analyzeBialgebraCompatibility(bialgebra)

export const ensureBialgebraCompatibilityComponent = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  component: BialgebraCompatibilityComponent,
): BialgebraCompatibilityWitness<M> =>
  bialgebra.compatibility?.[component] ??
  analyzeBialgebraCompatibilityComponent(bialgebra, component)

export const withBialgebraCompatibility = <O, M>(
  bialgebra: BareBialgebraStructure<O, M>,
  compatibility: BialgebraCompatibilityDiagnostics<M> = analyzeBialgebraCompatibility(bialgebra),
): BialgebraStructure<O, M> => ({
  ...bialgebra,
  compatibility,
})

/**
 * Assemble a Hopf algebra from its algebra/comonoid components while ensuring
 * the bialgebra compatibility diagnostics are populated.
 */
export const buildHopfAlgebraStructure = <O, M>(
  input: HopfAlgebraFactoryInput<O, M>,
): HopfAlgebraStructure<O, M> => {
  const { compatibility, antipode, ...bialgebraComponents } = input
  const compatibilityDiagnostics =
    compatibility ?? analyzeBialgebraCompatibility(bialgebraComponents)
  return {
    ...bialgebraComponents,
    compatibility: compatibilityDiagnostics,
    antipode,
  }
}

export const buildBraidedHopfAlgebraStructure = <O, M>(
  input: BraidedHopfAlgebraFactoryInput<O, M>,
): BraidedHopfAlgebraStructure<O, M> => {
  const hopf = buildHopfAlgebraStructure(input)
  return {
    ...hopf,
    symmetricMonoidalWitnesses: input.symmetricMonoidalWitnesses,
    ...(input.quasitriangular ? { quasitriangular: input.quasitriangular } : {}),
  }
}

const hopfTensorWitnessesFromSpec = <O, M>(
  spec: HopfAlgebraRegistrySpec<O, M>,
): BialgebraTensorWitnesses<M> => {
  if (spec.tensorWitnesses) {
    return spec.tensorWitnesses
  }
  if (spec.symmetricMonoidalWitnesses) {
    return deriveBialgebraTensorWitnessesFromSymmetricMonoidal(
      spec.category,
      spec.tensor,
      spec.symmetricMonoidalWitnesses,
      spec.algebra.object,
    )
  }
  throw new Error(
    `Hopf algebra spec "${spec.key}" is missing tensor witnesses; ` +
      "provide tensorWitnesses or symmetricMonoidalWitnesses",
  )
}

export interface HopfAlgebraRegistrySpec<O, M> {
  readonly key: string
  readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
  readonly tensor: CategoryLimits.TensorProductStructure<O, M>
  readonly algebra: AlgebraStructure<O, M>
  readonly comonoid: ComonoidStructure<O, M>
  readonly antipode: M
  readonly tensorWitnesses?: BialgebraTensorWitnesses<M>
  readonly symmetricMonoidalWitnesses?: SymmetricMonoidalWitnesses<O, M>
  readonly compatibility?: BialgebraCompatibilityDiagnostics<M>
  readonly description?: string
  readonly metadata?: Readonly<Record<string, unknown>>
}

export interface HopfAlgebraRegistryEntry<O, M> {
  readonly key: string
  readonly hopf: HopfAlgebraStructure<O, M>
  readonly description?: string
  readonly metadata?: Readonly<Record<string, unknown>>
  readonly spec: HopfAlgebraRegistrySpec<O, M>
}

export const buildHopfAlgebraFromSpec = <O, M>(
  spec: HopfAlgebraRegistrySpec<O, M>,
): HopfAlgebraStructure<O, M> =>
  buildHopfAlgebraStructure({
    category: spec.category,
    tensor: spec.tensor,
    algebra: spec.algebra,
    comonoid: spec.comonoid,
    tensorWitnesses: hopfTensorWitnessesFromSpec(spec),
    antipode: spec.antipode,
    ...(spec.compatibility ? { compatibility: spec.compatibility } : {}),
  })

export interface HopfAlgebraRegistry {
  readonly register: <O, M>(
    spec: HopfAlgebraRegistrySpec<O, M>,
  ) => HopfAlgebraRegistryEntry<O, M>
  readonly get: <O, M>(key: string) => HopfAlgebraRegistryEntry<O, M> | undefined
  readonly list: () => readonly HopfAlgebraRegistryEntry<unknown, unknown>[]
  readonly clear: () => void
}

const materializeRegistryEntry = <O, M>(
  spec: HopfAlgebraRegistrySpec<O, M>,
): HopfAlgebraRegistryEntry<O, M> => ({
  key: spec.key,
  hopf: buildHopfAlgebraFromSpec(spec),
  ...(spec.description === undefined ? {} : { description: spec.description }),
  ...(spec.metadata === undefined ? {} : { metadata: spec.metadata }),
  spec,
})

export const createHopfAlgebraRegistry = (): HopfAlgebraRegistry => {
  const entries = new Map<string, HopfAlgebraRegistryEntry<unknown, unknown>>()

  const register = <O, M>(
    spec: HopfAlgebraRegistrySpec<O, M>,
  ): HopfAlgebraRegistryEntry<O, M> => {
    const entry = materializeRegistryEntry(spec)
    entries.set(spec.key, entry as HopfAlgebraRegistryEntry<unknown, unknown>)
    return entry
  }

  const get = <O, M>(key: string) =>
    entries.get(key) as HopfAlgebraRegistryEntry<O, M> | undefined

  const list = () => Array.from(entries.values())

  const clear = () => {
    entries.clear()
  }

  return {
    register,
    get,
    list,
    clear,
  }
}

export interface HopfDualPairingWitnesses<M> {
  readonly right: M
  readonly left: M
}

export interface HopfFiniteDualWitnesses<M> {
  readonly evaluation: M
  readonly coevaluation: M
  readonly bidualEvaluation: M
  readonly pairings: HopfDualPairingWitnesses<M>
}

export interface HopfFiniteDualFormationInput<O, M> {
  readonly hopf: HopfAlgebraStructure<O, M>
  readonly dualObject: O
  readonly dualizeMorphism: (morphism: M) => M
  readonly dualTensorIsomorphism: (left: O, right: O) => MonoidalIsomorphismWitness<M>
  readonly dualUnitIsomorphism: MonoidalIsomorphismWitness<M>
  readonly evaluation: M
  readonly coevaluation: M
  readonly bidualEvaluation: M
  readonly pairings?: Partial<HopfDualPairingWitnesses<M>>
  readonly symmetricMonoidalWitnesses?: SymmetricMonoidalWitnesses<O, M>
  readonly tensorWitnesses?: BialgebraTensorWitnesses<M>
  readonly compatibility?: BialgebraCompatibilityDiagnostics<M>
}

export interface HopfFiniteDualResult<O, M> {
  readonly dual: HopfAlgebraStructure<O, M>
  readonly witnesses: HopfFiniteDualWitnesses<M>
  readonly dualTensorIsomorphism: MonoidalIsomorphismWitness<M>
  readonly dualUnitIsomorphism: MonoidalIsomorphismWitness<M>
}

export const buildHopfFiniteDual = <O, M>({
  hopf,
  dualObject,
  dualizeMorphism,
  dualTensorIsomorphism,
  dualUnitIsomorphism,
  evaluation,
  coevaluation,
  bidualEvaluation,
  pairings,
  symmetricMonoidalWitnesses,
  tensorWitnesses,
  compatibility,
}: HopfFiniteDualFormationInput<O, M>): HopfFiniteDualResult<O, M> => {
  const dualTensor = dualTensorIsomorphism(hopf.algebra.object, hopf.algebra.object)
  const dualizedCopy = dualizeMorphism(hopf.comonoid.copy)
  const dualizedMultiply = dualizeMorphism(hopf.algebra.multiply)
  const dualizedDiscard = dualizeMorphism(hopf.comonoid.discard)
  const dualizedUnit = dualizeMorphism(hopf.algebra.unit)
  const dualizedAntipode = dualizeMorphism(hopf.antipode)

  const inferredTensorWitnesses = tensorWitnesses
    ?? (symmetricMonoidalWitnesses
      ? deriveBialgebraTensorWitnessesFromSymmetricMonoidal(
          hopf.category,
          hopf.tensor,
          symmetricMonoidalWitnesses,
          dualObject,
        )
      : hopf.tensorWitnesses)

  const dualHopf = buildHopfAlgebraStructure({
    category: hopf.category,
    tensor: hopf.tensor,
    algebra: {
      object: dualObject,
      multiply: hopf.category.compose(dualizedCopy, dualTensor.forward),
      unit: hopf.category.compose(dualizedDiscard, dualUnitIsomorphism.forward),
    },
    comonoid: {
      object: dualObject,
      copy: hopf.category.compose(dualTensor.backward, dualizedMultiply),
      discard: hopf.category.compose(dualUnitIsomorphism.backward, dualizedUnit),
    },
    tensorWitnesses: inferredTensorWitnesses,
    antipode: dualizedAntipode,
    ...(compatibility ? { compatibility } : {}),
  })

  const rightPairing = pairings?.right ?? evaluation
  let leftPairing = pairings?.left
  if (!leftPairing) {
    const braiding = symmetricMonoidalWitnesses?.braiding(
      hopf.algebra.object,
      dualObject,
    ).forward
    if (!braiding) {
      throw new Error(
        "buildHopfFiniteDual: left pairing requires symmetric monoidal witnesses or an explicit pairing witness.",
      )
    }
    leftPairing = hopf.category.compose(evaluation, braiding)
  }

  const witnesses: HopfFiniteDualWitnesses<M> = {
    evaluation,
    coevaluation,
    bidualEvaluation,
    pairings: {
      right: rightPairing,
      left: leftPairing,
    },
  }

  return {
    dual: dualHopf,
    witnesses,
    dualTensorIsomorphism: dualTensor,
    dualUnitIsomorphism,
  }
}

export interface HopfIntegralAnalysisOptions<M> {
  readonly leftUnitor?: MonoidalIsomorphismWitness<M>
  readonly rightUnitor?: MonoidalIsomorphismWitness<M>
}

export interface HopfCointegralAnalysisOptions<M> {
  readonly leftUnitor?: MonoidalIsomorphismWitness<M>
  readonly rightUnitor?: MonoidalIsomorphismWitness<M>
}

export interface HopfInvarianceWitness<M> {
  readonly actual: M
  readonly expected: M
  readonly holds: boolean
}

export interface HopfIntegralDiagnostics<M> {
  readonly left?: HopfInvarianceWitness<M>
  readonly right?: HopfInvarianceWitness<M>
  readonly antipode: HopfInvarianceWitness<M>
  readonly overall: boolean
}

export interface HopfCointegralDiagnostics<M> {
  readonly left?: HopfInvarianceWitness<M>
  readonly right?: HopfInvarianceWitness<M>
  readonly antipode: HopfInvarianceWitness<M>
  readonly overall: boolean
}

export interface HopfIntegralCointegralInput<M> {
  readonly integral: M
  readonly cointegral: M
}

export interface HopfIntegralCointegralNormalizationOptions<M> {
  readonly expected?: M
}

export interface HopfIntegralCointegralOptions<M> {
  readonly integral?: HopfIntegralAnalysisOptions<M>
  readonly cointegral?: HopfCointegralAnalysisOptions<M>
  readonly normalization?: HopfIntegralCointegralNormalizationOptions<M>
}

export interface HopfIntegralCointegralDiagnostics<M> {
  readonly integral: HopfIntegralDiagnostics<M>
  readonly cointegral: HopfCointegralDiagnostics<M>
  readonly normalization: HopfInvarianceWitness<M>
  readonly overall: boolean
}

const hopfInvarianceWitness = <O, M>(
  category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  actual: M,
  expected: M,
): HopfInvarianceWitness<M> => ({
  actual,
  expected,
  holds: morphismEquality(category)(actual, expected),
})

export const analyzeHopfIntegral = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  integral: M,
  options: HopfIntegralAnalysisOptions<M> = {},
): HopfIntegralDiagnostics<M> => {
  const unitObject = hopf.category.dom(hopf.algebra.unit)
  const integralDomain = hopf.category.dom(integral)
  const integralCodomain = hopf.category.cod(integral)
  if (!Object.is(integralDomain, unitObject)) {
    throw new Error(
      "analyzeHopfIntegral: integral must originate from the tensor unit object.",
    )
  }
  if (!Object.is(integralCodomain, hopf.algebra.object)) {
    throw new Error(
      "analyzeHopfIntegral: integral must target the Hopf algebra carrier object.",
    )
  }

  const expected = hopf.category.compose(integral, hopf.comonoid.discard)

  let left: HopfInvarianceWitness<M> | undefined
  if (options.rightUnitor) {
    const idTensorIntegral = hopf.tensor.onMorphisms(
      hopf.category.id(hopf.algebra.object),
      integral,
    )
    const composite = hopf.category.compose(hopf.algebra.multiply, idTensorIntegral)
    const actual = hopf.category.compose(composite, options.rightUnitor.backward)
    left = hopfInvarianceWitness(hopf.category, actual, expected)
  }

  let right: HopfInvarianceWitness<M> | undefined
  if (options.leftUnitor) {
    const integralTensorId = hopf.tensor.onMorphisms(
      integral,
      hopf.category.id(hopf.algebra.object),
    )
    const composite = hopf.category.compose(hopf.algebra.multiply, integralTensorId)
    const actual = hopf.category.compose(composite, options.leftUnitor.backward)
    right = hopfInvarianceWitness(hopf.category, actual, expected)
  }

  const antipodeActual = hopf.category.compose(hopf.antipode, integral)
  const antipode = hopfInvarianceWitness(hopf.category, antipodeActual, integral)

  const overall =
    antipode.holds &&
    (left?.holds ?? true) &&
    (right?.holds ?? true)

  return {
    ...(left ? { left } : {}),
    ...(right ? { right } : {}),
    antipode,
    overall,
  }
}

export const analyzeHopfCointegral = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  cointegral: M,
  options: HopfCointegralAnalysisOptions<M> = {},
): HopfCointegralDiagnostics<M> => {
  const unitObject = hopf.category.dom(hopf.algebra.unit)
  const cointegralDomain = hopf.category.dom(cointegral)
  const cointegralCodomain = hopf.category.cod(cointegral)
  if (!Object.is(cointegralDomain, hopf.algebra.object)) {
    throw new Error(
      "analyzeHopfCointegral: cointegral must accept the Hopf algebra carrier object.",
    )
  }
  if (!Object.is(cointegralCodomain, unitObject)) {
    throw new Error(
      "analyzeHopfCointegral: cointegral must target the tensor unit object.",
    )
  }

  const expected = hopf.category.compose(hopf.algebra.unit, cointegral)

  let left: HopfInvarianceWitness<M> | undefined
  if (options.leftUnitor) {
    const cointegralTensorId = hopf.tensor.onMorphisms(
      cointegral,
      hopf.category.id(hopf.algebra.object),
    )
    const throughCopy = hopf.category.compose(cointegralTensorId, hopf.comonoid.copy)
    const actual = hopf.category.compose(options.leftUnitor.forward, throughCopy)
    left = hopfInvarianceWitness(hopf.category, actual, expected)
  }

  let right: HopfInvarianceWitness<M> | undefined
  if (options.rightUnitor) {
    const idTensorCointegral = hopf.tensor.onMorphisms(
      hopf.category.id(hopf.algebra.object),
      cointegral,
    )
    const throughCopy = hopf.category.compose(idTensorCointegral, hopf.comonoid.copy)
    const actual = hopf.category.compose(options.rightUnitor.forward, throughCopy)
    right = hopfInvarianceWitness(hopf.category, actual, expected)
  }

  const antipodeActual = hopf.category.compose(cointegral, hopf.antipode)
  const antipode = hopfInvarianceWitness(hopf.category, antipodeActual, cointegral)

  const overall =
    antipode.holds &&
    (left?.holds ?? true) &&
    (right?.holds ?? true)

  return {
    ...(left ? { left } : {}),
    ...(right ? { right } : {}),
    antipode,
    overall,
  }
}

export const analyzeHopfIntegralCointegralPair = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  input: HopfIntegralCointegralInput<M>,
  options: HopfIntegralCointegralOptions<M> = {},
): HopfIntegralCointegralDiagnostics<M> => {
  const integralDiagnostics = analyzeHopfIntegral(
    hopf,
    input.integral,
    options.integral,
  )
  const cointegralDiagnostics = analyzeHopfCointegral(
    hopf,
    input.cointegral,
    options.cointegral,
  )

  const unitObject = hopf.category.dom(hopf.algebra.unit)
  const expectedNormalization =
    options.normalization?.expected ?? hopf.category.id(unitObject)
  const expectedDomain = hopf.category.dom(expectedNormalization)
  const expectedCodomain = hopf.category.cod(expectedNormalization)
  if (!Object.is(expectedDomain, unitObject) || !Object.is(expectedCodomain, unitObject)) {
    throw new Error(
      "analyzeHopfIntegralCointegralPair: expected normalization morphism must be an endomorphism of the tensor unit.",
    )
  }

  const normalizationActual = hopf.category.compose(input.cointegral, input.integral)
  const normalization = hopfInvarianceWitness(
    hopf.category,
    normalizationActual,
    expectedNormalization,
  )

  const overall =
    integralDiagnostics.overall &&
    cointegralDiagnostics.overall &&
    normalization.holds

  return {
    integral: integralDiagnostics,
    cointegral: cointegralDiagnostics,
    normalization,
    overall,
  }
}

export interface HopfHalfBraidingDiagnostics<M> {
  readonly forwardThenBackward: BialgebraCompatibilityWitness<M>
  readonly backwardThenForward: BialgebraCompatibilityWitness<M>
  readonly overall: boolean
}

export const analyzeHopfHalfBraiding = <O, M>(
  category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  tensor: CategoryLimits.TensorProductStructure<O, M>,
  objects: readonly [O, O],
  halfBraiding: MonoidalIsomorphismWitness<M>,
): HopfHalfBraidingDiagnostics<M> => {
  const [leftObject, rightObject] = objects
  const domainObject = tensor.onObjects(leftObject, rightObject)
  const codomainObject = tensor.onObjects(rightObject, leftObject)
  const equality = morphismEquality(category)
  const forwardThenBackwardLeft = category.compose(halfBraiding.backward, halfBraiding.forward)
  const forwardThenBackwardRight = category.id(domainObject)
  const backwardThenForwardLeft = category.compose(halfBraiding.forward, halfBraiding.backward)
  const backwardThenForwardRight = category.id(codomainObject)
  const forwardThenBackward: BialgebraCompatibilityWitness<M> = {
    left: forwardThenBackwardLeft,
    right: forwardThenBackwardRight,
    holds: equality(forwardThenBackwardLeft, forwardThenBackwardRight),
  }
  const backwardThenForward: BialgebraCompatibilityWitness<M> = {
    left: backwardThenForwardLeft,
    right: backwardThenForwardRight,
    holds: equality(backwardThenForwardLeft, backwardThenForwardRight),
  }
  return {
    forwardThenBackward,
    backwardThenForward,
    overall: forwardThenBackward.holds && backwardThenForward.holds,
  }
}

export interface HopfDrinfeldDoubleEmbeddings<O, M> {
  readonly primal: HopfAlgebraMorphism<O, M>
  readonly dual: HopfAlgebraMorphism<O, M>
}

export interface HopfDrinfeldDoubleInput<O, M> {
  readonly braidedHopf: BraidedHopfAlgebraStructure<O, M>
  readonly dualHopf: HopfAlgebraStructure<O, M>
  readonly double: HopfAlgebraStructure<O, M>
  readonly embeddings: HopfDrinfeldDoubleEmbeddings<O, M>
  readonly halfBraiding: MonoidalIsomorphismWitness<M>
}

export interface HopfDrinfeldDoubleCentralityDiagnostics<M> {
  readonly forward: BialgebraCompatibilityWitness<M>
  readonly backward: BialgebraCompatibilityWitness<M>
  readonly overall: boolean
}

export interface HopfDrinfeldDoubleDiagnostics<M> {
  readonly primalEmbedding: HopfAlgebraMorphismDiagnostics<M>
  readonly dualEmbedding: HopfAlgebraMorphismDiagnostics<M>
  readonly halfBraiding: HopfHalfBraidingDiagnostics<M>
  readonly centrality: HopfDrinfeldDoubleCentralityDiagnostics<M>
  readonly overall: boolean
}

export const analyzeHopfDrinfeldDouble = <O, M>({
  braidedHopf,
  dualHopf,
  double,
  embeddings,
  halfBraiding,
}: HopfDrinfeldDoubleInput<O, M>): HopfDrinfeldDoubleDiagnostics<M> => {
  ensureSharedMonoidalInfrastructure(embeddings.primal)
  ensureSharedMonoidalInfrastructure(embeddings.dual)

  const halfBraidingDiagnostics = analyzeHopfHalfBraiding(
    double.category,
    double.tensor,
    [braidedHopf.algebra.object, dualHopf.algebra.object],
    halfBraiding,
  )

  const primalEmbedding = analyzeHopfAlgebraMorphism(embeddings.primal)
  const dualEmbedding = analyzeHopfAlgebraMorphism(embeddings.dual)

  const equality = morphismEquality(double.category)
  const primalThenDual = double.tensor.onMorphisms(
    embeddings.primal.arrow,
    embeddings.dual.arrow,
  )
  const dualThenPrimal = double.tensor.onMorphisms(
    embeddings.dual.arrow,
    embeddings.primal.arrow,
  )

  const forwardSwapped = double.category.compose(dualThenPrimal, halfBraiding.forward)
  const forwardLeft = double.category.compose(double.algebra.multiply, primalThenDual)
  const forwardRight = double.category.compose(double.algebra.multiply, forwardSwapped)
  const forward: BialgebraCompatibilityWitness<M> = {
    left: forwardLeft,
    right: forwardRight,
    holds: equality(forwardLeft, forwardRight),
  }

  const backwardSwapped = double.category.compose(primalThenDual, halfBraiding.backward)
  const backwardLeft = double.category.compose(double.algebra.multiply, dualThenPrimal)
  const backwardRight = double.category.compose(double.algebra.multiply, backwardSwapped)
  const backward: BialgebraCompatibilityWitness<M> = {
    left: backwardLeft,
    right: backwardRight,
    holds: equality(backwardLeft, backwardRight),
  }

  const centrality: HopfDrinfeldDoubleCentralityDiagnostics<M> = {
    forward,
    backward,
    overall: forward.holds && backward.holds,
  }

  return {
    primalEmbedding,
    dualEmbedding,
    halfBraiding: halfBraidingDiagnostics,
    centrality,
    overall:
      primalEmbedding.overall &&
      dualEmbedding.overall &&
      halfBraidingDiagnostics.overall &&
      centrality.overall,
  }
}
