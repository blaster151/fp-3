import { describe, expect, it } from "vitest";
import { makeCoslice, makeSlice } from "../slice-cat";
import type { FiniteCategory } from "../finite-cat";

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
const arrows: readonly Arrow[] = [
  ...objects.map(id),
  anchorTask,
  anchorUser,
  assigned,
  projectToTask,
  projectToUser,
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

describe("slice and coslice categories", () => {
  const slice = makeSlice(BaseCategory, "Project");
  const coslice = makeCoslice(BaseCategory, "Project");

  it("builds slice objects anchored to the chosen object", () => {
    const labels = slice.objects.map((o) => `${o.domain}->${o.arrowToAnchor.name}`).sort();
    expect(labels).toEqual(["Project->id_Project", "Task->anchorTask", "User->anchorUser"]);
  });

  it("only includes mediating arrows that preserve the anchor", () => {
    const arrowNames = slice.arrows.map((arrow) => `${arrow.src.domain}-${arrow.mediating.name}-${arrow.dst.domain}`);
    expect(arrowNames).toContain("Task-assigned-User");
    expect(arrowNames).not.toContain("Task-projectToTask-Project");
  });

  it("builds coslice objects flowing out of the anchor", () => {
    const labels = coslice.objects.map((o) => `${o.arrowFromAnchor.name}->${o.codomain}`).sort();
    expect(labels).toEqual(["id_Project->Project", "projectToTask->Task", "projectToUser->User"]);
  });

  it("computes coslice morphisms with the dual commuting square", () => {
    const arrowNames = coslice.arrows.map((arrow) => `${arrow.src.codomain}-${arrow.mediating.name}-${arrow.dst.codomain}`);
    expect(arrowNames).toContain("Task-assigned-User");
    expect(arrowNames).not.toContain("User-anchorUser-Project");
  });
});
