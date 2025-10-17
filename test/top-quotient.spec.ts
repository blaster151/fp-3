import { describe, expect, it } from "vitest";
import { quotientByRelation, quotientTopology } from "../src/top/Quotient";
import { topCoequalizer, topFactorThroughCoequalizer, topCoequalizerComparison } from "../src/top/coequalizers";
import { discrete, indiscrete, isTopology, type Top } from "../src/top/Topology";
import { compose, makeContinuousMap } from "../src/top/ContinuousMap";
import { mapsEqual } from "../src/top/Embeddings";

const eqNum = (a: number, b: number) => a === b;
const eqString = (a: string, b: string) => a === b;

function eqSet<T>(A: ReadonlyArray<T>, B: ReadonlyArray<T>, eq: (a: T, b: T) => boolean): boolean {
  return (
    A.length === B.length &&
    A.every((a) => B.some((b) => eq(a, b))) &&
    B.every((b) => A.some((a) => eq(a, b)))
  );
}

describe("Quotient topologies", () => {
  it("constructs the final topology for a surjective map", () => {
    const source = indiscrete([0, 1, 2, 3]);
    const carrier = ["even", "odd"] as const;
    const projection = quotientTopology({
      source,
      eqSource: eqNum,
      carrier,
      eqTarget: eqString,
      map: (x: number) => (x % 2 === 0 ? "even" : "odd"),
    });
    expect(isTopology(eqString, projection.topology)).toBe(true);
    expect(projection.projection.witness.verify()).toBe(true);
    const expectedOpens = [[], ["even", "odd"]];
    for (const open of projection.topology.opens) {
      expect(expectedOpens.some((candidate) => eqSet(candidate, open, eqString))).toBe(true);
    }
  });

  it("rejects non-surjective quotient maps", () => {
    const source = discrete([0, 1, 2]);
    const carrier = ["a", "b"] as const;
    expect(() =>
      quotientTopology({
        source,
        eqSource: eqNum,
        carrier,
        eqTarget: eqString,
        map: (x: number) => (x === 2 ? "a" : "a"),
      }),
    ).toThrow(/surjective/);
  });

  it("builds quotient spaces from equivalence relations", () => {
    const source = discrete([0, 1, 2]);
    const relation = (a: number, b: number) => a === b || (a !== 1 && b !== 1);
    const quotient = quotientByRelation({
      source,
      eqSource: eqNum,
      relation,
    });
    expect(isTopology(quotient.eqClass, quotient.topology)).toBe(true);
    expect(quotient.projection.witness.verify()).toBe(true);
    expect(quotient.topology.carrier).toHaveLength(2);
    const classes = quotient.topology.carrier;
    const merged = classes.find((cls) => cls.includes(0));
    const singleton = classes.find((cls) => cls.includes(1));
    expect(merged).toBeDefined();
    expect(singleton).toBeDefined();
    if (merged === undefined || singleton === undefined) {
      throw new Error("classes must exist");
    }
    expect(quotient.eqClass(merged, quotient.projection.map(0))).toBe(true);
    expect(quotient.eqClass(merged, quotient.projection.map(2))).toBe(true);
    expect(quotient.eqClass(singleton, quotient.projection.map(1))).toBe(true);
    expect(quotient.eqClass(merged, singleton)).toBe(false);
  });

  it("rejects relations that are not equivalences", () => {
    const source = discrete([0, 1]);
    const relation = (a: number, b: number) => a === 0 && b === 1;
    expect(() =>
      quotientByRelation({
        source,
        eqSource: eqNum,
        relation,
      }),
    ).toThrow(/relation must be symmetric/);
  });
});

describe("Coequalizers in Top", () => {
  const makeParallelPair = () => {
    const source: Top<number> = discrete([0, 1]);
    const target: Top<number> = discrete([10, 20, 30]);
    const f = makeContinuousMap({
      source,
      target,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: (x: number) => (x === 0 ? 10 : 20),
    });
    const g = makeContinuousMap({
      source,
      target,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: (x: number) => (x === 0 ? 20 : 30),
    });
    return { f, g, source, target };
  };

  it("constructs coequalizers as quotient topologies", () => {
    const { f, g } = makeParallelPair();
    const { obj, coequalize } = topCoequalizer(f, g);
    expect(isTopology(coequalize.eqTarget, obj)).toBe(true);
    const composedF = compose(coequalize, f);
    const composedG = compose(coequalize, g);
    expect(mapsEqual(coequalize.eqTarget, f.source.carrier, composedF.map, composedG.map)).toBe(true);
  });

  it("factors cocones uniquely through the coequalizer", () => {
    const { f, g, target } = makeParallelPair();
    const coequalizer = topCoequalizer(f, g);
    const codomain = indiscrete([0, 1]);
    const constant = makeContinuousMap({
      source: target,
      target: codomain,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: () => 0,
    });
    const mediator = topFactorThroughCoequalizer(f, g, coequalizer.coequalize, constant);
    const recomposed = compose(mediator, coequalizer.coequalize);
    expect(mapsEqual(constant.eqTarget, target.carrier, recomposed.map, constant.map)).toBe(true);
  });

  it("compares coequalizers via unique mediators", () => {
    const { f, g } = makeParallelPair();
    const first = topCoequalizer(f, g).coequalize;
    const second = topCoequalizer(f, g).coequalize;
    const { forward, backward } = topCoequalizerComparison(f, g, first, second);
    const composedForward = compose(forward, first);
    expect(mapsEqual(second.eqTarget, f.source.carrier, composedForward.map, second.map)).toBe(true);
    const composedBackward = compose(backward, second);
    expect(mapsEqual(first.eqTarget, f.source.carrier, composedBackward.map, first.map)).toBe(true);
    const roundTripFirst = compose(backward, forward);
    expect(mapsEqual(first.eqTarget, first.target.carrier, roundTripFirst.map, (cls) => cls)).toBe(true);
    const roundTripSecond = compose(forward, backward);
    expect(mapsEqual(second.eqTarget, second.target.carrier, roundTripSecond.map, (cls) => cls)).toBe(true);
  });
});
