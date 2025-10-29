export type GroupAlgebraElement<Basis extends string> = Readonly<Record<Basis, number>>

export type GroupAlgebraTensor<Basis extends string> = Readonly<
  Record<Basis, GroupAlgebraElement<Basis>>
>

export type GroupAlgebraTriple<Basis extends string> = Readonly<
  Record<Basis, GroupAlgebraTensor<Basis>>
>

export type GroupAlgebraLinearMap<Basis extends string> = (
  basis: Basis,
) => GroupAlgebraElement<Basis>

export interface HopfDiagnostic {
  readonly label: string
  readonly holds: boolean
  readonly details: ReadonlyArray<string>
}

export interface GroupAlgebraHopfSpec<Basis extends string> {
  readonly basis: readonly Basis[]
  readonly identity: Basis
  readonly multiply: (left: Basis, right: Basis) => Basis
  readonly inverse: (element: Basis) => Basis
  readonly describeBasis: (basis: Basis) => string
}

export interface GroupAlgebraHopfOperations<Basis extends string> {
  readonly basis: readonly Basis[]
  readonly makeElement: (
    coefficients: Partial<Record<Basis, number>>,
  ) => GroupAlgebraElement<Basis>
  readonly zeroElement: () => GroupAlgebraElement<Basis>
  readonly unitElement: () => GroupAlgebraElement<Basis>
  readonly elementFromBasis: (basis: Basis) => GroupAlgebraElement<Basis>
  readonly inverseBasis: (basis: Basis) => Basis
  readonly multiplyElements: (
    left: GroupAlgebraElement<Basis>,
    right: GroupAlgebraElement<Basis>,
  ) => GroupAlgebraElement<Basis>
  readonly comultiplyElement: (
    element: GroupAlgebraElement<Basis>,
  ) => GroupAlgebraTensor<Basis>
  readonly applyLinearMap: (
    map: GroupAlgebraLinearMap<Basis>,
    element: GroupAlgebraElement<Basis>,
  ) => GroupAlgebraElement<Basis>
  readonly convolution: (
    first: GroupAlgebraLinearMap<Basis>,
    second: GroupAlgebraLinearMap<Basis>,
    element: GroupAlgebraElement<Basis>,
  ) => GroupAlgebraElement<Basis>
  readonly describeElement: (element: GroupAlgebraElement<Basis>) => string
  readonly describeTensor: (tensor: GroupAlgebraTensor<Basis>) => string
  readonly describeTriple: (triple: GroupAlgebraTriple<Basis>) => string
  readonly checkAssociativity: (
    samples: readonly GroupAlgebraElement<Basis>[],
  ) => HopfDiagnostic
  readonly checkUnitLaw: (
    samples: readonly GroupAlgebraElement<Basis>[],
  ) => HopfDiagnostic
  readonly checkCoassociativity: (
    samples: readonly GroupAlgebraElement<Basis>[],
  ) => HopfDiagnostic
  readonly checkCounitLaws: (
    samples: readonly GroupAlgebraElement<Basis>[],
  ) => HopfDiagnostic
  readonly checkBialgebraMultiplicationCompatibility: (
    samples: readonly GroupAlgebraElement<Basis>[],
  ) => HopfDiagnostic
  readonly checkCounitMultiplicationCompatibility: (
    samples: readonly GroupAlgebraElement<Basis>[],
  ) => HopfDiagnostic
  readonly checkCounitUnitCompatibility: () => HopfDiagnostic
  readonly checkAntipode: (
    label: string,
    first: GroupAlgebraLinearMap<Basis>,
    second: GroupAlgebraLinearMap<Basis>,
    samples: readonly GroupAlgebraElement<Basis>[],
  ) => HopfDiagnostic
}

const buildRecord = <Basis extends string, Value>(
  basis: readonly Basis[],
  initializer: (basis: Basis) => Value,
): Record<Basis, Value> => {
  const record = Object.create(null) as Record<Basis, Value>
  basis.forEach((basisElement) => {
    record[basisElement] = initializer(basisElement)
  })
  return record
}

export const buildGroupAlgebraHopfOperations = <Basis extends string>(
  spec: GroupAlgebraHopfSpec<Basis>,
): GroupAlgebraHopfOperations<Basis> => {
  const makeElement = (
    coefficients: Partial<Record<Basis, number>>,
  ): GroupAlgebraElement<Basis> =>
    buildRecord(spec.basis, (basis) => coefficients[basis] ?? 0)

  const singletonCoefficients = (
    basis: Basis,
    coefficient: number,
  ): Partial<Record<Basis, number>> =>
    ({ [basis]: coefficient } as Partial<Record<Basis, number>>)

  const zeroElement = (): GroupAlgebraElement<Basis> => makeElement({})

  const unitElement = (): GroupAlgebraElement<Basis> =>
    makeElement(singletonCoefficients(spec.identity, 1))

  const elementFromBasis = (basis: Basis): GroupAlgebraElement<Basis> =>
    makeElement(singletonCoefficients(basis, 1))

  const addElements = (
    left: GroupAlgebraElement<Basis>,
    right: GroupAlgebraElement<Basis>,
  ): GroupAlgebraElement<Basis> =>
    buildRecord(spec.basis, (basis) => left[basis] + right[basis])

  const scaleElement = (
    element: GroupAlgebraElement<Basis>,
    scalar: number,
  ): GroupAlgebraElement<Basis> =>
    buildRecord(spec.basis, (basis) => element[basis] * scalar)

  const zeroTensor = (): GroupAlgebraTensor<Basis> =>
    buildRecord(spec.basis, () => zeroElement())

  const zeroTriple = (): GroupAlgebraTriple<Basis> =>
    buildRecord(spec.basis, () => zeroTensor())

  const basisTensor = (
    left: Basis,
    right: Basis,
  ): GroupAlgebraTensor<Basis> =>
    buildRecord(spec.basis, (basis) =>
      basis === left
        ? makeElement(singletonCoefficients(right, 1))
        : zeroElement(),
    )

  const basisTriple = (
    first: Basis,
    second: Basis,
    third: Basis,
  ): GroupAlgebraTriple<Basis> =>
    buildRecord(spec.basis, (basis) =>
      basis === first ? basisTensor(second, third) : zeroTensor(),
    )

  const multiplyTensor = (
    left: GroupAlgebraTensor<Basis>,
    right: GroupAlgebraTensor<Basis>,
  ): GroupAlgebraTensor<Basis> => {
    let result = zeroTensor()
    spec.basis.forEach((first) => {
      spec.basis.forEach((second) => {
        const leftCoefficient = left[first][second]
        if (leftCoefficient === 0) {
          return
        }
        spec.basis.forEach((third) => {
          spec.basis.forEach((fourth) => {
            const rightCoefficient = right[third][fourth]
            if (rightCoefficient === 0) {
              return
            }
            const productLeft = spec.multiply(first, third)
            const productRight = spec.multiply(second, fourth)
            const coefficient = leftCoefficient * rightCoefficient
            const contribution = basisTensor(productLeft, productRight)
            result = addTensor(result, scaleTensor(contribution, coefficient))
          })
        })
      })
    })
    return result
  }

  const addTensor = (
    left: GroupAlgebraTensor<Basis>,
    right: GroupAlgebraTensor<Basis>,
  ): GroupAlgebraTensor<Basis> =>
    buildRecord(spec.basis, (basis) => addElements(left[basis], right[basis]))

  const scaleTensor = (
    tensor: GroupAlgebraTensor<Basis>,
    scalar: number,
  ): GroupAlgebraTensor<Basis> =>
    buildRecord(spec.basis, (basis) => scaleElement(tensor[basis], scalar))

  const addTriple = (
    left: GroupAlgebraTriple<Basis>,
    right: GroupAlgebraTriple<Basis>,
  ): GroupAlgebraTriple<Basis> =>
    buildRecord(spec.basis, (basis) => addTensor(left[basis], right[basis]))

  const scaleTriple = (
    triple: GroupAlgebraTriple<Basis>,
    scalar: number,
  ): GroupAlgebraTriple<Basis> =>
    buildRecord(spec.basis, (basis) => scaleTensor(triple[basis], scalar))

  const multiplyElements = (
    left: GroupAlgebraElement<Basis>,
    right: GroupAlgebraElement<Basis>,
  ): GroupAlgebraElement<Basis> => {
    let result = zeroElement()
    spec.basis.forEach((first) => {
      spec.basis.forEach((second) => {
        const coefficient = left[first] * right[second]
        if (coefficient === 0) {
          return
        }
        const product = spec.multiply(first, second)
        result = addElements(
          result,
          scaleElement(elementFromBasis(product), coefficient),
        )
      })
    })
    return result
  }

  const comultiplyElement = (
    element: GroupAlgebraElement<Basis>,
  ): GroupAlgebraTensor<Basis> => {
    let result = zeroTensor()
    spec.basis.forEach((basis) => {
      const coefficient = element[basis]
      if (coefficient === 0) {
        return
      }
      const tensor = basisTensor(basis, basis)
      result = addTensor(result, scaleTensor(tensor, coefficient))
    })
    return result
  }

  const applyDeltaLeft = (
    tensor: GroupAlgebraTensor<Basis>,
  ): GroupAlgebraTriple<Basis> => {
    let result = zeroTriple()
    spec.basis.forEach((left) => {
      spec.basis.forEach((middle) => {
        const coefficient = tensor[left][middle]
        if (coefficient === 0) {
          return
        }
        const delta = comultiplyElement(elementFromBasis(left))
        spec.basis.forEach((first) => {
          spec.basis.forEach((second) => {
            const deltaCoefficient = delta[first][second]
            if (deltaCoefficient === 0) {
              return
            }
            const triple = basisTriple(first, second, middle)
            result = addTriple(
              result,
              scaleTriple(triple, coefficient * deltaCoefficient),
            )
          })
        })
      })
    })
    return result
  }

  const applyDeltaRight = (
    tensor: GroupAlgebraTensor<Basis>,
  ): GroupAlgebraTriple<Basis> => {
    let result = zeroTriple()
    spec.basis.forEach((left) => {
      spec.basis.forEach((middle) => {
        const coefficient = tensor[left][middle]
        if (coefficient === 0) {
          return
        }
        const delta = comultiplyElement(elementFromBasis(middle))
        spec.basis.forEach((first) => {
          spec.basis.forEach((second) => {
            const deltaCoefficient = delta[first][second]
            if (deltaCoefficient === 0) {
              return
            }
            const triple = basisTriple(left, first, second)
            result = addTriple(
              result,
              scaleTriple(triple, coefficient * deltaCoefficient),
            )
          })
        })
      })
    })
    return result
  }

  const elementsEqual = (
    left: GroupAlgebraElement<Basis>,
    right: GroupAlgebraElement<Basis>,
  ): boolean => spec.basis.every((basis) => left[basis] === right[basis])

  const tensorsEqual = (
    left: GroupAlgebraTensor<Basis>,
    right: GroupAlgebraTensor<Basis>,
  ): boolean => spec.basis.every((basis) => elementsEqual(left[basis], right[basis]))

  const triplesEqual = (
    left: GroupAlgebraTriple<Basis>,
    right: GroupAlgebraTriple<Basis>,
  ): boolean => spec.basis.every((basis) => tensorsEqual(left[basis], right[basis]))

  const describeElement = (element: GroupAlgebraElement<Basis>): string => {
    const terms: string[] = []
    spec.basis.forEach((basis) => {
      const coefficient = element[basis]
      if (coefficient === 0) {
        return
      }
      const symbol = spec.describeBasis(basis)
      if (coefficient === 1) {
        terms.push(symbol)
      } else if (coefficient === -1) {
        terms.push(`-${symbol}`)
      } else {
        terms.push(`${coefficient}·${symbol}`)
      }
    })
    if (terms.length === 0) {
      return "0"
    }
    return terms.reduce((acc, term, index) => {
      if (index === 0) {
        return term
      }
      return term.startsWith("-") ? `${acc} - ${term.slice(1)}` : `${acc} + ${term}`
    }, "")
  }

  const describeTensor = (tensor: GroupAlgebraTensor<Basis>): string => {
    const terms: string[] = []
    spec.basis.forEach((left) => {
      spec.basis.forEach((right) => {
        const coefficient = tensor[left][right]
        if (coefficient === 0) {
          return
        }
        const pair = `${spec.describeBasis(left)}⊗${spec.describeBasis(right)}`
        if (coefficient === 1) {
          terms.push(pair)
        } else if (coefficient === -1) {
          terms.push(`-${pair}`)
        } else {
          terms.push(`${coefficient}·${pair}`)
        }
      })
    })
    if (terms.length === 0) {
      return "0"
    }
    return terms.reduce((acc, term, index) => {
      if (index === 0) {
        return term
      }
      return term.startsWith("-") ? `${acc} - ${term.slice(1)}` : `${acc} + ${term}`
    }, "")
  }

  const describeTriple = (triple: GroupAlgebraTriple<Basis>): string => {
    const terms: string[] = []
    spec.basis.forEach((first) => {
      spec.basis.forEach((second) => {
        spec.basis.forEach((third) => {
          const coefficient = triple[first][second][third]
          if (coefficient === 0) {
            return
          }
          const label = `${spec.describeBasis(first)}⊗${spec.describeBasis(
            second,
          )}⊗${spec.describeBasis(third)}`
          if (coefficient === 1) {
            terms.push(label)
          } else if (coefficient === -1) {
            terms.push(`-${label}`)
          } else {
            terms.push(`${coefficient}·${label}`)
          }
        })
      })
    })
    if (terms.length === 0) {
      return "0"
    }
    return terms.reduce((acc, term, index) => {
      if (index === 0) {
        return term
      }
      return term.startsWith("-") ? `${acc} - ${term.slice(1)}` : `${acc} + ${term}`
    }, "")
  }

  const counit = (element: GroupAlgebraElement<Basis>): number =>
    spec.basis.reduce((acc, basis) => acc + element[basis], 0)

  const unitCounit = (element: GroupAlgebraElement<Basis>): GroupAlgebraElement<Basis> =>
    scaleElement(unitElement(), counit(element))

  const applyLinearMap = (
    map: GroupAlgebraLinearMap<Basis>,
    element: GroupAlgebraElement<Basis>,
  ): GroupAlgebraElement<Basis> => {
    let result = zeroElement()
    spec.basis.forEach((basis) => {
      const coefficient = element[basis]
      if (coefficient !== 0) {
        result = addElements(result, scaleElement(map(basis), coefficient))
      }
    })
    return result
  }

  const convolution = (
    first: GroupAlgebraLinearMap<Basis>,
    second: GroupAlgebraLinearMap<Basis>,
    element: GroupAlgebraElement<Basis>,
  ): GroupAlgebraElement<Basis> => {
    const delta = comultiplyElement(element)
    let result = zeroElement()
    spec.basis.forEach((left) => {
      spec.basis.forEach((right) => {
        const coefficient = delta[left][right]
        if (coefficient === 0) {
          return
        }
        const leftImage = applyLinearMap(first, elementFromBasis(left))
        const rightImage = applyLinearMap(second, elementFromBasis(right))
        const product = multiplyElements(leftImage, rightImage)
        result = addElements(result, scaleElement(product, coefficient))
      })
    })
    return result
  }

  const applyCounitLeft = (tensor: GroupAlgebraTensor<Basis>): GroupAlgebraElement<Basis> => {
    let result = zeroElement()
    spec.basis.forEach((left) => {
      spec.basis.forEach((right) => {
        const coefficient = tensor[left][right]
        if (coefficient !== 0) {
          result = addElements(result, scaleElement(elementFromBasis(right), coefficient))
        }
      })
    })
    return result
  }

  const applyCounitRight = (tensor: GroupAlgebraTensor<Basis>): GroupAlgebraElement<Basis> => {
    let result = zeroElement()
    spec.basis.forEach((left) => {
      spec.basis.forEach((right) => {
        const coefficient = tensor[left][right]
        if (coefficient !== 0) {
          result = addElements(result, scaleElement(elementFromBasis(left), coefficient))
        }
      })
    })
    return result
  }

  const checkAssociativity = (
    samples: readonly GroupAlgebraElement<Basis>[],
  ): HopfDiagnostic => {
    const failures: string[] = []
    samples.forEach((a) => {
      samples.forEach((b) => {
        samples.forEach((c) => {
          const left = multiplyElements(multiplyElements(a, b), c)
          const right = multiplyElements(a, multiplyElements(b, c))
          if (!elementsEqual(left, right)) {
            failures.push(
              `  • (${describeElement(a)} · ${describeElement(b)}) · ${describeElement(
                c,
              )} ≠ ${describeElement(a)} · (${describeElement(b)} · ${describeElement(c)})`,
            )
          }
        })
      })
    })
    return {
      label: "Associativity across property samples",
      holds: failures.length === 0,
      details: failures,
    }
  }

  const checkUnitLaw = (
    samples: readonly GroupAlgebraElement<Basis>[],
  ): HopfDiagnostic => {
    const failures: string[] = []
    samples.forEach((element) => {
      const left = multiplyElements(unitElement(), element)
      const right = multiplyElements(element, unitElement())
      if (!elementsEqual(left, element)) {
        failures.push(`  • 1 · ${describeElement(element)} = ${describeElement(left)}`)
      }
      if (!elementsEqual(right, element)) {
        failures.push(`  • ${describeElement(element)} · 1 = ${describeElement(right)}`)
      }
    })
    return {
      label: "Unit element acts as identity",
      holds: failures.length === 0,
      details: failures,
    }
  }

  const checkCoassociativity = (
    samples: readonly GroupAlgebraElement<Basis>[],
  ): HopfDiagnostic => {
    const failures: string[] = []
    samples.forEach((element) => {
      const delta = comultiplyElement(element)
      const left = applyDeltaLeft(delta)
      const right = applyDeltaRight(delta)
      if (!triplesEqual(left, right)) {
        failures.push(
          `  • (Δ ⊗ id)Δ(${describeElement(element)}) ≠ (id ⊗ Δ)Δ(${describeElement(
            element,
          )})`,
        )
        failures.push(`    Left: ${describeTriple(left)}`)
        failures.push(`    Right: ${describeTriple(right)}`)
      }
    })
    return {
      label: "Comultiplication is coassociative",
      holds: failures.length === 0,
      details: failures,
    }
  }

  const checkCounitLaws = (
    samples: readonly GroupAlgebraElement<Basis>[],
  ): HopfDiagnostic => {
    const failures: string[] = []
    samples.forEach((element) => {
      const delta = comultiplyElement(element)
      const left = applyCounitLeft(delta)
      const right = applyCounitRight(delta)
      if (!elementsEqual(left, element)) {
        failures.push(
          `  • (ε ⊗ id)Δ(${describeElement(element)}) = ${describeElement(left)}`,
        )
      }
      if (!elementsEqual(right, element)) {
        failures.push(
          `  • (id ⊗ ε)Δ(${describeElement(element)}) = ${describeElement(right)}`,
        )
      }
    })
    return {
      label: "Counit recovers the original element",
      holds: failures.length === 0,
      details: failures,
    }
  }

  const checkBialgebraMultiplicationCompatibility = (
    samples: readonly GroupAlgebraElement<Basis>[],
  ): HopfDiagnostic => {
    const failures: string[] = []
    samples.forEach((leftElement) => {
      samples.forEach((rightElement) => {
        const multiplied = multiplyElements(leftElement, rightElement)
        const deltaProduct = comultiplyElement(multiplied)
        const deltaLeft = comultiplyElement(leftElement)
        const deltaRight = comultiplyElement(rightElement)
        const tensorProduct = multiplyTensor(deltaLeft, deltaRight)
        if (!tensorsEqual(deltaProduct, tensorProduct)) {
          failures.push(
            `  • Δ(${describeElement(leftElement)} · ${describeElement(
              rightElement,
            )}) ≠ Δ(${describeElement(leftElement)}) · Δ(${describeElement(rightElement)})`,
          )
          failures.push(`    Δ(left·right): ${describeTensor(deltaProduct)}`)
          failures.push(`    Δ(left)·Δ(right): ${describeTensor(tensorProduct)}`)
        }
      })
    })
    return {
      label: "Δ respects multiplication on samples",
      holds: failures.length === 0,
      details: failures,
    }
  }

  const checkCounitMultiplicationCompatibility = (
    samples: readonly GroupAlgebraElement<Basis>[],
  ): HopfDiagnostic => {
    const failures: string[] = []
    samples.forEach((leftElement) => {
      samples.forEach((rightElement) => {
        const multiplied = multiplyElements(leftElement, rightElement)
        const leftValue = counit(multiplied)
        const rightValue = counit(leftElement) * counit(rightElement)
        if (leftValue !== rightValue) {
          failures.push(
            `  • ε(${describeElement(leftElement)} · ${describeElement(
              rightElement,
            )}) = ${leftValue}, expected ${rightValue}`,
          )
        }
      })
    })
    return {
      label: "ε is multiplicative on samples",
      holds: failures.length === 0,
      details: failures,
    }
  }

  const checkCounitUnitCompatibility = (): HopfDiagnostic => {
    const deltaUnit = comultiplyElement(unitElement())
    const expected = basisTensor(spec.identity, spec.identity)
    const holds = tensorsEqual(deltaUnit, expected)
    const details = holds
      ? []
      : [`  • Δ(1) = ${describeTensor(deltaUnit)}, expected ${describeTensor(expected)}`]
    return { label: "Δ preserves the unit", holds, details }
  }

  const checkAntipode = (
    label: string,
    first: GroupAlgebraLinearMap<Basis>,
    second: GroupAlgebraLinearMap<Basis>,
    samples: readonly GroupAlgebraElement<Basis>[],
  ): HopfDiagnostic => {
    const failures: string[] = []
    samples.forEach((element) => {
      const convolutionResult = convolution(first, second, element)
      const expected = unitCounit(element)
      if (!elementsEqual(convolutionResult, expected)) {
        failures.push(`  • ${label} on ${describeElement(element)}`)
        failures.push(`    Convolution: ${describeElement(convolutionResult)}`)
        failures.push(`    Expected: ${describeElement(expected)}`)
      }
    })
    return { label, holds: failures.length === 0, details: failures }
  }

  return {
    basis: spec.basis,
    makeElement,
    zeroElement,
    unitElement,
    elementFromBasis,
    inverseBasis: spec.inverse,
    multiplyElements,
    comultiplyElement,
    applyLinearMap,
    convolution,
    describeElement,
    describeTensor,
    describeTriple,
    checkAssociativity,
    checkUnitLaw,
    checkCoassociativity,
    checkCounitLaws,
    checkBialgebraMultiplicationCompatibility,
    checkCounitMultiplicationCompatibility,
    checkCounitUnitCompatibility,
    checkAntipode,
  }
}
