// complex.ts
// Bounded chain complexes (homological grading), validation, and shift [1].

import type { Mat } from './allTS'
import { matMul, matNeg } from './allTS'
import type { Ring } from './ring'

export type Complex<R> = {
  readonly S: Ring<R>
  readonly degrees: ReadonlyArray<number>                 // sorted, e.g. [-1,0,1]
  readonly dim: Readonly<Record<number, number>>          // dim at degree n (0 ok)
  readonly d:   Readonly<Record<number, Mat<R>>>          // d_n : X_n -> X_{n-1}
}

// Check shapes and d_{n-1} ∘ d_n = 0
export const complexIsValid =
  <R>(C: Complex<R>): boolean => {
    const S = C.S
    const eq = S.eq ?? ((a: R, b: R) => Object.is(a, b))
    for (const n of C.degrees) {
      const dn = C.d[n]
      if (!dn) continue
      const rows = dn.length, cols = dn[0]?.length ?? 0
      if (rows !== (C.dim[n-1] ?? 0) || cols !== (C.dim[n] ?? 0)) return false
      const dn1 = C.d[n-1]
      if (dn1) {
        const comp = matMul(S)(dn1, dn)
        for (const row of comp) for (const x of row) if (!eq(x, S.zero)) return false
      }
    }
    return true
  }

// Shift by +1 (homological): X[1]_n = X_{n-1}, d^{X[1]}_n = - d^X_{n-1}
export const shift1 =
  <R>(C: Complex<R>): Complex<R> => {
    const S = C.S
    const degs = C.degrees.map(n => n + 1)
    const dim: Record<number, number> = {}
    const d: Record<number, Mat<R>> = {}
    for (const n of C.degrees) {
      dim[n+1] = C.dim[n] ?? 0
      if (C.d[n]) d[n+1] = matNeg(S)(C.d[n]!)
    }
    return { S, degrees: degs, dim, d }
  }