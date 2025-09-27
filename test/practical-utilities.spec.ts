import { describe, it, expect } from 'vitest'
import {
  SemiringNat, SemiringMinPlus, SemiringMaxPlus, SemiringBoolOrAnd, SemiringProb,
  vecMat, matVec, powMat, closureUpTo,
  waRun, waAcceptsBool,
  hmmForward, diagFromVec, normalizeRow,
  graphAdjNat, graphAdjBool, graphAdjWeights,
  countPathsOfLength, reachableWithin, shortestPathsUpTo,
  transitiveClosureBool, compileRegexToWA,
  eye,
} from '../allTS'
import type { WeightedAutomaton, HMM, Edge } from '../allTS'

describe('Practical Semirings', () => {
  it('MinPlus semiring works for shortest paths', () => {
    const S = SemiringMinPlus
    expect(S.add(5, 3)).toBe(3) // min
    expect(S.mul(5, 3)).toBe(8) // +
    expect(S.zero).toBe(Number.POSITIVE_INFINITY)
    expect(S.one).toBe(0)
  })

  it('MaxPlus semiring works for longest paths', () => {
    const S = SemiringMaxPlus
    expect(S.add(5, 3)).toBe(5) // max
    expect(S.mul(5, 3)).toBe(8) // +
    expect(S.zero).toBe(Number.NEGATIVE_INFINITY)
    expect(S.one).toBe(0)
  })

  it('Boolean semiring works for reachability', () => {
    const S = SemiringBoolOrAnd
    expect(S.add(true, false)).toBe(true)   // ∨
    expect(S.mul(true, false)).toBe(false)  // ∧
    expect(S.zero).toBe(false)
    expect(S.one).toBe(true)
  })

  it('Probability semiring works for HMMs', () => {
    const S = SemiringProb
    expect(S.add(0.3, 0.4)).toBe(0.7) // +
    expect(S.mul(0.3, 0.4)).toBe(0.12) // ×
    expect(S.zero).toBe(0)
    expect(S.one).toBe(1)
  })
})

describe('Vector and matrix operations', () => {
  it('vecMat multiplies row vector with matrix', () => {
    const v = [1, 2]
    const M = [[1, 0, 1], [0, 1, 1]]
    const result = vecMat(SemiringNat)(v, M)
    expect(result).toEqual([1, 2, 3]) // [1*1+2*0, 1*0+2*1, 1*1+2*1]
  })

  it('matVec multiplies matrix with column vector', () => {
    const M = [[1, 2], [3, 4]]
    const v = [1, 1]
    const result = matVec(SemiringNat)(M, v)
    expect(result).toEqual([3, 7]) // [1*1+2*1, 3*1+4*1]
  })

  it('powMat computes matrix powers efficiently', () => {
    const A = [[0, 1], [1, 0]] // swap matrix
    const A2 = powMat(SemiringNat)(A, 2)
    const A4 = powMat(SemiringNat)(A, 4)
    
    expect(A2).toEqual([[1, 0], [0, 1]]) // identity
    expect(A4).toEqual([[1, 0], [0, 1]]) // identity
  })

  it('closureUpTo computes Kleene star', () => {
    const A = [[false, true], [false, false]] // single edge 0→1
    const closure = closureUpTo(SemiringBoolOrAnd)(A, 2)
    
    expect(closure[0]?.[0]).toBe(true)  // I
    expect(closure[0]?.[1]).toBe(true)  // A
    expect(closure[1]?.[1]).toBe(true)  // I
  })
})

describe('Weighted Automata', () => {
  it('counts paths in simple automaton', () => {
    const init = [1, 0] as const
    const final = [0, 1] as const
    const delta: Record<'a' | 'b', number[][]> = {
      a: [[0, 1], [0, 0]],
      b: [[0, 0], [0, 1]]
    }
    const WA: WeightedAutomaton<number, 'a'|'b'> = { 
      S: SemiringNat, n: 2, init, final, delta 
    }
    
    expect(waRun(WA)(['a','b'])).toBe(1)
    expect(waRun(WA)(['a','a'])).toBe(0)
    expect(waRun(WA)(['b','b'])).toBe(0)
  })

  it('accepts words with Boolean automaton', () => {
    const init = [true, false] as const
    const final = [false, true] as const
    const delta: Record<'a' | 'b', boolean[][]> = {
      a: [[false, true], [false, false]], // from state 0: go to 1; from state 1: stuck
      b: [[false, false], [false, true]]  // from state 0: stuck; from state 1: stay
    }
    const DFA: WeightedAutomaton<boolean, 'a'|'b'> = { 
      S: SemiringBoolOrAnd, n: 2, init, final, delta 
    }
    
    expect(waAcceptsBool(DFA)(['a','b'])).toBe(true)   // 0→1→1, accept
    expect(waAcceptsBool(DFA)(['a','a'])).toBe(false)  // 0→1→stuck, reject
    expect(waAcceptsBool(DFA)(['b'])).toBe(false)      // 0→stuck, reject
  })
})

describe('Hidden Markov Models', () => {
  it('computes forward probabilities', () => {
    const T: number[][] = [[0.9,0.1],[0.2,0.8]]
    const Ex = diagFromVec(SemiringProb)([0.7,0.1])
    const Ey = diagFromVec(SemiringProb)([0.3,0.9])
    const H: HMM<number,'x'|'y'> = { 
      S: SemiringProb, n: 2, T, E: { x: Ex, y: Ey }, pi: [0.5,0.5] 
    }
    
    const probX = hmmForward(H)(['x'])
    const probXY = hmmForward(H)(['x','y'])
    
    expect(probX).toBeGreaterThan(0)
    expect(probX).toBeLessThanOrEqual(1)
    expect(probXY).toBeGreaterThan(0)
    expect(probXY).toBeLessThanOrEqual(1)
  })

  it('diagFromVec creates diagonal matrices', () => {
    const w = [0.7, 0.3]
    const diag = diagFromVec(SemiringProb)(w)
    
    expect(diag[0]?.[0]).toBe(0.7)
    expect(diag[1]?.[1]).toBe(0.3)
    expect(diag[0]?.[1]).toBe(0)
    expect(diag[1]?.[0]).toBe(0)
  })
})

describe('Graph DP utilities', () => {
  it('builds adjacency matrices from edge lists', () => {
    const edges: Edge<number>[] = [[0,1,5], [1,2,3]]
    
    const natAdj = graphAdjNat(3, edges.map(([u,v]) => [u,v]))
    expect(natAdj[0]?.[1]).toBe(1)
    expect(natAdj[1]?.[2]).toBe(1)
    expect(natAdj[0]?.[2]).toBe(0)
    
    const boolAdj = graphAdjBool(3, edges)
    expect(boolAdj[0]?.[1]).toBe(true)
    expect(boolAdj[0]?.[2]).toBe(false)
    
    const weightAdj = graphAdjWeights(3, edges)
    expect(weightAdj[0]?.[1]).toBe(5)
    expect(weightAdj[1]?.[2]).toBe(3)
    expect(weightAdj[0]?.[0]).toBe(0) // diagonal
  })

  it('solves graph problems with different semirings', () => {
    // Simple path: 0→1→2
    const edges: Edge<number>[] = [[0,1,1], [1,2,1]]
    
    // Path counting
    const natAdj = graphAdjNat(3, edges.map(([u,v]) => [u,v]))
    const paths = countPathsOfLength(natAdj, 2)
    expect(paths[0]?.[2]).toBe(1) // exactly one path of length 2
    
    // Reachability
    const boolAdj = graphAdjBool(3, edges)
    const reach = reachableWithin(boolAdj, 2)
    expect(reach[0]?.[2]).toBe(true) // reachable within 2 steps
    
    // Shortest paths
    const weightAdj = graphAdjWeights(3, edges)
    const shortest = shortestPathsUpTo(weightAdj)
    expect(shortest[0]?.[2]).toBe(2) // distance 2
  })
})

describe('Utility functions', () => {
  it('normalizeRow handles probability vectors', () => {
    const v = [2, 3, 5]
    const normalized = normalizeRow(v)
    const sum = normalized.reduce((a,b) => a + b, 0)
    
    expect(sum).toBeCloseTo(1, 6)
    expect(normalized[0]).toBeCloseTo(0.2, 6) // 2/10
    expect(normalized[1]).toBeCloseTo(0.3, 6) // 3/10
    expect(normalized[2]).toBeCloseTo(0.5, 6) // 5/10
  })

  it('handles zero vector in normalization', () => {
    const v = [0, 0, 0]
    const normalized = normalizeRow(v)
    expect(normalized).toEqual([0, 0, 0])
  })
})

describe('Transitive closure', () => {
  it('computes transitive closure correctly', () => {
    // Simple path: 0→1→2
    const adj = [
      [false, true, false],
      [false, false, true], 
      [false, false, false]
    ]
    
    const closure = transitiveClosureBool(adj, true)
    
    expect(closure[0]?.[0]).toBe(true)  // reflexive
    expect(closure[0]?.[1]).toBe(true)  // direct
    expect(closure[0]?.[2]).toBe(true)  // transitive 0→1→2
    expect(closure[1]?.[2]).toBe(true)  // direct
    expect(closure[2]?.[0]).toBe(false) // no path back
  })

  it('handles reflexive vs non-reflexive closure', () => {
    const adj = [[false, true], [false, false]]
    
    const nonReflexive = transitiveClosureBool(adj, false)
    const reflexive = transitiveClosureBool(adj, true)
    
    expect(nonReflexive[0]?.[0]).toBe(false)
    expect(reflexive[0]?.[0]).toBe(true)
    
    expect(nonReflexive[0]?.[1]).toBe(true) // same
    expect(reflexive[0]?.[1]).toBe(true)    // same
  })
})

describe('Regex compilation', () => {
  it('compiles simple literals', () => {
    const wa = compileRegexToWA('a', ['a', 'b'])
    
    expect(waAcceptsBool(wa)(['a'])).toBe(true)
    expect(waAcceptsBool(wa)([])).toBe(false)
    expect(waAcceptsBool(wa)(['a','a'])).toBe(false)
    expect(waAcceptsBool(wa)(['b'])).toBe(false) // b not in pattern
  })

  it('compiles Kleene star', () => {
    const wa = compileRegexToWA('a*', ['a', 'b'])
    
    expect(waAcceptsBool(wa)([])).toBe(true)           // ε
    expect(waAcceptsBool(wa)(['a'])).toBe(true)        // a
    expect(waAcceptsBool(wa)(['a','a'])).toBe(true)    // aa
    expect(waAcceptsBool(wa)(['b'])).toBe(false)       // b not in pattern
  })

  it('compiles concatenation', () => {
    const wa = compileRegexToWA('ab', ['a', 'b'])
    
    expect(waAcceptsBool(wa)(['a','b'])).toBe(true)
    expect(waAcceptsBool(wa)(['a'])).toBe(false)
    expect(waAcceptsBool(wa)(['b'])).toBe(false)
    expect(waAcceptsBool(wa)(['b','a'])).toBe(false)
  })

  it('compiles alternation', () => {
    const wa = compileRegexToWA('a|b', ['a', 'b', 'c'])
    
    expect(waAcceptsBool(wa)(['a'])).toBe(true)
    expect(waAcceptsBool(wa)(['b'])).toBe(true)
    expect(waAcceptsBool(wa)([])).toBe(false)
    
    expect(waAcceptsBool(wa)(['c'])).toBe(false) // c not in pattern
  })

  it('compiles complex patterns', () => {
    const wa = compileRegexToWA('(ab|ac)*', ['a', 'b', 'c', 'd'])
    
    expect(waAcceptsBool(wa)([])).toBe(true)                      // ε
    expect(waAcceptsBool(wa)(['a','b'])).toBe(true)               // ab
    expect(waAcceptsBool(wa)(['a','c'])).toBe(true)               // ac
    expect(waAcceptsBool(wa)(['a','b','a','c'])).toBe(true)       // abac
    expect(waAcceptsBool(wa)(['a','b','a','b'])).toBe(true)       // abab
    expect(waAcceptsBool(wa)(['a'])).toBe(false)                  // incomplete
    
    expect(waAcceptsBool(wa)(['a','d'])).toBe(false) // d not in pattern
  })

  it('handles nested groups and stars', () => {
    const wa = compileRegexToWA('(a*b)*', ['a', 'b'])
    
    expect(waAcceptsBool(wa)([])).toBe(true)                      // ε
    expect(waAcceptsBool(wa)(['b'])).toBe(true)                   // b
    expect(waAcceptsBool(wa)(['a','b'])).toBe(true)               // ab
    expect(waAcceptsBool(wa)(['a','a','b','b'])).toBe(true)       // aabb
    expect(waAcceptsBool(wa)(['a'])).toBe(false)                  // no final b
  })

  it('handles escape sequences', () => {
    const wa = compileRegexToWA('\\(\\)', ['(', ')'])
    
    expect(waAcceptsBool(wa)(['(', ')'])).toBe(true)
    expect(waAcceptsBool(wa)(['('])).toBe(false)
    expect(waAcceptsBool(wa)([')'])).toBe(false)
  })

  it('compiles one-or-more (+)', () => {
    const wa = compileRegexToWA('a+', ['a'])
    
    expect(waAcceptsBool(wa)([])).toBe(false)           // ε not accepted
    expect(waAcceptsBool(wa)(['a'])).toBe(true)         // a
    expect(waAcceptsBool(wa)(['a','a'])).toBe(true)     // aa
    expect(waAcceptsBool(wa)(['a','a','a'])).toBe(true) // aaa
  })

  it('compiles optional (?)', () => {
    const wa = compileRegexToWA('b?', ['b'])
    
    expect(waAcceptsBool(wa)([])).toBe(true)            // ε accepted
    expect(waAcceptsBool(wa)(['b'])).toBe(true)         // b
    expect(waAcceptsBool(wa)(['b','b'])).toBe(false)    // bb not accepted
  })

  it('compiles character classes', () => {
    const wa = compileRegexToWA('[abc]', ['a', 'b', 'c', 'd'])
    
    expect(waAcceptsBool(wa)(['a'])).toBe(true)
    expect(waAcceptsBool(wa)(['b'])).toBe(true)
    expect(waAcceptsBool(wa)(['c'])).toBe(true)
    expect(waAcceptsBool(wa)(['d'])).toBe(false) // d not in pattern
  })

  it('compiles character ranges', () => {
    const wa = compileRegexToWA('[a-c]+', ['a', 'b', 'c'])
    
    expect(waAcceptsBool(wa)(['a','c'])).toBe(true)
    expect(waAcceptsBool(wa)(['b','b','a'])).toBe(true)
    expect(waAcceptsBool(wa)([])).toBe(false) // + requires at least one
    
    // Check alphabet includes expanded range
    const alphabet = Object.keys(wa.delta).sort()
    expect(alphabet).toEqual(['a', 'b', 'c'])
  })

  it('compiles complex patterns with new features', () => {
    const wa = compileRegexToWA('([a-c]b)*', ['a', 'b', 'c'])
    
    expect(waAcceptsBool(wa)([])).toBe(true)                      // ε
    expect(waAcceptsBool(wa)(['a','b'])).toBe(true)               // ab
    expect(waAcceptsBool(wa)(['b','b'])).toBe(true)               // bb
    expect(waAcceptsBool(wa)(['c','b'])).toBe(true)               // cb
    expect(waAcceptsBool(wa)(['a','b','c','b'])).toBe(true)       // abcb
    expect(waAcceptsBool(wa)(['a'])).toBe(false)                  // incomplete
  })

  it('handles mixed features', () => {
    const wa = compileRegexToWA('a+b?[0-9]*', ['a', 'b', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
    
    expect(waAcceptsBool(wa)(['a'])).toBe(true)                   // a
    expect(waAcceptsBool(wa)(['a','b'])).toBe(true)               // ab
    expect(waAcceptsBool(wa)(['a','0','1'])).toBe(true)           // a01
    expect(waAcceptsBool(wa)(['a','b','0','1','2'])).toBe(true)   // ab012
    expect(waAcceptsBool(wa)([])).toBe(false)                     // need at least one a
    expect(waAcceptsBool(wa)(['b'])).toBe(false)                  // need a first
  })

  it('compiles dot with explicit alphabet', () => {
    const alphabet = ['a', 'b', 'c']
    const wa = compileRegexToWA('.+', alphabet)
    
    expect(waAcceptsBool(wa)(['a'])).toBe(true)
    expect(waAcceptsBool(wa)(['b'])).toBe(true)
    expect(waAcceptsBool(wa)(['c'])).toBe(true)
    expect(waAcceptsBool(wa)(['a','b','c'])).toBe(true)
    expect(waAcceptsBool(wa)([])).toBe(false) // + requires at least one
  })

  it('compiles negated character classes', () => {
    const alphabet = ['a', 'b', 'c', 'd']
    const wa = compileRegexToWA('[^ab]+', alphabet)
    
    expect(waAcceptsBool(wa)(['c'])).toBe(true)
    expect(waAcceptsBool(wa)(['d'])).toBe(true)
    expect(waAcceptsBool(wa)(['c','d'])).toBe(true)
    expect(waAcceptsBool(wa)(['a'])).toBe(false) // a is excluded
    expect(waAcceptsBool(wa)(['b'])).toBe(false) // b is excluded
    expect(waAcceptsBool(wa)([])).toBe(false)    // + requires at least one
  })

  it('handles mixed dot and negated classes', () => {
    const alphabet = ['a', 'b', 'c', 'x', 'y', 'z']
    const wa = compileRegexToWA('.*[^xyz]', alphabet)
    
    expect(waAcceptsBool(wa)(['a'])).toBe(true)           // ends with a (not xyz)
    expect(waAcceptsBool(wa)(['b','c','a'])).toBe(true)   // ends with a
    expect(waAcceptsBool(wa)(['a','b','x'])).toBe(false)  // ends with x (excluded)
    expect(waAcceptsBool(wa)(['x'])).toBe(false)          // just x (excluded)
  })
})