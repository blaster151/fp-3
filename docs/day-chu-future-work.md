# Day–Chu Future Work Registry

This registry captures the Section 8 open questions that remain after the
current Day–Chu passes.  Each entry records the motivating question, the
observable signals already available in the codebase, concrete experiments that
should guide future investigations, and review triggers tied to the remaining
phases of the roadmap.

## Summary table

| Label | Open question | Observable signals | Proposed experiments | Review trigger | Status |
| --- | --- | --- | --- | --- | --- |
| FW-1 | **General Sweedler dual computation.** Can the Section 5 Sweedler
tools scale beyond the curated Example 6/14 data sets? | `interactionLawMonoidToSweedlerDual`, `sweedlerDualOfFreeMonoid`,
`sweedlerDualOfMonoidQuotient`, Example 6/14 regressions. | Measure how often
`interactionLawMonoidToSweedlerDual` needs bespoke translators when run over new
interaction laws (e.g., the glueing suite) and record failure witnesses.  Extend
the Example 6 runner suites so the Sweedler-derived coalgebras feed directly into
λ₍coop₎ supervised stacks. | After each new monad–comonad law is packaged
(Phase VI glueing, Phase VII session-type runners). | *Open.* Aggregations exist,
but no automated sweep over the glueing examples yet. |
| FW-2 | **Cooperation/coeuation semantics.** Can the runner-cooperation
coeuation framework explain the Section 8 anomalies? | `checkSessionTypeRunnerEvaluationAgainstInteraction`,
`lambda-coop.runner-alignment.ts` metadata, Example 8 regressions. | Use the
session-type runner helper to annotate λ₍coop₎ alignment reports with
`sessionType.runner.*` metadata.  Track mismatches between θ clauses and
`ev_Y` witnesses to understand where cooperation laws fail. | After each Phase IV
supervised-stack milestone and whenever session-type runners are materialised. |
*In progress.* Helper emits diagnostics and the λ₍coop₎ alignment summary now records the `sessionType.*` metadata/notes automatically. |
| FW-3 | **Linear vs. intuitionistic duality.** Under what conditions do the
syntactic dual `A°` and semantic dual from `dualInteractionLaw` diverge? |
`dualSessionType`, `checkSessionTypeDuality`, Example 8 interpreter fixtures. |
Run `checkSessionTypeDuality` over the Example 8 runner suite plus any future
session-type literals inferred from λ₍coop₎ stacks.  Record counterexamples in
this registry (with channel/sample provenance) so later phases know which
semantic environments break involutivity. | After the Phase VII runner
synthesis pass and whenever new interpreters are introduced. | *No
counterexamples recorded yet.* |
| FW-4 | **Session-type calculus for λ₍coop₎.** Can the interaction-law
calculus generate session-type-driven runners automatically? |
`session-type-runner.ts`, `lambda-coop-supervised-stack.ts`,
`session-type-glueing.examples.ts`, `examples/runnable/104-session-type-glueing-stack.ts`, Example 6/8 regressions. | Compose
`checkSessionTypeRunnerEvaluationAgainstInteraction` with
`makeGlueingSupervisedStack` (or `makeSessionTypeGlueingSupervisedStack`
fed by `makeExample8GlueingBridge`) to benchmark how well session-type
specifications reconstruct existing λ₍coop₎ stacks.  Use the runnable CLI
(`npm run examples:runnable -- 104`) to capture logs outside the test
suite and exploit mismatches to prioritise interpreter extensions (e.g.,
additional θ clauses or boundary diagnostics). | Triggered at the start and
end of Phase VII and whenever a new supervised-stack runner is
introduced. | *In progress.* `makeSessionTypeSupervisedStack` now emits
supervised stacks with canonical `sessionType.*` metadata,
`analyzeSessionTypeSupervisedStackLambdaCoopAlignment` threads that
telemetry into the λ₍coop₎ alignment reports automatically,
`makeSessionTypeGlueingSupervisedStack` composes the helper with the
glueing bridge so Example 8 stacks surface both `sessionType.*` and
`Glueing.*` diagnostics, `makeExample8GlueingBridge` publishes the Example 8
glueing telemetry as a reusable fixture, and the runnable helper
`examples/runnable/104-session-type-glueing-stack.ts` exposes the combined
telemetry via `npm run examples:runnable -- 104`.  The CLI now honours
`--session-type`, `--assignment` / `--assignment-json`, and
`--glueing-span` flags so FW-4 experiments can be reconfigured without
editing TypeScript; runnable Example 105
(`examples/runnable/105-session-type-glueing-sweep.ts`) adds sweep/diff/
manifest support, enforces manifest-queue gating for both explicit and
automatic `.issues.json` outputs, records blocked suggestions via
`blockedSuggestedManifestWrites`, captures skipped queued replays through
`blockedQueuedManifestInputs` / `manifestQueue.blockedInputs`, captures the
would-be manifest entries under `blockedManifestPlans`, and the
dashboard/consumer helpers now surface those arrays so stale coverage and the
corresponding refresh plan are visible even when reviewing recorded artifacts.
Example 105 also accepts `--sweep-blocked-plan-input` so replayed manifests log
`generatedManifests` entries with `mode: "plan"`, emits
`appliedBlockedManifestPlans` metadata, and now normalises each blocked-plan
entry into a sweep configuration so the regenerated manifests immediately run
and appear in the dashboard/diff telemetry via
`appliedBlockedManifestPlanSweeps`.  The helper ships with the
`session-type:manifest-queue:test` script so reviewers can refresh the sentinel
before replaying blocked plans. |
| | |

### FW-4 workflow quick reference

- Run `npm run session-type:manifest-queue:test` before invoking
  `--sweep-manifest`, `--sweep-diff`, or `--sweep-blocked-plan-input` so the CLI
  can verify manifest-queue coverage and explain any overrides directly in the
  recorded metadata.
- `npm run examples:runnable -- 105 --sweep-blocked-plan-input=<record.json>` can
  be combined with `--sweep-manifest`, `--sweep-diff`, and `--sweep-manifest-input`
  during the same run; Example 105 records the regenerated manifests,
  consumer-diff summaries, and blocked-plan sweeps in every output file so FW-4
  reviewers only need one CLI invocation.
- Pass `--help` to Example 105 when in doubt: the runnable now prints the
  manifest-queue workflow, supported flag combinations, and sentinel reminders
  before running anything so reviewers can double-check the process without
  re-reading the planning docs.
- The Example 105 runnable summary and README now spell out the manifest-queue
  gating workflow (including the `session-type:manifest-queue:test` helper), and
  the catalogue summary explicitly calls out the `--help` workflow reminder so
  `npm run examples:runnable -- --list` and CLI runs advertise the expected
  sentinel refresh steps before any manifests or blocked plans are replayed.
- Recorded sweep files capture `generatedManifests`, manifest queue telemetry,
  and blocked-plan metadata, so rerunning the CLI is unnecessary when sharing
  FW-4 evidence with other reviewers.
- Sweep records, dashboard summaries, and FW‑4 diff consumer outputs now expose
  `sourceCoverage` counts (`manifestInputs` vs `blockedPlans`), making it easy to
  confirm that both data sources were exercised without parsing the CLI log.

## Review cadence

- **Post–Phase IV (supervised stacks).** Verify the λ₍coop₎ alignment summaries
include any session-type metadata that is available and file counterexamples to
FW-2/FW-4.
- **Post–Phase VI (glueing + Sweedler).** Re-run the Sweedler aggregation over
all glueing examples; update FW-1 with the proportion of interaction laws that
need custom translators.
- **Post–Phase VII (session-type runners).** Record whether the runner synthesis
pipeline eliminates the FW-2/FW-4 anomalies or whether additional interpreter
passes are needed.

## Reference materials

- `session-type.ts` (grammar, interpreters, duality oracle)
- `session-type-runner.ts` (runner evaluation helper)
- `session-type-glueing.examples.ts` (Example 8 glueing summary/bridge fixture)
- `lambda-coop-supervised-stack.ts` and `glueing-supervised-stack.ts` (λ₍coop₎
  stack evaluation and glueing adapters)
- `DAY_CHU_IMPLEMENTATION_PLAN.md` §7 (Phase VII roadmap)
- `LAWS.md` §"Session-type grammar" and §"λ₍coop₎" (law references)

