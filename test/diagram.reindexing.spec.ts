import { describe, expect, test } from 'vitest'
import { CategoryLimits, constructFunctorWithWitness } from '../allTS'
import type { SmallCategory } from '../subcategory'
import type { FunctorCheckSamples } from '../functor'
import type { FunctorWithWitness } from '../functor'
import type { FiniteCategory as FiniteCategoryT } from '../finite-cat'

// Shared node/arrow definitions matching the functorization suite

type Node = 'A' | 'B' | 'C'

interface Arrow {
  readonly name: string
  readonly src: Node
  readonly dst: Node
}

const idArrow = (object: Node): Arrow => ({ name: `id_${object}`, src: object, dst: object })

const arrowA: Arrow = { name: 'a', src: 'A', dst: 'B' }
const arrowB: Arrow = { name: 'b', src: 'B', dst: 'C' }
const arrowC: Arrow = { name: 'c', src: 'A', dst: 'C' }

const identityA = idArrow('A')
const identityB = idArrow('B')
const identityC = idArrow('C')

const allArrows: readonly Arrow[] = [identityA, identityB, identityC, arrowA, arrowB, arrowC]

const compose = (g: Arrow, f: Arrow): Arrow => {
  if (f.dst !== g.src) {
    throw new Error('compose: non-composable arrows')
  }
  if (f.name.startsWith('id_')) return g
  if (g.name.startsWith('id_')) return f
  if (f === arrowA && g === arrowB) return arrowC
  if (f === identityA && g === arrowC) return arrowC
  if (f === arrowC && g === identityC) return arrowC
  throw new Error(`compose: missing composite for ${f.name};${g.name}`)
}

const smallShape: SmallCategory<Node, Arrow> = {
  objects: new Set<Node>(['A', 'B', 'C']),
  arrows: new Set<Arrow>(allArrows),
  id: idArrow,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
}

const finiteShape: FiniteCategoryT<Node, Arrow> = {
  objects: ['A', 'B', 'C'],
  arrows: allArrows,
  id: idArrow,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
  eq: (left, right) => left.name === right.name,
}

const finiteBase = {
  ...finiteShape,
  dom: (arrow: Arrow): Node => arrow.src,
  cod: (arrow: Arrow): Node => arrow.dst,
}

const subShape: SmallCategory<Node, Arrow> = {
  objects: new Set<Node>(['A', 'B']),
  arrows: new Set<Arrow>([identityA, identityB, arrowA]),
  id: idArrow,
  compose,
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
}

const inclusionSamples: FunctorCheckSamples<Node, Arrow> = {
  objects: ['A', 'B'],
  arrows: [identityA, identityB, arrowA],
  composablePairs: [{ f: identityA, g: arrowA }],
}

const inclusion: FunctorWithWitness<Node, Arrow, Node, Arrow> = constructFunctorWithWitness(
  subShape,
  smallShape,
  {
    F0: (object: Node): Node => object,
    F1: (arrow: Arrow): Arrow => arrow,
  },
  inclusionSamples,
)

const makeConstantConeFactor = (indices: ReadonlyArray<Node>) =>
  (candidate: CategoryLimits.Cone<Node, Node, Arrow>) => {
    let mediator: Arrow | undefined
    for (const index of indices) {
      let leg: Arrow
      try {
        leg = candidate.legs(index)
      } catch (error) {
        return { holds: false, reason: `missing leg ${String(index)}` }
      }
      if (finiteBase.dom(leg) !== candidate.tip) {
        return {
          holds: false,
          reason: `leg ${String(index)} has domain ${String(finiteBase.dom(leg))} instead of ${String(candidate.tip)}`,
        }
      }
      if (finiteBase.cod(leg) !== 'A') {
        return {
          holds: false,
          reason: `leg ${String(index)} targets ${String(finiteBase.cod(leg))} rather than A`,
        }
      }
      if (!mediator) {
        mediator = leg
      } else if (!finiteBase.eq(leg, mediator)) {
        return { holds: false, reason: 'legs disagree on their images in the constant cone' }
      }
    }
    const finalMediator = mediator ?? finiteBase.id('A')
    return { holds: true, mediator: finalMediator }
  }

const makeConstantCoconeFactor = (indices: ReadonlyArray<Node>) =>
  (candidate: CategoryLimits.Cocone<Node, Node, Arrow>): CategoryLimits.CoequalizerFactorizationResult<Arrow> => {
    let mediator: Arrow | undefined
    for (const index of indices) {
      let leg: Arrow
      try {
        leg = candidate.legs(index)
      } catch (error) {
        return { factored: false, reason: `missing leg ${String(index)}` }
      }
      if (finiteBase.dom(leg) !== 'A') {
        return {
          factored: false,
          reason: `leg ${String(index)} originates at ${String(finiteBase.dom(leg))} instead of A`,
        }
      }
      if (finiteBase.cod(leg) !== candidate.coTip) {
        return {
          factored: false,
          reason: `leg ${String(index)} targets ${String(finiteBase.cod(leg))} instead of the cocone cotip`,
        }
      }
      if (!mediator) {
        mediator = leg
      } else if (!finiteBase.eq(leg, mediator)) {
        return { factored: false, reason: 'legs disagree on their images in the constant cocone' }
      }
    }
    const finalMediator = mediator ?? finiteBase.id(candidate.coTip)
    return { factored: true, mediator: finalMediator }
  }

const makeConeCategoryStub = (cone: CategoryLimits.Cone<Node, Node, Arrow>): CategoryLimits.ConeCategoryResult<Node, Node, Arrow> => {
  const id = (value: CategoryLimits.Cone<Node, Node, Arrow>): CategoryLimits.ConeMorphism<Node, Node, Arrow> => ({
    source: value,
    target: value,
    mediator: finiteBase.id(value.tip),
  })
  return {
    category: {
      objects: [cone],
      arrows: [id(cone)],
      id,
      compose: (g, f) => ({
        source: f.source,
        target: g.target,
        mediator: finiteBase.compose(g.mediator, f.mediator),
      }),
      src: (arrow) => arrow.source,
      dst: (arrow) => arrow.target,
      eq: (left, right) => finiteBase.eq(left.mediator, right.mediator),
    },
    locateCone: (candidate) => (candidate === cone ? cone : undefined),
    morphisms: (source, target) => (source === cone && target === cone ? [id(cone)] : []),
  }
}

describe('diagram reindexing and comparison helpers', () => {
  const identityDiagram = CategoryLimits.makeFiniteDiagram<Node, Arrow, Node, Arrow>({
    shape: finiteShape,
    onObjects: (object) => object,
    onMorphisms: (arrow) => arrow,
  })

  const reindexing = CategoryLimits.reindexDiagram({
    base: finiteBase,
    changeOfShape: inclusion,
    diagram: identityDiagram,
    eq: finiteBase.eq,
  })

  test('reindexDiagram restricts cones and cocones along inclusions', () => {
    const cone: CategoryLimits.Cone<Node, Node, Arrow> = {
      tip: 'A',
      legs: (index: Node) => {
        if (index === 'A') return identityA
        if (index === 'B') return arrowA
        return arrowC
      },
      diagram: identityDiagram,
    }

    const cocone: CategoryLimits.Cocone<Node, Node, Arrow> = {
      coTip: 'C',
      legs: (index: Node) => {
        if (index === 'A') return arrowC
        if (index === 'B') return arrowB
        return identityC
      },
      diagram: identityDiagram,
    }

    const restrictedCone = reindexing.restrictCone(cone)
    expect(restrictedCone.analysis.holds).toBe(true)
    expect(restrictedCone.cone.legs('A')).toBe(identityA)
    expect(restrictedCone.cone.legs('B')).toBe(arrowA)

    const restrictedCocone = reindexing.restrictCocone(cocone)
    expect(restrictedCocone.analysis.holds).toBe(true)
    expect(restrictedCocone.cocone.legs('A')).toBe(arrowC)
    expect(restrictedCocone.cocone.legs('B')).toBe(arrowB)
  })

  const constantDiagram = CategoryLimits.constantDiagram({
    shape: smallShape,
    base: finiteBase,
    object: 'A',
  })

  const originalLimitCone: CategoryLimits.Cone<Node, Node, Arrow> = {
    tip: 'A',
    legs: () => identityA,
    diagram: constantDiagram,
  }

  const reindexedLimitCone: CategoryLimits.Cone<Node, Node, Arrow> = {
    tip: 'A',
    legs: () => identityA,
    diagram: reindexing.diagram,
  }

  const originalLimit: CategoryLimits.LimitOfDiagramResult<Node, Node, Arrow> = {
    cone: originalLimitCone,
    factor: makeConstantConeFactor(['A', 'B', 'C']),
    coneCategory: makeConeCategoryStub(originalLimitCone),
    terminality: { holds: true, mediators: [], locatedLimit: originalLimitCone },
  }

  const reindexedLimit: CategoryLimits.LimitOfDiagramResult<Node, Node, Arrow> = {
    cone: reindexedLimitCone,
    factor: makeConstantConeFactor(['A', 'B']),
    coneCategory: makeConeCategoryStub(reindexedLimitCone),
    terminality: { holds: true, mediators: [], locatedLimit: reindexedLimitCone },
  }

  const originalColimit: CategoryLimits.FiniteColimitFromCoproductsAndCoequalizersWitness<Node, Node, Arrow> = {
    coproduct: { obj: 'A', injections: () => identityA },
    pair: [identityA, identityA],
    coequalizer: { obj: 'A', coequalize: identityA },
    cocone: {
      coTip: 'A',
      legs: () => identityA,
      diagram: constantDiagram,
    },
    factor: makeConstantCoconeFactor(['A', 'B', 'C']),
  }

  const reindexedColimit: CategoryLimits.FiniteColimitFromCoproductsAndCoequalizersWitness<Node, Node, Arrow> = {
    coproduct: { obj: 'A', injections: () => identityA },
    pair: [identityA, identityA],
    coequalizer: { obj: 'A', coequalize: identityA },
    cocone: {
      coTip: 'A',
      legs: () => identityA,
      diagram: reindexing.diagram,
    },
    factor: makeConstantCoconeFactor(['A', 'B']),
  }

  test('limitComparisonAlong produces canonical comparison isomorphisms', () => {
    const result = CategoryLimits.limitComparisonAlong({
      base: finiteBase,
      changeOfShape: inclusion,
      diagram: constantDiagram,
      originalLimit,
      reindexedLimit,
      eq: finiteBase.eq,
    })

    expect(result.restrictionAnalysis.holds).toBe(true)
    expect(result.factorization.holds).toBe(true)
    expect(result.comparison?.isomorphism).toBe(true)
    expect(result.comparison?.mediator).toBe(identityA)
  })

  test('limitComparisonAlong surfaces missing finality explanations when comparison is not an iso', () => {
    const skewLimit: CategoryLimits.LimitOfDiagramResult<Node, Node, Arrow> = {
      ...reindexedLimit,
      factor: () => ({ holds: true, mediator: arrowA }),
    }

    const result = CategoryLimits.limitComparisonAlong({
      base: finiteBase,
      changeOfShape: inclusion,
      diagram: constantDiagram,
      originalLimit,
      reindexedLimit: skewLimit,
      eq: finiteBase.eq,
    })

    expect(result.factorization.holds).toBe(true)
    expect(result.comparison?.isomorphism).toBe(false)
    expect(result.comparison?.reason).toContain('no finality witness')
  })

  test('colimitComparisonAlong produces canonical comparison isomorphisms', () => {
    const result = CategoryLimits.colimitComparisonAlong({
      base: finiteBase,
      changeOfShape: inclusion,
      diagram: constantDiagram,
      originalColimit,
      reindexedColimit,
      eq: finiteBase.eq,
    })

    expect(result.restrictionAnalysis.holds).toBe(true)
    expect(result.factorization.factored).toBe(true)
    expect(result.comparison?.isomorphism).toBe(true)
    expect(result.comparison?.mediator).toBe(identityA)
  })

  test('colimitComparisonAlong integrates cofinality diagnostics when the comparison fails', () => {
    const skewColimit: CategoryLimits.FiniteColimitFromCoproductsAndCoequalizersWitness<Node, Node, Arrow> = {
      ...reindexedColimit,
      factor: () => ({ factored: true, mediator: arrowA }),
    }

    const result = CategoryLimits.colimitComparisonAlong({
      base: finiteBase,
      changeOfShape: inclusion,
      diagram: constantDiagram,
      originalColimit,
      reindexedColimit: skewColimit,
      eq: finiteBase.eq,
      cofinality: { holds: false, reason: 'inclusion functor is not cofinal' },
    })

    expect(result.factorization.factored).toBe(true)
    expect(result.comparison?.isomorphism).toBe(false)
    expect(result.comparison?.reason).toContain('not cofinal')
  })
})
