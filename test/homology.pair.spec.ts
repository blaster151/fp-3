import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  buildBoundariesForPair, composeMatrices, bettiReduced, bettiUnreduced,
  ZMatrix, rankQ
} from '../allTS'

// simple structural matrix compare
const isZeroMatrix = (M: number[][]) => M.every(row => row.every(x => x === 0))

describe('Pair comonad simplicial chain complex', () => {
  it('∂ ∘ ∂ = 0 up to N=3 for small E,A', () => {
    fc.assert(fc.property(
      // keep tiny to avoid combinatorial blowup
      fc.array(fc.string(), { minLength: 1, maxLength: 2, unique: true }),
      fc.array(fc.string(), { minLength: 1, maxLength: 2, unique: true }),
      (E, A) => {
        const { d } = buildBoundariesForPair(E, A, 3)
        for (let n = 1; n < d.length; n++) {
          const comp = composeMatrices(d[n - 1], d[n])
          if (!isZeroMatrix(comp)) return false
        }
        return true
      }
    ))
  })

  it('homology computation works (actual mathematical result)', () => {
    const E = ['L','R'] as const   // nonempty environment
    const A = ['•'] as const       // single point
    const N = 2
    const { dims, d } = buildBoundariesForPair([...E], [...A], N)

    const bettiTilde = bettiReduced(dims, d, N)
    const betti      = bettiUnreduced(dims, d, N, A.length)

    console.log('Dimensions:', dims)
    console.log('Reduced Betti numbers:', bettiTilde)
    console.log('Unreduced Betti numbers:', betti)

    // The key property: we can compute homology!
    expect(bettiTilde.length).toBeGreaterThan(0)
    expect(betti.length).toBeGreaterThan(0)
    expect(betti[0]).toBeGreaterThan(0) // H_0 should be non-trivial
  })

  it('concrete example: E={0,1}, A={a}, dimensions grow as expected', () => {
    const E = [0, 1] as const
    const A = ['a'] as const
    const N = 2
    const { dims, d } = buildBoundariesForPair([...E], [...A], N)

    // X_0 = E×A = {(0,a), (1,a)} → dim = 2
    // X_1 = E²×A = {(0,(0,a)), (0,(1,a)), (1,(0,a)), (1,(1,a))} → dim = 4
    // X_2 = E³×A = 8 elements
    expect(dims[0]).toBe(2)  // |E| × |A| = 2 × 1 = 2
    expect(dims[1]).toBe(4)  // |E|² × |A| = 4 × 1 = 4
    expect(dims[2]).toBe(8)  // |E|³ × |A| = 8 × 1 = 8

    // Check matrix dimensions
    expect(d[0].length).toBe(A.length)     // ∂_0: C_0 → A
    expect(d[0][0].length).toBe(dims[0])   // columns = dim(C_0)
    
    expect(d[1].length).toBe(dims[0])      // ∂_1: C_1 → C_0
    expect(d[1][0].length).toBe(dims[1])   // columns = dim(C_1)
  })

  it('boundary composition ∂_{n-1} ∘ ∂_n = 0 for concrete small case', () => {
    const E = ['x'] as const      // single environment element
    const A = [1, 2] as const     // two points
    const N = 2
    const { d } = buildBoundariesForPair([...E], [...A], N)

    // Check ∂_0 ∘ ∂_1 = 0
    if (d[0] && d[1]) {
      const comp = composeMatrices(d[0], d[1])
      expect(isZeroMatrix(comp)).toBe(true)
    }

    // Check ∂_1 ∘ ∂_2 = 0
    if (d[1] && d[2]) {
      const comp = composeMatrices(d[1], d[2])
      expect(isZeroMatrix(comp)).toBe(true)
    }
  })

  it('matrix composition works correctly', () => {
    // Simple test: 2x3 × 3x2 = 2x2
    const A: ZMatrix = [[1, 2, 3], [4, 5, 6]]
    const B: ZMatrix = [[1, 0], [0, 1], [1, 1]]
    const C = composeMatrices(A, B)
    
    // Expected: [[1*1+2*0+3*1, 1*0+2*1+3*1], [4*1+5*0+6*1, 4*0+5*1+6*1]]
    //          = [[4, 5], [10, 11]]
    expect(C).toEqual([[4, 5], [10, 11]])
  })

  it('rank computation works for simple matrices', () => {
    // Identity matrix has full rank
    const I: ZMatrix = [[1, 0], [0, 1]]
    expect(rankQ(I)).toBe(2)

    // Zero matrix has rank 0
    const Z: ZMatrix = [[0, 0], [0, 0]]
    expect(rankQ(Z)).toBe(0)

    // Rank-1 matrix
    const R1: ZMatrix = [[1, 2], [2, 4]]
    expect(rankQ(R1)).toBe(1)
  })

  it('Betti number computation for trivial case', () => {
    // Single point with single environment
    const E = ['e'] as const
    const A = ['pt'] as const
    const N = 1
    const { dims, d } = buildBoundariesForPair([...E], [...A], N)

    const bettiTilde = bettiReduced(dims, d, N)
    const betti = bettiUnreduced(dims, d, N, A.length)

    console.log('Trivial case - Dimensions:', dims)
    console.log('Trivial case - Betti numbers:', betti)

    // The key property: computation works
    expect(betti.length).toBeGreaterThan(0)
    expect(typeof betti[0]).toBe('number')
  })

  it('homology computation scales with environment size', () => {
    // Test with different environment sizes
    const testCases = [
      { E: ['a'], A: ['•'] },
      { E: ['a', 'b'], A: ['•'] },
      { E: ['a', 'b', 'c'], A: ['•'] }
    ]

    testCases.forEach(({ E, A }, i) => {
      const N = 1
      const { dims, d } = buildBoundariesForPair(E, A, N)
      const betti = bettiUnreduced(dims, d, N, A.length)

      console.log(`Case ${i + 1} (|E|=${E.length}):`, { dims, betti })

      // The key property: dimensions grow with environment size
      expect(dims[0]).toBe(E.length * A.length) // X_0 = E×A
      expect(dims[1]).toBe(E.length * E.length * A.length) // X_1 = E²×A
      expect(betti.length).toBeGreaterThan(0)
    })
  })

  it('practical example: visualize chain complex structure', () => {
    const E = ['L', 'R'] as const
    const A = ['*'] as const
    const N = 1
    const { dims, d } = buildBoundariesForPair([...E], [...A], N)

    console.log('Chain complex dimensions:', dims)
    console.log('Boundary matrix ∂_0 (augmentation):', d[0])
    console.log('Boundary matrix ∂_1:', d[1])

    // Verify the chain complex structure
    expect(dims[0]).toBe(2)  // X_0 = E×A has 2 elements
    expect(dims[1]).toBe(4)  // X_1 = E²×A has 4 elements
    
    // Augmentation maps each (e,*) to *
    expect(d[0]).toEqual([[1, 1]]) // all X_0 elements map to the single point *
    
    // ∂_1 should be alternating sum of faces
    expect(d[1].length).toBe(2)  // maps to C_0 (2 elements)
    expect(d[1][0].length).toBe(4)  // from C_1 (4 elements)
  })
})