import type { BinaryProductTuple } from './category-limits-helpers'
import {
  analyzeInternalGroup,
  enrichInternalGroupDiagonal,
  type CategoryOps,
  type InternalGroupAnalysis,
  type InternalGroupWitness,
  type TerminalWitness,
} from './internal-group'
import {
  analyzeInternalMonoid,
  enrichInternalMonoidDiagonal,
  type InternalMonoidAnalysis,
  type InternalMonoidWitness,
} from './internal-monoid'

type Eq<X> = (left: X, right: X) => boolean

export interface SetObject<Point> {
  readonly carrier: ReadonlyArray<Point>
  readonly eq: Eq<Point>
}

export interface SetMap<Domain, Codomain> {
  readonly source: SetObject<Domain>
  readonly target: SetObject<Codomain>
  readonly eqSource: Eq<Domain>
  readonly eqTarget: Eq<Codomain>
  readonly map: (value: Domain) => Codomain
}

interface ProductPoint<Left, Right> {
  readonly left: Left
  readonly right: Right
}

const contains = <Point>(carrier: ReadonlyArray<Point>, eq: Eq<Point>) =>
  (candidate: Point): boolean => carrier.some((value) => eq(value, candidate))

const equalSetMaps = (
  left: SetMap<any, any>,
  right: SetMap<any, any>,
): boolean => {
  if (left.source !== right.source) {
    return false
  }
  if (left.target !== right.target) {
    return false
  }
  if (left.eqSource !== right.eqSource || left.eqTarget !== right.eqTarget) {
    return false
  }

  return left.source.carrier.every((value) =>
    left.eqTarget(left.map(value), right.map(value)),
  )
}

const composeSetMaps = (
  g: SetMap<any, any>,
  f: SetMap<any, any>,
): SetMap<any, any> => {
  if (f.target !== g.source) {
    throw new Error('composeSetMaps: codomain/domain mismatch')
  }

  return {
    source: f.source,
    target: g.target,
    eqSource: f.eqSource,
    eqTarget: g.eqTarget,
    map: (value) => g.map(f.map(value)),
  }
}

const identitySetMap = (object: SetObject<any>): SetMap<any, any> => ({
  source: object,
  target: object,
  eqSource: object.eq,
  eqTarget: object.eq,
  map: (value) => value,
})

const makeCategoryOps = (): CategoryOps<SetObject<any>, SetMap<any, any>> => ({
  compose: composeSetMaps,
  eq: equalSetMaps,
  id: identitySetMap,
})

const makeTerminal = (): TerminalWitness<SetObject<any>, SetMap<any, any>> => {
  const carrier = ['⋆'] as const
  const object: SetObject<string> = {
    carrier,
    eq: (left, right) => left === right,
  }

  return {
    object,
    terminate: (domain) => ({
      source: domain,
      target: object,
      eqSource: domain.eq,
      eqTarget: object.eq,
      map: () => carrier[0],
    }),
  }
}

const productCarrier = <Left, Right>(
  left: ReadonlyArray<Left>,
  right: ReadonlyArray<Right>,
): ReadonlyArray<ProductPoint<Left, Right>> => {
  const result: ProductPoint<Left, Right>[] = []
  for (const l of left) {
    for (const r of right) {
      result.push({ left: l, right: r })
    }
  }
  return result
}

const makeBinaryProduct = <Left, Right>(input: {
  readonly left: SetObject<Left>
  readonly right: SetObject<Right>
}): {
  readonly object: SetObject<ProductPoint<Left, Right>>
  readonly tuple: BinaryProductTuple<SetObject<any>, SetMap<any, any>>
} => {
  const { left, right } = input
  const carrier = productCarrier(left.carrier, right.carrier)
  const eq: Eq<ProductPoint<Left, Right>> = (a, b) =>
    left.eq(a.left, b.left) && right.eq(a.right, b.right)

  const object: SetObject<ProductPoint<Left, Right>> = {
    carrier,
    eq,
  }

  const tuple: BinaryProductTuple<SetObject<any>, SetMap<any, any>> = {
    object,
    projections: [
      {
        source: object,
        target: left,
        eqSource: object.eq,
        eqTarget: left.eq,
        map: (value) => value.left,
      },
      {
        source: object,
        target: right,
        eqSource: object.eq,
        eqTarget: right.eq,
        map: (value) => value.right,
      },
    ],
    tuple: (domain, legs) => {
      if (legs.length !== 2) {
        throw new Error(
          `makeBinaryProduct: expected 2 legs, received ${legs.length}`,
        )
      }

      const [leftLeg, rightLeg] = legs
      if (leftLeg.source !== domain || rightLeg.source !== domain) {
        throw new Error('makeBinaryProduct: legs must share the supplied domain')
      }

      return {
        source: domain,
        target: object,
        eqSource: domain.eq,
        eqTarget: object.eq,
        map: (value) => ({ left: leftLeg.map(value), right: rightLeg.map(value) }),
      }
    },
  }

  return { object, tuple }
}

export interface SetInternalGroupInput<Point> {
  readonly carrier: ReadonlyArray<Point>
  readonly eq: Eq<Point>
  readonly multiply: (left: Point, right: Point) => Point
  readonly inverse: (value: Point) => Point
  readonly unit: Point
}

export interface SetInternalGroupWitness<Point> {
  readonly object: SetObject<Point>
  readonly category: CategoryOps<SetObject<any>, SetMap<any, any>>
  readonly witness: InternalGroupWitness<SetObject<any>, SetMap<any, any>>
}

export interface SetInternalMonoidInput<Point> {
  readonly carrier: ReadonlyArray<Point>
  readonly eq: Eq<Point>
  readonly multiply: (left: Point, right: Point) => Point
  readonly unit: Point
}

export interface SetInternalMonoidWitness<Point> {
  readonly object: SetObject<Point>
  readonly category: CategoryOps<SetObject<any>, SetMap<any, any>>
  readonly witness: InternalMonoidWitness<SetObject<any>, SetMap<any, any>>
}

type SetInternalGroupAnalysisContext<Point> =
  InternalGroupAnalysis<SetObject<any>, SetMap<any, any>>['context'] & {
    readonly object: SetObject<Point>
    readonly eq: Eq<Point>
  }

export type SetInternalGroupAnalysis<Point> = InternalGroupAnalysis<
  SetObject<any>,
  SetMap<any, any>
> & {
  readonly context: SetInternalGroupAnalysisContext<Point>
}

type SetInternalMonoidAnalysisContext<Point> =
  InternalMonoidAnalysis<SetObject<any>, SetMap<any, any>>['context'] & {
    readonly object: SetObject<Point>
    readonly eq: Eq<Point>
  }

export type SetInternalMonoidAnalysis<Point> = InternalMonoidAnalysis<
  SetObject<any>,
  SetMap<any, any>
> & {
  readonly context: SetInternalMonoidAnalysisContext<Point>
}

export const makeSetInternalGroupWitness = <Point>(
  input: SetInternalGroupInput<Point>,
): SetInternalGroupWitness<Point> => {
  const { carrier, eq, multiply, inverse, unit } = input
  const inCarrier = contains(carrier, eq)

  if (!inCarrier(unit)) {
    throw new Error('makeSetInternalGroupWitness: unit must lie in the carrier')
  }

  for (const element of carrier) {
    if (!inCarrier(inverse(element))) {
      throw new Error('makeSetInternalGroupWitness: inverse must stay in the carrier')
    }
  }

  for (const a of carrier) {
    for (const b of carrier) {
      if (!inCarrier(multiply(a, b))) {
        throw new Error('makeSetInternalGroupWitness: multiplication must close over the carrier')
      }
    }
  }

  const object: SetObject<Point> = { carrier, eq }
  const category = makeCategoryOps()

  const product = makeBinaryProduct({ left: object, right: object })
  const productLeft = makeBinaryProduct({ left: product.object, right: object })
  const productRight = makeBinaryProduct({ left: object, right: product.object })

  const multiplication: SetMap<any, any> = {
    source: product.object,
    target: object,
    eqSource: product.object.eq,
    eqTarget: object.eq,
    map: (value) => multiply(value.left, value.right),
  }

  const inverseArrow: SetMap<any, any> = {
    source: object,
    target: object,
    eqSource: object.eq,
    eqTarget: object.eq,
    map: inverse,
  }

  const terminal = makeTerminal()

  const unitArrow: SetMap<any, any> = {
    source: terminal.object,
    target: object,
    eqSource: terminal.object.eq,
    eqTarget: object.eq,
    map: () => unit,
  }

  const witness: InternalGroupWitness<SetObject<any>, SetMap<any, any>> = {
    object,
    product: product.tuple,
    multiplication,
    unit: {
      terminal,
      arrow: unitArrow,
    },
    inverse: inverseArrow,
    productLeft: productLeft.tuple,
    productRight: productRight.tuple,
    diagonal: enrichInternalGroupDiagonal(category, product.tuple, {
      object,
      identity: category.id(object),
    }),
  }

  return { object, category, witness }
}

export const makeSetInternalMonoidWitness = <Point>(
  input: SetInternalMonoidInput<Point>,
): SetInternalMonoidWitness<Point> => {
  const { carrier, eq, multiply, unit } = input
  const inCarrier = contains(carrier, eq)

  if (!inCarrier(unit)) {
    throw new Error('makeSetInternalMonoidWitness: unit must lie in the carrier')
  }

  for (const a of carrier) {
    for (const b of carrier) {
      if (!inCarrier(multiply(a, b))) {
        throw new Error('makeSetInternalMonoidWitness: multiplication must close over the carrier')
      }
    }
  }

  const object: SetObject<Point> = { carrier, eq }
  const category = makeCategoryOps()

  const product = makeBinaryProduct({ left: object, right: object })
  const productLeft = makeBinaryProduct({ left: product.object, right: object })
  const productRight = makeBinaryProduct({ left: object, right: product.object })

  const multiplication: SetMap<any, any> = {
    source: product.object,
    target: object,
    eqSource: product.object.eq,
    eqTarget: object.eq,
    map: (value) => multiply(value.left, value.right),
  }

  const terminal = makeTerminal()

  const unitArrow: SetMap<any, any> = {
    source: terminal.object,
    target: object,
    eqSource: terminal.object.eq,
    eqTarget: object.eq,
    map: () => unit,
  }

  const witness: InternalMonoidWitness<SetObject<any>, SetMap<any, any>> = {
    object,
    product: product.tuple,
    multiplication,
    unit: {
      terminal,
      arrow: unitArrow,
    },
    productLeft: productLeft.tuple,
    productRight: productRight.tuple,
    diagonal: enrichInternalMonoidDiagonal(category, product.tuple, {
      object,
      identity: category.id(object),
    }),
  }

  return { object, category, witness }
}

export const analyzeSetInternalGroup = <Point>(
  input: SetInternalGroupWitness<Point>,
): SetInternalGroupAnalysis<Point> => {
  const analysis = analyzeInternalGroup(input)
  const { category, witness } = analysis.context
  const context: SetInternalGroupAnalysisContext<Point> = {
    category,
    witness,
    object: input.object,
    eq: input.object.eq,
  }

  return { ...analysis, context }
}

export const analyzeSetInternalMonoid = <Point>(
  input: SetInternalMonoidWitness<Point>,
): SetInternalMonoidAnalysis<Point> => {
  const analysis = analyzeInternalMonoid(input)
  const { category, witness } = analysis.context
  const context: SetInternalMonoidAnalysisContext<Point> = {
    category,
    witness,
    object: input.object,
    eq: input.object.eq,
  }

  return { ...analysis, context }
}
