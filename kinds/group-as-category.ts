import type { FiniteCategory } from "../finite-cat"

export interface FinGroup {
  readonly elements: ReadonlyArray<string>
  readonly multiply: (a: string, b: string) => string
  readonly inverse: (a: string) => string
  readonly unit: string
}

interface GroupObject {
  readonly name: "*"
}

interface GroupArrow {
  readonly name: string
  readonly element: string
  readonly source: GroupObject
  readonly target: GroupObject
}

const star: GroupObject = { name: "*" }

export const catFromGroup = (group: FinGroup): FiniteCategory<GroupObject, GroupArrow> => {
  const arrows: GroupArrow[] = group.elements.map((element) => ({
    name: element,
    element,
    source: star,
    target: star,
  }))
  const index = new Map(group.elements.map((element, i) => [element, i]))

  const id = (_: GroupObject): GroupArrow => {
    const idx = index.get(group.unit)
    if (idx == null) {
      throw new Error("Group unit not present in element list")
    }
    const arrow = arrows[idx]
    if (!arrow) {
      throw new Error("Group unit arrow missing")
    }
    return arrow
  }

  const compose = (g: GroupArrow, f: GroupArrow): GroupArrow => {
    const product = group.multiply(f.element, g.element)
    const idx = index.get(product)
    if (idx == null) {
      throw new Error(`Composite element ${product} missing from group list`)
    }
    const arrow = arrows[idx]
    if (!arrow) {
      throw new Error(`Composite arrow for element ${product} missing`)
    }
    return arrow
  }

  const eq = (a: GroupArrow, b: GroupArrow): boolean => a.element === b.element

  return {
    objects: [star],
    arrows,
    id,
    compose,
    src: (arrow) => arrow.source,
    dst: (arrow) => arrow.target,
    eq,
  }
}
