import { describe, it, expect } from "vitest";
import { createContRegistry } from "../ContRegistry";
import { registerContinuityPacks } from "../cont_packs";

function buildRegistry() {
  const registry = createContRegistry();
  registerContinuityPacks(registry);
  return registry;
}

describe("Continuous-map registry", () => {
  it("all registered maps are continuous", () => {
    const registry = buildRegistry();
    const report = registry.runAll();
    const summary = registry.summarize(report);
    if (summary.failures > 0) {
      // eslint-disable-next-line no-console
      console.error("Continuity failures:", report.filter((entry) => !entry.holds || !entry.verified));
    }
    expect(summary.failures).toBe(0);
    expect(summary.total).toBe(report.length);
    const markdown = registry.toMarkdown(report);
    expect(markdown).toContain("| Tag |");
    const json = registry.toJson(report);
    const parsed = JSON.parse(json) as { summary: { total: number } };
    expect(parsed.summary.total).toBe(report.length);
  });

  it("sanity: registry has entries", () => {
    const registry = buildRegistry();
    expect(registry.all().length).toBeGreaterThan(0);
  });

  it("exposes witness metadata for featured maps", () => {
    const registry = buildRegistry();
    const report = registry.runAll();
    const quotientClassifier = report.find((entry) => entry.tag === "Top/cont/quotient:classify-parity");
    expect(quotientClassifier?.witness?.preimages.length).toBeGreaterThan(0);
    const parityOpen = quotientClassifier?.witness?.preimages.find((record) => record.open.includes(0));
    expect(parityOpen?.preimage.length).toBe(1);
    expect(parityOpen?.preimage[0].includes(0)).toBe(true);

    const pullbackProj = report.find((entry) => entry.tag === "Top/cont/pullback:π₁");
    expect(pullbackProj?.failures.length).toBe(0);
    expect(pullbackProj?.witness?.note).toContain("computed");

    const constantComponents = report.find((entry) => entry.tag === "Top/cont/components:constant");
    const oneOpen = constantComponents?.witness?.preimages.find((record) => record.open.length === 1 && record.open[0] === 1);
    const sortedPreimage = oneOpen ? [...oneOpen.preimage].sort() : [];
    expect(sortedPreimage).toEqual([2, 3]);
  });
});
