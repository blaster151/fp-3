import { subspace } from "./Subspace";
import {
  compose,
  makeContinuousMap,
  type ContinuousMap,
  productStructure,
  type ProductPoint,
} from "./ContinuousMap";
import type { Top } from "./Topology";
import { mapsEqual } from "./Embeddings";
import { makeMediator, makeUniversalPropertyReport, type UniversalPropertyReport } from "./limits";

const formatPoint = <X>(space: Top<X>, value: X): string => {
  const { show } = space;
  if (show !== undefined) {
    return show(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

type Eq<T> = (a: T, b: T) => boolean;

export type TopPullbackWitness<X, Y> = {
  readonly obj: Top<ProductPoint<X, Y>>;
  readonly eqObj: Eq<ProductPoint<X, Y>>;
  readonly proj1: ContinuousMap<ProductPoint<X, Y>, X>;
  readonly proj2: ContinuousMap<ProductPoint<X, Y>, Y>;
};

export interface PullbackMediatorMetadata {
  readonly reproducesLeftLeg: boolean;
  readonly reproducesRightLeg: boolean;
}

export interface PullbackFactorizationResult<W, X, Y>
  extends UniversalPropertyReport<
    never,
    ContinuousMap<W, ProductPoint<X, Y>>,
    never,
    PullbackMediatorMetadata
  > {
  readonly mediator?: ContinuousMap<W, ProductPoint<X, Y>>;
}

const assertCospan = <X, Y, Z>(
  f: ContinuousMap<X, Z>,
  g: ContinuousMap<Y, Z>,
): void => {
  if (f.target !== g.target) {
    throw new Error(
      "topPullback: expected cospan legs to land in the same codomain topology.",
    );
  }
  if (f.eqTarget !== g.eqTarget) {
    throw new Error(
      "topPullback: expected cospan legs to share the same codomain equality witness.",
    );
  }
};

export function topPullback<X, Y, Z>(
  f: ContinuousMap<X, Z>,
  g: ContinuousMap<Y, Z>,
): TopPullbackWitness<X, Y> {
  assertCospan(f, g);

  const productInfo = productStructure(f.eqSource, g.eqSource, f.source, g.source);
  const eqZ = f.eqTarget;

  const fibre = productInfo.topology.carrier.filter((point) =>
    eqZ(f.map(point.x), g.map(point.y)),
  );
  const topology = subspace(productInfo.eq, productInfo.topology, fibre);

  const proj1 = makeContinuousMap({
    source: topology,
    target: f.source,
    eqSource: productInfo.eq,
    eqTarget: f.eqSource,
    map: (point: ProductPoint<X, Y>) => point.x,
  });
  const proj2 = makeContinuousMap({
    source: topology,
    target: g.source,
    eqSource: productInfo.eq,
    eqTarget: g.eqSource,
    map: (point: ProductPoint<X, Y>) => point.y,
  });

  const viaF = compose(f, proj1);
  const viaG = compose(g, proj2);
  if (!mapsEqual(eqZ, topology.carrier, viaF.map, viaG.map)) {
    throw new Error("topPullback: induced projections do not equalise the cospan.");
  }

  return {
    obj: topology,
    eqObj: productInfo.eq,
    proj1,
    proj2,
  } satisfies TopPullbackWitness<X, Y>;
}

const assertConeShape = <W, X, Y>(
  left: ContinuousMap<W, X>,
  right: ContinuousMap<W, Y>,
): void => {
  if (left.source !== right.source) {
    throw new Error(
      "topFactorThroughPullback: cone legs must share a common domain topology.",
    );
  }
  if (left.eqSource !== right.eqSource) {
    throw new Error(
      "topFactorThroughPullback: cone legs must share the same domain equality witness.",
    );
  }
};

const assertWitnessShape = <X, Y, Z>(
  f: ContinuousMap<X, Z>,
  g: ContinuousMap<Y, Z>,
  witness: TopPullbackWitness<X, Y>,
): void => {
  if (witness.proj1.source !== witness.obj || witness.proj2.source !== witness.obj) {
    throw new Error(
      "topFactorThroughPullback: pullback projections must originate at the pullback topology.",
    );
  }
  if (witness.proj1.target !== f.source || witness.proj2.target !== g.source) {
    throw new Error(
      "topFactorThroughPullback: projection codomains must match the cospan domains.",
    );
  }
  if (witness.proj1.eqSource !== witness.eqObj || witness.proj2.eqSource !== witness.eqObj) {
    throw new Error(
      "topFactorThroughPullback: projection equality witnesses must match the pullback equality witness.",
    );
  }
  if (witness.proj1.eqTarget !== f.eqSource || witness.proj2.eqTarget !== g.eqSource) {
    throw new Error(
      "topFactorThroughPullback: projection codomain equality witnesses must match the cospan domain witnesses.",
    );
  }
};

const ensureConeCommutes = <W, X, Y, Z>(
  f: ContinuousMap<X, Z>,
  g: ContinuousMap<Y, Z>,
  left: ContinuousMap<W, X>,
  right: ContinuousMap<W, Y>,
): void => {
  const eqZ = f.eqTarget;
  const viaLeft = compose(f, left);
  const viaRight = compose(g, right);
  if (!mapsEqual(eqZ, left.source.carrier, viaLeft.map, viaRight.map)) {
    throw new Error(
      "topFactorThroughPullback: supplied cone does not commute with the cospan.",
    );
  }
};

export function topFactorThroughPullback<W, X, Y, Z>(
  f: ContinuousMap<X, Z>,
  g: ContinuousMap<Y, Z>,
  witness: TopPullbackWitness<X, Y>,
  left: ContinuousMap<W, X>,
  right: ContinuousMap<W, Y>,
): PullbackFactorizationResult<W, X, Y> {
  try {
    assertCospan(f, g);
    assertWitnessShape(f, g, witness);
    assertConeShape(left, right);
    ensureConeCommutes(f, g, left, right);

    const eqPullback = witness.eqObj;
    const mediatorMap = (point: W): ProductPoint<X, Y> => {
      const imageX = left.map(point);
      const imageY = right.map(point);
      const located = witness.obj.carrier.find((candidate) =>
        eqPullback(candidate, { x: imageX, y: imageY }),
      );
      if (located === undefined) {
        const pointLabel = formatPoint(left.source, point);
        const imageLabel = `(${formatPoint(left.target, imageX)}, ${formatPoint(right.target, imageY)})`;
        throw new Error(
          `topFactorThroughPullback: cone lands outside the pullback at ${pointLabel} -> ${imageLabel}.`,
        );
      }
      return located;
    };

    const mediator = makeContinuousMap({
      source: left.source,
      target: witness.obj,
      eqSource: left.eqSource,
      eqTarget: eqPullback,
      map: mediatorMap,
    });

    const reproduceLeft = compose(witness.proj1, mediator);
    if (!mapsEqual(left.eqTarget, left.source.carrier, reproduceLeft.map, left.map)) {
      throw new Error(
        "topFactorThroughPullback: constructed mediator does not reproduce the left cone leg.",
      );
    }

    const reproduceRight = compose(witness.proj2, mediator);
    if (!mapsEqual(right.eqTarget, right.source.carrier, reproduceRight.map, right.map)) {
      throw new Error(
        "topFactorThroughPullback: constructed mediator does not reproduce the right cone leg.",
      );
    }

    const mediatorEntry = {
      mediator: makeMediator<ContinuousMap<W, ProductPoint<X, Y>>, PullbackMediatorMetadata>(
        "pullback mediator",
        mediator,
        { reproducesLeftLeg: true, reproducesRightLeg: true },
      ),
      holds: true,
      metadata: { reproducesLeftLeg: true, reproducesRightLeg: true },
    };

    const report = makeUniversalPropertyReport<
      never,
      ContinuousMap<W, ProductPoint<X, Y>>,
      never,
      PullbackMediatorMetadata
    >({
      mediators: [mediatorEntry],
    });

    return { ...report, mediator } satisfies PullbackFactorizationResult<W, X, Y>;
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    const mediatorEntry = {
      mediator: makeMediator<ContinuousMap<W, ProductPoint<X, Y>>, PullbackMediatorMetadata>(
        "pullback mediator",
        undefined,
        { reproducesLeftLeg: false, reproducesRightLeg: false },
      ),
      holds: false,
      failure,
      metadata: { reproducesLeftLeg: false, reproducesRightLeg: false },
    };

    const report = makeUniversalPropertyReport<
      never,
      ContinuousMap<W, ProductPoint<X, Y>>,
      never,
      PullbackMediatorMetadata
    >({
      mediators: [mediatorEntry],
    });

    return report satisfies PullbackFactorizationResult<W, X, Y>;
  }
}
