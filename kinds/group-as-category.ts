import type { FiniteCategory } from "../finite-cat"

export interface FinGroup<Element = string> {
  readonly elements: ReadonlyArray<Element>
  readonly multiply: (a: Element, b: Element) => Element
  readonly inverse: (a: Element) => Element
  readonly unit: Element
}

interface GroupObject {
  readonly name: "*"
}

interface GroupArrow<Element> {
  readonly name: string
  readonly element: Element
  readonly source: GroupObject
  readonly target: GroupObject
}

const star: GroupObject = { name: "*" }

export const catFromGroup = <Element>(
  group: FinGroup<Element>,
): FiniteCategory<GroupObject, GroupArrow<Element>> => {
  const arrows: Array<GroupArrow<Element>> = group.elements.map((element) => ({
    name: String(element),
    element,
    source: star,
    target: star,
  }))
  const index = new Map(group.elements.map((element, i) => [element, i]))

  const id = (_: GroupObject): GroupArrow<Element> => {
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

  const compose = (g: GroupArrow<Element>, f: GroupArrow<Element>): GroupArrow<Element> => {
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

  const eq = (a: GroupArrow<Element>, b: GroupArrow<Element>): boolean => a.element === b.element

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

const canonicalArrow = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  pool: ReadonlyArray<Arr>,
  candidate: Arr,
): Arr => {
  for (const arrow of pool) {
    if (category.eq(arrow, candidate)) return arrow
  }
  throw new Error("Composite arrow not present in one-object groupoid")
}

export const groupFromOneObjectGroupoid = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): { readonly object: Obj; readonly group: FinGroup<Arr> } => {
  if (category.objects.length !== 1) {
    throw new Error("Expected a single-object category to recover a group")
  }

  const object = category.objects[0]!
  const loops = category.arrows.filter(
    (arrow) => category.src(arrow) === object && category.dst(arrow) === object,
  )

  if (loops.length !== category.arrows.length) {
    throw new Error("Category contains arrows between distinct objects")
  }

  const unit = canonicalArrow(category, loops, category.id(object))

  const multiply = (a: Arr, b: Arr): Arr =>
    canonicalArrow(category, loops, category.compose(b, a))

  const inverse = (a: Arr): Arr => {
    for (const candidate of loops) {
      const left = category.compose(candidate, a)
      const right = category.compose(a, candidate)
      if (category.eq(left, unit) && category.eq(right, unit)) {
        return candidate
      }
    }
    throw new Error("Arrow in one-object groupoid lacks an inverse")
  }

  return {
    object,
    group: {
      elements: loops,
      unit,
      multiply,
      inverse,
    },
  }
}
