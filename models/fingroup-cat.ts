import type { FiniteCategory } from "../finite-cat"
import {
  makeBinaryProductComponentwise,
  makeBinaryProductDiagonal,
  makeBinaryProductSwap,
} from "../category-limits-helpers"

export interface FinGrpObj {
  readonly name: string
  readonly elems: readonly string[]
  readonly mul: (a: string, b: string) => string
  readonly e: string
  readonly inv: (a: string) => string
}

export interface Hom {
  readonly name: string
  readonly dom: string
  readonly cod: string
  readonly map: (x: string) => string
}

export interface FinGrpProductMetadata {
  readonly arity: number
  readonly tuple: (domain: FinGrpObj, legs: ReadonlyArray<Hom>) => Hom
  readonly factorNames: ReadonlyArray<string>
  readonly factors: ReadonlyArray<FinGrpObj>
}

export interface FinGrpProductMetadataStore {
  readonly register: (
    object: FinGrpObj,
    metadata: FinGrpProductMetadata,
  ) => FinGrpProductMetadata
  readonly lookup: (product: FinGrpObj) => FinGrpProductMetadata | undefined
}

export const createFinGrpProductMetadataStore = (): FinGrpProductMetadataStore => {
  const cache = new WeakMap<FinGrpObj, FinGrpProductMetadata>()
  return {
    register: (object, metadata) => {
      cache.set(object, metadata)
      return metadata
    },
    lookup: (product) => cache.get(product),
  }
}

export interface FinGrpCategory extends FiniteCategory<string, Hom> {
  readonly traits: { readonly functionalArrows: true; readonly balanced: true }
  readonly isHom: (arrow: Hom) => boolean
  readonly isInjective: (arrow: Hom) => boolean
  readonly isSurjective: (arrow: Hom) => boolean
  readonly lookup: (name: string) => FinGrpObj
  readonly productMetadataStore: FinGrpProductMetadataStore
}

export interface FinGrpProductWitness {
  readonly object: FinGrpObj
  readonly projection1: Hom
  readonly projection2: Hom
  readonly element: (left: string, right: string) => string
  readonly decompose: (element: string) => readonly [string, string]
  readonly pair: (domain: FinGrpObj, left: Hom, right: Hom) => Hom
  readonly factors: readonly [FinGrpObj, FinGrpObj]
  readonly componentwise?: (
    target: FinGrpProductWitness,
    components: readonly [Hom, Hom],
  ) => Hom
  readonly swap?: () => FinGrpProductSwap
  readonly diagonal?: () => FinGrpProductDiagonal
  readonly leftUnit?: () => FinGrpProductUnit
  readonly rightUnit?: () => FinGrpProductUnit
}

export interface FinGrpFiniteProductWitness {
  readonly object: FinGrpObj
  readonly projections: readonly Hom[]
  readonly element: (components: ReadonlyArray<string>) => string
  readonly decompose: (element: string) => ReadonlyArray<string>
  readonly pair: (domain: FinGrpObj, legs: ReadonlyArray<Hom>) => Hom
  readonly factors: ReadonlyArray<FinGrpObj>
  readonly componentwise?: (
    target: FinGrpFiniteProductWitness,
    components: ReadonlyArray<Hom>,
  ) => Hom
  readonly swap?: () => FinGrpProductSwap
  readonly diagonal?: () => FinGrpProductDiagonal
  readonly leftUnit?: () => FinGrpProductUnit
  readonly rightUnit?: () => FinGrpProductUnit
}

export interface FinGrpProductSwap {
  readonly target: FinGrpFiniteProductWitness
  readonly forward: Hom
  readonly backward: Hom
}

export interface FinGrpProductDiagonal {
  readonly source: FinGrpObj
  readonly arrow: Hom
}

export interface FinGrpProductUnit {
  readonly factor: FinGrpObj
  readonly forward: Hom
  readonly backward: Hom
}

const TRIVIAL_GROUP_NAME = "1"
const TRIVIAL_ELEMENT = "e"

const makeIdentityArrow = (object: FinGrpObj): Hom => ({
  name: `id_${object.name}`,
  dom: object.name,
  cod: object.name,
  map: (x) => x,
})

const isTerminalGroup = (group: FinGrpObj): boolean =>
  group.elems.length === 1 && group.elems[0] === group.e

function makeTrivialGroup(): FinGrpObj {
  return {
    name: TRIVIAL_GROUP_NAME,
    elems: [TRIVIAL_ELEMENT],
    mul: () => TRIVIAL_ELEMENT,
    e: TRIVIAL_ELEMENT,
    inv: () => TRIVIAL_ELEMENT,
  }
}

function ensureObject(index: Record<string, FinGrpObj>, name: string): FinGrpObj {
  const obj = index[name]
  if (!obj) {
    throw new Error(`FinGrpCat: unknown object ${name}`)
  }
  return obj
}

export function FinGrpCat(objects: readonly FinGrpObj[]): FinGrpCategory {
  const byName: Record<string, FinGrpObj> = {}
  for (const obj of objects) {
    byName[obj.name] = obj
  }
  if (!byName[TRIVIAL_GROUP_NAME]) {
    byName[TRIVIAL_GROUP_NAME] = makeTrivialGroup()
  }

  const objectList = Object.keys(byName)
  const arrows: Hom[] = []

  const productMetadataStore = createFinGrpProductMetadataStore()

  const eq = (f: Hom, g: Hom) =>
    f.dom === g.dom &&
    f.cod === g.cod &&
    ensureObject(byName, f.dom).elems.every((x) => f.map(x) === g.map(x))

  const id = (G: string): Hom => ({
    name: `id_${G}`,
    dom: G,
    cod: G,
    map: (x) => x,
  })

  const compose = (g: Hom, f: Hom): Hom => {
    if (f.cod !== g.dom) {
      throw new Error("FinGrpCat: compose expects matching codomain/domain")
    }
    return {
      name: `${g.name}∘${f.name}`,
      dom: f.dom,
      cod: g.cod,
      map: (x) => g.map(f.map(x)),
    }
  }

  const src = (f: Hom) => f.dom
  const dst = (f: Hom) => f.cod

  const category: FinGrpCategory = {
    objects: objectList,
    arrows,
    id,
    compose,
    src,
    dst,
    eq,
    traits: { functionalArrows: true, balanced: true },
    isHom: (arrow) => FinGrp.isHom(ensureObject(byName, arrow.dom), ensureObject(byName, arrow.cod), arrow),
    isInjective: (arrow) => FinGrp.injective(ensureObject(byName, arrow.dom), ensureObject(byName, arrow.cod), arrow),
    isSurjective: (arrow) => FinGrp.surjective(ensureObject(byName, arrow.dom), ensureObject(byName, arrow.cod), arrow),
    lookup: (name) => ensureObject(byName, name),
    productMetadataStore,
  }

  return category
}

export const FinGrp = {
  isHom(dom: FinGrpObj, cod: FinGrpObj, f: Hom): boolean {
    if (f.map(dom.e) !== cod.e) return false
    for (const a of dom.elems) {
      for (const b of dom.elems) {
        const left = f.map(dom.mul(a, b))
        const right = cod.mul(f.map(a), f.map(b))
        if (left !== right) {
          return false
        }
      }
    }
    return true
  },
  injective(dom: FinGrpObj, _cod: FinGrpObj, f: Hom): boolean {
    const seen = new Map<string, string>()
    for (const a of dom.elems) {
      const image = f.map(a)
      const previous = seen.get(image)
      if (previous && previous !== a) {
        return false
      }
      seen.set(image, a)
    }
    return true
  },
  surjective(_dom: FinGrpObj, cod: FinGrpObj, f: Hom): boolean {
    const pending = new Set(cod.elems)
    for (const a of _dom.elems) {
      pending.delete(f.map(a))
    }
    return pending.size === 0
  },
  trivial(): FinGrpObj {
    return makeTrivialGroup()
  },
  initialArrowFrom(initial: FinGrpObj, target: FinGrpObj): Hom {
    if (initial.elems.length !== 1) {
      throw new Error(
        `FinGrp.initialArrowFrom: ${initial.name} must have exactly one element to witness initiality`,
      )
    }
    const [generator] = initial.elems
    if (!generator || initial.e !== generator) {
      throw new Error(
        `FinGrp.initialArrowFrom: ${initial.name} must have its identity as the unique element`,
      )
    }
    return {
      name: `!_${initial.name}→${target.name}`,
      dom: initial.name,
      cod: target.name,
      map: () => target.e,
    }
  },
  initialArrow(target: FinGrpObj): Hom {
    return FinGrp.initialArrowFrom(FinGrp.trivial(), target)
  },
  terminateAt(source: FinGrpObj, terminal: FinGrpObj): Hom {
    if (terminal.elems.length !== 1) {
      throw new Error(
        `FinGrp.terminateAt: ${terminal.name} must have exactly one element to witness terminality`,
      )
    }
    const [identity] = terminal.elems
    if (!identity || terminal.e !== identity) {
      throw new Error(
        `FinGrp.terminateAt: ${terminal.name} must designate its sole element as the identity`,
      )
    }
    return {
      name: `!^{${source.name}}→${terminal.name}`,
      dom: source.name,
      cod: terminal.name,
      map: () => identity,
    }
  },
  terminate(source: FinGrpObj): Hom {
    return FinGrp.terminateAt(source, FinGrp.trivial())
  },
  productMany(
    factors: ReadonlyArray<FinGrpObj>,
    store: FinGrpProductMetadataStore,
    options: { readonly name?: string; readonly disableSwap?: boolean } = {},
  ): FinGrpFiniteProductWitness {
    if (factors.length === 0) {
      const base = FinGrp.trivial()
      const object: FinGrpObj = options.name
        ? { ...base, name: options.name, elems: [...base.elems] }
        : base

      const pair = (domain: FinGrpObj, legs: ReadonlyArray<Hom>): Hom => {
        if (legs.length !== 0) {
          throw new Error(
            `FinGrp.productMany: empty product expects 0 legs, received ${legs.length}`,
          )
        }
        return FinGrp.terminateAt(domain, object)
      }

      store.register(object, { arity: 0, factorNames: [], factors: [], tuple: pair })

      const element = (components: ReadonlyArray<string>) => {
        if (components.length !== 0) {
          throw new Error("FinGrp.productMany: empty product has no coordinates to populate")
        }
        return object.e
      }

      const decompose = (value: string): ReadonlyArray<string> => {
        if (value !== object.e) {
          throw new Error(
            `FinGrp.productMany: ${value} is not the identity element of the empty product`,
          )
        }
        return []
      }

      const witness: FinGrpFiniteProductWitness = {
        object,
        projections: [],
        element,
        decompose,
        pair,
        factors: [],
      }
      return witness
    }

    if (factors.length === 1) {
      const factor = factors[0]!
      const object = factor

      const projection: Hom = {
        name: `π₀:${object.name}→${factor.name}`,
        dom: object.name,
        cod: factor.name,
        map: (value) => {
          if (!factor.elems.includes(value)) {
            throw new Error(
              `FinGrp.productMany: ${value} is not an element of singleton factor ${factor.name}`,
            )
          }
          return value
        },
      }

      const pair = (domain: FinGrpObj, legs: ReadonlyArray<Hom>): Hom => {
        if (legs.length !== 1) {
          throw new Error(
            `FinGrp.productMany: singleton product expects 1 leg, received ${legs.length}`,
          )
        }
        const leg = legs[0]!
        if (leg.dom !== domain.name) {
          throw new Error(
            `FinGrp.productMany: leg ${leg.name ?? "?"} has domain ${leg.dom} but expected ${domain.name}`,
          )
        }
        if (leg.cod !== factor.name) {
          throw new Error(
            `FinGrp.productMany: leg ${leg.name ?? "?"} targets ${leg.cod} but expected ${factor.name}`,
          )
        }
        if (!FinGrp.isHom(domain, factor, leg)) {
          throw new Error(
            `FinGrp.productMany: leg ${leg.name ?? "?"} is not a homomorphism into ${factor.name}`,
          )
        }
        return leg
      }

      store.register(object, {
        arity: 1,
        factorNames: [factor.name],
        factors: [factor],
        tuple: (domain, legs) => pair(domain, legs),
      })

      const element = (components: ReadonlyArray<string>) => {
        if (components.length !== 1) {
          throw new Error(
            `FinGrp.productMany: singleton product expects 1 component, received ${components.length}`,
          )
        }
        const value = components[0]!
        if (!factor.elems.includes(value)) {
          throw new Error(
            `FinGrp.productMany: ${value} is not an element of ${factor.name}`,
          )
        }
        return value
      }

      const decompose = (value: string): ReadonlyArray<string> => {
        if (!factor.elems.includes(value)) {
          throw new Error(
            `FinGrp.productMany: ${value} is not a member of singleton factor ${factor.name}`,
          )
        }
        return [value]
      }

      const witness: FinGrpFiniteProductWitness = {
        object,
        projections: [projection],
        element,
        decompose,
        pair,
        factors: [factor],
      }
      return witness
    }

    const encode = (entries: ReadonlyArray<string>) => JSON.stringify(entries)
    const arity = factors.length

    const decode = (value: string): string[] => {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed) || parsed.length !== arity) {
        throw new Error(`FinGrp.productMany: received malformed element ${value}`)
      }
      return parsed.map((component, index) => {
        if (typeof component !== "string") {
          throw new Error(
            `FinGrp.productMany: coordinate ${index} of ${value} is not a string element`,
          )
        }
        return component
      })
    }

    const ensureTuple = (components: ReadonlyArray<string>) => {
      if (components.length !== arity) {
        throw new Error(
          `FinGrp.productMany: expected ${arity} components, received ${components.length}`,
        )
      }
      components.forEach((component, index) => {
        const factor = factors[index]!
        if (!factor.elems.includes(component)) {
          throw new Error(
            `FinGrp.productMany: component ${component} is not an element of ${factor.name}`,
          )
        }
      })
    }

    let tuples: string[][] = [[]]
    for (const factor of factors) {
      const next: string[][] = []
      for (const prefix of tuples) {
        for (const element of factor.elems) {
          next.push([...prefix, element])
        }
      }
      tuples = next
    }

    const elements = tuples.map((combo) => encode(combo))
    const elementSet = new Set(elements)

    const ensureElement = (value: string) => {
      if (!elementSet.has(value)) {
        throw new Error(`FinGrp.productMany: ${value} is not a valid product element`)
      }
    }

    const defaultName = `(${factors.map((factor) => factor.name).join("×")})`
    const name = options.name ?? defaultName
    const identity = encode(factors.map((factor) => factor.e))

    const object: FinGrpObj = {
      name,
      elems: elements,
      e: identity,
      mul: (first, second) => {
        ensureElement(first)
        ensureElement(second)
        const leftCoords = decode(first)
        const rightCoords = decode(second)
        const productCoords = leftCoords.map((value, index) =>
          factors[index]!.mul(value, rightCoords[index]!),
        )
        return encode(productCoords)
      },
      inv: (value) => {
        ensureElement(value)
        const coords = decode(value)
        const inverted = coords.map((component, index) => factors[index]!.inv(component))
        return encode(inverted)
      },
    }

    const projections = factors.map((factor, index): Hom => ({
      name: `π_${index + 1}:${name}→${factor.name}`,
      dom: name,
      cod: factor.name,
      map: (value) => {
        ensureElement(value)
        const coords = decode(value)
        return coords[index]!
      },
    }))

    const element = (components: ReadonlyArray<string>) => {
      ensureTuple(components)
      const encoded = encode(components)
      ensureElement(encoded)
      return encoded
    }

    const decompose = (value: string): ReadonlyArray<string> => {
      ensureElement(value)
      const coords = decode(value)
      ensureTuple(coords)
      return coords
    }

    const pair = (domain: FinGrpObj, legs: ReadonlyArray<Hom>): Hom => {
      if (legs.length !== arity) {
        throw new Error(
          `FinGrp.productMany: expected ${arity} legs, received ${legs.length}`,
        )
      }

      legs.forEach((leg, index) => {
        if (!leg) {
          throw new Error(`FinGrp.productMany: leg ${index} is missing`)
        }
        if (leg.dom !== domain.name) {
          throw new Error(
            `FinGrp.productMany: leg ${leg.name ?? "?"} has domain ${leg.dom} but expected ${domain.name}`,
          )
        }
        const expectedCodomain = factors[index]!.name
        if (leg.cod !== expectedCodomain) {
          throw new Error(
            `FinGrp.productMany: leg ${leg.name ?? "?"} targets ${leg.cod} but expected ${expectedCodomain}`,
          )
        }
        if (!FinGrp.isHom(domain, factors[index]!, leg)) {
          throw new Error(
            `FinGrp.productMany: leg ${leg.name ?? "?"} is not a homomorphism into ${expectedCodomain}`,
          )
        }
      })

      const mediator: Hom = {
        name: `⟨${legs.map((leg) => leg.name ?? "?").join(",")}⟩`,
        dom: domain.name,
        cod: name,
        map: (value) => {
          if (!domain.elems.includes(value)) {
            throw new Error(
              `FinGrp.productMany: element ${value} is not a member of ${domain.name}`,
            )
          }
          const coords = legs.map((leg, index) => {
            const result = leg.map(value)
            const factor = factors[index]!
            if (!factor.elems.includes(result)) {
              throw new Error(
                `FinGrp.productMany: leg ${leg.name ?? index} sends ${value} to ${result}, which is not in ${factor.name}`,
              )
            }
            return result
          })
          return element(coords)
        },
      }

      if (!FinGrp.isHom(domain, object, mediator)) {
        throw new Error(
          "FinGrp.productMany: mediating map does not preserve the group structure",
        )
      }

      return mediator
    }

    store.register(object, {
      arity,
      factorNames: factors.map((factor) => factor.name),
      factors: [...factors],
      tuple: (domain, legs) => pair(domain, legs),
    })

    let swapAccessor: (() => FinGrpProductSwap) | undefined
    let diagonalAccessor: (() => FinGrpProductDiagonal) | undefined
    let leftUnitAccessor: (() => FinGrpProductUnit) | undefined
    let rightUnitAccessor: (() => FinGrpProductUnit) | undefined
    let componentwiseAccessor:
      | ((target: FinGrpFiniteProductWitness, components: ReadonlyArray<Hom>) => Hom)
      | undefined

    if (arity === 2) {
      const leftFactor = factors[0]
      const rightFactor = factors[1]
      if (!leftFactor || !rightFactor) {
        throw new Error("FinGrp.productMany: missing factor while analysing binary product")
      }

      const projection1 = projections[0]
      const projection2 = projections[1]
      if (!projection1 || !projection2) {
        throw new Error("FinGrp.productMany: binary product must expose two projections")
      }

      if (!options.disableSwap) {
        const swappedWitness = FinGrp.productMany([rightFactor, leftFactor], store, {
          disableSwap: true,
        })

          const swappedProjection1 = swappedWitness.projections[0]
          const swappedProjection2 = swappedWitness.projections[1]
          if (!swappedProjection1 || !swappedProjection2) {
            throw new Error("FinGrp.productMany: swapped product missing projections")
          }

          const swapData = makeBinaryProductSwap<FinGrpObj, Hom>(
          {
            object,
            projections: [projection1, projection2],
            tuple: (domain, legs) => pair(domain, legs),
          },
          {
            object: swappedWitness.object,
            projections: [swappedProjection1, swappedProjection2],
            tuple: (domain, legs) => swappedWitness.pair(domain, legs),
          },
        )

        swapAccessor = () => ({
          target: swappedWitness,
          forward: swapData.forward,
          backward: swapData.backward,
        })
      }

      if (leftFactor === rightFactor) {
        const identity = makeIdentityArrow(leftFactor)

        const diagonal = makeBinaryProductDiagonal<FinGrpObj, Hom>(
          {
            object,
            projections: [projection1, projection2],
            tuple: (domain, legs) => pair(domain, legs),
          },
          {
            object: leftFactor,
            identity,
          },
        )

        diagonalAccessor = () => ({ source: leftFactor, arrow: diagonal })
      }

      if (isTerminalGroup(leftFactor)) {
        const identityRight = makeIdentityArrow(rightFactor)
        const terminateRight = FinGrp.terminateAt(rightFactor, leftFactor)
        const backward = pair(rightFactor, [terminateRight, identityRight])
        leftUnitAccessor = () => ({
          factor: rightFactor,
          forward: projection2,
          backward,
        })
      }

      if (isTerminalGroup(rightFactor)) {
        const identityLeft = makeIdentityArrow(leftFactor)
        const terminateLeft = FinGrp.terminateAt(leftFactor, rightFactor)
        const backward = pair(leftFactor, [identityLeft, terminateLeft])
        rightUnitAccessor = () => ({
          factor: leftFactor,
          forward: projection1,
          backward,
        })
      }

      const composeArrows = (g: Hom, f: Hom): Hom => {
        if (f.cod !== g.dom) {
          throw new Error(
            "FinGrp.productMany: componentwise constructor expects composable arrows",
          )
        }
        return {
          name: `${g.name}∘${f.name}`,
          dom: f.dom,
          cod: g.cod,
          map: (value) => g.map(f.map(value)),
        }
      }

      componentwiseAccessor = (target, components) => {
        if (components.length !== 2) {
          throw new Error(
            `FinGrp.productMany: binary componentwise map expects 2 components, received ${components.length}`,
          )
        }
        if (target.factors.length !== 2) {
          throw new Error(
            "FinGrp.productMany: binary componentwise map requires a binary target product",
          )
        }

        const [leftComponent, rightComponent] = components as readonly [Hom, Hom]
        const [targetLeft, targetRight] = target.factors as readonly [FinGrpObj, FinGrpObj]
        if (!leftFactor || !rightFactor || !targetLeft || !targetRight) {
          throw new Error("FinGrp.productMany: binary factor witnesses missing")
        }

        if (leftComponent.dom !== leftFactor.name) {
          throw new Error(
            `FinGrp.productMany: left component ${leftComponent.name} must source ${leftFactor.name}`,
          )
        }
        if (leftComponent.cod !== targetLeft.name) {
          throw new Error(
            `FinGrp.productMany: left component ${leftComponent.name} must target ${targetLeft.name}`,
          )
        }
        if (!FinGrp.isHom(leftFactor, targetLeft, leftComponent)) {
          throw new Error(
            `FinGrp.productMany: left component ${leftComponent.name} is not a homomorphism ${leftFactor.name}→${targetLeft.name}`,
          )
        }

        if (rightComponent.dom !== rightFactor.name) {
          throw new Error(
            `FinGrp.productMany: right component ${rightComponent.name} must source ${rightFactor.name}`,
          )
        }
        if (rightComponent.cod !== targetRight.name) {
          throw new Error(
            `FinGrp.productMany: right component ${rightComponent.name} must target ${targetRight.name}`,
          )
        }
        if (!FinGrp.isHom(rightFactor, targetRight, rightComponent)) {
          throw new Error(
            `FinGrp.productMany: right component ${rightComponent.name} is not a homomorphism ${rightFactor.name}→${targetRight.name}`,
          )
        }

        const targetProjection1 = target.projections[0]
        const targetProjection2 = target.projections[1]
        if (!targetProjection1 || !targetProjection2) {
          throw new Error(
            "FinGrp.productMany: binary componentwise map requires target projections",
          )
        }

        const arrow = makeBinaryProductComponentwise<FinGrpObj, Hom>({
          category: { compose: composeArrows },
          source: {
            object,
            projections: [projection1, projection2],
            tuple: (domain, legs) => pair(domain, legs),
          },
          target: {
            object: target.object,
            projections: [targetProjection1, targetProjection2],
            tuple: (domain, legs) => target.pair(domain, legs),
          },
          components: [leftComponent, rightComponent],
        })

        if (!FinGrp.isHom(object, target.object, arrow)) {
          throw new Error(
            "FinGrp.productMany: componentwise constructor produced a non-homomorphism",
          )
        }

        return arrow
      }
    }

    const witness: FinGrpFiniteProductWitness = {
      object,
      projections,
      element,
      decompose,
      pair,
      factors: [...factors],
    }
    let extended: FinGrpFiniteProductWitness = witness
    if (componentwiseAccessor) {
      extended = { ...extended, componentwise: componentwiseAccessor }
    }
    if (swapAccessor) {
      extended = { ...extended, swap: swapAccessor }
    }
    if (diagonalAccessor) {
      extended = { ...extended, diagonal: diagonalAccessor }
    }
    if (leftUnitAccessor) {
      extended = { ...extended, leftUnit: leftUnitAccessor }
    }
    if (rightUnitAccessor) {
      extended = { ...extended, rightUnit: rightUnitAccessor }
    }
    return extended
  },
  product(
    left: FinGrpObj,
    right: FinGrpObj,
    store: FinGrpProductMetadataStore,
    options: { readonly name?: string } = {},
  ): FinGrpProductWitness {
    const witness = FinGrp.productMany([left, right], store, options)
    const [projection1, projection2] = witness.projections
    if (!projection1 || !projection2) {
      throw new Error("FinGrp.product: failed to obtain binary projections from productMany")
    }

    const result: FinGrpProductWitness = {
      object: witness.object,
      projection1,
      projection2,
      element: (leftElem: string, rightElem: string) => witness.element([leftElem, rightElem]),
      decompose: (value: string) => {
        const coords = witness.decompose(value)
        if (coords.length !== 2) {
          throw new Error(`FinGrp.product: element ${value} does not decode to two components`)
        }
        const first = coords[0]!
        const second = coords[1]!
        return [first, second] as const
      },
      pair: (domain: FinGrpObj, leftHom: Hom, rightHom: Hom) =>
        witness.pair(domain, [leftHom, rightHom]),
      factors: [left, right],
    }
    let extended: FinGrpProductWitness = result
    if (witness.componentwise) {
      extended = {
        ...extended,
        componentwise: (target, components) =>
          witness.componentwise!(
            {
              object: target.object,
              projections: [target.projection1, target.projection2],
              element: (items: ReadonlyArray<string>) => {
                if (items.length !== 2) {
                  throw new Error(
                    `FinGrp.product: componentwise lift expects 2 coordinates, received ${items.length}`,
                  )
                }
                const [leftCoord, rightCoord] = items as readonly [string, string]
                return target.element(leftCoord, rightCoord)
              },
              decompose: target.decompose,
              pair: (domain: FinGrpObj, legs: ReadonlyArray<Hom>) => {
                if (legs.length !== 2) {
                  throw new Error(
                    `FinGrp.product: componentwise lift expects 2 legs, received ${legs.length}`,
                  )
                }
                const [leftLeg, rightLeg] = legs as readonly [Hom, Hom]
                return target.pair(domain, leftLeg, rightLeg)
              },
              factors: target.factors,
            },
            components,
          ),
      }
    }
    if (witness.swap) {
      extended = { ...extended, swap: witness.swap }
    }
    if (witness.diagonal) {
      extended = { ...extended, diagonal: witness.diagonal }
    }
    if (witness.leftUnit) {
      extended = { ...extended, leftUnit: witness.leftUnit }
    }
    if (witness.rightUnit) {
      extended = { ...extended, rightUnit: witness.rightUnit }
    }
    return extended
  },
  tupleMany(
    store: FinGrpProductMetadataStore,
    domain: FinGrpObj,
    legs: ReadonlyArray<Hom>,
    product: FinGrpObj,
  ): Hom {
    const metadata = store.lookup(product)
    if (!metadata) {
      throw new Error(
        `FinGrp.tupleMany: unrecognised product object ${product.name}; build it via FinGrp.productMany first`,
      )
    }
    if (legs.length !== metadata.arity) {
      const expectation = metadata.factorNames.length
        ? metadata.factorNames.join(", ")
        : "<empty product>"
      throw new Error(
        `FinGrp.tupleMany: expected ${metadata.arity} legs for factors ${expectation}, received ${legs.length}`,
      )
    }
    return metadata.tuple(domain, legs)
  },
}
