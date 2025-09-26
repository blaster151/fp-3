// preord-cat.ts — the category of preorders and monotone maps
// -----------------------------------------------------------------------------
// Objects are preorders (P, ≤). A morphism between preorders is a monotone map
// preserving the underlying preorder relation.

import { Preorder } from "./preorder-cat";

export interface PreordHom<A, B> {
  readonly dom: Preorder<A>;
  readonly cod: Preorder<B>;
  readonly map: (value: A) => B;
}

const inCarrier = <X>(carrier: ReadonlyArray<X>, value: X): boolean =>
  carrier.some((candidate) => Object.is(candidate, value));

export const isMonotone = <A, B>(h: PreordHom<A, B>): boolean => {
  const { dom, cod, map } = h;
  return dom.elems.every((a) => {
    const mappedA = map(a);
    if (!inCarrier(cod.elems, mappedA)) {
      return false;
    }
    return dom.elems.every((b) => {
      if (!dom.le(a, b)) {
        return true;
      }
      const mappedB = map(b);
      if (!inCarrier(cod.elems, mappedB)) {
        return false;
      }
      return cod.le(mappedA, mappedB);
    });
  });
};

export const idPreordHom = <A>(P: Preorder<A>): PreordHom<A, A> => ({
  dom: P,
  cod: P,
  map: (value: A) => value,
});

export const composePreordHom = <A, B, C>(
  g: PreordHom<B, C>,
  f: PreordHom<A, B>,
): PreordHom<A, C> => {
  if (f.cod !== g.dom) {
    throw new Error("PreordCat: domain/codomain mismatch");
  }
  return {
    dom: f.dom,
    cod: g.cod,
    map: (value: A) => g.map(f.map(value)),
  };
};

export const PreordCat = {
  obj: <A>(P: Preorder<A>) => P,
  hom: <A, B>(dom: Preorder<A>, cod: Preorder<B>, map: (value: A) => B): PreordHom<A, B> => {
    const morphism: PreordHom<A, B> = { dom, cod, map };
    if (!isMonotone(morphism)) {
      throw new Error("PreordCat: map must be monotone and land in the codomain");
    }
    return morphism;
  },
  id: idPreordHom,
  compose: composePreordHom,
  isHom: isMonotone,
};

