// 🔮 BEGIN_MATH: SetMultOracles
// 📝 Brief: Executable checks for Set-based multivalued morphisms and their infinite products.
// 🏗️ Domain: Category theory / Set-valued functors
// 🔗 Integration: Complements Markov and semicartesian infrastructure with SetMult diagnostics.
// 📋 Plan:
//   1. Validate copy/discard semicartesian laws on sample points.
//   2. Confirm infinite-product projections agree with Set cartesian products.
//   3. Expose determinism checks that certify singleton fibres.

import type { CountabilityWitness } from "./markov-infinite";
import type {
  DeterministicSetMultResult,
  DeterministicSetMultWitness,
  SetMultIndexedFamily,
  SetMultObj,
  SetMulti,
} from "./setmult-category";
import {
  composeSetMulti,
  copySetMulti,
  createSetMultInfObj,
  deterministicToSetMulti,
  discardSetMulti,
  idSetMulti,
  isDeterministicSetMulti,
  setMultUnit,
  setMultUnitObj,
  tensorSetMulti,
  tensorSetMultObj,
} from "./setmult-category";

type Triple<T> = readonly [T, T, T];

const equalSet = <T>(eq: (a: T, b: T) => boolean, left: ReadonlySet<T>, right: ReadonlySet<T>): boolean => {
  if (left.size !== right.size) return false;
  for (const value of left) {
    let found = false;
    for (const candidate of right) {
      if (eq(candidate, value)) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
};

const flattenLeftTriple = <T>(value: readonly [readonly [T, T], T]): Triple<T> => [value[0][0], value[0][1], value[1]];
const flattenRightTriple = <T>(value: readonly [T, readonly [T, T]]): Triple<T> => [value[0], value[1][0], value[1][1]];

const tripleEq = <T>(eq: (a: T, b: T) => boolean) => (a: Triple<T>, b: Triple<T>): boolean =>
  eq(a[0], b[0]) && eq(a[1], b[1]) && eq(a[2], b[2]);

export interface SetMultComonoidFailure<T> {
  readonly sample: T;
  readonly law: "copy" | "discard" | "coassociativity" | "leftCounit" | "rightCounit";
  readonly expected: string;
  readonly actual: string;
}

export interface SetMultComonoidReport<T> {
  readonly holds: boolean;
  readonly details: string;
  readonly failures: ReadonlyArray<SetMultComonoidFailure<T>>;
}

const describeSet = <T>(show: (value: T) => string, set: ReadonlySet<T>): string =>
  `{${Array.from(set).map((value) => show(value)).join(", ")}}`;

export function checkSetMultComonoid<T>(
  object: SetMultObj<T>,
  samples: ReadonlyArray<T>,
): SetMultComonoidReport<T> {
  const failures: Array<SetMultComonoidFailure<T>> = [];
  const copy = copySetMulti(object);
  const discard = discardSetMulti<T>();
  const id = idSetMulti(object);

  const pairObj = tensorSetMultObj(object, object);
  const leftTensorObj = tensorSetMultObj(pairObj, object);
  const rightTensorObj = tensorSetMultObj(object, pairObj);

  const copyTensorId = tensorSetMulti(leftTensorObj, copy, id);
  const idTensorCopy = tensorSetMulti(rightTensorObj, id, copy);

  const leftAssociative = composeSetMulti(leftTensorObj, copy, copyTensorId);
  const rightAssociative = composeSetMulti(rightTensorObj, copy, idTensorCopy);

  const discardTensorId = tensorSetMulti(tensorSetMultObj(setMultUnitObj, object), discard, id);
  const idTensorDiscard = tensorSetMulti(tensorSetMultObj(object, setMultUnitObj), id, discard);

  const projectRight = deterministicToSetMulti(
    tensorSetMultObj(setMultUnitObj, object),
    object,
    ([, value]) => value,
  );
  const projectLeft = deterministicToSetMulti(
    tensorSetMultObj(object, setMultUnitObj),
    object,
    ([value]) => value,
  );

  const leftCounit = composeSetMulti(
    object,
    copy,
    composeSetMulti(object, discardTensorId, projectRight),
  );
  const rightCounit = composeSetMulti(
    object,
    copy,
    composeSetMulti(object, idTensorDiscard, projectLeft),
  );

  const tripleShow = (triple: Triple<T>): string =>
    `(${object.show(triple[0])}, ${object.show(triple[1])}, ${object.show(triple[2])})`;

  for (const sample of samples) {
    const copyFibre = copy(sample);
    if (!equalSet(pairObj.eq, copyFibre, new Set([[sample, sample] as const]))) {
      failures.push({
        sample,
        law: "copy",
        expected: `{{(${object.show(sample)}, ${object.show(sample)})}}`,
        actual: describeSet(([x, y]) => `(${object.show(x)}, ${object.show(y)})`, copyFibre),
      });
    }

    const discardFibre = discard(sample);
    if (discardFibre.size !== 1 || !discardFibre.has(setMultUnit)) {
      failures.push({
        sample,
        law: "discard",
        expected: "{⋆}",
        actual: describeSet(setMultUnitObj.show, discardFibre),
      });
    }

    const leftTriples = new Set(Array.from(leftAssociative(sample), flattenLeftTriple));
    const rightTriples = new Set(Array.from(rightAssociative(sample), flattenRightTriple));
    if (!equalSet(tripleEq(object.eq), leftTriples, rightTriples)) {
      failures.push({
        sample,
        law: "coassociativity",
        expected: describeSet(tripleShow, rightTriples),
        actual: describeSet(tripleShow, leftTriples),
      });
    }

    const leftCounitFibre = leftCounit(sample);
    const rightCounitFibre = rightCounit(sample);
    const identityFibre = id(sample);

    if (!equalSet(object.eq, leftCounitFibre, identityFibre)) {
      failures.push({
        sample,
        law: "leftCounit",
        expected: describeSet(object.show, identityFibre),
        actual: describeSet(object.show, leftCounitFibre),
      });
    }

    if (!equalSet(object.eq, rightCounitFibre, identityFibre)) {
      failures.push({
        sample,
        law: "rightCounit",
        expected: describeSet(object.show, identityFibre),
        actual: describeSet(object.show, rightCounitFibre),
      });
    }
  }

  const holds = failures.length === 0;
  const details = holds
    ? `Copy/discard satisfied semicartesian laws on ${samples.length} sample${samples.length === 1 ? "" : "s"}.`
    : `${failures.length} semicartesian check${failures.length === 1 ? "" : "s"} failed.`;

  return { holds, details, failures };
}

export interface SetMultProjectionFailure<J> {
  readonly subset: ReadonlyArray<J>;
  readonly reason: string;
}

export interface SetMultInfiniteProductReport<J, X> {
  readonly holds: boolean;
  readonly details: string;
  readonly failures: ReadonlyArray<SetMultProjectionFailure<J>>;
  readonly countability?: CountabilityWitness<J>;
}

export interface SetMultProjectionTest<J, X> {
  readonly subset: ReadonlyArray<J>;
  readonly expected?: ReadonlyMap<J, X>;
}

export function checkSetMultInfiniteProduct<J, X>(
  family: SetMultIndexedFamily<J, X>,
  assignment: (index: J) => X,
  tests: ReadonlyArray<SetMultProjectionTest<J, X>>,
): SetMultInfiniteProductReport<J, X> {
  const product = createSetMultInfObj(family);
  const tuple = product.carrier(assignment);
  const failures: Array<SetMultProjectionFailure<J>> = [];

  for (const test of tests) {
    const projection = product.project(tuple, test.subset);
    const expected = test.expected ?? new Map(test.subset.map((index) => [index, assignment(index)]));
    let ok = projection.size === expected.size;
    if (ok) {
      for (const index of test.subset) {
        if (!projection.has(index) || projection.get(index) !== expected.get(index)) {
          ok = false;
          break;
        }
      }
    }
    if (!ok) {
      failures.push({
        subset: test.subset,
        reason: `Projection differed: expected ${JSON.stringify(Array.from(expected.entries()))} but received ${JSON.stringify(
          Array.from(projection.entries()),
        )}`,
      });
    }
  }

  const holds = failures.length === 0;
  const details = holds
    ? `All ${tests.length} projections matched the Set-theoretic product.`
    : `${failures.length} projection${failures.length === 1 ? "" : "s"} failed.`;

  return {
    holds,
    details,
    failures,
    ...(product.countability !== undefined ? { countability: product.countability } : {}),
  };
}

export interface SetMultDeterminismSummary<A, B> {
  readonly holds: boolean;
  readonly details: string;
  readonly report: DeterministicSetMultResult<A, B>;
}

export function checkSetMultDeterministic<A, B>(
  witness: DeterministicSetMultWitness<A, B>,
  samples: Iterable<A>,
): SetMultDeterminismSummary<A, B> {
  const report = isDeterministicSetMulti(witness, { samples });
  return {
    holds: report.deterministic,
    details: report.details,
    report,
  };
}

// 🔮 END_MATH
