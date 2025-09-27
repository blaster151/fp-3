import type { FiniteCategory } from "../finite-cat"
import { pushUnique } from "../finite-cat"

type InverseAwareCategory<Obj, Arr> = FiniteCategory<Obj, Arr> & {
  readonly splitMonoWitness?: (arrow: Arr) => Arr
  readonly splitEpiWitness?: (arrow: Arr) => Arr
  readonly candidatesToInvert?: (arrow: Arr) => readonly Arr[]
}

const collectCandidates = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
  predicate: (candidate: Arr) => boolean,
): Arr[] => {
  const matches: Arr[] = []
  for (const candidate of category.arrows) {
    if (predicate(candidate)) matches.push(candidate)
  }
  return matches
}

export const rightInverses = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): Arr[] => {
  const target = category.dst(arrow)
  const source = category.src(arrow)
  const identity = category.id(target)
  const matches = collectCandidates(category, arrow, (candidate) => {
    if (category.src(candidate) !== target) return false
    if (category.dst(candidate) !== source) return false
    const composite = category.compose(arrow, candidate)
    return category.eq(composite, identity)
  })
  const enriched = category as InverseAwareCategory<Obj, Arr>
  const candidateList = enriched.candidatesToInvert?.(arrow) ?? []
  for (const candidate of candidateList) {
    if (category.src(candidate) !== target) continue
    if (category.dst(candidate) !== source) continue
    const composite = category.compose(arrow, candidate)
    if (category.eq(composite, identity)) {
      pushUnique(matches, candidate, category.eq)
    }
  }
  if (enriched.splitEpiWitness) {
    try {
      const witness = enriched.splitEpiWitness(arrow)
      pushUnique(matches, witness, category.eq)
    } catch (error) {
      // ignore categories that decline to provide a witness
    }
  }
  return matches
}

export const leftInverses = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): Arr[] => {
  const target = category.dst(arrow)
  const source = category.src(arrow)
  const identity = category.id(source)
  const matches = collectCandidates(category, arrow, (candidate) => {
    if (category.src(candidate) !== target) return false
    if (category.dst(candidate) !== source) return false
    const composite = category.compose(candidate, arrow)
    return category.eq(composite, identity)
  })
  const enriched = category as InverseAwareCategory<Obj, Arr>
  const candidateList = enriched.candidatesToInvert?.(arrow) ?? []
  for (const candidate of candidateList) {
    if (category.src(candidate) !== target) continue
    if (category.dst(candidate) !== source) continue
    const composite = category.compose(candidate, arrow)
    if (category.eq(composite, identity)) {
      pushUnique(matches, candidate, category.eq)
    }
  }
  if (enriched.splitMonoWitness) {
    try {
      const witness = enriched.splitMonoWitness(arrow)
      pushUnique(matches, witness, category.eq)
    } catch (error) {
      // category could not provide a split mono witness; ignore
    }
  }
  return matches
}

export const hasRightInverse = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): boolean => rightInverses(category, arrow).length > 0

export const hasLeftInverse = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): boolean => leftInverses(category, arrow).length > 0

export const twoSidedInverses = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): Arr[] => {
  const lefts = leftInverses(category, arrow)
  if (lefts.length === 0) return []
  const rights = rightInverses(category, arrow)
  if (rights.length === 0) return []
  return lefts.filter((candidate) => rights.some((right) => category.eq(candidate, right)))
}

export const isIso = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  arrow: Arr,
): boolean => twoSidedInverses(category, arrow).length > 0
