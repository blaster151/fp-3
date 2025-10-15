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
  readonly closure: <X>(eqX: (a: X, b: X) => boolean, T: Top<X>, subset: ReadonlyArray<X>) => ReadonlyArray<X>;
  readonly interior: <X>(eqX: (a: X, b: X) => boolean, T: Top<X>, subset: ReadonlyArray<X>) => ReadonlyArray<X>;
  readonly boundary: <X>(eqX: (a: X, b: X) => boolean, T: Top<X>, subset: ReadonlyArray<X>) => ReadonlyArray<X>;
  readonly closedSets: <X>(eqX: (a: X, b: X) => boolean, T: Top<X>) => ReadonlyArray<ReadonlyArray<X>>;
  readonly specializationOrder: <X>(
    eqX: (a: X, b: X) => boolean,
    T: Top<X>,
  ) => ReadonlyArray<readonly [X, X]>;
  readonly isConnected: <X>(eqX: (a: X, b: X) => boolean, T: Top<X>) => boolean;
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
  closure,
  interior,
  boundary,
  closedSets,
  specializationOrder,
  isConnected,
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
  const sierpinski: Top<0 | 1> = { carrier: [0, 1], opens: [[], [1], [0, 1]] };

  const eqPair = (a: { readonly x: string; readonly y: string }, b: { readonly x: string; readonly y: string }) =>
    a.x === b.x && a.y === b.y;

  const productSpace = product(eqString, eqString, citySpace, moodSpace);

  const projectionContinuous = continuous(eqPair, productSpace, citySpace, (p) => p.x, eqString);

  const subsetCity = ["Depot"] as const;
  const subsetMood = ["Sunny"] as const;
  const subsetSierpinski = [1] as const;
  const eqSierpinski = (a: 0 | 1, b: 0 | 1) => a === b;

  const describeInvariants = <X>(
    name: string,
    eq: (a: X, b: X) => boolean,
    space: Top<X>,
    subset: ReadonlyArray<X>,
    show: (x: X) => string,
  ): readonly string[] => {
    const closureStr = describeSet(closure(eq, space, subset), show);
    const interiorStr = describeSet(interior(eq, space, subset), show);
    const boundaryStr = describeSet(boundary(eq, space, subset), show);
    const closedStr = closedSets(eq, space)
      .map((U) => describeSet(U, show))
      .join(", ");
    const relation = specializationOrder(eq, space)
      .map(([a, b]) => `${show(a)}≤${show(b)}`)
      .join(", ");
    return [
      `== ${name} invariants ==`,
      `  Connected? ${isConnected(eq, space)}`,
      `  closure(S) = ${closureStr}`,
      `  interior(S) = ${interiorStr}`,
      `  boundary(S) = ${boundaryStr}`,
      `  Closed sets: ${closedStr}`,
      `  Specialization: ${relation}`,
    ];
  };

  return [
    "== Finite topology sampler ==",
    ...describeTopology("Discrete city space", citySpace, (x) => x),
    ...describeInvariants("City space", eqString, citySpace, subsetCity, (x) => x),
    `  Hausdorff? ${isHausdorff(eqString, citySpace)}`,
    "",
    ...describeTopology("Indiscrete weather space", moodSpace, (x) => x),
    ...describeInvariants("Weather space", eqString, moodSpace, subsetMood, (x) => x),
    `  Hausdorff? ${isHausdorff(eqString, moodSpace)}`,
    "",
    ...describeTopology("Product space city×weather", productSpace, (p) => `(${p.x}, ${p.y})`),
    `  Valid topology? ${isTopology(eqPair, productSpace)}`,
    `  Projection π₁ continuous? ${projectionContinuous}`,
    ...describeInvariants(
      "Product space",
      eqPair,
      productSpace,
      [{ x: "Depot", y: "Sunny" }],
      (p) => `(${p.x}, ${p.y})`,
    ),
    "",
    ...describeTopology("Sierpiński space", sierpinski, (x) => x.toString()),
    ...describeInvariants("Sierpiński", eqSierpinski, sierpinski, subsetSierpinski, (x) => x.toString()),
  ];
}

export const stage075FiniteTopologyBasics: RunnableExample = {
  id: "075",
  title: "Finite topology basics",
  outlineReference: 75,
  summary:
    "Construct discrete/indiscrete finite spaces, build their product, and inspect closures, interiors, boundaries, connectedness, and projection continuity.",
  run: async () => ({ logs: exploreFiniteTopologies() }),
};
