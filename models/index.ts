export {
  FinSetCat,
  type FinSetName,
  type FuncArr,
  type FinSetCategory,
  isInjective,
  isSurjective,
} from "./finset-cat"

export {
  buildLeftInverseForInjective,
  buildRightInverseForSurjective,
} from "./finset-inverses"

export {
  FinPosCat,
  FinPos,
  type FinPosCategory,
  type FinPosObj,
  type MonoMap,
} from "./finpos-cat"

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
} from "./fingroup-cat"

export {
  makeToyNonEpicProductCategory,
  type ToyArrow,
  type ToyNonEpicProductCategory,
  type ToyObject,
} from "./toy-non-epi-product"

export {
  kernelElements,
  nonMonoWitness as finGrpNonMonoWitness,
  type KernelWitness as FinGrpKernelWitness,
} from "./fingroup-kernel"

export {
  finGrpKernelEqualizer,
  finGrpFactorThroughKernelEqualizer,
  finGrpKernelEqualizerComparison,
  type FinGrpKernelEqualizerWitness,
  type FinGrpKernelEqualizerComparison,
} from "./fingroup-equalizer"
