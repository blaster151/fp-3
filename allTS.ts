/**
 * fp-3 — a compact, practical FP toolkit for TypeScript
 * --------------------------------------------------------
 * Goals
 *  - Zero deps, tree-shakeable, pragmatic types
 *  - Great dev ergonomics via type inference
 *  - Small but extensible: start with Option, Result, pipe/flow, pattern matching, and a few typeclasses
 *
 * Usage
/**
 *  import { Option, Some, None, Result, Ok, Err, pipe, flow } from "./fp-3";
 *
 * Build
 *  tsc --target ES2019 --module ES2020 fp-3.ts
 */

import { Err, None, Ok, Some } from "./src/all/option-result"
import { RingReal, eye, matMul, matAdd, matNeg, zerosMat, idMat, hcat, vcat, permute3 } from "./src/all/semiring-linear"
import type { Mat, Semiring } from "./src/all/semiring-linear"
import type { Result as ResultT } from "./src/all/option-result"

export * from "./src/all/monad-transformers"
export * from "./src/all/category-toolkit"
export * from "./src/all/internal-algebra"
export * from "./src/all/semiring-linear"
export * from "./src/all/triangulated"
export * from "./src/algebra/ring/modules"
export * from "./src/algebra/ring/structures"
export * from "./src/algebra/ring/ideals"
export * from "./src/algebra/ring/prime-ideals"
export * from "./src/algebra/ring/multiplicative-sets"
export * from "./src/algebra/ring/localizations"
export * from "./src/algebra/ring/finitely-generated-modules"
export * from "./src/algebra/ring/tensor-products"
export * from "./src/algebra/ring/quotients"
export * from "./src/sheaves/sites"
export * from "./src/sheaves/presheaves"
export * from "./src/sheaves/sheaves"
export * from "./src/sheaves/grothendieck-topologies"
export * from "./src/sheaves/cech-cohomology"
export * from "./src/schemes/affine-morphisms"
export * from "./src/schemes/prime-spectrum"
export * from "./src/schemes/structure-sheaf"
export * from "./src/schemes/global-schemes"
export * from "./src/schemes/stacks"
export * from "./monic-category"
export type {
  Coring,
  Algebra,
  Entwining,
  FreeBimodule,
  Comodule,
  Bicomodule,
} from "./src/all/corings-entwinings"
export {
  makeDiagonalCoring,
  makeDiagonalAlgebra,
  entwiningCoassocHolds,
  entwiningMultHolds,
  entwiningUnitHolds,
  entwiningCounitHolds,
  flipAC,
  makeDiagonalEntwining,
  FreeBimoduleStd,
  tensorBalancedObj,
  tensorBalancedMapSameR,
  idMap,
  composeMap,
  comoduleCoassocHolds,
  comoduleCounitHolds,
  makeDiagonalComodule,
  bicomoduleCommutes,
  makeDiagonalBicomodule,
} from "./src/all/corings-entwinings"
export * from "./src/all/entwined-modules"
export type {
  NonEmptyArray,
  Semigroup,
  Monoid,
  Endo,
} from "./src/all/algebraic-structures"
export {
  fromArrayNE,
  headNE,
  tailNE,
  mapNE,
  SemigroupString,
  MonoidString,
  SemigroupArray,
  MonoidArray,
  concatAll,
  concatNE,
  MonoidEndo,
  applyEdits,
} from "./src/all/algebraic-structures"
export * from "./src/all/collections-partial"
export * from "./src/all/reader-task-showcase"
export * from "./src/all/descent-glue"
export * from "./src/all/automata-analytics"
export * from "./src/all/regex-automata"

type Result<E, A> = ResultT<E, A>

export * from "./src/all/option-result"
export * from "./endo-2category"
export * from "./comonad-k1"
export * from "./array-recursion"
export * from "./task"
export * from "./validation"
export * from "./reader-task-option"
export * from "./json-canonical"
export * from "./decoder"
export * from "./core"
export * from "./typeclasses"
export * from "./catTransforms"
export * from "./reader-tools"
export * from "./json-recursion"
export * from "./graph-category"
export * from "./graph-subobject-classifier"
export {
  GraphPowerObject,
  graphBinaryProductWithPair,
  graphPowerObjectDecodeNode,
  GraphSubobjectClassifier,
  GraphWitnesses,
} from "./graph-subobject-classifier"
export * from "./set-subobject-classifier"
export * from "./adjoint-functor-theorem"

// Aggregated exports for the emerging virtual equipment and relative layers.
export * from "./src/all/virtual-equipment-relative"

// Some guidelines
// Prefer the “3-then-<R>” shape for helpers:

// Choosing between two approaches
// Parallel (*Par): best when steps don’t depend on each other and can run together. (Applicative style)
// Sequential (*Seq): best when each step depends on prior results/state or you want early short-circuit.

// Choosing between two approaches
// DoRTO / DoRWST: fluent, object-accumulating pipelines (great for building derived records).
// genRTO / genRWST: read-like-a-script monadic sequencing with early return (None short-circuit, RWST state/log threading).

// ================
// Core primitives (see ./core)
// ================

export * from "./src/all/core-helpers"
export * from "./src/all/result-task-utils"
export * from "./src/all/state-task"

export * from "./src/all/optics"

export * from "./src/all/arrows"





// =======================
// Typeclasses (see ./typeclasses)
// =======================

// =======================
// Natural transformation helpers (see ./catTransforms)
// =======================

// =======================
// Reader helpers (see ./reader-tools)
// =======================

// Array recursion helpers (cata/ana/hylo/para/apo) now live in array-recursion.ts






// Recursion-scheme helpers and Json fixpoint moved to array-recursion.ts

export { eqStrict, eqSetNative, eqSetBy, eqMapNative, eqMapBy } from "./stdlib/eq"

export { ordNumber, ordString, sortBy } from "./stdlib/ord"

export type { DeepReadonly } from "./stdlib/deep-freeze"
export { deepFreeze } from "./stdlib/deep-freeze"

export * from "./stdlib/category-limits"
export type { SubobjectClassifierCategory } from "./stdlib/category"

export * from "./stdlib/expr"
export * from "./stdlib/rwst"
export { _exhaustive } from "./stdlib/exhaustive"

// =======================
// Pattern matching (small, exhaustive by tag)
// =======================
// =======================
// Example usage
// =======================
/*
// Task/TaskResult
const delayed: TaskResult<string, number> = tryCatchT(async () => {
  await new Promise(r => setTimeout(r, 100))
  return 42
}, e => String(e))

// Traversal
const doubleAll = traversalFromArray<number>().modify(n => n * 2)
const arr = [1, 2, 3]
const doubled = doubleAll(arr) // [2,4,6]
*/

// =======================
// Async Task/ReaderTask combinators now live in task.ts
// =======================

// =======================
// Validation (accumulate errors) helpers now live in validation.ts
// =======================

// Monad Transformers: MonadWriter, EitherT
// ====================================================================

// Higher-kinded endofunctor tooling moved to src/typeclasses/endo-term.ts
export * from "./src/typeclasses/endo-term"

export type Vec<R> = ReadonlyArray<R>

// row vector (1×n) × (n×m) -> (1×m)
export const vecMat =
  <R>(S: Semiring<R>) =>
  (v: Vec<R>, M: Mat<R>): Vec<R> => {
    const m = M[0]?.length ?? 0
    const n = v.length
    const out = Array.from({ length: m }, () => S.zero)
    for (let j = 0; j < m; j++) {
      let acc = S.zero
      for (let i = 0; i < n; i++) acc = S.add(acc, S.mul(v[i]!, M[i]?.[j]!))
      out[j] = acc
    }
    return out
  }

// (n×m) × (m×1) column vector -> (n×1)
export const matVec =
  <R>(S: Semiring<R>) =>
  (M: Mat<R>, v: Vec<R>): Vec<R> => {
    const n = M.length
    const m = v.length
    const out = Array.from({ length: n }, () => S.zero)
    for (let i = 0; i < n; i++) {
      let acc = S.zero
      for (let j = 0; j < m; j++) acc = S.add(acc, S.mul(M[i]?.[j]!, v[j]!))
      out[i] = acc
    }
    return out
  }

// fast exponentiation: A^k under S
export const powMat =
  <R>(S: Semiring<R>) =>
  (A: Mat<R>, k: number): Mat<R> => {
    const n = A.length, m = A[0]?.length ?? 0
    if (n !== m) throw new Error('powMat: square matrix required')
    const I = eye(S)(n)
    let base = A, exp = k, res = I
    while (exp > 0) {
      if (exp & 1) res = matMul(S)(res, base)
      base = matMul(S)(base, base)
      exp >>= 1
    }
    return res
  }

export { makeSubcategory, makeFullSubcategory, isFullSubcategory } from "./subcategory"
export { ProductCat, Pi1, Pi2, Pairing } from "./product-cat"
export { Dual, isInvolutive, oppositeCategoryWithWitness } from "./dual-cat"
export {
  Contra,
  composeContravariantContravariant,
  composeCovariantContravariant,
  constructContravariantFunctorWithWitness,
  contravariantToOppositeFunctor,
  type ContravariantCompositionOptions,
  homSetContravariantFunctorWithWitness,
  isContravariant,
  oppositeFunctorToContravariant,
} from "./contravariant"
export {
  concretizeForgetfulFunctor,
  detectConcreteObstruction,
  buildConcreteFinSetWitness,
  buildConcreteMonoidWitness,
  buildConcreteGroupWitness,
  buildConcreteRingWitness,
  buildConcretePreorderWitness,
  buildConcretePointedSetWitness,
  buildExoticSubsetConcreteWitness,
  concreteCategoryCatalogue,
  concreteMonoidDescriptor,
  buildConcreteGroupDescriptor,
  type ConcreteCategoryStructureDescriptor,
  type ConcreteCategoryWitness,
  type ConcreteCategoryOptions,
  type ConcreteObstructionReport,
} from "./concrete-category"
export {
  checkFunctorAssociativity,
  checkFunctorLeftIdentity,
  checkFunctorRightIdentity,
  compareFunctors,
  composeFunctors,
  identityFunctorWithWitness,
  makeFunctorWitness,
  constructFunctorWithWitness,
  type FunctorCheckSamples,
  type FunctorComposablePair,
  type FunctorWitness,
  type FunctorWithWitness,
  type FunctorComparisonOptions,
  type FunctorComparisonReport,
  type FunctorCompositionOptions,
  type FunctorObjectMismatch,
  type FunctorArrowMismatch,
} from "./functor"
export {
  checkIsomorphism,
  describeArrow,
  type IsomorphismCheckers,
} from "./functor-isomorphism"
export {
  isConservativeFunctor,
  type ConservativityFailure,
  type ConservativityReport,
  type ConservativityOptions,
} from "./functor-conservative"
export {
  collapseCategory,
  collapseFunctorToPoint,
  type CollapseArrow,
  type CollapseFunctorOptions,
  type CollapseObject,
} from "./functor-collapse"
export {
  preservesPullbacksImpliesMonomorphisms,
  preservesPushoutsImpliesEpimorphisms,
  type PullbackPreservationEvidence,
  type PushoutPreservationEvidence,
  type PullbackSpan,
  type PushoutCospan,
} from "./functor-preservation-implications"
export {
  PowersetHelpers,
  powersetFunctorWithWitness,
  type PowersetFunctorOptions,
  type PowersetFunctorToolkit,
  type PowersetObject,
} from "./functor-powerset"
export {
  covariantRepresentableFunctorWithWitness,
  contravariantRepresentableFunctorWithWitness,
  createRepresentableHomSetRegistry,
  yonedaEmbeddingWithWitness,
  yonedaLemmaWitness,
  type CovariantRepresentableFunctorToolkit,
  type ContravariantRepresentableFunctorToolkit,
  type RepresentableFunctorOptions,
  type RepresentableHomSetEntry,
  type RepresentableHomSetRegistry,
  type YonedaEmbeddingOptions,
  type YonedaEmbeddingToolkit,
  type YonedaElementRoundTrip,
  type YonedaLemmaOptions,
  type YonedaLemmaReport,
  type YonedaLemmaWitness,
  type YonedaTransformationRoundTrip,
} from "./functor-representable"
export {
  enhancedVectSimpleCategory,
} from "./enhanced-vect-simple-category"
export {
  finiteDimensionalDualFunctorWithWitness,
  dualSimpleCategory,
  type FiniteDimensionalDualToolkit,
} from "./functor-dual"
export {
  makeM2Object,
  makeM2Morphism,
  productM2,
  makeM2Exponential,
  exponentialM2,
  curryM2Exponential,
  m2ExponentialComparison,
  checkM2BinaryProduct,
} from "./m2-set"
export type {
  M2Object,
  M2Morphism,
  M2ProductWitness,
  M2ExponentialWitness,
  M2ExponentialComparison,
} from "./m2-set"
export type { M2InternalGroupWitness } from "./internal-group-m2"
export type { SimpleCat } from "./simple-cat"
export {
  makeFinitePullbackCalculator,
  makePullbackFromProductsAndEqualizers,
  makeFinSetPullbackCalculator,
  type PullbackCalculator,
  type PullbackData,
  type PullbackConeFactorResult,
  type PullbackCertification,
  type PullbackComparison,
  factorPullbackCone,
  productAsPullback,
  type ProductAsPullbackWitness,
  type ProductAsPullbackFactorResult,
  productFromPullbacks,
  type ProductFromPullbackWitness,
  type ProductFromPullbackInput,
  finsetProductFromPullback,
  type FinSetProductFromPullbackWitness,
  finsetCharacteristicPullback,
  type FinSetCharacteristicPullbackWitness,
  equalizerFromPullback,
  type EqualizerFromPullbackWitness,
  type EqualizerFromPullbackFactorResult,
  type EqualizerFromPullbackInput,
  pullbackPreservesIso,
  type PullbackIsoInput,
  type PullbackIsoSide,
  pullbackPreservesMono,
  type MonomorphismWitness,
  type MonomorphismCancellationResult,
  type PullbackMonoInput,
  monoByPullbackSquare,
  type MonoByPullbackSquareInput,
  type MonoByPullbackSquareResult,
  verifyPullbackLemma,
  type PullbackSquareWitness,
  type PullbackLemmaInput,
  type PullbackLemmaResult,
} from "./pullback"
export {
  finsetFactorThroughEqualizer,
  finsetEqualizerComparison,
  finsetEqualizerAsPullback,
  type FinSetEqualizerComparison,
  type FinSetEqualizerPullbackWitness,
} from "./finset-equalizers"
export {
  makeReindexingFunctor,
  type ReindexingFunctor,
} from "./reindexing"
export {
  checkReindexIdentityLaw,
  checkReindexCompositionLaw,
  sampleSlice,
  type SliceSamples,
} from "./reindexing-laws"
export {
  makeSlice,
  makeCoslice,
  makePostcomposeOnSlice,
  createSliceProductToolkit,
  makeSliceProduct,
  makeFiniteSliceProduct,
  makeSliceProductFromPullback,
  makeSliceFiniteProductFromPullback,
  type SliceObject,
  type SliceArrow,
  type SliceCategory,
  type CosliceCategory,
  type SliceCategoryOptions,
  type SliceProductToolkit,
  type SliceProductOptions,
  type FiniteSliceProductOptions,
  type SliceProductFromPullbackOptions,
  type SliceFiniteProductFromPullbackOptions,
  type SliceProductWitnessBase,
  type SliceFiniteProductWitnessBase,
  type CosliceObject,
  type CosliceArrow,
  type SlicePostcomposeFunctor,
  type SliceProductWitness,
  type SliceFiniteProductWitness,
  type SliceProductDiagonal,
  type SliceProductUnit,
  type SliceProductSwap,
} from "./slice-cat"
export {
  makeSliceTripleArrow,
  composeSliceTripleArrows,
  idSliceTripleArrow,
  sliceArrowToTriple,
  sliceTripleToArrow,
  type SliceTripleArrow,
  type SliceTripleObject,
} from "./slice-triple"
export {
  makeCosliceTripleArrow,
  composeCosliceTripleArrows,
  idCosliceTripleArrow,
  cosliceArrowToTriple,
  cosliceTripleToArrow,
  type CosliceTripleArrow,
  type CosliceTripleObject,
} from "./coslice-triple"
export {
  makeCoslicePrecomposition,
  type CoslicePrecomposition,
} from "./coslice-precompose"
export {
  makeFinitePushoutCalc,
  makeFinitePushoutCalculator,
  factorPushoutCocone,
  type PushoutCalc,
  type PushoutCalculator,
  type PushoutData,
  type PushoutCoconeFactorResult,
  type PushoutCertification,
} from "./pushout"
export { makeToyPushouts } from "./pushout-toy"
export {
  makeCosliceReindexingFunctor,
  type CosliceReindexingFunctor,
} from "./coslice-reindexing"
export {
  explainSliceMismatch,
  explainCoSliceMismatch,
  describeInverseEquation,
  checkInverseEquation,
} from "./diagnostics"
export {
  makeArrowCategory,
  makeArrowDomainFunctor,
  makeArrowCodomainFunctor,
  type ArrowSquare,
} from "./arrow-category"
export {
  makeComma,
  type Functor as CommaFunctor,
  type CommaObject,
  type CommaArrow,
} from "./comma"
export {
  isMono,
  isEpi,
} from "./kinds/mono-epi"
export { withMonoEpiCache, type MonoEpiCache } from "./kinds/mono-epi-cache"
export {
  identityIsMono,
  identityIsEpi,
  composeMonosAreMono,
  composeEpisAreEpi,
  rightFactorOfMono,
  leftFactorOfEpi,
  saturateMonoEpi,
  type MonoEpiClosure,
} from "./kinds/mono-epi-laws"
export { forkCommutes, isMonoByForks } from "./kinds/fork"
export {
  leftInverses,
  rightInverses,
  hasLeftInverse,
  hasRightInverse,
  twoSidedInverses,
  isIso as isIsoByInverseSearch,
} from "./kinds/inverses"
export { type CatTraits } from "./kinds/traits"
export { arrowGlyph, prettyArrow } from "./pretty"
export { isMonoByGlobals, type HasTerminal } from "./traits/global-elements"
export {
  checkGeneralizedElementSeparation,
  type GeneralizedElementAnalysis,
  type GeneralizedElementFailure,
  type GeneralizedElementOptions,
  type GeneralizedElementWitness,
  type HasGeneralizedElements,
} from "./traits/generalized-elements"
export {
  checkPointSeparator,
  checkWellPointedness,
  type ParallelPair,
  type PointSeparatorAnalysis,
  type PointSeparatorFailure,
  type PointSeparatorWitness,
  type WellPointednessAnalysis,
} from "./traits/well-pointedness"
export { nonEpiWitnessInSet, type NonEpiWitness } from "./kinds/epi-witness-set"
export * from "./src/all/finset-tools"
export {
  FinSetCat,
  type FinSetName,
  type FuncArr,
  type FinSetCategory,
  isInjective,
  isSurjective,
} from "./models/finset-cat"
export {
  buildLeftInverseForInjective,
  buildRightInverseForSurjective,
} from "./models/finset-inverses"
export {
  FinPosCat,
  FinPos,
  FinPosSubobjectClassifier,
  FinPosPowerObject,
  type FinPosCategory,
  type FinPosObj,
  type FinPosProduct,
  type FinPosExponential,
  type MonoMap,
} from "./models/finpos-cat"
export {
  FinGrpCat,
  FinGrp,
  createFinGrpProductMetadataStore,
  type FinGrpCategory,
  type FinGrpObj,
  type Hom as FinGrpHom,
  type FinGrpProductWitness,
  type FinGrpFiniteProductWitness,
  type FinGrpProductDiagonal,
  type FinGrpProductUnit,
  type FinGrpProductMetadataStore,
} from "./models/fingroup-cat"
export {
  makeToyNonEpicProductCategory,
  type ToyArrow,
  type ToyNonEpicProductCategory,
  type ToyObject,
} from "./models/toy-non-epi-product"
export {
  kernelElements,
  nonMonoWitness as finGrpNonMonoWitness,
  type KernelWitness as FinGrpKernelWitness,
} from "./models/fingroup-kernel"
export {
  finGrpKernelEqualizer,
  finGrpFactorThroughKernelEqualizer,
  finGrpKernelEqualizerComparison,
  type FinGrpKernelEqualizerWitness,
  type FinGrpKernelEqualizerComparison,
} from "./models/fingroup-equalizer"
export {
  inverse,
  isIso,
  isoWitness,
  areIsomorphic,
  type IsoWitness,
} from "./kinds/iso"
export {
  findMutualMonicFactorizations,
  verifyMutualMonicFactorizations,
  type MutualMonicFactorization,
  type FactorisationCheckResult,
} from "./kinds/monic-factorization"
export {
  epiMonoFactor,
  epiMonoMiddleIso,
  type Factor as EpiMonoFactor,
  type FactorIso as EpiMonoFactorIso,
} from "./kinds/epi-mono-factor"
export {
  catFromGroup,
  groupFromOneObjectGroupoid,
  type FinGroup,
} from "./kinds/group-as-category"
export {
  type Group,
  type GroupHomomorphism,
  type GroupIsomorphism,
  type GroupAutomorphism,
  type Rational,
  isGroupHomomorphism,
  isGroupIsomorphism,
  isGroupAutomorphism,
  IntegerAdditionGroup,
  RationalAdditionGroup,
  integerSamples,
  rationalSamples,
  identityAutomorphismZ,
  negationAutomorphismZ,
  scalingAutomorphismQ,
  rational,
  verifyIntegerAutomorphisms,
  verifyScalingAutomorphism,
} from "./kinds/group-automorphism"
export {
  isGroupoid,
  actionGroupoid,
} from "./kinds/groupoid"
export {
  makeTextbookToolkit,
  type TextbookToolkit,
  type TextbookToolkitOptions,
  type SliceToolkit,
  type CosliceToolkit,
  type ProductToolkit,
  type SubcategoryToolkit,
} from "./textbook-toolkit"
export {
  textbookFunctorGallery,
  type GalleryEntry,
  type GalleryPropertyReports,
} from "./textbook-functor-gallery"
export {
  buildEquivalenceWitness,
  checkEssentialInjectivityOnObjects,
  checkFaithfulFunctor,
  checkFullFunctor,
  essentialInjectiveFromFullyFaithful,
  isEssentiallySurjective,
  type EquivalencePrerequisites,
  type EssentialInjectivityReport,
  type FaithfulnessReport,
  type FullnessWitness,
  type FunctorEquivalenceWitness,
  type EssentialInjectivityFromFullFaithfulnessOptions,
  type EssentialSurjectivityReport,
} from "./functor-equivalence"
export {
  computeSkeleton,
  skeletonEquivalenceWitness,
  restrictFunctorToSkeleton,
  compareFunctorsModuloSkeleton,
  analyzeEssentialInjectivityModuloTargetSkeleton,
  projectFunctorThroughSkeleton,
  type IsoSearch,
  type SkeletonAssignment,
  type SkeletonClass,
  type SkeletonComputationResult,
  type SkeletonEquivalenceResult,
  type SkeletonFunctorComparisonOptions,
  type SkeletonFunctorComparisonResult,
  type SkeletonNaturalIsomorphism,
  type SkeletonNaturalIsomorphismFailure,
  type EssentialInjectivitySkeletonAnalysis,
  type EssentialInjectivitySkeletonClassification,
  type EssentialInjectivitySkeletonOptions,
} from "./skeleton"
export {
  findIdempotents,
  karoubiEnvelope,
  analyzeKaroubiEquivalence,
  type IdempotentSearchOptions,
  type IdempotentClassification,
  type IdempotentSearchReport,
  type KaroubiObject,
  type KaroubiMorphism,
  type KaroubiEnvelopeResult,
  type KaroubiEnvelopeOptions,
  type KaroubiSplittingWitness,
  type KaroubiEquivalenceAnalysis,
  type KaroubiEquivalenceOptions,
} from "./karoubi-envelope"
export {
  localizeCategory,
  localizationUniversalProperty,
  type CalculusOfFractionsData,
  type CalculusOfFractionsDiagnostics,
  type LocalizationArrow,
  type LocalizationResult,
  type LocalizationUniversalPropertyReport,
} from "./localization"

export {
  buildFactorizationSystem,
  buildFinGrpImageKernelFactorization,
  buildFinSetRegularFactorization,
  buildSetSurjectionInjectionFactorization,
  attachFactorizationSystemProperties,
  analyzeFactorizationSystemFunctor,
  type Factorization,
  type FactorizationClass,
  type FactorizationClassFunctorReport,
  type FactorizationClassFunctorSettings,
  type FactorizationClosureReport,
  type FactorizationSystemInput,
  type FactorizationSystemReport,
  type FactorizationSystemSamples,
  type FactorizationSystemWitness,
  type FactorizationSystemFunctorAnalysis,
  type FactorizationSystemFunctorOptions,
  type FactorizationSystemFunctorResult,
  type OrthogonalityResult,
  type OrthogonalitySquare,
  type OrthogonalityWitness,
} from "./factorization-system"
export {
  makeFreeGroup,
  reduceWord,
  multiplyWords,
  inverseWord,
  wordEquals,
  wordFromGenerator,
  showWord,
  emptyWord,
  isIdentityWord,
  type FreeGroup,
  type FreeGroupLetter,
  type FreeGroupWord,
} from "./free-group"
export {
  type CWEdge,
  type EdgePath,
  type PointedCWComplex,
  type PointedCWMap,
  type PointedCWCategory,
  validatePointedCWComplex,
  validatePointedCWMap,
  applyEdgePath,
  identityPointedCWMap,
  composePointedCWMaps,
  pointedCWCategory,
  pointedCWSamples,
  circleCW,
  diskCW,
  annulusCW,
  circleIntoAnnulusInclusion,
  annulusRetractionToCircle,
  circleIntoDiskInclusion,
  diskRadialRetractionToCircle,
} from "./pointed-cw-complex"
export {
  computeFundamentalGroup,
  buildFundamentalGroupFunctor,
  makeGroupCategory,
  retractionObstructionFromPi1,
  brouwerFixedPointFromNoRetraction,
  fundamentalGroupDemoCategory,
  type FundamentalGroupData,
  type FundamentalGroupGenerator,
  type FundamentalGroupFunctorResult,
  type GroupCategory,
  type GroupObject,
  type GroupHomArrow,
  type RetractionObstructionResult,
  type BrouwerFixedPointResult,
} from "./fundamental-group"
export {
  LeftInverseImpliesMono,
  RightInverseImpliesEpi,
  IsoIsMonoAndEpi,
  MonoWithRightInverseIsIso,
  EpiWithLeftInverseIsIso,
  type ArrowOracle,
} from "./oracles/inverses-oracles"
export {
  detectBalancedPromotions,
  type BalancedPromotion,
} from "./oracles/balanced"
export {
  MonicFactorizationYieldsIso,
  type CategoryOracle,
} from "./oracles/monic-factorization"
export {
  checkSliceCategoryLaws,
  type SliceCategoryLawReport,
} from "./slice-laws"
export {
  Rewriter,
  defaultOperationRules,
  type OperationRule,
  type OperationContext,
  type Suggestion as OperationSuggestion,
  type Rewrite as OperationRewrite,
  type NormalizeCompositeRewrite,
  type UpgradeToIsoRewrite,
  type ReplaceWithIdentityRewrite,
  type MergeSubobjectsRewrite,
  type MergeObjectsRewrite,
  type FactorThroughEpiMonoRewrite,
} from "./operations/rewriter"
export { UnionFind } from "./operations/union-find"

// Namespaces are declared above and exported automatically

// Examples have been moved to examples.ts
