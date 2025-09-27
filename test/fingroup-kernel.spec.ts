import { describe, expect, it } from "vitest"
import { FinGrpCat, type FinGrpObj, type Hom } from "../models/fingroup-cat"
import { kernelElements, nonMonoWitness } from "../models/fingroup-kernel"
import { isMono } from "../kinds/mono-epi"

const Z2: FinGrpObj = {
  name: "Z2",
  elems: ["0", "1"] as const,
  e: "0",
  mul: (a, b) => ((Number(a) + Number(b)) % 2).toString(),
  inv: (a) => a,
}

const Z3: FinGrpObj = {
  name: "Z3",
  elems: ["0", "1", "2"] as const,
  e: "0",
  mul: (a, b) => ((Number(a) + Number(b)) % 3).toString(),
  inv: (a) => ((3 - Number(a)) % 3).toString(),
}

describe("Finite Grp kernels provide non-mono witnesses", () => {
  const nonInjective: Hom = { name: "collapse", dom: "Z2", cod: "Z3", map: (_a) => "0" }
  const injective: Hom = { name: "embed", dom: "Z2", cod: "Z3", map: (a) => a }

  it("computes kernel elements", () => {
    expect(kernelElements(Z2, Z3, injective)).toEqual(["0"])
    expect(kernelElements(Z2, Z3, nonInjective)).toEqual(["0", "1"])
  })

  it("builds explicit fork witnesses when kernel has size > 1", () => {
    const witness = nonMonoWitness(Z2, Z3, nonInjective)
    expect(witness).not.toBeNull()
    const { subgroup, inclusion, collapse } = witness!

    const category = FinGrpCat([Z2, Z3, subgroup])
    ;(category.arrows as Hom[]).push(nonInjective, inclusion, collapse)

    const collapseCompose = category.compose(nonInjective, collapse)
    const inclusionCompose = category.compose(nonInjective, inclusion)

    expect(category.eq(collapseCompose, inclusionCompose)).toBe(true)
    expect(category.eq(collapse, inclusion)).toBe(false)
    expect(isMono(category, nonInjective)).toBe(false)
  })

  it("returns null when the kernel is trivial", () => {
    expect(nonMonoWitness(Z2, Z3, injective)).toBeNull()
  })
})
