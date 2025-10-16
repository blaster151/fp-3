export type SetObj<A> = Set<A>;

/**
 * Generic readonly view of a set.
 *
 * Historically various modules imported `AnySet` when working with
 * categorified set operations.  Re-introducing it as a `ReadonlySet`
 * preserves that API surface while ensuring callers don't rely on
 * mutation, which keeps future Markov/category adapters honest about
 * variance.
 */
export type AnySet<A> = ReadonlySet<A>;

export interface SetHom<A, B> {
  readonly dom: SetObj<A>;
  readonly cod: SetObj<B>;
  readonly map: (a: A) => B;
}

type Pair<A, B> = readonly [A, B];

interface ProductCarrier<A, B> {
  readonly object: SetObj<Pair<A, B>>;
  readonly lookup: (a: A, b: B) => Pair<A, B>;
}

interface CoproductInjections<A, B> {
  readonly inl: SetHom<A, Coproduct<A, B>>;
  readonly inr: SetHom<B, Coproduct<A, B>>;
}

interface ProductProjections<A, B> {
  readonly fst: SetHom<Pair<A, B>, A>;
  readonly snd: SetHom<Pair<A, B>, B>;
}

export type Coproduct<A, B> =
  | { readonly tag: "inl"; readonly value: A }
  | { readonly tag: "inr"; readonly value: B };

interface CoproductCarrier<A, B> {
  readonly object: SetObj<Coproduct<A, B>>;
  readonly inlLookup: (value: A) => Coproduct<A, B>;
  readonly inrLookup: (value: B) => Coproduct<A, B>;
}

interface ProductData<A, B> {
  readonly object: SetObj<Pair<A, B>>;
  readonly projections: ProductProjections<A, B>;
  readonly pair: <X>(f: SetHom<X, A>, g: SetHom<X, B>) => SetHom<X, Pair<A, B>>;
}

interface CoproductData<A, B> {
  readonly object: SetObj<Coproduct<A, B>>;
  readonly injections: CoproductInjections<A, B>;
  readonly copair: <X>(
    f: SetHom<A, X>,
    g: SetHom<B, X>,
  ) => SetHom<Coproduct<A, B>, X>;
}

interface TerminalData {
  readonly object: SetObj<Terminal>;
  readonly terminate: <A>(dom: SetObj<A>) => SetHom<A, Terminal>;
}

interface InitialData {
  readonly object: SetObj<never>;
  readonly initialize: <A>(cod: SetObj<A>) => SetHom<never, A>;
}

type Terminal = { readonly kind: "⋆" };

const terminalValue: Terminal = { kind: "⋆" };

const terminalObj: SetObj<Terminal> = new Set([terminalValue]);

const initialObj: SetObj<never> = new Set();

const cartesianProduct = <A, B>(left: SetObj<A>, right: SetObj<B>): ProductCarrier<A, B> => {
  const lookup = new Map<A, Map<B, Pair<A, B>>>();
  const pairs: Array<Pair<A, B>> = [];
  for (const a of left) {
    let column = lookup.get(a);
    if (!column) {
      column = new Map();
      lookup.set(a, column);
    }
    for (const b of right) {
      let pair = column.get(b);
      if (!pair) {
        pair = [a, b] as const;
        column.set(b, pair);
        pairs.push(pair);
      }
    }
  }
  return {
    object: new Set(pairs),
    lookup: (a, b) => {
      const column = lookup.get(a);
      if (!column) {
        throw new Error("SetCat: product pairing referenced an element outside the left factor");
      }
      const pair = column.get(b);
      if (!pair) {
        throw new Error("SetCat: product pairing referenced an element outside the right factor");
      }
      return pair;
    },
  };
};

const buildCoproductCarrier = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
): CoproductCarrier<A, B> => {
  const elements: Array<Coproduct<A, B>> = [];
  const inlMap = new Map<A, Coproduct<A, B>>();
  const inrMap = new Map<B, Coproduct<A, B>>();
  for (const value of left) {
    const tagged: Coproduct<A, B> = { tag: "inl", value };
    elements.push(tagged);
    inlMap.set(value, tagged);
  }
  for (const value of right) {
    const tagged: Coproduct<A, B> = { tag: "inr", value };
    elements.push(tagged);
    inrMap.set(value, tagged);
  }
  return {
    object: new Set(elements),
    inlLookup: (value) => {
      const tagged = inlMap.get(value);
      if (!tagged) {
        throw new Error("SetCat: coproduct injection referenced an element outside the left summand");
      }
      return tagged;
    },
    inrLookup: (value) => {
      const tagged = inrMap.get(value);
      if (!tagged) {
        throw new Error("SetCat: coproduct injection referenced an element outside the right summand");
      }
      return tagged;
    },
  };
};

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

const createSetHom = <A, B>(
  dom: SetObj<A>,
  cod: SetObj<B>,
  map: (a: A) => B,
): SetHom<A, B> => {
  const morphism = { dom, cod, map } as const;
  if (!isSetHom(morphism)) {
    throw new Error("SetCat: morphism image must land in declared codomain");
  }
  return morphism;
};

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
  hom: createSetHom,
  compose: composeSet,
  isHom: isSetHom,
  product: <A, B>(left: SetObj<A>, right: SetObj<B>): ProductData<A, B> => {
    const carrier = cartesianProduct(left, right);
    const projections: ProductProjections<A, B> = {
      fst: createSetHom(carrier.object, left, (pair) => pair[0]),
      snd: createSetHom(carrier.object, right, (pair) => pair[1]),
    };
    const pair = <X>(f: SetHom<X, A>, g: SetHom<X, B>): SetHom<X, Pair<A, B>> => {
      if (f.dom !== g.dom) {
        throw new Error("SetCat: product pairing requires shared domain");
      }
      if (f.cod !== left || g.cod !== right) {
        throw new Error("SetCat: product pairing expects morphisms into the declared factors");
      }
      return createSetHom(f.dom, carrier.object, (value) => carrier.lookup(f.map(value), g.map(value)));
    };
    return { object: carrier.object, projections, pair };
  },
  coproduct: <A, B>(left: SetObj<A>, right: SetObj<B>): CoproductData<A, B> => {
    const carrier = buildCoproductCarrier(left, right);
    const injections: CoproductInjections<A, B> = {
      inl: createSetHom(left, carrier.object, (value) => carrier.inlLookup(value)),
      inr: createSetHom(right, carrier.object, (value) => carrier.inrLookup(value)),
    };
    const copair = <X>(f: SetHom<A, X>, g: SetHom<B, X>): SetHom<Coproduct<A, B>, X> => {
      if (f.cod !== g.cod) {
        throw new Error("SetCat: coproduct copairing requires a shared codomain");
      }
      if (f.dom !== left || g.dom !== right) {
        throw new Error("SetCat: coproduct copairing expects morphisms from the declared summands");
      }
      return createSetHom(carrier.object, f.cod, (tagged) =>
        tagged.tag === "inl" ? f.map(tagged.value) : g.map(tagged.value),
      );
    };
    return { object: carrier.object, injections, copair };
  },
  terminal: (): TerminalData => ({
    object: terminalObj,
    terminate: <A>(dom: SetObj<A>): SetHom<A, Terminal> =>
      createSetHom(dom, terminalObj, () => terminalValue),
  }),
  initial: (): InitialData => ({
    object: initialObj,
    initialize: <A>(cod: SetObj<A>): SetHom<never, A> =>
      createSetHom(initialObj, cod, (value) => value),
  }),
};
