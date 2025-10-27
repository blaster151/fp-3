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

export interface SetCarrierSemantics<A> {
  readonly iterate: () => IterableIterator<A>;
  readonly has: (value: A) => boolean;
  readonly equals?: (left: A, right: A) => boolean;
  readonly cardinality?: number;
  readonly tag?: string;
}

export type CarrierInstantiation<A> = (semantics: SetCarrierSemantics<A>) => SetObj<A>;

export interface CarrierOptions<A> {
  readonly semantics?: SetCarrierSemantics<A>;
  readonly instantiate?: CarrierInstantiation<A>;
}

export interface SetObjectOptions<A> extends CarrierOptions<A> {
  readonly equals?: (left: A, right: A) => boolean;
  readonly tag?: string;
}

export type MaterializedSemanticsOptions<A> = Pick<SetObjectOptions<A>, "equals" | "tag">;

export type SubsetSemanticsOptions<A> = MaterializedSemanticsOptions<A>;

const carrierSemanticsRegistry = new WeakMap<SetObj<unknown>, SetCarrierSemantics<unknown>>();

const registerCarrierSemantics = <A>(
  carrier: SetObj<A>,
  semantics: SetCarrierSemantics<A>,
): void => {
  const existing = carrierSemanticsRegistry.get(carrier as SetObj<unknown>);
  if (existing !== undefined && existing !== semantics) {
    throw new Error(
      "SetCat: carrier already has registered semantics; refusing to overwrite with a different witness.",
    );
  }
  carrierSemanticsRegistry.set(
    carrier as SetObj<unknown>,
    semantics as SetCarrierSemantics<unknown>,
  );
};

export const getCarrierSemantics = <A>(carrier: SetObj<A>): SetCarrierSemantics<A> | undefined =>
  carrierSemanticsRegistry.get(carrier as SetObj<unknown>) as SetCarrierSemantics<A> | undefined;

export const attachCarrierSemantics = <A>(
  carrier: SetObj<A>,
  semantics: SetCarrierSemantics<A>,
): void => {
  registerCarrierSemantics(carrier, semantics);
};

export const semanticsAwareHas = <A>(carrier: SetObj<A>): ((value: A) => boolean) => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics) {
    return (value: A) => semantics.has(value);
  }
  return (value: A) => carrier.has(value);
};

export const semanticsAwareEquals = <A>(carrier: SetObj<A>): ((left: A, right: A) => boolean) => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.equals) {
    return semantics.equals;
  }
  return (left: A, right: A) => Object.is(left, right);
};

export interface SetHom<A, B> {
  readonly dom: SetObj<A>;
  readonly cod: SetObj<B>;
  readonly map: (a: A) => B;
}

export interface SetOmegaWitness {
  readonly object: SetObj<boolean>;
  readonly truthArrow: SetHom<SetTerminalObject, boolean>;
  readonly falseArrow: SetHom<SetTerminalObject, boolean>;
  readonly negation: SetHom<boolean, boolean>;
  readonly truthProduct: ProductData<boolean, boolean>;
  readonly truthAnd: SetHom<readonly [boolean, boolean], boolean>;
  readonly truthOr: SetHom<readonly [boolean, boolean], boolean>;
  readonly truthImplication: SetHom<readonly [boolean, boolean], boolean>;
}

export interface SetSubobjectClassifierWitness {
  readonly obj: <A>(elements: Iterable<A>, options?: SetObjectOptions<A>) => SetObj<A>;
  readonly lazyObj: <A>(options: LazySetOptions<A>) => SetObj<A>;
  readonly id: typeof idSet;
  readonly hom: typeof createSetHom;
  readonly compose: typeof composeSet;
  readonly isHom: typeof isSetHom;
  readonly isLazy: typeof isLazySet;
  readonly semantics: typeof getCarrierSemantics;
  readonly attachSemantics: typeof attachCarrierSemantics;
  readonly createMaterializedSemantics: typeof createMaterializedSemantics;
  readonly createSubsetSemantics: typeof createSubsetSemantics;
  readonly semanticsFromSet: typeof createSemanticsFromSet;
  readonly knownFiniteCardinality: typeof knownFiniteCardinality;
  readonly product: typeof buildProductData;
  readonly coproduct: <A, B>(
    left: SetObj<A>,
    right: SetObj<B>,
    options?: CoproductCarrierOptions<A, B>,
  ) => CoproductData<A, B>;
  readonly terminal: () => TerminalData;
  readonly initial: () => InitialData;
  readonly exponential: <A, B>(
    base: SetObj<A>,
    codomain: SetObj<B>,
    options?: ExponentialCarrierOptions<A, B>,
  ) => ExponentialData<A, B>;
  readonly dom: <A, B>(hom: SetHom<A, B>) => SetObj<A>;
  readonly cod: <A, B>(hom: SetHom<A, B>) => SetObj<B>;
  readonly terminalObj: SetObj<SetTerminalObject>;
  readonly initialObj: SetObj<never>;
  readonly terminate: <A>(dom: SetObj<A>) => SetHom<A, SetTerminalObject>;
  readonly initialArrow: <A>(cod: SetObj<A>) => SetHom<never, A>;
  readonly truthValues: SetObj<boolean>;
  readonly truthArrow: SetHom<SetTerminalObject, boolean>;
  readonly falseArrow: SetHom<SetTerminalObject, boolean>;
  readonly negation: SetHom<boolean, boolean>;
  readonly truthProduct: ProductData<boolean, boolean>;
  readonly truthAnd: SetHom<readonly [boolean, boolean], boolean>;
  readonly truthOr: SetHom<readonly [boolean, boolean], boolean>;
  readonly truthImplication: SetHom<readonly [boolean, boolean], boolean>;
  readonly characteristic: <A>(inclusion: SetHom<A, A>) => SetHom<A, boolean>;
  readonly subobjectFromCharacteristic: <A>(
    characteristic: SetHom<A, boolean>,
  ) => { readonly subset: SetObj<A>; readonly inclusion: SetHom<A, A> };
  readonly powerObject: <A>(anchor: SetObj<A>) => SetPowerObjectWitness<A>;
}

type CharacteristicHom<A> = SetHom<A, boolean>;

export interface SetPowerObjectWitness<A> {
  readonly anchor: SetObj<A>;
  readonly powerObj: SetObj<CharacteristicHom<A>>;
  readonly membershipProduct: ProductData<CharacteristicHom<A>, A>;
  readonly membership: SetHom<readonly [CharacteristicHom<A>, A], boolean>;
}

type ExponentialCarrierSemantics<A, B> = SetCarrierSemantics<ExponentialArrow<A, B>> & {
  registerAssignment?: (assignment: (value: A) => B) => ExponentialArrow<A, B>;
  snapshotAssignments?: () => ReadonlyArray<ExponentialArrow<A, B>>;
  base?: SetObj<A>;
  codomain?: SetObj<B>;
};

type PowerObjectSemantics<A> = SetCarrierSemantics<CharacteristicHom<A>> & {
  registerCharacteristic: (candidate: CharacteristicHom<A>) => CharacteristicHom<A>;
  snapshotCharacteristics: () => ReadonlyArray<CharacteristicHom<A>>;
};

type Pair<A, B> = readonly [A, B];

interface ProductCarrier<A, B> {
  readonly object: SetObj<Pair<A, B>>;
  readonly lookup: (a: A, b: B) => Pair<A, B>;
}

export type ProductCarrierOptions<A, B> = CarrierOptions<Pair<A, B>>;

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

export type CoproductCarrierOptions<A, B> = CarrierOptions<Coproduct<A, B>>;

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
  readonly register: (assignment: (value: A) => B) => ExponentialArrow<A, B>;
}

export interface TerminalData {
  readonly object: SetObj<Terminal>;
  readonly terminate: <A>(dom: SetObj<A>) => SetHom<A, Terminal>;
}

export interface InitialData {
  readonly object: SetObj<never>;
  readonly initialize: <A>(cod: SetObj<A>) => SetHom<never, A>;
}

type Terminal = { readonly kind: "⋆" };

export type SetTerminalObject = Terminal;

const terminalValue: Terminal = { kind: "⋆" };

const terminalObj: SetObj<Terminal> = new Set([terminalValue]);

const initialObj: SetObj<never> = new Set();

export function isSetHom<A, B>(h: SetHom<A, B>): boolean {
  const { dom, cod, map } = h;
  const codHas = semanticsAwareHas(cod);
  for (const a of dom) {
    if (!codHas(map(a))) {
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

const getDom = <A, B>(hom: SetHom<A, B>): SetObj<A> => hom.dom;

const getCod = <A, B>(hom: SetHom<A, B>): SetObj<B> => hom.cod;

const setPowerObjectCache = new WeakMap<SetObj<unknown>, SetPowerObjectWitness<unknown>>();

const setPowerObjectSemanticsRegistry = new WeakMap<
  SetObj<unknown>,
  PowerObjectSemantics<unknown>
>();

function buildSetPowerObject<A>(anchor: SetObj<A>): SetPowerObjectWitness<A> {
  const exponential = SetCat.exponential(anchor, SetOmega);
  const exponentialSemantics = getCarrierSemantics(exponential.object) as
    | ExponentialCarrierSemantics<A, boolean>
    | undefined;

  const registerAssignment = exponentialSemantics?.registerAssignment;
  if (!registerAssignment) {
    throw new Error("SetCat.powerObject: exponential semantics must expose registerAssignment metadata.");
  }

  const canonicalByFunction = new Map<ExponentialArrow<A, boolean>, CharacteristicHom<A>>();
  const knownCharacteristics = new Set<CharacteristicHom<A>>();

  const ensureCharacteristicFromFunction = (
    fn: ExponentialArrow<A, boolean>,
  ): CharacteristicHom<A> => {
    let canonical = canonicalByFunction.get(fn);
    if (!canonical) {
      const characteristic = createSetHom(anchor, SetOmega, (value) => fn(value));
      canonicalByFunction.set(fn, characteristic);
      knownCharacteristics.add(characteristic);
      canonical = characteristic;
    }
    return canonical;
  };

  const snapshot = exponentialSemantics.snapshotAssignments?.() ?? [];
  for (const fn of snapshot) {
    ensureCharacteristicFromFunction(fn as ExponentialArrow<A, boolean>);
  }

  const registerCharacteristic = (candidate: CharacteristicHom<A>): CharacteristicHom<A> => {
    if (
      candidate.dom !== anchor ||
      candidate.cod !== SetOmega ||
      !isSetHom(candidate)
    ) {
      throw new Error("SetCat.powerObject: characteristic must belong to Ω^A.");
    }
    const canonicalFn = registerAssignment((value: A) => candidate.map(value));
    return ensureCharacteristicFromFunction(canonicalFn);
  };

  const semantics: PowerObjectSemantics<A> = {
    iterate: function* (): IterableIterator<CharacteristicHom<A>> {
      for (const fn of exponentialSemantics.iterate()) {
        yield ensureCharacteristicFromFunction(fn as ExponentialArrow<A, boolean>);
      }
    },
    has: (candidate) => knownCharacteristics.has(candidate),
    equals: (left, right) => left === right,
    tag: "SetCatPowerObject",
    ...(exponentialSemantics.cardinality !== undefined
      ? { cardinality: exponentialSemantics.cardinality }
      : {}),
    registerCharacteristic,
    snapshotCharacteristics: () => Array.from(knownCharacteristics),
  };

  const powerObj = new LazySet<CharacteristicHom<A>>({ semantics });
  setPowerObjectSemanticsRegistry.set(
    anchor as SetObj<unknown>,
    semantics as PowerObjectSemantics<unknown>,
  );

  const membershipProduct = buildProductData(powerObj, anchor);
  const powerObjHas = semanticsAwareHas(powerObj);
  const membership = createSetHom(
    membershipProduct.object,
    SetOmega,
    ([characteristic, element]) => {
      if (!powerObjHas(characteristic)) {
        throw new Error("SetCat.powerObject: characteristic must belong to Ω^A.");
      }
      return characteristic.map(element);
    },
  );

  return {
    anchor,
    powerObj,
    membershipProduct,
    membership,
  };
}

function getSetPowerObject<A>(anchor: SetObj<A>): SetPowerObjectWitness<A> {
  const cached = setPowerObjectCache.get(anchor as SetObj<unknown>);
  if (cached) {
    return cached as SetPowerObjectWitness<A>;
  }
  const witness = buildSetPowerObject(anchor);
  setPowerObjectCache.set(anchor as SetObj<unknown>, witness as SetPowerObjectWitness<unknown>);
  return witness;
}

function registerPowerObjectCharacteristic<A>(
  anchor: SetObj<A>,
  characteristic: CharacteristicHom<A>,
): CharacteristicHom<A> {
  const witness = getSetPowerObject(anchor);
  const semantics =
    setPowerObjectSemanticsRegistry.get(anchor as SetObj<unknown>) ??
    setPowerObjectSemanticsRegistry.get(witness.anchor as SetObj<unknown>);
  if (!semantics) {
    throw new Error("SetCat.powerObject: semantics registry missing for requested anchor.");
  }
  return (semantics as PowerObjectSemantics<A>).registerCharacteristic(characteristic);
}

let omegaWitnessCache: SetOmegaWitness;

let subobjectClassifierWitnessCache: SetSubobjectClassifierWitness;

type LazySetSemanticsOptions<A> = {
  readonly semantics: SetCarrierSemantics<A>;
  readonly tag?: string;
};

type LegacyLazySetOptions<A> = {
  readonly iterate: () => IterableIterator<A>;
  readonly has: (value: A) => boolean;
  readonly cardinality?: number;
  readonly equals?: (left: A, right: A) => boolean;
  readonly tag?: string;
};

export type LazySetOptions<A> = LazySetSemanticsOptions<A> | LegacyLazySetOptions<A>;

const LAZY_SET_MARKER = Symbol.for("SetCat.LazySet");

class LazySet<A> implements Set<A> {
  private readonly semantics: SetCarrierSemantics<A>;
  private readonly equals: (left: A, right: A) => boolean;
  private readonly seen: A[] = [];

  public readonly [LAZY_SET_MARKER] = true;

  public constructor(options: LazySetOptions<A>) {
    const semantics: SetCarrierSemantics<A> = "semantics" in options
      ? options.semantics
      : {
          iterate: options.iterate,
          has: options.has,
          ...(options.equals !== undefined ? { equals: options.equals } : {}),
          ...(options.cardinality !== undefined
            ? { cardinality: options.cardinality }
            : {}),
          ...(options.tag !== undefined ? { tag: options.tag } : {}),
        };
    this.semantics = semantics;
    this.equals = semantics.equals ?? ((left, right) => Object.is(left, right));
    this.tagLabel = options.tag ?? semantics.tag ?? "LazySet";
    registerCarrierSemantics(this, semantics);
  }

  private readonly tagLabel: string;

  public get [Symbol.toStringTag](): string {
    return this.tagLabel;
  }

  public get size(): number {
    if (this.semantics.cardinality !== undefined) {
      return this.semantics.cardinality;
    }
    return Number.POSITIVE_INFINITY;
  }

  public get cardinality(): number | undefined {
    return this.semantics.cardinality;
  }

  public has(value: A): boolean {
    if (this.hasSeen(value)) {
      return true;
    }
    const result = this.semantics.has(value);
    if (result) {
      this.memoize(value);
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

  public entries(): SetIterator<[A, A]> {
    return this.iterateMapped((value) => [value, value] as const) as SetIterator<[A, A]>;
  }

  public keys(): SetIterator<A> {
    return this[Symbol.iterator]() as SetIterator<A>;
  }

  public values(): SetIterator<A> {
    return this[Symbol.iterator]() as SetIterator<A>;
  }

  public forEach(callbackfn: (value: A, value2: A, set: Set<A>) => void, thisArg?: unknown): void {
    for (const value of this) {
      callbackfn.call(thisArg, value, value, this);
    }
  }

  public [Symbol.iterator](): SetIterator<A> {
    const iterator = this.semantics.iterate();
    const memoize = (value: A) => this.memoize(value);
    return (function* iterate() {
      for (const value of iterator) {
        memoize(value);
        yield value;
      }
    })() as SetIterator<A>;
  }

  private iterateMapped<T>(map: (value: A) => T): IterableIterator<T> {
    const iterator = this[Symbol.iterator]();
    return (function* mapped() {
      for (const value of iterator) {
        yield map(value);
      }
    })();
  }

  private hasSeen(value: A): boolean {
    return this.seen.some((candidate) => this.equals(candidate, value));
  }

  private memoize(value: A): void {
    if (!this.hasSeen(value)) {
      this.seen.push(value);
    }
  }
}

export function isLazySet<A>(value: SetObj<A>): value is LazySet<A>;
export function isLazySet(value: unknown): value is LazySet<unknown>;
export function isLazySet<A>(value: unknown): value is LazySet<A> {
  return typeof value === "object" && value !== null && (value as { [LAZY_SET_MARKER]?: boolean })[LAZY_SET_MARKER] === true;
}

const defaultInstantiateCarrier = <A>(semantics: SetCarrierSemantics<A>): SetObj<A> =>
  new LazySet<A>({ semantics });

export const instantiateMaterializedCarrier = <A>(semantics: SetCarrierSemantics<A>): SetObj<A> => {
  const equality = semantics.equals ?? ((left: A, right: A) => Object.is(left, right));
  const elements: A[] = [];
  for (const value of semantics.iterate()) {
    if (!elements.some((candidate) => equality(candidate, value))) {
      elements.push(value);
    }
  }
  const materialized = new Set(elements);
  registerCarrierSemantics(materialized, semantics);
  return materialized;
};

const realizeCarrier = <A>(
  semanticsFactory: () => SetCarrierSemantics<A>,
  options: CarrierOptions<A> = {},
): { readonly semantics: SetCarrierSemantics<A>; readonly object: SetObj<A> } => {
  const semantics = options.semantics ?? semanticsFactory();
  const instantiate = options.instantiate ?? defaultInstantiateCarrier<A>;
  const object = instantiate(semantics);
  registerCarrierSemantics(object, semantics);
  return { semantics, object };
};

type MaybeFinite = number | undefined;

const defaultCarrierEquality = <A>(left: A, right: A): boolean => Object.is(left, right);

const collectDistinctValues = <A>(
  source: Iterable<A>,
  equals: (left: A, right: A) => boolean,
): A[] => {
  const distinct: A[] = [];
  for (const value of source) {
    if (!distinct.some((candidate) => equals(candidate, value))) {
      distinct.push(value);
    }
  }
  return distinct;
};

export function createMaterializedSemantics<A>(
  elements: Iterable<A>,
  options: MaterializedSemanticsOptions<A> = {},
): SetCarrierSemantics<A> {
  const equals = options.equals ?? defaultCarrierEquality;
  const distinct = collectDistinctValues(elements, equals);
  return {
    iterate: function* iterate(): IterableIterator<A> {
      for (const value of distinct) {
        yield value;
      }
    },
    has: (candidate) => {
      for (const value of distinct) {
        if (equals(value, candidate)) {
          return true;
        }
      }
      return false;
    },
    equals,
    cardinality: distinct.length,
    ...(options.tag !== undefined ? { tag: options.tag } : {}),
  };
}

export function createSemanticsFromSet<A>(
  carrier: SetObj<A>,
  options: MaterializedSemanticsOptions<A> = {},
): SetCarrierSemantics<A> {
  const equals = options.equals ?? defaultCarrierEquality;
  const iterate = function* iterate(): IterableIterator<A> {
    for (const value of carrier) {
      yield value;
    }
  };
  const has = (candidate: A): boolean => {
    if (options.equals === undefined) {
      return carrier.has(candidate);
    }
    for (const value of carrier) {
      if (equals(value, candidate)) {
        return true;
      }
    }
    return false;
  };
  const cardinality = Number.isFinite(carrier.size) ? carrier.size : undefined;
  return {
    iterate,
    has,
    equals,
    ...(cardinality !== undefined ? { cardinality } : {}),
    ...(options.tag !== undefined ? { tag: options.tag } : {}),
  };
}

export const createSubsetSemantics = <A>(
  ambient: SetObj<A>,
  elements: Iterable<A>,
  options: SubsetSemanticsOptions<A> = {},
): SetCarrierSemantics<A> => {
  const ambientSemantics = getCarrierSemantics(ambient);
  const equals = options.equals ?? ambientSemantics?.equals ?? defaultCarrierEquality<A>;
  return createMaterializedSemantics(elements, {
    ...options,
    equals,
  });
};

const terminalSemantics = createMaterializedSemantics([terminalValue], {
  tag: "SetCat.terminal",
});
attachCarrierSemantics(terminalObj, terminalSemantics);

const initialSemantics = createMaterializedSemantics<never>([], {
  tag: "SetCat.initial",
});
attachCarrierSemantics(initialObj, initialSemantics);

const knownFiniteCardinality = <A>(carrier: SetObj<A>): MaybeFinite => {
  const semantics = getCarrierSemantics(carrier);
  if (semantics?.cardinality !== undefined && Number.isFinite(semantics.cardinality)) {
    return semantics.cardinality;
  }
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

const isPair = <A, B>(value: unknown): value is Pair<A, B> =>
  Array.isArray(value) && value.length === 2;

const cartesianProduct = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  options: CarrierOptions<Pair<A, B>> = {},
): ProductCarrier<A, B> => {
  const lookup = new Map<A, Map<B, Pair<A, B>>>();
  const leftHas = semanticsAwareHas(left);
  const rightHas = semanticsAwareHas(right);
  const leftEquals = semanticsAwareEquals(left);
  const rightEquals = semanticsAwareEquals(right);
  const pairEquals = (leftPair: Pair<A, B>, rightPair: Pair<A, B>): boolean =>
    leftEquals(leftPair[0], rightPair[0]) && rightEquals(leftPair[1], rightPair[1]);
  const ensurePair = (a: A, b: B): Pair<A, B> => {
    if (!leftHas(a)) {
      throw new Error("SetCat: product pairing referenced an element outside the left factor");
    }
    if (!rightHas(b)) {
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

  const cardinality = multiplyCardinality(left, right);

  const semanticsFactory = (): SetCarrierSemantics<Pair<A, B>> => ({
    iterate: function* (): IterableIterator<Pair<A, B>> {
      for (const a of left) {
        for (const b of right) {
          yield ensurePair(a, b);
        }
      }
    },
    has: (value) => {
      if (!isPair<A, B>(value)) {
        return false;
      }
      const [a, b] = value;
      if (!leftHas(a) || !rightHas(b)) {
        return false;
      }
      const canonical = ensurePair(a, b);
      return canonical === value || pairEquals(canonical, value);
    },
    equals: (leftPair, rightPair) => leftPair === rightPair || pairEquals(leftPair, rightPair),
    ...(cardinality !== undefined ? { cardinality } : {}),
    tag: "SetCatProductCarrier",
  });

  const instantiate: CarrierInstantiation<Pair<A, B>> = options.instantiate
    ?? (cardinality !== undefined ? instantiateMaterializedCarrier : defaultInstantiateCarrier);
  const { object } = realizeCarrier(semanticsFactory, {
    ...options,
    instantiate,
  });

  return {
    object,
    lookup: ensurePair,
  };
};

const productDataCache = new WeakMap<
  SetObj<unknown>,
  WeakMap<SetObj<unknown>, ProductData<unknown, unknown>>
>();

const shouldBypassProductCache = <A, B>(options: ProductCarrierOptions<A, B>): boolean =>
  options.instantiate !== undefined || options.semantics !== undefined;

const createProductData = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  options: ProductCarrierOptions<A, B> = {},
): ProductData<A, B> => {
  const carrier = cartesianProduct(left, right, options);
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

const getCachedProductData = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
): ProductData<A, B> | undefined => {
  const byLeft = productDataCache.get(left as SetObj<unknown>);
  const cached = byLeft?.get(right as SetObj<unknown>);
  return cached as ProductData<A, B> | undefined;
};

const cacheProductData = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  data: ProductData<A, B>,
): void => {
  let byLeft = productDataCache.get(left as SetObj<unknown>);
  if (!byLeft) {
    byLeft = new WeakMap();
    productDataCache.set(left as SetObj<unknown>, byLeft);
  }
  byLeft.set(right as SetObj<unknown>, data as ProductData<unknown, unknown>);
};

const buildProductData = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  options: ProductCarrierOptions<A, B> = {},
): ProductData<A, B> => {
  const useCache = !shouldBypassProductCache(options);
  if (useCache) {
    const cached = getCachedProductData(left, right);
    if (cached) {
      return cached;
    }
  }

  const data = createProductData(left, right, options);

  if (useCache) {
    cacheProductData(left, right, data);
  }

  return data;
};

const createExponentialFunction = <A, B>(
  base: SetObj<A>,
  assignments: Map<A, B>,
): ExponentialArrow<A, B> => {
  const baseHas = semanticsAwareHas(base);
  return (value: A) => {
    if (!baseHas(value)) {
      throw new Error("SetCat: exponential function applied outside the declared base set");
    }
    if (!assignments.has(value)) {
      throw new Error("SetCat: exponential function is undefined on a base element");
    }
    return assignments.get(value) as B;
  };
};

const createLazyExponentialFunction = <A, B>(
  base: SetObj<A>,
  codomain: SetObj<B>,
  evaluate: (value: A) => B,
): ExponentialArrow<A, B> => {
  const baseHas = semanticsAwareHas(base);
  const codomainHas = semanticsAwareHas(codomain);
  const cache = new Map<A, B>();
  return (value: A) => {
    if (!baseHas(value)) {
      throw new Error("SetCat: exponential function applied outside the declared base set");
    }
    if (cache.has(value)) {
      return cache.get(value) as B;
    }
    const result = evaluate(value);
    if (!codomainHas(result)) {
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
  readonly semantics: ExponentialCarrierSemantics<A, B>;
  readonly register: (assignment: (value: A) => B) => ExponentialArrow<A, B>;
}

export type ExponentialRegisterInput<A, B> = {
  readonly assignment: (value: A) => B;
  readonly base: SetObj<A>;
  readonly codomain: SetObj<B>;
  readonly semantics: SetCarrierSemantics<ExponentialArrow<A, B>>;
};

export interface ExponentialCarrierOptions<A, B> extends CarrierOptions<ExponentialArrow<A, B>> {
  readonly register?: (input: ExponentialRegisterInput<A, B>) => ExponentialArrow<A, B>;
}

const enumerateExponentialCarrier = <A, B>(
  base: SetObj<A>,
  codomain: SetObj<B>,
  options: ExponentialCarrierOptions<A, B> = {},
): ExponentialCarrier<A, B> => {
  const attachExponentialMetadata = (
    semantics: SetCarrierSemantics<ExponentialArrow<A, B>>,
    register: (assignment: (value: A) => B) => ExponentialArrow<A, B>,
    snapshot?: () => ReadonlyArray<ExponentialArrow<A, B>>,
  ): ExponentialCarrierSemantics<A, B> => {
    const typed = semantics as ExponentialCarrierSemantics<A, B>;
    typed.registerAssignment = register;
    typed.base ??= base;
    typed.codomain ??= codomain;
    if (snapshot) {
      typed.snapshotAssignments = snapshot;
    } else if (!typed.snapshotAssignments) {
      typed.snapshotAssignments = () => [];
    }
    return typed;
  };

  if (options.semantics) {
    const semantics = options.semantics as ExponentialCarrierSemantics<A, B>;
    const instantiate: CarrierInstantiation<ExponentialArrow<A, B>> =
      options.instantiate ?? defaultInstantiateCarrier;
    const object = instantiate(semantics);
    registerCarrierSemantics(object, semantics);
    const known = new Set<ExponentialArrow<A, B>>();
    const registerFactory: (input: ExponentialRegisterInput<A, B>) => ExponentialArrow<A, B> =
      options.register ?? ((input) => createLazyExponentialFunction(base, codomain, input.assignment));
    const register = (assignment: (value: A) => B): ExponentialArrow<A, B> => {
      const fn = registerFactory({
        assignment,
        base,
        codomain,
        semantics,
      });
      known.add(fn);
      return fn;
    };
    const typed = attachExponentialMetadata(semantics, register, () => Array.from(known));
    return { object, semantics: typed, register };
  }

  const baseSize = knownFiniteCardinality(base);
  const codomainSize = knownFiniteCardinality(codomain);
  const isFinite = baseSize !== undefined && codomainSize !== undefined;

  if (!isFinite) {
    const known = new Set<ExponentialArrow<A, B>>();
    const semanticsFactory = (): ExponentialCarrierSemantics<A, B> => ({
      iterate: function* (): IterableIterator<ExponentialArrow<A, B>> {
        for (const fn of known) {
          yield fn;
        }
      },
      has: (fn) => known.has(fn),
      equals: (left, right) => left === right,
      tag: "SetCatLazyExponential",
      snapshotAssignments: () => Array.from(known),
      base,
      codomain,
    });
    const instantiate: CarrierInstantiation<ExponentialArrow<A, B>> =
      options.instantiate ?? defaultInstantiateCarrier;
    const { semantics, object } = realizeCarrier(semanticsFactory, { instantiate });
    const register = (assignment: (value: A) => B): ExponentialArrow<A, B> => {
      const fn = createLazyExponentialFunction(base, codomain, assignment);
      known.add(fn);
      return fn;
    };
    const typed = attachExponentialMetadata(semantics, register, () => Array.from(known));
    return { object, semantics: typed, register };
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

  const computeCardinality = (): number => {
    if (baseSize === undefined || codomainSize === undefined) {
      return functions.length;
    }
    let total = 1;
    for (let i = 0; i < baseSize; i += 1) {
      total *= codomainSize;
    }
    return total;
  };

  const semanticsFactory = (): SetCarrierSemantics<ExponentialArrow<A, B>> => ({
    iterate: function* (): IterableIterator<ExponentialArrow<A, B>> {
      for (const fn of functions) {
        yield fn;
      }
    },
    has: (fn) => functions.includes(fn),
    equals: (left, right) => left === right,
    cardinality: computeCardinality(),
    tag: "SetCatFiniteExponential",
  });

  const instantiate: CarrierInstantiation<ExponentialArrow<A, B>> =
    options.instantiate ?? instantiateMaterializedCarrier;
  const carrierOptions: CarrierOptions<ExponentialArrow<A, B>> =
    options.semantics !== undefined
      ? { semantics: options.semantics, instantiate }
      : { instantiate };
  const { semantics, object } = realizeCarrier(semanticsFactory, carrierOptions);

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
    const codomainHas = semanticsAwareHas(codomain);
    const outputs = baseElements.map((element) => {
      const value = assignment(element);
      if (!codomainHas(value)) {
        throw new Error("SetCat: exponential function produced a value outside the declared codomain");
      }
      return value;
    });
    return retrieve(outputs);
  };

  const typed = attachExponentialMetadata(semantics, register, () => functions.slice());

  return { object, semantics: typed, register };
};

const exponentialDataCache = new WeakMap<
  SetObj<unknown>,
  WeakMap<SetObj<unknown>, ExponentialData<unknown, unknown>>
>();

const shouldBypassExponentialCache = <A, B>(options: ExponentialCarrierOptions<A, B>): boolean =>
  options.instantiate !== undefined || options.semantics !== undefined || options.register !== undefined;

const getCachedExponentialData = <A, B>(
  base: SetObj<A>,
  codomain: SetObj<B>,
): ExponentialData<A, B> | undefined => {
  const byBase = exponentialDataCache.get(base as SetObj<unknown>);
  const cached = byBase?.get(codomain as SetObj<unknown>);
  return cached as ExponentialData<A, B> | undefined;
};

const cacheExponentialData = <A, B>(
  base: SetObj<A>,
  codomain: SetObj<B>,
  data: ExponentialData<A, B>,
): void => {
  let byBase = exponentialDataCache.get(base as SetObj<unknown>);
  if (!byBase) {
    byBase = new WeakMap();
    exponentialDataCache.set(base as SetObj<unknown>, byBase);
  }
  byBase.set(codomain as SetObj<unknown>, data as ExponentialData<unknown, unknown>);
};

const createExponentialData = <A, B>(
  base: SetObj<A>,
  codomain: SetObj<B>,
  options: ExponentialCarrierOptions<A, B>,
): ExponentialData<A, B> => {
  const enumeration = enumerateExponentialCarrier(base, codomain, options);
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
    const domainHas = semanticsAwareHas(domain);
    const baseHas = semanticsAwareHas(base);
    const domainEquals = semanticsAwareEquals(domain);
    const baseEquals = semanticsAwareEquals(base);

    const lookupPair = (x: X, a: A): Pair<X, A> => {
      if (!domainHas(x)) {
        throw new Error("SetCat: curry evaluated on an element outside the declared domain");
      }
      if (!baseHas(a)) {
        throw new Error("SetCat: curry evaluated on an element outside the declared base set");
      }
      if (productData.lookup) {
        return productData.lookup(x, a);
      }
      for (const candidate of productData.object) {
        if (domainEquals(candidate[0], x) && baseEquals(candidate[1], a)) {
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
    register: enumeration.register,
  };
};

const buildCoproductCarrier = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  options: CoproductCarrierOptions<A, B> = {},
): CoproductCarrier<A, B> => {
  const inlMap = new Map<A, Coproduct<A, B>>();
  const inrMap = new Map<B, Coproduct<A, B>>();
  const leftHas = semanticsAwareHas(left);
  const rightHas = semanticsAwareHas(right);
  const leftEquals = semanticsAwareEquals(left);
  const rightEquals = semanticsAwareEquals(right);
  const coproductEquals = (leftValue: Coproduct<A, B>, rightValue: Coproduct<A, B>): boolean => {
    if (leftValue.tag !== rightValue.tag) {
      return false;
    }
    if (leftValue.tag === "inl" && rightValue.tag === "inl") {
      return leftEquals(leftValue.value, rightValue.value);
    }
    if (leftValue.tag === "inr" && rightValue.tag === "inr") {
      return rightEquals(leftValue.value, rightValue.value);
    }
    return false;
  };

  const ensureInl = (value: A): Coproduct<A, B> => {
    if (!leftHas(value)) {
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
    if (!rightHas(value)) {
      throw new Error("SetCat: coproduct injection referenced an element outside the right summand");
    }
    let tagged = inrMap.get(value);
    if (!tagged) {
      tagged = { tag: "inr", value } as const;
      inrMap.set(value, tagged);
    }
    return tagged;
  };

  const cardinality = addCardinality(left, right);

  const semanticsFactory = (): SetCarrierSemantics<Coproduct<A, B>> => ({
    iterate: function* (): IterableIterator<Coproduct<A, B>> {
      for (const value of left) {
        yield ensureInl(value);
      }
      for (const value of right) {
        yield ensureInr(value);
      }
    },
    has: (value) => {
      if (value.tag === "inl") {
        if (!leftHas(value.value)) {
          return false;
        }
        const canonical = ensureInl(value.value);
        return canonical === value || coproductEquals(canonical, value);
      }
      if (value.tag === "inr") {
        if (!rightHas(value.value)) {
          return false;
        }
        const canonical = ensureInr(value.value);
        return canonical === value || coproductEquals(canonical, value);
      }
      return false;
    },
    equals: (leftValue, rightValue) => leftValue === rightValue || coproductEquals(leftValue, rightValue),
    ...(cardinality !== undefined ? { cardinality } : {}),
    tag: "SetCatCoproductCarrier",
  });

  const instantiate: CarrierInstantiation<Coproduct<A, B>> = options.instantiate
    ?? (cardinality !== undefined ? instantiateMaterializedCarrier : defaultInstantiateCarrier);
  const { object } = realizeCarrier(semanticsFactory, {
    ...options,
    instantiate,
  });

  return {
    object,
    inlLookup: ensureInl,
    inrLookup: ensureInr,
  };
};

const coproductDataCache = new WeakMap<
  SetObj<unknown>,
  WeakMap<SetObj<unknown>, CoproductData<unknown, unknown>>
>();

const shouldBypassCoproductCache = <A, B>(options: CoproductCarrierOptions<A, B>): boolean =>
  options.instantiate !== undefined || options.semantics !== undefined;

const createCoproductData = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  options: CoproductCarrierOptions<A, B> = {},
): CoproductData<A, B> => {
  const carrier = buildCoproductCarrier(left, right, options);
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
};

const getCachedCoproductData = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
): CoproductData<A, B> | undefined => {
  const byLeft = coproductDataCache.get(left as SetObj<unknown>);
  const cached = byLeft?.get(right as SetObj<unknown>);
  return cached as CoproductData<A, B> | undefined;
};

const cacheCoproductData = <A, B>(
  left: SetObj<A>,
  right: SetObj<B>,
  data: CoproductData<A, B>,
): void => {
  let byLeft = coproductDataCache.get(left as SetObj<unknown>);
  if (!byLeft) {
    byLeft = new WeakMap();
    coproductDataCache.set(left as SetObj<unknown>, byLeft);
  }
  byLeft.set(right as SetObj<unknown>, data as CoproductData<unknown, unknown>);
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
  obj: <A>(elements: Iterable<A>, options: SetObjectOptions<A> = {}): SetObj<A> => {
    if (options.semantics) {
      const instantiate = options.instantiate ?? defaultInstantiateCarrier<A>;
      const object = instantiate(options.semantics);
      registerCarrierSemantics(object, options.semantics);
      return object;
    }
    const semantics = createMaterializedSemantics(elements, {
      ...(options.equals !== undefined ? { equals: options.equals } : {}),
      tag: options.tag ?? "SetCat.materialized",
    });
    const instantiate = options.instantiate ?? instantiateMaterializedCarrier;
    const object = instantiate(semantics);
    registerCarrierSemantics(object, semantics);
    return object;
  },
  lazyObj: <A>(options: LazySetOptions<A>): SetObj<A> => new LazySet<A>(options),
  id: idSet,
  hom: createSetHom,
  compose: composeSet,
  dom: getDom,
  cod: getCod,
  isHom: isSetHom,
  isLazy: isLazySet,
  semantics: getCarrierSemantics,
  attachSemantics: attachCarrierSemantics,
  createMaterializedSemantics,
  createSubsetSemantics,
  semanticsFromSet: createSemanticsFromSet,
  knownFiniteCardinality: knownFiniteCardinality,
  product: buildProductData,
  coproduct: <A, B>(
    left: SetObj<A>,
    right: SetObj<B>,
    options: CoproductCarrierOptions<A, B> = {},
  ): CoproductData<A, B> => {
    const useCache = !shouldBypassCoproductCache(options);
    if (useCache) {
      const cached = getCachedCoproductData(left, right);
      if (cached) {
        return cached;
      }
    }

    const data = createCoproductData(left, right, options);

    if (useCache) {
      cacheCoproductData(left, right, data);
    }

    return data;
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
  exponential: <A, B>(
    base: SetObj<A>,
    codomain: SetObj<B>,
    options: ExponentialCarrierOptions<A, B> = {},
  ): ExponentialData<A, B> => {
    const useCache = !shouldBypassExponentialCache(options);
    if (useCache) {
      const cached = getCachedExponentialData(base, codomain);
      if (cached) {
        return cached;
      }
    }

    const data = createExponentialData(base, codomain, options);

    if (useCache) {
      cacheExponentialData(base, codomain, data);
    }

    return data;
  },
  omega: (): SetOmegaWitness => omegaWitnessCache,
  subobjectClassifier: (): SetSubobjectClassifierWitness => subobjectClassifierWitnessCache,
  powerObject: <A>(anchor: SetObj<A>): SetPowerObjectWitness<A> => getSetPowerObject(anchor),
};

const setTerminalData = SetCat.terminal();
const setInitialData = SetCat.initial();

export const SetOmega: SetObj<boolean> = SetCat.obj([false, true]);

export const SetTruthArrow: SetHom<SetTerminalObject, boolean> = SetCat.hom(
  setTerminalData.object,
  SetOmega,
  () => true,
);

export const SetFalseArrow: SetHom<SetTerminalObject, boolean> = SetCat.hom(
  setTerminalData.object,
  SetOmega,
  () => false,
);

export const SetNegation: SetHom<boolean, boolean> = SetCat.hom(
  SetOmega,
  SetOmega,
  (value) => !value,
);

const setTruthProductData = SetCat.product(SetOmega, SetOmega);

export const SetTruthProduct = {
  obj: setTruthProductData.object,
  projections: [setTruthProductData.projections.fst, setTruthProductData.projections.snd] as const,
  pair: setTruthProductData.pair,
};

export const SetTruthAnd: SetHom<readonly [boolean, boolean], boolean> = SetCat.hom(
  setTruthProductData.object,
  SetOmega,
  ([left, right]) => left && right,
);

export const SetTruthOr: SetHom<readonly [boolean, boolean], boolean> = SetCat.hom(
  setTruthProductData.object,
  SetOmega,
  ([left, right]) => left || right,
);

export const SetTruthImplication: SetHom<readonly [boolean, boolean], boolean> = SetCat.hom(
  setTruthProductData.object,
  SetOmega,
  ([left, right]) => !left || right,
);

export const ensureSubsetMonomorphism = <A>(
  inclusion: SetHom<A, A>,
  context?: string,
): void => {
  const label = context ?? "ensureSubsetMonomorphism";
  if (inclusion.cod === undefined || inclusion.dom === undefined) {
    throw new Error(`${label}: inclusion must provide a domain and codomain.`);
  }
  const ambientHas = semanticsAwareHas(inclusion.cod);
  const ambientEquals = semanticsAwareEquals(inclusion.cod);
  for (const element of inclusion.dom) {
    if (!ambientHas(element)) {
      throw new Error(
        `${label}: domain element ${String(element)} must belong to the ambient set to define a subset inclusion.`,
      );
    }
    const image = inclusion.map(element);
    if (!ambientHas(image)) {
      throw new Error(
        `${label}: inclusion image ${String(image)} must belong to the ambient set.`,
      );
    }
    if (!ambientEquals(image, element)) {
      throw new Error(
        `${label}: subset inclusion must map each element to itself (expected ${String(element)}, found ${String(image)}).`,
      );
    }
  }
};

export const setCharacteristicOfSubset = <A>(inclusion: SetHom<A, A>): SetHom<A, boolean> => {
  ensureSubsetMonomorphism(inclusion, "setCharacteristicOfSubset");
  const ambient = inclusion.cod;
  const subset = inclusion.dom;
  const subsetHas = semanticsAwareHas(subset);
  const characteristic = SetCat.hom(ambient, SetOmega, (value) => subsetHas(value));
  return registerPowerObjectCharacteristic(ambient, characteristic);
};

export const setSubsetFromCharacteristic = <A>(
  characteristic: SetHom<A, boolean>,
): { readonly subset: SetObj<A>; readonly inclusion: SetHom<A, A> } => {
  if (characteristic.cod !== SetOmega) {
    throw new Error("setSubsetFromCharacteristic: characteristic must land in Ω.");
  }
  const ambient = characteristic.dom;
  const canonical = registerPowerObjectCharacteristic(ambient, characteristic);
  const members: A[] = [];
  for (const element of ambient) {
    const classification = canonical.map(element);
    if (classification !== true && classification !== false) {
      throw new Error(
        "setSubsetFromCharacteristic: characteristic must classify elements as either true or false.",
      );
    }
    if (classification) {
      members.push(element);
    }
  }
  const subsetSemantics = createSubsetSemantics(ambient, members, {
    tag: "SetCat.subsetFromCharacteristic",
  });
  const subset = instantiateMaterializedCarrier(subsetSemantics);
  const inclusion = SetCat.hom(subset, ambient, (value) => value);
  ensureSubsetMonomorphism(inclusion, "setSubsetFromCharacteristic");
  return { subset, inclusion };
};

omegaWitnessCache = {
  object: SetOmega,
  truthArrow: SetTruthArrow,
  falseArrow: SetFalseArrow,
  negation: SetNegation,
  truthProduct: setTruthProductData,
  truthAnd: SetTruthAnd,
  truthOr: SetTruthOr,
  truthImplication: SetTruthImplication,
};

subobjectClassifierWitnessCache = {
  obj: SetCat.obj,
  lazyObj: SetCat.lazyObj,
  id: SetCat.id,
  hom: SetCat.hom,
  compose: SetCat.compose,
  isHom: SetCat.isHom,
  isLazy: SetCat.isLazy,
  semantics: SetCat.semantics,
  attachSemantics: SetCat.attachSemantics,
  createMaterializedSemantics: SetCat.createMaterializedSemantics,
  createSubsetSemantics: SetCat.createSubsetSemantics,
  semanticsFromSet: SetCat.semanticsFromSet,
  knownFiniteCardinality: SetCat.knownFiniteCardinality,
  product: SetCat.product,
  coproduct: SetCat.coproduct,
  terminal: SetCat.terminal,
  initial: SetCat.initial,
  exponential: SetCat.exponential,
  dom: getDom,
  cod: getCod,
  terminalObj: setTerminalData.object,
  initialObj: setInitialData.object,
  terminate: setTerminalData.terminate,
  initialArrow: setInitialData.initialize,
  truthValues: SetOmega,
  truthArrow: SetTruthArrow,
  falseArrow: SetFalseArrow,
  negation: SetNegation,
  truthProduct: setTruthProductData,
  truthAnd: SetTruthAnd,
  truthOr: SetTruthOr,
  truthImplication: SetTruthImplication,
  characteristic: setCharacteristicOfSubset,
  subobjectFromCharacteristic: setSubsetFromCharacteristic,
  powerObject: (anchor) => SetCat.powerObject(anchor),
};
