# Relative Monad Layer — Detailed Step Plan

> **Status:** The implementation work described here is complete. This
> document now serves as an archival record of the rollout; any new
> follow-ups or Street-calculus witness work is tracked centrally in the
> "System-wide TODOs" section of `ORGANIZATION-PLAN.md`.

## 1. Promote current monad infrastructure to the relative setting
- **Audit existing monad data models**
  - ✅ Catalogued in `relative/RELATIVE_MONAD_AUDIT.md`, covering `CatMonad`, `MonadK1`, the pushforward helpers, and example instances that depend on endofunctors.
  - ✅ Recorded the adjunction-driven pushforward dependencies so future adapters can reuse their witnesses without breaking the classical utilities (see audit note §3).
  - ✅ Highlighted identity-root assumptions in Kleisli helpers and examples so follow-up work can thread the relative Street actions through the same API.
- **Extract reusable law/oracle hooks**
  - ✅ Audit note §2 lists the law checkers and witness providers (`algebra-oracles.ts`, `markov-laws.ts`) that must gain relative-aware overloads.
  - ✅ Documented which Vitest suites remain untouched and which will gain relative variants; migration guidance lives alongside the audit summary.

## 2. Design the `RelativeMonad` interface
- **Core type signature**
  - ✅ Introduced the `RelativeMonad<J, M>` interface in `relative/relative-monad.ts`, capturing:
    - `root: J` — a tight 1-cell/functor reused from the virtual equipment layer (`virtual-equipment.ts`).
    - `carrier: M` — the monad-like action, i.e., a tight 1-cell out of the root’s codomain.
    - `unit` and `extend` 2-cells encoded as natural transformations, using the same `NatTrans` representation as `CatNatTrans`.
    - ✅ Implemented by `relative/relative-monad.ts`, which now exports the `RelativeMonad` interface alongside `relativeExtend` and `relativeKleisli` placeholders that record the requested morphism data until the Street calculus is executable.
  - ✅ Provided helper aliases `RelativeMonadOn<C, D>` in `relative/relative-monad.ts` so downstream code mirrors the `CatMonad` naming pattern when importing relative monads.
- **Framing diagnostics (Definition 4.1)**
  - ✅ Implemented `analyzeRelativeMonadFraming` in `relative/relative-monads.ts`, checking that the unit and extension 2-cells share the chosen boundaries and land in the loose arrow `E(j,t)`.
  - ✅ Surfaced a `RelativeMonadLawRegistry` (see `relative/relative-laws.ts`) with entries `relativeMonad.unit.framing`, `relativeMonad.extension.framing`, and `relativeMonad.extension.associativity` so documentation and oracles reference the same descriptors.
  - ✅ `RelativeMonadOracles` in `relative/relative-oracles.ts` now return structural-invariant framing reports and expose a pending associativity pasting stub until the tight 2-cell comparisons land.
  - ✅ Added the Definition 4.16 analyzer `analyzeRelativeMonadRepresentability` in `relative/relative-monads.ts`; it consumes
    `RepresentabilityWitness` data from equipment restrictions, registers the `relativeMonad.representableLooseMonoid` law, and
    documents how the relative monad realises a monoid in `X[j]`.
  - ✅ Introduced `analyzeRelativeMonadIdentityReduction` and the
    `relativeMonad.identityReduction` law/oracle so Corollary 4.20’s
    “relative monads generalise ordinary monads” statement is executable.
    The analyzer demands that the root and carrier coincide with the
    identity boundary and that the loose arrow is endo on that object,
    exposing actionable diagnostics when a candidate fails to collapse to
    a classical monad presentation.
  - ✅ Added `analyzeRelativeMonadSkewMonoidBridge` and the
    `relativeMonad.skewMonoid.bridge` law so Theorem 4.29’s skew-monoidal equivalence is executable.  The analyzer aggregates
    the left-extension, j-absolute, density, and fully faithful diagnostics from the virtual-equipment layer and surfaces any
    missing hypotheses.
- **Identity-root embedding**
  - ✅ Implemented `fromMonad` in `relative/relative-monads.ts`, embedding a classical monad as an identity-root relative monad while threading optional object/equality data from `virtualizeCategory`.
  - ✅ Added `toMonadIfIdentity` in `relative/relative-monads.ts`, collapsing relative monads whose unit/extension evidence are tight into `CatMonad` data and reporting actionable diagnostics otherwise.
  - ✅ Implemented `embedRelativeMonadIntoFiber` and documented the
    `relativeMonad.fiberEmbedding` oracle so Theorem 4.22’s functor
    `E(j,-) : \mathrm{RMnd}(j) → \mathrm{Mnd}_{X[j]}(A)` now produces a fiber
    monad report while keeping the fully faithful comparison pending.
  - ✅ Added `analyzeRelativeMonadRepresentableRecovery` plus the
    `relativeMonad.representableRecovery` registry entry, aggregating the fiber
    embedding with optional skew-monoid diagnostics to reflect Remark 4.24’s
    literature comparison.
- **Law surface**
  - ✅ `relativeExtend` and `relativeKleisli` now return structured action
    reports that validate boundary alignment, expose the expected Street
    endpoints, and mark the composite itself as pending until the 2-cell
    calculus lands.

## 3. Integration with the virtual equipment layer
- **Type plumbing**
  - ✅ `virtual-equipment/index.ts` now re-exports `RelativeMonad`, and `relative/relative-monad.ts` imports directly from `virtual-equipment/virtual-equipment` to avoid circular dependencies while giving consumers a single entry point.
  - ✅ Verified the generic parameters align with the `VirtualEquipment` data kinds (objects, tight cells, proarrows) introduced in `VIRTUAL-EQUIPMENT-LAYER.md`.
- **Root functor compatibility**
  - ✅ `relativeMonadFromEquipment` (in `relative/relative-monads.ts`) constructs a `RelativeMonad` only after checking framing data together with the B(j,1) and B(1,t) restrictions supplied by the equipment.
  - ✅ The adapter now reports actionable diagnostics when either restriction is missing or lacks representability, covering the companion/conjoint fallback noted for future adjunction work.
  - ✅ Representability witnesses returned by the restrictions are validated for orientation, boundary reuse, and object alignment so future analyzers can rely on the B(f,1)/B(1,g) data without additional plumbing.
  - ✅ Reuse the loose-monoid analyzers from `virtual-equipment/loose-structures.ts` so relative monads derived from loose monads automatically certify that their multiplication/unit 2-cells have the expected framing before constructing the tight-side data.  `relativeMonadFromEquipment` now records the `analyzeLooseMonoidShape` diagnostics (using either derived or supplied loose data) alongside the construction result.
  - ✅ Leverage the skew-multicategory analyzers from `virtual-equipment/skew-multicategory.ts` (Remark 4.5/Theorem 4.7) to double-check that any proposed relative monad multiplication/unit behaves as a monoid in the associative-normal left-skew multicategory of loose arrows based at the chosen root.  The helper synthesises default substitution witnesses and preserves any supplied ones before invoking `analyzeLooseSkewComposition`, exposing the Proposition 4.12 checks to downstream tooling.
  - ✅ When relative monads surface via weighted Kan extensions, rely on the
    `virtual-equipment/extensions.ts` analyzers to confirm that the chosen
    right extensions/right lifts satisfy Definition 3.2 and Lemma 3.4 before
    extracting tight data, and invoke the `virtual-equipment/limits.ts`
    weighted cone/cocone analyzers to ensure the underlying colimit/limit
    framing matches Definition 3.9 and Lemma 3.13.  Optional witness inputs
    now flow through these analyzers, and any failures are appended to the
    construction issues array.
  - ✅ Use the density/absolute analyzers in `virtual-equipment/absoluteness.ts`
    so relative monads derived from j-absolute presentations certify that the
    root tight cell is dense and that the associated left extensions/pointwise
    lifts inherit the correct framing.  Density witnesses supplied to the
    helper trigger `analyzeDensityViaIdentityRestrictions`, and the report is
    stored in the returned construction result.
  - ✅ Rely on the faithfulness analyzers in `virtual-equipment/faithfulness.ts`
    when constructing relative monads from pointwise left extensions.  Fully
    faithful roots now feed through `analyzeFullyFaithfulTight1Cell`, and any
    presentation via left extensions can thread data into
    `analyzePointwiseLeftExtensionLiftCorrespondence`; the resulting analyses
    are attached to the construction output for oracle consumption.

## 3b. Relative adjunction scaffolding
- **Definition 5.1 framing**
  - ✅ Introduced `RelativeAdjunctionData` with root `j : A → E`, left `ℓ : A → C`,
    and right `r : C → E` boundaries together with a framed isomorphism
    `C(ℓ-, -) ≅ E(j-, r-)`. Implemented
    `analyzeRelativeAdjunctionFraming` and `analyzeRelativeAdjunctionHomIsomorphism`
    in `relative/relative-adjunctions.ts` so tests confirm the domains/codomains
    agree and the chosen 2-cells reuse `ℓ` and `r` exactly.
  - ✅ Provided `RelativeAdjunctionOracles` mirroring the new law catalogue entries
    (`relativeAdjunction.framing`, `relativeAdjunction.homIso.framing`) and
    exposed an executable `relativeAdjunction.unitCounit.presentation` check
    derived from Lemma 5.5. The oracle now demands an explicit unit/counit
    presentation and confirms that the 2-cells reuse the designated boundaries
    before reporting success; when no presentation is supplied it emits a
    structured pending diagnostic so future mate-calculus work knows how to
    proceed.
- **Relative adjunction documentation**
  - ✅ Extended `LAWS.md`, `README.md`, and `ORGANIZATION-PLAN.md` with the new
    registry paths so contributors can discover the Definition 5.1 checks and
    their pending unit/counit upgrade.
- **Relative monad integration**
  - ✅ Left TODOs in `relative/relative-monads.ts` referencing the adjunction
    analyzers so future work can derive monads from adjunctions and compare the
    resulting Kleisli/Eilenberg–Moore data against the machinery introduced in
    Section 6.
  - ✅ Implemented the Definition 5.14/5.18/5.23 morphism analyzers so
    \(\mathrm{RAAdj}_j(j)\) becomes executable: left morphisms, right morphisms,
    and strict morphisms each reuse the expected boundaries and surface their
    diagnostics through `RelativeAdjunctionOracles`.
  - Capture the pasting mechanisms in Section 5.3:
    - ✅ `analyzeRelativeAdjunctionPasting` now consumes nested relative
      adjunctions, confirming the outer right leg matches the inner root,
      composing the left legs, and checking the induced left morphism so the
      Proposition 5.30 pasting law surfaces executable diagnostics through the
      oracle layer.
    - ✅ `analyzeRelativeAdjunctionFullyFaithfulPostcomposition` now reuses the
      equipment's fully faithful witness to certify that the postcomposed root
      and right leg are `u ∘ j` and `u ∘ r`, leaving the left leg unchanged as in
      Example 5.31.
    - ✅ `analyzeRelativeAdjunctionInducedMonadsCoincide` compares the
      \(j\)- and \(j'\)-relative monads produced by the same adjunction data,
      ensuring their roots, carriers, loose arrows, and unit/extension frames
      agree as required by Corollary 5.32.
    - ✅ Remark 5.33 now feeds
      `analyzeRelativeAdjunctionResolutePair`, combining the fully faithful
      postcomposition report with the induced-monad coincidence analyzer while
      ensuring the monad data reuse the base and postcomposed right legs before
      marking the resolute law as satisfied.
    - ✅ Corollary 5.34 is implemented via
      `analyzeRelativeAdjunctionResoluteLeftMorphism`, aggregating the resolute
      pair, Proposition 5.29 precomposition, and Proposition 5.30 pasting
      diagnostics so the induced left morphism is certified only when all three
      inputs align.
    - ✅ Example 5.35 exposes
      `analyzeRelativeAdjunctionOrdinaryLeftAdjointComposition`, reusing the
      Corollary 5.34 analyzer and bubbling up its issues array while tagging the
      identity-root specialisation expected by the literature example.
    - ✅ Proposition 5.36 now lands in
      `analyzeRelativeAdjunctionRelativeMonadModule`, which threads the
      Corollary 5.34 resolute left morphism through the relative monad
      resolution analyzer to certify the induced module action over the
      \(j\)-relative monad.
    - ✅ Proposition 5.37 is implemented as
      `analyzeRelativeAdjunctionRelativeMonadPasting`, consuming the pasted
      unit/extension witnesses and verifying that the resulting
      \(j'\)-relative monad and comparison morphism reuse the supplied
      adjunction boundaries.
    - ✅ Example 5.38’s fully faithful refinement appears in
      `analyzeRelativeAdjunctionRelativeMonadPastingFullyFaithful`, which layers
      the tight-cell witness over the Proposition 5.37 diagnostics to expose the
      induced functor on relative monads.
    - ✅ Example 5.39 composes the pasting construction via
      `analyzeRelativeAdjunctionRelativeMonadPastingAdjunction`, aggregating the
      two Proposition 5.37 reports and checking the shared intermediate monad
      data.
    - ✅ Corollary 5.40 is realised by
      `analyzeRelativeAdjunctionRelativeMonadComposite`, combining the module
      assignment with the pasting witnesses to compare the induced action
      against the \(j'\)-relative monad diagnostics.
    - ✅ Example 5.41 feeds
      `analyzeRelativeAdjunctionRelativeMonadLiteratureRecoveries`, which now
      requests Hutson and Altenkirch–Chapman–Uustalu witnesses and confirms that
      the pasted construction reproduces the cited monads in the identity and
      \(j = j'\) specialisations.
  - ✅ Documented Lemma 5.17 and Lemma 5.21 in `LAWS.md`, explaining how the
    morphism analyzers feed the slice/coslice embeddings until representable
    examples supply comparison witnesses.
  - ✅ Registered Theorem 5.24 through the `relativeAdjunction.resolution.relativeMonad`
    oracle so adjunction-induced monads are compared with their hom-isomorphism
    witnesses while the mate-calculus equality remains pending.
- **Pointwise lifts and left extensions (Section 5)**
  - ✅ Added analyzers/oracles for Proposition 5.8 via
    `RelativeAdjunctionOracles.pointwiseLeftLift`, ensuring pointwise lifts
    exhibit the right leg with matching boundaries.
  - ✅ Encoded Proposition 5.10 through `RelativeAdjunctionOracles.rightExtension`,
    threading j-absolute, fully faithful, and pointwise witnesses from the
    equipment layer when recovering the right leg.
  - ✅ Captured Proposition 5.11 with `RelativeAdjunctionOracles.colimitPreservation`,
    verifying that shared weighted colimits induce preservation along the left leg.

## 4. Law checking and oracle design
- **Executable laws**
  - ✅ `algebra-oracles.ts` now exposes `checkRelativeMonadLaws`, aggregating the framing report with per-law diagnostics and returning `{holds, pending, details, analysis}` so downstream tooling can inspect the Structural Invariant-style breakdown by root-dependent data.
  - ✅ Fine-grained analyzers for unit compatibility, extension associativity, and root-identity preservation live in `relative/relative-monads.ts`; they certify the compositional prerequisites today and mark the Street-calculus equalities as pending so contributors can see which witnesses remain to be implemented.
- **Witness extraction**
  - ✅ `analyzeRelativeMonadLaws` now threads Street-style witnesses through each component: unit compatibility exposes the unit arrow and extension composites, associativity returns the composed loose arrow list, and root-identity checks surface the restriction data so failures ship with actionable morphisms.
- **Testing**
  - ✅ Added `test/relative/relative-monad-laws.spec.ts`, covering identity-root
    embeddings, a constant-root relative monad, and the new fiber embedding/
    representable recovery analyzers.

## 4b. Relative Kleisli and Eilenberg–Moore constructions
- **Opalgebra/algebra framing (Section 6)**
  - ✅ Definition 6.1’s framing diagnostics now live in
    `analyzeRelativeAlgebraFraming`/`analyzeRelativeOpalgebraFraming`, and the
    corresponding oracles surface the boundary checks ahead of the universal
    property analyzers so each invocation reports whether the supplied action
    reuses the j-root and carrier tight cells.
  - ✅ The Definition 6.1 split is fully executable: the algebra and
    opalgebra framing analyzers run alongside the algebra/opalgebra
    morphism checks, which now surface boundary diagnostics while the
    \(E(j,α)\)/\(E(t,α)\) comparisons remain pending until the Street
    witnesses arrive.
  - ✅ Definition 6.4’s opalgebra diagrams are now represented explicitly: the
    carrier triangle and extension rectangle analyzers capture the shared
    codomain boundary, opalgebra carrier, and monad unit/extension witnesses.
    `RelativeAlgebraOracles` exposes `opalgebraCarrierTriangle` and
    `opalgebraExtensionRectangle`, each returning pending Street comparisons
    together with the recorded witness data so oracle consumers see the same
    triangle/rectangle diagnostics used in the paper’s string diagrams.
  - ✅ Added `RelativeKleisliPresentation` and `RelativeEilenbergMoorePresentation`
    along with analyzers `analyzeRelativeKleisliUniversalProperty` and
    `analyzeRelativeEilenbergMooreUniversalProperty`, ensuring the universal
    property actions reuse the specified root and carrier boundaries while
    recording Theorem 6.39’s comparison functor, mediating tight cell, Lemma 6.38
    partial right adjoint, and graded factorisations. The Lemma 6.38 section
    analyzer now checks both triangle identities by composing ℓ ∘ σ and σ ∘ ℓ
    and comparing them against the supplied identities.
  - ✅ Section 8 enrichment is represented by
    `analyzeRelativeEnrichedMonad`/`relativeMonad.enriched.compatibility`, which
    confirm the enriched hom object and tensor comparisons reuse the monad’s
    unit and extension witnesses.
  - ✅ Example 8.14’s Set-enriched equivalences are captured by
    `analyzeRelativeSetEnrichedMonad` and the
    `relativeMonad.enriched.setCompatibility` oracle, ensuring the recorded
    fully faithful root and every correspondence reuse the loose arrow, unit,
    and extension of the underlying relative monad.
  - ✅ Example 4 of *Monads Need Not Be Endofunctors* is executable via
    `analyzeIndexedContainerRelativeMonad` and the
    `relativeMonad.mnne.indexedContainers` oracle, which enumerate finite
    indexed families, replay the Example 4 unit/extraction data, and apply the
    recorded κ/σ substitution rules to verify the relative monad laws without
    relying on the focus-position simplification.
  - ✅ Definition 8.16’s enriched T-algebra is now executable via
    `analyzeRelativeEnrichedEilenbergMooreAlgebra` and the
    `relativeMonad.enriched.eilenbergMooreAlgebra` oracle, which insist the
    carrier shares the monad boundaries, the extension operator reuses the
    enriched extension witness, and the Street pastings for the unit and
    multiplication composites collapse to the recorded enriched
    unit/extension comparisons.
  - ✅ Lemma 8.7’s Kleisli inclusion is enforced by
    `analyzeRelativeEnrichedKleisliInclusion` and the
    `relativeMonad.enriched.kleisliInclusion` oracle, ensuring the functor is
    identity-on-objects, reuses the loose arrow/unit/extension witnesses, and
    records the κ_T opalgebra morphism triangles.
  - ✅ Example 8.6 and Lemma 8.7 now appear as
    `analyzeRelativeEnrichedYoneda`,
    `analyzeRelativeEnrichedYonedaDistributor`, and the
    `relativeMonad.enriched.yoneda` / `relativeMonad.enriched.yonedaDistributor`
    oracle entries, checking that the Yoneda embedding reuses the enriched
    hom/tensor/extension data and that the PZ(p,q) factorisation agrees with both
    red and green composites while exhibiting the right lift unit for `q ▷ p`.
  - ✅ Theorem 8.12 is captured by `analyzeRelativeEnrichedVCatMonad` and the
    `relativeMonad.enriched.vcatSpecification` oracle, which replay the unit and
    multiplication triangles, enforce functorial identity/composition diagrams,
    and check τ-naturality while requiring every composite to reuse the
    enriched unit/extension evidence.
  - ✅ Corollaries 6.40–6.41 (and Proposition 6.42) are exposed via
    `analyzeRelativePartialRightAdjointFunctor` and the
    `relativeMonad.algebra.partialRightAdjointFunctor` oracle, which thread the
    section diagnostics, invoke the fully faithful comparison checks, and ensure
    the recorded j-objects are fixed by the partial right adjoint.
  - ✅ Lemma 6.47 now appears as
    `analyzeRelativeOpalgebraResolution`/`relativeMonad.opalgebra.resolution`,
    lifting opalgebras into the Lemma 6.35 resolution and replaying the κ\_t
    triangle identities alongside the nested resolution report.
  - ✅ Theorem 6.49’s section \(RAdj\_j(j) \to RMnd\_j\) is tracked by
    `analyzeRelativePartialLeftAdjointSection` and the
    `relativeMonad.opalgebra.partialLeftAdjointSection` oracle, confirming the
    induced monad agrees with the Lemma 6.47 comparison and that the transpose is
    literally the identity on \(j\)-objects.
  - ✅ Introduced `RelativeAlgebraMorphismPresentation` and
    `RelativeOpalgebraMorphismPresentation` containers alongside boundary
    analyzers that ensure morphisms reuse the source/target carriers before
    Street witnesses arrive.  The oracles now emit structural reports and mark
    themselves pending until the `E(j,\alpha)`/`E(t,\alpha)` pastings can be
    compared, surfacing immediate failures when a morphism forgets the required
    boundaries.
  - ✅ Registered `relativeMonad.kleisli.universalOpalgebra`,
    `relativeMonad.eilenbergMoore.universalAlgebra`, and the pending
    `relativeMonad.universal.strengthenedComparisons` entries so stronger
    universal properties (Theorem 6.39/6.49) remain visible in `LAWS.md` and the
    oracle registry.
  - ✅ Implemented Remark 6.2 via `analyzeRelativeAlgebraRestrictionFunctor` and
    the `relativeMonad.algebra.restrictionFunctor` oracle, which record the
    Street-action image of a relative algebra, validate carrier reuse, and emit
    structured pending diagnostics until functoriality and faithfulness
    witnesses arrive.
  - ✅ Implemented the `relativeMonad.algebra.canonicalAction` analyzer for
    Example 6.3 so the canonical algebra must reuse the monad’s tight leg and
    extension 2-cell while marking the Proposition 6.12 comparisons as pending.
  - ✅ Mirror Example 6.6 via a `relativeMonad.opalgebra.canonicalAction`
    analyzer that ensures \((t, t)\) reuses the monad’s tight leg and unit
    2-cell, surfacing pending diagnostics until the Proposition 6.19 witnesses
    arrive.
  - ✅ Added the `relativeMonad.opalgebra.extraordinaryTransformations`
    analyzer so Lemma 6.7’s loose-monoid witnesses are recorded.  The check now
    verifies that the supplied extraordinary transformation reuses the relative
    monad’s root, carrier, and loose arrow while keeping the equivalence itself
    pending until the Section 1.4 comparisons land.
  - Capture the Section 6.2 “algebras and opalgebras as actions” perspective by
    expanding the skew-multicategory placeholder into dedicated tasks:
    - ✅ Definition 6.9’s right/left action coherence now has an executable
      analyzer under `relativeMonad.actions.rightLeftCoherence`, recording the
      identity/unitor/associator/right-action witnesses, checking their
      boundaries, and evaluating the Street red/green pastings so composite
      disagreements surface immediately.
    - ✅ Definition 6.11’s homomorphism and Act-category structure runs through
      `relativeMonad.actions.streetActionHomomorphism` and
      `relativeMonad.actions.homomorphismCategory`, which compute both
      composites, compare them via the equipment equality hooks, and propagate
      the resulting diagnostics.
    - ✅ Proposition 6.12’s canonical self-action is implemented via
      `relativeMonad.actions.canonicalSelfAction`, ensuring the induced action
      reuses the relative monad extension while inheriting the full Street
      comparison report.
    - ✅ Proposition 6.13’s loose-adjunction-induced actions now flow through
      `relativeMonad.actions.looseAdjunctionAction` and
      `relativeMonad.actions.looseAdjunctionRightAction`, threading the
      unit/counit data into the Street calculator and returning the executed
      comparison evidence alongside boundary checks.
    - ✅ Definition 6.14’s representable-tight-cell restriction is enforced by
      `relativeMonad.actions.representableRestriction`, which confirms the
      Street action carrier appears among the representable tight cells and
      forwards the evaluated Street comparisons.
    - ✅ The unpacking of an action in \(\mathsf{X}[D, j]_i\) is captured by
      `relativeMonad.actions.streetActionData`, recording the tight-cell/action
      pair and validating boundary reuse while still flagging the outstanding
      string-diagram work.
    - ✅ `relativeMonad.actions.representableStreetSubmulticategory` and
      `relativeMonad.actions.representableStreetActionDiagrams` reuse the
      executed restriction and coherence reports to check representable cells
      and the \(\rho/\lambda/\mu\) composites with the same Street evidence.
    - ✅ `relativeMonad.actions.representableStreetActionHomomorphism` mirrors
      the Definition 6.21 action homomorphism equation, comparing the pastings
      inside the representable sub-multicategory and surfacing mismatches
      directly.
    - ✅ The concluding paragraph (“We may now exhibit the \(T\)-algebras … as
      actions in \(\mathsf{X}[D, j]\)”) now flows through
      `relativeMonad.actions.relativeAlgebraBridge`, which converts a
      Definition 6.1 algebra into Street action witnesses, attaches the Street
      action report, and reports equality failures without a pending stub.
    - ✅ Theorem 6.15’s categorical equivalence is implemented via
      `relativeMonad.actions.algebraActionIsomorphism`, bundling the
      algebra-to-action bridge, action-to-algebra recovery, and identity
      witnesses while threading the executed Street comparisons through both
      directions (optional inverse data remain future work).
    - ✅ Remark 6.16’s representability upgrade now lives in
      `relativeMonad.actions.representabilityUpgrade`, threading the Street
      representability witnesses through the analyzer and reusing the executed
      comparison reports to detect mismatches between the upgrade data and the
      recorded action.
    - ✅ Corollary 6.17’s identity-root specialisation is covered by
      `relativeMonad.algebra.identityRootEquivalence`, which checks that the
      relative algebra collapses to the ordinary one when the root is an
      identity while the Street comparisons for Definition 6.18 remain queued.
    - ✅ Definition 6.18’s Street-action viewpoint is implemented via
      `relativeMonad.opalgebra.rightActionPresentation`, whose analyzer records
      the Street action witness and checks it reuses the opalgebra action, root,
      and carrier boundaries while leaving the comparison equalities pending.
    - ✅ Proposition 6.19’s canonical actions land in
      `relativeMonad.opalgebra.rightActionFromMonoid`, verifying that the Street
      action is framed by the relative monad’s root/carrier and reuses the
      extension data while now exposing the evaluated Street composites.
    - ✅ Proposition 6.20’s loose-adjunction transport now executes via
      `analyzeRelativeStreetLooseAdjunctionRightAction`, threading unit/counit
      witnesses, representable carriers, and induced Street actions while the
      core comparisons remain pending.
    - ✅ Definition 6.21’s representable Street sub-multicategory is captured by
      `analyzeRelativeStreetRepresentableSubmulticategory`, which records the
      representable carriers and verifies boundary reuse for \(\mathsf{X}[j,B]_\iota^{B}\).
    - ✅ Recorded the Definition 6.21 string-diagram comparisons through
      `analyzeRelativeStreetRepresentableActionDiagrams`, requiring the
      \(\rho\), \(\lambda\), and \(\mu\) composites to align with the Definition 6.4 opalgebra data.
    - ✅ Registered the representable Street action homomorphism analyzer
      `analyzeRelativeStreetRepresentableActionHomomorphism`, which demands the
      red/green pastings appearing in Definition 6.21.
    - ✅ Added the representable action bridge via
      `analyzeRelativeOpalgebraRepresentableActionBridge`, converting
      Definition 6.4 opalgebras into Street action witnesses inside
      \(\mathsf{X}[j, B]_\iota^{B}\).
    - ✅ Theorem 6.22 now runs through
      `analyzeRelativeOpalgebraStreetActionEquivalence` and the
      `relativeMonad.actions.representableActionIsomorphism` oracle, capturing
      the Street/opalgebra bridge, recovery homomorphism, and comparison
      diagnostics while keeping the mutual inverse evidence pending.
    - ✅ Documented Remark 6.23 through the
      `relativeMonad.actions.representabilityGeneralisation` registry entry so
      loose-extension witnesses for \(\mathsf{X}[j,B]\) stay visible alongside
      the Theorem 4.29 comparisons.
    - ✅ Registered Corollary 6.24 via the
      `relativeMonad.opalgebra.identityRootEquivalence` analyzer, which requests
      the comparison functors and identity-root witnesses needed to reuse the
      Corollary 4.20 diagnostics.
    - ✅ Proposition 6.25’s canonical (op)algebras now execute via
      `analyzeRelativeAdjunctionRelativeMonadLeftOpalgebra` and
      `analyzeRelativeAdjunctionRelativeMonadRightAlgebra`, each wiring the
      adjunction, induced relative monad, and recorded actions through
      `RelativeAdjunctionOracles` so the left/right legs are checked against the
      Proposition 5.24 resolution data.
    - ✅ Proposition 6.26’s functorial packaging is represented by
      `analyzeRelativeAdjunctionRelativeMonadResolutionFunctor`, which
      aggregates the left/right reports and surfaces the pending Res\((T)_C\)
      comparisons through the new oracle entry.
    - ✅ Proposition 6.27’s transports now execute via
      `analyzeRelativeAdjunctionRelativeMonadOpalgebraTransport` and
      `analyzeRelativeAdjunctionRelativeMonadAlgebraTransport`, which validate
      the Proposition 5.37 pasting, check source/target framing, and record
      identity naturality witnesses while marking the Street comparisons as
      pending.
    - ✅ Remark 6.28’s equivalence is captured by
      `analyzeRelativeAdjunctionRelativeMonadTransportEquivalence`, aggregating
      both transports with the identity unit/counit comparisons so the oracle
      surfaces the remaining mutually inverse witnesses as pending diagnostics.
    - ✅ Added the graded morphism analyzers, including
      `analyzeRelativeAlgebraGradedMorphisms`,
      `analyzeRelativeAlgebraGradedMorphismsAlternate`, and
      `analyzeRelativeAlgebraGradedExtensionMorphisms`, so the Section 6.4
      grading data and extension witnesses are executable.
    - ✅ Registered the indexed and global Alg(T) infrastructure through
      `analyzeRelativeAlgebraIndexedFamily` and
      `analyzeRelativeAlgebraGlobalCategory`, capturing the fibrewise and
      aggregate structures in the oracle surface.
    - ✅ Recorded Definition 6.34 via
      `analyzeRelativeAlgebraMediatingTightCell`, ensuring the mediating arrow
      reuses the unit/extension data.
    - ✅ Added `analyzeRelativeAlgebraResolutionFromObject`, collecting Lemma 6.35’s
      resolution witness while marking the Street comparisons pending.
  - ✅ Extended the roadmap with the `relativeMonad.opalgebra.literatureRecoveries`
    oracle so Remark 6.5’s literature comparisons are executable.
  - ✅ Recorded Remark 6.8 via `relativeMonad.actions.twoDimensionalModules`,
    capturing the pending two-dimensional module witnesses while keeping the
    comparisons visible.
- **Examples and tests**
  - ✅ Added identity-equipment constructors and fixtures that feed the
    analyzers/oracles, mirroring the relative monad and adjunction
    patterns. Extended the Vitest suites with positive and negative
    examples (see `test/relative/*.spec.ts`) so the framing requirements
    stay executable.
  - ✅ Operationalised Example 1 from *Monads Need Not Be Endofunctors* via
    `relative/mnne-vector-monads.ts`, including a Boolean semiring witness,
    Vitest coverage in `test/relative/mnne-vector-monads.spec.ts`, and a
    runnable example wired into `examples.ts`.
  - ✅ Added Theorem 3/Example 5 Kleisli diagnostics with
    `analyzeFiniteVectorKleisliSplitting`, ensuring Boolean matrix identities
    and associative products align with the recorded extension operator.
  - ✅ Added Example 2 from *Monads Need Not Be Endofunctors* with
    `relative/mnne-lambda-monads.ts`, enumerating well-scoped λ-terms for small
    contexts, replaying the capture-avoiding substitution operator, and
    verifying the relative monad unit/extension identities and Kleisli
    associativity. Regression coverage lives in
    `test/relative/mnne-lambda-monads.spec.ts` with positive/negative cases.
  - ✅ Surfaced Example 6’s Kleisli substitution view via
    `analyzeLambdaKleisliSplitting`, reusing the λ-relative monad analyzer to
    report identity substitutions and sequential composition diagnostics.
  - ✅ Replayed the Example 1 left Kan extension along FinSet → Set with
    `analyzeFiniteVectorLeftKanExtension` and
    `describeBooleanVectorLeftKanExtensionWitness`, checking that the colimit
    presentations collapse to the ordinary Boolean vector functor for small
    sets and highlighting when the witness dimension bound is insufficient.
  - ✅ Encoded Example 8’s powerset relative monad in
    `relative/mnne-powerset-monads.ts`, supplying lazy/replayable subsets,
    approximation diagnostics, and an analyzer that reports the unit/right-unit/
    associativity comparisons together with truncation metadata.
  - ✅ Added Example 9’s coordinatewise vector relative monad via
    `relative/mnne-vector-monads.ts`, pairing lazy ℕ-indexed bases with
    approximation-aware analyzers and regression coverage in
    `test/relative/mnne-coordinatewise-vector.spec.ts` to detect unit and
    associativity failures under truncation.
  - ✅ Extended Example 10’s potentially infinite λ-term relative monad with
    `analyzeLazyLambdaRelativeMonad` and
    `describeCountableLambdaRelativeMonadWitness`, enabling symbolic context
    growth through replayable iterables and covering both the relative monad and
    Kleisli splitting diagnostics in
    `test/relative/mnne-lambda-lazy.spec.ts`.
  - ✅ Bridged Example 1’s arrow semantics with
    `analyzeFiniteVectorArrowCorrespondence` and
    `describeBooleanVectorArrowCorrespondenceWitness`, confirming that any
    supplied `arr`/composition witnesses act on vectors exactly like the
    relative monad’s unit/extension data.
  - ✅ Implemented Section 3.2’s `[J,C]` lax monoidal structure via
    `relative/mnne-lax-monoidal.ts`, supplying a two-object Lan\_j witness,
    identity/constant endofunctors, and an analyzer that checks the tensor,
    unitors, associator, and triangle identity. Regression coverage lives in
    `test/relative/mnne-lax-monoidal.spec.ts`, and `examples.ts` prints the
    resulting diagnostics alongside the other MNNE demos.
  - ✅ Added Theorem 3’s lax-monoid checker through
    `analyzeMnneLaxMonoid`, reusing the Lan\_j tensor/transformations to verify
    the recorded unit and multiplication witnesses satisfy the left/right unit
    laws and the associativity composite.
  - ✅ Introduced `relative/mnne-well-behaved.ts` with
    `analyzeMnneWellBehavedInclusion`, which witnesses Definition 4.1’s
    full-faithfulness requirement by enumerating finite hom-sets and confirming
    that `J` induces bijections on the chosen samples (while density and the
    Lan-derived comparison remain logged for future automation).
  - ✅ Implemented Section 4.3’s Lan extension bridge in
    `relative/mnne-monad-extensions.ts`, packaging the relative monad, the
    Lan\_J T endofunctor on C, the κ\_T comparison, and the induced Kleisli
    extension into `analyzeMnneRelativeMonadLanExtension`, with regression
    coverage in `test/relative/mnne-monad-extensions.spec.ts` and runnable
    output in `examples.ts`.

## 5. Update surrounding documentation and exports
- **Docs**
  - ✅ Added a dedicated "Relative monad scaffolding" section to `LAWS.md`, documenting the registry paths and pointing readers at `RelativeMonadOracles` and `enumerateRelativeMonadOracles`.
  - ✅ Updated `README.md` and `ORGANIZATION-PLAN.md` so the project overview highlights the `relative/` module, Street-action analyzers, and the exported enumerators.
  - ✅ Expanded `USAGE_CHEATSHEET.md` with identity-root conversion snippets and oracle enumeration walkthroughs for the new law checker.
- **Exports**
  - ✅ Re-exported the relative monad, adjunction, composition, and comonad helpers from `allTS.ts` to preserve the single-entry-point import surface.
  - ✅ Added runnable identity-root demonstrations in `examples.ts` that build a trivial relative monad and display aggregated oracle output.

## 6. Migration and compatibility pass
- **Deprecation strategy**
  - ✅ Annotated the legacy pushforward/Kleisli helpers in `allTS.ts` with
    `@deprecated` pointers to the relative constructors so downstream codemods
    can swap them for `relative/relative-monads` utilities.
  - ✅ Logged codemod targets in `relative/RELATIVE_MONAD_AUDIT.md`, including
    test suites and examples that should migrate once the adjunction bridges
    land.
- **CI hooks**
  - ✅ Confirmed the existing `tsconfig.*` entries include the `relative/`
    folder; no additional compiler plumbing required for the migration pass.
  - ✅ Added `scripts/validate-relative-monads.mjs`, a placeholder CLI that
    enumerates oracle output for the trivial relative monad so CI wiring is
    ready when Street-action witnesses arrive.

This roadmap keeps Step 2 grounded in the existing monad ecosystem while opening the door to the richer relative theory developed in the paper.

## 7. Composition and representation theorems
- **Relative adjunction composition (Corollary 5.34)**
  - ✅ Implemented `RelativeAdjunctionCompositionInput`/`analyzeRelativeAdjunctionComposition` in `relative/relative-composition.ts`, registered `relativeAdjunction.composition.compatibility`, and surfaced the report via `RelativeCompositionOracles.adjunctionComposition` and the enumerator.
- **Relative monad composition (Corollary 5.40)**
  - ✅ Added `RelativeMonadCompositionInput`/`analyzeRelativeMonadComposition`, wired the diagnostics into `RelativeCompositionOracles.monadComposition`, and validated the behaviour in `test/relative/relative-composition.spec.ts`.
- **Representation theorems**
  - ✅ Implemented `relativeMonadToLooseMonoid`/`relativeMonadFromLooseMonoid`, documented `relativeMonad.representation.looseMonoid`, and exposed the executable bridge through `RelativeCompositionOracles.looseMonoidBridge` with enumerator coverage and tests.

## 8. Dual theory — relative comonads
- **Core data and analyzers**
  - ✅ Mirrored the monad constructions in `relative/relative-comonads.ts`, introducing `RelativeComonadData`, framing/corepresentability/identity analyzers, and the trivial identity-root constructor for test fixtures.
- **Oracle surface and laws**
  - ✅ Extended `relative/relative-laws.ts` with the dual registry paths and implemented `RelativeComonadOracles`/`enumerateRelativeComonadOracles` to publish the framing, corepresentability, and identity-reduction diagnostics.
- **Enriched diagnostics**
  - ✅ Added `analyzeRelativeEnrichedComonad` and `analyzeRelativeComonadCoopAlgebra` to replay Proposition 8.22’s enriched cohom object and Theorem 8.24’s coopalgebra diagrams, with identity-case witnesses in `examples.ts` and Vitest coverage in `test/relative/relative-comonads.spec.ts`.

## 9. Expanded testing and oracle coverage
- **Test suites**
  - ✅ Added `test/relative/relative-composition.spec.ts` and `test/relative/relative-comonads.spec.ts`, exercising success and failure paths for the composition bridge, loose-monoid conversion, and dual comonad analyzers.
- **Oracle enumerators**
  - ✅ Implemented `enumerateRelativeCompositionOracles` and refreshed the documentation set so the composition and representation oracles appear alongside the relative monad/comonad enumerators.
