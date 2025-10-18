import { describe, expect, it } from 'vitest'
import {
  FinSet,
  makeFinSetObj,
  finSetExponential,
  expPrecompose,
  expPostcompose,
  finsetExpFromTerminalIso,
  finsetExpToTerminalIso,
  finsetProductLeftUnitWitness,
  finsetProductRightUnitWitness,
  finsetExponentialTranspose,
  finsetNameFromArrow,
  finsetArrowFromName,
  finsetPointElement,
  finsetPointFromArrow,
  assertFinSetMor,
} from '../../allTS'
import type { FinSetMor, FinSetObj } from '../../allTS'

const encodeIndices = (indices: ReadonlyArray<number>): string => indices.join(',')

const asProductMap = (morphism: FinSetMor): Map<string, number> => {
  const tuples = morphism.from.elements as ReadonlyArray<ReadonlyArray<number>>
  const mapping = new Map<string, number>()
  tuples.forEach((tuple, idx) => mapping.set(tuple.join(','), morphism.map[idx]!))
  return mapping
}

const expectBinaryTuple = (tuple: ReadonlyArray<number>): readonly [number, number] => {
  if (tuple.length !== 2) {
    throw new Error('expected binary tuple for FinSet product element')
  }
  const [first, second] = tuple
  if (first === undefined || second === undefined) {
    throw new Error('expected defined coordinates for FinSet product element')
  }
  return [first, second]
}

const expectSameArrow = (left: FinSetMor, right: FinSetMor) => {
  expect(left.to).toBe(right.to)
  expect(left.map.length).toBe(right.map.length)
  const leftMap = asProductMap(left)
  const rightMap = asProductMap(right)
  expect(leftMap).toEqual(rightMap)
}

const expectIdenticalArrow = (left: FinSetMor, right: FinSetMor) => {
  expect(left.from).toBe(right.from)
  expect(left.to).toBe(right.to)
  expect(left.map).toEqual(right.map)
}

describe('FinSet exponential structure', () => {
  const X: FinSetObj = makeFinSetObj(['x0', 'x1'])
  const S: FinSetObj = makeFinSetObj(['s0', 's1'])
  const A: FinSetObj = makeFinSetObj(['a0', 'a1'])
  const { obj: productAS } = FinSet.product([A, S])

  const indexAS = new Map<string, number>()
  ;(productAS.elements as ReadonlyArray<ReadonlyArray<number>>).forEach((tuple, idx) => {
    indexAS.set(tuple.join(','), idx)
  })

  const f: FinSetMor = {
    from: productAS,
    to: X,
    map: (productAS.elements as ReadonlyArray<ReadonlyArray<number>>).map((tuple) => {
      const [aIdx, sIdx] = expectBinaryTuple(tuple)
      return (aIdx + 2 * sIdx) % X.elements.length
    }),
  }

  it('supports curry/uncurry witnesses for the universal property', () => {
    const exponential = finSetExponential(X, S)
    const curried = exponential.curry(A, f)
    const uncurried = exponential.uncurry(A, curried)

    const expected: FinSetMor = {
      from: uncurried.from,
      to: X,
      map: (uncurried.from.elements as ReadonlyArray<ReadonlyArray<number>>).map((tuple) => {
        const key = tuple.join(',')
        const idx = indexAS.get(key)
        if (idx === undefined) {
          throw new Error('expected tuple in A×S domain')
        }
        return f.map[idx]!
      }),
    }

    expectSameArrow(uncurried, expected)
  })

  it('realises expPrecompose identity and composition via currying', () => {
    const exponential = finSetExponential(X, S)
    const curried = exponential.curry(A, f)
    const idS = FinSet.id(S)
    const viaId = FinSet.compose(expPrecompose(X, idS, S, S), curried)
    const idUncurried = exponential.uncurry(A, viaId)

    const expectedId: FinSetMor = {
      from: idUncurried.from,
      to: X,
      map: (idUncurried.from.elements as ReadonlyArray<ReadonlyArray<number>>).map((tuple) => {
        const key = tuple.join(',')
        const idx = indexAS.get(key)
        if (idx === undefined) {
          throw new Error('expected tuple in A×S domain')
        }
        return f.map[idx]!
      }),
    }
    expectSameArrow(idUncurried, expectedId)

    const Sprime: FinSetObj = makeFinSetObj(['t0', 't1', 't2'])
    const Sdouble: FinSetObj = makeFinSetObj(['u0', 'u1'])
    const r2: FinSetMor = { from: Sprime, to: S, map: [0, 1, 1] }
    const r1: FinSetMor = { from: Sdouble, to: Sprime, map: [0, 2] }

    const curriedThrough = FinSet.compose(expPrecompose(X, r2, S, Sprime), curried)
    const composed = FinSet.compose(expPrecompose(X, r1, Sprime, Sdouble), curriedThrough)
    const uncurried = finSetExponential(X, Sdouble).uncurry(A, composed)

    const expected: FinSetMor = {
      from: uncurried.from,
      to: X,
      map: (uncurried.from.elements as ReadonlyArray<ReadonlyArray<number>>).map((tuple) => {
        const [aIdx, sIdx] = expectBinaryTuple(tuple)
        const composedIndex = r1.map[sIdx]
        if (composedIndex === undefined) {
          throw new Error('expected defined coordinate when composing precomposition witnesses')
        }
        const liftedIndex = r2.map[composedIndex]
        if (liftedIndex === undefined) {
          throw new Error('expected defined coordinate in second precomposition witness')
        }
        const key = [aIdx, liftedIndex].join(',')
        const idx = indexAS.get(key)
        if (idx === undefined) {
          throw new Error('expected tuple in A×S domain')
        }
        return f.map[idx]!
      }),
    }

    expectSameArrow(uncurried, expected)
  })

  it('realises expPostcompose identity and composition via currying', () => {
    const exponential = finSetExponential(X, S)
    const curried = exponential.curry(A, f)

    const idX = FinSet.id(X)
    const viaId = FinSet.compose(expPostcompose(idX, S), curried)
    const idUncurried = exponential.uncurry(A, viaId)

    const expectedId: FinSetMor = {
      from: idUncurried.from,
      to: X,
      map: (idUncurried.from.elements as ReadonlyArray<ReadonlyArray<number>>).map((tuple) => {
        const key = tuple.join(',')
        const idx = indexAS.get(key)
        if (idx === undefined) {
          throw new Error('expected tuple in A×S domain')
        }
        return f.map[idx]!
      }),
    }
    expectSameArrow(idUncurried, expectedId)

    const Y: FinSetObj = makeFinSetObj(['y0', 'y1', 'y2'])
    const Z: FinSetObj = makeFinSetObj(['z0', 'z1'])
    const h2: FinSetMor = { from: X, to: Y, map: [0, 2] }
    const h1: FinSetMor = { from: Y, to: Z, map: [1, 0, 1] }

    const composed = FinSet.compose(expPostcompose(h1, S), FinSet.compose(expPostcompose(h2, S), curried))
    const uncurried = finSetExponential(Z, S).uncurry(A, composed)

    const expected: FinSetMor = {
      from: uncurried.from,
      to: Z,
      map: (uncurried.from.elements as ReadonlyArray<ReadonlyArray<number>>).map((tuple) => {
        const key = tuple.join(',')
        const idx = indexAS.get(key)
        if (idx === undefined) {
          throw new Error('expected tuple in A×S domain')
        }
        const throughY = h2.map[f.map[idx]!]!
        return h1.map[throughY]!
      }),
    }

    expectSameArrow(uncurried, expected)
  })

  it('names arrows and reconstructs them via evaluation', () => {
    const codomain: FinSetObj = makeFinSetObj(['c0', 'c1', 'c2'])
    const arrow: FinSetMor = {
      from: A,
      to: codomain,
      map: [1, 2],
    }

    const { name, evaluationMediator } = finsetNameFromArrow({ domain: A, codomain, arrow })
    const exponential = finSetExponential(codomain, A)

    const evaluationComposite = FinSet.compose(exponential.evaluation, evaluationMediator)
    const { forward } = finsetProductLeftUnitWitness(A)
    const throughProduct = FinSet.compose(arrow, forward)

    expectSameArrow(evaluationComposite, throughProduct)

    const recovered = finsetArrowFromName({ domain: A, codomain, name })
    expectIdenticalArrow(recovered, arrow)
  })

  it('constructs points from elements and recovers their indices', () => {
    const object: FinSetObj = makeFinSetObj(['p0', 'p1', 'p2'])

    object.elements.forEach((_value, idx) => {
      const point = finsetPointElement(object, idx)
      expect(point.from).toBe(FinSet.terminalObj)
      expect(point.to).toBe(object)
      expect(point.map).toEqual([idx])
      expect(finsetPointFromArrow(object, point)).toBe(idx)
    })

    expect(() => finsetPointElement(object, object.elements.length)).toThrow(
      /finsetPointElement: elementIndex out of range for the provided object/,
    )

    const other: FinSetObj = makeFinSetObj(['q0'])
    const otherPoint = finsetPointElement(other, 0)
    expect(() => finsetPointFromArrow(object, otherPoint)).toThrow(
      /finsetPointFromArrow: arrow codomain must match the provided object/,
    )
  })

  it('evaluates named arrows at chosen points via the exponential mediator', () => {
    const codomain: FinSetObj = makeFinSetObj(['d0', 'd1', 'd2'])
    const arrow: FinSetMor = { from: A, to: codomain, map: [2, 1] }

    const { name } = finsetNameFromArrow({ domain: A, codomain, arrow })
    const exponential = finSetExponential(codomain, A)

    const tupleIndex = new Map<string, number>()
    ;(exponential.product.elements as ReadonlyArray<ReadonlyArray<number>>).forEach((tuple, idx) => {
      tupleIndex.set(encodeIndices(tuple), idx)
    })

    const functionIndex = name.map[0]
    if (functionIndex === undefined) {
      throw new Error('expected a function index for the named arrow')
    }

    A.elements.forEach((_value, idx) => {
      const point = finsetPointElement(A, idx)
      expect(finsetPointFromArrow(A, point)).toBe(idx)

      const composite = FinSet.compose(arrow, point)

      const key = encodeIndices([functionIndex, idx])
      const productIndex = tupleIndex.get(key)
      if (productIndex === undefined) {
        throw new Error('expected tuple in exponential product for ⟨name(f), x⟩')
      }

      const pair = assertFinSetMor({
        from: FinSet.terminalObj,
        to: exponential.product,
        map: [productIndex],
      })

      const evaluated = FinSet.compose(exponential.evaluation, pair)
      expectIdenticalArrow(evaluated, composite)
    })
  })

  it('equates arrow names precisely when the underlying arrows match', () => {
    const codomain: FinSetObj = makeFinSetObj(['c0', 'c1', 'c2'])
    const arrow1: FinSetMor = { from: A, to: codomain, map: [0, 2] }
    const arrow2: FinSetMor = { from: A, to: codomain, map: [0, 2] }
    const arrow3: FinSetMor = { from: A, to: codomain, map: [1, 2] }

    const name1 = finsetNameFromArrow({ domain: A, codomain, arrow: arrow1 }).name
    const name2 = finsetNameFromArrow({ domain: A, codomain, arrow: arrow2 }).name
    const name3 = finsetNameFromArrow({ domain: A, codomain, arrow: arrow3 }).name

    expectIdenticalArrow(name1, name2)
    expect(FinSet.equalMor?.(name1, name3)).toBe(false)

    const recovered1 = finsetArrowFromName({ domain: A, codomain, name: name1 })
    const recovered3 = finsetArrowFromName({ domain: A, codomain, name: name3 })

    expectIdenticalArrow(recovered1, arrow1)
    expect(FinSet.equalMor?.(recovered1, recovered3)).toBe(false)
  })

  it('rejects ill-shaped naming attempts', () => {
    const codomain: FinSetObj = makeFinSetObj(['c0'])
    const mismatchedDomain: FinSetObj = makeFinSetObj(['d0'])
    const arrow: FinSetMor = { from: mismatchedDomain, to: codomain, map: [0] }

    expect(() =>
      finsetNameFromArrow({ domain: A, codomain, arrow }),
      ).toThrow(/finsetNameFromArrow: arrow domain mismatch/)

    const goodArrow: FinSetMor = { from: A, to: codomain, map: [0, 0] }
    const { name } = finsetNameFromArrow({ domain: A, codomain, arrow: goodArrow })

    const wrongCodomain: FinSetObj = makeFinSetObj([])
    expect(() =>
      finsetArrowFromName({ domain: A, codomain: wrongCodomain, name }),
      ).toThrow(/finsetArrowFromName: name must land in the expected exponential object/)
  })
})

const makeSwap = (from: FinSetObj, to: FinSetObj): FinSetMor => {
  const fromTuples = from.elements as ReadonlyArray<ReadonlyArray<number>>
  const index = new Map<string, number>()
  ;(to.elements as ReadonlyArray<ReadonlyArray<number>>).forEach((tuple, idx) => {
    index.set(tuple.join(','), idx)
  })
  const map = fromTuples.map(([first, second]) => {
    const key = [second, first].join(',')
    const idx = index.get(key)
    if (idx === undefined) {
      throw new Error('makeSwap: expected swapped tuple in target product')
    }
    return idx
  })
  return { from, to, map }
}

describe('FinSet exponential transposes', () => {
  const A = makeFinSetObj(['a0', 'a1'])
  const B = makeFinSetObj(['b0', 'b1', 'b2'])
  const C = makeFinSetObj(['c0', 'c1', 'c2', 'c3'])
  const transpose = finsetExponentialTranspose({ left: A, right: B, codomain: C })

  it('provides inverse bijections between Hom(A, C^B) and Hom(B, C^A)', () => {
    const { obj: productAB } = FinSet.product([A, B])
    const base: FinSetMor = {
      from: productAB,
      to: C,
      map: (productAB.elements as ReadonlyArray<ReadonlyArray<number>>).map((tuple) => {
        const aIdx = tuple[0]
        const bIdx = tuple[1]
        if (aIdx === undefined || bIdx === undefined) {
          throw new Error('transpose test: expected binary tuple in product elements')
        }
        return (aIdx + 2 * bIdx) % C.elements.length
      }),
    }

    const h = transpose.rightExponential.curry(A, base)
    const toLeft = transpose.toRight(h)
    const roundTrip = transpose.toLeft(toLeft)
    expectIdenticalArrow(roundTrip, h)

    const { obj: productBA } = FinSet.product([B, A])
    const other: FinSetMor = {
      from: productBA,
      to: C,
      map: (productBA.elements as ReadonlyArray<ReadonlyArray<number>>).map((tuple) => {
        const bIdx = tuple[0]
        const aIdx = tuple[1]
        if (aIdx === undefined || bIdx === undefined) {
          throw new Error('transpose test: expected binary tuple in product elements')
        }
        return (3 * bIdx + aIdx) % C.elements.length
      }),
    }

    const k = transpose.leftExponential.curry(B, other)
    const toRight = transpose.toLeft(k)
    const roundTripOther = transpose.toRight(toRight)
    expectIdenticalArrow(roundTripOther, k)
  })

  it('reconstructs the underlying evaluation composites after transposing', () => {
    const { obj: productAB } = FinSet.product([A, B])
    const base: FinSetMor = {
      from: productAB,
      to: C,
      map: (productAB.elements as ReadonlyArray<ReadonlyArray<number>>).map((tuple) => {
        const aIdx = tuple[0]
        const bIdx = tuple[1]
        if (aIdx === undefined || bIdx === undefined) {
          throw new Error('transpose test: expected binary tuple in product elements')
        }
        return (aIdx + bIdx) % C.elements.length
      }),
    }

    const h = transpose.rightExponential.curry(A, base)
    const toLeft = transpose.toRight(h)
    const original = transpose.rightExponential.uncurry(A, h)
    const transposed = transpose.leftExponential.uncurry(B, toLeft)
    const swap = makeSwap(original.from, transposed.from)
    const reconstructed = FinSet.compose(transposed, swap)
    expectSameArrow(reconstructed, original)

    const { obj: productBA } = FinSet.product([B, A])
    const other: FinSetMor = {
      from: productBA,
      to: C,
      map: (productBA.elements as ReadonlyArray<ReadonlyArray<number>>).map((tuple) => {
        const bIdx = tuple[0]
        const aIdx = tuple[1]
        if (aIdx === undefined || bIdx === undefined) {
          throw new Error('transpose test: expected binary tuple in product elements')
        }
        return (2 * bIdx + aIdx) % C.elements.length
      }),
    }

    const k = transpose.leftExponential.curry(B, other)
    const backToRight = transpose.toLeft(k)
    const start = transpose.leftExponential.uncurry(B, k)
    const recovered = transpose.rightExponential.uncurry(A, backToRight)
    const swapBack = makeSwap(start.from, recovered.from)
    const reconstructedBack = FinSet.compose(recovered, swapBack)
    expectSameArrow(reconstructedBack, start)
  })
})

describe('FinSet exponentials with terminal arguments', () => {
  it('identifies C^1 with C and keeps the evaluation triangle visible', () => {
    const C = makeFinSetObj(['c0', 'c1', 'c2'])
    const exponential = finSetExponential(C, FinSet.terminalObj)
    const { forward, backward } = finsetExpFromTerminalIso({ codomain: C, exponential })

    const expectedForward: FinSetMor = {
      from: C,
      to: exponential.object,
      map: C.elements.map((_value, idx) => exponential.indexOfFunction([idx])),
    }
    expectIdenticalArrow(forward, expectedForward)

    const expectedBackward: FinSetMor = {
      from: exponential.object,
      to: C,
      map: exponential.object.elements.map((_func, idx) => exponential.functionAt(idx)[0]!),
    }
    expectIdenticalArrow(backward, expectedBackward)

    const roundTrip = FinSet.compose(backward, forward)
    expect(FinSet.equalMor?.(roundTrip, FinSet.id(C))).toBe(true)

    const { product: productC1, forward: projection } = finsetProductRightUnitWitness(C)
      const tupleIndex = new Map<string, number>()
      ;(exponential.product.elements as ReadonlyArray<ReadonlyArray<number>>).forEach((tuple, idx) => {
        tupleIndex.set(tuple.join(','), idx)
      })
      const triangle: FinSetMor = {
        from: productC1,
        to: exponential.product,
        map: (productC1.elements as ReadonlyArray<ReadonlyArray<number>>).map(([cIdx, termIdx]) => {
          if (cIdx === undefined || termIdx === undefined) {
            throw new Error('terminal exponential: malformed product tuple encountered')
          }
          const forwardImage = forward.map[cIdx]
          if (forwardImage === undefined) {
            throw new Error('terminal exponential: forward mediator missing image for component')
          }
          const key = [forwardImage, termIdx].join(',')
          const image = tupleIndex.get(key)
          if (image === undefined) {
            throw new Error('expected tuple in exponential domain')
          }
          return image
        }),
      }

    const evaluationComposite = FinSet.compose(exponential.evaluation, triangle)
    expect(FinSet.equalMor?.(evaluationComposite, projection)).toBe(true)
  })

  it('identifies 1^B with 1 and enforces the evaluation triangle', () => {
    const B = makeFinSetObj(['b0', 'b1'])
    const exponential = finSetExponential(FinSet.terminalObj, B)
    const { forward, backward } = finsetExpToTerminalIso({ base: B, exponential })

    const expectedForward: FinSetMor = {
      from: exponential.object,
      to: FinSet.terminalObj,
      map: exponential.object.elements.map(() => 0),
    }
    expectIdenticalArrow(forward, expectedForward)

    const expectedBackward: FinSetMor = {
      from: FinSet.terminalObj,
      to: exponential.object,
      map: [exponential.indexOfFunction(Array.from({ length: B.elements.length }, () => 0))],
    }
    expectIdenticalArrow(backward, expectedBackward)

    const roundTrip = FinSet.compose(backward, forward)
    expect(FinSet.equalMor?.(roundTrip, FinSet.id(exponential.object))).toBe(true)

    const { product: product1B, terminalProjection } = finsetProductLeftUnitWitness(B)
      const tupleIndex = new Map<string, number>()
      ;(exponential.product.elements as ReadonlyArray<ReadonlyArray<number>>).forEach((tuple, idx) => {
        tupleIndex.set(tuple.join(','), idx)
      })
      const triangle: FinSetMor = {
        from: product1B,
        to: exponential.product,
        map: (product1B.elements as ReadonlyArray<ReadonlyArray<number>>).map(([termIdx, bIdx]) => {
          if (termIdx === undefined || bIdx === undefined) {
            throw new Error('terminal exponential: malformed product tuple encountered')
          }
          const backwardImage = backward.map[termIdx]
          if (backwardImage === undefined) {
            throw new Error('terminal exponential: backward mediator missing image for component')
          }
          const key = [backwardImage, bIdx].join(',')
          const image = tupleIndex.get(key)
          if (image === undefined) {
            throw new Error('expected tuple in exponential domain')
          }
          return image
        }),
      }

    const evaluationComposite = FinSet.compose(exponential.evaluation, triangle)
    expect(FinSet.equalMor?.(evaluationComposite, terminalProjection)).toBe(true)
  })

  it('rejects mismatched witnesses for terminal exponentials', () => {
    const C = makeFinSetObj(['c0', 'c1'])
    const nonTerminalBase = makeFinSetObj(['s0', 's1'])
    const wrongExponential = finSetExponential(C, nonTerminalBase)
    expect(() => finsetExpFromTerminalIso({ codomain: C, exponential: wrongExponential })).toThrow(/terminal/)

    const otherCodomain = makeFinSetObj(['d0', 'd1'])
    const terminalExponential = finSetExponential(otherCodomain, FinSet.terminalObj)
    expect(() => finsetExpFromTerminalIso({ codomain: C, exponential: terminalExponential })).toThrow(/codomain/)

    const mismatchBase = makeFinSetObj(['b0'])
    const exponential = finSetExponential(FinSet.terminalObj, nonTerminalBase)
    expect(() => finsetExpToTerminalIso({ base: mismatchBase, exponential })).toThrow(/base object/)

    const wrongCodomain = finSetExponential(C, mismatchBase)
    expect(() => finsetExpToTerminalIso({ base: mismatchBase, exponential: wrongCodomain })).toThrow(/terminal object/)
  })
})

describe('FinSet product unit witnesses', () => {
  it('realises the right unit isomorphism', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const { product, forward, backward } = finsetProductRightUnitWitness(A)

    const composed = FinSet.compose(forward, backward)
    expect(FinSet.equalMor?.(composed, FinSet.id(A))).toBe(true)

    const roundTrip = FinSet.compose(backward, forward)
    expect(FinSet.equalMor?.(roundTrip, FinSet.id(product))).toBe(true)
  })

  it('realises the left unit isomorphism', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const { product, forward, backward, terminalProjection } = finsetProductLeftUnitWitness(A)

    const composed = FinSet.compose(forward, backward)
    expect(FinSet.equalMor?.(composed, FinSet.id(A))).toBe(true)

    const roundTrip = FinSet.compose(backward, forward)
    expect(FinSet.equalMor?.(roundTrip, FinSet.id(product))).toBe(true)

    expect(terminalProjection.to).toBe(FinSet.terminalObj)
  })
})
