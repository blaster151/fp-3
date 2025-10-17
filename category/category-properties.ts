export { isMono, isEpi } from "../kinds/mono-epi"
export { withMonoEpiCache, type MonoEpiCache } from "../kinds/mono-epi-cache"
export {
  identityIsMono,
  identityIsEpi,
  composeMonosAreMono,
  composeEpisAreEpi,
  rightFactorOfMono,
  leftFactorOfEpi,
  saturateMonoEpi,
  type MonoEpiClosure,
} from "../kinds/mono-epi-laws"
export { forkCommutes, isMonoByForks } from "../kinds/fork"
export {
  leftInverses,
  rightInverses,
  hasLeftInverse,
  hasRightInverse,
  twoSidedInverses,
  isIso as isIsoByInverseSearch,
} from "../kinds/inverses"
export { type CatTraits } from "../kinds/traits"
export { arrowGlyph, prettyArrow } from "../pretty"
export { isMonoByGlobals, type HasTerminal } from "../traits/global-elements"
export {
  checkGeneralizedElementSeparation,
  type GeneralizedElementAnalysis,
  type GeneralizedElementFailure,
  type GeneralizedElementOptions,
  type GeneralizedElementWitness,
  type HasGeneralizedElements,
} from "../traits/generalized-elements"
export {
  checkPointSeparator,
  checkWellPointedness,
  type ParallelPair,
  type PointSeparatorAnalysis,
  type PointSeparatorFailure,
  type PointSeparatorWitness,
  type WellPointednessAnalysis,
} from "../traits/well-pointedness"
export { nonEpiWitnessInSet, type NonEpiWitness } from "../kinds/epi-witness-set"
