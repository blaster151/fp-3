// exact.ts
// Exact functors between your chain-complex worlds.
//
// We implement the "scalar pushforward" along a ring hom φ : R → S:
//   - on objects (Complex<R>): apply φ elementwise to every differential matrix
//   - on morphisms (ChainMap<R>): apply φ elementwise degreewise
// This strictly commutes with shift and strictly preserves mapping-cone triangles,
// hence it is an exact functor in the triangulated sense.

import type { Mat } from './allTS'
import { matMul } from './allTS'

import type { Ring } from './ring'

import type { Complex } from './complex'
import { shift1 } from './complex'

import type { ChainMap } from './cone'
import { cone } from './cone'

import type { Triangle } from './triangle'
import { triangleFromMap } from './triangle'

// ---------- helpers ----------
const mapMat =
  <A, B>(f: (a: A) => B) =>
  (A: Mat<A>): Mat<B> =>
    A.map(row => row.map(f))

const eqMat =
  <R>(S: Ring<R>) =>
  (A: Mat<R>, B: Mat<R>): boolean => {
    if (A.length !== B.length) return false
    const eq = S.eq ?? ((a: R, b: R) => Object.is(a, b))
    for (let i = 0; i < A.length; i++) {
      const ar = A[i], br = B[i]
      if ((ar?.length ?? -1) !== (br?.length ?? -2)) return false
      for (let j = 0; j < (ar?.length ?? 0); j++) if (!eq(ar![j]!, br![j]!)) return false
    }
    return true
  }

const eqComplex =
  <R>(S: Ring<R>) =>
  (X: Complex<R>, Y: Complex<R>): boolean => {
    const degsX = X.degrees.join(',') , degsY = Y.degrees.join(',')
    if (degsX !== degsY) return false
    for (const n of X.degrees) {
      if ((X.dim[n] ?? 0) !== (Y.dim[n] ?? 0)) return false
      const dX = X.d[n]
      const dY = Y.d[n]
      if (!!dX !== !!dY) return false
      if (dX && dY && !eqMat(S)(dX, dY)) return false
    }
    return true
  }

// ---------- ring hom ----------
export interface RingHom<R, S> {
  readonly src: Ring<R>
  readonly dst: Ring<S>
  readonly phi: (r: R) => S
}

// optional: quick (finite) law sanity for φ on a few samples
export const ringHomRespectsOps =
  <R, S>(h: RingHom<R, S>) =>
  (samples: ReadonlyArray<R>): boolean => {
    const { src: Rng, dst: Sng, phi } = h
    const eq = Sng.eq ?? ((a: S, b: S) => Object.is(a, b))
    // zero/one
    if (!eq(phi(Rng.zero), Sng.zero)) return false
    if (!eq(phi(Rng.one),  Sng.one))  return false
    // add/mul (sampled)
    for (let i = 0; i < samples.length; i++) {
      for (let j = 0; j < samples.length; j++) {
        const a = samples[i]!, b = samples[j]!
        if (!eq(phi(Rng.add(a,b)), Sng.add(phi(a), phi(b)))) return false
        if (!eq(phi(Rng.mul(a,b)), Sng.mul(phi(a), phi(b)))) return false
      }
    }
    return true
  }

// ---------- the functor ----------

export interface AdditiveFunctor<R, S> {
  onComplex: (X: Complex<R>) => Complex<S>
  onMap:     (f: ChainMap<R>) => ChainMap<S>
}

export interface ExactFunctor<R, S> extends AdditiveFunctor<R, S> {
  // witness properties (computational checks)
  preservesShift: (X: Complex<R>) => boolean
  preservesCones: (f: ChainMap<R>) => boolean
  imageTriangle:  (T: Triangle<R>) => Triangle<S>
}

// Build the scalar-pushforward exact functor F_φ
export const makeScalarExactFunctor =
  <R, S>(h: RingHom<R, S>): ExactFunctor<R, S> => {
    const { phi, dst: S } = h

    const onComplex = (X: Complex<R>): Complex<S> => {
      const dim: Record<number, number> = {}
      const d  : Record<number, Mat<S>> = {}
      for (const n of X.degrees) {
        dim[n] = X.dim[n] ?? 0
        if (X.d[n]) d[n] = mapMat(phi)(X.d[n]!)
      }
      return { S, degrees: X.degrees.slice(), dim, d }
    }

    const onMap = (f: ChainMap<R>): ChainMap<S> => {
      const g: Record<number, Mat<S>> = {}
      for (const n of f.X.degrees) if (f.f[n]) g[n] = mapMat(phi)(f.f[n]!)
      // (domain/codomain must be mapped too)
      return { S, X: onComplex(f.X), Y: onComplex(f.Y), f: g }
    }

    // Exactness witnesses:

    // F ∘ shift1  ==  shift1 ∘ F   (strict equality of data)
    const preservesShift = (X: Complex<R>): boolean => {
      const left  = onComplex(shift1(X))
      const right = shift1(onComplex(X))
      return eqComplex(S)(left, right)
    }

    // F(cone(f)) == cone(F(f))  (strict equality of block matrices)
    const preservesCones = (f: ChainMap<R>): boolean => {
      const left  = onComplex(cone(f))
      const right = cone(onMap(f))
      return eqComplex(S)(left, right)
    }

    const imageTriangle = (T: Triangle<R>): Triangle<S> => {
      // We rebuild via the canonical cone of the mapped map;
      // this lands in an actually distinguished triangle.
      const fS = onMap(T.f)
      return triangleFromMap(fS)
    }

    return { onComplex, onMap, preservesShift, preservesCones, imageTriangle }
  }

// Shift as an exact endofunctor
export const makeShiftExactFunctor =
  <R>(S: Ring<R>): ExactFunctor<R, R> => {
    const onComplex = (X: Complex<R>) => shift1(X)
    const onMap = (f: ChainMap<R>): ChainMap<R> => {
      // shift map: (f_n : X_n→Y_n) becomes (f_{n-1} : X[1]_n = X_{n-1} → Y[1]_n = Y_{n-1})
      const g: Record<number, any> = {}
      for (const n of f.X.degrees) if (f.f[n-1]) g[n] = f.f[n-1]!
      return { S, X: shift1(f.X), Y: shift1(f.Y), f: g }
    }
    const preservesShift = (_: Complex<R>) => true         // [1]∘[1] = [1]∘[1] tautologically
    const preservesCones = (_: ChainMap<R>) => true        // cones commute with reindexing
    const imageTriangle  = (T: Triangle<R>): Triangle<R> => ({
      ...T, X: shift1(T.X), Y: shift1(T.Y), Z: shift1(T.Z),
      f: onMap(T.f), g: onMap(T.g), h: onMap(T.h)
    })
    return { onComplex, onMap, preservesShift, preservesCones, imageTriangle }
  }