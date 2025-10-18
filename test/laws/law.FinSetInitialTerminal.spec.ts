import { describe, expect, it } from 'vitest'

import { FinSet, makeFinSetObj } from '../../allTS'
import type { FinSetMor } from '../../allTS'

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  const equal =
    FinSet.equalMor?.(left, right) ??
    (left.from === right.from &&
      left.to === right.to &&
      left.map.length === right.map.length &&
      left.map.every((value, idx) => value === right.map[idx]))
  expect(equal).toBe(true)
}

describe('FinSet initial and terminal arrows', () => {
  it('exposes the unique arrow from the initial object into any target', () => {
    const target = makeFinSetObj(['a0', 'a1', 'a2'])
    const canonical = FinSet.initialArrow(target)
    const manual: FinSetMor = { from: FinSet.initialObj, to: target, map: [] }

    expectEqualArrows(canonical, manual)
    expectEqualArrows(FinSet.initialArrow(FinSet.initialObj), FinSet.id(FinSet.initialObj))
  })

  it('exposes the unique arrow from any source into the terminal object', () => {
    const source = makeFinSetObj(['x0', 'x1'])
    const canonical = FinSet.terminate(source)
    const manual: FinSetMor = { from: source, to: FinSet.terminalObj, map: [0, 0] }

    expectEqualArrows(canonical, manual)
    expectEqualArrows(FinSet.terminate(FinSet.terminalObj), FinSet.id(FinSet.terminalObj))
  })

  it('composes the canonical legs to recover the unique map 0 → 1', () => {
    const middle = makeFinSetObj(['m0'])
    const viaMiddle = FinSet.compose(FinSet.terminate(middle), FinSet.initialArrow(middle))

    expectEqualArrows(viaMiddle, FinSet.initialArrow(FinSet.terminalObj))
    expectEqualArrows(viaMiddle, FinSet.terminate(FinSet.initialObj))
  })
})

