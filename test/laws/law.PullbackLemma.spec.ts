import { describe, expect, it } from 'vitest'

import {
  FinSet,
  makeFinSetObj,
  makeFinitePullbackCalculator,
  verifyPullbackLemma,
  type PullbackCalculator,
  type PullbackData,
  type PullbackSquareWitness,
} from '../../allTS'
import type { Category } from '../../stdlib/category'
import { ArrowFamilies } from '../../stdlib/arrow-families'
import type { FiniteCategory } from '../../finite-cat'
import type { FinSetMor, FinSetObj } from '../../allTS'

const eqMor = (left: FinSetMor, right: FinSetMor): boolean =>
  FinSet.equalMor?.(left, right) ??
  (left.from === right.from &&
    left.to === right.to &&
    left.map.length === right.map.length &&
    left.map.every((value, index) => value === right.map[index]))

const withDomCod = <O, M>(
  category: FiniteCategory<O, M>,
): FiniteCategory<O, M> & ArrowFamilies.HasDomCod<O, M> & Category<O, M> => ({
  ...category,
  dom: category.src,
  cod: category.dst,
})

interface LemmaFixtureOptions {
  readonly omitRightMediator?: boolean
}

interface LemmaFixture {
  readonly category: FiniteCategory<FinSetObj, FinSetMor> & ArrowFamilies.HasDomCod<FinSetObj, FinSetMor> & Category<FinSetObj, FinSetMor>
  readonly calculator: PullbackCalculator<FinSetObj, FinSetMor>
  readonly left: PullbackSquareWitness<FinSetObj, FinSetMor>
  readonly right: PullbackSquareWitness<FinSetObj, FinSetMor>
  readonly outer: PullbackSquareWitness<FinSetObj, FinSetMor>
  readonly cone: PullbackData<FinSetObj, FinSetMor>
  readonly mediator: FinSetMor
  readonly mediatorToRight: FinSetMor
}

const makeLemmaFixture = (options: LemmaFixtureOptions = {}): LemmaFixture => {
  const V = makeFinSetObj(['v0', 'v1'])
  const Z = makeFinSetObj(['z0', 'z1', 'z2'])
  const W = makeFinSetObj(['w0', 'w1', 'w2', 'w3'])
  const Y = makeFinSetObj(['y0', 'y1', 'y2', 'y3'])
  const XPairs: Array<readonly [number, number]> = []

  const zToV: FinSetMor = { from: Z, to: V, map: [0, 1, 1] }
  const wToV: FinSetMor = { from: W, to: V, map: [0, 0, 1, 1] }
  const yToW: FinSetMor = { from: Y, to: W, map: [0, 1, 2, 1] }

  Z.elements.forEach((_, zIdx) => {
    W.elements.forEach((__, wIdx) => {
      if (zToV.map[zIdx] === wToV.map[wIdx]) {
        XPairs.push([zIdx, wIdx])
      }
    })
  })

  const X = makeFinSetObj(
    XPairs.map(([zIdx, wIdx]) => `${Z.elements[zIdx]}_${W.elements[wIdx]}`),
  )

  const xToZ: FinSetMor = { from: X, to: Z, map: XPairs.map(([zIdx]) => zIdx) }
  const xToW: FinSetMor = { from: X, to: W, map: XPairs.map(([, wIdx]) => wIdx) }

  const yToV = FinSet.compose(wToV, yToW)

  const PPairs: Array<readonly [number, number]> = []
  X.elements.forEach((_, xIdx) => {
    Y.elements.forEach((__, yIdx) => {
      if (xToW.map[xIdx] === yToW.map[yIdx]) {
        PPairs.push([xIdx, yIdx])
      }
    })
  })

  const P = makeFinSetObj(
    PPairs.map(([xIdx, yIdx]) => `${X.elements[xIdx]}|${Y.elements[yIdx]}`),
  )

  const pToX: FinSetMor = { from: P, to: X, map: PPairs.map(([xIdx]) => xIdx) }
  const pToY: FinSetMor = { from: P, to: Y, map: PPairs.map(([, yIdx]) => yIdx) }
  const pToZ = FinSet.compose(xToZ, pToX)

  const R = makeFinSetObj(['r0', 'r1'])
  const coneToZ: FinSetMor = { from: R, to: Z, map: [0, 2] }
  const coneToY: FinSetMor = { from: R, to: Y, map: [1, 2] }

  const cone: PullbackData<FinSetObj, FinSetMor> = {
    apex: R,
    toDomain: coneToZ,
    toAnchor: coneToY,
  }

  const coneToW = FinSet.compose(yToW, coneToY)

  const findXIndex = (pair: readonly [number, number]): number => {
    const index = XPairs.findIndex(([zIdx, wIdx]) => zIdx === pair[0] && wIdx === pair[1])
    if (index === -1) {
      throw new Error('lemma fixture: expected pair to appear in X')
    }
    return index
  }

  const mediatorToRight: FinSetMor = {
    from: R,
    to: X,
    map: coneToZ.map.map((zIdx, rIdx) => {
      const wIdx = coneToW.map[rIdx]
      if (wIdx === undefined) {
        throw new Error('lemma fixture: missing induced map into W')
      }
      return findXIndex([zIdx, wIdx])
    }),
  }

  const findPIndex = (pair: readonly [number, number]): number => {
    const index = PPairs.findIndex(([xIdx, yIdx]) => xIdx === pair[0] && yIdx === pair[1])
    if (index === -1) {
      throw new Error('lemma fixture: expected pair to appear in P')
    }
    return index
  }

  const mediator: FinSetMor = {
    from: R,
    to: P,
    map: mediatorToRight.map.map((xIdx, rIdx) => {
      const yIdx = coneToY.map[rIdx]
      if (yIdx === undefined) {
        throw new Error('lemma fixture: missing cone anchor image')
      }
      return findPIndex([xIdx, yIdx])
    }),
  }

  const left: PullbackSquareWitness<FinSetObj, FinSetMor> = {
    span: { left: xToW, right: yToW },
    pullback: { apex: P, toDomain: pToX, toAnchor: pToY },
  }

  const right: PullbackSquareWitness<FinSetObj, FinSetMor> = {
    span: { left: zToV, right: wToV },
    pullback: { apex: X, toDomain: xToZ, toAnchor: xToW },
  }

  const outer: PullbackSquareWitness<FinSetObj, FinSetMor> = {
    span: { left: zToV, right: yToV },
    pullback: { apex: P, toDomain: pToZ, toAnchor: pToY },
  }

  const objects: FinSetObj[] = [V, Z, W, Y, X, P, R]
  const arrows: FinSetMor[] = [
    ...objects.map((object) => FinSet.id(object)),
    zToV,
    wToV,
    yToW,
    yToV,
    xToZ,
    xToW,
    pToX,
    pToY,
    pToZ,
    coneToZ,
    coneToY,
    coneToW,
    mediator,
    ...(options.omitRightMediator ? [] : [mediatorToRight]),
  ]

  const baseCategory: FiniteCategory<FinSetObj, FinSetMor> = {
    objects,
    arrows,
    id: (object) => FinSet.id(object),
    compose: (g, f) => FinSet.compose(g, f),
    src: (arrow) => arrow.from,
    dst: (arrow) => arrow.to,
    eq: eqMor,
  }

  const category = withDomCod(baseCategory)
  const calculator = makeFinitePullbackCalculator(category)

  return { category, calculator, left, right, outer, cone, mediator, mediatorToRight }
}

describe('Pullback lemma', () => {
  it('composes adjacent pullback squares into a pullback rectangle', () => {
    const fixture = makeLemmaFixture()

    const result = verifyPullbackLemma({
      mode: 'compose',
      category: fixture.category,
      eq: eqMor,
      calculator: fixture.calculator,
      left: fixture.left,
      right: fixture.right,
      cone: fixture.cone,
    })

    expect(result.outerCertification.valid).toBe(true)
    expect(result.leftCertification.valid).toBe(true)
    expect(result.rightCertification.valid).toBe(true)
    expect(eqMor(result.mediatorToRight, fixture.mediatorToRight)).toBe(true)
    expect(eqMor(result.mediator, fixture.mediator)).toBe(true)
    expect(result.factorizations.outer.factored).toBe(true)
    expect(result.factorizations.throughLeft.factored).toBe(true)
    expect(result.factorizations.throughRight.factored).toBe(true)
  })

  it('derives the left pullback square from the rectangle and right square', () => {
    const fixture = makeLemmaFixture()

    const result = verifyPullbackLemma({
      mode: 'derive-left',
      category: fixture.category,
      eq: eqMor,
      calculator: fixture.calculator,
      outer: fixture.outer,
      right: fixture.right,
      cone: fixture.cone,
    })

    expect(result.outerCertification.valid).toBe(true)
    expect(result.leftCertification.valid).toBe(true)
    expect(result.rightCertification.valid).toBe(true)
    expect(eqMor(result.left.pullback.toDomain, fixture.left.pullback.toDomain)).toBe(true)
    expect(eqMor(result.left.pullback.toAnchor, fixture.left.pullback.toAnchor)).toBe(true)
    expect(eqMor(result.left.span.right, fixture.left.span.right)).toBe(true)
    expect(eqMor(result.mediator, fixture.mediator)).toBe(true)
  })

  it('derives the right pullback square from the rectangle and left square', () => {
    const fixture = makeLemmaFixture()

    const result = verifyPullbackLemma({
      mode: 'derive-right',
      category: fixture.category,
      eq: eqMor,
      calculator: fixture.calculator,
      outer: fixture.outer,
      left: fixture.left,
      cone: fixture.cone,
    })

    expect(result.outerCertification.valid).toBe(true)
    expect(result.leftCertification.valid).toBe(true)
    expect(result.rightCertification.valid).toBe(true)
    expect(eqMor(result.right.pullback.toDomain, fixture.right.pullback.toDomain)).toBe(true)
    expect(eqMor(result.right.pullback.toAnchor, fixture.right.pullback.toAnchor)).toBe(true)
    expect(eqMor(result.right.span.right, fixture.right.span.right)).toBe(true)
    expect(eqMor(result.mediatorToRight, fixture.mediatorToRight)).toBe(true)
  })

  it('rejects commuting squares that lack universal mediators', () => {
    const brokenFixture = makeLemmaFixture({ omitRightMediator: true })

    expect(() =>
      verifyPullbackLemma({
        mode: 'compose',
        category: brokenFixture.category,
        eq: eqMor,
        calculator: brokenFixture.calculator,
        left: brokenFixture.left,
        right: brokenFixture.right,
        cone: brokenFixture.cone,
      }),
    ).toThrow(/right pullback/i)
  })
})

