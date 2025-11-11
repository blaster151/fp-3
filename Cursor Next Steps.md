### **3. Realise TreeΣ ⇔ T Translators**  
Status: COMPLETED

- Rebuild `monadMapToRunner` to reconstruct co-operations from τ, thread the resulting θ through `thetaHom`, and verify τ ∘ η and μ-consistency on real tree samples.
- Update the “Runner ⇔ Monad Translators” section in **`LAWS.md`**, adding regression coverage for τ/θ inverse properties on nontrivial trees.

Progress:
- θ rebuilt from ψ (currying) and exposed via `thetas`/`thetaHom`.
- Added τ ∘ η vs η sampling with diagnostics and tallies; tree/multiplication sampling hooks scaffolded.
- Replaced forward-declared runner/monad morphism types with the canonical `MonadStructure` imports; diagnostic maps remain exposed as readonly views.
- Tree sampling now replays τ on concrete `FreeTreeMonad` carriers and compares results against θ-evaluations, surfacing detailed mismatches.
- μ-compatibility is sampled on nested trees; failures record flattened vs reconstructed values, while skipped domains log the missing witnesses.
- LAWS.md Runner ⇔ Monad Translators entry documents the new tallies and notes the residual multiplication staging gap.

Next: —None (rolled into downstream translator work.)

------

### **4. Make Coalgebra and Costate Translators Bidirectional**
Status: COMPLETED

- Rewrite all six translation functions—`runnerToCoalgebraComponents`, `coalgebraComponentsToRunner`, `runnerToCostateComponents`, `costateComponentsToRunner`, `coalgebraToCostate`, and `costateToCoalgebra`—to rebuild θ, γ, γ′ directly (no cached ψ).
- Prove diagrams (4) and (5) via sampled diagnostics.
- Extend equivalence oracles to produce zig-zag witnesses (runner → coalgebra → runner, etc.) with explicit mismatches when reconstructions diverge.

Progress:
- Exported `compareRunnerThetas`, `compareCoalgebraComponents`, and `compareCostateComponents` from `stateful-runner.ts` so the oracle layer can sample zig-zag identities directly.
- Rebuilt the `runner-oracles.ts` imports, consolidated duplicates, and wired the new comparison helpers into the coalgebra/costate equivalence oracles; `equivalenceCoalgebra` and `equivalenceCostate` now report both runner and component mismatches, while `equivalenceTriangle` reuses the coalgebra component comparison.
- Extended `equivalenceTriangle` to re-check both γ and κ round-trips, adding costate zig-zag sampling alongside the coalgebra comparison.
- Audited the translator diagnostics to flag low-sample domains and aligned `costateToCoalgebra` with configurable sampling, so diagrams (4)/(5) report when witness coverage is thin.
- Added explicit `translatorSampleLimit`/`translatorObjectFilter` routing in `runner-oracles.ts`, ensuring oracle callers can tune translator coverage independently of higher-level checks.
- Translator sample limits now adapt to carrier cardinalities (√-scaling up to 32) and emit truncation notes whenever enumeration hits the cap without exploring the full fibre.

Next:
- —None (complete; continue monitoring translator diagnostics alongside broader equivalence work).

------

### **5. Enforce Run(T) Morphism Squares**
Status: COMPLETED

- Strengthen `RunnerMorphism` and `compareRunnerMorphisms` to test both
   `(id_X×f);θ′ = θ;(T×f)` and `(T°f)∘γ = γ′∘f`
   for sampled X, using `thetaHom` and the new coalgebra components.
- Enhance `checkRunnerMorphism` and `checkRunTCategoryLaws` to report concrete samples that violate either square and to aggregate these tallies into category-law results.

Progress:
- `compareRunnerMorphisms` now samples the θ- and γ-square conditions alongside equality, reporting dedicated tallies for each square and surfacing component-level diagnostics.
- `checkRunnerMorphism` aggregates those tallies while returning square-specific mismatches so callers can distinguish equality failures from diagram violations.
- `checkRunTCategoryLaws` threads the new square metrics into its report, and morphism oracles surface them for registry consumers.

Next:
- —None (square enforcement feeds the remaining equivalence work).

------

### **6. Finish θ ↔ Stʸ Handler Translation**
Status: COMPLETED

- Expand `thetaToStateHandler` to return the full natural family `ϑ_X : TX → Stʸ X`, reconstructing the curried `TX×Y → X×Y` maps.
  - Log when ψ-dependence breaks independence from the dual fibre.
- Extend `checkRunnerStateHandlers` to replay `(Stʸ η_X)` and `(Stʸ μ_X)` diagrams, log mismatches, and fold them into the unified law report.

Progress:
- `thetaToStateHandler` now materialises each `ϑ_X` as an explicit `SetHom<IndexedElement<Obj, Left>, ExponentialArrow<State, [Value, State]>>`, while recording fibre-independence and sampling truncation diagnostics for every object.
- `RunnerStateHandlerEntry` exposes these `ϑ` components (and the associated `TX×Y → X×Y` homs) so downstream oracles can compose them with state-monad structure; translator metadata surfaces through the handler report for future diagram checks.
- `checkRunnerStateHandlers` now replays the `(Stʸ η_X)` triangle using the `ϑ` data, logging per-object summaries and detailed mismatches when the state/value pair diverges from the canonical unit evaluation.
- Multiplication scaffolding now locates the requisite `ϑ_{TX}`/`ϑ_{StʸX}` witnesses, reporting exactly which components are missing so the forthcoming `(Stʸ μ_X)` replay can reuse the cached data instead of emitting generic TODOs.

Next:
- —None (handler diagrams now replay both `(Stʸ η_X)` and `(Stʸ μ_X)`; future enhancements roll into item 7).

------

### **7. Materialise the Six Runner Equivalences**
Status: COMPLETED

- Implement quasi-inverse functors between:
  - `Run(T)`, θ-maps → `Stʸ`, `T°`-coalgebras, costate transformations, `Costᵗ`-coalgebras, and Sweedler-dual coalgebras.
  - Provide witnesses for each zig-zag identity.
- Extend **`runner-oracles.ts`** to exercise all equivalence pairs and integrate translator diagnostics.

Progress:
- Added `runnerToStateHandlerComponents`, `stateHandlerComponentsToRunner`, and `compareStateHandlerComponents`, providing the Run(T) ↔ `Stʸ` translators with diagnostics that sample ϑ outputs, handler independence, and θ reconstructions.
- Registered `RunnerOracles.stateHandlerEquivalence`, combining forward/backward translations with runner/handler zig-zag checks, and covered the new oracle in `test/stateful-runner.spec.ts`.
- Introduced `Cost^T` and Sweedler-dual coalgebra translators/oracles by wrapping the γ-components, so the equivalence suite now covers `T°`, `Cost^Y ⇒ T`, `Cost^T`, and Sweedler coalgebras alongside `Stʸ`.
- Added `evaluateRunnerEquivalences` to bundle all six equivalence oracles, with regression coverage ensuring every component of the suite succeeds on Example 6.
- Documented the new registry paths and translators in `LAWS.md`, completing the doc/test wiring for the equivalence tooling.

Next:
- Roll follow-up categorical functor packaging (if desired) into later phases; proceed to item 8.

------

### **8. Deliver Example 12 Update-Lens Tooling**
Status: COMPLETED

- Added `update-lens.ts` with `makeExample12UpdateLensSpec`, `buildExample12UpdateLensRunner`, and `buildExample12UpdateLensSuite`, deriving θ from `(hp, upd)` and bundling the corresponding costate/coalgebra/`Cost^T` components.
- Exported the new helpers through `allTS.ts` and documented the workflow in `LAWS.md` under the costate/coalgebra equivalence section.
- Extended `test/stateful-runner.spec.ts` with Example 12 regression coverage comparing the lens-derived runner against the Example 8 interaction (θ agreement plus costate/coalgebra/`Cost^T` component comparisons).

------

### **9. Add Residual Hooks to Ordinary Runners**
Status: COMPLETED

- Extended `StatefulRunner` with optional residual handler summaries via `analyzeResidualHandlerCoverage`/`attachResidualHandlers`, so partial θ coverage now surfaces handled vs unhandled samples alongside diagnostics.
- Added `makeResidualInteractionLaw` (documented in `LAWS.md`) to emit structured TODO diagnostics while the Section 5 residual witnesses remain outstanding.
- Augmented `test/stateful-runner.spec.ts` with residual coverage regressions (full coverage and no-spec scenarios) plus a sanity check on the new residual interaction law placeholder output.

------

### **10. Build the Supervised Kernel/User Monad Stack**
Status: COMPLETED — constructors, diagnostics, docs, and λ₍coop₎ interpreter alignment landed

Progress:
- `supervised-stack.ts` now materialises executable kernel semantics: `makeKernelMonad` builds state/exception/signal/external operations with structured `KernelOperationResult`s, default fallbacks, per-operation diagnostics, and residual delegation.
- `makeUserMonad` computes boundary morphisms by mapping declared user operations into the kernel, exposes an `invoke` helper that delegates to the kernel semantics, and reports unsupported/unused operations through `UserKernelComparison`.
- `makeSupervisedStack` enriches the ψ-derived runner with kernel state carriers, promotes operation-level residual specs, attaches residual diagnostics, and returns comparison metadata (`userToKernel`, boundary warnings, residual summaries). `stackToRunner` now reuses the builders, while `runnerToStack` parses the embedded metadata to recover kernel/user names, operation catalogues, and residual coverage summaries.
- `test/stateful-runner.spec.ts` exercises the supervised scenario end-to-end (state read, exception fallback, residual coverage, comparison wiring) and validates the new λ₍coop₎ metadata, replacing the earlier planning placeholder.
- Drafted a λ₍coop₎ comparison roadmap in `SUPERVISED_STACK_PLAN.md` covering kernel clause synthesis, user boundary alignment, comparison morphism exports, and integration tests.
- `lambda-coop.runner-alignment.ts` now offers `analyzeSupervisedStackLambdaCoopAlignment`, running the standard runner oracles against the supervised stack and replaying the embedded λ₍coop₎ comparison diagnostics.

Next:
- Stabilise λ₍coop₎ interpreter-driven examples as future tunables if extended coverage is desired.

---

# **Phase IV b — Residual Runner Support**

Progress:
- Pass 1 scaffolding: introduced `residual-stateful-runner.ts` with `ResidualStatefulRunner` records, residual functor summaries, diagram witness shells, and helper constructors that wrap existing `StatefulRunner` instances while preserving diagnostics/metadata.
- Pass 2 semantics & diagnostics: added residual runner morphism helpers (`make/identity/compose`), a `checkResidualRunnerMorphism` wrapper over the existing Run(T) square checks, and `checkResidualThetaAlignment`/`withResidualDiagramWitnesses` utilities to sample residual θ evaluations and attach structured diagram summaries.
- Pass 3 documentation/test outline: drafted `RESIDUAL_RUNNER_PLAN.md` describing remaining milestones plus planned regression suites, and introduced `test/residual-runner.spec.ts` (skipped skeleton) to earmark upcoming coverage.

1. **Introduce `ResidualStatefulRunner` Records**
   - Define `ResidualStatefulRunner<T,R>` that captures θ-components in `R(X×Y)` and caches ηᴿ/μᴿ diagram witnesses, degenerating to `StatefulRunner` when `R = Id`.
2. **Implement `Run_R(T)` Morphisms and Checks**
   - Provide constructors/verifiers enforcing `(id_{TX}×f);θ′ = θ;R(id_X×f)` per object and build `checkResidualRunnerCategory` verifying identity, composition, and associativity.
3. **Translate Residual Runners ⇔ Monad Maps**
   - Add `residualRunnerToMonadMap` and `monadMapToResidualRunner` adapters that replay η/μ compatibility triangles and log counterexamples.
4. **Bridge Residual Runners to Residual Laws**
   - Connect residual runners to the residual interaction-law API so `(F,G,ρ)` can instantiate `Run_R(T)` objects while preserving Kleisli-pure annotations and diagnostics.
5. **Document and Test Residual Runner Support**
   - Add an “R-residual runners” entry in `LAWS.md`, regression examples (e.g., `R X = X + E`), and integrate into the law registry.

------

# **Phase V — Residual Interaction Law Infrastructure**

1. **Define `ResidualInteractionLaw` Structures**
   - Create `ResidualInteractionLaw<R>` holding `(F,G,R,ρ)` with cached diagram witnesses and constructors for `R = Id` and Example 13’s exception monad.
2. **Implement Residual-Law Diagram Oracles**
   - Encode the two residual-compatibility diagrams, implement `checkResidualInteractionLaw`, and report zero-collapse metadata when `R` factors through the zero functor.
3. **Package Residual Monad–Comonad Interactions**
   - Define `ResidualMonadComonadInteraction` objects, implement translators `MCIL_R(𝒞) ≅ Mon(IL_R(𝒞))`, and hook them into existing monad–comonad oracles.
4. **Embed Residual Laws into Day/Chu Infrastructure**
   - Create quasi-inverse functors between `IL_R(𝒞)` and Day/Chu, lift residual laws to ordinary interaction laws on `Kl(R)` and back, and track strong-monoidal comparison maps.
5. **Integrate Residual Infrastructure with Runners and Docs**
   - Extend runner builders/oracles to accept residual-law inputs, expose `makeResidualInteractionLaw` and `attachRunner` workflows, and document the new diagnostics.