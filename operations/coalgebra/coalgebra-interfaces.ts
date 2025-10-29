import type { Category } from "../../stdlib/category"
import type { ArrowFamilies } from "../../stdlib/arrow-families"
import type { CategoryLimits } from "../../stdlib/category-limits"

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

/** Equality-focused diagnostics for both sides of the antipode equations. */
export interface HopfAntipodeDiagnostics<M> {
  readonly left: HopfAntipodeConvolutionDiagnostics<M>
  readonly right: HopfAntipodeConvolutionDiagnostics<M>
  readonly overall: boolean
}

/**
 * Compare the convolution composites S * id and id * S against the
 * convolution identity η ∘ ε. Later passes will supply the actual
 * convolution data via the `comparisons` argument.
 */
export const analyzeHopfAntipode = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  comparisons: HopfAntipodeConvolutionComparisons<M>,
): HopfAntipodeDiagnostics<M> => {
  const equality = morphismEquality(hopf.category)
  const leftHolds = equality(comparisons.left.actual, comparisons.left.expected)
  const rightHolds = equality(comparisons.right.actual, comparisons.right.expected)
  return {
    left: { ...comparisons.left, holds: leftHolds },
    right: { ...comparisons.right, holds: rightHolds },
    overall: leftHolds && rightHolds,
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
