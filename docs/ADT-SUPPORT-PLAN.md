# Algebraic Data Type (ADT) Support Roadmap

## 0. Progress Snapshot and Maintenance
- ✅ **A1 — Schema + constructor builder** (landed via `buildADTConstructors` along with schema validation and constructor wiring inside `defineADT`).
- ✅ **A2 — Total pattern matching + equality wiring** (implemented through `defineADT.match`, `defineADT.equals`, and their supporting helpers with exhaustive runtime guarantees).
- ✅ **B1 — Catamorphism scaffolding** (landed via recursion-aware fields, `buildADTFold`, and guarded `defineADT.fold`).
- ✅ **B2 — Anamorphism + functor map scaffolding** (implemented via `buildADTUnfold`, `buildADTMap`, and their guarded `defineADT` integrations).
- ✅ **B3 — Recursion-scheme oracles + registry integration** (now live through dedicated coalgebra/fold fusion diagnostics wired into `defineADT`).
- ✅ **B4 — Traversal + applicative wiring** (landed via applicative traverse/sequence helpers and traversal-aware oracles).
- ✅ **C1 — Parameterised constructor families** (schema parameters now instantiate to specialised ADTs with per-parameter equality witnesses and guardrails for malformed inputs).
- ✅ **C2 — Indexed constructor scaffolding** (constructor descriptors now accept index metadata with derived witnesses, runtime validation, and metadata helpers for recursive folds/maps).
- ✅ **C3 — Indexed oracle scaffolding** (landed via index diagnostics, metadata exposure, and registry integration for recursion-aware ADTs).
- ✅ **C4 — Schema introspection helpers** (landed via introspection snapshots on both concrete and parameterised ADT definitions).
- ✅ **D1 — Polynomial functor interpretation** (polynomial signatures, projections, embeddings, and recursion wiring now surface through `defineADT`).
- ✅ **D2 — Polynomial functor oracles + container bridge** (roundtrip/map/recursion diagnostics live alongside an endofunctor-friendly container view).
- ✅ **D3 — Polynomial container law harness** (landed via reusable naturality helpers, functor-law diagnostics, and registry wiring for polynomial containers).
- ✅ **E1 — Relative monad container integration** (bridged polynomial containers through the relative monad toolkit and added diagnostics).
- ✅ **E2 — Relative monad law harness** (Street-style unit and Kleisli composites now replay through the polynomial container with scenario-driven diagnostics.).
- ⏭️ **F1 — Street action registry integration** (next; capture Street witness snapshots for enriched bridges and surface the results through the relative oracle catalogue).

> We evolve this roadmap after every PR so completed slices are explicitly marked and the “next slice” always reflects the forthcoming implementation target.

## 1. Context and Goals
- **Motivation**: several future-work threads (e.g. infinite relative-monad case studies) depend on algebraic data types with decidable equality. We currently rely on ad-hoc record/union encodings that lack canonical constructors, pattern matching, and oracle-friendly equality.
- **Objective**: establish a reusable ADT layer that produces value-level constructors, pattern matchers, canonical equality oracles, and integration points for recursion schemes and categorical semantics.
- **Scope**: initial focus on finitary ADTs (finite sum-of-products with named fields) with total equality; later phases extend to parameterised families, recursion, and higher inductive structure.

## 2. Design Pillars
1. **Category-first encoding**: treat an ADT as the initial algebra of a polynomial functor; runtime constructors are witnesses for coproduct injections, while pattern-matching realises the universal catamorphism.
2. **Oracle-driven**: every ADT definition produces equality oracles and shape metadata, enabling derived oracles (e.g. constructor disjointness, exhaustiveness checks) without re-describing the structure.
3. **Interoperability**: align with existing `_tag` discriminants and `match` helper conventions so that ADT values interact seamlessly with current combinators.
4. **Deterministic derivations**: ADT builders are pure functions from a declarative schema to constructors/oracles; no manual duplication between type-level and value-level encodings.

## 3. Delivery Milestones
### Milestone A — Core schema + constructors *(status: ✅ completed)*
- Define a declarative schema language for sums of labelled products.
- Implement a builder that emits `_tag`-discriminated constructors, canonical pattern-matching combinators, and a decidable equality oracle derived from field witnesses.
- Provide unit tests on representative ADTs (e.g. `Maybe`, simple binary trees) exercising construction, matching, and equality.

#### A1 — Schema + constructor builder *(✅ delivered)*
- `buildADTConstructors` now generates nullary/unary/multi-field constructors from declarative descriptors, enforces `_tag` discriminants, and validates non-empty, duplicate-free constructor lists with per-field witnesses.
- Vitest coverage verifies constructor synthesis and malformed schema rejections, ensuring future slices can assume deterministic metadata.
- The roadmap itself references these helpers so subsequent slices build on the established exports instead of duplicating logic.

#### A2 — Total pattern matching + equality wiring *(✅ delivered)*
- `defineADT.match` and `defineADT.equals` provide exhaustive runtime pattern matching and witness-driven equality, surfacing actionable errors when handlers are missing or constructor tags diverge.
- Supporting helpers (`deriveMatcher`, `deriveEquality`) stay internal so `buildADTConstructors` remains single-purpose, keeping slice boundaries intact.
- Tests now cover positive/negative matcher behaviour and custom equality witnesses, documenting extensibility for downstream catamorphism work.

### Milestone B — Derived structure (next iteration)
- Add automatic catamorphism/anamorphism generation for recursive ADTs.
- Provide `map`/`fold` skeletons for functorial ADTs (supporting recursion-scheme adapters already present in `array-recursion.ts`).
- Emit structural oracles (constructor completeness, disequality, recursion well-foundedness) registered with the oracle registry.

#### B1 — Catamorphism scaffolding *(✅ delivered)*
- Schema descriptors now accept `recursion: 'self' | 'foreign'`, letting fold derivations distinguish self-referential payloads without breaking existing constructor tests.
- `buildADTFold` synthesises catamorphisms from constructor metadata, validates algebras upfront, and recursively folds `recursion: 'self'` fields while leaving foreign fields untouched.
- `defineADT` exposes a `fold` helper only when recursion metadata is present; non-recursive ADTs remain constructor/matcher-only and trigger a guard if `buildADTFold` is invoked directly.
- Vitest coverage folds recursive lists to lengths/arrays, checks handler validation, and confirms non-recursive schemas omit catamorphism helpers.
- The roadmap has been updated to reflect this slice as complete and to queue anamorphism/functor-map work next.

#### B2 — Anamorphism + functor map scaffolding *(✅ delivered)*
- `buildADTUnfold` now synthesises anamorphisms from the same schema metadata, validates coalgebra output, and recurses through `recursion: 'self'` fields before invoking constructor factories.
- `buildADTMap` exposes functorial transformations that automatically recurse over self fields, threading constructors through handler contexts so transformations can rebuild variants ergonomically.
- `defineADT` conditionally surfaces `unfold`/`map` alongside `fold` for recursive schemas; guardrails prevent deriving these helpers for non-recursive ADTs or with incomplete coalgebras/handlers.
- Vitest coverage exercises unfold/fold round-trips, seed validation, handler omissions, and constructor-guard behaviour to document expected ergonomics.
- This slice updates the roadmap (progress snapshot + upcoming tasks) so future work can focus on registering recursion-scheme oracles.

#### B3 — Recursion-scheme oracles + registry integration *(✅ delivered)*
- `defineADT` now threads a recursion-oracle suite that validates coalgebras and fold/unfold fusion against sample seeds with counterexample capture.
- The oracle suite reports both structural failures (bad constructor tags, missing fields) and behavioural counterexamples using the ADT’s equality witnesses.
- `AlgebraOracles.adt` re-exports the new diagnostics so registry consumers can trigger them alongside existing algebra checks.
- Vitest coverage exercises success and failure cases, documenting how oracle results expose seeds, errors, and mismatched evaluations.

#### B4 — Traversal + applicative wiring *(✅ delivered)*
- `buildADTTraverse` now threads applicative handlers through recursive payloads, returning effectful ADT values while reusing constructor metadata and enforcing handler completeness.
- `buildADTSequence` sequences effectful fields for recursive variants, combining applicative payloads into canonical constructors with runtime guardrails for unknown tags.
- `defineADT` exposes `traverse`/`sequence` alongside existing recursion helpers, and recursion oracles gained traversal analysis with scenario-driven diagnostics.
- Tests cover array/identity applicatives, sequencing behaviour, guard rails, and oracle success/failure cases to document expected ergonomics.

#### C1 — Parameterised constructor families *(✅ delivered)*
- Schema definitions now accept explicit parameter lists and `parameterField` descriptors so a single declaration can instantiate concrete ADTs with external equality witnesses.
- `defineADT` exposes an `instantiate` helper that enforces witness completeness, rejects unknown parameters, and recovers the full constructor/matcher/fold/traverse surface for each specialisation.
- Vitest coverage exercises multi-parameter instantiation, guard rails for missing or malformed witnesses, recursive folds on parameterised lists, and misuse scenarios (e.g. undeclared parameters, recursive annotations on parameter slots).

#### C2 — Indexed constructor scaffolding *(✅ delivered)*
- Constructor descriptors now accept optional index metadata with equality witnesses and compute functions so recursive schemas can express simple GADT-style invariants (e.g. length-indexed vectors).
- `defineADT` threads index descriptors through instantiation, constructor synthesis, equality, and recursion helpers while exposing `getADTIndex`/`getADTIndexWitness` for downstream consumers.
- The Vitest suite exercises index derivation, guard-rail failures (duplicate names, missing witnesses/compute hooks), metadata introspection, and recursion-preserving traversals.

#### C3 — Indexed oracle scaffolding *(✅ delivered)*
- Recursion oracles gained `analyzeIndexes`, recomputing constructor index payloads to flag missing metadata or mismatched witnesses across constructors, unfolds, traversals, and derived values.
- `defineADT` now exposes `indexDescriptors` for both concrete and parameterised ADTs so tooling can inspect declared indexes without reparsing schemas.
- The Vitest suite captures successful index analyses, tampered metadata failures, and registry wiring through `AlgebraOracles.adt.analyzeIndexes`.

#### C4 — Schema introspection helpers *(✅ delivered)*
- `defineADT` and specialised ADTs now expose `introspect()` snapshots covering constructors, recursion metadata, index descriptors, and resolved equality witnesses.
- Parameterised families return introspection views that retain parameter placeholders, while instantiated ADTs surface the substituted witnesses for downstream tooling.
- Documentation and tests assert introspection behaviour across concrete, parameterised, and recursive schemas so code generators can rely on deterministic snapshots.

#### D1 — Polynomial functor interpretation *(✅ delivered)*
- `defineADT` now exposes a `polynomial` view capturing coproduct-of-product signatures with frozen position metadata and per-field witnesses.
- The polynomial helper provides `project`, `embed`, and `mapPositions` operations that translate ADT values into polynomial data, rebuild values from abstract payloads, and map recursive positions respectively.
- Recursive ADTs surface `polynomial.recursion` hooks that reuse existing `fold`/`unfold`/`map` derivations, ensuring algebraic behaviour stays aligned across both surfaces.
- Tests document projection/embed round-trips for nullary and recursive ADTs along with recursion-aware mapping scenarios that delegate back through `unfold` builders.

#### D2 — Polynomial functor oracles + container bridge *(✅ delivered)*
- Polynomial helpers now ship roundtrip, map-position, and recursion-alignment oracles that surface counterexamples/failures with tag/field metadata.
- Each `defineADT` result exposes a categorical container view with natural transformations into/out of the polynomial functor plus registry-wired diagnostics.
- Tests document successful and failing oracle scenarios for recursive lists alongside container endofunctor usage.

#### D3 — Polynomial container law harness *(✅ delivered)*
- Polynomial containers now expose reusable naturality helpers (`id`, `whiskerLeft`, `whiskerRight`, `hcomp`) so higher-level categorical code can compose the induced endofunctors without manual casting.
- Functor-law diagnostics (identity/composition) execute directly against container adapters, surfacing counterexamples/failures and routing the reports through both the ADT surface and the shared algebra-oracle registry.
- Documentation and tests cover the new helpers alongside oracle success/failure cases, ensuring future categorical integrations can rely on stable behaviour.

#### E1 — Relative monad container integration *(✅ delivered)*
- Polynomial ADTs now expose a bridge into the relative monad toolkit that replays unit/multiplication behaviour by projecting and flattening polynomial values.
- Added container-bridge oracles under `RelativeMonadOracles.polynomialContainerBridge` that validate unit/multiplication naturality and catamorphism/anamorphism replay using ADT equality witnesses.
- Vitest coverage exercises successful and failing bridge scenarios, and the roadmap plus algebra oracle registry document the new diagnostics for downstream tooling.

#### E2 — Relative monad law harness *(✅ delivered)*
- Polynomial ADTs now expose a Street harness that replays extension/unit composites and sequential Kleisli binds against scenario expectations while reporting mismatches with constructor metadata.
- `RelativeMonadOracles.polynomialStreetHarness` and `AlgebraOracles.relative.analyzePolynomialStreetHarness` surface the analyzer so downstream tooling can reuse the Street diagnostics alongside the container bridge.
- Vitest coverage captures successful and failing Street scenarios, documenting how counterexamples and execution errors surface before enriched integrations land.

#### F1 — Street action registry integration *(⏭️ planned)*
- Persist the Street harness witness data so enriched and indexed adapters can recover executed composites without re-running scenarios.
- Thread the Street diagnostics through the broader relative-monad law enumerator, preparing the registry for enriched Street comparisons and oracle roll-ups.
- Update documentation/tests to describe the Street witness snapshots and highlight the new registry hooks for follow-up enriched tooling.

### Milestone C — Enriched integrations (future)
- Support parameterised ADTs and higher-order constructors (GADTs/indices) by layering constraints over the base schema.
- Connect ADT metadata to categorical libraries (e.g. build free polynomial functors, interpret ADTs inside target categories).
- Extend LAWS documentation with ADT-specific oracle coverage and add runnable examples bridging to relative monad tooling.

## 4. Immediate Implementation Tasks
- Capture persistent Street witness artefacts from the polynomial harness so enriched adapters can reuse them without recomputation.
- Extend the relative monad law enumerator to ingest Street harness reports and expose aggregated diagnostics through the registry facade.
- Document the Street witness workflow and seed tests that ensure future enriched/indexed integrations can read the recorded composites.

## 5. Testing and Quality Strategy
- Use Vitest for deterministic behavioural checks.
- Future phases will add property-based suites (via `fast-check`) once recursion and functorial features land.
- Each oracle introduced later will be registered through `scripts/gen-oracle-stubs.ts` to remain compatible with CI automation.

## 6. Open Questions (for later exploration)
- How to encode dependent indices (GADTs) while preserving exhaustiveness checking in TypeScript’s structural type system?
- Which categorical semantics (e.g. polynomial functors vs. containers) give the cleanest bridge to existing relative monad infrastructure?
- What ergonomics are needed for deriving JSON encoders/decoders or traversals from the same schema metadata?
