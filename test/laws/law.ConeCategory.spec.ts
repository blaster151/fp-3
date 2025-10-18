import { describe, expect, it } from 'vitest'

import {
  CategoryLimits,
  FinSet,
  FinSetProductsWithTuple,
  IndexedFamilies,
  makeFinSetObj,
} from '../../allTS'
import type { FinSetMor, FinSetObj } from '../../allTS'
import type { FiniteCategory } from '../../finite-cat'
import type { Category } from '../../stdlib/category'
import type { ArrowFamilies } from '../../stdlib/arrow-families'

type ProductIndex = 'left' | 'right'
type EqualizerIndex = 'source' | 'target'
type PullbackIndex = 'A' | 'B' | 'C'

type FinSetFiniteCategory = FiniteCategory<FinSetObj, FinSetMor> &
  Category<FinSetObj, FinSetMor> &
  ArrowFamilies.HasDomCod<FinSetObj, FinSetMor>

const castConeBase = (
  category: FinSetFiniteCategory,
): FiniteCategory<FinSetObj, FinSetMor> &
  Category<FinSetObj, FinSetMor> &
  ArrowFamilies.HasDomCod<FinSetObj, FinSetMor> =>
  category as unknown as FiniteCategory<FinSetObj, FinSetMor> &
    Category<FinSetObj, FinSetMor> &
    ArrowFamilies.HasDomCod<FinSetObj, FinSetMor>

interface SampleCategory {
  readonly category: FinSetFiniteCategory
  readonly lookup: (arrow: FinSetMor) => FinSetMor
  readonly objects: {
    readonly A: FinSetObj
    readonly B: FinSetObj
    readonly C: FinSetObj
    readonly X: FinSetObj
    readonly Y: FinSetObj
    readonly product: FinSetObj
    readonly equalizer: FinSetObj
    readonly pullback: FinSetObj
  }
  readonly product: {
    readonly piA: FinSetMor
    readonly piB: FinSetMor
    readonly xToA: FinSetMor
    readonly xToB: FinSetMor
  }
  readonly equalizer: {
    readonly f: FinSetMor
    readonly g: FinSetMor
    readonly equalize: FinSetMor
    readonly legToY: FinSetMor
    readonly constantIntoX: FinSetMor
    readonly constantIntoY: FinSetMor
    readonly mediatorFromX: FinSetMor
  }
  readonly pullback: {
    readonly f: FinSetMor
    readonly g: FinSetMor
    readonly toA: FinSetMor
    readonly toB: FinSetMor
    readonly toC: FinSetMor
    readonly aId: FinSetMor
    readonly aToB: FinSetMor
    readonly aMediator: FinSetMor
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
  category: FiniteCategory<FinSetObj, FinSetMor>
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
      throw new Error('Sample category missing an expected arrow')
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
    src: (arrow: FinSetMor) => arrow.from,
    dst: (arrow: FinSetMor) => arrow.to,
    dom: (arrow: FinSetMor) => arrow.from,
    cod: (arrow: FinSetMor) => arrow.to,
    eq: FinSet.equalMor!,
  }

  return { category, lookup }
}

const buildSampleCategory = (): SampleCategory => {
  const A = makeFinSetObj(['a0', 'a1'])
  const B = makeFinSetObj(['b0', 'b1'])
  const C = makeFinSetObj(['c0', 'c1'])
  const X = makeFinSetObj(['x0', 'x1'])
  const Y = makeFinSetObj(['y0', 'y1'])

  const productWitness = FinSet.product([A, B])
  const productObj = productWitness.obj
  const [piALeg, piBLeg] = productWitness.projections as readonly [FinSetMor, FinSetMor]

  const fXtoY: FinSetMor = { from: X, to: Y, map: [0, 1] }
  const gXtoY: FinSetMor = { from: X, to: Y, map: [0, 0] }
  const equalizerWitness = FinSet.equalizer(fXtoY, gXtoY)
  const equalizerObj = equalizerWitness.obj
  const includeEqualizer = equalizerWitness.equalize

  const fAtoC: FinSetMor = { from: A, to: C, map: [0, 1] }
  const gBtoC: FinSetMor = { from: B, to: C, map: [0, 1] }

  const productElements = productObj.elements as ReadonlyArray<ReadonlyArray<number>>
  const pullbackPairs: Array<readonly [number, number]> = []
  for (const tuple of productElements) {
    if (tuple.length !== 2) {
      continue
    }
    const [aIndex, bIndex] = tuple
    if (aIndex === undefined || bIndex === undefined) {
      continue
    }
    const imageA = fAtoC.map[aIndex]
    const imageB = gBtoC.map[bIndex]
    if (imageA === undefined || imageB === undefined || imageA !== imageB) {
      continue
    }
    pullbackPairs.push([aIndex, bIndex])
  }
  const pullbackElements: ReadonlyArray<readonly [number, number]> = pullbackPairs
  const pullbackObj: FinSetObj = { elements: pullbackElements }

  const pullbackToA: FinSetMor = {
    from: pullbackObj,
    to: A,
    map: pullbackElements.map(([aIndex]) => aIndex),
  }
  const pullbackToB: FinSetMor = {
    from: pullbackObj,
    to: B,
    map: pullbackElements.map(([, bIndex]) => bIndex),
  }
  const pullbackToC: FinSetMor = {
    from: pullbackObj,
    to: C,
    map: pullbackElements.map(([aIndex, bIndex]) => {
      const imageA = fAtoC.map[aIndex]
      if (imageA === undefined) {
        throw new Error('pullback construction expected defined image for A leg')
      }
      const imageB = gBtoC.map[bIndex]
      if (imageB === undefined || imageA !== imageB) {
        throw new Error('pullback construction expected equal images for commuting square')
      }
      return imageA
    }),
  }

  const objects = [A, B, C, X, Y, productObj, equalizerObj, pullbackObj]
  const { category, lookup } = buildFiniteCategory(objects)

  const piA = lookup(piALeg)
  const piB = lookup(piBLeg)
  const xToA = lookup({ from: X, to: A, map: [0, 1] })
  const xToB = lookup({ from: X, to: B, map: [1, 0] })

  const f = lookup(fXtoY)
  const g = lookup(gXtoY)
  const equalize = lookup(includeEqualizer)
  const legToY = lookup(FinSet.compose(fXtoY, includeEqualizer))
  const constantIntoX = lookup({ from: X, to: X, map: [0, 0] })
  const constantIntoY = lookup({ from: X, to: Y, map: [0, 0] })
  const mediatorFromX = lookup({ from: X, to: equalizerObj, map: X.elements.map(() => 0) })

  const fPull = lookup(fAtoC)
  const gPull = lookup(gBtoC)
  const toA = lookup(pullbackToA)
  const toB = lookup(pullbackToB)
  const toC = lookup(pullbackToC)
  const aId = lookup(FinSet.id(A))
  const aToB = lookup({ from: A, to: B, map: [0, 1] })
  const aMediator = lookup({ from: A, to: pullbackObj, map: [0, 1] })

    return {
      category: category as FinSetFiniteCategory,
      lookup,
    objects: {
      A,
      B,
      C,
      X,
      Y,
      product: productObj,
      equalizer: equalizerObj,
      pullback: pullbackObj,
    },
    product: { piA, piB, xToA, xToB },
    equalizer: {
      f,
      g,
      equalize,
      legToY,
      constantIntoX,
      constantIntoY,
      mediatorFromX,
    },
    pullback: {
      f: fPull,
      g: gPull,
      toA,
      toB,
      toC,
      aId,
      aToB,
      aMediator,
    },
  }
}

describe('CategoryLimits.makeConeCategory (finite diagrams)', () => {
  it('enumerates cones for products and certifies terminality', () => {
    const sample = buildSampleCategory()

    const productIndices = IndexedFamilies.finiteIndex<ProductIndex>(['left', 'right'])
    const productFamily = (index: ProductIndex): FinSetObj =>
      index === 'left' ? sample.objects.A : sample.objects.B
    const productDiagram: CategoryLimits.Diagram<ProductIndex, FinSetMor> = { arrows: [] }

    const coneCategory = CategoryLimits.makeConeCategory({
      base: castConeBase(sample.category),
      Ifin: productIndices,
      F: productFamily,
      diagram: productDiagram,
    })

    const limitCone: CategoryLimits.Cone<ProductIndex, FinSetObj, FinSetMor> = {
      tip: sample.objects.product,
      legs: (index) => (index === 'left' ? sample.product.piA : sample.product.piB),
      diagram: productDiagram,
    }

    const terminality = CategoryLimits.checkTerminalCone(coneCategory, limitCone)
    expect(terminality.holds).toBe(true)
    expect(terminality.locatedLimit).toBeDefined()
    expect(terminality.mediators.length).toBe(coneCategory.category.objects.length)

    const xCone: CategoryLimits.Cone<ProductIndex, FinSetObj, FinSetMor> = {
      tip: sample.objects.X,
      legs: (index) => (index === 'left' ? sample.product.xToA : sample.product.xToB),
      diagram: productDiagram,
    }

    const located = coneCategory.locateCone(xCone)
    expect(located).toBeDefined()

    const witness = terminality.mediators.find((entry) => entry.source === located)
    expect(witness).toBeDefined()

    const mediator = FinSetProductsWithTuple.tuple(
      sample.objects.X,
      [sample.product.xToA, sample.product.xToB],
      sample.objects.product,
    )
    const canonical = sample.lookup(mediator)
    expect(FinSet.equalMor!(witness!.arrow.mediator, canonical)).toBe(true)
  })

  it('threads cone comparisons into isProductForCone', () => {
    const sample = buildSampleCategory()

    const productIndices = IndexedFamilies.finiteIndex<ProductIndex>(['left', 'right'])
    const productFamily = (index: ProductIndex): FinSetObj =>
      index === 'left' ? sample.objects.A : sample.objects.B
    const productDiagram: CategoryLimits.Diagram<ProductIndex, FinSetMor> = { arrows: [] }

    const cone: CategoryLimits.Cone<ProductIndex, FinSetObj, FinSetMor> = {
      tip: sample.objects.X,
      legs: (index) => (index === 'left' ? sample.product.xToA : sample.product.xToB),
      diagram: productDiagram,
    }

    const result = CategoryLimits.isProductForCone(
      sample.category,
      FinSet.equalMor!,
      productIndices,
      productFamily,
      sample.objects.product,
      (index) => (index === 'left' ? sample.product.piA : sample.product.piB),
      cone,
      FinSetProductsWithTuple.tuple,
    )

    expect(result.triangles).toBe(true)
    expect(result.unique).toBe(true)
  })

  it('builds the equalizer cone category and reports terminality', () => {
    const sample = buildSampleCategory()

    const indices = IndexedFamilies.finiteIndex<EqualizerIndex>(['source', 'target'])
    const family = (index: EqualizerIndex): FinSetObj =>
      index === 'source' ? sample.objects.X : sample.objects.Y

    const diagram: CategoryLimits.Diagram<EqualizerIndex, FinSetMor> = {
      arrows: [
        { source: 'source', target: 'target', morphism: sample.equalizer.f },
        { source: 'source', target: 'target', morphism: sample.equalizer.g },
      ],
    }

    const coneCategory = CategoryLimits.makeConeCategory({
      base: castConeBase(sample.category),
      Ifin: indices,
      F: family,
      diagram,
    })

    const limitCone: CategoryLimits.Cone<EqualizerIndex, FinSetObj, FinSetMor> = {
      tip: sample.objects.equalizer,
      legs: (index) => (index === 'source' ? sample.equalizer.equalize : sample.equalizer.legToY),
      diagram,
    }

    const terminality = CategoryLimits.checkTerminalCone(coneCategory, limitCone)
    expect(terminality.holds).toBe(true)

    const constantCone: CategoryLimits.Cone<EqualizerIndex, FinSetObj, FinSetMor> = {
      tip: sample.objects.X,
      legs: (index) => (index === 'source' ? sample.equalizer.constantIntoX : sample.equalizer.constantIntoY),
      diagram,
    }

    const located = coneCategory.locateCone(constantCone)
    expect(located).toBeDefined()

    const witness = terminality.mediators.find((entry) => entry.source === located)
    expect(witness).toBeDefined()
    expect(FinSet.equalMor!(witness!.arrow.mediator, sample.equalizer.mediatorFromX)).toBe(true)
  })

  it('detects pullback cones as terminal objects', () => {
    const sample = buildSampleCategory()

    const indices = IndexedFamilies.finiteIndex<PullbackIndex>(['A', 'B', 'C'])
    const family = (index: PullbackIndex): FinSetObj => {
      switch (index) {
        case 'A':
          return sample.objects.A
        case 'B':
          return sample.objects.B
        default:
          return sample.objects.C
      }
    }

    const diagram: CategoryLimits.Diagram<PullbackIndex, FinSetMor> = {
      arrows: [
        { source: 'A', target: 'C', morphism: sample.pullback.f },
        { source: 'B', target: 'C', morphism: sample.pullback.g },
      ],
    }

    const coneCategory = CategoryLimits.makeConeCategory({
      base: castConeBase(sample.category),
      Ifin: indices,
      F: family,
      diagram,
    })

    const limitCone: CategoryLimits.Cone<PullbackIndex, FinSetObj, FinSetMor> = {
      tip: sample.objects.pullback,
      legs: (index) => {
        switch (index) {
          case 'A':
            return sample.pullback.toA
          case 'B':
            return sample.pullback.toB
          default:
            return sample.pullback.toC
        }
      },
      diagram,
    }

    const terminality = CategoryLimits.checkTerminalCone(coneCategory, limitCone)
    expect(terminality.holds).toBe(true)

    const coneA: CategoryLimits.Cone<PullbackIndex, FinSetObj, FinSetMor> = {
      tip: sample.objects.A,
      legs: (index) => {
        switch (index) {
          case 'A':
            return sample.pullback.aId
          case 'B':
            return sample.pullback.aToB
          default:
            return sample.pullback.f
        }
      },
      diagram,
    }

    const located = coneCategory.locateCone(coneA)
    expect(located).toBeDefined()

    const witness = terminality.mediators.find((entry) => entry.source === located)
    expect(witness).toBeDefined()
    expect(FinSet.equalMor!(witness!.arrow.mediator, sample.pullback.aMediator)).toBe(true)
  })

  it('rejects diagrams that reference indices outside the carrier', () => {
    const sample = buildSampleCategory()

    const indices = IndexedFamilies.finiteIndex<ProductIndex>(['left', 'right'])
    const family = (index: ProductIndex): FinSetObj =>
      index === 'left' ? sample.objects.A : sample.objects.B

    const badDiagram: CategoryLimits.Diagram<ProductIndex, FinSetMor> = {
      arrows: [
        { source: 'left', target: 'missing' as ProductIndex, morphism: sample.product.piA },
      ],
    }

    expect(() =>
      CategoryLimits.makeConeCategory({
        base: castConeBase(sample.category),
        Ifin: indices,
        F: family,
        diagram: badDiagram,
      }),
    ).toThrow(/CategoryLimits\.makeConeCategory: diagram references an index outside the supplied finite family/)
  })
})

