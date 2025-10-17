import { FinSet } from './allTS'
import type { FinSetMor, FinSetObj } from './allTS'

const equalMor = (left: FinSetMor, right: FinSetMor): boolean =>
  FinSet.equalMor?.(left, right) ??
  (left.map.length === right.map.length && left.map.every((value, index) => value === right.map[index]))

const formatElement = (object: FinSetObj, index: number): string => {
  const value = object.elements[index]
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const assertParallelPair = (f: FinSetMor, g: FinSetMor): void => {
  if (f.from !== g.from || f.to !== g.to) {
    const domainLeft = f.from.elements.length
    const domainRight = g.from.elements.length
    const codomainLeft = f.to.elements.length
    const codomainRight = g.to.elements.length
    throw new Error(
      `finsetFactorThroughEqualizer: expected parallel arrows with a shared domain/codomain (|f.from|=${domainLeft}, |g.from|=${domainRight}, |f.to|=${codomainLeft}, |g.to|=${codomainRight}).`,
    )
  }
}

const assertInclusion = (f: FinSetMor, inclusion: FinSetMor): void => {
  if (inclusion.to !== f.from) {
    const inclusionTarget = inclusion.to.elements.length
    const domainSize = f.from.elements.length
    throw new Error(
      `finsetFactorThroughEqualizer: inclusion codomain must match the shared domain (|include.to|=${inclusionTarget}, |f.from|=${domainSize}).`,
    )
  }
}

const ensureForkCommutes = (
  f: FinSetMor,
  g: FinSetMor,
  fork: FinSetMor,
): void => {
  if (fork.to !== f.from) {
    const forkTarget = fork.to.elements.length
    const expected = f.from.elements.length
    throw new Error(
      `finsetFactorThroughEqualizer: fork codomain must match the shared domain (|fork.to|=${forkTarget}, |f.from|=${expected}).`,
    )
  }

  const left = FinSet.compose(f, fork)
  const right = FinSet.compose(g, fork)

  if (left.map.length !== right.map.length) {
    throw new Error('finsetFactorThroughEqualizer: commuting check produced arrows of different arity.')
  }

  for (let i = 0; i < left.map.length; i++) {
    if (left.map[i] !== right.map[i]) {
      throw new Error(
        `finsetFactorThroughEqualizer: fork does not commute with the parallel pair at ${formatElement(fork.from, i)} (f maps to ${formatElement(
          f.to,
          left.map[i]!,
        )} while g maps to ${formatElement(g.to, right.map[i]!)}).`,
      )
    }
  }
}

const buildMembershipIndex = (inclusion: FinSetMor): Map<number, number> => {
  const membership = new Map<number, number>()
  inclusion.map.forEach((domainIndex, equalizerIndex) => {
    if (!membership.has(domainIndex)) {
      membership.set(domainIndex, equalizerIndex)
    }
  })
  return membership
}

export const finsetFactorThroughEqualizer = (
  f: FinSetMor,
  g: FinSetMor,
  inclusion: FinSetMor,
  fork: FinSetMor,
): FinSetMor => {
  assertParallelPair(f, g)
  assertInclusion(f, inclusion)
  ensureForkCommutes(f, g, fork)

  const membership = buildMembershipIndex(inclusion)
  const mediatorMap: number[] = []

  fork.map.forEach((domainIndex, position) => {
    const equalizerIndex = membership.get(domainIndex)
    if (equalizerIndex === undefined) {
      throw new Error(
        `finsetFactorThroughEqualizer: fork lands outside the equalizer at ${formatElement(
          fork.from,
          position,
        )} -> ${formatElement(inclusion.to, domainIndex)}.`,
      )
    }
    mediatorMap.push(equalizerIndex)
  })

  const mediator: FinSetMor = {
    from: fork.from,
    to: inclusion.from,
    map: mediatorMap,
  }

  const recomposed = FinSet.compose(inclusion, mediator)
  if (!equalMor(recomposed, fork)) {
    throw new Error('finsetFactorThroughEqualizer: constructed mediator does not reproduce the fork.')
  }

  return mediator
}

export interface FinSetEqualizerComparison {
  readonly forward: FinSetMor
  readonly backward: FinSetMor
}

export const finsetEqualizerComparison = (
  f: FinSetMor,
  g: FinSetMor,
  first: FinSetMor,
  second: FinSetMor,
): FinSetEqualizerComparison => {
  const forward = finsetFactorThroughEqualizer(f, g, second, first)
  const backward = finsetFactorThroughEqualizer(f, g, first, second)

  const leftRoundTrip = FinSet.compose(backward, forward)
  const rightRoundTrip = FinSet.compose(forward, backward)

  const identityFirst = FinSet.id(first.from)
  const identitySecond = FinSet.id(second.from)

  if (!equalMor(leftRoundTrip, identityFirst)) {
    throw new Error('finsetEqualizerComparison: round-trip on the first equalizer is not the identity.')
  }

  if (!equalMor(rightRoundTrip, identitySecond)) {
    throw new Error('finsetEqualizerComparison: round-trip on the second equalizer is not the identity.')
  }

  return { forward, backward }
}
