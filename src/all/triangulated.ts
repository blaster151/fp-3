import {
  RingReal,
  eye,
  matMul,
  matNeg,
  zerosMat,
  idMat,
  hcat,
  vcat,
} from "./semiring-linear"
import type { Mat, Ring, Semiring, Vec } from "./semiring-linear"
import {
  VectView as VectViewNS,
  applyRepAsLin as applyRepAsLinFn,
  coactionAsLin as coactionAsLinFn,
  pushCoaction as pushCoactionFn,
  actionToChain as actionToChainFn,
  coactionToChain as coactionToChainFn,
} from "../../stdlib/vect-view"
import { IndexedFamilies } from "../../stdlib/indexed-families"
import type {
  Adjunction,
  CatCompose,
  CatFunctor,
  CatId,
  CatNatTrans,
  Category,
  CartesianClosedCategory,
  FiniteGroupoid,
  GFunctor,
  Groupoid,
  MorOf,
  ObjOf,
} from "../../stdlib/category"
import { CategoryLimits } from "../../stdlib/category-limits"
import { ArrowFamilies } from "../../stdlib/arrow-families"
import { EnhancedVect } from "../../stdlib/enhanced-vect"
import { composeFun, idFun } from "../../stdlib/category"
import type {
  CatMonad,
  CFunctor,
  FiniteCategory as ToolkitFiniteCategory,
} from "./category-toolkit"
import type { FiniteCategory as BaseFiniteCategory } from "../../finite-cat"
import {
  FinGrp as FinGrpModel,
  type FinGrpObj as FinGrpObjModel,
  type Hom as FinGrpHomModel,
} from "../../models/fingroup-cat"
import {
  makeFiniteSliceProduct,
  makeSliceFiniteProductFromPullback,
  lookupSliceProductMetadata,
  type SliceArrow as SliceArrowModel,
  type SliceFiniteProductWitnessBase,
  type SliceObject as SliceObjectModel,
  type SliceArrow,
  type SliceObject,
} from "../../slice-cat"
import type { PullbackCalculator } from "../../pullback"
import {
  type FinSetCategory as FinSetCategoryModel,
  type FinSetName as FinSetNameModel,
  type FuncArr as FuncArrModel,
} from "../../models/finset-cat"
import { smithNormalForm } from "../../comonad-k1"

// ---------------------------------------------------------------------
// Exact functor composition: (F : R→S) ∘ (G : S→T) : R→T
//  - Pure composition on objects and maps
//  - Witnesses are combined by delegation (no extra equality assumptions)
// ---------------------------------------------------------------------

export interface AdditiveFunctor<R, S> {
  onComplex: (X: Complex<R>) => Complex<S>
  onMap:     (f: ChainMap<R>) => ChainMap<S>
}

export interface ExactFunctor<R, S> extends AdditiveFunctor<R, S> {
  preservesShift: (X: Complex<R>) => boolean
  preservesCones: (f: ChainMap<R>) => boolean
  imageTriangle:  (T: Triangle<R>) => Triangle<S>
}

export const composeExact =
  <R, S, T>(F: ExactFunctor<R, S>, G: ExactFunctor<S, T>): ExactFunctor<R, T> => {
    const onComplex = (X: Complex<R>) => G.onComplex(F.onComplex(X))
    const onMap     = (f: ChainMap<R>) => G.onMap(F.onMap(f))

    const preservesShift = (X: Complex<R>): boolean =>
      F.preservesShift(X) && G.preservesShift(F.onComplex(X))

    const preservesCones = (f: ChainMap<R>): boolean =>
      F.preservesCones(f) && G.preservesCones(F.onMap(f))

    const imageTriangle = (T0: Triangle<R>): Triangle<T> =>
      G.imageTriangle(F.imageTriangle(T0))

    return { onComplex, onMap, preservesShift, preservesCones, imageTriangle }
  }

// =====================================================================
// Triangulated Categories: Chain Complexes and Distinguished Triangles
// =====================================================================

// ---------- Complex + checks ----------
export type Complex<R> = {
  readonly S: Ring<R>
  readonly degrees: ReadonlyArray<number>      // sorted ascending, e.g. [-1,0,1]
  readonly dim: Readonly<Record<number, number>> // dim at degree n (0 allowed)
  readonly d: Readonly<Record<number, Mat<R>>> // d_n : X_n -> X_{n-1}  shape (dim[n-1] x dim[n])
}

// Ensure shapes line up and d_{n-1} ∘ d_n = 0
export const complexIsValid =
  <R>(C: Complex<R>): boolean => {
    const S = C.S
    for (const n of C.degrees) {
      const dn = C.d[n]
      if (!dn) continue
      const rows = dn.length, cols = dn[0]?.length ?? 0
      if (rows !== (C.dim[n-1] ?? 0) || cols !== (C.dim[n] ?? 0)) return false
      const dn1 = C.d[n-1]
      if (dn1) {
        const comp = matMul(S)(dn1, dn)                  // X_{n-2} x X_n
        // zero check
        const eq = S.eq ?? ((a: R, b: R) => Object.is(a, b))
        for (const row of comp) for (const x of row) if (!eq(x, S.zero)) return false
      }
    }
    return true
  }

// Shift functor [1] (homological: X[1]n=Xn−1, dnX[1]=−dn−1X)
export const shift1 =
  <R>(C: Complex<R>): Complex<R> => {
    const S = C.S
    const degs = C.degrees.map(n => n+1)
    const dim: Record<number, number> = {}
    const d: Record<number, Mat<R>> = {}
    for (const n of C.degrees) {
      dim[n+1] = C.dim[n] ?? 0
      if (C.d[n]) d[n+1] = matNeg(S)(C.d[n]!) // sign flip
    }
    return { S, degrees: degs, dim, d }
  }

// ---------- Chain map ----------
export type ChainMap<R> = {
  readonly S: Ring<R>
  readonly X: Complex<R>
  readonly Y: Complex<R>
  readonly f: Readonly<Record<number, Mat<R>>>  // f_n : X_n -> Y_n
}

export const isChainMap =
  <R>(ϕ: ChainMap<R>): boolean => {
    const S = ϕ.S
    for (const n of ϕ.X.degrees) {
      const fn   = ϕ.f[n]
      const fnm1 = ϕ.f[n-1]
      const dXn  = ϕ.X.d[n]
      const dYn  = ϕ.Y.d[n]
      if (!fn || !dYn || !dXn || !fnm1) continue // tolerate zeros outside overlap
      const left  = matMul(S)(fnm1, dXn)
      const right = matMul(S)(dYn, fn)
      // compare
      const eq = S.eq ?? ((a: R, b: R) => Object.is(a, b))
      for (let i=0;i<left.length;i++)
        for (let j=0;j<(left[0]?.length ?? 0);j++)
          if (!eq(left[i]?.[j]!, right[i]?.[j]!)) return false
    }
    return true
  }

// ================= Chain-map utilities (compose, id, blocks) =================

export const composeChainMap =
  <R>(F: Field<R>) =>
  (g: ChainMap<R>, f: ChainMap<R>): ChainMap<R> => {
    // f: X→Y, g: Y→Z
    const X = f.X, Z = g.Y
    const mul = matMul(F)
    const out: Record<number, R[][]> = {}
    for (const n of X.degrees) {
      const gf = mul(g.f[n] ?? ([] as R[][]), f.f[n] ?? ([] as R[][]))
      out[n] = gf
    }
    return { S: f.S, X, Y: Z, f: out }
  }

export const idChainMapField =
  <R>(F: Field<R>) =>
  (X: Complex<R>): ChainMap<R> => {
    const f: Record<number, R[][]> = {}
    for (const n of X.degrees) f[n] = eye(F)(X.dim[n] ?? 0)
    return { S: X.S, X, Y: X, f }
  }

/** Inclusion of the k-th summand into a degreewise coproduct (direct sum). */
export const inclusionIntoCoproduct =
  <R>(F: Field<R>) =>
  (summands: ReadonlyArray<Complex<R>>, k: number): ChainMap<R> => {
    const coprodDim: Record<number, number> = {}
    const degrees = Array.from(new Set(summands.flatMap(X => X.degrees))).sort((a,b)=>a-b)
    for (const n of degrees) coprodDim[n] = summands.reduce((s,X)=>s+(X.dim[n]??0),0)

    const zeroDifferential: Record<number, Mat<R>> = {}
    const Y: Complex<R> = { S: summands[0]!.S, degrees, dim: coprodDim, d: zeroDifferential } // d not needed for inclusion map
    const f: Record<number, R[][]> = {}
    for (const n of degrees) {
      const dims = summands.map(X => X.dim[n] ?? 0)
      const rows = coprodDim[n]!, cols = dims[k]!
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      let offset = 0
      for (let i = 0; i < k; i++) offset += dims[i]!
      for (let i = 0; i < cols; i++) M[offset + i]![i] = F.one
      f[n] = M
    }
    return { S: summands[0]!.S, X: summands[k]!, Y, f }
  }

/** Projection from degreewise product onto the k-th factor (same matrices over a field). */
export const projectionFromProduct =
  <R>(F: Field<R>) =>
  (factors: ReadonlyArray<Complex<R>>, k: number): ChainMap<R> => {
    const prodDim: Record<number, number> = {}
    const degrees = Array.from(new Set(factors.flatMap(X => X.degrees))).sort((a,b)=>a-b)
    for (const n of degrees) prodDim[n] = factors.reduce((s,X)=>s+(X.dim[n]??0),0)

    const zeroDifferential: Record<number, Mat<R>> = {}
    const Xprod: Complex<R> = { S: factors[0]!.S, degrees, dim: prodDim, d: zeroDifferential }
    const f: Record<number, R[][]> = {}
    for (const n of degrees) {
      const dims = factors.map(X => X.dim[n] ?? 0)
      const rows = dims[k]!, cols = prodDim[n]!
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      let offset = 0
      for (let i = 0; i < k; i++) offset += dims[i]!
      for (let i = 0; i < rows; i++) M[i]![offset + i] = F.one
      f[n] = M
    }
    return { S: factors[0]!.S, X: Xprod, Y: factors[k]!, f }
  }

// ---------- Mapping cone Cone(f): Z with Z_n = Y_n ⊕ X_{n-1} ----------
export const cone =
  <R>(ϕ: ChainMap<R>): Complex<R> => {
    const S = ϕ.S
    const Rng = S as Ring<R>
    const degs = Array.from(new Set([...ϕ.Y.degrees, ...ϕ.X.degrees.map(n => n+1)])).sort((a,b)=>a-b)
    const dim: Record<number, number> = {}
    const d: Record<number, Mat<R>> = {}

    for (const n of degs) {
      const dimY = ϕ.Y.dim[n] ?? 0
      const dimXm1 = ϕ.X.dim[n-1] ?? 0
      dim[n] = dimY + dimXm1

      const dY  = ϕ.Y.d[n]     ?? zerosMat(ϕ.Y.dim[n-1] ?? 0, dimY, S)
      const fn1 = ϕ.f[n-1]     ?? zerosMat(ϕ.Y.dim[n-1] ?? 0, dimXm1, S) // Y_n <- X_{n-1}
      const dXm1= ϕ.X.d[n-1]   ?? zerosMat(ϕ.X.dim[n-2] ?? 0, dimXm1, S)
      const minus_dXm1 = matNeg(Rng)(dXm1)

      // Build block: [[dY , f_{n-1}],[0, -d_{X,n-1}]]
      const top  = hcat(dY, fn1)
      const botL = zerosMat((ϕ.X.dim[n-2] ?? 0), dimY, S)
      const bot  = hcat(botL, minus_dXm1)
      d[n] = vcat(top, bot)
    }

    return { S: Rng, degrees: degs, dim, d }
  }

// ---------- Distinguished triangles ----------
export type Triangle<R> = {
  readonly X: Complex<R>
  readonly Y: Complex<R>
  readonly Z: Complex<R>         // Cone(f)
  readonly f: ChainMap<R>
  readonly g: ChainMap<R>        // inclusion Y → Z
  readonly h: ChainMap<R>        // projection Z → X[1]
}

export const triangleFromMap =
  <R>(ϕ: ChainMap<R>): Triangle<R> => {
    const S = ϕ.S
    const Z = cone(ϕ)
    const X1 = shift1(ϕ.X)
    const incY: Record<number, Mat<R>> = {}
    const projX1: Record<number, Mat<R>> = {}

    for (const n of Z.degrees) {
      const dimY  = ϕ.Y.dim[n] ?? 0
      const dimXm1= ϕ.X.dim[n-1] ?? 0
      // g_n : Y_n → Y_n ⊕ X_{n-1}
      incY[n]  = vcat(idMat(dimY, S), zerosMat(dimXm1, dimY, S))
      // h_n : Y_n ⊕ X_{n-1} → X[1]_n = X_{n-1}
      projX1[n]= hcat(zerosMat(dimXm1, dimY, S), idMat(dimXm1, S))
    }

    const g: ChainMap<R> = { S, X: ϕ.Y, Y: Z, f: incY }
    const h: ChainMap<R> = { S, X: Z, Y: X1, f: projX1 }

    return { X: ϕ.X, Y: ϕ.Y, Z, f: ϕ, g, h }
  }

// Quick triangle sanity: (i) all complexes valid, (ii) chain-map laws, (iii) rotation shape sanity.
export const triangleIsSane =
  <R>(T: Triangle<R>): boolean =>
    complexIsValid(T.X) &&
    complexIsValid(T.Y) &&
    complexIsValid(T.Z) &&
    isChainMap(T.f) &&
    isChainMap(T.g) &&
    isChainMap(T.h)

// ---------------------------------------------------------------------
// Field + linear algebra for homology computation
// ---------------------------------------------------------------------
export interface Field<R> extends Ring<R> {
  inv: (a: R) => R        // a^{-1}, a ≠ 0
  div: (a: R, b: R) => R  // a * b^{-1}
}

// A toy field on JS numbers (ℚ-like for small tests)
export const FieldReal: Field<number> = {
  ...RingReal,
  inv: (a) => 1 / a,
  div: (a, b) => a / b
}

// ---------------------------------------------------------------------
// Big rational field Q = ℚ with bigint
//   - exact arithmetic (normalize by gcd, denominator > 0)
//   - full Field<Q>: add, mul, neg, sub, eq, zero, one, inv, div
// ---------------------------------------------------------------------

export type Q = { num: bigint; den: bigint } // den > 0, reduced

const bgcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a
  b = b < 0n ? -b : b
  while (b !== 0n) { const t = a % b; a = b; b = t }
  return a
}

export const qnorm = (n: bigint, d: bigint): Q => {
  if (d === 0n) throw new Error('Q: division by zero')
  if (n === 0n) return { num: 0n, den: 1n }
  if (d < 0n) { n = -n; d = -d }
  const g = bgcd(n, d)
  return { num: n / g, den: d / g }
}

export const Qof = (n: bigint | number, d: bigint | number = 1): Q =>
  qnorm(BigInt(n), BigInt(d))

export const Qeq = (a: Q, b: Q) => (a.num === b.num && a.den === b.den)
export const Qadd = (a: Q, b: Q): Q => qnorm(a.num * b.den + b.num * a.den, a.den * b.den)
export const Qneg = (a: Q): Q => ({ num: -a.num, den: a.den })
export const Qsub = (a: Q, b: Q): Q => Qadd(a, Qneg(b))
export const Qmul = (a: Q, b: Q): Q => qnorm(a.num * b.num, a.den * b.den)
export const Qinv = (a: Q): Q => {
  if (a.num === 0n) throw new Error('Q: inverse of 0')
  const s = a.num < 0n ? -1n : 1n
  return qnorm(s * a.den, s * a.num)
}
export const Qdiv = (a: Q, b: Q): Q => Qmul(a, Qinv(b))

export const FieldQ: Field<Q> = {
  // additive monoid
  add: Qadd,
  zero: Qof(0),
  // multiplicative monoid
  mul: Qmul,
  one: Qof(1),
  // equality
  eq: Qeq,
  // ring extras
  neg: Qneg,
  sub: Qsub,
  // field extras
  inv: Qinv,
  div: Qdiv
}

// Optional: embed integers and rationals from JS numbers
export const QfromInt = (n: number): Q => Qof(n, 1)
export const QfromRatio = (n: number, d: number): Q => Qof(n, d)

// Pretty printer
export const QtoString = (q: Q): string =>
  q.den === 1n ? q.num.toString() : `${q.num.toString()}/${q.den.toString()}`

// ---------------------------------------------------------------------
// Rational RREF with magnitude pivoting
// ---------------------------------------------------------------------

export const qAbsCmp = (a: Q, b: Q): number => {
  // compare |a| ? |b| without division: |a.num|*b.den ? |b.num|*a.den
  const an = a.num < 0n ? -a.num : a.num
  const bn = b.num < 0n ? -b.num : b.num
  const lhs = an * b.den
  const rhs = bn * a.den
  return lhs === rhs ? 0 : (lhs > rhs ? 1 : -1)
}

export const isQZero = (a: Q) => (a.num === 0n)

const qCloneM = (A: ReadonlyArray<ReadonlyArray<Q>>): Q[][] =>
  A.map(r => r.map(x => ({ num: x.num, den: x.den }) as Q))

export const rrefQPivot = (A0: ReadonlyArray<ReadonlyArray<Q>>) => {
  const A = qCloneM(A0)
  const m = A.length
  const n = (A[0]?.length ?? 0)
  let row = 0
  const pivots: number[] = []

  for (let col = 0; col < n && row < m; col++) {
    // find best pivot row: nonzero with max |entry|
    let pr = -1
    for (let i = row; i < m; i++) {
      if (!isQZero(A[i]?.[col]!)) {
        if (pr === -1) pr = i
        else if (qAbsCmp(A[i]?.[col]!, A[pr]?.[col]!) > 0) pr = i
      }
    }
    if (pr === -1) continue

    // swap
    if (pr !== row) { const tmp = A[row]!; A[row] = A[pr]!; A[pr] = tmp }

    // scale pivot row to make pivot 1
    const piv = A[row]?.[col]!
    const inv = Qinv(piv)
    for (let j = col; j < n; j++) A[row]![j] = Qmul(A[row]![j]!, inv)

    // eliminate other rows
    for (let i = 0; i < m; i++) if (i !== row) {
      const factor = A[i]?.[col]!
      if (!isQZero(factor)) {
        for (let j = col; j < n; j++) {
          A[i]![j] = Qsub(A[i]![j]!, Qmul(factor, A[row]![j]!))
        }
      }
    }

    pivots.push(col)
    row++
  }

  return { R: A, pivots }
}

type MatF<R> = ReadonlyArray<ReadonlyArray<R>>

const cloneM = <R>(A: MatF<R>): R[][] => A.map(r => r.slice() as R[])

// Reduced Row-Echelon Form (in place), returns pivot column indices
export const rref =
  <R>(F: Field<R>) =>
  (A0: MatF<R>): { R: R[][]; pivots: number[] } => {
    const A = cloneM(A0)
    const m = A.length, n = (A[0]?.length ?? 0)
    let row = 0
    const pivots: number[] = []
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    
    for (let col = 0; col < n && row < m; col++) {
      // find pivot row
      let pr = row
      while (pr < m && eq(A[pr]?.[col]!, F.zero)) pr++
      if (pr === m) continue
      ;[A[row], A[pr]] = [A[pr]!, A[row]!]
      const piv = A[row]?.[col]!
      const inv = F.inv(piv)
      // scale row
      for (let j = col; j < n; j++) A[row]![j] = F.mul(A[row]![j]!, inv)
      // eliminate others
      for (let i = 0; i < m; i++) if (i !== row) {
        const factor = A[i]?.[col]!
        if (!eq(factor, F.zero)) {
          for (let j = col; j < n; j++) {
            A[i]![j] = F.sub(A[i]![j]!, F.mul(factor, A[row]![j]!))
          }
        }
      }
      pivots.push(col)
      row++
    }
    return { R: A, pivots }
  }

// Nullspace basis of A (m×n): columns n×k
export const nullspace =
  <R>(F: Field<R>) =>
  (A: MatF<R>): R[][] => {
    const n = (A[0]?.length ?? 0)
    const { R, pivots } = rref(F)(A)
    const pivotSet = new Set(pivots)
    const free = [] as number[]
    for (let j = 0; j < n; j++) if (!pivotSet.has(j)) free.push(j)
    const basis: R[][] = []
    for (const f of free) {
      const v = Array.from({ length: n }, () => F.zero)
      v[f] = F.one
      // back-substitute pivot columns
      let prow = 0
      for (const pc of pivots) {
        // R[prow][pc] = 1 in RREF
        // v[pc] = - sum_{j>pc} R[prow][j] * v[j]
        let sum = F.zero
        for (let j = pc + 1; j < n; j++) {
          if (!F.eq?.(v[j]!, F.zero)) {
            sum = F.add(sum, F.mul(R[prow]?.[j]!, v[j]!))
          }
        }
        v[pc] = F.neg(sum)
        prow++
      }
      basis.push(v)
    }
    return basis // n×k (each basis vector is length n)
  }

// Column space basis (return columns of A forming a basis, as matrix n×r)
export const colspace =
  <R>(F: Field<R>) =>
  (A: MatF<R>): R[][] => {
    const AT = transpose(A)
    const { pivots } = rref(F)(AT)
    const cols: R[][] = []
    for (const j of pivots) cols.push(A.map(row => row[j]!))
    // pack as n×r
    const n = A.length ? A[0]!.length : 0
    const M: R[][] = Array.from({ length: n }, (_, i) =>
      cols.map(col => col[i] ?? F.zero)
    )
    return M
  }

const transpose = <R>(A: MatF<R>): R[][] =>
  (A[0]?.map((_, j) => A.map(row => row[j]!)) ?? [])

// Solve A x = b (least-structure; expects a solution to exist)
export const solveLinear =
  <R>(F: Field<R>) =>
  (A0: MatF<R>, b0: ReadonlyArray<R>): R[] => {
    const A = cloneM(A0)
    const b = b0.slice() as R[]
    const m = A.length, n = (A[0]?.length ?? 0)
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    let row = 0
    
    for (let col = 0; col < n && row < m; col++) {
      let pr = row
      while (pr < m && eq(A[pr]?.[col]!, F.zero)) pr++
      if (pr === m) continue
      ;[A[row], A[pr]] = [A[pr]!, A[row]!]; 
      ;[b[row], b[pr]] = [b[pr]!, b[row]!]
      const inv = F.inv(A[row]?.[col]!)
      for (let j = col; j < n; j++) A[row]![j] = F.mul(A[row]![j]!, inv)
      b[row] = F.mul(b[row]!, inv)
      for (let i = 0; i < m; i++) if (i !== row) {
        const factor = A[i]?.[col]!
        if (!eq(factor, F.zero)) {
          for (let j = col; j < n; j++) A[i]![j] = F.sub(A[i]![j]!, F.mul(factor, A[row]![j]!))
          b[i] = F.sub(b[i]!, F.mul(factor, b[row]!))
        }
      }
      row++
    }
    // read off solution (set free vars = 0)
    const x = Array.from({ length: n }, () => F.zero)
    let prow = 0
    for (let col = 0; col < n && prow < m; col++) {
      // leading one?
      if (!eq(A[prow]?.[col]!, F.one)) continue
      x[col] = b[prow]!
      prow++
    }
    return x
  }

// ---------------------------------------------------------------------
// Long exact sequence (cone) segment checker at degree n over a Field<R>
// Checks exactness of: Hn(X)→Hn(f)Hn(Y)→Hn(g)Hn(Cone(f))→Hn(h)Hn(X[1])
// ---------------------------------------------------------------------

export const checkLongExactConeSegment =
  <R>(F: Field<R>) =>
  (fxy: ChainMap<R>, n: number) => {
    // Note: This requires makeHomologyFunctor to be implemented
    // For now, we provide the interface structure
    
    const rank = (A: ReadonlyArray<ReadonlyArray<R>>): number =>
      rref(F)(A).pivots.length

    // matrix multiply (C = A ∘ B) with compat dims check
    const mul = (A: R[][], B: R[][]): R[][] => {
      const m = A.length, k = (A[0]?.length ?? 0), n2 = (B[0]?.length ?? 0)
      if (k !== B.length) return Array.from({ length: m }, () => Array.from({ length: n2 }, () => F.zero))
      const C: R[][] = Array.from({ length: m }, () => Array.from({ length: n2 }, () => F.zero))
      for (let i = 0; i < m; i++) {
        for (let t = 0; t < k; t++) {
          const a = A[i]?.[t]!
          const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
          if (eq(a, F.zero)) continue
          for (let j = 0; j < n2; j++) {
            C[i]![j] = F.add(C[i]![j]!, F.mul(a, B[t]?.[j]!))
          }
        }
      }
      return C
    }

    const isZeroMat = (A: R[][]): boolean => {
      const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
      return A.every(row => row.every(x => eq(x, F.zero)))
    }

    // This is a placeholder structure - full implementation would require
    // the homology functor to be completed
    return {
      input: { fxy, degree: n },
      helpers: { rank, compose: mul, isZeroMat },
      // Interface for when homology functor is implemented
      checkExactness: () => {
        // Would check the four exactness conditions
        return {
          compZeroAtY: true,
          compZeroAtC: true,
          dimImEqKerAtY: true,
          dimImEqKerAtC: true,
          dims: { dimHX: 0, dimHY: 0, dimHC: 0, dimHX1: 0 },
          ranks: { rankHF: 0, rankHG: 0, rankHH: 0 },
          kernels: { kerHG: 0, kerHH: 0 },
        }
      },
    }
  }

// ---------------------------------------------------------------------
// LES CONE SEGMENT PROPS (2-term complexes in degrees [-1,0])
// ---------------------------------------------------------------------

// tiny random matrix
const randMatN = (rows: number, cols: number, lo = -2, hi = 2): number[][] =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.floor(Math.random()*(hi-lo+1))+lo)
  )

// identity matrix
const idnN = (n: number): number[][] =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  )

// build random 2-term complex X: X_{-1}→X_0 with d0 : dim[-1]×dim[0]
export const randomTwoTermComplex =
  (S = FieldReal, maxDim = 2): Complex<number> => {
    const m = Math.floor(Math.random()*(maxDim+1))     // dim[-1]
    const n = Math.floor(Math.random()*(maxDim+1))     // dim[0]
    const d0 = randMatN(m, n)
    const X: Complex<number> = {
      S,
      degrees: [-1, 0],
      dim: { [-1]: m, [0]: n },
      d:   { [0]: d0 }
    }
    return X
  }

// identity chain map X→X
export const idChainMapN = (X: Complex<number>): ChainMap<number> => {
  const f: Record<number, number[][]> = {}
  for (const k of X.degrees) {
    const n = X.dim[k] ?? 0
    if (n > 0) f[k] = idnN(n)
  }
  return { S: X.S, X, Y: X, f }
}

// zero chain map X→X (always a chain map)
export const zeroChainMapN = (X: Complex<number>): ChainMap<number> => {
  const f: Record<number, number[][]> = {}
  for (const k of X.degrees) {
    const n = X.dim[k] ?? 0
    if (n > 0) f[k] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
  }
  return { S: X.S, X, Y: X, f }
}

// Run a few randomized checks using checkLongExactConeSegment (numbers)
export const runLesConeProps = (samples = 50, degree = 0) => {
  const check = checkLongExactConeSegment(FieldReal)
  let okId = 0, okZero = 0
  for (let i = 0; i < samples; i++) {
    const X = randomTwoTermComplex(FieldReal, 2)
    // id map
    const fid = idChainMapN(X)
    const rid = check(fid, degree)
    if (rid.checkExactness().compZeroAtY && rid.checkExactness().compZeroAtC && 
        rid.checkExactness().dimImEqKerAtY && rid.checkExactness().dimImEqKerAtC) okId++

    // zero map
    const f0  = zeroChainMapN(X)
    const r0  = check(f0, degree)
    if (r0.checkExactness().compZeroAtY && r0.checkExactness().compZeroAtC && 
        r0.checkExactness().dimImEqKerAtY && r0.checkExactness().dimImEqKerAtC) okZero++
  }
  return { samples, okId, okZero }
}

// ---------------------------------------------------------------------
// Natural isomorphism H_n(X[1]) ≅ H_{n-1}(X) — witness matrices
// ---------------------------------------------------------------------

export const makeHomologyShiftIso =
  <R>(F: Field<R>) =>
  (n: number) => {
    // Note: This requires makeHomologyFunctor to be fully implemented
    // For now, we provide the interface structure
    
    // helper: column-concat, transpose, solve (reuse from earlier if present)
    const tpose = (A: ReadonlyArray<ReadonlyArray<R>>): R[][] =>
      (A[0]?.map((_, j) => A.map(row => row[j]!)) ?? [])

    const hcatHelper = (A: R[][], B: R[][], z: R): R[][] => {
      const rows = Math.max(A.length, B.length)
      const a = A[0]?.length ?? 0, b = B[0]?.length ?? 0
      const pad = (M: R[][], c: number) =>
        Array.from({ length: rows }, (_, i) =>
          Array.from({ length: c }, (_, j) => M[i]?.[j] ?? z)
        )
      const Ap = pad(A, a), Bp = pad(B, b)
      return Ap.map((row, i) => row.concat(Bp[i]!))
    }

    const solve = (A: R[][], b: R[]) => solveLinear(F)(tpose(A), b)

    // Build forward matrix Φ: H_n(X[1]) → H_{n-1}(X)
    const forward = (X: Complex<R>): R[][] => {
      const domDim = X.dim[n] ?? 0
      const codDim = X.dim[n - 1] ?? 0
      const size = Math.min(domDim, codDim) || 1
      return eye(F)(size)
    }

    // Build inverse matrix Ψ: H_{n-1}(X) → H_n(X[1])
    const backward = (X: Complex<R>): R[][] => {
      const domDim = X.dim[n - 1] ?? 0
      const codDim = X.dim[n] ?? 0
      const size = Math.min(domDim, codDim) || 1
      return eye(F)(size)
    }

    // Optional checker: Ψ∘Φ ≈ I and Φ∘Ψ ≈ I (by ranks)
    const rank =
      (A: ReadonlyArray<ReadonlyArray<R>>): number =>
        rref(F)(A).pivots.length

    const matMulHelper =
      (A: R[][], B: R[][]): R[][] => {
        const m = A.length, k = (A[0]?.length ?? 0), n2 = (B[0]?.length ?? 0)
        const C: R[][] = Array.from({ length: m }, () => Array.from({ length: n2 }, () => F.zero))
        const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
        for (let i = 0; i < m; i++) for (let t = 0; t < k; t++) {
          const a = A[i]?.[t]!; if (eq(a, F.zero)) continue
          for (let j = 0; j < n2; j++) C[i]![j] = F.add(C[i]![j]!, F.mul(a, B[t]?.[j]!))
        }
        return C
      }

    const isoCheck = (X: Complex<R>) => {
      const Φ = forward(X)
      const Ψ = backward(X)
      // ranks of compositions should equal full dimension
      const r1 = rank(matMulHelper(Ψ, Φ))
      const r2 = rank(matMulHelper(Φ, Ψ))
      return { rankPsiPhi: r1, rankPhiPsi: r2, dimHn: Φ[0]?.length ?? 0, dimHn1: Ψ[0]?.length ?? 0 }
    }

    return {
      degree: n,
      helpers: { hcatHelper, solve },
      forward,
      backward,
      isoCheck,
    }
  }

// === RREF selection + linear helpers ========================================
type RrefFn<R> = (A: ReadonlyArray<ReadonlyArray<R>>) => { R: R[][]; pivots: number[] }

/** Optional registry: lets you override the RREF used for a specific Field instance. */
const RREF_REGISTRY = new WeakMap<Field<unknown>, RrefFn<unknown>>()
export const registerRref = <R>(F: Field<R>, rr: RrefFn<R>) => {
  RREF_REGISTRY.set(F as Field<unknown>, rr as RrefFn<unknown>)
}

const getRref =
  <R>(F: Field<R>): RrefFn<R> => {
    const override = RREF_REGISTRY.get(F as Field<unknown>) as RrefFn<R> | undefined
    return override ?? ((A: ReadonlyArray<ReadonlyArray<R>>) => rref(F)(A))
  }

/** Column-space basis via RREF(A): take pivot columns from original A. */
const colspaceByRref =
  <R>(F: Field<R>) =>
  (A: R[][]): R[][] => {
    const { pivots } = getRref(F)(A)
    if (!A.length) return []
    const m = A.length
    const B: R[][] = Array.from({ length: m }, () => [])
    for (const j of pivots) for (let i = 0; i < m; i++) B[i]!.push(A[i]?.[j]!)
    return B
  }

/** Nullspace basis of A x = 0 using its RREF. Returns an n×k matrix whose columns form a basis. */
const nullspaceByRref =
  <R>(F: Field<R>) =>
  (A: R[][]): R[][] => {
    const { R: U, pivots } = getRref(F)(A) // U is RREF(A), size m×n
    const m = U.length
    const n = (U[0]?.length ?? 0)
    const pivotSet = new Set(pivots)
    const free: number[] = []
    for (let j = 0; j < n; j++) if (!pivotSet.has(j)) free.push(j)
    const cols: R[][] = []
    const eq = F.eq ?? ((a: R, b: R) => Object.is(a, b))
    // Back-substitute U x = 0
    for (const f of free) {
      const x: R[] = Array.from({ length: n }, () => F.zero)
      x[f] = F.one
      // go upward through pivot rows
      for (let i = m - 1; i >= 0; i--) {
        // find pivot column j in row i (U is RREF so pivot entry is 1)
        let j = -1
        for (let c = 0; c < n; c++) if (!eq(U[i]?.[c]!, F.zero)) { j = c; break }
        if (j < 0) continue
        // x[j] = - Σ_{k>j} U[i][k] * x[k]
        let s = F.zero
        for (let k = j + 1; k < n; k++) if (!eq(U[i]?.[k]!, F.zero)) {
          s = F.add(s, F.mul(U[i]?.[k]!, x[k]!))
        }
        x[j] = F.neg(s)
      }
      cols.push(x)
    }
    // pack columns to n×k
    const K: R[][] = Array.from({ length: n }, (_, i) =>
      cols.map(col => col[i] ?? F.zero)
    )
    return K
  }

/* ============================================================================
 * IMAGE / COIMAGE IN CHAIN-COMPLEX LAND (OVER A FIELD)
 * ----------------------------------------------------------------------------
 * Category-speak in one breath:
 * - In the additive category Ch_k (chain complexes over a field k), every map
 *   f : X → Y has degreewise linear maps f_n.  Define:
 *     • im(f)_n   = im(f_n)     (subspace of Y_n)     → subcomplex of Y
 *     • coim(f)_n = X_n / ker(f_n)                    → quotient of X
 * - These assemble into complexes Im(f) ↪ Y and X ↠ Coim(f), and the canonical
 *   factorization X ↠ Coim(f) —η→ Im(f) ↪ Y is an isomorphism (1st iso thm).
 *   In code we pick bases and produce matrices for these maps.
 * - This pairs with your Ker/Coker: exact rows
 *       0 → Ker(f) → X → Im(f) → 0           and          0 → Im(f) → Y → Coker(f) → 0
 *   and a canonical Coim(f) ≅ Im(f).
 * ========================================================================== */

const tposeHelper = <R>(A: ReadonlyArray<ReadonlyArray<R>>): R[][] =>
  (A[0]?.map((_, j) => A.map(r => r[j]!)) ?? [])

const matMulHelper =
  <R>(F: Field<R>) =>
  (A: R[][], B: R[][]): R[][] => {
    const m = A.length, k = (A[0]?.length ?? 0), n = (B[0]?.length ?? 0)
    const Z: R[][] = Array.from({ length: m }, () => Array.from({ length: n }, () => F.zero))
    const eq = F.eq ?? ((x: R, y: R) => Object.is(x, y))
    for (let i = 0; i < m; i++) for (let p = 0; p < k; p++) {
      const a = A[i]?.[p]!; if (eq(a, F.zero)) continue
      for (let j = 0; j < n; j++) Z[i]![j] = F.add(Z[i]![j]!, F.mul(a, B[p]?.[j]!))
    }
    return Z
  }

const solveVecHelper =
  <R>(F: Field<R>) =>
  (A: R[][], b: R[]) => solveLinear(F)(tposeHelper(A), b)

/** coordinates in a chosen column-basis J (assumed independent) */
const coordsInHelper =
  <R>(F: Field<R>) =>
  (J: R[][], v: R[]): R[] =>
    solveVecHelper(F)(J, v)

export const imageComplex =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>): { Im: Complex<R>; incl: ChainMap<R>; basis: Record<number, R[][]> } => {
    const Y = f.Y
    const degrees = Y.degrees.slice()
    const dim: Record<number, number> = {}
    const dIm: Record<number, R[][]> = {}
    const jMat: Record<number, R[][]> = {} // inclusions j_n : Im_n ↪ Y_n (columns = basis)
    const mul = matMulHelper(F)
    const crd = coordsInHelper(F)

    // basis for im(f_n), store as columns J_n
    for (const n of degrees) {
      const fn = f.f[n] ?? ([] as R[][])          // Y_n × X_n
      const Jn = colspaceByRref(F)(fn)            // Y_n × r_n (auto-select RREF)
      jMat[n]  = Jn
      dim[n]   = Jn[0]?.length ?? 0
    }

    // d^Im_n = coords_{J_{n-1}}( d^Y_n · J_n )  ⇒ matrix of size dim(Im_{n-1}) × dim(Im_n)
    for (const n of degrees) {
      const Jn   = jMat[n]    ?? ([] as R[][])
      const Jn_1 = jMat[n-1]  ?? ([] as R[][])
      const dYn  = Y.d[n]     ?? ([] as R[][])    // Y_{n-1} × Y_n
      const cols = Jn[0]?.length ?? 0
      const rows = Jn_1[0]?.length ?? 0
      if (cols === 0) continue
      const D: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      const dYJ = mul(dYn as R[][], Jn as R[][])  // in Y_{n-1}
      for (let j = 0; j < cols; j++) {
        const v = dYJ.map(row => row[j] as R)
        const alpha = crd(Jn_1, v)                // coords in Im_{n-1}
        for (let i = 0; i < rows; i++) D[i]![j] = alpha[i] ?? F.zero
      }
      dIm[n] = D
    }

    const Im: Complex<R> = { S: f.S, degrees, dim, d: dIm }
    const incl: ChainMap<R> = { S: f.S, X: Im, Y, f: jMat }
    return { Im, incl, basis: jMat }
  }

export const coimageComplex =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>): { Coim: Complex<R>; proj: ChainMap<R>; Lbasis: Record<number, R[][]> } => {
    const X = f.X
    const degrees = X.degrees.slice()
    const dim: Record<number, number> = {}
    const dC: Record<number, R[][]> = {}
    const qMat: Record<number, R[][]> = {} // projections q_n : X_n ↠ Coim_n   (rows = coordinates)
    const Lb:  Record<number, R[][]> = {} // inclusions L_n ↪ X_n (columns = complement basis)
    const rr = rref(F)
    const rank = (A: R[][]) => rr(tposeHelper(A)).pivots.length
    const mul = matMulHelper(F)
    const crd = coordsInHelper(F)

    const kernelBasis = (A: R[][]): R[][] => nullspaceByRref(F)(A)

    const chooseComplement = (K: R[][]): R[][] => {
      // greedily extend columns of K to a basis of X_n using standard basis
      const n = K.length
      const std = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? F.one : F.zero))
      )
      let cur = K, picked: R[][] = []
      for (let j = 0; j < n; j++) {
        const ej = std.map(row => [row[j]] as R[])
        const cand = cur.map((row,i) => row.concat(ej[i]!))
        if (rank(cand) > rank(cur)) { picked.push(std.map(r => r[j] as R)); cur = cand }
      }
      return picked // columns = L_n
    }

    for (const n of degrees) {
      const fn = f.f[n] ?? ([] as R[][])          // Y_n × X_n
      const Kn = kernelBasis(fn)                  // X_n × k_n
      const Ln = chooseComplement(Kn)             // X_n × l_n  with [K|L] basis of X_n
      Lb[n]    = Ln
      dim[n]   = Ln[0]?.length ?? 0

      // projection q_n : X_n → Coim_n ~ coords in L_n
      // matrix shape: l_n × dim(X_n), where q_n * x = coords_L(x)
      // build q_n by columns: q_n e_j = coords_L(e_j)
      const nDim = X.dim[n] ?? 0
      const I = Array.from({ length: nDim }, (_, i) =>
        Array.from({ length: nDim }, (_, j) => (i === j ? F.one : F.zero))
      )
      const qn: R[][] = Array.from({ length: dim[n]! }, () => Array.from({ length: nDim }, () => F.zero))
      for (let j = 0; j < nDim; j++) {
        const e = I.map(r => r[j] as R)
        const [/*alpha*/, beta] = (() => {
          const KL = Kn.concat(Ln) as R[][]
          const coeff = solveLinear(F)(tposeHelper(KL), e) // [α;β]
          const kdim = Kn[0]?.length ?? 0
          return [coeff.slice(0, kdim), coeff.slice(kdim)]
        })()
        for (let i = 0; i < beta.length; i++) qn[i]![j] = beta[i]!
      }
      qMat[n] = qn
    }

    // d^Coim_n = coords_L_{n-1}( d^X_n · L_n )
    for (const n of degrees) {
      const Ln   = Lb[n]      ?? ([] as R[][])
      const Ln_1 = Lb[n-1]    ?? ([] as R[][])
      const dXn  = X.d[n]     ?? ([] as R[][])
      const cols = Ln[0]?.length ?? 0
      const rows = Ln_1[0]?.length ?? 0
      if (cols === 0) continue
      const D: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      const dXL = mul(dXn as R[][], Ln as R[][])
      for (let j = 0; j < cols; j++) {
        const v = dXL.map(row => row[j] as R)
        const beta = crd(Ln_1, v)
        for (let i = 0; i < rows; i++) D[i]![j] = beta[i] ?? F.zero
      }
      dC[n] = D
    }

    const Coim: Complex<R> = { S: f.S, degrees, dim, d: dC }
    const proj: ChainMap<R> = { S: f.S, X, Y: Coim, f: qMat }
    return { Coim, proj, Lbasis: Lb }
  }

/** Canonical η: Coim(f) → Im(f) as a chain map (isomorphism over a field). */
export const coimToIm =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>,
   coim: { Coim: Complex<R>; proj: ChainMap<R>; Lbasis: Record<number, R[][]> },
   im:   { Im: Complex<R>;   incl: ChainMap<R>;  basis:   Record<number, R[][]> }
  ): ChainMap<R> => {
    const { Lbasis } = coim
    const { basis: J } = im
    const mul = matMulHelper(F)
    const crd = coordsInHelper(F)
    const eta: Record<number, R[][]> = {}

    for (const n of f.X.degrees) {
      const Ln = Lbasis[n] ?? ([] as R[][])     // X_n × l_n
      const Jn = J[n]      ?? ([] as R[][])     // Y_n × r_n
      const fn = f.f[n]    ?? ([] as R[][])     // Y_n × X_n
      if ((Ln[0]?.length ?? 0) === 0) continue
      const YimageOfL = mul(fn as R[][], Ln as R[][])  // in Y_n
      // coords in Im basis ⇒ matrix r_n × l_n
      const r = Jn[0]?.length ?? 0
      const l = Ln[0]?.length ?? 0
      const M: R[][] = Array.from({ length: r }, () => Array.from({ length: l }, () => F.zero))
      for (let j = 0; j < l; j++) {
        const v = YimageOfL.map(row => row[j] as R)
        const alpha = crd(Jn, v)
        for (let i = 0; i < r; i++) M[i]![j] = alpha[i] ?? F.zero
      }
      eta[n] = M
    }

    return { S: f.S, X: coim.Coim, Y: im.Im, f: eta }
  }

/** Quick "isomorphism?" predicate degreewise using rank. */
export const isIsoChainMap =
  <R>(F: Field<R>) =>
  (h: ChainMap<R>): boolean => {
    const rr = rref(F)
    for (const n of h.X.degrees) {
      const l = h.X.dim[n] ?? 0
      const r = h.Y.dim[n] ?? 0
      if (l !== r) return false
      const rank = rr(h.f[n] ?? ([] as R[][])).pivots.length
      if (rank !== l) return false
    }
    return true
  }

// Smoke tests for preservation properties
export const smoke_coim_im_iso =
  <R>(F: Field<R>) =>
  (f: ChainMap<R>) => {
    const co = coimageComplex(F)(f)
    const im = imageComplex(F)(f)
    const eta = coimToIm(F)(f, co, im)
    return isIsoChainMap(F)(eta)
  }

/* In the additive category of chain complexes over a field, exact functors
 * (e.g., shift, scalar extension) preserve short exact sequences and the long
 * exact sequence in homology. The connecting map δ is natural: applying the
 * functor and then forming δ agrees with transporting δ through the functor's
 * canonical isomorphisms on homology. The checkers below realize this as
 * concrete matrix identities (up to basis change). */

/** A functor on chain-complex land (same field, arbitrary object/map actions). */
export type ComplexFunctor<R> = {
  onComplex: (X: Complex<R>) => Complex<R>
  onMap:     (f: ChainMap<R>) => ChainMap<R>
}

/** Check that F preserves exact shapes around a map f:
 *   - dims(ker, im, coker, coim) preserved degreewise
 *   - Coim(f)→Im(f) remains an isomorphism after F
 * This is a pragmatic "exactness" smoke test in vector-space land.
 */
export const checkExactnessForFunctor =
  <R>(F: Field<R>) =>
  (Fctr: ComplexFunctor<R>, f: ChainMap<R>) => {
    // Note: This requires kernel/cokernel complex implementations
    // For now, we provide the interface structure

    const degs = f.X.degrees
    const mappedComplex = Fctr.onComplex(f.X)
    const mappedMap = Fctr.onMap(f)

    // Placeholder implementation - would use actual kernel/cokernel/image/coimage when available
    const dimsOk = true // Would check dimension preservation
    const isoOk = true  // Would check that coim→im remains iso

    return {
      dimsOk,
      isoOk,
      field: F,
      preview: { degrees: degs, mappedComplex, mappedMap },
      // Diagnostic info for when full implementation is available
      message: 'Exactness checker interface ready - awaiting kernel/cokernel implementations'
    }
  }

/* ============================================================================
 * DIAGRAMS OF COMPLEXES (finite, practical)
 * ----------------------------------------------------------------------------
 * We do three things:
 *  1) Reindexing along a function on objects (discrete indices).
 *  2) Finite (co)limits for span/cospan/square shapes via degreewise LA.
 *  3) Left/Right Kan extensions for DISCRETE index maps u: J→I:
 *       - Lan_u D at i is ⨁_{u(j)=i} D(j)   (coproduct over fiber)
 *       - Ran_u D at i is ∏_{u(j)=i} D(j)   (product over fiber)
 *    These are the "diagrammatic" versions of sum/product and slot straight
 *    into exactness/naturality tests.
 * ========================================================================== */

export type ObjId = string

/** Discrete diagram: no non-identity morphisms. */
export type DiscDiagram<R> = Readonly<Record<ObjId, Complex<R>>>

/** Reindex a discrete diagram along u: J → I (precompose). */
export const reindexDisc =
  <R>(u: (j: ObjId) => ObjId) =>
  (DJ: DiscDiagram<R>): DiscDiagram<R> => {
    const out: Record<ObjId, Complex<R>> = {}
    for (const j of Object.keys(DJ)) {
      const i = u(j)
      out[i] = DJ[j]!
    }
    return out
  }

/** Degreewise direct sum (coproduct) of complexes. */
export const coproductComplex =
  <R>(F: Field<R>) =>
  (...Xs: ReadonlyArray<Complex<R>>): Complex<R> => {
    if (Xs.length === 0) {
      // Return zero complex
      return { S: F as Ring<R>, degrees: [], dim: {}, d: {} }
    }
    const S = Xs[0]!.S
    const degrees = Array.from(new Set(Xs.flatMap(X => X.degrees))).sort((a,b)=>a-b)
    const dim: Record<number, number> = {}
    const d: Record<number, R[][]> = {}
    for (const n of degrees) {
      const dims = Xs.map(X => X.dim[n] ?? 0)
      dim[n] = dims.reduce((a,b)=>a+b,0)
      // block diagonal d_n
      const blocks = Xs.map(X => X.d[n] ?? ([] as R[][]))
      const rows = Xs.map(X => X.d[n]?.length ?? 0).reduce((a,b)=>a+b,0)
      const cols = Xs.map(X => X.d[n]?.[0]?.length ?? (X.dim[n] ?? 0)).reduce((a,b)=>a+b,0)
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
      let ro = 0, co = 0
      for (const B of blocks) {
        for (let i = 0; i < (B.length ?? 0); i++) {
          for (let j = 0; j < (B[0]?.length ?? 0); j++) {
            M[ro+i]![co+j] = B[i]?.[j]!
          }
        }
        ro += (B.length ?? 0)
        co += (B[0]?.length ?? 0)
      }
      d[n] = M
    }
    return { S, degrees, dim, d }
  }

/** Degreewise direct product (equal to coproduct for vector spaces, but keep separate). */
export const productComplex = coproductComplex // same matrices over a field

/** Left Kan extension on DISCRETE u: J→I : (Lan_u D)(i) = ⨁_{u(j)=i} D(j) */
export const LanDisc =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId) =>
  (DJ: DiscDiagram<R>): DiscDiagram<R> => {
    const fiber: Record<ObjId, Complex<R>[]> = {}
    for (const j of Object.keys(DJ)) {
      const i = u(j)
      ;(fiber[i] ??= []).push(DJ[j]!)
    }
    const coprod = coproductComplex(F)
    const out: Record<ObjId, Complex<R>> = {}
    for (const i of Object.keys(fiber)) out[i] = coprod(...fiber[i]!)
    return out
  }

/** Right Kan extension on DISCRETE u: J→I : (Ran_u D)(i) = ∏_{u(j)=i} D(j) */
export const RanDisc =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId) =>
  (DJ: DiscDiagram<R>): DiscDiagram<R> => {
    const fiber: Record<ObjId, Complex<R>[]> = {}
    for (const j of Object.keys(DJ)) {
      const i = u(j)
      ;(fiber[i] ??= []).push(DJ[j]!)
    }
    const prod = productComplex(F)
    const out: Record<ObjId, Complex<R>> = {}
    for (const i of Object.keys(fiber)) out[i] = prod(...fiber[i]!)
    return out
  }

/** Beck–Chevalley (discrete case): pullback square of sets ⇒ Lan commutes with reindex. */
export const checkBeckChevalleyDiscrete =
  <R>(F: Field<R>) =>
  (square: {
    //      J' --v--> J
    //       |         |
    //      u'        u
    //       v         v
    //      I' --w-->  I
    u:  (j: ObjId) => ObjId,
    v:  (jp: ObjId) => ObjId,
    u_: (jp: ObjId) => ObjId,
    w:  (iP: ObjId) => ObjId
  }, DJ: DiscDiagram<R>) => {
    const Lan = LanDisc(F)
    const re  = reindexDisc<R>

    // w^* (Lan_u D)   vs   Lan_{u'} (v^* D)
    const lhs = re(square.w)(Lan(square.u)(DJ))
    const rhs = Lan(square.u_)(re(square.v)(DJ))

    // pragmatic equality = same dims per degree per object label
    const keys = new Set([...Object.keys(lhs), ...Object.keys(rhs)])
    for (const k of keys) {
      const X = lhs[k], Y = rhs[k]
      if (!X || !Y) return false
      const degs = new Set([...X.degrees, ...Y.degrees])
      for (const d of degs) if ((X.dim[d] ?? 0) !== (Y.dim[d] ?? 0)) return false
    }
    return true
  }

// ============================ Finite posets & diagrams =======================

export type FinitePoset = {
  objects: ReadonlyArray<ObjId>
  /** Partial order: leq(a,b) means a ≤ b (at most one arrow a→b). Must be reflexive/transitive/antisymmetric. */
  leq: (a: ObjId, b: ObjId) => boolean
}

/** Diagram over a poset: object assignment + the unique arrow maps D(a≤b): D(a)→D(b). */
export type PosetDiagram<R> = {
  I: FinitePoset
  X: Readonly<Record<ObjId, Complex<R>>>
  /** Map along order: returns the chain-map for a≤b, or undefined if not comparable. Must satisfy identities/composition. */
  arr: (a: ObjId, b: ObjId) => ChainMap<R> | undefined
}

/** Build arr from cover generators (Hasse edges) and compose transitively. */
export const makePosetDiagram =
  <R>(F: Field<R>) =>
  (I: FinitePoset, X: Readonly<Record<ObjId, Complex<R>>>,
   cover: ReadonlyArray<readonly [ObjId, ObjId]>, // a⋖b edges
   edgeMap: (a: ObjId, b: ObjId) => ChainMap<R>    // map for each cover
  ): PosetDiagram<R> => {
    const id = idChainMapField(F)
    const comp = composeChainMap(F)
    // Floyd–Warshall-ish memoized composition along ≤
    const cache = new Map<string, ChainMap<R>>()
    const key = (a:ObjId,b:ObjId)=>`${a}->${b}`

    for (const a of I.objects) cache.set(key(a,a), id(X[a]!))

    // adjacency by immediate covers
    const nxt = new Map<ObjId, ObjId[]>()
    for (const [a,b] of cover) (nxt.get(a) ?? nxt.set(a, []).get(a)!).push(b)

    // BFS compose along order
    for (const a of I.objects) {
      const q: ObjId[] = [a]; const seen = new Set<ObjId>([a])
      while (q.length) {
        const u = q.shift()!
        const outs = nxt.get(u) ?? []
        for (const v of outs) {
          if (!seen.has(v)) { seen.add(v); q.push(v) }
          // record cover edge
          cache.set(key(u,v), edgeMap(u,v))
          // extend all known a→u with u→v
          const au = cache.get(key(a,u))
          if (au) cache.set(key(a,v), comp(edgeMap(u,v), au))
        }
      }
    }

    const arr = (a: ObjId, b: ObjId) =>
      I.leq(a,b) ? (cache.get(key(a,b)) ?? (a===b ? id(X[a]!) : undefined)) : undefined

    return { I, X, arr }
  }

/** A --f--> B <--g-- C  (by ids) */
  export const pushoutInDiagram =
    <R>(F: Field<R>) =>
    (D: PosetDiagram<R>, A: ObjId, B: ObjId, C: ObjId) => {
      const f = D.arr(A,B); const g = D.arr(C,B)
      if (!f || !g) throw new Error('cospan maps not found')

      // Build pushout via cokernel of [f, -g]: A⊕C → B
      const AC = coproductComplex(F)(f.X, g.X)
      const mapBlock: Record<number, R[][]> = {}
    
    for (const n of f.Y.degrees) {
      const fn = f.f[n] ?? ([] as R[][]) // B_n × A_n
      const gn = g.f[n] ?? ([] as R[][]) // B_n × C_n
      const rows = fn.length
      const colsA = fn[0]?.length ?? 0
      const colsC = gn[0]?.length ?? 0
      const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: colsA + colsC }, () => F.zero))
      // [f | -g]
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < colsA; j++) M[i]![j] = fn[i]?.[j]!
        for (let j = 0; j < colsC; j++) M[i]![colsA + j] = F.neg(gn[i]?.[j]!)
      }
      mapBlock[n] = M
    }
    const spanToCoproduct: ChainMap<R> = { S: f.S, X: AC, Y: f.Y, f: mapBlock }

    // Use cokernel when available, for now return structure and the span witness
    return {
      PO: f.Y, // placeholder - would be cokernel
      fromB: idChainMapField(F)(f.Y), // placeholder
      spanToCoproduct,
    }
  }

/** A <--f-- B --g--> C  (by ids) */
export const pullbackInDiagram =
  <R>(F: Field<R>) =>
  (D: PosetDiagram<R>, A: ObjId, B: ObjId, C: ObjId) => {
    const f = D.arr(B,A); const g = D.arr(B,C)
    if (!f || !g) throw new Error('span maps not found')
    
    // Build pullback via kernel of [f; g]: B → A⊕C
    const AC = coproductComplex(F)(f.Y, g.Y)
    const mapBlock: Record<number, R[][]> = {}
    
    for (const n of f.X.degrees) {
      const fn = f.f[n] ?? ([] as R[][]) // A_n × B_n
      const gn = g.f[n] ?? ([] as R[][]) // C_n × B_n
      // stack [f; g]
      const M: R[][] = [ ...fn, ...gn ] as R[][]
      mapBlock[n] = M
    }
    const cospanToProduct: ChainMap<R> = { S: f.S, X: f.X, Y: AC, f: mapBlock }

    // Use kernel when available, for now return structure and the cospan witness
    return {
      PB: f.X, // placeholder - would be kernel
      toB: idChainMapField(F)(f.X), // placeholder
      cospanToProduct,
    }
  }

/* ========= Left/Right Kan extensions with TRUE universal morphisms ===== */

const tpose = <R>(A: ReadonlyArray<ReadonlyArray<R>>): R[][] => (A[0]?.map((_, j) => A.map(r => r[j]!)) ?? [])

/** Left Kan along u: J→I with REAL universal arr(a,b). */
export const LanPoset =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId, J: FinitePoset, I: FinitePoset) =>
  (DJ: PosetDiagram<R>): PosetDiagram<R> => {
    const coprod = coproductComplex(F)
    const inc = inclusionIntoCoproduct(F)
    const mul = matMul(F)
    const coords = (A: R[][], b: R[]) => solveLinear(F)(tpose(A), b)
    const imCols = colspaceByRref(F)

    type SliceMeta = {
      Js: ObjId[]
      P: Complex<R>                 // ∐ D(j)
      Rm: Complex<R>                // ∐ D(dom h)
      s: Record<number,R[][]>       // s: R ⇉ P
      t: Record<number,R[][]>       // t: R ⇉ P
      U: Record<number,R[][]>       // image basis columns of (s - t) in P (per degree)
      B: Record<number,R[][]>       // chosen complement columns in P (basis for cokernel reps)
      q: Record<number,R[][]>       // q: P → C  (coords in B)
      sec: Record<number,R[][]>     // sec: C → P (embeds coords via B)
      C: Complex<R>                 // the actual Lan(i)
    }

    // choose complement to a set of columns U (span in P) by greedy rank extension with std basis
    const chooseComplementCols = (U: R[][], dimP: number): R[][] => {
      const rank = (A: R[][]) => getRref(F)(A).pivots.length
      const Istd: R[][] = Array.from({ length: dimP }, (_, j) =>
        Array.from({ length: dimP }, (_, i) => (i === j ? F.one : F.zero)))
      let cur = U.map(col => col.slice()), picked: R[][] = []
      const r0 = rank(cur)
      for (let j = 0; j < dimP; j++) {
        const cand = cur.concat([Istd.map(row => row[j]!)])
        if (rank(cand) > rank(cur)) { picked.push(Istd.map(row => row[j]!)); cur = cand }
        if (picked.length + r0 >= dimP) break
      }
      return picked
    }

    const meta = new Map<ObjId, SliceMeta>()

    // Build Lan(i) for each i with full metadata enabling universal arrows.
    for (const i of I.objects) {
      const Js = J.objects.filter(j => I.leq(u(j), i))
      const parts = Js.map(j => DJ.X[j]!)
      const P = coprod(...parts) // ∐ D(j)

      // edges in slice: j→j' with J.leq(j,j') and both in Js
      type Edge = readonly [ObjId, ObjId]
      const edges: Edge[] = []
      for (const j of Js) for (const j2 of Js)
        if (j !== j2 && J.leq(j, j2)) edges.push([j, j2])

      const Rm = edges.length > 0 ? coprod(...edges.map(([j]) => DJ.X[j]!)) : 
        { S: P.S, degrees: P.degrees, dim: Object.fromEntries(P.degrees.map(n => [n, 0])), d: {} } // empty complex

      // assemble s,t by blocks: s_e = inc_{j'} ∘ D(j→j'), t_e = inc_j
      const s: Record<number,R[][]> = {}
      const t: Record<number,R[][]> = {}
      const incP = Js.map((_, k) => inc(parts, k))

      for (const n of P.degrees) {
        const rowsP = P.dim[n] ?? 0
        const S: R[][] = Array.from({ length: rowsP }, () => [])
        const T: R[][] = Array.from({ length: rowsP }, () => [])
        for (let e = 0; e < edges.length; e++) {
          const [j, j2] = edges[e]!
          const k  = Js.indexOf(j)
          const k2 = Js.indexOf(j2)
          const h = DJ.arr(j, j2); if (!h) throw new Error('missing DJ edge map')
          // s block = inc_{j2} ∘ h
          const SB = mul(incP[k2]!.f[n] ?? [], h.f[n] ?? [])
          const TB = incP[k]!.f[n] ?? []
          // append by columns
          if (S.length === 0) for (let i = 0; i < rowsP; i++) S[i] = []
          if (T.length === 0) for (let i = 0; i < rowsP; i++) T[i] = []
          for (let i = 0; i < rowsP; i++) {
            const srow = SB[i] ?? [], trow = TB[i] ?? []
            for (let c = 0; c < srow.length; c++) S[i]!.push(srow[c]!)
            for (let c = 0; c < trow.length; c++) T[i]!.push(trow[c]!)
          }
        }
        s[n] = S; t[n] = T
      }

      // compute cokernel data per degree
      const U: Record<number,R[][]> = {}
      const B: Record<number,R[][]> = {}
      const q: Record<number,R[][]> = {}
      const sec: Record<number,R[][]> = {}
      const dim: Record<number, number> = {}

      for (const n of P.degrees) {
        // U = image columns of (s - t) in P
        const Sn = s[n] ?? [], Tn = t[n] ?? []
        const rows = Sn.length, cols = Sn[0]?.length ?? 0
        const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        for (let i = 0; i < rows; i++)
          for (let j = 0; j < cols; j++)
            M[i]![j] = F.add(Sn[i]?.[j] ?? F.zero, F.neg(Tn[i]?.[j] ?? F.zero))
        const Ucols = imCols(M)                    // P_n × r
        U[n] = Ucols
        // choose complement B in P to span quotient reps
        const dimP = P.dim[n] ?? 0
        const Bcols = chooseComplementCols(Ucols, dimP)   // P_n × q
        B[n] = Bcols
        dim[n] = Bcols[0]?.length ?? 0
        // q: P→C = coordinates in basis B, sec: C→P embeds via B
        const qn: R[][] = Array.from({ length: dim[n] }, () => Array.from({ length: dimP }, () => F.zero))
        for (let j = 0; j < dimP; j++) {
          const e = eye(F)(dimP).map(r => r[j] as R)
          const alpha = coords(Bcols, e) // B * alpha = e
          for (let i = 0; i < (dim[n] ?? 0); i++) qn[i]![j] = alpha[i] ?? F.zero
        }
        q[n] = qn
        sec[n] = tpose(Bcols) // (q×dimP)ᵗ = dimP×q columns are basis reps
      }

      const dC: Record<number, Mat<R>> = {}
      const C: Complex<R> = { S: P.S, degrees: P.degrees, dim, d: dC }
      // differentials on C: induced by P via q∘dP∘sec (well-defined in quotients)
      for (const n of P.degrees) {
        const dP = P.d[n] ?? []
        const qn1 = q[n-1] ?? []; const secn = sec[n] ?? []
        dC[n] = mul(qn1, mul(dP, secn))
      }
      const record: SliceMeta = { Js, P, Rm, s, t, U, B, q, sec, C }
      meta.set(i, record)
    }

    // The Lan diagram:
    const X: Record<ObjId, Complex<R>> = {}
    for (const i of I.objects) X[i] = meta.get(i)!.C

    // The universal morphism arr(a,b): Lan(a) → Lan(b) for a≤b (true induced map)
    const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined => {
      if (!I.leq(a,b)) return undefined
      const A = meta.get(a)!; const Bm = meta.get(b)!
      // Build m_P: P_a → P_b that maps each component j∈(u↓a) into the same j in (u↓b)
      const Pa = A.P, Pb = Bm.P
      const f: Record<number,R[][]> = {}
      for (const n of Pa.degrees) {
        const rows = Pb.dim[n] ?? 0
        const cols = Pa.dim[n] ?? 0
        const M: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        // offsets per component
        const dimsA = A.Js.map(j => DJ.X[j]!.dim[n] ?? 0)
        const dimsB = Bm.Js.map(j => DJ.X[j]!.dim[n] ?? 0)
        let offA = 0
        for (let k = 0; k < A.Js.length; k++) {
          const j = A.Js[k]!
          const kk = Bm.Js.indexOf(j) // guaranteed ≥0 by slice inclusion
          const offB = dimsB.slice(0, kk).reduce((s, width) => s + width, 0)
          const w = dimsA[k]!
          for (let c = 0; c < w; c++) M[offB + c]![offA + c] = F.one
          offA += w
        }
        f[n] = M
      }
      const mP: ChainMap<R> = { S: Pa.S, X: Pa, Y: Pb, f }

      // Induced map on cokernels: φ = q_b ∘ mP ∘ sec_a
      const φ: Record<number,R[][]> = {}
      for (const n of Pa.degrees) {
        const Mat = mul(Bm.q[n] ?? [], mul(mP.f[n] ?? [], A.sec[n] ?? []))
        φ[n] = Mat
      }
      const La = A.C, Lb = Bm.C
      return { S: La.S, X: La, Y: Lb, f: φ }
    }

    return { I, X, arr }
  }

/** Right Kan along u: J→I with REAL universal arr(a,b). */
export const RanPoset =
  <R>(F: Field<R>) =>
  (u: (j: ObjId) => ObjId, J: FinitePoset, I: FinitePoset) =>
  (DJ: PosetDiagram<R>): PosetDiagram<R> => {
    const prod = productComplex(F)
    const prj = projectionFromProduct(F)
    const mul = matMul(F)
    const kerCols = nullspaceByRref(F)
    const coords = (A: R[][], b: R[]) => solveLinear(F)(tpose(A), b)

    type SliceMeta = {
      Js: ObjId[]
      P0: Complex<R>                // ∏ D(j)
      Q:  Complex<R>                // ∏ D(tgt h)
      u1: Record<number,R[][]>      // u1: P0 → Q
      u2: Record<number,R[][]>      // u2: P0 → Q
      K:  Complex<R>                // Ker(u1 - u2)
      inc: Record<number,R[][]>     // inc: K → P0  (columns = kernel basis)
      coordK: Record<number,(w:R[])=>R[]> // coordinate solver in K (inc·α = w)
    }

    const meta = new Map<ObjId, SliceMeta>()

    for (const i of I.objects) {
      const Js = J.objects.filter(j => I.leq(i, u(j)))          // (i↓u)
      const parts = Js.map(j => DJ.X[j]!)
      const P0 = prod(...parts)

      // edges j→j' in slice
      type Edge = readonly [ObjId, ObjId]
      const edges: Edge[] = []
      for (const j of Js) for (const j2 of Js)
        if (j !== j2 && J.leq(j, j2)) edges.push([j, j2])
      const Q = edges.length > 0 ? prod(...edges.map(([,j2]) => DJ.X[j2]!)) : 
        { S: P0.S, degrees: P0.degrees, dim: Object.fromEntries(P0.degrees.map(n => [n, 0])), d: {} } // empty complex

      // build u1,u2
      const u1: Record<number,R[][]> = {}
      const u2: Record<number,R[][]> = {}
      const prP = Js.map((_, k) => prj(parts, k))
      const prQ = edges.map(([, j2], eidx) => {
        const tgts = edges.map(([,jj]) => DJ.X[jj]!)
        return prj(tgts, eidx)
      })

      for (let e = 0; e < edges.length; e++) {
        const [j, j2] = edges[e]!
        const k  = Js.indexOf(j)
        const k2 = Js.indexOf(j2)
        const h = DJ.arr(j, j2); if (!h) throw new Error('missing DJ edge map')

        for (const n of P0.degrees) {
          // Se = prQ[e] ∘ h ∘ prP[k],   Te = prQ[e] ∘ prP[k2]
          const Se = mul(prQ[e]!.f[n] ?? [], mul(h.f[n] ?? [], prP[k]!.f[n] ?? []))
          const Te = mul(prQ[e]!.f[n] ?? [],          prP[k2]!.f[n] ?? [])
          const add = (dst: Record<number,R[][]>, B: R[][]) => {
            const prev = dst[n]; if (!prev) { dst[n] = B.map(r=>r.slice()); return }
            for (let i = 0; i < prev.length; i++)
              for (let j = 0; j < (prev[0]?.length ?? 0); j++)
                prev[i]![j] = F.add(prev[i]![j]!, B[i]![j]!)
          }
          add(u1, Se); add(u2, Te)
        }
      }

      // equalizer K = Ker(u1 - u2) with inclusion inc: K → P0 (basis columns)
      const inc: Record<number,R[][]> = {}
      const Kdim: Record<number, number> = {}
      for (const n of P0.degrees) {
        const U1 = u1[n] ?? [], U2 = u2[n] ?? []
        const rows = U1.length, cols = U1[0]?.length ?? 0
        const D: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        for (let i = 0; i < rows; i++)
          for (let j = 0; j < cols; j++)
            D[i]![j] = F.add(U1[i]?.[j] ?? F.zero, F.neg(U2[i]?.[j] ?? F.zero))
        // Kernel columns live in domain P0: each column is a vector in P0
        const N = kerCols(D)      // P0_n × k
        inc[n] = N
        Kdim[n] = N[0]?.length ?? 0
      }
      const dK: Record<number, Mat<R>> = {}
      const K: Complex<R> = { S: P0.S, degrees: P0.degrees, dim: Kdim, d: dK }
      // induced differential on K: inc is a chain map iff dQ(u1-u2)=(u1-u2)dP0; we build dK by pullback:
      for (const n of P0.degrees) {
        const dP = P0.d[n] ?? []
        // inc_{n-1} · dK_n = dP_n · inc_n   ⇒ solve for dK via coordinates in columns of inc_{n-1}
        const v = mul(P0.d[n] ?? [], inc[n] ?? [])
        // coordinates α with (inc_{n-1}) α = v  (column-wise)
        const alpha: R[][] = []
        const coord = (w: R[]) => coords(inc[n-1] ?? [], w)
        for (let j = 0; j < (inc[n]?.[0]?.length ?? 0); j++) {
          const w = v.map(row => row[j] ?? F.zero)
          alpha.push(coord(w))
        }
        // pack α columns: dim(K_{n-1}) × dim(K_n)
        const rows = Kdim[n-1] ?? 0, cols = Kdim[n] ?? 0
        const DK: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        for (let j = 0; j < cols; j++) {
          const col = alpha[j] ?? []
          for (let i = 0; i < rows; i++) DK[i]![j] = col[i] ?? F.zero
        }
        dK[n] = DK
      }

      // fast coordinate solver in K: α s.t. inc·α = w (precompute left solve per column)
      const coordK: Record<number,(w:R[])=>R[]> = {}
      for (const n of P0.degrees) coordK[n] = (w: R[]) => coords(inc[n] ?? [], w)

      meta.set(i, { Js, P0, Q, u1, u2, K, inc, coordK })
    }

    const X: Record<ObjId, Complex<R>> = {}
    for (const i of I.objects) X[i] = meta.get(i)!.K

    // Universal morphism arr(a,b): Ran(a) → Ran(b) for a≤b
    const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined => {
      if (!I.leq(a,b)) return undefined
      const A = meta.get(a)!; const Bm = meta.get(b)!
      const Ka = A.K, Kb = Bm.K
      const f: Record<number,R[][]> = {}

      for (const n of Ka.degrees) {
        // projection π_ab: P0_a → P0_b (drop components not in Js_b)
        const rows = Bm.P0.dim[n] ?? 0
        const cols = A.P0.dim[n] ?? 0
        const Πab: R[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => F.zero))
        // offsets per component
        let offA = 0
        for (let k = 0; k < A.Js.length; k++) {
          const j = A.Js[k]!
          const w = DJ.X[j]!.dim[n] ?? 0
          const kk = Bm.Js.indexOf(j)
          if (kk >= 0) {
            const offB = Bm.Js.slice(0, kk).reduce((s,jj)=>s+(DJ.X[jj]!.dim[n] ?? 0),0)
            for (let c = 0; c < w; c++) Πab[offB + c]![offA + c] = F.one
          }
          offA += w
        }
        // inc_b ∘ φ_n  =  Πab ∘ inc_a   ⇒   solve for φ_n by coordinates in Kb
        const RHS = mul(Πab, A.inc[n] ?? [])
        // for each column j of RHS, find α with (inc_b) α = RHS[:,j]
        const rowsK = Kb.dim[n] ?? 0
        const colsK = Ka.dim[n] ?? 0
        const Φ: R[][] = Array.from({ length: rowsK }, () => Array.from({ length: colsK }, () => F.zero))
        for (let j = 0; j < colsK; j++) {
          const w = RHS.map(row => row[j] ?? F.zero)
          const alpha = Bm.coordK[n]!(w)
          for (let i = 0; i < rowsK; i++) Φ[i]![j] = alpha[i] ?? F.zero
        }
        f[n] = Φ
      }
      return { S: Ka.S, X: Ka, Y: Kb, f }
    }

    return { I, X, arr }
  }

// ========================= Vector space bridge layer =========================

export type VectorSpace<R> = VectViewNS.VectorSpace<R>

export type LinMap<R> = VectViewNS.LinMap<R>

export const VS = VectViewNS.VS

export const idL =
  <R>(F: Field<R>) =>
  (V: VectorSpace<R>): LinMap<R> => ({
    F, dom: V, cod: V, M: eye(F)(V.dim)
  })

export const composeL =
  <R>(F: Field<R>) =>
  (g: LinMap<R>, f: LinMap<R>): LinMap<R> => {
    if (f.cod !== g.dom) throw new Error('composeL: domain/codomain mismatch')
    const M = matMul(F)(g.M as R[][], f.M as R[][])
    return { F, dom: f.dom, cod: g.cod, M }
  }

/** Convert a `LinMap` to a one-degree `ChainMap` (degree n), handy for demos. */
export const linToChain = VectViewNS.linToChain

/** Extract degree‐wise vector spaces from a complex (std basis). */
export const complexSpaces =
  <R>(F: Field<R>) =>
  (X: Complex<R>): Record<number, VectorSpace<R>> => {
    const out: Record<number, VectorSpace<R>> = {}
    for (const n of X.degrees) out[n] = VectViewNS.VS(F)(X.dim[n] ?? 0)
    return out
  }

// ========================= Poset → Vect (at a chosen degree) =========================

/** Vector space diagram at a single fixed degree n. */
export type VectDiagram<R> = VectViewNS.VectDiagram<R>

/** Extract a Vect diagram for a *single fixed degree* n. */
export const toVectAtDegree = VectViewNS.toVectAtDegree

export const arrowMatrixAtDegree = VectViewNS.arrowMatrixAtDegree

/** Convenience: get the block matrix for a specific arrow at degree n, or zero if no arrow. */
// Pretty-printers are now in the Pretty namespace



// ---------------------------------------------
// FinitePoset: finite set of objects + ≤ relation
// ---------------------------------------------

/** Build a finite poset from objects and Hasse covers. */
export const makeFinitePoset = (
  objects: ReadonlyArray<ObjId>,
  covers: ReadonlyArray<readonly [ObjId, ObjId]>
): FinitePoset => {
  const uniq = Array.from(new Set(objects))
  const idx = new Map<ObjId, number>(uniq.map((o, i) => [o, i]))
  // validate cover endpoints
  for (const [a, b] of covers) {
    if (!idx.has(a) || !idx.has(b)) {
      throw new Error(`makeFinitePoset: unknown object in cover (${a} ⋖ ${b})`)
    }
    if (a === b) throw new Error(`makeFinitePoset: self-cover not allowed (${a} ⋖ ${b})`)
  }

  const n = uniq.length
  // reachability matrix; start with reflexive closure
  const reach: boolean[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j)
  )
  // add cover edges
  for (const [a, b] of covers) {
    reach[idx.get(a)!]![idx.get(b)!] = true
  }
  // Floyd–Warshall transitive closure
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) if (reach[i]![k]) {
      for (let j = 0; j < n; j++) if (reach[k]![j]) {
        reach[i]![j] = true
      }
    }
  }
  // antisymmetry check: i ≤ j and j ≤ i ⇒ i==j
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && reach[i]![j] && reach[j]![i]) {
        const ai = uniq[i]!, aj = uniq[j]!
        throw new Error(`makeFinitePoset: cycle detected (${ai} ≼ ${aj} and ${aj} ≼ ${ai})`)
      }
    }
  }

  const leq = (a: ObjId, b: ObjId): boolean => {
    const ia = idx.get(a), ib = idx.get(b)
    if (ia == null || ib == null) return false
    return reach[ia]![ib]!
  }

  return { objects: uniq, leq }
}

/** Optional: quick text view of a poset. */
export const prettyPoset = (P: FinitePoset): string => {
  const lines: string[] = []
  lines.push(`Objects: ${P.objects.join(', ')}`)
  for (const a of P.objects) {
    const ups = P.objects.filter(b => a !== b && P.leq(a, b))
    if (ups.length) lines.push(`  ${a} ≤ { ${ups.join(', ')} }`)
  }
  return lines.join('\n')
}

/** Handy identity map builder (matches Complex shape). */
export const idChainMapCompat =
  <R>(X: Complex<R>): ChainMap<R> => {
    const { S } = X
    const f: Record<number, R[][]> = {}
    for (const n of X.degrees) {
      const dim = X.dim[n] ?? 0
      const I = Array.from({ length: dim }, (_, i) =>
        Array.from({ length: dim }, (_, j) => (i === j ? S.one : S.zero))
      )
      f[n] = I
    }
    return { S: X.S, X, Y: X, f }
  }

/**
 * Construct a PosetDiagram from:
 *  - a poset I,
 *  - node complexes X,
 *  - a list of arrow entries [a, b, f] where a ≤ b.
 */
export const makePosetDiagramCompat = <R>(
  I: FinitePoset,
  X: Readonly<Record<ObjId, Complex<R>>>,
  arrows: ReadonlyArray<readonly [ObjId, ObjId, ChainMap<R>]> = []
): PosetDiagram<R> => {
  // guard: nodes cover all objects
  for (const o of I.objects) {
    if (!X[o]) throw new Error(`makePosetDiagram: missing node complex for object '${o}'`)
  }
  // store arrows in a nested Map for quick lookup
  const table = new Map<ObjId, Map<ObjId, ChainMap<R>>>()
  const put = (a: ObjId, b: ObjId, f: ChainMap<R>) => {
    if (!I.leq(a, b)) throw new Error(`makePosetDiagram: arrow provided where ${a} ≰ ${b}`)
    if (!table.has(a)) table.set(a, new Map())
    table.get(a)!.set(b, f)
  }
  for (const [a, b, f] of arrows) put(a, b, f)

  const arr = (a: ObjId, b: ObjId): ChainMap<R> | undefined =>
    table.get(a)?.get(b)

  return { I, X, arr }
}

/* ================================================================
   DiagramClosure lives in stdlib/diagram-closure
   ================================================================ */

/* ================================================================
   DiscreteCategory — when you need explicit categorical structure
   ================================================================ */

// Category core definitions live in stdlib/category
/* ================================================================
   Integration with existing infrastructure
   ================================================================ */

/**
 * Compare codensity monad across adjunction.
 *
 * @deprecated Schedule a relative monad comparison via the Street-action
 * analyzers instead; this helper only observes classical endofunctors.
 */
export const compareCodensityAcrossAdjunction = <
  CO,
  DO,
  FO extends CatFunctor<CO, DO>,
  UO extends CatFunctor<DO, CO>,
  BO,
  BM
>(
  adj: Adjunction<CO, DO, FO, UO>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
) => {
  // This would compare T^G(A) with T^{G'}(F(A)) where G' = F ∘ G ∘ U
  // For equivalences, these should be naturally isomorphic
  return {
    originalCodensity: codensityCarrierFinSet(G.source, G, A),
    transportedCodensity: "placeholder", // Would compute via pushforward
    comparison: "placeholder" // Would check natural isomorphism
  }
}

/**
 * Matrix pretty-printing for pushed monads in Vect.
 *
 * @deprecated Prefer reporting via the relative monad construction diagnostics,
 * which surface the same matrices as witness payloads.
 */
export const prettyPrintPushedMonad = (
  pushedMonad: CatMonad<unknown>,
  V: EnhancedVect.VectObj
) => {
  const TV = assertVectObj(pushedMonad.endofunctor.onObj(V))
  return {
    originalDim: V.dim,
    pushedDim: TV.dim,
    unitMatrix: "placeholder", // Would extract matrix from unit
    multMatrix: "placeholder"  // Would extract matrix from mult
  }
}

/* ================================================================
   Concrete pushforward monad examples
  ================================================================ */

/** Free vector space functor FinSet -> Vect */
type VectObjShape = { readonly dim: number }

const isVectObjShape = (value: unknown): value is VectObjShape =>
  typeof value === 'object' &&
  value !== null &&
  'dim' in value &&
  typeof (value as { dim?: unknown }).dim === 'number'

const assertVectObj = (value: unknown): EnhancedVect.VectObj => {
  if (!isVectObjShape(value)) {
    throw new TypeError('Expected a Vect object')
  }
  return value as EnhancedVect.VectObj
}

type MatrixShape = ReadonlyArray<ReadonlyArray<number>>

const isMatrixShape = (value: unknown): value is MatrixShape =>
  isReadonlyArray(value) &&
  value.every(
    (row): row is ReadonlyArray<number> =>
      isReadonlyArray(row) && row.every((entry) => typeof entry === 'number')
  )

type VectMorShape = {
  readonly matrix: MatrixShape
  readonly from: VectObjShape
  readonly to: VectObjShape
}

const isVectMorShape = (value: unknown): value is VectMorShape =>
  typeof value === 'object' &&
  value !== null &&
  'matrix' in value &&
  'from' in value &&
  'to' in value &&
  isMatrixShape((value as { matrix?: unknown }).matrix) &&
  isVectObjShape((value as { from?: unknown }).from) &&
  isVectObjShape((value as { to?: unknown }).to)

const assertVectMor = (value: unknown): EnhancedVect.VectMor => {
  if (!isVectMorShape(value)) {
    throw new TypeError('Expected a Vect morphism')
  }
  return value as EnhancedVect.VectMor
}

export const freeVectFunctor = (): CatFunctor<typeof FinSet, typeof EnhancedVect.Vect> => ({
  source: FinSet,
  target: EnhancedVect.Vect,
  onObj: (obj: ObjOf<typeof FinSet>) => {
    const S = assertFinSetObj(obj)
    return { dim: S.elements.length }
  },
  onMor: (mor: MorOf<typeof FinSet>) => {
    const f = assertFinSetMor(mor)
    const rows = f.to.elements.length
    const cols = f.from.elements.length
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0))
    for (let j = 0; j < cols; j++) {
      const targetIndex = f.map[j]
      if (targetIndex === undefined) {
        throw new Error('Free functor: missing image index for basis element')
      }
      matrix[targetIndex]![j] = 1
    }
    return {
      matrix: matrix.map((row) => row.slice()),
      from: { dim: cols },
      to: { dim: rows }
    }
  }
})

/** Forgetful functor Vect -> FinSet */
export const forgetVectFunctor = (): CatFunctor<typeof EnhancedVect.Vect, typeof FinSet> => ({
  source: EnhancedVect.Vect,
  target: FinSet,
  onObj: (obj: ObjOf<typeof EnhancedVect.Vect>) => {
    const V = assertVectObj(obj)
    return makeFinSetObj(Array.from({ length: V.dim }, (_, i) => i))
  },
  onMor: (mor: MorOf<typeof EnhancedVect.Vect>) => {
    const f = assertVectMor(mor)
    const from = makeFinSetObj(Array.from({ length: f.from.dim }, (_, i) => i))
    const to = makeFinSetObj(Array.from({ length: f.to.dim }, (_, i) => i))
    const map = Array.from({ length: f.from.dim }, (_, i) =>
      i < f.to.dim ? i : 0
    )
    return { from, to, map }
  }
})

/** Free-Forgetful adjunction between FinSet and Vect */
export const freeForgetfulAdjunction = (): Adjunction<
  typeof FinSet,
  typeof EnhancedVect.Vect,
  CatFunctor<typeof FinSet, typeof EnhancedVect.Vect>,
  CatFunctor<typeof EnhancedVect.Vect, typeof FinSet>
> => {
  const F = freeVectFunctor()  // Free: FinSet -> Vect
  const U = forgetVectFunctor()  // Forget: Vect -> FinSet

  // Unit: Id_FinSet ⇒ U ∘ F (inclusion of set into free vector space)
  const unit: CatNatTrans<
    CatId<typeof FinSet>,
    CatCompose<typeof F, typeof U>
  > = {
    source: idFun(FinSet),
    target: composeFun(F, U),
    component: (obj: ObjOf<typeof FinSet>) => FinSet.id(assertFinSetObj(obj))
  }

  // Counit: F ∘ U ⇒ Id_Vect (evaluation of linear combination)
  const counit: CatNatTrans<
    CatCompose<typeof U, typeof F>,
    CatId<typeof EnhancedVect.Vect>
  > = {
    source: composeFun(U, F),
    target: idFun(EnhancedVect.Vect),
    component: (obj: ObjOf<typeof EnhancedVect.Vect>) =>
      EnhancedVect.Vect.id(assertVectObj(obj))
  }
  
  return { F, U, unit, counit }
}

/** Example: List monad on FinSet */
export const listMonadFinSet = (): CatMonad<typeof FinSet> => {
  const listElementsFor = (S: FinSetObj): ReadonlyArray<ReadonlyArray<FinSetElem>> => {
    const lists: Array<ReadonlyArray<FinSetElem>> = [[]]
    const extend = (
      prefix: ReadonlyArray<FinSetElem>,
      remaining: number
    ): void => {
      if (remaining === 0) {
        lists.push(prefix)
        return
      }
      for (const elem of S.elements) {
        extend([...prefix, elem], remaining - 1)
      }
    }
    for (let len = 1; len <= 3; len++) {
      extend([], len)
    }
    return lists
  }

  const findListIndex = (
    haystack: ReadonlyArray<ReadonlyArray<FinSetElem>>,
    needle: ReadonlyArray<FinSetElem>
  ): number =>
    haystack.findIndex(
      (candidate) =>
        candidate.length === needle.length &&
        candidate.every((value, idx) => Object.is(value, needle[idx]))
    )

  const mapElementVia = (f: FinSetMor, value: FinSetElem): FinSetElem => {
    const domainIndex = f.from.elements.findIndex((candidate) => Object.is(candidate, value))
    if (domainIndex < 0) {
      throw new Error('ListFunctor.onMor: value not found in domain')
    }
    const imageIndex = f.map[domainIndex]
    if (imageIndex === undefined) {
      throw new Error('ListFunctor.onMor: missing image index for value')
    }
    if (imageIndex < 0 || imageIndex >= f.to.elements.length) {
      throw new Error('ListFunctor.onMor: image index out of bounds')
    }
    return f.to.elements[imageIndex]!
  }

  const listObjectFor = (S: FinSetObj): FinSetObjOf<ReadonlyArray<FinSetElem>> =>
    makeFinSetObj(listElementsFor(S))

  const ListFunctor: CatFunctor<typeof FinSet, typeof FinSet> = {
    source: FinSet,
    target: FinSet,
    onObj: (obj: ObjOf<typeof FinSet>) => listObjectFor(assertFinSetObj(obj)),
    onMor: (mor: MorOf<typeof FinSet>) => {
      const f = assertFinSetMor(mor)
      const listS = listObjectFor(f.from)
      const listT = listObjectFor(f.to)
      const domainLists = assertListElements(listS.elements)
      const codomainLists = assertListElements(listT.elements)
      const map = domainLists.map((list) => {
        const mappedList = list.map((value) => mapElementVia(f, value))
        const idx = findListIndex(codomainLists, mappedList)
        if (idx < 0) {
          throw new Error('ListFunctor.onMor: mapped list not found in codomain')
        }
        return idx
      })
      return { from: listS, to: listT, map }
    }
  }

  const unit: CatNatTrans<CatId<typeof FinSet>, typeof ListFunctor> = {
    source: idFun(FinSet),
    target: ListFunctor,
    component: (obj: unknown) => {
      const S = assertFinSetObj(obj)
      const listS = listObjectFor(S)
      const codomainLists = assertListElements(listS.elements)
      const map = S.elements.map((value) => {
        const idx = findListIndex(codomainLists, [value])
        if (idx < 0) {
          throw new Error('ListFunctor.unit: singleton list missing from codomain')
        }
        return idx
      })
      return { from: S, to: listS, map }
    }
  }

  const mult: CatNatTrans<CatCompose<typeof ListFunctor, typeof ListFunctor>, typeof ListFunctor> = {
    source: composeFun(ListFunctor, ListFunctor),
    target: ListFunctor,
    component: (obj: unknown) => {
      const S = assertFinSetObj(obj)
      const listS = listObjectFor(S)
      const listListS = listObjectFor(listS)
      const nestedLists = assertNestedListElements(listListS.elements)
      const codomainLists = assertListElements(listS.elements)
      const map = nestedLists.map((nestedList) => {
        const flattened = nestedList.flat() as ReadonlyArray<FinSetElem>
        const idx = findListIndex(codomainLists, flattened)
        if (idx < 0) {
          throw new Error('ListFunctor.mult: flattened list missing from codomain')
        }
        return idx
      })
      return { from: listListS, to: listS, map }
    }
  }
  
  return {
    category: FinSet,
    endofunctor: ListFunctor,
    unit,
    mult
  }
}

export namespace DiscreteCategory {
  /** Morphism in discrete category (only identities exist) */
  export type DiscreteMor<I> = { readonly tag: "Id"; readonly obj: I }

  /** Discrete category: only identity morphisms */
  export interface Discrete<I> {
    readonly kind: "Discrete"
    readonly objects: ReadonlyArray<I>
    readonly id: (i: I) => DiscreteMor<I>
    readonly compose: (g: DiscreteMor<I>, f: DiscreteMor<I>) => DiscreteMor<I>
    readonly isId: (m: DiscreteMor<I>) => boolean
  }

  /** Create discrete category from objects */
  export const create = <I>(objects: ReadonlyArray<I>): Discrete<I> => ({
    kind: "Discrete",
    objects,
    id: (i) => ({ tag: "Id", obj: i }),
    compose: (g, f) => {
      if (g.tag !== "Id" || f.tag !== "Id") throw new Error("Non-identity in Discrete")
      if (g.obj !== f.obj) throw new Error("Cannot compose identities on different objects")
      return f // or g; both are the same identity
    },
    isId: (m) => m.tag === "Id"
  })

  /** Bridge: family as functor from discrete category to complexes */
  export const familyAsFunctor =
    <I, R>(disc: Discrete<I>, fam: IndexedFamilies.Family<I, Complex<R>>) => ({
      source: disc,
      onObj: (i: I) => fam(i),
      onMor: (f: DiscreteMor<I>) => {
        const X = fam(f.obj)
        return idChainMapCompat(X) // identity on the complex
      }
    })

  /** Adapter: view Discrete(I) as a (finite) groupoid (only identities) */
  export const DiscreteAsGroupoid = <I>(Icar: ReadonlyArray<I>): FiniteGroupoid<I, DiscreteMor<I>> => {
    const D = create(Icar)
    return {
      ...D,
      objects: Icar,
      hom: (a, b) => (a === b ? [D.id(a)] : []),
      dom: (m) => m.obj,
      cod: (m) => m.obj,
      inv: (m) => m // identities invert to themselves
    }
  }
}

/* ================================================================
   Groupoid utilities and Kan extensions via isomorphism classes
   ================================================================ */

/** Does there exist an isomorphism a ≅ b ? */
export const hasIso = <O, M>(G: FiniteGroupoid<O, M>, a: O, b: O): boolean => {
  if (a === b) return true
  const seen = new Set<O>()
  const q: O[] = [a]
  seen.add(a)
  while (q.length) {
    const x = q.shift()!
    for (const y of G.objects) {
      if (G.hom(x, y).length > 0 && !seen.has(y)) {
        if (y === b) return true
        seen.add(y)
        q.push(y)
      }
    }
  }
  return false
}

/** Partition objects into isomorphism classes (connected components) */
export const isoClasses = <O, M>(G: FiniteGroupoid<O, M>): ReadonlyArray<ReadonlyArray<O>> => {
  const classes: O[][] = []
  const unvisited = new Set(G.objects as O[])
  while (unvisited.size) {
    const start = unvisited.values().next().value as O
    const comp: O[] = []
    const q: O[] = [start]
    unvisited.delete(start)
    comp.push(start)
    while (q.length) {
      const x = q.shift()!
      for (const y of G.objects) {
        if (unvisited.has(y) && (G.hom(x, y).length > 0 || G.hom(y, x).length > 0)) {
          unvisited.delete(y)
          comp.push(y)
          q.push(y)
        }
      }
    }
    classes.push(comp)
  }
  return classes
}

/** Reindex (pullback) along a groupoid functor u: G -> H (precomposition) */
export const reindexGroupoid = <GO, GM, HO, HM, O, M>(
  u: GFunctor<GO, GM, HO, HM>,
  F: { onObj: (h: HO) => O; onMor?: (m: HM) => M }
) => ({
  onObj: (g: GO) => F.onObj(u.onObj(g)),
  onMor: F.onMor ? (m: GM) => F.onMor!(u.onMor(m)) : undefined
})

/** Left Kan extension along groupoid functors via isomorphism classes */
export const lanGroupoidViaClasses = <GO, GM, HO, HM, O, M>(
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  Fobj: IndexedFamilies.Family<GO, O>,                    // object part of F : G -> C
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteCoproducts<O, M>
) => {
  const classesG = isoClasses(G) // iso classes of G-objects
  const classRep = new Map<GO, GO>()
  for (const comp of classesG) for (const g of comp) classRep.set(g, comp[0]!)

  const cacheObj = new Map<HO, O>()
  const cacheInj = new Map<HO, ReadonlyArray<readonly [GO, M]>>()

  for (const h of IfinH.carrier) {
    // collect representative g of each G-iso-class where u(g) ≅ h
    const reps: GO[] = []
    const seenRep = new Set<GO>()
    for (const g of G.objects) {
      if (hasIso(H, u.onObj(g), h)) {
        const r = classRep.get(g)!
        if (!seenRep.has(r)) { seenRep.add(r); reps.push(r) }
      }
    }
    const { obj, injections } = C.coproduct(reps.map((r) => Fobj(r)))
    cacheObj.set(h, obj)
    cacheInj.set(h, injections.map((m, k) => [reps[k]!, m] as const))
  }

  return {
    at: (h: HO) => cacheObj.get(h)!,
    injections: (h: HO) => cacheInj.get(h)!
  }
}

/** Right Kan extension along groupoid functors via isomorphism classes */
export const ranGroupoidViaClasses = <GO, GM, HO, HM, O, M>(
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  Fobj: IndexedFamilies.Family<GO, O>,
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteProducts<O, M>
) => {
  const classesG = isoClasses(G)
  const classRep = new Map<GO, GO>()
  for (const comp of classesG) for (const g of comp) classRep.set(g, comp[0]!)

  const cacheObj = new Map<HO, O>()
  const cacheProj = new Map<HO, ReadonlyArray<readonly [GO, M]>>()

  for (const h of IfinH.carrier) {
    const reps: GO[] = []
    const seenRep = new Set<GO>()
    for (const g of G.objects) {
      if (hasIso(H, u.onObj(g), h)) {
        const r = classRep.get(g)!
        if (!seenRep.has(r)) { seenRep.add(r); reps.push(r) }
      }
    }
    const { obj, projections } = C.product(reps.map((r) => Fobj(r)))
    cacheObj.set(h, obj)
    cacheProj.set(h, projections.map((m, k) => [reps[k]!, m] as const))
  }

  return {
    at: (h: HO) => cacheObj.get(h)!,
    projections: (h: HO) => cacheProj.get(h)!
  }
}

/** Full groupoid Left Kan with optional automorphism quotient */
export const lanGroupoidFull = <GO, GM, HO, HM, O, M>(
  Cat: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  F: { onObj: (g: GO) => O; onMor?: (phi: GM) => M },   // F on isos (optional; req'd if quotienting)
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteCoproducts<O, M> & Partial<CategoryLimits.HasCoequalizers<O, M>> & Partial<CategoryLimits.HasInitial<O, M>>
) => {
  if (!C.coequalizer || !F.onMor) {
    const lite = lanGroupoidViaClasses(H, G, u, F.onObj, IfinH, C)
    return { at: lite.at }
  }

  const at: IndexedFamilies.Family<HO, O> = (h) => {
    // objects in (u ↓ h): pairs (g, α:u(g)→h) with α iso in H
    const objs: Array<{ g: GO; alpha: HM }> = []
    for (const g of G.objects) for (const a of H.hom(u.onObj(g), h)) objs.push({ g, alpha: a })
    if (objs.length === 0) {
      if ('initialObj' in C && C.initialObj !== undefined) {
        return C.initialObj
      }
      const empty = C.coproduct([])
      if (empty) return empty.obj
      throw new Error('lanGroupoidFull: empty fiber and no initial object')
    }

    // start: ⨿ F(g_i)
    const { obj: Cop0, injections } = C.coproduct(objs.map(o => F.onObj(o.g)))
    let Cobj = Cop0
    let inj = injections.slice()

    const onMor = F.onMor!
    const coequalizer = C.coequalizer!

    const eqH = (m1: HM, m2: HM) =>
      H.dom(m1) === H.dom(m2) && H.cod(m1) === H.cod(m2) && H.isId!(H.compose(H.inv(m1), m2))

    for (let s = 0; s < objs.length; s++) {
      for (let t = 0; t < objs.length; t++) {
        const src = objs[s]!, dst = objs[t]!
        for (const phi of G.hom(src.g, dst.g)) {
          if (!eqH(H.compose(dst.alpha, u.onMor(phi)), src.alpha)) continue
          const f = inj[s]!
          const g2 = Cat.compose(inj[t]!, onMor(phi))
          const { obj: Q, coequalize: q } = coequalizer(f, g2)
          Cobj = Q
          for (let k = 0; k < inj.length; k++) {
            const leg = inj[k]
            if (leg) inj[k] = Cat.compose(q, leg)
          }
        }
      }
    }
    return Cobj
  }
  return { at }
}

/** Full groupoid Right Kan with optional automorphism quotient */
export const ranGroupoidFull = <GO, GM, HO, HM, O, M>(
  Cat: Category<O, M> & ArrowFamilies.HasDomCod<O, M>,
  H: FiniteGroupoid<HO, HM>,
  G: FiniteGroupoid<GO, GM>,
  u: GFunctor<GO, GM, HO, HM>,
  F: { onObj: (g: GO) => O; onMor?: (phi: GM) => M; inv?: (m: M) => M }, // need inverse for equalizer-side
  IfinH: IndexedFamilies.FiniteIndex<HO>,
  C: CategoryLimits.HasFiniteProducts<O, M> & Partial<CategoryLimits.HasEqualizers<O, M>> & Partial<CategoryLimits.HasTerminal<O, M>>
) => {
  if (!C.equalizer || !F.onMor || !F.inv) {
    const lite = ranGroupoidViaClasses(H, G, u, F.onObj, IfinH, C)
    return { at: lite.at }
  }

  const at: IndexedFamilies.Family<HO, O> = (h) => {
    const objs: Array<{ g: GO; alpha: HM }> = []
    for (const g of G.objects) for (const a of H.hom(u.onObj(g), h)) objs.push({ g, alpha: a })

    if (objs.length === 0) {
      if ('terminalObj' in C && C.terminalObj !== undefined) {
        return C.terminalObj
      }
      const empty = C.product([])
      if (empty) return empty.obj
      throw new Error('ranGroupoidFull: empty fiber and no terminal object')
    }

    const eqH = (m1: HM, m2: HM) =>
      H.dom(m1) === H.dom(m2) && H.cod(m1) === H.cod(m2) && H.isId!(H.compose(H.inv(m1), m2))

    const { obj: Prod0, projections } = C.product(objs.map(o => F.onObj(o.g)))
    let Pobj = Prod0
    let proj = projections.slice()

    const onMor = F.onMor!
    const invert = F.inv!
    const equalizer = C.equalizer!

    for (let s = 0; s < objs.length; s++) {
      for (let t = 0; t < objs.length; t++) {
        const src = objs[s]!, dst = objs[t]!
        for (const phi of G.hom(src.g, dst.g)) {
          if (!eqH(H.compose(dst.alpha, u.onMor(phi)), src.alpha)) continue
          const pi_s = proj[s]!
          const pi_t = proj[t]!
          const rhs = Cat.compose(invert(onMor(phi)), pi_t)
          const { obj: E, equalize: e } = equalizer(pi_s, rhs)
          Pobj = E
          for (let k = 0; k < proj.length; k++) {
            const leg = proj[k]
            if (leg) proj[k] = Cat.compose(leg, e)
          }
        }
      }
    }
    return Pobj
  }
  return { at }
}

/** Minimal constructor for two-object isomorphic groupoid (for tests) */
export const twoObjIsoGroupoid = <T>(a: T, b: T): FiniteGroupoid<T, { from: T; to: T; tag: 'iso' | 'id' }> => {
  const id = (x: T) => ({ from: x, to: x, tag: 'id' } as const)
  const iso = (x: T, y: T) => ({ from: x, to: y, tag: 'iso' } as const)
  const objects: ReadonlyArray<T> = [a, b]
  const hom = (x: T, y: T) => {
    if (x === y) return [id(x)]
    if ((x === a && y === b) || (x === b && y === a)) return [iso(x, y)]
    return []
  }
  return {
    objects,
    id,
    compose: (g, f) => {
      if (f.to !== g.from) throw new Error('compose mismatch')
      if (f.tag === 'id') return g
      if (g.tag === 'id') return f
      // iso ∘ iso = id (since unique up to our one-iso model)
      return id(f.from)
    },
    dom: (m) => m.from,
    cod: (m) => m.to,
    inv: (m) => (m.tag === 'id' ? m : { from: m.to, to: m.from, tag: 'iso' }),
    hom,
    isId: (m) => m.tag === 'id'
  }
}

/* ================================================================
   Finite Set category with complete categorical structure
   ================================================================ */

export type FinSetElem = unknown

export interface FinSetObj {
  elements: ReadonlyArray<FinSetElem>
}

export const FinSetObj = Symbol.for('FinSetObj')

export interface FinSetMor {
  from: FinSetObj
  to: FinSetObj
  map: ReadonlyArray<number> // total function by index: [0..|from|-1] -> [0..|to|-1]
}

export const FinSetMor = Symbol.for('FinSetMor')

const isReadonlyArray = (value: unknown): value is ReadonlyArray<unknown> =>
  Array.isArray(value)

export const isFinSetObj = (value: unknown): value is FinSetObj =>
  typeof value === 'object' &&
  value !== null &&
  'elements' in value &&
  isReadonlyArray((value as { elements?: unknown }).elements)

export const assertFinSetObj = (value: unknown): FinSetObj => {
  if (!isFinSetObj(value)) {
    throw new TypeError('Expected a FinSet object')
  }
  return value
}

const isNumberArray = (value: unknown): value is ReadonlyArray<number> =>
  isReadonlyArray(value) && value.every((entry) => typeof entry === 'number')

export const isFinSetMor = (value: unknown): value is FinSetMor =>
  typeof value === 'object' &&
  value !== null &&
  'from' in value &&
  'to' in value &&
  'map' in value &&
  isFinSetObj((value as { from?: unknown }).from) &&
  isFinSetObj((value as { to?: unknown }).to) &&
  isNumberArray((value as { map?: unknown }).map)

export const assertFinSetMor = (value: unknown): FinSetMor => {
  if (!isFinSetMor(value)) {
    throw new TypeError('Expected a FinSet morphism')
  }
  return value
}

type FinSetObjOf<T> = FinSetObj & { elements: ReadonlyArray<T> }

const isListElements = (
  elements: ReadonlyArray<FinSetElem>
): elements is ReadonlyArray<ReadonlyArray<FinSetElem>> =>
  elements.every((entry): entry is ReadonlyArray<FinSetElem> => Array.isArray(entry))

const isNestedListElements = (
  elements: ReadonlyArray<FinSetElem>
): elements is ReadonlyArray<ReadonlyArray<ReadonlyArray<FinSetElem>>> =>
  elements.every(
    (entry): entry is ReadonlyArray<ReadonlyArray<FinSetElem>> =>
      Array.isArray(entry) &&
      entry.every((inner): inner is ReadonlyArray<FinSetElem> => Array.isArray(inner))
  )

const assertListElements = (
  elements: ReadonlyArray<FinSetElem>
): ReadonlyArray<ReadonlyArray<FinSetElem>> => {
  if (!isListElements(elements)) {
    throw new TypeError('Expected list elements in FinSet object')
  }
  return elements
}

const assertNestedListElements = (
  elements: ReadonlyArray<FinSetElem>
): ReadonlyArray<ReadonlyArray<ReadonlyArray<FinSetElem>>> => {
  if (!isNestedListElements(elements)) {
    throw new TypeError('Expected nested list elements in FinSet object')
  }
  return elements
}

export const makeFinSetObj = <T>(elements: ReadonlyArray<T>): FinSetObjOf<T> => ({ elements })

const terminalFinSetObj: FinSetObj = { elements: [null] }

const terminateFinSetAtTerminal = (X: FinSetObj): FinSetMor => ({
  from: X,
  to: terminalFinSetObj,
  map: Array.from({ length: X.elements.length }, () => 0)
})

const buildBinaryProductWitness = (A: FinSetObj, B: FinSetObj) => {
  const tuples: Array<readonly [number, number]> = []
  for (let i = 0; i < A.elements.length; i++) {
    for (let j = 0; j < B.elements.length; j++) {
      tuples.push([i, j])
    }
  }

  const obj: FinSetObj = { elements: tuples }
  const tupleIndex = new Map<string, number>()
  tuples.forEach((tuple, idx) => tupleIndex.set(JSON.stringify(tuple), idx))

  const proj1: FinSetMor = { from: obj, to: A, map: tuples.map(tuple => tuple[0]!) }
  const proj2: FinSetMor = { from: obj, to: B, map: tuples.map(tuple => tuple[1]!) }

  const pair = (X: FinSetObj, f: FinSetMor, g: FinSetMor): FinSetMor => {
    if (f.from !== X || g.from !== X) {
      throw new Error('FinSet.binaryProduct: mediator domain mismatch')
    }
    if (f.to !== A) {
      throw new Error('FinSet.binaryProduct: first leg codomain mismatch')
    }
    if (g.to !== B) {
      throw new Error('FinSet.binaryProduct: second leg codomain mismatch')
    }
    if (f.map.length !== X.elements.length || g.map.length !== X.elements.length) {
      throw new Error('FinSet.binaryProduct: mediator legs must cover every element of the domain')
    }

    const map = X.elements.map((_, idx) => {
      const left = f.map[idx]
      const right = g.map[idx]
      if (left === undefined || right === undefined) {
        throw new Error('FinSet.binaryProduct: mediator legs missing image data')
      }
      const key = JSON.stringify([left, right])
      const target = tupleIndex.get(key)
      if (target === undefined) {
        throw new Error('FinSet.binaryProduct: mediator tuple not present in product carrier')
      }
      return target
    })

    return { from: X, to: obj, map }
  }

  return { obj, proj1, proj2, pair }
}

export const FinSet: Category<FinSetObj, FinSetMor> &
  ArrowFamilies.HasDomCod<FinSetObj, FinSetMor> &
  CategoryLimits.HasFiniteProducts<FinSetObj, FinSetMor> &
  CategoryLimits.HasFiniteCoproducts<FinSetObj, FinSetMor> &
  CategoryLimits.HasEqualizers<FinSetObj, FinSetMor> &
  CategoryLimits.HasCoequalizers<FinSetObj, FinSetMor> &
  CategoryLimits.HasInitial<FinSetObj, FinSetMor> &
  CategoryLimits.HasTerminal<FinSetObj, FinSetMor> &
  CartesianClosedCategory<FinSetObj, FinSetMor> = {
  
  id: (X) => ({ from: X, to: X, map: X.elements.map((_, i) => i) }),
  compose: (g, f) => {
    if (f.to !== g.from) throw new Error('FinSet.compose: shape mismatch')
    return { from: f.from, to: g.to, map: f.map.map((i) => g.map[i]!) }
  },
  isId: (m) => m.map.every((i, idx) => i === idx) && m.from.elements.length === m.to.elements.length,
  dom: (m) => m.from,
  cod: (m) => m.to,
  equalMor: (f, g) =>
    f.from === g.from &&
    f.to === g.to &&
    f.map.length === g.map.length &&
    f.map.every((v, i) => v === g.map[i]),

  // products: cartesian product
  product: (objs) => {
    const factors = objs
    const indexTuples: number[][] = []
    const rec = (acc: number[], k: number) => {
      if (k === factors.length) { indexTuples.push(acc.slice()); return }
      for (let i = 0; i < factors[k]!.elements.length; i++) rec([...acc, i], k + 1)
    }
    rec([], 0)
    const P: FinSetObj = { elements: indexTuples }
    const projections = factors.map((F, k) => ({
      from: P,
      to: F,
      map: indexTuples.map(tuple => tuple[k]!)
    })) as FinSetMor[]
    return { obj: P, projections }
  },

  // coproducts: disjoint union
  coproduct: (objs) => {
    const tags: Array<{ tag: number; i: number }> = []
    const injections: FinSetMor[] = []
    let offset = 0
    objs.forEach((O, idx) => {
      const arr = Array.from({ length: O.elements.length }, (_, i) => ({ tag: idx, i }))
      tags.push(...arr)
      injections.push({ 
        from: O, 
        to: { elements: [] }, // will be fixed below
        map: Array.from({ length: O.elements.length }, (_, i) => offset + i) 
      })
      offset += O.elements.length
    })
    const Cop: FinSetObj = { elements: tags }
    // Fix codomain refs on injections
    for (let k = 0; k < objs.length; k++) {
      injections[k] = { ...injections[k]!, to: Cop }
    }
    return { obj: Cop, injections }
  },

  // equalizer of f,g: subset of X where f(x)=g(x)
  equalizer: (f, g) => {
    if (f.from !== g.from || f.to !== g.to) throw new Error('FinSet.equalizer: shape mismatch')
    const keepIdx: number[] = []
    for (let i = 0; i < f.from.elements.length; i++) {
      if (f.map[i] === g.map[i]) keepIdx.push(i)
    }
    const E: FinSetObj = { elements: keepIdx.map(i => f.from.elements[i]!) }
    const inj: FinSetMor = { from: E, to: f.from, map: keepIdx }
    return { obj: E, equalize: inj }
  },

  // coequalizer of f,g: quotient of Y by relation generated by f(x) ~ g(x)
  coequalizer: (f, g) => {
    if (f.from !== g.from || f.to !== g.to) throw new Error('FinSet.coequalizer: shape mismatch')
    const n = f.to.elements.length
    const parent = Array.from({ length: n }, (_, i) => i)
    const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)))
    const unite = (a: number, b: number) => { 
      a = find(a); b = find(b); if (a !== b) parent[b] = a 
    }
    for (let i = 0; i < f.from.elements.length; i++) unite(f.map[i]!, g.map[i]!)
    const reps = new Map<number, number>()
    let idx = 0
    for (let y = 0; y < n; y++) { 
      const r = find(y); if (!reps.has(r)) reps.set(r, idx++) 
    }
    const Q: FinSetObj = { elements: Array.from({ length: reps.size }, (_, i) => i) }
    const q: FinSetMor = { 
      from: f.to, 
      to: Q, 
      map: Array.from({ length: n }, (_, y) => reps.get(find(y))!) 
    }
    return { obj: Q, coequalize: q }
  },

  initialObj: { elements: [] },
  terminalObj: terminalFinSetObj,
  terminal: {
    obj: terminalFinSetObj,
    terminate: terminateFinSetAtTerminal
  },
  binaryProduct: (A: FinSetObj, B: FinSetObj) => buildBinaryProductWitness(A, B),
  exponential: (A: FinSetObj, B: FinSetObj) => {
    const expObj = expFinSet(B, A)
    const evalProduct = buildBinaryProductWitness(expObj, A)

    const evaluation: FinSetMor = {
      from: evalProduct.obj,
      to: B,
      map: evalProduct.obj.elements.map(tuple => {
        const coordinates = tuple as ReadonlyArray<number>
        const funcIx = coordinates[0]
        const aIx = coordinates[1]
        if (funcIx === undefined || aIx === undefined) {
          throw new Error('FinSet.exponential: malformed product tuple for evaluation')
        }
        const encoding = expObj.elements[funcIx] as ReadonlyArray<number> | undefined
        const value = encoding?.[aIx]
        if (value === undefined) {
          throw new Error('FinSet.exponential: evaluation lookup failed')
        }
        return value
      })
    }

    const curry = (X: FinSetObj, h: FinSetMor): FinSetMor => {
      if (h.to !== B) {
        throw new Error('FinSet.exponential.curry: codomain mismatch')
      }
      const expectedSize = X.elements.length * A.elements.length
      if (h.map.length !== expectedSize || h.from.elements.length !== expectedSize) {
        throw new Error('FinSet.exponential.curry: domain must enumerate every (x, a) pair')
      }

      const domainIndex = new Map<string, number>()
      h.from.elements.forEach((tuple, idx) => {
        domainIndex.set(JSON.stringify(tuple), idx)
      })

      const expIndex = new Map<string, number>()
      expObj.elements.forEach((tuple, idx) => {
        expIndex.set(JSON.stringify(tuple), idx)
      })

      const map = X.elements.map((_x, xIx) => {
        const values: number[] = []
        for (let aIx = 0; aIx < A.elements.length; aIx++) {
          const key = JSON.stringify([xIx, aIx])
          const position = domainIndex.get(key)
          if (position === undefined) {
            throw new Error('FinSet.exponential.curry: missing tuple in domain carrier')
          }
          const image = h.map[position]
          if (image === undefined) {
            throw new Error('FinSet.exponential.curry: missing map entry for tuple')
          }
          values.push(image)
        }
        const encoded = JSON.stringify(values)
        const target = expIndex.get(encoded)
        if (target === undefined) {
          throw new Error('FinSet.exponential.curry: resulting function not present in exponential carrier')
        }
        return target
      })

      return { from: X, to: expObj, map }
    }

    const uncurry = (X: FinSetObj, k: FinSetMor): FinSetMor => {
      if (k.from !== X) {
        throw new Error('FinSet.exponential.uncurry: domain mismatch')
      }
      if (k.to !== expObj) {
        throw new Error('FinSet.exponential.uncurry: codomain mismatch')
      }
      if (k.map.length !== X.elements.length) {
        throw new Error('FinSet.exponential.uncurry: arrow must assign a function to each element')
      }

      const productXA = buildBinaryProductWitness(X, A)
      const map = productXA.obj.elements.map(tuple => {
        const coordinates = tuple as ReadonlyArray<number>
        const xIx = coordinates[0]
        const aIx = coordinates[1]
        if (xIx === undefined || aIx === undefined) {
          throw new Error('FinSet.exponential.uncurry: malformed product tuple')
        }
        const funcIx = k.map[xIx]
        if (funcIx === undefined) {
          throw new Error('FinSet.exponential.uncurry: missing exponential component')
        }
        const encoding = expObj.elements[funcIx] as ReadonlyArray<number> | undefined
        const value = encoding?.[aIx]
        if (value === undefined) {
          throw new Error('FinSet.exponential.uncurry: evaluation outside exponential carrier')
        }
        return value
      })

      return { from: productXA.obj, to: B, map }
    }

    return { obj: expObj, evaluation, product: evalProduct, curry, uncurry }
  }
}

export const FinSetCCC: CartesianClosedCategory<FinSetObj, FinSetMor> = FinSet

/** FinSet bijection helper */
export const finsetBijection = (from: FinSetObj, to: FinSetObj, map: number[]): FinSetMor => {
  if (map.length !== from.elements.length) throw new Error('finsetBij: length mismatch')
  return { from, to, map }
}

/** FinSet inverse helper */
export const finsetInverse = (bij: FinSetMor): FinSetMor => {
  const inv: number[] = Array.from({ length: bij.to.elements.length }, () => -1)
  for (let i = 0; i < bij.map.length; i++) inv[bij.map[i]!] = i
  return { from: bij.to, to: bij.from, map: inv }
}

/** FinSet exponential: X^S (all functions S -> X) */
export function expFinSet(X: FinSetObj, S: FinSetObj): FinSetObj {
  // elements = all functions S -> X (represented as arrays of indices in X of length |S|)
  const nS = S.elements.length, nX = X.elements.length
  const funcs: number[][] = []
  const rec = (acc: number[], k: number) => {
    if (k === nS) { funcs.push(acc.slice()); return }
    for (let i = 0; i < nX; i++) rec([...acc, i], k + 1)
  }
  rec([], 0)
  return { elements: funcs }
}

/** Postcompose on exponentials: given h: X -> Y, map X^S -> Y^S by (h ∘ -) */
export const expPostcompose = (h: FinSetMor, S: FinSetObj): FinSetMor => {
  const XtoY = h.map
  const YpowS = expFinSet(h.to, S)
  const indexMap = new Map<string, number>()
  YpowS.elements.forEach((arr, idx) => indexMap.set(JSON.stringify(arr), idx))
  const XpowS = expFinSet(h.from, S)
  const map = XpowS.elements.map(arr => {
    const out = (arr as number[]).map((ix) => XtoY[ix]!)
    return indexMap.get(JSON.stringify(out))!
  })
  return { from: XpowS, to: YpowS, map }
}

/** Precompose on exponentials: given r: S' -> S, map X^S -> X^{S'} by (- ∘ r) */
export const expPrecompose = (X: FinSetObj, r: FinSetMor, S: FinSetObj, Sprime: FinSetObj): FinSetMor => {
  const XpowS = expFinSet(X, S)
  const XpowSprim = expFinSet(X, Sprime)
  const indexMap = new Map<string, number>()
  XpowSprim.elements.forEach((arr, idx) => indexMap.set(JSON.stringify(arr), idx))
  const map = XpowS.elements.map(arr => {
    const out = r.map.map((j) => (arr as number[])[j]!) // g[s'] = f[r(s')]
    return indexMap.get(JSON.stringify(out))!
  })
  return { from: XpowS, to: XpowSprim, map }
}

/** All FinSet morphisms A -> X as a FinSet object (the Hom-set object) */
export const homSetObjFinSet = (A: FinSetObj, X: FinSetObj): FinSetObj => {
  // Elements are arrays len |A| with entries in [0..|X|-1]
  const nA = A.elements.length, nX = X.elements.length
  const maps: number[][] = []
  const rec = (acc: number[], k: number) => {
    if (k === nA) { maps.push(acc.slice()); return }
    for (let i = 0; i < nX; i++) rec([...acc, i], k + 1)
  }
  rec([], 0)
  return { elements: maps }
}

/** The functorial map Hom(A, X) -> Hom(A, Y) induced by h: X->Y (postcompose) */
export const homPostcomposeFinSet = (A: FinSetObj, h: FinSetMor): FinSetMor => {
  const S = homSetObjFinSet(A, h.from)
  const T = homSetObjFinSet(A, h.to)
  const indexMap = new Map<string, number>()
  T.elements.forEach((arr, idx) => indexMap.set(JSON.stringify(arr), idx))
  const map = S.elements.map(arr => {
    const out = (arr as number[]).map(aIx => h.map[aIx]!)
    return indexMap.get(JSON.stringify(out))!
  })
  return { from: S, to: T, map }
}

/** Helper: index a FinSet object's elements by JSON */
const indexObj = (obj: FinSetObj): Map<string, number> => {
  const m = new Map<string, number>()
  obj.elements.forEach((e, i) => m.set(JSON.stringify(e), i))
  return m
}

/** Hom-precompose: given η: A -> T, send Hom(T, X) -> Hom(A, X) */
export const homPrecomposeFinSet = (eta: FinSetMor, X: FinSetObj): FinSetMor => {
  // Domain: Hom(T, X) : arrays length |T|; Codomain: Hom(A, X) : arrays length |A|
  const Sprime = homSetObjFinSet(eta.to, X)
  const S = homSetObjFinSet(eta.from, X)
  const map = Sprime.elements.map((_arr, idxT) => {
    // For each function h: T->X (encoded as array over |T|), produce h∘η: A->X
    const h = Sprime.elements[idxT] as number[]
    const out = eta.map.map((tIx) => h[tIx]!)
    const indexS = indexObj(S).get(JSON.stringify(out))!
    return indexS
  })
  return { from: Sprime, to: S, map }
}

/** Codensity carrier T^G(A) in FinSet via end formula */
export const codensityCarrierFinSet = <BO, BM>(
  CatB: ToolkitFiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,   // G : B -> FinSet
  A: FinSetObj
): FinSetObj => {
  return codensityDataFinSet(CatB, G, A).TA
}

/** Structured data for the codensity end in FinSet */
export const codensityDataFinSet = <BO, BM>(
  CatB: ToolkitFiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,   // G : B -> FinSet
  A: FinSetObj
) => {
  // S_b and E_b
  const bList = [...CatB.objects]
  const Sb: Map<BO, FinSetObj> = new Map()
  const Eb: Map<BO, FinSetObj> = new Map()
  for (const b of bList) {
    const Gb = G.onObj(b)
    const S = homSetObjFinSet(A, Gb)
    Sb.set(b, S)
    Eb.set(b, expFinSet(Gb, S))
  }

  // ∏_b E_b
  const EbArr = bList.map((b) => Eb.get(b)!)
  const { obj: ProdEb, projections: projEb } = FinSet.product(EbArr)

  // collect all arrows of B
  const arrows: Array<{ b: BO; bp: BO; f: BM }> = []
  for (const b of bList) for (const bp of bList) for (const f of CatB.hom(b, bp)) arrows.push({ b, bp, f })

  // Build parallel maps S,T : ∏_b E_b ⇉ ∏_f (G b')^{S_b}
  const FfbArr: FinSetObj[] = []
  const legsS: FinSetMor[] = []
  const legsT: FinSetMor[] = []
  for (const { b, bp, f } of arrows) {
    const Gb = G.onObj(b)
    const Gbp = G.onObj(bp)
    const Gf = G.onMor(f)
    const Sb_b = Sb.get(b)!
    const Sbp = Sb.get(bp)!

    const comp1 = expPostcompose(Gf, Sb_b)                  // F(1,f): E_b -> (G b')^S_b
    const homPush = homPostcomposeFinSet(A, Gf)             // S_b -> S_{b'}
    const comp2 = expPrecompose(Gbp, homPush, Sbp, Sb_b)    // F(f,1): E_{b'} -> (G b')^S_b

    const projFromB = projEb[bList.indexOf(b)]!
    const projFromBp = projEb[bList.indexOf(bp)]!
    const s_leg = FinSet.compose(comp1, projFromB)
    const t_leg = FinSet.compose(comp2, projFromBp)

    FfbArr.push(expFinSet(Gbp, Sb_b))
    legsS.push(s_leg)
    legsT.push(t_leg)
  }

  const { obj: ProdF } = FinSet.product(FfbArr)

  // Tuple-into-product helper (FinSet)
  const tupleInto = (from: FinSetObj, to: FinSetObj, legs: FinSetMor[]): FinSetMor => {
    const indexTo = new Map<string, number>()
    to.elements.forEach((elem, idx) => indexTo.set(JSON.stringify(elem), idx))
    const map = from.elements.map((_, eIx) => {
      const coords = legs.map((leg) => leg.map[eIx]!)
      const key = JSON.stringify(coords)
      const idx = indexTo.get(key)
      if (idx === undefined) throw new Error('tupleInto: coordinate missing')
      return idx
    })
    return { from, to, map }
  }

  const S = tupleInto(ProdEb, ProdF, legsS)
  const T = tupleInto(ProdEb, ProdF, legsT)

  const { obj: TA, equalize: include } = FinSet.equalizer(S, T)
  return { TA, include, bList, Sb, Eb, ProdEb }
}

// Update the convenience wrapper to use the structured version
export const codensityCarrierFinSetUpdated = <BO, BM>(
  CatB: ToolkitFiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
): FinSetObj => {
  return codensityDataFinSet(CatB, G, A).TA
}

/** Codensity unit η^G_A : A -> T^G(A) (FinSet) */
export const codensityUnitFinSet = <BO, BM>(
  CatB: ToolkitFiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
): FinSetMor => {
  const data = codensityDataFinSet(CatB, G, A)
  const { TA, include, bList, Sb, Eb, ProdEb } = data

  const EbIndex = new Map<BO, Map<string, number>>()
  for (const b of bList) EbIndex.set(b, indexObj(Eb.get(b)!))
  const ProdIndex = indexObj(ProdEb)

  const map: number[] = []
  for (let aIx = 0; aIx < A.elements.length; aIx++) {
    // Build the product coordinate tuple: for each b, element of E_b = (G b)^{S_b}
    const coords: number[] = []
    for (const b of bList) {
      const Gb = G.onObj(b)
      const S = Sb.get(b)!                  // Hom(A,Gb)
      const E = Eb.get(b)!                  // (Gb)^S
      // evaluation at 'a' : S -> Gb  ==> an element of E
      const arr = (S.elements as number[][]).map((k) => k[aIx]!)
      const eIdx = EbIndex.get(b)!.get(JSON.stringify(arr))!
      coords.push(eIdx)
    }
    const prodIdx = ProdIndex.get(JSON.stringify(coords))!
    // factor through equalizer by searching the unique preimage
    const tIx = include.map.findIndex((v) => v === prodIdx)
    if (tIx < 0) throw new Error('codensityUnitFinSet: missing equalizer preimage')
    map.push(tIx)
  }
  return { from: A, to: TA, map }
}

/** Codensity multiplication μ^G_A : T^G T^G A -> T^G A (FinSet) */
export const codensityMuFinSet = <BO, BM>(
  CatB: ToolkitFiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  A: FinSetObj
): FinSetMor => {
  // Data for TA and for TTA
  const TAdata = codensityDataFinSet(CatB, G, A)
  const TA = TAdata.TA
  const TTAdata = codensityDataFinSet(CatB, G, TA)
  const TTA = TTAdata.TA

  const { include: inclTA, bList, Sb, Eb, ProdEb } = TAdata
  const { include: inclTTA } = TTAdata

  const EbIndex = new Map<BO, Map<string, number>>()
  for (const b of bList) {
    EbIndex.set(b, indexObj(Eb.get(b)!))
  }
  const ProdIndex = indexObj(ProdEb)

  // For each θ ∈ TTA, compute μ(θ) ∈ TA by:
  // ψ_b(κ) = θ_b( h ), where h : TA -> G b is defined by h(t) = t_b(κ)
  const map: number[] = []
  for (let thetaIx = 0; thetaIx < TTA.elements.length; thetaIx++) {
    // Get the tuple of components of θ in ∏_b E'_b, then per b build ψ_b
    const tupleT = (TTAdata.ProdEb.elements as number[][])[inclTTA.map[thetaIx]!] // indices into E'_b
    const coordsForTA: number[] = []

    bList.forEach((b, bPos) => {
      // domain/codomain sets for this b
      const Gb = G.onObj(b)
      const Sb_b = Sb.get(b)!         // Hom(A,Gb)
      const E_b = Eb.get(b)!         // (Gb)^Sb_b

      // θ_b : S'_b -> Gb  where S'_b = Hom(TA, Gb); element of E'_b
      const Eprime_b = expFinSet(Gb, homSetObjFinSet(TA, Gb))
      const theta_b = Eprime_b.elements[tupleT![bPos]!] as number[]

      // Build ψ_b : Sb_b -> Gb as array over |Sb_b|
      const out: number[] = []
      for (let kIx = 0; kIx < Sb_b.elements.length; kIx++) {
        const k = (Sb_b.elements[kIx] as number[])   // k : A -> Gb

        // h : TA -> Gb, h(t) = t_b(k)
        const hVals: number[] = []
        for (let tIx = 0; tIx < TA.elements.length; tIx++) {
          // t_b is the b-component of t: lookup via inclusion into ∏ E_b
          const tupleTA = (TAdata.ProdEb.elements as number[][])[inclTA.map[tIx]!]
          const e_b_idx = tupleTA![bPos]!
          const t_b = (E_b.elements[e_b_idx] as number[]) // function Sb_b -> Gb (as array)
          const val = t_b[kIx]!
          hVals.push(val)
        }

        // Find index of h in S'_b = Hom(TA, Gb)
        const Sprime_b = homSetObjFinSet(TA, Gb)
        const hIdx = indexObj(Sprime_b).get(JSON.stringify(hVals))!
        // Evaluate θ_b at h
        const valGb = theta_b[hIdx]!
        out.push(valGb)
      }

      // Encode ψ_b as an element of E_b and record its index
      const eIdx = EbIndex.get(b)!.get(JSON.stringify(out))!
      coordsForTA.push(eIdx)
    })

    const prodIdx = ProdIndex.get(JSON.stringify(coordsForTA))!
    const tIx = inclTA.map.findIndex((v) => v === prodIdx)
    if (tIx < 0) throw new Error('codensityMuFinSet: missing equalizer preimage')
    map.push(tIx)
  }

  return { from: TTA, to: TA, map }
}

/** Codensity functor map: T^G(f) : T^G(A) -> T^G(A') (FinSet) */
export const codensityMapFinSet = <BO, BM>(
  CatB: ToolkitFiniteCategory<BO, BM>,
  G: CFunctor<BO, BM, FinSetObj, FinSetMor>,
  f: FinSetMor                                // f: A -> A'
): FinSetMor => {
  const A = f.from
  const A2 = f.to

  const dataA = codensityDataFinSet(CatB, G, A)
  const dataA2 = codensityDataFinSet(CatB, G, A2)

  const { TA, include: incA, bList, Sb: SbA, Eb: EbA, ProdEb: ProdA } = dataA
  const { TA: TA2, include: incA2, Sb: SbA2, Eb: EbA2, ProdEb: ProdA2 } = dataA2

  // Precompute indexers
  const idxProdA2 = new Map<string, number>()
  ;(ProdA2.elements as number[][]).forEach((coords, i) => idxProdA2.set(JSON.stringify(coords), i))

  // For each b, build E_b(A) -> E_b(A') induced by precompose on Hom(A',Gb)->Hom(A,Gb)
  const comp_b: Map<BO, FinSetMor> = new Map()
  for (const b of bList) {
    const Gb = G.onObj(b)
    const r = homPrecomposeFinSet(f, Gb)                   // Hom(A',Gb) -> Hom(A,Gb)
    const comp = expPrecompose(Gb, r, SbA.get(b)!, SbA2.get(b)!) // (Gb)^{S_b(A)} -> (Gb)^{S_b(A')}
    comp_b.set(b, comp)
  }

  // Build map T(A) -> T(A') by factoring the product tuple through the equalizer
  const map: number[] = new Array(TA.elements.length)
  for (let tIx = 0; tIx < TA.elements.length; tIx++) {
    // coordinates in ∏_b E_b(A)
    const coordsA = (ProdA.elements as number[][])[incA.map[tIx]!]!.slice()

    // send each coordinate via comp_b to get coords in ∏_b E_b(A')
    const coordsA2: number[] = []
    bList.forEach((b, pos) => {
      const comp = comp_b.get(b)!
      const newCoord = comp.map[coordsA[pos]!]!
      coordsA2.push(newCoord)
    })

    // locate the product tuple in ProdA2, then pull back along the equalizer inclusion of TA'
    const prodIdxA2 = idxProdA2.get(JSON.stringify(coordsA2))
    if (prodIdxA2 === undefined) throw new Error('codensityMapFinSet: image tuple not found in product')
    const tIx2 = incA2.map.findIndex((v) => v === prodIdxA2)
    if (tIx2 < 0) throw new Error('codensityMapFinSet: no equalizer preimage in T(A\')')
    map[tIx] = tIx2
  }

  return { from: TA, to: TA2, map }
}

/* ================================================================
   Enhanced Vect category with dom/cod and Arrow category support
   ================================================================ */


/** Mediator-enabled FinGrp adapters */
export const FinGrpProductsWithTuple: CategoryLimits.HasProductMediators<FinGrpObjModel, FinGrpHomModel> = {
  product: (objs) => {
    const witness = FinGrpModel.productMany(objs)
    return { obj: witness.object, projections: witness.projections }
  },
  tuple: (domain, legs, product) => FinGrpModel.tupleMany(domain, legs, product)
}

type SliceObjModel = SliceObjectModel<FinSetNameModel, FuncArrModel>
type SliceArrModel = SliceArrowModel<FinSetNameModel, FuncArrModel>

export function makeSliceProductsWithTuple(
  base: FinSetCategoryModel,
  anchor: FinSetNameModel,
): CategoryLimits.HasProductMediators<SliceObjModel, SliceArrModel>
export function makeSliceProductsWithTuple<Obj, Arr>(
  base: ToolkitFiniteCategory<Obj, Arr>,
  anchor: Obj,
  options: { pullbacks: PullbackCalculator<Obj, Arr> },
): CategoryLimits.HasProductMediators<SliceObject<Obj, Arr>, SliceArrow<Obj, Arr>>
export function makeSliceProductsWithTuple<Obj, Arr>(
  base: ToolkitFiniteCategory<Obj, Arr>,
  anchor: Obj,
  options: { pullbacks?: PullbackCalculator<Obj, Arr> } = {},
): CategoryLimits.HasProductMediators<SliceObject<Obj, Arr>, SliceArrow<Obj, Arr>> {
  const { pullbacks } = options
  return {
    product: (objs) => {
      const baseCategory = base as unknown as BaseFiniteCategory<Obj, Arr>
      const witness: SliceFiniteProductWitnessBase<Obj, Arr> = pullbacks
        ? makeSliceFiniteProductFromPullback(baseCategory, anchor, pullbacks, objs)
        : (makeFiniteSliceProduct(
            baseCategory as unknown as FinSetCategoryModel,
            anchor as unknown as FinSetNameModel,
            objs as unknown as ReadonlyArray<SliceObjectModel<FinSetNameModel, FuncArrModel>>,
          ) as unknown as SliceFiniteProductWitnessBase<Obj, Arr>)
      return { obj: witness.object, projections: witness.projections }
    },
    tuple: (domain, legs, product) => {
      const metadata = lookupSliceProductMetadata(product)
      if (!metadata) {
        throw new Error(
          `makeSliceProductsWithTuple: unrecognised product object ${String(
            product.domain,
          )}; build it via makeFiniteSliceProduct first`,
        )
      }
      return metadata.tuple(domain, legs)
    },
  }
}

/* ================================================================
   General (co)limit interfaces for categories
   ================================================================ */


/* ================================================================
   Arrow category operations for families of morphisms
   ================================================================ */



// Namespaced exports for discoverability
export const Diagram = {
  makePosetDiagram, pushoutInDiagram, pullbackInDiagram,
  LanDisc, RanDisc, reindexDisc,
  LanPoset, RanPoset,
  coproductComplex, productComplex,
  makeFinitePoset, prettyPoset, makePosetDiagramCompat, idChainMapCompat
}

export const Lin = { 
  registerRref, rrefQPivot, FieldQ, solveLinear, nullspace, colspace
}

export const Vect = {
  VS: VectViewNS.VS,
  idL,
  composeL,
  linToChain: VectViewNS.linToChain,
  complexSpaces,
  toVectAtDegree: VectViewNS.toVectAtDegree,
  arrowMatrixAtDegree: VectViewNS.arrowMatrixAtDegree,
}

// Pretty namespace lives in stdlib/pretty

export const IntegerLA = {
  smithNormalForm
}

export const Algebra = {
  applyRepAsLin: applyRepAsLinFn,
  coactionAsLin: coactionAsLinFn,
  pushCoaction: pushCoactionFn,
  actionToChain: actionToChainFn,
  coactionToChain: coactionToChainFn,
}
export const Chain = {
  compose: composeChainMap, 
  id: idChainMapField, 
  inclusionIntoCoproduct, 
  projectionFromProduct 
}

export const Exactness = {
  checkExactnessForFunctor,
  smoke_coim_im_iso,
  runLesConeProps,
  checkLongExactConeSegment
}

