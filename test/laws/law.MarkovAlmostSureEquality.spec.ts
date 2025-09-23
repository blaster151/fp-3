import { describe, it, expect } from "vitest";
import { mkFin, FinMarkov } from "../../markov-category";
import {
  buildMarkovAlmostSureWitness,
  checkAlmostSureEquality,
} from "../../markov-almost-sure";

describe("p-almost-sure equality", () => {
  it("treats morphisms that agree on the support of p as almost surely equal", () => {
    type A = "a0" | "a1";
    type X = "x0" | "x1";
    type Y = 0 | 1;

    const AFin = mkFin<A>(["a0", "a1"], (a, b) => a === b);
    const XFin = mkFin<X>(["x0", "x1"], (a, b) => a === b);
    const YFin = mkFin<Y>([0, 1], (a, b) => a === b);

    const prior = new FinMarkov(AFin, XFin, () => new Map<X, number>([["x0", 1]]));

    const left = new FinMarkov(XFin, YFin, (x: X) =>
      x === "x0"
        ? new Map<Y, number>([[0, 1]])
        : new Map<Y, number>([
            [0, 0.2],
            [1, 0.8],
          ]),
    );

    const right = new FinMarkov(XFin, YFin, (x: X) =>
      x === "x0"
        ? new Map<Y, number>([[0, 1]])
        : new Map<Y, number>([
            [0, 0.7],
            [1, 0.3],
          ]),
    );

    const witness = buildMarkovAlmostSureWitness(prior, left, right, { label: "example" });
    const report = checkAlmostSureEquality(witness);

    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(report.support).toHaveLength(1);
    expect(report.support[0].value).toBe("x0");
    expect(report.support[0].totalMass).toBeCloseTo(2, 10);
    expect(report.support[0].contributions).toHaveLength(2);
    expect(report.support[0].contributions.map((c) => c.input)).toEqual(["a0", "a1"]);
    expect(report.support[0].contributions.map((c) => c.weight)).toEqual([1, 1]);
    expect(report.composite).toBeDefined();
    expect(report.equalComposite).toBe(true);
  });

  it("detects almost-sure failures on supported points", () => {
    type A = "a0" | "a1";
    type X = "x0" | "x1";
    type Y = 0 | 1;

    const AFin = mkFin<A>(["a0", "a1"], (a, b) => a === b);
    const XFin = mkFin<X>(["x0", "x1"], (a, b) => a === b);
    const YFin = mkFin<Y>([0, 1], (a, b) => a === b);

    const prior = new FinMarkov(AFin, XFin, (a: A) =>
      a === "a0"
        ? new Map<X, number>([
            ["x0", 0.2],
            ["x1", 0.8],
          ])
        : new Map<X, number>([["x1", 1]])
    );

    const left = new FinMarkov(XFin, YFin, (x: X) =>
      x === "x1"
        ? new Map<Y, number>([
            [0, 0.2],
            [1, 0.8],
          ])
        : new Map<Y, number>([[0, 1]]),
    );

    const right = new FinMarkov(XFin, YFin, (x: X) =>
      x === "x1"
        ? new Map<Y, number>([
            [0, 0.7],
            [1, 0.3],
          ])
        : new Map<Y, number>([[0, 1]]),
    );

    const witness = buildMarkovAlmostSureWitness(prior, left, right, { label: "failure" });
    const report = checkAlmostSureEquality(witness);

    expect(report.holds).toBe(false);
    expect(report.equalComposite).toBe(false);
    expect(report.support).toHaveLength(2);
    expect(report.failures).toHaveLength(1);
    const failure = report.failures[0];
    expect(failure.supportPoint).toBe("x1");
    expect(new Set(failure.sources)).toEqual(new Set(["a0", "a1"]));
    expect(failure.differences).toHaveLength(2);
    expect(failure.differences.map((entry) => entry.value).sort()).toEqual([0, 1]);
  });

  it("honours custom tolerances when comparing distributions", () => {
    type A = "a";
    type X = "x";
    type Y = 0 | 1;

    const AFin = mkFin<A>(["a"], (a, b) => a === b);
    const XFin = mkFin<X>(["x"], (a, b) => a === b);
    const YFin = mkFin<Y>([0, 1], (a, b) => a === b);

    const prior = new FinMarkov(AFin, XFin, () => new Map<X, number>([["x", 1]]));
    const left = new FinMarkov(XFin, YFin, () => new Map<Y, number>([[0, 0.5], [1, 0.5]]));
    const right = new FinMarkov(XFin, YFin, () => new Map<Y, number>([[0, 0.5000005], [1, 0.4999995]]));

    const witness = buildMarkovAlmostSureWitness(prior, left, right);
    const tightReport = checkAlmostSureEquality(witness);
    const looseReport = checkAlmostSureEquality(witness, { tolerance: 1e-6 });

    expect(tightReport.holds).toBe(false);
    expect(looseReport.holds).toBe(true);
  });
});
