export interface Monoid<M> {
  readonly e: M;
  readonly op: (a: M, b: M) => M;
  readonly elements?: ReadonlyArray<M>;
}

export interface MSet<M, X> {
  readonly M: Monoid<M>;
  readonly carrier: ReadonlyArray<X>;
  readonly act: (m: M, x: X) => X;
}

export interface MSetHom<M, X, Y> {
  readonly dom: MSet<M, X>;
  readonly cod: MSet<M, Y>;
  readonly map: (x: X) => Y;
}

const inCarrier = <X>(carrier: ReadonlyArray<X>, value: X): boolean =>
  carrier.some((candidate) => Object.is(candidate, value));

export const checkAction = <M, X>(structure: MSet<M, X>): boolean => {
  const { M, carrier, act } = structure;
  const elements = M.elements ?? [];
  if (elements.length === 0) return true;
  return carrier.every((x) => {
    const unitAct = act(M.e, x);
    if (!Object.is(unitAct, x)) return false;
    return elements.every((a) =>
      elements.every((b) => {
        const left = act(M.op(a, b), x);
        const right = act(a, act(b, x));
        return Object.is(left, right);
      })
    );
  });
};

export const isMSetHom = <M, X, Y>(h: MSetHom<M, X, Y>): boolean => {
  const { dom, cod, map } = h;
  const elements = dom.M.elements ?? [];
  const imageWithinCarrier = dom.carrier.every((x) => inCarrier(cod.carrier, map(x)));
  if (!imageWithinCarrier) return false;
  if (elements.length === 0) return true;
  return elements.every((m) =>
    dom.carrier.every((x) => {
      const mapped = map(x);
      if (!inCarrier(cod.carrier, mapped)) return false;
      const lhs = map(dom.act(m, x));
      if (!inCarrier(cod.carrier, lhs)) return false;
      const rhs = cod.act(m, mapped);
      if (!inCarrier(cod.carrier, rhs)) return false;
      return Object.is(lhs, rhs);
    })
  );
};

export const idMSet = <M, X>(structure: MSet<M, X>): MSetHom<M, X, X> => ({
  dom: structure,
  cod: structure,
  map: (x: X) => x,
});

export const composeMSet = <M, A, B, C>(g: MSetHom<M, B, C>, f: MSetHom<M, A, B>): MSetHom<M, A, C> => {
  if (f.cod !== g.dom) throw new Error('composeMSet: domain/codomain mismatch');
  return {
    dom: f.dom,
    cod: g.cod,
    map: (a: A) => g.map(f.map(a)),
  };
};

export const MSetCat = <M>(M: Monoid<M>) => ({
  obj: <X>(carrier: ReadonlyArray<X>, act: (m: M, x: X) => X): MSet<M, X> => ({
    M,
    carrier,
    act,
  }),
  hom: <X, Y>(dom: MSet<M, X>, cod: MSet<M, Y>, map: (x: X) => Y): MSetHom<M, X, Y> => ({
    dom,
    cod,
    map,
  }),
  id: idMSet as <X>(structure: MSet<M, X>) => MSetHom<M, X, X>,
  compose: composeMSet as <A, B, C>(g: MSetHom<M, B, C>, f: MSetHom<M, A, B>) => MSetHom<M, A, C>,
  isHom: isMSetHom as <X, Y>(h: MSetHom<M, X, Y>) => boolean,
  checkAction: checkAction as (structure: MSet<M, unknown>) => boolean,
});
