import type { Monoid } from "./monoid-cat";
import { MonCat } from "./mon-cat";
import type { MonoidHom } from "./mon-cat";

export type NaturalPair = readonly [number, number];

type CongruenceClass = "zero" | "positive";

type Word = string;

type BinaryLetter = "a" | "b";

const naturalAddition: Monoid<number> = {
  e: 0,
  op: (left, right) => left + right,
};

const naturalPairAddition: Monoid<NaturalPair> = {
  e: [0, 0],
  op: ([a1, b1], [a2, b2]) => [a1 + a2, b1 + b2],
};

const naturalPairToFirst: MonoidHom<NaturalPair, number> = MonCat.hom(
  naturalPairAddition,
  naturalAddition,
  ([a, b]) => a + 2 * b,
);

const naturalPairToSecond: MonoidHom<NaturalPair, number> = MonCat.hom(
  naturalPairAddition,
  naturalAddition,
  ([a, b]) => 2 * a + b,
);

const positiveQuotient: Monoid<CongruenceClass> = {
  e: "zero",
  op: (left, right) => (left === "zero" ? right : "positive"),
};

const collapsePositive: MonoidHom<number, CongruenceClass> = MonCat.hom(
  naturalAddition,
  positiveQuotient,
  (value) => (value === 0 ? "zero" : "positive"),
);

export interface CongruenceFactorizationResult<X> {
  readonly mediator: MonoidHom<CongruenceClass, X>;
  readonly generatorImage: X;
}

const factorThroughPositiveCollapse = <X>(
  target: Monoid<X>,
  equalizing: MonoidHom<number, X>,
): CongruenceFactorizationResult<X> => {
  const generator = equalizing.map(1);
  const mediator = MonCat.hom(
    positiveQuotient,
    target,
    (value) => (value === "zero" ? target.e : generator),
  );
  return { mediator, generatorImage: generator };
};

export interface SetEqualizingEvidence {
  readonly codomain: ReadonlyArray<number>;
  readonly map: (value: number) => number;
  readonly witnessPairs: ReadonlyArray<NaturalPair>;
  readonly conflictingInputs: readonly [number, number];
}

const threeClassEqualizingMap: SetEqualizingEvidence = {
  codomain: [0, 1, 2],
  map: (value) => {
    if (value === 0) {
      return 0;
    }
    const remainder = value % 3;
    return remainder === 0 ? 2 : 1;
  },
  witnessPairs: [
    [0, 0],
    [1, 0],
    [0, 1],
    [2, 1],
    [1, 2],
    [3, 0],
  ],
  conflictingInputs: [1, 3],
};

export interface ForgetfulCoequalizerCounterexample {
  readonly source: Monoid<NaturalPair>;
  readonly target: Monoid<number>;
  readonly parallel: {
    readonly left: MonoidHom<NaturalPair, number>;
    readonly right: MonoidHom<NaturalPair, number>;
  };
  readonly coequalizer: {
    readonly quotient: Monoid<CongruenceClass>;
    readonly coequalize: MonoidHom<number, CongruenceClass>;
    readonly factor: <X>(
      target: Monoid<X>,
      equalizing: MonoidHom<number, X>,
    ) => CongruenceFactorizationResult<X>;
  };
  readonly forgetfulFailure: SetEqualizingEvidence;
}

export const forgetfulCoequalizerCounterexample = (): ForgetfulCoequalizerCounterexample => ({
  source: naturalPairAddition,
  target: naturalAddition,
  parallel: { left: naturalPairToFirst, right: naturalPairToSecond },
  coequalizer: {
    quotient: positiveQuotient,
    coequalize: collapsePositive,
    factor: factorThroughPositiveCollapse,
  },
  forgetfulFailure: threeClassEqualizingMap,
});

const unaryWordMonoid: Monoid<number> = {
  e: 0,
  op: (left, right) => left + right,
};

const letterWord = (letter: BinaryLetter, count: number): Word =>
  letter.repeat(count);

const binaryWordMonoid: Monoid<Word> = {
  e: "",
  op: (left, right) => left + right,
};

const injectLetterWord = (letter: BinaryLetter): MonoidHom<number, Word> =>
  MonCat.hom(unaryWordMonoid, binaryWordMonoid, (count) => letterWord(letter, count));

const evaluateBinaryWord = <X>(
  target: Monoid<X>,
  letterImages: Record<BinaryLetter, X>,
  word: Word,
): X => {
  let accumulator = target.e;
  for (const symbol of word) {
    accumulator = target.op(accumulator, letterImages[symbol as BinaryLetter]);
  }
  return accumulator;
};

export interface BinaryWordFactorization<X> {
  readonly mediator: MonoidHom<Word, X>;
  readonly images: Record<BinaryLetter, X>;
}

const factorThroughBinaryWords = <X>(
  target: Monoid<X>,
  left: MonoidHom<number, X>,
  right: MonoidHom<number, X>,
): BinaryWordFactorization<X> => {
  const images: Record<BinaryLetter, X> = {
    a: left.map(1),
    b: right.map(1),
  };
  const mediator = MonCat.hom(binaryWordMonoid, target, (word) =>
    evaluateBinaryWord(target, images, word),
  );
  return { mediator, images };
};

export interface ForgetfulCoproductFailure {
  readonly codomain: ReadonlyArray<number>;
  readonly leftMap: (count: number) => number;
  readonly rightMap: (count: number) => number;
  readonly extensions: ReadonlyArray<(word: Word) => number>;
  readonly disagreement: Word;
}

const constantBooleanMap = (value: number): ((word: Word) => number) => () => value;

const coproductFailure: ForgetfulCoproductFailure = {
  codomain: [0, 1],
  leftMap: () => 0,
  rightMap: () => 0,
  extensions: [
    constantBooleanMap(0),
    (word) => (word === "ab" ? 1 : 0),
  ],
  disagreement: "ab",
};

export interface ForgetfulCoproductCounterexample {
  readonly left: Monoid<number>;
  readonly right: Monoid<number>;
  readonly coproduct: {
    readonly monoid: Monoid<Word>;
    readonly injections: {
      readonly left: MonoidHom<number, Word>;
      readonly right: MonoidHom<number, Word>;
    };
    readonly factor: <X>(
      target: Monoid<X>,
      left: MonoidHom<number, X>,
      right: MonoidHom<number, X>,
    ) => BinaryWordFactorization<X>;
  };
  readonly forgetfulFailure: ForgetfulCoproductFailure;
}

export const forgetfulCoproductCounterexample = (): ForgetfulCoproductCounterexample => ({
  left: unaryWordMonoid,
  right: unaryWordMonoid,
  coproduct: {
    monoid: binaryWordMonoid,
    injections: {
      left: injectLetterWord("a"),
      right: injectLetterWord("b"),
    },
    factor: factorThroughBinaryWords,
  },
  forgetfulFailure: coproductFailure,
});
