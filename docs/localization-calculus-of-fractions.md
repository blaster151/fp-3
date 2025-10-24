# Localization and Calculus of Fractions Toolkit

The localization builders operationalize Section 27.6 by turning a finite category
`C` together with a denominator class `Σ` into a new category `C[Σ^{-1}]`.
The infrastructure focuses on left-style roofs and provides executable
oracles to replay the textbook universal property.

## Constructing a localization

Use `localizeCategory` with a `CalculusOfFractionsData` witness:

```ts
const data: CalculusOfFractionsData<Obj, Arr> = {
  category: baseCategory,
  denominators: [...],
};

const localization = localizeCategory(data);
```

* Objects match the ambient category.
* Arrows are canonical roofs `σ^{-1} ∘ f` represented by pairs of
  numerator/denominator indices.
* The builder computes closure under denominators to normalise roofs and
  checks identity, composition, and Ore conditions on the supplied data.

The result packages both the localized `FiniteCategory` and the canonical
localization functor `C → C[Σ^{-1}]`, whose witnesses expose the full
functor-law diagnostics introduced earlier in the roadmap.

## Universal property diagnostics

Given a functor `F : C → D` and a candidate lift `\bar F : C[Σ^{-1}] → D`,
`localizationUniversalProperty` verifies the textbook clauses:

```ts
const report = localizationUniversalProperty(localization, F, lifted);
```

The report records whether

* every denominator lands in an isomorphism inside `D`,
* the lift factors through the localization functor on the supplied samples, and
* the lift agrees with the canonical evaluation of each roof via
  `F(f) ∘ F(σ)^{-1}`.

Failures include explicit counterexamples, making it clear where the Ore
machinery or the factorization breaks down.

## Integration and diagnostics

The diagnostics summarise identity/composition closure for denominators
and collect any Ore-condition failures encountered when composing roofs.
This metadata threads into the functor witnesses so downstream tooling—
such as preservation/reflection analyses or equivalence detectors—can
inspect whether a localization behaves like a genuine calculus of
fractions instance.

Regression tests in `test/localization.calculus-of-fractions.spec.ts`
illustrate the construction on a two-object category where a non-invertible
arrow becomes invertible after localization and replay both the positive
and negative sides of the universal property.
