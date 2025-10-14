/**
 * Law catalogue for relative monads staged atop the virtual equipment layer.
 * The identifiers mirror Definition 4.1 of Arkor–McDermott so the upcoming
 * oracle implementations can point back to the precise unit and extension
 * diagrams once the 2-cell equalities are executable.
 */
export interface RelativeMonadLawDescriptor {
  readonly name: string;
  readonly registryPath: string;
  readonly summary: string;
}

export interface RelativeAdjunctionLawDescriptor {
  readonly name: string;
  readonly registryPath: string;
  readonly summary: string;
}

export interface RelativeComonadLawDescriptor {
  readonly name: string;
  readonly registryPath: string;
  readonly summary: string;
}

export interface RelativeCompositionLawDescriptor {
  readonly name: string;
  readonly registryPath: string;
  readonly summary: string;
}

export interface RelativeResolutionLawDescriptor {
  readonly name: string;
  readonly registryPath: string;
  readonly summary: string;
}

export const RelativeMonadLawRegistry = {
  unitFraming: {
    name: "Relative monad unit framing",
    registryPath: "relativeMonad.unit.framing",
    summary:
      "The unit 2-cell η : E(j,j) ⇒ E(j,t) must inherit j on the left and t on the right, matching Definition 4.1's first diagram.",
  },
  extensionFraming: {
    name: "Relative monad extension framing",
    registryPath: "relativeMonad.extension.framing",
    summary:
      "The extension operator μ : E(j,t) ⇒ E(t,t) must be framed by the root on the left and the carrier on the right so the multiplication diagram is well defined.",
  },
  representableLooseMonoid: {
    name: "Relative monad representable loose monoid bridge",
    registryPath: "relativeMonad.representableLooseMonoid",
    summary:
      "The loose arrow E(j,t) of a j-relative monad should be representable via the left restriction of the identity along j, realising the monoid-in-X[j] presentation highlighted in Theorem 4.16.",
  },
  fiberEmbedding: {
    name: "Relative monad fiber embedding",
    registryPath: "relativeMonad.fiberEmbedding",
    summary:
      "Theorem 4.22 embeds a j-relative monad into the Street fiber X[j] via E(j,-); the analyzer records the induced fiber monad once representability data is supplied and keeps the fully faithful comparison pending.",
  },
  representableRecovery: {
    name: "Representable relative monad recovery",
    registryPath: "relativeMonad.representableRecovery",
    summary:
      "Remark 4.24 states that representable roots recover Levy's representable relative monads and Altenkirch–Chapman–Uustalu skew monoids; the analyzer aggregates the fiber embedding with any supplied skew-monoid witnesses while flagging remaining comparisons as pending.",
  },
  skewMonoidBridge: {
    name: "Relative monad skew-monoid equivalence",
    registryPath: "relativeMonad.skewMonoid.bridge",
    summary:
      "Under Theorem 4.29’s hypotheses (left extensions along j, preservation, j-absolute and dense roots, invertible right unit), a j-relative monad determines a monoid in the left skew-monoidal category X[j]; this law tracks the aggregated witness stack.",
  },
  enrichedCompatibility: {
    name: "Enriched relative monad compatibility",
    registryPath: "relativeMonad.enriched.compatibility",
    summary:
      "Section 8 specialises the relative monad calculus to V-enriched equipments; the analyzer confirms the enriched hom object and tensor comparisons reuse the monad’s unit and extension witnesses.",
  },
  setEnrichedCompatibility: {
    name: "Set-enriched relative monad correspondences",
    registryPath: "relativeMonad.enriched.setCompatibility",
    summary:
      "Example 8.14 catalogues classical Set-enriched presentations; the analyzer insists the fully faithful root and every correspondence reuse the loose arrow, unit, and extension recorded by the relative monad.",
  },
  indexedContainerCompatibility: {
    name: "Indexed container relative monad diagnostics",
    registryPath: "relativeMonad.mnne.indexedContainers",
    summary:
      "Example 4 of *Monads Need Not Be Endofunctors* realises indexed containers as relative monads; the analyzer enumerates finite families, checks the Example 4 unit and substitution data, and verifies the relative monad laws hold for every sample.",
  },
  vectorKleisliSplitting: {
    name: "Finite vector Kleisli splitting diagnostics",
    registryPath: "relativeMonad.mnne.vectorKleisli",
    summary:
      "Example 5 and Theorem 3 confirm the Kleisli category of Vec has matrices as morphisms with multiplication as composition; the analyzer enumerates Boolean matrices, checks identity columns, and verifies associativity against the relative extension operator.",
  },
  vectorArrowCorrespondence: {
    name: "Finite vector arrow correspondence",
    registryPath: "relativeMonad.mnne.vectorArrowCorrespondence",
    summary:
      "Section 2 of *Monads Need Not Be Endofunctors* interprets Boolean matrices as arrows for the Vec relative monad; the analyzer compares an arr/∘ witness against the relative monad’s unit and extension to ensure both viewpoints agree on every finite sample.",
  },
  lambdaKleisliSplitting: {
    name: "Lambda-calculus Kleisli substitution diagnostics",
    registryPath: "relativeMonad.mnne.lambdaKleisli",
    summary:
      "Example 6 describes Kleisli morphisms for Lam as capture-avoiding substitutions; the analyzer reuses the λ-relative monad witness to confirm trivial substitutions act as identities and composition agrees with sequential substitution.",
  },
  functorCategoryLaxMonoidal: {
    name: "[J,C] lax monoidal structure via Lan_j",
    registryPath: "relativeMonad.mnne.functorCategoryLaxMonoidal",
    summary:
      "Section 3.2 of *Monads Need Not Be Endofunctors* endows the functor category [J,C] with a lax monoidal structure using Lan_j; the analyzer verifies the canonical inclusion, unitors, and associator coincide with Lan_j ∘ (-) on sample functors and that the triangle identity holds.",
  },
  functorCategoryLaxMonoid: {
    name: "Lax monoids in [J,C] from relative monads",
    registryPath: "relativeMonad.mnne.functorCategoryLaxMonoid",
    summary:
      "Theorem 3 identifies j-relative monads with lax monoids in [J,C]; the analyzer checks unit and multiplication witnesses against the Lan_j tensor, confirming μ ∘ (η ⊗ id) = λ, μ ∘ (id ⊗ η) = ρ, and the α-mediated associativity law.",
  },
  wellBehavedInclusion: {
    name: "Well-behaved inclusion full faithfulness",
    registryPath: "relativeMonad.mnne.wellBehavedInclusion",
    summary:
      "Definition 4.1 demands the comparison functor j : J → C be fully faithful; the oracle enumerates finite hom-sets to witness that J induces bijections C(JX, JY) ≅ J(X, Y) on sample objects.",
  },
  relativeMonadLanExtension: {
    name: "Lan_J T extends a relative monad to a monad on C",
    registryPath: "relativeMonad.mnne.lanExtension",
    summary:
      "Theorem 7 of *Monads Need Not Be Endofunctors* builds a monad on C from a well-behaved inclusion; the analyzer checks the Lan_J T functor, unit, and multiplication satisfy the monad laws while the comparison κ_T witnesses the Section 4.3 equivalence with the original relative monad.",
  },
  enrichedEilenbergMooreAlgebra: {
    name: "Enriched Eilenberg–Moore T-algebra",
    registryPath: "relativeMonad.enriched.eilenbergMooreAlgebra",
    summary:
      "Definition 8.16 equips a carrier with an extension operator whose unit and multiplication diagrams commute; the oracle checks those composites reuse the enriched unit/extension witnesses and share the expected boundaries.",
  },
  enrichedKleisliInclusion: {
    name: "Enriched Kleisli identity-on-objects inclusion",
    registryPath: "relativeMonad.enriched.kleisliInclusion",
    summary:
      "Lemma 8.7 defines the V-functor k_T : A → Kl(T) with κ_T mediating the opalgebra comparison; the oracle confirms the inclusion reuses the relative monad’s loose arrow, unit, and extension witnesses while certifying the identity-on-objects and opalgebra morphism triangles.",
  },
  enrichedYoneda: {
    name: "Enriched Yoneda embedding diagnostics",
    registryPath: "relativeMonad.enriched.yoneda",
    summary:
      "Example 8.6 realises the Yoneda embedding Y : Z → PZ; the analyzer checks the representable presheaf reuses the enriched hom object, tensor comparison, and extension witnesses.",
  },
  enrichedYonedaDistributor: {
    name: "Enriched Yoneda distributor factorisation",
    registryPath: "relativeMonad.enriched.yonedaDistributor",
    summary:
      "Lemma 8.7 compares the red/green composites through PZ(p,q); the analyzer requires both composites to share boundaries with the Yoneda witness, coincide with the recorded factorisation, and reuse the right lift unit witnessing q ▷ p.",
  },
  enrichedVCatSpecification: {
    name: "Enriched V-Cat relative monad specification",
    registryPath: "relativeMonad.enriched.vcatSpecification",
    summary:
      "Theorem 8.12 packages a j-relative monad in V-Cat via unit/multiplication triangles, functorial identity/composition, and τ-naturality; the analyzer checks every composite reuses the recorded enriched unit and extension 2-cells.",
  },
  identityReduction: {
    name: "Relative monad identity-root reduction",
    registryPath: "relativeMonad.identityReduction",
    summary:
      "When the root j is the identity, the relative monad data should reduce to an ordinary monad as in Corollary 4.20, recovering the classical Eilenberg–Moore setting.",
  },
  associativityPasting: {
    name: "Relative monad associativity pasting",
    registryPath: "relativeMonad.extension.associativity",
    summary:
      "The two composites appearing in Definition 4.1's associativity diagram must be horizontally composable, preparing for executable equality checks.",
  },
} satisfies Record<string, RelativeMonadLawDescriptor>;

export type RelativeMonadLawKey = keyof typeof RelativeMonadLawRegistry;

export const listRelativeMonadLaws = (): ReadonlyArray<RelativeMonadLawDescriptor> =>
  Object.values(RelativeMonadLawRegistry);

export const RelativeAdjunctionLawRegistry = {
  framing: {
    name: "Relative adjunction root/left/right framing",
    registryPath: "relativeAdjunction.framing",
    summary:
      "The root j : A → E, left ℓ : A → C, and right r : C → E must share boundaries so that the hom-isomorphism compares C(ℓ-, -) with E(j-, r-).",
  },
  homIsomorphism: {
    name: "Relative adjunction hom-set isomorphism framing",
    registryPath: "relativeAdjunction.homIso.framing",
    summary:
      "The chosen 2-cells witnessing C(ℓ-, -) ≅ E(j-, r-) must have matching frames and reuse ℓ and r as their vertical boundaries, mirroring Definition 5.1.",
  },
  section: {
    name: "Right-adjoint sections for relative adjunctions",
    registryPath: "relativeAdjunction.section.partialRightAdjoint",
    summary:
      "Lemma 6.38 equips a relative adjunction with a partial right adjoint that is identity-on-j objects; the oracle checks the recorded section reuses ℓ, matches the hom-set bijection, and aligns its arrow action with ℓ.",
  },
  pasting: {
    name: "Relative adjunction pasting law",
    registryPath: "relativeAdjunction.pasting.leftMorphism",
    summary:
      "Proposition 5.30 pastes a nested pair of relative adjunctions into a single j'-relative one; the oracle will certify that the induced left morphism and composite boundaries line up.",
  },
  fullyFaithfulPostcomposition: {
    name: "Fully faithful postcomposition of relative adjunctions",
    registryPath: "relativeAdjunction.postcomposition.fullyFaithful",
    summary:
      "Example 5.31 records that a fully faithful right adjoint postcomposes the root and right leg while fixing the left leg; the oracle checks that u ∘ j and u ∘ r match the supplied result and that the tight cell is fully faithful.",
  },
  inducedMonadsCoincide: {
    name: "Relative adjunction induced monads coincide",
    registryPath: "relativeAdjunction.inducedMonads.coincide",
    summary:
      "Corollary 5.32 shows that the j- and j'-relative monads obtained from the same adjunction data agree when the unit/counit conditions hold; the oracle now compares root, carrier, loose arrow, and unit/extension frames directly.",
  },
  resolutePair: {
    name: "Resolute pairs of relative adjunctions",
    registryPath: "relativeAdjunction.resolute",
    summary:
      "Remark 5.33 observes that Corollary 5.32's hypotheses recover resolute pairs when the postcomposed right adjoint is fully faithful; the oracle will surface the required fully faithful witness alongside the coincident-monad diagnostics.",
  },
  resoluteLeftMorphism: {
    name: "Resolute pair induced left morphism",
    registryPath: "relativeAdjunction.resolute.leftMorphism",
    summary:
      "Corollary 5.34 upgrades a resolute pair to a left morphism by precomposing along Proposition 5.29 and pasting via Proposition 5.30; the oracle will aggregate those reports to certify the induced morphism.",
  },
  ordinaryLeftAdjointComposition: {
    name: "Ordinary left adjoint composition via resolute pasting",
    registryPath: "relativeAdjunction.resolute.identityRoot",
    summary:
      "Example 5.35 specialises the resolute construction to j = 1, showing that ordinary left adjoints compose with j-relative ones by precomposing their apices; the oracle will wrap the Corollary 5.34 diagnostics for this identity-root case.",
  },
  relativeMonadModule: {
    name: "Relative monad module from resolute adjunction",
    registryPath: "relativeAdjunction.relativeMonad.module",
    summary:
      "Proposition 5.36 equips the Corollary 5.34 assignment with a j-relative monad module structure; the oracle will compare the resulting action against the Theorem 5.24 resolution once module analyzers are implemented.",
  },
  relativeMonadPasting: {
    name: "Relative monad pasting along left adjunctions",
    registryPath: "relativeAdjunction.relativeMonad.pasting",
    summary:
      "Proposition 5.37 pastes a j-relative monad along a left j'-relative adjunction, producing a j'-relative monad together with a morphism back to the source; the oracle will demand the pasted unit and extension 2-cells.",
  },
  relativeMonadLeftOpalgebra: {
    name: "Left relative adjoint as canonical opalgebra",
    registryPath: "relativeAdjunction.relativeMonad.leftOpalgebra",
    summary:
      "Proposition 6.25 equips the left leg of a relative adjunction with a T-opalgebra structure for the induced j-relative monad; the oracle will ensure the action reuses the adjunction boundaries and aligns with the Theorem 5.24 resolution.",
  },
  relativeMonadRightAlgebra: {
    name: "Right relative adjoint as canonical algebra",
    registryPath: "relativeAdjunction.relativeMonad.rightAlgebra",
    summary:
      "Proposition 6.25 dually makes the right leg of a relative adjunction into a T-algebra; the oracle will demand witnesses that the action reuses the adjunction boundaries and matches the induced monad.",
  },
  relativeMonadResolutionFunctor: {
    name: "Canonical (op)algebra functors into Res(T)_C",
    registryPath: "relativeAdjunction.relativeMonad.resolutionFunctor",
    summary:
      "Proposition 6.26 packages the canonical T-(op)algebras into functors landing in the resolute subcategory Res(T)_C; the oracle will request the functorial data, naturality witnesses, and compatibility with the Proposition 6.25 constructions.",
  },
  relativeMonadAdjunctionOpalgebraTransport: {
    name: "Relative adjunction transport of T-opalgebras",
    registryPath: "relativeAdjunction.relativeMonad.opalgebraTransport",
    summary:
      "Proposition 6.27 sends a T-opalgebra along a j-relative adjunction to a T'-algebra for the pasted monad of Proposition 5.37; the oracle will demand the comparison pastings, boundary alignment, and naturality in both t and T.",
  },
  relativeMonadAdjunctionAlgebraTransport: {
    name: "Relative adjunction transport of T-algebras",
    registryPath: "relativeAdjunction.relativeMonad.algebraTransport",
    summary:
      "Proposition 6.27 dually turns a T-algebra into a T'-opalgebra via the same adjunction; the analyzer will request the induced action witnesses and confirm they reuse the adjunction boundaries and pasted monad data.",
  },
  relativeMonadAdjunctionTransportEquivalence: {
    name: "Relative adjunction transport equivalence",
    registryPath: "relativeAdjunction.relativeMonad.transportEquivalence",
    summary:
      "Remark 6.28 upgrades the Proposition 6.27 transports to an equivalence of categories; the oracle will gather mutually inverse functors, unit/counit comparison witnesses, and diagnostics showing the transports recover the original (op)algebras.",
  },
  relativeMonadPastingFullyFaithful: {
    name: "Fully faithful relative monad pasting",
    registryPath: "relativeAdjunction.relativeMonad.pastingFullyFaithful",
    summary:
      "Example 5.38 shows that a fully faithful right adjoint upgrades Proposition 5.37 to a functor between categories of relative monads; the oracle will require the fully faithful witness to track the induced functor on objects and morphisms.",
  },
  relativeMonadPastingAdjunction: {
    name: "Relative monad transport across adjunctions",
    registryPath: "relativeAdjunction.relativeMonad.pastingAdjunction",
    summary:
      "Example 5.39 applies Proposition 5.37 twice to compose a j-relative monad with an ordinary adjunction whose right leg is fully faithful, yielding functors Mnd(A) → RMnd(j') and RMnd_j(j) → RAAdj_{j'}(j'); the oracle will aggregate both pasting diagnostics.",
  },
  relativeMonadCompositeThroughRoot: {
    name: "Relative monad/adjunction composite through the root",
    registryPath: "relativeAdjunction.relativeMonad.compositeThroughRoot",
    summary:
      "Corollary 5.40 combines Proposition 5.36 with Proposition 5.37 to act on j-relative adjunctions whose right leg factors through the root, producing a j'-relative monad and module morphism; the oracle will compare the pasted action against the module diagnostics.",
  },
  relativeMonadLiteratureRecoveries: {
    name: "Classical constructions recovered by relative monad pasting",
    registryPath: "relativeAdjunction.relativeMonad.literatureRecoveries",
    summary:
      "Example 5.41 checks that Corollary 5.40 reproduces Hutson's j-monads when the postcomposition is the identity and Altenkirch–Chapman–Uustalu's Theorem 5.5 when j = j'; the oracle will demand witnesses linking the pasted monad to the cited constructions.",
  },
  precomposition: {
    name: "Relative adjunction tight precomposition",
    registryPath: "relativeAdjunction.precomposition.tight",
    summary:
      "Proposition 5.29 transports j-relative adjunctions along tight cells u : A' → A by forming (ℓ ∘ u ⊣_{j ∘ u} r); the oracle checks the shared domain required for this precomposition.",
  },
  unitCounit: {
    name: "Relative adjunction unit/counit presentation",
    registryPath: "relativeAdjunction.unitCounit.presentation",
    summary:
      "Lemma 5.5 supplies a unit–counit presentation for relative adjunctions. The oracle validates boundary framing when an explicit presentation accompanies the adjunction data and records a pending diagnostic otherwise, preparing the ground for future mate-calculus witnesses.",
  },
  pointwiseLeftLift: {
    name: "Relative adjunction from pointwise left lifts",
    registryPath: "relativeAdjunction.pointwiseLeftLift",
    summary:
      "Proposition 5.8 computes the right leg of a relative adjunction as a pointwise left lift of ℓ along j; the oracle checks the shared framing between the lift data and the adjunction.",
  },
  rightExtension: {
    name: "Relative adjunction from left extensions",
    registryPath: "relativeAdjunction.rightExtension",
    summary:
      "Proposition 5.10 reconstructs right relative adjoints from left extensions along a fully faithful root; the oracle threads the j-absolute, pointwise, and fully faithful prerequisites.",
  },
  colimitPreservation: {
    name: "Left relative adjoint colimit preservation",
    registryPath: "relativeAdjunction.colimitPreservation",
    summary:
      "Proposition 5.11 shows that left relative adjoints preserve those colimits preserved by the root; the oracle compares the shared weight and verifies both preservation checks.",
  },
  leftMorphism: {
    name: "Left morphisms of relative adjunctions",
    registryPath: "relativeAdjunction.leftMorphism",
    summary:
      "Definition 5.14 packages morphisms in RAAdj_j(j) as tight cells between apices equipped with a framed 2-cell; the oracle checks the shared root and left-leg boundaries before feeding Lemma 5.17’s slice embedding.",
  },
  rightMorphism: {
    name: "Right morphisms of relative adjunctions",
    registryPath: "relativeAdjunction.rightMorphism",
    summary:
      "Definition 5.18 dually packages morphisms in RAdj^j(j); the oracle validates the shared root, right-leg framing, and comparison tight cell used in the coslice embedding of Lemma 5.21.",
  },
  strictMorphism: {
    name: "Strict morphisms of relative adjunctions",
    registryPath: "relativeAdjunction.strictMorphism",
    summary:
      "Definition 5.23 demands that a morphism be simultaneously left and right; the oracle aggregates both framing reports and enforces the common comparison tight cell.",
  },
  resolution: {
    name: "Relative adjunction/monad resolution",
    registryPath: "relativeAdjunction.resolution.relativeMonad",
    summary:
      "Theorem 5.24 sends a relative adjunction to its induced relative monad; the analyzer now derives the monad via `relativeMonadFromAdjunction` and compares the recorded unit/extension data against the adjunction’s hom-isomorphism witnesses.",
  },
} satisfies Record<string, RelativeAdjunctionLawDescriptor>;

export type RelativeAdjunctionLawKey = keyof typeof RelativeAdjunctionLawRegistry;

export const listRelativeAdjunctionLaws = (): ReadonlyArray<RelativeAdjunctionLawDescriptor> =>
  Object.values(RelativeAdjunctionLawRegistry);

export const RelativeComonadLawRegistry = {
  counitFraming: {
    name: "Relative comonad counit framing",
    registryPath: "relativeComonad.counit.framing",
    summary:
      "The counit ε : C(t,j) ⇒ C(t,t) must be framed by the carrier on the left and the root on the right, mirroring the dual of Definition 4.1.",
  },
  coextensionFraming: {
    name: "Relative comonad coextension framing",
    registryPath: "relativeComonad.coextension.framing",
    summary:
      "The coextension operator δ : C(t,j) ⇒ C(t,t) must preserve the carrier/root boundaries so the comultiplication diagram is well defined.",
  },
  corepresentableLooseComonoid: {
    name: "Relative comonad corepresentable loose comonoid bridge",
    registryPath: "relativeComonad.corepresentableLooseComonoid",
    summary:
      "The loose arrow C(t,j) of a j-relative comonad should be corepresentable via the right restriction of the identity along j, dualising Theorem 4.16.",
  },
  identityReduction: {
    name: "Relative comonad identity-root reduction",
    registryPath: "relativeComonad.identityReduction",
    summary:
      "When the root j is the identity, the relative comonad data should collapse to an ordinary comonad, dual to Corollary 4.20.",
  },
  enrichedStructure: {
    name: "Enriched relative comonad structure",
    registryPath: "relativeComonad.enriched.structure",
    summary:
      "Proposition 8.22 transports the enriched hom, cotensor, and comparison data to the relative comonad; the analyzer confirms the supplied 2-cells reuse the counit/coextension witnesses.",
  },
  coopAlgebra: {
    name: "Relative comonad coopalgebra object",
    registryPath: "relativeComonad.coopAlgebra",
    summary:
      "Theorem 8.24 guarantees a coopalgebra for every enriched relative comonad; the oracle compares the coassociativity and counit diagrams against the recorded enrichment witnesses.",
  },
} satisfies Record<string, RelativeComonadLawDescriptor>;

export type RelativeComonadLawKey = keyof typeof RelativeComonadLawRegistry;

export const listRelativeComonadLaws = (): ReadonlyArray<RelativeComonadLawDescriptor> =>
  Object.values(RelativeComonadLawRegistry);

export const RelativeCompositionLawRegistry = {
  adjunctionComposition: {
    name: "Relative adjunction composability",
    registryPath: "relativeAdjunction.composition.compatibility",
    summary:
      "Suitable relative adjunctions should compose when the right leg of the first matches the root of the second, as described around Corollary 5.34.",
  },
  monadComposition: {
    name: "Relative monad composability",
    registryPath: "relativeMonad.composition.compatibility",
    summary:
      "Relative monads that arise from composable relative adjunctions should admit compatible unit/extension framing so their composite is well defined.",
  },
  looseMonoidBridge: {
    name: "Relative monad ↔ loose monoid conversion",
    registryPath: "relativeMonad.representation.looseMonoid",
    summary:
      "The representation theorems identify j-relative monads with monoids in X[j]; this entry tracks the executable conversions between the two presentations.",
  },
} satisfies Record<string, RelativeCompositionLawDescriptor>;

export type RelativeCompositionLawKey = keyof typeof RelativeCompositionLawRegistry;

export const listRelativeCompositionLaws = (): ReadonlyArray<RelativeCompositionLawDescriptor> =>
  Object.values(RelativeCompositionLawRegistry);

export const RelativeResolutionLawRegistry = {
  resolutionWitness: {
    name: "Resolution realises Definition 5.25",
    registryPath: "relativeResolution.definition.5.25",
    summary:
      "Checks that a resolution packages the inclusion j, apex loose morphism, and comparison isomorphisms that recover the underlying j-relative monad, recording Proposition 5.29–5.30, Remark 5.33, Example 5.31, Corollary 5.32, and Proposition 5.37 metadata.",
  },
  categoryIdentities: {
    name: "Resolution category identity laws",
    registryPath: "relativeResolution.category.identities",
    summary:
      "Validates that morphisms of resolutions admit identity arrows satisfying the left/right unit axioms so Res(T) behaves as a category.",
  },
  precompositionSuite: {
    name: "Resolution precomposition and transport suite",
    registryPath: "relativeResolution.precomposition.suite",
    summary:
      "Aggregates the executable witnesses for Proposition 5.29 precomposition, Proposition 5.30 pasting, Remark 5.33/Corollary 5.34 resolute composition, Example 5.31/Corollary 5.32 fully faithful postcomposition, and Proposition 5.37 left-adjoint transport.",
  },
} satisfies Record<string, RelativeResolutionLawDescriptor>;

export type RelativeResolutionLawKey = keyof typeof RelativeResolutionLawRegistry;

export const listRelativeResolutionLaws = (): ReadonlyArray<RelativeResolutionLawDescriptor> =>
  Object.values(RelativeResolutionLawRegistry);

export const RelativeAlgebraLawRegistry = {
  algebraFraming: {
    name: "Relative algebra action framing",
    registryPath: "relativeMonad.algebra.framing",
    summary:
      "Definition 6.1 packages a T-algebra action x : E(j,e) ⇒ E(t,e); the analyzer will certify that the supplied 2-cell reuses the designated root/carrier boundaries before universal-property checks run.",
  },
  algebraMorphismCompatibility: {
    name: "Relative algebra morphism pasting conditions",
    registryPath: "relativeMonad.algebra.morphismCompatibility",
    summary:
      "Definition 6.1 demands that a morphism α : e ⇒ e' commute with both E(j,-) and E(t,-); the oracle will compare the induced pastings E(j,α) and E(t,α) against the source/target actions to pinpoint any failure.",
  },
  algebraGradedMorphisms: {
    name: "Graded relative algebra morphisms",
    registryPath: "relativeMonad.algebra.gradedMorphisms",
    summary:
      "Definition 6.29 equips T-algebra morphisms with multi-input grading data (p₁,…,pₙ); the analyzer will request those witnesses together with the displayed Street composites so graded morphisms can be compared against the underlying relative algebra actions.",
  },
  algebraGradedMorphismsAlternate: {
    name: "Graded relative algebra morphism 2-cell presentation",
    registryPath: "relativeMonad.algebra.gradedMorphismsAlternate",
    summary:
      "Remark 6.30 repackages graded T-algebra morphisms as a single 2-cell equality; the oracle will demand the pasted composite and the comparison witnesses that recover Definition 6.29 from the alternative presentation.",
  },
  algebraGradedExtensionMorphisms: {
    name: "Extension-induced graded relative algebra morphisms",
    registryPath: "relativeMonad.algebra.gradedExtensionMorphisms",
    summary:
      "Example 6.31 shows that the extension operator associated to a relative monad yields a graded morphism; the analyzer will request the extension witnesses and certify that the constructed morphism satisfies the graded comparison equations.",
  },
  opalgebraFraming: {
    name: "Relative opalgebra action framing",
    registryPath: "relativeMonad.opalgebra.framing",
    summary:
      "Definition 6.4’s T-opalgebra action x : E(e,j) ⇒ E(e,t) must respect the opalgebra carrier and root boundaries; the oracle will track the required framing data once opalgebra analyzers are wired in.",
  },
  opalgebraCarrierTriangle: {
    name: "Relative opalgebra carrier triangle",
    registryPath: "relativeMonad.opalgebra.carrierTriangle",
    summary:
      "Definition 6.4’s carrier triangle compares the monad unit composite against the opalgebra action; the analyzer records the shared codomain, carrier boundary, and witnesses so the Street equality can be checked once available.",
  },
  opalgebraExtensionRectangle: {
    name: "Relative opalgebra extension rectangle",
    registryPath: "relativeMonad.opalgebra.extensionRectangle",
    summary:
      "Definition 6.4’s extension rectangle relates the opalgebra action to the monad extension; the oracle captures the carrier, codomain, and extension witnesses pending full Street-calculus comparisons.",
  },
  opalgebraMorphismCompatibility: {
    name: "Relative opalgebra morphism pasting conditions",
    registryPath: "relativeMonad.opalgebra.morphismCompatibility",
    summary:
      "Morphisms of relative opalgebras must satisfy the dual pasting equalities; the pending oracle records the data needed to compare E(j,α) and E(t,α) against the opalgebra coactions.",
  },
  opalgebraLiteratureRecoveries: {
    name: "Relative opalgebra literature recoveries",
    registryPath: "relativeMonad.opalgebra.literatureRecoveries",
    summary:
      "Remark 6.5 identifies Definition 6.4 opalgebras with Ahrens’s modules, Maillard’s Kleisli algebras, and Lobbia’s relative right modules; the analyzer will require witnesses connecting each presentation to the relative opalgebra data.",
  },
  opalgebraIdentityRootEquivalence: {
    name: "Identity-root relative opalgebra equivalence",
    registryPath: "relativeMonad.opalgebra.identityRootEquivalence",
    summary:
      "Corollary 6.24 states that opalgebras for a 1_A-relative monad coincide with Street actions on A; the oracle will reuse the Corollary 4.20 diagnostics while demanding comparison functors and witnesses.",
  },
  algebraRestrictionFunctor: {
    name: "Relative algebra carrier restriction functor",
    registryPath: "relativeMonad.algebra.restrictionFunctor",
    summary:
      "Remark 6.2 assembles T-Alg_D as a category and sends each algebra to its carrier via a faithful functor U_T^j; the analyzer will demand the functor together with faithfulness/domain witnesses.",
  },
  partialRightAdjointFunctor: {
    name: "Partial right adjoint for Alg(T)",
    registryPath: "relativeMonad.algebra.partialRightAdjointFunctor",
    summary:
      "Corollaries 6.40–6.41 build a fully faithful partial right adjoint RAdj_j(-) to the comparison functor that is identity on the j-objects; the oracle validates the Lemma 6.38 section, the fully faithful comparison, and the fixed-point witnesses promised by Proposition 6.42.",
  },
  opalgebraResolution: {
    name: "Opalgebra-induced Lemma 6.35 resolution",
    registryPath: "relativeMonad.opalgebra.resolution",
    summary:
      "Lemma 6.47 upgrades a relative opalgebra to the Lemma 6.35 resolution by exhibiting κ_t : ℓ ⇒ f_T; the analyzer threads the algebra resolution, checks κ_t's triangle identities, and reports the nested diagnostics alongside the opalgebra data.",
  },
  partialLeftAdjointSection: {
    name: "Partial left adjoint section for RMnd_j",
    registryPath: "relativeMonad.opalgebra.partialLeftAdjointSection",
    summary:
      "Theorem 6.49 records that the Lemma 6.47 resolution yields a section RAdj_j(j) → RMnd_j whose transpose is the identity on j-objects; the oracle reuses the opalgebra-resolution report and verifies the strictness witnesses.",
  },
  algebraIndexedFamily: {
    name: "Indexed family of relative algebra categories",
    registryPath: "relativeMonad.algebra.indexedFamily",
    summary:
      "Remark 6.32 organises the categories T-Alg_D into an [X]-indexed family; the oracle will request the fibrewise objects, morphisms, and restriction functors together with witnesses that the family obeys the Street action coherence.",
  },
  algebraGlobalCategory: {
    name: "Global category of relative algebras",
    registryPath: "relativeMonad.algebra.globalCategory",
    summary:
      "Definition 6.33 packages the indexed family into Alg(T); the analyzer will demand the object/morphism assignments, composition/identity witnesses, and compatibility with the fibrewise categories.",
  },
  algebraMediatingTightCell: {
    name: "Mediating tight cell into Alg(T)",
    registryPath: "relativeMonad.algebra.mediatingTightCell",
    summary:
      "Definition 6.34 provides a tight cell f_T : A → Alg(T) mediating the algebra object of a relative monad; the oracle will request the comparison witnesses showing that f_T reuses the monad’s unit and extension data.",
  },
  algebraResolutionFromAlgebraObject: {
    name: "Resolution from a relative algebra object",
    registryPath: "relativeMonad.algebra.resolutionFromAlgebraObject",
    summary:
      "Lemma 6.35 states that a relative monad with an algebra object admits a resolution; the analyzer will compare the constructed resolution against the Section 5 diagnostics to ensure the induced adjunction agrees with the recorded witnesses.",
  },
  algebraCanonicalAction: {
    name: "Canonical relative algebra from the monad carrier",
    registryPath: "relativeMonad.algebra.canonicalAction",
    summary:
      "Example 6.3 observes that every relative monad yields a canonical algebra on its tight leg; the oracle will compare the induced action against the monad extension and unit once Proposition 6.12 diagnostics are available.",
  },
  algebraIdentityRootEquivalence: {
    name: "Identity-root relative algebra equivalence",
    registryPath: "relativeMonad.algebra.identityRootEquivalence",
    summary:
      "Corollary 6.17 states that algebras and morphisms for a 1_g-relative monad coincide with ordinary algebras on E; the oracle will reuse the Corollary 4.20 diagnostics to certify the equivalence.",
  },
  opalgebraCanonicalAction: {
    name: "Canonical relative opalgebra from the monad carrier",
    registryPath: "relativeMonad.opalgebra.canonicalAction",
    summary:
      "Example 6.6 shows that the tight leg (t, t) of a relative monad becomes a T-opalgebra; the analyzer will request the Proposition 6.19 pasting witnesses to confirm the opalgebra action reuses the root/carrier boundaries tracked in Definition 6.4.",
  },
  opalgebraExtraordinaryTransformations: {
    name: "Relative opalgebras vs extraordinary transformations",
    registryPath: "relativeMonad.opalgebra.extraordinaryTransformations",
    summary:
      "Lemma 6.7 identifies j-relative opalgebras with extraordinary transformations of the loose monad E(j,j); the analyzer records the loose monoid witnesses, checks they reuse the relative monad root/carrier/loose arrow, and leaves the Street-calculus comparison pending.",
  },
  opalgebraRightActionPresentation: {
    name: "Relative opalgebras as Street right actions",
    registryPath: "relativeMonad.opalgebra.rightActionPresentation",
    summary:
      "Definition 6.18 presents T-opalgebras as right actions in the Street skew-multicategory; the oracle will request the unary multimorphism data and coherence witnesses to compare both viewpoints.",
  },
  opalgebraRightActionFromMonoid: {
    name: "Monoid-induced Street right actions",
    registryPath: "relativeMonad.opalgebra.rightActionFromMonoid",
    summary:
      "Proposition 6.19 shows that a skew multicategory acts on itself and that any monoid yields an M-action; the analyzer will demand the multiplication/unit witnesses and confirm the resulting action matches the Definition 6.18 presentation.",
  },
  opalgebraRepresentableActionBridge: {
    name: "Relative opalgebras inside representable Street actions",
    registryPath: "relativeMonad.opalgebra.representableActionBridge",
    summary:
      "The representable Street bridge converts Definition 6.4 opalgebras into actions in X[j,B]_\iota^B; the oracle will request the representability witnesses and compare them against the opalgebra framing.",
  },
  actionsRightLeftCoherence: {
    name: "Skew-multicategory right/left action coherence",
    registryPath: "relativeMonad.actions.rightLeftCoherence",
    summary:
      "Definition 6.9 spells out the identity, unitor, associator, and right-action coherence 2-cells for Street-style actions; the oracle will demand each witness together with framing diagnostics to compare against the relative (op)algebra boundaries.",
  },
  actionsStreetActionData: {
    name: "Street action data in X[D, j]",
    registryPath: "relativeMonad.actions.streetActionData",
    summary:
      "The paragraph unpacking actions in X[D, j]_i decomposes a Street action into a tight cell over D and an action 2-cell in E(j, t); the analyzer must request both pieces together with the displayed string-diagram identities so the action boundaries align with the relative algebra framing.",
  },
  actionsStreetActionHomomorphism: {
    name: "Street action homomorphism coherence",
    registryPath: "relativeMonad.actions.streetActionHomomorphism",
    summary:
      "Street’s definition of an action homomorphism requires a comparison 2-cell whose red/green composites agree; the oracle will demand both pastings and report when the morphism fails to respect the action structure.",
  },
  actionsHomomorphismCategory: {
    name: "Skew-multicategory action homomorphisms and Act category",
    registryPath: "relativeMonad.actions.homomorphismCategory",
    summary:
      "Definition 6.11 equips the action morphisms with right/left compatibility squares and shows they form the category Act(A, X); the analyzer will check both composites and the categorical identities/associativity witnesses.",
  },
  actionsCanonicalSelfAction: {
    name: "Canonical skew-multicategory self-action",
    registryPath: "relativeMonad.actions.canonicalSelfAction",
    summary:
      "Proposition 6.12 constructs a canonical action of a skew multicategory on itself; the oracle will compare the Street witnesses against the coherence data captured by Definition 6.9.",
  },
  actionsLooseAdjunctionAction: {
    name: "Loose-adjunction-induced skew-multicategory action",
    registryPath: "relativeMonad.actions.looseAdjunctionAction",
    summary:
      "Proposition 6.13 derives a Street action from a loose adjunction; the analyzer will thread the unit/counit pastings through the coherence checks to certify the induced action.",
  },
  actionsLooseAdjunctionRightAction: {
    name: "Loose adjunction Street right action",
    registryPath: "relativeMonad.actions.looseAdjunctionRightAction",
    summary:
      "Proposition 6.20 builds a Street right action on X[D,j] from a loose adjunction; the oracle will request the unit/counit, representable restrictions, and induced composites that witness the promised action.",
  },
  actionsRepresentableRestriction: {
    name: "Representable tight-cell restriction action",
    registryPath: "relativeMonad.actions.representableRestriction",
    summary:
      "Definition 6.14 restricts the canonical action along representable tight cells; the oracle will request the equipment-level representability witnesses and verify that the induced action matches the restriction.",
  },
  actionsRepresentableStreetSubmulticategory: {
    name: "Representable Street action sub-multicategory",
    registryPath: "relativeMonad.actions.representableStreetSubmulticategory",
    summary:
      "Definition 6.21 packages X[j,B]_\iota and its representable sub-multicategory X[j,B]_\iota^B; the oracle will request the tight cell j, the Street action objects, and witnesses marking which loose cells are representable.",
  },
  actionsRepresentableStreetActionDiagrams: {
    name: "Representable Street action diagrams",
    registryPath: "relativeMonad.actions.representableStreetActionDiagrams",
    summary:
      "The Definition 6.21 unpacking equates the Street action composites (ρ, λ, μ) with the Definition 6.4 opalgebra diagrams; the analyzer will compare those string-diagram witnesses against the recorded opalgebra framing.",
  },
  actionsRepresentableStreetActionHomomorphism: {
    name: "Representable Street action homomorphisms",
    registryPath: "relativeMonad.actions.representableStreetActionHomomorphism",
    summary:
      "Definition 6.21's action homomorphism B(1,α) must equalise the red/green composites displayed in the paper; the oracle will demand both pastings inside X[j,B]_\iota^B and report mismatches.",
  },
  actionsRelativeAlgebraBridge: {
    name: "Relative algebra vs Street action bridge",
    registryPath: "relativeMonad.actions.relativeAlgebraBridge",
    summary:
      "After unpacking the Street action data the paper identifies Definition 6.1 T-algebras with actions in X[D, j]; the analyzer will convert algebra witnesses into Street action data and confirm the required diagrams commute.",
  },
  actionsAlgebraActionIsomorphism: {
    name: "Relative algebra/Street action equivalence",
    registryPath: "relativeMonad.actions.algebraActionIsomorphism",
    summary:
      "Theorem 6.15 upgrades the algebra-to-action bridge to an isomorphism of categories natural in D and T; the oracle will require functors, natural comparison data, and inverse composites to certify the equivalence.",
  },
  actionsRepresentableActionIsomorphism: {
    name: "Representable Street action/opalgebra equivalence",
    registryPath: "relativeMonad.actions.representableActionIsomorphism",
    summary:
      "Theorem 6.22 exhibits an isomorphism Act(X[j,B]_\iota^B, T) ≅ T-Opalg_B that is natural in both B and T; the analyzer will request the mutually inverse functors and the commuting comparison square from the theorem.",
  },
  actionsRepresentabilityUpgrade: {
    name: "Representable Street action upgrade",
    registryPath: "relativeMonad.actions.representabilityUpgrade",
    summary:
      "Remark 6.16 notes that when the equipment supplies the needed loose extensions the skew-multicategory actions become representable; the oracle will request the Street representability witnesses and the comparison back to the Section 6.2 coherence data.",
  },
  actionsRepresentabilityGeneralisation: {
    name: "Street representability generalisation",
    registryPath: "relativeMonad.actions.representabilityGeneralisation",
    summary:
      "Remark 6.23 suggests extending Theorem 4.29 to the Street action multicategories X[j,B]; the oracle will seek loose-extension witnesses establishing representability and compare them with the existing skew-multicategory diagnostics.",
  },
  kleisliUniversalProperty: {
    name: "Relative Kleisli universal opalgebra",
    registryPath: "relativeMonad.kleisli.universalOpalgebra",
    summary:
      "The Kleisli opalgebra for a j-relative monad should act via the root on the left and its carrier on the right, capturing the initial-opalgebra property described prior to Theorem 6.49.",
  },
  eilenbergMooreUniversalProperty: {
    name: "Relative Eilenberg–Moore universal algebra",
    registryPath: "relativeMonad.eilenbergMoore.universalAlgebra",
    summary:
      "Theorem 6.39 equips Alg(T) with a comparison functor, partial right adjoint, and graded extension factorisations; the oracle now records those witnesses alongside the familiar boundary reuse checks.",
  },
  strongerUniversalProperties: {
    name: "Relative universal (co)algebra comparison",
    registryPath: "relativeMonad.universal.strengthenedComparisons",
    summary:
      "The strengthened universal properties from Theorem 6.49 should compare morphisms of relative adjunctions against the Kleisli and Eilenberg–Moore constructions; this placeholder tracks the forthcoming oracle for those comparisons.",
  },
  actionsTwoDimensionalModules: {
    name: "Two-dimensional relative module comparison",
    registryPath: "relativeMonad.actions.twoDimensionalModules",
    summary:
      "Remark 6.8 forecasts a lift to opmulticategory modules; the oracle will request Altenkirch–Chapman–Uustalu style module witnesses and show how they collapse to the one-dimensional relative (op)algebra analyzers.",
  },
} satisfies Record<string, RelativeAdjunctionLawDescriptor>;

export type RelativeAlgebraLawKey = keyof typeof RelativeAlgebraLawRegistry;

export const listRelativeAlgebraLaws = (): ReadonlyArray<RelativeAdjunctionLawDescriptor> =>
  Object.values(RelativeAlgebraLawRegistry);
