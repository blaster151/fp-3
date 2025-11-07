import { describe, expect, it } from "vitest";

import {
  analyzeIndexedContainerRelativeMonad,
  describeIndexedContainerExample4Witness,
  type IndexedContainerRelativeMonadWitness,
} from "../../relative/mnne-indexed-container-monads";

describe("MNNE Example 4 indexed container relative monad", () => {
  it("verifies the canonical witness", () => {
    const witness = describeIndexedContainerExample4Witness();
    const report = analyzeIndexedContainerRelativeMonad(witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.summaries.length).toBeGreaterThan(0);
  });

  it("detects an inconsistent extractor", () => {
    const witness = describeIndexedContainerExample4Witness();
    const tampered = {
      ...witness,
      extractValue: () => "not-present",
    };
    const report = analyzeIndexedContainerRelativeMonad(tampered);
    expect(report.holds).toBe(false);
    expect(report.issues.some((issue) => issue.includes("not available"))).toBe(true);
  });

  it("supports substitution rules with context reindexing", () => {
    const witness: IndexedContainerRelativeMonadWitness = {
      indices: ["Outer", "Inner"],
      shapes: [
        {
          index: "Outer",
          shape: "shift",
          positions: [{ position: "focus", targetIndex: "Inner" }],
        },
        {
          index: "Outer",
          shape: "reindexed",
          positions: [{ position: "result", targetIndex: "Outer" }],
        },
        {
          index: "Inner",
          shape: "leaf",
          positions: [{ position: "payload", targetIndex: "Inner" }],
        },
      ],
      families: [
        {
          label: "mirror",
          components: [
            { index: "Outer", values: ["a", "b"] },
            { index: "Inner", values: ["a", "b"] },
          ],
        },
      ],
      substitutions: [
        {
          index: "Outer",
          domainShape: "shift",
          bindings: [
            {
              position: "focus",
              binder: "focus",
              reindexTargets: [{ from: "Inner", to: "Outer" }],
            },
          ],
          resultShape: { kind: "constant", shape: "reindexed" },
          assignments: [
            {
              position: "result",
              targetIndex: "Outer",
              expression: { kind: "bindingAssignment", binder: "focus", position: "payload" },
            },
          ],
        },
        {
          index: "Outer",
          domainShape: "reindexed",
          bindings: [{ position: "result", binder: "result" }],
          resultShape: { kind: "binding", binder: "result" },
          assignments: [
            {
              position: "result",
              targetIndex: "Outer",
              expression: { kind: "bindingAssignment", binder: "result", position: "result" },
            },
          ],
        },
        {
          index: "Inner",
          domainShape: "leaf",
          bindings: [{ position: "payload", binder: "payload" }],
          resultShape: { kind: "binding", binder: "payload" },
          assignments: [
            {
              position: "payload",
              targetIndex: "Inner",
              expression: { kind: "bindingAssignment", binder: "payload", position: "payload" },
            },
          ],
        },
      ],
      unit: (family, element) => {
        switch (element.index) {
          case "Outer":
            return {
              index: "Outer",
              shape: "shift",
              assignments: Object.freeze([
                { position: "focus", targetIndex: "Inner", value: element.value },
              ]),
            };
          case "Inner":
            return {
              index: "Inner",
              shape: "leaf",
              assignments: Object.freeze([
                { position: "payload", targetIndex: "Inner", value: element.value },
              ]),
            };
          default:
            throw new Error(`Unsupported index ${element.index} in family ${family.label}`);
        }
      },
      extractValue: (element) => {
        switch (element.index) {
          case "Outer": {
            if (element.shape === "shift") {
              const assignment = element.assignments.find((entry) => entry.position === "focus");
              if (!assignment) {
                throw new Error("Outer shift element must provide focus");
              }
              return assignment.value;
            }
            if (element.shape === "reindexed") {
              const assignment = element.assignments.find((entry) => entry.position === "result");
              if (!assignment) {
                throw new Error("Outer reindexed element must provide result");
              }
              return assignment.value;
            }
            throw new Error(`Unexpected Outer shape ${element.shape}`);
          }
          case "Inner": {
            const assignment = element.assignments.find((entry) => entry.position === "payload");
            if (!assignment) {
              throw new Error("Inner element must provide payload");
            }
            return assignment.value;
          }
          default:
            throw new Error(`Unsupported index ${element.index}`);
        }
      },
    };

    const report = analyzeIndexedContainerRelativeMonad(witness);
    expect(report.holds).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it("validates composition-based result shape selection", () => {
    const witness = describeIndexedContainerExample4Witness();
    const tampered = {
      ...witness,
      substitutions: (witness.substitutions ?? []).map((rule) => {
        if (rule.index === "Stream" && rule.domainShape === "sigmaCons") {
          return {
            ...rule,
            resultShape: { kind: "composition" as const, cases: [] as const },
          };
        }
        return rule;
      }),
    };
    const report = analyzeIndexedContainerRelativeMonad(tampered);
    expect(report.holds).toBe(false);
    expect(
      report.issues.some((issue) =>
        issue.includes("must specify at least one composition case"),
      ),
    ).toBe(true);
  });
});

