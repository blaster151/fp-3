import type { FiniteCategory } from "../finite-cat"
import { pushUnique } from "../finite-cat"
import type { IsoWitness } from "../kinds/iso"
import {
  type PullbackCalculator,
  type PullbackCertification,
  type PullbackComparison,
  type PullbackConeFactorResult,
  type PullbackData,
} from "../pullback"
import type { CartesianClosedCategory, Category } from "../stdlib/category"
import { CategoryLimits } from "../stdlib/category-limits"

export interface FinPosObj {
  readonly name: string
  readonly elems: readonly string[]
  readonly leq: (a: string, b: string) => boolean
}

export interface MonoMap {
  readonly name: string
  readonly dom: string
  readonly cod: string
  readonly map: (x: string) => string
}

export type TerminalArrowFailure =
  | { readonly kind: "domainMismatch"; readonly expected: string; readonly received: string }
  | { readonly kind: "codomainMismatch"; readonly expected: string; readonly received: string }
  | { readonly kind: "nonTerminal"; readonly reason: string }
  | { readonly kind: "notMonotone"; readonly witness: readonly [string, string] }
  | { readonly kind: "nonConstant"; readonly point: string; readonly witness: string }

export type TerminalElementTransportFailure =
  | TerminalArrowFailure
  | { readonly kind: "elementNotInCodomain"; readonly codomain: string; readonly element: string }

export interface TerminalIsomorphism {
  readonly toCanonical: MonoMap
  readonly fromCanonical: MonoMap
}

export interface TerminalArrowAnalysis {
  readonly holds: boolean
  readonly witness?: MonoMap
  readonly details: string
  readonly failure?: TerminalArrowFailure
}

export interface TerminalElementTransportWitness {
  readonly iso: TerminalIsomorphism
  readonly canonical: MonoMap
  readonly value: string
}

export interface TerminalElementTransportAnalysis {
  readonly holds: boolean
  readonly details: string
  readonly witness?: TerminalElementTransportWitness
  readonly failure?: TerminalElementTransportFailure
}

export type PointSeparationFailure =
  | {
      readonly kind: "domainMismatch"
      readonly side: "left" | "right"
      readonly expected: string
      readonly received: string
    }
  | {
      readonly kind: "codomainMismatch"
      readonly expected: string
      readonly left: string
      readonly right: string
    }
  | { readonly kind: "noPoints"; readonly object: string }
  | { readonly kind: "notMonotone"; readonly side: "left" | "right"; readonly witness: readonly [string, string] }
  | {
      readonly kind: "valueNotInCodomain"
      readonly side: "left" | "right"
      readonly codomain: string
      readonly element: string
    }
  | { readonly kind: "indistinguishable" }

export interface PointSeparationWitness {
  readonly element: string
  readonly point: MonoMap
  readonly leftValue: string
  readonly rightValue: string
}

export interface PointSeparationAnalysis {
  readonly holds: boolean
  readonly details: string
  readonly witness?: PointSeparationWitness
  readonly failure?: PointSeparationFailure
}

export interface FinPosCategory extends FiniteCategory<string, MonoMap> {
  readonly traits: { readonly functionalArrows: true }
  readonly one: () => string
  readonly globals: (object: string) => MonoMap[]
  readonly generalizedElements: (shape: string, target: string) => MonoMap[]
  readonly lookup: (name: string) => FinPosObj
  readonly product: (left: string, right: string) => FinPosProduct
  readonly exponential: (base: string, codomain: string) => FinPosExponential
}

export interface FinPosProduct {
  readonly object: FinPosObj
  readonly projections: { readonly fst: MonoMap; readonly snd: MonoMap }
  readonly pair: (left: string, right: string) => string
  readonly decompose: (element: string) => readonly [string, string]
}

export interface FinPosExponential {
  readonly object: FinPosObj
  readonly functions: readonly MonoMap[]
  readonly product: FinPosProduct
  readonly evaluation: MonoMap
  readonly curry: (domain: FinPosObj, arrow: MonoMap) => MonoMap
}

export interface FinPosExponentialComparison {
  readonly leftToRight: MonoMap
  readonly rightToLeft: MonoMap
}

const INITIAL_NAME = "0"
const TERMINAL_NAME = "1"
const TERMINAL_POINT = "⋆"
const TRUTH_VALUES_NAME = "Ω"
const TRUTH_TRUE = "⊤"
const TRUTH_FALSE = "⊥"

const registry = new Map<string, FinPosObj>()
let cachedTruthArrow: MonoMap | undefined
let cachedFalseArrow: MonoMap | undefined
let cachedNegation: MonoMap | undefined

function register(object: FinPosObj): FinPosObj {
  registry.set(object.name, object)
  return object
}

function ensureRegistered(name: string): FinPosObj {
  const object = registry.get(name)
  if (!object) {
    throw new Error(`FinPos: unknown object ${name}`)
  }
  return object
}

function truthValuesObj(): FinPosObj {
  const existing = registry.get(TRUTH_VALUES_NAME)
  if (existing) {
    return existing
  }
  return register({
    name: TRUTH_VALUES_NAME,
    elems: [TRUTH_TRUE, TRUTH_FALSE],
    leq: (left, right) => {
      if (left === right) {
        return true
      }
      return left === TRUTH_TRUE && right === TRUTH_FALSE
    },
  })
}

function findMonotonicityViolation(
  dom: FinPosObj,
  cod: FinPosObj,
  arrow: MonoMap,
): readonly [string, string] | undefined {
  for (const a of dom.elems) {
    for (const b of dom.elems) {
      if (dom.leq(a, b) && !cod.leq(arrow.map(a), arrow.map(b))) {
        return [a, b]
      }
    }
  }
  return undefined
}

function describeNonTerminal(name: string, elems: readonly string[]): TerminalArrowFailure {
  if (elems.length !== 1) {
    return {
      kind: "nonTerminal",
      reason: `${name} cannot be terminal with |${name}| = ${elems.length}`,
    }
  }
  const [point] = elems
  if (!point) {
    return {
      kind: "nonTerminal",
      reason: `${name} lacks a designated point`,
    }
  }
  return {
    kind: "nonTerminal",
    reason: `${name} fails the terminality witnesses`,
  }
}

function buildEmptyDomainArrow(source: FinPosObj, target: FinPosObj): MonoMap {
  return {
    name: `!_${source.name}→${target.name}`,
    dom: source.name,
    cod: target.name,
    map: () => {
      throw new Error(
        `FinPos: attempted to evaluate the unique map ${source.name}→${target.name} on an element of the empty domain`,
      )
    },
  }
}

function enumerateMonotoneMaps(shape: FinPosObj, target: FinPosObj): MonoMap[] {
  if (shape.elems.length === 0) {
    return [buildEmptyDomainArrow(shape, target)]
  }

  if (target.elems.length === 0) {
    return []
  }

  const assignments = new Map<string, string>()
  const elements = [...shape.elems]
  const codomain = [...target.elems]
  const witnesses: MonoMap[] = []

  const extend = (index: number) => {
    if (index === elements.length) {
      const images: Record<string, string> = {}
      for (const element of elements) {
        const image = assignments.get(element)
        if (image === undefined) {
          throw new Error(
            `FinPos.generalizedElements: incomplete assignment for ${element} in ${shape.name}`,
          )
        }
        images[element] = image
      }

      const map: MonoMap = {
        name: `⟪${shape.name}→${target.name}:${elements
          .map((element) => `${element}↦${images[element]}`)
          .join(", ")}⟫`,
        dom: shape.name,
        cod: target.name,
        map: (value: string) => {
          const image = images[value]
          if (image === undefined) {
            throw new Error(
              `FinPos.generalizedElements: ${shape.name} lacks an image for ${value}`,
            )
          }
          return image
        },
      }

      if (findMonotonicityViolation(shape, target, map) === undefined) {
        witnesses.push(map)
      }
      return
    }

    const element = elements[index]!
    for (const image of codomain) {
      assignments.set(element, image)
      extend(index + 1)
    }
    assignments.delete(element)
  }

  extend(0)
  return witnesses
}

function ensureObject(index: Record<string, FinPosObj>, name: string): FinPosObj {
  const obj = index[name]
  if (!obj) {
    throw new Error(`FinPosCat: unknown object ${name}`)
  }
  return register(obj)
}

export function FinPosCat(objects: readonly FinPosObj[]): FinPosCategory {
  const byName: Record<string, FinPosObj> = {}
  for (const obj of objects) {
    byName[obj.name] = obj
  }
  if (!byName[INITIAL_NAME]) {
    const initial = FinPos.zero()
    byName[initial.name] = initial
  }
  if (!byName[TERMINAL_NAME]) {
    const terminal = FinPos.one()
    byName[terminal.name] = terminal
  }

  const objectList = Object.keys(byName)
  const arrows: MonoMap[] = []

  const eq = (f: MonoMap, g: MonoMap) =>
    f.dom === g.dom &&
    f.cod === g.cod &&
    ensureObject(byName, f.dom).elems.every((x) => f.map(x) === g.map(x))

  const registerObject = (object: FinPosObj) => {
    register(object)
    const existing = byName[object.name]
    byName[object.name] = object
    if (!existing) {
      objectList.push(object.name)
    }
  }

  const registerArrow = (arrow: MonoMap) => {
    const dom = ensureObject(byName, arrow.dom)
    const cod = ensureObject(byName, arrow.cod)
    registerObject(dom)
    registerObject(cod)
    pushUnique(arrows, arrow, eq)
  }

  const id = (A: string): MonoMap => ({
    name: `id_${A}`,
    dom: A,
    cod: A,
    map: (x) => x,
  })

  const compose = (g: MonoMap, f: MonoMap): MonoMap => {
    if (f.cod !== g.dom) {
      throw new Error("FinPosCat: compose expects matching codomain/domain")
    }
    return {
      name: `${g.name}∘${f.name}`,
      dom: f.dom,
      cod: g.cod,
      map: (x) => g.map(f.map(x)),
    }
  }

  const src = (f: MonoMap) => f.dom
  const dst = (f: MonoMap) => f.cod

  const globals = (A: string): MonoMap[] =>
    ensureObject(byName, A).elems.map((a) => ({
      name: `⟨${a}⟩`,
      dom: TERMINAL_NAME,
      cod: A,
      map: (_x: string) => a,
    }))

  const category: FinPosCategory = {
    objects: objectList,
    arrows,
    id,
    compose,
    src,
    dst,
    eq,
    traits: { functionalArrows: true },
    one: () => TERMINAL_NAME,
    globals,
    generalizedElements: (shape, target) =>
      FinPos.generalizedElements(ensureObject(byName, shape), ensureObject(byName, target)),
    lookup: (name) => ensureObject(byName, name),
    product: (left, right) => {
      const result = FinPos.product(ensureObject(byName, left), ensureObject(byName, right))
      registerObject(result.object)
      registerArrow(result.projections.fst)
      registerArrow(result.projections.snd)
      return result
    },
    exponential: (base, codomain) => {
      const result = FinPos.exponential(
        ensureObject(byName, base),
        ensureObject(byName, codomain),
      )
      registerObject(result.object)
      registerObject(result.product.object)
      registerArrow(result.product.projections.fst)
      registerArrow(result.product.projections.snd)
      registerArrow(result.evaluation)
      return {
        ...result,
        curry: (domain, arrow) => {
          const curried = result.curry(domain, arrow)
          registerArrow(curried)
          return curried
        },
      }
    },
  }

  return category
}

export const FinPos = {
  registerObject(object: FinPosObj): FinPosObj {
    return register(object)
  },
  lookup(name: string): FinPosObj {
    return ensureRegistered(name)
  },
  isMonotone(dom: FinPosObj, cod: FinPosObj, f: MonoMap): boolean {
    return findMonotonicityViolation(dom, cod, f) === undefined
  },
  injective(dom: FinPosObj, _cod: FinPosObj, f: MonoMap): boolean {
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
  surjective(_dom: FinPosObj, cod: FinPosObj, f: MonoMap): boolean {
    const pending = new Set(cod.elems)
    for (const a of _dom.elems) {
      pending.delete(f.map(a))
    }
    return pending.size === 0
  },
  zero(): FinPosObj {
    const existing = registry.get(INITIAL_NAME)
    if (existing) {
      return existing
    }
    return register({
      name: INITIAL_NAME,
      elems: [],
      leq: () => false,
    })
  },
  one(): FinPosObj {
    const existing = registry.get(TERMINAL_NAME)
    if (existing) {
      return existing
    }
    return register({
      name: TERMINAL_NAME,
      elems: [TERMINAL_POINT],
      leq: () => true,
    })
  },
  truthValues(): FinPosObj {
    return truthValuesObj()
  },
  truthArrow(): MonoMap {
    if (!cachedTruthArrow) {
      const terminal = FinPos.one()
      const truth = truthValuesObj()
      cachedTruthArrow = {
        name: `⊤_${terminal.name}`,
        dom: terminal.name,
        cod: truth.name,
        map: () => TRUTH_TRUE,
      }
    }
    return cachedTruthArrow
  },
  falseArrow(): MonoMap {
    if (!cachedFalseArrow) {
      const terminal = FinPos.one()
      const truth = truthValuesObj()
      cachedFalseArrow = {
        name: `⊥_${terminal.name}`,
        dom: terminal.name,
        cod: truth.name,
        map: () => TRUTH_FALSE,
      }
    }
    return cachedFalseArrow
  },
  globals(A: FinPosObj): MonoMap[] {
    return A.elems.map((a) => ({
      name: `⟨${a}⟩`,
      dom: TERMINAL_NAME,
      cod: A.name,
      map: (_x: string) => a,
    }))
  },
  generalizedElements(shape: FinPosObj, target: FinPosObj): MonoMap[] {
    return enumerateMonotoneMaps(shape, target)
  },
  characteristic(monomorphism: MonoMap): MonoMap {
    const domain = ensureRegistered(monomorphism.dom)
    const codomain = ensureRegistered(monomorphism.cod)

    if (!FinPos.isMonotone(domain, codomain, monomorphism)) {
      throw new Error('FinPos.characteristic: monomorphism must be monotone.')
    }
    if (!FinPos.injective(domain, codomain, monomorphism)) {
      throw new Error('FinPos.characteristic: monomorphism must be injective to classify a subobject.')
    }

    const image = new Set<string>()
    for (const element of domain.elems) {
      const imageValue = monomorphism.map(element)
      if (!codomain.elems.includes(imageValue)) {
        throw new Error(
          `FinPos.characteristic: image ${imageValue} is not an element of ${codomain.name}.`,
        )
      }
      image.add(imageValue)
    }

    const downwardClosure = new Set<string>()
    for (const candidate of codomain.elems) {
      for (const witness of image) {
        if (codomain.leq(candidate, witness)) {
          downwardClosure.add(candidate)
          break
        }
      }
    }

    for (const candidate of downwardClosure) {
      if (!image.has(candidate)) {
        throw new Error(
          'FinPos.characteristic: monomorphism image must be downward closed in its codomain.',
        )
      }
    }

    const truth = truthValuesObj()
    const chi: MonoMap = {
      name: `χ_${monomorphism.name}`,
      dom: codomain.name,
      cod: truth.name,
      map: (value: string) => {
        if (!codomain.elems.includes(value)) {
          throw new Error(`FinPos.characteristic: ${value} is not an element of ${codomain.name}.`)
        }
        return downwardClosure.has(value) ? TRUTH_TRUE : TRUTH_FALSE
      },
    }

    if (!FinPos.isMonotone(codomain, truth, chi)) {
      throw new Error('FinPos.characteristic: classified arrow must be monotone.')
    }

    return chi
  },
  subobjectFromCharacteristic(characteristic: MonoMap): { readonly subobject: FinPosObj; readonly inclusion: MonoMap } {
    const ambient = ensureRegistered(characteristic.dom)
    const truth = truthValuesObj()

    if (characteristic.cod !== truth.name) {
      throw new Error('FinPos.subobjectFromCharacteristic: characteristic arrow must land in Ω.')
    }

    const selected = new Set<string>()
    for (const element of ambient.elems) {
      const verdict = characteristic.map(element)
      if (verdict !== TRUTH_TRUE && verdict !== TRUTH_FALSE) {
        throw new Error('FinPos.subobjectFromCharacteristic: characteristic arrow is not truth-valued.')
      }
      if (verdict === TRUTH_TRUE) {
        selected.add(element)
      }
    }

    for (const candidate of selected) {
      for (const witness of ambient.elems) {
        if (ambient.leq(witness, candidate) && !selected.has(witness)) {
          throw new Error('FinPos.subobjectFromCharacteristic: true fibre must form a downward closed subset.')
        }
      }
    }

    const elements = [...selected]
    const subobject = register({
      name: `{${elements.join(',')}}⊆${ambient.name}`,
      elems: elements,
      leq: (left: string, right: string) => ambient.leq(left, right),
    })

    const inclusion: MonoMap = {
      name: `inc_${subobject.name}`,
      dom: subobject.name,
      cod: ambient.name,
      map: (value: string) => {
        if (!subobject.elems.includes(value)) {
          throw new Error(`FinPos.subobjectFromCharacteristic: ${value} is not in the classified subobject ${subobject.name}.`)
        }
        return value
      },
    }

    if (!FinPos.isMonotone(subobject, ambient, inclusion)) {
      throw new Error('FinPos.subobjectFromCharacteristic: reconstructed inclusion must be monotone.')
    }
    if (!FinPos.injective(subobject, ambient, inclusion)) {
      throw new Error('FinPos.subobjectFromCharacteristic: reconstructed inclusion must be injective.')
    }

    return { subobject, inclusion }
  },
  negation(): MonoMap {
    if (!cachedNegation) {
      const truth = truthValuesObj()
      cachedNegation = {
        name: `¬_${truth.name}`,
        dom: truth.name,
        cod: truth.name,
        map: (value: string) => {
          if (!truth.elems.includes(value)) {
            throw new Error(`FinPos.negation: ${value} is not an element of ${truth.name}.`)
          }
          return value === TRUTH_TRUE ? TRUTH_FALSE : TRUTH_TRUE
        },
      }
    }
    return cachedNegation
  },
  product(left: FinPosObj, right: FinPosObj): FinPosProduct {
    register(left)
    register(right)
    const pairLookup = new Map<string, readonly [string, string]>()
    const elements: string[] = []

    for (const a of left.elems) {
      for (const b of right.elems) {
        const label = `⟨${a},${b}⟩`
        pairLookup.set(label, [a, b])
        elements.push(label)
      }
    }

    const object: FinPosObj = register({
      name: `${left.name}×${right.name}`,
      elems: elements,
      leq: (x, y) => {
        const leftPair = pairLookup.get(x)
        const rightPair = pairLookup.get(y)
        if (!leftPair || !rightPair) {
          throw new Error(`FinPos.product: ${x} or ${y} not recognised in ${object.name}`)
        }
        const [xLeft, xRight] = leftPair
        const [yLeft, yRight] = rightPair
        return left.leq(xLeft, yLeft) && right.leq(xRight, yRight)
      },
    })

    const fst: MonoMap = {
      name: `π₁_${object.name}`,
      dom: object.name,
      cod: left.name,
      map: (value) => {
        const pair = pairLookup.get(value)
        if (!pair) {
          throw new Error(`FinPos.product: ${value} not recognised in ${object.name}`)
        }
        return pair[0]
      },
    }

    const snd: MonoMap = {
      name: `π₂_${object.name}`,
      dom: object.name,
      cod: right.name,
      map: (value) => {
        const pair = pairLookup.get(value)
        if (!pair) {
          throw new Error(`FinPos.product: ${value} not recognised in ${object.name}`)
        }
        return pair[1]
      },
    }

    const pair = (leftValue: string, rightValue: string) => {
      if (!left.elems.includes(leftValue)) {
        throw new Error(`FinPos.product: ${leftValue} is not in ${left.name}`)
      }
      if (!right.elems.includes(rightValue)) {
        throw new Error(`FinPos.product: ${rightValue} is not in ${right.name}`)
      }
      const label = `⟨${leftValue},${rightValue}⟩`
      if (!pairLookup.has(label)) {
        throw new Error(`FinPos.product: pair ${label} missing from ${object.name}`)
      }
      return label
    }

    const decompose = (value: string): readonly [string, string] => {
      const pair = pairLookup.get(value)
      if (!pair) {
        throw new Error(`FinPos.product: ${value} not recognised in ${object.name}`)
      }
      return pair
    }

    return {
      object,
      projections: { fst, snd },
      pair,
      decompose,
    }
  },
  monotoneFunctionPoset(base: FinPosObj, codomain: FinPosObj): FinPosExponential {
    register(base)
    register(codomain)
    const monotoneMaps = enumerateMonotoneMaps(base, codomain)
    const functions: readonly MonoMap[] = [...monotoneMaps]
    const mapLookup = new Map(functions.map((map) => [map.name, map] as const))
    const signatureLookup = new Map<string, string>()

    const signature = (map: MonoMap) =>
      base.elems.map((element) => `${element}↦${map.map(element)}`).join("|")

    for (const map of functions) {
      signatureLookup.set(signature(map), map.name)
    }

    const object: FinPosObj = register({
      name: `${codomain.name}^${base.name}`,
      elems: functions.map((map) => map.name),
      leq: (fName, gName) => {
        const f = mapLookup.get(fName)
        const g = mapLookup.get(gName)
        if (!f || !g) {
          throw new Error(
            `FinPos.monotoneFunctionPoset: unknown function ${fName} or ${gName}`,
          )
        }
        for (const element of base.elems) {
          if (!codomain.leq(f.map(element), g.map(element))) {
            return false
          }
        }
        return true
      },
    })

    const product = FinPos.product(object, base)

    const evaluation: MonoMap = {
      name: `eval_${codomain.name}^${base.name}`,
      dom: product.object.name,
      cod: codomain.name,
      map: (value) => {
        const [funcName, argument] = product.decompose(value)
        const func = mapLookup.get(funcName)
        if (!func) {
          throw new Error(
            `FinPos.monotoneFunctionPoset: unknown function element ${funcName}`,
          )
        }
        return func.map(argument)
      },
    }

    const curry = (domain: FinPosObj, arrow: MonoMap): MonoMap => {
      const expected = FinPos.product(domain, base)
      if (arrow.dom !== expected.object.name) {
        throw new Error(
          `FinPos.monotoneFunctionPoset.curry: arrow ${arrow.name} does not originate at ${expected.object.name}`,
        )
      }
      if (arrow.cod !== codomain.name) {
        throw new Error(
          `FinPos.monotoneFunctionPoset.curry: arrow ${arrow.name} does not land in ${codomain.name}`,
        )
      }

      const assignment = new Map<string, string>()
      for (const element of domain.elems) {
        const outputs: Record<string, string> = {}
        for (const argument of base.elems) {
          const pairValue = expected.pair(element, argument)
          const image = arrow.map(pairValue)
          if (!codomain.elems.includes(image)) {
            throw new Error(
              `FinPos.monotoneFunctionPoset.curry: image ${image} is not in ${codomain.name}`,
            )
          }
          outputs[argument] = image
        }
        const signatureKey = base.elems
          .map((arg) => `${arg}↦${outputs[arg] ?? ""}`)
          .join("|")
        const elementName = signatureLookup.get(signatureKey)
        if (!elementName) {
          throw new Error(
            `FinPos.monotoneFunctionPoset.curry: assignment for ${element} is not monotone into ${codomain.name}`,
          )
        }
        assignment.set(element, elementName)
      }

      const curried: MonoMap = {
        name: `λ(${arrow.name})`,
        dom: domain.name,
        cod: object.name,
        map: (value: string) => {
          const image = assignment.get(value)
          if (!image) {
            throw new Error(
              `FinPos.monotoneFunctionPoset.curry: ${value} is not recognised as an element of ${domain.name}`,
            )
          }
          return image
        },
      }

      if (!FinPos.isMonotone(domain, object, curried)) {
        throw new Error(
          "FinPos.monotoneFunctionPoset.curry: resulting mediator fails monotonicity",
        )
      }

      return curried
    }

    return { object, functions, product, evaluation, curry }
  },
  exponential(base: FinPosObj, codomain: FinPosObj): FinPosExponential {
    return FinPos.monotoneFunctionPoset(base, codomain)
  },
  exponentialComparison(
    base: FinPosObj,
    codomain: FinPosObj,
    left: FinPosExponential,
    right: FinPosExponential,
  ): FinPosExponentialComparison {
    const ensureWitness = (label: string, witness: FinPosExponential) => {
      if (witness.product.projections.snd.cod !== base.name) {
        throw new Error(
          `FinPos.exponentialComparison: ${label} witness is not parameterised by ${base.name}`,
        )
      }
      if (witness.evaluation.cod !== codomain.name) {
        throw new Error(
          `FinPos.exponentialComparison: ${label} witness does not evaluate into ${codomain.name}`,
        )
      }
      if (witness.evaluation.dom !== witness.product.object.name) {
        throw new Error(
          `FinPos.exponentialComparison: ${label} witness has mismatched evaluation domain`,
        )
      }
      if (witness.product.projections.fst.cod !== witness.object.name) {
        throw new Error(
          `FinPos.exponentialComparison: ${label} witness exposes an unexpected function object`,
        )
      }
    }

    ensureWitness("left", left)
    ensureWitness("right", right)

    const leftToRight = right.curry(left.object, left.evaluation)
    const rightToLeft = left.curry(right.object, right.evaluation)

    if (!FinPos.isMonotone(left.object, right.object, leftToRight)) {
      throw new Error(
        "FinPos.exponentialComparison: mediator from left to right fails monotonicity",
      )
    }
    if (!FinPos.isMonotone(right.object, left.object, rightToLeft)) {
      throw new Error(
        "FinPos.exponentialComparison: mediator from right to left fails monotonicity",
      )
    }

    for (const element of left.object.elems) {
      const image = leftToRight.map(element)
      if (!right.object.elems.includes(image)) {
        throw new Error(
          `FinPos.exponentialComparison: mediator from left to right leaves ${right.object.name}`,
        )
      }
      for (const argument of base.elems) {
        const leftPair = left.product.pair(element, argument)
        const rightPair = right.product.pair(image, argument)
        const leftValue = left.evaluation.map(leftPair)
        const rightValue = right.evaluation.map(rightPair)
        if (leftValue !== rightValue) {
          throw new Error(
            `FinPos.exponentialComparison: factoring ${left.evaluation.name} through the right witness failed`,
          )
        }
      }
    }

    for (const element of right.object.elems) {
      const image = rightToLeft.map(element)
      if (!left.object.elems.includes(image)) {
        throw new Error(
          `FinPos.exponentialComparison: mediator from right to left leaves ${left.object.name}`,
        )
      }
      for (const argument of base.elems) {
        const rightPair = right.product.pair(element, argument)
        const leftPair = left.product.pair(image, argument)
        const rightValue = right.evaluation.map(rightPair)
        const leftValue = left.evaluation.map(leftPair)
        if (leftValue !== rightValue) {
          throw new Error(
            `FinPos.exponentialComparison: factoring ${right.evaluation.name} through the left witness failed`,
          )
        }
      }
    }

    for (const element of left.object.elems) {
      const roundTrip = rightToLeft.map(leftToRight.map(element))
      if (roundTrip !== element) {
        throw new Error(
          "FinPos.exponentialComparison: mediators do not reduce to id on the left witness",
        )
      }
    }

    for (const element of right.object.elems) {
      const roundTrip = leftToRight.map(rightToLeft.map(element))
      if (roundTrip !== element) {
        throw new Error(
          "FinPos.exponentialComparison: mediators do not reduce to id on the right witness",
        )
      }
    }

    return { leftToRight, rightToLeft }
  },
  initialArrowFrom(initial: FinPosObj, target: FinPosObj): MonoMap {
    if (initial.elems.length !== 0) {
      throw new Error(
        `FinPos.initialArrowFrom: ${initial.name} is not empty and cannot witness initiality`,
      )
    }
    return buildEmptyDomainArrow(initial, target)
  },
  initialArrow(target: FinPosObj): MonoMap {
    return FinPos.initialArrowFrom(FinPos.zero(), target)
  },
  terminateAt(source: FinPosObj, terminal: FinPosObj): MonoMap {
    if (terminal.elems.length !== 1) {
      throw new Error(
        `FinPos.terminateAt: ${terminal.name} must have exactly one point to be terminal`,
      )
    }
    const [point] = terminal.elems
    if (!point) {
      throw new Error(`FinPos.terminateAt: ${terminal.name} lacks a designated point`)
    }
    return {
      name: `!^{${source.name}}→${terminal.name}`,
      dom: source.name,
      cod: terminal.name,
      map: () => point,
    }
  },
  terminate(source: FinPosObj): MonoMap {
    return FinPos.terminateAt(source, FinPos.one())
  },
  checkTerminalArrowUniqueness(
    source: FinPosObj,
    arrow: MonoMap,
    terminal: FinPosObj = FinPos.one(),
  ): TerminalArrowAnalysis {
    if (arrow.dom !== source.name) {
      return {
        holds: false,
        details: `Arrow ${arrow.name} does not originate at ${source.name}`,
        failure: { kind: "domainMismatch", expected: source.name, received: arrow.dom },
      }
    }

    if (arrow.cod !== terminal.name) {
      return {
        holds: false,
        details: `Arrow ${arrow.name} does not target ${terminal.name}`,
        failure: { kind: "codomainMismatch", expected: terminal.name, received: arrow.cod },
      }
    }

    if (terminal.elems.length !== 1) {
      return {
        holds: false,
        details: `${terminal.name} cannot be terminal without a unique point`,
        failure: describeNonTerminal(terminal.name, terminal.elems),
      }
    }

    const [point] = terminal.elems
    if (!point) {
      return {
        holds: false,
        details: `${terminal.name} lacks a designated point`,
        failure: describeNonTerminal(terminal.name, terminal.elems),
      }
    }

    const violation = findMonotonicityViolation(source, terminal, arrow)
    if (violation) {
      return {
        holds: false,
        details: `${arrow.name} violates monotonicity`,
        failure: { kind: "notMonotone", witness: violation },
      }
    }

    for (const element of source.elems) {
      if (arrow.map(element) !== point) {
        return {
          holds: false,
          details: `${arrow.name} does not collapse ${source.name} to ${terminal.name}`,
          failure: { kind: "nonConstant", point, witness: element },
        }
      }
    }

    const canonical = FinPos.terminateAt(source, terminal)
    return {
      holds: true,
      details: `Every arrow ${source.name} → ${terminal.name} collapses to the unique terminal map`,
      witness: canonical,
    }
  },
  terminalIsomorphism(
    alternative: FinPosObj,
    canonical: FinPosObj = FinPos.one(),
  ): TerminalIsomorphism {
    if (alternative.elems.length !== 1) {
      throw new Error(
        `FinPos.terminalIsomorphism: ${alternative.name} must have exactly one element`,
      )
    }
    if (canonical.elems.length !== 1) {
      throw new Error(
        `FinPos.terminalIsomorphism: ${canonical.name} must have exactly one element`,
      )
    }
    return {
      toCanonical: FinPos.terminateAt(alternative, canonical),
      fromCanonical: FinPos.terminateAt(canonical, alternative),
    }
  },
  pointElement(
    object: FinPosObj,
    element: string,
    terminal?: FinPosObj,
  ): MonoMap {
    if (!object.elems.includes(element)) {
      throw new Error(
        `FinPos.pointElement: ${element} is not an element of ${object.name}`,
      )
    }
    const terminalObj = terminal ?? FinPos.one()
    if (terminalObj.elems.length !== 1) {
      throw new Error(
        `FinPos.pointElement: ${terminalObj.name} must be terminal to pick out ${element}`,
      )
    }
    const [point] = terminalObj.elems
    if (!point) {
      throw new Error(
        `FinPos.pointElement: ${terminalObj.name} has no designated element`,
      )
    }
    return {
      name: `⟨${element} | ${terminalObj.name}⟩`,
      dom: terminalObj.name,
      cod: object.name,
      map: () => element,
    }
  },
  checkTerminalElementTransport(
    object: FinPosObj,
    element: MonoMap,
    alternativeTerminal: FinPosObj,
    canonical: FinPosObj = FinPos.one(),
  ): TerminalElementTransportAnalysis {
    if (element.dom !== alternativeTerminal.name) {
      return {
        holds: false,
        details: `Element ${element.name} does not originate at ${alternativeTerminal.name}`,
        failure: {
          kind: "domainMismatch",
          expected: alternativeTerminal.name,
          received: element.dom,
        },
      }
    }

    if (element.cod !== object.name) {
      return {
        holds: false,
        details: `Element ${element.name} does not target ${object.name}`,
        failure: {
          kind: "codomainMismatch",
          expected: object.name,
          received: element.cod,
        },
      }
    }

    if (alternativeTerminal.elems.length !== 1) {
      return {
        holds: false,
        details: `${alternativeTerminal.name} cannot act as a terminal picker`,
        failure: describeNonTerminal(alternativeTerminal.name, alternativeTerminal.elems),
      }
    }

    if (canonical.elems.length !== 1) {
      return {
        holds: false,
        details: `${canonical.name} cannot serve as the canonical terminal`,
        failure: describeNonTerminal(canonical.name, canonical.elems),
      }
    }

    const monotoneWitness = findMonotonicityViolation(alternativeTerminal, object, element)
    if (monotoneWitness) {
      return {
        holds: false,
        details: `${element.name} is not monotone`,
        failure: { kind: "notMonotone", witness: monotoneWitness },
      }
    }

    const [altPoint] = alternativeTerminal.elems
    if (!altPoint) {
      return {
        holds: false,
        details: `${alternativeTerminal.name} lacks a designated element`,
        failure: describeNonTerminal(alternativeTerminal.name, alternativeTerminal.elems),
      }
    }

    const value = element.map(altPoint)
    if (!object.elems.includes(value)) {
      return {
        holds: false,
        details: `${value} is not recognised as an element of ${object.name}`,
        failure: {
          kind: "elementNotInCodomain",
          codomain: object.name,
          element: value,
        },
      }
    }

    const iso = FinPos.terminalIsomorphism(alternativeTerminal, canonical)
    const canonicalWitness = FinPos.pointElement(object, value, canonical)

    return {
      holds: true,
      details: `Transporting ${element.name} along the terminal isomorphism recovers the canonical point ${value} of ${object.name}`,
      witness: {
        iso,
        canonical: canonicalWitness,
        value,
      },
    }
  },
  checkPointSeparation(
    domain: FinPosObj,
    left: MonoMap,
    right: MonoMap,
    codomain: FinPosObj,
  ): PointSeparationAnalysis {
    if (left.dom !== domain.name) {
      return {
        holds: false,
        details: `${left.name} does not originate at ${domain.name}`,
        failure: {
          kind: "domainMismatch",
          side: "left",
          expected: domain.name,
          received: left.dom,
        },
      }
    }

    if (right.dom !== domain.name) {
      return {
        holds: false,
        details: `${right.name} does not originate at ${domain.name}`,
        failure: {
          kind: "domainMismatch",
          side: "right",
          expected: domain.name,
          received: right.dom,
        },
      }
    }

    if (left.cod !== right.cod || left.cod !== codomain.name) {
      return {
        holds: false,
        details: `${left.name} and ${right.name} must share the codomain ${codomain.name}`,
        failure: {
          kind: "codomainMismatch",
          expected: codomain.name,
          left: left.cod,
          right: right.cod,
        },
      }
    }

    if (domain.elems.length === 0) {
      return {
        holds: false,
        details: `${domain.name} has no point elements to separate arrows`,
        failure: { kind: "noPoints", object: domain.name },
      }
    }

    const leftViolation = findMonotonicityViolation(domain, codomain, left)
    if (leftViolation) {
      return {
        holds: false,
        details: `${left.name} is not monotone`,
        failure: { kind: "notMonotone", side: "left", witness: leftViolation },
      }
    }

    const rightViolation = findMonotonicityViolation(domain, codomain, right)
    if (rightViolation) {
      return {
        holds: false,
        details: `${right.name} is not monotone`,
        failure: { kind: "notMonotone", side: "right", witness: rightViolation },
      }
    }

    for (const element of domain.elems) {
      const leftValue = left.map(element)
      const rightValue = right.map(element)

      if (!codomain.elems.includes(leftValue)) {
        return {
          holds: false,
          details: `${leftValue} is not recognised as an element of ${codomain.name}`,
          failure: {
            kind: "valueNotInCodomain",
            side: "left",
            codomain: codomain.name,
            element: leftValue,
          },
        }
      }

      if (!codomain.elems.includes(rightValue)) {
        return {
          holds: false,
          details: `${rightValue} is not recognised as an element of ${codomain.name}`,
          failure: {
            kind: "valueNotInCodomain",
            side: "right",
            codomain: codomain.name,
            element: rightValue,
          },
        }
      }

      if (leftValue !== rightValue) {
        const point = FinPos.pointElement(domain, element)
        return {
          holds: true,
          details: `Point ${element} distinguishes ${left.name} and ${right.name}`,
          witness: {
            element,
            point,
            leftValue,
            rightValue,
          },
        }
      }
    }

    return {
      holds: false,
      details: `${left.name} and ${right.name} coincide on every point element of ${domain.name}`,
      failure: { kind: "indistinguishable" },
    }
  },
}

const composeMonomorphisms = (g: MonoMap, f: MonoMap): MonoMap => {
  if (f.cod !== g.dom) {
    throw new Error('FinPos.compose: codomain of left arrow must match domain of right arrow.')
  }
  return {
    name: `${g.name}∘${f.name}`,
    dom: f.dom,
    cod: g.cod,
    map: (value: string) => g.map(f.map(value)),
  }
}

const identityMonomorphism = (object: FinPosObj): MonoMap => ({
  name: `id_${object.name}`,
  dom: object.name,
  cod: object.name,
  map: (value: string) => value,
})

const equalMonomorphisms = (left: MonoMap, right: MonoMap): boolean => {
  if (left.dom !== right.dom || left.cod !== right.cod) {
    return false
  }
  const domain = ensureRegistered(left.dom)
  for (const element of domain.elems) {
    if (left.map(element) !== right.map(element)) {
      return false
    }
  }
  return true
}

const extractPullbackPairs = (
  pullback: PullbackData<FinPosObj, MonoMap>,
): Map<string, readonly [string, string]> => {
  const result = new Map<string, readonly [string, string]>()
  for (const element of pullback.apex.elems) {
    result.set(element, [pullback.toDomain.map(element), pullback.toAnchor.map(element)] as const)
  }
  return result
}

const pairKey = (domain: string, anchor: string): string => `${domain}#${anchor}`

const FinPosPullbacks: PullbackCalculator<FinPosObj, MonoMap> = {
  pullback(f: MonoMap, g: MonoMap): PullbackData<FinPosObj, MonoMap> {
    const domain = ensureRegistered(f.dom)
    const anchor = ensureRegistered(g.dom)
    const codomain = ensureRegistered(f.cod)
    const comparison = ensureRegistered(g.cod)

    if (codomain.name !== comparison.name) {
      throw new Error('FinPos.pullback: span arrows must share a codomain.')
    }

    const elements: string[] = []
    const assignments = new Map<string, { domain: string; anchor: string }>()
    for (const leftValue of domain.elems) {
      const image = f.map(leftValue)
      if (!codomain.elems.includes(image)) {
        throw new Error(
          `FinPos.pullback: ${image} is not recognised as an element of ${codomain.name}.`,
        )
      }
      for (const rightValue of anchor.elems) {
        const anchorImage = g.map(rightValue)
        if (!codomain.elems.includes(anchorImage)) {
          throw new Error(
            `FinPos.pullback: ${anchorImage} is not recognised as an element of ${codomain.name}.`,
          )
        }
        if (image === anchorImage) {
          const label = `⟨${leftValue},${rightValue}⟩_{${domain.name}×_${codomain.name}${anchor.name}}`
          assignments.set(label, { domain: leftValue, anchor: rightValue })
          elements.push(label)
        }
      }
    }

    const apex = register({
      name: `{${f.name}}×_{${codomain.name}}{${g.name}}`,
      elems: elements,
      leq: (leftLabel: string, rightLabel: string) => {
        const leftPair = assignments.get(leftLabel)
        const rightPair = assignments.get(rightLabel)
        if (!leftPair || !rightPair) {
          throw new Error('FinPos.pullback: apex comparison encountered an unknown element.')
        }
        return (
          domain.leq(leftPair.domain, rightPair.domain) &&
          anchor.leq(leftPair.anchor, rightPair.anchor)
        )
      },
    })

    const toDomain: MonoMap = {
      name: `π₁_${apex.name}`,
      dom: apex.name,
      cod: domain.name,
      map: (value: string) => {
        const pair = assignments.get(value)
        if (!pair) {
          throw new Error('FinPos.pullback: apex element missing during projection to the domain.')
        }
        return pair.domain
      },
    }

    const toAnchor: MonoMap = {
      name: `π₂_${apex.name}`,
      dom: apex.name,
      cod: anchor.name,
      map: (value: string) => {
        const pair = assignments.get(value)
        if (!pair) {
          throw new Error('FinPos.pullback: apex element missing during projection to the anchor.')
        }
        return pair.anchor
      },
    }

    return { apex, toDomain, toAnchor }
  },
  factorCone(
    target: PullbackData<FinPosObj, MonoMap>,
    cone: PullbackData<FinPosObj, MonoMap>,
  ): PullbackConeFactorResult<MonoMap> {
    if (target.toDomain.dom !== target.apex.name || target.toAnchor.dom !== target.apex.name) {
      return {
        factored: false,
        reason: 'FinPos.pullback.factorCone: target legs must originate at the apex.',
      }
    }
    if (cone.toDomain.dom !== cone.apex.name || cone.toAnchor.dom !== cone.apex.name) {
      return {
        factored: false,
        reason: 'FinPos.pullback.factorCone: cone legs must originate at the cone apex.',
      }
    }

    const targetPairs = extractPullbackPairs(target)
    const targetIndex = new Map<string, string>()
    for (const [label, [domainValue, anchorValue]] of targetPairs.entries()) {
      targetIndex.set(pairKey(domainValue, anchorValue), label)
    }

    const mediatorAssignments = new Map<string, string>()
    for (const element of cone.apex.elems) {
      const domainValue = cone.toDomain.map(element)
      const anchorValue = cone.toAnchor.map(element)
      const key = pairKey(domainValue, anchorValue)
      const targetLabel = targetIndex.get(key)
      if (!targetLabel) {
        return {
          factored: false,
          reason: 'FinPos.pullback.factorCone: cone element lacks a matching target pair.',
        }
      }
      mediatorAssignments.set(element, targetLabel)
    }

    const mediator: MonoMap = {
      name: `fact_${cone.apex.name}→${target.apex.name}`,
      dom: cone.apex.name,
      cod: target.apex.name,
      map: (value: string) => {
        const image = mediatorAssignments.get(value)
        if (!image) {
          throw new Error('FinPos.pullback.factorCone: mediator evaluation encountered an unknown apex element.')
        }
        return image
      },
    }

    if (!FinPos.isMonotone(cone.apex, target.apex, mediator)) {
      return {
        factored: false,
        reason: 'FinPos.pullback.factorCone: constructed mediator fails monotonicity.',
      }
    }

    const composedDomain = composeMonomorphisms(target.toDomain, mediator)
    if (!equalMonomorphisms(composedDomain, cone.toDomain)) {
      return {
        factored: false,
        reason: 'FinPos.pullback.factorCone: mediator does not reproduce the cone domain leg.',
      }
    }

    const composedAnchor = composeMonomorphisms(target.toAnchor, mediator)
    if (!equalMonomorphisms(composedAnchor, cone.toAnchor)) {
      return {
        factored: false,
        reason: 'FinPos.pullback.factorCone: mediator does not reproduce the cone anchor leg.',
      }
    }

    return { factored: true, mediator }
  },
  certify(
    f: MonoMap,
    g: MonoMap,
    candidate: PullbackData<FinPosObj, MonoMap>,
  ): PullbackCertification<FinPosObj, MonoMap> {
    const conesChecked: PullbackData<FinPosObj, MonoMap>[] = []

    if (candidate.toDomain.dom !== candidate.apex.name) {
      return {
        valid: false,
        reason: 'FinPos.pullback.certify: domain leg must originate at the candidate apex.',
        conesChecked,
      }
    }
    if (candidate.toAnchor.dom !== candidate.apex.name) {
      return {
        valid: false,
        reason: 'FinPos.pullback.certify: anchor leg must originate at the candidate apex.',
        conesChecked,
      }
    }

    const domain = ensureRegistered(f.dom)
    const anchor = ensureRegistered(g.dom)

    if (candidate.toDomain.cod !== domain.name) {
      return {
        valid: false,
        reason: 'FinPos.pullback.certify: domain leg must land in the span domain.',
        conesChecked,
      }
    }
    if (candidate.toAnchor.cod !== anchor.name) {
      return {
        valid: false,
        reason: 'FinPos.pullback.certify: anchor leg must land in the span anchor.',
        conesChecked,
      }
    }

    const viaDomain = composeMonomorphisms(f, candidate.toDomain)
    const viaAnchor = composeMonomorphisms(g, candidate.toAnchor)
    if (!equalMonomorphisms(viaDomain, viaAnchor)) {
      return {
        valid: false,
        reason: 'FinPos.pullback.certify: candidate square does not commute with the span.',
        conesChecked,
      }
    }

    return { valid: true, conesChecked, mediators: [] }
  },
  induce(
    j: MonoMap,
    pullbackOfF: PullbackData<FinPosObj, MonoMap>,
    pullbackOfG: PullbackData<FinPosObj, MonoMap>,
  ): MonoMap {
    const candidates = FinPos.generalizedElements(pullbackOfF.apex, pullbackOfG.apex)
    const filtered = candidates.filter((candidate) => {
      const leftDomain = composeMonomorphisms(pullbackOfG.toDomain, candidate)
      const rightDomain = composeMonomorphisms(j, pullbackOfF.toDomain)
      if (!equalMonomorphisms(leftDomain, rightDomain)) {
        return false
      }
      const leftAnchor = composeMonomorphisms(pullbackOfG.toAnchor, candidate)
      return equalMonomorphisms(leftAnchor, pullbackOfF.toAnchor)
    })

    if (filtered.length === 0) {
      throw new Error('FinPos.pullback.induce: no mediating arrow satisfies the pullback conditions.')
    }
    const [mediator] = filtered
    if (!mediator) {
      throw new Error('FinPos.pullback.induce: expected a mediating arrow.')
    }
    if (filtered.some((candidate) => candidate !== mediator && !equalMonomorphisms(candidate, mediator))) {
      throw new Error('FinPos.pullback.induce: mediating arrow is not unique.')
    }
    return mediator
  },
  comparison(
    f: MonoMap,
    g: MonoMap,
    left: PullbackData<FinPosObj, MonoMap>,
    right: PullbackData<FinPosObj, MonoMap>,
  ): PullbackComparison<MonoMap> {
    if (f.cod !== g.cod) {
      throw new Error('FinPos.pullback.comparison: span arrows must share a codomain.')
    }

    const domain = ensureRegistered(f.dom)
    const anchor = ensureRegistered(g.dom)

    const validateCone = (label: string, cone: PullbackData<FinPosObj, MonoMap>) => {
      if (cone.toDomain.dom !== cone.apex.name || cone.toAnchor.dom !== cone.apex.name) {
        throw new Error(`FinPos.pullback.comparison: ${label} cone legs must originate at the apex.`)
      }
      if (cone.toDomain.cod !== domain.name) {
        throw new Error(`FinPos.pullback.comparison: ${label} cone domain leg targets the wrong object.`)
      }
      if (cone.toAnchor.cod !== anchor.name) {
        throw new Error(`FinPos.pullback.comparison: ${label} cone anchor leg targets the wrong object.`)
      }
      const viaDomain = composeMonomorphisms(f, cone.toDomain)
      const viaAnchor = composeMonomorphisms(g, cone.toAnchor)
      if (!equalMonomorphisms(viaDomain, viaAnchor)) {
        throw new Error(`FinPos.pullback.comparison: ${label} cone does not commute with the span.`)
      }
    }

    validateCone('left', left)
    validateCone('right', right)

    const identityOnDomain = identityMonomorphism(domain)
    const leftToRight = FinPosPullbacks.induce(identityOnDomain, left, right)
    const rightToLeft = FinPosPullbacks.induce(identityOnDomain, right, left)

    const leftFactor = FinPosPullbacks.factorCone(right, left)
    if (!leftFactor.factored || !leftFactor.mediator) {
      const reason = leftFactor.reason ? `: ${leftFactor.reason}` : '.'
      throw new Error(
        `FinPos.pullback.comparison: left cone fails to factor through the right pullback${reason}`,
      )
    }
    if (!equalMonomorphisms(leftFactor.mediator, leftToRight)) {
      throw new Error(
        'FinPos.pullback.comparison: induced left-to-right mediator disagrees with the factorisation witness.',
      )
    }

    const rightFactor = FinPosPullbacks.factorCone(left, right)
    if (!rightFactor.factored || !rightFactor.mediator) {
      const reason = rightFactor.reason ? `: ${rightFactor.reason}` : '.'
      throw new Error(
        `FinPos.pullback.comparison: right cone fails to factor through the left pullback${reason}`,
      )
    }
    if (!equalMonomorphisms(rightFactor.mediator, rightToLeft)) {
      throw new Error(
        'FinPos.pullback.comparison: induced right-to-left mediator disagrees with the factorisation witness.',
      )
    }

    const leftIdentity = identityMonomorphism(left.apex)
    const rightIdentity = identityMonomorphism(right.apex)

    const leftRoundTrip = composeMonomorphisms(rightToLeft, leftToRight)
    if (!equalMonomorphisms(leftRoundTrip, leftIdentity)) {
      throw new Error('FinPos.pullback.comparison: mediators do not reduce to the identity on the left apex.')
    }

    const rightRoundTrip = composeMonomorphisms(leftToRight, rightToLeft)
    if (!equalMonomorphisms(rightRoundTrip, rightIdentity)) {
      throw new Error('FinPos.pullback.comparison: mediators do not reduce to the identity on the right apex.')
    }

    return { leftToRight, rightToLeft }
  },
  transportPullback(
    f: MonoMap,
    g: MonoMap,
    source: PullbackData<FinPosObj, MonoMap>,
    iso: IsoWitness<MonoMap>,
    candidate: PullbackData<FinPosObj, MonoMap>,
  ): PullbackData<FinPosObj, MonoMap> {
    if (iso.forward.dom !== source.apex.name) {
      throw new Error('FinPos.pullback.transport: iso forward arrow must originate at the source apex.')
    }
    if (iso.inverse.dom !== candidate.apex.name || iso.inverse.cod !== source.apex.name) {
      throw new Error('FinPos.pullback.transport: iso backward arrow must map from the candidate apex to the source apex.')
    }

    const forwardThenBackward = composeMonomorphisms(iso.inverse, iso.forward)
    const identityOnSource = identityMonomorphism(source.apex)
    if (!equalMonomorphisms(forwardThenBackward, identityOnSource)) {
      throw new Error('FinPos.pullback.transport: supplied iso witness does not collapse to the identity on the source apex.')
    }

    const backwardThenForward = composeMonomorphisms(iso.forward, iso.inverse)
    const identityOnCandidate = identityMonomorphism(candidate.apex)
    if (!equalMonomorphisms(backwardThenForward, identityOnCandidate)) {
      throw new Error('FinPos.pullback.transport: supplied iso witness does not collapse to the identity on the candidate apex.')
    }

    const certification = FinPosPullbacks.certify(f, g, candidate)
    if (!certification.valid) {
      throw new Error(
        certification.reason ?? 'FinPos.pullback.transport: candidate pullback fails certification.',
      )
    }

    const candidateDomain = composeMonomorphisms(candidate.toDomain, iso.forward)
    if (!equalMonomorphisms(candidateDomain, source.toDomain)) {
      throw new Error('FinPos.pullback.transport: iso forward does not reproduce the source domain projection.')
    }

    const candidateAnchor = composeMonomorphisms(candidate.toAnchor, iso.forward)
    if (!equalMonomorphisms(candidateAnchor, source.toAnchor)) {
      throw new Error('FinPos.pullback.transport: iso forward does not reproduce the source anchor projection.')
    }

    const mediators = FinPosPullbacks.comparison(f, g, source, candidate)
    if (!equalMonomorphisms(mediators.leftToRight, iso.forward)) {
      throw new Error('FinPos.pullback.transport: comparison mediator differs from the supplied iso forward arrow.')
    }
    if (!equalMonomorphisms(mediators.rightToLeft, iso.inverse)) {
      throw new Error('FinPos.pullback.transport: comparison mediator differs from the supplied iso backward arrow.')
    }

    return candidate
  },
}

export const FinPosSubobjectClassifier: CategoryLimits.SubobjectClassifierCategory<FinPosObj, MonoMap> &
  CartesianClosedCategory<FinPosObj, MonoMap> &
  Category<FinPosObj, MonoMap> = {
  id: identityMonomorphism,
  compose: composeMonomorphisms,
  eq: equalMonomorphisms,
  equalMor: equalMonomorphisms,
  dom: (arrow) => ensureRegistered(arrow.dom),
  cod: (arrow) => ensureRegistered(arrow.cod),
  terminalObj: FinPos.one(),
  terminate: (source: FinPosObj) => FinPos.terminate(source),
  terminal: { obj: FinPos.one(), terminate: (source: FinPosObj) => FinPos.terminate(source) },
  initialObj: FinPos.zero(),
  initialArrow: (target: FinPosObj) => FinPos.initialArrow(target),
  truthValues: FinPos.truthValues(),
  truthArrow: FinPos.truthArrow(),
  falseArrow: FinPos.falseArrow(),
  negation: FinPos.negation(),
  characteristic: FinPos.characteristic,
  subobjectFromCharacteristic: FinPos.subobjectFromCharacteristic,
  binaryProduct: (left: FinPosObj, right: FinPosObj) => {
    const witness = FinPos.product(left, right)
    return {
      obj: witness.object,
      proj1: witness.projections.fst,
      proj2: witness.projections.snd,
      pair: (domain: FinPosObj, leftArrow: MonoMap, rightArrow: MonoMap) => ({
        name: `⟨${leftArrow.name},${rightArrow.name}⟩_${domain.name}`,
        dom: domain.name,
        cod: witness.object.name,
        map: (value: string) => witness.pair(leftArrow.map(value), rightArrow.map(value)),
      }),
    }
  },
  exponential: (base: FinPosObj, codomain: FinPosObj) => {
    const witness = FinPos.exponential(base, codomain)
    return {
      obj: witness.object,
      evaluation: witness.evaluation,
      product: {
        obj: witness.product.object,
        proj1: witness.product.projections.fst,
        proj2: witness.product.projections.snd,
        pair: (domain: FinPosObj, leftArrow: MonoMap, rightArrow: MonoMap) => ({
          name: `⟨${leftArrow.name},${rightArrow.name}⟩_${domain.name}`,
          dom: domain.name,
          cod: witness.product.object.name,
          map: (value: string) => witness.product.pair(leftArrow.map(value), rightArrow.map(value)),
        }),
      },
      curry: (domain: FinPosObj, arrow: MonoMap) => witness.curry(domain, arrow),
      uncurry: (domain: FinPosObj, arrow: MonoMap) => {
        if (arrow.cod !== witness.object.name) {
          throw new Error('FinPosSubobjectClassifier.uncurry: arrow must land in the exponential object.')
        }
        if (arrow.dom !== domain.name) {
          throw new Error('FinPosSubobjectClassifier.uncurry: arrow must originate at the supplied domain.')
        }
        const domainProduct = FinPos.product(domain, base)
        const pairing: MonoMap = {
          name: `⟨${arrow.name},π₂⟩_${domainProduct.object.name}`,
          dom: domainProduct.object.name,
          cod: witness.product.object.name,
          map: (value: string) => {
            const [domainValue, baseValue] = domainProduct.decompose(value)
            const functionName = arrow.map(domainValue)
            return witness.product.pair(functionName, baseValue)
          },
        }
        return composeMonomorphisms(witness.evaluation, pairing)
      },
    }
  },
}

export const FinPosPowerObject: (anchor: FinPosObj) => CategoryLimits.PowerObjectWitness<FinPosObj, MonoMap> = (
  anchor: FinPosObj,
) => {
  // Lazily build the factory function to avoid circular initialization issues where
  // CategoryLimits.makePowerObjectFromSubobjectClassifier might be undefined at import time.
  let factory: ((anchor: FinPosObj) => CategoryLimits.PowerObjectWitness<FinPosObj, MonoMap>) | undefined =
    (FinPosPowerObject as any).__factory
  if (!factory) {
  // Use dynamic require here to avoid reading a partially-initialized
  // `CategoryLimits` namespace during circular module initialization.
  // The static import at module top can be an object whose properties are
  // not yet set if there's a circular dependency; requiring at call-time
  // gives Node a chance to complete initialization of dependencies.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let CL: any = undefined;
  try {
    CL = require("../stdlib/category-limits");
  } catch (__) {
    CL = undefined;
  }
  // If the TS source path didn't yield a usable module (ts-node / circular init),
  // attempt the compiled `dist` fallback which often contains the fully-initialized
  // JS namespace.
  if (!CL) {
    try {
      CL = require("../dist/stdlib/category-limits");
    } catch (__) {
      CL = undefined;
    }
  }
  // The required module may expose the namespace in multiple shapes depending on
  // transpilation / interop: it might be { CategoryLimits: { ... } }, or the
  // namespace itself, or a default-export wrapper. Try multiple access patterns.
  const makeFn =
    CL?.CategoryLimits?.makePowerObjectFromSubobjectClassifier ??
    CL?.makePowerObjectFromSubobjectClassifier ??
    CL?.default?.CategoryLimits?.makePowerObjectFromSubobjectClassifier ??
    CL?.default?.makePowerObjectFromSubobjectClassifier;
    if (typeof makeFn !== "function") {
      throw new Error(
        "FinPosPowerObject: CategoryLimits.makePowerObjectFromSubobjectClassifier is not available at runtime (circular import or module interop issue). Try running the examples with the isolated --child-run flag or build the project first.",
      );
    }
    factory = makeFn({
      category: FinPosSubobjectClassifier,
      pullbacks: FinPosPullbacks,
      binaryProduct: (left: FinPosObj, right: FinPosObj) => {
        const witness = FinPos.product(left, right)
        return {
          obj: witness.object,
          projections: [witness.projections.fst, witness.projections.snd] as const,
          pair: (domain: FinPosObj, leftArrow: MonoMap, rightArrow: MonoMap) => ({
            name: `⟨${leftArrow.name},${rightArrow.name}⟩_${domain.name}`,
            dom: domain.name,
            cod: witness.object.name,
            map: (value: string) => witness.pair(leftArrow.map(value), rightArrow.map(value)),
          }),
        }
      },
      ensureMonomorphism: (arrow: MonoMap, context?: string) => {
        const dom = ensureRegistered(arrow.dom)
        const cod = ensureRegistered(arrow.cod)
        if (!FinPos.isMonotone(dom, cod, arrow) || !FinPos.injective(dom, cod, arrow)) {
          throw new Error(
            `${context ?? 'FinPosPowerObject'}: classified relation must be a monotone injection.`,
          )
        }
      },
      makeIso: (relation: MonoMap, canonical: MonoMap, context: string) => {
        if (!equalMonomorphisms(relation, canonical)) {
          throw new Error(`${context}: relation mediator does not coincide with the canonical inclusion.`)
        }
        const domain = ensureRegistered(relation.dom)
        return { forward: identityMonomorphism(domain), backward: identityMonomorphism(domain) }
      },
      equalMor: equalMonomorphisms,
    })
    ;
    ;(FinPosPowerObject as any).__factory = factory
  }
  return (factory as (anchor: FinPosObj) => CategoryLimits.PowerObjectWitness<FinPosObj, MonoMap>)(
    anchor,
  )
}
