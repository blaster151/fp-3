import { describe, it, expect } from "vitest";
import { discrete, indiscrete } from "../Topology";
import { subspace } from "../Subspace";
import { inclusion } from "../Embeddings";
import { sierpinski } from "../Spaces";
import {
  compose,
  identity,
  makeContinuousMap,
  pairing,
  productStructure,
  projection1,
} from "../ContinuousMap";

const eqNum = (a: number, b: number) => a === b;

describe("Continuity beyond discrete spaces", () => {
  it("subspace inclusion is continuous (discrete example)", () => {
    const X = [0, 1, 2];
    const TX = discrete(X);
    const S = [0, 2];
    const TS = subspace(eqNum, TX, S);
    const i = inclusion(eqNum, S, X);
    const morphism = makeContinuousMap({
      source: TS,
      target: TX,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: i,
    });
    expect(morphism.witness.verify()).toBe(true);
  });

  it("composition of continuous maps is continuous (Sierpinski -> indiscrete)", () => {
    const TSp = sierpinski();
    const TXi = indiscrete([0, 1, 2]);
    const f = (s: number) => (s === 1 ? 0 : 1);
    const g = (_: number) => 2;
    const fMap = makeContinuousMap({
      source: TSp,
      target: TXi,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: f,
    });
    const gMap = makeContinuousMap({
      source: TXi,
      target: TXi,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: g,
    });
    const idSp = identity(eqNum, TSp);

    const compLeft = compose(gMap, fMap);
    const compRight = compose(fMap, idSp);

    expect(fMap.witness.verify()).toBe(true);
    expect(gMap.witness.verify()).toBe(true);
    expect(compLeft.witness.verify()).toBe(true);
    expect(compRight.witness.verify()).toBe(true);
    expect(compLeft.map(1)).toBe(g(f(1)));
    expect(compRight.map(1)).toBe(f(1));
  });

  it("product pairing composes with projections", () => {
    const TZ = discrete([0, 1]);
    const TX = discrete([10, 11]);
    const TY = indiscrete([20, 21]);
    const structure = productStructure(eqNum, eqNum, TX, TY);

    const fMap = makeContinuousMap({
      source: TZ,
      target: TX,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: (z: number) => (z === 0 ? 10 : 11),
    });
    const gMap = makeContinuousMap({
      source: TZ,
      target: TY,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: (_z: number) => 20,
    });

    const pairMap = pairing(fMap, gMap, { topology: structure.topology, eq: structure.eq });
    const recoverF = compose(projection1(structure), pairMap);

    expect(pairMap.witness.verify()).toBe(true);
    expect(recoverF.witness.verify()).toBe(true);
    expect(recoverF.map(0)).toBe(10);
    expect(recoverF.map(1)).toBe(11);
  });
});
