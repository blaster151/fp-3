import { CategoryLimits } from "../../stdlib/category-limits"
import { IndexedFamilies } from "../../stdlib/indexed-families"
import {
  FinSet,
  type FinSetMor,
  type FinSetObj,
  type FinSetPushoutWitness,
} from "./triangulated"
import { FinSet, type FinSetMor, type FinSetObj } from "./triangulated"
export { FinSetInitialProductIso, finsetProductInitialIso, finsetInitialProductIso } from "./triangulated"

const arrowsEqual = (left: FinSetMor, right: FinSetMor): boolean => {
  if (FinSet.equalMor) {
    const verdict = FinSet.equalMor(left, right)
    if (typeof verdict === "boolean") {
      return verdict
    }
  }
  if (left.from !== right.from || left.to !== right.to) return false
  if (left.map.length !== right.map.length) return false
  return left.map.every((value, index) => value === right.map[index])
}

const tupleIndex = (product: FinSetObj): Map<string, number> => {
  const lookup = new Map<string, number>()
  product.elements.forEach((value, index) => {
    lookup.set(JSON.stringify(value), index)
  })
  return lookup
}

const exponentialMetadata = new WeakMap<FinSetObj, { codomain: FinSetObj; base: FinSetObj }>()

const buildExistingExponential = (object: FinSetObj) => {
  const metadata = exponentialMetadata.get(object)
  if (!metadata) {
    throw new Error("finSetExponential: unrecognised exponential object; construct via finSetExponential")
  }
  const lookup = tupleIndex(object)
  const functionAt = (index: number): ReadonlyArray<number> => {
    const value = object.elements[index] as ReadonlyArray<number> | undefined
    if (!value) {
      throw new Error("finSetExponential: function index out of bounds")
    }
    return value
  }
  const indexOfFunction = (values: ReadonlyArray<number>): number => {
    const key = JSON.stringify(values)
    const index = lookup.get(key)
    if (index === undefined) {
      throw new Error("finSetExponential: supplied function not present in the exponential carrier")
    }
    return index
  }
  return { metadata, functionAt, indexOfFunction }
}

export const FinSetProductsWithTuple: CategoryLimits.HasSmallProductMediators<FinSetObj, FinSetMor> = {
  product: (objects) => FinSet.product(objects),
  smallProduct<I>(index: IndexedFamilies.SmallIndex<I>, family: IndexedFamilies.SmallFamily<I, FinSetObj>) {
    const finite = IndexedFamilies.ensureFiniteIndex(index)
    const objects = finite.carrier.map((entry) => family(entry))
    const { obj, projections } = FinSet.product(objects)
    const projectionCache = new Map<I, FinSetMor>()

    finite.carrier.forEach((entry, position) => {
      const projection = projections[position]
      if (!projection) {
        throw new Error('FinSetProductsWithTuple.smallProduct: projection missing for supplied index')
      }
      projectionCache.set(entry, projection)
    })

    const projectionFamily: IndexedFamilies.SmallFamily<I, FinSetMor> = (entry) => {
      const projection = projectionCache.get(entry)
      if (!projection) {
        throw new Error('FinSetProductsWithTuple.smallProduct: index outside enumerated carrier')
      }
      return projection
    }

    return { obj, projections: projectionFamily }
  },
  tuple: (domain, legs, product) => {
    if (legs.length === 0) {
      if (product.elements.length === 0) {
        throw new Error("FinSetProductsWithTuple: terminal product carrier must contain the empty tuple")
      }
      return {
        from: domain,
        to: product,
        map: Array.from({ length: domain.elements.length }, () => 0),
      }
    }

    const index = tupleIndex(product)
    const sampleTuple = product.elements[0] as ReadonlyArray<number> | undefined
    const arity = sampleTuple?.length ?? legs.length
    if (legs.length !== arity) {
      throw new Error(
        `FinSetProductsWithTuple: expected ${arity} legs for the supplied product but received ${legs.length}`,
      )
    }

    const map = domain.elements.map((_, position) => {
      const coordinates = legs.map((leg, legIx) => {
        if (leg.from !== domain) {
          throw new Error(`FinSetProductsWithTuple: leg ${legIx} domain mismatch`)
        }
        const image = leg.map[position]
        if (image === undefined) {
          throw new Error(`FinSetProductsWithTuple: leg ${legIx} missing image for domain index ${position}`)
        }
        if (image < 0 || image >= leg.to.elements.length) {
          throw new Error(`FinSetProductsWithTuple: leg ${legIx} image ${image} out of bounds for its codomain`)
        }
        return image
      })
      const key = JSON.stringify(coordinates)
      const target = index.get(key)
      if (target === undefined) {
        throw new Error("FinSetProductsWithTuple: tuple legs do not land in the supplied product carrier")
      }
      return target
    })

    return { from: domain, to: product, map }
  },
}

export const FinSetCoproductsWithCotuple: CategoryLimits.HasCoproductMediators<FinSetObj, FinSetMor> = {
  coproduct: (objects) => FinSet.coproduct(objects),
  cotuple: (coproduct, legs, codomain) => {
    if (coproduct.elements.length === 0) {
      if (legs.length !== 0) {
        throw new Error(
          `FinSetCoproductsWithCotuple: expected no legs for the initial coproduct but received ${legs.length}`,
        )
      }
      return { from: coproduct, to: codomain, map: [] }
    }

    const entries = coproduct.elements as ReadonlyArray<{ tag: number; i: number }>
    let maxTag = -1
    for (const entry of entries) {
      if (!entry || typeof entry.tag !== "number" || typeof entry.i !== "number") {
        throw new Error("FinSetCoproductsWithCotuple: malformed coproduct element")
      }
      if (entry.tag > maxTag) maxTag = entry.tag
    }
    const expectedLegs = maxTag + 1
    if (legs.length !== expectedLegs) {
      throw new Error(
        `FinSetCoproductsWithCotuple: expected ${expectedLegs} legs for the coproduct but received ${legs.length}`,
      )
    }

    const map = entries.map((entry, index) => {
      const leg = legs[entry.tag]
      if (!leg) {
        throw new Error(`FinSetCoproductsWithCotuple: missing leg for tag ${entry.tag}`)
      }
      if (leg.to !== codomain) {
        throw new Error("FinSetCoproductsWithCotuple: leg codomain mismatch")
      }
      if (leg.from.elements.length <= entry.i) {
        throw new Error(`FinSetCoproductsWithCotuple: leg ${entry.tag} domain too small for index ${entry.i}`)
      }
      const image = leg.map[entry.i]
      if (image === undefined) {
        throw new Error(`FinSetCoproductsWithCotuple: leg ${entry.tag} missing image for index ${entry.i}`)
      }
      if (image < 0 || image >= codomain.elements.length) {
        throw new Error(`FinSetCoproductsWithCotuple: image ${image} out of bounds for codomain`)
      }
      return image
    })

    return { from: coproduct, to: codomain, map }
  },
}

export interface FinSetProductPullbackWitness {
  readonly product: FinSetObj
  readonly projectionIntoLeft: FinSetMor
  readonly projectionIntoRight: FinSetMor
  readonly leftTerminate: FinSetMor
  readonly rightTerminate: FinSetMor
  readonly factorCone: (input: {
    readonly object: FinSetObj
    readonly intoLeft: FinSetMor
    readonly intoRight: FinSetMor
  }) => FinSetMor
}

export const finsetProductPullback = (left: FinSetObj, right: FinSetObj): FinSetProductPullbackWitness => {
  const { obj: product, projections } = FinSet.product([left, right])
  const [projectionIntoLeft, projectionIntoRight] = projections as readonly [FinSetMor, FinSetMor]
  const leftTerminate = FinSet.terminal.terminate(left)
  const rightTerminate = FinSet.terminal.terminate(right)

  const checkCone = (intoLeft: FinSetMor, intoRight: FinSetMor) => {
    const leftComposite = FinSet.compose(leftTerminate, intoLeft)
    const rightComposite = FinSet.compose(rightTerminate, intoRight)
    if (!arrowsEqual(leftComposite, rightComposite)) {
      throw new Error("finsetProductPullback: legs must agree after termination")
    }
  }

  return {
    product,
    projectionIntoLeft,
    projectionIntoRight,
    leftTerminate,
    rightTerminate,
    factorCone: ({ object, intoLeft, intoRight }) => {
      if (intoLeft.from !== object || intoRight.from !== object) {
        throw new Error("finsetProductPullback: cone tip mismatch")
      }
      if (intoLeft.to !== left) {
        throw new Error("finsetProductPullback: left factor mismatch")
      }
      if (intoRight.to !== right) {
        throw new Error("finsetProductPullback: right factor mismatch")
      }
      checkCone(intoLeft, intoRight)
      return FinSetProductsWithTuple.tuple(object, [intoLeft, intoRight], product)
    },
  }
}

export interface FinSetPushoutQuotientWitness extends FinSetPushoutWitness {
  readonly factorCocone: (input: {
    readonly object: FinSetObj
    readonly fromLeft: FinSetMor
    readonly fromRight: FinSetMor
  }) => FinSetMor
}

export const finsetPushout = (f: FinSetMor, g: FinSetMor): FinSetPushoutQuotientWitness => {
  const base = FinSet.pushout(f, g)

  const factorCocone = ({ object, fromLeft, fromRight }: {
    readonly object: FinSetObj
    readonly fromLeft: FinSetMor
    readonly fromRight: FinSetMor
  }): FinSetMor => {
    if (fromLeft.from !== f.to || fromRight.from !== g.to) {
      throw new Error('finsetPushout: wedge legs must originate at the cospan codomains')
    }
    if (fromLeft.to !== object || fromRight.to !== object) {
      throw new Error('finsetPushout: wedge legs must land in the advertised apex')
    }

    const leftComposite = FinSet.compose(fromLeft, f)
    const rightComposite = FinSet.compose(fromRight, g)
    if (!arrowsEqual(leftComposite, rightComposite)) {
      throw new Error('finsetPushout: wedge does not commute over the shared domain')
    }

    const entries = base.coproduct.elements as ReadonlyArray<{ tag: number; i: number }>
    const mediatorValues: Array<number | undefined> = new Array(base.apex.elements.length).fill(undefined)

    entries.forEach((entry, index) => {
      if (!entry || typeof entry.tag !== 'number' || typeof entry.i !== 'number') {
        throw new Error('finsetPushout: encountered malformed coproduct element')
      }
      const classIndex = base.quotient.map[index]
      if (classIndex === undefined) {
        throw new Error('finsetPushout: quotient map missing image for coproduct element')
      }

      let value: number | undefined
      if (entry.tag === 0) {
        value = fromLeft.map[entry.i]
        if (value === undefined) {
          throw new Error('finsetPushout: wedge left leg missing an image for a coproduct element')
        }
      } else if (entry.tag === 1) {
        value = fromRight.map[entry.i]
        if (value === undefined) {
          throw new Error('finsetPushout: wedge right leg missing an image for a coproduct element')
        }
      } else {
        throw new Error('finsetPushout: coproduct tag outside the cospan range')
      }

      if (value < 0 || value >= object.elements.length) {
        throw new Error('finsetPushout: wedge leg lands outside the target apex')
      }

      const recorded = mediatorValues[classIndex]
      if (recorded === undefined) {
        mediatorValues[classIndex] = value
      } else if (recorded !== value) {
        throw new Error('finsetPushout: wedge is not constant on a pushout equivalence class')
      }
    })

    const map = mediatorValues.map((value, classIndex) => {
      if (value === undefined) {
        throw new Error(`finsetPushout: equivalence class ${classIndex} lacks a wedge representative`)
      }
      return value
    })

    return { from: base.apex, to: object, map }
  }

  return { ...base, factorCocone }
}

export const finSetExponential = (codomain: FinSetObj, base: FinSetObj) => {
  const witness = FinSet.exponential(codomain, base)
  const product = witness.product.obj
  const evaluation = witness.evaluation
  const tupleLookup = tupleIndex(product)
  const functionLookup = tupleIndex(witness.obj)
  exponentialMetadata.set(witness.obj, { codomain, base })

  const functionAt = (index: number): ReadonlyArray<number> => {
    const value = witness.obj.elements[index] as ReadonlyArray<number> | undefined
    if (!value) {
      throw new Error("finSetExponential: function index out of bounds")
    }
    return value
  }

  const indexOfFunction = (values: ReadonlyArray<number>): number => {
    const key = JSON.stringify(values)
    const index = functionLookup.get(key)
    if (index === undefined) {
      throw new Error("finSetExponential: supplied function not present in the exponential carrier")
    }
    return index
  }

  return {
    object: witness.obj,
    product,
    evaluation,
    curry: (domain: FinSetObj, arrow: FinSetMor) => witness.curry(domain, arrow),
    uncurry: (domain: FinSetObj, arrow: FinSetMor) => witness.uncurry(domain, arrow),
    indexOfFunction,
    functionAt,
    tupleIndex: () => new Map(tupleLookup),
  }
}

export interface FinSetTerminalExponentialIso {
  readonly forward: FinSetMor
  readonly backward: FinSetMor
}

const expectBaseSize = (exponential: ReturnType<typeof finSetExponential>, size: number) => {
  const sample = exponential.functionAt(0)
  if (sample.length !== size) {
    throw new Error("finSetExponential: exponential witness does not match the expected base size")
  }
}

export const finsetExpFromTerminalIso = ({
  codomain,
  exponential,
}: {
  readonly codomain: FinSetObj
  readonly exponential: ReturnType<typeof finSetExponential>
}): FinSetTerminalExponentialIso => {
  expectBaseSize(exponential, FinSet.terminalObj.elements.length)

  const forward: FinSetMor = {
    from: codomain,
    to: exponential.object,
    map: codomain.elements.map((_value, idx) => exponential.indexOfFunction([idx])),
  }

  const backward: FinSetMor = {
    from: exponential.object,
    to: codomain,
    map: exponential.object.elements.map((_value, idx) => {
      const values = exponential.functionAt(idx)
      const image = values[0]
      if (image === undefined) {
        throw new Error("finsetExpFromTerminalIso: expected unary function encoding")
      }
      return image
    }),
  }

  return { forward, backward }
}

export const finsetExpToTerminalIso = ({
  base,
  exponential,
}: {
  readonly base: FinSetObj
  readonly exponential: ReturnType<typeof finSetExponential>
}): FinSetTerminalExponentialIso => {
  expectBaseSize(exponential, base.elements.length)

  const forward: FinSetMor = {
    from: exponential.object,
    to: FinSet.terminalObj,
    map: exponential.object.elements.map(() => 0),
  }

  const constantZero = exponential.indexOfFunction(
    Array.from({ length: base.elements.length }, () => 0),
  )

  const backward: FinSetMor = {
    from: FinSet.terminalObj,
    to: exponential.object,
    map: [constantZero],
  }

  return { forward, backward }
}

export interface FinSetProductUnitWitness {
  readonly product: FinSetObj
  readonly forward: FinSetMor
  readonly backward: FinSetMor
}

export interface FinSetProductLeftUnitWitness extends FinSetProductUnitWitness {
  readonly terminalProjection: FinSetMor
}

export const finsetProductRightUnitWitness = (object: FinSetObj): FinSetProductUnitWitness => {
  const productWitness = FinSet.product([object, FinSet.terminalObj])
  const [projectionToObject] = productWitness.projections as readonly [FinSetMor, FinSetMor]
  const forward = projectionToObject
  const backward = FinSetProductsWithTuple.tuple(
    object,
    [FinSet.id(object), FinSet.terminal.terminate(object)],
    productWitness.obj,
  )
  return { product: productWitness.obj, forward, backward }
}

export const finsetProductLeftUnitWitness = (object: FinSetObj): FinSetProductLeftUnitWitness => {
  const productWitness = FinSet.product([FinSet.terminalObj, object])
  const [projectionToTerminal, projectionToObject] = productWitness.projections as readonly [
    FinSetMor,
    FinSetMor,
  ]
  const forward = projectionToObject
  const backward = FinSetProductsWithTuple.tuple(
    object,
    [FinSet.terminal.terminate(object), FinSet.id(object)],
    productWitness.obj,
  )
  return {
    product: productWitness.obj,
    forward,
    backward,
    terminalProjection: projectionToTerminal,
  }
}

export interface FinSetExponentialTranspose {
  readonly rightExponential: ReturnType<typeof finSetExponential>
  readonly leftExponential: ReturnType<typeof finSetExponential>
  readonly toRight: (arrow: FinSetMor) => FinSetMor
  readonly toLeft: (arrow: FinSetMor) => FinSetMor
}

export const finsetExponentialTranspose = ({
  left,
  right,
  codomain,
}: {
  readonly left: FinSetObj
  readonly right: FinSetObj
  readonly codomain: FinSetObj
}): FinSetExponentialTranspose => {
  const rightExponential = finSetExponential(codomain, right)
  const leftExponential = finSetExponential(codomain, left)

  const toRight = (arrow: FinSetMor): FinSetMor => {
    if (arrow.from !== left) {
      throw new Error("finsetExponentialTranspose: expected arrow from the left object")
    }
    if (arrow.to !== rightExponential.object) {
      throw new Error("finsetExponentialTranspose: arrow must land in codomain^right")
    }
    const map = right.elements.map((_value, rightIx) => {
      const values = left.elements.map((_leftValue, leftIx) => {
        const functionIndex = arrow.map[leftIx]
        if (functionIndex === undefined) {
          throw new Error("finsetExponentialTranspose: arrow missing component mapping")
        }
        const functionValues = rightExponential.functionAt(functionIndex)
        const value = functionValues[rightIx]
        if (value === undefined) {
          throw new Error("finsetExponentialTranspose: function evaluation out of range")
        }
        return value
      })
      return leftExponential.indexOfFunction(values)
    })
    return { from: right, to: leftExponential.object, map }
  }

  const toLeft = (arrow: FinSetMor): FinSetMor => {
    if (arrow.from !== right) {
      throw new Error("finsetExponentialTranspose: expected arrow from the right object")
    }
    if (arrow.to !== leftExponential.object) {
      throw new Error("finsetExponentialTranspose: arrow must land in codomain^left")
    }
    const map = left.elements.map((_value, leftIx) => {
      const values = right.elements.map((_rightValue, rightIx) => {
        const functionIndex = arrow.map[rightIx]
        if (functionIndex === undefined) {
          throw new Error("finsetExponentialTranspose: arrow missing component mapping")
        }
        const functionValues = leftExponential.functionAt(functionIndex)
        const value = functionValues[leftIx]
        if (value === undefined) {
          throw new Error("finsetExponentialTranspose: function evaluation out of range")
        }
        return value
      })
      return rightExponential.indexOfFunction(values)
    })
    return { from: left, to: rightExponential.object, map }
  }

  return { rightExponential, leftExponential, toRight, toLeft }
}

export interface FinSetExponentialBaseIso {
  readonly source: ReturnType<typeof finSetExponential>
  readonly target: ReturnType<typeof finSetExponential>
  readonly forward: FinSetMor
  readonly backward: FinSetMor
}

export const finsetExpIsoFromBaseIso = ({
  codomain,
  left,
  right,
  forward,
  backward,
}: {
  readonly codomain: FinSetObj
  readonly left: FinSetObj
  readonly right: FinSetObj
  readonly forward: FinSetMor
  readonly backward: FinSetMor
}): FinSetExponentialBaseIso => {
  if (forward.from !== left || forward.to !== right) {
    throw new Error("finsetExpIsoFromBaseIso: forward base map must originate at the left exponent")
  }
  if (backward.from !== right || backward.to !== left) {
    throw new Error("finsetExpIsoFromBaseIso: backward base map must originate at the right exponent")
  }
  if (!arrowsEqual(FinSet.compose(backward, forward), FinSet.id(left))) {
    throw new Error("finsetExpIsoFromBaseIso: backward ∘ forward must be id on the left exponent")
  }
  if (!arrowsEqual(FinSet.compose(forward, backward), FinSet.id(right))) {
    throw new Error("finsetExpIsoFromBaseIso: forward ∘ backward must be id on the right exponent")
  }

  const source = finSetExponential(codomain, left)
  const target = finSetExponential(codomain, right)

  const forwardMap = source.object.elements.map((_value, idx) => {
    const values = source.functionAt(idx)
    const transported = right.elements.map((_value, rightIx) => {
      const leftIx = backward.map[rightIx]
      if (leftIx === undefined) {
        throw new Error("finsetExpIsoFromBaseIso: backward map missing image")
      }
      const value = values[leftIx]
      if (value === undefined) {
        throw new Error("finsetExpIsoFromBaseIso: source function outside domain")
      }
      return value
    })
    return target.indexOfFunction(transported)
  })

  const backwardMap = target.object.elements.map((_value, idx) => {
    const values = target.functionAt(idx)
    const transported = left.elements.map((_value, leftIx) => {
      const rightIx = forward.map[leftIx]
      if (rightIx === undefined) {
        throw new Error("finsetExpIsoFromBaseIso: forward map missing image")
      }
      const value = values[rightIx]
      if (value === undefined) {
        throw new Error("finsetExpIsoFromBaseIso: target function outside domain")
      }
      return value
    })
    return source.indexOfFunction(transported)
  })

  return {
    source,
    target,
    forward: { from: source.object, to: target.object, map: forwardMap },
    backward: { from: target.object, to: source.object, map: backwardMap },
  }
}

export interface FinSetCurryingProductIso {
  readonly inner: ReturnType<typeof finSetExponential>
  readonly source: ReturnType<typeof finSetExponential>
  readonly target: ReturnType<typeof finSetExponential>
  readonly forward: FinSetMor
  readonly backward: FinSetMor
}

export const finsetCurryingProductIso = ({
  codomain,
  left,
  right,
}: {
  readonly codomain: FinSetObj
  readonly left: FinSetObj
  readonly right: FinSetObj
}): FinSetCurryingProductIso => {
  const inner = finSetExponential(codomain, right)
  const source = finSetExponential(inner.object, left)
  const product = FinSet.product([left, right])
  const productIndex = tupleIndex(product.obj)
  const target = finSetExponential(codomain, product.obj)

  const forwardMap = source.object.elements.map((_value, idx) => {
    const componentIndices = source.functionAt(idx)
    const outputs = product.obj.elements.map((tuple) => {
      const coords = tuple as ReadonlyArray<number>
      const leftIx = coords[0]
      const rightIx = coords[1]
      if (leftIx === undefined || rightIx === undefined) {
        throw new Error("finsetCurryingProductIso: product tuple must contain two coordinates")
      }
      const innerIndex = componentIndices[leftIx]
      if (innerIndex === undefined) {
        throw new Error("finsetCurryingProductIso: missing inner function index")
      }
      const innerValues = inner.functionAt(innerIndex)
      const value = innerValues[rightIx]
      if (value === undefined) {
        throw new Error("finsetCurryingProductIso: inner function evaluation out of range")
      }
      return value
    })
    return target.indexOfFunction(outputs)
  })

  const backwardMap = target.object.elements.map((_value, idx) => {
    const outputs = target.functionAt(idx)
    const componentIndices = left.elements.map((_value, leftIx) => {
      const values = right.elements.map((_value, rightIx) => {
        const key = JSON.stringify([leftIx, rightIx])
        const tupleIdx = productIndex.get(key)
        if (tupleIdx === undefined) {
          throw new Error("finsetCurryingProductIso: product tuple not found")
        }
        const value = outputs[tupleIdx]
        if (value === undefined) {
          throw new Error("finsetCurryingProductIso: exponential output missing tuple image")
        }
        return value
      })
      return inner.indexOfFunction(values)
    })
    return source.indexOfFunction(componentIndices)
  })

  return {
    inner,
    source,
    target,
    forward: { from: source.object, to: target.object, map: forwardMap },
    backward: { from: target.object, to: source.object, map: backwardMap },
  }
}

export interface FinSetProductExponentIso {
  readonly exponential: ReturnType<typeof finSetExponential>
  readonly factors: readonly [ReturnType<typeof finSetExponential>, ReturnType<typeof finSetExponential>]
  readonly forward: FinSetMor
  readonly backward: FinSetMor
  readonly projections: readonly [FinSetMor, FinSetMor]
}

export const finsetProductExponentIso = ({
  left,
  right,
  exponent,
}: {
  readonly left: FinSetObj
  readonly right: FinSetObj
  readonly exponent: FinSetObj
}): FinSetProductExponentIso => {
  const product = FinSet.product([left, right])
  const exponential = finSetExponential(product.obj, exponent)
  const leftFactor = finSetExponential(left, exponent)
  const rightFactor = finSetExponential(right, exponent)
  const factorProduct = FinSet.product([leftFactor.object, rightFactor.object])
  const factorIndex = tupleIndex(factorProduct.obj)
  const productTuples = product.obj.elements as ReadonlyArray<ReadonlyArray<number>>

  const forwardMap = exponential.object.elements.map((_value, idx) => {
    const outputs = exponential.functionAt(idx)
    const leftValues = outputs.map((output) => {
      const tuple = productTuples[output]
      if (!tuple) {
        throw new Error("finsetProductExponentIso: exponential output outside carrier")
      }
      const leftIx = tuple[0]
      if (leftIx === undefined) {
        throw new Error("finsetProductExponentIso: product tuple missing left coordinate")
      }
      return leftIx
    })
    const rightValues = outputs.map((output) => {
      const tuple = productTuples[output]
      if (!tuple) {
        throw new Error("finsetProductExponentIso: exponential output outside carrier")
      }
      const rightIx = tuple[1]
      if (rightIx === undefined) {
        throw new Error("finsetProductExponentIso: product tuple missing right coordinate")
      }
      return rightIx
    })
    const leftIndex = leftFactor.indexOfFunction(leftValues)
    const rightIndex = rightFactor.indexOfFunction(rightValues)
    const key = JSON.stringify([leftIndex, rightIndex])
    const target = factorIndex.get(key)
    if (target === undefined) {
      throw new Error("finsetProductExponentIso: factor tuple not present in product carrier")
    }
    return target
  })

  const productIndex = tupleIndex(product.obj)

  const backwardMap = factorProduct.obj.elements.map((tuple) => {
    const coords = tuple as ReadonlyArray<number>
    const leftIdx = coords[0]
    const rightIdx = coords[1]
    if (leftIdx === undefined || rightIdx === undefined) {
      throw new Error("finsetProductExponentIso: factor tuple must be binary")
    }
    const leftValues = leftFactor.functionAt(leftIdx)
    const rightValues = rightFactor.functionAt(rightIdx)
    const outputs = exponent.elements.map((_value, expIx) => {
      const leftValue = leftValues[expIx]
      const rightValue = rightValues[expIx]
      if (leftValue === undefined || rightValue === undefined) {
        throw new Error("finsetProductExponentIso: component function outside domain")
      }
      const key = JSON.stringify([leftValue, rightValue])
      const target = productIndex.get(key)
      if (target === undefined) {
        throw new Error("finsetProductExponentIso: product tuple missing from carrier")
      }
      return target
    })
    return exponential.indexOfFunction(outputs)
  })

  return {
    exponential,
    factors: [leftFactor, rightFactor],
    forward: { from: exponential.object, to: factorProduct.obj, map: forwardMap },
    backward: { from: factorProduct.obj, to: exponential.object, map: backwardMap },
    projections: factorProduct.projections as readonly [FinSetMor, FinSetMor],
  }
}

export interface FinSetNamedArrow {
  readonly name: FinSetMor
  readonly evaluationMediator: FinSetMor
}

export interface FinSetPullbackWitness {
  readonly object: FinSetObj
  readonly inclusionIntoLeft: FinSetMor
  readonly inclusionIntoRight: FinSetMor
  readonly toCodomain: FinSetMor
  readonly factorCone: (input: {
    readonly object: FinSetObj
    readonly intoLeft: FinSetMor
    readonly intoRight: FinSetMor
  }) => FinSetMor
}

export const finsetPullback = (left: FinSetMor, right: FinSetMor): FinSetPullbackWitness => {
  if (left.to !== right.to) {
    throw new Error('finsetPullback: arrows must share a codomain')
  }
  const codomain = left.to
  const leftImage = new Map<number, number>()
  left.map.forEach((value, index) => {
    if (value !== undefined && !leftImage.has(value)) leftImage.set(value, index)
  })
  const rightImage = new Map<number, number>()
  right.map.forEach((value, index) => {
    if (value !== undefined && !rightImage.has(value)) rightImage.set(value, index)
  })

  const intersectionIndices: number[] = []
  for (const [value] of leftImage) {
    if (rightImage.has(value)) intersectionIndices.push(value)
  }

  const object: FinSetObj = { elements: intersectionIndices.map((idx) => codomain.elements[idx]!) }
  const inclusionIntoLeft: FinSetMor = {
    from: object,
    to: left.from,
    map: intersectionIndices.map((idx) => {
      const position = leftImage.get(idx)
      if (position === undefined) {
        throw new Error('finsetPullback: missing preimage in left inclusion')
      }
      return position
    }),
  }
  const inclusionIntoRight: FinSetMor = {
    from: object,
    to: right.from,
    map: intersectionIndices.map((idx) => {
      const position = rightImage.get(idx)
      if (position === undefined) {
        throw new Error('finsetPullback: missing preimage in right inclusion')
      }
      return position
    }),
  }
  const toCodomain: FinSetMor = {
    from: object,
    to: codomain,
    map: intersectionIndices.slice(),
  }

  const factorCone = ({ object: W, intoLeft, intoRight }: {
    readonly object: FinSetObj
    readonly intoLeft: FinSetMor
    readonly intoRight: FinSetMor
  }): FinSetMor => {
    if (intoLeft.from !== W || intoRight.from !== W) {
      throw new Error('finsetPullback: cone tip mismatch')
    }
    if (intoLeft.to !== left.from) {
      throw new Error('finsetPullback: left leg codomain mismatch')
    }
    if (intoRight.to !== right.from) {
      throw new Error('finsetPullback: right leg codomain mismatch')
    }
    const leftComposite = FinSet.compose(left, intoLeft)
    const rightComposite = FinSet.compose(right, intoRight)
    if (!arrowsEqual(leftComposite, rightComposite)) {
      throw new Error('finsetPullback: cone must commute with the inclusions')
    }

    const map = W.elements.map((_value, idx) => {
      const codomainIndex = leftComposite.map[idx]
      if (codomainIndex === undefined) {
        throw new Error('finsetPullback: cone legs must provide codomain images')
      }
      const position = intersectionIndices.indexOf(codomainIndex)
      if (position < 0) {
        throw new Error('finsetPullback: cone lands outside the intersection')
      }
      return position
    })

    return { from: W, to: object, map }
  }

  return { object, inclusionIntoLeft, inclusionIntoRight, toCodomain, factorCone }
}

export const finsetNameFromArrow = ({
  domain,
  codomain,
  arrow,
}: {
  readonly domain: FinSetObj
  readonly codomain: FinSetObj
  readonly arrow: FinSetMor
}): FinSetNamedArrow => {
  if (arrow.from !== domain) {
    throw new Error("finsetNameFromArrow: arrow domain mismatch")
  }
  if (arrow.to !== codomain) {
    throw new Error("finsetNameFromArrow: arrow codomain mismatch")
  }
  if (arrow.map.length !== domain.elements.length) {
    throw new Error("finsetNameFromArrow: arrow must supply an image for every domain element")
  }
  arrow.map.forEach((value) => {
    if (value === undefined || value < 0 || value >= codomain.elements.length) {
      throw new Error("finsetNameFromArrow: arrow images must reference codomain elements")
    }
  })

  const exponential = finSetExponential(codomain, domain)
  const functionValues = domain.elements.map((_value, idx) => arrow.map[idx]!)
  const functionIndex = exponential.indexOfFunction(functionValues)

  const name: FinSetMor = { from: FinSet.terminalObj, to: exponential.object, map: [functionIndex] }

  const product1A = FinSet.product([FinSet.terminalObj, domain])
  const productIndex = tupleIndex(exponential.product)

  const evaluationMediator: FinSetMor = {
    from: product1A.obj,
    to: exponential.product,
    map: product1A.obj.elements.map((tuple) => {
      const coords = tuple as ReadonlyArray<number>
      const domainIx = coords[1]
      if (domainIx === undefined) {
        throw new Error("finsetNameFromArrow: expected terminal/domain tuple")
      }
      const key = JSON.stringify([functionIndex, domainIx])
      const target = productIndex.get(key)
      if (target === undefined) {
        throw new Error("finsetNameFromArrow: mediator tuple not present in exponential product")
      }
      return target
    }),
  }

  return { name, evaluationMediator }
}

export const finsetArrowFromName = ({
  domain,
  codomain,
  name,
}: {
  readonly domain: FinSetObj
  readonly codomain: FinSetObj
  readonly name: FinSetMor
}): FinSetMor => {
  if (name.from !== FinSet.terminalObj) {
    throw new Error("finsetArrowFromName: name must originate at the terminal object")
  }
  const { metadata, functionAt } = buildExistingExponential(name.to)
  if (metadata.base !== domain) {
    throw new Error("finsetArrowFromName: name must land in the exponential with the expected base object")
  }
  if (metadata.codomain !== codomain) {
    throw new Error("finsetArrowFromName: name must land in the exponential with the expected codomain")
  }
  const index = name.map[0]
  if (index === undefined) {
    throw new Error("finsetArrowFromName: missing function index for the name")
  }
  const values = functionAt(index)
  if (values.length !== domain.elements.length) {
    throw new Error("finsetArrowFromName: named function does not match the domain size")
  }
  values.forEach((value) => {
    if (value === undefined || value < 0 || value >= codomain.elements.length) {
      throw new Error("finsetArrowFromName: named function references out-of-range codomain elements")
    }
  })
  return { from: domain, to: codomain, map: values.slice() }
}

export const finsetPointElement = (object: FinSetObj, elementIndex: number): FinSetMor => {
  if (elementIndex < 0 || elementIndex >= object.elements.length) {
    throw new Error("finsetPointElement: elementIndex out of range for the provided object")
  }
  return { from: FinSet.terminalObj, to: object, map: [elementIndex] }
}

export const finsetPointFromArrow = (object: FinSetObj, arrow: FinSetMor): number => {
  if (arrow.from !== FinSet.terminalObj) {
    throw new Error("finsetPointFromArrow: arrow must originate at the terminal object")
  }
  if (arrow.to !== object) {
    throw new Error("finsetPointFromArrow: arrow codomain must match the provided object")
  }
  const [index] = arrow.map
  if (index === undefined) {
    throw new Error("finsetPointFromArrow: arrow must map the unique terminal element")
  }
  if (index < 0 || index >= object.elements.length) {
    throw new Error("finsetPointFromArrow: arrow references an out-of-range element")
  }
  return index
}

export interface FinSetPointSurjectivityWitness {
  readonly base: FinSetObj
  readonly exponent: FinSetObj
  readonly pointPreimages: Map<number, number>
}

export interface FinSetPointSurjectivityResult {
  readonly holds: boolean
  readonly witness?: FinSetPointSurjectivityWitness
  readonly missingPoints?: ReadonlyArray<number>
}

export const finsetPointSurjective = (g: FinSetMor): FinSetPointSurjectivityResult => {
  const { metadata } = buildExistingExponential(g.to)
  if (g.from !== metadata.base) {
    throw new Error("finsetPointSurjective: arrow domain mismatch")
  }

  const pointPreimages = new Map<number, number>()
  g.map.forEach((funcIndex, domainIx) => {
    if (funcIndex === undefined) return
    if (!pointPreimages.has(funcIndex)) {
      pointPreimages.set(funcIndex, domainIx)
    }
  })

  const missing: number[] = []
  for (let idx = 0; idx < g.to.elements.length; idx++) {
    if (!pointPreimages.has(idx)) missing.push(idx)
  }

  if (missing.length === 0) {
    return { holds: true, witness: { base: metadata.codomain, exponent: metadata.base, pointPreimages } }
  }
  return { holds: false, missingPoints: missing }
}

export interface FinSetLawvereFixedPointWitness {
  readonly elementIndex: number
  readonly fixedPoint: FinSetMor
  readonly fixedPointElement: unknown
  readonly preimagePoint: FinSetMor
  readonly diagonalName: FinSetMor
}

export const finsetLawvereFixedPoint = (g: FinSetMor, j: FinSetMor): FinSetLawvereFixedPointWitness => {
  const { metadata, functionAt, indexOfFunction } = buildExistingExponential(g.to)
  if (g.from !== metadata.base) {
    throw new Error("finsetLawvereFixedPoint: witness arrow must originate at the exponent object")
  }
  if (j.from !== metadata.codomain || j.to !== metadata.codomain) {
    throw new Error("finsetLawvereFixedPoint: endomorphism must operate on the codomain object")
  }

  const surjectivity = finsetPointSurjective(g)
  if (!surjectivity.holds || !surjectivity.witness) {
    throw new Error("finsetLawvereFixedPoint: g must be point-surjective")
  }

  const phiValues = metadata.base.elements.map((_value, aIx) => {
    const functionIndex = g.map[aIx]
    if (functionIndex === undefined) {
      throw new Error("finsetLawvereFixedPoint: witness arrow missing function index")
    }
    const functionValues = functionAt(functionIndex)
    const value = functionValues[aIx]
    if (value === undefined) {
      throw new Error("finsetLawvereFixedPoint: witness function evaluation out of range")
    }
    const image = j.map[value]
    if (image === undefined) {
      throw new Error("finsetLawvereFixedPoint: endomorphism missing image for element")
    }
    return image
  })

  const phiIndex = indexOfFunction(phiValues)
  const preimageIndex = surjectivity.witness.pointPreimages.get(phiIndex)
  if (preimageIndex === undefined) {
    throw new Error("finsetLawvereFixedPoint: diagonal function lacks a recorded preimage")
  }

  const diagonalValues = functionAt(phiIndex)
  const fixedValue = diagonalValues[preimageIndex]
  if (fixedValue === undefined) {
    throw new Error("finsetLawvereFixedPoint: diagonal evaluation out of range")
  }

  const fixedPoint: FinSetMor = { from: FinSet.terminalObj, to: metadata.codomain, map: [fixedValue] }
  const preimagePoint: FinSetMor = { from: FinSet.terminalObj, to: metadata.base, map: [preimageIndex] }
  const diagonalName: FinSetMor = { from: FinSet.terminalObj, to: g.to, map: [phiIndex] }
  const fixedPointElement = metadata.codomain.elements[fixedValue]

  return { elementIndex: fixedValue, fixedPoint, fixedPointElement, preimagePoint, diagonalName }
}
