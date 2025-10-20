import type { SimpleCat } from "../simple-cat";
import type {
  Functor,
  FunctorCompositionFailure,
  FunctorCompositionIgnoredPair,
  FunctorEndpointFailure,
  FunctorIdentityFailure,
} from "../functor";
import {
  checkFunctorComposition,
  checkFunctorEndpointCompatibility,
  checkFunctorIdentity,
} from "../functor";
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
  readonly arrows?: ReadonlyArray<Arr>;
}

/**
 * Structured report describing whether a functor obeyed the identity and
 * composition laws on the supplied samples.  The `details` field records the
 * precise failures so oracles can surface actionable diagnostics.
 */
export interface FunctorLawReport<
  SrcObj = unknown,
  SrcArr = unknown,
  TgtObj = unknown,
  TgtArr = unknown,
> {
  readonly preservesIdentities: boolean;
  readonly identityFailures: ReadonlyArray<
    FunctorIdentityFailure<SrcObj, TgtArr, TgtObj>
  >;
  readonly preservesComposition: boolean;
  readonly compositionFailures: ReadonlyArray<
    FunctorCompositionFailure<SrcArr, TgtArr, TgtObj>
  >;
  readonly ignoredCompositionPairs: ReadonlyArray<FunctorCompositionIgnoredPair<SrcArr>>;
  readonly respectsSourcesAndTargets: boolean;
  readonly endpointFailures: ReadonlyArray<FunctorEndpointFailure<SrcArr, TgtObj>>;
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
): FunctorLawReport<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const arrowSet = new Set<SrcArr>();
  const pushArrow = (arrow: SrcArr | undefined) => {
    if (arrow !== undefined) {
      arrowSet.add(arrow);
    }
  };

  if (samples.arrows) {
    for (const arrow of samples.arrows) {
      pushArrow(arrow);
    }
  }
  for (const pair of samples.composablePairs) {
    pushArrow(pair.f);
    pushArrow(pair.g);
  }
  if (arrowSet.size === 0) {
    for (const object of samples.objects) {
      pushArrow(source.id(object));
    }
  }

  const arrowSamples = Array.from(arrowSet);

  const objectSet = new Set<SrcObj>();
  for (const object of samples.objects) {
    objectSet.add(object);
  }
  for (const arrow of arrowSamples) {
    objectSet.add(source.src(arrow));
    objectSet.add(source.dst(arrow));
  }

  const identitySamples = Array.from(objectSet);

  const identityResult = checkFunctorIdentity(source, target, functor, identitySamples);
  const compositionResult = checkFunctorComposition(
    source,
    target,
    functor,
    samples.composablePairs,
  );
  const endpointResult = checkFunctorEndpointCompatibility(
    source,
    target,
    functor,
    arrowSamples,
  );
  const details: string[] = [];
  const [identityFailure] = identityResult.failures;
  if (!identityResult.holds && identityFailure) {
    details.push(
      `Functor failed to preserve identity at object ${String(
        identityFailure.object,
      )}: ${identityFailure.reason}.`,
    );
  }
  const [compositionFailure] = compositionResult.failures;
  if (!compositionResult.holds && compositionFailure) {
    details.push(
      `Functor failed to preserve composition on a sampled pair: ${compositionFailure.reason}.`,
    );
  }
  if (compositionResult.ignoredPairs.length > 0) {
    const ignored = compositionResult.ignoredPairs[0]!;
    details.push(
      compositionResult.ignoredPairs.length === 1
        ? `Ignored a non-composable sample pair while checking composition: ${ignored.reason}.`
        : `Ignored ${compositionResult.ignoredPairs.length} non-composable sample pairs while checking composition. First: ${ignored.reason}.`,
    );
  }
  const [endpointFailure] = endpointResult.failures;
  if (!endpointResult.holds && endpointFailure) {
    details.push(
      `Functor mapped a sampled arrow to mismatched endpoints: ${endpointFailure.reason}.`,
    );
  }
  return {
    preservesIdentities: identityResult.holds,
    identityFailures: identityResult.failures,
    preservesComposition: compositionResult.holds,
    compositionFailures: compositionResult.failures,
    ignoredCompositionPairs: compositionResult.ignoredPairs,
    respectsSourcesAndTargets: endpointResult.holds,
    endpointFailures: endpointResult.failures,
    holds: identityResult.holds && compositionResult.holds && endpointResult.holds,
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
  readonly report: FunctorLawReport<SrcObj, SrcArr, TgtObj, TgtArr>;
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
