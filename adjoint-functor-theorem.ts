import type { SimpleCat } from "./simple-cat"
import type { FunctorWithWitness } from "./functor"
import type { UniversalMediationResult } from "./adjunction"
import { CategoryLimits } from "./stdlib/category-limits"

type Equality<Arr> = ((left: Arr, right: Arr) => boolean) | undefined

type SimpleCatWithEquality<Obj, Arr> = SimpleCat<Obj, Arr> & {
  readonly eq?: (left: Arr, right: Arr) => boolean
  readonly equalMor?: (left: Arr, right: Arr) => boolean
}

const arrowEquality = <Obj, Arr>(category: SimpleCat<Obj, Arr>): Equality<Arr> => {
  const enriched = category as SimpleCatWithEquality<Obj, Arr>
  if (typeof enriched.eq === "function") {
    return enriched.eq.bind(enriched)
  }
  if (typeof enriched.equalMor === "function") {
    return enriched.equalMor.bind(enriched)
  }
  return undefined
}

const verifyConeFactorization = <I, Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  equality: Equality<Arr>,
  indices: ReadonlyArray<I>,
  limit: CategoryLimits.Cone<I, Obj, Arr>,
  candidate: CategoryLimits.Cone<I, Obj, Arr>,
  result: UniversalMediationResult<Arr>,
): { readonly ok: true; readonly mediator: Arr } | { readonly ok: false; readonly reason: string } => {
  if (!result.factored || !result.mediator) {
    return { ok: false, reason: result.reason ?? "Limit factorization did not provide a mediator." }
  }

  for (const index of indices) {
    const limitLeg = limit.legs(index)
    const candidateLeg = candidate.legs(index)
    const composite = category.compose(limitLeg, result.mediator)
    const matches = equality ? equality(candidateLeg, composite) : Object.is(candidateLeg, composite)
    if (!matches) {
      return {
        ok: false,
        reason: `Limit leg ${String(index)} failed to commute with the factored mediator.`,
      }
    }
  }

  return { ok: true, mediator: result.mediator }
}

const verifyCoconeFactorization = <I, Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  equality: Equality<Arr>,
  indices: ReadonlyArray<I>,
  colimit: CategoryLimits.Cocone<I, Obj, Arr>,
  candidate: CategoryLimits.Cocone<I, Obj, Arr>,
  result: UniversalMediationResult<Arr>,
): { readonly ok: true; readonly mediator: Arr } | { readonly ok: false; readonly reason: string } => {
  if (!result.factored || !result.mediator) {
    return { ok: false, reason: result.reason ?? "Colimit factorization did not provide a mediator." }
  }

  for (const index of indices) {
    const colimitLeg = colimit.legs(index)
    const candidateLeg = candidate.legs(index)
    const composite = category.compose(result.mediator, colimitLeg)
    const matches = equality ? equality(candidateLeg, composite) : Object.is(candidateLeg, composite)
    if (!matches) {
      return {
        ok: false,
        reason: `Colimit leg ${String(index)} failed to commute with the factored mediator.`,
      }
    }
  }

  return { ok: true, mediator: result.mediator }
}

export interface CompletenessSample<I, Obj, Arr> {
  readonly label?: string
  readonly indices: ReadonlyArray<I>
  readonly diagram: CategoryLimits.Cone<I, Obj, Arr>["diagram"]
  readonly limit: CategoryLimits.Cone<I, Obj, Arr>
  readonly factor: (
    candidate: CategoryLimits.Cone<I, Obj, Arr>,
  ) => UniversalMediationResult<Arr>
  readonly cones: ReadonlyArray<CategoryLimits.Cone<I, Obj, Arr>>
  readonly details?: ReadonlyArray<string>
}

export interface CompletenessSampleWitness<Obj, Arr> {
  readonly coneTip: Obj
  readonly mediator: Arr
}

export interface CompletenessSampleAnalysis<I, Obj, Arr> {
  readonly sample: CompletenessSample<I, Obj, Arr>
  readonly holds: boolean
  readonly witnesses: ReadonlyArray<CompletenessSampleWitness<Obj, Arr>>
  readonly details: ReadonlyArray<string>
}

export interface CompletenessWitness<Obj, Arr> {
  readonly category: SimpleCat<Obj, Arr>
  readonly samples: ReadonlyArray<CompletenessSample<unknown, Obj, Arr>>
  readonly notes?: ReadonlyArray<string>
}

export interface CompletenessWitnessAnalysis<Obj, Arr> {
  readonly holds: boolean
  readonly samples: ReadonlyArray<CompletenessSampleAnalysis<unknown, Obj, Arr>>
  readonly notes: ReadonlyArray<string>
}

export const analyzeCompletenessWitness = <Obj, Arr>(
  witness: CompletenessWitness<Obj, Arr>,
): CompletenessWitnessAnalysis<Obj, Arr> => {
  const equality = arrowEquality(witness.category)
  const analyses: CompletenessSampleAnalysis<unknown, Obj, Arr>[] = []
  const notes: string[] = []
  let holds = true

  for (const sample of witness.samples) {
    if (sample.cones.length === 0) {
      holds = false
      analyses.push({
        sample,
        holds: false,
        witnesses: [],
        details: ["Completeness sample did not include any cones to factor through the limit."],
      })
      continue
    }

    const witnesses: CompletenessSampleWitness<Obj, Arr>[] = []
    const sampleNotes: string[] = []
    let sampleHolds = true

    for (const cone of sample.cones) {
      const result = sample.factor(cone)
      const verdict = verifyConeFactorization(
        witness.category,
        equality,
        sample.indices,
        sample.limit,
        cone,
        result,
      )
      if (!verdict.ok) {
        sampleHolds = false
        sampleNotes.push(verdict.reason)
        break
      }
      witnesses.push({ coneTip: cone.tip, mediator: verdict.mediator })
    }

    if (sample.details) {
      sampleNotes.push(...sample.details)
    }
    if (sample.label) {
      sampleNotes.push(`Sample label: ${sample.label}.`)
    }

    analyses.push({ sample, holds: sampleHolds, witnesses, details: sampleNotes })
    if (!sampleHolds) {
      holds = false
    }
  }

  if (witness.notes) {
    notes.push(...witness.notes)
  }
  notes.push(`Analyzed ${analyses.length} completeness sample${analyses.length === 1 ? "" : "s"}.`)

  return { holds, samples: analyses, notes }
}

export interface CocompletenessSample<I, Obj, Arr> {
  readonly label?: string
  readonly indices: ReadonlyArray<I>
  readonly diagram: CategoryLimits.Cocone<I, Obj, Arr>["diagram"]
  readonly colimit: CategoryLimits.Cocone<I, Obj, Arr>
  readonly factor: (
    candidate: CategoryLimits.Cocone<I, Obj, Arr>,
  ) => UniversalMediationResult<Arr>
  readonly cocones: ReadonlyArray<CategoryLimits.Cocone<I, Obj, Arr>>
  readonly details?: ReadonlyArray<string>
}

export interface CocompletenessSampleWitness<Obj, Arr> {
  readonly coconeTip: Obj
  readonly mediator: Arr
}

export interface CocompletenessSampleAnalysis<I, Obj, Arr> {
  readonly sample: CocompletenessSample<I, Obj, Arr>
  readonly holds: boolean
  readonly witnesses: ReadonlyArray<CocompletenessSampleWitness<Obj, Arr>>
  readonly details: ReadonlyArray<string>
}

export interface CocompletenessWitness<Obj, Arr> {
  readonly category: SimpleCat<Obj, Arr>
  readonly samples: ReadonlyArray<CocompletenessSample<unknown, Obj, Arr>>
  readonly notes?: ReadonlyArray<string>
}

export interface CocompletenessWitnessAnalysis<Obj, Arr> {
  readonly holds: boolean
  readonly samples: ReadonlyArray<CocompletenessSampleAnalysis<unknown, Obj, Arr>>
  readonly notes: ReadonlyArray<string>
}

export const analyzeCocompletenessWitness = <Obj, Arr>(
  witness: CocompletenessWitness<Obj, Arr>,
): CocompletenessWitnessAnalysis<Obj, Arr> => {
  const equality = arrowEquality(witness.category)
  const analyses: CocompletenessSampleAnalysis<unknown, Obj, Arr>[] = []
  const notes: string[] = []
  let holds = true

  for (const sample of witness.samples) {
    if (sample.cocones.length === 0) {
      holds = false
      analyses.push({
        sample,
        holds: false,
        witnesses: [],
        details: ["Cocompleteness sample did not include any cocones to factor through the colimit."],
      })
      continue
    }

    const witnesses: CocompletenessSampleWitness<Obj, Arr>[] = []
    const sampleNotes: string[] = []
    let sampleHolds = true

    for (const cocone of sample.cocones) {
      const result = sample.factor(cocone)
      const verdict = verifyCoconeFactorization(
        witness.category,
        equality,
        sample.indices,
        sample.colimit,
        cocone,
        result,
      )
      if (!verdict.ok) {
        sampleHolds = false
        sampleNotes.push(verdict.reason)
        break
      }
      witnesses.push({ coconeTip: cocone.coTip, mediator: verdict.mediator })
    }

    if (sample.details) {
      sampleNotes.push(...sample.details)
    }
    if (sample.label) {
      sampleNotes.push(`Sample label: ${sample.label}.`)
    }

    analyses.push({ sample, holds: sampleHolds, witnesses, details: sampleNotes })
    if (!sampleHolds) {
      holds = false
    }
  }

  if (witness.notes) {
    notes.push(...witness.notes)
  }
  notes.push(`Analyzed ${analyses.length} cocompleteness sample${analyses.length === 1 ? "" : "s"}.`)

  return { holds, samples: analyses, notes }
}

export interface SolutionSetCandidate<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly object: SrcObj
  readonly arrow: TgtArr
  readonly factor: (
    request: { readonly arrow: TgtArr; readonly source: SrcObj },
  ) => UniversalMediationResult<SrcArr>
  readonly notes?: ReadonlyArray<string>
}

export interface SolutionSetTest<SrcObj, TgtArr> {
  readonly label?: string
  readonly source: SrcObj
  readonly arrow: TgtArr
}

export interface SolutionSetConditionInput<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>
  readonly target: TgtObj
  readonly candidates: ReadonlyArray<SolutionSetCandidate<SrcObj, SrcArr, TgtObj, TgtArr>>
  readonly tests: ReadonlyArray<SolutionSetTest<SrcObj, TgtArr>>
  readonly details?: ReadonlyArray<string>
}

export interface SolutionSetVerification<SrcObj, SrcArr, TgtArr> {
  readonly test: SolutionSetTest<SrcObj, TgtArr>
  readonly chosen?: SolutionSetCandidate<SrcObj, SrcArr, unknown, TgtArr>
  readonly result: UniversalMediationResult<SrcArr>
  readonly ok: boolean
  readonly details: ReadonlyArray<string>
}

export interface SolutionSetConditionWitness<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly target: TgtObj
  readonly verifications: ReadonlyArray<SolutionSetVerification<SrcObj, SrcArr, TgtArr>>
  readonly holds: boolean
  readonly details: ReadonlyArray<string>
}

const composeAndCompare = <Obj, Arr>(
  category: SimpleCat<Obj, Arr>,
  equality: Equality<Arr>,
  expected: Arr,
  left: Arr,
  right: Arr,
): boolean => {
  const composite = category.compose(left, right)
  return equality ? equality(expected, composite) : Object.is(expected, composite)
}

export const solutionSetCondition = <SrcObj, SrcArr, TgtObj, TgtArr>(
  input: SolutionSetConditionInput<SrcObj, SrcArr, TgtObj, TgtArr>,
): SolutionSetConditionWitness<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const { functor, target, candidates, tests } = input
  const categoryD = functor.witness.target
  const categoryC = functor.witness.source
  const equalityD = arrowEquality(categoryD)

  const verifications: SolutionSetVerification<SrcObj, SrcArr, TgtArr>[] = []
  let holds = true

  for (const test of tests) {
    const testNotes: string[] = []

    const pushVerification = (verification: SolutionSetVerification<SrcObj, SrcArr, TgtArr>) => {
      const decoratedDetails =
        test.label === undefined
          ? verification.details
          : [...verification.details, `Test label: ${test.label}.`]
      const finalVerification =
        decoratedDetails === verification.details
          ? verification
          : { ...verification, details: decoratedDetails }
      verifications.push(finalVerification)
      if (!verification.ok) {
        holds = false
      }
    }

    if (categoryD.src(test.arrow) !== target) {
      pushVerification({
        test,
        ok: false,
        result: { factored: false, reason: "Domain mismatch for solution-set test." },
        details: [...testNotes, "Test arrow does not originate at the requested target object."],
      })
      continue
    }

    const expectedCodomain = functor.functor.F0(test.source)
    if (categoryD.dst(test.arrow) !== expectedCodomain) {
      pushVerification({
        test,
        ok: false,
        result: { factored: false, reason: "Codomain mismatch for solution-set test." },
        details: [...testNotes, "Test arrow does not land in the image of the proposed source object."],
      })
      continue
    }

    let verification: SolutionSetVerification<SrcObj, SrcArr, TgtArr> | undefined

    for (const candidate of candidates) {
      if (categoryD.src(candidate.arrow) !== target) {
        continue
      }
      if (candidate.notes) {
        testNotes.push(...candidate.notes)
      }
      const result = candidate.factor({ arrow: test.arrow, source: test.source })
      if (!result.factored || !result.mediator) {
        testNotes.push(result.reason ?? "Candidate failed to provide a mediator.")
        continue
      }

      const mappedMediator = functor.functor.F1(result.mediator)
      const ok = composeAndCompare(categoryD, equalityD, test.arrow, mappedMediator, candidate.arrow)
      if (!ok) {
        testNotes.push("Mediator failed to reproduce the target arrow after applying the functor.")
        continue
      }

      const candidateCodomain = functor.functor.F0(candidate.object)
      if (categoryD.dst(candidate.arrow) !== candidateCodomain) {
        testNotes.push("Candidate arrow does not land in the functor image of its advertised object.")
        continue
      }

      const mediatorSource = categoryC.src(result.mediator)
      const mediatorTarget = categoryC.dst(result.mediator)
      if (mediatorSource !== candidate.object || mediatorTarget !== test.source) {
        testNotes.push("Mediator does not connect the candidate object to the test source.")
        continue
      }

      verification = {
        test,
        chosen: candidate,
        result,
        ok: true,
        details: [...testNotes],
      }
      break
    }

    if (verification) {
      pushVerification(verification)
    } else {
      pushVerification({
        test,
        ok: false,
        result: { factored: false, reason: "No candidate factored the test arrow." },
        details: [...testNotes],
      })
    }
  }

  const details: string[] = []
  if (input.details) {
    details.push(...input.details)
  }
  details.push(
    holds
      ? `Verified solution-set coverage on ${verifications.length} arrow sample${verifications.length === 1 ? "" : "s"}.`
      : "Solution-set coverage failed on at least one supplied arrow.",
  )

  return { target, verifications, holds, details }
}

export interface AdjointFromSolutionSetInput<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>
  readonly completeness?: CompletenessWitness<SrcObj, SrcArr>
  readonly solutionSets: ReadonlyArray<SolutionSetConditionWitness<SrcObj, SrcArr, TgtObj, TgtArr>>
}

export interface AdjointAssignment<SrcObj, TgtObj> {
  readonly target: TgtObj
  readonly object: SrcObj
}

export interface AdjointFromSolutionSetResult<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly possible: boolean
  readonly assignments?: ReadonlyArray<AdjointAssignment<SrcObj, TgtObj>>
  readonly reason?: string
  readonly completenessAnalysis?: CompletenessWitnessAnalysis<SrcObj, SrcArr>
  readonly solutionAnalyses: ReadonlyArray<SolutionSetConditionWitness<SrcObj, SrcArr, TgtObj, TgtArr>>
}

export const adjointFromSolutionSet = <SrcObj, SrcArr, TgtObj, TgtArr>(
  input: AdjointFromSolutionSetInput<SrcObj, SrcArr, TgtObj, TgtArr>,
): AdjointFromSolutionSetResult<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const { completeness, solutionSets } = input
  const assignments: AdjointAssignment<SrcObj, TgtObj>[] = []
  let completenessAnalysis: CompletenessWitnessAnalysis<SrcObj, SrcArr> | undefined

  if (completeness) {
    completenessAnalysis = analyzeCompletenessWitness(completeness)
    if (!completenessAnalysis.holds) {
      return {
        possible: false,
        reason: "Supplied completeness witness failed its internal diagnostics.",
        ...(
          completenessAnalysis
            ? { completenessAnalysis }
            : {}
        ),
        solutionAnalyses: solutionSets,
      }
    }
  }

  for (const witness of solutionSets) {
    if (!witness.holds) {
      return {
        possible: false,
        reason: "At least one solution-set witness failed to cover the provided arrows.",
        ...(
          completenessAnalysis
            ? { completenessAnalysis }
            : {}
        ),
        solutionAnalyses: solutionSets,
      }
    }

    const successful = witness.verifications.find((verification) => verification.ok && verification.chosen)
    if (successful && successful.chosen) {
      assignments.push({ target: witness.target, object: successful.chosen.object })
    }
  }

  if (assignments.length === 0) {
    return {
      possible: false,
      reason: "No solution-set witness supplied a successful mediator to seed the adjoint construction.",
      ...(
        completenessAnalysis
          ? { completenessAnalysis }
          : {}
      ),
      solutionAnalyses: solutionSets,
    }
  }

  return {
    possible: true,
    assignments,
    ...(
      completenessAnalysis
        ? { completenessAnalysis }
        : {}
    ),
    solutionAnalyses: solutionSets,
  }
}

export interface LocallySmallMetadata {
  readonly category: string
  readonly accessible: boolean
  readonly reason: string
}

export interface SpecialAdjointFunctorTheoremInput<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>
  readonly cocomplete: CocompletenessWitness<TgtObj, TgtArr>
  readonly locallySmall: LocallySmallMetadata
  readonly solutionSets: ReadonlyArray<SolutionSetConditionWitness<SrcObj, SrcArr, TgtObj, TgtArr>>
}

export interface SpecialAdjointFunctorTheoremResult<SrcObj, SrcArr, TgtObj, TgtArr> {
  readonly satisfiesHypotheses: boolean
  readonly cocompletenessAnalysis: CocompletenessWitnessAnalysis<TgtObj, TgtArr>
  readonly solutionSets: ReadonlyArray<SolutionSetConditionWitness<SrcObj, SrcArr, TgtObj, TgtArr>>
  readonly locallySmall: LocallySmallMetadata
  readonly reason?: string
}

export const specialAdjointFunctorTheorem = <SrcObj, SrcArr, TgtObj, TgtArr>(
  input: SpecialAdjointFunctorTheoremInput<SrcObj, SrcArr, TgtObj, TgtArr>,
): SpecialAdjointFunctorTheoremResult<SrcObj, SrcArr, TgtObj, TgtArr> => {
  const cocompletenessAnalysis = analyzeCocompletenessWitness(input.cocomplete)
  if (!cocompletenessAnalysis.holds) {
    return {
      satisfiesHypotheses: false,
      cocompletenessAnalysis,
      solutionSets: input.solutionSets,
      locallySmall: input.locallySmall,
      reason: "Target category fails the cocompleteness diagnostics required by SAFT.",
    }
  }

  const solutionFailure = input.solutionSets.find((witness) => !witness.holds)
  if (solutionFailure) {
    return {
      satisfiesHypotheses: false,
      cocompletenessAnalysis,
      solutionSets: input.solutionSets,
      locallySmall: input.locallySmall,
      reason: "At least one solution-set witness failed; SAFT hypotheses are unmet.",
    }
  }

  if (!input.locallySmall.accessible) {
    return {
      satisfiesHypotheses: false,
      cocompletenessAnalysis,
      solutionSets: input.solutionSets,
      locallySmall: input.locallySmall,
      reason: input.locallySmall.reason,
    }
  }

  return {
    satisfiesHypotheses: true,
    cocompletenessAnalysis,
    solutionSets: input.solutionSets,
    locallySmall: input.locallySmall,
  }
}

export const locallySmallCatalogue: ReadonlyArray<LocallySmallMetadata> = [
  {
    category: "FinSet",
    accessible: true,
    reason: "Finite sets are locally small and all colimits are computed setwise.",
  },
  {
    category: "Set",
    accessible: true,
    reason: "Set is locally small and every diagram admits a small colimit computed pointwise.",
  },
  {
    category: "Grp",
    accessible: true,
    reason: "Grp is locally small; filtered colimits and coproducts exist and preserve smallness.",
  },
]
