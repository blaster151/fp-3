import type { RunnableExample } from "./types";

declare function require(id: string): any;

type SetModule = typeof import("../../set-cat");
type RelModule = typeof import("../../rel");
type DynModule = typeof import("../../dynsys");

const { SetCat } = require("../../set-cat") as SetModule;
const { RelCat } = require("../../rel") as RelModule;
const { DynCat, isDynHom } = require("../../dynsys") as DynModule;

type RelPair<A, B> = readonly [A, B];

type DynState = "todo" | "done";
type DynLog = 0 | 1;

type Section = readonly string[];

type Matrix = ReadonlyArray<ReadonlyArray<number>>;

function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
  if (left.length === 0 || right.length === 0) return [];
  const rows = left.length;
  const inner = left[0]?.length ?? 0;
  const innerRight = right.length;
  if (inner !== innerRight) {
    throw new Error("multiplyMatrices: dimension mismatch");
  }
  const cols = right[0]?.length ?? 0;
  const result = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      let sum = 0;
      for (let k = 0; k < inner; k += 1) {
        sum += (left[i]?.[k] ?? 0) * (right[k]?.[j] ?? 0);
      }
      result[i]![j] = sum;
    }
  }
  return result;
}

function describeSet(): Section {
  const tasks = SetCat.obj<DynState>(["todo", "done"]);
  const statuses = SetCat.obj(["blocked", "progress", "done"]);
  const flags = SetCat.obj(["alert", "clear"]);

  const taskStatus = SetCat.hom(tasks, statuses, (state) =>
    state === "todo" ? "progress" : "done",
  );
  const statusFlag = SetCat.hom(statuses, flags, (status) =>
    status === "blocked" ? "alert" : "clear",
  );
  const composed = SetCat.compose(statusFlag, taskStatus);

  return [
    "== Set morphisms ==",
    `taskStatus is hom? ${SetCat.isHom(taskStatus) ? "yes" : "no"}`,
    `statusFlag is hom? ${SetCat.isHom(statusFlag) ? "yes" : "no"}`,
    `Composite (statusFlag ∘ taskStatus): todo ↦ ${composed.map("todo")}, done ↦ ${composed.map("done")}`,
  ];
}

function formatRel<A, B>(rel: ReadonlySet<RelPair<A, B>>): string {
  if (rel.size === 0) return "∅";
  return Array.from(rel.values())
    .map(([a, b]) => `${String(a)}↦${String(b)}`)
    .join(", ");
}

function describeRel(): Section {
  const tasks: readonly DynState[] = ["todo", "done"];
  const statuses = ["blocked", "progress", "done"] as const;
  const flags = ["alert", "clear"] as const;

  const completion: ReadonlySet<RelPair<DynState, (typeof statuses)[number]>> = RelCat.hom(
    tasks,
    statuses,
    [
      ["todo", "blocked"],
      ["todo", "progress"],
      ["done", "done"],
    ],
  );

  const alerts: ReadonlySet<RelPair<(typeof statuses)[number], (typeof flags)[number]>> = RelCat.hom(
    statuses,
    flags,
    [
      ["blocked", "alert"],
      ["progress", "clear"],
      ["done", "clear"],
    ],
  );

  const composed = RelCat.compose(completion, alerts);

  return [
    "== Relational morphisms ==",
    `completion relation: ${formatRel(completion)}`,
    `alerts relation: ${formatRel(alerts)}`,
    `alerts ∘ completion: ${formatRel(composed)}`,
  ];
}

function formatMatrix(matrix: Matrix): string {
  if (matrix.length === 0) return "[]";
  return matrix.map((row) => `[${row.map((value) => value.toFixed(1)).join(", ")}]`).join(" ");
}

function describeMat(): Section {
  const rotateQuarter: Matrix = [
    [0, -1],
    [1, 0],
  ];

  const stretch: Matrix = [
    [2, 0],
    [0, 1],
  ];

  const rotationThenStretch = multiplyMatrices(stretch, rotateQuarter);
  const stretchThenRotation = multiplyMatrices(rotateQuarter, stretch);

  return [
    "== Matrix category (Mat) ==",
    `Quarter rotation: ${formatMatrix(rotateQuarter)}`,
    `Stretch: ${formatMatrix(stretch)}`,
    `stretch ∘ rotation: ${formatMatrix(rotationThenStretch)}`,
    `rotation ∘ stretch: ${formatMatrix(stretchThenRotation)}`,
  ];
}

function describeDyn(): Section {
  const taskSystem = DynCat.obj<DynState>(["todo", "done"], (state) =>
    state === "todo" ? "done" : "done",
  );
  const logSystem = DynCat.obj<DynLog>([0, 1], (value) => (value === 0 ? 1 : 1));

  const trackCompletion = DynCat.hom(taskSystem, logSystem, (state: DynState): DynLog =>
    state === "todo" ? 0 : 1,
  );

  const doubledLog = DynCat.hom(logSystem, logSystem, (value: DynLog): DynLog => (value === 0 ? 0 : 1));

  const composed = DynCat.compose(doubledLog, trackCompletion);

  return [
    "== Dynamic systems (Dyn) ==",
    `trackCompletion is hom? ${isDynHom(trackCompletion) ? "yes" : "no"}`,
    `doubledLog is hom? ${isDynHom(doubledLog) ? "yes" : "no"}`,
    `doubledLog ∘ trackCompletion: todo ↦ ${composed.map("todo")}, done ↦ ${composed.map("done")}`,
  ];
}

export const stage057ConcreteCategoryBackendsAndDynamicSystems: RunnableExample = {
  id: "057",
  title: "Concrete category backends and dynamic systems",
  outlineReference: 57,
  summary:
    "Revisit Set, Rel, Mat, and Dyn categories with concrete morphism checks, compositions, and readable diagnostics.",
  async run() {
    const sections: ReadonlyArray<Section> = [
      describeSet(),
      describeRel(),
      describeMat(),
      describeDyn(),
    ];

    const logs = sections.flatMap((section, index, array) =>
      index === array.length - 1 ? section : [...section, ""],
    );

    return { logs };
  },
};
