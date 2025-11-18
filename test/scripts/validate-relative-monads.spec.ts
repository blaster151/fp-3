import { describe, expect, it } from "vitest";

import { run } from "../../scripts/validate-relative-monads";
import { RelativeMonadLawRegistry } from "../../relative/relative-laws";

describe("validate-relative-monads", () => {
  it("enumerates Street presentations from the registry", async () => {
    const logs: string[] = [];
    const writes: Array<{ path: string; content: string }> = [];

    const result = await run({
      aggregatedJsonPath: "reports/rollup.json",
      cwd: "/tmp/validate-relative-monads",
      log: (line) => {
        logs.push(line);
      },
      writeFile: async (path, content) => {
        writes.push({ path, content });
      },
    });

    expect(result.aggregated?.registryPath).toBe(
      RelativeMonadLawRegistry.polynomialStreetRollupAggregation.registryPath,
    );
    expect(logs.some((line) => line.includes("TODO"))).toBe(false);
    expect(logs[0]).toContain("loading Street presentations from registry");

    expect(writes).toHaveLength(1);
    const [write] = writes;
    expect(write.path).toBe(
      "/tmp/validate-relative-monads/reports/rollup.json",
    );

    const payload = JSON.parse(write.content) as { registryPath: string };
    expect(payload.registryPath).toBe(
      RelativeMonadLawRegistry.polynomialStreetRollupAggregation.registryPath,
    );
  });
});

