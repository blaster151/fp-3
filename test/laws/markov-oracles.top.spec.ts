import { describe, expect, it } from "vitest";
import { MarkovOracles } from "../../markov-oracles";

describe("MarkovOracles.top.vietoris registry", () => {
  it("exposes a visible status string", () => {
    expect(MarkovOracles.top?.vietoris?.status).toMatch(/Kolmogorov.+supported.+Hewitt–Savage.+not/i);
  });

  it("does not register Hewitt–Savage helpers", () => {
    expect("hewittSavage" in (MarkovOracles.top?.vietoris ?? {})).toBe(false);
    expect("witness" in (MarkovOracles.top?.vietoris ?? {})).toBe(false);
    expect("check" in (MarkovOracles.top?.vietoris ?? {})).toBe(false);
  });
});
