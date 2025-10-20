/**
 * LAW: Profunctor laws for the Arrow IR wrapper
 *
 * - Identity: dimap(id, id) = id
 * - Composition: dimap(f ∘ g, h ∘ i) = dimap(g, h) ∘ dimap(f, i)
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { arrProfunctor, dimapProfunctor, runProfunctor } from "../../allTS";

const idNumber = (n: number): number => n;
const compose = (f: (n: number) => number, g: (n: number) => number) => (n: number): number => f(g(n));

const functionPool: ReadonlyArray<(n: number) => number> = [
  (n) => n,
  (n) => n + 1,
  (n) => n - 1,
  (n) => 2 * n,
  (n) => -n,
  (n) => n * n,
];

describe("LAW: Profunctor (Arrow IR) laws", () => {
  const genFn = () => fc.constantFrom(...functionPool);
  const genInput = () => fc.integer({ min: -5, max: 5 });

  it("Identity", () => {
    fc.assert(
      fc.property(genFn(), genInput(), (base, value) => {
        const prof = arrProfunctor(base);
        const lhs = runProfunctor(dimapProfunctor(prof, idNumber, idNumber))(value);
        const rhs = runProfunctor(prof)(value);
        return lhs === rhs;
      }),
    );
  });

  it("Composition", () => {
    fc.assert(
      fc.property(
        fc.tuple(genFn(), genFn(), genFn(), genFn(), genFn(), genInput()),
        ([base, f, g, h, i, value]) => {
          const prof = arrProfunctor(base);

          const lhs = runProfunctor(
            dimapProfunctor(prof, compose(f, g), compose(h, i)),
          )(value);

          const rhs = runProfunctor(
            dimapProfunctor(dimapProfunctor(prof, f, i), g, h),
          )(value);

          return lhs === rhs;
        },
      ),
    );
  });
});
