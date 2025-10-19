import { describe, expect, it } from 'vitest'

import {
  FinSet,
  FinSetProductsWithTuple,
  makeFinSetObj,
  makeFinitePullbackCalculator,
  monoByPullbackSquare,
  pullbackPreservesIso,
  pullbackPreservesMono,
  type MonomorphismWitness,
  type PullbackData,
} from '../../allTS'
import type { FiniteCategory } from '../../finite-cat'
import type { FinSetMor, FinSetObj } from '../../allTS'

const eqMor = (left: FinSetMor, right: FinSetMor): boolean =>
  FinSet.equalMor?.(left, right) ??
  (left.from === right.from &&
    left.to === right.to &&
    left.map.length === right.map.length &&
    left.map.every((value, index) => value === right.map[index]))

const makeIsoFixture = () => {
  const A = makeFinSetObj(['a0', 'a1'])
  const B = makeFinSetObj(['b0', 'b1'])
  const C = makeFinSetObj(['c0', 'c1'])

  const f: FinSetMor = { from: A, to: C, map: [0, 1] }
  const g: FinSetMor = { from: B, to: C, map: [1, 0] }
  const fInv: FinSetMor = { from: C, to: A, map: [0, 1] }
  const gInv: FinSetMor = { from: C, to: B, map: [1, 0] }

  const pullbackPairs = A.elements.map((_, index) => {
    const target = f.map[index]
    if (target === undefined) {
      throw new Error('iso fixture: forward arrow must cover every domain element')
    }
    const partner = gInv.map[target]
    if (partner === undefined) {
      throw new Error('iso fixture: expected inverse to supply a matching index')
    }
    return [index, partner] as const
  })

  const pullbackObj: FinSetObj = { elements: pullbackPairs.slice() }
  const pi1: FinSetMor = { from: pullbackObj, to: A, map: pullbackPairs.map(([left]) => left) }
  const pi2: FinSetMor = { from: pullbackObj, to: B, map: pullbackPairs.map(([, right]) => right) }
  const mediator: FinSetMor = { from: A, to: pullbackObj, map: pullbackPairs.map((_, idx) => idx) }

  const arrows: FinSetMor[] = [
    FinSet.id(A),
    FinSet.id(B),
    FinSet.id(C),
    FinSet.id(pullbackObj),
    f,
    g,
    fInv,
    gInv,
    pi1,
    pi2,
    mediator,
    FinSet.compose(gInv, f),
    FinSet.compose(fInv, g),
  ]

  const objects: FinSetObj[] = [A, B, C, pullbackObj]
  const category: FiniteCategory<FinSetObj, FinSetMor> = {
    objects,
    arrows,
    id: (object) => FinSet.id(object),
    compose: (h, k) => FinSet.compose(h, k),
    src: (arrow) => arrow.from,
    dst: (arrow) => arrow.to,
    eq: eqMor,
  }

  const calculator = makeFinitePullbackCalculator(category)
  const pullback = calculator.pullback(f, g)

  return {
    category,
    calculator,
    pullback,
    span: { left: f, right: g },
    inverses: {
      left: { forward: f, inverse: fInv },
      right: { forward: g, inverse: gInv },
    },
    projections: { left: pi1, right: pi2 },
    mediator,
  }
}

const makeFinSetMonomorphismWitness = (arrow: FinSetMor): MonomorphismWitness<FinSetMor> => ({
  arrow,
  cancel(left, right) {
    if (left.from !== right.from || left.to !== arrow.from || right.to !== arrow.from) {
      return { equal: false, reason: 'finsetMonoWitness: arrows must share domain and land in the mono domain.' }
    }
    const imageLeft = FinSet.compose(arrow, left)
    const imageRight = FinSet.compose(arrow, right)
    if (!eqMor(imageLeft, imageRight)) {
      return { equal: false, reason: 'finsetMonoWitness: composites through the monomorphism differ.' }
    }
    return eqMor(left, right)
      ? { equal: true }
      : { equal: false, reason: 'finsetMonoWitness: cancellation failed to identify matching arrows.' }
  },
})

const makeMonoFixture = () => {
  const A = makeFinSetObj(['a0', 'a1', 'a2'])
  const B = makeFinSetObj(['b0', 'b1'])
  const C = makeFinSetObj(['c0', 'c1', 'c2'])
  const pairs: Array<readonly [number, number]> = []

  const f: FinSetMor = { from: A, to: C, map: [0, 2, 1] }
  const g: FinSetMor = { from: B, to: C, map: [0, 2] }
  const nonMono: FinSetMor = { from: B, to: C, map: [0, 0] }

  A.elements.forEach((_, aIdx) => {
    const target = f.map[aIdx]
    B.elements.forEach((__, bIdx) => {
      if (g.map[bIdx] === target) {
        pairs.push([aIdx, bIdx])
      }
    })
  })

  const pullbackObj: FinSetObj = { elements: pairs.slice() }
  const pi1: FinSetMor = { from: pullbackObj, to: A, map: pairs.map(([left]) => left) }
  const pi2: FinSetMor = { from: pullbackObj, to: B, map: pairs.map(([, right]) => right) }

  const W = makeFinSetObj(['w'])
  const sameIntoPullback: FinSetMor = { from: W, to: pullbackObj, map: [0] }
  const altIntoPullback: FinSetMor = { from: W, to: pullbackObj, map: [1] }

  const arrows: FinSetMor[] = [
    FinSet.id(A),
    FinSet.id(B),
    FinSet.id(C),
    FinSet.id(pullbackObj),
    FinSet.id(W),
    f,
    g,
    nonMono,
    pi1,
    pi2,
    sameIntoPullback,
    altIntoPullback,
  ]

  const objects: FinSetObj[] = [A, B, C, pullbackObj, W]
  const category: FiniteCategory<FinSetObj, FinSetMor> = {
    objects,
    arrows,
    id: (object) => FinSet.id(object),
    compose: (h, k) => FinSet.compose(h, k),
    src: (arrow) => arrow.from,
    dst: (arrow) => arrow.to,
    eq: eqMor,
  }

  const calculator = makeFinitePullbackCalculator(category)
  const pullback = calculator.pullback(f, g)

  return {
    category,
    calculator,
    pullback,
    span: { left: f, right: g },
    projections: { left: pi1, right: pi2 },
    witnesses: {
      left: makeFinSetMonomorphismWitness(f),
      right: makeFinSetMonomorphismWitness(g),
    },
    samples: {
      identical: sameIntoPullback,
      alternative: altIntoPullback,
    },
    nonMono,
  }
}

const assertPullbackMatches = (pullback: PullbackData<FinSetObj, FinSetMor>, expected: PullbackData<FinSetObj, FinSetMor>) => {
  expect(pullback.apex).toBe(expected.apex)
  expect(eqMor(pullback.toDomain, expected.toDomain)).toBe(true)
  expect(eqMor(pullback.toAnchor, expected.toAnchor)).toBe(true)
}

describe('Pullback iso and mono preservation', () => {
  it('builds the induced isomorphism when pulling back along an isomorphism (right leg)', () => {
    const fixture = makeIsoFixture()
    assertPullbackMatches(fixture.pullback, {
      apex: fixture.pullback.apex,
      toDomain: fixture.projections.left,
      toAnchor: fixture.projections.right,
    })

    const witness = pullbackPreservesIso({
      category: FinSet,
      eq: eqMor,
      calculator: fixture.calculator,
      span: fixture.span,
      pullback: fixture.pullback,
      iso: fixture.inverses.right,
      side: 'right',
    })

    expect(eqMor(witness.forward, fixture.projections.left)).toBe(true)
    expect(eqMor(witness.inverse, fixture.mediator)).toBe(true)
  })

  it('builds the induced isomorphism when pulling back along an isomorphism (left leg)', () => {
    const fixture = makeIsoFixture()
    const witness = pullbackPreservesIso({
      category: FinSet,
      eq: eqMor,
      calculator: fixture.calculator,
      span: fixture.span,
      pullback: fixture.pullback,
      iso: fixture.inverses.left,
      side: 'left',
    })

    expect(eqMor(witness.forward, fixture.projections.right)).toBe(true)

    const triangle = FinSet.compose(witness.forward, witness.inverse)
    expect(eqMor(triangle, FinSet.id(fixture.projections.right.to))).toBe(true)
  })

  it('rejects iso preservation when the supplied witness targets the wrong span leg', () => {
    const fixture = makeIsoFixture()

    expect(() =>
      pullbackPreservesIso({
        category: FinSet,
        eq: eqMor,
        calculator: fixture.calculator,
        span: fixture.span,
        pullback: fixture.pullback,
        iso: fixture.inverses.left,
        side: 'right',
      }),
    ).toThrow()
  })

  it('derives a monomorphism witness for the base change of a monic right leg', () => {
    const fixture = makeMonoFixture()
    const witness = pullbackPreservesMono({
      category: FinSet,
      eq: eqMor,
      calculator: fixture.calculator,
      span: fixture.span,
      pullback: fixture.pullback,
      monomorphism: fixture.witnesses.right,
      side: 'right',
    })

    expect(eqMor(witness.arrow, fixture.projections.left)).toBe(true)

    const success = witness.cancel(fixture.samples.identical, fixture.samples.identical)
    expect(success.equal).toBe(true)

    const failure = witness.cancel(fixture.samples.identical, fixture.samples.alternative)
    expect(failure.equal).toBe(false)
  })

  it('derives a monomorphism witness for the base change of a monic left leg', () => {
    const fixture = makeMonoFixture()
    const witness = pullbackPreservesMono({
      category: FinSet,
      eq: eqMor,
      calculator: fixture.calculator,
      span: fixture.span,
      pullback: fixture.pullback,
      monomorphism: fixture.witnesses.left,
      side: 'left',
    })

    expect(eqMor(witness.arrow, fixture.projections.right)).toBe(true)

    const positive = witness.cancel(fixture.samples.identical, fixture.samples.identical)
    expect(positive.equal).toBe(true)
  })

  it('refuses monomorphism preservation when the witness mismatches the chosen leg', () => {
    const fixture = makeMonoFixture()

    expect(() =>
      pullbackPreservesMono({
        category: FinSet,
        eq: eqMor,
        calculator: fixture.calculator,
        span: fixture.span,
        pullback: fixture.pullback,
        monomorphism: fixture.witnesses.left,
        side: 'right',
      }),
    ).toThrow()
  })

  it('characterises monomorphisms via the diagonal pullback square', () => {
    const fixture = makeMonoFixture()

    const monoResult = monoByPullbackSquare({
      category: FinSet,
      calculator: fixture.calculator,
      products: FinSetProductsWithTuple,
      arrow: fixture.span.right,
    })

    expect(monoResult.holds).toBe(true)

    const nonMonoResult = monoByPullbackSquare({
      category: FinSet,
      calculator: fixture.calculator,
      products: FinSetProductsWithTuple,
      arrow: fixture.nonMono,
    })

    expect(nonMonoResult.holds).toBe(false)
  })
})
