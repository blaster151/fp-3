// markov-graded.ts
import { dirac, prune, type Dist, type Kernel } from "./markov-category";

export interface Monoid<G> {
  empty: G;
  concat: (a: G, b: G) => G;
  equals?: (a: G, b: G) => boolean;
}
export type GradedKernel<G,X,Y> = (x:X)=>{ dist: Dist<Y>; grade: G };

export function gDeterministic<G,X,Y>(M:Monoid<G>, f:(x:X)=>Y, g:G): GradedKernel<G,X,Y> {
  return (x:X)=>({ dist: dirac(f(x)), grade: g });
}

export function gCompose<G,X,Y,Z>(M:Monoid<G>, f:GradedKernel<G,X,Y>, g:GradedKernel<G,Y,Z>): GradedKernel<G,X,Z> {
  return (x:X) => {
    const { dist: dy, grade: gy } = f(x);
    const acc = new Map<Z,number>(); let gtot = M.empty;
    for(const [y,py] of dy){ const {dist: dz, grade: gz}=g(y); gtot = M.concat(gtot, gz);
      for(const [z,pz] of dz) acc.set(z,(acc.get(z)??0)+py*pz); }
    return { dist: prune(acc), grade: M.concat(gy, gtot) };
  };
}

export const gradeMap = <G,X,Y>(M:Monoid<G>, k:Kernel<X,Y>, g:G): GradedKernel<G,X,Y> =>
  (x:X)=>({ dist: k(x), grade: g });

export const ungrade = <G,X,Y>(gk:GradedKernel<G,X,Y>): Kernel<X,Y> => x => gk(x).dist;

export const NatAddMonoid: Monoid<number> = { empty: 0, concat: (a,b)=>a+b };
export const MaxTropical:  Monoid<number> = { empty: 0, concat: (a,b)=>Math.max(a,b) };

export const countedOracle = <X,Y>(k:Kernel<X,Y>): GradedKernel<number,X,Y> => (x:X)=>({ dist:k(x), grade:1 });
export function runGraded<X,Y,Z>(k1:GradedKernel<number,X,Y>, k2:GradedKernel<number,Y,Z>){
  const g = gCompose(NatAddMonoid, k1, k2);
  return { kernel: ungrade(g) as Kernel<X,Z>, totalCost: (x:X)=>g(x).grade };
}