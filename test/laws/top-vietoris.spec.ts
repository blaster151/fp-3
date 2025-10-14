import { describe, expect, it } from "vitest";
import {
  buildTopVietorisKolmogorovWitness,
  checkTopVietorisKolmogorov,
  buildTopVietorisHewittSavageWitness,
  checkTopVietorisHewittSavage,
  makeDiscreteTopSpace,
  makeKolmogorovProductSpace,
  makeProductPrior,
  makeDeterministicStatistic,
  type KolmogorovProductSpace,
} from "../../top-vietoris-examples";
import { IFin, mkFin } from "../../markov-category";

const label = "Top/Vietoris Kolmogorov (adapter)";

type Bit = 0 | 1;
type Pair = readonly [Bit, Bit];

describe("Top/Vietoris adapters", () => {
  it("builds concrete Kolmogorov witnesses using the product helpers", () => {
    const bit = mkFin<Bit>([0, 1], (a, b) => a === b, (value) => value.toString());
    const bitSpace = makeDiscreteTopSpace("bit", bit);
    const pairSpace = makeKolmogorovProductSpace([bitSpace, bitSpace], { label: "bit²" }) as unknown as KolmogorovProductSpace<Pair>;

    const aligned = pairSpace.points.elems.find((point) => point[0] === 0 && point[1] === 0) as Pair | undefined;
    if (!aligned) throw new Error("expected aligned point in bit² product");

    const prior = makeProductPrior(() => ({
      domain: IFin,
      product: pairSpace,
      support: [[aligned, 1]],
      label: "aligned prior",
    }));

    const statistic = makeDeterministicStatistic<Pair, Bit>(() => ({
      source: pairSpace,
      target: bit,
      statistic: (pair) => pair[0],
      label: "first coordinate",
    }));

    const witness = buildTopVietorisKolmogorovWitness(prior, statistic, pairSpace.finiteMarginals, label);
    const report = checkTopVietorisKolmogorov(witness, { tolerance: 1e-9 });

    expect(report.holds).toBe(true);
    expect(report.deterministic).toBe(true);
    expect(report.ciFamilyVerified).toBe(true);
  });

  it("rejects priors whose support escapes the encoded product space", () => {
    const bit = mkFin<Bit>([0, 1], (a, b) => a === b);
    const bitSpace = makeDiscreteTopSpace("bit", bit);
    const pairSpace = makeKolmogorovProductSpace([bitSpace, bitSpace]) as unknown as KolmogorovProductSpace<Pair>;

    const invalidSupport = [
      [{ bad: true } as unknown as Pair, 1] as const,
    ] satisfies ReadonlyArray<readonly [Pair, number]>;

    expect(() =>
      makeProductPrior(() => ({
        domain: IFin,
        product: pairSpace,
        support: invalidSupport,
        label: "invalid prior",
      })),
    ).toThrow(/outside the encoded product space/);
  });

  it("rejects statistics that leave the declared codomain", () => {
    const bit = mkFin<Bit>([0, 1], (a, b) => a === b);
    const bitSpace = makeDiscreteTopSpace("bit", bit);
    const product = makeKolmogorovProductSpace([bitSpace]) as unknown as KolmogorovProductSpace<readonly [Bit]>;

    expect(() =>
      makeDeterministicStatistic<readonly [Bit], Bit>(() => ({
        source: product,
        target: bit,
        statistic: () => 2 as unknown as Bit,
        label: "invalid statistic",
      })),
    ).toThrow(/outside the declared codomain/);
  });

  it("exposes Hewitt–Savage as an explicit non-causal stub", () => {
    expect(() => buildTopVietorisHewittSavageWitness()).toThrow(/not causal/i);
    expect(() => checkTopVietorisHewittSavage()).toThrow(/not causal/i);
  });
});
