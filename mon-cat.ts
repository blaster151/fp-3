// mon-cat.ts — the category of monoids and monoid homomorphisms
// -----------------------------------------------------------------------------
// Objects are monoids (M, op, e) and arrows are monoid homomorphisms preserving
// the unit and multiplication. When a monoid carries a finite `elements`
// witness we can verify preservation exhaustively; otherwise we trust callers.

import type { Monoid } from "./monoid-cat";

export interface MonoidHom<M, N> {
  readonly dom: Monoid<M>;
  readonly cod: Monoid<N>;
  readonly map: (value: M) => N;
}

const isInCarrier = <X>(carrier: ReadonlyArray<X> | undefined, value: X): boolean =>
  carrier === undefined || carrier.some((candidate) => Object.is(candidate, value));

export const isMonoidHom = <M, N>(h: MonoidHom<M, N>): boolean => {
  const { dom, cod, map } = h;

  if (!Object.is(map(dom.e), cod.e)) {
    return false;
  }

  const elements = dom.elements;
  if (!elements || elements.length === 0) {
    return true;
  }

  return elements.every((a) =>
    elements.every((b) => {
      const image = map(dom.op(a, b));
      if (!isInCarrier(cod.elements, image)) {
        return false;
      }
      const composed = cod.op(map(a), map(b));
      return Object.is(image, composed);
    })
  );
};

export const idMonoidHom = <M>(monoid: Monoid<M>): MonoidHom<M, M> => ({
  dom: monoid,
  cod: monoid,
  map: (value: M) => value,
});

export const composeMonoidHom = <A, B, C>(
  g: MonoidHom<B, C>,
  f: MonoidHom<A, B>,
): MonoidHom<A, C> => {
  if (f.cod !== g.dom) {
    throw new Error("MonCat: domain/codomain mismatch");
  }
  return {
    dom: f.dom,
    cod: g.cod,
    map: (value: A) => g.map(f.map(value)),
  };
};

export const MonCat = {
  obj: <M>(monoid: Monoid<M>) => monoid,
  hom: <M, N>(dom: Monoid<M>, cod: Monoid<N>, map: (value: M) => N): MonoidHom<M, N> => {
    const morphism: MonoidHom<M, N> = { dom, cod, map };
    if (!isMonoidHom(morphism)) {
      throw new Error("MonCat: morphism must preserve unit and multiplication");
    }
    return morphism;
  },
  id: idMonoidHom,
  compose: composeMonoidHom,
  isHom: isMonoidHom,
};

