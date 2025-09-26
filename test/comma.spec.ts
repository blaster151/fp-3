import { describe, expect, it } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { describe, expect, it } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { makeComma, type Functor } from "../comma";

type Obj = "A" | "B" | "C";

type Arrow = {
  readonly name: string;
  readonly src: Obj;
  readonly dst: Obj;
};

const makeArrow = (name: string, src: Obj, dst: Obj): Arrow => ({ name, src, dst });

const arrows: readonly Arrow[] = [
  makeArrow("id_A", "A", "A"),
  makeArrow("id_B", "B", "B"),
  makeArrow("id_C", "C", "C"),
  makeArrow("f", "A", "B"),
  makeArrow("g", "B", "C"),
  makeArrow("gf", "A", "C"),
];

const getArrow = (name: string): Arrow => {
  const arrow = arrows.find((candidate) => candidate.name === name);
  if (!arrow) throw new Error(`Unknown arrow ${name}`);
  return arrow;
};

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.dst !== g.src) throw new Error("compose: domain/codomain mismatch");
  if (f.name.startsWith("id_")) return getArrow(g.name);
  if (g.name.startsWith("id_")) return getArrow(f.name);
  if (f.name === "f" && g.name === "g") return getArrow("gf");
  throw new Error(`compose: unsupported combination ${g.name} ∘ ${f.name}`);
};

const category: FiniteCategory<Obj, Arrow> = {
  objects: ["A", "B", "C"],
  arrows,
  id: (object) => getArrow(`id_${object}`),
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: (a, b) => a.name === b.name,
};

const identityFunctor: Functor<Obj, Arrow, Obj, Arrow> = {
  F0: (object) => object,
  F1: (arrow) => arrow,
};

describe("comma category construction", () => {
  const comma = makeComma(
    category,
    category,
    category,
    identityFunctor,
    identityFunctor,
  );

  it("enumerates arrows with commuting squares", () => {
    const mediatorNames = comma.objects.map((object) => object.mediator.name);
    expect(mediatorNames).toContain("f");
    expect(mediatorNames).toContain("g");
    expect(mediatorNames).toContain("gf");
  });

  it("composes squares componentwise", () => {
    const src = comma.objects.find((object) => object.mediator.name === "f");
    const mid = comma.objects.find((object) => object.mediator.name === "gf");
    expect(src).toBeDefined();
    expect(mid).toBeDefined();
    if (!src || !mid) throw new Error("Expected slice objects not found");

    const arrow = comma.arrows.find(
      (candidate) => candidate.src === src && candidate.dst === mid,
    );
    expect(arrow).toBeDefined();
    if (!arrow) throw new Error("Expected mediating arrow not found");

    const identity = comma.id(src);
    const composed = comma.compose(arrow, identity);
    expect(composed.right.name).toBe(arrow.right.name);
    expect(composed.left.name).toBe(arrow.left.name);
  });
});
