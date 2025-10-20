import { describe, expect, it } from 'vitest'

import { CategoryLimits } from '../../allTS'
import { IndexedFamilies } from '../../stdlib/indexed-families'
import { SetCat, type SetHom, type SetObj } from '../../set-cat'
import {
  SetLimitBase,
  SetSmallProducts,
  equalSetHom,
  factorThroughSetEqualizer,
  type SetSmallHom,
  type SetSmallObj,
} from '../../set-small-limits'

type Obj = 'X' | 'Y' | 'Z'
type Arr = 'idX' | 'idY' | 'idZ' | 'f' | 'h'

type AnySetObj = SetSmallObj
type AnySetHom = SetSmallHom

const widenHom = <A, B>(hom: SetHom<A, B>): AnySetHom => hom as unknown as AnySetHom
const widenObj = <A>(obj: SetObj<A>): AnySetObj => obj as unknown as AnySetObj

const setDiagram = () => {
  const X = SetCat.obj(['x0', 'x1'])
  const Y = SetCat.obj(['y0', 'y1', 'y2'])
  const Z = SetCat.obj(['z0', 'z1', 'z2'])

  const f: SetHom<string, string> = SetCat.hom(X, Z, (value) => (value === 'x0' ? 'z0' : 'z2'))
  const h: SetHom<string, string> = SetCat.hom(Y, Z, (value) =>
    value === 'y0' ? 'z0' : value === 'y1' ? 'z1' : 'z2',
  )

  const objects: Obj[] = ['X', 'Y', 'Z']
  const arrows: Arr[] = ['idX', 'idY', 'idZ', 'f', 'h']

  const shape: CategoryLimits.SmallDiagram<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>['shape'] = {
    objects: new Set(objects),
    arrows: new Set(arrows),
    id: (object) => `id${object}` as Arr,
    compose: (g, f) => {
      if (f === 'idX' || f === 'idY' || f === 'idZ') return g
      if (g === 'idX' || g === 'idY' || g === 'idZ') return f
      throw new Error('setDiagram: non-identity compositions are undefined in the span shape')
    },
    src: (arrow) => {
      switch (arrow) {
        case 'f':
          return 'X'
        case 'h':
          return 'Y'
        case 'idX':
          return 'X'
        case 'idY':
          return 'Y'
        case 'idZ':
          return 'Z'
      }
    },
    dst: (arrow) => {
      switch (arrow) {
        case 'f':
        case 'idZ':
          return 'Z'
        case 'h':
          return 'Z'
        case 'idX':
          return 'X'
        case 'idY':
          return 'Y'
      }
    },
  }

  const objectIndex = IndexedFamilies.smallIndex(() => objects)
  const arrowIndex = IndexedFamilies.smallIndex(() => arrows)
  const onObjects: IndexedFamilies.SmallFamily<Obj, AnySetObj> = (index) => {
    switch (index) {
      case 'X':
        return widenObj(X)
      case 'Y':
        return widenObj(Y)
      case 'Z':
        return widenObj(Z)
    }
  }
  const onMorphisms: IndexedFamilies.SmallFamily<Arr, AnySetHom> = (arrow) => {
    switch (arrow) {
      case 'f':
        return widenHom(f)
      case 'h':
        return widenHom(h)
      case 'idX':
        return widenHom(SetCat.id(X))
      case 'idY':
        return widenHom(SetCat.id(Y))
      case 'idZ':
        return widenHom(SetCat.id(Z))
    }
  }

  const diagram: CategoryLimits.SmallDiagram<Obj, Arr, AnySetObj, AnySetHom> = {
    shape,
    objectIndex,
    onObjects,
    arrowIndex,
    onMorphisms,
  }

  return { diagram, X, Y, Z, f, h }
}

describe('Set small limits from products and equalizers', () => {
  it('constructs the canonical cone and factors commuting cones uniquely', () => {
    const { diagram, X, Y, Z } = setDiagram()

    const witness = CategoryLimits.smallLimitFromProductsAndEqualizers({
      base: SetLimitBase,
      products: SetSmallProducts,
      diagram,
      factorEqualizer: factorThroughSetEqualizer,
    })

    const { cone } = witness

    for (const arrow of ['f', 'h'] as const) {
      const source = diagram.shape.src(arrow)
      const target = diagram.shape.dst(arrow)
      const transported = SetCat.compose(diagram.onMorphisms(arrow), cone.legs(source))
      const expected = cone.legs(target)
      expect(equalSetHom(transported, expected)).toBe(true)
    }

    const candidateTip = SetCat.obj(['c0', 'c1'])
    const toX = SetCat.hom(candidateTip, X, (value) => (value === 'c0' ? 'x0' : 'x1'))
    const toY = SetCat.hom(candidateTip, Y, (value) => (value === 'c0' ? 'y0' : 'y2'))
    const toZ = SetCat.hom(candidateTip, Z, (value) => (value === 'c0' ? 'z0' : 'z2'))

  const candidate: CategoryLimits.Cone<Obj, AnySetObj, AnySetHom> = {
      tip: candidateTip,
      diagram,
      legs: (index) => {
        switch (index) {
          case 'X':
            return widenHom(toX)
          case 'Y':
            return widenHom(toY)
          case 'Z':
            return widenHom(toZ)
        }
      },
    }

    const factored = witness.factor(candidate)
    expect(factored.factored).toBe(true)
    const mediator = factored.mediator!

    for (const index of ['X', 'Y', 'Z'] as const) {
      const recomposed = SetCat.compose(cone.legs(index), mediator)
      expect(equalSetHom(recomposed, candidate.legs(index))).toBe(true)
    }
  })

  it('rejects cones that fail the commuting condition', () => {
    const { diagram, X, Y, Z } = setDiagram()

    const witness = CategoryLimits.smallLimitFromProductsAndEqualizers({
      base: SetLimitBase,
      products: SetSmallProducts,
      diagram,
      factorEqualizer: factorThroughSetEqualizer,
    })

    const candidateTip = SetCat.obj(['d0'])
    const toX = SetCat.hom(candidateTip, X, () => 'x0')
    const toY = SetCat.hom(candidateTip, Y, () => 'y1')
    const toZ = SetCat.hom(candidateTip, Z, () => 'z0')

  const candidate: CategoryLimits.Cone<Obj, AnySetObj, AnySetHom> = {
      tip: candidateTip,
      diagram,
      legs: (index) => {
        switch (index) {
          case 'X':
            return widenHom(toX)
          case 'Y':
            return widenHom(toY)
          case 'Z':
            return widenHom(toZ)
        }
      },
    }

    const factored = witness.factor(candidate)
    expect(factored.factored).toBe(false)
    expect(factored.reason).toMatch(/does not commute/)
  })

  it('fails when object families are genuinely infinite and exceed the guard', () => {
    const objectIndex = IndexedFamilies.smallIndex(function* () {
      while (true) {
        yield 'X' as Obj
      }
    })

    const arrowIndex = IndexedFamilies.smallIndex(() => ['idX'] as Arr[])

    const point = SetCat.obj([Symbol('point')])

    const diagram: CategoryLimits.SmallDiagram<Obj, Arr, AnySetObj, AnySetHom> = {
      shape: {
        objects: new Set<Obj>(['X']),
        arrows: new Set<Arr>(['idX']),
        id: () => 'idX',
        compose: () => 'idX',
        src: () => 'X',
        dst: () => 'X',
      },
      objectIndex,
      onObjects: () => widenObj(point),
      arrowIndex,
      onMorphisms: () => widenHom(SetCat.id(point)),
    }

    expect(() =>
      CategoryLimits.smallLimitFromProductsAndEqualizers({
        base: SetLimitBase,
        products: SetSmallProducts,
        diagram,
        factorEqualizer: factorThroughSetEqualizer,
        guard: { objects: 5 },
      }),
    ).toThrow(/materialiseSmallIndex/)
  })

  it('supports products indexed by enumerators without a finite carrier', () => {
    const index = IndexedFamilies.smallIndex(() => [0, 1, 2])
    const factors: IndexedFamilies.SmallFamily<number, AnySetObj> = (position) =>
      widenObj(SetCat.obj([`v${position}` as const, `w${position}` as const]))

    const product = SetSmallProducts.smallProduct(index, factors)
    const domain = SetCat.obj(['⋆'])
    const legs = [0, 1, 2].map((position) =>
      widenHom(
        SetCat.hom(domain, factors(position), () => `v${position}` as const),
      ),
    )

    const mediator = SetSmallProducts.tuple(domain, legs, product.obj)
    const tuple = mediator.map('⋆') as ReadonlyMap<number, string>

    expect(tuple.get(0)).toBe('v0')
    expect(tuple.get(2)).toBe('v2')
  })
})

