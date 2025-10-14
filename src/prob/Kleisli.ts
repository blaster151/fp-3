import type { Dist } from "./Dist";
import { DistMonad } from "./Dist";

/** A Markov kernel (finite): a -> Dist<b> */
export type Kernel<A, B> = (a: A) => Dist<B>;

/** Kleisli identity for Dist: η = of */
export function kid<A>(): Kernel<A, A> {
  return (a: A) => DistMonad.of(a);
}

/** Kleisli composition: (k ▷ l)(a) = k(a) >>= l */
export function kcomp<A, B, C>(k: Kernel<A, B>, l: Kernel<B, C>): Kernel<A, C> {
  return (a: A) => DistMonad.chain(k(a), l);
}

/** Post-map along a pure function g: B -> C (natural ‘pushforward’) */
export function kmap<A, B, C>(k: Kernel<A, B>, g: (b: B) => C): Kernel<A, C> {
  return (a: A) => DistMonad.map(k(a), g);
}
