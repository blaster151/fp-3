import type { RunnableExample } from "./types";
import type { ContinuousMap } from "../../src/top/ContinuousMap";
import type { Top } from "../../src/top/Topology";

declare function require(id: string): any;

type TopologyModule = typeof import("../../src/top/Topology");
type QuotientModule = typeof import("../../src/top/Quotient");
type CoequalizerModule = typeof import("../../src/top/coequalizers");
type ContinuousModule = typeof import("../../src/top/ContinuousMap");

const { discrete, isTopology } = require("../../src/top/Topology") as TopologyModule;
const { quotientByRelation } = require("../../src/top/Quotient") as QuotientModule;
const { topCoequalizer, topFactorThroughCoequalizer } = require("../../src/top/coequalizers") as CoequalizerModule;
const { makeContinuousMap, compose } = require("../../src/top/ContinuousMap") as ContinuousModule;

const eqString = (a: string, b: string) => a === b;

function describeClass(cls: ReadonlyArray<string>): string {
  return `{ ${cls.join(", ") || "∅"} }`;
}

function describeTopology<X>(
  label: string,
  eq: (a: X, b: X) => boolean,
  top: Top<X>,
  show: (x: X) => string,
): readonly string[] {
  const header = `${label}: carrier ${top.carrier.length}, opens ${top.opens.length}`;
  const validity = `  Valid topology? ${isTopology(eq, top)}`;
  const sample = top.opens
    .slice(0, 3)
    .map((open, index) => `  U${index}: { ${open.map(show).join(", ") || "∅"} }`);
  return [header, validity, ...sample];
}

function runQuotientStory(): readonly string[] {
  const walkwaySegments = ["North", "East", "South", "West"] as const;
  const walkwayTopology = discrete(walkwaySegments);
  const mergeOpposites = (a: string, b: string) =>
    a === b || (a === "North" && b === "South") || (a === "South" && b === "North") ||
    (a === "East" && b === "West") || (a === "West" && b === "East");
  const walkwayQuotient = quotientByRelation({
    source: walkwayTopology,
    eqSource: eqString,
    relation: mergeOpposites,
  });
  const classLabels = walkwayQuotient.topology.carrier.map((cls) => describeClass(cls));
  return [
    "== Footbridge quotient ==",
    ...describeTopology("Original walkway", eqString, walkwayTopology, (segment) => segment),
    "  Equivalence classes:",
    ...classLabels.map((label, index) => `    C${index}: ${label}`),
  ];
}

function runCoequalizerStory(): readonly string[] {
  const walkwaySegments = ["North", "East", "South", "West"] as const;
  const walkwayTopology = discrete(walkwaySegments);
  const intersectionPairs = discrete(["Vertical", "Horizontal"] as const);
  const junctions = discrete(["A", "B"] as const);
  const f = makeContinuousMap({
    source: junctions,
    target: walkwayTopology,
    eqSource: eqString,
    eqTarget: eqString,
    map: (junction: string) => (junction === "A" ? "North" : "East"),
  });
  const g = makeContinuousMap({
    source: junctions,
    target: walkwayTopology,
    eqSource: eqString,
    eqTarget: eqString,
    map: (junction: string) => (junction === "A" ? "South" : "West"),
  });
  const coeq = topCoequalizer(f, g);
  const categorize = makeContinuousMap({
    source: walkwayTopology,
    target: intersectionPairs,
    eqSource: eqString,
    eqTarget: eqString,
    map: (segment: string) => (segment === "North" || segment === "South" ? "Vertical" : "Horizontal"),
  });
  const mediatorReport = topFactorThroughCoequalizer(f, g, coeq.coequalize, categorize);
  const mediator = mediatorReport.mediator;
  const mediatorWitness = mediatorReport.mediators[0];
  const recomposed = mediator ? compose(mediator, coeq.coequalize) : undefined;
  return [
    "== Coequalizer via identification ==",
    ...describeTopology(
      "Coequalizer space",
      coeq.coequalize.eqTarget,
      coeq.obj,
      (cls) => describeClass(cls as ReadonlyArray<string>),
    ),
    `  Mediator witness: ${mediatorWitness?.holds ? "✓" : `✗ (${mediatorReport.failures.join("; ")})`}`,
    mediator
      ? `  Mediator targets: ${coeq.obj.carrier
          .map((cls) => `${describeClass(cls)} ↦ ${mediator.map(cls)}`)
          .join(", ")}`
      : "  Mediator targets: (none)",
    mediator && recomposed
      ? `  Cocone factors through coequalizer? ${walkwayTopology.carrier.every(
          (segment) => recomposed.map(segment) === categorize.map(segment),
        )}`
      : "  Cocone factors through coequalizer? ✗",
  ];
}

function buildLogs(): readonly string[] {
  return [...runQuotientStory(), "", ...runCoequalizerStory()];
}

export const stage080TopQuotient: RunnableExample = {
  id: "080",
  title: "Quotient spaces and coequalizers in Top",
  outlineReference: 80,
  summary:
    "Identify walkway segments via an equivalence relation, build the induced quotient topology, and realize the same identification as a categorical coequalizer.",
  run: async () => ({ logs: buildLogs() }),
};
