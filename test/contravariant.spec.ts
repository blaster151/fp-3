import { describe, expect, it, test } from "vitest";
import {
  Contra,
  constructContravariantFunctorWithWitness,
  contravariantToOppositeFunctor,
  homSetContravariantFunctorWithWitness,
  isContravariant,
  oppositeFunctorToContravariant,
} from "../contravariant";
import { SetCat, type SetHom, type SetObj } from "../set-cat";
import type { SimpleCat } from "../simple-cat";

type Obj = 0 | 1;
type Arr = { readonly s: Obj; readonly t: Obj };

const Thin2: SimpleCat<Obj, Arr> = {
  id: (x: Obj) => ({ s: x, t: x }),
  compose: (g: Arr, f: Arr) => ({ s: f.s, t: g.t }),
  src: (arrow: Arr) => arrow.s,
  dst: (arrow: Arr) => arrow.t,
};

type Point = "•";
type SetArrow = (value: number) => number;
const SetLike: SimpleCat<Point, SetArrow> = {
  id: (_object: Point) => (value: number) => value,
  compose: (g: SetArrow, f: SetArrow) => (value: number) => g(f(value)),
  src: (_arrow: SetArrow) => "•",
  dst: (_arrow: SetArrow) => "•",
};

describe("contravariant functor", () => {
  test("constructContravariantFunctorWithWitness certifies reversed composition", () => {
    const arrows: Arr[] = [
      { s: 0, t: 0 },
      { s: 1, t: 1 },
      { s: 0, t: 1 },
    ];

    const composablePairs = arrows.flatMap((f) =>
      arrows
        .filter((g) => g.s === f.t)
        .map((g) => ({ f, g })),
    );

    const witness = constructContravariantFunctorWithWitness(
      Thin2,
      SetLike,
      Contra(
        Thin2,
        SetLike,
        (_object: Obj): Point => "•",
        (_arrow: Arr): SetArrow => (value: number) => value + 1,
      ),
      { objects: [0, 1], arrows, composablePairs },
      [
        "Thin₂ contravariant witness verifies identity preservation and reversed composition checks.",
      ],
    );

    expect(witness.report.holds).toBe(true);
    expect(witness.report.preservesReversedComposition).toBe(true);

    const opposite = contravariantToOppositeFunctor(witness);
    expect(opposite.report.holds).toBe(true);

    const roundTrip = oppositeFunctorToContravariant(Thin2, opposite);
    expect(roundTrip.report.holds).toBe(true);
    expect(roundTrip.witness.composablePairs).toEqual(witness.witness.composablePairs);
  });

  it("packages the Set-based Hom(-, X) contravariant functor", () => {
    const booleans = SetCat.obj([false, true]);
    const toolkit = homSetContravariantFunctorWithWitness(booleans as SetObj<unknown>);

    expect(toolkit.functor.report.holds).toBe(true);

    const numbers = SetCat.obj([0, 1]);
    const swap = SetCat.hom(
      numbers,
      numbers,
      (value: number) => (value + 1) % 2,
    );

    const widenedSwap = swap as SetHom<unknown, unknown>;

    const domain = toolkit.functor.functor.F0(widenedSwap.cod as SetObj<unknown>);
    const codomain = toolkit.functor.functor.F0(widenedSwap.dom as SetObj<unknown>);

    const select = toolkit.register(widenedSwap.cod as SetObj<unknown>, (value: unknown) => value === 0);
    const mapped = toolkit.functor.functor.F1(widenedSwap).map(select);

    expect(domain.has(select)).toBe(true);
    expect(codomain.has(mapped)).toBe(true);

    const mappedFunction = mapped as (value: number) => boolean;
    expect(mappedFunction(0)).toBe(true);
    expect(mappedFunction(1)).toBe(false);
  });

  it("keeps the legacy boolean helper aligned", () => {
    const functor = Contra(
      Thin2,
      SetLike,
      (_object: Obj): Point => "•",
      (_arrow: Arr): SetArrow => (value: number) => value + 1,
    );

    const arrows: Arr[] = [
      { s: 0, t: 0 },
      { s: 0, t: 1 },
      { s: 1, t: 1 },
    ];
    const ok = isContravariant(Thin2, SetLike, functor, [0, 1], arrows);
    expect(ok).toBe(true);
  });
});
