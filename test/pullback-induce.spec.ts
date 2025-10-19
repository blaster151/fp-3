import { describe, expect, it } from 'vitest'

import { makeFinitePullbackCalculator, type PullbackData } from '../pullback'
import type { FiniteCategory } from '../finite-cat'

type Obj = 'D1' | 'D2' | 'S' | 'T' | 'P1' | 'P2'

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

type FixtureMode = 'unique' | 'none' | 'duplicate'

interface InduceFixture {
  readonly category: FiniteCategory<Obj, Arrow>
  readonly f: Arrow
  readonly g: Arrow
  readonly h: Arrow
  readonly j: Arrow
  readonly pullbackOfF: PullbackData<Obj, Arrow>
  readonly pullbackOfG: PullbackData<Obj, Arrow>
  readonly mediator?: Arrow
}

const makeInduceFixture = (mode: FixtureMode): InduceFixture => {
  const objects: ReadonlyArray<Obj> = ['D1', 'D2', 'S', 'T', 'P1', 'P2']

  const f: Arrow = { name: 'f', src: 'D1', dst: 'T' }
  const g: Arrow = { name: 'g', src: 'D2', dst: 'T' }
  const h: Arrow = { name: 'h', src: 'S', dst: 'T' }
  const j: Arrow = { name: 'j', src: 'D1', dst: 'D2' }

  const p1Dom: Arrow = { name: 'p1Dom', src: 'P1', dst: 'D1' }
  const p1Anc: Arrow = { name: 'p1Anc', src: 'P1', dst: 'S' }
  const p1ToT: Arrow = { name: 'p1ToT', src: 'P1', dst: 'T' }
  const jAfterP1: Arrow = { name: 'jAfterP1', src: 'P1', dst: 'D2' }

  const p2Dom: Arrow = { name: 'p2Dom', src: 'P2', dst: 'D2' }
  const p2Anc: Arrow = { name: 'p2Anc', src: 'P2', dst: 'S' }
  const p2ToT: Arrow = { name: 'p2ToT', src: 'P2', dst: 'T' }

  const mediator =
    mode === 'none'
      ? undefined
      : { name: mode === 'duplicate' ? 'u1' : 'u', src: 'P1', dst: 'P2' } as const
  const extraMediator =
    mode === 'duplicate'
      ? ({ name: 'u2', src: 'P1', dst: 'P2' } as const)
      : undefined

  const arrows: ReadonlyArray<Arrow> = [
    ...objects.map((object) => id(object)),
    f,
    g,
    h,
    j,
    p1Dom,
    p1Anc,
    p1ToT,
    jAfterP1,
    p2Dom,
    p2Anc,
    p2ToT,
    ...(mediator ? [mediator] : []),
    ...(extraMediator ? [extraMediator] : []),
  ]

  const compose = makeCompose({
    'f∘p1Dom': p1ToT,
    'h∘p1Anc': p1ToT,
    'g∘p2Dom': p2ToT,
    'h∘p2Anc': p2ToT,
    'j∘p1Dom': jAfterP1,
    'g∘j': f,
    'g∘jAfterP1': p1ToT,
    ...(mediator
      ? {
          [`p2Dom∘${mediator.name}`]: jAfterP1,
          [`p2Anc∘${mediator.name}`]: p1Anc,
        }
      : {}),
    ...(extraMediator
      ? {
          [`p2Dom∘${extraMediator.name}`]: jAfterP1,
          [`p2Anc∘${extraMediator.name}`]: p1Anc,
        }
      : {}),
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
    apex: 'P1',
    toDomain: p1Dom,
    toAnchor: p1Anc,
  }

  const pullbackOfG: PullbackData<Obj, Arrow> = {
    apex: 'P2',
    toDomain: p2Dom,
    toAnchor: p2Anc,
  }

  const fixture = { category, f, g, h, j, pullbackOfF, pullbackOfG }
  return mediator ? { ...fixture, mediator } : fixture
}

describe('PullbackCalculator.induce', () => {
  it('returns the unique mediator when it exists', () => {
    const fixture = makeInduceFixture('unique')
    const calculator = makeFinitePullbackCalculator(fixture.category)

    const pullbackF = calculator.pullback(fixture.f, fixture.h)
    expect(fixture.category.eq(pullbackF.toDomain, fixture.pullbackOfF.toDomain)).toBe(true)
    expect(fixture.category.eq(pullbackF.toAnchor, fixture.pullbackOfF.toAnchor)).toBe(true)

    const pullbackG = calculator.pullback(fixture.g, fixture.h)
    expect(fixture.category.eq(pullbackG.toDomain, fixture.pullbackOfG.toDomain)).toBe(true)
    expect(fixture.category.eq(pullbackG.toAnchor, fixture.pullbackOfG.toAnchor)).toBe(true)

    const mediator = calculator.induce(fixture.j, fixture.pullbackOfF, fixture.pullbackOfG)
    expect(mediator).toBeDefined()
    expect(fixture.category.eq(mediator, fixture.mediator!)).toBe(true)
  })

  it('throws when no mediating arrow satisfies the pullback equations', () => {
    const fixture = makeInduceFixture('none')
    const calculator = makeFinitePullbackCalculator(fixture.category)

    expect(() => calculator.induce(fixture.j, fixture.pullbackOfF, fixture.pullbackOfG)).toThrow(
      /no mediating arrow/i,
    )
  })

  it('throws when multiple mediators satisfy the pullback equations', () => {
    const fixture = makeInduceFixture('duplicate')
    const calculator = makeFinitePullbackCalculator(fixture.category)

    expect(() => calculator.induce(fixture.j, fixture.pullbackOfF, fixture.pullbackOfG)).toThrow(
      /multiple mediating arrows/i,
    )
  })
})
