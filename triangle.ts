// triangle.ts
// Distinguished triangle from a map and a quick sanity checker.

import type { Mat } from './allTS'
import type { Complex } from './complex'
import { shift1, complexIsValid } from './complex'
import type { ChainMap } from './cone'
import { cone, isChainMap, inclusionYIntoCone, projectionConeToShiftX } from './cone'

export type Triangle<R> = {
  readonly X: Complex<R>
  readonly Y: Complex<R>
  readonly Z: Complex<R>           // Cone(f)
  readonly f: ChainMap<R>
  readonly g: ChainMap<R>          // Y -> Z (inclusion)
  readonly h: ChainMap<R>          // Z -> X[1] (projection)
}

export const triangleFromMap =
  <R>(f: ChainMap<R>): Triangle<R> => {
    const Z  = cone(f)
    const X1 = shift1(f.X)

    // degreewise maps (assembled from helpers)
    const gMaps: Record<number, Mat<R>> = {}
    const hMaps: Record<number, Mat<R>> = {}
    for (const n of Z.degrees) {
      gMaps[n] = inclusionYIntoCone(f)(n)
      hMaps[n] = projectionConeToShiftX(f)(n)
    }

    const g: ChainMap<R> = { S: f.S, X: f.Y, Y: Z,  f: gMaps }
    const h: ChainMap<R> = { S: f.S, X: Z,  Y: X1, f: hMaps }
    return { X: f.X, Y: f.Y, Z, f, g, h }
  }

export const triangleIsSane =
  <R>(T: Triangle<R>): boolean =>
    complexIsValid(T.X) &&
    complexIsValid(T.Y) &&
    complexIsValid(T.Z) &&
    isChainMap(T.f) &&
    isChainMap(T.g) &&
    isChainMap(T.h)