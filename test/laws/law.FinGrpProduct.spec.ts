import { describe, expect, it } from "vitest"

import { CategoryLimits, FinGrpProductsWithTuple, isIsoByInverseSearch } from "../../allTS"
import { FinGrp, FinGrpCat, type FinGrpObj, type Hom as FinGrpHom } from "../../models/fingroup-cat"
import type { Functor } from "../../functor"
import { checkProductUP } from "../../product-up"

const cyclicGroup = (order: number, name: string): FinGrpObj => {
  const elems = Array.from({ length: order }, (_, index) => index.toString())
  const add = (mod: number) => (a: string, b: string) => ((Number(a) + Number(b)) % mod).toString()
  const inv = (mod: number) => (a: string) => ((mod - Number(a)) % mod).toString()
  return {
    name,
    elems,
    e: "0",
    mul: add(order),
    inv: inv(order),
  }
}

describe("Finite group direct products", () => {
  const Z2 = cyclicGroup(2, "Z₂")
  const Z3 = cyclicGroup(3, "Z₃")
  const domain = cyclicGroup(6, "Z₆")

  const product = FinGrp.product(Z2, Z3, { name: "Z₂×Z₃" })
  const swapWitness = product.swap?.()
  if (!swapWitness) {
    throw new Error("FinGrp.product should expose a swap isomorphism")
  }

  const category = FinGrpCat([
    Z2,
    Z3,
    domain,
    product.object,
    swapWitness.target.object,
  ])

  const parity: FinGrpHom = {
    name: "mod₂",
    dom: domain.name,
    cod: Z2.name,
    map: (value: string) => (Number(value) % 2 === 0 ? "0" : "1"),
  }

  const mod3: FinGrpHom = {
    name: "mod₃",
    dom: domain.name,
    cod: Z3.name,
    map: (value: string) => (Number(value) % 3).toString(),
  }

  const mediator = product.pair(domain, parity, mod3)

  const compose = category.compose

  const arrowSamples = ["id_source", "leg", "id_target"] as const
  type ObjX = "source" | "target"
  type ArrX = (typeof arrowSamples)[number]

  const objectSamples: readonly ObjX[] = ["source", "target"]

  const F: Functor<ObjX, ArrX, string, FinGrpHom> = {
    F0: (object) => (object === "source" ? domain.name : Z2.name),
    F1: (arrow) => {
      switch (arrow) {
        case "leg":
          return parity
        case "id_source":
          return category.id(domain.name)
        case "id_target":
          return category.id(Z2.name)
      }
    },
  }

  const G: Functor<ObjX, ArrX, string, FinGrpHom> = {
    F0: (object) => (object === "source" ? domain.name : Z3.name),
    F1: (arrow) => {
      switch (arrow) {
        case "leg":
          return mod3
        case "id_source":
          return category.id(domain.name)
        case "id_target":
          return category.id(Z3.name)
      }
    },
  }

  const H: Functor<ObjX, ArrX, readonly [string, string], {
    readonly src: readonly [string, string]
    readonly dst: readonly [string, string]
    readonly cf: FinGrpHom
    readonly dg: FinGrpHom
  }> = {
    F0: (object) => (object === "source" ? [domain.name, domain.name] : [Z2.name, Z3.name]),
    F1: (arrow) => {
      switch (arrow) {
        case "leg":
          return {
            src: [domain.name, domain.name] as const,
            dst: [Z2.name, Z3.name] as const,
            cf: compose(product.projection1, mediator),
            dg: compose(product.projection2, mediator),
          }
        case "id_source":
          return {
            src: [domain.name, domain.name] as const,
            dst: [domain.name, domain.name] as const,
            cf: category.id(domain.name),
            dg: category.id(domain.name),
          }
        case "id_target":
          return {
            src: [Z2.name, Z3.name] as const,
            dst: [Z2.name, Z3.name] as const,
            cf: category.id(Z2.name),
            dg: category.id(Z3.name),
          }
      }
    },
  }

  it("treats the coordinate projections as homomorphisms", () => {
    expect(FinGrp.isHom(product.object, Z2, product.projection1)).toBe(true)
    expect(FinGrp.isHom(product.object, Z3, product.projection2)).toBe(true)

    const brokenProjection: FinGrpHom = {
      name: "not-a-hom",
      dom: product.object.name,
      cod: Z2.name,
      map: (value: string) => {
        const [left] = product.decompose(value)
        return left === "0" ? "1" : "0"
      },
    }

    expect(FinGrp.isHom(product.object, Z2, brokenProjection)).toBe(false)
  })

  it("builds the canonical pairing homomorphism from compatible legs", () => {
    expect(FinGrp.isHom(domain, product.object, mediator)).toBe(true)
    expect(category.eq(compose(product.projection1, mediator), parity)).toBe(true)
    expect(category.eq(compose(product.projection2, mediator), mod3)).toBe(true)
  })

  it("verifies the universal property with checkProductUP", () => {
    const eqArr = category.eq
    const result = checkProductUP(category, category, F, G, H, objectSamples, arrowSamples, {
      eqCArr: eqArr,
      eqDArr: eqArr,
      eqPairArr: (left, right) =>
        left.src[0] === right.src[0] &&
        left.src[1] === right.src[1] &&
        left.dst[0] === right.dst[0] &&
        left.dst[1] === right.dst[1] &&
        eqArr(left.cf, right.cf) &&
        eqArr(left.dg, right.dg),
    })
    expect(result).toBe(true)

    const collapsed: FinGrpHom = {
      name: "collapse",
      dom: domain.name,
      cod: Z2.name,
      map: () => "0",
    }

    const failing: typeof H = {
      ...H,
      F1: (arrow) => {
        if (arrow === "leg") {
          return {
            src: [domain.name, domain.name] as const,
            dst: [Z2.name, Z3.name] as const,
            cf: collapsed,
            dg: compose(product.projection2, mediator),
          }
        }
        return H.F1(arrow)
      },
    }

    expect(
      checkProductUP(category, category, F, G, failing, objectSamples, arrowSamples, {
        eqCArr: eqArr,
        eqDArr: eqArr,
      }),
    ).toBe(false)
  })

  it("supplies the canonical swap isomorphism", () => {
    const swap = product.swap?.()
    expect(swap).toBeDefined()
    const { target, forward, backward } = swap!

    expect(FinGrp.isHom(product.object, target.object, forward)).toBe(true)
    expect(FinGrp.isHom(target.object, product.object, backward)).toBe(true)

    const idProduct = category.id(product.object.name)
    const idSwapped = category.id(target.object.name)

    expect(category.eq(category.compose(backward, forward), idProduct)).toBe(true)
    expect(category.eq(category.compose(forward, backward), idSwapped)).toBe(true)

    const swappedFirst = target.projections[0]
    const swappedSecond = target.projections[1]
    if (!swappedFirst || !swappedSecond) {
      throw new Error("Swap target is expected to expose two projections")
    }

    expect(category.eq(category.compose(swappedFirst, forward), product.projection2)).toBe(true)
    expect(category.eq(category.compose(swappedSecond, forward), product.projection1)).toBe(true)
    expect(category.eq(category.compose(product.projection1, backward), swappedSecond)).toBe(true)
    expect(category.eq(category.compose(product.projection2, backward), swappedFirst)).toBe(true)
  })
})

describe("Finite group diagonals", () => {
  const Z2 = cyclicGroup(2, "Z₂")
  const product = FinGrp.product(Z2, Z2, { name: "Z₂×Z₂" })
  const diagonalWitness = product.diagonal?.()
  if (!diagonalWitness) {
    throw new Error("FinGrp.product should expose a diagonal when factors coincide")
  }

  const category = FinGrpCat([Z2, product.object])
  const compose = category.compose
  const idZ2 = category.id(Z2.name)

  it("exposes the canonical diagonal homomorphism", () => {
    expect(diagonalWitness.source).toBe(Z2)
    expect(FinGrp.isHom(Z2, product.object, diagonalWitness.arrow)).toBe(true)

    expect(category.eq(compose(product.projection1, diagonalWitness.arrow), idZ2)).toBe(true)
    expect(category.eq(compose(product.projection2, diagonalWitness.arrow), idZ2)).toBe(true)
  })

  it("agrees with the pairing of identity legs", () => {
    const paired = product.pair(Z2, idZ2, idZ2)
    expect(category.eq(paired, diagonalWitness.arrow)).toBe(true)
  })
})

describe("Finite group unit isomorphisms", () => {
  const terminal = FinGrp.trivial()
  const Z2 = cyclicGroup(2, "Z₂")

  const leftProduct = FinGrp.product(terminal, Z2, { name: "1×Z₂" })
  const rightProduct = FinGrp.product(Z2, terminal, { name: "Z₂×1" })

  const leftUnit = leftProduct.leftUnit?.()
  if (!leftUnit) {
    throw new Error("FinGrp.product should expose a left unit isomorphism when the left factor is terminal")
  }

  const rightUnit = rightProduct.rightUnit?.()
  if (!rightUnit) {
    throw new Error("FinGrp.product should expose a right unit isomorphism when the right factor is terminal")
  }

  const category = FinGrpCat([
    terminal,
    Z2,
    leftProduct.object,
    rightProduct.object,
  ])
  const registry = category.arrows as FinGrpHom[]

  registry.push(
    leftProduct.projection1,
    leftProduct.projection2,
    rightProduct.projection1,
    rightProduct.projection2,
  )

  const terminateFromZ2 = FinGrp.terminateAt(Z2, terminal)
  const idZ2 = category.id(Z2.name)

  const idLeftProduct = category.id(leftProduct.object.name)

  const canonicalLeft = CategoryLimits.unitBinaryProduct<FinGrpObj, string, FinGrpHom>({
    category,
    product: {
      object: leftProduct.object,
      projections: [leftProduct.projection1, leftProduct.projection2],
      tuple: (domain, legs) => {
        if (legs.length !== 2) {
          throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
        }
        const [first, second] = legs as readonly [FinGrpHom, FinGrpHom]
        return leftProduct.pair(domain, first, second)
      },
    },
    factor: {
      object: Z2,
      identity: idZ2,
    },
    projection: leftProduct.projection2,
    legs: [terminateFromZ2, idZ2],
    productIdentity: idLeftProduct,
  })

  it("supplies the canonical isomorphism for 1×G → G", () => {
    expect(category.eq(leftUnit.forward, leftProduct.projection2)).toBe(true)
    expect(category.eq(leftUnit.backward, canonicalLeft.backward)).toBe(true)

    const composedForward = category.compose(leftUnit.forward, leftUnit.backward)
    expect(category.eq(composedForward, idZ2)).toBe(true)

    const composedBackward = category.compose(leftUnit.backward, leftUnit.forward)
    expect(category.eq(composedBackward, idLeftProduct)).toBe(true)

    expect(isIsoByInverseSearch(category, leftUnit.forward)).toBe(true)
  })

  it("recognises that projections into the terminal group are not isomorphisms", () => {
    expect(isIsoByInverseSearch(category, leftProduct.projection1)).toBe(false)
  })

  const idRightProduct = category.id(rightProduct.object.name)

  const canonicalRight = CategoryLimits.unitBinaryProduct<FinGrpObj, string, FinGrpHom>({
    category,
    product: {
      object: rightProduct.object,
      projections: [rightProduct.projection1, rightProduct.projection2],
      tuple: (domain, legs) => {
        if (legs.length !== 2) {
          throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
        }
        const [first, second] = legs as readonly [FinGrpHom, FinGrpHom]
        return rightProduct.pair(domain, first, second)
      },
    },
    factor: {
      object: Z2,
      identity: idZ2,
    },
    projection: rightProduct.projection1,
    legs: [idZ2, terminateFromZ2],
    productIdentity: idRightProduct,
  })

  it("supplies the canonical isomorphism for G×1 → G", () => {
    expect(category.eq(rightUnit.forward, rightProduct.projection1)).toBe(true)
    expect(category.eq(rightUnit.backward, canonicalRight.backward)).toBe(true)

    const composedForward = category.compose(rightUnit.forward, rightUnit.backward)
    expect(category.eq(composedForward, idZ2)).toBe(true)

    const composedBackward = category.compose(rightUnit.backward, rightUnit.forward)
    expect(category.eq(composedBackward, idRightProduct)).toBe(true)

    expect(isIsoByInverseSearch(category, rightUnit.forward)).toBe(true)
  })

  it("rejects the projections into the terminal factor as isomorphisms", () => {
    expect(isIsoByInverseSearch(category, rightProduct.projection2)).toBe(false)
  })
})

describe("Finite group componentwise arrows", () => {
  const Z2 = cyclicGroup(2, "Z₂")
  const Z3 = cyclicGroup(3, "Z₃")
  const domain = cyclicGroup(6, "Z₆")

  const source = FinGrp.product(Z2, Z3, { name: "Z₂×Z₃" })
  const target = FinGrp.product(Z2, Z3, { name: "Z₂×Z₃'" })

  const builder = source.componentwise
  if (!builder) {
    throw new Error("FinGrp.product should expose componentwise constructors for binary products")
  }

  const swapSource = source.swap?.()
  const swapTarget = target.swap?.()
  if (!swapSource || !swapTarget) {
    throw new Error("FinGrp.product should expose swap isomorphisms for binary products")
  }

  const category = FinGrpCat([
    Z2,
    Z3,
    domain,
    source.object,
    target.object,
    swapSource.target.object,
    swapTarget.target.object,
  ])
  const compose = category.compose
  const eq = category.eq

  const idZ2 = category.id(Z2.name)
  const idZ3 = category.id(Z3.name)

  const arrow = builder(target, [idZ2, idZ3])

  const tupleFromBinaryWitness = (
    witness: typeof source,
  ): CategoryLimits.BinaryProductTuple<FinGrpObj, FinGrpHom> => ({
    object: witness.object,
    projections: [witness.projection1, witness.projection2],
    tuple: (domainObj, legs) => {
      if (legs.length !== 2) {
        throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
      }
      const [leftLeg, rightLeg] = legs as readonly [FinGrpHom, FinGrpHom]
      return witness.pair(domainObj, leftLeg, rightLeg)
    },
  })

  const tupleFromFiniteWitness = (
    witness: typeof swapSource.target,
  ): CategoryLimits.BinaryProductTuple<FinGrpObj, FinGrpHom> => {
    const [projection1, projection2] = witness.projections
    if (!projection1 || !projection2) {
      throw new Error("FinGrp swap target is expected to expose two projections")
    }
    return {
      object: witness.object,
      projections: [projection1, projection2],
      tuple: (domainObj, legs) => {
        if (legs.length !== 2) {
          throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
        }
        const [leftLeg, rightLeg] = legs as readonly [FinGrpHom, FinGrpHom]
        return witness.pair(domainObj, [leftLeg, rightLeg])
      },
    }
  }

  const sourceTuple = tupleFromBinaryWitness(source)
  const targetTuple = tupleFromBinaryWitness(target)

  const parity: FinGrpHom = {
    name: "mod₂",
    dom: domain.name,
    cod: Z2.name,
    map: (value: string) => (Number(value) % 2 === 0 ? "0" : "1"),
  }

  const mod3: FinGrpHom = {
    name: "mod₃",
    dom: domain.name,
    cod: Z3.name,
    map: (value: string) => (Number(value) % 3).toString(),
  }

  const mediator = sourceTuple.tuple(domain, [parity, mod3])

  it("builds the canonical mediator from component homomorphisms", () => {
    expect(FinGrp.isHom(source.object, target.object, arrow)).toBe(true)

    const leftComposite = compose(idZ2, source.projection1)
    const rightComposite = compose(idZ3, source.projection2)
    const expected = target.pair(source.object, leftComposite, rightComposite)

    expect(category.eq(arrow, expected)).toBe(true)
    expect(category.eq(compose(target.projection1, arrow), leftComposite)).toBe(true)
    expect(category.eq(compose(target.projection2, arrow), rightComposite)).toBe(true)
  })

  it("rejects component families whose sources do not match the factors", () => {
    const mismatched: FinGrpHom = {
      name: "not-from-left",
      dom: Z3.name,
      cod: Z2.name,
      map: () => "0",
    }

    expect(() => builder(target, [mismatched, idZ3])).toThrow(/left component/)
  })

  it("threads through FinGrp.productMany via CategoryLimits", () => {
    const finite = FinGrp.productMany([Z2, Z3], { name: "Z₂×Z₃ (finite)" })
    const finiteTarget = FinGrp.productMany([Z2, Z3], { name: "Z₂×Z₃ (finite target)" })
    const finiteBuilder = finite.componentwise
    if (!finiteBuilder) {
      throw new Error("FinGrp.productMany should expose componentwise constructors for binary arity")
    }

    const result = finiteBuilder(finiteTarget, [idZ2, idZ3])
    const expected = finiteTarget.pair(source.object, [
      compose(idZ2, source.projection1),
      compose(idZ3, source.projection2),
    ])

    expect(category.eq(result, expected)).toBe(true)
  })

  it("collapses along mediating pairings", () => {
    const holds = CategoryLimits.checkBinaryProductComponentwiseCollapse<FinGrpObj, FinGrpHom>({
      category: { compose, eq },
      source: sourceTuple,
      target: targetTuple,
      componentwise: arrow,
      components: [idZ2, idZ3],
      domain,
      legs: [parity, mod3],
    })

    expect(holds).toBe(true)
  })

  it("detects mismatched component data when collapsing", () => {
    const constantZ3: FinGrpHom = {
      name: "const-zero-Z₃",
      dom: Z3.name,
      cod: Z3.name,
      map: () => "0",
    }

    const holds = CategoryLimits.checkBinaryProductComponentwiseCollapse<FinGrpObj, FinGrpHom>({
      category: { compose, eq },
      source: sourceTuple,
      target: targetTuple,
      componentwise: arrow,
      components: [idZ2, constantZ3],
      domain,
      legs: [parity, mod3],
    })

    expect(holds).toBe(false)
  })

  const swappedBuilder = swapSource.target.componentwise
  if (!swappedBuilder) {
    throw new Error("FinGrp.product swap target should expose componentwise constructors")
  }

  const swappedComponentwise = swappedBuilder(swapTarget.target, [idZ3, idZ2])

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

  it("commutes with the swap isomorphism", () => {
    const holds = CategoryLimits.checkBinaryProductSwapCompatibility<FinGrpObj, FinGrpHom>({
      category: { compose, eq },
      sourceSwap,
      targetSwap,
      componentwise: arrow,
      swappedComponentwise,
    })

    expect(holds).toBe(true)
  })

  it("rejects perturbed swap compositions", () => {
    const constantZ2: FinGrpHom = {
      name: "const-zero-Z₂",
      dom: Z2.name,
      cod: Z2.name,
      map: () => "0",
    }

    const perturbed = swappedBuilder(swapTarget.target, [idZ3, constantZ2])

    const holds = CategoryLimits.checkBinaryProductSwapCompatibility<FinGrpObj, FinGrpHom>({
      category: { compose, eq },
      sourceSwap,
      targetSwap,
      componentwise: arrow,
      swappedComponentwise: perturbed,
    })

    expect(holds).toBe(false)
  })
})

describe("Finite group pairing naturality", () => {
  const Z2 = cyclicGroup(2, "Z₂")
  const Z3 = cyclicGroup(3, "Z₃")
  const domain = cyclicGroup(6, "Z₆")

  const product = FinGrp.product(Z2, Z3, { name: "Z₂×Z₃" })

  const category = FinGrpCat([Z2, Z3, domain, product.object])
  const compose = category.compose
  const eq = category.eq

  const parity: FinGrpHom = {
    name: "mod₂",
    dom: domain.name,
    cod: Z2.name,
    map: (value: string) => (Number(value) % 2 === 0 ? "0" : "1"),
  }

  const mod3: FinGrpHom = {
    name: "mod₃",
    dom: domain.name,
    cod: Z3.name,
    map: (value: string) => (Number(value) % 3).toString(),
  }

  const mediator = product.pair(domain, parity, mod3)

  const doubling: FinGrpHom = {
    name: "double",
    dom: domain.name,
    cod: domain.name,
    map: (value: string) => ((Number(value) * 2) % 6).toString(),
  }

  const productTuple = {
    object: product.object,
    projections: [product.projection1, product.projection2] as const,
    tuple: (source: FinGrpObj, legs: ReadonlyArray<FinGrpHom>) => {
      if (legs.length !== 2) {
        throw new Error(`Expected 2 legs for binary tuple, received ${legs.length}`)
      }
      const [leftLeg, rightLeg] = legs as readonly [FinGrpHom, FinGrpHom]
      return product.pair(source, leftLeg, rightLeg)
    },
  }

  it("agrees with canonical pairing after precomposition", () => {
    expect(FinGrp.isHom(domain, domain, doubling)).toBe(true)

    const holds = CategoryLimits.checkBinaryProductNaturality<FinGrpObj, FinGrpHom>({
      category: { compose, eq },
      product: productTuple,
      mediator,
      legs: [parity, mod3],
      precomposition: { arrow: doubling, source: domain },
    })

    expect(holds).toBe(true)
  })

  it("rejects incompatible precomposition arrows", () => {
    const mismatch: FinGrpHom = {
      name: "bad-pre",
      dom: Z3.name,
      cod: Z3.name,
      map: (value: string) => value,
    }

    expect(() =>
      CategoryLimits.checkBinaryProductNaturality<FinGrpObj, FinGrpHom>({
        category: { compose, eq },
        product: productTuple,
        mediator,
        legs: [parity, mod3],
        precomposition: { arrow: mismatch, source: Z3 },
      }),
    ).toThrow(/compose expects matching codomain\/domain/)
  })
})

describe("Finite group triple products", () => {
  const Z2 = cyclicGroup(2, "Z₂")
  const Z2Alt = cyclicGroup(2, "Z₂′")
  const Z3 = cyclicGroup(3, "Z₃")
  const domain = cyclicGroup(6, "Z₆")

  const tripleWitness = FinGrp.productMany([Z2, Z2Alt, Z3])
  const pairWitness = FinGrp.product(Z2Alt, Z3)

  const indices = { carrier: [0, 1, 2] as const }
  const factors = [Z2, Z2Alt, Z3] as const

  const legs = [
    {
      name: "mod₂", 
      dom: domain.name,
      cod: Z2.name,
      map: (value: string) => (Number(value) % 2 === 0 ? "0" : "1"),
    },
    {
      name: "mod₂′",
      dom: domain.name,
      cod: Z2Alt.name,
      map: (value: string) => (Number(value) % 2 === 0 ? "0" : "1"),
    },
    {
      name: "mod₃",
      dom: domain.name,
      cod: Z3.name,
      map: (value: string) => (Number(value) % 3).toString(),
    },
  ] as const satisfies ReadonlyArray<FinGrpHom>

  const tripleMediator = tripleWitness.pair(domain, legs)
  const restMediator = pairWitness.pair(domain, legs[1]!, legs[2]!)
  const tripleToRest = pairWitness.pair(
    tripleWitness.object,
    tripleWitness.projections[1]!,
    tripleWitness.projections[2]!,
  )

  const mediated = CategoryLimits.mediateProduct(
    indices,
    (i) => factors[i]!,
    FinGrpProductsWithTuple,
    domain,
    (i) => legs[i]!,
  )

  const category = FinGrpCat([Z2, Z2Alt, Z3, domain, tripleWitness.object, pairWitness.object])
  const mediatedCategory = FinGrpCat([Z2, Z2Alt, Z3, domain, mediated.product])

  const compose = category.compose
  const eqArr = category.eq

  it("produces homomorphic projections for each coordinate", () => {
    expect(FinGrp.isHom(tripleWitness.object, Z2, tripleWitness.projections[0]!)).toBe(true)
    expect(FinGrp.isHom(tripleWitness.object, Z2Alt, tripleWitness.projections[1]!)).toBe(true)
    expect(FinGrp.isHom(tripleWitness.object, Z3, tripleWitness.projections[2]!)).toBe(true)

    const tampered: FinGrpHom = {
      name: "tampered",
      dom: tripleWitness.object.name,
      cod: Z2.name,
      map: (value: string) => {
        const [first] = tripleWitness.decompose(value)
        return first === "0" ? "1" : "0"
      },
    }

    expect(FinGrp.isHom(tripleWitness.object, Z2, tampered)).toBe(false)
  })

  it("builds mediators for finite families via CategoryLimits", () => {
    expect(FinGrp.isHom(domain, mediated.product, mediated.mediator)).toBe(true)

    const mediatedCompose = mediatedCategory.compose
    const mediatedEq = mediatedCategory.eq

    for (const index of indices.carrier) {
      const leg = legs[index]
      const projection = mediated.projections(index)
      const composed = mediatedCompose(projection, mediated.mediator)
      expect(mediatedEq(composed, leg)).toBe(true)
    }
  })

  it("verifies the binary universal property against the triple carrier", () => {
    const arrowSamples = ["id_source", "leg", "id_target"] as const
    type ObjY = "source" | "target"
    type ArrY = (typeof arrowSamples)[number]

    const objectSamples: readonly ObjY[] = ["source", "target"]

    const F: Functor<ObjY, ArrY, string, FinGrpHom> = {
      F0: (object) => (object === "source" ? domain.name : Z2.name),
      F1: (arrow) => {
        switch (arrow) {
          case "leg":
            return legs[0]!
          case "id_source":
            return category.id(domain.name)
          case "id_target":
            return category.id(Z2.name)
        }
      },
    }

    const G: Functor<ObjY, ArrY, string, FinGrpHom> = {
      F0: (object) => (object === "source" ? domain.name : pairWitness.object.name),
      F1: (arrow) => {
        switch (arrow) {
          case "leg":
            return restMediator
          case "id_source":
            return category.id(domain.name)
          case "id_target":
            return category.id(pairWitness.object.name)
        }
      },
    }

    const H: Functor<ObjY, ArrY, readonly [string, string], {
      readonly src: readonly [string, string]
      readonly dst: readonly [string, string]
      readonly cf: FinGrpHom
      readonly dg: FinGrpHom
    }> = {
      F0: (object) =>
        object === "source"
          ? [domain.name, domain.name]
          : [Z2.name, pairWitness.object.name],
      F1: (arrow) => {
        switch (arrow) {
          case "leg":
            return {
              src: [domain.name, domain.name] as const,
              dst: [Z2.name, pairWitness.object.name] as const,
              cf: compose(tripleWitness.projections[0]!, tripleMediator),
              dg: compose(tripleToRest, tripleMediator),
            }
          case "id_source":
            return {
              src: [domain.name, domain.name] as const,
              dst: [domain.name, domain.name] as const,
              cf: category.id(domain.name),
              dg: category.id(domain.name),
            }
          case "id_target":
            return {
              src: [Z2.name, pairWitness.object.name] as const,
              dst: [Z2.name, pairWitness.object.name] as const,
              cf: category.id(Z2.name),
              dg: category.id(pairWitness.object.name),
            }
        }
      },
    }

    const ok = checkProductUP(category, category, F, G, H, objectSamples, arrowSamples, {
      eqCArr: eqArr,
      eqDArr: eqArr,
      eqPairArr: (left, right) =>
        left.src[0] === right.src[0] &&
        left.src[1] === right.src[1] &&
        left.dst[0] === right.dst[0] &&
        left.dst[1] === right.dst[1] &&
        eqArr(left.cf, right.cf) &&
        eqArr(left.dg, right.dg),
    })

    expect(ok).toBe(true)

    const collapsed: FinGrpHom = {
      name: "collapse₂",
      dom: domain.name,
      cod: Z2.name,
      map: () => "0",
    }

    const failing: typeof H = {
      ...H,
      F1: (arrow) => {
        if (arrow === "leg") {
          return {
            src: [domain.name, domain.name] as const,
            dst: [Z2.name, pairWitness.object.name] as const,
            cf: collapsed,
            dg: compose(tripleToRest, tripleMediator),
          }
        }
        return H.F1(arrow)
      },
    }

    expect(
      checkProductUP(category, category, F, G, failing, objectSamples, arrowSamples, {
        eqCArr: eqArr,
        eqDArr: eqArr,
      }),
    ).toBe(false)
  })
})
