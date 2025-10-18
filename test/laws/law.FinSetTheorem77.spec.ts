import { describe, expect, it } from 'vitest'
import { FinSet, makeFinSetObj, finsetExpIsoFromBaseIso, finsetCurryingProductIso, finsetProductExponentIso } from '../../allTS'
import type { FinSetMor, FinSetObj } from '../../allTS'

const expectArrowEqual = (left: FinSetMor, right: FinSetMor) => {
  expect(left.from).toBe(right.from)
  expect(left.to).toBe(right.to)
  expect(left.map).toEqual(right.map)
}

describe('FinSet exponential base-change isomorphism', () => {
  const codomain = makeFinSetObj(['x0', 'x1'])
  const left = makeFinSetObj(['b0', 'b1', 'b2'])
  const right = makeFinSetObj(['c0', 'c1', 'c2'])

  const forward: FinSetMor = { from: left, to: right, map: [2, 0, 1] }
  const backward: FinSetMor = { from: right, to: left, map: [1, 2, 0] }

  it('commutes with evaluation and yields inverse mediators', () => {
    const iso = finsetExpIsoFromBaseIso({ codomain, left, right, forward, backward })

    const composedSource = FinSet.compose(iso.backward, iso.forward)
    const composedTarget = FinSet.compose(iso.forward, iso.backward)

    expectArrowEqual(composedSource, FinSet.id(iso.source.object))
    expectArrowEqual(composedTarget, FinSet.id(iso.target.object))

    iso.source.object.elements.forEach((_value, funcIdx) => {
      const transportedIdx = iso.forward.map[funcIdx]!
      const original = iso.source.functionAt(funcIdx)
      const transported = iso.target.functionAt(transportedIdx)
      transported.forEach((value, bIdx) => {
        const image = forward.map[bIdx]!
        expect(value).toBe(original[image])
      })
    })

    iso.target.object.elements.forEach((_value, funcIdx) => {
      const transportedIdx = iso.backward.map[funcIdx]!
      const original = iso.target.functionAt(funcIdx)
      const transported = iso.source.functionAt(transportedIdx)
      transported.forEach((value, cIdx) => {
        const image = backward.map[cIdx]!
        expect(value).toBe(original[image])
      })
    })
  })

  it('rejects non-bijective base maps', () => {
    const skewForward: FinSetMor = { from: left, to: right, map: [0, 0, 1] }
    expect(() => finsetExpIsoFromBaseIso({ codomain, left, right, forward: skewForward, backward })).toThrow(
      'finsetExpIsoFromBaseIso: backward ∘ forward must be id on the left exponent',
    )
  })

  it('rejects base maps with mismatched domains', () => {
    const wrongDomain: FinSetObj = makeFinSetObj(['z0'])
    const skewForward: FinSetMor = { from: wrongDomain, to: right, map: [0] }
    expect(() => finsetExpIsoFromBaseIso({ codomain, left, right, forward: skewForward, backward })).toThrow(
      'finsetExpIsoFromBaseIso: forward base map must originate at the left exponent',
    )
  })
})

describe('FinSet currying/product exponential isomorphism', () => {
  const codomain = makeFinSetObj(['a0', 'a1'])
  const left = makeFinSetObj(['b0', 'b1'])
  const right = makeFinSetObj(['c0', 'c1', 'c2'])
  const iso = finsetCurryingProductIso({ codomain, left, right })
  const productTuples = FinSet.product([left, right]).obj.elements as ReadonlyArray<ReadonlyArray<number>>

  const inner = iso.inner
  const componentIndices = [
    inner.indexOfFunction([0, 1, 0]),
    inner.indexOfFunction([1, 0, 1]),
  ]
  const sourceIdx = iso.source.indexOfFunction(componentIndices)

  it('shuttles between (A^C)^B and A^{B×C} via uncurry/curry', () => {
    const transportedIdx = iso.forward.map[sourceIdx]!
    const transported = iso.target.functionAt(transportedIdx)

    transported.forEach((value, tupleIdx) => {
      const tuple = productTuples[tupleIdx]
      if (!tuple) {
        throw new Error('currying iso: expected tuple for product index')
      }
      const bIdx = tuple[0]
      const cIdx = tuple[1]
      if (bIdx === undefined || cIdx === undefined) {
        throw new Error('currying iso: product tuple must have two coordinates')
      }
      const innerIdx = iso.source.functionAt(sourceIdx)[bIdx]
      if (innerIdx === undefined) {
        throw new Error('currying iso: missing component index')
      }
      const innerValues = inner.functionAt(innerIdx)
      const innerValue = innerValues[cIdx]
      if (innerValue === undefined) {
        throw new Error('currying iso: missing value for component tuple')
      }
      expect(value).toBe(innerValue)
    })

    const returnedIdx = iso.backward.map[transportedIdx]!
    expect(returnedIdx).toBe(sourceIdx)
  })

  it('recovers component arrows after currying back', () => {
    const outputs = productTuples.map((tuple) => {
      const bIdx = tuple[0]
      const cIdx = tuple[1]
      if (bIdx === undefined || cIdx === undefined) {
        throw new Error('currying iso: product tuple must have two coordinates')
      }
      const innerIdx = componentIndices[bIdx]
      if (innerIdx === undefined) {
        throw new Error('currying iso: missing component index')
      }
      const innerValues = inner.functionAt(innerIdx)
      const innerValue = innerValues[cIdx]
      if (innerValue === undefined) {
        throw new Error('currying iso: missing value for component tuple')
      }
      return innerValue
    })
    const targetIdx = iso.target.indexOfFunction(outputs)
    const recoveredIdx = iso.backward.map[targetIdx]!
    expect(recoveredIdx).toBe(sourceIdx)
  })
})

describe('FinSet exponential/product decomposition isomorphism', () => {
  const left = makeFinSetObj(['a0', 'a1'])
  const right = makeFinSetObj(['b0', 'b1'])
  const exponent = makeFinSetObj(['c0', 'c1', 'c2'])
  const iso = finsetProductExponentIso({ left, right, exponent })
  const productTuples = FinSet.product([left, right]).obj.elements as ReadonlyArray<ReadonlyArray<number>>
  const productIndex = new Map<string, number>()
  productTuples.forEach((tuple, idx) => productIndex.set(tuple.join(','), idx))

  const outputs = [
    productIndex.get('0,0')!,
    productIndex.get('1,0')!,
    productIndex.get('0,1')!,
  ]
  const sourceIdx = iso.exponential.indexOfFunction(outputs)

  it('splits (A×B)^C into A^C × B^C and recombines inverses', () => {
    const transportedIdx = iso.forward.map[sourceIdx]!
    const transportedTuple = iso.forward.to.elements[transportedIdx] as ReadonlyArray<number>
    const leftIdx = transportedTuple[0]
    const rightIdx = transportedTuple[1]
    if (leftIdx === undefined || rightIdx === undefined) {
      throw new Error('product exponent iso: expected pair indices in transported tuple')
    }

    const leftValues = iso.factors[0].functionAt(leftIdx)
    const rightValues = iso.factors[1].functionAt(rightIdx)

    leftValues.forEach((value, idx) => {
      const outputIdx = outputs[idx]
      if (outputIdx === undefined) {
        throw new Error('product exponent iso: missing output index for component')
      }
      const tuple = productTuples[outputIdx]
      if (!tuple) {
        throw new Error('product exponent iso: expected tuple for stored index')
      }
      const tupleLeft = tuple[0]
      const tupleRight = tuple[1]
      if (tupleLeft === undefined || tupleRight === undefined) {
        throw new Error('product exponent iso: stored tuples must be pairs')
      }
      const rightValue = rightValues[idx]
      if (rightValue === undefined) {
        throw new Error('product exponent iso: missing right component value')
      }
      expect(value).toBe(tupleLeft)
      expect(rightValue).toBe(tupleRight)
    })

    const composedSource = FinSet.compose(iso.backward, iso.forward)
    const composedTarget = FinSet.compose(iso.forward, iso.backward)
    expectArrowEqual(composedSource, FinSet.id(iso.exponential.object))
    expectArrowEqual(composedTarget, FinSet.id(iso.forward.to))
  })

  it('reconstructs original evaluations after pairing components', () => {
    const transportedIdx = iso.forward.map[sourceIdx]!
    const recoveredIdx = iso.backward.map[transportedIdx]!
    expect(recoveredIdx).toBe(sourceIdx)

    const projectionLeft = FinSet.compose(iso.projections[0], iso.forward)
    const projectionRight = FinSet.compose(iso.projections[1], iso.forward)

    const expectedLeft: FinSetMor = {
      from: iso.exponential.object,
      to: iso.factors[0].object,
      map: iso.exponential.object.elements.map((_value, idx) => {
        const outputs = iso.exponential.functionAt(idx)
        const values = outputs.map((pairIdx) => productTuples[pairIdx]![0]!)
        return iso.factors[0].indexOfFunction(values)
      }),
    }

    const expectedRight: FinSetMor = {
      from: iso.exponential.object,
      to: iso.factors[1].object,
      map: iso.exponential.object.elements.map((_value, idx) => {
        const outputs = iso.exponential.functionAt(idx)
        const values = outputs.map((pairIdx) => productTuples[pairIdx]![1]!)
        return iso.factors[1].indexOfFunction(values)
      }),
    }

    expectArrowEqual(projectionLeft, expectedLeft)
    expectArrowEqual(projectionRight, expectedRight)
  })
})
