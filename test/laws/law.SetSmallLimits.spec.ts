import { describe, expect, it } from 'vitest'

import { CategoryLimits } from '../../allTS'
import { IndexedFamilies } from '../../stdlib/indexed-families'
import type { ArrowFamilies } from '../../stdlib/arrow-families'
import type { Category } from '../../stdlib/category'
import { SetCat, type SetHom, type SetObj } from '../../set-cat'

type Obj = 'X' | 'Y' | 'Z'
type Arr = 'idX' | 'idY' | 'idZ' | 'f' | 'h'

const equalSetHom = <A, B>(left: SetHom<A, B>, right: SetHom<A, B>): boolean => {
  if (left.dom !== right.dom || left.cod !== right.cod) {
    return false
  }
  for (const value of left.dom) {
    if (!right.dom.has(value)) {
      return false
    }
    const leftImage = left.map(value)
    const rightImage = right.map(value)
    if (!Object.is(leftImage, rightImage)) {
      return false
    }
  }
  return true
}

type AnySetObj = SetObj<unknown>
type AnySetHom = SetHom<unknown, unknown>

const widenHom = <A, B>(hom: SetHom<A, B>): AnySetHom => hom as unknown as AnySetHom
const widenObj = <A>(obj: SetObj<A>): AnySetObj => obj as unknown as AnySetObj

const makeProductMetadata = () => {
  const metadata = new WeakMap<AnySetObj, { arity: number; lookup: Map<string, ReadonlyArray<unknown>> }>()

  const buildKey = (coordinates: ReadonlyArray<unknown>): string => JSON.stringify(coordinates)

  const buildProduct = (objects: ReadonlyArray<AnySetObj>) => {
    const tuples: Array<ReadonlyArray<unknown>> = []
    const lookup = new Map<string, ReadonlyArray<unknown>>()

    const build = (prefix: unknown[], index: number) => {
      if (index === objects.length) {
        const tuple = Object.freeze(prefix.slice()) as ReadonlyArray<unknown>
        tuples.push(tuple)
        lookup.set(buildKey(tuple), tuple)
        return
      }
      const object = objects[index]
      if (!object) {
        throw new Error('Set small product: missing factor for index')
      }
      for (const value of object) {
        prefix[index] = value
        build(prefix, index + 1)
      }
    }

    build([], 0)
    const rawCarrier = SetCat.obj(tuples)
    const carrier = widenObj(rawCarrier)
    metadata.set(carrier, { arity: objects.length, lookup })

    const projections = objects.map((object, position) =>
      widenHom(
        SetCat.hom<unknown, unknown>(
          carrier,
          object,
          (tuple: unknown) => (tuple as ReadonlyArray<unknown>)[position]!,
        ),
      ),
    )

    return { carrier, projections }
  }

  const tuple = (
    domain: SetObj<unknown>,
    legs: ReadonlyArray<SetHom<unknown, unknown>>,
    product: SetObj<unknown>,
  ): SetHom<unknown, unknown> => {
    const data = metadata.get(product)
    if (!data) {
      throw new Error('Set small product tuple: unrecognised product carrier')
    }
    if (legs.length !== data.arity) {
      throw new Error('Set small product tuple: leg count does not match product arity')
    }

    return SetCat.hom<unknown, unknown>(domain, product, (value: unknown) => {
      const coordinates = legs.map((leg) => leg.map(value))
      const key = buildKey(coordinates)
      const tupleValue = data.lookup.get(key)
      if (!tupleValue) {
        throw new Error('Set small product tuple: legs do not land in the recorded product tuple')
      }
      return tupleValue as unknown
    })
  }

  return { buildProduct, tuple }
}

const { buildProduct, tuple: tupleProduct } = makeProductMetadata()

const setSmallProducts: CategoryLimits.HasSmallProductMediators<SetObj<unknown>, SetHom<unknown, unknown>> = {
  product: (objects) => {
    const { carrier, projections } = buildProduct(objects)
    return { obj: carrier, projections }
  },
  smallProduct<I>(index: IndexedFamilies.SmallIndex<I>, family: IndexedFamilies.SmallFamily<I, SetObj<unknown>>) {
    const finite = IndexedFamilies.ensureFiniteIndex(index)
    const factors = finite.carrier.map((entry) => widenObj(family(entry)))
    const { carrier, projections } = buildProduct(factors)
    const projectionMap = new Map<I, AnySetHom>()
    finite.carrier.forEach((entry, position) => {
      const projection = projections[position]
      if (!projection) {
        throw new Error('Set small product: projection missing for enumerated index')
      }
      projectionMap.set(entry, projection)
    })
    const projectionFamily: IndexedFamilies.SmallFamily<I, AnySetHom> = (entry) => {
      const projection = projectionMap.get(entry)
      if (!projection) {
        throw new Error('Set small product: index outside enumerated carrier')
      }
      return projection
    }
    return { obj: carrier, projections: projectionFamily }
  },
  tuple(domain, legs, product) {
    return tupleProduct(domain, legs, product)
  },
}

const setSmallEqualizers: CategoryLimits.HasSmallEqualizers<SetObj<unknown>, SetHom<unknown, unknown>> = {
  smallEqualizer<I>(index: IndexedFamilies.SmallIndex<I>, parallel: IndexedFamilies.SmallFamily<I, AnySetHom>) {
    const finite = IndexedFamilies.ensureFiniteIndex(index)
    if (finite.carrier.length !== 2) {
      throw new Error('Set small equalizer: expected a parallel pair of arrows')
    }
    const leftKey = finite.carrier[0]!
    const rightKey = finite.carrier[1]!
    const left = parallel(leftKey)
    const right = parallel(rightKey)
    if (left.dom !== right.dom || left.cod !== right.cod) {
      throw new Error('Set small equalizer: parallel morphisms must share domain and codomain')
    }

    const subset: unknown[] = []
    for (const value of left.dom) {
      const leftImage = left.map(value)
      const rightImage = right.map(value)
      if (Object.is(leftImage, rightImage)) {
        subset.push(value)
      }
    }

    const equalizerObj = widenObj(SetCat.obj(subset))
    const inclusion = widenHom(SetCat.hom(equalizerObj, left.dom, (value: unknown) => value))
    const equalizeFamily: IndexedFamilies.SmallFamily<I, AnySetHom> = () => inclusion
    return { obj: equalizerObj, equalize: equalizeFamily }
  },
}

const factorThroughEqualizer: CategoryLimits.EqualizerFactorizer<AnySetHom> = ({ left, right, inclusion, fork }) => {
  const viaLeft = SetCat.compose(left, fork)
  const viaRight = SetCat.compose(right, fork)
  if (!equalSetHom(viaLeft, viaRight)) {
    return {
      factored: false,
      reason: 'Set small limit: supplied cone does not equalize the canonical parallel pair',
    }
  }

  const apex = inclusion.dom
  const mediator = SetCat.hom(fork.dom, apex, (value) => {
    const image = fork.map(value)
    if (!apex.has(image)) {
      throw new Error('Set small limit: fork does not land in the equalizing subset')
    }
    return image
  })

  return { factored: true, mediator }
}

const SetLimitBase: CategoryLimits.HasSmallProducts<AnySetObj, AnySetHom> &
  CategoryLimits.HasSmallEqualizers<AnySetObj, AnySetHom> &
  Category<AnySetObj, AnySetHom> &
  ArrowFamilies.HasDomCod<AnySetObj, AnySetHom> = {
    id: (object) => widenHom(SetCat.id(object)),
    compose: (g, f) => widenHom(SetCat.compose(g, f)),
    dom: (morphism) => widenObj(morphism.dom),
    cod: (morphism) => widenObj(morphism.cod),
    smallProduct: (...args) => {
      if (!setSmallProducts.smallProduct) {
        throw new Error('Set small limit: small product witness is unavailable')
      }
      return setSmallProducts.smallProduct(...args)
    },
    smallEqualizer: (...args) => setSmallEqualizers.smallEqualizer(...args),
  }

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
      products: setSmallProducts,
      diagram,
      factorEqualizer: factorThroughEqualizer,
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
      products: setSmallProducts,
      diagram,
      factorEqualizer: factorThroughEqualizer,
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
        products: setSmallProducts,
        diagram,
        factorEqualizer: factorThroughEqualizer,
        guard: { objects: 5 },
      }),
    ).toThrow(/materialiseSmallIndex/)
  })
})

