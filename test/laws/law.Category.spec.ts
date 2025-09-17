/**
 * LAW: Category laws
 * 
 * Mathematical forms:
 * - Left Identity: id ∘ f = f
 * - Right Identity: f ∘ id = f  
 * - Associativity: (f ∘ g) ∘ h = f ∘ (g ∘ h)
 * 
 * IR pattern forms:
 * - Comp(Arr(id), f) = f
 * - Comp(f, Arr(id)) = f
 * - Comp(Comp(f, g), h) = Comp(f, Comp(g, h))
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { arr, comp, denot, normalize, Arrow } from '../../allTS'

describe("LAW: Category laws", () => {
  // Generator for pure functions
  const genFn = () => fc.func(fc.constant(fc.integer({ min: -100, max: 100 })))
  
  // Generator for input values
  const genInput = () => fc.integer({ min: -50, max: 50 })

  describe("Left Identity", () => {
    it("id ∘ f = f", () => {
      fc.assert(
        fc.property(genFn(), genInput(), (f, x) => {
          // Left-hand side: id ∘ f
          const lhs = denot(comp(Arrow.id(), arr(f)))
          
          // Right-hand side: f
          const rhs = denot(arr(f))
          
          return lhs(x) === rhs(x)
        }),
        { numRuns: 200 }
      )
    })

    it("normalization drops left identity", () => {
      fc.assert(
        fc.property(genFn(), (f) => {
          const withId = comp(Arrow.id(), arr(f))
          const plan = normalize(withId)
          
          // Should have a step that drops the identity
          const dropSteps = plan.steps.filter(step => 
            step.rule === "DropLeftId" && step.law.includes("Left Identity")
          )
          
          return dropSteps.length > 0
        }),
        { numRuns: 100 }
      )
    })
  })

  describe("Right Identity", () => {
    it("f ∘ id = f", () => {
      fc.assert(
        fc.property(genFn(), genInput(), (f, x) => {
          // Left-hand side: f ∘ id
          const lhs = denot(comp(arr(f), Arrow.id()))
          
          // Right-hand side: f
          const rhs = denot(arr(f))
          
          return lhs(x) === rhs(x)
        }),
        { numRuns: 200 }
      )
    })

    it("normalization drops right identity", () => {
      fc.assert(
        fc.property(genFn(), (f) => {
          const withId = comp(arr(f), Arrow.id())
          const plan = normalize(withId)
          
          // Should have a step that drops the identity
          const dropSteps = plan.steps.filter(step => 
            step.rule === "DropRightId" && step.law.includes("Right Identity")
          )
          
          return dropSteps.length > 0
        }),
        { numRuns: 100 }
      )
    })
  })

  describe("Associativity", () => {
    it("(f ∘ g) ∘ h = f ∘ (g ∘ h)", () => {
      fc.assert(
        fc.property(genFn(), genFn(), genFn(), genInput(), (f, g, h, x) => {
          // Left-hand side: (f ∘ g) ∘ h
          const lhs = denot(comp(comp(arr(f), arr(g)), arr(h)))
          
          // Right-hand side: f ∘ (g ∘ h)
          const rhs = denot(comp(arr(f), comp(arr(g), arr(h))))
          
          return lhs(x) === rhs(x)
        }),
        { numRuns: 200 }
      )
    })

    it("normalization reassociates composition", () => {
      fc.assert(
        fc.property(genFn(), genFn(), genFn(), (f, g, h) => {
          const leftAssoc = comp(comp(arr(f), arr(g)), arr(h))
          const plan = normalize(leftAssoc)
          
          // Should have a step that reassociates
          const assocSteps = plan.steps.filter(step => 
            step.rule === "AssocComp" && step.law.includes("Associativity")
          )
          
          return assocSteps.length > 0
        }),
        { numRuns: 100 }
      )
    })
  })

  describe("Combined Identity Laws", () => {
    it("complex identity elimination", () => {
      fc.assert(
        fc.property(genFn(), genInput(), (f, x) => {
          // Create a complex composition with identities
          const complex = comp(
            comp(Arrow.id(), comp(arr(f), Arrow.id())),
            Arrow.id()
          )
          
          const plan = normalize(complex)
          const result = denot(plan.plan)(x)
          const expected = denot(arr(f))(x)
          
          // Should normalize to just f
          return result === expected
        }),
        { numRuns: 100 }
      )
    })
  })
})
