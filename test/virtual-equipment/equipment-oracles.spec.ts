import { describe, expect, test } from "vitest";
import {
  EquipmentOracles,
  buildEquipmentOracleContext,
  enumerateEquipmentOracles,
  summarizeEquipmentOracles,
} from "../../virtual-equipment/equipment-oracles";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import { TwoObjectCategory } from "../../two-object-cat";

const makeIdentityContext = () => {
  const equipment = virtualizeFiniteCategory(TwoObjectCategory);
  return buildEquipmentOracleContext(equipment);
};

describe("virtual equipment law oracles", () => {
  test("identity equipment satisfies all registered oracles", () => {
    const context = makeIdentityContext();
    const results = enumerateEquipmentOracles(context);
    expect(results).not.toHaveLength(0);
    for (const result of results) {
      expect(result.pending).toBe(false);
      expect(result.holds).toBe(true);
    }
  });

  test("summary aggregates oracle outputs", () => {
    const context = makeIdentityContext();
    const summary = summarizeEquipmentOracles(context);
    expect(summary.overall).toBe(true);
    expect(summary.extensions.rightExtension.holds).toBe(true);
    expect(summary.weighted.leftExtension.pending).toBe(false);
  });

  test("maps oracle reports when representability witness is absent", () => {
    const context = makeIdentityContext();
    const witnessFreeContext = {
      ...context,
      maps: {
        adjunction: {
          left: context.maps.adjunction.left,
          right: context.maps.adjunction.right,
          unit: context.maps.adjunction.unit,
          counit: context.maps.adjunction.counit,
        },
      },
    };
    const result = EquipmentOracles.maps.representableRight(
      witnessFreeContext,
    );
    expect(result.holds).toBe(false);
    expect(result.pending).toBe(false);
  });
});
