import { None, Some, isNone, isSome } from "./option"
import type { Option } from "./option"
import { Err, Ok } from "./result"
import type { Result as ResultT } from "./result"
import { VErr, VOk, isVOk } from "./validation"
import type { Validation } from "./validation"
import {
  anaJson,
  cataJson,
  hyloJson,
  jArr,
  jBinary,
  jBool,
  jDate,
  jDec,
  jNull,
  jNum,
  jObj,
  jRegex,
  jSet,
  jStr,
  jUndef,
} from "./array-recursion"
import type { Json, JsonF } from "./array-recursion"
import type { Optional } from "./allTS"

const _exhaustive = (x: never): never => x

type Result<E, A> = ResultT<E, A>

type JsonAlgebra<B> = (fb: JsonF<B>) => B

type V<A> = Validation<string, A>

const concatStrs = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => [...a, ...b]

const V_of = <A>(a: A): V<A> => VOk(a) as Validation<string, A>
const V_err = (m: string): V<never> => VErr(m)

const sequenceV = <A>(vs: ReadonlyArray<V<A>>): V<ReadonlyArray<A>> => {
  const out: A[] = []
  let errs: string[] | null = null
  for (const v of vs) {
    if (isVOk(v)) out.push(v.value)
    else errs = errs ? concatStrs(errs, v.errors) : [...v.errors]
  }
  return errs ? VErr(...errs) : V_of(out as ReadonlyArray<A>)
}

const isPlainObj = (u: unknown): u is Record<string, unknown> =>
  typeof u === "object" && u !== null && !Array.isArray(u)

const exactKeys = (o: Record<string, unknown>, required: string[], optional: string[] = []): boolean => {
  const ks = Object.keys(o).sort()
  const need = required.toSorted()
  if (!need.every((k) => ks.includes(k))) return false
  const allowed = new Set([...required, ...optional])
  return ks.every((k) => allowed.has(k))
}

// 1) Pretty-print via cata
export const ppJson: (j: Json) => string =
  cataJson<string>((f) => {
    switch (f._tag) {
      case 'JNull': return 'null'
      case 'JUndefined': return 'undefined'
      case 'JBool': return String(f.value)
      case 'JNum':  return String(f.value)
      case 'JDec':  return f.decimal
      case 'JStr':  return JSON.stringify(f.value)
      case 'JBinary': return `"base64(${f.base64})"`
      case 'JRegex': return `"/${f.pattern}/${f.flags ?? ''}"`
      case 'JDate':  return `"${new Date(f.iso).toISOString()}"`
      case 'JArr':  return `[${f.items.join(', ')}]`
      case 'JSet':  return `Set[${f.items.join(', ')}]`
      case 'JObj':  return `{${f.entries.map(([k,v]) => JSON.stringify(k)+': '+v).join(', ')}}`
    }
  })

// 2) Count total nodes via cata
export const sizeJson: (j: Json) => number =
  cataJson<number>((f) => {
    switch (f._tag) {
      case 'JNull':
      case 'JUndefined':
      case 'JBool':
      case 'JNum':
      case 'JDec':
      case 'JStr':
      case 'JBinary':
      case 'JRegex':
      case 'JDate':
        return 1
      case 'JArr':
      case 'JSet':
        return 1 + f.items.reduce((n, x) => n + x, 0)
      case 'JObj':
        return 1 + f.entries.reduce((n, [,v]) => n + v, 0)
    }
  })

// 3) Unfold a simple range into a Json array via ana
export const rangeToJsonArr =
  (n: number): Json =>
    anaJson<number>((k) => k <= 0
      ? ({ _tag: 'JArr', items: [] })
      : ({ _tag: 'JArr', items: [k - 1] })
    )(n)

// 4) Fuse: “sum of numbers in unfolded range-json” via hylo (no intermediate JSON)
export const sumRangeViaHylo =
  (n: number): number =>
    hyloJson<number, number>(
      // coalgebra: unfold into a JSON-ish structure describing the list
      (k) => k <= 0
        ? ({ _tag: 'JArr', items: [] })
        : ({ _tag: 'JArr', items: [k - 1] }),
      // algebra: interpret that structure as a sum
      (f) => f._tag === 'JArr'
        ? f.items.reduce((acc, x) => acc + x, 0)
        : 0
    )(n)


// ====================================================================
// Reusable JSON Algebras - swap meaning without new recursion
// ====================================================================

// 1) Pretty-print JSON (no extra whitespace, deterministic object order as-is)
export const Alg_Json_pretty: JsonAlgebra<string> = (f) => {
  switch (f._tag) {
    case 'JNull': return 'null'
    case 'JUndefined': return 'undefined'
    case 'JBool': return String(f.value)
    case 'JNum':  return String(f.value)
    case 'JDec':  return f.decimal   // or `"dec(" + f.decimal + ")"` if you want to mark it
    case 'JStr':  return JSON.stringify(f.value)
    case 'JBinary': return `"base64(${f.base64})"`
    case 'JRegex': return `"/${f.pattern}/${f.flags ?? ''}"`
    case 'JDate':  return `"${new Date(f.iso).toISOString()}"`
    case 'JArr':  return `[${f.items.join(', ')}]`
    case 'JSet':  return `Set[${f.items.join(', ')}]`
    case 'JObj':  return `{${f.entries.map(([k,v]) => JSON.stringify(k)+': '+v).join(', ')}}`
  }
}
export const prettyJson = cataJson(Alg_Json_pretty)

// 2) Size: count every node (scalars/arrays/objects)
export const Alg_Json_size: JsonAlgebra<number> = (f) => {
  switch (f._tag) {
    case 'JNull':
    case 'JUndefined':
    case 'JBool':
    case 'JNum':
    case 'JDec':
    case 'JStr':
    case 'JBinary':
    case 'JRegex':
    case 'JDate':
      return 1
    case 'JArr':
    case 'JSet':
      return 1 + f.items.reduce((n, x) => n + x, 0)
    case 'JObj':
      return 1 + f.entries.reduce((n, [,v]) => n + v, 0)
  }
}
export const sizeJsonReusable = cataJson(Alg_Json_size)

// 3) Collect all string leaves
export const Alg_Json_collectStrings: JsonAlgebra<ReadonlyArray<string>> = (f) => {
  switch (f._tag) {
    case 'JStr':   return [f.value]
    case 'JArr':   return f.items.flat()
    case 'JSet':   return f.items.flat()
    case 'JObj':   return f.entries.flatMap(([,v]) => v)
    // leaves that don't carry strings contribute nothing:
    case 'JNull':
    case 'JUndefined':
    case 'JBool':
    case 'JNum':
    case 'JDec':
    case 'JBinary':
    case 'JRegex':
    case 'JDate':
      return []
  }
}
export const collectStrings = cataJson(Alg_Json_collectStrings)

// Alias for consistency with the new naming
export const Alg_Json_collectStrs = Alg_Json_collectStrings

// Maximum depth
export const Alg_Json_depth = (f: JsonF<number>): number => {
  switch (f._tag) {
    case 'JNull':
    case 'JUndefined':
    case 'JBool':
    case 'JNum':
    case 'JDec':
    case 'JStr':
    case 'JBinary':
    case 'JRegex':
    case 'JDate':
      return 1
    case 'JArr':
    case 'JSet':
      return 1 + (f.items.length ? Math.max(...f.items) : 0)
    case 'JObj':
      return 1 + (f.entries.length ? Math.max(...f.entries.map(([,v]) => v)) : 0)
  }
}

// Convenience functions for the new algebras
export const sizeJsonNew = cataJson(Alg_Json_size)
export const strsJson = cataJson(Alg_Json_collectStrings)
export const depthJson = cataJson(Alg_Json_depth)

// Product algebra: runs two algebras in lockstep with payload consistency
export const productJsonAlg2 =
  <B, C>(algB: (fb: JsonF<B>) => B, algC: (fc: JsonF<C>) => C) =>
  (fbc: JsonF<readonly [B, C]>): readonly [B, C] => {
    switch (fbc._tag) {
      // LEAVES: forward identical payload to both algebras
      case 'JNull':      return [algB({ _tag: 'JNull' }),      algC({ _tag: 'JNull' })]
      case 'JUndefined': return [algB({ _tag: 'JUndefined' }), algC({ _tag: 'JUndefined' })]
      case 'JBool':      return [algB({ _tag: 'JBool',  value: fbc.value }),
                                 algC({ _tag: 'JBool',  value: fbc.value })]
      case 'JNum':       return [algB({ _tag: 'JNum',   value: fbc.value }),
                                 algC({ _tag: 'JNum',   value: fbc.value })]
      case 'JDec':       return [algB({ _tag: 'JDec',   decimal: fbc.decimal }),
                                 algC({ _tag: 'JDec',   decimal: fbc.decimal })]
      case 'JStr':       return [algB({ _tag: 'JStr',   value: fbc.value }),
                                 algC({ _tag: 'JStr',   value: fbc.value })]
      case 'JBinary':    return [algB({ _tag: 'JBinary', base64: fbc.base64 }),
                                 algC({ _tag: 'JBinary', base64: fbc.base64 })]
      case 'JRegex':     return [algB({ _tag: 'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) }),
                                 algC({ _tag: 'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) })]
      case 'JDate':      return [algB({ _tag: 'JDate', iso: fbc.iso }),
                                 algC({ _tag: 'JDate', iso: fbc.iso })]

      // RECURSIVE: map children's left/right parts separately
      case 'JArr': {
        const left  = fbc.items.map(([b]) => b)
        const right = fbc.items.map(([, c]) => c)
        return [algB({ _tag: 'JArr', items: left }),
                algC({ _tag: 'JArr', items: right })]
      }
      case 'JSet': {
        const left  = fbc.items.map(([b]) => b)
        const right = fbc.items.map(([, c]) => c)
        return [algB({ _tag: 'JSet', items: left }),
                algC({ _tag: 'JSet', items: right })]
      }
      case 'JObj': {
        const left  = fbc.entries.map(([k, [b]]) => [k, b] as const)
        const right = fbc.entries.map(([k, [, c]]) => [k, c] as const)
        return [algB({ _tag: 'JObj', entries: left }),
                algC({ _tag: 'JObj', entries: right })]
      }
    }
  }

// Legacy product algebra (kept for compatibility)
export const productJsonAlg2Regular = productJsonAlg2

// Size & depth in a single traversal
export const sizeAndDepthJson = cataJson(productJsonAlg2(Alg_Json_size, Alg_Json_depth))

// Strings & size in a single traversal
export const strsAndSizeJson = cataJson(productJsonAlg2(Alg_Json_collectStrs, Alg_Json_size))

// Canonicalization helpers moved to json-canonical.ts
// ------------------------
// Decoder with error aggregation:
//   fromEJson(u) -> Result<string[], Json>
// ------------------------

const decodeValueV = (u: unknown): V<Json> => {
  // null
  if (u === null) return V_of(jNull())
  // boolean
  if (typeof u === 'boolean') return V_of(jBool(u))
  // number (must be finite)
  if (typeof u === 'number') {
    return Number.isFinite(u) ? V_of(jNum(u)) : V_err(`non-finite number: ${String(u)}`)
  }
  // string
  if (typeof u === 'string') return V_of(jStr(u))
  // array
  if (Array.isArray(u)) {
    const elems = sequenceV(u.map(decodeValueV))
    return isVOk(elems) ? V_of(jArr(elems.value)) : elems
  }
  // object-ish
  if (isPlainObj(u)) {
    // tagged forms (must be exact)
    if (exactKeys(u, ['$undefined'])) {
      return u['$undefined'] === true ? V_of(jUndef()) : V_err(`$undefined must be true`)
    }
    if (exactKeys(u, ['$decimal'])) {
      const v = u['$decimal']
      return typeof v === 'string'
        ? V_of(jDec(v))
        : V_err(`$decimal must be string`)
    }
    if (exactKeys(u, ['$binary'])) {
      const v = u['$binary']
      return typeof v === 'string'
        ? V_of(jBinary(v))
        : V_err(`$binary must be string (base64)`)
    }
    if (exactKeys(u, ['$regex'], ['$flags'])) {
      const p = u['$regex'], f = u['$flags']
      if (typeof p !== 'string') return V_err(`$regex must be string`)
      if (f !== undefined && typeof f !== 'string') return V_err(`$flags must be string`)
      return V_of(jRegex(p, f as string | undefined))
    }
    if (exactKeys(u, ['$set'])) {
      const arr = u['$set']
      if (!Array.isArray(arr)) return V_err(`$set must be array`)
      const vs = sequenceV(arr.map(decodeValueV))
      return isVOk(vs) ? V_of(jSet(vs.value)) : vs
    }
    // plain object: decode each value
    const entries = Object.entries(u)
    const decoded = sequenceV(entries.map(([k, v]) => {
      const vResult = decodeValueV(v)
      return isVOk(vResult) ? V_of([k, vResult.value] as const) : vResult
    }))
    return isVOk(decoded) ? V_of(jObj(decoded.value as ReadonlyArray<readonly [string, Json]>)) : decoded
  }
  // otherwise
  return V_err(`unsupported value: ${Object.prototype.toString.call(u)}`)
}

export const fromEJson = (u: unknown): Result<ReadonlyArray<string>, Json> => {
  const v = decodeValueV(u)
  return isVOk(v) ? Ok(v.value) : Err(v.errors as ReadonlyArray<string>)
}

// Canonical equality/hash/containers now reside in json-canonical.ts
// 4) Sum all numbers (0 for others)
export const Alg_Json_sumNumbers: JsonAlgebra<number> = (f) => {
  switch (f._tag) {
    case 'JNum':  return f.value
    case 'JArr':  return f.items.reduce((s, n) => s + n, 0)
    case 'JObj':  return f.entries.reduce((s, [,n]) => s + n, 0)
    default:      return 0
  }
}
export const sumNumbersJson = cataJson(Alg_Json_sumNumbers)

// 5) Normalize: drop nulls in objects/arrays (transformation via cata)
//     (You can write structural rewrites like this.)
export const Alg_Json_dropNulls: JsonAlgebra<Json> = (f) => {
  switch (f._tag) {
    case 'JNull': return jNull()
    case 'JUndefined': return jUndef()
    case 'JBool': return jBool(f.value)
    case 'JNum':  return jNum(f.value)
    case 'JDec':  return jDec(f.decimal)
    case 'JStr':  return jStr(f.value)
    case 'JBinary': return jBinary(f.base64)
    case 'JRegex': return jRegex(f.pattern, f.flags)
    case 'JDate':  return jDate(f.iso)
    case 'JArr':  return jArr(f.items.filter(j => j.un._tag !== 'JNull'))
    case 'JSet':  return jSet(f.items.filter(j => j.un._tag !== 'JNull'))
    case 'JObj':  return jObj(f.entries.filter(([_, v]) => v.un._tag !== 'JNull'))
  }
}
export const dropNulls = cataJson(Alg_Json_dropNulls)

// ====================================================================
// One traversal, many meanings: product algebra
// ====================================================================
// Compute multiple results in one pass by pairing algebras. 
// Feed cataJson(product(…)) once; get both values.

// Product algebra: combine two Json algebras B and C into one that returns [B, C]
export const productJsonAlg =
  <B, C>(algB: JsonAlgebra<B>, algC: JsonAlgebra<C>): JsonAlgebra<readonly [B, C]> =>
  (fbc: JsonF<readonly [B, C]>) => {
    switch (fbc._tag) {
      case 'JNull': return [algB({ _tag:'JNull' }), algC({ _tag:'JNull' })] as const
      case 'JUndefined': return [algB({ _tag:'JUndefined' }), algC({ _tag:'JUndefined' })] as const
      case 'JBool': return [algB({ _tag:'JBool', value: fbc.value }),
                            algC({ _tag:'JBool', value: fbc.value })] as const
      case 'JNum':  return [algB({ _tag:'JNum',  value: fbc.value }),
                            algC({ _tag:'JNum',  value: fbc.value })] as const
      case 'JDec':  return [algB({ _tag:'JDec',  decimal: fbc.decimal }),
                            algC({ _tag:'JDec',  decimal: fbc.decimal })] as const
      case 'JStr':  return [algB({ _tag:'JStr',  value: fbc.value }),
                            algC({ _tag:'JStr',  value: fbc.value })] as const
      case 'JBinary': return [algB({ _tag:'JBinary', base64: fbc.base64 }),
                              algC({ _tag:'JBinary', base64: fbc.base64 })] as const
      case 'JRegex': return [algB({ _tag:'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) }),
                             algC({ _tag:'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) })] as const
      case 'JDate':  return [algB({ _tag:'JDate', iso: fbc.iso }),
                             algC({ _tag:'JDate', iso: fbc.iso })] as const
      case 'JArr': {
        const bs = fbc.items.map(([b]) => b)
        const cs = fbc.items.map(([,c]) => c)
        return [algB({ _tag:'JArr', items: bs }), algC({ _tag:'JArr', items: cs })] as const
      }
      case 'JSet': {
        const bs = fbc.items.map(([b]) => b)
        const cs = fbc.items.map(([,c]) => c)
        return [algB({ _tag:'JSet', items: bs }), algC({ _tag:'JSet', items: cs })] as const
      }
      case 'JObj': {
        const bs = fbc.entries.map(([k, bc]) => [k, bc[0]] as const)
        const cs = fbc.entries.map(([k, bc]) => [k, bc[1]] as const)
        return [algB({ _tag:'JObj', entries: bs }), algC({ _tag:'JObj', entries: cs })] as const
      }
    }
  }

// Convenience: run two algebras in one traversal
export const bothJson =
  <B, C>(algB: JsonAlgebra<B>, algC: JsonAlgebra<C>) =>
  (j: Json): readonly [B, C] =>
    cataJson(productJsonAlg(algB, algC))(j)

// Example: pretty + size in one pass
export const prettyAndSize = bothJson(Alg_Json_pretty, Alg_Json_size)
// Fused pipelines (hylo) for JsonF - Generate → Consume in one pass
// ====================================================================
//
// This section demonstrates the power of hylomorphism: composing coalgebras
// (generators) with algebras (consumers) to create deforested pipelines
// that never build intermediate data structures. This is especially useful
// for processing large or infinite data streams efficiently.

// Convenience alias for fused pipelines (avoiding conflict with existing JsonAlgebra)
export type JsonAlgFused<B> = (fb: JsonF<B>) => B

// Generic "fuse" helper: pick whichever coalgebra + algebra, get a deforested pipeline
export const fuseJson =
  <S, B>(coalg: (s: S) => JsonF<S>, alg: JsonAlgFused<B>) =>
  (s0: S): B =>
    hyloJson<S, B>(coalg, alg)(s0)

// ---------- Ready-to-use coalgebras ----------

// Unfold a *unary* list-like array: [n-1, then (n-2), …, 0]
export const coalgRangeUnary =
  (n: number): JsonF<number> =>
    n <= 0 ? ({ _tag: 'JArr', items: [] })
           : ({ _tag: 'JArr', items: [n - 1] })

// Unfold a *full binary* tree of given depth (leaves are 1s)
export const coalgFullBinary =
  (depth: number): JsonF<number> =>
    depth <= 0 ? ({ _tag: 'JNum', value: 1 })
               : ({ _tag: 'JArr', items: [depth - 1, depth - 1] })

// ---------- Handy algebras you can swap in ----------

// Pretty (compact) - fused pipeline version
export const Alg_Json_pretty_fused: JsonAlgFused<string> = (f) => {
  switch (f._tag) {
    case 'JNull': return 'null'
    case 'JUndefined': return 'undefined'
    case 'JBool': return String(f.value)
    case 'JNum':  return String(f.value)
    case 'JDec':  return f.decimal
    case 'JStr':  return JSON.stringify(f.value)
    case 'JBinary': return `"base64(${f.base64})"`
    case 'JRegex': return `"/${f.pattern}/${f.flags ?? ''}"`
    case 'JDate':  return `"${new Date(f.iso).toISOString()}"`
    case 'JArr':  return `[${f.items.join(', ')}]`
    case 'JSet':  return `Set[${f.items.join(', ')}]`
    case 'JObj':  return `{${f.entries.map(([k,v]) => JSON.stringify(k)+': '+v).join(', ')}}`
  }
}

// Sum numbers (0 elsewhere) - fused pipeline version
export const Alg_Json_sum_fused: JsonAlgFused<number> = (f) => {
  switch (f._tag) {
    case 'JNum':  return f.value
    case 'JArr':  return f.items.reduce((s, n) => s + n, 0)
    case 'JObj':  return f.entries.reduce((s, [,n]) => s + n, 0)
    default:      return 0
  }
}

// Count nodes - fused pipeline version
export const Alg_Json_size_fused: JsonAlgFused<number> = (f) => {
  switch (f._tag) {
    case 'JNull':
    case 'JUndefined':
    case 'JBool':
    case 'JNum':
    case 'JDec':
    case 'JStr':
    case 'JBinary':
    case 'JRegex':
    case 'JDate':
      return 1
    case 'JArr':
    case 'JSet':
      return 1 + f.items.reduce((n, x) => n + x, 0)
    case 'JObj':
      return 1 + f.entries.reduce((n, [,v]) => n + v, 0)
  }
}

// Stats record, combined in one pass (sum + count + max + height)
export type JStats = { sum: number; count: number; max: number; height: number }
export const Alg_Json_stats: JsonAlgFused<JStats> = (f) => {
  switch (f._tag) {
    case 'JNum':  return { sum: f.value, count: 1, max: f.value, height: 1 }
    case 'JArr': {
      if (f.items.length === 0) return { sum: 0, count: 1, max: -Infinity, height: 1 }
      const xs = f.items
      return {
        sum:    xs.reduce((a, x) => a + x.sum, 0),
        count:  1 + xs.reduce((a, x) => a + x.count, 0),
        max:    xs.reduce((m, x) => Math.max(m, x.max), -Infinity),
        height: 1 + Math.max(...xs.map(x => x.height)),
      }
    }
    case 'JObj': {
      const vs = f.entries.map(([,v]) => v)
      return {
        sum:    vs.reduce((a, x) => a + x.sum, 0),
        count:  1 + vs.reduce((a, x) => a + x.count, 0),
        max:    vs.reduce((m, x) => Math.max(m, x.max), -Infinity),
        height: 1 + Math.max(0, ...vs.map(x => x.height)),
      }
    }
    default: return { sum: 0, count: 1, max: -Infinity, height: 1 }
  }
}

// ---------- Fused pipelines you can call directly ----------

// 1) Range → (sum)   (unary-array unfold; no intermediate Json constructed)
export const sumRange_FUSED = (n: number): number =>
  fuseJson(coalgRangeUnary, Alg_Json_sum_fused)(n)

// 2) Range → (pretty, in one pass)
//    (Strictly illustrative: pretty-printing a unary array is a bit silly,
//     but shows "generate → pretty" fused.)
export const prettyRange_FUSED = (n: number): string =>
  fuseJson(coalgRangeUnary, Alg_Json_pretty_fused)(n)

// 3) Full binary(depth) → stats (sum/count/max/height) in one pass
export const statsFullBinary_FUSED = (depth: number): JStats =>
  fuseJson(coalgFullBinary, Alg_Json_stats)(depth)

// 4) Full binary(depth) → *both* pretty and size in one pass via a product algebra
//    If you already defined a product algebra elsewhere, feel free to reuse it;
//    this local version avoids naming collisions.
export const productJsonAlg2Fused =
  <B, C>(algB: JsonAlgFused<B>, algC: JsonAlgFused<C>): JsonAlgFused<readonly [B, C]> =>
  (fbc: JsonF<readonly [B, C]>) => {
    switch (fbc._tag) {
      case 'JNull': return [algB({ _tag:'JNull' }), algC({ _tag:'JNull' })] as const
      case 'JUndefined': return [algB({ _tag:'JUndefined' }), algC({ _tag:'JUndefined' })] as const
      case 'JBool': return [algB({ _tag:'JBool', value: fbc.value }),
                            algC({ _tag:'JBool', value: fbc.value })] as const
      case 'JNum':  return [algB({ _tag:'JNum',  value: fbc.value }),
                            algC({ _tag:'JNum',  value: fbc.value })] as const
      case 'JDec':  return [algB({ _tag:'JDec',  decimal: fbc.decimal }),
                            algC({ _tag:'JDec',  decimal: fbc.decimal })] as const
      case 'JStr':  return [algB({ _tag:'JStr',  value: fbc.value }),
                            algC({ _tag:'JStr',  value: fbc.value })] as const
      case 'JBinary': return [algB({ _tag:'JBinary', base64: fbc.base64 }),
                              algC({ _tag:'JBinary', base64: fbc.base64 })] as const
      case 'JRegex': return [algB({ _tag:'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) }),
                             algC({ _tag:'JRegex', pattern: fbc.pattern, ...(fbc.flags !== undefined ? { flags: fbc.flags } : {}) })] as const
      case 'JDate':  return [algB({ _tag:'JDate', iso: fbc.iso }),
                             algC({ _tag:'JDate', iso: fbc.iso })] as const
      case 'JArr': {
        const bs = fbc.items.map(([b]) => b)
        const cs = fbc.items.map(([,c]) => c)
        return [algB({ _tag:'JArr', items: bs }), algC({ _tag:'JArr', items: cs })] as const
      }
      case 'JSet': {
        const bs = fbc.items.map(([b]) => b)
        const cs = fbc.items.map(([,c]) => c)
        return [algB({ _tag:'JSet', items: bs }), algC({ _tag:'JSet', items: cs })] as const
      }
      case 'JObj': {
        const bs = fbc.entries.map(([k, bc]) => [k, bc[0]] as const)
        const cs = fbc.entries.map(([k, bc]) => [k, bc[1]] as const)
        return [algB({ _tag:'JObj', entries: bs }), algC({ _tag:'JObj', entries: cs })] as const
      }
    }
  }

export const prettyAndSize_FUSED =
  (depth: number): readonly [string, number] =>
    fuseJson(coalgFullBinary, productJsonAlg2Fused(Alg_Json_pretty_fused, Alg_Json_size_fused))(depth)
//  • You already have: JsonF algebra  F<B> -> B  (cata).
//  • For streaming, we can't collect "all children" up front.
//  • So we use an incremental algebra with accumulators:
//
//    type JsonStreamAlg<B, ArrAcc, ObjAcc> = {
//      JNull: () => B
//      JBool: (b: boolean) => B
//      JNum : (n: number)  => B
//      JStr : (s: string)  => B
//      Arr  : { begin: () => ArrAcc
//               step : (acc: ArrAcc, child: B) => ArrAcc
//               done : (acc: ArrAcc) => B }
//      Obj  : { begin: () => ObjAcc
//               step : (acc: ObjAcc, kv: readonly [string, B]) => ObjAcc
//               done : (acc: ObjAcc) => B }
//    }
//
//  • We feed a stream of JsonEvent into a sink { push, done }.
//  • "push" updates a frame stack using closures over the algebra.
//  • "done" returns Result<Error, B> (root value or an error).
//
// Wiring
//  • You can derive this streaming algebra automatically from your
//    ordinary Json algebra F<B> -> B (we use ReadonlyArray accumulators).
//  • Or handcraft tiny accumulators (e.g., numbers for sums) for true O(depth).
//

// ----- Event model (SAX-like) -----
export type JsonEvent =
  | { _tag: 'StartArr' }
  | { _tag: 'EndArr' }
  | { _tag: 'StartObj' }
  | { _tag: 'EndObj' }
  | { _tag: 'Key'; key: string }
  | { _tag: 'Null' }
  | { _tag: 'Bool'; value: boolean }
  | { _tag: 'Num';  value: number }
  | { _tag: 'Str';  value: string }

// Constructors (ergonomic)
export const ev = {
  startArr: (): JsonEvent => ({ _tag: 'StartArr' }),
  endArr  : (): JsonEvent => ({ _tag: 'EndArr' }),
  startObj: (): JsonEvent => ({ _tag: 'StartObj' }),
  endObj  : (): JsonEvent => ({ _tag: 'EndObj' }),
  key     : (k: string): JsonEvent => ({ _tag: 'Key', key: k }),
  null    : (): JsonEvent => ({ _tag: 'Null' }),
  bool    : (b: boolean): JsonEvent => ({ _tag: 'Bool', value: b }),
  num     : (n: number): JsonEvent => ({ _tag: 'Num', value: n }),
  str     : (s: string): JsonEvent => ({ _tag: 'Str', value: s }),
}

// ----- Streaming algebra -----
export type JsonStreamAlg<B, ArrAcc, ObjAcc> = {
  JNull: () => B
  JBool: (b: boolean) => B
  JNum : (n: number)  => B
  JStr : (s: string)  => B
  Arr  : {
    begin: () => ArrAcc
    step : (acc: ArrAcc, child: B) => ArrAcc
    done : (acc: ArrAcc) => B
  }
  Obj  : {
    begin: () => ObjAcc
    step : (acc: ObjAcc, kv: readonly [string, B]) => ObjAcc
    done : (acc: ObjAcc) => B
  }
}

// Derive a streaming algebra from a plain Json algebra (uses arrays).
// This is the "bridge" from your cata algebra to streaming.
export type JsonAlg<B> = {
  JNull: () => B
  JBool: (b: boolean) => B
  JNum : (n: number)  => B
  JStr : (s: string)  => B
  JArr : (items: ReadonlyArray<B>) => B
  JObj : (entries: ReadonlyArray<readonly [string, B]>) => B
}

export const toStreamAlg = <B>(alg: JsonAlg<B>): JsonStreamAlg<B, B[], Array<readonly [string, B]>> => ({
  JNull: alg.JNull,
  JBool: alg.JBool,
  JNum : alg.JNum,
  JStr : alg.JStr,
  Arr: {
    begin: () => [],
    step : (acc, child) => (acc.push(child), acc),
    done : (acc) => alg.JArr(acc),
  },
  Obj: {
    begin: () => [],
    step : (acc, kv) => (acc.push(kv), acc),
    done : (acc) => alg.JObj(acc),
  }
})

// ----- The streaming sink (closure + stack machine) -----
type Frame<AA, OA> =
  | { tag: 'arr'; acc: AA }
  | { tag: 'obj'; acc: OA; expect: 'key' | 'value'; lastKey?: string }

export const makeJsonStreamFolder = <B, AA, OA>(ALG: JsonStreamAlg<B, AA, OA>) => {
  let stack: Array<Frame<AA, OA>> = []
  let root: Option<B> = None
  let finished = false

  const emitValue = (b: B): Result<Error, void> => {
    if (stack.length === 0) {
      if (isSome(root)) return Err(new Error('Multiple roots'))
      root = Some(b)
      return Ok(undefined)
    }
    const top = stack[stack.length - 1]!
    if (top.tag === 'arr') {
      top.acc = ALG.Arr.step(top.acc, b)
      return Ok(undefined)
    }
    // object expects a value paired with lastKey
    if (top.expect !== 'value' || top.lastKey == null) {
      return Err(new Error('Object value without a key'))
    }
    top.acc   = ALG.Obj.step(top.acc, [top.lastKey, b] as const)
    delete top.lastKey
    top.expect  = 'key'
    return Ok(undefined)
  }

  const push = (e: JsonEvent): Result<Error, void> => {
    if (finished) return Err(new Error('Stream already finished'))

    switch (e._tag) {
      case 'StartArr':
        stack.push({ tag: 'arr', acc: ALG.Arr.begin() })
        return Ok(undefined)

      case 'EndArr': {
        const top = stack.pop()
        if (!top || top.tag !== 'arr') return Err(new Error('Mismatched EndArr'))
        return emitValue(ALG.Arr.done(top.acc))
      }

      case 'StartObj':
        stack.push({ tag: 'obj', acc: ALG.Obj.begin(), expect: 'key' })
        return Ok(undefined)

      case 'EndObj': {
        const top = stack.pop()
        if (!top || top.tag !== 'obj' || top.expect === 'value') {
          return Err(new Error('Mismatched EndObj or dangling key'))
        }
        return emitValue(ALG.Obj.done(top.acc))
      }

      case 'Key': {
        const top = stack[stack.length - 1]
        if (!top || top.tag !== 'obj' || top.expect !== 'key') {
          return Err(new Error('Key outside object or not expected'))
        }
        top.lastKey = e.key
        top.expect  = 'value'
        return Ok(undefined)
      }

      case 'Null': return emitValue(ALG.JNull())
      case 'Bool': return emitValue(ALG.JBool(e.value))
      case 'Num' : return emitValue(ALG.JNum(e.value))
      case 'Str' : return emitValue(ALG.JStr(e.value))
    }
  }

  const done = (): Result<Error, B> => {
    if (finished) return Err(new Error('Stream already finished'))
    finished = true
    if (stack.length !== 0) return Err(new Error('Unclosed arrays/objects'))
    if (!isSome(root))     return Err(new Error('Empty stream (no root)'))
    return Ok(root.value)
  }

  return {
    push,          // (e) => Result<Error, void>
    done,          // () => Result<Error, B>
    isDone: () => finished,
    depth: () => stack.length,
  }
}

// --- Example: count all nodes (each value, array, and object counts as 1)
const CountAlg: JsonStreamAlg<number, number, number> = {
  JNull: () => 1,
  JBool: () => 1,
  JNum : () => 1,
  JStr : () => 1,
  Arr  : {
    begin: () => 1,                           // count the array node itself
    step : (acc, child) => acc + child,       // add each child count
    done : (acc) => acc
  },
  Obj  : {
    begin: () => 1,                           // count the object node itself
    step : (acc, [, child]) => acc + child,   // ignore key; add child
    done : (acc) => acc
  }
}

// Build a sink that counts nodes as it streams
const counter = makeJsonStreamFolder(CountAlg)

// Imagine these events arrive chunk-by-chunk:
void counter.push(ev.startObj())
void counter.push(ev.key('users'))
void counter.push(ev.startArr())
  void counter.push(ev.startObj())
    void counter.push(ev.key('id'));    void counter.push(ev.num(1))
    void counter.push(ev.key('name'));  void counter.push(ev.str('Ada'))
  void counter.push(ev.endObj())
void counter.push(ev.endArr())
void counter.push(ev.endObj())

const resultCount = counter.done() // Result<Error, number>
void resultCount








//
// • Incremental: safe across chunk boundaries (strings, numbers, literals)
// • Emits your StartArr/EndArr/StartObj/EndObj/Key/Null/Bool/Num/Str events
// • Maintains minimal parser state (stack) so keys are recognized
// • On malformed input, throws (you can wrap and return Result if you prefer)
//
// Notes: This is a "sane subset" tokenizer for typical JSON. It enforces
//         balanced structures and a valid token boundary for numbers/literals.
//         If you need full RFC8259 edge-cases, use a mature SAX parser.
//

type JsonTokenizerArrayFrame = { kind: "array"; expect: "value" | "commaOrEnd" }
type JsonTokenizerObjectFrame = {
  kind: "object"
  expect: "key" | "colon" | "value" | "commaOrEnd"
  lastKey?: string
}
type JsonTokenizerFrame = JsonTokenizerArrayFrame | JsonTokenizerObjectFrame

export async function* tokenizeJSON(
  src: ReadableStream<string> | AsyncIterable<string>
): AsyncGenerator<JsonEvent, void, void> {
  const it = isReadableStream(src) ? streamToAsyncIterable(src) : src
  let buf = ""
  // Stack drives whether we're expecting keys/values inside objects/arrays
  const stack: JsonTokenizerFrame[] = []

  for await (const chunk of it) {
    buf += chunk
    let i = 0

    parseLoop: while (true) {
      i = skipWS(buf, i)
      if (i >= buf.length) break parseLoop

      const top = stack[stack.length - 1]
      const ch = buf[i]

      // Structural tokens
      if (ch === "{") {
        yield ev.startObj()
        stack.push({ kind: "object", expect: "key" })
        i++
        continue
      }
      if (ch === "}") {
        if (!top || top.kind !== "object" || top.expect === "colon" || top.expect === "value") {
          throw new Error('Mismatched EndObj or dangling key/value')
        }
        yield ev.endObj()
        stack.pop()
        // after closing, parent expects commaOrEnd (handled by parent frame)
        i++
        continue
      }
      if (ch === "[") {
        yield ev.startArr()
        stack.push({ kind: "array", expect: "value" })
        i++
        continue
      }
      if (ch === "]") {
        if (!top || top.kind !== "array" || top.expect === "value")
          throw new Error("Mismatched ] or missing array value")
        yield ev.endArr()
        stack.pop()
        i++
        continue
      }
      if (ch === ",") {
        if (!top || top.expect !== "commaOrEnd")
          throw new Error("Unexpected comma")
        if (top.kind === "array") top.expect = "value"
        else top.expect = "key"
        i++
        continue
      }
      if (ch === ":") {
        if (!top || top.kind !== "object" || top.expect !== "colon")
          throw new Error("Unexpected colon")
        top.expect = "value"
        i++
        continue
      }

      // Value or key
      if (ch === '"') {
        const str = readJSONString(buf, i)
        if (str.kind === "needMore") break parseLoop
        if (str.kind === "error") throw new Error(str.message)
        i = str.end
        if (top && top.kind === "object" && top.expect === "key") {
          yield ev.key(str.value)
          top.expect = "colon"
        } else {
          yield ev.str(str.value)
          bumpAfterValue(stack)
        }
        continue
      }

      // Literals: true/false/null
      if (ch === "t" || ch === "f" || ch === "n") {
        const lit = readJSONLiteral(buf, i)
        if (lit.kind === "needMore") break parseLoop
        if (lit.kind === "error") throw new Error(lit.message)
        i = lit.end
        if (lit.type === "true")  yield ev.bool(true)
        if (lit.type === "false") yield ev.bool(false)
        if (lit.type === "null")  yield ev.null()
        bumpAfterValue(stack)
        continue
      }

      // Numbers
      if (ch === "-" || (ch! >= "0" && ch! <= "9")) {
        const num = readJSONNumber(buf, i)
        if (num.kind === "needMore") break parseLoop
        if (num.kind === "error") throw new Error(num.message)
        yield ev.num(num.value)
        i = num.end
        bumpAfterValue(stack)
        continue
      }

      // If we get here, it's invalid or we need more
      if (isWS(ch!)) { i++; continue } // defensive
      throw new Error(`Unexpected character '${ch}' at offset ${i}`)
    }

    // keep only the unconsumed tail
    buf = buf.slice(i)
  }

  // End-of-stream checks
  const tail = skipWS(buf, 0)
  if (tail !== buf.length) throw new Error("Trailing characters after JSON")
  if (stack.length !== 0)  throw new Error("Unclosed arrays/objects")
}

// -------- helpers -----------------------------------------------------

const isReadableStream = (x: unknown): x is ReadableStream<string> =>
  typeof x === 'object' && x !== null && typeof (x as { getReader?: unknown }).getReader === "function"

async function* streamToAsyncIterable(stream: ReadableStream<string>) {
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return
      if (value != null) yield value
    }
  } finally {
    reader.releaseLock()
  }
}

const isWS = (c: string) =>
  c === " " || c === "\n" || c === "\r" || c === "\t"

function skipWS(s: string, i: number): number {
  while (i < s.length && isWS(s[i]!)) i++
  return i
}

// ----- string reader (handles escapes; incremental) -----
function readJSONString(input: string, i0: number):
  | { kind: "ok"; value: string; end: number }
  | { kind: "needMore" }
  | { kind: "error"; message: string } {
  if (input[i0] !== '"') return { kind: "error", message: "String must start with '\"'" }
  let i = i0 + 1
  let out = ""
  while (i < input.length) {
    const ch = input[i]!
    if (ch === '"') return { kind: "ok", value: out, end: i + 1 }
    if (ch === "\\") {
      if (i + 1 >= input.length) return { kind: "needMore" }
      const esc = input[i + 1]!
      switch (esc) {
        case '"': out += '"';  i += 2; break
        case "\\": out += "\\"; i += 2; break
        case "/": out += "/";  i += 2; break
        case "b": out += "\b"; i += 2; break
        case "f": out += "\f"; i += 2; break
        case "n": out += "\n"; i += 2; break
        case "r": out += "\r"; i += 2; break
        case "t": out += "\t"; i += 2; break
        case "u": {
          if (i + 6 > input.length) return { kind: "needMore" }
          const hex = input.slice(i + 2, i + 6)
          if (!/^[0-9a-fA-F]{4}$/.test(hex))
            return { kind: "error", message: "Invalid \\u escape" }
          out += String.fromCharCode(parseInt(hex, 16))
          i += 6
          break
        }
        default:
          return { kind: "error", message: `Invalid escape \\${esc}` }
      }
    } else {
      out += ch
      i++
    }
  }
  return { kind: "needMore" }
}

// ----- literal reader (true/false/null; incremental) -----
function readJSONLiteral(input: string, i0: number):
  | { kind: "ok"; type: "true" | "false" | "null"; end: number }
  | { kind: "needMore" }
  | { kind: "error"; message: string } {
  const sub = input.slice(i0)
  const tries = [
    { word: "true",  type: "true"  as const },
    { word: "false", type: "false" as const },
    { word: "null",  type: "null"  as const },
  ]
  for (const t of tries) {
    if (sub.startsWith(t.word)) {
      const end = i0 + t.word.length
      // must be at a boundary (whitespace, comma, ] or })
      if (end < input.length && !isBoundary(input[end]!))
        return { kind: "error", message: "Invalid literal boundary" }
      // if boundary not present yet, ask for more
      if (end === input.length) return { kind: "needMore" }
      return { kind: "ok", type: t.type, end }
    }
    // may be a split literal across chunks
    if (t.word.startsWith(sub)) return { kind: "needMore" }
  }
  return { kind: "error", message: "Unknown literal" }
}

// ----- number reader (JSON number grammar; incremental) -----
function readJSONNumber(input: string, i0: number):
  | { kind: "ok"; value: number; end: number }
  | { kind: "needMore" }
  | { kind: "error"; message: string } {
  const sub = input.slice(i0)
  const m = sub.match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)
  if (!m || m[0].length === 0) return { kind: "error", message: "Invalid number" }
  const end = i0 + m[0].length
  // If we're at the end of buffer, we might be in the middle of a longer number
  if (end === input.length) return { kind: "needMore" }
  // Next char must be a boundary
  const next = input[end]!
  if (!isBoundary(next)) return { kind: "error", message: "Invalid number boundary" }
  const n = Number(m[0])
  if (!Number.isFinite(n)) return { kind: "error", message: "Non-finite number" }
  return { kind: "ok", value: n, end }
}

function isBoundary(c: string): boolean {
  return isWS(c) || c === "," || c === "]" || c === "}"
}

// After a value is emitted, adjust parent expectations
function bumpAfterValue(stack: JsonTokenizerFrame[]): void {
  const top = stack[stack.length - 1]
  if (!top) return
  if (top.kind === "array") top.expect = "commaOrEnd"
  else top.expect = "commaOrEnd"
}


// =======================
// JSON Zipper
// =======================
//
// Focused navigation & edits over Json without rebuilding the whole tree.
// Operations are pure; each returns a new zipper.

type ArrCtx = { tag: 'Arr'; left: Json[]; right: Json[] }
type ObjCtx = { tag: 'Obj'; left: Array<readonly [string, Json]>; key: string; right: Array<readonly [string, Json]> }
type Ctx = ArrCtx | ObjCtx

export type JsonZipper = { focus: Json; parents: ReadonlyArray<Ctx> }

// Create a zipper focused at the root
export const zipRoot = (j: Json): JsonZipper => ({ focus: j, parents: [] })

// Rebuild the full tree from the zipper (without moving)
export const zipTree = (z: JsonZipper): Json => {
  let node = z.focus
  for (let i = z.parents.length - 1; i >= 0; i--) {
    const c = z.parents[i]!
    if (c.tag === 'Arr') {
      node = jArr([...c.left, node, ...c.right])
    } else {
      node = jObj([...c.left, [c.key, node] as const, ...c.right])
    }
  }
  return node
}

// Move up one level
export const zipUp = (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  if (ps.length === 0) return None
  const top = ps[ps.length - 1]!
  if (top.tag === 'Arr') {
    const parent = jArr([...top.left, z.focus, ...top.right])
    return Some({ focus: parent, parents: ps.slice(0, -1) })
  } else {
    const parent = jObj([...top.left, [top.key, z.focus] as const, ...top.right])
    return Some({ focus: parent, parents: ps.slice(0, -1) })
  }
}

// Down into array index i
export const zipDownIndex = (i: number) => (z: JsonZipper): Option<JsonZipper> => {
  const n = z.focus.un
  if (n._tag !== 'JArr') return None
  if (i < 0 || i >= n.items.length) return None
  const left = n.items.slice(0, i)
  const focus = n.items[i]!
  const right = n.items.slice(i + 1)
  const ctx: ArrCtx = { tag: 'Arr', left: [...left], right: [...right] }
  return Some({ focus, parents: [...z.parents, ctx] })
}

// Left/right within array
export const zipLeft = (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  const top = ps[ps.length - 1]
  if (!top || top.tag !== 'Arr' || top.left.length === 0) return None
  const newRight = [z.focus, ...top.right]
  const newFocus = top.left[top.left.length - 1]!
  const newLeft = top.left.slice(0, -1)
  const ctx: ArrCtx = { tag: 'Arr', left: newLeft, right: newRight }
  return Some({ focus: newFocus, parents: [...ps.slice(0, -1), ctx] })
}

export const zipRight = (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  const top = ps[ps.length - 1]
  if (!top || top.tag !== 'Arr' || top.right.length === 0) return None
  const newLeft = [...top.left, z.focus]
  const newFocus = top.right[0]!
  const newRight = top.right.slice(1)
  const ctx: ArrCtx = { tag: 'Arr', left: newLeft, right: newRight }
  return Some({ focus: newFocus, parents: [...ps.slice(0, -1), ctx] })
}

// Down into object value by key (first match)
export const zipDownKey = (k: string) => (z: JsonZipper): Option<JsonZipper> => {
  const n = z.focus.un
  if (n._tag !== 'JObj') return None
  const idx = n.entries.findIndex(([kk]) => kk === k)
  if (idx < 0) return None
  const left = n.entries.slice(0, idx)
  const [_, value] = n.entries[idx]!
  const right = n.entries.slice(idx + 1)
  const ctx: ObjCtx = { tag: 'Obj', left: [...left], key: k, right: [...right] }
  return Some({ focus: value, parents: [...z.parents, ctx] })
}

// Replace / modify focus
export const zipReplace = (j: Json) => (z: JsonZipper): JsonZipper =>
  ({ focus: j, parents: z.parents })

export const zipModify = (f: (j: Json) => Json) => (z: JsonZipper): JsonZipper =>
  ({ focus: f(z.focus), parents: z.parents })

// Insert into arrays (before/after current focus)
export const zipInsertLeft = (j: Json) => (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  const top = ps[ps.length - 1]
  if (!top || top.tag !== 'Arr') return None
  const ctx: ArrCtx = { tag: 'Arr', left: [...top.left, j], right: top.right }
  return Some({ focus: z.focus, parents: [...ps.slice(0, -1), ctx] })
}

export const zipInsertRight = (j: Json) => (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  const top = ps[ps.length - 1]
  if (!top || top.tag !== 'Arr') return None
  const ctx: ArrCtx = { tag: 'Arr', left: top.left, right: [j, ...top.right] }
  return Some({ focus: z.focus, parents: [...ps.slice(0, -1), ctx] })
}

// Delete focus; move left if possible, else right; if no siblings, replace with empty container
export const zipDelete = (z: JsonZipper): Option<JsonZipper> => {
  const ps = z.parents
  const top = ps[ps.length - 1]
  if (!top) return None
  if (top.tag === 'Arr') {
    if (top.left.length > 0) {
      const newFocus = top.left[top.left.length - 1]!
      const ctx: ArrCtx = { tag: 'Arr', left: top.left.slice(0, -1), right: top.right }
      return Some({ focus: newFocus, parents: [...ps.slice(0, -1), ctx] })
    }
    if (top.right.length > 0) {
      const newFocus = top.right[0]!
      const ctx: ArrCtx = { tag: 'Arr', left: top.left, right: top.right.slice(1) }
      return Some({ focus: newFocus, parents: [...ps.slice(0, -1), ctx] })
    }
    // no siblings: replace parent array with empty
    return zipUp({ focus: jArr([]), parents: ps })
  } else {
    // object: drop the current key/value
    if (top.left.length > 0) {
      const [kPrev, vPrev] = top.left[top.left.length - 1]!
      const ctx: ObjCtx = { tag: 'Obj', left: top.left.slice(0, -1), key: kPrev, right: [[top.key, z.focus] as const, ...top.right] }
      return Some({ focus: vPrev, parents: [...ps.slice(0, -1), ctx] })
    }
    if (top.right.length > 0) {
      const [kNext, vNext] = top.right[0]!
      const ctx: ObjCtx = { tag: 'Obj', left: [...top.left, [top.key, z.focus] as const], key: kNext, right: top.right.slice(1) }
      return Some({ focus: vNext, parents: [...ps.slice(0, -1), ctx] })
    }
    return zipUp({ focus: jObj([]), parents: ps })
  }
}

// =======================
// Path-based navigation for JsonZipper
// =======================

// Path steps
export type JsonPathStep =
  | { _tag: 'Arr'; index: number }
  | { _tag: 'Set'; index: number }
  | { _tag: 'Obj'; key: string }

// Navigate to a focus by path using existing JsonZipper
export const focusAtPath = (root: Json, path: ReadonlyArray<JsonPathStep>): Option<JsonZipper> => {
  let z: JsonZipper = zipRoot(root)
  for (const step of path) {
    switch (step._tag) {
      case 'Arr': {
        const oz = zipDownIndex(step.index)(z); if (isNone(oz)) return None
        z = oz.value; break
      }
      case 'Set': {
        // For sets, treat as array for navigation
        const oz = zipDownIndex(step.index)(z); if (isNone(oz)) return None
        z = oz.value; break
      }
      case 'Obj': {
        const oz = zipDownKey(step.key)(z); if (isNone(oz)) return None
        z = oz.value; break
      }
    }
  }
  return Some(z)
}

// Optional<Json, Json> focusing by path
export const optionalAtPath = (path: ReadonlyArray<JsonPathStep>): Optional<Json, Json> => ({
  getOption: (root: Json) => {
    const oz = focusAtPath(root, path)
    return isSome(oz) ? Some(oz.value.focus) : None
  },
  set: (newFocus: Json) => (root: Json) => {
    const oz = focusAtPath(root, path)
    if (isNone(oz)) return root
    const z2 = zipReplace(newFocus)(oz.value)
    return zipTree(z2)
  },
})

// Convenience function for path-based modification
export const modifyAtPath = (path: ReadonlyArray<JsonPathStep>, f: (j: Json) => Json) =>
  (root: Json): Json => {
    const oz = focusAtPath(root, path)
    if (isNone(oz)) return root
    const z2 = zipModify(f)(oz.value)
    return zipTree(z2)
  }

// Aliases for compatibility with examples
export const fromJsonZ = zipRoot
export const toJsonZ = zipTree
export const downArr = zipDownIndex
export const downSet = zipDownIndex  // Sets are treated as arrays for navigation
export const downObjKey = zipDownKey
