# Finite group subrepresentations via coordinate kernels

> For a higher-level tour of the full representation toolkit—including
> intertwiners, invariant vectors, and functor packaging—see
> [`representation-tooling.md`](./representation-tooling.md).

We now expose a concrete workflow for locating and certifying coordinate
subrepresentations of finite-dimensional modules.  The core utilities live in
[`models/fingroup-subrepresentation.ts`](../models/fingroup-subrepresentation.ts)
and leverage the kernel-equalizer machinery already available for finite
groups.

## Prime-field vector spaces as additive groups

`makePrimeField` constructs the finite field \(\mathbb{F}_p\) together with
arithmetic in characteristic `p`.  From there `makeVectorGroupContext` turns a
finite-dimensional vector space into an additive `FinGrp` object whose elements
are encoded coordinate tuples.  This lets us reuse the existing categorical
infrastructure—kernels, products, and equalizers—without introducing bespoke
linear-algebra primitives.

## Searching for stable coordinate subspaces

`enumerateCoordinateSubrepresentationWitnesses` consumes a finite group
representation `ρ : G → GL(V)` and tests every coordinate subspace for
stability.  For each candidate it:

1. builds inclusion/projection matrices for the chosen coordinates,
2. computes the restricted action and complementary quotient matrices, and
3. forms the difference homomorphisms
   \(Δ_g = ρ(g)·ι - ι·ρ_{|W}(g) : W → V\).

Each difference map is a `FinGrp` homomorphism whose kernel is produced by
`finGrpKernelEqualizer`.  When the kernel coincides with the entire subspace,
the candidate is promoted to a `SubrepresentationWitness` containing the
restricted matrices, quotient data, and the `FinGrp` witnesses required to build
quotients.

## Direct-sum assembly with product mediators

Once a stable coordinate subspace is known, `assembleCoordinateDirectSum`
realises the ambient representation as a direct sum of the subrepresentation and
its coordinate complement.  It uses the shared `FinGrpProductsWithTuple`
metadata store to build the binary product, constructs the splitting map via the
universal property of the product, and combines the components by adding their
inclusions inside the ambient additive group.  Kernels of both the splitting
and combining maps are provided so downstream code can confirm the decomposition
is an isomorphism.

These helpers are re-exported through the `Algebra` namespace in
[`src/all/triangulated.ts`](../src/all/triangulated.ts), making them available to
example code, tests, and downstream consumers.

## Diagnostics built atop coordinate witnesses

`checkFinGrpRepresentationIrreducible` and
`analyzeFinGrpRepresentationSemisimplicity` reuse the witnesses described above.
The irreducibility oracle reports invariant vectors or the first coordinate
subrepresentation it finds, while the semisimplicity analyzer searches for a
splitting section, assembles the corresponding direct sum, and recurses on the
sub and quotient constituents.  `collectFinGrpRepresentationSemisimplicitySummands`
then walks the resulting decomposition tree, composing inclusions and
projections along each branch to extract explicit direct-sum summands, replaying
`π ∘ ι = id` checks, and confirming that the summed `ι ∘ π` terms reconstruct the
identity on the ambient representation.  Once those checks pass,
`certifyFinGrpRepresentationSemisimplicity` stitches the summands into a block
diagonal representation, constructs the forward/backward natural
transformations, and verifies they form an isomorphism with the original
action.  All four helpers appear in the `Algebra` namespace and are documented
alongside the higher-level toolkit.
