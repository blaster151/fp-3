import { arr, comp, denot, fanout as arrowFanout, first as arrowFirst, IR, leftArrow as arrowLeft, par as arrowPar, rightArrow as arrowRight, second as arrowSecond } from "./arrow-ir";

const identity = <T>(value: T): T => value;

export interface Profunctor<I, O> {
  readonly ir: IR<I, O>;
}

const wrap = <I, O>(ir: IR<I, O>): Profunctor<I, O> => ({ ir });

export const toIR = <I, O>(instance: Profunctor<I, O>): IR<I, O> => instance.ir;

export const fromIR = wrap;

export const arrP = <I, O>(f: (input: I) => O): Profunctor<I, O> => wrap(arr(f));

export const run = <I, O>(instance: Profunctor<I, O>): ((input: I) => O) => denot(instance.ir);

export const id = <A>(): Profunctor<A, A> => arrP(identity);

export const compose = <A, B, C>(ab: Profunctor<A, B>, bc: Profunctor<B, C>): Profunctor<A, C> =>
  wrap(comp(ab.ir, bc.ir));

export const dimap = <A, B, C, D>(
  instance: Profunctor<B, C>,
  pre: (input: A) => B,
  post: (output: C) => D,
): Profunctor<A, D> => wrap(comp(comp(arr(pre), instance.ir), arr(post)));

export const lmap = <A, B, C>(instance: Profunctor<B, C>, pre: (input: A) => B): Profunctor<A, C> =>
  dimap(instance, pre, identity);

export const rmap = <A, B, C>(instance: Profunctor<A, B>, post: (output: B) => C): Profunctor<A, C> =>
  dimap(instance, identity, post);

export const first = <A, B, C>(instance: Profunctor<A, B>): Profunctor<readonly [A, C], readonly [B, C]> =>
  wrap(arrowFirst(instance.ir) as IR<readonly [A, C], readonly [B, C]>);

export const second = <A, B, C>(instance: Profunctor<A, B>): Profunctor<readonly [C, A], readonly [C, B]> =>
  wrap(arrowSecond(instance.ir) as IR<readonly [C, A], readonly [C, B]>);

export const left = <A, B, C>(instance: Profunctor<A, B>): Profunctor<
  { readonly _tag: "Left"; readonly value: A } | { readonly _tag: "Right"; readonly value: C },
  { readonly _tag: "Left"; readonly value: B } | { readonly _tag: "Right"; readonly value: C }
> => wrap(
  arrowLeft(instance.ir) as IR<
    { readonly _tag: "Left"; readonly value: A } | { readonly _tag: "Right"; readonly value: C },
    { readonly _tag: "Left"; readonly value: B } | { readonly _tag: "Right"; readonly value: C }
  >,
);

export const right = <A, B, C>(instance: Profunctor<A, B>): Profunctor<
  { readonly _tag: "Left"; readonly value: C } | { readonly _tag: "Right"; readonly value: A },
  { readonly _tag: "Left"; readonly value: C } | { readonly _tag: "Right"; readonly value: B }
> => wrap(
  arrowRight(instance.ir) as IR<
    { readonly _tag: "Left"; readonly value: C } | { readonly _tag: "Right"; readonly value: A },
    { readonly _tag: "Left"; readonly value: C } | { readonly _tag: "Right"; readonly value: B }
  >,
);

export const split = <A, B, C, D>(
  leftInstance: Profunctor<A, B>,
  rightInstance: Profunctor<C, D>,
): Profunctor<readonly [A, C], readonly [B, D]> =>
  wrap(arrowPar(leftInstance.ir, rightInstance.ir) as IR<readonly [A, C], readonly [B, D]>);

export const fanout = <A, B, C>(
  leftInstance: Profunctor<A, B>,
  rightInstance: Profunctor<A, C>,
): Profunctor<A, readonly [B, C]> => wrap(arrowFanout(leftInstance.ir, rightInstance.ir) as IR<A, readonly [B, C]>);

export const ProfunctorToolkit = {
  fromIR,
  toIR,
  arr: arrP,
  id,
  run,
  compose,
  dimap,
  lmap,
  rmap,
  first,
  second,
  left,
  right,
  split,
  fanout,
} as const;

