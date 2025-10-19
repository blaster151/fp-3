import { describe, expect, it } from "vitest";
import { makeFinitePullbackCalculator } from "../pullback";
import type { FiniteCategory } from "../finite-cat";

type Obj = "A" | "B" | "P" | "Q" | "Z";

type ArrowName =
  | `id_${Obj}`
  | "f"
  | "g"
  | "pToA"
  | "pToB"
  | "pToZ"
  | "qToA"
  | "qToB"
  | "qToZ"
  | "mediator"
  | "mediatorDuplicate";

type Arrow = {
  readonly name: ArrowName;
  readonly src: Obj;
  readonly dst: Obj;
};

type MediatorMode = "none" | "single" | "duplicate";

interface TestCategory {
  readonly category: FiniteCategory<Obj, Arrow>;
  readonly getArrow: (name: ArrowName) => Arrow;
}

const makeTestCategory = (mode: MediatorMode): TestCategory => {
  const arrowByName = new Map<ArrowName, Arrow>();
  const makeArrow = (name: ArrowName, src: Obj, dst: Obj): Arrow => {
    const arrow = { name, src, dst } as const;
    arrowByName.set(name, arrow);
    return arrow;
  };

  const objects: readonly Obj[] = ["A", "B", "P", "Q", "Z"];

  const arrows: Arrow[] = [
    ...objects.map((object) => makeArrow(`id_${object}`, object, object)),
    makeArrow("f", "A", "Z"),
    makeArrow("g", "B", "Z"),
    makeArrow("pToA", "P", "A"),
    makeArrow("pToB", "P", "B"),
    makeArrow("pToZ", "P", "Z"),
    makeArrow("qToA", "Q", "A"),
    makeArrow("qToB", "Q", "B"),
    makeArrow("qToZ", "Q", "Z"),
  ];

  if (mode !== "none") {
    arrows.push(makeArrow("mediator", "P", "Q"));
  }
  if (mode === "duplicate") {
    arrows.push(makeArrow("mediatorDuplicate", "P", "Q"));
  }

  const getArrow = (name: ArrowName): Arrow => {
    const arrow = arrowByName.get(name);
    if (!arrow) throw new Error(`Unknown arrow ${name}`);
    return arrow;
  };

  const compose = (g: Arrow, f: Arrow): Arrow => {
    if (f.dst !== g.src) {
      throw new Error(`compose: domain/codomain mismatch for ${g.name} ∘ ${f.name}`);
    }
    if (f.name.startsWith("id_")) return getArrow(g.name as ArrowName);
    if (g.name.startsWith("id_")) return getArrow(f.name as ArrowName);
    if (f.name === "pToA" && g.name === "f") return getArrow("pToZ");
    if (f.name === "pToB" && g.name === "g") return getArrow("pToZ");
    if (f.name === "qToA" && g.name === "f") return getArrow("qToZ");
    if (f.name === "qToB" && g.name === "g") return getArrow("qToZ");
    if (g.name === "qToA" && (f.name === "mediator" || f.name === "mediatorDuplicate")) {
      return getArrow("pToA");
    }
    if (g.name === "qToB" && (f.name === "mediator" || f.name === "mediatorDuplicate")) {
      return getArrow("pToB");
    }
    throw new Error(`compose: unsupported combination ${g.name} ∘ ${f.name}`);
  };

  const category: FiniteCategory<Obj, Arrow> = {
    objects,
    arrows,
    id: (object) => getArrow(`id_${object}`),
    compose,
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq: (left, right) => left.name === right.name,
  };

  return { category, getArrow };
};

describe("pullback mediator induction", () => {
  it("returns the unique mediator that satisfies the pullback equations", () => {
    const { category, getArrow } = makeTestCategory("none");
    const calculator = makeFinitePullbackCalculator(category);
    const f = getArrow("f");
    const g = getArrow("g");
    const pullback = calculator.pullback(f, g);
    const j = category.id(category.src(f));
    const mediator = calculator.induce(j, pullback, pullback);
    expect(mediator.name).toBe("id_P");
  });

  it("throws when no mediating arrow satisfies the universal property", () => {
    const { category, getArrow } = makeTestCategory("none");
    const calculator = makeFinitePullbackCalculator(category);
    const f = getArrow("f");
    const g = getArrow("g");
    const pullbackOfF = calculator.pullback(f, g);
    const pullbackOfG = {
      apex: "Q" as const,
      toDomain: getArrow("qToA"),
      toAnchor: getArrow("qToB"),
    };
    const j = category.id(category.src(f));
    expect(() => calculator.induce(j, pullbackOfF, pullbackOfG)).toThrow(
      "No mediating arrow satisfies the pullback conditions.",
    );
  });

  it("throws when more than one mediating arrow survives the commuting checks", () => {
    const { category, getArrow } = makeTestCategory("duplicate");
    const calculator = makeFinitePullbackCalculator(category);
    const f = getArrow("f");
    const g = getArrow("g");
    const pullbackOfF = calculator.pullback(f, g);
    const pullbackOfG = {
      apex: "Q" as const,
      toDomain: getArrow("qToA"),
      toAnchor: getArrow("qToB"),
    };
    const j = category.id(category.src(f));
    expect(() => calculator.induce(j, pullbackOfF, pullbackOfG)).toThrow(
      "Multiple mediating arrows satisfy the pullback conditions.",
    );
  });
});
