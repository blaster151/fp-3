import { describe, expect, it } from "vitest"

import { CategoryLimits } from "../../allTS"
import {
  makeFiniteSliceProduct,
  makeSlice,
  makeSliceProduct,
  type SliceArrow,
  type SliceObject,
} from "../../slice-cat"
import { FinSetCat, type FinSetCategory, type FuncArr } from "../../models/finset-cat"
import type { Functor } from "../../functor"
import { checkProductUP } from "../../product-up"

type SliceObj = SliceObject<string, FuncArr>
type SliceArr = SliceArrow<string, FuncArr>

describe("Set/X slice products via fiber products", () => {
  const universe = {
    X: ["x0", "x1", "x2"] as const,
    A: ["a0", "a1"] as const,
    B: ["b0", "b1", "b2"] as const,
    C: ["c0", "c1", "c2"] as const,
  }

  const category: FinSetCategory = FinSetCat(universe)
  const registry = category.arrows as FuncArr[]

  const idX = category.id("X")
  const idA = category.id("A")
  const idB = category.id("B")
  const idC = category.id("C")

  const f: FuncArr = {
    name: "f",
    dom: "A",
    cod: "X",
    map: (value) => (value === "a0" ? "x0" : "x1"),
  }

  const g: FuncArr = {
    name: "g",
    dom: "B",
    cod: "X",
    map: (value) => {
      if (value === "b0") return "x0"
      if (value === "b1") return "x1"
      return "x1"
    },
  }

  const h: FuncArr = {
    name: "h",
    dom: "C",
    cod: "X",
    map: (value) => (value === "c0" ? "x0" : "x1"),
  }

  const u: FuncArr = {
    name: "u",
    dom: "C",
    cod: "A",
    map: (value) => (value === "c0" ? "a0" : "a1"),
  }

  const v: FuncArr = {
    name: "v",
    dom: "C",
    cod: "B",
    map: (value) => {
      if (value === "c0") return "b0"
      if (value === "c1") return "b1"
      return "b2"
    },
  }

  const vAlt: FuncArr = {
    name: "v'",
    dom: "C",
    cod: "B",
    map: (value) => (value === "c0" ? "b0" : "b1"),
  }

  const stabilize: FuncArr = {
    name: "stabilize",
    dom: "C",
    cod: "C",
    map: (value) => (value === "c2" ? "c1" : value),
  }

  const squeezeB: FuncArr = {
    name: "squeeze_B",
    dom: "B",
    cod: "B",
    map: (value) => (value === "b2" ? "b1" : value),
  }

  registry.push(idX, idA, idB, idC, f, g, h, u, v, vAlt, stabilize, squeezeB)

  const slice = makeSlice(category, "X")
  const { sliceProductToolkit: toolkit } = slice

  const left = slice.objects.find((object) => object.domain === "A")
  const right = slice.objects.find((object) => object.domain === "B")
  const source = slice.objects.find((object) => object.domain === "C")

  if (!left || !right || !source) {
    throw new Error("Expected the slice objects for A, B, and C to be present")
  }

  const product = makeSliceProduct(category, "X", left, right, {
    name: "A×_X B",
    toolkit,
  })

  const fiberCarrier = category.carrier(product.object.domain)

  it("enumerates the fiber product carrier and projections", () => {
    const decoded = fiberCarrier.map(product.decode)
    expect(decoded).toEqual([
      ["a0", "b0"],
      ["a1", "b1"],
      ["a1", "b2"],
    ])

    expect(category.eq(product.projectionLeft.mediating, {
      name: "π1",
      dom: product.object.domain,
      cod: left.domain,
      map: (value: string) => product.decode(value)[0],
    })).toBe(true)

    expect(category.eq(product.projectionRight.mediating, {
      name: "π2",
      dom: product.object.domain,
      cod: right.domain,
      map: (value: string) => product.decode(value)[1],
    })).toBe(true)
  })

  const leftLeg: SliceArr = { src: source, dst: left, mediating: u }
  const rightLeg: SliceArr = { src: source, dst: right, mediating: v }
  const altRightLeg: SliceArr = { src: source, dst: right, mediating: vAlt }

  const pairing = product.pair(leftLeg, rightLeg)

  const precomposition: SliceArr = { src: source, dst: source, mediating: stabilize }

  it("builds the mediating arrow and recovers the supplied legs", () => {
    const composedLeft = slice.compose(product.projectionLeft, pairing)
    const composedRight = slice.compose(product.projectionRight, pairing)

    expect(category.eq(composedLeft.mediating, u)).toBe(true)
    expect(category.eq(composedRight.mediating, v)).toBe(true)
  })

  it("respects pairing naturality under precomposition", () => {
    const tuple = {
      object: product.object,
      projections: [product.projectionLeft, product.projectionRight] as const,
      tuple: (
        _domain: SliceObj,
        legs: ReadonlyArray<SliceArr>,
      ): SliceArr => {
        if (legs.length !== 2) {
          throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
        }
        const [candidateLeft, candidateRight] = legs as readonly [SliceArr, SliceArr]
        return product.pair(candidateLeft, candidateRight)
      },
    }

    const holds = CategoryLimits.checkBinaryProductNaturality<SliceObj, SliceArr>({
      category: { compose: slice.compose, eq: slice.eq },
      product: tuple,
      mediator: pairing,
      legs: [leftLeg, rightLeg],
      precomposition: { arrow: precomposition, source },
    })

    expect(holds).toBe(true)
  })

  it("rejects precomposition arrows whose codomain mismatches the legs", () => {
    const mismatched: SliceArr = { src: left, dst: left, mediating: idA }

    expect(() =>
      CategoryLimits.checkBinaryProductNaturality<SliceObj, SliceArr>({
        category: { compose: slice.compose, eq: slice.eq },
        product: {
          object: product.object,
          projections: [product.projectionLeft, product.projectionRight] as const,
          tuple: (
            _domain: SliceObj,
            legs: ReadonlyArray<SliceArr>,
          ): SliceArr => {
            if (legs.length !== 2) {
              throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
            }
            const [candidateLeft, candidateRight] = legs as readonly [SliceArr, SliceArr]
            return product.pair(candidateLeft, candidateRight)
          },
        },
        mediator: pairing,
        legs: [leftLeg, rightLeg],
        precomposition: { arrow: mismatched, source: left },
      }),
    ).toThrow(/compose/)
  })

  it("verifies the universal property with checkProductUP", () => {
    const arrowSamples = ["id_source", "leg", "id_target"] as const
    type ObjX = "source" | "target"
    type ArrX = (typeof arrowSamples)[number]

    const F: Functor<ObjX, ArrX, SliceObj, SliceArr> = {
      F0: (object) => (object === "source" ? source : left),
      F1: (arrow) => {
        switch (arrow) {
          case "leg":
            return leftLeg
          case "id_source":
            return slice.id(source)
          case "id_target":
            return slice.id(left)
        }
      },
    }

    const G: Functor<ObjX, ArrX, SliceObj, SliceArr> = {
      F0: (object) => (object === "source" ? source : right),
      F1: (arrow) => {
        switch (arrow) {
          case "leg":
            return rightLeg
          case "id_source":
            return slice.id(source)
          case "id_target":
            return slice.id(right)
        }
      },
    }

    type PairObj = readonly [SliceObj, SliceObj]
    type PairArr = {
      readonly src: PairObj
      readonly dst: PairObj
      readonly cf: SliceArr
      readonly dg: SliceArr
    }

    const H: Functor<ObjX, ArrX, PairObj, PairArr> = {
      F0: (object) => (object === "source" ? [source, source] : [left, right]),
      F1: (arrow) => {
        switch (arrow) {
          case "leg":
            return {
              src: [source, source] as const,
              dst: [left, right] as const,
              cf: slice.compose(product.projectionLeft, pairing),
              dg: slice.compose(product.projectionRight, pairing),
            }
          case "id_source":
            return {
              src: [source, source] as const,
              dst: [source, source] as const,
              cf: slice.id(source),
              dg: slice.id(source),
            }
          case "id_target":
            return {
              src: [left, right] as const,
              dst: [left, right] as const,
              cf: slice.id(left),
              dg: slice.id(right),
            }
        }
      },
    }

    const eqObj = (candidate: SliceObj, target: SliceObj) =>
      candidate.domain === target.domain && category.eq(candidate.arrowToAnchor, target.arrowToAnchor)

    const eqArr = (leftArrow: SliceArr, rightArrow: SliceArr) => slice.eq(leftArrow, rightArrow)

    const eqPairArr = (leftPair: PairArr, rightPair: PairArr) =>
      eqObj(leftPair.src[0], rightPair.src[0]) &&
      eqObj(leftPair.src[1], rightPair.src[1]) &&
      eqObj(leftPair.dst[0], rightPair.dst[0]) &&
      eqObj(leftPair.dst[1], rightPair.dst[1]) &&
      eqArr(leftPair.cf, rightPair.cf) &&
      eqArr(leftPair.dg, rightPair.dg)

    const objects: readonly ObjX[] = ["source", "target"]

    expect(
      checkProductUP(slice, slice, F, G, H, objects, arrowSamples, {
        eqCObj: eqObj,
        eqCArr: eqArr,
        eqDObj: eqObj,
        eqDArr: eqArr,
        eqPairArr,
      }),
    ).toBe(true)

    const failing: typeof H = {
      ...H,
      F1: (arrow) => {
        if (arrow === "leg") {
          return {
            src: [source, source] as const,
            dst: [left, right] as const,
            cf: slice.compose(product.projectionLeft, pairing),
            dg: altRightLeg,
          }
        }
        return H.F1(arrow)
      },
    }

    expect(
      checkProductUP(slice, slice, F, G, failing, objects, arrowSamples, {
        eqCObj: eqObj,
        eqCArr: eqArr,
        eqDObj: eqObj,
        eqDArr: eqArr,
      }),
    ).toBe(false)
  })

  it("supplies the canonical fiber-product swap", () => {
    const swap = product.swap?.()
    expect(swap).toBeDefined()
    const { target, forward, backward } = swap!

    const idProduct: SliceArr = {
      src: product.object,
      dst: product.object,
      mediating: category.id(product.object.domain),
    }
    const idSwapped: SliceArr = {
      src: target.object,
      dst: target.object,
      mediating: category.id(target.object.domain),
    }

    const sliceAfter = makeSlice(category, "X")
    const backwardForward = sliceAfter.compose(backward, forward)
    expect(category.eq(backwardForward.mediating, idProduct.mediating)).toBe(true)
    const forwardBackward = sliceAfter.compose(forward, backward)
    expect(category.eq(forwardBackward.mediating, idSwapped.mediating)).toBe(true)

    const swappedFirst = target.projections[0]
    const swappedSecond = target.projections[1]
    if (!swappedFirst || !swappedSecond) {
      throw new Error("Swap target projections should be present")
    }

    expect(
      category.eq(
        sliceAfter.compose(swappedFirst, forward).mediating,
        product.projectionRight.mediating,
      ),
    ).toBe(true)
    expect(
      category.eq(
        sliceAfter.compose(swappedSecond, forward).mediating,
        product.projectionLeft.mediating,
      ),
    ).toBe(true)
    expect(
      category.eq(
        sliceAfter.compose(product.projectionLeft, backward).mediating,
        swappedSecond.mediating,
      ),
    ).toBe(true)
    expect(
      category.eq(
        sliceAfter.compose(product.projectionRight, backward).mediating,
        swappedFirst.mediating,
      ),
    ).toBe(true)
  })

  const selfProduct = makeSliceProduct(category, "X", left, left, {
    name: "A×_X A",
    toolkit,
  })
  const diagonalWitness = selfProduct.diagonal?.()
  if (!diagonalWitness) {
    throw new Error("makeSliceProduct should expose a diagonal when both legs coincide")
  }

  const idLeft = slice.id(left)

  it("exposes the diagonal slice arrow", () => {
    expect(diagonalWitness.source).toEqual(left)
    expect(diagonalWitness.arrow.src).toEqual(left)
    expect(diagonalWitness.arrow.dst).toEqual(selfProduct.object)

    const composedLeft = slice.compose(selfProduct.projectionLeft, diagonalWitness.arrow)
    const composedRight = slice.compose(selfProduct.projectionRight, diagonalWitness.arrow)

    expect(slice.eq(composedLeft, idLeft)).toBe(true)
    expect(slice.eq(composedRight, idLeft)).toBe(true)
  })

  it("matches the pairing of identity legs", () => {
    const paired = selfProduct.pair(idLeft, idLeft)
    expect(slice.eq(paired, diagonalWitness.arrow)).toBe(true)
  })

  const terminal = slice.objects.find((object) => object.domain === "X")
  if (!terminal) {
    throw new Error("Expected the terminal slice object over X to be present")
  }

  const leftUnitProduct = makeSliceProduct(category, "X", terminal, left, {
    name: "X×_X A",
    toolkit,
  })
  const rightUnitProduct = makeSliceProduct(category, "X", left, terminal, {
    name: "A×_X X",
    toolkit,
  })

  const idLeftUnitProduct = slice.id(leftUnitProduct.object)
  const idRightUnitProduct = slice.id(rightUnitProduct.object)

  const leftUnit = leftUnitProduct.leftUnit?.()
  if (!leftUnit) {
    throw new Error("makeSliceProduct should expose a left unit isomorphism when the left factor is terminal")
  }

  const rightUnit = rightUnitProduct.rightUnit?.()
  if (!rightUnit) {
    throw new Error("makeSliceProduct should expose a right unit isomorphism when the right factor is terminal")
  }

  const sliceRegistry = slice.arrows as SliceArr[]
  sliceRegistry.push(
    leftUnitProduct.projectionLeft,
    leftUnitProduct.projectionRight,
    rightUnitProduct.projectionLeft,
    rightUnitProduct.projectionRight,
    slice.id(left),
    slice.id(terminal),
  )

  const toTerminalFromLeft: SliceArr = { src: left, dst: terminal, mediating: left.arrowToAnchor }
  sliceRegistry.push(toTerminalFromLeft)

  const canonicalLeftUnit = CategoryLimits.unitBinaryProduct<SliceObj, SliceObj, SliceArr>({
    category: slice,
    product: {
      object: leftUnitProduct.object,
      projections: [leftUnitProduct.projectionLeft, leftUnitProduct.projectionRight],
      tuple: (_domain, legs) => {
        if (legs.length !== 2) {
          throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
        }
        const [first, second] = legs as readonly [SliceArr, SliceArr]
        return leftUnitProduct.pair(first, second)
      },
    },
    factor: {
      object: left,
      identity: slice.id(left),
    },
    projection: leftUnitProduct.projectionRight,
    legs: [toTerminalFromLeft, slice.id(left)],
    productIdentity: idLeftUnitProduct,
  })

  it("exposes the canonical left unit slice arrow", () => {
    expect(slice.eq(leftUnit.forward, leftUnitProduct.projectionRight)).toBe(true)
    expect(slice.eq(leftUnit.backward, canonicalLeftUnit.backward)).toBe(true)

    const composedForward = slice.compose(leftUnit.forward, leftUnit.backward)
    expect(slice.eq(composedForward, slice.id(left))).toBe(true)

    const composedBackward = slice.compose(leftUnit.backward, leftUnit.forward)
    expect(slice.eq(composedBackward, slice.id(leftUnitProduct.object))).toBe(true)
  })

  const canonicalRightUnit = CategoryLimits.unitBinaryProduct<SliceObj, SliceObj, SliceArr>({
    category: slice,
    product: {
      object: rightUnitProduct.object,
      projections: [rightUnitProduct.projectionLeft, rightUnitProduct.projectionRight],
      tuple: (_domain, legs) => {
        if (legs.length !== 2) {
          throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
        }
        const [first, second] = legs as readonly [SliceArr, SliceArr]
        return rightUnitProduct.pair(first, second)
      },
    },
    factor: {
      object: left,
      identity: slice.id(left),
    },
    projection: rightUnitProduct.projectionLeft,
    legs: [slice.id(left), toTerminalFromLeft],
    productIdentity: idRightUnitProduct,
  })

  it("exposes the canonical right unit slice arrow", () => {
    expect(slice.eq(rightUnit.forward, rightUnitProduct.projectionLeft)).toBe(true)
    expect(slice.eq(rightUnit.backward, canonicalRightUnit.backward)).toBe(true)

    const composedForward = slice.compose(rightUnit.forward, rightUnit.backward)
    expect(slice.eq(composedForward, slice.id(left))).toBe(true)

    const composedBackward = slice.compose(rightUnit.backward, rightUnit.forward)
    expect(slice.eq(composedBackward, slice.id(rightUnitProduct.object))).toBe(true)
  })

  const targetProduct = makeSliceProduct(category, "X", left, right, {
    name: "A×_X B'",
    toolkit,
  })
  const componentwiseBuilder = product.componentwise
  if (!componentwiseBuilder) {
    throw new Error("makeSliceProduct should expose componentwise constructors for binary products")
  }

  const componentwiseArrow = componentwiseBuilder(targetProduct, [slice.id(left), slice.id(right)])

  it("builds componentwise mediators from slice arrows", () => {
    const expected = targetProduct.pair(
      product.projectionLeft,
      product.projectionRight,
    )

    expect(slice.eq(componentwiseArrow, expected)).toBe(true)

    const leftComposite = slice.compose(targetProduct.projectionLeft, componentwiseArrow)
    const rightComposite = slice.compose(targetProduct.projectionRight, componentwiseArrow)

    expect(slice.eq(leftComposite, product.projectionLeft)).toBe(true)
    expect(slice.eq(rightComposite, product.projectionRight)).toBe(true)
  })

  it("rejects component families whose targets do not match the destination factors", () => {
    const mismatched: SliceArr = { src: left, dst: terminal, mediating: left.arrowToAnchor }
    expect(() => componentwiseBuilder(targetProduct, [slice.id(left), mismatched])).toThrow(
      /right component must target the right factor/,
    )
  })

  it("threads componentwise constructors through makeFiniteSliceProduct", () => {
    const finite = makeFiniteSliceProduct(category, "X", [left, right], {
      name: "A×_X B (finite)",
      toolkit,
    })
    const finiteTarget = makeFiniteSliceProduct(category, "X", [left, right], {
      name: "A×_X B (finite target)",
      toolkit,
    })
    const finiteBuilder = finite.componentwise
    if (!finiteBuilder) {
      throw new Error("makeFiniteSliceProduct should expose componentwise constructors for binary arity")
    }

    const result = finiteBuilder(finiteTarget, [slice.id(left), slice.id(right)])
    const expected = finiteTarget.tuple(product.object, [
      product.projectionLeft,
      product.projectionRight,
    ])

    expect(slice.eq(result, expected)).toBe(true)
  })

  const productTuple: CategoryLimits.BinaryProductTuple<SliceObj, SliceArr> = {
    object: product.object,
    projections: [product.projectionLeft, product.projectionRight],
    tuple: (_domain, legs) => {
      if (legs.length !== 2) {
        throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
      }
      const [leftCandidate, rightCandidate] = legs as readonly [SliceArr, SliceArr]
      return product.pair(leftCandidate, rightCandidate)
    },
  }

  const targetTuple: CategoryLimits.BinaryProductTuple<SliceObj, SliceArr> = {
    object: targetProduct.object,
    projections: [targetProduct.projectionLeft, targetProduct.projectionRight],
    tuple: (_domain, legs) => {
      if (legs.length !== 2) {
        throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
      }
      const [leftCandidate, rightCandidate] = legs as readonly [SliceArr, SliceArr]
      return targetProduct.pair(leftCandidate, rightCandidate)
    },
  }

  it("collapses componentwise arrows along mediating pairings", () => {
    const holds = CategoryLimits.checkBinaryProductComponentwiseCollapse<SliceObj, SliceArr>({
      category: { compose: slice.compose, eq: slice.eq },
      source: productTuple,
      target: targetTuple,
      componentwise: componentwiseArrow,
      components: [slice.id(left), slice.id(right)],
      domain: source,
      legs: [leftLeg, rightLeg],
    })

    expect(holds).toBe(true)
  })

  it("rejects mismatched component data during collapse checks", () => {
    const squeezeRight: SliceArr = { src: right, dst: right, mediating: squeezeB }

    const holds = CategoryLimits.checkBinaryProductComponentwiseCollapse<SliceObj, SliceArr>({
      category: { compose: slice.compose, eq: slice.eq },
      source: productTuple,
      target: targetTuple,
      componentwise: componentwiseArrow,
      components: [slice.id(left), squeezeRight],
      domain: source,
      legs: [leftLeg, rightLeg],
    })

    expect(holds).toBe(false)
  })

  const swapSource = product.swap?.()
  const swapTarget = targetProduct.swap?.()
  if (!swapSource || !swapTarget) {
    throw new Error("makeSliceProduct should expose swap isomorphisms for binary products")
  }

  const tupleFromFiniteWitness = (
    witness: (typeof swapSource.target),
  ): CategoryLimits.BinaryProductTuple<SliceObj, SliceArr> => {
    const [projectionLeft, projectionRight] = witness.projections
    if (!projectionLeft || !projectionRight) {
      throw new Error("makeSliceProduct swap target must expose two projections")
    }
    return {
      object: witness.object,
      projections: [projectionLeft, projectionRight],
      tuple: (domainObj, legs) => witness.tuple(domainObj, legs),
    }
  }

  const swappedBuilder = swapSource.target.componentwise
  if (!swappedBuilder) {
    throw new Error("makeSliceProduct swap target should expose componentwise constructors")
  }

  const swappedComponentwise = swappedBuilder(swapTarget.target, [slice.id(right), slice.id(left)])

  const sourceSwap = {
    swapped: tupleFromFiniteWitness(swapSource.target),
    forward: swapSource.forward,
    backward: swapSource.backward,
  }

  const targetSwap = {
    swapped: tupleFromFiniteWitness(swapTarget.target),
    forward: swapTarget.forward,
    backward: swapTarget.backward,
  }

  it("commutes with swap symmetry under componentwise construction", () => {
    const holds = CategoryLimits.checkBinaryProductSwapCompatibility<SliceObj, SliceArr>({
      category: { compose: slice.compose, eq: slice.eq },
      sourceSwap,
      targetSwap,
      componentwise: componentwiseArrow,
      swappedComponentwise,
    })

    expect(holds).toBe(true)
  })

  it("detects perturbed swap compositions", () => {
    const squeezeRight: SliceArr = { src: right, dst: right, mediating: squeezeB }
    const perturbed = swappedBuilder(swapTarget.target, [slice.id(right), squeezeRight])

    const holds = CategoryLimits.checkBinaryProductSwapCompatibility<SliceObj, SliceArr>({
      category: { compose: slice.compose, eq: slice.eq },
      sourceSwap,
      targetSwap,
      componentwise: componentwiseArrow,
      swappedComponentwise: perturbed,
    })

    expect(holds).toBe(false)
  })
})
