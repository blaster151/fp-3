import type { SetHom, SetObj } from "./set-cat";
import { SetCat } from "./set-cat";

// 🔮 BEGIN_MATH: SemicartesianInfiniteTensorProduct
// 📝 Brief: Capture infinite tensor products in semicartesian symmetric monoidal categories.
// 🏗️ Domain: Category theory / semicartesian symmetric monoidal structure
// 🔗 Integration: Provides reusable witnesses and oracles for infinite cones and their universal property
// 📋 Plan:
//   1. Describe the finite-subset indexing data and cone legs for semicartesian diagrams.
//   2. Expose a product witness interface bundling projections and factorization builders.
//   3. Implement compatibility and universal-property oracles with diagnostic reporting.

export type FiniteSubset<J> = ReadonlyArray<J>;

export interface SemicartesianTensorDiagram<J, Obj, Mor> {
  readonly index: Iterable<J>;
  readonly tensor: (subset: FiniteSubset<J>) => Obj;
  readonly restriction: (larger: FiniteSubset<J>, smaller: FiniteSubset<J>) => Mor;
  readonly compose: (first: Mor, second: Mor) => Mor;
  readonly equal: (a: Mor, b: Mor) => boolean;
  readonly describeSubset?: (subset: FiniteSubset<J>) => string;
  readonly describeMorphism?: (morphism: Mor) => string;
}

export interface SemicartesianCone<J, Obj, Mor> {
  readonly apex: Obj;
  readonly leg: (subset: FiniteSubset<J>) => Mor;
  readonly label?: string;
  readonly mediatorCandidates?: ReadonlyArray<{ morphism: Mor; label?: string }>;
}

export interface SemicartesianFactorization<Mor> {
  readonly mediator: Mor;
  readonly details?: string;
}

export interface SemicartesianProductWitness<J, Obj, Mor> {
  readonly object: Obj;
  readonly diagram: SemicartesianTensorDiagram<J, Obj, Mor>;
  readonly projection: (subset: FiniteSubset<J>) => Mor;
  readonly factor: (cone: SemicartesianCone<J, Obj, Mor>) => SemicartesianFactorization<Mor>;
  readonly label?: string;
}

export interface SubsetRestriction<J> {
  readonly larger: FiniteSubset<J>;
  readonly smaller: FiniteSubset<J>;
  readonly label?: string;
}

const subsetKey = <J>(subset: FiniteSubset<J>): string =>
  subset.map((item) => `${item}`).join(",");

const describeSubset = <J, Obj, Mor>(
  diagram: SemicartesianTensorDiagram<J, Obj, Mor>,
  subset: FiniteSubset<J>,
): string => diagram.describeSubset?.(subset) ?? (subset.length ? subsetKey(subset) : "∅");

const describeMorphism = <J, Obj, Mor>(
  diagram: SemicartesianTensorDiagram<J, Obj, Mor>,
  morphism: Mor,
): string => diagram.describeMorphism?.(morphism) ?? "morphism";

const isSubset = <J>(smaller: FiniteSubset<J>, larger: FiniteSubset<J>): boolean => {
  const lookup = new Set(larger as Iterable<J>);
  for (const item of smaller) {
    if (!lookup.has(item)) return false;
  }
  return true;
};

export interface SemicartesianConeFailure<J> {
  readonly larger: FiniteSubset<J>;
  readonly smaller: FiniteSubset<J>;
  readonly reason: string;
}

export interface SemicartesianConeResult<J> {
  readonly holds: boolean;
  readonly details: string;
  readonly failures: ReadonlyArray<SemicartesianConeFailure<J>>;
}

export function checkSemicartesianProductCone<J, Obj, Mor>(
  product: SemicartesianProductWitness<J, Obj, Mor>,
  restrictions: ReadonlyArray<SubsetRestriction<J>>,
): SemicartesianConeResult<J> {
  const { diagram } = product;
  const failures: Array<SemicartesianConeFailure<J>> = [];

  for (const restriction of restrictions) {
    const { larger, smaller } = restriction;
    if (!isSubset(smaller, larger)) {
      failures.push({
        larger,
        smaller,
        reason: `${describeSubset(diagram, smaller)} is not contained in ${describeSubset(diagram, larger)}.`,
      });
      continue;
    }

    const composed = diagram.compose(product.projection(larger), diagram.restriction(larger, smaller));
    const expected = product.projection(smaller);
    if (!diagram.equal(composed, expected)) {
      failures.push({
        larger,
        smaller,
        reason: `Projection ${describeSubset(diagram, smaller)} failed compatibility through ${describeSubset(diagram, larger)}.`,
      });
    }
  }

  const holds = failures.length === 0;
  const details = holds
    ? `All ${restrictions.length} projection compatibilities succeeded.`
    : `${failures.length} projection compatibility check${failures.length === 1 ? "" : "s"} failed.`;

  return { holds, details, failures };
}

export interface SemicartesianMediatorSummary<J, Mor> {
  readonly coneLabel?: string;
  readonly mediator: Mor;
  readonly details?: string;
  readonly subsets: ReadonlyArray<FiniteSubset<J>>;
}

export interface SemicartesianUniversalFailure<J, Mor> {
  readonly coneLabel?: string;
  readonly subset?: FiniteSubset<J>;
  readonly reason: string;
  readonly witness?: Mor;
}

export interface SemicartesianUniversalResult<J, Mor> {
  readonly holds: boolean;
  readonly details: string;
  readonly mediators: ReadonlyArray<SemicartesianMediatorSummary<J, Mor>>;
  readonly failures: ReadonlyArray<SemicartesianUniversalFailure<J, Mor>>;
}

export function checkSemicartesianUniversalProperty<J, Obj, Mor>(
  product: SemicartesianProductWitness<J, Obj, Mor>,
  cones: ReadonlyArray<SemicartesianCone<J, Obj, Mor>>,
  subsets: ReadonlyArray<FiniteSubset<J>>,
): SemicartesianUniversalResult<J, Mor> {
  const { diagram } = product;
  const failures: Array<SemicartesianUniversalFailure<J, Mor>> = [];
  const mediators: Array<SemicartesianMediatorSummary<J, Mor>> = [];

  for (const cone of cones) {
      let factorization: SemicartesianFactorization<Mor>;
      try {
        factorization = product.factor(cone);
      } catch (error) {
        const failure: SemicartesianUniversalFailure<J, Mor> = {
          ...(cone.label !== undefined ? { coneLabel: cone.label } : {}),
          reason: `Factorization threw: ${(error as Error).message}`,
        };
        failures.push(failure);
        continue;
      }

      const coneLabel = cone.label;
      const mediatorSummary: SemicartesianMediatorSummary<J, Mor> = {
        mediator: factorization.mediator,
        subsets,
        ...(coneLabel !== undefined ? { coneLabel } : {}),
        ...(factorization.details !== undefined ? { details: factorization.details } : {}),
      };
      mediators.push(mediatorSummary);

      for (const subset of subsets) {
        const expected = cone.leg(subset);
        const projected = diagram.compose(factorization.mediator, product.projection(subset));
        if (!diagram.equal(projected, expected)) {
          const failure: SemicartesianUniversalFailure<J, Mor> = {
            ...(coneLabel !== undefined ? { coneLabel } : {}),
            subset,
            reason: `Mediator failed to reproduce leg on ${describeSubset(diagram, subset)}.`,
            witness: projected,
          };
          failures.push(failure);
        }
      }

      if (cone.mediatorCandidates) {
        for (const candidate of cone.mediatorCandidates) {
        let satisfies = true;
        for (const subset of subsets) {
          const candidateProjection = diagram.compose(candidate.morphism, product.projection(subset));
          if (!diagram.equal(candidateProjection, cone.leg(subset))) {
            satisfies = false;
            break;
          }
          }
          if (satisfies && !diagram.equal(candidate.morphism, factorization.mediator)) {
            const failure: SemicartesianUniversalFailure<J, Mor> = {
              ...(coneLabel !== undefined ? { coneLabel } : {}),
              reason: `Candidate mediator ${
                candidate.label ?? describeMorphism(diagram, candidate.morphism)
              } violates uniqueness.`,
              witness: candidate.morphism,
            };
            failures.push(failure);
          }
        }
      }
  }

  const holds = failures.length === 0;
  const details = holds
    ? `All ${cones.length} cones factored uniquely across ${subsets.length} subset tests.`
    : `${failures.length} universal-property check${failures.length === 1 ? "" : "s"} failed.`;

  return { holds, details, mediators, failures };
}

export interface SetSemicartesianCoordinate<X> {
  readonly eq: (left: X, right: X) => boolean;
  readonly show: (value: X) => string;
  readonly samples?: Iterable<X>;
  readonly label?: string;
}

export interface SetSemicartesianFamily<J, X> {
  readonly index: Iterable<J>;
  readonly coordinate: (index: J) => SetSemicartesianCoordinate<X>;
}

export interface SetSemicartesianWitnessOptions<J, X> {
  readonly describeIndex?: (index: J) => string;
  readonly fallbackSamples?: (index: J, coordinate: SetSemicartesianCoordinate<X>) => Iterable<X>;
  readonly productLabel?: string;
}

type SetTuple<J, X> = ReadonlyMap<J, X>;

interface SectionMetadata<J, X> {
  readonly subset: FiniteSubset<J>;
  readonly object: SetObj<SetTuple<J, X>>;
  readonly eq: (left: SetTuple<J, X>, right: SetTuple<J, X>) => boolean;
  readonly show: (value: SetTuple<J, X>) => string;
  readonly label: string;
}

const setTupleKey = <J, X>(
  subset: FiniteSubset<J>,
  describeIndex: (index: J) => string,
  showCoordinate: (index: J, value: X) => string,
  tuple: ReadonlyMap<J, X>,
): string => {
  const parts: Array<string> = [];
  for (const index of subset) {
    const value = tuple.get(index);
    const formatted = value === undefined ? "⟂" : showCoordinate(index, value);
    parts.push(`${describeIndex(index)}=${formatted}`);
  }
  return parts.join("|");
};

const cloneTuple = <J, X>(entries: Iterable<readonly [J, X]>): Map<J, X> => new Map(entries);

const ensureMembership = <J, X>(target: SetObj<SetTuple<J, X>>, tuple: Map<J, X>): ReadonlyMap<J, X> => {
  if (!target.has(tuple)) {
    target.add(tuple);
  }
  return tuple;
};

export function setSemicartesianProductWitness<J, X>(
  family: SetSemicartesianFamily<J, X>,
  options: SetSemicartesianWitnessOptions<J, X> = {},
): SemicartesianProductWitness<J, SetObj<SetTuple<J, X>>, SetHom<SetTuple<J, X>, SetTuple<J, X>>> {
  const indices = Array.from(family.index);
  const describeIndex = options.describeIndex ?? ((index: J) => `${index}`);

  const coordinateData = new Map<
    J,
    SetSemicartesianCoordinate<X> & { readonly samples: ReadonlyArray<X> }
  >();

  for (const index of indices) {
    const coordinate = family.coordinate(index);
    const providedSamples = coordinate.samples
      ? Array.from(coordinate.samples)
      : options.fallbackSamples?.(index, coordinate);
    const samples = providedSamples ? Array.from(providedSamples) : [];
    coordinateData.set(index, { ...coordinate, samples });
  }

  const sectionCache = new Map<string, SectionMetadata<J, X>>();
  const metadataByObject = new Map<SetObj<SetTuple<J, X>>, SectionMetadata<J, X>>();

  const subsetKey = (subset: FiniteSubset<J>): string =>
    subset.map((index) => describeIndex(index)).join("|");

  const buildAssignments = (subset: FiniteSubset<J>): ReadonlyArray<Map<J, X>> => {
    if (subset.length === 0) {
      return [new Map<J, X>()];
    }

    const lists: Array<ReadonlyArray<X>> = subset.map((index) =>
      coordinateData.get(index)?.samples ?? [],
    );

    let assignments: Array<Map<J, X>> = [new Map<J, X>()];
    subset.forEach((index, position) => {
      const values = lists[position] ?? [];
      const next: Array<Map<J, X>> = [];
      for (const base of assignments) {
        if (values.length === 0) {
          continue;
        }
        for (const value of values) {
          const copy = cloneTuple(base);
          copy.set(index, value);
          next.push(copy);
        }
      }
      assignments = next;
    });

    if (assignments.length === 0) {
      return [];
    }

    const dedup = new Map<string, Map<J, X>>();
    for (const assignment of assignments) {
      const key = setTupleKey(
        subset,
        describeIndex,
        (index, value) => coordinateData.get(index)!.show(value),
        assignment,
      );
      if (!dedup.has(key)) {
        dedup.set(key, assignment);
      }
    }
    return Array.from(dedup.values());
  };

  const getSection = (subset: FiniteSubset<J>): SectionMetadata<J, X> => {
    const key = subsetKey(subset);
    const cached = sectionCache.get(key);
    if (cached) return cached;

    const frozenSubset = subset.slice() as FiniteSubset<J>;
    const assignments = buildAssignments(frozenSubset);
    const object = SetCat.obj(assignments);

    const eq = (left: SetTuple<J, X>, right: SetTuple<J, X>): boolean => {
      for (const index of frozenSubset) {
        const coordinate = coordinateData.get(index);
        if (!coordinate) return false;
        const leftValue = left.get(index);
        const rightValue = right.get(index);
        if (leftValue === undefined || rightValue === undefined) return false;
        if (!coordinate.eq(leftValue, rightValue)) return false;
      }
      return true;
    };

    const show = (tuple: SetTuple<J, X>): string => {
      if (frozenSubset.length === 0) {
        return "{}";
      }
      const pieces = frozenSubset.map((index) => {
        const coordinate = coordinateData.get(index)!;
        const value = tuple.get(index);
        const rendered = value === undefined ? "⟂" : coordinate.show(value);
        return `${describeIndex(index)}:${rendered}`;
      });
      return `{${pieces.join(", ")}}`;
    };

    const label =
      frozenSubset.length === 0
        ? "∅"
        : frozenSubset.map((index) => describeIndex(index)).join("×");

    const metadata: SectionMetadata<J, X> = { subset: frozenSubset, object, eq, show, label };
    sectionCache.set(key, metadata);
    metadataByObject.set(object, metadata);
    return metadata;
  };

  const compose = <A, B, C>(g: SetHom<B, C>, f: SetHom<A, B>): SetHom<A, C> => SetCat.compose(g, f);

  const restriction = (larger: FiniteSubset<J>, smaller: FiniteSubset<J>): SetHom<SetTuple<J, X>, SetTuple<J, X>> => {
    const source = getSection(larger);
    const target = getSection(smaller);
    return SetCat.hom(source.object, target.object, (tuple) => {
      const entries: Array<readonly [J, X]> = [];
      for (const index of target.subset) {
        const value = tuple.get(index);
        if (value !== undefined) {
          entries.push([index, value]);
        }
      }
      return ensureMembership(target.object, cloneTuple(entries));
    });
  };

  const productSection = getSection(indices as FiniteSubset<J>);

  const projection = (subset: FiniteSubset<J>): SetHom<SetTuple<J, X>, SetTuple<J, X>> =>
    restriction(indices as FiniteSubset<J>, subset);

  const equal = (
    left: SetHom<SetTuple<J, X>, SetTuple<J, X>>,
    right: SetHom<SetTuple<J, X>, SetTuple<J, X>>,
  ): boolean => {
    if (left.dom !== right.dom || left.cod !== right.cod) {
      return false;
    }
    const metadata = metadataByObject.get(left.cod);
    for (const value of left.dom) {
      const leftImage = left.map(value);
      const rightImage = right.map(value);
      if (metadata) {
        if (!metadata.eq(leftImage, rightImage)) {
          return false;
        }
      } else if (leftImage !== rightImage) {
        return false;
      }
    }
    return true;
  };

  const describeSubset = (subset: FiniteSubset<J>): string => getSection(subset).label;

  const diagram: SemicartesianTensorDiagram<J, SetObj<SetTuple<J, X>>, SetHom<SetTuple<J, X>, SetTuple<J, X>>> = {
    index: indices,
    tensor: (subset) => getSection(subset).object,
    restriction,
    compose,
    equal,
    describeSubset,
    describeMorphism: (morphism) => {
      const dom = metadataByObject.get(morphism.dom)?.label ?? "domain";
      const cod = metadataByObject.get(morphism.cod)?.label ?? "codomain";
      return `${dom}→${cod}`;
    },
  };

  const factor = (
    cone: SemicartesianCone<J, SetObj<SetTuple<J, X>>, SetHom<SetTuple<J, X>, SetTuple<J, X>>>,
  ): SemicartesianFactorization<SetHom<SetTuple<J, X>, SetTuple<J, X>>> => {
    const mediator = SetCat.hom(cone.apex, productSection.object, (value) => {
      const entries: Array<readonly [J, X]> = [];
      for (const index of indices) {
        const singleton = [index] as FiniteSubset<J>;
        const leg = cone.leg(singleton);
        const image = leg.map(value);
        const coordinateValue = image.get(index);
        if (coordinateValue === undefined) {
          throw new Error(`Mediator leg for ${describeIndex(index)} omitted value.`);
        }
        entries.push([index, coordinateValue]);
      }
      return ensureMembership(productSection.object, cloneTuple(entries));
    });
    return { mediator };
  };

  return {
    object: productSection.object,
    diagram,
    projection,
    factor,
    ...(options.productLabel !== undefined ? { label: options.productLabel } : {}),
  };
}

// ✅ END_MATH: SemicartesianInfiniteTensorProduct
// 🔮 Oracles: checkSemicartesianProductCone, checkSemicartesianUniversalProperty
// 📜 Laws: Infinite tensor products in semicartesian symmetric monoidal categories
// 🧪 Tests: law.SemicartesianInfiniteProduct.spec.ts exercising compatibility, factorization, and uniqueness diagnostics
