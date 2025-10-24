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

const trivialConeDiagram = {} as CompletenessSample<never, TwoObject, TwoArrow>["diagram"]
const trivialCoconeDiagram = {} as CocompletenessSample<never, TwoObject, TwoArrow>["diagram"]

describe("adjoint-functor-theorem infrastructure", () => {
  it("analyzes completeness witnesses built from terminal cones", () => {
    const terminalCone = {
      tip: "•" as const,
      legs: () => {
        throw new Error("legs should not be evaluated for the empty diagram")
      },
      diagram: trivialConeDiagram,
    }

    const sample: CompletenessSample<never, TwoObject, TwoArrow> = {
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
    expect(analysis.samples[0]?.witnesses[0]?.mediator).toEqual(idArrow("•"))
  })

  it("reports completeness failures when no cones are supplied", () => {
    const emptyWitness: CompletenessWitness<TwoObject, TwoArrow> = {
      category: TwoObjectCategory,
      samples: [
        {
          indices: [],
          diagram: trivialConeDiagram,
          limit: {
            tip: "•",
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
    const candidateArrow = idArrow("•")

    const witness = solutionSetCondition({
      functor: identity,
      target: "•",
      candidates: [
        {
          object: "•",
          arrow: candidateArrow,
          factor: ({ arrow, source }) =>
            arrow === candidateArrow && source === "•"
              ? { factored: true, mediator: idArrow("•") }
              : { factored: false, reason: "sample mismatch" },
        },
      ],
      tests: [
        {
          source: "•",
          arrow: candidateArrow,
          label: "identity arrow test",
        },
      ],
    })

    expect(witness.holds).toBe(true)
    expect(witness.verifications[0]?.ok).toBe(true)
    expect(witness.verifications[0]?.chosen?.object).toBe("•")
  })

  it("detects solution-set failures when mediators do not compose", () => {
    const identity = identityFunctorWithWitness(TwoObjectCategory)
    const candidateArrow = idArrow("•")

    const witness = solutionSetCondition({
      functor: identity,
      target: "•",
      candidates: [
        {
          object: "•",
          arrow: candidateArrow,
          factor: () => ({ factored: true, mediator: TwoObjectCategory.id("★") }),
        },
      ],
      tests: [
        {
          source: "•",
          arrow: candidateArrow,
        },
      ],
    })

    expect(witness.holds).toBe(false)
    expect(witness.verifications[0]?.ok).toBe(false)
  })

  it("aggregates solution-set witnesses into adjoint feasibility reports", () => {
    const identity = identityFunctorWithWitness(TwoObjectCategory)
    const candidateArrow = idArrow("•")

    const solutionWitness: SolutionSetConditionWitness<TwoObject, TwoArrow, TwoObject, TwoArrow> =
      solutionSetCondition({
        functor: identity,
        target: "•",
        candidates: [
          {
            object: "•",
            arrow: candidateArrow,
            factor: () => ({ factored: true, mediator: idArrow("•") }),
          },
        ],
        tests: [
          {
            source: "•",
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
            tip: "•",
            legs: () => {
              throw new Error("unused")
            },
            diagram: trivialConeDiagram,
          },
          factor: () => ({ factored: true, mediator: idArrow("•") }),
          cones: [
            {
              tip: "•",
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
    expect(result.assignments).toEqual([{ target: "•", object: "•" }])
  })

  it("evaluates Special Adjoint Functor Theorem hypotheses", () => {
    const identity = identityFunctorWithWitness(TwoObjectCategory)
    const candidateArrow = idArrow("•")

    const cocone: CocompletenessSample<never, TwoObject, TwoArrow>["colimit"] = {
      coTip: "•",
      legs: () => {
        throw new Error("no legs for empty diagram")
      },
      diagram: trivialCoconeDiagram,
    }

    const cocompletenessSample: CocompletenessSample<never, TwoObject, TwoArrow> = {
      indices: [],
      diagram: trivialCoconeDiagram,
      colimit: cocone,
      factor: (candidate) =>
        candidate.coTip === "•"
          ? { factored: true, mediator: idArrow("•") }
          : { factored: false, reason: "coTips differ" },
      cocones: [cocone],
    }

    const cocompleteWitness: CocompletenessWitness<TwoObject, TwoArrow> = {
      category: TwoObjectCategory,
      samples: [cocompletenessSample],
    }

    const solutionWitness = solutionSetCondition({
      functor: identity,
      target: "•",
      candidates: [
        {
          object: "•",
          arrow: candidateArrow,
          factor: () => ({ factored: true, mediator: idArrow("•") }),
        },
      ],
      tests: [
        {
          source: "•",
          arrow: candidateArrow,
        },
      ],
    })

    const locallySmall = locallySmallCatalogue.find((entry) => entry.category === "FinSet") ?? {
      category: "FinSet",
      accessible: true,
      reason: "Finite sets provide the canonical small example.",
    }

    const result = specialAdjointFunctorTheorem({
      functor: identity,
      cocomplete: cocompleteWitness,
      locallySmall,
      solutionSets: [solutionWitness],
    })

    expect(result.satisfiesHypotheses).toBe(true)
    expect(result.cocompletenessAnalysis.holds).toBe(true)
  })
})
