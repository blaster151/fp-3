import type { Monoid } from './monoid-cat'
import { MonCat, type MonoidHom } from './mon-cat'

const formatElement = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return `${value}`
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const requireElements = <T>(monoid: Monoid<T>, role: string): ReadonlyArray<T> => {
  const { elements } = monoid
  if (!elements) {
    throw new Error(`monoidEqualizer: ${role} must enumerate its elements to analyse equalizers.`)
  }
  if (elements.length === 0) {
    throw new Error(`monoidEqualizer: ${role} enumeration cannot be empty.`)
  }
  return elements
}

const ensureParallelPair = <M, N>(f: MonoidHom<M, N>, g: MonoidHom<M, N>): void => {
  if (f.dom !== g.dom || f.cod !== g.cod) {
    throw new Error('monoidEqualizer: expected parallel monoid homomorphisms with a shared domain and codomain.')
  }
}

const ensureInclusionShape = <M, N>(f: MonoidHom<M, N>, inclusion: MonoidHom<M, M>): void => {
  if (inclusion.cod !== f.dom) {
    throw new Error('monoidEqualizer: inclusion codomain must match the shared domain of the parallel pair.')
  }
}

const ensureForkShape = <W, M>(inclusion: MonoidHom<M, M>, fork: MonoidHom<W, M>): void => {
  if (fork.cod !== inclusion.cod) {
    throw new Error('monoidEqualizer: fork codomain must match the inclusion codomain (the shared domain of f and g).')
  }
}

export interface MonoidEqualizerResult<M> {
  readonly obj: Monoid<M>
  readonly equalize: MonoidHom<M, M>
}

export const monoidEqualizer = <M, N>(f: MonoidHom<M, N>, g: MonoidHom<M, N>): MonoidEqualizerResult<M> => {
  ensureParallelPair(f, g)

  const domainElements = requireElements(f.dom, 'domain')
  const equalizingElements: M[] = []

  domainElements.forEach((value) => {
    if (Object.is(f.map(value), g.map(value)) && !equalizingElements.some((candidate) => Object.is(candidate, value))) {
      equalizingElements.push(value)
    }
  })

  if (equalizingElements.length === 0) {
    throw new Error('monoidEqualizer: computed equalizing subset is empty; expected at least the unit to survive.')
  }

  if (!equalizingElements.some((candidate) => Object.is(candidate, f.dom.e))) {
    throw new Error(
      `monoidEqualizer: equalizing subset must contain the unit ${formatElement(f.dom.e)}, but it was not detected among the candidates.`,
    )
  }

  equalizingElements.forEach((left) => {
    equalizingElements.forEach((right) => {
      const product = f.dom.op(left, right)
      if (!equalizingElements.some((candidate) => Object.is(candidate, product))) {
        throw new Error(
          `monoidEqualizer: equalizing subset is not closed under multiplication — ${formatElement(left)} ⋆ ${formatElement(right)} = ${formatElement(product)} leaves the subset.`,
        )
      }
    })
  })

  const equalizerMonoid: Monoid<M> = {
    e: f.dom.e,
    op: f.dom.op,
    elements: equalizingElements,
  }

  const equalize: MonoidHom<M, M> = {
    dom: equalizerMonoid,
    cod: f.dom,
    map: (value) => value,
  }

  if (!MonCat.isHom(equalize)) {
    throw new Error('monoidEqualizer: constructed inclusion failed the monoid homomorphism check.')
  }

  return { obj: equalizerMonoid, equalize }
}

export const monoidFactorThroughEqualizer = <W, M, N>(
  f: MonoidHom<M, N>,
  g: MonoidHom<M, N>,
  inclusion: MonoidHom<M, M>,
  fork: MonoidHom<W, M>,
): MonoidHom<W, M> => {
  ensureParallelPair(f, g)
  ensureInclusionShape(f, inclusion)
  ensureForkShape(inclusion, fork)

  const equalizerElements = requireElements(inclusion.dom, 'equalizer domain')
  const forkElements = requireElements(fork.dom, 'fork domain')

  if (!MonCat.isHom(inclusion)) {
    throw new Error('monoidFactorThroughEqualizer: provided inclusion must be a monoid homomorphism.')
  }

  const left = MonCat.compose(f, fork)
  const right = MonCat.compose(g, fork)

  forkElements.forEach((value) => {
    const leftImage = left.map(value)
    const rightImage = right.map(value)
    if (!Object.is(leftImage, rightImage)) {
      throw new Error(
        `monoidFactorThroughEqualizer: fork does not commute with the parallel pair at ${formatElement(value)} — f ∘ h maps to ${formatElement(leftImage)} while g ∘ h maps to ${formatElement(rightImage)}.`,
      )
    }
  })

  const mediatorLookup = new Map<W, M>()

  forkElements.forEach((value) => {
    const image = fork.map(value)
    const canonical = equalizerElements.find((candidate) => Object.is(candidate, image))
    if (canonical === undefined) {
      throw new Error(
        `monoidFactorThroughEqualizer: fork lands outside the equalizer submonoid at ${formatElement(value)} ↦ ${formatElement(image)}.`,
      )
    }
    mediatorLookup.set(value, canonical)
  })

  const mediator: MonoidHom<W, M> = {
    dom: fork.dom,
    cod: inclusion.dom,
    map: (value) => {
      const canonical = mediatorLookup.get(value)
      if (canonical === undefined) {
        const image = fork.map(value)
        throw new Error(
          `monoidFactorThroughEqualizer: mediator evaluated outside the recorded fork domain at ${formatElement(value)} ↦ ${formatElement(image)}.`,
        )
      }
      return canonical
    },
  }

  if (!MonCat.isHom(mediator)) {
    throw new Error('monoidFactorThroughEqualizer: synthesised mediator failed the monoid homomorphism check.')
  }

  const recomposed = MonCat.compose(inclusion, mediator)
  forkElements.forEach((value) => {
    if (!Object.is(recomposed.map(value), fork.map(value))) {
      throw new Error('monoidFactorThroughEqualizer: recomposed mediator does not reproduce the original fork.')
    }
  })

  return mediator
}

export interface MonoidEqualizerComparison<M> {
  readonly forward: MonoidHom<M, M>
  readonly backward: MonoidHom<M, M>
}

const ensureArrowEquality = <A, B>(
  left: MonoidHom<A, B>,
  right: MonoidHom<A, B>,
  message: string,
): void => {
  const domainElements = requireElements(left.dom, 'comparison domain')
  domainElements.forEach((value) => {
    if (!Object.is(left.map(value), right.map(value))) {
      throw new Error(`${message} Witnessed at ${formatElement(value)}.`)
    }
  })
}

export const monoidEqualizerComparison = <M, N>(
  f: MonoidHom<M, N>,
  g: MonoidHom<M, N>,
  first: MonoidHom<M, M>,
  second: MonoidHom<M, M>,
): MonoidEqualizerComparison<M> => {
  const forward = monoidFactorThroughEqualizer(f, g, second, first)
  const backward = monoidFactorThroughEqualizer(f, g, first, second)

  const leftRoundTrip = MonCat.compose(backward, forward)
  const rightRoundTrip = MonCat.compose(forward, backward)

  const idFirst = MonCat.id(first.dom)
  const idSecond = MonCat.id(second.dom)

  ensureArrowEquality(leftRoundTrip, idFirst, 'monoidEqualizerComparison: backward ∘ forward does not reduce to the identity on the first equalizer.')
  ensureArrowEquality(rightRoundTrip, idSecond, 'monoidEqualizerComparison: forward ∘ backward does not reduce to the identity on the second equalizer.')

  return { forward, backward }
}
