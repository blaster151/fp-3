import { describe, expect, it } from "vitest";
import type { SmallCategory } from "../subcategory";
import { makeFullSubcategory, makeSubcategory, isFullSubcategory } from "../subcategory";

type Obj = "A" | "B" | "C";
type Arr = { readonly src: Obj; readonly dst: Obj; readonly name: string };

const idA: Arr = { src: "A", dst: "A", name: "id_A" };
const idB: Arr = { src: "B", dst: "B", name: "id_B" };
const idC: Arr = { src: "C", dst: "C", name: "id_C" };
const f: Arr = { src: "A", dst: "B", name: "f" };
const fAlt: Arr = { src: "A", dst: "B", name: "f_alt" };
const g: Arr = { src: "B", dst: "C", name: "g" };
const h: Arr = { src: "A", dst: "C", name: "h" };

const composeTable: Record<string, Arr> = {
  "id_A→id_A": idA,
  "id_B→id_B": idB,
  "id_C→id_C": idC,
  "id_A→f": f,
  "id_A→f_alt": fAlt,
  "f→id_B": f,
  "f_alt→id_B": fAlt,
  "id_B→g": g,
  "g→id_C": g,
  "id_A→h": h,
  "h→id_C": h,
  "f→g": h,
  "f_alt→g": h,
};

const parent: SmallCategory<Obj, Arr> = {
  objects: new Set(["A", "B", "C"]),
  arrows: new Set([idA, idB, idC, f, fAlt, g, h]),
  id: (object) => {
    switch (object) {
      case "A":
        return idA;
      case "B":
        return idB;
      case "C":
        return idC;
      default:
        throw new Error("unknown object");
    }
  },
  compose: (gArrow, fArrow) => {
    const key = `${fArrow.name}→${gArrow.name}`;
    const composite = composeTable[key];
    if (!composite) {
      throw new Error(`no composite for ${key}`);
    }
    return composite;
  },
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
};

describe("subcategory saturation", () => {
  it("adds identities and stays closed under composition", () => {
    const S = makeSubcategory(parent, ["A", "B", "C"], [f, g]);
    expect(S.arrows.has(f)).toBe(true);
    expect(S.arrows.has(g)).toBe(true);
    expect(S.arrows.has(h)).toBe(true);
    expect(S.arrows.has(idA)).toBe(true);
    expect(S.arrows.has(idB)).toBe(true);
    expect(S.arrows.has(idC)).toBe(true);
  });

  it("builds a full subcategory on chosen objects", () => {
    const full = makeFullSubcategory(parent, ["A", "B"]);
    expect(full.arrows.has(f)).toBe(true);
    expect(full.arrows.has(idA)).toBe(true);
    expect(full.arrows.has(idB)).toBe(true);
    expect(full.arrows.has(g)).toBe(false);
    expect(isFullSubcategory(full, parent)).toBe(true);
  });

  it("detects non-full subcategories", () => {
    const nonFull = makeSubcategory(parent, ["A", "B"], [f]);
    expect(isFullSubcategory(nonFull, parent)).toBe(false);
  });
});
