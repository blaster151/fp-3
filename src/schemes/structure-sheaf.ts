import type {
  LocalizationFraction,
  LocalizationRingCheckOptions,
  LocalizationRingCheckResult,
  LocalizationRingData,
} from "../algebra/ring/localizations"
import { checkLocalizationRing } from "../algebra/ring/localizations"
import type { Ring } from "../algebra/ring/structures"
import type { Sheaf } from "../sheaves/sheaves"
import type { Site } from "../sheaves/sites"
import type { SimpleCat } from "../../simple-cat"

export interface StructureSheafOpen<A> {
  readonly id: string
  readonly label?: string
  readonly localization: LocalizationRingData<A>
  readonly sections: ReadonlyArray<LocalizationFraction<A>>
  readonly sectionEq?: (left: LocalizationFraction<A>, right: LocalizationFraction<A>) => boolean
  readonly localizationOptions?: LocalizationRingCheckOptions<A>
}

export interface StructureSheafArrow<A> {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly map: (section: LocalizationFraction<A>) => LocalizationFraction<A>
  readonly label?: string
  readonly sectionSamples?: ReadonlyArray<LocalizationFraction<A>>
  readonly ringLawSamples?: ReadonlyArray<LocalizationFraction<A>>
}

export interface StructureSheafCovering<A> {
  readonly id: string
  readonly target: string
  readonly arrowIds: ReadonlyArray<string>
  readonly label?: string
}

export interface StructureSheafData<A> {
  readonly ring: Ring<A>
  readonly opens: ReadonlyArray<StructureSheafOpen<A>>
  readonly arrows: ReadonlyArray<StructureSheafArrow<A>>
  readonly coverings: ReadonlyArray<StructureSheafCovering<A>>
  readonly label?: string
}

export interface StructureSheafCheckOptions<A> {
  readonly localization?: LocalizationRingCheckOptions<A>
  readonly arrowSectionLimit?: number
  readonly witnessLimit?: number
}

export type StructureSheafViolation<A> =
  | { readonly kind: "missingOpen"; readonly arrowId: string; readonly missing: "source" | "target" }
  | { readonly kind: "localizationFailure"; readonly openId: string; readonly result: LocalizationRingCheckResult<A> }
  | {
      readonly kind: "restrictionOutsideSections"
      readonly arrowId: string
      readonly section: LocalizationFraction<A>
      readonly restricted: LocalizationFraction<A>
    }
  | {
      readonly kind: "restrictionDenominator"
      readonly arrowId: string
      readonly section: LocalizationFraction<A>
      readonly restricted: LocalizationFraction<A>
    }
  | {
      readonly kind: "restrictionAddition"
      readonly arrowId: string
      readonly left: LocalizationFraction<A>
      readonly right: LocalizationFraction<A>
      readonly mappedLeft: LocalizationFraction<A>
      readonly mappedRight: LocalizationFraction<A>
      readonly mappedSum: LocalizationFraction<A>
      readonly expected: LocalizationFraction<A>
    }
  | {
      readonly kind: "restrictionMultiplication"
      readonly arrowId: string
      readonly left: LocalizationFraction<A>
      readonly right: LocalizationFraction<A>
      readonly mappedLeft: LocalizationFraction<A>
      readonly mappedRight: LocalizationFraction<A>
      readonly mappedProduct: LocalizationFraction<A>
      readonly expected: LocalizationFraction<A>
    }
  | {
      readonly kind: "restrictionNegation"
      readonly arrowId: string
      readonly section: LocalizationFraction<A>
      readonly mapped: LocalizationFraction<A>
      readonly expected: LocalizationFraction<A>
    }
  | { readonly kind: "restrictionIdentity"; readonly arrowId: string; readonly mapped: LocalizationFraction<A>; readonly expected: LocalizationFraction<A> }
  | { readonly kind: "missingCoveringArrow"; readonly coveringId: string; readonly arrowId: string }

export interface StructureSheafWitness<A> {
  readonly arrowId?: string
  readonly openId?: string
  readonly violation?: StructureSheafViolation<A>
}

export interface StructureSheafCheckMetadata {
  readonly openCount: number
  readonly arrowCount: number
  readonly coveringCount: number
  readonly localizationChecks: number
  readonly localizationFailures: number
  readonly restrictionSamples: number
  readonly additionChecks: number
  readonly multiplicationChecks: number
  readonly negationChecks: number
  readonly identityChecks: number
  readonly witnessLimit: number
  readonly witnessesRecorded: number
}

export interface StructureSheafCheckResult<A> {
  readonly holds: boolean
  readonly violations: ReadonlyArray<StructureSheafViolation<A>>
  readonly witnesses: ReadonlyArray<StructureSheafWitness<A>>
  readonly details: string
  readonly metadata: StructureSheafCheckMetadata
}

const withEquality = <A>(eq?: (left: A, right: A) => boolean): ((left: A, right: A) => boolean) =>
  eq ?? ((left, right) => Object.is(left, right))

const fractionEq = <A>(
  ring: Ring<A>,
  override?: (left: LocalizationFraction<A>, right: LocalizationFraction<A>) => boolean,
): ((left: LocalizationFraction<A>, right: LocalizationFraction<A>) => boolean) => {
  if (override) {
    return override
  }
  const eq = withEquality(ring.eq)
  return (left, right) => eq(left.numerator, right.numerator) && eq(left.denominator, right.denominator)
}

const addFractions = <A>(ring: Ring<A>, left: LocalizationFraction<A>, right: LocalizationFraction<A>): LocalizationFraction<A> => ({
  numerator: ring.add(ring.mul(left.numerator, right.denominator), ring.mul(right.numerator, left.denominator)),
  denominator: ring.mul(left.denominator, right.denominator),
})

const multiplyFractions = <A>(ring: Ring<A>, left: LocalizationFraction<A>, right: LocalizationFraction<A>): LocalizationFraction<A> => ({
  numerator: ring.mul(left.numerator, right.numerator),
  denominator: ring.mul(left.denominator, right.denominator),
})

const negateFraction = <A>(ring: Ring<A>, value: LocalizationFraction<A>): LocalizationFraction<A> => ({
  numerator: ring.neg(value.numerator),
  denominator: value.denominator,
})

const containsSection = <A>(
  open: StructureSheafOpen<A>,
  value: LocalizationFraction<A>,
): boolean => {
  const eq = fractionEq(open.localization.base, open.sectionEq)
  return open.sections.some(section => eq(section, value))
}

const multiplicativeSetContains = <A>(open: StructureSheafOpen<A>, denominator: A): boolean =>
  open.localization.multiplicativeSet.contains(denominator)

const resolveOpen = <A>(data: StructureSheafData<A>, id: string): StructureSheafOpen<A> | undefined =>
  data.opens.find(open => open.id === id)

const resolveArrow = <A>(data: StructureSheafData<A>, id: string): StructureSheafArrow<A> | undefined =>
  data.arrows.find(arrow => arrow.id === id)

export const buildStructureSheafSite = <A>(data: StructureSheafData<A>): Site<string, StructureSheafArrow<A>> => {
  const coveringsByTarget = new Map<string, StructureSheafCovering<A>[]>(
    data.coverings.reduce((entries, covering) => {
      const existing = entries.get(covering.target)
      if (existing) {
        existing.push(covering)
        return entries
      }
      return entries.set(covering.target, [covering])
    }, new Map<string, StructureSheafCovering<A>[]>()),
  )

  const category: SimpleCat<string, StructureSheafArrow<A>> = {
    id: (object) => ({
      id: `id:${object}`,
      from: object,
      to: object,
      label: `id_${object}`,
      map: (section) => ({ ...section }),
    }),
    compose: (g, f) => ({
      id: `${f.id};${g.id}`,
      from: f.from,
      to: g.to,
      label: f.label && g.label ? `${f.label} ∘ ${g.label}` : undefined,
      map: (section) => f.map(g.map(section)),
    }),
    src: (arrow) => arrow.from,
    dst: (arrow) => arrow.to,
  }

  const site: Site<string, StructureSheafArrow<A>> = {
    category,
    coverings: (object) => {
      const coverings = coveringsByTarget.get(object) ?? []
      return coverings.map(covering => ({
        site,
        target: covering.target,
        arrows: covering.arrowIds
          .map(id => resolveArrow(data, id))
          .filter((arrow): arrow is StructureSheafArrow<A> => arrow !== undefined),
        label: covering.label,
      }))
    },
    objectEq: (left, right) => left === right,
    arrowEq: (left, right) => left.id === right.id,
    label: data.label ?? "Structure sheaf site",
  }

  return site
}

export const buildStructureSheaf = <A>(data: StructureSheafData<A>): Sheaf<string, StructureSheafArrow<A>, LocalizationFraction<A>> => {
  const site = buildStructureSheafSite(data)
  const sectionsByOpen = new Map(data.opens.map(open => [open.id, open.sections]))
  const eq = fractionEq(data.ring)

  return {
    site,
    sections: (object) => sectionsByOpen.get(object) ?? [],
    restrict: (arrow, section) => arrow.map(section),
    sectionEq: eq,
    label: data.label ? `${data.label} structure sheaf` : "Structure sheaf",
    glue: (covering, assignments) => {
      const candidates = sectionsByOpen.get(covering.target) ?? []
      for (const candidate of candidates) {
        let compatible = true
        for (const assignment of assignments) {
          const restricted = assignment.arrow.map(candidate)
          if (!eq(restricted, assignment.section)) {
            compatible = false
            break
          }
        }
        if (compatible) {
          return { exists: true, section: candidate }
        }
      }
      return { exists: false, details: `No candidate section matched assignments for covering ${covering.label ?? covering.target}.` }
    },
  }
}

export const checkStructureSheaf = <A>(
  data: StructureSheafData<A>,
  options: StructureSheafCheckOptions<A> = {},
): StructureSheafCheckResult<A> => {
  const witnessLimit = options.witnessLimit ?? 6
  const violations: StructureSheafViolation<A>[] = []
  const witnesses: StructureSheafWitness<A>[] = []

  let localizationFailures = 0
  let localizationChecks = 0
  let restrictionSamples = 0
  let additionChecks = 0
  let multiplicationChecks = 0
  let negationChecks = 0
  let identityChecks = 0

  for (const open of data.opens) {
    const localizationOptions: LocalizationRingCheckOptions<A> = {
      ...options.localization,
      ...open.localizationOptions,
    }
    const result = checkLocalizationRing(open.localization, localizationOptions)
    localizationChecks += 1
    if (!result.holds) {
      localizationFailures += 1
      const violation: StructureSheafViolation<A> = {
        kind: "localizationFailure",
        openId: open.id,
        result,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ openId: open.id, violation })
      }
    }
  }

  const arrowSectionLimit = options.arrowSectionLimit ?? 5

  for (const arrow of data.arrows) {
    const source = resolveOpen(data, arrow.from)
    if (!source) {
      const violation: StructureSheafViolation<A> = { kind: "missingOpen", arrowId: arrow.id, missing: "source" }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ arrowId: arrow.id, violation })
      }
      continue
    }
    const target = resolveOpen(data, arrow.to)
    if (!target) {
      const violation: StructureSheafViolation<A> = { kind: "missingOpen", arrowId: arrow.id, missing: "target" }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ arrowId: arrow.id, violation })
      }
      continue
    }

    const sourceEq = fractionEq(source.localization.base, source.sectionEq)

    const sectionSamples = (arrow.sectionSamples ?? target.sections).slice(0, arrowSectionLimit)
    const ringSamples = (arrow.ringLawSamples ?? sectionSamples).slice(0, arrowSectionLimit)
    for (const section of sectionSamples) {
      restrictionSamples += 1
      const restricted = arrow.map(section)
      if (!multiplicativeSetContains(source, restricted.denominator)) {
        const violation: StructureSheafViolation<A> = {
          kind: "restrictionDenominator",
          arrowId: arrow.id,
          section,
          restricted,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ arrowId: arrow.id, violation })
        }
      }
      if (!containsSection(source, restricted)) {
        const violation: StructureSheafViolation<A> = {
          kind: "restrictionOutsideSections",
          arrowId: arrow.id,
          section,
          restricted,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ arrowId: arrow.id, violation })
        }
      }
    }

    const zeroTarget: LocalizationFraction<A> = { numerator: target.localization.base.zero, denominator: target.localization.base.one }
    const zeroSource: LocalizationFraction<A> = { numerator: source.localization.base.zero, denominator: source.localization.base.one }
    const mappedZero = arrow.map(zeroTarget)
    identityChecks += 1
    if (!sourceEq(mappedZero, zeroSource)) {
      const violation: StructureSheafViolation<A> = {
        kind: "restrictionIdentity",
        arrowId: arrow.id,
        mapped: mappedZero,
        expected: zeroSource,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ arrowId: arrow.id, violation })
      }
    }

    const oneTarget: LocalizationFraction<A> = { numerator: target.localization.base.one, denominator: target.localization.base.one }
    const oneSource: LocalizationFraction<A> = { numerator: source.localization.base.one, denominator: source.localization.base.one }
    const mappedOne = arrow.map(oneTarget)
    identityChecks += 1
    if (!sourceEq(mappedOne, oneSource)) {
      const violation: StructureSheafViolation<A> = {
        kind: "restrictionIdentity",
        arrowId: arrow.id,
        mapped: mappedOne,
        expected: oneSource,
      }
      violations.push(violation)
      if (witnesses.length < witnessLimit) {
        witnesses.push({ arrowId: arrow.id, violation })
      }
    }

    for (const left of ringSamples) {
      const mappedLeft = arrow.map(left)
      const negLeft = negateFraction(target.localization.base, left)
      const mappedNeg = arrow.map(negLeft)
      const negMapped = negateFraction(source.localization.base, mappedLeft)
      negationChecks += 1
      if (!sourceEq(mappedNeg, negMapped)) {
        const violation: StructureSheafViolation<A> = {
          kind: "restrictionNegation",
          arrowId: arrow.id,
          section: left,
          mapped: mappedNeg,
          expected: negMapped,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ arrowId: arrow.id, violation })
        }
      }
    }

    for (const left of ringSamples) {
      for (const right of ringSamples) {
        additionChecks += 1
        const targetSum = addFractions(target.localization.base, left, right)
        const mappedLeft = arrow.map(left)
        const mappedRight = arrow.map(right)
        const mappedSum = arrow.map(targetSum)
        const expected = addFractions(source.localization.base, mappedLeft, mappedRight)
        if (!sourceEq(mappedSum, expected)) {
          const violation: StructureSheafViolation<A> = {
            kind: "restrictionAddition",
            arrowId: arrow.id,
            left,
            right,
            mappedLeft,
            mappedRight,
            mappedSum,
            expected,
          }
          violations.push(violation)
          if (witnesses.length < witnessLimit) {
            witnesses.push({ arrowId: arrow.id, violation })
          }
        }

        multiplicationChecks += 1
        const targetProduct = multiplyFractions(target.localization.base, left, right)
        const mappedProduct = arrow.map(targetProduct)
        const expectedProduct = multiplyFractions(source.localization.base, mappedLeft, mappedRight)
        if (!sourceEq(mappedProduct, expectedProduct)) {
          const violation: StructureSheafViolation<A> = {
            kind: "restrictionMultiplication",
            arrowId: arrow.id,
            left,
            right,
            mappedLeft,
            mappedRight,
            mappedProduct,
            expected: expectedProduct,
          }
          violations.push(violation)
          if (witnesses.length < witnessLimit) {
            witnesses.push({ arrowId: arrow.id, violation })
          }
        }
      }
    }
  }

  for (const covering of data.coverings) {
    for (const arrowId of covering.arrowIds) {
      if (!resolveArrow(data, arrowId)) {
        const violation: StructureSheafViolation<A> = {
          kind: "missingCoveringArrow",
          coveringId: covering.id,
          arrowId,
        }
        violations.push(violation)
        if (witnesses.length < witnessLimit) {
          witnesses.push({ violation })
        }
      }
    }
  }

  const holds = violations.length === 0
  const details = holds
    ? data.label
      ? `Structure sheaf ${data.label} passed localization and restriction diagnostics.`
      : "Structure sheaf passed localization and restriction diagnostics."
    : `${violations.length} structure sheaf violation${violations.length === 1 ? "" : "s"} detected.`

  return {
    holds,
    violations,
    witnesses,
    details,
    metadata: {
      openCount: data.opens.length,
      arrowCount: data.arrows.length,
      coveringCount: data.coverings.length,
      localizationChecks,
      localizationFailures,
      restrictionSamples,
      additionChecks,
      multiplicationChecks,
      negationChecks,
      identityChecks,
      witnessLimit,
      witnessesRecorded: witnesses.length,
    },
  }
}
