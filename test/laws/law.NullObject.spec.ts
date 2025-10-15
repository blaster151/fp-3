import { describe, expect, it } from "vitest"

import { FinGrp, FinGrpCat, type FinGrpObj, type Hom } from "../../models/fingroup-cat"

describe("Null objects in finite groups", () => {
  const altTrivial: FinGrpObj = {
    name: "1′",
    elems: ["u"],
    mul: () => "u",
    e: "u",
    inv: () => "u",
  }

  const Z2: FinGrpObj = {
    name: "ℤ₂",
    elems: ["0", "1"],
    mul: (a, b) => ((Number(a) + Number(b)) % 2).toString(),
    e: "0",
    inv: (value) => value,
  }

  const category = FinGrpCat([altTrivial, Z2])
  const canonical = category.lookup(FinGrp.trivial().name)
  const candidate = category.lookup(altTrivial.name)
  const sample = category.lookup(Z2.name)

  const compare = (left: Hom, right: Hom) => category.eq(left, right)

  it("certifies the canonical trivial group is simultaneously initial and terminal", () => {
    const toSample = FinGrp.initialArrow(sample)
    const fromSample = FinGrp.terminate(sample)

    expect(FinGrp.isHom(canonical, sample, toSample)).toBe(true)
    expect(FinGrp.isHom(sample, canonical, fromSample)).toBe(true)

    const alternativeToSample: Hom = {
      name: "ρ",
      dom: canonical.name,
      cod: sample.name,
      map: () => sample.e,
    }

    const alternativeFromSample: Hom = {
      name: "σ",
      dom: sample.name,
      cod: canonical.name,
      map: () => canonical.e,
    }

    expect(compare(toSample, alternativeToSample)).toBe(true)
    expect(compare(fromSample, alternativeFromSample)).toBe(true)
  })

  it("witnesses that null objects are unique up to unique isomorphism", () => {
    const forward = FinGrp.initialArrow(candidate)
    const backward = FinGrp.terminateAt(candidate, canonical)

    expect(FinGrp.isHom(canonical, candidate, forward)).toBe(true)
    expect(FinGrp.isHom(candidate, canonical, backward)).toBe(true)

    const compositeCanonical = category.compose(backward, forward)
    expect(compare(compositeCanonical, category.id(canonical.name))).toBe(true)

    const compositeCandidate = category.compose(forward, backward)
    expect(compare(compositeCandidate, category.id(candidate.name))).toBe(true)

    const altForward: Hom = {
      name: "τ",
      dom: canonical.name,
      cod: candidate.name,
      map: () => candidate.e,
    }

    const altBackward: Hom = {
      name: "υ",
      dom: candidate.name,
      cod: canonical.name,
      map: () => canonical.e,
    }

    expect(compare(forward, altForward)).toBe(true)
    expect(compare(backward, altBackward)).toBe(true)
  })

  it("verifies alternative null objects mediate every map uniquely", () => {
    const toSample = FinGrp.initialArrowFrom(candidate, sample)
    const fromSample = FinGrp.terminateAt(sample, candidate)

    expect(FinGrp.isHom(candidate, sample, toSample)).toBe(true)
    expect(FinGrp.isHom(sample, candidate, fromSample)).toBe(true)

    const altToSample: Hom = {
      name: "φ",
      dom: candidate.name,
      cod: sample.name,
      map: () => sample.e,
    }

    const altFromSample: Hom = {
      name: "χ",
      dom: sample.name,
      cod: candidate.name,
      map: () => candidate.e,
    }

    expect(compare(toSample, altToSample)).toBe(true)
    expect(compare(fromSample, altFromSample)).toBe(true)
  })
})
