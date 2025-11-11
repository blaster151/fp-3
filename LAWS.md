# Algebraic Laws and Witnesses

This document catalogs the algebraic laws that our functional programming constructs must satisfy. Each law should have:
1. **Law** - The mathematical equation
2. **Shape** - The IR pattern it matches
3. **Witness** - A property test that verifies the law

> **Doc tags:** `Registry Path`, `Witness Builder`, and `Check` highlight how LAWS.md entries map into `markov-oracles.ts` and adapter code. The stub generator reads those fields to verify that documented oracles have concrete scaffolds.

## Registry linkage at a glance

`LAWS.md` serves as the contributor-facing index for every registered law, while the runtime looks to the TypeScript catalogues for executable descriptors. Each Markdown entry mirrors a `registryPath` defined in files such as `relative/relative-laws.ts`. Oracle enumerators (for example `RelativeMonadOracles`, `RelativeAlgebraOracles`, and `RelativeCompositionOracles`) load those descriptors when producing diagnostics so the emitted results reuse the same paths that appear in this document. In short, the Markdown keeps humans oriented, and the registry modules provide the programmatic entry points that law-checking tooling evaluates.

> **Notation:** We use “source/target” (aka domain/codomain) and write composition as \(g \circ f = \texttt{compose(g, f)}\); identity morphisms appear as \(\mathrm{id}_A\) in prose and `id(A)` in code.

## Day–Chu interaction law constructors

### Stretching interaction law packaging

- **Helper:** `stretchInteractionLaw(law, { left, right, mapLeft, mapRight, ... })` realises the Section 2.3 construction \((F', G', g ∘ φ ∘ f)\) by precomposing each Day fiber with the supplied natural transformation components. The helper reuses the original law’s aggregation logic so stretched evaluations remain observationally equal.
- **Witness Builder:** `analyzeFunctorOperationDegeneracy(law)` now reports `finalLaw` witnesses alongside nullary and commutative-binary collapse traces, pulling in `finalInteractionLaw(kernel)` when degeneracies surface. The same report documents Lawvere comparisons and Day fiber references for replaying the proof steps of Theorems 1–2.
- **Check:** `test/functor-interaction-law.spec.ts` exercises the stretching helper (“stretches interaction laws via natural transformations”), verifies the `selfDualInteractionLaw` pairing against the dual Chu space, and confirms that `finalInteractionLaw` returns the constant-zero evaluation demanded by the final object of `IL(𝒞)`.
- **Check (update):** `checkInteractionLawStretching(base, stretched, { mapLeft, mapRight })` samples stretched witnesses, maps them back through the supplied transforms, and ensures the resulting evaluations match `g ∘ φ ∘ f`; the regression suite asserts that the identity stretch passes without mismatches.
- **Implementation Notes:** Nullary and commutative-binary degeneracy reports embed the constructed `finalInteractionLaw`, giving oracles a concrete collapse object to compose with stretching-derived diagnostics.
- **Implementation Notes (update):** Degeneracy reports additionally surface the explicit `SetCat` homs witnessing `GY → 0` and `0 → GY`, so collapse oracles can replay Theorems 1–2 with concrete zero-object comparisons rather than inferred metadata.
- **Implementation Notes (update):** Commutative-binary traces now enumerate each Theorem 2 proof stage (`δ_Y`, lifted `α^2_Y`, substitution witnesses, Lawvere comparisons, Day-fiber indices) and attach structured artifact bundles so diagnostics can quote the recorded arrows and remaining factorisation gaps.
- **Implementation Notes (update):** The commutative-binary analyzer additionally materialises the uniqueness factorisation, emitting `h_Y : GY → 1`, its diagonal `δ'_Y : GY → 1 + 1`, and `k'_Y : GY → 0 + 0` before reporting the collapse map `k_Y : GY → 0`.

### Binary product constructor

- **Helper:** `productInteractionLaw(law0, law1)` forms the categorical product in `IL(𝒞)` by pairing the Day fibers of `law0` and `law1`, aggregating their witnesses with the underlying `collect`/`aggregate` logic, and returning evaluation pairs in the product dualising object.
- **Helper:** `coproductInteractionLaw(law0, law1)` dualises the product construction, wiring coproduct injections for both functor witnesses, rerouting Day contributions through the matching summand, and returning evaluations in the coproduct dualising carrier.
- **Witness Builder:** The result includes `projections.left/right` lookups together with the dualising product carrier so projection diagnostics and Day-fiber traversals can recover each factor’s contribution.
- **Witness Builder (update):** `checkInteractionLawProductUniversalProperty(result, law0, law1)` samples Day witnesses, applies the recorded projections, and confirms both factor evaluations agree with the projected product value; `checkInteractionLawCoproductUniversalProperty(result, law0, law1)` mirrors the argument for coproduct injections and value inclusions.
- **Check:** `test/functor-interaction-law.spec.ts` (“forms categorical products of interaction laws”) validates the paired evaluation, confirms `collect`/`aggregate` compatibility, and inspects the recorded projection data for both functor components and the dualising carrier.
- **Check (update):** The same regression suite now executes the universal-property oracles for both the product and coproduct helpers, asserting that they succeed without emitting diagnostic details.
- **Check (update):** `test/functor-interaction-law.spec.ts` additionally confirms that stretching commutes with product and coproduct formation (“commutes with stretching across products and coproducts”), comparing the stretched composite against the composite of stretched laws elementwise.
- **Implementation Notes:** Operation metadata from both factors is merged so degeneracy analyzers continue to expose nullary/commutative-binary collapse evidence after forming products.

### Dual and Sweedler diagnostics overview

- **Helper:** `deriveInteractionLawSweedlerSummary(law, options?)` reuses cached Chu spaces, currying tables, comma presentations, and degeneracy metadata to produce Sweedler dual maps from both the primal and dual perspectives. Diagnostics explicitly state which caches were reused versus recomputed so downstream tooling can cite provenance without re-running Phase I helpers.
- **Helper:** `deriveInteractionLawSweedlerFromPrimal(law, options?)` and `deriveInteractionLawSweedlerFromDual(law, options?)` unwrap the summary into the contravariant/covariant evaluation homs demanded by Sweedler duality. Both helpers return the original summary so callers can forward the recorded diagnostics and degeneracy context to subsequent constructions.
- **Helper:** `dualInteractionLaw(law, options?)` packages the self-dual law obtained from `dualChuSpace`, threading the Sweedler summary and cached degeneracy metadata through the result while logging whether existing CCC or comma data were supplied.
- **Witness Builder:** `deriveInteractionLawCCCPresentation(law)` (see below) consumes the same summary to expose φ̂/φ̌ diagnostics and δ^X_Y tables, giving oracles a single entry point for CCC and Sweedler analyses.
- **Check:** `test/functor-interaction-law.spec.ts` (“derives Sweedler summaries and dual interaction laws”) asserts that the Sweedler maps evaluate to the original Day pairing on sampled witnesses, confirms provenance diagnostics mention reused caches, and verifies that `dualInteractionLaw`’s output agrees with `selfDualInteractionLaw` when supplied the cached Chu space.
- **Implementation Notes:** `deriveInteractionLawSweedlerSummary` falls back to the law’s stored operation metadata when explicit degeneracy notes are absent, ensuring collapse traces flow automatically into Sweedler diagnostics and into the `greatestInteractingFunctor`/`greatestInteractingComonad` helpers.

### Specialized dual constructors

- **Helper:** `dualOfIdentity(law, options?)` reuses the cached dual Chu space while replaying the identity proof \((F = Id ⇒ F° = Id)\). The helper compares the constructed dual with the original law after swapping arguments, reporting the swap-agreement statistics alongside the usual Sweedler diagnostics.
- **Helper:** `dualOfTerminal(law, { final? })` builds the constant-zero final interaction law via `finalInteractionLaw(kernel, …)` and checks that the generic dual collapses to the same empty carriers, emitting carrier-count diagnostics when the collapse fails.
- **Helper:** `dualOfProduct(left, right, options?)` forms the composite dual using the Section 2.5 isomorphism \((F × G)° ≅ G° × F°\), combining `dualInteractionLaw` on each factor with `productInteractionLaw` and comparing the result to the generic dual after applying the canonical swap on components.
- **Helper:** `laxMonoidalDualComparison(left, right, options?)` constructs the canonical comparison map \(m^{G_0,G_1}\) between \(G_0° ⊗ G_1°\) and \((G_0 × G_1)°\), reusing the specialised product dual, tabulating the swap-induced value map, and logging per-object agreement diagnostics together with any propagated degeneracy metadata.
- **Check:** `checkLaxMonoidalDualComparison(left, right, { sampleLimit? })` samples the comparison witnesses against the reference dual, verifies that the swap map is bijective when the lax structure upgrades to an isomorphism, and surfaces mismatching evaluations along with the recorded Day–Chu diagnostics.
- **Helper:** `dualOfInitial(law, options?)` packages the generic dual together with the fixed-left initial object from Phase I, surfacing the collapse witness `(F°, 0)` and propagating degeneracy metadata recorded on the input law.
- **Helper:** `dualOfCoproduct(left, right, options?)` replays the dual of a coproduct by applying `dualInteractionLaw` to each summand and assembling the result with `coproductInteractionLaw`, logging agreement diagnostics and merged degeneracy metadata when compared against the generic dual of `law0 ⊕ law1`.
- **Helper:** `dualOfWeightedSum(law, { weights, … })` reuses the generic dual while annotating the weighted Day integral witnesses with the supplied weight carriers, ensuring degeneracy metadata from both the law and the weighting set propagate to downstream Sweedler diagnostics.
- **Helper:** `dualLowerBound(law, { metadata?, … })` enumerates the Day pairing assignments contributing to the canonical map \(∫_Y GY ⇒ (X × Y) → G°X\), packages them as comparison carriers, and reports whether each objectwise map is an isomorphism (identity/terminal/product/coprod cases) or merely a lower bound, propagating degeneracy metadata into the recorded diagnostics.
- **Helper:** `dualOfExponentialIdentity(law, { parameter, … })` records the Section 2.5 identification \(G°X ≅ A × X\) by enumerating objectwise cardinalities, logging the parameter size, and comparing the specialised counts against the generic dual while threading degeneracy metadata from the source law and parameter annotations.
- **Helper:** `dualOfPositiveList(law, { decodeList, … })` replays Example 4’s θₙ construction by decoding each covariant witness into a non-empty list, grouping them by length, and emitting θ-summary diagnostics (including sequence previews) so the Day-to-Chu proof steps remain executable.
- **Check:** `test/functor-interaction-law.spec.ts` exercises all three helpers (“builds the identity dual with swap agreement diagnostics”, “constructs the dual of the terminal functor via the final law”, “assembles product duals from component duals”), verifying the recorded comparison statistics and ensuring the specialised constructions agree with the generic dual outputs.
- **Check (update):** The regression suite now covers the additional dual helpers (“packages the dual of the initial functor with witness metadata”, “assembles coproduct duals from component duals”, “records degeneracy metadata for weighted-sum duals”), asserting that the specialised constructors match the generic duals while exposing the recorded degeneracy summaries.
- **Check (update):** `test/functor-interaction-law.spec.ts` now covers the exponential-identity and positive-list helpers (“summarises exponential-identity dual cardinalities”, “records θ summaries for positive-list duals”), asserting that the recorded cardinality tables and θₙ diagnostics surface alongside the merged degeneracy metadata.

### Greatest interacting functor and comonad packaging

- **Helper:** `greatestInteractingFunctor(law, { sweedler?, comma?, dual? })` realises the “greatest functor interacting with `G`” by returning the internal-hom functor \([G(-), ⊙]\) together with its covariant opposite, the σ components as a natural transformation, and the cached Sweedler summary. Diagnostics reuse degeneracy metadata and note when cached comma/dual data were supplied, so callers can trace the construction back to Phase I witnesses without recomputation.
- **Helper:** `greatestInteractingComonad(law, { sweedler?, dual?, comma? })` mirrors the construction on the swapped interaction law, packaging \([F(-), ⊙]\) together with the induced natural transformation from `G` and propagating the same Sweedler/degeneracy context. The helper exposes the dual interaction law alongside the comonad functor so downstream code can compare the new carrier with the raw dual law.
- **Check:** `test/functor-interaction-law.spec.ts` exercises both helpers (“packages the greatest interacting functor with Sweedler evaluation witnesses”, “packages the greatest interacting comonad with Sweedler evaluation witnesses”), confirming that the σ components reproduce the original evaluation on the two-object kernel and that helper diagnostics include the new “Greatest functor/comonad” metadata markers.

### Initial algebra/currying adapters and fixed-side categories

- **Helper:** `deriveInteractionLawCurrying(law)` curries each Day fiber into `θ^X_Y : FX × GY → GY`, records the reconstructed `φ^X_Y` via `uncurry`, and flags any discrepancies so oracle tooling can replay the Section 2.4 initial algebra/final coalgebra proof steps objectwise.
- **Helper (update):** `deriveInteractionLawCurrying(law)` now surfaces the full Cartesian-closed triple \((φ^X_Y, \hat{φ}^X_Y, \check{φ}^X)\), including the exponential evaluation witnesses, the transposed map from `FX` into `G^X`, and diagnostic checks that the evaluation of \(\check{φ}^X\) agrees with the original Day pairing. The helper reports both double-transpose and evaluation consistency together with any recorded mismatches.
- **Helper:** `deriveInteractionLawCCCPresentation(law)` is an alias that emphasises the CCC view; it returns the same summary while exposing aggregate `hatEvaluationDiscrepancies` so coherence oracles can consume the CCC diagnostics directly.
- **Oracle:** `checkInteractionLawCCCPresentation(law)` replays the CCC summary, confirming double-transpose and φ̂-evaluation consistencies, packaging any fiber-level discrepancies, and aggregating the δ^X_Y evaluation tables derived from the promonoidal tensor so downstream phases can inspect the recorded Day-based samples directly.
- **Helper:** `deriveInteractionLawLeftCommaPresentation(law)` instantiates the internal-hom functor `G'X = [GX, ⊙]`, records the comma transformation `σ : F ⇒ G'`, and checks both the reconstructed Day evaluation and the naturality squares demanded by the `(F, G, σ)` presentation of `IL(𝒞)`.
- **Helper:** `deriveInteractionLawLeftCommaEquivalence(law)` uncurries the comma components back into `φ_X : F(X) × G(X) → ⊙`, compares them with the stored Day pairing, and replays the naturality condition `φ_X ∘ (Ff × id) = φ_Y ∘ (id × Gf)` objectwise.
- **Helper:** `makeFixedLeftInteractionMorphism({ domain, codomain, transformation })` and `makeFixedRightInteractionMorphism(...)` transport natural transformations on the right/left functors into morphisms of `IL(𝒞)_{F,-}` / `IL(𝒞)_{-,G}`, emitting comparison tables that certify evaluation preservation across sample Day witnesses.
- **Helper:** `buildFixedLeftInitialObject(law)` stretches the constant-zero final law to the supplied left functor, returning the initial object of `IL(𝒞)_{F,-}` together with the canonical collapse map `F ⇒ 1`; `buildFixedRightInitialObject(law)` mirrors the construction with a terminal left functor, reporting whether the fixed-right collapse admits a map into the final interaction law.
- **Helper:** `buildFixedRightFinalObject(law)` curries the interaction law into the internal-hom functor `G'`, materialises the final object `(G', G, ε^G)` in `IL(𝒞)_{-,G}`, and produces the canonical comparison natural transformation `σ : F ⇒ G'` validated via `makeFixedRightInteractionMorphism`.
- **Helper:** `makeFunctorInteractionLawOperations({ monadOperations, comonadCooperations, monadStructure, comonadStructure })` augments raw operation arrays with monad/comonad structural witnesses. Supplying a monad unit automatically records the generic-element maps κᵧ demanded by Theorem 2 (and merges the associated metadata), while comonad counits/comultiplications populate εᵧ/βᵧ entries for the dual argument. `test/functor-interaction-law.spec.ts` confirms the helper decorates the two-object example with η-derived substitution arrows so the degeneracy analyzers surface the canonical zero collapse without manual plumbing.
- **Witness Builder:** `checkNullaryDegeneracy` and `checkCommutativeBinaryDegeneracy` now surface these initial objects (and their collapse diagnostics) alongside the constant-zero law, so degeneracy oracles can automatically reuse the canonical morphisms promised by Theorems 1–2 when certifying collapse.
- **Check:** `test/functor-interaction-law.spec.ts` exercises currying consistency, both fixed-side morphism constructors, and the initial object helpers (“derives currying data and fixed-side morphisms”).
- **Check:** `test/functor-interaction-law.spec.ts` (“presents interaction laws in the left comma form”) validates the comma transformation against the Day evaluation, inspects the internal-hom functor report, and confirms the naturality diagnostics.
- **Check:** `test/functor-interaction-law.spec.ts` (“reconstructs the interaction law from its left comma presentation”) exercises the equivalence helper by confirming reconstructed values and arrowwise naturality agree with the original interaction law.

## Functional optics law diagnostics

### Lens get-set/set-set registry coverage

- **Registry Path:** `optics.lens.laws`
- **Witness Builder:** `checkLensLaws({ lens, structure, first, second, equalsStructure?, equalsFocus? })` evaluates the get-set, set-get, and set-set equations while surfacing the full witness tuple for regression analysis.
- **Check:** `MarkovOracles.optics.lens.laws`
- **Implementation Notes:** Failure reports include the restored structure, repeated updates, and focused values so composite optics can attribute regressions to precise setter behaviour.

### Optional focus/update registry coverage

- **Registry Path:** `optics.optional.laws`
- **Witness Builder:** `checkOptionalLaws({ optional, structure, first, second, equalsStructure?, equalsFocus? })` threads the optional witness bundle to capture hit/miss metadata for each update attempt and to distinguish skipped updates from true violations.
- **Check:** `MarkovOracles.optics.optional.laws`
- **Implementation Notes:** Reports expose focus witnesses, update witnesses, and miss reasons so higher-level traversals can compose diagnostics without losing context.

### Prism preview/review registry coverage

- **Registry Path:** `optics.prism.laws`
- **Witness Builder:** `checkPrismLaws({ prism, matchSample, reviewSample, missSample?, equalsStructure?, equalsFocus? })` validates preview–review and review–preview coherence with full match/build witness bundles.
- **Check:** `MarkovOracles.optics.prism.laws`
- **Implementation Notes:** Diagnostics cite preview skips, reconstruction mismatches, and rejection metadata to make partial optic regressions reproducible in downstream suites.

### Monad–comonad interaction law packaging

- **Helper:** `makeMonadComonadInteractionLaw({ monad, comonad, law, options? })` packages a monad–comonad pair together with a base functor interaction law, reusing cached degeneracy analyses, CCC currying tables, comma presentations, and Sweedler summaries whenever they are supplied. The helper exposes the resulting `ψ` fiber map so downstream coherence checks can iterate over Day witnesses without recomputing the pairing.
- **Helper:** `monadComonadInteractionLawToMonoid(law, { sampleLimit?, metadata? })` captures the Day/ψ composites that present a monad–comonad interaction law as a monoid object in `IL(𝒞)`, tabulating multiplication/unit composites via the comma presentation and recording any sampled mismatches. `interactionLawMonoidToMonadComonadLaw({ monoid, monad, comonad, metadata? })` performs the inverse construction, reusing cached currying/comma/Sweedler data to rebuild the packaged interaction law.
- **Helper:** `makeExample6MonadComonadInteractionLaw()` realises the Section 3 Example 6 construction where the monad is the writer functor on a two-point monoid and the comonad is its reader dual.  The helper assembles the Day pairing, writer/unit/multiplication data, and the reader counit/comultiplication witnesses into a ready-to-use monad–comonad interaction law.
- **Helper:** `makeExample7MonadComonadInteractionLaw()` implements the Section 3 Example 7 writer/comonad pairing where `TX = B × X` and `DY = B × Y` for the two-point monoid acting on a two-point set, recording the action `ψ((b, x), (b', y)) = (x, b ⋅ y)`. It reuses the stored Day pairing, monad/comonad witnesses, and ψ-evaluation caches while surfacing the same diagnostics exercised by the Example 7 regression.
- **Helper:** `makeExample8MonadComonadInteractionLaw()` packages the Section 3 Example 8 update monad/comonad interaction where updates are functions `A ⇒ (B × X)` and environments are `A × Y`. The helper materialises the action of `B` on both states and observations, flattens nested updates via the recorded multiplication witness, and exposes the resulting ψ family for the coherence oracle.
- **Helper:** `deriveGreatestInteractingFunctorForMonadComonadLaw(packaged, options?)` reuses the packaged Sweedler summary, comma presentation, and (when present) dual interaction law to expose the greatest functor interacting with the underlying comonad. Diagnostics call out whether cached data or caller overrides were used, and the returned metadata combines the law/monad/comonad provenance tags.
- **Helper:** `deriveGreatestInteractingComonadForMonadComonadLaw(packaged, options?)` mirrors the functor construction while delegating to `greatestInteractingComonad`. The helper automatically feeds the packaged Sweedler summary (and any stored dual law) into the calculation, logging when callers supply an alternate swapped comma presentation and returning the combined provenance metadata.
- **Helper:** `stretchMonadComonadInteractionLaw({ base, monad, comonad, stretch, metadata?, packageOptions? })` wraps the functor-level `stretchInteractionLaw`, returning the stretched functor pairing alongside a freshly packaged interaction law whose diagnostics note that the stretch was derived from the supplied mappings.  Metadata from the base law and caller-provided tags are merged so downstream tools can track the provenance of the stretched structure.  See `test/monad-comonad-interaction-law.spec.ts` for an identity-stretch regression.
- **Helper:** `tensorMonadComonadInteractionLaws({ left, right, monad, comonad, metadata?, packageOptions? })` composes two interaction laws via the Day product of their functor pairings before repackaging them with the requested monad/comonad structures.  The helper surfaces the product projections for later use and records diagnostics indicating that the Day product was applied.  Regression coverage confirms the resulting evaluations produce paired booleans on the two-object kernel.
- **Helper:** `composeMonadComonadInteractionLaws({ inner, outer, monad, comonad, law, metadata?, compatibilityDiagnostics?, packageOptions? })` packages a caller-supplied composite interaction law while stitching together the provenance metadata from the inner and outer laws.  Optional compatibility diagnostics are threaded into the returned report so subsequent passes can replay the distributive-law checks highlighted in Section 3.3.
- **Helper:** `makeFreeMonadComonadInteractionLaw({ base?, freeMonad, cofreeComonad, law, coproductWitnesses, universalComparisons, options? })` records the Section 3 coproduct recipe for the free/cofree interaction law, reusing cached currying/comma/Sweedler data when supplied and persisting the inclusion labels such as `id × fst` and `id × snd`.  `deriveInitialMonadSliceObject` and `deriveFinalComonadSliceObject` surface the universal arrows for the slice categories.  `test/monad-comonad-interaction-law.spec.ts` exercises the helper and confirms that the coproduct witnesses and slice comparisons match the expected metadata.
- **Oracle:** `checkFreeInteractionLaw(freeResult)` verifies that coproduct witnesses contain inclusions and that the universal comparisons provide arrows into/out of the free law for the slice categories, emitting descriptive diagnostics when any component is missing.  The regression suite invokes the oracle alongside the helper to certify the recorded data.
- **Report:** `checkAssociativeBinaryDegeneracy(law, { operationLabel? })` replays the Theorem 3 collapse diagnostics for a monad–comonad interaction law. It threads the commutative-binary degeneracy traces through the ψ fibers, logs the distributivity injections `ι_Y` and `κ_Y`, and records the witnesses `h_Y`, `δ'_Y`, `k'_Y`, and `k_Y` from the proof. `test/monad-comonad-interaction-law.spec.ts` exercises the report on Example 7, asserting that the Theorem 3 detail message is present and that each witness retains the ψ component and coproduct injections.
- **Helper:** `analyzeExample9FreeSemigroupDegeneracy()` encodes Example 9’s free-semigroup operation `db : X × X → X⁺`, attaches its commutative binary metadata to a Day pairing, and runs the degeneracy analyzer to exhibit the constant-zero collapse together with the coproduct/pullback witnesses demanded by Theorem 3.
- **Helper:** `nonemptyListFreeMonad()` realises Example 14’s free monad `T₀` on the signature `F(X) = X + X × X`, exposing the binary operation `c_X : T₀X × T₀X → T₀X`, the substitution-flattening multiplication on nested trees, and the cached carriers (`X`, `T₀X`, `T₀T₀X`) needed for later quotient/Sweedler diagnostics.
- **Helper:** `nonemptyListQuotient()` packages the nonempty-list monad `T` together with the quotient map `q : T₀ ⇒ T` and list-of-lists multiplication, providing the coequaliser witnesses demanded in Example 14 so Sweedler dual checks can reuse the recorded carriers and flattening maps.
- **Helper:** `sweedlerDualNonemptyList()` packages Example 14’s Sweedler dual as a subcomonad of the cofree comonad on `Y + Y × Y`, returning the inclusion natural transformation, the cofree witnesses, and the recorded coequation maps used in the rectangularity proof.
- **Helper:** `deriveNonemptyListCoequation()` partitions the Sweedler carrier into the `P_Y`/`Q_Y` pullback subsets from Theorem 4, records the induced inclusions `i_Y`, `j_Y`, and builds the comparison maps `cδ_Y : DY → DY + DY` and `cε_Y : DY → Y + Y` reused by the rectangularity oracle.
- **Check:** `checkRectangularityFromCoequation(data)` enumerates the Example 14 Sweedler elements, verifies that the recorded coequation agrees with the restricted comultiplication, and confirms every image lies in the rectangular subcomonad; `test/monad-comonad-interaction-law.spec.ts` exercises the oracle (“derives partition data and confirms rectangularity witnesses”).
- **Oracle:** `checkNonemptyListQuotient(options?)` replays the Example 14 quotient diagram by flattening sampled free terms and list-of-lists, reporting counterexamples when the quotient or multiplication deviates from concatenation.
- **Oracle:** `checkNonemptyListSweedler(options?)` compares the Sweedler counit/comultiplication against the cofree inclusion on sampled elements, surfacing discrepancies in the Example 14 subcomonad embedding.
- **Oracle:** `checkMonadComonadInteractionLaw(law, options?)` evaluates the four ψ-coherence diagrams (unit/counit, comultiplication, monad multiplication, and the mixed associativity square) using the cached Day fibers.  The optional `project`/`build` hooks let callers describe how to decompose/reconstruct the interaction-law value when it is not a plain pair.
- **Witness Builder:** The returned record stores the combined metadata of the monad, comonad, and packaging call, plus a diagnostics array describing which caches were reused versus recomputed. Degeneracy reports and Sweedler summaries flow directly from the underlying `FunctorInteractionLaw`, ensuring later oracles can quote the same constant-zero witnesses and dual evaluations.
- **Check:** `test/monad-comonad-interaction-law.spec.ts` verifies that cached inputs are reused when provided and that the helper derives currying/degeneracy data when no options are supplied, while also asserting that the packaged metadata aggregates contributions from both structures.
 - **Helper:** `deriveMonadComonadRunnerTranslation(law, { sampleLimit?, metadata? })` repackages each interaction law’s ψ fibers, δ tables, and Sweedler maps into θ, costate, and coalgebra translators ready for runner construction. Diagnostics confirm that the sampled δ tables match ψ evaluations and that the Sweedler-derived coalgebra agrees with the curried θ witnesses.
 - **Check:** `test/monad-comonad-interaction-law.spec.ts` exercises the helper on Example 6, asserting that all θ/costate/coalgebra components report consistent evaluations and that custom sampling bounds appear in the recorded diagnostics.
 - **Module:** `lambda-coop.ts` codifies the λ_{coop} syntax with explicit value, user, and kernel computation categories, resource annotations, and summarizers.  Helpers such as `summarizeUserComputationResources`, `summarizeKernelComputationResources`, and `summarizeValueResources` aggregate the operations, exceptions, signals, and state carriers demanded by a term while emitting provenance traces for each syntactic node.  `test/lambda-coop.spec.ts` exercises the collectors on a supervised file runner, confirming that signatures, state objects, and signal metadata are preserved across runner, kernel, and user layers.

### Stateful runner laws and diagnostics (Phase IV)

- **Runner:** `StatefulRunner` extracts the curried θ components from ψ fibers and serves as the basis for runtime checks.
- **Enriched runner:** `buildEnrichedStatefulRunner` adds per-object `stateCarriers` and a natural family `stateThetas` with an `evolve` hook to update state from observed values. The enriched fields are optional and thread through reports without changing θ semantics.
- **Axioms:** Objectwise structural composites built from the monad unit η, multiplication μ, and θ underpin the checks; `checkRunnerAxioms` aggregates tallies via the packaged monoid and `checkStatefulRunner` runs explicit η/μ-with-θ evaluation comparisons. A per-object structural summary (unit/mult checked vs mismatches) is returned, including optional provenance arrays with sample inputs, duals, expected, and actual values for a bounded number of failures.

- **Sampling:** When elements resemble Tree_Σ nodes (Return/Op), the checker augments samples by one level of Op-children to enrich coverage without exceeding the global sample limit.
- **Currying:** `checkRunnerCurryingConsistency` compares ψ with `uncurry(theta)` across sampled product pairs.
- **Coalebra:** `buildRunnerCoalgebra`/`checkRunnerCoalgebra` use Sweedler `fromDual` to map dual elements into exponentials over the primal fiber and compare evaluation against ψ.
- **Costate:** `buildRunnerCostate`/`checkRunnerCostate` translate raw right elements into exponentials over the primal fiber and compare against ψ.
- **Runner morphisms & Run(T):** Morphisms are per-object state homs `stateMaps : S_Y → S'_Y`. Use `identityRunnerMorphism`, `composeRunnerMorphisms`, and `checkRunnerMorphism` for equality/coalgebra-square sampling; `checkRunTCategoryLaws` validates left/right identity and associativity over these state maps.
- **Handlers (ϑ):** `thetaToStateHandler` now rebuilds the `T ⇒ St^Y` natural transformation by sampling θ against each state carrier, checking that results are independent of ψ’s dual inputs, and materialising the induced `TX × Y → X × Y` homs. `checkRunnerStateHandlers` consumes those transformations, replaying ψ evaluations, verifying unit-diagram witnesses via the curried maps, and flagging independence and state-update mismatches.
- **ψ↔θ consistency:** `checkPsiToThetaConsistency` and `checkThetaToPsiConsistency` execute both directions (ψ→θ via currying; θ→ψ via evaluation reconstruction) across samples, reporting mismatches (optional inclusion in `holds` via `includePsiThetaInHolds`).
- **Unified report:** `buildRunnerLawReport` aggregates tallies into `RunnerLawReport` with fields:
  - `unitChecked`, `unitMismatches`, `multChecked`, `multMismatches`
  - `curryingChecked`, `curryingMismatches`
  - `coalgebraChecked`, `coalgebraMismatches`
  - `costateChecked`, `costateMismatches`
  - `leftIdentityChecked`, `leftIdentityMismatches`, `rightIdentityChecked`, `rightIdentityMismatches`, `associativityChecked`, `associativityMismatches`, `associativitySkipped`
  - `handlerChecked`, `handlerMismatches`
  - `psiToThetaChecked`, `psiToThetaMismatches`, `thetaToPsiChecked`, `thetaToPsiMismatches`
  - `thetaMissing`, `thetaExtra`, optional `finiteFailures`
- **Options:** Most checks accept `{ sampleLimit?, objectFilter? }`; `buildRunnerLawReport` threads `sampleLimit` through, and can include finite exhaustive checks via `includeFinite`.
- **Notes:** Category and handler checks are reported but do not currently affect `holds`. ψ→θ/θ→ψ consistency likewise reports mismatches without flipping `holds`.
  - **Oracles / Registry Paths:**
    - `runner.axioms` → `RunnerOracles.axioms`
    - `runner.currying` → `RunnerOracles.currying`
    - `runner.coalgebra` → `RunnerOracles.coalgebra`
    - `runner.costate` → `RunnerOracles.costate`
    - `runner.categoryLaws` → `RunnerOracles.category`
    - `runner.equivalence.stateHandler` → `RunnerOracles.stateHandlerEquivalence`
    - `runner.handlers` → `RunnerOracles.handlers`
    - `runner.psiToTheta` → `RunnerOracles.psiTheta`
    - `runner.unified` → `RunnerOracles.unified`
    - `runner.equivalence.costT` → `RunnerOracles.equivalenceCostT`
    - `runner.equivalence.sweedler` → `RunnerOracles.equivalenceSweedler`
    - Use `enumerateRunnerOracles(runner, law, { sampleLimit? })` to collect all reports.
    - Use `evaluateRunnerEquivalences(runner, law, { sampleLimit?, objectFilter? })` to retrieve the focused equivalence suite (state handler, coalgebra, costate, Cost^T, Sweedler, triangle).
 - **Optional holds flags:** Pass to `buildRunnerLawReport`:
   - `includeCategoryInHolds: true` to require identity + associativity success.
   - `includeHandlersInHolds: true` to fail on handler mismatches.
   - `includePsiThetaInHolds: true` to fail on ψ→θ or θ→ψ mismatches.
   - Combine with `includeFinite: true` for exhaustive finite evaluation.
 - **Example:**

```ts
const runner = buildRunnerFromInteraction(law, { sampleLimit: 16 });
const report = buildRunnerLawReport(runner, law, {
  sampleLimit: 16,
  includeFinite: true,
  includeCategoryInHolds: true,
  includeHandlersInHolds: true,
  includePsiThetaInHolds: true,
});
if (!report.holds) {
  console.log('Runner law failures:', report.details.slice(0, 10));
}
```

#### Runner ⇔ monad translators (Tree_Σ ⇔ T)

- **Helpers:** `runnerToMonadMap(runner, free, target, { sampleLimit?, objectFilter?, metadata? })` and `monadMapToRunner(morphism, packagedLaw, { sampleLimit?, objectFilter?, metadata? })` expose the conversion between runners and monad morphisms `Tree_Σ ⇒ T`.
- **Status (update):** `monadMapToRunner` now rebuilds θ-curried maps by replaying the morphism τ against sampled free-tree carriers: it tallies `τ ∘ η` checks (`generatorPreservation`/`unitPreservation`), re-evaluates each sampled tree through the reconstructed θ (`treeSamplePreservation`), and logs whether θ fibers were reused from cached ψ data or rebuilt via currying. Diagnostics surface up to four mismatching tree samples (or evaluation errors) and report when free-tree carriers are unavailable; multiplication sampling remains a stub until explicit Σ syntax lands and is flagged via the returned `multiplicationPreservation.note`.
- **Check:** `test/stateful-runner.spec.ts` includes a smoke test asserting that translator outputs have nonempty component/θ maps and that diagnostic counters are present.

#### Costate/coalgebra equivalences and oracles

  - **Translators:**
    - `runnerToCoalgebraComponents(runner, law)` and `coalgebraComponentsToRunner(components, law)` bridge runners with `T°`-coalgebras.
    - `runnerToCostateComponents(runner, law)` and `costateComponentsToRunner(components, law)` bridge runners with `Cost^Y ⇒ T` transformations.
    - `coalgebraToCostate(components, law)` and `costateToCoalgebra(components, law)` shuttle between coalgebra and costate views via Sweedler indexing.
    - `runnerToCostTCoalgebraComponents(runner, law)` / `costTCoalgebraComponentsToRunner(components, law)` package the canonical inclusion of `γ_Y : Y → T°Y` into `Cost^T` coalgebras.
    - `runnerToSweedlerCoalgebraComponents(runner, law)` / `sweedlerCoalgebraComponentsToRunner(components, law)` expose the Sweedler-dual perspective using the interaction law’s cached dual data.
    - `buildExample12UpdateLensRunner(spec, { interaction? })` reconstructs Example 12’s update-lens runner from `(hp, upd)` data, and `buildExample12UpdateLensSuite()` packages the runner with its costate/coalgebra/`Cost^T` witnesses for comparisons.
    - `attachResidualHandlers(runner, law, specs, { sampleLimit?, objectFilter? })` samples θ-domain pairs to track partial residual handler coverage, emitting diagnostics and a per-object report; use `analyzeResidualHandlerCoverage` for analysis without mutating the runner.
    - `makeResidualInteractionLaw(law, { residualMonadName?, notes? })` records TODO diagnostics for Section 5 residual diagrams while residual witnesses are still pending.
  - **Oracles / Registry Paths:**
    - `runner.equivalence.coalgebra` → samples θ vs γ and γ→θ reconstruction.
    - `runner.equivalence.costate` → samples θ vs κ and κ→θ reconstruction.
    - `runner.equivalence.costT` → validates the Cost^T view via γ-inclusion.
    - `runner.equivalence.sweedler` → validates the Sweedler-dual coalgebra view.
    - `runner.equivalence.triangle` → checks γ → κ → γ round-trip.
  - **Check:** `test/stateful-runner.spec.ts` exercises the equivalence oracles on Example 6 and the Example 12 update-lens suite against the Example 8 interaction.

### Supervised kernel/user stack (Phase IV c)

- **Status:** Kernel/user constructors implemented; λ₍coop₎ alignment and inverse translation remain TODO (see `SUPERVISED_STACK_PLAN.md` for the longer roadmap).
- **Constructors:** `makeKernelMonad` classifies each kernel operation (state/exception/signal/external) into a structured `KernelOperationResult` with default fallbacks, handler integration, and per-operation diagnostics. `makeUserMonad` maps declared user operations into the kernel, reporting unsupported/unused signatures via `UserKernelComparison` and exposing an `invoke` helper that delegates to the kernel semantics.
- **Stack builder:** `makeSupervisedStack(interaction, kernelSpec, userSpec, options?)` enriches the ψ-derived runner with kernel state carriers, promotes operation-level residual handlers, attaches residual diagnostics (`attachResidualHandlers`/`analyzeResidualHandlerCoverage`), and packages comparison metadata (`userToKernel`, `unsupportedByKernel`, `unacknowledgedByUser`). `stackToRunner` reuses these builders; `runnerToStack` currently reports available state/residual witnesses pending a full inverse.
- **λ₍coop₎ comparison:** `buildLambdaCoopComparisonArtifacts` translates kernel operations into λ₍coop₎ runner literals and aligns the user boundary, emitting comparison diagnostics (`aligned` flag plus `issues`) and embedding the summary in stack metadata so `runnerToStack` and `lambda-coop.runner-alignment.ts` can reconstruct the λ₍coop₎ view.
- **Tests:** `test/stateful-runner.spec.ts` now executes the supervised scenario (state read, exception fallback, residual coverage, λ₍coop₎ comparison wiring) with diagnostics asserted; this replaces the earlier planning placeholder.

## Coalgebra and Hopf law diagnostics

### Bialgebra compatibility witness registry

- **Registry Path:** `coalgebra.hopf.bialgebraCompatibility`
- **Witness Builder:** `ensureBialgebraCompatibility(bialgebra)` materializes multiplication, unit, and counit composites and feeds them to `buildBialgebraCompatibilityWitness` for reusable witnesses and cached reports.
- **Check:** `AlgebraOracles.coalgebra.bialgebraCompatibility`
- **Implementation Notes:** Summary helpers such as `summarizeBialgebraCompatibility`, `collectBialgebraCompatibilitySummary`, and `collectBialgebraCompatibilityFailures` render carrier-level headlines plus per-component diagnostics for runnable logs and CLI output.

### Hopf antipode convolution and sampling diagnostics

- **Registry Path:** `coalgebra.hopf.antipode`
- **Witness Builder:** `analyzeHopfAntipode(hopf, comparisons, options)` combines convolution pairs from `buildHopfAntipodeConvolutionComparisons` with property-sampling reports via `evaluateHopfAntipodeOnSamples` and wraps them in `buildHopfAntipodeWitness`.
- **Check:** `AlgebraOracles.coalgebra.hopfAntipode`
- **Implementation Notes:** `describeHopfAntipodeFailure`, `summarizeHopfAntipodePropertySampling`, and related renderers narrate involutivity, unit/counit compatibility, graded traces, and quantitative sampling metadata so regression suites can quote exact failing samples.

### Hopf algebra specification and registry workflow

- **Registry Path:** `coalgebra.hopf.registry`
- **Witness Builder:** `buildHopfAlgebraStructure(input)` automatically infers tensor witnesses via `deriveBialgebraTensorWitnessesFromSymmetricMonoidal` before packaging antipode data, while `buildHopfAlgebraFromSpec` lifts reusable specs into concrete structures.
- **Check:** `AlgebraOracles.coalgebra.hopfRegistry`
- **Implementation Notes:** `createHopfAlgebraRegistry` stores keyed entries with optional metadata so runnable demonstrations, CLIs, and tests can list, retrieve, or rebuild Hopf instances deterministically.

### Hopf integrals, cointegrals, and normalization

- **Registry Path:** `coalgebra.hopf.integrals`
- **Witness Builder:** `analyzeHopfIntegralCointegralPair(hopf, { integral, cointegral }, options)` validates unit/counit invariance and antipode stability via `analyzeHopfIntegral` and `analyzeHopfCointegral`, then records normalization witnesses.
- **Check:** `analyzeHopfIntegralCointegralPair`
- **Implementation Notes:** Failure reporters in `diagnostics.ts` (for example `describeHopfIntegralDiagnostics`, `describeHopfCointegralDiagnostics`, and `describeHopfIntegralCointegralNormalizationFailure`) surface the precise morphisms and unit objects responsible for invariance breaks.

### Hopf morphisms, modules, and comodules

- **Registry Path:** `coalgebra.hopf.modules`
- **Witness Builder:** `analyzeHopfAlgebraMorphism`, `analyzeHopfModuleMorphism`, and `analyzeHopfComoduleMorphism` check algebra/comonoid preservation and action/coaction coherence while emitting categorical witnesses.
- **Check:** `hopfModuleRestrictionFunctorWithWitness`, `hopfComoduleInductionFunctorWithWitness`, and related functors provide law checks over module/comodule categories.
- **Implementation Notes:** Category constructors such as `hopfModuleCategory`, `hopfModuleDomCod`, and the restriction/induction functors enforce shared tensor infrastructure via `ensureSharedMonoidalInfrastructure`, guaranteeing that morphism transport respects symmetric monoidal coherence.

### Finite duals, braided upgrades, and Drinfeld doubles

- **Registry Path:** `coalgebra.hopf.doubles`
- **Witness Builder:** `buildHopfFiniteDual` dualizes multiplication/comultiplication and assembles evaluation, coevaluation, and bidual witnesses with optional symmetric monoidal derivations.
- **Check:** `analyzeHopfDrinfeldDouble`
- **Implementation Notes:** Half-braiding and centrality analyzers (`analyzeHopfHalfBraiding`, `analyzeHopfDrinfeldDouble`) reuse bialgebra witness infrastructure to certify braided Hopf structures and validate the primal/dual embeddings inside Drinfeld doubles.

## Commutative algebra and scheme scaffolding

### Prime ideal witnesses with structured counterexamples

- **Registry Path:** `algebra.ring.primeIdeal`
- **Witness Builder:** `checkPrimeIdeal(ideal, options)` verifies properness, unit exclusion, and multiplicative closure, recording unit witnesses, candidate samples, and counterexample metadata for downstream use.
- **Check:** `AlgebraOracles.ring.primeIdeal`
- **Implementation Notes:** Failure reports enumerate violating pairs/products so spectrum and localization diagnostics can surface the exact offending elements.

### Multiplicative sets for localization denominators

- **Registry Path:** `algebra.ring.multiplicativeSet`
- **Witness Builder:** `checkMultiplicativeSet(set, options)` ensures samples include `1`, exclude `0`, and remain closed under multiplication while capturing witness limits and counterexamples.
- **Check:** `AlgebraOracles.ring.multiplicativeSet`
- **Implementation Notes:** Metadata summarises distinct samples and witness slots so localization and stalk oracles can reuse the same search envelopes.

### Localization rings as fraction oracles

- **Registry Path:** `algebra.ring.localization`
- **Witness Builder:** `checkLocalizationRing(data, options)` enumerates fractions, searches equality witnesses, and validates ring laws with multiplier evidence for every addition and multiplication comparison.
- **Check:** `AlgebraOracles.ring.localization`
- **Implementation Notes:** Witnesses expose the clearing multipliers used to certify fraction equalities, enabling structure sheaf restrictions to reuse the same normalization logic.
- **See Also:** [Stage 1 roadmap – ring oracle how-to](docs/algebraic-geometry-roadmap.md#ring-oracle-how-to).

### Local ring diagnostics at prime spectrum points

- **Registry Path:** `algebra.ring.localRing`
- **Witness Builder:** `checkLocalRingAtPrime(point, multiplicativeSet, options)` composes prime-ideal and multiplicative-set checks via `buildPrimeLocalizationCheck` before validating the localized ring structure returned from `buildPrimeLocalizationData`.
- **Check:** `AlgebraOracles.ring.localRing`
- **Implementation Notes:** Results bundle the localized ring, denominators, and witness metadata so structure-sheaf and stalk computations can reuse the fraction data without re-running spectrum searches.
- **See Also:** [Stage 1 roadmap – ring oracle how-to](docs/algebraic-geometry-roadmap.md#ring-oracle-how-to).

### Finitely generated module diagnostics

- **Registry Path:** `algebra.ring.finitelyGeneratedModule`
- **Witness Builder:** `checkFinitelyGeneratedModule(module, options)` searches linear combinations, reports generation witnesses, and surfaces minimal counterexamples when spanning fails.
- **Check:** `AlgebraOracles.ring.finitelyGeneratedModule`
- **Implementation Notes:** Metadata tracks sample sizes and successful generators so tensor-product witnesses can reuse the same basis lists.
- **See Also:** [Stage 1 roadmap – ring oracle how-to](docs/algebraic-geometry-roadmap.md#ring-oracle-how-to).

### Noetherian module chain stabilization

- **Registry Path:** `algebra.ring.noetherianModule`
- **Witness Builder:** `checkNoetherianModule(chain, options)` iteratively calls `checkFinitelyGeneratedModule` along the ascending chain produced by `searchAscendingChain`, reporting stabilization points and counterexamples when chains grow indefinitely.
- **Check:** `AlgebraOracles.ring.noetherianModule`
- **Implementation Notes:** Metadata records the sampled chain, stabilization index, and any failing generator witnesses so ideal-search routines can reuse the same modules.
- **See Also:** [Stage 1 roadmap – ring oracle how-to](docs/algebraic-geometry-roadmap.md#ring-oracle-how-to).

### Bilinear and tensor product checks

- **Registry Path:** `algebra.ring.bilinearMap` / `algebra.ring.tensorProduct`
- **Witness Builders:** `checkBilinearMap(map, options)` and `checkTensorProduct(structure, options)` confirm additivity in each variable and enforce universal property witnesses with explicit sample traces.
- **Check:** `AlgebraOracles.ring.bilinearMap`, `AlgebraOracles.ring.tensorProduct`
- **Implementation Notes:** The tensor product oracle records mediating morphisms and their action on samples, allowing future scheme morphism utilities to cite the same data.
- **See Also:** [Stage 1 roadmap – ring oracle how-to](docs/algebraic-geometry-roadmap.md#ring-oracle-how-to).

### Flat module witnesses via tensoring short exact sequences

- **Registry Path:** `algebra.ring.flatness`
- **Witness Builder:** `checkFlatModuleOnSamples(sequenceWitnesses, options)` tensors supplied short exact sequence samples against the candidate module, reusing the bilinear and tensor-product oracles to detect Tor obstructions.
- **Check:** `AlgebraOracles.ring.flatness`
- **Implementation Notes:** Violations surface the exact sequence, tensor outputs, and comparison witnesses that failed, enabling targeted repairs or alternate module choices.
- **See Also:** [Stage 1 roadmap – ring oracle how-to](docs/algebraic-geometry-roadmap.md#ring-oracle-how-to).

### Covering families on sites

- **Registry Path:** `algebra.sheaf.coveringFamily`
- **Witness Builder:** `checkCoveringFamily(covering, options)` validates targets and duplicate suppression while emitting witness arrows when mismatches appear.
- **Check:** `AlgebraOracles.sheaf.coveringFamily`
- **Implementation Notes:** Distinct-arrow counts and witness limits align with the discrete site tests in `test/sheaf-infrastructure.spec.ts`.
- **See Also:** [Stage 2 roadmap – sheaf tooling how-to](docs/algebraic-geometry-roadmap.md#sheaf-tooling-how-to).

### Presheaf restriction diagnostics

- **Registry Path:** `algebra.sheaf.presheaf`
- **Witness Builder:** `checkPresheaf(presheaf, options)` checks closure under restriction, identities, and composition, reporting violating arrows with captured sections.
- **Check:** `AlgebraOracles.sheaf.presheaf`
- **Implementation Notes:** Metadata records sampled objects/arrows and section limits so sheaf gluing checks can be configured consistently.
- **See Also:** [Stage 2 roadmap – sheaf tooling how-to](docs/algebraic-geometry-roadmap.md#sheaf-tooling-how-to).

### Sheaf gluing witnesses

- **Registry Path:** `algebra.sheaf.sheafGluing`
- **Witness Builder:** `checkSheafGluing(sheaf, samples, options)` enforces overlap agreement and gluing existence, collecting witness assignments whenever compatibility fails.
- **Check:** `AlgebraOracles.sheaf.sheafGluing`
- **Implementation Notes:** Witness entries track which covering and overlap triggered a violation, matching the examples in `test/sheaf-infrastructure.spec.ts`.
- **See Also:** [Stage 2 roadmap – sheaf tooling how-to](docs/algebraic-geometry-roadmap.md#sheaf-tooling-how-to).

### Grothendieck topology and cover specialists

- **Registry Path:** `algebra.sheaf.grothendieckTopology`
- **Witness Builder:** `checkGrothendieckTopology(topology, samples, options)` evaluates isomorphism stability, refinement closure, and pullback behaviour with explicit covering witnesses.
- **Check:** `AlgebraOracles.sheaf.grothendieckTopology`
- **Implementation Notes:** The oracle reports which axioms fail and the witness coverings involved, supporting both Zariski and étale specialisations.
- **See Also:** [Stage 2 roadmap – sheaf tooling how-to](docs/algebraic-geometry-roadmap.md#sheaf-tooling-how-to).

### Zariski principal-open cover oracle

- **Registry Path:** `algebra.sheaf.zariskiPrincipalOpen`
- **Witness Builder:** `checkZariskiPrincipalOpenCover(ring, cover, options)` validates that principal opens cover the spectrum by testing sample primes and localization witnesses.
- **Check:** `AlgebraOracles.sheaf.zariskiPrincipalOpen`
- **Implementation Notes:** Coverage diagnostics reuse multiplicative-set witnesses to demonstrate that denominators land in the expected complements.

### Étale cover diagnostics

- **Registry Path:** `algebra.sheaf.etaleCover`
- **Witness Builder:** `checkEtaleCover(data, options)` inspects fibre products and local isomorphism witnesses, reporting failures with the exact covering pieces.
- **Check:** `AlgebraOracles.sheaf.etaleCover`
- **Implementation Notes:** Metadata highlights stalk samples and Jacobian witnesses to help refine étale atlases.

### Chain complex derived-functor diagnostics

- **Registry Path:** `algebra.derived.chainComplex`
- **Witness Builder:** `checkChainComplex(complex, options)` ensures consecutive differentials compose to zero while capturing composition counterexamples with the originating cochain.
- **Check:** `AlgebraOracles.derived.chainComplex`
- **Implementation Notes:** Metadata reports the number of differentials, sampled cochains, and recorded witnesses so higher Čech constructions can budget search envelopes.

### Multi-cover Čech cohomology and derived comparisons

- **Builders:** `buildCechComplex(setup)` assembles the Čech complex for any finite covering by normalising intersections, deduplicating section samples, and wiring the alternating differential. `checkCechCohomology(setup, options)` runs the resulting chain complex through `checkChainComplex`, computes cohomology ranks, and (optionally) compares them against derived-functor reference data.
- **Workflow Notes:** Provide a `MultiOpenCechSetup` with covering samples and higher intersections—triple-cover fixtures in `test/cech-cohomology.spec.ts` document the expected shape. The returned `CechCohomologyResult` exposes the chain check, cohomology analysis, and any derived mismatches.
- **Integration:** `buildTwoOpenCechComplex`/`checkTwoOpenCechCohomology` now delegate through the general machinery so legacy callers continue to work on two-open covers.

### Two-open Čech cohomology checks

- **Registry Path:** `algebra.derived.cechTwoOpen`
- **Witness Builder:** `checkTwoOpenCechCohomology(setup, options)` builds the two-open Čech complex from sheaf restriction data, validates the differential square, and returns cohomology coset representatives.
- **Check:** `AlgebraOracles.derived.cechTwoOpen`
- **Implementation Notes:** Results expose coset counts via `analyzeCohomology`, surfaced at `AlgebraOracles.derived.cohomologyAnalysis`, so downstream derived-functor tooling can reuse the same kernel/image analysis.

### Ext/Tor sampler comparisons

- **Samplers:** `sampleTorFromFlat({ cech, flat, options })` reconciles Čech cohomology ranks with flat-module tensor witnesses, while `sampleExtFromTensor({ cech, tensor, options })` aligns Ext degrees with tensor-product evidence.
- **Details:** Both samplers classify witness/violation counts per degree, summarise satisfied versus failing comparisons, and return structured metadata for further automation. Regression coverage lives in `test/ext-tor-samplers.spec.ts`.

### Prime spectrum and stalk checks

- **Registry Path:** `algebra.scheme.primeSpectrum` / `algebra.scheme.primeStalks`
- **Witness Builders:** `checkPrimeSpectrum(spectrum, options)` and `checkPrimeStalks(spectrum, options)` ensure every listed ideal is prime and that complements/localizations supply valid stalks.
- **Check:** `AlgebraOracles.scheme.primeSpectrum`, `AlgebraOracles.scheme.primeStalks`
- **Implementation Notes:** Prime violations surface the underlying `checkPrimeIdeal` metadata, while stalk failures expose the multiplicative-set or localization witness that breaks.

### Structure sheaf localization oracle

- **Registry Path:** `algebra.scheme.structureSheaf`
- **Witness Builder:** `checkStructureSheaf(data, options)` validates each localization, restriction, and ring law preservation across arrows, recording offending fractions and denominators when failures appear.
- **Check:** `AlgebraOracles.scheme.structureSheaf`
- **Implementation Notes:** Metadata counts localization and restriction checks so future affine-morphism tooling can budget additional samples consistently.

### Affine scheme morphism diagnostics

- **Registry Path:** `algebra.scheme.affineMorphism`
- **Witness Builder:** `checkAffineSchemeMorphism(morphism, options)` pulls back primes along a ring map, confirms they remain prime, locates image points in the codomain spectrum, and verifies principal-open behaviour using supplied generators.
- **Check:** `AlgebraOracles.scheme.affineMorphism`
- **Implementation Notes:** Witness records track the computed preimage ideals, matched codomain points, and any failing generators so localisation data can be reused when extending to global gluing.

### Affine scheme pullback squares

- **Registry Path:** `algebra.scheme.affinePullback`
- **Witness Builder:** `checkAffineSchemePullbackSquare(square, options)` inspects the pushout diagram of rings, ensures each apex prime pulls back to primes on both legs, and checks that the induced base ideals agree while covering requested matching pairs.
- **Check:** `AlgebraOracles.scheme.affinePullback`
- **Implementation Notes:** Metadata exposes prime failures, base-agreement mismatches, and matching-pair coverage so tensor-product and base-change utilities can reuse the same diagnostic envelope.

### Global scheme gluing atlases

- **Registry Path:** `algebra.scheme.schemeGluing`
- **Witness Builder:** `checkSchemeGluing(atlas, options)` runs each affine chart through the spectrum and structure-sheaf oracles, verifies referenced gluing morphisms in both directions, and checks that the supplied inverses identify matching primes on sample sets.
- **Check:** `AlgebraOracles.scheme.schemeGluing`
- **Implementation Notes:** Metadata surfaces ring mismatches, forward/backward morphism failures, inverse sample counts, and flags whether the atlas is quasi-compact and separated on the checked samples.

### Scheme fiber products and base change

- **Registry Path:** `algebra.scheme.schemeFiberProduct`
- **Witness Builder:** `checkSchemeFiberProduct(diagram, options)` delegates to `checkAffineSchemePullbackSquare` for each affine patch in a proposed base-change diagram and aggregates any violations.
- **Check:** `AlgebraOracles.scheme.schemeFiberProduct`
- **Implementation Notes:** Metadata reports how many fibre-product squares were validated and how many failed, keeping witness limits aligned with the underlying affine diagnostics.

### Fibered-category cartesian lift checks

- **Registry Path:** `algebra.moduli.fiberedCategory`
- **Witness Builder:** `checkFiberedCategory(data, samples, options)` inspects each sampled base arrow/target pair, demands a cartesian lift, and verifies factorisation witnesses together with any supplied uniqueness alternatives.
- **Check:** `AlgebraOracles.moduli.fiberedCategory`
- **Implementation Notes:** Metadata tracks sample counts, comparison checks, and recorded witnesses so stack-style analyses can budget search envelopes across multiple atlases. Regression coverage: `test/moduli-stacks.spec.ts`.

### Descent datum and stack gluing diagnostics

- **Registry Path:** `algebra.moduli.descentDatum`
- **Witness Builder:** `checkStackDescent(datum, options)` pulls back local objects along overlap arrows, verifies transition isomorphisms, checks cocycle compositions, and confirms optional glue witnesses align with the supplied local trivialisations.
- **Check:** `AlgebraOracles.moduli.descentDatum`
- **Check:** `AlgebraOracles.representation.checkFinGrpRepresentationIrreducible`
- **Check:** `AlgebraOracles.representation.analyzeFinGrpRepresentationSemisimplicity`
- **Check:** `AlgebraOracles.representation.collectFinGrpRepresentationSemisimplicitySummands`
- **Check:** `AlgebraOracles.representation.collectFinGrpRepresentationIrreducibleSummands`
- **Check:** `AlgebraOracles.representation.certifyFinGrpRepresentationSemisimplicity`
- **Workflow:** `AlgebraOracles.representation.runSemisimplicityWorkflow`
- **Formatter:** `AlgebraOracles.representation.formatSemisimplicityWorkflow`
- **Summary:** `AlgebraOracles.representation.summarizeSemisimplicityWorkflow`
- **Profile:** `AlgebraOracles.representation.profileSemisimplicityWorkflow`
- **Profile formatter:** `AlgebraOracles.representation.formatSemisimplicityProfile`
- **Report:** `AlgebraOracles.representation.reportSemisimplicityWorkflow`
- **Survey:** `AlgebraOracles.representation.surveySemisimplicityWorkflows`
- **Survey formatter:** `AlgebraOracles.representation.formatSemisimplicitySurvey`
- **Implementation Notes:** Witnesses surface missing local data, restriction failures, inverse mismatches, and cocycle violations, highlighting precisely which overlap caused trouble. Regression coverage: `test/moduli-stacks.spec.ts`.

### Fibered morphism functoriality

- **Builder:** `checkFiberedMorphism(morphism, samples, options)` verifies that a morphism of fibered categories preserves base objects, maps arrows functorially, and respects sampled cartesian lifts.
- **Workflow:** Reuse `buildFiberedSamplesFromEtaleDescent` to generate cartesian lift samples from étale data when aligning atlases. Tests in `test/moduli-stacks.spec.ts` cover both satisfied and broken morphisms.

### Fibered 2-morphism witnesses

- **Builder:** `checkFiberedTwoMorphism(datum, samples, options)` checks component sources/targets and naturality squares between parallel fibered morphisms.
- **Implementation Notes:** Witness arrays capture successful components up to a configurable limit so stack diagnostics can surface explicit 2-morphism data. Regression coverage: `test/moduli-stacks.spec.ts`.

### Stack groupoid presentations

- **Workflow:** `synthesizeStackPresentation({ descent, additionalFiberedSamples, etaleSamples, label })` produces a finite groupoid from descent data, reuses `checkStackDescent`/`checkFiberedCategory` for verification, and returns narrative details together with the merged fibered samples.
- **Implementation Notes:** The groupoid exposes `hom`, `inv`, and identity/composition helpers built from the fibered category’s structure; atlas refinement scenarios are documented in `test/moduli-stacks.spec.ts`.

## Category-theoretic scaffolding

### Subcategories and fullness

- A **subcategory** of \(C\) chooses objects and arrows of \(C\) that are closed under identities and composition.
- Helpers: `makeSubcategory(C, objs, arrows)` saturates the closure generated by a seed set of objects/arrows.
- A subcategory is **full** when it contains every arrow of \(C\) whose endpoints lie in the chosen objects. Check with `isFullSubcategory(S, C)` and build via `makeFullSubcategory(C, objs)`.
- Registry path: structural only (no oracle).

### Product categories

- Objects of \(C \times D\) are pairs \(\langle C, D \rangle\); arrows are pairs \(\langle f, g \rangle\) with componentwise composition.
- Code: `ProductCat(C, D)` returns the product category; projections `Pi1`, `Pi2` pick out components, and `Pairing(F, G, C, D)` builds the functor induced by two components.
- Universal property: `checkProductUP(C, D, F, G, H, objects, arrows)` confirms that a candidate mediator \(H\) satisfies \(\pi_1 \circ H = F\), \(\pi_2 \circ H = G\), and \(H = \langle F, G \rangle\) on supplied samples.

### Finite poset exponentials

- `FinPos.monotoneFunctionPoset(B, C)` enumerates the pointwise ordered poset `Mono(B, C)` of monotone functions and packages the evaluation arrow together with a currying helper; `FinPosCat.exponential` registers the resulting function object so equality/composition operate on the enriched homs without additional plumbing.
- **Witness:** `test/laws/law.FinPosExponential.spec.ts` confirms the executable universal property by checking the pointwise order is monotone, that evaluation preserves the order on `Mono(B, C) × B`, and that every monotone arrow `A × B → C` factors uniquely through the exponential via currying.

### Duals and contravariant functors

- The **opposite category** \(C^{\mathrm{op}}\) reverses all arrows while preserving identities. Construct via `Dual(C)` or request structured diagnostics from `oppositeCategoryWithWitness(C, options)`; `isInvolutive(C, arrows, objs)` sanity-checks that \((C^{\mathrm{op}})^{\mathrm{op}} = C` on samples.
- A contravariant functor \(F: C \to D\) is a covariant functor \(C \to D^{\mathrm{op}}\). Build one with `constructContravariantFunctorWithWitness(C, D, F, samples, metadata)` to obtain identity, endpoint, and reversed-composition diagnostics; `contravariantToOppositeFunctor` and `oppositeFunctorToContravariant` shuttle between the witnessed form and the corresponding functor on \(C^{\mathrm{op}}\).
- Convenience helpers `Contra` and `isContravariant` remain available for quick checks, while `homSetContravariantFunctorWithWitness(target)` packages the textbook Hom(-, \(X\)) example with reusable registration helpers for function carriers.
- `powersetFunctorWithWitness()` realises Example F19: it returns the direct-image endofunctor on `Set`, the inverse-image contravariant companion (with its \(C^{\mathrm{op}}\) comparison), singleton embedding natural transformation, and reusable direct/inverse image helpers for subset calculations.
- `finiteDimensionalDualFunctorWithWitness()` realises Example F20: it exposes the transpose-based contravariant dual on finite-dimensional vector spaces, the induced \(\mathbf{Vect}^{\mathrm{op}} \to \mathbf{Vect}\) comparison functor, and the canonical double-dual natural isomorphisms witnessed by evaluation/coevaluation components.
- `covariantRepresentableFunctorWithWitness()` and `contravariantRepresentableFunctorWithWitness()` package the textbook Hom-functors for finite categories, threading a shared hom-set registry through executable witnesses while `yonedaEmbeddingWithWitness()` and `yonedaLemmaWitness()` expose the Yoneda embedding and bijection with natural transformations.  `test/functor.representable.spec.ts` exercises the covariant/contravariant law reports, the induced natural transformations, and the Yoneda round-trips on the toy two-object category.
- `composeFunctors(outer, inner, options)` replays Theorem 129 on sampled generators, while `compareFunctors`, `checkFunctorAssociativity`, and the left/right identity diagnostics certify the functor-category laws. `composeCovariantContravariant` and `composeContravariantContravariant` surface the variance bookkeeping from Theorem 130. `test/functor.composition.spec.ts` packages regression coverage for all of these reports.
- Duality principle: any first-order statement about categories remains valid when arrows are reversed. In code, wrap property testers with `dualizeProperty(P)` to automatically obtain the dual assertion.

### Virtual equipment coherence (scaffolding)

- `virtual-equipment/equipment-laws.ts` enumerates the coherence laws we plan to
  check for companions, conjoints, loose monads, and the emerging right
  extension/right lift calculus once the equipment layer is live.  Each law
  is tagged with a registry path such as `virtualEquipment.companion.unit`.
- **Registry Path:** `virtualEquipment` (with nested entries `companion.unit`,
  `companion.counit`, `conjoint.unit`, `conjoint.counit`,
  `looseMonad.unit`, `looseMonad.multiplication`, `skew.composition`, `maps.representableRight`,
  `extensions.rightExtension`, `extensions.rightLift`,
  `extensions.compatibility`, `weighted.cone`, `weighted.cocone`,
  `weighted.colimitRestriction`, `weighted.limitRestriction`,
  `weighted.leftExtension`, `density.identity`,
  `faithfulness.restrictions`, `faithfulness.pointwise`,
  `faithfulness.leftExtension`, `absolute.colimit`,
  `absolute.leftExtension`, `absolute.pointwiseLeftLift`).
- **Witness Builder:** `enumerateEquipmentOracles()` evaluates every registered
  law and returns the structured oracle results, making it easy to surface
  which witnesses succeed for a given equipment.
- **Check:** `EquipmentOracles` functions (`companion.unit`, etc.) now call the
  matching analyzers and return `{ holds, pending, details }` objects alongside
  the analyzer output for downstream inspection.
- **Implementation Notes:** the oracle stubs live alongside the law catalogue in
  `virtual-equipment/equipment-oracles.ts`, making it straightforward to swap in
  executable witnesses in later steps without changing documentation links.
- **Remark 4.5 / Theorem 4.7 hook:** `virtualEquipment.skew.composition`
  documents the associative-normal left-skew multicategory substitution law.
  The new `virtual-equipment/skew-multicategory.ts` analyzer checks that each
  substitution slot in a loose composite receives a multimorphism with the same
  loose arrow framing and identity vertical boundaries, setting the stage for the
  paper’s Proposition 4.12 equivalence between relative monads and loose
  monoids.
- **Remark 2.20 hook:** `virtualEquipment.maps.representableRight` certifies
  that a loose adjunction whose right leg is representable classifies its left
  leg as a map, reporting both the framing analysis and the representability
  witness status.
- **Definition 3.2 / Lemma 3.4 hooks:** the laws
  `virtualEquipment.extensions.rightExtension`,
  `virtualEquipment.extensions.rightLift`, and
  `virtualEquipment.extensions.compatibility` mirror the paper’s right
  extension/right lift framing requirements and their interplay.  The new
  analyzers in `virtual-equipment/extensions.ts` enforce the structural
  preconditions so executable oracles can be wired in later.
- **Definition 3.9 / Lemma 3.13 / Lemma 3.14 hooks:** the laws
  `virtualEquipment.weighted.cone`, `virtualEquipment.weighted.cocone`,
  `virtualEquipment.weighted.colimitRestriction`,
  `virtualEquipment.weighted.limitRestriction`, and
  `virtualEquipment.weighted.leftExtension` are now catalogued.  The
  corresponding analyzers in `virtual-equipment/limits.ts` check that weighted
  cones/cocones reuse the appropriate boundaries, that B(f,1)/B(1,g)
  restrictions respect those boundaries, and that left extensions computed by
  weighted colimits inherit the cocone framing, paving the way for executable
  oracles mirroring Lemmas 3.13–3.14.
- **Definitions 3.19–3.24 hooks:** new registry entries
  `virtualEquipment.density.identity`, `virtualEquipment.absolute.colimit`,
  `virtualEquipment.absolute.leftExtension`, and
  `virtualEquipment.absolute.pointwiseLeftLift` document the density and
  absolute-colimit checks introduced in `virtual-equipment/absoluteness.ts`.
  The accompanying analyzers ensure identity restrictions witness companions,
  j-absolute colimits carry left-opcartesian comparisons, left extensions reuse
  those witnesses, and pointwise left lifts reference the same tight 1-cell.
- **Definitions 3.26–3.29 hooks:** registry paths
  `virtualEquipment.faithfulness.restrictions`,
  `virtualEquipment.faithfulness.pointwise`, and
  `virtualEquipment.faithfulness.leftExtension` catalogue the new analyzers in
  `virtual-equipment/faithfulness.ts`.  They enforce that fully faithful tight
  1-cells admit identity restrictions with representability witnesses, that
  pointwise left extensions and left lifts share their framing data, and that
  left extensions along fully faithful cells carry invertible counits.
- **Bicategory coherence hooks:** registry paths
  `virtualEquipment.bicategory.pentagon` and
  `virtualEquipment.bicategory.triangle` record the Mac Lane coherence laws for
  weak composition.  The accompanying oracles in
  `virtual-equipment/equipment-oracles.ts` call
  `analyzeBicategoryPentagon`/`analyzeBicategoryTriangle`, comparing the red and
  green Street pastings derived from the bicategory’s associator and unitors.
- **Pseudofunctor/biadjunction hooks:** the new `virtualEquipment.pseudofunctor`
  and `virtualEquipment.biadjunction` registry paths acknowledge the unit and
  biadjunction triangle coherence requirements.  Oracles currently report
  pending diagnostics until concrete pseudofunctor/biadjunction data is wired
  into the equipment context.

### Relative monad scaffolding

- `relative/relative-laws.ts` mirrors Definition 4.1’s unit and extension
  diagrams.  The `relativeMonad.unit.framing` and
  `relativeMonad.extension.framing` entries back the structural invariant
  oracle `RelativeMonadOracles.framing`, ensuring the chosen 2-cells reuse the
  designated root/carrier boundaries.  `relativeMonad.extension.associativity`
  records the pending equality witness for the two composites that appear in
  the associativity pasting diagram.  Use `RelativeMonadOracles` to obtain the
  executable framing report (with issues enumerated) and a placeholder pending
  result for associativity until tight 2-cell comparisons land.
- `relativeMonad.enriched.compatibility` keeps Section 8’s enriched structure
  visible by checking that the recorded hom object and tensor comparison reuse
  the relative monad’s unit and extension witnesses.
- `relativeMonad.enriched.setCompatibility` specialises Example 8.14 to
  Set-enriched roots by requiring the fully faithful section and every listed
  correspondence to reuse the loose arrow, unit, and extension evidence.
- `relative/mnne-vector-monads.ts` replays Example 1 of *Monads Need Not Be
  Endofunctors* by enumerating Boolean finite vector spaces.  Use
  `describeBooleanVectorRelativeMonadWitness` and
  `analyzeFiniteVectorRelativeMonad` to inspect the unit/extension laws and the
  induced Kleisli composites.
- `RelativeMonadOracles.vectorKleisliSplitting` tightens Theorem 3/Example 5 by
  composing every Boolean matrix, confirming the Kleisli identities and
  associativity align with the recorded extension operator.
- `RelativeMonadOracles.vectorArrowCorrespondence` replays the Example 1 arrow
  semantics by comparing an `arr`/composition witness with the canonical
  relative monad extension, ensuring Boolean matrices act on vectors exactly as
  the relative monad prescribes on every enumerated dimension pair.
- `relative/mnne-lambda-monads.ts` mirrors Example 2’s λ-calculus relative
  monad, enumerating well-scoped terms across finite contexts, replaying the
  capture-avoiding substitution operator, and verifying the unit, identity, and
  associativity requirements via `analyzeUntypedLambdaRelativeMonad`.
- `RelativeMonadOracles.lambdaKleisliSplitting` records Example 6’s Kleisli
  category of Lam, reusing the λ-witness to ensure trivial substitutions act as
  identities and composition matches sequential substitution.
- `relative/mnne-indexed-container-monads.ts` operationalises Example 4’s
  indexed container presentation.  `describeIndexedContainerExample4Witness`
  enumerates finite Nat/Stream families while
  `analyzeIndexedContainerRelativeMonad` replays the Example 4
  unit/extraction data and threads the recorded κ/σ substitution rules through
  every family before checking the relative monad laws.
- `relative/mnne-powerset-monads.ts` captures Example 8’s powerset relative
  monad using lazy/replayable subsets.  `describeCofinitePowersetWitness`
  supplies the cofinite ℕ witness, and `analyzePowersetRelativeMonad`
  verifies the unit/right-unit/associativity laws while reporting the
  approximation slices used for each comparison.
- The same module also exposes `analyzeFiniteVectorLeftKanExtension` and
  `describeBooleanVectorLeftKanExtensionWitness`, which reconstruct the Example 1
  left Kan extension along FinSet → Set.  They enumerate the cocone data,
  quotient by the generated relations, and confirm the resulting classes match
  the Boolean vector functor on each target set, warning when the chosen
  dimension bound omits necessary generators.
- `relative/mnne-lax-monoidal.ts` packages Section 3.2’s lax monoidal structure
  on `[J,C]` by combining the Lan\_j witness with concrete endofunctors on the
  two-object category.  `analyzeMnneLaxMonoidalStructure` checks that the
  canonical inclusion, tensor, unitors, and associator agree with composing
  Lan\_j and that the triangle identity holds for the supplied triples.
- `analyzeMnneLaxMonoid` verifies the Theorem 3 lax-monoid structure derived
  from a relative monad by checking the recorded unit and multiplication
  transformations satisfy the left/right unit laws and the associativity
  composite using the Lan\_j tensor.
- `RelativeMonadOracles.functorCategoryLaxMonoidal` exposes the same diagnostics
  in the oracle registry, defaulting to the two-object witness so the Example 3
  computations appear alongside the other MNNE oracles.
- `relativeMonad.mnne.functorCategoryLaxMonoid` publishes the lax-monoid
  analyzer through the oracle registry so Example 3’s relative monad ↔ lax
  monoid bridge appears in demos and scripts by default.
- `relativeMonad.mnne.wellBehavedInclusion` witnesses Definition 4.1’s
  full-faithfulness requirement for j : J → C by enumerating finite hom-sets
  and checking that J induces bijections `C(JX, JY) ≅ J(X, Y)` on the supplied
  samples.
- `relativeMonad.mnne.lanExtension` packages Section 4.3’s theorem that a
  well-behaved inclusion extends a relative monad to an ordinary monad on C.
  The oracle checks that Lan\_J T preserves identities/composition, that the
  recorded unit/multiplication satisfy the monad laws, that κ\_T is an
  isomorphism with the supplied inverse, and that the Lan-derived Kleisli
  extension agrees with the relative extension operator on every enumerated
  arrow.
- `relativeMonad.enriched.eilenbergMooreAlgebra` realises Definition 8.16’s
  enriched T-algebra by checking that the carrier shares the monad boundaries,
  the extension operator reuses the enriched extension witness, and the Street
  pastings for the unit and multiplication composites evaluate to the recorded
  enriched comparisons.
- `relativeMonad.enriched.kleisliInclusion` exposes Lemma 8.7’s
  identity-on-objects inclusion into Kl(T), requiring the functor to reuse the
  loose arrow, unit, and extension witnesses and to supply the κ_T opalgebra
  comparison triangles recorded in the lemma.
- `relativeMonad.enriched.yoneda` packages Example 8.6’s Yoneda embedding,
  demanding that the representable presheaf reuse the enriched hom object,
  tensor comparison, and extension witnesses recorded with the monad.
- `relativeMonad.enriched.yonedaDistributor` captures Lemma 8.7’s comparison of
  the red/green composites through PZ(p,q), insisting that both composites share
  boundaries with the Yoneda witness, coincide with the supplied factorisation,
  and agree with the recorded right lift witnessing the universal property of
  `q ▷ p`.
- `relativeMonad.enriched.vcatSpecification` records Theorem 8.12’s enriched
  specification of a j-relative monad. The oracle demands that the unit and
  multiplication triangles reuse the enriched unit/extension witnesses, that the
  functorial identity/composition diagrams share those comparisons, and that the
  τ witnesses agree with the recorded naturality data. Street roll-up artifacts
  now flow through the analyzer so registry enumeration exposes the aggregated
  composites (or pending Street discrepancies) alongside the Yoneda, distributor,
  and Kleisli adapters.
- `relativeMonad.representableLooseMonoid` captures Theorem 4.16’s bridge
  between j-relative monads and monoids in `X[j]` whose loose arrows are
  representable.  `RelativeMonadOracles.representableLooseMonoid` consumes the
  `RepresentabilityWitness` emitted by the equipment layer’s left restriction
  builders and reports whether the relative monad’s loose arrow truly arises
  from restricting the identity along the chosen root.
- `relativeMonad.fiberEmbedding` records Theorem 4.22’s fully faithful functor
  `E(j,-) : \mathrm{RMnd}(j) → \mathrm{Mnd}_{X[j]}(A)`.  The
  `RelativeMonadOracles.fiberEmbedding` check packages the induced fiber
  monad—reusing the loose arrow, unit, and extension data—while marking the
  outstanding Street-calculus comparisons as pending.
- `relativeMonad.representableRecovery` tracks Remark 4.24’s observation that a
  representable root recovers Levy’s representable relative monads and the
  Altenkirch–Chapman–Uustalu skew monoids.  The oracle combines the fiber
  embedding with any supplied skew-monoid bridge data, surfacing pending status
  when the literature comparisons still await witnesses.
- `relativeMonad.skewMonoid.bridge` aggregates Theorem 4.29’s hypotheses:
  existence and preservation of left extensions along `j`, j-absolute and
  dense comparison data, and invertibility of the right unit.  The
  `RelativeMonadOracles.skewMonoidBridge` oracle threads the corresponding
  analyzers (`analyzeLeftExtensionFromWeightedColimit`,
  `analyzePointwiseLeftExtensionLiftCorrespondence`,
  `analyzeLeftExtensionPreservesAbsolute`,
  `analyzeDensityViaIdentityRestrictions`, and
  `analyzeFullyFaithfulLeftExtension`) together with a loose-monoid framing
  report to certify that the relative monad realises a monoid in the left skew
  monoidal category `X[j]`.
- `relativeMonad.identityReduction` implements Corollary 4.20’s observation that
  ordinary monads embed as j-relative monads with identity roots.  The
  associated oracle `RelativeMonadOracles.identityReduction` checks that the
  root and carrier coincide with the identity boundary and that the loose arrow
  is endo on that object, surfacing actionable diagnostics when the reduction
  fails.
- `enumerateRelativeMonadOracles` collects the default framing, identity,
  extension, and associativity reports into a single array so documentation and
  tooling can present the whole Definition 4.1 diagnostic surface alongside the
  pending associativity witness.
- `AlgebraOracles.relative.checkRelativeMonadLaws` aggregates these reports with
  the new unit-compatibility, associativity, and root-identity analyzers.  The
  helper returns `{holds, pending, details, analysis}` so law-checking tools can
  consume a single structural invariant while still seeing which Street-style
  witnesses remain to be implemented.  Each component exposes its witness data
  (the unit arrow, composed Street pastings, and restriction outputs) so
  downstream debuggers can inspect the exact morphisms responsible for a
  failure.

#### ADT polynomial Street harness registry

- `relativeMonad.adt.polynomialBridge` documents the bridge from
  `defineADT`-generated constructors, folds, and unfolds into the polynomial
  container interface. `RelativeMonadOracles.polynomialContainerBridge` calls
  `analyzeADTPolynomialRelativeMonad`, returning detailed value/fold/unfold
  counterexamples when the replayed container structure diverges from the ADT
  surface.
- `relativeMonad.adt.polynomialStreet` captures the Street-style unit and
  Kleisli composites induced by ADT catamorphisms.  The corresponding oracle
  `RelativeMonadOracles.polynomialStreetHarness` threads
  `analyzeADTPolynomialRelativeStreet`, exposing extension and Kleisli
  snapshot artefacts so enriched adapters can reuse the recorded composites.
- `relativeMonad.adt.polynomialStreetRollups` records the persisted Street
  composites used by enriched Yoneda, V-cat, and distributor adapters.
  `RelativeMonadOracles.polynomialStreetRollups` invokes
  `rollupADTPolynomialRelativeStreet` to aggregate the snapshots, surfaces
  pending status when a harness scenario fails, and returns the replayable
  artefacts for downstream witnesses.
- `relativeMonad.adt.polynomialStreetRollupAggregation` summarises the
  aggregated Street payload across every enriched analyzer.
  `RelativeMonadOracles.polynomialStreetRollupAggregation` reuses
  `analyzeRelativeEnrichedStreetRollups` so enumeration emits a combined
  holds/pending verdict alongside per-analyzer reports without recomputing the
  Street harness.
- `relativeMonad.adt.polynomialEnrichedAdapters` packages the Street harness
  report, roll-ups, and enriched adapter option bundles for the Yoneda,
  Eilenberg–Moore, Kleisli, V-cat, and distributor analyzers.  The oracle
  `RelativeMonadOracles.polynomialStreetEnrichedAdapters` reuses
  `buildADTPolynomialRelativeStreetEnrichedBundle` so enumeration always
  forwards the same artifacts that the Street harness produced.  Stage 089 shows
  how higher-order indexed ADTs reuse the same bundle while exposing dependency
  metadata through introspection snapshots.
- `analyzeRelativeEnrichedStreetRollups` runs the Yoneda, distributor,
  Eilenberg–Moore, Kleisli, and V-Cat analyzers against a shared Street roll-up
  payload, returning a combined holds/pending summary while preserving the
  individual analyzer reports and their Street artifacts for drill-down.
- Higher-order parameter descriptors surface via
  `higherOrderParameterField`: ADT schemas can now derive equality witnesses for
  dependent payloads directly from instantiated parameter metadata. The
  resulting constructor fields retain `higherOrder` metadata so enriched
  adapters and code generators can inspect which parameter drives each
  dependent payload without recomputing schema information.
- **Runnable examples:** Stage 087
  (`examples/runnable/087-adt-polynomial-street-harness.ts`) shows how to build
  a numeric list ADT, run the Street harness, roll up the snapshots, and query
  the core registry entries. Stage 088
  (`examples/runnable/088-adt-polynomial-enriched-adapters.ts`) extends the
  workflow by producing the enriched adapter bundle and replaying the skew
  monoid bridge alongside the Street diagnostics. Stage 089
  (`examples/runnable/089-adt-polynomial-enriched-higher-order.ts`) specialises
  the workflow to a higher-order indexed ADT, highlighting how Street roll-ups
  carry dependency metadata into the Yoneda analyzer. Stage 090
  (`examples/runnable/090-adt-polynomial-enriched-street-rollups.ts`) aggregates
  the Street roll-up payload across the enriched analyzers and reports combined
  holds/pending status alongside per-analyzer summaries. The
  `npm run validate-relative-monads` CLI mirrors that aggregated verdict and, via
  `--aggregated-json <file>`, exports the enumeration result so generators can
  consume machine-readable Street roll-up payloads without rerunning analyzers.
  `scripts/generate-aggregated-street-rollup-scaffold.mjs` now turns that JSON
  export into a TypeScript module with pending-aware guards and analyzer
  summaries so enriched adapters can branch on the recorded verdicts.

### Relative algebra scaffolding

- Definitions 6.1 and 6.4 introduce relative algebras and opalgebras.  The registry
  entries `relativeMonad.algebra.framing` and
  `relativeMonad.opalgebra.framing` now point at executable analyzers
  (`RelativeAlgebraOracles.algebraFraming` and
  `RelativeAlgebraOracles.opalgebraFraming`) that verify the supplied action
  2-cells reuse the j-root and carrier boundaries before any universal property
  checks fire.  These framing reports lead off
  `enumerateRelativeAlgebraOracles`, giving downstream tooling immediate
  confirmation that Definition 6.1/6.4 data is wired in before hitting the still
  pending Street-style witnesses.  Companion entries
  `relativeMonad.algebra.morphismCompatibility` and
  `relativeMonad.opalgebra.morphismCompatibility` now surface structural
  analyzers that ensure morphism boundaries reuse the source/target carriers.
  When those checks pass the oracles emit pending diagnostics noting that the
  Street composites `E(j,α)` and `E(t,α)` remain to be compared; any boundary
  mismatch produces an immediate non-pending failure so contributors can repair
  the supplied data before wiring in the remaining witnesses.
- Definition 6.4’s string diagrams split into the carrier triangle and extension
  rectangle.  The new registry entries `relativeMonad.opalgebra.carrierTriangle`
  and `relativeMonad.opalgebra.extensionRectangle` ensure the oracle layer
  captures the shared codomain boundary, the opalgebra carrier, and the monad
  unit/extension witnesses even while the Street equalities remain pending.
  `RelativeAlgebraOracles.opalgebraCarrierTriangle` and
  `RelativeAlgebraOracles.opalgebraExtensionRectangle` surface these structured
  reports so downstream tooling can display the same triangle/rectangle
  diagnostics used in the paper once the comparison pastings are executable.
- Definition 6.29 introduces graded \(T\)-algebra morphisms.
  `relativeMonad.algebra.gradedMorphisms` keeps the \((p_1,\ldots,p_n)\)
  grading data and the displayed comparison pastings visible so future
  analyzers gather the Street-style witnesses before certifying multi-input
  morphisms.
- Remark 6.30 rewrites the graded morphism definition as a single composite
  pasting.  The registry path `relativeMonad.algebra.gradedMorphismsAlternate`
  makes this alternative presentation executable by demanding the pasted
  2-cell and the comparison witnesses that recover the Definition 6.29
  equality.
- Example 6.31 constructs graded morphisms from the extension operator.
  `relativeMonad.algebra.gradedExtensionMorphisms` ensures that the canonical
  extension witnesses are recorded and verified against the graded comparison
  diagrams before the Street analyzers run.
- Remark 6.32 organises the fibrewise categories \(T\text{-Alg}_D\) into an
  indexed family.  The entry `relativeMonad.algebra.indexedFamily` tracks the
  restriction functors, coherence witnesses, and carrier reuse so oracle
  consumers can inspect the indexed structure directly.
- Definition 6.33 packages the fibrewise categories into the global category
  \(\mathrm{Alg}(T)\).  `relativeMonad.algebra.globalCategory` documents the
  object/morphism assignments together with the composition and identity
  witnesses required to run the future analyzer.
- Definition 6.34 introduces the mediating tight cell
  \(f_T : A \to \mathrm{Alg}(T)\) associated to an algebra object.
  `relativeMonad.algebra.mediatingTightCell` keeps the comparison data visible
  so the oracle layer can confirm that \(f_T\) reuses the monad’s unit and
  extension witnesses.
- Lemma 6.35 promotes an algebra object to a resolution.  The path
  `relativeMonad.algebra.resolutionFromAlgebraObject` ensures analyzers collect
  the boundary alignment and comparison data needed to match the Section 5
  resolution diagnostics.
- Remark 6.2 assembles \(T\)-algebras with fixed domain into a category via a
  faithful restriction functor.  The analyzer behind
  `relativeMonad.algebra.restrictionFunctor` now checks that the Street-action
  image reuses the recorded carriers and boundary data while reporting pending
  functoriality/faithfulness witnesses, keeping the comparison visible to
  downstream tooling.
- Example 6.3 highlights the canonical algebra obtained from a relative monad’s
  carrier.  The analyzer behind `relativeMonad.algebra.canonicalAction` now
  checks that the supplied algebra reuses the monad’s tight leg and extension
  2-cell while flagging Proposition 6.12’s Street comparisons as pending, so
  structural regressions surface immediately even before the comparison data
  lands.
- Corollary 6.17 ensures that 1_g-relative algebras reduce to ordinary
  algebras on \(E\).  The `relativeMonad.algebra.identityRootEquivalence`
  analyzer now checks that the relative algebra reuses the identity boundary and
  multiplication witnesses promised by Corollary 4.20, surfacing pending Street
  comparisons while confirming the structural collapse.
- Corollary 6.24 makes the analogous statement for opalgebras.  The new registry
  entry `relativeMonad.opalgebra.identityRootEquivalence` keeps this comparison
  visible so the future analyzer can demand the Street action witnesses and
  reuse the Corollary 4.20 diagnostics while collapsing to ordinary actions on
  \(A\).
- Definition 6.18 reframes \(T\)-opalgebras as right actions in Street’s
  skew-multicategory.  `relativeMonad.opalgebra.rightActionPresentation`
  now ships an analyzer that checks the Street action witness reuses the
  recorded opalgebra action, root, and carrier boundaries while marking the
  string-diagram comparisons as pending.
- Proposition 6.19 shows that the ambient skew multicategory acts on itself
  and that any monoid determines an \(M\)-action.  The
  `relativeMonad.opalgebra.rightActionFromMonoid` analyzer verifies that the
  recorded Street action is framed by the relative monad’s root/carrier and
  that its action 2-cell coincides with the monad extension, surfacing pending
  diagnostics for the remaining Street comparisons.
- Example 6.6 dualises the canonical construction for opalgebras.  The
  `relativeMonad.opalgebra.canonicalAction` analyzer now verifies that the
  recorded opalgebra reuses the monad’s tight leg and unit 2-cell, reporting a
  pending diagnostic until the Proposition 6.19 witnesses arrive so contributors
  can spot boundary mismatches early.
- Lemma 6.7 identifies \(j\)-relative opalgebras with extraordinary
  transformations of the associated loose monad.  The
  `relativeMonad.opalgebra.extraordinaryTransformations` analyzer now records
  the loose monoid witnesses and verifies that they reuse the relative monad’s
  root, carrier, and loose arrow, returning a pending diagnostic until the
  Section 1.4 comparison is executable.
- Section 6.2 reframes relative (op)algebras as Street-style actions and spells
  out concrete witnesses for Definitions 6.9–6.14.  The analyzers behind
  `relativeMonad.actions.rightLeftCoherence`,
  `relativeMonad.actions.streetActionHomomorphism`,
  `relativeMonad.actions.homomorphismCategory`,
  `relativeMonad.actions.canonicalSelfAction`,
  `relativeMonad.actions.looseAdjunctionAction`,
  `relativeMonad.actions.looseAdjunctionRightAction`, and
  `relativeMonad.actions.representableRestriction` now evaluate the Street
  comparisons directly, recording the red/green composites and flagging
  disagreements immediately.  `relativeMonad.actions.streetActionData` continues
  to enforce boundary reuse while tracking the remaining comparison work.
  The remaining registry paths continue to track future analyzers:
  - `relativeMonad.actions.representableStreetSubmulticategory` captures
    Definition 6.21’s passage to \(\mathsf{X}[j, B]_\iota\) and its
    representable sub-multicategory, reusing the executed restriction report to
    validate the representable cells.
  - `relativeMonad.actions.representableStreetActionDiagrams` evaluates the
    Definition 6.21 string-diagram equalities that identify Street actions with
    the Definition 6.4 opalgebra pastings, exposing the computed
    \(\rho\), \(\lambda\), and \(\mu\) composites.
  - `relativeMonad.actions.representableStreetActionHomomorphism` mirrors the
    Definition 6.21 action homomorphism equation, comparing both composites of
    \(\mathsf{B}(1, \alpha)\) inside the representable sub-multicategory.
  - `relativeMonad.actions.relativeAlgebraBridge` now records the Street action
    extracted from Definition 6.1 \(T\)-algebra data, attaching the executed
    Street comparison report instead of a pending placeholder.
  - `relativeMonad.actions.algebraActionIsomorphism` packages Theorem 6.15’s
    comparison, bundling the algebra-to-action bridge, the action-to-algebra
    recovery, and the identity witnesses on both sides while threading the
    evaluated Street comparisons (optional inverse data remain future work).
  - `relativeMonad.actions.representabilityUpgrade` threads Remark 6.16’s
    representability witnesses through the Street action analyzer, verifying
    that the upgrade reuses the recorded action with the same executed Street
    diagnostics.
  - `relativeMonad.actions.representabilityGeneralisation` extends this outlook
    to Remark 6.23’s Street action multicategories \(\mathsf{X}[j, B]\),
    signalling that future analyzers must gather the loose-extension witnesses
    establishing representability and compare them with the Theorem 4.29
    diagnostics already in the registry.
  - `relativeMonad.actions.representableActionIsomorphism` runs Theorem 6.22’s
    natural isomorphism \(\mathrm{Act}(\mathsf{X}[j,B]_\iota^{B}, T) \cong
    T\text{-Opalg}_B\) through `analyzeRelativeOpalgebraStreetActionEquivalence`,
    recording the Street/opalgebra bridge, recovery homomorphism, and opalgebra
    comparison built from the executed Street evaluations (the explicit inverse
    functor witnesses remain future work).
- `relativeMonad.opalgebra.representableActionBridge` extends the Street bridge
  to the representable setting, ensuring the analyzer requests the Definition 6.4
  opalgebra data, the representability witnesses, and the resulting action in
  \(\mathsf{X}[j,B]_\iota^{B}\).
- Remark 6.5 compares Definition 6.4 opalgebras with modules of Ahrens,
  Maillard’s Kleisli algebras, and Lobbia’s relative right modules.  The entry
  `relativeMonad.opalgebra.literatureRecoveries` records this cross-check so the
  future analyzer can demand witnesses that translate between the relative
  opalgebra data and each cited presentation.
- Remark 6.8 points toward a two-dimensional opmulticategory treatment of
  relative monads.  The placeholder `relativeMonad.actions.twoDimensionalModules`
  keeps the prospective module analyzers on the radar by documenting the need to
  compare the one-dimensional actions with Altenkirch–Chapman–Uustalu style
  modules.

### Relative comonad scaffolding

- `relative/relative-comonads.ts` dualises the relative monad analyzers to the
  counit/coextension setting.  The law entries
  `relativeComonad.counit.framing` and `relativeComonad.coextension.framing`
  back `RelativeComonadOracles.counitFraming` and
  `RelativeComonadOracles.coextensionFraming`, certifying that the 2-cells reuse
  the carrier/root boundaries required by the dual of Definition 4.1.
- `relativeComonad.corepresentableLooseComonoid` captures the dual of
  Theorem 4.16.  `RelativeComonadOracles.corepresentability` consumes the right
  restriction witness emitted by the equipment layer and confirms that
  `C(t,j)` arises from restricting the identity along `j`.
- `relativeComonad.identityReduction` mirrors Corollary 4.20: the
  `RelativeComonadOracles.identityReduction` oracle demands that the root and
  carrier are identities so the structure collapses to an ordinary comonad.
- `relativeComonad.enriched.structure` packages Proposition 8.22, asking
  `RelativeComonadOracles.enrichment` to compare the enriched cohom object and
  cotensor comparison against the recorded counit/coextension witnesses.
- `relativeComonad.coopAlgebra` documents Theorem 8.24 by invoking
  `RelativeComonadOracles.coopAlgebra`, which checks that the coopalgebra
  coassociativity/counit diagrams commute and reuse the enriched comparisons.

### Relative composition and representation scaffolding

- `relative/relative-composition.ts` introduces analyzers for Corollary 5.34 and
  Corollary 5.40, verifying that the right leg of one relative adjunction
  matches the root of the next and that consecutive relative monads share
  carriers/loose arrows.  The law registry entries
  `relativeAdjunction.composition.compatibility` and
  `relativeMonad.composition.compatibility` surface these diagnostics via
  `RelativeCompositionOracles.adjunctionComposition` and
  `RelativeCompositionOracles.monadComposition`.
- `relativeMonad.representation.looseMonoid` registers the executable bridge
  between relative monads and loose monoids.  The oracle
  `RelativeCompositionOracles.looseMonoidBridge` converts a loose monoid into a
  relative monad, combining the loose monoid framing report with the relative
  monad analyzer to document success or precise failures.

### Relative adjunction scaffolding

- `relative/relative-adjunctions.ts` introduces `RelativeAdjunctionData` and the
  analyzers `analyzeRelativeAdjunctionFraming` and
  `analyzeRelativeAdjunctionHomIsomorphism`, tracking Definition 5.1’s domain
  and codomain requirements for the root, left, and right legs together with the
  hom-set isomorphism between `C(ℓ-, -)` and `E(j-, r-)`. The associated law
  entries `relativeAdjunction.framing` and `relativeAdjunction.homIso.framing`
  surface structured diagnostics via `RelativeAdjunctionOracles`.
- `relativeAdjunction.section.partialRightAdjoint` realises Lemma 6.38’s
  partial right adjoint. The analyzer now certifies that the recorded section
  shares the left leg’s object boundaries, reuses the adjunction’s hom-set
  bijection, and that both composites ℓ ∘ σ and σ ∘ ℓ collapse to the supplied
  identity 2-cells, making the triangle identities executable.
- `relativeAdjunction.unitCounit.presentation` now executes the Lemma 5.5
  boundary checks. `RelativeAdjunctionOracles.unitCounitPresentation` accepts an
  explicit unit/counit presentation, verifies that the 2-cells reuse the root,
  left, and right tight boundaries, and reports a pending diagnostic only when
  no presentation accompanies the adjunction data.
- `relativeAdjunction.pointwiseLeftLift` captures Proposition 5.8, which
  computes the right relative adjoint as a pointwise left lift of \(ℓ\) along
  \(j\). The oracle `RelativeAdjunctionOracles.pointwiseLeftLift` threads the
  `analyzePointwiseLeftLift` report into the adjunction framing, flagging
  mismatched domains/codomains when the lift fails to recover the right leg.
- `relativeAdjunction.rightExtension` reflects Proposition 5.10’s construction
  of right relative adjoints via left extensions along a fully faithful root.
  The oracle aggregates `analyzeLeftExtensionFromWeightedColimit`,
  `analyzeFullyFaithfulLeftExtension`, and the pointwise lift correspondence to
  surface any missing hypotheses.
- `relativeAdjunction.colimitPreservation` enforces Proposition 5.11 by
  comparing a shared weight preserved by \(j\) and \(ℓ\). The oracle checks that
  both left extensions reuse the same weight boundaries and that, whenever the
  root preserves the colimit, the left leg does as well.
- `relativeAdjunction.leftMorphism` records Definition 5.14. The analyzer
  ensures both relative adjunctions share the same root, that the comparison
  tight cell runs between their apices, and that the supplied 2-cell reuses the
  left legs as its vertical boundaries, making Lemma 5.17’s embedding into the
  slice category \(\mathcal{X}/E\) executable.
- `relativeAdjunction.rightMorphism` dualises the previous item for
  Definition 5.18. The analyzer checks that the comparison tight cell runs
  between the domains of the right legs and that the framed 2-cell mirrors the
  coslice embedding from Lemma 5.21.
- `relativeAdjunction.strictMorphism` packages Definition 5.23. The oracle
  demands that the left and right morphism data agree on their comparison tight
  cell and combines both framing reports to witness strict morphisms as common
  refinements of the left/right notions.
- `relativeAdjunction.resolution.relativeMonad` keeps Theorem 5.24 visible in
  the registry; `relativeMonadFromAdjunction` now synthesises the induced
  relative monad so the analyzer can immediately compare the recorded
  unit/extension data against the adjunction’s hom-isomorphism witnesses.
- `relativeResolution.definition.5.25` certifies that a resolution records the
  inclusion \(j\), apex loose morphism, and comparison isomorphisms that
  reconstruct the underlying \(j\)-relative monad while caching the witnesses
  for Propositions 5.29–5.30, Remark 5.33, Example 5.31, Corollary 5.32, and
  Proposition 5.37.
- `relativeResolution.category.identities` checks that morphisms of resolutions
  admit identity arrows satisfying the left/right unit axioms so the category
  \(\mathrm{Res}(T)\) remains well defined.
- `relativeResolution.precomposition.suite` aggregates the executable data for
  Proposition 5.29 precomposition, Proposition 5.30 pasting, Remark 5.33 and
  Corollary 5.34’s resolute-composition guarantees, Example 5.31/Corollary 5.32
  fully faithful postcomposition, and Proposition 5.37 transport along left
  relative adjoints, now explicitly threading the `(ℓ'!, r')` monad morphism
  comparisons and their narrative summaries through each transport report.
- `relativeResolution.corollary.5.28` wraps
  `identifyLooseMonadFromResolution`, reusing the
  `checkLooseMonadIsomorphism` witnesses so Corollary 5.28’s canonical
  comparison explicitly identifies the loose monad induced by a resolution with
  \(E(j,-)T\) across all recorded Proposition 5.29–5.37 scenarios, surfacing the
  Proposition 5.37 `(ℓ'!, r')` transport comparisons alongside the base
  adjunction and precomposition diagnostics.
- `relativeResolution.corollary.5.32` exports
  `checkIdentityUnitForRelativeAdjunction`, checking that a fully faithful
  postcomposition collapses back to the base resolution whenever the identity
  and unit satisfy Corollary 5.32 and reporting whether the paired \(j\)-monads
  coincide.
- `relativeAdjunction.pasting.leftMorphism` runs
  `analyzeRelativeAdjunctionPasting`, checking that a nested pair of relative
  adjunctions shares equipment, that the outer right leg matches the inner root,
  that the pasted left leg equals the composite of the two left legs, and that
  the induced left morphism report is free of issues, making Proposition 5.30
  executable.
- `relativeAdjunction.postcomposition.fullyFaithful` runs
  `analyzeRelativeAdjunctionFullyFaithfulPostcomposition`, confirming that a
  fully faithful tight 1-cell `u` postcomposes the root and right leg while
  leaving the left leg fixed. The oracle records the composites `u ∘ j` and
  `u ∘ r` together with the fully faithful analysis returned by the equipment
  layer.
- `relativeAdjunction.inducedMonads.coincide` compares the paired relative
  monads promised by Corollary 5.32, checking that their roots, carriers, loose
  arrows, and unit/extension frames agree verbatim.
- `relativeAdjunction.resolute` now runs
  `analyzeRelativeAdjunctionResolutePair`, combining the fully faithful
  postcomposition report with the induced-monad coincidence analysis while
  checking that the monad data reuse the original and postcomposed right legs.
- `relativeAdjunction.resolute.leftMorphism` aggregates
  `analyzeRelativeAdjunctionResoluteLeftMorphism`, threading the resolute pair,
  the Proposition 5.29 precomposition report, and the Proposition 5.30 pasting
  witness so the induced left morphism is only marked complete when all three
  diagnostics align.
- `relativeAdjunction.resolute.identityRoot` wraps the Corollary 5.34 analyzer
  via `analyzeRelativeAdjunctionOrdinaryLeftAdjointComposition`, bubbling up
  the same issues array while tagging the identity-root specialisation required
  by Example 5.35.
- `relativeAdjunction.relativeMonad.module` is backed by
  `analyzeRelativeAdjunctionRelativeMonadModule`, threading the Corollary 5.34
  resolute left morphism through the relative monad resolution diagnostics to
  certify the Proposition 5.36 module action.
- `relativeAdjunction.relativeMonad.pasting` now delegates to
  `analyzeRelativeAdjunctionRelativeMonadPasting`, which consumes the pasted
  unit and extension witnesses from Proposition 5.37 and checks that the
  resulting \(j'\)-relative monad and comparison morphism reuse the supplied
  adjunction boundaries.
- `relativeAdjunction.relativeMonad.pastingFullyFaithful` wraps
  `analyzeRelativeAdjunctionRelativeMonadPastingFullyFaithful`, layering the
  fully faithful right adjoint witness over the pasting diagnostics to expose
  the Example 5.38 functor on relative monads.
- `relativeAdjunction.relativeMonad.pastingAdjunction` collects the two
  Proposition 5.37 reports via
  `analyzeRelativeAdjunctionRelativeMonadPastingAdjunction`, confirming the
  shared intermediate monad required by Example 5.39.
- `relativeAdjunction.relativeMonad.compositeThroughRoot` relies on
  `analyzeRelativeAdjunctionRelativeMonadComposite`, combining the module
  assignment with the pasting witnesses so Corollary 5.40’s comparison against
  the pasted \(j'\)-relative monad is executable.
- `relativeAdjunction.relativeMonad.literatureRecoveries` invokes
  `analyzeRelativeAdjunctionRelativeMonadLiteratureRecoveries`, which now
  accepts Hutson and Altenkirch–Chapman–Uustalu witnesses to demonstrate the
  Example 5.41 recoveries.

The Section 6.4 entries `relativeAdjunction.relativeMonad.leftOpalgebra`,
  `relativeAdjunction.relativeMonad.rightAlgebra`, and
  `relativeAdjunction.relativeMonad.resolutionFunctor` execute via
  `analyzeRelativeAdjunctionRelativeMonadLeftOpalgebra`,
  `analyzeRelativeAdjunctionRelativeMonadRightAlgebra`, and
  `analyzeRelativeAdjunctionRelativeMonadResolutionFunctor`, checking that the
  recorded (op)algebra actions reuse the adjunction boundaries and the induced
  relative monad from Proposition 5.24 while marking the Street comparisons as
  pending.  Proposition 6.27’s transports now run through
  `analyzeRelativeAdjunctionRelativeMonadOpalgebraTransport` and
  `analyzeRelativeAdjunctionRelativeMonadAlgebraTransport`, which validate the
  pasting witness, confirm source/target framing, and record the supplied
  naturality diagnostics.  Remark 6.28’s strengthened statement is captured by
  `analyzeRelativeAdjunctionRelativeMonadTransportEquivalence`, aggregating the
  dual transports with unit/counit comparisons so the remaining equivalence
  witnesses stay visible to oracle consumers.

### Relative Kleisli and Eilenberg–Moore scaffolding

- `relative/relative-algebras.ts` provides
  `RelativeKleisliPresentation`/`RelativeEilenbergMoorePresentation` together
  with `analyzeRelativeKleisliUniversalProperty` and the enriched
  `analyzeRelativeEilenbergMooreUniversalProperty`. These analyzers ensure the
  opalgebra/algebra actions reuse the designated root/carrier boundaries while
  recording the comparison functor, partial right adjoint, and graded
  factorisations predicted by Theorem 6.39 and Theorem 6.49.
- `relativeMonad.algebra.partialRightAdjointFunctor` packages the witnesses
  from Corollaries 6.40–6.41 and Proposition 6.42. The oracle
  `RelativeAlgebraOracles.partialRightAdjointFunctor` threads the Lemma 6.38
  section report, invokes the fully faithful diagnostics for the comparison
  tight cell, and confirms that the supplied j-objects remain fixed under the
  partial right adjoint.
- `relativeMonad.opalgebra.resolution` wires Lemma 6.47 into code: the oracle
  lifts a relative opalgebra into the Lemma 6.35 resolution, reuses the carrier
  and action witnesses, and reports the κ\_t triangle identities alongside the
  nested relative-monad diagnostics.
- `relativeMonad.opalgebra.partialLeftAdjointSection` exposes Theorem 6.49’s
  section \(RAdj\_j(j) \to RMnd\_j\).  The analyzer reuses the opalgebra
  resolution, checks that the induced monad matches the Lemma 6.47 comparison,
  and confirms the recorded transpose is the identity on \(j\)-objects.
- `relativeMonad.kleisli.universalOpalgebra` and
  `relativeMonad.eilenbergMoore.universalAlgebra` catalogue the executable
  structural invariants exposed by `RelativeAlgebraOracles`. The registry entry
  `relativeMonad.universal.strengthenedComparisons` keeps the stronger universal
  property checks visible while their oracles remain pending.

## Core Algebraic Structures

### Initial tensor unit induces semicartesian structure

- **Domain**: Symmetric monoidal categories whose tensor unit is an initial object.
- **Statement**: For every object \(X\), the canonical arrow \(!_{X} : I \to X\) induced by initiality is unique, yielding a semicartesian structure.
- **Rationale**: These canonical global elements supply the discard-style maps required for the paper's weak infinite products.
- **Oracle**: `checkInitialUnitSemicartesian(data, targets, samples)` → `{ holds, witness, details, failures }`
- **Witness**: `SemicartesianStructure` exposing `globalElement(X)` for each object.
- **Tests**: `law.SemicartesianCRingPlus.spec.ts`
- **Examples**: `CRing_⊕` with initial object `ℤ` via `checkCRingPlusInitialSemicartesian`.
- **Implementation Notes**: Extendable to any category providing an `InitialObjectWitness` whose object matches the tensor unit.

### CRing⊕ causality counterexample

- **Domain**: Additive/unit-preserving morphisms between commutative rings regarded as objects of `CRing_⊕`.
- **Statement**: There exist morphisms \(h_1, h_2 : \mathbb{Z}[t] \to \mathbb{Z}[t]\), \(g : \mathbb{Z}[t] \to \mathbb{Z}[t]\), and \(f : \mathbb{Z}[t] \to \mathbb{Z}[t]\) such that \(f \circ g \circ h_1 = f \circ g \circ h_2\) yet \(g \circ h_1 \neq g \circ h_2\), demonstrating a failure of the causal no-signalling principle.
- **Rationale**: Demonstrates that semicartesian structure alone does not enforce the causal no-signalling principle, motivating the paper’s distinction between semicartesian and Markov infinite products.
- **Oracle**: `checkCRingPlusCausalityCounterexample()` → `{ holds, equalAfterObservation, equalBeforeObservation, witness, homChecks, details }`
- **Witness**: `buildCRingPlusCausalityScenario()` packages the canonical evaluation and shift morphisms on \(\mathbb{Z}[t]\) whose composites satisfy the counterexample.
- **Tests**: `law.CRingPlusCausalityCounterexample.spec.ts`
- **Examples**: Polynomial evaluation at 0 and 1 together with the substitution \(t \mapsto t+1\) supply the morphisms.
- **Implementation Notes**: Witness extraction records explicit polynomials separating \(g \circ h_1\) from \(g \circ h_2\) while confirming each morphism preserves 0, 1, addition, and negation.

### Complex numbers as a C*-algebra

- **Domain**: The C*-algebra of complex numbers with conjugation and the standard absolute-value norm.
- **Statement**: Complex conjugation is an involutive *-anti-automorphism, \(\|z^* z\| = \|z\|^2\) for every \(z \in \mathbb{C}\), and canonical *-homomorphisms are contractive.
- **Rationale**: Supplies the baseline C*-algebra promised in the paper so additional operator-algebra structures can reuse concrete witnesses and diagnostics.
- **Oracles**: `checkComplexCStarAxioms(samples, scalars, tolerance)` and `checkComplexIdentityHomomorphism(samples, scalars, tolerance)`.
- **Witness**: `ComplexCStarAlgebra` packages the algebraic operations, star, norm, and positivity; `identityComplexHom` exposes the canonical *-homomorphism.
- **Tests**: `law.CStarAlgebra.spec.ts`
- **Examples**: Default samples include \(0\), \(1\), \(i\), and \(-2 + 3i\) together with scalars \(1\), \(i\), and \(2 - i\).
- **Implementation Notes**: Diagnostics report the failing axiom along with tolerance-aware discrepancies whenever a user-supplied structure or morphism misbehaves.

### Spectral decomposition of complex C*-algebra elements

- **Domain**: The complex C*-algebra \(\mathbb{C}\) equipped with conjugation and the absolute-value norm.
- **Statement**: Every element \(z \in \mathbb{C}\) decomposes uniquely as \(z = y + i z'\) with \(y, z'\) self-adjoint (real-valued) and both \(y = \frac{1}{2}(z + z^*)\) and \(z' = -\frac{i}{2}(z - z^*)\) lying in the self-adjoint subspace.
- **Rationale**: Encodes the spectral-theory prerequisite that tail-event constructions rely on—showing that even in the base C*-algebra, self-adjoint parts and normal elements are observable with executable witnesses.
- **Oracle**: `checkComplexSpectralTheory(samples, tolerance)` and the general `checkCStarSpectralTheory(algebra, elements, tolerance)`.
- **Witness**: `ComplexCStarAlgebra` combined with `realPartCStar`/`imaginaryPartCStar` expose the decomposition, while `isSelfAdjoint` and `isNormal` certify structural properties.
- **Tests**: `law.CStarAlgebra.spec.ts` exercises decomposition, normality, and the canonical helper.
- **Examples**: Default samples \(0, 1, i, -2 + 3i\) illustrate real/imaginary projections and certify the normality of complex scalars.
- **Implementation Notes**: Reports include tolerance-aware discrepancy norms so alternative C*-algebra instances can diagnose failures in their spectral decomposition data.

### Copy/discard witness a commutative comonoid on every object

- **Domain**: Markov categories equipped with designated copy \(\Delta_X: X \to X \otimes X\) and discard \(!_{X}: X \to I\) morphisms.
- **Statement**: The chosen \(\Delta_X\) and \(!_{X}\) satisfy coassociativity, commutativity, and the left/right counit diagrams, making \(X\) a commutative comonoid.
- **Rationale**: Packages copy/discard data as law-checked structure rather than implicit assumptions, enabling reuse with inverse limits and other carriers.
- **Oracle**: `checkMarkovComonoid(witness)` → `{ holds, failures, details, copyCoassoc, copyCommut, copyCounitL, copyCounitR }`
- **Witness**: `MarkovComonoidWitness` bundling the object, copy, and discard morphisms (optionally relabelled).
- **Tests**: `law.MarkovCategory.spec.ts`
- **Examples**: Finite Markov kernels via `buildMarkovComonoidWitness(mkFin([...]))` and deterministic comonoid homomorphisms in the same spec.
- **Implementation Notes**: Homomorphisms validated with `checkMarkovComonoidHom(domain, codomain, f)` returning detailed preservation diagnostics.

### Deterministic morphisms are precisely comonoid homomorphisms

- **Domain**: Markov categories whose objects carry `MarkovComonoidWitness` data.
- **Statement**: A morphism \(f : X \to Y\) is deterministic iff it preserves copy and discard; equivalently, \(f\) is a comonoid homomorphism between \(X\) and \(Y\).
- **Rationale**: Characterizes the deterministic subcategory `C_det` highlighted in the paper and exposes executable checks for its cartesian behaviour.
- **Oracle**: `checkDeterministicComonoid(witness)` → `{ holds, deterministic, comonoidHom, equivalent, failures, details }`
- **Witness**: `MarkovDeterministicWitness` constructed via `buildMarkovDeterministicWitness` or `certifyDeterministicFunction` to pair kernels with their comonoid structures.
- **Tests**: `law.MarkovCategory.spec.ts`
- **Examples**: Dirac kernels over finite carriers, and nondeterministic mixtures that trigger the counterexample diagnostics.
- **Implementation Notes**: Equivalence failures report when deterministic recognition and comonoid preservation disagree, mirroring the paper’s discussion of deterministic subcategories.

### p-Almost-Sure Equality with Deterministic Left Leg

**Law**
 In a causal Markov category, for \(p : A \to X\) and \(f,g : X \to Y\) with \(f\) deterministic, if \(f \circ p = g \circ p\) on the support of \(p\), then \(f =_{p\text{-a.s.}} g\).

**Shape**

```
A ──p──▶ X ──f(det)──▶ Y  ≈  A ──p──▶ X ──g──▶ Y   (on supp(p))
```

**Oracle**
 `MarkovOracles.almostSure.check(witness, { tolerance })`
 Also: `MarkovOracles.almostSure.holds(witness, { tolerance })`

**Witness**
 `MarkovOracles.almostSure.witness(p, f, g, { label })`
 Records support mass, pointwise diffs, and composites \(f∘p\), \(g∘p\).

**Tests**

- Positive: \(g=f\) except on a set with mass < tolerance
- Negative: introduce a small but non-negligible discrepancy and expect a concrete counterexample in `failures`

### Conditional independence via factorization

- **Domain**: Markov categories equipped with copy/discard structure on the conditioning object and output factors.
- **Statement**: A kernel \(p : A \to X_1 \otimes \dots \otimes X_n\) displays conditional independence \(X_1 \perp \dots \perp X_n \mid A\) precisely when it equals the tensor product of its marginals composed with the iterated copy of \(A\), and this equality is invariant under permutations of the tensor factors.
- **Rationale**: Makes conditional independence a law-checked, witness-driven notion so stochastic processes and tails reuse the factorization principle without diagram chasing.
- **Oracle**: `checkConditionalIndependence(witness, { permutations })` → `{ holds, equality, components, factorized, failures, permutations, details }`
- **Witness**: `buildMarkovConditionalWitness(domain, outputs, p, { projections, label })` supplying comonoid data, the kernel, and (optionally) custom projections.
- **Tests**: `law.MarkovConditionalIndependence.spec.ts`
- **Examples**: Independent stochastic kernels built via `pair` or correlated counterexamples that fail the factorization check.
- **Implementation Notes**: Default projections assume left-associated tensor products; exotic codomains can override them via the witness options.

### Deterministic Pushforward under Conditional Independence

**Law**
 If \(p : A \to X\) and \(s : X \to T\) is deterministic, and the joint displays \(X \perp T \parallel A\), then \(s \circ p : A \to T\) is deterministic.

**Shape**

```
A ──p──▶ X ──s(det)──▶ T
   (X ⟂ T ∥ A)
```

**Oracle**
 `MarkovOracles.determinism.lemma(witness, { tolerance })`
 Internally uses:

- Conditional independence checker for \(X \perp T \parallel A\)
- `isDeterministic` on \(s \circ p\)

**Witness**
 `MarkovOracles.determinism.lemmaWitness(p, s, { label })`

**Tests**

- Positive: independent \(X,T\) under \(p\), with \(s\) a copy/discard-built deterministic map
- Negative: violate CI and confirm report flags `ciVerified=false` and/or `deterministic=false`

### Kolmogorov Zero–One Law

**Law**
 Let \(C\) be a Markov category with Kolmogorov products \(X_J\) and finite marginals. If \(p : A \to X_J\) displays \(\perp_{i\in J} X_i \parallel A\) and for every finite \(F\subseteq J\) the joint with \(\pi_F\) and deterministic \(s : X_J \to T\) displays \(X_F \perp T \parallel A\), then \(s \circ p\) is deterministic.

**Shape**

```
A ──p──▶ X_J ──s(det)──▶ T
  (⊥ over i∈J)      and  (∀ finite F: X_F ⟂ T ∥ A)
```

**Oracle**
 `MarkovOracles.zeroOne.kolmogorov.check(witness, { tolerance })`
 Internally uses:

- CI checker for the family independence and each finite \(F\) clause
- `MarkovOracles.determinism.lemma(...)` to conclude determinism

**Witness**
 `MarkovOracles.zeroOne.kolmogorov.witness(p, s, finiteMarginals, { label })`
 `finiteMarginals` supplies \(\pi_F\) entries to test.

**Tests**

- `law.MarkovZeroOne.spec.ts`
- `law.MarkovZeroOneBorel.spec.ts`

### Hewitt–Savage Zero–One Law

**Law**
 If \(C\) is a causal Markov category, \(X_J\) the Kolmogorov power of \(X\), and \(p : A \to X_J\), \(s : X_J \to T\) deterministic, then:

1. \(p\) displays conditional independence \(\perp_{i\in J} X_i \parallel A\).
2. For every finite permutation \(\sigma : J \to J\), we have \(\hat\sigma \circ p = p\) and \(s \circ \hat\sigma = s\).
    Then the composite \(s \circ p : A \to T\) is deterministic.

**Shape**

```
   A ──p──▶ X_J ──s──▶ T
```

with invariance under finite permutations of \(J\).

**Oracle**
 `MarkovOracles.zeroOne.hewittSavage.check(witness, {tolerance})`

- Internally reuses:
  - `MarkovOracles.zeroOne.kolmogorov.check(...)`
  - `MarkovOracles.determinism.lemma(...)`
  - `MarkovOracles.almostSure.check(...)`

so failures can be traced to sub-lemmas.

**Witness**
 Built via `MarkovOracles.zeroOne.hewittSavage.witness(p, s, finiteMarginals, permutations, {label})`

- Stores the Kolmogorov power, deterministic statistic \(s\), finite marginal projections, and chosen permutation family.

**Tests**

- Finite product families \(X_J\) with toy distributions.
- Check that deterministic statistics are permutation invariant.
- Ensure failures are reported if `s` is replaced by a non-invariant kernel.

### Kolmogorov zero–one law in BorelStoch

> If \(\Omega\) is a standard Borel space with probability measure \(P\) and \((f_i)\) a sequence of
> independent random variables, then any tail event \(T\) has \(P(T) \in \{0,1\}.\)

**Witness Builder:** `buildBorelKolmogorovWitness(omega, coords, product, projF, tail, options)`

**Check:** `MarkovOracles.zeroOne.borel.check(witness)`

**Registry Path:** `zeroOne.borel`

**Interpretation:** determinism of `s ∘ p` encodes `P(T) ∈ {0,1}` for tail events in BorelStoch.

### Hewitt–Savage zero–one law in BorelStoch

> If \(\Omega\) is a standard Borel space with probability measure \(P\) and \((f_i)\) are i.i.d.
> random variables, then any permutation-invariant event \(T\) has \(P(T) \in \{0,1\}.\)

**Witness Builder:**
`buildBorelHewittSavageWitness(omega, coords, product, projF, permutations, indicator, options)`

**Check:** `MarkovOracles.zeroOne.borelHewittSavage.check(witness)`

**Registry Path:** `zeroOne.borelHewittSavage`

**Interpretation:** determinism of `s ∘ p` expresses `P(T) ∈ {0,1}` under finite permutation invariance.

### Top/Vietoris (Kl(H))

- **Kolmogorov products:** Implemented with the discrete helpers
  `makeDiscreteTopSpace` and `makeKolmogorovProductSpace`, which encode
  finite Kolmogorov products together with their cylinder closed sets and
  marginal projections. These feed the Kolmogorov zero–one oracles via the
  factory pair `makeProductPrior`/`makeDeterministicStatistic` in
  `top-vietoris-examples.ts`, and are re-exported through
  `MarkovOracles.top.vietoris.adapters()` for centralized discovery.

- **Constant-function law:** Continuous maps into a Hausdorff space that are
  independent of all finite subsets of the input are necessarily constant.
  Witness builders `buildTopVietorisConstantFunctionWitness` and checkers
  `checkTopVietorisConstantFunction` package this guarantee and are exposed
  via `MarkovOracles.top.vietoris.constantFunction`. This mirrors the
  tail-triviality intuition for topological hyperspaces.

- **Hewitt–Savage zero–one law:** **Not supported.** Kl(H) is not causal.
  As per guidelines, HS oracles remain explicit throwing stubs so the
  limitation is visible at runtime.

- **Examples/tests:** Runnable example 071 exercises the Kolmogorov witness
  adapter, confirms the oracle registry exposes the helpers, and documents
  the Hewitt–Savage limitation. Law tests live in
  `test/laws/top-vietoris.spec.ts` and `test/laws/markov-oracles.top.spec.ts`.

- **Open problem:** Finding an interesting causal Markov category with all
  Kolmogorov products remains open.

**Registry Path:** `top.vietoris`

### Semicartesian infinite tensor products

- **Domain**: Semicartesian symmetric monoidal categories equipped with finite tensor products over every finite subset of an index set.
- **Statement**: The chosen object \(X_J\) together with projections \(\pi_F : X_J \to X_F\) forms a cone compatible with all restriction maps and is universal among such cones.
- **Rationale**: Encodes the universal property underpinning infinite tensor products so that joint states can be reasoned about synthetically.
- **Oracles**: `checkSemicartesianProductCone(product, restrictions)` and `checkSemicartesianUniversalProperty(product, cones, subsets)`.
- **Witness**: `SemicartesianProductWitness` bundling the diagram, projections, and factorization builder; cones supplied via `SemicartesianCone`.
- **Tests**: `law.SemicartesianInfiniteProduct.spec.ts`
- **Examples**: Finite-set cones extending assignments by restriction and deterministic completions that witness uniqueness.
- **Implementation Notes**: Mediator candidates expose uniqueness diagnostics, while subset selections keep the compatibility checks tractable for large index sets.

### CRing⊕ infinite tensors as filtered colimits

- **Domain**: Commutative rings and additive/unit-preserving morphisms viewed inside `CRing_⊕` together with index families of tensor factors.
- **Statement**: The formal sum object generated by finitely supported elementary tensors realises the filtered colimit of the finite tensor diagram; inclusions from finite subsets commute with restrictions and every element is determined by a finite support.
- **Rationale**: Implements Example 3.4 by turning the folklore “finite sums of elementary tensors” description into executable colimit structure on the algebraic side of the paper.
- **Oracles**: `checkFilteredCompatibility(witness, inclusions)` and `checkColimitCoverage(witness, samples)`.
- **Witness**: `defaultFilteredWitness(family)` derived from `TensorFamily` data packages inclusions, restrictions, and support tracking for the filtered diagram.
- **Tests**: `law.CRingPlusInfiniteTensorColimit.spec.ts`
- **Examples**: Tensor families generated from copies of `ℤ` confirm that addition, multiplication, and inclusions respect the filtered system, with samples covering mixed-support sums.
- **Implementation Notes**: Normalisation removes unit-valued factors and merges duplicate elementary tensors so compatibility can be checked symbolically.

### Finite-index reduction for Kolmogorov products

- **Domain**: Projective families in Markov categories endowed with Kolmogorov-consistent marginals and a chosen distribution on the limit carrier.
- **Statement**: When the index set \(J\) is finite, pushing a projective family's measure forward along the universal projection \(\pi_J\) reproduces the canonical finite tensor marginal specified by the family.
- **Rationale**: Confirms that the abstract infinite tensor coincides with the ordinary finite tensor product whenever only finitely many factors are involved.
- **Oracle**: `checkFiniteProductReduction(obj, measure, subset)` → `{ ok, expected, actual }`.
- **Witness**: Uses the family’s marginal distributions together with the supplied limit measure; no additional witness extraction is required.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: Independent Bernoulli product measures whose two-factor pushforwards yield the same \(\mathrm{Bernoulli}^{\otimes 2}\) distribution computed directly from coordinates.
- **Implementation Notes**: Raises whenever the provided measure’s semiring disagrees with the family, keeping cross-semiring reasoning sound.

### Copy/discard compatibility of infinite projections

- **Domain**: Infinite product objects in Markov categories equipped with commutative comonoid (copy/discard) structure.
- **Statement**: For every finite subset \(F \subseteq J\), the projection \(\pi_F\) factors through copy followed by discarding one leg and projecting the other, matching the canonical diagram from Remark 3.3.
- **Rationale**: Demonstrates that the universal projections cooperate with comonoid data, ensuring tail constructions respect the Markov-category copy/discard intuition.
- **Oracle**: `checkCopyDiscardCompatibility(obj, subsets, samples)` → `{ ok, failures }`.
- **Witness**: Diagnostics list offending samples together with direct and copy/discard-composed pushforwards when compatibility fails.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: IID Bernoulli cylinders where every tested section yields identical pushforwards whether projected directly or via copy/discard composition.
- **Implementation Notes**: Works with deterministic copy maps returned by `createInfObj`, but also surfaces violations for bespoke infinite carriers that implement non-standard copy semantics.

### Kolmogorov products via deterministic marginals

- **Domain**: Infinite tensor products in Markov categories whose canonical projections land in finite tensor factors.
- **Statement**: The projections \(\pi_F : X_J \to X_F\) of a Kolmogorov product are deterministic and commute with the copy/discard comonoid, so every tested sample yields a unique finite section and matches the copy–discard factorization.
- **Rationale**: Encodes the Kolmogorov compatibility requirement between infinite tensor products and comonoid structure, distinguishing Kolmogorov products from merely semicartesian cones.
- **Oracle**: `checkKolmogorovProduct(obj, subsets, samples)` → `{ ok, deterministic, copyDiscard, determinismFailures }`.
- **Witness**: Failure reports return the offending subset, sample, and aggregated marginal distribution whenever determinism breaks.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: Independent Bernoulli families satisfy the determinism and copy/discard conditions, whereas modified projective families with randomized projections fail the determinism check while keeping copy/discard data intact.
- **Implementation Notes**: Builds atop `checkCopyDiscardCompatibility`, reusing countability and measurability diagnostics already threaded through infinite product objects.

### Deterministic mediators for Kolmogorov products

- **Domain**: Kolmogorov product objects whose projective families carry positivity metadata and deterministic singleton projections.
- **Statement**: Any deterministic family of component arrows \((f_j)_{j\in F}\) into the coordinates of a Kolmogorov product factors uniquely through the universal deterministic mediator, and any competing mediator agreeing on the chosen coordinates coincides on all tested inputs.
- **Rationale**: Operationalises Proposition 4.3 by providing executable evidence for the categorical product universal property inside the deterministic subcategory, rather than relying on external reasoning.
- **Oracle**: `checkDeterministicProductUniversalProperty(witness, candidate, subset, options)` → `{ ok, components, factorization, mediatorAgreement, mismatches, uniqueness, partitions, … }`.
- **Witness**: Uses `DeterministicKolmogorovProductWitness` to assemble mediators via the projective-family extension; the oracle also records deterministic component checks performed with positivity-aware marginal diagnostics.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: Deterministic coin-flip mediators over independent Bernoulli coordinates certify unique factorisation, while non-deterministic components or perturbed mediators yield counterexamples with explicit cylinder sections.
- **Implementation Notes**: Reports reuse countability, measurability, and positivity metadata so downstream zero–one law tooling can consume the same diagnostics without recomputation.

### FinStoch infinite tensor obstruction

- **Domain**: Families of finite stochastic objects (`Fin`) indexed by a countable set inside the `FinStoch` Markov category.
- **Statement**: When no factor is empty and infinitely many factors have at least two elements, the FinStoch infinite tensor object fails to exist (Example 3.7).
- **Rationale**: Highlights the categorical limitation that prevents building path-space style objects inside FinStoch, motivating richer categories such as `BorelStoch` for infinite products.
- **Oracle**: `analyzeFinStochInfiniteTensor(index, carrier, options)` → `{ status, details, inspected, sampleLimit, exhausted, truncated, emptyFactors, multiValuedFactors, multiValuedCount, countability }`.
- **Witness**: Not required; the oracle samples the enumeration, recording empty factors and multi-valued examples as constructive evidence.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: Alternating singleton and two-point factors trigger a `likelyObstructed` status, while finite index sets and empty factors report the appropriate `ok` or `obstructed` statuses.
- **Implementation Notes**: Sampling is capped (`options.sampleLimit`) to keep diagnostics finite; callers can tighten `options.threshold` to demand more evidence before reporting the Example 3.7 obstruction.

### Kolmogorov extension witnesses for projective families

- **Domain**: Projective families in Markov categories that supply an extension operator turning finite cylinder sections into elements of the limit carrier.
- **Statement**: The Kolmogorov extension measure obtained from any finite subfamily reproduces every tested marginal, providing the “probability measures are consistent families” bijection stated in Remark 3.5.
- **Rationale**: Bridges the semicartesian definition with the probabilistic interpretation by packaging the Kolmogorov extension theorem as an executable universal property.
- **Oracle**: `checkKolmogorovExtensionUniversalProperty(obj, subsets)` → `{ ok, baseSubset, measure, reductions }`.
- **Witness**: Reuses the projective family’s marginals together with its extension adapter; no additional user-supplied witness is required.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: IID Bernoulli product families extend their one- and two-dimensional marginals to a global measure whose projections match the originals.
- **Implementation Notes**: Aggregates subsets into a controlling finite index so the constructed measure only depends on marginals that the caller requests.

### Tail independence for Kolmogorov products

- **Domain**: Kolmogorov product objects equipped with a global measure and deterministic tail-event predicates valued in booleans.
- **Statement**: Every tested tail event is independent from the σ-algebra generated by any chosen finite coordinate subset; concretely \(\mathbb{P}(E \wedge C) = \mathbb{P}(E)\mathbb{P}(C)\) for all sampled cylinder events \(C\).
- **Rationale**: Encodes the classic result that tail σ-algebras are independent of finite marginals, packaging it as an executable diagnostic feeding the zero–one law story.
- **Oracle**: `checkTailSigmaIndependence(obj, measure, tailEvent, subsets)` → `{ ok, tailProbability, subsets }` with per-subset factorizations and counterexamples.
- **Witness**: The oracle tabulates each cylinder section’s probability, the joint mass with the tail event, and the expected product; discrepancies surface explicit independence failures.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Examples**: Independent Bernoulli paths where tail events depending on later coordinates factor from early cylinders, while events tied to the head coordinate violate independence.
- **Implementation Notes**: Reuses countability and measurability metadata threaded through `InfObj`, so diagnostics still report when foundational hypotheses are absent.

### Kolmogorov zero-one law

- **Domain**: Kolmogorov product objects with a chosen measure, deterministic tail predicate, and conditional-independence witnesses relating the product mediator to the tail event.
- **Statement**: When the tail event is independent of every tested finite marginal and the determinism lemma hypotheses hold, the composite \(s \circ p\) becomes deterministic, so the tail event has probability 0 or 1.
- **Rationale**: Encodes the categorical zero–one principle as an executable report combining conditional independence, tail independence, and deterministic mediator diagnostics.
- **Oracle**: `checkKolmogorovZeroOneLaw(witness, options)` → `{ ok, zeroOne, tail, independence, tailConditional, determinism, universal }`.
- **Witness**: `KolmogorovZeroOneLawWitness` packages the deterministic Kolmogorov product, domain comonoid data, determinism-lemma witness, optional conditional-independence witnesses, and the tail predicate.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Implementation Notes**: Aggregates optional deterministic-product data so universal-property checks can be reused when provided.

### Hewitt–Savage zero-one law

- **Domain**: Kolmogorov zero–one witnesses paired with permutation actions exhibiting exchangeability of the chosen measure.
- **Statement**: If the underlying measure is exchangeable for the supplied finite permutations and the Kolmogorov zero–one diagnostics succeed, the tail event remains deterministic, mirroring the classical Hewitt–Savage conclusion.
- **Rationale**: Elevates the Hewitt–Savage zero–one law to an oracle that simultaneously checks exchangeability, permutation invariance of the tail event, and the Kolmogorov zero–one hypotheses.
- **Oracle**: `checkHewittSavageZeroOneLaw(witness, options)` → `{ ok, exchangeability, zeroOne, tail, determinism, … }`.
- **Witness**: `HewittSavageZeroOneLawWitness` extends the Kolmogorov witness with a permutation family, enabling reusable exchangeability diagnostics.
- **Tests**: `law.MarkovInfinite.spec.ts`
- **Implementation Notes**: Reuses the exchangeability witness from `hewittSavageZeroOneWitness` so permutation diagnostics stay consistent across oracles.

### Set-based multivalued morphisms and products

- **Domain**: The SetMult category of sets with multi-valued morphisms equipped with copy/discard structure and indexed products.
- **Statement**: Copy and discard maps satisfy the semicartesian comonoid laws on every sampled object; the cartesian product of a SetMult family projects to each finite coordinate subset; and a SetMult morphism is deterministic precisely when every fibre is singleton.
- **Rationale**: Implements the paper’s Set-based multi-valued morphisms so infinite products and determinism checks are executable alongside the Markov infrastructure.
- **Oracles**: `checkSetMultComonoid(obj)`; `checkSetMultInfiniteProduct(family, assignment, tests)`; `checkSetMultDeterminism(witness)` and the lightweight `checkSetMultDeterministic(witness)`.
- **Ergonomics**: Both `checkSetMultComonoid` and `checkSetMultDeterministic` automatically fall back to the sampled points recorded on their inputs when explicit samples are omitted, making quick smoke tests easier to write.
- **Witness**: `buildSetMultDeterminismWitness(domain, codomain, morphism)` packages finite carriers with their SetMult morphisms for deterministic comparisons.
- **Tests**: `law.SetMult.spec.ts`
- **Examples**: Boolean carriers with copy/discard; deterministic indicator functions; finite Boolean products whose projections recover the original tuple.
- **Implementation Notes**: Determinism reports cross-check SetMult fibres against optional finite Markov kernels, providing explicit counterexamples when supports disagree.

### Sets with total functions

- **Objects:** all sets drawn from our working universe.
- **Morphisms:** total functions between those sets.
- **Identities/Composition:** usual identity maps and function composition.
- **In code:** `set-cat.ts` exposes `SetCat` with `obj`, `id`, `hom`, `compose`, and `isHom` helpers for small carriers.
- **Carrier semantics:** Every `Set` object now stores an explicit `SetCarrierSemantics` witness describing membership, iteration, and equality behaviour. Constructors such as `SetCat.obj`, `SetCat.lazyObj`, and the universal builders (`product`, `coproduct`, `exponential`, power objects, small limits) require or synthesise these semantics via helpers including `createMaterializedSemantics`, `createSubsetSemantics`, and `createSemanticsFromSet`. Downstream tooling (equalizers, pullbacks, small products, the natural numbers object, etc.) consults the registered semantics when checking membership or equality, so infinite carriers and custom equality relations behave predictably.
- **Diagnostics:** Semantics-aware guards power `SetCat.isSetHom`, subset validation, characteristic maps, and the universal property witnesses. Regression suites such as `test/set-lazy-carriers.spec.ts`, `test/set-subobject-classifier.spec.ts`, `test/set-small-products-semantics.spec.ts`, and the natural-numbers/pullback/equalizer semantics specs assert that semantics metadata follows derived carriers.
- **Tests:** `test/set-cat.spec.ts` covers identity construction, composition, and codomain validation failures.

### Set basics via hom-set counts

- **Unique map from ∅:** `set.uniqueFromEmpty.check(set.uniqueFromEmpty.witness(Y))` confirms \(|\operatorname{Hom}(\emptyset, Y)| = 1\) for any sampled finite codomain.
- **Empty-set characterisation:** `set.emptyByHoms.check(set.emptyByHoms.witness(E, samples))` succeeds precisely when \(E\) is empty and no sampled nonempty set admits a morphism into \(E\).
- **Singleton characterisation:** `set.singletonByHoms.check(set.singletonByHoms.witness(S, samples))` verifies that \(S\) has a single point and every sampled domain maps to it uniquely.
- **Graph reminder:** Even identical graphs can correspond to different arrows because `SetHom` retains both domain and codomain; `test/set-laws.spec.ts` walks through the comparison.
- **Registry Path:** `set`

#### Elements as arrows

- Fixing a singleton object \(1\), elements of a set \(A\) correspond bijectively to arrows \(1 \to A\).
- **Oracle:** `set.elementsAsArrows.check(set.elementsAsArrows.witness(A))` compares \(|\operatorname{Hom}(1, A)|\) with \(|A|\) using the chosen singleton.

#### Binary products and coproducts in Set

- **Witness builders:** `set.product.witness(left, right)` and `set.coproduct.witness(left, right)` recover the canonical projections/injections alongside mediating oracles derived from `category-limits-helpers.ts`.
- **Diagnostics:** The product witness exposes `checkComponentwiseCollapse` and `checkNaturality` so skew pairings or precomposition failures surface immediately; the coproduct witness reports violations when mediators fail to recover recorded legs.
- **Fallbacks:** The registry continues to surface `set.cardinality.*` for hom-count characterisations when a problem reduces to empty/singleton reasoning.
- **Tests:** `test/set-oracles.spec.ts` exercises the new witnesses, confirming that compliant mediators succeed while swapped legs or mismatched copairs trigger the expected diagnostics.

#### Exponentials in Set

- **Witness builder:** `set.exponential.witness(base, codomain)` enumerates the function object together with the evaluation arrow and `curry`/`uncurry` mediators that demand explicit product data.
- **Diagnostics:** `checkEvaluationTriangle`, `checkCurryUniqueness`, and `checkUncurryRoundTrip` verify the evaluation composite, uniqueness of transposes, and the curry–uncurry round-trip, surfacing descriptive failures when mediators or domains are mismatched.
- **Tests:** `test/set-exponential.spec.ts` drives the raw `SetCat.exponential` helper, while `test/set-oracles.spec.ts` checks the oracle wrappers and error detection paths.

#### Power sets and Cantor diagonals

- **Witness helpers:** `SetLaws.powerSetEvidence(A)` enumerates every subobject inclusion together with its Ω-valued characteristic map, and `set.powerSet.witness(A)` lifts both the subset carrier and the Ω^A power object into the oracle registry.
- **Cantor theorem diagnostics:** `set.cantorDiagonal.witness(A, f)` materialises the diagonal characteristic map given a candidate family of Ω-valued subsets, and `set.cantorDiagonal.check` confirms the diagonal differs from each image while rejecting witnesses that leave the domain.
- **Cardinality comparisons:** `set.compareCardinalities.witness(left, right)` packages finite cardinal arithmetic into an oracle so recorded counts stay in sync with the carriers.
- **Tests:** `test/set-laws-advanced.spec.ts` exercises the law helpers directly, and `test/set-oracles.spec.ts` covers the oracle-level checks together with failure cases.

#### Concrete categories

- A category is **concrete** when a faithful functor into `Set` exhibits its objects as underlying sets with structure-preserving maps.
- Examples include familiar algebraic categories such as groups or preorders. Categories presented purely up to equivalence need not be concrete.

#### Mega-category of sets

- Our `SetCat` stands for a large ambient universe of sets and functions suitable for the surrounding development.
- Alternative foundations can reuse the same notation by interpreting “Set” as their chosen universe of things and maps.

### Relations on sets

- **Objects:** plain sets.
- **Morphisms:** relations \(R \subseteq A \times B\) treated as finite sets of pairs.
- **Intuition:** relations generalise partial or multi-valued functions; composition chains matching middle elements.
- **In code:** `rel.ts` exposes `Rel<A, B>`, constructors, identities, and `RelCat` helpers for small carriers.
- **Tests:** `test/rel-mat.spec.ts` exercises identity witnesses and relation composition.

### Matrices over the reals

- **Objects:** natural numbers representing finite-dimensional real vector spaces.
- **Morphisms:** real matrices of compatible shape, composed via matrix multiplication.
- **Intuition:** linear algebra packaged as a category with dimensions as objects and matrices as arrows.
- **In code:** `mat.ts` provides identity matrices, multiplication, and `MatCat` helpers with dimension checks.
- **Tests:** `test/rel-mat.spec.ts` multiplies sample matrices and validates identities.

### Graphs and the free category

- **Underlying graph:** `graph.ts` models directed multigraphs with labelled edges. Small categories expose their objects/morphisms as graphs when needed for visualisation.
- **Free category:** `freecat.ts` builds the path category on a graph; morphisms are finite edge sequences with identities as empty paths.
- **Helpers:** `arrows(graph)` lifts edges to length-1 paths, and `pathsFrom(node, maxLen)` enumerates short paths for examples.
- **Tests:** `test/graph-freecat.spec.ts` checks units, composition, and bounded path enumeration.

### Discrete dynamical systems

- **Objects**: pairs \((X, f)\) with \(X\) a set and \(f : X \to X\) an endofunction.
- **Morphisms**: functions \(j : X \to Y\) satisfying \(j \circ f = g \circ j\) between \((X, f)\) and \((Y, g)\).
- **Intuition**: morphisms transport the time evolution of one system into another while preserving the step-by-step dynamics.
- **In code**: `DynSys<X>` captures the carrier and step map, `DynHom<X, Y>` stores commuting maps, and `isDynHom` certifies the commutativity condition against the enumerated carriers.
- **Witness**: `test/dynsys.spec.ts` exercises identities, composition, and non-commuting counterexamples.

### Monoids as one-object categories

- **Objects**: a single point ★.
- **Morphisms**: elements of a monoid \((M, \cdot, e)\) acting as endomorphisms of ★.
- **Composition**: multiplies monoid elements, and the identity arrow corresponds to \(e\).
- **In code**: `MonoidCat(M)` produces the category façade with `hom`, `id`, and `compose` mirroring the monoid operations.
- **Witness**: `test/monoid-cat.spec.ts` checks identities and composition against the underlying monoid.
- **Conversely**: any category with a single object recovers a monoid by taking its endomorphisms with composition as the multiplication.

### Mon, the category of monoids

- **Objects**: monoids \((M, \cdot, e)\).
- **Morphisms**: monoid homomorphisms preserving \(e\) and multiplication.
- **Identities/Composition**: ordinary identity and composition of the underlying functions.
- **In code**: `mon-cat.ts` exposes `MonCat` and `isMonoidHom` for constructing and validating morphisms.
- **Witness**: `test/mon-cat.spec.ts` exercises identities, composition, and failure cases.

### Preorders as thin categories

- A preorder `(P,≤)` determines a category with the elements of `P` as objects and at most one morphism between any pair.
- An arrow `x → y` exists exactly when `x ≤ y`; reflexivity and transitivity provide identities and composition.
- **In code**: `PreorderCat({ elems, le })` constructs the thin category façade. For posets, choose an antisymmetric `le`.
- **Witness**: `test/preorder-cat.spec.ts` exercises arrow existence and transitive composition.
- **Conversely**: every category with at most one arrow between any two objects determines a preorder by declaring `x ≤ y` precisely when an arrow `x → y` exists.

### Discrete and ordinal categories

- **Discrete categories**: given a set of objects, include only identity arrows. `DiscreteCategory.create` in `allTS.ts` realises this construction and underpins the discrete diagram utilities and Kan extension helpers.
- **Ordinal skeletons**: finite ordinals viewed as chains yield the sparsest non-discrete examples (`FinOrd` models them explicitly). Category "1" has a single object and only its identity; category "2" adds one non-identity arrow alongside the two identities; larger ordinals continue the pattern.
- **Empty case**: the empty set produces the initial example of a discrete category—no objects and no arrows—already supported by the discrete helpers.

### Slice and coslice categories

- **Slice `C/X`**: objects are arrows `f : A → X`; morphisms are mediating arrows `h : A → B` satisfying `g ∘ h = f`. Use `makeSlice(base, anchor)` to build the anchored view of a finite category.
- **Coslice `X\C`**: objects are arrows `f : X → A`; morphisms are mediating arrows `h : A → B` with `h ∘ f = g`. Use `makeCoslice(base, anchor)` for the dual “fan-out” perspective.
- **Finite categories**: `finite-cat.ts` defines the `FiniteCategory` interface, capturing explicit object and arrow listings alongside composition and equality checks needed for slicing.
- **Examples**: `examples/slice-coslice-demo.ts` prints the slice and coslice of a toy “tasks anchored to projects” category. `test/slice-cat.spec.ts` validates object enumeration and the commuting-square condition for both constructions.
- **Slice axioms**: `checkSliceCategoryLaws(base, anchor)` traverses every object and mediating arrow produced by `makeSlice` to confirm identity/unit laws and associativity hold on-the-nose. It returns a structured report with offending triples when they fail.
- **Tests**: `test/slice-laws.spec.ts` exercises the checker on the task/user/project example and a deliberately corrupted base composition to show failures are detected.

#### Strict slice and coslice arrows

- Use `makeSliceTripleArrow` / `makeCosliceTripleArrow` when you need the commuting triangles explicitly. They carry the mediating map together with both anchor legs so diagnostics can quote the precise witnesses that make the triangles commute.
- `composeSliceTripleArrows` and `composeCosliceTripleArrows` validate pasted triangles before returning a result, preventing silent failures in complex constructions. `sliceArrowToTriple` and `cosliceArrowToTriple` upgrade the thin encodings from `makeSlice`/`makeCoslice` when witnesses are required.
- `test/slice-triple.spec.ts` and `test/coslice-triple.spec.ts` check the identity/composition behaviour and the thin/triple round-trips on the running task/user/project example.

#### Coslice precomposition and pushout reindexing

- `makeCoslicePrecomposition(base, h, X, Z)` implements the always-defined functor \(h^{\ast} : Z\backslash C \to X\backslash C\) by precomposing coslice legs with `h : X → Z`.
- `makeFinitePushoutCalculator` now matches the pullback searcher feature-for-feature: it enumerates every commuting cocone over a cospan, certifies universal mediators exist and are unique, and only returns pushouts that satisfy the terminality check. `test/laws/law.PushoutUniversalProperty.spec.ts` exercises the FinSet fixture, confirms mediators are exposed, rejects merely commuting wedges, and demonstrates that removing a comparison arrow causes the search to fail. The suite also drives `coinduce` through the success case together with no-mediator and duplicate-mediator failures so uniqueness is enforced explicitly.
- `factorPushoutCocone(base, target, cocone)` surfaces the same mediator search directly so clients can witness the universal property on demand. The law suite above calls it to recover the comparison map between the canonical pushout and an alternate commuting wedge.
- `makeCosliceReindexingFunctor(base, calculator, h, X, Z)` uses pushouts to form the dual reindexing functor \(h_! : X\backslash C \to Z\backslash C\). The helper transports both objects and arrows and relies on `coinduce` for the universal mediating square.
- `test/coslice-reindexing.spec.ts` demonstrates both constructions on the toy category, verifies the functorial laws, and shows that failures surface with informative error messages.

### Reindexing slices along pullbacks

- Requires pullbacks in the ambient category. Supply them with `makeFinitePullbackCalculator(base)` or a custom `PullbackCalculator` implementation.
- `makeReindexingFunctor(base, calculator, h, X, Z)` reindexes the slice over `Z` along `h : X → Z` by taking pullbacks on objects and mediating maps. The helper returns object and arrow actions directly.
- `makeFinitePullbackCalculator` now certifies the universal property: it enumerates every commuting cone on the specified corner, factors each through the candidate via `factorPullbackCone`, and only returns a witness when the apex is terminal among them. `test/laws/law.PullbackFinite.spec.ts` covers both a genuine pullback and a commutative square that fails the terminal-cone requirement, so missing pullbacks are detected. The dedicated universal-property suite (`test/laws/law.PullbackUniversalProperty.spec.ts`) reuses the same finite fixtures to demonstrate factoring success, the surfaced `factorCone` helper, and the rejection of merely commuting squares.
- `factorPullbackCone(base, target, cone)` exposes the terminality check directly so other routines can surface the unique mediator when it exists. The helper powers `makeFinitePullbackCalculator.factorCone` and features prominently in `test/laws/law.PullbackUniversalProperty.spec.ts`, which exercises both positive witnesses and negative cases where mediators are absent or non-unique.
- `makeFinitePullbackCalculator.comparison(f, h, left, right)` synthesises the unique mediating arrows between two pullback witnesses of the same span, cross-checks them against the factoring oracle in both directions, and confirms they are inverse isomorphisms. `test/laws/law.PullbackComparison.spec.ts` exercises the helper on matching pullbacks, rejects mismatched spans, and demonstrates failure when mediators are not unique so pullbacks are certified unique up to unique iso.
- `makeFinitePullbackCalculator.induce(j, pullbackOfF, pullbackOfG)` now gathers every arrow that could mediate between the supplied cones, signalling failure when none satisfy the equations or when more than one survives. `test/pullback-induce.spec.ts` regresses the success path alongside the empty and duplicated mediator cases so reindexing witnesses capture uniqueness explicitly.
- `productFromPullbacks({ category, eq, calculator, terminalObj, leftObj, rightObj, ... })` reconstructs binary products from a pullback calculator by pulling back the terminal legs and exposing the tuple mediator. `test/laws/law.ProductFromPullback.spec.ts` demonstrates the construction on a hand-built finite category and confirms it rejects spans whose terminal legs lack a pullback.
- `makeFinitePullbackCalculator.certify(f, h, candidate)` checks a supplied cone against all enumerated competitors, returning explicit reasons when the legs land in the wrong objects or fail to factor uniquely. When successful it also surfaces the mediating arrow for every competing cone, so callers can reuse the universal property directly. `test/laws/law.PullbackFinite.spec.ts` exercises the positive and negative paths so callers can reuse known witnesses (such as product projections) without re-running the brute-force search, while `test/laws/law.PullbackUniversalProperty.spec.ts` captures the mediator extraction explicitly.
- `equalizerFromPullback({ category, eq, calculator, products, left, right })` builds the standard pullback square \(X \xrightarrow{\langle f,g \rangle} Y\times Y \xleftarrow{\Delta} Y\), returning the equaliser inclusion and a factoring oracle. The helper piggybacks on the calculator’s mediator search, and `test/laws/law.FinSetEqualizerPullback.spec.ts` exercises it on finite sets via the dedicated wrapper described below.
- `finsetEqualizerAsPullback(f, g)` reconstructs the finite-set equalizer as the pullback of \(\langle f, g \rangle\) against the diagonal computed from the upgraded product mediators, providing a factoring oracle that witnesses the universal property. `test/laws/law.FinSetEqualizerPullback.spec.ts` verifies that the pullback carrier and inclusion match `FinSet.equalizer`, rejects non-equalising cones, and extracts the comparison isomorphisms demanded by Theorem 89.
- `pullbackPreservesIso({ category, eq, calculator, span, pullback, iso, side })` uses the certified universal property to exhibit the induced mediator that proves base change preserves isomorphisms. `test/laws/law.PullbackMonoIso.spec.ts` constructs FinSet fixtures where either span leg is invertible, recovers the inverse mediators, and rejects attempts to witness the wrong leg.
- `CategoryLimits.limitFromProductsAndEqualizers({ base, products, diagram, factorEqualizer })` packages Theorem 96 for arbitrary finite diagrams: it forms the total product of the diagram objects, equalises the induced legs into the arrow product, and returns the canonical cone alongside a factoring oracle built from the supplied equalizer witness. The span-specific wrapper `makePullbackFromProductsAndEqualizers(category, f, h)` recovers the familiar pullback square, while `finsetLimitFromProductsAndEqualizers(diagram)` and `makeFinSetPullbackCalculator()` specialise the construction to `FinSet`, certifying mediators with `finsetFactorThroughEqualizer`. `test/laws/law.FinSetPullbackFromEqualizer.spec.ts` exercises the executable theorem by checking that the triple-product equalizer commutes, compatible cones factor uniquely, and skew forks are rejected with informative reasons.
- `CategoryLimits.smallLimitFromProductsAndEqualizers({ base, products, diagram, factorEqualizer, guard })` lifts Theorem 101 to small (potentially infinite) diagrams by accepting small-family witnesses for objects and arrows, materialising the required products via `HasSmallProductMediators`, and delegating mediator construction to the supplied equalizer factorizer. The reusable Set-based witnesses now live in `set-small-limits.ts`, exposing `SetSmallProducts`, `SetSmallEqualizers`, `factorThroughSetEqualizer`, and the composed `SetLimitBase` facade. `test/laws/law.SetSmallLimits.spec.ts` validates the construction against `SetCat`: it checks that the canonical cone over a span commutes, that commuting forks factor uniquely through the pullback equalizer, that skew cones are rejected, and that the optional `guard` correctly reports when an infinite index set exceeds the configured bound.
- `CategoryLimits.makeEqualizersFromPullbacks({ base, terminal, products, pullbacks })` realises the variant completeness Theorem 98: it pulls back the arrow pairing \(\langle f,g \rangle\) against the diagonal to manufacture equalizers from terminal objects and pullbacks, caching the canonical inclusion so the pullback calculator certifies mediators on demand. `FinSetEqualizersFromPullbacks` wires the construction to the finite-set calculator and product tuples, while `test/laws/law.EqualizerFromPullback.spec.ts` confirms the derived witnesses coincide with the subset equalizer, reuse `finsetFactorThroughEqualizer`’s mediator, and reject forks that fail the equalising equations.
- `pullbackPreservesMono({ category, eq, calculator, span, pullback, monomorphism, side })` and `monoByPullbackSquare({ category, calculator, products, arrow })` operationalise Theorems 91–92: the first upgrades a monic leg to a cancellable pullback projection using the factoring oracle, while the second recognises monomorphisms precisely when the canonical square against \(\langle f,f \rangle\) is a pullback. `test/laws/law.PullbackMonoIso.spec.ts` exercises both witnesses in FinSet, confirming successful cancellations, surfacing informative failure reasons, and detecting non-monic arrows via the diagonal square.
- `verifyPullbackLemma({ mode, category, eq, calculator, ... })` composes adjacent pullback squares into the outer pullback rectangle and completes missing corners of the diagram, returning the unique mediator produced by factoring cones through each square. `test/laws/law.PullbackLemma.spec.ts` builds concrete FinSet fixtures to validate both directions of Theorem 93 and rejects commuting squares whose mediators are absent.
- `makeFinitePullbackCalculator.transportPullback(f, h, source, iso, candidate)` transports pullback witnesses along an apex isomorphism, checking span commutativity and reusing the bidirectional mediator search to confirm the universal property survives the comparison. `test/laws/law.PullbackTransport.spec.ts` links two FinSet pullbacks with an explicit bijection, validates the transported square, and rejects isomorphisms that break the commuting requirement.
- `checkReindexIdentityLaw` and `checkReindexCompositionLaw` offer quick sanity checks on finite samples, and `sampleSlice` gathers representative objects and arrows from `makeSlice`.
- `test/reindexing.spec.ts` demonstrates the construction on a finite toy category and verifies the on-the-nose identity and composition laws.

### Preord, the category of preorders

- **Objects**: preordered collections `(P,≤)`.
- **Morphisms**: monotone maps preserving the preorder relation.
- **Identities/Composition**: ordinary identity and composition of functions; monotone maps compose.
- **In code**: `preord-cat.ts` defines `PreordCat` and `isMonotone` to build and certify monotone morphisms.
- **Witness**: `test/preord-cat.spec.ts` validates accepted morphisms and rejects non-monotone maps.

### Relations and the empty zero object

- **Domain**: `RelCat` on finite carriers realised as arrays of strings.
- **Statement**: The empty relation mediates both the initial and terminal universal properties—`initialRelation` and `terminalRelation` coincide with `emptyRelation`, and any composite through the empty set collapses to it.
- **Rationale**: Captures Awodey’s observation that `Rel` has a zero object at `∅`, making the “only relation is empty” argument executable.
- **Oracles**: `test/laws/law.RelZeroObject.spec.ts` compares canonical witnesses with arbitrary constructions and inspects composites through the zero object.
- **Witness Builder**: `RelCat.hom([], target, [])` / `RelCat.hom(source, [], [])` provide the concrete empty relations used in the checks.

### Finite posets: initial and terminal objects

- **Domain**: `FinPosCat` instances equipped with the designated empty and singleton posets.
  - **Statement**: The empty poset is initial—every monotone map out of it coincides with `FinPos.initialArrow`—and the singleton is terminal—every map into it agrees with `FinPos.terminate`; its unique global element matches the identity on `1`.
  - **Law**: `FinPos.checkTerminalArrowUniqueness` mechanises Theorem 29 by collapsing any `FinPos` arrow into the singleton target to the canonical `FinPos.terminateAt` witness while reporting mismatches when the codomain is not terminal.
  - **Supplement**: `FinPos.checkTerminalElementTransport` confirms that any element picked out by a singleton `1'` matches the canonical global element of `1` by transporting along the unique terminal isomorphism.
  - **Separator**: `FinPos.checkPointSeparation` operationalises the well-pointedness criterion by producing a concrete global element that distinguishes any pair of parallel monotone maps with different behaviour.
  - **Rationale**: Operationalises the textbook characterisation of finite posets via the newly exposed `FinPos.zero()`, `FinPos.initialArrow`, and `FinPos.terminate` helpers.
  - **Oracles**: `test/laws/law.FinPosInitialTerminal.spec.ts` compares canonical witnesses against arbitrary monotone maps and inspects the global-element enumerator, `test/laws/law.TerminalArrowUniqueness.spec.ts` checks that every collapse into `1` factors through the canonical witness, `test/laws/law.TerminalElementTransport.spec.ts` ensures elements defined via alternative terminals coincide with the canonical point, and `test/laws/law.WellPointedness.spec.ts` finds separating points for distinct monotone pairs while confirming that identical arrows are indistinguishable.
  - **Witness Builder**: `FinPosCat([...objects, FinPos.zero(), FinPos.one()])` ensures both extremal objects participate in the category fixture.
  - **Generalized Elements**: `FinPos.generalizedElements(shape, target)` enumerates every monotone map from a shape into a target poset, powering separation analyses that require richer probes than terminal points.

### Finite posets: exponential objects

- **Domain**: `FinPosCat` fixtures extended with the product and exponential carriers returned by `category.product(A, B)` and `category.exponential(B, C)`.
- **Statement**: `FinPos.exponential` enumerates the monotone maps `B → C`, orders them pointwise, and packages the evaluation arrow together with a currying helper so every monotone arrow `A × B → C` factors uniquely through the function object while `FinPos.exponentialComparison` produces the unique isomorphism between any two such witnesses.
- **Rationale**: Executes Definition 71 for finite posets, promoting the abstract exponential construction to concrete witnesses that integrate with the category registry.
- **Oracles**: `test/laws/law.FinPosExponential.spec.ts` certifies the pointwise order, confirms the evaluation arrow is monotone, checks that each `A × B → C` arrow factors uniquely via the executable currying witness, and verifies that alternative exponential witnesses are forced to be uniquely isomorphic.
- **Witness Builder**: `category.exponential(B.name, C.name)` registers `C^B`, its evaluation arrow, and the currying helper, while `category.product(A.name, B.name)` supplies the domain product for the universal property checks.
- **Comparison Helper**: `FinPos.exponentialComparison(B, C, left, right)` factors the two evaluation arrows through each other, validates the induced mediators, and confirms they collapse to identities so the “terminal object in C_{E(B,C)}” story stays executable.

### M₂: exponential objects

- **Domain**: Idempotent-set objects built with `makeM2Object`, their binary products from `productM2`, and morphisms constructed via `makeM2Morphism`.
- **Statement**: `makeM2Exponential({ base, codomain })` enumerates the equivariant maps `B → C`, forms the induced idempotent on the function object, and equips the exponential with its evaluation morphism and currying helper (exposed both as `witness.curry` and via `curryM2Exponential`) so every arrow `A × B → C` factors uniquely, while `m2ExponentialComparison({ base, codomain, left, right })` produces the unique mediators between any two exponential witnesses and confirms they round-trip to the identities.
- **Rationale**: Extends the `M₂` toolkit with the exponential structure highlighted in the excerpt, promoting equivariant function objects to executable witnesses of the universal property.
- **Oracles**: `test/m2-set.spec.ts` exercises the exponential builder by confirming the evaluation morphism is equivariant, demonstrating successful currying via both the intrinsic helper and `curryM2Exponential`, detecting non-equivariant attempts, and verifying the uniqueness of the mediator. `test/laws/law.M2Exponential.spec.ts` layers on the comparison helper, checking that matching witnesses yield inverse mediators, mismatched data are rejected, non-equivariant mediators trigger failures, and evaluation factorizations remain observable.
- **Witness Builder**: `makeM2Exponential({ base, codomain })` returns the function object, its product with `B`, the evaluation arrow, and a currying helper that accepts any witnessed product `productM2({ left: A, right: B })` and arrow `A × B → C`; the standalone `curryM2Exponential` wrapper delegates to that helper for ergonomic reuse.
- **Comparison Helper**: `m2ExponentialComparison({ base, codomain, left, right })` checks the shared data, curries each evaluation through the other witness, verifies the resulting mediators are equivariant, and confirms both composites collapse to the identities so the “terminal object in 𝒞_{E(B,C)}” story stays executable for `M₂`.

### Terminal separators and well-pointedness

- **Toolkit**: `traits/well-pointedness.ts` generalises the terminal-point separator analysis to any finite category that exposes a
  terminal object and enumerates global elements.
  - `checkPointSeparator(category, f, g)` reproduces the separator oracle for arbitrary categories by composing each sampled
    pair of parallel arrows with every terminal point of their shared domain, returning a distinguishing witness whenever one exists
    and classifying the precise failure mode when it does not.
  - `checkWellPointedness(category, pairs)` batches those analyses, summarising separating witnesses, terminal-point shortages, and
    indistinguishable pairs so fixtures can confirm well-pointedness across a supplied test set.
- **Oracles**: `test/traits/well-pointedness.spec.ts` exercises both helpers on finite sets and on synthetic categories that lack
  global elements, ensuring the toolkit reports successes, indistinguishable samples, and failures in a structured fashion.

### Generalized elements and separation

- **Toolkit**: `traits/generalized-elements.ts` elevates Theorem 32 into code by scanning generalized elements across supplied shapes and returning explicit witnesses when two parallel arrows act differently.
  - `checkGeneralizedElementSeparation(category, f, g, { shapes })` composes each candidate with every available generalized element of its domain, classifying domain/codomain mismatches, barren shapes, indistinguishable pairs, and genuine separating witnesses with structured diagnostics.
- **Oracles**: `test/traits/generalized-elements.spec.ts` exercises the toolkit on finite posets, confirming the discovery of separating shape witnesses, the inability of the initial shape to distinguish non-identical arrows, and the reporting of barren shapes that cannot map into the probed domain.
- **Law**: `test/laws/law.GeneralizedElementSeparation.spec.ts` demonstrates Awodey’s generalized-element criterion by exhibiting separating witnesses for divergent monotone maps and recording indistinguishable pairs when every generalized element yields matching composites.

### Preorder extremal-element diagnostics

- **Domain**: Small preorders realised with `Preorder<{ elems, le }>`.
- **Statement**: `analyzeLeastElement` and `analyzeGreatestElement` scan supplied samples, certifying when an element is least/greatest and returning explicit counterexamples when it fails.
- **Rationale**: Encodes the “bottom/top” reasoning from Awodey’s discussion so ℕ and ℤ examples become executable.
- **Oracles**: `test/laws/law.PreorderInitialTerminal.spec.ts` verifies that 0 witnesses ℕ’s initial object, that no terminal element exists in ℕ thanks to successor witnesses, and that ℤ lacks both extremal elements on every sampled candidate.
- **Witness Builder**: `analyzeLeastElement(preorder, candidate, samples)` / `analyzeGreatestElement(preorder, candidate, samples)` return structured `{ holds, failure }` reports exposing the offending witness when the universal property fails.

### Finite groups and the trivial zero object

- **Domain**: `FinGrpCat` with the automatically registered trivial group.
- **Statement**: `FinGrp.initialArrow` maps the unique element of the trivial group to the identity of any target, while `FinGrp.terminate` collapses any source to the trivial identity—both satisfy the universal properties and exclude non-identity alternatives.
- **Rationale**: Executes the textbook reasoning that the unique one-object group is simultaneously initial and terminal in `Grp`.
- **Oracles**: `test/laws/law.FinGrpZeroObject.spec.ts` validates the canonical witnesses, confirms the trivial object’s presence in the category, and rejects maps that fail to preserve identities.
- **Witness Builder**: `FinGrpCat([...samples])` automatically adds the trivial object; `FinGrp.initialArrow(target)` / `FinGrp.terminate(source)` expose the unique morphisms.

### Initial and terminal uniqueness up to unique isomorphism

- **Domain**: `FinPosCat` fixtures containing both the canonical empty/singleton posets and alternative candidates with matching carriers.
- **Statement**: `FinPos.initialArrowFrom` and `FinPos.terminateAt` produce mutually inverse mediators between any two choices of empty or singleton posets, and every competing monotone map coincides with them, realising Awodey’s “unique up to unique isomorphism” theorem.
- **Rationale**: Encodes Theorem 27 so that equality of arrows out of `0` and into `1` enforces the isomorphism between competing extremal objects inside the executable poset category.
- **Oracles**: `test/laws/law.InitialTerminalUniqueness.spec.ts` composes the candidate maps and checks they reduce to the relevant identities while rejecting attempts to fabricate alternative isomorphisms.
- **Witness Builder**: `FinPos.initialArrowFrom(initial, target)` / `FinPos.terminateAt(source, terminal)` specialise the universal arrows to arbitrary empty/singleton representatives.

### Null objects in finite groups

- **Domain**: `FinGrpCat` instantiated with the canonical trivial group plus any alternative one-element group.
- **Statement**: `FinGrp.initialArrowFrom` and `FinGrp.terminateAt` witness that every null object—both initial and terminal—collapses to and expands from the trivial group via a unique isomorphism; they also force every map to or from such a candidate to factor through the canonical constant arrows.
- **Rationale**: Operationalises Definition 39 by turning “null object” into an executable invariant: the trivial group mediates all maps to/from any other one-object group, and the composites necessarily equal the identity.
- **Oracles**: `test/laws/law.NullObject.spec.ts` checks the canonical trivial group’s extremal behaviour, composes the arrows between competing null objects, and confirms their uniqueness.
- **Witness Builder**: `FinGrp.initialArrowFrom(candidate, target)` and `FinGrp.terminateAt(source, candidate)` construct the canonical homomorphisms needed for the null-object certification.

### Finite-group direct products

- **Domain**: `FinGrpCat` supplied with sample finite groups alongside the direct-product carrier returned by `FinGrp.product(left, right)`.
- **Statement**: `FinGrp.product` enumerates the cartesian carrier, exposes the canonical projections, and supplies `pair(domain, f, g)` so every pair of compatible homomorphisms collapses to the unique mediator demanded by the universal property; it also provides `componentwise(target, [f, g])` to synthesise the product map `f × g`, `swap()` for the symmetry isomorphism `⟨π₂, π₁⟩`, `diagonal()` for the canonical map `⟨id, id⟩`, and `leftUnit()` / `rightUnit()` so products with the trivial factor collapse back to the non-terminal leg, while any leg that fails to preserve the group law is rejected and the projections into the trivial factor are certified as non-isomorphisms. The witness integrates with `CategoryLimits.checkBinaryProductComponentwiseCollapse`, `CategoryLimits.checkBinaryProductSwapCompatibility`, and `CategoryLimits.checkBinaryProductNaturality`, ensuring `(f × g) ∘ ⟨j, k⟩` matches `⟨f ∘ j, g ∘ k⟩`, swap symmetry commutes with componentwise arrows, and precomposition of mediating homomorphisms agrees with the canonical pairing.
- **Rationale**: Executes the textbook construction of `G × H` so the Awodey product examples become runnable—coordinatewise multiplication and inversion are implemented directly and stitched into our universal-property checker.
- **Oracles**: `test/laws/law.FinGrpProduct.spec.ts` confirms the projections are homomorphisms, composes them with the canonical pairing to recover the supplied legs, checks the swap isomorphism collapses back to the identity, verifies the diagonal composes to both identities and matches the pairing of identity legs, uses `checkProductUP` to certify uniqueness while rejecting a deliberately collapsed leg, exercises the new unit witnesses to show `1×G ≅ G ≅ G×1` whereas the projections into the trivial factor fail the `isIso` test (demonstrating that \(0 × G \ncong 0\)), and now drives `CategoryLimits.checkBinaryProductComponentwiseCollapse`, `CategoryLimits.checkBinaryProductSwapCompatibility`, and `CategoryLimits.checkBinaryProductNaturality` to prove componentwise mediators collapse correctly, swap symmetry commutes with componentwise arrows, and precomposition agrees with the canonical pairing while perturbed data triggers the expected failures.

### Finite-set cartesian closure

- **Domain**: Finite-set objects produced by `makeFinSetObj(...)` and arrows assembled with the cartesian-closed witness `FinSetCCC`, pairing legs via `binaryProduct`, collapsing to the singleton through `terminal.terminate`, and routing function spaces through `exponential`.
- **Statement**: `FinSetCCC.binaryProduct` packages the canonical projections and mediator builder so the right and left unit composites `π₁ ∘ ⟨id, !⟩` and `π₂ ∘ ⟨!, id⟩` reduce to the corresponding identities/terminal arrows, while `FinSetCCC.exponential` exposes evaluation together with `curry`/`uncurry` mediators whose composites recover any `h : X × A → B` and reproduce the supplied transpose `λh : X → B^A`.
- **Rationale**: Links the reusable product/exponential helpers into an explicit cartesian-closed witness for `FinSet`, making the universal properties executable rather than relying on hand-waved tuple reasoning.
- **Oracles**: `test/laws/law.FinSetCCC.spec.ts` proves the unit laws for products with `1`, demonstrates that evaluation composed with the canonical pairing reproduces `h`, and confirms that curry/uncurry form inverse bijections on transposes.
- **Witness Builder**: `FinSetCCC` (re-exported via `src/all/triangulated.ts`) surfaces `{ terminal, binaryProduct, exponential }`, while `FinSet.compose` and `FinSet.id` support the comparison checks in the law suite.

### Finite-set strict initial products

- **Domain**: Finite-set objects created with `makeFinSetObj(...)`, the canonical initial object `FinSet.initialObj`, and the product witness returned by `FinSet.product([_, FinSet.initialObj])` or its left-handed variant.
- **Statement**: `finsetProductInitialIso` and `finsetInitialProductIso` now synthesise mutually inverse maps between \(A×0\) (or \(0×A\)) and `0` via `finsetBijection`/`finsetInverse`, explicitly checking that both composites reduce to the appropriate identities and that the product projections factor through the unique arrow into the initial object.
- **Rationale**: Certifies that `0` is a strict initial object in `FinSet`: pairing with it collapses to `0`, and every arrow landing in `0` is forced to be injective—hence monic—by the helper’s internal verification.
- **Oracles**: `test/laws/law.FinSetInitialProduct.spec.ts` composes the extracted mediators to observe both identities, confirms the projections factor through `FinSet.initialArrow`, and applies `isMono(FinSet, …)` to show that every realised map into `0` is a monomorphism.

### Finite-set equalizer schemes

- **Domain**: Parallel finite-set arrows `f, g : X → Y` together with the inclusion `e : E → X` returned by `FinSet.equalizer(f, g)` and commuting forks into `X`.
- **Statement**: `finsetFactorThroughEqualizer` validates that a fork `h : W → X` commutes with `f` and `g`, confirms its image lies in the equalizing subset recorded by `e`, and synthesises the unique mediator `m : W → E` satisfying `e ∘ m = h`. `finsetEqualizerComparison` factors any two equalizer inclusions for the same pair through each other, extracting the comparison isomorphism whose composites reduce to the respective identities.
- **Oracles**: `test/laws/law.FinSetEqualizer.spec.ts` factors a compliant fork, rejects a non-commuting fork and one that lands outside the recorded subset, and demonstrates that parallel equalizer witnesses yield inverse mediators.
- **Witness Builder**: `finsetFactorThroughEqualizer` and `finsetEqualizerComparison` in `finset-equalizers.ts`.

### Diagram-compatible cone and cocone validators

- **Domain**: Arbitrary finite families in any category supplied to the `CategoryLimits` helpers, together with cones and cocones that record the source diagram’s arrows.
- **Statement**: `CategoryLimits.coneRespectsDiagram` and `CategoryLimits.coconeRespectsDiagram` scan every leg against the recorded diagram arrows, and `CategoryLimits.isProductForCone` / `CategoryLimits.isCoproductForCocone` now refuse to certify universal properties unless those commutativity checks succeed—preventing cones with non-commuting legs from masquerading as valid witnesses even when the projection triangles hold. The universal-property predicates also inspect the leg domains and codomains via `ArrowFamilies.dom`/`cod`, short-circuiting when a purported leg fails to start at the tip or land in the advertised diagram object. This enforces the commuting-triangle requirement highlighted in Definition 78: each leg must emanate from the apex and land in the functor-assigned object before mediators are minted. The dedicated helpers `validateConeAgainstDiagram` / `validateCoconeAgainstDiagram` surface these diagnostics directly, while `extendConeToClosure` / `extendCoconeToClosure` reuse the finite-diagram closure builder so cones that respect the generating arrows remain valid after adjoining every composite arrow.
- **Oracles**: `test/mediators-generic.spec.ts` exercises the new guards on Vect by exhibiting cones and cocones whose triangles commute but whose legs violate the diagram; `productMediates`/`coproductMediates` still accept the fabricated mediators, yet the strengthened universal-property checks reject them while continuing to validate genuinely compatible data. The same suite now drives closure-aware checks, confirming that compatible cones survive the saturated diagram while malformed ones are rejected with the commuting-leg diagnostics.
- **Statement**: `CategoryLimits.makeConeCategory` materialises the finite cone category for any indexed family by enumerating compatible leg choices, exposes cone morphisms as mediators that commute with every leg, and `CategoryLimits.checkTerminalCone` verifies terminality by recovering the unique comparison map from each cone. `CategoryLimits.isProductForCone` now consults these witnesses whenever the ambient category is finite, aligning the executable proof with the “limits are terminal cones” story.
- **Oracles**: `test/laws/law.ConeCategory.spec.ts` builds explicit cone categories for products, equalizers, and pullbacks in a finite `FinSet` universe, confirms the canonical cones are terminal via extracted mediators, shows the strengthened `isProductForCone` verdict agrees with the cone-category analysis, and rejects diagrams that reference indices outside the advertised carrier.
- **Statement**: `CategoryLimits.makeFiniteDiagram`, `CategoryLimits.finiteDiagramFromDiscrete`, and `CategoryLimits.finiteDiagramFromPoset` lift our discrete/poset diagram helpers into genuine functors on arbitrary finite categories, while `CategoryLimits.checkFiniteDiagramFunctoriality` verifies identity/co-domain data and composition laws and `CategoryLimits.composeFiniteDiagramPath` synthesises composites along explicit shape paths—ensuring parallel or repeated arrows are tracked distinctly when building cones or mediators.
- **Oracles**: `test/laws/law.FiniteDiagram.spec.ts` instantiates a span with two parallel arrows, confirms the functoriality checks succeed on the legitimate diagram and fail with malformed identities, exercises the path-composition helper on identity/edge combinations, demonstrates that the strengthened cone validator distinguishes equalising and non-equalising legs, and shows `CategoryLimits.makeConeCategory` both locates the genuine cone and rejects mismatched object assignments.
- **Statement**: `CategoryLimits.limitOfDiagram` realises finite limits by assembling the canonical cone from the product of objects and equalising legs indexed by every diagram arrow, then reuses the cone-category mediators to expose the unique factor from any compatible cone. Empty diagrams recover the terminal object, discrete pairs collapse to binary products, and parallel pairs factor through the equalizer witnesses advertised by Definition 79.
- **Oracles**: `test/laws/law.CategoryLimitsFiniteLimit.spec.ts` certifies the terminal case by factoring points into `1`, rebuilds product mediators for discrete diagrams, shows that equalizer cones factor through the constructed limit while non-commuting legs are rejected, and exercises the failure reasons when leg codomains miss the advertised diagram objects.
- **Statement**: `CategoryLimits.isProductForCone` and `CategoryLimits.isCoproductForCocone` now surface the synthesised mediators alongside their triangle and uniqueness verdicts and record how any supplied competitor compares (do its triangles commute, do the projections/injections agree, and is it literally the same arrow), while `CategoryLimits.factorConeThroughProduct` and `CategoryLimits.factorCoconeThroughCoproduct` hand back the mediating arrows (or descriptive failure reasons) so cone morphisms in `Cone(D)` and `CoCone(D)` become executable witnesses for Definition 80 / Theorem 83.
- **Oracles**: `test/laws/law.CategoryLimitsCone.spec.ts` factors concrete Vect cones and cocones through their products and coproducts, confirms the returned mediators collapse the supplied legs and agree with the universal-property comparison checks, and rejects malformed legs that mis-state their domains or codomains.
- **Statement**: `CategoryLimits.arrowFromCone` / `CategoryLimits.coneFromArrow` and their coproduct duals implement the Theorem 84 bijection between mediating arrows and cones with a fixed vertex, caching compositions so every `C → L` arrow recovers the matching cone and vice versa while flagging mismatched domains, codomains, or diagram data.
- **Oracles**: `test/mediators-generic.spec.ts` lifts Vect cones into mediating arrows, rebuilds the original legs from those arrows, confirms the round-trip in both directions, and rejects arrows aimed at the wrong product or coproduct objects.
- **Statement**: `CategoryLimits.makeCoconeCategory` mirrors the cone construction for coproduct diagrams by enumerating every commuting cocone, indexing cocone morphisms as mediators that post-compose the legs, and `CategoryLimits.checkInitialCocone` certifies initiality by extracting the unique comparison arrow into each cocone. The builders reuse the strengthened diagram validation so malformed legs are rejected before mediators are minted.
- **Oracles**: `test/laws/law.CategoryLimitsColimit.spec.ts` materialises cocone categories for the empty diagram, binary coproducts, and a parallel-pair diagram in a finite `FinSet` universe, confirms the canonical witnesses are initial via the recovered mediators, reconstructs expected comparison maps against hand-built cocones, and observes that non-commuting legs fail validation and remain absent from the cocone category.

### Finite-monoid equalizer schemes

- **Domain**: Parallel monoid homomorphisms `f, g : M → N`, the inclusion `e : E → M` returned by `monoidEqualizer(f, g)`, and commuting forks into the shared domain.
- **Statement**: `monoidEqualizer` extracts the equalizing submonoid, ensuring the subset retains the unit and closes under multiplication before exposing the inclusion arrow. `monoidFactorThroughEqualizer` confirms that a fork commutes with the parallel pair, checks its image stays inside the recorded submonoid, and synthesises the unique mediator. `monoidEqualizerComparison` runs the factoring workflow in both directions to surface the promised comparison isomorphisms whose composites reduce to the identities.
- **Oracles**: `test/laws/law.MonEqualizer.spec.ts` exercises successful factoring, rejects non-commuting forks and those that escape the recorded submonoid, and validates that comparison mediators invert each other.
- **Witness Builder**: `monoidEqualizer`, `monoidFactorThroughEqualizer`, and `monoidEqualizerComparison` in `mon-equalizers.ts`.

### Finite-topological equalizer schemes

- **Domain**: Parallel continuous maps `f, g : X → Y` of finite topological spaces, the inclusion `e : E → X` returned by `topEqualizer(f, g)`, and commuting forks into the shared domain.
- **Statement**: `topEqualizer` carves out the equalising subspace via `subspace(eq_X, X, E)` and packages the canonical inclusion. `topFactorThroughEqualizer` verifies that a fork commutes with the parallel pair, ensures every image lands in the recorded subspace, and synthesises the unique mediator whose composite with `e` reproduces the fork. `topEqualizerComparison` factors competing inclusions through each other and confirms the mediators compose to the respective identities.
- **Oracles**: `test/laws/law.TopEqualizer.spec.ts` factors a compliant fork, rejects non-commuting and non-membership forks, and demonstrates that comparison mediators invert one another.
- **Witness Builder**: `topEqualizer`, `topFactorThroughEqualizer`, and `topEqualizerComparison` in `src/top/equalizers.ts`.

### Finite-group kernel equalizer schemes

- **Domain**: Finite-group homomorphisms `f : G → H` together with forks `h : W → G` that commute with the constant-to-identity arrow and land in the kernel of `f`.
- **Statement**: `finGrpKernelEqualizer` enumerates the kernel subset, proves it contains the identity and is closed under multiplication and inversion, and exposes the inclusion equalizing `f` with the constant arrow. `finGrpFactorThroughKernelEqualizer` confirms a fork is a `FinGrp` homomorphism, checks that `f ∘ h` matches the constant map and that every image stays inside the kernel, and produces the unique mediator whose composite with the inclusion recovers `h`. `finGrpKernelEqualizerComparison` factors competing kernel inclusions through one another and verifies the mediators are inverse homomorphisms on both kernels.
- **Oracles**: `test/laws/law.FinGrpEqualizer.spec.ts` factors a commuting fork, rejects non-commuting and non-homomorphic forks, and demonstrates that kernel witnesses yield inverse comparison mediators.
- **Witness Builder**: `finGrpKernelEqualizer`, `finGrpFactorThroughKernelEqualizer`, and `finGrpKernelEqualizerComparison` in `models/fingroup-equalizer.ts`.

### Finite-set quotient schemes

- **Domain**: Finite-set arrows produced by `FinSet.coequalizer(f, g)` together with alternative quotient cocones on the same carrier.
- **Statement**: `finsetFactorThroughQuotient` realises the quotient universal property by producing the unique mediator from a coequalizer `q : Y → Q` to any cocone `h : Y → Z` that is constant on the equivalence classes collapsed by `q`, rejecting candidates that disagree on a class. `finsetQuotientComparison` factors competing quotient schemes through each other to extract the comparison isomorphism promised by Theorems 63–64, confirming that the mediators invert one another and reproduce the supplied projections.
- **Oracles**: `test/laws/law.FinSetQuotient.spec.ts` factors a compliant cocone, rejects a skew one, and demonstrates that two quotient schemes of the same relation yield the canonical comparison bijection.
- **Witness Builder**: `finsetFactorThroughQuotient` and `finsetQuotientComparison` in `finset-quotients.ts`.

### Finite-set pushouts via quotient coproducts

- **Domain**: Finite-set cospans `f : X → A` and `g : X → B` together with wedges `h : A → Z`, `k : B → Z` that agree after precomposition with `f` and `g`.
- **Statement**: `FinSet.pushout(f, g)` quotients the binary coproduct `A ⨿ B` by the smallest relation gluing `in₁(f(x))` to `in₂(g(x))`, returning the injections into the pushout apex. `finsetPushout(f, g)` extends this witness with a factoring oracle that certifies mediators are defined exactly when a wedge is constant on each equivalence class, surfacing informative failures when the universal property is violated.
- **Oracles**: `test/laws/law.FinSetPushout.spec.ts` checks the quotient carriers, factors a compliant wedge, rejects wedges that either land outside the identified classes or fail to commute, and confirms that mediators are unique.
- **Witness Builder**: `FinSet.pushout` in `src/all/triangulated.ts` and `finsetPushout` in `src/all/finset-tools.ts`.
- **Statement**: `FinSetFinitelyCocomplete` packages the finite-set initial object, product/coproduct mediators, quotient pushouts, and coequalizers into a single finite-colimit witness so downstream modules can assume cocompleteness. `test/laws/law.FinSetFiniteColimit.spec.ts` exercises the empty coproduct, binary coproduct factoring oracle, pushout mediators, and coequalizer factoring via `finsetFactorThroughQuotient`, confirming the bundled data realises the expected universal properties.
- **Witness Builder**: `FinSetFinitelyCocomplete` in `src/all/triangulated.ts` together with the tuple/cotuple helpers from `src/all/finset-tools.ts` and the quotient factoring routine in `finset-quotients.ts`.
- **Statement**: `FinSetSubobjectClassifier` advertises the finite-set subobject classifier via the shared trait, reusing the canonical truth object, truth/false arrows, and characteristic/subobject conversions. `test/laws/law.FinSetSubobjectClassifier.spec.ts` now also confirms that `CategoryLimits.buildSubobjectClassifierIso` recovers the comparison isomorphism between permuted truth objects, `CategoryLimits.subobjectClassifierFalseArrow` reconstructs `⊥ : 1 → Ω`, `CategoryLimits.subobjectClassifierNegation` validates the published negation against the false-point characteristic (falling back to the derived arrow when equality data is absent) so complements arise from `¬χ`, and the published truth-product/conjunction witnesses send paired characteristics to their intersections while rejecting malformed tuples.
- **Witness Builder**: `FinSetSubobjectClassifier`, `FinSetTruthValues`, `FinSetTruthArrow`, `FinSetFalseArrow`, `FinSetNegation`, `FinSetTruthProduct`, `FinSetTruthAnd`, `FinSetPowerObject`, `finsetCharacteristic`, `finsetCharacteristicComplement`, `finsetComplementSubobject`, `finsetSubobjectFromCharacteristic`, and `CategoryLimits.buildSubobjectClassifierIso`/`CategoryLimits.subobjectClassifierFalseArrow`/`CategoryLimits.subobjectClassifierNegation` in `src/all/triangulated.ts`, together with `finsetCharacteristicPullback` (exposing `squareCommutes`, `factorCone`, and certification data) in `pullback.ts` and the `CategoryLimits.PowerObjectWitness` surface in `stdlib/category-limits.ts`.
- **Statement**: `FinSetPowerObject(Y)` realises Definition 98 by exponentiating the truth-values object, pulling the evaluation back along the truth point to obtain the membership subobject, and classifying `R ↪ X × Y` via the unique transpose `χ_R : X → Ω^Y`. `test/laws/law.FinSetPowerObject.spec.ts` verifies the membership fibre, the mediator’s truth-table semantics, the reconstructed pullback square, and the universal factorisation rejects malformed relations.
- **Statement**: `finsetMonomorphismEqualizer` exhibits every FinSet monomorphism as the equalizer of its characteristic and the ambient truth composite, while `finsetMonicEpicIso` upgrades bijective arrows to explicit inverses so balancedness follows from the classifier. `test/laws/law.FinSetSubobjectClassifier.spec.ts` checks the canonical factorisations, rejects wedges outside the image, and confirms that bijections yield two-sided inverses derived from the equalizer witness.
- **Witness Builder**: `finsetMonomorphismEqualizer` and `finsetMonicEpicIso` in `src/all/triangulated.ts`.
- **Statement**: `FinSetMonicCategory` instantiates Definition 97’s `Monic(FinSet)` by treating each injective arrow as an object and admitting only those commuting squares that the pullback calculator certifies, so composition and identities automatically satisfy Theorem 117’s universal property. `FinSetTruthTerminal` leverages `finsetCharacteristic` together with the unique termination map to exhibit `FinSetTruthArrow : 1 → Ω` as the terminal object, producing the canonical classifier square for every inclusion and rejecting tampered mediators or characteristics. `test/laws/law.FinSetMonicCategory.spec.ts` exercises the constructor guard, recovers the truth-terminal mediator, and shows that malformed squares fail the domain/codomain or pullback checks.
- **Witness Builder**: `FinSetMonicCategory` and `FinSetTruthTerminal` in `src/all/triangulated.ts`, assembled via `makeMonicCategory` from `monic-category.ts` using `FinSetPullbacksFromEqualizer` to validate morphisms.
- **Statement**: `finsetSubobjectLeq` and `finsetSubobjectPartialOrder` implement Definition 93/Theorem 105 by detecting when one inclusion factors through another and upgrading mutual factorisations into the unique comparison isomorphism. `test/laws/law.FinSetSubobjectClassifier.spec.ts` exercises reflexivity, transitivity, antisymmetry, codomain mismatches, and non-monic failures through these helpers.
- **Witness Builder**: `finsetSubobjectLeq` and `finsetSubobjectPartialOrder` in `src/all/triangulated.ts`, reusing `finsetImageFactorization` and `finsetFactorImageThroughMonomorphism`.
- **Statement**: `finsetIdentitySubobject`, `finsetZeroSubobject`, `finsetTopSubobject`, and `finsetBottomSubobject` certify Theorem 106 by realising the maximal and minimal subobjects of the FinSet order: every inclusion factors through the identity witness while the zero inclusion factors through every subobject. `test/laws/law.FinSetSubobjectOrder.spec.ts` checks preorder reflexivity, transitivity, antisymmetry, confirms the extremal factorisations, and rejects codomain mismatches together with non-monic candidates.
- **Witness Builder**: `finsetIdentitySubobject`, `finsetZeroSubobject`, `finsetTopSubobject`, and `finsetBottomSubobject` in `src/all/triangulated.ts`, delegating to `finsetSubobjectLeq` and `finsetSubobjectPartialOrder` for the factoring oracles.
- **Statement**: `listFinSetSubobjects` enumerates FinSet subobjects up to isomorphism by listing every subset of an ambient carrier together with its canonical inclusion and characteristic map. `test/laws/law.FinSetSubobjectEnumeration.spec.ts` verifies that singleton ambients produce exactly the empty and total subobjects, that permuted monomorphisms collapse to the same canonical entry, and that the counts match hand-computed binomial coefficients for representative finite sets.
- **Witness Builder**: `listFinSetSubobjects` in `src/all/triangulated.ts`, reusing the subset reconstruction helper behind `finsetSubobjectFromCharacteristic` to deliver canonical inclusions and characteristics for each iso class.
- **Statement**: `finsetSubobjectIntersection` computes intersections as the pullback of two monomorphisms, exposes the universal `factorCone` oracle, and `compareFinSetSubobjectIntersections` synthesises the comparison isomorphism demanded by Definition 93/Theorem 108. `test/laws/law.FinSetSubobjectIntersection.spec.ts` now exercises the canonical factoring mediator, rejects wedges that fail the equalizer equations, disallows mismatched codomains or non-monic legs, and confirms that alternate witnesses are uniquely isomorphic.
- **Witness Builder**: `finsetSubobjectIntersection` and `compareFinSetSubobjectIntersections` in `src/all/triangulated.ts`, delegating to the FinSet pullback calculator in `pullback.ts` to certify the universal property.
- **Statement**: `finsetImageFactorization` exposes the canonical epi–mono image factorisation, `finsetFactorImageThroughMonomorphism` mediates that inclusion through any mono containing the image, and `finsetImageComparison` confirms that two image factorizations of the same arrow are uniquely isomorphic by synthesising inverse mediators. `test/laws/law.FinSetImage.spec.ts` exercises canonical and permuted images, extracts the comparison isomorphism, and rejects candidates whose epis miss an image point or whose monos fail injectivity.
- **Witness Builder**: `finsetImageFactorization`, `finsetFactorImageThroughMonomorphism`, and `finsetImageComparison` in `src/all/triangulated.ts`.
- **Statement**: `CategoryLimits.finiteColimitFromCoproductsAndCoequalizers` realises finite-set colimits by sending the diagram object coproduct through the coequalizer of the canonical parallel pair built from diagram arrows. `test/laws/law.FinSetFiniteColimit.spec.ts` exercises the empty diagram, parallel pairs, and span pushouts, confirming that every compatible cocone factors uniquely through the derived witness while mismatched wedges are rejected with informative diagnostics.
- **Witness Builder**: `CategoryLimits.finiteColimitFromCoproductsAndCoequalizers` in `stdlib/category-limits.ts` together with `finsetFiniteColimitFromCoproductsAndCoequalizers` in `src/all/triangulated.ts`, which delegates mediator construction to `finsetFactorThroughQuotient`.

### Finite-set exponentials and functoriality

- **Domain**: Finite sets `S`, `S'`, `X`, `Y`, `Z`, and sample arrows `A × S → X` alongside morphisms `r : S' → S`, `h : X → Y`, and `k : Y → Z`.
- **Statement**: `finSetExponential(X, S)` enumerates the carrier `X^S`, packages the evaluation arrow `ev_{X, S} : X^S × S → X`, and exposes currying/uncurrying witnesses so every `A × S → X` arrow factors uniquely through `X^S`. The helpers `expPrecompose` and `expPostcompose` satisfy the defining evaluation squares, are contravariant in the exponent and covariant in the base, and agree with explicitly curried mediators for identities and composites, realising the functorial behaviour demanded by Theorem 72 and Definition 17.5. The transpose helper `finsetExponentialTranspose` witnesses the `FinSet` bijection `Hom(A, X^B) ≅ Hom(B, X^A)` from Theorem 76 by shuttling between the two exponentials with (un)currying and the binary-product symmetry. Theorem 77’s base-change, currying/product, and product-exponential comparison isomorphisms appear as `finsetExpIsoFromBaseIso`, `finsetCurryingProductIso`, and `finsetProductExponentIso`, each assembling the evaluation-preserving mediators and certifying that their composites collapse to the identities promised by the universal properties. The naming helpers `finsetNameFromArrow` and `finsetArrowFromName` implement the Definition 78 correspondence `Hom(A, X) ≅ Hom(1, X^A)` by currying along the left-unit product witness, recording the `(1, \\mathrm{ev})` mediator, and recovering the original arrow by evaluation. Point constructors `finsetPointElement` and `finsetPointFromArrow` realise the `FinSet` points of an object as arrows from `1`, enabling evaluation probes for Theorem 80 directly inside the toolkit. Product mediators `FinSetProductsWithTuple` wrap `FinSet.product`, caching the cartesian tuples so wedges like `⟨1_A, f⟩` become executable morphisms and the CategoryLimits helpers can reuse the recorded coordinates. Coproduct mediators `FinSetCoproductsWithCotuple` similarly wrap `FinSet.coproduct`, reusing the disjoint-union tags to build the unique cotuple and keep the initial-cocone universal property executable. The pullback/intersection helper `finsetPullback` consumes inclusions `X → Z` and `Y → Z`, enumerates the carrier `X ∩ Y`, records the inclusion legs together with the shared map into `Z`, and exposes a factoring oracle so every commuting cone produces the unique mediator demanded by the pullback universal property. The helper `finsetProductPullback` packages the binary product as the pullback of `A → 1 ← B`, reusing the tuple mediator to factor wedges over the terminal span and keeping Theorem 87 executable. The comparison helper `finsetProductFromPullback(A, B)` rebuilds the same product via `productFromPullbacks`, enumerating the finite subcategory on `A`, `B`, their cartesian product, and `1` and asserting equality with the native carrier, projections, and tuple. The zero-product witnesses `finsetProductInitialIso` and `finsetInitialProductIso` specialise Theorem 78 by constructing the mediators `A × 0 ≅ 0` and `0 × A ≅ 0`, confirming that the projections factor through the unique arrow into `0`, and providing explicit arrows into the initial object for downstream monomorphism diagnostics. Initial/terminal helpers `FinSet.initialArrow` and `FinSet.terminate` build the canonical legs from `∅` and into `1`, so null-diagram colimit/limit witnesses can be exercised directly alongside the richer CCC structure. Strengthened morphism validation via `assertFinSetMor`/`isFinSetMor` enforces length and codomain bounds on every map so `FinSet.compose` can assume safe indexing and arrows into `0` only exist when the domain is empty. Point-surjectivity diagnostics `finsetPointSurjective` enumerate the global elements of `C^A` with the terminal-object helper and record preimages for every witness, while `finsetLawvereFixedPoint` builds the diagonal composite from Theorem 81 to return explicit fixed points for endomorphisms of `C` (and reject would-be mediators when no point-surjection exists, recovering the Cantor corollary `|C| ≥ 2 ⇒ ¬∃g : A → C^A`). `finsetEqualizerPullback(f, g)` combines the explicit subset computation with `equalizerFromPullback` and the new certification oracle so the square `E → X → Y` witnesses Theorem 89’s characterisation of equalizers as pullbacks of the diagonal, and `test/laws/law.FinSetEqualizerPullback.spec.ts` checks mediator factoring, failure cases, and the recorded cone enumeration so the “subset of equalising points” and “terminal cone” perspectives agree executably.
- **Oracles**: `test/laws/law.FinSetExponential.spec.ts` demonstrates that `uncurry ∘ curry` recovers the supplied arrow, verifies that precomposition along `r` and postcomposition along `h` send curried arrows to the expected composites after uncurrying, and confirms the identity/composition laws for both contravariant and covariant functoriality by comparing against the manually curried composites.  The suite also certifies the canonical isomorphisms `C^1 ≅ C` and `1^B ≅ 1`, checks that their evaluation triangles reduce to the unit projections, exercises the left/right product-unit witnesses used in those comparisons, and now confirms that the transpose mediators are inverse while reproducing the original evaluation composites on both sides of the correspondence. Additional cases use the point constructors to witness Theorem 80, showing that each element-induced arrow `x : 1 → A` satisfies `f ∘ x = \mathrm{ev} ∘ ⟨\mathrm{name}(f), x⟩` while rejecting attempts to evaluate points against the wrong codomain. New tests assert that naming an arrow and then evaluating along the `(1, \\mathrm{ev})` mediator yields the original map, that equal names correspond to equal arrows, and that malformed naming requests are rejected. `test/laws/law.FinSetTheorem77.spec.ts` makes Theorem 77 executable by validating that the comparison isomorphisms respect evaluation, produce mutually inverse mediators, and reject skew base maps or mismatched inputs. `test/laws/law.FinSetProductMediators.spec.ts` uses the cached tuples to rebuild diagonals, align componentwise pairings with the generic CategoryLimits helper, and derive the strict-initial unit via `CategoryLimits.unitBinaryProduct`, keeping those wedges observable in the tests. `test/laws/law.FinSetCoproduct.spec.ts` exercises the cotuple helper, confirming that the mediator commutes with injections, rejects skew leg data, and that discrete cocones factor uniquely through the coproduct witness. `test/laws/law.FinSetPullback.spec.ts` keeps intersections executable by checking that the helper’s carrier matches `X ∩ Y`, the square with the ambient set commutes, commuting cones factor through the recorded inclusion legs uniquely, skew cones are rejected, and that intersecting with an identity collapses back to the other leg. `test/laws/law.FinSetProductPullback.spec.ts` realises Theorem 87 by confirming the helper reuses the product projections and terminal legs, factors compatible wedges via the tuple mediator, and rejects skew cones that misalign with the span. `test/laws/law.FinSetInitialProduct.spec.ts` keeps the strict-initial behaviour observable by checking that the zero-product mediators compose to the identities, forcing both projections to factor through the unique arrow into `0`, and confirming via `isMono` that every exhibited arrow landing in `0` is monic. `test/laws/law.FinSetInitialTerminal.spec.ts` verifies that the canonical arrows from `∅` and into `1` coincide with any proposed alternative and that the composite `∅ → A → 1` collapses to the unique map `∅ → 1`, keeping the null-diagram universal properties observable. `test/finset-category.spec.ts` exercises the morphism validator directly, confirming that well-shaped maps pass, that codomain bounds are enforced, and that no arrow can target the initial object unless the domain is empty. `test/laws/law.FinSetFixedPoint.spec.ts` realises Lawvere’s fixed-point theorem by exhibiting a point-surjective arrow and extracting a concrete fixed point, then proves the Cantor corollary by showing that every attempt at `g : A → C^A` with `|C| ≥ 2` fails the point-surjectivity oracle and is rejected by the fixed-point helper.

### Internal Groups

- **Statement**: `makeSetInternalGroupWitness` realises Definition 61 directly in `Set`, packaging the binary products, terminal map, and diagonal pairing for a supplied carrier together with classical multiplication, unit, and inversion data. The helper enforces closure of the operations and produces the witness consumed by the generic internal-group oracles. `analyzeSetInternalGroup` wraps the generic analyser so the aggregated report retains the carrier/equality metadata alongside the associativity, unit, inversion, and diagonal diagnostics.
- **Statement**: `makeFinGrpInternalGroupWitness` lifts a finite group into the categorical internal-group schema, exposing the multiplication, unit, inverse, and the iterated product witnesses required to interpret Definition 61 purely in terms of binary products and the terminal object. Because internal groups in `Grp` coincide with abelian groups, the helper validates that both the multiplication and inversion arrows are `FinGrp` homomorphisms and rejects non-abelian carriers with a diagnostic that now highlights the first identity or product witness that breaks functoriality. `analyzeFinGrpInternalGroup` threads the originating `FinGrp` object through `analyzeInternalGroup` so the combined diagnostics can surface which concrete group triggered any failures.
- **Statement**: `makeTopInternalGroupWitness` instantiates Definition 61 inside `Top` by combining continuous multiplication, inversion, and unit arrows with the binary-product witnesses induced by product topologies. The helper verifies closure of the underlying operations and exports the resulting witness so the associativity, unit, and inversion oracles can run in the topological setting. `analyzeTopInternalGroup` attaches the product topology metadata to the aggregated diagnostics so tooling can reference the underlying `TopObject` while reporting failures. `test/laws/law.TopInternalGroup.spec.ts` exercises the witness with a discrete topological group, perturbing each structure map to confirm the diagnostics surface the broken axiom and that non-closed multiplications are rejected at construction time.
- **Statement**: `makeManInternalGroupWitness` packages the same diagrams for smooth manifolds, requiring callers to supply smoothness certificates for the multiplication, inversion, and unit point. These witnesses let the internal-group laws execute inside the Lie-style fragment highlighted by Section 14. `analyzeManInternalGroup` carries the smooth carrier through the aggregated diagnostics so the Lie-law suites can reference the underlying sample when surfacing issues.
- **Oracles**: `checkInternalGroupAssociativity`, `checkInternalGroupUnit`, and `checkInternalGroupInversion` specialise the binary-product interchange, diagonal-pairing, and terminal-point machinery to the (G1)–(G2) diagrams. `test/laws/law.SetInternalGroup.spec.ts`, `test/laws/law.FinGrpInternalGroup.spec.ts`, `test/laws/law.TopInternalGroup.spec.ts`, and `test/laws/law.ManInternalGroup.spec.ts` all verify that compliant witnesses succeed and that perturbing the multiplication, unit point, or inverse legs triggers the expected diagnostic messages.
- **Diagnostics**: Category-specific analysers (`analyzeSetInternalGroup`, `analyzeFinGrpInternalGroup`, `analyzeTopInternalGroup`, `analyzeManInternalGroup`, and `analyzeM2InternalGroup`) layer concrete metadata onto `analyzeInternalGroup`, aggregating associativity/unit/inversion outcomes together with diagonal-pairing checks so diagonal perturbations surface explicit `⟨id, i⟩`/`⟨i, id⟩` failures in every category.
- **Witness Builder**: `FinGrp.product(left, right)` returns `{ object, projection1, projection2, pair, decode, componentwise, swap, diagonal }`, letting downstream code register the product object, access the coordinate projections, manufacture mediating homomorphisms or the componentwise map `f × g`, and extract the symmetry witnesses or the canonical diagonal.

- **Domain**: `M₂` objects built from finite groups equipped with idempotent endomorphisms.
- **Statement**: `makeM2InternalGroupWitness` constructs an internal-group witness in the `M₂` category whenever the idempotent acts as a group homomorphism that fixes the unit and commutes with inversion.
- **Oracles**: `checkM2InternalGroupCompatibility` captures the additional idempotence and homomorphism obligations imposed by `M₂`. `test/laws/law.M2InternalGroup.spec.ts` exercises the compatibility checker alongside the internal-group associativity, unit, and inversion oracles, confirming compliant endomorphisms pass while skewed projections and unit-breaking maps fail.
- **Diagnostics**: `analyzeM2InternalGroup` layers the compatibility oracle onto `analyzeInternalGroup`, so the M₂ law suite surfaces a unified report that flags associativity/unit/inversion outcomes together with idempotence and homomorphism violations.
- **Witness Builder**: `makeM2InternalGroupWitness({ group, endomorphism })` wraps the `M₂` product constructor, terminal map, and diagonal enrichment so the internal-group laws can be verified inside the idempotent-stable subcategory highlighted in the `M₂` documentation.

### Internal Monoids

- **Statement**: `makeSetInternalMonoidWitness` packages a Set-based carrier with its binary product witness, unit point, and multiplication arrow so the internal-monoid axioms execute without requiring inverses. The helper checks that the unit and every product stay inside the carrier and enriches the witness with the canonical diagonal pairing. `analyzeSetInternalMonoid` wraps the generic analyser so the resulting report retains the Set carrier metadata.
- **Oracles**: `checkInternalMonoidAssociativity` and `checkInternalMonoidUnit` specialise the binary-product interchange and diagonal-pairing helpers to the (M1) associativity square and the (M2) unit triangles. `test/laws/law.SetInternalMonoid.spec.ts` verifies that the Boolean OR monoid satisfies the diagnostics while skewed multiplication, unit, or diagonal arrows surface the expected counterexamples.
- **Diagnostics**: Category-specific analysers (`analyzeSetInternalMonoid`, `analyzeFinGrpInternalMonoid`, `analyzeTopInternalMonoid`, `analyzeManInternalMonoid`, and `analyzeM2InternalMonoid`) aggregate the associativity, unit, and diagonal checks while preserving the underlying carrier metadata so law suites can reference the source witness alongside the diagnostic report.
- **Statement**: `makeFinGrpInternalMonoidWitness` lifts any finite group into the internal-monoid framework, reusing the FinGrp product witnesses and terminal map so the categorical monoid laws can execute with or without inversion data. The helper enforces that the multiplication arrow is a `FinGrp` homomorphism, reflecting that internal monoids in `Grp` are necessarily commutative, and rejects non-abelian sources with the same diagnostic surfaced by the group builder—including the concrete element pair responsible for the failure. `test/laws/law.FinGrpInternalMonoid.spec.ts` mirrors the group suite by perturbing the multiplication, unit, and diagonal arrows to ensure the diagnostics surface the expected failures.
- **Statement**: `makeTopInternalMonoidWitness` wires continuous multiplications and unit points through the topological product witness, reusing the discrete topology fixtures to prove that associativity/unit hold while rejecting non-closed or non-continuous operations. `test/laws/law.TopInternalMonoid.spec.ts` perturbs each structural arrow and confirms that diagonal compatibility failures are reported.
- **Statement**: `makeManInternalMonoidWitness` extends the same pattern to smooth manifolds, requiring callers to supply smoothness certificates for the binary multiplication and terminal point. `test/laws/law.ManInternalMonoid.spec.ts` validates the witness, checks the aggregated diagnostics, and demonstrates that non-smooth multiplications are rejected.
- **Domain**: `M₂` objects built from finite monoids with idempotent endomorphisms.
- **Statement**: `makeM2InternalMonoidWitness` combines the `M₂` product constructor, terminal map, and diagonal enrichment to provide internal-monoid witnesses whenever the endomorphism preserves multiplication and the unit.
- **Oracles**: `checkM2InternalMonoidCompatibility` captures the additional idempotence and homomorphism obligations, while `analyzeM2InternalMonoid` layers those checks on top of `analyzeInternalMonoid`. `test/laws/law.M2InternalMonoid.spec.ts` covers compliant witnesses, skew endomorphisms, and diagonal perturbations to confirm the combined diagnostics report the failure modes.

### Binary product projections need not be epimorphisms

- **Domain**: The four-object category from `makeToyNonEpicProductCategory()` with objects `A`, `B`, `P`, and `Z`.
- **Statement**: `P` together with `π₁ : P → A` and `π₂ : P → B` satisfies the universal property of the binary product, yet `π₁` fails to be epimorphic because distinct arrows `σ, τ : A → Z` collapse to the same composite once postcomposed with `π₁`.
- **Rationale**: Operationalises Awodey’s warning that product projections need not be epic by providing an explicit finite counterexample where the universal property still holds.
- **Oracles**: `test/laws/law.NonEpicProductProjection.spec.ts` feeds the toy category through `checkProductUP` to confirm the universal property, exhibits the collapsing composites, and verifies that `isEpi` detects the failure of right cancellability.
- **Witness Builder**: `makeToyNonEpicProductCategory()` exposes `{ product, nonEpicWitness }`, packaging the projections, canonical tuple, and the parallel arrows that witness the non-epic behaviour.

### Pointed sets and the zero object

- **Domain**: The pointed-set façade `pointed-set-cat.ts` where objects carry a distinguished basepoint.
- **Statement**: The singleton pointed set is simultaneously initial and terminal; there is exactly one basepoint-preserving arrow from it into any pointed set and one back into it from any source.
- **Rationale**: Makes the Set* zero-object example executable so pointed sets sit alongside the Set/FinSet coverage.
- **Oracles**: `test/laws/law.PointedSetZeroObject.spec.ts` compares arbitrary basepoint-preserving morphisms against the canonical `PointedSet.fromSingleton`/`PointedSet.toSingleton` witnesses and rejects maps that fail to preserve the basepoint.
- **Witness Builder**: `PointedSet.fromSingleton(target, singleton)` and `PointedSet.toSingleton(source, singleton)` package the canonical zero-object arrows.

### Arrow category extremal arrows

- **Domain**: Arrow categories assembled with `makeArrowCategory(FinSetCat(...))` so objects are concrete set functions.
- **Statement**: The identity on the singleton set `id₁ : 1 → 1` is terminal in `Set^→`, while `id₀ : 0 → 0` is initial; every commutative square into/out of these objects factors through the unique maps witnessing Set’s terminal and initial objects.
- **Rationale**: Realises Awodey’s observation that extremal objects lift along the arrow construction by reusing the explicit unique maps to `1` and from `0` in `FinSetCat`.
- **Oracles**: `test/laws/law.ArrowInitialTerminal.spec.ts` enumerates commutative squares and confirms their components coincide with the canonical injections/co-injections.
- **Witness Builder**: Canonical maps such as `!_A : A → 1` and `0 → B` are registered alongside identities before constructing the arrow category so they participate in every mediating square.

### Slice Set/X initial and terminal objects

- **Domain**: Slice categories `makeSlice(FinSetCat(...), "X")` anchored at a fixed set `X`.
- **Statement**: The leg `∅ → X` is initial and `id_X : X → X` is terminal—mediating maps from the former are forced to be the unique functions out of the empty set, while mediating maps into the latter reduce to the original arrows landing in `X`.
- **Rationale**: Encodes the Set/X slice example so the “unique filler” conditions become executable checks over explicit finite sets.
- **Oracles**: `test/laws/law.SliceInitialTerminal.spec.ts` inspects all slice morphisms, verifying their mediating arrows match the canonical `∅`-legs and the original structure maps into `X`.

### Slice Set/X fiber products

- **Domain**: `makeSlice(FinSetCat(...), "X")` together with fiber products constructed by `makeSliceProduct(category, "X", left, right)` and their finite-family extension via `makeFiniteSliceProduct(category, "X", factors)`.
- **Statement**: `makeSliceProduct` enumerates the pullback carrier, exposes the canonical projections into each leg, and provides `pair(leftLeg, rightLeg)` so any commutative pair of arrows into the factors yields the unique mediating arrow whose composites recover the supplied legs; the witness now exposes `componentwise(target, [f, g])` to manufacture fiber-product arrows `f ×_X g`, `swap()` for the symmetry isomorphism exchanging the two legs, `diagonal()` for the canonical slice arrow `⟨id, id⟩`, and `leftUnit()` / `rightUnit()` so slice products with the terminal object collapse to the non-terminal leg. `makeFiniteSliceProduct` iterates that construction across arbitrary finite families (including the empty case through the terminal slice), exposes `tuple(domain, legs)` for collapsing compatible leg families to the canonical mediator, and likewise publishes the binary componentwise constructor, swap, diagonal, and unitors whenever the relevant factors are present. Both witnesses interoperate with `CategoryLimits.checkBinaryProductComponentwiseCollapse`, `CategoryLimits.checkBinaryProductSwapCompatibility`, and `CategoryLimits.checkBinaryProductNaturality`, ensuring componentwise maps collapse against mediating pairings, swap symmetry commutes with componentwise arrows, and precomposition of slice mediators agrees with the canonical pairing while flagging mismatched domains immediately. The pullback-backed builders `makeSliceProductFromPullback(base, anchor, calculator, left, right)` and `makeSliceFiniteProductFromPullback(base, anchor, calculator, factors)` reuse a `PullbackCalculator` to construct the same witnesses in any finite category that provides pullbacks—no carrier enumeration required. Passing `{ pullbacks: calculator }` to `makeSliceProductsWithTuple(base, anchor, …)` switches the `CategoryLimits` adapter over to these generic builders so non-Set slices inherit the tuple machinery automatically.
- **Rationale**: Realises the Set/X fiber-product example from the text, allowing us to certify the universal property executably instead of reasoning about underlying tuples by hand, and generalises it to finite cones so `CategoryLimits.finiteProduct` can target slices directly.
- **Oracles**: `test/laws/law.SliceProduct.spec.ts` inspects the enumerated carrier, confirms the projections and pairing agree with the sample legs, checks the fiber-product swap collapses back to the identity and exchanges the projections, verifies the diagonal composes to the identity on its source and matches the pairing of identity legs, demonstrates the unit laws \(X×_X A ≅ A ≅ A×_X X\) with the executable witnesses, exercises the componentwise constructor `componentwise(target, [f, g])`, and runs `checkProductUP` to validate both the canonical mediator and a counterexample with a mismatched leg, while the new tests drive `CategoryLimits.checkBinaryProductComponentwiseCollapse`, `CategoryLimits.checkBinaryProductSwapCompatibility`, and `CategoryLimits.checkBinaryProductNaturality` to show componentwise collapse, swap coherence, and precomposition all agree with the canonical slice pairing and that incompatible domains raise the expected composition error; `test/laws/law.SliceFiniteProduct.spec.ts` exercises the triple fiber product, verifies the iterated universal property, checks the `CategoryLimits` integration path, and confirms the componentwise constructor matches the expected tuple; `test/laws/law.SliceProductFromPullback.spec.ts` reconstructs the same witnesses in a finite poset slice using only pullback data, covers the swap/unit/diagonal guarantees without enumerating carriers, integrates the pullback builder with `makeSliceProductsWithTuple`, and demonstrates that a faulty calculator (or mismatched legs) triggers the expected universal-property failures; `test/laws/law.FinSetSlicePullback.spec.ts` compares the Set/X fiber product with the generic pullback calculator, confirming the apex, projections, and mediators coincide and that non-pullback wedges fail the certification.
- **Witness Builder**: `makeSliceProduct(...)` returns `{ object, projectionLeft, projectionRight, pair, decode, componentwise, swap, diagonal }`, while `makeFiniteSliceProduct(...)` returns `{ object, projections, tuple, decode, componentwise, swap, diagonal }` and registers metadata consumed by `makeSliceProductsWithTuple(base, "X")` so downstream code can invoke `CategoryLimits.finiteProduct`/`mediateProduct` with slice objects.
- **Witness Builder**: Populate the FinSet arrow registry with the slice legs `A → X` (and any additional factors) before calling `makeSlice` so the oracles can recover the universal squares directly.

### Monoid Laws
For any monoid `(M, ⊕, ε)`:

**Associativity**: `(a ⊕ b) ⊕ c = a ⊕ (b ⊕ c)`
**Identity**: `ε ⊕ a = a = a ⊕ ε`

**Witness**: Property test with random `a, b, c ∈ M`

### Functor Laws
For any functor `F`:

**Identity**: `map(id) = id`
**Composition**: `map(f ∘ g) = map(f) ∘ map(g)`

**Witness**: Property test with random functions `f, g` and random `fa ∈ F[A]`

### Applicative Laws
For any applicative `F`:

**Identity**: `pure(id) <*> v = v`
**Composition**: `pure(∘) <*> u <*> v <*> w = u <*> (v <*> w)`
**Homomorphism**: `pure(f) <*> pure(x) = pure(f(x))`
**Interchange**: `u <*> pure(y) = pure(λf.f(y)) <*> u`

**Witness**: Property test with random `f, x, y` and random `u ∈ F[A → B], v ∈ F[A]`

### Monad Laws
For any monad `M`:

**Left Identity**: `return(a) >>= f = f(a)`
**Right Identity**: `m >>= return = m`
**Associativity**: `(m >>= f) >>= g = m >>= (λx.f(x) >>= g)`

**Witness**: Property test with random `a, f, g` and random `m ∈ M[A]`

## Arrow Laws

### Arrow category

- `makeArrowCategory(base)` builds the arrow category \(C^{\rightarrow}\) of commutative squares. Objects are arrows of `base`; morphisms are pairs `(j, k)` that make the square commute. Identity and composition are validated against the base category.
- `makeArrowDomainFunctor` and `makeArrowCodomainFunctor` expose the canonical domain/codomain projections \(C^{\rightarrow} \to C\). `test/arrow-category.spec.ts` checks the category laws and confirms the functors preserve identity and composition on representative squares.
- In Set-like settings this realises the “two-stage variable set” intuition: an object `u_X : X_0 → X_1` evolves data from stage 0 to stage 1, and a morphism `(j, k)` transports both stages coherently.

### Category Laws
For any category `C`:

**Left Identity**: `id ∘ f = f`
**Right Identity**: `f ∘ id = f`
**Associativity**: `(f ∘ g) ∘ h = f ∘ (g ∘ h)`

**Witness**: Property test with random arrows `f, g, h`

### Arrow Laws
For any arrow `A`:

**Arrow Identity**: `arr(id) = id`
**Arrow Composition**: `arr(f ∘ g) = arr(f) ∘ arr(g)`
**Arrow Extension**: `first(arr(f)) = arr(f × id)`
**Arrow Exchange**: `first(f ∘ g) = first(f) ∘ first(g)`
**Arrow Unit**: `first(f) ∘ arr(λx.(x, ⊥)) = arr(λx.(f(x), ⊥))`
**Arrow Association**: `first(first(f)) ∘ arr(λx.((x, y), z)) = arr(λx.(x, (y, z))) ∘ first(f)`

**Witness**: Property test with random functions `f, g` and random arrows

### ArrowChoice Laws
For any ArrowChoice `A`:

**Left Identity**: `left(arr(f)) = arr(left(f))`
**Left Exchange**: `left(f ∘ g) = left(f) ∘ left(g)`
**Right Identity**: `right(arr(f)) = arr(right(f))`
**Right Exchange**: `right(f ∘ g) = right(f) ∘ right(g)`

**Witness**: Property test with random functions `f, g` and Either-like values

### ArrowLoop Laws
For any ArrowLoop `A`:

**Right-Tightening**: `loop(σ) ∘ arr(g) = loop(σ ∘ arr(g × id))`
**Loop Identity**: `loop(arr(λ(x,y).(y,x))) = id` (when well-defined)

**Witness**: Property test with random functions and loop bodies

### Profunctor Laws
For any profunctor `P`:

**Identity**: `dimap(id, id) = id`
**Composition**: `dimap(f ∘ g, h ∘ i) = dimap(g, h) ∘ dimap(f, i)`

**Witness**: Property test with random functions `f, g, h, i` (see `test/laws/law.ProfunctorIR.spec.ts`)

### Strong Laws
For any strong profunctor `P`:

**Naturality**: `first(f) ∘ dimap(g, h) = dimap(g, h) ∘ first(f)`
**Associativity**: `first(first(f)) ∘ assoc = assoc ∘ first(f)`
**Unitality**: `first(f) ∘ unitor = unitor ∘ f`

**Witness**: Property test with random functions and arrows (see `test/laws/law.StrongProfunctorIR.spec.ts`)

### ArrowApply Laws
For any ArrowApply `A`:

**Apply Identity**: `app ∘ arr(λx.(x, id)) = id`
**Apply Composition**: `app ∘ first(app) ∘ assoc = app ∘ arr(λx.(x, f ∘ g))`

**Witness**: Property test with random arrows `f, g`

## Kleisli Arrow Laws

### Kleisli Category Laws
For any monad `M`, the Kleisli category `Kl(M)` satisfies:

**Left Identity**: `return >=> f = f`
**Right Identity**: `f >=> return = f`
**Associativity**: `(f >=> g) >=> h = f >=> (g >=> h)`

**Witness**: Property test with random Kleisli arrows `f, g, h`

### Kleisli Arrow Laws
For Kleisli arrows `A → M[B]`:

**Arrow Identity**: `arr(id) = return`
**Arrow Composition**: `arr(f ∘ g) = arr(f) >=> arr(g)`
**Arrow Extension**: `first(f) = λ(x, y).f(x) >>= λa.return(a, y)`

**Witness**: Property test with random functions and Kleisli arrows

## State Laws

### State Monad Laws
For `State[S, A] = S → (A, S)`:

**Left Identity**: `put(s) >> get = put(s) >> return(s)`
**Right Identity**: `get >>= put = return(())`
**Put-Put**: `put(s) >> put(s') = put(s')`
**Get-Put**: `get >>= put = return(())`

**Witness**: Property test with random states `s, s'`

## Reader Laws

### Reader Monad Laws
For `Reader[R, A] = R → A`:

**Ask Identity**: `ask >>= return = return(())`
**Local Identity**: `local(id) = id`
**Local Composition**: `local(f) ∘ local(g) = local(f ∘ g)`
**Local Ask**: `local(f) ∘ ask = ask >>= return ∘ f`

**Witness**: Property test with random functions `f, g` and random environments

## Result/Validation Laws

### Result Monad Laws
For `Result[E, A]`:

**Left Identity**: `Ok(a) >>= f = f(a)`
**Right Identity**: `r >>= Ok = r`
**Associativity**: `(r >>= f) >>= g = r >>= (λx.f(x) >>= g)`
**Error Propagation**: `Err(e) >>= f = Err(e)`

**Witness**: Property test with random `a, f, g` and random results

### Validation Applicative Laws
For `Validation[E, A]`:

**Accumulation**: `Err(e1) <*> Err(e2) = Err(e1 ++ e2)`
**Success**: `Ok(f) <*> Ok(a) = Ok(f(a))`
**Mixed**: `Ok(f) <*> Err(e) = Err(e) = Err(e) <*> Ok(a)`

**Witness**: Property test with random errors and values

## Streaming/Iteration Laws

### Stream Fusion Laws
For streams `Stream[A]`:

**Map Fusion**: `map(f) ∘ map(g) = map(f ∘ g)`
**Filter Fusion**: `filter(p) ∘ filter(q) = filter(λx.p(x) ∧ q(x))`
**Map-Filter Commute**: `map(f) ∘ filter(p) = filter(p) ∘ map(f)` (when `f` is total)

**Witness**: Property test with random functions and predicates

### Fold Laws
For folds `Fold[A, B]`:

**Associativity**: `fold(f, z, xs ++ ys) = fold(f, fold(f, z, xs), ys)`
**Identity**: `fold(f, z, []) = z`
**Homomorphism**: `fold(f, z, map(g, xs)) = fold(f ∘ g, z, xs)`

**Witness**: Property test with random functions and lists

## Parallel/Concurrent Laws

### Parallel Applicative Laws
For parallel execution `Par[A]`:

**Commutativity**: `par(f, g) = par(g, f)` (when both succeed)
**Associativity**: `par(par(f, g), h) = par(f, par(g, h))`
**Identity**: `par(f, pure(id)) = f`

**Witness**: Property test with random parallel computations

### Concurrent Monad Laws
For concurrent execution `Concurrent[A]`:

**Race Identity**: `race(f, never) = f`
**Race Commutativity**: `race(f, g) = race(g, f)`
**Timeout Identity**: `timeout(∞, f) = f`

**Witness**: Property test with random concurrent computations

## Optimization Laws

### Fusion Laws
For any composable operations:

**Map Fusion**: `map(f) ∘ map(g) = map(f ∘ g)`
**Filter Fusion**: `filter(p) ∘ filter(q) = filter(λx.p(x) ∧ q(x))`
**Fold Fusion**: `fold(f, z) ∘ map(g) = fold(λx y.f(g(x), y), z)`

**Witness**: Property test ensuring semantic equivalence

### Commutation Laws
For operations that can be reordered:

**Map-Filter Commute**: `map(f) ∘ filter(p) = filter(p) ∘ map(f)` (when `f` is total)
**Filter-Filter Commute**: `filter(p) ∘ filter(q) = filter(q) ∘ filter(p)`

**Witness**: Property test with random functions and predicates

## Witness Implementation

Each law should have a corresponding property test that:

1. **Generates random inputs** of the appropriate types
2. **Applies both sides** of the law equation
3. **Compares results** for equality (or equivalence)
4. **Reports counterexamples** if the law fails
5. **Captures minimal reproducers** for debugging

### Example Witness Template

```typescript
export const witnessFunctorIdentity = <A>(
  genA: () => A,
  genFA: () => F<A>
): PropertyTest => ({
  name: "Functor Identity Law",
  test: () => {
    const fa = genFA()
    const left = map(id)(fa)
    const right = fa
    return equals(left, right)
  },
  shrink: (counterexample) => shrinkFA(counterexample)
})
```

## Law Verification

All laws should be verified with:
- **Property-based testing** using random generators
- **Edge case testing** with boundary values
- **Performance testing** to ensure laws don't introduce inefficiencies
- **Documentation** explaining when laws might not hold (e.g., floating-point precision)

## Recursion Scheme Laws

### Catamorphism Laws
For `cataArray<A, B>(nil, cons)`:

**Identity**: `cataArray(nil, cons)([]) = nil`
**Consistency**: `cataArray(nil, cons)([a, ...as]) = cons(a, cataArray(nil, cons)(as))`
**Fusion**: `cataArray(nil, cons) ∘ map(f) = cataArray(nil, λa b.cons(f(a), b))`

**Witness**: Property test with random `nil, cons, f` and random arrays

### Anamorphism Laws
For `anaArray<A, S>(step)`:

**Termination**: `anaArray(step)(s)` terminates when `step(s) = None`
**Consistency**: `anaArray(step)(s) = [a, ...anaArray(step)(s')]` when `step(s) = Some([a, s'])`
**Coalgebra Fusion**: `anaArray(step ∘ f) = anaArray(step) ∘ f`

**Witness**: Property test with random `step, f` and random seeds

### Hylomorphism Laws
For `hyloArray<A, S, B>(step, alg, nil)`:

**Efficiency**: `hyloArray(step, alg, nil)(s) = cataArray(nil, alg)(anaArray(step)(s))`
**Fusion**: `hyloArray(step, alg, nil) ∘ f = hyloArray(step ∘ f, alg, nil)`
**Algebra Fusion**: `f ∘ hyloArray(step, alg, nil) = hyloArray(step, λa b.f(alg(a, b)), f(nil))`

**Witness**: Property test ensuring semantic equivalence without intermediate structures

### Paramorphism Laws
For `paraArray<A, B>(nil, cons)`:

**Identity**: `paraArray(nil, cons)([]) = nil`
**Consistency**: `paraArray(nil, cons)([a, ...as]) = cons(a, as, paraArray(nil, cons)(as))`
**Tail Access**: `paraArray(nil, cons)` provides access to unprocessed tail

**Witness**: Property test with random `nil, cons` and random arrays

### Apomorphism Laws
For `apoArray<A, S>(step)`:

**Embedding**: `apoArray(step)(s) = [...prefix, ...tail]` when `step(s) = Err(tail)`
**Continuation**: `apoArray(step)(s) = [a, ...apoArray(step)(s')]` when `step(s) = Ok([a, s'])`
**Coalgebra Fusion**: `apoArray(step ∘ f) = apoArray(step) ∘ f`

**Witness**: Property test with random `step, f` and random seeds

### Endomorphism Monoid Laws
For `MonoidEndo<A>()`:

**Identity**: `empty ∘ f = f = f ∘ empty`
**Associativity**: `(f ∘ g) ∘ h = f ∘ (g ∘ h)`
**Composition**: `concat(f, g)(x) = g(f(x))`

**Witness**: Property test with random endomorphisms and random values

## Monoidal Functor Laws

### Monoidal Functor Laws
For any lax monoidal functor `F` on the category of types with tensor = product and unit = void:

**Functor Laws**:
- **Identity**: `F.map(id) = id`
- **Composition**: `F.map(g ∘ f) = F.map(g) ∘ F.map(f)`

**Unit Coherence**:
- **Left Unit**: `F.map(λ.from) = a => F.tensor(F.unit, a)` where `λ: A ≅ [void, A]`
- **Right Unit**: `F.map(ρ.from) = a => F.tensor(a, F.unit)` where `ρ: A ≅ [A, void]`

**Associativity Coherence**:
- **Associator**: `F.map(α.from) ∘ F.tensor(F.tensor(a, b), c) = F.tensor(a, F.tensor(b, c))` where `α: [A, [B, C]] ≅ [[A, B], C]`

**Naturality of Tensor**:
- **Tensor Naturality**: `F.tensor(F.map(f)(a), F.map(g)(b)) = F.map(bimap(f, g))(F.tensor(a, b))`

**Witness**: Property test with random functions `f, g` and random values `a, b, c`

### Monoidal Functor Instances
The following instances satisfy the monoidal functor laws:

**Option Monoidal Functor**:
- **Unit**: `Some(undefined)`
- **Tensor**: `zipOption(fa, fb) = fa <*> fb.map(b => a => [a, b])`

**Result Monoidal Functor** (short-circuiting):
- **Unit**: `Ok(undefined)`
- **Tensor**: `zipResult(fa, fb) = fa <*> fb.map(b => a => [a, b])`

**Reader Monoidal Functor**:
- **Unit**: `Reader.of(undefined)`
- **Tensor**: `zipReader(fa, fb) = r => [fa(r), fb(r)]`

**ReaderTask Monoidal Functor**:
- **Unit**: `ReaderTask.of(undefined)`
- **Tensor**: `zipReaderTask(fa, fb) = r => Promise.all([fa(r), fb(r)])`

**ReaderTaskEither Monoidal Functor**:
- **Unit**: `RTE.of(undefined)`
- **Tensor**: `zipRTE(fa, fb) = r => Promise.all([fa(r), fb(r)]).then(([ra, rb]) => ra <*> rb.map(b => a => [a, b]))`

**Validation Monoidal Functor** (accumulating):
- **Unit**: `VOk(undefined)`
- **Tensor**: `zipValidation(fa, fb) = fa <*> fb.map(b => a => [a, b])` (accumulates errors)

**Witness**: Property test for each instance with random generators and equality functions

## 2-Functor Laws

### Strict 2-Functor Laws
For any strict 2-functor `U: C → D` between 2-categories:

**on2 respects vertical composition**: `U(β ∘v α) = U(β) ∘v U(α)`
**on2 respects horizontal composition**: `U(β ⋆ α) = U(β) ⋆ U(α)`
**on2 preserves identity**: `U(id_F) = id_{U(F)}`

**Witness**: Property test with random natural transformations and endofunctors

### Lax 2-Functor Laws
For any lax 2-functor `U: C → D`:

**μ, η are natural in their arguments**
**Unit Coherence**: 
- `(U(F) ∘ η) ; μ_{F,Id} = id_{U(F)}`
- `(η ∘ U(F)) ; μ_{Id,F} = id_{U(F)}`
**Associativity Coherence**: 
- `(μ_{F,G} ⋆ id_{U(H)}) ; μ_{F∘G,H} = (id_{U(F)} ⋆ μ_{G,H}) ; μ_{F,G∘H}`

**Witness**: Property test with random endofunctors and natural transformations

### Oplax 2-Functor Laws (Dual)
For any oplax 2-functor `U: C → D`:

**η^op, μ^op are natural in their arguments**
**Unit Coherence**: 
- `η^op ; (U(F) ∘ μ^op_{F,Id}) = id_{U(F)}`
- `η^op ; (μ^op_{Id,F} ∘ U(F)) = id_{U(F)}`
**Associativity Coherence**: 
- `μ^op_{F∘G,H} ; (μ^op_{F,G} ⋆ id_{U(H)}) = μ^op_{F,G∘H} ; (id_{U(F)} ⋆ μ^op_{G,H})`

**Witness**: Property test with random endofunctors and natural transformations

### Concrete Instances

#### PostcomposeReader2<R> (Lax)
- **on1**: `F ↦ Reader<R, F<_>>`
- **on2**: `α ↦ Reader<R, α>`
- **η**: `a ↦ (_) => a` (unit)
- **μ**: `Reader<R, F<Reader<R, G<_>>>> ↦ Reader<R, F<G<_>>>` (evaluate inner Reader at same environment)

#### PrecomposeEnv2<E> (Oplax)
- **on1**: `F ↦ F ∘ Env<E, _>`
- **on2**: `α ↦ α` (applied to Env<E, A>)
- **η^op**: `[e, a] ↦ a` (counit - drop environment)
- **μ^op**: `F<G<Env<E, A>>> ↦ Env<E, F<G<A>>>` (using strength to pull Env outward)

**Witness**: Property test for each instance with random endofunctors and natural transformations

## Indexed Family Laws

### Reindexing Functoriality
For reindexing operation `u*` along `u: J → I`:

**Identity**: `id* = id`
**Composition**: `(v ∘ u)* = u* ∘ v*`

**Witness**: Property test with random functions `u, v` and random families

### Dependent Sum/Product Adjunction
For families `X: I → Set`:

**Σ ⊣ u* ⊣ Π**: `Σu ⊣ u* ⊣ Πu`
**Triangle Identities**: 
- `u* ε ∘ η = id` on `u*Y`
- `ε ∘ u* η = id` on `ΣuX`

**Witness**: Property test with pullback squares and fiber computations

### Beck-Chevalley Law
For pullback square of index maps:

**Substitution Commutes**: `f* Σw ≅ Σu v*`

**Witness**: Property test comparing counts over pullback indices

### Kan Extension Laws
For discrete index maps `u: J → I`:

**Left Kan**: `(Lanu F)(i) = ⨁{j | u(j)=i} F(j)`
**Right Kan**: `(Ranu F)(i) = ∏{j | u(j)=i} F(j)`
**Naturality**: Kan extensions are natural in the family

**Witness**: Property test with fiber size comparisons

## Diagram Laws

### Diagram basics ↔ Code mapping

- **Representational diagram**: a labelled directed graph that pictures
  objects (nodes) and arrows (edges).
- **Diagram in a category**: the concrete selection of objects and morphisms
  inside a category matching that picture.
- **Paths and composites**: any composable chain of arrows yields a single
  composite arrow from its source to its target. Distinct paths between the
  same objects form a commutative diagram precisely when their composites
  agree.
- **Associativity and pasting**: triangles commute by definition of
  composition. Pasting commuting polygons along shared edges produces larger
  commuting diagrams.
- **Identity arrows**: each object has a neutral loop that leaves every arrow
  unchanged; repeated labels in a diagram always refer to the same object or
  morphism.

#### (§6.3) Revised commutativity (Def 20*)
A representational diagram commutes when any two directed paths X ⇒ Y—where at
least one path has length ≥ 2—have equal composites; parallel single-edge
arrows may differ, so forks can satisfy f ∘ e = g ∘ e without forcing f = g.

**In code:**

- `diagram.ts` provides `composePath`, `commutes`, `paste`, `allCommute`, `id`,
  and `isIdentity` for function-like arrows, plus `composeAbstract`,
  `commutesAbstract`, and `pasteAbstract` for abstract morphism data.
- `Diagram`/`DiagramClosure` in `allTS.ts` capture representational diagrams;
  `DiagramLaws` validates commutativity and limit-style constraints on those
  values. The suite `test/indexed-families.spec.ts` exercises these checks.

### Functoriality Laws
For diagrams `D: I → C`:

**Identity**: `D(id_i) = id_{D(i)}`
**Composition**: `D(g ∘ f) = D(g) ∘ D(f)`

**Witness**: Property test with `DiagramLaws.validateFunctoriality`

### Closure Laws
For diagram closure operations:

**Idempotence**: `saturate(saturate(D)) = saturate(D)`
**Preservation**: If `D` satisfies functoriality, so does `saturate(D)`

**Witness**: Property test with closure validation

- **Statement**: `DiagramClosure.closeFiniteDiagram` saturates arbitrary finite-category
  diagrams by adjoining identities and composites for the generated subcategory and
  exposes a morphism lookup so cones can query the completed functor, extending the
  poset-only closure to Definition 82’s general setting.
- **Oracles**: `test/diagram-closure.spec.ts` builds a span with parallel arrows,
  verifies the synthesised composites respect functoriality, and rejects malformed
  inputs whose morphisms misalign with the advertised arrows, keeping the closure
  witness executable.

## Markov Category Laws

### Faithfulness via monomorphisms

- **Domain**: Markov category with commutative semiring R
- **Statement**: ∇ is split mono ⇒ monic (Δ ∘ ∇ = id)
- **Rationale**: Establishes faithfulness of the distribution functor
- **Oracle**: `checkFaithfulness(R, samples, domain)` → `{splitMono: boolean, deltaMonic: boolean}`
- **Witness**: Split mono witness + δ monicity proof
- **Tests**: `law.PullbackCheck.spec.ts`

### Entirety implies representability

- **Domain**: Commutative semiring R with no zero divisors
- **Statement**: If R is entire, then the relevant pullback square always holds
- **Rationale**: Connects algebraic properties to categorical representability
- **Oracle**: `checkEntirety(R, domain, f, g)` → `boolean`
- **Witness**: Pullback square verification for entire semirings
- **Tests**: `law.EntiretyCheck.spec.ts`

### Pullback square uniqueness

- **Domain**: Deterministic morphisms f: A→X, g: A→Y in Markov category
- **Statement**: Only joint with Dirac marginals is the Dirac pair
- **Rationale**: Core representability property for Markov categories
- **Oracle**: `checkPullbackSquare(R, Avals, f, g, candidates?)` → `boolean`
- **Witness**: Counterexample detection for exotic semirings
- **Tests**: `law.PullbackSquare.spec.ts`

### Thunkability ⇔ determinism

- **Domain**: Kleisli morphisms f: A → P(B) in Markov category
- **Statement**: f is thunkable ⇔ f is deterministic (factors through δ)
- **Rationale**: Characterizes when morphisms respect the monoidal structure
- **Oracle**: `isThunkable(R, f, samples, probes)` → `{thunkable: boolean, base?: Function}`
- **Witness**: Extracted base function for deterministic morphisms
- **Tests**: `law.MarkovThunkable.spec.ts`

### Monoidal structure

- **Domain**: Symmetric monoidal Markov category
- **Statement**: δ and sampling are monoidal; strength is natural in second argument
- **Rationale**: Ensures independence properties work correctly
- **Oracle**: `checkAllMonoidalLaws(R, testData)` → `{diracMonoidal: boolean, strengthNaturality: boolean, ...}`
- **Witness**: Commuting diagrams for monoidal coherence
- **Tests**: `law.MarkovMonoidalSimple.spec.ts`

### Sampling cancellation

- **Domain**: Kleisli morphisms with sampling function in a.s.-compatible setting
- **Statement**: If samp∘f# = samp∘g# (a.s.), then f# = g# (a.s.)
- **Rationale**: Characterizes when sampling determines distributional equality
- **Oracle**: `samplingCancellation(R, Avals, f, g, samp, nullMask?)` → `boolean`
- **Witness**: Counterexample (Ghost semiring) where cancellation fails
- **Tests**: `law.ASEquality.spec.ts`, `law.GhostCounterexample.spec.ts`

### Ghost semiring counterexample

- **Domain**: Ghost semiring Rε = {0, ε, 1}
- **Statement**: Representable but not a.s.-compatible (f# ≠ g# but samp∘f# = samp∘g#)
- **Rationale**: Demonstrates limits of representability theory
- **Oracle**: `samplingCancellation(GhostRig, ...)` → `false` (counterexample)
- **Witness**: Concrete distributions differing by ε-weights
- **Tests**: `law.GhostCounterexample.spec.ts`

## Dominance Theory Laws

### SOSD via Dilation Witnesses

- **Domain**: Distributions with evaluation function e: P(A) → A
- **Statement**: p ⪯_SOSD q ⇔ ∃ dilation t: q = t#(p) ∧ e∘t = id
- **Rationale**: Characterizes second-order stochastic dominance constructively
- **Oracle**: `sosdFromWitness(R, p, q, e, t, samples, direction)` → `boolean`
- **Witness**: Mean-preserving dilation witnessing the dominance
- **Tests**: `law.SOSD.spec.ts`

### Dilation Validation

- **Domain**: Kernels t: A → P(A) with evaluation function e
- **Statement**: t is a dilation ⇔ e∘t = id (mean-preserving property)
- **Rationale**: Validates mean-preserving spread transformations
- **Oracle**: `isDilation(R, t, e, samples)` → `boolean`
- **Witness**: Verification that evaluation is preserved
- **Tests**: `law.SOSD.spec.ts`

## Information Theory Laws

### Blackwell Sufficiency (Informativeness)

- **Domain**: Experiments f, g: Θ → P(X), P(Y) with prior m
- **Statement**: f is more informative than g ⇔ ∃ garbling c: f = c∘g
- **Rationale**: Characterizes when one experiment provides more information
- **Oracle**: `moreInformativeClassic(R, Θvals, f, g, candidates)` → `{ok: boolean, c?: Function}`
- **Witness**: Garbling function c witnessing the information ordering
- **Tests**: `law.Garbling.spec.ts`

### Standard Experiments

- **Domain**: Prior m: P(Θ) and experiment f: Θ → P(X)
- **Statement**: Standard measure f̂_m distributes over posterior distributions
- **Rationale**: Canonical representation for Bayesian decision theory
- **Oracle**: `standardMeasure(m, f, xVals)` → `StandardMeasure<Θ>`
- **Witness**: Distribution over posterior distributions
- **Tests**: `law.StandardExperiment.spec.ts`

### BSS Equivalence

- **Domain**: Experiments f, g with prior m
- **Statement**: f ⪰ g ⟺ f̂_m ⪯_SOSD ĝ_m (informativeness ⇔ SOSD on standard measures)
- **Rationale**: Connects all three characterizations of informativeness
- **Oracle**: `bssCompare(m, f, g, xVals, yVals)` → `boolean`
- **Witness**: Equivalence of garbling, joint, and SOSD characterizations
- **Tests**: `law.BSS.spec.ts`

## Coalgebra Infrastructure Laws

### Coalgebra counit and coassociativity

- **Domain**: Coalgebras (A, α) for a comonad W on category C
- **Statement**: ε_A ∘ α = id_A and δ_A ∘ α = Wα ∘ α
- **Rationale**: Verifies the fundamental coalgebra structure equations before running higher constructions
- **Oracle**: `checkCoalgebraLaws(comonad, coalgebra)` → `{overall, counit, coassociativity, witness}`
- **Witness**: `CoalgebraLawWitness` capturing composites for counit and coassociativity
- **Tests**: `test/coalgebra-law-oracles.spec.ts`

### Coalgebra morphism coherence

- **Domain**: Coalgebra morphisms f : (A, α) → (B, β)
- **Statement**: Wf ∘ α = β ∘ f
- **Rationale**: Ensures morphisms respect coactions so coalgebras form a category
- **Oracle**: `checkCoalgebraMorphism(comonad, morphism)` → `{holds, diagnostics, witness}`
- **Witness**: `CoalgebraMorphismCoherenceWitness` comparing both composites
- **Tests**: `test/coalgebra-law-oracles.spec.ts`

### Coalgebra wedge product compatibility

- **Domain**: Ambient coalgebra together with left/right subcoalgebras and a wedge witness
- **Statement**: The wedge coaction satisfies coalgebra laws and the inclusions are coalgebra morphisms that agree with the pullback mediator
- **Rationale**: Certifies that coalgebra pullbacks support wedge products used in cotensor constructions
- **Oracle**: `checkCoalgebraWedgeProduct(comonad, ambient, left, right, witness, pullback)` → `CoalgebraWedgeOracleReport`
- **Witness**: `CoalgebraWedgeProductWitness` assembled from pullback data and inclusions
- **Tests**: `test/coalgebra-wedge-cotensor-oracles.spec.ts`

### Cotensor tower stabilization

- **Domain**: Iterated cotensor tower built from an ambient coalgebra and partner inclusion
- **Statement**: Each stage's wedge witness is coherent and progress reporting identifies stabilization across levels
- **Rationale**: Detects when cotensor iteration reaches a fixed point or exposes inconsistent staging metadata
- **Oracle**: `checkCotensorTower(comonad, tower)` → `{overall, stages, progress}`
- **Witness**: Stage-level `CoalgebraWedgeProductWitness` records embedded in the tower
- **Tests**: `test/coalgebra-wedge-cotensor-oracles.spec.ts`

## Oracle Coverage Summary

| Domain | Laws Covered | Oracles Implemented | Tests |
|--------|--------------|-------------------|-------|
| **Foundational** | Faithfulness, entirety, pullbacks, thunkability, monoidal coherence, sampling cancellation | 15+ | 139 |
| **Dominance** | SOSD, dilations | 5+ | 25 |
| **Information** | Blackwell sufficiency, BSS equivalence | 8+ | 47 |
| **Counterexamples** | Ghost semiring | 3+ | 10 |
| **Infrastructure** | Semirings, distributions | 10+ | 23 |

**Total**: 41+ oracles, 244 tests, complete coverage of advanced probability theory

## Future Extensions

This document should grow to include:
- **Lens laws** (get-put, put-get, put-put)
- **Prism laws** (preview-review, review-preview)
- **Traversal laws** (traversal composition, traversal identity)
- **Comonad laws** (extract, duplicate, extend)
- **Distributive laws** (distributivity over products/coproducts)
- **Monad transformer laws** (lift laws, transformer composition)
- **Infinite-dimensional laws** (Kolmogorov extension, zero-one laws)
- **Ergodic theory laws** (invariant σ-algebras, ergodic decomposition)
