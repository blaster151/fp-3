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

import { DRMonad, mkRDist, normalizeR, isDirac, KleisliDR } from '../../semiring-dist'
import type { Dist, NumSemiring } from '../../semiring-dist'
import { Prob, LogProb, MaxPlus } from '../../semiring-utils'
import type { CSRig } from '../../semiring-utils'
import { checkFubini } from '../../markov-laws'
import { testMonadLaws } from '../laws/law-helpers'
import type { MonadConfig } from '../laws/law-helpers'

type NumericRig = NumSemiring | CSRig<number>

const boundedInt = (min: number, max: number): fc.Arbitrary<number> => {
  const base = fc.integer() as fc.Arbitrary<number>
  return mapArbitrary(base, (value: number) => {
    const span = max - min + 1
    const mod = ((value % span) + span) % span
    return min + mod
  })
}

const mapArbitrary = <Input, Output>(
  arbitrary: fc.Arbitrary<Input>,
  mapper: (value: Input) => Output
): fc.Arbitrary<Output> => {
  const mapFn = (arbitrary as { map?: (fn: (value: Input) => Output) => fc.Arbitrary<Output> }).map
  if (typeof mapFn !== 'function') {
    throw new Error('fast-check arbitrary missing map implementation')
  }
  return mapFn.call(arbitrary, mapper) as fc.Arbitrary<Output>
}

describe("LAW: Semiring Distribution Laws", () => {

  // Test semirings with their properties
  const testSemirings: Array<{
    readonly name: string
    readonly R: NumericRig
    readonly isAffine: boolean
    readonly genElement: () => fc.Arbitrary<number>
    readonly genWeight: () => fc.Arbitrary<number>
  }> = [
    {
      name: "Prob (Standard Probability)",
      R: Prob,
      isAffine: true,
      genElement: () => boundedInt(-5, 5),
      genWeight: () => boundedInt(0, 4)
    },
    {
      name: "LogProb (Log-space Probability)",
      R: LogProb,
      isAffine: true,
      genElement: () => boundedInt(-5, 5),
      genWeight: () => boundedInt(-10, 2)
    },
    {
      name: "MaxPlus (Viterbi/Shortest Path)",
      R: MaxPlus,
      isAffine: true,
      genElement: () => boundedInt(-5, 5),
      genWeight: () => boundedInt(-10, 10)
    }
  ]

  testSemirings.forEach(({ name, R, isAffine, genElement, genWeight }) => {
    describe(`${name} Semiring`, () => {
      type Elem = number
      const M = DRMonad(R)
      const weightEq = R.eq ?? ((a: number, b: number) => Math.abs(a - b) < 1e-10)

      const toUnitDist = (pairs: Array<[Elem, number]>): Dist<Elem> =>
        normalizeR<Elem>(R, mkRDist<Elem>(R, pairs))

        const genUnitDist = (): fc.Arbitrary<Dist<Elem>> => {
          const pairArb = fc.array(fc.tuple(genElement(), genWeight()), {
            minLength: 1,
            maxLength: 5
          }) as fc.Arbitrary<Array<[Elem, number]>>
          return mapArbitrary(pairArb, (pairs) => toUnitDist(pairs as Array<[Elem, number]>))
        }

      const genKernel = (): fc.Arbitrary<(input: Elem) => Dist<Elem>> => {
        const entryArb = fc.array(fc.tuple(genElement(), genUnitDist()), {
          minLength: 0,
          maxLength: 4
        }) as fc.Arbitrary<Array<[Elem, Dist<Elem>]>>
        const tupleArb = fc.tuple(genUnitDist(), entryArb) as fc.Arbitrary<[
          Dist<Elem>,
          Array<[Elem, Dist<Elem>]>
        ]>
        return mapArbitrary(tupleArb, (value) => {
          const [fallback, entries] = value as [Dist<Elem>, Array<[Elem, Dist<Elem>]>]
          const table = new Map<number, Dist<Elem>>(entries)
          return (input: Elem): Dist<Elem> => table.get(input) ?? fallback
        })
      }

      const sumWeights = (dist: Dist<Elem>) =>
        [...dist.values()].reduce((acc, weight) => R.add(acc, weight), R.zero)

      const eqDist = (left: Dist<Elem>, right: Dist<Elem>) => {
        const keys = new Set<Elem>([...left.keys(), ...right.keys()])
        for (const key of keys) {
          const lw = left.get(key) ?? R.zero
          const rw = right.get(key) ?? R.zero
          if (!weightEq(lw, rw)) {
            return false
          }
        }
        return true
      }

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
            fc.property(
              fc.tuple(genWeight(), genWeight(), genWeight()),
              ([a, b, c]: [number, number, number]) => {
                const comm = weightEq(R.add(a, b), R.add(b, a))
                const assoc = weightEq(R.add(R.add(a, b), c), R.add(a, R.add(b, c)))
                return comm && assoc
              }
            )
          )
        })

        it("semiring multiplication distributes over addition", () => {
          fc.assert(
            fc.property(
              fc.tuple(genWeight(), genWeight(), genWeight()),
              ([a, b, c]: [number, number, number]) => {
                const lhs = R.mul(a, R.add(b, c))
                const rhs = R.add(R.mul(a, b), R.mul(a, c))
                return weightEq(lhs, rhs)
              }
            )
          )
        })

        it("semiring has proper identities", () => {
          fc.assert(
            fc.property(genWeight(), (a: number) => {
              const addId = weightEq(R.add(R.zero, a), a) && weightEq(R.add(a, R.zero), a)
              const mulId = weightEq(R.mul(R.one, a), a) && weightEq(R.mul(a, R.one), a)
              return addId && mulId
            })
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

        const pureMonad = ((value: Elem) => M.of(value)) as MonadConfig<Dist<Elem>, Elem>['pure']
        const chainMonad = ((k: (a: Elem) => Dist<Elem>) => (fa: Dist<Elem>) => M.bind(fa, k)) as MonadConfig<Dist<Elem>, Elem>['chain']

        const config: MonadConfig<Dist<Elem>, Elem> = {
          name: `DR[${name}]`,
          genA: genElement,
          genFA: genUnitDist,
          genK: genKernel,
          pure: pureMonad,
          chain: chainMonad,
          eq: (left, right) => eqDist(left, right)
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

        if (isAffine && !weightEq(R.one, R.zero)) {
          it("return creates unit-weight distributions", () => {
            fc.assert(
              fc.property(genElement(), (x: number) => {
                const dist = M.of(x)
                const totalWeight = sumWeights(dist)
                return weightEq(totalWeight, R.one)
              })
            )
          })

          it("bind preserves total weight for unit-weight inputs", () => {
            fc.assert(
              fc.property(
                fc.tuple(genElement(), genKernel()),
                ([x, k]: [number, (value: number) => Dist<Elem>]) => {
                  const unitDist = M.of(x)
                  const result = M.bind(unitDist, k)
                  const totalWeight = sumWeights(result)
                  return weightEq(totalWeight, R.one)
                }
              )
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
              fc.tuple(
                fc.array(fc.tuple(genElement(), genWeight()), { minLength: 1, maxLength: 3 }),
                fc.array(fc.tuple(genElement(), genWeight()), { minLength: 1, maxLength: 3 })
              ),
              ([pairsA, pairsB]: [Array<[number, number]>, Array<[number, number]>]) => {
                const da = mkRDist(R, pairsA)
                const db = mkRDist(R, pairsB)

                return checkFubini(M, da, db)
              }
            )
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
              fc.property(genElement(), (x: number) => {
                const dirac = M.of(x)
                expect(isDirac(R, dirac)).toBe(true)

                // Should have exactly one non-zero entry
                const nonZeroEntries = [...dirac.entries()].filter(([_, w]) => !weightEq(w, R.zero))
                return nonZeroEntries.length === 1 && nonZeroEntries.every(([value]) => value === x)
              })
            )
          })

        it("convolution with Dirac is identity", () => {
          fc.assert(
            fc.property(
              fc.tuple(
                fc.array(fc.tuple(genElement(), genWeight()), { minLength: 1, maxLength: 3 }),
                genElement()
              ),
              ([pairs, x]: [Array<[number, number]>, number]) => {
                const dist = mkRDist(R, pairs)
                const dirac = M.of(x)

                // dist >>= (\_ -> dirac) should equal dirac (up to weight scaling)
                const result = M.bind(dist, () => dirac)

                // All weight should be concentrated on x
                const resultEntries = [...result.entries()]
                const xWeight = result.get(x) ?? R.zero
                const otherWeight = resultEntries
                  .filter(([k, _]) => k !== x)
                  .reduce((acc, [_, w]) => R.add(acc, w), R.zero)

                return weightEq(otherWeight, R.zero) && !weightEq(xWeight, R.zero)
              }
            )
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
          const { composeK } = KleisliDR(R)

          it("Kleisli identity is left/right neutral", () => {
            fc.assert(
              fc.property(
                fc.tuple(genKernel(), genElement()),
                ([k, x]: [(value: number) => Dist<Elem>, number]) => {
                  const id = (value: Elem) => M.of(value)

                  // id >=> k = k
                  const leftComp = composeK(id, k)
                  const leftResult = leftComp(x)
                  const directResult = k(x)

                  return eqDist(leftResult, directResult)
                }
              )
            )
          })

          it("Kleisli composition is associative", () => {
            fc.assert(
              fc.property(
                fc.tuple(genKernel(), genKernel(), genKernel(), genElement()),
                ([f, g, h, x]: [
                  (value: number) => Dist<Elem>,
                  (value: number) => Dist<Elem>,
                  (value: number) => Dist<Elem>,
                  number
                ]) => {
                  const lhs = composeK(composeK(f, g), h)
                  const rhs = composeK(f, composeK(g, h))

                  const lhsResult = lhs(x)
                  const rhsResult = rhs(x)

                  return eqDist(lhsResult, rhsResult)
                }
              )
            )
          })
        }
      })
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

      for (const { R } of affineSemirings) {
        const M = DRMonad(R)
        const weightEq = R.eq ?? ((a: number, b: number) => Math.abs(a - b) < 1e-10)

        const dist = M.of(42)
        const total = [...dist.values()].reduce((acc, w) => R.add(acc, w), R.zero)

        expect(weightEq(total, R.one)).toBe(true)
      }
    })

    it("Fubini property holds across all semirings", () => {
      testSemirings.forEach(({ R }) => {
        const M = DRMonad(R)

        // Simple test case
        const da = mkRDist(R, [[1, R.one]])
        const db = mkRDist(R, [[2, R.one]])
        
        expect(checkFubini(M, da, db)).toBe(true)
      })
    })
  })
})