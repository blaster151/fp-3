import type { RunnableExample } from "./types";
import type { Top } from "../../src/top/Topology";

declare function require(id: string): any;

type InitialFinalModule = {
  readonly topologyFromBase: <X>(
    eqX: (a: X, b: X) => boolean,
    carrier: ReadonlyArray<X>,
    base: ReadonlyArray<ReadonlyArray<X>>,
  ) => Top<X>;
  readonly topologyFromSubbase: <X>(
    eqX: (a: X, b: X) => boolean,
    carrier: ReadonlyArray<X>,
    subbase: ReadonlyArray<ReadonlyArray<X>>,
  ) => Top<X>;
  readonly initialTopology: <X>(
    eqX: (a: X, b: X) => boolean,
    carrier: ReadonlyArray<X>,
    legs: ReadonlyArray<{
      readonly target: Top<any>;
      readonly map: (x: X) => any;
      readonly eqTarget: (a: any, b: any) => boolean;
    }>,
  ) => Top<X>;
  readonly finalTopology: <Y>(
    eqY: (a: Y, b: Y) => boolean,
    carrier: ReadonlyArray<Y>,
    legs: ReadonlyArray<{
      readonly source: Top<any>;
      readonly map: (x: any) => Y;
      readonly eqSource: (a: any, b: any) => boolean;
    }>,
  ) => Top<Y>;
};

type TopologyModule = {
  readonly isTopology: <X>(eqX: (a: X, b: X) => boolean, T: Top<X>) => boolean;
  readonly discrete: <X>(carrier: ReadonlyArray<X>) => Top<X>;
  readonly continuous: <X, Y>(
    eqX: (a: X, b: X) => boolean,
    TX: Top<X>,
    TY: Top<Y>,
    f: (x: X) => Y,
    eqY?: (a: Y, b: Y) => boolean,
  ) => boolean;
};

const {
  topologyFromBase,
  topologyFromSubbase,
  initialTopology,
  finalTopology,
} = require("../../src/top/InitialFinal") as InitialFinalModule;

const { isTopology, discrete, continuous } = require("../../src/top/Topology") as TopologyModule;

const eqString = (a: string, b: string) => a === b;
const eqNum = (a: number, b: number) => a === b;

function describeSet<X>(items: ReadonlyArray<X>): string {
  return `{ ${items.map((item) => String(item)).join(", ") || "∅"} }`;
}

function describeTopology<X>(label: string, top: Top<X>, eq: (a: X, b: X) => boolean): readonly string[] {
  const header = `${label}: ${top.carrier.length} points, ${top.opens.length} open sets`;
  const validity = `  Valid topology? ${isTopology(eq, top)}`;
  const sample = top.opens
    .slice(0, 3)
    .map((open, index) => `  U${index}: ${describeSet(open)}`);
  return [header, validity, ...sample];
}

function buildTopologies(): readonly string[] {
  const cityDistricts = ["North", "Central", "South"] as const;
  const arterialBase = [["North"], ["Central", "South"]] as const;
  const arterialTopology = topologyFromBase(eqString, cityDistricts, arterialBase);

  const transitStops = [0, 1, 2] as const;
  const coverageSubbase = [
    [0, 1],
    [1, 2],
  ] as const;
  const coverageTopology = topologyFromSubbase(eqNum, transitStops, coverageSubbase);

  const climateStates = ["Dry", "Humid", "Stormy"] as const;
  const sensorReadout = (state: (typeof climateStates)[number]) => (state === "Dry" ? "Calm" : "Alert");
  const monitoringTarget = discrete(["Calm", "Alert"] as const);
  const monitoringSource = initialTopology(eqString, climateStates, [
    { target: monitoringTarget, map: sensorReadout, eqTarget: eqString },
  ]);
  const monitoringContinuous = continuous(eqString, monitoringSource, monitoringTarget, sensorReadout, eqString);

  const sierpinski: Top<0 | 1> = { carrier: [0, 1], opens: [[], [1], [0, 1]] };
  const statusCarrier = [0, 1] as const;
  const indicator = (bit: 0 | 1) => bit;
  const statusTopology = finalTopology(eqNum, statusCarrier, [
    { source: sierpinski, map: indicator, eqSource: (a: 0 | 1, b: 0 | 1) => a === b },
  ]);

  return [
    "== Base and subbase constructors ==",
    ...describeTopology("City arterial topology", arterialTopology, eqString),
    ...describeTopology("Transit coverage topology", coverageTopology, eqNum),
    "",
    "== Initial topology for sensor readouts ==",
    ...describeTopology("Monitoring source", monitoringSource, eqString),
    `  Sensor map continuous? ${monitoringContinuous}`,
    "",
    "== Final topology for indicator quotient ==",
    ...describeTopology("Indicator topology", statusTopology, eqNum),
  ];
}

export const stage079TopInitialFinal: RunnableExample = {
  id: "079",
  title: "Topology constructors and initial/final structures",
  outlineReference: 79,
  summary:
    "Generate topologies from bases and subbases, compute an initial pullback topology for sensor maps, and push forward to a final indicator topology.",
  run: async () => ({ logs: buildTopologies() }),
};
