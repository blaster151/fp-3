# Virtual Equipment Layer — Detailed Step Plan

## 1. Catalogue the existing 2-categorical primitives
- **Harvest the "tight" side from current modules**
  - Reuse `SimpleCat` from `simple-cat.ts` as the ambient 1-category signature we already exercise in `functor.ts` and the `CatFunctor`/`CatNatTrans` toolkit inside `allTS.ts`.
  - Note how concrete categories such as `RelCat` (`rel.ts`), `slice`/`coslice` categories (`slice-cat.ts`, `coslice-precompose.ts`, `coslice-reindexing.ts`), and pushforward/pullback helpers (`pushout.ts`, `pullback.ts`) already package source/target bookkeeping. These give us the canonical examples to embed into an equipment once the proarrow level exists.
  - Inventory adjunction scaffolding (`CoreAdjunction`, `Adjunction`, `CatCompose`, `CatId`, etc.) in `allTS.ts` so the future relative layer can wrap it without regressing the classic APIs consumed in `test/core-adjunction.spec.ts` and `test/pushforward-monad.spec.ts`.
- **Decide what becomes data vs. structure**
  - Tight 1-cells correspond to existing `CatFunctor` values; 2-cells correspond to `CatNatTrans`. Capture that mapping explicitly in documentation to guide future adapters.
  - The equipment’s objects can stay aligned with our current `CObj`/`DObj` generics, so the migration path for downstream files (`examples.ts`, `probability-monads.ts`, `markov-*`) is purely additive.

## 2. Carve out a dedicated module boundary
- **Create a `virtual-equipment/` folder** under the repository root to host: `virtual-equipment.ts` (core interfaces), `companions.ts`, `conjoints.ts`, `equipment-laws.ts`, and `equipment-oracles.ts`.
  - Keep the folder flat for now—mirroring how `slice-cat.ts` and `pullback.ts` live at the root—so existing import conventions stay valid.
  - Add an index barrel (`virtual-equipment/index.ts`) so `allTS.ts` can later re-export the machinery without losing the single-entry-point ergonomics.
- **Document integration points**
  - In `README.md` (architecture section) and `LAWS.md` (new subsection), cross-link the equipment layer once it lands so our test writers know where to register oracles.
  - Wire a TODO comment in `allTS.ts` near the `CoreAdjunction` section that points to the new folder, preserving discoverability for contributors accustomed to the monolithic file.

## 3. Specify the `VirtualEquipment` interface and helpers
- **Type-level scaffolding**
  - Encode objects, tight 1-cells, proarrows, and 2-cells as separate generics; expose helper aliases like `Tight<C, D>` for compatibility with the existing `CatFunctor` style signatures.
  - Provide constructors for identity proarrows and horizontal/vertical composition, taking inspiration from `composeRel` in `rel.ts` and the composition utilities inside `CatCompose` (`allTS.ts`).
  - Represent loose composites via explicit frames: a 2-cell’s source/target are now ordered lists of proarrows equipped with left/right boundary objects _and_ explicit vertical boundaries so non-globular diagrams, multi-source pastings, and non-identity mates are tracked explicitly.
  - Surface helpers such as `horizontalComposeManyProarrows`, `frameFromSequence`, and `juxtaposeIdentityProarrows` so contributors can paste multiary strings of loose arrows and build nullary frames without reimplementing boundary accounting.
- **Companions and conjoints**
  - Model companions/conjoints as partial constructors that accept a tight 1-cell and return distinguished proarrows. These will mimic how `slice-cat.ts` packages morphisms into structured objects.
  - Route every companion/conjoint attempt through explicit left/right restriction builders so cartesian witnesses can be threaded back to the oracle layer; fall back to diagnostic failures mirroring the optional limit style in `pushout.ts`/`pullback.ts` when restrictions are unavailable.
  - Expose restriction builders that implement the B(f,1) and B(1,g) operators from Notation 2.8 of Arkor–McDermott by pre- and post-restricting proarrows along arbitrary tight cells. The degenerate `virtualiseTightCategory` helper should realise these restrictions as functor pre/post-composition so the canonical companion B(-,f) and conjoint B(f,-) definitions in Definition 2.9 become executable out of the box.
- **2-cell calculus**
  - Define whiskering and compositor utilities parallel to `prewhiskerNat`/`postwhiskerNat` (see `CatNatTrans` helpers in `allTS.ts`) so relative adjunction proofs can later reuse them verbatim.
  - Record when a 2-cell is cartesian by pairing it with the tight boundary data (`direction`, `vertical`) that witnessed the restriction, enabling the later zig–zag identities to query the witness metadata directly and reuse composed vertical boundaries.
  - Track framed 2-cells with explicit vertical boundaries so Definition 2.11’s representability criterion can be checked in code; restriction builders should emit `RepresentabilityWitness` metadata whenever they restrict an identity loose arrow, and a follow-on helper (`maps.ts`) should analyse loose adjunctions to identify when the left leg is merely a map despite (or because of) a representable right leg, mirroring Remark 2.20.
  - Preserve these `RepresentabilityWitness` values so the relative-monad layer can witness Theorem 4.16’s equivalence between
    j-relative monads and monoids in `X[j]` whose loose arrows are representable; the new analyzer should accept the witness
    emitted by `restrictions.left` without requiring bespoke bookkeeping in later steps.
  - Export `verticalBoundariesEqual` so downstream code (including the new relative-monad framing analyzer) can compare tight boundaries using the equipment’s equality witness instead of inlining comparison logic.
  - Document how framed 2-cells support relative adjunctions: provide helpers
    that construct and validate hom-set isomorphism witnesses so the relative
    layer can check Definition 5.1 without rebuilding boundary bookkeeping.
  - Surface loose-monoid helpers that package the data from Definition 2.16 (object, loose cell, multiplication, and unit 2-cells) and validate that their frames arise from composable loose arrows with identity vertical boundaries.  These will feed the upcoming relative-monad layer, where loose monads present tight monads via companions/conjoints.
  - Add `skew-multicategory.ts` to track the associative-normal left-skew multicategory structure from Remark 4.5 and Theorem 4.7.  Start with analyzers such as `analyzeLooseSkewComposition` and `describeIdentityLooseMultimorphism` that confirm substitution data matches the framing of multi-source loose composites, giving later tasks a place to encode the zig–zag identities and monoid composition laws for relative monads viewed as loose monoids.
  - Prepare aggregate analyzers that combine the left-extension, absolute, density, and fully faithful witnesses (`extensions.ts`, `absoluteness.ts`, `faithfulness.ts`) into Theorem 4.29-style summaries.  These reports will power the relative layer’s skew-monoid bridge by certifying the hypotheses needed to equip `X[j]` with its left skew-monoidal structure.
  - Provide analyzers for the right extension/right lift calculus of Definition 3.2
    and Lemma 3.4 (`analyzeRightExtension`, `analyzeRightLift`, and
    `analyzeRightExtensionLiftCompatibility`) so weighted limit/lift witnesses
    have executable framing checks before the oracle layer lands.
  - Add Definition 3.9 / Lemma 3.13 / Lemma 3.14 analyzers capturing weighted
    cones, weighted cocones, the interaction of B(f,1)/B(1,g) restrictions with
    those structures, and the fact that pointwise left extensions computed via
    weighted colimits inherit the cocone framing.  Expose these through a
    dedicated `limits.ts` helper module so later steps can register matching
    oracles.
  - Capture Definitions 3.19–3.24 by introducing `absoluteness.ts`.  The module
    should verify that dense tight cells admit identity restrictions with
    representability witnesses and that j-absolute colimits, left extensions,
    and pointwise left lifts reuse the same boundary data, wiring the analyzers
    into the oracle registry.
  - Introduce `faithfulness.ts` to house analyzers for Proposition 3.26 and
    Definitions 3.27–3.29.  `analyzeFullyFaithfulTight1Cell` should confirm that
    identity restrictions witness the companion/conjoint data promised by full
    faithfulness, `analyzePointwiseLeftExtensionLiftCorrespondence` should check
    that pointwise left extensions and left lifts share their unit/counit
    framing, and `analyzeFullyFaithfulLeftExtension` should demand invertible
    counits when extending along fully faithful tight 1-cells.  Register matching
    `faithfulness.*` law descriptors so oracles can surface these checks.

## 4. Bridge classic categories into the equipment
- **Adapters for ordinary categories**
  - Implement a `virtualizeCategory` helper that takes a `SimpleCat` plus `CatFunctor`/`CatNatTrans` implementations (as provided in `functor.ts` and `allTS.ts`) and produces the degenerate equipment where proarrows are just functors.
  - Provide ready-made instances for `RelCat`, `slice-cat.ts`, and `set-cat.ts` so the upcoming relative monad work ships with concrete exemplars and unit tests.
- **Testing harness**
  - Add Vitest suites under `test/virtual-equipment/` mirroring the existing `test/core-adjunction.spec.ts` pattern: start with identity/companion coherence, then exercise whiskering/associativity using finite carriers pulled from `finord.ts` and `finite-cat.ts`.
  - Stub oracle hooks in `equipment-oracles.ts` following the structural invariant pattern from `algebra-oracles.ts`, ensuring each law emits `{holds, details}` objects.
  - Extend the tests/oracles with explicit cases for the B(f,1)/B(1,g) restrictions, the representability witnesses from Definition 2.11, and the Definition 2.21 loose-map analyser so we can witness companions, conjoints, and their cartesian 2-cells behaving as described in the paper’s early sections.

## 5. Tooling and ergonomics
- **Code generation and typing**
  - Update `tsconfig.json` paths if necessary so the new folder participates in builds (`compilerOptions.paths['virtual-equipment/*']`).
  - Add ESLint overrides if the folder introduces new abstraction layers (see `tsconfig.eslint.json`).
- **Developer experience**
  - Document CLI examples in `examples.ts` (adjunction section) that print companion/conjoint constructions, ensuring `run-examples.ts` continues to execute end-to-end.
  - Prepare scaffolding for future codemods: augment `scripts/` with a `generate-virtual-equipment.mjs` stub that future tasks can flesh out to automate instance creation from category data.

This breakdown keeps the “virtual equipment” step grounded in today’s code, making the relative monad layers that follow a mechanical extension instead of a disruptive rewrite.
