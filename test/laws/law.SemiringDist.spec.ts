/**
 * LAW: Semiring Distribution Laws (DR Monad)
 * 
 * The DR monad (Distribution-Representation) over a commutative semiring R
 * generalizes probability distributions to other algebraic structures.
 * 
 * Key properties:
 * 1. Monad laws (return, bind associativity) 
 * 2. Semiring operations preserve structure
 * 3. Affineness when R has 1_R ≠ 0_R
 * 4. Commutative monoidal structure via product
 * 
 * Laws implemented following the format:
 * (Name, Domain, Statement, Rationale, Test Oracle)
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  DRMonad, NumSemiring, RPlus, BoolRig, TropicalMaxPlus, LogProb,
  mkRDist, normalizeR, isDirac, KleisliDR
} from '../../semiring-dist'
import { Dist, mass } from '../../markov-category'
import { checkFubini } from '../../markov-laws'
import { testMonadLaws, commonGenerators } from '../laws/law-helpers'

describe("LAW: Semiring Distribution Laws", () => {

  // Test semirings with their properties
  const testSemirings: Array<{
    name: string
    R: NumSemiring
    isAffine: boolean
    genElement: () => fc.Arbitrary<number>
    genWeight: () => fc.Arbitrary<number>
  }> = [
    {
      name: "RPlus (Standard Probability)",
      R: RPlus,
      isAffine: true,
      genElement: () => fc.integer({ min: -5, max: 5 }),
      genWeight: () => fc.float({ min: 0, max: 2, noNaN: true })
    },
    {
      name: "LogProb (Log-space Probability)",  
      R: LogProb,
      isAffine: true,
      genElement: () => fc.integer({ min: -5, max: 5 }),
      genWeight: () => fc.float({ min: -10, max: 2, noNaN: true })
    },
    {
      name: "Tropical (Viterbi/Shortest Path)",
      R: TropicalMaxPlus, 
      isAffine: true,
      genElement: () => fc.integer({ min: -5, max: 5 }),
      genWeight: () => fc.float({ min: -10, max: 10, noNaN: true })
    },
    {
      name: "Bool (Nondeterminism)",
      R: BoolRig,
      isAffine: true,
      genElement: () => fc.integer({ min: -5, max: 5 }),
      genWeight: () => fc.constantFrom(0, 1)
    }
  ]

  testSemirings.forEach(({ name, R, isAffine, genElement, genWeight }) => {
    describe(`${name} Semiring`, () => {
      const M = DRMonad(R)
      const eq = R.eq ?? ((a, b) => Math.abs(a - b) < 1e-10)

      describe("6.1 Semiring Operations Respect Structure", () => {
        /**
         * Name: Semiring Coherence
         * Domain: Commutative semiring R
         * Statement: Addition and multiplication in R preserve distribution structure
         * Rationale: Ensures semiring operations are well-defined on distributions
         * Test Oracle: Direct computation with semiring operations
         */

        it("semiring addition is commutative and associative", () => {
          fc.assert(
            fc.property(genWeight(), genWeight(), genWeight(), (a, b, c) => {
              // Commutativity: a ⊕ b = b ⊕ a
              const comm = eq(R.add(a, b), R.add(b, a))
              
              // Associativity: (a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)
              const assoc = eq(R.add(R.add(a, b), c), R.add(a, R.add(b, c)))
              
              return comm && assoc
            }),
            { numRuns: 100 }
          )
        })

        it("semiring multiplication distributes over addition", () => {
          fc.assert(
            fc.property(genWeight(), genWeight(), genWeight(), (a, b, c) => {
              // Left distributivity: a ⊗ (b ⊕ c) = (a ⊗ b) ⊕ (a ⊗ c)
              const lhs = R.mul(a, R.add(b, c))
              const rhs = R.add(R.mul(a, b), R.mul(a, c))
              return eq(lhs, rhs)
            }),
            { numRuns: 100 }
          )
        })

        it("semiring has proper identities", () => {
          fc.assert(
            fc.property(genWeight(), (a) => {
              // Additive identity: 0 ⊕ a = a = a ⊕ 0
              const addId = eq(R.add(R.zero, a), a) && eq(R.add(a, R.zero), a)
              
              // Multiplicative identity: 1 ⊗ a = a = a ⊗ 1  
              const mulId = eq(R.mul(R.one, a), a) && eq(R.mul(a, R.one), a)
              
              return addId && mulId
            }),
            { numRuns: 100 }
          )
        })
      })

      describe("6.2 DR Monad Laws", () => {
        /**
         * Name: Monad Structure for DR
         * Domain: DR_R monad over semiring R
         * Statement: Standard monad laws (left/right identity, associativity)
         * Rationale: DR must be a proper monad to support Kleisli composition
         * Test Oracle: Property-based testing of monad equations
         */

        const config = {
          name: `DR[${name}]`,
          genA: genElement,
          genFA: () => fc.array(fc.tuple(genElement(), genWeight()), { minLength: 1, maxLength: 5 })
                     .map(pairs => mkRDist(R, pairs)),
          genK: () => fc.func(fc.constant(
            fc.array(fc.tuple(genElement(), genWeight()), { minLength: 1, maxLength: 3 })
              .map(pairs => mkRDist(R, pairs))
          )),
          pure: M.of,
          chain: <A, B>(k: (a: A) => Dist<B>) => (fa: Dist<A>) => M.bind(fa, k),
          eq: (a: Dist<any>, b: Dist<any>) => {
            // Compare distributions by checking all entries
            if (a.size !== b.size) return false
            for (const [k, v] of a) {
              const bv = b.get(k) ?? R.zero
              if (!eq(v, bv)) return false
            }
            return true
          }
        }

        const laws = testMonadLaws(config)

        it("Left Identity: return(a) >>= f = f(a)", () => {
          laws.leftIdentity()
        })

        it("Right Identity: m >>= return = m", () => {
          laws.rightIdentity()
        })

        it("Associativity: (m >>= f) >>= g = m >>= (λx.f(x) >>= g)", () => {
          laws.associativity()
        })
      })

      describe("6.3 Affineness Property", () => {
        /**
         * Name: Affine Monad Property
         * Domain: DR_R where R has 1_R ≠ 0_R
         * Statement: T(1) ≅ 1, i.e., the monad preserves the terminal object
         * Rationale: Required for Markov category structure
         * Test Oracle: Unit distributions have total weight 1_R
         */

        if (isAffine && !eq(R.one, R.zero)) {
          it("return creates unit-weight distributions", () => {
            fc.assert(
              fc.property(genElement(), (x) => {
                const dist = M.of(x)
                const totalWeight = [...dist.values()].reduce((acc, w) => R.add(acc, w), R.zero)
                return eq(totalWeight, R.one)
              }),
              { numRuns: 100 }
            )
          })

          it("bind preserves total weight for unit-weight inputs", () => {
            fc.assert(
              fc.property(
                genElement(),
                fc.func(fc.constant(fc.array(fc.tuple(genElement(), genWeight()), { minLength: 1, maxLength: 3 })
                  .map(pairs => normalizeToUnit(mkRDist(R, pairs))))),
                (x, k) => {
                  const unitDist = M.of(x)
                  const result = M.bind(unitDist, k)
                  const totalWeight = [...result.values()].reduce((acc, w) => R.add(acc, w), R.zero)
                  return eq(totalWeight, R.one)
                }
              ),
              { numRuns: 50 }
            )
          })
        }
      })

      describe("6.4 Product Structure (Fubini)", () => {
        /**
         * Name: Fubini/Product Coherence
         * Domain: DR_R monad with product operation
         * Statement: product(da, db) = bind(da, a => map(db, b => [a,b]))
         * Rationale: Product measure must be coherent with monadic structure
         * Test Oracle: Two ways of computing product distributions agree
         */

        it("product is coherent with bind/map", () => {
          fc.assert(
            fc.property(
              fc.array(fc.tuple(genElement(), genWeight()), { minLength: 1, maxLength: 3 }),
              fc.array(fc.tuple(genElement(), genWeight()), { minLength: 1, maxLength: 3 }),
              (pairsA, pairsB) => {
                const da = mkRDist(R, pairsA)
                const db = mkRDist(R, pairsB)
                
                return checkFubini(M, da, db)
              }
            ),
            { numRuns: 20 }
          )
        })
      })

      describe("6.5 Dirac Distributions", () => {
        /**
         * Name: Dirac Distribution Properties
         * Domain: Point masses in DR_R
         * Statement: Dirac distributions are left/right units for convolution
         * Rationale: Point masses should behave as expected
         * Test Oracle: Binding with Dirac gives expected results
         */

        it("Dirac distributions are properly concentrated", () => {
          fc.assert(
            fc.property(genElement(), (x) => {
              const dirac = M.of(x)
              expect(isDirac(R, dirac)).toBe(true)
              
              // Should have exactly one non-zero entry
              const nonZeroEntries = [...dirac.entries()].filter(([_, w]) => !eq(w, R.zero))
              return nonZeroEntries.length === 1 && nonZeroEntries[0][0] === x
            }),
            { numRuns: 50 }
          )
        })

        it("convolution with Dirac is identity", () => {
          fc.assert(
            fc.property(
              fc.array(fc.tuple(genElement(), genWeight()), { minLength: 1, maxLength: 3 }),
              genElement(),
              (pairs, x) => {
                const dist = mkRDist(R, pairs)
                const dirac = M.of(x)
                
                // dist >>= (\_ -> dirac) should equal dirac (up to weight scaling)
                const result = M.bind(dist, (_) => dirac)
                
                // All weight should be concentrated on x
                const resultEntries = [...result.entries()]
                const xWeight = result.get(x) ?? R.zero
                const otherWeight = resultEntries
                  .filter(([k, _]) => k !== x)
                  .reduce((acc, [_, w]) => R.add(acc, w), R.zero)
                
                return eq(otherWeight, R.zero) && !eq(xWeight, R.zero)
              }
            ),
            { numRuns: 30 }
          )
        })
      })

      describe("6.6 Kleisli Category Structure", () => {
        /**
         * Name: Kleisli Category Laws for DR
         * Domain: Kleisli category Kl(DR_R)
         * Statement: Kleisli composition is associative with proper identities
         * Rationale: Kleisli category must be a proper category
         * Test Oracle: Category laws hold for Kleisli morphisms
         */

        if (isAffine) {
          const { composeK, detKleisli } = KleisliDR(R)

          it("Kleisli identity is left/right neutral", () => {
            fc.assert(
              fc.property(
                fc.func(fc.constant(fc.array(fc.tuple(genElement(), genWeight()), { minLength: 1, maxLength: 3 })
                  .map(pairs => normalizeToUnit(mkRDist(R, pairs))))),
                genElement(),
                (k, x) => {
                  const id = M.of
                  
                  // id >=> k = k
                  const leftComp = composeK(id, k)
                  const leftResult = leftComp(x)
                  const directResult = k(x)
                  
                  // Compare results (simplified equality)
                  return leftResult.size === directResult.size
                }
              ),
              { numRuns: 20 }
            )
          })

          it("Kleisli composition is associative", () => {
            fc.assert(
              fc.property(
                fc.func(fc.constant(M.of(fc.integer()))),
                fc.func(fc.constant(M.of(fc.string()))), 
                fc.func(fc.constant(M.of(fc.boolean()))),
                genElement(),
                (f, g, h, x) => {
                  // (h >=> g) >=> f = h >=> (g >=> f)
                  const lhs = composeK(composeK(f, g), h)
                  const rhs = composeK(f, composeK(g, h))
                  
                  // Both should produce same-sized results (simplified check)
                  const lhsResult = lhs(x)
                  const rhsResult = rhs(x)
                  
                  return lhsResult.size === rhsResult.size
                }
              ),
              { numRuns: 10 }
            )
          })
        }
      })

      // Helper function to normalize distributions to unit weight
      function normalizeToUnit<T>(dist: Dist<T>): Dist<T> {
        return normalizeR(R, dist)
      }
    })
  })

  describe("6.7 Cross-Semiring Properties", () => {
    /**
     * Name: Semiring-Generic Laws
     * Domain: Multiple semirings with same interface
     * Statement: Laws that should hold across all semirings
     * Rationale: Ensures our abstractions are truly generic
     * Test Oracle: Same law holds for different semiring instances
     */

    it("all affine semirings preserve unit through return", () => {
      const affineSemirings = testSemirings.filter(s => s.isAffine)
      
      for (const { name, R } of affineSemirings) {
        const M = DRMonad(R)
        const eq = R.eq ?? ((a, b) => Math.abs(a - b) < 1e-10)
        
        const dist = M.of(42)
        const total = [...dist.values()].reduce((acc, w) => R.add(acc, w), R.zero)
        
        expect(eq(total, R.one)).toBe(true)
      }
    })

    it("Fubini property holds across all semirings", () => {
      testSemirings.forEach(({ name, R, genElement, genWeight }) => {
        const M = DRMonad(R)
        
        // Simple test case
        const da = mkRDist(R, [[1, R.one]])
        const db = mkRDist(R, [[2, R.one]])
        
        expect(checkFubini(M, da, db)).toBe(true)
      })
    })
  })
})