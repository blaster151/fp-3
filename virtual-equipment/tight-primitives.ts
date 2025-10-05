import type { SimpleCat } from "../simple-cat";
import type { Functor } from "../functor";
import { preservesComposition, preservesIdentity } from "../functor";
import type {
  Adjunction,
  CatCompose,
  CatFunctor,
  CatId,
  CatNatTrans,
  CoreAdjunction,
  CoreFunctor,
} from "../allTS";
import {
  hcomp as tightHorizontalCompose2,
  idNat as tightIdentity2,
  vcomp as tightVerticalCompose2,
  whiskerLeft as tightWhiskerLeft,
  whiskerRight as tightWhiskerRight,
} from "../allTS";
import type { FiniteCategory } from "../finite-cat";
import { TwoObjectCategory, type TwoObject, type TwoArrow } from "../two-object-cat";
import { makeCoslice, makeSlice } from "../slice-cat";

/**
 * The virtual equipment layer treats the repository's existing 2-categorical
 * primitives as the "tight" side of a future equipment.  This module catalogs
 * those pieces and provides small adapters so downstream code can use a single
 * vocabulary when moving between the classic `Functor` utilities and the
 * `CatFunctor` infrastructure defined in {@link allTS.ts}.
 */

/**
 * Alias that highlights how a {@link SimpleCat} instance will act as the object
 * language for tight 1-cells once the virtual equipment is introduced.
 */
export type TightCategory<Obj, Arr> = SimpleCat<Obj, Arr>;

/**
 * Tight 1-cells are functors between the chosen tight categories.
 */
export type Tight1Cell<C, D> = CatFunctor<C, D>;

/** Helper alias matching the common "tight hom" notation C ↦ D. */
export type Tight<C, D> = Tight1Cell<C, D>;

/**
 * Tight 2-cells are natural transformations between tight 1-cells.
 */
export type Tight2Cell<
  F extends CatFunctor<unknown, unknown>,
  G extends CatFunctor<unknown, unknown>,
> = CatNatTrans<F, G>;

/** Convenience alias for natural transformations between two tight functors. */
export type TightNat<
  F extends Tight1Cell<unknown, unknown>,
  G extends Tight1Cell<unknown, unknown>,
> = Tight2Cell<F, G>;

/**
 * Identity and composition on the tight side are inherited from the existing
 * categorical utilities.  Re-exporting the type aliases keeps the eventual
 * equipment interfaces lightweight.
 */
export type TightIdentity<C> = CatId<C>;
export type TightComposition<
  F extends CatFunctor<unknown, unknown>,
  G extends CatFunctor<F["source"], unknown>,
> = CatCompose<F, G>;

export {
  tightIdentity2,
  tightVerticalCompose2,
  tightHorizontalCompose2,
  tightWhiskerLeft,
  tightWhiskerRight,
};

/**
 * Adjunction helpers from the `allTS.ts` module remain valid for the tight
 * world.  Recording the aliases here allows future relative-monad code to
 * depend on a single import path.
 */
export type TightAdjunction<
  C,
  D,
  F extends CatFunctor<C, D>,
  U extends CatFunctor<D, C>,
> = Adjunction<C, D, F, U>;
export type TightCoreAdjunction<
  CObj,
  DObj,
  F extends CoreFunctor<CObj, DObj>,
  U extends CoreFunctor<DObj, CObj>,
> = CoreAdjunction<CObj, DObj, F, U>;

/**
 * A composable pair of arrows used when checking that a functor preserves
 * composition on a finite test suite.
 */
export interface ComposablePair<Arr> {
  readonly f: Arr;
  readonly g: Arr;
}

/**
 * Samples used to verify the functor laws against concrete carriers.  The
 * repository typically works with finite presentations, so a finite list of
 * objects and composable arrow pairs is sufficient for executability.
 */
export interface FunctorCheckSamples<Obj, Arr> {
  readonly objects: ReadonlyArray<Obj>;
  readonly composablePairs: ReadonlyArray<ComposablePair<Arr>>;
}

/**
 * Structured report describing whether a functor obeyed the identity and
 * composition laws on the supplied samples.  The `details` field records the
 * precise failures so oracles can surface actionable diagnostics.
 */
export interface FunctorLawReport {
  readonly preservesIdentities: boolean;
  readonly preservesComposition: boolean;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

/**
 * Check that a functor between {@link SimpleCat} instances satisfies the usual
 * functor laws on a chosen set of witnesses.
 */
export const checkFunctorAgainstSimpleCat = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  source: SimpleCat<SrcObj, SrcArr>,
  target: SimpleCat<TgtObj, TgtArr>,
  functor: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  samples: FunctorCheckSamples<SrcObj, SrcArr>,
): FunctorLawReport => {
  const preservesIds = preservesIdentity(source, target, functor, samples.objects);
  const preservesComp = preservesComposition(source, target, functor, samples.composablePairs);
  const details: string[] = [];
  if (!preservesIds) {
    details.push("Functor failed to preserve identity arrows for at least one sampled object.");
  }
  if (!preservesComp) {
    details.push("Functor failed to preserve composition for at least one sampled arrow pair.");
  }
  return {
    preservesIdentities: preservesIds,
    preservesComposition: preservesComp,
    holds: preservesIds && preservesComp,
    details,
  };
};

/**
 * Promote an existing {@link Functor} into the `CatFunctor` representation used
 * by the richer categorical utilities.  A law report is returned alongside the
 * promoted functor so callers can thread the diagnostic data directly into
 * their oracle pipelines.
 */
export const promoteFunctor = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  source: SimpleCat<SrcObj, SrcArr>,
  target: SimpleCat<TgtObj, TgtArr>,
  functor: Functor<SrcObj, SrcArr, TgtObj, TgtArr>,
  samples: FunctorCheckSamples<SrcObj, SrcArr>,
): {
  readonly functor: CatFunctor<SimpleCat<SrcObj, SrcArr>, SimpleCat<TgtObj, TgtArr>>;
  readonly report: FunctorLawReport;
} => ({
  functor: {
    source,
    target,
    onObj: functor.F0,
    onMor: functor.F1,
  },
  report: checkFunctorAgainstSimpleCat(source, target, functor, samples),
});

/**
 * Translate a `CatFunctor` back into the lightweight `Functor` structure used
 * throughout the early parts of the codebase.
 */
export const demoteFunctor = <
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
>(
  catFunctor: CatFunctor<SimpleCat<SrcObj, SrcArr>, SimpleCat<TgtObj, TgtArr>>,
): Functor<SrcObj, SrcArr, TgtObj, TgtArr> => ({
  F0: catFunctor.onObj,
  F1: catFunctor.onMor,
});

/**
 * A small catalogue of concrete categories already present in the repository
 * that satisfy the {@link SimpleCat} interface outright.  These will act as the
 * canonical examples when the virtual equipment starts producing companions and
 * conjoints.
 */
export const canonicalTightCategories: ReadonlyArray<{
  readonly name: string;
  readonly category: FiniteCategory<TwoObject, TwoArrow>;
  readonly module: string;
}> = [
  {
    name: "TwoObjectCategory",
    category: TwoObjectCategory as FiniteCategory<TwoObject, TwoArrow>,
    module: "../two-object-cat",
  },
];

/**
 * Constructors that refine an existing finite category into its slice and
 * coslice categories.  Keeping the references here avoids scattering `import`
 * statements throughout the upcoming virtual equipment layer.
 */
export const sliceAndCosliceConstructors = {
  makeSlice,
  makeCoslice,
};

/**
 * Quick discriminator that explains whether a `FiniteCategory` already exposes
 * explicit source/target accessors.  Future equipment helpers will use this to
 * decide when additional bookkeeping wrappers are required.
 */
export const finiteCategoryHasExplicitEndpoints = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): boolean => typeof category.src === "function" && typeof category.dst === "function";
