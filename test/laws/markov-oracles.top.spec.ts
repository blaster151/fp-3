import { describe, expect, it } from "vitest";
import { createMarkovOracleRegistry } from "../../markov-oracles";
import { installTopVietorisAdapters } from "../../top-vietoris-examples";

const markovOracleRegistry = createMarkovOracleRegistry();
installTopVietorisAdapters(markovOracleRegistry);
const { MarkovOracles } = markovOracleRegistry;

describe("MarkovOracles.top.vietoris registry", () => {
  it("exposes a visible status string", () => {
    expect(MarkovOracles.top?.vietoris?.status).toMatch(/Kolmogorov.+Hewitt–Savage.+unavailable/i);
  });

  it("does not register Hewitt–Savage helpers", () => {
    expect("hewittSavage" in (MarkovOracles.top?.vietoris ?? {})).toBe(false);
  });

  it("exposes the adapter factory registration hook", () => {
    const adapters = MarkovOracles.top?.vietoris?.adapters?.();
    expect(adapters).toBeDefined();
    expect(typeof adapters?.makeProductPrior).toBe("function");
    expect(typeof adapters?.makeDeterministicStatistic).toBe("function");
  });

  it("exposes Kolmogorov and constant-function helpers", () => {
    const kolmogorov = MarkovOracles.top?.vietoris?.kolmogorov;
    expect(typeof kolmogorov?.witness).toBe("function");
    expect(typeof kolmogorov?.check).toBe("function");

    const constantFunction = MarkovOracles.top?.vietoris?.constantFunction;
    expect(typeof constantFunction?.witness).toBe("function");
    expect(typeof constantFunction?.check).toBe("function");
  });
});
