import { FinSet, FinSetNaturalNumbersObject, FinSetSubobjectClassifier } from "../../allTS"
import type { FinSetMor } from "../../allTS"
import type { RunnableExample } from "./types"

const natural = FinSetNaturalNumbersObject

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
    const imageIndex = natural.successor.map[index]
    if (imageIndex === undefined) {
      throw new Error("FinSet successor map missing image during runnable example generation.")
    }
    const image = natural.carrier.elements[imageIndex]
    lines.push(`${source} ↦ ${image}`)
    if (index + 1 >= count) {
      break
    }
  }
  return lines
}

const describeAddition = (
  recursion: ReturnType<typeof natural.primitiveRecursion>,
  product: ReturnType<typeof FinSet.binaryProduct>,
  samples: ReadonlyArray<readonly [number, number]>,
): readonly string[] => {
  const tuples = product.obj.elements as ReadonlyArray<ReadonlyArray<number>>
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
    const imageIndex = recursion.mediator.map[tupleIndex]
    if (imageIndex === undefined) {
      throw new Error("Primitive recursion mediator missing image for addition sample.")
    }
    const value = natural.carrier.elements[imageIndex]
    const saturates =
      value === natural.carrier.elements[natural.carrier.elements.length - 1]
    lines.push(`${left} + ${right} = ${value}${saturates ? " (saturates)" : ""}`)
  }
  return lines
}

const describeDedekind = (
  verdict: ReturnType<typeof natural.certifyDedekindInfinite>,
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
  verdict: ReturnType<typeof natural.certifySuccessorZeroSeparation>,
): readonly string[] => [
  `Separated? ${verdict.separated}`,
  `Characteristic equals false → ${verdict.equalsFalse}`,
  `Classification matches equalizer → ${verdict.classificationAgrees}`,
  `Details: ${verdict.details}`,
]

const describeInitialAlgebra = (
  verdict: ReturnType<typeof natural.initialAlgebra>,
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
  lines.push("== FinSet ℕ witness ==")
  lines.push(`Carrier size → ${natural.carrier.elements.length}`)
  lines.push(`Largest element represented → ${bound}`)
  lines.push(`Zero global point maps to → ${natural.zero.map[0]}`)
  lines.push("Successor samples:")
  lines.push(...formatSuccessorSample(6).map((entry) => `  ${entry}`))

  const parameter = natural.carrier
  const target = natural.carrier
  const base = FinSet.id(parameter)
  const product = FinSet.binaryProduct(target, parameter)
  const step = FinSet.compose(natural.successor, product.proj1)

  const addition = natural.primitiveRecursion({
    parameter,
    target,
    base,
    step,
    label: "addition example",
  })

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
  lines.push(...describeAddition(addition, product, additionSamples).map((entry) => `  ${entry}`))

  const exponential = natural.primitiveRecursionFromExponential({
    parameter,
    target,
    base,
    step,
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

  const dedekind = natural.certifyDedekindInfinite()
  lines.push("", "== Dedekind-infinite successor ==")
  lines.push(...describeDedekind(dedekind))

  const separation = natural.certifySuccessorZeroSeparation()
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

  const initial = natural.initialAlgebra({
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
    "Derive addition from the FinSet natural-numbers object, compare exponential recursion, and certify the successor as Dedekind-infinite.",
  run: async () => ({ logs: runExample() }),
}
