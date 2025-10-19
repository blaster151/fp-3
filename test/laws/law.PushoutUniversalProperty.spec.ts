import { describe, expect, it } from 'vitest'
import type { FiniteCategory } from '../../finite-cat'
import {
  makeFinitePushoutCalculator,
  type PushoutCalc,
  type PushoutCoconeFactorResult,
  type PushoutData,
} from '../../pushout'
import {
  PushoutCategory,
  getArrow,
  type PushoutArrow,
  type PushoutObj,
} from '../pushout-fixture'

const makeCalculator = (): PushoutCalc<PushoutObj, PushoutArrow> =>
  makeFinitePushoutCalculator(PushoutCategory)

const makeQgCocone = (): PushoutData<PushoutObj, PushoutArrow> => ({
  apex: 'Qg',
  fromDomain: getArrow('qBgJ'),
  fromAnchor: getArrow('qZg'),
  Q: 'Qg',
  iA: getArrow('qBgJ'),
  iZ: getArrow('qZg'),
})

describe('finite pushout calculator universal property', () => {
  it('certifies canonical pushouts and exposes mediating arrows', () => {
    const pushouts = makeCalculator()
    const f = getArrow('f')
    const h = getArrow('h')
    const data = pushouts.pushout(f, h)

    const certification = pushouts.certify(f, h, data)
    expect(certification.valid).toBe(true)
    expect(certification.coconesChecked.length).toBeGreaterThan(0)

    const alternative = makeQgCocone()
    const factor: PushoutCoconeFactorResult<PushoutArrow> =
      pushouts.factorCocone(data, alternative)
    expect(factor.factored).toBe(true)
    expect(factor.mediator?.name).toBe('u')
  })

  it('rejects commuting but non-universal cocones', () => {
    const pushouts = makeCalculator()
    const f = getArrow('f')
    const h = getArrow('h')
    const alternative = makeQgCocone()

    const certification = pushouts.certify(f, h, alternative)
    expect(certification.valid).toBe(false)
    expect(certification.reason).toMatch(/mediator|universal/i)
  })

  it('fails to find pushouts when mediators are missing', () => {
    const withoutU: FiniteCategory<PushoutObj, PushoutArrow> = {
      ...PushoutCategory,
      arrows: PushoutCategory.arrows.filter((arrow) => arrow.name !== 'u') as ReadonlyArray<PushoutArrow>,
    }

    const pushouts = makeFinitePushoutCalculator(withoutU)
    const f = getArrow('f')
    const h = getArrow('h')

    expect(() => pushouts.pushout(f, h)).toThrow(/universal property|mediating arrow/)
  })

  describe('coinduce mediator search', () => {
    it('returns the unique mediator when the triangles commute', () => {
      const pushouts = makeCalculator()
      const f = getArrow('f')
      const g = getArrow('g')
      const h = getArrow('h')
      const src = pushouts.pushout(f, h)
      const dst = pushouts.pushout(g, h)

      const mediator = pushouts.coinduce(getArrow('j'), dst, src)
      expect(mediator.name).toBe('u')
    })

    it('throws when no mediator satisfies the pushout equations', () => {
      const pushouts = makeCalculator()
      const f = getArrow('f')
      const g = getArrow('g')
      const h = getArrow('h')
      const src = pushouts.pushout(f, h)
      const dst = pushouts.pushout(g, h)

      expect(() => pushouts.coinduce(getArrow('id_B'), dst, src)).toThrow(/no mediating arrow/i)
    })

    it('throws when multiple mediators satisfy the pushout equations', () => {
      const duplicated: FiniteCategory<PushoutObj, PushoutArrow> = {
        ...PushoutCategory,
        arrows: [...PushoutCategory.arrows, getArrow('u')] as ReadonlyArray<PushoutArrow>,
      }

      const pushouts = makeFinitePushoutCalculator(duplicated)
      const f = getArrow('f')
      const g = getArrow('g')
      const h = getArrow('h')
      const src = pushouts.pushout(f, h)
      const dst = pushouts.pushout(g, h)

      expect(() => pushouts.coinduce(getArrow('j'), dst, src)).toThrow(/multiple mediating arrows/i)
    })
  })
})
