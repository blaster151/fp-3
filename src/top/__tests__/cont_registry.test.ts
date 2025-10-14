import { describe, it, expect } from "vitest";
import "../cont_packs";
import { allCont, runContAll } from "../ContRegistry";

describe("Continuous-map registry", () => {
  it("all registered maps are continuous", () => {
    const report = runContAll();
    const failures = report.filter((entry) => !entry.ok);
    if (failures.length > 0) {
      // eslint-disable-next-line no-console
      console.error("Continuity failures:", failures);
    }
    expect(failures.length).toBe(0);
  });

  it("sanity: registry has entries", () => {
    expect(allCont().length).toBeGreaterThan(0);
  });
});
