# Set Carrier Semantics Refactor Plan

## Overview

The Set category currently determines whether to eagerly materialize carriers or wrap them in a lazy guard by inspecting the cardinalities of the input sets. This heuristic is brittle for large finite sets, infinite constructions, and composite universes. The goal is to centralize the membership, iteration, and equality behaviour of carriers in an explicit `SetCarrierSemantics` abstraction so that every `Set` object is backed by a well-defined semantic witness regardless of finiteness.

## Guiding Principles

- **Explicit semantics first**: Every `Set` constructor must accept a `SetCarrierSemantics` instance; no implicit decision making based on cardinality or lookup tables.
- **Uniform lazy/eager surface**: Replace bespoke `LazySet` flags and guards with semantics plumbing that works for both materialized and streaming carriers.
- **Compatibility**: Maintain the existing `Set` API shape (`SetObj`, `SetHom`, etc.) while introducing new helpers for creating semantics-driven carriers.
- **Witness orientation**: Semantics objects should provide the data needed by universal constructions (membership, iteration, equality) so proofs can be mechanized for infinite carriers.

## Key Deliverables

1. `SetCarrierSemantics<A>` interface in `set-cat.ts` capturing:
   - `iterate(): IterableIterator<A>`
   - `has(value: A): boolean`
   - `equals(left: A, right: A): boolean` (with a default structural equality implementation when not provided)
   - Optional metadata such as `cardinality` or `tag` for debugging (forward compatible with existing diagnostics).
2. Refactor `LazySet` to wrap a `SetCarrierSemantics` instead of bespoke `iterate`/`has` closures, and expose helpers to build semantics for finite materialized carriers.
3. Update universal constructions (products, coproducts, exponentials, terminal/initial objects, power objects) to take a `SetCarrierSemantics` instance when constructing carrier sets.
4. Remove heuristic functions (`shouldMaterializeProduct`, `shouldMaterializeCoproduct`, `shouldMaterializeExponential`) in favour of semantics provided by callers.
5. Provide convenience factories (e.g., `finiteSemanticsFromElements`, `productSemantics`, `exponentialSemantics`) so existing call sites can transition incrementally without duplicating logic.
6. Ensure the subobject classifier witness exposes semantics-aware constructors and that `SetSubobjectClassifierWitness` methods accept semantics arguments.
7. Add regression coverage and documentation verifying that infinite carriers (streams, probabilistic adapters) retain correct membership/iteration semantics without hidden caches.

## Implementation Phases

### Phase 1: Foundations

1. Define `SetCarrierSemantics` and associated helper types in `set-cat.ts`.
2. Update `LazySetOptions` and the `LazySet` class to delegate to `SetCarrierSemantics`.
3. Introduce helper constructors for common cases (materialized finite sets, lazy sets, wrappers around existing `Set` instances).
4. Provide backwards-compatible shims so existing APIs that currently accept `LazySetOptions` can be migrated incrementally.

### Phase 2: Universal Constructions Migration

1. Refactor product/coproduct/exponential builders to require explicit semantics and return them as part of the universal data.
2. Replace heuristics with semantics constructors that encode the appropriate iteration/membership behaviour.
3. Ensure equality checks (e.g., caching, characteristic functions) use the semantics-provided equality predicate.

### Phase 3: Witness Integration and Cleanup

1. Update subobject classifier, power object, and other witnesses to pass semantics through.
2. Remove deprecated helpers and update exports to surface semantics constructors to downstream modules.
3. Add targeted tests/examples demonstrating infinite carriers and verifying membership/iteration correctness.

### Phase 4: Documentation and Follow-Up

1. Document the semantics abstraction in the Set category reference materials.
2. Audit dependent modules (e.g., `set-laws.ts`, `set-small-limits.ts`) for compatibility.
3. Plan follow-up tasks for modules requiring new semantics-based adapters (probabilistic sets, stream-based carriers).

## Current Status

This plan documents the architectural refactor required to move from heuristic-based carrier materialization to explicit semantics in the Set category. All four phases are now complete:

- **Phase 1:** The semantics interface, lazy carrier refactor, helper constructors, and registration utilities are in place.
- **Phase 2:** Products, coproducts, exponentials, power objects, canonical lazy carriers (pullback apexes, ℕ, small infinite products), and power-set witnesses (`SetLaws.powerSetEvidence`) register explicit semantics witnesses, eliminating the historical cardinality heuristics.
- **Phase 3:** Equalizers, pullbacks, subset tooling, monic/epic diagnostics, small products, and the natural numbers object consume the shared `semanticsAwareHas`/`semanticsAwareEquals` helpers so every witness honours registered carrier behaviour. Regression suites cover semantics-driven subsets, equalizers, pullbacks, small products, and induction.
- **Phase 4:** Reference materials now describe the semantics abstraction and demonstrate usage via `LAWS.md` and the Set usage cheat sheet. These updates, alongside the regression suites introduced throughout the rollout, provide the documentation and examples originally earmarked for the final phase.

With the semantics abstraction documented and threaded through the Set ecosystem, follow-up efforts can focus on optional adapters (e.g., alternate set-theoretic foundations) without further changes to the core `SetCat` APIs.
