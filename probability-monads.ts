// probability-monads.ts
import {
  Dist, dirac, normalize, prune,
  Fin, Pair, I, tensorObj,
  Kernel, kernelToMatrix, prettyMatrix,
} from "./markov-category";

// Dist-like monad spec
export interface DistLikeMonadSpec {
  of<T>(x: T): Dist<T>;
  map<A,B>(da: Dist<A>, f: (a:A)=>B): Dist<B>;
  bind<A,B>(da: Dist<A>, k: (a:A)=>Dist<B>): Dist<B>;
  product<A,B>(da: Dist<A>, db: Dist<B>): Dist<[A,B]>;
  isAffine1: boolean;
}

// Probability (normalized)
export const DistMonad: DistLikeMonadSpec = {
  of<T>(x: T) { return dirac(x); },
  map<A,B>(da: Dist<A>, f: (a:A)=>B) {
    const m = new Map<B,number>();
    for (const [a,p] of da) m.set(f(a), (m.get(f(a)) ?? 0) + p);
    return normalize(m);
  },
  bind<A,B>(da: Dist<A>, k: (a:A)=>Dist<B>) {
    const acc = new Map<B,number>();
    for (const [a,pa] of da) for (const [b,pb] of k(a)) acc.set(b,(acc.get(b)??0)+pa*pb);
    return normalize(acc);
  },
  product<A,B>(da: Dist<A>, db: Dist<B>) {
    const out = new Map<[A,B],number>();
    for (const [a,pa] of da) for (const [b,pb] of db) out.set([a,b], (out.get([a,b])??0)+pa*pb);
    return normalize(out);
  },
  isAffine1: true,
};

export function makeKleisli(spec: DistLikeMonadSpec) {
  type Kleisli<X,Y> = (x:X)=>Dist<Y>;
  const composeK = <X,Y,Z>(f:Kleisli<X,Y>, g:Kleisli<Y,Z>): Kleisli<X,Z> => x => spec.bind(f(x), g);
  const tensorK  = <X1,Y1,X2,Y2>(f:Kleisli<X1,Y1>, g:Kleisli<X2,Y2>): Kleisli<[X1,X2],[Y1,Y2]> =>
    ([x1,x2]) => spec.product(f(x1), g(x2));
  const detKleisli = <X,Y>(f:(x:X)=>Y): Kleisli<X,Y> => x => spec.of(f(x));
  const copyK   = <X>():  Kleisli<X,[X,X]> => (x:X) => spec.of([x,x] as const);
  const discardK= <X>():  Kleisli<X,I>     => (_:X) => spec.of({} as I);
  const swapK   = <X,Y>():Kleisli<[X,Y],[Y,X]> => ([x,y]) => spec.of([y,x] as const);

  class FinKleisli<X,Y> {
    constructor(public X: Fin<X>, public Y: Fin<Y>, public k: Kleisli<X,Y>) {}
    then<Z>(that: FinKleisli<Y,Z>)      { return new FinKleisli(this.X, that.Y, composeK(this.k, that.k)); }
    tensor<Z,W>(that: FinKleisli<Z,W>)  {
      const dom = tensorObj(this.X, that.X), cod = tensorObj(this.Y, that.Y);
      return new FinKleisli(dom as any, cod, tensorK(this.k, that.k));
    }
    matrix()              { return kernelToMatrix(this.X, this.Y, this.k); }
    pretty(digits=4)      { return prettyMatrix(this.matrix(), digits); }
  }

  return { composeK, tensorK, detKleisli, copyK, discardK, swapK, FinKleisli, isMarkovCategory: spec.isAffine1 } as const;
}

// Subprobability & weighted flavors (non-affine)
export const SubProbMonad: DistLikeMonadSpec = {
  of<T>(x:T){ return new Map([[x,1]]); },
  map<A,B>(da:Dist<A>, f:(a:A)=>B){ const m=new Map<B,number>(); for(const[a,p]of da)m.set(f(a),(m.get(f(a))??0)+p); return prune(m); },
  bind<A,B>(da:Dist<A>, k:(a:A)=>Dist<B>){ const acc=new Map<B,number>(); for(const[a,pa]of da)for(const[b,pb]of k(a))acc.set(b,(acc.get(b)??0)+pa*pb); return prune(acc); },
  product<A,B>(da:Dist<A>, db:Dist<B>){ const out=new Map<[A,B],number>(); for(const[a,pa]of da)for(const[b,pb]of db)out.set([a,b],(out.get([a,b])??0)+pa*pb); return prune(out); },
  isAffine1:false,
};

export const WeightedMonad: DistLikeMonadSpec = {
  of<T>(x:T){ return new Map([[x,1]]); },
  map<A,B>(da:Dist<A>, f:(a:A)=>B){ const m=new Map<B,number>(); for(const[a,p]of da)m.set(f(a),(m.get(f(a))??0)+p); return prune(m); },
  bind<A,B>(da:Dist<A>, k:(a:A)=>Dist<B>){ const acc=new Map<B,number>(); for(const[a,pa]of da)for(const[b,pb]of k(a))acc.set(b,(acc.get(b)??0)+pa*pb); return prune(acc); },
  product<A,B>(da:Dist<A>, db:Dist<B>){ const out=new Map<[A,B],number>(); for(const[a,pa]of da)for(const[b,pb]of db)out.set([a,b],(out.get([a,b])??0)+pa*pb); return prune(out); },
  isAffine1:false,
};

export const KleisliProb     = makeKleisli(DistMonad);
export const KleisliSubProb  = makeKleisli(SubProbMonad);
export const KleisliWeighted = makeKleisli(WeightedMonad);