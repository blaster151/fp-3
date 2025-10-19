import { describe, expect, it } from 'vitest'

import {
  makeFinitePullbackCalculator,
  productFromPullbacks,
  FinSet,
  makeFinSetObj,
  assertFinSetMor,
  finsetProductFromPullback,
} from '../../allTS'
import type { Category } from '../../stdlib/category'
import { ArrowFamilies } from '../../stdlib/arrow-families'
import type { FiniteCategory } from '../../finite-cat'

interface Arrow {
  readonly name: string
  readonly src: Obj
  readonly dst: Obj
}

type Obj = 'A' | 'B' | 'T' | 'P' | 'X'

type ProductFixture = {
  readonly category: FiniteCategory<Obj, Arrow>
  readonly terminateA: Arrow
  readonly terminateB: Arrow
  readonly projectionA: Arrow
  readonly projectionB: Arrow
  readonly terminateX: Arrow
  readonly xA: Arrow
  readonly xB: Arrow
  readonly mediator: Arrow
}

const makeId = (object: Obj): Arrow => ({ name: `id_${object}`, src: object, dst: object })

const withDomCod = <O, M>(
  category: FiniteCategory<O, M>,
): Category<O, M> & ArrowFamilies.HasDomCod<O, M> => ({
  ...category,
  dom: category.src,
  cod: category.dst,
})

const makeCompose = (table: Record<string, Arrow>) =>
  (g: Arrow, f: Arrow): Arrow => {
    if (f.dst !== g.src) {
      throw new Error('compose: mismatched endpoints')
    }
    if (g.name === `id_${g.src}`) return f
    if (f.name === `id_${f.src}`) return g
    const key = `${g.name}∘${f.name}`
    const arrow = table[key]
    if (!arrow) {
      throw new Error(`compose: missing case ${key}`)
    }
    return arrow
  }

const makeProductFixture = (): ProductFixture => {
  const terminateA: Arrow = { name: 'tA', src: 'A', dst: 'T' }
  const terminateB: Arrow = { name: 'tB', src: 'B', dst: 'T' }
  const terminateP: Arrow = { name: 'tP', src: 'P', dst: 'T' }
  const terminateX: Arrow = { name: 'tX', src: 'X', dst: 'T' }
  const projectionA: Arrow = { name: 'pA', src: 'P', dst: 'A' }
  const projectionB: Arrow = { name: 'pB', src: 'P', dst: 'B' }
  const xA: Arrow = { name: 'xA', src: 'X', dst: 'A' }
  const xB: Arrow = { name: 'xB', src: 'X', dst: 'B' }
  const mediator: Arrow = { name: 'u', src: 'X', dst: 'P' }

  const objects: ReadonlyArray<Obj> = ['A', 'B', 'T', 'P', 'X']
  const arrows: ReadonlyArray<Arrow> = [
    ...objects.map(makeId),
    terminateA,
    terminateB,
    terminateP,
    terminateX,
    projectionA,
    projectionB,
    xA,
    xB,
    mediator,
  ]

  const compose = makeCompose({
    'tA∘pA': terminateP,
    'tB∘pB': terminateP,
    'tA∘xA': terminateX,
    'tB∘xB': terminateX,
    'tP∘u': terminateX,
    'pA∘u': xA,
    'pB∘u': xB,
  })

  const category: FiniteCategory<Obj, Arrow> = {
    objects,
    arrows,
    id: makeId,
    compose,
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq: (left, right) => left.name === right.name,
  }

  return { category, terminateA, terminateB, projectionA, projectionB, terminateX, xA, xB, mediator }
}

const makeBrokenFixture = () => {
  const terminateA: Arrow = { name: 'tA', src: 'A', dst: 'T' }
  const terminateB: Arrow = { name: 'tB', src: 'B', dst: 'T' }
  const terminateX: Arrow = { name: 'tX', src: 'X', dst: 'T' }
  const xA: Arrow = { name: 'xA', src: 'X', dst: 'A' }
  const xB: Arrow = { name: 'xB', src: 'X', dst: 'B' }

  const objects: ReadonlyArray<Obj> = ['A', 'B', 'T', 'X']
  const arrows: ReadonlyArray<Arrow> = [
    ...objects.map(makeId),
    terminateA,
    terminateB,
    terminateX,
    xA,
    xB,
  ]

  const compose = makeCompose({
    'tA∘xA': terminateX,
    'tB∘xB': terminateX,
  })

  const category: FiniteCategory<Obj, Arrow> = {
    objects,
    arrows,
    id: makeId,
    compose,
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq: (left, right) => left.name === right.name,
  }

  return { category, terminateA, terminateB }
}

describe('productFromPullbacks', () => {
  it('reconstructs the binary product from terminal pullbacks', () => {
    const fixture = makeProductFixture()
    const calculator = makeFinitePullbackCalculator(fixture.category)

    const result = productFromPullbacks<Obj, Arrow>({
      category: withDomCod(fixture.category),
      eq: fixture.category.eq,
      calculator,
      terminalObj: 'T',
      leftObj: 'A',
      rightObj: 'B',
      leftTerminate: fixture.terminateA,
      rightTerminate: fixture.terminateB,
    })

    expect(result.product.object).toBe('P')
    expect(fixture.category.eq(result.product.projections[0], fixture.projectionA)).toBe(true)
    expect(fixture.category.eq(result.product.projections[1], fixture.projectionB)).toBe(true)

    const mediator = result.product.tuple('X', [fixture.xA, fixture.xB])
    expect(fixture.category.eq(mediator, fixture.mediator)).toBe(true)
  })

  it('throws when the terminal legs do not admit a pullback', () => {
    const fixture = makeBrokenFixture()
    const calculator = makeFinitePullbackCalculator(fixture.category)

    expect(() =>
      productFromPullbacks<Obj, Arrow>({
        category: withDomCod(fixture.category),
        eq: fixture.category.eq,
        calculator,
        terminalObj: 'T',
        leftObj: 'A',
        rightObj: 'B',
        leftTerminate: fixture.terminateA,
        rightTerminate: fixture.terminateB,
      }),
    ).toThrow(/No pullback found for the supplied arrows\./)
  })
})

describe('finsetProductFromPullback', () => {
  it('agrees with FinSet.product on carriers, projections, and tuples', () => {
    const left = makeFinSetObj(['a0', 'a1'])
    const right = makeFinSetObj(['b0', 'b1', 'b2'])

    const witness = finsetProductFromPullback(left, right)

    expect(witness.product.object).toBe(witness.native.object)
    expect(FinSet.equalMor?.(witness.product.projections[0], witness.native.projections[0])).toBe(true)
    expect(FinSet.equalMor?.(witness.product.projections[1], witness.native.projections[1])).toBe(true)

    const constantRight = assertFinSetMor({
      from: left,
      to: right,
      map: left.elements.map(() => 0),
    })

    const tupleFromPullback = witness.product.tuple(left, [FinSet.id(left), constantRight])
    const tupleFromNative = witness.native.tuple(left, [FinSet.id(left), constantRight])
    expect(FinSet.equalMor?.(tupleFromPullback, tupleFromNative)).toBe(true)

    const leftTerminate = FinSet.terminal.terminate(left)
    const rightTerminate = FinSet.terminal.terminate(right)
    expect(FinSet.equalMor?.(witness.span.left, leftTerminate)).toBe(true)
    expect(FinSet.equalMor?.(witness.span.right, rightTerminate)).toBe(true)

    const factor = witness.product.tuple(witness.product.object, witness.product.projections)
    expect(FinSet.equalMor?.(factor, FinSet.id(witness.product.object))).toBe(true)
  })
})

