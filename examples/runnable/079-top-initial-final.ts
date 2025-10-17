import type { RunnableExample, RunnableOutcome } from "./types";
import { makeContinuousMap } from "../../src/top/ContinuousMap";
import { topologyFromBase, topologyFromSubbase, initialTopology, finalTopology } from "../../src/top/InitialFinal";
import type { Top } from "../../src/top/Topology";

type Sensor = "North" | "Central" | "South";
type Climate = "Dry" | "Mild" | "Wet";
type Zone = "Polar" | "Temperate";
type SensorClimateState = { readonly sensor: Sensor; readonly climate: Climate };

const eqSensor = (a: Sensor, b: Sensor) => a === b;
const eqClimate = (a: Climate, b: Climate) => a === b;
const eqZone = (a: Zone, b: Zone) => a === b;
const eqState = (a: SensorClimateState, b: SensorClimateState) =>
  eqSensor(a.sensor, b.sensor) && eqClimate(a.climate, b.climate);

const sensorCarrier = ["North", "Central", "South"] as const satisfies ReadonlyArray<Sensor>;
const climateCarrier = ["Dry", "Mild", "Wet"] as const satisfies ReadonlyArray<Climate>;
const zoneCarrier = ["Polar", "Temperate"] as const satisfies ReadonlyArray<Zone>;

const sensorBase: ReadonlyArray<ReadonlyArray<Sensor>> = [
  ["North", "Central"],
  ["Central", "South"],
];

const climateSubbase: ReadonlyArray<ReadonlyArray<Climate>> = [
  ["Dry", "Mild"],
  ["Mild", "Wet"],
];

function describeSet<X>(subset: ReadonlyArray<X>, show: (x: X) => string): string {
  return `{ ${subset.map(show).join(", ") || "∅"} }`;
}

function describeTopology<X>(name: string, top: Top<X>, show: (x: X) => string): readonly string[] {
  const header = `${name}: ${top.carrier.length} points, ${top.opens.length} open sets`;
  const opens = top.opens.slice(0, 3).map((open, index) => `  U${index}: ${describeSet(open, show)}`);
  return [header, ...opens];
}

function sameTopology<X>(eqX: (a: X, b: X) => boolean, T: Top<X>, U: Top<X>): boolean {
  const eqSet = (A: ReadonlyArray<X>, B: ReadonlyArray<X>) =>
    A.length === B.length &&
    A.every((a) => B.some((b) => eqX(a, b))) &&
    B.every((b) => A.some((a) => eqX(a, b)));
  return (
    eqSet(T.carrier, U.carrier) &&
    T.opens.length === U.opens.length &&
    T.opens.every((open) => U.opens.some((candidate) => eqSet(open, candidate))) &&
    U.opens.every((candidate) => T.opens.some((open) => eqSet(candidate, open)))
  );
}

function allStates(): ReadonlyArray<SensorClimateState> {
  const states: SensorClimateState[] = [];
  for (const sensor of sensorCarrier) {
    for (const climate of climateCarrier) {
      states.push({ sensor, climate });
    }
  }
  return states;
}

function runTopologyInitialFinalWalkthrough(): RunnableOutcome {
  const logs: string[] = [];

  const sensorTopology = topologyFromBase(eqSensor, sensorCarrier, sensorBase);
  const climateTopology = topologyFromSubbase(eqClimate, climateCarrier, climateSubbase);

  logs.push("== Constructing spaces from bases and subbases ==");
  logs.push(...describeTopology("Sensor base topology", sensorTopology, (x) => x));
  logs.push(...describeTopology("Climate subbase topology", climateTopology, (x) => x));

  const combinedStates = allStates();
  const sensorOfState = (state: SensorClimateState): Sensor => state.sensor;
  const climateOfState = (state: SensorClimateState): Climate => state.climate;

  const projectedToSensor = makeContinuousMap({
    source: {
      kind: "initial" as const,
      carrier: combinedStates,
      maps: [{ target: climateTopology, eqTarget: eqClimate, map: climateOfState }],
    },
    target: sensorTopology,
    eqSource: eqState,
    eqTarget: eqSensor,
    map: sensorOfState,
  });

  const manualInitial = initialTopology(eqState, combinedStates, [
    { target: sensorTopology, eqTarget: eqSensor, map: sensorOfState },
    { target: climateTopology, eqTarget: eqClimate, map: climateOfState },
  ]);

  logs.push("");
  logs.push("== Initial topology via projections ==");
  logs.push(...describeTopology("Initial topology", manualInitial, (state) => `${state.sensor}/${state.climate}`));
  logs.push(
    `  makeContinuousMap reproduced initial topology? ${sameTopology(eqState, manualInitial, projectedToSensor.source)}`,
  );
  logs.push(`  Sensor projection continuous? ${projectedToSensor.witness.verify()}`);

  const projectedToClimate = makeContinuousMap({
    source: projectedToSensor.source,
    target: climateTopology,
    eqSource: eqState,
    eqTarget: eqClimate,
    map: climateOfState,
  });
  logs.push(`  Climate projection continuous? ${projectedToClimate.witness.verify()}`);

  const collapseToZone = (sensor: Sensor): Zone => (sensor === "South" ? "Temperate" : "Polar");
  const quotientMap = makeContinuousMap({
    source: sensorTopology,
    target: { kind: "final" as const, carrier: zoneCarrier },
    eqSource: eqSensor,
    eqTarget: eqZone,
    map: collapseToZone,
  });

  const manualFinal = finalTopology(eqZone, zoneCarrier, [
    { source: sensorTopology, eqSource: eqSensor, map: collapseToZone },
  ]);

  logs.push("");
  logs.push("== Final topology of the zone quotient ==");
  logs.push(...describeTopology("Final topology", manualFinal, (zone) => zone));
  logs.push(`  makeContinuousMap reproduced final topology? ${sameTopology(eqZone, manualFinal, quotientMap.target)}`);
  logs.push(`  Quotient map continuous? ${quotientMap.witness.verify()}`);

  return { logs };
}

export const stage079TopInitialFinal: RunnableExample = {
  id: "079",
  title: "Initial and final topologies from bases and maps",
  outlineReference: 79,
  summary:
    "Derive sensor and climate spaces from bases, generate the induced product topology, and package quotient maps with automatically chosen topologies.",
  async run() {
    return runTopologyInitialFinalWalkthrough();
  },
};
