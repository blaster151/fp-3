import type { FiniteCategory } from "../finite-cat"
import type { Factor } from "../kinds/epi-mono-factor"

export type FinSetName = string
export interface FuncArr {
  readonly name: string
  readonly dom: FinSetName
  readonly cod: FinSetName
  readonly map: (x: string) => string
}

export interface FinSetCategory extends FiniteCategory<FinSetName, FuncArr> {
  readonly traits: { readonly functionalArrows: true; readonly balanced: true }
  readonly isInjective: (arrow: FuncArr) => boolean
  readonly isSurjective: (arrow: FuncArr) => boolean
  readonly one: () => FinSetName
  readonly globals: (object: FinSetName) => FuncArr[]
  readonly carrier: (object: FinSetName) => readonly string[]
  readonly counterexample: (
    left: FuncArr,
    right: FuncArr,
  ) => { readonly input: string; readonly left: string; readonly right: string; readonly pretty: string } | null
  readonly splitMonoWitness: (arrow: FuncArr) => FuncArr
  readonly splitEpiWitness: (arrow: FuncArr) => FuncArr
  readonly imageFactorisation: (arrow: FuncArr) => Factor<FinSetName, FuncArr>
  readonly registerObject: (name: FinSetName, carrier: readonly string[]) => void
}

const TERMINAL_OBJECT: FinSetName = "1"
const TERMINAL_POINT = "⋆"

function requireCarrier(universe: Record<FinSetName, readonly string[]>, name: FinSetName): readonly string[] {
  const carrier = universe[name]
  if (!carrier) {
    throw new Error(`FinSetCat: unknown carrier ${name}`)
  }
  return carrier
}

export function FinSetCat(universe: Record<FinSetName, readonly string[]>): FinSetCategory {
  const carriers: Record<FinSetName, readonly string[]> = { ...universe }
  if (!carriers[TERMINAL_OBJECT]) {
    carriers[TERMINAL_OBJECT] = [TERMINAL_POINT] as const
  }

  const objects: FinSetName[] = Object.keys(carriers)
  const arrows: FuncArr[] = []

  const isFuncArr = (value: unknown): value is FuncArr => {
    if (typeof value !== "object" || value === null) return false
    const candidate = value as Partial<FuncArr>
    return (
      typeof candidate.dom === "string" &&
      typeof candidate.cod === "string" &&
      typeof candidate.map === "function"
    )
  }

  const eq: {
    (left: FuncArr, right: FuncArr): boolean
    (left: unknown, right: unknown): boolean
  } = (left: unknown, right: unknown) => {
    if (!isFuncArr(left) || !isFuncArr(right)) return false
    return (
      left.dom === right.dom &&
      left.cod === right.cod &&
      requireCarrier(carriers, left.dom).every((x) => left.map(x) === right.map(x))
    )
  }

  const id = (A: FinSetName): FuncArr => ({
    name: `id_${A}`,
    dom: A,
    cod: A,
    map: (x) => x,
  })

  const compose = (g: FuncArr, f: FuncArr): FuncArr => {
    if (f.cod !== g.dom) {
      throw new Error("FinSetCat: compose expects matching codomain/domain")
    }
    return {
      name: `${g.name}∘${f.name}`,
      dom: f.dom,
      cod: g.cod,
      map: (x) => g.map(f.map(x)),
    }
  }

  const src = (f: FuncArr) => f.dom
  const dst = (f: FuncArr) => f.cod

  const globals = (A: FinSetName): FuncArr[] =>
    requireCarrier(carriers, A).map((a) => ({
      name: `⟨${a}⟩`,
      dom: TERMINAL_OBJECT,
      cod: A,
      map: (_x: string) => a,
    }))

  const carrier = (A: FinSetName): readonly string[] => requireCarrier(carriers, A)

  const counterexample = (
    left: FuncArr,
    right: FuncArr,
  ): { readonly input: string; readonly left: string; readonly right: string; readonly pretty: string } | null => {
    if (left.dom !== right.dom) return null
    const domain = requireCarrier(carriers, left.dom)
    for (const input of domain) {
      const l = left.map(input)
      const r = right.map(input)
      if (l !== r) {
        const lname = left.name ?? "λ"
        const rname = right.name ?? "λ"
        return {
          input,
          left: l,
          right: r,
          pretty: `${lname}(${input}) = ${l} ≠ ${rname}(${input}) = ${r}`,
        }
      }
    }
    return null
  }

  const registerObject = (name: FinSetName, elems: readonly string[]): void => {
    const existing = carriers[name]
    if (existing) {
      if (existing.length !== elems.length || existing.some((value, index) => value !== elems[index])) {
        throw new Error(`FinSetCat: conflicting carrier registration for ${name}`)
      }
      return
    }
    carriers[name] = [...elems]
    if (!objects.includes(name)) objects.push(name)
  }

  const arraysEqual = (left: readonly string[], right: readonly string[]) =>
    left.length === right.length && left.every((value, index) => value === right[index])

  const ensureArrow = (arrow: FuncArr): FuncArr => {
    const existing = arrows.find((candidate) => eq(candidate, arrow))
    if (existing) return existing
    arrows.push(arrow)
    return arrow
  }

  const ensureObjectForCarrier = (proposedName: FinSetName, elems: readonly string[]): FinSetName => {
    const match = objects.find((name) => arraysEqual(requireCarrier(carriers, name), elems))
    if (match) {
      registerObject(match, elems)
      return match
    }
    let candidate = proposedName
    let counter = 0
    while (carriers[candidate]) {
      counter += 1
      candidate = `${proposedName}#${counter}`
    }
    registerObject(candidate, elems)
    return candidate
  }

  const splitMonoWitness = (arrow: FuncArr): FuncArr => {
    if (!isInjective(carriers, arrow)) {
      throw new Error(`FinSetCat: arrow ${arrow.name} is not injective and cannot split as a mono`)
    }
    const domain = requireCarrier(carriers, arrow.dom)
    if (domain.length === 0) {
      throw new Error(`FinSetCat: arrow ${arrow.name} has empty domain; no section exists`)
    }
    const preimage: Record<string, string> = {}
    for (const element of domain) {
      const image = arrow.map(element)
      if (preimage[image] === undefined) preimage[image] = element
    }
    const fallback = domain[0]!
    return {
      name: `${arrow.name}_section`,
      dom: arrow.cod,
      cod: arrow.dom,
      map: (y: string) => preimage[y] ?? fallback,
    }
  }

  const splitEpiWitness = (arrow: FuncArr): FuncArr => {
    if (!isSurjective(carriers, arrow)) {
      throw new Error(`FinSetCat: arrow ${arrow.name} is not surjective and cannot split as an epi`)
    }
    const domain = requireCarrier(carriers, arrow.dom)
    const sections: Record<string, string> = {}
    for (const element of domain) {
      const image = arrow.map(element)
      if (sections[image] === undefined) sections[image] = element
    }
    return {
      name: `${arrow.name}_retract`,
      dom: arrow.cod,
      cod: arrow.dom,
      map: (y: string) => {
        const chosen = sections[y]
        if (chosen !== undefined) return chosen
        throw new Error(`FinSetCat: missing preimage for ${y} in split epi witness of ${arrow.name}`)
      },
    }
  }

  const category: FinSetCategory = {
    objects,
    arrows,
    id,
    compose,
    src,
    dst,
    eq,
    traits: { functionalArrows: true, balanced: true },
    isInjective: (arrow) => isInjective(carriers, arrow),
    isSurjective: (arrow) => isSurjective(carriers, arrow),
    one: () => TERMINAL_OBJECT,
    globals,
    carrier,
    counterexample,
    splitMonoWitness,
    splitEpiWitness,
    imageFactorisation: (arrow) => {
      const domain = requireCarrier(carriers, arrow.dom)
      const imageElements: string[] = []
      const seen = new Set<string>()
      for (const element of domain) {
        const mapped = arrow.map(element)
        if (!seen.has(mapped)) {
          seen.add(mapped)
          imageElements.push(mapped)
        }
      }
      const midName = ensureObjectForCarrier(`${arrow.cod}_im`, imageElements)
      const epi = ensureArrow({
        name: `${arrow.name}_epi`,
        dom: arrow.dom,
        cod: midName,
        map: (x) => arrow.map(x),
      })
      const mono = ensureArrow({
        name: `${midName}_incl_${arrow.cod}`,
        dom: midName,
        cod: arrow.cod,
        map: (y) => y,
      })
      return { mid: midName, epi, mono }
    },
    registerObject,
  }

  return category
}

export function isInjective(universe: Record<FinSetName, readonly string[]>, f: FuncArr): boolean {
  const elems = requireCarrier(universe, f.dom)
  for (let i = 0; i < elems.length; i += 1) {
    for (let j = i + 1; j < elems.length; j += 1) {
      const a = elems[i]!
      const b = elems[j]!
      if (f.map(a) === f.map(b)) return false
    }
  }
  return true
}

export function isSurjective(universe: Record<FinSetName, readonly string[]>, f: FuncArr): boolean {
  const pending = new Set(requireCarrier(universe, f.cod))
  for (const x of requireCarrier(universe, f.dom)) {
    pending.delete(f.map(x))
  }
  return pending.size === 0
}
