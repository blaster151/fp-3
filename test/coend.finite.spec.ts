import { describe, expect, it } from "vitest";

import { computeFiniteCoend, computeFiniteEnd, type FiniteBifunctorInput } from "../coend";
import type { FiniteCategory } from "../finite-cat";

type Obj = "apex" | "left" | "right";

type Arrow =
  | { readonly kind: "id"; readonly object: Obj }
  | { readonly kind: "f" }
  | { readonly kind: "g" };

const id = (object: Obj): Arrow => ({ kind: "id", object });

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.kind === "id") {
    return g;
  }
  if (g.kind === "id") {
    return f;
  }
  throw new Error(`compose: unsupported composition ${f.kind} then ${g.kind}`);
};

const src = (arrow: Arrow): Obj => {
  if (arrow.kind === "id") {
    return arrow.object;
  }
  return "apex";
};

const dst = (arrow: Arrow): Obj => {
  if (arrow.kind === "id") {
    return arrow.object;
  }
  if (arrow.kind === "f") {
    return "left";
  }
  return "right";
};

const objects: ReadonlyArray<Obj> = ["apex", "left", "right"];
const arrows: ReadonlyArray<Arrow> = [id("apex"), id("left"), id("right"), { kind: "f" }, { kind: "g" }];

const finiteCategory: FiniteCategory<Obj, Arrow> = {
  id,
  compose,
  src,
  dst,
  objects,
  arrows,
  eq: (x, y) => {
    if (x.kind !== y.kind) {
      return false;
    }
    if (x.kind === "id" && y.kind === "id") {
      return x.object === y.object;
    }
    return true;
  },
};

const evaluate = (left: Obj, right: Obj): ReadonlyArray<string> => {
  if (left === "apex" && right === "apex") {
    return ["s0", "s1"];
  }
  if (left === "left" && right === "left") {
    return ["l"];
  }
  if (left === "right" && right === "right") {
    return ["r"];
  }
  if (left === "left" && right === "apex") {
    return ["fiberLS0", "fiberLS1"];
  }
  if (left === "right" && right === "apex") {
    return ["fiberRS0"];
  }
  if (left === "apex" && right === "left") {
    return ["apexLeft0", "apexLeft1"];
  }
  if (left === "apex" && right === "right") {
    return ["apexRight0", "apexRightBad"];
  }
  return [];
};

const valueKey = (left: Obj, right: Obj, value: string): string => `${left}->${right}:${value}`;
const objectKey = (object: Obj): string => object;

const actOnLeft = (arrow: Arrow, right: Obj, value: string): string => {
  if (arrow.kind === "id") {
    return value;
  }
  if (arrow.kind === "f") {
    if (right === "apex") {
      if (value === "fiberLS0") {
        return "s0";
      }
      if (value === "fiberLS1") {
        return "s1";
      }
    }
    if (right === "left" && value === "l") {
      return "apexLeft0";
    }
  }
  if (arrow.kind === "g") {
    if (right === "apex" && value === "fiberRS0") {
      return "s1";
    }
    if (right === "right" && value === "r") {
      return "apexRight0";
    }
  }
  throw new Error(`actOnLeft: unsupported (${arrow.kind}, ${right}, ${value})`);
};

const actOnRight = (left: Obj, arrow: Arrow, value: string): string => {
  if (arrow.kind === "id") {
    return value;
  }
  if (arrow.kind === "f") {
    if (left === "left") {
      if (value === "fiberLS0" || value === "fiberLS1") {
        return "l";
      }
    }
    if (left === "apex") {
      if (value === "s0") {
        return "apexLeft0";
      }
      if (value === "s1") {
        return "apexLeft1";
      }
    }
  }
  if (arrow.kind === "g") {
    if (left === "right" && value === "fiberRS0") {
      return "missing-right";
    }
    if (left === "apex") {
      if (value === "s0") {
        return "apexRight0";
      }
      if (value === "s1") {
        return "apexRightBad";
      }
    }
  }
  throw new Error(`actOnRight: unsupported (${left}, ${arrow.kind}, ${value})`);
};

const bifunctor: FiniteBifunctorInput<Obj, Arrow, string> = {
  category: finiteCategory,
  evaluate,
  valueKey,
  objectKey,
  actOnLeft,
  actOnRight,
};

describe("Finite (co)end helpers", () => {
  it("computes finite coend classes with diagnostics", () => {
    const result = computeFiniteCoend(bifunctor);

    expect(result.diagnostics.holds).toBe(false);
    expect(result.diagnostics.diagonalCount).toBe(4);
    expect(result.diagnostics.relationCount).toBe(6);
    expect(result.diagnostics.missingDiagonalWitnesses).toEqual([
      { side: "right", arrow: { kind: "g" }, object: "right", value: "missing-right" },
    ]);

    expect(result.classes).toHaveLength(2);
    expect(result.classes[0]?.members).toEqual([
      { object: "apex", value: "s0" },
      { object: "apex", value: "s1" },
      { object: "left", value: "l" },
    ]);
    expect(result.classes[1]?.members).toEqual([{ object: "right", value: "r" }]);
  });

  it("computes finite end assignments and diagnostics", () => {
    const result = computeFiniteEnd(bifunctor);

    expect(result.diagnostics.enumeratedCandidates).toBe(2);
    expect(result.diagnostics.compatibleCandidates).toBe(1);
    expect(result.diagnostics.truncated).toBe(false);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]?.components).toEqual([
      { object: "apex", value: "s0" },
      { object: "left", value: "l" },
      { object: "right", value: "r" },
    ]);

    expect(result.diagnostics.failures).toHaveLength(1);
    const failure = result.diagnostics.failures[0];
    expect(failure?.arrow).toEqual({ kind: "f" });
    expect(failure?.source).toEqual({ object: "apex", value: "s1" });
    expect(failure?.target).toEqual({ object: "left", value: "l" });
    expect(failure?.actualKey).toBe(valueKey("apex", "left", "apexLeft1"));
    expect(failure?.expectedKey).toBe(valueKey("apex", "left", "apexLeft0"));
  });
});
