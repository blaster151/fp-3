import type { FiniteCategory as FiniteCategoryT } from "../finite-cat"
import type {
  PullbackCalculator,
  PullbackCertification,
  PullbackConeFactorResult,
  PullbackData,
} from "../pullback"
import type { PushoutData } from "../pushout"
import { isIso } from "../kinds/inverses"
import { DiagramClosure } from "./diagram-closure"
import type { SmallCategory } from "../subcategory"
import {
  checkBinaryProductComponentwiseCollapse as checkBinaryProductComponentwiseCollapseHelper,
  checkBinaryProductDiagonalPairing as checkBinaryProductDiagonalPairingHelper,
  checkBinaryProductInterchange as checkBinaryProductInterchangeHelper,
  checkBinaryProductNaturality as checkBinaryProductNaturalityHelper,
  checkBinaryProductSwapCompatibility as checkBinaryProductSwapCompatibilityHelper,
  checkBinaryProductUnitPointCompatibility as checkBinaryProductUnitPointCompatibilityHelper,
  makeBinaryProductComponentwise,
  makeBinaryProductDiagonal,
  makeBinaryProductSwap,
  type BinaryProductComponentwiseCollapseInput as CategoryBinaryProductComponentwiseCollapseInput,
  type BinaryProductComponentwiseInput as CategoryBinaryProductComponentwiseInput,
  type BinaryProductDiagonalFactor as CategoryBinaryProductDiagonalFactor,
  type BinaryProductDiagonalPairingInput as CategoryBinaryProductDiagonalPairingInput,
  type BinaryProductInterchangeInput as CategoryBinaryProductInterchangeInput,
  type BinaryProductNaturalityInput as CategoryBinaryProductNaturalityInput,
  type BinaryProductSwapCompatibilityInput as CategoryBinaryProductSwapCompatibilityInput,
  type BinaryProductSwapResult as CategoryBinaryProductSwapResult,
  type BinaryProductTuple as CategoryBinaryProductTuple,
  type BinaryProductUnitPointCompatibilityInput as CategoryBinaryProductUnitPointCompatibilityInput,
} from "../category-limits-helpers"
import { ArrowFamilies } from "./arrow-families"
import { IndexedFamilies } from "./indexed-families"
import type {
  CartesianClosedCategory,
  CartesianClosedExponentialWitness,
  Category,
} from "./category"
import type { SimpleCat } from "../simple-cat"
import type {
  Functor,
  FunctorCheckSamples,
  FunctorComposablePair,
  FunctorWithWitness,
} from "../functor"
import { constructFunctorWithWitness, identityFunctorWithWitness } from "../functor"
import type { NaturalTransformationWithWitness } from "../natural-transformation"
import { constructNaturalTransformationWithWitness } from "../natural-transformation"

export namespace CategoryLimits {
  export interface HasSmallProducts<O, M> {
    smallProduct: <I>(
      index: IndexedFamilies.SmallIndex<I>,
      family: IndexedFamilies.SmallFamily<I, O>,
    ) => { obj: O; projections: IndexedFamilies.SmallFamily<I, M> }
  }

  export interface HasSmallEqualizers<O, M> {
    smallEqualizer: <I>(
      index: IndexedFamilies.SmallIndex<I>,
      parallel: IndexedFamilies.SmallFamily<I, M>,
    ) => { obj: O; equalize: IndexedFamilies.SmallFamily<I, M> }
  }

  export interface HasSmallProductMediators<O, M> extends HasProductMediators<O, M> {
    smallProduct: HasSmallProducts<O, M>["smallProduct"]
  }

  /** Category with finite coproducts */
  export interface HasFiniteCoproducts<O, M> {
    coproduct: (xs: ReadonlyArray<O>) => { obj: O; injections: ReadonlyArray<M> }
  }

  /** Category with finite products */
  export interface HasFiniteProducts<O, M> {
    product: (xs: ReadonlyArray<O>) => { obj: O; projections: ReadonlyArray<M> }
    smallProduct?: HasSmallProducts<O, M>['smallProduct']
  }

  /** Category with equalizers */
  export interface HasEqualizers<O, M> {
    // equalizer of f,g : X -> Y returns E --e--> X s.t. f∘e = g∘e and universal
    equalizer: (f: M, g: M) => { obj: O; equalize: M }
    smallEqualizer?: HasSmallEqualizers<O, M>['smallEqualizer']
  }

  export interface EqualizerFactorizationResult<M> {
    readonly factored: boolean
    readonly mediator?: M
    readonly reason?: string
  }

  export type EqualizerFactorizer<M> = (input: {
    readonly left: M
    readonly right: M
    readonly inclusion: M
    readonly fork: M
  }) => EqualizerFactorizationResult<M>

  export interface CoequalizerFactorizationResult<M> {
    readonly factored: boolean
    readonly mediator?: M
    readonly reason?: string
  }

  export type CoequalizerFactorizer<M> = (input: {
    readonly left: M
    readonly right: M
    readonly coequalizer: M
    readonly fork: M
  }) => CoequalizerFactorizationResult<M>

  export interface EqualizerFromPullbacksInput<O, M> {
    readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly terminal: HasTerminal<O, M>
    readonly products: HasProductMediators<O, M>
    readonly pullbacks: PullbackCalculator<O, M>
    readonly eq?: (left: M, right: M) => boolean
  }

  export interface EqualizerFromPullbackSpanWitness<O, M> {
    readonly left: M
    readonly right: M
    readonly product: { readonly obj: O; readonly projections: readonly [M, M] }
    readonly diagonal: M
    readonly pairing: M
    readonly pullback: PullbackData<O, M>
    readonly inclusion: M
    readonly anchor: M
  }

  export interface EqualizerFromPullbacksWitness<O, M> {
    readonly equalizer: HasEqualizers<O, M>["equalizer"]
    readonly factorEqualizer: EqualizerFactorizer<M>
    readonly spanWitness: (left: M, right: M) => EqualizerFromPullbackSpanWitness<O, M>
  }

  /** Category with coequalizers */
  export interface HasCoequalizers<O, M> {
    // coequalizer of f,g : X -> Y returns Y --q--> Q s.t. q∘f = q∘g and universal
    coequalizer: (f: M, g: M) => { obj: O; coequalize: M }
  }

  /** Category with initial object */
  export interface HasInitial<O, M> {
    initialObj: O // ⨿ over ∅
  }

  /** Category with terminal object */
  export interface HasTerminal<O, M> {
    terminalObj: O // ∏ over ∅
  }

  export type TruthProductPairer<O, M> = (domain: O, left: M, right: M) => M

  export interface TruthProductWitness<O, M> {
    readonly obj: O
    readonly projections: readonly [M, M]
    readonly pair: TruthProductPairer<O, M>
  }

  export interface BinaryProductWithPairWitness<O, M> {
    readonly obj: O
    readonly projections: readonly [M, M]
    readonly pair: (domain: O, left: M, right: M) => M
  }

  export interface ProductWithObjectFunctorInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly products: HasProductMediators<O, M>
    readonly parameter: O
    readonly samples?: FunctorCheckSamples<O, M>
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export interface ProductWithObjectFunctorProjectionWitness<M> {
    readonly projection: 0 | 1
    readonly expected: M
    readonly actual: M
    readonly holds: boolean
  }

  export interface ProductWithObjectFunctorArrowDiagnostics<O, M> {
    readonly arrow: M
    readonly source: O
    readonly target: O
    readonly image: M
    readonly triangles: readonly [
      ProductWithObjectFunctorProjectionWitness<M>,
      ProductWithObjectFunctorProjectionWitness<M>,
    ]
    readonly holds: boolean
  }

  export interface ProductWithObjectFunctorIdentityDiagnostics<O, M> {
    readonly object: O
    readonly diagnostic: ProductWithObjectFunctorArrowDiagnostics<O, M>
  }

  export interface ProductWithObjectFunctorSequentialAgreement<M> {
    readonly expected: M
    readonly actual: M
    readonly holds: boolean
  }

  export interface ProductWithObjectFunctorCompositionDiagnostics<O, M> {
    readonly pair: FunctorComposablePair<M>
    readonly composite: ProductWithObjectFunctorArrowDiagnostics<O, M>
    readonly sequential: {
      readonly image: M
      readonly arrowAgreement: ProductWithObjectFunctorSequentialAgreement<M>
      readonly projections: readonly [
        ProductWithObjectFunctorSequentialAgreement<M>,
        ProductWithObjectFunctorSequentialAgreement<M>,
      ]
      readonly holds: boolean
    }
  }

  export interface ProductWithObjectFunctorDiagnostics<O, M> {
    readonly parameter: O
    readonly arrows: ReadonlyArray<ProductWithObjectFunctorArrowDiagnostics<O, M>>
    readonly identities: ReadonlyArray<ProductWithObjectFunctorIdentityDiagnostics<O, M>>
    readonly compositions: ReadonlyArray<ProductWithObjectFunctorCompositionDiagnostics<O, M>>
    readonly holds: boolean
    readonly details: string
    readonly reason?: string
  }

  export interface ProductWithObjectFunctorResult<O, M> {
    readonly functor: FunctorWithWitness<O, M, O, M>
    readonly product: (object: O) => BinaryProductWithPairWitness<O, M>
    readonly diagnostics: ProductWithObjectFunctorDiagnostics<O, M>
  }

  export interface TensorProductStructure<O, M> {
    readonly onObjects: (left: O, right: O) => O
    readonly onMorphisms: (left: M, right: M) => M
  }

  export interface TensorWithObjectFunctorInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly tensor: TensorProductStructure<O, M>
    readonly parameter: O
    readonly samples?: FunctorCheckSamples<O, M>
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export interface TensorWithObjectArrowDiagnostics<O, M> {
    readonly arrow: M
    readonly source: O
    readonly target: O
    readonly image: M
    readonly expectedSource: O
    readonly expectedTarget: O
    readonly domainMatches: boolean
    readonly codomainMatches: boolean
  }

  export interface TensorWithObjectIdentityDiagnostics<O, M> {
    readonly object: O
    readonly identity: M
    readonly image: M
    readonly expected: M
    readonly holds: boolean
  }

  export interface TensorWithObjectCompositionDiagnostics<O, M> {
    readonly pair: FunctorComposablePair<M>
    readonly composite: M
    readonly sequential: M
    readonly holds: boolean
  }

  export interface TensorWithObjectFunctorDiagnostics<O, M> {
    readonly parameter: O
    readonly arrows: ReadonlyArray<TensorWithObjectArrowDiagnostics<O, M>>
    readonly identities: ReadonlyArray<TensorWithObjectIdentityDiagnostics<O, M>>
    readonly compositions: ReadonlyArray<TensorWithObjectCompositionDiagnostics<O, M>>
    readonly holds: boolean
    readonly details: string
    readonly reason?: string
  }

  export interface TensorWithObjectFunctorResult<O, M> {
    readonly functor: FunctorWithWitness<O, M, O, M>
    readonly diagnostics: TensorWithObjectFunctorDiagnostics<O, M>
  }

  const defaultProductSamples = <O, M>(
    category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
    parameter: O,
  ): FunctorCheckSamples<O, M> => {
    const identity = category.id(parameter)
    return {
      objects: [parameter],
      arrows: [identity],
      composablePairs: [{ f: identity, g: identity }],
    }
  }

  const describeProjection = (projection: 0 | 1): string => (projection === 0 ? "π₁" : "π₂")

  export const productWithObjectFunctor = <O, M>({
    category,
    products,
    parameter,
    samples = defaultProductSamples(category, parameter),
    equalMor,
    label,
  }: ProductWithObjectFunctorInput<O, M>): ProductWithObjectFunctorResult<O, M> => {
    const eq =
      equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const labelPrefix = label
      ? `CategoryLimits.productWithObjectFunctor(${label})`
      : "CategoryLimits.productWithObjectFunctor"

    const productCache = new Map<O, BinaryProductWithPairWitness<O, M>>()
    const getProduct = (object: O): BinaryProductWithPairWitness<O, M> => {
      const cached = productCache.get(object)
      if (cached) {
        return cached
      }
      const { obj, projections } = products.product([object, parameter])
      if (projections.length !== 2) {
        throw new Error(
          "CategoryLimits.productWithObjectFunctor: binary product must supply exactly two projections.",
        )
      }
      const witness: BinaryProductWithPairWitness<O, M> = {
        obj,
        projections: [projections[0]!, projections[1]!] as const,
        pair: (domain: O, leftArrow: M, rightArrow: M) =>
          products.tuple(domain, [leftArrow, rightArrow], obj),
      }
      productCache.set(object, witness)
      return witness
    }

    const simpleCategory: SimpleCat<O, M> = {
      id: (object) => category.id(object),
      compose: (g, f) => category.compose(g, f),
      src: (arrow) => category.dom(arrow),
      dst: (arrow) => category.cod(arrow),
    }

    const functorData: Functor<O, M, O, M> = {
      F0: (object) => getProduct(object).obj,
      F1: (arrow) => {
        const sourceProduct = getProduct(category.dom(arrow))
        const targetProduct = getProduct(category.cod(arrow))
        const leftLeg = category.compose(arrow, sourceProduct.projections[0])
        const rightLeg = sourceProduct.projections[1]
        return targetProduct.pair(sourceProduct.obj, leftLeg, rightLeg)
      },
    }

    const metadata = [
      `${labelPrefix}: object component pairs each input with the fixed parameter.`,
      `${labelPrefix}: arrow component enforces π₁ and π₂ projection equations.`,
    ]

    const functor = constructFunctorWithWitness(
      simpleCategory,
      simpleCategory,
      functorData,
      samples,
      metadata,
    )

    const checkArrow = (arrow: M): ProductWithObjectFunctorArrowDiagnostics<O, M> => {
      const source = category.dom(arrow)
      const target = category.cod(arrow)
      const sourceProduct = getProduct(source)
      const targetProduct = getProduct(target)
      const image = functor.functor.F1(arrow)

      const leftExpected = category.compose(arrow, sourceProduct.projections[0])
      const leftActual = category.compose(targetProduct.projections[0], image)
      const rightExpected = sourceProduct.projections[1]
      const rightActual = category.compose(targetProduct.projections[1], image)

      const leftTriangle: ProductWithObjectFunctorProjectionWitness<M> = {
        projection: 0,
        expected: leftExpected,
        actual: leftActual,
        holds: eq(leftActual, leftExpected),
      }
      const rightTriangle: ProductWithObjectFunctorProjectionWitness<M> = {
        projection: 1,
        expected: rightExpected,
        actual: rightActual,
        holds: eq(rightActual, rightExpected),
      }

      return {
        arrow,
        source,
        target,
        image,
        triangles: [leftTriangle, rightTriangle],
        holds: leftTriangle.holds && rightTriangle.holds,
      }
    }

    const arrowDiagnostics = (samples.arrows ?? []).map(checkArrow)

    const identityDiagnostics = (samples.objects ?? []).map((object) => ({
      object,
      diagnostic: checkArrow(category.id(object)),
    }))

    const compositionDiagnostics = (samples.composablePairs ?? []).map((pair) => {
      const composite = category.compose(pair.g, pair.f)
      const compositeDiagnostic = checkArrow(composite)
      const sequentialImage = category.compose(
        functor.functor.F1(pair.g),
        functor.functor.F1(pair.f),
      )
      const targetProduct = getProduct(category.cod(pair.g))
      const leftSequential = category.compose(targetProduct.projections[0], sequentialImage)
      const rightSequential = category.compose(targetProduct.projections[1], sequentialImage)

      const [leftTriangle, rightTriangle] = compositeDiagnostic.triangles

      const leftAgreement: ProductWithObjectFunctorSequentialAgreement<M> = {
        expected: leftTriangle.expected,
        actual: leftSequential,
        holds: eq(leftSequential, leftTriangle.expected),
      }
      const rightAgreement: ProductWithObjectFunctorSequentialAgreement<M> = {
        expected: rightTriangle.expected,
        actual: rightSequential,
        holds: eq(rightSequential, rightTriangle.expected),
      }
      const arrowAgreement: ProductWithObjectFunctorSequentialAgreement<M> = {
        expected: compositeDiagnostic.image,
        actual: sequentialImage,
        holds: eq(sequentialImage, compositeDiagnostic.image),
      }

      return {
        pair,
        composite: compositeDiagnostic,
        sequential: {
          image: sequentialImage,
          arrowAgreement,
          projections: [leftAgreement, rightAgreement] as const,
          holds:
            compositeDiagnostic.holds &&
            leftAgreement.holds &&
            rightAgreement.holds &&
            arrowAgreement.holds,
        },
      }
    })

    const issues: string[] = []

    for (const diagnostic of arrowDiagnostics) {
      if (!diagnostic.holds) {
        const failing = diagnostic.triangles.find((triangle) => !triangle.holds)
        const projectionLabel = failing ? describeProjection(failing.projection) : "projection"
        issues.push(`${labelPrefix}: arrow sample failed ${projectionLabel} compatibility.`)
        break
      }
    }

    if (issues.length === 0) {
      for (const { object, diagnostic } of identityDiagnostics) {
        if (!diagnostic.holds) {
          const failing = diagnostic.triangles.find((triangle) => !triangle.holds)
          const projectionLabel = failing ? describeProjection(failing.projection) : "projection"
          issues.push(
            `${labelPrefix}: identity on ${String(object)} failed ${projectionLabel} compatibility.`,
          )
          break
        }
      }
    }

    if (issues.length === 0) {
      for (const diagnostic of compositionDiagnostics) {
        if (!diagnostic.sequential.holds) {
          const pieces: string[] = []
          if (!diagnostic.sequential.arrowAgreement.holds) {
            pieces.push("the functoriality equality F(g ∘ f) = F(g) ∘ F(f)")
          }
          diagnostic.sequential.projections.forEach((entry, index) => {
            if (!entry.holds) {
              pieces.push(`${describeProjection(index === 0 ? 0 : 1)} compatibility`)
            }
          })
          const summary = pieces.length > 0 ? pieces.join(" and ") : "projection compatibility"
          issues.push(`${labelPrefix}: composition sample failed ${summary}.`)
          break
        }
      }
    }

    const holds = issues.length === 0
    const details = holds
      ? `${labelPrefix}: (- × •) satisfied projection diagnostics across ${arrowDiagnostics.length} arrow(s) and ${compositionDiagnostics.length} composable pair(s).`
      : issues[0]!

    const diagnostics: ProductWithObjectFunctorDiagnostics<O, M> = {
      parameter,
      arrows: arrowDiagnostics,
      identities: identityDiagnostics,
      compositions: compositionDiagnostics,
      holds,
      details,
      ...(issues.length > 0 ? { reason: issues[0] } : {}),
    }

    return { functor, product: getProduct, diagnostics }
  }

  const defaultTensorSamples = <O, M>(
    category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
    parameter: O,
  ): FunctorCheckSamples<O, M> => {
    const identity = category.id(parameter)
    return {
      objects: [parameter],
      arrows: [identity],
      composablePairs: [{ f: identity, g: identity }],
    }
  }

  export const tensorWithObjectFunctor = <O, M>({
    category,
    tensor,
    parameter,
    samples = defaultTensorSamples(category, parameter),
    equalMor,
    label,
  }: TensorWithObjectFunctorInput<O, M>): TensorWithObjectFunctorResult<O, M> => {
    const eq =
      equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const labelPrefix = label
      ? `CategoryLimits.tensorWithObjectFunctor(${label})`
      : "CategoryLimits.tensorWithObjectFunctor"

    const idParameter = category.id(parameter)

    const simpleCategory: SimpleCat<O, M> = {
      id: (object) => category.id(object),
      compose: (g, f) => category.compose(g, f),
      src: (arrow) => category.dom(arrow),
      dst: (arrow) => category.cod(arrow),
    }

    const functorData: Functor<O, M, O, M> = {
      F0: (object) => tensor.onObjects(object, parameter),
      F1: (arrow) => tensor.onMorphisms(arrow, idParameter),
    }

    const metadata = [
      `${labelPrefix}: object component tensors each input with the fixed parameter.`,
      `${labelPrefix}: arrow component applies the tensor bifunctor to (f, id).`,
    ]

    const functor = constructFunctorWithWitness(
      simpleCategory,
      simpleCategory,
      functorData,
      samples,
      metadata,
    )

    const arrowDiagnostics: TensorWithObjectArrowDiagnostics<O, M>[] = (samples.arrows ?? []).map(
      (arrow) => {
        const source = category.dom(arrow)
        const target = category.cod(arrow)
        const image = functor.functor.F1(arrow)
        const expectedSource = functor.functor.F0(source)
        const expectedTarget = functor.functor.F0(target)
        return {
          arrow,
          source,
          target,
          image,
          expectedSource,
          expectedTarget,
          domainMatches: Object.is(category.dom(image), expectedSource),
          codomainMatches: Object.is(category.cod(image), expectedTarget),
        }
      },
    )

    const identityDiagnostics: TensorWithObjectIdentityDiagnostics<O, M>[] = (samples.objects ?? []).map(
      (object) => {
        const identity = category.id(object)
        const image = functor.functor.F1(identity)
        const expected = category.id(functor.functor.F0(object))
        return {
          object,
          identity,
          image,
          expected,
          holds: eq(image, expected),
        }
      },
    )

    const compositionDiagnostics: TensorWithObjectCompositionDiagnostics<O, M>[] = (
      samples.composablePairs ?? []
    ).map((pair) => {
      const composite = category.compose(pair.g, pair.f)
      const image = functor.functor.F1(composite)
      const sequential = category.compose(
        functor.functor.F1(pair.g),
        functor.functor.F1(pair.f),
      )
      return {
        pair,
        composite: image,
        sequential,
        holds: eq(sequential, image),
      }
    })

    const issues: string[] = []

    if (
      arrowDiagnostics.some(
        (diagnostic) => !diagnostic.domainMatches || !diagnostic.codomainMatches,
      )
    ) {
      issues.push(
        `${labelPrefix}: tensor image violated the expected domain or codomain alignment.`,
      )
    }

    if (issues.length === 0) {
      const failingIdentity = identityDiagnostics.find((diagnostic) => !diagnostic.holds)
      if (failingIdentity) {
        issues.push(
          `${labelPrefix}: identity on ${String(
            failingIdentity.object,
          )} failed tensor identity preservation.`,
        )
      }
    }

    if (issues.length === 0) {
      const failingComposition = compositionDiagnostics.find((diagnostic) => !diagnostic.holds)
      if (failingComposition) {
        issues.push(`${labelPrefix}: composition sample failed tensor functoriality.`)
      }
    }

    const holds = issues.length === 0
    const details = holds
      ? `${labelPrefix}: (- ⊗ •) satisfied identity and composition diagnostics across ${identityDiagnostics.length} identity sample(s) and ${compositionDiagnostics.length} composable pair(s).`
      : issues[0]!

    const diagnostics: TensorWithObjectFunctorDiagnostics<O, M> = {
      parameter,
      arrows: arrowDiagnostics,
      identities: identityDiagnostics,
      compositions: compositionDiagnostics,
      holds,
      details,
      ...(issues.length > 0 ? { reason: issues[0] } : {}),
    }

    return { functor, diagnostics }
  }

  export interface ExponentiateByObjectFunctorInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly cartesianClosed: CartesianClosedCategory<O, M>
    readonly parameter: O
    readonly samples?: FunctorCheckSamples<O, M>
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export interface ExponentiateByObjectNaturalityDiagnostics<M> {
    readonly expected: M
    readonly actual: M
    readonly holds: boolean
  }

  export interface ExponentiateByObjectArrowDiagnostics<O, M> {
    readonly arrow: M
    readonly source: O
    readonly target: O
    readonly image: M
    readonly expectedSource: O
    readonly expectedTarget: O
    readonly domainMatches: boolean
    readonly codomainMatches: boolean
    readonly naturality: ExponentiateByObjectNaturalityDiagnostics<M>
  }

  export interface ExponentiateByObjectIdentityDiagnostics<O, M> {
    readonly object: O
    readonly image: M
    readonly expected: M
    readonly holds: boolean
  }

  export interface ExponentiateByObjectCompositionDiagnostics<M> {
    readonly pair: FunctorComposablePair<M>
    readonly composite: M
    readonly sequential: M
    readonly holds: boolean
  }

  export interface ExponentiateByObjectFunctorDiagnostics<O, M> {
    readonly parameter: O
    readonly arrows: ReadonlyArray<ExponentiateByObjectArrowDiagnostics<O, M>>
    readonly identities: ReadonlyArray<ExponentiateByObjectIdentityDiagnostics<O, M>>
    readonly compositions: ReadonlyArray<ExponentiateByObjectCompositionDiagnostics<M>>
    readonly holds: boolean
    readonly details: string
    readonly reason?: string
  }

  export interface ExponentiateByObjectFunctorResult<O, M> {
    readonly functor: FunctorWithWitness<O, M, O, M>
    readonly exponential: (object: O) => CartesianClosedExponentialWitness<O, M>
    readonly diagnostics: ExponentiateByObjectFunctorDiagnostics<O, M>
    readonly evaluation: NaturalTransformationWithWitness<O, M, O, M>
  }

  const defaultExponentiateSamples = <O, M>(
    category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
    parameter: O,
  ): FunctorCheckSamples<O, M> => {
    const identity = category.id(parameter)
    return {
      objects: [parameter],
      arrows: [identity],
      composablePairs: [{ f: identity, g: identity }],
    }
  }

  export const exponentiateByObjectFunctor = <O, M>({
    category,
    cartesianClosed,
    parameter,
    samples = defaultExponentiateSamples(category, parameter),
    equalMor,
    label,
  }: ExponentiateByObjectFunctorInput<O, M>): ExponentiateByObjectFunctorResult<O, M> => {
    const eq =
      equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const labelPrefix = label
      ? `CategoryLimits.exponentiateByObjectFunctor(${label})`
      : "CategoryLimits.exponentiateByObjectFunctor"

    const exponentialCache = new Map<O, CartesianClosedExponentialWitness<O, M>>()
    const getExponential = (object: O): CartesianClosedExponentialWitness<O, M> => {
      const cached = exponentialCache.get(object)
      if (cached) {
        return cached
      }
      const witness = cartesianClosed.exponential(parameter, object)
      exponentialCache.set(object, witness)
      return witness
    }

    const simpleCategory: SimpleCat<O, M> & { eq: (left: M, right: M) => boolean } = {
      id: (object) => category.id(object),
      compose: (g, f) => category.compose(g, f),
      src: (arrow) => category.dom(arrow),
      dst: (arrow) => category.cod(arrow),
      eq,
    }

    const functorData: Functor<O, M, O, M> = {
      F0: (object) => getExponential(object).obj,
      F1: (arrow) => {
        const source = category.dom(arrow)
        const target = category.cod(arrow)
        const sourceExponential = getExponential(source)
        const targetExponential = getExponential(target)
        const evaluationComposite = category.compose(arrow, sourceExponential.evaluation)
        return targetExponential.curry(sourceExponential.obj, evaluationComposite)
      },
    }

    const metadata = [
      `${labelPrefix}: object component exponentiates each input by the fixed parameter.`,
      `${labelPrefix}: arrow component curries f ∘ ev₍source₎ to obtain the induced exponential arrow.`,
    ]

    const functor = constructFunctorWithWitness(
      simpleCategory,
      simpleCategory,
      functorData,
      samples,
      metadata,
    )

    const evaluationSourceFunctor = constructFunctorWithWitness(
      simpleCategory,
      simpleCategory,
      {
        F0: (object) => getExponential(object).product.obj,
        F1: (arrow) => {
          const source = category.dom(arrow)
          const target = category.cod(arrow)
          const sourceExponential = getExponential(source)
          const targetExponential = getExponential(target)
          return targetExponential.product.pair(
            sourceExponential.product.obj,
            category.compose(functor.functor.F1(arrow), sourceExponential.product.proj1),
            sourceExponential.product.proj2,
          )
        },
      },
      samples,
      [
        `${labelPrefix}: evaluation domain functor realises (-)^• × parameter.`,
        `${labelPrefix}: arrow component pairs f^• with the preserved parameter projection.`,
      ],
    )

    const identityFunctor = identityFunctorWithWitness(simpleCategory, samples)

    const naturalTransformationSamples = {
      ...(samples.objects ? { objects: samples.objects } : {}),
      ...(samples.arrows ? { arrows: samples.arrows } : {}),
    }

    const evaluation = constructNaturalTransformationWithWitness(
      evaluationSourceFunctor,
      identityFunctor,
      (object) => getExponential(object).evaluation,
      {
        samples: naturalTransformationSamples,
        ...(eq ? { equalMor: eq } : {}),
        metadata: [
          `${labelPrefix}: evaluation components target X via the exponential witness.`,
          `${labelPrefix}: evaluation naturality squares reuse the exponential pairing data.`,
        ],
      },
    )

    const arrowDiagnostics: ExponentiateByObjectArrowDiagnostics<O, M>[] = (samples.arrows ?? []).map(
      (arrow) => {
        const source = category.dom(arrow)
        const target = category.cod(arrow)
        const sourceExponential = getExponential(source)
        const targetExponential = getExponential(target)
        const image = functor.functor.F1(arrow)
        const expectedSource = sourceExponential.obj
        const expectedTarget = targetExponential.obj
        const domainMatches = Object.is(category.dom(image), expectedSource)
        const codomainMatches = Object.is(category.cod(image), expectedTarget)

        const evaluationExpected = category.compose(arrow, sourceExponential.evaluation)
        const naturalityPair = targetExponential.product.pair(
          sourceExponential.product.obj,
          category.compose(image, sourceExponential.product.proj1),
          sourceExponential.product.proj2,
        )
        const evaluationActual = category.compose(
          targetExponential.evaluation,
          naturalityPair,
        )

        const naturality: ExponentiateByObjectNaturalityDiagnostics<M> = {
          expected: evaluationExpected,
          actual: evaluationActual,
          holds: eq(evaluationExpected, evaluationActual),
        }

        return {
          arrow,
          source,
          target,
          image,
          expectedSource,
          expectedTarget,
          domainMatches,
          codomainMatches,
          naturality,
        }
      },
    )

    const identityDiagnostics: ExponentiateByObjectIdentityDiagnostics<O, M>[] = (
      samples.objects ?? []
    ).map((object) => {
      const identity = category.id(object)
      const image = functor.functor.F1(identity)
      const expected = category.id(functor.functor.F0(object))
      return {
        object,
        image,
        expected,
        holds: eq(image, expected),
      }
    })

    const compositionDiagnostics: ExponentiateByObjectCompositionDiagnostics<M>[] = (
      samples.composablePairs ?? []
    ).map((pair) => {
      const composite = category.compose(pair.g, pair.f)
      const image = functor.functor.F1(composite)
      const sequential = category.compose(
        functor.functor.F1(pair.g),
        functor.functor.F1(pair.f),
      )
      return {
        pair,
        composite: image,
        sequential,
        holds: eq(sequential, image),
      }
    })

    const issues: string[] = []

    if (
      arrowDiagnostics.some(
        (diagnostic) => !diagnostic.domainMatches || !diagnostic.codomainMatches,
      )
    ) {
      issues.push(
        `${labelPrefix}: exponential image violated the expected domain or codomain alignment.`,
      )
    }

    if (issues.length === 0) {
      const failingNaturality = arrowDiagnostics.find((diagnostic) => !diagnostic.naturality.holds)
      if (failingNaturality) {
        issues.push(
          `${labelPrefix}: evaluation naturality square failed for an arrow sample.`,
        )
      }
    }

    if (issues.length === 0) {
      const failingIdentity = identityDiagnostics.find((diagnostic) => !diagnostic.holds)
      if (failingIdentity) {
        issues.push(
          `${labelPrefix}: identity on ${String(
            failingIdentity.object,
          )} failed exponential identity preservation.`,
        )
      }
    }

    if (issues.length === 0) {
      const failingComposition = compositionDiagnostics.find((diagnostic) => !diagnostic.holds)
      if (failingComposition) {
        issues.push(`${labelPrefix}: composition sample failed exponential functoriality.`)
      }
    }

    const holds = issues.length === 0
    const details = holds
      ? `${labelPrefix}: (-)^• satisfied identity, composition, and evaluation diagnostics across ${identityDiagnostics.length} identity sample(s) and ${compositionDiagnostics.length} composable pair(s).`
      : issues[0]!

    const diagnostics: ExponentiateByObjectFunctorDiagnostics<O, M> = {
      parameter,
      arrows: arrowDiagnostics,
      identities: identityDiagnostics,
      compositions: compositionDiagnostics,
      holds,
      details,
      ...(issues.length > 0 ? { reason: issues[0] } : {}),
    }

    return { functor, exponential: getExponential, diagnostics, evaluation }
  }

  export interface PowerObjectClassificationInput<O, M> {
    readonly ambient: O
    readonly relation: M
    readonly product: BinaryProductWithPairWitness<O, M>
    readonly pullbacks: PullbackCalculator<O, M>
  }

  export interface PowerObjectMembershipWitness<O, M> {
    readonly subobject: O
    readonly inclusion: M
    readonly product: BinaryProductWithPairWitness<O, M>
    readonly evaluation: M
    readonly pullback: PullbackData<O, M>
    readonly certification: PullbackCertification<O, M>
  }

  export interface PowerObjectClassificationWitness<O, M> {
    readonly mediator: M
    readonly characteristic: M
    readonly pairing: M
    readonly pullback: PullbackData<O, M>
    readonly certification: PullbackCertification<O, M>
    readonly relationIso: SubobjectClassifierIsoWitness<M>
    readonly relationAnchor: M
    readonly factorCone: (
      cone: PullbackData<O, M>,
    ) => PullbackConeFactorResult<M>
  }

  export interface PowerObjectWitness<O, M> {
    readonly anchor: O
    readonly powerObj: O
    readonly membership: PowerObjectMembershipWitness<O, M>
    classify: (
      input: PowerObjectClassificationInput<O, M>,
    ) => PowerObjectClassificationWitness<O, M>
  }

  /** Category equipped with a subobject classifier */
  export interface SubobjectClassifierCategory<O, M>
    extends Category<O, M>,
      ArrowFamilies.HasDomCod<O, M>,
      HasTerminal<O, M>,
      HasInitial<O, M> {
    readonly terminate: (X: O) => M
    readonly truthValues: O
    readonly truthArrow: M
    readonly falseArrow: M
    readonly negation: M
    readonly truthProduct?: TruthProductWitness<O, M>
    readonly truthAnd?: M
    readonly powerObject?: (anchor: O) => PowerObjectWitness<O, M>
    readonly initialArrow: (X: O) => M
    characteristic: (monomorphism: M) => M
    subobjectFromCharacteristic: (
      characteristic: M,
    ) => { readonly subobject: O; readonly inclusion: M }
  }

  export interface ElementaryToposWitnessMetadata {
    readonly label?: string
    readonly notes?: ReadonlyArray<string>
  }

  export interface ElementaryToposWitness<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly finiteLimits: HasFiniteProducts<O, M> & HasEqualizers<O, M> & HasTerminal<O, M>
    readonly exponentials: CartesianClosedCategory<O, M>
    readonly subobjectClassifier: SubobjectClassifierCategory<O, M>
    readonly naturalNumbersObject?: NaturalNumbersObjectWitness<O, M>
    readonly metadata?: ElementaryToposWitnessMetadata
  }

  export interface NaturalNumbersObjectSequence<O, M> {
    readonly target: O
    readonly zero: M
    readonly successor: M
  }

  export interface NaturalNumbersObjectCompatibility<M> {
    readonly zeroComposite: M
    readonly successorLeft: M
    readonly successorRight: M
  }

  export interface NaturalNumbersObjectMediatorWitness<M> {
    readonly mediator: M
    readonly compatibility: NaturalNumbersObjectCompatibility<M>
  }

  export interface NaturalNumbersObjectUniquenessWitness<M> {
    readonly agrees: boolean
    readonly mediator: M
    readonly candidate: M
    readonly compatibility: NaturalNumbersObjectCompatibility<M>
    readonly reason?: string
  }

  export interface NaturalNumbersObjectWitness<O, M> {
    readonly carrier: O
    readonly zero: M
    readonly successor: M
    readonly induce: (
      sequence: NaturalNumbersObjectSequence<O, M>,
    ) => NaturalNumbersObjectMediatorWitness<M>
    readonly checkCandidate?: (
      sequence: NaturalNumbersObjectSequence<O, M>,
      candidate: M,
    ) => NaturalNumbersObjectUniquenessWitness<M>
    readonly bound?: number
    readonly enumeratePoints?: () => ReadonlyArray<M>
    readonly canonicalSelfEmbedding?: () => M
    readonly certifyInductiveSubobject?: (input: {
      readonly inclusion: M
      readonly zeroLift: M
      readonly successorLift: M
      readonly equalMor?: (left: M, right: M) => boolean
      readonly ensureMonomorphism?: (arrow: M) => void
      readonly label?: string
    }) => NaturalNumbersInductionResult<M>
    readonly certifyInductiveSubobjectIsomorphism?: (input: {
      readonly inclusion: M
      readonly zeroLift: M
      readonly successorLift: M
      readonly equalMor?: (left: M, right: M) => boolean
      readonly ensureMonomorphism?: (arrow: M) => void
      readonly label?: string
    }) => NaturalNumbersInductionIsomorphismResult<M>
    readonly addition?: (options?: {
      readonly equalMor?: (left: M, right: M) => boolean
      readonly label?: string
    }) => NaturalNumbersAdditionResult<O, M>
    readonly integerCompletion?: (options?: {
      readonly equalMor?: (left: M, right: M) => boolean
      readonly label?: string
    }) => IntegerCompletionResult<O, M>
    readonly primitiveRecursion?: (input: {
      readonly parameter: O
      readonly target: O
      readonly base: M
      readonly step: M
      readonly equalMor?: (left: M, right: M) => boolean
      readonly label?: string
    }) => NaturalNumbersPrimitiveRecursionResult<O, M>
    readonly primitiveRecursionFromExponential?: (input: {
      readonly parameter: O
      readonly target: O
      readonly base: M
      readonly step: M
      readonly equalMor?: (left: M, right: M) => boolean
      readonly label?: string
    }) => NaturalNumbersPrimitiveRecursionExponentialResult<O, M>
    readonly initialAlgebra?: (input: {
      readonly target: O
      readonly algebra: M
      readonly equalMor?: (left: M, right: M) => boolean
      readonly label?: string
    }) => NaturalNumbersInitialAlgebraResult<O, M>
    readonly certifySuccessorZeroSeparation?: (options?: {
      readonly equalMor?: (left: M, right: M) => boolean
      readonly label?: string
    }) => NaturalNumbersZeroSeparationResult<O, M>
    readonly certifyPointInjective?: () => PointInjectiveResult<M>
    readonly certifyPointSurjective?: () => PointSurjectiveResult<M>
    readonly certifyPointInfinite?: () => PointInfiniteResult<M>
    readonly certifyDedekindInfinite?: () => DedekindInfiniteResult<M>
  }

  export interface NaturalNumbersObjectCategory<O, M>
    extends Category<O, M>,
      ArrowFamilies.HasDomCod<O, M>,
      HasTerminal<O, M> {
    readonly naturalNumbersObject: NaturalNumbersObjectWitness<O, M>
    readonly naturalNumbersSequence?: () => NaturalNumbersObjectSequence<O, M>
    readonly naturalNumbersInduce?: (
      sequence: NaturalNumbersObjectSequence<O, M>,
    ) => NaturalNumbersObjectMediatorWitness<M>
  }

  export interface NaturalNumbersObjectCompatibilityInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly natural: NaturalNumbersObjectWitness<O, M>
    readonly sequence: NaturalNumbersObjectSequence<O, M>
    readonly mediator: M
  }

  export interface NaturalNumbersObjectCandidateInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly natural: NaturalNumbersObjectWitness<O, M>
    readonly sequence: NaturalNumbersObjectSequence<O, M>
    readonly candidate: M
    readonly equalMor?: (left: M, right: M) => boolean
  }

  export const naturalNumbersObjectCompatibility = <O, M>({
    category,
    natural,
    sequence,
    mediator,
  }: NaturalNumbersObjectCompatibilityInput<O, M>): NaturalNumbersObjectCompatibility<M> => ({
    zeroComposite: category.compose(mediator, natural.zero),
    successorLeft: category.compose(mediator, natural.successor),
    successorRight: category.compose(sequence.successor, mediator),
  })

  export const naturalNumbersObjectCandidateVerdict = <O, M>({
    category,
    natural,
    sequence,
    candidate,
    equalMor,
  }: NaturalNumbersObjectCandidateInput<O, M>): NaturalNumbersObjectUniquenessWitness<M> => {
    const eq =
      equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const compatibility = naturalNumbersObjectCompatibility({
      category,
      natural,
      sequence,
      mediator: candidate,
    })

    const zeroHolds = eq(compatibility.zeroComposite, sequence.zero)
    const successorHolds = eq(compatibility.successorLeft, compatibility.successorRight)

    const canonical = natural.induce(sequence)
    const agrees = zeroHolds && successorHolds && eq(candidate, canonical.mediator)

    let reason: string | undefined
    if (!agrees) {
      if (!zeroHolds) {
        reason =
          'CategoryLimits.naturalNumbersObjectCandidateVerdict: candidate fails zero compatibility.'
      } else if (!successorHolds) {
        reason =
          'CategoryLimits.naturalNumbersObjectCandidateVerdict: candidate fails successor compatibility.'
      } else {
        reason =
          'CategoryLimits.naturalNumbersObjectCandidateVerdict: candidate differs from canonical mediator.'
      }
    }

    const verdict: NaturalNumbersObjectUniquenessWitness<M> = {
      agrees,
      mediator: canonical.mediator,
      candidate,
      compatibility,
    }

    return reason ? { ...verdict, reason } : verdict
  }

  export const naturalNumbersObjectSequenceFromWitness = <O, M>(
    witness: NaturalNumbersObjectWitness<O, M>,
  ): NaturalNumbersObjectSequence<O, M> => ({
    target: witness.carrier,
    zero: witness.zero,
    successor: witness.successor,
  })

  export const naturalNumbersObjectSequenceFromCategory = <O, M>(
    category: NaturalNumbersObjectCategory<O, M>,
  ): NaturalNumbersObjectSequence<O, M> =>
    category.naturalNumbersSequence
      ? category.naturalNumbersSequence()
      : naturalNumbersObjectSequenceFromWitness(category.naturalNumbersObject)

  export const naturalNumbersObjectInduceSequence = <O, M>(
    category: NaturalNumbersObjectCategory<O, M>,
    sequence: NaturalNumbersObjectSequence<O, M>,
  ): NaturalNumbersObjectMediatorWitness<M> =>
    category.naturalNumbersInduce
      ? category.naturalNumbersInduce(sequence)
      : category.naturalNumbersObject.induce(sequence)

  export interface NaturalNumbersInductionInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M> & HasTerminal<O, M>
    readonly natural: NaturalNumbersObjectWitness<O, M>
    readonly inclusion: M
    readonly zeroLift: M
    readonly successorLift: M
    readonly equalMor?: (left: M, right: M) => boolean
    readonly ensureMonomorphism?: (arrow: M) => void
    readonly label?: string
  }

  export interface NaturalNumbersInductionCompatibility<M> {
    readonly zeroComposite: M
    readonly successorLeft: M
    readonly successorRight: M
  }

  export interface NaturalNumbersInductionWitness<M> {
    readonly holds: boolean
    readonly inclusion: M
    readonly compatibility: NaturalNumbersInductionCompatibility<M>
    readonly retraction?: M
    readonly rightComposite?: M
    readonly section?: M
    readonly identityVerdict?: NaturalNumbersObjectUniquenessWitness<M>
    readonly monomorphismCertified: boolean
    readonly details: string
    readonly reason?: string
  }

  export interface NaturalNumbersInductionIsomorphismMetadata<M> {
    readonly compatibility: NaturalNumbersInductionCompatibility<M>
    readonly identityVerdict?: NaturalNumbersObjectUniquenessWitness<M>
    readonly monomorphismCertified: boolean
  }

  export interface NaturalNumbersInductionIsomorphismWitness<M> {
    readonly found: boolean
    readonly forward?: M
    readonly backward?: M
    readonly leftComposite?: M
    readonly rightComposite?: M
    readonly details: string
    readonly reason?: string
    readonly metadata: NaturalNumbersInductionIsomorphismMetadata<M>
  }

  export interface NaturalNumbersInductionIsomorphismInput<M> {
    readonly result: NaturalNumbersInductionResult<M>
    readonly label?: string
  }

  export const naturalNumbersInductionIsomorphism = <M>({
    result,
    label,
  }: NaturalNumbersInductionIsomorphismInput<M>): NaturalNumbersInductionIsomorphismWitness<M> => {
    const qualifier = label
      ? `CategoryLimits.naturalNumbersInductionIsomorphism: ${label}`
      : 'CategoryLimits.naturalNumbersInductionIsomorphism'

    const metadata: NaturalNumbersInductionIsomorphismMetadata<M> = {
      compatibility: result.compatibility,
      monomorphismCertified: result.monomorphismCertified,
      ...(result.identityVerdict !== undefined
        ? { identityVerdict: result.identityVerdict }
        : {}),
    }

    if (!result.holds) {
      return {
        found: false,
        details: `${qualifier} unavailable because the induction witness failed.`,
        reason:
          result.reason ??
          `${qualifier}: induction witness did not establish an isomorphism.`,
        metadata,
      }
    }

    const { inclusion, retraction, section, rightComposite } = result

    if (!retraction || !section || !rightComposite) {
      return {
        found: false,
        details: `${qualifier}: induction witness is missing canonical composites.`,
        reason: `${qualifier}: retraction, section, and right composite are required to extract the isomorphism.`,
        metadata,
      }
    }

    return {
      found: true,
      forward: inclusion,
      backward: retraction,
      leftComposite: section,
      rightComposite,
      details: `${qualifier}: extracted isomorphism from the inductive inclusion.`,
      metadata,
    }
  }

  export interface NaturalNumbersZeroSeparationInput<O, M> {
    readonly category: Category<O, M> &
      ArrowFamilies.HasDomCod<O, M> &
      HasTerminal<O, M> &
      HasEqualizers<O, M>
    readonly natural: NaturalNumbersObjectWitness<O, M>
    readonly classifier: SubobjectClassifierCategory<O, M>
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export interface NaturalNumbersZeroSeparationClassification<O, M> {
    readonly subobject: O
    readonly inclusion: M
  }

  export interface NaturalNumbersZeroSeparationWitness<O, M> {
    readonly separated: boolean
    readonly successorZero: M
    readonly equalizer: { readonly obj: O; readonly equalize: M }
    readonly characteristic: M
    readonly classification: NaturalNumbersZeroSeparationClassification<O, M>
    readonly classificationAgrees: boolean
    readonly equalsFalse: boolean
    readonly equalsTruth: boolean
    readonly details: string
    readonly reason?: string
  }

  export const certifyNaturalNumbersZeroSeparation = <O, M>({
    category,
    natural,
    classifier,
    equalMor,
    label,
  }: NaturalNumbersZeroSeparationInput<O, M>): NaturalNumbersZeroSeparationWitness<O, M> => {
    const eq =
      equalMor ??
      classifier.equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const qualifier = label
      ? `CategoryLimits.certifyNaturalNumbersZeroSeparation: ${label}`
      : 'CategoryLimits.certifyNaturalNumbersZeroSeparation'

    const successorZero = category.compose(natural.successor, natural.zero)
    const equalizer = category.equalizer(successorZero, natural.zero)

    const characteristic = classifier.characteristic(equalizer.equalize)
    const classification = classifier.subobjectFromCharacteristic(characteristic)
    const classificationAgrees = eq(classification.inclusion, equalizer.equalize)

    const equalsFalse = eq(characteristic, classifier.falseArrow)
    const equalsTruth = eq(characteristic, classifier.truthArrow)

    if (category.cod(classification.inclusion) !== category.terminalObj) {
      throw new Error(
        `${qualifier}: classified inclusion must land in the terminal object.`,
      )
    }

    const separated = equalsFalse

    if (separated) {
      return {
        separated: true,
        successorZero,
        equalizer,
        characteristic,
        classification,
        classificationAgrees,
        equalsFalse,
        equalsTruth,
        details: `${qualifier}: zero is not in the image of successor.`,
      }
    }

    const reason = equalsTruth
      ? `${qualifier}: characteristic arrow equals truth; zero appears as a successor.`
      : `${qualifier}: characteristic arrow is not the false point.`

    return {
      separated: false,
      successorZero,
      equalizer,
      characteristic,
      classification,
      classificationAgrees,
      equalsFalse,
      equalsTruth,
      details: `${qualifier}: failed to separate zero from successor.`,
      reason,
    }
  }

  export interface NaturalNumbersPrimitiveRecursionInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly natural: NaturalNumbersObjectWitness<O, M>
    readonly cartesianClosed: CartesianClosedCategory<O, M>
    readonly parameter: O
    readonly target: O
    readonly base: M
    readonly step: M
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export interface NaturalNumbersPrimitiveRecursionCompatibility<O, M> {
    readonly baseInclusion: M
    readonly baseComposite: M
    readonly successorInclusion: M
    readonly mediatorPair: M
    readonly stepLeft: M
    readonly stepRight: M
  }

  export interface NaturalNumbersPrimitiveRecursionWitness<O, M> {
    readonly holds: boolean
    readonly mediator: M
    readonly curried: NaturalNumbersObjectMediatorWitness<M>
    readonly sequence: NaturalNumbersObjectSequence<O, M>
    readonly compatibility: NaturalNumbersPrimitiveRecursionCompatibility<O, M>
    readonly details: string
    readonly reason?: string
  }

  export interface NaturalNumbersAdditionInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly natural: NaturalNumbersObjectWitness<O, M>
    readonly cartesianClosed: CartesianClosedCategory<O, M>
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export interface NaturalNumbersAdditionWitness<O, M> {
    readonly holds: boolean
    readonly addition: M
    readonly parameter: O
    readonly target: O
    readonly product: BinaryProductWithPairWitness<O, M>
    readonly base: M
    readonly step: M
    readonly primitive: NaturalNumbersPrimitiveRecursionWitness<O, M>
    readonly details: string
    readonly reason?: string
  }

  export interface IntegerCompletionCrossedAdditionWitness<M> {
    readonly left: M
    readonly right: M
    readonly leftPair: M
    readonly rightPair: M
  }

  export interface IntegerCompletionRelationLegs<M> {
    readonly left: M
    readonly right: M
  }

  export interface IntegerCompletionCompositeWitness<M> {
    readonly left: M
    readonly right: M
  }

  export interface IntegerCompletionRelationWitness<O, M> {
    readonly ambient: BinaryProductWithPairWitness<O, M>
    readonly equalizer: { readonly obj: O; readonly inclusion: M }
    readonly crossed: IntegerCompletionCrossedAdditionWitness<M>
    readonly legs: IntegerCompletionRelationLegs<M>
    readonly compatibility: IntegerCompletionCompositeWitness<M>
  }

  export interface IntegerCompletionQuotientWitness<O, M> {
    readonly obj: O
    readonly coequalize: M
    readonly compatibility: IntegerCompletionCompositeWitness<M>
  }

  export interface IntegerCompletionInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly natural: NaturalNumbersObjectWitness<O, M>
    readonly addition: NaturalNumbersAdditionWitness<O, M>
    readonly products: HasProductMediators<O, M>
    readonly equalizers: HasEqualizers<O, M>
    readonly coequalizers: HasCoequalizers<O, M>
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export interface IntegerCompletionWitness<O, M> {
    readonly holds: boolean
    readonly integers: O
    readonly addition: NaturalNumbersAdditionWitness<O, M>
    readonly relation: IntegerCompletionRelationWitness<O, M>
    readonly quotient: IntegerCompletionQuotientWitness<O, M>
    readonly details: string
    readonly reason?: string
  }

  export interface NaturalNumbersPrimitiveRecursionExponentialInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly natural: NaturalNumbersObjectWitness<O, M>
    readonly cartesianClosed: CartesianClosedCategory<O, M>
    readonly parameter: O
    readonly target: O
    readonly base: M
    readonly step: M
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export interface NaturalNumbersPrimitiveRecursionExponentialEvaluation<M> {
    readonly lift: M
    readonly pair: M
    readonly composite: M
  }

  export interface NaturalNumbersPrimitiveRecursionExponentialWitness<O, M> {
    readonly holds: boolean
    readonly mediator: M
    readonly primitive: NaturalNumbersPrimitiveRecursionWitness<O, M>
    readonly evaluation: NaturalNumbersPrimitiveRecursionExponentialEvaluation<M>
    readonly details: string
    readonly reason?: string
  }

  export interface NaturalNumbersInitialAlgebraCoproduct<O, M> {
    readonly obj: O
    readonly injections: readonly [M, M]
  }

  export interface NaturalNumbersInitialAlgebraCanonical<O, M> {
    readonly coproduct: NaturalNumbersInitialAlgebraCoproduct<O, M>
    readonly algebra: M
  }

  export interface NaturalNumbersInitialAlgebraTarget<O, M> {
    readonly coproduct: NaturalNumbersInitialAlgebraCoproduct<O, M>
    readonly algebra: M
    readonly zero: M
    readonly successor: M
  }

  export interface NaturalNumbersInitialAlgebraTriangleWitness<M> {
    readonly holds: boolean
    readonly expected: M
    readonly actual: M
  }

  export interface NaturalNumbersInitialAlgebraComparisonWitness<M> {
    readonly canonicalComposite: M
    readonly targetComposite: M
    readonly holds: boolean
  }

  export interface NaturalNumbersInitialAlgebraMorphismWitness<M> {
    readonly onePlusMediator: M
    readonly zeroTriangle: NaturalNumbersInitialAlgebraTriangleWitness<M>
    readonly successorSquare: NaturalNumbersInitialAlgebraTriangleWitness<M>
    readonly comparison: NaturalNumbersInitialAlgebraComparisonWitness<M>
  }

  export interface NaturalNumbersInitialAlgebraWitness<O, M> {
    readonly holds: boolean
    readonly canonical: NaturalNumbersInitialAlgebraCanonical<O, M>
    readonly target?: NaturalNumbersInitialAlgebraTarget<O, M>
    readonly mediator?: M
    readonly primitive?: NaturalNumbersObjectMediatorWitness<M>
    readonly morphism?: NaturalNumbersInitialAlgebraMorphismWitness<M>
    readonly reason?: string
    readonly details: string
  }

  export interface NaturalNumbersInitialAlgebraInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M> & HasTerminal<O, M>
    readonly natural: NaturalNumbersObjectWitness<O, M>
    readonly coproducts: HasCoproductMediators<O, M>
    readonly target: O
    readonly algebra: M
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export const naturalNumbersPrimitiveRecursion = <O, M>({
    category,
    natural,
    cartesianClosed,
    parameter,
    target,
    base,
    step,
    equalMor,
    label,
  }: NaturalNumbersPrimitiveRecursionInput<O, M>): NaturalNumbersPrimitiveRecursionWitness<O, M> => {
    const eq =
      equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const toBinaryProduct = (
      witness: ReturnType<CartesianClosedCategory<O, M>['binaryProduct']>,
    ): BinaryProductWithPairWitness<O, M> => ({
      obj: witness.obj,
      projections: [witness.proj1, witness.proj2] as const,
      pair: (domain: O, leftArrow: M, rightArrow: M) => witness.pair(domain, leftArrow, rightArrow),
    })

    const exponentialWitness = cartesianClosed.exponential(parameter, target)
    const exponentialProduct = toBinaryProduct(exponentialWitness.product)

    if (category.dom(base) !== parameter) {
      throw new Error(
        'CategoryLimits.naturalNumbersPrimitiveRecursion: base arrow must originate from the parameter object.',
      )
    }
    if (category.cod(base) !== target) {
      throw new Error(
        'CategoryLimits.naturalNumbersPrimitiveRecursion: base arrow must land in the target object.',
      )
    }

    const targetParameterProduct = toBinaryProduct(cartesianClosed.binaryProduct(target, parameter))
    if (category.dom(step) !== targetParameterProduct.obj) {
      throw new Error(
        'CategoryLimits.naturalNumbersPrimitiveRecursion: step arrow must originate from the target-parameter product.',
      )
    }
    if (category.cod(step) !== target) {
      throw new Error(
        'CategoryLimits.naturalNumbersPrimitiveRecursion: step arrow must land in the target object.',
      )
    }

    const terminalObj = cartesianClosed.terminal.obj
    const parameterUnitProduct = toBinaryProduct(cartesianClosed.binaryProduct(terminalObj, parameter))
    const zeroLift = category.compose(base, parameterUnitProduct.projections[1])
    const zeroArrow = exponentialWitness.curry(terminalObj, zeroLift)

    const evaluationPair = targetParameterProduct.pair(
      exponentialProduct.obj,
      exponentialWitness.evaluation,
      exponentialProduct.projections[1],
    )
    const successorLift = category.compose(step, evaluationPair)
    const successorArrow = exponentialWitness.curry(exponentialWitness.obj, successorLift)

    const sequence: NaturalNumbersObjectSequence<O, M> = {
      target: exponentialWitness.obj,
      zero: zeroArrow,
      successor: successorArrow,
    }

    const curried = natural.induce(sequence)
    const mediator = exponentialWitness.uncurry(natural.carrier, curried.mediator)

    const naturalParameterProduct = toBinaryProduct(cartesianClosed.binaryProduct(natural.carrier, parameter))
    const terminateParameter = cartesianClosed.terminal.terminate(parameter)
    const zeroOnParameter = category.compose(natural.zero, terminateParameter)
    const baseInclusion = naturalParameterProduct.pair(
      parameter,
      zeroOnParameter,
      category.id(parameter),
    )
    const baseComposite = category.compose(mediator, baseInclusion)

    const successorInclusion = naturalParameterProduct.pair(
      naturalParameterProduct.obj,
      category.compose(natural.successor, naturalParameterProduct.projections[0]),
      naturalParameterProduct.projections[1],
    )
    const stepLeft = category.compose(mediator, successorInclusion)

    const mediatorPair = targetParameterProduct.pair(
      naturalParameterProduct.obj,
      mediator,
      naturalParameterProduct.projections[1],
    )
    const stepRight = category.compose(step, mediatorPair)

    const baseMatches = eq(baseComposite, base)
    const stepMatches = eq(stepLeft, stepRight)

    const holds = baseMatches && stepMatches
    const labelPrefix = label
      ? `CategoryLimits.naturalNumbersPrimitiveRecursion: ${label}`
      : 'CategoryLimits.naturalNumbersPrimitiveRecursion'

    let reason: string | undefined
    if (!holds) {
      reason = !baseMatches
        ? `${labelPrefix}: base case fails to match the supplied arrow.`
        : `${labelPrefix}: step case fails to respect the recursive equation.`
    }

    const details = holds
      ? `${labelPrefix}: primitive recursion mediates the advertised arrow.`
      : `${labelPrefix}: primitive recursion equations do not hold.`

    const compatibility: NaturalNumbersPrimitiveRecursionCompatibility<O, M> = {
      baseInclusion,
      baseComposite,
      successorInclusion,
      mediatorPair,
      stepLeft,
      stepRight,
    }

    return {
      holds,
      mediator,
      curried,
      sequence,
      compatibility,
      details,
      ...(reason ? { reason } : {}),
    }
  }

  export const naturalNumbersAddition = <O, M>({
    category,
    natural,
    cartesianClosed,
    equalMor,
    label,
  }: NaturalNumbersAdditionInput<O, M>): NaturalNumbersAdditionWitness<O, M> => {
    const parameter = natural.carrier
    const target = natural.carrier

    const productWitness = cartesianClosed.binaryProduct(target, parameter)
    const product: BinaryProductWithPairWitness<O, M> = {
      obj: productWitness.obj,
      projections: [productWitness.proj1, productWitness.proj2],
      pair: (domain: O, left: M, right: M) =>
        productWitness.pair(domain, left, right),
    }

    const base = category.id(parameter)
    const step = category.compose(natural.successor, product.projections[0])

    const primitive = naturalNumbersPrimitiveRecursion({
      category,
      natural,
      cartesianClosed,
      parameter,
      target,
      base,
      step,
      ...(equalMor ? { equalMor } : {}),
      label: label ? `${label} addition` : "addition",
    });

    const holds = primitive.holds
    const labelPrefix = label
      ? `CategoryLimits.naturalNumbersAddition: ${label}`
      : 'CategoryLimits.naturalNumbersAddition'

    const details = holds
      ? `${labelPrefix}: addition arrow satisfies primitive recursion.`
      : `${labelPrefix}: addition arrow fails primitive recursion.`

    return {
      holds,
      addition: primitive.mediator,
      parameter,
      target,
      product,
      base,
      step,
      primitive,
      details,
      ...(primitive.reason ? { reason: primitive.reason } : {}),
    }
  }

  export const integerCompletion = <O, M>({
    category,
    natural,
    addition,
    products,
    equalizers,
    coequalizers,
    equalMor,
    label,
  }: IntegerCompletionInput<O, M>): IntegerCompletionWitness<O, M> => {
    const labelPrefix = label
      ? `CategoryLimits.integerCompletion: ${label}`
      : 'CategoryLimits.integerCompletion'

    const relationProductRaw = products.product([
      addition.product.obj,
      addition.product.obj,
    ])

    if (relationProductRaw.projections.length !== 2) {
      throw new Error(
        `${labelPrefix}: expected binary product witness for (ℕ×ℕ)×(ℕ×ℕ).`,
      )
    }

    const relationAmbient: BinaryProductWithPairWitness<O, M> = {
      obj: relationProductRaw.obj,
      projections: [
        relationProductRaw.projections[0]!,
        relationProductRaw.projections[1]!,
      ],
      pair: (domain: O, leftArrow: M, rightArrow: M) =>
        products.tuple(domain, [leftArrow, rightArrow], relationProductRaw.obj),
    }

    const [ambientLeft, ambientRight] = relationAmbient.projections

    const additionFirst = addition.product.projections[0]!
    const additionSecond = addition.product.projections[1]!

    const crossedLeftPair = addition.product.pair(
      relationAmbient.obj,
      category.compose(additionFirst, ambientLeft),
      category.compose(additionSecond, ambientRight),
    )

    const crossedRightPair = addition.product.pair(
      relationAmbient.obj,
      category.compose(additionFirst, ambientRight),
      category.compose(additionSecond, ambientLeft),
    )

    const crossedLeft = category.compose(addition.addition, crossedLeftPair)
    const crossedRight = category.compose(addition.addition, crossedRightPair)

    const equalizer = equalizers.equalizer(crossedLeft, crossedRight)

    const relationLeftLeg = category.compose(ambientLeft, equalizer.equalize)
    const relationRightLeg = category.compose(ambientRight, equalizer.equalize)

    const quotient = coequalizers.coequalizer(relationLeftLeg, relationRightLeg)

    const equalizerCompatibility: IntegerCompletionCompositeWitness<M> = {
      left: category.compose(crossedLeft, equalizer.equalize),
      right: category.compose(crossedRight, equalizer.equalize),
    }

    const quotientCompatibility: IntegerCompletionCompositeWitness<M> = {
      left: category.compose(quotient.coequalize, relationLeftLeg),
      right: category.compose(quotient.coequalize, relationRightLeg),
    }

    const equalityChecked = equalMor !== undefined

    const relationAgrees = !equalMor
      ? true
      : equalMor(equalizerCompatibility.left, equalizerCompatibility.right)

    const coequalizes = !equalMor
      ? true
      : equalMor(quotientCompatibility.left, quotientCompatibility.right)

    const holds = addition.holds && relationAgrees && coequalizes

    let reason: string | undefined
    if (!addition.holds) {
      reason =
        addition.reason ??
        `${labelPrefix}: addition witness failed to satisfy primitive recursion.`
    } else if (equalMor && !relationAgrees) {
      reason = `${labelPrefix}: crossed addition composites disagree on the equalizer inclusion.`
    } else if (equalMor && !coequalizes) {
      reason = `${labelPrefix}: quotient arrow does not coequalize the crossed addition relation.`
    }

    const details = holds
      ? equalityChecked
        ? `${labelPrefix}: integers object quotients ℕ×ℕ by the crossed addition relation.`
        : `${labelPrefix}: integers object constructed without arrow-equality diagnostics.`
      : reason ?? `${labelPrefix}: integer completion witness failed.`

    return {
      holds,
      integers: quotient.obj,
      addition,
      relation: {
        ambient: relationAmbient,
        equalizer: { obj: equalizer.obj, inclusion: equalizer.equalize },
        crossed: {
          left: crossedLeft,
          right: crossedRight,
          leftPair: crossedLeftPair,
          rightPair: crossedRightPair,
        },
        legs: {
          left: relationLeftLeg,
          right: relationRightLeg,
        },
        compatibility: equalizerCompatibility,
      },
      quotient: {
        obj: quotient.obj,
        coequalize: quotient.coequalize,
        compatibility: quotientCompatibility,
      },
      details,
      ...(reason ? { reason } : {}),
    }
  }

  export const naturalNumbersPrimitiveRecursionFromExponential = <O, M>({
    category,
    natural,
    cartesianClosed,
    parameter,
    target,
    base,
    step,
    equalMor,
    label,
  }: NaturalNumbersPrimitiveRecursionExponentialInput<O, M>): NaturalNumbersPrimitiveRecursionExponentialWitness<O, M> => {
    const toBinaryProduct = (
      witness: ReturnType<CartesianClosedCategory<O, M>['binaryProduct']>,
    ): BinaryProductWithPairWitness<O, M> => ({
      obj: witness.obj,
      projections: [witness.proj1, witness.proj2] as const,
      pair: (domain: O, leftArrow: M, rightArrow: M) => witness.pair(domain, leftArrow, rightArrow),
    })

    const exponentialWitness = cartesianClosed.exponential(parameter, target)
    const exponentialProduct = toBinaryProduct(exponentialWitness.product)

    if (category.dom(step) !== target) {
      throw new Error(
        'CategoryLimits.naturalNumbersPrimitiveRecursionFromExponential: step arrow must originate from the target object.',
      )
    }
    if (category.cod(step) !== exponentialWitness.obj) {
      throw new Error(
        'CategoryLimits.naturalNumbersPrimitiveRecursionFromExponential: step arrow must land in the exponential object.',
      )
    }

    const targetParameterProduct = toBinaryProduct(cartesianClosed.binaryProduct(target, parameter))
    const stepLift = category.compose(step, targetParameterProduct.projections[0])
    const evaluationPair = exponentialProduct.pair(
      targetParameterProduct.obj,
      stepLift,
      targetParameterProduct.projections[1],
    )
    const evaluationComposite = category.compose(exponentialWitness.evaluation, evaluationPair)

    const primitive = naturalNumbersPrimitiveRecursion({
      category,
      natural,
      cartesianClosed,
      parameter,
      target,
      base,
      step: evaluationComposite,
      ...(equalMor !== undefined ? { equalMor } : {}),
      ...(label !== undefined ? { label: `${label} (via exponential)` } : {}),
    })

    const holds = primitive.holds
    const evaluation: NaturalNumbersPrimitiveRecursionExponentialEvaluation<M> = {
      lift: stepLift,
      pair: evaluationPair,
      composite: evaluationComposite,
    }

    const qualifier = label
      ? `CategoryLimits.naturalNumbersPrimitiveRecursionFromExponential: ${label}`
      : 'CategoryLimits.naturalNumbersPrimitiveRecursionFromExponential'

    const details = holds
      ? `${qualifier}: recursion via exponential transpose constructs the advertised mediator.`
      : `${qualifier}: recursion via exponential transpose fails to satisfy primitive recursion.`

    const result: NaturalNumbersPrimitiveRecursionExponentialWitness<O, M> = {
      holds,
      mediator: primitive.mediator,
      primitive,
      evaluation,
      details,
    }

    return primitive.reason ? { ...result, reason: primitive.reason } : result
  }

  export const naturalNumbersInitialAlgebra = <O, M>({
    category,
    natural,
    coproducts,
    target,
    algebra,
    equalMor,
    label,
  }: NaturalNumbersInitialAlgebraInput<O, M>): NaturalNumbersInitialAlgebraWitness<O, M> => {
    const eq =
      equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const qualifier = label
      ? `CategoryLimits.naturalNumbersInitialAlgebra: ${label}`
      : 'CategoryLimits.naturalNumbersInitialAlgebra'

    const canonicalCoproductRaw = coproducts.coproduct([
      category.terminalObj,
      natural.carrier,
    ])

    if (canonicalCoproductRaw.injections.length !== 2) {
      throw new Error(
        `${qualifier}: coproduct of the terminal object and natural numbers carrier must expose two injections.`,
      )
    }

    const canonicalInjections = canonicalCoproductRaw.injections as readonly [M, M]
    const canonical: NaturalNumbersInitialAlgebraCanonical<O, M> = {
      coproduct: { obj: canonicalCoproductRaw.obj, injections: canonicalInjections },
      algebra: coproducts.cotuple(
        canonicalCoproductRaw.obj,
        [natural.zero, natural.successor],
        natural.carrier,
      ),
    }

    const targetCoproductRaw = coproducts.coproduct([
      category.terminalObj,
      target,
    ])

    if (targetCoproductRaw.injections.length !== 2) {
      throw new Error(
        `${qualifier}: coproduct of the terminal object and target must expose two injections.`,
      )
    }

    const targetInjections = targetCoproductRaw.injections as readonly [M, M]

    if (category.dom(algebra) !== targetCoproductRaw.obj) {
      return {
        holds: false,
        canonical,
        details: `${qualifier}: algebra arrow must originate from the coproduct of the terminal object and target.`,
        reason: `${qualifier}: supplied algebra domain does not match the canonical coproduct.`,
      }
    }

    const zeroArrow = category.compose(algebra, targetInjections[0])
    const successorArrow = category.compose(algebra, targetInjections[1])

    if (category.cod(algebra) !== target) {
      return {
        holds: false,
        canonical,
        target: {
          coproduct: { obj: targetCoproductRaw.obj, injections: targetInjections },
          algebra,
          zero: zeroArrow,
          successor: successorArrow,
        },
        details: `${qualifier}: algebra arrow must land in the advertised target object.`,
        reason: `${qualifier}: supplied algebra codomain does not match the target.`,
      }
    }

    if (category.dom(targetInjections[0]) !== category.terminalObj) {
      throw new Error(
        `${qualifier}: coproduct injection for the terminal summand must originate from the terminal object.`,
      )
    }

    if (category.dom(targetInjections[1]) !== target) {
      throw new Error(
        `${qualifier}: coproduct injection for the target summand must originate from the target object.`,
      )
    }

    const targetData: NaturalNumbersInitialAlgebraTarget<O, M> = {
      coproduct: { obj: targetCoproductRaw.obj, injections: targetInjections },
      algebra,
      zero: zeroArrow,
      successor: successorArrow,
    }

    const sequence: NaturalNumbersObjectSequence<O, M> = {
      target,
      zero: zeroArrow,
      successor: successorArrow,
    }

    const primitive = natural.induce(sequence)

    const zeroTriangleHolds = eq(primitive.compatibility.zeroComposite, zeroArrow)
    const successorSquareHolds = eq(
      primitive.compatibility.successorLeft,
      primitive.compatibility.successorRight,
    )

    const onePlusMediator = coproducts.cotuple(
      canonical.coproduct.obj,
      [targetInjections[0], category.compose(targetInjections[1], primitive.mediator)],
      targetCoproductRaw.obj,
    )

    const canonicalComposite = category.compose(primitive.mediator, canonical.algebra)
    const targetComposite = category.compose(algebra, onePlusMediator)
    const comparisonHolds = eq(canonicalComposite, targetComposite)

    const morphism: NaturalNumbersInitialAlgebraMorphismWitness<M> = {
      onePlusMediator,
      zeroTriangle: {
        holds: zeroTriangleHolds,
        expected: zeroArrow,
        actual: primitive.compatibility.zeroComposite,
      },
      successorSquare: {
        holds: successorSquareHolds,
        expected: primitive.compatibility.successorRight,
        actual: primitive.compatibility.successorLeft,
      },
      comparison: {
        canonicalComposite,
        targetComposite,
        holds: comparisonHolds,
      },
    }

    const holds = zeroTriangleHolds && successorSquareHolds && comparisonHolds

    let reason: string | undefined
    if (!holds) {
      if (!zeroTriangleHolds) {
        reason = `${qualifier}: mediator does not respect the algebra's zero leg.`
      } else if (!successorSquareHolds) {
        reason = `${qualifier}: mediator does not commute with the algebra's successor leg.`
      } else {
        reason = `${qualifier}: induced algebra morphism square fails to commute.`
      }
    }

    const details = holds
      ? `${qualifier}: induced mediator realises the unique algebra morphism from 1 + ℕ.`
      : `${qualifier}: induced mediator fails to witness the initial algebra.`

    const result: NaturalNumbersInitialAlgebraWitness<O, M> = {
      holds,
      canonical,
      target: targetData,
      mediator: primitive.mediator,
      primitive,
      morphism,
      details,
    }

    return reason ? { ...result, reason } : result
  }

  export const certifyNaturalNumbersInduction = <O, M>({
    category,
    natural,
    inclusion,
    zeroLift,
    successorLift,
    equalMor,
    ensureMonomorphism,
    label,
  }: NaturalNumbersInductionInput<O, M>): NaturalNumbersInductionWitness<M> => {
    const eq =
      equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const qualifier = label
      ? `CategoryLimits.certifyNaturalNumbersInduction: ${label}`
      : 'CategoryLimits.certifyNaturalNumbersInduction'

    if (category.cod(inclusion) !== natural.carrier) {
      throw new Error(
        `${qualifier}: inclusion must land in the natural numbers carrier.`,
      )
    }

    const domain = category.dom(inclusion)

    if (category.dom(zeroLift) !== category.terminalObj) {
      throw new Error(
        `${qualifier}: zero lift must originate from the terminal object.`,
      )
    }

    if (category.cod(zeroLift) !== domain) {
      throw new Error(
        `${qualifier}: zero lift must land in the subobject domain.`,
      )
    }

    if (category.dom(successorLift) !== domain) {
      throw new Error(
        `${qualifier}: successor lift must originate in the subobject domain.`,
      )
    }

    if (category.cod(successorLift) !== domain) {
      throw new Error(
        `${qualifier}: successor lift must land in the subobject domain.`,
      )
    }

    const zeroComposite = category.compose(inclusion, zeroLift)
    const successorLeft = category.compose(inclusion, successorLift)
    const successorRight = category.compose(natural.successor, inclusion)

    const compatibility: NaturalNumbersInductionCompatibility<M> = {
      zeroComposite,
      successorLeft,
      successorRight,
    }

    if (!eq(zeroComposite, natural.zero)) {
      return {
        holds: false,
        inclusion,
        compatibility,
        monomorphismCertified: false,
        details: `${qualifier} fails because the lifted zero does not match the canonical zero.`,
        reason: `${qualifier}: lifted zero fails to coincide with the natural numbers zero.`,
      }
    }

    if (!eq(successorLeft, successorRight)) {
      return {
        holds: false,
        inclusion,
        compatibility,
        monomorphismCertified: false,
        details: `${qualifier} fails because the lifted successor is not preserved by the inclusion.`,
        reason: `${qualifier}: inclusion and lifted successor do not commute.`,
      }
    }

    let monomorphismCertified = false
    if (ensureMonomorphism) {
      try {
        ensureMonomorphism(inclusion)
        monomorphismCertified = true
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        return {
          holds: false,
          inclusion,
          compatibility,
          monomorphismCertified: false,
          details: `${qualifier} fails monomorphism validation.`,
          reason: `${qualifier}: ${reason}`,
        }
      }
    }

    const sequence: NaturalNumbersObjectSequence<O, M> = {
      target: domain,
      zero: zeroLift,
      successor: successorLift,
    }

    const mediator = natural.induce(sequence)
    const retraction = mediator.mediator
    const rightComposite = category.compose(inclusion, retraction)

    const identitySequence = naturalNumbersObjectSequenceFromWitness(natural)
    const identityVerdict = naturalNumbersObjectCandidateVerdict({
      category,
      natural,
      sequence: identitySequence,
      candidate: rightComposite,
      ...(equalMor ? { equalMor } : {}),
    })

    if (!identityVerdict.agrees) {
      const failureReason =
        identityVerdict.reason ??
        `${qualifier}: induced retraction does not agree with the natural numbers identity.`
      return {
        holds: false,
        inclusion,
        compatibility,
        retraction,
        rightComposite,
        identityVerdict,
        monomorphismCertified,
        details: `${qualifier} fails because the induced retraction does not recover the natural numbers identity.`,
        reason: failureReason,
      }
    }

    const section = category.compose(retraction, inclusion)
    const identityOnSubobject = category.id(domain)
    const leftMatches = eq(section, identityOnSubobject)
    const anchored = eq(category.compose(inclusion, section), inclusion)

    if (!leftMatches && !(monomorphismCertified && anchored)) {
      return {
        holds: false,
        inclusion,
        compatibility,
        retraction,
        rightComposite,
        section,
        identityVerdict,
        monomorphismCertified,
        details: `${qualifier} fails because the induced section does not collapse to the subobject identity.`,
        reason: `${qualifier}: unable to confirm that the inclusion retracts onto its domain.`,
      }
    }

    return {
      holds: true,
      inclusion,
      compatibility,
      retraction,
      rightComposite,
      section,
      identityVerdict,
      monomorphismCertified,
      details: `${qualifier}: inclusion is an isomorphism onto the natural numbers object.`,
    }
  }

  export interface PointImageWitness<M> {
    readonly point: M
    readonly image: M
  }

  export interface PointCollisionWitness<M> {
    readonly left: PointImageWitness<M>
    readonly right: PointImageWitness<M>
  }

  export interface PointInjectiveInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M> & HasTerminal<O, M>
    readonly arrow: M
    readonly domainPoints: ReadonlyArray<M>
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export interface PointInjectiveWitness<M> {
    readonly holds: boolean
    readonly images: ReadonlyArray<PointImageWitness<M>>
    readonly collision?: PointCollisionWitness<M>
    readonly details: string
  }

  export const checkPointInjective = <O, M>({
    category,
    arrow,
    domainPoints,
    equalMor,
    label,
  }: PointInjectiveInput<O, M>): PointInjectiveWitness<M> => {
    const eq =
      equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const domain = category.dom(arrow)

    const composites = domainPoints.map((point) => {
      if (category.dom(point) !== category.terminalObj) {
        throw new Error(
          'CategoryLimits.checkPointInjective: supplied point must originate from the terminal object.',
        )
      }
      if (category.cod(point) !== domain) {
        throw new Error(
          'CategoryLimits.checkPointInjective: supplied point must land in the arrow domain.',
        )
      }
      return {
        point,
        image: category.compose(arrow, point),
      }
    })

    let collision: PointCollisionWitness<M> | undefined
    for (let leftIndex = 0; leftIndex < composites.length; leftIndex++) {
      for (let rightIndex = leftIndex + 1; rightIndex < composites.length; rightIndex++) {
        const left = composites[leftIndex]!
        const right = composites[rightIndex]!

        if (eq(left.image, right.image) && !eq(left.point, right.point)) {
          collision = { left, right }
          break
        }
      }
      if (collision) {
        break
      }
    }

    if (collision) {
      return {
        holds: false,
        images: composites,
        collision,
        details:
          label
            ? `CategoryLimits.checkPointInjective: ${label} is not point-injective.`
            : 'CategoryLimits.checkPointInjective: arrow is not point-injective.',
      }
    }

    return {
      holds: true,
      images: composites,
      details:
        label
          ? `CategoryLimits.checkPointInjective: ${label} is injective on global points.`
          : 'CategoryLimits.checkPointInjective: arrow is injective on global points.',
    }
  }

  export interface PointSurjectiveInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M> & HasTerminal<O, M>
    readonly arrow: M
    readonly domainPoints: ReadonlyArray<M>
    readonly codomainPoints: ReadonlyArray<M>
    readonly equalMor?: (left: M, right: M) => boolean
    readonly label?: string
  }

  export interface PointCoverageWitness<M> {
    readonly target: M
    readonly preimages: ReadonlyArray<PointImageWitness<M>>
  }

  export interface PointSurjectiveWitness<M> {
    readonly holds: boolean
    readonly coverage: ReadonlyArray<PointCoverageWitness<M>>
    readonly missing?: M
    readonly details: string
  }

  export const checkPointSurjective = <O, M>({
    category,
    arrow,
    domainPoints,
    codomainPoints,
    equalMor,
    label,
  }: PointSurjectiveInput<O, M>): PointSurjectiveWitness<M> => {
    const eq =
      equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const domain = category.dom(arrow)
    const codomain = category.cod(arrow)

    const composites = domainPoints.map((point) => {
      if (category.dom(point) !== category.terminalObj) {
        throw new Error(
          'CategoryLimits.checkPointSurjective: supplied point must originate from the terminal object.',
        )
      }
      if (category.cod(point) !== domain) {
        throw new Error(
          'CategoryLimits.checkPointSurjective: supplied point must land in the arrow domain.',
        )
      }
      return {
        point,
        image: category.compose(arrow, point),
      }
    })

    const coverage = codomainPoints.map((target) => {
      if (category.dom(target) !== category.terminalObj) {
        throw new Error(
          'CategoryLimits.checkPointSurjective: codomain point must originate from the terminal object.',
        )
      }
      if (category.cod(target) !== codomain) {
        throw new Error(
          'CategoryLimits.checkPointSurjective: codomain point must land in the arrow codomain.',
        )
      }

      const preimages = composites.filter((entry) => eq(entry.image, target))
      return { target, preimages }
    })

    const missing = coverage.find((entry) => entry.preimages.length === 0)

    if (missing) {
      return {
        holds: false,
        coverage,
        missing: missing.target,
        details:
          label
            ? `CategoryLimits.checkPointSurjective: ${label} misses a point.`
            : 'CategoryLimits.checkPointSurjective: arrow misses a point.',
      }
    }

    return {
      holds: true,
      coverage,
      details:
        label
          ? `CategoryLimits.checkPointSurjective: ${label} is surjective on global points.`
          : 'CategoryLimits.checkPointSurjective: arrow is surjective on global points.',
    }
  }

  export interface PointInfiniteInput<O, M> {
    readonly injection: PointInjectiveInput<O, M>
    readonly surjection: PointSurjectiveInput<O, M>
  }

  export interface PointInfiniteWitness<M> {
    readonly holds: boolean
    readonly injective: PointInjectiveWitness<M>
    readonly surjective: PointSurjectiveWitness<M>
    readonly details: string
  }

  export const checkPointInfinite = <O, M>({
    injection,
    surjection,
  }: PointInfiniteInput<O, M>): PointInfiniteWitness<M> => {
    const eq =
      injection.equalMor ??
      surjection.equalMor ??
      injection.category.equalMor ??
      injection.category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    if (!eq(injection.arrow, surjection.arrow)) {
      throw new Error(
        'CategoryLimits.checkPointInfinite: injection and surjection must analyse the same arrow.',
      )
    }

    const injective = checkPointInjective(injection)
    const surjective = checkPointSurjective(surjection)

    if (!injective.holds) {
      return {
        holds: false,
        injective,
        surjective,
        details: 'CategoryLimits.checkPointInfinite: arrow fails to be point-injective.',
      }
    }

    if (surjective.holds) {
      return {
        holds: false,
        injective,
        surjective,
        details: 'CategoryLimits.checkPointInfinite: arrow remains point-surjective.',
      }
    }

    return {
      holds: true,
      injective,
      surjective,
      details: 'CategoryLimits.checkPointInfinite: arrow is point-injective and omits a global point.',
    }
  }

  export interface DedekindInfiniteInput<O, M> {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M> & HasTerminal<O, M>
    readonly arrow: M
    readonly domainPoints: ReadonlyArray<M>
    readonly codomainPoints: ReadonlyArray<M>
    readonly equalMor?: (left: M, right: M) => boolean
    readonly ensureMonomorphism?: (arrow: M) => void
    readonly label?: string
  }

  export interface DedekindInfiniteWitness<M> {
    readonly holds: boolean
    readonly pointInfinite: PointInfiniteWitness<M>
    readonly monomorphismCertified: boolean
    readonly details: string
  }

  export const checkDedekindInfinite = <O, M>({
    category,
    arrow,
    domainPoints,
    codomainPoints,
    equalMor,
    ensureMonomorphism,
    label,
  }: DedekindInfiniteInput<O, M>): DedekindInfiniteWitness<M> => {
    const domain = category.dom(arrow)
    const codomain = category.cod(arrow)

    if (domain !== codomain) {
      throw new Error('CategoryLimits.checkDedekindInfinite: supplied arrow must be an endomorphism.')
    }

    const injectionInput: PointInjectiveInput<O, M> = {
      category,
      arrow,
      domainPoints,
      ...(equalMor ? { equalMor } : {}),
      ...(label !== undefined ? { label } : {}),
    }

    const surjectionInput: PointSurjectiveInput<O, M> = {
      category,
      arrow,
      domainPoints,
      codomainPoints,
      ...(equalMor ? { equalMor } : {}),
      ...(label !== undefined ? { label } : {}),
    }

    const pointInfinite = checkPointInfinite({
      injection: injectionInput,
      surjection: surjectionInput,
    })

    if (!pointInfinite.holds) {
      return {
        holds: false,
        pointInfinite,
        monomorphismCertified: false,
        details:
          label
            ? `CategoryLimits.checkDedekindInfinite: ${label} does not witness point infiniteness.`
            : 'CategoryLimits.checkDedekindInfinite: arrow does not witness point infiniteness.',
      }
    }

    let monomorphismCertified = false
    if (ensureMonomorphism) {
      try {
        ensureMonomorphism(arrow)
        monomorphismCertified = true
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        return {
          holds: false,
          pointInfinite,
          monomorphismCertified: false,
          details:
            label
              ? `CategoryLimits.checkDedekindInfinite: ${label} failed monomorphism validation: ${reason}`
              : `CategoryLimits.checkDedekindInfinite: monomorphism validation failed: ${reason}`,
        }
      }
    }

    return {
      holds: true,
      pointInfinite,
      monomorphismCertified,
      details:
        label
          ? `CategoryLimits.checkDedekindInfinite: ${label} witnesses Dedekind infiniteness.`
          : 'CategoryLimits.checkDedekindInfinite: arrow witnesses Dedekind infiniteness.',
    }
  }

  export interface SubobjectClassifierFromPowerObjectInput<O, M> {
    readonly category: Category<O, M> &
      ArrowFamilies.HasDomCod<O, M> &
      HasTerminal<O, M> &
      HasInitial<O, M>
    readonly pullbacks: PullbackCalculator<O, M>
    readonly powerObject: (anchor: O) => PowerObjectWitness<O, M>
    readonly binaryProduct: (
      left: O,
      right: O,
    ) => BinaryProductWithPairWitness<O, M>
    readonly ensureMonomorphism?: (arrow: M) => void
    readonly terminate?: (object: O) => M
    readonly initialArrow?: (target: O) => M
  }

  export const makeSubobjectClassifierFromPowerObject = <O, M>({
    category,
    pullbacks,
    powerObject,
    binaryProduct,
    ensureMonomorphism,
    terminate: suppliedTerminate,
    initialArrow: suppliedInitialArrow,
  }: SubobjectClassifierFromPowerObjectInput<O, M>): SubobjectClassifierCategory<O, M> => {
    const ensureMono = ensureMonomorphism ?? (() => undefined)

    const terminate =
      suppliedTerminate ??
      (category as Partial<{ terminate: (object: O) => M }>).terminate
    if (!terminate) {
      throw new Error(
        'CategoryLimits.makeSubobjectClassifierFromPowerObject: terminate arrow is required to build characteristic relations.',
      )
    }

    const initialArrow =
      suppliedInitialArrow ??
      (category as Partial<{ initialArrow: (target: O) => M }>).initialArrow
    if (!initialArrow) {
      throw new Error(
        'CategoryLimits.makeSubobjectClassifierFromPowerObject: initial arrow is required to construct the false point.',
      )
    }

    const terminal = category.terminalObj
    const initial = category.initialObj

    const terminalPower = powerObject(terminal)
    const truthValues = terminalPower.powerObj
    const membership = terminalPower.membership

    const terminalProduct = binaryProduct(terminal, terminal)

    const truthRelation = terminalProduct.pair(
      terminal,
      category.id(terminal),
      category.id(terminal),
    )
    ensureMono(truthRelation)

    const truthWitness = terminalPower.classify({
      ambient: terminal,
      relation: truthRelation,
      product: terminalProduct,
      pullbacks,
    })

    const truthArrow = truthWitness.mediator

    const falseRelation = terminalProduct.pair(
      initial,
      initialArrow(terminal),
      initialArrow(terminal),
    )
    ensureMono(falseRelation)

    const falseWitness = terminalPower.classify({
      ambient: terminal,
      relation: falseRelation,
      product: terminalProduct,
      pullbacks,
    })

    const falseArrow = falseWitness.mediator

    const characteristic = (monomorphism: M): M => {
      ensureMono(monomorphism)

      const ambient = category.cod(monomorphism)
      const domain = category.dom(monomorphism)

      const product = binaryProduct(ambient, terminal)
      const relation = product.pair(domain, monomorphism, terminate(domain))
      ensureMono(relation)

      const witness = terminalPower.classify({
        ambient,
        relation,
        product,
        pullbacks,
      })

      return witness.mediator
    }

    const subobjectFromCharacteristic = (
      chi: M,
    ): { readonly subobject: O; readonly inclusion: M } => {
      if (category.cod(chi) !== truthValues) {
        throw new Error(
          'CategoryLimits.makeSubobjectClassifierFromPowerObject: characteristic arrow must land in the derived truth object.',
        )
      }

      const ambient = category.dom(chi)

      const pairing = membership.product.pair(
        ambient,
        chi,
        terminate(ambient),
      )

      const pullback = pullbacks.pullback(pairing, membership.inclusion)
      const certification = pullbacks.certify(pairing, membership.inclusion, pullback)

      if (!certification.valid) {
        throw new Error(
          `CategoryLimits.makeSubobjectClassifierFromPowerObject: membership pullback failed certification: ${
            certification.reason ?? 'unknown reason'
          }`,
        )
      }

      return { subobject: pullback.apex, inclusion: pullback.toDomain }
    }

    const negation = characteristic(falseArrow)

    return {
      ...category,
      terminate,
      initialArrow,
      truthValues,
      truthArrow,
      falseArrow,
      negation,
      powerObject,
      characteristic,
      subobjectFromCharacteristic,
    }
  }

  export interface PowerObjectFromSubobjectClassifierInput<O, M> {
    readonly category: SubobjectClassifierCategory<O, M> &
      CartesianClosedCategory<O, M>
    readonly pullbacks: PullbackCalculator<O, M>
    readonly binaryProduct?: (
      left: O,
      right: O,
    ) => BinaryProductWithPairWitness<O, M>
    readonly ensureMonomorphism?: (arrow: M, context?: string) => void
    readonly makeIso?: (
      relation: M,
      canonical: M,
      context: string,
    ) => SubobjectClassifierIsoWitness<M>
    readonly equalMor?: (left: M, right: M) => boolean
  }

  export const makePowerObjectFromSubobjectClassifier = <O, M>({
    category,
    pullbacks,
    binaryProduct: suppliedBinaryProduct,
    ensureMonomorphism,
    makeIso,
    equalMor,
  }: PowerObjectFromSubobjectClassifierInput<O, M>): (anchor: O) => PowerObjectWitness<O, M> => {
    const ensureMono = ensureMonomorphism ?? (() => undefined)
    const eq =
      equalMor ??
      category.equalMor ??
      category.eq ??
      ((left: M, right: M) => Object.is(left, right))

    return (anchor: O): PowerObjectWitness<O, M> => {
      const exponential = category.exponential(anchor, category.truthValues)
      const membershipProduct: BinaryProductWithPairWitness<O, M> = {
        obj: exponential.product.obj,
        projections: [exponential.product.proj1, exponential.product.proj2],
        pair: (domain, leftArrow, rightArrow) =>
          exponential.product.pair(domain, leftArrow, rightArrow),
      }

      const membershipPullback = pullbacks.pullback(
        exponential.evaluation,
        category.truthArrow,
      )
      const membershipCertification = pullbacks.certify(
        exponential.evaluation,
        category.truthArrow,
        membershipPullback,
      )

      if (!membershipCertification.valid) {
        throw new Error(
          `CategoryLimits.makePowerObjectFromSubobjectClassifier: evaluation pullback failed certification: ${
            membershipCertification.reason ?? 'unknown reason'
          }`,
        )
      }

      const membership: PowerObjectMembershipWitness<O, M> = {
        subobject: membershipPullback.apex,
        inclusion: membershipPullback.toDomain,
        product: membershipProduct,
        evaluation: exponential.evaluation,
        pullback: membershipPullback,
        certification: membershipCertification,
      }

      return {
        anchor,
        powerObj: exponential.obj,
        membership,
        classify: ({ ambient, relation, product, pullbacks: calculator }) => {
          const canonicalProduct = suppliedBinaryProduct
            ? suppliedBinaryProduct(ambient, anchor)
            : product

          if (suppliedBinaryProduct) {
            const [expectedAmbient, expectedAnchor] = canonicalProduct.projections
            if (canonicalProduct.obj !== product.obj) {
              throw new Error(
                'CategoryLimits.makePowerObjectFromSubobjectClassifier.classify: supplied product witness must use the canonical ambient × anchor object.',
              )
            }
            if (!eq(expectedAmbient, product.projections[0]!)) {
              throw new Error(
                'CategoryLimits.makePowerObjectFromSubobjectClassifier.classify: supplied product witness must reproduce the canonical ambient projection.',
              )
            }
            if (!eq(expectedAnchor, product.projections[1]!)) {
              throw new Error(
                'CategoryLimits.makePowerObjectFromSubobjectClassifier.classify: supplied product witness must reproduce the canonical anchor projection.',
              )
            }
          }

          const [projectionToAmbient, projectionToAnchor] =
            canonicalProduct.projections
          const context =
            'CategoryLimits.makePowerObjectFromSubobjectClassifier.classify'

          if (category.cod(relation) !== canonicalProduct.obj) {
            throw new Error(
              `${context}: relation codomain must match the supplied product object.`,
            )
          }

          if (
            category.dom(projectionToAmbient) !== canonicalProduct.obj ||
            category.dom(projectionToAnchor) !== canonicalProduct.obj
          ) {
            throw new Error(
              `${context}: product projections must originate at the ambient product object.`,
            )
          }

          if (category.cod(projectionToAmbient) !== ambient) {
            throw new Error(
              `${context}: first projection must land in the ambient object.`,
            )
          }

          if (category.cod(projectionToAnchor) !== anchor) {
            throw new Error(
              `${context}: second projection must land in the anchor object.`,
            )
          }

          ensureMono(relation, context)

          const characteristic = category.characteristic(relation)

          if (category.dom(characteristic) !== canonicalProduct.obj) {
            throw new Error(
              `${context}: characteristic domain must equal the ambient product object.`,
            )
          }

          const mediator = exponential.curry(ambient, characteristic)
          const mediatorComposite = category.compose(
            mediator,
            projectionToAmbient,
          )

          const pairing = membership.product.pair(
            canonicalProduct.obj,
            mediatorComposite,
            projectionToAnchor,
          )

          const pullback = calculator.pullback(pairing, membership.inclusion)
          const certification = calculator.certify(
            pairing,
            membership.inclusion,
            pullback,
          )

          if (!certification.valid) {
            throw new Error(
              `${context}: induced pullback failed certification: ${
                certification.reason ?? 'unknown reason'
              }`,
            )
          }

          if (!makeIso) {
            throw new Error(
              `${context}: makeIso helper is required to compare classified relations with the canonical pullback.`,
            )
          }

          const iso = makeIso(relation, pullback.toDomain, context)

          const relationRecover = category.compose(pullback.toDomain, iso.forward)
          if (!eq(relationRecover, relation)) {
            throw new Error(
              `${context}: canonical pullback mediator does not reproduce the supplied relation.`,
            )
          }

          const relationAnchor = category.compose(pullback.toAnchor, iso.forward)
          const membershipComposite = category.compose(
            membership.inclusion,
            relationAnchor,
          )
          const pairingComposite = category.compose(pairing, relation)

          if (!eq(membershipComposite, pairingComposite)) {
            throw new Error(
              `${context}: relation square does not commute with membership inclusion.`,
            )
          }

          return {
            mediator,
            characteristic,
            pairing,
            pullback,
            certification,
            relationIso: iso,
            relationAnchor,
            factorCone: (candidate) => calculator.factorCone(pullback, candidate),
          }
        },
      }
    }
  }

  export const subobjectClassifierFalseArrow = <O, M>(
    category: SubobjectClassifierCategory<O, M>,
  ): M => category.characteristic(category.initialArrow(category.terminalObj))

  export interface SubobjectClassifierNegationOptions<M> {
    readonly equalMor?: (left: M, right: M) => boolean
  }

  export const subobjectClassifierNegation = <O, M>(
    category: SubobjectClassifierCategory<O, M>,
    options?: SubobjectClassifierNegationOptions<M>,
  ): M => {
    const computed = category.characteristic(category.falseArrow)
    const eq = options?.equalMor ?? category.equalMor ?? category.eq

    if (eq) {
      if (!eq(category.negation, computed)) {
        throw new Error(
          'CategoryLimits.subobjectClassifierNegation: advertised negation must classify the false point.',
        )
      }
      return category.negation
    }

    return computed
  }

  export interface SubobjectClassifierIsoWitness<M> {
    readonly forward: M
    readonly backward: M
  }

  export interface BuildSubobjectClassifierIsoOptions<M> {
    readonly equalMor?: (left: M, right: M) => boolean
  }

  export const buildSubobjectClassifierIso = <O, M>(
    first: SubobjectClassifierCategory<O, M>,
    second: SubobjectClassifierCategory<O, M>,
    options?: BuildSubobjectClassifierIsoOptions<M>,
  ): SubobjectClassifierIsoWitness<M> => {
    const eq =
      options?.equalMor ??
      first.equalMor ??
      first.eq ??
      second.equalMor ??
      second.eq ??
      ((left: M, right: M) => Object.is(left, right))

    const forward = first.characteristic(second.truthArrow)

    if (first.dom(forward) !== second.truthValues) {
      throw new Error(
        'CategoryLimits.buildSubobjectClassifierIso: forward arrow must originate at the alternate truth object.',
      )
    }
    if (first.cod(forward) !== first.truthValues) {
      throw new Error(
        'CategoryLimits.buildSubobjectClassifierIso: forward arrow must land in the primary truth object.',
      )
    }

    const backward = second.characteristic(first.truthArrow)

    if (second.dom(backward) !== first.truthValues) {
      throw new Error(
        'CategoryLimits.buildSubobjectClassifierIso: backward arrow must originate at the primary truth object.',
      )
    }
    if (second.cod(backward) !== second.truthValues) {
      throw new Error(
        'CategoryLimits.buildSubobjectClassifierIso: backward arrow must land in the alternate truth object.',
      )
    }

    const firstComposite = first.compose(forward, backward)
    const firstId = first.id(first.truthValues)
    if (!eq(firstComposite, firstId)) {
      throw new Error(
        'CategoryLimits.buildSubobjectClassifierIso: forward ∘ backward must equal the identity on the primary truth object.',
      )
    }

    const secondComposite = second.compose(backward, forward)
    const secondId = second.id(second.truthValues)
    if (!eq(secondComposite, secondId)) {
      throw new Error(
        'CategoryLimits.buildSubobjectClassifierIso: backward ∘ forward must equal the identity on the alternate truth object.',
      )
    }

    return { forward, backward }
  }

  /** Category with finite colimits */
  export interface FinitelyCocompleteCategory<O, M>
    extends Category<O, M>,
      ArrowFamilies.HasDomCod<O, M>,
      HasInitial<O, M>,
      HasProductMediators<O, M>,
      HasCoproductMediators<O, M>,
      HasCoequalizers<O, M> {
    readonly pushout: (left: M, right: M) => PushoutData<O, M>
    readonly initialArrow: (target: O) => M
  }

  /** Compute finite coproduct of a family with injection family */
  export const finiteCoproduct =
    <I, O, M>(
      Ifin: { carrier: ReadonlyArray<I> },
      fam: (i: I) => O,
      C: HasFiniteCoproducts<O, M>
    ) => {
      const objs = Ifin.carrier.map((i) => fam(i))
      const { obj, injections } = C.coproduct(objs)
      const injFam = (i: I) => injections[Ifin.carrier.indexOf(i)]!
      return { coproduct: obj, injections: injFam }
    }

  /** Compute finite product of a family with projection family */
  export const finiteProduct =
    <I, O, M>(
      Ifin: { carrier: ReadonlyArray<I> },
      fam: (i: I) => O,
      C: HasFiniteProducts<O, M>
    ) => {
      if (
        "smallProduct" in C &&
        typeof C.smallProduct === "function"
      ) {
        const small = (C as HasSmallProducts<O, M>).smallProduct(
          IndexedFamilies.finiteIndex(Ifin.carrier),
          fam,
        )
        const projections = Ifin.carrier.map((i) => small.projections(i))
        const projFam = (i: I) => projections[Ifin.carrier.indexOf(i)]!
        return { product: small.obj, projections: projFam }
      }
      const objs = Ifin.carrier.map((i) => fam(i))
      const { obj, projections } = C.product(objs)
      const projFam = (i: I) => projections[Ifin.carrier.indexOf(i)]!
      return { product: obj, projections: projFam }
    }

  /** Extended finite product that honors empty case with terminal */
  export const finiteProductEx =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      fam: IndexedFamilies.Family<I, O>,
      C: HasFiniteProducts<O, M> & Partial<HasTerminal<O, M>>
    ) => {
      if (Ifin.carrier.length === 0) {
        const T = (C as HasTerminal<O, M>).terminalObj
        return {
          product: T,
          projections: (_: I): M => {
            throw new Error('no projections from empty product')
          }
        }
      }
      return finiteProduct(Ifin, fam, C)
    }

  /** Extended finite coproduct that honors empty case with initial */
  export const finiteCoproductEx =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      fam: IndexedFamilies.Family<I, O>,
      C: HasFiniteCoproducts<O, M> & Partial<HasInitial<O, M>>
    ) => {
      if (Ifin.carrier.length === 0) {
        const I0 = (C as HasInitial<O, M>).initialObj
        return {
          coproduct: I0,
          injections: (_: I): M => {
            throw new Error('no injections into empty coproduct')
          }
        }
      }
      return finiteCoproduct(Ifin, fam, C)
    }

  /** Helper: list fiber objects and remember which j they came from */
  const fiberObjs =
    <J, I, O>(
      Jfin: IndexedFamilies.FiniteIndex<J>,
      u: (j: J) => I,
      i: I,
      F: IndexedFamilies.Family<J, O>
    ): ReadonlyArray<{ j: J; obj: O }> => {
      const js = Jfin.carrier.filter((j) => u(j) === i)
      return js.map((j) => ({ j, obj: F(j) }))
    }

  /** LEFT KAN: Lan_u F at i is coproduct over fiber u^{-1}(i) */
  export const lanDiscretePre =
    <J, I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      Jfin: IndexedFamilies.FiniteIndex<J>,
      u: (j: J) => I,
      F: IndexedFamilies.Family<J, O>,
      C: HasFiniteCoproducts<O, M>
    ) => {
      // Precompute for each i
      const cacheObj = new Map<I, O>()
      const cacheInj = new Map<I, ReadonlyArray<readonly [J, M]>>()

      for (const i of Ifin.carrier) {
        const objs = fiberObjs(Jfin, u, i, F)
        if (objs.length === 0) continue
        const { obj, injections } = C.coproduct(objs.map(({ obj }) => obj))
        const injPairs = objs.map(({ j }, idx) => [j, injections[idx]!] as const)
        cacheObj.set(i, obj)
        cacheInj.set(i, injPairs)
      }

      return {
        at: (i: I) => cacheObj.get(i)!,
        injections: (i: I) => cacheInj.get(i) ?? []
      }
    }

  /** RIGHT KAN: Ran_u F at i is product over fiber u^{-1}(i) */
  export const ranDiscretePre =
    <J, I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      Jfin: IndexedFamilies.FiniteIndex<J>,
      u: (j: J) => I,
      F: IndexedFamilies.Family<J, O>,
      C: HasFiniteProducts<O, M>
    ) => {
      const cacheObj = new Map<I, O>()
      const cacheProj = new Map<I, ReadonlyArray<readonly [J, M]>>()

      for (const i of Ifin.carrier) {
        const objs = fiberObjs(Jfin, u, i, F)
        if (objs.length === 0) continue
        const { obj, projections } = C.product(objs.map(({ obj }) => obj))
        const projPairs = objs.map(({ j }, idx) => [j, projections[idx]!] as const)
        cacheObj.set(i, obj)
        cacheProj.set(i, projPairs)
      }

      return {
        at: (i: I) => cacheObj.get(i)!,
        projections: (i: I) => cacheProj.get(i) ?? []
      }
    }

  export interface DiagramArrow<I, M> {
    readonly source: I
    readonly target: I
    readonly morphism: M
  }

  export interface Diagram<I, M> {
    readonly arrows: ReadonlyArray<DiagramArrow<I, M>>
  }

  export interface SmallDiagram<I, A, O, M> {
    readonly shape: SmallCategory<I, A>
    readonly objectIndex: IndexedFamilies.SmallIndex<I>
    readonly onObjects: IndexedFamilies.SmallFamily<I, O>
    readonly arrowIndex: IndexedFamilies.SmallIndex<A>
    readonly onMorphisms: IndexedFamilies.SmallFamily<A, M>
  }

  export interface FiniteDiagram<I, A, O, M> {
    readonly shape: FiniteCategoryT<I, A>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly onMorphisms: (arrow: A) => M
  }

  export interface DiagramArrowDiagnostic<I, A, O, M> {
    readonly arrow: A
    readonly sourceIndex: I
    readonly targetIndex: I
    readonly morphism: M
    readonly expectedDomain: O
    readonly expectedCodomain: O
    readonly actualDomain: O
    readonly actualCodomain: O
    readonly holds: boolean
    readonly reason?: string
  }

  export interface DiagramIdentityDiagnostic<I, O, M> {
    readonly index: I
    readonly expectedIdentity: M
    readonly actualIdentity: M
    readonly holds: boolean
    readonly reason?: string
  }

  export interface DiagramCompositionDiagnostic<A, M> {
    readonly first: A
    readonly second: A
    readonly composite: A
    readonly expected: M
    readonly actual: M
    readonly holds: boolean
    readonly reason?: string
  }

  export interface DiagramNaturalityAnalysis<I, A, O, M> {
    readonly identityDiagnostics: ReadonlyArray<DiagramIdentityDiagnostic<I, O, M>>
    readonly arrowDiagnostics: ReadonlyArray<DiagramArrowDiagnostic<I, A, O, M>>
    readonly compositionDiagnostics: ReadonlyArray<DiagramCompositionDiagnostic<A, M>>
    readonly holds: boolean
  }

  export const makeFiniteDiagram = <I, A, O, M>(input: {
    readonly shape: FiniteCategoryT<I, A>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly onMorphisms: (arrow: A) => M
  }): FiniteDiagram<I, A, O, M> => {
    const { shape, onObjects, onMorphisms } = input
    for (const object of shape.objects) {
      onObjects(object)
    }
    shape.arrows.forEach((arrow) => {
      onMorphisms(arrow)
    })
    return { shape, onObjects, onMorphisms }
  }

  const morphismEquality = <O, M>(
    category: Category<O, M>,
    eq?: (a: M, b: M) => boolean,
  ): ((a: M, b: M) => boolean) => {
    if (typeof eq === "function") {
      return eq
    }
    if (typeof category.equalMor === "function") {
      return (left: M, right: M) => category.equalMor!(left, right)
    }
    if (typeof category.eq === "function") {
      return (left: M, right: M) => category.eq!(left, right)
    }
    return (left: M, right: M) => Object.is(left, right)
  }

  const enumerateShapeObjects = <I, A>(
    diagram: FiniteDiagram<I, A, unknown, unknown> | SmallDiagram<I, A, unknown, unknown>,
  ): ReadonlyArray<I> => {
    if ((diagram as FiniteDiagram<I, A, unknown, unknown>).shape.objects) {
      return (diagram as FiniteDiagram<I, A, unknown, unknown>).shape.objects
    }
    return Array.from((diagram as SmallDiagram<I, A, unknown, unknown>).shape.objects)
  }

  const enumerateShapeArrows = <I, A>(
    diagram: FiniteDiagram<I, A, unknown, unknown> | SmallDiagram<I, A, unknown, unknown>,
  ): ReadonlyArray<A> => {
    if ((diagram as FiniteDiagram<I, A, unknown, unknown>).shape.arrows) {
      return (diagram as FiniteDiagram<I, A, unknown, unknown>).shape.arrows
    }
    return Array.from((diagram as SmallDiagram<I, A, unknown, unknown>).shape.arrows)
  }

  export const analyzeDiagramNaturality = <I, A, O, M>(input: {
    readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly diagram: FiniteDiagram<I, A, O, M> | SmallDiagram<I, A, O, M>
    readonly eq?: (a: M, b: M) => boolean
  }): DiagramNaturalityAnalysis<I, A, O, M> => {
    const { base, diagram, eq } = input
    const equality = morphismEquality(base, eq)
    const objects = enumerateShapeObjects(diagram)
    const arrows = enumerateShapeArrows(diagram)

    const identityDiagnostics: DiagramIdentityDiagnostic<I, O, M>[] = []
    for (const object of objects) {
      const assigned = diagram.onObjects(object)
      const actual = diagram.onMorphisms(diagram.shape.id(object))
      const expected = base.id(assigned)
      const holds =
        equality(actual, expected) &&
        Object.is(base.dom(actual), assigned) &&
        Object.is(base.cod(actual), assigned)
      identityDiagnostics.push(
        holds
          ? { index: object, expectedIdentity: expected, actualIdentity: actual, holds }
          : {
              index: object,
              expectedIdentity: expected,
              actualIdentity: actual,
              holds,
              reason: `identity mismatch at ${String(object)}`,
            },
      )
    }

    const arrowDiagnostics: DiagramArrowDiagnostic<I, A, O, M>[] = []
    for (const arrow of arrows) {
      const sourceIndex = diagram.shape.src(arrow)
      const targetIndex = diagram.shape.dst(arrow)
      const morphism = diagram.onMorphisms(arrow)
      const expectedDomain = diagram.onObjects(sourceIndex)
      const expectedCodomain = diagram.onObjects(targetIndex)
      const actualDomain = base.dom(morphism)
      const actualCodomain = base.cod(morphism)
      const holds = Object.is(actualDomain, expectedDomain) && Object.is(actualCodomain, expectedCodomain)
      arrowDiagnostics.push(
        holds
          ? {
              arrow,
              sourceIndex,
              targetIndex,
              morphism,
              expectedDomain,
              expectedCodomain,
              actualDomain,
              actualCodomain,
              holds,
            }
          : {
              arrow,
              sourceIndex,
              targetIndex,
              morphism,
              expectedDomain,
              expectedCodomain,
              actualDomain,
              actualCodomain,
              holds,
              reason: `domain/codomain mismatch for ${String(sourceIndex)}→${String(targetIndex)}`,
            },
      )
    }

    const compositionDiagnostics: DiagramCompositionDiagnostic<A, M>[] = []
    for (const first of arrows) {
      for (const second of arrows) {
        if (!Object.is(diagram.shape.dst(first), diagram.shape.src(second))) continue
        const composite = diagram.shape.compose(second, first)
        const expected = base.compose(diagram.onMorphisms(second), diagram.onMorphisms(first))
        const actual = diagram.onMorphisms(composite)
        const holds = equality(actual, expected)
        compositionDiagnostics.push(
          holds
            ? { first, second, composite, expected, actual, holds }
            : {
                first,
                second,
                composite,
                expected,
                actual,
                holds,
                reason: `composition mismatch along ${String(diagram.shape.src(first))}→${String(
                  diagram.shape.dst(second),
                )}`,
              },
        )
      }
    }

    const holds =
      identityDiagnostics.every((diagnostic) => diagnostic.holds) &&
      arrowDiagnostics.every((diagnostic) => diagnostic.holds) &&
      compositionDiagnostics.every((diagnostic) => diagnostic.holds)

    return { identityDiagnostics, arrowDiagnostics, compositionDiagnostics, holds }
  }

  export interface FunctorToDiagramResult<I, A, O, M> {
    readonly diagram: SmallDiagram<I, A, O, M>
    readonly objectIndex: IndexedFamilies.FiniteIndex<I>
    readonly arrowIndex: IndexedFamilies.FiniteIndex<A>
  }

  export interface FunctorToDiagramInput<I, A, O, M> {
    readonly functor: FunctorWithWitness<I, A, O, M>
    readonly source: SmallCategory<I, A>
    readonly indices?: IndexedFamilies.SmallIndex<I>
    readonly arrows?: IndexedFamilies.SmallIndex<A>
  }

  export const functorToDiagram = <I, A, O, M>(
    input: FunctorToDiagramInput<I, A, O, M>,
  ): FunctorToDiagramResult<I, A, O, M> => {
    const { functor, source } = input
    const objectCarrier = input.indices
      ? IndexedFamilies.ensureFiniteIndex(input.indices)
      : IndexedFamilies.finiteIndex(Array.from(source.objects))
    const arrowCarrier = input.arrows
      ? IndexedFamilies.ensureFiniteIndex(input.arrows)
      : IndexedFamilies.finiteIndex(Array.from(source.arrows))

    const diagram: SmallDiagram<I, A, O, M> = {
      shape: source,
      objectIndex: objectCarrier,
      onObjects: (index) => functor.functor.F0(index),
      arrowIndex: arrowCarrier,
      onMorphisms: (arrow) => functor.functor.F1(arrow),
    }

    return { diagram, objectIndex: objectCarrier, arrowIndex: arrowCarrier }
  }

  export interface DiagramToFunctorOptions {
    readonly metadata?: ReadonlyArray<string>
    readonly eq?: (a: unknown, b: unknown) => boolean
  }

  export interface DiagramFunctorizationResult<I, A, O, M> {
    readonly functor: FunctorWithWitness<I, A, O, M>
    readonly analysis: DiagramNaturalityAnalysis<I, A, O, M>
  }

  const simpleFromCategory = <O, M>(
    category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  ): SimpleCat<O, M> => ({
    id: (object) => category.id(object),
    compose: (g, f) => category.compose(g, f),
    src: (arrow) => category.dom(arrow),
    dst: (arrow) => category.cod(arrow),
  })

  export const diagramToFunctorWitness = <I, A, O, M>(input: {
    readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly diagram: FiniteDiagram<I, A, O, M> | SmallDiagram<I, A, O, M>
    readonly options?: DiagramToFunctorOptions
  }): DiagramFunctorizationResult<I, A, O, M> => {
    const { base, diagram, options } = input
    const objects = enumerateShapeObjects(diagram)
    const arrows = enumerateShapeArrows(diagram)
    const composablePairs: FunctorComposablePair<A>[] = []
    for (const first of arrows) {
      for (const second of arrows) {
        if (Object.is(diagram.shape.dst(first), diagram.shape.src(second))) {
          composablePairs.push({ f: first, g: second })
        }
      }
    }

    const samples: FunctorCheckSamples<I, A> = {
      objects,
      arrows,
      composablePairs,
    }

    const functorStructure: Functor<I, A, O, M> = {
      F0: (object) => diagram.onObjects(object),
      F1: (arrow) => diagram.onMorphisms(arrow),
    }

    const functor = constructFunctorWithWitness(
      diagram.shape,
      simpleFromCategory(base),
      functorStructure,
      samples,
      options?.metadata,
    )

    const analysis = analyzeDiagramNaturality({
      base,
      diagram,
      ...(options?.eq ? { eq: options.eq } : {}),
    })

    return { functor, analysis }
  }

  export const constantDiagram = <I, A, O, M>(input: {
    readonly shape: SmallCategory<I, A>
    readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly object: O
  }): SmallDiagram<I, A, O, M> => {
    const objectIndex = IndexedFamilies.finiteIndex(Array.from(input.shape.objects))
    const arrowIndex = IndexedFamilies.finiteIndex(Array.from(input.shape.arrows))
    return {
      shape: input.shape,
      objectIndex,
      onObjects: () => input.object,
      arrowIndex,
      onMorphisms: () => input.base.id(input.object),
    }
  }

  const requireSmallCategory = <O, A>(
    category: SimpleCat<O, A>,
    context: string,
  ): SmallCategory<O, A> => {
    const candidate = category as Partial<SmallCategory<O, A>>
    if (
      candidate &&
      candidate.objects &&
      typeof (candidate.objects as ReadonlySet<O>).forEach === 'function' &&
      candidate.arrows &&
      typeof (candidate.arrows as ReadonlySet<A>).forEach === 'function'
    ) {
      return candidate as SmallCategory<O, A>
    }
    throw new Error(`${context}: change-of-shape functor must expose a small category structure`)
  }

  const diagramHasObject = <I, A, O, M>(
    diagram: FiniteDiagram<I, A, O, M> | SmallDiagram<I, A, O, M>,
    object: I,
  ): boolean => {
    if (isFiniteDiagram(diagram)) {
      return diagram.shape.objects.some((candidate) => Object.is(candidate, object))
    }
    if (isSmallDiagram(diagram)) {
      return diagram.shape.objects.has(object)
    }
    return false
  }

  const diagramHasArrow = <I, A, O, M>(
    diagram: FiniteDiagram<I, A, O, M> | SmallDiagram<I, A, O, M>,
    arrow: A,
  ): boolean => {
    if (isFiniteDiagram(diagram)) {
      return diagram.shape.arrows.some((candidate) => Object.is(candidate, arrow))
    }
    if (isSmallDiagram(diagram)) {
      return diagram.shape.arrows.has(arrow)
    }
    return false
  }

  export interface ReindexDiagramOptions {
    readonly guard?: {
      readonly objects?: number
      readonly arrows?: number
    }
  }

  export interface RestrictedConeResult<I, O, M> {
    readonly cone: Cone<I, O, M>
    readonly analysis: ConeNaturalityAnalysis<I, O, M>
  }

  export interface RestrictedCoconeResult<I, O, M> {
    readonly cocone: Cocone<I, O, M>
    readonly analysis: CoconeNaturalityAnalysis<I, O, M>
  }

  export interface ReindexDiagramResult<I, A, J, B, O, M> {
    readonly diagram: SmallDiagram<I, A, O, M>
    readonly objectIndex: IndexedFamilies.FiniteIndex<I>
    readonly arrowIndex: IndexedFamilies.FiniteIndex<A>
    readonly restrictCone: (cone: Cone<J, O, M>) => RestrictedConeResult<I, O, M>
    readonly restrictCocone: (cocone: Cocone<J, O, M>) => RestrictedCoconeResult<I, O, M>
  }

  export const reindexDiagram = <I, A, J, B, O, M>(input: {
    readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly changeOfShape: FunctorWithWitness<I, A, J, B>
    readonly diagram: FiniteDiagram<J, B, O, M> | SmallDiagram<J, B, O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly options?: ReindexDiagramOptions
  }): ReindexDiagramResult<I, A, J, B, O, M> => {
    const { base, changeOfShape, diagram, options } = input
    const eq = input.eq ?? base.eq ?? ((left: M, right: M) => Object.is(left, right))

    const sourceShape = requireSmallCategory(
      changeOfShape.witness.source,
      'CategoryLimits.reindexDiagram',
    )
    const targetShape = requireSmallCategory(
      changeOfShape.witness.target,
      'CategoryLimits.reindexDiagram',
    )

    if (isFiniteDiagram(diagram) || isSmallDiagram(diagram)) {
      for (const object of sourceShape.objects) {
        const mapped = changeOfShape.functor.F0(object)
        if (!diagramHasObject(diagram, mapped)) {
          throw new Error(
            `CategoryLimits.reindexDiagram: object ${String(mapped)} is missing from the target diagram`,
          )
        }
      }
      for (const arrow of sourceShape.arrows) {
        const mapped = changeOfShape.functor.F1(arrow)
        if (!diagramHasArrow(diagram, mapped)) {
          throw new Error(
            `CategoryLimits.reindexDiagram: arrow ${String(mapped)} is missing from the target diagram`,
          )
        }
      }
    }

    for (const object of targetShape.objects) {
      if (!diagramHasObject(diagram, object)) {
        throw new Error(
          `CategoryLimits.reindexDiagram: change-of-shape target references object ${String(object)} absent from the supplied diagram`,
        )
      }
    }

    const guardObjects = options?.guard?.objects
    const guardArrows = options?.guard?.arrows

    const objectCarrier = Array.from(sourceShape.objects)
    if (guardObjects !== undefined && objectCarrier.length > guardObjects) {
      throw new Error(
        `CategoryLimits.reindexDiagram: source category exposes ${objectCarrier.length} objects which exceeds the configured guard ${guardObjects}`,
      )
    }

    const arrowCarrier = Array.from(sourceShape.arrows)
    if (guardArrows !== undefined && arrowCarrier.length > guardArrows) {
      throw new Error(
        `CategoryLimits.reindexDiagram: source category exposes ${arrowCarrier.length} arrows which exceeds the configured guard ${guardArrows}`,
      )
    }

    const objectIndex = IndexedFamilies.finiteIndex(objectCarrier)
    const arrowIndex = IndexedFamilies.finiteIndex(arrowCarrier)

    const reindexedDiagram: SmallDiagram<I, A, O, M> = {
      shape: sourceShape,
      objectIndex,
      onObjects: (object) => diagram.onObjects(changeOfShape.functor.F0(object)),
      arrowIndex,
      onMorphisms: (arrow) => diagram.onMorphisms(changeOfShape.functor.F1(arrow)),
    }

    const onObjects: IndexedFamilies.Family<I, O> = (index) => reindexedDiagram.onObjects(index)

    const restrictCone = (cone: Cone<J, O, M>): RestrictedConeResult<I, O, M> => {
      const restricted: Cone<I, O, M> = {
        tip: cone.tip,
        legs: (index: I) => cone.legs(changeOfShape.functor.F0(index)),
        diagram: reindexedDiagram,
      }
      const analysis = analyzeConeNaturality({
        category: base,
        eq,
        indices: objectIndex,
        onObjects,
        cone: restricted,
      })
      return { cone: restricted, analysis }
    }

    const restrictCocone = (cocone: Cocone<J, O, M>): RestrictedCoconeResult<I, O, M> => {
      const restricted: Cocone<I, O, M> = {
        coTip: cocone.coTip,
        legs: (index: I) => cocone.legs(changeOfShape.functor.F0(index)),
        diagram: reindexedDiagram,
      }
      const analysis = analyzeCoconeNaturality({
        category: base,
        eq,
        indices: objectIndex,
        onObjects,
        cocone: restricted,
      })
      return { cocone: restricted, analysis }
    }

    return { diagram: reindexedDiagram, objectIndex, arrowIndex, restrictCone, restrictCocone }
  }

  export interface ChangeOfShapeFinalityWitness {
    readonly holds: boolean
    readonly reason?: string
    readonly metadata?: ReadonlyArray<string>
  }

  export interface LimitComparisonAlongResult<I, A, J, B, O, M> {
    readonly reindexing: ReindexDiagramResult<I, A, J, B, O, M>
    readonly restrictedCone: Cone<I, O, M>
    readonly restrictionAnalysis: ConeNaturalityAnalysis<I, O, M>
    readonly factorization: { holds: boolean; mediator?: M; reason?: string }
    readonly comparison?: {
      readonly mediator: M
      readonly isomorphism: boolean
      readonly reason?: string
      readonly finality?: ChangeOfShapeFinalityWitness
    }
  }

  export const limitComparisonAlong = <I, A, J, B, O, M>(input: {
    readonly base: FiniteCategoryT<O, M> & Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly changeOfShape: FunctorWithWitness<I, A, J, B>
    readonly diagram: FiniteDiagram<J, B, O, M> | SmallDiagram<J, B, O, M>
    readonly originalLimit: LimitOfDiagramResult<J, O, M>
    readonly reindexedLimit: LimitOfDiagramResult<I, O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly options?: ReindexDiagramOptions
    readonly finality?: ChangeOfShapeFinalityWitness
  }): LimitComparisonAlongResult<I, A, J, B, O, M> => {
    const { base, changeOfShape, diagram, originalLimit, reindexedLimit, finality } = input
    if (!base.eq && !input.eq) {
      throw new Error(
        'CategoryLimits.limitComparisonAlong: base category must provide arrow equality to test comparison isomorphisms',
      )
    }
    const reindexing = reindexDiagram<I, A, J, B, O, M>({
      base,
      changeOfShape,
      diagram,
      ...(input.eq ? { eq: input.eq } : {}),
      ...(input.options ? { options: input.options } : {}),
    })
    const restriction = reindexing.restrictCone(originalLimit.cone)
    if (!restriction.analysis.holds) {
      return {
        reindexing,
        restrictedCone: restriction.cone,
        restrictionAnalysis: restriction.analysis,
        factorization: {
          holds: false,
          reason:
            'CategoryLimits.limitComparisonAlong: restricted cone fails the naturality checks required for D ∘ u',
        },
      }
    }

    const factor = reindexedLimit.factor(restriction.cone)
    if (!factor.holds || !factor.mediator) {
      return {
        reindexing,
        restrictedCone: restriction.cone,
        restrictionAnalysis: restriction.analysis,
        factorization: {
          holds: false,
          reason:
            factor.reason ??
            'CategoryLimits.limitComparisonAlong: limit of D ∘ u declined to factor the restricted cone',
        },
      }
    }

    const mediator = factor.mediator
    const iso = isIso(base, mediator)
    const reason = iso
      ? undefined
      : finality
        ? finality.holds
          ? finality.reason
          : finality.reason ??
            'CategoryLimits.limitComparisonAlong: change-of-shape functor reported non-finality, so the comparison may fail to be an isomorphism'
        : 'CategoryLimits.limitComparisonAlong: comparison map is not an isomorphism and no finality witness was supplied'

    return {
      reindexing,
      restrictedCone: restriction.cone,
      restrictionAnalysis: restriction.analysis,
      factorization: { holds: true, mediator },
      comparison: {
        mediator,
        isomorphism: iso,
        ...(reason ? { reason } : {}),
        ...(finality ? { finality } : {}),
      },
    }
  }

  export interface ChangeOfShapeCofinalityWitness {
    readonly holds: boolean
    readonly reason?: string
    readonly metadata?: ReadonlyArray<string>
  }

  export interface ColimitComparisonAlongResult<I, A, J, B, O, M> {
    readonly reindexing: ReindexDiagramResult<I, A, J, B, O, M>
    readonly restrictedCocone: Cocone<I, O, M>
    readonly restrictionAnalysis: CoconeNaturalityAnalysis<I, O, M>
    readonly factorization: { factored: boolean; mediator?: M; reason?: string }
    readonly comparison?: {
      readonly mediator: M
      readonly isomorphism: boolean
      readonly reason?: string
      readonly cofinality?: ChangeOfShapeCofinalityWitness
    }
  }

  export const colimitComparisonAlong = <I, A, J, B, O, M>(input: {
    readonly base: FiniteCategoryT<O, M> & Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly changeOfShape: FunctorWithWitness<I, A, J, B>
    readonly diagram: FiniteDiagram<J, B, O, M> | SmallDiagram<J, B, O, M>
    readonly originalColimit: FiniteColimitFromCoproductsAndCoequalizersWitness<J, O, M>
    readonly reindexedColimit: FiniteColimitFromCoproductsAndCoequalizersWitness<I, O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly options?: ReindexDiagramOptions
    readonly cofinality?: ChangeOfShapeCofinalityWitness
  }): ColimitComparisonAlongResult<I, A, J, B, O, M> => {
    const { base, changeOfShape, diagram, originalColimit, reindexedColimit, cofinality } = input
    if (!base.eq && !input.eq) {
      throw new Error(
        'CategoryLimits.colimitComparisonAlong: base category must provide arrow equality to test comparison isomorphisms',
      )
    }
    const reindexing = reindexDiagram<I, A, J, B, O, M>({
      base,
      changeOfShape,
      diagram,
      ...(input.eq ? { eq: input.eq } : {}),
      ...(input.options ? { options: input.options } : {}),
    })
    const restriction = reindexing.restrictCocone(originalColimit.cocone)
    if (!restriction.analysis.holds) {
      return {
        reindexing,
        restrictedCocone: restriction.cocone,
        restrictionAnalysis: restriction.analysis,
        factorization: {
          factored: false,
          reason:
            'CategoryLimits.colimitComparisonAlong: restricted cocone fails the naturality checks required for D ∘ u',
        },
      }
    }

    const factor = reindexedColimit.factor(restriction.cocone)
    if (!factor.factored || !factor.mediator) {
      return {
        reindexing,
        restrictedCocone: restriction.cocone,
        restrictionAnalysis: restriction.analysis,
        factorization: {
          factored: false,
          reason:
            factor.reason ??
            'CategoryLimits.colimitComparisonAlong: colimit of D ∘ u declined to factor the restricted cocone',
        },
      }
    }

    const mediator = factor.mediator
    const iso = isIso(base, mediator)
    const reason = iso
      ? undefined
      : cofinality
        ? cofinality.holds
          ? cofinality.reason
          : cofinality.reason ??
            'CategoryLimits.colimitComparisonAlong: change-of-shape functor reported non-cofinality, so the comparison may fail to be an isomorphism'
        : 'CategoryLimits.colimitComparisonAlong: comparison map is not an isomorphism and no cofinality witness was supplied'

    return {
      reindexing,
      restrictedCocone: restriction.cocone,
      restrictionAnalysis: restriction.analysis,
      factorization: { factored: true, mediator },
      comparison: {
        mediator,
        isomorphism: iso,
        ...(reason ? { reason } : {}),
        ...(cofinality ? { cofinality } : {}),
      },
    }
  }

  interface DiscreteDiagramArrow<I> {
    readonly source: I
    readonly target: I
  }

  export const finiteDiagramFromDiscrete = <I, O, M>(input: {
    readonly base: Category<O, M>
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
  }): FiniteDiagram<I, DiscreteDiagramArrow<I>, O, M> => {
    const { base, indices, onObjects } = input
    const objects = indices.carrier.slice()
    const arrows = objects.map((object) => ({ source: object, target: object }))
    const shape: FiniteCategoryT<I, DiscreteDiagramArrow<I>> = {
      objects,
      arrows,
      id: (object) => ({ source: object, target: object }),
      compose: (g, f) => {
        if (f.source !== f.target || g.source !== g.target || f.target !== g.source) {
          throw new Error('finiteDiagramFromDiscrete: non-identity composition requested')
        }
        return { source: f.source, target: g.target }
      },
      src: (arrow) => arrow.source,
      dst: (arrow) => arrow.target,
      eq: (left, right) => left.source === right.source && left.target === right.target,
    }

    const onMorphisms = (arrow: DiscreteDiagramArrow<I>): M => {
      if (arrow.source !== arrow.target) {
        throw new Error('finiteDiagramFromDiscrete: only identity arrows are present')
      }
      return base.id(onObjects(arrow.source))
    }

    return { shape, onObjects, onMorphisms }
  }

  export interface FinitePosetShape<I> {
    readonly objects: ReadonlyArray<I>
    readonly leq: (a: I, b: I) => boolean
  }

  export interface PosetCoverArrow<I, M> {
    readonly source: I
    readonly target: I
    readonly morphism: M
  }

  interface PosetDiagramArrow<I> {
    readonly source: I
    readonly target: I
  }

  const posetKey = <I>(source: I, target: I): string => `${String(source)}→${String(target)}`

  export const finiteDiagramFromPoset = <I, O, M>(input: {
    readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly poset: FinitePosetShape<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cover: ReadonlyArray<PosetCoverArrow<I, M>>
  }): FiniteDiagram<I, PosetDiagramArrow<I>, O, M> => {
    const { base, eq, poset, onObjects, cover } = input
    const objects = poset.objects.slice()
    const adjacency = new Map<I, Array<PosetCoverArrow<I, M>>>()
    const coverKeys = new Set<string>()

    for (const arrow of cover) {
      if (!poset.leq(arrow.source, arrow.target) || arrow.source === arrow.target) {
        throw new Error('finiteDiagramFromPoset: cover arrows must respect the partial order and be non-identity')
      }
      const expectedDom = onObjects(arrow.source)
      const expectedCod = onObjects(arrow.target)
      if (base.dom(arrow.morphism) !== expectedDom || base.cod(arrow.morphism) !== expectedCod) {
        throw new Error('finiteDiagramFromPoset: cover arrow does not match object assignment')
      }
      const key = posetKey(arrow.source, arrow.target)
      if (coverKeys.has(key)) {
        throw new Error('finiteDiagramFromPoset: duplicate cover arrow detected')
      }
      coverKeys.add(key)
      const list = adjacency.get(arrow.source)
      if (list) {
        list.push(arrow)
      } else {
        adjacency.set(arrow.source, [arrow])
      }
    }

    const arrowCache = new Map<string, M>()
    for (const object of objects) {
      const id = base.id(onObjects(object))
      arrowCache.set(posetKey(object, object), id)
    }

    const bfsFrom = (origin: I) => {
      const queue: I[] = [origin]
      const seen = new Set<I>([origin])
      while (queue.length > 0) {
        const current = queue.shift()!
        const baseArrow = arrowCache.get(posetKey(origin, current))
        if (!baseArrow) continue
        const outgoing = adjacency.get(current) ?? []
        for (const edge of outgoing) {
          const composite = base.compose(edge.morphism, baseArrow)
          const key = posetKey(origin, edge.target)
          const existing = arrowCache.get(key)
          if (existing) {
            if (!eq(existing, composite)) {
              throw new Error('finiteDiagramFromPoset: inconsistent composites detected')
            }
          } else {
            arrowCache.set(key, composite)
          }
          if (!seen.has(edge.target)) {
            seen.add(edge.target)
            queue.push(edge.target)
          }
        }
      }
    }

    for (const object of objects) {
      bfsFrom(object)
    }

    for (const source of objects) {
      for (const target of objects) {
        if (!poset.leq(source, target)) continue
        const key = posetKey(source, target)
        const cached = arrowCache.get(key)
        if (!cached) {
          throw new Error('finiteDiagramFromPoset: cover data does not generate required composites')
        }
        const expectedDom = onObjects(source)
        const expectedCod = onObjects(target)
        if (base.dom(cached) !== expectedDom || base.cod(cached) !== expectedCod) {
          throw new Error('finiteDiagramFromPoset: generated morphism has mismatched domain or codomain')
        }
      }
    }

    const arrows: PosetDiagramArrow<I>[] = []
    for (const source of objects) {
      for (const target of objects) {
        if (!poset.leq(source, target)) continue
        arrows.push({ source, target })
      }
    }

    const shape: FiniteCategoryT<I, PosetDiagramArrow<I>> = {
      objects,
      arrows,
      id: (object) => ({ source: object, target: object }),
      compose: (g, f) => {
        if (f.target !== g.source) {
          throw new Error('finiteDiagramFromPoset: attempt to compose non-composable arrows')
        }
        return { source: f.source, target: g.target }
      },
      src: (arrow) => arrow.source,
      dst: (arrow) => arrow.target,
      eq: (left, right) => left.source === right.source && left.target === right.target,
    }

    const onMorphisms = (arrow: PosetDiagramArrow<I>): M => {
      const morphism = arrowCache.get(posetKey(arrow.source, arrow.target))
      if (!morphism) {
        throw new Error('finiteDiagramFromPoset: missing morphism for requested arrow')
      }
      return morphism
    }

    return { shape, onObjects, onMorphisms }
  }

  type DiagramLike<I, O, M> = Diagram<I, M> | FiniteDiagram<I, any, O, M> | SmallDiagram<I, any, O, M>

  const isFiniteDiagram = <I, O, M>(value: DiagramLike<I, O, M>): value is FiniteDiagram<I, any, O, M> =>
    typeof (value as FiniteDiagram<I, any, O, M>).onMorphisms === 'function' &&
    typeof (value as FiniteDiagram<I, any, O, M>).onObjects === 'function' &&
    typeof (value as FiniteDiagram<I, any, O, M>).shape === 'object' &&
    Array.isArray((value as FiniteDiagram<I, any, O, M>).shape.objects)

  const isSmallDiagram = <I, A, O, M>(value: DiagramLike<I, O, M>): value is SmallDiagram<I, A, O, M> =>
    typeof (value as SmallDiagram<I, A, O, M>).onMorphisms === 'function' &&
    typeof (value as SmallDiagram<I, A, O, M>).onObjects === 'function' &&
    typeof (value as SmallDiagram<I, A, O, M>).shape === 'object' &&
    value !== undefined &&
    (value as SmallDiagram<I, A, O, M>).objectIndex !== undefined &&
    (value as SmallDiagram<I, A, O, M>).arrowIndex !== undefined

  const enumerateDiagramArrows = <I, O, M>(diagram: DiagramLike<I, O, M>): ReadonlyArray<DiagramArrow<I, M>> => {
    if (isFiniteDiagram(diagram)) {
      return diagram.shape.arrows.map((arrow) => ({
        source: diagram.shape.src(arrow),
        target: diagram.shape.dst(arrow),
        morphism: diagram.onMorphisms(arrow),
      }))
    }
    if (isSmallDiagram(diagram)) {
      const arrows = IndexedFamilies.materialiseSmallIndex(diagram.arrowIndex)
      return arrows.map((arrow) => ({
        source: diagram.shape.src(arrow),
        target: diagram.shape.dst(arrow),
        morphism: diagram.onMorphisms(arrow),
      }))
    }
    return diagram.arrows
  }

  export interface FiniteDiagramCheckResult {
    readonly holds: boolean
    readonly issues: ReadonlyArray<string>
  }

  export const checkFiniteDiagramFunctoriality = <I, A, O, M>(input: {
    readonly base: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly diagram: FiniteDiagram<I, A, O, M>
  }): FiniteDiagramCheckResult => {
    const { base, eq, diagram } = input
    const issues: string[] = []
    for (const object of diagram.shape.objects) {
      const assigned = diagram.onObjects(object)
      const diagId = diagram.onMorphisms(diagram.shape.id(object))
      const baseId = base.id(assigned)
      if (!eq(diagId, baseId)) {
        issues.push(`identity mismatch at object ${String(object)}`)
      }
      if (base.dom(diagId) !== assigned || base.cod(diagId) !== assigned) {
        issues.push(`identity arrow has incorrect domain or codomain at ${String(object)}`)
      }
    }

    for (const arrow of diagram.shape.arrows) {
      const morphism = diagram.onMorphisms(arrow)
      const source = diagram.onObjects(diagram.shape.src(arrow))
      const target = diagram.onObjects(diagram.shape.dst(arrow))
      if (base.dom(morphism) !== source) {
        issues.push(`domain mismatch for arrow ${String(posetKey(diagram.shape.src(arrow), diagram.shape.dst(arrow)))}`)
      }
      if (base.cod(morphism) !== target) {
        issues.push(`codomain mismatch for arrow ${String(posetKey(diagram.shape.src(arrow), diagram.shape.dst(arrow)))}`)
      }
    }

    for (const f of diagram.shape.arrows) {
      for (const g of diagram.shape.arrows) {
        if (diagram.shape.dst(f) !== diagram.shape.src(g)) continue
        const compositeArrow = diagram.shape.compose(g, f)
        const lhs = diagram.onMorphisms(compositeArrow)
        const rhs = base.compose(diagram.onMorphisms(g), diagram.onMorphisms(f))
        if (!eq(lhs, rhs)) {
          issues.push(
            `composition mismatch for ${String(posetKey(diagram.shape.src(f), diagram.shape.dst(g)))} via ${String(
              posetKey(diagram.shape.src(f), diagram.shape.dst(f)),
            )} then ${String(posetKey(diagram.shape.src(g), diagram.shape.dst(g)))}`,
          )
        }
      }
    }

    return { holds: issues.length === 0, issues }
  }

  export const composeFiniteDiagramPath = <I, A, O, M>(input: {
    readonly base: Category<O, M>
    readonly diagram: FiniteDiagram<I, A, O, M>
    readonly path: ReadonlyArray<A>
    readonly start?: I
  }):
    | { defined: true; composite: M; source: I; target: I }
    | { defined: false; reason: string } => {
    const { base, diagram, path, start } = input
    if (path.length === 0) {
      if (start === undefined) {
        return { defined: false, reason: 'composeFiniteDiagramPath: empty path requires explicit start object' }
      }
      const object = diagram.onObjects(start)
      return { defined: true, composite: base.id(object), source: start, target: start }
    }

    const first = path[0]!
    const rest = path.slice(1)
    const initialSource = diagram.shape.src(first)
    let currentTarget = diagram.shape.dst(first)
    let composite = diagram.onMorphisms(first)

    for (const arrow of rest) {
      const source = diagram.shape.src(arrow)
      if (source !== currentTarget) {
        return { defined: false, reason: 'composeFiniteDiagramPath: non-composable arrows encountered' }
      }
      const morphism = diagram.onMorphisms(arrow)
      composite = base.compose(morphism, composite)
      currentTarget = diagram.shape.dst(arrow)
    }

    return { defined: true, composite, source: initialSource, target: currentTarget }
  }

  /** Product (limit) shape data */
  export interface Cone<I, O, M> {
    tip: O
    legs: IndexedFamilies.Family<I, M>
    diagram: DiagramLike<I, O, M>
  }

  export interface ConeMorphism<I, O, M> {
    readonly source: Cone<I, O, M>
    readonly target: Cone<I, O, M>
    readonly mediator: M
  }

  export interface ConeObjectDiagnostic<I, O> {
    readonly index: I
    readonly expected?: O
    readonly actual?: O
    readonly present: boolean
    readonly holds: boolean
    readonly reason?: string
  }

  export interface ConeLegDiagnostic<I, O, M> {
    readonly index: I
    readonly leg: M
    readonly actualDomain: O
    readonly actualCodomain: O
    readonly expectedDomain: O
    readonly expectedCodomain: O
    readonly holds: boolean
    readonly reason?: string
  }

  export interface ConeArrowNaturality<I, M> {
    readonly sourceIndex: I
    readonly targetIndex: I
    readonly transported: M
    readonly targetLeg: M
    readonly arrow: DiagramArrow<I, M>
    readonly holds: boolean
    readonly reason?: string
  }

  export interface ConeNaturalityAnalysis<I, O, M> {
    readonly objectDiagnostics: ReadonlyArray<ConeObjectDiagnostic<I, O>>
    readonly legDiagnostics: ReadonlyArray<ConeLegDiagnostic<I, O, M>>
    readonly arrowDiagnostics: ReadonlyArray<ConeArrowNaturality<I, M>>
    readonly holds: boolean
  }

  export interface ConeCategoryResult<I, O, M> {
    readonly category: FiniteCategoryT<Cone<I, O, M>, ConeMorphism<I, O, M>>
    readonly locateCone: (cone: Cone<I, O, M>) => Cone<I, O, M> | undefined
    readonly morphisms: (
      source: Cone<I, O, M>,
      target: Cone<I, O, M>,
    ) => ReadonlyArray<ConeMorphism<I, O, M>>
  }

  export interface ConeTerminalityWitness<I, O, M> {
    readonly locatedLimit?: Cone<I, O, M>
    readonly mediators: ReadonlyArray<{ source: Cone<I, O, M>; arrow: ConeMorphism<I, O, M> }>
    readonly holds: boolean
    readonly failure?: { source: Cone<I, O, M>; arrows: ReadonlyArray<ConeMorphism<I, O, M>> }
  }

  const isFiniteCategoryStructure = <O, M>(
    C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  ): C is Category<O, M> & ArrowFamilies.HasDomCod<O, M> & FiniteCategoryT<O, M> => {
    const candidate = C as Partial<FiniteCategoryT<O, M> & Category<O, M>>
    return (
      Array.isArray(candidate?.objects) &&
      Array.isArray(candidate?.arrows) &&
      typeof candidate?.eq === "function" &&
      typeof candidate?.id === "function" &&
      typeof candidate?.compose === "function"
    )
  }

  export const makeConeCategory = <I, O, M>(input: {
    readonly base: FiniteCategoryT<O, M> & Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly Ifin: IndexedFamilies.FiniteIndex<I>
    readonly F: IndexedFamilies.Family<I, O>
    readonly diagram: DiagramLike<I, O, M>
  }): ConeCategoryResult<I, O, M> => {
    const { base, eq = base.eq, Ifin, F, diagram } = input

    if (!eq) {
      throw new Error("CategoryLimits.makeConeCategory: base category must supply equality on morphisms")
    }

    const indices = Ifin.carrier
    const includesIndex = (value: I): boolean => indices.some((candidate) => candidate === value)
    const diagramArrows = enumerateDiagramArrows(diagram)

    if (isFiniteDiagram(diagram)) {
      for (const object of diagram.shape.objects) {
        if (!includesIndex(object)) {
          throw new Error(
            "CategoryLimits.makeConeCategory: finite diagram contains an object outside the supplied indices",
          )
        }
      }
      for (const index of indices) {
        if (!diagram.shape.objects.some((candidate) => candidate === index)) {
          throw new Error(
            "CategoryLimits.makeConeCategory: index family includes an object missing from the diagram",
          )
        }
        const assigned = diagram.onObjects(index)
        const advertised = F(index)
        if (assigned !== advertised) {
          throw new Error(
            "CategoryLimits.makeConeCategory: diagram object assignment disagrees with the supplied family",
          )
        }
      }
      const functoriality = checkFiniteDiagramFunctoriality({ base, eq, diagram })
      if (!functoriality.holds) {
        throw new Error(
          `CategoryLimits.makeConeCategory: diagram fails functoriality checks: ${functoriality.issues.join('; ')}`,
        )
      }
    }

    for (const arrow of diagramArrows) {
      if (!includesIndex(arrow.source) || !includesIndex(arrow.target)) {
        throw new Error(
          "CategoryLimits.makeConeCategory: diagram references an index outside the supplied finite family",
        )
      }
    }

    type EnumeratedCone = Cone<I, O, M> & { readonly legsMap: ReadonlyMap<I, M> }

    const cones: EnumeratedCone[] = []

    const conesEqual = (left: EnumeratedCone, right: Cone<I, O, M>): boolean => {
      if (left.tip !== right.tip) return false
      for (const index of indices) {
        const expected = left.legsMap.get(index)
        if (expected === undefined) return false
        const candidate = right.legs(index)
        if (!eq(expected, candidate)) return false
      }
      return true
    }

    const locateCone = (candidate: Cone<I, O, M>): EnumeratedCone | undefined =>
      cones.find((existing) => conesEqual(existing, candidate))

    const addCone = (cone: EnumeratedCone): void => {
      if (!locateCone(cone)) {
        cones.push(cone)
      }
    }

    if (indices.length === 0 && diagramArrows.length > 0) {
      throw new Error(
        "CategoryLimits.makeConeCategory: non-empty diagram requires indices in the supplied finite family",
      )
    }

    for (const tip of base.objects) {
      if (indices.length === 0) {
        const legsMap = new Map<I, M>()
        const cone: EnumeratedCone = {
          tip,
          legs: (index: I) => {
            throw new Error(
              `CategoryLimits.makeConeCategory: no legs available for index ${String(index)} in an empty diagram`,
            )
          },
          diagram,
          legsMap,
        }
        addCone(cone)
        continue
      }

      const options = indices.map((index) =>
        base.arrows.filter((arrow) => base.src(arrow) === tip && base.dst(arrow) === F(index)),
      )

      if (options.some((choices) => choices.length === 0)) continue

      const assignments: M[] = new Array(indices.length)

      const buildCone = (position: number) => {
        if (position === indices.length) {
          const legsMap = new Map<I, M>()
          indices.forEach((index, idx) => legsMap.set(index, assignments[idx]!))
          const cone: EnumeratedCone = {
            tip,
            legs: (index: I) => {
              const leg = legsMap.get(index)
              if (leg === undefined) {
                throw new Error(
                  `CategoryLimits.makeConeCategory: missing leg for index ${String(index)} in enumerated cone`,
                )
              }
              return leg
            },
            diagram,
            legsMap,
          }
          if (coneRespectsDiagram(base, eq, cone)) {
            addCone(cone)
          }
          return
        }

        for (const arrow of options[position]!) {
          assignments[position] = arrow
          buildCone(position + 1)
        }
      }

      buildCone(0)
    }

    const morphisms: ConeMorphism<I, O, M>[] = []

    const arrowEq = (left: ConeMorphism<I, O, M>, right: ConeMorphism<I, O, M>) =>
      left.source === right.source && left.target === right.target && eq(left.mediator, right.mediator)

    const addMorphism = (morphism: ConeMorphism<I, O, M>): void => {
      if (!morphisms.some((existing) => arrowEq(existing, morphism))) {
        morphisms.push(morphism)
      }
    }

    for (const cone of cones) {
      const identity = base.id(cone.tip)
      addMorphism({ source: cone, target: cone, mediator: identity })
    }

    for (const arrow of base.arrows) {
      const domain = base.dom(arrow)
      const codomain = base.cod(arrow)
      const sources = cones.filter((cone) => cone.tip === domain)
      const targets = cones.filter((cone) => cone.tip === codomain)
      for (const sourceCone of sources) {
        for (const targetCone of targets) {
          let commutes = true
          for (const index of indices) {
            const composed = base.compose(targetCone.legs(index), arrow)
            const expected = sourceCone.legs(index)
            if (!eq(composed, expected)) {
              commutes = false
              break
            }
          }
          if (commutes) {
            addMorphism({ source: sourceCone, target: targetCone, mediator: arrow })
          }
        }
      }
    }

    const findMorphism = (
      source: EnumeratedCone,
      target: EnumeratedCone,
      mediator: M,
    ): ConeMorphism<I, O, M> => {
      const found = morphisms.find(
        (arrow) => arrow.source === source && arrow.target === target && eq(arrow.mediator, mediator),
      )
      if (!found) {
        throw new Error("CategoryLimits.makeConeCategory: mediator not present in cone category")
      }
      return found
    }

    const objects = cones as ReadonlyArray<Cone<I, O, M>>
    const arrows = morphisms as ReadonlyArray<ConeMorphism<I, O, M>>

    const category: FiniteCategoryT<Cone<I, O, M>, ConeMorphism<I, O, M>> = {
      objects,
      arrows,
      id: (object) => findMorphism(object as EnumeratedCone, object as EnumeratedCone, base.id(object.tip)),
      compose: (g, f) => {
        if (f.target !== g.source) {
          throw new Error("CategoryLimits.makeConeCategory: morphism composition domain mismatch")
        }
        const mediator = base.compose(g.mediator, f.mediator)
        return findMorphism(f.source as EnumeratedCone, g.target as EnumeratedCone, mediator)
      },
      src: (arrow) => arrow.source,
      dst: (arrow) => arrow.target,
      eq: arrowEq,
    }

    const morphismsBetween = (
      source: Cone<I, O, M>,
      target: Cone<I, O, M>,
    ): ReadonlyArray<ConeMorphism<I, O, M>> => {
      const locatedSource = locateCone(source)
      const locatedTarget = locateCone(target)
      if (!locatedSource || !locatedTarget) return []
      return morphisms.filter((arrow) => arrow.source === locatedSource && arrow.target === locatedTarget)
    }

    return {
      category,
      locateCone,
      morphisms: morphismsBetween,
    }
  }

  export const checkTerminalCone = <I, O, M>(
    category: ConeCategoryResult<I, O, M>,
    candidate: Cone<I, O, M>,
  ): ConeTerminalityWitness<I, O, M> => {
    const locatedLimit = category.locateCone(candidate)
    if (!locatedLimit) {
      return { holds: false, mediators: [], failure: { source: candidate, arrows: [] } }
    }

    const witnesses: Array<{ source: Cone<I, O, M>; arrow: ConeMorphism<I, O, M> }> = []
    const identity = category.category.id(locatedLimit)

    for (const cone of category.category.objects) {
      const arrows = category.morphisms(cone, locatedLimit)
      if (arrows.length !== 1) {
        return { holds: false, locatedLimit, mediators: witnesses, failure: { source: cone, arrows } }
      }
      const arrow = arrows[0]!
      witnesses.push({ source: cone, arrow })
      if (cone === locatedLimit && !category.category.eq(arrow, identity)) {
        return { holds: false, locatedLimit, mediators: witnesses, failure: { source: cone, arrows } }
      }
    }

    return { holds: true, locatedLimit, mediators: witnesses }
  }

  export interface LimitOfDiagramResult<I, O, M> {
    readonly cone: Cone<I, O, M>
    readonly factor: (candidate: Cone<I, O, M>) => { holds: boolean; mediator?: M; reason?: string }
    readonly coneCategory: ConeCategoryResult<I, O, M>
    readonly terminality: ConeTerminalityWitness<I, O, M>
  }

  export interface SmallLimitFromProductsAndEqualizersInput<I, A, O, M> {
    readonly base: Category<O, M> &
      ArrowFamilies.HasDomCod<O, M> &
      HasSmallProducts<O, M> &
      HasSmallEqualizers<O, M>
    readonly products: HasSmallProductMediators<O, M>
    readonly diagram: SmallDiagram<I, A, O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly factorEqualizer: EqualizerFactorizer<M>
    readonly guard?: { readonly objects?: number; readonly arrows?: number }
  }

  export interface SmallLimitFromProductsAndEqualizersWitness<I, O, M> {
    readonly product: { readonly obj: O; readonly projections: IndexedFamilies.SmallFamily<I, M> }
    readonly pair: readonly [M, M]
    readonly equalizer: { readonly obj: O; readonly equalize: M }
    readonly cone: Cone<I, O, M>
    readonly factor: (candidate: Cone<I, O, M>) => EqualizerFactorizationResult<M>
  }

  export const smallLimitFromProductsAndEqualizers = <I, A, O, M>(
    input: SmallLimitFromProductsAndEqualizersInput<I, A, O, M>,
  ): SmallLimitFromProductsAndEqualizersWitness<I, O, M> => {
    const { base, products, diagram, factorEqualizer } = input
    const eq = input.eq ?? (base as { eq?: (a: M, b: M) => boolean }).eq

    if (!eq) {
      throw new Error(
        'CategoryLimits.smallLimitFromProductsAndEqualizers: base category must supply morphism equality',
      )
    }

    const guard = input.guard ?? {}
    const objectCarrier = IndexedFamilies.materialiseSmallIndex(
      diagram.objectIndex,
      guard.objects !== undefined ? { maxSize: guard.objects } : {},
    )

    if (objectCarrier.length === 0) {
      throw new Error(
        'CategoryLimits.smallLimitFromProductsAndEqualizers: diagram must contain at least one object',
      )
    }

    const arrowCarrier = IndexedFamilies.materialiseSmallIndex(
      diagram.arrowIndex,
      guard.arrows !== undefined ? { maxSize: guard.arrows } : {},
    )

    const objectFamily = diagram.onObjects

    const smallProduct = products.smallProduct
    if (!smallProduct) {
      throw new Error(
        'CategoryLimits.smallLimitFromProductsAndEqualizers: product mediators must provide smallProduct witness',
      )
    }
    const productWitness = smallProduct(diagram.objectIndex, objectFamily)

    const getProjection = (index: I): M => productWitness.projections(index)

    const arrowTargetsFamily: IndexedFamilies.SmallFamily<A, O> = (arrow) => {
      const target = diagram.shape.dst(arrow)
      return diagram.onObjects(target)
    }

    const arrowProductWitness = smallProduct(diagram.arrowIndex, arrowTargetsFamily)

    const arrowSourceLegs: M[] = arrowCarrier.map((arrow) => {
      const sourceIndex = diagram.shape.src(arrow)
      const morphism = diagram.onMorphisms(arrow)
      return base.compose(morphism, getProjection(sourceIndex))
    })

    const arrowTargetLegs: M[] = arrowCarrier.map((arrow) => {
      const targetIndex = diagram.shape.dst(arrow)
      return getProjection(targetIndex)
    })

    const deltaSource = products.tuple(productWitness.obj, arrowSourceLegs, arrowProductWitness.obj)
    const deltaTarget = products.tuple(productWitness.obj, arrowTargetLegs, arrowProductWitness.obj)

    const equalizerIndex = IndexedFamilies.finiteIndex([0 as const, 1 as const])
    const equalizerWitness = base.smallEqualizer(equalizerIndex, (position) =>
      position === 0 ? deltaSource : deltaTarget,
    )

    const inclusion = equalizerWitness.equalize(equalizerIndex.carrier[0]!)

    const limitLegs: IndexedFamilies.SmallFamily<I, M> = (index) =>
      base.compose(getProjection(index), inclusion)

    const limitCone: Cone<I, O, M> = { tip: equalizerWitness.obj, legs: limitLegs, diagram }

    const validateCone = (candidate: Cone<I, O, M>): ConeValidationResult => {
      if (candidate.diagram !== diagram) {
        return {
          valid: false,
          reason: 'CategoryLimits.smallLimitFromProductsAndEqualizers: candidate references a different diagram',
        }
      }

      for (const index of objectCarrier) {
        const leg = candidate.legs(index)
        if (base.dom(leg) !== candidate.tip) {
          return {
            valid: false,
            reason: `CategoryLimits.smallLimitFromProductsAndEqualizers: leg ${String(
              index,
            )} has incorrect domain`,
          }
        }
        const expectedCodomain = diagram.onObjects(index)
        if (base.cod(leg) !== expectedCodomain) {
          return {
            valid: false,
            reason: `CategoryLimits.smallLimitFromProductsAndEqualizers: leg ${String(
              index,
            )} has incorrect codomain`,
          }
        }
      }

      for (const arrow of arrowCarrier) {
        const source = diagram.shape.src(arrow)
        const target = diagram.shape.dst(arrow)
        const morphism = diagram.onMorphisms(arrow)
        const transported = base.compose(morphism, candidate.legs(source))
        const expected = candidate.legs(target)
        if (!eq(transported, expected)) {
          return {
            valid: false,
            reason: `CategoryLimits.smallLimitFromProductsAndEqualizers: leg ${String(
              target,
            )} does not commute with arrow ${String(source)}→${String(target)}`,
          }
        }
      }

      return { valid: true }
    }

    const factor = (candidate: Cone<I, O, M>): EqualizerFactorizationResult<M> => {
      const validation = validateCone(candidate)
      if (!validation.valid) {
        return validation.reason
          ? { factored: false, reason: validation.reason }
          : { factored: false }
      }

      const legsArr = objectCarrier.map((index) => candidate.legs(index))
      const fork = products.tuple(candidate.tip, legsArr, productWitness.obj)

      const report = factorEqualizer({
        left: deltaSource,
        right: deltaTarget,
        inclusion,
        fork,
      })

      if (!report.factored || !report.mediator) {
        return {
          factored: false,
          reason:
            report.reason ??
            'CategoryLimits.smallLimitFromProductsAndEqualizers: equalizer factorization failed',
        }
      }

      if (base.dom(report.mediator) !== candidate.tip || base.cod(report.mediator) !== limitCone.tip) {
        return {
          factored: false,
          reason:
            'CategoryLimits.smallLimitFromProductsAndEqualizers: mediator shape does not match the cones',
        }
      }

      for (const index of objectCarrier) {
        const expected = candidate.legs(index)
        const projection = getProjection(index)
        const recomposed = base.compose(projection, report.mediator)
        if (!eq(recomposed, expected)) {
          return {
            factored: false,
            reason: `CategoryLimits.smallLimitFromProductsAndEqualizers: mediator does not reproduce leg ${String(
              index,
            )}`,
          }
        }
      }

      return { factored: true, mediator: report.mediator }
    }

    const projections: IndexedFamilies.SmallFamily<I, M> = (index) => getProjection(index)

    return {
      product: { obj: productWitness.obj, projections },
      pair: [deltaSource, deltaTarget],
      equalizer: { obj: equalizerWitness.obj, equalize: inclusion },
      cone: limitCone,
      factor,
    }
  }

  export interface LimitFromProductsAndEqualizersInput<I, A, O, M> {
    readonly base: Category<O, M> &
      ArrowFamilies.HasDomCod<O, M> &
      HasFiniteProducts<O, M> &
      HasEqualizers<O, M>
    readonly products: HasProductMediators<O, M>
    readonly diagram: FiniteDiagram<I, A, O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly factorEqualizer: EqualizerFactorizer<M>
  }

  export interface LimitFromProductsAndEqualizersWitness<I, O, M> {
    readonly product: { readonly obj: O; readonly projections: IndexedFamilies.Family<I, M> }
    readonly pair: readonly [M, M]
    readonly equalizer: { readonly obj: O; readonly equalize: M }
    readonly cone: Cone<I, O, M>
    readonly factor: (candidate: Cone<I, O, M>) => EqualizerFactorizationResult<M>
  }

  export const limitFromProductsAndEqualizers = <I, A, O, M>(
    input: LimitFromProductsAndEqualizersInput<I, A, O, M>,
  ): LimitFromProductsAndEqualizersWitness<I, O, M> => {
    const { base, products, diagram, factorEqualizer } = input
    const eq = input.eq ?? base.eq

    if (!eq) {
      throw new Error(
        'CategoryLimits.limitFromProductsAndEqualizers: base category must supply morphism equality',
      )
    }

    const objectCarrier = diagram.shape.objects.slice()
    if (objectCarrier.length === 0) {
      throw new Error(
        'CategoryLimits.limitFromProductsAndEqualizers: diagram must contain at least one object',
      )
    }

    const Ifin = IndexedFamilies.finiteIndex(objectCarrier)
    const projectionCache = new Map<I, M>()
    const legCache = new Map<I, M>()

    const objectsFamily: IndexedFamilies.Family<I, O> = (index) => diagram.onObjects(index)

    const factors = objectCarrier.map((index) => diagram.onObjects(index))
    const productWitness = products.product(factors)

    objectCarrier.forEach((index, idx) => {
      const projection = productWitness.projections[idx]
      if (!projection) {
        throw new Error(
          'CategoryLimits.limitFromProductsAndEqualizers: missing projection for diagram object',
        )
      }
      projectionCache.set(index, projection)
    })

    const getProjection = (index: I): M => {
      const projection = projectionCache.get(index)
      if (!projection) {
        throw new Error(
          `CategoryLimits.limitFromProductsAndEqualizers: no projection available for ${String(index)}`,
        )
      }
      return projection
    }

    const arrows = diagram.shape.arrows.slice()
    const arrowTargets = arrows.map((arrow) => diagram.onObjects(diagram.shape.dst(arrow)))
    const arrowProductWitness = products.product(arrowTargets)

    const arrowSourceLegs = arrows.map((arrow) => {
      const sourceIndex = diagram.shape.src(arrow)
      const morphism = diagram.onMorphisms(arrow)
      return base.compose(morphism, getProjection(sourceIndex))
    })

    const arrowTargetLegs = arrows.map((arrow) => {
      const targetIndex = diagram.shape.dst(arrow)
      return getProjection(targetIndex)
    })

    const deltaSource = products.tuple(productWitness.obj, arrowSourceLegs, arrowProductWitness.obj)
    const deltaTarget = products.tuple(productWitness.obj, arrowTargetLegs, arrowProductWitness.obj)
    const equalizerWitness = base.equalizer(deltaSource, deltaTarget)

    objectCarrier.forEach((index) => {
      const leg = base.compose(getProjection(index), equalizerWitness.equalize)
      legCache.set(index, leg)
    })

    const limitLegs: IndexedFamilies.Family<I, M> = (index) => {
      const leg = legCache.get(index)
      if (!leg) {
        throw new Error(
          `CategoryLimits.limitFromProductsAndEqualizers: limit leg unavailable for ${String(index)}`,
        )
      }
      return leg
    }

    const limitCone: Cone<I, O, M> = { tip: equalizerWitness.obj, legs: limitLegs, diagram }

    const factor = (candidate: Cone<I, O, M>): EqualizerFactorizationResult<M> => {
      const validation = validateConeAgainstDiagram({
        category: base,
        eq,
        indices: Ifin,
        onObjects: objectsFamily,
        cone: candidate,
      })

      if (!validation.valid) {
        return validation.reason
          ? { factored: false, reason: validation.reason }
          : { factored: false }
      }

      const legsArr = Ifin.carrier.map((index) => candidate.legs(index))
      const fork = products.tuple(candidate.tip, legsArr, productWitness.obj)

      const report = factorEqualizer({
        left: deltaSource,
        right: deltaTarget,
        inclusion: equalizerWitness.equalize,
        fork,
      })

      if (!report.factored || !report.mediator) {
        return {
          factored: false,
          reason:
            report.reason ??
            'CategoryLimits.limitFromProductsAndEqualizers: equalizer factorization failed',
        }
      }

      if (base.dom(report.mediator) !== candidate.tip || base.cod(report.mediator) !== limitCone.tip) {
        return {
          factored: false,
          reason:
            'CategoryLimits.limitFromProductsAndEqualizers: mediator shape does not match the cones',
        }
      }

      for (const index of objectCarrier) {
        const expected = candidate.legs(index)
        const projection = getProjection(index)
        const recomposed = base.compose(projection, report.mediator)
        if (!eq(recomposed, expected)) {
          return {
            factored: false,
            reason: `CategoryLimits.limitFromProductsAndEqualizers: mediator does not reproduce leg ${String(
              index,
            )}`,
          }
        }
      }

      return { factored: true, mediator: report.mediator }
    }

    const projections: IndexedFamilies.Family<I, M> = (index) => getProjection(index)

    return {
      product: { obj: productWitness.obj, projections },
      pair: [deltaSource, deltaTarget],
      equalizer: { obj: equalizerWitness.obj, equalize: equalizerWitness.equalize },
      cone: limitCone,
      factor,
    }
  }

  export interface FiniteColimitFromCoproductsAndCoequalizersInput<I, A, O, M> {
    readonly base: FinitelyCocompleteCategory<O, M>
    readonly diagram: FiniteDiagram<I, A, O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly factorCoequalizer: CoequalizerFactorizer<M>
  }

  export interface FiniteColimitFromCoproductsAndCoequalizersWitness<I, O, M> {
    readonly coproduct: { readonly obj: O; readonly injections: IndexedFamilies.Family<I, M> }
    readonly pair: readonly [M, M]
    readonly coequalizer: { readonly obj: O; readonly coequalize: M }
    readonly cocone: Cocone<I, O, M>
    readonly factor: (candidate: Cocone<I, O, M>) => CoequalizerFactorizationResult<M>
  }

  export const finiteColimitFromCoproductsAndCoequalizers = <I, A, O, M>(
    input: FiniteColimitFromCoproductsAndCoequalizersInput<I, A, O, M>,
  ): FiniteColimitFromCoproductsAndCoequalizersWitness<I, O, M> => {
    const { base, diagram, factorCoequalizer } = input
    const eq = input.eq ?? base.eq

    if (!eq) {
      throw new Error(
        'CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: base category must supply morphism equality',
      )
    }

    const objectCarrier = diagram.shape.objects.slice()
    const Ifin = IndexedFamilies.finiteIndex(objectCarrier)

    const objectFamily: IndexedFamilies.Family<I, O> = (index) => diagram.onObjects(index)

    const objectCoproductWitness =
      objectCarrier.length === 0
        ? ({ obj: base.initialObj, injections: [] } as {
            readonly obj: O
            readonly injections: ReadonlyArray<M>
          })
        : base.coproduct(objectCarrier.map((index) => diagram.onObjects(index)))

    const injectionCache = new Map<I, M>()
    objectCarrier.forEach((index, position) => {
      const injection = objectCoproductWitness.injections[position]
      if (!injection) {
        throw new Error(
          'CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: missing injection for diagram object',
        )
      }
      injectionCache.set(index, injection)
    })

    const getInjection = (index: I): M => {
      const injection = injectionCache.get(index)
      if (!injection) {
        throw new Error(
          `CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: no injection available for ${String(index)}`,
        )
      }
      return injection
    }

    const arrows = diagram.shape.arrows.slice()
    const arrowSources = arrows.map((arrow) => diagram.onObjects(diagram.shape.src(arrow)))
    const arrowCoproduct =
      arrows.length === 0
        ? ({ obj: base.initialObj, injections: [] } as {
            readonly obj: O
            readonly injections: ReadonlyArray<M>
          })
        : base.coproduct(arrowSources)

    const arrowLeftLegs = arrows.map((arrow) => getInjection(diagram.shape.src(arrow)))
    const arrowRightLegs = arrows.map((arrow) => {
      const morphism = diagram.onMorphisms(arrow)
      const targetInjection = getInjection(diagram.shape.dst(arrow))
      return base.compose(targetInjection, morphism)
    })

    const deltaSource = base.cotuple(arrowCoproduct.obj, arrowLeftLegs, objectCoproductWitness.obj)
    const deltaTarget = base.cotuple(arrowCoproduct.obj, arrowRightLegs, objectCoproductWitness.obj)

    const coequalizerWitness = base.coequalizer(deltaSource, deltaTarget)

    const legCache = new Map<I, M>()
    objectCarrier.forEach((index) => {
      const injection = getInjection(index)
      const leg = base.compose(coequalizerWitness.coequalize, injection)
      legCache.set(index, leg)
    })

    const colimitLegs: IndexedFamilies.Family<I, M> = (index) => {
      const leg = legCache.get(index)
      if (!leg) {
        throw new Error(
          `CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: colimit leg unavailable for ${String(index)}`,
        )
      }
      return leg
    }

    const cocone: Cocone<I, O, M> = {
      coTip: coequalizerWitness.obj,
      legs: colimitLegs,
      diagram,
    }

    const validation = validateCoconeAgainstDiagram({
      category: base,
      eq,
      indices: Ifin,
      onObjects: objectFamily,
      cocone,
    })

    if (!validation.valid) {
      throw new Error(
        validation.reason
          ? `CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: canonical cocone invalid: ${validation.reason}`
          : 'CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: canonical cocone fails validation',
      )
    }

    const factor = (candidate: Cocone<I, O, M>): CoequalizerFactorizationResult<M> => {
      const candidateValidation = validateCoconeAgainstDiagram({
        category: base,
        eq,
        indices: Ifin,
        onObjects: objectFamily,
        cocone: candidate,
      })

      if (!candidateValidation.valid) {
        return candidateValidation.reason
          ? { factored: false, reason: candidateValidation.reason }
          : { factored: false }
      }

      const legsArr = Ifin.carrier.map((index) => candidate.legs(index))
      const fork = base.cotuple(objectCoproductWitness.obj, legsArr, candidate.coTip)

      const report = factorCoequalizer({
        left: deltaSource,
        right: deltaTarget,
        coequalizer: coequalizerWitness.coequalize,
        fork,
      })

      if (!report.factored || !report.mediator) {
        return {
          factored: false,
          reason:
            report.reason ??
            'CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: coequalizer factorization failed',
        }
      }

      if (base.dom(report.mediator) !== cocone.coTip || base.cod(report.mediator) !== candidate.coTip) {
        return {
          factored: false,
          reason:
            'CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: mediator shape does not match the cocones',
        }
      }

      for (const index of objectCarrier) {
        const expected = candidate.legs(index)
        const canonical = colimitLegs(index)
        const recomposed = base.compose(report.mediator, canonical)
        if (!eq(recomposed, expected)) {
          return {
            factored: false,
            reason: `CategoryLimits.finiteColimitFromCoproductsAndCoequalizers: mediator does not reproduce leg ${String(
              index,
            )}`,
          }
        }
      }

      return { factored: true, mediator: report.mediator }
    }

    const injections: IndexedFamilies.Family<I, M> = (index) => getInjection(index)

    return {
      coproduct: { obj: objectCoproductWitness.obj, injections },
      pair: [deltaSource, deltaTarget],
      coequalizer: { obj: coequalizerWitness.obj, coequalize: coequalizerWitness.coequalize },
      cocone,
      factor,
    }
  }

  export const makeEqualizersFromPullbacks = <O, M extends object>(
    input: EqualizerFromPullbacksInput<O, M>,
  ): EqualizerFromPullbacksWitness<O, M> => {
    const { base, terminal, products, pullbacks } = input
    const eq = input.eq ?? base.equalMor ?? ((left: M, right: M) => Object.is(left, right))

    const { terminalObj } = terminal
    if (terminalObj === undefined) {
      throw new Error('CategoryLimits.makeEqualizersFromPullbacks: terminal object witness is required')
    }

    const registry = new WeakMap<M, EqualizerFromPullbackSpanWitness<O, M>>()

    const describe = (left: M, right: M): EqualizerFromPullbackSpanWitness<O, M> => {
      const source = base.dom(left)
      if (source !== base.dom(right)) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: arrows must share a domain')
      }

      const target = base.cod(left)
      if (target !== base.cod(right)) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: arrows must share a codomain')
      }

      const { obj: productObj, projections } = products.product([target, target])
      if (projections.length !== 2) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: binary product must supply two projections')
      }

      const [projectionLeft, projectionRight] = projections as readonly [M, M]
      const pairing = products.tuple(source, [left, right], productObj)

      const idTarget = base.id(target)
      const diagonal = products.tuple(target, [idTarget, idTarget], productObj)

      const pullback = pullbacks.pullback(pairing, diagonal)
      const inclusion = pullback.toDomain
      const anchor = pullback.toAnchor

      if (base.dom(inclusion) !== pullback.apex) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: inclusion must originate at the pullback apex')
      }
      if (base.cod(inclusion) !== source) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: inclusion must land in the shared domain')
      }
      if (base.dom(anchor) !== pullback.apex || base.cod(anchor) !== target) {
        throw new Error('CategoryLimits.makeEqualizersFromPullbacks: anchor leg must land in the shared codomain')
      }

      const witness: EqualizerFromPullbackSpanWitness<O, M> = {
        left,
        right,
        product: { obj: productObj, projections: [projectionLeft, projectionRight] },
        diagonal,
        pairing,
        pullback,
        inclusion,
        anchor,
      }

      registry.set(inclusion, witness)
      return witness
    }

    const equalizer = (left: M, right: M) => {
      const witness = describe(left, right)
      return { obj: witness.pullback.apex, equalize: witness.inclusion }
    }

    const factorEqualizer: EqualizerFactorizer<M> = ({ left, right, inclusion, fork }) => {
      const witness = registry.get(inclusion)
      if (!witness) {
        return {
          factored: false,
          reason:
            'CategoryLimits.makeEqualizersFromPullbacks: unrecognised inclusion; construct it via spanWitness or equalizer first.',
        }
      }

      if (!eq(left, witness.left) || !eq(right, witness.right)) {
        return {
          factored: false,
          reason: 'CategoryLimits.makeEqualizersFromPullbacks: supplied arrows differ from the registered parallel pair.',
        }
      }

      const forkDomain = base.dom(fork)
      const forkCodomain = base.cod(fork)
      const expectedCodomain = base.cod(witness.inclusion)
      if (forkCodomain !== expectedCodomain) {
        return {
          factored: false,
          reason: 'CategoryLimits.makeEqualizersFromPullbacks: fork must land in the equalizer domain.',
        }
      }

      const viaLeft = base.compose(left, fork)
      const viaRight = base.compose(right, fork)
      if (!eq(viaLeft, viaRight)) {
        return {
          factored: false,
          reason: 'CategoryLimits.makeEqualizersFromPullbacks: fork does not equalize the parallel pair.',
        }
      }

      const candidate: PullbackData<O, M> = { apex: forkDomain, toDomain: fork, toAnchor: viaLeft }

      let mediator: M | undefined
      try {
        const verdict = pullbacks.factorCone(witness.pullback, candidate)
        if (!verdict.factored) {
          return {
            factored: false,
            reason:
              verdict.reason ?? 'CategoryLimits.makeEqualizersFromPullbacks: pullback calculator could not produce a mediator.',
          }
        }
        mediator = verdict.mediator
      } catch (error) {
        return {
          factored: false,
          reason:
            error instanceof Error
              ? error.message
              : 'CategoryLimits.makeEqualizersFromPullbacks: pullback calculator threw during factorisation.',
        }
      }

      if (!mediator) {
        return {
          factored: false,
          reason: 'CategoryLimits.makeEqualizersFromPullbacks: pullback factorisation did not return a mediator.',
        }
      }

      const recomposed = base.compose(witness.inclusion, mediator)
      if (!eq(recomposed, fork)) {
        return {
          factored: false,
          reason: 'CategoryLimits.makeEqualizersFromPullbacks: constructed mediator does not reproduce the fork.',
        }
      }

      return { factored: true, mediator }
    }

    return { equalizer, factorEqualizer, spanWitness: describe }
  }

  export const limitOfDiagram = <I, A, O, M>(input: {
    readonly base: FiniteCategoryT<O, M> &
      Category<O, M> &
      ArrowFamilies.HasDomCod<O, M> &
      HasFiniteProducts<O, M> &
      HasProductMediators<O, M> &
      HasEqualizers<O, M> &
      HasTerminal<O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly diagram: FiniteDiagram<I, A, O, M>
  }): LimitOfDiagramResult<I, O, M> => {
    const { base, diagram } = input
    const eq = input.eq ?? base.eq

    if (!eq) {
      throw new Error('CategoryLimits.limitOfDiagram: base category must supply morphism equality')
    }

    const objectCarrier = diagram.shape.objects.slice()
    const Ifin = IndexedFamilies.finiteIndex(objectCarrier)

    const projectionCache = new Map<I, M>()
    const legCache = new Map<I, M>()

    const objectsFamily: IndexedFamilies.Family<I, O> = (index) => diagram.onObjects(index)

    let limitTip: O
    let equalize: M | undefined

    if (objectCarrier.length === 0) {
      limitTip = base.terminalObj
    } else {
      const factors = objectCarrier.map((index) => diagram.onObjects(index))
      const { obj: productObj, projections } = base.product(factors)
      objectCarrier.forEach((index, idx) => {
        const projection = projections[idx]
        if (!projection) {
          throw new Error('CategoryLimits.limitOfDiagram: missing projection for diagram object')
        }
        projectionCache.set(index, projection)
      })

      const getProjection = (index: I): M => {
        const projection = projectionCache.get(index)
        if (!projection) {
          throw new Error(`CategoryLimits.limitOfDiagram: no projection available for ${String(index)}`)
        }
        return projection
      }

      const arrows = diagram.shape.arrows.slice()
      if (arrows.length === 0) {
        limitTip = productObj
        equalize = base.id(productObj)
      } else {
        const arrowTargets = arrows.map((arrow) => diagram.onObjects(diagram.shape.dst(arrow)))
        const { obj: arrowProductObj } = base.product(arrowTargets)

        const arrowSourceLegs = arrows.map((arrow) => {
          const sourceIndex = diagram.shape.src(arrow)
          const morphism = diagram.onMorphisms(arrow)
          return base.compose(morphism, getProjection(sourceIndex))
        })

        const arrowTargetLegs = arrows.map((arrow) => {
          const targetIndex = diagram.shape.dst(arrow)
          return getProjection(targetIndex)
        })

        const deltaSource = base.tuple(productObj, arrowSourceLegs, arrowProductObj)
        const deltaTarget = base.tuple(productObj, arrowTargetLegs, arrowProductObj)
        const equalizerWitness = base.equalizer(deltaSource, deltaTarget)
        limitTip = equalizerWitness.obj
        equalize = equalizerWitness.equalize
      }

      if (!equalize) {
        throw new Error('CategoryLimits.limitOfDiagram: failed to construct equalizer mediator')
      }

      objectCarrier.forEach((index) => {
        const projection = getProjection(index)
        const leg = base.compose(projection, equalize!)
        legCache.set(index, leg)
      })
    }

    const limitLegs: IndexedFamilies.Family<I, M> = (index) => {
      const leg = legCache.get(index)
      if (!leg) {
        throw new Error(`CategoryLimits.limitOfDiagram: limit leg unavailable for ${String(index)}`)
      }
      return leg
    }

    const limitCone: Cone<I, O, M> = objectCarrier.length === 0
      ? {
          tip: limitTip,
          legs: () => {
            throw new Error('CategoryLimits.limitOfDiagram: empty diagram has no legs')
          },
          diagram,
        }
      : { tip: limitTip, legs: limitLegs, diagram }

    const coneCategory = makeConeCategory({ base, eq, Ifin, F: objectsFamily, diagram })
    const terminality = checkTerminalCone(coneCategory, limitCone)
    if (!terminality.holds || !terminality.locatedLimit) {
      throw new Error('CategoryLimits.limitOfDiagram: canonical cone is not terminal in the cone category')
    }

    const mediatorLookup = new Map<Cone<I, O, M>, ConeMorphism<I, O, M>>()
    terminality.mediators.forEach(({ source, arrow }) => mediatorLookup.set(source, arrow))

    const factor = (candidate: Cone<I, O, M>) => {
      for (const index of objectCarrier) {
        let leg: M
        try {
          leg = candidate.legs(index)
        } catch (error) {
          return {
            holds: false,
            reason: `CategoryLimits.limitOfDiagram: cone is missing leg ${String(index)} (${String(error)})`,
          }
        }
        if (base.dom(leg) !== candidate.tip) {
          return {
            holds: false,
            reason: `CategoryLimits.limitOfDiagram: leg ${String(index)} originates at ${String(
              base.dom(leg),
            )} instead of the cone tip`,
          }
        }
        const expectedCodomain = diagram.onObjects(index)
        if (base.cod(leg) !== expectedCodomain) {
          return {
            holds: false,
            reason: `CategoryLimits.limitOfDiagram: leg ${String(index)} lands in ${String(
              base.cod(leg),
            )} rather than ${String(expectedCodomain)}`,
          }
        }
      }

      const normalizedCone: Cone<I, O, M> = { tip: candidate.tip, legs: candidate.legs, diagram }
      if (!coneRespectsDiagram(base, eq, normalizedCone)) {
        return { holds: false, reason: 'CategoryLimits.limitOfDiagram: cone legs do not commute with the diagram' }
      }

      const located = coneCategory.locateCone(candidate)
      if (!located) {
        return { holds: false, reason: 'CategoryLimits.limitOfDiagram: cone not present in the enumerated cone category' }
      }

      const mediatorEntry = mediatorLookup.get(located)
      if (!mediatorEntry) {
        return { holds: false, reason: 'CategoryLimits.limitOfDiagram: no mediator recorded for the supplied cone' }
      }

      const mediator = mediatorEntry.mediator
      if (base.dom(mediator) !== candidate.tip || base.cod(mediator) !== limitCone.tip) {
        return { holds: false, reason: 'CategoryLimits.limitOfDiagram: mediator shape does not match the cones' }
      }

      for (const index of objectCarrier) {
        const lhs = base.compose(limitCone.legs(index), mediator)
        const rhs = candidate.legs(index)
        if (!eq(lhs, rhs)) {
          return {
            holds: false,
            reason: `CategoryLimits.limitOfDiagram: mediator does not reproduce leg ${String(index)}`,
          }
        }
      }

      return { holds: true, mediator }
    }

    return { cone: limitCone, factor, coneCategory, terminality }
  }

  /** Coproduct (colimit) shape data */
  export interface Cocone<I, O, M> {
    coTip: O
    legs: IndexedFamilies.Family<I, M>
    diagram: DiagramLike<I, O, M>
  }

  export interface CoconeObjectDiagnostic<I, O> {
    readonly index: I
    readonly expected?: O
    readonly actual?: O
    readonly present: boolean
    readonly holds: boolean
    readonly reason?: string
  }

  export interface CoconeLegDiagnostic<I, O, M> {
    readonly index: I
    readonly leg: M
    readonly actualDomain: O
    readonly actualCodomain: O
    readonly expectedDomain: O
    readonly expectedCodomain: O
    readonly holds: boolean
    readonly reason?: string
  }

  export interface CoconeArrowNaturality<I, M> {
    readonly sourceIndex: I
    readonly targetIndex: I
    readonly transported: M
    readonly sourceLeg: M
    readonly arrow: DiagramArrow<I, M>
    readonly holds: boolean
    readonly reason?: string
  }

  export interface CoconeNaturalityAnalysis<I, O, M> {
    readonly objectDiagnostics: ReadonlyArray<CoconeObjectDiagnostic<I, O>>
    readonly legDiagnostics: ReadonlyArray<CoconeLegDiagnostic<I, O, M>>
    readonly arrowDiagnostics: ReadonlyArray<CoconeArrowNaturality<I, M>>
    readonly holds: boolean
  }

  export interface CoconeMorphism<I, O, M> {
    readonly source: Cocone<I, O, M>
    readonly target: Cocone<I, O, M>
    readonly mediator: M
  }

  export interface CoconeCategoryResult<I, O, M> {
    readonly category: FiniteCategoryT<Cocone<I, O, M>, CoconeMorphism<I, O, M>>
    readonly locateCocone: (cocone: Cocone<I, O, M>) => Cocone<I, O, M> | undefined
    readonly morphisms: (
      source: Cocone<I, O, M>,
      target: Cocone<I, O, M>,
    ) => ReadonlyArray<CoconeMorphism<I, O, M>>
  }

  export interface CoconeInitialityWitness<I, O, M> {
    readonly locatedColimit?: Cocone<I, O, M>
    readonly mediators: ReadonlyArray<{ target: Cocone<I, O, M>; arrow: CoconeMorphism<I, O, M> }>
    readonly holds: boolean
    readonly failure?: { target: Cocone<I, O, M>; arrows: ReadonlyArray<CoconeMorphism<I, O, M>> }
  }

  export const makeCoconeCategory = <I, O, M>(input: {
    readonly base: FiniteCategoryT<O, M> & Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq?: (a: M, b: M) => boolean
    readonly Ifin: IndexedFamilies.FiniteIndex<I>
    readonly F: IndexedFamilies.Family<I, O>
    readonly diagram: DiagramLike<I, O, M>
  }): CoconeCategoryResult<I, O, M> => {
    const { base, eq = base.eq, Ifin, F, diagram } = input

    if (!eq) {
      throw new Error('CategoryLimits.makeCoconeCategory: base category must supply equality on morphisms')
    }

    const indices = Ifin.carrier
    const includesIndex = (value: I): boolean => indices.some((candidate) => candidate === value)
    const diagramArrows = enumerateDiagramArrows(diagram)

    if (isFiniteDiagram(diagram)) {
      for (const object of diagram.shape.objects) {
        if (!includesIndex(object)) {
          throw new Error(
            'CategoryLimits.makeCoconeCategory: finite diagram contains an object outside the supplied indices',
          )
        }
      }
      for (const index of indices) {
        if (!diagram.shape.objects.some((candidate) => candidate === index)) {
          throw new Error(
            'CategoryLimits.makeCoconeCategory: index family includes an object missing from the diagram',
          )
        }
        const assigned = diagram.onObjects(index)
        const advertised = F(index)
        if (assigned !== advertised) {
          throw new Error(
            'CategoryLimits.makeCoconeCategory: diagram object assignment disagrees with the supplied family',
          )
        }
      }
      const functoriality = checkFiniteDiagramFunctoriality({ base, eq, diagram })
      if (!functoriality.holds) {
        throw new Error(
          `CategoryLimits.makeCoconeCategory: diagram fails functoriality checks: ${functoriality.issues.join('; ')}`,
        )
      }
    }

    for (const arrow of diagramArrows) {
      if (!includesIndex(arrow.source) || !includesIndex(arrow.target)) {
        throw new Error(
          'CategoryLimits.makeCoconeCategory: diagram references an index outside the supplied finite family',
        )
      }
    }

    type EnumeratedCocone = Cocone<I, O, M> & { readonly legsMap: ReadonlyMap<I, M> }

    const cocones: EnumeratedCocone[] = []

    const coconesEqual = (left: EnumeratedCocone, right: Cocone<I, O, M>): boolean => {
      if (left.coTip !== right.coTip) return false
      for (const index of indices) {
        const expected = left.legsMap.get(index)
        if (expected === undefined) return false
        const candidate = right.legs(index)
        if (!eq(expected, candidate)) return false
      }
      return true
    }

    const locateCocone = (candidate: Cocone<I, O, M>): EnumeratedCocone | undefined =>
      cocones.find((existing) => coconesEqual(existing, candidate))

    const addCocone = (cocone: EnumeratedCocone): void => {
      if (!locateCocone(cocone)) {
        cocones.push(cocone)
      }
    }

    if (indices.length === 0 && diagramArrows.length > 0) {
      throw new Error(
        'CategoryLimits.makeCoconeCategory: non-empty diagram requires indices in the supplied finite family',
      )
    }

    for (const coTip of base.objects) {
      if (indices.length === 0) {
        const legsMap = new Map<I, M>()
        const cocone: EnumeratedCocone = {
          coTip,
          legs: (index: I) => {
            throw new Error(
              `CategoryLimits.makeCoconeCategory: no legs available for index ${String(index)} in an empty diagram`,
            )
          },
          diagram,
          legsMap,
        }
        addCocone(cocone)
        continue
      }

      const options = indices.map((index) =>
        base.arrows.filter((arrow) => base.dom(arrow) === F(index) && base.cod(arrow) === coTip),
      )

      if (options.some((choices) => choices.length === 0)) continue

      const assignments: M[] = new Array(indices.length)

      const buildCocone = (position: number) => {
        if (position === indices.length) {
          const legsMap = new Map<I, M>()
          indices.forEach((index, idx) => legsMap.set(index, assignments[idx]!))
          const cocone: EnumeratedCocone = {
            coTip,
            legs: (index: I) => {
              const leg = legsMap.get(index)
              if (leg === undefined) {
                throw new Error(
                  `CategoryLimits.makeCoconeCategory: missing leg for index ${String(index)} in enumerated cocone`,
                )
              }
              return leg
            },
            diagram,
            legsMap,
          }
          if (coconeRespectsDiagram(base, eq, cocone)) {
            addCocone(cocone)
          }
          return
        }

        for (const arrow of options[position]!) {
          assignments[position] = arrow
          buildCocone(position + 1)
        }
      }

      buildCocone(0)
    }

    const morphisms: CoconeMorphism<I, O, M>[] = []

    const arrowEq = (left: CoconeMorphism<I, O, M>, right: CoconeMorphism<I, O, M>) =>
      left.source === right.source && left.target === right.target && eq(left.mediator, right.mediator)

    const addMorphism = (morphism: CoconeMorphism<I, O, M>): void => {
      if (!morphisms.some((existing) => arrowEq(existing, morphism))) {
        morphisms.push(morphism)
      }
    }

    for (const cocone of cocones) {
      const identity = base.id(cocone.coTip)
      addMorphism({ source: cocone, target: cocone, mediator: identity })
    }

    for (const arrow of base.arrows) {
      const domain = base.dom(arrow)
      const codomain = base.cod(arrow)
      const sources = cocones.filter((cocone) => cocone.coTip === domain)
      const targets = cocones.filter((cocone) => cocone.coTip === codomain)
      for (const sourceCocone of sources) {
        for (const targetCocone of targets) {
          let commutes = true
          for (const index of indices) {
            const composed = base.compose(arrow, sourceCocone.legs(index))
            const expected = targetCocone.legs(index)
            if (!eq(composed, expected)) {
              commutes = false
              break
            }
          }
          if (commutes) {
            addMorphism({ source: sourceCocone, target: targetCocone, mediator: arrow })
          }
        }
      }
    }

    const findMorphism = (
      source: EnumeratedCocone,
      target: EnumeratedCocone,
      mediator: M,
    ): CoconeMorphism<I, O, M> => {
      const found = morphisms.find(
        (arrow) => arrow.source === source && arrow.target === target && eq(arrow.mediator, mediator),
      )
      if (!found) {
        throw new Error('CategoryLimits.makeCoconeCategory: mediator not present in cocone category')
      }
      return found
    }

    const objects = cocones as ReadonlyArray<Cocone<I, O, M>>
    const arrows = morphisms as ReadonlyArray<CoconeMorphism<I, O, M>>

    const category: FiniteCategoryT<Cocone<I, O, M>, CoconeMorphism<I, O, M>> = {
      objects,
      arrows,
      id: (object) => findMorphism(object as EnumeratedCocone, object as EnumeratedCocone, base.id(object.coTip)),
      compose: (g, f) => {
        if (f.target !== g.source) {
          throw new Error('CategoryLimits.makeCoconeCategory: morphism composition domain mismatch')
        }
        const mediator = base.compose(g.mediator, f.mediator)
        return findMorphism(f.source as EnumeratedCocone, g.target as EnumeratedCocone, mediator)
      },
      src: (arrow) => arrow.source,
      dst: (arrow) => arrow.target,
      eq: arrowEq,
    }

    const morphismsBetween = (
      source: Cocone<I, O, M>,
      target: Cocone<I, O, M>,
    ): ReadonlyArray<CoconeMorphism<I, O, M>> => {
      const locatedSource = locateCocone(source)
      const locatedTarget = locateCocone(target)
      if (!locatedSource || !locatedTarget) return []
      return morphisms.filter((arrow) => arrow.source === locatedSource && arrow.target === locatedTarget)
    }

    return {
      category,
      locateCocone,
      morphisms: morphismsBetween,
    }
  }

  export const checkInitialCocone = <I, O, M>(
    category: CoconeCategoryResult<I, O, M>,
    candidate: Cocone<I, O, M>,
  ): CoconeInitialityWitness<I, O, M> => {
    const locatedColimit = category.locateCocone(candidate)
    if (!locatedColimit) {
      return { holds: false, mediators: [], failure: { target: candidate, arrows: [] } }
    }

    const witnesses: Array<{ target: Cocone<I, O, M>; arrow: CoconeMorphism<I, O, M> }> = []
    const identity = category.category.id(locatedColimit)

    for (const cocone of category.category.objects) {
      const arrows = category.morphisms(locatedColimit, cocone)
      if (arrows.length !== 1) {
        return { holds: false, locatedColimit, mediators: witnesses, failure: { target: cocone, arrows } }
      }
      const arrow = arrows[0]!
      witnesses.push({ target: cocone, arrow })
      if (cocone === locatedColimit && !category.category.eq(arrow, identity)) {
        return { holds: false, locatedColimit, mediators: witnesses, failure: { target: cocone, arrows } }
      }
    }

    return { holds: true, locatedColimit, mediators: witnesses }
  }

  export const coneRespectsDiagram = <I, O, M>(
    C: Category<O, M>,
    eq: (a: M, b: M) => boolean,
    cone: Cone<I, O, M>,
  ): boolean => {
    for (const { source, target, morphism } of enumerateDiagramArrows(cone.diagram)) {
      const transported = C.compose(morphism, cone.legs(source))
      const targetLeg = cone.legs(target)
      if (!eq(transported, targetLeg)) {
        return false
      }
    }
    return true
  }

  export const coconeRespectsDiagram = <I, O, M>(
    C: Category<O, M>,
    eq: (a: M, b: M) => boolean,
    cocone: Cocone<I, O, M>,
  ): boolean => {
    for (const { source, target, morphism } of enumerateDiagramArrows(cocone.diagram)) {
      const transported = C.compose(cocone.legs(target), morphism)
      const sourceLeg = cocone.legs(source)
      if (!eq(transported, sourceLeg)) {
        return false
      }
    }
    return true
  }

  export interface ConeValidationResult {
    readonly valid: boolean
    readonly reason?: string
  }

  export const analyzeConeNaturality = <I, O, M>(input: {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cone: Cone<I, O, M>
  }): ConeNaturalityAnalysis<I, O, M> => {
    const { category: C, eq, indices, onObjects, cone } = input
    const diagram = cone.diagram
    const carrier = indices.carrier
    const includesIndex = (index: I): boolean => carrier.some((candidate) => candidate === index)

    const objectDiagnostics: ConeObjectDiagnostic<I, O>[] = []
    if (isFiniteDiagram(diagram)) {
      for (const object of diagram.shape.objects) {
        if (!includesIndex(object)) {
          objectDiagnostics.push({
            index: object,
            present: false,
            holds: false,
            reason: `diagram references ${String(object)} outside the supplied index set`,
          })
          continue
        }
        const advertised = onObjects(object)
        const assigned = diagram.onObjects(object)
        const holds = Object.is(advertised, assigned)
        objectDiagnostics.push(
          holds
            ? { index: object, expected: advertised, actual: assigned, present: true, holds }
            : {
                index: object,
                expected: advertised,
                actual: assigned,
                present: true,
                holds,
                reason: `diagram object ${String(object)} disagrees with supplied family`,
              },
        )
      }
      for (const index of carrier) {
        if (!diagram.shape.objects.some((candidate) => candidate === index)) {
          objectDiagnostics.push({
            index,
            expected: onObjects(index),
            present: false,
            holds: false,
            reason: `index ${String(index)} missing from diagram objects`,
          })
        }
      }
    }

    const legDiagnostics: ConeLegDiagnostic<I, O, M>[] = []
    for (const index of carrier) {
      const leg = cone.legs(index)
      const actualDomain = C.dom(leg)
      const actualCodomain = C.cod(leg)
      const expectedDomain = cone.tip
      const expectedCodomain = onObjects(index)
      const holds = Object.is(actualDomain, expectedDomain) && Object.is(actualCodomain, expectedCodomain)
      legDiagnostics.push(
        holds
          ? { index, leg, actualDomain, actualCodomain, expectedDomain, expectedCodomain, holds }
          : {
              index,
              leg,
              actualDomain,
              actualCodomain,
              expectedDomain,
              expectedCodomain,
              holds,
              reason: !Object.is(actualDomain, expectedDomain)
                ? `leg ${String(index)} has domain ${String(actualDomain)} instead of ${String(expectedDomain)}`
                : `leg ${String(index)} targets ${String(actualCodomain)} rather than ${String(expectedCodomain)}`,
            },
      )
    }

    const arrowDiagnostics: ConeArrowNaturality<I, M>[] = []
    for (const arrow of enumerateDiagramArrows(diagram)) {
      if (!includesIndex(arrow.source) || !includesIndex(arrow.target)) {
        arrowDiagnostics.push({
          sourceIndex: arrow.source,
          targetIndex: arrow.target,
          transported: arrow.morphism,
          targetLeg: cone.legs(arrow.target),
          arrow,
          holds: false,
          reason: `arrow ${String(arrow.source)}→${String(arrow.target)} leaves the supplied index set`,
        })
        continue
      }
      const expectedDom = onObjects(arrow.source)
      const expectedCod = onObjects(arrow.target)
      if (!Object.is(C.dom(arrow.morphism), expectedDom) || !Object.is(C.cod(arrow.morphism), expectedCod)) {
        arrowDiagnostics.push({
          sourceIndex: arrow.source,
          targetIndex: arrow.target,
          transported: arrow.morphism,
          targetLeg: cone.legs(arrow.target),
          arrow,
          holds: false,
          reason: `morphism ${String(arrow.source)}→${String(arrow.target)} has mismatched endpoints`,
        })
        continue
      }
      const transported = C.compose(arrow.morphism, cone.legs(arrow.source))
      const targetLeg = cone.legs(arrow.target)
      const holds = eq(transported, targetLeg)
      arrowDiagnostics.push(
        holds
          ? { sourceIndex: arrow.source, targetIndex: arrow.target, transported, targetLeg, arrow, holds }
          : {
              sourceIndex: arrow.source,
              targetIndex: arrow.target,
              transported,
              targetLeg,
              arrow,
              holds,
              reason: `leg ${String(arrow.target)} does not commute with arrow ${String(arrow.source)}→${String(
                arrow.target,
              )}`,
            },
      )
    }

    const holds =
      objectDiagnostics.every((diagnostic) => diagnostic.holds) &&
      legDiagnostics.every((diagnostic) => diagnostic.holds) &&
      arrowDiagnostics.every((diagnostic) => diagnostic.holds)

    return { objectDiagnostics, legDiagnostics, arrowDiagnostics, holds }
  }

  export const validateConeAgainstDiagram = <I, O, M>(input: {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cone: Cone<I, O, M>
  }): ConeValidationResult => {
    const analysis = analyzeConeNaturality(input)
    if (analysis.holds) {
      return { valid: true }
    }

    const firstObjectIssue = analysis.objectDiagnostics.find((diagnostic) => !diagnostic.holds)
    if (firstObjectIssue) {
      return {
        valid: false,
        reason: `validateConeAgainstDiagram: ${firstObjectIssue.reason ?? 'diagram object mismatch'}`,
      }
    }

    const firstLegIssue = analysis.legDiagnostics.find((diagnostic) => !diagnostic.holds)
    if (firstLegIssue) {
      return {
        valid: false,
        reason: `validateConeAgainstDiagram: ${firstLegIssue.reason ?? 'cone leg mismatch'}`,
      }
    }

    const firstArrowIssue = analysis.arrowDiagnostics.find((diagnostic) => !diagnostic.holds)
    if (firstArrowIssue) {
      return {
        valid: false,
        reason: `validateConeAgainstDiagram: ${firstArrowIssue.reason ?? 'naturality failure'}`,
      }
    }

    return { valid: false, reason: 'validateConeAgainstDiagram: unknown failure' }
  }

  export interface CoconeValidationResult {
    readonly valid: boolean
    readonly reason?: string
  }

  export const analyzeCoconeNaturality = <I, O, M>(input: {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cocone: Cocone<I, O, M>
  }): CoconeNaturalityAnalysis<I, O, M> => {
    const { category: C, eq, indices, onObjects, cocone } = input
    const diagram = cocone.diagram
    const carrier = indices.carrier
    const includesIndex = (index: I): boolean => carrier.some((candidate) => candidate === index)

    const objectDiagnostics: CoconeObjectDiagnostic<I, O>[] = []
    if (isFiniteDiagram(diagram)) {
      for (const object of diagram.shape.objects) {
        if (!includesIndex(object)) {
          objectDiagnostics.push({
            index: object,
            present: false,
            holds: false,
            reason: `diagram references ${String(object)} outside the supplied index set`,
          })
          continue
        }
        const advertised = onObjects(object)
        const assigned = diagram.onObjects(object)
        const holds = Object.is(advertised, assigned)
        objectDiagnostics.push(
          holds
            ? { index: object, expected: advertised, actual: assigned, present: true, holds }
            : {
                index: object,
                expected: advertised,
                actual: assigned,
                present: true,
                holds,
                reason: `diagram object ${String(object)} disagrees with supplied family`,
              },
        )
      }
      for (const index of carrier) {
        if (!diagram.shape.objects.some((candidate) => candidate === index)) {
          objectDiagnostics.push({
            index,
            expected: onObjects(index),
            present: false,
            holds: false,
            reason: `index ${String(index)} missing from diagram objects`,
          })
        }
      }
    }

    const legDiagnostics: CoconeLegDiagnostic<I, O, M>[] = []
    for (const index of carrier) {
      const leg = cocone.legs(index)
      const actualDomain = C.dom(leg)
      const actualCodomain = C.cod(leg)
      const expectedDomain = onObjects(index)
      const expectedCodomain = cocone.coTip
      const holds = Object.is(actualDomain, expectedDomain) && Object.is(actualCodomain, expectedCodomain)
      legDiagnostics.push(
        holds
          ? { index, leg, actualDomain, actualCodomain, expectedDomain, expectedCodomain, holds }
          : {
              index,
              leg,
              actualDomain,
              actualCodomain,
              expectedDomain,
              expectedCodomain,
              holds,
              reason: !Object.is(actualDomain, expectedDomain)
                ? `leg ${String(index)} has domain ${String(actualDomain)} instead of ${String(expectedDomain)}`
                : `leg ${String(index)} targets ${String(actualCodomain)} instead of the cocone cotip`,
            },
      )
    }

    const arrowDiagnostics: CoconeArrowNaturality<I, M>[] = []
    for (const arrow of enumerateDiagramArrows(diagram)) {
      if (!includesIndex(arrow.source) || !includesIndex(arrow.target)) {
        arrowDiagnostics.push({
          sourceIndex: arrow.source,
          targetIndex: arrow.target,
          transported: arrow.morphism,
          sourceLeg: cocone.legs(arrow.source),
          arrow,
          holds: false,
          reason: `arrow ${String(arrow.source)}→${String(arrow.target)} leaves the supplied index set`,
        })
        continue
      }
      const expectedDom = onObjects(arrow.source)
      const expectedCod = onObjects(arrow.target)
      if (!Object.is(C.dom(arrow.morphism), expectedDom) || !Object.is(C.cod(arrow.morphism), expectedCod)) {
        arrowDiagnostics.push({
          sourceIndex: arrow.source,
          targetIndex: arrow.target,
          transported: arrow.morphism,
          sourceLeg: cocone.legs(arrow.source),
          arrow,
          holds: false,
          reason: `morphism ${String(arrow.source)}→${String(arrow.target)} has mismatched endpoints`,
        })
        continue
      }
      const transported = C.compose(cocone.legs(arrow.target), arrow.morphism)
      const sourceLeg = cocone.legs(arrow.source)
      const holds = eq(transported, sourceLeg)
      arrowDiagnostics.push(
        holds
          ? { sourceIndex: arrow.source, targetIndex: arrow.target, transported, sourceLeg, arrow, holds }
          : {
              sourceIndex: arrow.source,
              targetIndex: arrow.target,
              transported,
              sourceLeg,
              arrow,
              holds,
              reason: `leg ${String(arrow.source)} does not commute with arrow ${String(arrow.source)}→${String(
                arrow.target,
              )}`,
            },
      )
    }

    const holds =
      objectDiagnostics.every((diagnostic) => diagnostic.holds) &&
      legDiagnostics.every((diagnostic) => diagnostic.holds) &&
      arrowDiagnostics.every((diagnostic) => diagnostic.holds)

    return { objectDiagnostics, legDiagnostics, arrowDiagnostics, holds }
  }

  export const validateCoconeAgainstDiagram = <I, O, M>(input: {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cocone: Cocone<I, O, M>
  }): CoconeValidationResult => {
    const analysis = analyzeCoconeNaturality(input)
    if (analysis.holds) {
      return { valid: true }
    }

    const firstObjectIssue = analysis.objectDiagnostics.find((diagnostic) => !diagnostic.holds)
    if (firstObjectIssue) {
      return {
        valid: false,
        reason: `validateCoconeAgainstDiagram: ${firstObjectIssue.reason ?? 'diagram object mismatch'}`,
      }
    }

    const firstLegIssue = analysis.legDiagnostics.find((diagnostic) => !diagnostic.holds)
    if (firstLegIssue) {
      return {
        valid: false,
        reason: `validateCoconeAgainstDiagram: ${firstLegIssue.reason ?? 'cocone leg mismatch'}`,
      }
    }

    const firstArrowIssue = analysis.arrowDiagnostics.find((diagnostic) => !diagnostic.holds)
    if (firstArrowIssue) {
      return {
        valid: false,
        reason: `validateCoconeAgainstDiagram: ${firstArrowIssue.reason ?? 'naturality failure'}`,
      }
    }

    return { valid: false, reason: 'validateCoconeAgainstDiagram: unknown failure' }
  }

  export const extendConeToClosure = <I, O, M>(input: {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cone: Cone<I, O, M>
  }): { extended: true; cone: Cone<I, O, M> } | { extended: false; reason: string } => {
    const { category: C, eq, indices, onObjects, cone } = input
    if (!isFiniteDiagram(cone.diagram)) {
      return { extended: false, reason: 'extendConeToClosure: cone does not carry finite diagram data' }
    }

    const finiteDiagram = cone.diagram
    const ambient: SmallCategory<I, typeof finiteDiagram.shape.arrows[number]> = {
      objects: new Set(finiteDiagram.shape.objects),
      arrows: new Set(finiteDiagram.shape.arrows),
      id: finiteDiagram.shape.id,
      compose: (g, f) => finiteDiagram.shape.compose(g, f),
      src: (arrow) => finiteDiagram.shape.src(arrow),
      dst: (arrow) => finiteDiagram.shape.dst(arrow),
    }

    const seeds = finiteDiagram.shape.arrows.map((arrow) => ({
      arrow,
      morphism: finiteDiagram.onMorphisms(arrow),
    }))

    const closed = DiagramClosure.closeFiniteDiagram({
      ambient,
      target: C,
      onObjects: finiteDiagram.onObjects,
      seeds,
      objects: finiteDiagram.shape.objects,
      eq,
    })

    const closureArrows = closed.arrows.map((arrow) => ({
      source: closed.shape.dom(arrow),
      target: closed.shape.cod(arrow),
      morphism: closed.onMorphisms(arrow),
    }))

    const closureShape: FiniteCategoryT<I, typeof closureArrows[number]> = {
      objects: closed.shape.objects.slice(),
      arrows: closureArrows.slice(),
      id: (object) => closed.shape.id(object),
      compose: (g, f) => closed.shape.compose(g, f),
      src: (arrow) => closed.shape.dom(arrow),
      dst: (arrow) => closed.shape.cod(arrow),
      eq: (left, right) => Object.is(left, right),
    }

    const closureDiagram = makeFiniteDiagram<I, typeof closureArrows[number], O, M>({
      shape: closureShape,
      onObjects: (object) => closed.onObjects(object),
      onMorphisms: (arrow) => closed.onMorphisms(arrow),
    })

    const extendedCone: Cone<I, O, M> = {
      tip: cone.tip,
      legs: cone.legs,
      diagram: closureDiagram,
    }

    const validation = validateConeAgainstDiagram({ category: C, eq, indices, onObjects, cone: extendedCone })
    if (!validation.valid) {
      return {
        extended: false,
        reason: validation.reason ?? 'extendConeToClosure: extended cone fails validation',
      }
    }

    return { extended: true, cone: extendedCone }
  }

  export const extendCoconeToClosure = <I, O, M>(input: {
    readonly category: Category<O, M> & ArrowFamilies.HasDomCod<O, M>
    readonly eq: (a: M, b: M) => boolean
    readonly indices: IndexedFamilies.FiniteIndex<I>
    readonly onObjects: IndexedFamilies.Family<I, O>
    readonly cocone: Cocone<I, O, M>
  }): { extended: true; cocone: Cocone<I, O, M> } | { extended: false; reason: string } => {
    const { category: C, eq, indices, onObjects, cocone } = input
    if (!isFiniteDiagram(cocone.diagram)) {
      return { extended: false, reason: 'extendCoconeToClosure: cocone does not carry finite diagram data' }
    }

    const finiteDiagram = cocone.diagram
    const ambient: SmallCategory<I, typeof finiteDiagram.shape.arrows[number]> = {
      objects: new Set(finiteDiagram.shape.objects),
      arrows: new Set(finiteDiagram.shape.arrows),
      id: finiteDiagram.shape.id,
      compose: (g, f) => finiteDiagram.shape.compose(g, f),
      src: (arrow) => finiteDiagram.shape.src(arrow),
      dst: (arrow) => finiteDiagram.shape.dst(arrow),
    }

    const seeds = finiteDiagram.shape.arrows.map((arrow) => ({
      arrow,
      morphism: finiteDiagram.onMorphisms(arrow),
    }))

    const closed = DiagramClosure.closeFiniteDiagram({
      ambient,
      target: C,
      onObjects: finiteDiagram.onObjects,
      seeds,
      objects: finiteDiagram.shape.objects,
      eq,
    })

    const closureArrows = closed.arrows.map((arrow) => ({
      source: closed.shape.dom(arrow),
      target: closed.shape.cod(arrow),
      morphism: closed.onMorphisms(arrow),
    }))

    const closureShape: FiniteCategoryT<I, typeof closureArrows[number]> = {
      objects: closed.shape.objects.slice(),
      arrows: closureArrows.slice(),
      id: (object) => closed.shape.id(object),
      compose: (g, f) => closed.shape.compose(g, f),
      src: (arrow) => closed.shape.dom(arrow),
      dst: (arrow) => closed.shape.cod(arrow),
      eq: (left, right) => Object.is(left, right),
    }

    const closureDiagram = makeFiniteDiagram<I, typeof closureArrows[number], O, M>({
      shape: closureShape,
      onObjects: (object) => closed.onObjects(object),
      onMorphisms: (arrow) => closed.onMorphisms(arrow),
    })

    const extendedCocone: Cocone<I, O, M> = {
      coTip: cocone.coTip,
      legs: cocone.legs,
      diagram: closureDiagram,
    }

    const validation = validateCoconeAgainstDiagram({ category: C, eq, indices, onObjects, cocone: extendedCocone })
    if (!validation.valid) {
      return {
        extended: false,
        reason: validation.reason ?? 'extendCoconeToClosure: extended cocone fails validation',
      }
    }

    return { extended: true, cocone: extendedCocone }
  }

  /** Trait for building product mediating maps */
  export interface HasProductMediators<O, M> extends HasFiniteProducts<O, M> {
    // build ⟨f_i⟩ : X -> ∏F(i) from legs f_i and known product object
    tuple: (domain: O, legs: ReadonlyArray<M>, product: O) => M
  }

  export type BinaryProductTuple<O, M> = CategoryBinaryProductTuple<O, M>

  export type BinaryProductSwapResult<O, M> = CategoryBinaryProductSwapResult<O, M>

  export type BinaryProductDiagonalFactor<O, M> = CategoryBinaryProductDiagonalFactor<O, M>

  export type BinaryProductComponentwiseInput<O, M> = CategoryBinaryProductComponentwiseInput<O, M>

  export type BinaryProductDiagonalPairingInput<O, M> = CategoryBinaryProductDiagonalPairingInput<O, M>

  export type BinaryProductInterchangeInput<O, M> = CategoryBinaryProductInterchangeInput<O, M>

  export type BinaryProductNaturalityInput<O, M> = CategoryBinaryProductNaturalityInput<O, M>

  export type NaturalNumbersObjectSequenceInput<O, M> = NaturalNumbersObjectSequence<O, M>
  export type NaturalNumbersObjectMediator<O, M> = NaturalNumbersObjectMediatorWitness<M>
  export type NaturalNumbersObjectUniqueness<O, M> = NaturalNumbersObjectUniquenessWitness<M>
  export type NaturalNumbersObjectStructure<O, M> = NaturalNumbersObjectWitness<O, M>
  export type NaturalNumbersInductionResult<M> = NaturalNumbersInductionWitness<M>
  export type NaturalNumbersInductionIsomorphismResult<M> =
    NaturalNumbersInductionIsomorphismWitness<M>
  export type NaturalNumbersZeroSeparationResult<O, M> =
    NaturalNumbersZeroSeparationWitness<O, M>
  export type NaturalNumbersPrimitiveRecursionResult<O, M> =
    NaturalNumbersPrimitiveRecursionWitness<O, M>
  export type NaturalNumbersPrimitiveRecursionExponentialResult<O, M> =
    NaturalNumbersPrimitiveRecursionExponentialWitness<O, M>
  export type NaturalNumbersPrimitiveRecursionCompatibilityResult<O, M> =
    NaturalNumbersPrimitiveRecursionCompatibility<O, M>
  export type NaturalNumbersAdditionResult<O, M> =
    NaturalNumbersAdditionWitness<O, M>
  export type IntegerCompletionResult<O, M> = IntegerCompletionWitness<O, M>
  export type ProductWithObjectFunctorDiagnosticsResult<O, M> =
    ProductWithObjectFunctorDiagnostics<O, M>
  export type ProductWithObjectFunctorOutput<O, M> = ProductWithObjectFunctorResult<O, M>
  export type TensorWithObjectFunctorDiagnosticsResult<O, M> =
    TensorWithObjectFunctorDiagnostics<O, M>
  export type TensorWithObjectFunctorOutput<O, M> = TensorWithObjectFunctorResult<O, M>
  export type NaturalNumbersInitialAlgebraResult<O, M> =
    NaturalNumbersInitialAlgebraWitness<O, M>
  export type PointImage<M> = PointImageWitness<M>
  export type PointCollision<M> = PointCollisionWitness<M>
  export type PointInjectiveResult<M> = PointInjectiveWitness<M>
  export type PointCoverage<M> = PointCoverageWitness<M>
  export type PointSurjectiveResult<M> = PointSurjectiveWitness<M>
  export type PointInfiniteResult<M> = PointInfiniteWitness<M>
  export type DedekindInfiniteResult<M> = DedekindInfiniteWitness<M>

  export type BinaryProductUnitPointCompatibilityInput<O, M> = CategoryBinaryProductUnitPointCompatibilityInput<O, M>

  export interface BinaryProductUnitCategory<C, M> {
    readonly objects: ReadonlyArray<C>
    readonly arrows: ReadonlyArray<M>
    readonly eq: (a: M, b: M) => boolean
    readonly compose: (g: M, f: M) => M
    readonly id: (object: C) => M
    readonly src: (arrow: M) => C
    readonly dst: (arrow: M) => C
  }

  export interface BinaryProductUnitInput<O, C, M> {
    readonly category: BinaryProductUnitCategory<C, M>
    readonly product: BinaryProductTuple<O, M>
    readonly factor: BinaryProductDiagonalFactor<O, M>
    readonly projection: M
    readonly legs: readonly [M, M]
    readonly productIdentity: M
  }

  export interface BinaryProductUnitWitness<M> {
    readonly forward: M
    readonly backward: M
  }

  export const swapBinaryProduct = makeBinaryProductSwap as <O, M>(
    current: BinaryProductTuple<O, M>,
    swapped: BinaryProductTuple<O, M>,
  ) => BinaryProductSwapResult<O, M>

  export const diagonalBinaryProduct = makeBinaryProductDiagonal as <O, M>(
    product: BinaryProductTuple<O, M>,
    factor: BinaryProductDiagonalFactor<O, M>,
  ) => M

  export const componentwiseBinaryProduct = makeBinaryProductComponentwise as <O, M>(
    input: BinaryProductComponentwiseInput<O, M>,
  ) => M

  export const checkBinaryProductComponentwiseCollapse =
    checkBinaryProductComponentwiseCollapseHelper as <O, M>(
      input: CategoryBinaryProductComponentwiseCollapseInput<O, M>,
    ) => boolean

  export const checkBinaryProductNaturality = checkBinaryProductNaturalityHelper as <O, M>(
    input: BinaryProductNaturalityInput<O, M>,
  ) => boolean

  export const naturalNumbersObjectComposites = naturalNumbersObjectCompatibility

  export const naturalNumbersObjectCheckCandidate = naturalNumbersObjectCandidateVerdict

  export const checkBinaryProductDiagonalPairing = checkBinaryProductDiagonalPairingHelper as <O, M>(
    input: BinaryProductDiagonalPairingInput<O, M>,
  ) => boolean

  export const checkBinaryProductInterchange = checkBinaryProductInterchangeHelper as <O, M>(
    input: BinaryProductInterchangeInput<O, M>,
  ) => boolean

  export const checkBinaryProductSwapCompatibility =
    checkBinaryProductSwapCompatibilityHelper as <O, M>(
      input: CategoryBinaryProductSwapCompatibilityInput<O, M>,
    ) => boolean

  export const checkBinaryProductUnitPointCompatibility =
    checkBinaryProductUnitPointCompatibilityHelper as <O, M>(
      input: BinaryProductUnitPointCompatibilityInput<O, M>,
    ) => boolean

  export const unitBinaryProduct = <O, C, M>({
    category,
    product,
    factor,
    projection,
    legs,
    productIdentity,
  }: BinaryProductUnitInput<O, C, M>): BinaryProductUnitWitness<M> => {
    if (legs.length !== 2) {
      throw new Error("CategoryLimits.unitBinaryProduct: expected exactly two legs")
    }

    const backward = product.tuple(factor.object, legs)
    const forward = projection

    const registry = category.arrows as M[]
    const eq = category.eq

    if (!registry.some((arrow) => eq(arrow, forward))) {
      registry.push(forward)
    }
    if (!registry.some((arrow) => eq(arrow, backward))) {
      registry.push(backward)
    }

    const compose = category.compose
    const identityFactor = factor.identity
    const identityProduct = productIdentity

    const forwardThenBackward = compose(forward, backward)
    if (!eq(forwardThenBackward, identityFactor)) {
      throw new Error(
        "CategoryLimits.unitBinaryProduct: forward ∘ backward must equal the identity on the factor",
      )
    }

    const backwardThenForward = compose(backward, forward)
    if (!eq(backwardThenForward, identityProduct)) {
      throw new Error(
        "CategoryLimits.unitBinaryProduct: backward ∘ forward must equal the identity on the product",
      )
    }

    const isoCategory = category as unknown as FiniteCategoryT<O, M>

    if (!isIso(isoCategory, forward)) {
      throw new Error("CategoryLimits.unitBinaryProduct: expected the forward arrow to be an isomorphism")
    }

    if (!isIso(isoCategory, backward)) {
      throw new Error("CategoryLimits.unitBinaryProduct: expected the backward arrow to be an isomorphism")
    }

    return { forward, backward }
  }

  /** Trait for building coproduct mediating maps */
  export interface HasCoproductMediators<O, M> extends HasFiniteCoproducts<O, M> {
    // build [g_i] : ⨁F(i) -> Y from legs g_i and known coproduct object
    cotuple: (coproduct: O, legs: ReadonlyArray<M>, codomain: O) => M
  }

  /** Generic product mediator builder */
  export const mediateProduct =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,             // objects F(i)
      C: HasProductMediators<O, M>,
      X: O,                                        // domain of legs
      legs: IndexedFamilies.Family<I, M>           // legs f_i : X -> F(i)
    ) => {
      const objs = Ifin.carrier.map((i) => F(i))
      const { obj: P, projections } = C.product(objs)
      const legsArr = Ifin.carrier.map((i) => legs(i))
      const mediator = C.tuple(X, legsArr, P)
      return {
        product: P,
        projections: (i: I) => projections[Ifin.carrier.indexOf(i)]!,
        mediator
      }
    }

  /** Generic coproduct mediator builder */
  export const mediateCoproduct =
    <I, O, M>(
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,             // objects F(i)
      C: HasCoproductMediators<O, M>,
      Y: O,                                        // codomain of legs
      legs: IndexedFamilies.Family<I, M>           // legs g_i : F(i) -> Y
    ) => {
      const objs = Ifin.carrier.map((i) => F(i))
      const { obj: Cop, injections } = C.coproduct(objs)
      const legsArr = Ifin.carrier.map((i) => legs(i))
      const mediator = C.cotuple(Cop, legsArr, Y)
      return {
        coproduct: Cop,
        injections: (i: I) => injections[Ifin.carrier.indexOf(i)]!,
        mediator
      }
    }

  /** Check if object satisfies product universal property for given cone */
  export const isProductForCone =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      productObj: O,
      projections: IndexedFamilies.Family<I, M>,
      cone: Cone<I, O, M>,                         // f_i : X -> F(i)
      tuple: (X: O, legs: ReadonlyArray<M>, P: O) => M,
      options?: { competitor?: M }
    ): {
      triangles: boolean
      unique: boolean
      mediator?: M
      comparison?: { competitor: M; triangles: boolean; agrees: boolean; equal: boolean }
      reason?: string
    } => {
      const indices = Ifin.carrier

      for (const index of indices) {
        const leg = cone.legs(index)
        if (!Object.is(C.dom(leg), cone.tip)) {
          return {
            triangles: false,
            unique: false,
            reason: `isProductForCone: leg ${String(index)} has domain ${String(
              C.dom(leg),
            )} instead of the cone tip`,
          }
        }
        const expectedCodomain = F(index)
        if (!Object.is(C.cod(leg), expectedCodomain)) {
          return {
            triangles: false,
            unique: false,
            reason: `isProductForCone: leg ${String(index)} targets ${String(
              C.cod(leg),
            )} rather than ${String(expectedCodomain)}`,
          }
        }
      }

    const validation = validateConeAgainstDiagram({ category: C, eq, indices: Ifin, onObjects: F, cone })
    if (!validation.valid) {
      return {
        triangles: false,
        unique: false,
        reason: validation.reason ?? 'isProductForCone: cone legs do not respect the diagram',
      }
    }

      const legsArr = indices.map((i) => cone.legs(i))
      const mediator = tuple(cone.tip, legsArr, productObj)
      const triangles = productMediates(C, eq, projections, mediator, cone, indices)
      let unique = triangles
      let comparison: { competitor: M; triangles: boolean; agrees: boolean; equal: boolean } | undefined

      if (triangles) {
        if (isFiniteCategoryStructure(C)) {
          try {
            const limitCone: Cone<I, O, M> = {
              tip: productObj,
              legs: (i: I) => projections(i),
              diagram: cone.diagram,
            }
            const coneCategory = makeConeCategory({ base: C, eq, Ifin, F, diagram: cone.diagram })
            const locatedSource = coneCategory.locateCone(cone)
            const terminality = checkTerminalCone(coneCategory, limitCone)
            if (locatedSource && terminality.locatedLimit) {
              if (!terminality.holds) {
                unique = false
              } else {
                const witness = terminality.mediators.find((entry) => entry.source === locatedSource)
                if (!witness || !eq(witness.arrow.mediator, mediator)) unique = false
              }
            }
          } catch {
            // Fall back to legacy uniqueness checks when the finite cone category cannot be constructed.
          }
        }

        const competitor = options?.competitor
        if (competitor) {
          const competitorTriangles = productMediates(C, eq, projections, competitor, cone, indices)
          const agrees =
            competitorTriangles && mediator
              ? agreeUnderProjections(C, eq, projections, mediator, competitor, indices)
              : false
          const equal = competitorTriangles && agrees && mediator ? eq(competitor, mediator) : false
          if (competitorTriangles && agrees && !equal) unique = false
          comparison = { competitor, triangles: competitorTriangles, agrees, equal }
        }
      }
      return {
        triangles,
        unique,
        mediator,
        ...(comparison === undefined ? {} : { comparison }),
      }
    }

  export const factorConeThroughProduct =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      productObj: O,
      projections: IndexedFamilies.Family<I, M>,
      cone: Cone<I, O, M>,
      tuple: (X: O, legs: ReadonlyArray<M>, P: O) => M,
      options?: { competitor?: M }
    ): { factored: boolean; mediator?: M; unique?: boolean; reason?: string } => {
      const verdict = isProductForCone(C, eq, Ifin, F, productObj, projections, cone, tuple, options)
      if (!verdict.triangles || !verdict.mediator) {
        return {
          factored: false,
          reason:
            verdict.reason ?? 'factorConeThroughProduct: cone does not factor through the advertised product object',
        }
    }
    return { factored: true, mediator: verdict.mediator, unique: verdict.unique }
  }

  export const arrowFromCone =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      productObj: O,
      projections: IndexedFamilies.Family<I, M>,
      cone: Cone<I, O, M>,
      tuple: (X: O, legs: ReadonlyArray<M>, P: O) => M,
      options?: { competitor?: M }
    ): { success: true; arrow: M; unique: boolean | undefined } | { success: false; reason: string } => {
      const factoring = factorConeThroughProduct(
        C,
        eq,
        Ifin,
        F,
        productObj,
        projections,
        cone,
        tuple,
        options,
      )

      if (!factoring.factored || !factoring.mediator) {
        return {
          success: false,
          reason:
            factoring.reason ?? 'arrowFromCone: cone does not factor through the advertised product object',
        }
      }

      return { success: true, arrow: factoring.mediator, unique: factoring.unique }
    }

  export const coneFromArrow =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      productObj: O,
      projections: IndexedFamilies.Family<I, M>,
      arrow: M,
      diagram: DiagramLike<I, O, M>,
    ): { constructed: true; cone: Cone<I, O, M> } | { constructed: false; reason: string } => {
      if (C.cod(arrow) !== productObj) {
        return {
          constructed: false,
          reason: 'coneFromArrow: arrow must target the advertised product object',
        }
      }

      const indices = Ifin.carrier
      for (const index of indices) {
        const projection = projections(index)
        if (C.dom(projection) !== productObj) {
          return {
            constructed: false,
            reason: `coneFromArrow: projection ${String(index)} has domain ${String(
              C.dom(projection),
            )} instead of the product object`,
          }
        }
        const expectedCodomain = F(index)
        if (C.cod(projection) !== expectedCodomain) {
          return {
            constructed: false,
            reason: `coneFromArrow: projection ${String(index)} targets ${String(
              C.cod(projection),
            )} rather than ${String(expectedCodomain)}`,
          }
        }
      }

      const cache = new Map<I, M>()
      const legs: IndexedFamilies.Family<I, M> = (i) => {
        if (!cache.has(i)) {
          cache.set(i, C.compose(projections(i), arrow))
        }
        return cache.get(i)!
      }

      const cone: Cone<I, O, M> = {
        tip: C.dom(arrow),
        legs,
        diagram,
      }

      if (!coneRespectsDiagram(C, eq, cone)) {
        return {
          constructed: false,
          reason: 'coneFromArrow: derived cone does not respect the diagram',
        }
      }

      return { constructed: true, cone }
    }

  /** Check if object satisfies coproduct universal property for given cocone */
  export const isCoproductForCocone =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      coproductObj: O,
      injections: IndexedFamilies.Family<I, M>,
      cocone: Cocone<I, O, M>,                     // g_i : F(i) -> Y
      cotuple: (Cop: O, legs: ReadonlyArray<M>, Y: O) => M,
      options?: { competitor?: M }
    ): {
      triangles: boolean
      unique: boolean
      mediator?: M
      comparison?: { competitor: M; triangles: boolean; agrees: boolean; equal: boolean }
      reason?: string
    } => {
      const indices = Ifin.carrier

      for (const index of indices) {
        const leg = cocone.legs(index)
        const expectedDomain = F(index)
        if (!Object.is(C.dom(leg), expectedDomain)) {
          return {
            triangles: false,
            unique: false,
            reason: `isCoproductForCocone: leg ${String(index)} has domain ${String(
              C.dom(leg),
            )} instead of ${String(expectedDomain)}`,
          }
        }
        if (!Object.is(C.cod(leg), cocone.coTip)) {
          return {
            triangles: false,
            unique: false,
            reason: `isCoproductForCocone: leg ${String(index)} targets ${String(
              C.cod(leg),
            )} instead of the cocone cotip`,
          }
        }
      }

    const validation = validateCoconeAgainstDiagram({ category: C, eq, indices: Ifin, onObjects: F, cocone })
    if (!validation.valid) {
      return {
        triangles: false,
        unique: false,
        reason: validation.reason ?? 'isCoproductForCocone: cocone legs do not respect the diagram',
      }
    }

      const legsArr = indices.map((i) => cocone.legs(i))
      const mediator = cotuple(coproductObj, legsArr, cocone.coTip)
      const triangles = coproductMediates(C, eq, injections, mediator, cocone, indices)
      let unique = triangles
      let comparison: { competitor: M; triangles: boolean; agrees: boolean; equal: boolean } | undefined

      if (triangles) {
        const competitor = options?.competitor
        if (competitor) {
          const competitorTriangles = coproductMediates(C, eq, injections, competitor, cocone, indices)
          const agrees =
            competitorTriangles && mediator
              ? agreeUnderInjections(C, eq, injections, mediator, competitor, indices)
              : false
          const equal = competitorTriangles && agrees && mediator ? eq(competitor, mediator) : false
          if (competitorTriangles && agrees && !equal) unique = false
          comparison = { competitor, triangles: competitorTriangles, agrees, equal }
        }
      }
      return {
        triangles,
        unique,
        mediator,
        ...(comparison === undefined ? {} : { comparison }),
      }
    }

  export const factorCoconeThroughCoproduct =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      coproductObj: O,
      injections: IndexedFamilies.Family<I, M>,
      cocone: Cocone<I, O, M>,
      cotuple: (Cop: O, legs: ReadonlyArray<M>, Y: O) => M,
      options?: { competitor?: M }
    ): { factored: boolean; mediator?: M; unique?: boolean; reason?: string } => {
      const verdict = isCoproductForCocone(C, eq, Ifin, F, coproductObj, injections, cocone, cotuple, options)
      if (!verdict.triangles || !verdict.mediator) {
        return {
          factored: false,
          reason:
            verdict.reason ??
            'factorCoconeThroughCoproduct: cocone does not factor through the advertised coproduct object',
        }
    }
    return { factored: true, mediator: verdict.mediator, unique: verdict.unique }
  }

  export const arrowFromCocone =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      coproductObj: O,
      injections: IndexedFamilies.Family<I, M>,
      cocone: Cocone<I, O, M>,
      cotuple: (Cop: O, legs: ReadonlyArray<M>, Y: O) => M,
      options?: { competitor?: M }
    ): { success: true; arrow: M; unique: boolean | undefined } | { success: false; reason: string } => {
      const factoring = factorCoconeThroughCoproduct(
        C,
        eq,
        Ifin,
        F,
        coproductObj,
        injections,
        cocone,
        cotuple,
        options,
      )

      if (!factoring.factored || !factoring.mediator) {
        return {
          success: false,
          reason:
            factoring.reason ?? 'arrowFromCocone: cocone does not factor through the advertised coproduct object',
        }
      }

      return { success: true, arrow: factoring.mediator, unique: factoring.unique }
    }

  export const coconeFromArrow =
    <I, O, M>(
      C: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
      eq: (a: M, b: M) => boolean,
      Ifin: IndexedFamilies.FiniteIndex<I>,
      F: IndexedFamilies.Family<I, O>,
      coproductObj: O,
      injections: IndexedFamilies.Family<I, M>,
      arrow: M,
      diagram: DiagramLike<I, O, M>,
    ): { constructed: true; cocone: Cocone<I, O, M> } | { constructed: false; reason: string } => {
      if (C.dom(arrow) !== coproductObj) {
        return {
          constructed: false,
          reason: 'coconeFromArrow: arrow must originate at the advertised coproduct object',
        }
      }

      const indices = Ifin.carrier
      for (const index of indices) {
        const injection = injections(index)
        const expectedDomain = F(index)
        if (C.dom(injection) !== expectedDomain) {
          return {
            constructed: false,
            reason: `coconeFromArrow: injection ${String(index)} has domain ${String(
              C.dom(injection),
            )} instead of ${String(expectedDomain)}`,
          }
        }
        if (C.cod(injection) !== coproductObj) {
          return {
            constructed: false,
            reason: `coconeFromArrow: injection ${String(index)} targets ${String(
              C.cod(injection),
            )} instead of the coproduct object`,
          }
        }
      }

      const cache = new Map<I, M>()
      const legs: IndexedFamilies.Family<I, M> = (i) => {
        if (!cache.has(i)) {
          cache.set(i, C.compose(arrow, injections(i)))
        }
        return cache.get(i)!
      }

      const cocone: Cocone<I, O, M> = {
        coTip: C.cod(arrow),
        legs,
        diagram,
      }

      if (!coconeRespectsDiagram(C, eq, cocone)) {
        return {
          constructed: false,
          reason: 'coconeFromArrow: derived cocone does not respect the diagram',
        }
      }

      return { constructed: true, cocone }
    }

  /** Do projections agree on mediators? */
  export const agreeUnderProjections =
    <I, O, M>(
      C: Category<O, M>,
      eq: (a: M, b: M) => boolean,
      projections: IndexedFamilies.Family<I, M>,
      mediator: M,
      competitor: M,
      indices: ReadonlyArray<I>
    ) => {
      for (const i of indices) {
        const lhs = C.compose(projections(i), mediator)
        const rhs = C.compose(projections(i), competitor)
        if (!eq(lhs, rhs)) return false
      }
      return true
    }

  /** Do injections agree on mediators? */
  export const agreeUnderInjections =
    <I, O, M>(
      C: Category<O, M>,
      eq: (a: M, b: M) => boolean,
      injections: IndexedFamilies.Family<I, M>,
      mediator: M,
      competitor: M,
      indices: ReadonlyArray<I>
    ) => {
      for (const i of indices) {
        const lhs = C.compose(mediator, injections(i))
        const rhs = C.compose(competitor, injections(i))
        if (!eq(lhs, rhs)) return false
      }
      return true
    }

  /** Does mediator satisfy universal property triangles? */
  export const productMediates =
    <I, O, M>(
      C: Category<O, M>,
      eq: (a: M, b: M) => boolean,
      projections: IndexedFamilies.Family<I, M>,
      mediator: M,
      cone: Cone<I, O, M>,
      indices: ReadonlyArray<I>
    ) => {
      for (const i of indices) {
        const composed = C.compose(projections(i), mediator)
        if (!eq(composed, cone.legs(i))) return false
      }
      return true
    }

  /** Does mediator satisfy coproduct universal property triangles? */
  export const coproductMediates =
    <I, O, M>(
      C: Category<O, M>,
      eq: (a: M, b: M) => boolean,
      injections: IndexedFamilies.Family<I, M>,
      mediator: M,
      cocone: Cocone<I, O, M>,
      indices: ReadonlyArray<I>
    ) => {
      for (const i of indices) {
        const composed = C.compose(mediator, injections(i))
        if (!eq(composed, cocone.legs(i))) return false
      }
      return true
    }
}
