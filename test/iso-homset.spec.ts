import { describe, it, expect } from "vitest"
import type { FiniteCategory } from "../finite-cat"
import { IsoRegistry } from "../iso/registry"
import { GoalRewriter } from "../iso/goal-rewriter"
import type { IsoWitness } from "../iso/types"

interface Arrow {
  readonly id: string
  readonly src: Obj
  readonly dst: Obj
}

type Obj = "A" | "C" | "D"

type ArrowName =
  | "1_A"
  | "1_C"
  | "1_D"
  | "f"
  | "g"
  | "u"
  | "f∘u"
  | "v"
  | "v∘g"

type ArrowMap = Record<ArrowName, Arrow>

type ComposeKey = `${ArrowName}|${ArrowName}`

const buildCategory = (): FiniteCategory<Obj, Arrow> => {
  const make = (id: ArrowName, src: Obj, dst: Obj): Arrow => ({ id, src, dst })
  const arrows: ArrowMap = {
    "1_A": make("1_A", "A", "A"),
    "1_C": make("1_C", "C", "C"),
    "1_D": make("1_D", "D", "D"),
    f: make("f", "C", "D"),
    g: make("g", "D", "C"),
    u: make("u", "A", "C"),
    "f∘u": make("f∘u", "A", "D"),
    v: make("v", "C", "A"),
    "v∘g": make("v∘g", "D", "A"),
  }

  const table: Record<ComposeKey, Arrow> = {
    "1_A|1_A": arrows["1_A"],
    "1_C|1_C": arrows["1_C"],
    "1_D|1_D": arrows["1_D"],
    "f|1_C": arrows.f,
    "1_D|f": arrows.f,
    "g|1_D": arrows.g,
    "1_C|g": arrows.g,
    "f∘u|1_A": arrows["f∘u"],
    "1_D|f∘u": arrows["f∘u"],
    "u|1_A": arrows.u,
    "1_C|u": arrows.u,
    "v|1_C": arrows.v,
    "1_A|v": arrows.v,
    "v∘g|1_D": arrows["v∘g"],
    "1_A|v∘g": arrows["v∘g"],
    "g|f": arrows["1_C"],
    "f|g": arrows["1_D"],
    "f|u": arrows["f∘u"],
    "g|f∘u": arrows.u,
    "v|g": arrows["v∘g"],
    "v∘g|f": arrows.v,
  }

  const compose = (g: Arrow, f: Arrow): Arrow => {
    if (f.dst !== g.src) throw new Error(`non-composable ${f.id} then ${g.id}`)
    if (f.id.startsWith("1_")) return g
    if (g.id.startsWith("1_")) return f
    const key: ComposeKey = `${g.id}|${f.id}`
    const result = table[key]
    if (!result) throw new Error(`missing composite for ${key}`)
    return result
  }

  const list = Object.values(arrows)

  return {
    objects: ["A", "C", "D"],
    arrows: list,
    id: (object) => arrows[`1_${object}` as ArrowName],
    compose,
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq: (x, y) => x.id === y.id,
  }
}

describe("Iso registry and Hom-set transport", () => {
  const category = buildCategory()
  const registry = new IsoRegistry(category)
  const witness: IsoWitness<Arrow> = { forward: category.arrows.find((a) => a.id === "f")!, backward: category.arrows.find((a) => a.id === "g")! }

  registry.addIsomorphism("C", "D", witness)

  it("unifies representatives when adding an isomorphism", () => {
    expect(registry.representative("C")).toBe(registry.representative("D"))
  })

  it("transports arrows between Hom-sets", () => {
    const linker = registry.createHomSetLinker("C", "D")
    expect(linker).not.toBeNull()
    const incoming = linker!.transportInto("A", "C")
    expect(incoming.original.map((arrow) => arrow.id)).toEqual(["u"])
    expect(incoming.transported.map((arrow) => arrow.id)).toEqual(["f∘u"])
    expect(incoming.roundTrip.map((arrow) => arrow.id)).toEqual(["u"])

    const outgoing = linker!.transportOutOf("A", "C")
    expect(outgoing.original.map((arrow) => arrow.id)).toEqual(["v"])
    expect(outgoing.transported.map((arrow) => arrow.id)).toEqual(["v∘g"])
    expect(outgoing.roundTrip.map((arrow) => arrow.id)).toEqual(["v"])
  })

  it("rewrites goals across isomorphic objects", () => {
    const rewriter = new GoalRewriter(category, registry)
    const incoming = rewriter.rewriteIncomingGoal("C", "D", (arrow) => category.eq(arrow, category.arrows.find((a) => a.id === "u")!))
    expect(incoming).not.toBeNull()
    const transported = incoming!.liftOriginal(category.arrows.find((a) => a.id === "u")!)
    expect(transported.id).toBe("f∘u")
    expect(incoming!.predicateOnTarget(transported)).toBe(true)
    const roundTrip = incoming!.lowerToOriginal(transported)
    expect(roundTrip.id).toBe("u")

    const outgoing = rewriter.rewriteOutgoingGoal("A", "C", "D", (arrow) => category.eq(arrow, category.arrows.find((a) => a.id === "v")!))
    expect(outgoing).not.toBeNull()
    const lifted = outgoing!.liftOriginal(category.arrows.find((a) => a.id === "v")!)
    expect(lifted.id).toBe("v∘g")
    expect(outgoing!.predicateOnTarget(lifted)).toBe(true)
    expect(outgoing!.lowerToOriginal(lifted).id).toBe("v")
  })

  it("respects skeletal categories", () => {
    const skeletal = new IsoRegistry(buildCategory(), { isSkeletal: true })
    expect(() => skeletal.addIsomorphism("C", "D", witness)).toThrow(/Skeletal category forbids/)
  })
})
