import type { RunnableExample } from "./types";
import type { Top } from "../../src/top/Topology";

declare function require(id: string): any;

type TopologyModule = {
  readonly discrete: <X>(carrier: ReadonlyArray<X>) => Top<X>;
  readonly indiscrete: <X>(carrier: ReadonlyArray<X>) => Top<X>;
  readonly product: <X, Y>(
    eqX: (a: X, b: X) => boolean,
    eqY: (a: Y, b: Y) => boolean,
    TX: Top<X>,
    TY: Top<Y>,
  ) => Top<{ readonly x: X; readonly y: Y }>;
  readonly continuous: <X, Y>(
    eqX: (a: X, b: X) => boolean,
    TX: Top<X>,
    TY: Top<Y>,
    f: (x: X) => Y,
    eqY?: (a: Y, b: Y) => boolean,
  ) => boolean;
  readonly isHausdorff: <X>(eqX: (a: X, b: X) => boolean, T: Top<X>) => boolean;
  readonly isTopology: <X>(eqX: (a: X, b: X) => boolean, T: Top<X>) => boolean;
};

const {
  discrete,
  indiscrete,
  product,
  continuous,
  isHausdorff,
  isTopology,
} = require("../../src/top/Topology") as TopologyModule;

const eqString = (a: string, b: string) => a === b;

function describeSet<X>(items: ReadonlyArray<X>, show: (x: X) => string): string {
  return `{ ${items.map(show).join(", ") || "∅"} }`;
}

function describeTopology<X>(name: string, top: Top<X>, show: (x: X) => string): readonly string[] {
  const header = `${name}: ${top.carrier.length} points, ${top.opens.length} open sets`;
  const sampleOpens = top.opens.slice(0, 3).map((open, index) => `  U${index}: ${describeSet(open, show)}`);
  return [header, ...sampleOpens];
}

function exploreFiniteTopologies(): readonly string[] {
  const citySpace = discrete(["Depot", "Hub"]);
  const moodSpace = indiscrete(["Sunny", "Rainy"]);

  const eqPair = (a: { readonly x: string; readonly y: string }, b: { readonly x: string; readonly y: string }) =>
    a.x === b.x && a.y === b.y;

  const productSpace = product(eqString, eqString, citySpace, moodSpace);

  const projectionContinuous = continuous(eqPair, productSpace, citySpace, (p) => p.x, eqString);

  return [
    "== Finite topology sampler ==",
    ...describeTopology("Discrete city space", citySpace, (x) => x),
    `  Hausdorff? ${isHausdorff(eqString, citySpace)}`,
    "",
    ...describeTopology("Indiscrete weather space", moodSpace, (x) => x),
    `  Hausdorff? ${isHausdorff(eqString, moodSpace)}`,
    "",
    ...describeTopology("Product space city×weather", productSpace, (p) => `(${p.x}, ${p.y})`),
    `  Valid topology? ${isTopology(eqPair, productSpace)}`,
    `  Projection π₁ continuous? ${projectionContinuous}`,
  ];
}

export const stage075FiniteTopologyBasics: RunnableExample = {
  id: "075",
  title: "Finite topology basics",
  outlineReference: 75,
  summary:
    "Construct discrete/indiscrete finite spaces, build their product, and verify Hausdorffness plus a projection continuity check.",
  run: async () => ({ logs: exploreFiniteTopologies() }),
};
