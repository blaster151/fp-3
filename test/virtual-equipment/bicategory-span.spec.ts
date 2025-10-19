import { describe, it, expect } from "vitest";
import {
  makeFiniteSpanBicategory,
  createFiniteSpan,
  type FiniteSet,
} from "../../virtual-equipment/bicategory-adapters";
import {
  EquipmentOracles,
  buildEquipmentOracleContext,
  summarizeEquipmentOracles,
} from "../../virtual-equipment/equipment-oracles";

const makeSet = (...elements: string[]): FiniteSet => elements;

describe("finite span bicategory coherence", () => {
  it("satisfies the pentagon and triangle identities", () => {
    const a = makeSet("a0", "a1");
    const b = makeSet("b0", "b1", "b2");
    const c = makeSet("c0", "c1", "c2");
    const d = makeSet("d0", "d1");
    const e = makeSet("e0", "e1", "e2");

    const bicategory = makeFiniteSpanBicategory([a, b, c, d, e]);
    const { equipment } = bicategory;

    const f = createFiniteSpan(a, b, [0, 0, 1], [0, 1, 2]);
    const g = createFiniteSpan(b, c, [0, 1, 2], [0, 0, 1]);
    const h = createFiniteSpan(c, d, [0, 1, 1], [0, 0, 1]);
    const k = createFiniteSpan(d, e, [0, 1, 1], [1, 1, 2]);

    const baseContext = buildEquipmentOracleContext(equipment, { object: a });
    const context = {
      ...baseContext,
      bicategory: {
        instance: bicategory,
        pentagon: { f, g, h, k },
        triangle: { f, g },
      },
    };

    const pentagon = EquipmentOracles.bicategory.pentagon(context);
    expect(pentagon.pending).toBe(false);
    expect(pentagon.holds).toBe(true);
    expect(pentagon.analysis?.issues ?? []).toEqual([]);

    const triangle = EquipmentOracles.bicategory.triangle(context);
    expect(triangle.pending).toBe(false);
    expect(triangle.holds).toBe(true);
    expect(triangle.analysis?.issues ?? []).toEqual([]);

    const summary = summarizeEquipmentOracles(context);
    expect(summary.bicategory.pentagon.holds).toBe(true);
    expect(summary.bicategory.triangle.holds).toBe(true);
  });
});
