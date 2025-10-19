import { describe, expect, it } from 'vitest'

import {
  FinSet,
  makeFinSetObj,
  makeFinSetPullbackCalculator,
  finsetLimitFromProductsAndEqualizers,
  CategoryLimits,
  type FinSetObj,
  type FinSetMor,
} from '../../allTS'

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  const verdict = FinSet.equalMor?.(left, right)
  if (typeof verdict === 'boolean') {
    expect(verdict).toBe(true)
    return
  }

  expect(left.from).toBe(right.from)
  expect(left.to).toBe(right.to)
  expect(left.map.length).toBe(right.map.length)
  left.map.forEach((value, index) => {
    expect(value).toBe(right.map[index])
  })
}

describe('FinSet pullback from products and equalizers', () => {
  const calculator = makeFinSetPullbackCalculator()

  it('constructs the canonical pullback square that commutes with the span', () => {
    const Z = makeFinSetObj(['z0', 'z1', 'z2'])
    const X = makeFinSetObj(['x0', 'x1'])
    const Y = makeFinSetObj(['y0', 'y1', 'y2'])

    const f: FinSetMor = { from: X, to: Z, map: [0, 2] }
    const h: FinSetMor = { from: Y, to: Z, map: [1, 2, 0] }

    const pullback = calculator.pullback(f, h)

    expect(pullback.apex.elements).toEqual([
      [0, 2],
      [1, 1],
    ])

    const viaDomain = FinSet.compose(f, pullback.toDomain)
    const viaAnchor = FinSet.compose(h, pullback.toAnchor)
    expectEqualArrows(viaDomain, viaAnchor)
  })

  it('factors commuting cones uniquely through the equalizer pullback', () => {
    const Z = makeFinSetObj(['z0', 'z1', 'z2'])
    const X = makeFinSetObj(['x0', 'x1'])
    const Y = makeFinSetObj(['y0', 'y1', 'y2'])

    const f: FinSetMor = { from: X, to: Z, map: [0, 2] }
    const h: FinSetMor = { from: Y, to: Z, map: [1, 2, 0] }

    const pullback = calculator.pullback(f, h)

    const W = makeFinSetObj(['w0', 'w1'])
    const intoX: FinSetMor = { from: W, to: X, map: [1, 0] }
    const intoY: FinSetMor = { from: W, to: Y, map: [1, 2] }

    const cone = { apex: W, toDomain: intoX, toAnchor: intoY }

    const factor = calculator.factorCone(pullback, cone)
    expect(factor.factored).toBe(true)
    const mediator = factor.mediator!

    expectEqualArrows(FinSet.compose(pullback.toDomain, mediator), intoX)
    expectEqualArrows(FinSet.compose(pullback.toAnchor, mediator), intoY)

    const secondFactor = calculator.factorCone(pullback, cone)
    expect(secondFactor.factored).toBe(true)
    expectEqualArrows(secondFactor.mediator!, mediator)
  })

  it('rejects cones that do not respect the equalizing subset', () => {
    const Z = makeFinSetObj(['z0', 'z1', 'z2'])
    const X = makeFinSetObj(['x0', 'x1'])
    const Y = makeFinSetObj(['y0', 'y1', 'y2'])

    const f: FinSetMor = { from: X, to: Z, map: [0, 2] }
    const h: FinSetMor = { from: Y, to: Z, map: [1, 2, 0] }

    const pullback = calculator.pullback(f, h)

    const W = makeFinSetObj(['w0', 'w1'])
    const intoX: FinSetMor = { from: W, to: X, map: [1, 0] }
    const skewIntoY: FinSetMor = { from: W, to: Y, map: [0, 1] }

    const skew = calculator.factorCone(pullback, { apex: W, toDomain: intoX, toAnchor: skewIntoY })
    expect(skew.factored).toBe(false)
    expect(skew.reason).toMatch(/equalizer/i)
  })
})

describe('finsetLimitFromProductsAndEqualizers', () => {
  const objects = ['X', 'Y', 'Z'] as const
  type Obj = (typeof objects)[number]
  type Arrow = 'idX' | 'idY' | 'idZ' | 'f' | 'h'

  const spanShape: CategoryLimits.FiniteDiagram<Obj, Arrow, FinSetObj, FinSetMor>['shape'] = {
    objects,
    arrows: ['idX', 'idY', 'idZ', 'f', 'h'],
    id: (object: Obj): Arrow => {
      switch (object) {
        case 'X':
          return 'idX'
        case 'Y':
          return 'idY'
        case 'Z':
          return 'idZ'
      }
    },
    compose: (g: Arrow, f: Arrow): Arrow => {
      const src = (arrow: Arrow): Obj => {
        switch (arrow) {
          case 'idX':
            return 'X'
          case 'idY':
            return 'Y'
          case 'idZ':
            return 'Z'
          case 'f':
            return 'X'
          case 'h':
            return 'Y'
        }
      }
      const dst = (arrow: Arrow): Obj => {
        switch (arrow) {
          case 'idX':
            return 'X'
          case 'idY':
            return 'Y'
          case 'idZ':
            return 'Z'
          case 'f':
            return 'Z'
          case 'h':
            return 'Z'
        }
      }

      if (dst(f) !== src(g)) {
        throw new Error('span shape: attempted to compose non-composable arrows')
      }

      if (f === 'idX' || f === 'idY' || f === 'idZ') {
        return g
      }
      if (g === 'idX' || g === 'idY' || g === 'idZ') {
        return f
      }

      // The only remaining composable pairs are f ∘ id_Z and h ∘ id_Z handled above
      throw new Error('span shape: unexpected non-identity composite')
    },
    src: (arrow: Arrow): Obj => {
      switch (arrow) {
        case 'idX':
          return 'X'
        case 'idY':
          return 'Y'
        case 'idZ':
          return 'Z'
        case 'f':
          return 'X'
        case 'h':
          return 'Y'
      }
    },
    dst: (arrow: Arrow): Obj => {
      switch (arrow) {
        case 'idX':
          return 'X'
        case 'idY':
          return 'Y'
        case 'idZ':
          return 'Z'
        case 'f':
          return 'Z'
        case 'h':
          return 'Z'
      }
    },
    eq: (left: Arrow, right: Arrow) => left === right,
  }

  const makeDiagram = () => {
    const Z = makeFinSetObj(['z0', 'z1', 'z2'])
    const X = makeFinSetObj(['x0', 'x1'])
    const Y = makeFinSetObj(['y0', 'y1', 'y2'])

    const f: FinSetMor = { from: X, to: Z, map: [0, 2] }
    const h: FinSetMor = { from: Y, to: Z, map: [1, 2, 0] }

    const diagram = CategoryLimits.makeFiniteDiagram<Obj, Arrow, FinSetObj, FinSetMor>({
      shape: spanShape,
      onObjects: (object) => {
        switch (object) {
          case 'X':
            return X
          case 'Y':
            return Y
          case 'Z':
            return Z
        }
      },
      onMorphisms: (arrow) => {
        switch (arrow) {
          case 'idX':
            return FinSet.id(X)
          case 'idY':
            return FinSet.id(Y)
          case 'idZ':
            return FinSet.id(Z)
          case 'f':
            return f
          case 'h':
            return h
        }
      },
    })

    return { diagram, X, Y, Z, f, h }
  }

  it('realises the span limit as the equalizer subset of the triple product', () => {
    const { diagram, X, Y, Z, f, h } = makeDiagram()
    const witness = finsetLimitFromProductsAndEqualizers(diagram)

    const expected: Array<ReadonlyArray<number>> = []
    for (let x = 0; x < X.elements.length; x++) {
      for (let y = 0; y < Y.elements.length; y++) {
        const fx = f.map[x]
        const hy = h.map[y]
        if (fx === undefined || hy === undefined) continue
        if (fx !== hy) continue
        expected.push([x, y, fx])
      }
    }

    const actual = witness.equalizer.obj.elements as Array<ReadonlyArray<number>>
    const key = (tuple: ReadonlyArray<number>) => tuple.join(',')
    expect(actual.map(key).sort()).toEqual(expected.map(key).sort())

    const legX = witness.cone.legs('X')
    const legY = witness.cone.legs('Y')
    const legZ = witness.cone.legs('Z')

    expectEqualArrows(FinSet.compose(f, legX), legZ)
    expectEqualArrows(FinSet.compose(h, legY), legZ)
  })

  it('factors compatible cones uniquely through the equalizer limit', () => {
    const { diagram, X, Y, Z, f, h } = makeDiagram()
    const witness = finsetLimitFromProductsAndEqualizers(diagram)

    const W = makeFinSetObj(['w0', 'w1'])
    const intoX: FinSetMor = { from: W, to: X, map: [1, 0] }
    const intoY: FinSetMor = { from: W, to: Y, map: [1, 2] }
    const intoZ = FinSet.compose(f, intoX)

    const cone: CategoryLimits.Cone<Obj, FinSetObj, FinSetMor> = {
      tip: W,
      legs: (object) => {
        switch (object) {
          case 'X':
            return intoX
          case 'Y':
            return intoY
          case 'Z':
            return intoZ
        }
      },
      diagram,
    }

    const factor = witness.factor(cone)
    expect(factor.factored).toBe(true)
    const mediator = factor.mediator!

    expectEqualArrows(FinSet.compose(witness.cone.legs('X'), mediator), intoX)
    expectEqualArrows(FinSet.compose(witness.cone.legs('Y'), mediator), intoY)
    expectEqualArrows(FinSet.compose(witness.cone.legs('Z'), mediator), intoZ)

    const second = witness.factor(cone)
    expect(second.factored).toBe(true)
    expectEqualArrows(second.mediator!, mediator)
  })

  it('rejects cones that fail the span commutativity check', () => {
    const { diagram, X, Y, Z, f, h } = makeDiagram()
    const witness = finsetLimitFromProductsAndEqualizers(diagram)

    const W = makeFinSetObj(['w0', 'w1'])
    const intoX: FinSetMor = { from: W, to: X, map: [1, 0] }
    const skewIntoY: FinSetMor = { from: W, to: Y, map: [0, 1] }
    const cone: CategoryLimits.Cone<Obj, FinSetObj, FinSetMor> = {
      tip: W,
      legs: (object) => {
        switch (object) {
          case 'X':
            return intoX
          case 'Y':
            return skewIntoY
          case 'Z':
            return FinSet.compose(f, intoX)
        }
      },
      diagram,
    }

    const verdict = witness.factor(cone)
    expect(verdict.factored).toBe(false)
    expect(verdict.reason).toMatch(/diagram|commute/i)
  })
})
