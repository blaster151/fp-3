# Phase IV c — Supervised Kernel/User Stack Roadmap

_Phase IV c extends the supervised stack builders delivered in Phase IV b by aligning
them with the λ₍coop₎ calculus and recording inverse translations back into stack
constructors. With the residual runner layer closed out, the outstanding work for
DAY_CHU_IMPLEMENTATION_PLAN §4 focuses on λ₍coop₎ clause synthesis, interpreter parity,
and round-trip metadata recovery._

## 1. Scope and Current Assets
- **Supervised stack constructors** (`makeKernelMonad`, `makeUserMonad`,
  `makeSupervisedStack`, `stackToRunner`, `runnerToStack`) materialise Example 6
  with residual diagnostics and λ₍coop₎ metadata stubs.
- **λ₍coop₎ infrastructure** (`lambda-coop.ts`, `lambda-coop.runner-alignment.ts`,
  `buildLambdaCoopComparisonArtifacts`) converts kernel operations into runner
  clauses and drives interpreter evaluations.
- **Residual integration**: Phase IV b exposed residual handler summaries and
  ensured `supervised-stack` annotates runners with residual metadata.

The remaining work orchestrates these pieces into the λ₍coop₎ alignment and
inverse translation workflows promised in the Phase IV roadmap. Each pass below
lists concrete edits, diagnostics, and regression hooks so contributors can land
changes incrementally while keeping `Cursor Next Steps.md` and the DAY_CHU plan
in sync.

## 2. Pass 1 — λ₍coop₎ Clause Enrichment

**Objective:** close the metadata gap between kernel operation specs and the
λ₍coop₎ runner literal.

**Implementation tasks**
- Extend `buildLambdaCoopComparisonArtifacts` to emit clause bundles containing
  argument/return typing, state carrier labels, and residual fallbacks sourced
  from `KernelOperationImplementation`/`ResidualHandlerSummary`.
- Thread the enriched bundles through `makeSupervisedStack` so
  `lambdaCoopComparison.runnerLiteral` mirrors kernel semantics (state reads,
  exception signalling, residual hand-offs) and carries per-clause provenance.
- Update `supervised-stack.ts` types so clause metadata is strongly typed (e.g.,
  discriminated unions for operation kinds) and exposed through
  `makeSupervisedStack`/`stackToRunner` return values.

**Diagnostics & documentation**
- Surface clause-level provenance and residual notes in
  `lambdaCoopComparison.metadata`, capturing both the originating operation name
  and any residual delegation notes.
- Document the new metadata fields in this plan’s Pass 1 notes and
  queue a `Cursor Next Steps.md` entry marking Pass 1 as complete once merged.

**Acceptance tests**
- Extend the Example 6 coverage in `test/stateful-runner.spec.ts` to assert that
  generated λ₍coop₎ clauses enumerate the enriched metadata (argument types,
  state carriers, residual fallbacks).

> _Status update:_ Clause bundles now surface state carriers, residual coverage,
> and explicit parameter/result type metadata that the Example 6 stack tests
> assert; the next tightening can focus on richer witness extraction. Canonical
> λ₍coop₎ argument and return witnesses now accompany each clause bundle, the
> comparison metadata records those samples, and Example 6 asserts both the
> witness objects and their serialised metadata.

## 3. Pass 2 — Alignment Diagnostics & Interpreter Coverage

**Objective:** align comparison tooling with the enriched metadata and ensure
λ₍coop₎ interpreter runs stay in lock-step with supervised stack diagnostics.

**Implementation tasks**
- Upgrade the comparison step to retain full boundary witnesses:
  `unsupportedByKernel`, `unacknowledgedByUser`, partial coverage notes, and
  interpreter expectations. Attach these to
  `lambdaCoopComparison.metadata`/`issues`.
- Enrich `analyzeSupervisedStackLambdaCoopAlignment` with a consolidated report
  (runner resource table, interpreter evaluation summary, clause provenance).
- Expand `lambda-coop.runner-alignment.ts` helpers to serialize interpreter
  traces alongside clause metadata so test fixtures can assert both views.

**Interpreter coverage**
- Replay Example 6 end-to-end through the λ₍coop₎ interpreter, asserting success
  traces match runner execution.
- Introduce negative fixtures that exercise unsupported operations, exception
  propagation, and signal termination; record the emitted diagnostics for each
  case.
- Wire the new fixtures into `test/stateful-runner.spec.ts` (or a dedicated
  λ₍coop₎ alignment suite) so failure cases surface boundary metadata and
  interpreter mismatches.

**Documentation updates**
- Capture the aggregated diagnostics (especially interpreter traces and boundary
  witness exports) in `LAWS.md` and `Cursor Next Steps.md` once Pass 2 lands.

> _Status update:_ Comparison artifacts now embed boundary witness metadata,
> expected interpreter operation plans, and clause provenance strings while the
> alignment report threads interpreter status plus trace excerpts into the
> metadata/notes. Example 6 tests assert the new metadata, including unsupported
> operation diagnostics and exception/signal clause summaries captured via the
> alignment analysis. The λ₍coop₎ evaluator now dispatches runner clauses so user
> runs propagate kernel return/raise/signal outcomes, and the regression suite
> covers the propagated statuses for success, exception, and signal clauses.
> Finaliser bundles execute exactly once for return/exception/signal branches,
> with interpreter tests asserting value preservation, exception recovery, and
> signal fallbacks when handlers are absent. Linear finaliser tokens now guard
> each invocation, rejecting re-entrant `run … finally …` calls and surfacing
> explicit `finaliser-already-run` diagnostics when a branch attempts to execute
> twice; the regression suite checks the guard by nesting `run … finally …`
> inside the finaliser and by asserting that each finaliser operation appears
> exactly once in the evaluation trace. The interpreter also records the
> finalisation outcome (branch, handler, guard status) for every `run … finally …`
> evaluation so diagnostics and tests can confirm factorisation through a single
> finaliser map.
> Finaliser runs now expose deterministic identifiers and the
> `summarizeFinaliserOutcomes` helper aggregates branch/status counts per run so
> interpreter metadata can report exactly-once guarantees alongside handled vs
> propagated tallies. The λ₍coop₎ regression suite asserts the per-run summary
> for handled, propagated, and guard-error scenarios.
> Interpreter result summaries now flow through the new `summarizeUserEvaluation`
> helper so λ₍coop₎ alignment metadata records status, operations, trace length,
> and finaliser notes in a canonical form; Example 6 asserts the exported
> interpreter note entries. Kernel clause evaluations now feed through
> `summarizeKernelEvaluation`, and alignment metadata records per-clause status,
> operations, and trace lengths using canonical witnesses when necessary.
> Aggregated kernel diagnostics now flow through `summarizeKernelEvaluations`,
> counting per-status outcomes, unioning clause operation names, and recording
> trace totals so alignment metadata exports a summary line that Example 6 asserts
> alongside the per-clause entries.
> Residual handler coverage now funnels through `summarizeResidualHandlers`, and
> alignment metadata exports `λ₍coop₎.alignment.residualHandlers` entries that
> Example 6 verifies alongside the oracle/interpreter summaries.
> Interpreter collection summaries now use `summarizeUserEvaluations` to aggregate
> per-run diagnostics, exporting status, trace, and finaliser totals alongside the
> underlying notes so Example 6 can assert the new metadata lines and alignment
> reports surface the aggregated interpreter summary. Alignment diagnostics now
> collapse interpreter, kernel, boundary, and oracle data via
> `LambdaCoopAlignmentSummary`, emitting canonical
> `λ₍coop₎.alignment.*` metadata together with consolidated notes. The Example 6
> regression asserts the aggregated summary and confirms the boundary rollups
> match the underlying comparison artifacts.
> Residual law compatibility totals now flow through the same summary: `summarizeResidualInteractionLaw`
> records runner-vs-law diagram comparisons, λ₍coop₎ alignment metadata exports
> `λ₍coop₎.alignment.residualLaw.compatibility.*` entries, and Example 6 asserts
> the compatibility notes alongside the existing residual law diagnostics.
> Residual law ρ entries are now derived with `makeResidualInteractionLawFromRunner`, so
> λ₍coop₎ alignment surfaces runner-synthesised ρ descriptions/diagnostics that
> Example 6 checks alongside the compatibility summary.
> Residual law checks now run through `checkResidualInteractionLaw`, emitting `λ₍coop₎.alignment.residualLaw.holds` metadata, optional `zeroResidual` flags, and check notes/diagnostics that Example 6 and residual-runner tests assert alongside the aggregate.
> Residual monad–comonad packaging now uses `makeResidualMonadComonadInteractionLaw`, merging metadata from the interaction, residual notes, optional zero-collapse verdicts, and the θ/η/μ comparison summaries that the Example 6 residual suite records in diagnostics.
> Packaged residual interactions now flow through `makeResidualMonadComonadInteraction`, which flags identity residuals, records the ordinary interaction fallback, and feeds those diagnostics into `checkMonadComonadInteractionLaw` together with the aggregated metadata.
> Residual law constructors now flow through `constructResidualInteractionLaw` and `liftInteractionLawToResidual`, packaging explicit ρ-component families and the identity-residual adapter so Example 6 asserts the canonical constructors alongside the aggregated metadata.
> Example 13’s exception residual law is available via `makeExample13ResidualInteractionLaw()`, bundling the `R X = X + E`/`D Y = Δ × Y` carriers and ensuring regression coverage exercises both the return and exception branches.
> Residual compatibility diagrams now run through `residualLawCompatibilityWithF`/`residualLawCompatibilityWithG`, feeding their diagnostics into `summarizeResidualInteractionLaw` and the λ₍coop₎ metadata while the Example 13 tests assert the new witnesses.
> Residual law mismatch tracing now reports per-diagram offenders: the aggregate
> emits `λ₍coop₎.alignment.residualLaw.mismatches` metadata, lists each mismatched
> object with checked/mismatch counts, and the Example 6 regression confirms the
> mismatch array is present (empty in the passing case) with diagnostics noting
> the summarised coverage.

> _New helper:_ `evaluateSupervisedStackWithLambdaCoop` now runs any
> supervised stack through the λ₍coop₎ interpreter using the embedded
> runner literal, emitting canonical `λ₍coop₎.stackRun.*` metadata
> (operation plan, status, trace length, finaliser summary, and
> error/exception/signal tags). Example 6 asserts both the successful
> `getenv` run and the missing-operation error, so λ₍coop₎ consumers can
> quote stack-run diagnostics directly.
> Residual diagram witnesses now capture structured counterexamples so
> `summarizeResidualInteractionLaw` reports runner- and law-sourced failures; the
> λ₍coop₎ alignment metadata/notes export the new counterexample arrays, and the
> Example 6 plus residual-runner regressions assert both the empty and
> non-empty scenarios.
> Residual counterexamples now flow through `counterexampleSummary`:
> `summarizeResidualInteractionLaw` records totals by origin and diagram,
> λ₍coop₎ alignment exports the summary metadata/notes, and Example 6 alongside
> residual-runner tests assert both the zero- and non-zero summary paths.
> Glueing interaction-law summaries now bridge directly into Example 6’s runner
> and residual runner via `bridgeGlueingSummaryToResidualRunner`, so the
> identity/tensor/pullback fixtures ship aggregated runner/residual oracle
> metadata that Phase IV alignment can quote when referencing the Section 6.2
> glueing construction.
> Alignment analysis now exposes `alignmentMetadata`/`alignmentNotes` options,
> allowing glueing bridge telemetry (or any precomputed diagnostics) to flow
> straight into the `λ₍coop₎.alignment.*` metadata/notes that Example 6 asserts
> during supervised-stack analysis.
> `analyzeSupervisedStackLambdaCoopAlignmentWithGlueingBridge` now automates the
> flow by invoking the λ₍coop₎ alignment while appending the bridge metadata and
> notes, so Example 6 exercises the glueing telemetry without manual option
> plumbing and downstream callers get a canonical report bundling both results.
> `makeGlueingSupervisedStack` packages the bridge, Example 6 kernel/user specs,
> and λ₍coop₎ alignment into a single adapter that records canonical
> `Glueing.supervisedStack.*` metadata/notes. The new regression asserts the
> glued helper output so Phase VI consumers no longer wire stacks and glueing
> telemetry manually.
> `makeGlueingSupervisedStackExampleSuite` composes the glueing example
> summaries with the shared kernel/user specs and the supervised-stack adapter,
> producing identity/tensor/pullback fixtures whose runner/residual bridges and
> λ₍coop₎ alignment metadata are ready for downstream tests or documentation
> without bespoke wiring.

## 4. Pass 3 — Inverse Translation Tasks

**Objective:** rebuild kernel/user specs and validation diagnostics directly from
embedded λ₍coop₎ literals.

**Implementation tasks**
- Teach `runnerToStack` to recover operation specs, residual/default flags, and
  state carrier names from λ₍coop₎ literals. Persist reconstruction notes next to
  the comparison summary.
- Introduce helpers such as `replaySupervisedStackRoundTrip` to build a stack,
  extract the literal, reconstruct specs, and diff the results.
- Ensure metadata strings survive each translation step so provenance can be
  quoted verbatim in diagnostics and LAWS entries.

**Testing & regression**
- Add Example 6 and minimal kernel-only round-trip suites verifying spec
  equality, residual flag preservation, and boundary witness integrity.
- Capture failure diagnostics when reconstruction diverges (missing handlers,
  reordered operations, altered residual annotations) and assert them in tests.

> _Status update:_ `runnerToStack` now reconstructs kernel operation specs,
> residual/default flags, and state carriers directly from the embedded
> λ₍coop₎ literal. The new `replaySupervisedStackRoundTrip` helper executes the
> build → literal → reconstruction loop, and the Example 6 regression asserts the
> recovered parameter typing, residual defaults, and boundary metadata alongside
> a divergence-focused mismatch test. When older runners omit clause bundles the
> inverse translation augments the summaries straight from the λ₍coop₎ literal so
> parameter names/types and result kinds remain recoverable for round-trip
> comparisons. When runner metadata drops the literal/state-carrier entries,
> reconstruction now synthesises the kernel clause list and runner literal from
> the surviving clause bundles so state carriers and clause diagnostics stay
> observable for inverse-translation audits. The replay step also preserves the
> canonical λ₍coop₎ argument/result witnesses, inferring samples from parameter
> and return types whenever clause bundles are missing so the reconstructed
> summaries continue to expose concrete witnesses for regression checks. User
> boundary diagnostics now synthesise comparison summaries when the specification
> omits a description, spelling out acknowledged kernel operations, missing
> delegates, and kernel-only clauses in the Example 6 regression.

## 5. Cross-pass Residual Metadata Propagation
- Whenever λ₍coop₎ clauses originate from operations marked `defaultResidual` or
  carrying residual handlers, annotate the runner literal so interpreter traces
  distinguish residual fallbacks from ordinary operations.
- Ensure round-trip comparisons and alignment diagnostics surface residual
  provenance consistently (Pass 1 for clause metadata, Pass 2 for alignment,
  Pass 3 for reconstruction).

## 6. Documentation & Registry Updates
- Update `LAWS.md` once the passes land to summarise the enriched comparison
  metadata, interpreter coverage, and round-trip witnesses.
- Keep `Cursor Next Steps.md` synchronised with pass status (e.g. “Pass 1 —
  clause enrichment ✅”) so it remains a faithful subset of the DAY_CHU plan.

## 7. Exit Criteria
- `makeSupervisedStack` emits fully enriched λ₍coop₎ literals that the interpreter
  executes without TODO diagnostics, covering state/exception/signal/residual
  flows.
- `runnerToStack` round-trips kernel/user specs (names, kinds, residual flags,
  metadata) from embedded λ₍coop₎ artefacts with regression coverage.
- Alignment tooling (`lambda-coop.runner-alignment.ts`) reports consolidated
  diagnostics—including interpreter traces, boundary mismatches, and residual
  summaries—and the test suite asserts these notes.

Completion of these passes closes the Phase IV c kickoff and unblocks the broader
λ₍coop₎ interpreter integration and supervised effect examples tracked in
DAY_CHU_IMPLEMENTATION_PLAN Phase IV.
