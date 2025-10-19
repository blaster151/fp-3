import { describe, expect, it } from 'vitest'

import {
  CategoryLimits,
  FinSet,
  FinSetFinitelyCocomplete,
  finsetFiniteColimitFromCoproductsAndCoequalizers,
  finsetPushout,
  IndexedFamilies,
  makeFinSetObj,
  assertFinSetMor,
  type FinSetMor,
  type FinSetObj,
} from '../../allTS'
import { finsetFactorThroughQuotient } from '../../finset-quotients'
import type { FiniteCategory } from '../../finite-cat'

const eqArrows = (left: FinSetMor, right: FinSetMor): boolean => {
  const verdict = FinSet.equalMor?.(left, right)
  if (typeof verdict === 'boolean') {
    return verdict
  }
  if (left.from !== right.from || left.to !== right.to) {
    return false
  }
  if (left.map.length !== right.map.length) {
    return false
  }
  return left.map.every((value, index) => value === right.map[index])
}

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  expect(eqArrows(left, right)).toBe(true)
}

describe('FinSetFinitelyCocomplete', () => {
  it('recovers the empty coproduct from the initial object data', () => {
    const emptyIndex = IndexedFamilies.finiteIndex<never>([])
    const emptyFamily = ((_: never) => {
      throw new Error('FinSetFinitelyCocomplete: empty family should not be evaluated')
    }) as IndexedFamilies.Family<never, FinSetObj>

    const { coproduct } = CategoryLimits.finiteCoproductEx(
      emptyIndex,
      emptyFamily,
      FinSetFinitelyCocomplete,
    )

    expect(coproduct).toBe(FinSetFinitelyCocomplete.initialObj)

    const target = makeFinSetObj(['z0', 'z1'])
    const arrow = FinSetFinitelyCocomplete.initialArrow(target)
    expect(arrow.from).toBe(FinSetFinitelyCocomplete.initialObj)
    expect(arrow.to).toBe(target)
    expect(arrow.map).toEqual([])
  })

  it('packages binary coproduct mediators that satisfy the universal property', () => {
    const indices = IndexedFamilies.finiteIndex([0, 1] as const)
    const A = makeFinSetObj(['a0', 'a1'])
    const B = makeFinSetObj(['b0'])
    const Z = makeFinSetObj(['z0', 'z1', 'z2'])

    const legLeft: FinSetMor = { from: A, to: Z, map: [0, 2] }
    const legRight: FinSetMor = { from: B, to: Z, map: [1] }

    const objectFamily = (i: 0 | 1): FinSetObj => (i === 0 ? A : B)
    const legFamily = (i: 0 | 1): FinSetMor => (i === 0 ? legLeft : legRight)
    const diagram: CategoryLimits.Diagram<0 | 1, FinSetMor> = { arrows: [] }

    const { coproduct, injections, mediator } = CategoryLimits.mediateCoproduct(
      indices,
      objectFamily,
      FinSetFinitelyCocomplete,
      Z,
      legFamily,
    )

    expectEqualArrows(FinSet.compose(mediator, injections(0)), legLeft)
    expectEqualArrows(FinSet.compose(mediator, injections(1)), legRight)

    const factoring = CategoryLimits.factorCoconeThroughCoproduct(
      FinSetFinitelyCocomplete,
      eqArrows,
      indices,
      objectFamily,
      coproduct,
      injections,
      {
        coTip: Z,
        legs: legFamily,
        diagram,
      },
      FinSetFinitelyCocomplete.cotuple,
    )

    expect(factoring.factored).toBe(true)
    expectEqualArrows(factoring.mediator!, mediator)
    expect(factoring.unique).toBe(true)

    const skewRight: FinSetMor = { from: B, to: Z, map: [0] }
    const skew = CategoryLimits.factorCoconeThroughCoproduct(
      FinSetFinitelyCocomplete,
      eqArrows,
      indices,
      objectFamily,
      coproduct,
      injections,
      {
        coTip: Z,
        legs: (i) => (i === 0 ? legLeft : skewRight),
        diagram,
      },
      FinSetFinitelyCocomplete.cotuple,
    )

    expect(skew.factored).toBe(false)
    expect(skew.reason).toMatch(/coproduct/i)
  })

  it('reuses the quotient pushout to certify universal mediators', () => {
    const X = makeFinSetObj(['x0', 'x1'])
    const A = makeFinSetObj(['a0', 'a1'])
    const B = makeFinSetObj(['b0', 'b1', 'b2'])

    const f: FinSetMor = { from: X, to: A, map: [0, 0] }
    const g: FinSetMor = { from: X, to: B, map: [1, 2] }

    const witness = FinSetFinitelyCocomplete.pushout(f, g)
    const enriched = finsetPushout(f, g)

    const commuteLeft = FinSet.compose(witness.fromDomain, f)
    const commuteRight = FinSet.compose(witness.fromAnchor, g)
    expectEqualArrows(commuteLeft, commuteRight)

    expectEqualArrows(witness.fromDomain, enriched.fromDomain)
    expectEqualArrows(witness.fromAnchor, enriched.fromAnchor)
    expectEqualArrows(enriched.fromDomain, enriched.iA)
    expectEqualArrows(enriched.fromAnchor, enriched.iZ)

    const Z = makeFinSetObj(['z0', 'z1', 'z2'])
    const fromLeft: FinSetMor = { from: A, to: Z, map: [0, 1] }
    const fromRight: FinSetMor = { from: B, to: Z, map: [2, 0, 0] }

    const mediator = enriched.factorCocone({ object: Z, fromLeft, fromRight })
    expectEqualArrows(FinSet.compose(mediator, witness.fromDomain), fromLeft)
    expectEqualArrows(FinSet.compose(mediator, witness.fromAnchor), fromRight)

    expect(() =>
      enriched.factorCocone({ object: Z, fromLeft, fromRight: { ...fromRight, map: [2, 1, 0] } }),
    ).toThrow(/pushout/i)
  })

  it('rejects wedges that fail the universal property checks', () => {
    const X = makeFinSetObj(['x0'])
    const A = makeFinSetObj(['a0'])
    const B = makeFinSetObj(['b0', 'b1'])

    const f = assertFinSetMor({ from: X, to: A, map: [0] })
    const g = assertFinSetMor({ from: X, to: B, map: [0] })

    const witness = FinSetFinitelyCocomplete.pushout(f, g)
    const enriched = finsetPushout(f, g)

    expectEqualArrows(witness.fromDomain, enriched.fromDomain)
    expectEqualArrows(witness.fromAnchor, enriched.fromAnchor)

    const Z = makeFinSetObj(['z0', 'z1'])
    const fromLeft = assertFinSetMor({ from: A, to: Z, map: [0] })
    const fromRight = assertFinSetMor({ from: B, to: Z, map: [0, 1] })

    const skewRight = assertFinSetMor({ from: B, to: Z, map: [1, 1] })
    expect(() => enriched.factorCocone({ object: Z, fromLeft, fromRight: skewRight })).toThrow(/pushout/i)

    const skewDomain = assertFinSetMor({ from: makeFinSetObj(['c0']), to: Z, map: [0] })
    expect(() => enriched.factorCocone({ object: Z, fromLeft: skewDomain, fromRight })).toThrow(/codomains/i)

    const nonCommutingRight = assertFinSetMor({ from: B, to: Z, map: [0, 0] })
    expect(() => enriched.factorCocone({ object: Z, fromLeft, fromRight: nonCommutingRight })).toThrow(/commute/i)
  })

  it('factors cocones uniquely through coequalizers derived from pullbacks', () => {
    const X = makeFinSetObj(['x0', 'x1'])
    const Y = makeFinSetObj(['y0', 'y1', 'y2'])
    const Z = makeFinSetObj(['z0', 'z1'])

    const f: FinSetMor = { from: X, to: Y, map: [0, 1] }
    const g: FinSetMor = { from: X, to: Y, map: [1, 1] }

    const { obj: Q, coequalize } = FinSetFinitelyCocomplete.coequalizer(f, g)

    const cocone: FinSetMor = { from: Y, to: Z, map: [0, 0, 1] }
    const mediator = finsetFactorThroughQuotient(coequalize, cocone)

    expectEqualArrows(FinSet.compose(mediator, coequalize), cocone)

    const skew: FinSetMor = { from: Y, to: Z, map: [0, 1, 1] }
    expect(() => finsetFactorThroughQuotient(coequalize, skew)).toThrow(/equivalence class/i)

    expect(mediator.from).toBe(Q)
  })
})

describe('CategoryLimits.finiteColimitFromCoproductsAndCoequalizers (FinSet)', () => {
  type ParallelIndex = 'source' | 'target'
  type ParallelArrow =
    | { kind: 'id'; object: ParallelIndex }
    | { kind: 'edge'; name: 'f' | 'g' }

  type SpanIndex = 'left' | 'right' | 'apex'
  type SpanArrow =
    | { kind: 'id'; object: SpanIndex }
    | { kind: 'leg'; side: 'left' | 'right' }

  const emptyLegs = ((_: never) => {
    throw new Error('empty diagram leg evaluated')
  }) as IndexedFamilies.Family<never, FinSetMor>

  const buildParallelShape = (): FiniteCategory<ParallelIndex, ParallelArrow> => ({
    objects: ['source', 'target'],
    arrows: [
      { kind: 'id', object: 'source' },
      { kind: 'id', object: 'target' },
      { kind: 'edge', name: 'f' },
      { kind: 'edge', name: 'g' },
    ],
    id: (object) => ({ kind: 'id', object }),
    compose: (g, f) => {
      if (f.kind === 'id' && g.kind === 'id') {
        return { kind: 'id', object: f.object }
      }
      if (f.kind === 'id' && g.kind === 'edge') {
        if (f.object !== 'source') {
          throw new Error('parallel: identity domain mismatch on source')
        }
        return g
      }
      if (f.kind === 'edge' && g.kind === 'id') {
        if (g.object !== 'target') {
          throw new Error('parallel: identity codomain mismatch on target')
        }
        return f
      }
      if (f.kind === 'edge' && g.kind === 'edge') {
        throw new Error('parallel: non-identity edges do not compose')
      }
      throw new Error('parallel: unsupported composition shape')
    },
    src: (arrow) => (arrow.kind === 'id' ? arrow.object : 'source'),
    dst: (arrow) => (arrow.kind === 'id' ? arrow.object : 'target'),
    eq: (left, right) =>
      left.kind === right.kind &&
      (left.kind === 'id'
        ? left.object === (right as ParallelArrow & { kind: 'id' }).object
        : left.name === (right as ParallelArrow & { kind: 'edge' }).name),
  })

  const buildSpanShape = (): FiniteCategory<SpanIndex, SpanArrow> => ({
    objects: ['left', 'right', 'apex'],
    arrows: [
      { kind: 'id', object: 'left' },
      { kind: 'id', object: 'right' },
      { kind: 'id', object: 'apex' },
      { kind: 'leg', side: 'left' },
      { kind: 'leg', side: 'right' },
    ],
    id: (object) => ({ kind: 'id', object }),
    compose: (g, f) => {
      if (f.kind === 'id' && g.kind === 'id') {
        return { kind: 'id', object: f.object }
      }
      if (f.kind === 'id' && g.kind === 'leg') {
        if (f.object !== 'apex') {
          throw new Error('span: leg must follow the apex identity')
        }
        return g
      }
      if (f.kind === 'leg' && g.kind === 'id') {
        if (g.object !== (f.side === 'left' ? 'left' : 'right')) {
          throw new Error('span: identity must match leg codomain')
        }
        return f
      }
      if (f.kind === 'leg' && g.kind === 'leg') {
        throw new Error('span: legs do not compose')
      }
      throw new Error('span: unsupported composition shape')
    },
    src: (arrow) => (arrow.kind === 'id' ? arrow.object : 'apex'),
    dst: (arrow) => {
      if (arrow.kind === 'id') return arrow.object
      return arrow.side === 'left' ? 'left' : 'right'
    },
    eq: (left, right) =>
      left.kind === right.kind &&
      (left.kind === 'id'
        ? left.object === (right as SpanArrow & { kind: 'id' }).object
        : left.side === (right as SpanArrow & { kind: 'leg' }).side),
  })

  it('computes the empty diagram colimit as the initial object', () => {
    const indices = IndexedFamilies.finiteIndex<never>([])
    const emptyDiagram = CategoryLimits.finiteDiagramFromDiscrete({
      base: FinSet,
      indices,
      onObjects: ((_: never) => {
        throw new Error('empty diagram has no objects')
      }) as IndexedFamilies.Family<never, FinSetObj>,
    })

    const witness = finsetFiniteColimitFromCoproductsAndCoequalizers(emptyDiagram)
    expect(witness.cocone.coTip).toBe(FinSetFinitelyCocomplete.initialObj)

    const self = witness.factor(witness.cocone)
    expect(self.factored).toBe(true)
    expectEqualArrows(self.mediator!, FinSet.id(witness.cocone.coTip))

    const target = makeFinSetObj(['z0'])
    const candidate: CategoryLimits.Cocone<never, FinSetObj, FinSetMor> = {
      coTip: target,
      legs: emptyLegs,
      diagram: emptyDiagram,
    }

    const factoring = witness.factor(candidate)
    expect(factoring.factored).toBe(true)
    expectEqualArrows(factoring.mediator!, FinSetFinitelyCocomplete.initialArrow(target))
  })

  it('reconstructs coequalizers for parallel pairs', () => {
    const X = makeFinSetObj(['x0', 'x1'])
    const Y = makeFinSetObj(['y0', 'y1', 'y2'])

    const f: FinSetMor = { from: X, to: Y, map: [0, 1] }
    const g: FinSetMor = { from: X, to: Y, map: [1, 1] }

    const shape = buildParallelShape()
    const diagram = CategoryLimits.makeFiniteDiagram<ParallelIndex, ParallelArrow, FinSetObj, FinSetMor>({
      shape,
      onObjects: (index) => (index === 'source' ? X : Y),
      onMorphisms: (arrow) => {
        if (arrow.kind === 'id') {
          return arrow.object === 'source' ? FinSet.id(X) : FinSet.id(Y)
        }
        return arrow.name === 'f' ? f : g
      },
    })

    const witness = finsetFiniteColimitFromCoproductsAndCoequalizers(diagram)

    const identityFactor = witness.factor(witness.cocone)
    expect(identityFactor.factored).toBe(true)
    expectEqualArrows(identityFactor.mediator!, FinSet.id(witness.cocone.coTip))

    const { obj: Q, coequalize } = FinSetFinitelyCocomplete.coequalizer(f, g)
    const sourceLeg = FinSet.compose(coequalize, f)
    const candidate: CategoryLimits.Cocone<ParallelIndex, FinSetObj, FinSetMor> = {
      coTip: Q,
      legs: (index) => (index === 'target' ? coequalize : sourceLeg),
      diagram,
    }

    const factored = witness.factor(candidate)
    expect(factored.factored).toBe(true)
    expectEqualArrows(factored.mediator!, FinSet.id(Q))

    const Z = makeFinSetObj(['z0'])
    const collapse: FinSetMor = { from: Y, to: Z, map: [0, 0, 0] }
    const constantCocone: CategoryLimits.Cocone<ParallelIndex, FinSetObj, FinSetMor> = {
      coTip: Z,
      legs: (index) => (index === 'target' ? collapse : FinSet.compose(collapse, f)),
      diagram,
    }

    const collapseFactor = witness.factor(constantCocone)
    expect(collapseFactor.factored).toBe(true)
    expectEqualArrows(
      FinSet.compose(collapseFactor.mediator!, witness.cocone.legs('target')),
      collapse,
    )

    const brokenCocone: CategoryLimits.Cocone<ParallelIndex, FinSetObj, FinSetMor> = {
      coTip: Z,
      legs: (index) =>
        index === 'target'
          ? collapse
          : { from: X, to: Z, map: [0, 0] },
      diagram,
    }

    const failure = witness.factor(brokenCocone)
    expect(failure.factored).toBe(false)
    expect(failure.reason).toMatch(/commute|cocone/i)
  })

  it('builds pushouts of spans via coproduct coequalizers', () => {
    const X = makeFinSetObj(['x0', 'x1'])
    const A = makeFinSetObj(['a0', 'a1'])
    const B = makeFinSetObj(['b0', 'b1', 'b2'])

    const f: FinSetMor = { from: X, to: A, map: [0, 0] }
    const g: FinSetMor = { from: X, to: B, map: [1, 2] }

    const shape = buildSpanShape()
    const diagram = CategoryLimits.makeFiniteDiagram<SpanIndex, SpanArrow, FinSetObj, FinSetMor>({
      shape,
      onObjects: (index) => {
        if (index === 'left') return A
        if (index === 'right') return B
        return X
      },
      onMorphisms: (arrow) => {
        if (arrow.kind === 'id') {
          if (arrow.object === 'left') return FinSet.id(A)
          if (arrow.object === 'right') return FinSet.id(B)
          return FinSet.id(X)
        }
        return arrow.side === 'left' ? f : g
      },
    })

    const witness = finsetFiniteColimitFromCoproductsAndCoequalizers(diagram)

    const pushout = FinSetFinitelyCocomplete.pushout(f, g)
    const apexLeg = FinSet.compose(pushout.fromDomain, f)
    expectEqualArrows(apexLeg, FinSet.compose(pushout.fromAnchor, g))

    const pushoutCocone: CategoryLimits.Cocone<SpanIndex, FinSetObj, FinSetMor> = {
      coTip: pushout.apex,
      legs: (index) => {
        if (index === 'left') return pushout.fromDomain
        if (index === 'right') return pushout.fromAnchor
        return apexLeg
      },
      diagram,
    }

    const pushoutFactor = witness.factor(pushoutCocone)
    expect(pushoutFactor.factored).toBe(true)
    expectEqualArrows(
      FinSet.compose(pushoutFactor.mediator!, witness.cocone.legs('left')),
      pushout.fromDomain,
    )
    expectEqualArrows(
      FinSet.compose(pushoutFactor.mediator!, witness.cocone.legs('right')),
      pushout.fromAnchor,
    )

    const Z = makeFinSetObj(['z0', 'z1', 'z2'])
    const fromLeft: FinSetMor = { from: A, to: Z, map: [0, 1] }
    const fromRight: FinSetMor = { from: B, to: Z, map: [2, 0, 0] }
    const apexToZ = FinSet.compose(fromLeft, f)
    const commutingCocone: CategoryLimits.Cocone<SpanIndex, FinSetObj, FinSetMor> = {
      coTip: Z,
      legs: (index) => {
        if (index === 'left') return fromLeft
        if (index === 'right') return fromRight
        return apexToZ
      },
      diagram,
    }

    const commutingFactor = witness.factor(commutingCocone)
    expect(commutingFactor.factored).toBe(true)
    expectEqualArrows(
      FinSet.compose(commutingFactor.mediator!, witness.cocone.legs('apex')),
      apexToZ,
    )

    const brokenSpanCocone: CategoryLimits.Cocone<SpanIndex, FinSetObj, FinSetMor> = {
      coTip: Z,
      legs: (index) => {
        if (index === 'left') return fromLeft
        if (index === 'right') return fromRight
        return { from: X, to: Z, map: [1, 0] }
      },
      diagram,
    }

    const spanFailure = witness.factor(brokenSpanCocone)
    expect(spanFailure.factored).toBe(false)
    expect(spanFailure.reason).toMatch(/commute|cocone/i)
  })
})
