# Algebraic Geometry Roadmap

## Stage 1 – Consolidate categorical and algebraic prerequisites
- [ ] Formalize links between existing category-theoretic modules (limits, monoidal structures) and the algebraic notions they approximate (rings, modules, sheaves).
- [ ] Identify missing abstractions underpinning schemes (commutative algebra utilities, locally ringed spaces) across the current codebase.
- [ ] Add missing primitives such as finitely generated modules and tensor products, ensuring they align with existing categorical interfaces.
  - [x] Provide finitely generated module oracles with executable witness search.
  - [x] Introduce tensor product primitives compatible with module infrastructure.
  - [x] Document compositional ring oracles that bundle these primitives for downstream scheme checks:
    - [x] Prime spectrum diagnostics compose with multiplicative-set search before localization in [`src/algebra/ring/prime-ideals.ts`](../src/algebra/ring/prime-ideals.ts).
    - [x] Localization helpers expose reusable complement data and local ring assembly pipelines in [`src/algebra/ring/localizations.ts`](../src/algebra/ring/localizations.ts).
    - [x] Tensor-product combinators feed flatness and Tor-vanishing witnesses through short exact sequences in [`src/algebra/ring/tensor-products.ts`](../src/algebra/ring/tensor-products.ts).

<a id="ring-oracle-how-to"></a>

### How to reuse the ring oracle suite during Stage 1 builds

1. **Choose spectrum data.** Start from a `PrimeSpectrumPoint` and its complement multiplicative set—`src/algebra/ring/samples.ts` bundles canonical choices for ℤ, ℤ[ε]/(ε²), and finite fields so localization attempts begin with consistent generators.
2. **Assemble the local ring harness.** Call `buildPrimeLocalizationCheck` from [`prime-ideals.ts`](../src/algebra/ring/prime-ideals.ts) to run prime and multiplicative-set validation before delegating to `checkLocalRingAtPrime` in [`localizations.ts`](../src/algebra/ring/localizations.ts). The helper returns the localized ring data that the structure-sheaf tooling expects.
3. **Layer Noetherian chain sampling.** Feed ideal chains through `searchAscendingChain`/`checkNoetherianModule` in [`finitely-generated-modules.ts`](../src/algebra/ring/finitely-generated-modules.ts) to detect stabilization while reusing the finitely generated module oracle.
4. **Probe flatness witnesses.** Supply short exact sequence samples to `checkFlatModuleOnSamples` in [`tensor-products.ts`](../src/algebra/ring/tensor-products.ts); it tensors the sequences against your module and raises violations whenever Tor-vanishing fails.
5. **Surface diagnostics through the registry.** `AlgebraOracles.ring.localRing`, `.noetherianModule`, and `.flatness` expose the composed checks so runnable examples and downstream scheme infrastructure can call them without rebuilding the pipelines.

## Stage 2 – Introduce sheaf-theoretic machinery
- [x] Develop presheaf and sheaf abstractions on topological and categorical sites.
  - [x] Presheaf sampling plans, morphism validators, and section utilities live in [`src/sheaves/presheaves.ts`](../src/sheaves/presheaves.ts).
  - [x] Matching-family builders, gluing checks, and sheaf morphism tooling live in [`src/sheaves/sheaves.ts`](../src/sheaves/sheaves.ts).
- [x] Implement Grothendieck topologies relevant for schemes (Zariski, étale).
  - [x] Covering enumerators, descent samples, and topology checks are bundled in [`src/sheaves/grothendieck-topologies.ts`](../src/sheaves/grothendieck-topologies.ts).
- [x] Provide executable sheaf condition checks leveraging existing limit and colimit utilities.

<a id="sheaf-tooling-how-to"></a>

### How to wire the Stage 2 sheaf tooling

1. **Start from affine data.** Choose a curated spectrum, e.g. `CommutativeRingSamples.zIntegers`, and feed it to `buildZariskiSiteTopology` in [`grothendieck-topologies.ts`](../src/sheaves/grothendieck-topologies.ts) to obtain both the underlying site (`site`) and its canonical principal-open coverings (`topology`).
2. **Describe sections over opens.** Assemble a presheaf over the site by providing `sections` and `restrict` callbacks. Constant-function examples mirror those used in `test/sheaf-infrastructure.spec.ts`, and `buildPresheafSamplingPlan` from [`presheaves.ts`](../src/sheaves/presheaves.ts) packages representative objects/arrows for diagnostics.
3. **Generate matching families automatically.** Pass the topology and a section enumerator to `buildMatchingFamily` (or the Zariski-specialised `buildZariskiMatchingFamily`) from [`sheaves.ts`](../src/sheaves/sheaves.ts). The helper crawls the coverings produced in step 1, enumerates overlaps, and synthesises `MatchingFamilySample` arrays without manual bookkeeping.
4. **Run the gluing oracle.** Call `checkSheafGluing` with the presheaf from step 2, the matching families from step 3, and optional witness limits. The checker validates assignment consistency, overlap restrictions, and glued section witnesses—mirroring the Stage 2 tests and runnable examples.

Taken together, these helpers allow Stage 2 contributors to walk from a `Site` to full sheaf diagnostics without reconstructing covering data or overlap enumerators.

## Stage 3 – Model affine schemes and their morphisms
- [x] Represent the spectrum of a commutative ring, including prime spectra and localization-based stalk computations.
- [x] Implement the structure sheaf as a sheaf of rings built on the Stage 2 framework.
- [x] Provide utilities for morphisms of affine schemes derived from ring maps, verifying pullbacks and pushouts.

## Stage 4 – Assemble global schemes and workflows
- [x] Glue affine schemes along overlaps using categorical pushouts/pullbacks.
- [x] Formalize fiber products, base change, and scheme-level properties (separated, quasi-compact).
- [x] Develop example workflows and tests demonstrating affine/projective schemes and morphism compositions.

## Stage 5 – Extend toward advanced topics and tooling
- [x] Explore derived functors (cohomology) and relate chain complexes to sheaf cohomology computations.
- [x] Draft moduli/stack scaffolding with fibered categories and descent data.
  - Added fibered-category and descent-datum oracles with witness-rich metadata for stack-style validation.
- [x] Enhance documentation, visualization, and automated tests for algebraic-geometry workflows.
  - Documented the new moduli oracles in LAWS.md and added Vitest coverage for cartesian lifts and descent gluing scenarios.
