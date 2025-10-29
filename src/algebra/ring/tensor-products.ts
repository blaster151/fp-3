import type { Equality } from "./structures"
import type { Module, ModuleHomomorphism } from "./modules"
import {
  checkModuleHomomorphism,
  dedupeWithEquality as dedupe,
  resolveEquality,
  resolveModuleEquality,
  resolveModuleScalarEquality,
  sampleModuleScalars,
} from "./modules"

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

export interface BilinearCheckOptions<R, Left, Right, Codomain> {
  readonly leftSamples?: ReadonlyArray<Left>
  readonly rightSamples?: ReadonlyArray<Right>
  readonly scalarSamples?: ReadonlyArray<R>
  readonly witnessLimit?: number
  readonly leftEquality?: Equality<Left> | undefined
  readonly rightEquality?: Equality<Right> | undefined
  readonly scalarEquality?: Equality<R> | undefined
  readonly targetEquality?: Equality<Codomain> | undefined
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
  options: BilinearCheckOptions<R, Left, Right, Codomain> = {},
): BilinearCheckResult<R, Left, Right, Codomain> => {
  const leftSampleCandidates = options.leftSamples ?? []
  const rightSampleCandidates = options.rightSamples ?? []
  const scalarSampleCandidates =
    options.scalarSamples ?? sampleModuleScalars(bilinear.left, { equality: options.scalarEquality })

  const leftEq = resolveModuleEquality(bilinear.left, options.leftEquality)
  const rightEq = resolveModuleEquality(bilinear.right, options.rightEquality)
  const scalarEq = resolveModuleScalarEquality(bilinear.left, options.scalarEquality)
  const targetEq = resolveModuleEquality(bilinear.target, options.targetEquality)

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
  readonly leftEquality?: Equality<Left> | undefined
  readonly rightEquality?: Equality<Right> | undefined
  readonly scalarEquality?: Equality<R> | undefined
  readonly tensorEquality?: Equality<Tensor> | undefined
  readonly bilinearTargetEquality?: Equality<unknown> | undefined
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
    options.scalarSamples ?? sampleModuleScalars(structure.left, { equality: options.scalarEquality })
  const tensorSampleCandidates = options.tensorSamples ?? []

  const leftEq = resolveModuleEquality(structure.left, options.leftEquality)
  const rightEq = resolveModuleEquality(structure.right, options.rightEquality)
  const scalarEq = resolveModuleScalarEquality(structure.left, options.scalarEquality)
  const tensorEq = resolveModuleEquality(structure.tensor, options.tensorEquality)

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
      leftEquality: leftEq,
      rightEquality: rightEq,
      scalarEquality: scalarEq,
      targetEquality:
        ((options.bilinearTargetEquality as Equality<any> | undefined) ?? bilinear.target.eq) as
          | Equality<any>
          | undefined,
    })

    if (!bilinearCheck.holds) {
      violations.push({ kind: "bilinearFailure", mapLabel: label, details: bilinearCheck.details })
      continue
    }

    const induced = structure.induce(bilinear)
    const targetEqualityOverride =
      (options.bilinearTargetEquality as Equality<any> | undefined) ??
      bilinear.target.eq ??
      induced.target.eq
    const homomorphismCheck = checkModuleHomomorphism(induced, {
      vectorSamples: tensorSamples,
      scalarSamples,
      targetEquality: targetEqualityOverride,
    })

    if (!homomorphismCheck.holds) {
      violations.push({ kind: "inducedHomomorphism", mapLabel: label, details: homomorphismCheck.details })
    }

    const targetEq = resolveEquality(targetEqualityOverride)

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

export interface ShortExactSequenceWitness<Left, Middle, Right> {
  readonly kernelWitnesses: ReadonlyArray<{ readonly middle: Middle; readonly preimage: Left }>
  readonly surjectionWitnesses: ReadonlyArray<{ readonly right: Right; readonly lift: Middle }>
  readonly injectWitnesses?: ReadonlyArray<Left>
}

export type ShortExactSequenceSample<Left, Middle, Right> =
  | { readonly kind: "kernel"; readonly middle: Middle; readonly preimage?: Left }
  | { readonly kind: "surjection"; readonly right: Right; readonly lift?: Middle }
  | { readonly kind: "inject"; readonly left: Left }

export interface ShortExactSequence<R, Left, Middle, Right> {
  readonly left: Module<R, Left>
  readonly middle: Module<R, Middle>
  readonly right: Module<R, Right>
  readonly include: ModuleHomomorphism<R, Left, Middle>
  readonly project: ModuleHomomorphism<R, Middle, Right>
  readonly witnesses: ShortExactSequenceWitness<Left, Middle, Right>
  readonly label?: string
}

export interface FlatTensorStructures<
  R,
  Left,
  Middle,
  Right,
  Candidate,
  LeftTensor,
  MiddleTensor,
  RightTensor,
> {
  readonly left: TensorProductStructure<R, Left, Candidate, LeftTensor>
  readonly middle: TensorProductStructure<R, Middle, Candidate, MiddleTensor>
  readonly right: TensorProductStructure<R, Right, Candidate, RightTensor>
}

export interface FlatModuleWitness<Left, Middle, Right, Candidate> {
  readonly kind: "kernel" | "surjection" | "composition"
  readonly candidate: Candidate
  readonly left?: Left
  readonly middle?: Middle
  readonly right?: Right
}

export type FlatModuleViolation<Left, Middle, Right, Candidate> =
  | { readonly kind: "missingCandidateSamples" }
  | { readonly kind: "tensorProduct"; readonly stage: "left" | "middle" | "right"; readonly details: string }
  | { readonly kind: "bilinear"; readonly stage: "include" | "project"; readonly details: string }
  | { readonly kind: "witnessInconsistent"; readonly stage: "kernel" | "surjection" | "inject"; readonly details: string }
  | {
      readonly kind: "kernelWitness"
      readonly candidate: Candidate
      readonly middle: Middle
      readonly preimage: Left
    }
  | {
      readonly kind: "surjectionWitness"
      readonly candidate: Candidate
      readonly right: Right
      readonly lift: Middle
    }
  | { readonly kind: "compositionWitness"; readonly candidate: Candidate; readonly left: Left }
  | { readonly kind: "kernelSample"; readonly candidate: Candidate; readonly middle: Middle }
  | { readonly kind: "kernelSampleMissingPreimage"; readonly candidate: Candidate; readonly middle: Middle }
  | { readonly kind: "surjectionSample"; readonly candidate: Candidate; readonly right: Right }
  | { readonly kind: "surjectionSampleMissingLift"; readonly candidate: Candidate; readonly right: Right }
  | { readonly kind: "injectSample"; readonly candidate: Candidate; readonly left: Left }

export interface FlatModuleSampleOptions<
  R,
  Left,
  Middle,
  Right,
  Candidate,
  LeftTensor,
  MiddleTensor,
  RightTensor,
> {
  readonly scalarSamples?: ReadonlyArray<R>
  readonly candidateSamples?: ReadonlyArray<Candidate>
  readonly leftSamples?: ReadonlyArray<Left>
  readonly middleSamples?: ReadonlyArray<Middle>
  readonly rightSamples?: ReadonlyArray<Right>
  readonly leftTensorOptions?: TensorProductCheckOptions<R, Left, Candidate, LeftTensor>
  readonly middleTensorOptions?: TensorProductCheckOptions<R, Middle, Candidate, MiddleTensor>
  readonly rightTensorOptions?: TensorProductCheckOptions<R, Right, Candidate, RightTensor>
  readonly sequenceSamples?: ReadonlyArray<ShortExactSequenceSample<Left, Middle, Right>>
  readonly witnessLimit?: number
}

export interface FlatModuleCheckResult<Left, Middle, Right, Candidate> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<FlatModuleViolation<Left, Middle, Right, Candidate>>
  readonly witnesses: ReadonlyArray<FlatModuleWitness<Left, Middle, Right, Candidate>>
  readonly details: string
  readonly metadata: {
    readonly candidateSampleCandidates: number
    readonly distinctCandidateSamples: number
    readonly leftSamples: number
    readonly middleSamples: number
    readonly rightSamples: number
    readonly kernelWitnesses: number
    readonly surjectionWitnesses: number
    readonly injectWitnesses: number
    readonly additionalKernelSamples: number
    readonly additionalSurjectionSamples: number
    readonly additionalInjectSamples: number
    readonly kernelSampleChecks: number
    readonly surjectionSampleChecks: number
    readonly injectSampleChecks: number
    readonly witnessLimit: number
    readonly witnessesRecorded: number
    readonly bilinearIncludeHolds: boolean
    readonly bilinearProjectHolds: boolean
    readonly tensorLeftHolds: boolean
    readonly tensorMiddleHolds: boolean
    readonly tensorRightHolds: boolean
  }
}

const mergeSamples = <A>(
  provided: ReadonlyArray<A> | undefined,
  extra: ReadonlyArray<A>,
  eq: Equality<A>,
): A[] => {
  if (!provided || provided.length === 0) {
    return dedupe(extra, eq)
  }
  return dedupe([...provided, ...extra], eq)
}

const buildPureTensorSamples = <R, Left, Right, Tensor>(
  structure: TensorProductStructure<R, Left, Right, Tensor>,
  leftSamples: ReadonlyArray<Left>,
  rightSamples: ReadonlyArray<Right>,
  eq: Equality<Tensor>,
): Tensor[] => {
  const tensors: Tensor[] = []
  for (const left of leftSamples) {
    for (const right of rightSamples) {
      const tensor = structure.pureTensor(left, right)
      if (!tensors.some(existing => eq(existing, tensor))) {
        tensors.push(tensor)
      }
    }
  }
  return tensors
}

const dedupeKernelWitnesses = <Left, Middle>(
  witnesses: ReadonlyArray<{ readonly middle: Middle; readonly preimage: Left }>,
  leftEq: Equality<Left>,
  middleEq: Equality<Middle>,
): Array<{ readonly middle: Middle; readonly preimage: Left }> => {
  const result: Array<{ readonly middle: Middle; readonly preimage: Left }> = []
  for (const witness of witnesses) {
    if (
      !result.some(
        existing => leftEq(existing.preimage, witness.preimage) && middleEq(existing.middle, witness.middle),
      )
    ) {
      result.push(witness)
    }
  }
  return result
}

const dedupeSurjectionWitnesses = <Middle, Right>(
  witnesses: ReadonlyArray<{ readonly right: Right; readonly lift: Middle }>,
  middleEq: Equality<Middle>,
  rightEq: Equality<Right>,
): Array<{ readonly right: Right; readonly lift: Middle }> => {
  const result: Array<{ readonly right: Right; readonly lift: Middle }> = []
  for (const witness of witnesses) {
    if (
      !result.some(
        existing => rightEq(existing.right, witness.right) && middleEq(existing.lift, witness.lift),
      )
    ) {
      result.push(witness)
    }
  }
  return result
}

const dedupeInjectWitnesses = <Left>(
  witnesses: ReadonlyArray<Left>,
  leftEq: Equality<Left>,
): Left[] => dedupe(witnesses, leftEq)

export const checkFlatModuleOnSamples = <
  R,
  Left,
  Middle,
  Right,
  Candidate,
  LeftTensor,
  MiddleTensor,
  RightTensor,
>(
  input: {
    readonly sequence: ShortExactSequence<R, Left, Middle, Right>
    readonly candidate: Module<R, Candidate>
    readonly tensors: FlatTensorStructures<R, Left, Middle, Right, Candidate, LeftTensor, MiddleTensor, RightTensor>
  },
  options: FlatModuleSampleOptions<R, Left, Middle, Right, Candidate, LeftTensor, MiddleTensor, RightTensor> = {},
): FlatModuleCheckResult<Left, Middle, Right, Candidate> => {
  const { sequence, candidate, tensors } = input
  const scalarSampleCandidates = options.scalarSamples ?? sampleModuleScalars(sequence.left)
  const candidateSampleCandidates = options.candidateSamples ?? []
  const leftSampleCandidates = options.leftSamples ?? []
  const middleSampleCandidates = options.middleSamples ?? []
  const rightSampleCandidates = options.rightSamples ?? []

  const scalarEq = resolveModuleScalarEquality(sequence.left)
  const candidateEq = resolveModuleEquality(candidate)
  const leftEq = resolveModuleEquality(sequence.left)
  const middleEq = resolveModuleEquality(sequence.middle)
  const rightEq = resolveModuleEquality(sequence.right)
  const leftTensorEq = resolveModuleEquality(tensors.left.tensor)
  const middleTensorEq = resolveModuleEquality(tensors.middle.tensor)
  const rightTensorEq = resolveModuleEquality(tensors.right.tensor)

  const scalarSamples = dedupe(scalarSampleCandidates, scalarEq)
  const candidateSamples = dedupe(candidateSampleCandidates, candidateEq)
  const leftSamples = dedupe(leftSampleCandidates, leftEq)
  const middleSamples = dedupe(middleSampleCandidates, middleEq)
  const rightSamples = dedupe(rightSampleCandidates, rightEq)

  const kernelWitnessCandidates = [...sequence.witnesses.kernelWitnesses]
  const surjectionWitnessCandidates = [...sequence.witnesses.surjectionWitnesses]
  const injectWitnessCandidates = sequence.witnesses.injectWitnesses
    ? [...sequence.witnesses.injectWitnesses]
    : []
  const kernelSamplesWithoutPreimage: Middle[] = []
  const surjectionSamplesWithoutLift: Right[] = []
  const injectSamplesNonKernel: Left[] = []

  for (const sample of options.sequenceSamples ?? []) {
    if (sample.kind === "kernel") {
      if (sample.preimage !== undefined) {
        kernelWitnessCandidates.push({ middle: sample.middle, preimage: sample.preimage })
      } else {
        kernelSamplesWithoutPreimage.push(sample.middle)
      }
    } else if (sample.kind === "surjection") {
      if (sample.lift !== undefined) {
        surjectionWitnessCandidates.push({ right: sample.right, lift: sample.lift })
      } else {
        surjectionSamplesWithoutLift.push(sample.right)
      }
    } else {
      const includeImage = sequence.include.map(sample.left)
      if (middleEq(includeImage, sequence.middle.zero)) {
        injectWitnessCandidates.push(sample.left)
      } else {
        injectSamplesNonKernel.push(sample.left)
      }
    }
  }

  const kernelWitnesses = dedupeKernelWitnesses(kernelWitnessCandidates, leftEq, middleEq)
  const surjectionWitnesses = dedupeSurjectionWitnesses(surjectionWitnessCandidates, middleEq, rightEq)
  const injectWitnesses = dedupeInjectWitnesses(injectWitnessCandidates, leftEq)
  const surjectionLiftCandidates = dedupe(
    surjectionWitnesses.map(witness => witness.lift).concat(middleSamples),
    middleEq,
  )

  const witnessLimit = options.witnessLimit ?? 6
  const violations: FlatModuleViolation<Left, Middle, Right, Candidate>[] = []
  const witnesses: FlatModuleWitness<Left, Middle, Right, Candidate>[] = []
  let kernelSampleChecks = 0
  let surjectionSampleChecks = 0
  let injectSampleChecks = 0

  if (candidateSamples.length === 0) {
    violations.push({ kind: "missingCandidateSamples" })
  }

  const includeBilinear: BilinearMap<R, Left, Candidate, MiddleTensor> = {
    left: sequence.left,
    right: candidate,
    target: tensors.middle.tensor,
    map: (left, module) => tensors.middle.pureTensor(sequence.include.map(left), module),
    label: `${sequence.label ?? "SES"}⊗ι`,
  }

  const projectBilinear: BilinearMap<R, Middle, Candidate, RightTensor> = {
    left: sequence.middle,
    right: candidate,
    target: tensors.right.tensor,
    map: (middle, module) => tensors.right.pureTensor(sequence.project.map(middle), module),
    label: `${sequence.label ?? "SES"}⊗π`,
  }

  const includeBilinearCheck = checkBilinearMap(includeBilinear, {
    leftSamples,
    rightSamples: candidateSamples,
    scalarSamples,
    witnessLimit,
    leftEquality: leftEq,
    rightEquality: candidateEq,
    scalarEquality: scalarEq,
    targetEquality: tensors.middle.tensor.eq,
  })

  if (!includeBilinearCheck.holds) {
    violations.push({ kind: "bilinear", stage: "include", details: includeBilinearCheck.details })
  }

  const projectBilinearCheck = checkBilinearMap(projectBilinear, {
    leftSamples: middleSamples,
    rightSamples: candidateSamples,
    scalarSamples,
    witnessLimit,
    leftEquality: middleEq,
    rightEquality: candidateEq,
    scalarEquality: scalarEq,
    targetEquality: tensors.right.tensor.eq,
  })

  if (!projectBilinearCheck.holds) {
    violations.push({ kind: "bilinear", stage: "project", details: projectBilinearCheck.details })
  }

  const leftTensorOptions = options.leftTensorOptions ?? {}
  const middleTensorOptions = options.middleTensorOptions ?? {}
  const rightTensorOptions = options.rightTensorOptions ?? {}

  const leftTensorPure = buildPureTensorSamples(tensors.left, leftSamples, candidateSamples, leftTensorEq)
  const middleTensorPure = buildPureTensorSamples(tensors.middle, middleSamples, candidateSamples, middleTensorEq)
  const rightTensorPure = buildPureTensorSamples(tensors.right, rightSamples, candidateSamples, rightTensorEq)

  const leftTensorCheck = checkTensorProduct(tensors.left, {
    ...leftTensorOptions,
    leftSamples: mergeSamples(leftTensorOptions.leftSamples, leftSamples, leftEq),
    rightSamples: mergeSamples(leftTensorOptions.rightSamples, candidateSamples, candidateEq),
    scalarSamples: mergeSamples(leftTensorOptions.scalarSamples, scalarSamples, scalarEq),
    tensorSamples: mergeSamples(leftTensorOptions.tensorSamples, leftTensorPure, leftTensorEq),
    leftEquality: leftTensorOptions.leftEquality ?? leftEq,
    rightEquality: leftTensorOptions.rightEquality ?? candidateEq,
    scalarEquality: leftTensorOptions.scalarEquality ?? scalarEq,
    tensorEquality: leftTensorOptions.tensorEquality ?? leftTensorEq,
  })

  if (!leftTensorCheck.holds) {
    violations.push({ kind: "tensorProduct", stage: "left", details: leftTensorCheck.details })
  }

  const middleTensorCheck = checkTensorProduct(tensors.middle, {
    ...middleTensorOptions,
    leftSamples: mergeSamples(middleTensorOptions.leftSamples, middleSamples, middleEq),
    rightSamples: mergeSamples(middleTensorOptions.rightSamples, candidateSamples, candidateEq),
    scalarSamples: mergeSamples(middleTensorOptions.scalarSamples, scalarSamples, scalarEq),
    tensorSamples: mergeSamples(middleTensorOptions.tensorSamples, middleTensorPure, middleTensorEq),
    leftEquality: middleTensorOptions.leftEquality ?? middleEq,
    rightEquality: middleTensorOptions.rightEquality ?? candidateEq,
    scalarEquality: middleTensorOptions.scalarEquality ?? scalarEq,
    tensorEquality: middleTensorOptions.tensorEquality ?? middleTensorEq,
  })

  if (!middleTensorCheck.holds) {
    violations.push({ kind: "tensorProduct", stage: "middle", details: middleTensorCheck.details })
  }

  const rightTensorCheck = checkTensorProduct(tensors.right, {
    ...rightTensorOptions,
    leftSamples: mergeSamples(rightTensorOptions.leftSamples, rightSamples, rightEq),
    rightSamples: mergeSamples(rightTensorOptions.rightSamples, candidateSamples, candidateEq),
    scalarSamples: mergeSamples(rightTensorOptions.scalarSamples, scalarSamples, scalarEq),
    tensorSamples: mergeSamples(rightTensorOptions.tensorSamples, rightTensorPure, rightTensorEq),
    leftEquality: rightTensorOptions.leftEquality ?? rightEq,
    rightEquality: rightTensorOptions.rightEquality ?? candidateEq,
    scalarEquality: rightTensorOptions.scalarEquality ?? scalarEq,
    tensorEquality: rightTensorOptions.tensorEquality ?? rightTensorEq,
  })

  if (!rightTensorCheck.holds) {
    violations.push({ kind: "tensorProduct", stage: "right", details: rightTensorCheck.details })
  }

  const includeTensor = tensors.left.induce(includeBilinear)
  const projectTensor = tensors.middle.induce(projectBilinear)

  const recordWitness = (witness: FlatModuleWitness<Left, Middle, Right, Candidate>) => {
    if (witnesses.length < witnessLimit) {
      witnesses.push(witness)
    }
  }

  for (const kernelWitness of kernelWitnesses) {
    const mapped = sequence.include.map(kernelWitness.preimage)
    if (!middleEq(mapped, kernelWitness.middle)) {
      violations.push({
        kind: "witnessInconsistent",
        stage: "kernel",
        details: "inclusion witness does not land in supplied kernel sample",
      })
      continue
    }
    const projected = sequence.project.map(kernelWitness.middle)
    if (!rightEq(projected, sequence.right.zero)) {
      violations.push({
        kind: "witnessInconsistent",
        stage: "kernel",
        details: "kernel witness does not map to zero under projection",
      })
      continue
    }

    for (const sample of candidateSamples) {
      const tensorImage = includeTensor.map(tensors.left.pureTensor(kernelWitness.preimage, sample))
      const expectedMiddle = tensors.middle.pureTensor(kernelWitness.middle, sample)
      if (!middleTensorEq(tensorImage, expectedMiddle)) {
        violations.push({
          kind: "kernelWitness",
          candidate: sample,
          middle: kernelWitness.middle,
          preimage: kernelWitness.preimage,
        })
      } else {
        const projectedTensor = projectTensor.map(expectedMiddle)
        const expectedProjected = tensors.right.pureTensor(projected, sample)
        if (!rightTensorEq(projectedTensor, expectedProjected)) {
          violations.push({
            kind: "kernelWitness",
            candidate: sample,
            middle: kernelWitness.middle,
            preimage: kernelWitness.preimage,
          })
        } else {
          recordWitness({
            kind: "kernel",
            candidate: sample,
            middle: kernelWitness.middle,
            left: kernelWitness.preimage,
          })
        }
      }
    }
  }

  for (const surjectionWitness of surjectionWitnesses) {
    const mapped = sequence.project.map(surjectionWitness.lift)
    if (!rightEq(mapped, surjectionWitness.right)) {
      violations.push({
        kind: "witnessInconsistent",
        stage: "surjection",
        details: "surjection witness lift does not map to supplied target",
      })
      continue
    }

    for (const sample of candidateSamples) {
      const tensorLift = tensors.middle.pureTensor(surjectionWitness.lift, sample)
      const projectedTensor = projectTensor.map(tensorLift)
      const expectedTensor = tensors.right.pureTensor(surjectionWitness.right, sample)
      if (!rightTensorEq(projectedTensor, expectedTensor)) {
        violations.push({
          kind: "surjectionWitness",
          candidate: sample,
          right: surjectionWitness.right,
          lift: surjectionWitness.lift,
        })
      } else {
        recordWitness({
          kind: "surjection",
          candidate: sample,
          middle: surjectionWitness.lift,
          right: surjectionWitness.right,
        })
      }
    }
  }

  for (const injectWitness of injectWitnesses) {
    const mapped = sequence.include.map(injectWitness)
    if (!middleEq(mapped, sequence.middle.zero)) {
      violations.push({
        kind: "witnessInconsistent",
        stage: "inject",
        details: "injectivity witness does not map to zero in middle module",
      })
      continue
    }

    for (const sample of candidateSamples) {
      const tensorImage = includeTensor.map(tensors.left.pureTensor(injectWitness, sample))
      if (!middleTensorEq(tensorImage, tensors.middle.tensor.zero)) {
        violations.push({ kind: "compositionWitness", candidate: sample, left: injectWitness })
      } else {
        recordWitness({ kind: "composition", candidate: sample, left: injectWitness })
      }
    }
  }

  for (const middleSample of kernelSamplesWithoutPreimage) {
    for (const candidateSample of candidateSamples) {
      kernelSampleChecks++
      const tensorMiddle = tensors.middle.pureTensor(middleSample, candidateSample)
      const projected = projectTensor.map(tensorMiddle)
      if (!rightTensorEq(projected, tensors.right.tensor.zero)) {
        violations.push({ kind: "kernelSample", candidate: candidateSample, middle: middleSample })
        continue
      }

      const generatedByLeftSample = leftSamples.some(leftSample =>
        middleTensorEq(
          includeTensor.map(tensors.left.pureTensor(leftSample, candidateSample)),
          tensorMiddle,
        ),
      )

      const generatedByWitness = kernelWitnesses.some(witness =>
        middleTensorEq(
          includeTensor.map(tensors.left.pureTensor(witness.preimage, candidateSample)),
          tensorMiddle,
        ),
      )

      if (!generatedByLeftSample && !generatedByWitness) {
        violations.push({
          kind: "kernelSampleMissingPreimage",
          candidate: candidateSample,
          middle: middleSample,
        })
      }
    }
  }

  for (const rightSample of surjectionSamplesWithoutLift) {
    for (const candidateSample of candidateSamples) {
      surjectionSampleChecks++
      const targetTensor = tensors.right.pureTensor(rightSample, candidateSample)
      const hasLift = surjectionLiftCandidates.some(liftCandidate => {
        const tensorLift = tensors.middle.pureTensor(liftCandidate, candidateSample)
        const projected = projectTensor.map(tensorLift)
        return rightTensorEq(projected, targetTensor)
      })

      if (!hasLift) {
        violations.push({
          kind: "surjectionSampleMissingLift",
          candidate: candidateSample,
          right: rightSample,
        })
      }
    }
  }

  for (const injectSample of injectSamplesNonKernel) {
    for (const candidateSample of candidateSamples) {
      injectSampleChecks++
      const tensorImage = includeTensor.map(tensors.left.pureTensor(injectSample, candidateSample))
      if (middleTensorEq(tensorImage, tensors.middle.tensor.zero)) {
        violations.push({ kind: "injectSample", candidate: candidateSample, left: injectSample })
      }
    }
  }

  if (candidateSamples.length > 0) {
    for (const leftSample of leftSamples) {
      for (const sample of candidateSamples) {
        const composed = projectTensor.map(
          includeTensor.map(tensors.left.pureTensor(leftSample, sample)),
        )
        const expected = tensors.right.pureTensor(
          sequence.project.map(sequence.include.map(leftSample)),
          sample,
        )
        if (!rightTensorEq(composed, expected)) {
          violations.push({ kind: "compositionWitness", candidate: sample, left: leftSample })
        }
      }
    }
  }

  const holds = violations.length === 0
  const label = sequence.label ?? "short exact sequence"
  const details = holds
    ? `${label} remains exact across ${candidateSamples.length} tensor sample(s).`
    : `${label} failed flatness witnesses on supplied samples.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      candidateSampleCandidates: candidateSampleCandidates.length,
      distinctCandidateSamples: candidateSamples.length,
      leftSamples: leftSamples.length,
      middleSamples: middleSamples.length,
      rightSamples: rightSamples.length,
      kernelWitnesses: kernelWitnesses.length,
      surjectionWitnesses: surjectionWitnesses.length,
      injectWitnesses: injectWitnesses.length,
      additionalKernelSamples: kernelSamplesWithoutPreimage.length,
      additionalSurjectionSamples: surjectionSamplesWithoutLift.length,
      additionalInjectSamples: injectSamplesNonKernel.length,
      kernelSampleChecks,
      surjectionSampleChecks,
      injectSampleChecks,
      witnessLimit,
      witnessesRecorded: witnesses.length,
      bilinearIncludeHolds: includeBilinearCheck.holds,
      bilinearProjectHolds: projectBilinearCheck.holds,
      tensorLeftHolds: leftTensorCheck.holds,
      tensorMiddleHolds: middleTensorCheck.holds,
      tensorRightHolds: rightTensorCheck.holds,
    },
  }
}

