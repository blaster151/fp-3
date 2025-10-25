import { describe, expect, it } from 'vitest'

import {
  FinSet,
  FinSetCCC,
  FinSetElementaryToposWitness,
  FinSetNaturalNumbersObject,
  FinSetSubobjectClassifier,
} from '../../allTS'

describe('FinSetElementaryToposWitness', () => {
  const witness = FinSetElementaryToposWitness

  const naturalNumbersObject = (() => {
    const candidate = witness.naturalNumbersObject
    if (!candidate) {
      throw new Error(
        'FinSet elementary topos witness must expose a natural numbers object.',
      )
    }
    return candidate
  })()

  const requireNaturalNumbersWitness = <K extends keyof typeof naturalNumbersObject>(
    key: K,
  ): NonNullable<(typeof naturalNumbersObject)[K]> => {
    const value = naturalNumbersObject[key]
    if (value === undefined) {
      throw new Error(
        `FinSet elementary topos natural numbers object must expose ${String(
          key,
        )}.`,
      )
    }
    return value as NonNullable<(typeof naturalNumbersObject)[K]>
  }

  const additionWitness = requireNaturalNumbersWitness('addition')
  const integerCompletionWitness = requireNaturalNumbersWitness('integerCompletion')

  it('packages the FinSet category as both base and finite-limits provider', () => {
    expect(witness.category).toBe(FinSet)
    expect(witness.finiteLimits.product).toBe(FinSet.product)
    expect(witness.finiteLimits.equalizer).toBe(FinSet.equalizer)
    expect(witness.finiteLimits.terminalObj).toBe(FinSet.terminalObj)
  })

  it('exposes the canonical exponentials and subobject classifier', () => {
    expect(witness.exponentials).toBe(FinSetCCC)
    expect(witness.subobjectClassifier).toBe(FinSetSubobjectClassifier)
  })

  it('threads through the natural numbers object with its addition and integer completion witnesses', () => {
    expect(naturalNumbersObject).toBe(FinSetNaturalNumbersObject)
    const addition = additionWitness({ label: 'elementary topos addition' })
    expect(addition?.holds).toBe(true)
    const integers = integerCompletionWitness({
      label: 'elementary topos integers',
    })
    expect(integers?.holds).toBe(true)
  })

  it('documents the packaging via metadata', () => {
    expect(witness.metadata?.label).toContain('FinSet')
    expect(witness.metadata?.notes?.length).toBeGreaterThan(0)
  })
})
