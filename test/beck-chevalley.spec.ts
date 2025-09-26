import { describe, expect, it } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { makeSlice, makePostcomposeOnSlice } from "../slice-cat";
import { makeFinitePullbackCalculator } from "../pullback";
import { makeReindexingFunctor } from "../reindexing";

type Obj = "A" | "B" | "X" | "Y" | "Z";

type Arrow = {
  readonly name: string;
  readonly src: Obj;
  readonly dst: Obj;
};

const objects: readonly Obj[] = ["A", "B", "X", "Y", "Z"];

const arrowByName = new Map<string, Arrow>();
const makeArrow = (name: string, src: Obj, dst: Obj): Arrow => {
  const arrow = { name, src, dst } as const;
  arrowByName.set(name, arrow);
  return arrow;
};

const arrows: readonly Arrow[] = [
  ...objects.map((object) => makeArrow(`id_${object}`, object, object)),
  makeArrow("f", "A", "Z"),
  makeArrow("g", "B", "Z"),
  makeArrow("j", "A", "B"),
  makeArrow("k", "Y", "Z"),
  makeArrow("hXY", "X", "Y"),
  makeArrow("kh", "X", "Z"),
  makeArrow("aToY", "A", "Y"),
  makeArrow("aToX", "A", "X"),
  makeArrow("bToY", "B", "Y"),
  makeArrow("bToX", "B", "X"),
  makeArrow("hPrime", "Y", "X"),
];

const getArrow = (name: string): Arrow => {
  const arrow = arrowByName.get(name);
  if (!arrow) throw new Error(`Unknown arrow ${name}`);
  return arrow;
};

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.dst !== g.src) throw new Error("compose: domain/codomain mismatch");
  if (f.name.startsWith("id_")) return getArrow(g.name);
  if (g.name.startsWith("id_")) return getArrow(f.name);
  if (f.name === "j" && g.name === "g") return getArrow("f");
  if (f.name === "hXY" && g.name === "k") return getArrow("kh");
  if (f.name === "hPrime" && g.name === "hXY") return getArrow("id_Y");
  if (f.name === "aToX" && g.name === "hXY") return getArrow("aToY");
  if (f.name === "aToY" && g.name === "k") return getArrow("f");
  if (f.name === "aToX" && g.name === "kh") return getArrow("f");
  if (f.name === "bToX" && g.name === "hXY") return getArrow("bToY");
  if (f.name === "bToY" && g.name === "k") return getArrow("g");
  if (f.name === "bToX" && g.name === "kh") return getArrow("g");
  if (f.name === "j" && g.name === "bToY") return getArrow("aToY");
  if (f.name === "j" && g.name === "bToX") return getArrow("aToX");
  if (f.name === "hPrime" && g.name === "kh") return getArrow("k");
  throw new Error(`compose: unsupported combination ${g.name} ∘ ${f.name}`);
};

const category: FiniteCategory<Obj, Arrow> = {
  objects,
  arrows,
  id: (object) => getArrow(`id_${object}`),
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: (a, b) => a.name === b.name,
};

describe("Beck–Chevalley compatibility for slices", () => {
  const pullbacks = makeFinitePullbackCalculator(category);
  const sliceOverY = makeSlice(category, "Y");

  const k = getArrow("k");
  const h = getArrow("id_Z");
  const hPrime = getArrow("hPrime");
  const ell = getArrow("kh");

  it("the reference square commutes", () => {
    const left = category.compose(h, k);
    const right = category.compose(ell, hPrime);
    expect(category.eq(left, right)).toBe(true);
  });

  it("surface anchor mismatches with a descriptive error", () => {
    const kPush = makePostcomposeOnSlice(category, k, "Y", "Z");
    const hReindex = makeReindexingFunctor(category, pullbacks, h, "Z", "Z");
    const hPrimeReindex = makeReindexingFunctor(category, pullbacks, hPrime, "Y", "X");
    const ellPush = makePostcomposeOnSlice(category, ell, "X", "Z");

    expect(() => {
      for (const object of sliceOverY.objects) {
        ellPush.F0(hPrimeReindex.F0(object));
        hReindex.F0(kPush.F0(object));
      }
    }).toThrow(/slice object does not land in the expected anchor/);
  });
});
