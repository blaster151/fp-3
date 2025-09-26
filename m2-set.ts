import { DynHom, DynSys } from './dynsys';
import { MSet, MSetCat, MSetHom, Monoid } from './mset';

export type M2 = number;

const ensureNat = (n: number): number => {
  if (!Number.isInteger(n) || n < 0) throw new Error(`M2: expected non-negative integer, received ${n}`);
  return n;
};

const iterate = <X>(n: number, step: (x: X) => X, x: X): X => {
  let result = x;
  for (let i = 0; i < n; i++) {
    result = step(result);
  }
  return result;
};

export const M2Monoid: Monoid<M2> = {
  e: 0,
  op: (a, b) => ensureNat(a) + ensureNat(b),
  elements: [0, 1, 2],
};

export const dynToM2 = <X>(system: DynSys<X>): MSet<M2, X> => ({
  M: M2Monoid,
  carrier: system.carrier,
  act: (m, x) => iterate(ensureNat(m), system.step, x),
});

export const m2ToDyn = <X>(structure: MSet<M2, X>): DynSys<X> => ({
  carrier: structure.carrier,
  step: (x) => structure.act(1, x),
});

export const dynHomToM2 = <X, Y>(h: DynHom<X, Y>): MSetHom<M2, X, Y> => ({
  dom: dynToM2(h.dom),
  cod: dynToM2(h.cod),
  map: h.map,
});

export const m2HomToDyn = <X, Y>(h: MSetHom<M2, X, Y>): DynHom<X, Y> => ({
  dom: m2ToDyn(h.dom),
  cod: m2ToDyn(h.cod),
  map: h.map,
});

export const M2SetCat = MSetCat(M2Monoid);
