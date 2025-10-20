import { describe, expect, it } from "vitest";

import {
  makeProbabilityMeasure,
  giryOf,
  giryBind,
  giryMap,
  giryProduct,
  productMeasurableSpace,
  discreteMeasurableSpace,
  IMeasurable,
  makeGiryKleisli,
} from "../../giry";
import type { ProbabilityMeasure, MeasurableSpace } from "../../giry";
import { embedFiniteDistribution } from "../../markov-category";

const borelR: MeasurableSpace<number> = {
  label: "Borel(ℝ)",
  isMeasurable: () => true,
};

const borelPair = productMeasurableSpace(borelR, borelR, "Borel(ℝ×ℝ)");

function integrateOnUnitInterval(f: (x: number) => number, steps = 4096): number {
  const h = 1 / steps;
  let acc = 0;
  for (let i = 0; i < steps; i++) {
    const x = (i + 0.5) * h;
    acc += f(x);
  }
  return acc * h;
}

const uniform01: ProbabilityMeasure<number> = makeProbabilityMeasure(
  borelR,
  (f) => integrateOnUnitInterval((x) => f(x)),
);

function expectClose(actual: number, expected: number, tol = 1e-3) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
}

function expectMeasuresApproximatelyEqual(
  lhs: ProbabilityMeasure<number>,
  rhs: ProbabilityMeasure<number>,
  sets: Array<(x: number) => boolean>,
  funcs: Array<(x: number) => number>,
  tol = 1e-3,
) {
  for (const set of sets) {
    const left = lhs.measure(set);
    const right = rhs.measure(set);
    expectClose(left, right, tol);
  }
  for (const f of funcs) {
    const left = lhs.expect(f);
    const right = rhs.expect(f);
    expectClose(left, right, tol);
  }
}

describe("Giry monad infrastructure", () => {
  it("creates Dirac measures with giryOf", () => {
    const dirac = giryOf(borelR, 0.3);
    expect(dirac.measure((x) => x === 0.3)).toBe(1);
    expect(dirac.expect((x) => x * x)).toBe(0.09);
  });

  it("satisfies the left and right identity laws", () => {
    const kernel = (x: number) => giryMap(uniform01, borelR, (y) => (x + y) / 2);
    const point = 0.4;
    const left = giryBind(giryOf(borelR, point), borelR, kernel);
    const direct = kernel(point);
    expectMeasuresApproximatelyEqual(
      left,
      direct,
      [
        (x) => x < 0.2,
        (x) => x < 0.6,
        (x) => x < 0.8,
      ],
      [
        (x) => x,
        (x) => x * x,
      ],
    );

    const right = giryBind(uniform01, borelR, (x) => giryOf(borelR, x));
    expectMeasuresApproximatelyEqual(
      right,
      uniform01,
      [
        (x) => x < 0.25,
        (x) => x < 0.5,
        (x) => x < 0.75,
      ],
      [
        (x) => x,
        (x) => x * x,
      ],
    );
  });

  it("satisfies associativity", () => {
    const f = (x: number) => giryMap(uniform01, borelR, (y) => (x + y) / 2);
    const g = (z: number) => giryMap(uniform01, borelR, (y) => (z * y + z) / 2);
    const lhs = giryBind(giryBind(uniform01, borelR, f), borelR, g);
    const rhs = giryBind(uniform01, borelR, (x) => giryBind(f(x), borelR, g));
    expectMeasuresApproximatelyEqual(
      lhs,
      rhs,
      [
        (x) => x < 0.25,
        (x) => x < 0.5,
        (x) => x < 0.75,
      ],
      [
        (x) => x,
        (x) => x * x,
      ],
    );
  });

  it("agrees with Fubini via product measures", () => {
    const product = giryProduct(uniform01, uniform01, borelPair);
    const viaBind = giryBind(uniform01, borelPair, (x) =>
      giryMap(uniform01, borelPair, (y) => [x, y] as const),
    );

    const sets = [
      (pair: readonly [number, number]) => pair[0] + pair[1] < 0.5,
      (pair: readonly [number, number]) => pair[0] < 0.5 && pair[1] < 0.5,
    ];
    const funcs = [
      (pair: readonly [number, number]) => pair[0] + pair[1],
      (pair: readonly [number, number]) => pair[0] * pair[1],
    ];

    for (const set of sets) {
      expectClose(product.measure(set), viaBind.measure(set));
    }
    for (const f of funcs) {
      expectClose(product.expect(f), viaBind.expect(f));
    }
  });

  it("embeds finite distributions as probability measures", () => {
    const space = discreteMeasurableSpace<string>("finite");
    const finite = new Map<string, number>([
      ["heads", 0.3],
      ["tails", 0.7],
    ]);
    const measure = embedFiniteDistribution(space, finite);
    expectClose(measure.measure((x) => x === "heads"), 0.3, 1e-9);
    expectClose(measure.expect((x) => (x === "heads" ? 1 : 0)), 0.3, 1e-9);
  });

  it("provides Giry Kleisli composition and tensoring", () => {
    const ops = makeGiryKleisli();
    const { GiryKleisli } = ops;
    const translate = (offset: number) => (x: number) => giryOf(borelR, x + offset);
    const blur = (scale: number) => (x: number) => giryMap(uniform01, borelR, (y) => x + scale * y);

    const k1 = new GiryKleisli(borelR, borelR, translate(0.25));
    const k2 = new GiryKleisli(borelR, borelR, blur(0.5));
    const composed = k1.then(borelR, k2);
    const result = composed.k(0);
    const manual = giryBind(k1.k(0), borelR, k2.k.bind(k2));
    expectMeasuresApproximatelyEqual(
      result,
      manual,
      [
        (x) => x < 0.2,
        (x) => x < 0.5,
        (x) => x < 0.8,
      ],
      [
        (x) => x,
        (x) => x * x,
      ],
    );

    const tensorDomain = productMeasurableSpace(borelR, borelR, "domain");
    const tensorCodomain = productMeasurableSpace(borelR, borelR, "codomain");
    const tensored = k1.tensor(tensorDomain, tensorCodomain, k2);
    const tensorResult = tensored.k([0, 0]);
    const manualTensor = giryProduct(k1.k(0), k2.k(0), tensorCodomain);
    const pairSets = [
      (pair: readonly [number, number]) => pair[0] < 0.5,
      (pair: readonly [number, number]) => pair[1] < 0.5,
    ];
    const pairFuncs = [
      (pair: readonly [number, number]) => pair[0],
      (pair: readonly [number, number]) => pair[1],
    ];
    for (const set of pairSets) {
      expectClose(tensorResult.measure(set), manualTensor.measure(set));
    }
    for (const f of pairFuncs) {
      expectClose(tensorResult.expect(f), manualTensor.expect(f));
    }

    const discard = ops.discardK<number>(IMeasurable);
    expect(discard(123).measure(() => true)).toBe(1);
  });
});

