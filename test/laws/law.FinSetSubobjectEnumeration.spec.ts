import { describe, expect, it } from 'vitest'

import {
  FinSetSubobjectClassifier,
  listFinSetSubobjects,
  makeFinSetObj,
  type FinSetMor,
} from '../../allTS'

describe('FinSetSubobjectEnumeration', () => {
  it('enumerates canonical subobjects for a singleton ambient', () => {
    const singleton = makeFinSetObj(['x'])

    const enumeration = listFinSetSubobjects(singleton)

    expect(enumeration).toHaveLength(2)

    const empty = enumeration[0]
    if (!empty) {
      throw new Error('FinSetSubobjectEnumeration: expected empty subobject entry')
    }
    expect(empty.characteristic.map).toEqual([0])
    expect(empty.witness.subobject.elements).toEqual([])
    expect(empty.witness.inclusion.from.elements).toEqual([])
    expect(empty.witness.inclusion.to).toBe(singleton)
    expect(empty.witness.inclusion.map).toEqual([])
    expect(
      FinSetSubobjectClassifier.characteristic(empty.witness.inclusion).map,
    ).toEqual(empty.characteristic.map)

    const total = enumeration[1]
    if (!total) {
      throw new Error('FinSetSubobjectEnumeration: expected total subobject entry')
    }
    expect(total.characteristic.map).toEqual([1])
    expect(total.witness.subobject.elements).toEqual(['x'])
    expect(total.witness.inclusion.to).toBe(singleton)
    expect(total.witness.inclusion.map).toEqual([0])
    expect(
      FinSetSubobjectClassifier.characteristic(total.witness.inclusion).map,
    ).toEqual(total.characteristic.map)
  })

  it('collapses permuted monomorphisms to the same canonical subobject', () => {
    const ambient = makeFinSetObj(['a0', 'a1', 'a2'])
    const enumeration = listFinSetSubobjects(ambient)

    const domain = makeFinSetObj(['u0', 'u1'])
    const first: FinSetMor = { from: domain, to: ambient, map: [0, 2] }
    const second: FinSetMor = { from: domain, to: ambient, map: [2, 0] }

    const firstChi = FinSetSubobjectClassifier.characteristic(first)
    const secondChi = FinSetSubobjectClassifier.characteristic(second)

    const canonical = enumeration.find((entry) =>
      entry.characteristic.map.every(
        (value, index) => value === firstChi.map[index],
      ),
    )

    if (!canonical) {
      throw new Error('FinSetSubobjectEnumeration: canonical entry missing')
    }
    expect(canonical.characteristic.map).toEqual(firstChi.map)
    expect(canonical.characteristic.map).toEqual(secondChi.map)
    expect(canonical.witness.inclusion.to).toBe(ambient)
    expect(canonical.witness.inclusion.map).toEqual([0, 2])
  })

  it('matches hand-computed counts for representative ambients', () => {
    const emptyAmbient = makeFinSetObj<never>([])
    const enumerationEmpty = listFinSetSubobjects(emptyAmbient)
    expect(enumerationEmpty).toHaveLength(1)
    expect(enumerationEmpty[0]?.witness.subobject.elements).toEqual([])

    const triple = makeFinSetObj(['a0', 'a1', 'a2'])
    const enumerationTriple = listFinSetSubobjects(triple)
    expect(enumerationTriple).toHaveLength(8)

    const sizeHistogram = new Map<number, number>()
    for (const entry of enumerationTriple) {
      const size = entry.witness.subobject.elements.length
      sizeHistogram.set(size, (sizeHistogram.get(size) ?? 0) + 1)
    }

    expect(sizeHistogram.get(0)).toBe(1)
    expect(sizeHistogram.get(1)).toBe(3)
    expect(sizeHistogram.get(2)).toBe(3)
    expect(sizeHistogram.get(3)).toBe(1)
  })
})
