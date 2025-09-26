import { Dual } from "./dual-cat";
import type { FiniteCategory } from "./finite-cat";
import type { SimpleCat } from "./simple-cat";
import { makeCoslice, makeSlice, type CosliceArrow, type CosliceObject, type SliceArrow, type SliceObject } from "./slice-cat";
import type { PullbackCalculator } from "./pullback";
import { makeReindexingFunctor, type ReindexingFunctor } from "./reindexing";
import type { Functor } from "./functor";
import { Pairing, Pi1, Pi2, ProductCat, type ArrPair, type ObjPair } from "./product-cat";
import { makeSubcategory, makeFullSubcategory, isFullSubcategory, type SmallCategory } from "./subcategory";
import type { Morph } from "./diagram";

export interface SliceToolkit<Obj, Arr> {
  readonly category: FiniteCategory<SliceObject<Obj, Arr>, SliceArrow<Obj, Arr>>;
  readonly projection: (object: SliceObject<Obj, Arr>) => Obj;
  readonly anchor: Obj;
}

export interface CosliceToolkit<Obj, Arr> {
  readonly category: FiniteCategory<CosliceObject<Obj, Arr>, CosliceArrow<Obj, Arr>>;
  readonly inclusion: (object: CosliceObject<Obj, Arr>) => Obj;
  readonly anchor: Obj;
}

export interface ProductToolkit<CObj, CArr, DObj, DArr> {
  readonly category: SimpleCat<ObjPair<CObj, DObj>, ArrPair<CObj, DObj, CArr, DArr>>;
  readonly pi1: Functor<ObjPair<CObj, DObj>, ArrPair<CObj, DObj, CArr, DArr>, CObj, CArr>;
  readonly pi2: Functor<ObjPair<CObj, DObj>, ArrPair<CObj, DObj, CArr, DArr>, DObj, DArr>;
  readonly pairing: <XO, XA>(
    F: Functor<XO, XA, CObj, CArr>,
    G: Functor<XO, XA, DObj, DArr>,
  ) => Functor<XO, XA, ObjPair<CObj, DObj>, ArrPair<CObj, DObj, CArr, DArr>>;
}

export interface SubcategoryToolkit<Obj, Arr extends Morph> {
  readonly make: (
    seedObjects: Iterable<Obj>,
    seedArrows: Iterable<Arr>,
  ) => SmallCategory<Obj, Arr>;
  readonly full: (seedObjects: Iterable<Obj>) => SmallCategory<Obj, Arr>;
  readonly isFull: (candidate: SmallCategory<Obj, Arr>) => boolean;
}

export interface TextbookToolkitOptions<Obj, Arr> {
  readonly pullbacks?: PullbackCalculator<Obj, Arr>;
  readonly asSmallCategory?: SmallCategory<Obj, Arr & Morph>;
}

export interface TextbookToolkit<Obj, Arr> {
  readonly base: FiniteCategory<Obj, Arr>;
  readonly dual: () => FiniteCategory<Obj, Arr>;
  readonly sliceAt: (anchor: Obj) => SliceToolkit<Obj, Arr>;
  readonly cosliceFrom: (anchor: Obj) => CosliceToolkit<Obj, Arr>;
  readonly productWith: <DObj, DArr>(
    D: FiniteCategory<DObj, DArr>,
  ) => ProductToolkit<Obj, Arr, DObj, DArr>;
  readonly reindexAlong?: (
    h: Arr,
    sourceAnchor: Obj,
    targetAnchor: Obj,
  ) => ReindexingFunctor<Obj, Arr>;
  readonly subcategoryTools?: SubcategoryToolkit<Obj, Arr & Morph>;
}

function dualFiniteCategory<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
): FiniteCategory<Obj, Arr> {
  return {
    objects: [...base.objects],
    arrows: [...base.arrows],
    eq: (x, y) => base.eq(x, y),
    id: (object) => base.id(object),
    compose: (g, f) => base.compose(f, g),
    src: (arrow) => base.dst(arrow),
    dst: (arrow) => base.src(arrow),
  };
}

export function makeTextbookToolkit<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  options: TextbookToolkitOptions<Obj, Arr> = {},
): TextbookToolkit<Obj, Arr> {
  const { pullbacks, asSmallCategory } = options;

  const productWith = <DObj, DArr>(
    D: FiniteCategory<DObj, DArr>,
  ): ProductToolkit<Obj, Arr, DObj, DArr> => ({
    category: ProductCat(base, D),
    pi1: Pi1(base, D),
    pi2: Pi2(base, D),
    pairing: (F, G) => Pairing(F, G, base, D),
  });

  const sliceAt = (anchor: Obj): SliceToolkit<Obj, Arr> => ({
    category: makeSlice(base, anchor),
    projection: (object) => object.domain,
    anchor,
  });

  const cosliceFrom = (anchor: Obj): CosliceToolkit<Obj, Arr> => ({
    category: makeCoslice(base, anchor),
    inclusion: (object) => object.codomain,
    anchor,
  });

  return {
    base,
    dual: () => dualFiniteCategory(base),
    sliceAt,
    cosliceFrom,
    productWith,
    ...(pullbacks
      ? {
          reindexAlong: (h: Arr, sourceAnchor: Obj, targetAnchor: Obj) =>
            makeReindexingFunctor(base, pullbacks, h, sourceAnchor, targetAnchor),
        }
      : {}),
    ...(asSmallCategory
      ? {
          subcategoryTools: {
            make: (seedObjects: Iterable<Obj>, seedArrows: Iterable<Arr & Morph>) =>
              makeSubcategory(asSmallCategory, seedObjects, seedArrows),
            full: (seedObjects: Iterable<Obj>) => makeFullSubcategory(asSmallCategory, seedObjects),
            isFull: (candidate: SmallCategory<Obj, Arr & Morph>) =>
              isFullSubcategory(candidate, asSmallCategory),
          } satisfies SubcategoryToolkit<Obj, Arr & Morph>,
        }
      : {}),
  };
}
