export {
  makeFinitePullbackCalculator,
  type PullbackCalculator,
  type PullbackData,
} from "../pullback"

export {
  makeReindexingFunctor,
  type ReindexingFunctor,
} from "../reindexing"

export {
  checkReindexIdentityLaw,
  checkReindexCompositionLaw,
  sampleSlice,
  type SliceSamples,
} from "../reindexing-laws"

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
} from "../slice-cat"

export {
  makeSliceTripleArrow,
  composeSliceTripleArrows,
  idSliceTripleArrow,
  sliceArrowToTriple,
  sliceTripleToArrow,
  type SliceTripleArrow,
  type SliceTripleObject,
} from "../slice-triple"

export {
  makeCosliceTripleArrow,
  composeCosliceTripleArrows,
  idCosliceTripleArrow,
  cosliceArrowToTriple,
  cosliceTripleToArrow,
  type CosliceTripleArrow,
  type CosliceTripleObject,
} from "../coslice-triple"

export {
  makeCoslicePrecomposition,
  type CoslicePrecomposition,
} from "../coslice-precompose"

export {
  makeFinitePushoutCalc,
  makeFinitePushoutCalculator,
  type PushoutCalc,
  type PushoutCalculator,
  type PushoutData,
} from "../pushout"

export { makeToyPushouts } from "../pushout-toy"

export {
  makeCosliceReindexingFunctor,
  type CosliceReindexingFunctor,
} from "../coslice-reindexing"
