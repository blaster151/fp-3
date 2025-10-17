import type { RunnableExample } from "./types";
import type { CoproductPoint, Top } from "../../src/top/Topology";

declare function require(id: string): any;

type TopologyModule = {
  readonly discrete: <X>(carrier: ReadonlyArray<X>) => Top<X>;
  readonly continuous: <X, Y>(
    eqX: (a: X, b: X) => boolean,
    TX: Top<X>,
    TY: Top<Y>,
    f: (x: X) => Y,
    eqY?: (a: Y, b: Y) => boolean,
  ) => boolean;
};

type CoproductUPModule = {
  readonly checkCoproductUP: <X, Y, Z>(
    eqX: (a: X, b: X) => boolean,
    eqY: (a: Y, b: Y) => boolean,
    eqZ: (a: Z, b: Z) => boolean,
    TX: Top<X>,
    TY: Top<Y>,
    TZ: Top<Z>,
    f: (x: X) => Z,
    g: (y: Y) => Z,
    continuous: <A, B>(
      eqA: (a: A, b: A) => boolean,
      TA: Top<A>,
      TB: Top<B>,
      h: (a: A) => B,
      eqB?: (a: B, b: B) => boolean,
    ) => boolean,
  ) => {
    readonly cInl: boolean;
    readonly cInr: boolean;
    readonly cCopair: boolean;
    readonly uniqueHolds: boolean;
    readonly coproductTopology: Top<CoproductPoint<X, Y>>;
  };
};

type ContinuousMap<X, Y> = {
  readonly source: Top<X>;
  readonly target: Top<Y>;
  readonly eqSource: (a: X, b: X) => boolean;
  readonly eqTarget: (a: Y, b: Y) => boolean;
  readonly map: (x: X) => Y;
};

type CoproductStructure<X, Y> = {
  readonly topology: Top<CoproductPoint<X, Y>>;
  readonly eq: (a: CoproductPoint<X, Y>, b: CoproductPoint<X, Y>) => boolean;
  readonly inl: ContinuousMap<X, CoproductPoint<X, Y>>;
  readonly inr: ContinuousMap<Y, CoproductPoint<X, Y>>;
};

type ContinuousMapModule = {
  readonly makeContinuousMap: <X, Y>(data: {
    readonly source: Top<X>;
    readonly target: Top<Y>;
    readonly eqSource: (a: X, b: X) => boolean;
    readonly eqTarget: (a: Y, b: Y) => boolean;
    readonly map: (x: X) => Y;
  }) => ContinuousMap<X, Y>;
  readonly coproductStructure: <X, Y>(
    eqX: (a: X, b: X) => boolean,
    eqY: (a: Y, b: Y) => boolean,
    TX: Top<X>,
    TY: Top<Y>,
  ) => CoproductStructure<X, Y>;
  readonly injectionLeft: <X, Y>(structure: CoproductStructure<X, Y>) => ContinuousMap<X, CoproductPoint<X, Y>>;
  readonly injectionRight: <X, Y>(structure: CoproductStructure<X, Y>) => ContinuousMap<Y, CoproductPoint<X, Y>>;
  readonly copair: <X, Y, Z>(
    f: ContinuousMap<X, Z>,
    g: ContinuousMap<Y, Z>,
    coproductInfo: { readonly topology: Top<CoproductPoint<X, Y>>; readonly eq: (a: CoproductPoint<X, Y>, b: CoproductPoint<X, Y>) => boolean },
  ) => ContinuousMap<CoproductPoint<X, Y>, Z>;
};

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
  logs.push(
    `ι₁ continuous? ${result.cInl}  |  ι₂ continuous? ${result.cInr}  |  [f,g] continuous? ${result.cCopair}`,
  );
  logs.push(`UP equations satisfied? ${result.uniqueHolds}`);
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
