import { describe, expect, it } from 'vitest'
import {
  FinSet,
  makeFinSetObj,
  finSetExponential,
  finsetPointSurjective,
  finsetLawvereFixedPoint,
} from '../../allTS'
import type { FinSetMor } from '../../allTS'

const enumerateMaps = (domainSize: number, codomainSize: number): number[][] => {
  if (domainSize === 0) return [[]]
  const results: number[][] = []
  const backtrack = (prefix: number[], position: number) => {
    if (position === domainSize) {
      results.push(prefix.slice())
      return
    }
    for (let idx = 0; idx < codomainSize; idx++) {
      prefix[position] = idx
      backtrack(prefix, position + 1)
    }
  }
  backtrack(Array.from({ length: domainSize }, () => 0), 0)
  return results
}

describe('FinSet Lawvere fixed-point helper', () => {
  it('constructs a fixed point when g is point-surjective', () => {
    const A = makeFinSetObj(['a'])
    const C = makeFinSetObj(['c'])
    const exponential = finSetExponential(C, A)

    const g: FinSetMor = { from: A, to: exponential.object, map: [0] }
    const j: FinSetMor = { from: C, to: C, map: [0] }

    const surjectivity = finsetPointSurjective(g)
    expect(surjectivity.holds).toBe(true)
    expect(surjectivity.witness).toBeDefined()
    expect(surjectivity.witness?.base).toBe(C)
    expect(surjectivity.witness?.exponent).toBe(A)
    expect(surjectivity.witness?.pointPreimages.get(0)).toBe(0)

    const witness = finsetLawvereFixedPoint(g, j)
    expect(witness.elementIndex).toBe(0)
    expect(witness.fixedPoint.map).toEqual([0])
    expect(witness.fixedPointElement).toBe(C.elements[0])

    const fixedByJ = FinSet.compose(j, witness.fixedPoint)
    expect(FinSet.equalMor?.(fixedByJ, witness.fixedPoint)).toBe(true)

    const reproducedName = FinSet.compose(g, witness.preimagePoint)
    expect(FinSet.equalMor?.(reproducedName, witness.diagonalName)).toBe(true)
  })

  it('rejects point-surjections when |C| ≥ 2', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const C = makeFinSetObj(['c0', 'c1'])
    const exponential = finSetExponential(C, A)
    const codomainSize = exponential.object.elements.length

    const j: FinSetMor = { from: C, to: C, map: [1, 0] }

    for (const map of enumerateMaps(A.elements.length, codomainSize)) {
      const g: FinSetMor = { from: A, to: exponential.object, map }
      const result = finsetPointSurjective(g)
      expect(result.holds).toBe(false)
      expect(result.missingPoints).toBeDefined()
      expect(result.missingPoints?.length ?? 0).toBeGreaterThan(0)
      expect(() => finsetLawvereFixedPoint(g, j)).toThrow(/point-surjective/)
    }
  })
})
