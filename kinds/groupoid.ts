import type { FiniteCategory } from "../finite-cat"
import type { FinGroup } from "./group-as-category"

interface ActionArrow<Element> {
  readonly name: string
  readonly element: Element
  readonly source: string
  readonly target: string
}

export const isGroupoid = <Obj, Arr>(category: FiniteCategory<Obj, Arr>): boolean => {
  for (const arrow of category.arrows) {
    const source = category.src(arrow)
    const target = category.dst(arrow)
    let inverseFound = false
    for (const candidate of category.arrows) {
      if (category.src(candidate) !== target || category.dst(candidate) !== source) continue
      const left = category.compose(candidate, arrow)
      const right = category.compose(arrow, candidate)
      if (category.eq(left, category.id(source)) && category.eq(right, category.id(target))) {
        inverseFound = true
        break
      }
    }
    if (!inverseFound) return false
  }
  return true
}

export const actionGroupoid = <Element>(
  group: FinGroup<Element>,
  objects: ReadonlyArray<string>,
  act: (element: Element, object: string) => string,
): FiniteCategory<string, ActionArrow<Element>> => {
  const uniqueObjects = [...new Set(objects)]
  const arrows: Array<ActionArrow<Element>> = []
  const lookup = new Map<string, ActionArrow<Element>>()

  const keyFor = (object: string, element: Element): string => `${object}|${String(element)}`

  for (const object of uniqueObjects) {
    for (const element of group.elements) {
      const target = act(element, object)
      const arrow: ActionArrow<Element> = {
        name: `${String(element)}:${object}`,
        element,
        source: object,
        target,
      }
      arrows.push(arrow)
      lookup.set(keyFor(object, element), arrow)
    }
  }

  const id = (object: string): ActionArrow<Element> => {
    const arrow = lookup.get(keyFor(object, group.unit))
    if (!arrow) {
      throw new Error(`Identity arrow for ${object} not found`)
    }
    return arrow
  }

  const compose = (g: ActionArrow<Element>, f: ActionArrow<Element>): ActionArrow<Element> => {
    if (f.target !== g.source) {
      throw new Error("actionGroupoid: domain mismatch")
    }
    const compositeElement = group.multiply(f.element, g.element)
    const arrow = lookup.get(keyFor(f.source, compositeElement))
    if (!arrow) {
      throw new Error(`Missing arrow for element ${compositeElement} at ${f.source}`)
    }
    return arrow
  }

  const eq = (a: ActionArrow<Element>, b: ActionArrow<Element>): boolean =>
    a.source === b.source && a.element === b.element && a.target === b.target

  return {
    objects: uniqueObjects,
    arrows,
    id,
    compose,
    src: (arrow) => arrow.source,
    dst: (arrow) => arrow.target,
    eq,
  }
}
