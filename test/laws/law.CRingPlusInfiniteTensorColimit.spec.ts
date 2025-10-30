import { describe, expect, it } from "vitest";

import { IntegersObject } from "../../cring-plus";
import {
  addTensors,
  checkColimitCoverage,
  checkFilteredCompatibility,
  defaultFilteredWitness,
  elementaryTensor,
  multiplyTensors,
  negateTensor,
  restrictTensor,
  tensorSupport,
  tensorSupportDistribution,
  type TensorFamily,
  type TensorElement,
} from "../../cring-plus-filtered-tensor";

const family: TensorFamily<string, bigint> = {
  components: [
    { index: "a", object: IntegersObject },
    { index: "b", object: IntegersObject },
    { index: "c", object: IntegersObject },
  ],
  eqIndex: (x, y) => x === y,
  describeIndex: (index) => index,
};

const witness = defaultFilteredWitness(family);

const tensorA = elementaryTensor(family, [{ index: "a", value: 2n }]);
const tensorB = elementaryTensor(family, [{ index: "b", value: 3n }]);
const tensorC = elementaryTensor(family, [{ index: "c", value: 5n }]);

describe("CRing⊕ infinite tensor filtered colimit", () => {
  it("normalizes addition and negation of formal tensors", () => {
    const doubled = addTensors(family, tensorA, tensorA);
    expect(doubled.terms).toHaveLength(1);
    const first = doubled.terms[0];
    if (!first) throw new Error("expected normalized tensor term");
    expect(first.coefficient).toBe(2n);
    expect(first.entries).toHaveLength(1);
    expect(first.entries[0]?.value).toBe(2n);

    const cancelled = addTensors(family, doubled, negateTensor(family, tensorA));
    expect(cancelled.terms).toHaveLength(1);
    expect(cancelled.terms[0]?.coefficient).toBe(1n);
  });

  it("multiplies elementary tensors by combining finite supports", () => {
    const product = multiplyTensors(family, tensorA, tensorB);
    expect(product.terms).toHaveLength(1);
    const entries = product.terms[0]?.entries ?? [];
    expect(entries).toHaveLength(2);
    const keys = entries.map((entry) => entry.key).sort();
    expect(keys).toEqual(["a", "b"]);
  });

  it("restricts tensors to finite subsets", () => {
    const product = multiplyTensors(family, tensorA, tensorB);
    const restricted = restrictTensor(family, product, ["a"]);
    expect(restricted.terms).toHaveLength(1);
    expect(restricted.terms[0]?.entries).toHaveLength(1);
    expect(restricted.terms[0]?.entries[0]?.key).toBe("a");
  });

  it("verifies filtered-compatibility of inclusions", () => {
    const compat = checkFilteredCompatibility(witness, [
      { smaller: ["a"], larger: ["a", "b"], samples: [tensorA] },
      { smaller: ["b"], larger: ["a", "b", "c"], samples: [tensorB] },
    ]);
    expect(compat.holds).toBe(true);
    expect(compat.failures).toHaveLength(0);
  });

  it("recovers tensors from their finite supports", () => {
    const samples: TensorElement<string, bigint>[] = [
      multiplyTensors(family, tensorA, tensorB),
      addTensors(family, tensorA, tensorC),
    ];
    const coverage = checkColimitCoverage(witness, samples);
    expect(coverage.holds).toBe(true);
    expect(coverage.failures).toHaveLength(0);
  });

  it("tracks tensor support sets", () => {
    const sum = addTensors(family, tensorA, addTensors(family, tensorB, tensorC));
    const support = Array.from(tensorSupport(family, sum));
    expect(support.sort()).toEqual(["a", "b", "c"]);
  });

  it("produces normalized support distributions via semiring adapters", () => {
    const sum = addTensors(family, tensorA, addTensors(family, tensorB, tensorC));
    const distribution = tensorSupportDistribution(family, sum);
    const weights = Array.from(distribution.w.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    expect(weights).toEqual([
      ["a", 1 / 3],
      ["b", 1 / 3],
      ["c", 1 / 3],
    ]);
  });
});
