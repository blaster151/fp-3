import { describe, expect, it } from "vitest";

import { discrete } from "../src/top/Topology";
import { compose, makeContinuousMap } from "../src/top/ContinuousMap";
import { topPushout, topFactorThroughPushout } from "../src/top/pushouts";

const eqNum = (a: number, b: number) => a === b;

describe("Topological pushouts via quotient coproducts", () => {
  const TX = discrete([0, 1, 2]);
  const TY = discrete([10, 20]);
  const spanSource = discrete([0, 1]);

  const leftLeg = makeContinuousMap({
    source: spanSource,
    target: TX,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (s: number) => (s === 0 ? 0 : 2),
  });

  const rightLeg = makeContinuousMap({
    source: spanSource,
    target: TY,
    eqSource: eqNum,
    eqTarget: eqNum,
    map: (s: number) => (s === 0 ? 10 : 20),
  });

  it("identifies the coproduct points determined by the span", () => {
    const witness = topPushout(leftLeg, rightLeg);

    expect(witness.obj.carrier).toHaveLength(3);
    const classLabels = witness.obj.carrier.map((cls) =>
      cls
        .map((point) => `${point.tag}:${point.value}`)
        .sort()
        .join(","),
    );
    expect(classLabels).toEqual(
      expect.arrayContaining([
        "inl:0,inr:10",
        "inl:1",
        "inl:2,inr:20",
      ]),
    );

    const viaLeft = compose(witness.inl, leftLeg);
    const viaRight = compose(witness.inr, rightLeg);
    spanSource.carrier.forEach((s) => {
      expect(viaLeft.map(s)).toEqual(viaRight.map(s));
    });
  });

  it("returns mediators for compatible cocones", () => {
    const witness = topPushout(leftLeg, rightLeg);
    const target = discrete([0, 1]);
    const coconeLeft = makeContinuousMap({
      source: TX,
      target,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: (x: number) => (x === 0 ? 0 : 1),
    });
    const coconeRight = makeContinuousMap({
      source: TY,
      target,
      eqSource: eqNum,
      eqTarget: eqNum,
      map: (y: number) => (y === 10 ? 0 : 1),
    });

    const report = topFactorThroughPushout(leftLeg, rightLeg, witness, coconeLeft, coconeRight);
    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(report.mediator).not.toBeUndefined();

    const entry = report.mediators[0];
    expect(entry?.holds).toBe(true);
    expect(entry?.metadata?.reproducesLeftLeg).toBe(true);
    expect(entry?.metadata?.reproducesRightLeg).toBe(true);

    const mediator = report.mediator;
    if (!mediator) {
      throw new Error("expected pushout mediator to be present");
    }

    const recoveredLeft = compose(mediator, witness.inl);
    const recoveredRight = compose(mediator, witness.inr);
    TX.carrier.forEach((x) => {
      expect(recoveredLeft.map(x)).toBe(coconeLeft.map(x));
    });
    TY.carrier.forEach((y) => {
      expect(recoveredRight.map(y)).toBe(coconeRight.map(y));
    });
  });
});
