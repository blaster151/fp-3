import type { FiniteCategory } from "./finite-cat";
import type {
  Coalgebra,
  CoalgebraMorphism,
  ComonadStructure,
  HopfAlgebraStructure,
} from "./operations/coalgebra/coalgebra-interfaces";
import {
  BIALGEBRA_COMPATIBILITY_COMPONENTS,
  type BialgebraStructure,
  type BialgebraCompatibilityComponent,
} from "./operations/coalgebra/coalgebra-interfaces";
import type {
  CoalgebraCoassociativityWitness,
  CoalgebraCounitWitness,
  CoalgebraMorphismCoherenceWitness,
  HopfAntipodeConvolutionWitness,
  BialgebraCompatibilityWitnesses,
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

export const describeHopfAntipodeFailure = <O, M>(
  hopf: HopfAlgebraStructure<O, M>,
  side: "left" | "right",
  witness: HopfAntipodeConvolutionWitness<M>,
): string => {
  const carrier = describeNamed(hopf.algebra.object)
  const operation = side === "left" ? "S * id" : "id * S"
  return [
    `Hopf antipode ${side} convolution failed on ${carrier}.`,
    `${operation} = ${describeNamed(witness.actual)}`,
    `η ∘ ε = ${describeNamed(witness.expected)}`,
  ].join(" ")
}

export const describeBialgebraCompatibilityFailure = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  component: BialgebraCompatibilityComponent,
  witness: BialgebraCompatibilityWitnesses<M>[BialgebraCompatibilityComponent],
): string => {
  const carrier = describeNamed(bialgebra.algebra.object)
  const label =
    component === "multiplication"
      ? "Δ ∘ μ"
      : component === "unit"
        ? "Δ ∘ η"
        : "ε ∘ μ"
  const expected =
    component === "multiplication"
      ? "(μ ⊗ μ) ∘ (id ⊗ τ ⊗ id) ∘ (Δ ⊗ Δ)"
      : component === "unit"
        ? "η ⊗ η"
        : "ε ⊗ ε"
  return [
    `Bialgebra ${component} compatibility failed on ${carrier}.`,
    `${label} = ${describeNamed(witness.left)}`,
    `${expected} = ${describeNamed(witness.right)}`,
  ].join(" ")
}

const compatibilityPresentation = (component: BialgebraCompatibilityComponent) => {
  switch (component) {
    case "multiplication":
      return {
        label: "multiplication",
        actual: "Δ ∘ μ",
        expected: "(μ ⊗ μ) ∘ (id ⊗ τ ⊗ id) ∘ (Δ ⊗ Δ)",
      } as const
    case "unit":
      return {
        label: "unit",
        actual: "Δ ∘ η",
        expected: "η ⊗ η",
      } as const
    case "counit":
      return {
        label: "counit",
        actual: "ε ∘ μ",
        expected: "ε ⊗ ε",
      } as const
    default: {
      const _exhaustive: never = component
      return _exhaustive
    }
  }
}

export interface BialgebraCompatibilitySummaryComponent<M> {
  readonly component: BialgebraCompatibilityComponent
  readonly label: string
  readonly holds: boolean
  readonly actual: {
    readonly label: string
    readonly value: M
    readonly rendered: string
  }
  readonly expected: {
    readonly label: string
    readonly value: M
    readonly rendered: string
  }
}

export type BialgebraCompatibilitySummaryIndex<M> = {
  readonly [Key in BialgebraCompatibilityComponent]: BialgebraCompatibilitySummaryComponent<M>
}

export interface BialgebraCompatibilitySummary<M> {
  readonly carrier: string
  readonly headline: string
  readonly overall: boolean
  readonly components: readonly BialgebraCompatibilitySummaryComponent<M>[]
  readonly byComponent: BialgebraCompatibilitySummaryIndex<M>
}

export interface BialgebraCompatibilityFailure<M> {
  readonly component: BialgebraCompatibilityComponent
  readonly summary: BialgebraCompatibilitySummaryComponent<M>
  readonly message: string
}

const summarizeComponentData = <M>(
  diagnostics: BialgebraCompatibilityWitnesses<M>,
  component: BialgebraCompatibilityComponent,
): BialgebraCompatibilitySummaryComponent<M> => {
  const presentation = compatibilityPresentation(component)
  const witness = diagnostics[component]
  return {
    component,
    label: presentation.label,
    holds: witness.holds,
    actual: {
      label: presentation.actual,
      value: witness.left,
      rendered: describeNamed(witness.left),
    },
    expected: {
      label: presentation.expected,
      value: witness.right,
      rendered: describeNamed(witness.right),
    },
  }
}

export const collectBialgebraCompatibilitySummary = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  diagnostics: BialgebraCompatibilityWitnesses<M>,
): BialgebraCompatibilitySummary<M> => {
  const carrier = describeNamed(bialgebra.algebra.object)
  const headline = diagnostics.overall
    ? `Bialgebra compatibility for ${carrier}: all laws hold.`
    : `Bialgebra compatibility for ${carrier}: violations detected.`
  const components = BIALGEBRA_COMPATIBILITY_COMPONENTS.map((component) =>
    summarizeComponentData(diagnostics, component),
  )
  const byComponent = components.reduce(
    (index, componentSummary) => {
      index[componentSummary.component] = componentSummary
      return index
    },
    Object.create(null) as Record<
      BialgebraCompatibilityComponent,
      BialgebraCompatibilitySummaryComponent<M>
    >,
  ) as BialgebraCompatibilitySummaryIndex<M>
  return {
    carrier,
    headline,
    overall: diagnostics.overall,
    components,
    byComponent,
  }
}

export const collectBialgebraCompatibilityFailures = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  diagnostics: BialgebraCompatibilityWitnesses<M>,
): readonly BialgebraCompatibilityFailure<M>[] => {
  const summary = collectBialgebraCompatibilitySummary(bialgebra, diagnostics)
  const failures: BialgebraCompatibilityFailure<M>[] = []
  for (const componentSummary of summary.components) {
    if (!componentSummary.holds) {
      failures.push({
        component: componentSummary.component,
        summary: componentSummary,
        message: describeBialgebraCompatibilityFailure(
          bialgebra,
          componentSummary.component,
          diagnostics[componentSummary.component],
        ),
      })
    }
  }
  return failures
}

const renderComponentSummary = <M>(
  component: BialgebraCompatibilitySummaryComponent<M>,
): string => {
  if (component.holds) {
    return `- ${component.label} law holds: ${component.actual.label} = ${component.expected.label} = ${component.actual.rendered}`
  }
  return `- ${component.label} law fails: ${component.actual.label} = ${component.actual.rendered}, ${component.expected.label} = ${component.expected.rendered}`
}

export const summarizeBialgebraCompatibility = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  diagnostics: BialgebraCompatibilityWitnesses<M>,
): string => {
  const summary = collectBialgebraCompatibilitySummary(bialgebra, diagnostics)
  const lines = [summary.headline, ...summary.components.map(renderComponentSummary)]
  return lines.join("\n")
}
