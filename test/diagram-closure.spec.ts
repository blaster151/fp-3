import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { DiagramClosure } from '../allTS'

// Ambient finite category with parallel arrows and explicit composites

type Obj = 'A' | 'B' | 'C'
type Arr =
  | 'id_A'
  | 'id_B'
  | 'id_C'
  | 'f'
  | 'f_alt'
  | 'g'
  | 'g_alt'
  | 'h_ff'
  | 'h_f_falt'
  | 'h_galt_f'
  | 'h_galt_falt'

const objects: ReadonlySet<Obj> = new Set(['A', 'B', 'C'])
const identities: Record<Obj, Arr> = {
  A: 'id_A',
  B: 'id_B',
  C: 'id_C',
}
const arrowEndpoints: Record<Arr, { src: Obj; dst: Obj }> = {
  id_A: { src: 'A', dst: 'A' },
  id_B: { src: 'B', dst: 'B' },
  id_C: { src: 'C', dst: 'C' },
  f: { src: 'A', dst: 'B' },
  f_alt: { src: 'A', dst: 'B' },
  g: { src: 'B', dst: 'C' },
  g_alt: { src: 'B', dst: 'C' },
  h_ff: { src: 'A', dst: 'C' },
  h_f_falt: { src: 'A', dst: 'C' },
  h_galt_f: { src: 'A', dst: 'C' },
  h_galt_falt: { src: 'A', dst: 'C' },
}

const compositeTable: Partial<Record<Arr, Partial<Record<Arr, Arr>>>> = {
  g: {
    f: 'h_ff',
    f_alt: 'h_f_falt',
  },
  g_alt: {
    f: 'h_galt_f',
    f_alt: 'h_galt_falt',
  },
}

const allArrows: ReadonlySet<Arr> = new Set(Object.keys(arrowEndpoints) as Arr[])

const compose = (g: Arr, f: Arr): Arr => {
  const fDst = arrowEndpoints[f]?.dst
  const gSrc = arrowEndpoints[g]?.src
  if (fDst === undefined || gSrc === undefined) {
    throw new Error('Unknown arrow supplied to compose')
  }
  if (fDst !== gSrc) {
    throw new Error('compose: domain/codomain mismatch')
  }
  if (f === identities[arrowEndpoints[f].src]) {
    return g
  }
  if (g === identities[arrowEndpoints[g].dst]) {
    return f
  }
  const composite = compositeTable[g]?.[f]
  if (!composite) {
    throw new Error('compose: composite not present in ambient category')
  }
  return composite
}

const ambient = {
  objects,
  arrows: allArrows,
  id: (object: Obj): Arr => identities[object],
  compose,
  src: (arrow: Arr): Obj => arrowEndpoints[arrow]!.src,
  dst: (arrow: Arr): Obj => arrowEndpoints[arrow]!.dst,
}

const target = {
  id: (object: Obj): Arr => identities[object],
  compose,
  dom: (arrow: Arr): Obj => arrowEndpoints[arrow]!.src,
  cod: (arrow: Arr): Obj => arrowEndpoints[arrow]!.dst,
  equalMor: (left: Arr, right: Arr): boolean => left === right,
}

const assignmentArb = fc.record({
  f: fc.constantFrom<Arr>('f', 'f_alt'),
  fAlt: fc.constantFrom<Arr>('f', 'f_alt'),
  g: fc.constantFrom<Arr>('g', 'g_alt'),
  gAlt: fc.constantFrom<Arr>('g', 'g_alt'),
})

describe('DiagramClosure.closeFiniteDiagram', () => {
  it('adjoins identities and ambient composites for parallel shapes', () => {
    fc.assert(
      fc.property(assignmentArb, ({ f, fAlt, g, gAlt }) => {
        const diagram = DiagramClosure.closeFiniteDiagram({
          ambient,
          target,
          onObjects: (object: Obj) => object,
          seeds: [
            { arrow: 'f', morphism: f },
            { arrow: 'f_alt', morphism: fAlt },
            { arrow: 'g', morphism: g },
            { arrow: 'g_alt', morphism: gAlt },
          ],
        })

        expect(diagram.arrowLookup.get('id_A')).toEqual('id_A')
        expect(diagram.arrowLookup.get('id_B')).toEqual('id_B')
        expect(diagram.arrowLookup.get('id_C')).toEqual('id_C')

        expect(diagram.arrowLookup.get('h_ff')).toEqual(target.compose(g, f))
        expect(diagram.arrowLookup.get('h_f_falt')).toEqual(target.compose(g, fAlt))
        expect(diagram.arrowLookup.get('h_galt_f')).toEqual(target.compose(gAlt, f))
        expect(diagram.arrowLookup.get('h_galt_falt')).toEqual(target.compose(gAlt, fAlt))
      }),
    )
  })

  it('remains functorial after saturation', () => {
    fc.assert(
      fc.property(assignmentArb, ({ f, fAlt, g, gAlt }) => {
        const diagram = DiagramClosure.closeFiniteDiagram({
          ambient,
          target,
          onObjects: (object: Obj) => object,
          seeds: [
            { arrow: 'f', morphism: f },
            { arrow: 'f_alt', morphism: fAlt },
            { arrow: 'g', morphism: g },
            { arrow: 'g_alt', morphism: gAlt },
          ],
        })

        for (const arrow of diagram.arrows) {
          const morphism = diagram.onMorphisms(arrow)
          expect(target.dom(morphism)).toEqual(diagram.shape.dom(arrow))
          expect(target.cod(morphism)).toEqual(diagram.shape.cod(arrow))
        }

        for (const left of diagram.arrows) {
          for (const right of diagram.arrows) {
            if (diagram.shape.cod(left) !== diagram.shape.dom(right)) continue

            const compositeArrow = diagram.shape.compose(right, left)
            const imageLeft = diagram.onMorphisms(left)
            const imageRight = diagram.onMorphisms(right)
            const imageComposite = diagram.onMorphisms(compositeArrow)
            const expected = target.compose(imageRight, imageLeft)

            expect(imageComposite).toEqual(expected)
          }
        }
      }),
    )
  })
})
