/**
 * Lightweight catalogue of coherence laws that the virtual equipment layer will
 * eventually check.  Step 2 only needs the descriptors so the oracle registry
 * can reference them and documentation can link to stable identifiers.
 */
export interface EquipmentLawDescriptor {
  readonly name: string;
  readonly registryPath: string;
  readonly summary: string;
}

export const EquipmentLawRegistry = {
  bicategoryPentagon: {
    name: "Bicategory pentagon coherence",
    registryPath: "virtualEquipment.bicategory.pentagon",
    summary:
      "Associator 2-cells for any quadruple of composable 1-cells satisfy Mac Lane's pentagon coherence diagram.",
  },
  bicategoryTriangle: {
    name: "Bicategory triangle coherence",
    registryPath: "virtualEquipment.bicategory.triangle",
    summary:
      "The left and right unitors intertwine with the associator to satisfy the triangle identity for each composable pair.",
  },
  pseudofunctorCoherence: {
    name: "Pseudofunctor coherence",
    registryPath: "virtualEquipment.pseudofunctor.coherence",
    summary:
      "Composition and unit comparators of a pseudofunctor obey the standard associativity and unital coherence constraints.",
  },
  biadjunctionTriangle: {
    name: "Biadjunction triangle laws",
    registryPath: "virtualEquipment.biadjunction.triangle",
    summary:
      "Units and counits of a biadjunction satisfy the left and right triangle identities up to the specified adjoint equivalences.",
  },
  companionUnit: {
    name: "Companion unit coherence",
    registryPath: "virtualEquipment.companion.unit",
    summary:
      "The companion of a tight 1-cell should respect the left unit law when composed with the identity proarrow.",
  },
  companionCounit: {
    name: "Companion counit coherence",
    registryPath: "virtualEquipment.companion.counit",
    summary:
      "Companion constructions should interact with counits analogously to the classical adjunction triangle law.",
  },
  conjointUnit: {
    name: "Conjoint unit coherence",
    registryPath: "virtualEquipment.conjoint.unit",
    summary:
      "Conjoints act dually to companions, satisfying the right unit coherence diagram.",
  },
  conjointCounit: {
    name: "Conjoint counit coherence",
    registryPath: "virtualEquipment.conjoint.counit",
    summary:
      "Conjoint compositions exhibit the dual counit coherence law.",
  },
  looseMonadUnit: {
    name: "Loose monad unit triangle",
    registryPath: "virtualEquipment.looseMonad.unit",
    summary:
      "Loose monads must admit a unit 2-cell from the identity loose arrow whose vertical boundaries are tight identities.",
  },
  looseMonadMultiplication: {
    name: "Loose monad multiplication associativity",
    registryPath: "virtualEquipment.looseMonad.multiplication",
    summary:
      "Loose monad multiplication should be framed by composable loose arrows and respect the expected associativity diagram.",
  },
  skewSubstitution: {
    name: "Loose skew-multicategory substitution",
    registryPath: "virtualEquipment.skew.composition",
    summary:
      "Remark 4.5 and Theorem 4.7 require multi-source loose composites to accept substitutions whose framing matches each slot's loose arrow and retains identity vertical boundaries.",
  },
  mapFromRepresentableRight: {
    name: "Representable right loose adjoint yields a map",
    registryPath: "virtualEquipment.maps.representableRight",
    summary:
      "A loose adjunction whose right leg is representable should classify the left leg as a map, reflecting Remark 2.20 and Lemma 2.22.",
  },
  rightExtensionCounit: {
    name: "Right extension counit framing",
    registryPath: "virtualEquipment.extensions.rightExtension",
    summary:
  "Right extension counit should witness q ⇒ (q ⋄ f) ∘ f with identity vertical boundaries and compatible loose composites.",
  },
  rightLiftUnit: {
    name: "Right lift unit framing",
    registryPath: "virtualEquipment.extensions.rightLift",
    summary:
  "Right lift unit should witness f-composites landing in q while keeping vertical boundaries tight identities.",
  },
  rightExtensionLiftCompatibility: {
    name: "Right extension/right lift compatibility",
    registryPath: "virtualEquipment.extensions.compatibility",
    summary:
      "Lemma 3.4 shows that when both a right extension and right lift exist they share domains, codomains, and composite prefixes, yielding equivalent lifts.",
  },
  weightedConeFraming: {
    name: "Weighted cone framing",
    registryPath: "virtualEquipment.weighted.cone",
    summary:
      "Definition 3.9 requires p-weighted cones to reuse the supplied weight and diagram boundaries when targeting the apex loose arrow.",
  },
  weightedCoconeFraming: {
    name: "Weighted cocone framing",
    registryPath: "virtualEquipment.weighted.cocone",
    summary:
      "Dual to cones, p-weighted cocones must inherit boundaries from the weight and diagram while landing in the chosen apex.",
  },
  weightedColimitRestriction: {
    name: "Weighted colimit restriction compatibility",
    registryPath: "virtualEquipment.weighted.colimitRestriction",
    summary:
      "Lemma 3.13 shows that cartesian cells witnessing B(f,1)/B(1,g) restrictions reuse the boundaries of a weighted cocone.",
  },
  weightedLimitRestriction: {
    name: "Weighted limit restriction compatibility",
    registryPath: "virtualEquipment.weighted.limitRestriction",
    summary:
      "Dual to Lemma 3.13, restricting a weighted cone should preserve its boundary data via the induced cartesian 2-cell.",
  },
  leftExtensionFromColimit: {
    name: "Pointwise left extension from weighted colimit",
    registryPath: "virtualEquipment.weighted.leftExtension",
    summary:
      "Lemma 3.14 states that the counit of a left extension computed by a weighted colimit inherits the cocone framing.",
  },
  densityIdentity: {
    name: "Density via identity restrictions",
    registryPath: "virtualEquipment.density.identity",
    summary:
      "Definition 3.19 characterises dense tight 1-cells by the existence of B(f,1)/B(1,f) restrictions of the identity loose arrow accompanied by representability witnesses.",
  },
  fullyFaithfulRestrictions: {
    name: "Fully faithful via identity restrictions",
    registryPath: "virtualEquipment.faithfulness.restrictions",
    summary:
      "Definition 3.27 detects fully faithful tight 1-cells by checking that the identity loose arrow admits B(f,1) and B(1,f) restrictions with representability witnesses.",
  },
  pointwiseLeftExtensionLift: {
    name: "Pointwise left extension/left lift correspondence",
    registryPath: "virtualEquipment.faithfulness.pointwise",
    summary:
      "Proposition 3.26 identifies pointwise left extensions with left lifts; the associated unit and counit 2-cells must share their framing data.",
  },
  fullyFaithfulLeftExtension: {
    name: "Fully faithful left extension invertibility",
    registryPath: "virtualEquipment.faithfulness.leftExtension",
    summary:
      "Lemma 3.29 shows that a left extension along a fully faithful tight 1-cell has an invertible counit, yielding an isomorphism of 2-cells.",
  },
  absoluteColimitComparison: {
    name: "j-absolute colimit comparison",
    registryPath: "virtualEquipment.absolute.colimit",
    summary:
      "Definition 3.21 requires the comparison 2-cell for a j-absolute colimit to be left-opcartesian with boundaries reusing the weight and diagram data.",
  },
  absoluteLeftExtension: {
    name: "Left extension preserves j-absolute colimits",
    registryPath: "virtualEquipment.absolute.leftExtension",
    summary:
      "Lemmas 3.22 and 3.23 show that left extensions computed from a j-absolute cocone remain j-absolute when compared to the original data.",
  },
  pointwiseLeftLift: {
    name: "Pointwise left lift framing",
    registryPath: "virtualEquipment.absolute.pointwiseLeftLift",
    summary:
      "Definition 3.24 packages pointwise left lifts by checking that the underlying right lift framing aligns with the designated tight 1-cell j.",
  },
} satisfies Record<string, EquipmentLawDescriptor>;

export type EquipmentLawKey = keyof typeof EquipmentLawRegistry;

export const listEquipmentLaws = (): ReadonlyArray<EquipmentLawDescriptor> =>
  Object.values(EquipmentLawRegistry);
