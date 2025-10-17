import { FinGrp, type FinGrpObj, type Hom } from './fingroup-cat'
import { kernelElements } from './fingroup-kernel'

export interface FinGrpKernelEqualizerWitness {
  readonly kernel: FinGrpObj
  readonly inclusion: Hom
  readonly constant: Hom
}

export interface FinGrpKernelEqualizerComparison {
  readonly forward: Hom
  readonly backward: Hom
}

interface KernelOptions {
  readonly kernelName?: string
}

const ensureHom = (
  dom: FinGrpObj,
  cod: FinGrpObj,
  arrow: Hom,
  context: string,
  role: string,
): void => {
  if (arrow.dom !== dom.name || arrow.cod !== cod.name) {
    throw new Error(
      `${context}: ${role} must target ${dom.name} → ${cod.name} (received ${arrow.dom} → ${arrow.cod}).`,
    )
  }
  if (!FinGrp.isHom(dom, cod, arrow)) {
    throw new Error(`${context}: ${role} must be a FinGrp homomorphism (dom=${dom.name}, cod=${cod.name}).`)
  }
}

const ensureKernelClosed = (domain: FinGrpObj, kernel: readonly string[], context: string): void => {
  const membership = new Set(kernel)
  if (!membership.has(domain.e)) {
    throw new Error(`${context}: kernel must contain the identity ${domain.e}.`)
  }

  for (const element of kernel) {
    const inverse = domain.inv(element)
    if (!membership.has(inverse)) {
      throw new Error(
        `${context}: kernel must be closed under inversion; ${element}⁻¹=${inverse} leaves the subset.`,
      )
    }
  }

  for (const left of kernel) {
    for (const right of kernel) {
      const product = domain.mul(left, right)
      if (!membership.has(product)) {
        throw new Error(
          `${context}: kernel must be closed under multiplication; ${left}⋅${right}=${product} leaves the subset.`,
        )
      }
    }
  }
}

export const finGrpKernelEqualizer = (
  domain: FinGrpObj,
  codomain: FinGrpObj,
  f: Hom,
  options?: KernelOptions,
): FinGrpKernelEqualizerWitness => {
  const context = `finGrpKernelEqualizer(${f.name})`
  ensureHom(domain, codomain, f, context, 'arrow f')

  const elements = kernelElements(domain, codomain, f)
  ensureKernelClosed(domain, elements, context)

  const membership = new Set(elements)
  const kernelName = options?.kernelName ?? `Ker(${f.name})`

  const kernel: FinGrpObj = {
    name: kernelName,
    elems: elements,
    e: domain.e,
    mul: (left, right) => {
      const product = domain.mul(left, right)
      if (!membership.has(product)) {
        throw new Error(
          `${context}: kernel multiplication escaped the subset at ${left}⋅${right}=${product}.`,
        )
      }
      return product
    },
    inv: (element) => {
      const inverse = domain.inv(element)
      if (!membership.has(inverse)) {
        throw new Error(`${context}: kernel inversion escaped the subset at ${element}⁻¹=${inverse}.`)
      }
      return inverse
    },
  }

  const inclusion: Hom = {
    name: `ι_${kernelName}`,
    dom: kernelName,
    cod: domain.name,
    map: (value) => {
      if (!membership.has(value)) {
        throw new Error(`${context}: inclusion invoked with ${value} outside the kernel.`)
      }
      return value
    },
  }

  const constant: Hom = {
    name: `const_${codomain.e}`,
    dom: domain.name,
    cod: codomain.name,
    map: () => codomain.e,
  }

  ensureHom(kernel, domain, inclusion, context, 'kernel inclusion')
  ensureHom(domain, codomain, constant, context, 'constant arrow')

  return { kernel, inclusion, constant }
}

export const finGrpFactorThroughKernelEqualizer = (
  domain: FinGrpObj,
  codomain: FinGrpObj,
  f: Hom,
  witness: FinGrpKernelEqualizerWitness,
  forkDomain: FinGrpObj,
  fork: Hom,
): Hom => {
  const context = `finGrpFactorThroughKernelEqualizer(${f.name})`

  ensureHom(domain, codomain, f, context, 'arrow f')
  ensureHom(witness.kernel, domain, witness.inclusion, context, 'kernel inclusion')
  ensureHom(domain, codomain, witness.constant, context, 'constant arrow')

  if (fork.dom !== forkDomain.name || fork.cod !== domain.name) {
    throw new Error(
      `${context}: fork must target ${forkDomain.name} → ${domain.name} (received ${fork.dom} → ${fork.cod}).`,
    )
  }
  if (!FinGrp.isHom(forkDomain, domain, fork)) {
    throw new Error(
      `${context}: fork ${fork.name} must be a FinGrp homomorphism (dom=${forkDomain.name}, cod=${domain.name}).`,
    )
  }

  const membership = new Set(witness.kernel.elems)

  for (const element of forkDomain.elems) {
    const image = fork.map(element)
    const viaF = f.map(image)
    const viaConstant = witness.constant.map(image)
    if (viaF !== viaConstant) {
      throw new Error(
        `${context}: fork ${fork.name} does not commute at ${element}; f maps ${image} to ${viaF} while const maps to ${viaConstant}.`,
      )
    }
    if (!membership.has(image)) {
      throw new Error(
        `${context}: fork ${fork.name} lands outside the kernel at ${element} ↦ ${image}.`,
      )
    }
  }

  const mediator: Hom = {
    name: `${fork.name}⇒${witness.kernel.name}`,
    dom: forkDomain.name,
    cod: witness.kernel.name,
    map: (value) => {
      const image = fork.map(value)
      if (!membership.has(image)) {
        throw new Error(
          `${context}: mediator evaluated outside the kernel at ${value} ↦ ${image}.`,
        )
      }
      return image
    },
  }

  if (!FinGrp.isHom(forkDomain, witness.kernel, mediator)) {
    throw new Error(
      `${context}: constructed mediator is not a FinGrp homomorphism (dom=${forkDomain.name}, cod=${witness.kernel.name}).`,
    )
  }

  for (const element of forkDomain.elems) {
    const recomposed = witness.inclusion.map(mediator.map(element))
    const original = fork.map(element)
    if (recomposed !== original) {
      throw new Error(
        `${context}: mediator does not reproduce the fork at ${element}; got ${recomposed} vs ${original}.`,
      )
    }
  }

  return mediator
}

export const finGrpKernelEqualizerComparison = (
  domain: FinGrpObj,
  codomain: FinGrpObj,
  f: Hom,
  first: FinGrpKernelEqualizerWitness,
  second: FinGrpKernelEqualizerWitness,
): FinGrpKernelEqualizerComparison => {
  const context = `finGrpKernelEqualizerComparison(${f.name})`

  const forward = finGrpFactorThroughKernelEqualizer(
    domain,
    codomain,
    f,
    second,
    first.kernel,
    first.inclusion,
  )
  const backward = finGrpFactorThroughKernelEqualizer(
    domain,
    codomain,
    f,
    first,
    second.kernel,
    second.inclusion,
  )

  if (!FinGrp.isHom(first.kernel, second.kernel, forward)) {
    throw new Error(
      `${context}: forward mediator must be a FinGrp homomorphism (dom=${first.kernel.name}, cod=${second.kernel.name}).`,
    )
  }
  if (!FinGrp.isHom(second.kernel, first.kernel, backward)) {
    throw new Error(
      `${context}: backward mediator must be a FinGrp homomorphism (dom=${second.kernel.name}, cod=${first.kernel.name}).`,
    )
  }

  for (const element of first.kernel.elems) {
    const roundTrip = backward.map(forward.map(element))
    if (roundTrip !== element) {
      throw new Error(
        `${context}: forward/backward do not compose to id on ${first.kernel.name} at ${element} (got ${roundTrip}).`,
      )
    }
  }

  for (const element of second.kernel.elems) {
    const roundTrip = forward.map(backward.map(element))
    if (roundTrip !== element) {
      throw new Error(
        `${context}: forward/backward do not compose to id on ${second.kernel.name} at ${element} (got ${roundTrip}).`,
      )
    }
  }

  return { forward, backward }
}
