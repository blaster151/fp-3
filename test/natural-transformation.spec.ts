import { describe, expect, test } from "vitest"

import type { FunctorCheckSamples } from "../functor"
import {
  constructFunctorWithWitness,
  identityFunctorWithWitness,
} from "../functor"
import {
  constructNaturalTransformationWithWitness,
  functorCategory,
  horizontalCompositeNaturalTransformations,
  identityNaturalTransformation,
  verticalCompositeNaturalTransformations,
  whiskerNaturalTransformationLeft,
  whiskerNaturalTransformationRight,
} from "../natural-transformation"
import type { FinSetMor, FinSetObj } from "../src/all/triangulated"
import { FinSet, makeFinSetObj } from "../src/all/triangulated"

const buildSamples = (arrow: FinSetMor): FunctorCheckSamples<FinSetObj, FinSetMor> => {
  const idDomain = FinSet.id(arrow.from)
  const idCodomain = FinSet.id(arrow.to)
  return {
    objects: [arrow.from, arrow.to],
    arrows: [idDomain, idCodomain, arrow],
    composablePairs: [
      { f: arrow, g: idCodomain },
      { f: idDomain, g: arrow },
    ],
  }
}

const collapseToTerminal = (object: FinSetObj): FinSetMor => FinSet.terminate(object)

const chooseCanonicalGlobal = (object: FinSetObj): FinSetMor => {
  const [first] = FinSet.globals(object)
  if (!first) {
    throw new Error("Expected FinSet.globals to expose a canonical element.")
  }
  return first
}

describe("natural transformation calculus", () => {
  test("constructors, whiskering, and vertical composition respect naturality", () => {
    const source = makeFinSetObj(["0", "1"])
    const target = makeFinSetObj(["x", "y"])
    const collapse: FinSetMor = { from: source, to: target, map: ["x", "x"] }
    const samples = buildSamples(collapse)

    const identity = identityFunctorWithWitness(FinSet, samples)
    const terminalArrow = collapseToTerminal(source)
    const terminal = terminalArrow.to

    const constant = constructFunctorWithWitness(
      FinSet,
      FinSet,
      {
        F0: () => terminal,
        F1: () => FinSet.id(terminal),
      },
      samples,
      ["Constant functor collapsing every object to the terminal set."],
    )

    const naturalityOptions = {
      samples: { objects: samples.objects, arrows: samples.arrows },
      equalMor: FinSet.equalMor,
    }

    const alpha = constructNaturalTransformationWithWitness(
      identity,
      constant,
      collapseToTerminal,
      {
        ...naturalityOptions,
        metadata: ["Collapse-to-terminal natural transformation."],
      },
    )
    const gamma = constructNaturalTransformationWithWitness(
      constant,
      identity,
      chooseCanonicalGlobal,
      {
        ...naturalityOptions,
        metadata: ["Canonical global-element inclusion."],
      },
    )

    expect(alpha.report.holds).toBe(true)
    expect(gamma.report.holds).toBe(true)

    const idIdentity = identityNaturalTransformation(identity, naturalityOptions)
    const idConstant = identityNaturalTransformation(constant, naturalityOptions)

    const alphaThenId = verticalCompositeNaturalTransformations(alpha, idConstant, naturalityOptions)
    const idThenAlpha = verticalCompositeNaturalTransformations(idIdentity, alpha, naturalityOptions)

    const eq = FinSet.equalMor ?? ((left: FinSetMor, right: FinSetMor) => Object.is(left, right))

    const compareComponent = (object: FinSetObj, left: FinSetMor, right: FinSetMor) => {
      expect(eq(left, right)).toBe(true)
    }

    compareComponent(source, alphaThenId.transformation.component(source), alpha.transformation.component(source))
    compareComponent(target, idThenAlpha.transformation.component(target), alpha.transformation.component(target))

    const leftWhisker = whiskerNaturalTransformationLeft(identity, alpha, naturalityOptions)
    const rightWhisker = whiskerNaturalTransformationRight(alpha, identity, naturalityOptions)

    compareComponent(source, leftWhisker.transformation.component(source), alpha.transformation.component(source))
    compareComponent(target, rightWhisker.transformation.component(target), alpha.transformation.component(target))
  })

  test("horizontal/vertical composition satisfy the interchange law", () => {
    const source = makeFinSetObj(["0", "1"])
    const target = makeFinSetObj(["x", "y"])
    const collapse: FinSetMor = { from: source, to: target, map: ["x", "x"] }
    const samples = buildSamples(collapse)

    const identity = identityFunctorWithWitness(FinSet, samples)
    const terminal = collapseToTerminal(source).to
    const constant = constructFunctorWithWitness(
      FinSet,
      FinSet,
      {
        F0: () => terminal,
        F1: () => FinSet.id(terminal),
      },
      samples,
      ["Constant functor collapsing every object to the terminal set."],
    )

    const naturalityOptions = {
      samples: { objects: samples.objects, arrows: samples.arrows },
      equalMor: FinSet.equalMor,
    }

    const alpha = constructNaturalTransformationWithWitness(
      identity,
      constant,
      collapseToTerminal,
      naturalityOptions,
    )
    const gamma = constructNaturalTransformationWithWitness(
      constant,
      identity,
      chooseCanonicalGlobal,
      naturalityOptions,
    )
    const beta = gamma
    const delta = identityNaturalTransformation(identity, naturalityOptions)

    const betaStarAlpha = horizontalCompositeNaturalTransformations(alpha, beta, naturalityOptions)
    const deltaStarGamma = horizontalCompositeNaturalTransformations(gamma, delta, naturalityOptions)
    const lhs = verticalCompositeNaturalTransformations(betaStarAlpha, deltaStarGamma, naturalityOptions)

    const deltaComposeBeta = verticalCompositeNaturalTransformations(beta, delta, naturalityOptions)
    const gammaComposeAlpha = verticalCompositeNaturalTransformations(alpha, gamma, naturalityOptions)
    const rhs = horizontalCompositeNaturalTransformations(
      gammaComposeAlpha,
      deltaComposeBeta,
      naturalityOptions,
    )

    expect(lhs.report.holds).toBe(true)
    expect(rhs.report.holds).toBe(true)

    const eq = FinSet.equalMor ?? ((left: FinSetMor, right: FinSetMor) => Object.is(left, right))
    for (const object of samples.objects ?? []) {
      const leftComponent = lhs.transformation.component(object)
      const rightComponent = rhs.transformation.component(object)
      expect(eq(leftComponent, rightComponent)).toBe(true)
    }
  })

  test("functor category packages identity and composition", () => {
    const source = makeFinSetObj(["0", "1"])
    const target = makeFinSetObj(["x", "y"])
    const collapse: FinSetMor = { from: source, to: target, map: ["x", "x"] }
    const samples = buildSamples(collapse)

    const identity = identityFunctorWithWitness(FinSet, samples)
    const terminal = collapseToTerminal(source).to
    const constant = constructFunctorWithWitness(
      FinSet,
      FinSet,
      {
        F0: () => terminal,
        F1: () => FinSet.id(terminal),
      },
      samples,
      ["Constant functor collapsing every object to the terminal set."],
    )

    const naturalityOptions = {
      samples: { objects: samples.objects, arrows: samples.arrows },
      equalMor: FinSet.equalMor,
    }

    const alpha = constructNaturalTransformationWithWitness(
      identity,
      constant,
      collapseToTerminal,
      naturalityOptions,
    )
    const gamma = constructNaturalTransformationWithWitness(
      constant,
      identity,
      chooseCanonicalGlobal,
      naturalityOptions,
    )

    const functorCat = functorCategory<FinSetObj, FinSetMor, FinSetObj, FinSetMor>(naturalityOptions)

    const idArrow = functorCat.id(identity)
    expect(idArrow.report.holds).toBe(true)

    const composed = functorCat.compose(gamma, alpha)
    expect(composed.report.holds).toBe(true)

    const manual = verticalCompositeNaturalTransformations(alpha, gamma, naturalityOptions)
    const eq = FinSet.equalMor ?? ((left: FinSetMor, right: FinSetMor) => Object.is(left, right))
    for (const object of samples.objects ?? []) {
      expect(eq(composed.transformation.component(object), manual.transformation.component(object))).toBe(true)
    }
  })
})
