# Textbook Functor Gallery

The module [`textbook-functor-gallery.ts`](../textbook-functor-gallery.ts) curates
the functors highlighted in Section 27’s examples and records their key
property diagnostics.

## Catalogue

The `textbookFunctorGallery` export enumerates:

- the forgetful functors `Mon → Set` and `Grp → Set`, together with
  faithfulness/fullness and essential (non-)injectivity analyses;
- the inclusion `Ab ↪ Grp`, confirming it is fully faithful but not essentially
  surjective (because `S₃` lies outside the abelian subcategory);
- a thinning functor that collapses pointed-set morphisms, its fully faithful
  inclusion back into the richer category, and a “total collapse” functor that
  sends every pointed set to a chosen singleton.

Each entry stores the evaluated reports from
`checkFaithfulFunctor`, `checkFullFunctor`,
`checkEssentialInjectivityOnObjects`, the derived
`essentialInjectiveFromFullyFaithful` oracle, and
`isEssentiallySurjective`. Downstream code can inspect these reports directly or
reuse the supplied functor witnesses to feed additional property oracles.

## Tests

`test/textbook.functor-gallery.spec.ts` exercises the gallery by asserting that
each functor’s recorded diagnostics match the textbook expectations (e.g.,
forgetful functors are faithful but not full, the thinning functor fails
faithfulness, and the total collapse functor is neither full nor essentially
surjective).

