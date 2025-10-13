declare module 'fast-check' {
  interface ArbitraryCore {
    readonly map?: <U = unknown>(f: (value: unknown) => U) => Arbitrary<U>;
    readonly filter?: (predicate: (value: unknown) => boolean) => Arbitrary<unknown>;
    readonly chain?: <U = unknown>(f: (value: unknown) => Arbitrary<U>) => Arbitrary<U>;
    readonly sample?: (count?: number) => ReadonlyArray<unknown>;
  }

  export interface Arbitrary<T = unknown> extends ArbitraryCore {}

  export type Property = unknown;
  export type SyncPredicate<TArgs extends readonly unknown[]> = (...args: TArgs) => boolean | void;
  export type AsyncPredicate<TArgs extends readonly unknown[]> = (...args: TArgs) => PromiseLike<boolean | void>;

  export function assert(property: Property): void | Promise<void>;
  export function property<T1>(arb1: Arbitrary<T1>, predicate: SyncPredicate<[T1]>): Property;
  export function property<T1, T2>(arb1: Arbitrary<T1>, arb2: Arbitrary<T2>, predicate: SyncPredicate<[T1, T2]>): Property;
  export function asyncProperty<T1>(arb1: Arbitrary<T1>, predicate: AsyncPredicate<[T1]>): Property;
  export function asyncProperty<T1, T2>(arb1: Arbitrary<T1>, arb2: Arbitrary<T2>, predicate: AsyncPredicate<[T1, T2]>): Property;

  export function integer(): Arbitrary<number>;
  export function nat(): Arbitrary<number>;
  export function float(constraints?: { readonly min?: number; readonly max?: number }): Arbitrary<number>;
  export function tuple<A extends readonly unknown[]>(...arbs: { [K in keyof A]: Arbitrary<A[K]> }): Arbitrary<A>;
  export function option<T>(arb: Arbitrary<T>): Arbitrary<T | null>;
  export function array<T>(
    arb: Arbitrary<T>,
    constraints?: { readonly minLength?: number; readonly maxLength?: number }
  ): Arbitrary<T[]>;
  export function constant<T>(value: T): Arbitrary<T>;
  export function constantFrom<T>(...values: readonly T[]): Arbitrary<T>;
  export function record<T extends Record<string, unknown>>(shape: { [K in keyof T]: Arbitrary<T[K]> }): Arbitrary<T>;
  export function boolean(): Arbitrary<boolean>;
  export function string(): Arbitrary<string>;
  export function oneof<T>(...arbs: readonly Arbitrary<T>[]): Arbitrary<T>;
  export function func<R>(arb: Arbitrary<R>): Arbitrary<(...args: unknown[]) => R>;

  const fc: {
    assert: typeof assert;
    property: typeof property;
    asyncProperty: typeof asyncProperty;
    integer: typeof integer;
    nat: typeof nat;
    float: typeof float;
    tuple: typeof tuple;
    option: typeof option;
    array: typeof array;
    constant: typeof constant;
    constantFrom: typeof constantFrom;
    record: typeof record;
    boolean: typeof boolean;
    string: typeof string;
    oneof: typeof oneof;
    func: typeof func;
  };

  export default fc;
}
