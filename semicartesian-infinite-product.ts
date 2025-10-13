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

// ✅ END_MATH: SemicartesianInfiniteTensorProduct
// 🔮 Oracles: checkSemicartesianProductCone, checkSemicartesianUniversalProperty
// 📜 Laws: Infinite tensor products in semicartesian symmetric monoidal categories
// 🧪 Tests: law.SemicartesianInfiniteProduct.spec.ts exercising compatibility, factorization, and uniqueness diagnostics
