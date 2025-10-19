import { describe, expect, test } from 'vitest'

import {
  FinSet,
  assertFinSetMor,
  finsetBijection,
  finsetInverse,
  isFinSetMor,
  makeFinSetObj,
  type FinSetMor,
  type FinSetObj,
} from '../allTS'

describe('FinSet morphism validation', () => {
  const makeObj = (elements: ReadonlyArray<unknown>): FinSetObj => makeFinSetObj(elements)

  test('accepts morphisms whose map matches the domain size and codomain bounds', () => {
    const from = makeObj(['a0', 'a1'])
    const to = makeObj(['b0', 'b1', 'b2'])
    const arrow: FinSetMor = { from, to, map: [1, 2] }

    expect(isFinSetMor(arrow)).toBe(true)
    expect(assertFinSetMor(arrow)).toBe(arrow)
    expect(() => FinSet.compose(arrow, FinSet.id(from))).not.toThrow()
  })

  test('rejects maps whose length differs from the domain size', () => {
    const from = makeObj(['a0', 'a1'])
    const to = makeObj(['b0', 'b1', 'b2'])
    const badLength = { from, to, map: [0] }

    expect(isFinSetMor(badLength)).toBe(false)
    expect(() => assertFinSetMor(badLength)).toThrow(
      /Expected a FinSet morphism: map length 1 does not match domain cardinality 2/,
    )
  })

  test('rejects maps that reference elements outside the codomain', () => {
    const from = makeObj(['a0', 'a1'])
    const to = makeObj(['b0', 'b1', 'b2'])
    const outOfRange = { from, to, map: [0, 3] }

    expect(isFinSetMor(outOfRange)).toBe(false)
    expect(() => assertFinSetMor(outOfRange)).toThrow(
      /Expected a FinSet morphism: map\[1] = 3 lies outside codomain of size 3/,
    )
  })

  test('rejects attempts to map into the initial object from a non-empty set', () => {
    const attempt = { from: FinSet.terminalObj, to: FinSet.initialObj, map: [0] }

    expect(isFinSetMor(attempt)).toBe(false)
    expect(() => assertFinSetMor(attempt)).toThrow(
      /Expected a FinSet morphism: map\[0] = 0 lies outside codomain of size 0/,
    )
  })
})

describe('FinSet bijection helpers', () => {
  const A = makeFinSetObj(['a0', 'a1'])
  const B = makeFinSetObj(['b0', 'b1'])

  test('constructs bijections and inverses when provided with valid data', () => {
    const bijection = finsetBijection(A, B, [1, 0])
    expect(bijection.map).toEqual([1, 0])

    const inverse = finsetInverse(bijection)
    expect(inverse.map).toEqual([1, 0])

    const recomposed = FinSet.compose(finsetInverse(bijection), bijection)
    expect(recomposed.map).toEqual([0, 1])
  })

  test('rejects bijections when the map references nonexistent codomain indices', () => {
    expect(() => finsetBijection(A, B, [0, 2])).toThrow(
      /finsetBijection: Expected a FinSet morphism: map\[1] = 2 lies outside codomain of size 2/,
    )
  })

  test('rejects inverse construction for non-bijective maps', () => {
    const notBijection = assertFinSetMor({ from: A, to: B, map: [0, 0] })

    expect(() => finsetInverse(notBijection)).toThrow(
      /finsetInverse: Expected a FinSet morphism: map\[1] = -1 is negative/,
    )
  })
})
