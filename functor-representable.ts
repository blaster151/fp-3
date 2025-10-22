import type { FiniteCategory } from "./finite-cat";
import {
  constructContravariantFunctorWithWitness,
  contravariantToOppositeFunctor,
  type ContravariantFunctorWithWitness,
} from "./contravariant";
import type {
  FunctorCheckSamples,
  FunctorComposablePair,
  FunctorWithWitness,
} from "./functor";
import { constructFunctorWithWitness } from "./functor";
import type { SimpleCat } from "./simple-cat";
import {
  constructNaturalTransformationWithWitness,
  functorCategory,
  type NaturalTransformationConstructionOptions,
  type NaturalTransformationWithWitness,
} from "./natural-transformation";
import {
  SetCat,
  type SetHom,
  type SetObj,
} from "./set-cat";
import { setSimpleCategory } from "./set-simple-category";

type RepresentableSetSimpleCategory<Arr> = SimpleCat<
  SetObj<Arr>,
  SetHom<Arr, Arr>
> & {
  readonly eq: (left: SetHom<Arr, Arr>, right: SetHom<Arr, Arr>) => boolean;
};

const setSimple = <Arr>(): RepresentableSetSimpleCategory<Arr> =>
  setSimpleCategory as RepresentableSetSimpleCategory<Arr>;

const representableEquality = <Arr>() => {
  const eq = setSimple<Arr>().eq;
  return (left: SetHom<unknown, unknown>, right: SetHom<unknown, unknown>) =>
    eq(left as SetHom<Arr, Arr>, right as SetHom<Arr, Arr>);
};

const defaultFunctorSamples = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): FunctorCheckSamples<Obj, Arr> => {
  const { objects, arrows } = category;
  const composablePairs: FunctorComposablePair<Arr>[] = [];
  for (const f of arrows) {
    for (const g of arrows) {
      if (Object.is(category.dst(f), category.src(g))) {
        composablePairs.push({ f, g });
      }
    }
  }
  return { objects, arrows, composablePairs };
};

interface InternalHomSetEntry<Arr> {
  readonly object: SetObj<Arr>;
  readonly arrows: Arr[];
  initialized: boolean;
}

export interface RepresentableHomSetEntry<Arr> {
  readonly object: SetObj<Arr>;
  readonly arrows: ReadonlyArray<Arr>;
}

export interface RepresentableHomSetRegistry<Obj, Arr> {
  readonly getHomSet: (source: Obj, target: Obj) => RepresentableHomSetEntry<Arr>;
  readonly canonicalize: (source: Obj, target: Obj, arrow: Arr) => Arr;
}

const pushUnique = <Arr>(
  arrows: Arr[],
  arrow: Arr,
  eq: (left: Arr, right: Arr) => boolean,
): Arr => {
  const existing = arrows.find((candidate) => eq(candidate, arrow));
  if (existing) {
    return existing;
  }
  arrows.push(arrow);
  return arrow;
};

export const createRepresentableHomSetRegistry = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
): RepresentableHomSetRegistry<Obj, Arr> => {
  const cache = new Map<Obj, Map<Obj, InternalHomSetEntry<Arr>>>();

  const ensureEntry = (source: Obj, target: Obj): InternalHomSetEntry<Arr> => {
    let targetMap = cache.get(source);
    if (!targetMap) {
      targetMap = new Map<Obj, InternalHomSetEntry<Arr>>();
      cache.set(source, targetMap);
    }
    let entry = targetMap.get(target);
    if (!entry) {
      entry = {
        object: SetCat.obj<Arr>([]) as SetObj<Arr>,
        arrows: [],
        initialized: false,
      };
      targetMap.set(target, entry);
    }
    if (!entry.initialized) {
      for (const arrow of category.arrows) {
        if (Object.is(category.src(arrow), source) && Object.is(category.dst(arrow), target)) {
          const canonical = pushUnique(entry.arrows, arrow, category.eq);
          (entry.object as Set<Arr>).add(canonical);
        }
      }
      if (Object.is(source, target)) {
        const id = category.id(source);
        const canonical = pushUnique(entry.arrows, id, category.eq);
        (entry.object as Set<Arr>).add(canonical);
      }
      entry.initialized = true;
    }
    return entry;
  };

  const getHomSet = (source: Obj, target: Obj): RepresentableHomSetEntry<Arr> => {
    const entry = ensureEntry(source, target);
    return { object: entry.object, arrows: entry.arrows };
  };

  const canonicalize = (source: Obj, target: Obj, arrow: Arr): Arr => {
    const entry = ensureEntry(source, target);
    const canonical = pushUnique(entry.arrows, arrow, category.eq);
    (entry.object as Set<Arr>).add(canonical);
    return canonical;
  };

  return { getHomSet, canonicalize };
};

export interface RepresentableFunctorOptions<Obj, Arr> {
  readonly samples?: FunctorCheckSamples<Obj, Arr>;
  readonly metadata?: ReadonlyArray<string>;
  readonly registry?: RepresentableHomSetRegistry<Obj, Arr>;
}

export interface CovariantRepresentableFunctorToolkit<Obj, Arr> {
  readonly representing: Obj;
  readonly functor: FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>;
  readonly registry: RepresentableHomSetRegistry<Obj, Arr>;
  readonly metadata: ReadonlyArray<string>;
}

export const covariantRepresentableFunctorWithWitness = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  representing: Obj,
  options: RepresentableFunctorOptions<Obj, Arr> = {},
): CovariantRepresentableFunctorToolkit<Obj, Arr> => {
  const registry = options.registry ?? createRepresentableHomSetRegistry(category);
  const samples = options.samples ?? defaultFunctorSamples(category);
  const metadata =
    options.metadata ??
    [
      `Hom(${String(representing)}, -) representable functor records arrows out of ${String(representing)}.`,
    ];

  const functor = constructFunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>(
    category,
    setSimpleCategory as SimpleCat<SetObj<unknown>, SetHom<unknown, unknown>>,
    {
      F0: (object) => registry.getHomSet(representing, object).object as SetObj<unknown>,
      F1: (arrow) => {
        const domain = registry.getHomSet(representing, category.src(arrow)).object;
        const codomain = registry.getHomSet(representing, category.dst(arrow)).object;
        return SetCat.hom<Arr, Arr>(
          domain,
          codomain,
          (morphism) =>
            registry.canonicalize(
              representing,
              category.dst(arrow),
              category.compose(arrow, morphism),
            ),
        ) as SetHom<unknown, unknown>;
      },
    },
    samples,
    metadata,
  );

  return { representing, functor, registry, metadata };
};

export interface ContravariantRepresentableFunctorToolkit<Obj, Arr> {
  readonly representing: Obj;
  readonly functor: ContravariantFunctorWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly opposite: FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>;
  readonly registry: RepresentableHomSetRegistry<Obj, Arr>;
  readonly metadata: ReadonlyArray<string>;
}

export const contravariantRepresentableFunctorWithWitness = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  representing: Obj,
  options: RepresentableFunctorOptions<Obj, Arr> = {},
): ContravariantRepresentableFunctorToolkit<Obj, Arr> => {
  const registry = options.registry ?? createRepresentableHomSetRegistry(category);
  const samples = options.samples ?? defaultFunctorSamples(category);
  const metadata =
    options.metadata ??
    [
      `Hom(-, ${String(representing)}) contravariant representable functor records arrows into ${String(
        representing,
      )}.`,
    ];

  const functor = constructContravariantFunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>(
    category,
    setSimpleCategory as SimpleCat<SetObj<unknown>, SetHom<unknown, unknown>>,
    {
      F0: (object) => registry.getHomSet(object, representing).object as SetObj<unknown>,
      F1: (arrow) => {
        const domain = registry.getHomSet(category.dst(arrow), representing).object;
        const codomain = registry.getHomSet(category.src(arrow), representing).object;
        return SetCat.hom<Arr, Arr>(
          domain,
          codomain,
          (morphism) =>
            registry.canonicalize(
              category.src(arrow),
              representing,
              category.compose(morphism, arrow),
            ),
        ) as SetHom<unknown, unknown>;
      },
    },
    samples,
    metadata,
  );

  const opposite = contravariantToOppositeFunctor(functor);

  return { representing, functor, opposite, registry, metadata };
};

export interface YonedaEmbeddingOptions<Obj, Arr> {
  readonly samples?: FunctorCheckSamples<Obj, Arr>;
  readonly registry?: RepresentableHomSetRegistry<Obj, Arr>;
  readonly naturality?: NaturalTransformationConstructionOptions<Obj, Arr, SetHom<unknown, unknown>>;
  readonly metadata?: ReadonlyArray<string>;
}

export interface YonedaEmbeddingToolkit<Obj, Arr> {
  readonly embedding: FunctorWithWitness<
    Obj,
    Arr,
    FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
    NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>
  >;
  readonly registry: RepresentableHomSetRegistry<Obj, Arr>;
  readonly presheafCategory: SimpleCat<
    FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
    NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>
  >;
}

export const yonedaEmbeddingWithWitness = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  options: YonedaEmbeddingOptions<Obj, Arr> = {},
): YonedaEmbeddingToolkit<Obj, Arr> => {
  const registry = options.registry ?? createRepresentableHomSetRegistry(category);
  const samples = options.samples ?? defaultFunctorSamples(category);
  const naturalityOptions: NaturalTransformationConstructionOptions<Obj, Arr, SetHom<unknown, unknown>> = {
    equalMor: representableEquality<Arr>(),
    ...options.naturality,
  };
  const presheafCategory = functorCategory<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>(
    naturalityOptions,
  );

  const contravariantCache = new Map<Obj, ContravariantRepresentableFunctorToolkit<Obj, Arr>>();

  const contravariantFor = (object: Obj): ContravariantRepresentableFunctorToolkit<Obj, Arr> => {
    const cached = contravariantCache.get(object);
    if (cached) {
      return cached;
    }
    const toolkit = contravariantRepresentableFunctorWithWitness(category, object, {
      samples,
      registry,
    });
    contravariantCache.set(object, toolkit);
    return toolkit;
  };

  const metadata =
    options.metadata ?? ["Yoneda embedding sends each object to its contravariant representable presheaf."];

  const embedding = constructFunctorWithWitness<
    Obj,
    Arr,
    FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
    NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>
  >(
    category,
    presheafCategory,
    {
      F0: (object) => contravariantFor(object).opposite,
      F1: (arrow) => {
        const sourceToolkit = contravariantFor(category.src(arrow));
        const targetToolkit = contravariantFor(category.dst(arrow));
        return constructNaturalTransformationWithWitness(
          sourceToolkit.opposite,
          targetToolkit.opposite,
          (object) => {
            const domain = registry.getHomSet(object, category.src(arrow)).object;
            const codomain = registry.getHomSet(object, category.dst(arrow)).object;
            return SetCat.hom<Arr, Arr>(
              domain,
              codomain,
              (morphism) =>
                registry.canonicalize(
                  object,
                  category.dst(arrow),
                  category.compose(arrow, morphism),
                ),
            ) as SetHom<unknown, unknown>;
          },
          naturalityOptions,
        );
      },
    },
    samples,
    metadata,
  );

  return { embedding, registry, presheafCategory };
};

export interface YonedaLemmaOptions<Obj, Arr> {
  readonly samples?: FunctorCheckSamples<Obj, Arr>;
  readonly registry?: RepresentableHomSetRegistry<Obj, Arr>;
  readonly naturality?: NaturalTransformationConstructionOptions<Obj, Arr, SetHom<unknown, unknown>>;
  readonly elementSamples?: ReadonlyArray<unknown>;
  readonly elementEquality?: (left: unknown, right: unknown) => boolean;
  readonly metadata?: ReadonlyArray<string>;
}

export interface YonedaElementRoundTrip {
  readonly element: unknown;
  readonly recovered: unknown;
  readonly equal: boolean;
}

export interface YonedaTransformationRoundTrip<Obj, Arr> {
  readonly naturalTransformation: NaturalTransformationWithWitness<
    Obj,
    Arr,
    SetObj<unknown>,
    SetHom<unknown, unknown>
  >;
  readonly equal: boolean;
  readonly componentFailures: ReadonlyArray<{ readonly object: Obj; readonly reason: string }>;
}

export interface YonedaLemmaReport<Obj, Arr> {
  readonly elementRoundTrips: ReadonlyArray<YonedaElementRoundTrip>;
  readonly transformationRoundTrips: ReadonlyArray<YonedaTransformationRoundTrip<Obj, Arr>>;
  readonly holds: boolean;
  readonly details: ReadonlyArray<string>;
}

export interface YonedaLemmaWitness<Obj, Arr> {
  readonly representing: Obj;
  readonly representable: CovariantRepresentableFunctorToolkit<Obj, Arr>;
  readonly functor: FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>;
  readonly toNaturalTransformation: (
    element: unknown,
  ) => NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>;
  readonly toElement: (
    transformation: NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
  ) => unknown;
  readonly report: YonedaLemmaReport<Obj, Arr>;
  readonly metadata: ReadonlyArray<string>;
}

const defaultElementSamples = (carrier: SetObj<unknown>, limit = 4): ReadonlyArray<unknown> => {
  const samples: unknown[] = [];
  let count = 0;
  for (const value of carrier) {
    samples.push(value);
    count += 1;
    if (count >= limit) {
      break;
    }
  }
  return samples;
};

export const yonedaLemmaWitness = <Obj, Arr>(
  category: FiniteCategory<Obj, Arr>,
  representing: Obj,
  functor: FunctorWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
  options: YonedaLemmaOptions<Obj, Arr> = {},
): YonedaLemmaWitness<Obj, Arr> => {
  const registry = options.registry ?? createRepresentableHomSetRegistry(category);
  const samples = options.samples ?? defaultFunctorSamples(category);
  const naturalityOptions: NaturalTransformationConstructionOptions<Obj, Arr, SetHom<unknown, unknown>> = {
    equalMor: representableEquality<Arr>(),
    ...options.naturality,
  };
  const representable = covariantRepresentableFunctorWithWitness(category, representing, {
    samples,
    registry,
  });

  const identityArrow = registry.canonicalize(representing, representing, category.id(representing));
  const elementEquality = options.elementEquality ?? Object.is;

  const toNaturalTransformation = (
    element: unknown,
  ): NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>> =>
    constructNaturalTransformationWithWitness(
      representable.functor,
      functor,
      (object) => {
        const domain = registry.getHomSet(representing, object).object as SetObj<Arr>;
        const codomain = functor.functor.F0(object);
        return SetCat.hom<Arr, unknown>(
          domain,
          codomain,
          (morphism) => functor.functor.F1(morphism).map(element),
        ) as SetHom<unknown, unknown>;
      },
      naturalityOptions,
    );

  const toElement = (
    transformation: NaturalTransformationWithWitness<Obj, Arr, SetObj<unknown>, SetHom<unknown, unknown>>,
  ): unknown => {
    const component = transformation.transformation.component(representing);
    return component.map(identityArrow);
  };

  const carrier = functor.functor.F0(representing);
  const elementSamples = options.elementSamples ?? defaultElementSamples(carrier);

  const elementRoundTrips: YonedaElementRoundTrip[] = elementSamples.map((element) => {
    const recovered = toElement(toNaturalTransformation(element));
    return { element, recovered, equal: elementEquality(element, recovered) };
  });

  const transformationRoundTrips: YonedaTransformationRoundTrip<Obj, Arr>[] = elementSamples.map(
    (element) => {
      const transformation = toNaturalTransformation(element);
      const recovered = toNaturalTransformation(toElement(transformation));
      const componentFailures: { readonly object: Obj; readonly reason: string }[] = [];
      for (const object of samples.objects ?? []) {
        const original = transformation.transformation.component(object);
        const roundTrip = recovered.transformation.component(object);
        const eq = representableEquality<unknown>();
        if (!eq(original, roundTrip)) {
          componentFailures.push({
            object,
            reason: "Component differed after applying the Yoneda bijection twice.",
          });
        }
      }
      return { naturalTransformation: transformation, equal: componentFailures.length === 0, componentFailures };
    },
  );

  const holds =
    elementRoundTrips.every((entry) => entry.equal) &&
    transformationRoundTrips.every((entry) => entry.equal);

  const details: string[] = [];
  if (holds) {
    details.push(
      `Yoneda lemma conversions agree on ${elementRoundTrips.length} sampled element(s) and ${transformationRoundTrips.length} sampled natural transformation(s).`,
    );
  } else {
    if (elementRoundTrips.some((entry) => !entry.equal)) {
      details.push("Element round-trip failed for at least one sample.");
    }
    if (transformationRoundTrips.some((entry) => !entry.equal)) {
      details.push("Natural transformation round-trip failed for at least one sample.");
    }
  }

  const metadata =
    options.metadata ??
    [
      "Yoneda lemma witnesses the bijection between Nat(Hom(C, -), F) and F(C) with executable conversions.",
    ];

  const report: YonedaLemmaReport<Obj, Arr> = {
    elementRoundTrips,
    transformationRoundTrips,
    holds,
    details,
  };

  return {
    representing,
    representable,
    functor,
    toNaturalTransformation,
    toElement,
    report,
    metadata,
  };
};
