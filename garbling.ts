// garbling.ts — finite garbling witness C with internal solver (no deps)
import { Fin, Kernel, Dist, normalize } from "./markov-category";
import { Experiment } from "./experiments";
import { Mat, Vec, matMul, matT, getCol, setCol, ridgeLeastSquares, projectToSimplex, zerosMat, froNorm, rowSums } from "./lin-alg";

// Extract Θ×X matrix P from experiment F: Θ→X
export function matrixFromExperiment<Theta, X>(
  ThetaFin: Fin<Theta>,
  XFin: Fin<X>,
  F: Experiment<Theta,X>
): Mat {
  const P = zerosMat(ThetaFin.elems.length, XFin.elems.length);
  for (let i=0;i<ThetaFin.elems.length;i++){
    const d = F(ThetaFin.elems[i]);
    for (let j=0;j<XFin.elems.length;j++){
      P[i][j] = d.get(XFin.elems[j]) ?? 0;
    }
  }
  return P;
}

// Apply a channel C: X→Y (row-stochastic matrix) to an experiment F: Θ→X, producing G: Θ→Y
export function applyChannel<Theta, X, Y>(
  ThetaFin: Fin<Theta>,
  XFin: Fin<X>,
  YFin: Fin<Y>,
  F: Experiment<Theta,X>,
  C: Mat // |X|×|Y|
): Experiment<Theta,Y> {
  return (theta: Theta): Dist<Y> => {
    const dx = F(theta); // distribution over X
    const ydist: Dist<Y> = new Map();
    for (let xIdx=0; xIdx<XFin.elems.length; xIdx++){
      const px = dx.get(XFin.elems[xIdx]) ?? 0; if (px<=0) continue;
      for (let yIdx=0; yIdx<YFin.elems.length; yIdx++){
        const w = px * (C[xIdx][yIdx] ?? 0);
        if (w>0) ydist.set(YFin.elems[yIdx], (ydist.get(YFin.elems[yIdx]) ?? 0) + w);
      }
    }
    return normalize(ydist);
  };
}

// --- Core: solve for C (row-stochastic, C≥0) s.t. A*C = B  (A=Θ×X, B=Θ×Y)
export type GarblingOptions = { maxIter?: number; tolEq?: number; tolRow?: number; lambda?: number; verbose?: boolean };

export function garblingWitness(A: Mat, B: Mat, opts: GarblingOptions = {}): { ok: boolean; C: Mat; eqResid: number; rowResid: number } {
  const { maxIter=2000, tolEq=1e-10, tolRow=1e-10, lambda=1e-9, verbose=false } = opts;
  const [m,x] = [A.length, (A[0]??[]).length];
  const [,y]  = [B.length, (B[0]??[]).length];
  // init by unconstrained ridge LS per column, clipped to ≥0 then row-simplex project
  let C = zerosMat(x,y);
  for (let j=0;j<y;j++){
    const bj = B.map(r => r[j]);
    const cj = ridgeLeastSquares(A, bj, lambda).map(v => Math.max(0,v));
    for (let i=0;i<x;i++) C[i][j] = cj[i];
  }
  // project rows to simplex
  for (let i=0;i<x;i++) C[i] = projectToSimplex(C[i]);

  const AT = matT(A);

  for (let it=0; it<maxIter; it++){
    // Projection 1: enforce equality A*C = B via column least-squares corrections
    const AC = matMul(A, C);
    for (let j=0;j<y;j++){
      const rj = B.map((row,i) => row[j] - AC[i][j]);               // residual in Θ
      const dj = ridgeLeastSquares(A, rj, lambda);                   // minimal correction in col space
      for (let i=0;i<x;i++) C[i][j] = Math.max(0, C[i][j] + dj[i]); // keep ≥ 0
    }
    // Projection 2: enforce row-simplex (sum=1, ≥0)
    for (let i=0;i<x;i++) C[i] = projectToSimplex(C[i]);

    // Check residuals
    const eqResid = froNorm(matAdd(matMul(A, C), B, -1));
    const rs = rowSums(C).map(s => Math.abs(s-1));
    const rowResid = Math.max(...rs);
    if (verbose && it % 100 === 0) console.log(`it=${it} eq=${eqResid} row=${rowResid}`);
    if (eqResid <= tolEq && rowResid <= tolRow) return { ok: true, C, eqResid, rowResid };
  }
  const eqResid = froNorm(matAdd(matMul(A, C), B, -1));
  const rs = rowSums(C).map(s => Math.abs(s-1));
  const rowResid = Math.max(...rs);
  return { ok: eqResid<=tolEq && rowResid<=tolRow, C, eqResid, rowResid };
}

// helper
function matAdd(A: Mat, B: Mat, sB=1): Mat { const C = copy(A);
  for (let i=0;i<A.length;i++) for (let j=0;j<A[0].length;j++) C[i][j]+=sB*B[i][j]; return C; }
function copy(A: Mat): Mat { return A.map(r=>[...r]); }

// High-level: check if G is a garbling of F and, if so, return witness C
export function isGarblingOfFinite<Theta,X,Y>(
  ThetaFin: Fin<Theta>,
  XFin: Fin<X>,
  YFin: Fin<Y>,
  F: Experiment<Theta,X>,
  G: Experiment<Theta,Y>,
  opts?: GarblingOptions
): { ok: boolean; C?: Mat; eqResid: number; rowResid: number } {
  const A = matrixFromExperiment(ThetaFin, XFin, F); // Θ×X
  const B = matrixFromExperiment(ThetaFin, YFin, G); // Θ×Y
  const res = garblingWitness(A, B, opts);
  return { ok: res.ok, C: res.ok ? res.C : undefined, eqResid: res.eqResid, rowResid: res.rowResid };
}