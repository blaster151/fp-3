import type {
  BialgebraStructure,
  HopfAlgebraStructure,
  HopfAntipodeConvolutionComparisons,
  HopfAntipodeDiagnostics,
  HopfAntipodeDerivedOptions,
  HopfAntipodePropertySampling,
} from "./coalgebra-interfaces"
import { analyzeHopfAntipode } from "./coalgebra-interfaces"

/**
 * Convolution product on endomorphisms of a Hopf algebra's underlying object.
 * The multiplication μ and comultiplication Δ are combined using the ambient
 * tensor structure to evaluate (f * g) = μ ∘ (f ⊗ g) ∘ Δ.
 */
export const convolveHopfMorphisms = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
  left: M,
  right: M,
): M => {
  const tensored = bialgebra.tensor.onMorphisms(left, right)
  const afterCopy = bialgebra.category.compose(tensored, bialgebra.comonoid.copy)
  return bialgebra.category.compose(bialgebra.algebra.multiply, afterCopy)
}

/**
 * The convolution identity η ∘ ε induced by the unit and counit of a Hopf
 * algebra. This serves as the neutral element for the convolution product.
 */
export const buildHopfConvolutionIdentity = <O, M>(
  bialgebra: BialgebraStructure<O, M>,
): M => bialgebra.category.compose(bialgebra.algebra.unit, bialgebra.comonoid.discard)

export interface HopfAntipodeConvolutionOptions<
  O,
  M,
  Grade = unknown,
  Trace = unknown,
  Sample = unknown,
> {
  readonly expected?: M
  readonly leftPair?: readonly [M, M]
  readonly rightPair?: readonly [M, M]
  readonly derived?: HopfAntipodeDerivedOptions<O, M, Grade, Trace>
  readonly propertySampling?: HopfAntipodePropertySampling<M, Sample>
}

/**
 * Populate the raw convolution comparisons required to analyze the antipode
 * laws. By default this uses (S, id) and (id, S) against the convolution
 * identity, while still allowing callers to override the morphism pairs or the
 * expected identity when specialized data is available.
 */
export const buildHopfAntipodeConvolutionComparisons = <
  O,
  M,
  Grade = unknown,
  Trace = unknown,
  Sample = unknown,
>(
  hopf: HopfAlgebraStructure<O, M>,
  options: HopfAntipodeConvolutionOptions<O, M, Grade, Trace, Sample> = {},
): HopfAntipodeConvolutionComparisons<M> => {
  const identityArrow = hopf.category.id(hopf.algebra.object)
  const leftPair = options.leftPair ?? [hopf.antipode, identityArrow] as const
  const rightPair = options.rightPair ?? [identityArrow, hopf.antipode] as const
  const expected = options.expected ?? buildHopfConvolutionIdentity(hopf)

  const [leftFirst, leftSecond] = leftPair
  const [rightFirst, rightSecond] = rightPair

  const leftActual = convolveHopfMorphisms(hopf, leftFirst, leftSecond)
  const rightActual = convolveHopfMorphisms(hopf, rightFirst, rightSecond)

  return {
    left: { actual: leftActual, expected },
    right: { actual: rightActual, expected },
  }
}

/**
 * Convenience wrapper that computes the convolution composites for the
 * antipode laws and immediately analyzes them using the Hopf algebra's ambient
 * morphism equality.
 */
export const analyzeHopfAntipodeViaConvolution = <
  O,
  M,
  Grade = unknown,
  Trace = unknown,
  Sample = unknown,
>(
  hopf: HopfAlgebraStructure<O, M>,
  options: HopfAntipodeConvolutionOptions<O, M, Grade, Trace, Sample> = {},
): HopfAntipodeDiagnostics<M, Grade, Trace> =>
  analyzeHopfAntipode(
    hopf,
    buildHopfAntipodeConvolutionComparisons(hopf, options),
    options.derived,
  )
