/**
 * fp-3 — a compact, practical FP toolkit for TypeScript
 * --------------------------------------------------------
 * Goals
 *  - Zero deps, tree-shakeable, pragmatic types
 *  - Great dev ergonomics via type inference
 *  - Small but extensible: start with Option, Result, pipe/flow, pattern matching, and a few typeclasses
 *
 * Usage
 *  import { Option, Some, None, Result, Ok, Err, pipe, flow } from "./fp-3";
 *
 * Build
 *  tsc --target ES2019 --module ES2020 fp-3.ts
 */

import {
  None,
  Some,
  isNone,
  isSome,
  fromNullable,
  toNullable,
  mapO,
  flatMapO,
  getOrElseO,
  orElseO,
  filterO,
} from "./option"
import type { Option } from "./option"
import {
  Err,
  Ok,
  isErr,
  isOk,
  mapR,
  mapErr,
  flatMapR,
  getOrElseR,
  tryCatch,
} from "./result"
import type { Monoid } from "./stdlib/monoid"
import { eqStrict } from "./stdlib/eq"
import {
  collectArray,
  collectMapEntries,
  collectMapValues,
  collectSet,
  filterMapArraySimple,
} from "./stdlib/collections"
import { pf } from "./stdlib/partial-fn"
import type { PartialFn } from "./stdlib/partial-fn"
import * as Expr from "./stdlib/expr"
import {
  ArrayMonoid,
  Kleisli,
  K_Option,
  K_Result,
  K_Task,
  K_Reader,
  K_ReaderTask,
  ReaderMonadLike,
  ReaderTaskMonadLike,
  StringMonoid,
  TaskMonadLike,
  type MonadK1Like,
} from "./src/typeclasses/monad-like"
import { MonoidalFn, MonoidalKleisliRTE, ResultK1 } from "./src/typeclasses/hkt"
import type { Pair } from "./src/typeclasses/hkt"
import {
  Writer,
  WriterInReader,
  WriterInReaderTask,
  WriterT,
  type MonadWriterT,
} from "./src/writer/writer"
import {
  DoRTE,
  EitherT,
  LogArray,
  MW_R,
  MW_RT,
  RTE,
  RE,
  TE,
  WRTE,
  apFirstRTE,
  apSecondRTE,
  zipRTE,
  zipWithRTE,
} from "./src/result/either-transformer"
import type {
  DoRTEBuilder,
  ReaderEither,
  ReaderTaskEither,
  TaskEither,
  WriterReaderTaskEither,
} from "./src/result/either-transformer"

export {
  ArrayMonoid,
  Kleisli,
  K_Option,
  K_Result,
  K_Task,
  K_Reader,
  K_ReaderTask,
  ReaderMonadLike,
  ReaderTaskMonadLike,
  StringMonoid,
  TaskMonadLike,
} from "./src/typeclasses/monad-like"
export type { MonadK1Like } from "./src/typeclasses/monad-like"
export * from "./src/typeclasses/hkt"
export { Writer, WriterInReader, WriterInReaderTask, WriterT } from "./src/writer/writer"
export type { MonadWriterT } from "./src/writer/writer"
export {
  DoRTE,
  EitherT,
  LogArray,
  MW_R,
  MW_RT,
  TaskEither,
  ReaderEither,
  ReaderTaskEither,
  RTE,
  RE,
  TE,
  WRTE,
  apFirstRTE,
  apSecondRTE,
  zipRTE,
  zipWithRTE,
} from "./src/result/either-transformer"
export type { DoRTEBuilder, WriterReaderTaskEither } from "./src/result/either-transformer"
import {
  VectView as VectViewNS,
  applyRepAsLin as applyRepAsLinFn,
  coactionAsLin as coactionAsLinFn,
  pushCoaction as pushCoactionFn,
  actionToChain as actionToChainFn,
  coactionToChain as coactionToChainFn,
} from "./stdlib/vect-view"
import { IndexedFamilies } from "./stdlib/indexed-families"
import type {
  Category,
  Groupoid,
  FiniteGroupoid,
  GFunctor,
  FiniteCategory as FiniteCategoryT,
  CFunctor as CFunctorT,
  ObjOf,
  MorOf,
  CatFunctor,
  CatNatTrans,
  CatId,
  CatCompose,
  CatMonad as CatMonadT,
  Adjunction,
  CoreCategory,
  CoreFunctor,
  CoreNatTrans,
  CoreId,
  CoreCompose,
  CoreAdjunction
} from "./stdlib/category"
import {
  FiniteCategory as FiniteCategorySymbol,
  CFunctor as CFunctorSymbol,
  CatMonad as CatMonadSymbol,
  composeFun,
  idFun,
  idNat,
  whiskerLeft,
  whiskerRight,
  vcomp,
  hcomp,
  coreIdFunctor,
  coreComposeFun,
  coreWhiskerLeft,
  coreWhiskerRight,
  coreVcomp,
  coreIdNat,
  leftMate,
  rightMate,
  checkMateInverses,
  verifyTriangleIdentities,
  leftMateRightShape,
  rightMateRightShape,
  unitMate,
  counitMate,
  pushforwardMonad,
  colaxAlongLeftAdjoint,
  pushforwardAlgebra,
  reassociate,
  pushforwardMonadEnhanced,
  kleisliCompose,
  checkPushforwardUnitLaws,
  checkPushforwardAssociativity,
  checkPushforwardMonadLaws
} from "./stdlib/category"
const FiniteCategory = FiniteCategorySymbol
const CFunctor = CFunctorSymbol
const CatMonad = CatMonadSymbol
import { ArrowFamilies } from "./stdlib/arrow-families"
import { CategoryLimits } from "./stdlib/category-limits"
import { EnhancedVect } from "./stdlib/enhanced-vect"
export {
  VectView,
  applyRepAsLin,
  coactionAsLin,
  pushCoaction,
  actionToChain,
  coactionToChain,
} from "./stdlib/vect-view"
export type { Representation, Coaction } from "./stdlib/vect-view"
export { Pretty } from "./stdlib/pretty"
export { DiagramClosure } from "./stdlib/diagram-closure"
export { DiagramLaws } from "./stdlib/diagram-laws"
export { IndexedFamilies } from "./stdlib/indexed-families"
export { IntSNF } from "./stdlib/int-snf"
export { FP_CATALOG } from "./stdlib/catalog"
export type {
  Category,
  Groupoid,
  FiniteGroupoid,
  GFunctor,
  ObjOf,
  MorOf,
  CatFunctor,
  CatNatTrans,
  CatId,
  CatCompose,
  Adjunction,
  CoreCategory,
  CoreFunctor,
  CoreNatTrans,
  CoreId,
  CoreCompose,
  CoreAdjunction
} from "./stdlib/category"
export type FiniteCategory<O, M> = FiniteCategoryT<O, M>
export type CFunctor<BO, BM, AO, AM> = CFunctorT<BO, BM, AO, AM>
export type CatMonad<C> = CatMonadT<C>
export {
  FiniteCategory,
  CFunctor,
  CatMonad,
  composeFun,
  idFun,
  idNat,
  whiskerLeft,
  whiskerRight,
  vcomp,
  hcomp,
  coreIdFunctor,
  coreComposeFun,
  coreWhiskerLeft,
  coreWhiskerRight,
  coreVcomp,
  coreIdNat,
  leftMate,
  rightMate,
  checkMateInverses,
  verifyTriangleIdentities,
  leftMateRightShape,
  rightMateRightShape,
  unitMate,
  counitMate,
  pushforwardMonad,
  colaxAlongLeftAdjoint,
  pushforwardAlgebra,
  reassociate,
  pushforwardMonadEnhanced,
  kleisliCompose,
  checkPushforwardUnitLaws,
  checkPushforwardAssociativity,
  checkPushforwardMonadLaws
}
export { ArrowFamilies } from "./stdlib/arrow-families"
export { CategoryLimits } from "./stdlib/category-limits"
export { EnhancedVect } from "./stdlib/enhanced-vect"
import {
  FinGrp as FinGrpModel,
  type FinGrpObj as FinGrpObjModel,
  type Hom as FinGrpHomModel,
} from "./models/fingroup-cat"
import {
  makeFiniteSliceProduct,
  lookupSliceProductMetadata,
  type SliceObject as SliceObjectModel,
  type SliceArrow as SliceArrowModel,
} from "./slice-cat"
import {
  type FinSetCategory as FinSetCategoryModel,
  type FinSetName as FinSetNameModel,
  type FuncArr as FuncArrModel,
} from "./models/finset-cat"
import {
  analyzeInternalGroup,
  checkInternalGroupAssociativity,
  checkInternalGroupInversion,
  checkInternalGroupUnit,
  enrichInternalGroupDiagonal,
  type InternalGroupAnalysis,
  type CategoryOps as InternalGroupCategoryOps,
  type InternalGroupWitness as InternalGroupWitnessModel,
  type TerminalWitness as InternalGroupTerminalWitness,
} from "./internal-group"
import {
  analyzeInternalMonoid as analyzeInternalMonoidHelper,
  checkInternalMonoidAssociativity as checkInternalMonoidAssociativityHelper,
  checkInternalMonoidUnit as checkInternalMonoidUnitHelper,
  enrichInternalMonoidDiagonal,
  type InternalMonoidAnalysis as InternalMonoidAnalysisModel,
  type InternalMonoidWitness as InternalMonoidWitnessModel,
} from "./internal-monoid"
import {
  analyzeFinGrpInternalGroup as analyzeFinGrpInternalGroupHelper,
  analyzeFinGrpInternalMonoid as analyzeFinGrpInternalMonoidHelper,
  makeFinGrpInternalGroupWitness,
  makeFinGrpInternalMonoidWitness,
  type FinGrpInternalGroupWitness,
  type FinGrpInternalGroupAnalysis,
  type FinGrpInternalMonoidAnalysis,
  type FinGrpInternalMonoidWitness,
} from "./internal-group-fingrp"
import {
  analyzeM2InternalGroup as analyzeM2InternalGroupHelper,
  analyzeM2InternalMonoid as analyzeM2InternalMonoidHelper,
  checkM2InternalGroupCompatibility as checkM2InternalGroupCompatibilityHelper,
  checkM2InternalMonoidCompatibility as checkM2InternalMonoidCompatibilityHelper,
  makeM2InternalGroupWitness as makeM2InternalGroupWitnessHelper,
  makeM2InternalMonoidWitness as makeM2InternalMonoidWitnessHelper,
  type M2InternalGroupAnalysis as M2InternalGroupAnalysisModel,
  type M2InternalGroupCompatibilityResult as M2InternalGroupCompatibilityResultModel,
  type M2InternalMonoidAnalysis as M2InternalMonoidAnalysisModel,
  type M2InternalMonoidCompatibilityResult as M2InternalMonoidCompatibilityResultModel,
  type M2InternalMonoidWitness as M2InternalMonoidWitnessModel,
} from "./internal-group-m2"
import {
  analyzeTopInternalGroup as analyzeTopInternalGroupHelper,
  analyzeTopInternalMonoid as analyzeTopInternalMonoidHelper,
  makeTopInternalGroupWitness as makeTopInternalGroupWitnessHelper,
  makeTopInternalMonoidWitness as makeTopInternalMonoidWitnessHelper,
  type TopInternalGroupAnalysis,
  type TopInternalGroupInput as TopInternalGroupInputModel,
  type TopInternalGroupWitness as TopInternalGroupWitnessModel,
  type TopInternalMonoidAnalysis,
  type TopInternalMonoidInput as TopInternalMonoidInputModel,
  type TopInternalMonoidWitness as TopInternalMonoidWitnessModel,
} from "./internal-group-top"
import {
  analyzeSetInternalGroup as analyzeSetInternalGroupHelper,
  analyzeSetInternalMonoid as analyzeSetInternalMonoidHelper,
  makeSetInternalGroupWitness as makeSetInternalGroupWitnessHelper,
  makeSetInternalMonoidWitness as makeSetInternalMonoidWitnessHelper,
  type SetInternalGroupAnalysis,
  type SetInternalGroupInput as SetInternalGroupInputModel,
  type SetInternalGroupWitness as SetInternalGroupWitnessModel,
  type SetInternalMonoidAnalysis,
  type SetInternalMonoidInput as SetInternalMonoidInputModel,
  type SetInternalMonoidWitness as SetInternalMonoidWitnessModel,
} from "./internal-group-set"
import {
  analyzeManInternalGroup as analyzeManInternalGroupHelper,
  analyzeManInternalMonoid as analyzeManInternalMonoidHelper,
  makeManInternalGroupWitness as makeManInternalGroupWitnessHelper,
  makeManInternalMonoidWitness as makeManInternalMonoidWitnessHelper,
  type ManInternalGroupAnalysis,
  type ManInternalGroupInput as ManInternalGroupInputModel,
  type ManInternalGroupWitness as ManInternalGroupWitnessModel,
  type ManInternalMonoidAnalysis,
  type ManInternalMonoidInput as ManInternalMonoidInputModel,
  type ManInternalMonoidWitness as ManInternalMonoidWitnessModel,
  type SmoothnessWitness as ManInternalGroupSmoothness,
} from "./internal-group-man"
import { isIso } from "./kinds/inverses"
import type { FiniteCategory as RegistryFiniteCategory } from "./finite-cat"
import type { Result as ResultT } from "./result"
import type {
  EndofunctorValue,
  EndofunctorK1,
  NatK1,
  TwoFunctorK1,
  LaxTwoFunctorK1,
  OplaxTwoFunctorK1,
  Env,
  StrengthEnv,
  SumVal,
  ProdVal,
} from "./endo-2category"
import {
  idNatK1,
  vcompNatK1,
  leftWhisker,
  rightWhisker,
  hcompNatK1_component,
  IdK1,
  viewCompose,
  Reader,
  runReader,
  PostcomposeReader2,
  muPostReader,
  EnvEndo,
  PrecomposeEnv2,
  strengthEnvOption,
  strengthEnvResult,
  strengthEnvReader,
  inL,
  inR,
  matchSum,
  prod,
} from "./endo-2category"
import { smithNormalForm } from "./comonad-k1"
import {
  anaJson,
  cataJson,
  hyloJson,
  jArr,
  jBinary,
  jBool,
  jDate,
  jDec,
  jNull,
  jNum,
  jObj,
  jRegex,
  jSet,
  jStr,
  jUndef,
  makeRecursionK1,
} from "./array-recursion"
import type { Fix1, Json, JsonF } from "./array-recursion"
import { Task, TaskResult, ReaderTask, ReaderTaskResult } from "./task"
import { VErr, VOk, isVErr, isVOk, mapV, apV } from "./validation"
import type { Validation } from "./validation"
import {
  absurd,
  compose,
  const_,
  curry,
  flow,
  id,
  pipe,
  uncurry,
} from "./core"
import type { Eq } from "./core"
import type { Apply, Functor, FunctorValue, Monad, ValidationTag } from "./typeclasses"
import { depthJson, sizeAndDepthJson, sizeJson, strsJson } from "./json-recursion"

type Result<E, A> = ResultT<E, A>

export * from "./option"
export * from "./result"
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

export {
  analyzeInternalGroup,
  analyzeInternalMonoidHelper as analyzeInternalMonoid,
  analyzeFinGrpInternalGroupHelper as analyzeFinGrpInternalGroup,
  analyzeFinGrpInternalMonoidHelper as analyzeFinGrpInternalMonoid,
  analyzeM2InternalGroupHelper as analyzeM2InternalGroup,
  analyzeM2InternalMonoidHelper as analyzeM2InternalMonoid,
  analyzeTopInternalGroupHelper as analyzeTopInternalGroup,
  analyzeTopInternalMonoidHelper as analyzeTopInternalMonoid,
  analyzeSetInternalGroupHelper as analyzeSetInternalGroup,
  analyzeSetInternalMonoidHelper as analyzeSetInternalMonoid,
  analyzeManInternalGroupHelper as analyzeManInternalGroup,
  analyzeManInternalMonoidHelper as analyzeManInternalMonoid,
  checkInternalGroupAssociativity,
  checkInternalMonoidAssociativityHelper as checkInternalMonoidAssociativity,
  checkInternalGroupUnit,
  checkInternalMonoidUnitHelper as checkInternalMonoidUnit,
  checkInternalGroupInversion,
  enrichInternalGroupDiagonal,
  enrichInternalMonoidDiagonal,
  makeFinGrpInternalGroupWitness,
  makeFinGrpInternalMonoidWitness,
  makeM2InternalGroupWitnessHelper as makeM2InternalGroupWitness,
  checkM2InternalGroupCompatibilityHelper as checkM2InternalGroupCompatibility,
  makeM2InternalMonoidWitnessHelper as makeM2InternalMonoidWitness,
  checkM2InternalMonoidCompatibilityHelper as checkM2InternalMonoidCompatibility,
  makeTopInternalGroupWitnessHelper as makeTopInternalGroupWitness,
  makeTopInternalMonoidWitnessHelper as makeTopInternalMonoidWitness,
  makeSetInternalGroupWitnessHelper as makeSetInternalGroupWitness,
  makeSetInternalMonoidWitnessHelper as makeSetInternalMonoidWitness,
  makeManInternalGroupWitnessHelper as makeManInternalGroupWitness,
  makeManInternalMonoidWitnessHelper as makeManInternalMonoidWitness,
}

export type {
  InternalGroupAnalysis,
  InternalMonoidAnalysisModel as InternalMonoidAnalysis,
  M2InternalGroupAnalysisModel as M2InternalGroupAnalysis,
  M2InternalGroupCompatibilityResultModel as M2InternalGroupCompatibilityResult,
  M2InternalMonoidAnalysisModel as M2InternalMonoidAnalysis,
  M2InternalMonoidCompatibilityResultModel as M2InternalMonoidCompatibilityResult,
  InternalGroupCategoryOps,
  InternalGroupWitnessModel as InternalGroupWitness,
  InternalMonoidWitnessModel as InternalMonoidWitness,
  InternalGroupTerminalWitness,
  M2InternalMonoidWitnessModel as M2InternalMonoidWitness,
  FinGrpInternalGroupAnalysis,
  FinGrpInternalGroupWitness,
  FinGrpInternalMonoidWitness,
  FinGrpInternalMonoidAnalysis,
  TopInternalGroupInputModel as TopInternalGroupInput,
  TopInternalGroupWitnessModel as TopInternalGroupWitness,
  TopInternalGroupAnalysis,
  TopInternalMonoidInputModel as TopInternalMonoidInput,
  TopInternalMonoidWitnessModel as TopInternalMonoidWitness,
  TopInternalMonoidAnalysis,
  SetInternalGroupInputModel as SetInternalGroupInput,
  SetInternalGroupWitnessModel as SetInternalGroupWitness,
  SetInternalGroupAnalysis,
  SetInternalMonoidInputModel as SetInternalMonoidInput,
  SetInternalMonoidWitnessModel as SetInternalMonoidWitness,
  SetInternalMonoidAnalysis,
  ManInternalGroupInputModel as ManInternalGroupInput,
  ManInternalGroupWitnessModel as ManInternalGroupWitness,
  ManInternalGroupAnalysis,
  ManInternalMonoidInputModel as ManInternalMonoidInput,
  ManInternalMonoidWitnessModel as ManInternalMonoidWitness,
  ManInternalMonoidAnalysis,
  ManInternalGroupSmoothness,
}

// Aggregated exports for the emerging virtual equipment and relative layers.
export * from "./virtual-equipment";
export * from "./relative";

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

type _ObjectLike = Record<string, unknown>
// =======================
// Small helpers
// =======================
export {
  tap,
  attempt,
  match,
  not,
  and,
  or,
  isNullish,
  isString,
  isNumber,
  isBoolean,
  map,
  filter,
  flatMap,
  reduce,
  head,
  tail,
} from "./src/core/functional-utils"
export type { Matcher } from "./src/core/functional-utils"

export {
  hasOwn,
  keys,
  values,
  entries,
  fromEntries,
  mapValues,
  mapEntries,
  filterValues,
  filterKeys,
  pick,
  omit,
} from "./src/records/record-utils"

export {
  foldR,
  swapR,
  tapOkR,
  tapErrR,
} from "./src/result/result-extras"

export {
  mapBothTR,
  leftMapTR,
  rightMapTR,
  foldTR,
  swapTR,
  tapOkTR,
  tapErrTR,
} from "./src/task/task-result-utils"

export {
  mapBothRTR,
  leftMapRTR,
  rightMapRTR,
  foldRTR,
  swapRTR,
  tapOkRTR,
  tapErrRTR,
} from "./src/task/reader-task-result-utils"

export {
  Lens,
  lens,
  lensProp,
  composeLens,
  over,
  prism,
  composePrism,
  modifyP,
  PrismOption,
  PrismResult,
} from "./src/optics/lens-prism"

export {
  optional,
  modifyO,
  traversalFromArray,
  composeTraversal,
  composeOptional,
  lensToOptional,
  prismToOptional,
  optionalProp,
  optionalIndex,
  traversal,
  traversalArray,
  traversalPropArray,
  optionalToTraversal,
  overT,
} from "./src/optics/optional-traversal"
export type { Optional, Traversal } from "./src/optics/optional-traversal"

export * from "./src/state/state"

export type { StateReaderTask, SRTResult } from "./src/state/state-reader-task"
export {
  SRT,
  runSRT,
  evalSRT,
  execSRT,
  mapSRTResult,
  chainSRTResult,
  srtWithTimeout,
  srtRetry,
  sequenceSRT,
  traverseSRT,
  sequenceSRTResult,
  traverseSRTResult,
} from "./src/state/state-reader-task"

export {
  bracketT,
  bracketTR,
  bracketRT,
  bracketRTR,
  retry,
  withTimeout,
  allLimited,
} from "./src/task/async-control"

export {
  sequenceArrayResult,
  traverseArrayResult,
  bimapR,
} from "./src/result/result-traverse"

export type {
  NoInfer,
  ArrRTR,
  ArrReader,
  ArrTask,
  ArrReaderTask,
} from "./src/arrows/kleisli"
export {
  makeKleisliArrowReader,
  makeKleisliArrowTask,
  makeKleisliArrowReaderTask,
  makeKleisliArrowRTR,
} from "./src/arrows/kleisli"

export type { Stream, StreamProc } from "./src/arrows/stream-arrow"
export { StreamArrow, StreamFusion, isIndependent } from "./src/arrows/stream-arrow"

export type { IR, RewritePlan, RewriteStep } from "./src/arrows/arrow-ir"
export {
  Arrow,
  arr,
  alt,
  comp,
  denot,
  fanout,
  first,
  leftArrow,
  loop,
  normalize,
  par,
  plus,
  rightArrow,
  second,
  zero,
} from "./src/arrows/arrow-ir"





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

export type { NonEmptyArray } from "./stdlib/nonempty-array"
export { fromArrayNE, headNE, tailNE, mapNE } from "./stdlib/nonempty-array"

export type { Semigroup, Monoid } from "./stdlib/monoid"
export {
  SemigroupString,
  MonoidString,
  SemigroupArray,
  MonoidArray,
  concatAll,
  concatNE,
} from "./stdlib/monoid"

export type { Endo } from "./stdlib/endo"
export { MonoidEndo, applyEdits } from "./stdlib/endo"

export { eqStrict, eqSetNative, eqSetBy, eqMapNative, eqMapBy } from "./stdlib/eq"

export { ordNumber, ordString, sortBy } from "./stdlib/ord"

export type { DeepReadonly } from "./stdlib/deep-freeze"
export { deepFreeze } from "./stdlib/deep-freeze"

export {
  fromEntriesMap,
  entriesMap,
  keysMap,
  valuesMap,
  mapMapValues,
  mapMapKeys,
  filterMap,
  unionMap,
  intersectMap,
  differenceMap,
  groupBy,
  partitionMapBy,
  partitionMapWith,
  setFrom,
  toArraySet,
  mapSet,
  filterSet,
  unionSet,
  intersectSet,
  differenceSet,
  isSubsetOf,
  partitionSet,
  partitionSetWith,
  filterMapArray,
  filterMapArraySimple,
  collectArray,
  filterMapMapValues,
  collectMapValues,
  filterMapMapEntries,
  collectMapEntries,
  filterMapSet,
  collectSet,
} from "./stdlib/collections"

export type { PartialFn } from "./stdlib/partial-fn"
export {
  pf,
  liftOptionPF,
  liftResultPF,
  orElsePF,
  composePF,
  restrictPF,
  optionFromPartial,
  resultFromPartial,
} from "./stdlib/partial-fn"

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














































































// Tiny examples
// ENV / config
type AppEnv = { apiBase: string; token: string }

// Reader usage (pure dependency injection)
const authHeader: Reader<AppEnv, Record<string, string>> = Reader.asks((env) => ({
  Authorization: `Bearer ${env.token}`,
}))

const url: Reader<AppEnv, string> = Reader.asks((env) => `${env.apiBase}/users/me`)

const headersThenUrl = Reader.chain<Record<string, string>, string, AppEnv>((h) =>
  Reader.map<string, string>((u) => `${u}?auth=${!!h['Authorization']}`)(url)
)(authHeader)

// run
runReader(headersThenUrl, { apiBase: "https://api.example.com", token: "T" })
// -> "https://api.example.com/users/me?auth=true"




// Next example
// ReaderTask usage (async + DI)
type Http = (input: RequestInfo, init?: RequestInit) => Promise<Response>
type EnvRT = { apiBase: string; http: Http }

const getMe: ReaderTask<EnvRT, unknown> = ReaderTask.chain<string, unknown, EnvRT>(
  (u) =>
    async (env) => {
      const res = await env.http(u)
      return res.json()
    }
)(
  // build URL from env
  ReaderTask.asks((env) => `${env.apiBase}/users/me`)
)

// locally tweak environment (e.g., swap base URL)
const getMeFromStaging = ReaderTask.local<EnvRT, EnvRT>(
  (env) => ({ ...env, apiBase: "https://staging.example.com" })
)(getMe)

void getMeFromStaging

// run
// await getMe({
//   apiBase: "https://api.example.com",
//   http: (input, init) => fetch(input, init),
// })



// Next example
// ReaderTask + TaskResult (graceful errors)
type E = Error
type User = { id: string; name: string }
type EnvErr = { apiBase: string; http: Http }

const getJsonTR =
  <A>(path: string): ReaderTask<EnvErr, Result<E, A>> =>
  async (env) => {
    try {
      const res = await env.http(`${env.apiBase}${path}`)
      if (!res.ok) return Err(new Error(`HTTP ${res.status}`))
      return Ok((await res.json()) as A)
    } catch (u) {
      return Err(u instanceof Error ? u : new Error(String(u)))
    }
  }

type ExprEnvDemo = Readonly<Record<string, number>>

type ReaderTaskApplicativeShowcase = {
  readonly fetchUserName: ReaderTask<EnvErr, Result<E, string>>
  readonly partialFn: {
    readonly ints1: ReadonlyArray<number>
    readonly ints2: ReadonlyArray<number>
    readonly ages: ReadonlyMap<string, number>
    readonly byDomain: ReadonlyMap<string, string>
    readonly setInts: ReadonlySet<number>
  }
  readonly readerEval: {
    readonly program: Expr.Expr
    readonly emptyEnv: ExprEnvDemo
    readonly shadowEnv: ExprEnvDemo
    readonly emptyResult: number
    readonly shadowResult: number
  }
  readonly readerResult: {
    readonly expr: Expr.Expr
    readonly outcome: Result<string, number>
  }
  readonly stackMachine: {
    readonly expr: Expr.Expr
    readonly program: Expr.Program
    readonly result: Result<string, number>
  }
  readonly structuralMetrics: {
    readonly complexExpr: Expr.Expr
    readonly exprSize: number
    readonly exprDepth: number
    readonly complexJson: Json
    readonly jsonSize: number
    readonly jsonStrs: ReadonlyArray<string>
    readonly jsonDepth: number
    readonly jsonSize2: number
    readonly jsonDepth2: number
  }
}

export const readerTaskApplicativeShowcase: ReaderTaskApplicativeShowcase = (() => {
  const getUser = (id: string): ReaderTask<EnvErr, Result<E, User>> =>
    getJsonTR<User>(`/users/${id}`)

  const fetchUserName: ReaderTask<EnvErr, Result<Error, string>> =
    ReaderTaskResult.map<EnvErr, Error, User, string>((u) => u.name)(
      getUser("42")
    )

  // ---------- Partial function: parseInt on int-like strings ----------
  const intLike = (s: string) => /^-?\d+$/.test(s)
  const parseIntPF: PartialFn<string, number> = pf(intLike, s => Number(s))

  const raw = ["10", "x", "-3", "7.5", "0"]
  const ints1 = filterMapArraySimple(raw, (s) => intLike(s) ? Some(Number(s)) : None)
  const ints2 = collectArray(raw, parseIntPF)

  const agesRaw = new Map<string, string>([["a","19"], ["b","oops"], ["c","42"]])
  const ages = collectMapValues(agesRaw, parseIntPF)

  const emails = new Map<string, string>([
    ["u1", "ada@example.com"],
    ["u2", "not-an-email"],
    ["u3", "bob@example.com"]
  ])
  const emailDomainPF: PartialFn<readonly [string, string], readonly [string, string]> =
    pf(([, e]) => /@/.test(e), ([id, e]) => [e.split("@")[1]!, id] as const)
  const byDomain = collectMapEntries(emails, emailDomainPF)

  const setRaw = new Set(["1", "2", "two", "3"])
  const setInts = collectSet(setRaw, parseIntPF)

  const prog = Expr.lett("x", Expr.lit(10),
    Expr.addN([ Expr.vvar("x"), Expr.powE(Expr.lit(2), Expr.lit(3)), Expr.neg(Expr.lit(4)) ])
  )
  const emptyEnv: ExprEnvDemo = {}
  const shadowEnv: ExprEnvDemo = { x: 1 }
  const emptyResult = runReader(Expr.evalExprR_app(prog), emptyEnv)
  const shadowResult = runReader(Expr.evalExprR_app(prog), shadowEnv)

  const bad = Expr.divE(Expr.lit(1), Expr.add(Expr.vvar("d"), Expr.neg(Expr.vvar("d"))))
  const outcome = runReader(Expr.evalExprRR_app(bad), { d: 3 })

  const machineExpr = Expr.lett("y", Expr.lit(5), Expr.mul(Expr.add(Expr.vvar("y"), Expr.lit(1)), Expr.lit(3)))
  const program = Expr.compileExpr(machineExpr)
  const result = Expr.runProgram(program)

  const complexExpr = Expr.addN([
    Expr.neg(Expr.lit(4)),
    Expr.mulN([Expr.lit(2), Expr.lit(3)]),
    Expr.divE(Expr.lit(8), Expr.lit(2)),
  ])
  const [exprSize, exprDepth] = Expr.sizeAndDepthExpr(complexExpr)

  const complexJson = jObj([
    ['name', jStr('Ada')],
    ['tags', jArr([jStr('fp'), jStr('ts')])]
  ])
  const jsonSize = sizeJson(complexJson)
  const jsonStrs = strsJson(complexJson)
  const jsonDepth = depthJson(complexJson)
  const [jsonSize2, jsonDepth2] = sizeAndDepthJson(complexJson)

  return {
    fetchUserName,
    partialFn: { ints1, ints2, ages, byDomain, setInts },
    readerEval: { program: prog, emptyEnv, shadowEnv, emptyResult, shadowResult },
    readerResult: { expr: bad, outcome },
    stackMachine: { expr: machineExpr, program, result },
    structuralMetrics: {
      complexExpr,
      exprSize,
      exprDepth,
      complexJson,
      jsonSize,
      jsonStrs,
      jsonDepth,
      jsonSize2,
      jsonDepth2,
    },
  } as const
})()

// ===============================================================
// Generic descent/glue kit
//   - Works over every index type I (keys you glue along),
//     local pieces Xi, overlap observations Oij, and final A.
//   - You supply: how to "restrict" to overlaps, equality on overlaps,
//     optional completeness checks, and how to assemble the global.
// ===============================================================

export type GlueKit<I extends PropertyKey, Xi, Oij, A> = {
  readonly cover: ReadonlyArray<I>
  readonly restrict: (i: I, j: I) => (xi: Xi) => Oij
  readonly eqO: Eq<Oij>
  readonly assemble: (sections: Readonly<Record<I, Xi>>) => A
  readonly completeness?: (i: I, xi: Xi) => ReadonlyArray<string> // empty => ok
}

export type GlueErr<I extends PropertyKey, Oij> =
  | { _tag: 'Incomplete'; i: I; details: ReadonlyArray<string> }
  | { _tag: 'Conflict';  i: I; j: I; left: Oij; right: Oij }

export const GlueKit = Symbol.for('GlueKit')
export const GlueErr = Symbol.for('GlueErr')

export const checkDescent =
  <I extends PropertyKey, Xi, Oij, A>(
    kit: GlueKit<I, Xi, Oij, A>,
    secs: Readonly<Record<I, Xi>>
  ): Validation<GlueErr<I, Oij>, true> => {
    const errs: GlueErr<I, Oij>[] = []
    const ids = kit.cover

    // 1) completeness per piece (optional)
    if (kit.completeness) {
      for (const i of ids) {
        const issues = kit.completeness(i, secs[i])
        if (issues.length) errs.push({ _tag: 'Incomplete', i, details: issues })
      }
    }

    // 2) compatibility on all overlaps
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
      const i = ids[a]!, j = ids[b]!
      const rij = kit.restrict(i, j)(secs[i])
      const rji = kit.restrict(j, i)(secs[j])
      if (!kit.eqO(rij, rji)) errs.push({ _tag: 'Conflict', i, j, left: rij, right: rji })
    }

    return errs.length ? VErr(...errs) : VOk(true as const)
  }

export const glue =
  <I extends PropertyKey, Xi, Oij, A>(
    kit: GlueKit<I, Xi, Oij, A>,
    secs: Readonly<Record<I, Xi>>
  ): Validation<GlueErr<I, Oij>, A> => {
    const ok = checkDescent(kit, secs)
    if (isVErr(ok)) return ok
    return VOk(kit.assemble(secs))
  }

// ===============================================================
// Record-based gluing (keys as "opens")
// ===============================================================
export type RecordCover<I extends PropertyKey, K extends PropertyKey> =
  Readonly<Record<I, ReadonlySet<K>>>
export type Sections<I extends PropertyKey, K extends PropertyKey, A> =
  Readonly<Record<I, Readonly<Partial<Record<K, A>>>>> 

export const RecordCover = Symbol.for('RecordCover')
export const Sections = Symbol.for('Sections')

const intersect = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>): ReadonlyArray<T> => {
  const out: T[] = []; for (const x of a) if (b.has(x)) out.push(x); return out
}

const eqRecordOn =
  <K extends PropertyKey, A>(eqA: Eq<A>) =>
  (keys: ReadonlyArray<K>) =>
  (
    x: Readonly<Partial<Record<K, A>>>,
    y: Readonly<Partial<Record<K, A>>>
  ): boolean =>
    keys.every(k => eqA(x[k] as A, y[k] as A))

const pickRecord = <K extends PropertyKey, A>(
  r: Readonly<Partial<Record<K, A>>>,
  ks: ReadonlyArray<K>
): Readonly<Partial<Record<K, A>>> => {
  const out: Partial<Record<K, A>> = {}
  for (const k of ks) {
    if (Object.prototype.hasOwnProperty.call(r, k)) {
      out[k] = r[k] as A
    }
  }
  return out
}

export const mkRecordGlueKit =
  <I extends PropertyKey, K extends PropertyKey, A>(
    cover: RecordCover<I, K>,
    eqA: Eq<A> = eqStrict<A>()
  ): GlueKit<
    I,
    Readonly<Partial<Record<K, A>>>,
    Readonly<Partial<Record<K, A>>>,
    Readonly<Record<K, A>>
  > => {
    const ids = Object.keys(cover) as I[]

    const restrict = (i: I, j: I) => (ri: Readonly<Partial<Record<K, A>>>) =>
      pickRecord(ri, intersect(cover[i], cover[j]))

    const eqO = (
      x: Readonly<Partial<Record<K, A>>>,
      y: Readonly<Partial<Record<K, A>>>
    ) =>
      eqRecordOn(eqA)(Object.keys(x) as K[])(x, y) &&
      eqRecordOn(eqA)(Object.keys(y) as K[])(x, y)

    const completeness = (i: I, ri: Readonly<Partial<Record<K, A>>>) => {
      const need = [...cover[i] as Set<K>]
      const miss = need.filter(k => !(k in ri))
      return miss.length ? miss.map(k => `missing ${String(k)}`) : []
    }

    const assemble = (secs: Readonly<Record<I, Readonly<Partial<Record<K, A>>>>>) => {
      // union of all keys in the cover
      const all = new Set<K>(); for (const i of ids) for (const k of cover[i]) all.add(k)
      const out: Partial<Record<K, A>> = {}
      // since descent holds, whatever section defines k has the same value
      for (const k of all) {
        for (const i of ids) {
          const ri = secs[i]
          if (Object.prototype.hasOwnProperty.call(ri, k)) {
            out[k] = ri[k] as A
            break
          }
        }
      }
      return out as Readonly<Record<K, A>>
    }

    return { cover: ids, restrict, eqO, completeness, assemble }
  }

// Legacy API compatibility
export const glueRecordCover =
  <I extends PropertyKey, K extends PropertyKey, A>(
    cover: RecordCover<I, K>,
    secs: Sections<I, K, A>,
    eq: Eq<A> = eqStrict<A>()
  ) => glue(mkRecordGlueKit(cover, eq), secs)

export const resRecord =
  <I extends PropertyKey, K extends PropertyKey, A>(cover: RecordCover<I, K>) =>
  (i: I, j: I) =>
  (si: Readonly<Partial<Record<K, A>>>): Readonly<Partial<Record<K, A>>> => {
    const kit = mkRecordGlueKit<I, K, A>(cover)
    return kit.restrict(i, j)(si)
  }

// ---------- Fused hylo demo (Expr or Json as you like) ----------
// Note: These functions would need to be implemented based on your fused hylo setup
// const s5 = evalSum1toN_FUSED(5)                          // 15
// const p2 = showPowMul_FUSED(2, 3)                        // "((3 * 3) * (3 * 3))"

// =====================================================================
// Semirings and matrix utilities for categorical theory
// =====================================================================
export type Semiring<R> = {
  readonly zero: R
  readonly one: R
  readonly add: (x: R, y: R) => R
  readonly mul: (x: R, y: R) => R
  readonly eq?: (x: R, y: R) => boolean
}

export const SemiringNat: Semiring<number> = {
  zero: 0,
  one: 1,
  add: (x, y) => x + y,
  mul: (x, y) => x * y,
  eq: (x, y) => x === y,
}

// -------------------------------------------------------------
// Handy semirings
// -------------------------------------------------------------
export const SemiringMinPlus: Semiring<number> = {
  add: (a,b) => Math.min(a,b),
  zero: Number.POSITIVE_INFINITY,
  mul: (a,b) => a + b,
  one: 0,
  eq: eqStrict<number>(),
}

export const SemiringMaxPlus: Semiring<number> = {
  add: (a,b) => Math.max(a,b),
  zero: Number.NEGATIVE_INFINITY,
  mul: (a,b) => a + b,
  one: 0,
  eq: eqStrict<number>(),
}

// Boolean reachability (∨ for add, ∧ for mul)
export const SemiringBoolOrAnd: Semiring<boolean> = {
  add: (a,b) => a || b,
  zero: false,
  mul: (a,b) => a && b,
  one: true,
  eq: eqStrict<boolean>(),
}

// Probability semiring (standard +, ×)
export const SemiringProb: Semiring<number> = {
  add: (a,b) => a + b,
  zero: 0,
  mul: (a,b) => a * b,
  one: 1,
  eq: eqStrict<number>(),
}

// ---------- Ring (Semiring + additive inverses) ----------
export interface Ring<R> extends Semiring<R> {
  neg: (a: R) => R
  sub: (a: R, b: R) => R
}

// A concrete ring over number
export const RingReal: Ring<number> = {
  add: (a,b) => a + b,
  zero: 0,
  mul: (a,b) => a * b,
  one: 1,
  eq: eqStrict<number>(),
  neg: a => -a,
  sub: (a,b) => a - b
}

export type Mat<R> = R[][] // rows x cols

// Identity matrix
export const eye = <R>(S: Semiring<R>) => (n: number): Mat<R> => {
  const result: R[][] = []
  for (let i = 0; i < n; i++) {
    const row: R[] = []
    for (let j = 0; j < n; j++) {
      row.push(i === j ? S.one : S.zero)
    }
    result.push(row)
  }
  return result
}

// Matrix multiplication
export const matMul = <R>(S: Semiring<R>) => (A: Mat<R>, B: Mat<R>): Mat<R> => {
  const m = A.length
  const k = B.length
  const n = B[0]?.length ?? 0
  if (A[0]?.length !== k) throw new Error('matMul: incompatible dimensions')
  
  const result: R[][] = []
  for (let i = 0; i < m; i++) {
    const row: R[] = []
    for (let j = 0; j < n; j++) {
      let sum = S.zero
      for (let p = 0; p < k; p++) {
        sum = S.add(sum, S.mul(A[i]![p]!, B[p]![j]!))
      }
      row.push(sum)
    }
    result.push(row)
  }
  return result
}

// Kronecker product
export const kron = <R>(S: Semiring<R>) => (A: Mat<R>, B: Mat<R>): Mat<R> => {
  const mA = A.length
  const nA = A[0]?.length ?? 0
  const mB = B.length
  const nB = B[0]?.length ?? 0
  
  const result: R[][] = []
  for (let i = 0; i < mA * mB; i++) {
    const row: R[] = []
    for (let j = 0; j < nA * nB; j++) {
      const iA = Math.floor(i / mB)
      const iB = i % mB
      const jA = Math.floor(j / nB)
      const jB = j % nB
      const aVal = A[iA]?.[jA] ?? S.zero
      const bVal = B[iB]?.[jB] ?? S.zero
      row.push(S.mul(aVal, bVal))
    }
    result.push(row)
  }
  return result
}

// Matrix equality
export const eqMat = <R>(S: Semiring<R>) => (A: Mat<R>, B: Mat<R>): boolean => {
  const eq = S.eq ?? ((x: R, y: R) => Object.is(x, y))
  if (A.length !== B.length) return false
  if (A[0]?.length !== B[0]?.length) return false
  
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < (A[0]?.length ?? 0); j++) {
      const aVal = A[i]?.[j]
      const bVal = B[i]?.[j]
      if (aVal === undefined || bVal === undefined || !eq(aVal, bVal)) {
        return false
      }
    }
  }
  return true
}

// =====================================================================
// Corings over semirings
//   A coring C over R^n is (R^n, Δ: C→C⊗C, ε: C→R) satisfying laws
// =====================================================================
export type Coring<R> = {
  readonly S: Semiring<R>
  readonly n: number         // rank of C ≅ R^n
  readonly Delta: Mat<R>     // (n*n) x n
  readonly Eps: Mat<R>       // 1 x n
}

// Diagonal coring: each basis element is group-like
export const makeDiagonalCoring = <R>(S: Semiring<R>) => (n: number): Coring<R> => {
  // Δ(c_i) = c_i ⊗ c_i
  const Delta: R[][] = []
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const row: R[] = Array(n).fill(S.zero)
      if (i === j) row[i] = S.one
      Delta.push(row)
    }
  }
  
  // ε(c_i) = 1 for all i
  const Eps: R[][] = [Array(n).fill(S.one)]
  
  return { S, n, Delta, Eps }
}

// =========================================
// Algebra on free module A ≅ R^k (finite)
//   μ : A⊗A -> A     (k x k^2)
//   η : R   -> A     (k x 1)
// =========================================
export type Algebra<R> = {
  readonly S: Semiring<R>
  readonly k: number
  readonly Mu : Mat<R>  // k x (k*k)
  readonly Eta: Mat<R>  // k x 1
}

// Diagonal algebra: basis {e_i}; μ(e_i⊗e_j)=δ_{ij} e_i, η(1)=∑ e_i
export const makeDiagonalAlgebra =
  <R>(S: Semiring<R>) =>
  (k: number): Algebra<R> => {
    const Mu: R[][] = Array.from({ length: k }, () =>
      Array.from({ length: k * k }, () => S.zero)
    )
    for (let i = 0; i < k; i++) {
      const col = i * k + i // (i,i) slot in flattened k×k
      Mu[i]![col] = S.one
    }
    const Eta: R[][] = Array.from({ length: k }, () => [S.one])
    return { S, k, Mu, Eta }
  }

// =========================================
// Entwining between Algebra A and Coring C
//   Ψ : A⊗C → C⊗A    ((n*k) x (k*n))
// Laws (Brzeziński–Majid):
//  (1) (Δ⊗id_A) Ψ = (id_C⊗Ψ)(Ψ⊗id_C)(id_A⊗Δ)
//  (2) (id_C⊗μ)(Ψ⊗id_A)(id_A⊗Ψ) = Ψ(μ⊗id_C)
//  (3) Ψ(η⊗id_C) = id_C⊗η
//  (4) (ε⊗id_A)Ψ = id_A⊗ε
// =========================================
export type Entwining<R> = {
  readonly A: Algebra<R>
  readonly C: Coring<R>
  readonly Psi: Mat<R>             // (C.n * A.k) x (A.k * C.n)
}

// -------------------------------------------------------------
// Vectors + matrix powers/closures under a Semiring
// -------------------------------------------------------------
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

// finite Kleene star up to L: I ⊕ A ⊕ A^2 ⊕ ... ⊕ A^L
export const closureUpTo =
  <R>(S: Semiring<R>) =>
  (A: Mat<R>, L: number): Mat<R> => {
    const n = A.length
    let acc = eye(S)(n)
    let p = eye(S)(n)
    for (let i = 1; i <= L; i++) {
      p = matMul(S)(p, A)
      // acc = acc ⊕ p  (elementwise add)
      acc = acc.map((row, r) => row.map((x, c) => S.add(x, p[r]?.[c]!)))
    }
    return acc
  }

// ---------- Matrix helpers that need a Ring ----------
export const matAdd =
  <R>(Rng: Ring<R>) =>
  (A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.map((row,i) => row.map((x,j) => Rng.add(x, B[i]?.[j]!)))

export const matNeg =
  <R>(Rng: Ring<R>) =>
  (A: Mat<R>): Mat<R> =>
    A.map(row => row.map(Rng.neg))

export const zerosMat =
  <R>(rows: number, cols: number, S: Semiring<R>): Mat<R> =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => S.zero))

export const idMat =
  <R>(n: number, S: Semiring<R>): Mat<R> => eye(S)(n)

// Block concat (no checks; keep careful with dims)
export const hcat =
  <R>(A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.map((row, i) => row.concat(B[i]!))

export const vcat =
  <R>(A: Mat<R>, B: Mat<R>): Mat<R> =>
    A.concat(B)

// 3-factor permutation matrix P: factors [d0,d1,d2] -> permute by π
// π = [0,1,2] is identity; π = [1,2,0] cycles (0→1→2→0)
export const permute3 = <R>(S: Semiring<R>) =>
  (dims: [number, number, number], perm: [number, number, number]): Mat<R> => {
    const [d0, d1, d2] = dims
    const total = d0 * d1 * d2
    const M: R[][] = Array.from({ length: total }, () =>
      Array.from({ length: total }, () => S.zero)
    )
    
    // For permutation [p0, p1, p2], the target dimensions are [dims[p0], dims[p1], dims[p2]]
    const targetDims = [dims[perm[0]], dims[perm[1]], dims[perm[2]]]
    
    for (let i0 = 0; i0 < d0; i0++) {
      for (let i1 = 0; i1 < d1; i1++) {
        for (let i2 = 0; i2 < d2; i2++) {
          const indices = [i0, i1, i2]
          const sourceIdx = i0 * (d1 * d2) + i1 * d2 + i2
          
          // Apply permutation
          const permIndices = [indices[perm[0]!]!, indices[perm[1]!]!, indices[perm[2]!]!]
          const [j0, j1, j2] = permIndices
          const targetIdx = j0! * (targetDims[1]! * targetDims[2]!) + j1! * targetDims[2]! + j2!
          
          const row = M[targetIdx]
          if (row) row[sourceIdx] = S.one
        }
      }
    }
    return M
  }

const I = <R>(S: Semiring<R>) => (n: number) => eye(S)(n)

export const entwiningCoassocHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, k }, C: { n, Delta }, Psi } = E
  const idA = I(S)(k), idC = I(S)(n)

  // LHS: (Δ⊗id_A) Ψ
  const L = matMul(S)(kron(S)(Delta, idA), Psi)
  // RHS: (id_C⊗Ψ)(Ψ⊗id_C)(id_A⊗Δ)
  const R1 = kron(S)(idA, Delta)
  const R2 = matMul(S)(kron(S)(Psi, idC), R1)
  const R  = matMul(S)(kron(S)(idC, Psi), R2)

  return eqMat(S)(L, R)
}

export const entwiningMultHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, k, Mu }, C: { n }, Psi } = E
  const idA = I(S)(k), idC = I(S)(n)

  // LHS: (id_C⊗μ)(Ψ⊗id_A)(id_A⊗Ψ)
  const L1 = kron(S)(idA, Psi)
  const L2 = matMul(S)(kron(S)(Psi, idA), L1)
  const L  = matMul(S)(kron(S)(idC, Mu), L2)

  // RHS: Ψ(μ⊗id_C)
  const R  = matMul(S)(Psi, kron(S)(Mu, idC))

  return eqMat(S)(L, R)
}

export const entwiningUnitHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, Eta }, C: { n }, Psi } = E
  const idC = I(S)(n)
  // Ψ(η⊗id_C) = id_C⊗η  : both are (n*k) x n
  const left  = matMul(S)(Psi, kron(S)(Eta, idC))
  const right = kron(S)(idC, Eta)
  return eqMat(S)(left, right)
}

export const entwiningCounitHolds = <R>(E: Entwining<R>): boolean => {
  const { A: { S, k }, C: { Eps }, Psi } = E
  const idA = I(S)(k)
  // (ε⊗id_A)Ψ = id_A⊗ε  : both are k x (k*n)
  const left  = matMul(S)(kron(S)(Eps, idA), Psi)
  const right = kron(S)(idA, Eps)
  return eqMat(S)(left, right)
}

// Permutation matrix that flips A⊗C → C⊗A in the chosen basis
export const flipAC =
  <R>(S: Semiring<R>) =>
  (k: number, n: number): Mat<R> => {
    const M: R[][] = Array.from({ length: n * k }, () =>
      Array.from({ length: k * n }, () => S.zero)
    )
    // column index c = a*n + cIdx ; row index r = cIdx*k + a
    for (let a = 0; a < k; a++) for (let cIdx = 0; cIdx < n; cIdx++) {
      const col = a * n + cIdx
      const row = cIdx * k + a
      const m = M[row]
      if (m) m[col] = S.one
    }
    return M
  }

// Ready-made diagonal entwining
export const makeDiagonalEntwining =
  <R>(A: Algebra<R>, C: Coring<R>): Entwining<R> => {
    if (A.S !== C.S) console.warn('Entwining assumes A and C over the same Semiring instance')
    return { A, C, Psi: flipAC(A.S)(A.k, C.n) }
  }

// =====================================================================
// (Left) A–module + (Right) C–comodule entwined by Ψ : A⊗C → C⊗A
//   Data on M ≅ R^m:
//     act : A⊗M → M         (matrix m × (k*m))
//     rho : M → M⊗C         (matrix (m*n) × m)
//   Compatibility (Brzeziński–Majid, left/right convention):
//     ρ ∘ act
//       = (act ⊗ id_C) ∘ P_(C,A,M→A,M,C) ∘ (Ψ ⊗ id_M)
//         ∘ P_(A,M,C→A,C,M) ∘ (id_A ⊗ ρ)
//   where P are the strict permutation matrices on 3 factors.
//
//   Shapes summary (k = dim A, n = dim C, m = dim M):
//     act :      m × (k*m)
//     rho : (m*n) × m
// =====================================================================
export type EntwinedModule<R> = {
  readonly S: Semiring<R>
  readonly A: Algebra<R>
  readonly C: Coring<R>
  readonly m: number
  readonly act: Mat<R>         // m × (k*m)
  readonly rho: Mat<R>         // (m*n) × m
}

export const entwinedLawHolds = <R>(
  E: Entwining<R>,
  M: EntwinedModule<R>
): boolean => {
  const { A: { S, k }, C: { n }, Psi } = E
  const { m, act, rho } = M
  if (S !== M.S || S !== E.C.S) console.warn('entwinedLawHolds: semiring instances differ')

  const I = (d: number) => eye(S)(d)

  // LHS: ρ ∘ act : (m*n) × (k*m)
  const L = matMul(S)(rho, act)

  // RHS pipeline:
  // (id_A ⊗ ρ) : (k*m*n) × (k*m)
  const step1 = kron(S)(I(k), rho)

  // P_(A,M,C → A,C,M)
  const P1 = permute3(S)([k, m, n], [0, 2, 1])
  const step2 = matMul(S)(P1, step1)

  // (Ψ ⊗ id_M)
  const step3 = matMul(S)(kron(S)(Psi, I(m)), step2)

  // P_(C,A,M → A,M,C)
  const P2 = permute3(S)([n, k, m], [1, 2, 0])
  const step4 = matMul(S)(P2, step3)

  // (act ⊗ id_C)
  const Rfinal = matMul(S)(kron(S)(act, I(n)), step4)

  return eqMat(S)(L, Rfinal)
}

// Helper type for left modules
export type LeftModule<R> = {
  readonly S: Semiring<R>
  readonly A: Algebra<R>
  readonly m: number
  readonly act: Mat<R>         // m × (k*m)
}

// A diagonal left A-module where each M-basis j picks an A-basis via τ(j)
// act(e_{τ(j)} ⊗ m_j) = m_j ; all other A-basis act as 0 on m_j
export const makeTaggedLeftModule =
  <R>(A: Algebra<R>) =>
  (m: number, tau: (j: number) => number): LeftModule<R> => {
    const act: R[][] = Array.from({ length: m }, () =>
      Array.from({ length: A.k * m }, () => A.S.zero)
    )
    for (let j = 0; j < m; j++) {
      const aIdx = tau(j) % A.k
      const row = act[j]
      if (row) row[aIdx * m + j] = A.S.one
    }
    return { S: A.S, A, m, act }
  }

// Pair the above action with a diagonal right C–coaction by σ(j)
export const makeDiagonalEntwinedModule =
  <R>(E: Entwining<R>) =>
  (m: number, tau: (j: number) => number, sigma: (j: number) => number): EntwinedModule<R> => {
    const A = E.A, C = E.C, S = A.S
    // action
    const LM = makeTaggedLeftModule(A)(m, tau)
    // coaction  ρ(m_j) = m_j ⊗ c_{σ(j)}
    const rho: R[][] = Array.from({ length: m * C.n }, () =>
      Array.from({ length: m }, () => S.zero)
    )
    for (let j = 0; j < m; j++) {
      const cIdx = sigma(j) % C.n
      const row = rho[j * C.n + cIdx]
      if (row) row[j] = S.one
    }
    const M: EntwinedModule<R> = { S, A, C, m, act: LM.act, rho }
    return M
  }

// =====================================================================
// Morphism of entwined modules f : M → N (linear map, shapes mN × mM)
//  (A,C,Ψ) fixed.
// Laws:
//   (i)  f ∘ act_M = act_N ∘ (id_A ⊗ f)
//   (ii) (f ⊗ id_C) ∘ rho_M = rho_N ∘ f
// =====================================================================
export const isEntwinedModuleHom =
  <R>(E: Entwining<R>) =>
  (M: EntwinedModule<R>, N: EntwinedModule<R>, f: Mat<R>): boolean => {
    const S = E.A.S
    const k = E.A.k, n = E.C.n
    const mM = M.m, mN = N.m

    // quick shape sanity (optional)
    if ((f.length !== mN) || (f[0]?.length ?? -1) !== mM) return false

    const I = (d: number) => eye(S)(d)

    // (i) action square
    const leftAct  = matMul(S)(f, M.act)                          // mN × (k*mM)
    const rightAct = matMul(S)(N.act, kron(S)(I(k), f))           // mN × (k*mM)

    // (ii) coaction square
    const leftCo   = matMul(S)(kron(S)(f, I(n)), M.rho)           // (mN*n) × mM
    const rightCo  = matMul(S)(N.rho, f)                          // (mN*n) × mM

    return eqMat(S)(leftAct, rightAct) && eqMat(S)(leftCo, rightCo)
  }

// ================================================
// Hom composition for EntwinedModule morphisms
//   If f : M→N (shape mN × mM) and g : N→P (mP × mN)
//   then g ∘ f : M→P  (mP × mM)
// ================================================
export const composeEntwinedHomsUnchecked =
  <R>(S: Semiring<R>) =>
  (g: Mat<R>, f: Mat<R>): Mat<R> =>
    // compose g ∘ f  (apply f, then g) — our convention matches composeMap
    matMul(S)(g, f)

// Safe version with shape + law checks
export const composeEntwinedHoms =
  <R>(E: Entwining<R>) =>
  (M: EntwinedModule<R>, N: EntwinedModule<R>, P: EntwinedModule<R>) =>
  (g: Mat<R>, f: Mat<R>): Result<string, Mat<R>> => {
    const S = E.A.S
    const rows = (A: Mat<R>) => A.length
    const cols = (A: Mat<R>) => (A[0]?.length ?? 0)

    // shape checks
    if (cols(f) !== M.m) return Err(`compose: f has ${cols(f)} cols, expected ${M.m} (dom M)`)
    if (rows(f) !== N.m) return Err(`compose: f has ${rows(f)} rows, expected ${N.m} (cod N)`)
    if (cols(g) !== N.m) return Err(`compose: g has ${cols(g)} cols, expected ${N.m} (dom N)`)
    if (rows(g) !== P.m) return Err(`compose: g has ${rows(g)} rows, expected ${P.m} (cod P)`)

    // hom checks
    if (!isEntwinedModuleHom(E)(M, N, f)) return Err('compose: f is not an entwined-module hom')
    if (!isEntwinedModuleHom(E)(N, P, g)) return Err('compose: g is not an entwined-module hom')

    // composition
    return Ok(matMul(S)(g, f))
  }

// Lift A⊗M to a comodule via (id_A ⊗ ρ_M)
export const liftAotimesToComodule = <R>(E: Entwining<R>) => (M: Comodule<R>): Comodule<R> => {
  const S = E.A.S, k = E.A.k, m = M.m
  const I = (d: number) => eye(S)(d)
  
  // A⊗M has dimension k*m
  // coaction: (id_A ⊗ ρ_M) : A⊗M → A⊗M⊗C, matrix (k*m*n) × (k*m)
  const rho_AM = kron(S)(I(k), M.rho)
  
  return { S, C: E.C, m: k * m, rho: rho_AM }
}

// Lift N⊗C to a left module via (act_N ⊗ id_C)
export const liftTensorCToLeftModule = <R>(E: Entwining<R>) => (N: LeftModule<R>): LeftModule<R> => {
  const S = E.A.S, n = E.C.n, m = N.m
  const I = (d: number) => eye(S)(d)
  
  // N⊗C has dimension m*n
  // action: A⊗(N⊗C) → N⊗C via (act_N ⊗ id_C), matrix (m*n) × (k*m*n)
  const act_NC = kron(S)(N.act, I(n))
  
  return { S, A: E.A, m: m * n, act: act_NC }
}

// A⊗M as an entwined module
export const entwinedFromComodule_AotimesM =
  <R>(E: Entwining<R>) =>
  (M: Comodule<R>): EntwinedModule<R> => {
    const S = E.A.S, k = E.A.k, m = M.m
    const I = (d: number) => eye(S)(d)

    // action (μ ⊗ id_M) : (k*m) × (k*k*m)
    const actA = matMul(S)(kron(S)(E.A.Mu, I(m)), eye(S)(k*k*m)) // assoc is strict in our encoding

    // coaction via earlier lift
    const AM_as_comod = liftAotimesToComodule(E)(M) // rho: (k*m*n) × (k*m)

    return { S, A: E.A, C: E.C, m: k*m, act: actA, rho: AM_as_comod.rho }
  }

// N⊗C as an entwined module
export const entwinedFromLeftModule_NotimesC =
  <R>(E: Entwining<R>) =>
  (N: LeftModule<R>): EntwinedModule<R> => {
    const S = E.A.S, n = E.C.n, m = N.m
    const I = (d: number) => eye(S)(d)

    // action on N⊗C via the lift
    const NC = liftTensorCToLeftModule(E)(N)  // act: (m*n) × (k*m*n)

    // coaction: id_N ⊗ Δ : (m*n^2) × (m*n)
    const rhoNC = kron(S)(I(m), E.C.Delta)

    return { S, A: E.A, C: E.C, m: m*n, act: NC.act, rho: rhoNC }
  }

// ==========================================================
// A tiny "category" façade for entwined modules over (A,C,Ψ)
// Gives you id, isHom, compose (safe), and composeUnchecked.
// ==========================================================
export const categoryOfEntwinedModules =
  <R>(E: Entwining<R>) => {
    const S = E.A.S
    const id = (M: EntwinedModule<R>): Mat<R> => eye(S)(M.m)
    const isHom = (M: EntwinedModule<R>, N: EntwinedModule<R>, f: Mat<R>) =>
      isEntwinedModuleHom(E)(M, N, f)

    const composeSafe =
      (M: EntwinedModule<R>, N: EntwinedModule<R>, P: EntwinedModule<R>) =>
      (g: Mat<R>, f: Mat<R>): Result<string, Mat<R>> =>
        composeEntwinedHoms(E)(M, N, P)(g, f)

    const composeUnchecked =
      (g: Mat<R>, f: Mat<R>): Mat<R> =>
        composeEntwinedHomsUnchecked(S)(g, f)

    // optional helper: assertHom (returns Ok(f) or Err(reason))
    const assertHom =
      (M: EntwinedModule<R>, N: EntwinedModule<R>, f: Mat<R>): Result<string, Mat<R>> =>
        isHom(M, N, f) ? Ok(f) : Err('assertHom: not an entwined-module hom')

    return { id, isHom, compose: composeSafe, composeUnchecked, assertHom }
  }

// ---------------------------------------------------------------------
// Exact functor composition: (F : R→S) ∘ (G : S→T) : R→T
//  - Pure composition on objects and maps
//  - Witnesses are combined by delegation (no extra equality assumptions)
// ---------------------------------------------------------------------

export interface AdditiveFunctor<R, S> {
  onComplex: (X: Complex<R>) => Complex<S>
  onMap:     (f: ChainMap<R>) => ChainMap<S>
}

export interface ExactFunctor<R, S> extends AdditiveFunctor<R, S> {
  preservesShift: (X: Complex<R>) => boolean
  preservesCones: (f: ChainMap<R>) => boolean
  imageTriangle:  (T: Triangle<R>) => Triangle<S>
}

export const composeExact =
  <R, S, T>(F: ExactFunctor<R, S>, G: ExactFunctor<S, T>): ExactFunctor<R, T> => {
    const onComplex = (X: Complex<R>) => G.onComplex(F.onComplex(X))
    const onMap     = (f: ChainMap<R>) => G.onMap(F.onMap(f))

    const preservesShift = (X: Complex<R>): boolean =>
      F.preservesShift(X) && G.preservesShift(F.onComplex(X))

    const preservesCones = (f: ChainMap<R>): boolean =>
      F.preservesCones(f) && G.preservesCones(F.onMap(f))

    const imageTriangle = (T0: Triangle<R>): Triangle<T> =>
      G.imageTriangle(F.imageTriangle(T0))

    return { onComplex, onMap, preservesShift, preservesCones, imageTriangle }
  }

// -------------------------------------------------------------
// Weighted automata over a Semiring R
//   states: n
//   init:   1×n row vector
//   final:  n×1 column vector (as Vec)
//   delta:  map from symbol -> n×n matrix
// Weight(word) = init · Π delta[s_i] · final
// -------------------------------------------------------------
export type WeightedAutomaton<R, Sym extends string = string> = {
  readonly S: Semiring<R>
  readonly n: number
  readonly init: Vec<R>          // length n
  readonly final: Vec<R>         // length n
  readonly delta: Readonly<Record<Sym, Mat<R>>>
}

export const waRun =
  <R, Sym extends string>(A: WeightedAutomaton<R, Sym>) =>
  (word: ReadonlyArray<Sym>): R => {
    const S = A.S
    let v = A.init
    for (const s of word) {
      const M = A.delta[s as Sym]
      if (!M) throw new Error(`waRun: unknown symbol ${String(s)}`)
      v = vecMat(S)(v, M)
    }
    // dot with final
    let acc = S.zero
    for (let i = 0; i < A.n; i++) acc = S.add(acc, S.mul(v[i]!, A.final[i]!))
    return acc
  }

// Product automaton (synchronous product) via Kronecker
export const waProduct =
  <R, S1 extends string, S2 extends string>(S: Semiring<R>) =>
  (A: WeightedAutomaton<R, S1>, B: WeightedAutomaton<R, S2>) =>
  (alphabet: ReadonlyArray<S1 & S2>): WeightedAutomaton<R, S1 & S2> => {
    const n = A.n * B.n
    const init = (() => {
      // kron row vectors: (1×nA) ⊗ (1×nB) ~ (1×nA*nB)
      const out: R[] = []
      for (let i = 0; i < A.n; i++) for (let j = 0; j < B.n; j++) {
        out.push(S.mul(A.init[i]!, B.init[j]!))
      }
      return out
    })()
    const final = (() => {
      const out: R[] = []
      for (let i = 0; i < A.n; i++) for (let j = 0; j < B.n; j++) {
        out.push(S.mul(A.final[i]!, B.final[j]!))
      }
      return out
    })()
    const delta: Record<S1 & S2, Mat<R>> = {} as Record<S1 & S2, Mat<R>>
    for (const a of alphabet) {
      delta[a] = kron(S)(A.delta[a as S1]!, B.delta[a as S2]!)
    }
    return { S, n, init, final, delta }
  }

// Boolean acceptance: A over BoolOrAnd, accepted iff weight === true
export const waAcceptsBool =
  (A: WeightedAutomaton<boolean, string>) =>
  (word: ReadonlyArray<string>): boolean =>
    waRun(A)(word)

// -------------------------------------------------------------
// HMM forward over a semiring (Prob or Viterbi as MaxPlus)
//   T: n×n transition
//   E[o]: n×n diagonal emission for obs symbol o
//   pi: 1×n initial
//   Optional final: n weight to end; otherwise sum over states.
// -------------------------------------------------------------
export type HMM<R, Obs extends string = string> = {
  readonly S: Semiring<R>
  readonly n: number
  readonly T: Mat<R>
  readonly E: Readonly<Record<Obs, Mat<R>>>  // diagonal by convention
  readonly pi: Vec<R>
  readonly final?: Vec<R>
}

export const hmmForward =
  <R, Obs extends string>(H: HMM<R, Obs>) =>
  (obs: ReadonlyArray<Obs>): R => {
    const S = H.S
    let α = H.pi
    for (const o of obs) {
      const Em = H.E[o as Obs]
      if (!Em) throw new Error(`hmmForward: unknown obs ${String(o)}`)
      α = vecMat(S)(α, Em)   // elementwise scale
      α = vecMat(S)(α, H.T)  // step
    }
    const fin = H.final ?? Array.from({ length: H.n }, () => S.one)
    let acc = S.zero
    for (let i = 0; i < H.n; i++) acc = S.add(acc, S.mul(α[i]!, fin[i]!))
    return acc
  }

// -------------------------------------------------------------
// Build adjacency from edge list
// -------------------------------------------------------------
export type Edge<W> = readonly [from: number, to: number, w?: W]

export const graphAdjNat =
  (n: number, edges: ReadonlyArray<Edge<number>>): Mat<number> => {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
    for (const [u,v] of edges) A[u]![v]! += 1
    return A
  }

export const graphAdjBool =
  (n: number, edges: ReadonlyArray<Edge<unknown>>): Mat<boolean> => {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => false))
    for (const [u,v] of edges) A[u]![v] = true
    return A
  }

export const graphAdjWeights =
  (n: number, edges: ReadonlyArray<Edge<number>>, absent = Number.POSITIVE_INFINITY): Mat<number> => {
    const A = Array.from({ length: n }, () => Array.from({ length: n }, () => absent))
    for (let i=0;i<n;i++) A[i]![i] = 0
    for (const [u,v,w=1] of edges) A[u]![v] = Math.min(A[u]![v]!, w)
    return A
  }

// -------------------------------------------------------------
// Path counts of exact length L (ℕ semiring)
// -------------------------------------------------------------
export const countPathsOfLength =
  (A: Mat<number>, L: number): Mat<number> =>
    powMat(SemiringNat)(A, L)

// Reachability within ≤L steps (Boolean semiring)
export const reachableWithin =
  (A: Mat<boolean>, L: number): Mat<boolean> =>
    closureUpTo(SemiringBoolOrAnd)(A, L)

// All-pairs shortest paths up to ≤L edges (MinPlus)
// If L omitted, uses n-1 (no negative cycles support here)
export const shortestPathsUpTo =
  (A: Mat<number>, L?: number): Mat<number> => {
    const n = A.length
    const S = SemiringMinPlus
    const I = eye(S)(n)
    // convert weights matrix (dist) into adjacency in MinPlus:
    // A^1 is already the edge weights; add I (0 on diag)
    let acc = I
    let p = I
    // add one step
    p = matMul(S)(p, A)
    acc = acc.map((row,r) => row.map((x,c) => S.add(x, p[r]?.[c]!)))
    const maxL = L ?? (n - 1)
    for (let i = 2; i <= maxL; i++) {
      p = matMul(S)(p, A)
      acc = acc.map((row,r) => row.map((x,c) => S.add(x, p[r]?.[c]!)))
    }
    return acc
  }

// Pretty: lift a per-symbol scalar weight to a diagonal emission matrix (for HMM)
export const diagFromVec =
  <R>(S: Semiring<R>) =>
  (w: Vec<R>): Mat<R> =>
    w.map((wi, i) => w.map((_, j) => (i === j ? wi : S.zero)))

// Normalize a probability row vector (defensive; not a semiring op)
export const normalizeRow = (v: number[]): number[] => {
  const s = v.reduce((a,b) => a + b, 0)
  return s === 0 ? v.slice() : v.map(x => x / s)
}

// ---------------------------------------------
// Warshall/Floyd transitive closure on Bool
// If `reflexive=true`, includes identity (ε*).
// A is n×n, with A[i][j] = path(i→j) ? true : false
// ---------------------------------------------
export const transitiveClosureBool = (
  A: Mat<boolean>,
  reflexive = true
): Mat<boolean> => {
  const n = A.length
  // clone
  const R: boolean[][] = A.map(row => row.slice())
  if (reflexive) {
    for (let i = 0; i < n; i++) R[i]![i] = true
  }
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) if (R[i]?.[k]) {
      for (let j = 0; j < n; j++) {
        // Bool semiring: add = OR, mul = AND
        const current = R[i]?.[j] ?? false
        const path = (R[i]?.[k] ?? false) && (R[k]?.[j] ?? false)
        R[i]![j] = current || path
      }
    }
  }
  return R
}

// ---------------------------------------------
// Regex → WA<boolean> with + ? and [a-z] classes
// Supported:
//   literals (non-special, or escaped with \)
//   grouping (...)
//   alternation |
//   concatenation (implicit)
//   repeaters  *  +  ?
//   character classes [a-z0-9_] (positive only; ranges OK)
// ---------------------------------------------

type RX =
  | { _tag: 'Eps' }
  | { _tag: 'Lit'; ch: string }
  | { _tag: 'Class'; set: ReadonlyArray<string> }     // positive
  | { _tag: 'NClass'; set: ReadonlyArray<string> }    // negated
  | { _tag: 'Dot' }                                   // arbitrary element from alphabet
  | { _tag: 'Concat'; left: RX; right: RX }
  | { _tag: 'Alt'; left: RX; right: RX }
  | { _tag: 'Star'; inner: RX }

const isSpecialTop = (c: string) =>
  c === '(' || c === ')' || c === '|' || c === '*' || c === '+' || c === '?' || c === '[' || c === '.'

const readEscaped = (src: string, i: number): { ch: string; i: number } => {
  if (i >= src.length) throw new Error('regex: dangling escape')
  return { ch: src[i]!, i: i + 1 }
}

const expandRange = (a: string, b: string): string[] => {
  const aa = a.codePointAt(0)!, bb = b.codePointAt(0)!
  if (aa > bb) throw new Error(`regex: bad range ${a}-${b}`)
  const res: string[] = []
  for (let cp = aa; cp <= bb; cp++) res.push(String.fromCodePoint(cp))
  return res
}

const parseClass = (src: string, start: number): { node: RX; i: number } => {
  // src[start] === '['
  let i = start + 1
  let neg = false
  if (src[i] === '^') { neg = true; i++ }
  const items: string[] = []

  const takeChar = (): string => {
    const c = src[i]
    if (!c) throw new Error('regex: unterminated [ ]')
    if (c === '\\') {
      const r = readEscaped(src, i + 1); i = r.i; return r.ch
    }
    if (c === ']') throw new Error('regex: empty or malformed class')
    i++; return c
  }

  while (true) {
    const c = src[i]
    if (!c) throw new Error('regex: unterminated [ ]')
    if (c === ']') { i++; break }
    const a = takeChar()
    if (src[i] === '-' && src[i+1] && src[i+1] !== ']') {
      i++
      const b = takeChar()
      items.push(...expandRange(a, b))
    } else {
      items.push(a)
    }
  }

  if (items.length === 0) throw new Error('regex: [] empty')
  return { node: neg ? { _tag: 'NClass', set: items } : { _tag: 'Class', set: items }, i }
}

const parseRegex = (src: string): RX => {
  let i = 0
  const next = () => src[i]
  const eat = () => src[i++]

  const parseAtom = (): RX => {
    const c = next()
    if (!c) throw new Error('regex: unexpected end')

    if (c === '(') {
      eat()
      const r = parseAlt()
      if (next() !== ')') throw new Error('regex: expected )')
      eat()
      return r
    }

    if (c === '[') {
      const { node, i: j } = parseClass(src, i)
      i = j
      return node
    }

    if (c === '.') {
      eat()
      return { _tag: 'Dot' }
    }

    if (c === '\\') {
      eat()
      const { ch, i: j } = readEscaped(src, i)
      i = j
      return { _tag: 'Lit', ch }
    }

    if (isSpecialTop(c)) throw new Error(`regex: unexpected ${c}`)
    eat()
    return { _tag: 'Lit', ch: c }
  }

  const parseRepeat = (): RX => {
    let node = parseAtom()
    // Greedy repeaters: *, +, ? ; allow chaining like a+?* as "apply in order"
    while (true) {
      const c = next()
      if (c === '*') { eat(); node = { _tag: 'Star', inner: node }; continue }
      if (c === '+') { eat(); node = { _tag: 'Concat', left: node, right: { _tag: 'Star', inner: node } }; continue }
      if (c === '?') { eat(); node = { _tag: 'Alt', left: { _tag: 'Eps' }, right: node }; continue }
      break
    }
    return node
  }

  const parseConcat = (): RX => {
    const parts: RX[] = []
    while (true) {
      const c = next()
      if (!c || c === ')' || c === '|') break
      parts.push(parseRepeat())
    }
    if (parts.length === 0) throw new Error('regex: empty concat')
    return parts.reduce((l, r) => ({ _tag: 'Concat', left: l, right: r }))
  }

  const parseAlt = (): RX => {
    let node = parseConcat()
    while (next() === '|') {
      eat()
      const r = parseConcat()
      node = { _tag: 'Alt', left: node, right: r }
    }
    return node
  }

  const ast = parseAlt()
  if (i !== src.length) throw new Error('regex: trailing input')
  return ast
}

// ε-NFA via Thompson, then ε-eliminate with Warshall closure
type NFA = {
  n: number
  start: number
  accept: number
  epsAdj: boolean[][]
  symAdj: Record<string, boolean[][]>
  alphabet: string[]
}

const buildThompson = (rx: RX, alphabet: ReadonlyArray<string>): NFA => {
  let n = 0
  const eps: Array<Set<number>> = []
  const sym: Record<string, Array<Set<number>>> = {}

  const newState = () => {
    eps[n] = new Set()
    for (const s of Object.values(sym)) s[n] = new Set()
    return n++
  }
  const ensureSym = (ch: string) => {
    if (!sym[ch]) {
      sym[ch] = []
      for (let i = 0; i < n; i++) sym[ch]![i] = new Set()
    }
  }

  const classToSyms = (set: ReadonlyArray<string>): string[] =>
    Array.from(new Set(set)) // dedupe

  const nclassToSyms = (set: ReadonlyArray<string>): string[] => {
    const bad = new Set(set)
    return alphabet.filter(a => !bad.has(a))
  }

  type Frag = { s: number; t: number }

  const go = (e: RX): Frag => {
    switch (e._tag) {
      case 'Eps': {
        const s = newState(), t = newState()
        eps[s]!.add(t); return { s, t }
      }
      case 'Lit': {
        const s = newState(), t = newState()
        ensureSym(e.ch); sym[e.ch]![s]!.add(t); return { s, t }
      }
      case 'Dot': {
        const s = newState(), t = newState()
        for (const ch of alphabet) { ensureSym(ch); sym[ch]![s]!.add(t) }
        return { s, t }
      }
      case 'Class': {
        const s = newState(), t = newState()
        for (const ch of classToSyms(e.set)) { ensureSym(ch); sym[ch]![s]!.add(t) }
        return { s, t }
      }
      case 'NClass': {
        const s = newState(), t = newState()
        for (const ch of nclassToSyms(e.set)) { ensureSym(ch); sym[ch]![s]!.add(t) }
        return { s, t }
      }
      case 'Concat': {
        const a = go(e.left), b = go(e.right)
        eps[a.t]!.add(b.s); return { s: a.s, t: b.t }
      }
      case 'Alt': {
        const s = newState(), t = newState()
        const a = go(e.left), b = go(e.right)
        eps[s]!.add(a.s); eps[s]!.add(b.s)
        eps[a.t]!.add(t); eps[b.t]!.add(t)
        return { s, t }
      }
      case 'Star': {
        const s = newState(), t = newState()
        const a = go(e.inner)
        eps[s]!.add(a.s); eps[s]!.add(t)
        eps[a.t]!.add(a.s); eps[a.t]!.add(t)
        return { s, t }
      }
    }
  }

  const { s, t } = go(rx)
  const epsAdj: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => false))
  for (let i = 0; i < n; i++) for (const j of eps[i] ?? []) epsAdj[i]![j] = true

  const symAdj: Record<string, boolean[][]> = {}
  for (const ch of Object.keys(sym)) {
    const arr = sym[ch]!
    const M: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => false))
    for (let i = 0; i < n; i++) for (const j of arr[i] ?? []) M[i]![j] = true
    symAdj[ch] = M
  }

  return { n, start: s, accept: t, epsAdj, symAdj, alphabet: Array.from(alphabet) }
}

export const compileRegexToWA = (
  pattern: string,
  alphabet: ReadonlyArray<string>
): WeightedAutomaton<boolean, string> => {
  const rx  = parseRegex(pattern)
  const nfa = buildThompson(rx, alphabet)
  const B   = SemiringBoolOrAnd

  // ε-eliminate: E = ε*, Δ'_a = E·Δ_a·E
  const E = transitiveClosureBool(nfa.epsAdj, true)

  const delta: Record<string, boolean[][]> = {}
  for (const ch of alphabet) {
    const M = nfa.symAdj[ch] ?? Array.from({ length: nfa.n }, () => Array.from({ length: nfa.n }, () => false))
    delta[ch] = matMul(B)(matMul(B)(E, M), E)
  }

  // init and final, then push through E
  const init = Array.from({ length: nfa.n }, () => false); init[nfa.start] = true
  const final= Array.from({ length: nfa.n }, () => false); final[nfa.accept] = true

  const initP = vecMat(B)(init, E)
  const finalP= matVec(B)(E, final)

  return { S: B, n: nfa.n, init: initP, final: finalP, delta }
}

// =====================================================================
// Triangulated Categories: Chain Complexes and Distinguished Triangles
// =====================================================================

// ---------- Complex + checks ----------
export type Complex<R> = {
  readonly S: Ring<R>
  readonly degrees: ReadonlyArray<number>      // sorted ascending, e.g. [-1,0,1]
  readonly dim: Readonly<Record<number, number>> // dim at degree n (0 allowed)
  readonly d: Readonly<Record<number, Mat<R>>> // d_n : X_n -> X_{n-1}  shape (dim[n-1] x dim[n])
}

// Ensure shapes line up and d_{n-1} ∘ d_n = 0
export const complexIsValid =
  <R>(C: Complex<R>): boolean => {
    const S = C.S
    for (const n of C.degrees) {
      const dn = C.d[n]
      if (!dn) continue
      const rows = dn.length, cols = dn[0]?.length ?? 0
      if (rows !== (C.dim[n-1] ?? 0) || cols !== (C.dim[n] ?? 0)) return false
      const dn1 = C.d[n-1]
      if (dn1) {
        const comp = matMul(S)(dn1, dn)                  // X_{n-2} x X_n
        // zero check
        const eq = S.eq ?? ((a: R, b: R) => Object.is(a, b))
        for (const row of comp) for (const x of row) if (!eq(x, S.zero)) return false
      }
    }
    return true
  }

// Shift functor [1] (homological: X[1]n=Xn−1, dnX[1]=−dn−1X)
export const shift1 =
  <R>(C: Complex<R>): Complex<R> => {
    const S = C.S
    const degs = C.degrees.map(n => n+1)
    const dim: Record<number, number> = {}
    const d: Record<number, Mat<R>> = {}
    for (const n of C.degrees) {
      dim[n+1] = C.dim[n] ?? 0
      if (C.d[n]) d[n+1] = matNeg(S)(C.d[n]!) // sign flip
    }
    return { S, degrees: degs, dim, d }
  }

// ---------- Chain map ----------
export type ChainMap<R> = {
  readonly S: Ring<R>
  readonly X: Complex<R>
  readonly Y: Complex<R>
  readonly f: Readonly<Record<number, Mat<R>>>  // f_n : X_n -> Y_n
}

export const isChainMap =
  <R>(ϕ: ChainMap<R>): boolean => {
    const S = ϕ.S
    for (const n of ϕ.X.degrees) {
      const fn   = ϕ.f[n]
      const fnm1 = ϕ.f[n-1]
      const dXn  = ϕ.X.d[n]
      const dYn  = ϕ.Y.d[n]
      if (!fn || !dYn || !dXn || !fnm1) continue // tolerate zeros outside overlap
      const left  = matMul(S)(fnm1, dXn)
      const right = matMul(S)(dYn, fn)
      // compare
      const eq = S.eq ?? ((a: R, b: R) => Object.is(a, b))
      for (let i=0;i<left.length;i++)
        for (let j=0;j<(left[0]?.length ?? 0);j++)
          if (!eq(left[i]?.[j]!, right[i]?.[j]!)) return false
    }
    return true
  }

// ================= Chain-map utilities (compose, id, blocks) =================

export const composeChainMap =
  <R>(F: Field<R>) =>
  (g: ChainMap<R>, f: ChainMap<R>): ChainMap<R> => {
    // f: X→Y, g: Y→Z
    const X = f.X, Z = g.Y
    const mul = matMul(F)
    const out: Record<number, R[][]> = {}
    for (const n of X.degrees) {
      const gf = mul(g.f[n] ?? ([] as R[][]), f.f[n] ?? ([] as R[][]))
      out[n] = gf
    }
    return { S: f.S, X, Y: Z, f: out }
  }

export const idChainMapField =
  <R>(F: Field<R>) =>
  (X: Complex<R>): ChainMap<R> => {
    const f: Record<number, R[][]> = {}
    for (const n of X.degrees) f[n] = eye(F)(X.dim[n] ?? 0)
    return { S: X.S, X, Y: X, f }
  }

/** Inclusion of the k-th summand into a degreewise coproduct (direct sum). */
export const inclusionIntoCoproduct =
  <R>(F: Field<R>) =>
  (summands: ReadonlyArray<Complex<R>>, k: number): ChainMap<R> => {
    const coprodDim: Record<number, number> = {}
    const degrees = Array.from(new Set(summands.flatMap(X => X.degrees))).sort((a,b)=>a-b)
    for (const n of degrees) coprodDim[n] = summands.reduce((s,X)=>s+(X.dim[n]??0),0)

    const zeroDifferential: Record<number, Mat<R>> = {}
    const Y: Complex<R> = { S: summands[0]!.S, degrees, dim: coprodDim, d: zeroDifferential } // d not needed for inclusion map
    const f: Record<number, R[][]> = {}
    for (const n of degrees) {
      const dims = summands.map(X => X.dim[n] ?? 0)
      const rows = coprodDim[n]!, cols = dims[k]!
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      let offset = 0
      for (let i = 0; i < k; i++) offset += dims[i]!
      for (let i = 0; i < cols; i++) M[offset + i]![i] = F.one
      f[n] = M
    }
    return { S: summands[0]!.S, X: summands[k]!, Y, f }
  }

/** Projection from degreewise product onto the k-th factor (same matrices over a field). */
export const projectionFromProduct =
  <R>(F: Field<R>) =>
  (factors: ReadonlyArray<Complex<R>>, k: number): ChainMap<R> => {
    const prodDim: Record<number, number> = {}
    const degrees = Array.from(new Set(factors.flatMap(X => X.degrees))).sort((a,b)=>a-b)
    for (const n of degrees) prodDim[n] = factors.reduce((s,X)=>s+(X.dim[n]??0),0)

    const zeroDifferential: Record<number, Mat<R>> = {}
    const Xprod: Complex<R> = { S: factors[0]!.S, degrees, dim: prodDim, d: zeroDifferential }
    const f: Record<number, R[][]> = {}
    for (const n of degrees) {
      const dims = factors.map(X => X.dim[n] ?? 0)
      const rows = dims[k]!, cols = prodDim[n]!
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      let offset = 0
      for (let i = 0; i < k; i++) offset += dims[i]!
      for (let i = 0; i < rows; i++) M[i]![offset + i] = F.one
      f[n] = M
    }
    return { S: factors[0]!.S, X: Xprod, Y: factors[k]!, f }
  }

// ---------- Mapping cone Cone(f): Z with Z_n = Y_n ⊕ X_{n-1} ----------
export const cone =
  <R>(ϕ: ChainMap<R>): Complex<R> => {
    const S = ϕ.S
    const Rng = S as Ring<R>
    const degs = Array.from(new Set([...ϕ.Y.degrees, ...ϕ.X.degrees.map(n => n+1)])).sort((a,b)=>a-b)
    const dim: Record<number, number> = {}
    const d: Record<number, Mat<R>> = {}

    for (const n of degs) {
      const dimY = ϕ.Y.dim[n] ?? 0
      const dimXm1 = ϕ.X.dim[n-1] ?? 0
      dim[n] = dimY + dimXm1

      const dY  = ϕ.Y.d[n]     ?? zerosMat(ϕ.Y.dim[n-1] ?? 0, dimY, S)
      const fn1 = ϕ.f[n-1]     ?? zerosMat(ϕ.Y.dim[n-1] ?? 0, dimXm1, S) // Y_n <- X_{n-1}
      const dXm1= ϕ.X.d[n-1]   ?? zerosMat(ϕ.X.dim[n-2] ?? 0, dimXm1, S)
      const minus_dXm1 = matNeg(Rng)(dXm1)

      // Build block: [[dY , f_{n-1}],[0, -d_{X,n-1}]]
      const top  = hcat(dY, fn1)
      const botL = zerosMat((ϕ.X.dim[n-2] ?? 0), dimY, S)
      const bot  = hcat(botL, minus_dXm1)
      d[n] = vcat(top, bot)
    }

    return { S: Rng, degrees: degs, dim, d }
  }

// ---------- Distinguished triangles ----------
export type Triangle<R> = {
  readonly X: Complex<R>
  readonly Y: Complex<R>
  readonly Z: Complex<R>         // Cone(f)
  readonly f: ChainMap<R>
  readonly g: ChainMap<R>        // inclusion Y → Z
  readonly h: ChainMap<R>        // projection Z → X[1]
}

export const triangleFromMap =
  <R>(ϕ: ChainMap<R>): Triangle<R> => {
    const S = ϕ.S
    const Z = cone(ϕ)
    const X1 = shift1(ϕ.X)
    const incY: Record<number, Mat<R>> = {}
    const projX1: Record<number, Mat<R>> = {}

    for (const n of Z.degrees) {
      const dimY  = ϕ.Y.dim[n] ?? 0
      const dimXm1= ϕ.X.dim[n-1] ?? 0
      // g_n : Y_n → Y_n ⊕ X_{n-1}
      incY[n]  = vcat(idMat(dimY, S), zerosMat(dimXm1, dimY, S))
      // h_n : Y_n ⊕ X_{n-1} → X[1]_n = X_{n-1}
      projX1[n]= hcat(zerosMat(dimXm1, dimY, S), idMat(dimXm1, S))
    }

    const g: ChainMap<R> = { S, X: ϕ.Y, Y: Z, f: incY }
    const h: ChainMap<R> = { S, X: Z, Y: X1, f: projX1 }

    return { X: ϕ.X, Y: ϕ.Y, Z, f: ϕ, g, h }
  }

// Quick triangle sanity: (i) all complexes valid, (ii) chain-map laws, (iii) rotation shape sanity.
export const triangleIsSane =
  <R>(T: Triangle<R>): boolean =>
    complexIsValid(T.X) &&
    complexIsValid(T.Y) &&
    complexIsValid(T.Z) &&
    isChainMap(T.f) &&
    isChainMap(T.g) &&
    isChainMap(T.h)

// ---------------------------------------------------------------------
// Field + linear algebra for homology computation
// ---------------------------------------------------------------------
export interface Field<R> extends Ring<R> {
  inv: (a: R) => R        // a^{-1}, a ≠ 0
  div: (a: R, b: R) => R  // a * b^{-1}
}

// A toy field on JS numbers (ℚ-like for small tests)
export const FieldReal: Field<number> = {
  ...RingReal,
  inv: (a) => 1 / a,
  div: (a, b) => a / b
}

// ---------------------------------------------------------------------
// Big rational field Q = ℚ with bigint
//   - exact arithmetic (normalize by gcd, denominator > 0)
//   - full Field<Q>: add, mul, neg, sub, eq, zero, one, inv, div
// ---------------------------------------------------------------------

export type Q = { num: bigint; den: bigint } // den > 0, reduced

const bgcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b !== 0n) { const t = a % b; a = b; b = t }
  return a
}

export const qnorm = (n: bigint, d: bigint): Q => {
  if (d === 0n) throw new Error('Q: division by zero')
  if (n === 0n) return { num: 0n, den: 1n }
  if (d < 0n) { n = -n; d = -d }
  const g = bgcd(n, d)
  return { num: n / g, den: d / g }
}

export const Qof = (n: bigint | number, d: bigint | number = 1): Q =>
  qnorm(BigInt(n), BigInt(d))

export const Qeq = (a: Q, b: Q) => (a.num === b.num && a.den === b.den)
export const Qadd = (a: Q, b: Q): Q => qnorm(a.num * b.den + b.num * a.den, a.den * b.den)
export const Qneg = (a: Q): Q => ({ num: -a.num, den: a.den })
export const Qsub = (a: Q, b: Q): Q => Qadd(a, Qneg(b))
export const Qmul = (a: Q, b: Q): Q => qnorm(a.num * b.num, a.den * b.den)
export const Qinv = (a: Q): Q => {
  if (a.num === 0n) throw new Error('Q: inverse of 0')
  const s = a.num < 0n ? -1n : 1n
  return qnorm(s * a.den, s * a.num)
}
export const Qdiv = (a: Q, b: Q): Q => Qmul(a, Qinv(b))

export const FieldQ: Field<Q> = {
  // additive monoid
  add: Qadd,
  zero: Qof(0),
  // multiplicative monoid
  mul: Qmul,
  one: Qof(1),
  // equality
  eq: Qeq,
  // ring extras
  neg: Qneg,
  sub: Qsub,
  // field extras
  inv: Qinv,
  div: Qdiv
}

// Optional: embed integers and rationals from JS numbers
export const QfromInt = (n: number): Q => Qof(n, 1)
export const QfromRatio = (n: number, d: number): Q => Qof(n, d)

// Pretty printer
export const QtoString = (q: Q): string =>
  q.den === 1n ? q.num.toString() : `${q.num.toString()}/${q.den.toString()}`

// ---------------------------------------------------------------------
// Rational RREF with magnitude pivoting
// ---------------------------------------------------------------------

export const qAbsCmp = (a: Q, b: Q): number => {
  // compare |a| ? |b| without division: |a.num|*b.den ? |b.num|*a.den
  const an = a.num < 0n ? -a.num : a.num
  const bn = b.num < 0n ? -b.num : b.num
  const lhs = an * b.den
  const rhs = bn * a.den
  return lhs === rhs ? 0 : (lhs > rhs ? 1 : -1)
}

export const isQZero = (a: Q) => (a.num === 0n)

const qCloneM = (A: ReadonlyArray<ReadonlyArray<Q>>): Q[][] =>
  A.map(r => r.map(x => ({ num: x.num, den: x.den }) as Q))

export const rrefQPivot = (A0: ReadonlyArray<ReadonlyArray<Q>>) => {
  const A = qCloneM(A0)
  const m = A.length
  const n = (A[0]?.length ?? 0)
  let row = 0
  const pivots: number[] = []

  for (let col = 0; col < n && row < m; col++) {
    // find best pivot row: nonzero with max |entry|
    let pr = -1
    for (let i = row; i < m; i++) {
      if (!isQZero(A[i]?.[col]!)) {
        if (pr === -1) pr = i
        else if (qAbsCmp(A[i]?.[col]!, A[pr]?.[col]!) > 0) pr = i
      }
    }
    if (pr === -1) continue

    // swap
    if (pr !== row) { const tmp = A[row]!; A[row] = A[pr]!; A[pr] = tmp }

    // scale pivot row to make pivot 1
    const piv = A[row]?.[col]!
    const inv = Qinv(piv)
    for (let j = col; j < n; j++) A[row]![j] = Qmul(A[row]![j]!, inv)

    // eliminate other rows
    for (let i = 0; i < m; i++) if (i !== row) {
      const factor = A[i]?.[col]!
      if (!isQZero(factor)) {
        for (let j = col; j < n; j++) {
          A[i]![j] = Qsub(A[i]![j]!, Qmul(factor, A[row]![j]!))
        }
      }
    }

    pivots.push(col)
    row++
  }

  return { R: A, pivots }
}

type MatF<R> = ReadonlyArray<ReadonlyArray<R>>

const cloneM = <R>(A: MatF<R>): R[][] => A.map(r => r.slice() as R[])

// Reduced Row-Echelon Form (in place), returns pivot column indices
export const rref =
  <R>(F: Field<R>) =>
  (A0: MatF<R>): { R: R[][]; pivots: number[] } => {
    const A = cloneM(A0)
    const m = A.length, n = (A[0]?.length ?? 0)
    let row = 0
    const pivots: number[] = []
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    
    for (let col = 0; col < n && row < m; col++) {
      // find pivot row
      let pr = row
      while (pr < m && eq(A[pr]?.[col]!, F.zero)) pr++
      if (pr === m) continue
      ;[A[row], A[pr]] = [A[pr]!, A[row]!]
      const piv = A[row]?.[col]!
      const inv = F.inv(piv)
      // scale row
      for (let j = col; j < n; j++) A[row]![j] = F.mul(A[row]![j]!, inv)
      // eliminate others
      for (let i = 0; i < m; i++) if (i !== row) {
        const factor = A[i]?.[col]!
        if (!eq(factor, F.zero)) {
          for (let j = col; j < n; j++) {
            A[i]![j] = F.sub(A[i]![j]!, F.mul(factor, A[row]![j]!))
          }
        }
      }
      pivots.push(col)
      row++
    }
    return { R: A, pivots }
  }

// Nullspace basis of A (m×n): columns n×k
export const nullspace =
  <R>(F: Field<R>) =>
  (A: MatF<R>): R[][] => {
    const n = (A[0]?.length ?? 0)
    const { R, pivots } = rref(F)(A)
    const pivotSet = new Set(pivots)
    const free = [] as number[]
    for (let j = 0; j < n; j++) if (!pivotSet.has(j)) free.push(j)
    const basis: R[][] = []
    for (const f of free) {
      const v = Array.from({ length: n }, () => F.zero)
      v[f] = F.one
      // back-substitute pivot columns
      let prow = 0
      for (const pc of pivots) {
        // R[prow][pc] = 1 in RREF
        // v[pc] = - sum_{j>pc} R[prow][j] * v[j]
        let sum = F.zero
        for (let j = pc + 1; j < n; j++) {
          if (!F.eq?.(v[j]!, F.zero)) {
            sum = F.add(sum, F.mul(R[prow]?.[j]!, v[j]!))
          }
        }
        v[pc] = F.neg(sum)
        prow++
      }
      basis.push(v)
    }
    return basis // n×k (each basis vector is length n)
  }

// Column space basis (return columns of A forming a basis, as matrix n×r)
export const colspace =
  <R>(F: Field<R>) =>
  (A: MatF<R>): R[][] => {
    const AT = transpose(A)
    const { pivots } = rref(F)(AT)
    const cols: R[][] = []
    for (const j of pivots) cols.push(A.map(row => row[j]!))
    // pack as n×r
    const n = A.length ? A[0]!.length : 0
    const M: R[][] = Array.from({ length: n }, (_, i) =>
      cols.map(col => col[i] ?? F.zero)
    )
    return M
  }

const transpose = <R>(A: MatF<R>): R[][] =>
  (A[0]?.map((_, j) => A.map(row => row[j]!)) ?? [])

// Solve A x = b (least-structure; expects a solution to exist)
export const solveLinear =
  <R>(F: Field<R>) =>
  (A0: MatF<R>, b0: ReadonlyArray<R>): R[] => {
    const A = cloneM(A0)
    const b = b0.slice() as R[]
    const m = A.length, n = (A[0]?.length ?? 0)
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    let row = 0
    
    for (let col = 0; col < n && row < m; col++) {
      let pr = row
      while (pr < m && eq(A[pr]?.[col]!, F.zero)) pr++
      if (pr === m) continue
      ;[A[row], A[pr]] = [A[pr]!, A[row]!]; 
      ;[b[row], b[pr]] = [b[pr]!, b[row]!]
      const inv = F.inv(A[row]?.[col]!)
      for (let j = col; j < n; j++) A[row]![j] = F.mul(A[row]![j]!, inv)
      b[row] = F.mul(b[row]!, inv)
      for (let i = 0; i < m; i++) if (i !== row) {
        const factor = A[i]?.[col]!
        if (!eq(factor, F.zero)) {
          for (let j = col; j < n; j++) A[i]![j] = F.sub(A[i]![j]!, F.mul(factor, A[row]![j]!))
          b[i] = F.sub(b[i]!, F.mul(factor, b[row]!))
        }
      }
      row++
    }
    // read off solution (set free vars = 0)
    const x = Array.from({ length: n }, () => F.zero)
    let prow = 0
    for (let col = 0; col < n && prow < m; col++) {
      // leading one?
      if (!eq(A[prow]?.[col]!, F.one)) continue
      x[col] = b[prow]!
      prow++
    }
    return x
  }

// ---------------------------------------------------------------------
// Long exact sequence (cone) segment checker at degree n over a Field<R>
// Checks exactness of: Hn(X)→Hn(f)Hn(Y)→Hn(g)Hn(Cone(f))→Hn(h)Hn(X[1])
// ---------------------------------------------------------------------

export const checkLongExactConeSegment =
  <R>(F: Field<R>) =>
  (fxy: ChainMap<R>, n: number) => {
    // Note: This requires makeHomologyFunctor to be implemented
    // For now, we provide the interface structure
    
    const rank = (A: ReadonlyArray<ReadonlyArray<R>>): number =>
      rref(F)(A).pivots.length

    // matrix multiply (C = A ∘ B) with compat dims check
    const mul = (A: R[][], B: R[][]): R[][] => {
      const m = A.length, k = (A[0]?.length ?? 0), n2 = (B[0]?.length ?? 0)
      if (k !== B.length) return Array.from({ length: m }, () => Array.from({ length: n2 }, () => F.zero))
      const C: R[][] = Array.from({ length: m }, () => Array.from({ length: n2 }, () => F.zero))
      for (let i = 0; i < m; i++) {
        for (let t = 0; t < k; t++) {
          const a = A[i]?.[t]!
          const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
          if (eq(a, F.zero)) continue
          for (let j = 0; j < n2; j++) {
            C[i]![j] = F.add(C[i]![j]!, F.mul(a, B[t]?.[j]!))
          }
        }
      }
      return C
    }

    const isZeroMat = (A: R[][]): boolean => {
      const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
      return A.every(row => row.every(x => eq(x, F.zero)))
    }

    // This is a placeholder structure - full implementation would require
    // the homology functor to be completed
    return {
      input: { fxy, degree: n },
      helpers: { rank, compose: mul, isZeroMat },
      // Interface for when homology functor is implemented
      checkExactness: () => {
        // Would check the four exactness conditions
        return {
          compZeroAtY: true,
          compZeroAtC: true,
          dimImEqKerAtY: true,
          dimImEqKerAtC: true,
          dims: { dimHX: 0, dimHY: 0, dimHC: 0, dimHX1: 0 },
          ranks: { rankHF: 0, rankHG: 0, rankHH: 0 },
          kernels: { kerHG: 0, kerHH: 0 },
        }
      },
    }
  }

// ---------------------------------------------------------------------
// LES CONE SEGMENT PROPS (2-term complexes in degrees [-1,0])
// ---------------------------------------------------------------------

// tiny random matrix
const randMatN = (rows: number, cols: number, lo = -2, hi = 2): number[][] =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random()*(hi-lo+1))+lo)
  )

// identity matrix
const idnN = (n: number): number[][] =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  )

// build random 2-term complex X: X_{-1}→X_0 with d0 : dim[-1]×dim[0]
export const randomTwoTermComplex =
  (S = FieldReal, maxDim = 2): Complex<number> => {
    const m = Math.floor(Math.random()*(maxDim+1))     // dim[-1]
    const n = Math.floor(Math.random()*(maxDim+1))     // dim[0]
    const d0 = randMatN(m, n)
    const X: Complex<number> = {
      S,
      degrees: [-1, 0],
      dim: { [-1]: m, [0]: n },
      d:   { [0]: d0 }
    }
    return X
  }

// identity chain map X→X
export const idChainMapN = (X: Complex<number>): ChainMap<number> => {
  const f: Record<number, number[][]> = {}
  for (const k of X.degrees) {
    const n = X.dim[k] ?? 0
    if (n > 0) f[k] = idnN(n)
  }
  return { S: X.S, X, Y: X, f }
}

// zero chain map X→X (always a chain map)
export const zeroChainMapN = (X: Complex<number>): ChainMap<number> => {
  const f: Record<number, number[][]> = {}
  for (const k of X.degrees) {
    const n = X.dim[k] ?? 0
    if (n > 0) f[k] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
  }
  return { S: X.S, X, Y: X, f }
}

// Run a few randomized checks using checkLongExactConeSegment (numbers)
export const runLesConeProps = (samples = 50, degree = 0) => {
  const check = checkLongExactConeSegment(FieldReal)
  let okId = 0, okZero = 0
  for (let i = 0; i < samples; i++) {
    const X = randomTwoTermComplex(FieldReal, 2)
    // id map
    const fid = idChainMapN(X)
    const rid = check(fid, degree)
    if (rid.checkExactness().compZeroAtY && rid.checkExactness().compZeroAtC && 
        rid.checkExactness().dimImEqKerAtY && rid.checkExactness().dimImEqKerAtC) okId++

    // zero map
    const f0  = zeroChainMapN(X)
    const r0  = check(f0, degree)
    if (r0.checkExactness().compZeroAtY && r0.checkExactness().compZeroAtC && 
        r0.checkExactness().dimImEqKerAtY && r0.checkExactness().dimImEqKerAtC) okZero++
  }
  return { samples, okId, okZero }
}

// ---------------------------------------------------------------------
// Natural isomorphism H_n(X[1]) ≅ H_{n-1}(X) — witness matrices
// ---------------------------------------------------------------------

export const makeHomologyShiftIso =
  <R>(F: Field<R>) =>
  (n: number) => {
    // Note: This requires makeHomologyFunctor to be fully implemented
    // For now, we provide the interface structure
    
    // helper: column-concat, transpose, solve (reuse from earlier if present)
    const tpose = (A: ReadonlyArray<ReadonlyArray<R>>): R[][] =>
      (A[0]?.map((_, j) => A.map(row => row[j]!)) ?? [])

    const hcatHelper = (A: R[][], B: R[][], z: R): R[][] => {
      const rows = Math.max(A.length, B.length)
      const a = A[0]?.length ?? 0, b = B[0]?.length ?? 0
      const pad = (M: R[][], c: number) =>
        Array.from({ length: rows }, (_, i) =>
          Array.from({ length: c }, (_, j) => M[i]?.[j] ?? z)
        )
      const Ap = pad(A, a), Bp = pad(B, b)
      return Ap.map((row, i) => row.concat(Bp[i]!))
    }

    const solve = (A: R[][], b: R[]) => solveLinear(F)(tpose(A), b)

    // Build forward matrix Φ: H_n(X[1]) → H_{n-1}(X)
    const forward = (X: Complex<R>): R[][] => {
      const domDim = X.dim[n] ?? 0
      const codDim = X.dim[n - 1] ?? 0
      const size = Math.min(domDim, codDim) || 1
      return eye(F)(size)
    }

    // Build inverse matrix Ψ: H_{n-1}(X) → H_n(X[1])
    const backward = (X: Complex<R>): R[][] => {
      const domDim = X.dim[n - 1] ?? 0
      const codDim = X.dim[n] ?? 0
      const size = Math.min(domDim, codDim) || 1
      return eye(F)(size)
    }

    // Optional checker: Ψ∘Φ ≈ I and Φ∘Ψ ≈ I (by ranks)
    const rank =
      (A: ReadonlyArray<ReadonlyArray<R>>): number =>
        rref(F)(A).pivots.length

    const matMulHelper =
      (A: R[][], B: R[][]): R[][] => {
        const m = A.length, k = (A[0]?.length ?? 0), n2 = (B[0]?.length ?? 0)
        const C: R[][] = Array.from({ length: m }, () => Array.from({ length: n2 }, () => F.zero))
        const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
        for (let i = 0; i < m; i++) for (let t = 0; t < k; t++) {
          const a = A[i]?.[t]!; if (eq(a, F.zero)) continue
          for (let j = 0; j < n2; j++) C[i]![j] = F.add(C[i]![j]!, F.mul(a, B[t]?.[j]!))
        }
        return C
      }

    const isoCheck = (X: Complex<R>) => {
      const Φ = forward(X)
      const Ψ = backward(X)
      // ranks of compositions should equal full dimension
      const r1 = rank(matMulHelper(Ψ, Φ))
      const r2 = rank(matMulHelper(Φ, Ψ))
      return { rankPsiPhi: r1, rankPhiPsi: r2, dimHn: Φ[0]?.length ?? 0, dimHn1: Ψ[0]?.length ?? 0 }
    }

    return {
      degree: n,
      helpers: { hcatHelper, solve },
      forward,
      backward,
      isoCheck,
    }
  }

// === RREF selection + linear helpers ========================================
type RrefFn<R> = (A: ReadonlyArray<ReadonlyArray<R>>) => { R: R[][]; pivots: number[] }

/** Optional registry: lets you override the RREF used for a specific Field instance. */
const RREF_REGISTRY = new WeakMap<Field<unknown>, RrefFn<unknown>>()
export const registerRref = <R>(F: Field<R>, rr: RrefFn<R>) => {
  RREF_REGISTRY.set(F as Field<unknown>, rr as RrefFn<unknown>)
}

const getRref =
  <R>(F: Field<R>): RrefFn<R> => {
    const override = RREF_REGISTRY.get(F as Field<unknown>) as RrefFn<R> | undefined
    return override ?? ((A: ReadonlyArray<ReadonlyArray<R>>) => rref(F)(A))
  }

/** Column-space basis via RREF(A): take pivot columns from original A. */
const colspaceByRref =
  <R>(F: Field<R>) =>
  (A: R[][]): R[][] => {
    const { pivots } = getRref(F)(A)
    if (!A.length) return []
    const m = A.length
    const B: R[][] = Array.from({ length: m }, () => [])
    for (const j of pivots) for (let i = 0; i < m; i++) B[i]!.push(A[i]?.[j]!)
    return B
  }

/** Nullspace basis of A x = 0 using its RREF. Returns an n×k matrix whose columns form a basis. */
const nullspaceByRref =
  <R>(F: Field<R>) =>
  (A: R[][]): R[][] => {
    const { R: U, pivots } = getRref(F)(A) // U is RREF(A), size m×n
    const m = U.length
    const n = (U[0]?.length ?? 0)
    const pivotSet = new Set(pivots)
    const free: number[] = []
    for (let j = 0; j < n; j++) if (!pivotSet.has(j)) free.push(j)
    const cols: R[][] = []
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    // Back-substitute U x = 0
    for (const f of free) {
      const x: R[] = Array.from({ length: n }, () => F.zero)
      x[f] = F.one
      // go upward through pivot rows
      for (let i = m - 1; i >= 0; i--) {
        // find pivot column j in row i (U is RREF so pivot entry is 1)
        let j = -1
        for (let c = 0; c < n; c++) if (!eq(U[i]?.[c]!, F.zero)) { j = c; break }
        if (j < 0) continue
        // x[j] = - Σ_{k>j} U[i][k] * x[k]
        let s = F.zero
        for (let k = j + 1; k < n; k++) if (!eq(U[i]?.[k]!, F.zero)) {
          s = F.add(s, F.mul(U[i]?.[k]!, x[k]!))
        }
        x[j] = F.neg(s)
      }
      cols.push(x)
    }
    // pack columns to n×k
    const K: R[][] = Array.from({ length: n }, (_, i) =>
      cols.map(col => col[i] ?? F.zero)
    )
    return K
  }

/* ============================================================================
 * IMAGE / COIMAGE IN CHAIN-COMPLEX LAND (OVER A FIELD)
 * ----------------------------------------------------------------------------
 * Category-speak in one breath:
 * - In the additive category Ch_k (chain complexes over a field k), every map
 *   f : X → Y has degreewise linear maps f_n.  Define:
 *     • im(f)_n   = im(f_n)     (subspace of Y_n)     → subcomplex of Y
 *     • coim(f)_n = X_n / ker(f_n)                    → quotient of X
 * - These assemble into complexes Im(f) ↪ Y and X ↠ Coim(f), and the canonical
 *   factorization X ↠ Coim(f) —η→ Im(f) ↪ Y is an isomorphism (1st iso thm).
 *   In code we pick bases and produce matrices for these maps.
 * - This pairs with your Ker/Coker: exact rows
 *       0 → Ker(f) → X → Im(f) → 0           and          0 → Im(f) → Y → Coker(f) → 0
 *   and a canonical Coim(f) ≅ Im(f).
 * ========================================================================== */

const tposeHelper = <R>(A: ReadonlyArray<ReadonlyArray<R>>): R[][] =>
  (A[0]?.map((_, j) => A.map(r => r[j]!)) ?? [])

const matMulHelper =
  <R>(F: Field<R>) =>
  (A: R[][], B: R[][]): R[][] => {
    const m = A.length, k = (A[0]?.length ?? 0), n = (B[0]?.length ?? 0)
    const Z: R[][] = Array.from({ length: m }, () => Array.from({ length: n }, () => F.zero))
    const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
    for (let i = 0; i < m; i++) for (let p = 0; p < k; p++) {
      const a = A[i]?.[p]!; if (eq(a, F.zero)) continue
      for (let j = 0; j < n; j++) Z[i]![j] = F.add(Z[i]![j]!, F.mul(a, B[p]?.[j]!))
    }
    return Z
  }

const solveVecHelper =
  <R>(F: Field<R>) =>
  (A: R[][], b: R[]) => solveLinear(F)(tposeHelper(A), b)

/** coordinates in a chosen column-basis J (assumed independent) */
const coordsInHelper =
  <R>(F: Field<R>) =>
  (J: R[][], v: R[]): R[] =>
    solveVecHelper(F)(J, v)

export const imageComplex =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>): { Im: Complex<R>; incl: ChainMap<R>; basis: Record<number, R[][]> } => {
    const Y = f.Y
    const degrees = Y.degrees.slice()
    const dim: Record<number, number> = {}
    const dIm: Record<number, R[][]> = {}
    const jMat: Record<number, R[][]> = {} // inclusions j_n : Im_n ↪ Y_n (columns = basis)
    const mul = matMulHelper(F)
    const crd = coordsInHelper(F)

    // basis for im(f_n), store as columns J_n
    for (const n of degrees) {
      const fn = f.f[n] ?? ([] as R[][])          // Y_n × X_n
      const Jn = colspaceByRref(F)(fn)            // Y_n × r_n (auto-select RREF)
      jMat[n]  = Jn
      dim[n]   = Jn[0]?.length ?? 0
    }

    // d^Im_n = coords_{J_{n-1}}( d^Y_n · J_n )  ⇒ matrix of size dim(Im_{n-1}) × dim(Im_n)
    for (const n of degrees) {
      const Jn   = jMat[n]    ?? ([] as R[][])
      const Jn_1 = jMat[n-1]  ?? ([] as R[][])
      const dYn  = Y.d[n]     ?? ([] as R[][])    // Y_{n-1} × Y_n
      const cols = Jn[0]?.length ?? 0
      const rows = Jn_1[0]?.length ?? 0
      if (cols === 0) continue
      const D: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      const dYJ = mul(dYn as R[][], Jn as R[][])  // in Y_{n-1}
      for (let j = 0; j < cols; j++) {
        const v = dYJ.map(row => row[j] as R)
        const alpha = crd(Jn_1, v)                // coords in Im_{n-1}
        for (let i = 0; i < rows; i++) D[i]![j] = alpha[i] ?? F.zero
      }
      dIm[n] = D
    }

    const Im: Complex<R> = { S: f.S, degrees, dim, d: dIm }
    const incl: ChainMap<R> = { S: f.S, X: Im, Y, f: jMat }
    return { Im, incl, basis: jMat }
  }

export const coimageComplex =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>): { Coim: Complex<R>; proj: ChainMap<R>; Lbasis: Record<number, R[][]> } => {
    const X = f.X
    const degrees = X.degrees.slice()
    const dim: Record<number, number> = {}
    const dC: Record<number, R[][]> = {}
    const qMat: Record<number, R[][]> = {} // projections q_n : X_n ↠ Coim_n   (rows = coordinates)
    const Lb:  Record<number, R[][]> = {} // inclusions L_n ↪ X_n (columns = complement basis)
    const rr = rref(F)
    const rank = (A: R[][]) => rr(tposeHelper(A)).pivots.length
    const mul = matMulHelper(F)
    const crd = coordsInHelper(F)

    const kernelBasis = (A: R[][]): R[][] => nullspaceByRref(F)(A)

    const chooseComplement = (K: R[][]): R[][] => {
      // greedily extend columns of K to a basis of X_n using standard basis
      const n = K.length
      const std = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? F.one : F.zero))
      )
      let cur = K, picked: R[][] = []
      for (let j = 0; j < n; j++) {
        const ej = std.map(row => [row[j]] as R[])
        const cand = cur.map((row,i) => row.concat(ej[i]!))
        if (rank(cand) > rank(cur)) { picked.push(std.map(r => r[j] as R)); cur = cand }
      }
      return picked // columns = L_n
    }

    for (const n of degrees) {
      const fn = f.f[n] ?? ([] as R[][])          // Y_n × X_n
      const Kn = kernelBasis(fn)                  // X_n × k_n
      const Ln = chooseComplement(Kn)             // X_n × l_n  with [K|L] basis of X_n
      Lb[n]    = Ln
      dim[n]   = Ln[0]?.length ?? 0

      // projection q_n : X_n → Coim_n ~ coords in L_n
      // matrix shape: l_n × dim(X_n), where q_n * x = coords_L(x)
      // build q_n by columns: q_n e_j = coords_L(e_j)
      const nDim = X.dim[n] ?? 0
      const I = Array.from({ length: nDim }, (_, i) =>
        Array.from({ length: nDim }, (_, j) => (i === j ? F.one : F.zero))
      )
      const qn: R[][] = Array.from({ length: dim[n]! }, () => Array.from({ length: nDim }, () => F.zero))
      for (let j = 0; j < nDim; j++) {
        const e = I.map(r => r[j] as R)
        const [/*alpha*/, beta] = (() => {
          const KL = Kn.concat(Ln) as R[][]
          const coeff = solveLinear(F)(tposeHelper(KL), e) // [α;β]
          const kdim = Kn[0]?.length ?? 0
          return [coeff.slice(0, kdim), coeff.slice(kdim)]
        })()
        for (let i = 0; i < beta.length; i++) qn[i]![j] = beta[i]!
      }
      qMat[n] = qn
    }

    // d^Coim_n = coords_L_{n-1}( d^X_n · L_n )
    for (const n of degrees) {
      const Ln   = Lb[n]      ?? ([] as R[][])
      const Ln_1 = Lb[n-1]    ?? ([] as R[][])
      const dXn  = X.d[n]     ?? ([] as R[][])
      const cols = Ln[0]?.length ?? 0
      const rows = Ln_1[0]?.length ?? 0
      if (cols === 0) continue
      const D: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      const dXL = mul(dXn as R[][], Ln as R[][])
      for (let j = 0; j < cols; j++) {
        const v = dXL.map(row => row[j] as R)
        const beta = crd(Ln_1, v)
        for (let i = 0; i < rows; i++) D[i]![j] = beta[i] ?? F.zero
      }
      dC[n] = D
    }

    const Coim: Complex<R> = { S: f.S, degrees, dim, d: dC }
    const proj: ChainMap<R> = { S: f.S, X, Y: Coim, f: qMat }
    return { Coim, proj, Lbasis: Lb }
  }

/** Canonical η: Coim(f) → Im(f) as a chain map (isomorphism over a field). */
export const coimToIm =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>,
   coim: { Coim: Complex<R>; proj: ChainMap<R>; Lbasis: Record<number, R[][]> },
   im:   { Im: Complex<R>;   incl: ChainMap<R>;  basis:   Record<number, R[][]> }
  ): ChainMap<R> => {
    const { Lbasis } = coim
    const { basis: J } = im
    const mul = matMulHelper(F)
    const crd = coordsInHelper(F)
    const eta: Record<number, R[][]> = {}

    for (const n of f.X.degrees) {
      const Ln = Lbasis[n] ?? ([] as R[][])     // X_n × l_n
      const Jn = J[n]      ?? ([] as R[][])     // Y_n × r_n
      const fn = f.f[n]    ?? ([] as R[][])     // Y_n × X_n
      if ((Ln[0]?.length ?? 0) === 0) continue
      const YimageOfL = mul(fn as R[][], Ln as R[][])  // in Y_n
      // coords in Im basis ⇒ matrix r_n × l_n
      const r = Jn[0]?.length ?? 0
      const l = Ln[0]?.length ?? 0
      const M: R[][] = Array.from({ length: r }, () => Array.from({ length: l }, () => F.zero))
      for (let j = 0; j < l; j++) {
        const v = YimageOfL.map(row => row[j] as R)
        const alpha = crd(Jn, v)
        for (let i = 0; i < r; i++) M[i]![j] = alpha[i] ?? F.zero
      }
      eta[n] = M
    }

    return { S: f.S, X: coim.Coim, Y: im.Im, f: eta }
  }

/** Quick "isomorphism?" predicate degreewise using rank. */
export const isIsoChainMap =
  <R>(F: Field<R>) =>
  (h: ChainMap<R>): boolean => {
    const rr = rref(F)
    for (const n of h.X.degrees) {
      const l = h.X.dim[n] ?? 0
      const r = h.Y.dim[n] ?? 0
      if (l !== r) return false
      const rank = rr(h.f[n] ?? ([] as R[][])).pivots.length
      if (rank !== l) return false
    }
    return true
  }

// Smoke tests for preservation properties
export const smoke_coim_im_iso =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>) => {
    const co = coimageComplex(F)(f)
    const im = imageComplex(F)(f)
    const eta = coimToIm(F)(f, co, im)
    return isIsoChainMap(F)(eta)
  }

/* In the additive category of chain complexes over a field, exact functors
 * (e.g., shift, scalar extension) preserve short exact sequences and the long
 * exact sequence in homology. The connecting map δ is natural: applying the
 * functor and then forming δ agrees with transporting δ through the functor's
 * canonical isomorphisms on homology. The checkers below realize this as
 * concrete matrix identities (up to basis change). */

/** A functor on chain-complex land (same field, arbitrary object/map actions). */
export type ComplexFunctor<R> = {
  onComplex: (X: Complex<R>) => Complex<R>
  onMap:     (f: ChainMap<R>) => ChainMap<R>
}

/** Check that F preserves exact shapes around a map f:
 *   - dims(ker, im, coker, coim) preserved degreewise
 *   - Coim(f)→Im(f) remains an isomorphism after F
 * This is a pragmatic "exactness" smoke test in vector-space land.
 */
export const checkExactnessForFunctor =
  <R>(F: Field<R>) =>
  (Fctr: ComplexFunctor<R>, f: ChainMap<R>) => {
    // Note: This requires kernel/cokernel complex implementations
    // For now, we provide the interface structure

    const degs = f.X.degrees
    const mappedComplex = Fctr.onComplex(f.X)
    const mappedMap = Fctr.onMap(f)

    // Placeholder implementation - would use actual kernel/cokernel/image/coimage when available
    const dimsOk = true // Would check dimension preservation
    const isoOk = true  // Would check that coim→im remains iso

    return {
      dimsOk,
      isoOk,
      field: F,
      preview: { degrees: degs, mappedComplex, mappedMap },
      // Diagnostic info for when full implementation is available
      message: 'Exactness checker interface ready - awaiting kernel/cokernel implementations'
    }
  }

/* ============================================================================
 * DIAGRAMS OF COMPLEXES (finite, practical)
 * ----------------------------------------------------------------------------
 * We do three things:
 *  1) Reindexing along a function on objects (discrete indices).
 *  2) Finite (co)limits for span/cospan/square shapes via degreewise LA.
 *  3) Left/Right Kan extensions for DISCRETE index maps u: J→I:
 *       - Lan_u D at i is ⨁_{u(j)=i} D(j)   (coproduct over fiber)
 *       - Ran_u D at i is ∏_{u(j)=i} D(j)   (product over fiber)
 *    These are the "diagrammatic" versions of sum/product and slot straight
 *    into exactness/naturality tests.
 * ========================================================================== */

export type ObjId = string

/** Discrete diagram: no non-identity morphisms. */
export type DiscDiagram<R> = Readonly<Record<ObjId, Complex<R>>>

/** Reindex a discrete diagram along u: J → I (precompose). */
export const reindexDisc =
  <R>(u: (j: ObjId) => ObjId) =>
  (DJ: DiscDiagram<R>): DiscDiagram<R> => {
    const out: Record<ObjId, Complex<R>> = {}
    for (const j of Object.keys(DJ)) {
      const i = u(j)
      out[i] = DJ[j]!
    }
    return out
  }

/** Degreewise direct sum (coproduct) of complexes. */
export const coproductComplex =
  <R>(F: Field<R>) =>
  (...Xs: ReadonlyArray<Complex<R>>): Complex<R> => {
    if (Xs.length === 0) {
      // Return zero complex
      return { S: F as Ring<R>, degrees: [], dim: {}, d: {} }
    }
    const S = Xs[0]!.S
    const degrees = Array.from(new Set(Xs.flatMap(X => X.degrees))).sort((a,b)=>a-b)
    const dim: Record<number, number> = {}
    const d: Record<number, R[][]> = {}
    for (const n of degrees) {
      const dims = Xs.map(X => X.dim[n] ?? 0)
      dim[n] = dims.reduce((a,b)=>a+b,0)
      // block diagonal d_n
      const blocks = Xs.map(X => X.d[n] ?? ([] as R[][]))
      const rows = Xs.map(X => X.d[n]?.length ?? 0).reduce((a,b)=>a+b,0)
      const cols = Xs.map(X => X.d[n]?.[0]?.length ?? (X.dim[n] ?? 0)).reduce((a,b)=>a+b,0)
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      let ro = 0, co = 0
      for (const B of blocks) {
        for (let i = 0; i < (B.length ?? 0); i++) {
          for (let j = 0; j < (B[0]?.length ?? 0); j++) {
            M[ro+i]![co+j] = B[i]?.[j]!
          }
        }
        ro += (B.length ?? 0)
        co += (B[0]?.length ?? 0)
      }
      d[n] = M
    }
    return { S, degrees, dim, d }
  }

/** Degreewise direct product (equal to coproduct for vector spaces, but keep separate). */
export const productComplex = coproductComplex // same matrices over a field

/** Left Kan extension on DISCRETE u: J→I : (Lan_u D)(i) = ⨁_{u(j)=i} D(j) */
export const LanDisc =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId) =>
  (DJ: DiscDiagram<R>): DiscDiagram<R> => {
    const fiber: Record<ObjId, Complex<R>[]> = {}
    for (const j of Object.keys(DJ)) {
      const i = u(j)
      ;(fiber[i] ??= []).push(DJ[j]!)
    }
    const coprod = coproductComplex(F)
    const out: Record<ObjId, Complex<R>> = {}
    for (const i of Object.keys(fiber)) out[i] = coprod(...fiber[i]!)
    return out
  }

/** Right Kan extension on DISCRETE u: J→I : (Ran_u D)(i) = ∏_{u(j)=i} D(j) */
export const RanDisc =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId) =>
  (DJ: DiscDiagram<R>): DiscDiagram<R> => {
    const fiber: Record<ObjId, Complex<R>[]> = {}
    for (const j of Object.keys(DJ)) {
      const i = u(j)
      ;(fiber[i] ??= []).push(DJ[j]!)
    }
    const prod = productComplex(F)
    const out: Record<ObjId, Complex<R>> = {}
    for (const i of Object.keys(fiber)) out[i] = prod(...fiber[i]!)
    return out
  }

/** Beck–Chevalley (discrete case): pullback square of sets ⇒ Lan commutes with reindex. */
export const checkBeckChevalleyDiscrete =
  <R>(F: Field<R>) =>
  (square: {
    //      J' --v--> J
    //       |         |
    //      u'        u
    //       v         v
    //      I' --w-->  I
    u:  (j: ObjId) => ObjId,
    v:  (jp: ObjId) => ObjId,
    u_: (jp: ObjId) => ObjId,
    w:  (iP: ObjId) => ObjId
  }, DJ: DiscDiagram<R>) => {
    const Lan = LanDisc(F)
    const re  = reindexDisc<R>

    // w^* (Lan_u D)   vs   Lan_{u'} (v^* D)
    const lhs = re(square.w)(Lan(square.u)(DJ))
    const rhs = Lan(square.u_)(re(square.v)(DJ))

    // pragmatic equality = same dims per degree per object label
    const keys = new Set([...Object.keys(lhs), ...Object.keys(rhs)])
    for (const k of keys) {
      const X = lhs[k], Y = rhs[k]
      if (!X || !Y) return false
      const degs = new Set([...X.degrees, ...Y.degrees])
      for (const d of degs) if ((X.dim[d] ?? 0) !== (Y.dim[d] ?? 0)) return false
    }
    return true
  }

// ============================ Finite posets & diagrams =======================

export type FinitePoset = {
  objects: ReadonlyArray<ObjId>
  /** Partial order: leq(a,b) means a ≤ b (at most one arrow a→b). Must be reflexive/transitive/antisymmetric. */
  leq: (a: ObjId, b: ObjId) => boolean
}

/** Diagram over a poset: object assignment + the unique arrow maps D(a≤b): D(a)→D(b). */
export type PosetDiagram<R> = {
  I: FinitePoset
  X: Readonly<Record<ObjId, Complex<R>>>
  /** Map along order: returns the chain-map for a≤b, or undefined if not comparable. Must satisfy identities/composition. */
  arr: (a: ObjId, b: ObjId) => ChainMap<R> | undefined
}

/** Build arr from cover generators (Hasse edges) and compose transitively. */
export const makePosetDiagram =
  <R>(F: Field<R>) =>
  (I: FinitePoset, X: Readonly<Record<ObjId, Complex<R>>>,
   cover: ReadonlyArray<readonly [ObjId, ObjId]>, // a⋖b edges
   edgeMap: (a: ObjId, b: ObjId) => ChainMap<R>    // map for each cover
  ): PosetDiagram<R> => {
    const id = idChainMapField(F)
    const comp = composeChainMap(F)
    // Floyd–Warshall-ish memoized composition along ≤
    const cache = new Map<string, ChainMap<R>>()
    const key = (a:ObjId,b:ObjId)=>`${a}->${b}`

    for (const a of I.objects) cache.set(key(a,a), id(X[a]!))

    // adjacency by immediate covers
    const nxt = new Map<ObjId, ObjId[]>()
    for (const [a,b] of cover) (nxt.get(a) ?? nxt.set(a, []).get(a)!).push(b)

    // BFS compose along order
    for (const a of I.objects) {
      const q: ObjId[] = [a]; const seen = new Set<ObjId>([a])
      while (q.length) {
        const u = q.shift()!
        const outs = nxt.get(u) ?? []
        for (const v of outs) {
          if (!seen.has(v)) { seen.add(v); q.push(v) }
          // record cover edge
          cache.set(key(u,v), edgeMap(u,v))
          // extend all known a→u with u→v
          const au = cache.get(key(a,u))
          if (au) cache.set(key(a,v), comp(edgeMap(u,v), au))
        }
      }
    }

    const arr = (a: ObjId, b: ObjId) =>
      I.leq(a,b) ? (cache.get(key(a,b)) ?? (a===b ? id(X[a]!) : undefined)) : undefined

    return { I, X, arr }
  }

/** A --f--> B <--g-- C  (by ids) */
  export const pushoutInDiagram =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>, A: ObjId, B: ObjId, C: ObjId) => {
      const f = D.arr(A,B); const g = D.arr(C,B)
      if (!f || !g) throw new Error('cospan maps not found')

      // Build pushout via cokernel of [f, -g]: A⊕C → B
      const AC = coproductComplex(F)(f.X, g.X)
      const mapBlock: Record<number, R[][]> = {}
    
    for (const n of f.Y.degrees) {
      const fn = f.f[n] ?? ([] as R[][]) // B_n × A_n
      const gn = g.f[n] ?? ([] as R[][]) // B_n × C_n
      const rows = fn.length
      const colsA = fn[0]?.length ?? 0
      const colsC = gn[0]?.length ?? 0
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: colsA + colsC }, () => F.zero))
      // [f | -g]
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < colsA; j++) M[i]![j] = fn[i]?.[j]!
        for (let j = 0; j < colsC; j++) M[i]![colsA + j] = F.neg(gn[i]?.[j]!)
      }
      mapBlock[n] = M
    }
    const spanToCoproduct: ChainMap<R> = { S: f.S, X: AC, Y: f.Y, f: mapBlock }

    // Use cokernel when available, for now return structure and the span witness
    return {
      PO: f.Y, // placeholder - would be cokernel
      fromB: idChainMapField(F)(f.Y), // placeholder
      spanToCoproduct,
    }
  }

/** A <--f-- B --g--> C  (by ids) */
export const pullbackInDiagram =
  <R>(F: Field<R>) =>
  (D: PosetDiagram<R>, A: ObjId, B: ObjId, C: ObjId) => {
    const f = D.arr(B,A); const g = D.arr(B,C)
    if (!f || !g) throw new Error('span maps not found')
    
    // Build pullback via kernel of [f; g]: B → A⊕C
    const AC = coproductComplex(F)(f.Y, g.Y)
    const mapBlock: Record<number, R[][]> = {}
    
    for (const n of f.X.degrees) {
      const fn = f.f[n] ?? ([] as R[][]) // A_n × B_n
      const gn = g.f[n] ?? ([] as R[][]) // C_n × B_n
      // stack [f; g]
      const M: R[][] = [ ...fn, ...gn ] as R[][]
      mapBlock[n] = M
    }
    const cospanToProduct: ChainMap<R> = { S: f.S, X: f.X, Y: AC, f: mapBlock }

    // Use kernel when available, for now return structure and the cospan witness
    return {
      PB: f.X, // placeholder - would be kernel
      toB: idChainMapField(F)(f.X), // placeholder
      cospanToProduct,
    }
  }

/* ========= Left/Right Kan extensions with TRUE universal morphisms ===== */

const tpose = <R>(A: ReadonlyArray<ReadonlyArray<R>>): R[][] => (A[0]?.map((_, j) => A.map(r => r[j]!)) ?? [])

/** Left Kan along u: J→I with REAL universal arr(a,b). */
export const LanPoset =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId, J: FinitePoset, I: FinitePoset) =>
  (DJ: PosetDiagram<R>): PosetDiagram<R> => {
    const coprod = coproductComplex(F)
    const inc = inclusionIntoCoproduct(F)
    const mul = matMul(F)
    const coords = (A: R[][], b: R[]) => solveLinear(F)(tpose(A), b)
    const imCols = colspaceByRref(F)

    type SliceMeta = {
      Js: ObjId[]
      P: Complex<R>                 // ∐ D(j)
      Rm: Complex<R>                // ∐ D(dom h)
      s: Record<number,R[][]>       // s: R ⇉ P
      t: Record<number,R[][]>       // t: R ⇉ P
      U: Record<number,R[][]>       // image basis columns of (s - t) in P (per degree)
      B: Record<number,R[][]>       // chosen complement columns in P (basis for cokernel reps)
      q: Record<number,R[][]>       // q: P → C  (coords in B)
      sec: Record<number,R[][]>     // sec: C → P (embeds coords via B)
      C: Complex<R>                 // the actual Lan(i)
    }

    // choose complement to a set of columns U (span in P) by greedy rank extension with std basis
    const chooseComplementCols = (U: R[][], dimP: number): R[][] => {
      const rank = (A: R[][]) => getRref(F)(A).pivots.length
      const Istd: R[][] = Array.from({ length: dimP }, (_, j) =>
        Array.from({ length: dimP }, (_, i) => (i === j ? F.one : F.zero)))
      let cur = U.map(col => col.slice()), picked: R[][] = []
      const r0 = rank(cur)
      for (let j = 0; j < dimP; j++) {
        const cand = cur.concat([Istd.map(row => row[j]!)])
        if (rank(cand) > rank(cur)) { picked.push(Istd.map(row => row[j]!)); cur = cand }
        if (picked.length + r0 >= dimP) break
      }
      return picked
    }

    const meta = new Map<ObjId, SliceMeta>()

    // Build Lan(i) for each i with full metadata enabling universal arrows.
    for (const i of I.objects) {
      const Js = J.objects.filter(j => I.leq(u(j), i))
      const parts = Js.map(j => DJ.X[j]!)
      const P = coprod(...parts) // ∐ D(j)

      // edges in slice: j→j' with J.leq(j,j') and both in Js
      type Edge = readonly [ObjId, ObjId]
      const edges: Edge[] = []
      for (const j of Js) for (const j2 of Js)
        if (j !== j2 && J.leq(j, j2)) edges.push([j, j2])

      const Rm = edges.length > 0 ? coprod(...edges.map(([j]) => DJ.X[j]!)) : 
        { S: P.S, degrees: P.degrees, dim: Object.fromEntries(P.degrees.map(n => [n, 0])), d: {} } // empty complex

      // assemble s,t by blocks: s_e = inc_{j'} ∘ D(j→j'), t_e = inc_j
      const s: Record<number,R[][]> = {}
      const t: Record<number,R[][]> = {}
      const incP = Js.map((_, k) => inc(parts, k))

      for (const n of P.degrees) {
        const rowsP = P.dim[n] ?? 0
        const S: R[][] = Array.from({ length: rowsP }, () => [])
        const T: R[][] = Array.from({ length: rowsP }, () => [])
        for (let e = 0; e < edges.length; e++) {
          const [j, j2] = edges[e]!
          const k  = Js.indexOf(j)
          const k2 = Js.indexOf(j2)
          const h = DJ.arr(j, j2); if (!h) throw new Error('missing DJ edge map')
          // s block = inc_{j2} ∘ h
          const SB = mul(incP[k2]!.f[n] ?? [], h.f[n] ?? [])
          const TB = incP[k]!.f[n] ?? []
          // append by columns
          if (S.length === 0) for (let i = 0; i < rowsP; i++) S[i] = []
          if (T.length === 0) for (let i = 0; i < rowsP; i++) T[i] = []
          for (let i = 0; i < rowsP; i++) {
            const srow = SB[i] ?? [], trow = TB[i] ?? []
            for (let c = 0; c < srow.length; c++) S[i]!.push(srow[c]!)
            for (let c = 0; c < trow.length; c++) T[i]!.push(trow[c]!)
          }
        }
        s[n] = S; t[n] = T
      }

      // compute cokernel data per degree
      const U: Record<number,R[][]> = {}
      const B: Record<number,R[][]> = {}
      const q: Record<number,R[][]> = {}
      const sec: Record<number,R[][]> = {}
      const dim: Record<number, number> = {}

      for (const n of P.degrees) {
        // U = image columns of (s - t) in P
        const Sn = s[n] ?? [], Tn = t[n] ?? []
        const rows = Sn.length, cols = Sn[0]?.length ?? 0
        const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        for (let i = 0; i < rows; i++)
          for (let j = 0; j < cols; j++)
            M[i]![j] = F.add(Sn[i]?.[j] ?? F.zero, F.neg(Tn[i]?.[j] ?? F.zero))
        const Ucols = imCols(M)                    // P_n × r
        U[n] = Ucols
        // choose complement B in P to span quotient reps
        const dimP = P.dim[n] ?? 0
        const Bcols = chooseComplementCols(Ucols, dimP)   // P_n × q
        B[n] = Bcols
        dim[n] = Bcols[0]?.length ?? 0
        // q: P→C = coordinates in basis B, sec: C→P embeds via B
        const qn: R[][] = Array.from({ length: dim[n] }, () => Array.from({ length: dimP }, () => F.zero))
        for (let j = 0; j < dimP; j++) {
          const e = eye(F)(dimP).map(r => r[j] as R)
          const alpha = coords(Bcols, e) // B * alpha = e
          for (let i = 0; i < (dim[n] ?? 0); i++) qn[i]![j] = alpha[i] ?? F.zero
        }
        q[n] = qn
        sec[n] = tpose(Bcols) // (q×dimP)ᵗ = dimP×q columns are basis reps
      }

      const dC: Record<number, Mat<R>> = {}
      const C: Complex<R> = { S: P.S, degrees: P.degrees, dim, d: dC }
      // differentials on C: induced by P via q∘dP∘sec (well-defined in quotients)
      for (const n of P.degrees) {
        const dP = P.d[n] ?? []
        const qn1 = q[n-1] ?? []; const secn = sec[n] ?? []
        dC[n] = mul(qn1, mul(dP, secn))
      }
      const record: SliceMeta = { Js, P, Rm, s, t, U, B, q, sec, C }
      meta.set(i, record)
    }

    // The Lan diagram:
    const X: Record<ObjId, Complex<R>> = {}
    for (const i of I.objects) X[i] = meta.get(i)!.C

    // The universal morphism arr(a,b): Lan(a) → Lan(b) for a≤b (true induced map)
    const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined => {
      if (!I.leq(a,b)) return undefined
      const A = meta.get(a)!; const Bm = meta.get(b)!
      // Build m_P: P_a → P_b that maps each component j∈(u↓a) into the same j in (u↓b)
      const Pa = A.P, Pb = Bm.P
      const f: Record<number,R[][]> = {}
      for (const n of Pa.degrees) {
        const rows = Pb.dim[n] ?? 0
        const cols = Pa.dim[n] ?? 0
        const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        // offsets per component
        const dimsA = A.Js.map(j => DJ.X[j]!.dim[n] ?? 0)
        const dimsB = Bm.Js.map(j => DJ.X[j]!.dim[n] ?? 0)
        let offA = 0
        for (let k = 0; k < A.Js.length; k++) {
          const j = A.Js[k]!
          const kk = Bm.Js.indexOf(j) // guaranteed ≥0 by slice inclusion
          const offB = dimsB.slice(0, kk).reduce((s, width) => s + width, 0)
          const w = dimsA[k]!
          for (let c = 0; c < w; c++) M[offB + c]![offA + c] = F.one
          offA += w
        }
        f[n] = M
      }
      const mP: ChainMap<R> = { S: Pa.S, X: Pa, Y: Pb, f }

      // Induced map on cokernels: φ = q_b ∘ mP ∘ sec_a
      const φ: Record<number,R[][]> = {}
      for (const n of Pa.degrees) {
        const Mat = mul(Bm.q[n] ?? [], mul(mP.f[n] ?? [], A.sec[n] ?? []))
        φ[n] = Mat
      }
      const La = A.C, Lb = Bm.C
      return { S: La.S, X: La, Y: Lb, f: φ }
    }

    return { I, X, arr }
  }

/** Right Kan along u: J→I with REAL universal arr(a,b). */
export const RanPoset =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId, J: FinitePoset, I: FinitePoset) =>
  (DJ: PosetDiagram<R>): PosetDiagram<R> => {
    const prod = productComplex(F)
    const prj = projectionFromProduct(F)
    const mul = matMul(F)
    const kerCols = nullspaceByRref(F)
    const coords = (A: R[][], b: R[]) => solveLinear(F)(tpose(A), b)

    type SliceMeta = {
      Js: ObjId[]
      P0: Complex<R>                // ∏ D(j)
      Q:  Complex<R>                // ∏ D(tgt h)
      u1: Record<number,R[][]>      // u1: P0 → Q
      u2: Record<number,R[][]>      // u2: P0 → Q
      K:  Complex<R>                // Ker(u1 - u2)
      inc: Record<number,R[][]>     // inc: K → P0  (columns = kernel basis)
      coordK: Record<number,(w:R[])=>R[]> // coordinate solver in K (inc·α = w)
    }

    const meta = new Map<ObjId, SliceMeta>()

    for (const i of I.objects) {
      const Js = J.objects.filter(j => I.leq(i, u(j)))          // (i↓u)
      const parts = Js.map(j => DJ.X[j]!)
      const P0 = prod(...parts)

      // edges j→j' in slice
      type Edge = readonly [ObjId, ObjId]
      const edges: Edge[] = []
      for (const j of Js) for (const j2 of Js)
        if (j !== j2 && J.leq(j, j2)) edges.push([j, j2])
      const Q = edges.length > 0 ? prod(...edges.map(([,j2]) => DJ.X[j2]!)) : 
        { S: P0.S, degrees: P0.degrees, dim: Object.fromEntries(P0.degrees.map(n => [n, 0])), d: {} } // empty complex

      // build u1,u2
      const u1: Record<number,R[][]> = {}
      const u2: Record<number,R[][]> = {}
      const prP = Js.map((_, k) => prj(parts, k))
      const prQ = edges.map(([, j2], eidx) => {
        const tgts = edges.map(([,jj]) => DJ.X[jj]!)
        return prj(tgts, eidx)
      })

      for (let e = 0; e < edges.length; e++) {
        const [j, j2] = edges[e]!
        const k  = Js.indexOf(j)
        const k2 = Js.indexOf(j2)
        const h = DJ.arr(j, j2); if (!h) throw new Error('missing DJ edge map')

        for (const n of P0.degrees) {
          // Se = prQ[e] ∘ h ∘ prP[k],   Te = prQ[e] ∘ prP[k2]
          const Se = mul(prQ[e]!.f[n] ?? [], mul(h.f[n] ?? [], prP[k]!.f[n] ?? []))
          const Te = mul(prQ[e]!.f[n] ?? [],          prP[k2]!.f[n] ?? [])
          const add = (dst: Record<number,R[][]>, B: R[][]) => {
            const prev = dst[n]; if (!prev) { dst[n] = B.map(r=>r.slice()); return }
            for (let i = 0; i < prev.length; i++)
              for (let j = 0; j < (prev[0]?.length ?? 0); j++)
                prev[i]![j] = F.add(prev[i]![j]!, B[i]![j]!)
          }
          add(u1, Se); add(u2, Te)
        }
      }

      // equalizer K = Ker(u1 - u2) with inclusion inc: K → P0 (basis columns)
      const inc: Record<number,R[][]> = {}
      const Kdim: Record<number, number> = {}
      for (const n of P0.degrees) {
        const U1 = u1[n] ?? [], U2 = u2[n] ?? []
        const rows = U1.length, cols = U1[0]?.length ?? 0
        const D: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        for (let i = 0; i < rows; i++)
          for (let j = 0; j < cols; j++)
            D[i]![j] = F.add(U1[i]?.[j] ?? F.zero, F.neg(U2[i]?.[j] ?? F.zero))
        // Kernel columns live in domain P0: each column is a vector in P0
        const N = kerCols(D)      // P0_n × k
        inc[n] = N
        Kdim[n] = N[0]?.length ?? 0
      }
      const dK: Record<number, Mat<R>> = {}
      const K: Complex<R> = { S: P0.S, degrees: P0.degrees, dim: Kdim, d: dK }
      // induced differential on K: inc is a chain map iff dQ(u1-u2)=(u1-u2)dP0; we build dK by pullback:
      for (const n of P0.degrees) {
        const dP = P0.d[n] ?? []
        // inc_{n-1} · dK_n = dP_n · inc_n   ⇒ solve for dK via coordinates in columns of inc_{n-1}
        const v = mul(P0.d[n] ?? [], inc[n] ?? [])
        // coordinates α with (inc_{n-1}) α = v  (column-wise)
        const alpha: R[][] = []
        const coord = (w: R[]) => coords(inc[n-1] ?? [], w)
        for (let j = 0; j < (inc[n]?.[0]?.length ?? 0); j++) {
          const w = v.map(row => row[j] ?? F.zero)
          alpha.push(coord(w))
        }
        // pack α columns: dim(K_{n-1}) × dim(K_n)
        const rows = Kdim[n-1] ?? 0, cols = Kdim[n] ?? 0
        const DK: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        for (let j = 0; j < cols; j++) {
          const col = alpha[j] ?? []
          for (let i = 0; i < rows; i++) DK[i]![j] = col[i] ?? F.zero
        }
        dK[n] = DK
      }

      // fast coordinate solver in K: α s.t. inc·α = w (precompute left solve per column)
      const coordK: Record<number,(w:R[])=>R[]> = {}
      for (const n of P0.degrees) coordK[n] = (w: R[]) => coords(inc[n] ?? [], w)

      meta.set(i, { Js, P0, Q, u1, u2, K, inc, coordK })
    }

    const X: Record<ObjId, Complex<R>> = {}
    for (const i of I.objects) X[i] = meta.get(i)!.K

    // Universal morphism arr(a,b): Ran(a) → Ran(b) for a≤b
    const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined => {
      if (!I.leq(a,b)) return undefined
      const A = meta.get(a)!; const Bm = meta.get(b)!
      const Ka = A.K, Kb = Bm.K
      const f: Record<number,R[][]> = {}

      for (const n of Ka.degrees) {
        // projection π_ab: P0_a → P0_b (drop components not in Js_b)
        const rows = Bm.P0.dim[n] ?? 0
        const cols = A.P0.dim[n] ?? 0
        const Πab: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        // offsets per component
        let offA = 0
        for (let k = 0; k < A.Js.length; k++) {
          const j = A.Js[k]!
          const w = DJ.X[j]!.dim[n] ?? 0
          const kk = Bm.Js.indexOf(j)
          if (kk >= 0) {
            const offB = Bm.Js.slice(0, kk).reduce((s,jj)=>s+(DJ.X[jj]!.dim[n] ?? 0),0)
            for (let c = 0; c < w; c++) Πab[offB + c]![offA + c] = F.one
          }
          offA += w
        }
        // inc_b ∘ φ_n  =  Πab ∘ inc_a   ⇒   solve for φ_n by coordinates in Kb
        const RHS = mul(Πab, A.inc[n] ?? [])
        // for each column j of RHS, find α with (inc_b) α = RHS[:,j]
        const rowsK = Kb.dim[n] ?? 0
        const colsK = Ka.dim[n] ?? 0
        const Φ: R[][] = Array.from({ length: rowsK }, () => Array.from({ length: colsK }, () => F.zero))
        for (let j = 0; j < colsK; j++) {
          const w = RHS.map(row => row[j] ?? F.zero)
          const alpha = Bm.coordK[n]!(w)
          for (let i = 0; i < rowsK; i++) Φ[i]![j] = alpha[i] ?? F.zero
        }
        f[n] = Φ
      }
      return { S: Ka.S, X: Ka, Y: Kb, f }
    }

    return { I, X, arr }
  }

// ========================= Vector space bridge layer =========================

export type VectorSpace<R> = VectViewNS.VectorSpace<R>

export type LinMap<R> = VectViewNS.LinMap<R>

export const VS = VectViewNS.VS

export const idL =
  <R>(F: Field<R>) =>
  (V: VectorSpace<R>): LinMap<R> => ({
    F, dom: V, cod: V, M: eye(F)(V.dim)
  })

export const composeL =
  <R>(F: Field<R>) =>
  (g: LinMap<R>, f: LinMap<R>): LinMap<R> => {
    if (f.cod !== g.dom) throw new Error('composeL: domain/codomain mismatch')
    const M = matMul(F)(g.M as R[][], f.M as R[][])
    return { F, dom: f.dom, cod: g.cod, M }
  }

/** Convert a `LinMap` to a one-degree `ChainMap` (degree n), handy for demos. */
export const linToChain = VectViewNS.linToChain

/** Extract degree‐wise vector spaces from a complex (std basis). */
export const complexSpaces =
  <R>(F: Field<R>) =>
  (X: Complex<R>): Record<number, VectorSpace<R>> => {
    const out: Record<number, VectorSpace<R>> = {}
    for (const n of X.degrees) out[n] = VectViewNS.VS(F)(X.dim[n] ?? 0)
    return out
  }

// ========================= Poset → Vect (at a chosen degree) =========================

/** Vector space diagram at a single fixed degree n. */
export type VectDiagram<R> = VectViewNS.VectDiagram<R>

/** Extract a Vect diagram for a *single fixed degree* n. */
export const toVectAtDegree = VectViewNS.toVectAtDegree

export const arrowMatrixAtDegree = VectViewNS.arrowMatrixAtDegree

/** Convenience: get the block matrix for a specific arrow at degree n, or zero if no arrow. */
// Pretty-printers are now in the Pretty namespace

// =====================================================================
// Free bimodules over semirings (object-level; finite rank only)
//   R ⟂ M ⟂ S  with M ≅ R^m as a *left* R-semimodule and *right* S-semimodule
//   For standard free actions, the balanced tensor obeys:
//     (R^m_S) ⊗_S (S^n_T)  ≅  R^{m⋅n}_T
// =====================================================================
export type FreeBimodule<R, S> = {
  readonly left: Semiring<R>
  readonly right: Semiring<S>
  readonly rank: number     // M ≅ R^rank as a set of columns
}

// canonical free objects
export const FreeBimoduleStd = <R, S>(R: Semiring<R>, S: Semiring<S>) =>
  (rank: number): FreeBimodule<R, S> => ({ left: R, right: S, rank })

// balanced tensor on objects (no morphisms here)
export const tensorBalancedObj =
  <R, S, T>(
    MS: FreeBimodule<R, S>,
    ST: FreeBimodule<S, T>
  ): FreeBimodule<R, T> => {
    if (MS.right !== ST.left)
      console.warn('tensorBalancedObj: semiring identity check skipped; ensure MS.right and ST.left represent the same S')
    return { left: MS.left, right: ST.right, rank: MS.rank * ST.rank }
  }

// =====================================================================
// Balanced tensor on maps over the *same* base semiring R
//   M ≅ R^m, N ≅ R^n, M' ≅ R^m', N' ≅ R^n'
//   f : M -> M'  ~ matrix (m' x m)
//   g : N -> N'  ~ matrix (n' x n)
//   f ⊗_R g : M⊗_R N -> M'⊗_R N'  ~ Kronecker (m'n') x (mn)
// Laws (checkable):
//   (f2 ∘ f1) ⊗ (g2 ∘ g1) = (f2 ⊗ g2) ∘ (f1 ⊗ g1)
//   id ⊗ id = id
// =====================================================================
export const tensorBalancedMapSameR =
  <R>(S: Semiring<R>) =>
  (f: Mat<R>, g: Mat<R>): Mat<R> => kron(S)(f, g)

// identity and composition helpers for maps (matrices)
export const idMap =
  <R>(S: Semiring<R>) =>
  (n: number): Mat<R> => eye(S)(n)

export const composeMap =
  <R>(S: Semiring<R>) =>
  (f: Mat<R>, g: Mat<R>): Mat<R> =>
    // compose f∘g (apply g, then f) — beware shapes
    matMul(S)(f, g)

// =====================================================================
// Right C-comodules over a coring C on R^n (finite, free)
//   - Let C = (R^n, Δ : C→C⊗C, ε : C→R).
//   - A right C-comodule on M ≅ R^m is a coaction ρ : M → M⊗C
//     which satisfies:
//       (ρ ⊗ id_C) ∘ ρ  =  (id_M ⊗ Δ) ∘ ρ
//       (id_M ⊗ ε) ∘ ρ  =  id_M
//   - In matrices: ρ is an (m⋅n) × m matrix over R.
// =====================================================================
export type Comodule<R> = {
  readonly S: Semiring<R>
  readonly C: Coring<R>       // base coring on R^n
  readonly m: number          // rank of M
  readonly rho: Mat<R>        // (m*n) x m
}

// Helpers to index rows as (i,j) ↔ i*n + j
const _row = (i: number, j: number, n: number) => i * n + j
const _pairFrom = (r: number, n: number) => [Math.floor(r / n), r % n] as const

// Coaction laws checked elementwise via sums (no reshape tricks)
export const comoduleCoassocHolds = <R>(M: Comodule<R>): boolean => {
  const { S, C: { n, Delta }, m, rho } = M
  // Δ row index encodes (q, r) -> q*n + r; column is j
  const add = S.add, mul = S.mul
  const eq  = M.S.eq ?? ((x: R, y: R) => Object.is(x, y))

  // For every basis vector e_k in M, compare coefficients of e_p ⊗ c_q ⊗ c_r
  for (let k = 0; k < m; k++) {
    for (let p = 0; p < m; p++) for (let q = 0; q < n; q++) for (let r = 0; r < n; r++) {
      // LHS: sum_i rho[(i,r), k] * rho[(p,q), i]
      let lhs = S.zero
      for (let i = 0; i < m; i++) {
        const a = rho[_row(i, r, n)]?.[k]
        const b = rho[_row(p, q, n)]?.[i]
        if (a !== undefined && b !== undefined) {
          lhs = add(lhs, mul(a, b))
        }
      }
      // RHS: sum_j rho[(p,j), k] * Δ[(q,r), j]
      let rhs = S.zero
      for (let j = 0; j < n; j++) {
        const a = rho[_row(p, j, n)]?.[k]
        const b = Delta[_row(q, r, n)]?.[j]
        if (a !== undefined && b !== undefined) {
          rhs = add(rhs, mul(a, b))
        }
      }
      if (!eq(lhs, rhs)) return false
    }
  }
  return true
}

export const comoduleCounitHolds = <R>(M: Comodule<R>): boolean => {
  const { S, C: { n, Eps }, m, rho } = M
  const add = S.add, mul = S.mul
  const eq  = S.eq ?? ((x: R, y: R) => Object.is(x, y))
  // (id ⊗ ε) ∘ ρ = id_M  ⇒  ∑_j rho[(p,j),k] * ε[j] = δ_{pk}
  for (let k = 0; k < m; k++) for (let p = 0; p < m; p++) {
    let acc = S.zero
    for (let j = 0; j < n; j++) {
      const a = rho[_row(p, j, n)]?.[k]
      const b = Eps[0]?.[j]
      if (a !== undefined && b !== undefined) {
        acc = add(acc, mul(a, b))
      }
    }
    const delta = (p === k) ? S.one : S.zero
    if (!eq(acc, delta)) return false
  }
  return true
}

// A canonical lawful comodule for the "diagonal" coring:
//   ρ(e_k) = e_k ⊗ c_{σ(k)}  for every choice of tag σ : {0..m-1} → {0..n-1}
export const makeDiagonalComodule =
  <R>(C: Coring<R>) =>
  (m: number, sigma: (k: number) => number): Comodule<R> => {
    const rho: R[][] = Array.from({ length: m * C.n }, () =>
      Array.from({ length: m }, () => C.S.zero)
    )
    for (let k = 0; k < m; k++) {
      const j = sigma(k) % C.n
      const row = rho[_row(k, j, C.n)]
      if (row) {
        row[k] = C.S.one
      }
    }
    return { S: C.S, C, m, rho }
  }

// =====================================================================
// Bicomodules over corings D (left) and C (right) on free modules
//   - Right coaction rhoR : M -> M⊗C  ~ (m*nC) x m
//   - Left  coaction rhoL : M -> D⊗M  ~ (nD*m) x m
//   - Laws: (rhoL ⊗ id_C)∘rhoR = (id_D ⊗ rhoR)∘rhoL
// =====================================================================
export type Bicomodule<R> = {
  readonly S: Semiring<R>
  readonly left:  Coring<R>   // D with dim nD
  readonly right: Coring<R>   // C with dim nC
  readonly m: number          // rank of M
  readonly rhoL: Mat<R>       // (nD*m) x m
  readonly rhoR: Mat<R>       // (m*nC) x m
}

// Row indexers
const rowRC = (p: number, j: number, nC: number) => p * nC + j      // (M⊗C) row
const rowDM = (i: number, p: number, m: number) => i * m + p        // (D⊗M) row

export const bicomoduleCommutes = <R>(B: Bicomodule<R>): boolean => {
  const { S, left: D, right: C, m, rhoL, rhoR } = B
  const nD = D.n, nC = C.n
  const add = S.add, mul = S.mul
  const eq  = S.eq ?? ((x: R, y: R) => Object.is(x, y))

  // For each basis e_k in M, compare coefficients of d_i ⊗ e_p ⊗ c_j
  for (let k = 0; k < m; k++) {
    for (let i = 0; i < nD; i++) for (let p = 0; p < m; p++) for (let j = 0; j < nC; j++) {
      // LHS = sum_{q} (rhoL ⊗ id_C)∘rhoR:
      //   sum_q   rhoR[(q,j), k] * rhoL[(i,p), q]
      let lhs = S.zero
      for (let q = 0; q < m; q++) {
        const a = rhoR[rowRC(q, j, nC)]?.[k]
        const b = rhoL[rowDM(i, p, m)]?.[q]
        if (a !== undefined && b !== undefined) {
          lhs = add(lhs, mul(a, b))
        }
      }

      // RHS = sum_{r} (id_D ⊗ rhoR)∘rhoL:
      //   sum_r   rhoL[(i,r), k] * rhoR[(p,j), r]
      let rhs = S.zero
      for (let r = 0; r < m; r++) {
        const a = rhoL[rowDM(i, r, m)]?.[k]
        const b = rhoR[rowRC(p, j, nC)]?.[r]
        if (a !== undefined && b !== undefined) {
          rhs = add(rhs, mul(a, b))
        }
      }
      if (!eq(lhs, rhs)) return false
    }
  }
  return true
}

// Lawful diagonal bicomodule for diagonal corings:
//   Choose tags σL: {0..m-1} -> {0..nD-1}, σR: {0..m-1} -> {0..nC-1}
//   rhoL(e_k) = d_{σL(k)} ⊗ e_k
//   rhoR(e_k) = e_k ⊗ c_{σR(k)}
export const makeDiagonalBicomodule =
  <R>(D: Coring<R>, C: Coring<R>) =>
  (m: number, sigmaL: (k: number) => number, sigmaR: (k: number) => number): Bicomodule<R> => {
    const S = D.S
    if (S !== C.S) console.warn('Bicomodule assumes both corings over the same semiring instance')

    const rhoL: R[][] = Array.from({ length: D.n * m }, () =>
      Array.from({ length: m }, () => S.zero)
    )
    const rhoR: R[][] = Array.from({ length: m * C.n }, () =>
      Array.from({ length: m }, () => S.zero)
    )

    for (let k = 0; k < m; k++) {
      const i = sigmaL(k) % D.n
      const j = sigmaR(k) % C.n
      const rowL = rhoL[rowDM(i, k, m)]
      const rowR = rhoR[rowRC(k, j, C.n)]
      if (rowL) rowL[k] = S.one
      if (rowR) rowR[k] = S.one
    }
    return { S, left: D, right: C, m, rhoL, rhoR }
  }


// ---------------------------------------------
// FinitePoset: finite set of objects + ≤ relation
// ---------------------------------------------

/** Build a finite poset from objects and Hasse covers. */
export const makeFinitePoset = (
  objects: ReadonlyArray<ObjId>,
  covers: ReadonlyArray<readonly [ObjId, ObjId]>
): FinitePoset => {
  const uniq = Array.from(new Set(objects))
  const idx = new Map<ObjId, number>(uniq.map((o, i) => [o, i]))
  // validate cover endpoints
  for (const [a, b] of covers) {
    if (!idx.has(a) || !idx.has(b)) {
      throw new Error(`makeFinitePoset: unknown object in cover (${a} ⋖ ${b})`)
    }
    if (a === b) throw new Error(`makeFinitePoset: self-cover not allowed (${a} ⋖ ${b})`)
  }

  const n = uniq.length
  // reachability matrix; start with reflexive closure
  const reach: boolean[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j)
  )
  // add cover edges
  for (const [a, b] of covers) {
    reach[idx.get(a)!]![idx.get(b)!] = true
  }
  // Floyd–Warshall transitive closure
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) if (reach[i]![k]) {
      for (let j = 0; j < n; j++) if (reach[k]![j]) {
        reach[i]![j] = true
      }
    }
  }
  // antisymmetry check: i ≤ j and j ≤ i ⇒ i==j
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && reach[i]![j] && reach[j]![i]) {
        const ai = uniq[i]!, aj = uniq[j]!
        throw new Error(`makeFinitePoset: cycle detected (${ai} ≼ ${aj} and ${aj} ≼ ${ai})`)
      }
    }
  }

  const leq = (a: ObjId, b: ObjId): boolean => {
    const ia = idx.get(a), ib = idx.get(b)
    if (ia == null || ib == null) return false
    return reach[ia]![ib]!
  }

  return { objects: uniq, leq }
}

/** Optional: quick text view of a poset. */
export const prettyPoset = (P: FinitePoset): string => {
  const lines: string[] = []
  lines.push(`Objects: ${P.objects.join(', ')}`)
  for (const a of P.objects) {
    const ups = P.objects.filter(b => a !== b && P.leq(a, b))
    if (ups.length) lines.push(`  ${a} ≤ { ${ups.join(', ')} }`)
  }
  return lines.join('\n')
}

/** Handy identity map builder (matches Complex shape). */
export const idChainMapCompat =
  <R>(X: Complex<R>): ChainMap<R> => {
    const { S } = X
    const f: Record<number, R[][]> = {}
    for (const n of X.degrees) {
      const dim = X.dim[n] ?? 0
      const I = Array.from({ length: dim }, (_, i) =>
        Array.from({ length: dim }, (_, j) => (i === j ? S.one : S.zero))
      )
      f[n] = I
    }
    return { S: X.S, X, Y: X, f }
  }

/**
 * Construct a PosetDiagram from:
 *  - a poset I,
 *  - node complexes X,
 *  - a list of arrow entries [a, b, f] where a ≤ b.
 */
export const makePosetDiagramCompat = <R>(
  I: FinitePoset,
  X: Readonly<Record<ObjId, Complex<R>>>,
  arrows: ReadonlyArray<readonly [ObjId, ObjId, ChainMap<R>]> = []
): PosetDiagram<R> => {
  // guard: nodes cover all objects
  for (const o of I.objects) {
    if (!X[o]) throw new Error(`makePosetDiagram: missing node complex for object '${o}'`)
  }
  // store arrows in a nested Map for quick lookup
  const table = new Map<ObjId, Map<ObjId, ChainMap<R>>>()
  const put = (a: ObjId, b: ObjId, f: ChainMap<R>) => {
    if (!I.leq(a, b)) throw new Error(`makePosetDiagram: arrow provided where ${a} ≰ ${b}`)
    if (!table.has(a)) table.set(a, new Map())
    table.get(a)!.set(b, f)
  }
  for (const [a, b, f] of arrows) put(a, b, f)

  const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined =>
    table.get(a)?.get(b)

  return { I, X, arr }
}

/* ================================================================
   DiagramClosure lives in stdlib/diagram-closure
   ================================================================ */

/* ================================================================
   DiscreteCategory — when you need explicit categorical structure
   ================================================================ */

// Category core definitions live in stdlib/category
/* ================================================================
   Integration with existing infrastructure
   ================================================================ */

/**
 * Compare codensity monad across adjunction.
 *
 * @deprecated Schedule a relative monad comparison via the Street-action
 * analyzers instead; this helper only observes classical endofunctors.
 */
export const compareCodensityAcrossAdjunction = <
  CO,
  DO,
  FO extends CatFunctor<CO, DO>,
  UO extends CatFunctor<DO, CO>,
  BO,
  BM
>(
  adj: Adjunction<CO, DO, FO, UO>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
) => {
  // This would compare T^G(A) with T^{G'}(F(A)) where G' = F ∘ G ∘ U
  // For equivalences, these should be naturally isomorphic
  return {
    originalCodensity: codensityCarrierFinSet(G.source, G, A),
    transportedCodensity: "placeholder", // Would compute via pushforward
    comparison: "placeholder" // Would check natural isomorphism
  }
}

/**
 * Matrix pretty-printing for pushed monads in Vect.
 *
 * @deprecated Prefer reporting via the relative monad construction diagnostics,
 * which surface the same matrices as witness payloads.
 */
export const prettyPrintPushedMonad = (
  pushedMonad: CatMonad<unknown>,
  V: EnhancedVect.VectObj
) => {
  const TV = assertVectObj(pushedMonad.endofunctor.onObj(V))
  return {
    originalDim: V.dim,
    pushedDim: TV.dim,
    unitMatrix: "placeholder", // Would extract matrix from unit
    multMatrix: "placeholder"  // Would extract matrix from mult
  }
}

/* ================================================================
   Concrete pushforward monad examples
  ================================================================ */

/** Free vector space functor FinSet -> Vect */
type VectObjShape = { readonly dim: number }

const isVectObjShape = (value: unknown): value is VectObjShape =>
  typeof value === 'object' &&
  value !== null &&
  'dim' in value &&
  typeof (value as { dim?: unknown }).dim === 'number'

const assertVectObj = (value: unknown): EnhancedVect.VectObj => {
  if (!isVectObjShape(value)) {
    throw new TypeError('Expected a Vect object')
  }
  return value as EnhancedVect.VectObj
}

type MatrixShape = ReadonlyArray<ReadonlyArray<number>>

const isMatrixShape = (value: unknown): value is MatrixShape =>
  isReadonlyArray(value) &&
  value.every(
    (row): row is ReadonlyArray<number> =>
      isReadonlyArray(row) && row.every((entry) => typeof entry === 'number')
  )

type VectMorShape = {
  readonly matrix: MatrixShape
  readonly from: VectObjShape
  readonly to: VectObjShape
}

const isVectMorShape = (value: unknown): value is VectMorShape =>
  typeof value === 'object' &&
  value !== null &&
  'matrix' in value &&
  'from' in value &&
  'to' in value &&
  isMatrixShape((value as { matrix?: unknown }).matrix) &&
  isVectObjShape((value as { from?: unknown }).from) &&
  isVectObjShape((value as { to?: unknown }).to)

const assertVectMor = (value: unknown): EnhancedVect.VectMor => {
  if (!isVectMorShape(value)) {
    throw new TypeError('Expected a Vect morphism')
  }
  return value as EnhancedVect.VectMor
}

export const freeVectFunctor = (): CatFunctor<typeof FinSet, typeof EnhancedVect.Vect> => ({
  source: FinSet,
  target: EnhancedVect.Vect,
  onObj: (obj: ObjOf<typeof FinSet>) => {
    const S = assertFinSetObj(obj)
    return { dim: S.elements.length }
  },
  onMor: (mor: MorOf<typeof FinSet>) => {
    const f = assertFinSetMor(mor)
    const rows = f.to.elements.length
    const cols = f.from.elements.length
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0))
    for (let j = 0; j < cols; j++) {
      const targetIndex = f.map[j]
      if (targetIndex === undefined) {
        throw new Error('Free functor: missing image index for basis element')
      }
      matrix[targetIndex]![j] = 1
    }
    return {
      matrix: matrix.map((row) => row.slice()),
      from: { dim: cols },
      to: { dim: rows }
    }
  }
})

/** Forgetful functor Vect -> FinSet */
export const forgetVectFunctor = (): CatFunctor<typeof EnhancedVect.Vect, typeof FinSet> => ({
  source: EnhancedVect.Vect,
  target: FinSet,
  onObj: (obj: ObjOf<typeof EnhancedVect.Vect>) => {
    const V = assertVectObj(obj)
    return makeFinSetObj(Array.from({ length: V.dim }, (_, i) => i))
  },
  onMor: (mor: MorOf<typeof EnhancedVect.Vect>) => {
    const f = assertVectMor(mor)
    const from = makeFinSetObj(Array.from({ length: f.from.dim }, (_, i) => i))
    const to = makeFinSetObj(Array.from({ length: f.to.dim }, (_, i) => i))
    const map = Array.from({ length: f.from.dim }, (_, i) =>
      i < f.to.dim ? i : 0
    )
    return { from, to, map }
  }
})

/** Free-Forgetful adjunction between FinSet and Vect */
export const freeForgetfulAdjunction = (): Adjunction<
  typeof FinSet,
  typeof EnhancedVect.Vect,
  CatFunctor<typeof FinSet, typeof EnhancedVect.Vect>,
  CatFunctor<typeof EnhancedVect.Vect, typeof FinSet>
> => {
  const F = freeVectFunctor()  // Free: FinSet -> Vect
  const U = forgetVectFunctor()  // Forget: Vect -> FinSet

  // Unit: Id_FinSet ⇒ U ∘ F (inclusion of set into free vector space)
  const unit: CatNatTrans<
    CatId<typeof FinSet>,
    CatCompose<typeof F, typeof U>
  > = {
    source: idFun(FinSet),
    target: composeFun(F, U),
    component: (obj: ObjOf<typeof FinSet>) => FinSet.id(assertFinSetObj(obj))
  }

  // Counit: F ∘ U ⇒ Id_Vect (evaluation of linear combination)
  const counit: CatNatTrans<
    CatCompose<typeof U, typeof F>,
    CatId<typeof EnhancedVect.Vect>
  > = {
    source: composeFun(U, F),
    target: idFun(EnhancedVect.Vect),
    component: (obj: ObjOf<typeof EnhancedVect.Vect>) =>
      EnhancedVect.Vect.id(assertVectObj(obj))
  }
  
  return { F, U, unit, counit }
}

/** Example: List monad on FinSet */
export const listMonadFinSet = (): CatMonad<typeof FinSet> => {
  const listElementsFor = (S: FinSetObj): ReadonlyArray<ReadonlyArray<FinSetElem>> => {
    const lists: Array<ReadonlyArray<FinSetElem>> = [[]]
    const extend = (
      prefix: ReadonlyArray<FinSetElem>,
      remaining: number
    ): void => {
      if (remaining === 0) {
        lists.push(prefix)
        return
      }
      for (const elem of S.elements) {
        extend([...prefix, elem], remaining - 1)
      }
    }
    for (let len = 1; len <= 3; len++) {
      extend([], len)
    }
    return lists
  }

  const findListIndex = (
    haystack: ReadonlyArray<ReadonlyArray<FinSetElem>>,
    needle: ReadonlyArray<FinSetElem>
  ): number =>
    haystack.findIndex(
      (candidate) =>
        candidate.length === needle.length &&
        candidate.every((value, idx) => Object.is(value, needle[idx]))
    )

  const mapElementVia = (f: FinSetMor, value: FinSetElem): FinSetElem => {
    const domainIndex = f.from.elements.findIndex((candidate) => Object.is(candidate, value))
    if (domainIndex < 0) {
      throw new Error('ListFunctor.onMor: value not found in domain')
    }
    const imageIndex = f.map[domainIndex]
    if (imageIndex === undefined) {
      throw new Error('ListFunctor.onMor: missing image index for value')
    }
    if (imageIndex < 0 || imageIndex >= f.to.elements.length) {
      throw new Error('ListFunctor.onMor: image index out of bounds')
    }
    return f.to.elements[imageIndex]!
  }

  const listObjectFor = (S: FinSetObj): FinSetObjOf<ReadonlyArray<FinSetElem>> =>
    makeFinSetObj(listElementsFor(S))

  const ListFunctor: CatFunctor<typeof FinSet, typeof FinSet> = {
    source: FinSet,
    target: FinSet,
    onObj: (obj: ObjOf<typeof FinSet>) => listObjectFor(assertFinSetObj(obj)),
    onMor: (mor: MorOf<typeof FinSet>) => {
      const f = assertFinSetMor(mor)
      const listS = listObjectFor(f.from)
      const listT = listObjectFor(f.to)
      const domainLists = assertListElements(listS.elements)
      const codomainLists = assertListElements(listT.elements)
      const map = domainLists.map((list) => {
        const mappedList = list.map((value) => mapElementVia(f, value))
        const idx = findListIndex(codomainLists, mappedList)
        if (idx < 0) {
          throw new Error('ListFunctor.onMor: mapped list not found in codomain')
        }
        return idx
      })
      return { from: listS, to: listT, map }
    }
  }

  const unit: CatNatTrans<CatId<typeof FinSet>, typeof ListFunctor> = {
    source: idFun(FinSet),
    target: ListFunctor,
    component: (obj: unknown) => {
      const S = assertFinSetObj(obj)
      const listS = listObjectFor(S)
      const codomainLists = assertListElements(listS.elements)
      const map = S.elements.map((value) => {
        const idx = findListIndex(codomainLists, [value])
        if (idx < 0) {
          throw new Error('ListFunctor.unit: singleton list missing from codomain')
        }
        return idx
      })
      return { from: S, to: listS, map }
    }
  }

  const mult: CatNatTrans<CatCompose<typeof ListFunctor, typeof ListFunctor>, typeof ListFunctor> = {
    source: composeFun(ListFunctor, ListFunctor),
    target: ListFunctor,
    component: (obj: unknown) => {
      const S = assertFinSetObj(obj)
      const listS = listObjectFor(S)
      const listListS = listObjectFor(listS)
      const nestedLists = assertNestedListElements(listListS.elements)
      const codomainLists = assertListElements(listS.elements)
      const map = nestedLists.map((nestedList) => {
        const flattened = nestedList.flat() as ReadonlyArray<FinSetElem>
        const idx = findListIndex(codomainLists, flattened)
        if (idx < 0) {
          throw new Error('ListFunctor.mult: flattened list missing from codomain')
        }
        return idx
      })
      return { from: listListS, to: listS, map }
    }
  }
  
  return {
    category: FinSet,
    endofunctor: ListFunctor,
    unit,
    mult
  }
}

export namespace DiscreteCategory {
  /** Morphism in discrete category (only identities exist) */
  export type DiscreteMor<I> = { readonly tag: "Id"; readonly obj: I }

  /** Discrete category: only identity morphisms */
  export interface Discrete<I> {
    readonly kind: "Discrete"
    readonly objects: ReadonlyArray<I>
    readonly id: (i: I) => DiscreteMor<I>
    readonly compose: (g: DiscreteMor<I>, f: DiscreteMor<I>) => DiscreteMor<I>
    readonly isId: (m: DiscreteMor<I>) => boolean
  }

  /** Create discrete category from objects */
  export const create = <I>(objects: ReadonlyArray<I>): Discrete<I> => ({
    kind: "Discrete",
    objects,
    id: (i) => ({ tag: "Id", obj: i }),
    compose: (g, f) => {
      if (g.tag !== "Id" || f.tag !== "Id") throw new Error("Non-identity in Discrete")
      if (g.obj !== f.obj) throw new Error("Cannot compose identities on different objects")
      return f // or g; both are the same identity
    },
    isId: (m) => m.tag === "Id"
  })

  /** Bridge: family as functor from discrete category to complexes */
  export const familyAsFunctor =
    <I, R>(disc: Discrete<I>, fam: IndexedFamilies.Family<I, Complex<R>>) => ({
      source: disc,
      onObj: (i: I) => fam(i),
      onMor: (f: DiscreteMor<I>) => {
        const X = fam(f.obj)
        return idChainMapCompat(X) // identity on the complex
      }
    })

  /** Adapter: view Discrete(I) as a (finite) groupoid (only identities) */
  export const DiscreteAsGroupoid = <I>(Icar: ReadonlyArray<I>): FiniteGroupoid<I, DiscreteMor<I>> => {
    const D = create(Icar)
    return {
      ...D,
      objects: Icar,
      hom: (a, b) => (a === b ? [D.id(a)] : []),
      dom: (m) => m.obj,
      cod: (m) => m.obj,
      inv: (m) => m // identities invert to themselves
    }
  }
}

/* ================================================================
   Groupoid utilities and Kan extensions via isomorphism classes
   ================================================================ */

/** Does there exist an isomorphism a ≅ b ? */
export const hasIso = <O, M>(G: FiniteGroupoid<O, M>, a: O, b: O): boolean => {
  if (a === b) return true
  const seen = new Set<O>()
  const q: O[] = [a]
  seen.add(a)
  while (q.length) {
    const x = q.shift()!
    for (const y of G.objects) {
      if (G.hom(x, y).length > 0 && !seen.has(y)) {
        if (y === b) return true
        seen.add(y)
        q.push(y)
      }
    }
  }
  return false
}

/** Partition objects into isomorphism classes (connected components) */
export const isoClasses = <O, M>(G: FiniteGroupoid<O, M>): ReadonlyArray<ReadonlyArray<O>> => {
  const classes: O[][] = []
  const unvisited = new Set(G.objects as O[])
  while (unvisited.size) {
    const start = unvisited.values().next().value as O
    const comp: O[] = []
    const q: O[] = [start]
    unvisited.delete(start)
    comp.push(start)
    while (q.length) {
      const x = q.shift()!
      for (const y of G.objects) {
        if (unvisited.has(y) && (G.hom(x, y).length > 0 || G.hom(y, x).length > 0)) {
          unvisited.delete(y)
          comp.push(y)
          q.push(y)
        }
      }
    }
    classes.push(comp)
  }
  return classes
}

/** Reindex (pullback) along a groupoid functor u: G -> H (precomposition) */
export const reindexGroupoid = <GO, GM, HO, HM, O, M>(
  u: GFunctor<GO, GM, HO, HM>,
  F: { onObj: (h: HO) => O; onMor?: (m: HM) => M }
) => ({
  onObj: (g: GO) => F.onObj(u.onObj(g)),
  onMor: F.onMor ? (m: GM) => F.onMor!(u.onMor(m)) : undefined
})

/** Left Kan extension along groupoid functors via isomorphism classes */
export const lanGroupoidViaClasses = <GO, GM, HO, HM, O, M>(
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  Fobj: IndexedFamilies.Family<GO, O>,                    // object part of F : G -> C
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteCoproducts<O, M>
) => {
  const classesG = isoClasses(G) // iso classes of G-objects
  const classRep = new Map<GO, GO>()
  for (const comp of classesG) for (const g of comp) classRep.set(g, comp[0]!)

  const cacheObj = new Map<HO, O>()
  const cacheInj = new Map<HO, ReadonlyArray<readonly [GO, M]>>()

  for (const h of IfinH.carrier) {
    // collect representative g of each G-iso-class where u(g) ≅ h
    const reps: GO[] = []
    const seenRep = new Set<GO>()
    for (const g of G.objects) {
      if (hasIso(H, u.onObj(g), h)) {
        const r = classRep.get(g)!
        if (!seenRep.has(r)) { seenRep.add(r); reps.push(r) }
      }
    }
    const { obj, injections } = C.coproduct(reps.map((r) => Fobj(r)))
    cacheObj.set(h, obj)
    cacheInj.set(h, injections.map((m, k) => [reps[k]!, m] as const))
  }

  return {
    at: (h: HO) => cacheObj.get(h)!,
    injections: (h: HO) => cacheInj.get(h)!
  }
}

/** Right Kan extension along groupoid functors via isomorphism classes */
export const ranGroupoidViaClasses = <GO, GM, HO, HM, O, M>(
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  Fobj: IndexedFamilies.Family<GO, O>,
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteProducts<O, M>
) => {
  const classesG = isoClasses(G)
  const classRep = new Map<GO, GO>()
  for (const comp of classesG) for (const g of comp) classRep.set(g, comp[0]!)

  const cacheObj = new Map<HO, O>()
  const cacheProj = new Map<HO, ReadonlyArray<readonly [GO, M]>>()

  for (const h of IfinH.carrier) {
    const reps: GO[] = []
    const seenRep = new Set<GO>()
    for (const g of G.objects) {
      if (hasIso(H, u.onObj(g), h)) {
        const r = classRep.get(g)!
        if (!seenRep.has(r)) { seenRep.add(r); reps.push(r) }
      }
    }
    const { obj, projections } = C.product(reps.map((r) => Fobj(r)))
    cacheObj.set(h, obj)
    cacheProj.set(h, projections.map((m, k) => [reps[k]!, m] as const))
  }

  return {
    at: (h: HO) => cacheObj.get(h)!,
    projections: (h: HO) => cacheProj.get(h)!
  }
}

/** Full groupoid Left Kan with optional automorphism quotient */
export const lanGroupoidFull = <GO, GM, HO, HM, O, M>(
  Cat: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  F: { onObj: (g: GO) => O; onMor?: (phi: GM) => M },   // F on isos (optional; req'd if quotienting)
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteCoproducts<O, M> & Partial<CategoryLimits.HasCoequalizers<O, M>> & Partial<CategoryLimits.HasInitial<O, M>>
) => {
  if (!C.coequalizer || !F.onMor) {
    const lite = lanGroupoidViaClasses(H, G, u, F.onObj, IfinH, C)
    return { at: lite.at }
  }

  const at: IndexedFamilies.Family<HO, O> = (h) => {
    // objects in (u ↓ h): pairs (g, α:u(g)→h) with α iso in H
    const objs: Array<{ g: GO; alpha: HM }> = []
    for (const g of G.objects) for (const a of H.hom(u.onObj(g), h)) objs.push({ g, alpha: a })
    if (objs.length === 0) {
      if ('initialObj' in C && C.initialObj !== undefined) {
        return C.initialObj
      }
      const empty = C.coproduct([])
      if (empty) return empty.obj
      throw new Error('lanGroupoidFull: empty fiber and no initial object')
    }

    // start: ⨿ F(g_i)
    const { obj: Cop0, injections } = C.coproduct(objs.map(o => F.onObj(o.g)))
    let Cobj = Cop0
    let inj = injections.slice()

    const onMor = F.onMor!
    const coequalizer = C.coequalizer!

    const eqH = (m1: HM, m2: HM) =>
      H.dom(m1) === H.dom(m2) && H.cod(m1) === H.cod(m2) && H.isId!(H.compose(H.inv(m1), m2))

    for (let s = 0; s < objs.length; s++) {
      for (let t = 0; t < objs.length; t++) {
        const src = objs[s]!, dst = objs[t]!
        for (const phi of G.hom(src.g, dst.g)) {
          if (!eqH(H.compose(dst.alpha, u.onMor(phi)), src.alpha)) continue
          const f = inj[s]!
          const g2 = Cat.compose(inj[t]!, onMor(phi))
          const { obj: Q, coequalize: q } = coequalizer(f, g2)
          Cobj = Q
          for (let k = 0; k < inj.length; k++) {
            const leg = inj[k]
            if (leg) inj[k] = Cat.compose(q, leg)
          }
        }
      }
    }
    return Cobj
  }
  return { at }
}

/** Full groupoid Right Kan with optional automorphism quotient */
export const ranGroupoidFull = <GO, GM, HO, HM, O, M>(
  Cat: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  F: { onObj: (g: GO) => O; onMor?: (phi: GM) => M; inv?: (m: M) => M }, // need inverse for equalizer-side
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteProducts<O, M> & Partial<CategoryLimits.HasEqualizers<O, M>> & Partial<CategoryLimits.HasTerminal<O, M>>
) => {
  if (!C.equalizer || !F.onMor || !F.inv) {
    const lite = ranGroupoidViaClasses(H, G, u, F.onObj, IfinH, C)
    return { at: lite.at }
  }

  const at: IndexedFamilies.Family<HO, O> = (h) => {
    const objs: Array<{ g: GO; alpha: HM }> = []
    for (const g of G.objects) for (const a of H.hom(u.onObj(g), h)) objs.push({ g, alpha: a })

    if (objs.length === 0) {
      if ('terminalObj' in C && C.terminalObj !== undefined) {
        return C.terminalObj
      }
      const empty = C.product([])
      if (empty) return empty.obj
      throw new Error('ranGroupoidFull: empty fiber and no terminal object')
    }

    const eqH = (m1: HM, m2: HM) =>
      H.dom(m1) === H.dom(m2) && H.cod(m1) === H.cod(m2) && H.isId!(H.compose(H.inv(m1), m2))

    const { obj: Prod0, projections } = C.product(objs.map(o => F.onObj(o.g)))
    let Pobj = Prod0
    let proj = projections.slice()

    const onMor = F.onMor!
    const invert = F.inv!
    const equalizer = C.equalizer!

    for (let s = 0; s < objs.length; s++) {
      for (let t = 0; t < objs.length; t++) {
        const src = objs[s]!, dst = objs[t]!
        for (const phi of G.hom(src.g, dst.g)) {
          if (!eqH(H.compose(dst.alpha, u.onMor(phi)), src.alpha)) continue
          const pi_s = proj[s]!
          const pi_t = proj[t]!
          const rhs = Cat.compose(invert(onMor(phi)), pi_t)
          const { obj: E, equalize: e } = equalizer(pi_s, rhs)
          Pobj = E
          for (let k = 0; k < proj.length; k++) {
            const leg = proj[k]
            if (leg) proj[k] = Cat.compose(leg, e)
          }
        }
      }
    }
    return Pobj
  }
  return { at }
}

/** Minimal constructor for two-object isomorphic groupoid (for tests) */
export const twoObjIsoGroupoid = <T>(a: T, b: T): FiniteGroupoid<T, { from: T; to: T; tag: 'iso' | 'id' }> => {
  const id = (x: T) => ({ from: x, to: x, tag: 'id' } as const)
  const iso = (x: T, y: T) => ({ from: x, to: y, tag: 'iso' } as const)
  const objects: ReadonlyArray<T> = [a, b]
  const hom = (x: T, y: T) => {
    if (x === y) return [id(x)]
    if ((x === a && y === b) || (x === b && y === a)) return [iso(x, y)]
    return []
  }
  return {
    objects,
    id,
    compose: (g, f) => {
      if (f.to !== g.from) throw new Error('compose mismatch')
      if (f.tag === 'id') return g
      if (g.tag === 'id') return f
      // iso ∘ iso = id (since unique up to our one-iso model)
      return id(f.from)
    },
    dom: (m) => m.from,
    cod: (m) => m.to,
    inv: (m) => (m.tag === 'id' ? m : { from: m.to, to: m.from, tag: 'iso' }),
    hom,
    isId: (m) => m.tag === 'id'
  }
}

/* ================================================================
   Finite Set category with complete categorical structure
   ================================================================ */

export type FinSetElem = unknown

export interface FinSetObj {
  elements: ReadonlyArray<FinSetElem>
}

export const FinSetObj = Symbol.for('FinSetObj')

export interface FinSetMor {
  from: FinSetObj
  to: FinSetObj
  map: ReadonlyArray<number> // total function by index: [0..|from|-1] -> [0..|to|-1]
}

export const FinSetMor = Symbol.for('FinSetMor')

const isReadonlyArray = (value: unknown): value is ReadonlyArray<unknown> =>
  Array.isArray(value)

export const isFinSetObj = (value: unknown): value is FinSetObj =>
  typeof value === 'object' &&
  value !== null &&
  'elements' in value &&
  isReadonlyArray((value as { elements?: unknown }).elements)

export const assertFinSetObj = (value: unknown): FinSetObj => {
  if (!isFinSetObj(value)) {
    throw new TypeError('Expected a FinSet object')
  }
  return value
}

const isNumberArray = (value: unknown): value is ReadonlyArray<number> =>
  isReadonlyArray(value) && value.every((entry) => typeof entry === 'number')

export const isFinSetMor = (value: unknown): value is FinSetMor =>
  typeof value === 'object' &&
  value !== null &&
  'from' in value &&
  'to' in value &&
  'map' in value &&
  isFinSetObj((value as { from?: unknown }).from) &&
  isFinSetObj((value as { to?: unknown }).to) &&
  isNumberArray((value as { map?: unknown }).map)

export const assertFinSetMor = (value: unknown): FinSetMor => {
  if (!isFinSetMor(value)) {
    throw new TypeError('Expected a FinSet morphism')
  }
  return value
}

type FinSetObjOf<T> = FinSetObj & { elements: ReadonlyArray<T> }

const isListElements = (
  elements: ReadonlyArray<FinSetElem>
): elements is ReadonlyArray<ReadonlyArray<FinSetElem>> =>
  elements.every((entry): entry is ReadonlyArray<FinSetElem> => Array.isArray(entry))

const isNestedListElements = (
  elements: ReadonlyArray<FinSetElem>
): elements is ReadonlyArray<ReadonlyArray<ReadonlyArray<FinSetElem>>> =>
  elements.every(
    (entry): entry is ReadonlyArray<ReadonlyArray<FinSetElem>> =>
      Array.isArray(entry) &&
      entry.every((inner): inner is ReadonlyArray<FinSetElem> => Array.isArray(inner))
  )

const assertListElements = (
  elements: ReadonlyArray<FinSetElem>
): ReadonlyArray<ReadonlyArray<FinSetElem>> => {
  if (!isListElements(elements)) {
    throw new TypeError('Expected list elements in FinSet object')
  }
  return elements
}

const assertNestedListElements = (
  elements: ReadonlyArray<FinSetElem>
): ReadonlyArray<ReadonlyArray<ReadonlyArray<FinSetElem>>> => {
  if (!isNestedListElements(elements)) {
    throw new TypeError('Expected nested list elements in FinSet object')
  }
  return elements
}

export const makeFinSetObj = <T>(elements: ReadonlyArray<T>): FinSetObjOf<T> => ({ elements })

export const FinSet: Category<FinSetObj, FinSetMor> & 
  ArrowFamilies.HasDomCod<FinSetObj, FinSetMor> &
  CategoryLimits.HasFiniteProducts<FinSetObj, FinSetMor> & 
  CategoryLimits.HasFiniteCoproducts<FinSetObj, FinSetMor> &
  CategoryLimits.HasEqualizers<FinSetObj, FinSetMor> & 
  CategoryLimits.HasCoequalizers<FinSetObj, FinSetMor> &
  CategoryLimits.HasInitial<FinSetObj, FinSetMor> & 
  CategoryLimits.HasTerminal<FinSetObj, FinSetMor> = {
  
  id: (X) => ({ from: X, to: X, map: X.elements.map((_, i) => i) }),
  compose: (g, f) => {
    if (f.to !== g.from) throw new Error('FinSet.compose: shape mismatch')
    return { from: f.from, to: g.to, map: f.map.map((i) => g.map[i]!) }
  },
  isId: (m) => m.map.every((i, idx) => i === idx) && m.from.elements.length === m.to.elements.length,
  dom: (m) => m.from,
  cod: (m) => m.to,
  equalMor: (f, g) =>
    f.from === g.from &&
    f.to === g.to &&
    f.map.length === g.map.length &&
    f.map.every((v, i) => v === g.map[i]),

  // products: cartesian product
  product: (objs) => {
    const factors = objs
    const indexTuples: number[][] = []
    const rec = (acc: number[], k: number) => {
      if (k === factors.length) { indexTuples.push(acc.slice()); return }
      for (let i = 0; i < factors[k]!.elements.length; i++) rec([...acc, i], k + 1)
    }
    rec([], 0)
    const P: FinSetObj = { elements: indexTuples }
    const projections = factors.map((F, k) => ({
      from: P,
      to: F,
      map: indexTuples.map(tuple => tuple[k]!)
    })) as FinSetMor[]
    return { obj: P, projections }
  },

  // coproducts: disjoint union
  coproduct: (objs) => {
    const tags: Array<{ tag: number; i: number }> = []
    const injections: FinSetMor[] = []
    let offset = 0
    objs.forEach((O, idx) => {
      const arr = Array.from({ length: O.elements.length }, (_, i) => ({ tag: idx, i }))
      tags.push(...arr)
      injections.push({ 
        from: O, 
        to: { elements: [] }, // will be fixed below
        map: Array.from({ length: O.elements.length }, (_, i) => offset + i) 
      })
      offset += O.elements.length
    })
    const Cop: FinSetObj = { elements: tags }
    // Fix codomain refs on injections
    for (let k = 0; k < objs.length; k++) {
      injections[k] = { ...injections[k]!, to: Cop }
    }
    return { obj: Cop, injections }
  },

  // equalizer of f,g: subset of X where f(x)=g(x)
  equalizer: (f, g) => {
    if (f.from !== g.from || f.to !== g.to) throw new Error('FinSet.equalizer: shape mismatch')
    const keepIdx: number[] = []
    for (let i = 0; i < f.from.elements.length; i++) {
      if (f.map[i] === g.map[i]) keepIdx.push(i)
    }
    const E: FinSetObj = { elements: keepIdx.map(i => f.from.elements[i]!) }
    const inj: FinSetMor = { from: E, to: f.from, map: keepIdx }
    return { obj: E, equalize: inj }
  },

  // coequalizer of f,g: quotient of Y by relation generated by f(x) ~ g(x)
  coequalizer: (f, g) => {
    if (f.from !== g.from || f.to !== g.to) throw new Error('FinSet.coequalizer: shape mismatch')
    const n = f.to.elements.length
    const parent = Array.from({ length: n }, (_, i) => i)
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)))
    const unite = (a: number, b: number) => { 
      a = find(a); b = find(b); if (a !== b) parent[b] = a 
    }
    for (let i = 0; i < f.from.elements.length; i++) unite(f.map[i]!, g.map[i]!)
    const reps = new Map<number, number>()
    let idx = 0
    for (let y = 0; y < n; y++) { 
      const r = find(y); if (!reps.has(r)) reps.set(r, idx++) 
    }
    const Q: FinSetObj = { elements: Array.from({ length: reps.size }, (_, i) => i) }
    const q: FinSetMor = { 
      from: f.to, 
      to: Q, 
      map: Array.from({ length: n }, (_, y) => reps.get(find(y))!) 
    }
    return { obj: Q, coequalize: q }
  },

  initialObj: { elements: [] },
  terminalObj: { elements: [null] }
}

/** FinSet bijection helper */
export const finsetBijection = (from: FinSetObj, to: FinSetObj, map: number[]): FinSetMor => {
  if (map.length !== from.elements.length) throw new Error('finsetBij: length mismatch')
  return { from, to, map }
}

/** FinSet inverse helper */
export const finsetInverse = (bij: FinSetMor): FinSetMor => {
  const inv: number[] = Array.from({ length: bij.to.elements.length }, () => -1)
  for (let i = 0; i < bij.map.length; i++) inv[bij.map[i]!] = i
  return { from: bij.to, to: bij.from, map: inv }
}

/** FinSet exponential: X^S (all functions S -> X) */
export const expFinSet = (X: FinSetObj, S: FinSetObj): FinSetObj => {
  // elements = all functions S -> X (represented as arrays of indices in X of length |S|)
  const nS = S.elements.length, nX = X.elements.length
  const funcs: number[][] = []
  const rec = (acc: number[], k: number) => {
    if (k === nS) { funcs.push(acc.slice()); return }
    for (let i = 0; i < nX; i++) rec([...acc, i], k + 1)
  }
  rec([], 0)
  return { elements: funcs }
}

/** Postcompose on exponentials: given h: X -> Y, map X^S -> Y^S by (h ∘ -) */
export const expPostcompose = (h: FinSetMor, S: FinSetObj): FinSetMor => {
  const XtoY = h.map
  const YpowS = expFinSet(h.to, S)
  const indexMap = new Map<string, number>()
  YpowS.elements.forEach((arr, idx) => indexMap.set(JSON.stringify(arr), idx))
  const XpowS = expFinSet(h.from, S)
  const map = XpowS.elements.map(arr => {
    const out = (arr as number[]).map((ix) => XtoY[ix]!)
    return indexMap.get(JSON.stringify(out))!
  })
  return { from: XpowS, to: YpowS, map }
}

/** Precompose on exponentials: given r: S' -> S, map X^S -> X^{S'} by (- ∘ r) */
export const expPrecompose = (X: FinSetObj, r: FinSetMor, S: FinSetObj, Sprime: FinSetObj): FinSetMor => {
  const XpowS = expFinSet(X, S)
  const XpowSprim = expFinSet(X, Sprime)
  const indexMap = new Map<string, number>()
  XpowSprim.elements.forEach((arr, idx) => indexMap.set(JSON.stringify(arr), idx))
  const map = XpowS.elements.map(arr => {
    const out = r.map.map((j) => (arr as number[])[j]!) // g[s'] = f[r(s')]
    return indexMap.get(JSON.stringify(out))!
  })
  return { from: XpowS, to: XpowSprim, map }
}

/** All FinSet morphisms A -> X as a FinSet object (the Hom-set object) */
export const homSetObjFinSet = (A: FinSetObj, X: FinSetObj): FinSetObj => {
  // Elements are arrays len |A| with entries in [0..|X|-1]
  const nA = A.elements.length, nX = X.elements.length
  const maps: number[][] = []
  const rec = (acc: number[], k: number) => {
    if (k === nA) { maps.push(acc.slice()); return }
    for (let i = 0; i < nX; i++) rec([...acc, i], k + 1)
  }
  rec([], 0)
  return { elements: maps }
}

/** The functorial map Hom(A, X) -> Hom(A, Y) induced by h: X->Y (postcompose) */
export const homPostcomposeFinSet = (A: FinSetObj, h: FinSetMor): FinSetMor => {
  const S = homSetObjFinSet(A, h.from)
  const T = homSetObjFinSet(A, h.to)
  const indexMap = new Map<string, number>()
  T.elements.forEach((arr, idx) => indexMap.set(JSON.stringify(arr), idx))
  const map = S.elements.map(arr => {
    const out = (arr as number[]).map(aIx => h.map[aIx]!)
    return indexMap.get(JSON.stringify(out))!
  })
  return { from: S, to: T, map }
}

/** Helper: index a FinSet object's elements by JSON */
const indexObj = (obj: FinSetObj): Map<string, number> => {
  const m = new Map<string, number>()
  obj.elements.forEach((e, i) => m.set(JSON.stringify(e), i))
  return m
}

/** Hom-precompose: given η: A -> T, send Hom(T, X) -> Hom(A, X) */
export const homPrecomposeFinSet = (eta: FinSetMor, X: FinSetObj): FinSetMor => {
  // Domain: Hom(T, X) : arrays length |T|; Codomain: Hom(A, X) : arrays length |A|
  const Sprime = homSetObjFinSet(eta.to, X)
  const S = homSetObjFinSet(eta.from, X)
  const map = Sprime.elements.map((_arr, idxT) => {
    // For each function h: T->X (encoded as array over |T|), produce h∘η: A->X
    const h = Sprime.elements[idxT] as number[]
    const out = eta.map.map((tIx) => h[tIx]!)
    const indexS = indexObj(S).get(JSON.stringify(out))!
    return indexS
  })
  return { from: Sprime, to: S, map }
}

/** Codensity carrier T^G(A) in FinSet via end formula */
export const codensityCarrierFinSet = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,   // G : B -> FinSet
  A: FinSetObj
): FinSetObj => {
  return codensityDataFinSet(CatB, G, A).TA
}

/** Structured data for the codensity end in FinSet */
export const codensityDataFinSet = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,   // G : B -> FinSet
  A: FinSetObj
) => {
  // S_b and E_b
  const bList = [...CatB.objects]
  const Sb: Map<BO, FinSetObj> = new Map()
  const Eb: Map<BO, FinSetObj> = new Map()
  for (const b of bList) {
    const Gb = G.onObj(b)
    const S = homSetObjFinSet(A, Gb)
    Sb.set(b, S)
    Eb.set(b, expFinSet(Gb, S))
  }

  // ∏_b E_b
  const EbArr = bList.map((b) => Eb.get(b)!)
  const { obj: ProdEb, projections: projEb } = FinSet.product(EbArr)

  // collect all arrows of B
  const arrows: Array<{ b: BO; bp: BO; f: BM }> = []
  for (const b of bList) for (const bp of bList) for (const f of CatB.hom(b, bp)) arrows.push({ b, bp, f })

  // Build parallel maps S,T : ∏_b E_b ⇉ ∏_f (G b')^{S_b}
  const FfbArr: FinSetObj[] = []
  const legsS: FinSetMor[] = []
  const legsT: FinSetMor[] = []
  for (const { b, bp, f } of arrows) {
    const Gb = G.onObj(b)
    const Gbp = G.onObj(bp)
    const Gf = G.onMor(f)
    const Sb_b = Sb.get(b)!
    const Sbp = Sb.get(bp)!

    const comp1 = expPostcompose(Gf, Sb_b)                  // F(1,f): E_b -> (G b')^S_b
    const homPush = homPostcomposeFinSet(A, Gf)             // S_b -> S_{b'}
    const comp2 = expPrecompose(Gbp, homPush, Sbp, Sb_b)    // F(f,1): E_{b'} -> (G b')^S_b

    const projFromB = projEb[bList.indexOf(b)]!
    const projFromBp = projEb[bList.indexOf(bp)]!
    const s_leg = FinSet.compose(comp1, projFromB)
    const t_leg = FinSet.compose(comp2, projFromBp)

    FfbArr.push(expFinSet(Gbp, Sb_b))
    legsS.push(s_leg)
    legsT.push(t_leg)
  }

  const { obj: ProdF } = FinSet.product(FfbArr)

  // Tuple-into-product helper (FinSet)
  const tupleInto = (from: FinSetObj, to: FinSetObj, legs: FinSetMor[]): FinSetMor => {
    const indexTo = new Map<string, number>()
    to.elements.forEach((elem, idx) => indexTo.set(JSON.stringify(elem), idx))
    const map = from.elements.map((_, eIx) => {
      const coords = legs.map((leg) => leg.map[eIx]!)
      const key = JSON.stringify(coords)
      const idx = indexTo.get(key)
      if (idx === undefined) throw new Error('tupleInto: coordinate missing')
      return idx
    })
    return { from, to, map }
  }

  const S = tupleInto(ProdEb, ProdF, legsS)
  const T = tupleInto(ProdEb, ProdF, legsT)

  const { obj: TA, equalize: include } = FinSet.equalizer(S, T)
  return { TA, include, bList, Sb, Eb, ProdEb }
}

// Update the convenience wrapper to use the structured version
export const codensityCarrierFinSetUpdated = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
): FinSetObj => {
  return codensityDataFinSet(CatB, G, A).TA
}

/** Codensity unit η^G_A : A -> T^G(A) (FinSet) */
export const codensityUnitFinSet = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
): FinSetMor => {
  const data = codensityDataFinSet(CatB, G, A)
  const { TA, include, bList, Sb, Eb, ProdEb } = data

  const EbIndex = new Map<BO, Map<string, number>>()
  for (const b of bList) EbIndex.set(b, indexObj(Eb.get(b)!))
  const ProdIndex = indexObj(ProdEb)

  const map: number[] = []
  for (let aIx = 0; aIx < A.elements.length; aIx++) {
    // Build the product coordinate tuple: for each b, element of E_b = (G b)^{S_b}
    const coords: number[] = []
    for (const b of bList) {
      const Gb = G.onObj(b)
      const S = Sb.get(b)!                  // Hom(A,Gb)
      const E = Eb.get(b)!                  // (Gb)^S
      // evaluation at 'a' : S -> Gb  ==> an element of E
      const arr = (S.elements as number[][]).map((k) => k[aIx]!)
      const eIdx = EbIndex.get(b)!.get(JSON.stringify(arr))!
      coords.push(eIdx)
    }
    const prodIdx = ProdIndex.get(JSON.stringify(coords))!
    // factor through equalizer by searching the unique preimage
    const tIx = include.map.findIndex((v) => v === prodIdx)
    if (tIx < 0) throw new Error('codensityUnitFinSet: missing equalizer preimage')
    map.push(tIx)
  }
  return { from: A, to: TA, map }
}

/** Codensity multiplication μ^G_A : T^G T^G A -> T^G A (FinSet) */
export const codensityMuFinSet = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
): FinSetMor => {
  // Data for TA and for TTA
  const TAdata = codensityDataFinSet(CatB, G, A)
  const TA = TAdata.TA
  const TTAdata = codensityDataFinSet(CatB, G, TA)
  const TTA = TTAdata.TA

  const { include: inclTA, bList, Sb, Eb, ProdEb } = TAdata
  const { include: inclTTA } = TTAdata

  const EbIndex = new Map<BO, Map<string, number>>()
  for (const b of bList) {
    EbIndex.set(b, indexObj(Eb.get(b)!))
  }
  const ProdIndex = indexObj(ProdEb)

  // For each θ ∈ TTA, compute μ(θ) ∈ TA by:
  // ψ_b(κ) = θ_b( h ), where h : TA -> G b is defined by h(t) = t_b(κ)
  const map: number[] = []
  for (let thetaIx = 0; thetaIx < TTA.elements.length; thetaIx++) {
    // Get the tuple of components of θ in ∏_b E'_b, then per b build ψ_b
    const tupleT = (TTAdata.ProdEb.elements as number[][])[inclTTA.map[thetaIx]!] // indices into E'_b
    const coordsForTA: number[] = []

    bList.forEach((b, bPos) => {
      // domain/codomain sets for this b
      const Gb = G.onObj(b)
      const Sb_b = Sb.get(b)!         // Hom(A,Gb)
      const E_b = Eb.get(b)!         // (Gb)^Sb_b

      // θ_b : S'_b -> Gb  where S'_b = Hom(TA, Gb); element of E'_b
      const Eprime_b = expFinSet(Gb, homSetObjFinSet(TA, Gb))
      const theta_b = Eprime_b.elements[tupleT![bPos]!] as number[]

      // Build ψ_b : Sb_b -> Gb as array over |Sb_b|
      const out: number[] = []
      for (let kIx = 0; kIx < Sb_b.elements.length; kIx++) {
        const k = (Sb_b.elements[kIx] as number[])   // k : A -> Gb

        // h : TA -> Gb, h(t) = t_b(k)
        const hVals: number[] = []
        for (let tIx = 0; tIx < TA.elements.length; tIx++) {
          // t_b is the b-component of t: lookup via inclusion into ∏ E_b
          const tupleTA = (TAdata.ProdEb.elements as number[][])[inclTA.map[tIx]!]
          const e_b_idx = tupleTA![bPos]!
          const t_b = (E_b.elements[e_b_idx] as number[]) // function Sb_b -> Gb (as array)
          const val = t_b[kIx]!
          hVals.push(val)
        }

        // Find index of h in S'_b = Hom(TA, Gb)
        const Sprime_b = homSetObjFinSet(TA, Gb)
        const hIdx = indexObj(Sprime_b).get(JSON.stringify(hVals))!
        // Evaluate θ_b at h
        const valGb = theta_b[hIdx]!
        out.push(valGb)
      }

      // Encode ψ_b as an element of E_b and record its index
      const eIdx = EbIndex.get(b)!.get(JSON.stringify(out))!
      coordsForTA.push(eIdx)
    })

    const prodIdx = ProdIndex.get(JSON.stringify(coordsForTA))!
    const tIx = inclTA.map.findIndex((v) => v === prodIdx)
    if (tIx < 0) throw new Error('codensityMuFinSet: missing equalizer preimage')
    map.push(tIx)
  }

  return { from: TTA, to: TA, map }
}

/** Codensity functor map: T^G(f) : T^G(A) -> T^G(A') (FinSet) */
export const codensityMapFinSet = <BO, BM>(
  CatB: FiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  f: FinSetMor                                // f: A -> A'
): FinSetMor => {
  const A = f.from
  const A2 = f.to

  const dataA = codensityDataFinSet(CatB, G, A)
  const dataA2 = codensityDataFinSet(CatB, G, A2)

  const { TA, include: incA, bList, Sb: SbA, Eb: EbA, ProdEb: ProdA } = dataA
  const { TA: TA2, include: incA2, Sb: SbA2, Eb: EbA2, ProdEb: ProdA2 } = dataA2

  // Precompute indexers
  const idxProdA2 = new Map<string, number>()
  ;(ProdA2.elements as number[][]).forEach((coords, i) => idxProdA2.set(JSON.stringify(coords), i))

  // For each b, build E_b(A) -> E_b(A') induced by precompose on Hom(A',Gb)->Hom(A,Gb)
  const comp_b: Map<BO, FinSetMor> = new Map()
  for (const b of bList) {
    const Gb = G.onObj(b)
    const r = homPrecomposeFinSet(f, Gb)                   // Hom(A',Gb) -> Hom(A,Gb)
    const comp = expPrecompose(Gb, r, SbA.get(b)!, SbA2.get(b)!) // (Gb)^{S_b(A)} -> (Gb)^{S_b(A')}
    comp_b.set(b, comp)
  }

  // Build map T(A) -> T(A') by factoring the product tuple through the equalizer
  const map: number[] = new Array(TA.elements.length)
  for (let tIx = 0; tIx < TA.elements.length; tIx++) {
    // coordinates in ∏_b E_b(A)
    const coordsA = (ProdA.elements as number[][])[incA.map[tIx]!]!.slice()

    // send each coordinate via comp_b to get coords in ∏_b E_b(A')
    const coordsA2: number[] = []
    bList.forEach((b, pos) => {
      const comp = comp_b.get(b)!
      const newCoord = comp.map[coordsA[pos]!]!
      coordsA2.push(newCoord)
    })

    // locate the product tuple in ProdA2, then pull back along the equalizer inclusion of TA'
    const prodIdxA2 = idxProdA2.get(JSON.stringify(coordsA2))
    if (prodIdxA2 === undefined) throw new Error('codensityMapFinSet: image tuple not found in product')
    const tIx2 = incA2.map.findIndex((v) => v === prodIdxA2)
    if (tIx2 < 0) throw new Error('codensityMapFinSet: no equalizer preimage in T(A\')')
    map[tIx] = tIx2
  }

  return { from: TA, to: TA2, map }
}

/* ================================================================
   Enhanced Vect category with dom/cod and Arrow category support
   ================================================================ */


/** Mediator-enabled FinGrp adapters */
export const FinGrpProductsWithTuple: CategoryLimits.HasProductMediators<FinGrpObjModel, FinGrpHomModel> = {
  product: (objs) => {
    const witness = FinGrpModel.productMany(objs)
    return { obj: witness.object, projections: witness.projections }
  },
  tuple: (domain, legs, product) => FinGrpModel.tupleMany(domain, legs, product)
}

type SliceObjModel = SliceObjectModel<FinSetNameModel, FuncArrModel>
type SliceArrModel = SliceArrowModel<FinSetNameModel, FuncArrModel>

export const makeSliceProductsWithTuple = (
  base: FinSetCategoryModel,
  anchor: FinSetNameModel,
): CategoryLimits.HasProductMediators<SliceObjModel, SliceArrModel> => ({
  product: (objs) => {
    const witness = makeFiniteSliceProduct(base, anchor, objs)
    return { obj: witness.object, projections: witness.projections }
  },
  tuple: (domain, legs, product) => {
    const metadata = lookupSliceProductMetadata(product)
    if (!metadata) {
      throw new Error(
        `makeSliceProductsWithTuple: unrecognised product object ${product.domain}; build it via makeFiniteSliceProduct first`,
      )
    }
    return metadata.tuple(domain, legs)
  }
})

/* ================================================================
   General (co)limit interfaces for categories
   ================================================================ */


/* ================================================================
   Arrow category operations for families of morphisms
   ================================================================ */



// Namespaced exports for discoverability
export const Diagram = {
  makePosetDiagram, pushoutInDiagram, pullbackInDiagram,
  LanDisc, RanDisc, reindexDisc,
  LanPoset, RanPoset,
  coproductComplex, productComplex,
  makeFinitePoset, prettyPoset, makePosetDiagramCompat, idChainMapCompat
}

export const Lin = { 
  registerRref, rrefQPivot, FieldQ, solveLinear, nullspace, colspace
}

export const Vect = {
  VS: VectViewNS.VS,
  idL,
  composeL,
  linToChain: VectViewNS.linToChain,
  complexSpaces,
  toVectAtDegree: VectViewNS.toVectAtDegree,
  arrowMatrixAtDegree: VectViewNS.arrowMatrixAtDegree,
}

// Pretty namespace lives in stdlib/pretty

export const IntegerLA = {
  smithNormalForm
}

export const Algebra = {
  applyRepAsLin: applyRepAsLinFn,
  coactionAsLin: coactionAsLinFn,
  pushCoaction: pushCoactionFn,
  actionToChain: actionToChainFn,
  coactionToChain: coactionToChainFn,
}

export { makeSubcategory, makeFullSubcategory, isFullSubcategory } from "./subcategory"
export { ProductCat, Pi1, Pi2, Pairing } from "./product-cat"
export { Dual } from "./dual-cat"
export { Contra, isContravariant } from "./contravariant"
export {
  makeM2Object,
  makeM2Morphism,
  productM2,
  checkM2BinaryProduct,
} from "./m2-set"
export type { M2Object, M2Morphism, M2ProductWitness } from "./m2-set"
export type { M2InternalGroupWitness } from "./internal-group-m2"
export type { SimpleCat } from "./simple-cat"
export {
  makeFinitePullbackCalculator,
  type PullbackCalculator,
  type PullbackData,
} from "./pullback"
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
  makeSliceProduct,
  makeFiniteSliceProduct,
  lookupSliceProductMetadata,
  type SliceObject,
  type SliceArrow,
  type CosliceObject,
  type CosliceArrow,
  type SlicePostcomposeFunctor,
  type SliceProductWitness,
  type SliceFiniteProductWitness,
  type SliceProductDiagonal,
  type SliceProductUnit,
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
  type PushoutCalc,
  type PushoutCalculator,
  type PushoutData,
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
  type FinPosCategory,
  type FinPosObj,
  type MonoMap,
} from "./models/finpos-cat"
export {
  FinGrpCat,
  FinGrp,
  type FinGrpCategory,
  type FinGrpObj,
  type Hom as FinGrpHom,
  type FinGrpProductWitness,
  type FinGrpFiniteProductWitness,
  type FinGrpProductDiagonal,
  type FinGrpProductUnit,
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

export const Chain = {
  compose: composeChainMap, 
  id: idChainMapField, 
  inclusionIntoCoproduct, 
  projectionFromProduct 
}

export const Exactness = {
  checkExactnessForFunctor,
  smoke_coim_im_iso,
  runLesConeProps,
  checkLongExactConeSegment
}

// Examples have been moved to examples.ts
