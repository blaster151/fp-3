# DESIGN_PLAN_NEXT: Resolution of Relative Monads and Loose-Monad Equivalence

## 0. Context Anchoring
- ⏳ **Living iteration status**: this document is the latest committed snapshot of an intentionally evolving plan. Treat every bullet as actionable for the current implementation push, while expecting future prompts to layer in additional results from the paper as we continue the DESIGN_PLAN_NEXT series.
- 📌 Focus on Definitions 5.25–5.28 **plus Propositions 5.29–5.30, Remark 5.33, Corollary 5.34, and Proposition 5.37** from *The formal theory of relative monads*.
- 🎯 Goal: turn the paper's notion of a **resolution** of a relative monad \(T\), the resulting category \(\mathrm{Res}(T)\), the induced loose-monad equivalence, **the composition/pasting behaviour of relative adjunctions described in Propositions 5.29 and 5.30 together with the resolute-composition and functorial consequences captured in Remark 5.33 and Corollary 5.34, and the Proposition 5.37 transport of an \(\ell'\)-monad across a left relative adjoint to obtain a \(j\)-monad plus the associated `(ℓ'!, r')` morphism** into executable structures, oracles, and laws inside the FP/TS codebase.
- 🧭 Maintain compatibility with existing relative monad/adjunctor modules (`relative/relative-monads.ts`, `relative/relative-adjunctions.ts`, etc.) and the project's oracle-driven norms.
- 📚 **Numbered references stay anchored to the paper itself**: maintain a short paraphrase for each cited result in `KNOWLEDGE_BASE.md` (and/or the resolution module docs) so implementers can cross-check meaning without re-deriving the statement, while still pointing back to the paper for authoritative detail. This keeps the design living with the source rather than duplicating proofs inside code comments or symbol names.

## 1. Resolution Data Structure (Definition 5.25)
1. **Type-Level Design**
   - Define a `Resolution<R, J, E>` interface capturing:
     - a tight inclusion `j: A → E` (tight cell in virtual equipment layer),
     - a loose morphism `e: A → C` that realises the "resolution" apex condition,
     - comparison isomorphisms witnessing that both composites `A → E → C` coincide with the given relative monad structure `T`.
   - Reuse existing representation patterns for tight/loose morphisms (see `virtual-equipment` layer) to avoid ad-hoc encodings, **annotating the resolution object with the tight cell `ℓ'`, the auxiliary square data whose pasting is constrained by Proposition 5.30, _and the fully-faithful markers for any right leg `r'` so Example 5.31's "postcompose by a fully faithful" special case is available without recomputation_, alongside a `resolutePair` record flagging when `(ℓ_2, ℓ')` satisfies Remark 5.33's criterion (i.e., `ℓ_2` carries a right adjoint) so resolute adjunctions are discoverable without search, plus a `leftAdjointTransport` capsule storing the Proposition 5.37 payload (the data that pushes an \(\ell'\)-monad across a left relative adjoint to a \(j\)-monad together with the resulting `(ℓ'!, r')` morphism).**
2. **Compatibility Constraints**
   - Express the equalities demanded in Definition 5.25 as explicit witnesses rather than axioms.
   - Require coherence data aligning `e` with the relative adjunction `(L ⊣ J ⊣ E)` so that upgrades to oracles have all inputs, **including the compatibility squares that Propositions 5.29 and 5.30 need when transporting and pasting adjunction data across tight-cell precomposition, the resolute-composition certificates that Remark 5.33 uses to guarantee composite relative adjunctions exist, the identity-unit data singled out in Corollary 5.32, and the Proposition 5.37 witnesses that describe how \(\ell'\)-monads and their morphisms push forward along left relative adjoints.**
3. **Oracle Skeleton**
   - Draft `checkResolutionOfRelativeMonad(resolution, T)` returning `{ holds, details, witnesses }`:
     - verifies commutative triangles via existing composition utilities,
     - confirms the isomorphism conditions with constructive witnesses (using `equateTightCells` style helpers),
     - attaches metadata for the apex `C` needed later when building categories,
     - **records whether the Propositions 5.29–5.30 precomposition/pasting hypotheses are met (e.g. tightness of `ℓ'`, functorial extension witnesses, verification that the pasted outer rectangle recreates the original relative adjunction), tracks Remark 5.33's resolute-composition prerequisites (right-adjoint availability for the participating legs and compatibility of left/right composites), when `ℓ'` postcomposes with a fully faithful `r'` exports the induced `(ℓ'!, r')` adjunction data promised by Example 5.31 alongside the equality-check payloads that Corollary 5.32 will consume, and captures the Proposition 5.37 transport data (showing how the resolution supports pushing \(\ell'\)-monads across left relative adjoints).**

## 2. Morphisms of Resolutions & Category Structure
1. **Morphisms Encoding**
   - Introduce a type for morphisms between resolutions capturing pairs `(f_A, f_E)` making the natural square commute.
   - Ensure morphisms preserve both tight and loose structure, respecting the splittings mentioned in Definition 5.25.
   - **Include composition-tracking metadata describing how morphisms interact with tight precomposition so that the functoriality statement in Proposition 5.29, the pasting law from Proposition 5.30, the resolute-composition checks from Remark 5.33, the fully-faithful postcomposition from Example 5.31, and the left-relative-adjoint transport from Proposition 5.37 become checkable (with special attention to the `(ℓ'!, r')` morphism that upgrades an \(\ell'\)-monad to a \(j\)-monad).**
2. **Category Construction**
   - Build `categoryOfResolutions(T)` producing an object satisfying `Category` interface (cf. `cat-to-graph.ts`).
   - Provide:
     - identity morphisms derived from identity tight/loose cells,
     - composition operation with explicit witness tracking showing the composite diagram still commutes,
     - **a "precomposition with tight cell" endofunctor capturing the action described in Proposition 5.29, together with witnesses that it is functorial and compatible with the Proposition 5.30 pasting law (i.e. two-stage precomposition equals the pasted single stage), while recognising fully faithful inputs so Example 5.31's adjunction embedding is exposed as a structured natural transformation, elevating Remark 5.33/Corollary 5.34 by recording when iterated precomposition supplies a resolute composite adjunction and by materialising the induced functor on left morphisms promised by Corollary 5.34, and threading the Proposition 5.37 transport so left relative adjoints act functorially on resolutions and surface the induced \(j\)-monad plus `(ℓ'!, r')` morphism as part of the category structure.**
3. **Category-Oriented Oracles**
   - Implement `checkResolutionCategoryLaws` reusing the generic category law oracles but enriched with resolution-specific diagnostics (e.g. failure indicates which diagram broke).
   - Register this oracle in the relative layer to maintain global oracle registry completeness.
   - **Add an oracle `checkRelativeAdjunctionPrecomposition` certifying the Proposition 5.29 construction (including functoriality) and extend it with a `pasting` branch that validates the Proposition 5.30 condition that the pasted outer triangle is a relative adjunction iff the inner one is, a `resoluteComposition` branch that enforces Remark 5.33's compatibility requirements for composing relative adjunctions, a `fullyFaithfulPostcomposition` branch that checks Example 5.31's promise, uses Corollary 5.32's identity-unit test to decide when the induced adjunction collapses to the base one, and exports the left-morphism functoriality witnesses asserted in Corollary 5.34, plus a `leftAdjointTransport` branch encapsulating Proposition 5.37 by producing the transported \(j\)-monad, the `(ℓ'!, r')` morphism, and verification that the transport respects the previously recorded precomposition/pasting data.**

## 3. Loose-Adjunction Induced Loose Monad, Precomposition, and Pasting (Lemma 5.27 & Propositions 5.29–5.30)
1. **Loose Adjunction Construction**
   - Encode the loose adjunction `C(1_A, -) ⊣ E(j, -)` using our existing adjunction combinators.
   - Provide a builder `looseAdjunctionFromResolution(resolution)` returning witnesses for unit/counit triangles.
   - **Extend this builder with `precomposeLooseAdjunction(tightCell, adjunction)` that realises the Proposition 5.29 transformation `ℓ' ⊣ (ℓ'j)` and packages the associated tight-cell witness data, while simultaneously storing the auxiliary morphisms required by Proposition 5.30 so the outer adjunctions can be rebuilt by pasting, the resolute-composition guarantees needed for Remark 5.33, the fully faithful checkpoints needed to emit the `(ℓ'!, r')` adjunction of Example 5.31 and the Corollary 5.34 left-morphism functor, and a `transportAlongLeftAdjoint` variant implementing Proposition 5.37 that takes a relative adjunction along a left relative adjoint and produces the transported \(j\)-monad plus the canonical monad morphism `(ℓ'!, r')`, all sharing the same witness pipeline.**
  - ✅ Implemented `looseAdjunctionFromResolution`, `precomposeLooseAdjunction`, `pasteLooseAdjunctionAlongResolution`, `postcomposeLooseAdjunctionAlongFullyFaithful`, `composeLooseAdjunctionResolutely`, and `transportLooseAdjunctionAlongLeftAdjoint` so Proposition 5.29, Proposition 5.30, Example 5.31, Remark 5.33, and Proposition 5.37 witnesses populate resolution metadata, and extended Section 3.2's morphism functoriality toolkit so Example 5.31/Remark 5.33 witnesses propagate across resolution morphisms. ✅ Pushed Proposition 5.37 transport data through resolution morphisms so the `(ℓ'!, r')` monad morphism is available functorially. ✅ Threaded the Proposition 5.37 transport metadata through the loose-monad isomorphism/identification diagnostics so Lemma 5.27 and Corollary 5.28 surface the `(ℓ'!, r')` comparison explicitly. ✅ Reflected the richer `(ℓ'!, r')` narratives inside LAWS.md, the relative law registry, and RELATIVE-MONAD-LAYER.md so external tooling and documentation advertise the transport comparison payload. ⏭️ Follow-up: extend `USAGE_CHEATSHEET.md` with an enumeration snippet that prints the Proposition 5.37 `(ℓ'!, r')` transport narratives surfaced by the resolution oracles.
2. **Loose Monad Extraction**
   - Using the above, derive the corresponding loose monad and expose it through `looseMonadFromResolution(resolution)`.
   - Ensure the construction is functorial in morphisms of resolutions to support later categorical proofs, **and make the functoriality explicit for both the original adjunction and its Proposition 5.29 precomposition, including the extra coherence demanded when those precompositions are pasted as in Proposition 5.30, the resolute-composition functoriality that Remark 5.33/Corollary 5.34 require, the degeneracy checks where Corollary 5.32 says both induced `j`-monads coincide, and the Proposition 5.37 transport so the induced \(j\)-monads and `(ℓ'!, r')` morphisms persist under morphisms of resolutions.**
3. **Oracle for Lemma 5.27**
   - Implement `checkLooseMonadIsomorphism(resolution, T)` that:
     - compares the loose monad from the adjunction with `E(j, -)T`,
     - produces explicit natural isomorphisms witnessing equivalence (string diagram reasoning encoded as equality checks),
     - logs the coherence data for debugging/documentation,
     - **incorporates Propositions 5.29–5.30 by verifying that precomposed adjunctions induce naturally isomorphic loose monads, that pasted adjunctions agree with the composed ones, generates reusable witnesses for the functorial and pasting extensions, enforces Remark 5.33's criterion when composing relative adjunctions (rejecting incompatible composites with constructive counter-witnesses), invokes the Corollary 5.32 identity-unit oracle to confirm that the two `j`-monads match whenever the postcomposition collapses to an ordinary relative adjunction, and extends to Proposition 5.37 by checking that transporting along a left relative adjoint yields a valid \(j\)-monad whose `(ℓ'!, r')` morphism aligns with all stored witnesses.**

## 4. Corollary 5.28 Integration (Loose-Monad Identifications)
1. **Automated Identification**
   - Provide helper `identifyLooseMonadFromResolution(resolution)` returning the canonical isomorphism specified in the corollary.
   - Link this helper to the `checkLooseMonadIsomorphism` oracle for shared witness reuse, **covering the base adjunction, its Proposition 5.29 precomposition variants, the Proposition 5.30 pasted adjunction scenarios, Remark 5.33's resolute-composition composites, Corollary 5.32's identity-driven collapse, and the Proposition 5.37 transports so the induced \(j\)-monad isomorphisms stay observable.**
3. **Corollary 5.32 Identity Criterion**
   - Add a `checkIdentityUnitForRelativeAdjunction(ℓ1, ℓ2, η)` helper ensuring the identities and unit satisfy Corollary 5.32, returning whether a genuine adjunction exists and whether the two induced `j`-monads coincide.
   - Thread this helper into the resolution registry so Example 5.31 postcompositions can quickly confirm when they land back inside the original adjunction data **and so resolute composites (per Remark 5.33) surface their right-adjoint witnesses for Corollary 5.34's functorial assignment while feeding Proposition 5.37 transports that test whether the identity-unit collapse persists after moving along left relative adjoints.**
2. **Documentation & LAWS.md Hooks**
   - Add an entry in `LAWS.md` describing the corollary with references to the new oracle and witnesses.
   - Update `relative-laws.ts` to surface the law object, aligning with the "law + oracle" documentation strategy.

## 5. Testing & Witness Strategy
1. **Example Resolutions**
   - Construct concrete sample resolutions (e.g., from known relative monads in `examples/` or `relative/` modules) to feed the oracles.
   - Use property-based sampling where feasible to stress-test coherence conditions.
   - **Include explicit fixtures exercising the Proposition 5.29 composition (e.g., precomposing a known relative adjunction with a tight cell) and the Proposition 5.30 pasting law (e.g., verifying that a pasted outer triangle is adjoint iff the inner triangle is) so the new oracles have concrete data, cover Example 5.31 by instantiating a fully faithful `r'` whose postcomposition is tracked end-to-end, add resolute-composition scenarios demonstrating Remark 5.33 and Corollary 5.34 (e.g., composing compatible relative adjunctions and extracting the induced functor on left morphisms), and build Proposition 5.37 fixtures where an \(\ell'\)-monad transports across a left relative adjoint to produce the promised \(j\)-monad plus `(ℓ'!, r')` morphism.**
2. **Witness Preservation**
   - Whenever the oracles prove an isomorphism, store the resulting witnesses in the resolution objects for downstream reuse (no recomputation).
   - Ensure compatibility with the oracle registry scripts (`scripts/verify-oracle-registry.mjs`).
   - **Persist Proposition 5.29 witnesses (functoriality certificates, tight-cell coherence), the Proposition 5.30 pasting witnesses (equivalence between inner and outer adjunctions), the Remark 5.33/Corollary 5.34 artifacts (resolute pair detection, composite adjunction witnesses, left-morphism functor construction), the Example 5.31/Corollary 5.32 datasets (fully faithful flags, identity-unit confirmations), and the Proposition 5.37 transport artefacts (\(j\)-monad structure maps, `(ℓ'!, r')` morphisms, and compatibility checks with stored precomposition/pasting data) so later stages can rely on cached constructions.**
3. **CI Alignment**
   - Plan to extend tests in `test/` with targeted suites verifying the new oracles, keeping the deterministic build workflow intact.

## 6. Roadmap & Next Iterations
1. **Immediate Deliverables**
   - Implement data interfaces, constructors, and baseline oracles outlined above.
   - Prepare scaffolding tests with at least one explicit resolution example **plus at least one Proposition 5.29 precomposition, one Proposition 5.30 pasting example, one resolute composite as in Remark 5.33/Corollary 5.34, one fully faithful Example 5.31 scenario feeding the Corollary 5.32 identity oracle, and one Proposition 5.37 transport demonstrating the \(\ell'\)-to-\(j\) monad upgrade.**
2. **Future Refinements**
   - Investigate functoriality of `Res(T)` with respect to morphisms of relative monads (beyond current excerpt), **leveraging insights from Propositions 5.29–5.30, Remark 5.33, Example 5.31, Corollary 5.34, and Proposition 5.37 to seed higher-level functorial, pasting, resolute-composition, fully faithful postcomposition, and left-relative-adjoint transport behaviour.**
   - Explore links between resolutions and Kleisli/completion processes within our virtual equipment layer.
   - Anticipate extension to the remaining sections of the paper (e.g., equivalence with factorisation systems) for future DESIGN_PLAN_NEXT iterations, **ensuring Propositions 5.29–5.30, Remark 5.33, Corollary 5.34, and Proposition 5.37 oracles remain compatible as the plan evolves.**

---
- 🔄 **Feedback Loop**: As we encode each bullet above, document discovered invariants in `RELATIVE-MONAD-LAYER.md` and update oracles registry ensuring coverage.
- ✅ **Success Criteria**: Executable oracles certifying Lemma 5.27, Corollary 5.28, Propositions 5.29–5.30, Remark 5.33, Example 5.31, Corollary 5.32, Corollary 5.34, and Proposition 5.37; a fully-typed category of resolutions equipped with resolute-composition, left-relative-adjoint transport, and left-morphism functorial tooling; and integration with existing relative monad infrastructure without violating established project norms.
