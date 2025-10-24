import type { Group } from "./kinds/group-automorphism";

export type FreeGroupExponent = 1 | -1;

export interface FreeGroupLetter<Generator extends string = string> {
  readonly generator: Generator;
  readonly exponent: FreeGroupExponent;
}

export type FreeGroupWord<Generator extends string = string> =
  ReadonlyArray<FreeGroupLetter<Generator>>;

export const emptyWord: FreeGroupWord<string> = Object.freeze([]);

const invertExponent = (value: FreeGroupExponent): FreeGroupExponent => (value === 1 ? -1 : 1);

export const reduceWord = <Generator extends string>(
  word: FreeGroupWord<Generator>,
): FreeGroupWord<Generator> => {
  if (word.length === 0) {
    return emptyWord as FreeGroupWord<Generator>;
  }
  const stack: Array<FreeGroupLetter<Generator>> = [];
  for (const letter of word) {
    const top = stack.length === 0 ? undefined : stack[stack.length - 1];
    if (top !== undefined && top.generator === letter.generator) {
      const combined = top.exponent + letter.exponent;
      if (combined === 0) {
        stack.pop();
        continue;
      }
      if (combined === 2 || combined === -2) {
        stack[stack.length - 1] = {
          generator: top.generator,
          exponent: combined === 2 ? 1 : -1,
        };
        continue;
      }
    }
    stack.push(letter);
  }
  if (stack.length === word.length) {
    return word;
  }
  return stack.length === 0 ? (emptyWord as FreeGroupWord<Generator>) : stack.slice();
};

export const multiplyWords = <Generator extends string>(
  left: FreeGroupWord<Generator>,
  right: FreeGroupWord<Generator>,
): FreeGroupWord<Generator> => reduceWord([...left, ...right]);

export const inverseWord = <Generator extends string>(
  word: FreeGroupWord<Generator>,
): FreeGroupWord<Generator> =>
  reduceWord(
    [...word]
      .reverse()
      .map(({ generator, exponent }) => ({ generator, exponent: invertExponent(exponent) })),
  );

export const wordEquals = <Generator extends string>(
  left: FreeGroupWord<Generator>,
  right: FreeGroupWord<Generator>,
): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((letter, index) => {
    const other = right[index];
    return other !== undefined && other.generator === letter.generator && other.exponent === letter.exponent;
  });
};

export const wordFromGenerator = <Generator extends string>(
  generator: Generator,
): FreeGroupWord<Generator> => [{ generator, exponent: 1 }];

export const showWord = <Generator extends string>(
  word: FreeGroupWord<Generator>,
): string => {
  if (word.length === 0) {
    return "e";
  }
  return word
    .map(({ generator, exponent }) => (exponent === 1 ? generator : `${generator}^{-1}`))
    .join(" · ");
};

export interface FreeGroup<Generator extends string = string>
  extends Group<FreeGroupWord<Generator>> {
  readonly generators: ReadonlyArray<Generator>;
  readonly samples: ReadonlyArray<FreeGroupWord<Generator>>;
  readonly show: (word: FreeGroupWord<Generator>) => string;
}

const generateSamples = <Generator extends string>(
  generators: ReadonlyArray<Generator>,
  depth: number,
): ReadonlyArray<FreeGroupWord<Generator>> => {
  const samples: Array<FreeGroupWord<Generator>> = [emptyWord as FreeGroupWord<Generator>];
  for (const generator of generators) {
    samples.push([{ generator, exponent: 1 }]);
    samples.push([{ generator, exponent: -1 }]);
  }
  if (depth <= 1) {
    return samples;
  }
  for (const left of generators) {
    for (const right of generators) {
      samples.push(
        reduceWord([
          { generator: left, exponent: 1 },
          { generator: right, exponent: 1 },
        ]),
      );
    }
  }
  return samples;
};

export const makeFreeGroup = <Generator extends string>(
  generators: ReadonlyArray<Generator>,
  options?: { readonly sampleDepth?: number },
): FreeGroup<Generator> => {
  const depth = options?.sampleDepth ?? 2;
  const samples = generateSamples(generators, depth);
  return {
    generators: [...generators],
    samples,
    show: showWord,
    combine: (a, b) => multiplyWords(a, b),
    identity: emptyWord as FreeGroupWord<Generator>,
    inverse: (word) => inverseWord(word),
    eq: (left, right) => wordEquals(reduceWord(left), reduceWord(right)),
  };
};

export const isIdentityWord = <Generator extends string>(word: FreeGroupWord<Generator>): boolean =>
  word.length === 0;

