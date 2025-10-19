import { describe, expect, it } from "vitest";

import { mkFin, FinMarkov, IFin } from "../../markov-category";
import { createMarkovOracleRegistry } from "../../markov-oracles";
import {
  buildBorelHewittSavageWitness,
  checkBorelHewittSavageZeroOne,
  type BorelPermutation,
  type Indicator,
  type MeasurableMap,
  type Sampler,
} from "../../borelstoch-examples";
import type { KolmogorovFiniteMarginal } from "../../markov-zero-one";

type Bit = 0 | 1;
type Triple = readonly [Bit, Bit, Bit];

describe("Hewitt–Savage zero–one witness adapters for BorelStoch", () => {
  const bit = mkFin<Bit>([0, 1], (a, b) => a === b);
  const triples: Triple[] = [];
  for (const a of bit.elems) {
    for (const b of bit.elems) {
      for (const c of bit.elems) {
        triples.push([a, b, c]);
      }
    }
  }
  const tripleFin = mkFin<Triple>(
    triples,
    (x, y) => x[0] === y[0] && x[1] === y[1] && x[2] === y[2],
    (t) => `[${t[0]},${t[1]},${t[2]}]`,
  );

  const projection = (index: number) =>
    new FinMarkov(tripleFin, bit, (tuple: Triple) => {
      const value = tuple[index];
      if (value === undefined) {
        throw new Error(`Projection ${index} received a tuple outside the carrier`);
      }
      return new Map([[value, 1]]);
    });

  const finiteMarginals: ReadonlyArray<KolmogorovFiniteMarginal<Triple, Bit>> = [
    { F: "first", piF: projection(0) },
    { F: "second", piF: projection(1) },
    { F: "third", piF: projection(2) },
  ];

  const coords: ReadonlyArray<MeasurableMap<Triple, Bit>> = [
    (omega) => omega[0],
    (omega) => omega[1],
    (omega) => omega[2],
  ];

  const sampler: Sampler<Triple> = () => {
    const first = tripleFin.elems[0];
    if (!first) {
      throw new Error("Expected tripleFin to contain at least one element");
    }
    return first;
  };

  const product = (values: ReadonlyArray<Bit>): Triple => {
    const [a, b, c] = values as [Bit, Bit, Bit];
    const found = tripleFin.elems.find((tuple) => tuple[0] === a && tuple[1] === b && tuple[2] === c);
    if (!found) throw new Error("Product constructor received a tuple outside the carrier.");
    return found;
  };

  const uniformSupport = tripleFin.elems.map((tuple) => [tuple, 1 / tripleFin.elems.length] as const);

  const permutations: ReadonlyArray<BorelPermutation<Triple>> = [
    {
      name: "swap01",
      sigmaHat: (tuple) => [tuple[1], tuple[0], tuple[2]] as Triple,
    },
    {
      name: "rot012",
      sigmaHat: (tuple) => [tuple[2], tuple[0], tuple[1]] as Triple,
    },
  ];

  it("certifies permutation-invariant indicators as deterministic", () => {
    const constantOne: Indicator<Triple> = () => 1;

    const witness = buildBorelHewittSavageWitness(
      sampler,
      coords,
      product,
      finiteMarginals,
      permutations,
      constantOne,
      {
        label: "Borel Hewitt–Savage (parity)",
        omegaSupport: uniformSupport,
        productSpace: tripleFin,
      },
    );

    const report = checkBorelHewittSavageZeroOne(witness);
    expect(report.holds).toBe(true);
    expect(report.deterministic).toBe(true);
    expect(report.permutationInvariant).toBe(true);
    expect(
      report.permutationReport?.symmetryReports.every(
        (entry) => entry.priorInvariant && entry.statReport.holds,
      ),
    ).toBe(true);

    const unit = IFin.elems[0];
    if (!unit) {
      throw new Error("Expected IFin to contain a terminal element");
    }
    const composite = report.composite.k(unit);
    expect(composite.size).toBe(1);
    const deterministicValue = [...composite.values()][0] ?? 0;
    expect(deterministicValue).toBeCloseTo(1, 10);

    const { MarkovOracles } = createMarkovOracleRegistry();
    const viaRegistry = MarkovOracles.zeroOne.borelHewittSavage.check(witness);
    expect(viaRegistry.holds).toBe(true);
    expect(viaRegistry.permutationInvariant).toBe(true);
  });

  it("flags permutation-sensitive indicators", () => {
    const headBias: Indicator<Triple> = (tuple) => (tuple[0] === 1 ? 1 : 0) as Bit;

    const witness = buildBorelHewittSavageWitness(
      sampler,
      coords,
      product,
      finiteMarginals,
      permutations,
      headBias,
      {
        label: "Borel Hewitt–Savage (non-invariant)",
        omegaSupport: uniformSupport,
        productSpace: tripleFin,
      },
    );

    const report = checkBorelHewittSavageZeroOne(witness);
    expect(report.holds).toBe(false);
    expect(report.permutationInvariant).toBe(false);
    expect(report.permutationFailures.some((failure) => failure.includes("swap01"))).toBe(true);
    expect(report.failures.some((entry) => entry.F.includes("swap01"))).toBe(true);

    const { MarkovOracles } = createMarkovOracleRegistry();
    const viaRegistry = MarkovOracles.zeroOne.borelHewittSavage.check(witness);
    expect(viaRegistry.permutationInvariant).toBe(false);
  });
});
