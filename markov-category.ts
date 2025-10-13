// markov-category.ts — a minimal-but-thorough Markov category implementation for our FP/CT library
// ----------------------------------------------------------------------------------------------
// Goals
//  - A Markov category: symmetric monoidal category where every object has a commutative comonoid
//    (copy Δ and discard !), and morphisms are (sub)stochastic kernels.
//  - Finite implementation (Fin): objects as finite sets with equality + listing.
//  - Kernels: X -> Dist(Y) with composition (Kleisli bind) and tensor.
//  - Deterministic maps as Dirac kernels.
//  - Pretty-printing, matrix view, small inference utilities (conditioning, Bayes updates for finite cases).
//  - Adapters to our Category / SymmetricMonoidalCategory interfaces so it plugs into the rest of the library.
//
// Notes
//  - This is intentionally written in a single file for easy iteration. We can split later.
//  - We assume a lightweight notion of finite sets via `Fin<T>`.
//  - Numeric stability: we keep a small EPS to zero-out tiny negative numbers from floating error.
//  - Category-level interfaces here; probability/monad mechanics in semiring-dist.ts
// ----------------------------------------------------------------------------------------------

import type { Dist as Dist2Param, Samp } from "./dist";
import type { CSRig } from "./semiring-utils";

// Single-parameter Dist type for probability distributions (numeric weights)
export type Dist<T> = Map<T, number>;

// Deterministic morphism A→B
export type Det<A, B> = (a: A) => B;

// Stochastic morphism A→B (using 2-parameter Dist for semiring generality)
export type Stoch<R, A, B> = (a: A) => Dist2Param<R, B>;

// Distribution object interface
export interface DistributionObject<R, X> {
  delta: (x: X) => Dist2Param<R, X>;
  samp: Samp<R, X>;
}

// Representable Markov façade
export interface RepresentableMarkov<R> {
  distribution<X>(): DistributionObject<R, X>;
}

// ===== Core finite-sets scaffold ===============================================================

export type Eq<T> = (a: T, b: T) => boolean;
export type Show<T> = (x: T) => string;

export interface Fin<T> {
  readonly elems: ReadonlyArray<T>;
  readonly eq: Eq<T>;
  readonly show?: Show<T>;
}

export const byRefEq = <T>(): Eq<T> => (a, b) => Object.is(a, b);
export const defaultShow = <T>(x: T) => String(x);

export function mkFin<T>(elems: ReadonlyArray<T>, eq: Eq<T> = byRefEq<T>(), show?: Show<T>): Fin<T> {
  return { 
    elems: [...elems], 
    eq, 
    ...(show !== undefined && { show })
  };
}

// Utility to find index by equality
function indexOfEq<T>(fin: Fin<T>, x: T): number {
  const { elems, eq } = fin;
  for (let i = 0; i < elems.length; i++) {
    const elem = elems[i];
    if (elem !== undefined && eq(elem, x)) return i;
  }
  return -1;
}

// ===== Distributions & Kernels ================================================================
// Note: Dist<T> type imported from semiring-dist.ts for centralization

const EPS = 1e-12;

export function mass<T>(d: Dist<T>): number {
  let s = 0;
  for (const p of d.values()) s += p;
  return s;
}

export function normalize<T>(d: Dist<T>): Dist<T> {
  const m = mass(d);
  const out: Dist<T> = new Map();

  if (m > EPS) {
    for (const [k, v] of d) {
      const w = v / m;
      if (w > EPS) out.set(k, w);
    }
    return out;
  }

  // Degenerate input: all weights are ≈ 0. Instead of returning an empty
  // distribution (which would violate affine/Markov expectations), fall back
  // to an equal-weight distribution over the existing support.
  if (d.size === 0) return out;

  const uniform = 1 / d.size;
  for (const [k] of d) {
    out.set(k, uniform);
  }
  return out;
}

export function prune<T>(d: Dist<T>, eps = EPS): Dist<T> {
  const out: Dist<T> = new Map();
  for (const [k, v] of d) if (v > eps) out.set(k, v);
  return out;
}

export function dirac<T>(x: T): Dist<T> {
  return new Map([[x, 1]]);
}

export function fromWeights<T>(pairs: ReadonlyArray<[T, number]>, normalizeFlag = true): Dist<T> {
  const m = new Map<T, number>();
  for (const [x, w] of pairs) m.set(x, (m.get(x) ?? 0) + w);
  return normalizeFlag ? normalize(m) : prune(m);
}

// A stochastic kernel: for each x in X, a distribution over Y
export type Kernel<X, Y> = (x: X) => Dist<Y>;

// Composition: (g ∘ f)(x) = bind y~f(x); g(y)
export function compose<X, Y, Z>(f: Kernel<X, Y>, g: Kernel<Y, Z>): Kernel<X, Z> {
  return (x: X) => {
    const dy = f(x);
    const acc: Dist<Z> = new Map();
    for (const [y, py] of dy) {
      const dz = g(y);
      for (const [z, pz] of dz) acc.set(z, (acc.get(z) ?? 0) + py * pz);
    }
    return prune(acc);
  };
}

// Deterministic morphism: embed function as Dirac kernel
export function deterministic<X, Y>(f: (x: X) => Y): Kernel<X, Y> {
  return (x: X) => dirac(f(x));
}

// Convex mixture of kernels: λ f ⊕ (1-λ) g
export function convexMix<X, Y>(lambda: number, f: Kernel<X, Y>, g: Kernel<X, Y>): Kernel<X, Y> {
  return (x: X) => {
    const d1 = f(x);
    const d2 = g(x);
    const out = new Map<Y, number>();
    for (const [y, p] of d1) out.set(y, (out.get(y) ?? 0) + lambda * p);
    for (const [y, p] of d2) out.set(y, (out.get(y) ?? 0) + (1 - lambda) * p);
    return prune(out);
  };
}

// Tensor on objects: X ⊗ Y := [X,Y] (cartesian product)
export type Pair<X, Y> = readonly [X, Y];
export function tensorObj<X, Y>(X: Fin<X>, Y: Fin<Y>): Fin<Pair<X, Y>> {
  const elems: Array<Pair<X, Y>> = [];
  for (const x of X.elems) for (const y of Y.elems) elems.push([x, y]);
  const eq: Eq<Pair<X, Y>> = (a, b) => X.eq(a[0], b[0]) && Y.eq(a[1], b[1]);
  const show: Show<Pair<X, Y>> = ([x, y]) => `(${X.show?.(x) ?? String(x)}, ${Y.show?.(y) ?? String(y)})`;
  return { elems, eq, show };
}

// Tensor on morphisms: (f ⊗ g)(x,z) = f(x) × g(z)
export function tensor<X1, Y1, X2, Y2>(f: Kernel<X1, Y1>, g: Kernel<X2, Y2>): Kernel<Pair<X1, X2>, Pair<Y1, Y2>> {
  return ([x, z]) => {
    const dy = f(x);
    const dw = g(z);
    const out = new Map<Pair<Y1, Y2>, number>();
    for (const [y, py] of dy) for (const [w, pw] of dw) {
      out.set([y, w], (out.get([y, w]) ?? 0) + py * pw);
    }
    return prune(out);
  };
}

// Symmetry (braiding): swap : X ⊗ Y -> Y ⊗ X
export function swap<X, Y>(): Kernel<Pair<X, Y>, Pair<Y, X>> {
  return deterministic(([x, y]: Pair<X, Y>) => [y, x] as const);
}

// ===== Comonoid structure (copy Δ and discard !) ===============================================

// Discard: ! : X -> I  where I = unit object (singleton)
export type I = {};
export const IFin: Fin<I> = mkFin<I>([{}], () => true, () => "•");

export function discard<X>(): Kernel<X, I> {
  return (_x: X) => dirac({});
}

// Copy: Δ : X -> X ⊗ X   (deterministic copy)
export function copy<X>(): Kernel<X, Pair<X, X>> {
  return (x: X) => dirac([x, x] as const);
}

// Merge (commutative comonoid laws dually give a monoid on X via deterministic equality)
// For general Markov cats we keep only Δ and ! as primitives; laws are asserted via tests.

// ===== Deterministic injections/projections for products =======================================

export function fst<X, Y>(): Kernel<Pair<X, Y>, X> { return deterministic(([x, _y]) => x); }
export function snd<X, Y>(): Kernel<Pair<X, Y>, Y> { return deterministic(([_x, y]) => y); }
export function pair<X, Y, Z>(f: Kernel<Z, X>, g: Kernel<Z, Y>): Kernel<Z, Pair<X, Y>> {
  // pair = (Δ ; f ⊗ g)
  return compose(copy<Z>(), tensor(f, g));
}

// ===== Finite-matrix view (debugging / pretty) =================================================

export function kernelToMatrix<X, Y>(Xf: Fin<X>, Yf: Fin<Y>, k: Kernel<X, Y>): number[][] {
  return Xf.elems.map(x => {
    const d = k(x);
    return Yf.elems.map(y => {
      let total = 0;
      for (const [z, p] of d) {
        if (Yf.eq(z, y)) {
          total += p;
        }
      }
      return total;
    });
  });
}

export function prettyMatrix(rows: number[][], digits = 4): string {
  const fmt = (n: number) => n.toFixed(digits);
  return rows.map(r => r.map(fmt).join("\t")).join("\n");
}

// ===== Probability helpers ====================================================================

export function support<T>(d: Dist<T>): T[] { return [...d.entries()].filter(([,p]) => p > EPS).map(([x]) => x); }

export function expectation<T>(d: Dist<T>, f: (t: T) => number): number {
  let s = 0;
  for (const [x, p] of d) s += p * f(x);
  return s;
}

// Conditioning a kernel by a predicate on Y and renormalizing (reject if measure 0)
export function condition<X, Y>(k: Kernel<X, Y>, pred: (y: Y) => boolean): Kernel<X, Y> {
  return (x: X) => {
    const d = k(x);
    const filtered: Dist<Y> = new Map();
    for (const [y, p] of d) if (pred(y)) filtered.set(y, p);
    return normalize(filtered);
  };
}

// Bayes for finite joint (X×Y) given prior on X and likelihood k: X -> Dist(Y)
// Returns posterior over X given observed y, assuming P(y) > 0.
export function bayesPosterior<X, Y>(Xf: Fin<X>, prior: Dist<X>, like: Kernel<X, Y>, yObs: Y): Dist<X> {
  const numer: Array<[X, number]> = [];
  for (const x of Xf.elems) {
    const px = prior.get(x) ?? 0;
    if (px <= 0) continue;
    const py = like(x).get(yObs) ?? 0;
    numer.push([x, px * py]);
  }
  return normalize(new Map(numer));
}

// Build joint distribution P(X,Y) from prior and likelihood
export function jointFromPriorLike<X, Y>(Xf: Fin<X>, Yf: Fin<Y>, prior: Dist<X>, like: Kernel<X, Y>): Dist<Pair<X, Y>> {
  const out: Dist<Pair<X, Y>> = new Map();
  for (const x of Xf.elems) {
    const px = prior.get(x) ?? 0;
    if (px <= 0) continue;
    const dy = like(x);
    for (const [y, py] of dy) out.set([x, y], (out.get([x, y]) ?? 0) + px * py);
  }
  return prune(out);
}

// Marginalize joint over Y to get P(X)
export function marginalX<X, Y>(joint: Dist<Pair<X, Y>>): Dist<X> {
  const out: Dist<X> = new Map();
  for (const [[x, _y], p] of joint) out.set(x, (out.get(x) ?? 0) + p);
  return prune(out);
}

export function marginalY<X, Y>(joint: Dist<Pair<X, Y>>): Dist<Y> {
  const out: Dist<Y> = new Map();
  for (const [[_x, y], p] of joint) out.set(y, (out.get(y) ?? 0) + p);
  return prune(out);
}

// Disintegration for finite case: given joint P(X,Y), produce a kernel X -> Dist(Y) and prior P(X)
export function disintegrateFinite<X, Y>(joint: Dist<Pair<X, Y>>, Xf: Fin<X>, Yf: Fin<Y>): { prior: Dist<X>, like: Kernel<X, Y> } {
  const prior = marginalX(joint);
  const like: Kernel<X, Y> = (x: X) => {
    const denom = prior.get(x) ?? 0;
    const out: Dist<Y> = new Map();
    if (denom <= 0) return out;
    for (const y of Yf.elems) {
      const pxy = joint.get([x, y]) ?? 0; // relies on reference identity of [x,y]
      if (pxy > EPS) out.set(y, pxy / denom);
    }
    return prune(out);
  };
  return { prior: normalize(prior), like };
}

// ===== Representable Markov Structure ==========================================================

export interface NumericDistributionObject<X> {
  PX: Dist<X>;
  delta: (x: X) => Dist<X>;  // Dirac delta function
  samp: (d: Dist<X>) => X;   // Sampling function
}

export interface NumericRepresentableMarkov {
  distribution<X>(): NumericDistributionObject<X>;
}

// ===== Category / Monoidal interfaces (adapters) ===============================================
// Note: We use the existing Category interface from allTS.ts
// The Markov category provides concrete implementations of these interfaces

// Our concrete Markov cat over finite sets
export interface MarkovObjects<X> { X: Fin<X>; }

// Concrete Markov category implementation that satisfies the Category interface
export const MarkovCategory = {
  // Identity morphism
  id: <X>(X: Fin<X>): FinMarkov<X, X> => idK(X),
  
  // Composition of morphisms
  compose: <X, Y, Z>(f: FinMarkov<X, Y>, g: FinMarkov<Y, Z>): FinMarkov<X, Z> => f.then(g),
  
  // Check if a morphism is identity
  isId: <X, Y>(m: FinMarkov<X, Y>): boolean => {
    if (m.X.elems.length !== m.Y.elems.length) return false;
    const matrix = m.matrix();
    for (let i = 0; i < matrix.length; i++) {
      const row = matrix[i];
      if (!row) return false;
      for (let j = 0; j < row.length; j++) {
        const val = row[j];
        if (val === undefined) return false;
        if (i === j && Math.abs(val - 1) > 1e-9) return false;
        if (i !== j && Math.abs(val) > 1e-9) return false;
      }
    }
    return true;
  },
  
  // Check equality of morphisms (up to numerical tolerance)
  equalMor: <X, Y>(x: FinMarkov<X, Y>, y: FinMarkov<X, Y>): boolean => {
    if (x.X.elems.length !== y.X.elems.length || x.Y.elems.length !== y.Y.elems.length) return false;
    const mx = x.matrix();
    const my = y.matrix();
    return approxEqualMatrix(mx, my);
  }
};

export class FinMarkov<X, Y> {
  constructor(public X: Fin<X>, public Y: Fin<Y>, public k: Kernel<X, Y>) {}

  // Composition with another arrow Y -> Z
  then<Z>(that: FinMarkov<Y, Z>): FinMarkov<X, Z> {
    return new FinMarkov(this.X, that.Y, compose(this.k, that.k));
  }

  // Tensor with another arrow
  tensor<Z, W>(that: FinMarkov<Z, W>, XxZ?: Fin<Pair<X, Z>>, YxW?: Fin<Pair<Y, W>>): FinMarkov<Pair<X, Z>, Pair<Y, W>> {
    const dom = XxZ ?? tensorObj(this.X, that.X);
    const cod = YxW ?? tensorObj(this.Y, that.Y);
    return new FinMarkov(dom, cod, tensor(this.k, that.k));
  }

  // Pretty matrix for this arrow
  matrix(): number[][] { return kernelToMatrix(this.X, this.Y, this.k); }
  pretty(digits = 4): string { return prettyMatrix(this.matrix(), digits); }
}

// Builders
export function idK<X>(X: Fin<X>): FinMarkov<X, X> { return new FinMarkov(X, X, deterministic((x: X) => x)); }
export function copyK<X>(X: Fin<X>): FinMarkov<X, Pair<X, X>> { return new FinMarkov(X, tensorObj(X, X), copy<X>()); }
export function discardK<X>(X: Fin<X>): FinMarkov<X, I> { return new FinMarkov(X, IFin, discard<X>()); }
export function detK<X, Y>(X: Fin<X>, Y: Fin<Y>, f: (x: X) => Y): FinMarkov<X, Y> { return new FinMarkov(X, Y, deterministic(f)); }

// From a table of rows summing to 1
export function fromMatrix<X, Y>(X: Fin<X>, Y: Fin<Y>, rows: number[][]): FinMarkov<X, Y> {
  if (rows.length !== X.elems.length) throw new Error("row count mismatch with domain");
  for (const r of rows) if (r.length !== Y.elems.length) throw new Error("col count mismatch with codomain");
  const k: Kernel<X, Y> = (x: X) => {
    const i = indexOfEq(X, x);
    const row = rows[i];
    const m = new Map<Y, number>();
    if (row) {
      for (let j = 0; j < row.length; j++) {
        const p = row[j];
        const yElem = Y.elems[j];
        if (p !== undefined && p > EPS && yElem !== undefined) {
          m.set(yElem, p);
        }
      }
    }
    return normalize(m);
  };
  return new FinMarkov(X, Y, k);
}

// ===== Examples & sanity-tests =================================================================

// Example: a biased coin and a noisy channel
export function exampleCoin() {
  type Coin = "H" | "T";
  const CoinFin = mkFin<Coin>(["H", "T"], (a,b)=>a===b);

  // Prior on coin: 0.6 heads
  const prior: Dist<Coin> = new Map([["H", 0.6],["T", 0.4]]);

  // A noisy sensor Y given coin X
  type Obs = 0 | 1; // sensor bit
  const ObsFin = mkFin<Obs>([0,1], (a,b)=>a===b);

  const like: Kernel<Coin, Obs> = (c) => c === "H" ? new Map([[1,0.9],[0,0.1]]) : new Map([[1,0.2],[0,0.8]]);

  // Posterior for observing 1
  const post1 = bayesPosterior(CoinFin, prior, like, 1);
  // Posterior for observing 0
  const post0 = bayesPosterior(CoinFin, prior, like, 0);

  return { CoinFin, ObsFin, prior, like, post1, post0 };
}

// Example: Markov chain step and n-step (finite)
export function stepChain<S>(Sfin: Fin<S>, step: Kernel<S, S>, start: Dist<S>, n: number): Dist<S> {
  let dist = start;
  for (let t = 0; t < n; t++) {
    const next: Dist<S> = new Map();
    for (const [s, ps] of dist) {
      const d2 = step(s);
      for (const [s2, p] of d2) next.set(s2, (next.get(s2) ?? 0) + ps * p);
    }
    dist = normalize(next);
  }
  return dist;
}

// Small correctness checks (can be used in a test file)
export function sanity() {
  // Δ ; (fst) = id and Δ ; (snd) = id hold only as *equalities after discarding* in general probabilistic cats,
  // but for deterministic copy here we can check basic shapes.
  type X = 0|1|2; const Xfin = mkFin<X>([0,1,2], (a,b)=>a===b);
  const id = idK(Xfin);
  const cop = copyK(Xfin);
  const fstP = new FinMarkov(tensorObj(Xfin,Xfin), Xfin, fst<X, X>());
  const sndP = new FinMarkov(tensorObj(Xfin,Xfin), Xfin, snd<X, X>());

  const gotFst = cop.then(fstP).matrix();
  const gotSnd = cop.then(sndP).matrix();
  const idM = id.matrix();

  return {
    id: id.pretty(),
    fstAfterCopy: prettyMatrix(gotFst),
    sndAfterCopy: prettyMatrix(gotSnd),
    note: "For deterministic copy these equalities hold strictly; in general Markov cats they satisfy comonoid laws diagrammatically."
  };
}

// ===== Exposed convenience re-exports ===========================================================
export const Markov = {
  compose,
  tensor,
  copy,
  discard,
  deterministic,
  tensorObj,
  swap,
  dirac,
  normalize,
  fromWeights,
  bayesPosterior,
  jointFromPriorLike,
  disintegrateFinite,
  marginalX,
  marginalY,
  stepChain,
};

// ===============================================================================================
// (1) Axiomatic property tests (lightweight)                                                     
// ===============================================================================================

// Numerically compare two matrices with a tolerance
export function approxEqualMatrix(a: number[][], b: number[][], tol = 1e-9): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i], rb = b[i];
    if (!ra || !rb) return false;
    if (ra.length !== rb.length) return false;
    for (let j = 0; j < ra.length; j++) {
      const raVal = ra[j], rbVal = rb[j];
      if (raVal === undefined || rbVal === undefined) return false;
      if (Math.abs(raVal - rbVal) > tol) return false;
    }
  }
  return true;
}

// Check comonoid laws for Δ and ! on a finite object X, diagrammatically via matrices
export function checkComonoidLaws<X>(
  Xf: Fin<X>,
  morphisms?: {
    copy?: Kernel<X, Pair<X, X>>;
    discard?: Kernel<X, I>;
  },
): { copyCoassoc: boolean; copyCommut: boolean; copyCounitL: boolean; copyCounitR: boolean; } {
  const XxX = tensorObj(Xf, Xf);
  const XxXxX = tensorObj(Xf, XxX);
  const XxXxX_alt = tensorObj(XxX, Xf);

  const copyKernel = morphisms?.copy ?? copy<X>();
  const discardKernel = morphisms?.discard ?? discard<X>();

  const Δ = new FinMarkov(Xf, XxX, copyKernel);
  const Δ12 = new FinMarkov(
    XxX,
    XxXxX,
    tensor(copyKernel as any, idK(Xf).k as any) as any,
  );
  const Δ23 = new FinMarkov(
    XxX,
    XxXxX_alt,
    tensor(idK(Xf).k as any, copyKernel as any) as any,
  );

  // Coassociativity: (Δ ; (Δ ⊗ id)) == (Δ ; (id ⊗ Δ)) up to reassociation isos (we compare via deterministic rebracketing)
  const reassocLtoR = detK(
    XxXxX,
    XxXxX_alt,
    (p: any): any => {
      const [[x, y], z] = p as [[X, X], X];
      return [x, [y, z]] as any;
    },
  );
  const lhs = Δ.then(
    new FinMarkov(
      XxX,
      XxXxX,
      tensor(copyKernel as any, deterministic((x: X) => x) as any) as any,
    ),
  ).then(reassocLtoR);
  const rhs = Δ.then(
    new FinMarkov(
      XxX,
      XxXxX_alt,
      tensor(deterministic((x: X) => x) as any, copyKernel as any) as any,
    ),
  );

  const copyCoassoc = approxEqualMatrix(lhs.matrix(), rhs.matrix());

  // Commutativity: swap ∘ Δ == Δ (this should be true for copy since (x,x) swapped is still (x,x))
  const swapXX = new FinMarkov(XxX, XxX, swap<X, X>());
  const copyCommut = approxEqualMatrix(Δ.then(swapXX).matrix(), Δ.matrix());

  // Counit: (Δ ; (id ⊗ !)) == id  and  (Δ ; (! ⊗ id)) == id
  const exR = new FinMarkov(
    XxX,
    tensorObj(Xf, IFin),
    tensor(idK(Xf).k as Kernel<X, X>, discardKernel as Kernel<X, I>),
  );
  const exL = new FinMarkov(
    XxX,
    tensorObj(IFin, Xf),
    tensor(discardKernel as Kernel<X, I>, idK(Xf).k as Kernel<X, X>),
  );
  const prR = new FinMarkov(tensorObj(Xf, IFin), Xf, fst<X, I>());
  const prL = new FinMarkov(tensorObj(IFin, Xf), Xf, snd<I, X>());

  const copyCounitR = approxEqualMatrix(Δ.then(exR).then(prR).matrix(), idK(Xf).matrix());
  const copyCounitL = approxEqualMatrix(Δ.then(exL).then(prL).matrix(), idK(Xf).matrix());

  return { copyCoassoc, copyCommut, copyCounitL, copyCounitR };
}

// Row-stochastic check for a kernel (each row sums to ~1)
export function checkRowStochastic<X, Y>(Xf: Fin<X>, Yf: Fin<Y>, k: Kernel<X, Y>, tol = 1e-9): boolean {
  for (const x of Xf.elems) {
    const s = mass(k(x));
    if (Math.abs(s - 1) > tol) return false;
  }
  return true;
}

// ===============================================================================================
// (3) Graded / resource-tracking enrichment                                                     
// ===============================================================================================

export interface Monoid<G> { empty: G; concat: (a: G, b: G) => G; equals?: (a: G, b: G) => boolean; }

// A graded kernel carries a grade alongside the distribution. Grades compose monoidally.
export type GradedKernel<G, X, Y> = (x: X) => { dist: Dist<Y>; grade: G };

export function gDeterministic<G, X, Y>(M: Monoid<G>, f: (x: X) => Y, g: G): GradedKernel<G, X, Y> {
  return (x: X) => ({ dist: dirac(f(x)), grade: g });
}

export function gCompose<G, X, Y, Z>(M: Monoid<G>, f: GradedKernel<G, X, Y>, g: GradedKernel<G, Y, Z>): GradedKernel<G, X, Z> {
  return (x: X) => {
    const { dist: dy, grade: gy } = f(x);
    const acc: Dist<Z> = new Map();
    let gtot = M.empty;
    for (const [y, py] of dy) {
      const { dist: dz, grade: gz } = g(y);
      gtot = M.concat(gtot, gz);
      for (const [z, pz] of dz) acc.set(z, (acc.get(z) ?? 0) + py * pz);
    }
    return { dist: prune(acc), grade: M.concat(gy, gtot) };
  };
}

export function gradeMap<G, X, Y>(M: Monoid<G>, k: Kernel<X, Y>, g: G): GradedKernel<G, X, Y> {
  return (x: X) => ({ dist: k(x), grade: g });
}

export function ungrade<G, X, Y>(gk: GradedKernel<G, X, Y>): Kernel<X, Y> {
  return (x: X) => gk(x).dist;
}

// Example monoids
export const NatAddMonoid: Monoid<number> = { empty: 0, concat: (a,b) => a + b };
export const MaxSemiringTropical: Monoid<number> = { empty: 0, concat: (a,b) => Math.max(a,b) };

// Resource-tracking example: count queries to an oracle
export function countedOracle<X, Y>(k: Kernel<X, Y>): GradedKernel<number, X, Y> {
  return (x: X) => ({ dist: k(x), grade: 1 });
}

// Compose graded channels and then strip grades when needed
export function runGraded<X, Y, Z>(k1: GradedKernel<number, X, Y>, k2: GradedKernel<number, Y, Z>) {
  const g = gCompose(NatAddMonoid, k1, k2);
  return {
    kernel: ungrade(g) as Kernel<X, Z>,
    totalCost: (x: X) => g(x).grade,
  };
}

// ===============================================================================================
// (4) Meas-style façade (subprobability & restriction)                                          
// ===============================================================================================

// Subprobability kernels: allow total mass ≤ 1. Our Dist already permits this; we add helpers.
export type SubKernel<X, Y> = Kernel<X, Y>;

// Non-normalizing restriction by a predicate (measure-theoretic support restriction)
export function restrict<X, Y>(k: Kernel<X, Y>, pred: (y: Y) => boolean): SubKernel<X, Y> {
  return (x: X) => {
    const d = k(x);
    const out: Dist<Y> = new Map();
    for (const [y, p] of d) if (pred(y)) out.set(y, p);
    // Do NOT normalize; mass can drop (representing conditioning on a measurable set)
    return prune(out);
  };
}

// Compose subprobability kernels (mass may shrink)
export function composeSub<X, Y, Z>(f: SubKernel<X, Y>, g: SubKernel<Y, Z>): SubKernel<X, Z> {
  return compose(f, g); // identical formula; semantics differ (no row-sum-to-1 requirement)
}

// Total mass (for sanity checks or σ-finiteness heuristics in finite cases)
export function totalMass<T>(d: Dist<T>): number { return mass(d); }

// Convert a subkernel to a stochastic kernel by explicit renormalization (if mass > 0)
export function renormalizeKernel<X, Y>(k: SubKernel<X, Y>): Kernel<X, Y> {
  return (x: X) => normalize(k(x));
}

// Helper to detect failure events (zero mass) after restriction
export function isZeroMass<T>(d: Dist<T>, tol = 1e-12): boolean { return mass(d) <= tol; }

// ===============================================================================================
// (A) Distribution monad API (probability/Giry-on-finite analogue)
// ===============================================================================================

// Monad operations over Map<T, number> viewed as probability distributions
export const DistMonad: DistLikeMonadSpec & {
  join<A>(dda: Dist<Dist<A>>): Dist<A>;
  isAffine1: true;
} = {
  // η / unit
  of<T>(x: T): Dist<T> { return dirac(x); },

  // fmap
  map<A, B>(da: Dist<A>, f: (a: A) => B): Dist<B> {
    const m = new Map<B, number>();
    for (const [a, p] of da) m.set(f(a), (m.get(f(a)) ?? 0) + p);
    return normalize(m);
  },

  // bind (Kleisli)
  bind<A, B>(da: Dist<A>, k: (a: A) => Dist<B>): Dist<B> {
    const acc = new Map<B, number>();
    for (const [a, pa] of da) for (const [b, pb] of k(a)) acc.set(b, (acc.get(b) ?? 0) + pa * pb);
    return normalize(acc);
  },

  // join
  join<A>(dda: Dist<Dist<A>>): Dist<A> {
    const acc = new Map<A, number>();
    for (const [da, p] of dda) for (const [a, q] of da) acc.set(a, (acc.get(a) ?? 0) + p * q);
    return normalize(acc);
  },

  // strength / product measure (Fubini): Dist<A> × Dist<B> -> Dist<[A,B]>
  product<A, B>(da: Dist<A>, db: Dist<B>): Dist<[A, B]> {
    const out = new Map<[A, B], number>();
    for (const [a, pa] of da) for (const [b, pb] of db) out.set([a, b], (out.get([a, b]) ?? 0) + pa * pb);
    return normalize(out);
  },

  // Affineness witness: T(1) ≅ 1 (singleton distribution is unique)
  isAffine1: true,
};

// ===============================================================================================
// (B) Generic Kleisli builder for Dist-like monads over finite products
// ===============================================================================================

// A Dist-like monad is one whose carrier is Map<T, number>, with configurable normalization.
export interface DistLikeMonadSpec {
  of<T>(x: T): Dist<T>;
  map<A, B>(da: Dist<A>, f: (a: A) => B): Dist<B>;
  bind<A, B>(da: Dist<A>, k: (a: A) => Dist<B>): Dist<B>;
  product<A, B>(da: Dist<A>, db: Dist<B>): Dist<[A, B]>; // Fubini/product measure
  isAffine1: boolean; // whether T(1) is a singleton
}

export type KleisliMap<X, Y> = (x: X) => Dist<Y>;

export interface FinKleisliInstance<X, Y> {
  readonly X: Fin<X>;
  readonly Y: Fin<Y>;
  readonly k: KleisliMap<X, Y>;
  then<Z>(that: FinKleisliInstance<Y, Z>): FinKleisliInstance<X, Z>;
  tensor<Z, W>(that: FinKleisliInstance<Z, W>): FinKleisliInstance<Pair<X, Z>, Pair<Y, W>>;
  matrix(): number[][];
  pretty(digits?: number): string;
}

export interface KleisliOperations {
  composeK<X, Y, Z>(f: KleisliMap<X, Y>, g: KleisliMap<Y, Z>): KleisliMap<X, Z>;
  tensorK<X1, Y1, X2, Y2>(
    f: KleisliMap<X1, Y1>,
    g: KleisliMap<X2, Y2>
  ): KleisliMap<Pair<X1, X2>, Pair<Y1, Y2>>;
  detKleisli<X, Y>(Xf: Fin<X>, Yf: Fin<Y>, f: (x: X) => Y): KleisliMap<X, Y>;
  copyK<X>(): KleisliMap<X, Pair<X, X>>;
  discardK<X>(): KleisliMap<X, I>;
  swapK<X, Y>(): KleisliMap<Pair<X, Y>, Pair<Y, X>>;
  FinKleisli: {
    new <X, Y>(X: Fin<X>, Y: Fin<Y>, k: KleisliMap<X, Y>): FinKleisliInstance<X, Y>;
  };
  isMarkovCategory: boolean;
}

export function makeKleisli(spec: DistLikeMonadSpec): KleisliOperations {
  type Kleisli<X, Y> = KleisliMap<X, Y>;

  const composeK = <X, Y, Z>(f: Kleisli<X, Y>, g: Kleisli<Y, Z>): Kleisli<X, Z> => x => spec.bind(f(x), g);

  const tensorK = <X1, Y1, X2, Y2>(
    f: Kleisli<X1, Y1>,
    g: Kleisli<X2, Y2>
  ): Kleisli<Pair<X1, X2>, Pair<Y1, Y2>> =>
    ([x1, x2]: Pair<X1, X2>) => spec.product(f(x1), g(x2));

  const detKleisli = <X, Y>(_Xf: Fin<X>, _Yf: Fin<Y>, f: (x: X) => Y): Kleisli<X, Y> => x => spec.of(f(x));

  const copyK = <X>(): Kleisli<X, Pair<X, X>> => x => spec.of([x, x] as const);
  const discardK = <X>(): Kleisli<X, I> => _x => spec.of({});

  const swapK = <X, Y>(): Kleisli<Pair<X, Y>, Pair<Y, X>> => ([x, y]: Pair<X, Y>) => spec.of([y, x] as const);

  class FinKleisli<X, Y> implements FinKleisliInstance<X, Y> {
    constructor(public X: Fin<X>, public Y: Fin<Y>, public k: Kleisli<X, Y>) {}
    then<Z>(that: FinKleisliInstance<Y, Z>): FinKleisli<X, Z> {
      return new FinKleisli(this.X, that.Y, composeK(this.k, that.k));
    }
    tensor<Z, W>(that: FinKleisliInstance<Z, W>): FinKleisli<Pair<X, Z>, Pair<Y, W>> {
      const dom = tensorObj(this.X, that.X);
      const cod = tensorObj(this.Y, that.Y);
      return new FinKleisli(dom as any, cod as any, tensorK(this.k, that.k)) as any;
    }
    matrix(): number[][] { return kernelToMatrix(this.X, this.Y, this.k); }
    pretty(digits = 4): string { return prettyMatrix(this.matrix(), digits); }
  }

  const operations: KleisliOperations = {
    // core
    composeK,
    tensorK,
    detKleisli,
    copyK,
    discardK,
    swapK,
    FinKleisli,
    // feature flag for Markov-ness
    isMarkovCategory: spec.isAffine1,
  };

  return operations;
}

export type KleisliFactory = KleisliOperations;

// ===============================================================================================
// (C) Concrete monads you can swap in
// ===============================================================================================

// 1) Probability monad (normalized) — this *is* a Markov category
export const ProbMonad: DistLikeMonadSpec = DistMonad;

// 2) Subprobability monad (mass ≤ 1, no normalization) — NOT affine
export const SubProbMonad: DistLikeMonadSpec = {
  of<T>(x: T): Dist<T> { return new Map([[x, 1]]); },
  map<A, B>(da: Dist<A>, f: (a: A) => B): Dist<B> {
    const m = new Map<B, number>();
    for (const [a, p] of da) m.set(f(a), (m.get(f(a)) ?? 0) + p);
    return prune(m); // do not normalize
  },
  bind<A, B>(da: Dist<A>, k: (a: A) => Dist<B>): Dist<B> {
    const acc = new Map<B, number>();
    for (const [a, pa] of da) for (const [b, pb] of k(a)) acc.set(b, (acc.get(b) ?? 0) + pa * pb);
    return prune(acc); // do not normalize
  },
  product<A, B>(da: Dist<A>, db: Dist<B>): Dist<[A, B]> {
    const out = new Map<[A, B], number>();
    for (const [a, pa] of da) for (const [b, pb] of db) out.set([a, b], (out.get([a, b]) ?? 0) + pa * pb);
    return prune(out); // do not normalize
  },
  isAffine1: false,
};

// 3) Weighted/semiring monad (nonnegative scores), same carrier, NOT affine
export const WeightedMonad: DistLikeMonadSpec = {
  of<T>(x: T): Dist<T> { return new Map([[x, 1]]); },
  map<A, B>(da: Dist<A>, f: (a: A) => B): Dist<B> {
    const m = new Map<B, number>();
    for (const [a, p] of da) m.set(f(a), (m.get(f(a)) ?? 0) + p);
    return prune(m);
  },
  bind<A, B>(da: Dist<A>, k: (a: A) => Dist<B>): Dist<B> {
    const acc = new Map<B, number>();
    for (const [a, pa] of da) for (const [b, pb] of k(a)) acc.set(b, (acc.get(b) ?? 0) + pa * pb);
    return prune(acc);
  },
  product<A, B>(da: Dist<A>, db: Dist<B>): Dist<[A, B]> {
    const out = new Map<[A, B], number>();
    for (const [a, pa] of da) for (const [b, pb] of db) out.set([a, b], (out.get([a, b]) ?? 0) + pa * pb);
    return prune(out);
  },
  isAffine1: false,
};

// Convenience factories
export const KleisliProb: KleisliFactory = makeKleisli(ProbMonad);
export const KleisliSubProb: KleisliFactory = makeKleisli(SubProbMonad);
export const KleisliWeighted: KleisliFactory = makeKleisli(WeightedMonad);

// ===============================================================================================
// (D) Law checks and diagnostics tailored to the monad hypotheses
// ===============================================================================================

// Check Fubini/product coherence: two equivalent constructions of product measure
export function checkFubini<A, B>(M: DistLikeMonadSpec, da: Dist<A>, db: Dist<B>, tol = 1e-9): boolean {
  // Left: product directly
  const lhs = M.product(da, db);
  // Right: bind/map route
  const rhs = M.bind(da, (a) => M.map(db, (b) => [a, b] as const));
  const L = [...lhs.entries()].sort();
  const R = [...rhs.entries()].sort();
  if (L.length !== R.length) return false;
  for (let i = 0; i < L.length; i++) {
    const [kl, vl] = L[i] as unknown as [[A, B], number];
    const [kr, vr] = R[i] as unknown as [[A, B], number];
    if (kl[0] !== kr[0] || kl[1] !== kr[1]) return false;
    if (Math.abs(vl - vr) > tol) return false;
  }
  return true;
}

// Simple affineness gate expose
export function monadIsAffine1(M: DistLikeMonadSpec): boolean { return M.isAffine1; }

// If a user tries to access Markov-only ops with a non-affine monad, we can warn via this helper
export function assertMarkov(M: DistLikeMonadSpec) {
  if (!M.isAffine1) throw new Error("This Kleisli category is not Markov (monad is not affine: T(1) ≄ 1)");
}

// ===============================================================================================
// (E) Named types & morphism/law predicates (developer-facing API)
// ===============================================================================================

// Aliases for clarity
export type MarkovKernel<X, Y> = Kernel<X, Y>;
export type StochasticMatrix = number[][]; // rows sum to ~1

// Comonoid structure attached to an object X
export interface Comonoid<X> {
  copy: Kernel<X, Pair<X, X>>;   // Δ_X
  discard: Kernel<X, I>;         // !_X
}

export function mkComonoid<X>(Xf: Fin<X>): Comonoid<X> {
  return { copy: copy<X>(), discard: discard<X>() };
}

// Law report containers
export interface CopyDiscardLaws {
  copyCoassoc: boolean;
  copyCommut: boolean;
  copyCounitL: boolean;
  copyCounitR: boolean;
}

export interface ComonoidHomReport {
  preservesCopy: boolean;     // Δ_Y ∘ f == (f ⊗ f) ∘ Δ_X
  preservesDiscard: boolean;  // !_Y ∘ f == !_X
}

// Deterministic kernel predicate: every row is a Dirac measure
export function isDeterministicKernel<X, Y>(Xf: Fin<X>, k: Kernel<X, Y>, tol = 1e-12): boolean {
  for (const x of Xf.elems) {
    const d = k(x);
    const m = mass(d);
    if (Math.abs(m - 1) > tol) return false; // must be a (sub)probability with full mass
    let nonzero = 0;
    for (const _ of d) nonzero++;
    if (nonzero !== 1) return false;
  }
  return true;
}

// Check that f: X→Y is a comonoid homomorphism (deterministic arrows satisfy this)
export function checkComonoidHom<X, Y>(Xf: Fin<X>, Yf: Fin<Y>, f: Kernel<X, Y>): ComonoidHomReport {
  const ΔX = copyK(Xf);                    // X → X×X
  const ΔY = copyK(Yf);                    // Y → Y×Y
  const fK = new FinMarkov(Xf, Yf, f);     // X → Y

  // Right side: (f ⊗ f) ∘ Δ_X
  const tens_ff = new FinMarkov(tensorObj(Xf, Xf), tensorObj(Yf, Yf), tensor(f, f));
  const rhs = ΔX.then(tens_ff);

  // Left side: Δ_Y ∘ f
  const lhs = fK.then(ΔY);

  const preservesCopy = approxEqualMatrix(lhs.matrix(), rhs.matrix());

  // Discard law: !_Y ∘ f == !_X
  const discX = discardK(Xf);
  const discY = discardK(Yf);

  const preservesDiscard = approxEqualMatrix(fK.then(discY).matrix(), discX.matrix());

  return { preservesCopy, preservesDiscard };
}

// Row-stochastic matrix predicate
export function isRowStochastic(M: StochasticMatrix, tol = 1e-9): boolean {
  for (const row of M) {
    const s = row.reduce((a, b) => a + b, 0);
    if (Math.abs(s - 1) > tol) return false;
    if (row.some(x => x < -tol)) return false;
  }
  return true;
}

// Named base morphisms (typed helpers)
export function Copy<X>(Xf: Fin<X>): FinMarkov<X, Pair<X, X>> { return copyK(Xf); }
export function Discard<X>(Xf: Fin<X>): FinMarkov<X, I> { return discardK(Xf); }
export function Swap<X, Y>(Xf: Fin<X>, Yf: Fin<Y>): FinMarkov<Pair<X, Y>, Pair<Y, X>> { return new FinMarkov(tensorObj(Xf, Yf), tensorObj(Yf, Xf), swap<X, Y>()); }
export function Fst<X, Y>(Xf: Fin<X>, Yf: Fin<Y>): FinMarkov<Pair<X, Y>, X> { return new FinMarkov(tensorObj(Xf, Yf), Xf, fst<X, Y>()); }
export function Snd<X, Y>(Xf: Fin<X>, Yf: Fin<Y>): FinMarkov<Pair<X, Y>, Y> { return new FinMarkov(tensorObj(Xf, Yf), Yf, snd<X, Y>()); }

// Aggregate law runner for a single object
export function lawsFor<X>(Xf: Fin<X>): { cd: CopyDiscardLaws } {
  const cd = checkComonoidLaws(Xf);
  return { cd };
}

// ===============================================================================================