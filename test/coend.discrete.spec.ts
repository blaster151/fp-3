import { describe, expect, it } from "vitest";

import { computeDiscreteCoend, computeDiscreteEnd, type DiscreteBifunctorInput } from "../coend";
import type { SimpleCat } from "../simple-cat";

type Obj = "A" | "B";

type Arrow =
  | { readonly kind: "id"; readonly source: Obj; readonly target: Obj }
  | { readonly kind: "f"; readonly source: Obj; readonly target: Obj };

const id = (object: Obj): Arrow => ({ kind: "id", source: object, target: object });

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.target !== g.source) {
    throw new Error(`compose: codomain/domain mismatch for ${f.kind} then ${g.kind}`);
  }
  if (f.kind === "id") {
    return g;
  }
  if (g.kind === "id") {
    return f;
  }
  throw new Error(`compose: unsupported composition ${f.kind} then ${g.kind}`);
};

const category: SimpleCat<Obj, Arrow> = {
  id,
  compose,
  src: (arrow) => arrow.source,
  dst: (arrow) => arrow.target,
};

const arrows: ReadonlyArray<Arrow> = [id("A"), id("B"), { kind: "f", source: "A", target: "B" }];

const evaluate = (left: Obj, right: Obj): ReadonlyArray<string> => {
  if (left === "A" && right === "A") {
    return ["alpha", "beta"];
  }
  if (left === "B" && right === "B") {
    return ["gamma"];
  }
  if (left === "A" && right === "B") {
    return ["delta0", "delta1"];
  }
  if (left === "B" && right === "A") {
    return ["epsilon", "zeta"];
  }
  return [];
};

const valueKey = (left: Obj, right: Obj, value: string): string => `${left}|${right}|${value}`;
const objectKey = (object: Obj): string => object;

const actOnLeft = (arrow: Arrow, right: Obj, value: string): string => {
  if (arrow.kind === "id") {
    return value;
  }
  if (arrow.kind === "f") {
    if (right === "A") {
      if (value === "epsilon") {
        return "alpha";
      }
      if (value === "zeta") {
        return "beta";
      }
    }
    if (right === "B") {
      if (value === "gamma") {
        return "delta0";
      }
    }
  }
  throw new Error(`actOnLeft: unsupported (${arrow.kind}, ${right}, ${value})`);
};

const actOnRight = (left: Obj, arrow: Arrow, value: string): string => {
  if (arrow.kind === "id") {
    return value;
  }
  if (arrow.kind === "f") {
    if (left === "B") {
      if (value === "epsilon" || value === "zeta") {
        return "gamma";
      }
    }
    if (left === "A") {
      if (value === "alpha") {
        return "delta0";
      }
      if (value === "beta") {
        return "delta1";
      }
    }
  }
  throw new Error(`actOnRight: unsupported (${left}, ${arrow.kind}, ${value})`);
};

const bifunctor: DiscreteBifunctorInput<Obj, Arrow, string> = {
  category,
  objects: ["A", "B"],
  arrows,
  evaluate,
  valueKey,
  objectKey,
  actOnLeft,
  actOnRight,
};

describe("Discrete (co)end helpers", () => {
  it("computes the discrete coend classes and diagnostics", () => {
    const result = computeDiscreteCoend(bifunctor);

    expect(result.diagnostics.holds).toBe(true);
    expect(result.diagnostics.diagonalCount).toBe(3);
    expect(result.diagnostics.relationCount).toBe(2);
    expect(result.diagnostics.missingDiagonalWitnesses).toEqual([]);

    expect(result.classes).toHaveLength(1);
    expect(result.classes[0]?.members).toEqual([
      { object: "A", value: "alpha" },
      { object: "A", value: "beta" },
      { object: "B", value: "gamma" },
    ]);

    const classified = result.classify({ object: "A", value: "alpha" });
    expect(classified?.members).toEqual(result.classes[0]?.members);
  });

  it("computes the discrete end assignments and diagnostics", () => {
    const result = computeDiscreteEnd(bifunctor);

    expect(result.diagnostics.enumeratedCandidates).toBe(2);
    expect(result.diagnostics.compatibleCandidates).toBe(1);
    expect(result.diagnostics.truncated).toBe(false);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]?.components).toEqual([
      { object: "A", value: "alpha" },
      { object: "B", value: "gamma" },
    ]);

    expect(result.diagnostics.failures).toHaveLength(1);
    const failure = result.diagnostics.failures[0];
    expect(failure?.arrow).toEqual({ kind: "f", source: "A", target: "B" });
    expect(failure?.source).toEqual({ object: "A", value: "beta" });
    expect(failure?.target).toEqual({ object: "B", value: "gamma" });
    expect(failure?.actualKey).toBe(valueKey("A", "B", "delta1"));
    expect(failure?.expectedKey).toBe(valueKey("A", "B", "delta0"));
  });
});
