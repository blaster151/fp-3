import type { Category } from "../../stdlib/category"
import type { ArrowFamilies } from "../../stdlib/arrow-families"

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
