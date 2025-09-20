import { describe, it, expect, test } from 'vitest'
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
  EnhancedVect,
  ArrowFamilies,
  CategoryLimits,
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

    it('enumerable operations work correctly', () => {
      // Create enumerable family
      const enumFam: IndexedFamilies.EnumFamily<string, number> = (i: string) => ({
        enumerate: () => Array.from({ length: i.length }, (_, k) => k)
      })
      
      const idx = IndexedFamilies.finiteIndex(['a', 'bb'])
      
      // Test sigma enumeration
      const sigmaResult = IndexedFamilies.sigmaEnum(idx, enumFam)
      expect(sigmaResult).toEqual([
        { i: 'a', x: 0 },
        { i: 'bb', x: 0 },
        { i: 'bb', x: 1 }
      ])
      
      // Test pi enumeration (cartesian product)
      const piResult = IndexedFamilies.piEnum(idx, enumFam)
      expect(piResult).toEqual([
        [['a', 0], ['bb', 0]],
        [['a', 0], ['bb', 1]]
      ])
    })

    it('Kan extensions for enumerable families', () => {
      const u = (j: number) => j % 2 // map to {0, 1}
      const Jfin = IndexedFamilies.finiteIndex([0, 1, 2, 3])
      const fam: IndexedFamilies.EnumFamily<number, string> = (j) => ({
        enumerate: () => [String.fromCharCode(65 + j)] // 'A', 'B', 'C', 'D'
      })
      
      // Left Kan: colimit over fibers
      const lanResult = IndexedFamilies.lanEnum(u, Jfin, fam)
      expect(lanResult(0).enumerate()).toEqual([
        { j: 0, x: 'A' },
        { j: 2, x: 'C' }
      ])
      expect(lanResult(1).enumerate()).toEqual([
        { j: 1, x: 'B' },
        { j: 3, x: 'D' }
      ])
      
      // Right Kan: limit over fibers  
      const ranResult = IndexedFamilies.ranEnum(u, Jfin, fam)
      expect(ranResult(0).enumerate()).toEqual([
        [[0, 'A'], [2, 'C']]
      ])
      expect(ranResult(1).enumerate()).toEqual([
        [[1, 'B'], [3, 'D']]
      ])
    })

    it('sugar functions work', () => {
      // Test familyFromArray
      const { I, Ifin, fam, Idisc } = IndexedFamilies.familyFromArray([10, 20, 30])
      expect(I).toEqual([0, 1, 2])
      expect(fam(1)).toBe(20)
      expect(Idisc.objects).toEqual([0, 1, 2])
      
      // Test familyFromRecord
      const { keys, fam: recFam } = IndexedFamilies.familyFromRecord({ x: 'hello', y: 'world' })
      expect(keys).toContain('x')
      expect(keys).toContain('y')
      expect(recFam('x')).toBe('hello')
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

  describe('EnhancedVect category', () => {
    it('creates vector objects and morphisms with dom/cod', () => {
      const V2: EnhancedVect.VectObj = { dim: 2 }
      const V3: EnhancedVect.VectObj = { dim: 3 }
      
      const f: EnhancedVect.VectMor = {
        matrix: [[1, 2], [3, 4], [5, 6]],
        from: V2,
        to: V3
      }
      
      expect(EnhancedVect.Vect.dom(f)).toBe(V2)
      expect(EnhancedVect.Vect.cod(f)).toBe(V3)
    })

    it('composes morphisms correctly', () => {
      const V1: EnhancedVect.VectObj = { dim: 1 }
      const V2: EnhancedVect.VectObj = { dim: 2 }
      const V3: EnhancedVect.VectObj = { dim: 3 }
      
      const f: EnhancedVect.VectMor = { matrix: [[1], [2]], from: V1, to: V2 }
      const g: EnhancedVect.VectMor = { matrix: [[1, 2], [3, 4], [5, 6]], from: V2, to: V3 }
      
      const comp = EnhancedVect.Vect.compose(g, f)
      expect(comp.from).toBe(V1)
      expect(comp.to).toBe(V3)
      expect(comp.matrix).toEqual([[5], [11], [17]]) // g * f
    })

    it('creates finite products and coproducts', () => {
      const fam = (i: number) => ({ dim: i + 1 }) // dims: 1, 2, 3
      const idx = IndexedFamilies.finiteIndex([0, 1, 2])
      
      const { product, projections } = EnhancedVect.finiteProductVect(idx, fam)
      expect(product.dim).toBe(6) // 1 + 2 + 3
      
      const proj0 = projections(0)
      expect(proj0.from).toBe(product)
      expect(proj0.to.dim).toBe(1)
      
      const { coproduct, injections } = EnhancedVect.finiteCoproductVect(idx, fam)
      expect(coproduct.dim).toBe(6) // same in Vect
      
      const inj1 = injections(1)
      expect(inj1.from.dim).toBe(2)
      expect(inj1.to).toBe(coproduct)
    })
  })

  describe('Arrow families', () => {
    it('extracts domain and codomain families', () => {
      const V1: EnhancedVect.VectObj = { dim: 1 }
      const V2: EnhancedVect.VectObj = { dim: 2 }
      
      const morphFam: IndexedFamilies.Family<string, { f: EnhancedVect.VectMor }> = (i: string) => ({
        f: {
          matrix: i === 'id' ? [[1]] : [[2]],
          from: V1,
          to: i === 'double' ? V1 : V2
        }
      })
      
      const domainFam = ArrowFamilies.domFam(EnhancedVect.Vect, morphFam)
      const codomainFam = ArrowFamilies.codFam(EnhancedVect.Vect, morphFam)
      
      expect(domainFam('id')).toBe(V1)
      expect(domainFam('proj')).toBe(V1)
      expect(codomainFam('id')).toBe(V1)
      expect(codomainFam('proj')).toBe(V2)
    })
  })

  // Property tests for categorical laws
  describe('Reindexing Functoriality Laws (Property Tests)', () => {
    test('reindex id neutral and composition functorial', () => {
      // Test with simple arrays to avoid fast-check dependency
      const testArrays = [[], [1], [1, 2], [1, 2, 3]]
      
      for (const arr of testArrays) {
        const { I, fam } = IndexedFamilies.familyFromArray(arr)
        
        // Test id neutrality: reindex(id, fam) = fam
        const id = (i: number) => i
        const r1 = IndexedFamilies.reindex(id, fam)
        for (const i of I) {
          expect(r1(i)).toBe(fam(i))
        }
        
        // Test composition: reindex(v∘u, fam) = reindex(u, reindex(v, fam))
        const u = (j: number) => j % 2
        const v = (k: number) => k + 1
        const vu = (k: number) => u(v(k))
        
        const comp1 = IndexedFamilies.reindex(vu, fam)
        const comp2 = IndexedFamilies.reindex(u, IndexedFamilies.reindex(v, fam))
        
        const testIndices = [0, 1, 2]
        for (const k of testIndices) {
          if (v(k) < I.length) {
            expect(comp1(k)).toBe(comp2(k))
          }
        }
      }
    })
  })

  describe('Kan Extensions over Discrete Indices (Property Tests)', () => {
    test('Lan = Σ over fibers; Ran = Π over fibers (count check)', () => {
      const Jcar = [0, 1, 2, 3]
      const u = (j: number) => j % 2 // map to {0, 1}
      const Jfin = { carrier: Jcar }
      const fam: IndexedFamilies.EnumFamily<number, number> = (j) => ({
        enumerate: () => Array.from({ length: (j % 3) }, (_, k) => k)
      })
      
      const Lan = IndexedFamilies.lanEnum(u, Jfin, fam)
      const Ran = IndexedFamilies.ranEnum(u, Jfin, fam)
      const Ifin = { carrier: IndexedFamilies.imageCarrier(Jcar, u) }
      
      for (const i of Ifin.carrier) {
        const fiber = Jcar.filter((j) => u(j) === i)
        const sigmaSize = fiber.reduce((acc, j) => acc + fam(j).enumerate().length, 0)
        const piSize = fiber.reduce((acc, j) => acc * (fam(j).enumerate().length || 1), 1)
        
        expect(Lan(i).enumerate().length).toBe(sigmaSize)
        expect(Ran(i).enumerate().length).toBe(piSize)
      }
    })
  })

  describe('Triangle Identity for Σ ⊣ pullback', () => {
    test('u^* ε ∘ η = id elementwise', () => {
      const Icar = [0, 1, 2]
      const Ifin = { carrier: Icar }
      const u = (j: number) => j // identity for clarity
      const Y: IndexedFamilies.EnumFamily<number, number> = (i) => ({
        enumerate: () => Array.from({ length: (i % 3) + 1 }, (_, k) => k)
      })
      
      // η_j: y ↦ (j, y)
      const eta = (j: number, y: number) => ({ j, y })
      // ε_i: (j, y) ↦ y (when i=j)
      const eps = (_i: number, pair: { j: number; y: number }) => pair.y

      for (const j of Ifin.carrier) {
        for (const y of Y(u(j)).enumerate()) {
          const y2 = eps(u(j), eta(j, y))
          expect(y2).toBe(y)
        }
      }
    })
  })

  describe('Beck-Chevalley (Property Tests)', () => {
    test('f^* Σ_w ≅ Σ_u v^* (counts match)', () => {
      const Icar = [0, 1, 2]
      const Kcar = [0, 1, 2]
      const L = [0, 1]
      const f = (i: number) => L[i % L.length]!
      const w = (k: number) => L[k % L.length]!
      const Ifin = { carrier: Icar }
      const Kfin = { carrier: Kcar }
      const { Jfin, u, v } = IndexedFamilies.pullbackIndices(Ifin, Kfin, f, w)
      const G: IndexedFamilies.EnumFamily<number, number> = (k) => ({
        enumerate: () => Array.from({ length: (k % 3) + 1 }, (_, t) => t)
      })

      // Left: f^* (Σ_w G)
      const Lan_w = ((kFam: typeof G) => (i: number) => {
        const l = f(i)
        const fiber = Kcar.filter((k) => w(k) === l)
        return {
          enumerate: () => fiber.flatMap((k) => kFam(k).enumerate().map((x) => ({ k, x })))
        }
      })(G)

      // Right: Σ_u (v^* G)
      const vPull = (jk: readonly [number, number]) => G(v(jk))
      const Sigma_u = ((jFam: typeof vPull) => (i: number) => {
        const fiber = Jfin.carrier.filter((jk) => u(jk) === i)
        return {
          enumerate: () => fiber.flatMap((jk) => jFam(jk).enumerate().map((x) => ({ jk, x })))
        }
      })(vPull)

      for (const i of Ifin.carrier) {
        expect(Lan_w(i).enumerate().length).toBe(Sigma_u(i).enumerate().length)
      }
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

  describe('Kan (discrete) in Vect', () => {
    test('Lan_u uses coproduct over fibers; Ran_u uses product over fibers', () => {
      const I = [0, 1] as const
      const J = [0, 1, 2, 3] as const
      const Ifin = { carrier: I as readonly number[] }
      const Jfin = { carrier: J as readonly number[] }
      const u = (j: number) => j % 2

      const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (j) => ({ dim: j + 1 })

      const Lan = CategoryLimits.lanDiscretePre(Ifin, Jfin, u, F, EnhancedVect.VectHasFiniteCoproducts)
      const Ran = CategoryLimits.ranDiscretePre(Ifin, Jfin, u, F, EnhancedVect.VectHasFiniteProducts)

      // fibers: i=0 -> {0,2} dims 1+3=4; i=1 -> {1,3} dims 2+4=6
      expect(Lan.at(0).dim).toBe(4)
      expect(Lan.at(1).dim).toBe(6)
      expect(Ran.at(0).dim).toBe(4)
      expect(Ran.at(1).dim).toBe(6)

      // check there are exactly 2 injections/projections per i
      expect(Lan.injections(0).length).toBe(2)
      expect(Lan.injections(1).length).toBe(2)
      expect(Ran.projections(0).length).toBe(2)
      expect(Ran.projections(1).length).toBe(2)
    })

    test('Kan extensions preserve universal properties', () => {
      // Test that injections/projections have correct domains/codomains
      const I = [0, 1]
      const J = [0, 1, 2]
      const Ifin = { carrier: I }
      const Jfin = { carrier: J }
      const u = (j: number) => j < 2 ? 0 : 1 // fiber 0: {0,1}, fiber 1: {2}

      const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (j) => ({ dim: j + 1 })

      const Lan = CategoryLimits.lanDiscretePre(Ifin, Jfin, u, F, EnhancedVect.VectHasFiniteCoproducts)
      
      // Check injection structure for i=0 (fiber {0,1})
      const injs0 = Lan.injections(0)
      expect(injs0.length).toBe(2)
      
      // First injection should be from F(0) = {dim:1} to Lan(0) = {dim:3}
      const [j0, inj0] = injs0[0]!
      expect(j0).toBe(0)
      expect(EnhancedVect.Vect.dom(inj0).dim).toBe(1) // F(0).dim
      expect(EnhancedVect.Vect.cod(inj0).dim).toBe(3) // Lan(0).dim = 1+2
    })
  })
})