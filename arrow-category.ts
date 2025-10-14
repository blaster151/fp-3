import type { FiniteCategory } from "./finite-cat";
import { pushUnique } from "./finite-cat";
import type { Functor } from "./functor";

export interface ArrowSquare<Arr> {
  readonly src: Arr;
  readonly dst: Arr;
  readonly j: Arr;
  readonly k: Arr;
}

function squareEq<Obj, Arr>(base: FiniteCategory<Obj, Arr>) {
  return (a: ArrowSquare<Arr>, b: ArrowSquare<Arr>): boolean =>
    base.eq(a.src, b.src) &&
    base.eq(a.dst, b.dst) &&
    base.eq(a.j, b.j) &&
    base.eq(a.k, b.k);
}

export function makeArrowCategory<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
): FiniteCategory<Arr, ArrowSquare<Arr>> {
  const objects = [...base.arrows];
  const eq = squareEq(base);
  const arrows: ArrowSquare<Arr>[] = [];

  const id = (arrow: Arr): ArrowSquare<Arr> => ({
    src: arrow,
    dst: arrow,
    j: base.id(base.src(arrow)),
    k: base.id(base.dst(arrow)),
  });

  for (const arrow of objects) {
    pushUnique(arrows, id(arrow), eq);
  }

  for (const f of objects) {
    for (const g of objects) {
      for (const j of base.arrows) {
        if (base.src(j) !== base.src(f) || base.dst(j) !== base.src(g)) continue;
        for (const k of base.arrows) {
          if (base.src(k) !== base.dst(f) || base.dst(k) !== base.dst(g)) continue;
          const left = base.compose(k, f);
          const right = base.compose(g, j);
          if (base.eq(left, right)) {
            pushUnique(arrows, { src: f, dst: g, j, k }, eq);
          }
        }
      }
    }
  }

  const compose = (
    g: ArrowSquare<Arr>,
    f: ArrowSquare<Arr>,
  ): ArrowSquare<Arr> => {
    if (!base.eq(f.dst, g.src)) {
      throw new Error("makeArrowCategory: square domains mismatch");
    }
    const j = base.compose(g.j, f.j);
    const k = base.compose(g.k, f.k);
    const left = base.compose(k, f.src);
    const right = base.compose(g.dst, j);
    if (!base.eq(left, right)) {
      throw new Error("makeArrowCategory: pasted square does not commute");
    }
    return { src: f.src, dst: g.dst, j, k };
  };

  const src = (square: ArrowSquare<Arr>): Arr => square.src;
  const dst = (square: ArrowSquare<Arr>): Arr => square.dst;

  return { objects, arrows, id, compose, src, dst, eq };
}

export function makeArrowDomainFunctor<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
): Functor<Arr, ArrowSquare<Arr>, Obj, Arr> {
  return {
    F0: (arrow) => base.src(arrow),
    F1: (square) => square.j,
  };
}

export function makeArrowCodomainFunctor<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
): Functor<Arr, ArrowSquare<Arr>, Obj, Arr> {
  return {
    F0: (arrow) => base.dst(arrow),
    F1: (square) => square.k,
  };
}
