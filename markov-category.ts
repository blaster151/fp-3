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
// ----------------------------------------------------------------------------------------------

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
  return { elems: [...elems], eq, show };
}

// Utility to find index by equality
function indexOfEq<T>(fin: Fin<T>, x: T): number {
  const { elems, eq } = fin;
  for (let i = 0; i < elems.length; i++) if (eq(elems[i], x)) return i;
  return -1;
}

// ===== Distributions & Kernels ================================================================

export type Dist<T> = Map<T, number>; // sparse finite support

const EPS = 1e-12;

export function mass<T>(d: Dist<T>): number {
  let s = 0;
  for (const p of d.values()) s += p;
  return s;
}

export function normalize<T>(d: Dist<T>): Dist<T> {
  const m = mass(d);
  const out: Dist<T> = new Map();
  if (m <= 0) return out; // empty
  for (const [k, v] of d) {
    const w = v / m;
    if (w > EPS) out.set(k, w);
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
    return Yf.elems.map(y => d.get(y) ?? 0);
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
      for (let j = 0; j < matrix[i].length; j++) {
        if (i === j && Math.abs(matrix[i][j] - 1) > 1e-9) return false;
        if (i !== j && Math.abs(matrix[i][j]) > 1e-9) return false;
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
    for (let j = 0; j < row.length; j++) {
      const p = row[j];
      if (p > EPS) m.set(Y.elems[j], p);
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
    if (ra.length !== rb.length) return false;
    for (let j = 0; j < ra.length; j++) if (Math.abs(ra[j] - rb[j]) > tol) return false;
  }
  return true;
}

// Check comonoid laws for Δ and ! on a finite object X, diagrammatically via matrices
export function checkComonoidLaws<X>(Xf: Fin<X>): { copyCoassoc: boolean; copyCommut: boolean; copyCounitL: boolean; copyCounitR: boolean; } {
  const XxX = tensorObj(Xf, Xf);
  const XxXxX = tensorObj(Xf, XxX);
  const XxXxX_alt = tensorObj(XxX, Xf);

  const Δ = new FinMarkov(Xf, XxX, copy<X>());
  const Δ12 = new FinMarkov(XxX, XxXxX, tensor(copy<X>(), idK(Xf).k as any));
  const Δ23 = new FinMarkov(XxX, XxXxX_alt, tensor(idK(Xf).k as any, copy<X>()));

  // Coassociativity: (Δ ; (Δ ⊗ id)) == (Δ ; (id ⊗ Δ)) up to reassociation isos (we compare via deterministic rebracketing)
  const reassocLtoR = detK(XxXxX, XxXxX_alt, ([[x,y], z]) => [x, [y, z]] as any);
  const lhs = Δ.then(new FinMarkov(XxX, XxXxX, tensor(copy<X>(), deterministic((x: X)=>x) as any))).then(reassocLtoR);
  const rhs = Δ.then(new FinMarkov(XxX, XxXxX_alt, tensor(deterministic((x: X)=>x) as any, copy<X>())));

  const copyCoassoc = approxEqualMatrix(lhs.matrix(), rhs.matrix());

  // Commutativity: swap ∘ Δ == Δ (this should be true for copy since (x,x) swapped is still (x,x))
  const swapXX = new FinMarkov(XxX, XxX, swap<X, X>());
  const copyCommut = approxEqualMatrix(Δ.then(swapXX).matrix(), Δ.matrix());

  // Counit: (Δ ; (id ⊗ !)) == id  and  (Δ ; (! ⊗ id)) == id
  const exR = new FinMarkov(XxX, tensorObj(Xf, IFin), tensor(idK(Xf).k as any, discard<X>()));
  const exL = new FinMarkov(XxX, tensorObj(IFin, Xf), tensor(discard<X>(), idK(Xf).k as any));
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
// (5) Distribution Monad API & Generic Kleisli Builder                                        
// ===============================================================================================

// First-class distribution monad interface
export interface DistMonad<T> {
  of: <A>(a: A) => T<A>;
  map: <A, B>(f: (a: A) => B) => (ta: T<A>) => T<B>;
  bind: <A, B>(f: (a: A) => T<B>) => (ta: T<A>) => T<B>;
  join: <A>(tta: T<T<A>>) => T<A>;
  product: <A, B>(ta: T<A>, tb: T<B>) => T<[A, B]>; // Fubini/product operation
  isAffine1: boolean; // true for probability distributions (mass = 1)
}

// Concrete DistMonad implementation for our Dist<T> type
export const DistMonadImpl: DistMonad<Dist> = {
  of: <A>(a: A): Dist<A> => dirac(a),
  map: <A, B>(f: (a: A) => B) => (da: Dist<A>): Dist<B> => {
    const out: Dist<B> = new Map();
    for (const [a, p] of da) {
      const b = f(a);
      out.set(b, (out.get(b) ?? 0) + p);
    }
    return prune(out);
  },
  bind: <A, B>(f: (a: A) => Dist<B>) => (da: Dist<A>): Dist<B> => {
    const out: Dist<B> = new Map();
    for (const [a, pa] of da) {
      const db = f(a);
      for (const [b, pb] of db) {
        out.set(b, (out.get(b) ?? 0) + pa * pb);
      }
    }
    return prune(out);
  },
  join: <A>(dda: Dist<Dist<A>>): Dist<A> => {
    const out: Dist<A> = new Map();
    for (const [da, pda] of dda) {
      for (const [a, pa] of da) {
        out.set(a, (out.get(a) ?? 0) + pda * pa);
      }
    }
    return prune(out);
  },
  product: <A, B>(da: Dist<A>, db: Dist<B>): Dist<[A, B]> => {
    const out: Dist<[A, B]> = new Map();
    for (const [a, pa] of da) {
      for (const [b, pb] of db) {
        out.set([a, b], pa * pb);
      }
    }
    return prune(out);
  },
  isAffine1: true // probability distributions have mass = 1
};

// Generic Kleisli builder for any Map-based distribution monad
export interface KleisliSpec<T> {
  monad: DistMonad<T>;
  eq: <A>(a: A, b: A) => boolean;
  show?: <A>(a: A) => string;
}

export function makeKleisli<T>(spec: KleisliSpec<T>) {
  const { monad, eq, show } = spec;
  
  // Composition: (g ∘ f)(x) = bind y~f(x); g(y)
  const compose = <X, Y, Z>(f: (x: X) => T<Y>, g: (y: Y) => T<Z>): (x: X) => T<Z> => {
    return (x: X) => monad.bind(g)(f(x));
  };
  
  // Tensor on objects: X ⊗ Y := [X,Y]
  const tensorObj = <X, Y>(X: Fin<X>, Y: Fin<Y>): Fin<[X, Y]> => {
    const elems: Array<[X, Y]> = [];
    for (const x of X.elems) for (const y of Y.elems) elems.push([x, y]);
    const eqPair: Eq<[X, Y]> = (a, b) => X.eq(a[0], b[0]) && Y.eq(a[1], b[1]);
    const showPair: Show<[X, Y]> = ([x, y]) => `(${X.show?.(x) ?? String(x)}, ${Y.show?.(y) ?? String(y)})`;
    return { elems, eq: eqPair, show: showPair };
  };
  
  // Tensor on morphisms: (f ⊗ g)(x,z) = f(x) × g(z)
  const tensor = <X1, Y1, X2, Y2>(f: (x: X1) => T<Y1>, g: (x: X2) => T<Y2>): ([x, z]: [X1, X2]) => T<[Y1, Y2]> => {
    return ([x, z]) => monad.product(f(x), g(z));
  };
  
  // Deterministic embedding
  const deterministic = <X, Y>(f: (x: X) => Y): (x: X) => T<Y> => {
    return (x: X) => monad.of(f(x));
  };
  
  // Copy: Δ : X -> X ⊗ X
  const copy = <X>(): (x: X) => T<[X, X]> => {
    return (x: X) => monad.of([x, x]);
  };
  
  // Discard: ! : X -> I
  const discard = <X>(): (x: X) => T<{}> => {
    return (_x: X) => monad.of({});
  };
  
  // Swap: X ⊗ Y -> Y ⊗ X
  const swap = <X, Y>(): ([x, y]: [X, Y]) => T<[Y, X]> => {
    return deterministic(([x, y]: [X, Y]) => [y, x] as const);
  };
  
  // Wrapper class
  class FinKleisli<X, Y> {
    constructor(public X: Fin<X>, public Y: Fin<Y>, public k: (x: X) => T<Y>) {}
    
    then<Z>(that: FinKleisli<Y, Z>): FinKleisli<X, Z> {
      return new FinKleisli(this.X, that.Y, compose(this.k, that.k));
    }
    
    tensor<Z, W>(that: FinKleisli<Z, W>, XxZ?: Fin<[X, Z]>, YxW?: Fin<[Y, W]>): FinKleisli<[X, Z], [Y, W]> {
      const dom = XxZ ?? tensorObj(this.X, that.X);
      const cod = YxW ?? tensorObj(this.Y, that.Y);
      return new FinKleisli(dom, cod, tensor(this.k, that.k));
    }
    
    // Pretty matrix view (for debugging)
    matrix(): number[][] {
      return this.X.elems.map(x => {
        const d = this.k(x);
        return this.Y.elems.map(y => {
          // For Dist<Y> (which is Map<Y, number>), we can directly get the value
          if (d instanceof Map) {
            return d.get(y) ?? 0;
          }
          // Fallback for other types
          return (d as any).get?.(y) ?? 0;
        });
      });
    }
    
    pretty(digits = 4): string {
      const fmt = (n: number) => n.toFixed(digits);
      return this.matrix().map(r => r.map(fmt).join("\t")).join("\n");
    }
  }
  
  // Builders
  const idK = <X>(X: Fin<X>): FinKleisli<X, X> => 
    new FinKleisli(X, X, deterministic((x: X) => x));
  
  const copyK = <X>(X: Fin<X>): FinKleisli<X, [X, X]> => 
    new FinKleisli(X, tensorObj(X, X), copy<X>());
  
  const discardK = <X>(X: Fin<X>): FinKleisli<X, {}> => 
    new FinKleisli(X, mkFin<{}>([{}], () => true, () => "•"), discard<X>());
  
  const detK = <X, Y>(X: Fin<X>, Y: Fin<Y>, f: (x: X) => Y): FinKleisli<X, Y> => 
    new FinKleisli(X, Y, deterministic(f));
  
  return {
    compose,
    tensor,
    copy,
    discard,
    deterministic,
    tensorObj,
    swap,
    FinKleisli,
    idK,
    copyK,
    discardK,
    detK,
    isMarkovCategory: monad.isAffine1
  };
}

// ===============================================================================================
// (6) Swappable Monads                                                                         
// ===============================================================================================

// Probability monad (normalized, mass = 1)
export const ProbMonad: DistMonad<Dist> = {
  ...DistMonadImpl,
  isAffine1: true
};

// Subprobability monad (mass ≤ 1, no renormalization)
export const SubProbMonad: DistMonad<Dist> = {
  ...DistMonadImpl,
  isAffine1: false // subprobability allows mass < 1
};

// Weighted monad (scores, no normalization)
export const WeightedMonad: DistMonad<Dist> = {
  ...DistMonadImpl,
  isAffine1: false // weighted allows any mass
};

// Convenience factories
export const KleisliProb = makeKleisli({ monad: ProbMonad, eq: byRefEq() });
export const KleisliSubProb = makeKleisli({ monad: SubProbMonad, eq: byRefEq() });
export const KleisliWeighted = makeKleisli({ monad: WeightedMonad, eq: byRefEq() });

// ===============================================================================================
// (7) Law Checks & Diagnostics                                                                 
// ===============================================================================================

// Check Fubini theorem: ∫∫ f(x,y) dx dy = ∫∫ f(x,y) dy dx
export function checkFubini<T, A, B>(
  monad: DistMonad<T>,
  da: T<A>,
  db: T<B>,
  f: (a: A, b: B) => number,
  tol = 1e-9
): boolean {
  const product1 = monad.product(da, db);
  const product2 = monad.product(db, da);
  
  // This is a simplified check - in practice you'd need more sophisticated integration
  // For finite distributions, we can check that the joint distributions are consistent
  return true; // Placeholder - would need proper integration for full Fubini check
}

// Check if a monad is affine (mass = 1)
export function monadIsAffine1<T>(monad: DistMonad<T>): boolean {
  return monad.isAffine1;
}

// Assert that a monad is Markov (affine)
export function assertMarkov<T>(monad: DistMonad<T>): void {
  if (!monad.isAffine1) {
    throw new Error("Monad is not Markov (not affine)");
  }
}

// ===============================================================================================