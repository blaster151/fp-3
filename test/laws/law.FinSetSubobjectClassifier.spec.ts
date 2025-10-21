import { describe, expect, it } from 'vitest'

import {
  CategoryLimits,
  FinSetFalseArrow,
  FinSetNegation,
  FinSet,
  FinSetSubobjectClassifier,
  FinSetTruthArrow,
  FinSetTruthAnd,
  FinSetTruthProduct,
  FinSetTruthValues,
  finsetCharacteristicPullback,
  finsetCharacteristicFalsePullback,
  finsetCharacteristicComplement,
  finsetComplementSubobject,
  finsetSubobjectIntersection,
  finsetMonicEpicIso,
  finsetMonomorphismEqualizer,
  finsetSubobjectLeq,
  finsetSubobjectPartialOrder,
  makeFinSetObj,
  type FinSetMor,
  type FinSetObj,
  type PullbackData,
} from '../../allTS'

const sameObject = (left: FinSetObj, right: FinSetObj): boolean =>
  left === right || (
    left.elements.length === right.elements.length &&
    left.elements.every((value, index) => value === right.elements[index])
  )

const eqArrows = (left: FinSetMor, right: FinSetMor): boolean => {
  const verdict = FinSetSubobjectClassifier.equalMor?.(left, right)
  if (typeof verdict === 'boolean' && verdict) {
    return true
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

const buildIsoFromCanonical = (
  canonical: { readonly subobject: FinSetObj; readonly inclusion: FinSetMor },
  mono: FinSetMor,
): { readonly forward: FinSetMor; readonly backward: FinSetMor } => {
  const forwardMap = canonical.inclusion.map.map((codomainIndex) => {
    const domainIndex = mono.map.indexOf(codomainIndex)
    if (domainIndex < 0) {
      throw new Error('buildIsoFromCanonical: mono does not hit the canonical fibre index')
    }
    return domainIndex
  })

  const backwardMap = mono.map.map((codomainIndex) => {
    const canonicalIndex = canonical.inclusion.map.indexOf(codomainIndex)
    if (canonicalIndex < 0) {
      throw new Error('buildIsoFromCanonical: canonical fibre missing mono image')
    }
    return canonicalIndex
  })

  return {
    forward: { from: canonical.subobject, to: mono.from, map: forwardMap },
    backward: { from: mono.from, to: canonical.subobject, map: backwardMap },
  }
}

describe('FinSetSubobjectClassifier', () => {
  it('classifies monomorphisms via truth-valued characteristic maps', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const S = makeFinSetObj(['s0', 's1'])
    const inclusion: FinSetMor = { from: S, to: A, map: [0, 2] }

    const chi = FinSetSubobjectClassifier.characteristic(inclusion)

    expect(chi.from).toBe(A)
    expect(chi.to).toBe(FinSetSubobjectClassifier.truthValues)
    expect(chi.map).toEqual([1, 0, 1])

    expect(FinSetSubobjectClassifier.truthValues).toBe(FinSetTruthValues)
    expectEqualArrows(FinSetSubobjectClassifier.truthArrow, FinSetTruthArrow)

    const truthComposite = FinSetSubobjectClassifier.compose(
      FinSetSubobjectClassifier.truthArrow,
      FinSetSubobjectClassifier.terminate(S),
    )

    const charComposite = FinSetSubobjectClassifier.compose(chi, inclusion)
    expectEqualArrows(charComposite, truthComposite)

    const reconstructed = FinSetSubobjectClassifier.subobjectFromCharacteristic(chi)
    const iso = buildIsoFromCanonical(reconstructed, inclusion)

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(reconstructed.inclusion, iso.forward),
      inclusion,
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.characteristic(reconstructed.inclusion),
      chi,
    )
  })

  it('exposes the categorical false arrow alongside truth', () => {
    const computed = CategoryLimits.subobjectClassifierFalseArrow(FinSetSubobjectClassifier)

    expectEqualArrows(FinSetSubobjectClassifier.falseArrow, FinSetFalseArrow)
    expectEqualArrows(FinSetSubobjectClassifier.falseArrow, computed)

    expect(FinSetSubobjectClassifier.falseArrow.from).toBe(
      FinSetSubobjectClassifier.terminalObj,
    )
    expect(FinSetSubobjectClassifier.falseArrow.to).toBe(
      FinSetSubobjectClassifier.truthValues,
    )

    expect(eqArrows(FinSetSubobjectClassifier.falseArrow, FinSetTruthArrow)).toBe(false)
  })

  it('exposes Ω negation via the false point and composes to complements', () => {
    const computed = CategoryLimits.subobjectClassifierNegation(FinSetSubobjectClassifier)

    expectEqualArrows(FinSetSubobjectClassifier.negation, FinSetNegation)
    expectEqualArrows(FinSetSubobjectClassifier.negation, computed)

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(
        FinSetSubobjectClassifier.negation,
        FinSetSubobjectClassifier.truthArrow,
      ),
      FinSetSubobjectClassifier.falseArrow,
    )

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(
        FinSetSubobjectClassifier.negation,
        FinSetSubobjectClassifier.falseArrow,
      ),
      FinSetTruthArrow,
    )

    const ambient = makeFinSetObj(['x0', 'x1', 'x2'])
    const subobject = makeFinSetObj(['s0'])
    const inclusion: FinSetMor = { from: subobject, to: ambient, map: [1] }

    const chi = FinSetSubobjectClassifier.characteristic(inclusion)
    const complement = finsetComplementSubobject(inclusion)
    const complementViaNegation = FinSetSubobjectClassifier.compose(
      FinSetSubobjectClassifier.negation,
      chi,
    )

    expectEqualArrows(complement.characteristic, complementViaNegation)
    expectEqualArrows(complement.characteristic, finsetCharacteristicComplement(chi))
  })

  it('validates negation witnesses and falls back to the computed arrow when equality is unavailable', () => {
    const withoutEqual = {
      ...FinSetSubobjectClassifier,
      equalMor: undefined,
    } as unknown as CategoryLimits.SubobjectClassifierCategory<FinSetObj, FinSetMor>

    const derived = CategoryLimits.subobjectClassifierNegation(withoutEqual)
    expectEqualArrows(derived, FinSetNegation)

    const inconsistent = {
      ...FinSetSubobjectClassifier,
      negation: FinSetTruthArrow,
    } as CategoryLimits.SubobjectClassifierCategory<FinSetObj, FinSetMor>

    expect(() => CategoryLimits.subobjectClassifierNegation(inconsistent)).toThrow(/negation|false/i)

    const eqlessInconsistent = {
      ...withoutEqual,
      negation: FinSetTruthArrow,
      equalMor: undefined,
    } as unknown as CategoryLimits.SubobjectClassifierCategory<FinSetObj, FinSetMor>

    const recovered = CategoryLimits.subobjectClassifierNegation(eqlessInconsistent)
    expectEqualArrows(recovered, FinSetNegation)
  })

  it('reconstructs subobjects from characteristic maps', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
    const S = makeFinSetObj(['s0', 's1'])
    const inclusion: FinSetMor = { from: S, to: A, map: [1, 3] }

    const chi = FinSetSubobjectClassifier.characteristic(inclusion)
    const canonical = FinSetSubobjectClassifier.subobjectFromCharacteristic(chi)
    const pullbackWitness = finsetCharacteristicPullback(chi)

    expect(canonical.subobject.elements).toEqual(['a1', 'a3'])
    expect(canonical.inclusion.to).toBe(A)
    expect(canonical.inclusion.map).toEqual([1, 3])

    expectEqualArrows(pullbackWitness.inclusion, canonical.inclusion)
    expect(sameObject(pullbackWitness.subobject, canonical.subobject)).toBe(true)

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(chi, pullbackWitness.inclusion),
      FinSetSubobjectClassifier.compose(
        FinSetSubobjectClassifier.truthArrow,
        pullbackWitness.terminalProjection,
      ),
    )

    const canonicalTruth = FinSetSubobjectClassifier.compose(
      FinSetSubobjectClassifier.truthArrow,
      FinSetSubobjectClassifier.terminate(canonical.subobject),
    )

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(chi, canonical.inclusion),
      canonicalTruth,
    )

    expectEqualArrows(
      FinSetSubobjectClassifier.characteristic(canonical.inclusion),
      chi,
    )
  })

  it('builds complement subobjects by pulling back along the false point', () => {
    const ambient = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
    const subobject = makeFinSetObj(['s0', 's1'])
    const inclusion: FinSetMor = { from: subobject, to: ambient, map: [0, 3] }

    const chi = FinSetSubobjectClassifier.characteristic(inclusion)
    const falseWitness = finsetCharacteristicFalsePullback(chi)

    expect(falseWitness.inclusion.map).toEqual([1, 2])
    expect(falseWitness.inclusion.to).toBe(ambient)

    const complement = finsetComplementSubobject(inclusion)
    expect(sameObject(falseWitness.subobject, complement.complement.subobject)).toBe(true)
    expectEqualArrows(falseWitness.inclusion, complement.complement.inclusion)

    const complementChi = finsetCharacteristicComplement(chi)
    expectEqualArrows(complementChi, complement.characteristic)

    const recomposed = FinSetSubobjectClassifier.subobjectFromCharacteristic(
      complement.characteristic,
    )
    expect(sameObject(recomposed.subobject, complement.complement.subobject)).toBe(true)
    expectEqualArrows(recomposed.inclusion, complement.complement.inclusion)

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(
        complement.characteristic,
        complement.complement.inclusion,
      ),
      FinSetSubobjectClassifier.compose(
        FinSetSubobjectClassifier.falseArrow,
        complement.falsePullback.terminalProjection,
      ),
    )
  })

  it('exposes Ω conjunction whose composition realises intersections', () => {
    const truthProduct = FinSetSubobjectClassifier.truthProduct
    const truthAnd = FinSetSubobjectClassifier.truthAnd

    if (!truthProduct || !truthAnd) {
      throw new Error('FinSetSubobjectClassifier must expose truth-product witnesses.')
    }

    expect(truthProduct.obj).toBe(FinSetTruthProduct.obj)
    expectEqualArrows(truthProduct.projections[0], FinSetTruthProduct.projections[0])
    expectEqualArrows(truthProduct.projections[1], FinSetTruthProduct.projections[1])
    expectEqualArrows(truthAnd, FinSetTruthAnd)
    expect(truthAnd.map).toEqual([0, 0, 0, 1])

    const ambient = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
    const left = makeFinSetObj(['l0', 'l1'])
    const right = makeFinSetObj(['r0', 'r1'])
    const includeLeft: FinSetMor = { from: left, to: ambient, map: [0, 2] }
    const includeRight: FinSetMor = { from: right, to: ambient, map: [2, 3] }

    const chiLeft = FinSetSubobjectClassifier.characteristic(includeLeft)
    const chiRight = FinSetSubobjectClassifier.characteristic(includeRight)
    const paired = truthProduct.pair(ambient, chiLeft, chiRight)
    const conjunction = FinSetSubobjectClassifier.compose(truthAnd, paired)

    const intersection = finsetSubobjectIntersection(includeLeft, includeRight)
    const chiIntersection = FinSetSubobjectClassifier.characteristic(
      intersection.intersection.inclusion,
    )

    expectEqualArrows(conjunction, chiIntersection)

    const truthVsFalse = truthProduct.pair(
      FinSetSubobjectClassifier.terminalObj,
      FinSetSubobjectClassifier.truthArrow,
      FinSetSubobjectClassifier.falseArrow,
    )
    const meetWithTruthAndFalse = FinSetSubobjectClassifier.compose(truthAnd, truthVsFalse)
    expectEqualArrows(meetWithTruthAndFalse, FinSetSubobjectClassifier.falseArrow)
  })

  it('packages the truth pullback universal property for characteristic maps', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
    const S = makeFinSetObj(['s0', 's1'])
    const inclusion: FinSetMor = { from: S, to: A, map: [1, 3] }

    const chi = FinSetSubobjectClassifier.characteristic(inclusion)
    const pullbackWitness = finsetCharacteristicPullback(chi)

    expect(pullbackWitness.squareCommutes).toBe(true)
    expect(pullbackWitness.certification.valid).toBe(true)
    expectEqualArrows(
      pullbackWitness.characteristicComposite,
      FinSetSubobjectClassifier.compose(chi, pullbackWitness.inclusion),
    )
    expectEqualArrows(
      pullbackWitness.truthComposite,
      FinSetSubobjectClassifier.compose(
        FinSetSubobjectClassifier.truthArrow,
        pullbackWitness.terminalProjection,
      ),
    )

    const wedge = makeFinSetObj(['w0', 'w1'])
    const wedgeToAmbient: FinSetMor = { from: wedge, to: A, map: [1, 3] }
    const wedgeToTerminal = FinSetSubobjectClassifier.terminate(wedge)

    const commutingCone: PullbackData<FinSetObj, FinSetMor> = {
      apex: wedge,
      toDomain: wedgeToAmbient,
      toAnchor: wedgeToTerminal,
    }

    const factoring = pullbackWitness.factorCone(commutingCone)
    expect(factoring.factored).toBe(true)
    expect(factoring.mediator).toBeDefined()
    const mediator = factoring.mediator!
    wedge.elements.forEach((_value, index) => {
      const apexIndex = mediator.map[index]
      if (apexIndex === undefined) {
        throw new Error('FinSetSubobjectClassifier: mediator misses apex index')
      }
      expect(pullbackWitness.inclusion.map[apexIndex]).toBe(wedgeToAmbient.map[index])
      expect(pullbackWitness.terminalProjection.map[apexIndex]).toBe(
        wedgeToTerminal.map[index],
      )
    })

    const skewCone: PullbackData<FinSetObj, FinSetMor> = {
      apex: wedge,
      toDomain: { from: wedge, to: A, map: [1, 2] },
      toAnchor: wedgeToTerminal,
    }

    const skewFactoring = pullbackWitness.factorCone(skewCone)
    expect(skewFactoring.factored).toBe(false)
    expect(skewFactoring.reason).toMatch(/equalizer|pullback|factor/i)
  })

  it('identifies isomorphic subobjects sharing a characteristic map', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
    const left = makeFinSetObj(['u0', 'u1'])
    const right = makeFinSetObj(['v0', 'v1'])

    const includeLeft: FinSetMor = { from: left, to: A, map: [0, 2] }
    const includeRight: FinSetMor = { from: right, to: A, map: [0, 2] }

    const chiLeft = FinSetSubobjectClassifier.characteristic(includeLeft)
    const chiRight = FinSetSubobjectClassifier.characteristic(includeRight)

    expectEqualArrows(chiLeft, chiRight)

    const canonical = FinSetSubobjectClassifier.subobjectFromCharacteristic(chiLeft)

    const isoLeft = buildIsoFromCanonical(canonical, includeLeft)
    const isoRight = buildIsoFromCanonical(canonical, includeRight)

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(isoLeft.backward, isoLeft.forward),
      FinSetSubobjectClassifier.id(canonical.subobject),
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(isoLeft.forward, isoLeft.backward),
      FinSetSubobjectClassifier.id(left),
    )

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(isoRight.backward, isoRight.forward),
      FinSetSubobjectClassifier.id(canonical.subobject),
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(isoRight.forward, isoRight.backward),
      FinSetSubobjectClassifier.id(right),
    )

    const forward = FinSetSubobjectClassifier.compose(isoRight.forward, isoLeft.backward)
    const backward = FinSetSubobjectClassifier.compose(isoLeft.forward, isoRight.backward)

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(backward, forward),
      FinSetSubobjectClassifier.id(left),
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(forward, backward),
      FinSetSubobjectClassifier.id(right),
    )
  })

  it('builds the canonical iso between equivalent subobject classifiers', () => {
    const swappedTruthValues = makeFinSetObj([true, false])

    const swappedTruthArrow: FinSetMor = {
      from: FinSetSubobjectClassifier.terminalObj,
      to: swappedTruthValues,
      map: [0],
    }

    const swappedCharacteristic = (mono: FinSetMor): FinSetMor => {
      const canonical = FinSetSubobjectClassifier.characteristic(mono)
      const map = canonical.map.map((value) => {
        if (value === 0) return 1
        if (value === 1) return 0
        throw new Error('alternate classifier: characteristic map must be truth-valued.')
      })
      return { from: canonical.from, to: swappedTruthValues, map }
    }

    const swappedSubobjectFromCharacteristic = (chi: FinSetMor) => {
      if (chi.to !== swappedTruthValues) {
        throw new Error('alternate classifier: characteristic must land in the swapped truth object.')
      }
      const canonical = {
        from: chi.from,
        to: FinSetTruthValues,
        map: chi.map.map((value) => {
          if (value === 0) return 1
          if (value === 1) return 0
          throw new Error('alternate classifier: characteristic map must be truth-valued.')
        }),
      }
      return FinSetSubobjectClassifier.subobjectFromCharacteristic(canonical)
    }

    const swappedFalseArrow = swappedCharacteristic(
      FinSetSubobjectClassifier.initialArrow(FinSetSubobjectClassifier.terminalObj),
    )

    const swappedNegation = swappedCharacteristic(swappedFalseArrow)

    const swappedTruthProductBase = FinSet.product([swappedTruthValues, swappedTruthValues])

    const swappedTruthProduct: CategoryLimits.TruthProductWitness<FinSetObj, FinSetMor> = {
      obj: swappedTruthProductBase.obj,
      projections: [
        swappedTruthProductBase.projections[0]!,
        swappedTruthProductBase.projections[1]!,
      ] as const,
      pair: (domain, left, right) => {
        const map = domain.elements.map((_value, index) => {
          const leftIndex = left.map[index]
          const rightIndex = right.map[index]
          if (leftIndex === undefined || rightIndex === undefined) {
            throw new Error('alternate classifier: missing coordinate for truth product pair.')
          }
          const tupleIndex = swappedTruthProductBase.obj.elements.findIndex((tuple) => {
            const coordinates = tuple as ReadonlyArray<number>
            return coordinates[0] === leftIndex && coordinates[1] === rightIndex
          })
          if (tupleIndex < 0) {
            throw new Error('alternate classifier: coordinates outside swapped truth product.')
          }
          return tupleIndex
        })
        return { from: domain, to: swappedTruthProductBase.obj, map }
      },
    }

    const swappedTruthAnd: FinSetMor = {
      from: swappedTruthProduct.obj,
      to: swappedTruthValues,
      map: swappedTruthProduct.obj.elements.map(tuple => {
        const coordinates = tuple as ReadonlyArray<number>
        const left = coordinates[0]
        const right = coordinates[1]
        if (left === undefined || right === undefined) {
          throw new Error('alternate classifier: malformed Ω × Ω tuple.')
        }
        if ((left !== 0 && left !== 1) || (right !== 0 && right !== 1)) {
          throw new Error('alternate classifier: tuple indexes must reference swapped truth values.')
        }
        return left === 0 && right === 0 ? 0 : 1
      }),
    }

    const alternate: CategoryLimits.SubobjectClassifierCategory<FinSetObj, FinSetMor> = {
      ...FinSetSubobjectClassifier,
      truthValues: swappedTruthValues,
      truthArrow: swappedTruthArrow,
      falseArrow: swappedFalseArrow,
      negation: swappedNegation,
      truthProduct: swappedTruthProduct,
      truthAnd: swappedTruthAnd,
      characteristic: swappedCharacteristic,
      subobjectFromCharacteristic: swappedSubobjectFromCharacteristic,
    }

    const iso = CategoryLimits.buildSubobjectClassifierIso(
      FinSetSubobjectClassifier,
      alternate,
    )

    expect(iso.forward.from).toBe(alternate.truthValues)
    expect(iso.forward.to).toBe(FinSetSubobjectClassifier.truthValues)

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(iso.forward, iso.backward),
      FinSetSubobjectClassifier.id(FinSetSubobjectClassifier.truthValues),
    )
    expectEqualArrows(
      alternate.compose(iso.backward, iso.forward),
      alternate.id(alternate.truthValues),
    )

    const transportedTruth = FinSetSubobjectClassifier.compose(
      iso.forward,
      swappedTruthArrow,
    )
    expectEqualArrows(transportedTruth, FinSetTruthArrow)

    const roundTripTruth = alternate.compose(iso.backward, FinSetTruthArrow)
    expectEqualArrows(roundTripTruth, swappedTruthArrow)
  })

  it('exhibits monomorphisms as equalizers via the FinSet classifier', () => {
    const ambient = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])
    const subobject = makeFinSetObj(['s0', 's1'])
    const inclusion: FinSetMor = { from: subobject, to: ambient, map: [1, 3] }

    const witness = finsetMonomorphismEqualizer(inclusion)

    expectEqualArrows(witness.equalizer.equalize, witness.canonical.inclusion)
    expect(sameObject(witness.equalizer.obj, witness.canonical.subobject)).toBe(true)

    expectEqualArrows(
      witness.canonicalCharacteristicComposite,
      witness.canonicalTruthComposite,
    )
    expectEqualArrows(
      witness.domainCharacteristicComposite,
      witness.domainTruthComposite,
    )

    const wedge = makeFinSetObj(['w0', 'w1'])
    const wedgeToAmbient: FinSetMor = { from: wedge, to: ambient, map: [1, 3] }

    const canonicalFactoring = witness.factorCanonical({
      left: witness.characteristic,
      right: witness.truthComposite,
      inclusion: witness.canonical.inclusion,
      fork: wedgeToAmbient,
    })
    expect(canonicalFactoring.factored).toBe(true)
    expect(canonicalFactoring.mediator).toBeDefined()
    const canonicalMediator = canonicalFactoring.mediator!
    wedge.elements.forEach((_value, index) => {
      const mediatorIndex = canonicalMediator.map[index]
      expect(mediatorIndex).toBeDefined()
      expect(witness.canonical.inclusion.map[mediatorIndex!]).toBe(
        wedgeToAmbient.map[index],
      )
    })

    const monoFactoring = witness.factorMonomorphism({
      left: witness.characteristic,
      right: witness.truthComposite,
      inclusion,
      fork: wedgeToAmbient,
    })
    expect(monoFactoring.factored).toBe(true)
    expect(monoFactoring.mediator).toBeDefined()
    const monoMediator = monoFactoring.mediator!
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(inclusion, monoMediator),
      wedgeToAmbient,
    )

    const skewFork: FinSetMor = { from: wedge, to: ambient, map: [1, 2] }
    const skewVerdict = witness.factorCanonical({
      left: witness.characteristic,
      right: witness.truthComposite,
      inclusion: witness.canonical.inclusion,
      fork: skewFork,
    })
    expect(skewVerdict.factored).toBe(false)
    expect(skewVerdict.reason).toMatch(/canonical|fork|subobject/i)
  })

  it('constructs balanced inverses for bijective FinSet arrows', () => {
    const domain = makeFinSetObj(['d0', 'd1'])
    const codomain = makeFinSetObj(['c0', 'c1'])

    const bijection: FinSetMor = { from: domain, to: codomain, map: [1, 0] }
    const isoVerdict = finsetMonicEpicIso(bijection)

    expect(isoVerdict.found).toBe(true)
    expect(isoVerdict.witness).toBeDefined()
    const witness = isoVerdict.witness!

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(witness.backward, witness.forward),
      FinSetSubobjectClassifier.id(domain),
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(witness.forward, witness.backward),
      FinSetSubobjectClassifier.id(codomain),
    )
    expectEqualArrows(
      witness.equalizer.characteristic,
      witness.equalizer.truthComposite,
    )

    const nonEpic: FinSetMor = { from: domain, to: codomain, map: [0, 0] }
    const failure = finsetMonicEpicIso(nonEpic)
    expect(failure.found).toBe(false)
    expect(failure.reason).toMatch(/epic|inverse|monic/i)
  })

  it('rejects malformed characteristic maps through the pullback helper', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const malformed: FinSetMor = {
      from: A,
      to: FinSetSubobjectClassifier.truthValues,
      map: [0, 2, 1],
    }

    expect(() => finsetCharacteristicPullback(malformed)).toThrow(/pullback|truth|target/i)
  })

  it('rejects malformed target arrows when extracting characteristic pullbacks', () => {
    const ambient = makeFinSetObj(['a0', 'a1'])
    const sub = makeFinSetObj(['s0'])
    const inclusion: FinSetMor = { from: sub, to: ambient, map: [1] }
    const chi = FinSetSubobjectClassifier.characteristic(inclusion)

    const truncatedTarget: FinSetMor = {
      from: FinSetSubobjectClassifier.terminalObj,
      to: FinSetSubobjectClassifier.truthValues,
      map: [],
    }

    expect(() => finsetCharacteristicPullback(chi, truncatedTarget)).toThrow(/target|terminal/i)

    const fractionalTarget: FinSetMor = {
      from: FinSetSubobjectClassifier.terminalObj,
      to: FinSetSubobjectClassifier.truthValues,
      map: [0.5],
    }

    expect(() => finsetCharacteristicPullback(chi, fractionalTarget)).toThrow(/truth|index|target/i)

    const outOfRangeTarget: FinSetMor = {
      from: FinSetSubobjectClassifier.terminalObj,
      to: FinSetSubobjectClassifier.truthValues,
      map: [3],
    }

    expect(() => finsetCharacteristicPullback(chi, outOfRangeTarget)).toThrow(/truth|target/i)
  })

  it('rejects non-monic arrows and non truth-valued characteristic maps', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const S = makeFinSetObj(['s0', 's1'])

    const nonMono: FinSetMor = { from: S, to: A, map: [0, 0] }
    expect(() => FinSetSubobjectClassifier.characteristic(nonMono)).toThrow(/injective|mono/i)

    const skewCodomain: FinSetMor = { from: A, to: A, map: [0, 1] }
    expect(() => FinSetSubobjectClassifier.subobjectFromCharacteristic(skewCodomain)).toThrow(/truth/i)

    const badTruth: FinSetMor = {
      from: A,
      to: FinSetSubobjectClassifier.truthValues,
      map: [0, 2],
    }
    expect(() => FinSetSubobjectClassifier.subobjectFromCharacteristic(badTruth)).toThrow(/truth/i)
  })

  it('detects the subobject order via reflexivity and transitivity', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2', 'a3'])

    const tiny = makeFinSetObj(['t0'])
    const mid = makeFinSetObj(['m0', 'm1'])
    const large = makeFinSetObj(['l0', 'l1', 'l2'])

    const includeTiny: FinSetMor = { from: tiny, to: A, map: [0] }
    const includeMid: FinSetMor = { from: mid, to: A, map: [0, 2] }
    const includeLarge: FinSetMor = { from: large, to: A, map: [0, 1, 2] }

    const reflexive = finsetSubobjectLeq(includeMid, includeMid)
    expect(reflexive.holds).toBe(true)
    expect(reflexive.mediator).toBeDefined()
    expectEqualArrows(reflexive.mediator!, FinSetSubobjectClassifier.id(mid))

    const tinyLeqMid = finsetSubobjectLeq(includeTiny, includeMid)
    const midLeqLarge = finsetSubobjectLeq(includeMid, includeLarge)
    const tinyLeqLarge = finsetSubobjectLeq(includeTiny, includeLarge)

    expect(tinyLeqMid.holds).toBe(true)
    expect(midLeqLarge.holds).toBe(true)
    expect(tinyLeqLarge.holds).toBe(true)

    const composed = FinSetSubobjectClassifier.compose(midLeqLarge.mediator!, tinyLeqMid.mediator!)
    expectEqualArrows(composed, tinyLeqLarge.mediator!)
  })

  it('certifies antisymmetry by producing subobject isomorphisms', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const left = makeFinSetObj(['u0', 'u1'])
    const right = makeFinSetObj(['v0', 'v1'])

    const includeLeft: FinSetMor = { from: left, to: A, map: [0, 2] }
    const includeRight: FinSetMor = { from: right, to: A, map: [0, 2] }

    const comparison = finsetSubobjectPartialOrder(includeLeft, includeRight)

    expect(comparison.leftLeqRight.holds).toBe(true)
    expect(comparison.rightLeqLeft.holds).toBe(true)
    expect(comparison.isomorphic).toBeDefined()

    const iso = comparison.isomorphic!
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(iso.backward, iso.forward),
      FinSetSubobjectClassifier.id(left),
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(iso.forward, iso.backward),
      FinSetSubobjectClassifier.id(right),
    )

    expectEqualArrows(
      FinSetSubobjectClassifier.compose(includeRight, iso.forward),
      includeLeft,
    )
    expectEqualArrows(
      FinSetSubobjectClassifier.compose(includeLeft, iso.backward),
      includeRight,
    )
  })

  it('rejects incomparable subobjects and codomain mismatches', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const B = makeFinSetObj(['b0', 'b1'])

    const S = makeFinSetObj(['s0'])
    const T = makeFinSetObj(['t0', 't1'])

    const includeS: FinSetMor = { from: S, to: A, map: [0] }
    const includeT: FinSetMor = { from: T, to: A, map: [1, 2] }
    const mismatch: FinSetMor = { from: S, to: B, map: [0] }

    const incomparable = finsetSubobjectLeq(includeT, includeS)
    expect(incomparable.holds).toBe(false)
    expect(incomparable.reason).toMatch(/factor|image/i)

    const mismatchVerdict = finsetSubobjectLeq(includeS, mismatch)
    expect(mismatchVerdict.holds).toBe(false)
    expect(mismatchVerdict.reason).toMatch(/codomain/i)
  })

  it('throws when supplied arrows are not monomorphisms', () => {
    const A = makeFinSetObj(['a0', 'a1'])
    const S = makeFinSetObj(['s0', 's1'])

    const mono: FinSetMor = { from: S, to: A, map: [0, 1] }
    const nonMono: FinSetMor = { from: S, to: A, map: [0, 0] }

    expect(() => finsetSubobjectLeq(nonMono, mono)).toThrow(/mono/i)
    expect(() => finsetSubobjectLeq(mono, nonMono)).toThrow(/mono/i)

    expect(() => finsetSubobjectPartialOrder(nonMono, mono)).toThrow(/mono/i)
  })

  it('does not claim isomorphism when only one comparison succeeds', () => {
    const A = makeFinSetObj(['a0', 'a1', 'a2'])
    const small = makeFinSetObj(['s0'])
    const big = makeFinSetObj(['b0', 'b1'])

    const includeSmall: FinSetMor = { from: small, to: A, map: [0] }
    const includeBig: FinSetMor = { from: big, to: A, map: [0, 1] }

    const verdict = finsetSubobjectPartialOrder(includeSmall, includeBig)
    expect(verdict.leftLeqRight.holds).toBe(true)
    expect(verdict.rightLeqLeft.holds).toBe(false)
    expect(verdict.isomorphic).toBeUndefined()
  })
})
