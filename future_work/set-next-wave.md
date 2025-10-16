# Set Theory Next-Wave Opportunities

With SetCat now exposing finite products/coproducts and SetMult able to ingest plain Set objects, the next wave can focus on wiring higher-order structure, richer oracles, and Set-backed infinite constructions into the shared tooling stack.

## Quick hits
- Lift SetCat to a cartesian closed toolkit so higher-order morphisms integrate with the SetMult/Markov adapters.
- Promote Set universal-property oracles that pair witnesses with the new product/coproduct helpers.
- Specialise semicartesian infinite products to Set so deterministic families inherit executable diagnostics.
- Align Set laws/oracles with deterministic Markov tooling to keep metadata, witnesses, and diagnostics in sync.

## 1. Cartesian Closed Structure Helpers

Set already forms a cartesian closed category, yet `set-cat.ts` still stops at objects, morphisms, and composition. 【F:set-cat.ts†L1-L57】 Extending the API with exponentials and currying lets downstream stacks reason about higher-order Set morphisms.

:::task-stub{title="Add SetCat exponentials and currying"}
1. Introduce `exponential`, `evaluate`, and `curry`/`uncurry` helpers in `set-cat.ts`, mirroring the existing `hom` shape and validating domains/codomains before returning witnesses.
2. Export deterministic wrappers that package the evaluation/currying maps as SetMult objects so `setmult-category.ts` can reuse them when proving higher-order determinism. 【F:setmult-category.ts†L1-L120】
3. Expand `test/set-cat.spec.ts` (and neighbouring SetMult tests) with Vitest coverage that certifies the exponential universal property plus curry/uncurry round-trips.
:::

## 2. Universal-Property Oracles for Set

`oracles/set-oracles.ts` currently focuses on cardinality characterisations (empty, singleton, elements-as-arrows). 【F:oracles/set-oracles.ts†L1-L114】 Now that SetCat ships product/coproduct constructors, we can provide oracle builders that certify their universal properties instead of relying on manual reasoning.

:::task-stub{title="Enrich Set oracles with product/coproduct witnesses"}
1. Add witness constructors that bundle projections/injections with mediators, using `category-limits-helpers.ts` to assemble componentwise checks for Set’s binary products and coproducts. 【F:category-limits-helpers.ts†L1-L110】
2. Update the oracle registry so Set consumers can request these witnesses directly (e.g., `SetOracles.product`, `SetOracles.coproduct`), falling back to the existing hom-count diagnostics when necessary.
3. Extend `test/set-oracles.spec.ts` and refresh Set entries in `LAWS.md` to show the new oracles catching compatibility violations and certifying success cases.
:::

## 3. Infinite Product Bridges Backed by Set Samples

The semicartesian infinite-product module already offers witness/oracle infrastructure for arbitrary semicartesian categories. 【F:semicartesian-infinite-product.ts†L1-L200】 What’s missing is a Set-specialised adapter that feeds its diagrams and projections with Set objects and uses the `samples` metadata from SetMult carriers. 【F:setmult-category.ts†L1-L75】

:::task-stub{title="Specialise semicartesian infinite products to Set"}
1. Build a `setSemicartesianProductWitness` (or similar) helper that instantiates `SemicartesianProductWitness` using SetCat products and SetMult equality/show hooks, harvesting samples to drive diagnostics automatically.
2. Thread the helper into `setmult-category.ts` so deterministic families defined over Set indices receive infinite-product witnesses without duplicating projection code.
3. Add regression coverage that shows Set-backed cones satisfying `checkSemicartesianProductCone` and `checkSemicartesianUniversalProperty`, including counterexamples when mediators or restrictions misbehave.
:::

## 4. Synchronise Set Laws with Deterministic Markov Tooling

`set-laws.ts` still mirrors the older hom-count proofs, while deterministic Markov utilities already depend on SetMult witnesses for copy/discard and determinism checks. 【F:set-laws.ts†L1-L27】【F:markov-deterministic-structure.ts†L1-L120】 Refreshing the Set law surface to delegate to the new oracles keeps Set and Markov diagnostics aligned and reduces duplicated logic.

:::task-stub{title="Unify Set laws/oracles with deterministic adapters"}
1. Refactor `set-laws.ts` so exported helpers delegate to the richer oracles (e.g., reuse product/coproduct witnesses instead of standalone functions) and surface shared witness/report types.
2. Teach `markov-deterministic-structure.ts` and neighbouring deterministic helpers to prefer Set-backed metadata when available, ensuring `setMultObjFromSet` and the new exponential helpers provide deterministic bases automatically.
3. Update determinism law specs to exercise both Fin- and Set-driven witnesses, confirming that diagnostics stay consistent across the upgraded oracles.
:::

These upgrades push the Set backend beyond plain function composition, making exponentials, universal properties, and infinite products first-class citizens for deterministic and semicartesian workflows.
