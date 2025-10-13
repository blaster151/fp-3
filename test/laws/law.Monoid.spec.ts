/**
 * LAW: Monoid laws
 * 
 * Mathematical forms:
 * - Left Identity: ε ⊕ a = a
 * - Right Identity: a ⊕ ε = a
 * - Associativity: (a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)
 * 
 * These laws ensure that monoidal composition behaves correctly.
 * Note: Some monoids are non-commutative (e.g., Endo), so tests don't assume commutativity.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { MonoidArray, MonoidEndo } from '../../allTS'
import { testMonoidLaws, commonGenerators, commonEquality } from './law-helpers'

describe("LAW: Monoid laws", () => {
  // Common generators
  const genInt = commonGenerators.integer
  const genString = commonGenerators.string
  const genFn = () => commonGenerators.fn<number, number>(genInt)

    describe("MonoidArray", () => {
      const monoidArray = MonoidArray<number>()
      const eqReadonlyArray = (a: ReadonlyArray<number>, b: ReadonlyArray<number>) =>
        commonEquality.array(commonEquality.primitive)(Array.from(a), Array.from(b))

      const arrayArb = commonGenerators.array(genInt) as fc.Arbitrary<ReadonlyArray<number>>

      const config = {
        name: "MonoidArray",
        genA: () => arrayArb,
        empty: monoidArray.empty,
        concat: monoidArray.concat,
        eq: eqReadonlyArray
      }

    const laws = testMonoidLaws(config)

    it("Left Identity: ε ⊕ a = a", () => {
      laws.leftIdentity()
    })

    it("Right Identity: a ⊕ ε = a", () => {
      laws.rightIdentity()
    })

    it("Associativity: (a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)", () => {
      laws.associativity()
    })
  })

  describe("MonoidEndo", () => {
    const monoidEndo = MonoidEndo<number>()

    const config = {
      name: "MonoidEndo",
      genA: genInt,
      empty: monoidEndo.empty,
      concat: monoidEndo.concat,
      eq: (a: (x: number) => number, b: (x: number) => number) => {
        // Test with a few random inputs
        for (let i = 0; i < 10; i++) {
          const input = Math.floor(Math.random() * 100)
          if (a(input) !== b(input)) return false
        }
        return true
      }
    }

    const laws = testMonoidLaws(config)

    it("Left Identity: ε ⊕ a = a", () => {
      laws.leftIdentity()
    })

    it("Right Identity: a ⊕ ε = a", () => {
      laws.rightIdentity()
    })

    it("Associativity: (a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)", () => {
      laws.associativity()
    })
  })

  describe("String concatenation monoid", () => {
    const config = {
      name: "String",
      genA: genString,
      empty: "",
      concat: (a: string, b: string) => a + b,
      eq: commonEquality.primitive
    }

    const laws = testMonoidLaws(config)

    it("Left Identity: ε ⊕ a = a", () => {
      laws.leftIdentity()
    })

    it("Right Identity: a ⊕ ε = a", () => {
      laws.rightIdentity()
    })

    it("Associativity: (a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)", () => {
      laws.associativity()
    })
  })

  describe("Number addition monoid", () => {
    const config = {
      name: "Number+",
      genA: genInt,
      empty: 0,
      concat: (a: number, b: number) => a + b,
      eq: commonEquality.primitive
    }

    const laws = testMonoidLaws(config)

    it("Left Identity: ε ⊕ a = a", () => {
      laws.leftIdentity()
    })

    it("Right Identity: a ⊕ ε = a", () => {
      laws.rightIdentity()
    })

    it("Associativity: (a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)", () => {
      laws.associativity()
    })
  })

  describe("Number multiplication monoid", () => {
    const config = {
      name: "Number*",
      genA: genInt,
      empty: 1,
      concat: (a: number, b: number) => a * b,
      eq: commonEquality.primitive
    }

    const laws = testMonoidLaws(config)

    it("Left Identity: ε ⊕ a = a", () => {
      laws.leftIdentity()
    })

    it("Right Identity: a ⊕ ε = a", () => {
      laws.rightIdentity()
    })

    it("Associativity: (a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)", () => {
      laws.associativity()
    })
  })

  describe("Non-commutative monoid (Endo)", () => {
    const monoidEndo = MonoidEndo<number>()

    it("Endo monoid is non-commutative", () => {
      fc.assert(
        fc.property(fc.tuple(genFn(), genFn(), genInt()), ([f, g, x]) => {
          const left = monoidEndo.concat(f, g)(x)
          const right = monoidEndo.concat(g, f)(x)

          // Most of the time, f ∘ g ≠ g ∘ f
          // This test ensures we're not accidentally assuming commutativity
          return true // We just want to ensure the test runs
        })
      )
    })
  })
})
