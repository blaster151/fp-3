import type { AnySet } from "./set-cat";

const EMPTY = new Set<never>();

function cloneToSet<A>(source: AnySet<A>): Set<A> {
  return source instanceof Set ? new Set(source.values()) : new Set(source);
}

function enumeratePowerSet<A>(elements: ReadonlyArray<A>): Array<{ subset: Set<A>; characteristic: boolean[] }> {
  let current: Array<{ subset: Set<A>; characteristic: boolean[] }> = [
    { subset: new Set<A>(), characteristic: [] },
  ];

  elements.forEach(element => {
    const next: Array<{ subset: Set<A>; characteristic: boolean[] }> = [];
    current.forEach(entry => {
      const withoutElement = {
        subset: new Set(entry.subset),
        characteristic: [...entry.characteristic, false],
      };
      const withElementSubset = new Set(entry.subset);
      withElementSubset.add(element);
      const withElement = {
        subset: withElementSubset,
        characteristic: [...entry.characteristic, true],
      };
      next.push(withoutElement, withElement);
    });
    current = next;
  });

  return current.map(entry => ({
    subset: entry.subset,
    characteristic: entry.characteristic,
  }));
}

function homCount<X, Y>(domain: AnySet<X>, codomain: AnySet<Y>): number {
  return Math.pow(codomain.size, domain.size);
}

function uniqueFromEmpty<Y>(codomain: AnySet<Y>): boolean {
  return homCount(EMPTY, codomain) === 1;
}

function isEmptyByHoms<E>(candidate: AnySet<E>): boolean {
  return candidate.size === 0;
}

function isSingletonByHoms<S>(
  candidate: AnySet<S>,
  universeSamples: ReadonlyArray<AnySet<unknown>> = [],
): boolean {
  if (candidate.size !== 1) return false;
  return universeSamples.every(sample => homCount(sample, candidate) === 1);
}

type PowerSetEvidence<A> = {
  readonly carrier: AnySet<AnySet<A>>;
  readonly subsets: ReadonlyArray<{ subset: Set<A>; characteristic: boolean[] }>;
};

function powerSetEvidence<A>(source: AnySet<A>): PowerSetEvidence<A> {
  const elements = Array.from(source);
  const subsets = enumeratePowerSet(elements);
  const carrier = new Set(subsets.map(entry => entry.subset)) as AnySet<AnySet<A>>;
  return { carrier, subsets };
}

function cantorDiagonalEvidence<A>(
  domain: AnySet<A>,
  mapping: (element: A) => AnySet<A>,
): {
  readonly diagonal: Set<A>;
  readonly diagnoses: ReadonlyArray<{
    element: A;
    diagonalContains: boolean;
    imageContains: boolean;
    image: Set<A>;
  }>;
} {
  const diagonal = new Set<A>();
  const diagnoses: Array<{
    element: A;
    diagonalContains: boolean;
    imageContains: boolean;
    image: Set<A>;
  }> = [];

  for (const element of domain) {
    const image = cloneToSet(mapping(element));
    const contains = image.has(element);
    if (!contains) {
      diagonal.add(element);
    }
    diagnoses.push({
      element,
      diagonalContains: !contains,
      imageContains: contains,
      image,
    });
  }

  return { diagonal, diagnoses };
}

export type CardinalityComparisonResult = {
  readonly relation: "less" | "equal" | "greater";
  readonly leftSize: number;
  readonly rightSize: number;
  readonly difference: number;
};

function compareCardinalities<A, B>(
  left: AnySet<A>,
  right: AnySet<B>,
): CardinalityComparisonResult {
  const leftSize = left.size;
  const rightSize = right.size;
  let relation: "less" | "equal" | "greater" = "equal";
  if (leftSize < rightSize) relation = "less";
  if (leftSize > rightSize) relation = "greater";
  return {
    relation,
    leftSize,
    rightSize,
    difference: Math.abs(leftSize - rightSize),
  };
}

export const SetLaws = {
  homCount,
  uniqueFromEmpty,
  isEmptyByHoms,
  isSingletonByHoms,
  powerSetEvidence,
  cantorDiagonalEvidence,
  compareCardinalities,
};

export type { AnySet, PowerSetEvidence, CardinalityComparisonResult };
