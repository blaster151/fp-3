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
} from "../optics/lens-prism"

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
} from "../optics/optional-traversal"

export type { Optional, Traversal } from "../optics/optional-traversal"
