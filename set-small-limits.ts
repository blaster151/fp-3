import { CategoryLimits } from "./stdlib/category-limits";
import { ArrowFamilies } from "./stdlib/arrow-families";
import { IndexedFamilies } from "./stdlib/indexed-families";
import type { Category } from "./stdlib/category";
import { SetCat, type SetHom, type SetObj } from "./set-cat";

type AnySetObj = SetObj<unknown>;
type AnySetHom = SetHom<unknown, unknown>;

type ProductMetadata = {
  readonly arity: number;
  readonly lookup: Map<string, ReadonlyArray<unknown>>;
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

const buildKey = (coordinates: ReadonlyArray<unknown>): string => JSON.stringify(coordinates);

const createProductMetadata = (): { buildProduct: ProductBuilder; tuple: TupleBuilder } => {
  const metadata = new WeakMap<AnySetObj, ProductMetadata>();

  const buildProduct: ProductBuilder = (objects) => {
    const tuples: Array<ReadonlyArray<unknown>> = [];
    const lookup = new Map<string, ReadonlyArray<unknown>>();

    const build = (prefix: unknown[], index: number) => {
      if (index === objects.length) {
        const tuple = Object.freeze(prefix.slice()) as ReadonlyArray<unknown>;
        tuples.push(tuple);
        lookup.set(buildKey(tuple), tuple);
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
    const rawCarrier = SetCat.obj(tuples);
    const carrier = widenObj(rawCarrier);
    metadata.set(carrier, { arity: objects.length, lookup });

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
    if (legs.length !== data.arity) {
      throw new Error("Set small product tuple: leg count does not match product arity");
    }

    return SetCat.hom<unknown, unknown>(domain, product, (value: unknown) => {
      const coordinates = legs.map((leg) => leg.map(value));
      const key = buildKey(coordinates);
      const tupleValue = data.lookup.get(key);
      if (!tupleValue) {
        throw new Error("Set small product tuple: legs do not land in the recorded product tuple");
      }
      return tupleValue as unknown;
    });
  };

  return { buildProduct, tuple };
};

const productMetadata = createProductMetadata();

export const SetSmallProducts: CategoryLimits.HasSmallProductMediators<AnySetObj, AnySetHom> = {
  product: (objects) => {
    const { carrier, projections } = productMetadata.buildProduct(objects);
    return { obj: carrier, projections };
  },
  smallProduct<I>(index, family) {
    const finite = IndexedFamilies.ensureFiniteIndex(index);
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
  },
  tuple(domain, legs, product) {
    return productMetadata.tuple(domain, legs, product);
  },
};

export const SetSmallEqualizers: CategoryLimits.HasSmallEqualizers<AnySetObj, AnySetHom> = {
  smallEqualizer<I>(index, parallel) {
    const finite = IndexedFamilies.ensureFiniteIndex(index);
    if (finite.carrier.length !== 2) {
      throw new Error("Set small equalizer: expected a parallel pair of arrows");
    }

    const [leftKey, rightKey] = finite.carrier;
    const left = parallel(leftKey!);
    const right = parallel(rightKey!);

    if (left.dom !== right.dom || left.cod !== right.cod) {
      throw new Error("Set small equalizer: parallel morphisms must share domain and codomain");
    }

    const subset: unknown[] = [];
    for (const value of left.dom) {
      const leftImage = left.map(value);
      const rightImage = right.map(value);
      if (Object.is(leftImage, rightImage)) {
        subset.push(value);
      }
    }

    const equalizerObj = widenObj(SetCat.obj(subset));
    const inclusion = widenHom(SetCat.hom(equalizerObj, left.dom, (value: unknown) => value));
    const equalizeFamily: IndexedFamilies.SmallFamily<I, AnySetHom> = () => inclusion;

    return { obj: equalizerObj, equalize: equalizeFamily };
  },
};

export const equalSetHom = <A, B>(left: SetHom<A, B>, right: SetHom<A, B>): boolean => {
  if (left.dom !== right.dom || left.cod !== right.cod) {
    return false;
  }

  for (const value of left.dom) {
    if (!right.dom.has(value)) {
      return false;
    }
    const leftImage = left.map(value);
    const rightImage = right.map(value);
    if (!Object.is(leftImage, rightImage)) {
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
  const mediator = SetCat.hom(fork.dom, apex, (value) => {
    const image = fork.map(value);
    if (!apex.has(image)) {
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
