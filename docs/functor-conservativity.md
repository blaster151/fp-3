# Functor Conservativity and Preservation Diagnostics

Milestone 21 introduces a suite of helpers that operationalise Section 27.2’s
results about functors that preserve or reflect structure.

## Automatic isomorphism preservation metadata

`constructFunctorWithWitness` now attaches a mandatory analysis based on
`makeIsomorphismPreservationOracle`. The oracle enumerates inverses inside the
source and target categories (when finite equality data is available) and
records why an image arrow would fail to remain an isomorphism. All new functor
constructors inherit this report automatically, so downstream code can rely on
isomorphism preservation without wiring bespoke diagnostics.

## Conservativity diagnostics

`isConservativeFunctor` inspects a functor’s arrow generators and searches for
image isomorphisms whose preimages lack inverses. The report lists every
counterexample together with the recovered target witness, making failures to
reflect isomorphisms explicit. The helper accepts optional custom iso checkers
when the ambient categories are infinite but still provide specialised inverse
finders.

## Collapse functor counterexamples

`collapseFunctorToPoint` packages the textbook collapse-to-a-point construction
as a reusable counterexample generator. The resulting functor compresses every
object and arrow to the terminal category, carries metadata explaining its
purpose, and integrates with the new conservativity diagnostics to exhibit
precise “why not” traces for failed reflection properties.

## Preservation implications from pullbacks and pushouts

`preservesPullbacksImpliesMonomorphisms` and
`preservesPushoutsImpliesEpimorphisms` take the structural hypotheses of
Theorem 134 as explicit evidence. They produce the corresponding functor
property analyses, threading advisory warnings when the caller omits the
necessary pullback or pushout witnesses. The helpers accept custom monomorphism
and epimorphism checkers, so they can be reused across categories with
specialised diagnostics.

## Full faithfulness implies essential injectivity

`essentialInjectiveFromFullyFaithful` packages Theorem 138’s implication: once a
functor’s fullness and faithfulness reports succeed, the helper searches for
isomorphic image objects and lifts their witnesses back through the source
category. Counterexamples are surfaced when the fullness witness cannot lift the
target isomorphism or when the lifted composites cease to be identities after
applying the functor (which would violate faithfulness). The new diagnostic is
threaded through `buildEquivalenceWitness`, so derived equivalences automatically
record whether the quasi-inverse choices are unique up to isomorphism. The
textbook functor gallery also exposes the derived analysis, making it easy to
contrast fully faithful inclusions with sabotaged forgetful and thinning
examples.

