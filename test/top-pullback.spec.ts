import { describe, expect, it } from "vitest";

import { discrete } from "../src/top/Topology";
import { compose, makeContinuousMap } from "../src/top/ContinuousMap";
import { topPullback, topFactorThroughPullback } from "../src/top/pullbacks";

const eqNum = (a: number, b: number) => a === b;

describe("Topological pullbacks via subspaces of products", () => {
  const TX = discrete([0, 1, 2]);
  const TY = discrete([10, 11, 12]);
  const TZ = discrete([0, 1]);

  const f = makeContinuousMap({
    source: TX,
    target: TZ,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (x: number) => x % 2,
  });

  const g = makeContinuousMap({
    source: TY,
    target: TZ,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (y: number) => (y - 10) % 2,
  });

  it("constructs the fibre product and projections", () => {
    const witness = topPullback(f, g);

    expect(witness.obj.carrier).toHaveLength(5);
    const pairs = witness.obj.carrier.map(({ x, y }) => [x, y]);
    expect(pairs).toEqual(
      expect.arrayContaining([
        [0, 10],
        [0, 12],
        [1, 11],
        [2, 10],
        [2, 12],
      ]),
    );

    const viaF = compose(f, witness.proj1);
    const viaG = compose(g, witness.proj2);
    witness.obj.carrier.forEach((point) => {
      expect(viaF.map(point)).toBe(viaG.map(point));
    });
  });

  it("recovers mediators for commuting cones", () => {
    const witness = topPullback(f, g);
    const W = discrete([0, 1, 2]);
    const left = makeContinuousMap({
      source: W,
      target: TX,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: (w: number) => w,
    });
    const right = makeContinuousMap({
      source: W,
      target: TY,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: (w: number) => (w === 0 ? 10 : w === 1 ? 11 : 12),
    });

    const report = topFactorThroughPullback(f, g, witness, left, right);
    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(report.mediator).not.toBeUndefined();

    const entry = report.mediators[0];
    expect(entry?.holds).toBe(true);
    expect(entry?.metadata?.reproducesLeftLeg).toBe(true);
    expect(entry?.metadata?.reproducesRightLeg).toBe(true);

    const mediator = report.mediator;
    if (!mediator) {
      throw new Error("expected pullback mediator to be present");
    }

    const recoveredLeft = compose(witness.proj1, mediator);
    const recoveredRight = compose(witness.proj2, mediator);
    W.carrier.forEach((w) => {
      expect(recoveredLeft.map(w)).toBe(left.map(w));
      expect(recoveredRight.map(w)).toBe(right.map(w));
    });
  });
});
