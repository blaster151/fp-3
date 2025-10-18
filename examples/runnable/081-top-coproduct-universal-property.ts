import type { RunnableExample } from "./types";
import type { CoproductPoint, Top } from "../../src/top/Topology";
import type {
  ContinuousMap as TopContinuousMap,
  CoproductStructure,
} from "../../src/top/ContinuousMap";
import type { CheckCoproductUPResult } from "../../src/top/CoproductUP";

declare function require(id: string): any;

type TopologyModule = typeof import("../../src/top/Topology");
type CoproductUPModule = typeof import("../../src/top/CoproductUP");
type ContinuousMapModule = typeof import("../../src/top/ContinuousMap");

type ContinuousMap<X, Y> = TopContinuousMap<X, Y>;

const { discrete, continuous } = require("../../src/top/Topology") as TopologyModule;
const { checkCoproductUP } = require("../../src/top/CoproductUP") as CoproductUPModule;
const {
  makeContinuousMap,
  coproductStructure,
  injectionLeft,
  injectionRight,
  copair,
} = require("../../src/top/ContinuousMap") as ContinuousMapModule;

const eqNum = (a: number, b: number) => a === b;

function showPoint(point: CoproductPoint<number, number>): string {
  return point.tag === "inl" ? `inl(${point.value})` : `inr(${point.value})`;
}

function runTopologyCoproductUPDemo(): readonly string[] {
  const X = [0, 1];
  const Y = [10, 20, 30];
  const Z = [100, 200, 300];
  const TX = discrete(X);
  const TY = discrete(Y);
  const TZ = discrete(Z);

  const f = (x: number) => (x === 0 ? 100 : 200);
  const g = (y: number) => (y === 10 ? 200 : 300);

  const result = checkCoproductUP(eqNum, eqNum, eqNum, TX, TY, TZ, f, g, continuous);

  const structure = coproductStructure(eqNum, eqNum, TX, TY);
  const inl = injectionLeft(structure);
  const inr = injectionRight(structure);

  const foldLeft = makeContinuousMap({
    source: TX,
    target: TZ,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: f,
  });
  const foldRight = makeContinuousMap({
    source: TY,
    target: TZ,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: g,
  });
  const fold = copair(foldLeft, foldRight, { topology: structure.topology, eq: structure.eq });

  const logs: string[] = ["== Coproduct topology universal property =="];
  const mediatorEntry = result.mediators[0];
  logs.push(
    `Cocone legs: ${result.legs
      .map((leg) => `${leg.leg.name}: ${leg.holds ? "✓" : "✗"}`)
      .join("  |  ")}`,
  );
  logs.push(
    `Mediator ${mediatorEntry?.mediator.name ?? "[f,g]"}: ${result.holds ? "✓" : "✗"}`,
  );
  if (result.failures.length > 0) {
    logs.push(`Failures: ${result.failures.join("; ")}`);
  }
  logs.push(
    `Coproduct carrier: ${result.coproductTopology.carrier.map(showPoint).join(", ") || "∅"}`,
  );
  logs.push(
    `Left injection image: ${TX.carrier.map((x) => showPoint(inl.map(x))).join(", ")}`,
  );
  logs.push(
    `Right injection image: ${TY.carrier.map((y) => showPoint(inr.map(y))).join(", ")}`,
  );
  logs.push(
    `Folded outputs: ${result.coproductTopology.carrier.map((pt) => fold.map(pt)).join(", ")}`,
  );
  logs.push(`Universal property holds? ${result.holds}`);

  return logs;
}

export const stage081TopCoproductUniversalProperty: RunnableExample = {
  id: "081",
  title: "Coproduct UP for finite topological spaces",
  outlineReference: 81,
  summary:
    "Verify that disjoint unions of finite spaces satisfy the coproduct universal property and inspect the induced fold maps.",
  run: async () => ({ logs: runTopologyCoproductUPDemo() }),
};
