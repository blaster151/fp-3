import { describe, expect, it } from 'vitest'

import {
  CategoryLimits,
  EnhancedVect,
  IndexedFamilies,
} from '../../allTS'

const emptyDiagram: CategoryLimits.Diagram<number, EnhancedVect.VectMor> = { arrows: [] }

describe('CategoryLimits cone factoring helpers', () => {
  it('returns mediators that collapse cone legs for products', () => {
    const X: EnhancedVect.VectObj = { dim: 2 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 2 }

    const { Ifin } = IndexedFamilies.familyFromArray([0, 1] as const)
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const f0: EnhancedVect.VectMor = { matrix: [[1], [0]], from: X, to: V1 }
    const f1: EnhancedVect.VectMor = { matrix: [[0, 1], [1, 0]], from: X, to: V2 }

    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i) => (i === 0 ? f0 : f1),
      diagram: emptyDiagram,
    }

    const { product, projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)

    const factoring = CategoryLimits.factorConeThroughProduct(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      product,
      projections,
      cone,
      EnhancedVect.VectProductsWithTuple.tuple,
    )

    expect(factoring.factored).toBe(true)
    if (!factoring.factored || !factoring.mediator) {
      throw new Error('expected cone to factor through the product')
    }

    const mediator = factoring.mediator
    expect(factoring.unique).toBe(true)
    for (const index of Ifin.carrier) {
      const triangle = EnhancedVect.Vect.compose(projections(index), mediator)
      expect(EnhancedVect.Vect.equalMor!(triangle, cone.legs(index))).toBe(true)
    }

    const witness = CategoryLimits.isProductForCone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      product,
      projections,
      cone,
      EnhancedVect.VectProductsWithTuple.tuple,
      { competitor: mediator },
    )

    expect(witness.triangles).toBe(true)
    expect(witness.unique).toBe(true)
    expect(witness.mediator && EnhancedVect.Vect.equalMor!(witness.mediator, mediator)).toBe(true)
  })

  it('rejects malformed cones when factoring through products', () => {
    const X: EnhancedVect.VectObj = { dim: 1 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }

    const { Ifin } = IndexedFamilies.familyFromArray([0, 1] as const)
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const goodLeg: EnhancedVect.VectMor = { matrix: [[1]], from: X, to: V1 }
    const badLeg: EnhancedVect.VectMor = { matrix: [[1]], from: V1, to: V2 }

    const cone: CategoryLimits.Cone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      tip: X,
      legs: (i) => (i === 0 ? goodLeg : badLeg),
      diagram: emptyDiagram,
    }

    const { product, projections } = CategoryLimits.finiteProduct(Ifin, F, EnhancedVect.VectHasFiniteProducts)

    const factoring = CategoryLimits.factorConeThroughProduct(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      product,
      projections,
      cone,
      EnhancedVect.VectProductsWithTuple.tuple,
    )

    expect(factoring.factored).toBe(false)
    expect(factoring.reason).toMatch(/leg 1 has domain/)
  })

  it('returns mediators that collapse cocone legs for coproducts', () => {
    const Y: EnhancedVect.VectObj = { dim: 2 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }

    const { Ifin } = IndexedFamilies.familyFromArray([0, 1] as const)
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const g0: EnhancedVect.VectMor = { matrix: [[1], [0]], from: V1, to: Y }
    const g1: EnhancedVect.VectMor = { matrix: [[0], [1]], from: V2, to: Y }

    const cocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i) => (i === 0 ? g0 : g1),
      diagram: emptyDiagram,
    }

    const { coproduct, injections } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)

    const factoring = CategoryLimits.factorCoconeThroughCoproduct(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      coproduct,
      injections,
      cocone,
      EnhancedVect.VectCoproductsWithCotuple.cotuple,
    )

    expect(factoring.factored).toBe(true)
    if (!factoring.factored || !factoring.mediator) {
      throw new Error('expected cocone to factor through the coproduct')
    }

    const mediator = factoring.mediator
    expect(factoring.unique).toBe(true)
    for (const index of Ifin.carrier) {
      const triangle = EnhancedVect.Vect.compose(mediator, injections(index))
      expect(EnhancedVect.Vect.equalMor!(triangle, cocone.legs(index))).toBe(true)
    }

    const witness = CategoryLimits.isCoproductForCocone(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      coproduct,
      injections,
      emptyDiagram,
      cocone,
      EnhancedVect.VectCoproductsWithCotuple.cotuple,
      { competitor: mediator },
    )

    expect(witness.triangles).toBe(true)
    expect(witness.unique).toBe(true)
    expect(witness.mediator && EnhancedVect.Vect.equalMor!(witness.mediator, mediator)).toBe(true)
  })

  it('rejects malformed cocones when factoring through coproducts', () => {
    const Y: EnhancedVect.VectObj = { dim: 1 }
    const V1: EnhancedVect.VectObj = { dim: 1 }
    const V2: EnhancedVect.VectObj = { dim: 1 }

    const { Ifin } = IndexedFamilies.familyFromArray([0, 1] as const)
    const F: IndexedFamilies.Family<number, EnhancedVect.VectObj> = (i) => (i === 0 ? V1 : V2)

    const goodLeg: EnhancedVect.VectMor = { matrix: [[1]], from: V1, to: Y }
    const badLeg: EnhancedVect.VectMor = { matrix: [[1]], from: V1, to: V1 }

    const cocone: CategoryLimits.Cocone<number, EnhancedVect.VectObj, EnhancedVect.VectMor> = {
      coTip: Y,
      legs: (i) => (i === 0 ? goodLeg : badLeg),
      diagram: emptyDiagram,
    }

    const { coproduct, injections } = CategoryLimits.finiteCoproduct(Ifin, F, EnhancedVect.VectHasFiniteCoproducts)

    const factoring = CategoryLimits.factorCoconeThroughCoproduct(
      EnhancedVect.Vect,
      EnhancedVect.Vect.equalMor!,
      Ifin,
      F,
      coproduct,
      injections,
      cocone,
      EnhancedVect.VectCoproductsWithCotuple.cotuple,
    )

    expect(factoring.factored).toBe(false)
    expect(factoring.reason).toMatch(/leg 1 targets/)
  })
})
