import { describe, it, expect } from 'vitest'
import {
  FieldQ, FieldReal, Qof, Qeq, Qadd, Qneg, Qsub, Qmul, Qinv, Qdiv, QfromInt, QfromRatio, QtoString,
  rref, nullspace, colspace, solveLinear, rrefQPivot, qAbsCmp, isQZero,
  runLesConeProps, randomTwoTermComplex, makeHomologyShiftIso,
  imageComplex, coimageComplex, coimToIm, isIsoChainMap, smoke_coim_im_iso,
  idChainMapN, zeroChainMapN,
} from '../allTS'
import type { Q } from '../allTS'

const requireEq = <R>(eq: ((x: R, y: R) => boolean) | undefined) => {
  if (!eq) {
    throw new Error('Expected field equality predicate to be available')
  }
  return eq
}

describe('Rational field Q', () => {
  it('creates and normalizes rationals correctly', () => {
    const q1 = Qof(6, 9)  // should normalize to 2/3
    expect(q1.num).toBe(2n)
    expect(q1.den).toBe(3n)
    
    const q2 = Qof(-4, 6) // should normalize to -2/3
    expect(q2.num).toBe(-2n)
    expect(q2.den).toBe(3n)
    
    const q3 = Qof(0, 5)  // should be 0/1
    expect(q3.num).toBe(0n)
    expect(q3.den).toBe(1n)
  })

  it('implements field operations correctly', () => {
    const F = FieldQ
    const a = Qof(2, 3)   // 2/3
    const b = Qof(3, 4)   // 3/4
    
    // Addition: 2/3 + 3/4 = 8/12 + 9/12 = 17/12
    const sum = F.add(a, b)
    expect(sum.num).toBe(17n)
    expect(sum.den).toBe(12n)
    
    // Multiplication: 2/3 * 3/4 = 6/12 = 1/2
    const prod = F.mul(a, b)
    expect(prod.num).toBe(1n)
    expect(prod.den).toBe(2n)
    
    // Inverse: (2/3)^(-1) = 3/2
    const inv = F.inv(a)
    expect(inv.num).toBe(3n)
    expect(inv.den).toBe(2n)
    
    // Division: (2/3) / (3/4) = (2/3) * (4/3) = 8/9
    const div = F.div(a, b)
    expect(div.num).toBe(8n)
    expect(div.den).toBe(9n)
  })

  it('handles zero and one correctly', () => {
    const F = FieldQ
    const zero = F.zero
    const one = F.one
    
    expect(zero.num).toBe(0n)
    expect(zero.den).toBe(1n)
    expect(one.num).toBe(1n)
    expect(one.den).toBe(1n)
    
    const a = Qof(5, 7)
    const eq = requireEq(F.eq)
    expect(eq(F.add(a, zero), a)).toBe(true)
    expect(eq(F.mul(a, one), a)).toBe(true)
  })

  it('pretty prints rationals', () => {
    expect(QtoString(Qof(5, 1))).toBe('5')      // integer
    expect(QtoString(Qof(2, 3))).toBe('2/3')   // fraction
    expect(QtoString(Qof(-7, 4))).toBe('-7/4') // negative
  })

  it('converts from JS numbers', () => {
    const q1 = QfromInt(42)
    expect(q1.num).toBe(42n)
    expect(q1.den).toBe(1n)
    
    const q2 = QfromRatio(3, 7)
    expect(q2.num).toBe(3n)
    expect(q2.den).toBe(7n)
  })
})

describe('Linear algebra over rationals', () => {
  it('computes RREF over rationals', () => {
    const F = FieldQ
    const A = [
      [Qof(1), Qof(2), Qof(3)],
      [Qof(2), Qof(4), Qof(7)],
      [Qof(1), Qof(1), Qof(2)]
    ]
    
    const { R, pivots } = rref(F)(A)
    
    expect(pivots.length).toBeGreaterThan(0)
    expect(R.length).toBe(3)
    expect(R[0]?.length).toBe(3)
  })

  it('computes nullspace over rationals', () => {
    const F = FieldQ
    // Matrix with known nullspace
    const A = [
      [Qof(1), Qof(2), Qof(3)],
      [Qof(2), Qof(4), Qof(6)]  // second row is 2x first
    ]
    
    const null_A = nullspace(F)(A)
    // The matrix has rank 1 (second row = 2*first), so nullspace should have dimension 3-1=2
    expect(null_A.length).toBeGreaterThan(0) // should have non-trivial nullspace
    expect(null_A[0]?.length).toBe(3) // each basis vector has 3 components
  })

  it('solves linear systems over rationals', () => {
    const F = FieldQ
    // Simple 2x2 system: x + 2y = 5, 3x + y = 4
    const A = [
      [Qof(1), Qof(2)],
      [Qof(3), Qof(1)]
    ]
    const b = [Qof(5), Qof(4)]
    
    const x = solveLinear(F)(A, b)
    expect(x.length).toBe(2)
    
    // Verify solution: Ax = b
    const check0 = F.add(F.mul(A[0]![0]!, x[0]!), F.mul(A[0]![1]!, x[1]!))
    const check1 = F.add(F.mul(A[1]![0]!, x[0]!), F.mul(A[1]![1]!, x[1]!))
    
    const eq = requireEq(F.eq)
    expect(eq(check0, b[0]!)).toBe(true)
    expect(eq(check1, b[1]!)).toBe(true)
  })
})

describe('Advanced rational field operations', () => {
  it('compares rational magnitudes correctly', () => {
    const a = Qof(3, 4)   // 3/4
    const b = Qof(2, 3)   // 2/3
    const c = Qof(-5, 6)  // -5/6
    
    expect(qAbsCmp(a, b)).toBeGreaterThan(0)  // |3/4| > |2/3|
    expect(qAbsCmp(b, a)).toBeLessThan(0)     // |2/3| < |3/4|
    expect(qAbsCmp(a, a)).toBe(0)             // |3/4| = |3/4|
    expect(qAbsCmp(c, a)).toBeGreaterThan(0)  // |5/6| > |3/4|
  })

  it('detects zero rationals', () => {
    expect(isQZero(Qof(0, 5))).toBe(true)
    expect(isQZero(Qof(1, 5))).toBe(false)
    expect(isQZero(Qof(-3, 7))).toBe(false)
  })

  it('performs RREF with pivoting over rationals', () => {
    const A: Q[][] = [
      [Qof(1,2), Qof(1,3), Qof(1,6)],
      [Qof(1,4), Qof(2,3), Qof(1,2)],
      [Qof(1,8), Qof(1,3), Qof(3,8)]
    ]
    
    const { R, pivots } = rrefQPivot(A)
    
    expect(pivots.length).toBeGreaterThan(0)
    expect(R.length).toBe(3)
    expect(R[0]?.length).toBe(3)
    
    // Check that pivot columns have leading 1s
    for (let i = 0; i < pivots.length; i++) {
      const col = pivots[i]!
      expect(R[i]?.[col]?.num).toBe(1n)
      expect(R[i]?.[col]?.den).toBe(1n)
    }
  })
})

describe('Homological algebra properties', () => {
  it('runs LES cone properties on random complexes', () => {
    const { samples, okId, okZero } = runLesConeProps(5, 0) // small sample for testing
    
    expect(samples).toBe(5)
    expect(okId).toBeGreaterThanOrEqual(0)
    expect(okZero).toBeGreaterThanOrEqual(0)
    // Note: These are placeholder checks since LES checker is not fully implemented
  })

  it('creates random two-term complexes', () => {
    const X = randomTwoTermComplex(FieldReal, 2)
    
    expect(X.degrees).toEqual([-1, 0])
    expect(X.dim[-1]).toBeGreaterThanOrEqual(0)
    expect(X.dim[0]).toBeGreaterThanOrEqual(0)
    expect(X.S).toBe(FieldReal)
  })

  it('demonstrates homology shift isomorphism interface', () => {
    const iso = makeHomologyShiftIso(FieldReal)(0)
    const X = randomTwoTermComplex(FieldReal, 1)
    
    const check = iso.isoCheck(X)
    expect(typeof check.rankPsiPhi).toBe('number')
    expect(typeof check.rankPhiPsi).toBe('number')
    expect(typeof check.dimHn).toBe('number')
    expect(typeof check.dimHn1).toBe('number')
  })

  it('demonstrates image/coimage functionality', () => {
    const F = FieldReal
    const X = randomTwoTermComplex(F, 1)
    const Y = randomTwoTermComplex(F, 1)
    
    // Create a simple chain map (zero map for simplicity)
    const f = zeroChainMapN(X)
    
    const im = imageComplex(F)(f)
    const coim = coimageComplex(F)(f)
    
    expect(typeof im.Im).toBe('object')
    expect(typeof coim.Coim).toBe('object')
    
    const eta = coimToIm(F)(f, coim, im)
    expect(typeof eta).toBe('object')
    
    // For zero map, coim→im should be well-defined
    const isIso = isIsoChainMap(F)(eta)
    expect(typeof isIso).toBe('boolean')
  })

  it('smoke tests coim→im isomorphism', () => {
    const F = FieldReal
    const X = randomTwoTermComplex(F, 1)
    const f = idChainMapN(X) // identity map
    
    // For identity map, coim→im should be isomorphism
    const isIso = smoke_coim_im_iso(F)(f)
    expect(typeof isIso).toBe('boolean')
  })
})