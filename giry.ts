// giry.ts — minimal measurable-space + Giry monad infrastructure
// -----------------------------------------------------------------------------
// This module provides a lightweight representation of measurable spaces and
// probability measures together with the canonical Giry monad operations. The
// focus is on compositional expressiveness: we can build probability measures
// on arbitrary measurable spaces, push them forward along measurable maps, bind
// against stochastic kernels, and form products. The representation is abstract
// enough to cover genuine (potentially non-finite) measures while remaining
// simple for finite/discrete adapters.

import type { Pair, I } from "./markov-category";
import type { Dist } from "./markov-category";

// --------------------------------------------------------------------------------
// (A) Basic measurable-space vocabulary
// --------------------------------------------------------------------------------

/** A measurable subset of X is represented by its characteristic function. */
export type MeasurableSet<X> = (x: X) => boolean;

/** Lightweight σ-algebra witness. */
export interface MeasurableSpace<X> {
  /** Human-readable label (useful in diagnostics/tests). */
  readonly label?: string;
  /** Predicate declaring whether a subset belongs to the σ-algebra. */
  readonly isMeasurable: (set: MeasurableSet<X>) => boolean;
}

/** Convenience builder for the discrete σ-algebra (all subsets measurable). */
export function discreteMeasurableSpace<X>(label?: string): MeasurableSpace<X> {
  return {
    label,
    isMeasurable: () => true,
  };
}

/** Product σ-algebra helper. */
export function productMeasurableSpace<A, B>(
  left: MeasurableSpace<A>,
  right: MeasurableSpace<B>,
  label?: string,
): MeasurableSpace<Pair<A, B>> {
  return {
    label,
    isMeasurable: (set) =>
      typeof set === "function" &&
      left.isMeasurable((a) => right.isMeasurable((b) => set([a, b]))),
  };
}

// --------------------------------------------------------------------------------
// (B) Probability measures + helpers
// --------------------------------------------------------------------------------

/** Expectation functional for integrable real-valued functions. */
export type Expectation<X> = (f: (x: X) => number) => number;

/** Core probability-measure interface for the Giry monad. */
export interface ProbabilityMeasure<X> {
  readonly space: MeasurableSpace<X>;
  readonly measure: (set: MeasurableSet<X>) => number;
  readonly expect: Expectation<X>;
}

/**
 * Helper to construct a probability measure from an expectation functional.
 * The measure of a set defaults to the expectation of its indicator.
 */
export function makeProbabilityMeasure<X>(
  space: MeasurableSpace<X>,
  expect: Expectation<X>,
  measure: (set: MeasurableSet<X>) => number = (set) => expect((x) => (set(x) ? 1 : 0)),
): ProbabilityMeasure<X> {
  return { space, measure, expect };
}

/** Dirac probability measure concentrated at a single point. */
export function diracMeasure<X>(space: MeasurableSpace<X>, value: X): ProbabilityMeasure<X> {
  return makeProbabilityMeasure(space, (f) => f(value));
}

/** Convert a finite distribution (Map-based) into a discrete probability measure. */
export function probabilityFromFinite<X>(
  space: MeasurableSpace<X>,
  dist: Dist<X>,
): ProbabilityMeasure<X> {
  const entries = Array.from(dist.entries());
  return makeProbabilityMeasure(space, (f) => {
    let acc = 0;
    for (const [x, weight] of entries) acc += weight * f(x);
    return acc;
  });
}

// --------------------------------------------------------------------------------
// (C) Giry monad core operations
// --------------------------------------------------------------------------------

/** Giry monad `return` (unit). */
export function giryOf<X>(space: MeasurableSpace<X>, value: X): ProbabilityMeasure<X> {
  return diracMeasure(space, value);
}

/** Pushforward/pullback along a measurable function. */
export function giryMap<A, B>(
  source: ProbabilityMeasure<A>,
  targetSpace: MeasurableSpace<B>,
  f: (a: A) => B,
): ProbabilityMeasure<B> {
  const expect = (g: (b: B) => number) => source.expect((a) => g(f(a)));
  const measure = (set: MeasurableSet<B>) => {
    if (!targetSpace.isMeasurable(set)) {
      throw new Error("giryMap: target set is not measurable in the codomain space");
    }
    return source.measure((a) => set(f(a)));
  };
  return makeProbabilityMeasure(targetSpace, expect, measure);
}

/** Monadic bind (Kleisli extension). */
export function giryBind<A, B>(
  source: ProbabilityMeasure<A>,
  targetSpace: MeasurableSpace<B>,
  kernel: (a: A) => ProbabilityMeasure<B>,
): ProbabilityMeasure<B> {
  const expect = (g: (b: B) => number) => source.expect((a) => kernel(a).expect(g));
  const measure = (set: MeasurableSet<B>) => {
    if (!targetSpace.isMeasurable(set)) {
      throw new Error("giryBind: target set is not measurable in the codomain space");
    }
    return source.expect((a) => kernel(a).measure(set));
  };
  return makeProbabilityMeasure(targetSpace, expect, measure);
}

/** Flatten a measure-of-measures back into a measure. */
export function giryJoin<X>(
  measureOfMeasures: ProbabilityMeasure<ProbabilityMeasure<X>>,
  targetSpace: MeasurableSpace<X>,
): ProbabilityMeasure<X> {
  return giryBind(measureOfMeasures, targetSpace, (inner) => inner);
}

/** Product measure (independent coupling). */
export function giryProduct<A, B>(
  first: ProbabilityMeasure<A>,
  second: ProbabilityMeasure<B>,
  productSpace: MeasurableSpace<Pair<A, B>>,
): ProbabilityMeasure<Pair<A, B>> {
  const expect = (h: (pair: Pair<A, B>) => number) =>
    first.expect((a) => second.expect((b) => h([a, b])));
  const measure = (set: MeasurableSet<Pair<A, B>>) => {
    if (!productSpace.isMeasurable(set)) {
      throw new Error("giryProduct: provided set is not measurable in the product space");
    }
    return first.expect((a) => second.measure((b) => set([a, b])));
  };
  return makeProbabilityMeasure(productSpace, expect, measure);
}

/** Giry monad specification record. */
export interface GiryMonadSpec {
  of<X>(space: MeasurableSpace<X>, value: X): ProbabilityMeasure<X>;
  map<A, B>(
    source: ProbabilityMeasure<A>,
    targetSpace: MeasurableSpace<B>,
    f: (a: A) => B,
  ): ProbabilityMeasure<B>;
  bind<A, B>(
    source: ProbabilityMeasure<A>,
    targetSpace: MeasurableSpace<B>,
    kernel: (a: A) => ProbabilityMeasure<B>,
  ): ProbabilityMeasure<B>;
  join<X>(
    measureOfMeasures: ProbabilityMeasure<ProbabilityMeasure<X>>,
    targetSpace: MeasurableSpace<X>,
  ): ProbabilityMeasure<X>;
  product<A, B>(
    first: ProbabilityMeasure<A>,
    second: ProbabilityMeasure<B>,
    productSpace: MeasurableSpace<Pair<A, B>>,
  ): ProbabilityMeasure<Pair<A, B>>;
}

/** Canonical Giry monad operations. */
export const GiryMonad: GiryMonadSpec = {
  of: giryOf,
  map: giryMap,
  bind: giryBind,
  join: giryJoin,
  product: giryProduct,
};

// --------------------------------------------------------------------------------
// (D) Kleisli operations for Giry kernels
// --------------------------------------------------------------------------------

export type ProbabilityKernel<X, Y> = (x: X) => ProbabilityMeasure<Y>;

export interface GiryKleisliInstance<X, Y> {
  readonly X: MeasurableSpace<X>;
  readonly Y: MeasurableSpace<Y>;
  readonly k: ProbabilityKernel<X, Y>;
  then<Z>(
    targetSpace: MeasurableSpace<Z>,
    that: GiryKleisliInstance<Y, Z>,
  ): GiryKleisliInstance<X, Z>;
  tensor<Z, W>(
    productDomain: MeasurableSpace<Pair<X, Z>>,
    productCodomain: MeasurableSpace<Pair<Y, W>>,
    that: GiryKleisliInstance<Z, W>,
  ): GiryKleisliInstance<Pair<X, Z>, Pair<Y, W>>;
}

export interface GiryKleisliOperations {
  composeK<X, Y, Z>(
    targetSpace: MeasurableSpace<Z>,
    f: ProbabilityKernel<X, Y>,
    g: ProbabilityKernel<Y, Z>,
  ): ProbabilityKernel<X, Z>;
  tensorK<X1, Y1, X2, Y2>(
    productDomain: MeasurableSpace<Pair<X1, X2>>,
    productCodomain: MeasurableSpace<Pair<Y1, Y2>>,
    f: ProbabilityKernel<X1, Y1>,
    g: ProbabilityKernel<X2, Y2>,
  ): ProbabilityKernel<Pair<X1, X2>, Pair<Y1, Y2>>;
  detKleisli<X, Y>(
    targetSpace: MeasurableSpace<Y>,
    f: (x: X) => Y,
  ): ProbabilityKernel<X, Y>;
  copyK<X>(
    space: MeasurableSpace<X>,
    productSpace: MeasurableSpace<Pair<X, X>>,
  ): ProbabilityKernel<X, Pair<X, X>>;
  discardK<X>(unitSpace: MeasurableSpace<{}>): ProbabilityKernel<X, {}>;
  swapK<X, Y>(
    productSpace: MeasurableSpace<Pair<X, Y>>,
    swappedProductSpace: MeasurableSpace<Pair<Y, X>>,
  ): ProbabilityKernel<Pair<X, Y>, Pair<Y, X>>;
  GiryKleisli: {
    new <X, Y>(
      X: MeasurableSpace<X>,
      Y: MeasurableSpace<Y>,
      k: ProbabilityKernel<X, Y>,
    ): GiryKleisliInstance<X, Y>;
  };
}

export function makeGiryKleisli(): GiryKleisliOperations {
  const composeK = <X, Y, Z>(
    targetSpace: MeasurableSpace<Z>,
    f: ProbabilityKernel<X, Y>,
    g: ProbabilityKernel<Y, Z>,
  ): ProbabilityKernel<X, Z> =>
    (x: X) => giryBind(f(x), targetSpace, g);

  const tensorK = <X1, Y1, X2, Y2>(
    productDomain: MeasurableSpace<Pair<X1, X2>>,
    productCodomain: MeasurableSpace<Pair<Y1, Y2>>,
    f: ProbabilityKernel<X1, Y1>,
    g: ProbabilityKernel<X2, Y2>,
  ): ProbabilityKernel<Pair<X1, X2>, Pair<Y1, Y2>> =>
    ([x1, x2]: Pair<X1, X2>) =>
      giryProduct(f(x1), g(x2), productCodomain);

  const detKleisli = <X, Y>(
    targetSpace: MeasurableSpace<Y>,
    f: (x: X) => Y,
  ): ProbabilityKernel<X, Y> =>
    (x: X) => giryOf(targetSpace, f(x));

  const copyK = <X>(
    space: MeasurableSpace<X>,
    productSpace: MeasurableSpace<Pair<X, X>>,
  ): ProbabilityKernel<X, Pair<X, X>> =>
    (x: X) => giryOf(productSpace, [x, x] as const);

  const discardK = <X>(
    unitSpace: MeasurableSpace<{}>,
  ): ProbabilityKernel<X, {}> => () => giryOf(unitSpace, {});

  const swapK = <X, Y>(
    _productSpace: MeasurableSpace<Pair<X, Y>>,
    swappedProductSpace: MeasurableSpace<Pair<Y, X>>,
  ): ProbabilityKernel<Pair<X, Y>, Pair<Y, X>> =>
    ([x, y]) => giryOf(swappedProductSpace, [y, x] as const);

  class GiryKleisli<X, Y> implements GiryKleisliInstance<X, Y> {
    constructor(
      public X: MeasurableSpace<X>,
      public Y: MeasurableSpace<Y>,
      public k: ProbabilityKernel<X, Y>,
    ) {}

    then<Z>(
      targetSpace: MeasurableSpace<Z>,
      that: GiryKleisliInstance<Y, Z>,
    ): GiryKleisliInstance<X, Z> {
      return new GiryKleisli(
        this.X,
        targetSpace,
        composeK(targetSpace, this.k, that.k),
      );
    }

    tensor<Z, W>(
      productDomain: MeasurableSpace<Pair<X, Z>>,
      productCodomain: MeasurableSpace<Pair<Y, W>>,
      that: GiryKleisliInstance<Z, W>,
    ): GiryKleisliInstance<Pair<X, Z>, Pair<Y, W>> {
      return new GiryKleisli(
        productDomain,
        productCodomain,
        tensorK(productDomain, productCodomain, this.k, that.k),
      );
    }
  }

  return {
    composeK,
    tensorK,
    detKleisli,
    copyK,
    discardK,
    swapK,
    GiryKleisli,
  };
}

// --------------------------------------------------------------------------------
// (E) Canonical unit measurable space for I ≅ {•}
// --------------------------------------------------------------------------------

export const IMeasurable: MeasurableSpace<I> = {
  label: "I",
  isMeasurable: () => true,
};

