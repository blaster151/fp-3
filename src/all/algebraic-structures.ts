export type { NonEmptyArray } from "../../stdlib/nonempty-array"
export { fromArrayNE, headNE, tailNE, mapNE } from "../../stdlib/nonempty-array"

export type { Semigroup, Monoid } from "../../stdlib/monoid"
export {
  SemigroupString,
  MonoidString,
  SemigroupArray,
  MonoidArray,
  concatAll,
  concatNE,
} from "../../stdlib/monoid"

export type { Endo } from "../../stdlib/endo"
export { MonoidEndo, applyEdits } from "../../stdlib/endo"
