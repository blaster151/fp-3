# Representation-theoretic toolkit overview

The recent finite-group upgrades let us move beyond raw matrix conversions and
package representation computations in a reusable way.  The utilities land in
three layers:

1. **Linear algebra analyses** in [`stdlib/vect-view.ts`](../stdlib/vect-view.ts)
   provide `intertwinerSpace` and `invariantSubspace`, giving explicit bases for
   commuting maps and fixed-point vectors with nullspace computations.
2. **Categorical packaging** in
   [`models/fingroup-representation.ts`](../models/fingroup-representation.ts)
   promotes a matrix representation `(G ⊲ V)` to a true `FinGrp → Vect` functor,
   compatible with the product mediators exposed through the triangulated
   toolkit.
3. **Subrepresentation diagnostics** in
   [`models/fingroup-subrepresentation.ts`](../models/fingroup-subrepresentation.ts)
   use kernel equalizers to certify coordinate-stable subspaces and assemble the
   resulting direct-sum decompositions.

All three layers are re-exported through
[`src/all/category-toolkit.ts`](../src/all/category-toolkit.ts) and
[`src/all/triangulated.ts`](../src/all/triangulated.ts), so downstream code can
import them from a single surface (`Algebra` namespace or the category toolkit
barrel).

## Intertwiners and invariants

Call
`intertwinerSpace(F)(ρ₁, ρ₂, generators)` to solve the commuting equations
`ρ₂(g)·T = T·ρ₁(g)` simultaneously via Kronecker products and nullspace search.
The returned basis spans every intertwiner matrix between the two
representations.  Dually, `invariantSubspace(F)(ρ, generators)` solves
`(ρ(g) − I)v = 0` to produce a basis of fixed vectors for the chosen generator
set.

Both helpers degrade gracefully: an empty generator list yields the full space
of matrices or vectors, and zero-dimensional representations return an empty
basis.  The Vitest suite in
[`test/representation-invariants.spec.ts`](../test/representation-invariants.spec.ts)
exercises permutation and sign representations to illustrate these behaviours.

## Functorial packaging

`makeFinGrpRepresentationFunctor` converts a finite-group representation into a
`CatFunctor`-compatible object whose `onObj`/`onMor` callbacks honour the
mediator metadata supplied by `FinGrpProductsWithTuple`.  `makeFinGrpProductRepresentation`
leverages the same store to build block-diagonal actions for product groups, and
`functorToFinGrpRepresentation` validates that a supplied functor satisfies the
original group laws before reconstructing the matrices.  When you receive a raw
`CatFunctor` from other tooling, `finGrpRepresentationFunctorFromCatFunctor`
performs the same validation and upgrades it into the enriched
`FinGrpRepresentationFunctor` shape, re-attaching the underlying matrices so the
rest of the helpers (Hom functors, natural transformations, etc.) can consume it
without re-deriving the action.

These adapters let runnable examples or higher-level code compose
representations with the rest of the categorical limits machinery without manual
plumbing.

## Natural transformations and Hom-spaces

`makeFinGrpRepresentationNatTrans` upgrades a commuting matrix into an explicit
natural transformation between two `FinGrp → Vect` functors, validating that the
matrix intertwines the action of every group element.  When the data already
arrives as a `VectView` linear map, call
`makeFinGrpRepresentationNatTransFromLinMap` to replay the same checks directly
from the domain/codomain metadata instead of extracting the matrix by hand. Each natural
transformation now exposes `asLinMap()` so it can be fed straight into
`VectView` analyses without reconstructing the linear map by hand.  For automated
searches, `finGrpRepresentationHomSpace` wraps `intertwinerSpace` to return both
the basis matrices and their natural-transformation upgrades, plus
coordinate-aware helpers: `matrixFromCoordinates` rebuilds an intertwiner from
basis coefficients, `naturalTransformationFromCoordinates` validates the result
as a bona fide natural transformation, and the inverse utilities
`coordinatesFromMatrix`/`coordinatesFromNaturalTransformation` recover the
coefficient vectors for arbitrary commuting matrices.  Dual helpers convert
between coordinates and `VectView` linear maps as well, letting you stay in the
linear-map world when composing with other vector-space tooling.  The returned
`vectorSpace` packages the Hom-space as a `VectView` object so downstream code
can treat it as just another finite-dimensional vector space.

To work entirely at the level of the Hom-space vector space, the same record now
exposes additive structure: `zeroCoordinates`/`zeroMatrix`/`zeroNaturalTransformation`
build the neutral element in whichever representation is most convenient, and
the paired `add…`/`scale…` helpers act on coordinates, matrices, linear maps, or
natural transformations without leaving the FinGrp context.  These operations
respect the same dimension checks as the conversion routines, so attempts to
combine mismatched data yield clear error messages instead of silently
misbehaving.

When you need to audit a candidate matrix before promoting it, run
`checkFinGrpRepresentationNatTransMatrix`.  The checker keeps generators under
review, records invalid requests separately from shape mismatches, and captures
the left/right action matrices for every failed group element.  It returns a
structured report (`holds`, `failures`, `checkedElements`, `invalidGenerators`,
and `details`) so you can surface naturality diagnostics without throwing
exceptions or losing context about which generator broke.

To understand the linear algebra of an existing natural transformation, call
`analyzeFinGrpRepresentationNatTrans`.  The analysis packages kernel and image
bases, rank/nullity, and injectivity/surjectivity flags without recomputing the
Hom-space basis.  By default it uses the shared RREF resolver, but you can pass
your own via `resolver` when working over specialized fields.  The resulting
record exposes the domain/codomain dimensions alongside the computed kernel and
image, so downstream tooling can detect when a transformation becomes an
isomorphism or when its cokernel retains non-trivial dimension.

When you receive a natural transformation from the generic
`natural-transformation.ts` machinery, call
`finGrpRepresentationNatTransFromNaturalTransformation` to upgrade it into the
representation-aware shape and replay the commuting-matrix validation.  The
paired helper `finGrpRepresentationNatTransFromNaturalTransformationWithWitness`
threads through the existing witness metadata while layering the generator-based
checks from `finGrpRepresentationNatTransWitness`, so conversions stay aligned
with the rest of the FinGrp diagnostics.

Going in the other direction, `finGrpRepresentationNatTransToNaturalTransformation`
packages an existing FinGrp representation natural transformation for the
generic `NaturalTransformation` interfaces.  When you need full witness data
for the downstream toolchain, use
`finGrpRepresentationNatTransToNaturalTransformationWithWitness`.  It layers a
conversion-specific metadata trail on top of the generator checks so that
generic functor oracles can replay the same diagnostics without re-solving the
commuting equations.

When a commuting matrix is invertible, `makeFinGrpRepresentationNatIso` lifts it
to a bona fide natural isomorphism by solving for the inverse matrix with the
shared linear solver and double-checking both compositions against the identity.
`makeFinGrpRepresentationNatIsoWithWitness` packages the forward and inverse
transformations together with generator-based witness reports, while
`finGrpRepresentationNatIsoWitness` lets you retrofit the same diagnostics onto
an already-constructed isomorphism.

When you want to reason about representation functors abstractly,
`makeFinGrpRepresentationNatCategory` supplies the category whose objects are
FinGrp representations (over a fixed field and group) and whose morphisms are
these executable natural transformations.  It stitches together identity and
composition using the same matrix laws, so Schur-style checks or Hom-functor
machinery can be layered on top of this category without additional plumbing.
To verify those categorical laws on concrete samples, call
`checkFinGrpRepresentationNatCategoryLaws` with a handful of representations
and natural transformations.  The report spells out identity, composition, and
associativity diagnostics, giving immediate feedback when a purported FinGrp →
Vect functor or natural transformation fails to assemble into a legitimate
category.

For integrations that rely on the generic functor-law oracles, call
`finGrpRepresentationHomIntoFunctorWitness` or
`finGrpRepresentationHomFromFunctorWitness` to validate the Hom functors.  The
paired constructors `makeFinGrpRepresentationHomIntoFunctorWithWitness` and
`makeFinGrpRepresentationHomFromFunctorWithWitness` return both the functor and
its witness report, pre-loading object and arrow samples derived from the
source/target representations.  Metadata strings summarize the post-composition
and precomposition checks respectively, so downstream tooling can surface the
validation context alongside the computed functors.

For integrations that rely on the generic `Functor`/`NaturalTransformation`
oracles, `makeFinGrpRepresentationFunctorWithWitness` upgrades a representation
functor to a `FunctorWithWitness` whose samples replay the generator-based
checks.  Likewise, `makeFinGrpRepresentationNatTransWithWitness` and
`finGrpRepresentationNatTransWitness` attach naturality witnesses to commuting
matrices, allowing the transformation to participate in the broader
`natural-transformation.ts` diagnostics without reimplementing the component or
law verifications.

When two commuting matrices need to be chained together,
`composeFinGrpRepresentationNatTrans` multiplies them and revalidates the
resulting matrix against the shared generator set, returning the composite as a
genuine FinGrp representation natural transformation.  Pair it with
`composeFinGrpRepresentationNatTransWithWitness` when downstream tooling expects
the witness payload—both helpers reuse the cached generator normalization so the
composition slots straight into the existing diagnostics without duplicating
checks.

Fixing a source representation and calling
`makeFinGrpRepresentationHomIntoFunctor` packages the assignment
`G ↦ Hom(source, G)` into a genuine functor landing in the vector-space
category built from the same field.  The functor caches each Hom-space basis,
provides coordinate matrices for post-composition, and exposes the underlying
Hom-space computation via `homSpace(target)` so callers can inspect both the
categorical action and the raw intertwiner data.

The dual `makeFinGrpRepresentationHomFromFunctor` pre-composes with natural
transformations instead, serving `G ↦ Hom(G, target)` as a covariant functor
out of the same natural-transformation category.  Its `onMor` implementation
performs coordinate-aware precomposition, so chaining a transformation
`f: G₁ → G₂` forwards linear maps from `Hom(G₂, target)` to
`Hom(G₁, target)` without re-solving the intertwining equations.

When both variables need to vary simultaneously,
`makeFinGrpRepresentationHomBifunctor` serves the classic
`Hom(-,-): FinGrpRepᵒᵖ × FinGrpRep → Vect` bifunctor.  The helper caches each
pairwise Hom-space and transports basis elements by explicitly composing with
the supplied pre/post transformations, returning the resulting linear map in
coordinates.  `finGrpRepresentationHomBifunctorWitness` feeds those coordinate
checks into the generic functor-law oracle, while
`makeFinGrpRepresentationHomBifunctorWithWitness` packages both the bifunctor
and its witness for downstream tooling.

The Vitest coverage in
[`test/fingroup-representation.spec.ts`](../test/fingroup-representation.spec.ts)
now exercises these constructors, confirming that the permutation representation
of `Z₂` exposes the expected two-dimensional commutant and that rectangular
intertwiners (e.g. from the permutation representation onto the sign
representation) upgrade to bona fide natural transformations.

### Endomorphism algebras

`makeFinGrpRepresentationEndomorphismAlgebra` packages the Hom-space
`Hom(ρ, ρ)` into an executable algebra.  It reuses the cached basis from
`finGrpRepresentationHomSpace` and exposes coordinate-aware multiplication:
`composeCoordinates` multiplies two coefficient vectors, while
`composeNaturalTransformations` returns the composite as a bona fide natural
transformation.  The helper also returns structure constants for the chosen
basis and the identity coordinates, so downstream code can feed them directly
into algebra diagnostics or Schur-style analyses without recomputing matrices.

## Coordinate subrepresentation search

`makePrimeField` and `makeVectorGroupContext` construct the finite-field
backbone needed to express a vector space as an additive `FinGrp` object.  With
that in place, `enumerateCoordinateSubrepresentationWitnesses` scans each
coordinate subspace, pushes the inclusion/projection data through the finite
group action, and delegates to `finGrpKernelEqualizer` to confirm stability.

When a coordinate choice succeeds, the resulting `SubrepresentationWitness`
packages both inclusion and quotient data.  `assembleCoordinateDirectSum` then
uses the shared product mediators to split the ambient representation into a
certified direct sum, providing kernel witnesses for both splitting and
recombination maps.

## Irreducibility and semisimplicity oracles

`checkFinGrpRepresentationIrreducible` builds on the invariant solver and
coordinate search: it first probes the invariant subspace via
`invariantSubspace`, returning an explicit fixed vector whenever it uncovers a
non-trivial subrepresentation, and falls back to
`enumerateCoordinateSubrepresentationWitnesses` for coordinate-stable slices.
If neither yields a witness, the report certifies irreducibility together with
the generator set that was inspected.

`analyzeFinGrpRepresentationSemisimplicity` uses the same witnesses to search
for splittings.  For each stable coordinate subspace it constructs the ambient,
sub, and quotient functors, solves for a section in `Hom(quotient, ambient)` by
enforcing `projection ∘ section = id`, and recursively decomposes both
constituents.  The resulting tree captures every successful direct-sum step
alongside the matrices for inclusion, projection, quotient projection, and the
computed section, or pinpoints the first obstruction when semisimplicity fails.

Once a semisimplicity tree is available, `collectFinGrpRepresentationSemisimplicitySummands`
flattens it into explicit direct-sum summands.  The helper composes every
inclusion/projection along the tree to obtain maps from each leaf back into the
ambient representation, replays `π ∘ ι = id` on every summand, and verifies that
the sum of all `ι ∘ π` contributions recovers the identity on the ambient
representation.  Optional irreducibility checks on each leaf reuse
`checkFinGrpRepresentationIrreducible` so the resulting report simultaneously
certifies the splitting and classifies the constituents.

When the summand collection succeeds, `certifyFinGrpRepresentationSemisimplicity`
packages the leaves into an explicit direct-sum representation, stitches the
inclusion and projection matrices into block morphisms, and verifies that the
resulting natural transformations yield an isomorphism back to the ambient
action.  The report exposes the constructed functor, forward/backward natural
transformations, and their identity checks so downstream code can reuse the
decomposition without replaying the matrix algebra.

Both reports are exposed through the `Algebra` namespace and catalogued so they
surface in editor tooling next to the lower-level building blocks.

The workflow is documented in
[`docs/representation-substructures.md`](./representation-substructures.md) and
covered by regression tests in
[`test/representation-substructures.spec.ts`](../test/representation-substructures.spec.ts).

## Putting it together

The public catalog (`FP_CATALOG`) now advertises each of these entry points so
editor tooling can surface them alongside older algebra utilities.  Runnable
examples can mix and match the pieces—for instance, start from a permutation
representation, compute its invariant and intertwiner data, promote it to a
functor, and then decompose it into coordinate summands with kernel witnesses.
