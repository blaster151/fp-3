import { AnySet } from "./set-cat";

const EMPTY = new Set<never>();

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

export const SetLaws = {
  homCount,
  uniqueFromEmpty,
  isEmptyByHoms,
  isSingletonByHoms,
};

export type { AnySet };
