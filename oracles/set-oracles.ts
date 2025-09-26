import type { AnySet } from "../set-cat";

export type OracleReport<TExtra = Record<string, unknown>> = {
  holds: boolean;
  failures: string[];
  details: TExtra;
};

const EMPTY = new Set<never>();
const ONE = new Set([null]);

const homCount = <X, Y>(domain: AnySet<X>, codomain: AnySet<Y>): number =>
  Math.pow(codomain.size, domain.size);

// ---------- Unique map from ∅ ----------
export type UniqueFromEmptyWitness<Y> = { Y: AnySet<Y> };

export const uniqueFromEmptyWitness = <Y>(Y: AnySet<Y>): UniqueFromEmptyWitness<Y> => ({ Y });

export const checkUniqueFromEmpty = <Y>(
  witness: UniqueFromEmptyWitness<Y>,
): OracleReport<{ homCount: number }> => {
  const count = homCount(EMPTY, witness.Y);
  const holds = count === 1;
  return {
    holds,
    failures: holds ? [] : [`|Hom(∅,Y)| = ${count}`],
    details: { homCount: count },
  };
};

// ---------- Empty set characterisation ----------
export type EmptyByHomsWitness<E> = {
  E: AnySet<E>;
  nonemptySamples: ReadonlyArray<AnySet<unknown>>;
};

export const emptyByHomsWitness = <E>(
  E: AnySet<E>,
  nonemptySamples: ReadonlyArray<AnySet<unknown>> = [],
): EmptyByHomsWitness<E> => ({ E, nonemptySamples });

export const checkEmptyByHoms = <E>(
  witness: EmptyByHomsWitness<E>,
): OracleReport<{ backwardCounts: Array<{ domainSize: number; homSize: number }> }> => {
  const failures: string[] = [];
  const backwardCounts: Array<{ domainSize: number; homSize: number }> = [];

  if (witness.E.size !== 0) {
    failures.push(`|E| = ${witness.E.size}`);
  }

  witness.nonemptySamples.forEach(sample => {
    if (sample.size === 0) return;
    const homSize = homCount(sample, witness.E);
    backwardCounts.push({ domainSize: sample.size, homSize });
    if (homSize !== 0) {
      failures.push(`Found X with |Hom(X,E)| = ${homSize}`);
    }
  });

  return {
    holds: failures.length === 0,
    failures,
    details: { backwardCounts },
  };
};

// ---------- Singleton characterisation ----------
export type SingletonByHomsWitness<S> = {
  S: AnySet<S>;
  universeSamples: ReadonlyArray<AnySet<unknown>>;
};

export const singletonByHomsWitness = <S>(
  S: AnySet<S>,
  universeSamples: ReadonlyArray<AnySet<unknown>>,
): SingletonByHomsWitness<S> => ({ S, universeSamples });

export const checkSingletonByHoms = <S>(
  witness: SingletonByHomsWitness<S>,
): OracleReport<{ counts: Array<{ domainSize: number; homSize: number }> }> => {
  const failures: string[] = [];
  const counts: Array<{ domainSize: number; homSize: number }> = [];

  if (witness.S.size !== 1) {
    failures.push(`|S| = ${witness.S.size}`);
  }

  witness.universeSamples.forEach(sample => {
    const homSize = homCount(sample, witness.S);
    counts.push({ domainSize: sample.size, homSize });
    if (homSize !== 1) {
      failures.push(`Found X with |Hom(X,S)| = ${homSize}`);
    }
  });

  return {
    holds: failures.length === 0,
    failures,
    details: { counts },
  };
};

// ---------- Elements as arrows ----------
export type ElementsAsArrowsWitness<A> = { A: AnySet<A> };

export const elementsAsArrowsWitness = <A>(
  A: AnySet<A>,
): ElementsAsArrowsWitness<A> => ({ A });

export const checkElementsAsArrows = <A>(
  witness: ElementsAsArrowsWitness<A>,
): OracleReport<{ homCount: number; size: number }> => {
  const count = homCount(ONE, witness.A);
  const size = witness.A.size;
  const holds = count === size;

  return {
    holds,
    failures: holds ? [] : [`|Hom(1,A)| = ${count} but |A| = ${size}`],
    details: { homCount: count, size },
  };
};

export const SetOracles = {
  uniqueFromEmpty: {
    witness: uniqueFromEmptyWitness,
    check: checkUniqueFromEmpty,
  },
  emptyByHoms: {
    witness: emptyByHomsWitness,
    check: checkEmptyByHoms,
  },
  singletonByHoms: {
    witness: singletonByHomsWitness,
    check: checkSingletonByHoms,
  },
  elementsAsArrows: {
    witness: elementsAsArrowsWitness,
    check: checkElementsAsArrows,
  },
};
