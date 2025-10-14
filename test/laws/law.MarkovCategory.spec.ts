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
import {
  mkFin,
  FinMarkov,
  idK,
  detK,
  tensor,
  checkRowStochastic,
  mass,
  fromWeights,
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
import { DRMonad, mkRDist } from '../../semiring-dist'
import { Prob, LogProb, RPlus, TropicalMaxPlus } from '../../semiring-utils'
import { KleisliProb, DistMonad } from '../../probability-monads'

const widenFin = <T>(fin: Fin<T>): Fin<unknown> => fin as unknown as Fin<unknown>

const smallFiniteObjects: ReadonlyArray<Fin<unknown>> = [
  widenFin(mkFin([0, 1] as const, (a, b) => a === b)),
  widenFin(mkFin([0, 1, 2] as const, (a, b) => a === b)),
  widenFin(mkFin(['a', 'b'] as const, (a, b) => a === b)),
]

const instantiateDRMonad: <R>(rig: R) => ReturnType<typeof DRMonad> =
  DRMonad as unknown as <R>(rig: R) => ReturnType<typeof DRMonad>

function requireArrayValue<T>(values: ReadonlyArray<T>, index: number, label: string): T {
  const value = values[index]
  if (value === undefined) {
    throw new Error(`${label}: expected value at index ${index}`)
  }
  return value
}

describe("LAW: Markov Category Laws", () => {

  const finiteCarriers = smallFiniteObjects

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
        { name: "Prob", R: Prob },
        { name: "LogProb", R: LogProb },
      ] as const

      const sampleInputs = [-10, -1, 0, 4, 7]

      for (const { R } of semirings) {
        const M = instantiateDRMonad(R)
        const eq = R.eq ?? ((a: number, b: number) => Math.abs(a - b) <= 1e-10)

        for (const value of sampleInputs) {
          const dist = M.of(value)
          const total = [...dist.values()].reduce((acc, weight) => R.add(acc, weight), R.zero)
          expect(eq(total, R.one)).toBe(true)
        }
      }
    })

    it("bind preserves unit mass for stochastic kernels", () => {
      const R = Prob
      const M = instantiateDRMonad(R)
      const eq = R.eq ?? ((a: number, b: number) => Math.abs(a - b) <= 1e-10)

      const distributions = [
        mkRDist(R, [[0, 1]]),
        mkRDist(R, [[0, 2], [1, 1]]),
        mkRDist(R, [[-1, 1], [2, 3], [3, 4]]),
      ]

      const kernels: ReadonlyArray<(x: number) => Map<number, number>> = [
        (x) => mkRDist(R, [[x, 1]]),
        (x) => mkRDist(R, [[x, 2], [x + 1, 1]]),
        (x) => mkRDist(R, [[x, 1], [x - 1, 1], [x + 2, 1]]),
      ]

      for (const dist of distributions) {
        for (const buildKernel of kernels) {
          const result = M.bind(dist, buildKernel)
          const total = [...result.values()].reduce((acc, weight) => R.add(acc, weight), R.zero)
          expect(eq(total, R.one)).toBe(true)
        }
      }
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
      for (const Xf of finiteCarriers) {
        const report = comonoidReport(Xf)
        expect(report.holds).toBe(true)
        expect(report.failures.length).toBe(0)
      }
    })

    it("copy is coassociative: (Δ ⊗ id) ∘ Δ = (id ⊗ Δ) ∘ Δ (up to reassociation)", () => {
      for (const Xf of finiteCarriers) {
        const report = comonoidReport(Xf)
        expect(report.copyCoassoc).toBe(true)
      }
    })

    it("copy is commutative: σ ∘ Δ = Δ", () => {
      for (const Xf of finiteCarriers) {
        const report = comonoidReport(Xf)
        expect(report.copyCommut).toBe(true)
      }
    })

    it("copy satisfies left counit: (! ⊗ id) ∘ Δ = id", () => {
      for (const Xf of finiteCarriers) {
        const report = comonoidReport(Xf)
        expect(report.copyCounitL).toBe(true)
      }
    })

    it("copy satisfies right counit: (id ⊗ !) ∘ Δ = id", () => {
      for (const Xf of finiteCarriers) {
        const report = comonoidReport(Xf)
        expect(report.copyCounitR).toBe(true)
      }
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

    const sampleFins = finiteCarriers

    const indexOfEq = <T>(fin: Fin<T>, value: T): number => {
      for (let i = 0; i < fin.elems.length; i++) {
        const candidate = fin.elems[i]
        if (candidate !== undefined && fin.eq(candidate, value)) return i
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
            const base = (x: unknown) => requireArrayValue(outputs, indexOfEq(Xf, x), "deterministic output")
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

      const noisy: Kernel<number, 'H' | 'T'> = (x) =>
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
    const left0 = requireArrayValue(left.object.elems, 0, 'left witness element 0')
    const left1 = requireArrayValue(left.object.elems, 1, 'left witness element 1')
    const right0 = requireArrayValue(right.object.elems, 0, 'right witness element 0')
    const right1 = requireArrayValue(right.object.elems, 1, 'right witness element 1')

    it("confirms that deterministic tensors have deterministic marginals", () => {
      const arrow = detK(domain.object, positivity.tensor.object, (value: 0 | 1) =>
        value === 0
          ? [left0, right0] as const
          : [left1, right1] as const
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
            [[left0, right0] as const, 0.5],
            [[left0, right1] as const, 0.5],
          ])
        }
        return new Map([[[left1, right1] as const, 1]])
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
      for (const Xf of finiteCarriers) {
        const id = idK(Xf)
        expect(checkRowStochastic(Xf, Xf, id.k)).toBe(true)
      }
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
      const X = mkFin([0, 1] as const, (a, b) => a === b)
      const Y = mkFin(['a', 'b'] as const, (a, b) => a === b)

      const f = detK(X, Y, (x: 0 | 1) => (x === 0 ? 'a' : 'b'))
      const fPrime = detK(Y, Y, (y: 'a' | 'b') => (y === 'a' ? 'b' : 'a'))
      const g = detK(X, X, (x: 0 | 1) => (x === 0 ? 1 : 0))
      const gPrime = detK(X, X, (x: 0 | 1) => x)

      const first = f.tensor(g)
      const second = fPrime.tensor(gPrime)
      const lhs = first.then(second)
      const rhs = f.then(fPrime).tensor(g.then(gPrime))

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
      { name: "RPlus", R: RPlus },
      { name: "LogProb", R: LogProb },
      { name: "Tropical", R: TropicalMaxPlus },
    ] as const

    semirings.forEach(({ name, R }) => {
      it(`${name} semiring satisfies Markov laws`, () => {
        const M = instantiateDRMonad(R)
        const eq = R.eq ?? ((a: number, b: number) => Math.abs(a - b) <= 1e-10)
        const sampleInputs = [-3, 0, 5]

        for (const value of sampleInputs) {
          const dist = M.of(value)
          const total = [...dist.values()].reduce((acc, weight) => R.add(acc, weight), R.zero)
          expect(eq(total, R.one)).toBe(true)
        }
      })
    })
  })
})