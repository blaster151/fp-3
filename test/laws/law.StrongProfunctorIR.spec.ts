/**
 * LAW: Strong profunctor laws for the Arrow IR wrapper
 *
 * - Naturality: first(f) respects dimap on the primary component
 * - Associativity: first(first(f)) ∘ assoc = assoc ∘ first(f)
 * - Unitality: first(f) ∘ unitor = unitor ∘ f
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import type { Arbitrary } from "fast-check";
import {
  arrProfunctor,
  composeProfunctor,
  dimapProfunctor,
  firstProfunctor,
  runProfunctor,
} from "../../allTS";

type Pair = readonly [number, number];
type NestedPair = readonly [number, Pair];
type Triple = readonly [Pair, number];

type UnitPair = readonly [number, undefined];

type NumFn = (n: number) => number;

const functionPool: ReadonlyArray<NumFn> = [
  (n) => n,
  (n) => n + 1,
  (n) => n - 1,
  (n) => 2 * n,
  (n) => -n,
  (n) => n * n,
];

const liftPre = (f: NumFn) => (value: Pair): Pair => [f(value[0]), value[1]] as const;
const liftPost = (f: NumFn) => (value: Pair): Pair => [f(value[0]), value[1]] as const;

const assocForward = (value: Triple): NestedPair => [value[0][0], [value[0][1], value[1]] as const] as const;

const introduceUnit = (value: number): UnitPair => [value, undefined] as const;

const eqPair = (a: Pair, b: Pair): boolean => a[0] === b[0] && a[1] === b[1];
const eqNested = (a: NestedPair, b: NestedPair): boolean => a[0] === b[0] && eqPair(a[1], b[1]);
const eqUnitPair = (a: UnitPair, b: UnitPair): boolean => a[0] === b[0] && a[1] === b[1];

const mustMap = <T, U>(arb: Arbitrary<T>, mapper: (value: T) => U): Arbitrary<U> => {
  const mapFn = arb.map;
  if (!mapFn) {
    throw new Error("fast-check Arbitrary.map is not available in this environment");
  }
  return mapFn(mapper as (value: unknown) => U) as Arbitrary<U>;
};

const boundedIntegers = (min: number, max: number): Arbitrary<number> => {
  const values: number[] = [];
  for (let value = min; value <= max; value += 1) {
    values.push(value);
  }
  return fc.constantFrom(...values);
};

describe("LAW: Strong profunctor (Arrow IR) laws", () => {
  const genFn = (): Arbitrary<NumFn> => fc.constantFrom(...functionPool);
  const genPair = (): Arbitrary<Pair> =>
    mustMap(
      fc.tuple(boundedIntegers(-3, 3), boundedIntegers(-3, 3)),
      (value) => [value[0], value[1]] as const,
    );
  const genTriple = (): Arbitrary<Triple> =>
    mustMap(
      fc.tuple(boundedIntegers(-2, 2), boundedIntegers(-2, 2), boundedIntegers(-2, 2)),
      (value) => [[value[0], value[1]] as const, value[2]] as const,
    );

  it("Naturality", () => {
    fc.assert(
      fc.property(fc.tuple(genFn(), genFn(), genFn(), genPair()), ([base, pre, post, sample]) => {
        const prof = arrProfunctor(base);
        const lhs = runProfunctor(
          firstProfunctor<number, number, number>(dimapProfunctor(prof, pre, post)),
        )(sample);
        const rhs = runProfunctor(
          dimapProfunctor(
            firstProfunctor<number, number, number>(prof),
            liftPre(pre),
            liftPost(post),
          ),
        )(sample);
        return eqPair(lhs, rhs);
      }),
    );
  });

  it("Associativity", () => {
    const assoc = arrProfunctor(assocForward);

    fc.assert(
      fc.property(fc.tuple(genFn(), genTriple()), ([base, sample]) => {
        const prof = arrProfunctor(base);
        const lhs = runProfunctor(
          composeProfunctor(
            firstProfunctor<Pair, Pair, number>(
              firstProfunctor<number, number, number>(prof),
            ),
            assoc,
          ),
        )(sample);
        const rhs = runProfunctor(
          composeProfunctor(
            assoc,
            firstProfunctor<number, number, Pair>(prof),
          ),
        )(sample);
        return eqNested(lhs, rhs);
      }),
    );
  });

  it("Unitality", () => {
    const unitor = arrProfunctor(introduceUnit);

    fc.assert(
      fc.property(fc.tuple(genFn(), boundedIntegers(-5, 5)), ([base, sample]) => {
        const prof = arrProfunctor(base);
        const lhs = runProfunctor(
          composeProfunctor(
            unitor,
            firstProfunctor<number, number, undefined>(prof),
          ),
        )(sample);
        const rhs = runProfunctor(
          composeProfunctor(prof, unitor),
        )(sample);
        return eqUnitPair(lhs, rhs);
      }),
    );
  });
});
