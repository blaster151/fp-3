import { describe, expect, it } from 'vitest'

import {
  FinSet,
  finsetBijection,
  finsetInverse,
  makeFinSetObj,
  type FinSetMor,
} from '../allTS'

describe('FinSet bijection helpers', () => {
  const A = makeFinSetObj(['a0', 'a1'])
  const B = makeFinSetObj(['b0', 'b1'])

  it('constructs bijections and inverses when provided with valid data', () => {
    const bijection = finsetBijection(A, B, [1, 0])
    expect(bijection).toEqual({ from: A, to: B, map: [1, 0] })

    const inverse = finsetInverse(bijection)
    expect(inverse).toEqual({ from: B, to: A, map: [1, 0] })
  })

  it('rejects attempts to map into the initial object from a non-empty set', () => {
    expect(() => finsetBijection(FinSet.terminalObj, FinSet.initialObj, [0])).toThrow(
      /FinSet bijection: map\[0] = 0 exceeds an empty codomain/
    )
  })

  it('rejects maps whose codomain size differs from the domain size', () => {
    const codomain = makeFinSetObj(['b0'])
    expect(() => finsetBijection(A, codomain, [0, 0])).toThrow(
      /FinSet bijection: expected codomain size 1 to equal domain size 2/
    )
  })

  it('rejects maps that reference elements outside the codomain', () => {
    expect(() => finsetBijection(A, B, [0, 2])).toThrow(
      /FinSet bijection: map\[1] = 2 is outside the codomain range 0\.\.1/
    )
  })

  it('rejects maps whose image is not injective', () => {
    expect(() => finsetBijection(A, B, [0, 0])).toThrow(
      /FinSet bijection: map is not injective; codomain index 0 has multiple preimages/
    )
  })
})

describe('FinSet inverse helper', () => {
  const A = makeFinSetObj(['a0', 'a1'])
  const B = makeFinSetObj(['b0', 'b1'])

  it('returns the inverse of a bijection', () => {
    const bijection = finsetBijection(A, B, [1, 0])
    const inverse = finsetInverse(bijection)

    expect(inverse.map).toEqual([1, 0])
  })

  it('rejects maps whose length differs from the domain size', () => {
    const malformed: FinSetMor = { from: A, to: B, map: [0] }
    expect(() => finsetInverse(malformed)).toThrow(
      /FinSet inverse: expected map length 1 to equal domain size 2/
    )
  })

  it('rejects maps whose codomain size differs from the domain size', () => {
    const largerCodomain = makeFinSetObj(['b0', 'b1', 'b2'])
    const injective: FinSetMor = { from: makeFinSetObj(['a0']), to: largerCodomain, map: [1] }

    expect(() => finsetInverse(injective)).toThrow(
      /FinSet inverse: expected domain size 1 to equal codomain size 3/
    )
  })

  it('rejects maps that reuse codomain indices', () => {
    const notBijection: FinSetMor = { from: A, to: B, map: [0, 0] }

    expect(() => finsetInverse(notBijection)).toThrow(
      /FinSet inverse: codomain index 0 has multiple preimages/
    )
  })
})

describe('FinSet.isInjective', () => {
  it('rejects maps that point outside the codomain', () => {
    const domain = makeFinSetObj(['a'])
    const codomain = makeFinSetObj(['b'])
    const outOfRange = { from: domain, to: codomain, map: [1] }

    expect(FinSet.isInjective(outOfRange)).toBe(false)
  })
})
