import type { FiniteCategory } from "../../finite-cat";
import type {
  CosliceArrow,
  CosliceObject,
  SliceArrow,
  SliceObject,
} from "../../slice-cat";
import type { RunnableExample } from "./types";

declare function require(id: string): any;

const { makeSlice, makeCoslice } = require("../../slice-cat") as {
  makeSlice: <Obj, Arr>(
    base: FiniteCategory<Obj, Arr>,
    anchor: Obj,
  ) => FiniteCategory<SliceObject<Obj, Arr>, SliceArrow<Obj, Arr>>;
  makeCoslice: <Obj, Arr>(
    base: FiniteCategory<Obj, Arr>,
    anchor: Obj,
  ) => FiniteCategory<CosliceObject<Obj, Arr>, CosliceArrow<Obj, Arr>>;
};

type ExampleObject = "Task" | "User" | "Project";

type ExampleArrow = {
  readonly name: string;
  readonly src: ExampleObject;
  readonly dst: ExampleObject;
};

const objects: ReadonlyArray<ExampleObject> = ["Task", "User", "Project"];

const identity = (object: ExampleObject): ExampleArrow => ({
  name: `id_${object}`,
  src: object,
  dst: object,
});

const anchorTask: ExampleArrow = { name: "anchorTask", src: "Task", dst: "Project" };
const anchorUser: ExampleArrow = { name: "anchorUser", src: "User", dst: "Project" };
const assigned: ExampleArrow = { name: "assigned", src: "Task", dst: "User" };
const projectToTask: ExampleArrow = { name: "projectToTask", src: "Project", dst: "Task" };
const projectToUser: ExampleArrow = { name: "projectToUser", src: "Project", dst: "User" };

const arrows: ReadonlyArray<ExampleArrow> = [
  ...objects.map(identity),
  anchorTask,
  anchorUser,
  assigned,
  projectToTask,
  projectToUser,
];

const eqArrow = (left: ExampleArrow, right: ExampleArrow) => left.name === right.name;

const composeArrows = (g: ExampleArrow, f: ExampleArrow): ExampleArrow => {
  if (f.dst !== g.src) {
    throw new Error("compose: domain/codomain mismatch");
  }
  if (f.name.startsWith("id_")) return { name: g.name, src: f.src, dst: g.dst };
  if (g.name.startsWith("id_")) return { name: f.name, src: f.src, dst: g.dst };
  if (f.name === "assigned" && g.name === "anchorUser") return anchorTask;
  if (f.name === "projectToTask" && g.name === "assigned") return projectToUser;
  return { name: `${g.name}∘${f.name}`, src: f.src, dst: g.dst };
};

const ProjectWorkflow: FiniteCategory<ExampleObject, ExampleArrow> = {
  objects,
  arrows,
  id: identity,
  compose: composeArrows,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: eqArrow,
};

function describeBaseCategory(): readonly string[] {
  const arrowSummaries = ProjectWorkflow.arrows.map(
    (arrow) => `${arrow.name}: ${arrow.src} → ${arrow.dst}`,
  );
  return [
    "== Project workflow category ==",
    `Objects: ${ProjectWorkflow.objects.join(", ")}`,
    "Arrows:",
    ...arrowSummaries.map((line) => `  • ${line}`),
  ];
}

function describeSlice(): readonly string[] {
  const slice = makeSlice(ProjectWorkflow, "Project");
  const objectSummaries = slice.objects.map(
    (object) => `${object.domain} -( ${object.arrowToAnchor.name} )-> Project`,
  );
  const arrowSummaries = slice.arrows.map(
    (arrow) =>
      `${arrow.src.domain} -( ${arrow.mediating.name} )-> ${arrow.dst.domain}`,
  );
  return [
    "== Slice C/Project ==",
    `Objects (${objectSummaries.length}): ${objectSummaries.join(", ")}`,
    "Arrows:",
    ...arrowSummaries.map((line) => `  • ${line}`),
  ];
}

function describeCoslice(): readonly string[] {
  const coslice = makeCoslice(ProjectWorkflow, "Project");
  const objectSummaries = coslice.objects.map(
    (object) => `Project -( ${object.arrowFromAnchor.name} )-> ${object.codomain}`,
  );
  const arrowSummaries = coslice.arrows.map(
    (arrow) =>
      `${arrow.src.codomain} -( ${arrow.mediating.name} )-> ${arrow.dst.codomain}`,
  );
  return [
    "== Coslice Project\\C ==",
    `Objects (${objectSummaries.length}): ${objectSummaries.join(", ")}`,
    "Arrows:",
    ...arrowSummaries.map((line) => `  • ${line}`),
  ];
}

export const stage056SliceAndCosliceProjectWalkthrough: RunnableExample = {
  id: "056",
  title: "Slice and coslice project walkthrough",
  outlineReference: 56,
  summary:
    "Model the project-centric category and inspect how slice and coslice objects reorganise tasks, users, and workflows around the anchor.",
  async run() {
    const sections: ReadonlyArray<readonly string[]> = [
      describeBaseCategory(),
      describeSlice(),
      describeCoslice(),
    ];

    const logs = sections.flatMap((section, index, array) =>
      index === array.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
