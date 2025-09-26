import { describe, expect, it } from "vitest";
import {
  mkFin,
  detK,
  tensorObj,
  FinMarkov,
  fst,
  snd,
  swap,
} from "../../markov-category";
import {
  buildDeterminismLemmaWitness,
  checkDeterminismLemma,
} from "../../markov-determinism-lemma";
import {
  buildKolmogorovZeroOneWitness,
  checkKolmogorovZeroOne,
  buildHewittSavageWitness,
  checkHewittSavageZeroOne,
} from "../../markov-zero-one";
import type { FinitePermutation, FiniteInjection } from "../../markov-permutation";

const mkBit = () => mkFin([0, 1] as const, (a, b) => a === b);

type A = "a0" | "a1";

describe("determinism lemma oracle", () => {
  const AFin = mkFin<A>(["a0", "a1"], (a, b) => a === b);
  const bit = mkBit();
  const pair = tensorObj(bit, bit);
  const tFin = mkBit();

  const prior = detK(AFin, pair, (a) =>
    a === "a0" ? ([0, 0] as [number, number]) : ([1, 1] as [number, number]),
  );
  const stat = detK(pair, tFin, ([x]) => x as 0 | 1);

  it("certifies determinism when hypotheses hold", () => {
    const witness = buildDeterminismLemmaWitness(prior, stat, { label: "toy" });
    const report = checkDeterminismLemma(witness);

    expect(report.holds).toBe(true);
    expect(report.ciVerified).toBe(true);
    expect(report.deterministic).toBe(true);
  });

  it("flags non-deterministic composites", () => {
    const noisyStat = new FinMarkov(pair, tFin, ([x, y]: [number, number]) => {
      if (x === y) {
        return new Map([[x, 0.6], [1 - x, 0.4]]);
      }
      return new Map([
        [0, 0.5],
        [1, 0.5],
      ]);
    });

    const witness = buildDeterminismLemmaWitness(prior, noisyStat, { label: "noisy" });
    const report = checkDeterminismLemma(witness);

    expect(report.holds).toBe(false);
    expect(report.deterministic).toBe(false);
  });
});

describe("Kolmogorov zero-one oracle", () => {
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

  it("verifies independence family and determinism", () => {
    const witness = buildKolmogorovZeroOneWitness(prior, stat, finiteMarginals, { label: "toy" });
    const report = checkKolmogorovZeroOne(witness);

    expect(report.holds).toBe(true);
    expect(report.ciFamilyVerified).toBe(true);
    expect(report.deterministic).toBe(true);
    expect(report.failures).toHaveLength(0);
  });

  it("detects failure of finite marginal independence", () => {
    const correlatedPrior = new FinMarkov(AFin, pair, (a: A) =>
      a === "a0"
        ? new Map<readonly [number, number], number>([
            [[0, 0], 0.5],
            [[0, 1], 0.5],
          ])
        : new Map<readonly [number, number], number>([
            [[1, 0], 0.5],
            [[1, 1], 0.5],
          ]),
    );
    const xorStat = detK(pair, tFin, ([x, y]) => ((x ^ y) as 0 | 1));

    const witness = buildKolmogorovZeroOneWitness(correlatedPrior, xorStat, finiteMarginals, {
      label: "xor",
    });
    const report = checkKolmogorovZeroOne(witness);

    expect(report.holds).toBe(false);
    expect(report.ciFamilyVerified).toBe(false);
    expect(report.failures.length).toBeGreaterThan(0);
  });
});

describe("Hewitt–Savage zero-one oracle", () => {
  const AFin = mkFin<A>(["a0", "a1"], (a, b) => a === b);
  const bit = mkBit();
  const pair = tensorObj(bit, bit);
  const tFin = mkBit();

  const prior = detK(AFin, pair, (a) =>
    a === "a0" ? ([0, 0] as [number, number]) : ([1, 1] as [number, number]),
  );
  const statSym = detK(pair, tFin, ([x, y]) => ((x ^ y) as 0 | 1));

  const piFirst = new FinMarkov(pair, bit, fst<number, number>());
  const piSecond = new FinMarkov(pair, bit, snd<number, number>());
  const finiteMarginals = [
    { F: "first", piF: piFirst },
    { F: "second", piF: piSecond },
  ];

  const swapSymmetry: FinitePermutation<[number, number]> = {
    name: "swap",
    sigmaHat: new FinMarkov(pair, pair, swap<number, number>()),
  };
  const permutations: ReadonlyArray<FinitePermutation<[number, number]>> = [swapSymmetry];

  it("confirms permutation invariance along with Kolmogorov hypotheses", () => {
    const witness = buildHewittSavageWitness(prior, statSym, finiteMarginals, permutations, { label: "toy" });
    const report = checkHewittSavageZeroOne(witness);

    expect(report.holds).toBe(true);
    expect(report.permutationInvariant).toBe(true);
  });

  it("flags permutation asymmetry", () => {
    const asymmetricPrior = detK(AFin, pair, (a) =>
      a === "a0" ? ([0, 1] as [number, number]) : ([1, 0] as [number, number]),
    );
    const witness = buildHewittSavageWitness(
      asymmetricPrior,
      statSym,
      finiteMarginals,
      permutations,
      { label: "asym" },
    );
    const report = checkHewittSavageZeroOne(witness);

    expect(report.holds).toBe(false);
    expect(report.permutationInvariant).toBe(false);
    expect(report.permutationFailures.length).toBeGreaterThan(0);
  });

  it("accepts injections preserved on the support via almost-sure equality", () => {
    const diagInjection: FiniteInjection<[number, number]> = {
      name: "diag",
      kind: "injection",
      sigmaHat: detK(pair, pair, ([x, _y]) => [x, x] as [number, number]),
    };

    const witness = buildHewittSavageWitness(
      prior,
      statSym,
      finiteMarginals,
      [swapSymmetry, diagInjection],
      { label: "diag" },
    );

    const report = checkHewittSavageZeroOne(witness);

    expect(report.holds).toBe(true);
    expect(report.permutationReport?.symmetryReports.length).toBe(2);
    const diagReport = report.permutationReport?.symmetryReports.find((entry) => entry.name === "diag");
    expect(diagReport?.kind).toBe("injection");
    expect(diagReport?.statReport.holds).toBe(true);
    expect(diagReport?.priorInvariant).toBe(true);
  });
});
