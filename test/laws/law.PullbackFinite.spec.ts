import { describe, expect, it } from 'vitest'

import { makeFinitePullbackCalculator } from '../../pullback'
import type { PullbackData } from '../../pullback'
import type { FiniteCategory } from '../../finite-cat'

type Obj = 'A' | 'B' | 'C' | 'P' | 'X' | 'R'

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

const makeGoodPullbackFixture = () => {
  type GoodObj = Exclude<Obj, 'R'>
  const objects: ReadonlyArray<GoodObj> = ['A', 'B', 'C', 'P', 'X']

  const f: Arrow = { name: 'f', src: 'A', dst: 'C' }
  const h: Arrow = { name: 'h', src: 'B', dst: 'C' }
  const pA: Arrow = { name: 'pA', src: 'P', dst: 'A' }
  const pB: Arrow = { name: 'pB', src: 'P', dst: 'B' }
  const cP: Arrow = { name: 'cP', src: 'P', dst: 'C' }
  const xA: Arrow = { name: 'xA', src: 'X', dst: 'A' }
  const xB: Arrow = { name: 'xB', src: 'X', dst: 'B' }
  const xC: Arrow = { name: 'xC', src: 'X', dst: 'C' }
  const u: Arrow = { name: 'u', src: 'X', dst: 'P' }

  const arrows: ReadonlyArray<Arrow> = [
    id('A'),
    id('B'),
    id('C'),
    id('P'),
    id('X'),
    f,
    h,
    pA,
    pB,
    cP,
    xA,
    xB,
    xC,
    u,
  ]

  const compose = makeCompose({
    'f∘pA': cP,
    'h∘pB': cP,
    'pA∘u': xA,
    'pB∘u': xB,
    'f∘xA': xC,
    'h∘xB': xC,
  })

  const category: FiniteCategory<GoodObj, Arrow> = {
    objects,
    arrows,
    id: (object) => id(object),
    compose,
    src: (arrow) => arrow.src as GoodObj,
    dst: (arrow) => arrow.dst as GoodObj,
    eq: (left, right) => left.name === right.name,
  }

  return {
    category,
    f,
    h,
    pA,
    pB,
    xA,
    xB,
    u,
  }
}

const makeNonTerminalFixture = () => {
  const objects: ReadonlyArray<Obj> = ['A', 'B', 'C', 'P', 'X', 'R']

  const f: Arrow = { name: 'f', src: 'A', dst: 'C' }
  const h: Arrow = { name: 'h', src: 'B', dst: 'C' }
  const pA: Arrow = { name: 'pA', src: 'P', dst: 'A' }
  const pB: Arrow = { name: 'pB', src: 'P', dst: 'B' }
  const cP: Arrow = { name: 'cP', src: 'P', dst: 'C' }
  const xA: Arrow = { name: 'xA', src: 'X', dst: 'A' }
  const xB: Arrow = { name: 'xB', src: 'X', dst: 'B' }
  const xC: Arrow = { name: 'xC', src: 'X', dst: 'C' }
  const rA: Arrow = { name: 'rA', src: 'R', dst: 'A' }
  const rB: Arrow = { name: 'rB', src: 'R', dst: 'B' }
  const rC: Arrow = { name: 'rC', src: 'R', dst: 'C' }

  const arrows: ReadonlyArray<Arrow> = [
    id('A'),
    id('B'),
    id('C'),
    id('P'),
    id('X'),
    id('R'),
    f,
    h,
    pA,
    pB,
    cP,
    xA,
    xB,
    xC,
    rA,
    rB,
    rC,
  ]

  const compose = makeCompose({
    'f∘pA': cP,
    'h∘pB': cP,
    'f∘xA': xC,
    'h∘xB': xC,
    'f∘rA': rC,
    'h∘rB': rC,
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

  return {
    category,
    f,
    h,
  }
}

const makeNonUniqueMediatorFixture = () => {
  const objects: ReadonlyArray<Obj> = ['A', 'B', 'X', 'P']

  const pA: Arrow = { name: 'pA', src: 'P', dst: 'A' }
  const pB: Arrow = { name: 'pB', src: 'P', dst: 'B' }
  const xA: Arrow = { name: 'xA', src: 'X', dst: 'A' }
  const xB: Arrow = { name: 'xB', src: 'X', dst: 'B' }
  const u1: Arrow = { name: 'u1', src: 'X', dst: 'P' }
  const u2: Arrow = { name: 'u2', src: 'X', dst: 'P' }

  const arrows: ReadonlyArray<Arrow> = [
    id('A'),
    id('B'),
    id('X'),
    id('P'),
    pA,
    pB,
    xA,
    xB,
    u1,
    u2,
  ]

  const compose = makeCompose({
    'pA∘u1': xA,
    'pA∘u2': xA,
    'pB∘u1': xB,
    'pB∘u2': xB,
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

  const pullbackOfF: PullbackData<Obj, Arrow> = {
    apex: 'X',
    toDomain: xA,
    toAnchor: xB,
  }
  const pullbackOfG: PullbackData<Obj, Arrow> = {
    apex: 'P',
    toDomain: pA,
    toAnchor: pB,
  }

  return {
    category,
    pullbackOfF,
    pullbackOfG,
  }
}

describe('Finite pullback calculator', () => {
  it('returns a terminal cone for a genuine pullback', () => {
    const { category, f, h, pA, pB, xA, xB, u } = makeGoodPullbackFixture()
    const calculator = makeFinitePullbackCalculator(category)

    const result = calculator.pullback(f, h)

    expect(result.apex).toBe('P')
    expect(category.eq(result.toDomain, pA)).toBe(true)
    expect(category.eq(result.toAnchor, pB)).toBe(true)

      const mediator = category.arrows.filter(
        (arrow) => arrow.src === 'X' && arrow.dst === 'P'
      )
      expect(mediator).toHaveLength(1)
      const mediatorArrow = mediator[0]!
      expect(category.eq(mediatorArrow, u)).toBe(true)

      const factoredDomain = category.compose(result.toDomain, mediatorArrow)
      const factoredAnchor = category.compose(result.toAnchor, mediatorArrow)
    expect(category.eq(factoredDomain, xA)).toBe(true)
    expect(category.eq(factoredAnchor, xB)).toBe(true)
  })

  it('rejects commuting squares that fail the terminal-cone property', () => {
    const { category, f, h } = makeNonTerminalFixture()
    const calculator = makeFinitePullbackCalculator(category)

    expect(() => calculator.pullback(f, h)).toThrow(
      /No pullback found for the supplied arrows\./
    )
  })

  it('produces the unique mediator factoring a cone through the terminal pullback', () => {
    const { category, f, h, xA, xB, pA, pB, u } = makeGoodPullbackFixture()
    const calculator = makeFinitePullbackCalculator(category)

    const terminalCone = calculator.pullback(f, h)
    expect(category.eq(terminalCone.toDomain, pA)).toBe(true)
    expect(category.eq(terminalCone.toAnchor, pB)).toBe(true)

    const cone: PullbackData<Exclude<Obj, 'R'>, Arrow> = {
      apex: 'X',
      toDomain: xA,
      toAnchor: xB,
    }

    const mediator = calculator.induce(category.id('A'), cone, terminalCone)
    expect(category.eq(mediator, u)).toBe(true)
  })

  it('certifies a supplied pullback witness and records the enumerated cones', () => {
    const { category, f, h, pA, pB } = makeGoodPullbackFixture()
    const calculator = makeFinitePullbackCalculator(category)
    const terminalCone = calculator.pullback(f, h)

    const certification = calculator.certify(f, h, terminalCone)
    expect(certification.valid).toBe(true)
    expect(certification.conesChecked.length).toBeGreaterThan(0)
    const reproducedDomain = certification.conesChecked.some((cone) =>
      category.eq(cone.toDomain, pA) && category.eq(cone.toAnchor, pB)
    )
    expect(reproducedDomain).toBe(true)
  })

  it('rejects malformed pullback candidates via certification', () => {
    const { category, f, h, pA, pB } = makeGoodPullbackFixture()
    const calculator = makeFinitePullbackCalculator(category)
    const terminalCone = calculator.pullback(f, h)

    const skewed = { ...terminalCone, toAnchor: pA }
    const certification = calculator.certify(f, h, skewed)
    expect(certification.valid).toBe(false)
    expect((certification.reason ?? '').toLowerCase()).toMatch(/anchor leg must land in the domain source of h/)
  })

  it('rejects cones that admit more than one mediating arrow', () => {
    const { category, pullbackOfF, pullbackOfG } = makeNonUniqueMediatorFixture()
    const calculator = makeFinitePullbackCalculator(category)

    expect(() =>
      calculator.induce(category.id('A'), pullbackOfF, pullbackOfG)
    ).toThrow(/Multiple mediating arrows satisfy the pullback conditions\./)
  })
})

