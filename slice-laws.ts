import type { FiniteCategory } from "./finite-cat";
import { makeSlice, type SliceArrow, type SliceObject } from "./slice-cat";

export interface SliceCategoryLawReport<Obj, Arr> {
  readonly holds: boolean;
  readonly identityFailures: ReadonlyArray<SliceObject<Obj, Arr>>;
  readonly unitFailures: ReadonlyArray<{
    readonly side: "left" | "right";
    readonly arrow: SliceArrow<Obj, Arr>;
    readonly witness: SliceArrow<Obj, Arr>;
  }>;
  readonly associativityFailures: ReadonlyArray<{
    readonly first: SliceArrow<Obj, Arr>;
    readonly second: SliceArrow<Obj, Arr>;
    readonly third: SliceArrow<Obj, Arr>;
    readonly left: SliceArrow<Obj, Arr>;
    readonly right: SliceArrow<Obj, Arr>;
  }>;
}

export function checkSliceCategoryLaws<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  anchor: Obj
): SliceCategoryLawReport<Obj, Arr> {
  const slice = makeSlice(base, anchor);

  const identityFailures: SliceObject<Obj, Arr>[] = [];
  const unitFailures: Array<{
    readonly side: "left" | "right";
    readonly arrow: SliceArrow<Obj, Arr>;
    readonly witness: SliceArrow<Obj, Arr>;
  }> = [];
  const associativityFailures: Array<{
    readonly first: SliceArrow<Obj, Arr>;
    readonly second: SliceArrow<Obj, Arr>;
    readonly third: SliceArrow<Obj, Arr>;
    readonly left: SliceArrow<Obj, Arr>;
    readonly right: SliceArrow<Obj, Arr>;
  }> = [];

  for (const object of slice.objects) {
    const idArrow = slice.id(object);
    if (slice.src(idArrow) !== object || slice.dst(idArrow) !== object) {
      identityFailures.push(object);
    }
  }

  for (const arrow of slice.arrows) {
    const leftUnit = slice.compose(arrow, slice.id(slice.src(arrow)));
    if (!slice.eq(leftUnit, arrow)) {
      unitFailures.push({ side: "left", arrow, witness: leftUnit });
    }

    const rightUnit = slice.compose(slice.id(slice.dst(arrow)), arrow);
    if (!slice.eq(rightUnit, arrow)) {
      unitFailures.push({ side: "right", arrow, witness: rightUnit });
    }
  }

  for (const f of slice.arrows) {
    for (const g of slice.arrows) {
      if (slice.dst(f) !== slice.src(g)) continue;
      for (const h of slice.arrows) {
        if (slice.dst(g) !== slice.src(h)) continue;
        const leftAssoc = slice.compose(h, slice.compose(g, f));
        const rightAssoc = slice.compose(slice.compose(h, g), f);
        if (!slice.eq(leftAssoc, rightAssoc)) {
          associativityFailures.push({
            first: f,
            second: g,
            third: h,
            left: leftAssoc,
            right: rightAssoc,
          });
        }
      }
    }
  }

  return {
    holds:
      identityFailures.length === 0 &&
      unitFailures.length === 0 &&
      associativityFailures.length === 0,
    identityFailures,
    unitFailures,
    associativityFailures,
  };
}
