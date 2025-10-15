import { describe, expect, it } from "vitest"

import { PointedSet, type PointedSetHom, type PointedSetObj, type SingletonPoint } from "../../pointed-set-cat"

const sameHom = <A, B>(f: PointedSetHom<A, B>, g: PointedSetHom<A, B>): boolean => {
  if (f.dom !== g.dom || f.cod !== g.cod) {
    return false
  }
  return f.dom.elems.every((value) => f.cod.eq(f.map(value), g.map(value)))
}

describe("Pointed sets admit a zero object", () => {
  const singleton = PointedSet.singleton("𝟙⋆")

  const pointedSets: ReadonlyArray<PointedSetObj<unknown>> = [
    PointedSet.create({
      label: "Bool⊥",
      elems: [false, true],
      basepoint: false,
      eq: (a, b) => a === b,
    }),
    PointedSet.create({
      label: "Three₀",
      elems: [0, 1, 2],
      basepoint: 0,
      eq: (a, b) => a === b,
    }),
    PointedSet.create({
      label: "Words⊥",
      elems: ["ε", "a", "b"],
      basepoint: "ε",
      eq: (a, b) => a === b,
    }),
  ]

  it("supplies the unique basepoint-preserving map from the singleton", () => {
    for (const target of pointedSets) {
      const canonical = PointedSet.fromSingleton(target, singleton)
      expect(PointedSet.isHom(canonical)).toBe(true)

      const duplicate: PointedSetHom<SingletonPoint, unknown> = {
        dom: singleton,
        cod: target,
        map: () => target.basepoint,
      }

      expect(PointedSet.isHom(duplicate)).toBe(true)
      expect(sameHom(canonical, duplicate)).toBe(true)

      const nonPreserving: PointedSetHom<SingletonPoint, unknown> = {
        dom: singleton,
        cod: target,
        map: () => target.elems.find((value) => !target.eq(value, target.basepoint)) ?? target.basepoint,
      }

      if (nonPreserving.map(singleton.basepoint) === target.basepoint) {
        continue
      }

      expect(PointedSet.isHom(nonPreserving)).toBe(false)
    }
  })

  it("collapses every pointed set to the singleton via the zero morphism", () => {
    for (const source of pointedSets) {
      const canonical = PointedSet.toSingleton(source, singleton)
      expect(PointedSet.isHom(canonical)).toBe(true)

      const duplicate: PointedSetHom<unknown, SingletonPoint> = {
        dom: source,
        cod: singleton,
        map: () => singleton.basepoint,
      }

      expect(PointedSet.isHom(duplicate)).toBe(true)
      expect(sameHom(canonical, duplicate)).toBe(true)
    }
  })
})
