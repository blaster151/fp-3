import { describe, expect, it } from "vitest"
import type { FinGrpObj } from "../models/fingroup-cat"
import type { FiniteGroupRepresentation } from "../models/fingroup-subrepresentation"
import { Algebra } from "../src/all/triangulated"

const makeZ2 = (name: string): FinGrpObj => ({
  name,
  elems: ["0", "1"],
  e: "0",
  mul: (a, b) => ((Number(a) + Number(b)) % 2).toString(),
  inv: (a) => a,
})

describe("Finite group representation substructures", () => {
  const Z2 = makeZ2("Z₂")

  it("detects stable coordinate subspaces for diagonal actions", () => {
    const F3 = Algebra.makePrimeField(3)
    const diagRep: FiniteGroupRepresentation = {
      group: Z2,
      field: F3,
      dim: 3,
      label: "ρ_diag",
      matrix: (element) => {
        if (element === "0") {
          return [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ]
        }
        return [
          [1, 0, 0],
          [0, 2, 0],
          [0, 0, 1],
        ]
      },
    }

    const witnesses = Algebra.enumerateCoordinateSubrepresentationWitnesses(diagRep)
    expect(witnesses.length).toBe(6)

    const sub = witnesses.find((witness) => witness.subspace.indices.join(",") === "0,2")
    expect(sub).toBeDefined()
    const witness = sub!

    const restricted = witness.restrictedMatrices["1"]
    expect(restricted).toEqual([
      [1, 0],
      [0, 1],
    ])
    const quotient = witness.quotientMatrices["1"]
    expect(quotient).toEqual([[2]])

    const difference = witness.difference.find((entry) => entry.element === "1")
    expect(difference).toBeDefined()
    expect(difference!.matrix).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ])

    const kernelSize = witness.subspace.context.group.elems.length
    for (const entry of witness.difference) {
      expect(entry.kernel.kernel.elems.length).toBe(kernelSize)
    }
  })

  it("rejects coordinate subspaces that are not stable", () => {
    const F2 = Algebra.makePrimeField(2)
    const swapRep: FiniteGroupRepresentation = {
      group: Z2,
      field: F2,
      dim: 2,
      label: "ρ_swap",
      matrix: (element) => {
        if (element === "0") {
          return [
            [1, 0],
            [0, 1],
          ]
        }
        return [
          [0, 1],
          [1, 0],
        ]
      },
    }

    const witnesses = Algebra.enumerateCoordinateSubrepresentationWitnesses(swapRep)
    expect(witnesses).toHaveLength(0)
  })

  it("assembles direct sums using FinGrp product mediators", () => {
    const F3 = Algebra.makePrimeField(3)
    const diagRep: FiniteGroupRepresentation = {
      group: Z2,
      field: F3,
      dim: 3,
      label: "ρ_diag",
      matrix: (element) => {
        if (element === "0") {
          return [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
          ]
        }
        return [
          [1, 0, 0],
          [0, 2, 0],
          [0, 0, 1],
        ]
      },
    }

    const witnesses = Algebra.enumerateCoordinateSubrepresentationWitnesses(diagRep)
    const witness = witnesses.find((entry) => entry.subspace.indices.join(",") === "0,2")
    if (!witness) {
      throw new Error("expected a witness for indices {0,2}")
    }

    const decomposition = Algebra.assembleCoordinateDirectSum(witness)
    expect(decomposition.splitKernel.kernel.elems).toHaveLength(1)
    expect(decomposition.combineKernel.kernel.elems).toHaveLength(1)

    for (const element of witness.ambient.group.elems) {
      const splitImage = decomposition.split.map(element)
      const recombined = decomposition.combine.map(splitImage)
      expect(recombined).toBe(element)
    }

    for (const element of decomposition.product.object.elems) {
      const combined = decomposition.combine.map(element)
      const splitBack = decomposition.split.map(combined)
      expect(splitBack).toBe(element)
    }
  })
})
