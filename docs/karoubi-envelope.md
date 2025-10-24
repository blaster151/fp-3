# Karoubi envelopes and idempotent completions

The Karoubi-envelope utilities expose the “split every idempotent” completion
featured in the NEW_PLAN Milestone 25 checklist. The workflow is orchestrated
by three helpers:

- `findIdempotents` classifies every sampled endomorphism, recording the object
  it lives on, whether it squares to itself, and diagnostics for failures. The
  analyzer only inspects endomorphisms (via `homSet(object, object)`), so it can
  report non-idempotent evidence without polluting later constructions.
- `karoubiEnvelope` packages the completion as a finite category whose objects
  are pairs `(A, e)` with `e : A → A` idempotent. The constructor also returns
  the canonical inclusion and forgetful functors, plus splitting witnesses that
  certify the textbook identities `s ∘ r = e` and `r ∘ s = id_(A,e)` inside the
  envelope. These witnesses allow reflective-subcategory and localization
  tooling to import the completion without re-deriving the splitting proof.
- `analyzeKaroubiEquivalence` threads the inclusion through the equivalence
  analyzers from Milestones 18 and 24. When every idempotent already splits, the
  helper builds a quasi-inverse functor and unit/counit diagnostics; otherwise,
  it surfaces the failing essential-surjectivity samples so downstream planners
  know which new objects the completion introduces.

The exports live in `karoubi-envelope.ts` and are re-exported from `allTS.ts`.
Downstream code can therefore depend on the Karoubi completion exactly as it
would on skeleton normal forms: compute the envelope, examine the splitting
witnesses, and rely on the equivalence analyzer to decide whether the inclusion
is an honest equivalence or a strictly larger category.

Because the splitting witnesses reuse `FunctorWithWitness` metadata, the new
module composes with the preservation/reflection dashboards from Milestones 17
through 22. For example, reflective-subcategory detectors can now insist that an
idempotent splits before attempting to factor an adjunction through it, and
localization planners can call `findIdempotents` to decide whether a calculus of
fractions introduces genuinely new objects or just rebrands existing ones.
