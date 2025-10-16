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

  const bools = PointedSet.create<boolean>({
    label: "Bool⊥",
    elems: [false, true],
    basepoint: false,
  })

  const naturals = PointedSet.create<number>({
    label: "Three₀",
    elems: [0, 1, 2],
    basepoint: 0,
  })

  const words = PointedSet.create<string>({
    label: "Words⊥",
    elems: ["ε", "a", "b"],
    basepoint: "ε",
  })

  const expectFromSingleton = <A>(target: PointedSetObj<A>) => {
    const canonical = PointedSet.fromSingleton(target, singleton)
    expect(PointedSet.isHom(canonical)).toBe(true)

    const duplicate: PointedSetHom<SingletonPoint, A> = {
      dom: singleton,
      cod: target,
      map: () => target.basepoint,
    }

    expect(PointedSet.isHom(duplicate)).toBe(true)
    expect(sameHom(canonical, duplicate)).toBe(true)

    const nonPreserving: PointedSetHom<SingletonPoint, A> = {
      dom: singleton,
      cod: target,
      map: () => target.elems.find((value) => !target.eq(value, target.basepoint)) ?? target.basepoint,
    }

    if (!target.eq(nonPreserving.map(singleton.basepoint), target.basepoint)) {
      expect(PointedSet.isHom(nonPreserving)).toBe(false)
    }
  }

  const expectToSingleton = <A>(source: PointedSetObj<A>) => {
    const canonical = PointedSet.toSingleton(source, singleton)
    expect(PointedSet.isHom(canonical)).toBe(true)

    const duplicate: PointedSetHom<A, SingletonPoint> = {
      dom: source,
      cod: singleton,
      map: () => singleton.basepoint,
    }

    expect(PointedSet.isHom(duplicate)).toBe(true)
    expect(sameHom(canonical, duplicate)).toBe(true)
  }

  it("supplies the unique basepoint-preserving map from the singleton", () => {
    expectFromSingleton(bools)
    expectFromSingleton(naturals)
    expectFromSingleton(words)
  })

  it("collapses every pointed set to the singleton via the zero morphism", () => {
    expectToSingleton(bools)
    expectToSingleton(naturals)
    expectToSingleton(words)
  })
})
