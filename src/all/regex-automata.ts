import { SemiringBoolOrAnd, matMul, vecMat, matVec } from "./semiring-linear"
import type { WeightedAutomaton } from "./automata-analytics"
import { transitiveClosureBool } from "./automata-analytics"

// ---------------------------------------------
// Regex → WA<boolean> with + ? and [a-z] classes
// Supported:
//   literals (non-special, or escaped with \)
//   grouping (...)
//   alternation |
//   concatenation (implicit)
//   repeaters  *  +  ?
//   character classes [a-z0-9_] (positive only; ranges OK)
// ---------------------------------------------

type RX =
  | { _tag: 'Eps' }
  | { _tag: 'Lit'; ch: string }
  | { _tag: 'Class'; set: ReadonlyArray<string> }
  | { _tag: 'NClass'; set: ReadonlyArray<string> }
  | { _tag: 'Dot' }
  | { _tag: 'Concat'; left: RX; right: RX }
  | { _tag: 'Alt'; left: RX; right: RX }
  | { _tag: 'Star'; inner: RX }

const isSpecialTop = (c: string) =>
  c === '(' || c === ')' || c === '|' || c === '*' || c === '+' || c === '?' || c === '[' || c === '.'

const readEscaped = (src: string, i: number): { ch: string; i: number } => {
  if (i >= src.length) throw new Error('regex: dangling escape')
  return { ch: src[i]!, i: i + 1 }
}

const expandRange = (a: string, b: string): string[] => {
  const aa = a.codePointAt(0)!
  const bb = b.codePointAt(0)!
  if (aa > bb) throw new Error(`regex: bad range ${a}-${b}`)
  const res: string[] = []
  for (let cp = aa; cp <= bb; cp++) res.push(String.fromCodePoint(cp))
  return res
}

const parseClass = (src: string, start: number): { node: RX; i: number } => {
  // src[start] === '['
  let i = start + 1
  let neg = false
  if (src[i] === '^') {
    neg = true
    i++
  }
  const items: string[] = []

  const takeChar = (): string => {
    const c = src[i]
    if (!c) throw new Error('regex: unterminated [ ]')
    if (c === '\\') {
      const r = readEscaped(src, i + 1)
      i = r.i
      return r.ch
    }
    if (c === ']') throw new Error('regex: empty or malformed class')
    i++
    return c
  }

  while (true) {
    const c = src[i]
    if (!c) throw new Error('regex: unterminated [ ]')
    if (c === ']') {
      i++
      break
    }
    const a = takeChar()
    if (src[i] === '-' && src[i + 1] && src[i + 1] !== ']') {
      i++
      const b = takeChar()
      items.push(...expandRange(a, b))
    } else {
      items.push(a)
    }
  }

  if (items.length === 0) throw new Error('regex: [] empty')
  return { node: neg ? { _tag: 'NClass', set: items } : { _tag: 'Class', set: items }, i }
}

const parseRegex = (src: string): RX => {
  let i = 0
  const next = () => src[i]
  const eat = () => src[i++]

  const parseAtom = (): RX => {
    const c = next()
    if (!c) throw new Error('regex: unexpected end')

    if (c === '(') {
      eat()
      const r = parseAlt()
      if (next() !== ')') throw new Error('regex: expected )')
      eat()
      return r
    }

    if (c === '[') {
      const { node, i: j } = parseClass(src, i)
      i = j
      return node
    }

    if (c === '.') {
      eat()
      return { _tag: 'Dot' }
    }

    if (c === '\\') {
      eat()
      const { ch, i: j } = readEscaped(src, i)
      i = j
      return { _tag: 'Lit', ch }
    }

    if (isSpecialTop(c)) throw new Error(`regex: unexpected ${c}`)
    eat()
    return { _tag: 'Lit', ch: c }
  }

  const parseRepeat = (): RX => {
    let node = parseAtom()
    // Greedy repeaters: *, +, ? ; allow chaining like a+?* as "apply in order"
    while (true) {
      const c = next()
      if (c === '*') {
        eat()
        node = { _tag: 'Star', inner: node }
        continue
      }
      if (c === '+') {
        eat()
        node = { _tag: 'Concat', left: node, right: { _tag: 'Star', inner: node } }
        continue
      }
      if (c === '?') {
        eat()
        node = { _tag: 'Alt', left: { _tag: 'Eps' }, right: node }
        continue
      }
      break
    }
    return node
  }

  const parseConcat = (): RX => {
    const parts: RX[] = []
    while (true) {
      const c = next()
      if (!c || c === ')' || c === '|') break
      parts.push(parseRepeat())
    }
    if (parts.length === 0) throw new Error('regex: empty concat')
    return parts.reduce((l, r) => ({ _tag: 'Concat', left: l, right: r }))
  }

  const parseAlt = (): RX => {
    let node = parseConcat()
    while (next() === '|') {
      eat()
      const r = parseConcat()
      node = { _tag: 'Alt', left: node, right: r }
    }
    return node
  }

  const ast = parseAlt()
  if (i !== src.length) throw new Error('regex: trailing input')
  return ast
}

// ε-NFA via Thompson, then ε-eliminate with Warshall closure
type NFA = {
  n: number
  start: number
  accept: number
  epsAdj: boolean[][]
  symAdj: Record<string, boolean[][]>
  alphabet: string[]
}

const buildThompson = (rx: RX, alphabet: ReadonlyArray<string>): NFA => {
  let n = 0
  const eps: Array<Set<number>> = []
  const sym: Record<string, Array<Set<number>>> = {}

  const newState = () => {
    eps[n] = new Set()
    for (const s of Object.values(sym)) s[n] = new Set()
    return n++
  }
  const ensureSym = (ch: string) => {
    if (!sym[ch]) {
      sym[ch] = []
      for (let i = 0; i < n; i++) sym[ch]![i] = new Set()
    }
  }

  const classToSyms = (set: ReadonlyArray<string>): string[] =>
    Array.from(new Set(set))

  const nclassToSyms = (set: ReadonlyArray<string>): string[] => {
    const bad = new Set(set)
    return alphabet.filter(a => !bad.has(a))
  }

  type Frag = { s: number; t: number }

  const go = (e: RX): Frag => {
    switch (e._tag) {
      case 'Eps': {
        const s = newState()
        const t = newState()
        eps[s]!.add(t)
        return { s, t }
      }
      case 'Lit': {
        const s = newState()
        const t = newState()
        ensureSym(e.ch)
        sym[e.ch]![s]!.add(t)
        return { s, t }
      }
      case 'Dot': {
        const s = newState()
        const t = newState()
        for (const ch of alphabet) {
          ensureSym(ch)
          sym[ch]![s]!.add(t)
        }
        return { s, t }
      }
      case 'Class': {
        const s = newState()
        const t = newState()
        for (const ch of classToSyms(e.set)) {
          ensureSym(ch)
          sym[ch]![s]!.add(t)
        }
        return { s, t }
      }
      case 'NClass': {
        const s = newState()
        const t = newState()
        for (const ch of nclassToSyms(e.set)) {
          ensureSym(ch)
          sym[ch]![s]!.add(t)
        }
        return { s, t }
      }
      case 'Concat': {
        const a = go(e.left)
        const b = go(e.right)
        eps[a.t]!.add(b.s)
        return { s: a.s, t: b.t }
      }
      case 'Alt': {
        const s = newState()
        const t = newState()
        const a = go(e.left)
        const b = go(e.right)
        eps[s]!.add(a.s)
        eps[s]!.add(b.s)
        eps[a.t]!.add(t)
        eps[b.t]!.add(t)
        return { s, t }
      }
      case 'Star': {
        const s = newState()
        const t = newState()
        const a = go(e.inner)
        eps[s]!.add(a.s)
        eps[s]!.add(t)
        eps[a.t]!.add(a.s)
        eps[a.t]!.add(t)
        return { s, t }
      }
    }
  }

  const { s, t } = go(rx)
  const epsAdj: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => false))
  for (let i = 0; i < n; i++) for (const j of eps[i] ?? []) epsAdj[i]![j] = true

  const symAdj: Record<string, boolean[][]> = {}
  for (const ch of Object.keys(sym)) {
    const arr = sym[ch]!
    const M: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => false))
    for (let i = 0; i < n; i++) for (const j of arr[i] ?? []) M[i]![j] = true
    symAdj[ch] = M
  }

  return { n, start: s, accept: t, epsAdj, symAdj, alphabet: Array.from(alphabet) }
}

export const compileRegexToWA = (
  pattern: string,
  alphabet: ReadonlyArray<string>
): WeightedAutomaton<boolean, string> => {
  const rx = parseRegex(pattern)
  const nfa = buildThompson(rx, alphabet)
  const B = SemiringBoolOrAnd

  // ε-eliminate: E = ε*, Δ'_a = E·Δ_a·E
  const E = transitiveClosureBool(nfa.epsAdj, true)

  const delta: Record<string, boolean[][]> = {}
  for (const ch of alphabet) {
    const M =
      nfa.symAdj[ch] ??
      Array.from({ length: nfa.n }, () => Array.from({ length: nfa.n }, () => false))
    delta[ch] = matMul(B)(matMul(B)(E, M), E)
  }

  // init and final, then push through E
  const init = Array.from({ length: nfa.n }, () => false)
  init[nfa.start] = true
  const final = Array.from({ length: nfa.n }, () => false)
  final[nfa.accept] = true

  const initP = vecMat(B)(init, E)
  const finalP = matVec(B)(E, final)

  return { S: B, n: nfa.n, init: initP, final: finalP, delta }
}

