export namespace IntSNF {
  export type SNF = { U: number[][]; S: number[][]; V: number[][] }

  const clone = (A: ReadonlyArray<ReadonlyArray<number>>): number[][] =>
    A.map(r => r.slice() as number[])

  const egcd = (a: number, b: number) => {
    let r0 = Math.abs(a), r1 = Math.abs(b)
    let s0 = 1, s1 = 0
    let t0 = 0, t1 = 1
    while (r1 !== 0) {
      const q = Math.trunc(r0 / r1)
      ;[r0, r1] = [r1, r0 - q * r1]
      ;[s0, s1] = [s1, s0 - q * s1]
      ;[t0, t1] = [t1, t0 - q * t1]
    }
    const g = r0
    const sign = a < 0 ? -1 : 1
    return { g, x: s0 * sign, y: t0 * sign }
  }

  const swapRowsInt = (M: number[][], i: number, j: number) => {
    const t = M[i]!
    M[i] = M[j]!
    M[j] = t
  }

  const swapColsInt = (M: number[][], i: number, j: number) => {
    for (const r of M) {
      const t = r[i]!
      r[i] = r[j]!
      r[j] = t
    }
  }

  export const smithNormalForm = (A0: ReadonlyArray<ReadonlyArray<number>>): SNF => {
    const m = A0.length
    const n = A0[0]?.length ?? 0
    const A = clone(A0)
    const U = Array.from({ length: m }, (_, i) =>
      Array.from({ length: m }, (_, j) => (i === j ? 1 : 0))
    ) as number[][]
    const V = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
    ) as number[][]

    const addRow = (M: number[][], dst: number, src: number, k: number) => {
      if (!k) return
      for (let j = 0; j < (M[0]?.length ?? 0); j++) {
        M[dst]![j]! += k * M[src]![j]!
      }
    }

    const addCol = (M: number[][], dst: number, src: number, k: number) => {
      if (!k) return
      for (let i0 = 0; i0 < M.length; i0++) {
        M[i0]![dst]! += k * M[i0]![src]!
      }
    }

    let i = 0
    let j = 0

    while (i < m && j < n) {
      let pi = -1
      let pj = -1
      let best = Infinity
      for (let r = i; r < m; r++) {
        for (let c = j; c < n; c++) {
          const v = Math.abs(A[r]![c]!)
          if (v !== 0 && v < best) {
            best = v
            pi = r
            pj = c
          }
        }
      }

      if (best === Infinity) break
      if (pi !== i) {
        swapRowsInt(A, i, pi)
        swapRowsInt(U, i, pi)
      }
      if (pj !== j) {
        swapColsInt(A, j, pj)
        swapColsInt(V, j, pj)
      }

      for (let r = i + 1; r < m; r++) {
        while (A[r]![j] !== 0) {
          const { g, x, y } = egcd(A[i]![j]!, A[r]![j]!)
          const ai = A[i]!.slice()
          const ar = A[r]!.slice()
          for (let c = j; c < n; c++) {
            const u0 = ai[c]!
            const v0 = ar[c]!
            A[i]![c] = x * u0 + y * v0
            A[r]![c] = Math.trunc(-A[r]![j]! / g) * u0 + Math.trunc(A[i]![j]! / g) * v0
          }
          const Ui = U[i]!.slice()
          const Ur = U[r]!.slice()
          for (let c = 0; c < m; c++) {
            const u0 = Ui[c] as number
            const v0 = Ur[c] as number
            U[i]![c] = x * u0 + y * v0
            const coeff1 = Math.trunc(-(ar[j] ?? 0) / g)
            const coeff2 = Math.trunc((ai[j] ?? 0) / g)
            U[r]![c] = coeff1 * u0 + coeff2 * v0
          }
          if (Math.abs(A[i]![j]!) > Math.abs(A[r]![j]!)) {
            swapRowsInt(A, i, r)
            swapRowsInt(U, i, r)
          }
        }
      }

      for (let c = j + 1; c < n; c++) {
        while (A[i]![c] !== 0) {
          const { g, x, y } = egcd(A[i]![j]!, A[i]![c]!)
          const colj = A.map(row => row[j]!)
          const colc = A.map(row => row[c]!)
          for (let r0 = 0; r0 < m; r0++) {
            const u0 = colj[r0]!
            const v0 = colc[r0]!
            A[r0]![j] = x * u0 + y * v0
            A[r0]![c] = Math.trunc(-(colc[i] ?? 0) / g) * u0 + Math.trunc((colj[i] ?? 0) / g) * v0
          }
          const Vj = V.map(row => row[j]!)
          const Vc = V.map(row => row[c]!)
          for (let r0 = 0; r0 < n; r0++) {
            const u0 = Vj[r0] as number
            const v0 = Vc[r0] as number
            V[r0]![j] = x * u0 + y * v0
            const vcoeff1 = Math.trunc(-(colc[i] ?? 0) / g)
            const vcoeff2 = Math.trunc((colj[i] ?? 0) / g)
            V[r0]![c] = vcoeff1 * u0 + vcoeff2 * v0
          }
          if (Math.abs(A[i]![j]!) > Math.abs(A[i]![c]!)) {
            swapColsInt(A, j, c)
            swapColsInt(V, j, c)
          }
        }
      }

      if (A[i]![j]! < 0) {
        for (let c = j; c < n; c++) A[i]![c] = -A[i]![c]!
        for (let c = 0; c < m; c++) U[i]![c] = -U[i]![c]!
      }

      for (let r = i + 1; r < m; r++) {
        if (A[r]![j] !== 0) {
          const k = Math.trunc(A[r]![j]! / A[i]![j]!)
          addRow(A, r, i, -k)
          addRow(U, r, i, -k)
        }
      }
      for (let c = j + 1; c < n; c++) {
        if (A[i]![c] !== 0) {
          const k = Math.trunc(A[i]![c]! / A[i]![j]!)
          addCol(A, c, j, -k)
          addCol(V, c, j, -k)
        }
      }

      i++
      j++
    }

    return { U, S: A, V }
  }

  export const diagonalInvariants = (
    S: ReadonlyArray<ReadonlyArray<number>>
  ): number[] => S.map((row, idx) => row[idx] ?? 0).filter(d => d !== 0)
}
