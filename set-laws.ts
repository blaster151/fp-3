import type { AnySet, SetHom, SetObj } from "./set-cat";

import { ensureSubsetMonomorphism, SetOmega } from "./set-subobject-classifier";

const EMPTY = new Set<never>();

function cloneToSet<A>(source: AnySet<A>): SetObj<A> {
  return source instanceof Set ? (source as SetObj<A>) : (new Set(source) as SetObj<A>);
}

type CharacteristicWitness<A> = {
  readonly subset: SetObj<A>;
  readonly inclusion: SetHom<A, A>;
  readonly characteristic: SetHom<A, boolean>;
};

function enumerateSubsetWitnesses<A>(ambient: SetObj<A>): CharacteristicWitness<A>[] {
  const elements = Array.from(ambient);
  let current: Array<{ subset: SetObj<A> }> = [{ subset: new Set<A>() }];

  elements.forEach(element => {
    const next: Array<{ subset: SetObj<A> }> = [];
    current.forEach(entry => {
      const withoutElement = { subset: new Set(entry.subset) as SetObj<A> };
      const withElementSubset = new Set(entry.subset) as SetObj<A>;
      withElementSubset.add(element);
      const withElement = { subset: withElementSubset };
      next.push(withoutElement, withElement);
    });
    current = next;
  });

  return current.map(entry => buildCharacteristicWitness(entry.subset, ambient));
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

export type PowerSetEvidence<A> = {
  readonly ambient: SetObj<A>;
  readonly subsetCarrier: SetObj<SetObj<A>>;
  readonly characteristicCarrier: SetObj<SetHom<A, boolean>>;
  readonly subsets: ReadonlyArray<CharacteristicWitness<A>>;
};

function powerSetEvidence<A>(source: AnySet<A>): PowerSetEvidence<A> {
  const ambient = cloneToSet(source);
  const subsets = enumerateSubsetWitnesses(ambient);
  const subsetCarrier = new Set(subsets.map(({ subset }) => subset)) as SetObj<SetObj<A>>;
  const characteristicCarrier = new Set(subsets.map(({ characteristic }) => characteristic)) as SetObj<
    SetHom<A, boolean>
  >;
  return { ambient, subsetCarrier, characteristicCarrier, subsets };
}

export type CantorImageDiagnosis<A> = {
  readonly element: A;
  readonly imageWitness: CharacteristicWitness<A>;
  readonly diagonalValue: boolean;
  readonly imageValue: boolean;
};

export type CantorDiagonalEvidence<A> = {
  readonly diagonal: CharacteristicWitness<A>;
  readonly diagnoses: ReadonlyArray<CantorImageDiagnosis<A>>;
};

function buildCharacteristicWitness<A>(
  subset: SetObj<A>,
  ambient: SetObj<A>,
): CharacteristicWitness<A> {
  const inclusion: SetHom<A, A> = { dom: subset, cod: ambient, map: (value) => value };
  ensureSubsetMonomorphism(inclusion, "SetLaws.buildCharacteristicWitness");
  const characteristic: SetHom<A, boolean> = {
    dom: ambient,
    cod: SetOmega as SetObj<boolean>,
    map: (value) => subset.has(value),
  };
  return { subset, inclusion, characteristic };
}

function cantorDiagonalEvidence<A>(
  domain: AnySet<A>,
  mapping: (element: A) => AnySet<A>,
): CantorDiagonalEvidence<A> {
  const ambient = cloneToSet(domain);
  const diagonalMembers: A[] = [];
  const diagnoses: CantorImageDiagnosis<A>[] = [];

  for (const element of ambient) {
    const image = cloneToSet(mapping(element));
    const imageWitness = buildCharacteristicWitness(image, ambient);
    const imageValue = imageWitness.characteristic.map(element);
    const diagonalValue = imageValue === false;
    if (diagonalValue) {
      diagonalMembers.push(element);
    }
    diagnoses.push({
      element,
      imageWitness,
      diagonalValue,
      imageValue,
    });
  }

  const diagonalSubset = cloneToSet(new Set(diagonalMembers));
  const diagonal = buildCharacteristicWitness(diagonalSubset, ambient);

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

export type { AnySet, CharacteristicWitness };
