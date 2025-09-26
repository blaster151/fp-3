export type SetObj<A> = Set<A>;

export interface SetHom<A, B> {
  readonly dom: SetObj<A>;
  readonly cod: SetObj<B>;
  readonly map: (a: A) => B;
}

export function isSetHom<A, B>(h: SetHom<A, B>): boolean {
  const { dom, cod, map } = h;
  for (const a of dom) {
    if (!cod.has(map(a))) {
      return false;
    }
  }
  return true;
}

export function idSet<A>(carrier: SetObj<A>): SetHom<A, A> {
  return { dom: carrier, cod: carrier, map: (a) => a };
}

export function composeSet<A, B, C>(g: SetHom<B, C>, f: SetHom<A, B>): SetHom<A, C> {
  if (f.cod !== g.dom) {
    throw new Error('SetCat: domain/codomain mismatch');
  }
  return {
    dom: f.dom,
    cod: g.cod,
    map: (a) => g.map(f.map(a)),
  };
}

export const SetCat = {
  obj: <A>(elements: Iterable<A>): SetObj<A> => new Set(elements),
  id: idSet,
  hom: <A, B>(dom: SetObj<A>, cod: SetObj<B>, map: (a: A) => B): SetHom<A, B> => {
    const morphism = { dom, cod, map } as const;
    if (!isSetHom(morphism)) {
      throw new Error('SetCat: morphism image must land in declared codomain');
    }
    return morphism;
  },
  compose: composeSet,
  isHom: isSetHom,
};
