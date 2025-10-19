import { describe, expect, it } from 'vitest'

import {
  factorPullbackCone,
  makeFinitePullbackCalculator,
  type PullbackData,
} from '../../pullback'
import type { FiniteCategory } from '../../finite-cat'

type Obj = 'A' | 'B' | 'C' | 'P' | 'X' | 'R'

type Arrow = {
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

const makeGoodFixture = () => {
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

  const pullback: PullbackData<GoodObj, Arrow> = {
    apex: 'P',
    toDomain: pA,
    toAnchor: pB,
  }

  const cone: PullbackData<GoodObj, Arrow> = {
    apex: 'X',
    toDomain: xA,
    toAnchor: xB,
  }

  return { category, f, h, pullback, cone, mediator: u }
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

  return { category, f, h }
}

const makeMultipleMediatorFixture = () => {
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
    id('P'),
    id('X'),
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

  const target: PullbackData<Obj, Arrow> = {
    apex: 'P',
    toDomain: pA,
    toAnchor: pB,
  }

  const cone: PullbackData<Obj, Arrow> = {
    apex: 'X',
    toDomain: xA,
    toAnchor: xB,
  }

  return { category, target, cone }
}

describe('Pullback universal property factoring', () => {
  it('exposes the mediator for a true pullback cone', () => {
    const { category, f, h, pullback, cone, mediator } = makeGoodFixture()
    const calculator = makeFinitePullbackCalculator(category)

    const witness = calculator.pullback(f, h)
    expect(category.eq(witness.toDomain, pullback.toDomain)).toBe(true)
    expect(category.eq(witness.toAnchor, pullback.toAnchor)).toBe(true)

    const factored = factorPullbackCone(category, witness, cone)
    expect(factored.factored).toBe(true)
    expect(factored.mediator).toBeDefined()
    expect(category.eq(factored.mediator!, mediator)).toBe(true)
  })

  it('shares the factoring logic through the calculator surface', () => {
    const { category, f, h, pullback, cone, mediator } = makeGoodFixture()
    const calculator = makeFinitePullbackCalculator(category)

    const witness = calculator.pullback(f, h)
    const factored = calculator.factorCone(witness, cone)
    expect(factored.factored).toBe(true)
    expect(factored.mediator).toBeDefined()
    expect(category.eq(factored.mediator!, mediator)).toBe(true)
  })

  it('rejects commuting squares without a terminal apex', () => {
    const { category, f, h } = makeNonTerminalFixture()
    const calculator = makeFinitePullbackCalculator(category)

    expect(() => calculator.pullback(f, h)).toThrow(/No pullback found/)
  })

  it('signals failure when multiple mediators satisfy the cone equations', () => {
    const { category, target, cone } = makeMultipleMediatorFixture()

    const result = factorPullbackCone(category, target, cone)
    expect(result.factored).toBe(false)
    expect(result.reason).toMatch(/multiple mediating arrows/i)
  })
})
