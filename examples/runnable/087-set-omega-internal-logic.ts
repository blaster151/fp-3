import { SetCat } from "../../set-cat"
import type { SetHom } from "../../set-cat"
import {
  ensureSubsetMonomorphism,
  setCharacteristicOfSubset,
  setSubsetFromCharacteristic,
} from "../../set-subobject-classifier"
import type { RunnableExample } from "./types"

const boolGlyph = (value: boolean): string => (value ? "⊤" : "⊥")

const formatSet = <A>(subset: ReadonlySet<A>): string => {
  const entries = [...subset]
  if (entries.length === 0) {
    return "∅"
  }
  return `{ ${entries.join(", ")} }`
}

const describeCharacteristic = <A>(
  label: string,
  ambient: ReadonlyArray<A>,
  characteristic: SetHom<A, boolean>,
): readonly string[] => [
  `${label}:`,
  ...ambient.map((value) => `  ${String(value)} ↦ ${boolGlyph(characteristic.map(value))}`),
]

const validateRoundTrip = <A>(
  label: string,
  ambient: ReadonlyArray<A>,
  inclusion: SetHom<A, A>,
): { readonly characteristic: SetHom<A, boolean>; readonly log: readonly string[] } => {
  ensureSubsetMonomorphism(inclusion, `${label} inclusion`)
  const characteristic = setCharacteristicOfSubset(inclusion)
  const { subset: recoveredSubset, inclusion: recoveredInclusion } =
    setSubsetFromCharacteristic(characteristic)
  const reencoded = setCharacteristicOfSubset(recoveredInclusion)
  const subsetMatches = ambient.every(
    (value) => recoveredSubset.has(value) === inclusion.dom.has(value),
  )
  const characteristicMatches = ambient.every(
    (value) => reencoded.map(value) === characteristic.map(value),
  )
  const log = [
    `${label} subset round-trip → ${subsetMatches && characteristicMatches}`,
    `  Members: ${formatSet(recoveredSubset)}`,
    `  Inclusion preserved → ${subsetMatches}`,
    `  Characteristic preserved → ${characteristicMatches}`,
  ]
  return { characteristic, log }
}

const describeHeytingOperations = (): readonly string[] => {
  const omega = SetCat.omega()
  const truthPairs = [...omega.truthProduct.object]
  truthPairs.sort((left, right) => {
    const leftScore = (left[0] ? 2 : 0) + (left[1] ? 1 : 0)
    const rightScore = (right[0] ? 2 : 0) + (right[1] ? 1 : 0)
    return leftScore - rightScore
  })
  const table = truthPairs.map((pair) => {
    const [p, q] = pair
    const meet = omega.truthAnd.map(pair)
    const join = omega.truthOr.map(pair)
    const implication = omega.truthImplication.map(pair)
    return `(${boolGlyph(p)}, ${boolGlyph(q)}) → ∧ ${boolGlyph(meet)}, ∨ ${boolGlyph(join)}, ⇒ ${boolGlyph(implication)}`
  })
  const negationLines = [...omega.object].map(
    (value) => `${boolGlyph(value)}ᶜ = ${boolGlyph(omega.negation.map(value))}`,
  )
  return [
    "== Ω Heyting operations ==",
    ...table,
    ...negationLines.map((line) => `negation: ${line}`),
  ]
}

const runExample = (): readonly string[] => {
  const lines: string[] = []

  lines.push(...describeHeytingOperations())

  const ambient = SetCat.obj([0, 1, 2, 3, 4])
  const ambientElements = [...ambient]
  lines.push("", "== Subobject classifier on a finite set ==")
  lines.push(`Ambient carrier: ${formatSet(ambient)}`)

  const evens = SetCat.obj([0, 2, 4])
  const atLeastTwo = SetCat.obj([2, 3, 4])

  const evensInclusion = SetCat.hom(evens, ambient, (value) => value)
  const atLeastTwoInclusion = SetCat.hom(atLeastTwo, ambient, (value) => value)

  const evensWitness = validateRoundTrip("Even numbers", ambientElements, evensInclusion)
  const atLeastTwoWitness = validateRoundTrip(
    "Numbers ≥ 2",
    ambientElements,
    atLeastTwoInclusion,
  )

  lines.push(...describeCharacteristic("χ_even", ambientElements, evensWitness.characteristic))
  lines.push(...describeCharacteristic("χ_{≥2}", ambientElements, atLeastTwoWitness.characteristic))
  lines.push(...evensWitness.log)
  lines.push(...atLeastTwoWitness.log)

  const omega = SetCat.omega()

  const productPair = omega.truthProduct.pair(
    evensWitness.characteristic,
    atLeastTwoWitness.characteristic,
  )

  const intersectionCharacteristic = SetCat.compose(omega.truthAnd, productPair)
  const unionCharacteristic = SetCat.compose(omega.truthOr, productPair)
  const implicationCharacteristic = SetCat.compose(omega.truthImplication, productPair)
  const complementCharacteristic = SetCat.compose(omega.negation, evensWitness.characteristic)

  lines.push(...describeCharacteristic("χ_{even ∧ ≥2}", ambientElements, intersectionCharacteristic))
  lines.push(...describeCharacteristic("χ_{even ∨ ≥2}", ambientElements, unionCharacteristic))
  lines.push(...describeCharacteristic("χ_{even ⇒ ≥2}", ambientElements, implicationCharacteristic))
  lines.push(...describeCharacteristic("χ_{¬even}", ambientElements, complementCharacteristic))

  const intersectionRoundTrip = setSubsetFromCharacteristic(intersectionCharacteristic)
  const reencodedIntersection = setCharacteristicOfSubset(intersectionRoundTrip.inclusion)
  const intersectionStable = ambientElements.every(
    (value) =>
      intersectionCharacteristic.map(value) === reencodedIntersection.map(value),
  )

  lines.push(
    "", 
    "== Classifier round-trip on Heyting composites ==",
    `Intersection members: ${formatSet(intersectionRoundTrip.subset)}`,
    `Intersection characteristic stable → ${intersectionStable}`,
  )

  return lines
}

export const stage087SetOmegaInternalLogic: RunnableExample = {
  id: "087",
  title: "Set internal logic via Ω and characteristic maps",
  outlineReference: 87,
  summary:
    "Construct characteristic maps for finite subsets, combine them with Heyting operations, and round-trip through Set’s subobject classifier.",
  run: async () => ({ logs: runExample() }),
}
