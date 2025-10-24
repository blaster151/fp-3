# Discrete Kan Extension Specializations

The discrete Kan extension toolkit now ships convenience adapters that expose the
textbook constructions highlighted in Section 27 as ready-to-use witnesses.

## Inclusion-Based Extensions

`buildDiscreteLeftKanExtensionAlongInclusion` and
`buildDiscreteRightKanExtensionAlongInclusion` assemble the canonical extensions
for a functor defined on a discrete subcategory. The helpers enforce that the
declared inclusion actually lands in the ambient object list, then delegate to
the reusable discrete Kan builders. The resulting witnesses keep the boolean
diagnostics introduced earlier, so density-style arguments can cite the
generated reports when specializing Yoneda extensions along fully faithful
embeddings.

## Kan Extensions as Colimits and Limits

Special-purpose constructors `buildDiscreteLeftKanExtensionToTerminal` and
`buildDiscreteRightKanExtensionToTerminal` package the classical observation
that left Kan extensions along the unique functor to the terminal category yield
coproducts, while right Kan extensions recover products. The convenience
wrappers return both the extension witnesses and helpers
(`collectDiscreteLeftKanColimit`, `collectDiscreteRightKanLimit`) that translate
the resulting Lan/Ran carriers into concrete coproduct and product carriers.

## Diagnostics for Universal Property Failures

The induction utilities detect when a proposed mediating transformation fails to
satisfy the universal property. Tests now sabotage the universal arrow and check
that the induced comparison reports the precise failure object, so downstream
density proofs can rely on the diagnostics when navigating Yoneda-based Kan
extensions.

