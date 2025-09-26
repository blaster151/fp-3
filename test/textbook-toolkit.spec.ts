import { describe, expect, it } from "vitest";
import { makeTextbookToolkit } from "../textbook-toolkit";
import { makeFinitePullbackCalculator } from "../pullback";
import { isInvolutive } from "../dual-cat";
import type { FiniteCategory } from "../finite-cat";
import type { SmallCategory } from "../subcategory";

interface Arrow {
  readonly name: string;
  readonly src: Obj;
  readonly dst: Obj;
}

type Obj = "Task" | "User" | "Project";

type SliceObj = { domain: Obj; arrowToAnchor: Arrow };

type CosliceObj = { codomain: Obj; arrowFromAnchor: Arrow };

const objects: ReadonlyArray<Obj> = ["Task", "User", "Project"];

const id = (o: Obj): Arrow => ({ name: `id_${o}`, src: o, dst: o });

const anchorT: Arrow = { name: "anchorT", src: "Task", dst: "Project" };
const anchorU: Arrow = { name: "anchorU", src: "User", dst: "Project" };
const assigned: Arrow = { name: "assigned", src: "Task", dst: "User" };

const arrows: ReadonlyArray<Arrow> = [
  id("Task"),
  id("User"),
  id("Project"),
  anchorT,
  anchorU,
  assigned,
];

const eq = (a: Arrow, b: Arrow) => a.name === b.name;

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.dst !== g.src) {
    throw new Error("compose: mismatch");
  }
  const key = `${g.name}∘${f.name}`;
  switch (key) {
    case "anchorU∘assigned":
      return anchorT;
    case "id_Task∘assigned":
      return assigned;
    case "anchorT∘id_Task":
      return anchorT;
    case "anchorU∘id_User":
      return anchorU;
    case "id_User∘assigned":
      return assigned;
    case "id_Project∘anchorU":
      return anchorU;
    case "id_Project∘anchorT":
      return anchorT;
    default:
      if (g.name === `id_${g.dst}`) return f;
      if (f.name === `id_${f.src}`) return g;
      throw new Error(`compose: missing case ${key}`);
  }
};

const BaseCategory: FiniteCategory<Obj, Arrow> = {
  objects,
  arrows,
  id,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq,
};

const Small: SmallCategory<Obj, Arrow> = {
  objects: new Set(objects),
  arrows: new Set(arrows),
  id,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
};

describe("textbook toolkit", () => {
  const pullbacks = makeFinitePullbackCalculator(BaseCategory);
  const toolkit = makeTextbookToolkit(BaseCategory, {
    pullbacks,
    asSmallCategory: Small,
  });

  it("provides product data", () => {
    const product = toolkit.productWith(BaseCategory);
    const identity = product.category.id(["Task", "Task"]);
    expect(product.category.src(identity)).toEqual(["Task", "Task"]);
    expect(product.pi1.F0(["Task", "User"])).toBe("Task");
    const paired = product.pairing(
      product.pi1,
      product.pi2,
    );
    const arr = paired.F1(identity);
    expect(arr.cf.name).toBe("id_Task");
    expect(arr.dg.name).toBe("id_Task");
  });

  it("builds slices and coslices", () => {
    const slice = toolkit.sliceAt("Project");
    const taskObj = slice.category.objects.find((obj) => obj.domain === "Task");
    expect(taskObj?.arrowToAnchor.name).toBe("anchorT");
    expect(slice.projection(taskObj as SliceObj)).toBe("Task");

    const coslice = toolkit.cosliceFrom("User");
    const arrow = coslice.category.objects.find((obj) => obj.codomain === "Project");
    expect(arrow?.arrowFromAnchor.name).toBe("anchorU");
    expect(coslice.inclusion(arrow as CosliceObj)).toBe("Project");
  });

  it("computes dual category data", () => {
    const dual = toolkit.dual();
    expect(dual.src(anchorT)).toBe("Project");
    expect(dual.dst(anchorT)).toBe("Task");
    expect(isInvolutive(toolkit.base, toolkit.base.arrows, toolkit.base.objects)).toBe(true);
  });

  it("exposes subcategory helpers when provided", () => {
    const tools = toolkit.subcategoryTools;
    expect(tools).toBeDefined();
    const sub = tools!.make(["Task"], [assigned]);
    expect(sub.objects.has("Task")).toBe(true);
    expect(sub.arrows.has(assigned)).toBe(true);
    const full = tools!.full(["Task", "User"]);
    expect(tools!.isFull(full)).toBe(true);
  });

  it("reindexes slices when pullbacks are supplied", () => {
    const reindex = toolkit.reindexAlong?.(anchorU, "User", "Project");
    expect(reindex).toBeDefined();
    const slice = toolkit.sliceAt("Project");
    const taskSlice = slice.category.objects.find((obj) => obj.domain === "Task")!;
    const pulled = reindex!.F0(taskSlice as SliceObj);
    expect(pulled.arrowToAnchor.name).toBe("assigned");
  });
});
