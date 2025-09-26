import type { FiniteCategory } from "../finite-cat"
import type { FinGroup } from "./group-as-category"

interface ActionArrow {
  readonly name: string
  readonly element: string
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

export const actionGroupoid = (
  group: FinGroup,
  objects: ReadonlyArray<string>,
  act: (element: string, object: string) => string,
): FiniteCategory<string, ActionArrow> => {
  const uniqueObjects = [...new Set(objects)]
  const arrows: ActionArrow[] = []
  const lookup = new Map<string, ActionArrow>()

  for (const object of uniqueObjects) {
    for (const element of group.elements) {
      const target = act(element, object)
      const arrow: ActionArrow = {
        name: `${element}:${object}`,
        element,
        source: object,
        target,
      }
      arrows.push(arrow)
      lookup.set(`${object}|${element}`, arrow)
    }
  }

  const id = (object: string): ActionArrow => {
    const arrow = lookup.get(`${object}|${group.unit}`)
    if (!arrow) {
      throw new Error(`Identity arrow for ${object} not found`)
    }
    return arrow
  }

  const compose = (g: ActionArrow, f: ActionArrow): ActionArrow => {
    if (f.target !== g.source) {
      throw new Error("actionGroupoid: domain mismatch")
    }
    const compositeElement = group.multiply(f.element, g.element)
    const arrow = lookup.get(`${f.source}|${compositeElement}`)
    if (!arrow) {
      throw new Error(`Missing arrow for element ${compositeElement} at ${f.source}`)
    }
    return arrow
  }

  const eq = (a: ActionArrow, b: ActionArrow): boolean =>
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
