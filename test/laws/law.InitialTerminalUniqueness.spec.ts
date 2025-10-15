import { describe, expect, it } from "vitest"

import { FinPos, FinPosCat, type FinPosObj, type MonoMap } from "../../models/finpos-cat"

describe("Initial and terminal objects are unique up to unique isomorphism", () => {
  const emptyVariant: FinPosObj = {
    name: "0′",
    elems: [],
    leq: () => false,
  }

  const singletonVariant: FinPosObj = {
    name: "1′",
    elems: ["•"],
    leq: () => true,
  }

  const category = FinPosCat([emptyVariant, singletonVariant])
  const zero = category.lookup(FinPos.zero().name)
  const zeroPrime = category.lookup(emptyVariant.name)
  const one = category.lookup(FinPos.one().name)
  const onePrime = category.lookup(singletonVariant.name)

  const compare = (left: MonoMap, right: MonoMap) => category.eq(left, right)

  it("builds mutually inverse maps between empty initial objects", () => {
    const forward = FinPos.initialArrowFrom(zero, zeroPrime)
    const backward = FinPos.initialArrowFrom(zeroPrime, zero)

    expect(FinPos.isMonotone(zero, zeroPrime, forward)).toBe(true)
    expect(FinPos.isMonotone(zeroPrime, zero, backward)).toBe(true)

    const compositeZero = category.compose(backward, forward)
    expect(compare(compositeZero, category.id(zero.name))).toBe(true)

    const compositePrime = category.compose(forward, backward)
    expect(compare(compositePrime, category.id(zeroPrime.name))).toBe(true)

    const alternativeForward: MonoMap = {
      name: "κ",
      dom: zero.name,
      cod: zeroPrime.name,
      map: () => {
        throw new Error("empty domain has a single arrow")
      },
    }

    const alternativeBackward: MonoMap = {
      name: "λ",
      dom: zeroPrime.name,
      cod: zero.name,
      map: () => {
        throw new Error("empty domain has a single arrow")
      },
    }

    expect(compare(forward, alternativeForward)).toBe(true)
    expect(compare(backward, alternativeBackward)).toBe(true)
  })

  it("forces singleton terminals to be uniquely isomorphic", () => {
    const collapse = FinPos.terminateAt(one, onePrime)
    const expand = FinPos.terminateAt(onePrime, one)

    expect(FinPos.isMonotone(one, onePrime, collapse)).toBe(true)
    expect(FinPos.isMonotone(onePrime, one, expand)).toBe(true)

    const compositeOne = category.compose(expand, collapse)
    expect(compare(compositeOne, category.id(one.name))).toBe(true)

    const compositePrime = category.compose(collapse, expand)
    expect(compare(compositePrime, category.id(onePrime.name))).toBe(true)

    const alternativeCollapse: MonoMap = {
      name: "μ",
      dom: one.name,
      cod: onePrime.name,
      map: () => onePrime.elems[0]!,
    }

    const alternativeExpand: MonoMap = {
      name: "ν",
      dom: onePrime.name,
      cod: one.name,
      map: () => one.elems[0]!,
    }

    expect(compare(collapse, alternativeCollapse)).toBe(true)
    expect(compare(expand, alternativeExpand)).toBe(true)
  })
})
