import { describe, expect, it } from "vitest"

import {
  countFinSetSubobjects,
  listFinSetSubobjects,
  FinSetOmega,
  type FinSetMor,
  type FinSetObj,
} from "../../allTS"

describe("FinSet subobject enumeration", () => {
  it("lists the empty and total subobjects for a singleton ambient", () => {
    const ambient: FinSetObj = { elements: ["⋆"] }
    const subobjects = listFinSetSubobjects(ambient)

    expect(subobjects).toHaveLength(2)

    const empty = subobjects.find((entry) => entry.inclusion.from.elements.length === 0)
    const total = subobjects.find((entry) => entry.inclusion.from.elements.length === 1)

    expect(empty?.characteristic.map).toEqual([0])
    expect(total?.characteristic.map).toEqual([1])

    for (const entry of subobjects) {
      expect(entry.characteristic.to).toBe(FinSetOmega)
      expect(entry.inclusion.to).toBe(ambient)
    }
  })

  it("collapses permutations of isomorphic monomorphisms", () => {
    const ambient: FinSetObj = { elements: ["a", "b", "c"] }
    const canonical = listFinSetSubobjects(ambient)

    const canonicalKeys = new Map(
      canonical.map((entry) => [entry.characteristic.map.join(","), entry] as const),
    )
    expect(canonicalKeys.size).toBe(canonical.length)

    const permutedDomain: FinSetObj = { elements: ["c", "a"] }
    const permuted: FinSetMor = { from: permutedDomain, to: ambient, map: [2, 0] }
    const orderedDomain: FinSetObj = { elements: ["a", "c"] }
    const ordered: FinSetMor = { from: orderedDomain, to: ambient, map: [0, 2] }

    const keyFor = (mono: FinSetMor): string => {
      const image = new Set(mono.map)
      const pattern = ambient.elements.map((_, index) => (image.has(index) ? 1 : 0))
      return pattern.join(",")
    }

    const expectedKey = keyFor(permuted)
    expect(expectedKey).toBe(keyFor(ordered))
    expect(canonicalKeys.has(expectedKey)).toBe(true)

    const canonicalEntry = canonicalKeys.get(expectedKey)
    expect(canonicalEntry?.inclusion.map).toEqual([0, 2])
  })

  it("matches hand-computed 2^n counts for small finite sets", () => {
    const sizes = [0, 1, 2, 3, 4]
    for (const size of sizes) {
      const ambient: FinSetObj = { elements: Array.from({ length: size }, (_, ix) => `x${ix}`) }
      const subobjects = listFinSetSubobjects(ambient)
      const expectedCount = 2 ** size

      expect(subobjects).toHaveLength(expectedCount)
      expect(countFinSetSubobjects(ambient)).toBe(expectedCount)

      const signatures = new Set(subobjects.map((entry) => entry.characteristic.map.join(",")))
      expect(signatures.size).toBe(expectedCount)
    }
  })
})
