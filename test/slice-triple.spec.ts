import { describe, expect, it } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { makeSlice } from "../slice-cat";
import {
  composeSliceTripleArrows,
  idSliceTripleArrow,
  makeSliceTripleArrow,
  sliceArrowToTriple,
  sliceTripleToArrow,
} from "../slice-triple";

interface Arrow {
  readonly src: Obj;
  readonly dst: Obj;
  readonly name: string;
}

type Obj = "Task" | "User" | "Project";

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

describe("strict slice arrows", () => {
  const slice = makeSlice(BaseCategory, "Project");
  const taskObject = slice.objects.find((object) => object.domain === "Task");
  const userObject = slice.objects.find((object) => object.domain === "User");
  if (!taskObject || !userObject) throw new Error("slice objects missing");
  const thin = slice.arrows.find((arrow) => arrow.mediating.name === "assigned");
  if (!thin) throw new Error("expected assigned mediating arrow");

  it("records commuting triangles explicitly", () => {
    const triple = makeSliceTripleArrow(BaseCategory, taskObject, userObject, assigned);
    expect(triple.mediating.name).toBe("assigned");
    expect(triple.witnessSource.name).toBe("anchorTask");
    expect(triple.witnessTarget.name).toBe("anchorUser");
  });

  it("composes triple arrows only when the pasted triangle commutes", () => {
    const triple = makeSliceTripleArrow(BaseCategory, taskObject, userObject, assigned);
    const identity = idSliceTripleArrow(BaseCategory, userObject);
    const composed = composeSliceTripleArrows(BaseCategory, identity, triple);
    expect(composed.mediating.name).toBe("assigned");
    expect(composed.witnessSource.name).toBe("anchorTask");
    expect(composed.witnessTarget.name).toBe("anchorUser");
  });

  it("round-trips between thin and triple encodings", () => {
    const triple = sliceArrowToTriple(BaseCategory, thin);
    expect(triple.witnessSource.name).toBe("anchorTask");
    const back = sliceTripleToArrow(triple);
    expect(back.mediating.name).toBe("assigned");
  });
});
