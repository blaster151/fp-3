import { FinSet } from './allTS'
import type { FinSetMor, FinSetObj } from './allTS'

const formatClassMember = (object: FinSetObj, index: number): string => {
  const value = object.elements[index]
  if (typeof value === 'string') {
    return value
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const assertSharedDomain = (quotient: FinSetMor, cocone: FinSetMor): void => {
  if (quotient.from !== cocone.from) {
    const left = quotient.from.elements.length
    const right = cocone.from.elements.length
    throw new Error(
      `finsetFactorThroughQuotient: expected arrows with a shared domain (|Q.from|=${left}, |candidate.from|=${right}).`,
    )
  }
  if (quotient.map.length !== cocone.map.length) {
    throw new Error(
      `finsetFactorThroughQuotient: quotient and candidate maps have different arity (|q|=${quotient.map.length}, |candidate|=${cocone.map.length}).`,
    )
  }
}

const collectClassMembers = (quotient: FinSetMor): Map<number, number[]> => {
  const members = new Map<number, number[]>()
  quotient.map.forEach((classIndex, position) => {
    const bucket = members.get(classIndex)
    if (bucket) {
      bucket.push(position)
    } else {
      members.set(classIndex, [position])
    }
  })
  return members
}

export const finsetFactorThroughQuotient = (
  quotient: FinSetMor,
  cocone: FinSetMor,
): FinSetMor => {
  assertSharedDomain(quotient, cocone)

  const classImages = Array.from({ length: quotient.to.elements.length }, () => -1)
  const classMembers = collectClassMembers(quotient)

  quotient.map.forEach((classIndex, position) => {
    const target = cocone.map[position]!
    const recorded = classImages[classIndex]
    if (recorded === -1) {
      classImages[classIndex] = target
    } else if (recorded !== target) {
      const members = classMembers.get(classIndex) ?? []
      const witnesses = members
        .map((member) => formatClassMember(quotient.from, member))
        .join(', ')
      throw new Error(
        `finsetFactorThroughQuotient: candidate arrow is not constant on the equivalence class of ${formatClassMember(
          quotient.from,
          position,
        )} (class ${classIndex} with members ${witnesses}).`,
      )
    }
  })

  classImages.forEach((image, classIndex) => {
    if (image === -1) {
      throw new Error(
        `finsetFactorThroughQuotient: equivalence class ${classIndex} has no representative in the quotient domain.`,
      )
    }
  })

  const mediator: FinSetMor = {
    from: quotient.to,
    to: cocone.to,
    map: classImages,
  }

  const factored = FinSet.compose(mediator, quotient)
  const agrees = FinSet.equalMor
    ? FinSet.equalMor(factored, cocone)
    : factored.map.length === cocone.map.length && factored.map.every((value, index) => value === cocone.map[index])

  if (!agrees) {
    throw new Error('finsetFactorThroughQuotient: constructed mediator does not reproduce the candidate cocone.')
  }

  return mediator
}

export interface FinSetQuotientComparison {
  readonly forward: FinSetMor
  readonly backward: FinSetMor
}

export const finsetQuotientComparison = (
  first: FinSetMor,
  second: FinSetMor,
): FinSetQuotientComparison => {
  const forward = finsetFactorThroughQuotient(first, second)
  const backward = finsetFactorThroughQuotient(second, first)

  const left = FinSet.compose(backward, forward)
  const right = FinSet.compose(forward, backward)

  const identityFirst = FinSet.id(first.to)
  const identitySecond = FinSet.id(second.to)

  const equal = FinSet.equalMor ?? ((a: FinSetMor, b: FinSetMor) => a.map.length === b.map.length && a.map.every((v, i) => v === b.map[i]))

  if (!equal(left, identityFirst)) {
    throw new Error('finsetQuotientComparison: forward/backward mediators do not invert the first quotient.')
  }

  if (!equal(right, identitySecond)) {
    throw new Error('finsetQuotientComparison: forward/backward mediators do not invert the second quotient.')
  }

  return { forward, backward }
}
