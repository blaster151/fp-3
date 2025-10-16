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
import {
  compose as composeContinuous,
  identity as identityContinuous,
  makeContinuousMap,
  pairing,
  productStructure,
  type ContinuousMap,
  type ProductPoint,
} from './src/top/ContinuousMap'
import type { Top } from './src/top/Topology'

export type Eq<X> = (a: X, b: X) => boolean

export interface TopObject<Point> {
  readonly topology: Top<Point>
  readonly eq: Eq<Point>
}

const contains = <Point>(carrier: ReadonlyArray<Point>, eq: Eq<Point>) =>
  (value: Point): boolean => carrier.some((candidate) => eq(candidate, value))

const equalContinuousMaps = (
  left: ContinuousMap<any, any>,
  right: ContinuousMap<any, any>,
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
  const carrier = left.source.carrier
  return carrier.every((value) => left.eqTarget(left.map(value), right.map(value)))
}

const composeAny = (
  g: ContinuousMap<any, any>,
  f: ContinuousMap<any, any>,
): ContinuousMap<any, any> => composeContinuous(g, f)

const identityAny = (object: TopObject<any>): ContinuousMap<any, any> =>
  identityContinuous(object.eq, object.topology)

const makeCategoryOps = (): CategoryOps<TopObject<any>, ContinuousMap<any, any>> => ({
  compose: composeAny,
  eq: equalContinuousMaps,
  id: identityAny,
})

const makeTerminal = (): TerminalWitness<TopObject<any>, ContinuousMap<any, any>> => {
  const terminalPoint = '⋆'
  const topology: Top<string> = { carrier: [terminalPoint], opens: [[], [terminalPoint]] }
  const object: TopObject<string> = {
    topology,
    eq: (left, right) => left === right,
  }

  return {
    object,
    terminate: (domain) =>
      makeContinuousMap({
        source: domain.topology,
        target: topology,
        eqSource: domain.eq,
        eqTarget: object.eq,
        map: () => terminalPoint,
      }),
  }
}

const makeBinaryProduct = <Left, Right>(input: {
  readonly left: TopObject<Left>
  readonly right: TopObject<Right>
}): {
  readonly object: TopObject<ProductPoint<Left, Right>>
  readonly tuple: BinaryProductTuple<TopObject<any>, ContinuousMap<any, any>>
} => {
  const { left, right } = input
  const structure = productStructure(left.eq, right.eq, left.topology, right.topology)
  const object: TopObject<ProductPoint<Left, Right>> = {
    topology: structure.topology,
    eq: structure.eq,
  }

  const tuple: BinaryProductTuple<TopObject<any>, ContinuousMap<any, any>> = {
    object,
    projections: [structure.proj1, structure.proj2],
    tuple: (domain, legs) => {
      if (legs.length !== 2) {
        throw new Error(
          `makeBinaryProduct: expected 2 legs for a binary product, received ${legs.length}`,
        )
      }
      const [leftLeg, rightLeg] = legs as readonly [ContinuousMap<any, any>, ContinuousMap<any, any>]
      if (leftLeg.source !== domain.topology || rightLeg.source !== domain.topology) {
        throw new Error('makeBinaryProduct: leg sources must match the supplied domain topology')
      }
      if (leftLeg.eqSource !== domain.eq || rightLeg.eqSource !== domain.eq) {
        throw new Error('makeBinaryProduct: leg equality witnesses must match the domain')
      }
      return pairing(leftLeg, rightLeg, { topology: structure.topology, eq: structure.eq })
    },
  }

  return { object, tuple }
}

const ensureContinuousMap = <Source, Target>(build: () => ContinuousMap<Source, Target>, message: string): ContinuousMap<Source, Target> => {
  try {
    return build()
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    throw new Error(`${message} (${details})`)
  }
}

export interface TopInternalGroupInput<Point> {
  readonly topology: Top<Point>
  readonly eq: Eq<Point>
  readonly multiply: (left: Point, right: Point) => Point
  readonly inverse: (value: Point) => Point
  readonly unit: Point
}

export interface TopInternalGroupWitness<Point> {
  readonly object: TopObject<Point>
  readonly category: CategoryOps<TopObject<any>, ContinuousMap<any, any>>
  readonly witness: InternalGroupWitness<TopObject<any>, ContinuousMap<any, any>>
}

type TopInternalGroupAnalysisContext<Point> =
  InternalGroupAnalysis<TopObject<any>, ContinuousMap<any, any>>['context'] & {
    readonly object: TopObject<Point>
  }

export type TopInternalGroupAnalysis<Point> = InternalGroupAnalysis<
  TopObject<any>,
  ContinuousMap<any, any>
> & {
  readonly context: TopInternalGroupAnalysisContext<Point>
}

export const makeTopInternalGroupWitness = <Point>(input: TopInternalGroupInput<Point>): TopInternalGroupWitness<Point> => {
  const { topology, eq, multiply, inverse, unit } = input
  const inCarrier = contains(topology.carrier, eq)
  if (!inCarrier(unit)) {
    throw new Error('makeTopInternalGroupWitness: unit must lie in the carrier of the topology')
  }

  for (const element of topology.carrier) {
    if (!inCarrier(inverse(element))) {
      throw new Error('makeTopInternalGroupWitness: inverse must map each element into the carrier')
    }
  }

  for (const a of topology.carrier) {
    for (const b of topology.carrier) {
      if (!inCarrier(multiply(a, b))) {
        throw new Error('makeTopInternalGroupWitness: multiplication must map into the carrier')
      }
    }
  }

  const object: TopObject<Point> = { topology, eq }
  const category = makeCategoryOps()

  const product = makeBinaryProduct({ left: object, right: object })
  const productLeft = makeBinaryProduct({ left: product.object, right: object })
  const productRight = makeBinaryProduct({ left: object, right: product.object })

  const multiplication = ensureContinuousMap(
    () =>
      makeContinuousMap({
        source: product.object.topology,
        target: topology,
        eqSource: product.object.eq,
        eqTarget: eq,
        map: (pair: ProductPoint<Point, Point>) => multiply(pair.x, pair.y),
      }),
    'makeTopInternalGroupWitness: multiplication must be continuous',
  )

  const inverseArrow = ensureContinuousMap(
    () =>
      makeContinuousMap({
        source: topology,
        target: topology,
        eqSource: eq,
        eqTarget: eq,
        map: inverse,
      }),
    'makeTopInternalGroupWitness: inverse must be continuous',
  )

  const terminal = makeTerminal()

  const unitArrow = ensureContinuousMap(
    () =>
      makeContinuousMap({
        source: terminal.object.topology,
        target: topology,
        eqSource: terminal.object.eq,
        eqTarget: eq,
        map: () => unit,
      }),
    'makeTopInternalGroupWitness: unit arrow must be continuous',
  )

  const witness: InternalGroupWitness<TopObject<any>, ContinuousMap<any, any>> = {
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

export interface TopInternalMonoidInput<Point> {
  readonly topology: Top<Point>
  readonly eq: Eq<Point>
  readonly multiply: (left: Point, right: Point) => Point
  readonly unit: Point
}

export interface TopInternalMonoidWitness<Point> {
  readonly object: TopObject<Point>
  readonly category: CategoryOps<TopObject<any>, ContinuousMap<any, any>>
  readonly witness: InternalMonoidWitness<TopObject<any>, ContinuousMap<any, any>>
}

type TopInternalMonoidAnalysisContext<Point> =
  InternalMonoidAnalysis<TopObject<any>, ContinuousMap<any, any>>['context'] & {
    readonly object: TopObject<Point>
  }

export type TopInternalMonoidAnalysis<Point> = InternalMonoidAnalysis<
  TopObject<any>,
  ContinuousMap<any, any>
> & {
  readonly context: TopInternalMonoidAnalysisContext<Point>
}

export const makeTopInternalMonoidWitness = <Point>(
  input: TopInternalMonoidInput<Point>,
): TopInternalMonoidWitness<Point> => {
  const { topology, eq, multiply, unit } = input
  const inCarrier = contains(topology.carrier, eq)
  if (!inCarrier(unit)) {
    throw new Error('makeTopInternalMonoidWitness: unit must lie in the carrier of the topology')
  }

  for (const a of topology.carrier) {
    for (const b of topology.carrier) {
      if (!inCarrier(multiply(a, b))) {
        throw new Error('makeTopInternalMonoidWitness: multiplication must map into the carrier')
      }
    }
  }

  const object: TopObject<Point> = { topology, eq }
  const category = makeCategoryOps()

  const product = makeBinaryProduct({ left: object, right: object })
  const productLeft = makeBinaryProduct({ left: product.object, right: object })
  const productRight = makeBinaryProduct({ left: object, right: product.object })

  const multiplication = ensureContinuousMap(
    () =>
      makeContinuousMap({
        source: product.object.topology,
        target: topology,
        eqSource: product.object.eq,
        eqTarget: eq,
        map: (pair: ProductPoint<Point, Point>) => multiply(pair.x, pair.y),
      }),
    'makeTopInternalMonoidWitness: multiplication must be continuous',
  )

  const terminal = makeTerminal()

  const unitArrow = ensureContinuousMap(
    () =>
      makeContinuousMap({
        source: terminal.object.topology,
        target: topology,
        eqSource: terminal.object.eq,
        eqTarget: eq,
        map: () => unit,
      }),
    'makeTopInternalMonoidWitness: unit arrow must be continuous',
  )

  const witness: InternalMonoidWitness<TopObject<any>, ContinuousMap<any, any>> = {
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

export const analyzeTopInternalGroup = <Point>(
  input: TopInternalGroupWitness<Point>,
): TopInternalGroupAnalysis<Point> => {
  const analysis = analyzeInternalGroup(input)
  const { category, witness } = analysis.context
  const context: TopInternalGroupAnalysisContext<Point> = {
    category,
    witness,
    object: input.object,
  }

  return { ...analysis, context }
}

export const analyzeTopInternalMonoid = <Point>(
  input: TopInternalMonoidWitness<Point>,
): TopInternalMonoidAnalysis<Point> => {
  const analysis = analyzeInternalMonoid(input)
  const { category, witness } = analysis.context
  const context: TopInternalMonoidAnalysisContext<Point> = {
    category,
    witness,
    object: input.object,
  }

  return { ...analysis, context }
}
