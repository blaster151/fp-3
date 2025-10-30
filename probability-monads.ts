// probability-monads.ts — semiring-aware distribution monads with legacy adapters
// --------------------------------------------------------------------------------
// This module historically exposed probability monads backed by plain Map-based
// distributions. As part of the Markov family refactor we now front these exports
// with the parametric Dist<R, X> representation from dist.ts while keeping
// backwards-compatible shims for existing call sites that still expect Map
// payloads. The new rigged specs carry explicit CSRig witnesses together with
// adapters that translate weights to numeric form for legacy code.

import {
  tensorObj,
  kernelToMatrix,
  prettyMatrix,
} from "./markov-category";
import type {
  Fin,
  Pair,
  I,
  KleisliMap,
  FinKleisliInstance,
  KleisliOperations,
} from "./markov-category";
import { GiryMonad, makeGiryKleisli } from "./giry";
import type { Dist as ParamDist } from "./dist";
import { dirac as paramDirac, map as paramMap, bind as paramBind } from "./dist";
import type { CSRig } from "./semiring-utils";
import { Prob, BoolRig, LogProb } from "./semiring-utils";

// ===== Semiring-aware distribution specs ======================================================

export type LegacyDist<T> = Map<T, number>;

export interface WeightAdapter<R> {
  readonly toNumber: (weight: R) => number;
  readonly fromNumber: (weight: number) => R;
}

export interface RiggedDistMonadSpec<R> {
  readonly rig: CSRig<R>;
  of<T>(x: T): ParamDist<R, T>;
  map<A, B>(da: ParamDist<R, A>, f: (a: A) => B): ParamDist<R, B>;
  bind<A, B>(da: ParamDist<R, A>, k: (a: A) => ParamDist<R, B>): ParamDist<R, B>;
  product<A, B>(da: ParamDist<R, A>, db: ParamDist<R, B>): ParamDist<R, [A, B]>;
  readonly isAffine1: boolean;
  normalize?<X>(d: ParamDist<R, X>): ParamDist<R, X>;
}

export interface DistLikeMonadSpec<R = number> {
  of<T>(x: T): LegacyDist<T>;
  map<A, B>(da: LegacyDist<A>, f: (a: A) => B): LegacyDist<B>;
  bind<A, B>(da: LegacyDist<A>, k: (a: A) => LegacyDist<B>): LegacyDist<B>;
  product<A, B>(da: LegacyDist<A>, db: LegacyDist<B>): LegacyDist<[A, B]>;
  readonly isAffine1: boolean;
  readonly rig?: CSRig<R>;
  readonly weightAdapter?: WeightAdapter<R>;
  readonly rigged?: RiggedDistMonadSpec<R>;
  toLegacy?<X>(d: ParamDist<R, X>): LegacyDist<X>;
  fromLegacy?<X>(legacy: LegacyDist<X>): ParamDist<R, X>;
}

const makeZeroPruner = <R>(R: CSRig<R>) => {
  const isZero = R.isZero ?? ((a: R) => R.eq(a, R.zero));
  return <X>(d: ParamDist<R, X>): ParamDist<R, X> => {
    const cleaned = new Map<X, R>();
    d.w.forEach((weight, x) => {
      if (!isZero(weight)) cleaned.set(x, weight);
    });
    return { R: d.R, w: cleaned };
  };
};

const makeProduct = <R>(R: CSRig<R>) =>
  <A, B>(da: ParamDist<R, A>, db: ParamDist<R, B>): ParamDist<R, [A, B]> => {
    const out = new Map<[A, B], R>();
    da.w.forEach((wa, a) => {
      db.w.forEach((wb, b) => {
        const key: [A, B] = [a, b];
        const current = out.get(key) ?? R.zero;
        out.set(key, R.add(current, R.mul(wa, wb)));
      });
    });
    return { R, w: out };
  };

type SpecOptions<R> = {
  readonly isAffine1: boolean;
  readonly normalize?: <X>(d: ParamDist<R, X>) => ParamDist<R, X>;
};

const makeRiggedSpec = <R>(
  rig: CSRig<R>,
  adapter: WeightAdapter<R>,
  options: SpecOptions<R>,
): { rigged: RiggedDistMonadSpec<R>; legacy: DistLikeMonadSpec<R> } => {
  const applyNormalize = options.normalize ?? (<X>(d: ParamDist<R, X>) => d);
  const toLegacy = <X>(d: ParamDist<R, X>): LegacyDist<X> => {
    const out = new Map<X, number>();
    d.w.forEach((weight, x) => {
      out.set(x, adapter.toNumber(weight));
    });
    return out;
  };
  const fromLegacy = <X>(legacy: LegacyDist<X>): ParamDist<R, X> => {
    const weights = new Map<X, R>();
    legacy.forEach((weight, x) => {
      weights.set(x, adapter.fromNumber(weight));
    });
    return { R: rig, w: weights };
  };

  const product = makeProduct(rig);

  const rigged: RiggedDistMonadSpec<R> = {
    rig,
    isAffine1: options.isAffine1,
    ...(options.normalize !== undefined && { normalize: options.normalize }),
    of<T>(x: T) {
      return applyNormalize(paramDirac<R, T>(rig)(x));
    },
    map<A, B>(da: ParamDist<R, A>, f: (a: A) => B) {
      return applyNormalize(paramMap<R, A, B>(da, f));
    },
    bind<A, B>(da: ParamDist<R, A>, k: (a: A) => ParamDist<R, B>) {
      const result = paramBind<R, A, B>(da, k);
      return applyNormalize(result);
    },
    product<A, B>(da: ParamDist<R, A>, db: ParamDist<R, B>) {
      return applyNormalize(product<A, B>(da, db));
    },
  };

  const legacy: DistLikeMonadSpec<R> = {
    isAffine1: options.isAffine1,
    rig,
    weightAdapter: adapter,
    rigged,
    toLegacy,
    fromLegacy,
    of<T>(x: T) {
      return toLegacy(rigged.of(x));
    },
    map<A, B>(da: LegacyDist<A>, f: (a: A) => B) {
      return toLegacy(rigged.map(fromLegacy(da), f));
    },
    bind<A, B>(da: LegacyDist<A>, k: (a: A) => LegacyDist<B>) {
      const riggedResult = rigged.bind(fromLegacy(da), (a) => fromLegacy(k(a)));
      return toLegacy(riggedResult);
    },
    product<A, B>(da: LegacyDist<A>, db: LegacyDist<B>) {
      return toLegacy(rigged.product(fromLegacy(da), fromLegacy(db)));
    },
  };

  return { rigged, legacy };
};

const numericAdapter: WeightAdapter<number> = {
  toNumber: (x) => x,
  fromNumber: (x) => x,
};

const booleanAdapter: WeightAdapter<boolean> = {
  toNumber: (x) => (x ? 1 : 0),
  fromNumber: (x) => x !== 0,
};

const probabilitySpec = makeRiggedSpec(Prob, numericAdapter, {
  isAffine1: true,
  normalize: makeZeroPruner(Prob),
});

const subProbabilitySpec = makeRiggedSpec(Prob, numericAdapter, {
  isAffine1: false,
  normalize: makeZeroPruner(Prob),
});

const weightedSpec = makeRiggedSpec(Prob, numericAdapter, {
  isAffine1: false,
  normalize: makeZeroPruner(Prob),
});

export const RiggedProbMonad = probabilitySpec.rigged;
export const RiggedSubProbMonad = subProbabilitySpec.rigged;
export const RiggedWeightedMonad = weightedSpec.rigged;

// Legacy exports (Map-based) ---------------------------------------------------
export const DistMonad: DistLikeMonadSpec<number> = probabilitySpec.legacy;
export const SubProbMonad: DistLikeMonadSpec<number> = subProbabilitySpec.legacy;
export const WeightedMonad: DistLikeMonadSpec<number> = weightedSpec.legacy;

const ensureLegacyBridge = <R>(spec: DistLikeMonadSpec<R>) => {
  const { fromLegacy, toLegacy } = spec;
  if (!fromLegacy || !toLegacy) {
    throw new Error("Legacy distribution bridge unavailable; ensure the probability spec exposes conversions");
  }
  return { fromLegacy, toLegacy };
};

const probabilityLegacyBridge = ensureLegacyBridge(DistMonad);

export const probabilityLegacyToRigged = <X>(legacy: LegacyDist<X>): ParamDist<number, X> =>
  probabilityLegacyBridge.fromLegacy(legacy);

export const probabilityRiggedToLegacy = <X>(dist: ParamDist<number, X>): LegacyDist<X> =>
  probabilityLegacyBridge.toLegacy(dist);

export const BoolWeightAdapter = booleanAdapter;
export const LogProbWeightAdapter = numericAdapter; // log weights stay numeric

export const makeRiggedDistSpec = makeRiggedSpec;

// ===== Kleisli factory (legacy Map-based until markov-category migrates) =======================

export type KleisliFactory = KleisliOperations;

export function makeKleisli(spec: DistLikeMonadSpec): KleisliOperations {
  type Kleisli<X, Y> = KleisliMap<X, Y>;
  const composeK = <X, Y, Z>(f: Kleisli<X, Y>, g: Kleisli<Y, Z>): Kleisli<X, Z> =>
    (x) => spec.bind(f(x), g);
  const tensorK = <X1, Y1, X2, Y2>(
    f: Kleisli<X1, Y1>,
    g: Kleisli<X2, Y2>,
  ): Kleisli<Pair<X1, X2>, Pair<Y1, Y2>> =>
    ([x1, x2]) => spec.product(f(x1), g(x2));
  const detKleisli = <X, Y>(_Xf: Fin<X>, _Yf: Fin<Y>, f: (x: X) => Y): Kleisli<X, Y> =>
    (x) => spec.of(f(x));
  const copyK = <X>(): Kleisli<X, Pair<X, X>> => (x) => spec.of([x, x] as const);
  const discardK = <X>(): Kleisli<X, I> => (_: X) => spec.of({} as I);
  const swapK = <X, Y>(): Kleisli<Pair<X, Y>, Pair<Y, X>> =>
    ([x, y]) => spec.of([y, x] as const);

  class FinKleisli<X, Y> implements FinKleisliInstance<X, Y> {
    constructor(public X: Fin<X>, public Y: Fin<Y>, public k: Kleisli<X, Y>) {}
    then<Z>(that: FinKleisliInstance<Y, Z>) {
      return new FinKleisli(this.X, that.Y, composeK(this.k, that.k));
    }
    tensor<Z, W>(that: FinKleisliInstance<Z, W>) {
      const dom = tensorObj(this.X, that.X);
      const cod = tensorObj(this.Y, that.Y);
      return new FinKleisli<Pair<X, Z>, Pair<Y, W>>(dom, cod, tensorK(this.k, that.k));
    }
    matrix() { return kernelToMatrix(this.X, this.Y, this.k); }
    pretty(digits = 4) { return prettyMatrix(this.matrix(), digits); }
  }

  const operations: KleisliOperations = {
    composeK,
    tensorK,
    detKleisli,
    copyK,
    discardK,
    swapK,
    FinKleisli,
    isMarkovCategory: spec.isAffine1,
  };

  return operations;
}

export const KleisliProb: KleisliFactory = makeKleisli(DistMonad);
export const KleisliSubProb: KleisliFactory = makeKleisli(SubProbMonad);
export const KleisliWeighted: KleisliFactory = makeKleisli(WeightedMonad);
export const GiryKleisli = makeGiryKleisli();
export const GiryMonadSpec = GiryMonad;

// ===== Migration helpers ======================================================================

export const requireRigged = <R>(spec: DistLikeMonadSpec<R>): RiggedDistMonadSpec<R> => {
  if (!spec.rigged) {
    throw new Error("DistLikeMonadSpec is missing rigged semantics; upgrade required");
  }
  return spec.rigged;
};

// Convenience exports for canonical rigs we actively support
export const ProbabilityRig = Prob;
export const BooleanRig = BoolRig;
export const LogProbabilityRig = LogProb;
