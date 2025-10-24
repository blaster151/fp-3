import type { SimpleCat } from "./simple-cat";
import type { FunctorWithWitness } from "./functor";

export type FunctorPropertyKind = "object" | "arrow";

export interface CategoryPropertyCheck<Witness> {
  readonly holds: boolean;
  readonly witness?: Witness;
  readonly details?: string;
}

export interface ObjectPropertySample<Obj> {
  readonly kind: "object";
  readonly object: Obj;
  readonly label?: string;
}

export interface ArrowPropertySample<Arr> {
  readonly kind: "arrow";
  readonly arrow: Arr;
  readonly label?: string;
}

export type FunctorPropertySample<Obj, Arr> =
  | ObjectPropertySample<Obj>
  | ArrowPropertySample<Arr>;

export interface ObjectPropertyOracle<Obj, Arr, Witness> {
  readonly kind: "object";
  readonly name: string;
  readonly evaluate: (
    category: SimpleCat<Obj, Arr>,
    object: Obj,
  ) => CategoryPropertyCheck<Witness>;
}

export interface ArrowPropertyOracle<Obj, Arr, Witness> {
  readonly kind: "arrow";
  readonly name: string;
  readonly evaluate: (
    category: SimpleCat<Obj, Arr>,
    arrow: Arr,
  ) => CategoryPropertyCheck<Witness>;
}

export type CategoryPropertyOracle<Obj, Arr, Witness> =
  | ObjectPropertyOracle<Obj, Arr, Witness>
  | ArrowPropertyOracle<Obj, Arr, Witness>;

export type FunctorPropertyMode = "preserves" | "reflects" | "both";

export interface FunctorPropertyOracle<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  Kind extends FunctorPropertyKind,
  SrcWitness,
  TgtWitness,
> {
  readonly property: string;
  readonly kind: Kind;
  readonly mode: FunctorPropertyMode;
  readonly source: CategoryPropertyOracle<SrcObj, SrcArr, SrcWitness> & {
    readonly kind: Kind;
  };
  readonly target: CategoryPropertyOracle<TgtObj, TgtArr, TgtWitness> & {
    readonly kind: Kind;
  };
  readonly samples?: ReadonlyArray<FunctorPropertySample<SrcObj, SrcArr>>;
  readonly details?: ReadonlyArray<string>;
  readonly counterexample?: FunctorPropertyCounterexampleBuilder<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr,
    Kind,
    SrcWitness,
    TgtWitness
  >;
}

export interface FunctorPropertyFailure<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  Kind extends FunctorPropertyKind,
  SrcWitness,
  TgtWitness,
> {
  readonly kind: Kind;
  readonly sample: FunctorPropertySample<SrcObj, SrcArr>;
  readonly sourceResult: CategoryPropertyCheck<SrcWitness>;
  readonly targetResult: CategoryPropertyCheck<TgtWitness>;
  readonly reason: string;
  readonly counterexample?: FunctorPropertyCounterexampleDetail;
}

export interface FunctorPropertyAnalysis<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  Kind extends FunctorPropertyKind,
  SrcWitness,
  TgtWitness,
> {
  readonly property: string;
  readonly kind: Kind;
  readonly mode: FunctorPropertyMode;
  readonly preservationFailures: ReadonlyArray<
    FunctorPropertyFailure<SrcObj, SrcArr, TgtObj, TgtArr, Kind, SrcWitness, TgtWitness>
  >;
  readonly reflectionFailures: ReadonlyArray<
    FunctorPropertyFailure<SrcObj, SrcArr, TgtObj, TgtArr, Kind, SrcWitness, TgtWitness>
  >;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface FunctorPropertyCounterexampleDetail {
  readonly summary: string;
  readonly data?: unknown;
  readonly notes?: ReadonlyArray<string>;
}

export interface FunctorPropertyCounterexampleInput<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  Kind extends FunctorPropertyKind,
  SrcWitness,
  TgtWitness,
> {
  readonly functor: FunctorWithWitness<SrcObj, SrcArr, TgtObj, TgtArr>;
  readonly sample: FunctorPropertySample<SrcObj, SrcArr>;
  readonly sourceResult: CategoryPropertyCheck<SrcWitness>;
  readonly targetResult: CategoryPropertyCheck<TgtWitness>;
  readonly mode: FunctorPropertyMode;
}

export type FunctorPropertyCounterexampleBuilder<
  SrcObj,
  SrcArr,
  TgtObj,
  TgtArr,
  Kind extends FunctorPropertyKind,
  SrcWitness,
  TgtWitness,
> = (
  input: FunctorPropertyCounterexampleInput<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr,
    Kind,
    SrcWitness,
    TgtWitness
  >,
) => FunctorPropertyCounterexampleDetail | undefined;

export type AnyFunctorPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr> =
  FunctorPropertyOracle<SrcObj, SrcArr, TgtObj, TgtArr, FunctorPropertyKind, unknown, unknown>;

export type AnyFunctorPropertyAnalysis<SrcObj, SrcArr, TgtObj, TgtArr> =
  FunctorPropertyAnalysis<
    SrcObj,
    SrcArr,
    TgtObj,
    TgtArr,
    FunctorPropertyKind,
    unknown,
    unknown
  >;
