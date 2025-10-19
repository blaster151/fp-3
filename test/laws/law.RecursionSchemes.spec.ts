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
  lit, add, mul, addN, mapExprF,
  Ok
} from '../../allTS'
import type { Expr, ExprF } from '../../allTS'
import { hyloArray, paraArray, cataJson, anaJson, hyloJson } from '../../array-recursion'
import type { JsonF } from '../../array-recursion'
import { None, Some } from '../../option'

describe("LAW: Recursion Scheme laws", () => {
  // Common generators
  const genSmallInt = (): fc.Arbitrary<number> => fc.constantFrom(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)

  // Expression equality
  const eqExpr = (a: Expr, b: Expr): boolean => {
    // Simple structural equality - in a real implementation this would be more sophisticated
    const prettyA = cataExpr(Alg_Expr_prettyF)(a)
    const prettyB = cataExpr(Alg_Expr_prettyF)(b)
    return prettyA === prettyB
  }

  // Expression generator (small expressions for testing)
  const genExpr = (): fc.Arbitrary<Expr> => {
    const samples: ReadonlyArray<Expr> = [
      lit(1),
      lit(2),
      add(lit(1), lit(2)),
      mul(lit(2), lit(3)),
      add(lit(1), mul(lit(2), lit(3))),
      mul(add(lit(1), lit(2)), lit(3))
    ]
    return fc.constantFrom(...samples)
  }

  describe("Catamorphism laws", () => {
    it("Cata identity: cata(id) = id", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const idAlg = (f: ExprF<Expr>): Expr => ({ un: f } as Expr)
          const left = cataExpr(idAlg)(expr)
          const right = expr
          return eqExpr(left, right)
        })
      )
    })

    it("Algebra morphism: doubling after evaluation matches doubled algebra", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const double = (n: number): number => n * 2
          const doubledAlg = (fb: ExprF<number>): number => {
            switch (fb._tag) {
              case 'Lit': return double(fb.value)
              case 'Add': return fb.left + fb.right
              case 'Mul': return (fb.left * fb.right) / 2
              default: throw new Error(`Unsupported tag ${fb._tag} in doubledAlg`)
            }
          }

          const left = cataExpr(doubledAlg)(expr)
          const right = double(cataExpr(Alg_Expr_evalF)(expr))
          return left === right
        })
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
        })
      )
    })

    it("Hylo post-processing can be fused into the algebra", () => {
      fc.assert(
        fc.property(genSmallInt(), (n) => {
          const f = (x: number) => x * 2
          const alg = (fb: ExprF<number>): number => {
            switch (fb._tag) {
              case 'Lit': return fb.value
              case 'Add': return fb.left + fb.right
              case 'Mul': return fb.left * fb.right
              default: throw new Error(`Unsupported tag ${fb._tag} in alg`)
            }
          }

          const left = hyloExpr(
            coalgExpr_sum1toN,
            (fb: ExprF<number>) => f(alg(fb))
          )({ tag: 'Sum', n })

          const right = f(hyloExpr(coalgExpr_sum1toN, alg)({ tag: 'Sum', n }))

          return left === right
        })
      )
    })
  })

  describe("Paramorphism laws", () => {
    it("Para identity: para(id) = id", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const idPara = (fb: ExprF<readonly [Expr, Expr]>): Expr => ({
            un: mapExprF((value: readonly [Expr, Expr]) => value[0])(fb)
          } as Expr)
          const left = paraExpr(idPara)(expr)
          const right = expr
          return eqExpr(left, right)
        })
      )
    })

    it("Para evaluation matches cata evaluation while rebuilding the tree", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const paraEval = paraExpr((fb: ExprF<readonly [Expr, { readonly original: Expr; readonly value: number }]>) => {
            const pickOriginal = (
              [_expr, info]: readonly [Expr, { readonly original: Expr; readonly value: number }]
            ): Expr => info.original
            const pickValue = (
              [_expr, info]: readonly [Expr, { readonly original: Expr; readonly value: number }]
            ): number => info.value
            const rebuilt = mapExprF(pickOriginal)(fb)
            const evaluatedInputs = mapExprF(pickValue)(fb)
            return {
              original: ({ un: rebuilt } as Expr),
              value: Alg_Expr_evalF(evaluatedInputs)
            }
          })

          const result = paraEval(expr)
          const rebuilt = result.original
          const evaluated = result.value
          return eqExpr(rebuilt, expr) && evaluated === cataExpr(Alg_Expr_evalF)(expr)
        })
      )
    })
  })

  describe("Paramorphism stack safety", () => {
    const paraEval = paraExpr((fb: ExprF<readonly [Expr, number]>) => {
      const evaluated = mapExprF(([, value]: readonly [Expr, number]) => value)(fb)
      return Alg_Expr_evalF(evaluated)
    })

    it("handles deeply nested right-associated addition", () => {
      const depth = 5000
      let expr = lit(0)
      for (let i = 0; i < depth; i += 1) {
        expr = add(lit(1), expr)
      }

      const result = paraEval(expr)
      expect(result).toBe(cataExpr(Alg_Expr_evalF)(expr))
    })

    it("handles wide AddN nodes with thousands of children", () => {
      const width = 4000
      const expr = addN(Array.from({ length: width }, () => lit(1)))

      const result = paraEval(expr)
      expect(result).toBe(cataExpr(Alg_Expr_evalF)(expr))
    })
  })

  describe("Apomorphism laws", () => {
    it("Apo identity: apo(id) = id", () => {
      fc.assert(
        fc.property(genExpr(), (expr) => {
          const idApo = (e: Expr) => {
            const node = e.un
            switch (node._tag) {
              case 'Lit': return Ok([lit(node.value), e] as const)
              case 'Add': return Ok([add(node.left, node.right), e] as const)
              case 'Mul': return Ok([mul(node.left, node.right), e] as const)
              default: return Ok([e, e] as const)
            }
          }
          const left = apoExpr(idApo)(expr)
          const right = [expr]
          return left.length === 1 && eqExpr(left[0]!, right[0]!)
        })
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
      })
    )
    })

    it("Fused power evaluation: evalPowMul_FUSED(depth, leaf) = leaf^(2^depth)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(0, 1, 2, 3, 4, 5), // Keep depth small
        fc.constantFrom(1, 2, 3, 4, 5), // Keep leaf small
        (depth, leaf) => {
          const left = evalPowMul_FUSED(depth, leaf)
          const right = Math.pow(leaf, Math.pow(2, depth))
            return left === right
          }
        )
      )
    })

    it("Fused pretty and eval: showAndEvalPowMul_FUSED returns consistent results", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(0, 1, 2, 3), // Keep depth small
        fc.constantFrom(1, 2, 3), // Keep leaf small
        (depth, leaf) => {
          const [pretty, value] = showAndEvalPowMul_FUSED(depth, leaf)
          const expectedValue = Math.pow(leaf, Math.pow(2, depth))
            return value === expectedValue && pretty.length > 0
          }
        )
      )
    })

    it("Fused constant folding: buildAndFoldSum_FUSED simplifies expressions", () => {
    fc.assert(
      fc.property(genSmallInt(), (n) => {
        const folded = buildAndFoldSum_FUSED(n)
        const expected = evalSum1toN_FUSED(n)
        const actual = cataExpr(Alg_Expr_evalF)(folded)
        return actual === expected
      })
    )
    })
  })

  describe("Stack safety for array and JSON recursion schemes", () => {
    const smallBoundedInt = fc.constantFrom(-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5)
    const largeArrayArb = fc.array(smallBoundedInt, {
      minLength: 1024,
      maxLength: 2048
    })

    it("hyloArray sums large arrays without overflowing the stack", () => {
      const hyloSum = hyloArray(
        (xs: ReadonlyArray<number>) =>
          xs.length === 0
            ? None
            : Some([xs[0]!, xs.slice(1)] as const),
        (head: number, tailSum: number) => head + tailSum,
        0
      )

      fc.assert(
        fc.property(largeArrayArb, (values) => {
          const expected = values.reduce((acc, n) => acc + n, 0)
          const actual = hyloSum(values)
          return actual === expected
        }),
      )
    })

    it("paraArray computes length for large arrays", () => {
      const paraLength = paraArray<number, number>(0, (_head, _tail, foldedTail) => foldedTail + 1)

      fc.assert(
        fc.property(largeArrayArb, (values) => paraLength(values) === values.length),
      )
    })

    it("Recursion factories stay stack safe on large JSON trees", () => {
      type SeqState =
        | { readonly tag: 'Seq'; readonly rest: ReadonlyArray<number> }
        | { readonly tag: 'Value'; readonly value: number }

      const coalg = (state: SeqState): JsonF<SeqState> => {
        if (state.tag === 'Value') {
          return { _tag: 'JNum', value: state.value }
        }
        if (state.rest.length === 0) {
          return { _tag: 'JNull' }
        }
        const [head, ...tail] = state.rest
        if (head === undefined) {
          throw new Error('Recursion scheme coalg: expected head value for non-empty rest')
        }
        return {
          _tag: 'JArr',
          items: [
            { tag: 'Value', value: head },
            { tag: 'Seq', rest: tail }
          ]
        }
      }

      const sumAlg = (fb: JsonF<number>): number => {
        switch (fb._tag) {
          case 'JNull':
          case 'JUndefined':
            return 0
          case 'JBool':
            return 0
          case 'JNum':
            return fb.value
          case 'JDec':
          case 'JStr':
          case 'JBinary':
          case 'JRegex':
          case 'JDate':
            return 0
          case 'JArr':
          case 'JSet':
            return fb.items.reduce((acc, n) => acc + n, 0)
          case 'JObj':
            return fb.entries.reduce((acc, [, value]) => acc + value, 0)
        }
      }

      fc.assert(
        fc.property(largeArrayArb, (values) => {
          const start: SeqState = { tag: 'Seq', rest: values }
          const tree = anaJson(coalg)(start)
          const cataSum = cataJson(sumAlg)(tree)
          const hyloSum = hyloJson(coalg, sumAlg)(start)
          const expected = values.reduce((acc, n) => acc + n, 0)
          return cataSum === expected && hyloSum === expected
        }),
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
        })
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
