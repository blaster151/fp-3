import { describe, expect, it } from 'vitest'
import {
  CategoryLimits,
  FinSet,
  FinSetCoproductsWithCotuple,
  IndexedFamilies,
  makeFinSetObj,
} from '../../allTS'
import type { FinSetMor, FinSetObj } from '../../allTS'

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  const equal = FinSet.equalMor?.(left, right)
  if (typeof equal === 'boolean') {
    expect(equal).toBe(true)
    return
  }

  expect(left.from).toBe(right.from)
  expect(left.to).toBe(right.to)
  expect(left.map.length).toBe(right.map.length)
  for (let idx = 0; idx < left.map.length; idx++) {
    expect(left.map[idx]).toBe(right.map[idx])
  }
}

describe('FinSet coproduct mediators', () => {
  it('builds mediators that commute with the coproduct injections', () => {
    const left = makeFinSetObj(['a0', 'a1'])
    const right = makeFinSetObj(['b0', 'b1', 'b2'])
    const codomain = makeFinSetObj(['c0', 'c1', 'c2'])

    const { obj: coproduct, injections } = FinSet.coproduct([left, right])

    const leftLeg: FinSetMor = { from: left, to: codomain, map: [1, 0] }
    const rightLeg: FinSetMor = { from: right, to: codomain, map: [2, 1, 2] }

    const mediator = FinSetCoproductsWithCotuple.cotuple(coproduct, [leftLeg, rightLeg], codomain)

    expectEqualArrows(FinSet.compose(mediator, injections[0]!), leftLeg)
    expectEqualArrows(FinSet.compose(mediator, injections[1]!), rightLeg)
  })

  it('rejects mismatched leg data', () => {
    const left = makeFinSetObj(['a0', 'a1'])
    const right = makeFinSetObj(['b0'])
    const codomain = makeFinSetObj(['c0'])

    const { obj: coproduct } = FinSet.coproduct([left, right])

    const leftLeg: FinSetMor = { from: left, to: codomain, map: [0, 0] }
    const rightLeg: FinSetMor = { from: right, to: codomain, map: [0] }

    expect(() => FinSetCoproductsWithCotuple.cotuple(coproduct, [leftLeg], codomain)).toThrow(
      /expected 2 legs/,
    )

    const skewCodomain = makeFinSetObj(['d0'])
    const skewLeg: FinSetMor = { from: right, to: skewCodomain, map: [0] }

    expect(() =>
      FinSetCoproductsWithCotuple.cotuple(coproduct, [leftLeg, skewLeg], codomain),
    ).toThrow(/declared codomain/)
  })

  it('factors discrete cocones uniquely through the coproduct', () => {
    const left = makeFinSetObj(['a0', 'a1'])
    const right = makeFinSetObj(['b0', 'b1'])
    const codomain = makeFinSetObj(['c0', 'c1'])

    const { obj: coproduct, injections } = FinSet.coproduct([left, right])

    const leftLeg: FinSetMor = { from: left, to: codomain, map: [1, 0] }
    const rightLeg: FinSetMor = { from: right, to: codomain, map: [0, 1] }

    const mediator = FinSetCoproductsWithCotuple.cotuple(coproduct, [leftLeg, rightLeg], codomain)
    const competitor: FinSetMor = { from: coproduct, to: codomain, map: mediator.map.slice() }

    type SumIndex = 'left' | 'right'
    const sumIndices = IndexedFamilies.finiteIndex<SumIndex>(['left', 'right'])
    const sumFamily = (index: SumIndex): FinSetObj => (index === 'left' ? left : right)
    const discreteDiagram: CategoryLimits.Diagram<SumIndex, FinSetMor> = { arrows: [] }

    const injectionFamily = (index: SumIndex): FinSetMor =>
      index === 'left' ? injections[0]! : injections[1]!

    const cocone: CategoryLimits.Cocone<SumIndex, FinSetObj, FinSetMor> = {
      coTip: codomain,
      legs: (index) => (index === 'left' ? leftLeg : rightLeg),
      diagram: discreteDiagram,
    }

    const factoring = CategoryLimits.factorCoconeThroughCoproduct(
      FinSet,
      (a, b) => FinSet.equalMor!(a, b),
      sumIndices,
      sumFamily,
      coproduct,
      injectionFamily,
      cocone,
      FinSetCoproductsWithCotuple.cotuple,
      { competitor },
    )

    expect(factoring.factored).toBe(true)
    expect(factoring.unique).toBe(true)
    expect(factoring.mediator).toBeDefined()
    expectEqualArrows(factoring.mediator!, mediator)
  })
})
