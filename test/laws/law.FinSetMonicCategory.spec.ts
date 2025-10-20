import { describe, expect, it } from 'vitest'

import {
  FinSet,
  FinSetMonicCategory,
  FinSetTruthTerminal,
  finsetCharacteristic,
  makeFinSetObj,
  type FinSetMor,
  type FinSetObj,
} from '../../allTS'

const sameObject = (left: FinSetObj, right: FinSetObj): boolean =>
  left === right || (
    left.elements.length === right.elements.length &&
    left.elements.every((value, index) => value === right.elements[index])
  )

const eqArrows = (left: FinSetMor, right: FinSetMor): boolean => {
  const verdict = FinSet.equalMor?.(left, right)
  if (typeof verdict === 'boolean') {
    return verdict
  }

  return (
    sameObject(left.from, right.from) &&
    sameObject(left.to, right.to) &&
    left.map.length === right.map.length &&
    left.map.every((value, index) => value === right.map[index])
  )
}

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  expect(eqArrows(left, right)).toBe(true)
}

describe('Monic(FinSet)', () => {
  it('creates objects from injective maps and rejects non-monics', () => {
    const ambient = makeFinSetObj(['a0', 'a1', 'a2'])
    const subobject = makeFinSetObj(['s0', 's1'])

    const inclusion: FinSetMor = { from: subobject, to: ambient, map: [0, 2] }
    const object = FinSetMonicCategory.makeObject(inclusion)

    expect(object.domain).toBe(subobject)
    expect(object.codomain).toBe(ambient)
    expect(object.monic).toBe(inclusion)

    const nonMonic: FinSetMor = { from: subobject, to: ambient, map: [0, 0] }
    expect(() => FinSetMonicCategory.makeObject(nonMonic)).toThrow(
      /monomorphism/i,
    )
  })

  it('derives the universal morphism into the truth terminal', () => {
    const ambient = makeFinSetObj(['x0', 'x1', 'x2'])
    const subobject = makeFinSetObj(['p0', 'p1'])
    const inclusion: FinSetMor = { from: subobject, to: ambient, map: [0, 2] }
    const object = FinSetMonicCategory.makeObject(inclusion)

    const { morphism, characteristic, terminalLeg } =
      FinSetTruthTerminal.mediator(object)

    expect(FinSetMonicCategory.dom(morphism)).toBe(object)
    expect(FinSetMonicCategory.cod(morphism)).toBe(FinSetTruthTerminal.terminal)

    const expectedCharacteristic = finsetCharacteristic(inclusion)
    const expectedTerminalLeg = FinSet.terminate(subobject)

    expectEqualArrows(characteristic, expectedCharacteristic)
    expectEqualArrows(terminalLeg, expectedTerminalLeg)
    expectEqualArrows(morphism.codomainArrow, expectedCharacteristic)
    expectEqualArrows(morphism.mediator, expectedTerminalLeg)
  })

  it('rejects non-terminal mediators into the truth object', () => {
    const ambient = makeFinSetObj(['y0', 'y1'])
    const subobject = makeFinSetObj(['q0'])
    const inclusion: FinSetMor = { from: subobject, to: ambient, map: [1] }
    const object = FinSetMonicCategory.makeObject(inclusion)

    const bogusMediator: FinSetMor = {
      from: subobject,
      to: subobject,
      map: [0],
    }

    const characteristic = finsetCharacteristic(inclusion)

    expect(() =>
      FinSetMonicCategory.makeMorphism({
        from: object,
        to: FinSetTruthTerminal.terminal,
        codomainArrow: characteristic,
        mediator: bogusMediator,
      }),
    ).toThrow(/mediator must land/i)
  })

  it('rejects characteristics that are not pullback squares', () => {
    const ambient = makeFinSetObj(['z0', 'z1', 'z2'])
    const subobject = makeFinSetObj(['r0'])
    const inclusion: FinSetMor = { from: subobject, to: ambient, map: [2] }
    const object = FinSetMonicCategory.makeObject(inclusion)

    const bogusCharacteristic: FinSetMor = {
      from: ambient,
      to: FinSetTruthTerminal.terminal.codomain,
      map: ambient.elements.map(() => 0),
    }

    expect(() =>
      FinSetMonicCategory.makeMorphism({
        from: object,
        to: FinSetTruthTerminal.terminal,
        codomainArrow: bogusCharacteristic,
        mediator: FinSet.terminate(subobject),
      }),
    ).toThrow(/square must commute|failed pullback/i)
  })
})
