export {
  VectView,
  applyRepAsLin,
  coactionAsLin,
  pushCoaction,
  actionToChain,
  coactionToChain,
} from "../../stdlib/vect-view"

export type { Representation, Coaction } from "../../stdlib/vect-view"

export {
  makeFinGrpRepresentationFunctor,
  makeFinGrpProductRepresentation,
  functorToFinGrpRepresentation,
} from "../../models/fingroup-representation"

export type {
  FinGrpRepresentationFunctor,
  RepMor as FinGrpRepresentationMorphism,
} from "../../models/fingroup-representation"

export { Pretty } from "../../stdlib/pretty"
export { DiagramClosure } from "../../stdlib/diagram-closure"
export { DiagramLaws } from "../../stdlib/diagram-laws"
export { IndexedFamilies } from "../../stdlib/indexed-families"
export { IntSNF } from "../../stdlib/int-snf"
export { FP_CATALOG } from "../../stdlib/catalog"

export { ArrowFamilies } from "../../stdlib/arrow-families"
export { CategoryLimits } from "../../stdlib/category-limits"
export { EnhancedVect } from "../../stdlib/enhanced-vect"

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
  CoreAdjunction,
} from "../../stdlib/category"

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
  CoreAdjunction,
}

export type FiniteCategory<O, M> = FiniteCategoryT<O, M>
export type CFunctor<BO, BM, AO, AM> = CFunctorT<BO, BM, AO, AM>
export type CatMonad<C> = CatMonadT<C>

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
  checkPushforwardMonadLaws,
} from "../../stdlib/category"

export const FiniteCategory = FiniteCategorySymbol
export const CFunctor = CFunctorSymbol
export const CatMonad = CatMonadSymbol

export {
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
  checkPushforwardMonadLaws,
}
