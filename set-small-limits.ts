import { CategoryLimits } from "./stdlib/category-limits";
import { ArrowFamilies } from "./stdlib/arrow-families";
import { IndexedFamilies } from "./stdlib/indexed-families";
import type { Category } from "./stdlib/category";
import {
  SetCat,
  instantiateMaterializedCarrier,
  semanticsAwareEquals,
  semanticsAwareHas,
  type SetCarrierSemantics,
  type SetHom,
  type SetObj,
} from "./set-cat";
import {
  createSetMultInfObj,
  setMultObjFromSet,
  type SetMultIndexedFamily,
  type SetMultProduct,
  type SetMultTuple,
} from "./setmult-category";

type AnySetObj = SetObj<unknown>;
type AnySetHom = SetHom<unknown, unknown>;

type ProductMetadata = {
  readonly kind: "finite";
  readonly arity: number;
  readonly tuples: ReadonlyArray<ReadonlyArray<unknown>>;
  readonly equals: (left: ReadonlyArray<unknown>, right: ReadonlyArray<unknown>) => boolean;
};

type InfiniteProductMetadata = {
  readonly product: SetMultProduct<unknown, unknown>;
  readonly projectionIndex: WeakMap<AnySetHom, unknown>;
  readonly knownTuples: Set<SetMultTuple<unknown, unknown>>;
  readonly registerTuple: (assignment: Map<unknown, unknown>) => SetMultTuple<unknown, unknown>;
};

type ProductBuilder = (
  objects: ReadonlyArray<AnySetObj>,
) => { readonly carrier: AnySetObj; readonly projections: ReadonlyArray<AnySetHom> };

type TupleBuilder = (
  domain: AnySetObj,
  legs: ReadonlyArray<AnySetHom>,
  product: AnySetObj,
) => AnySetHom;

const widenHom = <A, B>(hom: SetHom<A, B>): AnySetHom => hom as unknown as AnySetHom;
const widenObj = <A>(obj: SetObj<A>): AnySetObj => obj as unknown as AnySetObj;

const createProductMetadata = (): { buildProduct: ProductBuilder; tuple: TupleBuilder } => {
  const metadata = new WeakMap<AnySetObj, ProductMetadata>();

  const buildProduct: ProductBuilder = (objects) => {
    const tuples: Array<ReadonlyArray<unknown>> = [];

    const build = (prefix: unknown[], index: number) => {
      if (index === objects.length) {
        const tuple = Object.freeze(prefix.slice()) as ReadonlyArray<unknown>;
        tuples.push(tuple);
        return;
      }

      const object = objects[index];
      if (!object) {
        throw new Error("Set small product: missing factor for index");
      }

      for (const value of object) {
        prefix[index] = value;
        build(prefix, index + 1);
      }
    };

    build([], 0);
    const coordinateEquals = objects.map((object) => semanticsAwareEquals(object));
    const tupleEquals = (left: ReadonlyArray<unknown>, right: ReadonlyArray<unknown>): boolean => {
      if (left.length !== objects.length || right.length !== objects.length) {
        return false;
      }
      return coordinateEquals.every((equals, position) => equals(left[position], right[position]));
    };
    const semantics = SetCat.createMaterializedSemantics(tuples, {
      equals: tupleEquals,
      tag: "SetSmallFiniteProduct",
    });
    const rawCarrier = SetCat.obj(tuples, {
      semantics,
      instantiate: instantiateMaterializedCarrier,
    });
    const carrier = widenObj(rawCarrier);
    metadata.set(carrier, {
      kind: "finite",
      arity: objects.length,
      tuples,
      equals: tupleEquals,
    });

    const projections = objects.map((object, position) =>
      widenHom(
        SetCat.hom<unknown, unknown>(
          carrier,
          object,
          (tuple: unknown) => (tuple as ReadonlyArray<unknown>)[position]!,
        ),
      ),
    );

    return { carrier, projections };
  };

  const tuple: TupleBuilder = (domain, legs, product) => {
    const data = metadata.get(product);
    if (!data) {
      throw new Error("Set small product tuple: unrecognised product carrier");
    }
    if (data.kind !== "finite") {
      throw new Error("Set small product tuple: expected finite product metadata");
    }
    if (legs.length !== data.arity) {
      throw new Error("Set small product tuple: leg count does not match product arity");
    }

    return SetCat.hom<unknown, unknown>(domain, product, (value: unknown) => {
      const coordinates = legs.map((leg) => leg.map(value));
      const tupleValue = data.tuples.find((candidate) => data.equals(candidate, coordinates));
      if (!tupleValue) {
        throw new Error("Set small product tuple: legs do not land in the recorded product tuple");
      }
      return tupleValue as unknown;
    });
  };

  return { buildProduct, tuple };
};

const productMetadata = createProductMetadata();

const infiniteProductMetadata = new WeakMap<AnySetObj, InfiniteProductMetadata>();

const createIndexIterable = <I>(index: IndexedFamilies.SmallIndex<I>): Iterable<I> => ({
  [Symbol.iterator]: () => {
    if (index.enumerate) {
      return index.enumerate()[Symbol.iterator]();
    }
    const carrier = (index as { carrier?: ReadonlyArray<I> }).carrier;
    if (!carrier) {
      throw new Error("Set small product: index must expose an enumerator or carrier");
    }
    return carrier[Symbol.iterator]();
  },
});

const buildInfiniteProduct = <I>(
  index: IndexedFamilies.SmallIndex<I>,
  family: IndexedFamilies.SmallFamily<I, AnySetObj>,
): { obj: AnySetObj; projections: IndexedFamilies.SmallFamily<I, AnySetHom> } => {
  const iterable = createIndexIterable(index);
  const setMultFamily: SetMultIndexedFamily<I, unknown> = {
    index: iterable,
    coordinate: (entry) => setMultObjFromSet(family(entry) as SetObj<unknown>),
  };

  const product = createSetMultInfObj(setMultFamily as SetMultIndexedFamily<I, unknown>);
  const knownTuples = new Set<SetMultTuple<I, unknown>>();

  const semantics: SetCarrierSemantics<SetMultTuple<I, unknown>> = {
    iterate: function* iterate(): IterableIterator<SetMultTuple<I, unknown>> {
      for (const tuple of knownTuples) {
        yield tuple;
      }
    },
    has: (tuple) => knownTuples.has(tuple),
    equals: (left, right) => left === right,
    tag: "SetSmallInfiniteProduct",
  };

  const carrierObj = SetCat.lazyObj<SetMultTuple<I, unknown>>({ semantics });

  const carrier = widenObj(carrierObj);
  const projectionIndex = new WeakMap<AnySetHom, I>();
  const projectionCache = new Map<I, AnySetHom>();

  const projections: IndexedFamilies.SmallFamily<I, AnySetHom> = (entry) => {
    const cached = projectionCache.get(entry);
    if (cached) {
      return cached;
    }

    const factor = family(entry) as SetObj<unknown>;
    const projection = widenHom(
      SetCat.hom<SetMultTuple<I, unknown>, unknown>(carrierObj, factor, (tuple) => {
        if (!knownTuples.has(tuple)) {
          throw new Error("Set small product: projection observed an unregistered tuple");
        }
        const value = tuple.get(entry);
        if (value === undefined) {
          throw new Error(`Set small product: tuple missing coordinate ${String(entry)}`);
        }
        return value;
      }),
    );

    projectionCache.set(entry, projection);
    projectionIndex.set(projection, entry);
    return projection;
  };

  const registerTuple = (assignment: Map<I, unknown>): SetMultTuple<I, unknown> => {
    const tuple = product.carrier((indexValue) => {
      if (!assignment.has(indexValue)) {
        throw new Error(
          `Set small product: tuple legs do not determine coordinate ${String(indexValue)}`,
        );
      }
      return assignment.get(indexValue) as unknown;
    });
    knownTuples.add(tuple);
    return tuple;
  };

  infiniteProductMetadata.set(carrier, {
    product: product as SetMultProduct<unknown, unknown>,
    projectionIndex: projectionIndex as unknown as WeakMap<AnySetHom, unknown>,
    knownTuples: knownTuples as unknown as Set<SetMultTuple<unknown, unknown>>,
    registerTuple: registerTuple as unknown as (assignment: Map<unknown, unknown>) => SetMultTuple<unknown, unknown>,
  });

  return { obj: carrier, projections };
};

export const SetSmallProducts: CategoryLimits.HasSmallProductMediators<AnySetObj, AnySetHom> = {
  product: (objects) => {
    const { carrier, projections } = productMetadata.buildProduct(objects);
    return { obj: carrier, projections };
  },
  smallProduct<I>(
    index: IndexedFamilies.SmallIndex<I>,
    family: IndexedFamilies.SmallFamily<I, AnySetObj>,
  ): { obj: AnySetObj; projections: IndexedFamilies.SmallFamily<I, AnySetHom> } {
    if (IndexedFamilies.isFiniteIndex(index) || index.knownFinite === true) {
      const finite: IndexedFamilies.FiniteIndex<I> = IndexedFamilies.ensureFiniteIndex(index);
      const factors = finite.carrier.map((entry) => widenObj(family(entry)));
      const { carrier, projections } = productMetadata.buildProduct(factors);
      const projectionMap = new Map<I, AnySetHom>();

      finite.carrier.forEach((entry, position) => {
        const projection = projections[position];
        if (!projection) {
          throw new Error("Set small product: projection missing for enumerated index");
        }
        projectionMap.set(entry, projection);
      });

      const projectionFamily: IndexedFamilies.SmallFamily<I, AnySetHom> = (entry) => {
        const projection = projectionMap.get(entry);
        if (!projection) {
          throw new Error("Set small product: index outside enumerated carrier");
        }
        return projection;
      };

      return { obj: carrier, projections: projectionFamily };
    }

    return buildInfiniteProduct(index, family);
  },
  tuple(domain, legs, product) {
    const infinite = infiniteProductMetadata.get(product);
    if (infinite) {
      const cache = new Map<unknown, SetMultTuple<unknown, unknown>>();
      return SetCat.hom<unknown, unknown>(domain, product, (value: unknown) => {
        const existing = cache.get(value);
        if (existing) {
          return existing as unknown;
        }

        const assignments = new Map<unknown, unknown>();
        for (const leg of legs) {
          const index = infinite.projectionIndex.get(leg);
          if (index === undefined) {
            throw new Error(
              "Set small product tuple: leg does not correspond to the recorded projections",
            );
          }
          assignments.set(index, leg.map(value));
        }

        const tuple = infinite.registerTuple(assignments);
        cache.set(value, tuple);
        return tuple as unknown;
      });
    }

    return productMetadata.tuple(domain, legs, product);
  },
};

export const SetSmallEqualizers: CategoryLimits.HasSmallEqualizers<AnySetObj, AnySetHom> = {
  smallEqualizer<I>(
    index: IndexedFamilies.SmallIndex<I>,
    parallel: IndexedFamilies.SmallFamily<I, AnySetHom>,
  ): { obj: AnySetObj; equalize: IndexedFamilies.SmallFamily<I, AnySetHom> } {
    const finite: IndexedFamilies.FiniteIndex<I> = IndexedFamilies.ensureFiniteIndex(index);
    if (finite.carrier.length !== 2) {
      throw new Error("Set small equalizer: expected a parallel pair of arrows");
    }

    const [leftKey, rightKey] = finite.carrier;
    if (leftKey === undefined || rightKey === undefined) {
      throw new Error("Set small equalizer: missing entries for the parallel pair");
    }
    const left = parallel(leftKey);
    const right = parallel(rightKey);

    if (left.dom !== right.dom || left.cod !== right.cod) {
      throw new Error("Set small equalizer: parallel morphisms must share domain and codomain");
    }

    const subset: unknown[] = [];
    const codEquals = semanticsAwareEquals(left.cod);
    for (const value of left.dom) {
      const leftImage = left.map(value);
      const rightImage = right.map(value);
      if (codEquals(leftImage, rightImage)) {
        subset.push(value);
      }
    }

    const subsetSemantics = SetCat.createSubsetSemantics(left.dom as SetObj<unknown>, subset, {
      tag: "SetSmallEqualizers.equalizer",
    });
    const equalizerObj = widenObj(
      SetCat.obj(subset, {
        semantics: subsetSemantics,
      }),
    );
    const inclusion = widenHom(SetCat.hom(equalizerObj, left.dom, (value: unknown) => value));
    const equalizeFamily: IndexedFamilies.SmallFamily<I, AnySetHom> = () => inclusion;

    return { obj: equalizerObj, equalize: equalizeFamily };
  },
};

export const equalSetHom = <A, B>(left: SetHom<A, B>, right: SetHom<A, B>): boolean => {
  if (left.dom !== right.dom || left.cod !== right.cod) {
    return false;
  }

  const codEquals = semanticsAwareEquals(left.cod as AnySetObj);

  for (const value of left.dom) {
    const leftImage = left.map(value);
    const rightImage = right.map(value);
    if (!codEquals(leftImage, rightImage)) {
      return false;
    }
  }

  return true;
};

export const factorThroughSetEqualizer: CategoryLimits.EqualizerFactorizer<AnySetHom> = ({
  left,
  right,
  inclusion,
  fork,
}) => {
  const viaLeft = SetCat.compose(left, fork);
  const viaRight = SetCat.compose(right, fork);

  if (!equalSetHom(viaLeft, viaRight)) {
    return {
      factored: false,
      reason: "Set small limit: supplied cone does not equalize the canonical parallel pair",
    };
  }

  const apex = inclusion.dom;
  const apexHas = semanticsAwareHas(apex as AnySetObj);
  const mediator = SetCat.hom(fork.dom, apex, (value) => {
    const image = fork.map(value);
    if (!apexHas(image)) {
      throw new Error("Set small limit: fork does not land in the equalizing subset");
    }
    return image;
  });

  return { factored: true, mediator };
};

export const SetLimitBase: CategoryLimits.HasSmallProducts<AnySetObj, AnySetHom> &
  CategoryLimits.HasSmallEqualizers<AnySetObj, AnySetHom> &
  Category<AnySetObj, AnySetHom> &
  ArrowFamilies.HasDomCod<AnySetObj, AnySetHom> = {
    id: (object) => widenHom(SetCat.id(object)),
    compose: (g, f) => widenHom(SetCat.compose(g, f)),
    dom: (morphism) => widenObj(morphism.dom),
    cod: (morphism) => widenObj(morphism.cod),
    smallProduct: (...args) => {
      if (!SetSmallProducts.smallProduct) {
        throw new Error("Set small limit: small product witness is unavailable");
      }
      return SetSmallProducts.smallProduct(...args);
    },
    smallEqualizer: (...args) => SetSmallEqualizers.smallEqualizer(...args),
  };

export type { AnySetHom as SetSmallHom, AnySetObj as SetSmallObj };
