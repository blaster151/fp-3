import { describe, expect, it } from 'vitest'

import {
  DiagramClosure,
  FinSet,
  makeFinSetObj,
  type FinSetMor,
  type FinSetObj,
} from '../allTS'
import type { SmallCategory } from '../subcategory'

type ShapeObj = 'A' | 'B' | 'C'

type ShapeArrow =
  | { kind: 'id'; object: ShapeObj; src: ShapeObj; dst: ShapeObj }
  | { kind: 'edge'; name: 'p' | 'q' | 'r'; source: ShapeObj; target: ShapeObj; src: ShapeObj; dst: ShapeObj }
  | { kind: 'composite'; name: 'rp' | 'rq'; source: ShapeObj; target: ShapeObj; src: ShapeObj; dst: ShapeObj }

const idA: ShapeArrow = { kind: 'id', object: 'A', src: 'A', dst: 'A' }
const idB: ShapeArrow = { kind: 'id', object: 'B', src: 'B', dst: 'B' }
const idC: ShapeArrow = { kind: 'id', object: 'C', src: 'C', dst: 'C' }

const p: ShapeArrow = { kind: 'edge', name: 'p', source: 'A', target: 'B', src: 'A', dst: 'B' }
const q: ShapeArrow = { kind: 'edge', name: 'q', source: 'A', target: 'B', src: 'A', dst: 'B' }
const r: ShapeArrow = { kind: 'edge', name: 'r', source: 'B', target: 'C', src: 'B', dst: 'C' }

const rp: ShapeArrow = { kind: 'composite', name: 'rp', source: 'A', target: 'C', src: 'A', dst: 'C' }
const rq: ShapeArrow = { kind: 'composite', name: 'rq', source: 'A', target: 'C', src: 'A', dst: 'C' }

const ambientCategory: SmallCategory<ShapeObj, ShapeArrow> = {
  objects: new Set<ShapeObj>(['A', 'B', 'C']),
  arrows: new Set<ShapeArrow>([idA, idB, idC, p, q, r, rp, rq]),
  id: (object) => {
    switch (object) {
      case 'A':
        return idA
      case 'B':
        return idB
      case 'C':
        return idC
      default:
        throw new Error('ambientCategory.id: unknown object')
    }
  },
  compose: (g, f) => {
    if (f.kind === 'id') return g
    if (g.kind === 'id') return f
    if (f === p && g === r) return rp
    if (f === q && g === r) return rq
    throw new Error('ambientCategory.compose: unsupported composition request')
  },
  src: (arrow) => arrow.src,
  dst: (arrow) => arrow.dst,
}

const finsetA = makeFinSetObj(['a0', 'a1'])
const finsetB = makeFinSetObj(['b0', 'b1', 'b2'])
const finsetC = makeFinSetObj(['c0', 'c1'])

const objectAssignment = (object: ShapeObj): FinSetObj => {
  switch (object) {
    case 'A':
      return finsetA
    case 'B':
      return finsetB
    case 'C':
      return finsetC
    default:
      throw new Error('objectAssignment: unknown object')
  }
}

const pMor: FinSetMor = { from: finsetA, to: finsetB, map: [0, 1] }
const qMor: FinSetMor = { from: finsetA, to: finsetB, map: [2, 0] }
const rMor: FinSetMor = { from: finsetB, to: finsetC, map: [1, 0, 0] }

const ambientObjects: ShapeObj[] = ['A', 'B', 'C']

describe('DiagramClosure.closeFiniteDiagram', () => {
  it('adds identities and synthesises composites for non-thin diagrams', () => {
    const closed = DiagramClosure.closeFiniteDiagram({
      ambient: ambientCategory,
      target: FinSet,
      onObjects: objectAssignment,
      seeds: [
        { arrow: p, morphism: pMor },
        { arrow: q, morphism: qMor },
        { arrow: r, morphism: rMor },
      ],
      objects: ambientObjects,
      eq: FinSet.equalMor!,
    })

    expect(closed.objects).toEqual(['A', 'B', 'C'])
    expect(closed.arrows).toHaveLength(8)
    expect(closed.arrows).toContain(rp)
    expect(closed.arrows).toContain(rq)

    const idAImage = closed.onMorphisms(idA)
    expect(FinSet.equalMor!(idAImage, FinSet.id(finsetA))).toBe(true)
    expect(FinSet.equalMor!(closed.arrowLookup.get(idA)!, FinSet.id(finsetA))).toBe(true)

    const rpImage = closed.onMorphisms(rp)
    const rqImage = closed.onMorphisms(rq)
    expect(FinSet.equalMor!(rpImage, FinSet.compose(rMor, pMor))).toBe(true)
    expect(FinSet.equalMor!(rqImage, FinSet.compose(rMor, qMor))).toBe(true)
  })

  it('respects functoriality across composed paths', () => {
    const closed = DiagramClosure.closeFiniteDiagram({
      ambient: ambientCategory,
      target: FinSet,
      onObjects: objectAssignment,
      seeds: [
        { arrow: p, morphism: pMor },
        { arrow: q, morphism: qMor },
        { arrow: r, morphism: rMor },
      ],
      objects: ambientObjects,
      eq: FinSet.equalMor!,
    })

    const composed = FinSet.compose(closed.onMorphisms(r), closed.onMorphisms(p))
    expect(FinSet.equalMor!(closed.onMorphisms(rp), composed)).toBe(true)
  })

  it('rejects morphisms whose endpoints do not match their arrows', () => {
    const bad: FinSetMor = { from: finsetC, to: finsetC, map: [0, 1] }
    expect(() =>
      DiagramClosure.closeFiniteDiagram({
        ambient: ambientCategory,
        target: FinSet,
        onObjects: objectAssignment,
        seeds: [{ arrow: p, morphism: bad }],
        objects: ['A', 'B'],
      eq: FinSet.equalMor!,
      }),
    ).toThrow(/closeFiniteDiagram: morphism endpoints do not match the arrow endpoints/)
  })

  it('rejects inconsistent assignments for the same arrow', () => {
    expect(() =>
      DiagramClosure.closeFiniteDiagram({
        ambient: ambientCategory,
        target: FinSet,
        onObjects: objectAssignment,
        seeds: [
          { arrow: p, morphism: pMor },
          { arrow: p, morphism: qMor },
        ],
        objects: ['A', 'B'],
      eq: FinSet.equalMor!,
      }),
    ).toThrow(/closeFiniteDiagram: inconsistent morphism assignment detected/)
  })
})
