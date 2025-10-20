// cone.ts
// Chain maps and the standard mapping cone Cone(f).

import type { Mat } from './allTS'
import { matMul, idMat, zerosMat, matNeg, hcat, vcat } from './allTS'
import type { Complex } from './complex'
import type { Ring } from './ring'

export type ChainMap<R> = {
  readonly S: Ring<R>
  readonly X: Complex<R>
  readonly Y: Complex<R>
  readonly f: Readonly<Record<number, Mat<R>>>   // f_n: X_n -> Y_n
}

export const isChainMap =
  <R>(phi: ChainMap<R>): boolean => {
    const S = phi.S
    const eq = S.eq ?? ((a: R, b: R) => Object.is(a, b))
    for (const n of phi.X.degrees) {
      const fn   = phi.f[n]
      const fnm1 = phi.f[n-1]
      const dXn  = phi.X.d[n]
      const dYn  = phi.Y.d[n]
      if (!fn || !dYn || !dXn || !fnm1) continue
      const left  = matMul(S)(fnm1, dXn)
      const right = matMul(S)(dYn, fn)
      const rows = left.length, cols = rows ? (left[0]?.length ?? 0) : 0
      for (let i=0;i<rows;i++)
        for (let j=0;j<cols;j++)
          if (!eq(left[i]?.[j]!, right[i]?.[j]!)) return false
    }
    return true
  }

// Cone(f): Z with Z_n = Y_n ⊕ X_{n-1}, d_Z = [[dY, f_{n-1}], [0, -dX_{n-1}]]
export const cone =
  <R>(phi: ChainMap<R>): Complex<R> => {
    const S = phi.S
    const degs = Array.from(new Set([
      ...phi.Y.degrees,
      ...phi.X.degrees.map(n => n + 1),
    ])).sort((a,b)=>a-b)

    const dim: Record<number, number> = {}
    const d  : Record<number, Mat<R>> = {}

    for (const n of degs) {
      const dimY   = phi.Y.dim[n]     ?? 0
      const dimXm1 = phi.X.dim[n-1]   ?? 0
      const dimYm1 = phi.Y.dim[n-1]   ?? 0
      const dimXm2 = phi.X.dim[n-2]   ?? 0

      dim[n] = dimY + dimXm1

      const dY    = phi.Y.d[n]     ?? zerosMat(dimYm1, dimY, S)
      const fnm1  = phi.f[n-1]     ?? zerosMat(dimYm1, dimXm1, S)
      const dXm1  = phi.X.d[n-1]   ?? zerosMat(dimXm2, dimXm1, S)
      const m_dXm1= matNeg(S)(dXm1)

      const top   = hcat(dY, fnm1)                           // (Y_{n-1} x (Y_n ⊕ X_{n-1}))
      const botL  = zerosMat(dimXm2, dimY, S)                // (X_{n-2} x Y_n)
      const bot   = hcat(botL, m_dXm1)                       // (X_{n-2} x (Y_n ⊕ X_{n-1}))
      d[n] = vcat(top, bot)                                  // ( (Y_{n-1} ⊕ X_{n-2}) x (Y_n ⊕ X_{n-1}) )
    }

    return { S, degrees: degs, dim, d }
  }

// Helpers often used alongside the cone:
export const inclusionYIntoCone =
  <R>(phi: ChainMap<R>) =>
  (n: number): Mat<R> => {
    const S = phi.S
    const dimY   = phi.Y.dim[n]   ?? 0
    const dimXm1 = phi.X.dim[n-1] ?? 0
    // Y_n → Y_n ⊕ X_{n-1}
    return vcat(idMat(dimY, S), zerosMat(dimXm1, dimY, S))
  }

export const projectionConeToShiftX =
  <R>(phi: ChainMap<R>) =>
  (n: number): Mat<R> => {
    const S = phi.S
    const dimY   = phi.Y.dim[n]   ?? 0
    const dimXm1 = phi.X.dim[n-1] ?? 0
    // Y_n ⊕ X_{n-1} → X[1]_n = X_{n-1}
    return hcat(zerosMat(dimXm1, dimY, S), idMat(dimXm1, S))
  }