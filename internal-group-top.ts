import {
  analyzeInternalGroup,
  enrichInternalGroupDiagonal,
  type CategoryOps,
  type InternalGroupAnalysis,
  type InternalGroupWitness,
} from './internal-group'
import {
  analyzeInternalMonoid,
  enrichInternalMonoidDiagonal,
  type InternalMonoidAnalysis,
  type InternalMonoidWitness,
} from './internal-monoid'
import {
  makeContinuousMap,
  type ContinuousMap,
  type ProductPoint,
} from './src/top/ContinuousMap'
import {
  makeTopBinaryProduct,
  makeTopCategoryOps,
  makeTopObject,
  makeTopTerminal,
  type Eq,
  type TopObject,
} from './src/top/categoryOps'
import { type TopStructure } from './src/top/Topology'

const contains = <Point>(carrier: ReadonlyArray<Point>, eq: Eq<Point>) =>
  (value: Point): boolean => carrier.some((candidate) => eq(candidate, value))

const ensureContinuousMap = <Source, Target>(build: () => ContinuousMap<Source, Target>, message: string): ContinuousMap<Source, Target> => {
  try {
    return build()
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error)
    throw new Error(`${message} (${details})`)
  }
}

export interface TopInternalGroupInput<Point> {
  readonly structure: TopStructure<Point>
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
  const { structure, multiply, inverse, unit } = input
  const { carrier, eq } = structure
  const inCarrier = contains(carrier, eq)
  if (!inCarrier(unit)) {
    throw new Error('makeTopInternalGroupWitness: unit must lie in the carrier of the topology')
  }

  for (const element of carrier) {
    if (!inCarrier(inverse(element))) {
      throw new Error('makeTopInternalGroupWitness: inverse must map each element into the carrier')
    }
  }

  for (const a of carrier) {
    for (const b of carrier) {
      if (!inCarrier(multiply(a, b))) {
        throw new Error('makeTopInternalGroupWitness: multiplication must map into the carrier')
      }
    }
  }

  const object = makeTopObject(structure)
  const category = makeTopCategoryOps()

  const product = makeTopBinaryProduct({ left: object, right: object })
  const productLeft = makeTopBinaryProduct({ left: product.object, right: object })
  const productRight = makeTopBinaryProduct({ left: object, right: product.object })

  const multiplication = ensureContinuousMap(
    () =>
      makeContinuousMap({
        source: product.object.topology,
        target: object.topology,
        eqSource: product.object.eq,
        eqTarget: object.eq,
        map: (pair: ProductPoint<Point, Point>) => multiply(pair.x, pair.y),
      }),
    'makeTopInternalGroupWitness: multiplication must be continuous',
  )

  const inverseArrow = ensureContinuousMap(
    () =>
      makeContinuousMap({
        source: object.topology,
        target: object.topology,
        eqSource: object.eq,
        eqTarget: object.eq,
        map: inverse,
      }),
    'makeTopInternalGroupWitness: inverse must be continuous',
  )

  const terminal = makeTopTerminal()

  const unitArrow = ensureContinuousMap(
    () =>
      makeContinuousMap({
        source: terminal.object.topology,
        target: object.topology,
        eqSource: terminal.object.eq,
        eqTarget: object.eq,
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
  readonly structure: TopStructure<Point>
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
  const { structure, multiply, unit } = input
  const { carrier, eq } = structure
  const inCarrier = contains(carrier, eq)
  if (!inCarrier(unit)) {
    throw new Error('makeTopInternalMonoidWitness: unit must lie in the carrier of the topology')
  }

  for (const a of carrier) {
    for (const b of carrier) {
      if (!inCarrier(multiply(a, b))) {
        throw new Error('makeTopInternalMonoidWitness: multiplication must map into the carrier')
      }
    }
  }

  const object = makeTopObject(structure)
  const category = makeTopCategoryOps()

  const product = makeTopBinaryProduct({ left: object, right: object })
  const productLeft = makeTopBinaryProduct({ left: product.object, right: object })
  const productRight = makeTopBinaryProduct({ left: object, right: product.object })

  const multiplication = ensureContinuousMap(
    () =>
      makeContinuousMap({
        source: product.object.topology,
        target: object.topology,
        eqSource: product.object.eq,
        eqTarget: object.eq,
        map: (pair: ProductPoint<Point, Point>) => multiply(pair.x, pair.y),
      }),
    'makeTopInternalMonoidWitness: multiplication must be continuous',
  )

  const terminal = makeTopTerminal()

  const unitArrow = ensureContinuousMap(
    () =>
      makeContinuousMap({
        source: terminal.object.topology,
        target: object.topology,
        eqSource: terminal.object.eq,
        eqTarget: object.eq,
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
