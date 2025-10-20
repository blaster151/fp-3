/**
 * LAW: Strong profunctor laws for the Arrow IR wrapper
 *
 * - Naturality: first(f) respects dimap on the primary component
 * - Associativity: first(first(f)) ∘ assoc = assoc ∘ first(f)
 * - Unitality: first(f) ∘ unitor = unitor ∘ f
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
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

describe("LAW: Strong profunctor (Arrow IR) laws", () => {
  const genFn = () => fc.constantFrom(...functionPool);
  const genPair = () => fc.tuple(fc.integer({ min: -3, max: 3 }), fc.integer({ min: -3, max: 3 })).map((value) => [value[0], value[1]] as const);
  const genTriple = () =>
    fc
      .tuple(fc.integer({ min: -2, max: 2 }), fc.integer({ min: -2, max: 2 }), fc.integer({ min: -2, max: 2 }))
      .map((value) => [[value[0], value[1]] as const, value[2]] as const);

  it("Naturality", () => {
    fc.assert(
      fc.property(fc.tuple(genFn(), genFn(), genFn(), genPair()), ([base, pre, post, sample]) => {
        const prof = arrProfunctor(base);
        const lhs = runProfunctor(firstProfunctor(dimapProfunctor(prof, pre, post)))(sample);
        const rhs = runProfunctor(
          dimapProfunctor(firstProfunctor(prof), liftPre(pre), liftPost(post)),
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
          composeProfunctor(assoc, firstProfunctor(firstProfunctor(prof))),
        )(sample);
        const rhs = runProfunctor(
          composeProfunctor(firstProfunctor(prof), assoc),
        )(sample);
        return eqNested(lhs, rhs);
      }),
    );
  });

  it("Unitality", () => {
    const unitor = arrProfunctor(introduceUnit);

    fc.assert(
      fc.property(fc.tuple(genFn(), fc.integer({ min: -5, max: 5 })), ([base, sample]) => {
        const prof = arrProfunctor(base);
        const lhs = runProfunctor(
          composeProfunctor(unitor, firstProfunctor(prof)),
        )(sample);
        const rhs = runProfunctor(
          composeProfunctor(prof, unitor),
        )(sample);
        return eqUnitPair(lhs, rhs);
      }),
    );
  });
});
