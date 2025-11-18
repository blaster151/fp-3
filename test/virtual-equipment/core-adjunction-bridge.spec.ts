import { describe, it, expect } from "vitest";
import {
  buildCoreAdjunctionBridge,
  coreAdjunctionFromBridge,
  verifyCoreAdjunctionBridgeTriangles,
} from "../../virtual-equipment/core-adjunction-bridge";
import type { CoreAdjunction, CoreFunctor } from "../../stdlib/category";
import { describeTrivialRelativeAdjunction } from "../../relative/relative-adjunctions";
import { virtualizeFiniteCategory } from "../../virtual-equipment/adapters";
import { TwoObjectCategory, type TwoObject } from "../../two-object-cat";

type IdentityFunctor = CoreFunctor<TwoObject, TwoObject>;

describe("core adjunction bridge", () => {
  const identityFunctor: IdentityFunctor = {
    onObj: (object) => object,
    onMor: (arrow) => arrow,
  };

  const identityAdjunction: CoreAdjunction<
    TwoObject,
    TwoObject,
    IdentityFunctor,
    IdentityFunctor
  > = {
    F: identityFunctor,
    U: identityFunctor,
    unit: {
      at: (object: unknown) => ({ kind: "unit", object }),
    },
    counit: {
      at: (object: unknown) => ({ kind: "counit", object }),
    },
  };

  it("wraps relative adjunction data with a core adjunction", () => {
    const equipment = virtualizeFiniteCategory(TwoObjectCategory);
    const relative = describeTrivialRelativeAdjunction(equipment, "•");

    const bridge = buildCoreAdjunctionBridge(identityAdjunction, relative);
    expect(bridge.core).toBe(identityAdjunction);
    expect(bridge.relative).toBe(relative);
    expect(bridge.details.length).toBeGreaterThan(0);

    const triangles = verifyCoreAdjunctionBridgeTriangles(bridge, {
      sampleCObjects: ["•" as TwoObject],
      sampleDObjects: ["★" as TwoObject],
    });
    expect(triangles.bothPass).toBe(true);
  });

  it("recovers the original core adjunction from the bridge", () => {
    const equipment = virtualizeFiniteCategory(TwoObjectCategory);
    const relative = describeTrivialRelativeAdjunction(equipment, "★");
    const bridge = buildCoreAdjunctionBridge(identityAdjunction, relative);

    expect(coreAdjunctionFromBridge(bridge)).toBe(identityAdjunction);
  });
});
