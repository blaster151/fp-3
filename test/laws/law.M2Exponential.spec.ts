import { describe, expect, it } from "vitest"

import {
  exponentialM2,
  m2ExponentialComparison,
  makeM2Object,
  productM2,
  makeM2Morphism,
  type M2ExponentialWitness,
  type M2Morphism,
} from "../../m2-set"

describe("M₂ exponential comparison", () => {
  const eq = <T>(a: T, b: T) => Object.is(a, b)

  const B = makeM2Object({
    carrier: ["stable", "transient"] as const,
    endo: (value: "stable" | "transient") => (value === "transient" ? "stable" : value),
    eq,
  })

  const C = makeM2Object({
    carrier: ["base", "pulse", "fixed"] as const,
    endo: (value: "base" | "pulse" | "fixed") => (value === "pulse" ? "base" : value),
    eq,
  })

  const left = exponentialM2({ base: B, codomain: C })
  const right = exponentialM2({ base: B, codomain: C })

  it("builds inverse mediators for matching witnesses", () => {
    const { leftToRight, rightToLeft } = m2ExponentialComparison({
      base: B,
      codomain: C,
      left,
      right,
    })

    expect(leftToRight.dom).toBe(left.object)
    expect(leftToRight.cod).toBe(right.object)
    expect(rightToLeft.dom).toBe(right.object)
    expect(rightToLeft.cod).toBe(left.object)

    for (const func of left.object.carrier) {
      const image = leftToRight.map(func)
      expect(right.object.contains(image)).toBe(true)

      for (const argument of B.carrier) {
        const leftPair: readonly [typeof func, typeof argument] = [func, argument]
        const rightPair: readonly [typeof image, typeof argument] = [image, argument]
        const leftValue = left.evaluation.map(leftPair)
        const rightValue = right.evaluation.map(rightPair)
        expect(C.eq(leftValue, rightValue)).toBe(true)
      }

      const roundTrip = rightToLeft.map(image)
      expect(left.object.eq(roundTrip, func)).toBe(true)
    }

    for (const func of right.object.carrier) {
      const image = rightToLeft.map(func)
      expect(left.object.contains(image)).toBe(true)

      for (const argument of B.carrier) {
        const rightPair: readonly [typeof func, typeof argument] = [func, argument]
        const leftPair: readonly [typeof image, typeof argument] = [image, argument]
        const rightValue = right.evaluation.map(rightPair)
        const leftValue = left.evaluation.map(leftPair)
        expect(C.eq(rightValue, leftValue)).toBe(true)
      }

      const roundTrip = leftToRight.map(image)
      expect(right.object.eq(roundTrip, func)).toBe(true)
    }
  })

  it("rejects witnesses built from different base data", () => {
    const mismatchedBase = makeM2Object({
      carrier: ["frozen", "melted"] as const,
      endo: (value: "frozen" | "melted") => (value === "melted" ? "frozen" : value),
      eq,
    })

    const mismatched = exponentialM2({ base: mismatchedBase, codomain: C })

    const mismatchedWitness = mismatched as unknown as M2ExponentialWitness<
      (typeof B.carrier)[number],
      (typeof C.carrier)[number]
    >

    expect(() =>
      m2ExponentialComparison({ base: B, codomain: C, left, right: mismatchedWitness }),
    ).toThrow(/base object/)
  })

  it("rejects mediators that are not equivariant", () => {
    const fakeFunction: M2Morphism<"stable" | "transient", "base" | "pulse" | "fixed"> = {
      dom: B,
      cod: C,
      map: () => "phantom" as unknown as "base" | "pulse" | "fixed",
    }

    const fakeMediator = {
      dom: left.object,
      cod: right.object,
      map: () => fakeFunction,
    } as unknown as M2Morphism<
      (typeof left.object.carrier)[number],
      (typeof right.object.carrier)[number]
    >

    const distorted: M2ExponentialWitness<"stable" | "transient", "base" | "pulse" | "fixed"> = {
      ...right,
      curry: <A>() =>
        fakeMediator as unknown as M2Morphism<
          A,
          (typeof right.object.carrier)[number]
        >,
    }

    expect(() =>
      m2ExponentialComparison({ base: B, codomain: C, left, right: distorted }),
    ).toThrow(/equivariance/)
  })
})

it("keeps evaluation factorizations observable", () => {
  const eq = <T>(a: T, b: T) => Object.is(a, b)

  const A = makeM2Object({
    carrier: ["left", "right"] as const,
    endo: (value: "left" | "right") => (value === "right" ? "left" : value),
    eq,
  })

  const B = makeM2Object({
    carrier: ["stable", "transient"] as const,
    endo: (value: "stable" | "transient") => (value === "transient" ? "stable" : value),
    eq,
  })

  const C = makeM2Object({
    carrier: ["base", "pulse", "fixed"] as const,
    endo: (value: "base" | "pulse" | "fixed") => (value === "pulse" ? "base" : value),
    eq,
  })

  const product = productM2({ left: A, right: B })

  const arrow = makeM2Morphism({
    dom: product.object,
    cod: C,
    map: ([a, b]: readonly ["left" | "right", "stable" | "transient"]) => {
      // Must satisfy: map(endo([a,b])) = endo(map([a,b]))
      // endo([a,b]) = [endo(a), endo(b)]
      // For a="right": endo("right")="left", so map(["right",b]) must map same as endo(map(["left",b]))
      // If map(["left","stable"])="base", then endo("base")="base", so map(["right","stable"]) must also be "base"
      // If map(["left","transient"])="pulse", then endo("pulse")="base", so map(["right","transient"]) could be "pulse" or anything that becomes "base"
      
      if (a === "left") {
        return b === "stable" ? "base" : "pulse"
      }
      // For a="right", we need equivariance: map(["left", endo(b)]) = endo(map(["right", b]))
      // If b="stable": map(["left","stable"])="base", endo("base")="base" → map(["right","stable"])="base"
      // If b="transient": map(["left","stable"])="base", endo("base")="base" → map(["right","transient"]) needs endo(result)="base", so "pulse" works
      return b === "stable" ? "base" : "pulse"
    },
  })

  const exponential = exponentialM2({ base: B, codomain: C })
  const lambda = exponential.curry({ domain: A, product, arrow })
  const { leftToRight, rightToLeft } = m2ExponentialComparison({
    base: B,
    codomain: C,
    left: exponential,
    right: exponential,
  })

  for (const a of A.carrier) {
    const roundTrip = rightToLeft.map(leftToRight.map(lambda.map(a)))
    expect(exponential.object.eq(roundTrip, lambda.map(a))).toBe(true)

    for (const b of B.carrier) {
      const pair: readonly [typeof a, typeof b] = [a, b]
      const mediated = exponential.evaluation.map([lambda.map(a), b])
      expect(C.eq(mediated, arrow.map(pair))).toBe(true)
    }
  }
})
