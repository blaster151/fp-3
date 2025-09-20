import { describe, it, expect } from 'vitest'
import { 
  FieldReal, 
  Complex,
  VectView, 
  Pretty, 
  IntSNF, 
  DiagramClosure, 
  DiagramLaws, 
  IndexedFamilies, 
  DiscreteCategory,
  makeFinitePoset,
  makePosetDiagramCompat,
  idChainMapCompat,
  randomTwoTermComplex
} from '../allTS'

describe('Indexed Families and Discrete Categories', () => {
  describe('VectView namespace', () => {
    it('extracts Vect diagram at fixed degree', () => {
      // Create simple poset diagram
      const poset = makeFinitePoset(['a', 'b'], [['a', 'b']])
      const C1: Complex<number> = { S: FieldReal, degrees: [0], dim: {0: 1}, d: {} }
      const C2: Complex<number> = { S: FieldReal, degrees: [0], dim: {0: 2}, d: {} }
      
      const diagram = makePosetDiagramCompat(poset, { a: C1, b: C2 }, [
        ['a', 'b', { S: FieldReal, X: C1, Y: C2, f: { 0: [[1], [0]] } }]
      ])
      
      const vectView = VectView.toVectAtDegree(FieldReal)(diagram, 0)
      
      expect(vectView.V.a?.dim).toBe(1)
      expect(vectView.V.b?.dim).toBe(2)
      
      const arrow = vectView.arr('a', 'b')
      expect(arrow?.M).toEqual([[1], [0]])
    })

    it('converts linear maps back to chain maps', () => {
      const V2 = VectView.VS(FieldReal)(2)
      const V3 = VectView.VS(FieldReal)(3)
      const linMap: VectView.LinMap<number> = {
        F: FieldReal,
        dom: V2,
        cod: V3,
        M: [[1, 2], [3, 4], [5, 6]]
      }
      
      const chainMap = VectView.linToChain(FieldReal)(0, linMap)
      
      expect(chainMap.X.dim[0]).toBe(2)
      expect(chainMap.Y.dim[0]).toBe(3)
      expect(chainMap.f[0]).toEqual([[1, 2], [3, 4], [5, 6]])
    })
  })

  describe('Pretty namespace', () => {
    it('pretty-prints matrices', () => {
      const A = [[1, 2], [3, 4]]
      const result = Pretty.matrix(FieldReal)(A)
      expect(result).toBe('1 2\n3 4')
    })

    it('pretty-prints chain maps', () => {
      const X: Complex<number> = { S: FieldReal, degrees: [0], dim: {0: 2}, d: {} }
      const Y: Complex<number> = { S: FieldReal, degrees: [0], dim: {0: 1}, d: {} }
      const f = { S: FieldReal, X, Y, f: { 0: [[1, 2]] } }
      
      const result = Pretty.chainMap(FieldReal)('test', f)
      expect(result).toContain('test')
      expect(result).toContain('degree 0: 2 → 1')
      expect(result).toContain('1 2')
    })
  })

  describe('IntSNF namespace', () => {
    it('computes Smith Normal Form', () => {
      const A = [[2, 4], [6, 8]]
      const { U, S, V } = IntSNF.smithNormalForm(A)
      
      expect(U).toBeDefined()
      expect(S).toBeDefined()
      expect(V).toBeDefined()
      
      const invariants = IntSNF.diagonalInvariants(S)
      expect(invariants.length).toBeGreaterThan(0)
    })

    it('handles zero matrix', () => {
      const A = [[0, 0], [0, 0]]
      const { S } = IntSNF.smithNormalForm(A)
      const invariants = IntSNF.diagonalInvariants(S)
      expect(invariants).toEqual([])
    })
  })

  describe('IndexedFamilies namespace', () => {
    it('converts between families and discrete diagrams', () => {
      const family: IndexedFamilies.Family<string, Complex<number>> = (i: string) => ({
        S: FieldReal,
        degrees: [0],
        dim: { 0: i.length },
        d: {}
      })
      
      const indices = ['a', 'bb', 'ccc']
      const DD = IndexedFamilies.familyToDiscDiagram(family, indices)
      
      expect(DD.a?.dim[0]).toBe(1)
      expect(DD.bb?.dim[0]).toBe(2)
      expect(DD.ccc?.dim[0]).toBe(3)
      
      const backToFamily = IndexedFamilies.discDiagramToFamily(DD)
      expect(backToFamily('a').dim[0]).toBe(1)
      expect(backToFamily('bb').dim[0]).toBe(2)
    })

    it('provides family operations', () => {
      const family = (i: string) => i.length
      const idx = IndexedFamilies.finiteIndex(['x', 'yy', 'zzz'])
      
      const collected = IndexedFamilies.collectFamily(idx, family)
      expect(collected).toEqual([['x', 1], ['yy', 2], ['zzz', 3]])
      
      const total = IndexedFamilies.reduceFamily(idx, family, 0, (acc, x) => acc + x)
      expect(total).toBe(6)
      
      const doubled = IndexedFamilies.mapFamily((x: number) => x * 2)(family)
      expect(doubled('xx')).toBe(4)
    })
  })

  describe('DiscreteCategory namespace', () => {
    it('creates discrete categories', () => {
      const objects = ['A', 'B', 'C']
      const disc = DiscreteCategory.create(objects)
      
      expect(disc.objects).toEqual(objects)
      expect(disc.kind).toBe('Discrete')
      
      const idA = disc.id('A')
      expect(idA.tag).toBe('Id')
      expect(idA.obj).toBe('A')
      expect(disc.isId(idA)).toBe(true)
    })

    it('enforces discrete category laws', () => {
      const disc = DiscreteCategory.create(['X', 'Y'])
      const idX = disc.id('X')
      const idY = disc.id('Y')
      
      // Same object composition should work
      const comp = disc.compose(idX, idX)
      expect(comp.obj).toBe('X')
      
      // Different object composition should fail
      expect(() => disc.compose(idY, idX)).toThrow('Cannot compose identities on different objects')
    })

    it('converts families to functors', () => {
      const disc = DiscreteCategory.create(['A', 'B'])
      const family: IndexedFamilies.Family<string, Complex<number>> = (i: string) => ({
        S: FieldReal,
        degrees: [0],
        dim: { 0: i.length },
        d: {}
      })
      
      const functor = DiscreteCategory.familyAsFunctor(disc, family)
      
      expect(functor.onObj('A').dim[0]).toBe(1)
      expect(functor.onObj('B').dim[0]).toBe(1)
      
      const idA = disc.id('A')
      const morphismImage = functor.onMor(idA)
      expect(morphismImage).toBeDefined()
    })
  })

  describe('DiagramClosure namespace', () => {
    it('auto-synthesizes composite arrows', () => {
      // Create diamond poset: a ≤ b, a ≤ c, b ≤ d, c ≤ d
      const poset = makeFinitePoset(['a', 'b', 'c', 'd'], [['a','b'], ['a','c'], ['b','d'], ['c','d']])
      const C1: Complex<number> = { S: FieldReal, degrees: [0], dim: {0: 1}, d: {} }
      const complexes = { a: C1, b: C1, c: C1, d: C1 }
      
      // Only provide cover arrows (not composites)
      const coverArrows = [
        ['a', 'b', { S: FieldReal, X: C1, Y: C1, f: { 0: [[2]] } }], // a→b: *2
        ['a', 'c', { S: FieldReal, X: C1, Y: C1, f: { 0: [[3]] } }], // a→c: *3  
        ['b', 'd', { S: FieldReal, X: C1, Y: C1, f: { 0: [[5]] } }], // b→d: *5
        ['c', 'd', { S: FieldReal, X: C1, Y: C1, f: { 0: [[7]] } }]  // c→d: *7
      ] as const
      
      const baseDiagram = makePosetDiagramCompat(poset, complexes, coverArrows)
      
      // Base diagram should not have composite a→d
      expect(baseDiagram.arr('a', 'd')).toBeUndefined()
      
      // After closure, should have a→d
      const closedDiagram = DiagramClosure.saturate(FieldReal)(baseDiagram)
      const arr_ad = closedDiagram.arr('a', 'd')
      
      expect(arr_ad).toBeDefined()
      // Should be either 2*5=10 (via b) or 3*7=21 (via c) - depends on BFS path choice
      const value = arr_ad?.f[0]?.[0]?.[0]
      expect(value === 10 || value === 21).toBe(true)
    })

    it('provides identity arrows automatically', () => {
      const poset = makeFinitePoset(['a'], [])
      const C1: Complex<number> = { S: FieldReal, degrees: [0], dim: {0: 1}, d: {} }
      const baseDiagram = makePosetDiagramCompat(poset, { a: C1 }, [])
      
      const closedDiagram = DiagramClosure.saturate(FieldReal)(baseDiagram)
      const idA = closedDiagram.arr('a', 'a')
      
      expect(idA).toBeDefined()
      expect(idA?.f[0]).toEqual([[1]]) // identity matrix
    })
  })

  describe('DiagramLaws namespace', () => {
    it('validates functoriality laws', () => {
      // Create valid diagram with proper composition
      const poset = makeFinitePoset(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']])
      const C1: Complex<number> = { S: FieldReal, degrees: [0], dim: {0: 1}, d: {} }
      const complexes = { a: C1, b: C1, c: C1 }
      
      const arrows = [
        ['a', 'a', idChainMapCompat(C1, FieldReal)],
        ['b', 'b', idChainMapCompat(C1, FieldReal)],
        ['c', 'c', idChainMapCompat(C1, FieldReal)],
        ['a', 'b', { S: FieldReal, X: C1, Y: C1, f: { 0: [[2]] } }],
        ['b', 'c', { S: FieldReal, X: C1, Y: C1, f: { 0: [[3]] } }],
        ['a', 'c', { S: FieldReal, X: C1, Y: C1, f: { 0: [[6]] } }] // 2*3=6
      ] as const
      
      const diagram = makePosetDiagramCompat(poset, complexes, arrows)
      const validation = DiagramLaws.validateFunctoriality(FieldReal)(diagram)
      
      expect(validation.ok).toBe(true)
      expect(validation.issues).toEqual([])
    })

    it('detects functoriality violations', () => {
      // Create diagram with wrong composite
      const poset = makeFinitePoset(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']])
      const C1: Complex<number> = { S: FieldReal, degrees: [0], dim: {0: 1}, d: {} }
      const complexes = { a: C1, b: C1, c: C1 }
      
      const arrows = [
        ['a', 'a', idChainMapCompat(C1, FieldReal)],
        ['b', 'b', idChainMapCompat(C1, FieldReal)],
        ['c', 'c', idChainMapCompat(C1, FieldReal)],
        ['a', 'b', { S: FieldReal, X: C1, Y: C1, f: { 0: [[2]] } }],
        ['b', 'c', { S: FieldReal, X: C1, Y: C1, f: { 0: [[3]] } }],
        ['a', 'c', { S: FieldReal, X: C1, Y: C1, f: { 0: [[7]] } }] // Wrong! Should be 6
      ] as const
      
      const diagram = makePosetDiagramCompat(poset, complexes, arrows)
      const validation = DiagramLaws.validateFunctoriality(FieldReal)(diagram)
      
      expect(validation.ok).toBe(false)
      expect(validation.issues.length).toBeGreaterThan(0)
      expect(validation.issues[0]).toContain('composition law fails')
    })
  })

  // Property tests for categorical laws (inspired by LAWS.md)
  describe('Reindexing Functoriality Laws', () => {
    it('reindex(id) = id (identity law)', () => {
      const family = (i: string) => i.length
      const id = (x: string) => x
      
      const reindexed = IndexedFamilies.reindex(id, family)
      
      // Test on several inputs
      const testInputs = ['a', 'bb', 'ccc']
      for (const input of testInputs) {
        expect(reindexed(input)).toBe(family(input))
      }
    })

    it('reindex(v∘u) = reindex(u)∘reindex(v) (composition law)', () => {
      const family = (i: number) => i * i
      const u = (j: string) => j.length
      const v = (k: boolean) => k ? 1 : 0
      
      // Left side: reindex(v∘u)
      const vu = (k: boolean) => u(v(k) === 1 ? 'x' : '')
      const leftSide = IndexedFamilies.reindex(vu, family)
      
      // Right side: reindex(u)∘reindex(v)  
      const reindexV = IndexedFamilies.reindex(v, (n: number) => n)
      const reindexU = IndexedFamilies.reindex(u, family)
      const rightSide = IndexedFamilies.reindex((k: boolean) => v(k), reindexU)
      
      // Test equivalence
      expect(leftSide(true)).toBe(rightSide(true))
      expect(leftSide(false)).toBe(rightSide(false))
    })

    it('dependent sum/product adjunction properties', () => {
      // Test Σ and Π operations
      const family = (i: string) => i.length
      const idx = IndexedFamilies.finiteIndex(['a', 'bb', 'ccc'])
      
      // Dependent sum
      const sumResult = IndexedFamilies.sigma(idx, family)
      expect(sumResult).toEqual([
        { i: 'a', x: 1 },
        { i: 'bb', x: 2 },
        { i: 'ccc', x: 3 }
      ])
      
      // Dependent product  
      const prodResult = IndexedFamilies.pi(['a', 'bb', 'ccc'] as const, family)
      expect(prodResult).toEqual({ a: 1, bb: 2, ccc: 3 })
      
      // Round-trip property: sigmaFromRecord ∘ pi ≈ sigma
      const fromRecord = IndexedFamilies.sigmaFromRecord(prodResult)
      expect(fromRecord.length).toBe(sumResult.length)
    })
  })

  describe('Categorical Laws (Property Tests)', () => {
    it('discrete category satisfies identity laws', () => {
      const disc = DiscreteCategory.create(['X', 'Y', 'Z'])
      
      // Test identity law: id ∘ f = f = f ∘ id (for discrete, only f = id works)
      for (const obj of disc.objects) {
        const id_obj = disc.id(obj)
        const composed = disc.compose(id_obj, id_obj)
        expect(composed.obj).toBe(obj)
        expect(disc.isId(composed)).toBe(true)
      }
    })

    it('indexed families preserve structure through conversions', () => {
      // Property: familyToDiscDiagram ∘ discDiagramToFamily ≈ id
      const originalFamily: IndexedFamilies.Family<string, Complex<number>> = (i: string) => 
        randomTwoTermComplex(FieldReal, i.length)
      
      const indices = ['a', 'bb', 'ccc']
      const DD = IndexedFamilies.familyToDiscDiagram(originalFamily, indices)
      const roundTripFamily = IndexedFamilies.discDiagramToFamily(DD)
      
      // Check dimensions match (structure preserved)
      for (const i of indices) {
        const original = originalFamily(i)
        const roundTrip = roundTripFamily(i)
        expect(roundTrip.dim[0]).toBe(original.dim[0])
        expect(roundTrip.dim[1]).toBe(original.dim[1])
      }
    })

    it('family operations satisfy functor laws', () => {
      // Test: mapFamily(id) = id
      const family = (i: string) => i.length
      const idMapped = IndexedFamilies.mapFamily((x: number) => x)(family)
      
      expect(idMapped('test')).toBe(family('test'))
      
      // Test: mapFamily(f ∘ g) = mapFamily(f) ∘ mapFamily(g)
      const f = (x: number) => x * 2
      const g = (x: number) => x + 1
      const composed = IndexedFamilies.mapFamily((x: number) => f(g(x)))(family)
      const sequential = IndexedFamilies.mapFamily(f)(IndexedFamilies.mapFamily(g)(family))
      
      expect(composed('ab')).toBe(sequential('ab'))
    })

    it('diagram closure preserves categorical laws', () => {
      // Property: closure of valid diagram remains valid
      const poset = makeFinitePoset(['a', 'b'], [['a', 'b']])
      const C1: Complex<number> = { S: FieldReal, degrees: [0], dim: {0: 1}, d: {} }
      
      const baseDiagram = makePosetDiagramCompat(poset, { a: C1, b: C1 }, [
        ['a', 'b', { S: FieldReal, X: C1, Y: C1, f: { 0: [[2]] } }]
      ])
      
      const closedDiagram = DiagramClosure.saturate(FieldReal)(baseDiagram)
      const validation = DiagramLaws.validateFunctoriality(FieldReal)(closedDiagram)
      
      expect(validation.ok).toBe(true)
    })
  })

  // Integration tests showing the complete workflow
  describe('Integration: Complete Workflow', () => {
    it('family → diagram → closure → validation → Vect view', () => {
      // 1. Start with indexed family
      const family: IndexedFamilies.Family<string, Complex<number>> = (i: string) => ({
        S: FieldReal,
        degrees: [0],
        dim: { 0: i === 'small' ? 1 : 2 },
        d: {}
      })
      
      // 2. Convert to diagram
      const indices = ['small', 'big']
      const DD = IndexedFamilies.familyToDiscDiagram(family, indices)
      
      // 3. Create poset diagram (discrete case)
      const discretePoset = makeFinitePoset(indices, []) // no covers = discrete
      const diagram = makePosetDiagramCompat(discretePoset, DD, [])
      
      // 4. Apply closure (adds identities)
      const closed = DiagramClosure.saturate(FieldReal)(diagram)
      
      // 5. Validate
      const validation = DiagramLaws.validateFunctoriality(FieldReal)(closed)
      expect(validation.ok).toBe(true)
      
      // 6. Extract Vect view
      const vectView = VectView.toVectAtDegree(FieldReal)(closed, 0)
      expect(vectView.V.small?.dim).toBe(1)
      expect(vectView.V.big?.dim).toBe(2)
      
      // 7. Pretty-print for debugging
      const prettyView = Pretty.vectDiagramAtDegree(FieldReal)('Family View', vectView)
      expect(prettyView).toContain('small:1')
      expect(prettyView).toContain('big:2')
    })
  })
})