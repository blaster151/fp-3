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

type NumFn = (n: number) => number

const functionPool: readonly NumFn[] = [
  (n) => n,
  (n) => n + 1,
  (n) => n - 1,
  (n) => 2 * n,
  (n) => -n,
]

describe("LAW: arr functoriality", () => {
  // Generator for pure functions (numbers to numbers)
  const genFn = () => fc.constantFrom<NumFn>(...functionPool)

  // Generator for input values
  const genInput = () => fc.integer()

    it("arr(g∘f) == arr f >>> arr g", () => {
    fc.assert(
      fc.property(
        fc.tuple(genFn(), genFn(), genInput()),
        ([f, g, x]: [NumFn, NumFn, number]) => {
          // Left-hand side: arr(g ∘ f)
          const lhs = denot(arr((y: number) => g(f(y))))

          // Right-hand side: arr f >>> arr g
          const rhs = denot(comp(arr(f), arr(g)))

          // Both sides should produce the same result
          return lhs(x) === rhs(x)
        }
      )
    )
  })

  it("normalization preserves functoriality", () => {
    fc.assert(
      fc.property(
        fc.tuple(genFn(), genFn(), genInput()),
        ([f, g, x]: [NumFn, NumFn, number]) => {
          // Create the composition that should be normalized
          const composition = comp(arr(f), arr(g))

          // Normalize it (should fuse to arr(g ∘ f))
          const normalized = normalize(composition)

          // Both should have the same denotation
          const originalResult = denot(composition)(x)
          const normalizedResult = denot(normalized.plan)(x)

          return originalResult === normalizedResult
        }
      )
    )
  })

  it("explain-plan shows fusion step", () => {
    fc.assert(
      fc.property(fc.tuple(genFn(), genFn()), ([f, g]) => {
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
      })
    )
  })
})
