/**
 * LAW: Recursion Scheme laws
 * 
 * Mathematical forms:
 * - CataOverAnaIso: cata(alg) ∘ ana(coalg) = hylo(alg, coalg)
 * - CataAssociativity: cata(alg ∘ mapF(f)) = cata(alg) ∘ cata(f)
 * - CataFusion: cata(alg ∘ f) = cata(alg) ∘ cata(f)
 * 
 * These laws ensure that recursion schemes behave correctly and can be optimized.
 * We start with catamorphism over tiny algebras with closed-form denotations.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  cataExpr, anaExpr, hyloExpr, paraExpr, apoExpr,
  Alg_Expr_evalF, Alg_Expr_prettyF, productExprAlg2,
  coalgExpr_sum1toN, coalgExpr_powMul,
  evalSum1toN_FUSED, showSum1toN_FUSED,
  evalPowMul_FUSED, showPowMul_FUSED,
  showAndEvalPowMul_FUSED, buildAndFoldSum_FUSED,
  Expr, ExprF, lit, add, mul, mapExprF
} from '../../allTS'
import { commonGenerators, commonEquality } from './law-helpers'

describe("LAW: Recursion Scheme laws", () => {
  // Common generators
  const genInt = commonGenerators.integer
  const genSmallInt = () => fc.integer({ min: 1, max: 10 }) // Keep expressions small for testing

  // Expression equality
  const eqExpr = (a: Expr, b: Expr): boolean => {
    // Simple structural equality - in a real implementation this would be more sophisticated
    const prettyA = cataExpr(Alg_Expr_prettyF)(a)
    const prettyB = cataExpr(Alg_Expr_prettyF)(b)
    return prettyA === prettyB
  }

  // Expression generator (small expressions for testing)
  const genExpr = (): fc.Arbitrary<Expr> => {
    return fc.oneof(
      genSmallInt().map(lit),
      fc.record({
        left: genSmallInt().map(lit),
        right: genSmallInt().map(lit)
      }).map(({ left, right }) => add(left, right)),
      fc.record({
        left: genSmallInt().map(lit),
        right: genSmallInt().map(lit)
      }).map(({ left, right }) => mul(left, right))
    )
  }

  describe("Catamorphism laws", () => {
    it("Cata identity: cata(id) = id", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const idAlg = (f: ExprF<Expr>) => {
            switch (f._tag) {
              case 'Lit': return lit(f.value)
              case 'Add': return add(f.left, f.right)
              case 'Mul': return mul(f.left, f.right)
            }
          }
          const left = cataExpr(idAlg)(expr)
          const right = expr
          return eqExpr(left, right)
        }),
        { numRuns: 100 }
      )
    })

    it("Cata composition: cata(alg ∘ mapF(f)) = cata(alg) ∘ cata(f)", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const f = (e: Expr) => cataExpr(Alg_Expr_evalF)(e)
          const alg = (fb: ExprF<number>) => {
            switch (fb._tag) {
              case 'Lit': return fb.value * 2
              case 'Add': return fb.left + fb.right + 1
              case 'Mul': return fb.left * fb.right * 2
            }
          }
          
          const left = cataExpr((fb: ExprF<Expr>) => alg(mapExprF(f)(fb)))(expr)
          const right = alg(cataExpr(Alg_Expr_evalF)(expr))
          return left === right
        }),
        { numRuns: 100 }
      )
    })
  })

  describe("Hylomorphism laws", () => {
    it("CataOverAnaIso: cata(alg) ∘ ana(coalg) = hylo(alg, coalg)", () => {
      fc.assert(
        fc.property(genSmallInt(), (n) => {
          // Test with sum 1..n
          const left = cataExpr(Alg_Expr_evalF)(anaExpr(coalgExpr_sum1toN)({ tag: 'Sum', n }))
          const right = evalSum1toN_FUSED(n)
          return left === right
        }),
        { numRuns: 50 }
      )
    })

    it("Hylo fusion: hylo(alg ∘ f, coalg) = hylo(alg, f ∘ coalg)", () => {
      fc.assert(
        fc.property(genSmallInt(), (n) => {
          const f = (x: number) => x * 2
          const alg = (fb: ExprF<number>) => {
            switch (fb._tag) {
              case 'Lit': return fb.value
              case 'Add': return fb.left + fb.right
              case 'Mul': return fb.left * fb.right
            }
          }
          
          const left = hyloExpr(
            coalgExpr_sum1toN,
            (fb: ExprF<number>) => f(alg(fb))
          )({ tag: 'Sum', n })
          
          const right = hyloExpr(
            (s: { tag: 'Sum', n: number }) => mapExprF(f)(coalgExpr_sum1toN(s)),
            alg
          )({ tag: 'Sum', n })
          
          return left === right
        }),
        { numRuns: 50 }
      )
    })
  })

  describe("Paramorphism laws", () => {
    it("Para identity: para(id) = id", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const idPara = (fb: ExprF<readonly [Expr, Expr]>) => {
            switch (fb._tag) {
              case 'Lit': return lit(fb.value)
              case 'Add': return add(fb.left[0], fb.right[0])
              case 'Mul': return mul(fb.left[0], fb.right[0])
            }
          }
          const left = paraExpr(idPara)(expr)
          const right = expr
          return eqExpr(left, right)
        }),
        { numRuns: 100 }
      )
    })

    it("Para composition: para(alg ∘ mapF(f)) = para(alg) ∘ para(f)", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const f = (e: Expr) => cataExpr(Alg_Expr_evalF)(e)
          const alg = (fb: ExprF<readonly [number, Expr]>) => {
            switch (fb._tag) {
              case 'Lit': return fb.value * 2
              case 'Add': return fb.left[0] + fb.right[0] + 1
              case 'Mul': return fb.left[0] * fb.right[0] * 2
            }
          }
          
          const left = paraExpr((fb: ExprF<readonly [Expr, Expr]>) => 
            alg(mapExprF(([val, orig]: readonly [Expr, Expr]) => [f(val), orig] as const)(fb))
          )(expr)
          
          const right = alg(paraExpr((fb: ExprF<readonly [Expr, Expr]>) => 
            [f(fb._tag === 'Lit' ? lit(fb.value) : 
               fb._tag === 'Add' ? add(fb.left[0], fb.right[0]) : 
               mul(fb.left[0], fb.right[0])), 
             fb._tag === 'Lit' ? lit(fb.value) : 
             fb._tag === 'Add' ? add(fb.left[0], fb.right[0]) : 
             mul(fb.left[0], fb.right[0])] as const
          )(expr))
          
          return left === right
        }),
        { numRuns: 50 }
      )
    })
  })

  describe("Apomorphism laws", () => {
    it("Apo identity: apo(id) = id", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const idApo = (e: Expr) => {
            switch (e.un._tag) {
              case 'Lit': return Ok([lit(e.un.value), e])
              case 'Add': return Ok([add(e.un.left, e.un.right), e])
              case 'Mul': return Ok([mul(e.un.left, e.un.right), e])
            }
          }
          const left = apoExpr(idApo)(expr)
          const right = [expr]
          return left.length === 1 && eqExpr(left[0]!, right[0]!)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe("Fused pipeline laws", () => {
    it("Fused sum evaluation: evalSum1toN_FUSED(n) = sum 1..n", () => {
      fc.assert(
        fc.property(genSmallInt(), (n) => {
          const left = evalSum1toN_FUSED(n)
          const right = Array.from({ length: n }, (_, i) => i + 1).reduce((a, b) => a + b, 0)
          return left === right
        }),
        { numRuns: 50 }
      )
    })

    it("Fused power evaluation: evalPowMul_FUSED(depth, leaf) = leaf^(2^depth)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5 }), // Keep depth small
          fc.integer({ min: 1, max: 5 }), // Keep leaf small
          (depth, leaf) => {
            const left = evalPowMul_FUSED(depth, leaf)
            const right = Math.pow(leaf, Math.pow(2, depth))
            return left === right
          }
        ),
        { numRuns: 50 }
      )
    })

    it("Fused pretty and eval: showAndEvalPowMul_FUSED returns consistent results", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3 }), // Keep depth small
          fc.integer({ min: 1, max: 3 }), // Keep leaf small
          (depth, leaf) => {
            const [pretty, value] = showAndEvalPowMul_FUSED(depth, leaf)
            const expectedValue = Math.pow(leaf, Math.pow(2, depth))
            return value === expectedValue && pretty.length > 0
          }
        ),
        { numRuns: 50 }
      )
    })

    it("Fused constant folding: buildAndFoldSum_FUSED simplifies expressions", () => {
      fc.assert(
        fc.property(genSmallInt(), (n) => {
          const folded = buildAndFoldSum_FUSED(n)
          const expected = evalSum1toN_FUSED(n)
          const actual = cataExpr(Alg_Expr_evalF)(folded)
          return actual === expected
        }),
        { numRuns: 50 }
      )
    })
  })

  describe("Product algebra laws", () => {
    it("Product algebra: productExprAlg2(alg1, alg2) computes both results", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const [pretty, value] = cataExpr(productExprAlg2(Alg_Expr_prettyF, Alg_Expr_evalF))(expr)
          const expectedPretty = cataExpr(Alg_Expr_prettyF)(expr)
          const expectedValue = cataExpr(Alg_Expr_evalF)(expr)
          return pretty === expectedPretty && value === expectedValue
        }),
        { numRuns: 100 }
      )
    })
  })

  describe("Golden examples (smoke tests)", () => {
    it("Sum 1..5 = 15", () => {
      expect(evalSum1toN_FUSED(5)).toBe(15)
      expect(showSum1toN_FUSED(5)).toBe("(5 + (4 + (3 + (2 + 1))))")
    })

    it("Power tree depth 2, leaf 2 = 16", () => {
      expect(evalPowMul_FUSED(2, 2)).toBe(16)
      expect(showPowMul_FUSED(2, 2)).toBe("((2 * 2) * (2 * 2))")
    })

    it("Constant folding works", () => {
      const folded = buildAndFoldSum_FUSED(4)
      const value = cataExpr(Alg_Expr_evalF)(folded)
      expect(value).toBe(10)
    })
  })
})
