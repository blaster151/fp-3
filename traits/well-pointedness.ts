import type { FiniteCategory } from "../finite-cat"
import type { HasTerminal } from "./global-elements"

export interface ParallelPair<Arr> {
  readonly left: Arr
  readonly right: Arr
}

export interface PointSeparatorWitness<Obj, Arr> {
  readonly domain: Obj
  readonly codomain: Obj
  readonly left: Arr
  readonly right: Arr
  readonly point: Arr
  readonly leftComposite: Arr
  readonly rightComposite: Arr
}

export interface DomainMismatchFailure<Obj> {
  readonly kind: "domainMismatch"
  readonly leftDomain: Obj
  readonly rightDomain: Obj
}

export interface CodomainMismatchFailure<Obj> {
  readonly kind: "codomainMismatch"
  readonly leftCodomain: Obj
  readonly rightCodomain: Obj
}

export interface NoPointsFailure<Obj> {
  readonly kind: "noPoints"
  readonly domain: Obj
  readonly terminal: Obj
}

export interface IndistinguishableFailure<Obj> {
  readonly kind: "indistinguishable"
  readonly domain: Obj
  readonly codomain: Obj
}

export interface NoSeparatorFailure<Obj, Arr> {
  readonly kind: "noSeparator"
  readonly domain: Obj
  readonly codomain: Obj
  readonly left: Arr
  readonly right: Arr
}

export type PointSeparatorFailure<Obj, Arr> =
  | DomainMismatchFailure<Obj>
  | CodomainMismatchFailure<Obj>
  | NoPointsFailure<Obj>
  | IndistinguishableFailure<Obj>
  | NoSeparatorFailure<Obj, Arr>

export interface PointSeparatorAnalysis<Obj, Arr> {
  readonly holds: boolean
  readonly details: string
  readonly witness?: PointSeparatorWitness<Obj, Arr>
  readonly failure?: PointSeparatorFailure<Obj, Arr>
}

export function checkPointSeparator<Obj, Arr>(
  category: FiniteCategory<Obj, Arr> & HasTerminal<Obj, Arr>,
  left: Arr,
  right: Arr,
): PointSeparatorAnalysis<Obj, Arr> {
  const leftDomain = category.src(left)
  const rightDomain = category.src(right)
  if (leftDomain !== rightDomain) {
    return {
      holds: false,
      details: `checkPointSeparator: arrows must share a domain; received ${String(leftDomain)} and ${String(rightDomain)}`,
      failure: { kind: "domainMismatch", leftDomain, rightDomain },
    }
  }

  const leftCodomain = category.dst(left)
  const rightCodomain = category.dst(right)
  if (leftCodomain !== rightCodomain) {
    return {
      holds: false,
      details: `checkPointSeparator: arrows must share a codomain; received ${String(leftCodomain)} and ${String(rightCodomain)}`,
      failure: { kind: "codomainMismatch", leftCodomain, rightCodomain },
    }
  }

  const domain = leftDomain
  const codomain = leftCodomain
  const terminal = category.one()
  const points = category
    .globals(domain)
    .filter((candidate) => category.src(candidate) === terminal && category.dst(candidate) === domain)

  if (points.length === 0) {
    if (!category.eq(left, right)) {
      return {
        holds: false,
        details: `checkPointSeparator: ${String(domain)} has no terminal points to probe ${String(codomain)}`,
        failure: { kind: "noPoints", domain, terminal },
      }
    }
    return {
      holds: false,
      details: `checkPointSeparator: ${String(domain)} has no terminal points, but the arrows are already equal`,
      failure: { kind: "indistinguishable", domain, codomain },
    }
  }

  for (const point of points) {
    const leftComposite = category.compose(left, point)
    const rightComposite = category.compose(right, point)
    if (!category.eq(leftComposite, rightComposite)) {
      return {
        holds: true,
        details: `checkPointSeparator: point ${String(point)} distinguishes the sampled arrows`,
        witness: { domain, codomain, left, right, point, leftComposite, rightComposite },
      }
    }
  }

  if (category.eq(left, right)) {
    return {
      holds: false,
      details: `checkPointSeparator: sampled arrows agree on every terminal point of ${String(domain)}`,
      failure: { kind: "indistinguishable", domain, codomain },
    }
  }

  return {
    holds: false,
    details: `checkPointSeparator: no terminal point distinguishes the sampled arrows ${String(left)} and ${String(right)}`,
    failure: { kind: "noSeparator", domain, codomain, left, right },
  }
}

export interface WellPointednessAnalysis<Obj, Arr> {
  readonly holds: boolean
  readonly details: string
  readonly witnesses: ReadonlyArray<PointSeparatorWitness<Obj, Arr>>
  readonly failures: ReadonlyArray<PointSeparatorFailure<Obj, Arr>>
  readonly indistinguishable: ReadonlyArray<IndistinguishableFailure<Obj>>
}

export function checkWellPointedness<Obj, Arr>(
  category: FiniteCategory<Obj, Arr> & HasTerminal<Obj, Arr>,
  pairs: ReadonlyArray<ParallelPair<Arr>>,
): WellPointednessAnalysis<Obj, Arr> {
  const witnesses: Array<PointSeparatorWitness<Obj, Arr>> = []
  const failures: Array<PointSeparatorFailure<Obj, Arr>> = []
  const indistinguishable: Array<IndistinguishableFailure<Obj>> = []

  for (const { left, right } of pairs) {
    const analysis = checkPointSeparator(category, left, right)
    if (analysis.holds) {
      if (analysis.witness) witnesses.push(analysis.witness)
      continue
    }
    if (!analysis.failure) continue
    if (analysis.failure.kind === "indistinguishable") {
      indistinguishable.push(analysis.failure)
    } else {
      failures.push(analysis.failure)
    }
  }

  const holds = failures.length === 0
  const details = holds
    ? `checkWellPointedness: all ${pairs.length} sampled parallel pairs were separated by terminal points (with ${indistinguishable.length} indistinguishable pair(s))`
    : `checkWellPointedness: ${failures.length} of ${pairs.length} sampled pairs failed terminal-point separation`

  return { holds, details, witnesses, failures, indistinguishable }
}
