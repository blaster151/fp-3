# Category Operations Layer

The operations layer complements the oracle registry by turning proved theorems
into actionable rewrites.  Whenever a law fires we can suggest concrete edits to
a categorical model (or to an in-memory composite) that follow from the
witnesses the oracle produced.  The layer is intentionally orthogonal to the
source code – rewrites are applied to *data* (finite categories, diagrams,
paths), not to TypeScript modules.

## Concepts

- **Rewrite** – a structured edit such as cancelling an inverse pair, replacing
  a composite with an identity, or merging isomorphic subobjects.
- **Suggestion** – a bundle of rewrites with a human readable explanation and a
  safety level (`safe` for auto-application, `hint` for user review).
- **Operation rule** – a small policy object that inspects a context (category,
  composite path, focussed arrow, …) and proposes suggestions when a theorem is
  applicable.
- **Rewriter** – a dispatcher that evaluates a set of rules against a context
  and collects the resulting suggestions.

## Workflow

1.  Collect structural witnesses via the oracle layer (e.g. `twoSidedInverses`,
    `rightInverses`, factorisation arrows in a pullback/pushout search).
2.  Feed the current categorical context into the `Rewriter`.
3.  Auto-apply all `safe` suggestions (normalisation) and present `hint`
    suggestions to the user for approval.
4.  Optionally serialise accepted rewrites into JSON patches if the category is
    stored outside of the TypeScript process.

## Seed Rules

The initial rules mirror the Chapter 8 theorems:

- **Iso cancellation** – detects adjacent inverse pairs inside a composite path
  and proposes a `NormalizeComposite` rewrite.
- **Monic + right inverse upgrade** – when an arrow is monic and comes with a
  right inverse, the rule suggests promoting it to an isomorphism and replacing
  both composites with identities (Theorem 22).
- **Epi–mono factorisation** – for any arrow that splits as an epimorphism
  followed by a monomorphism, the rule produces a `FactorThroughEpiMono`
  rewrite so callers can replace the original map with the two-stage
  factorisation (Definition 37).
- **Object iso merge** – if an actual two-sided inverse is present, treat the
  domain and codomain objects as isomorphic and queue a merge rewrite.
- **Mutual mono factorisation merge** – if two monomorphisms into the same
  object factor through each other, the rule proposes merging their domains as
  isomorphic subobjects (Theorem 23).

The architecture is deliberately extensible: future rules can introduce
pullbacks/pushouts, slice/arrow simplifications, or Beck–Chevalley rewrites by
following the same template.

## Balanced Categories

A category is **balanced** when every arrow that is both monic and epic is
automatically an isomorphism.  Operationally this acts like a global toggle:

- When `category.traits?.balanced === true`, any rule that detects both
  cancellability flags can confidently emit an `UpgradeToIso` rewrite without
  searching for explicit inverses.
- In non-balanced categories the same detection merely annotates the arrow – it
  may still fail to have an inverse (cf. the `TwoObj` and `Mon` counterexamples).

Balanced categories therefore turn certain oracle results into immediate
rewrites, dramatically reducing the amount of search required in familiar
categories such as `Set`, `Grp`, or `Vect`.

## Groups and Groupoids

Definition 8.7 highlights that a group can be viewed as a one-object
groupoid and, conversely, that any one-object groupoid packages enough
information to recover a group structure.  The implementation now supports
both directions:

- `catFromGroup` turns a finite group into a category with a single object
  whose arrows are exactly the group elements.
- `groupFromOneObjectGroupoid` inspects a finite category with one object
  whose arrows are all invertible and extracts the corresponding group
  operations (multiplication, unit, inverses) directly from composition.

These helpers make it easy to shuttle between algebraic data (groups) and
categorical data (groupoids), and they are exercised by the groupoid test
suite to ensure the round-trip succeeds for concrete examples.

## Isomorphic Objects

Definition 36 treats an isomorphism `f : C → D` as evidence that the objects `C`
and `D` are equivalent.  The operations layer records this via a dedicated
rewrite:

- **MergeObjects** – produced by the `MergeObjectsViaIso` rule, it pairs the
  forward and backward isomorphisms and instructs the caller to collapse the two
  objects into a single equivalence class.

Once such a rewrite fires it is natural to maintain a union–find (or similar)
data structure over objects so that subsequent queries work with canonical
representatives.  This keeps later rewrites simple: once objects are merged, any
further diagram manipulation can assume the identification has already been
performed.
