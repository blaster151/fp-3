import type { FiniteCategory } from "../finite-cat"
import { isEpi, isMono } from "../kinds/mono-epi"
import { leftInverses, rightInverses, twoSidedInverses } from "../kinds/inverses"
import { isIso } from "../kinds/iso"
import { prettyArrow } from "../pretty"

type AnyCat = FiniteCategory<unknown, unknown>
type AnyArr = unknown

export interface ArrowOracle {
  readonly id: string
  readonly title: string
  readonly applies: (input: { cat: AnyCat; arrow: AnyArr }) => boolean
  readonly check: (input: { cat: AnyCat; arrow: AnyArr }) => boolean
  readonly explain: (input: { cat: AnyCat; arrow: AnyArr }) => string
}

const decorate = (cat: AnyCat) => ({
  ...cat,
  isMono: (arrow: AnyArr) => isMono(cat, arrow),
  isEpi: (arrow: AnyArr) => isEpi(cat, arrow),
})

const arrowLabel = (cat: AnyCat, arrow: AnyArr): string => prettyArrow(decorate(cat), arrow)

export const LeftInverseImpliesMono: ArrowOracle = {
  id: "LeftInverseImpliesMono",
  title: "Left inverse ⇒ monomorphism",
  applies: ({ cat, arrow }) => leftInverses(cat, arrow).length > 0,
  check: ({ cat, arrow }) => isMono(cat, arrow),
  explain: ({ cat, arrow }) =>
    `${arrowLabel(cat, arrow)} has a left inverse, therefore it must be monic.`,
}

export const RightInverseImpliesEpi: ArrowOracle = {
  id: "RightInverseImpliesEpi",
  title: "Right inverse ⇒ epimorphism",
  applies: ({ cat, arrow }) => rightInverses(cat, arrow).length > 0,
  check: ({ cat, arrow }) => isEpi(cat, arrow),
  explain: ({ cat, arrow }) =>
    `${arrowLabel(cat, arrow)} has a right inverse, so it is necessarily epic.`,
}

export const IsoIsMonoAndEpi: ArrowOracle = {
  id: "IsoIsMonoAndEpi",
  title: "Isomorphisms are mono and epi",
  applies: ({ cat, arrow }) => twoSidedInverses(cat, arrow).length > 0,
  check: ({ cat, arrow }) => isMono(cat, arrow) && isEpi(cat, arrow),
  explain: ({ cat, arrow }) =>
    `${arrowLabel(cat, arrow)} admits a two-sided inverse, so it is both monic and epic.`,
}

export const MonoWithRightInverseIsIso: ArrowOracle = {
  id: "MonoWithRightInverseIsIso",
  title: "Monic with right inverse ⇒ isomorphism",
  applies: ({ cat, arrow }) =>
    isMono(cat, arrow) && rightInverses(cat, arrow).length > 0,
  check: ({ cat, arrow }) => isIso(cat, arrow),
  explain: ({ cat, arrow }) =>
    `${arrowLabel(cat, arrow)} is monic and has a right inverse, therefore Theorem 22 upgrades it to an isomorphism.`,
}

export const EpiWithLeftInverseIsIso: ArrowOracle = {
  id: "EpiWithLeftInverseIsIso",
  title: "Epic with left inverse ⇒ isomorphism",
  applies: ({ cat, arrow }) =>
    isEpi(cat, arrow) && leftInverses(cat, arrow).length > 0,
  check: ({ cat, arrow }) => isIso(cat, arrow),
  explain: ({ cat, arrow }) =>
    `${arrowLabel(cat, arrow)} is epic and admits a left inverse, so it must be an isomorphism.`,
}
