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
Status: IN PROGRESS

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
- Exercise the adaptive sampling heuristics against large carriers to validate the current cap/clamp strategy before considering higher default limits.

------

### **5. Enforce Run(T) Morphism Squares**

- Strengthen `RunnerMorphism` and `compareRunnerMorphisms` to test both
   `(id_X×f);θ′ = θ;(T×f)` and `(T°f)∘γ = γ′∘f`
   for sampled X, using `thetaHom` and the new coalgebra components.
- Enhance `checkRunnerMorphism` and `checkRunTCategoryLaws` to report concrete samples that violate either square and to aggregate these tallies into category-law results.

------

### **6. Finish θ ↔ Stʸ Handler Translation**

- Expand `thetaToStateHandler` to return the full natural family `ϑ_X : TX → Stʸ X`, reconstructing the curried `TX×Y → X×Y` maps.
  - Log when ψ-dependence breaks independence from the dual fibre.
- Extend `checkRunnerStateHandlers` to replay `(Stʸ η_X)` and `(Stʸ μ_X)` diagrams, log mismatches, and fold them into the unified law report.

Progress:
- `thetaToStateHandler` now materialises each `ϑ_X` as an explicit `SetHom<IndexedElement<Obj, Left>, ExponentialArrow<State, [Value, State]>>`, while recording fibre-independence and sampling truncation diagnostics for every object.
- `RunnerStateHandlerEntry` exposes these `ϑ` components (and the associated `TX×Y → X×Y` homs) so downstream oracles can compose them with state-monad structure; translator metadata surfaces through the handler report for future diagram checks.
- `checkRunnerStateHandlers` now replays the `(Stʸ η_X)` triangle using the `ϑ` data, logging per-object summaries and detailed mismatches when the state/value pair diverges from the canonical unit evaluation.
- Multiplication scaffolding now locates the requisite `ϑ_{TX}`/`ϑ_{StʸX}` witnesses, reporting exactly which components are missing so the forthcoming `(Stʸ μ_X)` replay can reuse the cached data instead of emitting generic TODOs.

Next:
- Implement the `(Stʸ μ_X)` replay using the collected `ϑ` witnesses, comparing both sides of the diagram and folding the tallies into the unified law report.

------

### **7. Materialise the Six Runner Equivalences**

- Implement quasi-inverse functors between:
  - `Run(T)`, θ-maps → `Stʸ`, `T°`-coalgebras, costate transformations, `Costᵗ`-coalgebras, and Sweedler-dual coalgebras.
  - Provide witnesses for each zig-zag identity.
- Extend **`runner-oracles.ts`** to exercise all equivalence pairs and integrate translator diagnostics.

------

### **8. Deliver Example 12 Update-Lens Tooling**

- Add a module packaging lenses `(hp, upd)` into runners of the update monad.
  - Export costate/coalgebra translations and verify the bijection among lenses, runners, costate maps, and `T°`-coalgebras through dedicated oracles.
- Supply regression cases showing round-trip equivalence between lens data and runner diagnostics, and register documentation/oracle entries.

------

### **9. Add Residual Hooks to Ordinary Runners**

- Extend `StatefulRunner` with residual metadata (`residualFunctor`, partial θ domains, etc.).
  - Implement `makeResidualInteractionLaw` and `attachRunner` scaffolding that logs unsupported effects instead of placeholders.
- Update **`LAWS.md`** and runner oracles to describe residual compatibility checks and TODO diagnostics pending full support.

------

### **10. Build the Supervised Kernel/User Monad Stack**

- Implement kernel monads combining **state**, **exception**, and **signal** signatures with external effects, alongside user monads that supervise them.
  - Expose comparison morphisms defining the supervised boundary.
- Integrate λ₍coop₎’s front end with these monads so sample programs (like the file-handle scenario) type-check, execute, and emit resource/finalisation diagnostics.

---

# **Phase IV b — Residual Runner Support**

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