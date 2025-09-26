export interface DynSys<X> {
  readonly carrier: ReadonlyArray<X>;
  readonly step: (x: X) => X;
}

export interface DynHom<X, Y> {
  readonly dom: DynSys<X>;
  readonly cod: DynSys<Y>;
  readonly map: (x: X) => Y;
}

const inCarrier = <Y>(carrier: ReadonlyArray<Y>, value: Y): boolean =>
  carrier.some((candidate) => Object.is(candidate, value));

export const isDynHom = <X, Y>(h: DynHom<X, Y>): boolean => {
  const { dom, cod, map } = h;
  return dom.carrier.every((x) => {
    const mapped = map(x);
    if (!inCarrier(cod.carrier, mapped)) return false;
    const lhs = map(dom.step(x));
    if (!inCarrier(cod.carrier, lhs)) return false;
    const rhs = cod.step(mapped);
    if (!inCarrier(cod.carrier, rhs)) return false;
    return Object.is(lhs, rhs);
  });
};

export const idDyn = <X>(sys: DynSys<X>): DynHom<X, X> => ({
  dom: sys,
  cod: sys,
  map: (x: X) => x,
});

export const composeDyn = <A, B, C>(g: DynHom<B, C>, f: DynHom<A, B>): DynHom<A, C> => {
  if (f.cod !== g.dom) throw new Error('composeDyn: domain/codomain mismatch');
  return {
    dom: f.dom,
    cod: g.cod,
    map: (a: A) => g.map(f.map(a)),
  };
};

export const DynCat = {
  obj: <X>(carrier: ReadonlyArray<X>, step: (x: X) => X): DynSys<X> => ({ carrier, step }),
  hom: <X, Y>(dom: DynSys<X>, cod: DynSys<Y>, map: (x: X) => Y): DynHom<X, Y> => ({ dom, cod, map }),
  id: idDyn,
  compose: composeDyn,
  isHom: isDynHom,
};
