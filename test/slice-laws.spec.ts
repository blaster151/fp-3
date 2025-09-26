import { describe, expect, it } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { checkSliceCategoryLaws } from "../slice-laws";

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
const projectToTask: Arrow = { src: "Project", dst: "Task", name: "projectToTask" };
const projectToUser: Arrow = { src: "Project", dst: "User", name: "projectToUser" };

const objects: readonly Obj[] = ["Task", "User", "Project"];
const taskTwist: Arrow = { src: "Task", dst: "Task", name: "taskTwist" };

const arrows: readonly Arrow[] = [
  ...objects.map(id),
  anchorTask,
  anchorUser,
  assigned,
  projectToTask,
  projectToUser,
  taskTwist,
];

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.dst !== g.src) throw new Error("compose mismatch");
  if (f.name.startsWith("id_")) return { src: f.src, dst: g.dst, name: g.name };
  if (g.name.startsWith("id_")) return { src: f.src, dst: g.dst, name: f.name };
  if (f.name === "assigned" && g.name === "anchorUser") return anchorTask;
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

describe("slice category laws", () => {
  it("validates the slice over the project anchor", () => {
    const report = checkSliceCategoryLaws(BaseCategory, "Project");
    expect(report.holds).toBe(true);
    expect(report.identityFailures).toHaveLength(0);
    expect(report.unitFailures).toHaveLength(0);
    expect(report.associativityFailures).toHaveLength(0);
  });

  it("detects when the base identities are mis-specified", () => {
    const badId: FiniteCategory<Obj, Arrow>["id"] = (object) =>
      object === "Task" ? taskTwist : id(object);

    const twistyCompose: FiniteCategory<Obj, Arrow>["compose"] = (g, f) => {
      if (f.name === "taskTwist" || g.name === "taskTwist") {
        return taskTwist;
      }
      if (f.dst !== g.src) throw new Error("compose mismatch");
      return compose(g, f);
    };

    const broken: FiniteCategory<Obj, Arrow> = {
      ...BaseCategory,
      id: badId,
      compose: twistyCompose,
      arrows,
    };

    const report = checkSliceCategoryLaws(broken, "Project");
    expect(report.holds).toBe(false);
    expect(report.unitFailures.length).toBeGreaterThan(0);
  });
});
