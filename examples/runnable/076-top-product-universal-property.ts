import type { RunnableExample } from "./types";
import type { Top } from "../../src/top/Topology";

declare function require(id: string): any;

type TopologyModule = typeof import("../../src/top/Topology");
type ProductUPModule = typeof import("../../src/top/ProductUP");
type SubspaceModule = typeof import("../../src/top/Subspace");

const { discrete, continuous } = require("../../src/top/Topology") as TopologyModule;
const { proj1, proj2, pair, checkProductUP } = require("../../src/top/ProductUP") as ProductUPModule;
const { subspace } = require("../../src/top/Subspace") as SubspaceModule;

const eqNum = (a: number, b: number) => a === b;
const eqPair = (
  a: { readonly x: number; readonly y: number },
  b: { readonly x: number; readonly y: number },
) => a.x === b.x && a.y === b.y;

function describeSet<X>(name: string, xs: ReadonlyArray<X>, show: (x: X) => string): string {
  const body = xs.map(show).join(", ") || "∅";
  return `${name}: { ${body} }`;
}

function runTopologyProductUPDemo(): readonly string[] {
  const X = [0, 1];
  const Y = [10, 20, 30];
  const Z = [42, 99];
  const TX = discrete(X);
  const TY = discrete(Y);
  const TZ = discrete(Z);

  const f = (z: number) => (z === 42 ? 0 : 1);
  const g = (_: number) => 20;

  const result = checkProductUP(eqNum, eqNum, eqNum, TZ, TX, TY, f, g, continuous);
  const mediatorEntry = result.mediators[0];
  const pairing = mediatorEntry?.mediator.arrow ?? pair(f, g);
  const paired = TZ.carrier.map(pairing);

  const logs: string[] = ["== Product topology universal property =="];
  logs.push(
    `Cone legs: ${result.legs
      .map((leg) => `${leg.leg.name}: ${leg.holds ? "✓" : "✗"}`)
      .join("  |  ")}`,
  );
  logs.push(
    `Mediator ${mediatorEntry?.mediator.name ?? "⟨f,g⟩"}: ${result.holds ? "✓" : "✗"}`,
  );
  if (result.failures.length > 0) {
    logs.push(`Failures: ${result.failures.join("; ")}`);
  }
  logs.push(
    describeSet(
      "Product carrier",
      result.productTopology.carrier,
      (p) => `(${p.x}, ${p.y})`,
    ),
  );
  logs.push(
    describeSet(
      "Paired image of Z",
      paired,
      (p) => `(${p.x}, ${p.y})`,
    ),
  );

  const subset = [0];
  const subspaceTopology = subspace(eqNum, TX, subset);
  logs.push("", "== Subspace topology witness ==");
  logs.push(describeSet("Carrier", subspaceTopology.carrier, (x) => `${x}`));
  logs.push(`Open sets: ${subspaceTopology.opens.map((open) => `{${open.join(",")}}`).join(" | ")}`);
  logs.push(
    `Subspace is discrete? ${subspaceTopology.opens.length === 1 << subset.length}`,
  );

  const checkProjection = result.productTopology.carrier.every((pt) =>
    eqPair({ x: proj1(pt), y: proj2(pt) }, pt),
  );
  logs.push("", `Universal property holds? ${result.holds}`);
  logs.push(`Projections recover the product points? ${checkProjection}`);

  return logs;
}

export const stage076TopProductUniversalProperty: RunnableExample = {
  id: "076",
  title: "Product UP for finite topological spaces",
  outlineReference: 76,
  summary:
    "Demonstrate that discrete projections and pairings satisfy the finite product universal property and inspect a subspace topology.",
  run: async () => ({ logs: runTopologyProductUPDemo() }),
};
