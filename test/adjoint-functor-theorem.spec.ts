import { describe, expect, it } from "vitest"
import { identityFunctorWithWitness } from "../functor"
import {
  type CompletenessSample,
  type CompletenessWitness,
  type CocompletenessSample,
  type CocompletenessWitness,
  adjointFromSolutionSet,
  analyzeCompletenessWitness,
  locallySmallCatalogue,
  solutionSetCondition,
  specialAdjointFunctorTheorem,
} from "../adjoint-functor-theorem"
import type { SolutionSetConditionWitness } from "../adjoint-functor-theorem"
import { TwoObjectCategory } from "../two-object-cat"
import type { TwoArrow, TwoObject } from "../two-object-cat"

const idArrow = TwoObjectCategory.id

const DOT: TwoObject = "•"

const trivialConeDiagram = {} as CompletenessSample<unknown, TwoObject, TwoArrow>["diagram"]
const trivialCoconeDiagram = {} as CocompletenessSample<unknown, TwoObject, TwoArrow>["diagram"]

describe("adjoint-functor-theorem infrastructure", () => {
  it("analyzes completeness witnesses built from terminal cones", () => {
    const terminalCone = {
      tip: DOT,
      legs: () => {
        throw new Error("legs should not be evaluated for the empty diagram")
      },
      diagram: trivialConeDiagram,
    }

    const sample: CompletenessSample<unknown, TwoObject, TwoArrow> = {
      indices: [],
      diagram: terminalCone.diagram,
      limit: terminalCone,
      factor: (candidate) =>
        candidate.tip === terminalCone.tip
          ? { factored: true, mediator: idArrow(candidate.tip) }
          : { factored: false, reason: "tips do not match" },
      cones: [terminalCone],
      details: ["Empty-index limit witnesses the terminal object."],
    }

    const witness: CompletenessWitness<TwoObject, TwoArrow> = {
      category: TwoObjectCategory,
      samples: [sample],
      notes: ["Two-object category has a terminal object."],
    }

    const analysis = analyzeCompletenessWitness(witness)
    expect(analysis.holds).toBe(true)
    expect(analysis.samples).toHaveLength(1)
    expect(analysis.samples[0]?.witnesses[0]?.mediator).toEqual(idArrow(DOT))
  })

  it("reports completeness failures when no cones are supplied", () => {
    const emptyWitness: CompletenessWitness<TwoObject, TwoArrow> = {
      category: TwoObjectCategory,
      samples: [
        {
          indices: [],
          diagram: trivialConeDiagram,
          limit: {
            tip: DOT,
            legs: () => {
              throw new Error("unexpected leg access")
            },
            diagram: trivialConeDiagram,
          },
          factor: () => ({ factored: false, reason: "no cones" }),
          cones: [],
        },
      ],
    }

    const analysis = analyzeCompletenessWitness(emptyWitness)
    expect(analysis.holds).toBe(false)
    expect(analysis.samples[0]?.details[0]).toContain("did not include any cones")
  })

  it("verifies solution-set coverage for the identity functor", () => {
    const identity = identityFunctorWithWitness(TwoObjectCategory)
    const candidateArrow = idArrow(DOT)

    const witness = solutionSetCondition<
      TwoObject,
      TwoArrow,
      TwoObject,
      TwoArrow
    >({
      functor: identity,
      target: DOT,
      candidates: [
        {
          object: DOT,
          arrow: candidateArrow,
          factor: ({ arrow, source }) =>
            arrow === candidateArrow && source === DOT
              ? { factored: true, mediator: idArrow(DOT) }
              : { factored: false, reason: "sample mismatch" },
        },
      ],
      tests: [
        {
          source: DOT,
          arrow: candidateArrow,
          label: "identity arrow test",
        },
      ],
    })

    expect(witness.holds).toBe(true)
    expect(witness.verifications[0]?.ok).toBe(true)
    expect(witness.verifications[0]?.chosen?.object).toBe(DOT)
  })

  it("detects solution-set failures when mediators do not compose", () => {
    const identity = identityFunctorWithWitness(TwoObjectCategory)
    const candidateArrow = idArrow(DOT)

    const witness = solutionSetCondition<
      TwoObject,
      TwoArrow,
      TwoObject,
      TwoArrow
    >({
      functor: identity,
      target: DOT,
      candidates: [
        {
          object: DOT,
          arrow: candidateArrow,
          factor: () => ({ factored: true, mediator: TwoObjectCategory.id("★") }),
        },
      ],
      tests: [
        {
          source: DOT,
          arrow: candidateArrow,
        },
      ],
    })

    expect(witness.holds).toBe(false)
    expect(witness.verifications[0]?.ok).toBe(false)
  })

  it("aggregates solution-set witnesses into adjoint feasibility reports", () => {
    const identity = identityFunctorWithWitness(TwoObjectCategory)
    const candidateArrow = idArrow(DOT)

    const solutionWitness: SolutionSetConditionWitness<
      TwoObject,
      TwoArrow,
      TwoObject,
      TwoArrow
    > = solutionSetCondition({
        functor: identity,
        target: DOT,
        candidates: [
          {
            object: DOT,
            arrow: candidateArrow,
            factor: () => ({ factored: true, mediator: idArrow(DOT) }),
          },
        ],
        tests: [
          {
            source: DOT,
            arrow: candidateArrow,
          },
        ],
      })

    const completenessWitness: CompletenessWitness<TwoObject, TwoArrow> = {
      category: TwoObjectCategory,
      samples: [
        {
          indices: [],
          diagram: trivialConeDiagram,
          limit: {
            tip: DOT,
            legs: () => {
              throw new Error("unused")
            },
            diagram: trivialConeDiagram,
          },
          factor: () => ({ factored: true, mediator: idArrow(DOT) }),
          cones: [
            {
              tip: DOT,
              legs: () => {
                throw new Error("unused")
              },
              diagram: trivialConeDiagram,
            },
          ],
        },
      ],
    }

    const result = adjointFromSolutionSet({
      functor: identity,
      completeness: completenessWitness,
      solutionSets: [solutionWitness],
    })

    expect(result.possible).toBe(true)
    expect(result.assignments).toEqual([{ target: DOT, object: DOT }])
  })

  it("evaluates Special Adjoint Functor Theorem hypotheses", () => {
    const identity = identityFunctorWithWitness(TwoObjectCategory)
    const candidateArrow = idArrow(DOT)

    const cocone: CocompletenessSample<unknown, TwoObject, TwoArrow>["colimit"] = {
      coTip: DOT,
      legs: () => {
        throw new Error("no legs for empty diagram")
      },
      diagram: trivialCoconeDiagram,
    }

    const cocompletenessSample: CocompletenessSample<unknown, TwoObject, TwoArrow> = {
      indices: [],
      diagram: trivialCoconeDiagram,
      colimit: cocone,
      factor: (candidate) =>
        candidate.coTip === DOT
          ? { factored: true, mediator: idArrow(DOT) }
          : { factored: false, reason: "coTips differ" },
      cocones: [cocone],
    }

    const cocompleteWitness: CocompletenessWitness<TwoObject, TwoArrow> = {
      category: TwoObjectCategory,
      samples: [cocompletenessSample],
    }

    const solutionWitness = solutionSetCondition<
      TwoObject,
      TwoArrow,
      TwoObject,
      TwoArrow
    >({
      functor: identity,
      target: DOT,
      candidates: [
        {
          object: DOT,
          arrow: candidateArrow,
          factor: () => ({ factored: true, mediator: idArrow(DOT) }),
        },
      ],
      tests: [
        {
          source: DOT,
          arrow: candidateArrow,
        },
      ],
    })

    const locallySmall = locallySmallCatalogue.find((entry) => entry.category === "FinSet") ?? {
      category: "FinSet",
      accessible: true,
      reason: "Finite sets provide the canonical small example.",
    }

    const result = specialAdjointFunctorTheorem<
      TwoObject,
      TwoArrow,
      TwoObject,
      TwoArrow
    >({
      functor: identity,
      cocomplete: cocompleteWitness,
      locallySmall,
      solutionSets: [solutionWitness],
    })

    expect(result.satisfiesHypotheses).toBe(true)
    expect(result.cocompletenessAnalysis.holds).toBe(true)
  })
})
