import type { Complex, Field } from "../allTS"
import type { DiscDiagram } from "../allTS"
import { DiscreteCategory, LanDisc, reindexDisc } from "../allTS"

export namespace IndexedFamilies {
  /** An indexed family is just a function from index to object */
  export type Family<I, X> = (i: I) => X

  /** Finite index set with explicit carrier */
  export interface FiniteIndex<I> {
    readonly carrier: ReadonlyArray<I>
  }

  /** Convert family to discrete diagram (our existing DiscDiagram format) */
  export const familyToDiscDiagram =
    <I extends string, R>(fam: Family<I, Complex<R>>, indices: ReadonlyArray<I>): DiscDiagram<R> => {
      const result: Record<string, Complex<R>> = {}
      for (const i of indices) {
        result[i] = fam(i)
      }
      return result
    }

  /** Convert discrete diagram back to family function */
  export const discDiagramToFamily =
    <I extends string, R>(DD: DiscDiagram<R>): Family<I, Complex<R>> =>
      (i: I) => {
        const complex = DD[i]
        if (!complex) throw new Error(`discDiagramToFamily: missing complex for index '${i}'`)
        return complex
      }

  /** Map over a family pointwise */
  export const mapFamily =
    <I, X, Y>(f: (x: X, i: I) => Y) =>
    (fam: Family<I, X>): Family<I, Y> =>
      (i: I) => f(fam(i), i)

  /** Collect family values into array (finite case) */
  export const collectFamily =
    <I, X>(Ifin: FiniteIndex<I>, fam: Family<I, X>): ReadonlyArray<[I, X]> =>
      Ifin.carrier.map(i => [i, fam(i)] as const)

  /** Reduce over family values */
  export const reduceFamily =
    <I, X, A>(
      Ifin: FiniteIndex<I>,
      fam: Family<I, X>,
      seed: A,
      combine: (acc: A, x: X, i: I) => A
    ): A => {
      let acc = seed
      for (const i of Ifin.carrier) acc = combine(acc, fam(i), i)
      return acc
    }

  /** Create finite index from array */
  export const finiteIndex = <I>(carrier: ReadonlyArray<I>): FiniteIndex<I> => ({ carrier })

  /** Bridge to our existing discrete diagram operations */
  export const familyLanDisc =
    <I extends string, R>(F: Field<R>) =>
    (u: (j: I) => I, indices: ReadonlyArray<I>) =>
    (fam: Family<I, Complex<R>>): Family<I, Complex<R>> => {
      const DD = familyToDiscDiagram(fam, indices)
      const LanDD = LanDisc(F)(u as unknown as (j: string) => string)(DD)
      return discDiagramToFamily(LanDD)
    }

  /** Reindex a family along a function */
  export const reindexFamily =
    <I extends string, J extends string, R>(u: (j: J) => I) =>
    (fam: Family<I, Complex<R>>): Family<J, Complex<R>> =>
      (j: J) => fam(u(j))

  /** General reindexing for arbitrary family types (not just Complex<R>) */
  export const reindex =
    <J, I, X>(u: (j: J) => I, fam: Family<I, X>): Family<J, X> =>
      (j: J) => fam(u(j))

  /** Dependent sum (Σ): disjoint union of all fibers */
  export const sigma =
    <I, X>(Ifin: FiniteIndex<I>, fam: Family<I, X>): ReadonlyArray<{ i: I; x: X }> => {
      const result: { i: I; x: X }[] = []
      for (const i of Ifin.carrier) {
        result.push({ i, x: fam(i) })
      }
      return result
    }

  /** Dependent product (Π): choice functions (for finite literal types) */
  export type Pi<R extends Record<PropertyKey, unknown>> = { [K in keyof R]: R[K] }

  /** Build dependent product from family over finite literal index */
  export const pi =
    <I extends PropertyKey, X>(
      indices: ReadonlyArray<I>,
      fam: Family<I, X>
    ): Record<I, X> => {
      const result = {} as Record<I, X>
      for (const i of indices) {
        result[i] = fam(i)
      }
      return result
    }

  /** Extract dependent sum as tagged union */
  export const sigmaFromRecord =
    <R extends Record<PropertyKey, unknown>>(
      record: R
    ): ReadonlyArray<{ i: keyof R; x: R[keyof R] }> => {
      const result: { i: keyof R; x: R[keyof R] }[] = []
      for (const [key, value] of Object.entries(record)) {
        result.push({ i: key as keyof R, x: value as R[keyof R] })
      }
      return result
    }

  /** Helper for reindexing: compute image of carrier under function */
  export const imageCarrier =
    <J, I>(Jcar: ReadonlyArray<J>, u: (j: J) => I): ReadonlyArray<I> => {
      const seen = new Set<I>()
      const out: I[] = []
      for (const j of Jcar) {
        const i = u(j)
        if (!seen.has(i)) { seen.add(i); out.push(i) }
      }
      return out
    }

  /** Enumerable family: each fiber can be enumerated */
  export interface Enumerable<X> { enumerate: () => ReadonlyArray<X> }
  export type EnumFamily<I, X> = Family<I, Enumerable<X>>

  /** Dependent sum for enumerable families (Σ) */
  export const sigmaEnum =
    <I, X>(Ifin: FiniteIndex<I>, fam: EnumFamily<I, X>): ReadonlyArray<{ i: I; x: X }> => {
      const out: Array<{ i: I; x: X }> = []
      for (const i of Ifin.carrier) {
        for (const x of fam(i).enumerate()) {
          out.push({ i, x })
        }
      }
      return out
    }

  /** Dependent product for enumerable families (Π) */
  export type Choice<I, X> = ReadonlyArray<readonly [I, X]>
  export const piEnum =
    <I, X>(Ifin: FiniteIndex<I>, fam: EnumFamily<I, X>): ReadonlyArray<Choice<I, X>> => {
      let acc: Array<Choice<I, X>> = [[]]
      for (const i of Ifin.carrier) {
        const next: Array<Choice<I, X>> = []
        const xs = fam(i).enumerate()
        for (const ch of acc) {
          for (const x of xs) {
            next.push([...ch, [i, x]] as const)
          }
        }
        acc = next
      }
      return acc
    }

  /** Left Kan extension for enumerable families */
  export const lanEnum =
    <J, I, X>(u: (j: J) => I, Jfin: FiniteIndex<J>, fam: EnumFamily<J, X>): EnumFamily<I, { j: J; x: X }> =>
      (i: I) => ({
        enumerate: () => Jfin.carrier
          .filter((j) => u(j) === i)
          .flatMap((j) => fam(j).enumerate().map((x) => ({ j, x })))
      })

  /** Right Kan extension for enumerable families */
  export const ranEnum =
    <J, I, X>(u: (j: J) => I, Jfin: FiniteIndex<J>, fam: EnumFamily<J, X>): EnumFamily<I, Choice<J, X>> =>
      (i: I) => ({
        enumerate: () => {
          const fiber = Jfin.carrier.filter((j) => u(j) === i)
          let acc: Array<Choice<J, X>> = [[]]
          for (const j of fiber) {
            const next: Array<Choice<J, X>> = []
            const xs = fam(j).enumerate()
            for (const ch of acc) {
              for (const x of xs) {
                next.push([...ch, [j, x]] as const)
              }
            }
            acc = next
          }
          return acc
        }
      })

  /** Π-side unit: A(i) → Π_{j ∈ u^{-1}(i)} A(i) (constant choice) */
  export const unitPiEnum =
    <J, I, X>(
      u: (j: J) => I,
      Jfin: { carrier: ReadonlyArray<J> }
    ) => (i: I) => (a: X): ReadonlyArray<readonly [J, X]> =>
      Jfin.carrier
        .filter((j) => u(j) === i)
        .map((j) => [j, a] as const)

  /** Π-side counit: (u^* Π_u B)(j) → B(j) (extract j-component) */
  export const counitPiEnum =
    <J, I, X>(
      u: (j: J) => I,
      Jfin: { carrier: ReadonlyArray<J> }
    ) => (j: J) => (choice: ReadonlyArray<readonly [J, X]>): X => {
      const hit = choice.find(([jj]) => jj === j)
      if (!hit) throw new Error("counitPiEnum: missing j in choice")
      return hit[1]
    }

  /** Σ-side unit: Y(u(j)) -> (u^* Σ_u Y)(j) = Σ_u Y (at i = u(j)) */
  export const unitSigmaEnum =
    <J, I, X>(
      u: (j: J) => I,
      _Jfin: { carrier: ReadonlyArray<J> }
    ) => (j: J) => (y: X): { j: J; x: X } => ({ j, x: y })

  /** Σ-side counit: (Σ_u u^* X)(i) -> X(i) */
  export const counitSigmaEnum =
    <J, I, X>(
      _u: (j: J) => I,
      _Jfin: { carrier: ReadonlyArray<J> }
    ) => (i: I) => (pair: { j: J; x: X }): X => pair.x

  /** Σ-side second triangle helper */
  export const sigmaOfUnitEnum =
    <J, I, X>(
      u: (j: J) => I,
      Jfin: { carrier: ReadonlyArray<J> }
    ) => (i: I) => (elem: { j: J; x: X }): { j: J; x: { j: J; x: X } } => {
      const eta = unitSigmaEnum<J, I, X>(u, Jfin)
      return { j: elem.j, x: eta(elem.j)(elem.x) }
    }

  /** Π-side second triangle helper */
  export const etaForPiEnum =
    <J, I, X>(
      u: (j: J) => I,
      Jfin: { carrier: ReadonlyArray<J> }
    ) => (i: I) => (choice: ReadonlyArray<readonly [J, X]>): ReadonlyArray<readonly [J, ReadonlyArray<readonly [J, X]>]> => {
      const fiber = Jfin.carrier.filter((j) => u(j) === i)
      return fiber.map((j) => [j, choice] as const)
    }

  /** Π-side second triangle: (Π_u ε_B)_i */
  export const PiOfEpsEnum =
    <J, I, X>(
      u: (j: J) => I,
      Jfin: { carrier: ReadonlyArray<J> }
    ) => (i: I) => (bundle: ReadonlyArray<readonly [J, ReadonlyArray<readonly [J, X]>]>): ReadonlyArray<readonly [J, X]> => {
      const eps = counitPiEnum<J, I, X>(u, Jfin)
      const fiber = Jfin.carrier.filter((j) => u(j) === i)
      return fiber.map((j) => {
        const comp = bundle.find(([jj]) => jj === j)?.[1]
        if (!comp) throw new Error("PiOfEpsEnum: missing component for j")
        return [j, eps(j)(comp)] as const
      })
    }

  /** Sugar: create family from array */
  export const familyFromArray =
    <X>(xs: ReadonlyArray<X>) => {
      const I = xs.map((_, i) => i)
      const Ifin: FiniteIndex<number> = { carrier: I }
      const fam: Family<number, X> = (i) => xs[i]!
      return { I, Ifin, fam, Idisc: DiscreteCategory.create(I) } as const
    }

  /** Sugar: create family from record */
  export const familyFromRecord =
    <K extends string | number | symbol, X>(rec: Record<K, X>) => {
      const keys = Object.keys(rec) as K[]
      const Ifin: FiniteIndex<K> = { carrier: keys }
      const fam: Family<K, X> = (k) => rec[k]!
      return { keys, Ifin, fam, Idisc: DiscreteCategory.create(keys) } as const
    }

  /** Pullback indices for Beck-Chevalley tests */
  export const pullbackIndices =
    <I, K, L>(
      Ifin: { carrier: ReadonlyArray<I> },
      Kfin: { carrier: ReadonlyArray<K> },
      f: (i: I) => L,
      w: (k: K) => L
    ) => {
      const J = Ifin.carrier.flatMap((i) =>
        Kfin.carrier.filter((k) => f(i) === w(k)).map((k) => [i, k] as const)
      )
      const Jfin: FiniteIndex<readonly [I, K]> = { carrier: J }
      const u = (jk: readonly [I, K]) => jk[0]
      const v = (jk: readonly [I, K]) => jk[1]
      return { J, Jfin, u, v }
    }
}
