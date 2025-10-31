import type { FiniteCategory } from "./finite-cat";
import type { SimpleCat } from "./simple-cat";

interface BifunctorElement<O, V> {
  readonly object: O;
  readonly value: V;
}

export interface DiscreteBifunctorInput<O, A, V> {
  readonly category: SimpleCat<O, A>;
  readonly objects: ReadonlyArray<O>;
  readonly arrows: ReadonlyArray<A>;
  readonly evaluate: (left: O, right: O) => ReadonlyArray<V>;
  readonly valueKey: (left: O, right: O, value: V) => string;
  readonly objectKey: (object: O) => string;
  readonly actOnLeft: (arrow: A, right: O, value: V) => V;
  readonly actOnRight: (left: O, arrow: A, value: V) => V;
}

export interface FiniteBifunctorInput<O, A, V> {
  readonly category: FiniteCategory<O, A>;
  readonly evaluate: (left: O, right: O) => ReadonlyArray<V>;
  readonly valueKey: (left: O, right: O, value: V) => string;
  readonly objectKey: (object: O) => string;
  readonly actOnLeft: (arrow: A, right: O, value: V) => V;
  readonly actOnRight: (left: O, arrow: A, value: V) => V;
}

interface DiagonalWitness<O, V> extends BifunctorElement<O, V> {
  readonly key: string;
}

const diagonalKey = <O, V>(
  objectKey: (object: O) => string,
  valueKey: (left: O, right: O, value: V) => string,
  object: O,
  value: V,
): string => `${objectKey(object)}::${valueKey(object, object, value)}`;

interface RelationWitness<O, A, V> {
  readonly arrow: A;
  readonly raw: V;
  readonly left: BifunctorElement<O, V>;
  readonly right: BifunctorElement<O, V>;
}

interface CoendClass<O, V> {
  readonly representative: BifunctorElement<O, V>;
  readonly members: ReadonlyArray<BifunctorElement<O, V>>;
  readonly key: string;
}

export interface FiniteCoendDiagnostics<O, A, V> {
  readonly diagonalCount: number;
  readonly relationCount: number;
  readonly missingDiagonalWitnesses: ReadonlyArray<{
    readonly side: "left" | "right";
    readonly arrow: A;
    readonly object: O;
    readonly value: V;
  }>;
  readonly holds: boolean;
}

export interface FiniteCoendResult<O, A, V> {
  readonly classes: ReadonlyArray<CoendClass<O, V>>;
  readonly classify: (element: BifunctorElement<O, V>) => CoendClass<O, V> | undefined;
  readonly relations: ReadonlyArray<RelationWitness<O, A, V>>;
  readonly diagnostics: FiniteCoendDiagnostics<O, A, V>;
}

export type DiscreteCoendDiagnostics<O, A, V> = FiniteCoendDiagnostics<O, A, V>;
export type DiscreteCoendResult<O, A, V> = FiniteCoendResult<O, A, V>;

const findRepresentative = (parents: number[], index: number): number => {
  if (parents[index] !== index) {
    const parentIndex = parents[index]!;
    parents[index] = findRepresentative(parents, parentIndex);
  }
  return parents[index];
};

const union = (parents: number[], left: number, right: number): void => {
  const leftRoot = findRepresentative(parents, left);
  const rightRoot = findRepresentative(parents, right);
  if (leftRoot !== rightRoot) {
    parents[rightRoot] = leftRoot;
  }
};

interface BifunctorHarness<O, A, V> {
  readonly category: SimpleCat<O, A>;
  readonly objects: ReadonlyArray<O>;
  readonly arrows: ReadonlyArray<A>;
  readonly evaluate: (left: O, right: O) => ReadonlyArray<V>;
  readonly valueKey: (left: O, right: O, value: V) => string;
  readonly objectKey: (object: O) => string;
  readonly actOnLeft: (arrow: A, right: O, value: V) => V;
  readonly actOnRight: (left: O, arrow: A, value: V) => V;
}

const computeCoendFromHarness = <O, A, V>(
  harness: BifunctorHarness<O, A, V>,
): FiniteCoendResult<O, A, V> => {
  const { objects, arrows, evaluate, objectKey, valueKey, actOnLeft, actOnRight, category } = harness;
  const diagonals: Array<DiagonalWitness<O, V>> = [];
  const diagonalIndex = new Map<string, number>();
  for (const object of objects) {
    for (const value of evaluate(object, object)) {
      const key = diagonalKey(objectKey, valueKey, object, value);
      diagonalIndex.set(key, diagonals.length);
      diagonals.push({ object, value, key });
    }
  }

  const parents = diagonals.map((_, index) => index);
  const relations: Array<RelationWitness<O, A, V>> = [];
  const missingDiagonalWitnesses: Array<{
    readonly side: "left" | "right";
    readonly arrow: A;
    readonly object: O;
    readonly value: V;
  }> = [];

  for (const arrow of arrows) {
    const source = category.src(arrow);
    const target = category.dst(arrow);
    const fiber = evaluate(target, source);
    for (const raw of fiber) {
      const leftValue = actOnLeft(arrow, source, raw);
      const rightValue = actOnRight(target, arrow, raw);
      const leftKey = diagonalKey(objectKey, valueKey, source, leftValue);
      const rightKey = diagonalKey(objectKey, valueKey, target, rightValue);

      const leftIndex = diagonalIndex.get(leftKey);
      if (leftIndex === undefined) {
        missingDiagonalWitnesses.push({ side: "left", arrow, object: source, value: leftValue });
        continue;
      }
      const rightIndex = diagonalIndex.get(rightKey);
      if (rightIndex === undefined) {
        missingDiagonalWitnesses.push({ side: "right", arrow, object: target, value: rightValue });
        continue;
      }

      relations.push({
        arrow,
        raw,
        left: { object: source, value: leftValue },
        right: { object: target, value: rightValue },
      });
      union(parents, leftIndex, rightIndex);
    }
  }

  const classesByRoot = new Map<number, { index: number; members: Array<BifunctorElement<O, V>> }>();
  const classes: Array<CoendClass<O, V>> = [];
  const classification = new Map<string, number>();

  diagonals.forEach((element, index) => {
    const root = findRepresentative(parents, index);
    let bucket = classesByRoot.get(root);
    if (bucket === undefined) {
      bucket = { index: classes.length, members: [] };
      classesByRoot.set(root, bucket);
      classes.push({
        representative: { object: element.object, value: element.value },
        members: bucket.members,
        key: element.key,
      });
    }
    bucket.members.push({ object: element.object, value: element.value });
    classification.set(element.key, bucket.index);
  });

  const classify = (element: BifunctorElement<O, V>): CoendClass<O, V> | undefined => {
    const key = diagonalKey(objectKey, valueKey, element.object, element.value);
    const classIndex = classification.get(key);
    if (classIndex === undefined) {
      return undefined;
    }
    const result = classes[classIndex];
    return result === undefined ? undefined : result;
  };

  return {
    classes: classes.map((coendClass) => ({
      representative: coendClass.representative,
      members: [...coendClass.members],
      key: coendClass.key,
    })),
    classify,
    relations: relations.map((relation) => ({ ...relation })),
    diagnostics: {
      diagonalCount: diagonals.length,
      relationCount: relations.length,
      missingDiagonalWitnesses: [...missingDiagonalWitnesses],
      holds: missingDiagonalWitnesses.length === 0,
    },
  };
};

const harnessFromFiniteInput = <O, A, V>(
  input: FiniteBifunctorInput<O, A, V>,
): BifunctorHarness<O, A, V> => ({
  category: input.category,
  objects: input.category.objects,
  arrows: input.category.arrows,
  evaluate: input.evaluate,
  valueKey: input.valueKey,
  objectKey: input.objectKey,
  actOnLeft: input.actOnLeft,
  actOnRight: input.actOnRight,
});

export const computeFiniteCoend = <O, A, V>(
  input: FiniteBifunctorInput<O, A, V>,
): FiniteCoendResult<O, A, V> => computeCoendFromHarness(harnessFromFiniteInput(input));

export const computeDiscreteCoend = <O, A, V>(
  input: DiscreteBifunctorInput<O, A, V>,
): DiscreteCoendResult<O, A, V> =>
  computeFiniteCoend({
    category: {
      ...input.category,
      objects: input.objects,
      arrows: input.arrows,
      eq: (x: A, y: A) => x === y,
    },
    evaluate: input.evaluate,
    valueKey: input.valueKey,
    objectKey: input.objectKey,
    actOnLeft: input.actOnLeft,
    actOnRight: input.actOnRight,
  });

interface TupleIndexDiagnostics {
  readonly enumerated: number;
  readonly truncated: boolean;
}

const MAX_ENUM_COMBINATIONS = 4096;

const buildFamilyIndexTuples = (
  lengths: ReadonlyArray<number>,
): { readonly tuples: ReadonlyArray<ReadonlyArray<number>>; readonly diagnostics: TupleIndexDiagnostics } => {
  let tuples: Array<ReadonlyArray<number>> = [[]];
  let enumerated = 1;
  for (const length of lengths) {
    const next: Array<ReadonlyArray<number>> = [];
    for (const prefix of tuples) {
      for (let index = 0; index < length; index += 1) {
        if (enumerated >= MAX_ENUM_COMBINATIONS) {
          return { tuples: next, diagnostics: { enumerated: MAX_ENUM_COMBINATIONS, truncated: true } };
        }
        next.push([...prefix, index]);
        enumerated += 1;
      }
    }
    tuples = next;
  }
  return { tuples, diagnostics: { enumerated: tuples.length, truncated: false } };
};

interface EndAssignment<O, V> {
  readonly components: ReadonlyArray<BifunctorElement<O, V>>;
  readonly key: string;
}

export interface FiniteEndDiagnostics<O, A, V> {
  readonly enumeratedCandidates: number;
  readonly compatibleCandidates: number;
  readonly truncated: boolean;
  readonly failures: ReadonlyArray<{
    readonly arrow: A;
    readonly source: BifunctorElement<O, V>;
    readonly target: BifunctorElement<O, V>;
    readonly expectedKey: string;
    readonly actualKey: string;
  }>;
}

export interface FiniteEndResult<O, A, V> {
  readonly assignments: ReadonlyArray<EndAssignment<O, V>>;
  readonly diagnostics: FiniteEndDiagnostics<O, A, V>;
}

export type DiscreteEndDiagnostics<O, A, V> = FiniteEndDiagnostics<O, A, V>;
export type DiscreteEndResult<O, A, V> = FiniteEndResult<O, A, V>;

const computeEndFromHarness = <O, A, V>(
  harness: BifunctorHarness<O, A, V>,
): FiniteEndResult<O, A, V> => {
  const { objects, evaluate, arrows, category, actOnLeft, actOnRight, valueKey, objectKey } = harness;
  const diagonalFamilies = objects.map((object) => ({
    object,
    values: evaluate(object, object),
  }));

  const lengths = diagonalFamilies.map((family) => family.values.length);
  if (lengths.some((length) => length === 0)) {
    return {
      assignments: [],
      diagnostics: {
        enumeratedCandidates: 0,
        compatibleCandidates: 0,
        truncated: false,
        failures: [],
      },
    };
  }

  const { tuples, diagnostics: tupleDiagnostics } = buildFamilyIndexTuples(lengths);
  const objectIndex = new Map<O, number>();
  diagonalFamilies.forEach((family, index) => {
    objectIndex.set(family.object, index);
  });

  const assignments: Array<EndAssignment<O, V>> = [];
  const failures: Array<{
    readonly arrow: A;
    readonly source: BifunctorElement<O, V>;
    readonly target: BifunctorElement<O, V>;
    readonly expectedKey: string;
    readonly actualKey: string;
  }> = [];

  for (const tuple of tuples) {
    const components = tuple.map((choice, position) => {
      const family = diagonalFamilies[position];
      if (family === undefined) {
        throw new Error("tuple enumeration referenced a missing diagonal family");
      }
      const value = family.values[choice];
      if (value === undefined) {
        throw new Error("tuple enumeration produced out-of-range index");
      }
      return { object: family.object, value };
    });

    let compatible = true;
    for (const arrow of arrows) {
      const source = category.src(arrow);
      const target = category.dst(arrow);
      const sourceIndex = objectIndex.get(source);
      const targetIndex = objectIndex.get(target);
      if (sourceIndex === undefined || targetIndex === undefined) {
        continue;
      }
      const sourceComponent = components[sourceIndex];
      const targetComponent = components[targetIndex];
      if (sourceComponent === undefined || targetComponent === undefined) {
        continue;
      }
      const transportedSource = actOnRight(source, arrow, sourceComponent.value);
      const transportedTarget = actOnLeft(arrow, target, targetComponent.value);
      const expectedKey = valueKey(source, target, transportedTarget);
      const actualKey = valueKey(source, target, transportedSource);
      if (expectedKey !== actualKey) {
        compatible = false;
        failures.push({
          arrow,
          source: sourceComponent,
          target: targetComponent,
          expectedKey,
          actualKey,
        });
        break;
      }
    }

    if (compatible) {
      const key = components
        .map((component) => diagonalKey(objectKey, valueKey, component.object, component.value))
        .join("||");
      assignments.push({ components, key });
    }
  }

  return {
    assignments: assignments.map((assignment) => ({
      components: [...assignment.components],
      key: assignment.key,
    })),
    diagnostics: {
      enumeratedCandidates: tupleDiagnostics.enumerated,
      compatibleCandidates: assignments.length,
      truncated: tupleDiagnostics.truncated,
      failures,
    },
  };
};

export const computeFiniteEnd = <O, A, V>(
  input: FiniteBifunctorInput<O, A, V>,
): FiniteEndResult<O, A, V> => computeEndFromHarness(harnessFromFiniteInput(input));

export const computeDiscreteEnd = <O, A, V>(
  input: DiscreteBifunctorInput<O, A, V>,
): DiscreteEndResult<O, A, V> =>
  computeFiniteEnd({
    category: {
      ...input.category,
      objects: input.objects,
      arrows: input.arrows,
      eq: (x: A, y: A) => x === y,
    },
    evaluate: input.evaluate,
    valueKey: input.valueKey,
    objectKey: input.objectKey,
    actOnLeft: input.actOnLeft,
    actOnRight: input.actOnRight,
  });
