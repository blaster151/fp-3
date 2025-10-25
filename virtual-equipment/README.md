# Virtual Equipment — Tight Primitive Catalogue

This folder collects the raw ingredients from the existing codebase that will
serve as the "tight" side of the forthcoming virtual-equipment layer.  Item 1 of
`VIRTUAL-EQUIPMENT-LAYER.md` asked us to catalogue these pieces so future steps
can reference a single import path when lifting the ordinary 2-categorical
machinery into the equipment setting.

## What lives here today?

- `tight-primitives.ts` re-exports the category/functor/natural-transformation
  aliases (`TightCategory`, `Tight1Cell`, `Tight2Cell`, …) so relative monads can
  talk about tight 1- and 2-cells without reaching back into disparate modules.
  It also ships adapters `promoteFunctor`/`demoteFunctor` that bridge the
  lightweight `Functor` interface from `functor.ts` with the richer `CatFunctor`
  ecosystem defined in `allTS.ts`, emitting structured law reports for the
  oracle system.
- `virtual-equipment.ts` now fleshes out the equipment interfaces from Step 3,
  supplying endpoint-aware helpers for composing proarrows, vertically/
  horizontally composing 2-cells, and performing left/right whiskering.  The
  `virtualiseTightCategory` helper packages an ordinary tight category as a
  degenerate equipment while reusing the repository’s existing natural-
  transformation calculus, and `virtualizeCategory` adds a convenience entry
  point that accepts any `SimpleCat` along with optional object listings.
  Recent updates introduced explicit left/right restriction hooks returning
  cartesian witness metadata (`direction`, `vertical`, `details`) so later layers
  can reason about companions via the universal property story, along with
  framed 2-cells and multiary loose composition helpers
  (`horizontalComposeManyProarrows`, `frameFromSequence`,
  `juxtaposeIdentityProarrows`) so non-globular pasting diagrams and empty
  juxtapositions remain first-class citizens.  The restriction builders now
  implement the full B(f,1)/B(1,g) calculus from Notation 2.8 by pre- and
  post-composing loose arrows with arbitrary tight 1-cells, returning cartesian
  witnesses suitable for companion/conjoint construction.  Each restriction now
  emits a `RepresentabilityWitness` whenever the loose arrow being restricted is
  an identity, recording the B(-,f)/B(f,-) data promised by Definition 2.11 so
  later layers can distinguish representable companions from general maps.
- `adapters.ts` hosts ready-made virtualisations for `FiniteCategory`, `RelCat`,
  `SetCat`, and the slice/coslice constructions so later steps can reach for
  concrete equipments without re-deriving the tight data.  The adapters share
  the same proarrow payload type as `virtualiseTightCategory`, ensuring tests
  and future relative monad code can mix and match instances freely.
- `companions.ts` / `conjoints.ts` now ship executable constructors that factor
  through the restriction calculus.  `constructCompanionFromRestrictions` and
  `constructConjointFromRestrictions` recover the canonical B(f,1)/B(1,f)
  proarrows, validate that the resulting loose arrows land on the requested
  domain/codomain, and thread any `RepresentabilityWitness` evidence back to the
  caller.  The identity-heuristic helpers
  (`companionViaIdentityRestrictions`/`conjointViaIdentityRestrictions`) are now
  thin adapters over those constructors so legacy call sites keep working while
  the new tests exercise the full Rel/slice/coslice instances.
- `loose-structures.ts` introduces `analyzeLooseMonoidShape` (aliased as
  `analyzeLooseMonadShape`) which encodes Definition 2.16’s framing checks for
  loose monads: it verifies that multiplication sources are composable strings
  of the loose arrow, that unit sources come from the identity loose arrow, and
  that all vertical boundaries are witnessed by tight identities.  Relative
  monad construction will reuse this analyzer to guarantee that loose
  presentations are well shaped before extracting tight data, and the
  `RepresentabilityWitness` metadata surfacing from the restriction builders is
  now threaded into the relative-monad layer’s Definition 4.16 checks that tie
  representable loose monoids in `X[j]` back to j-relative monads.
- `skew-multicategory.ts` adds Remark 4.5/Theorem 4.7-oriented helpers for the
  associative-normal left-skew multicategory structure on loose arrows.  The
  new `analyzeLooseSkewComposition` validator ensures that substituting
  multimorphisms into each slot of a loose composite preserves framing and
  identity boundaries, while `describeIdentityLooseMultimorphism` packages the
  nullary identity multimorphism used in Remark 4.8 and Proposition 4.12 when
  recasting relative monads as loose monoids.
- `maps.ts` adds `analyzeLooseAdjunction`, a Definition 2.21-oriented check that
  inspects unit/counit framing for a loose adjunction and flags when the right
  leg is representable.  The resulting report classifies the left proarrow as a
  “map” precisely when a `RepresentabilityWitness` accompanies the right leg,
  reflecting Remark 2.20’s warning that maps need not be representable.
- `extensions.ts` introduces framing analyzers for the right extension/right
  lift calculus (`analyzeRightExtension`, `analyzeRightLift`, and
  `analyzeRightExtensionLiftCompatibility`).  These checks enforce the object
  and boundary bookkeeping spelled out in Definition 3.2 and Lemma 3.4, paving
  the way for executable oracles covering weighted limits and lifts.
- `limits.ts` adds Definition 3.9/Lemma 3.13/Lemma 3.14 analyzers.  The helpers
  `analyzeWeightedCone`, `analyzeWeightedCocone`,
  `analyzeWeightedColimitRestriction`, `analyzeWeightedLimitRestriction`, and
  `analyzeLeftExtensionFromWeightedColimit` validate that weighted
  cones/cocones reuse the expected boundaries and that restrictions/left
  extensions inherit those witnesses.
- `absoluteness.ts` captures the density/absolute colimit calculus from
  Definitions 3.19–3.24.  `analyzeDensityViaIdentityRestrictions` checks that
  B(f,1)/B(1,f) exist with representability witnesses, while
  `analyzeAbsoluteColimitWitness`, `analyzeLeftExtensionPreservesAbsolute`, and
  `analyzePointwiseLeftLift` enforce the framing conditions highlighted in
  Lemma 3.22 and Lemma 3.23.
- `faithfulness.ts` builds on Proposition 3.26 and Definitions 3.27–3.29 by
  introducing analyzers for fully faithful tight 1-cells and their interaction
  with pointwise left extensions.  `analyzeFullyFaithfulTight1Cell` confirms
  that identity restrictions yield B(f,1)/B(1,f) witnesses with
  representability data, `analyzePointwiseLeftExtensionLiftCorrespondence`
  checks that pointwise left extensions and left lifts share their framing, and
  `analyzeFullyFaithfulLeftExtension` verifies that left extensions along fully
  faithful tight cells have invertible counits.  Together with the weighted
  colimit and density modules, these reports feed the Theorem 4.29 summaries
  consumed by the relative layer’s skew-monoid bridge.
- `bicategory.ts` packages a bicategory-facing façade for any virtual
  equipment that provides weak composition data.  It exposes
  `bicategoryFromEquipment` to surface associators/unitors, and ships
  executable analyzers `analyzeBicategoryPentagon` and
  `analyzeBicategoryTriangle` that reuse the Street pasting calculus to compare
  red/green composites.
- `bicategory-adapters.ts` realises a canonical weak example by turning finite
  sets and spans into a bicategory.  The module implements the span 2-cell
  calculus, wires weak composition through to the bicategory façade, and exports
  `makeFiniteSpanBicategory` together with `createFiniteSpan` for constructing
  concrete spans in tests and examples.  The coherence analyzers power the
  Vitest suite in `test/virtual-equipment/bicategory-span.spec.ts`, which checks
  that the pentagon and triangle oracles succeed on representative finite-span
  composites.
- `equipment-laws.ts` and `equipment-oracles.ts` sketch the coherence laws we
  intend to check and provide pending-oracle stubs that follow the existing
  oracle conventions in the repository.  A `summarizeEquipmentOracles` helper
  now packages the pending status into a structural-invariant style report so
  the registry keeps emitting `{holds, details}`-rich diagnostics.  The law
  catalogue includes `extensions.*`, `faithfulness.*`, and `absolute.*` entries
  to track forthcoming right extension/right lift, fully faithful, and
  j-absolute witnesses alongside the existing companion/conjoint scaffolding.
- `index.ts` re-exports the public surface so downstream files can import from
  `virtual-equipment/` without worrying about file layout churn.
- `core-adjunction-bridge.ts` links the `CoreAdjunction` utilities from
  `stdlib/category.ts` with the relative layer by validating a
  `RelativeAdjunctionData`/`RelativeAdjunctionSectionWitness` pair before
  packaging it alongside the classical adjunction.  The helper surfaces a
  triangle-identity check so tests can round-trip adjunctions through the bridge
  without re-implementing the Definition 5.1 analyzers.

The folder now acts as the dedicated module boundary for the equipment layer.
Later steps will start filling in the placeholder constructors and oracles while
keeping the overall import story stable.
