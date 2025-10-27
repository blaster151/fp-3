import { describe, expect, it } from "vitest"

import { FieldReal } from "../src/all/triangulated"
import { eqMat } from "../src/all/semiring-linear"
import type { Representation } from "../stdlib/vect-view"
import type { FinGrpObj, Hom } from "../models/fingroup-cat"
import {
  makeFinGrpRepresentationFunctor,
  makeFinGrpProductRepresentation,
  functorToFinGrpRepresentation,
} from "../models/fingroup-representation"
import { finGrpKernelEqualizer } from "../models/fingroup-equalizer"

const identityMatrix = (dim: number): number[][] =>
  Array.from({ length: dim }, (_, row) =>
    Array.from({ length: dim }, (_, col) => (row === col ? 1 : 0)),
  )

const blockDiagonal = (blocks: ReadonlyArray<ReadonlyArray<ReadonlyArray<number>>>): number[][] => {
  const total = blocks.reduce((acc, block) => acc + (block.length ?? 0), 0)
  const result: number[][] = Array.from({ length: total }, () => Array(total).fill(0))
  let offset = 0
  for (const block of blocks) {
    const size = block.length
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        result[offset + i]![offset + j]! = block[i]![j]!
      }
    }
    offset += size
  }
  return result
}

const cyclicGroup = (order: number, name: string): FinGrpObj => {
  const elems = Array.from({ length: order }, (_, index) => index.toString())
  const add = (a: string, b: string) => ((Number(a) + Number(b)) % order).toString()
  const inv = (a: string) => ((order - Number(a)) % order).toString()
  return {
    name,
    elems,
    e: "0",
    mul: add,
    inv,
  }
}

describe("Finite group representations as functors", () => {
  const Z2 = cyclicGroup(2, "Z₂")
  const eqMatrix = eqMat(FieldReal)

  const representationZ2: Representation<string, number> = {
    F: FieldReal,
    dimV: 2,
    mat: (element) => (element === "0" ? identityMatrix(2) : [[0, 1], [1, 0]]),
  }

  it("recovers representation matrices after round-tripping through the functor view", () => {
    const functor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const V = functor.onObj(Z2.name)
    expect(V.dim).toBe(2)

    const generator = functor.onMor("1")
    const squared = functor.target.compose(generator, generator)
    const identity = functor.target.id(V)
    expect(functor.target.equalMor(squared, identity)).toBe(true)

    const recovered = functorToFinGrpRepresentation(functor)
    expect(eqMatrix(recovered.mat("0"), representationZ2.mat("0"))).toBe(true)
    expect(eqMatrix(recovered.mat("1"), representationZ2.mat("1"))).toBe(true)
  })

  it("builds product representations compatible with FinGrp metadata", () => {
    const factorFunctor = makeFinGrpRepresentationFunctor(Z2, representationZ2)
    const combined = makeFinGrpProductRepresentation([factorFunctor, factorFunctor])

    const productGroup = combined.group
    expect(productGroup.elems.length).toBe(4)

    const decode = (value: string): readonly [string, string] => JSON.parse(value) as readonly [string, string]

    const projection1: Hom = {
      name: "π₁",
      dom: productGroup.name,
      cod: Z2.name,
      map: (value: string) => decode(value)[0]!,
    }

    const kernelWitness = finGrpKernelEqualizer(productGroup, Z2, projection1, { kernelName: "Kerπ₁" })
    expect(kernelWitness.kernel.elems.length).toBe(2)

    for (const element of kernelWitness.kernel.elems) {
      const matrix = combined.onMor(element).matrix
      const firstBlock = matrix.slice(0, 2).map((row) => row.slice(0, 2))
      expect(eqMatrix(firstBlock as number[][], representationZ2.mat("0"))).toBe(true)
    }

    const [a, b] = productGroup.elems.filter((value) => value !== productGroup.e)
    if (!a || !b) throw new Error("Expected non-trivial elements in product group")

    const composed = combined.target.compose(combined.onMor(a), combined.onMor(b))
    const mulResult = productGroup.mul(a, b)
    expect(combined.target.equalMor(composed, combined.onMor(mulResult))).toBe(true)

    const recovered = functorToFinGrpRepresentation(combined)
    for (const element of productGroup.elems) {
      const [left, right] = decode(element)
      const expected = blockDiagonal([
        representationZ2.mat(left),
        representationZ2.mat(right),
      ])
      expect(eqMatrix(recovered.mat(element), expected)).toBe(true)
    }
  })
})

