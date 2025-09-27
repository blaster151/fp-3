import type { FiniteCategory } from "../finite-cat"

export interface FinPosObj {
  readonly name: string
  readonly elems: readonly string[]
  readonly leq: (a: string, b: string) => boolean
}

export interface MonoMap {
  readonly name: string
  readonly dom: string
  readonly cod: string
  readonly map: (x: string) => string
}

export interface FinPosCategory extends FiniteCategory<string, MonoMap> {
  readonly traits: { readonly functionalArrows: true }
  readonly one: () => string
  readonly globals: (object: string) => MonoMap[]
  readonly lookup: (name: string) => FinPosObj
}

const TERMINAL_NAME = "1"
const TERMINAL_POINT = "⋆"

function ensureObject(index: Record<string, FinPosObj>, name: string): FinPosObj {
  const obj = index[name]
  if (!obj) {
    throw new Error(`FinPosCat: unknown object ${name}`)
  }
  return obj
}

export function FinPosCat(objects: readonly FinPosObj[]): FinPosCategory {
  const byName: Record<string, FinPosObj> = {}
  for (const obj of objects) {
    byName[obj.name] = obj
  }
  if (!byName[TERMINAL_NAME]) {
    const terminal = FinPos.one()
    byName[terminal.name] = terminal
  }

  const objectList = Object.keys(byName)
  const arrows: MonoMap[] = []

  const eq = (f: MonoMap, g: MonoMap) =>
    f.dom === g.dom &&
    f.cod === g.cod &&
    ensureObject(byName, f.dom).elems.every((x) => f.map(x) === g.map(x))

  const id = (A: string): MonoMap => ({
    name: `id_${A}`,
    dom: A,
    cod: A,
    map: (x) => x,
  })

  const compose = (g: MonoMap, f: MonoMap): MonoMap => {
    if (f.cod !== g.dom) {
      throw new Error("FinPosCat: compose expects matching codomain/domain")
    }
    return {
      name: `${g.name}∘${f.name}`,
      dom: f.dom,
      cod: g.cod,
      map: (x) => g.map(f.map(x)),
    }
  }

  const src = (f: MonoMap) => f.dom
  const dst = (f: MonoMap) => f.cod

  const globals = (A: string): MonoMap[] =>
    ensureObject(byName, A).elems.map((a) => ({
      name: `⟨${a}⟩`,
      dom: TERMINAL_NAME,
      cod: A,
      map: (_x: string) => a,
    }))

  const category: FinPosCategory = {
    objects: objectList,
    arrows,
    id,
    compose,
    src,
    dst,
    eq,
    traits: { functionalArrows: true },
    one: () => TERMINAL_NAME,
    globals,
    lookup: (name) => ensureObject(byName, name),
  }

  return category
}

export const FinPos = {
  isMonotone(dom: FinPosObj, cod: FinPosObj, f: MonoMap): boolean {
    for (const a of dom.elems) {
      for (const b of dom.elems) {
        if (dom.leq(a, b) && !cod.leq(f.map(a), f.map(b))) {
          return false
        }
      }
    }
    return true
  },
  injective(dom: FinPosObj, _cod: FinPosObj, f: MonoMap): boolean {
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
  surjective(_dom: FinPosObj, cod: FinPosObj, f: MonoMap): boolean {
    const pending = new Set(cod.elems)
    for (const a of _dom.elems) {
      pending.delete(f.map(a))
    }
    return pending.size === 0
  },
  one(): FinPosObj {
    return {
      name: TERMINAL_NAME,
      elems: [TERMINAL_POINT],
      leq: () => true,
    }
  },
  globals(A: FinPosObj): MonoMap[] {
    return A.elems.map((a) => ({
      name: `⟨${a}⟩`,
      dom: TERMINAL_NAME,
      cod: A.name,
      map: (_x: string) => a,
    }))
  },
}
