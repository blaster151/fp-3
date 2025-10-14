import type { RunnableRegistry } from "./types";
import { optionResultBasics } from "./001-option-result-basics";
import { resultDoNotation } from "./002-result-do-notation";
import { effectCompositionPatterns } from "./003-effect-composition";
import { readerTaskOptionAndRwst } from "./004-reader-task-option";
import { partitionAndSequenceContainers } from "./005-partition-and-sequence";
import { partialFunctionsAcrossCollections } from "./006-partial-functions-with-filtermap-collect-across-data-structures";
import { jsonStreamingFoldsAndHylo } from "./007-json-streaming-folds-and-fused-hylo-pipelines";
import { readerApplicativeEvaluators } from "./008-reader-applicative-evaluators-for-expression-asts";
import { stackMachineCompilation } from "./009-stack-machine-compilation-of-expressions";
import { expressionAlgebras } from "./010-expression-algebras-for-size-depth-and-products";
import { safeAstEvolution } from "./011-safe-ast-evolution-with-negation-and-n-ary-operators";
import { symbolicAlgebraSubstitutionAndDifferentiation } from "./012-symbolic-algebra-substitution-and-differentiation";
import { canonicalizationAndExtendedEjsonPolicies } from "./013-canonicalization-and-extended-ejson-policies";
import { canonicalEqualityHashingAndStructuralUtilities } from "./014-canonical-equality-hashing-and-structural-utilities";
import { canonicalContainersMultimapsAndGroupingAnalytics } from "./015-canonical-containers-multimaps-and-grouping-analytics";
import { streamingAnalyticsOverCanonicalGroups } from "./016-streaming-analytics-over-canonical-groups";
import { jsonZipperNavigationAndPathEditing } from "./017-json-zipper-navigation-and-path-editing";
import { kleisliArrowPipelinesForReaderTaskAndReaderTaskResult } from "./018-kleisli-arrow-pipelines-for-reader-task-and-readertaskresult";
import { arrowIrCoreAndArrowApplyExtensions } from "./019-arrow-ir-core-and-arrowapply-extensions";
import { arrowIrNormalizationAndSemanticsPreservation } from "./020-arrow-ir-normalization-and-semantics-preservation";
import { hktExpressionBuildersAndRefactorSafety } from "./021-hkt-based-expression-builders-and-refactoring-safety";
import { jsonfEnhancementsAndExtendedVariants } from "./022-jsonf-enhancements-and-extended-variants";
import { policyThreadingWithImprovedProductAlgebras } from "./023-policy-threading-with-improved-product-algebras";
import { sumProductEndofunctorDrills } from "./024-sum-product-endofunctor-drills";
import { naturalTransformationsAndKleisliWriterArrayStructures } from "./025-natural-transformations-and-kleisli-writer-array-structures";
import { advancedFunctorTraversableAndFreeAlgebraSuites } from "./026-advanced-functor-traversable-and-free-algebra-suites";
import { monoidalFunctorsAndApplicativeInspiredZipping } from "./027-monoidal-functors-and-applicative-inspired-zipping";
import { monoidalFunctorLawHarness } from "./028-monoidal-functor-law-harness";
import { comonadsCofreeConstructionsAndStoreLenses } from "./029-comonads-cofree-constructions-and-store-lenses";
import { storeLensTimeSeriesSmoothingWalkthrough } from "./030-store-lens-time-series-smoothing-walkthrough";
import { mixedDistributiveLawsForMonadComonadPairs } from "./031-mixed-distributive-laws-for-monad-comonad-pairs";
import { twoFunctorAndOplaxStrengthDemonstrations } from "./032-2-functor-and-oplax-strength-demonstrations";
import { stage033RelativeMonadDiagnostics } from "./033-relative-monad-diagnostics";
import { stage034RecordGluingAndDescentWorkflows } from "./034-record-gluing-and-descent-workflows";
import { stage035SemicartesianInitialUnitOracles } from "./035-semicartesian-initial-unit-oracles";
import { stage036CRingSemicartesianWitnesses } from "./036-cring-semicartesian-witnesses";
import { stage037SemicartesianInfiniteTensorProducts } from "./037-semicartesian-infinite-tensor-products";
import { stage038CAlgebraWitnessAndSpectralDiagnostics } from "./038-c-algebra-witness-and-spectral-diagnostics";
import { stage039AlgebraOracleRegistryAndRelativeMonadReporting } from "./039-algebra-oracle-registry-and-relative-monad-reporting";
import { stage040ComoduleEntwiningAndEntwinedModuleMachinery } from "./040-comodule-entwining-and-entwined-module-machinery";
import { stage041CategoryOfEntwinedModulesAndAlgebraicUtilities } from "./041-category-of-entwined-modules-and-algebraic-utilities";
import { stage042TriangulatedCategoriesAndHomologicalAlgebra } from "./042-triangulated-categories-and-homological-algebra";
import { stage043RationalArithmeticAndLinearAlgebraOver } from "./043-rational-arithmetic-and-linear-algebra-over";
import { stage044VectorSpaceAndDiagrammaticCategoryUtilities } from "./044-vector-space-and-diagrammatic-category-utilities";
import { stage045DiagramCommutativityVerificationDrills } from "./045-diagram-commutativity-verification-drills";
import { stage046ContravariantFunctorWitnessesOverThinAndPoset } from "./046-contravariant-functor-witnesses-over-thin-and-poset";
import { stage047VirtualEquipmentCompanionsConjointsAndAdjunctions } from "./047-virtual-equipment-companions-conjoints-and-adjunctions";
import { stage048SemiringRigRegistryAndEntireCheckHarness } from "./048-semiring-rig-registry-and-entire-check-harness";
import { stage049SemiringDistributionMonadConstructors } from "./049-semiring-distribution-monad-constructors";
import { stage050LogSpaceMarkovKernelCompositionChains } from "./050-log-space-markov-kernel-composition-chains";
import { stage051BooleanSemirringNFAReachability } from "./051-boolean-semirring-nfa-reachability";
import { stage052HiddenMarkovModelInferenceAlgorithms } from "./052-hidden-markov-model-inference-algorithms";
import { stage053ProbabilityMonadsAndKleisliScaffolding } from "./053-probability-monads-and-kleisli-scaffolding";
import { stage054SemiringDistributiveLawDiagnostics } from "./054-semiring-distributive-law-diagnostics";
import { stage055TextbookCategoricalToolkit } from "./055-textbook-categorical-toolkit";
import { stage056SliceAndCosliceProjectWalkthrough } from "./056-slice-and-coslice-project-walkthrough";
import { stage057ConcreteCategoryBackendsAndDynamicSystems } from "./057-concrete-category-backends-and-dynamic-systems";
import { stage058CategoryOperationsRewriterSuggestions } from "./058-category-operations-rewriter-suggestions";
import { stage059MarkovFoundationalLawHarness } from "./059-markov-foundational-law-harness";
import { stage060MarkovDeterminismAndThunkabilityDiagnostics } from "./060-markov-determinism-and-thunkability-diagnostics";
import { stage061MarkovComonoidAndSetMultDeterministicBridge } from "./061-markov-comonoid-and-setmult-deterministic-bridge";
import { stage062MarkovConditionalIndependenceAndPermutationInvariants } from "./062-markov-conditional-independence-and-permutation-invariants";
import { stage063MarkovMonoidalStrengthAndTensorCoherence } from "./063-markov-monoidal-strength-and-tensor-coherence";
import { stage064GradedMarkovKernelsAndCostAccounting } from "./064-graded-markov-kernels-and-cost-accounting";
import { stage065AlmostSureEqualityAndSamplingCancellation } from "./065-almost-sure-equality-and-sampling-cancellation";
import { stage066DominanceGarblingAndBSSEquivalenceChecks } from "./066-dominance-garbling-and-bss-equivalence-checks";
import { stage067InfiniteProductAndTailLawScaffolding } from "./067-infinite-product-and-tail-law-scaffolding";
import { stage068BorelStochasticZeroOneAdapters } from "./068-borel-stochastic-zero-one-adapters";
import { stage069MarkovCategoryZeroOneTheorems } from "./069-markov-category-zero-one-theorems";
import { stage070SynthesizedZeroOneOracleFactory } from "./070-synthesized-zero-one-oracle-factory";
import { stage071TopVietorisZeroOneScaffolding } from "./071-top-vietoris-zero-one-scaffolding";
import { stage072PushoutCalculatorsAndUniversalMediators } from "./072-pushout-calculators-and-universal-mediators";
import { stage073MonoidCategoriesAndHoms } from "./073-monoid-categories-and-homs";
import { stage074FreeCategoryOnADirectedGraph } from "./074-free-category-on-a-directed-graph";
import { stage075FiniteTopologyBasics } from "./075-finite-topology-basics";
import { stage076TopProductUniversalProperty } from "./076-top-product-universal-property";

export const registry: RunnableRegistry = [
  optionResultBasics,
  resultDoNotation,
  effectCompositionPatterns,
  readerTaskOptionAndRwst,
  partitionAndSequenceContainers,
  partialFunctionsAcrossCollections,
  jsonStreamingFoldsAndHylo,
  readerApplicativeEvaluators,
  stackMachineCompilation,
  expressionAlgebras,
  safeAstEvolution,
  symbolicAlgebraSubstitutionAndDifferentiation,
  canonicalizationAndExtendedEjsonPolicies,
  canonicalEqualityHashingAndStructuralUtilities,
  canonicalContainersMultimapsAndGroupingAnalytics,
  streamingAnalyticsOverCanonicalGroups,
  jsonZipperNavigationAndPathEditing,
  kleisliArrowPipelinesForReaderTaskAndReaderTaskResult,
  arrowIrCoreAndArrowApplyExtensions,
  arrowIrNormalizationAndSemanticsPreservation,
  hktExpressionBuildersAndRefactorSafety,
  jsonfEnhancementsAndExtendedVariants,
  policyThreadingWithImprovedProductAlgebras,
  sumProductEndofunctorDrills,
  naturalTransformationsAndKleisliWriterArrayStructures,
  advancedFunctorTraversableAndFreeAlgebraSuites,
  monoidalFunctorsAndApplicativeInspiredZipping,
  monoidalFunctorLawHarness,
  comonadsCofreeConstructionsAndStoreLenses,
  storeLensTimeSeriesSmoothingWalkthrough,
  mixedDistributiveLawsForMonadComonadPairs,
  twoFunctorAndOplaxStrengthDemonstrations,
  stage033RelativeMonadDiagnostics,
  stage034RecordGluingAndDescentWorkflows,
  stage035SemicartesianInitialUnitOracles,
  stage036CRingSemicartesianWitnesses,
  stage037SemicartesianInfiniteTensorProducts,
  stage038CAlgebraWitnessAndSpectralDiagnostics,
  stage039AlgebraOracleRegistryAndRelativeMonadReporting,
  stage040ComoduleEntwiningAndEntwinedModuleMachinery,
  stage041CategoryOfEntwinedModulesAndAlgebraicUtilities,
  stage042TriangulatedCategoriesAndHomologicalAlgebra,
  stage043RationalArithmeticAndLinearAlgebraOver,
  stage044VectorSpaceAndDiagrammaticCategoryUtilities,
  stage045DiagramCommutativityVerificationDrills,
  stage046ContravariantFunctorWitnessesOverThinAndPoset,
  stage047VirtualEquipmentCompanionsConjointsAndAdjunctions,
  stage048SemiringRigRegistryAndEntireCheckHarness,
  stage049SemiringDistributionMonadConstructors,
  stage050LogSpaceMarkovKernelCompositionChains,
  stage051BooleanSemirringNFAReachability,
  stage052HiddenMarkovModelInferenceAlgorithms,
  stage053ProbabilityMonadsAndKleisliScaffolding,
  stage054SemiringDistributiveLawDiagnostics,
  stage055TextbookCategoricalToolkit,
  stage056SliceAndCosliceProjectWalkthrough,
  stage057ConcreteCategoryBackendsAndDynamicSystems,
  stage058CategoryOperationsRewriterSuggestions,
  stage059MarkovFoundationalLawHarness,
  stage060MarkovDeterminismAndThunkabilityDiagnostics,
  stage061MarkovComonoidAndSetMultDeterministicBridge,
  stage062MarkovConditionalIndependenceAndPermutationInvariants,
  stage063MarkovMonoidalStrengthAndTensorCoherence,
  stage064GradedMarkovKernelsAndCostAccounting,
  stage065AlmostSureEqualityAndSamplingCancellation,
  stage066DominanceGarblingAndBSSEquivalenceChecks,
  stage067InfiniteProductAndTailLawScaffolding,
  stage068BorelStochasticZeroOneAdapters,
  stage069MarkovCategoryZeroOneTheorems,
  stage070SynthesizedZeroOneOracleFactory,
  stage071TopVietorisZeroOneScaffolding,
  stage072PushoutCalculatorsAndUniversalMediators,
  stage073MonoidCategoriesAndHoms,
  stage074FreeCategoryOnADirectedGraph,
  stage075FiniteTopologyBasics,
  stage076TopProductUniversalProperty,
];
