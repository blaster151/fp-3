import { describe, expect, it } from 'vitest'

import {
  CategoryLimits,
  FinSet,
  FinSetProductsWithTuple,
  IndexedFamilies,
  makeFinSetObj,
} from '../../allTS'
import type { FinSetMor, FinSetObj } from '../../allTS'
import type { ArrowFamilies } from '../../stdlib/arrow-families'
import type { Category } from '../../stdlib/category'
import type { FiniteCategory } from '../../finite-cat'

type FinSetFiniteCategory = FiniteCategory<FinSetObj, FinSetMor> &
  Category<FinSetObj, FinSetMor> &
  ArrowFamilies.HasDomCod<FinSetObj, FinSetMor> & {
    readonly hom: (a: FinSetObj, b: FinSetObj) => ReadonlyArray<FinSetMor>
  }

type EmptyObj = 'empty-object'
type EmptyArr = 'empty-arrow'

type DiscreteIndex = 'left' | 'right'

type ParallelObj = 'source' | 'target'
type ParallelArr = 'id_source' | 'id_target' | 'alpha' | 'beta'

interface StructuredCategory {
  readonly base: FinSetFiniteCategory &
    CategoryLimits.HasFiniteProducts<FinSetObj, FinSetMor> &
    CategoryLimits.HasProductMediators<FinSetObj, FinSetMor> &
    CategoryLimits.HasEqualizers<FinSetObj, FinSetMor> &
    CategoryLimits.HasTerminal<FinSetObj, FinSetMor> &
    { readonly dom: (m: FinSetMor) => FinSetObj; readonly cod: (m: FinSetMor) => FinSetObj }
  readonly objects: {
    readonly A: FinSetObj
    readonly B: FinSetObj
    readonly X: FinSetObj
    readonly Y: FinSetObj
    readonly product: FinSetObj
    readonly equalizer: FinSetObj
    readonly terminal: FinSetObj
  }
  readonly productData: {
    readonly piA: FinSetMor
    readonly piB: FinSetMor
    readonly xToA: FinSetMor
    readonly xToB: FinSetMor
  }
  readonly equalizerData: {
    readonly f: FinSetMor
    readonly g: FinSetMor
    readonly include: FinSetMor
    readonly legToY: FinSetMor
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
): { category: FinSetFiniteCategory; lookup: (candidate: FinSetMor) => FinSetMor } => {
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
      throw new Error('Structured category missing expected arrow')
    }
    return match
  }

  const category: FinSetFiniteCategory = {
    objects: [...objects],
    arrows,
    id: (object) => lookup(FinSet.id(object)),
    compose: (g, f) => lookup(FinSet.compose(g, f)),
    src: (arrow) => arrow.from,
    dst: (arrow) => arrow.to,
    dom: (arrow) => arrow.from,
    cod: (arrow) => arrow.to,
    hom: (a, b) => arrows.filter((arrow) => arrow.from === a && arrow.to === b),
    eq: FinSet.equalMor!,
  }

  return { category, lookup }
}

const buildStructuredCategory = (): StructuredCategory => {
  const A = makeFinSetObj(['a0', 'a1'])
  const B = makeFinSetObj(['b0', 'b1'])
  const X = makeFinSetObj(['x0', 'x1'])
  const Y = makeFinSetObj(['y0', 'y1'])

  const productWitness = FinSet.product([A, B])
  const productObj = productWitness.obj
  const [piA, piB] = productWitness.projections as readonly [FinSetMor, FinSetMor]

  const xToA: FinSetMor = { from: X, to: A, map: [0, 1] }
  const xToB: FinSetMor = { from: X, to: B, map: [1, 0] }

  const f: FinSetMor = { from: X, to: Y, map: [0, 1] }
  const g: FinSetMor = { from: X, to: Y, map: [0, 0] }
  const equalizerWitness = FinSet.equalizer(f, g)
  const equalizerObj = equalizerWitness.obj
  const includeEqualizer = equalizerWitness.equalize
  const legToY = FinSet.compose(f, includeEqualizer)

  const terminalObj = FinSet.terminalObj

  const objects = [A, B, X, Y, productObj, equalizerObj, terminalObj]
  const { category, lookup } = buildFiniteCategory(objects)

  const base: StructuredCategory['base'] = {
    ...category,
    dom: FinSet.dom,
    cod: FinSet.cod,
    product: FinSet.product,
    tuple: FinSetProductsWithTuple.tuple,
    equalizer: FinSet.equalizer,
    terminalObj,
  }

  return {
    base,
    objects: {
      A,
      B,
      X,
      Y,
      product: productObj,
      equalizer: equalizerObj,
      terminal: terminalObj,
    },
    productData: {
      piA: lookup(piA),
      piB: lookup(piB),
      xToA: lookup(xToA),
      xToB: lookup(xToB),
    },
    equalizerData: {
      f: lookup(f),
      g: lookup(g),
      include: lookup(includeEqualizer),
      legToY: lookup(legToY),
    },
  }
}

const makeEmptyDiagram = (
  base: StructuredCategory['base'],
): CategoryLimits.FiniteDiagram<EmptyObj, EmptyArr, FinSetObj, FinSetMor> => {
  const emptyShape: FiniteCategory<EmptyObj, EmptyArr> = {
    objects: [],
    arrows: [],
    id: () => {
      throw new Error('empty diagram has no identities')
    },
    compose: () => {
      throw new Error('empty diagram has no compositions')
    },
    src: () => {
      throw new Error('empty diagram has no arrows')
    },
    dst: () => {
      throw new Error('empty diagram has no arrows')
    },
    eq: () => true,
  }

  return CategoryLimits.makeFiniteDiagram({
    shape: emptyShape,
    onObjects: () => {
      throw new Error('empty diagram has no objects')
    },
    onMorphisms: () => {
      throw new Error('empty diagram has no morphisms')
    },
  })
}

const makeDiscreteDiagram = (
  base: StructuredCategory['base'],
  sample: StructuredCategory,
): CategoryLimits.FiniteDiagram<DiscreteIndex, { source: DiscreteIndex; target: DiscreteIndex }, FinSetObj, FinSetMor> => {
  const indices = IndexedFamilies.finiteIndex<DiscreteIndex>(['left', 'right'])
  return CategoryLimits.finiteDiagramFromDiscrete({
    base,
    indices,
    onObjects: (index) => (index === 'left' ? sample.objects.A : sample.objects.B),
  })
}

const makeParallelDiagram = (
  sample: StructuredCategory,
): CategoryLimits.FiniteDiagram<ParallelObj, ParallelArr, FinSetObj, FinSetMor> => {
  const shape: FiniteCategory<ParallelObj, ParallelArr> = {
    objects: ['source', 'target'],
    arrows: ['id_source', 'id_target', 'alpha', 'beta'],
    id: (object) => (object === 'source' ? 'id_source' : 'id_target'),
    compose: (g, f) => {
      const srcF = shape.src(f)
      const dstF = shape.dst(f)
      const srcG = shape.src(g)
      if (dstF !== srcG) {
        throw new Error('parallel shape: attempted to compose non-composable arrows')
      }
      if (f === 'id_source' || f === 'id_target') return g
      if (g === 'id_source' || g === 'id_target') return f
      throw new Error('parallel shape: only identities compose with non-identities')
    },
    src: (arrow) => {
      switch (arrow) {
        case 'id_source':
        case 'alpha':
        case 'beta':
          return 'source'
        case 'id_target':
          return 'target'
        default:
          return 'source'
      }
    },
    dst: (arrow) => {
      switch (arrow) {
        case 'id_source':
          return 'source'
        case 'id_target':
        case 'alpha':
        case 'beta':
          return 'target'
        default:
          return 'target'
      }
    },
    eq: (left, right) => left === right,
  }

  return CategoryLimits.makeFiniteDiagram({
    shape,
    onObjects: (object) => (object === 'source' ? sample.objects.X : sample.objects.Y),
    onMorphisms: (arrow: ParallelArr) => {
      switch (arrow) {
        case 'id_source':
          return FinSet.id(sample.objects.X)
        case 'id_target':
          return FinSet.id(sample.objects.Y)
        case 'alpha':
          return sample.equalizerData.f
        case 'beta':
          return sample.equalizerData.g
        default:
          throw new Error('unknown parallel arrow')
      }
    },
  })
}

describe('CategoryLimits.limitOfDiagram', () => {
  const sample = buildStructuredCategory()

  it('returns the terminal cone for empty diagrams', () => {
    const diagram = makeEmptyDiagram(sample.base)
    const result = CategoryLimits.limitOfDiagram({ base: sample.base, diagram })

    expect(result.cone.tip).toBe(sample.objects.terminal)

    const candidate: CategoryLimits.Cone<EmptyObj, FinSetObj, FinSetMor> = {
      tip: sample.objects.A,
      legs: () => {
        throw new Error('empty cone has no legs')
      },
      diagram,
    }

    const factor = result.factor(candidate)
    expect(factor.holds).toBe(true)
    expect(factor.mediator).toBeDefined()

    const expectedMap: FinSetMor = {
      from: sample.objects.A,
      to: sample.objects.terminal,
      map: sample.objects.A.elements.map(() => 0),
    }
    expect(FinSet.equalMor!(factor.mediator!, expectedMap)).toBe(true)
  })

  it('recovers the binary product for discrete diagrams', () => {
    const diagram = makeDiscreteDiagram(sample.base, sample)
    const result = CategoryLimits.limitOfDiagram({ base: sample.base, diagram })

    expect(result.cone.tip).toBe(sample.objects.product)
    expect(FinSet.equalMor!(result.cone.legs('left'), sample.productData.piA)).toBe(true)
    expect(FinSet.equalMor!(result.cone.legs('right'), sample.productData.piB)).toBe(true)

    const candidate: CategoryLimits.Cone<DiscreteIndex, FinSetObj, FinSetMor> = {
      tip: sample.objects.X,
      legs: (index) => (index === 'left' ? sample.productData.xToA : sample.productData.xToB),
      diagram,
    }

    const factor = result.factor(candidate)
    expect(factor.holds).toBe(true)

    const expectedMediator = FinSetProductsWithTuple.tuple(
      sample.objects.X,
      [sample.productData.xToA, sample.productData.xToB],
      sample.objects.product,
    )
    expect(FinSet.equalMor!(factor.mediator!, expectedMediator)).toBe(true)

    const badCandidate: CategoryLimits.Cone<DiscreteIndex, FinSetObj, FinSetMor> = {
      tip: sample.objects.X,
      legs: (index) => (index === 'left' ? sample.productData.xToB : sample.productData.xToA),
      diagram,
    }
    const failure = result.factor(badCandidate)
    expect(failure.holds).toBe(false)
    expect(failure.reason).toContain('lands in')
  })

  it('factors equalizer cones for parallel pairs and rejects non-commuting legs', () => {
    const diagram = makeParallelDiagram(sample)
    const result = CategoryLimits.limitOfDiagram({ base: sample.base, diagram })

    const equalizerCone: CategoryLimits.Cone<ParallelObj, FinSetObj, FinSetMor> = {
      tip: sample.objects.equalizer,
      legs: (index) => (index === 'source' ? sample.equalizerData.include : sample.equalizerData.legToY),
      diagram,
    }

    const factor = result.factor(equalizerCone)
    expect(factor.holds).toBe(true)
    expect(factor.mediator).toBeDefined()

    const mediator = factor.mediator!
    const reproducedSource = sample.base.compose(result.cone.legs('source'), mediator)
    const reproducedTarget = sample.base.compose(result.cone.legs('target'), mediator)
    expect(FinSet.equalMor!(reproducedSource, sample.equalizerData.include)).toBe(true)
    expect(FinSet.equalMor!(reproducedTarget, sample.equalizerData.legToY)).toBe(true)

    const nonCone: CategoryLimits.Cone<ParallelObj, FinSetObj, FinSetMor> = {
      tip: sample.objects.X,
      legs: (index) => (index === 'source' ? sample.base.id(sample.objects.X) : sample.equalizerData.f),
      diagram,
    }

    const failure = result.factor(nonCone)
    expect(failure.holds).toBe(false)
    expect(failure.reason).toContain('do not commute')
  })
})

