import type { FiniteCategory } from "./finite-cat";
import type {
  Coalgebra,
  CoalgebraMorphism,
  ComonadStructure,
} from "./operations/coalgebra/coalgebra-interfaces";
import type {
  CoalgebraCoassociativityWitness,
  CoalgebraCounitWitness,
  CoalgebraMorphismCoherenceWitness,
} from "./operations/coalgebra/coalgebra-witnesses";

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

type CounterexampleCapable<Obj, Arr> = FiniteCategory<Obj, Arr> & {
  readonly counterexample?: (
    left: Arr,
    right: Arr,
  ) => { readonly pretty?: string } | null
}

const inverseEquationLabel = (kind: "left" | "right"): "g∘f" | "f∘g" =>
  kind === "left" ? "g∘f" : "f∘g"

export const describeInverseEquation = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  forward: Arr,
  candidate: Arr,
  kind: "left" | "right",
): string => {
  const composite =
    kind === "left"
      ? base.compose(candidate, forward)
      : base.compose(forward, candidate)
  const identity = kind === "left" ? base.id(base.src(forward)) : base.id(base.dst(forward))
  const identityName = kind === "left" ? `id_${String(base.src(forward))}` : `id_${String(base.dst(forward))}`
  return [
    `${inverseEquationLabel(kind)} = ${describeArrow(base, composite)}`,
    `${identityName} = ${describeArrow(base, identity)}`,
  ].join(" | ")
}

export const checkInverseEquation = <Obj, Arr>(
  base: FiniteCategory<Obj, Arr>,
  forward: Arr,
  candidate: Arr,
  kind: "left" | "right",
): { readonly ok: boolean; readonly msg: string } => {
  const composite =
    kind === "left"
      ? base.compose(candidate, forward)
      : base.compose(forward, candidate)
  const identity = kind === "left" ? base.id(base.src(forward)) : base.id(base.dst(forward))
  if (base.eq(composite, identity)) {
    return { ok: true, msg: "" }
  }

  const enriched = base as CounterexampleCapable<Obj, Arr>
  const witness = enriched.counterexample?.(composite, identity)
  const detail = witness?.pretty ?? describeInverseEquation(base, forward, candidate, kind)
  const identityName = kind === "left" ? `id_${String(base.src(forward))}` : `id_${String(base.dst(forward))}`
  const prefix = `${inverseEquationLabel(kind)} ≠ ${identityName}`
  return { ok: false, msg: `${prefix}. ${detail}` }
}

const describeNamed = (value: unknown): string => {
  const name = (value as { readonly name?: unknown })?.name
  if (typeof name === "string" && name.length > 0) {
    return name
  }
  return String(value)
}

export const describeCoalgebraCounitFailure = <O, M>(
  _comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
  witness: CoalgebraCounitWitness<M>,
): string => {
  const carrier = describeNamed(coalgebra.object)
  return [
    `Counit law failed for ${carrier}.`,
    `ε ∘ α = ${describeNamed(witness.composite)}`,
    `id = ${describeNamed(witness.identity)}`,
  ].join(" ")
}

export const describeCoalgebraCoassociativityFailure = <O, M>(
  _comonad: ComonadStructure<O, M>,
  coalgebra: Coalgebra<O, M>,
  witness: CoalgebraCoassociativityWitness<M>,
): string => {
  const carrier = describeNamed(coalgebra.object)
  return [
    `Coassociativity failed for ${carrier}.`,
    `δ ∘ α = ${describeNamed(witness.left)}`,
    `Wα ∘ α = ${describeNamed(witness.right)}`,
  ].join(" ")
}

export const describeCoalgebraMorphismFailure = <O, M>(
  _comonad: ComonadStructure<O, M>,
  morphism: CoalgebraMorphism<O, M>,
  witness: CoalgebraMorphismCoherenceWitness<M>,
): string => {
  const arrow = describeNamed(morphism.morphism)
  const source = describeNamed(morphism.source.object)
  const target = describeNamed(morphism.target.object)
  return [
    `Coalgebra morphism coherence failed for ${arrow}: ${source} → ${target}.`,
    `Wf ∘ α = ${describeNamed(witness.left)}`,
    `β ∘ f = ${describeNamed(witness.right)}`,
  ].join(" ")
}
