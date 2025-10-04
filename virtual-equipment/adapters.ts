import type { FiniteCategory } from "../finite-cat";
import type { Rel } from "../rel";
import { RelCat } from "../rel";
import type { SetHom, SetObj } from "../set-cat";
import { SetCat } from "../set-cat";
import type { CosliceArrow, CosliceObject, SliceArrow, SliceObject } from "../slice-cat";
import { makeCoslice, makeSlice } from "../slice-cat";
import type { ObjectEquality, VirtualEquipment } from "./virtual-equipment";
import { virtualizeCategory } from "./virtual-equipment";
import type { Tight, TightCategory } from "./tight-primitives";
import type { TightCellEvidence } from "./virtual-equipment";

type DegenerateEquipment<Obj, Arr> = VirtualEquipment<
  Obj,
  Arr,
  Tight<TightCategory<Obj, Arr>, TightCategory<Obj, Arr>>,
  TightCellEvidence<Obj, Arr>
>;

export interface FiniteVirtualizationOptions<Obj> {
  readonly equalsObjects?: ObjectEquality<Obj>;
}

export const virtualizeFiniteCategory = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  options: FiniteVirtualizationOptions<Obj> = {},
): DegenerateEquipment<Obj, Arr> =>
  virtualizeCategory(category, {
    objects: category.objects,
    equalsObjects: options.equalsObjects,
  });

export type RelCarrier = ReadonlyArray<unknown>;

export interface RelEquipmentArrow {
  readonly domain: RelCarrier;
  readonly codomain: RelCarrier;
  readonly relation: Rel<unknown, unknown>;
}

const RelSimpleCategory: TightCategory<RelCarrier, RelEquipmentArrow> = {
  id: (carrier) => ({
    domain: carrier,
    codomain: carrier,
    relation: RelCat.id(carrier),
  }),
  compose: (g, f) => {
    if (f.codomain !== g.domain) {
      throw new Error("RelSimpleCategory: attempted to compose non-matching relations.");
    }
    return {
      domain: f.domain,
      codomain: g.codomain,
      relation: RelCat.compose(g.relation as Rel<unknown, unknown>, f.relation as Rel<unknown, unknown>),
    };
  },
  src: (arrow) => arrow.domain,
  dst: (arrow) => arrow.codomain,
};

export interface RelEquipmentOptions {
  readonly equalsObjects?: ObjectEquality<RelCarrier>;
}

export const makeRelEquipment = (
  carriers: ReadonlyArray<RelCarrier>,
  options: RelEquipmentOptions = {},
): DegenerateEquipment<RelCarrier, RelEquipmentArrow> =>
  virtualizeCategory(RelSimpleCategory, {
    objects: carriers,
    equalsObjects: options.equalsObjects,
  });

type AnySetObj = SetObj<unknown>;
type AnySetHom = SetHom<unknown, unknown>;

const SetSimpleCategory: TightCategory<AnySetObj, AnySetHom> = {
  id: SetCat.id,
  compose: (g, f) => {
    if (f.cod !== g.dom) {
      throw new Error("SetSimpleCategory: compose expects matching domains and codomains.");
    }
    return SetCat.compose(g, f) as SetHom<unknown, unknown>;
  },
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
};

export interface SetEquipmentOptions {
  readonly equalsObjects?: ObjectEquality<AnySetObj>;
}

export const makeSetEquipment = (
  objects: ReadonlyArray<AnySetObj>,
  options: SetEquipmentOptions = {},
): DegenerateEquipment<AnySetObj, AnySetHom> =>
  virtualizeCategory(SetSimpleCategory, {
    objects,
    equalsObjects: options.equalsObjects,
  });

export interface SliceEquipmentOptions<Obj, Arr> {
  readonly equalsObjects?: ObjectEquality<SliceObject<Obj, Arr>>;
}

export const makeSliceEquipment = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  anchor: Obj,
  options: SliceEquipmentOptions<Obj, Arr> = {},
): DegenerateEquipment<SliceObject<Obj, Arr>, SliceArrow<Obj, Arr>> =>
  virtualizeFiniteCategory(makeSlice(base, anchor), options);

export interface CosliceEquipmentOptions<Obj, Arr> {
  readonly equalsObjects?: ObjectEquality<CosliceObject<Obj, Arr>>;
}

export const makeCosliceEquipment = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  anchor: Obj,
  options: CosliceEquipmentOptions<Obj, Arr> = {},
): DegenerateEquipment<CosliceObject<Obj, Arr>, CosliceArrow<Obj, Arr>> =>
  virtualizeFiniteCategory(makeCoslice(base, anchor), options);

export const RelTightCategory = RelSimpleCategory;
export const SetTightCategory = SetSimpleCategory;
