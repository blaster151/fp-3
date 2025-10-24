# Skeletons and Essential-Image Normal Forms

The `skeleton.ts` module packages the textbook construction that collapses a category onto one
representative from each isomorphism class. The helpers surface functors, equivalence witnesses,
and analyzers that integrate with the existing functor-property and equivalence diagnostics.

## Computing skeletons

Use `computeSkeleton` to choose canonical representatives and build the full inclusion functor back
into the ambient category:

```ts
import { computeSkeleton } from "../skeleton";
import { TwoObjectCategory } from "../two-object-cat";

const data = computeSkeleton(TwoObjectCategory);
console.log(data.skeleton.objects); // representatives
console.log(data.essentialSurjectivity.holds); // certified inclusion witness
```

The result exposes:

- `skeleton`: the finite full subcategory spanned by the chosen representatives
- `inclusion`: the identity-on-data inclusion functor with strengthened witnesses
- `classes`/`assignments`: equivalence-class diagnostics that identify which ambient objects share a
  representative and the isomorphism witnessing the identification
- `faithfulness`/`fullness`/`essentialSurjectivity`/`essentialInjectivity`: ready-to-use functor
  diagnostics that can be fed directly into equivalence constructors

## Equivalences and projections

`skeletonEquivalenceWitness` wraps the computation with `buildEquivalenceWitness`, providing a
quasi-inverse functor, unit/counit natural transformations, and the derived adjunction metadata. Use
`projectFunctorThroughSkeleton` to collapse a category onto its representatives when a genuine
projector functor is needed.

## Comparing functors modulo skeletons

`compareFunctorsModuloSkeleton` restricts functors to the skeleton of their domain and checks
whether they become naturally isomorphic. This is helpful when two presentations only differ on
redundant isomorphic objects: the analyzer produces explicit natural-isomorphism witnesses or
structured counterexamples that identify the offending arrow.

For essential-image diagnostics, `analyzeEssentialInjectivityModuloTargetSkeleton` projects a functor
through the skeleton of its codomain and classifies any essential-injectivity failures by reporting
which target representative witnesses the duplication. This makes it clear when a failure arises
solely because of redundant isomorphic targets.

## Export surface

`allTS.ts` re-exports the following symbols so downstream code can consume the helpers without
reaching into implementation files:

- `computeSkeleton`, `skeletonEquivalenceWitness`, `projectFunctorThroughSkeleton`
- `compareFunctorsModuloSkeleton`, `analyzeEssentialInjectivityModuloTargetSkeleton`
- supporting types such as `SkeletonComputationResult`, `SkeletonEquivalenceResult`, and
  `EssentialInjectivitySkeletonAnalysis`
