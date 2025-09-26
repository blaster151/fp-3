import { describe, expect, it } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { makeCoslice } from "../slice-cat";
import { makeCoslicePrecomposition } from "../coslice-precompose";
import { makeCosliceReindexingFunctor } from "../coslice-reindexing";
import { makeFinitePushoutCalculator } from "../pushout";

type Obj = "X" | "Z" | "A" | "B" | "Qf" | "Qg";

type Arrow = {
  readonly name: string;
  readonly src: Obj;
  readonly dst: Obj;
};

const objects: readonly Obj[] = ["X", "Z", "A", "B", "Qf", "Qg"];

const arrowByName = new Map<string, Arrow>();
const makeArrow = (name: string, src: Obj, dst: Obj): Arrow => {
  const arrow = { name, src, dst } as const;
  arrowByName.set(name, arrow);
  return arrow;
};

const arrows: readonly Arrow[] = [
  ...objects.map((object) => makeArrow(`id_${object}`, object, object)),
  makeArrow("f", "X", "A"),
  makeArrow("g", "X", "B"),
  makeArrow("h", "X", "Z"),
  makeArrow("j", "A", "B"),
  makeArrow("qAf", "A", "Qf"),
  makeArrow("qZf", "Z", "Qf"),
  makeArrow("liftF", "X", "Qf"),
  makeArrow("qBg", "B", "Qg"),
  makeArrow("qZg", "Z", "Qg"),
  makeArrow("liftG", "X", "Qg"),
  makeArrow("qBgJ", "A", "Qg"),
  makeArrow("u", "Qf", "Qg"),
];

const getArrow = (name: string): Arrow => {
  const arrow = arrowByName.get(name);
  if (!arrow) throw new Error(`unknown arrow ${name}`);
  return arrow;
};

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.dst !== g.src) throw new Error(`compose mismatch for ${g.name} ∘ ${f.name}`);
  if (f.name.startsWith("id_")) return getArrow(g.name);
  if (g.name.startsWith("id_")) return getArrow(f.name);
  if (f.name === "f" && g.name === "j") return getArrow("g");
  if (f.name === "f" && g.name === "qAf") return getArrow("liftF");
  if (f.name === "h" && g.name === "qZf") return getArrow("liftF");
  if (f.name === "g" && g.name === "qBg") return getArrow("liftG");
  if (f.name === "h" && g.name === "qZg") return getArrow("liftG");
  if (f.name === "qAf" && g.name === "u") return getArrow("qBgJ");
  if (f.name === "j" && g.name === "qBg") return getArrow("qBgJ");
  if (f.name === "f" && g.name === "qBgJ") return getArrow("liftG");
  if (f.name === "qZf" && g.name === "u") return getArrow("qZg");
  if (f.name === "liftF" && g.name === "u") return getArrow("liftG");
  throw new Error(`unsupported composition ${g.name} ∘ ${f.name}`);
};

const BaseCategory: FiniteCategory<Obj, Arrow> = {
  objects,
  arrows,
  id: (object) => getArrow(`id_${object}`),
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: (a, b) => a.name === b.name,
};

describe("coslice precomposition and pushout reindexing", () => {
  const cosliceOverZ = makeCoslice(BaseCategory, "Z");
  const cosliceOverX = makeCoslice(BaseCategory, "X");
  const h = getArrow("h");
  const pushouts = makeFinitePushoutCalculator(BaseCategory);

  it("precomposes coslice objects and arrows along h", () => {
    const functor = makeCoslicePrecomposition(BaseCategory, h, "X", "Z");
    const object = cosliceOverZ.objects.find((candidate) => candidate.codomain === "Qf");
    expect(object).toBeDefined();
    const image = functor.F0(object!);
    expect(image.codomain).toBe("Qf");
    expect(image.arrowFromAnchor.name).toBe("liftF");

    const arrow = cosliceOverZ.arrows.find((candidate) => candidate.mediating.name === "u");
    expect(arrow).toBeDefined();
    const mapped = functor.F1(arrow!);
    expect(mapped.mediating.name).toBe("u");
    expect(mapped.src.arrowFromAnchor.name).toBe("liftF");
    expect(mapped.dst.arrowFromAnchor.name).toBe("liftG");
  });

  it("reindexes coslice data along pushouts", () => {
    const functor = makeCosliceReindexingFunctor(BaseCategory, pushouts, h, "X", "Z");
    const object = cosliceOverX.objects.find((candidate) => candidate.arrowFromAnchor.name === "f");
    expect(object).toBeDefined();
    const image = functor.F0(object!);
    expect(image.codomain).toBe("Qf");
    expect(image.arrowFromAnchor.name).toBe("qZf");

    const arrow = cosliceOverX.arrows.find((candidate) => candidate.mediating.name === "j");
    expect(arrow).toBeDefined();
    const mapped = functor.F1(arrow!);
    expect(mapped.mediating.name).toBe("u");
    expect(mapped.src.arrowFromAnchor.name).toBe("qZf");
    expect(mapped.dst.arrowFromAnchor.name).toBe("qZg");
  });

  it("searches for pushouts using the finite calculator", () => {
    const f = getArrow("f");
    const data = pushouts.pushout(f, h);
    expect(data.apex).toBe("Qf");
    expect(data.fromDomain.name).toBe("qAf");
    expect(data.fromAnchor.name).toBe("qZf");

    const g = getArrow("g");
    const dst = pushouts.pushout(g, h);
    expect(dst.apex).toBe("Qg");
    expect(dst.fromDomain.name).toBe("qBg");
    expect(dst.fromAnchor.name).toBe("qZg");

    const mediating = pushouts.coinduce(getArrow("j"), dst, data);
    expect(mediating.name).toBe("u");
  });
});
