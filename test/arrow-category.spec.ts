import { describe, expect, it } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { makeArrowCategory, makeArrowCodomainFunctor, makeArrowDomainFunctor } from "../arrow-category";

type Obj = "Task" | "User" | "Project";

type Arrow = {
  readonly src: Obj;
  readonly dst: Obj;
  readonly name: string;
};

const id = (object: Obj): Arrow => ({ src: object, dst: object, name: `id_${object}` });

const anchorTask: Arrow = { src: "Task", dst: "Project", name: "anchorTask" };
const anchorUser: Arrow = { src: "User", dst: "Project", name: "anchorUser" };
const assigned: Arrow = { src: "Task", dst: "User", name: "assigned" };

const objects: readonly Obj[] = ["Task", "User", "Project"];
const arrows: readonly Arrow[] = [...objects.map(id), anchorTask, anchorUser, assigned];

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.dst !== g.src) throw new Error("compose mismatch");
  if (f.name.startsWith("id_")) return { src: f.src, dst: g.dst, name: g.name };
  if (g.name.startsWith("id_")) return { src: f.src, dst: g.dst, name: f.name };
  if (f.name === "assigned" && g.name === "anchorUser") return anchorTask;
  if (f.name === "anchorTask" && g.name === "id_Project") return anchorTask;
  return { src: f.src, dst: g.dst, name: `${g.name}∘${f.name}` };
};

const BaseCategory: FiniteCategory<Obj, Arrow> = {
  objects,
  arrows,
  id,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: (a, b) => a.name === b.name,
};

describe("arrow category", () => {
  const arrowCat = makeArrowCategory(BaseCategory);

  const findSquare = (srcName: string, dstName: string) =>
    arrowCat.arrows.find(
      (square) => square.src.name === srcName && square.dst.name === dstName,
    );

  it("treats base arrows as objects and commuting squares as morphisms", () => {
    expect(arrowCat.objects.map((arrow) => arrow.name).sort()).toEqual(
      arrows.map((arrow) => arrow.name).sort(),
    );

    const square = findSquare("assigned", "anchorTask");
    expect(square).toBeDefined();
    expect(square!.j.name).toBe("id_Task");
    expect(square!.k.name).toBe("anchorUser");

    const commuteLeft = BaseCategory.compose(square!.k, square!.src);
    const commuteRight = BaseCategory.compose(square!.dst, square!.j);
    expect(BaseCategory.eq(commuteLeft, commuteRight)).toBe(true);
  });

  it("composes squares by pasting commuting diagrams", () => {
    const first = findSquare("assigned", "anchorTask");
    const second = findSquare("anchorTask", "id_Project");
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const pasted = arrowCat.compose(second!, first!);
    expect(pasted.src.name).toBe("assigned");
    expect(pasted.dst.name).toBe("id_Project");
    expect(pasted.j.name).toBe("anchorTask");
    expect(pasted.k.name).toBe("anchorUser");
  });

  it("exposes the canonical domain and codomain functors", () => {
    const dom = makeArrowDomainFunctor(BaseCategory);
    const cod = makeArrowCodomainFunctor(BaseCategory);
    const square = findSquare("assigned", "anchorUser");
    expect(square).toBeDefined();
    expect(dom.F0(square!.src)).toBe("Task");
    expect(dom.F1(square!).name).toBe("assigned");
    expect(cod.F0(square!.src)).toBe("User");
    expect(cod.F1(square!).name).toBe("anchorUser");
  });
});
