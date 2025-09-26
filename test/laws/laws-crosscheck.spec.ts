import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MarkovOracles } from "../../markov-oracles";

const laws = readFileSync(new URL("../../LAWS.md", import.meta.url), "utf-8");
const guidelines = readFileSync(
  new URL("../../AI_MATHEMATICAL_IMPL_GUIDELINES.md", import.meta.url),
  "utf-8",
);

describe("LAWS.md ↔ oracle registry cross-check", () => {
  it("documents Top/Vietoris limitations", () => {
    expect(laws).toMatch(/Top\/Vietoris[^]*Hewitt–Savage[^]*not supported/i);
    expect(laws).toMatch(/\*\*Registry Path:\*\*\s*`top\.vietoris`/);
  });

  it("documents Borel zero–one adapters", () => {
    expect(laws).toMatch(/\*\*Registry Path:\*\*\s*`zeroOne\.borel`/);
    expect(laws).toMatch(/\*\*Registry Path:\*\*\s*`zeroOne\.borelHewittSavage`/);
  });

  it("has a zeroOne namespace registered", () => {
    expect(MarkovOracles.zeroOne).toBeTruthy();
  });

  it("keeps the implementation roadmap note about non-causal categories", () => {
    expect(guidelines).toMatch(/Implementation Roadmap for New Categories/);
    expect(guidelines).toMatch(/If a category is not causal[^]*explicit throwing stubs/i);
  });
});
