import { makeCoslice, makeSlice } from "../slice-cat";
import type { FiniteCategory } from "../finite-cat";

type ExampleObject = "Task" | "User" | "Project";

type ExampleArrow = {
  readonly src: ExampleObject;
  readonly dst: ExampleObject;
  readonly name: string;
};

const id = (object: ExampleObject): ExampleArrow => ({
  src: object,
  dst: object,
  name: `id_${object}`,
});

const anchorT: ExampleArrow = { src: "Task", dst: "Project", name: "anchorTask" };
const anchorU: ExampleArrow = { src: "User", dst: "Project", name: "anchorUser" };
const assigned: ExampleArrow = { src: "Task", dst: "User", name: "assigned" };
const projectToTask: ExampleArrow = { src: "Project", dst: "Task", name: "projectToTask" };
const projectToUser: ExampleArrow = { src: "Project", dst: "User", name: "projectToUser" };

const objects: readonly ExampleObject[] = ["Task", "User", "Project"];
const arrows: readonly ExampleArrow[] = [
  ...objects.map(id),
  anchorT,
  anchorU,
  assigned,
  projectToTask,
  projectToUser,
];

const compose = (g: ExampleArrow, f: ExampleArrow): ExampleArrow => {
  if (f.dst !== g.src) throw new Error("compose: domain/codomain mismatch");
  if (f.name.startsWith("id_")) return { src: f.src, dst: g.dst, name: g.name };
  if (g.name.startsWith("id_")) return { src: f.src, dst: g.dst, name: f.name };
  if (f.name === "assigned" && g.name === "anchorUser") return anchorT;
  if (f.name === "projectToTask" && g.name === "assigned") return projectToUser;
  return { src: f.src, dst: g.dst, name: `${g.name}∘${f.name}` };
};

const ExampleCategory: FiniteCategory<ExampleObject, ExampleArrow> = {
  objects,
  arrows,
  id,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: (a, b) => a.name === b.name,
};

const slice = makeSlice(ExampleCategory, "Project");
const coslice = makeCoslice(ExampleCategory, "Project");

const showSliceObject = (object: { domain: ExampleObject; arrowToAnchor: ExampleArrow }) =>
  `(${object.domain} -${object.arrowToAnchor.name}-> Project)`;

const showCosliceObject = (object: { codomain: ExampleObject; arrowFromAnchor: ExampleArrow }) =>
  `(Project -${object.arrowFromAnchor.name}-> ${object.codomain})`;

export function runSliceCosliceDemo(): void {
  console.log("Slice C/Project objects:", slice.objects.map(showSliceObject));
  console.log(
    "Slice C/Project arrows:",
    slice.arrows.map((arrow) => `${arrow.src.domain} -${arrow.mediating.name}-> ${arrow.dst.domain}`)
  );
  console.log("Coslice Project\\C objects:", coslice.objects.map(showCosliceObject));
  console.log(
    "Coslice Project\\C arrows:",
    coslice.arrows.map((arrow) => `${arrow.src.codomain} -${arrow.mediating.name}-> ${arrow.dst.codomain}`)
  );
}
