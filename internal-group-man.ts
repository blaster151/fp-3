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

interface ProductPoint<Left, Right> {
  readonly left: Left
  readonly right: Right
}

export interface SmoothObject<Point> {
  readonly carrier: ReadonlyArray<Point>
  readonly eq: Eq<Point>
}

export interface SmoothMap<Domain, Codomain> {
  readonly source: SmoothObject<Domain>
  readonly target: SmoothObject<Codomain>
  readonly eqSource: Eq<Domain>
  readonly eqTarget: Eq<Codomain>
  readonly map: (value: Domain) => Codomain
}

export interface SmoothnessWitness<Point> {
  readonly certifyBinary: (map: (left: Point, right: Point) => Point) => boolean
  readonly certifyUnary: (map: (value: Point) => Point) => boolean
  readonly certifyConstant: (value: Point) => boolean
}

const contains = <Point>(carrier: ReadonlyArray<Point>, eq: Eq<Point>) =>
  (candidate: Point): boolean => carrier.some((value) => eq(value, candidate))

const equalSmoothMaps = (
  left: SmoothMap<any, any>,
  right: SmoothMap<any, any>,
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

const composeSmoothMaps = (
  g: SmoothMap<any, any>,
  f: SmoothMap<any, any>,
): SmoothMap<any, any> => {
  if (f.target !== g.source) {
    throw new Error('composeSmoothMaps: codomain/domain mismatch')
  }

  return {
    source: f.source,
    target: g.target,
    eqSource: f.eqSource,
    eqTarget: g.eqTarget,
    map: (value) => g.map(f.map(value)),
  }
}

const identitySmoothMap = (object: SmoothObject<any>): SmoothMap<any, any> => ({
  source: object,
  target: object,
  eqSource: object.eq,
  eqTarget: object.eq,
  map: (value) => value,
})

const makeCategoryOps = (): CategoryOps<SmoothObject<any>, SmoothMap<any, any>> => ({
  compose: composeSmoothMaps,
  eq: equalSmoothMaps,
  id: identitySmoothMap,
})

const makeTerminal = (): TerminalWitness<SmoothObject<any>, SmoothMap<any, any>> => {
  const carrier = ['⋆'] as const
  const object: SmoothObject<string> = {
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
  readonly left: SmoothObject<Left>
  readonly right: SmoothObject<Right>
}): {
  readonly object: SmoothObject<ProductPoint<Left, Right>>
  readonly tuple: BinaryProductTuple<SmoothObject<any>, SmoothMap<any, any>>
} => {
  const { left, right } = input
  const carrier = productCarrier(left.carrier, right.carrier)
  const eq: Eq<ProductPoint<Left, Right>> = (a, b) =>
    left.eq(a.left, b.left) && right.eq(a.right, b.right)

  const object: SmoothObject<ProductPoint<Left, Right>> = {
    carrier,
    eq,
  }

  const tuple: BinaryProductTuple<SmoothObject<any>, SmoothMap<any, any>> = {
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

export interface ManInternalGroupInput<Point> {
  readonly carrier: ReadonlyArray<Point>
  readonly eq: Eq<Point>
  readonly multiply: (left: Point, right: Point) => Point
  readonly inverse: (value: Point) => Point
  readonly unit: Point
  readonly smoothness: SmoothnessWitness<Point>
}

export interface ManInternalGroupWitness<Point> {
  readonly object: SmoothObject<Point>
  readonly category: CategoryOps<SmoothObject<any>, SmoothMap<any, any>>
  readonly witness: InternalGroupWitness<SmoothObject<any>, SmoothMap<any, any>>
}

type ManInternalGroupAnalysisContext<Point> =
  InternalGroupAnalysis<SmoothObject<any>, SmoothMap<any, any>>['context'] & {
    readonly object: SmoothObject<Point>
  }

export type ManInternalGroupAnalysis<Point> = InternalGroupAnalysis<
  SmoothObject<any>,
  SmoothMap<any, any>
> & {
  readonly context: ManInternalGroupAnalysisContext<Point>
}

export const makeManInternalGroupWitness = <Point>(
  input: ManInternalGroupInput<Point>,
): ManInternalGroupWitness<Point> => {
  const { carrier, eq, multiply, inverse, unit, smoothness } = input
  const inCarrier = contains(carrier, eq)

  if (!inCarrier(unit)) {
    throw new Error('makeManInternalGroupWitness: unit must lie in the carrier')
  }

  for (const element of carrier) {
    if (!inCarrier(inverse(element))) {
      throw new Error('makeManInternalGroupWitness: inverse must stay in the carrier')
    }
  }

  for (const a of carrier) {
    for (const b of carrier) {
      if (!inCarrier(multiply(a, b))) {
        throw new Error('makeManInternalGroupWitness: multiplication must close over the carrier')
      }
    }
  }

  if (!smoothness.certifyBinary(multiply)) {
    throw new Error('makeManInternalGroupWitness: multiplication must be smooth')
  }

  if (!smoothness.certifyUnary(inverse)) {
    throw new Error('makeManInternalGroupWitness: inverse must be smooth')
  }

  if (!smoothness.certifyConstant(unit)) {
    throw new Error('makeManInternalGroupWitness: unit must define a smooth point')
  }

  const object: SmoothObject<Point> = { carrier, eq }
  const category = makeCategoryOps()

  const product = makeBinaryProduct({ left: object, right: object })
  const productLeft = makeBinaryProduct({ left: product.object, right: object })
  const productRight = makeBinaryProduct({ left: object, right: product.object })

  const multiplication: SmoothMap<any, any> = {
    source: product.object,
    target: object,
    eqSource: product.object.eq,
    eqTarget: object.eq,
    map: (value) => multiply(value.left, value.right),
  }

  const inverseArrow: SmoothMap<any, any> = {
    source: object,
    target: object,
    eqSource: object.eq,
    eqTarget: object.eq,
    map: inverse,
  }

  const terminal = makeTerminal()

  const unitArrow: SmoothMap<any, any> = {
    source: terminal.object,
    target: object,
    eqSource: terminal.object.eq,
    eqTarget: object.eq,
    map: () => unit,
  }

  const witness: InternalGroupWitness<SmoothObject<any>, SmoothMap<any, any>> = {
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

export interface ManInternalMonoidInput<Point> {
  readonly carrier: ReadonlyArray<Point>
  readonly eq: Eq<Point>
  readonly multiply: (left: Point, right: Point) => Point
  readonly unit: Point
  readonly smoothness: SmoothnessWitness<Point>
}

export interface ManInternalMonoidWitness<Point> {
  readonly object: SmoothObject<Point>
  readonly category: CategoryOps<SmoothObject<any>, SmoothMap<any, any>>
  readonly witness: InternalMonoidWitness<SmoothObject<any>, SmoothMap<any, any>>
}

type ManInternalMonoidAnalysisContext<Point> =
  InternalMonoidAnalysis<SmoothObject<any>, SmoothMap<any, any>>['context'] & {
    readonly object: SmoothObject<Point>
  }

export type ManInternalMonoidAnalysis<Point> = InternalMonoidAnalysis<
  SmoothObject<any>,
  SmoothMap<any, any>
> & {
  readonly context: ManInternalMonoidAnalysisContext<Point>
}

export const makeManInternalMonoidWitness = <Point>(
  input: ManInternalMonoidInput<Point>,
): ManInternalMonoidWitness<Point> => {
  const { carrier, eq, multiply, unit, smoothness } = input
  const inCarrier = contains(carrier, eq)
  if (!inCarrier(unit)) {
    throw new Error('makeManInternalMonoidWitness: unit must lie in the carrier')
  }

  for (const a of carrier) {
    for (const b of carrier) {
      if (!inCarrier(multiply(a, b))) {
        throw new Error('makeManInternalMonoidWitness: multiplication must close over the carrier')
      }
    }
  }

  if (!smoothness.certifyBinary(multiply)) {
    throw new Error('makeManInternalMonoidWitness: multiplication must be smooth')
  }

  if (!smoothness.certifyConstant(unit)) {
    throw new Error('makeManInternalMonoidWitness: unit must define a smooth point')
  }

  const object: SmoothObject<Point> = { carrier, eq }
  const category = makeCategoryOps()

  const product = makeBinaryProduct({ left: object, right: object })
  const productLeft = makeBinaryProduct({ left: product.object, right: object })
  const productRight = makeBinaryProduct({ left: object, right: product.object })

  const multiplication: SmoothMap<any, any> = {
    source: product.object,
    target: object,
    eqSource: product.object.eq,
    eqTarget: eq,
    map: (value: ProductPoint<Point, Point>) => multiply(value.left, value.right),
  }

  const terminal = makeTerminal()
  const unitArrow: SmoothMap<any, any> = {
    source: terminal.object,
    target: object,
    eqSource: terminal.object.eq,
    eqTarget: eq,
    map: () => unit,
  }

  const witness: InternalMonoidWitness<SmoothObject<any>, SmoothMap<any, any>> = {
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

export const analyzeManInternalGroup = <Point>(
  input: ManInternalGroupWitness<Point>,
): ManInternalGroupAnalysis<Point> => {
  const analysis = analyzeInternalGroup(input)
  const { category, witness } = analysis.context
  const context: ManInternalGroupAnalysisContext<Point> = {
    category,
    witness,
    object: input.object,
  }

  return { ...analysis, context }
}

export const analyzeManInternalMonoid = <Point>(
  input: ManInternalMonoidWitness<Point>,
): ManInternalMonoidAnalysis<Point> => {
  const analysis = analyzeInternalMonoid(input)
  const { category, witness } = analysis.context
  const context: ManInternalMonoidAnalysisContext<Point> = {
    category,
    witness,
    object: input.object,
  }

  return { ...analysis, context }
}
