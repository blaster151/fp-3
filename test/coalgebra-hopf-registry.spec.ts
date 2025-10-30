import { describe, expect, it } from "vitest"
import {
  createHopfAlgebraRegistry,
  buildHopfAlgebraFromSpec,
  type HopfAlgebraRegistrySpec,
  type SymmetricMonoidalWitnesses,
  type MonoidalIsomorphismWitness,
} from "../operations/coalgebra/coalgebra-interfaces"
import type { Category } from "../stdlib/category"
import type { ArrowFamilies } from "../stdlib/arrow-families"
import type { CategoryLimits } from "../stdlib/category-limits"

type HopfObject = "H"

type HopfMorphismTag = "id" | "bad-left" | "bad-right"

interface HopfMorphism {
  readonly tag: HopfMorphismTag
  readonly name: string
}

const hopfObject: HopfObject = "H"

const canonicalByTag = {
  id: { tag: "id", name: "id_H" },
  "bad-left": { tag: "bad-left", name: "bad_left" },
  "bad-right": { tag: "bad-right", name: "bad_right" },
} as const satisfies Record<HopfMorphismTag, HopfMorphism>

type CanonicalTag = keyof typeof canonicalByTag

const collapse = (morphism: HopfMorphism): HopfMorphism =>
  canonicalByTag[morphism.tag as CanonicalTag]

const identity = canonicalByTag.id

const hopfCategory: Category<HopfObject, HopfMorphism> &
  ArrowFamilies.HasDomCod<HopfObject, HopfMorphism> = {
    id: () => identity,
    compose: (g, f) => {
      if (f.tag !== "id") {
        return collapse(f)
      }
      if (g.tag !== "id") {
        return collapse(g)
      }
      return identity
    },
    dom: () => hopfObject,
    cod: () => hopfObject,
    equalMor: (left, right) => left.tag === right.tag,
  }

const hopfTensor: CategoryLimits.TensorProductStructure<HopfObject, HopfMorphism> = {
  onObjects: () => hopfObject,
  onMorphisms: (left, right) => {
    if (left.tag !== "id") {
      return collapse(left)
    }
    if (right.tag !== "id") {
      return collapse(right)
    }
    return identity
  },
}

const trivialHopfIso = (): MonoidalIsomorphismWitness<HopfMorphism> => ({
  forward: identity,
  backward: identity,
})

const hopfSymmetricWitnesses: SymmetricMonoidalWitnesses<HopfObject, HopfMorphism> = {
  associator: () => trivialHopfIso(),
  braiding: () => trivialHopfIso(),
}

const baseHopfSpec = {
  category: hopfCategory,
  tensor: hopfTensor,
  algebra: {
    object: hopfObject,
    multiply: { tag: "id", name: "μ" },
    unit: { tag: "id", name: "η" },
  },
  comonoid: {
    object: hopfObject,
    copy: { tag: "id", name: "Δ" },
    discard: { tag: "id", name: "ε" },
  },
  antipode: { tag: "id", name: "S" },
} as const satisfies Omit<
  HopfAlgebraRegistrySpec<HopfObject, HopfMorphism>,
  "key" | "tensorWitnesses" | "symmetricMonoidalWitnesses" | "compatibility" | "description" | "metadata"
>

describe("Hopf algebra registry", () => {
  it("registers Hopf specs and derives tensor witnesses from symmetric data", () => {
    const registry = createHopfAlgebraRegistry()

    const spec: HopfAlgebraRegistrySpec<HopfObject, HopfMorphism> = {
      ...baseHopfSpec,
      key: "toy-hopf",
      symmetricMonoidalWitnesses: hopfSymmetricWitnesses,
      description: "Toy Hopf algebra derived from registry spec",
      metadata: { flavour: "example" },
    }

    const entry = registry.register(spec)

    expect(entry.key).toBe(spec.key)
    expect(entry.hopf.algebra.object).toBe(hopfObject)
    expect(entry.hopf.tensorWitnesses.middleSwap).toBe(identity)
    expect(entry.hopf.compatibility?.overall).toBe(true)
    expect(entry.description).toBe(spec.description)
    expect(entry.metadata).toEqual(spec.metadata)

    const retrieved = registry.get<HopfObject, HopfMorphism>(spec.key)
    expect(retrieved?.hopf).toBe(entry.hopf)

    const entries = registry.list()
    expect(entries).toHaveLength(1)
    expect(entries[0]?.key).toBe(spec.key)

    registry.clear()
    expect(registry.list()).toHaveLength(0)
  })

  it("builds Hopf algebra structures directly from JSON-like specs", () => {
    const structure = buildHopfAlgebraFromSpec({
      ...baseHopfSpec,
      key: "direct-hopf",
      tensorWitnesses: {
        middleSwap: identity,
      },
    })

    expect(structure.algebra.object).toBe(hopfObject)
    expect(structure.tensorWitnesses.middleSwap).toBe(identity)
    expect(structure.compatibility?.overall).toBe(true)
  })

  it("rejects specs that omit tensor witnesses and symmetric structure", () => {
    const registry = createHopfAlgebraRegistry()

    const incomplete: HopfAlgebraRegistrySpec<HopfObject, HopfMorphism> = {
      ...baseHopfSpec,
      key: "incomplete",
    }

    expect(() => registry.register(incomplete)).toThrow(
      /missing tensor witnesses/i,
    )
  })
})
