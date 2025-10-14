import type { GroupHomomorphism } from "../../../kinds/group-automorphism";
import { makeEquivalence, type EquivalenceWitness } from "../../math/Equivalence";
import {
  checkIsInverse,
  makeInverseWitness,
  isIsomorphismByInverse,
} from "./inverseWitness";

type Equality<A> = (x: A, y: A) => boolean;

const uniqueWith = <A>(values: ReadonlyArray<A>, eq: Equality<A>): A[] => {
  const result: A[] = [];
  for (const value of values) {
    if (!result.some((existing) => eq(existing, value))) {
      result.push(value);
    }
  }
  return result;
};

export interface GroupIsomorphismWitness<A, B> {
  readonly forward: GroupHomomorphism<A, B>;
  readonly backward: GroupHomomorphism<B, A>;
}

export function isIsomorphism<A, B>(
  forward: GroupHomomorphism<A, B>,
  backward: GroupHomomorphism<B, A>,
  options: {
    readonly domainSamples?: ReadonlyArray<A>;
    readonly codomainSamples?: ReadonlyArray<B>;
  } = {},
): boolean {
  const domainSamples = options.domainSamples ?? [];
  const codomainSamples = options.codomainSamples ?? [];
  if (!checkIsInverse(forward, backward, domainSamples, codomainSamples)) {
    return false;
  }
  const witness = makeInverseWitness(
    forward,
    backward,
    domainSamples,
    codomainSamples,
  );
  return isIsomorphismByInverse(witness);
}

export const makeIsomorphismEquivalence = <A, B>(options: {
  readonly domainSamples?: ReadonlyArray<A>;
  readonly codomainSamples?: ReadonlyArray<B>;
} = {}): EquivalenceWitness<GroupIsomorphismWitness<A, B>> =>
  makeEquivalence<GroupIsomorphismWitness<A, B>>((first, second) => {
    const sameForward =
      first.forward.source === second.forward.source &&
      first.forward.target === second.forward.target;
    const sameBackward =
      first.backward.source === second.backward.source &&
      first.backward.target === second.backward.target;
    if (!sameForward || !sameBackward) {
      return false;
    }
    return (
      isIsomorphism(first.forward, first.backward, options) &&
      isIsomorphism(second.forward, second.backward, options)
    );
  });

export function isMonomorphism<A, B>(
  hom: GroupHomomorphism<A, B>,
  samples: ReadonlyArray<A>,
): boolean {
  const eqDomain = hom.source.eq;
  const eqCodomain = hom.target.eq;
  const domainSamples = uniqueWith([hom.source.identity, ...samples], eqDomain);
  for (const x of domainSamples) {
    for (const y of domainSamples) {
      if (eqCodomain(hom.map(x), hom.map(y)) && !eqDomain(x, y)) {
        return false;
      }
    }
  }
  return true;
}

export function isEpimorphism<A, B>(
  hom: GroupHomomorphism<A, B>,
  domainSamples: ReadonlyArray<A>,
  codomainSamples: ReadonlyArray<B>,
): boolean {
  const eqDomain = hom.source.eq;
  const eqCodomain = hom.target.eq;
  const samples = uniqueWith([hom.source.identity, ...domainSamples], eqDomain);
  const images = samples.map((value) => hom.map(value));
  const targets = uniqueWith([hom.target.identity, ...codomainSamples], eqCodomain);
  return targets.every((targetValue) =>
    images.some((image) => eqCodomain(image, targetValue)),
  );
}
