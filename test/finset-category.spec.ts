import { describe, expect, it } from 'vitest'

import {
  FinSet,
  assertFinSetMor,
  finsetBijection,
  finsetInverse,
  isFinSetMor,
  makeFinSetObj,
  type FinSetMor,
} from '../allTS'

describe('FinSet morphism validation', () => {
  const A = makeFinSetObj(['a0', 'a1'])
  const B = makeFinSetObj(['b0', 'b1', 'b2'])

  it('accepts morphisms whose map matches the domain size and codomain bounds', () => {
    const arrow: FinSetMor = { from: A, to: B, map: [1, 2] }

    expect(isFinSetMor(arrow)).toBe(true)
    expect(assertFinSetMor(arrow)).toBe(arrow)
    expect(() => FinSet.compose(arrow, FinSet.id(A))).not.toThrow()
  })

  it('rejects maps whose length differs from the domain size', () => {
    const badLength = { from: A, to: B, map: [0] }

    expect(isFinSetMor(badLength)).toBe(false)
    expect(() => assertFinSetMor(badLength)).toThrow(
      /FinSet morphism: map length 1 does not match domain size 2/,
    )
  })

  it('rejects maps that reference elements outside the codomain', () => {
    const outOfRange = { from: A, to: B, map: [0, 3] }

    expect(isFinSetMor(outOfRange)).toBe(false)
    expect(() => assertFinSetMor(outOfRange)).toThrow(
      /FinSet morphism: map\[1] = 3 exceeds the codomain range 0\.\.2/,
    )
  })

  it('rejects attempts to map into the initial object from a non-empty set', () => {
    const intoInitial = { from: FinSet.terminalObj, to: FinSet.initialObj, map: [0] }

    expect(isFinSetMor(intoInitial)).toBe(false)
    expect(() => assertFinSetMor(intoInitial)).toThrow(
      /FinSet morphism: map\[0] = 0 exceeds an empty codomain/,
    )
  })
})

describe('FinSet bijection helpers', () => {
  const A = makeFinSetObj(['a0', 'a1'])
  const B = makeFinSetObj(['b0', 'b1'])

  it('constructs bijections and inverses when provided with valid data', () => {
    const bijection = finsetBijection(A, B, [1, 0])
    expect(bijection.map).toEqual([1, 0])

    const inverse = finsetInverse(bijection)
    expect(inverse.map).toEqual([1, 0])

    const recomposed = FinSet.compose(finsetInverse(bijection), bijection)
    expect(recomposed.map).toEqual([0, 1])
  })

  it('rejects bijections when the codomain cardinality differs from the domain', () => {
    const codomain = makeFinSetObj(['b0'])

    expect(() => finsetBijection(A, codomain, [0, 0])).toThrow(
      /FinSet bijection: expected codomain size 1 to equal domain size 2/,
    )
  })

  it('rejects bijections whose map repeats codomain indices', () => {
    expect(() => finsetBijection(A, B, [0, 0])).toThrow(
      /FinSet bijection: map is not injective; codomain index 0 has multiple preimages/,
    )
  })

  it('rejects inverse construction for non-bijective maps', () => {
    const notBijection = assertFinSetMor({ from: A, to: B, map: [0, 0] })

    expect(() => finsetInverse(notBijection)).toThrow(
      /FinSet inverse: codomain index 0 has multiple preimages/,
    )
  })

  it('rejects inverse construction when the codomain is larger than the domain', () => {
    const largerCodomain = makeFinSetObj(['b0', 'b1', 'b2'])
    const injective = assertFinSetMor({ from: makeFinSetObj(['a0']), to: largerCodomain, map: [1] })

    expect(() => finsetInverse(injective)).toThrow(
      /FinSet inverse: expected domain size 1 to equal codomain size 3/,
    )
  })
})
