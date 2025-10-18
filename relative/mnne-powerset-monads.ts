import {
  createReplayableIterable,
  createReplayableIterableFromArray,
  createReplayableIterableFromWitness,
  sliceLazyIterable,
  type LazyReplayableIterable,
  type LazySliceResult,
} from "./mnne-infinite-support";
import type { CountabilityWitness } from "../markov-infinite";

const DEFAULT_BASE_LIMIT = 16;
const DEFAULT_SUBSET_LIMIT = 16;

type ComparisonKind = "unit" | "element" | "associativity";

const freezeArray = <T>(values: readonly T[]): ReadonlyArray<T> =>
  Object.freeze([...values]) as ReadonlyArray<T>;

const uniqueSortedKeys = (keys: ReadonlyArray<string>): ReadonlyArray<string> => {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const key of keys) {
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(key);
    }
  }
  return unique.toSorted();
};

const formatElements = <Element>(
  values: ReadonlyArray<Element>,
  describeElement: (element: Element) => string,
): string => values.map(describeElement).join(", ");

export interface PowersetSubset<Element> {
  readonly label: string;
  readonly elements: LazyReplayableIterable<Element>;
  readonly description?: string;
}

export interface PowersetArrow<Element> {
  readonly label: string;
  readonly map: (element: Element) => LazyReplayableIterable<Element>;
  readonly description?: string;
}

export interface PowersetApproximationOptions {
  readonly baseLimit?: number;
  readonly subsetLimit?: number;
}

export interface PowersetRelativeMonadWitness<Element> {
  readonly base: LazyReplayableIterable<Element>;
  readonly subsets: ReadonlyArray<PowersetSubset<Element>>;
  readonly arrows: ReadonlyArray<PowersetArrow<Element>>;
  readonly elementKey: (element: Element) => string;
  readonly describeElement?: (element: Element) => string;
  readonly unit?: (element: Element) => LazyReplayableIterable<Element>;
  readonly extend?: (
    arrow: PowersetArrow<Element>,
    subset: LazyReplayableIterable<Element>,
  ) => LazyReplayableIterable<Element>;
  readonly approximation?: PowersetApproximationOptions;
}

export interface PowersetSubsetSlice<Element> {
  readonly label: string;
  readonly description?: string;
  readonly slice: LazySliceResult<Element>;
}

export interface PowersetArrowSample<Element> {
  readonly arrow: string;
  readonly arrowDescription?: string;
  readonly element: Element;
  readonly elementKey: string;
  readonly slice: LazySliceResult<Element>;
}

export interface PowersetLawComparison<Element> {
  readonly kind: ComparisonKind;
  readonly context: string;
  readonly equal: boolean;
  readonly leftSlice: LazySliceResult<Element>;
  readonly rightSlice: LazySliceResult<Element>;
}

export interface PowersetRelativeMonadReport<Element> {
  readonly holds: boolean;
  readonly issues: ReadonlyArray<string>;
  readonly details: string;
  readonly baseSlice: LazySliceResult<Element>;
  readonly subsetSlices: ReadonlyArray<PowersetSubsetSlice<Element>>;
  readonly arrowSamples: ReadonlyArray<PowersetArrowSample<Element>>;
  readonly comparisons: ReadonlyArray<PowersetLawComparison<Element>>;
  readonly approximation: PowersetApproximationDiagnostics;
}

export interface PowersetTruncatedSubset {
  readonly label: string;
  readonly limit: number;
  readonly consumed: number;
}

export interface PowersetTruncatedArrowSample {
  readonly arrow: string;
  readonly elementKey: string;
  readonly limit: number;
  readonly consumed: number;
}

export interface PowersetTruncatedComparison {
  readonly kind: ComparisonKind;
  readonly context: string;
  readonly leftTruncated: boolean;
  readonly rightTruncated: boolean;
}

export interface PowersetApproximationDiagnostics {
  readonly baseLimit: number;
  readonly subsetLimit: number;
  readonly baseTruncated: boolean;
  readonly truncatedSubsets: ReadonlyArray<PowersetTruncatedSubset>;
  readonly truncatedArrows: ReadonlyArray<PowersetTruncatedArrowSample>;
  readonly truncatedComparisons: ReadonlyArray<PowersetTruncatedComparison>;
}

const defaultDescribe = <Element>(element: Element): string => `${element}`;

const defaultUnit = <Element>(
  element: Element,
  describe: (value: Element) => string,
): LazyReplayableIterable<Element> =>
  createReplayableIterableFromArray([element], {
    description: `η(${describe(element)})`,
  });

const defaultExtend = <Element>(
  elementKey: (element: Element) => string,
  arrow: PowersetArrow<Element>,
  subset: LazyReplayableIterable<Element>,
): LazyReplayableIterable<Element> =>
  createReplayableIterable(() => ({
    [Symbol.iterator]: function* () {
      const seen = new Set<string>();
      for (const element of subset.enumerate()) {
        for (const image of arrow.map(element).enumerate()) {
          const key = elementKey(image);
          if (!seen.has(key)) {
            seen.add(key);
            yield image;
          }
        }
      }
    },
  }), {
    description: `μ(${arrow.label})`,
  });

const compareIterables = <Element>(
  elementKey: (element: Element) => string,
  describeElement: (element: Element) => string,
  left: LazyReplayableIterable<Element>,
  right: LazyReplayableIterable<Element>,
  options: PowersetApproximationOptions | undefined,
  context: string,
  kind: ComparisonKind,
  issues: string[],
): PowersetLawComparison<Element> => {
  const subsetLimit = options?.subsetLimit ?? DEFAULT_SUBSET_LIMIT;
  const leftSlice = sliceLazyIterable(left, { limit: subsetLimit });
  const rightSlice = sliceLazyIterable(right, { limit: subsetLimit });
  const leftKeys = uniqueSortedKeys(leftSlice.values.map(elementKey));
  const rightKeys = uniqueSortedKeys(rightSlice.values.map(elementKey));
  let equal = leftKeys.length === rightKeys.length;
  if (equal) {
    for (let index = 0; index < leftKeys.length; index += 1) {
      if (leftKeys[index] !== rightKeys[index]) {
        equal = false;
        break;
      }
    }
  }

  if (!equal) {
    const leftFormatted = formatElements(leftSlice.values, describeElement);
    const rightFormatted = formatElements(rightSlice.values, describeElement);
    issues.push(
      `${context}: expected {${leftFormatted}} to match {${rightFormatted}}.`,
    );
  }

  return { kind, context, equal, leftSlice, rightSlice };
};

export const analyzePowersetRelativeMonad = <Element>(
  witness: PowersetRelativeMonadWitness<Element>,
): PowersetRelativeMonadReport<Element> => {
  const issues: string[] = [];
  const comparisons: PowersetLawComparison<Element>[] = [];

  const describeElement = witness.describeElement ?? defaultDescribe<Element>;
  const elementKey = witness.elementKey;

  const unitArrow: PowersetArrow<Element> = {
    label: "η",
    map: (element) =>
      witness.unit?.(element) ?? defaultUnit(element, describeElement),
    description: "Singleton unit subset",
  };

  const extend = (
    arrow: PowersetArrow<Element>,
    subset: LazyReplayableIterable<Element>,
  ): LazyReplayableIterable<Element> =>
    witness.extend?.(arrow, subset) ?? defaultExtend(elementKey, arrow, subset);

  const baseLimit = witness.approximation?.baseLimit ?? DEFAULT_BASE_LIMIT;
  const subsetLimit = witness.approximation?.subsetLimit ?? DEFAULT_SUBSET_LIMIT;

  const baseSlice = sliceLazyIterable(witness.base, { limit: baseLimit });
  const subsetSlices: PowersetSubsetSlice<Element>[] = witness.subsets.map(
    (subset) => ({
      label: subset.label,
      ...(subset.description !== undefined
        ? { description: subset.description }
        : {}),
      slice: sliceLazyIterable(subset.elements, { limit: subsetLimit }),
    }),
  );

  const arrowSamples: PowersetArrowSample<Element>[] = [];
  for (const arrow of witness.arrows) {
    for (const element of baseSlice.values) {
      const slice = sliceLazyIterable(arrow.map(element), { limit: subsetLimit });
      arrowSamples.push({
        arrow: arrow.label,
        ...(arrow.description !== undefined
          ? { arrowDescription: arrow.description }
          : {}),
        element,
        elementKey: elementKey(element),
        slice,
      });
    }
  }

  for (const subset of witness.subsets) {
    const extended = extend(unitArrow, subset.elements);
    comparisons.push(
      compareIterables(
        elementKey,
        describeElement,
        extended,
        subset.elements,
        witness.approximation,
        `Unit law for subset "${subset.label}"`,
        "unit",
        issues,
      ),
    );
  }

  for (const arrow of witness.arrows) {
    for (const element of baseSlice.values) {
      const unitSubset = unitArrow.map(element);
      const extended = extend(arrow, unitSubset);
      const context = `Right unit for element ${describeElement(
        element,
      )} via arrow "${arrow.label}"`;
      comparisons.push(
        compareIterables(
          elementKey,
          describeElement,
          extended,
          arrow.map(element),
          witness.approximation,
          context,
          "element",
          issues,
        ),
      );
    }
  }

  for (const subset of witness.subsets) {
    for (const first of witness.arrows) {
      for (const second of witness.arrows) {
        const sequential = extend(second, extend(first, subset.elements));
        const composedArrow: PowersetArrow<Element> = {
          label: `${second.label} ∘ ${first.label}`,
          description: `Composite of ${first.label} and ${second.label}`,
          map: (element) => extend(second, first.map(element)),
        };
        const combined = extend(composedArrow, subset.elements);
        comparisons.push(
          compareIterables(
            elementKey,
            describeElement,
            sequential,
            combined,
            witness.approximation,
            `Associativity on subset "${subset.label}" via ${first.label} then ${second.label}`,
            "associativity",
            issues,
          ),
        );
      }
    }
  }

  const holds = comparisons.every((comparison) => comparison.equal) && issues.length === 0;
  const details = holds
    ? "Powerset relative monad witness satisfies the unit and associativity laws on sampled data."
    : "Powerset relative monad witness failed one or more sampled laws.";

  const frozenSubsetSlices = freezeArray(subsetSlices);
  const frozenArrowSamples = freezeArray(arrowSamples);
  const frozenComparisons = freezeArray(comparisons);
  const approximation: PowersetApproximationDiagnostics = {
    baseLimit,
    subsetLimit,
    baseTruncated: baseSlice.truncated,
    truncatedSubsets: freezeArray(
      frozenSubsetSlices
        .filter((subset) => subset.slice.truncated)
        .map((subset) => ({
          label: subset.label,
          limit: subset.slice.limit,
          consumed: subset.slice.consumed,
        })),
    ),
    truncatedArrows: freezeArray(
      frozenArrowSamples
        .filter((sample) => sample.slice.truncated)
        .map((sample) => ({
          arrow: sample.arrow,
          elementKey: sample.elementKey,
          limit: sample.slice.limit,
          consumed: sample.slice.consumed,
        })),
    ),
    truncatedComparisons: freezeArray(
      frozenComparisons
        .filter(
          (comparison) =>
            comparison.leftSlice.truncated || comparison.rightSlice.truncated,
        )
        .map((comparison) => ({
          kind: comparison.kind,
          context: comparison.context,
          leftTruncated: comparison.leftSlice.truncated,
          rightTruncated: comparison.rightSlice.truncated,
        })),
    ),
  };

  return {
    holds,
    issues: freezeArray(issues),
    details,
    baseSlice,
    subsetSlices: frozenSubsetSlices,
    arrowSamples: frozenArrowSamples,
    comparisons: frozenComparisons,
    approximation,
  };
};

const naturalsCountabilityWitness: CountabilityWitness<number> = {
  kind: "countablyInfinite",
  enumerate: () => ({
    [Symbol.iterator]: function* () {
      let index = 0;
      while (true) {
        yield index;
        index += 1;
      }
    },
  }),
  sample: [0, 1, 2, 3, 4],
  reason: "Natural numbers",
};

const describeCofiniteSubset = (
  description: string,
  skip: ReadonlyArray<number>,
): LazyReplayableIterable<number> =>
  createReplayableIterable(() => ({
    [Symbol.iterator]: function* () {
      let index = 0;
      while (true) {
        if (!skip.includes(index)) {
          yield index;
        }
        index += 1;
      }
    },
  }), { description });

const describeArithmeticSubset = (
  description: string,
  predicate: (index: number) => boolean,
): LazyReplayableIterable<number> =>
  createReplayableIterable(() => ({
    [Symbol.iterator]: function* () {
      let index = 0;
      while (true) {
        if (predicate(index)) {
          yield index;
        }
        index += 1;
      }
    },
  }), { description });

export const describeCofinitePowersetWitness = (): PowersetRelativeMonadWitness<number> => {
  const base = createReplayableIterableFromWitness(naturalsCountabilityWitness, {
    description: "ℕ",
  });

  const subsets: ReadonlyArray<PowersetSubset<number>> = [
    {
      label: "cofinite≥2",
      description: "All naturals except 0 and 1",
      elements: describeCofiniteSubset("ℕ \ {0,1}", [0, 1]),
    },
    {
      label: "even",
      description: "Even naturals",
      elements: describeArithmeticSubset("2ℕ", (index) => index % 2 === 0),
    },
    {
      label: "odd",
      description: "Odd naturals",
      elements: describeArithmeticSubset("2ℕ+1", (index) => index % 2 === 1),
    },
    {
      label: "initial",
      description: "Finite prefix {0,1,2,3}",
      elements: createReplayableIterableFromArray([0, 1, 2, 3], {
        description: "{0,1,2,3}",
      }),
    },
  ];

  const arrows: ReadonlyArray<PowersetArrow<number>> = [
    {
      label: "successor",
      description: "Maps n to {n, n+1}",
      map: (element) =>
        createReplayableIterableFromArray([element, element + 1], {
          description: `{${element}, ${element + 1}}`,
        }),
    },
    {
      label: "double",
      description: "Maps n to {2n}",
      map: (element) =>
        createReplayableIterableFromArray([element * 2], {
          description: `{${element * 2}}`,
        }),
    },
    {
      label: "tail",
      description: "Maps n to {n + k | k ≥ 0}",
      map: (element) =>
        createReplayableIterable(() => ({
          [Symbol.iterator]: function* () {
            let offset = 0;
            while (true) {
              yield element + offset;
              offset += 1;
            }
          },
        }), { description: `{m ≥ ${element}}` }),
    },
  ];

  return {
    base,
    subsets,
    arrows,
    elementKey: (value) => value.toString(),
    describeElement: (value) => value.toString(),
    approximation: {
      baseLimit: 12,
      subsetLimit: 12,
    },
  };
};
