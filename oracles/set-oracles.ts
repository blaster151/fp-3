import type {
  BinaryProductComponentwiseCollapseInput,
  BinaryProductComponentwiseInput,
  BinaryProductNaturalityInput,
  BinaryProductTuple,
} from "../category-limits-helpers";
import {
  checkBinaryProductComponentwiseCollapse,
  checkBinaryProductNaturality,
  makeBinaryProductComponentwise,
} from "../category-limits-helpers";
import type { AnySet, Coproduct, SetHom, SetObj } from "../set-cat";
import { SetCat, composeSet } from "../set-cat";

export type OracleReport<TExtra = Record<string, unknown>> = {
  holds: boolean;
  failures: string[];
  details: TExtra;
};

const EMPTY = new Set<never>();
const ONE = new Set([null]);

const homCount = <X, Y>(domain: AnySet<X>, codomain: AnySet<Y>): number =>
  Math.pow(codomain.size, domain.size);

type SetObject = AnySet<unknown>;
type SetMorphism = SetHom<any, any>;

const ensureSetObj = <T>(carrier: AnySet<T>, context: string): SetObj<T> => {
  if (!(carrier instanceof Set)) {
    throw new Error(`${context}: expected a concrete Set instance`);
  }
  return carrier as SetObj<T>;
};

const composeSetMorphisms = (g: SetMorphism, f: SetMorphism): SetMorphism =>
  composeSet(g as SetHom<unknown, unknown>, f as SetHom<unknown, unknown>) as SetMorphism;

const equalSetMorphisms = (left: SetMorphism, right: SetMorphism): boolean => {
  if (left.dom !== right.dom || left.cod !== right.cod) {
    return false;
  }

  const domain = left.dom as SetObject;
  for (const element of domain) {
    if (!Object.is(left.map(element), right.map(element))) {
      return false;
    }
  }

  return true;
};

const setCategoryForHelpers = {
  compose: composeSetMorphisms,
  eq: equalSetMorphisms,
};

const setCategoryForComponentwise = {
  compose: composeSetMorphisms,
};

export interface SetBinaryProductWitness<A, B> {
  readonly left: AnySet<A>;
  readonly right: AnySet<B>;
  readonly product: BinaryProductTuple<SetObject, SetMorphism>;
  readonly componentwise: (
    input: Omit<BinaryProductComponentwiseInput<SetObject, SetMorphism>, "category">
  ) => SetMorphism;
  readonly checkComponentwiseCollapse: (
    input: Omit<BinaryProductComponentwiseCollapseInput<SetObject, SetMorphism>, "category">
  ) => boolean;
  readonly checkNaturality: (
    input: Omit<BinaryProductNaturalityInput<SetObject, SetMorphism>, "category">
  ) => boolean;
}

export const setBinaryProductWitness = <A, B>(
  left: AnySet<A>,
  right: AnySet<B>,
): SetBinaryProductWitness<A, B> => {
  const leftObj = ensureSetObj(left, "setBinaryProductWitness");
  const rightObj = ensureSetObj(right, "setBinaryProductWitness");
  const data = SetCat.product(leftObj, rightObj);
  const product: BinaryProductTuple<SetObject, SetMorphism> = {
    object: data.object,
    projections: [data.projections.fst, data.projections.snd],
    tuple: (domain, legs) => {
      if (legs.length !== 2) {
        throw new Error(
          `setBinaryProductWitness: expected 2 legs for pairing, received ${legs.length}`,
        );
      }

      const [leftLeg, rightLeg] = legs;

      if (leftLeg.dom !== domain || rightLeg.dom !== domain) {
        throw new Error("setBinaryProductWitness: pairing legs must share the supplied domain");
      }

      if (leftLeg.cod !== leftObj || rightLeg.cod !== rightObj) {
        throw new Error(
          "setBinaryProductWitness: pairing legs must land in the declared product factors",
        );
      }

      return data.pair(leftLeg as SetHom<unknown, A>, rightLeg as SetHom<unknown, B>);
    },
  };

  return {
    left,
    right,
    product,
    componentwise: input =>
      makeBinaryProductComponentwise({
        category: setCategoryForComponentwise,
        ...input,
      }),
    checkComponentwiseCollapse: input =>
      checkBinaryProductComponentwiseCollapse({
        category: setCategoryForHelpers,
        ...input,
      }),
    checkNaturality: input =>
      checkBinaryProductNaturality({
        category: setCategoryForHelpers,
        ...input,
      }),
  };
};

export interface SetBinaryCoproductWitness<A, B> {
  readonly left: AnySet<A>;
  readonly right: AnySet<B>;
  readonly coproduct: AnySet<Coproduct<A, B>>;
  readonly injections: readonly [SetHom<A, Coproduct<A, B>>, SetHom<B, Coproduct<A, B>>];
  readonly copair: <X>(
    target: AnySet<X>,
    legs: readonly [SetHom<A, X>, SetHom<B, X>],
  ) => SetHom<Coproduct<A, B>, X>;
  readonly checkCopairCollapse: <X>(input: {
    readonly target: AnySet<X>;
    readonly mediator: SetHom<Coproduct<A, B>, X>;
    readonly legs: readonly [SetHom<A, X>, SetHom<B, X>];
  }) => { readonly holds: boolean; readonly failures: string[] };
}

export const setBinaryCoproductWitness = <A, B>(
  left: AnySet<A>,
  right: AnySet<B>,
): SetBinaryCoproductWitness<A, B> => {
  const leftObj = ensureSetObj(left, "setBinaryCoproductWitness");
  const rightObj = ensureSetObj(right, "setBinaryCoproductWitness");
  const data = SetCat.coproduct(leftObj, rightObj);
  const injections = [data.injections.inl, data.injections.inr] as const;

  return {
    left,
    right,
    coproduct: data.object,
    injections,
    copair: (target, legs) => {
      const [fromLeft, fromRight] = legs;

      if (fromLeft.dom !== leftObj || fromRight.dom !== rightObj) {
        throw new Error("setBinaryCoproductWitness: copair legs must originate from the declared summands");
      }

      if (fromLeft.cod !== target || fromRight.cod !== target) {
        throw new Error("setBinaryCoproductWitness: copair legs must land in the declared target set");
      }

      return data.copair(fromLeft, fromRight);
    },
    checkCopairCollapse: ({ target, mediator, legs }) => {
      const failures: string[] = [];
      const [fromLeft, fromRight] = legs;

      if (mediator.dom !== data.object) {
        failures.push("copair collapse: mediator must have the coproduct as its domain");
      }

      if (mediator.cod !== target) {
        failures.push("copair collapse: mediator must land in the declared target set");
      }

      if (fromLeft.dom !== leftObj) {
        failures.push("copair collapse: left leg domain must match the left summand");
      }

      if (fromRight.dom !== rightObj) {
        failures.push("copair collapse: right leg domain must match the right summand");
      }

      if (fromLeft.cod !== target || fromRight.cod !== target) {
        failures.push("copair collapse: legs must land in the declared target set");
      }

      if (failures.length > 0) {
        return { holds: false, failures };
      }

      const leftComposite = composeSetMorphisms(mediator, injections[0]);
      const rightComposite = composeSetMorphisms(mediator, injections[1]);

      if (!equalSetMorphisms(leftComposite, fromLeft)) {
        failures.push("copair collapse: mediator ∘ inl must recover the left leg");
      }

      if (!equalSetMorphisms(rightComposite, fromRight)) {
        failures.push("copair collapse: mediator ∘ inr must recover the right leg");
      }

      return { holds: failures.length === 0, failures };
    },
  };
};

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

const cardinalityOracles = {
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
} as const;

export const SetOracles = {
  product: {
    witness: setBinaryProductWitness,
  },
  coproduct: {
    witness: setBinaryCoproductWitness,
  },
  ...cardinalityOracles,
  cardinality: cardinalityOracles,
};
