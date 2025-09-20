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
  for (let i=0;i<m;i++) for (let j=0;j<n;j++) AT[j][i] = A[i][j];
  return AT;
}

export function matMul(A: Mat, B: Mat): Mat {
  const [m,k] = shape(A); const [k2,n] = shape(B); if (k!==k2) throw new Error("matMul dim mismatch");
  const C = zerosMat(m,n);
  for (let i=0;i<m;i++) for (let p=0;p<k;p++) { const a = A[i][p];
    if (a===0) continue; for (let j=0;j<n;j++) C[i][j] += a * B[p][j];
  }
  return C;
}

export function matVec(A: Mat, x: Vec): Vec {
  const [m,n] = shape(A); if (x.length!==n) throw new Error("matVec dim mismatch");
  const y = zeros(m);
  for (let i=0;i<m;i++) { let s=0; for (let j=0;j<n;j++) s += A[i][j]*x[j]; y[i]=s; }
  return y;
}

export function addVec(a: Vec, b: Vec, s=1) { for (let i=0;i<a.length;i++) a[i]+=s*b[i]; return a; }
export function addMat(A: Mat, B: Mat, s=1) { const [m,n]=shape(A); for (let i=0;i<m;i++) for (let j=0;j<n;j++) A[i][j]+=s*B[i][j]; return A; }

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
    let s=0; for (let k=0;k<m;k++) s += AT[i][k]*A[k][j]; N[i][j]=s + (i===j?lambda:0);
  }
  for (let i=0;i<n;i++) { let s=0; for (let k=0;k<m;k++) s += AT[i][k]*b[k]; r[i]=s; }
  return solveSymmetric(N, r);
}

// Naive Gaussian elimination with partial pivoting (for small n)
export function solveSymmetric(N: Mat, r: Vec): Vec {
  const n = r.length;
  const A = zerosMat(n,n+1);
  for (let i=0;i<n;i++) { for (let j=0;j<n;j++) A[i][j]=N[i][j]; A[i][n]=r[i]; }
  // forward elim
  for (let p=0;p<n;p++){
    let piv=p; for (let i=p+1;i<n;i++) if (Math.abs(A[i][p])>Math.abs(A[p][p])) piv=i;
    if (Math.abs(A[piv][p])<1e-15) continue;
    if (piv!==p) { const tmp=A[p]; A[p]=A[piv]; A[piv]=tmp; }
    const inv = 1/A[p][p];
    for (let j=p;j<=n;j++) A[p][j]*=inv;
    for (let i=0;i<n;i++) if (i!==p) {
      const factor=A[i][p];
      for (let j=p;j<=n;j++) A[i][j]-=factor*A[p][j];
    }
  }
  return A.map(row => row[n]);
}

// Project a vector onto the probability simplex {v≥0, sum v = 1}
export function projectToSimplex(v: Vec): Vec {
  const n=v.length, u=[...v].sort((a,b)=>b-a);
  let css=0, rho=0;
  for (let i=0;i<n;i++){ css+=u[i]; const t=(css-1)/(i+1); if (u[i]-t>0) rho=i; }
  const tau = (u.slice(0,rho+1).reduce((a,b)=>a+b,0)-1)/(rho+1);
  return v.map(x => Math.max(0, x - tau));
}

// Column/row access helpers
export function getCol(A: Mat, j: number): Vec { return A.map(r => r[j]); }
export function setCol(A: Mat, j: number, v: Vec): void { for (let i=0;i<A.length;i++) A[i][j]=v[i]; }
export function rowSums(A: Mat): Vec { return A.map(r => r.reduce((a,b)=>a+b,0)); }