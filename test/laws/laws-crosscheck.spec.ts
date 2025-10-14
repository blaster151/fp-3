import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const fileUrlToPath = (input: URL): string => {
  if (input.protocol !== "file:") {
    throw new Error(`Unsupported protocol for fileUrlToPath: ${input.protocol}`);
  }

  const decoded = decodeURIComponent(input.pathname);
  if (/^\/[A-Za-z]:/.test(decoded)) {
    return decoded.slice(1).replace(/\//g, "\\");
  }
  return decoded;
};
import { MarkovOracles } from "../../markov-oracles";

const lawsPath = fileUrlToPath(new URL("../../LAWS.md", import.meta.url));
const guidelinesPath = fileUrlToPath(new URL("../../AI_MATHEMATICAL_IMPL_GUIDELINES.md", import.meta.url));

const laws = readFileSync(lawsPath, "utf-8");
const guidelines = readFileSync(guidelinesPath, "utf-8");

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
