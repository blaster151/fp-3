import { expect } from "vitest";
import type { FiniteCategory } from "../finite-cat";
import { explainSliceMismatch, explainCoSliceMismatch } from "../diagnostics";

export function expectSliceCommutes<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  mediating: Arr,
  expected: Arr,
  target: Arr,
): void {
  const lhs = base.compose(target, mediating);
  if (!base.eq(lhs, expected)) {
    throw new Error(explainSliceMismatch(base, mediating, expected, target));
  }
  expect(true).toBe(true);
}

export function expectCoSliceCommutes<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  mediating: Arr,
  source: Arr,
  expected: Arr,
): void {
  const lhs = base.compose(mediating, source);
  if (!base.eq(lhs, expected)) {
    throw new Error(explainCoSliceMismatch(base, mediating, source, expected));
  }
  expect(true).toBe(true);
}
