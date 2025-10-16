export type IndexedFamily<I, X> = (index: I) => X

export interface CategoryWithDomCod<O, M> {
  readonly compose: (g: M, f: M) => M
  readonly dom: (m: M) => O
  readonly cod: (m: M) => O
}

export interface CategoryWithCompose<M> {
  readonly compose: (g: M, f: M) => M
}

export interface Cone<I, O, M> {
  readonly tip: O
  readonly legs: IndexedFamily<I, M>
}

export interface Cocone<I, O, M> {
  readonly coTip: O
  readonly legs: IndexedFamily<I, M>
}

export const productMediates = <I, O, M>(
  category: CategoryWithDomCod<O, M>,
  eq: (x: M, y: M) => boolean,
  projections: IndexedFamily<I, M>,
  mediator: M,
  cone: Cone<I, O, M>,
  indices: ReadonlyArray<I>,
): boolean => {
  if (category.dom(mediator) !== cone.tip) return false
  for (const index of indices) {
    const lhs = category.compose(projections(index), mediator)
    const rhs = cone.legs(index)
    if (!eq(lhs, rhs)) return false
  }
  return true
}

export const coproductMediates = <I, O, M>(
  category: CategoryWithDomCod<O, M>,
  eq: (x: M, y: M) => boolean,
  injections: IndexedFamily<I, M>,
  mediator: M,
  cocone: Cocone<I, O, M>,
  indices: ReadonlyArray<I>,
): boolean => {
  if (category.cod(mediator) !== cocone.coTip) return false
  for (const index of indices) {
    const lhs = category.compose(mediator, injections(index))
    const rhs = cocone.legs(index)
    if (!eq(lhs, rhs)) return false
  }
  return true
}

export const agreeUnderProjections = <I, M>(
  category: CategoryWithCompose<M>,
  eq: (x: M, y: M) => boolean,
  projections: IndexedFamily<I, M>,
  mediator: M,
  competitor: M,
  indices: ReadonlyArray<I>,
): boolean => {
  for (const index of indices) {
    const lhs = category.compose(projections(index), mediator)
    const rhs = category.compose(projections(index), competitor)
    if (!eq(lhs, rhs)) return false
  }
  return true
}

export const agreeUnderInjections = <I, M>(
  category: CategoryWithCompose<M>,
  eq: (x: M, y: M) => boolean,
  injections: IndexedFamily<I, M>,
  mediator: M,
  competitor: M,
  indices: ReadonlyArray<I>,
): boolean => {
  for (const index of indices) {
    const lhs = category.compose(mediator, injections(index))
    const rhs = category.compose(competitor, injections(index))
    if (!eq(lhs, rhs)) return false
  }
  return true
}

export interface BinaryProductTuple<O, M> {
  readonly object: O
  readonly projections: readonly [M, M]
  readonly tuple: (domain: O, legs: readonly [M, M]) => M
}

export interface BinaryProductDiagonalFactor<O, M> {
  readonly object: O
  readonly identity: M
}

export interface BinaryProductSwapResult<O, M> {
  readonly swapped: BinaryProductTuple<O, M>
  readonly forward: M
  readonly backward: M
}

export interface BinaryProductComponentwiseInput<O, M> {
  readonly category: {
    readonly compose: (g: M, f: M) => M
  }
  readonly source: BinaryProductTuple<O, M>
  readonly target: BinaryProductTuple<O, M>
  readonly components: readonly [M, M]
}

export interface BinaryProductComponentwiseCollapseInput<O, M> {
  readonly category: {
    readonly compose: (g: M, f: M) => M
    readonly eq: (f: M, g: M) => boolean
  }
  readonly source: BinaryProductTuple<O, M>
  readonly target: BinaryProductTuple<O, M>
  readonly componentwise: M
  readonly components: readonly [M, M]
  readonly domain: O
  readonly legs: readonly [M, M]
}

export interface BinaryProductNaturalityInput<O, M> {
  readonly category: {
    readonly compose: (g: M, f: M) => M
    readonly eq: (f: M, g: M) => boolean
  }
  readonly product: BinaryProductTuple<O, M>
  readonly mediator: M
  readonly legs: readonly [M, M]
  readonly precomposition: {
    readonly arrow: M
    readonly source: O
  }
}

export const makeBinaryProductSwap = <O, M>(
  current: BinaryProductTuple<O, M>,
  swapped: BinaryProductTuple<O, M>,
): BinaryProductSwapResult<O, M> => ({
  swapped,
  forward: swapped.tuple(current.object, [current.projections[1], current.projections[0]]),
  backward: current.tuple(swapped.object, [swapped.projections[1], swapped.projections[0]]),
})

export const makeBinaryProductDiagonal = <O, M>(
  product: BinaryProductTuple<O, M>,
  factor: BinaryProductDiagonalFactor<O, M>,
): M => product.tuple(factor.object, [factor.identity, factor.identity])

export const makeBinaryProductComponentwise = <O, M>({
  category,
  source,
  target,
  components,
}: BinaryProductComponentwiseInput<O, M>): M => {
  const [leftComponent, rightComponent] = components
  const leftLeg = category.compose(leftComponent, source.projections[0])
  const rightLeg = category.compose(rightComponent, source.projections[1])
  return target.tuple(source.object, [leftLeg, rightLeg])
}

export interface BinaryProductSwapCompatibilityInput<O, M> {
  readonly category: {
    readonly compose: (g: M, f: M) => M
    readonly eq: (f: M, g: M) => boolean
  }
  readonly sourceSwap: BinaryProductSwapResult<O, M>
  readonly targetSwap: BinaryProductSwapResult<O, M>
  readonly componentwise: M
  readonly swappedComponentwise: M
}

export const checkBinaryProductNaturality = <O, M>({
  category,
  product,
  mediator,
  legs,
  precomposition,
}: BinaryProductNaturalityInput<O, M>): boolean => {
  if (legs.length !== 2) {
    throw new Error(
      `checkBinaryProductNaturality: expected 2 legs for a binary product, received ${legs.length}`,
    )
  }

  const [leftLeg, rightLeg] = legs
  const composedLeft = category.compose(leftLeg, precomposition.arrow)
  const composedRight = category.compose(rightLeg, precomposition.arrow)
  const composedMediator = category.compose(mediator, precomposition.arrow)
  const canonical = product.tuple(precomposition.source, [composedLeft, composedRight])
  return category.eq(composedMediator, canonical)
}

export const checkBinaryProductComponentwiseCollapse = <O, M>({
  category,
  source,
  target,
  componentwise,
  components,
  domain,
  legs,
}: BinaryProductComponentwiseCollapseInput<O, M>): boolean => {
  const mediator = source.tuple(domain, legs)
  const composedComponentwise = category.compose(componentwise, mediator)
  const [leftComponent, rightComponent] = components
  const [leftLeg, rightLeg] = legs
  const leftComposite = category.compose(leftComponent, leftLeg)
  const rightComposite = category.compose(rightComponent, rightLeg)
  const canonical = target.tuple(domain, [leftComposite, rightComposite])
  return category.eq(composedComponentwise, canonical)
}

export const checkBinaryProductSwapCompatibility = <O, M>({
  category,
  sourceSwap,
  targetSwap,
  componentwise,
  swappedComponentwise,
}: BinaryProductSwapCompatibilityInput<O, M>): boolean => {
  const left = category.compose(targetSwap.forward, componentwise)
  const right = category.compose(swappedComponentwise, sourceSwap.forward)
  return category.eq(left, right)
}
