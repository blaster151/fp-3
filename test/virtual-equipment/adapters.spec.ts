import { describe, expect, test } from "vitest";
import type { Functor } from "../../functor";
import {
  RelTightCategory,
  horizontalComposeProarrows,
  identityProarrow,
  makeCosliceEquipment,
  makeRelEquipment,
  makeSetEquipment,
  makeSliceEquipment,
  promoteFunctor,
  summarizeEquipmentOracles,
  virtualizeCategory,
  virtualizeFiniteCategory,
} from "../../virtual-equipment";
import { TwoObjectCategory, nonIdentity } from "../../two-object-cat";
import type { TwoArrow, TwoObject } from "../../two-object-cat";
import { OrdObj } from "../../finord";
import type { Ord } from "../../finord";
import { SetCat } from "../../set-cat";

const constantStarFunctor: Functor<TwoObject, TwoArrow, TwoObject, TwoArrow> = {
  F0: () => "★",
  F1: () => TwoObjectCategory.id("★"),
};

describe("virtual equipment adapters", () => {
  test("virtualizeCategory wraps SimpleCat instances", () => {
    const { functor: idFunctor } = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      {
        F0: (obj: TwoObject) => obj,
        F1: (arrow: TwoArrow) => arrow,
      },
      {
        objects: TwoObjectCategory.objects,
        composablePairs: [
          { f: TwoObjectCategory.id("•"), g: TwoObjectCategory.id("•") },
          { f: nonIdentity, g: TwoObjectCategory.id("★") },
        ],
      },
    );

    const equipment = virtualizeCategory(TwoObjectCategory, {
      objects: TwoObjectCategory.objects,
    });

    const idDot = identityProarrow(equipment, "•");
    expect(idDot.payload.onObj("•")).toBe("•");
    expect(idFunctor.onMor(nonIdentity)).toBe(nonIdentity);
    expect(idDot.payload.onMor(nonIdentity)).toBe(idFunctor.onMor(nonIdentity));

    const constStar = promoteFunctor(
      TwoObjectCategory,
      TwoObjectCategory,
      constantStarFunctor,
      {
        objects: TwoObjectCategory.objects,
        composablePairs: [
          { f: nonIdentity, g: TwoObjectCategory.id("•") },
          { f: TwoObjectCategory.id("★"), g: TwoObjectCategory.id("★") },
        ],
      },
    ).functor;

    const constStarProarrow = {
      from: "•" as TwoObject,
      to: "★" as TwoObject,
      payload: constStar,
    };

    const composed = horizontalComposeProarrows(
      equipment,
      constStarProarrow,
      idDot,
    );

    expect(composed).toBeDefined();
    expect(composed?.payload.onObj("•")).toBe("★");
  });

  test("virtualizeFiniteCategory preloads object listings", () => {
    const equipment = virtualizeFiniteCategory(TwoObjectCategory);
    expect(equipment.objects).toEqual(TwoObjectCategory.objects);
  });

  test("makeRelEquipment produces identity proarrows", () => {
    const numbers = [0, 1, 2] as const;
    const parity = ["even", "odd"] as const;
    const equipment = makeRelEquipment([numbers, parity]);

    const idNumbers = identityProarrow(equipment, numbers);
    expect(Array.from(idNumbers.payload.onObj(numbers))).toEqual(numbers);

    const relId = RelTightCategory.id(numbers);
    expect(idNumbers.payload.onMor(relId)).toEqual(relId);
  });

  test("makeSetEquipment respects composition on finite ordinals", () => {
    const ord2 = OrdObj(2);
    const ord3 = OrdObj(3);
    const dom = SetCat.obj([ord2, ord3]);
    const cod = SetCat.obj(["L", "R"] as const);
    const img = SetCat.obj(["L", "R"] as const);

    type LR = "L" | "R";
    const f = SetCat.hom(dom, cod, (value: Ord) => (value === ord2 ? "L" : "R"));
    const g = SetCat.hom(cod, img, (value: LR) => value);

    const equipment = makeSetEquipment([dom, cod, img]);
    expect(equipment.objects).toEqual([dom, cod, img]);
    const idDom = identityProarrow(equipment, dom);
    expect(idDom.payload.onObj(dom)).toBe(dom);

    const composed = SetCat.compose(g, f);
    expect(composed.dom).toBe(dom);
    expect(composed.cod).toBe(img);
  });

  test("slice and coslice equipments expose finite objects", () => {
    const sliceEquipment = makeSliceEquipment(TwoObjectCategory, "★");
    expect(sliceEquipment.objects.length).toBeGreaterThan(0);

    const cosliceEquipment = makeCosliceEquipment(TwoObjectCategory, "•");
    expect(cosliceEquipment.objects.length).toBeGreaterThan(0);
  });

  test("summarizeEquipmentOracles reports satisfied laws for the identity equipment", () => {
    const summary = summarizeEquipmentOracles();
    expect(summary.overall).toBe(true);
    expect(summary.companion.unit.holds).toBe(true);
    expect(summary.conjoint.counit.pending).toBe(false);
    expect(summary.extensions.rightExtension.holds).toBe(true);
  });
});
