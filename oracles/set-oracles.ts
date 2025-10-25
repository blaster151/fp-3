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
import type {
  AnySet,
  Coproduct,
  ProductData,
  SetHom,
  SetObj,
  ExponentialArrow,
  SetTerminalObject,
} from "../set-cat";
import { SetCat, composeSet, ensureSubsetMonomorphism } from "../set-cat";
import { SetLaws } from "../set-laws";
import { CategoryLimits } from "../stdlib/category-limits";
import {
  SetSubobjectClassifier,
  SetNaturalNumbersObject,
  SetCartesianClosed,
  SetCoproductsWithCotuple,
} from "../set-subobject-classifier";
import type {
  CardinalityComparisonResult,
  CantorImageDiagnosis,
  CharacteristicWitness,
} from "../set-laws";

export type OracleReport<TExtra = Record<string, unknown>> = {
  holds: boolean;
  failures: string[];
  details: TExtra;
};

const EMPTY = new Set<never>();
const ONE = new Set([null]);

const homCount = <X, Y>(domain: AnySet<X>, codomain: AnySet<Y>): number =>
  Math.pow(codomain.size, domain.size);

type SetObject = SetObj<unknown>;
type SetMorphism = SetHom<any, any>;

const setSubobjectClassifierWithEqualizers =
  SetSubobjectClassifier as typeof SetSubobjectClassifier &
    CategoryLimits.HasEqualizers<SetObject, SetMorphism>;

const ensureSetObj = <T>(carrier: AnySet<T>, context: string): SetObj<T> => {
  if (typeof (carrier as SetObj<T>).has !== "function" || typeof (carrier as SetObj<T>)[Symbol.iterator] !== "function") {
    throw new Error(`${context}: expected an object supporting Set iteration and membership`);
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

const setNaturalNumbersZeroSeparation = () =>
  CategoryLimits.certifyNaturalNumbersZeroSeparation({
    category: setSubobjectClassifierWithEqualizers,
    natural: SetNaturalNumbersObject,
    classifier: SetSubobjectClassifier,
    equalMor: equalSetMorphisms,
    label: "Set ℕ zero/successor separation",
  });

const setNaturalNumbersInduction = () => {
  const inclusion = SetCat.id(SetNaturalNumbersObject.carrier) as SetMorphism;
  return CategoryLimits.certifyNaturalNumbersInduction({
    category: setSubobjectClassifierWithEqualizers,
    natural: SetNaturalNumbersObject,
    inclusion,
    zeroLift: SetNaturalNumbersObject.zero as SetMorphism,
    successorLift: SetNaturalNumbersObject.successor as SetMorphism,
    equalMor: equalSetMorphisms,
    ensureMonomorphism: (arrow) =>
      ensureSubsetMonomorphism(arrow as SetHom<unknown, unknown>, "Set ℕ induction"),
    label: "Set ℕ identity inclusion",
  });
};

const setNaturalNumbersPrimitiveRecursion = () => {
  const parameter = SetSubobjectClassifier.terminalObj as SetObject;
  const target = SetNaturalNumbersObject.carrier as SetObject;
  const product = SetCat.product(target as SetObj<number>, parameter as SetObj<unknown>);
  const step = SetCat.hom(product.object, target as SetObj<number>, (pair) => {
    const [current] = pair as readonly [number, unknown];
    return SetNaturalNumbersObject.successor.map(current);
  });
  const baseArrow = SetCat.hom(
    parameter as SetObj<unknown>,
    target as SetObj<number>,
    (point) => SetNaturalNumbersObject.zero.map(point as SetTerminalObject),
  );

  return CategoryLimits.naturalNumbersPrimitiveRecursion<SetObject, SetMorphism>({
    category: setSubobjectClassifierWithEqualizers,
    natural: SetNaturalNumbersObject,
    cartesianClosed: SetCartesianClosed,
    parameter,
    target,
    base: baseArrow as unknown as SetMorphism,
    step: step as SetMorphism,
    equalMor: equalSetMorphisms,
    label: "Set ℕ primitive recursion",
  });
};

const setNaturalNumbersInitialAlgebra = () => {
  const target = SetNaturalNumbersObject.carrier as SetObject;
  const terminal = SetSubobjectClassifier.terminalObj as SetObject;
  const canonical = SetCat.coproduct(terminal as SetObj<unknown>, target as SetObj<number>);
  const zeroLift = SetCat.hom(
    terminal as SetObj<unknown>,
    target as SetObj<number>,
    (point) => SetNaturalNumbersObject.zero.map(point as SetTerminalObject),
  );
  const algebra = canonical.copair(
    zeroLift,
    SetNaturalNumbersObject.successor,
  );

  return CategoryLimits.naturalNumbersInitialAlgebra({
    category: setSubobjectClassifierWithEqualizers,
    natural: SetNaturalNumbersObject,
    coproducts: SetCoproductsWithCotuple,
    target,
    algebra: algebra as SetMorphism,
    equalMor: equalSetMorphisms,
    label: "Set ℕ canonical algebra",
  });
};

const setNaturalNumbersOracles = {
  zeroSeparation: setNaturalNumbersZeroSeparation,
  induction: setNaturalNumbersInduction,
  primitiveRecursion: setNaturalNumbersPrimitiveRecursion,
  initialAlgebra: setNaturalNumbersInitialAlgebra,
} as const;

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

// ---------- Exponentials ----------
export interface SetExponentialWitness<A, B> {
  readonly base: AnySet<A>;
  readonly codomain: AnySet<B>;
  readonly exponential: AnySet<ExponentialArrow<A, B>>;
  readonly evaluation: SetHom<readonly [ExponentialArrow<A, B>, A], B>;
  readonly evaluationProduct: ProductData<ExponentialArrow<A, B>, A>;
  readonly curry: <X>(input: {
    readonly domain: AnySet<X>;
    readonly product?: ProductData<X, A>;
    readonly mediator: SetHom<readonly [X, A], B>;
  }) => SetHom<X, ExponentialArrow<A, B>>;
  readonly uncurry: <X>(input: {
    readonly product?: ProductData<X, A>;
    readonly morphism: SetHom<X, ExponentialArrow<A, B>>;
  }) => SetHom<readonly [X, A], B>;
  readonly checkEvaluationTriangle: <X>(input: {
    readonly domain: AnySet<X>;
    readonly product?: ProductData<X, A>;
    readonly mediator: SetHom<readonly [X, A], B>;
  }) => OracleReport<{ transpose?: SetHom<X, ExponentialArrow<A, B>> }>;
  readonly checkCurryUniqueness: <X>(input: {
    readonly domain: AnySet<X>;
    readonly product?: ProductData<X, A>;
    readonly mediator: SetHom<readonly [X, A], B>;
    readonly candidate: SetHom<X, ExponentialArrow<A, B>>;
  }) => OracleReport<{ canonical: SetHom<X, ExponentialArrow<A, B>> }>;
  readonly checkUncurryRoundTrip: <X>(input: {
    readonly domain: AnySet<X>;
    readonly product?: ProductData<X, A>;
    readonly mediator: SetHom<readonly [X, A], B>;
  }) => OracleReport<{ transpose?: SetHom<X, ExponentialArrow<A, B>> }>;
}

const ensureProductData = <X, A>(
  domain: SetObj<X>,
  base: SetObj<A>,
  product: ProductData<X, A> | undefined,
  context: string,
): ProductData<X, A> => {
  if (!product) {
    return SetCat.product(domain, base);
  }
  if (product.projections.fst.cod !== domain) {
    throw new Error(`${context}: product first projection must land in the supplied domain`);
  }
  if (product.projections.snd.cod !== base) {
    throw new Error(`${context}: product second projection must land in the supplied base set`);
  }
  return product;
};

const verifyMediatorCompatibility = <X, A, B>(
  product: ProductData<X, A>,
  mediator: SetHom<readonly [X, A], B>,
  codomain: SetObj<B>,
  context: string,
): string[] => {
  const failures: string[] = [];
  if (mediator.dom !== product.object) {
    failures.push(`${context}: mediator must have the supplied product as its domain`);
  }
  if (mediator.cod !== codomain) {
    failures.push(`${context}: mediator must land in the declared codomain`);
  }
  return failures;
};

export const setExponentialWitness = <A, B>(
  base: AnySet<A>,
  codomain: AnySet<B>,
): SetExponentialWitness<A, B> => {
  const baseObj = ensureSetObj(base, "setExponentialWitness.base");
  const codomainObj = ensureSetObj(codomain, "setExponentialWitness.codomain");
  const data = SetCat.exponential(baseObj, codomainObj);

  const curry = <X>(input: {
    readonly domain: AnySet<X>;
    readonly product?: ProductData<X, A>;
    readonly mediator: SetHom<readonly [X, A], B>;
  }): SetHom<X, ExponentialArrow<A, B>> => {
    const domainObj = ensureSetObj(input.domain, "setExponentialWitness.curry.domain");
    const product = ensureProductData(domainObj, baseObj, input.product, "setExponentialWitness.curry");
    const failures = verifyMediatorCompatibility(product, input.mediator, codomainObj, "setExponentialWitness.curry");
    if (failures.length > 0) {
      throw new Error(failures.join("; "));
    }
    return data.curry({ domain: domainObj, product, morphism: input.mediator });
  };

  const uncurry = <X>(input: {
    readonly product?: ProductData<X, A>;
    readonly morphism: SetHom<X, ExponentialArrow<A, B>>;
  }): SetHom<readonly [X, A], B> => {
    const domainObj = input.morphism.dom as SetObj<X>;
    const product = ensureProductData(domainObj, baseObj, input.product, "setExponentialWitness.uncurry");
    if (input.morphism.cod !== data.object) {
      throw new Error("setExponentialWitness.uncurry: morphism must land in the exponential carrier");
    }
    return data.uncurry({ product, morphism: input.morphism });
  };

  const checkEvaluationTriangle = <X>(input: {
    readonly domain: AnySet<X>;
    readonly product?: ProductData<X, A>;
    readonly mediator: SetHom<readonly [X, A], B>;
  }): OracleReport<{ transpose?: SetHom<X, ExponentialArrow<A, B>> }> => {
    const domainObj = ensureSetObj(input.domain, "setExponentialWitness.checkTriangle.domain");
    const product = ensureProductData(domainObj, baseObj, input.product, "setExponentialWitness.checkTriangle");
    const failures = verifyMediatorCompatibility(product, input.mediator, codomainObj, "setExponentialWitness.checkTriangle");
    if (failures.length > 0) {
      return { holds: false, failures, details: {} };
    }
    const transpose = data.curry({ domain: domainObj, product, morphism: input.mediator });
    const firstComponent = composeSet(transpose, product.projections.fst);
    const secondComponent = product.projections.snd;
    const pairing = data.evaluationProduct.pair(firstComponent, secondComponent);
    const composite = composeSet(data.evaluation, pairing);
    const holds = equalSetMorphisms(composite, input.mediator);
    const localFailures = holds ? [] : ["evaluation ∘ ⟨transpose ∘ π₁, π₂⟩ failed to recover the mediator"];
    return { holds, failures: localFailures, details: { transpose } };
  };

  const checkCurryUniqueness = <X>(input: {
    readonly domain: AnySet<X>;
    readonly product?: ProductData<X, A>;
    readonly mediator: SetHom<readonly [X, A], B>;
    readonly candidate: SetHom<X, ExponentialArrow<A, B>>;
  }): OracleReport<{ canonical: SetHom<X, ExponentialArrow<A, B>> }> => {
    const domainObj = ensureSetObj(input.domain, "setExponentialWitness.checkUniqueness.domain");
    const product = ensureProductData(domainObj, baseObj, input.product, "setExponentialWitness.checkUniqueness");
    const mediatorFailures = verifyMediatorCompatibility(
      product,
      input.mediator,
      codomainObj,
      "setExponentialWitness.checkUniqueness",
    );
    const failures = [...mediatorFailures];
    if (input.candidate.dom !== domainObj) {
      failures.push("setExponentialWitness.checkUniqueness: candidate domain must match the supplied object");
    }
    if (input.candidate.cod !== data.object) {
      failures.push("setExponentialWitness.checkUniqueness: candidate must land in the exponential carrier");
    }
    const canonical = data.curry({ domain: domainObj, product, morphism: input.mediator });

    const candidateFirst = composeSet(input.candidate, product.projections.fst);
    const candidatePair = data.evaluationProduct.pair(candidateFirst, product.projections.snd);
    const candidateComposite = composeSet(data.evaluation, candidatePair);
    if (!equalSetMorphisms(candidateComposite, input.mediator)) {
      failures.push("setExponentialWitness.checkUniqueness: evaluation composite does not recover the mediator");
    }
    if (failures.length === 0 && !equalSetMorphisms(input.candidate, canonical)) {
      failures.push("setExponentialWitness.checkUniqueness: candidate differs from the canonical transpose");
    }
    return { holds: failures.length === 0, failures, details: { canonical } };
  };

  const checkUncurryRoundTrip = <X>(input: {
    readonly domain: AnySet<X>;
    readonly product?: ProductData<X, A>;
    readonly mediator: SetHom<readonly [X, A], B>;
  }): OracleReport<{ transpose?: SetHom<X, ExponentialArrow<A, B>> }> => {
    const domainObj = ensureSetObj(input.domain, "setExponentialWitness.checkRoundTrip.domain");
    const product = ensureProductData(domainObj, baseObj, input.product, "setExponentialWitness.checkRoundTrip");
    const mediatorFailures = verifyMediatorCompatibility(
      product,
      input.mediator,
      codomainObj,
      "setExponentialWitness.checkRoundTrip",
    );
    if (mediatorFailures.length > 0) {
      return { holds: false, failures: mediatorFailures, details: {} };
    }
    const transpose = data.curry({ domain: domainObj, product, morphism: input.mediator });
    const uncurried = data.uncurry({ product, morphism: transpose });
    const holds = equalSetMorphisms(uncurried, input.mediator);
    const failures = holds ? [] : ["setExponentialWitness.checkRoundTrip: uncurry(curry(mediator)) did not recover the mediator"];
    return { holds, failures, details: { transpose } };
  };

  return {
    base,
    codomain,
    exponential: data.object,
    evaluation: data.evaluation,
    evaluationProduct: data.evaluationProduct,
    curry,
    uncurry,
    checkEvaluationTriangle,
    checkCurryUniqueness,
    checkUncurryRoundTrip,
  };
};

// ---------- Power set cardinality ----------
export interface PowerSetWitness<A> {
  readonly source: AnySet<A>;
  readonly ambient: SetObj<A>;
  readonly subsetCarrier: SetObj<SetObj<A>>;
  readonly characteristicCarrier: SetObj<SetHom<A, boolean>>;
  readonly subsets: ReadonlyArray<CharacteristicWitness<A>>;
}

export const powerSetWitness = <A>(source: AnySet<A>): PowerSetWitness<A> => {
  const sourceObj = ensureSetObj(source, "powerSetWitness");
  const evidence = SetLaws.powerSetEvidence(sourceObj);
  return {
    source,
    ambient: evidence.ambient,
    subsetCarrier: evidence.subsetCarrier,
    characteristicCarrier: evidence.characteristicCarrier,
    subsets: evidence.subsets,
  };
};

export const checkPowerSetWitness = <A>(
  witness: PowerSetWitness<A>,
): OracleReport<{ expectedSize: number; actualSize: number }> => {
  const ambient = ensureSetObj(witness.ambient, "checkPowerSetWitness.ambient");
  const elements = Array.from(ambient);
  const expectedSize = Math.pow(2, elements.length);
  const actualSize = witness.subsetCarrier.size;
  const failures: string[] = [];

  if (actualSize !== expectedSize) {
    failures.push(`|P(A)| expected ${expectedSize} subsets, received ${actualSize}`);
  }

  const seenSubsets = new Set<SetObj<A>>();
  const seenCharacteristics = new Set<SetHom<A, boolean>>();

  witness.subsets.forEach(entry => {
    const { subset, inclusion, characteristic } = entry;
    if (!witness.subsetCarrier.has(subset)) {
      failures.push("power set evidence: subset enumeration is missing from the carrier");
    }
    if (!witness.characteristicCarrier.has(characteristic)) {
      failures.push("power set evidence: characteristic map missing from Ω^A");
    }
    if (inclusion.dom !== subset) {
      failures.push("power set evidence: inclusion domain does not match the subset carrier");
    }
    if (inclusion.cod !== ambient) {
      failures.push("power set evidence: inclusion codomain must equal the ambient set");
    }
    for (const element of subset) {
      if (!ambient.has(element)) {
        failures.push("power set evidence: subset contains an element outside the source set");
        break;
      }
      if (inclusion.map(element) !== element) {
        failures.push("power set evidence: inclusion must be the identity on subset elements");
        break;
      }
    }
    for (const element of elements) {
      const hasElement = subset.has(element);
      const classification = characteristic.map(element);
      if (classification !== hasElement) {
        failures.push(
          `power set evidence: characteristic map disagrees with subset membership for ${String(element)}`,
        );
        break;
      }
    }
    seenSubsets.add(subset);
    seenCharacteristics.add(characteristic);
  });

  for (const subset of witness.subsetCarrier) {
    if (!seenSubsets.has(subset)) {
      failures.push("power set evidence: carrier subset missing from the enumeration");
    }
  }

  for (const characteristic of witness.characteristicCarrier) {
    if (!seenCharacteristics.has(characteristic)) {
      failures.push("power set evidence: carrier characteristic missing from the enumeration");
    }
  }

  return {
    holds: failures.length === 0,
    failures,
    details: { expectedSize, actualSize },
  };
};

// ---------- Cantor diagonal ----------
export interface CantorDiagonalWitness<A> {
  readonly domain: AnySet<A>;
  readonly ambient: SetObj<A>;
  readonly diagonal: CharacteristicWitness<A>;
  readonly diagnoses: ReadonlyArray<CantorImageDiagnosis<A>>;
}

export const cantorDiagonalWitness = <A>(
  domain: AnySet<A>,
  mapping: (element: A) => AnySet<A>,
): CantorDiagonalWitness<A> => {
  const domainObj = ensureSetObj(domain, "cantorDiagonalWitness.domain");
  const evidence = SetLaws.cantorDiagonalEvidence(domainObj, mapping);
  return {
    domain,
    ambient: domainObj,
    diagonal: evidence.diagonal,
    diagnoses: evidence.diagnoses,
  };
};

export const checkCantorDiagonal = <A>(
  witness: CantorDiagonalWitness<A>,
): OracleReport<{ diagonalSize: number; domainSize: number }> => {
  const ambient = ensureSetObj(witness.ambient, "checkCantorDiagonal.ambient");
  const failures: string[] = [];

  for (const value of witness.diagonal.subset) {
    if (!ambient.has(value)) {
      failures.push("Cantor diagonal: diagonal includes an element outside the domain");
      break;
    }
  }

  if (witness.diagnoses.length !== ambient.size) {
    failures.push("Cantor diagonal: diagnoses must cover every domain element");
  }

  witness.diagnoses.forEach(diagnosis => {
    const { element, diagonalValue, imageValue, imageWitness } = diagnosis;
    if (!ambient.has(element)) {
      failures.push("Cantor diagonal: diagnosis references an element outside the domain");
    }
    for (const value of imageWitness.subset) {
      if (!ambient.has(value)) {
        failures.push("Cantor diagonal: image includes an element outside the domain");
        break;
      }
    }
    if (imageWitness.inclusion.cod !== ambient) {
      failures.push("Cantor diagonal: image inclusion must land in the ambient set");
    }
    if (imageWitness.inclusion.dom !== imageWitness.subset) {
      failures.push("Cantor diagonal: image inclusion domain must match its subset");
    }
    if (imageWitness.characteristic.dom !== ambient) {
      failures.push("Cantor diagonal: image characteristic must classify ambient elements");
    }
    if (witness.diagonal.characteristic.dom !== ambient) {
      failures.push("Cantor diagonal: diagonal characteristic must classify the ambient");
    }
    if (witness.diagonal.characteristic.map(element) !== diagonalValue) {
      failures.push("Cantor diagonal: recorded diagonal value disagrees with the characteristic map");
    }
    if (imageWitness.characteristic.map(element) !== imageValue) {
      failures.push("Cantor diagonal: recorded image value disagrees with the characteristic map");
    }
    if (diagonalValue === imageValue) {
      failures.push("Cantor diagonal: diagonal and image agree on a diagonal test point");
    }
  });

  return {
    holds: failures.length === 0,
    failures,
    details: { diagonalSize: witness.diagonal.subset.size, domainSize: ambient.size },
  };
};

// ---------- Cardinality comparisons ----------
export interface CardinalityComparisonWitness<A, B> {
  readonly left: AnySet<A>;
  readonly right: AnySet<B>;
  readonly analysis: CardinalityComparisonResult;
}

export const cardinalityComparisonWitness = <A, B>(
  left: AnySet<A>,
  right: AnySet<B>,
): CardinalityComparisonWitness<A, B> => ({
  left,
  right,
  analysis: SetLaws.compareCardinalities(left, right),
});

export const checkCardinalityComparison = <A, B>(
  witness: CardinalityComparisonWitness<A, B>,
): OracleReport<CardinalityComparisonResult> => {
  const leftObj = ensureSetObj(witness.left, "checkCardinalityComparison.left");
  const rightObj = ensureSetObj(witness.right, "checkCardinalityComparison.right");
  const recomputed = SetLaws.compareCardinalities(leftObj, rightObj);
  const failures: string[] = [];

  if (witness.analysis.leftSize !== leftObj.size) {
    failures.push("cardinality comparison: recorded left size does not match the carrier");
  }
  if (witness.analysis.rightSize !== rightObj.size) {
    failures.push("cardinality comparison: recorded right size does not match the carrier");
  }
  if (witness.analysis.relation !== recomputed.relation) {
    failures.push("cardinality comparison: recorded relation disagrees with the recomputed sizes");
  }
  if (witness.analysis.difference !== recomputed.difference) {
    failures.push("cardinality comparison: recorded difference disagrees with the recomputed sizes");
  }

  return {
    holds: failures.length === 0,
    failures,
    details: witness.analysis,
  };
};

// ---------- Internal logic via CategoryLimits ----------
export interface SetInternalLogicWitness {
  readonly classifier: typeof SetSubobjectClassifier;
}

export const setInternalLogicWitness = (): SetInternalLogicWitness => ({
  classifier: SetSubobjectClassifier,
});

export const checkInternalLogicWitness = (
  witness: SetInternalLogicWitness,
): OracleReport<{
  derivedFalse: SetMorphism;
  derivedNegation: SetMorphism;
  iso: CategoryLimits.SubobjectClassifierIsoWitness<SetMorphism>;
}> => {
  const classifier = witness.classifier;
  const failures: string[] = [];

  const derivedFalse =
    CategoryLimits.subobjectClassifierFalseArrow(classifier) as SetMorphism;
  const publishedFalse = classifier.falseArrow as SetMorphism;
  if (!equalSetMorphisms(derivedFalse, publishedFalse)) {
    failures.push(
      "Set internal logic: derived false arrow does not match the published arrow.",
    );
  }

  const derivedNegation =
    CategoryLimits.subobjectClassifierNegation(classifier, {
      equalMor: equalSetMorphisms,
    }) as SetMorphism;
  const publishedNegation = classifier.negation as SetMorphism;
  if (!equalSetMorphisms(derivedNegation, publishedNegation)) {
    failures.push(
      "Set internal logic: derived negation does not match the published arrow.",
    );
  }

  const iso = CategoryLimits.buildSubobjectClassifierIso(classifier, classifier, {
    equalMor: equalSetMorphisms,
  });

  const identity = classifier.id(classifier.truthValues) as SetMorphism;
  const forwardBackward = classifier.compose(
    iso.forward as SetMorphism,
    iso.backward as SetMorphism,
  ) as SetMorphism;
  const backwardForward = classifier.compose(
    iso.backward as SetMorphism,
    iso.forward as SetMorphism,
  ) as SetMorphism;

  if (!equalSetMorphisms(forwardBackward, identity)) {
    failures.push(
      "Set internal logic: forward/backward composite must be the identity on Ω.",
    );
  }

  if (!equalSetMorphisms(backwardForward, identity)) {
    failures.push(
      "Set internal logic: backward/forward composite must be the identity on Ω.",
    );
  }

  return {
    holds: failures.length === 0,
    failures,
    details: {
      derivedFalse,
      derivedNegation,
      iso,
    },
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
  compareCardinalities: {
    witness: cardinalityComparisonWitness,
    check: checkCardinalityComparison,
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
  exponential: {
    witness: setExponentialWitness,
  },
  powerSet: {
    witness: powerSetWitness,
    check: checkPowerSetWitness,
  },
  cantorDiagonal: {
    witness: cantorDiagonalWitness,
    check: checkCantorDiagonal,
  },
  internalLogic: {
    witness: setInternalLogicWitness,
    check: checkInternalLogicWitness,
  },
  naturalNumbers: setNaturalNumbersOracles,
};
