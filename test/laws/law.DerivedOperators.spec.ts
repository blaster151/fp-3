/**
 * LAW: Derived operators (Par/Fanout)
 * 
 * Mathematical forms:
 * - Par: par(f, g) = first(f) >>> second(g)
 * - Fanout: fanout(f, g) = arr(dup) >>> par(f, g)
 * 
 * IR pattern forms:
 * - Par(f, g) = Comp(First(f), Second(g))
 * - Fanout(f, g) = Comp(Arr(dup), Par(f, g))
 * 
 * These laws ensure that our IR nodes for Par/Fanout have the same
 * denotation as their derived forms using primitive Arrow operations.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { arr, comp, first, second, par, fanout, denot } from '../../allTS'

type NumFn = (n: number) => number

const functionPool: readonly NumFn[] = [
  (n) => n,
  (n) => n + 1,
  (n) => n - 1,
  (n) => 2 * n,
  (n) => -n,
]

describe("LAW: Derived operators", () => {
  // Generator for pure functions drawn from a small, stable family.
  const genFn = () => fc.constantFrom<NumFn>(...functionPool)

  // Generator for input values
  const genInput = () => fc.integer()

  describe("Par operator", () => {
    it("par(f, g) = first(f) >>> second(g)", () => {
      fc.assert(
        fc.property(
          fc.tuple(genFn(), genFn(), genInput(), genInput()),
          ([f, g, x, y]: [NumFn, NumFn, number, number]) => {
            // Left-hand side: par(f, g)
            const lhs = denot(par<number, number, number, number>(arr(f), arr(g)))

            // Right-hand side: first(f) >>> second(g)
            const rhs = denot(
              comp(
                first<number, number, number>(arr(f)),
                second<number, number, number>(arr(g))
              )
            )

            // Both should produce the same result on pairs
            const left = lhs([x, y])
            const right = rhs([x, y])
            return left[0] === right[0] && left[1] === right[1]
          },
        )
      )
    })

    it("par preserves semantics with complex arrows", () => {
      fc.assert(
        fc.property(
          fc.tuple(genFn(), genFn(), genInput(), genInput()),
          ([f, g, x, y]: [NumFn, NumFn, number, number]) => {
            // Create more complex arrows
            const inc = arr((n: number) => n + 1)
            const dbl = arr((n: number) => n * 2)

            const parDirect = denot(par<number, number, number, number>(inc, dbl))
            const parDerived = denot(
              comp(
                first<number, number, number>(inc),
                second<number, number, number>(dbl)
              )
            )

            const left = parDirect([x, y])
            const right = parDerived([x, y])
            return left[0] === right[0] && left[1] === right[1]
          },
        )
      )
    })
  })

  describe("Fanout operator", () => {
    it("fanout(f, g) = arr(dup) >>> par(f, g)", () => {
      fc.assert(
        fc.property(
          fc.tuple(genFn(), genFn(), genInput()),
          ([f, g, x]: [NumFn, NumFn, number]) => {
            // Left-hand side: fanout(f, g)
            const lhs = denot(fanout<number, number, number>(arr(f), arr(g)))

            // Right-hand side: arr(dup) >>> par(f, g)
            const dup = arr((a: number) => [a, a] as const)
            const rhs = denot(
              comp(
                dup,
                par<number, number, number, number>(arr(f), arr(g))
              )
            )

            // Both should produce the same result
            const left = lhs(x)
            const right = rhs(x)
            return left[0] === right[0] && left[1] === right[1]
          },
        )
      )
    })

    it("fanout preserves semantics with complex arrows", () => {
      fc.assert(
        fc.property(
          fc.tuple(genFn(), genFn(), genInput()),
          ([f, g, x]: [NumFn, NumFn, number]) => {
            // Create more complex arrows
            const inc = arr((n: number) => n + 1)
            const dbl = arr((n: number) => n * 2)

            const fanoutDirect = denot(fanout<number, number, number>(inc, dbl))
            const dup = arr((a: number) => [a, a] as const)
            const fanoutDerived = denot(
              comp(
                dup,
                par<number, number, number, number>(inc, dbl)
              )
            )

            const left = fanoutDirect(x)
            const right = fanoutDerived(x)
            return left[0] === right[0] && left[1] === right[1]
          },
        )
      )
    })
  })

  describe("Derived operator normalization", () => {
    it("par normalization preserves semantics", () => {
      fc.assert(
        fc.property(
          fc.tuple(genFn(), genFn(), genInput(), genInput()),
          ([f, g, x, y]: [NumFn, NumFn, number, number]) => {
            const parArrow = par<number, number, number, number>(arr(f), arr(g))
            const derivedArrow = comp(
              first<number, number, number>(arr(f)),
              second<number, number, number>(arr(g))
            )

            // Both should have the same denotation
            const parResult = denot(parArrow)([x, y])
            const derivedResult = denot(derivedArrow)([x, y])

            return parResult[0] === derivedResult[0] && parResult[1] === derivedResult[1]
          },
        )
      )
    })

    it("fanout normalization preserves semantics", () => {
      fc.assert(
        fc.property(
          fc.tuple(genFn(), genFn(), genInput()),
          ([f, g, x]: [NumFn, NumFn, number]) => {
            const fanoutArrow = fanout<number, number, number>(arr(f), arr(g))
            const dup = arr((a: number) => [a, a] as const)
            const derivedArrow = comp(
              dup,
              par<number, number, number, number>(arr(f), arr(g))
            )

            // Both should have the same denotation
            const fanoutResult = denot(fanoutArrow)(x)
            const derivedResult = denot(derivedArrow)(x)

            return fanoutResult[0] === derivedResult[0] && fanoutResult[1] === derivedResult[1]
          },
        )
      )
    })
  })
})
