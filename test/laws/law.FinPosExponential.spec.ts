import { describe, expect, it } from "vitest"

import {
  FinPosCat,
  FinPos,
  type FinPosExponential,
  type FinPosObj,
  type MonoMap,
} from "../../models/finpos-cat"

const relation = (pairs: ReadonlyArray<readonly [string, string]>) => {
  const lookup = new Set(pairs.map(([a, b]) => `${a}≤${b}`))
  return (a: string, b: string) => lookup.has(`${a}≤${b}`)
}

describe("Finite poset exponentials", () => {
  const chain = (name: string, labels: readonly string[]): FinPosObj => {
    const ordering = new Map(labels.map((value, index) => [value, index]))
    return {
      name,
      elems: [...labels],
      leq: (a, b) => (ordering.get(a) ?? Infinity) <= (ordering.get(b) ?? -Infinity),
    }
  }

  const findStrictPair = (object: FinPosObj): readonly [string, string] => {
    for (const left of object.elems) {
      for (const right of object.elems) {
        if (left === right) {
          continue
        }
        if (object.leq(left, right) && !object.leq(right, left)) {
          return [left, right]
        }
      }
    }
    throw new Error(`No strictly comparable pair found in ${object.name}`)
  }

  const A = chain("Chain_A", ["α", "β"])
  const B = chain("Chain_B", ["0", "1"])
  const C: FinPosObj = {
    name: "Vee",
    elems: ["⊥", "x", "y", "⊤"],
    leq: relation([
      ["⊥", "⊥"],
      ["⊥", "x"],
      ["⊥", "y"],
      ["⊥", "⊤"],
      ["x", "x"],
      ["x", "⊤"],
      ["y", "y"],
      ["y", "⊤"],
      ["⊤", "⊤"],
    ]),
  }

  const monotoneSpace = FinPos.monotoneFunctionPoset(B, C)
  const category = FinPosCat([A, B, C])
  const exponential = category.exponential(B.name, C.name)
  const functionByName = new Map(
    monotoneSpace.functions.map((map) => [map.name, map] as const),
  )

  it("orders monotone maps pointwise", () => {
    const expObj = monotoneSpace.object
    expect(exponential.object.elems).toEqual(expObj.elems)
    expect(expObj.elems.length).toBeGreaterThan(0)

    for (const fn of expObj.elems) {
      expect(expObj.leq(fn, fn)).toBe(true)
    }

    for (const left of expObj.elems) {
      const leftMap = functionByName.get(left)
      if (!leftMap) {
        throw new Error(`Missing monotone witness for ${left}`)
      }

      for (const right of expObj.elems) {
        const rightMap = functionByName.get(right)
        if (!rightMap) {
          throw new Error(`Missing monotone witness for ${right}`)
        }

        if (expObj.leq(left, right)) {
          for (const b of B.elems) {
            expect(C.leq(leftMap.map(b), rightMap.map(b))).toBe(true)
          }
        }

        if (expObj.leq(left, right) && expObj.leq(right, left)) {
          for (const b of B.elems) {
            expect(leftMap.map(b)).toBe(rightMap.map(b))
          }
        }
      }
    }

    for (const f of expObj.elems) {
      for (const g of expObj.elems) {
        for (const h of expObj.elems) {
          if (expObj.leq(f, g) && expObj.leq(g, h)) {
            expect(expObj.leq(f, h)).toBe(true)
          }
        }
      }
    }
  })

  it("provides a monotone evaluation arrow", () => {
    expect(FinPos.isMonotone(monotoneSpace.product.object, C, monotoneSpace.evaluation)).toBe(
      true,
    )
  })

  it("curries monotone maps uniquely", () => {
    const AObj = category.lookup(A.name)
    const productAB = category.product(AObj.name, B.name)
    const domainProduct = productAB.object
    const expProduct = exponential.product

    const arrows = category.generalizedElements(domainProduct.name, C.name)
    expect(arrows.length).toBeGreaterThan(0)

    for (const arrow of arrows) {
      expect(FinPos.isMonotone(domainProduct, C, arrow)).toBe(true)

      const curried = exponential.curry(AObj, arrow)
      expect(FinPos.isMonotone(AObj, exponential.object, curried)).toBe(true)

      const lambdaTimesId: MonoMap = {
        name: `⟨${curried.name}, id_${B.name}⟩`,
        dom: domainProduct.name,
        cod: expProduct.object.name,
        map: (pair) => {
          const [a, b] = productAB.decompose(pair)
          const fn = curried.map(a)
          return expProduct.pair(fn, b)
        },
      }

      expect(
        FinPos.isMonotone(domainProduct, expProduct.object, lambdaTimesId),
      ).toBe(true)

      const mediated = category.compose(exponential.evaluation, lambdaTimesId)
      expect(category.eq(mediated, arrow)).toBe(true)

      const candidates = category.generalizedElements(AObj.name, exponential.object.name)
      const factoring: MonoMap[] = []
      for (const candidate of candidates) {
        const candidateTimesId: MonoMap = {
          name: `⟨${candidate.name}, id_${B.name}⟩`,
          dom: domainProduct.name,
          cod: expProduct.object.name,
          map: (pair) => {
            const [a, b] = productAB.decompose(pair)
            const fn = candidate.map(a)
            return expProduct.pair(fn, b)
          },
        }

        const comparison = category.compose(exponential.evaluation, candidateTimesId)
        if (category.eq(comparison, arrow)) {
          factoring.push(candidate)
        }
      }

      expect(factoring).toHaveLength(1)
      expect(category.eq(factoring[0]!, curried)).toBe(true)
    }
  })

  it("builds comparison mediators witnessing unique exponential choices", () => {
    const altWitness = FinPos.exponential(B, C)
    const { leftToRight, rightToLeft } = FinPos.exponentialComparison(
      B,
      C,
      exponential,
      altWitness,
    )

    expect(FinPos.isMonotone(exponential.object, altWitness.object, leftToRight)).toBe(true)
    expect(FinPos.isMonotone(altWitness.object, exponential.object, rightToLeft)).toBe(true)

    for (const fn of exponential.object.elems) {
      const image = leftToRight.map(fn)
      for (const argument of B.elems) {
        const leftPair = exponential.product.pair(fn, argument)
        const rightPair = altWitness.product.pair(image, argument)
        expect(exponential.evaluation.map(leftPair)).toBe(
          altWitness.evaluation.map(rightPair),
        )
      }
    }

    for (const fn of altWitness.object.elems) {
      const image = rightToLeft.map(fn)
      for (const argument of B.elems) {
        const rightPair = altWitness.product.pair(fn, argument)
        const leftPair = exponential.product.pair(image, argument)
        expect(altWitness.evaluation.map(rightPair)).toBe(
          exponential.evaluation.map(leftPair),
        )
      }
    }

    for (const fn of exponential.object.elems) {
      expect(rightToLeft.map(leftToRight.map(fn))).toBe(fn)
    }

    for (const fn of altWitness.object.elems) {
      expect(leftToRight.map(rightToLeft.map(fn))).toBe(fn)
    }
  })

  it("rejects comparisons when the base or codomain disagree", () => {
    const mismatchedBase = FinPos.exponential(A, C)
    expect(() => FinPos.exponentialComparison(B, C, exponential, mismatchedBase)).toThrow()

    const mismatchedCodomain = FinPos.exponential(B, A)
    expect(() => FinPos.exponentialComparison(B, C, exponential, mismatchedCodomain)).toThrow()
  })

  it("refuses mediators whose currying forgets monotonicity", () => {
    const altWitness = FinPos.exponential(B, C)
    const [lower, upper] = findStrictPair(exponential.object)

    const fakeWitness: FinPosExponential = {
      ...altWitness,
      curry: (domain, arrow) => {
        const curried = altWitness.curry(domain, arrow)
        if (domain.name !== exponential.object.name) {
          return curried
        }
        return {
          ...curried,
          map: (value: string) => {
            if (value === lower) {
              return upper
            }
            if (value === upper) {
              return lower
            }
            return curried.map(value)
          },
        }
      },
    }

    expect(() => FinPos.exponentialComparison(B, C, exponential, fakeWitness)).toThrow(
      /fails monotonicity/,
    )
  })
})
