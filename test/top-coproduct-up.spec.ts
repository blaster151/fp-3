import { describe, expect, it } from "vitest";
import { continuous, discrete } from "../src/top/Topology";
import { checkCoproductUP } from "../src/top/CoproductUP";
import {
  copair,
  coproductStructure,
  injectionLeft,
  injectionRight,
  makeContinuousMap,
} from "../src/top/ContinuousMap";

const eqNum = (a: number, b: number) => a === b;

describe("Coproduct universal property on finite spaces", () => {
  const X = [0, 1];
  const Y = [10, 20];
  const Z = [100, 200, 300];
  const TX = discrete(X);
  const TY = discrete(Y);
  const TZ = discrete(Z);

  const f = (x: number) => (x === 0 ? 100 : 200);
  const g = (y: number) => (y === 10 ? 200 : 300);

  it("injections and copairing satisfy the universal property", () => {
    const result = checkCoproductUP(eqNum, eqNum, eqNum, TX, TY, TZ, f, g, continuous);

    expect(result.cInl).toBe(true);
    expect(result.cInr).toBe(true);
    expect(result.cCopair).toBe(true);
    expect(result.uniqueHolds).toBe(true);

    const leftImage = X.map((x) => ({ tag: "inl" as const, value: x }));
    const rightImage = Y.map((y) => ({ tag: "inr" as const, value: y }));

    expect(
      leftImage.every((point) =>
        result.coproductTopology.carrier.some(
          (candidate) => candidate.tag === point.tag && candidate.value === point.value,
        ),
      ),
    ).toBe(true);
    expect(
      rightImage.every((point) =>
        result.coproductTopology.carrier.some(
          (candidate) => candidate.tag === point.tag && candidate.value === point.value,
        ),
      ),
    ).toBe(true);
  });

  it("coproduct structures build injections and folds", () => {
    const structure = coproductStructure(eqNum, eqNum, TX, TY);
    const inl = injectionLeft(structure);
    const inr = injectionRight(structure);

    expect(inl.source).toBe(TX);
    expect(inr.source).toBe(TY);
    expect(inl.target).toBe(structure.topology);
    expect(inr.target).toBe(structure.topology);

    const foldedLeft = makeContinuousMap({
      source: TX,
      target: TZ,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: f,
    });
    const foldedRight = makeContinuousMap({
      source: TY,
      target: TZ,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: g,
    });
    const fold = copair(foldedLeft, foldedRight, { topology: structure.topology, eq: structure.eq });

    expect(fold.source).toBe(structure.topology);
    expect(fold.target).toBe(TZ);
    expect(fold.witness.verify()).toBe(true);
    expect(fold.map({ tag: "inl", value: 1 })).toBe(200);
    expect(fold.map({ tag: "inr", value: 20 })).toBe(300);
  });
});
