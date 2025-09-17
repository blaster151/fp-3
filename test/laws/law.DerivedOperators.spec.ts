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
import { arr, comp, first, second, par, fanout, denot, Arrow } from '../../allTS'

describe("LAW: Derived operators", () => {
  // Generator for pure functions
  const genFn = () => fc.func(fc.constant(fc.integer({ min: -100, max: 100 })))
  
  // Generator for input values
  const genInput = () => fc.integer({ min: -50, max: 50 })

  describe("Par operator", () => {
    it("par(f, g) = first(f) >>> second(g)", () => {
      fc.assert(
        fc.property(genFn(), genFn(), genInput(), genInput(), (f, g, x, y) => {
          // Left-hand side: par(f, g)
          const lhs = denot(par(arr(f), arr(g)))
          
          // Right-hand side: first(f) >>> second(g)
          const rhs = denot(comp(first(arr(f)), second(arr(g))))
          
          // Both should produce the same result on pairs
          return lhs([x, y]) === rhs([x, y])
        }),
        { numRuns: 200 }
      )
    })

    it("par preserves semantics with complex arrows", () => {
      fc.assert(
        fc.property(genFn(), genFn(), genInput(), genInput(), (f, g, x, y) => {
          // Create more complex arrows
          const inc = arr((n: number) => n + 1)
          const dbl = arr((n: number) => n * 2)
          
          const parDirect = denot(par(inc, dbl))
          const parDerived = denot(comp(first(inc), second(dbl)))
          
          return parDirect([x, y]) === parDerived([x, y])
        }),
        { numRuns: 200 }
      )
    })
  })

  describe("Fanout operator", () => {
    it("fanout(f, g) = arr(dup) >>> par(f, g)", () => {
      fc.assert(
        fc.property(genFn(), genFn(), genInput(), (f, g, x) => {
          // Left-hand side: fanout(f, g)
          const lhs = denot(fanout(arr(f), arr(g)))
          
          // Right-hand side: arr(dup) >>> par(f, g)
          const dup = arr((a: number) => [a, a] as const)
          const rhs = denot(comp(dup, par(arr(f), arr(g))))
          
          // Both should produce the same result
          return lhs(x) === rhs(x)
        }),
        { numRuns: 200 }
      )
    })

    it("fanout preserves semantics with complex arrows", () => {
      fc.assert(
        fc.property(genFn(), genFn(), genInput(), (f, g, x) => {
          // Create more complex arrows
          const inc = arr((n: number) => n + 1)
          const dbl = arr((n: number) => n * 2)
          
          const fanoutDirect = denot(fanout(inc, dbl))
          const dup = arr((a: number) => [a, a] as const)
          const fanoutDerived = denot(comp(dup, par(inc, dbl)))
          
          return fanoutDirect(x) === fanoutDerived(x)
        }),
        { numRuns: 200 }
      )
    })
  })

  describe("Derived operator normalization", () => {
    it("par normalization preserves semantics", () => {
      fc.assert(
        fc.property(genFn(), genFn(), genInput(), genInput(), (f, g, x, y) => {
          const parArrow = par(arr(f), arr(g))
          const derivedArrow = comp(first(arr(f)), second(arr(g)))
          
          // Both should have the same denotation
          const parResult = denot(parArrow)([x, y])
          const derivedResult = denot(derivedArrow)([x, y])
          
          return parResult === derivedResult
        }),
        { numRuns: 200 }
      )
    })

    it("fanout normalization preserves semantics", () => {
      fc.assert(
        fc.property(genFn(), genFn(), genInput(), (f, g, x) => {
          const fanoutArrow = fanout(arr(f), arr(g))
          const dup = arr((a: number) => [a, a] as const)
          const derivedArrow = comp(dup, par(arr(f), arr(g)))
          
          // Both should have the same denotation
          const fanoutResult = denot(fanoutArrow)(x)
          const derivedResult = denot(derivedArrow)(x)
          
          return fanoutResult === derivedResult
        }),
        { numRuns: 200 }
      )
    })
  })
})
