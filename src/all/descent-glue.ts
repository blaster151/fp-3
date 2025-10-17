// ===============================================================
// Generic descent/glue kit
//   - Works over every index type I (keys you glue along),
//     local pieces Xi, overlap observations Oij, and final A.
//   - You supply: how to "restrict" to overlaps, equality on overlaps,
//     optional completeness checks, and how to assemble the global.
// ===============================================================

import { eqStrict } from "../../stdlib/eq"
import type { Eq } from "../../core"
import { VErr, VOk, isVErr } from "../../validation"
import type { Validation } from "../../validation"

export type GlueKit<I extends PropertyKey, Xi, Oij, A> = {
  readonly cover: ReadonlyArray<I>
  readonly restrict: (i: I, j: I) => (xi: Xi) => Oij
  readonly eqO: Eq<Oij>
  readonly assemble: (sections: Readonly<Record<I, Xi>>) => A
  readonly completeness?: (i: I, xi: Xi) => ReadonlyArray<string> // empty => ok
}

export type GlueErr<I extends PropertyKey, Oij> =
  | { _tag: 'Incomplete'; i: I; details: ReadonlyArray<string> }
  | { _tag: 'Conflict';  i: I; j: I; left: Oij; right: Oij }

export const GlueKit = Symbol.for('GlueKit')
export const GlueErr = Symbol.for('GlueErr')

export const checkDescent =
  <I extends PropertyKey, Xi, Oij, A>(
    kit: GlueKit<I, Xi, Oij, A>,
    secs: Readonly<Record<I, Xi>>
  ): Validation<GlueErr<I, Oij>, true> => {
    const errs: GlueErr<I, Oij>[] = []
    const ids = kit.cover

    // 1) completeness per piece (optional)
    if (kit.completeness) {
      for (const i of ids) {
        const issues = kit.completeness(i, secs[i])
        if (issues.length) errs.push({ _tag: 'Incomplete', i, details: issues })
      }
    }

    // 2) compatibility on all overlaps
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
      const i = ids[a]!, j = ids[b]!
      const rij = kit.restrict(i, j)(secs[i])
      const rji = kit.restrict(j, i)(secs[j])
      if (!kit.eqO(rij, rji)) errs.push({ _tag: 'Conflict', i, j, left: rij, right: rji })
    }

    return errs.length ? VErr(...errs) : VOk(true as const)
  }

export const glue =
  <I extends PropertyKey, Xi, Oij, A>(
    kit: GlueKit<I, Xi, Oij, A>,
    secs: Readonly<Record<I, Xi>>
  ): Validation<GlueErr<I, Oij>, A> => {
    const ok = checkDescent(kit, secs)
    if (isVErr(ok)) return ok
    return VOk(kit.assemble(secs))
  }

// ===============================================================
// Record-based gluing (keys as "opens")
// ===============================================================
export type RecordCover<I extends PropertyKey, K extends PropertyKey> =
  Readonly<Record<I, ReadonlySet<K>>>
export type Sections<I extends PropertyKey, K extends PropertyKey, A> =
  Readonly<Record<I, Readonly<Partial<Record<K, A>>>>>

export const RecordCover = Symbol.for('RecordCover')
export const Sections = Symbol.for('Sections')

const intersect = <T>(a: ReadonlySet<T>, b: ReadonlySet<T>): ReadonlyArray<T> => {
  const out: T[] = []; for (const x of a) if (b.has(x)) out.push(x); return out
}

const eqRecordOn =
  <K extends PropertyKey, A>(eqA: Eq<A>) =>
  (keys: ReadonlyArray<K>) =>
  (
    x: Readonly<Partial<Record<K, A>>>,
    y: Readonly<Partial<Record<K, A>>>
  ): boolean =>
    keys.every(k => eqA(x[k] as A, y[k] as A))

const pickRecord = <K extends PropertyKey, A>(
  r: Readonly<Partial<Record<K, A>>>,
  ks: ReadonlyArray<K>
): Readonly<Partial<Record<K, A>>> => {
  const out: Partial<Record<K, A>> = {}
  for (const k of ks) {
    if (Object.prototype.hasOwnProperty.call(r, k)) {
      out[k] = r[k] as A
    }
  }
  return out
}

export const mkRecordGlueKit =
  <I extends PropertyKey, K extends PropertyKey, A>(
    cover: RecordCover<I, K>,
    eqA: Eq<A> = eqStrict<A>()
  ): GlueKit<
    I,
    Readonly<Partial<Record<K, A>>>,
    Readonly<Partial<Record<K, A>>>,
    Readonly<Record<K, A>>
  > => {
    const ids = Object.keys(cover) as I[]

    const restrict = (i: I, j: I) => (ri: Readonly<Partial<Record<K, A>>>) =>
      pickRecord(ri, intersect(cover[i], cover[j]))

    const eqO = (
      x: Readonly<Partial<Record<K, A>>>,
      y: Readonly<Partial<Record<K, A>>>
    ) =>
      eqRecordOn(eqA)(Object.keys(x) as K[])(x, y) &&
      eqRecordOn(eqA)(Object.keys(y) as K[])(x, y)

    const completeness = (i: I, ri: Readonly<Partial<Record<K, A>>>) => {
      const need = [...cover[i] as Set<K>]
      const miss = need.filter(k => !(k in ri))
      return miss.length ? miss.map(k => `missing ${String(k)}`) : []
    }

    const assemble = (secs: Readonly<Record<I, Readonly<Partial<Record<K, A>>>>>) => {
      // union of all keys in the cover
      const all = new Set<K>(); for (const i of ids) for (const k of cover[i]) all.add(k)
      const out: Partial<Record<K, A>> = {}
      // since descent holds, whatever section defines k has the same value
      for (const k of all) {
        for (const i of ids) {
          const ri = secs[i]
          if (Object.prototype.hasOwnProperty.call(ri, k)) {
            out[k] = ri[k] as A
            break
          }
        }
      }
      return out as Readonly<Record<K, A>>
    }

    return { cover: ids, restrict, eqO, completeness, assemble }
  }

// Legacy API compatibility
export const glueRecordCover =
  <I extends PropertyKey, K extends PropertyKey, A>(
    cover: RecordCover<I, K>,
    secs: Sections<I, K, A>,
    eq: Eq<A> = eqStrict<A>()
  ) => glue(mkRecordGlueKit(cover, eq), secs)

export const resRecord =
  <I extends PropertyKey, K extends PropertyKey, A>(cover: RecordCover<I, K>) =>
  (i: I, j: I) =>
  (si: Readonly<Partial<Record<K, A>>>): Readonly<Partial<Record<K, A>>> => {
    const kit = mkRecordGlueKit<I, K, A>(cover)
    return kit.restrict(i, j)(si)
  }

// ---------- Fused hylo demo (Expr or Json as you like) ----------
// Note: These functions would need to be implemented based on your fused hylo setup
// const s5 = evalSum1toN_FUSED(5)                          // 15
// const p2 = showPowMul_FUSED(2, 3)                        // "((3 * 3) * (3 * 3))"
