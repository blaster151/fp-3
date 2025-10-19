import {
  compose,
  makeContinuousMap,
  type ContinuousMap,
  coproductStructure,
  type SumPoint,
} from "./ContinuousMap";
import type { Top } from "./Topology";
import { mapsEqual } from "./Embeddings";
import { quotientByRelation } from "./Quotient";
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

const describeSumPoint = <Y, Z>(
  TY: Top<Y>,
  TZ: Top<Z>,
  point: SumPoint<Y, Z>,
): string => {
  if (point.tag === "inl") {
    return `inl(${formatPoint(TY, point.value)})`;
  }
  return `inr(${formatPoint(TZ, point.value)})`;
};

type Eq<T> = (a: T, b: T) => boolean;

const buildPushoutRelation = <X, Y, Z>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Z>,
  eqSum: Eq<SumPoint<Y, Z>>,
  carrier: ReadonlyArray<SumPoint<Y, Z>>,
  embedLeft: ContinuousMap<Y, SumPoint<Y, Z>>,
  embedRight: ContinuousMap<Z, SumPoint<Y, Z>>,
): Eq<SumPoint<Y, Z>> => {
  const parent: number[] = carrier.map((_, index) => index);

  const find = (index: number): number => {
    let current = index;
    while (parent[current] !== current) {
      const next = parent[current];
      if (next === undefined) {
        break;
      }
      const jump = parent[next];
      parent[current] = jump === undefined ? next : jump;
      current = next;
    }
    return current;
  };

  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent[rootB] = rootA;
    }
  };

  const locate = (point: SumPoint<Y, Z>): number => {
    const index = carrier.findIndex((candidate) => eqSum(candidate, point));
    if (index === -1) {
      throw new Error("topPushout: coproduct point lies outside the ambient coproduct carrier.");
    }
    return index;
  };

  for (let index = 0; index < carrier.length; index += 1) {
    const point = carrier[index];
    if (point === undefined) {
      continue;
    }
    for (let other = index + 1; other < carrier.length; other += 1) {
      const candidate = carrier[other];
      if (candidate === undefined) {
        continue;
      }
      if (eqSum(point, candidate)) {
        union(index, other);
      }
    }
  }

  const leftLeg = compose(embedLeft, f);
  const rightLeg = compose(embedRight, g);
  for (const point of f.source.carrier) {
    const leftImage = leftLeg.map(point);
    const rightImage = rightLeg.map(point);
    const leftIndex = locate(leftImage);
    const rightIndex = locate(rightImage);
    union(leftIndex, rightIndex);
  }

  return (a, b) => find(locate(a)) === find(locate(b));
};

export type TopPushoutWitness<Y, Z> = {
  readonly obj: Top<ReadonlyArray<SumPoint<Y, Z>>>;
  readonly eqObj: Eq<ReadonlyArray<SumPoint<Y, Z>>>;
  readonly inl: ContinuousMap<Y, ReadonlyArray<SumPoint<Y, Z>>>;
  readonly inr: ContinuousMap<Z, ReadonlyArray<SumPoint<Y, Z>>>;
};

export interface PushoutMediatorMetadata {
  readonly reproducesLeftLeg: boolean;
  readonly reproducesRightLeg: boolean;
}

export interface PushoutFactorizationResult<X, Y, Z, W>
  extends UniversalPropertyReport<
    never,
    ContinuousMap<ReadonlyArray<SumPoint<Y, Z>>, W>,
    never,
    PushoutMediatorMetadata
  > {
  readonly mediator?: ContinuousMap<ReadonlyArray<SumPoint<Y, Z>>, W>;
}

const assertSpan = <X, Y, Z>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Z>,
): void => {
  if (f.source !== g.source) {
    throw new Error("topPushout: span legs must share the same domain topology.");
  }
  if (f.eqSource !== g.eqSource) {
    throw new Error("topPushout: span legs must share the same domain equality witness.");
  }
};

export function topPushout<X, Y, Z>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Z>,
): TopPushoutWitness<Y, Z> {
  assertSpan(f, g);

  const structure = coproductStructure(f.eqTarget, g.eqTarget, f.target, g.target);
  const relation = buildPushoutRelation(
    f,
    g,
    structure.eq,
    structure.topology.carrier,
    structure.inl,
    structure.inr,
  );

  const showClass = (cls: ReadonlyArray<SumPoint<Y, Z>>) =>
    `{ ${cls.map((point) => describeSumPoint(f.target, g.target, point)).join(", ") || "∅"} }`;

  const { topology, projection, eqClass } = quotientByRelation({
    source: structure.topology,
    eqSource: structure.eq,
    relation,
    showClass,
  });

  const inl = compose(projection, structure.inl);
  const inr = compose(projection, structure.inr);

  const viaLeft = compose(inl, f);
  const viaRight = compose(inr, g);
  if (!mapsEqual(eqClass, f.source.carrier, viaLeft.map, viaRight.map)) {
    throw new Error("topPushout: induced injections do not coequalise the span.");
  }

  return {
    obj: topology,
    eqObj: eqClass,
    inl,
    inr,
  } satisfies TopPushoutWitness<Y, Z>;
}

const assertWitnessShape = <X, Y, Z>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Z>,
  witness: TopPushoutWitness<Y, Z>,
): void => {
  if (witness.inl.target !== witness.obj || witness.inr.target !== witness.obj) {
    throw new Error("topFactorThroughPushout: pushout injections must land in the pushout topology.");
  }
  if (witness.inl.source !== f.target || witness.inr.source !== g.target) {
    throw new Error(
      "topFactorThroughPushout: injection domains must match the span codomains.",
    );
  }
  if (witness.inl.eqTarget !== witness.eqObj || witness.inr.eqTarget !== witness.eqObj) {
    throw new Error(
      "topFactorThroughPushout: injection codomain witnesses must match the pushout equality witness.",
    );
  }
  if (witness.inl.eqSource !== f.eqTarget || witness.inr.eqSource !== g.eqTarget) {
    throw new Error(
      "topFactorThroughPushout: injection domain witnesses must match the span codomain witnesses.",
    );
  }
};

const assertCoconeShape = <X, Y, Z, W>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Z>,
  left: ContinuousMap<Y, W>,
  right: ContinuousMap<Z, W>,
): void => {
  if (left.target !== right.target) {
    throw new Error("topFactorThroughPushout: cocone legs must land in the same topology.");
  }
  if (left.eqTarget !== right.eqTarget) {
    throw new Error(
      "topFactorThroughPushout: cocone legs must share the same codomain equality witness.",
    );
  }
  if (left.source !== f.target) {
    throw new Error("topFactorThroughPushout: left cocone leg must originate at the left span codomain.");
  }
  if (right.source !== g.target) {
    throw new Error(
      "topFactorThroughPushout: right cocone leg must originate at the right span codomain.",
    );
  }
  if (left.eqSource !== f.eqTarget) {
    throw new Error(
      "topFactorThroughPushout: left cocone equality witness must match the left span codomain witness.",
    );
  }
  if (right.eqSource !== g.eqTarget) {
    throw new Error(
      "topFactorThroughPushout: right cocone equality witness must match the right span codomain witness.",
    );
  }
};

const ensureCoconeCommutes = <X, Y, Z, W>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Z>,
  left: ContinuousMap<Y, W>,
  right: ContinuousMap<Z, W>,
): void => {
  const eqW = left.eqTarget;
  const viaLeft = compose(left, f);
  const viaRight = compose(right, g);
  if (!mapsEqual(eqW, f.source.carrier, viaLeft.map, viaRight.map)) {
    throw new Error("topFactorThroughPushout: cocone does not equalise the span.");
  }
};

export function topFactorThroughPushout<X, Y, Z, W>(
  f: ContinuousMap<X, Y>,
  g: ContinuousMap<X, Z>,
  witness: TopPushoutWitness<Y, Z>,
  left: ContinuousMap<Y, W>,
  right: ContinuousMap<Z, W>,
): PushoutFactorizationResult<X, Y, Z, W> {
  try {
    assertSpan(f, g);
    assertWitnessShape(f, g, witness);
    assertCoconeShape(f, g, left, right);
    ensureCoconeCommutes(f, g, left, right);

    const eqW = left.eqTarget;
    const evaluate = (point: SumPoint<Y, Z>): W => {
      if (point.tag === "inl") {
        return left.map(point.value);
      }
      return right.map(point.value);
    };

    const mediatorMap = (cls: ReadonlyArray<SumPoint<Y, Z>>): W => {
      const representative = cls[0];
      if (representative === undefined) {
        throw new Error("topFactorThroughPushout: encountered an empty equivalence class.");
      }
      const image = evaluate(representative);
      for (const member of cls) {
        const memberImage = evaluate(member);
        if (!eqW(image, memberImage)) {
          const label = `{ ${cls
            .map((point) => describeSumPoint(f.target, g.target, point))
            .join(", ") || "∅"} }`;
          throw new Error(
            `topFactorThroughPushout: cocone is not constant on ${label}.`,
          );
        }
      }
      return image;
    };

    const mediator = makeContinuousMap({
      source: witness.obj,
      target: left.target,
      eqSource: witness.eqObj,
      eqTarget: eqW,
      map: mediatorMap,
    });

    const reproduceLeft = compose(mediator, witness.inl);
    if (!mapsEqual(eqW, f.target.carrier, reproduceLeft.map, left.map)) {
      throw new Error(
        "topFactorThroughPushout: constructed mediator does not reproduce the left cocone leg.",
      );
    }

    const reproduceRight = compose(mediator, witness.inr);
    if (!mapsEqual(eqW, g.target.carrier, reproduceRight.map, right.map)) {
      throw new Error(
        "topFactorThroughPushout: constructed mediator does not reproduce the right cocone leg.",
      );
    }

    const mediatorEntry = {
      mediator: makeMediator<
        ContinuousMap<ReadonlyArray<SumPoint<Y, Z>>, W>,
        PushoutMediatorMetadata
      >("pushout mediator", mediator, {
        reproducesLeftLeg: true,
        reproducesRightLeg: true,
      }),
      holds: true,
      metadata: { reproducesLeftLeg: true, reproducesRightLeg: true },
    };

    const report = makeUniversalPropertyReport<
      never,
      ContinuousMap<ReadonlyArray<SumPoint<Y, Z>>, W>,
      never,
      PushoutMediatorMetadata
    >({
      mediators: [mediatorEntry],
    });

    return { ...report, mediator } satisfies PushoutFactorizationResult<X, Y, Z, W>;
  } catch (error) {
    const failure = error instanceof Error ? error.message : String(error);
    const mediatorEntry = {
      mediator: makeMediator<
        ContinuousMap<ReadonlyArray<SumPoint<Y, Z>>, W>,
        PushoutMediatorMetadata
      >("pushout mediator", undefined, {
        reproducesLeftLeg: false,
        reproducesRightLeg: false,
      }),
      holds: false,
      failure,
      metadata: { reproducesLeftLeg: false, reproducesRightLeg: false },
    };

    const report = makeUniversalPropertyReport<
      never,
      ContinuousMap<ReadonlyArray<SumPoint<Y, Z>>, W>,
      never,
      PushoutMediatorMetadata
    >({
      mediators: [mediatorEntry],
    });

    return report satisfies PushoutFactorizationResult<X, Y, Z, W>;
  }
}
