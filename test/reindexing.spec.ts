import { describe, expect, it } from "vitest";
import { makeSlice } from "../slice-cat";
import type { FiniteCategory } from "../finite-cat";
import { makeFinitePullbackCalculator } from "../pullback";
import { makeReindexingFunctor } from "../reindexing";
import { checkReindexCompositionLaw, checkReindexIdentityLaw } from "../reindexing-laws";

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
  makeArrow("h", "X", "Y"),
  makeArrow("kh", "X", "Z"),
  makeArrow("aToY", "A", "Y"),
  makeArrow("aToX", "A", "X"),
  makeArrow("bToY", "B", "Y"),
  makeArrow("bToX", "B", "X"),
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
  if (f.name === "h" && g.name === "k") return getArrow("kh");
  if (f.name === "aToX" && g.name === "h") return getArrow("aToY");
  if (f.name === "aToY" && g.name === "k") return getArrow("f");
  if (f.name === "aToX" && g.name === "kh") return getArrow("f");
  if (f.name === "bToX" && g.name === "h") return getArrow("bToY");
  if (f.name === "bToY" && g.name === "k") return getArrow("g");
  if (f.name === "bToX" && g.name === "kh") return getArrow("g");
  if (f.name === "j" && g.name === "bToY") return getArrow("aToY");
  if (f.name === "j" && g.name === "bToX") return getArrow("aToX");
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

describe("reindexing functor via pullbacks", () => {
  const sliceOverZ = makeSlice(category, "Z");
  const pullbacks = makeFinitePullbackCalculator(category);
  const k = getArrow("k");
  const h = getArrow("h");
  const kh = getArrow("kh");

  it("reindexes slice objects and arrows along a pullback", () => {
    const functor = makeReindexingFunctor(category, pullbacks, k, "Y", "Z");
    const fObject = sliceOverZ.objects.find((object) => object.arrowToAnchor.name === "f");
    expect(fObject).toBeDefined();
    const image = functor.F0(fObject!);
    expect(image.domain).toBe("A");
    expect(image.arrowToAnchor.name).toBe("aToY");

    const jArrow = sliceOverZ.arrows.find((arrow) => arrow.mediating.name === "j");
    expect(jArrow).toBeDefined();
    const mappedArrow = functor.F1(jArrow!);
    expect(mappedArrow.src.domain).toBe("A");
    expect(mappedArrow.dst.domain).toBe("B");
    expect(mappedArrow.src.arrowToAnchor.name).toBe("aToY");
    expect(mappedArrow.dst.arrowToAnchor.name).toBe("bToY");
    expect(mappedArrow.mediating.name).toBe("j");
  });

  it("satisfies the identity and composition reindexing laws on samples", () => {
    const samples = { objects: sliceOverZ.objects, arrows: sliceOverZ.arrows };
    const hkFunctor = makeReindexingFunctor(category, pullbacks, kh, "X", "Z");
    const arrowG = samples.arrows.find((arrow) => arrow.mediating.name === "g");
    expect(arrowG).toBeDefined();
    if (arrowG) {
      const srcData = pullbacks.pullback(arrowG.src.arrowToAnchor, kh);
      const dstData = pullbacks.pullback(arrowG.dst.arrowToAnchor, kh);
      expect(srcData.apex).toBe("B");
      expect(srcData.toDomain.name).toBe("id_B");
      expect(srcData.toAnchor.name).toBe("bToX");
      expect(dstData.apex).toBe("X");
      expect(dstData.toDomain.name).toBe("kh");
      expect(dstData.toAnchor.name).toBe("id_X");
      const candidates = category.arrows.filter(
        (candidate) =>
          category.src(candidate) === srcData.apex &&
          category.dst(candidate) === dstData.apex
      );
      const matches = candidates.filter((candidate) => {
        const leftDomain = category.compose(dstData.toDomain, candidate);
        const rightDomain = category.compose(arrowG.mediating, srcData.toDomain);
        if (!category.eq(leftDomain, rightDomain)) return false;
        const leftAnchor = category.compose(dstData.toAnchor, candidate);
        return category.eq(leftAnchor, srcData.toAnchor);
      });
      expect(matches.map((arrow) => arrow.name)).toContain("bToX");
    }
    for (const arrow of samples.arrows) {
      try {
        hkFunctor.F1(arrow);
      } catch (error) {
        throw new Error(
          `reindexing failed for mediating ${arrow.mediating.name} from ${arrow.src.domain} to ${arrow.dst.domain}: ${(error as Error).message}`
        );
      }
    }
    expect(checkReindexIdentityLaw(category, pullbacks, "Z", samples)).toBe(true);
    expect(
      checkReindexCompositionLaw(
        category,
        pullbacks,
        "X",
        "Y",
        "Z",
        h,
        k,
        samples
      )
    ).toBe(true);

    const direct = hkFunctor;
    const stepwise = makeReindexingFunctor(category, pullbacks, k, "Y", "Z");
    const finalStep = makeReindexingFunctor(category, pullbacks, h, "X", "Y");
    const objectFromKh = sliceOverZ.objects.find((object) => object.arrowToAnchor.name === "kh");
    expect(objectFromKh).toBeDefined();
    const leftObject = direct.F0(objectFromKh!);
    const rightObject = finalStep.F0(stepwise.F0(objectFromKh!));
    expect(leftObject.domain).toBe(rightObject.domain);
    expect(category.eq(leftObject.arrowToAnchor, rightObject.arrowToAnchor)).toBe(true);
  });
});
