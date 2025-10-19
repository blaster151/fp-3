import type { EndofunctorK1, EndofunctorValue, NatK1, StrengthEnv, Env } from "./endo-2category"
import { viewCompose } from "./endo-2category"
import { Err, Ok, isOk, mapR } from "./result"
import type { Result } from "./result"
import type { HKId1, HKKind1, Task, Lens, ExprF, Fix1 } from "./allTS"

type MonadK1<F extends HKId1> = import("./allTS").MonadK1<F>
type FunctorK1<F extends HKId1> = import("./allTS").FunctorK1<F>

const _exhaustive = (x: never): never => x

// ---------- Additional Endofunctors for Free Algebra ----------
export const PairEndo = <C>(): EndofunctorK1<['Pair', C]> => ({
  map: <A, B>(f: (a: A) => B) => (p: readonly [C, A]): readonly [C, B] => [p[0], f(p[1])]
})

export const ConstEndo = <C>(): EndofunctorK1<['Const', C]> => ({
  map: <A, B>(_f: (a: A) => B) => (c: C): C => c
})

export const EitherEndo = <E>(): EndofunctorK1<['Either', E]> => ({
  map: <A, B>(f: (a: A) => B) => (eab: Result<E, A>): Result<E, B> => mapR<E, A, B>(f)(eab)
})

// Const functor: Const<C, A> ≅ C (ignores the A parameter)
export type Const<C, A> = [C, A][0]

// Additional strength helpers for Pair and Const
export const strengthEnvFromPair = <E>() => <C>(): StrengthEnv<['Pair', C], E> => ({
  st: <A>(p: EndofunctorValue<['Pair', C], Env<E, A>>) => {
    const pair = p as readonly [C, Env<E, A>]
    return [pair[1][0], [pair[0], pair[1][1]] as const] as const
  }
})

export const strengthEnvFromConst = <E, C>(defaultE: E): StrengthEnv<['Const', C], E> => ({
  st: <A>(_c: EndofunctorValue<['Const', C], Env<E, A>>) => [defaultE, _c as C] as const
})

// Composition strength helper
export const strengthEnvCompose = <E>() =>
  <F, G>(F: EndofunctorK1<F>, G: EndofunctorK1<G>, sF: StrengthEnv<F, E>, sG: StrengthEnv<G, E>): StrengthEnv<['Comp', F, G], E> => ({
    st: <A>(fg_ea: EndofunctorValue<['Comp', F, G], Env<E, A>>) => {
      void G
      const fgaAsF = viewCompose<F, G, Env<E, A>>(fg_ea)
      const pushedThroughG = F.map((g_ea: EndofunctorValue<G, Env<E, A>>) => sG.st<A>(g_ea))(fgaAsF)
      const [e, mapped] = sF.st<EndofunctorValue<G, A>>(pushedThroughG)
      return [e, mapped] as const
    }
  }) as StrengthEnv<['Comp', F, G], E>

// ==================== Comonad K1 ====================
export interface ComonadK1<F> extends EndofunctorK1<F> {
  // counit ε : W<A> -> A
  readonly extract: <A>(fa: EndofunctorValue<F, A>) => A
  // comultiplication δ : W<A> -> W<W<A>>
  readonly duplicate: <A>(wa: EndofunctorValue<F, A>) => EndofunctorValue<F, EndofunctorValue<F, A>>
  // extend (co-Kleisli lift): (W<A> -> B) -> (W<A> -> W<B>)
  readonly extend: <A, B>(f: (fa: EndofunctorValue<F, A>) => B) => (fa: EndofunctorValue<F, A>) => EndofunctorValue<F, B>
}
export const duplicateK1 =
  <F>(W: ComonadK1<F>) =>
  <A>(wa: EndofunctorValue<F, A>) => W.extend<A, EndofunctorValue<F, A>>((x) => x)(wa)

// ===============================================================
// Mixed distributive laws: T∘G ⇒ G∘T (monad × comonad)
//   - Enables lifting monads to G-coalgebras and comonads to T-algebras
//   - Foundation for entwining structures and corings
// ===============================================================

// Mixed distributive law T∘G ⇒ G∘T
export type MixedDistK1<T extends HKId1, G extends HKId1> = {
  dist: <A>(tga: HKKind1<T, HKKind1<G, A>>) => HKKind1<G, HKKind1<T, A>>
}

// Lift T to G-coalgebras: given γ : A -> G A, produce γ^T : T A -> G (T A)
export const liftMonadToGCoalgK1 =
  <T extends HKId1, G extends HKId1>(M: MonadK1<T>, C: ComonadK1<G>, D: MixedDistK1<T, G>) =>
  <A>(gamma: (a: A) => HKKind1<G, A>) =>
  (ta: HKKind1<T, A>): HKKind1<G, HKKind1<T, A>> =>
    (void C, D.dist(M.map(gamma)(ta)))

// Lift G to T-algebras: given α : T A -> A, produce α_G : T (G A) -> G A
export const liftComonadToTAlgK1 =
  <T extends HKId1, G extends HKId1>(M: MonadK1<T>, C: ComonadK1<G>, D: MixedDistK1<T, G>) =>
  <A>(alpha: (ta: HKKind1<T, A>) => A) =>
  (tga: HKKind1<T, HKKind1<G, A>>): HKKind1<G, A> =>
    (void M,
    C.map(alpha as (ta: HKKind1<T, A>) => A)(
      D.dist(tga) as unknown as EndofunctorValue<G, HKKind1<T, A>>
    )) as unknown as HKKind1<G, A>

// =============== Coalgebras for W ===============
// A coalgebra is a coaction α : A -> W<A> satisfying:
//  (CoCounit)   extract(α(a)) = a
//  (CoAssoc)    duplicate(α(a)) = map(α)(α(a))
export type Coalgebra<W, A> = (a: A) => EndofunctorValue<W, A>

// Morphism of coalgebras f : (A,α) -> (B,β) satisfies:
//   map(f) ∘ α = β ∘ f
export const isCoalgebraMorphism =
  <W>(W: EndofunctorK1<W>) =>
  <A, B>(alpha: Coalgebra<W, A>, beta: Coalgebra<W, B>, f: (a: A) => B, eq: (x: unknown, y: unknown) => boolean) =>
  (a: A): boolean =>
    eq(W.map(f)(alpha(a)), beta(f(a)))

type CoalgebraLaw = "counit" | "coassociativity"

export interface CoalgebraLawCounterexample<A> {
  readonly law: CoalgebraLaw
  readonly sample: A
  readonly actual: unknown
  readonly expected: unknown
}

export interface CoalgebraLawReport<A> {
  readonly holds: boolean
  readonly counitHolds: boolean
  readonly coassociativityHolds: boolean
  readonly issues: ReadonlyArray<string>
  readonly counterexamples: ReadonlyArray<CoalgebraLawCounterexample<A>>
  readonly details: string
}

export const checkCoalgebraLaws =
  <W>(W: ComonadK1<W>) =>
  <A>(
    alpha: Coalgebra<W, A>,
    eq: (left: unknown, right: unknown) => boolean,
    samples: ReadonlyArray<A>,
  ): CoalgebraLawReport<A> => {
    const counterexamples: CoalgebraLawCounterexample<A>[] = []

    for (const sample of samples) {
      const coaction = alpha(sample)
      const counitActual = W.extract(coaction)
      if (!eq(counitActual, sample)) {
        counterexamples.push({
          law: "counit",
          sample,
          actual: counitActual,
          expected: sample,
        })
      }

      const coassocActual = W.duplicate(coaction)
      const coassocExpected = W.map(alpha)(coaction)
      if (!eq(coassocActual, coassocExpected)) {
        counterexamples.push({
          law: "coassociativity",
          sample,
          actual: coassocActual,
          expected: coassocExpected,
        })
      }
    }

    const counitHolds = counterexamples.every((issue) => issue.law !== "counit")
    const coassociativityHolds = counterexamples.every((issue) => issue.law !== "coassociativity")

    const issues: string[] = []
    if (!counitHolds) {
      issues.push("Counit law failed for at least one sample.")
    }
    if (!coassociativityHolds) {
      issues.push("Coassociativity law failed for at least one sample.")
    }

    const holds = counterexamples.length === 0
    const details = holds
      ? "Coalgebra samples satisfy counit and coassociativity."
      : `Coalgebra law issues: ${issues.join(" ")}`

    return {
      holds,
      counitHolds,
      coassociativityHolds,
      issues,
      counterexamples,
      details,
    }
  }

// =============== Forgetful functor U : Coalg(W) -> Set ===============
// U "forgets" the coaction: on objects, (A,α) |-> A; on morphisms, f |-> f.
// In TS we model it as identity at runtime; the meaning is in the types.
export const ForgetfulFromCoalgebras =
  <W>(_W: ComonadK1<W>) => ({
    onObject: <A>(_alpha: Coalgebra<W, A>) => (undefined as unknown as A),
    onMorphism: <A, B>(f: (a: A) => B) => f,
  })

// =============== Concrete Comonad: Pair<E,_> (aka Env) ===============
// Env comonad (aka Pair<E,_>)
export const PairComonad =
  <E>(): ComonadK1<['Pair', E]> => ({
    ...PairEndo<E>(),
    extract: <A>(wa: readonly [E, A]) => wa[1],
    duplicate: <A>(wa: readonly [E, A]) => [wa[0], wa] as const,
    extend: <A, B>(f: (w: readonly [E, A]) => B) => (wa: readonly [E, A]) =>
      [wa[0], f(wa)] as const
  })

// ===============================================================
// Co-Kleisli category for a comonad W
//   Morphisms A -> B are functions  f̂ : W<A> -> B
//   id = extract
//   ĝ ∘ f̂ = ĝ ∘ extend(f̂)
// ===============================================================
export const CoKleisliK1 =
  <W>(W: ComonadK1<W>) => ({
    id:
      <A>() =>
      (wa: EndofunctorValue<W, A>): A =>
        W.extract(wa),
    compose:
      <A, B, C>(gHat: (wb: EndofunctorValue<W, B>) => C, fHat: (wa: EndofunctorValue<W, A>) => B) =>
      (wa: EndofunctorValue<W, A>): C =>
        gHat(W.extend(fHat)(wa)),
    // lift a plain h : A -> B into co-Kleisli ĥ = h ∘ extract
    arr:
      <A, B>(h: (a: A) => B) =>
      (wa: EndofunctorValue<W, A>) =>
        h(W.extract(wa))
  })

// ===============================================================
// Simplicial object induced by a comonad W
//   X_n  = W^{n+1}   (n >= 0)
//   d_i : X_n => X_{n-1}  (0 <= i <= n)    via inserting extract at i
//   s_i : X_n => X_{n+1}  (0 <= i <= n)    via inserting duplicate at i
//   aug : X_0 => Id        (the ε : W => Id)
// ===============================================================

// functor power: W^n as an EndofunctorK1
type PowEndofunctor<W> = readonly ['Pow', W]

const iterateMap = <W>(W: EndofunctorK1<W>, times: number) => {
  const map = W.map as <X, Y>(
    fn: (value: X) => Y
  ) => (input: EndofunctorValue<W, X>) => EndofunctorValue<W, Y>

  return <X, Y>(fn: (value: X) => Y) => {
    let lifted: (value: unknown) => unknown = fn as (value: unknown) => unknown
    for (let i = 0; i < times; i++) {
      const step = map<unknown, unknown>(lifted as (value: unknown) => unknown)
      lifted = (value: unknown) => step(value as EndofunctorValue<W, unknown>)
    }
    return (input: EndofunctorValue<PowEndofunctor<W>, X>) =>
      lifted(input as unknown) as EndofunctorValue<PowEndofunctor<W>, Y>
  }
}

export const powEndoK1 =
  <W>(W: EndofunctorK1<W>, n: number): EndofunctorK1<PowEndofunctor<W>> => ({
    map: <A, B>(f: (a: A) => B) => iterateMap(W, n)(f)
  })

export type SimplicialFromComonadK1<W> = {
  // X_n = W^{n+1}
  X: (n: number) => EndofunctorK1<PowEndofunctor<W>>
  // faces / degeneracies as natural transformations
  d: (n: number, i: number) => NatK1<PowEndofunctor<W>, PowEndofunctor<W>> // X_n => X_{n-1}
  s: (n: number, i: number) => NatK1<PowEndofunctor<W>, PowEndofunctor<W>> // X_n => X_{n+1}
  // augmentation ε : X_0 => Id
  aug: NatK1<PowEndofunctor<W>, 'Id'>
}

export const makeSimplicialFromComonadK1 =
  <W>(W: ComonadK1<W>): SimplicialFromComonadK1<W> => {
    // X_n: W^{n+1}
    const X = (n: number): EndofunctorK1<PowEndofunctor<W>> => powEndoK1(W, n + 1)

    // face d_i^n : W^{n+1}A -> W^{n}A
    const d = (n: number, i: number): NatK1<PowEndofunctor<W>, PowEndofunctor<W>> => ({
      app: <A>(val: EndofunctorValue<PowEndofunctor<W>, A>) => {
        const go = (m: number, j: number, x: unknown): unknown =>
          j === 0
            ? W.extract(x as EndofunctorValue<W, A>)
            : W.map((y: unknown) => go(m - 1, j - 1, y))(
                x as EndofunctorValue<W, unknown>
              )
        return go(n, i, val) as EndofunctorValue<PowEndofunctor<W>, A>
      }
    })

    // degeneracy s_i^n : W^{n+1}A -> W^{n+2}A
    const s = (n: number, i: number): NatK1<PowEndofunctor<W>, PowEndofunctor<W>> => ({
      app: <A>(val: EndofunctorValue<PowEndofunctor<W>, A>) => {
        const go = (m: number, j: number, x: unknown): unknown =>
          j === 0
            ? W.duplicate(x as EndofunctorValue<W, A>)
            : W.map((y: unknown) => go(m - 1, j - 1, y))(
                x as EndofunctorValue<W, unknown>
              )
        return go(n, i, val) as EndofunctorValue<PowEndofunctor<W>, A>
      }
    })

    const aug: NatK1<PowEndofunctor<W>, 'Id'> = {
      app: <A>(wa: EndofunctorValue<PowEndofunctor<W>, A>) => W.extract(wa as EndofunctorValue<W, A>)
    }

    return { X, d, s, aug }
  }

// =====================================================================
// Chain complex (augmented) from the simplicial object of PairComonad<E>
//   Category = Set; comonad W(X) = E × X with |E| finite.
//   X_n = E^{n+1} × A (finite set). We build C_n = Z[X_n] (free abelian).
//   Boundary ∂_n = Σ_i (-1)^i d_i  (with ∂_0 = augmentation ε : E×A → A).
//   We represent linear maps by integer matrices and compute Betti numbers
//   over Q (rank/nullity via Gaussian elimination).
// =====================================================================

// ---------- Finite enumeration helpers ----------
type NestedPair<E, A> = A | readonly [E, NestedPair<E, A>]

const isNestedPairTuple = <E, A>(value: NestedPair<E, A>): value is readonly [E, NestedPair<E, A>] =>
  Array.isArray(value) && value.length === 2

const extractNestedPairValue = <E, A>(pair: NestedPair<E, A>): A =>
  isNestedPairTuple(pair) ? extractNestedPairValue(pair[1]) : pair

// E^k × A as nested pairs  [e0, [e1, [... [ek-1, a] ...]]]
export const enumeratePowPair =
  <E, A>(Es: ReadonlyArray<E>, k: number, As: ReadonlyArray<A>): ReadonlyArray<NestedPair<E, A>> => {
    // cartesian power Es^k
    const tuples: E[][] = [[]]
    for (let i = 0; i < k; i++) {
      const next: E[][] = []
      for (const t of tuples) for (const e of Es) next.push([...t, e])
      tuples.splice(0, tuples.length, ...next)
    }
    const out: NestedPair<E, A>[] = []
    for (const a of As) for (const t of tuples) {
      let v: NestedPair<E, A> = a
      for (let i = t.length - 1; i >= 0; i--) {
        const entry = t[i]!
        v = [entry, v] as const
      }
      out.push(v)
    }
    return out
  }

// stable key for NestedPair<E,A> (serialize to JSON-ish)
const keyNested = <E, A>(v: NestedPair<E, A>): string => {
  const flat: unknown[] = []
  let cur: NestedPair<E, A> = v
  while (isNestedPairTuple(cur)) {
    flat.push(cur[0])
    cur = cur[1]
  }
  flat.push(cur)
  return JSON.stringify(flat)
}

// ---------- Boundary matrices from simplicial faces ----------
export type ZMatrix = number[][] // rows x cols, integers

export const buildBoundariesForPair =
  <E, A>(Es: ReadonlyArray<E>, As: ReadonlyArray<A>, maxN: number): { dims: number[]; d: ZMatrix[] } => {
    // comonad & simplicial structure
    const W = PairComonad<E>()
    const S = makeSimplicialFromComonadK1(W)

    // X_n = W^{n+1} A = E^{n+1} × A
    const X: ReadonlyArray<NestedPair<E, A>>[] = []
    const idx: Map<string, number>[] = []
    for (let n = 0; n <= maxN; n++) {
      const elems = enumeratePowPair(Es, n + 1, As)
      X[n] = elems
      const m = new Map<string, number>()
      elems.forEach((el, i) => m.set(keyNested(el), i))
      idx[n] = m
    }

    // Build ∂_n: C_n → C_{n-1}
    const d: ZMatrix[] = []
    // n = 0 (augmentation): ε : E×A → A
    {
      const rows = As.length
      const cols = X[0]!.length // |E|*|A|
      const M: ZMatrix = Array.from({ length: rows }, () => Array(cols).fill(0))
      X[0]!.forEach((x0, j) => {
        // extract to A
        const a = extractNestedPairValue(x0)
        const i = As.findIndex((aa) => Object.is(aa, a))
        M[i]![j] = 1
      })
      d[0] = M
    }
    // n >= 1: ∂_n = Σ_i (-1)^i d_i
    for (let n = 1; n <= maxN; n++) {
      const rows = X[n - 1]!.length
      const cols = X[n]!.length
      const M: ZMatrix = Array.from({ length: rows }, () => Array(cols).fill(0))
      for (let j = 0; j < cols; j++) {
        const simplex = X[n]![j]!
        for (let i = 0; i <= n; i++) {
          const face = S.d(n, i).app(simplex) // element of X_{n-1}
          const r = idx[n - 1]!.get(keyNested(face))
          if (r == null) throw new Error(`Face not found in X_${n - 1}`)
          M[r]![j]! += (i % 2 === 0 ? 1 : -1)
        }
      }
      d[n] = M
    }

    const dims = X.map(xs => xs.length)
    return { dims, d }
  }

// ---------- Linear algebra over Q (rank / betti) ----------
export const rankQ = (M: ZMatrix): number => {
  if (M.length === 0) return 0
  const A = M.map(row => row.map(x => x * 1)) // copy as float
  const m = A.length, n = A[0]?.length ?? 0
  let r = 0, c = 0
  const EPS = 1e-10
  while (r < m && c < n) {
    // find pivot
    let piv = r
    for (let i = r; i < m; i++) if (Math.abs(A[i]![c]!) > Math.abs(A[piv]![c]!)) piv = i
    if (Math.abs(A[piv]![c]!) < EPS) { c++; continue }
    // swap rows
    if (piv !== r) { const tmp = A[piv]!; A[piv] = A[r]!; A[r] = tmp }
    // normalize row r
    const s = A[r]![c]!
    for (let j = c; j < n; j++) A[r]![j]! /= s
    // eliminate
    for (let i = 0; i < m; i++) if (i !== r) {
      const f = A[i]![c]!
      if (Math.abs(f) > EPS) for (let j = c; j < n; j++) A[i]![j]! -= f * A[r]![j]!
    }
    r++; c++
  }
  return r
}

export const bettiReduced =
  (dims: number[], d: ZMatrix[], upToN: number): number[] => {
    // β̃_n = nullity(∂_n) - rank(∂_{n+1})
    const betti: number[] = []
    for (let n = 0; n <= upToN; n++) {
      const rank_n = rankQ(d[n] ?? [[]])
      const dim_n  = dims[n] ?? 0
      const null_n = dim_n - rank_n
      const rank_np1 = rankQ(d[n + 1] ?? [[]])
      betti[n] = null_n - rank_np1
    }
    return betti
  }

export const bettiUnreduced =
  (dims: number[], d: ZMatrix[], upToN: number, augDim: number): number[] => {
    // β_0 = β̃_0 + augDim ; β_n (n>=1) = β̃_n
    const r = bettiReduced(dims, d, upToN)
    if (r.length) r[0] = r[0]! + augDim
    return r
  }

// quick check: composition ∂_{n-1} ∘ ∂_n = 0
export const composeMatrices = (A: ZMatrix, B: ZMatrix): ZMatrix => {
  const m = A.length, k = A[0]?.length ?? 0, n = B[0]?.length ?? 0
  if (B.length !== k) throw new Error('composeMatrices: incompatible shapes')
  const C: ZMatrix = Array.from({ length: m }, () => Array(n).fill(0))
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++)
      for (let t = 0; t < k; t++)
        C[i]![j]! += A[i]![t]! * B[t]![j]!
  return C
}

// =====================================================================
// Smith Normal Form over Z  (small, pedagogical; fine for tiny matrices)
// Returns U, D, V with U*M*V = D, U,V unimodular; diag(D) nonneg and
// each di | d{i+1}. Also returns V^{-1} so we can change the C_n basis.
// =====================================================================
export type SNF = {
  D: ZMatrix
  U: ZMatrix
  V: ZMatrix
  Vinv: ZMatrix
  rank: number
  diag: number[] // nonzero invariant factors
}

const ident = (m: number): ZMatrix =>
  Array.from({ length: m }, (_, i) =>
    Array.from({ length: m }, (_, j) => (i === j ? 1 : 0))
  )

const swapRows = (M: ZMatrix, i: number, j: number) => {
  const t = M[i]!; M[i] = M[j]!; M[j] = t
}
const swapCols = (M: ZMatrix, i: number, j: number) => {
  for (let r = 0; r < M.length; r++) { const t = M[r]![i]!; M[r]![i] = M[r]![j]!; M[r]![j] = t }
}
const addRow = (M: ZMatrix, src: number, dst: number, k: number) => {
  const row = M[src]!; const to = M[dst]!
  for (let c = 0; c < to.length; c++) to[c]! += k * row[c]!
}
const addCol = (M: ZMatrix, src: number, dst: number, k: number) => {
  for (let r = 0; r < M.length; r++) M[r]![dst]! += k * M[r]![src]!
}
export const smithNormalForm = (M0: ZMatrix): SNF => {
  const m = M0.length, n = M0[0]?.length ?? 0
  const M = M0.map(r => r.slice())
  const U = ident(m), V = ident(n), Vinv = ident(n) // we'll keep V and V^{-1}

  let r = 0, c = 0
  while (r < m && c < n) {
    // find a nonzero pivot with minimal |value|
    let pr = -1, pc = -1, best = Number.MAX_SAFE_INTEGER
    for (let i = r; i < m; i++) for (let j = c; j < n; j++) {
      const val = Math.abs(M[i]![j]!)
      if (val !== 0 && val < best) { best = val; pr = i; pc = j }
    }
    if (pr < 0) break // all remaining are zero
    if (pr !== r) { swapRows(M, pr, r); swapRows(U, pr, r) }
    if (pc !== c) { swapCols(M, pc, c); swapCols(V, pc, c); swapRows(Vinv, c, pc) } // Vinv left-multiplies inverse effect

    // now reduce column c and row r
    let changed = true
    while (changed) {
      changed = false
      // clear below/above in column c
      for (let i = 0; i < m; i++) if (i !== r && M[i]![c]! !== 0) {
        const q = Math.trunc(M[i]![c]! / M[r]![c]!)
        addRow(M, r, i, -q); addRow(U, r, i, -q)
        if (Math.abs(M[i]![c]!) < Math.abs(M[r]![c]!)) { swapRows(M, i, r); swapRows(U, i, r); changed = true }
      }
      // clear left/right in row r
      for (let j = 0; j < n; j++) if (j !== c && M[r]![j]! !== 0) {
        const q = Math.trunc(M[r]![j]! / M[r]![c]!)
        addCol(M, c, j, -q); addCol(V, c, j, -q); addRow(Vinv, j, c, q) // (V * C, C^{-1} * Vinv)
        if (Math.abs(M[r]![j]!) < Math.abs(M[r]![c]!)) { swapCols(M, j, c); swapCols(V, j, c); swapRows(Vinv, c, j); changed = true }
      }
    }
    // make diagonal nonnegative
    if (M[r]![c]! < 0) { 
      for (let j = 0; j < n; j++) M[r]![j] = -M[r]![j]!; 
      for (let j = 0; j < n; j++) V[r]![j] = -V[r]![j]!; 
      for (let j = 0; j < n; j++) Vinv[j]![r] = -Vinv[j]![r]! 
    }
    // ensure divisibility condition wrt submatrix
    for (let i = r + 1; i < m; i++) if (M[i]![c]! % M[r]![c]! !== 0) { addRow(M, r, i, 1); addRow(U, r, i, 1); changed = true }
    for (let j = c + 1; j < n; j++) if (M[r]![j]! % M[r]![c]! !== 0) { addCol(M, c, j, 1); addCol(V, c, j, 1); addRow(Vinv, j, c, -1); changed = true }
    if (changed) continue

    r++; c++
  }

  // canonicalize: positive diagonal, zeros elsewhere in used rows/cols
  const diag: number[] = []
  for (let i = 0; i < Math.min(r, c); i++) diag.push(Math.abs(M[i]![i]!))
  return { D: M, U, V, Vinv, rank: diag.filter(d => d !== 0).length, diag: diag.filter(d => d !== 0) }
}

// =====================================================================
// Integer homology H_n(Z) from boundaries d_n with torsion
//   Uses SNF(d_n) to find ker(d_n) basis, then restricts d_{n+1} into
//   that subspace and SNF there to read torsion invariants.
// =====================================================================
export type HomologyZ = { n: number; freeRank: number; torsion: number[] }

export const homologyZ_fromBoundaries =
  (dims: number[], d: ZMatrix[], n: number): HomologyZ => {
    const dn   = d[n]   ?? [[]]
    const dnp1 = d[n+1] ?? [[]]
    // SNF(d_n) => V_n gives new basis for C_n; kernel = last k columns of V_n
    const snf_n = smithNormalForm(dn)
    const rank_n = snf_n.rank
    const dim_n = dims[n] ?? 0
    const k = dim_n - rank_n // nullity

    // transform d_{n+1} into new C_n coords: B = V_n^{-1} * d_{n+1}
    // B has shape (dim_n x dim_{n+1})
    const Vinv = snf_n.Vinv
    const B: ZMatrix = Array.from({ length: dim_n }, (_, i) =>
      Array.from({ length: dnp1[0]?.length ?? 0 }, (_, j) =>
        (i < Vinv.length && j < (dnp1[0]?.length ?? 0))
          ? Vinv[i]!.reduce((acc, v, t) => acc + v * (dnp1[t]?.[j] ?? 0), 0)
          : 0
      )
    )

    // restrict to kernel rows (bottom k rows)
    const K: ZMatrix = B.slice(rank_n, dim_n)

    const snfK = smithNormalForm(K)
    const freeRank = k - snfK.rank  // should match β_n over Q
    const torsion = snfK.diag.filter(x => Math.abs(x) > 1).map(x => Math.abs(x))
    return { n, freeRank, torsion }
  }

// =====================================================================
// Public, discoverable API
// =====================================================================

/**
 * Build an augmented chain complex from the Pair comonad simplicial object.
 * @param Es  finite environment values E
 * @param As  finite "points" A
 * @param maxN maximum n-level to build (C_0..C_maxN, and ε : C_0→Z[A])
 * @returns { dims, d }  dimensions and integer boundary matrices (∂_n: C_n→C_{n-1})
 * @example
 *   const { dims, d } = toChainComplexPair(['L','R'], ['•'], 3)
 *   const H1 = homologyZ_fromBoundaries(dims, d, 1)  // { freeRank:0, torsion:[] }
 */
export const toChainComplexPair = <E, A>(
  Es: ReadonlyArray<E>, As: ReadonlyArray<A>, maxN: number
) => buildBoundariesForPair(Es, As, maxN)

/**
 * Compute **integer homology** H_n for the Pair complex.
 * @returns { freeRank, torsion } so H_n ≅ Z^{freeRank} ⊕ ⊕ Z/torsion[i]Z
 */
export const homologyZ_Pair = <E, A>(
  Es: ReadonlyArray<E>, As: ReadonlyArray<A>, maxN: number, n: number
) => {
  const { dims, d } = buildBoundariesForPair(Es, As, maxN)
  return homologyZ_fromBoundaries(dims, d, n)
}

/**
 * Build an augmented chain complex from the Store comonad simplicial object.
 * @param Svals finite state space S
 * @param Avals finite "points" A
 * @param maxN maximum n-level to build
 * @returns { dims, d } dimensions and boundary matrices
 */
export const toChainComplexStore = <S, A>(
  Svals: ReadonlyArray<S>, Avals: ReadonlyArray<A>, maxN: number
) => buildBoundariesForStore(Svals, Avals, maxN)

/**
 * Compute **integer homology** H_n for the Store complex.
 * @returns { freeRank, torsion } so H_n ≅ Z^{freeRank} ⊕ ⊕ Z/torsion[i]Z
 */
export const homologyZ_Store = <S, A>(
  Svals: ReadonlyArray<S>, Avals: ReadonlyArray<A>, maxN: number, n: number
) => {
  const { dims, d } = buildBoundariesForStore(Svals, Avals, maxN)
  return homologyZ_fromBoundaries(dims, d, n)
}

// =====================================================================
// Chain complex from the simplicial object of Store<S,_> (finite S)
//   X_n = W^{n+1}A with W = Store<S,_>. We enumerate finite Stores by
//   tabulating peek over Svals and recursing.
// =====================================================================

// materialize every Store<S,*> into a FiniteStore by tabulating over Svals
const isStoreLike = (u: unknown): u is { pos: unknown; peek: (s: unknown) => unknown } => {
  if (!u || typeof u !== 'object') return false
  const candidate = u as { pos?: unknown; peek?: unknown }
  return 'pos' in candidate && typeof candidate.peek === 'function'
}

const materializeStoreDeep = <S>(Svals: ReadonlyArray<S>, w: unknown): unknown => {
  if (!isStoreLike(w)) return w
  const store = w as FiniteStore<S, unknown>
  const table = Svals.map((s) => [s, materializeStoreDeep(Svals, store.peek(s))] as const)
  const peek = (s: S) => table[Svals.indexOf(s)]![1]
  return { pos: store.pos, peek, table } as const
}

// stable key for (possibly nested) FiniteStore; ignores function identity
const keyFiniteStoreDeep = <S>(Svals: ReadonlyArray<S>, v: unknown): string => {
  if (!isStoreLike(v)) return JSON.stringify(['A', v])
  const store = v as FiniteStore<S, unknown>
  const tab = Svals.map((s) => {
    const child = store.peek(s)
    return [Svals.indexOf(s), keyFiniteStoreDeep(Svals, materializeStoreDeep(Svals, child))] as const
  })
  return JSON.stringify(['W', Svals.indexOf(store.pos), tab])
}

export const buildBoundariesForStore =
  <S, A>(Svals: ReadonlyArray<S>, Avals: ReadonlyArray<A>, maxN: number) => {
    const W = StoreComonad<S>()
    const Smp = makeSimplicialFromComonadK1(W)

    // X_n = enumeratePowStore(Svals, n, Avals)  (returns W^{n+1}A)
    const X: unknown[][] = []
    const idx: Map<string, number>[] = []
    for (let n = 0; n <= maxN; n++) {
      const layer = enumeratePowStore(Svals, n, Avals)
        .map(w => materializeStoreDeep(Svals, w))
      X[n] = layer
      const m = new Map<string, number>()
      layer.forEach((el, i) => m.set(keyFiniteStoreDeep(Svals, el), i))
      idx[n] = m
    }

    // boundaries d_n : C_n -> C_{n-1}
    const d: ZMatrix[] = []

    // n = 0 (augmentation): ε = extract : Store<S,A> -> A
    {
      const rows = Avals.length
      const cols = X[0]!.length
      const M: ZMatrix = Array.from({ length: rows }, () => Array(cols).fill(0))
      X[0]!.forEach((w0, j) => {
        if (!isStoreLike(w0)) {
          throw new Error('Expected store-like value in materialized Store boundary')
        }
        const store = w0 as Store<S, A>
        const a = store.peek(store.pos)
        const i = Avals.findIndex((aa) => Object.is(aa, a))
        M[i]![j] = 1
      })
      d[0] = M
    }

    // n >= 1: ∂_n = Σ_i (-1)^i d_i
    for (let n = 1; n <= maxN; n++) {
      const rows = X[n - 1]!.length
      const cols = X[n]!.length
      const M: ZMatrix = Array.from({ length: rows }, () => Array(cols).fill(0))
      for (let j = 0; j < cols; j++) {
        const simplex = X[n]![j]
        for (let i = 0; i <= n; i++) {
          const face = materializeStoreDeep(Svals, Smp.d(n, i).app(simplex))
          const r = idx[n - 1]!.get(keyFiniteStoreDeep(Svals, face))
          if (r == null) throw new Error(`Store face not found at n=${n}, i=${i}`)
          M[r]![j]! += (i % 2 === 0 ? 1 : -1)
        }
      }
      d[n] = M
    }

    const dims = X.map(xs => xs.length)
    return { dims, d }
  }

// ===============================================================
// Store<S, A> comonad  (aka "indexed context")
//   Intuition: a focus `pos : S` and a total observation `peek : S -> A`.
//   Functor maps *results* (post-compose peek), comonad can:
//     - extract: read A at the current position
//     - duplicate: reindex so every S-point gets its own focused Store
//     - extend: compute B from neighborhoods (co-Kleisli lift)
// ===============================================================
export type Store<S, A> = {
  readonly pos: S
  readonly peek: (s: S) => A
}

export const Store = Symbol.for('Store')

// Endofunctor instance for Store<S,_>
export const StoreEndo =
  <S>(): EndofunctorK1<['Store', S]> => ({
    map:
      <A, B>(f: (a: A) => B) =>
      (w: Store<S, A>): Store<S, B> => ({
        pos: w.pos,
        peek: (s: S) => f(w.peek(s)),
      })
  })

// Comonad instance
export const StoreComonad =
  <S>(): ComonadK1<['Store', S]> => {
    const F = StoreEndo<S>()
    return {
      ...F,
      extract: <A>(w: Store<S, A>): A => w.peek(w.pos),
      duplicate: <A>(w: Store<S, A>): Store<S, Store<S, A>> => ({
        pos: w.pos,
        peek: (s: S) => ({ pos: s, peek: w.peek }),
      }),
      extend:
        <A, B>(f: (w: Store<S, A>) => B) =>
        (w: Store<S, A>): Store<S, B> => ({
          pos: w.pos,
          peek: (s: S) => f({ pos: s, peek: w.peek }),
        }),
    }
  }

export const StoreC = StoreComonad

// Handy helpers
export const seek =
  <S>(s: S) =>
  <A>(w: Store<S, A>): Store<S, A> =>
    ({ pos: s, peek: w.peek })

export const peeks =
  <S>(k: (s: S) => S) =>
  <A>(w: Store<S, A>): Store<S, A> =>
    ({ pos: w.pos, peek: (s: S) => w.peek(k(s)) })

// Build a Store from an array (indexing with clamp)
export const storeFromArray =
  <A>(xs: ReadonlyArray<A>, start = 0): Store<number, A> => {
    const n = xs.length
    if (n === 0) throw new Error('storeFromArray: empty array')
    const clamp = (i: number) => (i < 0 ? 0 : i >= n ? n - 1 : i)
    return {
      pos: clamp(start),
      peek: (i: number) => xs[clamp(i)]!,
    }
  }

// Collect a Store<number, A> into an array snapshot of length n
export const collectStore =
  <A>(n: number) =>
  (w: Store<number, A>): ReadonlyArray<A> =>
    Array.from({ length: n }, (_, i) => seek<number>(i)(w).peek(i))

// ===============================================================
// Mixed distributive law instances
// ===============================================================

// Result<E,_> × Store<S,_> given a default s0 : S
export const MixedDist_Result_Store =
  <S, E>(s0: S) => ({
    dist:
      <A>(tga: Result<E, Store<S, A>>): Store<S, Result<E, A>> =>
        isOk(tga)
          ? { pos: tga.value.pos,
              peek: (s: S) => Ok(tga.value.peek(s)) }
          : { pos: s0,
              peek: (_s: S) => Err((tga as Err<E>).error) }
  })

// Task × Store<S,_> (lawful under standard Promise/Task laws)
export const MixedDist_Task_Store =
  <S>() => ({
    dist:
      <A>(tga: Task<Store<S, A>>): Store<S, Task<A>> => ({
        pos: undefined as unknown as S, // keep pos after the Task resolves
        peek: (s: S) => () => tga().then(w => w.peek(s)),
      })
  })

// =====================================================================
// Finite enumeration for Store<S,_> layers when S and A are finite
//   W(A) = { pos:S, peek:S->A }  (we encode peek as a table over Svals)
//   W^{k+1} A is built recursively: tables map S -> W^{k} A.
// Warning: combinatorial — keep |S| and |A| tiny in tests/examples.
// =====================================================================
export type FiniteStore<S, A> = Store<S, A> & { table: ReadonlyArray<readonly [S, A]> }

const enumerateFunctions = <S, X>(Svals: ReadonlyArray<S>, Xvals: ReadonlyArray<X>): ReadonlyArray<ReadonlyArray<X>> => {
  // all |S|-tuples over Xvals in Svals order
  const res: X[][] = [[]]
  for (let _ of Svals) {
    const next: X[][] = []
    for (const t of res) for (const x of Xvals) next.push([...t, x])
    res.splice(0, res.length, ...next)
  }
  return res
}

export const enumeratePowStore =
  <S, A>(Svals: ReadonlyArray<S>, k: number, Avals: ReadonlyArray<A>): ReadonlyArray<FiniteStore<S, unknown>> => {
    // base X0 = A
    let layer: ReadonlyArray<unknown> = Avals.slice()
    for (let depth = 0; depth < k + 1; depth++) {
      // build W(layer) from current layer
      const funs = enumerateFunctions(Svals, layer) // tables S->layer
      const next: FiniteStore<S, unknown>[] = []
      for (const tbl of funs) {
        for (const pos of Svals) {
          const table = Svals.map((s, i) => [s, tbl[i]] as const)
          const peek = (s: S) => table[Svals.indexOf(s)]![1]
          next.push({ pos, peek, table })
        }
      }
      layer = next
    }
    return layer as ReadonlyArray<FiniteStore<S, unknown>>
  }

// ===============================================================
// Co-Kleisli usage: 3-point moving average over a numeric array
//   We "extend" a local computation over the whole Store: each index
//   gets the average of (i-1, i, i+1), clamped at edges.
// ===============================================================
export const movingAvg3 =
  (w: Store<number, number>): Store<number, number> => {
    const WC = StoreComonad<number>()
    const avg = (ctx: Store<number, number>): number => {
      const i = ctx.pos
      const a = ctx.peek(i - 1)
      const b = ctx.peek(i)
      const c = ctx.peek(i + 1)
      return (a + b + c) / 3
    }
    return WC.extend(avg)(w)
  }

// ===============================================================
// Store + Lens integration: focus on nested fields
//   Run comonadic computations over a nested field without rebuilding
//   the entire structure. Perfect FP + optics + comonad trifecta!
// ===============================================================

// Note: Using existing Lens type from line 6086

// Focus a Store through a lens: Store<S, T> -> Lens<T, A> -> Store<S, A>
export const focusStoreWithLens =
  <S, T, A>(lens: Lens<T, A>) =>
  (store: Store<S, T>): Store<S, A> => ({
    pos: store.pos,
    peek: (s: S) => lens.get(store.peek(s))
  })

// Run a comonadic computation on a focused field, then set it back
export const extendThroughLens =
  <S, T, A>(lens: Lens<T, A>) =>
  (computation: (ctx: Store<S, A>) => A) =>
  (store: Store<S, T>): Store<S, T> => {
    const WC = StoreComonad<S>()
    const focused: Store<S, A> = focusStoreWithLens<S, T, A>(lens)(store)
    const computed: Store<S, A> = WC.extend(computation)(focused)

    return {
      pos: store.pos,
      peek: (s: S) => {
        const originalT = store.peek(s)
        const newA = computed.peek(s)
        return lens.set(newA)(originalT)
      }
    }
  }

// Example: moving average on a nested field (specialized for number indices)
export const movingAvgOnField =
  <T>(lens: Lens<T, number>) =>
  (store: Store<number, T>): Store<number, T> =>
    extendThroughLens<number, T, number>(lens)((ctx) => {
      const i = ctx.pos
      const a = ctx.peek(i - 1)
      const b = ctx.peek(i)
      const c = ctx.peek(i + 1)
      return (a + b + c) / 3
    })(store)

// ==================== Env (product) comonad ====================
// A context value E carried along with A
// Note: Using earlier Env type definition from line 486

type EnvOps<E> = {
  readonly ask: <A>(ea: Env<E, A>) => E
  readonly asks: <B>(f: (e: E) => B) => <A>(ea: Env<E, A>) => B
  readonly local: (f: (e: E) => E) => <A>(ea: Env<E, A>) => Env<E, A>
}

export const EnvExtras = <E>(): EnvOps<E> => ({
  ask:  <A>(ea: Env<E, A>): E => ea[0],
  asks: <B>(f: (e: E) => B) => <A>(ea: Env<E, A>): B => f(ea[0]),
  local: (f: (e: E) => E) => <A>(ea: Env<E, A>): Env<E, A> => [f(ea[0]), ea[1]] as const,
})

export const EnvC = <E>(): ComonadK1<['Env', E]> & EnvOps<E> => {
  const extras = EnvExtras<E>()

  return {
    map:
      <A, B>(f: (a: A) => B) =>
      (ea: Env<E, A>): Env<E, B> =>
        [ea[0], f(ea[1])] as const,

    extract:
      <A>(ea: Env<E, A>): A =>
        ea[1],

    extend:
      <A, B>(f: (w: Env<E, A>) => B) =>
      (ea: Env<E, A>): Env<E, B> =>
        [ea[0], f(ea)] as const,

    duplicate:
      <A>(ea: Env<E, A>): Env<E, Env<E, A>> =>
        [ea[0], ea] as const,

    ...extras,
  }
}

// ==================== Traced comonad ====================
// Traced<M,A> ~ (m: M) => A, with monoid M
export type Traced<M, A> = (m: M) => A

export interface Monoid<A> { empty: A; concat: (x: A, y: A) => A }

export const TracedC = <M>(M: Monoid<M>) => ({
  map:
    <A, B>(f: (a: A) => B) =>
    (ta: Traced<M, A>): Traced<M, B> =>
      (m) => f(ta(m)),

  extract:
    <A>(ta: Traced<M, A>): A =>
      ta(M.empty),

  extend:
    <A, B>(f: (w: Traced<M, A>) => B) =>
    (ta: Traced<M, A>): Traced<M, B> =>
      (m) => f((m2: M) => ta(M.concat(m, m2))),

  // extras
  trace:
    <A>(ta: Traced<M, A>) => (m: M): A => ta(m),
})

// ==================== CoKleisli category helpers ====================
// For every comonad W, arrows A ==> B are W<A> -> B
// Composition:   (g ⧑ f)(wa) = g(extend(f)(wa))
// Identity:      extract
export const coKleisli = <F>(W: ComonadK1<F>) => ({
  id:
    <A>() =>
    (wa: EndofunctorValue<F, A>): A =>
      W.extract(wa),
  comp:
    <A, B, C>(g: (wb: EndofunctorValue<F, B>) => C, f: (wa: EndofunctorValue<F, A>) => B) =>
    (wa: EndofunctorValue<F, A>): C =>
      g(W.extend(f)(wa)),
})

// ================= Cofree over a FunctorK1 =================
// Assumes your HKT aliases: Kind1 and FunctorK1<F> { map }

/**
 * Cofree tree with an explicit trampoline-backed API.
 *
 * The accompanying {@link CofreeK1} factory uses an iterative evaluation
 * strategy so that all exported combinators remain stack-safe on large or
 * deeply nested structures.
 */
export type Cofree<F extends HKId1, A> = {
  readonly head: A
  readonly tail: HKKind1<F, Cofree<F, A>>
}

export const CofreeK1 = <F extends HKId1>(F: FunctorK1<F>) => {
  const makeEnumerator =
    <Id extends HKId1>(Functor: FunctorK1<Id>) =>
    <X>(fx: HKKind1<Id, X>) => {
      const elements: X[] = []
      const template = Functor.map((value: X) => {
        const index = elements.length
        elements.push(value)
        return index
      })(fx)
      return { template, elements }
    }

  const makeRebuilder =
    <Id extends HKId1>(Functor: FunctorK1<Id>) =>
    <X>(template: HKKind1<Id, number>, values: ReadonlyArray<X | undefined>, context: string) =>
      Functor.map((index: number) => {
        const value = values[index]
        if (value === undefined) {
          throw new Error(`${context}: missing value for index ${index}`)
        }
        return value
      })(template)

  const enumerateF = makeEnumerator(F)
  const rebuildF = makeRebuilder(F)

  const map =
    <A, B>(f: (a: A) => B) =>
    (root: Cofree<F, A>): Cofree<F, B> => {
      type Frame =
        | { readonly phase: 'Enter'; readonly node: Cofree<F, A>; readonly cont: (value: Cofree<F, B>) => void }
        | {
            readonly phase: 'Rebuild'
            readonly head: B
            readonly template: HKKind1<F, number>
            readonly cont: (value: Cofree<F, B>) => void
            readonly children: Array<Cofree<F, B> | undefined>
          }

      const stack: Frame[] = []
      let output: Cofree<F, B> | undefined

      stack.push({
        phase: 'Enter',
        node: root,
        cont: (value) => {
          output = value
        },
      })

      while (stack.length > 0) {
        const frame = stack.pop()!
        if (frame.phase === 'Enter') {
          const { node, cont } = frame
          const head = f(node.head)
          const { template, elements } = enumerateF(node.tail)
          const children: Array<Cofree<F, B> | undefined> = new Array(elements.length)
          stack.push({ phase: 'Rebuild', head, template, cont, children })
          for (let i = elements.length - 1; i >= 0; i--) {
            const index = i
            const child = elements[i]!
            stack.push({
              phase: 'Enter',
              node: child,
              cont: (value) => {
                children[index] = value
              },
            })
          }
        } else {
          const { head, template, children, cont } = frame
          const tail = rebuildF(template, children, 'Cofree.map')
          cont({ head, tail })
        }
      }

      if (output === undefined) {
        throw new Error('Cofree.map: no result produced')
      }
      return output
    }

  const extract =
    <A>(w: Cofree<F, A>): A =>
      w.head

  const extend =
    <A, B>(g: (w: Cofree<F, A>) => B) =>
    (root: Cofree<F, A>): Cofree<F, B> => {
      type Frame =
        | { readonly phase: 'Enter'; readonly node: Cofree<F, A>; readonly cont: (value: Cofree<F, B>) => void }
        | {
            readonly phase: 'Rebuild'
            readonly head: B
            readonly template: HKKind1<F, number>
            readonly cont: (value: Cofree<F, B>) => void
            readonly children: Array<Cofree<F, B> | undefined>
          }

      const stack: Frame[] = []
      let output: Cofree<F, B> | undefined

      stack.push({
        phase: 'Enter',
        node: root,
        cont: (value) => {
          output = value
        },
      })

      while (stack.length > 0) {
        const frame = stack.pop()!
        if (frame.phase === 'Enter') {
          const { node, cont } = frame
          const head = g(node)
          const { template, elements } = enumerateF(node.tail)
          const children: Array<Cofree<F, B> | undefined> = new Array(elements.length)
          stack.push({ phase: 'Rebuild', head, template, cont, children })
          for (let i = elements.length - 1; i >= 0; i--) {
            const index = i
            const child = elements[i]!
            stack.push({
              phase: 'Enter',
              node: child,
              cont: (value) => {
                children[index] = value
              },
            })
          }
        } else {
          const { head, template, children, cont } = frame
          const tail = rebuildF(template, children, 'Cofree.extend')
          cont({ head, tail })
        }
      }

      if (output === undefined) {
        throw new Error('Cofree.extend: no result produced')
      }
      return output
    }

  const duplicate = <A>(w: Cofree<F, A>): Cofree<F, Cofree<F, A>> =>
    extend<A, Cofree<F, A>>((x) => x)(w)

  const unfold =
    <S, A>(psi: (s: S) => readonly [A, HKKind1<F, S>]) =>
    (seed: S): Cofree<F, A> => {
      type Frame =
        | { readonly phase: 'Build'; readonly seed: S; readonly cont: (value: Cofree<F, A>) => void }
        | {
            readonly phase: 'Assemble'
            readonly head: A
            readonly template: HKKind1<F, number>
            readonly cont: (value: Cofree<F, A>) => void
            readonly children: Array<Cofree<F, A> | undefined>
          }

      const stack: Frame[] = []
      let output: Cofree<F, A> | undefined

      stack.push({
        phase: 'Build',
        seed,
        cont: (value) => {
          output = value
        },
      })

      while (stack.length > 0) {
        const frame = stack.pop()!
        if (frame.phase === 'Build') {
          const { seed: current, cont } = frame
          const [head, nextSeeds] = psi(current)
          const { template, elements } = enumerateF(nextSeeds)
          const children: Array<Cofree<F, A> | undefined> = new Array(elements.length)
          stack.push({ phase: 'Assemble', head, template, cont, children })
          for (let i = elements.length - 1; i >= 0; i--) {
            const index = i
            const nextSeed = elements[i]!
            stack.push({
              phase: 'Build',
              seed: nextSeed,
              cont: (value) => {
                children[index] = value
              },
            })
          }
        } else {
          const { head, template, children, cont } = frame
          const tail = rebuildF(template, children, 'Cofree.unfold')
          cont({ head, tail })
        }
      }

      if (output === undefined) {
        throw new Error('Cofree.unfold: no result produced')
      }
      return output
    }

  const cata =
    <A, B>(phi: (fb: HKKind1<F, B>) => B, h: (a: A, b: B) => B) =>
    (root: Cofree<F, A>): B => {
      type Frame =
        | { readonly phase: 'Enter'; readonly node: Cofree<F, A>; readonly cont: (value: B) => void }
        | {
            readonly phase: 'Fold'
            readonly node: Cofree<F, A>
            readonly template: HKKind1<F, number>
            readonly cont: (value: B) => void
            readonly children: Array<B | undefined>
          }

      const stack: Frame[] = []
      let output: B | undefined

      stack.push({
        phase: 'Enter',
        node: root,
        cont: (value) => {
          output = value
        },
      })

      while (stack.length > 0) {
        const frame = stack.pop()!
        if (frame.phase === 'Enter') {
          const { node, cont } = frame
          const { template, elements } = enumerateF(node.tail)
          const children: Array<B | undefined> = new Array(elements.length)
          stack.push({ phase: 'Fold', node, template, cont, children })
          for (let i = elements.length - 1; i >= 0; i--) {
            const index = i
            const child = elements[i]!
            stack.push({
              phase: 'Enter',
              node: child,
              cont: (value) => {
                children[index] = value
              },
            })
          }
        } else {
          const { node, template, children, cont } = frame
          const foldedTail = phi(rebuildF(template, children, 'Cofree.cata'))
          cont(h(node.head, foldedTail))
        }
      }

      if (output === undefined) {
        throw new Error('Cofree.cata: no result produced')
      }
      return output
    }

  const take =
    (n: number) =>
    <A>(root: Cofree<F, A>): Cofree<F, A> => {
      type Frame =
        | {
            readonly phase: 'Enter'
            readonly node: Cofree<F, A>
            readonly depth: number
            readonly cont: (value: Cofree<F, A>) => void
          }
        | {
            readonly phase: 'Rebuild'
            readonly head: A
            readonly template: HKKind1<F, number>
            readonly cont: (value: Cofree<F, A>) => void
            readonly children: Array<Cofree<F, A> | undefined>
          }

      const stack: Frame[] = []
      let output: Cofree<F, A> | undefined

      stack.push({
        phase: 'Enter',
        node: root,
        depth: n,
        cont: (value) => {
          output = value
        },
      })

      while (stack.length > 0) {
        const frame = stack.pop()!
        if (frame.phase === 'Enter') {
          const { node, depth, cont } = frame
          if (depth <= 0) {
            cont(node)
            continue
          }
          const { template, elements } = enumerateF(node.tail)
          const children: Array<Cofree<F, A> | undefined> = new Array(elements.length)
          stack.push({ phase: 'Rebuild', head: node.head, template, cont, children })
          for (let i = elements.length - 1; i >= 0; i--) {
            const index = i
            const child = elements[i]!
            stack.push({
              phase: 'Enter',
              node: child,
              depth: depth - 1,
              cont: (value) => {
                children[index] = value
              },
            })
          }
        } else {
          const { head, template, children, cont } = frame
          const tail = rebuildF(template, children, 'Cofree.take')
          cont({ head, tail })
        }
      }

      if (output === undefined) {
        throw new Error('Cofree.take: no result produced')
      }
      return output
    }

  const hoist =
    <G extends HKId1>(G: FunctorK1<G>) =>
    (nt: <X>(fx: HKKind1<F, X>) => HKKind1<G, X>) => {
      const enumerateG = makeEnumerator(G)
      const rebuildG = makeRebuilder(G)

      const go = <A>(root: Cofree<F, A>): Cofree<G, A> => {
        type Frame =
          | { readonly phase: 'Enter'; readonly node: Cofree<F, A>; readonly cont: (value: Cofree<G, A>) => void }
          | {
              readonly phase: 'Rebuild'
              readonly head: A
              readonly template: HKKind1<G, number>
              readonly cont: (value: Cofree<G, A>) => void
              readonly children: Array<Cofree<G, A> | undefined>
            }

        const stack: Frame[] = []
        let output: Cofree<G, A> | undefined

        stack.push({
          phase: 'Enter',
          node: root,
          cont: (value) => {
            output = value
          },
        })

        while (stack.length > 0) {
          const frame = stack.pop()!
          if (frame.phase === 'Enter') {
            const { node, cont } = frame
            const convertedTail = nt(node.tail)
            const { template, elements } = enumerateG(convertedTail)
            const children: Array<Cofree<G, A> | undefined> = new Array(elements.length)
            stack.push({ phase: 'Rebuild', head: node.head, template, cont, children })
            for (let i = elements.length - 1; i >= 0; i--) {
              const index = i
              const child = elements[i]!
              stack.push({
                phase: 'Enter',
                node: child,
                cont: (value) => {
                  children[index] = value
                },
              })
            }
          } else {
            const { head, template, children, cont } = frame
            const tail = rebuildG(template, children, 'Cofree.hoist')
            cont({ head, tail })
          }
        }

        if (output === undefined) {
          throw new Error('Cofree.hoist: no result produced')
        }
        return output
      }

      return go
    }

  return { map, extract, extend, duplicate, unfold, cata, take, hoist }
}

// ================= Store × Lens helpers =================
// Given your Lens<S, T> = { get: (s:S)=>T; set: (t:T)=>(s:S)=>S }
// and Store<S, A> = { peek: (s:S)=>A; pos: S }

export const StoreLens = {
  /** Focus a Store<S, A> down to the sub-position T via a lens. */
  focus:
    <S, T>(ln: Lens<S, T>) =>
    <A>(sa: Store<S, A>): Store<T, A> => ({
      peek: (t: T) => sa.peek(ln.set(t)(sa.pos)),
      pos: ln.get(sa.pos),
    }),

  /** Move along the lens: replace the sub-position T at the current S. */
  move:
    <S, T>(ln: Lens<S, T>) =>
    (t: T) =>
    <A>(sa: Store<S, A>): Store<S, A> =>
      ({ peek: sa.peek, pos: ln.set(t)(sa.pos) }),

  /** Transform the sub-position by a function T->T at current focus. */
  seeks:
    <S, T>(ln: Lens<S, T>) =>
    (k: (t: T) => T) =>
    <A>(sa: Store<S, A>): Store<S, A> =>
      ({ peek: sa.peek, pos: ln.set(k(ln.get(sa.pos)))(sa.pos) }),

  /** Peek at the A you'd get if the sub-position were set to a given T. */
  peekSub:
    <S, T>(ln: Lens<S, T>) =>
    (t: T) =>
    <A>(sa: Store<S, A>): A =>
      sa.peek(ln.set(t)(sa.pos)),

  /** Experiment: sample many sub-positions and collect their A's. */
  experiment:
    <S, T>(ln: Lens<S, T>) =>
    (alts: (t: T) => ReadonlyArray<T>) =>
    <A>(sa: Store<S, A>): ReadonlyArray<A> => {
      const t0 = ln.get(sa.pos)
      return alts(t0).map((t) => sa.peek(ln.set(t)(sa.pos)))
    },
}

// ================ Co-Do builder for each ComonadK1 =================

export type CoBuilder<F, A0, A> = {
  /** co-Kleisli composition: then(g) = g ⧑ current */
  then: <B>(g: (wb: EndofunctorValue<F, A>) => B) => CoBuilder<F, A0, B>
  /** post-map the final result */
  map:  <B>(f: (a: A) => B) => CoBuilder<F, A0, B>
  /** side-effect on the final result (keeps A) */
  tap:  (f: (a: A) => void) => CoBuilder<F, A0, A>
  /** finish: the composed arrow F<A0> -> A */
  done: (wa: EndofunctorValue<F, A0>) => A
}

export const DoCo = <F>(W: ComonadK1<F>) => {
  const Co = coKleisli(W)

  type Arrow<A0, A> = (wa: EndofunctorValue<F, A0>) => A

  const make = <A0, A>(arrow: Arrow<A0, A>): CoBuilder<F, A0, A> => ({
    then: (g) => make(Co.comp(g, arrow)),
    map:  (f) => make((wa) => f(arrow(wa))),
    tap:  (f) => make((wa) => { const a = arrow(wa); f(a); return a }),
    done: arrow,
  })

  return {
    /** Start a pipeline: identity co-Kleisli arrow (extract). */
    start: <A>() => make<A, A>(Co.id<A>()),
  }
}

// ================= Cofree over ExprF with annotations =================
// Assumes you have FunctorK1<'ExprF'> and CofreeK1 already available

// ---------- helpers: enumerate children for ExprF ----------
type CofreeExpr<A> = Cofree<'ExprF', A>
type ExprKids<A> = ExprF<CofreeExpr<A>>

const childrenExprF = <A>(fa: ExprKids<A>): ReadonlyArray<CofreeExpr<A>> => {
  switch (fa._tag) {
    case 'Lit':
    case 'Var':
      return []
    case 'Neg':
    case 'Abs':
      return [fa.value]
    case 'Add':
    case 'Mul':
    case 'Div':
      return [fa.left, fa.right]
    case 'Pow':
      return [fa.base, fa.exp]
    case 'AddN':
    case 'MulN':
      return fa.items
    case 'Let':
      return [fa.value, fa.body]
    default:
      return _exhaustive(fa)
  }
}

// ---------- build Cofree tree from your Fix1<'ExprF'> ----------
export const toCofreeExpr =
  (ExprFK: FunctorK1<'ExprF'>) =>
  (t: Fix1<'ExprF'>): CofreeExpr<void> => {
    const CF = CofreeK1(ExprFK)
    return CF.unfold<Fix1<'ExprF'>, void>((node) => [undefined, node.un])(t)
  }

// ---------- annotate with {size, depth} using extend ----------
export type ExprAnn = { readonly size: number; readonly depth: number }

export const annotateExprSizeDepth =
  (ExprFK: FunctorK1<'ExprF'>) =>
  (w0: CofreeExpr<void>): CofreeExpr<ExprAnn> => {
    const CF = CofreeK1(ExprFK)
    function ann(w: CofreeExpr<void>): ExprAnn {
      const ks = childrenExprF(w.tail).map(ann)
      const size = 1 + ks.reduce((n, k) => n + k.size, 0)
      const depth = 1 + (ks.length ? Math.max(...ks.map(k => k.depth)) : 0)
      return { size, depth }
    }
    return CF.extend(ann)(w0)
  }

// ================= Cofree Zipper for ExprF =================
// Minimal, focused on Lit | Add | Mul. Add frames for whichever extra constructors you have.

// ---------- Zipper over Cofree<'ExprF',A> ----------
type FrameExpr<A> =
  | { _tag: 'AddL'; right: CofreeExpr<A> }
  | { _tag: 'AddR'; left:  CofreeExpr<A> }
  | { _tag: 'MulL'; right: CofreeExpr<A> }
  | { _tag: 'MulR'; left:  CofreeExpr<A> }

export type ZipperExpr<A> = {
  readonly focus: CofreeExpr<A>
  readonly crumbs: ReadonlyArray<FrameExpr<A>>
}

export const ZipperExpr = {
  fromRoot: <A>(root: CofreeExpr<A>): ZipperExpr<A> => ({ focus: root, crumbs: [] }),

  // rebuild a node from a child + a frame
  privateRebuild:
    <A>(child: CofreeExpr<A>, frame: FrameExpr<A>): CofreeExpr<A> => {
      switch (frame._tag) {
        case 'AddL':
          return {
            head: frame.right.head, // keep parent head as-is; you can choose policy
            tail: { _tag: 'Add', left: child, right: frame.right },
          }
        case 'AddR':
          return {
            head: frame.left.head,
            tail: { _tag: 'Add', left: frame.left, right: child },
          }
        case 'MulL':
          return {
            head: frame.right.head,
            tail: { _tag: 'Mul', left: child, right: frame.right },
          }
        case 'MulR':
          return {
            head: frame.left.head,
            tail: { _tag: 'Mul', left: frame.left, right: child },
          }
      }
    },

  // try to go down-left / down-right where applicable
  downLeft: <A>(z: ZipperExpr<A>): ZipperExpr<A> => {
    const tail = z.focus.tail
    switch (tail._tag) {
      case 'Add':
        return { focus: tail.left, crumbs: [{ _tag: 'AddL', right: tail.right }, ...z.crumbs] }
      case 'Mul':
        return { focus: tail.left, crumbs: [{ _tag: 'MulL', right: tail.right }, ...z.crumbs] }
      default:
        return z
    }
  },

  downRight: <A>(z: ZipperExpr<A>): ZipperExpr<A> => {
    const tail = z.focus.tail
    switch (tail._tag) {
      case 'Add':
        return { focus: tail.right, crumbs: [{ _tag: 'AddR', left: tail.left }, ...z.crumbs] }
      case 'Mul':
        return { focus: tail.right, crumbs: [{ _tag: 'MulR', left: tail.left }, ...z.crumbs] }
      default:
        return z
    }
  },

  up: <A>(z: ZipperExpr<A>): ZipperExpr<A> => {
    const [f, ...rest] = z.crumbs
    if (!f) return z
    return { focus: ZipperExpr.privateRebuild(z.focus, f), crumbs: rest }
  },

  // apply function to focus head (annotation/value) only
  mapHead: <A>(f: (a: A) => A) => (z: ZipperExpr<A>): ZipperExpr<A> => ({
    focus: { head: f(z.focus.head), tail: z.focus.tail },
    crumbs: z.crumbs,
  }),

  // replace focus entirely
  replace: <A>(focus: CofreeExpr<A>) => (z: ZipperExpr<A>): ZipperExpr<A> => ({ focus, crumbs: z.crumbs }),

  // rebuild full tree by walking up
  toTree: <A>(z: ZipperExpr<A>): CofreeExpr<A> => {
    let cur = z
    while (cur.crumbs.length) cur = ZipperExpr.up(cur)
    return cur.focus
  },
}

// ============== DoCoBind — record-building Co-Do for each ComonadK1 =============

type _Merge<A, B> = { readonly [K in keyof A | keyof B]:
  K extends keyof B ? B[K] : K extends keyof A ? A[K] : never }

export type DoCoBuilder<F, A0, T> = {
  /** bind: run a co-Kleisli arrow on W<T> and add its result under key K */
  bind: <K extends string, A>(k: K, h: (wT: EndofunctorValue<F, T>) => A)
      => DoCoBuilder<F, A0, _Merge<T, { readonly [P in K]: A }>>
  /** alias */
  apS:  <K extends string, A>(k: K, h: (wT: EndofunctorValue<F, T>) => A)
      => DoCoBuilder<F, A0, _Merge<T, { readonly [P in K]: A }>>
  /** let: add a pure field computed from T */
  let:  <K extends string, A>(k: K, f: (t: T) => A)
      => DoCoBuilder<F, A0, _Merge<T, { readonly [P in K]: A }>>
  /** map final record */
  map:  <B>(f: (t: T) => B) => DoCoBuilder<F, A0, B>
  /** side-effect on final record */
  tap:  (f: (t: T) => void) => DoCoBuilder<F, A0, T>
  /** finish: composed co-Kleisli arrow W<A0> -> T */
  done: (wa: EndofunctorValue<F, A0>) => T
}

export const DoCoBind = <F>(W: ComonadK1<F>) => {
  const make = <A0, T>(arrow: (wa: EndofunctorValue<F, A0>) => T): DoCoBuilder<F, A0, T> => ({
    bind: <K extends string, A>(k: K, h: (wT: EndofunctorValue<F, T>) => A) =>
      make<A0, _Merge<T, { readonly [P in K]: A }>>((wa) => {
        const t  = arrow(wa)                                  // T
        const wT = W.extend<A0, T>(arrow)(wa)                 // W<T>
        const a  = h(wT)
        const next = { ...(t as Record<PropertyKey, unknown>), [k]: a } as _Merge<T, { readonly [P in K]: A }>
        return next
      }),

    apS: <K extends string, A>(k: K, h: (wT: EndofunctorValue<F, T>) => A) =>
      make<A0, _Merge<T, { readonly [P in K]: A }>>((wa) => {
        const t  = arrow(wa)
        const wT = W.extend<A0, T>(arrow)(wa)
        const a  = h(wT)
        const next = { ...(t as Record<PropertyKey, unknown>), [k]: a } as _Merge<T, { readonly [P in K]: A }>
        return next
      }),

    let: <K extends string, A>(k: K, f: (t: T) => A) =>
      make<A0, _Merge<T, { readonly [P in K]: A }>>((wa) => {
        const t = arrow(wa)
        const value = f(t)
        const next = { ...(t as Record<PropertyKey, unknown>), [k]: value } as _Merge<T, { readonly [P in K]: A }>
        return next
      }),

    map: <B>(f: (t: T) => B) => make<A0, B>((wa) => f(arrow(wa))),

    tap: (f) => make<A0, T>((wa) => {
      const t = arrow(wa); f(t); return t
    }),

    done: arrow,
  })

  return {
    /** start with empty record {} */
    startEmpty: <A0>() => make<A0, {}>((_) => ({} as const)),
    /** start from an initial projection */
    startWith:  <A0, T>(init: (wa: EndofunctorValue<F, A0>) => T) => make<A0, T>(init),
  }
}

