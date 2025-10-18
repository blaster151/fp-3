import { describe, expect, it } from 'vitest'

import { CategoryLimits, FinSet, IndexedFamilies, makeFinSetObj } from '../../allTS'
import type { FinSetMor, FinSetObj } from '../../allTS'
import type { FiniteCategory } from '../../finite-cat'

type ShapeObj = 'A' | 'B'

type ShapeArrow =
  | { kind: 'id'; object: ShapeObj }
  | { kind: 'edge'; name: 'p' | 'q'; source: ShapeObj; target: ShapeObj }

const idArrow = (object: ShapeObj): ShapeArrow => ({ kind: 'id', object })

const edgeArrow = (name: 'p' | 'q'): ShapeArrow => ({ kind: 'edge', name, source: 'A', target: 'B' })

const shapeObjects: ReadonlyArray<ShapeObj> = ['A', 'B']

const idA = idArrow('A')
const idB = idArrow('B')
const pArrow = edgeArrow('p')
const qArrow = edgeArrow('q')

const shapeArrows: ReadonlyArray<ShapeArrow> = [idA, idB, pArrow, qArrow]

const shape: FiniteCategory<ShapeObj, ShapeArrow> & {
  readonly dom: (arrow: ShapeArrow) => ShapeObj
  readonly cod: (arrow: ShapeArrow) => ShapeObj
  readonly hom: (a: ShapeObj, b: ShapeObj) => ReadonlyArray<ShapeArrow>
} = {
  objects: shapeObjects,
  arrows: shapeArrows,
  id: (object) => (object === 'A' ? idA : idB),
  compose: (g, f) => {
    if (f.kind === 'edge' && g.kind === 'edge') {
      throw new Error('shape: parallel edges do not compose')
    }
    if (f.kind === 'id' && g.kind === 'id') {
      if (f.object !== g.object) {
        throw new Error('shape: identity composition domain mismatch')
      }
      return g
    }
    if (f.kind === 'id' && g.kind === 'edge') {
      if (f.object !== g.source) {
        throw new Error('shape: identity must share source for composition')
      }
      return g
    }
    if (f.kind === 'edge' && g.kind === 'id') {
      if (g.object !== f.target) {
        throw new Error('shape: identity must share target for composition')
      }
      return f
    }
    throw new Error('shape: unsupported composition request')
  },
  src: (arrow) => (arrow.kind === 'id' ? arrow.object : arrow.source),
  dst: (arrow) => (arrow.kind === 'id' ? arrow.object : arrow.target),
  dom: (arrow) => (arrow.kind === 'id' ? arrow.object : arrow.source),
  cod: (arrow) => (arrow.kind === 'id' ? arrow.object : arrow.target),
  hom: (a, b) =>
    shapeArrows.filter(
      (arrow) =>
        (arrow.kind === 'id' && arrow.object === a && arrow.object === b) ||
        (arrow.kind === 'edge' && arrow.source === a && arrow.target === b),
    ),
  eq: (left, right) =>
    left.kind === right.kind &&
    (left.kind === 'id'
      ? left.object === (right as ShapeArrow & { kind: 'id' }).object
      : left.name === (right as ShapeArrow & { kind: 'edge' }).name),
} 

type FiniteSubsetCategory = FiniteCategory<FinSetObj, FinSetMor> & {
  readonly dom: (arrow: FinSetMor) => FinSetObj
  readonly cod: (arrow: FinSetMor) => FinSetObj
  readonly hom: (a: FinSetObj, b: FinSetObj) => ReadonlyArray<FinSetMor>
}

const makeFiniteSubsetCategory = (
  arrows: ReadonlyArray<FinSetMor>,
  objects: ReadonlyArray<FinSetObj>,
): FiniteSubsetCategory => {
  const eq = FinSet.equalMor ?? ((left: FinSetMor, right: FinSetMor) => {
    if (left.from !== right.from || left.to !== right.to || left.map.length !== right.map.length) {
      return false
    }
    return left.map.every((value, idx) => value === right.map[idx])
  })
  const findArrow = (candidate: FinSetMor): FinSetMor => {
    const located = arrows.find((arrow) => eq(arrow, candidate))
    if (!located) {
      throw new Error('finite subset category: arrow not present in catalogue')
    }
    return located
  }

  return {
    objects,
    arrows,
    id: (object) => findArrow(FinSet.id(object)),
    compose: (g, f) => {
      if (f.to !== g.from) {
        throw new Error('finite subset category: composition domain mismatch')
      }
      return findArrow(FinSet.compose(g, f))
    },
    src: (arrow) => arrow.from,
    dst: (arrow) => arrow.to,
    dom: (arrow) => arrow.from,
    cod: (arrow) => arrow.to,
    hom: (a, b) => arrows.filter((arrow) => arrow.from === a && arrow.to === b),
    eq,
  }
}

describe('CategoryLimits finite diagrams', () => {
  const A = makeFinSetObj([0, 1])
  const B = makeFinSetObj([0, 1])
  const X = makeFinSetObj([0])

  const idASet = FinSet.id(A)
  const idBSet = FinSet.id(B)
  const idXSet = FinSet.id(X)

  const p: FinSetMor = { from: A, to: B, map: [0, 0] }
  const q: FinSetMor = { from: A, to: B, map: [0, 1] }
  const include: FinSetMor = { from: X, to: A, map: [0] }
  const equalized: FinSetMor = FinSet.compose(p, include)
  const nonequalized: FinSetMor = { from: X, to: B, map: [1] }

  const diagram = CategoryLimits.makeFiniteDiagram<ShapeObj, ShapeArrow, FinSetObj, FinSetMor>({
    shape,
    onObjects: (index) => (index === 'A' ? A : B),
    onMorphisms: (arrow) => {
      if (arrow.kind === 'id') {
        return arrow.object === 'A' ? idASet : idBSet
      }
      return arrow.name === 'p' ? p : q
    },
  })

  const indices = IndexedFamilies.finiteIndex<ShapeObj>(['A', 'B'])
  const objectAssignment = (index: ShapeObj): FinSetObj => (index === 'A' ? A : B)

  const spanCategory = makeFiniteSubsetCategory(
    [idASet, idBSet, idXSet, p, q, include, equalized, nonequalized],
    [A, B, X],
  )

  it('validates finite diagram functoriality', () => {
    const result = CategoryLimits.checkFiniteDiagramFunctoriality({
      base: spanCategory,
      eq: FinSet.equalMor!,
      diagram,
    })
    expect(result.holds).toBe(true)
    expect(result.issues).toEqual([])
  })

  it('detects malformed finite diagrams', () => {
    const broken = CategoryLimits.makeFiniteDiagram<ShapeObj, ShapeArrow, FinSetObj, FinSetMor>({
      shape,
      onObjects: (index) => (index === 'A' ? A : B),
      onMorphisms: (arrow) => {
        if (arrow.kind === 'id') {
          return arrow.object === 'A' ? idASet : include
        }
        return arrow.name === 'p' ? p : q
      },
    })
    const result = CategoryLimits.checkFiniteDiagramFunctoriality({
      base: spanCategory,
      eq: FinSet.equalMor!,
      diagram: broken,
    })
    expect(result.holds).toBe(false)
    expect(result.issues.some((issue) => issue.includes('identity mismatch'))).toBe(true)
  })

  it('composes finite diagram paths with parallel arrows', () => {
    const single = CategoryLimits.composeFiniteDiagramPath({
      base: spanCategory,
      diagram,
      path: [pArrow],
    })
    expect(single.defined).toBe(true)
    if (single.defined) {
      expect(FinSet.equalMor!(single.composite, p)).toBe(true)
      expect(single.source).toBe('A')
      expect(single.target).toBe('B')
    }

    const withIdentity = CategoryLimits.composeFiniteDiagramPath({
      base: spanCategory,
      diagram,
      path: [idA, pArrow],
    })
    expect(withIdentity.defined).toBe(true)
    if (withIdentity.defined) {
      expect(FinSet.equalMor!(withIdentity.composite, p)).toBe(true)
    }

    const nonComposable = CategoryLimits.composeFiniteDiagramPath({
      base: spanCategory,
      diagram,
      path: [pArrow, pArrow],
    })
    expect(nonComposable.defined).toBe(false)
    if (!nonComposable.defined) {
      expect(nonComposable.reason).toContain('non-composable')
    }
  })

  it('checks cones against diagrams with multiple parallel arrows', () => {
    const validCone: CategoryLimits.Cone<ShapeObj, FinSetObj, FinSetMor> = {
      tip: X,
      legs: (index) => (index === 'A' ? include : equalized),
      diagram,
    }
    expect(CategoryLimits.coneRespectsDiagram(spanCategory, FinSet.equalMor!, validCone)).toBe(true)

    const invalidCone: CategoryLimits.Cone<ShapeObj, FinSetObj, FinSetMor> = {
      tip: X,
      legs: (index) => (index === 'A' ? include : nonequalized),
      diagram,
    }
    expect(CategoryLimits.coneRespectsDiagram(spanCategory, FinSet.equalMor!, invalidCone)).toBe(false)
  })

  it('enumerates cone categories for non-thin diagrams and rejects mismatched data', () => {
    const coneCategory = CategoryLimits.makeConeCategory({
      base: spanCategory,
      eq: FinSet.equalMor!,
      Ifin: indices,
      F: objectAssignment,
      diagram,
    })

    const located = coneCategory.locateCone({
      tip: X,
      legs: (index) => (index === 'A' ? include : equalized),
      diagram,
    })
    expect(located).toBeDefined()

    expect(() =>
      CategoryLimits.makeConeCategory({
        base: spanCategory,
        eq: FinSet.equalMor!,
        Ifin: indices,
        F: (index: ShapeObj) => (index === 'A' ? A : A),
        diagram,
      }),
    ).toThrow(/disagrees/)
  })
})

