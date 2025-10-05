// lin-alg.ts — tiny linear algebra & projections (no external deps)

// Matrix/vector aliases
export type Vec = number[];
export type Mat = number[][]; // row-major

export function zeros(n: number): Vec { return Array(n).fill(0); }
export function zerosMat(r: number, c: number): Mat { return Array.from({length: r}, () => zeros(c)); }

export function copyMat(A: Mat): Mat { return A.map(r => [...r]); }
export function shape(A: Mat): [number, number] { return [A.length, (A[0] ?? []).length]; }

export function matT(A: Mat): Mat {
  const [m,n] = shape(A); const AT = zerosMat(n,m);
  for (let i=0;i<m;i++) for (let j=0;j<n;j++) {
    const Ai = A[i];
    const ATj = AT[j];
    const Aij = Ai?.[j];
    if (ATj && Aij !== undefined) ATj[i] = Aij;
  }
  return AT;
}

export function matMul(A: Mat, B: Mat): Mat {
  const [m,k] = shape(A); const [k2,n] = shape(B); if (k!==k2) throw new Error("matMul dim mismatch");
  const C = zerosMat(m,n);
  for (let i=0;i<m;i++) for (let p=0;p<k;p++) { 
    const Ai = A[i];
    const a = Ai?.[p];
    if (a===undefined || a===0) continue; 
    const Bp = B[p];
    const Ci = C[i];
    if (!Bp || !Ci) continue;
    for (let j=0;j<n;j++) {
      const Bpj = Bp[j];
      if (Bpj !== undefined) Ci[j] = (Ci[j] ?? 0) + a * Bpj;
    }
  }
  return C;
}

export function matVec(A: Mat, x: Vec): Vec {
  const [m,n] = shape(A); if (x.length!==n) throw new Error("matVec dim mismatch");
  const y = zeros(m);
  for (let i=0;i<m;i++) { 
    let s=0;
    const Ai = A[i];
    if (!Ai) continue;
    for (let j=0;j<n;j++) {
      const Aij = Ai[j];
      const xj = x[j];
      if (Aij !== undefined && xj !== undefined) s += Aij * xj;
    }
    y[i]=s;
  }
  return y;
}

export function addVec(a: Vec, b: Vec, s=1) { 
  for (let i=0;i<a.length;i++) {
    const ai = a[i];
    const bi = b[i];
    if (ai !== undefined && bi !== undefined) a[i] = ai + s * bi;
  }
  return a;
}
export function addMat(A: Mat, B: Mat, s=1) { 
  const [m,n]=shape(A); 
  for (let i=0;i<m;i++) for (let j=0;j<n;j++) {
    const Ai = A[i];
    const Bi = B[i];
    const Aij = Ai?.[j];
    const Bij = Bi?.[j];
    if (Ai && Aij !== undefined && Bij !== undefined) Ai[j] = Aij + s * Bij;
  }
  return A;
}

export function froNorm(A: Mat): number {
  let s=0; for (const r of A) for (const x of r) s += x*x; return Math.sqrt(s);
}

export function clamp01(x: number) { return x<0?0:(x>1?1:x); }

// Solve (A^T A + λ I) x = A^T b  (ridge least squares)
export function ridgeLeastSquares(A: Mat, b: Vec, lambda = 1e-9): Vec {
  const AT = matT(A); const [m,n] = shape(A);
  // Build normal matrix N = AT*A + λI and rhs r = AT*b
  const N = zerosMat(n,n); const r = zeros(n);
  for (let i=0;i<n;i++) for (let j=0;j<n;j++) {
    let s=0;
    const ATi = AT[i];
    const Ni = N[i];
    if (!ATi || !Ni) continue;
    for (let k=0;k<m;k++) {
      const ATik = ATi[k];
      const Ak = A[k];
      const Akj = Ak?.[j];
      if (ATik !== undefined && Akj !== undefined) s += ATik * Akj;
    }
    Ni[j] = s + (i===j?lambda:0);
  }
  for (let i=0;i<n;i++) { 
    let s=0;
    const ATi = AT[i];
    if (!ATi) continue;
    for (let k=0;k<m;k++) {
      const ATik = ATi[k];
      const bk = b[k];
      if (ATik !== undefined && bk !== undefined) s += ATik * bk;
    }
    r[i]=s;
  }
  return solveSymmetric(N, r);
}

// Naive Gaussian elimination with partial pivoting (for small n)
export function solveSymmetric(N: Mat, r: Vec): Vec {
  const n = r.length;
  const A = zerosMat(n,n+1);
  for (let i=0;i<n;i++) {
    const Ai = A[i];
    const Ni = N[i];
    const ri = r[i];
    if (!Ai || !Ni || ri === undefined) continue;
    for (let j=0;j<n;j++) {
      const Nij = Ni[j];
      if (Nij !== undefined) Ai[j] = Nij;
    }
    Ai[n] = ri;
  }
  // forward elim
  for (let p=0;p<n;p++){
    let piv=p;
    const Ap = A[p];
    const App = Ap?.[p];
    if (App === undefined) continue;
    for (let i=p+1;i<n;i++) {
      const Ai = A[i];
      const Aip = Ai?.[p];
      if (Aip !== undefined && Math.abs(Aip) > Math.abs(App)) piv=i;
    }
    const Apiv = A[piv];
    const Apivp = Apiv?.[p];
    if (Apivp === undefined || Math.abs(Apivp)<1e-15) continue;
    if (piv!==p) { const tmp=A[p]; const Apiv = A[piv]; if (tmp && Apiv) { A[p]=Apiv; A[piv]=tmp; } }
    const ApFinal = A[p];
    const AppFinal = ApFinal?.[p];
    if (!ApFinal || AppFinal === undefined) continue;
    const inv = 1/AppFinal;
    for (let j=p;j<=n;j++) {
      const Apj = ApFinal[j];
      if (Apj !== undefined) ApFinal[j] = Apj * inv;
    }
    for (let i=0;i<n;i++) if (i!==p) {
      const Ai = A[i];
      const factor = Ai?.[p];
      if (!Ai || factor === undefined) continue;
      for (let j=p;j<=n;j++) {
        const Aij = Ai[j];
        const Apj = ApFinal[j];
        if (Aij !== undefined && Apj !== undefined) Ai[j] = Aij - factor * Apj;
      }
    }
  }
  return A.map(row => {
    const val = row[n];
    return val !== undefined ? val : 0;
  });
}

// Project a vector onto the probability simplex {v≥0, sum v = 1}
export function projectToSimplex(v: Vec): Vec {
  const n=v.length, u=[...v].sort((a,b)=>b-a);
  let css=0, rho=0;
  for (let i=0;i<n;i++){
    const ui = u[i];
    if (ui === undefined) continue;
    css+=ui;
    const t=(css-1)/(i+1);
    if (ui-t>0) rho=i;
  }
  const tau = (u.slice(0,rho+1).reduce((a,b)=>a+b,0)-1)/(rho+1);
  return v.map(x => Math.max(0, x - tau));
}

// Column/row access helpers
export function getCol(A: Mat, j: number): Vec { return A.map(r => {
  const val = r[j];
  return val !== undefined ? val : 0;
}); }
export function setCol(A: Mat, j: number, v: Vec): void { 
  for (let i=0;i<A.length;i++) {
    const Ai = A[i];
    const vi = v[i];
    if (Ai && vi !== undefined) Ai[j] = vi;
  }
}
export function rowSums(A: Mat): Vec { return A.map(r => r.reduce((a,b)=>a+b,0)); }