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
original group laws before reconstructing the matrices.

These adapters let runnable examples or higher-level code compose
representations with the rest of the categorical limits machinery without manual
plumbing.

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
