import { describe, expect, it } from 'vitest'

import {
  FinSet,
  FinSetElementaryToposWitness,
  type FinSetMor,
} from '../../allTS'

const { naturalNumbersObject } = FinSetElementaryToposWitness

if (!naturalNumbersObject) {
  throw new Error('FinSet elementary topos witness must expose a natural numbers object for integer completion tests.')
}

const natural = naturalNumbersObject

const eqFinSetMor = (left: FinSetMor, right: FinSetMor): boolean => {
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

describe('FinSet integer completion', () => {
  const completion = natural.integerCompletion({
    equalMor: eqFinSetMor,
    label: 'law suite Grothendieck completion',
  })

  it('coequalizes the crossed addition relation', () => {
    expect(completion.holds).toBe(true)

    const relationCompatibility = completion.relation.compatibility
    expect(eqFinSetMor(relationCompatibility.left, relationCompatibility.right)).toBe(true)

    const quotientCompatibility = completion.quotient.compatibility
    expect(eqFinSetMor(quotientCompatibility.left, quotientCompatibility.right)).toBe(true)
  })

  it('identifies ℕ×ℕ pairs sharing the same difference', () => {
    const addition = completion.addition
    const tuples = addition.product.obj.elements as ReadonlyArray<ReadonlyArray<number>>
    const quotientMap = completion.quotient.coequalize.map

    const lookup = (pair: readonly [number, number]): number => {
      const index = tuples.findIndex((tuple) => tuple[0] === pair[0] && tuple[1] === pair[1])
      expect(index).toBeGreaterThanOrEqual(0)
      const image = quotientMap[index]
      expect(image).toBeDefined()
      return image!
    }

    const differenceClass = new Map<number, number>()
    const groups: ReadonlyArray<{
      readonly difference: number
      readonly pairs: ReadonlyArray<readonly [number, number]>
    }> = [
      { difference: 0, pairs: [
        [2, 2],
        [5, 5],
      ] },
      { difference: 1, pairs: [
        [2, 1],
        [3, 2],
      ] },
      { difference: -1, pairs: [
        [1, 2],
        [2, 3],
      ] },
      { difference: 5, pairs: [
        [7, 2],
        [9, 4],
      ] },
      { difference: -3, pairs: [
        [2, 5],
        [3, 6],
      ] },
    ]

    for (const { difference, pairs } of groups) {
      let representative: number | undefined
      for (const pair of pairs) {
        const image = lookup(pair)
        if (representative === undefined) {
          representative = image
          differenceClass.set(difference, image)
        } else {
          expect(image).toBe(representative)
        }
      }
    }

    expect(differenceClass.get(1)).not.toBe(differenceClass.get(-1))
    expect(differenceClass.get(0)).toBeDefined()

    const integersCardinality = completion.quotient.obj.elements.length
    expect(integersCardinality).toBe(2 * natural.bound + 1)
  })

  it('records balanced tuples inside the relation equalizer', () => {
    const ambientTuples = completion.relation.ambient.obj.elements as ReadonlyArray<
      readonly [ReadonlyArray<number>, ReadonlyArray<number>]
    >
    const inclusion = completion.relation.equalizer.inclusion.map
    const included = inclusion.map((index) => ambientTuples[index]!)

    const contains = (
      first: readonly [number, number],
      second: readonly [number, number],
    ): boolean =>
      included.some(([[a0, a1], [b0, b1]]) =>
        a0 === first[0] &&
        a1 === first[1] &&
        b0 === second[0] &&
        b1 === second[1],
      )

    expect(contains([2, 1], [3, 2])).toBe(true)
    expect(contains([4, 5], [6, 7])).toBe(true)
    expect(contains([5, 3], [5, 3])).toBe(true)
  })
})
