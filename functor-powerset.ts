import { Dual } from "./dual-cat";
import {
  constructContravariantFunctorWithWitness,
  contravariantToOppositeFunctor,
  type ContravariantFunctorWithWitness,
} from "./contravariant";
import {
  constructFunctorWithWitness,
  identityFunctorWithWitness,
  type Functor,
  type FunctorCheckSamples,
  type FunctorWithWitness,
} from "./functor";
import {
  constructNaturalTransformationWithWitness,
  type NaturalTransformationWithWitness,
} from "./natural-transformation";
import {
  SetCat,
  isLazySet,
  type AnySet,
  type SetHom,
  type SetObj,
} from "./set-cat";
import { setSimpleCategory } from "./set-simple-category";
import { SetLaws } from "./set-laws";

type PowersetObject<A> = SetObj<AnySet<A>>;

type UnknownSetObj = SetObj<unknown>;
type UnknownSetHom = SetHom<unknown, unknown>;
type UnknownSubset = AnySet<unknown>;

type PowerArrow = SetHom<unknown, unknown>;

type PowerFunctor = Functor<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow>;

const FINITE_ENUMERATION_THRESHOLD = 12;
const SAMPLE_SINGLETON_LIMIT = 4;

const powersetCache = new WeakMap<UnknownSetObj, PowersetObject<unknown>>();

const isSubsetOf = <A>(base: SetObj<A>, candidate: AnySet<A>): boolean => {
  if (candidate === undefined || candidate === null) {
    return false;
  }
  if (!(candidate instanceof Set) && !isLazySet(candidate)) {
    return false;
  }
  for (const value of candidate) {
    if (!base.has(value)) {
      return false;
    }
  }
  return true;
};

const sampleSubsetIterator = <A>(base: SetObj<A>): IterableIterator<AnySet<A>> => {
  const samples: AnySet<A>[] = [];
  samples.push(new Set<A>() as AnySet<A>);
  let count = 0;
  for (const value of base) {
    if (count >= SAMPLE_SINGLETON_LIMIT) {
      break;
    }
    const singleton = new Set<A>();
    singleton.add(value);
    samples.push(singleton as AnySet<A>);
    count += 1;
  }
  if (count > 0) {
    const snapshot = new Set<A>();
    let seen = 0;
    for (const value of base) {
      snapshot.add(value);
      seen += 1;
      if (seen >= count) {
        break;
      }
    }
    samples.push(snapshot as AnySet<A>);
  }
  return (function* iterate(): IterableIterator<AnySet<A>> {
    for (const subset of samples) {
      yield subset;
    }
  })();
};

const describeBaseTag = (base: SetObj<unknown>): string => {
  const tagged = base as { readonly tag?: string };
  if (typeof tagged.tag === "string" && tagged.tag.length > 0) {
    return tagged.tag;
  }
  return "Set";
};

const powersetObjectFor = <A>(base: SetObj<A>): PowersetObject<A> => {
  const cached = powersetCache.get(base as UnknownSetObj);
  if (cached) {
    return cached as PowersetObject<A>;
  }

  const cardinality = SetCat.knownFiniteCardinality(base);
  const useFiniteEnumeration =
    cardinality !== undefined && cardinality <= FINITE_ENUMERATION_THRESHOLD;
  const iterate = useFiniteEnumeration
    ? (() => {
        const evidence = SetLaws.powerSetEvidence(base as AnySet<A>);
        const subsets = evidence.subsets.map((entry) => entry.subset as AnySet<A>);
        return (function* enumerate(): IterableIterator<AnySet<A>> {
          for (const subset of subsets) {
            yield subset;
          }
        })();
      })
    : (() => sampleSubsetIterator(base));

  const object = SetCat.lazyObj<AnySet<A>>({
    iterate,
    has: (candidate: AnySet<A>) => isSubsetOf(base, candidate),
    ...(useFiniteEnumeration && cardinality !== undefined
      ? { cardinality: Math.pow(2, cardinality) }
      : {}),
    tag: `P(${describeBaseTag(base as UnknownSetObj)})`,
  });

  powersetCache.set(base as UnknownSetObj, object as PowersetObject<unknown>);
  return object as PowersetObject<A>;
};

const assertSubset = <A>(base: SetObj<A>, subset: AnySet<A>, context: string): void => {
  if (!isSubsetOf(base, subset)) {
    throw new Error(`${context}: candidate subset does not lie inside the base set.`);
  }
};

const makeDirectImage = <A, B>(arrow: SetHom<A, B>) => {
  const base = arrow.dom;
  const codomain = arrow.cod;
  return (subset: AnySet<A>): SetObj<B> => {
    assertSubset(base, subset, "powerset direct image");
    const image = new Set<B>();
    for (const value of subset) {
      if (!base.has(value)) {
        continue;
      }
      const mapped = arrow.map(value);
      if (!codomain.has(mapped)) {
        throw new Error("powerset direct image: arrow image left the declared codomain.");
      }
      image.add(mapped);
    }
    return SetCat.obj(image);
  };
};

const makeInverseImage = <A, B>(arrow: SetHom<A, B>) => {
  const base = arrow.dom;
  const codomain = arrow.cod;
  return (subset: AnySet<B>): SetObj<A> => {
    assertSubset(codomain, subset, "powerset inverse image");
    const result = new Set<A>();
    for (const value of base) {
      const image = arrow.map(value);
      if (subset.has(image)) {
        result.add(value);
      }
    }
    return SetCat.obj(result);
  };
};

const defaultSamples = (): FunctorCheckSamples<UnknownSetObj, UnknownSetHom> => {
  const numbers = SetCat.obj<number>([0, 1, 2]);
  const booleans = SetCat.obj<boolean>([false, true]);
  const strings = SetCat.obj<string>(["a", "b", "c"]);

  const rotate = SetCat.hom(numbers, numbers, (value: number) => (value + 1) % 3) as UnknownSetHom;
  const parity = SetCat.hom(numbers, booleans, (value: number) => value % 2 === 0) as UnknownSetHom;
  const includeA = SetCat.hom(strings, booleans, (value: string) => value === "a") as UnknownSetHom;
  const forget = SetCat.hom(strings, numbers, (value: string) => value.length % 3) as UnknownSetHom;

  const arrows: UnknownSetHom[] = [rotate, parity, includeA, forget];
  const composablePairs = arrows.flatMap((f) =>
    arrows
      .filter((g) => Object.is((f as SetHom<unknown, unknown>).cod, (g as SetHom<unknown, unknown>).dom))
      .map((g) => ({ f, g })),
  );

  return {
    objects: [numbers, booleans, strings] as ReadonlyArray<UnknownSetObj>,
    arrows,
    composablePairs,
  };
};

const buildPowersetFunctor = (
  samples: FunctorCheckSamples<UnknownSetObj, UnknownSetHom>,
  metadata?: ReadonlyArray<string>,
): FunctorWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow> => {
  const functor: PowerFunctor = {
    F0: (object) => powersetObjectFor(object),
    F1: (arrow) => {
      const direct = makeDirectImage(arrow as SetHom<unknown, unknown>);
      const domain = powersetObjectFor(arrow.dom);
      const codomain = powersetObjectFor(arrow.cod);
      return SetCat.hom(
        domain as PowersetObject<unknown>,
        codomain as PowersetObject<unknown>,
        (subset) => direct(subset as UnknownSubset) as UnknownSubset,
      ) as PowerArrow;
    },
  };

  const description =
    metadata ?? ["Powerset functor maps each set to its subsets and functions to direct-image maps."];

  return constructFunctorWithWitness(
    setSimpleCategory,
    setSimpleCategory,
    functor,
    samples,
    description,
  );
};

const buildInverseContravariant = (
  samples: FunctorCheckSamples<UnknownSetObj, UnknownSetHom>,
  metadata?: ReadonlyArray<string>,
): ContravariantFunctorWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow> => {
  const functor: PowerFunctor = {
    F0: (object) => powersetObjectFor(object),
    F1: (arrow) => {
      const inverse = makeInverseImage(arrow as SetHom<unknown, unknown>);
      const domain = powersetObjectFor(arrow.cod);
      const codomain = powersetObjectFor(arrow.dom);
      return SetCat.hom(
        domain as PowersetObject<unknown>,
        codomain as PowersetObject<unknown>,
        (subset) => inverse(subset as UnknownSubset) as UnknownSubset,
      ) as PowerArrow;
    },
  };

  const description =
    metadata ?? ["Inverse-image contravariant functor maps functions to pullback maps on subsets."];

  return constructContravariantFunctorWithWitness(
    setSimpleCategory,
    setSimpleCategory,
    functor,
    samples,
    description,
  );
};

const buildOppositeDirectImage = (
  samples: FunctorCheckSamples<UnknownSetObj, UnknownSetHom>,
): FunctorWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow> => {
  const domain = Dual(setSimpleCategory);

  const functor: PowerFunctor = {
    F0: (object) => powersetObjectFor(object),
    F1: (arrow) => {
      const inverse = makeInverseImage(arrow as SetHom<unknown, unknown>);
      const domainObject = powersetObjectFor((arrow as SetHom<unknown, unknown>).cod);
      const codomainObject = powersetObjectFor((arrow as SetHom<unknown, unknown>).dom);
      return SetCat.hom(
        domainObject as PowersetObject<unknown>,
        codomainObject as PowersetObject<unknown>,
        (subset) => inverse(subset as UnknownSubset) as UnknownSubset,
      ) as PowerArrow;
    },
  };

  return constructFunctorWithWitness(domain, setSimpleCategory, functor, samples, [
    "Powerset functor precomposed with (−)^op matches inverse images on arrows.",
  ]);
};

const buildSingletonEmbedding = (
  powerset: FunctorWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow>,
  samples: FunctorCheckSamples<UnknownSetObj, UnknownSetHom>,
): NaturalTransformationWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow> => {
  const identity = identityFunctorWithWitness(setSimpleCategory, samples);

  const metadata = [
    "Singleton embedding X → P(X) is natural and witnesses the unit of the direct-image/inverse-image adjunction on finite sets.",
  ];

  return constructNaturalTransformationWithWitness(
    identity,
    powerset,
    (object) => {
      const codomain = powerset.witness.functor.F0(object) as PowersetObject<unknown>;
      return SetCat.hom(
        object,
        codomain as PowersetObject<unknown>,
        (value: unknown) => {
          const singleton = new Set<unknown>();
          singleton.add(value);
          return singleton as UnknownSubset;
        },
      ) as PowerArrow;
    },
    {
      samples: {
        ...(samples.objects ? { objects: samples.objects } : {}),
        ...(samples.arrows ? { arrows: samples.arrows } : {}),
      },
      metadata,
    },
  );
};

const buildOppositeComparison = (
  oppositeFromDirect: FunctorWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow>,
  oppositeFromInverse: FunctorWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow>,
): NaturalTransformationWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow> => {
  const metadata = [
    "Direct-image functor on Set^op coincides with the contravariant inverse-image functor; comparison components are identities.",
  ];

  return constructNaturalTransformationWithWitness(
    oppositeFromDirect,
    oppositeFromInverse,
    (object) => {
      const carrier = powersetObjectFor(object) as PowersetObject<unknown>;
      return SetCat.hom(
        carrier,
        carrier,
        (subset) => subset as UnknownSubset,
      ) as PowerArrow;
    },
    { metadata },
  );
};

export interface PowersetFunctorOptions {
  readonly samples?: FunctorCheckSamples<UnknownSetObj, UnknownSetHom>;
  readonly metadata?: ReadonlyArray<string>;
  readonly inverseMetadata?: ReadonlyArray<string>;
}

export interface PowersetFunctorToolkit {
  readonly functor: FunctorWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow>;
  readonly inverseImage: ContravariantFunctorWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow>;
  readonly inverseImageOpposite: FunctorWithWitness<UnknownSetObj, UnknownSetHom, UnknownSetObj, PowerArrow>;
  readonly directOppositeComparison: NaturalTransformationWithWitness<
    UnknownSetObj,
    UnknownSetHom,
    UnknownSetObj,
    PowerArrow
  >;
  readonly singletonEmbedding: NaturalTransformationWithWitness<
    UnknownSetObj,
    UnknownSetHom,
    UnknownSetObj,
    PowerArrow
  >;
  readonly objectOf: <A>(base: SetObj<A>) => PowersetObject<A>;
  readonly directImageOf: <A, B>(arrow: SetHom<A, B>, subset: AnySet<A>) => SetObj<B>;
  readonly inverseImageOf: <A, B>(arrow: SetHom<A, B>, subset: AnySet<B>) => SetObj<A>;
}

export const powersetFunctorWithWitness = (
  options: PowersetFunctorOptions = {},
): PowersetFunctorToolkit => {
  const samples = options.samples ?? defaultSamples();
  const functor = buildPowersetFunctor(samples, options.metadata);
  const inverseImage = buildInverseContravariant(samples, options.inverseMetadata);
  const inverseOpposite = contravariantToOppositeFunctor(inverseImage);
  const oppositeFromDirect = buildOppositeDirectImage(samples);
  const singletonEmbedding = buildSingletonEmbedding(functor, samples);
  const comparison = buildOppositeComparison(oppositeFromDirect, inverseOpposite);

  return {
    functor,
    inverseImage,
    inverseImageOpposite: inverseOpposite,
    directOppositeComparison: comparison,
    singletonEmbedding,
    objectOf: powersetObjectFor,
    directImageOf: (arrow, subset) => makeDirectImage(arrow)(subset),
    inverseImageOf: (arrow, subset) => makeInverseImage(arrow)(subset),
  };
};

export const PowersetHelpers = {
  objectOf: powersetObjectFor,
  directImageOf: <A, B>(arrow: SetHom<A, B>, subset: AnySet<A>): SetObj<B> => makeDirectImage(arrow)(subset),
  inverseImageOf: <A, B>(arrow: SetHom<A, B>, subset: AnySet<B>): SetObj<A> => makeInverseImage(arrow)(subset),
};

export type { PowersetObject };
