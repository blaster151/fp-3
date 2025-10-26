import type { Module, ModuleHomomorphism } from "./modules"
import { checkModuleHomomorphism } from "./modules"

type Equality<A> = (left: A, right: A) => boolean

const withEquality = <A>(eq?: Equality<A>): Equality<A> => eq ?? ((left, right) => Object.is(left, right))

const dedupe = <A>(values: ReadonlyArray<A>, eq: Equality<A>): A[] => {
  const result: A[] = []
  for (const value of values) {
    if (!result.some(existing => eq(existing, value))) {
      result.push(value)
    }
  }
  return result
}

const defaultScalarSamples = <R>(module: Module<R, unknown>): R[] => {
  const ring = module.ring
  const eq = withEquality(ring.eq)
  const candidates = [ring.zero, ring.one, ring.neg(ring.one)]
  return dedupe(candidates, eq)
}

export interface BilinearMap<R, Left, Right, Codomain> {
  readonly left: Module<R, Left>
  readonly right: Module<R, Right>
  readonly target: Module<R, Codomain>
  readonly map: (left: Left, right: Right) => Codomain
  readonly label?: string
}

export type BilinearViolation<R, Left, Right> =
  | { readonly kind: "leftZero"; readonly right: Right }
  | { readonly kind: "rightZero"; readonly left: Left }
  | { readonly kind: "leftAdditive"; readonly right: Right; readonly pair: readonly [Left, Left] }
  | { readonly kind: "rightAdditive"; readonly left: Left; readonly pair: readonly [Right, Right] }
  | { readonly kind: "leftScalar"; readonly right: Right; readonly scalar: R; readonly value: Left }
  | { readonly kind: "rightScalar"; readonly left: Left; readonly scalar: R; readonly value: Right }

export interface BilinearWitness<Left, Right, Codomain> {
  readonly left: Left
  readonly right: Right
  readonly value: Codomain
}

export interface BilinearCheckOptions<R, Left, Right> {
  readonly leftSamples?: ReadonlyArray<Left>
  readonly rightSamples?: ReadonlyArray<Right>
  readonly scalarSamples?: ReadonlyArray<R>
  readonly witnessLimit?: number
}

export interface BilinearCheckResult<R, Left, Right, Codomain> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<BilinearViolation<R, Left, Right>>
  readonly witnesses: ReadonlyArray<BilinearWitness<Left, Right, Codomain>>
  readonly details: string
  readonly metadata: {
    readonly leftSampleCandidates: number
    readonly distinctLeftSamples: number
    readonly rightSampleCandidates: number
    readonly distinctRightSamples: number
    readonly scalarSampleCandidates: number
    readonly distinctScalarSamples: number
    readonly zeroChecks: number
    readonly additiveChecks: number
    readonly scalarChecks: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

export const checkBilinearMap = <R, Left, Right, Codomain>(
  bilinear: BilinearMap<R, Left, Right, Codomain>,
  options: BilinearCheckOptions<R, Left, Right> = {},
): BilinearCheckResult<R, Left, Right, Codomain> => {
  const leftSampleCandidates = options.leftSamples ?? []
  const rightSampleCandidates = options.rightSamples ?? []
  const scalarSampleCandidates =
    options.scalarSamples ?? defaultScalarSamples<R>(bilinear.left as Module<R, unknown>)

  const leftEq = withEquality(bilinear.left.eq)
  const rightEq = withEquality(bilinear.right.eq)
  const scalarEq = withEquality(bilinear.left.ring.eq)
  const targetEq = withEquality(bilinear.target.eq)

  const leftSamples = dedupe(leftSampleCandidates, leftEq)
  const rightSamples = dedupe(rightSampleCandidates, rightEq)
  const scalarSamples = dedupe(scalarSampleCandidates, scalarEq)

  const witnessLimit = options.witnessLimit ?? 3

  const violations: BilinearViolation<R, Left, Right>[] = []
  const witnesses: BilinearWitness<Left, Right, Codomain>[] = []

  let zeroChecks = 0
  for (const right of rightSamples) {
    zeroChecks++
    const mapped = bilinear.map(bilinear.left.zero, right)
    if (!targetEq(mapped, bilinear.target.zero)) {
      violations.push({ kind: "leftZero", right })
    }
  }

  for (const left of leftSamples) {
    zeroChecks++
    const mapped = bilinear.map(left, bilinear.right.zero)
    if (!targetEq(mapped, bilinear.target.zero)) {
      violations.push({ kind: "rightZero", left })
    }
  }

  let additiveChecks = 0
  for (const right of rightSamples) {
    for (const [leftAIndex, leftA] of leftSamples.entries()) {
      for (const leftB of leftSamples.slice(leftAIndex)) {
        additiveChecks++
        const sum = bilinear.left.add(leftA, leftB)
        const mappedSum = bilinear.map(sum, right)
        const mappedA = bilinear.map(leftA, right)
        const mappedB = bilinear.map(leftB, right)
        const expected = bilinear.target.add(mappedA, mappedB)
        if (!targetEq(mappedSum, expected)) {
          violations.push({ kind: "leftAdditive", right, pair: [leftA, leftB] })
        }
      }
    }
  }

  for (const left of leftSamples) {
    for (const [rightAIndex, rightA] of rightSamples.entries()) {
      for (const rightB of rightSamples.slice(rightAIndex)) {
        additiveChecks++
        const sum = bilinear.right.add(rightA, rightB)
        const mappedSum = bilinear.map(left, sum)
        const mappedA = bilinear.map(left, rightA)
        const mappedB = bilinear.map(left, rightB)
        const expected = bilinear.target.add(mappedA, mappedB)
        if (!targetEq(mappedSum, expected)) {
          violations.push({ kind: "rightAdditive", left, pair: [rightA, rightB] })
        }
      }
    }
  }

  let scalarChecks = 0
  for (const scalar of scalarSamples) {
    for (const right of rightSamples) {
      for (const left of leftSamples) {
        scalarChecks++
        const scaledLeft = bilinear.left.scalar(scalar, left)
        const mappedScaled = bilinear.map(scaledLeft, right)
        const mapped = bilinear.map(left, right)
        const expected = bilinear.target.scalar(scalar, mapped)
        if (!targetEq(mappedScaled, expected)) {
          violations.push({ kind: "leftScalar", right, scalar, value: left })
        }
      }
    }
  }

  for (const scalar of scalarSamples) {
    for (const left of leftSamples) {
      for (const right of rightSamples) {
        scalarChecks++
        const scaledRight = bilinear.right.scalar(scalar, right)
        const mappedScaled = bilinear.map(left, scaledRight)
        const mapped = bilinear.map(left, right)
        const expected = bilinear.target.scalar(scalar, mapped)
        if (!targetEq(mappedScaled, expected)) {
          violations.push({ kind: "rightScalar", left, scalar, value: right })
        }
      }
    }
  }

  const holds = violations.length === 0

  if (holds) {
    for (const left of leftSamples) {
      for (const right of rightSamples) {
        if (witnesses.length >= witnessLimit) {
          break
        }
        witnesses.push({ left, right, value: bilinear.map(left, right) })
      }
      if (witnesses.length >= witnessLimit) {
        break
      }
    }
  }

  const label = bilinear.label ?? "bilinear map"
  const details = holds
    ? `${label} verified on ${leftSamples.length}×${rightSamples.length} samples.`
    : `${label} failed bilinearity checks.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      leftSampleCandidates: leftSampleCandidates.length,
      distinctLeftSamples: leftSamples.length,
      rightSampleCandidates: rightSampleCandidates.length,
      distinctRightSamples: rightSamples.length,
      scalarSampleCandidates: scalarSampleCandidates.length,
      distinctScalarSamples: scalarSamples.length,
      zeroChecks,
      additiveChecks,
      scalarChecks,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}

export interface TensorProductStructure<R, Left, Right, Tensor> {
  readonly left: Module<R, Left>
  readonly right: Module<R, Right>
  readonly tensor: Module<R, Tensor>
  readonly pureTensor: (left: Left, right: Right) => Tensor
  readonly induce: <Codomain>(
    bilinear: BilinearMap<R, Left, Right, Codomain>,
  ) => ModuleHomomorphism<R, Tensor, Codomain>
  readonly label?: string
}

export type TensorProductViolation<Left, Right, Tensor> =
  | { readonly kind: "missingLeftSamples" }
  | { readonly kind: "missingRightSamples" }
  | { readonly kind: "missingBilinearMaps" }
  | { readonly kind: "bilinearFailure"; readonly mapLabel: string; readonly details: string }
  | { readonly kind: "inducedHomomorphism"; readonly mapLabel: string; readonly details: string }
  | {
      readonly kind: "universalMismatch"
      readonly mapLabel: string
      readonly left: Left
      readonly right: Right
      readonly tensor: Tensor
      readonly expected: unknown
      readonly actual: unknown
    }

export interface TensorProductWitness<Left, Right, Tensor> {
  readonly mapLabel: string
  readonly left: Left
  readonly right: Right
  readonly tensor: Tensor
  readonly value: unknown
}

export interface TensorProductCheckOptions<R, Left, Right, Tensor> {
  readonly leftSamples?: ReadonlyArray<Left>
  readonly rightSamples?: ReadonlyArray<Right>
  readonly scalarSamples?: ReadonlyArray<R>
  readonly tensorSamples?: ReadonlyArray<Tensor>
  readonly bilinearMaps?: ReadonlyArray<BilinearMap<R, Left, Right, any>>
  readonly witnessLimit?: number
}

export interface TensorProductCheckResult<Left, Right, Tensor> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<TensorProductViolation<Left, Right, Tensor>>
  readonly witnesses: ReadonlyArray<TensorProductWitness<Left, Right, Tensor>>
  readonly details: string
  readonly metadata: {
    readonly leftSampleCandidates: number
    readonly distinctLeftSamples: number
    readonly rightSampleCandidates: number
    readonly distinctRightSamples: number
    readonly scalarSampleCandidates: number
    readonly distinctScalarSamples: number
    readonly tensorSampleCandidates: number
    readonly distinctTensorSamples: number
    readonly bilinearMapsChecked: number
    readonly universalPairChecks: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
  }
}

export const checkTensorProduct = <R, Left, Right, Tensor>(
  structure: TensorProductStructure<R, Left, Right, Tensor>,
  options: TensorProductCheckOptions<R, Left, Right, Tensor> = {},
): TensorProductCheckResult<Left, Right, Tensor> => {
  const leftSampleCandidates = options.leftSamples ?? []
  const rightSampleCandidates = options.rightSamples ?? []
  const scalarSampleCandidates =
    options.scalarSamples ?? defaultScalarSamples<R>(structure.left as Module<R, unknown>)
  const tensorSampleCandidates = options.tensorSamples ?? []

  const leftEq = withEquality(structure.left.eq)
  const rightEq = withEquality(structure.right.eq)
  const scalarEq = withEquality(structure.left.ring.eq)
  const tensorEq = withEquality(structure.tensor.eq)

  const leftSamples = dedupe(leftSampleCandidates, leftEq)
  const rightSamples = dedupe(rightSampleCandidates, rightEq)
  const scalarSamples = dedupe(scalarSampleCandidates, scalarEq)

  const pureTensors: Tensor[] = []
  for (const left of leftSamples) {
    for (const right of rightSamples) {
      pureTensors.push(structure.pureTensor(left, right))
    }
  }
  const tensorSamples = dedupe(tensorSampleCandidates.concat(pureTensors), tensorEq)

  const bilinearMaps = options.bilinearMaps ?? []
  const witnessLimit = options.witnessLimit ?? 3

  const violations: TensorProductViolation<Left, Right, Tensor>[] = []
  const witnesses: TensorProductWitness<Left, Right, Tensor>[] = []

  if (leftSamples.length === 0) {
    violations.push({ kind: "missingLeftSamples" })
  }
  if (rightSamples.length === 0) {
    violations.push({ kind: "missingRightSamples" })
  }
  if (bilinearMaps.length === 0) {
    violations.push({ kind: "missingBilinearMaps" })
  }

  let universalPairChecks = 0

  for (const bilinear of bilinearMaps) {
    const label = bilinear.label ?? "bilinear map"
    const bilinearCheck = checkBilinearMap(bilinear, {
      leftSamples,
      rightSamples,
      scalarSamples,
      witnessLimit,
    })

    if (!bilinearCheck.holds) {
      violations.push({ kind: "bilinearFailure", mapLabel: label, details: bilinearCheck.details })
      continue
    }

    const induced = structure.induce(bilinear)
    const homomorphismCheck = checkModuleHomomorphism(induced, {
      vectorSamples: tensorSamples,
      scalarSamples,
    })

    if (!homomorphismCheck.holds) {
      violations.push({ kind: "inducedHomomorphism", mapLabel: label, details: homomorphismCheck.details })
    }

    const targetEq = withEquality(bilinear.target.eq ?? induced.target.eq)

    for (const left of leftSamples) {
      for (const right of rightSamples) {
        universalPairChecks++
        const tensor = structure.pureTensor(left, right)
        const actual = induced.map(tensor)
        const expected = bilinear.map(left, right)

        if (!targetEq(actual, expected)) {
          violations.push({ kind: "universalMismatch", mapLabel: label, left, right, tensor, expected, actual })
        } else if (witnesses.length < witnessLimit) {
          witnesses.push({ mapLabel: label, left, right, tensor, value: expected })
        }
      }
    }
  }

  const holds = violations.length === 0
  const label = structure.label ?? "tensor product"
  const details = holds
    ? `${label} universal property verified against ${bilinearMaps.length} bilinear map(s).`
    : `${label} universal property violations detected.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      leftSampleCandidates: leftSampleCandidates.length,
      distinctLeftSamples: leftSamples.length,
      rightSampleCandidates: rightSampleCandidates.length,
      distinctRightSamples: rightSamples.length,
      scalarSampleCandidates: scalarSampleCandidates.length,
      distinctScalarSamples: scalarSamples.length,
      tensorSampleCandidates: tensorSampleCandidates.length,
      distinctTensorSamples: tensorSamples.length,
      bilinearMapsChecked: bilinearMaps.length,
      universalPairChecks,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}

