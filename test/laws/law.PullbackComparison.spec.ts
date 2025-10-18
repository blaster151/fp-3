import { describe, expect, it } from 'vitest'

import { makeFinitePullbackCalculator } from '../../pullback'
import type { PullbackData } from '../../pullback'
import type { FiniteCategory } from '../../finite-cat'

type Obj = 'A' | 'B' | 'C' | 'P' | 'Q'

interface Arrow {
  readonly name: string
  readonly src: Obj
  readonly dst: Obj
}

const id = (object: Obj): Arrow => ({
  name: `id_${object}`,
  src: object,
  dst: object,
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

const makeComparisonFixture = () => {
  const objects: ReadonlyArray<Obj> = ['A', 'B', 'C', 'P', 'Q']

  const f: Arrow = { name: 'f', src: 'A', dst: 'C' }
  const h: Arrow = { name: 'h', src: 'B', dst: 'C' }
  const pA: Arrow = { name: 'pA', src: 'P', dst: 'A' }
  const pB: Arrow = { name: 'pB', src: 'P', dst: 'B' }
  const cP: Arrow = { name: 'cP', src: 'P', dst: 'C' }
  const qA: Arrow = { name: 'qA', src: 'Q', dst: 'A' }
  const qB: Arrow = { name: 'qB', src: 'Q', dst: 'B' }
  const cQ: Arrow = { name: 'cQ', src: 'Q', dst: 'C' }
  const m: Arrow = { name: 'm', src: 'P', dst: 'Q' }
  const n: Arrow = { name: 'n', src: 'Q', dst: 'P' }
  const arrows: ReadonlyArray<Arrow> = [
    id('A'),
    id('B'),
    id('C'),
    id('P'),
    id('Q'),
    f,
    h,
    pA,
    pB,
    cP,
    qA,
    qB,
    cQ,
    m,
    n,
  ]

  const compose = makeCompose({
    'f∘pA': cP,
    'h∘pB': cP,
    'f∘qA': cQ,
    'h∘qB': cQ,
    'qA∘m': pA,
    'qB∘m': pB,
    'pA∘n': qA,
    'pB∘n': qB,
    'n∘m': id('P'),
    'm∘n': id('Q'),
  })

  const category: FiniteCategory<Obj, Arrow> = {
    objects,
    arrows,
    id: (object) => id(object),
    compose,
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq: (left, right) => left.name === right.name,
  }

  const left: PullbackData<Obj, Arrow> = { apex: 'P', toDomain: pA, toAnchor: pB }
  const right: PullbackData<Obj, Arrow> = { apex: 'Q', toDomain: qA, toAnchor: qB }

  return { category, f, h, left, right, m, n }
}

const makeMismatchedFixture = () => {
  const { category, h, left, right } = makeComparisonFixture()
  const mismatchedF = category.id('A')
  return { category, f: mismatchedF, h, left, right }
}

const makeNonUniqueMediatorFixture = () => {
  const objects: ReadonlyArray<Obj> = ['A', 'B', 'C', 'P', 'Q']

  const f: Arrow = { name: 'f', src: 'A', dst: 'C' }
  const h: Arrow = { name: 'h', src: 'B', dst: 'C' }
  const pA: Arrow = { name: 'pA', src: 'P', dst: 'A' }
  const pB: Arrow = { name: 'pB', src: 'P', dst: 'B' }
  const qA: Arrow = { name: 'qA', src: 'Q', dst: 'A' }
  const qB: Arrow = { name: 'qB', src: 'Q', dst: 'B' }
  const cP: Arrow = { name: 'cP', src: 'P', dst: 'C' }
  const cQ: Arrow = { name: 'cQ', src: 'Q', dst: 'C' }
  const m1: Arrow = { name: 'm1', src: 'P', dst: 'Q' }
  const m2: Arrow = { name: 'm2', src: 'P', dst: 'Q' }
  const n: Arrow = { name: 'n', src: 'Q', dst: 'P' }

  const arrows: ReadonlyArray<Arrow> = [
    id('A'),
    id('B'),
    id('C'),
    id('P'),
    id('Q'),
    f,
    h,
    pA,
    pB,
    qA,
    qB,
    cP,
    cQ,
    m1,
    m2,
    n,
  ]

  const compose = makeCompose({
    'f∘pA': cP,
    'h∘pB': cP,
    'f∘qA': cQ,
    'h∘qB': cQ,
    'qA∘m1': pA,
    'qB∘m1': pB,
    'qA∘m2': pA,
    'qB∘m2': pB,
    'pA∘n': qA,
    'pB∘n': qB,
  })

  const category: FiniteCategory<Obj, Arrow> = {
    objects,
    arrows,
    id: (object) => id(object),
    compose,
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
    eq: (left, right) => left.name === right.name,
  }

  const left: PullbackData<Obj, Arrow> = { apex: 'P', toDomain: pA, toAnchor: pB }
  const right: PullbackData<Obj, Arrow> = { apex: 'Q', toDomain: qA, toAnchor: qB }

  return { category, f, h, left, right }
}

describe('Pullback comparison', () => {
  it('builds comparison isomorphisms between pullback witnesses', () => {
    const { category, f, h, left, right, m, n } = makeComparisonFixture()
    const calculator = makeFinitePullbackCalculator(category)

    const comparison = calculator.comparison(f, h, left, right)

    expect(category.eq(comparison.leftToRight, m)).toBe(true)
    expect(category.eq(comparison.rightToLeft, n)).toBe(true)

    const leftCycle = category.compose(comparison.rightToLeft, comparison.leftToRight)
    expect(category.eq(leftCycle, category.id('P'))).toBe(true)
    const rightCycle = category.compose(comparison.leftToRight, comparison.rightToLeft)
    expect(category.eq(rightCycle, category.id('Q'))).toBe(true)
  })

  it('rejects witnesses for mismatched spans', () => {
    const { category, f, h, left, right } = makeMismatchedFixture()
    const calculator = makeFinitePullbackCalculator(category)

    expect(() => calculator.comparison(f, h, left, right)).toThrow(
      /Pullback comparison: .* does not share a codomain|Pullback comparison: left cone domain leg targets the wrong object/
    )
  })

  it('fails when mediators are not uniquely determined', () => {
    const { category, f, h, left, right } = makeNonUniqueMediatorFixture()
    const calculator = makeFinitePullbackCalculator(category)

    expect(() => calculator.comparison(f, h, left, right)).toThrow(
      /Multiple mediating arrows satisfy the pullback conditions\./
    )
  })
})

