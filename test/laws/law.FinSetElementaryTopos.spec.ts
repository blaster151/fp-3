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
    expect(witness.naturalNumbersObject).toBe(FinSetNaturalNumbersObject)
    const addition = witness.naturalNumbersObject?.addition({ label: 'elementary topos addition' })
    expect(addition?.holds).toBe(true)
    const integers = witness.naturalNumbersObject?.integerCompletion({
      label: 'elementary topos integers',
    })
    expect(integers?.holds).toBe(true)
  })

  it('documents the packaging via metadata', () => {
    expect(witness.metadata?.label).toContain('FinSet')
    expect(witness.metadata?.notes?.length).toBeGreaterThan(0)
  })
})
