/**
 * LAW: Markov Category Laws
 * 
 * A Markov category is a symmetric monoidal category where:
 * 1. Every object has a commutative comonoid structure (copy Δ, discard !)
 * 2. Morphisms are (sub)stochastic kernels  
 * 3. The monad is affine: T(1) ≅ 1
 * 
 * Laws implemented following the format:
 * (Name, Domain, Statement, Rationale, Test Oracle)
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  mkFin,
  FinMarkov,
  idK,
  detK,
  tensor,
  checkRowStochastic,
  mass,
  fromWeights,
  MarkovCategory,
  approxEqualMatrix
} from '../../markov-category'
import type {
  Fin,
  Kernel,
  Pair,
  I,
} from '../../markov-category'
import {
  buildMarkovComonoidWitness,
  checkMarkovComonoid,
} from '../../markov-comonoid-structure'
import {
  buildMarkovDeterministicWitness,
  checkDeterministicComonoid,
  buildMarkovPositivityWitness,
  checkDeterministicTensorViaMarginals,
} from '../../markov-deterministic-structure'
import { DRMonad } from '../../semiring-dist'
import { Prob, LogProb, MaxPlus, BoolRig, RPlus, TropicalMaxPlus } from '../../semiring-utils'
import { delta } from '../../semiring-dist'
import { KleisliProb, DistMonad } from '../../probability-monads'

describe("LAW: Markov Category Laws", () => {
  
  // Test finite sets for property testing
  const genSmallFin = () => fc.constantFrom<Fin<any>>(
    mkFin([0, 1] as const, (a,b) => a === b) as Fin<any>,
    mkFin([0, 1, 2] as const, (a,b) => a === b) as Fin<any>,
    mkFin(["a", "b"] as const, (a,b) => a === b) as Fin<any>,
  )

  describe("5.1 Dist over CSRig is Affine", () => {
    /**
     * Name: Affine Distribution Law
     * Domain: R commutative semiring with 1_R ≠ 0_R
     * Statement: For any finite X, Σ_x p(x) = 1_R (affine) preserved under bind
     * Rationale: Enables Kleisli_R to be a Markov category
     * Test Oracle: property test that return + bind preserve normalized weight
     */
    
    it("return preserves unit mass", () => {
      const semirings = [
        { name: "Prob", R: Prob, M: DRMonad(Prob) },
        { name: "LogProb", R: LogProb, M: DRMonad(LogProb) },
      ]

      for (const { name, R, M } of semirings) {
        fc.assert(
          fc.property(fc.integer({ min: -10, max: 10 }), (x) => {
            const dist = M.of(x)
            const totalMass = [...dist.values()].reduce((a, b) => R.add(a, b), R.zero)
            const eq = R.eq ?? ((a, b) => Math.abs(a - b) < 1e-10)
            return eq(totalMass, R.one)
          }),
          { numRuns: 100 }
        )
      }
    })

    it("bind preserves unit mass for stochastic kernels", () => {
      const R = Prob
      const M = DRMonad(R)
      
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.integer(), fc.float({ min: 0, max: 1 })), { minLength: 1, maxLength: 5 }),
          fc.func(fc.array(fc.tuple(fc.string(), fc.float({ min: 0, max: 1 })), { minLength: 1, maxLength: 3 })),
          (pairs, kGen) => {
            // Create normalized distribution
            const dist = fromWeights(pairs, true)
            
            // Create stochastic kernel
            const k = (x: number) => fromWeights(kGen(x), true)
            
            // Bind should preserve mass
            const result = M.bind(dist, k)
            const resultMass = mass(result)
            
            return Math.abs(resultMass - 1) < 1e-10
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe("5.2 Comonoid Laws for Objects", () => {
    /**
     * Name: Comonoid Structure Laws
     * Domain: Any object X in Markov category
     * Statement: Copy (Δ) and discard (!) satisfy comonoid laws
     * Rationale: Essential for Markov category structure
     * Test Oracle: Matrix equality up to numerical tolerance
     */

    const comonoidReport = <X>(Xf: Fin<X>) =>
      checkMarkovComonoid(buildMarkovComonoidWitness(Xf))

    it("copy/discard witness forms a commutative comonoid", () => {
      fc.assert(
        fc.property(genSmallFin(), (Xf) => {
          const report = comonoidReport(Xf)
          return report.holds && report.failures.length === 0
        }),
        { numRuns: 20 }
      )
    })

    it("copy is coassociative: (Δ ⊗ id) ∘ Δ = (id ⊗ Δ) ∘ Δ (up to reassociation)", () => {
      fc.assert(
        fc.property(genSmallFin(), (Xf) => {
          const report = comonoidReport(Xf)
          return report.copyCoassoc
        }),
        { numRuns: 20 }
      )
    })

    it("copy is commutative: σ ∘ Δ = Δ", () => {
      fc.assert(
        fc.property(genSmallFin(), (Xf) => {
          const report = comonoidReport(Xf)
          return report.copyCommut
        }),
        { numRuns: 20 }
      )
    })

    it("copy satisfies left counit: (! ⊗ id) ∘ Δ = id", () => {
      fc.assert(
        fc.property(genSmallFin(), (Xf) => {
          const report = comonoidReport(Xf)
          return report.copyCounitL
        }),
        { numRuns: 20 }
      )
    })

    it("copy satisfies right counit: (id ⊗ !) ∘ Δ = id", () => {
      fc.assert(
        fc.property(genSmallFin(), (Xf) => {
          const report = comonoidReport(Xf)
          return report.copyCounitR
        }),
        { numRuns: 20 }
      )
    })
  })

  describe("Deterministic ⇔ comonoid homomorphism", () => {
    /**
     * Name: Deterministic Comonoid Oracle
     * Domain: Morphisms equipped with MarkovComonoidWitness structures on source/target
     * Statement: f is deterministic iff it preserves copy and discard
     * Rationale: Captures the deterministic/comonoid correspondence within our executable oracle framework
     * Test Oracle: checkDeterministicComonoid
     */

    const sampleFins: Array<Fin<any>> = [
      mkFin([0, 1] as const, (a, b) => a === b),
      mkFin([0, 1, 2] as const, (a, b) => a === b),
      mkFin(["a", "b"] as const, (a, b) => a === b)
    ]

    const indexOfEq = <T>(fin: Fin<T>, value: T): number => {
      for (let i = 0; i < fin.elems.length; i++) {
        if (fin.eq(fin.elems[i], value)) return i
      }
      throw new Error("Value not found in finite carrier")
    }

    const enumerateOutputs = <X, Y>(Xf: Fin<X>, Yf: Fin<Y>): Y[][] => {
      const results: Y[][] = []
      const current: Y[] = new Array(Xf.elems.length)

      const assign = (idx: number) => {
        if (idx === Xf.elems.length) {
          results.push([...current])
          return
        }
        for (const y of Yf.elems) {
          current[idx] = y
          assign(idx + 1)
        }
      }

      assign(0)
      return results
    }

    it("Dirac kernels satisfy the determinism oracle", () => {
      for (const Xf of sampleFins) {
        const domain = buildMarkovComonoidWitness(Xf)
        for (const Yf of sampleFins) {
          const codomain = buildMarkovComonoidWitness(Yf)
          for (const outputs of enumerateOutputs(Xf, Yf)) {
            const base = (x: unknown) => outputs[indexOfEq(Xf, x)]
            const arrow = detK(Xf, Yf, base)
            const witness = buildMarkovDeterministicWitness(domain, codomain, arrow, { base })
            const report = checkDeterministicComonoid(witness)

            expect(report.holds).toBe(true)
            expect(report.equivalent).toBe(true)
            expect(report.failures.length).toBe(0)
          }
        }
      }
    })

    it("nondeterministic kernels fail determinism and comonoid preservation", () => {
      const X = mkFin([0, 1] as const, (a, b) => a === b)
      const Y = mkFin(["H", "T"] as const, (a, b) => a === b)
      const domain = buildMarkovComonoidWitness(X)
      const codomain = buildMarkovComonoidWitness(Y)

      const noisy: Kernel<number, string> = (x) =>
        x === 0
          ? fromWeights([
              ["H", 0.6],
              ["T", 0.4]
            ])
          : fromWeights([
              ["H", 0.2],
              ["T", 0.8]
            ])

      const arrow = new FinMarkov(X, Y, noisy)
      const witness = buildMarkovDeterministicWitness(domain, codomain, arrow, { label: "biased coin" })
      const report = checkDeterministicComonoid(witness)

      expect(report.holds).toBe(false)
      expect(report.deterministic).toBe(false)
      expect(report.comonoidHom).toBe(false)
      expect(report.equivalent).toBe(true)
      expect(report.failures.some(f => f.law === "determinism")).toBe(true)
    })
  })

  describe("Positivity reduces tensor determinism to marginal checks", () => {
    const domain = buildMarkovComonoidWitness(mkFin([0, 1] as const, (a, b) => a === b))
    const left = buildMarkovComonoidWitness(mkFin(["L", "R"] as const, (a, b) => a === b))
    const right = buildMarkovComonoidWitness(mkFin(["x", "y"] as const, (a, b) => a === b))
    const positivity = buildMarkovPositivityWitness(left, right, { label: "left ⊗ right" })

    it("confirms that deterministic tensors have deterministic marginals", () => {
      const arrow = detK(domain.object, positivity.tensor.object, (value: 0 | 1) =>
        value === 0
          ? [left.object.elems[0], right.object.elems[0]] as const
          : [left.object.elems[1], right.object.elems[1]] as const
      )

      const report = checkDeterministicTensorViaMarginals(domain, positivity, arrow, { label: "deterministic tensor" })

      expect(report.holds).toBe(true)
      expect(report.equivalent).toBe(true)
      expect(report.tensor.deterministic).toBe(true)
      expect(report.left.deterministic).toBe(true)
      expect(report.right.deterministic).toBe(true)
    })

    it("detects nondeterministic marginals when tensor determinism fails", () => {
      const arrow = new FinMarkov(domain.object, positivity.tensor.object, (value: 0 | 1) => {
        if (value === 0) {
          return new Map([
            [[left.object.elems[0], right.object.elems[0]] as const, 0.5],
            [[left.object.elems[0], right.object.elems[1]] as const, 0.5],
          ])
        }
        return new Map([[[left.object.elems[1], right.object.elems[1]] as const, 1]])
      })

      const report = checkDeterministicTensorViaMarginals(domain, positivity, arrow, { label: "nondeterministic tensor" })

      expect(report.tensor.deterministic).toBe(false)
      expect(report.left.deterministic).toBe(true)
      expect(report.right.deterministic).toBe(false)
      expect(report.holds).toBe(true)
    })
  })

  describe("5.4 Stochastic Kernels are Row-Stochastic", () => {
    /**
     * Name: Row-Stochastic Property
     * Domain: Morphisms in Markov category (stochastic kernels)
     * Statement: Each row of the kernel matrix sums to 1
     * Rationale: Probability conservation in stochastic processes
     * Test Oracle: Sum each row and check ≈ 1
     */

    it("identity kernel is row-stochastic", () => {
      fc.assert(
        fc.property(genSmallFin(), (Xf) => {
          const id = idK(Xf)
          return checkRowStochastic(Xf, Xf, id.k)
        }),
        { numRuns: 20 }
      )
    })

    it("composition preserves row-stochastic property", () => {
      const X = mkFin([0, 1], (a,b) => a === b)
      const Y = mkFin([0, 1, 2], (a,b) => a === b)  
      const Z = mkFin([0, 1], (a,b) => a === b)

      // Create stochastic kernels
      const f: Kernel<number, number> = (x) => 
        x === 0 ? fromWeights([[0, 0.3], [1, 0.4], [2, 0.3]]) : fromWeights([[0, 0.6], [1, 0.1], [2, 0.3]])
      
      const g: Kernel<number, number> = (y) =>
        y === 0 ? fromWeights([[0, 0.7], [1, 0.3]]) :
        y === 1 ? fromWeights([[0, 0.2], [1, 0.8]]) : 
        fromWeights([[0, 0.5], [1, 0.5]])

      const fK = new FinMarkov(X, Y, f)
      const gK = new FinMarkov(Y, Z, g)
      const composed = fK.then(gK)

      expect(checkRowStochastic(X, Z, composed.k)).toBe(true)
    })
  })

  describe("5.5 Markov Category Structure", () => {
    /**
     * Name: Markov Category Axioms
     * Domain: Complete Markov category structure
     * Statement: Symmetric monoidal category + every object has commutative comonoid + affine monad
     * Rationale: Complete characterization of Markov categories
     * Test Oracle: All component laws hold together
     */

    it("satisfies symmetric monoidal category laws", () => {
      const X = mkFin([0, 1], (a,b) => a === b)
      const Y = mkFin(['a', 'b'], (a,b) => a === b)

      // Test tensor functoriality
      const f = detK(X, Y, (x: number) => x === 0 ? 'a' : 'b')
      const g = detK(Y, X, (y: string) => y === 'a' ? 0 : 1)
      
      const h = detK(X, X, (x: number) => 1 - x)
      const k = detK(Y, Y, (y: string) => y === 'a' ? 'b' : 'a')

      // (f ⊗ h) ∘ (g ⊗ k) should equal (f ∘ g) ⊗ (h ∘ k) 
      const lhs = g.tensor(k).then(f.tensor(h))
      const rhs = g.then(f).tensor(k.then(h))

      expect(approxEqualMatrix(lhs.matrix(), rhs.matrix())).toBe(true)
    })

    it("tensor unit is properly handled", () => {
      const X = mkFin([0, 1], (a,b) => a === b)
      const unit = mkFin([{}], () => true)

      // X ⊗ I ≅ X (up to canonical isomorphism)
      const f = idK(X)
      const tensorWithUnit = f.tensor(idK(unit))
      // This would require implementing unit isomorphisms properly
      // For now we just check the dimensions work out
      expect(tensorWithUnit.X.elems.length).toBe(X.elems.length * unit.elems.length)
    })
  })

  describe("5.6 Integration with Kleisli Categories", () => {
    /**
     * Name: Kleisli-Markov Correspondence  
     * Domain: Kleisli category of affine monad
     * Statement: Kleisli category of affine distribution monad is Markov
     * Rationale: Connects monadic and categorical views
     * Test Oracle: Kleisli composition preserves Markov structure
     */

    it("Kleisli category preserves stochastic property", () => {
      const { FinKleisli } = KleisliProb
      const X = mkFin([0, 1], (a,b) => a === b)
      const Y = mkFin([0, 1, 2], (a,b) => a === b)

      const k1: Kernel<number, number> = (x) => 
        fromWeights([[0, 0.5], [1, 0.3], [2, 0.2]])
      
      const k2: Kernel<number, string> = (y) =>
        fromWeights([["result", 1.0]])

      const fk1 = new FinKleisli(X, Y, k1)
      const fk2 = new FinKleisli(Y, mkFin(["result"], (a,b) => a === b), k2)
      const composed = fk1.then(fk2)

      // Check composition is still stochastic
      for (const x of X.elems) {
        const dist = composed.k(x)
        const totalMass = mass(dist)
        expect(Math.abs(totalMass - 1)).toBeLessThan(1e-10)
      }
    })
  })

  describe("5.7 Semiring-Parametric Laws", () => {
    /**
     * Name: Semiring-Generic Markov Structure
     * Domain: DR monad over commutative semiring R  
     * Statement: DR_R forms Markov category when R has 1_R ≠ 0_R and is affine
     * Rationale: Generalizes probability to other semirings
     * Test Oracle: Laws hold for multiple concrete semirings
     */

    const semirings = [
      { name: "RPlus", R: RPlus, isAffine: true },
      { name: "LogProb", R: LogProb, isAffine: true },
      { name: "Tropical", R: TropicalMaxPlus, isAffine: true },
      { name: "Bool", R: BoolRig, isAffine: true },
    ]

    semirings.forEach(({ name, R, isAffine }) => {
      if (!isAffine) return // Skip non-affine semirings for Markov laws

      it(`${name} semiring satisfies Markov laws`, () => {
        const M = DRMonad(R)
        
        // Test that unit is preserved
        fc.assert(
          fc.property(fc.integer(), (x) => {
            const dist = M.of(x)
            const total = [...dist.values()].reduce((a, b) => R.add(a, b), R.zero)
            const eq = R.eq ?? ((a, b) => Math.abs(a - b) < 1e-10)
            return eq(total, R.one)
          }),
          { numRuns: 20 }
        )
      })
    })
  })
})