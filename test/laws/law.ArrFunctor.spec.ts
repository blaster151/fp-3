/**
 * LAW: arr functoriality
 * 
 * Mathematical form: arr(g ∘ f) = arr f >>> arr g
 * IR pattern form: Arr(g∘f) = Comp(Arr(f), Arr(g))
 * 
 * This law states that lifting function composition is equivalent to
 * composing lifted functions.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { arr, comp, denot, normalize } from '../../allTS'

describe("LAW: arr functoriality", () => {
  // Generator for pure functions (numbers to numbers)
  const genFn = () => fc.func(fc.constant(fc.integer({ min: -100, max: 100 })))
  
  // Generator for input values
  const genInput = () => fc.integer({ min: -50, max: 50 })

  it("arr(g∘f) == arr f >>> arr g", () => {
    fc.assert(
      fc.property(genFn(), genFn(), genInput(), (f, g, x) => {
        // Left-hand side: arr(g ∘ f)
        const lhs = denot(arr((y: number) => g(f(y))))
        
        // Right-hand side: arr f >>> arr g  
        const rhs = denot(comp(arr(f), arr(g)))
        
        // Both sides should produce the same result
        return lhs(x) === rhs(x)
      }),
      { numRuns: 200 } // Fast path for CI
    )
  })

  it("normalization preserves functoriality", () => {
    fc.assert(
      fc.property(genFn(), genFn(), genInput(), (f, g, x) => {
        // Create the composition that should be normalized
        const composition = comp(arr(f), arr(g))
        
        // Normalize it (should fuse to arr(g ∘ f))
        const normalized = normalize(composition)
        
        // Both should have the same denotation
        const originalResult = denot(composition)(x)
        const normalizedResult = denot(normalized.plan)(x)
        
        return originalResult === normalizedResult
      }),
      { numRuns: 200 }
    )
  })

  it("explain-plan shows fusion step", () => {
    fc.assert(
      fc.property(genFn(), genFn(), (f, g) => {
        const composition = comp(arr(f), arr(g))
        const plan = normalize(composition)
        
        // Should have at least one fusion step
        const fusionSteps = plan.steps.filter(step => step.rule === "FuseArr")
        expect(fusionSteps.length).toBeGreaterThan(0)
        
        // Should reference the functoriality law
        const functorialSteps = plan.steps.filter(step => 
          step.law.includes("Functoriality")
        )
        expect(functorialSteps.length).toBeGreaterThan(0)
        
        return true
      }),
      { numRuns: 50 }
    )
  })
})
