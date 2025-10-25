import { describe, expect, it } from 'vitest'

import {
  CategoryLimits,
  FinSet,
  FinSetElementaryToposWitness,
  type FinSetMor,
  type FinSetObj,
} from '../../allTS'

const {
  naturalNumbersObject: FinSetNaturalNumbersObjectCandidate,
  subobjectClassifier: FinSetSubobjectClassifier,
} = FinSetElementaryToposWitness

if (!FinSetNaturalNumbersObjectCandidate) {
  throw new Error('FinSet elementary topos witness must expose a natural numbers object for law tests.')
}

const FinSetNaturalNumbersObject = FinSetNaturalNumbersObjectCandidate

const requireWitness = <K extends keyof typeof FinSetNaturalNumbersObject>(
  key: K,
): NonNullable<(typeof FinSetNaturalNumbersObject)[K]> => {
  const value = FinSetNaturalNumbersObject[key]
  if (value === undefined) {
    throw new Error(
      `FinSet natural numbers object witness must expose ${String(
        key,
      )} for law tests.`,
    )
  }
  return value as NonNullable<(typeof FinSetNaturalNumbersObject)[K]>
}

const certifySuccessorZeroSeparation = requireWitness('certifySuccessorZeroSeparation')
const certifyInductiveSubobject = requireWitness('certifyInductiveSubobject')
const certifyInductiveSubobjectIsomorphism = requireWitness(
  'certifyInductiveSubobjectIsomorphism',
)
const certifyPointInjective = requireWitness('certifyPointInjective')
const certifyPointSurjective = requireWitness('certifyPointSurjective')
const certifyPointInfinite = requireWitness('certifyPointInfinite')
const certifyDedekindInfinite = requireWitness('certifyDedekindInfinite')
const enumeratePoints = requireWitness('enumeratePoints')
const initialAlgebra = requireWitness('initialAlgebra')
const additionWitness = requireWitness('addition')
const primitiveRecursionFromExponential = requireWitness('primitiveRecursionFromExponential')
const primitiveRecursion = requireWitness('primitiveRecursion')
const checkCandidate = requireWitness('checkCandidate')

const eqFinSetMor = (left: FinSetMor, right: FinSetMor): boolean => {
  const verdict = FinSet.equalMor?.(left, right)
  if (typeof verdict === 'boolean') {
    return verdict
  }

  if (left.from !== right.from || left.to !== right.to) {
    return false
  }

  if (left.map.length !== right.map.length) {
    return false
  }

  return left.map.every((value, index) => value === right.map[index])
}

const expectEqualArrows = (left: FinSetMor, right: FinSetMor) => {
  expect(eqFinSetMor(left, right)).toBe(true)
}

const makeFinSetSubobject = (indices: ReadonlyArray<number>) => {
  const object: FinSetObj = {
    elements: indices.map((index) =>
      FinSetNaturalNumbersObject.carrier.elements[index]!,
    ),
  }

  const inclusion: FinSetMor = {
    from: object,
    to: FinSetNaturalNumbersObject.carrier,
    map: indices.map((index) => index),
  }

  return { object, inclusion }
}

const iterateSuccessor = (start: number, steps: number): number => {
  let current = start
  for (let index = 0; index < steps; index++) {
    const next = FinSetNaturalNumbersObject.successor.map[current]
    if (next === undefined) {
      throw new Error('iterateSuccessor: successor map incomplete for FinSet natural numbers.')
    }
    current = next
  }
  return current
}

const buildAdditionExponentialData = () => {
  const parameter = FinSetNaturalNumbersObject.carrier
  const target = FinSetNaturalNumbersObject.carrier
  const base = FinSet.id(parameter)
  const exponential = FinSet.exponential(parameter, target)

  const tupleIndex = new Map<string, number>()
  ;(exponential.obj.elements as ReadonlyArray<ReadonlyArray<number>>).forEach((encoding, idx) => {
    tupleIndex.set(JSON.stringify(encoding), idx)
  })

  const constantIndex = (value: number): number => {
    const constantKey = JSON.stringify(parameter.elements.map(() => value))
    const index = tupleIndex.get(constantKey)

    if (index === undefined) {
      throw new Error(
        'addition exponential data: constant function not present in the exponential carrier.',
      )
    }

    return index
  }

  const step: FinSetMor = {
    from: target,
    to: exponential.obj,
    map: target.elements.map((_value, idx) => {
      const successor = FinSetNaturalNumbersObject.successor.map[idx]
      if (successor === undefined) {
        throw new Error(
          'addition exponential data: successor map incomplete for FinSet natural numbers.',
        )
      }
      return constantIndex(successor)
    }),
  }

  return { parameter, target, base, step }
}

describe('FinSetNaturalNumbersObject', () => {
  it('recovers the identity on ℕ via the universal property', () => {
    const sequence = CategoryLimits.naturalNumbersObjectSequenceFromWitness(
      FinSetNaturalNumbersObject,
    )

    const witness = FinSetNaturalNumbersObject.induce(sequence)

    const expectedIdentity: FinSetMor = {
      from: FinSetNaturalNumbersObject.carrier,
      to: FinSetNaturalNumbersObject.carrier,
      map: FinSetNaturalNumbersObject.carrier.elements.map((_, index) => index),
    }

    expectEqualArrows(witness.mediator, expectedIdentity)

    expectEqualArrows(witness.compatibility.zeroComposite, sequence.zero)
    expectEqualArrows(witness.compatibility.successorLeft, witness.compatibility.successorRight)
  })

  it('iterates constant recursion data to the zero function', () => {
    const target = FinSetNaturalNumbersObject.carrier
    const zero: FinSetMor = { from: FinSet.terminalObj, to: target, map: [0] }
    const successor: FinSetMor = {
      from: target,
      to: target,
      map: target.elements.map(() => 0),
    }

    const witness = FinSetNaturalNumbersObject.induce({ target, zero, successor })

    expect(witness.mediator.map.every((value) => value === 0)).toBe(true)

    expectEqualArrows(witness.compatibility.zeroComposite, zero)
    expectEqualArrows(witness.compatibility.successorLeft, witness.compatibility.successorRight)
  })

  it('builds clamped primitive-recursive maps and certifies uniqueness', () => {
    const target = FinSetNaturalNumbersObject.carrier
    const lastIndex = target.elements.length - 1
    const baseIndex = 2
    const step = 3

    const zero: FinSetMor = { from: FinSet.terminalObj, to: target, map: [baseIndex] }
    const successor: FinSetMor = {
      from: target,
      to: target,
      map: target.elements.map((_, index) => Math.min(index + step, lastIndex)),
    }

    const sequence: CategoryLimits.NaturalNumbersObjectSequence<FinSetObj, FinSetMor> = {
      target,
      zero,
      successor,
    }

    const witness = FinSetNaturalNumbersObject.induce(sequence)

    const expected: number[] = []
    let current = baseIndex
    for (let index = 0; index < FinSetNaturalNumbersObject.carrier.elements.length; index++) {
      expected.push(current)
      current = successor.map[current]!
    }

    expect(witness.mediator.map).toEqual(expected)

    const uniqueness = checkCandidate(sequence, witness.mediator)
    expect(uniqueness.agrees).toBe(true)

    const flawed: FinSetMor = {
      from: FinSetNaturalNumbersObject.carrier,
      to: target,
      map: expected.map((value, index) => (index === 3 ? Math.max(0, value - 1) : value)),
    }

    const verdict = checkCandidate(sequence, flawed)
    expect(verdict.agrees).toBe(false)
    expect(verdict.reason).toMatch(/candidate/i)
    expectEqualArrows(verdict.compatibility.zeroComposite, zero)
    expect(verdict.compatibility.successorLeft.map).not.toEqual(verdict.compatibility.successorRight.map)
  })

  it('detects successor-zero inequality via the subobject classifier', () => {
    const successorZero = FinSet.compose(
      FinSetNaturalNumbersObject.successor,
      FinSetNaturalNumbersObject.zero,
    )

    const equalizer = FinSet.equalizer(successorZero, FinSetNaturalNumbersObject.zero)
    const characteristic = FinSetSubobjectClassifier.characteristic(equalizer.equalize)

    expectEqualArrows(characteristic, FinSetSubobjectClassifier.falseArrow)

    const verdict = certifySuccessorZeroSeparation()
    expect(verdict.separated).toBe(true)
    expectEqualArrows(verdict.characteristic, FinSetSubobjectClassifier.falseArrow)
    expectEqualArrows(verdict.equalizer.equalize, equalizer.equalize)
    expectEqualArrows(verdict.classification.inclusion, equalizer.equalize)
    expect(verdict.classificationAgrees).toBe(true)
    expect(verdict.equalsFalse).toBe(true)
    expect(verdict.equalsTruth).toBe(false)
    expect(verdict.details).toMatch(/not in the image/i)
  })

  it('builds algebra morphisms for canonical 1 + ℕ algebras', () => {
    const target = FinSetNaturalNumbersObject.carrier
    const { obj: coproduct } = FinSet.coproduct([FinSet.terminalObj, target])
    const entries = coproduct.elements as ReadonlyArray<{ tag: number; i: number }>

    const algebra: FinSetMor = {
      from: coproduct,
      to: target,
      map: entries.map((entry) =>
        entry.tag === 0
          ? 0
          : FinSetNaturalNumbersObject.successor.map[entry.i] ?? entry.i,
      ),
    }

    const witness = initialAlgebra({
      target,
      algebra,
      label: 'canonical initial algebra',
    })

    expect(witness.holds).toBe(true)
    expect(witness.details).toMatch(/initial algebra/i)
    expect(witness.morphism?.zeroTriangle.holds).toBe(true)
    expect(witness.morphism?.successorSquare.holds).toBe(true)
    expect(witness.morphism?.comparison.holds).toBe(true)
    expect(witness.mediator).toBeDefined()
    expectEqualArrows(witness.mediator!, FinSet.id(target))
  })

  it('records diagnostics when algebra morphism equality checks fail', () => {
    const target = FinSetNaturalNumbersObject.carrier
    const { obj: coproduct } = FinSet.coproduct([FinSet.terminalObj, target])
    const entries = coproduct.elements as ReadonlyArray<{ tag: number; i: number }>

    const algebra: FinSetMor = {
      from: coproduct,
      to: target,
      map: entries.map((entry) =>
        entry.tag === 0
          ? 0
          : FinSetNaturalNumbersObject.successor.map[entry.i] ?? entry.i,
      ),
    }

    const verdict = initialAlgebra({
      target,
      algebra,
      equalMor: () => false,
      label: 'initial algebra diagnostics',
    })

    expect(verdict.holds).toBe(false)
    expect(verdict.reason).toMatch(/zero/i)
    expect(verdict.details).toMatch(/initial algebra/i)
    expect(verdict.morphism?.zeroTriangle.holds).toBe(false)
    expect(verdict.morphism?.comparison.holds).toBe(false)
    expect(verdict.target?.algebra).toBe(algebra)
  })

  it('enumerates global points on the natural numbers carrier', () => {
    const points = enumeratePoints()
    expect(points.length).toBe(FinSetNaturalNumbersObject.carrier.elements.length)

    points.forEach((point, index) => {
      expect(point.from).toBe(FinSet.terminalObj)
      expect(point.to).toBe(FinSetNaturalNumbersObject.carrier)
      expect(point.map).toEqual([index])
    })
  })

  it('certifies that successor is injective but not point-surjective', () => {
    const injective = certifyPointInjective()
    expect(injective.holds).toBe(true)
    expect(injective.images.length).toBe(FinSetNaturalNumbersObject.carrier.elements.length)

    const [zeroPoint] = enumeratePoints()
    const surjective = certifyPointSurjective()
    expect(surjective.holds).toBe(false)
    expect(surjective.missing).toEqual(zeroPoint)
    expect(surjective.details).toMatch(/misses/i)
  })

  it('witnesses Dedekind infiniteness via the successor embedding', () => {
    const pointInfinite = certifyPointInfinite()
    expect(pointInfinite.holds).toBe(true)
    expect(pointInfinite.surjective.holds).toBe(false)
    expect(pointInfinite.injective.holds).toBe(true)

    const dedekind = certifyDedekindInfinite()
    expect(dedekind.holds).toBe(true)
    expect(dedekind.pointInfinite.holds).toBe(true)
    expect(dedekind.monomorphismCertified).toBe(true)
    expect(dedekind.details).toMatch(/Dedekind/i)
  })

  it('collapses inductive subobjects onto the canonical natural numbers object', () => {
    const inclusion = FinSet.id(FinSetNaturalNumbersObject.carrier)
    const verdict = certifyInductiveSubobject({
      inclusion,
      zeroLift: FinSetNaturalNumbersObject.zero,
      successorLift: FinSetNaturalNumbersObject.successor,
      label: 'identity inclusion',
    })

    expect(verdict.holds).toBe(true)
    expect(verdict.monomorphismCertified).toBe(true)
    expect(verdict.identityVerdict?.agrees).toBe(true)
    expectEqualArrows(verdict.retraction!, FinSet.id(FinSetNaturalNumbersObject.carrier))
    expectEqualArrows(verdict.rightComposite!, FinSet.id(FinSetNaturalNumbersObject.carrier))
    expectEqualArrows(verdict.section!, FinSet.id(FinSetNaturalNumbersObject.carrier))
    expect(verdict.details).toMatch(/isomorphism/i)

    const isoWitness = CategoryLimits.naturalNumbersInductionIsomorphism({
      result: verdict,
      label: 'identity inclusion',
    })

    expect(isoWitness.found).toBe(true)
    expectEqualArrows(isoWitness.forward!, inclusion)
    expectEqualArrows(isoWitness.backward!, verdict.retraction!)
    expectEqualArrows(isoWitness.leftComposite!, verdict.section!)
    expectEqualArrows(isoWitness.rightComposite!, verdict.rightComposite!)
    expect(isoWitness.metadata.monomorphismCertified).toBe(true)
    expectEqualArrows(
      isoWitness.metadata.compatibility.zeroComposite,
      verdict.compatibility.zeroComposite,
    )

    const convenience = certifyInductiveSubobjectIsomorphism({
      inclusion,
      zeroLift: FinSetNaturalNumbersObject.zero,
      successorLift: FinSetNaturalNumbersObject.successor,
      label: 'identity inclusion convenience',
    })

    expect(convenience.found).toBe(true)
    expectEqualArrows(convenience.forward!, inclusion)
    expectEqualArrows(convenience.backward!, verdict.retraction!)
    expect(convenience.details).toMatch(/isomorphism/i)
  })

  it('rejects subobjects that omit the zero point', () => {
    const indices = FinSetNaturalNumbersObject.carrier.elements
      .map((_, index) => index)
      .slice(1)
    const { object, inclusion } = makeFinSetSubobject(indices)
    const zeroLift: FinSetMor = { from: FinSet.terminalObj, to: object, map: [0] }
    const successorLift: FinSetMor = {
      from: object,
      to: object,
      map: object.elements.map((_, index, elements) =>
        index + 1 < elements.length ? index + 1 : index,
      ),
    }

    const verdict = certifyInductiveSubobject({
      inclusion,
      zeroLift,
      successorLift,
      label: 'zero-free subobject',
    })

    expect(verdict.holds).toBe(false)
    expect(verdict.compatibility.zeroComposite.map[0]).toBe(1)
    expect(verdict.details).toMatch(/zero/i)

    const isoWitness = CategoryLimits.naturalNumbersInductionIsomorphism({
      result: verdict,
      label: 'zero-free subobject',
    })

    expect(isoWitness.found).toBe(false)
    expect(isoWitness.reason).toMatch(/zero/i)
    expect(isoWitness.metadata.compatibility.zeroComposite.map[0]).toBe(1)

    const convenience = certifyInductiveSubobjectIsomorphism({
      inclusion,
      zeroLift,
      successorLift,
      label: 'zero-free subobject convenience',
    })

    expect(convenience.found).toBe(false)
    expect(convenience.reason).toMatch(/zero/i)
  })

  it('rejects subobjects that fail successor closure', () => {
    const { object, inclusion } = makeFinSetSubobject([0, 1])
    const zeroLift: FinSetMor = { from: FinSet.terminalObj, to: object, map: [0] }
    const successorLift: FinSetMor = {
      from: object,
      to: object,
      map: object.elements.map(() => Math.min(1, object.elements.length - 1)),
    }

    const verdict = certifyInductiveSubobject({
      inclusion,
      zeroLift,
      successorLift,
      label: 'non-closed subobject',
    })

    expect(verdict.holds).toBe(false)
    expect(verdict.details).toMatch(/successor/i)
    expect(verdict.reason).toMatch(/commute/i)
  })

  it('constructs addition via the helper', () => {
    const addition = additionWitness({ label: 'addition' })

    expect(addition.holds).toBe(true)
    expect(addition.details).toMatch(/addition arrow/i)
    expect(addition.primitive.details).toMatch(/primitive recursion/i)
    expectEqualArrows(addition.primitive.compatibility.baseComposite, addition.base)
    expectEqualArrows(
      addition.primitive.compatibility.stepLeft,
      addition.primitive.compatibility.stepRight,
    )

    const expected = addition.product.obj.elements.map((tuple) => {
      const coordinates = tuple as ReadonlyArray<number>
      const left = coordinates[0] ?? 0
      const right = coordinates[1] ?? 0
      return iterateSuccessor(right, left)
    })

    expect(addition.addition.map).toEqual(expected)
  })

  it('derives primitive recursion from exponential transposes', () => {
    const { parameter, target, base, step } = buildAdditionExponentialData()
    const product = FinSet.binaryProduct(target, parameter)

    const recursion = primitiveRecursionFromExponential({
      parameter,
      target,
      base,
      step,
      label: 'addition via exponential',
    })

    expect(recursion.holds).toBe(true)
    expect(recursion.primitive.holds).toBe(true)
    expect(recursion.details).toMatch(/exponential/i)
    expectEqualArrows(recursion.evaluation.composite, recursion.primitive.compatibility.stepRight)

    const expected = product.obj.elements.map((tuple) => {
      const coordinates = tuple as ReadonlyArray<number>
      const left = coordinates[0] ?? 0
      const right = coordinates[1] ?? 0
      return iterateSuccessor(right, left)
    })

    expect(recursion.mediator.map).toEqual(expected)
  })

  it('records diagnostics when exponential recursion equality checks fail', () => {
    const { parameter, target, base, step } = buildAdditionExponentialData()

    const verdict = primitiveRecursionFromExponential({
      parameter,
      target,
      base,
      step,
      equalMor: () => false,
      label: 'addition via exponential diagnostics',
    })

    expect(verdict.holds).toBe(false)
    expect(verdict.reason).toMatch(/base/i)
    expect(verdict.details).toMatch(/exponential/i)
    expectEqualArrows(
      verdict.evaluation.composite,
      verdict.primitive.compatibility.stepRight,
    )
  })

  it('constructs multiplication via nested primitive recursion', () => {
    const parameter = FinSetNaturalNumbersObject.carrier
    const target = FinSetNaturalNumbersObject.carrier
    const product = FinSet.binaryProduct(target, parameter)
    const addition = additionWitness({
      label: 'addition for multiplication',
    })

    const base: FinSetMor = {
      from: parameter,
      to: target,
      map: parameter.elements.map(() => 0),
    }

    const multiplication = primitiveRecursion({
      parameter,
      target,
      base,
      step: addition.addition,
      label: 'multiplication',
    })

    expect(multiplication.holds).toBe(true)
    expect(multiplication.details).toMatch(/primitive recursion/i)
    expectEqualArrows(multiplication.compatibility.baseComposite, base)
    expectEqualArrows(
      multiplication.compatibility.stepLeft,
      multiplication.compatibility.stepRight,
    )

    const expected = product.obj.elements.map((tuple) => {
      const coordinates = tuple as ReadonlyArray<number>
      const left = coordinates[0] ?? 0
      const right = coordinates[1] ?? 0
      let accumulator = 0
      for (let index = 0; index < left; index++) {
        accumulator = iterateSuccessor(accumulator, right)
      }
      return accumulator
    })

    expect(multiplication.mediator.map).toEqual(expected)
  })

  it('reports diagnostics when equality witnesses reject recursion compatibility', () => {
    const verdict = additionWitness({
      equalMor: () => false,
      label: 'addition diagnostics',
    })

    expect(verdict.holds).toBe(false)
    expect(verdict.reason).toMatch(/base/i)
    expect(verdict.primitive.details).toMatch(/do not hold/i)
    expectEqualArrows(
      verdict.primitive.compatibility.stepLeft,
      verdict.primitive.compatibility.stepRight,
    )
  })
})
