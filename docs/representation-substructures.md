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
`collectFinGrpRepresentationIrreducibleSummands` filters the leaves down to
the irreducible constituents, reporting any reducibility witnesses that appear
so callers know when the decomposition fails to split completely.
`certifyFinGrpRepresentationSemisimplicity` stitches the summands into a block
diagonal representation, constructs the forward/backward natural
transformations, and verifies they form an isomorphism with the original
action.  All five helpers appear in the `Algebra` namespace and are documented
alongside the higher-level toolkit.

When a single entry point is preferable,
`enumerateFinGrpRepresentationOracles` executes all of these diagnostics in
order, threading shared data so the summand collector, irreducible filter, and
certifier reuse the original semisimplicity report.  Building on that,
`runFinGrpRepresentationSemisimplicityWorkflow` collapses the enumerated
results into a workflow report that highlights the first failing stage,
provides a boolean success verdict, and summarises the irreducible, semisimple,
summand, and certification outcomes.  The aggregated report makes it easy to
surface end-to-end status in runnable examples without manually inspecting each
oracle.  The workflow also exposes a structured `timeline` and `stages` map so
UI layers can print compact headlines for each oracle while still having access
to the full diagnostic reports and registry metadata.

To turn those results into user-facing prose,
`formatFinGrpRepresentationSemisimplicityWorkflow` emits a ready-made
narrative.  The formatter prefixes each stage headline with a success or failure
glyph and reuses the curated summaries so CLI tooling or notebooks can surface
the decomposition status without reimplementing formatting.  Optional flags add
the raw oracle `details` arrays or the workflow commentary when you need a more
verbose transcript.

When you need a machine-readable digest,
`summarizeFinGrpRepresentationSemisimplicityWorkflow` condenses the workflow
into a classification, per-stage headlines, highlights, and targeted
recommendations.  The summary keeps the registry paths for each stage so UI
layers or analytics dashboards can link back to the originating oracles while
displaying the overall status at a glance.

For analytics dashboards or regression tracking,
`profileFinGrpRepresentationSemisimplicityWorkflow` extracts the quantitative
signals from the workflow.  The profile reports tree depth, node/leaf counts,
generator usage, verified summand dimensions, irreducible isolation coverage,
and certification failure kinds so automated tooling can compare runs or track
progress without replaying the full decomposition search.

When those numbers need to be communicated to humans without rebuilding the
layout, `formatFinGrpRepresentationSemisimplicityWorkflowProfile` renders the
profile as a bullet summary.  Section toggles control whether representation
metadata, workflow status, semisimplicity analysis metrics, summand dimensions,
or certification outcomes appear, making it easy to print concise status
dashboards or deep-dive readouts from the same payload.

For a one-stop entry point,
`reportFinGrpRepresentationSemisimplicityWorkflow` executes the workflow and
packages the raw report together with the structured summary, quantitative
profile, and optional formatted narrative.  Higher-level analytics or UI layers
can invoke a single helper to obtain every representation of the decomposition
status without re-threading options across multiple helpers.

To study families of representations at once,
`surveyFinGrpRepresentationSemisimplicityWorkflows` reruns the reporter across an
array of inputs and aggregates the results.  The survey reports how many cases
land in each workflow classification, counts success across the individual
stages, records the first failing registry path when decomposition breaks, and
computes dimension statistics so catalog browsers can surface trends without
manually iterating over every decomposition report.

When those rollups need to be shared with humans,
`formatFinGrpRepresentationSemisimplicitySurvey` turns the metrics into prose.
It highlights total successes, classification and stage counts, failure tallies
or the lack thereof, and the dimension range before optionally listing each
representation's headline, stage status checklist, recommendations, or the full
workflow narrative pulled from the underlying reports.
