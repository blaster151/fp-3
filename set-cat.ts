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

export interface ProductData<A, B> {
  readonly object: SetObj<Pair<A, B>>;
  readonly projections: ProductProjections<A, B>;
  readonly pair: <X>(f: SetHom<X, A>, g: SetHom<X, B>) => SetHom<X, Pair<A, B>>;
  readonly lookup?: (left: A, right: B) => Pair<A, B>;
}

export interface CoproductData<A, B> {
  readonly object: SetObj<Coproduct<A, B>>;
  readonly injections: CoproductInjections<A, B>;
  readonly copair: <X>(
    f: SetHom<A, X>,
    g: SetHom<B, X>,
  ) => SetHom<Coproduct<A, B>, X>;
}

export type ExponentialArrow<A, B> = (value: A) => B;

export interface CurryInput<X, A, B> {
  readonly domain: SetObj<X>;
  readonly product?: ProductData<X, A>;
  readonly morphism: SetHom<Pair<X, A>, B>;
}

export interface UncurryInput<X, A, B> {
  readonly product?: ProductData<X, A>;
  readonly morphism: SetHom<X, ExponentialArrow<A, B>>;
}

export interface ExponentialData<A, B> {
  readonly object: SetObj<ExponentialArrow<A, B>>;
  readonly evaluation: SetHom<Pair<ExponentialArrow<A, B>, A>, B>;
  readonly evaluationProduct: ProductData<ExponentialArrow<A, B>, A>;
  readonly curry: <X>(input: CurryInput<X, A, B>) => SetHom<X, ExponentialArrow<A, B>>;
  readonly uncurry: <X>(input: UncurryInput<X, A, B>) => SetHom<Pair<X, A>, B>;
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

const LAZY_CUTOFF = 10_000;

export type LazySetOptions<A> = {
  readonly iterate: () => IterableIterator<A>;
  readonly has: (value: A) => boolean;
  readonly cardinality?: number;
  readonly tag?: string;
};

const LAZY_SET_MARKER = Symbol.for("SetCat.LazySet");

class LazySet<A> implements Set<A> {
  private readonly iterateFn: () => IterableIterator<A>;
  private readonly membership: (value: A) => boolean;
  private readonly knownCardinality: number | undefined;
  private readonly seen = new Set<A>();

  public readonly [LAZY_SET_MARKER] = true;

  public constructor(options: LazySetOptions<A>) {
    this.iterateFn = options.iterate;
    this.membership = options.has;
    this.knownCardinality = options.cardinality;
    this.tagLabel = options.tag ?? "LazySet";
  }

  private readonly tagLabel: string;

  public get [Symbol.toStringTag](): string {
    return this.tagLabel;
  }

  public get size(): number {
    if (this.knownCardinality !== undefined) {
      return this.knownCardinality;
    }
    return Number.POSITIVE_INFINITY;
  }

  public get cardinality(): number | undefined {
    return this.knownCardinality;
  }

  public has(value: A): boolean {
    if (this.seen.has(value)) {
      return true;
    }
    const result = this.membership(value);
    if (result) {
      this.seen.add(value);
    }
    return result;
  }

  public add(_: A): this {
    throw new Error("SetCat lazy carriers are immutable");
  }

  public clear(): void {
    throw new Error("SetCat lazy carriers are immutable");
  }

  public delete(_: A): boolean {
    return false;
  }

  public entries(): IterableIterator<[A, A]> {
    return this.iterateMapped((value) => [value, value] as const);
  }

  public keys(): IterableIterator<A> {
    return this[Symbol.iterator]();
  }

  public values(): IterableIterator<A> {
    return this[Symbol.iterator]();
  }

  public forEach(callbackfn: (value: A, value2: A, set: Set<A>) => void, thisArg?: unknown): void {
    for (const value of this) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  public [Symbol.iterator](): IterableIterator<A> {
    const iterator = this.iterateFn();
    const seen = this.seen;
    return (function* iterate() {
      for (const value of iterator) {
        seen.add(value);
        yield value;
      }
    })();
  }

  private iterateMapped<T>(map: (value: A) => T): IterableIterator<T> {
    const iterator = this[Symbol.iterator]();
    return (function* mapped() {
      for (const value of iterator) {
        yield map(value);
      }
    })();
  }
}

export function isLazySet<A>(value: SetObj<A>): value is LazySet<A>;
export function isLazySet(value: unknown): value is LazySet<unknown>;
export function isLazySet<A>(value: unknown): value is LazySet<A> {
  return typeof value === "object" && value !== null && (value as { [LAZY_SET_MARKER]?: boolean })[LAZY_SET_MARKER] === true;
}

type MaybeFinite = number | undefined;

const knownFiniteCardinality = <A>(carrier: SetObj<A>): MaybeFinite => {
  if (isLazySet(carrier)) {
    const { cardinality } = carrier;
    if (cardinality !== undefined && Number.isFinite(cardinality)) {
      return cardinality;
    }
    return undefined;
  }
  if (Number.isFinite(carrier.size)) {
    return carrier.size;
  }
  return undefined;
};

const multiplyCardinality = <A, B>(left: SetObj<A>, right: SetObj<B>): number | undefined => {
  const leftSize = knownFiniteCardinality(left);
  const rightSize = knownFiniteCardinality(right);
  if (leftSize === undefined || rightSize === undefined) {
    return undefined;
  }
  const product = leftSize * rightSize;
  return Number.isFinite(product) ? product : undefined;
};

const addCardinality = <A, B>(left: SetObj<A>, right: SetObj<B>): number | undefined => {
  const leftSize = knownFiniteCardinality(left);
  const rightSize = knownFiniteCardinality(right);
  if (leftSize === undefined || rightSize === undefined) {
    return undefined;
  }
  const sum = leftSize + rightSize;
  return Number.isFinite(sum) ? sum : undefined;
};

const shouldMaterializeProduct = <A, B>(left: SetObj<A>, right: SetObj<B>): boolean => {
  const productSize = multiplyCardinality(left, right);
  if (productSize === undefined) {
    return false;
  }
  return productSize <= LAZY_CUTOFF;
};

const shouldMaterializeCoproduct = <A, B>(left: SetObj<A>, right: SetObj<B>): boolean => {
  const sumSize = addCardinality(left, right);
  if (sumSize === undefined) {
    return false;
  }
  return sumSize <= LAZY_CUTOFF;
};

const shouldMaterializeExponential = <A, B>(base: SetObj<A>, codomain: SetObj<B>): boolean => {
  const baseSize = knownFiniteCardinality(base);
  const codSize = knownFiniteCardinality(codomain);
  if (baseSize === undefined || codSize === undefined) {
    return false;
  }
  let combinations = 1;
  for (let i = 0; i < baseSize; i += 1) {
    combinations *= codSize;
    if (!Number.isFinite(combinations) || combinations > LAZY_CUTOFF) {
      return false;
    }
  }
  return combinations <= LAZY_CUTOFF;
};

const isPair = <A, B>(value: unknown): value is Pair<A, B> =>
  Array.isArray(value) && value.length === 2;

const cartesianProduct = <A, B>(left: SetObj<A>, right: SetObj<B>): ProductCarrier<A, B> => {
  const lookup = new Map<A, Map<B, Pair<A, B>>>();
  const ensurePair = (a: A, b: B): Pair<A, B> => {
    if (!left.has(a)) {
      throw new Error("SetCat: product pairing referenced an element outside the left factor");
    }
    if (!right.has(b)) {
      throw new Error("SetCat: product pairing referenced an element outside the right factor");
    }
    let column = lookup.get(a);
    if (!column) {
      column = new Map();
      lookup.set(a, column);
    }
    let pair = column.get(b);
    if (!pair) {
      pair = [a, b] as const;
      column.set(b, pair);
    }
    return pair;
  };

  if (shouldMaterializeProduct(left, right)) {
    const pairs = new Set<Pair<A, B>>();
    for (const a of left) {
      for (const b of right) {
        pairs.add(ensurePair(a, b));
      }
    }
    return {
      object: pairs,
      lookup: ensurePair,
    };
  }

  const iterate = function* (): IterableIterator<Pair<A, B>> {
    for (const a of left) {
      for (const b of right) {
        yield ensurePair(a, b);
      }
    }
  };

  const cardinality = multiplyCardinality(left, right);

  const object = new LazySet<Pair<A, B>>({
    iterate,
    has: (value) => {
      if (!isPair<A, B>(value)) {
        return false;
      }
      const [a, b] = value;
      if (!left.has(a) || !right.has(b)) {
        return false;
      }
      return ensurePair(a, b) === value;
    },
    ...(cardinality !== undefined ? { cardinality } : {}),
    tag: "SetCatLazyProduct",
  });

  return {
    object,
    lookup: ensurePair,
  };
};

const buildProductData = <A, B>(left: SetObj<A>, right: SetObj<B>): ProductData<A, B> => {
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
    return createSetHom(
      f.dom,
      carrier.object,
      (value) => carrier.lookup(f.map(value), g.map(value)),
    );
  };
  return { object: carrier.object, projections, pair, lookup: carrier.lookup };
};

const createExponentialFunction = <A, B>(
  base: SetObj<A>,
  assignments: Map<A, B>,
): ExponentialArrow<A, B> =>
  (value: A) => {
    if (!base.has(value)) {
      throw new Error("SetCat: exponential function applied outside the declared base set");
    }
    if (!assignments.has(value)) {
      throw new Error("SetCat: exponential function is undefined on a base element");
    }
    return assignments.get(value) as B;
  };

const createLazyExponentialFunction = <A, B>(
  base: SetObj<A>,
  codomain: SetObj<B>,
  evaluate: (value: A) => B,
): ExponentialArrow<A, B> => {
  const cache = new Map<A, B>();
  return (value: A) => {
    if (!base.has(value)) {
      throw new Error("SetCat: exponential function applied outside the declared base set");
    }
    if (cache.has(value)) {
      return cache.get(value) as B;
    }
    const result = evaluate(value);
    if (!codomain.has(result)) {
      throw new Error("SetCat: exponential function produced a value outside the declared codomain");
    }
    cache.set(value, result);
    return result;
  };
};

interface ExponentialTrieNode<A, B> {
  readonly branches: Map<B, ExponentialTrieNode<A, B>>;
  value?: ExponentialArrow<A, B>;
}

interface ExponentialCarrier<A, B> {
  readonly object: SetObj<ExponentialArrow<A, B>>;
  readonly register: (assignment: (value: A) => B) => ExponentialArrow<A, B>;
}

const enumerateExponentialCarrier = <A, B>(
  base: SetObj<A>,
  codomain: SetObj<B>,
): ExponentialCarrier<A, B> => {
  if (!shouldMaterializeExponential(base, codomain)) {
    const known = new Set<ExponentialArrow<A, B>>();
    const object: SetObj<ExponentialArrow<A, B>> = new LazySet({
      iterate: function* (): IterableIterator<ExponentialArrow<A, B>> {
        for (const fn of known) {
          yield fn;
        }
      },
      has: (fn) => known.has(fn),
      tag: "SetCatLazyExponential",
    });

    const register = (assignment: (value: A) => B): ExponentialArrow<A, B> => {
      const fn = createLazyExponentialFunction(base, codomain, assignment);
      known.add(fn);
      return fn;
    };

    return { object, register };
  }

  const baseElements = Array.from(base.values());
  const codomainElements = Array.from(codomain.values());
  type Node = ExponentialTrieNode<A, B>;
  const root: Node = { branches: new Map() };
  const functions: Array<ExponentialArrow<A, B>> = [];

  if (baseElements.length === 0) {
    const assignments = new Map<A, B>();
    const fn = createExponentialFunction(base, assignments);
    root.value = fn;
    functions.push(fn);
  } else {
    const assignment: B[] = new Array(baseElements.length);

    const build = (index: number, node: Node) => {
      if (index === baseElements.length) {
        const assignments = new Map<A, B>();
        for (let i = 0; i < baseElements.length; i += 1) {
          const baseElement = baseElements[i];
          if (baseElement === undefined) {
            throw new Error("SetCat: exponential enumeration encountered an undefined base element");
          }
          const valueAtIndex = assignment[i];
          if (valueAtIndex === undefined) {
            throw new Error("SetCat: exponential enumeration encountered an undefined assignment value");
          }
          assignments.set(baseElement, valueAtIndex as B);
        }
        const fn = createExponentialFunction(base, assignments);
        node.value = fn;
        functions.push(fn);
        return;
      }

      for (const value of codomainElements) {
        assignment[index] = value;
        let branch = node.branches.get(value);
        if (!branch) {
          branch = { branches: new Map() };
          node.branches.set(value, branch);
        }
        build(index + 1, branch);
      }
    };

    build(0, root);
  }

  const object: SetObj<ExponentialArrow<A, B>> = new Set(functions);

  const retrieve = (outputs: ReadonlyArray<B>): ExponentialArrow<A, B> => {
    if (outputs.length !== baseElements.length) {
      throw new Error("SetCat: curry produced an assignment with the wrong arity for the exponential");
    }

    let node: Node | undefined = root;
    for (const value of outputs) {
      node = node?.branches.get(value);
      if (!node) {
        break;
      }
    }

    const fn = node?.value ?? root.value;
    if (!fn) {
      throw new Error("SetCat: curry attempted to reference a function outside the exponential carrier");
    }
    return fn;
  };

  const register = (assignment: (value: A) => B): ExponentialArrow<A, B> => {
    const outputs = baseElements.map((element) => {
      const value = assignment(element);
      if (!codomain.has(value)) {
        throw new Error("SetCat: exponential function produced a value outside the declared codomain");
      }
      return value;
    });
    return retrieve(outputs);
  };

  return { object, register };
};

const buildCoproductCarrier = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
): CoproductCarrier<A, B> => {
  const inlMap = new Map<A, Coproduct<A, B>>();
  const inrMap = new Map<B, Coproduct<A, B>>();

  const ensureInl = (value: A): Coproduct<A, B> => {
    if (!left.has(value)) {
      throw new Error("SetCat: coproduct injection referenced an element outside the left summand");
    }
    let tagged = inlMap.get(value);
    if (!tagged) {
      tagged = { tag: "inl", value } as const;
      inlMap.set(value, tagged);
    }
    return tagged;
  };

  const ensureInr = (value: B): Coproduct<A, B> => {
    if (!right.has(value)) {
      throw new Error("SetCat: coproduct injection referenced an element outside the right summand");
    }
    let tagged = inrMap.get(value);
    if (!tagged) {
      tagged = { tag: "inr", value } as const;
      inrMap.set(value, tagged);
    }
    return tagged;
  };

  if (shouldMaterializeCoproduct(left, right)) {
    const elements = new Set<Coproduct<A, B>>();
    for (const value of left) {
      elements.add(ensureInl(value));
    }
    for (const value of right) {
      elements.add(ensureInr(value));
    }
    return {
      object: elements,
      inlLookup: ensureInl,
      inrLookup: ensureInr,
    };
  }

  const iterate = function* (): IterableIterator<Coproduct<A, B>> {
    for (const value of left) {
      yield ensureInl(value);
    }
    for (const value of right) {
      yield ensureInr(value);
    }
  };

  const cardinality = addCardinality(left, right);

  const object = new LazySet<Coproduct<A, B>>({
    iterate,
    has: (value) => {
      if (value.tag === "inl") {
        if (!left.has(value.value)) {
          return false;
        }
        return ensureInl(value.value) === value;
      }
      if (value.tag === "inr") {
        if (!right.has(value.value)) {
          return false;
        }
        return ensureInr(value.value) === value;
      }
      return false;
    },
    ...(cardinality !== undefined ? { cardinality } : {}),
    tag: "SetCatLazyCoproduct",
  });

  return {
    object,
    inlLookup: ensureInl,
    inrLookup: ensureInr,
  };
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
  lazyObj: <A>(options: LazySetOptions<A>): SetObj<A> => new LazySet<A>(options),
  id: idSet,
  hom: createSetHom,
  compose: composeSet,
  isHom: isSetHom,
  isLazy: isLazySet,
  knownFiniteCardinality: knownFiniteCardinality,
  product: buildProductData,
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
  exponential: <A, B>(base: SetObj<A>, codomain: SetObj<B>): ExponentialData<A, B> => {
    const enumeration = enumerateExponentialCarrier(base, codomain);
    const evaluationProduct = buildProductData(enumeration.object, base);
    const evaluation = createSetHom(
      evaluationProduct.object,
      codomain,
      (pair) => {
        const fn = pair[0];
        const argument = pair[1];
        return fn(argument);
      },
    );

    const curry = <X>(input: CurryInput<X, A, B>): SetHom<X, ExponentialArrow<A, B>> => {
      const { domain, morphism } = input;
      const productData = input.product ?? buildProductData(domain, base);

      if (productData.object !== morphism.dom) {
        throw new Error("SetCat: curry expects the supplied morphism to originate from the provided product");
      }
      if (productData.projections.fst.cod !== domain) {
        throw new Error("SetCat: curry requires the product projections to land in the declared domain");
      }
      if (productData.projections.snd.cod !== base) {
        throw new Error("SetCat: curry requires the product projections to land in the declared base set");
      }
      if (morphism.cod !== codomain) {
        throw new Error("SetCat: curry expects a morphism landing in the declared codomain");
      }

      const assignments = new Map<X, ExponentialArrow<A, B>>();

      const lookupPair = (x: X, a: A): Pair<X, A> => {
        if (!domain.has(x)) {
          throw new Error("SetCat: curry evaluated on an element outside the declared domain");
        }
        if (!base.has(a)) {
          throw new Error("SetCat: curry evaluated on an element outside the declared base set");
        }
        if (productData.lookup) {
          return productData.lookup(x, a);
        }
        for (const candidate of productData.object) {
          if (candidate[0] === x && candidate[1] === a) {
            return candidate;
          }
        }
        throw new Error("SetCat: curry could not locate the required product element");
      };

      return createSetHom(domain, enumeration.object, (x) => {
        const existing = assignments.get(x);
        if (existing) {
          return existing;
        }
        const fn = enumeration.register((a) => morphism.map(lookupPair(x, a)));
        assignments.set(x, fn);
        return fn;
      });
    };

    const uncurry = <X>(input: UncurryInput<X, A, B>): SetHom<Pair<X, A>, B> => {
      const { morphism } = input;
      if (morphism.cod !== enumeration.object) {
        throw new Error("SetCat: uncurry expects a morphism landing in the exponential object");
      }
      const domain = morphism.dom as SetObj<X>;
      const productData = input.product ?? buildProductData(domain, base);
      if (productData.projections.fst.cod !== domain) {
        throw new Error("SetCat: uncurry requires the supplied product to project onto the morphism domain");
      }
      if (productData.projections.snd.cod !== base) {
        throw new Error("SetCat: uncurry requires the supplied product to project onto the base set");
      }

      return createSetHom(productData.object, codomain, (pair) => {
        const fn = morphism.map(pair[0]);
        return fn(pair[1]);
      });
    };

    return {
      object: enumeration.object,
      evaluation,
      evaluationProduct,
      curry,
      uncurry,
    };
  },
};
