import { describe, expect, it } from "vitest";
import {
  buildTopVietorisKolmogorovWitness,
  checkTopVietorisKolmogorov,
  buildTopVietorisHewittSavageWitness,
  checkTopVietorisHewittSavage,
} from "../../top-vietoris-examples";
import { IFin, idK, mkFin, detK, type Fin, type FinMarkov } from "../../markov-category";

const label = "Top/Vietoris Kolmogorov (stub)";

describe("Top/Vietoris adapters", () => {
  it("forwards Kolmogorov witnesses to the abstract zero–one oracle", () => {
    const XJ: Fin<string> = mkFin(["•"], (a, b) => a === b);
    const bit = mkFin([0, 1] as const, (a, b) => a === b);

    const prior = detK(IFin, XJ, () => "•");
    const stat = detK(XJ, bit, () => 0 as 0 | 1);

    const finiteMarginals = [
      { F: "identity", piF: idK(XJ) as FinMarkov<string, unknown> },
    ] as const satisfies ReadonlyArray<{
      readonly F: string;
      readonly piF: FinMarkov<string, unknown>;
    }>;

    const witness = buildTopVietorisKolmogorovWitness(prior, stat, finiteMarginals, label);
    const report = checkTopVietorisKolmogorov(witness, { tolerance: 1e-9 });

    expect(report.holds).toBe(true);
    expect(report.deterministic).toBe(true);
  });

  it("exposes Hewitt–Savage as an explicit non-causal stub", () => {
    expect(() => buildTopVietorisHewittSavageWitness()).toThrow(/not causal/i);
    expect(() => checkTopVietorisHewittSavage()).toThrow(/not causal/i);
  });
});
