import { describe, expect, it } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { makeCoslice } from "../slice-cat";
import {
  composeCosliceTripleArrows,
  cosliceArrowToTriple,
  cosliceTripleToArrow,
  idCosliceTripleArrow,
  makeCosliceTripleArrow,
} from "../coslice-triple";

type Obj = "Project" | "Task" | "User";

interface Arrow {
  readonly src: Obj;
  readonly dst: Obj;
  readonly name: string;
}

const id = (object: Obj): Arrow => ({ src: object, dst: object, name: `id_${object}` });

const projectToTask: Arrow = { src: "Project", dst: "Task", name: "projectToTask" };
const projectToUser: Arrow = { src: "Project", dst: "User", name: "projectToUser" };
const assigned: Arrow = { src: "Task", dst: "User", name: "assigned" };

const objects: readonly Obj[] = ["Project", "Task", "User"];
const arrows: readonly Arrow[] = [...objects.map(id), projectToTask, projectToUser, assigned];

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.dst !== g.src) throw new Error("compose mismatch");
  if (f.name.startsWith("id_")) return { src: f.src, dst: g.dst, name: g.name };
  if (g.name.startsWith("id_")) return { src: f.src, dst: g.dst, name: f.name };
  if (f.name === "projectToTask" && g.name === "assigned") return projectToUser;
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

describe("strict coslice arrows", () => {
  const coslice = makeCoslice(BaseCategory, "Project");
  const taskObject = coslice.objects.find((object) => object.codomain === "Task");
  const userObject = coslice.objects.find((object) => object.codomain === "User");
  if (!taskObject || !userObject) throw new Error("coslice objects missing");
  const thin = coslice.arrows.find((arrow) => arrow.mediating.name === "assigned");
  if (!thin) throw new Error("expected assigned mediating arrow");

  it("captures coslice commuting witnesses explicitly", () => {
    const triple = makeCosliceTripleArrow(BaseCategory, taskObject, userObject, assigned);
    expect(triple.mediating.name).toBe("assigned");
    expect(triple.witnessSource.name).toBe("projectToTask");
    expect(triple.witnessTarget.name).toBe("projectToUser");
  });

  it("validates composition via pasted triangles", () => {
    const triple = makeCosliceTripleArrow(BaseCategory, taskObject, userObject, assigned);
    const identity = idCosliceTripleArrow(BaseCategory, userObject);
    const composed = composeCosliceTripleArrows(BaseCategory, identity, triple);
    expect(composed.mediating.name).toBe("assigned");
    expect(composed.witnessSource.name).toBe("projectToTask");
    expect(composed.witnessTarget.name).toBe("projectToUser");
  });

  it("round-trips between thin and triple encodings", () => {
    const triple = cosliceArrowToTriple(BaseCategory, thin);
    expect(triple.witnessTarget.name).toBe("projectToUser");
    const back = cosliceTripleToArrow(triple);
    expect(back.mediating.name).toBe("assigned");
  });
});
