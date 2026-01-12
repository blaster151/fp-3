# Consolidated Day–Chu / Session-Type Work Plan

This document consolidates the active planning threads previously spread across
`Cursor Next Steps.md`, `DAY_CHU_IMPLEMENTATION_PLAN.md`,
`SUPERVISED_STACK_PLAN.md`, `docs/day-chu-future-work.md`, and `LAWS.md`.
It focuses on **small, story-sized action items** ordered by dependency.

## Active Sources (for reference only)
- Cursor Next Steps (Phase VII execution log and queue)
- Day–Chu Implementation Plan (longer-horizon phases)
- Supervised Stack Plan (Phase IVc exit criteria + alignment details)
- Day–Chu Future Work Registry (Section 8 experiments)
- LAWS (canonical diagnostics + telemetry references)

---

## Ordered Action Items

### 1) Close remaining Phase IVb residual-runner backlog
**Goal:** Finish residual-runner translations and regression coverage before any new
session-type automation depends on it.
- Document Run₍R₎(T) adapters and the residual-runner translators.
- Expand residual-runner regression suites to cover the remaining morphism/adapter paths.

### 2) Stabilize Phase VII session-type runner specs for supervised stacks
**Goal:** Ensure interpreter-derived runner specs and evaluation summaries are consumed
uniformly by supervised-stack generators and dashboards.
- Keep `sessionType.runnerSpec.*` metadata and notes flowing through
  `makeSessionTypeSupervisedStack` and alignment summaries.
- Confirm runner-spec nodes remain stable under format changes (channel ordering,
  assignment normalization, and metadata string formats).

### 3) Registry-driven session-type-to-supervised-stack generation
**Goal:** Use the Section 8 registry to scope the automatic session-type → stack pipeline,
so Example 8-style runners can be reified without manual wiring.
- Use the registry’s FW-4 experiments as the canonical to-do list for session-type
  runner synthesis and glueing-bridge composition.
- Keep registry entries and runnable helpers in sync so the CLI can be driven by
  registry-backed configurations.

### 4) Section 8 future-work experiments (registry-driven)
**Goal:** Treat each FW entry as a discrete experiment with a clear output artifact.
- **FW-1 (Sweedler dual scale-up):** Sweep new interaction laws and record failures.
- **FW-2 (Cooperation/coevaluation):** Compare θ vs. ev_Y mismatches and persist
  diagnostics.
- **FW-3 (Duality divergence):** Capture counterexamples where semantic duals diverge.
- **FW-4 (Session-type calculus):** Use Example 8 glueing + session-type stacks to
  reify runners and compare alignment outputs.

### 5) Phase XI–XVI semantics pipeline (long-horizon but ordered)
**Goal:** Complete the λ₍coop₎ interpreter pipeline in a coherent order.
- **Phase XI:** Operational runner calculus (user/kernel runners + laws).
- **Phase XII:** Denotational semantics (semantic domains + coherence).
- **Phase XIII:** Skeletal semantics (erased/effect-free scaffold).
- **Phase XIV:** Law-enforcing runner subsets (validation + diagnostics).
- **Phase XV:** Interpretation functions (values/computations).
- **Phase XVI:** Coherence/soundness/finalization guarantees.

### 6) Phase XVII–XVIII effects + kernel stabilization
**Goal:** Finalize handler/trace machinery and kernel interfaces so higher-level
automation can depend on a stable execution model.
- **Phase XVII:** Effects/handlers/trace-driven execution.
- **Phase XVIII:** Kernel stabilization patch (interface + conformance harness).

---

## Notes on Ordering
- Phase IVb residual-runner closure remains a prerequisite for the remaining
  Phase VII automation and future λ₍coop₎ semantics work.
- The Section 8 registry is the single source of truth for session-type
  experimentation; any new session-type runnable should list its registry
  mapping explicitly.
- Phase XI–XVIII work is intentionally staged after the supervised-stack and
  session-type runner pipeline stabilizes.
