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
  skewMonoidBridge: {
    name: "Relative monad skew-monoid equivalence",
    registryPath: "relativeMonad.skewMonoid.bridge",
    summary:
      "Under Theorem 4.29’s hypotheses (left extensions along j, preservation, j-absolute and dense roots, invertible right unit), a j-relative monad determines a monoid in the left skew-monoidal category X[j]; this law tracks the aggregated witness stack.",
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
      "Theorem 5.24 sends a relative adjunction to its induced relative monad; the forthcoming analyzer will compare the supplied unit/extension data against the adjunction’s hom-isomorphism witnesses.",
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

export const RelativeAlgebraLawRegistry = {
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
      "The Eilenberg–Moore algebra should reuse the carrier t on the right and its own tight boundary on the left, reflecting the terminal-resolution description of Theorem 6.39.",
  },
  strongerUniversalProperties: {
    name: "Relative universal (co)algebra comparison",
    registryPath: "relativeMonad.universal.strengthenedComparisons",
    summary:
      "The strengthened universal properties from Theorem 6.49 should compare morphisms of relative adjunctions against the Kleisli and Eilenberg–Moore constructions; this placeholder tracks the forthcoming oracle for those comparisons.",
  },
} satisfies Record<string, RelativeAdjunctionLawDescriptor>;

export type RelativeAlgebraLawKey = keyof typeof RelativeAlgebraLawRegistry;

export const listRelativeAlgebraLaws = (): ReadonlyArray<RelativeAdjunctionLawDescriptor> =>
  Object.values(RelativeAlgebraLawRegistry);
