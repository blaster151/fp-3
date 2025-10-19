import { FinSet } from './src/all/triangulated'
import type { FinSetMor, FinSetObj } from './src/all/triangulated'
import type { PullbackData } from './pullback'

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

const equalFinSetObj = (left: FinSetObj, right: FinSetObj): boolean => {
  if (left.elements.length !== right.elements.length) {
    return false
  }
  for (let idx = 0; idx < left.elements.length; idx++) {
    if (left.elements[idx] !== right.elements[idx]) {
      return false
    }
  }
  return true
}

export interface FinSetEqualizerPullbackWitness {
  readonly equalizer: { readonly object: FinSetObj; readonly inclusion: FinSetMor }
  readonly span: {
    readonly left: FinSetMor
    readonly right: FinSetMor
    readonly pair: FinSetMor
    readonly diagonal: FinSetMor
  }
  readonly pullback: PullbackData<FinSetObj, FinSetMor>
  readonly factorCone: (fork: FinSetMor) => FinSetMor
}

const assertEqualizerMatchesPullback = (
  canonical: { readonly obj: FinSetObj; readonly equalize: FinSetMor },
  pullbackInclusion: FinSetMor,
  pullbackObj: FinSetObj,
): void => {
  if (!equalFinSetObj(canonical.obj, pullbackObj)) {
    throw new Error('finsetEqualizerAsPullback: pullback carrier differs from the subset equalizer.')
  }

  if (!equalMor(canonical.equalize, pullbackInclusion)) {
    throw new Error('finsetEqualizerAsPullback: pullback inclusion does not match the subset equalizer.')
  }
}

export const finsetEqualizerAsPullback = (f: FinSetMor, g: FinSetMor): FinSetEqualizerPullbackWitness => {
  assertParallelPair(f, g)

  const source = f.from
  const target = f.to

  const canonical = FinSet.equalizer(f, g)

  const indices: number[] = []
  const equalizerElements: Array<FinSetObj['elements'][number]> = []
  source.elements.forEach((element, index) => {
    if (f.map[index] === g.map[index]) {
      indices.push(index)
      equalizerElements.push(element)
    }
  })

  const equalizerObj: FinSetObj = { elements: equalizerElements }
  const inclusion: FinSetMor = { from: equalizerObj, to: source, map: indices }

  assertEqualizerMatchesPullback(canonical, inclusion, equalizerObj)

  const product = FinSet.binaryProduct(target, target)
  const pair = product.pair(source, f, g)
  const idTarget = FinSet.id(target)
  const diagonal = product.pair(target, idTarget, idTarget)

  const anchor = FinSet.compose(f, inclusion)
  const leftComparison = FinSet.compose(pair, inclusion)
  const rightComparison = FinSet.compose(diagonal, anchor)

  if (!equalMor(leftComparison, rightComparison)) {
    throw new Error('finsetEqualizerAsPullback: constructed square fails the pullback commutativity check.')
  }

  const factorCone = (fork: FinSetMor): FinSetMor => {
    const mediator = finsetFactorThroughEqualizer(f, g, inclusion, fork)

    const anchorViaMediator = FinSet.compose(anchor, mediator)
    const leftComposite = FinSet.compose(f, fork)
    if (!equalMor(anchorViaMediator, leftComposite)) {
      throw new Error('finsetEqualizerAsPullback: mediator does not respect the anchor leg of the pullback.')
    }

    const rightComposite = FinSet.compose(g, fork)
    if (!equalMor(anchorViaMediator, rightComposite)) {
      throw new Error('finsetEqualizerAsPullback: mediator fails to equalise the parallel pair.')
    }

    return mediator
  }

  const pullback: PullbackData<FinSetObj, FinSetMor> = {
    apex: equalizerObj,
    toDomain: inclusion,
    toAnchor: anchor,
  }

  return {
    equalizer: { object: equalizerObj, inclusion },
    span: { left: f, right: g, pair, diagonal },
    pullback,
    factorCone,
  }
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
