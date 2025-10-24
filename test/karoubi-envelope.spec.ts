import { describe, expect, it } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { findIdempotents, karoubiEnvelope, analyzeKaroubiEquivalence } from "../karoubi-envelope";

interface Arrow<Obj extends string> {
  readonly name: string;
  readonly src: Obj;
  readonly dst: Obj;
}

type ObjComplete = "X" | "Y";
type ArrowComplete = Arrow<ObjComplete>;

type ObjPartial = "X";
type ArrowPartial = Arrow<ObjPartial>;

const identity = <Obj extends string>(object: Obj): Arrow<Obj> => ({
  name: `id_${object}`,
  src: object,
  dst: object,
});

const makeSplitCategory = (): FiniteCategory<ObjComplete, ArrowComplete> => {
  const idX = identity("X");
  const idY = identity("Y");
  const e: ArrowComplete = { name: "e", src: "X", dst: "X" };
  const r: ArrowComplete = { name: "r", src: "X", dst: "Y" };
  const s: ArrowComplete = { name: "s", src: "Y", dst: "X" };
  const arrows: readonly ArrowComplete[] = [idX, idY, e, r, s];
  const byName = (name: string): ArrowComplete => arrows.find((arrow) => arrow.name === name)!;
  return {
    objects: ["X", "Y"],
    arrows,
    id: identity,
    compose: (g, f) => {
      if (f.dst !== g.src) {
        throw new Error("Non-composable arrows in split category");
      }
      if (Object.is(f, idX)) return g;
      if (Object.is(f, idY)) return g;
      if (Object.is(g, idX)) return f;
      if (Object.is(g, idY)) return f;
      if (Object.is(f, e) && Object.is(g, e)) return e;
      if (Object.is(f, e) && Object.is(g, r)) return r;
      if (Object.is(f, s) && Object.is(g, e)) return byName("s");
      if (Object.is(f, s) && Object.is(g, r)) return idY;
      if (Object.is(f, r) && Object.is(g, s)) return e;
      throw new Error(`Unhandled composite ${f.name} ; ${g.name}`);
    },
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq: (left, right) => left.name === right.name && left.src === right.src && left.dst === right.dst,
  };
};

const makeNonSplitCategory = (): FiniteCategory<ObjPartial, ArrowPartial> => {
  const idX = identity("X");
  const e: ArrowPartial = { name: "e", src: "X", dst: "X" };
  const arrows: readonly ArrowPartial[] = [idX, e];
  return {
    objects: ["X"],
    arrows,
    id: identity,
    compose: (g, f) => {
      if (f.dst !== g.src) {
        throw new Error("Non-composable arrows in partial category");
      }
      if (Object.is(f, idX)) return g;
      if (Object.is(g, idX)) return f;
      if (Object.is(f, e) && Object.is(g, e)) return e;
      throw new Error(`Unhandled composite ${f.name} ; ${g.name}`);
    },
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq: (left, right) => left.name === right.name && left.src === right.src && left.dst === right.dst,
  };
};

describe("findIdempotents", () => {
  it("classifies endomorphisms and surfaces non-idempotent evidence", () => {
    const category = makeSplitCategory();
    const e = category.arrows.find((arrow) => arrow.name === "e")!;
    const r = category.arrows.find((arrow) => arrow.name === "r")!;
    const report = findIdempotents(category, { arrows: [e, r] });
    expect(report.idempotents).toHaveLength(1);
    expect(report.idempotents[0]?.arrow).toBe(e);
    expect(report.failures.some((failure) => failure.arrow === r)).toBe(true);
    expect(report.diagnostics.length).toBeGreaterThan(0);
  });
});

describe("karoubiEnvelope", () => {
  it("produces splittings and an equivalence when idempotents already split", () => {
    const category = makeSplitCategory();
    const result = karoubiEnvelope(category);
    const splitting = result.splittings.find((entry) => entry.idempotent.arrow.name === "e");
    expect(splitting?.splitsIdempotent).toBe(true);

    const analysis = analyzeKaroubiEquivalence(result);
    expect(analysis.faithfulness.holds).toBe(true);
    expect(analysis.fullness.holds).toBe(true);
    expect(analysis.essentialSurjectivity.holds).toBe(true);
    expect(analysis.equivalence).toBeDefined();
  });

  it("detects missing essential surjectivity when idempotents do not split", () => {
    const category = makeNonSplitCategory();
    const result = karoubiEnvelope(category);
    const analysis = analyzeKaroubiEquivalence(result);
    expect(analysis.essentialSurjectivity.holds).toBe(false);
    expect(analysis.equivalence).toBeUndefined();
  });
});
