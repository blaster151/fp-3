import { describe, expect, it } from 'vitest'

import {
  FinSet,
  makeFinSetObj,
  makeFinitePullbackCalculator,
  type FinSetMor,
  type FinSetObj,
  type IsoWitness,
  type PullbackData,
} from '../../allTS'
import type { FiniteCategory } from '../../finite-cat'

const eqMor = (left: FinSetMor, right: FinSetMor): boolean =>
  FinSet.equalMor?.(left, right) ??
  (left.from === right.from &&
    left.to === right.to &&
    left.map.length === right.map.length &&
    left.map.every((value, index) => value === right.map[index]))

interface TransportFixture {
  readonly category: FiniteCategory<FinSetObj, FinSetMor>
  readonly span: { readonly left: FinSetMor; readonly right: FinSetMor }
  readonly source: PullbackData<FinSetObj, FinSetMor>
  readonly candidate: PullbackData<FinSetObj, FinSetMor>
  readonly badCandidate: PullbackData<FinSetObj, FinSetMor>
  readonly iso: IsoWitness<FinSetMor>
}

const makeTransportFixture = (): TransportFixture => {
  const A = makeFinSetObj(['a0', 'a1'])
  const B = makeFinSetObj(['b0', 'b1'])
  const C = makeFinSetObj(['c0', 'c1'])

  const f: FinSetMor = { from: A, to: C, map: [0, 1] }
  const g: FinSetMor = { from: B, to: C, map: [1, 0] }

  const pairs: Array<readonly [number, number]> = [
    [0, 1],
    [1, 0],
  ]

  const P = makeFinSetObj(pairs.map(([aIdx, bIdx]) => `${A.elements[aIdx]}|${B.elements[bIdx]}`))
  const piA: FinSetMor = { from: P, to: A, map: pairs.map(([aIdx]) => aIdx) }
  const piB: FinSetMor = { from: P, to: B, map: pairs.map(([, bIdx]) => bIdx) }

  const reversedPairs = pairs.slice().reverse()
  const PPrime = makeFinSetObj(
    reversedPairs.map(([aIdx, bIdx]) => `${A.elements[aIdx]}|${B.elements[bIdx]}`),
  )
  const piAPrime: FinSetMor = { from: PPrime, to: A, map: reversedPairs.map(([aIdx]) => aIdx) }
  const piBPrime: FinSetMor = { from: PPrime, to: B, map: reversedPairs.map(([, bIdx]) => bIdx) }

  const badAnchor: FinSetMor = { from: PPrime, to: B, map: [1, 1] }

  const isoForward: FinSetMor = { from: P, to: PPrime, map: [1, 0] }
  const isoInverse: FinSetMor = { from: PPrime, to: P, map: [1, 0] }

  const objects: FinSetObj[] = [A, B, C, P, PPrime]
  const arrows: FinSetMor[] = [
    FinSet.id(A),
    FinSet.id(B),
    FinSet.id(C),
    FinSet.id(P),
    FinSet.id(PPrime),
    f,
    g,
    piA,
    piB,
    piAPrime,
    piBPrime,
    badAnchor,
    isoForward,
    isoInverse,
  ]

  const category: FiniteCategory<FinSetObj, FinSetMor> = {
    objects,
    arrows,
    id: (object) => FinSet.id(object),
    compose: (h, k) => FinSet.compose(h, k),
    src: (arrow) => arrow.from,
    dst: (arrow) => arrow.to,
    eq: eqMor,
  }

  return {
    category,
    span: { left: f, right: g },
    source: { apex: P, toDomain: piA, toAnchor: piB },
    candidate: { apex: PPrime, toDomain: piAPrime, toAnchor: piBPrime },
    badCandidate: { apex: PPrime, toDomain: piAPrime, toAnchor: badAnchor },
    iso: { forward: isoForward, inverse: isoInverse },
  }
}

describe('Pullback transport along isomorphisms', () => {
  it('transports FinSet pullbacks across an explicit bijection', () => {
    const fixture = makeTransportFixture()
    const calculator = makeFinitePullbackCalculator(fixture.category)

    const original = calculator.pullback(fixture.span.left, fixture.span.right)
    expect(original.apex).toBe(fixture.source.apex)
    expect(eqMor(original.toDomain, fixture.source.toDomain)).toBe(true)
    expect(eqMor(original.toAnchor, fixture.source.toAnchor)).toBe(true)

    const transported = calculator.transportPullback(
      fixture.span.left,
      fixture.span.right,
      original,
      fixture.iso,
      fixture.candidate,
    )

    expect(transported.apex).toBe(fixture.candidate.apex)
    expect(eqMor(transported.toDomain, fixture.candidate.toDomain)).toBe(true)
    expect(eqMor(transported.toAnchor, fixture.candidate.toAnchor)).toBe(true)

    const certification = calculator.certify(
      fixture.span.left,
      fixture.span.right,
      transported,
    )
    expect(certification.valid).toBe(true)
  })

  it('rejects transported cones that fail to commute with the span', () => {
    const fixture = makeTransportFixture()
    const calculator = makeFinitePullbackCalculator(fixture.category)
    const original = calculator.pullback(fixture.span.left, fixture.span.right)

    expect(() =>
      calculator.transportPullback(
        fixture.span.left,
        fixture.span.right,
        original,
        fixture.iso,
        fixture.badCandidate,
      ),
    ).toThrow(/does not commute/)
  })
})
