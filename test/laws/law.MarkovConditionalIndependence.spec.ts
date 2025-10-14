import { describe, it, expect } from "vitest";
import { mkFin, detK, tensorObj, FinMarkov } from "../../markov-category";
import { buildMarkovComonoidWitness } from "../../markov-comonoid-structure";
import {
  buildMarkovConditionalWitness,
  checkConditionalIndependence,
  conditionalMarginals,
  factorizeConditional,
} from "../../markov-conditional-independence";
import { buildMarkovDeterministicWitness, checkDeterminismLemma } from "../../markov-deterministic-structure";

const mkBit = () => mkFin<number>([0, 1], (a, b) => a === b, (x) => x.toString());
type SampleState = "a0" | "a1";

describe("conditional independence", () => {
  it("confirms factorization for conditionally independent kernels", () => {
    type A = "a0" | "a1";
    const AFin = mkFin<A>(["a0", "a1"], (a, b) => a === b);
    const Bit1 = mkBit();
    const Bit2 = mkBit();

    const domain = buildMarkovComonoidWitness(AFin, { label: "A" });
    const out1 = buildMarkovComonoidWitness(Bit1, { label: "X₁" });
    const out2 = buildMarkovComonoidWitness(Bit2, { label: "X₂" });

    const first = detK(AFin, Bit1, (a) => (a === "a0" ? 0 : 1));
    const second = new FinMarkov(
      AFin,
      Bit2,
      (a: A) =>
        a === "a0"
          ? new Map<number, number>([
              [0, 0.7],
              [1, 0.3],
            ])
          : new Map<number, number>([
              [0, 0.2],
              [1, 0.8],
            ]),
    );

    const product = tensorObj(Bit1, Bit2);
    const arrow = new FinMarkov(AFin, product, (a: A) => {
      const dist = new Map<readonly [number, number], number>();
      const d1 = first.k(a);
      const d2 = second.k(a);
      for (const [x, px] of d1) {
        for (const [y, py] of d2) {
          const weight = px * py;
          if (weight === 0) continue;
          const key = [x, y] as const;
          dist.set(key, (dist.get(key) ?? 0) + weight);
        }
      }
      return dist;
    });

    const witness = buildMarkovConditionalWitness(domain, [out1, out2], arrow, { label: "p" });
    const components = conditionalMarginals(witness);
    expect(components).toHaveLength(2);
    const [firstComponent, secondComponent] = components;
    if (!firstComponent || !secondComponent) {
      throw new Error("conditionalMarginals returned insufficient components");
    }
    expect(firstComponent.Y).toBe(Bit1);
    expect(secondComponent.Y).toBe(Bit2);

    const factorized = factorizeConditional(witness);
    const report = checkConditionalIndependence(witness, { permutations: [[1, 0]] });
    expect(report.holds).toBe(true);
    expect(report.equality).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(report.permutations).toHaveLength(1);
    const [firstPermutation] = report.permutations;
    if (!firstPermutation) {
      throw new Error("conditional independence report missing permutation details");
    }
    expect(firstPermutation.holds).toBe(true);
    expect(report.factorized.matrix()).toEqual(factorized.matrix());
  });

  it("detects correlated outputs that violate conditional independence", () => {
    type A = "a0" | "a1";
    const AFin = mkFin<A>(["a0", "a1"], (a, b) => a === b);
    const Bit1 = mkBit();
    const Bit2 = mkBit();

    const domain = buildMarkovComonoidWitness(AFin, { label: "A" });
    const out1 = buildMarkovComonoidWitness(Bit1, { label: "X₁" });
    const out2 = buildMarkovComonoidWitness(Bit2, { label: "X₂" });

    const correlated = new FinMarkov(
      AFin,
      tensorObj(Bit1, Bit2),
      () =>
        new Map<readonly [number, number], number>([
          [[0, 0] as const, 0.5],
          [[1, 1] as const, 0.5],
        ]),
    );

    const witness = buildMarkovConditionalWitness(domain, [out1, out2], correlated, { label: "correlated" });
    const report = checkConditionalIndependence(witness, { permutations: [[1, 0]] });

    expect(report.holds).toBe(false);
    expect(report.equality).toBe(false);
    expect(report.failures.some((failure) => failure.law === "factorization")).toBe(true);
    const [firstPermutation] = report.permutations;
    if (!firstPermutation) {
      throw new Error("conditional independence report missing permutation details");
    }
    expect(firstPermutation.holds).toBe(false);
  });

  it("records permutation validation errors", () => {
    type A = "a";
    const AFin = mkFin<A>(["a"], (a, b) => a === b);
    const Bit = mkBit();
    const domain = buildMarkovComonoidWitness(AFin, { label: "A" });
    const out1 = buildMarkovComonoidWitness(Bit, { label: "X₁" });

    const arrow = new FinMarkov(AFin, Bit, () => new Map([[0, 1]]));
    const witness = buildMarkovConditionalWitness(domain, [out1], arrow, { label: "trivial" });
    const report = checkConditionalIndependence(witness, { permutations: [[0, 1]] });

    expect(report.holds).toBe(false);
    expect(report.failures.some((failure) => failure.law === "permutation")).toBe(true);
    const [firstPermutation] = report.permutations;
    if (!firstPermutation) {
      throw new Error("conditional independence report missing permutation details");
    }
    expect(firstPermutation.holds).toBe(false);
  });
});

describe("determinism lemma", () => {
  const buildDomain = () => {
    const AFin = mkFin<SampleState>(["a0", "a1"], (a, b) => a === b);
    const BitX = mkBit();
    const BitT = mkBit();
    const domain = buildMarkovComonoidWitness(AFin, { label: "A" });
    const xWitness = buildMarkovComonoidWitness(BitX, { label: "X" });
    const tWitness = buildMarkovComonoidWitness(BitT, { label: "T" });

    const p = new FinMarkov(
      AFin,
      BitX,
      (a: SampleState) =>
        a === "a0"
          ? new Map<number, number>([
              [0, 0.6],
              [1, 0.4],
            ])
          : new Map<number, number>([
              [0, 0.3],
              [1, 0.7],
            ]),
    );

    const product = tensorObj(BitX, BitT);
    const buildJoint = (statistic: FinMarkov<number, number>) =>
      new FinMarkov(AFin, product, (a: SampleState) => {
        const dist = new Map<readonly [number, number], number>();
        for (const [x, px] of p.k(a)) {
          if (px === 0) continue;
          for (const [tValue, pt] of statistic.k(x)) {
            const weight = px * pt;
            if (weight === 0) continue;
            const key = [x, tValue] as const;
            dist.set(key, (dist.get(key) ?? 0) + weight);
          }
        }
        return dist;
      });

    return { A: AFin, X: BitX, T: BitT, product, domain, xWitness, tWitness, p, buildJoint };
  };

  it("certifies deterministic composites when conditional independence holds", () => {
    const { X, T, domain, xWitness, tWitness, p, buildJoint } = buildDomain();

    const constantStatistic = detK(X, T, () => 0);
    const deterministicWitness = buildMarkovDeterministicWitness(xWitness, tWitness, constantStatistic, {
      label: "constant statistic",
    });

    const composite = p.then(constantStatistic);
    const joint = buildJoint(constantStatistic);

    const conditional = buildMarkovConditionalWitness(domain, [xWitness, tWitness], joint, {
      label: "joint with constant statistic",
    });

    const report = checkDeterminismLemma({
      conditional,
      p,
      deterministic: deterministicWitness,
      label: "determinism lemma",
    });

    expect(report.holds).toBe(true);
    expect(report.failures).toHaveLength(0);
    expect(report.composite.deterministic).toBe(true);
    expect(report.marginals.x.matrix()).toEqual(p.matrix());
    expect(report.marginals.t.matrix()).toEqual(composite.matrix());
  });

  it("reports conditional-independence failures when correlation remains", () => {
    const { X, T, domain, xWitness, tWitness, p, buildJoint } = buildDomain();

    const identityStatistic = detK(X, T, (x: number) => x);
    const deterministicWitness = buildMarkovDeterministicWitness(xWitness, tWitness, identityStatistic, {
      label: "identity statistic",
    });

    const composite = p.then(identityStatistic);
    const joint = buildJoint(identityStatistic);
    const conditional = buildMarkovConditionalWitness(domain, [xWitness, tWitness], joint, {
      label: "correlated joint",
    });

    const report = checkDeterminismLemma({
      conditional,
      p,
      deterministic: deterministicWitness,
      label: "correlated determinism lemma",
    });

    expect(report.holds).toBe(false);
    expect(report.failures.some((failure) => failure.law === "conditionalIndependence")).toBe(true);
    expect(report.composite.deterministic).toBe(false);
    expect(report.marginals.t.matrix()).toEqual(composite.matrix());
  });
});
