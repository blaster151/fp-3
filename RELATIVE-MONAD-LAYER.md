# Relative Monad Layer — Detailed Step Plan

## 1. Promote current monad infrastructure to the relative setting
- **Audit existing monad data models**
  - Inspect `CatMonad`, `MonadK1`, and helper types in `allTS.ts` to catalogue the exact fields (unit, bind, Kleisli builders) that the relative version must generalise.
  - Note how `pushforward-monad` utilities in `allTS.ts` and their tests in `test/pushforward-monad.spec.ts` already compose monads via adjunctions; list each dependency so the relative upgrade does not break them.
  - Identify places where ordinary monads are assumed to be endofunctors (e.g., `Kleisli` helpers in `allTS.ts`, derived examples in `examples-mixed-distributive.ts`) so we can either specialise them to the identity-root case or factor a common core.
- **Extract reusable law/oracle hooks**
  - Gather the law checkers in `algebra-oracles.ts` and the monad-style witnesses sprinkled through `markov-laws.ts` that query monad identities; plan to parameterise them over a “root functor” so the same code validates relative structures once provided with adapters.
  - Map out which Vitest suites (for example `test/pushforward-laws.spec.ts` and `test/core-adjunction.spec.ts`) should remain untouched and which need relative-aware variants.

## 2. Design the `RelativeMonad` interface
- **Core type signature**
  - Introduce a new interface `RelativeMonad<J, M>` in `relative/relative-monad.ts` capturing:
    - `root: J` — a tight 1-cell/functor reused from the virtual equipment layer (`virtual-equipment.ts`).
    - `carrier: M` — the monad-like action, i.e., a tight 1-cell out of the root’s codomain.
    - `unit` and `extend` 2-cells encoded as natural transformations, using the same `NatTrans` representation as `CatNatTrans`.
  - Provide helper aliases `RelativeMonadOn<C, D>` to keep API parity with the `CatMonad<C>` pattern.
- **Framing diagnostics (Definition 4.1)**
  - Implement `analyzeRelativeMonadFraming` in `relative/relative-monads.ts` that checks the unit and extension 2-cells share the
    same domain/codomain data as the chosen root/carrier and that their frames really land in the loose arrow `E(j,t)`.
  - Surface a `RelativeMonadLawRegistry` with entries `relativeMonad.unit.framing`, `relativeMonad.extension.framing`, and
    `relativeMonad.extension.associativity` so documentation and oracle registries can reference the new structural checks.
  - Provide `RelativeMonadOracles` returning structural-invariant reports for the framing checks and a pending stub for the
    associativity pasting equality until the tight 2-cell comparisons are in place.
  - Add a Definition 4.16-oriented analyzer `analyzeRelativeMonadRepresentability` that consumes the `RepresentabilityWitness`
    emitted by the equipment layer’s B(f,1) restrictions, certifying that `E(j,t)` is representable and documenting how the
    relative monad realises a monoid in `X[j]`.  Register the associated
    `relativeMonad.representableLooseMonoid` law/oracle entry so the bridge between relative monads and representable loose
    monoids stays visible to future contributors.
  - Introduce `analyzeRelativeMonadIdentityReduction` plus a
    `relativeMonad.identityReduction` law/oracle so Corollary 4.20’s
    “relative monads generalise ordinary monads” statement is executable.
    The analyzer demands that the root and carrier coincide with the
    identity boundary and that the loose arrow is endo on that object,
    exposing actionable diagnostics when a candidate fails to collapse to
    a classical monad presentation.
  - Add `analyzeRelativeMonadSkewMonoidBridge` and the
    `relativeMonad.skewMonoid.bridge` law/oracle so Theorem 4.29’s
    skew-monoidal equivalence is visible.  The analyzer should aggregate the
    left-extension, j-absolute, density, and fully faithful reports supplied
    by the virtual-equipment layer together with a loose-monoid framing
    witness, surfacing precise failures when any hypothesis of the theorem is
    missing.
- **Identity-root embedding**
  - Implement a constructor `fromMonad(monad: CatMonad<C>)` that produces a relative monad whose root is the identity on `C`; ensure the types line up so existing monads can be passed where a relative monad is expected without extra ceremony.
  - Write dual helpers `toMonadIfIdentity` that attempt to collapse a relative monad back to an ordinary monad when the root is `Id`.
  - Extend the plan with the functor `E(j,-) : \mathrm{RMnd}(j) → \mathrm{Mnd}_{X[j]}(A)` from Theorem 4.22: document the
    fully faithful embedding and add TODOs to reuse the loose-monoid analyzers once the representable loose monoid bridge is
    executable.  Flag that the square with the forgetful functors should commute on the nose to keep the classical EM/Kleisli
    interfaces aligned.
  - Track Remark 4.24 by recording TODOs that, whenever the root is representable, the planned `toMonadIfIdentity` collapse
    recovers Levy’s representable relative monads and Altenkirch–Chapman–Uustalu skew monoids.  Point follow-up work to the
    representability witnesses emitted by the equipment layer so the reduction can be made executable.
- **Law surface**
  - Mirror the classical `bind`/`join` convenience wrappers by introducing `extend`/`kleisli` helpers that accept morphisms `j a -> M b` and return `M a -> M b`, reflecting the paper’s extension operator.

## 3. Integration with the virtual equipment layer
- **Type plumbing**
  - Re-export the `RelativeMonad` interface from `virtual-equipment/index.ts` so clients only import from the central equipment module.
  - Ensure the generic parameters align with the `VirtualEquipment` data kinds (objects, tight cells, proarrows) introduced in `VIRTUAL-EQUIPMENT-LAYER.md`.
- **Root functor compatibility**
  - Define an adapter `relativeMonadFromEquipment(equipment, root, carrier, unit, extend)` that validates the domain/codomain compatibility using the equipment’s composition utilities before constructing the `RelativeMonad` value.
  - Provide fallback behaviour or descriptive errors when the root lacks a companion/conjoint needed later by relative adjunctions.
  - Depend on the representability helpers promised in Definition 2.11 so any `relativeMonadFromEquipment` attempt can demand that the carrier admits the necessary B(-,f) style companions, leveraging the B(f,1)/B(1,g) restrictions already exposed in Step 3; bubble detailed diagnostics when the equipment only certifies “maps” (via the loose adjunction analyser) rather than fully representable proarrows.
  - Reuse the loose-monoid analyzers from `virtual-equipment/loose-structures.ts` so relative monads derived from loose monads automatically certify that their multiplication/unit 2-cells have the expected framing before constructing the tight-side data.
  - Leverage the skew-multicategory analyzers from `virtual-equipment/skew-multicategory.ts` (Remark 4.5/Theorem 4.7) to double-check that any proposed relative monad multiplication/unit behaves as a monoid in the associative-normal left-skew multicategory of loose arrows based at the chosen root.  Feed the resulting diagnostics into the oracle layer so future work can assert the paper’s Proposition 4.12 equivalence between relative monads and loose monoids.
  - When relative monads surface via weighted Kan extensions, rely on the
    `virtual-equipment/extensions.ts` analyzers to confirm that the chosen
    right extensions/right lifts satisfy Definition 3.2 and Lemma 3.4 before
    extracting tight data, and invoke the `virtual-equipment/limits.ts`
    weighted cone/cocone analyzers to ensure the underlying colimit/limit
    framing matches Definition 3.9 and Lemma 3.13.
  - Use the density/absolute analyzers in `virtual-equipment/absoluteness.ts`
    so relative monads derived from j-absolute presentations certify that the
    root tight cell is dense and that the associated left extensions/pointwise
    lifts inherit the correct framing.
  - Rely on the faithfulness analyzers in `virtual-equipment/faithfulness.ts`
    when constructing relative monads from pointwise left extensions.  Fully
    faithful roots should pass `analyzeFullyFaithfulTight1Cell`, and any
    presentation via left extensions must satisfy
    `analyzePointwiseLeftExtensionLiftCorrespondence` and
    `analyzeFullyFaithfulLeftExtension` before extracting the tight data.

## 3b. Relative adjunction scaffolding
- **Definition 5.1 framing**
  - Introduce `RelativeAdjunctionData` with root `j : A → E`, left `ℓ : A → C`,
    and right `r : C → E` boundaries together with a framed isomorphism
    `C(ℓ-, -) ≅ E(j-, r-)`. Implement
    `analyzeRelativeAdjunctionFraming` and `analyzeRelativeAdjunctionHomIsomorphism`
    so tests can confirm the domains/codomains agree and the chosen 2-cells
    reuse `ℓ` and `r` exactly.
  - Provide `RelativeAdjunctionOracles` mirroring the new law catalogue entries
    (`relativeAdjunction.framing`, `relativeAdjunction.homIso.framing`) and
    expose an executable `relativeAdjunction.unitCounit.presentation` check
    derived from Lemma 5.5. The oracle should demand an explicit unit/counit
    presentation and confirm that the 2-cells reuse the designated boundaries
    before reporting success; when no presentation is supplied it should emit a
    structured pending diagnostic so future mate-calculus work knows how to
    proceed.
- **Relative adjunction documentation**
  - Extend `LAWS.md`, `README.md`, and `ORGANIZATION-PLAN.md` with the new
    registry paths so contributors can discover the Definition 5.1 checks and
    their pending unit/counit upgrade.
- **Relative monad integration**
  - Leave TODOs in `relative/relative-monads.ts` referencing the adjunction
    analyzers so future work can derive monads from adjunctions and compare the
    resulting Kleisli/Eilenberg–Moore data against the machinery introduced in
    Section 6.
  - Add Definition 5.14/5.18/5.23 morphism analyzers so categories such as
    \(\mathrm{RAAdj}_j(j)\) become executable: verify that left morphisms share
    the root and reuse the left legs as 2-cell boundaries, right morphisms reuse
    the right legs, and strict morphisms aggregate both reports while enforcing a
    common comparison tight cell.
  - Record Lemma 5.17 and Lemma 5.21 by documenting that the morphism analyzers
    feed the slice/coslice embeddings, and note that the forthcoming oracles will
    check those embeddings explicitly once representable examples surface.
  - Track Theorem 5.24 with a dedicated registry/oracle entry that compares the
    relative monad induced by a relative adjunction against its hom-isomorphism
    witnesses.  The first cut can validate framing data while leaving the mate
    calculus equality as a TODO for future work.
- **Pointwise lifts and left extensions (Section 5)**
  - Add analyzers/oracles validating Proposition 5.8 (`RelativeAdjunctionOracles.pointwiseLeftLift`) so any relative adjunction
    derived from pointwise left lifts must exhibit matching domains/codomains between the lift data and the right leg.
  - Encode Proposition 5.10 via `RelativeAdjunctionOracles.rightExtension`, threading the j-absolute, fully faithful, and pointwise
    hypotheses from the equipment layer before recovering the right leg from a left extension.
  - Capture Proposition 5.11 through `RelativeAdjunctionOracles.colimitPreservation`, ensuring that whenever the root preserves a weighted
    colimit, the left leg inherits the same weight boundaries and preservation witness.

## 4. Law checking and oracle design
- **Executable laws**
  - Extend `algebra-oracles.ts` with `checkRelativeMonadLaws` returning `{holds, witness}` objects following the Structural Invariant pattern; reuse sampling harnesses from existing monad checks but parameterise them by the root functor.
  - Add fine-grained checks: unit compatibility (`extend(unit) = identity`), associativity of extension, and preservation of identities along the root.
- **Witness extraction**
  - Ensure the oracle returns witness transformations (e.g., explicit composites) that demonstrate failures, mirroring the repository standard.
- **Testing**
  - Create `test/relative/relative-monad-laws.spec.ts` verifying:
    - Ordinary monads embedded via `fromMonad` satisfy the relative laws.
    - A toy non-trivial root (e.g., the inclusion functor `Δ_0 -> FinOrd` from `finord.ts`) produces a valid relative monad using mock extension/unit data.

## 4b. Relative Kleisli and Eilenberg–Moore constructions
- **Opalgebra/algebra framing (Section 6)**
  - Add `RelativeKleisliPresentation` and `RelativeEilenbergMoorePresentation`
    capturing the chosen opalgebra/algebra actions with their vertical
    boundaries. Implement
    `analyzeRelativeKleisliUniversalProperty` and
    `analyzeRelativeEilenbergMooreUniversalProperty` so tests can assert that
    the actions genuinely reuse the root/carrier boundaries demanded by the
    paper’s universal property statements.
  - Register `relativeMonad.kleisli.universalOpalgebra`,
    `relativeMonad.eilenbergMoore.universalAlgebra`, and the pending
    `relativeMonad.universal.strengthenedComparisons` entries so stronger
    universal properties (Theorem 6.39/6.49) remain visible in `LAWS.md` and the
    oracle registry.
- **Examples and tests**
  - Provide trivial constructors (identity monad case) that feed the analyzers
    and oracles, mirroring the approach used for relative monads and adjunctions
    in the identity equipment. Extend the Vitest suites with positive and
    negative examples to keep the framing requirements executable.

## 5. Update surrounding documentation and exports
- **Docs**
  - Add a subsection to `LAWS.md` summarising the new relative monad laws and referencing the oracle function name.
  - Update `README.md` (architecture roadmap) and `ORGANIZATION-PLAN.md` to include the new `relative/` folder.
  - Write usage snippets in `USAGE_CHEATSHEET.md` showing how to convert existing monads to relative ones and how to invoke the new law checker.
- **Exports**
  - Re-export the new types/functions from `allTS.ts` to preserve the single-entry-point import style used across examples.
  - Update `examples.ts` or `examples-advanced-functors.ts` with a runnable snippet constructing a simple relative monad (using `virtualizeCategory` once available).

## 6. Migration and compatibility pass
- **Deprecation strategy**
  - Annotate legacy helpers that assume endofunctors with JSDoc `@deprecated` tags when a relative-aware alternative exists.
  - Provide codemod hints or TODOs indicating which files should migrate to the new API during subsequent steps (e.g., future relative adjunction work).
- **CI hooks**
  - Ensure `tsconfig.json` picks up the new folder, and extend ESLint rules if new naming patterns arise.
  - Plan for a follow-up script `scripts/validate-relative-monads.mjs` that batch-runs the oracle against registered instances, even if implemented as a placeholder for now.

This roadmap keeps Step 2 grounded in the existing monad ecosystem while opening the door to the richer relative theory developed in the paper.

## 7. Composition and representation theorems
- **Relative adjunction composition (Corollary 5.34)**
  - Introduce `RelativeAdjunctionCompositionInput` and `analyzeRelativeAdjunctionComposition` so the right leg of one relative adjunction must equal the root of the next, the left legs share their intermediate category, and the right legs align for tight composition.  Register the analyser under `relativeAdjunction.composition.compatibility` and surface it through `RelativeCompositionOracles.adjunctionComposition`.
- **Relative monad composition (Corollary 5.40)**
  - Provide `RelativeMonadCompositionInput`/`analyzeRelativeMonadComposition` to demand that consecutive relative monads share framing-compatible carriers and loose arrows.  Expose the check as `RelativeCompositionOracles.monadComposition`, ensuring failures report missing framing diagnostics.
- **Representation theorems**
  - Add `relativeMonadToLooseMonoid`/`relativeMonadFromLooseMonoid` so j-relative monads and loose monoids in `X[j]` can be converted back and forth with detailed reports.  Track the law as `relativeMonad.representation.looseMonoid` and expose an executable oracle `RelativeCompositionOracles.looseMonoidBridge`.

## 8. Dual theory — relative comonads
- **Core data and analyzers**
  - Mirror the relative monad structures in `relative/relative-comonads.ts`, adding `RelativeComonadData`, `analyzeRelativeComonadFraming`, `analyzeRelativeComonadCorepresentability`, and `analyzeRelativeComonadIdentityReduction` together with the trivial identity-root constructor.
- **Oracle surface and laws**
  - Extend the law registry with `relativeComonad.counit.framing`, `relativeComonad.coextension.framing`, `relativeComonad.corepresentableLooseComonoid`, and `relativeComonad.identityReduction`, plumbing them through `RelativeComonadOracles` so right-restriction witnesses certify the dual of Theorem 4.16.

## 9. Expanded testing and oracle coverage
- **Test suites**
  - Add Vitest suites `test/relative/relative-composition.spec.ts` and `test/relative/relative-comonads.spec.ts` to exercise the new analyzers on the two-object category, covering success and failure diagnostics for composition, representation, and the dual theory.
- **Oracle enumerators**
  - Extend `RelativeCompositionOracles` with an enumerator so future tasks can batch-evaluate composition and representation checks.  Ensure documentation (LAWS.md, README.md, ORGANIZATION-PLAN.md) references the new registries and oracle entry points.
