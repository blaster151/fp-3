import type { DiGraph } from "../../graph";
import type { Path } from "../../freecat";
import { RunnableExample } from "./types";

declare function require(id: string): any;

type GraphModule = {
  readonly makeGraph: (nodes: Iterable<string>, edges: Iterable<{ id?: string; src: string; dst: string }>) => DiGraph;
};

type FreeCategoryModule = {
  readonly FreeCategory: (graph: DiGraph) => {
    readonly id: (node: string) => Path;
    readonly compose: (g: Path, f: Path) => Path;
    readonly pathsFrom: (node: string, maxLen: number) => Path[];
  };
  readonly arrows: (graph: DiGraph) => Path[];
};

const { makeGraph } = require("../../graph") as GraphModule;
const { FreeCategory, arrows } = require("../../freecat") as FreeCategoryModule;

const transitGraph = makeGraph(
  ["Depot", "Hub", "Campus"],
  [
    { id: "load", src: "Depot", dst: "Hub" },
    { id: "express", src: "Hub", dst: "Campus" },
    { id: "direct", src: "Depot", dst: "Campus" },
  ],
);

function describePath(path: Path): string {
  const label = path.edgeIds.length === 0 ? "id" : path.edgeIds.join(" → ");
  return `${path.src} → ${path.dst} via ${label}`;
}

function explorePaths(): readonly string[] {
  const category = FreeCategory(transitGraph);
  const baseArrows = arrows(transitGraph);
  const [load, express] = baseArrows;
  if (!load || !express) {
    throw new Error("Transit graph must supply load and express edges");
  }
  const depotPaths = category.pathsFrom("Depot", 2);
  const composeExpress = category.compose(express, load);
  const idDepot = category.id("Depot");

  return [
    "== Free category on the transit graph ==",
    `Nodes: ${Array.from(transitGraph.nodes).join(", ")}`,
    "Generating arrows:",
    ...baseArrows.map((arrow) => `  • ${describePath(arrow)}`),
    "",
    "Paths from Depot (length ≤ 2):",
    ...depotPaths.map((path) => `  • ${describePath(path)}`),
    "",
    "Compositions:",
    `  • express ∘ load: ${describePath(composeExpress)}`,
    `  • identity at Depot: ${describePath(idDepot)}`,
  ];
}

export const stage074FreeCategoryOnADirectedGraph: RunnableExample = {
  id: "074",
  title: "Free category on a directed graph",
  outlineReference: 74,
  summary:
    "Build the free category on a depot→hub→campus graph, enumerate bounded paths, and compare composed routes with the direct edge.",
  run: async () => ({ logs: explorePaths() }),
};

