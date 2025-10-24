import { FinSet, FinSetElementaryToposWitness } from "../../allTS"
import type { FinSetMor } from "../../allTS"
import type { RunnableExample } from "./types"

const { subobjectClassifier: FinSetSubobjectClassifier, naturalNumbersObject } =
  FinSetElementaryToposWitness

if (!naturalNumbersObject) {
  throw new Error('FinSet elementary topos witness must expose a natural numbers object.')
}

const natural = naturalNumbersObject

const {
  addition: buildAddition,
  primitiveRecursionFromExponential,
  integerCompletion: buildIntegerCompletion,
  certifyDedekindInfinite,
  certifySuccessorZeroSeparation,
  initialAlgebra: buildInitialAlgebra,
} = natural

if (
  !buildAddition ||
  !primitiveRecursionFromExponential ||
  !buildIntegerCompletion ||
  !certifyDedekindInfinite ||
  !certifySuccessorZeroSeparation ||
  !buildInitialAlgebra
) {
  throw new Error('FinSet natural numbers object must expose recursion and certification helpers for this example.')
}

const equalArrow = (left: FinSetMor, right: FinSetMor): boolean => {
  const verdict = FinSet.equalMor?.(left, right)
  if (typeof verdict === "boolean") {
    return verdict
  }
  if (left.from !== right.from || left.to !== right.to) {
    return false
  }
  if (left.map.length !== right.map.length) {
    return false
  }
  return left.map.every((value, index) => value === right.map[index])
}

const formatSuccessorSample = (count: number): readonly string[] => {
  const lines: string[] = []
  for (let index = 0; index < Math.min(count, natural.carrier.elements.length); index += 1) {
    const source = natural.carrier.elements[index]
    if (source === undefined) {
      throw new Error("FinSet carrier missing element during successor sample generation.")
    }
    const imageIndex = natural.successor.map[index]
    if (imageIndex === undefined) {
      throw new Error("FinSet successor map missing image during runnable example generation.")
    }
    const image = natural.carrier.elements[imageIndex]
    if (image === undefined) {
      throw new Error("FinSet successor image index outside carrier bounds during example generation.")
    }
    lines.push(`${source} ↦ ${image}`)
    if (index + 1 >= count) {
      break
    }
  }
  return lines
}

const describeAddition = (
  addition: ReturnType<typeof buildAddition>,
  samples: ReadonlyArray<readonly [number, number]>,
): readonly string[] => {
  const tuples = addition.product.obj.elements as ReadonlyArray<ReadonlyArray<number>>
  const lines: string[] = []
  for (const [left, right] of samples) {
    const tupleIndex = tuples.findIndex(
      (tuple) => tuple[0] === left && tuple[1] === right,
    )
    if (tupleIndex < 0) {
      throw new Error(
        `Requested addition sample (${left}, ${right}) not present in FinSet product carrier.`,
      )
    }
    const tuple = tuples[tupleIndex]
    if (tuple === undefined) {
      throw new Error("Addition tuple lookup produced an out-of-range index.")
    }
    const imageIndex = addition.addition.map[tupleIndex]
    if (imageIndex === undefined) {
      throw new Error("Primitive recursion mediator missing image for addition sample.")
    }
    const value = natural.carrier.elements[imageIndex]
    if (value === undefined) {
      throw new Error("Addition result index outside FinSet carrier bounds during runnable example generation.")
    }
    const saturates =
      value === natural.carrier.elements[natural.carrier.elements.length - 1]
    lines.push(`${left} + ${right} = ${value}${saturates ? " (saturates)" : ""}`)
  }
  return lines
}

const describeIntegerCompletion = (
  completion: ReturnType<typeof buildIntegerCompletion>,
  addition: ReturnType<typeof buildAddition>,
): readonly string[] => {
  const lines: string[] = []

  const relationAgrees = equalArrow(
    completion.relation.compatibility.left,
    completion.relation.compatibility.right,
  )
  const quotientAgrees = equalArrow(
    completion.quotient.compatibility.left,
    completion.quotient.compatibility.right,
  )

  lines.push(`Witness established → ${completion.holds}`)
  lines.push(`Integers carrier size → ${completion.quotient.obj.elements.length}`)
  lines.push(`Relation equalizer agrees → ${relationAgrees}`)
  lines.push(`Coequalizer compatibility holds → ${quotientAgrees}`)

  const tuples = addition.product.obj.elements as ReadonlyArray<ReadonlyArray<number>>
  const quotientMap = completion.quotient.coequalize.map
  const catalog = new Map<number, { difference: number; representative: readonly [number, number] }>()

  quotientMap.forEach((classIndex, tupleIndex) => {
    const tuple = tuples[tupleIndex]
    if (!tuple) {
      throw new Error('FinSet integer completion: tuple missing from ℕ×ℕ carrier.')
    }
    const left = tuple[0]
    const right = tuple[1]
    if (left === undefined || right === undefined) {
      throw new Error("FinSet integer completion tuple missing coordinates.")
    }
    if (!catalog.has(classIndex)) {
      catalog.set(classIndex, { difference: left - right, representative: [left, right] as const })
    }
  })

  const samples: Array<readonly [number, number]> = [
    [2, 1],
    [1, 4],
    [6, 6],
  ]
  lines.push('Sample class summaries:')
  for (const [left, right] of samples) {
    const tupleIndex = tuples.findIndex(
      (tuple) => tuple[0] === left && tuple[1] === right,
    )
    if (tupleIndex < 0) {
      throw new Error(
        `Integer completion sample (${left}, ${right}) not present in FinSet product carrier.`,
      )
    }
    const classIndex = quotientMap[tupleIndex]
    if (classIndex === undefined) {
      throw new Error('Integer completion quotient map missing image for sample tuple.')
    }
    const descriptor = catalog.get(classIndex)
    const summary = descriptor
      ? `difference ${descriptor.difference} via [${descriptor.representative[0]}, ${descriptor.representative[1]}]`
      : `class ${classIndex}`
    lines.push(`  [${left}, ${right}] ↦ ${summary}`)
  }

  return lines
}

const describeDedekind = (
  verdict: ReturnType<typeof certifyDedekindInfinite>,
): readonly string[] => {
  const details = [
    `Point-infinite witness: ${verdict.pointInfinite.details}`,
    `Injective on points → ${verdict.pointInfinite.injective.holds}`,
    `Surjective on points → ${verdict.pointInfinite.surjective.holds}`,
    `Monomorphism certified → ${verdict.monomorphismCertified}`,
  ]
  return [
    `Dedekind-infinite? ${verdict.holds}`,
    ...details,
    `Summary: ${verdict.details}`,
  ]
}

const describeZeroSeparation = (
  verdict: ReturnType<typeof certifySuccessorZeroSeparation>,
): readonly string[] => [
  `Separated? ${verdict.separated}`,
  `Characteristic equals false → ${verdict.equalsFalse}`,
  `Classification matches equalizer → ${verdict.classificationAgrees}`,
  `Details: ${verdict.details}`,
]

const describeInitialAlgebra = (
  verdict: ReturnType<typeof buildInitialAlgebra>,
): readonly string[] => {
  const lines = [`Initial algebra holds? ${verdict.holds}`, `Details: ${verdict.details}`]
  if (verdict.reason) {
    lines.push(`Reason: ${verdict.reason}`)
  }
  if (verdict.morphism) {
    lines.push(`Zero triangle holds → ${verdict.morphism.zeroTriangle.holds}`)
    lines.push(`Successor square holds → ${verdict.morphism.successorSquare.holds}`)
    lines.push(`Comparison triangle holds → ${verdict.morphism.comparison.holds}`)
  }
  return lines
}

const runExample = (): readonly string[] => {
  const lines: string[] = []

  const bound = natural.carrier.elements[natural.carrier.elements.length - 1]
  if (bound === undefined) {
    throw new Error("FinSet natural numbers carrier missing terminal element during runnable example generation.")
  }
  lines.push("== FinSet ℕ witness ==")
  lines.push(`Carrier size → ${natural.carrier.elements.length}`)
  lines.push(`Largest element represented → ${bound}`)
  const zeroImage = natural.zero.map[0]
  if (zeroImage === undefined) {
    throw new Error("FinSet natural numbers zero map missing base image during runnable example generation.")
  }
  lines.push(`Zero global point maps to → ${zeroImage}`)
  lines.push("Successor samples:")
  lines.push(...formatSuccessorSample(6).map((entry) => `  ${entry}`))

  const addition = buildAddition({ label: "addition example" })
  const target = addition.target

  lines.push("", "== Primitive recursion: addition ==")
  lines.push(`Witness established → ${addition.holds}`)
  lines.push(`Details → ${addition.details}`)
  if (addition.reason) {
    lines.push(`Reason → ${addition.reason}`)
  }

  const additionSamples: Array<readonly [number, number]> = [
    [0, 0],
    [1, 3],
    [3, 4],
    [5, 6],
    [15, 2],
    [16, 4],
  ]
  lines.push("Addition samples:")
  lines.push(...describeAddition(addition, additionSamples).map((entry) => `  ${entry}`))

  const exponential = primitiveRecursionFromExponential({
    parameter: addition.parameter,
    target: addition.target,
    base: addition.base,
    step: addition.step,
    label: "addition via exponential",
  })

  lines.push("", "== Exponential recursion comparison ==")
  lines.push(`Agrees with primitive recursion → ${exponential.holds && exponential.primitive.holds}`)
  const evaluationMatchesStep = equalArrow(
    exponential.primitive.compatibility.stepRight,
    exponential.evaluation.composite,
  )
  lines.push(`Evaluation composite matches step → ${evaluationMatchesStep}`)
  lines.push(`Details → ${exponential.details}`)

  const integers = buildIntegerCompletion({
    label: "integer completion example",
    equalMor: equalArrow,
  })

  lines.push("", "== Grothendieck integer completion ==")
  lines.push(...describeIntegerCompletion(integers, addition))

  const dedekind = certifyDedekindInfinite()
  lines.push("", "== Dedekind-infinite successor ==")
  lines.push(...describeDedekind(dedekind))

  const separation = certifySuccessorZeroSeparation()
  lines.push("", "== Zero is not a successor image ==")
  lines.push(...describeZeroSeparation(separation))
  lines.push(
    `Characteristic matches classifier false arrow → ${equalArrow(
      separation.characteristic,
      FinSetSubobjectClassifier.falseArrow,
    )}`,
  )

  const { obj: coproduct } = FinSet.coproduct([FinSet.terminalObj, target])
  const entries = coproduct.elements as ReadonlyArray<{ readonly tag: number; readonly i: number }>
  const algebra: FinSetMor = {
    from: coproduct,
    to: target,
    map: entries.map((entry) =>
      entry.tag === 0 ? 0 : natural.successor.map[entry.i] ?? entry.i,
    ),
  }

  const initial = buildInitialAlgebra({
    target,
    algebra,
    label: "canonical FinSet 1+ℕ-algebra",
  })

  lines.push("", "== Initial 1 + ℕ algebra mediator ==")
  lines.push(...describeInitialAlgebra(initial))

  return lines
}

export const stage086FinSetNaturalNumbersRecursion: RunnableExample = {
  id: "086",
  title: "FinSet natural numbers recursion and infinity",
  outlineReference: 86,
  summary:
    "Derive addition from the FinSet natural-numbers object, compute the Grothendieck integer completion, compare exponential recursion, and certify the successor as Dedekind-infinite.",
  run: async () => ({ logs: runExample() }),
}
