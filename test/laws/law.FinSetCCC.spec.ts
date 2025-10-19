import { describe, expect, it } from 'vitest'

import { FinSet, FinSetCCC, makeFinSetObj } from '../../allTS'
import type { CartesianClosedCategory } from '../../stdlib/category'
import type { FinSetMor, FinSetObj } from '../../allTS'

describe('FinSet cartesian closed structure', () => {
  const ccc: CartesianClosedCategory<FinSetObj, FinSetMor> = FinSetCCC

  const equals = (f: FinSetMor, g: FinSetMor): boolean =>
    (FinSet.equalMor?.(f, g) ?? false) ||
    (f.from === g.from &&
      f.to === g.to &&
      f.map.length === g.map.length &&
      f.map.every((value, index) => value === g.map[index]))

  it('satisfies the product unit laws', () => {
    const X = makeFinSetObj(['x0', 'x1', 'x2'])

    const terminateX = ccc.terminal.terminate(X)

    const rightProduct = ccc.binaryProduct(X, ccc.terminal.obj)
    const pairRight = rightProduct.pair(X, FinSet.id(X), terminateX)

    const proj1Right = FinSet.compose(rightProduct.proj1, pairRight)
    const proj2Right = FinSet.compose(rightProduct.proj2, pairRight)

    expect(equals(proj1Right, FinSet.id(X))).toBe(true)
    expect(equals(proj2Right, terminateX)).toBe(true)

    const leftProduct = ccc.binaryProduct(ccc.terminal.obj, X)
    const pairLeft = leftProduct.pair(X, terminateX, FinSet.id(X))

    const proj1Left = FinSet.compose(leftProduct.proj1, pairLeft)
    const proj2Left = FinSet.compose(leftProduct.proj2, pairLeft)

    expect(equals(proj1Left, terminateX)).toBe(true)
    expect(equals(proj2Left, FinSet.id(X))).toBe(true)
  })

  it('realises the exponential universal property', () => {
    const X = makeFinSetObj(['x0', 'x1'])
    const A = makeFinSetObj(['a0', 'a1'])
    const B = makeFinSetObj(['b0', 'b1', 'b2'])

    const productXA = ccc.binaryProduct(X, A)
    const h: FinSetMor = {
      from: productXA.obj,
      to: B,
      map: productXA.obj.elements.map(tuple => {
        const coords = tuple as ReadonlyArray<number>
        const xIx = coords[0]
        const aIx = coords[1]
        if (xIx === undefined || aIx === undefined) {
          throw new Error('FinSet CCC: expected binary product tuple')
        }
        return (xIx * 2 + aIx) % B.elements.length
      })
    }

    const expWitness = ccc.exponential(A, B)
    const lambda = expWitness.curry(X, h)

    const lambdaPi1 = FinSet.compose(lambda, productXA.proj1)
    const intoEval = expWitness.product.pair(productXA.obj, lambdaPi1, productXA.proj2)
    const recomposed = FinSet.compose(expWitness.evaluation, intoEval)

    expect(equals(recomposed, h)).toBe(true)
  })

  it('establishes the curry/uncurry transpose bijection', () => {
    const X = makeFinSetObj(['x0', 'x1'])
    const A = makeFinSetObj(['a0', 'a1'])
    const B = makeFinSetObj(['b0', 'b1', 'b2'])

    const productXA = ccc.binaryProduct(X, A)
    const h: FinSetMor = {
      from: productXA.obj,
      to: B,
      map: productXA.obj.elements.map(tuple => {
        const coords = tuple as ReadonlyArray<number>
        const xIx = coords[0]
        const aIx = coords[1]
        if (xIx === undefined || aIx === undefined) {
          throw new Error('FinSet CCC: expected binary product tuple')
        }
        return (xIx + aIx * 2) % B.elements.length
      })
    }

    const expWitness = ccc.exponential(A, B)
    const lambda = expWitness.curry(X, h)

    const recovered = expWitness.uncurry(X, lambda)
    expect(equals(recovered, h)).toBe(true)

    const roundTrip = expWitness.curry(X, recovered)
    expect(equals(roundTrip, lambda)).toBe(true)
  })
})
