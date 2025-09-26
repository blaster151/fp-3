import { describe, expect, it } from "vitest";
import { mkFin, detK, tensorObj, FinMarkov, fst, snd, swap } from "../../markov-category";
import { buildZeroOneSynthesisWitness, checkZeroOneSynthesis, makeZeroOneOracle } from "../../markov-zero-one-factory";
import type { FiniteSymmetry } from "../../markov-permutation";

type A = "a0" | "a1";

const mkBit = () => mkFin([0, 1] as const, (a, b) => a === b);

describe("zero-one synthesis", () => {
  const AFin = mkFin<A>(["a0", "a1"], (a, b) => a === b);
  const bit = mkBit();
  const pair = tensorObj(bit, bit);
  const tFin = mkBit();

  const prior = detK(AFin, pair, (a) =>
    a === "a0" ? ([0, 0] as [number, number]) : ([1, 1] as [number, number]),
  );
  const stat = detK(pair, tFin, ([x]) => x as 0 | 1);

  const piFirst = new FinMarkov(pair, bit, fst<number, number>());
  const piSecond = new FinMarkov(pair, bit, snd<number, number>());
  const finiteMarginals = [
    { F: "first", piF: piFirst },
    { F: "second", piF: piSecond },
  ];

  const swapSymmetry: FiniteSymmetry<[number, number]> = {
    name: "swap",
    sigmaHat: new FinMarkov(pair, pair, swap<number, number>()),
  };

  it("composes Kolmogorov and symmetry diagnostics", () => {
    const witness = buildZeroOneSynthesisWitness({
      prior,
      statistic: stat,
      finiteMarginals,
      symmetries: [swapSymmetry],
      label: "synth",
    });
    const report = checkZeroOneSynthesis(witness);
    expect(report.holds).toBe(true);
    expect(report.kolmogorov.deterministic).toBe(true);
    expect(report.symmetryReport?.holds).toBe(true);
  });

  it("detects asymmetry failures", () => {
    const asymmetricPrior = detK(AFin, pair, (a) =>
      a === "a0" ? ([0, 1] as [number, number]) : ([1, 0] as [number, number]),
    );
    const witness = buildZeroOneSynthesisWitness({
      prior: asymmetricPrior,
      statistic: stat,
      finiteMarginals,
      symmetries: [swapSymmetry],
    });
    const report = checkZeroOneSynthesis(witness);
    expect(report.holds).toBe(false);
    expect(report.symmetryReport?.holds).toBe(false);
  });

  it("produces reusable oracle wrappers", () => {
    const oracle = makeZeroOneOracle({
      prior,
      statistic: stat,
      finiteMarginals,
      symmetries: [swapSymmetry],
    });
    const report = oracle.check();
    expect(report.holds).toBe(true);
  });
});
