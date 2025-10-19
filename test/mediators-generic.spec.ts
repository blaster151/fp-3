import { describe, test, expect } from 'vitest'
import {
  EnhancedVect,
  CategoryLimits,
  IndexedFamilies
} from '../allTS'

const emptyDiagramFor = <I>(): CategoryLimits.Diagram<I, EnhancedVect.VectMor> => ({ arrows: [] })

const randMat = (r: number, c: number) =>
  Array.from({ length: r }, () => Array.from({ length: c }, () => (Math.random() < 0.5 ? 0 : 1)))

describe('mediateProduct / isProductForCone (Vect)', () => {
  test('build canonical mediator, recover arrow, and rebuild cone', () => {
    const X: EnhancedVect.VectObj = { dim: 3 }
    const [V1, V2]: readonly [EnhancedVect.VectObj, EnhancedVect.VectObj] = [{ dim: 2 }, { dim: 1 }]
    const { I, Ifin } = IndexedFamilies.familyFromArray([0, 1]) // indices 0,1
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const f0: EnhancedVect.VectMor = { matrix: randMat(X.dim, V1.dim), from: X, to: V1 }
    const f1: EnhancedVect.VectMor = { matrix: randMat(X.dim, V2.dim), from: X, to: V2 }
    const diagram = emptyDiagramFor<number>()

    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => (i === 0 ? f0 : f1),
      diagram,
    }

    // generic mediate
    const { product: P, projections, mediator } =
      CategoryLimits.mediateProduct(Ifin, F, EnhancedVect.VectProductsWithTuple, X, cone.legs)

    const witness: CategoryLimits.ProductLimitWitness<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      limitCone: {
        tip: P,
        legs: (i: number) => projections(i),
        diagram,
      },
      tuple: EnhancedVect.VectProductsWithTuple.tuple,
    }

    // triangles via generic predicate
    const { triangles, unique, mediator: checkMediator } =
      CategoryLimits.isProductForCone(
        EnhancedVect.Vect,
        EnhancedVect.Vect.equalMor!,
        Ifin,
        F,
        P,
        projections,
        cone,
        EnhancedVect.VectProductsWithTuple.tuple
      )

    expect(triangles).toBe(true)
    expect(unique).toBe(true)
    expect(EnhancedVect.Vect.equalMor!(checkMediator!, mediator)).toBe(true)

    const arrowLift = CategoryLimits.arrowFromCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      witness,
      cone,
    )

    expect(arrowLift.success).toBe(true)
    if (!arrowLift.success) throw new Error('expected arrow lifting to succeed')
    expect(EnhancedVect.Vect.equalMor!(arrowLift.arrow, mediator)).toBe(true)

    const liftedCone = CategoryLimits.coneFromArrow(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      witness,
      arrowLift.arrow,
    )

    expect(liftedCone.constructed).toBe(true)
    if (!liftedCone.constructed) throw new Error('expected cone reconstruction to succeed')

    const reconstructed = liftedCone.cone
    expect(reconstructed.tip).toBe(cone.tip)
    for (const index of Ifin.carrier) {
      expect(EnhancedVect.Vect.equalMor!(reconstructed.legs(index), cone.legs(index))).toBe(true)
    }

    const roundTrip = CategoryLimits.arrowFromCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      witness,
      reconstructed,
    )

    expect(roundTrip.success).toBe(true)
    if (!roundTrip.success) throw new Error('expected round-trip arrow to exist')
    expect(EnhancedVect.Vect.equalMor!(roundTrip.arrow, arrowLift.arrow)).toBe(true)

    // Cross-check with "shape-only" product
    const { product: P2, projections: proj2 } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    expect(P2.dim).toBe(P.dim)
    expect(proj2(0).to.dim).toBe(V1.dim)
    expect(proj2(1).to.dim).toBe(V2.dim)
  })

  test('generic mediator matches specialized construction', () => {
    const X: EnhancedVect.VectObj = { dim: 2 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Ifin = { carrier: [0, 1] }
    const F = (i: number) => (i === 0 ? V1 : V2)
    
    const f0: EnhancedVect.VectMor = { matrix: [[1], [2]], from: X, to: V1 }
    const f1: EnhancedVect.VectMor = { matrix: [[3], [4]], from: X, to: V2 }
    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => (i === 0 ? f0 : f1),
      diagram: emptyDiagramFor<number>(),
    }
    
    // Generic construction
    const { mediator: generic } = CategoryLimits.mediateProduct(
      Ifin, F, EnhancedVect.VectProductsWithTuple, X, cone.legs
    )
    
    // Specialized construction
    const { product: P } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    const specialized = EnhancedVect.tupleVectFromCone(Ifin, cone, P)
    
    // Should be identical
    expect(EnhancedVect.Vect.equalMor!(generic, specialized)).toBe(true)
  })

  test('arrowFromCone rejects cones that fail validation', () => {
    const X: EnhancedVect.VectObj = { dim: 1 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Ifin = { carrier: [0, 1] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const diagram = emptyDiagramFor<number>()
    const goodCone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => ({
        matrix: [[i === 0 ? 1 : 2]],
        from: X,
        to: i === 0 ? V1 : V2,
      }),
      diagram,
    }

    const { product: P, projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    const witness: CategoryLimits.ProductLimitWitness<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      limitCone: {
        tip: P,
        legs: (i: number) => projections(i),
        diagram,
      },
      tuple: EnhancedVect.VectProductsWithTuple.tuple,
    }

    const malformedCone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) =>
        i === 0
          ? { matrix: [[3]], from: X, to: V1 }
          : { matrix: [[4]], from: { dim: 2 }, to: V2 },
      diagram,
    }

    const okLift = CategoryLimits.arrowFromCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      witness,
      goodCone,
    )

    expect(okLift.success).toBe(true)

    const badLift = CategoryLimits.arrowFromCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      witness,
      malformedCone,
    )

    expect(badLift.success).toBe(false)
    if (badLift.success) throw new Error('expected malformed cone to be rejected')
    expect(badLift.reason).toMatch(/has domain/i)
  })

  test('arrowFromCone rejects cones with mismatched diagrams', () => {
    const X: EnhancedVect.VectObj = { dim: 1 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Ifin = { carrier: [0, 1] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const baseDiagram = emptyDiagramFor<number>()
    const twistedDiagram: CategoryLimits.Diagram<number, EnhancedVect.VectMor> = {
      arrows: [
        {
          source: 0,
          target: 1,
          morphism: { matrix: [[1]], from: V1, to: V2 },
        },
      ],
    }

    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => ({ matrix: [[1]], from: X, to: i === 0 ? V1 : V2 }),
      diagram: twistedDiagram,
    }

    const { product: P, projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    const witness: CategoryLimits.ProductLimitWitness<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      limitCone: {
        tip: P,
        legs: (i: number) => projections(i),
        diagram: baseDiagram,
      },
      tuple: EnhancedVect.VectProductsWithTuple.tuple,
    }

    const lift = CategoryLimits.arrowFromCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      witness,
      cone,
    )

    expect(lift.success).toBe(false)
    if (lift.success) throw new Error('expected mismatched diagram to be rejected')
    expect(lift.reason).toMatch(/does not match the fixed limit diagram/)
  })

  test('uniqueness flag detects competing mediator', () => {
    const X: EnhancedVect.VectObj = { dim: 1 }
    const [V1, V2]: readonly [EnhancedVect.VectObj, EnhancedVect.VectObj] = [{ dim: 1 }, { dim: 1 }]
    const { Ifin } = IndexedFamilies.familyFromArray([0, 1])
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const f0: EnhancedVect.VectMor = { matrix: [[2]], from: X, to: V1 }
    const f1: EnhancedVect.VectMor = { matrix: [[3]], from: X, to: V2 }
    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => (i === 0 ? f0 : f1),
      diagram: emptyDiagramFor<number>(),
    }

    const dims = Ifin.carrier.map((i) => F(i).dim)
    const total = dims.reduce((a, b) => a + b, 0) + 1 // add a ghost coordinate unseen by projections
    const productWithGhost: EnhancedVect.VectObj = { dim: total }

    const projectionsWithGhost: IndexedFamilies.Family<number, EnhancedVect.VectMor> = (i) => {
      const idx = Ifin.carrier.indexOf(i)
      const rows = F(i).dim
      const matrix = Array.from({ length: rows }, () => Array(total).fill(0))
      const offset = dims.slice(0, idx).reduce((acc, d) => acc + d, 0)
      for (let r = 0; r < rows; r++) matrix[r]![offset + r] = 1
      return { matrix, from: productWithGhost, to: F(i) }
    }

    const tupleWithGhost = (
      domain: EnhancedVect.VectObj,
      legs: ReadonlyArray<EnhancedVect.VectMor>,
      product: EnhancedVect.VectObj
    ): EnhancedVect.VectMor => {
      const matrix = Array.from({ length: domain.dim }, () => Array(product.dim).fill(0))
      let offset = 0
      for (const leg of legs) {
        for (let r = 0; r < domain.dim; r++) {
          for (let c = 0; c < leg.to.dim; c++) {
            matrix[r]![offset + c] = leg.matrix[r]![c]
          }
        }
        offset += leg.to.dim
      }
      return { matrix, from: domain, to: product }
    }

    const legsArr = Ifin.carrier.map((i) => cone.legs(i))
    const canonical = tupleWithGhost(cone.tip, legsArr, productWithGhost)

    const baseline = CategoryLimits.isProductForCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      productWithGhost,
      projectionsWithGhost,
      cone,
      tupleWithGhost,
      { competitor: canonical }
    )

    expect(baseline.triangles).toBe(true)
    expect(baseline.unique).toBe(true)

    const ghostIndex = productWithGhost.dim - 1
    const perturbedMatrix = canonical.matrix.map((row) =>
      row.map((value, c) => (c === ghostIndex ? value + 5 : value))
    )
    const competitor: EnhancedVect.VectMor = {
      matrix: perturbedMatrix,
      from: canonical.from,
      to: canonical.to
    }

    const verification = CategoryLimits.isProductForCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      productWithGhost,
      projectionsWithGhost,
      cone,
      tupleWithGhost,
      { competitor }
    )

    expect(verification.triangles).toBe(true)
    expect(verification.unique).toBe(false)
  })

  test('rejects cones that ignore diagram compatibility', () => {
    const X: EnhancedVect.VectObj = { dim: 1 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Ifin = { carrier: [0, 1] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const incompatibleDiagram: CategoryLimits.Diagram<number, EnhancedVect.VectMor> = {
      arrows: [
        { source: 0, target: 1, morphism: { matrix: [[1]], from: V1, to: V2 } },
      ],
    }

    const f0: EnhancedVect.VectMor = { matrix: [[1]], from: X, to: V1 }
    const f1: EnhancedVect.VectMor = { matrix: [[0]], from: X, to: V2 }
    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => (i === 0 ? f0 : f1),
      diagram: incompatibleDiagram,
    }

    const { product: P, projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    const canonical = EnhancedVect.tupleVectFromCone(Ifin, cone, P)
    expect(
      CategoryLimits.productMediates(
        EnhancedVect.Vect,
        EnhancedVect.Vect.equalMor!,
        projections,
        canonical,
        cone,
        Ifin.carrier,
      ),
    ).toBe(true)

    const result = CategoryLimits.isProductForCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      P,
      projections,
      cone,
      EnhancedVect.VectProductsWithTuple.tuple,
    )

    expect(result.triangles).toBe(false)
    expect(result.unique).toBe(false)
  })

  test('rejects cones whose legs fail the tip/codomain checks', () => {
    const X: EnhancedVect.VectObj = { dim: 1 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Ifin = { carrier: [0, 1] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const wrongDomainLeg: EnhancedVect.VectMor = { matrix: [[1], [0]], from: { dim: 2 }, to: V1 }
    const validLeg: EnhancedVect.VectMor = { matrix: [[1]], from: X, to: V2 }

    const domainCone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => (i === 0 ? wrongDomainLeg : validLeg),
      diagram: emptyDiagramFor<number>(),
    }

    const { product: P, projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    const domainResult = CategoryLimits.isProductForCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      P,
      projections,
      domainCone,
      EnhancedVect.VectProductsWithTuple.tuple,
    )

    expect(domainResult.triangles).toBe(false)
    expect(domainResult.unique).toBe(false)
    expect(domainResult.reason).toBeDefined()
    expect(domainResult.reason).toMatch(/domain/i)

    const wrongCodLeg: EnhancedVect.VectMor = { matrix: [[2]], from: X, to: V1 }
    const codCone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i: number) => (i === 0 ? { matrix: [[3]], from: X, to: V1 } : wrongCodLeg),
      diagram: emptyDiagramFor<number>(),
    }

    const codResult = CategoryLimits.isProductForCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      P,
      projections,
      codCone,
      EnhancedVect.VectProductsWithTuple.tuple,
    )

    expect(codResult.triangles).toBe(false)
    expect(codResult.unique).toBe(false)
    expect(codResult.reason).toBeDefined()
    expect(codResult.reason).toMatch(/targets/i)
  })

  test('validateConeAgainstDiagram and extendConeToClosure track closure arrows', () => {
    const V0: EnhancedVect.VectObj = { dim: 1 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const tip: EnhancedVect.VectObj = { dim: 1 }

    const Ifin = { carrier: [0, 1, 2] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => {
      if (i === 0) return V0
      if (i === 1) return V1
      return V2
    }

    const f01: EnhancedVect.VectMor = { matrix: [[1]], from: V0, to: V1 }
    const f12: EnhancedVect.VectMor = { matrix: [[1]], from: V1, to: V2 }

    const diagram = CategoryLimits.finiteDiagramFromPoset({
      base: EnhancedVect.Vect,
      eq: EnhancedVect.Vect.equalMor!,
      poset: {
        objects: Ifin.carrier.slice(),
        leq: (a: number, b: number) => a <= b,
      },
      onObjects: F,
      cover: [
        { source: 0, target: 1, morphism: f01 },
        { source: 1, target: 2, morphism: f12 },
      ],
    })

    const leg0: EnhancedVect.VectMor = { matrix: [[1]], from: tip, to: V0 }
    const leg1: EnhancedVect.VectMor = { matrix: [[1]], from: tip, to: V1 }
    const leg2: EnhancedVect.VectMor = { matrix: [[1]], from: tip, to: V2 }

    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip,
      legs: (i: number) => (i === 0 ? leg0 : i === 1 ? leg1 : leg2),
      diagram,
    }

    const validation = CategoryLimits.validateConeAgainstDiagram({
      category: EnhancedVect.Vect,
      eq: EnhancedVect.Vect.equalMor!,
      indices: Ifin,
      onObjects: F,
      cone,
    })

    expect(validation.valid).toBe(true)

    const closure = CategoryLimits.extendConeToClosure({
      category: EnhancedVect.Vect,
      eq: EnhancedVect.Vect.equalMor!,
      indices: Ifin,
      onObjects: F,
      cone,
    })

    expect(closure.extended).toBe(true)
    if (!closure.extended) throw new Error('expected closure to succeed')
    if (!('arrows' in closure.cone.diagram)) {
      throw new Error('expected closure diagram to enumerate arrows explicitly')
    }
    const closureArrows = closure.cone.diagram.arrows
    const hasComposite = closureArrows.some(
      (arrow: CategoryLimits.DiagramArrow<number, EnhancedVect.VectMor>) =>
        arrow.source === 0 && arrow.target === 2,
    )
    expect(hasComposite).toBe(true)

    const brokenCone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip,
      legs: (i: number) => (i === 2 ? { matrix: [[2]], from: tip, to: V2 } : cone.legs(i)),
      diagram,
    }

    const brokenValidation = CategoryLimits.validateConeAgainstDiagram({
      category: EnhancedVect.Vect,
      eq: EnhancedVect.Vect.equalMor!,
      indices: Ifin,
      onObjects: F,
      cone: brokenCone,
    })

    expect(brokenValidation.valid).toBe(false)
    expect(brokenValidation.reason).toMatch(/does not commute/i)

    const brokenClosure = CategoryLimits.extendConeToClosure({
      category: EnhancedVect.Vect,
      eq: EnhancedVect.Vect.equalMor!,
      indices: Ifin,
      onObjects: F,
      cone: brokenCone,
    })

    expect(brokenClosure.extended).toBe(false)
    if (brokenClosure.extended) {
      throw new Error('expected broken closure to fail')
    }
    expect(brokenClosure.reason).toBeDefined()
    expect(brokenClosure.reason).toMatch(/does not commute/i)
  })

  test('coneFromArrow rejects arrows that miss the product', () => {
    const X: EnhancedVect.VectObj = { dim: 1 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Ifin = { carrier: [0, 1] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const { product: P, projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)
    const diagram = emptyDiagramFor<number>()
    const witness: CategoryLimits.ProductLimitWitness<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      limitCone: {
        tip: P,
        legs: (i: number) => projections(i),
        diagram,
      },
      tuple: EnhancedVect.VectProductsWithTuple.tuple,
    }
    const wrongTarget: EnhancedVect.VectObj = { dim: 2 }
    const arrow: EnhancedVect.VectMor = { matrix: [[1, 0]], from: X, to: wrongTarget }

    const lift = CategoryLimits.coneFromArrow(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      witness,
      arrow,
    )

    expect(lift.constructed).toBe(false)
    if (lift.constructed) {
      throw new Error('expected coneFromArrow to fail for mismatched target')
    }
    expect(lift.reason).toMatch(/must target the advertised product object/)
  })
})

describe('mediateCoproduct / isCoproductForCocone (Vect)', () => {
  test('build canonical cotuple, recover arrow, and rebuild cocone', () => {
    const [V1, V2]: readonly [EnhancedVect.VectObj, EnhancedVect.VectObj] = [{ dim: 2 }, { dim: 1 }]
    const Y: EnhancedVect.VectObj = { dim: 3 }
    const { I, Ifin } = IndexedFamilies.familyFromArray([0, 1])
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const g0: EnhancedVect.VectMor = { matrix: randMat(V1.dim, Y.dim), from: V1, to: Y }
    const g1: EnhancedVect.VectMor = { matrix: randMat(V2.dim, Y.dim), from: V2, to: Y }
    const cocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i: number) => (i === 0 ? g0 : g1),
      diagram: emptyDiagramFor<number>(),
    }

    const { coproduct: C, injections, mediator } =
      CategoryLimits.mediateCoproduct(Ifin, F, EnhancedVect.VectCoproductsWithCotuple, Y, cocone.legs)

    const { triangles, unique, mediator: coprodMediator } =
      CategoryLimits.isCoproductForCocone(
        EnhancedVect.Vect,
        EnhancedVect.Vect.equalMor!,
        Ifin,
        F,
        C,
        injections,
        cocone,
        EnhancedVect.VectCoproductsWithCotuple.cotuple
      )

    expect(triangles).toBe(true)
    expect(unique).toBe(true)
    expect(EnhancedVect.Vect.equalMor!(coprodMediator!, mediator)).toBe(true)

    const arrowLift = CategoryLimits.arrowFromCocone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      C,
      injections,
      cocone,
      EnhancedVect.VectCoproductsWithCotuple.cotuple,
    )

    expect(arrowLift.success).toBe(true)
    if (!arrowLift.success) throw new Error('expected cocone arrow lift to succeed')
    expect(EnhancedVect.Vect.equalMor!(arrowLift.arrow, mediator)).toBe(true)

    const reconstructed = CategoryLimits.coconeFromArrow(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      C,
      injections,
      arrowLift.arrow,
      cocone.diagram,
    )

    expect(reconstructed.constructed).toBe(true)
    if (!reconstructed.constructed) throw new Error('expected cocone reconstruction to succeed')
    const rebuilt = reconstructed.cocone
    expect(rebuilt.coTip).toBe(cocone.coTip)
    for (const index of Ifin.carrier) {
      expect(EnhancedVect.Vect.equalMor!(rebuilt.legs(index), cocone.legs(index))).toBe(true)
    }

    const roundTrip = CategoryLimits.arrowFromCocone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      C,
      injections,
      rebuilt,
      EnhancedVect.VectCoproductsWithCotuple.cotuple,
    )

    expect(roundTrip.success).toBe(true)
    if (!roundTrip.success) throw new Error('expected cocone arrow round-trip to succeed')
    expect(EnhancedVect.Vect.equalMor!(roundTrip.arrow, arrowLift.arrow)).toBe(true)

    // Cross-check with "shape-only" coproduct
    const { coproduct: C2, injections: inj2 } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)
    expect(C2.dim).toBe(C.dim)
    expect(inj2(0).from.dim).toBe(V1.dim)
    expect(inj2(1).from.dim).toBe(V2.dim)
  })

  test('generic mediator matches specialized construction', () => {
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Y: EnhancedVect.VectObj = { dim: 2 }
    const Ifin = { carrier: [0, 1] }
    const F = (i: number) => (i === 0 ? V1 : V2)
    
    const g0: EnhancedVect.VectMor = { matrix: [[1, 0]], from: V1, to: Y }
    const g1: EnhancedVect.VectMor = { matrix: [[0, 1]], from: V2, to: Y }
    const cocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i: number) => (i === 0 ? g0 : g1),
      diagram: emptyDiagramFor<number>(),
    }
    
    // Generic construction
    const { mediator: generic } = CategoryLimits.mediateCoproduct(
      Ifin, F, EnhancedVect.VectCoproductsWithCotuple, Y, cocone.legs
    )
    
    // Specialized construction
    const { coproduct: C } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)
    const specialized = EnhancedVect.cotupleVectFromCocone(Ifin, cocone, C)
    
    // Should be identical
    expect(EnhancedVect.Vect.equalMor!(generic, specialized)).toBe(true)
  })

  test('uniqueness flag detects competing cotuple', () => {
    const [V1, V2]: readonly [EnhancedVect.VectObj, EnhancedVect.VectObj] = [{ dim: 1 }, { dim: 1 }]
    const Y: EnhancedVect.VectObj = { dim: 1 }
    const { Ifin } = IndexedFamilies.familyFromArray([0, 1])
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const g0: EnhancedVect.VectMor = { matrix: [[4]], from: V1, to: Y }
    const g1: EnhancedVect.VectMor = { matrix: [[7]], from: V2, to: Y }
    const cocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i: number) => (i === 0 ? g0 : g1),
      diagram: emptyDiagramFor<number>(),
    }

    const dims = Ifin.carrier.map((i) => F(i).dim)
    const total = dims.reduce((a, b) => a + b, 0) + 1
    const coproductWithGhost: EnhancedVect.VectObj = { dim: total }

    const injectionsWithGhost: IndexedFamilies.Family<number, EnhancedVect.VectMor> = (i) => {
      const idx = Ifin.carrier.indexOf(i)
      const cols = F(i).dim
      const matrix = Array.from({ length: total }, () => Array(cols).fill(0))
      const offset = dims.slice(0, idx).reduce((acc, d) => acc + d, 0)
      for (let r = 0; r < cols; r++) matrix[offset + r]![r] = 1
      return { matrix, from: F(i), to: coproductWithGhost }
    }

    const cotupleWithGhost = (
      coproduct: EnhancedVect.VectObj,
      legs: ReadonlyArray<EnhancedVect.VectMor>,
      codomain: EnhancedVect.VectObj
    ): EnhancedVect.VectMor => {
      const matrix = Array.from({ length: coproduct.dim }, () => Array(codomain.dim).fill(0))
      let offset = 0
      for (const leg of legs) {
        for (let r = 0; r < leg.from.dim; r++) {
          for (let c = 0; c < codomain.dim; c++) {
            matrix[offset + r]![c] = leg.matrix[r]![c]
          }
        }
        offset += leg.from.dim
      }
      return { matrix, from: coproduct, to: codomain }
    }

    const legsArr = Ifin.carrier.map((i) => cocone.legs(i))
    const canonical = cotupleWithGhost(coproductWithGhost, legsArr, cocone.coTip)

    const baseline = CategoryLimits.isCoproductForCocone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      coproductWithGhost,
      injectionsWithGhost,
      cocone,
      cotupleWithGhost,
      { competitor: canonical }
    )

    expect(baseline.triangles).toBe(true)
    expect(baseline.unique).toBe(true)

    const ghostRow = coproductWithGhost.dim - 1
    const perturbedMatrix = canonical.matrix.map((row, r) =>
      row.map((value, c) => (r === ghostRow ? value + 3 : value))
    )
    const competitor: EnhancedVect.VectMor = {
      matrix: perturbedMatrix,
      from: canonical.from,
      to: canonical.to
    }

    const verification = CategoryLimits.isCoproductForCocone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      coproductWithGhost,
      injectionsWithGhost,
      cocone,
      cotupleWithGhost,
      { competitor }
    )

    expect(verification.triangles).toBe(true)
    expect(verification.unique).toBe(false)
  })
  
  test('rejects cocones that ignore diagram compatibility', () => {
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Y: EnhancedVect.VectObj = { dim: 1 }
    const Ifin = { carrier: [0, 1] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const incompatibleDiagram: CategoryLimits.Diagram<number, EnhancedVect.VectMor> = {
      arrows: [
        { source: 0, target: 1, morphism: { matrix: [[1]], from: V1, to: V2 } },
      ],
    }

    const g0: EnhancedVect.VectMor = { matrix: [[0]], from: V1, to: Y }
    const g1: EnhancedVect.VectMor = { matrix: [[1]], from: V2, to: Y }
    const cocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i: number) => (i === 0 ? g0 : g1),
      diagram: incompatibleDiagram,
    }

    const { coproduct: C, injections } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)
    const canonical = EnhancedVect.cotupleVectFromCocone(Ifin, cocone, C)
    expect(
      CategoryLimits.coproductMediates(
        EnhancedVect.Vect,
        EnhancedVect.Vect.equalMor!,
        injections,
        canonical,
        cocone,
        Ifin.carrier,
      ),
    ).toBe(true)

    const result = CategoryLimits.isCoproductForCocone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      C,
      injections,
      cocone,
      EnhancedVect.VectCoproductsWithCotuple.cotuple,
    )

    expect(result.triangles).toBe(false)
    expect(result.unique).toBe(false)
  })

  test('rejects cocones whose legs fail the tip/codomain checks', () => {
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Y: EnhancedVect.VectObj = { dim: 1 }
    const Ifin = { carrier: [0, 1] }
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const wrongDomainLeg: EnhancedVect.VectMor = { matrix: [[1], [0]], from: { dim: 2 }, to: Y }
    const validLeg: EnhancedVect.VectMor = { matrix: [[1]], from: V2, to: Y }

    const domainCocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i: number) => (i === 0 ? wrongDomainLeg : validLeg),
      diagram: emptyDiagramFor<number>(),
    }

    const { coproduct: C, injections } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)
    const domainResult = CategoryLimits.isCoproductForCocone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      C,
      injections,
      domainCocone,
      EnhancedVect.VectCoproductsWithCotuple.cotuple,
    )

    expect(domainResult.triangles).toBe(false)
    expect(domainResult.unique).toBe(false)
    expect(domainResult.reason).toBeDefined()
    expect(domainResult.reason).toMatch(/domain/i)

    const wrongCodLeg: EnhancedVect.VectMor = { matrix: [[1]], from: V2, to: V1 }
    const codCocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i: number) => (i === 0 ? { matrix: [[1]], from: V1, to: Y } : wrongCodLeg),
      diagram: emptyDiagramFor<number>(),
    }

    const codResult = CategoryLimits.isCoproductForCocone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      C,
      injections,
      codCocone,
      EnhancedVect.VectCoproductsWithCotuple.cotuple,
    )

    expect(codResult.triangles).toBe(false)
    expect(codResult.unique).toBe(false)
    expect(codResult.reason).toBeDefined()
    expect(codResult.reason).toMatch(/targets/i)
  })

  test('coconeFromArrow rejects arrows whose domain misses the coproduct', () => {
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }
    const Y: EnhancedVect.VectObj = { dim: 1 }
    const { Ifin } = IndexedFamilies.familyFromArray([0, 1])
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const { coproduct: C, injections } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)
    const wrongSource: EnhancedVect.VectObj = { dim: 2 }
    const arrow: EnhancedVect.VectMor = { matrix: [[1], [0]], from: wrongSource, to: Y }

    const lift = CategoryLimits.coconeFromArrow(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      C,
      injections,
      arrow,
      emptyDiagramFor<number>(),
    )

    expect(lift.constructed).toBe(false)
    if (lift.constructed) {
      throw new Error('expected coconeFromArrow to fail for mismatched source')
    }
    expect(lift.reason).toMatch(/arrow must originate at the advertised coproduct object/)
  })
})

describe('Generic universal property framework', () => {
  test('mediateProduct provides complete universal property solution', () => {
    const X: EnhancedVect.VectObj = { dim: 2 }
    const family = (i: number) => ({ dim: i + 1 })
    const Ifin = { carrier: [0, 1, 2] }
    
    // Create legs
    const legs = (i: number): EnhancedVect.VectMor => ({
      matrix: Array.from({ length: X.dim }, () => Array.from({ length: i + 1 }, () => Math.floor(Math.random() * 2))),
      from: X,
      to: family(i)
    })
    
    // Use generic mediator
    const result = CategoryLimits.mediateProduct(
      Ifin, 
      family, 
      EnhancedVect.VectProductsWithTuple, 
      X, 
      legs
    )
    
    expect(result.product.dim).toBe(6) // 1+2+3
    expect(result.mediator.from).toBe(X)
    expect(result.mediator.to).toBe(result.product)
    
    // Verify universal property
    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs,
      diagram: emptyDiagramFor<number>(),
    }
    
    const verification = CategoryLimits.isProductForCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      family,
      result.product,
      result.projections,
      cone,
      EnhancedVect.VectProductsWithTuple.tuple
    )
    
    expect(verification.triangles).toBe(true)
    expect(verification.unique).toBe(true)
  })
})