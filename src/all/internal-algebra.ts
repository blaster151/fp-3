export {
  analyzeInternalGroup,
  checkInternalGroupAssociativity,
  checkInternalGroupInversion,
  checkInternalGroupUnit,
  enrichInternalGroupDiagonal,
} from "../../internal-group"

export type {
  InternalGroupAnalysis,
  CategoryOps as InternalGroupCategoryOps,
  InternalGroupWitness as InternalGroupWitness,
  TerminalWitness as InternalGroupTerminalWitness,
} from "../../internal-group"

export {
  analyzeInternalMonoid,
  checkInternalMonoidAssociativity,
  checkInternalMonoidUnit,
  enrichInternalMonoidDiagonal,
} from "../../internal-monoid"

export type {
  InternalMonoidAnalysis,
  InternalMonoidWitness as InternalMonoidWitness,
} from "../../internal-monoid"

export {
  analyzeFinGrpInternalGroup,
  analyzeFinGrpInternalMonoid,
  makeFinGrpInternalGroupWitness,
  makeFinGrpInternalMonoidWitness,
} from "../../internal-group-fingrp"

export type {
  FinGrpInternalGroupWitness,
  FinGrpInternalGroupAnalysis,
  FinGrpInternalMonoidAnalysis,
  FinGrpInternalMonoidWitness,
} from "../../internal-group-fingrp"

export {
  analyzeM2InternalGroup,
  analyzeM2InternalMonoid,
  checkM2InternalGroupCompatibility,
  checkM2InternalMonoidCompatibility,
  makeM2InternalGroupWitness,
  makeM2InternalMonoidWitness,
} from "../../internal-group-m2"

export type {
  M2InternalGroupAnalysis,
  M2InternalGroupCompatibilityResult,
  M2InternalMonoidAnalysis,
  M2InternalMonoidCompatibilityResult,
  M2InternalMonoidWitness,
} from "../../internal-group-m2"

export {
  analyzeTopInternalGroup,
  analyzeTopInternalMonoid,
  makeTopInternalGroupWitness,
  makeTopInternalMonoidWitness,
} from "../../internal-group-top"

export type {
  TopInternalGroupInput,
  TopInternalGroupWitness,
  TopInternalGroupAnalysis,
  TopInternalMonoidInput,
  TopInternalMonoidWitness,
  TopInternalMonoidAnalysis,
} from "../../internal-group-top"

export {
  analyzeSetInternalGroup,
  analyzeSetInternalMonoid,
  makeSetInternalGroupWitness,
  makeSetInternalMonoidWitness,
} from "../../internal-group-set"

export type {
  SetInternalGroupInput,
  SetInternalGroupWitness,
  SetInternalGroupAnalysis,
  SetInternalMonoidInput,
  SetInternalMonoidWitness,
  SetInternalMonoidAnalysis,
} from "../../internal-group-set"

export {
  analyzeManInternalGroup,
  analyzeManInternalMonoid,
  makeManInternalGroupWitness,
  makeManInternalMonoidWitness,
} from "../../internal-group-man"

export type {
  ManInternalGroupInput,
  ManInternalGroupWitness,
  ManInternalGroupAnalysis,
  ManInternalMonoidInput,
  ManInternalMonoidWitness,
  ManInternalMonoidAnalysis,
  SmoothnessWitness as ManInternalGroupSmoothness,
} from "../../internal-group-man"
