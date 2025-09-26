import type { FiniteCategory } from "./finite-cat";

function describeArrow<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): string {
  const name = (arrow as { name?: unknown }).name;
  const label = typeof name === "string" ? name : String(arrow);
  return `${label}:${String(base.src(arrow))}→${String(base.dst(arrow))}`;
}

export function explainSliceMismatch<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  mediating: Arr,
  expected: Arr,
  target: Arr,
): string {
  const lhs = base.compose(target, mediating);
  return [
    "Slice mismatch: expected target ∘ mediating = expected",
    `  mediating = ${describeArrow(base, mediating)}`,
    `  target    = ${describeArrow(base, target)}`,
    `  expected  = ${describeArrow(base, expected)}`,
    `  target∘mediating = ${describeArrow(base, lhs)}`,
  ].join("\n");
}

export function explainCoSliceMismatch<Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  mediating: Arr,
  source: Arr,
  expected: Arr,
): string {
  const lhs = base.compose(mediating, source);
  return [
    "Coslice mismatch: expected mediating ∘ source = expected",
    `  mediating = ${describeArrow(base, mediating)}`,
    `  source    = ${describeArrow(base, source)}`,
    `  expected  = ${describeArrow(base, expected)}`,
    `  mediating∘source = ${describeArrow(base, lhs)}`,
  ].join("\n");
}
