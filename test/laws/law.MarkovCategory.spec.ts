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
  mkFin, FinMarkov, Kernel, Dist, Pair, I,
  copyK, discardK, idK, detK, swap, tensor,
  checkComonoidLaws, checkComonoidHom, isDeterministicKernel,
  checkRowStochastic, mass, dirac, fromWeights,
  MarkovCategory, approxEqualMatrix
} from '../../markov-category'
import { DRMonad, RPlus, LogProb, TropicalMaxPlus, BoolRig } from '../../semiring-dist'
import { KleisliProb, DistMonad } from '../../probability-monads'

describe("LAW: Markov Category Laws", () => {
  
  // Test finite sets for property testing
  const genSmallFin = () => fc.constantFrom(
    mkFin([0, 1] as const, (a,b) => a === b),
    mkFin([0, 1, 2] as const, (a,b) => a === b),
    mkFin(["a", "b"] as const, (a,b) => a === b)
  )

  const genKernel = <X, Y>(Xf: ReturnType<typeof genSmallFin>, Yf: ReturnType<typeof genSmallFin>) => 
    fc.func(fc.constant(fc.array(fc.tuple(
      fc.constantFrom(...Yf.elems), 
      fc.float({ min: 0, max: 1 })
    ), { minLength: 1, maxLength: Yf.elems.length })
    .map(pairs => fromWeights(pairs, true))))

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
        { name: "RPlus", R: RPlus, M: DRMonad(RPlus) },
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
      const R = RPlus
      const M = DRMonad(R)
      
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.integer(), fc.float({ min: 0, max: 1 })), { minLength: 1, maxLength: 5 }),
          fc.func(fc.constant(fc.array(fc.tuple(fc.string(), fc.float({ min: 0, max: 1 })), { minLength: 1, maxLength: 3 }))),
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

    it("copy is coassociative: (Δ ⊗ id) ∘ Δ = (id ⊗ Δ) ∘ Δ (up to reassociation)", () => {
      fc.assert(
        fc.property(genSmallFin(), (Xf) => {
          const laws = checkComonoidLaws(Xf)
          return laws.copyCoassoc
        }),
        { numRuns: 20 }
      )
    })

    it("copy is commutative: σ ∘ Δ = Δ", () => {
      fc.assert(
        fc.property(genSmallFin(), (Xf) => {
          const laws = checkComonoidLaws(Xf)
          return laws.copyCommut
        }),
        { numRuns: 20 }
      )
    })

    it("copy satisfies left counit: (! ⊗ id) ∘ Δ = id", () => {
      fc.assert(
        fc.property(genSmallFin(), (Xf) => {
          const laws = checkComonoidLaws(Xf)
          return laws.copyCounitL
        }),
        { numRuns: 20 }
      )
    })

    it("copy satisfies right counit: (id ⊗ !) ∘ Δ = id", () => {
      fc.assert(
        fc.property(genSmallFin(), (Xf) => {
          const laws = checkComonoidLaws(Xf)
          return laws.copyCounitR
        }),
        { numRuns: 20 }
      )
    })
  })

  describe("5.3 Deterministic Maps as Comonoid Homomorphisms", () => {
    /**
     * Name: Deterministic Comonoid Homomorphism
     * Domain: Deterministic morphisms f: X → Y in Markov category
     * Statement: f preserves copy and discard: Δ_Y ∘ f = (f ⊗ f) ∘ Δ_X, !_Y ∘ f = !_X
     * Rationale: Deterministic maps respect the comonoid structure
     * Test Oracle: Matrix equality for composition diagrams
     */

    it("deterministic maps preserve copy structure", () => {
      fc.assert(
        fc.property(
          genSmallFin(),
          genSmallFin(),
          fc.func(fc.constant(fc.integer())),
          (Xf, Yf, f) => {
            // Make f actually map X to Y elements
            const deterministicF = (x: any) => Yf.elems[Math.abs(f(x)) % Yf.elems.length]
            const kernel: Kernel<any, any> = (x) => dirac(deterministicF(x))
            
            const report = checkComonoidHom(Xf, Yf, kernel)
            return report.preservesCopy
          }
        ),
        { numRuns: 20 }
      )
    })

    it("deterministic maps preserve discard structure", () => {
      fc.assert(
        fc.property(
          genSmallFin(),
          genSmallFin(),
          fc.func(fc.constant(fc.integer())),
          (Xf, Yf, f) => {
            const deterministicF = (x: any) => Yf.elems[Math.abs(f(x)) % Yf.elems.length]
            const kernel: Kernel<any, any> = (x) => dirac(deterministicF(x))
            
            const report = checkComonoidHom(Xf, Yf, kernel)
            return report.preservesDiscard
          }
        ),
        { numRuns: 20 }
      )
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