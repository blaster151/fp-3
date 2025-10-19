import { describe, expect, it } from 'vitest'

import {
  CategoryLimits,
  FinSet,
  IndexedFamilies,
  makeFinSetObj,
} from '../../allTS'
import { FinSetCoproductsWithCotuple } from '../../src/all/finset-tools'
import type { FinSetMor, FinSetObj } from '../../allTS'
import type { ArrowFamilies } from '../../stdlib/arrow-families'
import type { Category } from '../../stdlib/category'
import type { FiniteCategory } from '../../finite-cat'

type FinSetFiniteCategory = FiniteCategory<FinSetObj, FinSetMor> &
  Category<FinSetObj, FinSetMor> &
  ArrowFamilies.HasDomCod<FinSetObj, FinSetMor> & {
    readonly hom: (a: FinSetObj, b: FinSetObj) => ReadonlyArray<FinSetMor>
  }

type SumIndex = 'left' | 'right'
type ParallelIndex = 'source' | 'target'

interface SampleData {
  readonly category: FinSetFiniteCategory
  readonly lookup: (candidate: FinSetMor) => FinSetMor
  readonly objects: {
    readonly left: FinSetObj
    readonly right: FinSetObj
    readonly X: FinSetObj
    readonly Y: FinSetObj
    readonly zero: FinSetObj
    readonly one: FinSetObj
    readonly coproduct: FinSetObj
    readonly coequalizer: FinSetObj
  }
  readonly coproduct: {
    readonly injections: readonly [FinSetMor, FinSetMor]
  }
  readonly coequalizer: {
    readonly f: FinSetMor
    readonly g: FinSetMor
    readonly coequalize: FinSetMor
  }
}

const enumerateMaps = (from: FinSetObj, to: FinSetObj): FinSetMor[] => {
  const domainSize = from.elements.length
  const codomainSize = to.elements.length
  if (domainSize === 0) {
    return [{ from, to, map: [] }]
  }
  if (codomainSize === 0) {
    return []
  }
  const result: FinSetMor[] = []
  const map: number[] = new Array(domainSize)

  const assign = (position: number) => {
    if (position === domainSize) {
      result.push({ from, to, map: map.slice() })
      return
    }
    for (let image = 0; image < codomainSize; image += 1) {
      map[position] = image
      assign(position + 1)
    }
  }

  assign(0)
  return result
}

const buildFiniteCategory = (
  objects: ReadonlyArray<FinSetObj>,
): {
  category: FinSetFiniteCategory
  lookup: (candidate: FinSetMor) => FinSetMor
} => {
  const objectIndex = new Map<FinSetObj, number>()
  objects.forEach((object, index) => objectIndex.set(object, index))

  const arrows: FinSetMor[] = []
  const seen = new Set<string>()

  const keyFor = (from: FinSetObj, to: FinSetObj, map: ReadonlyArray<number>) => {
    const fromIndex = objectIndex.get(from)
    const toIndex = objectIndex.get(to)
    return `${fromIndex}->${toIndex}:${map.join(',')}`
  }

  for (const from of objects) {
    for (const to of objects) {
      for (const arrow of enumerateMaps(from, to)) {
        const key = keyFor(arrow.from, arrow.to, arrow.map)
        if (!seen.has(key)) {
          seen.add(key)
          arrows.push(arrow)
        }
      }
    }
  }

  const lookup = (candidate: FinSetMor): FinSetMor => {
    const match = arrows.find((arrow) => FinSet.equalMor!(arrow, candidate))
    if (!match) {
      throw new Error('finite category: arrow not present in catalogue')
    }
    return match
  }

  const id = (object: FinSetObj): FinSetMor => lookup(FinSet.id(object))
  const compose = (g: FinSetMor, f: FinSetMor): FinSetMor => lookup(FinSet.compose(g, f))

  const category: FinSetFiniteCategory = {
    objects: [...objects],
    arrows,
    id,
    compose,
    src: (arrow) => arrow.from,
    dst: (arrow) => arrow.to,
    dom: (arrow) => arrow.from,
    cod: (arrow) => arrow.to,
    hom: (a, b) => arrows.filter((arrow) => arrow.from === a && arrow.to === b),
    eq: FinSet.equalMor!,
  }

  return { category, lookup }
}

const buildSampleData = (): SampleData => {
  const left = makeFinSetObj(['l0', 'l1'])
  const right = makeFinSetObj(['r0'])
  const X = makeFinSetObj(['x0', 'x1'])
  const Y = makeFinSetObj(['y0', 'y1', 'y2'])
  const zero = FinSet.initialObj
  const one = FinSet.terminalObj

  const coproductWitness = FinSet.coproduct([left, right])
  const [injLeft, injRight] = coproductWitness.injections as readonly [FinSetMor, FinSetMor]

  const f: FinSetMor = { from: X, to: Y, map: [0, 1] }
  const g: FinSetMor = { from: X, to: Y, map: [0, 2] }
  const coequalizerWitness = FinSet.coequalizer(f, g)

  const objects: FinSetObj[] = [
    left,
    right,
    X,
    Y,
    coproductWitness.obj,
    coequalizerWitness.obj,
    zero,
    one,
  ]

  const { category, lookup } = buildFiniteCategory(objects)

  const sampleF = lookup(f)
  const sampleG = lookup(g)
  const coequalize = lookup(coequalizerWitness.coequalize)

  return {
    category,
    lookup,
    objects: {
      left,
      right,
      X,
      Y,
      zero,
      one,
      coproduct: coproductWitness.obj,
      coequalizer: coequalizerWitness.obj,
    },
    coproduct: {
      injections: [lookup(injLeft), lookup(injRight)],
    },
    coequalizer: {
      f: sampleF,
      g: sampleG,
      coequalize,
    },
  }
}

describe('CategoryLimits.makeCoconeCategory (finite diagrams)', () => {
  const sample = buildSampleData()

  it('treats empty-diagram cocones as initial objects', () => {
    const emptyIndices = IndexedFamilies.finiteIndex<never>([])
    const emptyFamily = ((_: never) => {
      throw new Error('empty diagram has no objects')
    }) as IndexedFamilies.Family<never, FinSetObj>
    const emptyDiagram: CategoryLimits.Diagram<never, FinSetMor> = { arrows: [] }

    const coconeCategory = CategoryLimits.makeCoconeCategory({
      base: sample.category,
      eq: FinSet.equalMor!,
      Ifin: emptyIndices,
      F: emptyFamily,
      diagram: emptyDiagram,
    })

    const initialCocone = coconeCategory.category.objects.find(
      (cocone) => cocone.coTip === sample.objects.zero,
    )
    expect(initialCocone).toBeDefined()

    const initiality = CategoryLimits.checkInitialCocone(coconeCategory, initialCocone!)
    expect(initiality.holds).toBe(true)
    expect(initiality.mediators.length).toBe(coconeCategory.category.objects.length)

    const leftCocone = coconeCategory.category.objects.find(
      (cocone) => cocone.coTip === sample.objects.left,
    )
    expect(leftCocone).toBeDefined()

    const mediatorEntry = initiality.mediators.find((entry) => entry.target === leftCocone)
    expect(mediatorEntry).toBeDefined()

    const expectedArrow = sample.lookup({ from: sample.objects.zero, to: sample.objects.left, map: [] })
    if (!leftCocone || !mediatorEntry) {
      throw new Error('expected to locate the left cocone and its mediator')
    }
    expect(FinSet.equalMor!(mediatorEntry.arrow.mediator, expectedArrow)).toBe(true)

    const emptyInjections = ((_: never) => {
      throw new Error('empty diagram has no injections')
    }) as IndexedFamilies.Family<never, FinSetMor>
    const canonicalEmptyCocone: CategoryLimits.Cocone<never, FinSetObj, FinSetMor> = {
      coTip: sample.objects.zero,
      legs: emptyInjections,
      diagram: emptyDiagram,
    }

    const witness = CategoryLimits.isCoproductForCocone(
      sample.category,
      FinSet.equalMor!,
      emptyIndices,
      emptyFamily,
      canonicalEmptyCocone.coTip,
      canonicalEmptyCocone.legs,
      canonicalEmptyCocone.diagram,
      leftCocone,
      FinSetCoproductsWithCotuple.cotuple,
    )

    expect(witness.triangles).toBe(true)
    expect(witness.unique).toBe(true)
    expect(witness.mediator).toBeDefined()
    expect(FinSet.equalMor!(witness.mediator!, mediatorEntry.arrow.mediator)).toBe(true)
  })

  it('certifies coproduct cocones as initial objects', () => {
    const sumIndices = IndexedFamilies.finiteIndex<SumIndex>(['left', 'right'])
    const sumFamily = (index: SumIndex): FinSetObj =>
      index === 'left' ? sample.objects.left : sample.objects.right
    const sumDiagram: CategoryLimits.Diagram<SumIndex, FinSetMor> = { arrows: [] }

    const coconeCategory = CategoryLimits.makeCoconeCategory({
      base: sample.category,
      eq: FinSet.equalMor!,
      Ifin: sumIndices,
      F: sumFamily,
      diagram: sumDiagram,
    })

    const canonicalCocone: CategoryLimits.Cocone<SumIndex, FinSetObj, FinSetMor> = {
      coTip: sample.objects.coproduct,
      legs: (index) =>
        index === 'left' ? sample.coproduct.injections[0] : sample.coproduct.injections[1],
      diagram: sumDiagram,
    }

    const initiality = CategoryLimits.checkInitialCocone(coconeCategory, canonicalCocone)
    expect(initiality.holds).toBe(true)

    const targetCocone: CategoryLimits.Cocone<SumIndex, FinSetObj, FinSetMor> = {
      coTip: sample.objects.left,
      legs: (index) =>
        index === 'left'
          ? sample.lookup(FinSet.id(sample.objects.left))
          : sample.lookup({ from: sample.objects.right, to: sample.objects.left, map: [0] }),
      diagram: sumDiagram,
    }

    const locatedTarget = coconeCategory.locateCocone(targetCocone)
    expect(locatedTarget).toBeDefined()

    const mediatorEntry = initiality.mediators.find((entry) => entry.target === locatedTarget)
    expect(mediatorEntry).toBeDefined()

    const coproductElements = sample.objects.coproduct.elements as Array<{ tag: number; i: number }>
    const leftLeg = targetCocone.legs('left')
    const rightLeg = targetCocone.legs('right')
    const map = coproductElements.map((element) =>
      element.tag === 0 ? leftLeg.map[element.i]! : rightLeg.map[element.i]!,
    )
    const expectedMediator = sample.lookup({
      from: sample.objects.coproduct,
      to: targetCocone.coTip,
      map,
    })

    if (!locatedTarget || !mediatorEntry) {
      throw new Error('expected to recover the located target cocone and mediator')
    }
    expect(FinSet.equalMor!(mediatorEntry.arrow.mediator, expectedMediator)).toBe(true)

    const coproductWitness = CategoryLimits.isCoproductForCocone(
      sample.category,
      FinSet.equalMor!,
      sumIndices,
      sumFamily,
      canonicalCocone.coTip,
      canonicalCocone.legs,
      canonicalCocone.diagram,
      targetCocone,
      FinSetCoproductsWithCotuple.cotuple,
    )

    expect(coproductWitness.triangles).toBe(true)
    expect(coproductWitness.unique).toBe(true)
    expect(coproductWitness.mediator).toBeDefined()
    expect(FinSet.equalMor!(coproductWitness.mediator!, mediatorEntry.arrow.mediator)).toBe(true)
  })

  it('recognises coequalizer cocones as initial objects and rejects malformed legs', () => {
    const parallelShapeObjects: ReadonlyArray<ParallelIndex> = ['source', 'target']
    type ParallelArrow =
      | { kind: 'id'; object: ParallelIndex }
      | { kind: 'edge'; name: 'f' | 'g'; source: ParallelIndex; target: ParallelIndex }

    const idArrow = (object: ParallelIndex): ParallelArrow => ({ kind: 'id', object })
    const edgeArrow = (name: 'f' | 'g'): ParallelArrow => ({ kind: 'edge', name, source: 'source', target: 'target' })

    const idSource = idArrow('source')
    const idTarget = idArrow('target')
    const fEdge = edgeArrow('f')
    const gEdge = edgeArrow('g')

    const parallelShape: FiniteCategory<ParallelIndex, ParallelArrow> = {
      objects: parallelShapeObjects,
      arrows: [idSource, idTarget, fEdge, gEdge],
      id: (object) => (object === 'source' ? idSource : idTarget),
      compose: (g, f) => {
        if (f.kind === 'edge' && g.kind === 'edge') {
          throw new Error('parallel shape: parallel edges do not compose')
        }
        if (f.kind === 'id') {
          if (g.kind === 'id' && f.object !== g.object) {
            throw new Error('parallel shape: identity composition domain mismatch')
          }
          if (g.kind === 'edge' && f.object !== g.source) {
            throw new Error('parallel shape: identity must share source for composition')
          }
          return g
        }
        if (g.kind === 'id') {
          if (g.object !== f.target) {
            throw new Error('parallel shape: identity must share target for composition')
          }
          return f
        }
        throw new Error('parallel shape: unsupported composition request')
      },
      src: (arrow) => (arrow.kind === 'id' ? arrow.object : arrow.source),
      dst: (arrow) => (arrow.kind === 'id' ? arrow.object : arrow.target),
      eq: (left, right) =>
        left.kind === right.kind &&
        (left.kind === 'id'
          ? left.object === (right as ParallelArrow & { kind: 'id' }).object
          : left.name === (right as ParallelArrow & { kind: 'edge' }).name),
    }

    const parallelIndices = IndexedFamilies.finiteIndex<ParallelIndex>(['source', 'target'])
    const parallelFamily = (index: ParallelIndex): FinSetObj =>
      index === 'source' ? sample.objects.X : sample.objects.Y

    const diagram = CategoryLimits.makeFiniteDiagram<ParallelIndex, ParallelArrow, FinSetObj, FinSetMor>({
      shape: parallelShape,
      onObjects: parallelFamily,
      onMorphisms: (arrow: ParallelArrow) => {
        if (arrow.kind === 'id') {
          return arrow.object === 'source'
            ? sample.lookup(FinSet.id(sample.objects.X))
            : sample.lookup(FinSet.id(sample.objects.Y))
        }
        return arrow.name === 'f' ? sample.coequalizer.f : sample.coequalizer.g
      },
    })

    const coconeCategory = CategoryLimits.makeCoconeCategory({
      base: sample.category,
      eq: FinSet.equalMor!,
      Ifin: parallelIndices,
      F: parallelFamily,
      diagram,
    })

    const sourceLeg = sample.lookup(
      FinSet.compose(sample.coequalizer.coequalize, sample.coequalizer.f),
    )
    const canonicalCocone: CategoryLimits.Cocone<ParallelIndex, FinSetObj, FinSetMor> = {
      coTip: sample.objects.coequalizer,
      legs: (index) => (index === 'target' ? sample.coequalizer.coequalize : sourceLeg),
      diagram,
    }

    const initiality = CategoryLimits.checkInitialCocone(coconeCategory, canonicalCocone)
    expect(initiality.holds).toBe(true)

    const rightLeg = sample.lookup({ from: sample.objects.Y, to: sample.objects.right, map: [0, 0, 0] })
    const sourceToRight = sample.lookup({ from: sample.objects.X, to: sample.objects.right, map: [0, 0] })
    const targetCocone: CategoryLimits.Cocone<ParallelIndex, FinSetObj, FinSetMor> = {
      coTip: sample.objects.right,
      legs: (index) => (index === 'target' ? rightLeg : sourceToRight),
      diagram,
    }

    const locatedTarget = coconeCategory.locateCocone(targetCocone)
    expect(locatedTarget).toBeDefined()

    const mediatorEntry = initiality.mediators.find((entry) => entry.target === locatedTarget)
    expect(mediatorEntry).toBeDefined()

    const expectedMediator = sample.lookup({
      from: sample.objects.coequalizer,
      to: targetCocone.coTip,
      map: sample.objects.coequalizer.elements.map(() => 0),
    })
    if (!locatedTarget || !mediatorEntry) {
      throw new Error('expected to locate the target cocone and its mediator in the coequalizer test')
    }
    expect(FinSet.equalMor!(mediatorEntry.arrow.mediator, expectedMediator)).toBe(true)

    const coequalizerWitness = CategoryLimits.isCoproductForCocone(
      sample.category,
      FinSet.equalMor!,
      parallelIndices,
      parallelFamily,
      canonicalCocone.coTip,
      canonicalCocone.legs,
      canonicalCocone.diagram,
      targetCocone,
      FinSetCoproductsWithCotuple.cotuple,
    )

    expect(coequalizerWitness.triangles).toBe(true)
    expect(coequalizerWitness.unique).toBe(true)
    expect(coequalizerWitness.mediator).toBeDefined()
    expect(FinSet.equalMor!(coequalizerWitness.mediator!, mediatorEntry.arrow.mediator)).toBe(true)

    const badCocone: CategoryLimits.Cocone<ParallelIndex, FinSetObj, FinSetMor> = {
      coTip: sample.objects.coequalizer,
      legs: (index) =>
        index === 'target'
          ? sample.coequalizer.coequalize
          : sample.lookup({ from: sample.objects.X, to: sample.objects.coequalizer, map: [1, 1] }),
      diagram,
    }

    const validation = CategoryLimits.validateCoconeAgainstDiagram({
      category: sample.category,
      eq: FinSet.equalMor!,
      indices: parallelIndices,
      onObjects: parallelFamily,
      cocone: badCocone,
    })
    expect(validation.valid).toBe(false)
    expect(validation.reason).toMatch(/does not commute/)
    expect(coconeCategory.locateCocone(badCocone)).toBeUndefined()

    const rejection = CategoryLimits.isCoproductForCocone(
      sample.category,
      FinSet.equalMor!,
      parallelIndices,
      parallelFamily,
      canonicalCocone.coTip,
      canonicalCocone.legs,
      canonicalCocone.diagram,
      badCocone,
      FinSetCoproductsWithCotuple.cotuple,
    )
    expect(rejection.triangles).toBe(false)
    expect(rejection.unique).toBe(false)
    expect(rejection.reason).toMatch(/does not commute/)
  })
})
