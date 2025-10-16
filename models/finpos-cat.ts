import type { FiniteCategory } from "../finite-cat"

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
}

const INITIAL_NAME = "0"
const TERMINAL_NAME = "1"
const TERMINAL_POINT = "⋆"

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
  return obj
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
  }

  return category
}

export const FinPos = {
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
    return {
      name: INITIAL_NAME,
      elems: [],
      leq: () => false,
    }
  },
  one(): FinPosObj {
    return {
      name: TERMINAL_NAME,
      elems: [TERMINAL_POINT],
      leq: () => true,
    }
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
