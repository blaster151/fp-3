import { SetCat, type SetHom, type SetObj } from "./set-cat";
import type { SimpleCat } from "./simple-cat";
import { setSimpleCategory } from "./set-simple-category";
import {
  constructFunctorWithWitness,
  identityFunctorWithWitness,
  type Functor,
  type FunctorCheckSamples,
  type FunctorComposablePair,
  type FunctorWithWitness,
} from "./functor";
import {
  concretizeForgetfulFunctor,
  concreteMonoidDescriptor,
  type ConcreteCategoryWitness,
} from "./concrete-category";
import {
  constructNaturalTransformationWithWitness,
  type NaturalTransformationCheckSamples,
  type NaturalTransformationWithWitness,
} from "./natural-transformation";
import {
  MonoidCat,
  type Monoid,
  type MonoidArrow,
  type MonoidCategory,
  type OneObject,
} from "./monoid-cat";
import { MonCat, type MonoidHom } from "./mon-cat";
import { PreorderCat, type Preorder, type PreorderHom } from "./preorder-cat";
import { isMonotone, type PreordHom } from "./preord-cat";
import type { Group } from "./kinds/group-automorphism";
import {
  constructAdjunctionWithWitness,
  type AdjunctionCheckSamples,
  type AdjunctionReport,
  type AdjunctionWithWitness,
} from "./adjunction";

const listObjectCache = new WeakMap<SetObj<unknown>, SetObj<ReadonlyArray<unknown>>>();

const enumerateListsOfLength = <A>(
  elements: ReadonlyArray<A>,
  length: number,
): IterableIterator<ReadonlyArray<A>> => {
  if (length === 0) {
    return (function* (): IterableIterator<ReadonlyArray<A>> {
      yield [];
    })();
  }
  if (elements.length === 0) {
    return (function* (): IterableIterator<ReadonlyArray<A>> {})();
  }
  return (function* generate(): IterableIterator<ReadonlyArray<A>> {
    const indices = Array.from({ length }, () => 0);
    while (true) {
      const list = indices.map((index) => elements[index]!);
      yield list;

      let position = length - 1;
      while (position >= 0) {
        indices[position]! += 1;
        if (indices[position]! < elements.length) {
          break;
        }
        indices[position] = 0;
        position -= 1;
      }
      if (position < 0) {
        return;
      }
    }
  })();
};

const enumerateAllFiniteLists = <A>(
  elements: ReadonlyArray<A>,
): IterableIterator<ReadonlyArray<A>> =>
  (function* enumerate(): IterableIterator<ReadonlyArray<A>> {
    yield [];
    if (elements.length === 0) {
      return;
    }
    for (let length = 1; ; length += 1) {
      yield* enumerateListsOfLength(elements, length);
    }
  })();

const listObjectFor = <A>(base: SetObj<A>): SetObj<ReadonlyArray<A>> => {
  const cached = listObjectCache.get(base as SetObj<unknown>);
  if (cached) {
    return cached as SetObj<ReadonlyArray<A>>;
  }

  const cardinality = SetCat.knownFiniteCardinality(base);
  if (cardinality === undefined) {
    throw new Error(
      "listEndofunctorWithWitness: base set must expose a finite cardinality so finite lists can be enumerated.",
    );
  }

  const elements = Array.from(base);
  if (elements.length !== cardinality) {
    throw new Error(
      "listEndofunctorWithWitness: enumeration disagrees with the recorded finite cardinality.",
    );
  }

  const iterate = () => enumerateAllFiniteLists(elements);
  const has = (value: ReadonlyArray<A>): boolean =>
    Array.isArray(value) && value.every((entry) => base.has(entry));
  const listSet = SetCat.lazyObj<ReadonlyArray<A>>({
    iterate,
    has,
    ...(elements.length === 0 ? { cardinality: 1 } : {}),
    tag: `List(${String((base as { tag?: string }).tag ?? "Set")})`,
  });

  listObjectCache.set(base as SetObj<unknown>, listSet as SetObj<ReadonlyArray<unknown>>);
  return listSet;
};

const mapList = <A, B>(f: (a: A) => B) => (list: ReadonlyArray<A>): ReadonlyArray<B> =>
  list.map((value) => f(value));

const unitList = <A>(value: A): ReadonlyArray<A> => [value];

const concatLists = <A>(left: ReadonlyArray<A>, right: ReadonlyArray<A>): ReadonlyArray<A> => [
  ...left,
  ...right,
];

const listsEqual = <A>(left: ReadonlyArray<A>, right: ReadonlyArray<A>): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (!Object.is(left[index], right[index])) {
      return false;
    }
  }
  return true;
};

const flattenLists = <A>(lists: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<A> => {
  const result: A[] = [];
  for (const list of lists) {
    for (const value of list) {
      result.push(value);
    }
  }
  return result;
};

const defaultListSamples = (): FunctorCheckSamples<SetObj<unknown>, SetHom<unknown, unknown>> => {
  const emptyElements: unknown[] = [];
  const empty = SetCat.obj<unknown>(emptyElements);
  const id = SetCat.id(empty);
  return {
    objects: [empty],
    arrows: [id],
    composablePairs: [{ f: id, g: id }],
  };
};

export interface ListEndofunctorToolkit {
  readonly functor: FunctorWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly listObject: <A>(base: SetObj<A>) => SetObj<ReadonlyArray<A>>;
  readonly mapList: typeof mapList;
  readonly unit: typeof unitList;
  readonly concat: typeof concatLists;
}

export const listEndofunctorWithWitness = (
  samples: FunctorCheckSamples<SetObj<unknown>, SetHom<unknown, unknown>> = defaultListSamples(),
): ListEndofunctorToolkit => {
  const functor: Functor<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  > = {
    F0: (object) => listObjectFor(object),
    F1: (arrow) => {
      const domain = listObjectFor(arrow.dom);
      const codomain = listObjectFor(arrow.cod);
      return SetCat.hom(domain, codomain, (list: ReadonlyArray<unknown>) =>
        mapList(arrow.map)(list),
      ) as SetHom<unknown, unknown>;
    },
  };

  const metadata = [
    "List endofunctor duplicates the familiar map/unit/concat structure inside Set.",
  ];

  const witness = constructFunctorWithWitness(
    setSimpleCategory,
    setSimpleCategory,
    functor,
    samples,
    metadata,
  );

  return {
    functor: witness,
    listObject: listObjectFor,
    mapList,
    unit: unitList,
    concat: concatLists,
  };
};

const makeMonCatSimpleCategory = <Carrier>(): SimpleCat<
  Monoid<Carrier>,
  MonoidHom<Carrier, Carrier>
> & {
  readonly eq: (
    left: MonoidHom<Carrier, Carrier>,
    right: MonoidHom<Carrier, Carrier>,
  ) => boolean;
} => ({
  id: (monoid) => MonCat.id(monoid),
  compose: (g, f) => MonCat.compose(g, f),
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
  eq: (left, right) => {
    if (!Object.is(left.dom, right.dom) || !Object.is(left.cod, right.cod)) {
      return false;
    }
    const elements = left.dom.elements;
    if (!elements || elements.length === 0) {
      return Object.is(left.map, right.map);
    }
    for (const element of elements) {
      if (!Object.is(left.map(element), right.map(element))) {
        return false;
      }
    }
    return true;
  },
});

const monCatSimpleCategory = makeMonCatSimpleCategory<unknown>();
const listMonCatSimpleCategory = makeMonCatSimpleCategory<ReadonlyArray<unknown>>();

const defaultFreeMonoidListSamples = <A>(
  base: SetObj<A>,
  maxElementSamples = 3,
): ReadonlyArray<ReadonlyArray<A>> => {
  const representatives = Array.from(base).slice(0, maxElementSamples);
  const lists: ReadonlyArray<A>[] = [[]];
  for (const value of representatives) {
    lists.push([value]);
  }
  if (representatives.length > 0) {
    for (const left of representatives) {
      for (const right of representatives) {
        lists.push([left, right]);
      }
    }
  }
  return lists;
};

export interface FreeMonoidConcatenationFailure<A, B> {
  readonly left: ReadonlyArray<A>;
  readonly right: ReadonlyArray<A>;
  readonly mappedConcatenation: ReadonlyArray<B>;
  readonly concatenationOfImages: ReadonlyArray<B>;
}

export interface FreeMonoidArrowAnalysis<A, B> {
  readonly holds: boolean;
  readonly preservesEmpty: boolean;
  readonly concatenationFailures: ReadonlyArray<FreeMonoidConcatenationFailure<A, B>>;
  readonly details: ReadonlyArray<string>;
}

export interface FreeMonoidArrowSamples<A> {
  readonly lists?: ReadonlyArray<ReadonlyArray<A>>;
  readonly maxElementSamples?: number;
}

const analyzeFreeMonoidArrow = <A, B>(
  arrow: SetHom<A, B>,
  listToolkit: ListEndofunctorToolkit,
  samples: FreeMonoidArrowSamples<A> = {},
): FreeMonoidArrowAnalysis<A, B> => {
  const listSamples = samples.lists ??
    defaultFreeMonoidListSamples(arrow.dom, samples.maxElementSamples ?? 3);

  const mapLists = listToolkit.mapList(arrow.map);
  const preservesEmpty = listsEqual(mapLists([]), []);

  const concatenationFailures: FreeMonoidConcatenationFailure<A, B>[] = [];
  for (const left of listSamples) {
    for (const right of listSamples) {
      const mappedConcatenation = mapLists(listToolkit.concat(left, right));
      const concatenationOfImages = listToolkit.concat(mapLists(left), mapLists(right));
      if (!listsEqual(mappedConcatenation, concatenationOfImages)) {
        concatenationFailures.push({ left, right, mappedConcatenation, concatenationOfImages });
      }
    }
  }

  const holds = preservesEmpty && concatenationFailures.length === 0;
  const details: string[] = [];
  if (listSamples.length === 0) {
    details.push(
      "No list samples were supplied; concatenation preservation was not exercised.",
    );
  }
  if (!preservesEmpty) {
    details.push("Image of the empty list was not the empty list.");
  }
  if (concatenationFailures.length > 0) {
    details.push(
      `${concatenationFailures.length} concatenation samples failed to respect list mapping.`,
    );
  }
  if (details.length === 0) {
    details.push(
      "Arrow preserved the empty list and concatenation on the sampled lists.",
    );
  }

  return { holds, preservesEmpty, concatenationFailures, details };
};

export interface FreeMonoidObjectWitness<A> {
  readonly base: SetObj<A>;
  readonly carrier: SetObj<ReadonlyArray<A>>;
  readonly monoid: Monoid<ReadonlyArray<A>>;
  readonly unit: SetHom<A, ReadonlyArray<A>>;
  readonly multiplication: (lists: ReadonlyArray<ReadonlyArray<A>>) => ReadonlyArray<A>;
}

export interface FreeMonoidFunctorToolkit {
  readonly functor: FunctorWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    Monoid<ReadonlyArray<unknown>>,
    MonoidHom<ReadonlyArray<unknown>, ReadonlyArray<unknown>>
  >;
  readonly objectWitness: <A>(base: SetObj<A>) => FreeMonoidObjectWitness<A>;
  readonly analyzeArrow: <A, B>(
    arrow: SetHom<A, B>,
    samples?: FreeMonoidArrowSamples<A>,
  ) => FreeMonoidArrowAnalysis<A, B>;
  readonly listToolkit: ListEndofunctorToolkit;
  readonly carrierOf: <A>(
    monoid: Monoid<ReadonlyArray<A>>,
  ) => SetObj<ReadonlyArray<A>> | undefined;
}

export interface FreeMonoidFunctorOptions {
  readonly listToolkit?: ListEndofunctorToolkit;
  readonly samples?: FunctorCheckSamples<SetObj<unknown>, SetHom<unknown, unknown>>;
}

export const freeMonoidFunctorWithWitness = (
  options: FreeMonoidFunctorOptions = {},
): FreeMonoidFunctorToolkit => {
  const listToolkit = options.listToolkit ?? listEndofunctorWithWitness();
  const samples = options.samples ?? defaultListSamples();

  const witnessCache = new WeakMap<SetObj<unknown>, FreeMonoidObjectWitness<unknown>>();
  const carrierCache = new WeakMap<
    Monoid<ReadonlyArray<unknown>>,
    SetObj<ReadonlyArray<unknown>>
  >();

  const buildWitness = <A>(base: SetObj<A>): FreeMonoidObjectWitness<A> => {
    const carrier = listToolkit.listObject(base);
    const monoid: Monoid<ReadonlyArray<A>> = {
      e: [],
      op: (left, right) => listToolkit.concat(left, right),
    };
    const unit = SetCat.hom(base, carrier, (value: A) => listToolkit.unit(value));
    const multiplication = (lists: ReadonlyArray<ReadonlyArray<A>>): ReadonlyArray<A> =>
      flattenLists(lists);
    const witness: FreeMonoidObjectWitness<A> = { base, carrier, monoid, unit, multiplication };
    carrierCache.set(
      monoid as Monoid<ReadonlyArray<unknown>>,
      carrier as SetObj<ReadonlyArray<unknown>>,
    );
    return witness;
  };

  const objectWitness = <A>(base: SetObj<A>): FreeMonoidObjectWitness<A> => {
    const cached = witnessCache.get(base as SetObj<unknown>);
    if (cached) {
      return cached as FreeMonoidObjectWitness<A>;
    }
    const witness = buildWitness(base);
    witnessCache.set(base as SetObj<unknown>, witness as FreeMonoidObjectWitness<unknown>);
    return witness;
  };

  const functor: Functor<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    Monoid<ReadonlyArray<unknown>>,
    MonoidHom<ReadonlyArray<unknown>, ReadonlyArray<unknown>>
  > = {
    F0: (object) =>
      objectWitness(object as SetObj<unknown>).monoid as Monoid<ReadonlyArray<unknown>>,
    F1: (arrow) => {
      const domain = objectWitness(arrow.dom);
      const codomain = objectWitness(arrow.cod);
      const mapped = listToolkit.mapList(arrow.map);
      return MonCat.hom(
        domain.monoid as Monoid<ReadonlyArray<unknown>>,
        codomain.monoid as Monoid<ReadonlyArray<unknown>>,
        mapped as (list: ReadonlyArray<unknown>) => ReadonlyArray<unknown>,
      );
    },
  };

  const carrierOf = <A>(
    monoid: Monoid<ReadonlyArray<A>>,
  ): SetObj<ReadonlyArray<A>> | undefined =>
    carrierCache.get(monoid as Monoid<ReadonlyArray<unknown>>) as
      | SetObj<ReadonlyArray<A>>
      | undefined;

  const witness = constructFunctorWithWitness(
    setSimpleCategory,
    listMonCatSimpleCategory,
    functor,
    samples,
    [
      "Free monoid functor sends each set to the list monoid it generates.",
      "Arrow map lifts functions to listwise monoid homomorphisms with empty-list and concatenation diagnostics.",
    ],
  );

  return {
    functor: witness,
    objectWitness,
    analyzeArrow: (arrow, arrowSamples) =>
      analyzeFreeMonoidArrow(arrow, listToolkit, arrowSamples),
    listToolkit,
    carrierOf,
  };
};


const makeBooleanMonoid = (): Monoid<boolean> => ({
  e: true,
  op: (left, right) => left && right,
  elements: [true, false],
});

const defaultForgetfulMonoidSamples = (): FunctorCheckSamples<
  Monoid<unknown>,
  MonoidHom<unknown, unknown>
> => {
  const booleanMonoid = makeBooleanMonoid();
  const identity = MonCat.hom(booleanMonoid, booleanMonoid, (value: boolean) => value) as MonoidHom<
    unknown,
    unknown
  >;
  return {
    objects: [booleanMonoid as Monoid<unknown>],
    arrows: [identity],
    composablePairs: [{ f: identity, g: identity }],
  };
};

export interface ForgetfulMonoidFunctorOptions {
  readonly carrierFor?: (monoid: Monoid<unknown>) => SetObj<unknown> | undefined;
  readonly samples?: FunctorCheckSamples<Monoid<unknown>, MonoidHom<unknown, unknown>>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface ForgetfulMonoidFunctorToolkit {
  readonly functor: FunctorWithWitness<
    Monoid<unknown>,
    MonoidHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly carrierOf: <A>(monoid: Monoid<A>) => SetObj<A>;
}

const defaultCarrierForMonoid = (monoid: Monoid<unknown>): SetObj<unknown> | undefined => {
  const tagged = monoid as { readonly carrier?: SetObj<unknown> };
  if (tagged.carrier) {
    return tagged.carrier;
  }
  if (monoid.elements) {
    return SetCat.obj(monoid.elements);
  }
  return undefined;
};

export const forgetfulMonoidFunctorWithWitness = (
  options: ForgetfulMonoidFunctorOptions = {},
): ForgetfulMonoidFunctorToolkit => {
  const carrierCache = new WeakMap<Monoid<unknown>, SetObj<unknown>>();
  const carrierFor = options.carrierFor ?? defaultCarrierForMonoid;

  const computeCarrier = (monoid: Monoid<unknown>): SetObj<unknown> => {
    const cached = carrierCache.get(monoid);
    if (cached) {
      return cached;
    }
    const provided = carrierFor(monoid) ?? defaultCarrierForMonoid(monoid);
    if (!provided) {
      throw new Error(
        "forgetfulMonoidFunctorWithWitness: unable to determine the underlying set for the supplied monoid.",
      );
    }
    carrierCache.set(monoid, provided);
    return provided;
  };

  const functor: Functor<
    Monoid<unknown>,
    MonoidHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  > = {
    F0: (monoid) => computeCarrier(monoid),
    F1: (arrow) => {
      const domain = computeCarrier(arrow.dom);
      const codomain = computeCarrier(arrow.cod);
      return SetCat.hom(
        domain,
        codomain,
        arrow.map as (value: unknown) => unknown,
      ) as SetHom<unknown, unknown>;
    },
  };

  const samples = options.samples ?? defaultForgetfulMonoidSamples();
  const metadata = options.metadata ?? [
    "Forgetful functor sends a monoid to its underlying set and a homomorphism to its underlying function.",
    "Counterexample helpers witness how the forgetful functor collapses monoid coequalizers and coproducts after forgetting.",
  ];

  const witness = constructFunctorWithWitness(
    monCatSimpleCategory,
    setSimpleCategory,
    functor,
    samples,
    metadata,
  );

  const carrierOf = <A>(monoid: Monoid<A>): SetObj<A> =>
    computeCarrier(monoid as Monoid<unknown>) as SetObj<A>;

  return { functor: witness, carrierOf };
};


const promoteSamples = <T>(entries: ReadonlyArray<T>): ReadonlyArray<ReadonlyArray<T>> => {
  const [first, second] = entries;
  const collections: Array<ReadonlyArray<T>> = [[]];
  if (first !== undefined) {
    collections.push([first]);
  }
  if (first !== undefined && second !== undefined) {
    collections.push([first, second]);
  }
  return collections;
};

const iterateOver = <T>(values: ReadonlyArray<T>): (() => IterableIterator<T>) =>
  () =>
    (function* iterate(): IterableIterator<T> {
      for (const value of values) {
        yield value;
      }
    })();

export interface ListMonadUnitFailure {
  readonly sample: ReadonlyArray<unknown>;
  readonly actual: ReadonlyArray<unknown>;
  readonly expected: ReadonlyArray<unknown>;
}

export interface ListMonadAssociativityFailure {
  readonly sample: ReadonlyArray<ReadonlyArray<ReadonlyArray<unknown>>>;
  readonly left: ReadonlyArray<ReadonlyArray<unknown>>;
  readonly right: ReadonlyArray<ReadonlyArray<unknown>>;
}

export interface ListMonadLawCheckResult<Failure> {
  readonly holds: boolean;
  readonly failures: ReadonlyArray<Failure>;
  readonly details: ReadonlyArray<string>;
}

export interface ListMonadLawReport {
  readonly leftUnit: ListMonadLawCheckResult<ListMonadUnitFailure>;
  readonly rightUnit: ListMonadLawCheckResult<ListMonadUnitFailure>;
  readonly associativity: ListMonadLawCheckResult<ListMonadAssociativityFailure>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface ListMonadToolkit {
  readonly endofunctor: FunctorWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly unit: NaturalTransformationWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly multiplication: NaturalTransformationWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly report: ListMonadLawReport;
  readonly kleisliCompose: <A, B, C>(
    f: SetHom<A, ReadonlyArray<B>>,
    g: SetHom<B, ReadonlyArray<C>>,
  ) => SetHom<A, ReadonlyArray<C>>;
}

export interface ListMonadOptions {
  readonly samples?: ReadonlyArray<SetObj<unknown>>;
  readonly maxSampleElements?: number;
  readonly metadata?: ReadonlyArray<string>;
}

const defaultListMonadSamples = (): ReadonlyArray<SetObj<unknown>> => [
  SetCat.obj([0, 1]) as SetObj<unknown>,
];

interface ListSampleData {
  readonly lists: ReadonlyArray<ReadonlyArray<unknown>>;
  readonly listOfLists: ReadonlyArray<ReadonlyArray<ReadonlyArray<unknown>>>;
  readonly listOfListOfLists: ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<unknown>>>>;
}

const buildListSamples = (base: SetObj<unknown>, maxElements: number): ListSampleData => {
  const lists = defaultFreeMonoidListSamples(base, maxElements) as ReadonlyArray<ReadonlyArray<unknown>>;
  const listOfLists = promoteSamples(lists);
  const listOfListOfLists = promoteSamples(listOfLists);
  return { lists, listOfLists, listOfListOfLists };
};

const makeListCollectionSet = <A>(
  listSet: SetObj<ReadonlyArray<A>>,
  collections: ReadonlyArray<ReadonlyArray<ReadonlyArray<A>>>,
  tag: string,
): SetObj<ReadonlyArray<ReadonlyArray<A>>> =>
  SetCat.lazyObj({
    iterate: iterateOver(collections),
    has: (value: ReadonlyArray<ReadonlyArray<A>>): boolean =>
      Array.isArray(value) && value.every((inner) => listSet.has(inner)),
    tag,
    cardinality: collections.length,
  });

const asGenericSetHom = <Dom, Cod>(hom: SetHom<Dom, Cod>): SetHom<unknown, unknown> =>
  hom as unknown as SetHom<unknown, unknown>;

const expectSetHom = <Dom, Cod>(
  hom: SetHom<unknown, unknown>,
  dom: SetObj<Dom>,
  cod: SetObj<Cod>,
  label: string,
): SetHom<Dom, Cod> => {
  if (hom.dom !== dom || hom.cod !== cod) {
    throw new Error(
      `${label}: component domain/codomain mismatch with expected objects.`,
    );
  }
  return hom as unknown as SetHom<Dom, Cod>;
};

const asGenericMonoid = <Carrier>(monoid: Monoid<Carrier>): Monoid<unknown> =>
  monoid as unknown as Monoid<unknown>;

const asGenericMonoidHom = <Dom, Cod>(
  hom: MonoidHom<Dom, Cod>,
): MonoidHom<unknown, unknown> => hom as unknown as MonoidHom<unknown, unknown>;

const checkListMonadLaws = (
  listToolkit: ListEndofunctorToolkit,
  unit: NaturalTransformationWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >,
  multiplication: NaturalTransformationWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >,
  bases: ReadonlyArray<SetObj<unknown>>,
  maxElements: number,
): ListMonadLawReport => {
  const leftUnitFailures: ListMonadUnitFailure[] = [];
  const rightUnitFailures: ListMonadUnitFailure[] = [];
  const associativityFailures: ListMonadAssociativityFailure[] = [];
  let leftSamples = 0;
  let rightSamples = 0;
  let associativitySamples = 0;

  const sampleCache = new WeakMap<SetObj<unknown>, ListSampleData>();
  const samplesFor = (base: SetObj<unknown>): ListSampleData => {
    const cached = sampleCache.get(base);
    if (cached) {
      return cached;
    }
    const data = buildListSamples(base, maxElements);
    sampleCache.set(base, data);
    return data;
  };

  for (const base of bases) {
    const { lists, listOfLists, listOfListOfLists } = samplesFor(base);
    leftSamples += lists.length;
    rightSamples += lists.length;
    associativitySamples += listOfListOfLists.length;

    const listSet = listToolkit.listObject(base) as SetObj<ReadonlyArray<unknown>>;
    const listListSet = listToolkit.listObject(listSet) as SetObj<
      ReadonlyArray<ReadonlyArray<unknown>>
    >;
    const listListListSet = listToolkit.listObject(listListSet) as SetObj<
      ReadonlyArray<ReadonlyArray<ReadonlyArray<unknown>>>
    >;
    const unitComponent = expectSetHom(
      unit.transformation.component(base),
      base,
      listSet,
      "List monad unit",
    );
    const listUnit = expectSetHom(
      listToolkit.functor.functor.F1(asGenericSetHom(unitComponent)),
      listSet,
      listListSet,
      "List monad lifted unit",
    );
    const multiplicationComponent = expectSetHom(
      multiplication.transformation.component(base),
      listListSet,
      listSet,
      "List monad multiplication",
    );
    const leftComposite = SetCat.compose(
      multiplicationComponent,
      listUnit,
    ) as SetHom<ReadonlyArray<unknown>, ReadonlyArray<unknown>>;

    for (const list of lists) {
      const actual = leftComposite.map(list);
      if (!listsEqual(actual, list)) {
        leftUnitFailures.push({ sample: list, actual, expected: list });
      }
    }

    const listSetTag = (listSet as { readonly tag?: string }).tag ?? "List";
    const etaList = expectSetHom(
      unit.transformation.component(listSet),
      listSet,
      listListSet,
      "List monad unit@List",
    );
    const rightComposite = SetCat.compose(
      multiplicationComponent,
      etaList,
    ) as SetHom<ReadonlyArray<unknown>, ReadonlyArray<unknown>>;

    for (const list of lists) {
      const actual = rightComposite.map(list);
      if (!listsEqual(actual, list)) {
        rightUnitFailures.push({ sample: list, actual, expected: list });
      }
    }

    const listMu = expectSetHom(
      listToolkit.functor.functor.F1(asGenericSetHom(multiplicationComponent)),
      listListListSet,
      listListSet,
      "List monad lifted multiplication",
    );
    const muList = expectSetHom(
      multiplication.transformation.component(listSet),
      listListListSet,
      listListSet,
      "List monad multiplication@List",
    );
    const leftAssoc = SetCat.compose(
      multiplicationComponent,
      listMu,
    ) as SetHom<
      ReadonlyArray<ReadonlyArray<ReadonlyArray<unknown>>>,
      ReadonlyArray<ReadonlyArray<unknown>>
    >;
    const rightAssoc = SetCat.compose(
      multiplicationComponent,
      muList,
    ) as SetHom<
      ReadonlyArray<ReadonlyArray<ReadonlyArray<unknown>>>,
      ReadonlyArray<ReadonlyArray<unknown>>
    >;

    for (const sample of listOfListOfLists) {
      const leftResult = leftAssoc.map(sample);
      const rightResult = rightAssoc.map(sample);
      if (!listsEqual(leftResult, rightResult)) {
        associativityFailures.push({ sample, left: leftResult, right: rightResult });
      }
    }

  }

  const summarize = (
    label: string,
    totalSamples: number,
    holds: boolean,
    failureCount: number,
  ): string =>
    holds
      ? `${label} law verified on ${totalSamples} sample(s).`
      : `${label} law failed on ${failureCount} sample(s).`;

  const leftUnitReport: ListMonadLawCheckResult<ListMonadUnitFailure> = {
    holds: leftUnitFailures.length === 0,
    failures: leftUnitFailures,
    details: [
      summarize("Left unit", leftSamples, leftUnitFailures.length === 0, leftUnitFailures.length),
    ],
  };

  const rightUnitReport: ListMonadLawCheckResult<ListMonadUnitFailure> = {
    holds: rightUnitFailures.length === 0,
    failures: rightUnitFailures,
    details: [
      summarize("Right unit", rightSamples, rightUnitFailures.length === 0, rightUnitFailures.length),
    ],
  };

  const associativityReport: ListMonadLawCheckResult<ListMonadAssociativityFailure> = {
    holds: associativityFailures.length === 0,
    failures: associativityFailures,
    details: [
      summarize(
        "Associativity",
        associativitySamples,
        associativityFailures.length === 0,
        associativityFailures.length,
      ),
    ],
  };

  const holds =
    leftUnitReport.holds && rightUnitReport.holds && associativityReport.holds;

  const details: string[] = [];
  if (holds) {
    details.push(
      `List monad laws held on ${bases.length} base sample(s) with up to ${maxElements} generator elements each.`,
    );
  } else {
    if (!leftUnitReport.holds) {
      details.push(leftUnitReport.details[0]!);
    }
    if (!rightUnitReport.holds) {
      details.push(rightUnitReport.details[0]!);
    }
    if (!associativityReport.holds) {
      details.push(associativityReport.details[0]!);
    }
  }

  return { leftUnit: leftUnitReport, rightUnit: rightUnitReport, associativity: associativityReport, holds, details };
};

export const buildListMonadToolkit = (
  listToolkit: ListEndofunctorToolkit,
  unit: NaturalTransformationWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >,
  options: ListMonadOptions = {},
): ListMonadToolkit => {
  const samples = options.samples ?? defaultListMonadSamples();
  const maxElements = options.maxSampleElements ?? 2;

  const functor = listToolkit.functor;

  const functorSamples: FunctorCheckSamples<SetObj<unknown>, SetHom<unknown, unknown>> = {
    objects: samples,
    arrows: samples.map((set) => SetCat.id(set) as SetHom<unknown, unknown>),
    composablePairs: samples.map((set) => {
      const id = SetCat.id(set) as SetHom<unknown, unknown>;
      return { f: id, g: id };
    }),
  };

  const listSquaredFunctor: Functor<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  > = {
    F0: (object) => {
      const base = object as SetObj<unknown>;
      const { listOfLists } = buildListSamples(base, maxElements);
      const listSet = listToolkit.listObject(base) as SetObj<ReadonlyArray<unknown>>;
      return makeListCollectionSet(
        listSet,
        listOfLists,
        `List(List(${String((base as { tag?: string }).tag ?? "Set")}))`,
      );
    },
    F1: (arrow) => {
      const baseDomain = arrow.dom as SetObj<unknown>;
      const domainSamples = buildListSamples(baseDomain, maxElements);
      const domainListSet = listToolkit.listObject(baseDomain) as SetObj<ReadonlyArray<unknown>>;
      const domain = makeListCollectionSet(
        domainListSet,
        domainSamples.listOfLists,
        `List(List(${String((baseDomain as { tag?: string }).tag ?? "Set")}) domain)`,
      );
      const baseCodomain = arrow.cod as SetObj<unknown>;
      const codomainSamples = buildListSamples(baseCodomain, maxElements);
      const codomainListSet = listToolkit.listObject(baseCodomain) as SetObj<ReadonlyArray<unknown>>;
      const codomain = makeListCollectionSet(
        codomainListSet,
        codomainSamples.listOfLists,
        `List(List(${String((baseCodomain as { tag?: string }).tag ?? "Set")}) codomain)`,
      );
      return SetCat.hom(
        domain,
        codomain,
        (lists: ReadonlyArray<ReadonlyArray<unknown>>) =>
          listToolkit.mapList((inner: ReadonlyArray<unknown>) =>
            listToolkit.mapList((value: unknown) => arrow.map(value))(inner),
          )(lists),
      ) as SetHom<unknown, unknown>;
    },
  };

  const listSquaredWitness = constructFunctorWithWitness(
    setSimpleCategory,
    setSimpleCategory,
    listSquaredFunctor,
    functorSamples,
    ["List∘List endofunctor for list monad multiplication."],
  );

    const transformationSamples: NaturalTransformationCheckSamples<
      SetObj<unknown>,
      SetHom<unknown, unknown>
    > = {
      objects: samples,
      ...(functorSamples.arrows !== undefined
        ? { arrows: functorSamples.arrows }
        : {}),
    };

    const multiplication = constructNaturalTransformationWithWitness(
      listSquaredWitness,
      functor,
      (object) => {
        const base = object as SetObj<unknown>;
      const { listOfLists, listOfListOfLists } = buildListSamples(base, maxElements);
      const listSet = listToolkit.listObject(base) as SetObj<ReadonlyArray<unknown>>;
      const listOfListsSet = makeListCollectionSet(
        listSet,
        listOfLists,
        `List(List(${String((base as { tag?: string }).tag ?? "Set")}))`,
      );
      return SetCat.hom(
        listOfListsSet,
        listSet,
        (lists: ReadonlyArray<ReadonlyArray<unknown>>) => flattenLists(lists),
      ) as SetHom<unknown, unknown>;
    },
      {
        samples: transformationSamples,
        metadata: options.metadata ?? ["List monad multiplication flattens nested finite lists."],
      },
    );

  const report = checkListMonadLaws(listToolkit, unit, multiplication, samples, maxElements);

  const kleisliCompose = <A, B, C>(
    f: SetHom<A, ReadonlyArray<B>>,
    g: SetHom<B, ReadonlyArray<C>>,
  ): SetHom<A, ReadonlyArray<C>> => {
    const expectedDomain = listToolkit.listObject(g.dom as SetObj<unknown>);
    if (f.cod !== expectedDomain) {
      throw new Error("List monad Kleisli composition expects codomain of f to equal List(dom g).");
    }
    const codomain = g.cod as SetObj<ReadonlyArray<C>>;
    return SetCat.hom(f.dom as SetObj<A>, codomain, (value: A) => {
      const mapped = f.map(value).map((element) => g.map(element));
      return flattenLists(mapped);
    });
  };

  return {
    endofunctor: functor,
    unit,
    multiplication,
    report,
    kleisliCompose,
  };
};


export interface FreeForgetfulAdjunctionOptions {
  readonly freeOptions?: FreeMonoidFunctorOptions;
  readonly forgetfulOptions?: ForgetfulMonoidFunctorOptions;
  readonly adjunctionSamples?: AdjunctionCheckSamples<SetObj<unknown>, Monoid<unknown>>;
  readonly setSamples?: ReadonlyArray<SetObj<unknown>>;
  readonly monoidSamples?: ReadonlyArray<Monoid<unknown>>;
  readonly listMonadOptions?: ListMonadOptions;
  readonly metadata?: ReadonlyArray<string>;
}

export interface FreeForgetfulAdjunctionToolkit {
  readonly free: FreeMonoidFunctorToolkit;
  readonly forgetful: ForgetfulMonoidFunctorToolkit;
  readonly adjunction: AdjunctionWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    Monoid<unknown>,
    MonoidHom<unknown, unknown>
  >;
  readonly listMonad: ListMonadToolkit;
  readonly concrete?: ConcreteCategoryWitness<
    Monoid<unknown>,
    MonoidHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
}

const defaultSetSamples = (): ReadonlyArray<SetObj<unknown>> => [
  SetCat.obj(["x", "y"]) as SetObj<unknown>,
];

export const freeForgetfulAdjunctionWithWitness = (
  options: FreeForgetfulAdjunctionOptions = {},
): FreeForgetfulAdjunctionToolkit => {
  const free = freeMonoidFunctorWithWitness(options.freeOptions);
  const listToolkit = free.listToolkit;

  const setSamples = options.setSamples ?? defaultSetSamples();
  const monoidSamples: ReadonlyArray<Monoid<unknown>> =
    (options.monoidSamples as ReadonlyArray<Monoid<unknown>> | undefined) ?? [
      makeBooleanMonoid() as Monoid<unknown>,
    ];

    const combinedCarrierFor = (monoid: Monoid<unknown>): SetObj<unknown> | undefined => {
      const fromFree = free.carrierOf(
        monoid as unknown as Monoid<ReadonlyArray<unknown>>,
      );
      if (fromFree) {
        return fromFree as SetObj<unknown>;
      }
      return options.forgetfulOptions?.carrierFor?.(monoid);
    };

  const forgetfulOptions: ForgetfulMonoidFunctorOptions = {
    ...options.forgetfulOptions,
    carrierFor: combinedCarrierFor,
  };

  const forgetful = forgetfulMonoidFunctorWithWitness(forgetfulOptions);

  const concrete = concretizeForgetfulFunctor(
    forgetful.functor as FunctorWithWitness<
      Monoid<unknown>,
      MonoidHom<unknown, unknown>,
      SetObj<unknown>,
      SetHom<unknown, unknown>
    >,
    concreteMonoidDescriptor,
  );

  const setArrows = setSamples.map((set) => SetCat.id(set) as SetHom<unknown, unknown>);
  const setFunctorSamples: FunctorCheckSamples<SetObj<unknown>, SetHom<unknown, unknown>> = {
    objects: setSamples,
    arrows: setArrows,
    composablePairs: setArrows.map((arrow) => ({ f: arrow, g: arrow })),
  };

  const monoidArrows = monoidSamples.map(
    (monoid) => MonCat.id(monoid as Monoid<unknown>) as MonoidHom<unknown, unknown>,
  );
  const monoidFunctorSamples: FunctorCheckSamples<Monoid<unknown>, MonoidHom<unknown, unknown>> = {
    objects: monoidSamples,
    arrows: monoidArrows,
    composablePairs: monoidArrows.map((arrow) => ({ f: arrow, g: arrow })),
  };

  const UF: Functor<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  > = {
    F0: (object) => {
      const freeMonoid = free.functor.functor.F0(object);
      return forgetful.functor.functor.F0(asGenericMonoid(freeMonoid));
    },
    F1: (arrow) => {
      const freeArrow = free.functor.functor.F1(arrow);
      return forgetful.functor.functor.F1(asGenericMonoidHom(freeArrow));
    },
  };

  const UFWithWitness = constructFunctorWithWitness(
    setSimpleCategory,
    setSimpleCategory,
    UF,
    setFunctorSamples,
    ["Underlying set of the free monoid functor."],
  );

  const FU: Functor<
    Monoid<unknown>,
    MonoidHom<unknown, unknown>,
    Monoid<unknown>,
    MonoidHom<unknown, unknown>
  > = {
    F0: (monoid) => {
      const underlyingSet = forgetful.functor.functor.F0(monoid);
      return asGenericMonoid(free.functor.functor.F0(underlyingSet));
    },
    F1: (arrow) => {
      const underlyingArrow = forgetful.functor.functor.F1(arrow);
      return asGenericMonoidHom(free.functor.functor.F1(underlyingArrow));
    },
  };

  const FUWithWitness = constructFunctorWithWitness(
    monCatSimpleCategory,
    monCatSimpleCategory,
    FU,
    monoidFunctorSamples,
    ["Free-then-forget composition on monoids."],
  );

  const identitySet = identityFunctorWithWitness(setSimpleCategory, setFunctorSamples);
  const identityMonoid = identityFunctorWithWitness(monCatSimpleCategory, monoidFunctorSamples);

  const unit = constructNaturalTransformationWithWitness(
    identitySet,
    UFWithWitness,
    (object) => free.objectWitness(object).unit as SetHom<unknown, unknown>,
    {
      samples: { objects: setSamples, arrows: setArrows },
      metadata: ["Adjunction unit inserts elements as singleton lists."],
    },
  );

  const counit = constructNaturalTransformationWithWitness(
    FUWithWitness,
    identityMonoid,
    (monoid) => {
      const carrier = forgetful.carrierOf(monoid);
      const witness = free.objectWitness(carrier as SetObj<unknown>);
      return MonCat.hom(
        witness.monoid as Monoid<ReadonlyArray<unknown>>,
        monoid as Monoid<unknown>,
        (lists: ReadonlyArray<unknown>) => {
          let accumulator = monoid.e as unknown;
          for (const value of lists) {
            accumulator = (monoid.op as (a: unknown, b: unknown) => unknown)(
              accumulator,
              value,
            );
          }
          return accumulator;
        },
      ) as MonoidHom<unknown, unknown>;
    },
    {
      samples: { objects: monoidSamples, arrows: monoidArrows },
      metadata: ["Adjunction counit folds free lists using the target monoid multiplication."],
    },
  );

  const adjunctionSamples: AdjunctionCheckSamples<SetObj<unknown>, Monoid<unknown>> =
    options.adjunctionSamples ?? {
      sourceObjects: setSamples,
      targetObjects: monoidSamples,
    };

  const leftFunctor = free.functor as FunctorWithWitness<
    SetObj<unknown>,
    SetHom<unknown, unknown>,
    Monoid<unknown>,
    MonoidHom<unknown, unknown>
  >;
  const rightFunctor = forgetful.functor as FunctorWithWitness<
    Monoid<unknown>,
    MonoidHom<unknown, unknown>,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;

  const adjunction = constructAdjunctionWithWitness(
    leftFunctor,
    rightFunctor,
    unit,
    counit,
    {
      samples: adjunctionSamples,
      metadata: options.metadata ?? ["Free ⊣ Forgetful adjunction between Set and Mon."],
    },
  );

  const listMonad = buildListMonadToolkit(
    listToolkit,
    unit,
    {
      ...options.listMonadOptions,
      samples: options.listMonadOptions?.samples ?? setSamples,
    },
  );

  return { free, forgetful, adjunction, listMonad, concrete };
};


const monoidSimpleCategory = <M>(
  category: MonoidCategory<M>,
): SimpleCat<OneObject, MonoidArrow<M>> => ({
  id: () => category.id(),
  compose: category.compose,
  src: (arrow) => arrow.dom,
  dst: (arrow) => arrow.cod,
});

export interface MonoidHomMultiplicationFailure<M, N> {
  readonly left: M;
  readonly right: M;
  readonly mappedProduct: N;
  readonly productOfImages: N;
}

export interface MonoidHomFunctorAnalysis<M, N> {
  readonly holds: boolean;
  readonly preservesUnit: boolean;
  readonly multiplicationFailures: ReadonlyArray<MonoidHomMultiplicationFailure<M, N>>;
  readonly details: ReadonlyArray<string>;
}

const analyzeMonoidHom = <M, N>(hom: MonoidHom<M, N>): MonoidHomFunctorAnalysis<M, N> => {
  const details: string[] = [];
  const preservesUnit = Object.is(hom.map(hom.dom.e), hom.cod.e);
  if (!preservesUnit) {
    details.push("Unit preservation failed: f(e_M) ≠ e_N.");
  }

  const multiplicationFailures: MonoidHomMultiplicationFailure<M, N>[] = [];
  const elements = hom.dom.elements;
  if (elements && elements.length > 0) {
    for (const left of elements) {
      for (const right of elements) {
        const mappedProduct = hom.map(hom.dom.op(left, right));
        const productOfImages = hom.cod.op(hom.map(left), hom.map(right));
        if (!Object.is(mappedProduct, productOfImages)) {
          multiplicationFailures.push({ left, right, mappedProduct, productOfImages });
        }
      }
    }
    if (multiplicationFailures.length > 0) {
      details.push(
        `Multiplication preservation failed on ${multiplicationFailures.length} sampled pairs.`,
      );
    }
  } else {
    details.push(
      "No domain elements were supplied; multiplication preservation was not exhaustively checked.",
    );
  }

  const holds = preservesUnit && multiplicationFailures.length === 0;
  return { holds, preservesUnit, multiplicationFailures, details };
};

const gatherMonoidSamples = <M>(
  category: MonoidCategory<M>,
  monoid: Monoid<M>,
): FunctorCheckSamples<OneObject, MonoidArrow<M>> => {
  const object = category.obj();
  const arrows: MonoidArrow<M>[] = [];
  if (monoid.elements && monoid.elements.length > 0) {
    for (const element of monoid.elements) {
      arrows.push(category.hom(element));
    }
  } else {
    arrows.push(category.id());
  }
  const composablePairs: FunctorComposablePair<MonoidArrow<M>>[] = arrows.flatMap((f) =>
    arrows.map((g) => ({ f, g })),
  );
  return { objects: [object], arrows, composablePairs };
};

export interface MonoidHomFunctorWitness<M, N> {
  readonly functor: FunctorWithWitness<
    OneObject,
    MonoidArrow<M>,
    OneObject,
    MonoidArrow<N>
  >;
  readonly analysis: MonoidHomFunctorAnalysis<M, N>;
}

export const monoidHomAsFunctorWithWitness = <M, N>(
  hom: MonoidHom<M, N>,
  samples?: FunctorCheckSamples<OneObject, MonoidArrow<M>>,
): MonoidHomFunctorWitness<M, N> => {
  const sourceCategory = MonoidCat(hom.dom);
  const targetCategory = MonoidCat(hom.cod);
  const functor: Functor<OneObject, MonoidArrow<M>, OneObject, MonoidArrow<N>> = {
    F0: () => targetCategory.obj(),
    F1: (arrow) => targetCategory.hom(hom.map(arrow.elt)),
  };

  const witness = constructFunctorWithWitness(
    monoidSimpleCategory(sourceCategory),
    monoidSimpleCategory(targetCategory),
    functor,
    samples ?? gatherMonoidSamples(sourceCategory, hom.dom),
    ["Monoid homomorphism interpreted as a one-object functor."],
  );

  const analysis = analyzeMonoidHom(hom);
  return { functor: witness, analysis };
};

const preorderSimpleCategory = <X>(
  preorder: Preorder<X>,
): SimpleCat<X, PreorderHom<X>> => {
  const category = PreorderCat(preorder);
  return {
    id: category.id,
    compose: category.compose,
    src: (arrow) => arrow.src,
    dst: (arrow) => arrow.dst,
  };
};

export interface MonotoneViolation<A, B> {
  readonly domainPair: readonly [A, A];
  readonly codomainPair: readonly [B, B];
}

export interface MonotoneMapAnalysis<A, B> {
  readonly holds: boolean;
  readonly violations: ReadonlyArray<MonotoneViolation<A, B>>;
  readonly details: ReadonlyArray<string>;
}

const analyzeMonotoneMap = <A, B>(
  dom: Preorder<A>,
  cod: Preorder<B>,
  map: (value: A) => B,
): MonotoneMapAnalysis<A, B> => {
  const violations: MonotoneViolation<A, B>[] = [];
  for (const left of dom.elems) {
    for (const right of dom.elems) {
      if (!dom.le(left, right)) {
        continue;
      }
      const mappedLeft = map(left);
      const mappedRight = map(right);
      if (!cod.le(mappedLeft, mappedRight)) {
        violations.push({
          domainPair: [left, right],
          codomainPair: [mappedLeft, mappedRight],
        });
      }
    }
  }
  const holds = violations.length === 0;
  const details = holds
    ? ["Map preserved all comparable pairs in the sampled preorder."]
    : [
        `Monotonicity failed on ${violations.length} comparable pairs; see violations for witnesses.`,
      ];
  return { holds, violations, details };
};

const gatherMonotoneSamples = <A>(
  preorder: Preorder<A>,
): FunctorCheckSamples<A, PreorderHom<A>> => {
  const category = PreorderCat(preorder);
  const objects = preorder.elems.slice();
  const arrows: PreorderHom<A>[] = [];
  const composablePairs: FunctorComposablePair<PreorderHom<A>>[] = [];
  for (const source of preorder.elems) {
    for (const mid of preorder.elems) {
      const first = category.hom(source, mid);
      if (!first) {
        continue;
      }
      arrows.push(first);
      for (const target of preorder.elems) {
        const second = category.hom(mid, target);
        if (second) {
          arrows.push(second);
          composablePairs.push({ f: first, g: second });
        }
      }
    }
  }
  return { objects, arrows, composablePairs };
};

export interface MonotoneMapFunctorWitness<A, B> {
  readonly functor: FunctorWithWitness<A, PreorderHom<A>, B, PreorderHom<B>>;
  readonly analysis: MonotoneMapAnalysis<A, B>;
}

export const monotoneMapAsFunctorWithWitness = <A, B>(
  hom: PreordHom<A, B>,
  samples?: FunctorCheckSamples<A, PreorderHom<A>>,
): MonotoneMapFunctorWitness<A, B> => {
  if (!isMonotone(hom)) {
    throw new Error("monotoneMapAsFunctorWithWitness: supplied map is not monotone.");
  }

  const sourceCategory = preorderSimpleCategory(hom.dom);
  const targetCategory = preorderSimpleCategory(hom.cod);
  const codPreorder = PreorderCat(hom.cod);

  const functor: Functor<A, PreorderHom<A>, B, PreorderHom<B>> = {
    F0: (object) => hom.map(object),
    F1: (arrow) => {
      const imageSrc = hom.map(sourceCategory.src(arrow));
      const imageDst = hom.map(sourceCategory.dst(arrow));
      const result = codPreorder.hom(imageSrc, imageDst);
      if (!result) {
        throw new Error("monotoneMapAsFunctorWithWitness: monotonicity was violated unexpectedly.");
      }
      return result;
    },
  };

  const witness = constructFunctorWithWitness(
    sourceCategory,
    targetCategory,
    functor,
    samples ?? gatherMonotoneSamples(hom.dom),
    ["Monotone map viewed as a functor between thin categories."],
  );

  const analysis = analyzeMonotoneMap(hom.dom, hom.cod, hom.map);
  return { functor: witness, analysis };
};

export interface GroupActionSamples<Element, Point> {
  readonly groupElements?: ReadonlyArray<Element>;
  readonly points?: ReadonlyArray<Point>;
}

export interface GroupActionData<Element, Point> {
  readonly group: Group<Element> & { readonly elements?: ReadonlyArray<Element> };
  readonly carrier: SetObj<Point>;
  readonly act: (element: Element, point: Point) => Point;
}

export interface GroupActionUnitFailure<Point> {
  readonly point: Point;
  readonly image: Point;
}

export interface GroupActionAssociativityFailure<Element, Point> {
  readonly left: Element;
  readonly right: Element;
  readonly point: Point;
  readonly combinedImage: Point;
  readonly iteratedImage: Point;
}

export interface GroupActionAnalysis<Element, Point> {
  readonly holds: boolean;
  readonly unitFailures: ReadonlyArray<GroupActionUnitFailure<Point>>;
  readonly associativityFailures: ReadonlyArray<GroupActionAssociativityFailure<Element, Point>>;
  readonly details: ReadonlyArray<string>;
}

const analyzeGroupAction = <Element, Point>(
  action: GroupActionData<Element, Point>,
  samples: GroupActionSamples<Element, Point> = {},
): GroupActionAnalysis<Element, Point> => {
  const groupSamples = samples.groupElements ?? action.group.elements ?? [];
  const pointSamples = samples.points ?? Array.from(action.carrier);

  const unitFailures: GroupActionUnitFailure<Point>[] = [];
  for (const point of pointSamples) {
    const image = action.act(action.group.identity, point);
    if (!Object.is(image, point)) {
      unitFailures.push({ point, image });
    }
  }

  const associativityFailures: GroupActionAssociativityFailure<Element, Point>[] = [];
  for (const left of groupSamples) {
    for (const right of groupSamples) {
      for (const point of pointSamples) {
        const combinedImage = action.act(action.group.combine(left, right), point);
        const iteratedImage = action.act(left, action.act(right, point));
        if (!Object.is(combinedImage, iteratedImage)) {
          associativityFailures.push({ left, right, point, combinedImage, iteratedImage });
        }
      }
    }
  }

  const holds = unitFailures.length === 0 && associativityFailures.length === 0;
  const details: string[] = [];
  if (groupSamples.length === 0) {
    details.push("No group samples supplied; associativity verification may be incomplete.");
  }
  if (pointSamples.length === 0) {
    details.push("No carrier points supplied; action could not be exercised on elements.");
  }
  if (unitFailures.length > 0) {
    details.push(`${unitFailures.length} unit action failures were detected.`);
  }
  if (associativityFailures.length > 0) {
    details.push(`${associativityFailures.length} associativity failures were detected.`);
  }
  if (details.length === 0) {
    details.push("Action satisfied identity and composition on the sampled elements.");
  }

  return { holds, unitFailures, associativityFailures, details };
};

export interface GroupActionFunctorWitness<Element, Point> {
  readonly functor: FunctorWithWitness<
    OneObject,
    MonoidArrow<Element>,
    SetObj<Point>,
    SetHom<Point, Point>
  >;
  readonly analysis: GroupActionAnalysis<Element, Point>;
}

export const groupActionAsFunctorWithWitness = <Element, Point>(
  action: GroupActionData<Element, Point>,
  samples: GroupActionSamples<Element, Point> = {},
): GroupActionFunctorWitness<Element, Point> => {
  const monoid: Monoid<Element> = {
    e: action.group.identity,
    op: (a, b) => action.group.combine(a, b),
    ...(action.group.elements ? { elements: action.group.elements } : {}),
  };
  const sourceCategory = MonoidCat(monoid);
  const functor: Functor<
    OneObject,
    MonoidArrow<Element>,
    SetObj<Point>,
    SetHom<Point, Point>
  > = {
    F0: () => action.carrier,
    F1: (arrow) => SetCat.hom(action.carrier, action.carrier, (point: Point) =>
      action.act(arrow.elt as Element, point),
    ),
  };

  const arrowSamples: MonoidArrow<Element>[] = [];
  if (samples.groupElements && samples.groupElements.length > 0) {
    for (const element of samples.groupElements) {
      arrowSamples.push(sourceCategory.hom(element));
    }
  } else if (monoid.elements && monoid.elements.length > 0) {
    for (const element of monoid.elements) {
      arrowSamples.push(sourceCategory.hom(element));
    }
  } else {
    arrowSamples.push(sourceCategory.id());
  }

  const composablePairs: FunctorComposablePair<MonoidArrow<Element>>[] = arrowSamples.flatMap(
    (f) => arrowSamples.map((g) => ({ f, g })),
  );

  const witness = constructFunctorWithWitness(
    monoidSimpleCategory(sourceCategory),
    setSimpleCategory as SimpleCat<SetObj<Point>, SetHom<Point, Point>>,
    functor,
    {
      objects: [sourceCategory.obj()],
      arrows: arrowSamples,
      composablePairs,
    },
    ["Group action interpreted as a Set-valued functor."],
  );

  const analysis = analyzeGroupAction(action, samples);
  return { functor: witness, analysis };
};

