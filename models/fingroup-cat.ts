import type { FiniteCategory } from "../finite-cat"

export interface FinGrpObj {
  readonly name: string
  readonly elems: readonly string[]
  readonly mul: (a: string, b: string) => string
  readonly e: string
  readonly inv: (a: string) => string
}

export interface Hom {
  readonly name: string
  readonly dom: string
  readonly cod: string
  readonly map: (x: string) => string
}

export interface FinGrpCategory extends FiniteCategory<string, Hom> {
  readonly traits: { readonly functionalArrows: true; readonly balanced: true }
  readonly isHom: (arrow: Hom) => boolean
  readonly isInjective: (arrow: Hom) => boolean
  readonly isSurjective: (arrow: Hom) => boolean
  readonly lookup: (name: string) => FinGrpObj
}

const TRIVIAL_GROUP_NAME = "1"
const TRIVIAL_ELEMENT = "e"

function makeTrivialGroup(): FinGrpObj {
  return {
    name: TRIVIAL_GROUP_NAME,
    elems: [TRIVIAL_ELEMENT],
    mul: () => TRIVIAL_ELEMENT,
    e: TRIVIAL_ELEMENT,
    inv: () => TRIVIAL_ELEMENT,
  }
}

function ensureObject(index: Record<string, FinGrpObj>, name: string): FinGrpObj {
  const obj = index[name]
  if (!obj) {
    throw new Error(`FinGrpCat: unknown object ${name}`)
  }
  return obj
}

export function FinGrpCat(objects: readonly FinGrpObj[]): FinGrpCategory {
  const byName: Record<string, FinGrpObj> = {}
  for (const obj of objects) {
    byName[obj.name] = obj
  }
  if (!byName[TRIVIAL_GROUP_NAME]) {
    byName[TRIVIAL_GROUP_NAME] = makeTrivialGroup()
  }

  const objectList = Object.keys(byName)
  const arrows: Hom[] = []

  const eq = (f: Hom, g: Hom) =>
    f.dom === g.dom &&
    f.cod === g.cod &&
    ensureObject(byName, f.dom).elems.every((x) => f.map(x) === g.map(x))

  const id = (G: string): Hom => ({
    name: `id_${G}`,
    dom: G,
    cod: G,
    map: (x) => x,
  })

  const compose = (g: Hom, f: Hom): Hom => {
    if (f.cod !== g.dom) {
      throw new Error("FinGrpCat: compose expects matching codomain/domain")
    }
    return {
      name: `${g.name}∘${f.name}`,
      dom: f.dom,
      cod: g.cod,
      map: (x) => g.map(f.map(x)),
    }
  }

  const src = (f: Hom) => f.dom
  const dst = (f: Hom) => f.cod

  const category: FinGrpCategory = {
    objects: objectList,
    arrows,
    id,
    compose,
    src,
    dst,
    eq,
    traits: { functionalArrows: true, balanced: true },
    isHom: (arrow) => FinGrp.isHom(ensureObject(byName, arrow.dom), ensureObject(byName, arrow.cod), arrow),
    isInjective: (arrow) => FinGrp.injective(ensureObject(byName, arrow.dom), ensureObject(byName, arrow.cod), arrow),
    isSurjective: (arrow) => FinGrp.surjective(ensureObject(byName, arrow.dom), ensureObject(byName, arrow.cod), arrow),
    lookup: (name) => ensureObject(byName, name),
  }

  return category
}

export const FinGrp = {
  isHom(dom: FinGrpObj, cod: FinGrpObj, f: Hom): boolean {
    if (f.map(dom.e) !== cod.e) return false
    for (const a of dom.elems) {
      for (const b of dom.elems) {
        const left = f.map(dom.mul(a, b))
        const right = cod.mul(f.map(a), f.map(b))
        if (left !== right) {
          return false
        }
      }
    }
    return true
  },
  injective(dom: FinGrpObj, _cod: FinGrpObj, f: Hom): boolean {
    const seen = new Map<string, string>()
    for (const a of dom.elems) {
      const image = f.map(a)
      const previous = seen.get(image)
      if (previous && previous !== a) {
        return false
      }
      seen.set(image, a)
    }
    return true
  },
  surjective(_dom: FinGrpObj, cod: FinGrpObj, f: Hom): boolean {
    const pending = new Set(cod.elems)
    for (const a of _dom.elems) {
      pending.delete(f.map(a))
    }
    return pending.size === 0
  },
  trivial(): FinGrpObj {
    return makeTrivialGroup()
  },
  initialArrowFrom(initial: FinGrpObj, target: FinGrpObj): Hom {
    if (initial.elems.length !== 1) {
      throw new Error(
        `FinGrp.initialArrowFrom: ${initial.name} must have exactly one element to witness initiality`,
      )
    }
    const [generator] = initial.elems
    if (!generator || initial.e !== generator) {
      throw new Error(
        `FinGrp.initialArrowFrom: ${initial.name} must have its identity as the unique element`,
      )
    }
    return {
      name: `!_${initial.name}→${target.name}`,
      dom: initial.name,
      cod: target.name,
      map: () => target.e,
    }
  },
  initialArrow(target: FinGrpObj): Hom {
    return FinGrp.initialArrowFrom(FinGrp.trivial(), target)
  },
  terminateAt(source: FinGrpObj, terminal: FinGrpObj): Hom {
    if (terminal.elems.length !== 1) {
      throw new Error(
        `FinGrp.terminateAt: ${terminal.name} must have exactly one element to witness terminality`,
      )
    }
    const [identity] = terminal.elems
    if (!identity || terminal.e !== identity) {
      throw new Error(
        `FinGrp.terminateAt: ${terminal.name} must designate its sole element as the identity`,
      )
    }
    return {
      name: `!^{${source.name}}→${terminal.name}`,
      dom: source.name,
      cod: terminal.name,
      map: () => identity,
    }
  },
  terminate(source: FinGrpObj): Hom {
    return FinGrp.terminateAt(source, FinGrp.trivial())
  },
}
