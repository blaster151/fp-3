import { describe, expect, it } from "vitest";
import { mkFin, detK, tensorObj, FinMarkov, fst, snd, swap, type Pair } from "../../markov-category";
import {
  buildZeroOneSynthesisWitness,
  checkZeroOneSynthesis,
  makeZeroOneOracle,
  type ZeroOneSynthesisInput,
} from "../../markov-zero-one-factory";
import type { FiniteSymmetry } from "../../markov-permutation";

type A = "a0" | "a1";

const mkBit = () => mkFin([0, 1] as const, (a, b) => a === b);
const bitPair = (left: 0 | 1, right: 0 | 1): Pair<0 | 1, 0 | 1> => [left, right] as const;
const forgetCodomain = <X, Y>(arrow: FinMarkov<X, Y>): FinMarkov<X, unknown> =>
  arrow as unknown as FinMarkov<X, unknown>;

describe("zero-one synthesis", () => {
  const AFin = mkFin<A>(["a0", "a1"], (a, b) => a === b);
  const bit = mkBit();
  const pair = tensorObj(bit, bit);
  const tFin = mkBit();

  const prior = detK(AFin, pair, (a) => (a === "a0" ? bitPair(0, 0) : bitPair(1, 1)));
  const stat = detK(pair, tFin, ([x]: Pair<0 | 1, 0 | 1>) => x);

  const piFirst = new FinMarkov(pair, bit, fst<0 | 1, 0 | 1>());
  const piSecond = new FinMarkov(pair, bit, snd<0 | 1, 0 | 1>());
  const finiteMarginals = [
    { F: "first", piF: forgetCodomain(piFirst) },
    { F: "second", piF: forgetCodomain(piSecond) },
  ] satisfies ZeroOneSynthesisInput<A, Pair<0 | 1, 0 | 1>, 0 | 1>["finiteMarginals"];

  const swapSymmetry: FiniteSymmetry<Pair<0 | 1, 0 | 1>> = {
    name: "swap",
    sigmaHat: new FinMarkov(pair, pair, swap<0 | 1, 0 | 1>()),
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
    const asymmetricPrior = detK(AFin, pair, (a) => (a === "a0" ? bitPair(0, 1) : bitPair(1, 0)));
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
